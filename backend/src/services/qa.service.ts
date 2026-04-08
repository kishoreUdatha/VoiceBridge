/**
 * QA (Quality Assurance) Service
 * Handles call review, scoring templates, and agent coaching
 */

import { PrismaClient, QAReviewStatus } from '@prisma/client';

const prisma = new PrismaClient();

export interface ScoreCriterion {
  id: string;
  name: string;
  description: string;
  weight: number;
  maxScore: number;
}

export interface ReviewScore {
  criterionId: string;
  score: number;
  notes?: string;
}

class QAService {
  /**
   * Create a new QA scoring template
   */
  async createTemplate(data: {
    organizationId: string;
    name: string;
    description?: string;
    criteria: ScoreCriterion[];
    passingScore?: number;
    isDefault?: boolean;
  }) {
    const totalMaxScore = data.criteria.reduce((sum, c) => sum + c.maxScore, 0);

    // If this is default, unset other defaults
    if (data.isDefault) {
      await prisma.qAScoreTemplate.updateMany({
        where: { organizationId: data.organizationId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return prisma.qAScoreTemplate.create({
      data: {
        organizationId: data.organizationId,
        name: data.name,
        description: data.description,
        criteria: data.criteria,
        totalMaxScore,
        passingScore: data.passingScore || 70,
        isDefault: data.isDefault || false,
      },
    });
  }

  /**
   * Get all templates for an organization
   */
  async getTemplates(organizationId: string) {
    return prisma.qAScoreTemplate.findMany({
      where: { organizationId, isActive: true },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  /**
   * Get template by ID
   */
  async getTemplateById(id: string, organizationId: string) {
    return prisma.qAScoreTemplate.findFirst({
      where: { id, organizationId },
    });
  }

  /**
   * Update a template
   */
  async updateTemplate(
    id: string,
    organizationId: string,
    data: {
      name?: string;
      description?: string;
      criteria?: ScoreCriterion[];
      passingScore?: number;
      isDefault?: boolean;
      isActive?: boolean;
    }
  ) {
    const updateData: any = { ...data };

    if (data.criteria) {
      updateData.totalMaxScore = data.criteria.reduce((sum, c) => sum + c.maxScore, 0);
    }

    if (data.isDefault) {
      await prisma.qAScoreTemplate.updateMany({
        where: { organizationId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return prisma.qAScoreTemplate.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Get calls pending QA review
   */
  async getPendingReviewCalls(organizationId: string, options: {
    agentId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
  } = {}) {
    const { agentId, dateFrom, dateTo, limit = 50, offset = 0 } = options;

    // Get call logs that haven't been reviewed
    const reviewedCallIds = await prisma.qAReview.findMany({
      where: { organizationId },
      select: { callLogId: true },
    });

    const reviewedIds = reviewedCallIds.map(r => r.callLogId);

    const where: any = {
      organizationId,
      id: { notIn: reviewedIds },
      status: 'COMPLETED',
    };

    if (agentId) {
      where.userId = agentId;
    }

    if (dateFrom) {
      where.createdAt = { ...where.createdAt, gte: dateFrom };
    }

    if (dateTo) {
      where.createdAt = { ...where.createdAt, lte: dateTo };
    }

    const [calls, total] = await Promise.all([
      prisma.callLog.findMany({
        where,
        include: {
          caller: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          lead: {
            select: { id: true, firstName: true, lastName: true, phone: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.callLog.count({ where }),
    ]);

    return { calls, total };
  }

  /**
   * Create a new QA review
   */
  async createReview(data: {
    organizationId: string;
    callLogId: string;
    templateId: string;
    reviewerId: string;
    agentId: string;
    scores: ReviewScore[];
    strengths?: string;
    improvements?: string;
    coachingNotes?: string;
    status?: QAReviewStatus;
  }) {
    // Get the template to calculate scores
    const template = await prisma.qAScoreTemplate.findUnique({
      where: { id: data.templateId },
    });

    if (!template) {
      throw new Error('Template not found');
    }

    const criteria = template.criteria as ScoreCriterion[];

    // Calculate total score
    let totalScore = 0;
    for (const score of data.scores) {
      const criterion = criteria.find(c => c.id === score.criterionId);
      if (criterion) {
        totalScore += score.score;
      }
    }

    const percentage = (totalScore / template.totalMaxScore) * 100;
    const passed = percentage >= template.passingScore;

    return prisma.qAReview.create({
      data: {
        organizationId: data.organizationId,
        callLogId: data.callLogId,
        templateId: data.templateId,
        reviewerId: data.reviewerId,
        agentId: data.agentId,
        scores: data.scores,
        totalScore,
        percentage,
        passed,
        strengths: data.strengths,
        improvements: data.improvements,
        coachingNotes: data.coachingNotes,
        status: data.status || 'SUBMITTED',
        reviewedAt: data.status === 'SUBMITTED' ? new Date() : null,
      },
      include: {
        template: true,
        reviewer: {
          select: { id: true, firstName: true, lastName: true },
        },
        agent: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  /**
   * Get reviews with filters
   */
  async getReviews(organizationId: string, options: {
    agentId?: string;
    reviewerId?: string;
    status?: QAReviewStatus;
    passed?: boolean;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
  } = {}) {
    const { agentId, reviewerId, status, passed, dateFrom, dateTo, limit = 50, offset = 0 } = options;

    const where: any = { organizationId };

    if (agentId) where.agentId = agentId;
    if (reviewerId) where.reviewerId = reviewerId;
    if (status) where.status = status;
    if (passed !== undefined) where.passed = passed;
    if (dateFrom) where.createdAt = { ...where.createdAt, gte: dateFrom };
    if (dateTo) where.createdAt = { ...where.createdAt, lte: dateTo };

    const [reviews, total] = await Promise.all([
      prisma.qAReview.findMany({
        where,
        include: {
          template: {
            select: { id: true, name: true },
          },
          reviewer: {
            select: { id: true, firstName: true, lastName: true },
          },
          agent: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.qAReview.count({ where }),
    ]);

    return { reviews, total };
  }

  /**
   * Get review by ID
   */
  async getReviewById(id: string, organizationId: string) {
    return prisma.qAReview.findFirst({
      where: { id, organizationId },
      include: {
        template: true,
        reviewer: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        agent: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  /**
   * Update review
   */
  async updateReview(
    id: string,
    organizationId: string,
    data: {
      scores?: ReviewScore[];
      strengths?: string;
      improvements?: string;
      coachingNotes?: string;
      status?: QAReviewStatus;
    }
  ) {
    const review = await prisma.qAReview.findFirst({
      where: { id, organizationId },
      include: { template: true },
    });

    if (!review) {
      throw new Error('Review not found');
    }

    const updateData: any = { ...data };

    if (data.scores) {
      const criteria = review.template.criteria as ScoreCriterion[];
      let totalScore = 0;
      for (const score of data.scores) {
        const criterion = criteria.find(c => c.id === score.criterionId);
        if (criterion) {
          totalScore += score.score;
        }
      }

      updateData.totalScore = totalScore;
      updateData.percentage = (totalScore / review.template.totalMaxScore) * 100;
      updateData.passed = updateData.percentage >= review.template.passingScore;
    }

    if (data.status === 'SUBMITTED') {
      updateData.reviewedAt = new Date();
    }

    if (data.status === 'ACKNOWLEDGED') {
      updateData.acknowledgedAt = new Date();
    }

    return prisma.qAReview.update({
      where: { id },
      data: updateData,
      include: {
        template: true,
        reviewer: {
          select: { id: true, firstName: true, lastName: true },
        },
        agent: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  /**
   * Get agent QA statistics
   */
  async getAgentStats(organizationId: string, agentId: string, dateFrom?: Date, dateTo?: Date) {
    const where: any = {
      organizationId,
      agentId,
      status: 'SUBMITTED',
    };

    if (dateFrom) where.createdAt = { ...where.createdAt, gte: dateFrom };
    if (dateTo) where.createdAt = { ...where.createdAt, lte: dateTo };

    const reviews = await prisma.qAReview.findMany({
      where,
      select: {
        totalScore: true,
        percentage: true,
        passed: true,
        scores: true,
      },
    });

    if (reviews.length === 0) {
      return {
        totalReviews: 0,
        averageScore: 0,
        passRate: 0,
        trend: [],
      };
    }

    const totalReviews = reviews.length;
    const averageScore = reviews.reduce((sum, r) => sum + r.percentage, 0) / totalReviews;
    const passedCount = reviews.filter(r => r.passed).length;
    const passRate = (passedCount / totalReviews) * 100;

    return {
      totalReviews,
      averageScore: Math.round(averageScore * 10) / 10,
      passRate: Math.round(passRate * 10) / 10,
      passedCount,
      failedCount: totalReviews - passedCount,
    };
  }

  /**
   * Get QA dashboard overview
   */
  async getDashboardOverview(organizationId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalReviews,
      pendingReviews,
      passedReviews,
      reviewsThisMonth,
    ] = await Promise.all([
      prisma.qAReview.count({ where: { organizationId } }),
      prisma.qAReview.count({ where: { organizationId, status: 'DRAFT' } }),
      prisma.qAReview.count({ where: { organizationId, passed: true, status: 'SUBMITTED' } }),
      prisma.qAReview.count({ where: { organizationId, createdAt: { gte: thirtyDaysAgo } } }),
    ]);

    // Get average score
    const avgResult = await prisma.qAReview.aggregate({
      where: { organizationId, status: 'SUBMITTED' },
      _avg: { percentage: true },
    });

    // Get top and bottom performers
    const agentStats = await prisma.qAReview.groupBy({
      by: ['agentId'],
      where: { organizationId, status: 'SUBMITTED', createdAt: { gte: thirtyDaysAgo } },
      _avg: { percentage: true },
      _count: true,
    });

    const agentIds = agentStats.map(s => s.agentId);
    const agents = await prisma.user.findMany({
      where: { id: { in: agentIds } },
      select: { id: true, firstName: true, lastName: true },
    });

    const agentMap = new Map(agents.map(a => [a.id, a]));

    const rankedAgents = agentStats
      .map(s => ({
        agentId: s.agentId,
        agentName: agentMap.get(s.agentId)
          ? `${agentMap.get(s.agentId)!.firstName} ${agentMap.get(s.agentId)!.lastName}`
          : 'Unknown',
        averageScore: Math.round((s._avg.percentage || 0) * 10) / 10,
        reviewCount: s._count,
      }))
      .sort((a, b) => b.averageScore - a.averageScore);

    return {
      totalReviews,
      pendingReviews,
      passedReviews,
      reviewsThisMonth,
      averageScore: Math.round((avgResult._avg.percentage || 0) * 10) / 10,
      passRate: totalReviews > 0 ? Math.round((passedReviews / totalReviews) * 1000) / 10 : 0,
      topPerformers: rankedAgents.slice(0, 5),
      needsImprovement: rankedAgents.slice(-5).reverse(),
    };
  }
}

export const qaService = new QAService();
