import { prisma } from '../config/database';
import { AppError } from '../utils/errors';
import {
  Partner,
  PartnerType,
  PartnerTier,
  PartnerStatus,
  CommissionStatus,
  PayoutStatus,
  Prisma,
} from '@prisma/client';

// Commission rates by tier
const TIER_COMMISSION_RATES: Record<PartnerTier, number> = {
  BRONZE: 15,
  SILVER: 20,
  GOLD: 25,
  PLATINUM: 30,
};

// Customer limits by tier
const TIER_CUSTOMER_LIMITS: Record<PartnerTier, number> = {
  BRONZE: 10,
  SILVER: 50,
  GOLD: 200,
  PLATINUM: -1, // Unlimited
};

interface CreatePartnerDto {
  organizationId: string;
  partnerType?: PartnerType;
  companyName: string;
  companyWebsite?: string;
  website?: string;
  contactPerson?: string;
  contactEmail: string;
  contactPhone?: string;
  description?: string;
  businessType?: string;
  targetIndustry?: string;
  expectedCustomers?: number;
}

interface UpdatePartnerDto {
  companyName?: string;
  companyWebsite?: string;
  website?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  description?: string;
  businessType?: string;
  targetIndustry?: string;
}

class PartnerService {
  // Apply to become a partner
  async applyForPartnership(data: CreatePartnerDto): Promise<Partner> {
    // Check if organization already has a partner record
    const existingPartner = await prisma.partner.findUnique({
      where: { organizationId: data.organizationId },
    });

    if (existingPartner) {
      throw new AppError('Organization already has a partner application', 400);
    }

    const partner = await prisma.partner.create({
      data: {
        organizationId: data.organizationId,
        partnerType: data.partnerType || 'RESELLER',
        companyName: data.companyName,
        companyWebsite: data.companyWebsite,
        contactPerson: data.contactPerson || data.companyName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        businessType: data.businessType,
        targetIndustry: data.targetIndustry,
        expectedCustomers: data.expectedCustomers,
        tier: 'BRONZE',
        commissionRate: TIER_COMMISSION_RATES.BRONZE,
        maxCustomers: TIER_CUSTOMER_LIMITS.BRONZE,
        status: 'PENDING',
      },
    });

    // Log activity
    await this.logActivity(partner.id, 'PARTNER_APPLICATION', 'Partner application submitted');

    return partner;
  }

  // Get partner by organization ID
  async getPartnerByOrgId(organizationId: string): Promise<Partner | null> {
    return prisma.partner.findUnique({
      where: { organizationId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            email: true,
            logo: true,
          },
        },
        customers: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                email: true,
                activePlanId: true,
                subscriptionStatus: true,
              },
            },
          },
        },
        _count: {
          select: {
            customers: true,
            commissions: true,
            payouts: true,
          },
        },
      },
    });
  }

  // Get partner by ID
  async getPartnerById(id: string): Promise<Partner | null> {
    return prisma.partner.findUnique({
      where: { id },
      include: {
        organization: true,
        customers: {
          include: {
            organization: true,
          },
        },
      },
    });
  }

  // List all partners (for super admin)
  async listPartners(params: {
    status?: PartnerStatus;
    tier?: PartnerTier;
    type?: PartnerType;
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const { status, tier, type, page = 1, limit = 10, search } = params;

    const where: Prisma.PartnerWhereInput = {};

    if (status) where.status = status;
    if (tier) where.tier = tier;
    if (type) where.partnerType = type;
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { contactEmail: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [partners, total] = await Promise.all([
      prisma.partner.findMany({
        where,
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              customers: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.partner.count({ where }),
    ]);

    return {
      partners,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Approve partner application (super admin)
  async approvePartner(partnerId: string, approvedBy: string): Promise<Partner> {
    const partner = await prisma.partner.findUnique({ where: { id: partnerId } });

    if (!partner) {
      throw new AppError('Partner not found', 404);
    }

    if (partner.status !== 'PENDING') {
      throw new AppError('Partner application is not pending', 400);
    }

    const updated = await prisma.partner.update({
      where: { id: partnerId },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedBy,
      },
    });

    await this.logActivity(partnerId, 'PARTNER_APPROVED', 'Partner application approved');

    return updated;
  }

  // Reject partner application (super admin)
  async rejectPartner(partnerId: string, reason: string): Promise<Partner> {
    const partner = await prisma.partner.findUnique({ where: { id: partnerId } });

    if (!partner) {
      throw new AppError('Partner not found', 404);
    }

    const updated = await prisma.partner.update({
      where: { id: partnerId },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
      },
    });

    await this.logActivity(partnerId, 'PARTNER_REJECTED', `Partner application rejected: ${reason}`);

    return updated;
  }

  // Update partner tier (super admin)
  async updatePartnerTier(partnerId: string, tier: PartnerTier): Promise<Partner> {
    const updated = await prisma.partner.update({
      where: { id: partnerId },
      data: {
        tier,
        commissionRate: TIER_COMMISSION_RATES[tier],
        maxCustomers: TIER_CUSTOMER_LIMITS[tier],
      },
    });

    await this.logActivity(partnerId, 'TIER_CHANGED', `Partner tier changed to ${tier}`);

    return updated;
  }

  // Update partner details
  async updatePartner(partnerId: string, data: UpdatePartnerDto): Promise<Partner> {
    return prisma.partner.update({
      where: { id: partnerId },
      data,
    });
  }

  // Add customer to partner
  async addCustomer(
    partnerId: string,
    customerOrgId: string,
    planId?: string
  ): Promise<any> {
    const partner = await prisma.partner.findUnique({ where: { id: partnerId } });

    if (!partner) {
      throw new AppError('Partner not found', 404);
    }

    if (partner.status !== 'APPROVED') {
      throw new AppError('Partner is not approved', 400);
    }

    // Check customer limit
    if (partner.maxCustomers !== -1 && partner.totalCustomers >= partner.maxCustomers) {
      throw new AppError('Customer limit reached for this partner tier', 400);
    }

    // Check if organization is already a customer of another partner
    const existingCustomer = await prisma.partnerCustomer.findUnique({
      where: { organizationId: customerOrgId },
    });

    if (existingCustomer) {
      throw new AppError('Organization is already a customer of another partner', 400);
    }

    const customer = await prisma.partnerCustomer.create({
      data: {
        partnerId,
        organizationId: customerOrgId,
        planId,
        status: 'ACTIVE',
      },
    });

    // Update partner stats
    await prisma.partner.update({
      where: { id: partnerId },
      data: {
        totalCustomers: { increment: 1 },
        activeCustomers: { increment: 1 },
      },
    });

    await this.logActivity(partnerId, 'CUSTOMER_ADDED', `New customer added: ${customerOrgId}`);

    return customer;
  }

  // Remove customer from partner
  async removeCustomer(partnerId: string, customerOrgId: string): Promise<void> {
    const customer = await prisma.partnerCustomer.findFirst({
      where: {
        partnerId,
        organizationId: customerOrgId,
      },
    });

    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    await prisma.partnerCustomer.update({
      where: { id: customer.id },
      data: {
        status: 'CHURNED',
        churnedAt: new Date(),
      },
    });

    await prisma.partner.update({
      where: { id: partnerId },
      data: {
        activeCustomers: { decrement: 1 },
      },
    });

    await this.logActivity(partnerId, 'CUSTOMER_REMOVED', `Customer removed: ${customerOrgId}`);
  }

  // Get partner customers
  async getPartnerCustomers(partnerId: string, params: {
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, page = 1, limit = 10 } = params;

    const where: Prisma.PartnerCustomerWhereInput = { partnerId };
    if (status) where.status = status;

    const [customers, total] = await Promise.all([
      prisma.partnerCustomer.findMany({
        where,
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              activePlanId: true,
              subscriptionStatus: true,
              createdAt: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { onboardedAt: 'desc' },
      }),
      prisma.partnerCustomer.count({ where }),
    ]);

    return {
      customers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Record commission for a transaction
  async recordCommission(params: {
    partnerId: string;
    customerId?: string;
    subscriptionId?: string;
    invoiceId?: string;
    transactionType: string;
    grossAmount: number;
    description?: string;
  }): Promise<any> {
    const partner = await prisma.partner.findUnique({ where: { id: params.partnerId } });

    if (!partner) {
      throw new AppError('Partner not found', 404);
    }

    const commissionRate = partner.commissionRate;
    const commissionAmount = (params.grossAmount * commissionRate) / 100;

    const commission = await prisma.partnerCommission.create({
      data: {
        partnerId: params.partnerId,
        customerId: params.customerId,
        subscriptionId: params.subscriptionId,
        invoiceId: params.invoiceId,
        transactionType: params.transactionType,
        description: params.description,
        grossAmount: params.grossAmount,
        commissionRate,
        commissionAmount,
        status: 'PENDING',
      },
    });

    // Update partner pending payout
    await prisma.partner.update({
      where: { id: params.partnerId },
      data: {
        pendingPayout: { increment: commissionAmount },
        totalRevenue: { increment: params.grossAmount },
      },
    });

    await this.logActivity(
      params.partnerId,
      'COMMISSION_EARNED',
      `Commission earned: ₹${commissionAmount.toFixed(2)}`,
      { commissionId: commission.id }
    );

    return commission;
  }

  // Get partner commissions
  async getPartnerCommissions(partnerId: string, params: {
    status?: CommissionStatus;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const { status, startDate, endDate, page = 1, limit = 20 } = params;

    const where: Prisma.PartnerCommissionWhereInput = { partnerId };
    if (status) where.status = status;
    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) where.transactionDate.gte = startDate;
      if (endDate) where.transactionDate.lte = endDate;
    }

    const [commissions, total, stats] = await Promise.all([
      prisma.partnerCommission.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { transactionDate: 'desc' },
      }),
      prisma.partnerCommission.count({ where }),
      prisma.partnerCommission.aggregate({
        where,
        _sum: {
          commissionAmount: true,
          grossAmount: true,
        },
      }),
    ]);

    return {
      commissions,
      stats: {
        totalCommission: stats._sum.commissionAmount || 0,
        totalGross: stats._sum.grossAmount || 0,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Create payout request
  async createPayout(partnerId: string): Promise<any> {
    const partner = await prisma.partner.findUnique({ where: { id: partnerId } });

    if (!partner) {
      throw new AppError('Partner not found', 404);
    }

    if (partner.pendingPayout < partner.minPayout) {
      throw new AppError(
        `Minimum payout amount is ₹${partner.minPayout}. Current pending: ₹${partner.pendingPayout}`,
        400
      );
    }

    // Get pending commissions
    const pendingCommissions = await prisma.partnerCommission.findMany({
      where: {
        partnerId,
        status: 'PENDING',
      },
    });

    if (pendingCommissions.length === 0) {
      throw new AppError('No pending commissions to payout', 400);
    }

    const totalAmount = pendingCommissions.reduce(
      (sum, c) => sum + c.commissionAmount,
      0
    );

    // Generate payout number
    const payoutCount = await prisma.partnerPayout.count({ where: { partnerId } });
    const payoutNumber = `PO-${partner.id.slice(0, 8).toUpperCase()}-${(payoutCount + 1)
      .toString()
      .padStart(4, '0')}`;

    // Create payout
    const payout = await prisma.partnerPayout.create({
      data: {
        partnerId,
        payoutNumber,
        amount: totalAmount,
        periodStart: pendingCommissions[pendingCommissions.length - 1].transactionDate,
        periodEnd: pendingCommissions[0].transactionDate,
        status: 'PENDING',
      },
    });

    // Update commissions to link to payout
    await prisma.partnerCommission.updateMany({
      where: {
        id: { in: pendingCommissions.map((c) => c.id) },
      },
      data: {
        status: 'PROCESSING',
        payoutId: payout.id,
      },
    });

    // Update partner pending payout
    await prisma.partner.update({
      where: { id: partnerId },
      data: {
        pendingPayout: 0,
      },
    });

    await this.logActivity(
      partnerId,
      'PAYOUT_REQUESTED',
      `Payout requested: ₹${totalAmount.toFixed(2)}`,
      { payoutId: payout.id }
    );

    return payout;
  }

  // Process payout (super admin)
  async processPayout(
    payoutId: string,
    params: {
      transactionId: string;
      paymentMethod: string;
      processedBy: string;
    }
  ): Promise<any> {
    const payout = await prisma.partnerPayout.findUnique({
      where: { id: payoutId },
      include: { commissions: true },
    });

    if (!payout) {
      throw new AppError('Payout not found', 404);
    }

    if (payout.status !== 'PENDING') {
      throw new AppError('Payout is not pending', 400);
    }

    // Update payout
    const updated = await prisma.partnerPayout.update({
      where: { id: payoutId },
      data: {
        status: 'COMPLETED',
        paymentMethod: params.paymentMethod,
        transactionId: params.transactionId,
        processedAt: new Date(),
        processedBy: params.processedBy,
      },
    });

    // Update commissions
    await prisma.partnerCommission.updateMany({
      where: { payoutId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
      },
    });

    // Update partner total commission
    await prisma.partner.update({
      where: { id: payout.partnerId },
      data: {
        totalCommission: { increment: payout.amount },
      },
    });

    await this.logActivity(
      payout.partnerId,
      'PAYOUT_COMPLETED',
      `Payout completed: ₹${payout.amount.toFixed(2)}`,
      { payoutId: payout.id }
    );

    return updated;
  }

  // Get partner payouts
  async getPartnerPayouts(partnerId: string, params: {
    status?: PayoutStatus;
    page?: number;
    limit?: number;
  }) {
    const { status, page = 1, limit = 10 } = params;

    const where: Prisma.PartnerPayoutWhereInput = { partnerId };
    if (status) where.status = status;

    const [payouts, total] = await Promise.all([
      prisma.partnerPayout.findMany({
        where,
        include: {
          _count: {
            select: { commissions: true },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.partnerPayout.count({ where }),
    ]);

    return {
      payouts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Get partner dashboard stats
  async getPartnerDashboard(partnerId: string) {
    const partner = await prisma.partner.findUnique({
      where: { id: partnerId },
      include: {
        _count: {
          select: {
            customers: true,
            commissions: true,
            payouts: true,
          },
        },
      },
    });

    if (!partner) {
      throw new AppError('Partner not found', 404);
    }

    // Get monthly stats
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [monthlyCommissions, monthlyCustomers, recentActivity] = await Promise.all([
      prisma.partnerCommission.aggregate({
        where: {
          partnerId,
          transactionDate: { gte: startOfMonth },
        },
        _sum: {
          commissionAmount: true,
          grossAmount: true,
        },
        _count: true,
      }),
      prisma.partnerCustomer.count({
        where: {
          partnerId,
          onboardedAt: { gte: startOfMonth },
        },
      }),
      prisma.partnerActivityLog.findMany({
        where: { partnerId },
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      partner: {
        id: partner.id,
        companyName: partner.companyName,
        tier: partner.tier,
        status: partner.status,
        commissionRate: partner.commissionRate,
      },
      stats: {
        totalCustomers: partner.totalCustomers,
        activeCustomers: partner.activeCustomers,
        totalRevenue: partner.totalRevenue,
        totalCommission: partner.totalCommission,
        pendingPayout: partner.pendingPayout,
      },
      monthly: {
        commissions: monthlyCommissions._sum.commissionAmount || 0,
        revenue: monthlyCommissions._sum.grossAmount || 0,
        transactions: monthlyCommissions._count,
        newCustomers: monthlyCustomers,
      },
      limits: {
        maxCustomers: partner.maxCustomers,
        usedCustomers: partner.totalCustomers,
        maxAgentsPerCustomer: partner.maxAgentsPerCustomer,
      },
      recentActivity,
    };
  }

  // Update bank details
  async updateBankDetails(partnerId: string, data: {
    accountHolderName: string;
    accountNumber: string;
    bankName: string;
    branchName?: string;
    ifscCode: string;
    accountType?: string;
    upiId?: string;
  }) {
    const existing = await prisma.partnerBankDetails.findUnique({
      where: { partnerId },
    });

    if (existing) {
      return prisma.partnerBankDetails.update({
        where: { partnerId },
        data: {
          ...data,
          isVerified: false, // Reset verification on update
        },
      });
    }

    return prisma.partnerBankDetails.create({
      data: {
        partnerId,
        ...data,
      },
    });
  }

  // Get bank details
  async getBankDetails(partnerId: string) {
    return prisma.partnerBankDetails.findUnique({
      where: { partnerId },
    });
  }

  // Log partner activity
  private async logActivity(
    partnerId: string,
    activityType: string,
    description: string,
    metadata?: any
  ) {
    return prisma.partnerActivityLog.create({
      data: {
        partnerId,
        activityType,
        description,
        metadata,
      },
    });
  }
}

export const partnerService = new PartnerService();
