import { prisma } from '../config/database';
import { Prisma, AdmissionType } from '@prisma/client';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { admissionNotificationService } from './admission-notification.service';

interface CreateAdmissionInput {
  organizationId: string;
  leadId: string;
  universityId: string;
  courseName?: string;
  branch?: string;
  academicYear: string;
  admissionType: AdmissionType;
  totalFee: number;
  donationAmount?: number;
  commissionPercent: number;
  closedById: string;
}

interface RecordPaymentInput {
  amount: number;
  paymentType: string;
  paymentMode?: string;
  referenceNumber?: string;
  receivedById?: string;
  notes?: string;
  receiptUrl?: string;
}

interface AdmissionFilters {
  universityId?: string;
  admissionType?: AdmissionType;
  paymentStatus?: string;
  commissionStatus?: string;
  academicYear?: string;
  closedById?: string;
  fromDate?: Date;
  toDate?: Date;
  search?: string;
  page?: number;
  limit?: number;
}

export class AdmissionService {
  /**
   * Generate unique admission number
   */
  private async generateAdmissionNumber(organizationId: string, academicYear: string): Promise<string> {
    const count = await prisma.admission.count({
      where: { organizationId, academicYear },
    });

    const yearPart = academicYear.replace('-', '').substring(0, 4);
    const sequenceNumber = (count + 1).toString().padStart(5, '0');
    return `ADM-${yearPart}-${sequenceNumber}`;
  }

  /**
   * Close/Create an admission
   */
  async create(input: CreateAdmissionInput) {
    // Verify lead exists
    const lead = await prisma.lead.findFirst({
      where: { id: input.leadId, organizationId: input.organizationId },
    });

    if (!lead) {
      throw new NotFoundError('Lead not found');
    }

    // Verify university exists
    const university = await prisma.university.findFirst({
      where: { id: input.universityId, organizationId: input.organizationId, isActive: true },
    });

    if (!university) {
      throw new NotFoundError('University not found or inactive');
    }

    // Check if admission already exists for this lead
    const existingAdmission = await prisma.admission.findFirst({
      where: {
        leadId: input.leadId,
        academicYear: input.academicYear,
        status: 'ACTIVE',
      },
    });

    if (existingAdmission) {
      throw new BadRequestError('An active admission already exists for this lead in this academic year');
    }

    // Generate admission number
    const admissionNumber = await this.generateAdmissionNumber(input.organizationId, input.academicYear);

    // Calculate commission
    const commissionAmount = (input.totalFee * input.commissionPercent) / 100;
    const pendingAmount = input.totalFee + (input.donationAmount || 0);

    const admission = await prisma.admission.create({
      data: {
        organizationId: input.organizationId,
        admissionNumber,
        leadId: input.leadId,
        universityId: input.universityId,
        courseName: input.courseName,
        branch: input.branch,
        academicYear: input.academicYear,
        admissionType: input.admissionType,
        totalFee: input.totalFee,
        donationAmount: input.donationAmount || 0,
        pendingAmount,
        commissionPercent: input.commissionPercent,
        commissionAmount,
        closedById: input.closedById,
      },
      include: {
        lead: {
          select: { firstName: true, lastName: true, phone: true, email: true },
        },
        university: {
          select: { name: true, shortName: true },
        },
        closedBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    // Update lead status and admission info
    await prisma.lead.update({
      where: { id: input.leadId },
      data: {
        admissionStatus: 'ADMITTED',
        admissionType: input.admissionType,
        actualFee: input.totalFee,
        commissionPercentage: input.commissionPercent,
        commissionAmount,
        donationAmount: input.donationAmount || 0,
        admissionClosedAt: new Date(),
        admissionClosedById: input.closedById,
        academicYear: input.academicYear,
        isConverted: true,
        convertedAt: new Date(),
      },
    });

    // Update university stats
    await prisma.university.update({
      where: { id: input.universityId },
      data: {
        totalAdmissions: { increment: 1 },
        totalRevenue: { increment: input.totalFee },
      },
    });

    // Send notifications for new admission
    try {
      await admissionNotificationService.notifyAdmissionCreated(
        admission as any,
        input.organizationId
      );
    } catch (error) {
      console.error('[AdmissionService] Failed to send admission created notification:', error);
      // Don't throw - notification failure shouldn't fail the admission
    }

    return admission;
  }

  /**
   * Find all admissions with filters
   */
  async findAll(organizationId: string, filters: AdmissionFilters = {}) {
    const {
      universityId,
      admissionType,
      paymentStatus,
      commissionStatus,
      academicYear,
      closedById,
      fromDate,
      toDate,
      search,
      page = 1,
      limit = 50,
    } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.AdmissionWhereInput = { organizationId };

    if (universityId) where.universityId = universityId;
    if (admissionType) where.admissionType = admissionType;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (commissionStatus) where.commissionStatus = commissionStatus;
    if (academicYear) where.academicYear = academicYear;
    if (closedById) where.closedById = closedById;

    if (fromDate || toDate) {
      where.closedAt = {};
      if (fromDate) where.closedAt.gte = fromDate;
      if (toDate) where.closedAt.lte = toDate;
    }

    if (search) {
      where.OR = [
        { admissionNumber: { contains: search, mode: 'insensitive' } },
        { lead: { firstName: { contains: search, mode: 'insensitive' } } },
        { lead: { lastName: { contains: search, mode: 'insensitive' } } },
        { lead: { phone: { contains: search } } },
      ];
    }

    const [admissions, total] = await Promise.all([
      prisma.admission.findMany({
        where,
        include: {
          lead: {
            select: { firstName: true, lastName: true, phone: true, email: true },
          },
          university: {
            select: { name: true, shortName: true },
          },
          closedBy: {
            select: { firstName: true, lastName: true },
          },
          _count: {
            select: { payments: true },
          },
        },
        orderBy: { closedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.admission.count({ where }),
    ]);

    return {
      admissions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find an admission by ID
   */
  async findById(id: string, organizationId: string) {
    const admission = await prisma.admission.findFirst({
      where: { id, organizationId },
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            fatherName: true,
            fatherMobile: true,
            address: true,
            city: true,
            state: true,
          },
        },
        university: {
          select: {
            id: true,
            name: true,
            shortName: true,
            city: true,
            contactPerson: true,
            contactPhone: true,
          },
        },
        closedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          include: {
            receivedBy: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!admission) {
      throw new NotFoundError('Admission not found');
    }

    return admission;
  }

  /**
   * Update an admission
   */
  async update(id: string, organizationId: string, data: Partial<CreateAdmissionInput>) {
    const existing = await prisma.admission.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundError('Admission not found');
    }

    // Recalculate commission if fee or percent changes
    let updateData: any = { ...data };
    if (data.totalFee !== undefined || data.commissionPercent !== undefined) {
      const totalFee = data.totalFee ?? Number(existing.totalFee);
      const commissionPercent = data.commissionPercent ?? Number(existing.commissionPercent);
      updateData.commissionAmount = (totalFee * commissionPercent) / 100;
    }

    const admission = await prisma.admission.update({
      where: { id },
      data: updateData,
      include: {
        lead: {
          select: { firstName: true, lastName: true, phone: true },
        },
        university: {
          select: { name: true, shortName: true },
        },
      },
    });

    return admission;
  }

  /**
   * Record a payment for an admission
   */
  async recordPayment(admissionId: string, organizationId: string, input: RecordPaymentInput) {
    const admission = await prisma.admission.findFirst({
      where: { id: admissionId, organizationId },
    });

    if (!admission) {
      throw new NotFoundError('Admission not found');
    }

    // Get the next payment number
    const lastPayment = await prisma.admissionPayment.findFirst({
      where: { admissionId },
      orderBy: { paymentNumber: 'desc' },
    });
    const paymentNumber = (lastPayment?.paymentNumber || 0) + 1;

    const payment = await prisma.admissionPayment.create({
      data: {
        admissionId,
        paymentNumber,
        amount: input.amount,
        paymentType: input.paymentType,
        paymentMode: input.paymentMode,
        referenceNumber: input.referenceNumber,
        paidAt: new Date(),
        receivedById: input.receivedById,
        notes: input.notes,
        receiptUrl: input.receiptUrl,
      },
    });

    // Update admission payment totals
    const newPaidAmount = Number(admission.paidAmount) + input.amount;
    const totalDue = Number(admission.totalFee) + Number(admission.donationAmount);
    const newPendingAmount = totalDue - newPaidAmount;
    const newPaymentStatus =
      newPendingAmount <= 0 ? 'PAID' : newPaidAmount > 0 ? 'PARTIAL' : 'PENDING';

    await prisma.admission.update({
      where: { id: admissionId },
      data: {
        paidAmount: newPaidAmount,
        pendingAmount: Math.max(0, newPendingAmount),
        paymentStatus: newPaymentStatus,
      },
    });

    // Update lead status if fully paid
    if (newPaymentStatus === 'PAID') {
      await prisma.lead.update({
        where: { id: admission.leadId },
        data: { admissionStatus: 'ENROLLED' },
      });
    }

    // Send payment notifications
    try {
      // Fetch full admission details for notifications
      const fullAdmission = await prisma.admission.findUnique({
        where: { id: admissionId },
        include: {
          lead: {
            select: { firstName: true, lastName: true, phone: true, email: true },
          },
          university: {
            select: { name: true, shortName: true },
          },
          closedBy: {
            select: { firstName: true, lastName: true },
          },
        },
      });

      if (fullAdmission) {
        if (newPaymentStatus === 'PAID') {
          await admissionNotificationService.notifyPaymentComplete(
            fullAdmission as any,
            organizationId
          );
        } else {
          await admissionNotificationService.notifyPaymentReceived(
            fullAdmission as any,
            payment as any,
            organizationId
          );
        }
      }
    } catch (error) {
      console.error('[AdmissionService] Failed to send payment notification:', error);
      // Don't throw - notification failure shouldn't fail the payment recording
    }

    return payment;
  }

  /**
   * Mark commission as received
   */
  async markCommissionReceived(id: string, organizationId: string) {
    const admission = await prisma.admission.findFirst({
      where: { id, organizationId },
      include: {
        lead: {
          select: { firstName: true, lastName: true, phone: true, email: true },
        },
        university: {
          select: { name: true, shortName: true },
        },
        closedBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    if (!admission) {
      throw new NotFoundError('Admission not found');
    }

    if (admission.commissionStatus === 'RECEIVED') {
      throw new BadRequestError('Commission already marked as received');
    }

    const updatedAdmission = await prisma.admission.update({
      where: { id },
      data: {
        commissionStatus: 'RECEIVED',
        commissionReceivedAt: new Date(),
      },
      include: {
        lead: {
          select: { firstName: true, lastName: true, phone: true, email: true },
        },
        university: {
          select: { name: true, shortName: true },
        },
        closedBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    // Send commission received notification
    try {
      await admissionNotificationService.notifyCommissionReceived(
        updatedAdmission as any,
        organizationId
      );
    } catch (error) {
      console.error('[AdmissionService] Failed to send commission notification:', error);
      // Don't throw - notification failure shouldn't fail the operation
    }

    return updatedAdmission;
  }

  /**
   * Cancel an admission
   */
  async cancel(id: string, organizationId: string, reason?: string) {
    const admission = await prisma.admission.findFirst({
      where: { id, organizationId },
      include: {
        lead: {
          select: { firstName: true, lastName: true, phone: true, email: true },
        },
        university: {
          select: { name: true, shortName: true },
        },
        closedBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    if (!admission) {
      throw new NotFoundError('Admission not found');
    }

    if (admission.status === 'CANCELLED') {
      throw new BadRequestError('Admission is already cancelled');
    }

    // Revert university stats
    await prisma.university.update({
      where: { id: admission.universityId },
      data: {
        totalAdmissions: { decrement: 1 },
        totalRevenue: { decrement: Number(admission.totalFee) },
      },
    });

    // Update lead status
    await prisma.lead.update({
      where: { id: admission.leadId },
      data: {
        admissionStatus: 'DROPPED',
        isConverted: false,
      },
    });

    const cancelledAdmission = await prisma.admission.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: {
        lead: {
          select: { firstName: true, lastName: true, phone: true, email: true },
        },
        university: {
          select: { name: true, shortName: true },
        },
        closedBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    // Send cancellation notification
    try {
      await admissionNotificationService.notifyAdmissionCancelled(
        cancelledAdmission as any,
        reason,
        organizationId
      );
    } catch (error) {
      console.error('[AdmissionService] Failed to send cancellation notification:', error);
      // Don't throw - notification failure shouldn't fail the operation
    }

    return cancelledAdmission;
  }

  /**
   * Get admission statistics
   */
  async getStats(organizationId: string, dateRange?: { from: Date; to: Date }) {
    const dateFilter = dateRange
      ? { gte: dateRange.from, lte: dateRange.to }
      : undefined;

    const where: Prisma.AdmissionWhereInput = {
      organizationId,
      status: 'ACTIVE',
      ...(dateFilter && { closedAt: dateFilter }),
    };

    const [
      totalAdmissions,
      byType,
      byPaymentStatus,
      byCommissionStatus,
      financials,
    ] = await Promise.all([
      prisma.admission.count({ where }),
      prisma.admission.groupBy({
        by: ['admissionType'],
        where,
        _count: true,
        _sum: { totalFee: true, commissionAmount: true },
      }),
      prisma.admission.groupBy({
        by: ['paymentStatus'],
        where,
        _count: true,
      }),
      prisma.admission.groupBy({
        by: ['commissionStatus'],
        where,
        _count: true,
        _sum: { commissionAmount: true },
      }),
      prisma.admission.aggregate({
        where,
        _sum: {
          totalFee: true,
          donationAmount: true,
          paidAmount: true,
          pendingAmount: true,
          commissionAmount: true,
        },
      }),
    ]);

    return {
      totalAdmissions,
      byType: byType.map((t) => ({
        type: t.admissionType,
        count: t._count,
        totalFee: Number(t._sum.totalFee) || 0,
        totalCommission: Number(t._sum.commissionAmount) || 0,
      })),
      byPaymentStatus: byPaymentStatus.map((p) => ({
        status: p.paymentStatus,
        count: p._count,
      })),
      byCommissionStatus: byCommissionStatus.map((c) => ({
        status: c.commissionStatus,
        count: c._count,
        amount: Number(c._sum.commissionAmount) || 0,
      })),
      financials: {
        totalFee: Number(financials._sum.totalFee) || 0,
        totalDonation: Number(financials._sum.donationAmount) || 0,
        totalPaid: Number(financials._sum.paidAmount) || 0,
        totalPending: Number(financials._sum.pendingAmount) || 0,
        totalCommission: Number(financials._sum.commissionAmount) || 0,
      },
    };
  }

  /**
   * Get academic years with admissions
   */
  async getAcademicYears(organizationId: string) {
    const years = await prisma.admission.findMany({
      where: { organizationId },
      select: { academicYear: true },
      distinct: ['academicYear'],
      orderBy: { academicYear: 'desc' },
    });

    return years.map((y) => y.academicYear);
  }
}

export const admissionService = new AdmissionService();
