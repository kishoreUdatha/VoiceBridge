import { prisma } from '../../config/database';
import { DealStage, Prisma } from '@prisma/client';
import { BadRequestError, NotFoundError } from '../../utils/errors';

interface CreateDealData {
  collegeId: string;
  organizationId: string;
  ownerId: string;
  dealName?: string;
  description?: string;
  products?: string[];
  dealValue?: number;
  stage?: DealStage;
  expectedCloseDate?: Date;
}

interface UpdateDealData {
  description?: string;
  products?: string[];
  dealValue?: number;
  expectedCloseDate?: Date;
  wonLostReason?: string;
  competitorWon?: string;
}

interface DealFilter {
  organizationId: string;
  ownerId?: string;
  stage?: DealStage;
  minValue?: number;
  maxValue?: number;
}

// Stage probability mapping
const stageProbability: Record<DealStage, number> = {
  PROSPECTING: 10,
  FIRST_MEETING: 20,
  NEEDS_ANALYSIS: 30,
  PROPOSAL_SENT: 50,
  NEGOTIATION: 70,
  DECISION_PENDING: 80,
  WON: 100,
  LOST: 0,
  ON_HOLD: 20,
};

export class DealService {
  // ==================== CRUD OPERATIONS ====================

  async createDeal(data: CreateDealData) {
    // Verify college exists
    const college = await prisma.college.findFirst({
      where: { id: data.collegeId, organizationId: data.organizationId },
    });

    if (!college) {
      throw new NotFoundError('College not found');
    }

    // Check if deal already exists for this college
    const existingDeal = await prisma.collegeDeal.findUnique({
      where: { collegeId: data.collegeId },
    });

    if (existingDeal) {
      throw new BadRequestError('A deal already exists for this college');
    }

    const stage = data.stage || 'PROSPECTING';
    const dealName = data.dealName || `${college.name} - ${new Date().getFullYear()}`;

    const deal = await prisma.collegeDeal.create({
      data: {
        collegeId: data.collegeId,
        organizationId: data.organizationId,
        ownerId: data.ownerId,
        dealName,
        description: data.description,
        products: (data.products || []) as Prisma.InputJsonValue,
        dealValue: data.dealValue,
        stage,
        probability: stageProbability[stage],
        expectedCloseDate: data.expectedCloseDate,
        stageHistory: [{
          stage,
          changedAt: new Date().toISOString(),
          changedBy: data.ownerId,
        }] as Prisma.InputJsonValue,
      },
      include: {
        college: {
          select: { id: true, name: true, city: true },
        },
        owner: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return deal;
  }

  async getDeals(
    filter: DealFilter,
    page: number = 1,
    limit: number = 20
  ) {
    const skip = (page - 1) * limit;

    const where: Prisma.CollegeDealWhereInput = {
      organizationId: filter.organizationId,
    };

    if (filter.ownerId) where.ownerId = filter.ownerId;
    if (filter.stage) where.stage = filter.stage;
    if (filter.minValue || filter.maxValue) {
      where.dealValue = {};
      if (filter.minValue) where.dealValue.gte = filter.minValue;
      if (filter.maxValue) where.dealValue.lte = filter.maxValue;
    }

    const [deals, total] = await Promise.all([
      prisma.collegeDeal.findMany({
        where,
        include: {
          college: {
            select: { id: true, name: true, city: true, category: true },
          },
          owner: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.collegeDeal.count({ where }),
    ]);

    return { deals, total };
  }

  async getDealById(id: string, organizationId: string) {
    const deal = await prisma.collegeDeal.findFirst({
      where: { id, organizationId },
      include: {
        college: {
          select: {
            id: true,
            name: true,
            city: true,
            address: true,
            contacts: {
              where: { isPrimary: true },
              take: 1,
            },
          },
        },
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!deal) {
      throw new NotFoundError('Deal not found');
    }

    return deal;
  }

  async getDealByCollegeId(collegeId: string, organizationId: string) {
    return prisma.collegeDeal.findFirst({
      where: { collegeId, organizationId },
      include: {
        college: {
          select: { id: true, name: true, city: true },
        },
        owner: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async updateDeal(id: string, organizationId: string, data: UpdateDealData) {
    const deal = await prisma.collegeDeal.findFirst({
      where: { id, organizationId },
    });

    if (!deal) {
      throw new NotFoundError('Deal not found');
    }

    const updateData: any = { ...data };
    if (data.products) {
      updateData.products = data.products as Prisma.InputJsonValue;
    }

    const updated = await prisma.collegeDeal.update({
      where: { id },
      data: updateData,
      include: {
        college: {
          select: { id: true, name: true, city: true },
        },
        owner: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return updated;
  }

  async updateStage(
    id: string,
    organizationId: string,
    newStage: DealStage,
    changedById: string,
    reason?: string
  ) {
    const deal = await prisma.collegeDeal.findFirst({
      where: { id, organizationId },
    });

    if (!deal) {
      throw new NotFoundError('Deal not found');
    }

    // Get current stage history - ensure it's always an array
    let stageHistory: any[] = [];
    if (Array.isArray(deal.stageHistory)) {
      stageHistory = [...deal.stageHistory];
    } else if (deal.stageHistory && typeof deal.stageHistory === 'object') {
      // If it's an object but not an array, wrap it
      stageHistory = [deal.stageHistory];
    }

    stageHistory.push({
      stage: newStage,
      previousStage: deal.stage,
      changedAt: new Date().toISOString(),
      changedBy: changedById,
      reason,
    });

    const updateData: Prisma.CollegeDealUpdateInput = {
      stage: newStage,
      probability: stageProbability[newStage],
      stageHistory: stageHistory as Prisma.InputJsonValue,
    };

    // If won or lost, set actual close date
    if (newStage === 'WON' || newStage === 'LOST') {
      updateData.actualCloseDate = new Date();
      if (reason) {
        updateData.wonLostReason = reason;
      }
    }

    const updated = await prisma.collegeDeal.update({
      where: { id },
      data: updateData,
      include: {
        college: {
          select: { id: true, name: true, city: true },
        },
        owner: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return updated;
  }

  async deleteDeal(id: string, organizationId: string) {
    const deal = await prisma.collegeDeal.findFirst({
      where: { id, organizationId },
    });

    if (!deal) {
      throw new NotFoundError('Deal not found');
    }

    await prisma.collegeDeal.delete({
      where: { id },
    });

    return { deleted: true };
  }

  // ==================== PIPELINE VIEW ====================

  async getPipeline(organizationId: string, ownerId?: string) {
    const where: Prisma.CollegeDealWhereInput = {
      organizationId,
    };

    if (ownerId) where.ownerId = ownerId;

    const deals = await prisma.collegeDeal.findMany({
      where,
      include: {
        college: {
          select: { id: true, name: true, city: true, category: true },
        },
        owner: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Group by stage (including WON and LOST)
    const pipeline: Record<string, typeof deals> = {};
    const stages: DealStage[] = [
      'PROSPECTING',
      'FIRST_MEETING',
      'NEEDS_ANALYSIS',
      'PROPOSAL_SENT',
      'NEGOTIATION',
      'DECISION_PENDING',
      'WON',
      'LOST',
    ];

    stages.forEach((stage) => {
      pipeline[stage] = deals.filter((d) => d.stage === stage);
    });

    // Calculate totals
    const totals = stages.reduce((acc, stage) => {
      const stageDeals = pipeline[stage];
      acc[stage] = {
        count: stageDeals.length,
        value: stageDeals.reduce((sum, d) => sum + Number(d.dealValue || 0), 0),
        weightedValue: stageDeals.reduce(
          (sum, d) => sum + (Number(d.dealValue || 0) * (d.probability / 100)),
          0
        ),
      };
      return acc;
    }, {} as Record<string, { count: number; value: number; weightedValue: number }>);

    return { pipeline, totals };
  }

  // ==================== STATISTICS ====================

  async getDealStats(organizationId: string, ownerId?: string, startDate?: Date, endDate?: Date) {
    const where: Prisma.CollegeDealWhereInput = {
      organizationId,
    };

    if (ownerId) where.ownerId = ownerId;

    const closedWhere: Prisma.CollegeDealWhereInput = {
      ...where,
      stage: { in: ['WON', 'LOST'] },
    };

    if (startDate || endDate) {
      closedWhere.actualCloseDate = {};
      if (startDate) closedWhere.actualCloseDate.gte = startDate;
      if (endDate) closedWhere.actualCloseDate.lte = endDate;
    }

    const [
      totalDeals,
      openDeals,
      wonDeals,
      lostDeals,
      totalPipelineValue,
      wonValue,
    ] = await Promise.all([
      prisma.collegeDeal.count({ where }),
      prisma.collegeDeal.count({
        where: { ...where, stage: { notIn: ['WON', 'LOST'] } },
      }),
      prisma.collegeDeal.count({
        where: { ...closedWhere, stage: 'WON' },
      }),
      prisma.collegeDeal.count({
        where: { ...closedWhere, stage: 'LOST' },
      }),
      prisma.collegeDeal.aggregate({
        where: { ...where, stage: { notIn: ['WON', 'LOST'] } },
        _sum: { dealValue: true },
      }),
      prisma.collegeDeal.aggregate({
        where: { ...closedWhere, stage: 'WON' },
        _sum: { dealValue: true },
      }),
    ]);

    const winRate = wonDeals + lostDeals > 0
      ? Math.round((wonDeals / (wonDeals + lostDeals)) * 100)
      : 0;

    return {
      totalDeals,
      openDeals,
      wonDeals,
      lostDeals,
      winRate,
      totalPipelineValue: Number(totalPipelineValue._sum.dealValue || 0),
      wonValue: Number(wonValue._sum.dealValue || 0),
    };
  }

  async getRecentWins(organizationId: string, limit: number = 5) {
    return prisma.collegeDeal.findMany({
      where: {
        organizationId,
        stage: 'WON',
      },
      include: {
        college: {
          select: { id: true, name: true, city: true },
        },
        owner: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { actualCloseDate: 'desc' },
      take: limit,
    });
  }
}

export const dealService = new DealService();
