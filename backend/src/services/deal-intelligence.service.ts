/**
 * Deal Intelligence Service
 * Deal health indicators, win/loss probability, revenue risk assessment
 */

import { PrismaClient, DealRiskType, RiskSeverity, DealOutcome } from '@prisma/client';

const prisma = new PrismaClient();

// Stage probabilities (typical B2B sales funnel)
const STAGE_WIN_PROBABILITIES: Record<string, number> = {
  INQUIRY: 10,
  QUALIFIED: 25,
  PROPOSAL: 50,
  NEGOTIATION: 75,
  CLOSED_WON: 100,
  CLOSED_LOST: 0,
};

class DealIntelligenceService {
  /**
   * Calculate deal intelligence for a lead
   */
  async calculateDealIntelligence(leadId: string, organizationId: string): Promise<{
    winProbability: number;
    healthScore: number;
    riskFactors: any[];
    nextSteps: string[];
  }> {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        stage: true,
        callLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
        activities: { orderBy: { createdAt: 'desc' }, take: 30 },
        quotations: { orderBy: { createdAt: 'desc' }, take: 5 },
        assignments: { where: { isActive: true }, include: { assignedTo: true } },
      },
    });

    if (!lead) throw new Error('Lead not found');

    // Get deal value from quotations or expected fee
    const activeQuotation = lead.quotations.find(q => q.status === 'SENT' || q.status === 'VIEWED');
    const dealValue = activeQuotation ? Number(activeQuotation.totalAmount) : Number(lead.expectedFee) || 0;

    // Calculate base win probability from stage
    const stageName = lead.stage?.name?.toUpperCase() || 'INQUIRY';
    let baseProbability = STAGE_WIN_PROBABILITIES[stageName] || 20;

    // Factors that affect probability
    const factors: { name: string; impact: number; description: string }[] = [];
    const riskFactors: any[] = [];
    const strengthFactors: any[] = [];
    const nextSteps: string[] = [];

    // 1. Engagement Level
    const recentActivities = lead.activities.filter(a =>
      a.createdAt > new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    ).length;

    if (recentActivities >= 5) {
      factors.push({ name: 'High Engagement', impact: 10, description: `${recentActivities} activities in last 2 weeks` });
      strengthFactors.push('Strong customer engagement');
    } else if (recentActivities === 0) {
      factors.push({ name: 'No Recent Activity', impact: -15, description: 'No activity in last 2 weeks' });
      riskFactors.push({ type: 'NO_ACTIVITY', severity: 'HIGH', description: 'Deal has gone silent' });
      nextSteps.push('Re-engage with value-add content or check-in call');
    }

    // 2. Time in Stage
    const daysSinceCreated = Math.floor((Date.now() - lead.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const daysSinceLastUpdate = Math.floor((Date.now() - lead.updatedAt.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceLastUpdate > 14) {
      factors.push({ name: 'Stalled Deal', impact: -20, description: `No update in ${daysSinceLastUpdate} days` });
      riskFactors.push({ type: 'STALLED', severity: 'HIGH', description: `Deal stalled for ${daysSinceLastUpdate} days` });
      nextSteps.push('Create urgency or offer incentive to move forward');
    }

    // 3. Quotation Status
    if (activeQuotation) {
      if (activeQuotation.status === 'VIEWED') {
        factors.push({ name: 'Quotation Viewed', impact: 10, description: 'Customer has reviewed the quote' });
        strengthFactors.push('Quotation viewed by customer');
        nextSteps.push('Follow up on quotation, address any questions');
      }
      // Check if quote is near expiry
      if (activeQuotation.validUntil) {
        const daysToExpiry = Math.floor((activeQuotation.validUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysToExpiry < 7 && daysToExpiry > 0) {
          riskFactors.push({ type: 'TIMELINE_SLIP', severity: 'MEDIUM', description: `Quotation expires in ${daysToExpiry} days` });
          nextSteps.push('Remind customer about quotation expiry');
        }
      }
    } else if (baseProbability >= 40) {
      nextSteps.push('Send formal quotation/proposal');
    }

    // 4. Call Activity
    const recentCalls = lead.callLogs.filter(c =>
      c.createdAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );

    if (recentCalls.length >= 3) {
      factors.push({ name: 'Active Communication', impact: 5, description: `${recentCalls.length} calls in last month` });
      strengthFactors.push('Regular communication established');
    } else if (recentCalls.length === 0 && baseProbability >= 30) {
      riskFactors.push({ type: 'NO_ACTIVITY', severity: 'MEDIUM', description: 'No calls in past month' });
      nextSteps.push('Schedule a call to maintain momentum');
    }

    // 5. Decision Maker Engagement (based on job title)
    if (lead.jobTitle) {
      const isDecisionMaker = ['ceo', 'cto', 'cfo', 'director', 'head', 'vp', 'owner', 'founder', 'manager']
        .some(title => lead.jobTitle!.toLowerCase().includes(title));
      if (isDecisionMaker) {
        factors.push({ name: 'Decision Maker Engaged', impact: 15, description: `${lead.jobTitle} involved` });
        strengthFactors.push('Decision maker involved in discussions');
      }
    }

    // 6. Budget/Price concerns
    if (lead.customFields && (lead.customFields as any).budgetConcern) {
      factors.push({ name: 'Budget Concern', impact: -10, description: 'Customer expressed budget concerns' });
      riskFactors.push({ type: 'BUDGET_CONCERN', severity: 'MEDIUM', description: 'Budget constraints mentioned' });
      nextSteps.push('Discuss flexible payment options or scaled solution');
    }

    // Calculate final win probability
    let winProbability = baseProbability;
    for (const factor of factors) {
      winProbability += factor.impact;
    }
    winProbability = Math.max(0, Math.min(100, winProbability));

    // Calculate health score
    const healthScore = Math.round(
      (recentActivities > 0 ? 30 : 0) +
      (daysSinceLastUpdate < 7 ? 30 : daysSinceLastUpdate < 14 ? 15 : 0) +
      (recentCalls.length > 0 ? 20 : 0) +
      (activeQuotation ? 20 : 0)
    );

    // Store deal intelligence
    const dealIntel = await prisma.dealIntelligence.upsert({
      where: { leadId },
      update: {
        dealValue,
        winProbability,
        healthScore,
        riskScore: 100 - healthScore,
        engagementLevel: Math.min(100, recentActivities * 15),
        timeInStage: daysSinceCreated,
        nextSteps,
        riskFactors,
        strengthFactors,
        calculatedAt: new Date(),
      },
      create: {
        organizationId,
        leadId,
        quotationId: activeQuotation?.id,
        dealValue,
        winProbability,
        healthScore,
        riskScore: 100 - healthScore,
        engagementLevel: Math.min(100, recentActivities * 15),
        timeInStage: daysSinceCreated,
        nextSteps,
        riskFactors,
        strengthFactors,
      },
    });

    // Create risk alerts for high severity issues
    for (const risk of riskFactors) {
      if (risk.severity === 'HIGH' || risk.severity === 'CRITICAL') {
        const existingAlert = await prisma.dealRiskAlert.findFirst({
          where: {
            dealIntelligenceId: dealIntel.id,
            type: risk.type,
            isResolved: false,
          },
        });

        if (!existingAlert) {
          await prisma.dealRiskAlert.create({
            data: {
              dealIntelligenceId: dealIntel.id,
              type: risk.type,
              severity: risk.severity,
              description: risk.description,
              recommendation: nextSteps[0] || 'Review and take action',
            },
          });
        }
      }
    }

    return { winProbability, healthScore, riskFactors, nextSteps };
  }

  /**
   * Get deal intelligence for a lead
   */
  async getDealIntelligence(leadId: string) {
    return prisma.dealIntelligence.findUnique({
      where: { leadId },
      include: {
        riskAlerts: { where: { isResolved: false }, orderBy: { createdAt: 'desc' } },
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            stage: true,
          },
        },
      },
    });
  }

  /**
   * Resolve a risk alert
   */
  async resolveRiskAlert(alertId: string, resolvedBy: string) {
    return prisma.dealRiskAlert.update({
      where: { id: alertId },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
        resolvedBy,
      },
    });
  }

  /**
   * Record win/loss analysis
   */
  async recordWinLossAnalysis(data: {
    organizationId: string;
    leadId: string;
    outcome: DealOutcome;
    dealValue?: number;
    competitorName?: string;
    primaryReason?: string;
    secondaryReasons?: string[];
    priceImpact?: string;
    productFit?: string;
    lessonsLearned?: string;
    analyzedById?: string;
  }) {
    return prisma.winLossAnalysis.upsert({
      where: { leadId: data.leadId },
      update: {
        outcome: data.outcome,
        dealValue: data.dealValue,
        competitorName: data.competitorName,
        primaryReason: data.primaryReason,
        secondaryReasons: data.secondaryReasons,
        priceImpact: data.priceImpact,
        productFit: data.productFit,
        lessonsLearned: data.lessonsLearned,
        analyzedById: data.analyzedById,
        analyzedAt: new Date(),
        closedAt: new Date(),
      },
      create: {
        organizationId: data.organizationId,
        leadId: data.leadId,
        outcome: data.outcome,
        dealValue: data.dealValue,
        competitorName: data.competitorName,
        primaryReason: data.primaryReason,
        secondaryReasons: data.secondaryReasons,
        priceImpact: data.priceImpact,
        productFit: data.productFit,
        lessonsLearned: data.lessonsLearned,
        analyzedById: data.analyzedById,
        closedAt: new Date(),
      },
    });
  }

  /**
   * Get deal intelligence dashboard
   */
  async getDashboardData(organizationId: string) {
    const [
      highProbabilityDeals,
      atRiskDeals,
      pendingAlerts,
      probabilityDistribution,
      pipelineValue,
      winLossStats,
      recentWinLoss,
    ] = await Promise.all([
      // High probability deals
      prisma.dealIntelligence.findMany({
        where: { organizationId, winProbability: { gte: 70 } },
        orderBy: { dealValue: 'desc' },
        take: 10,
        include: {
          lead: { select: { id: true, firstName: true, lastName: true, phone: true, stage: true } },
        },
      }),
      // At risk deals
      prisma.dealIntelligence.findMany({
        where: { organizationId, healthScore: { lt: 50 }, winProbability: { gte: 30 } },
        orderBy: { healthScore: 'asc' },
        take: 10,
        include: {
          lead: { select: { id: true, firstName: true, lastName: true, phone: true, stage: true } },
          riskAlerts: { where: { isResolved: false } },
        },
      }),
      // Pending alerts
      prisma.dealRiskAlert.findMany({
        where: { dealIntelligence: { organizationId }, isResolved: false },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          dealIntelligence: {
            include: { lead: { select: { id: true, firstName: true, lastName: true, phone: true } } },
          },
        },
      }),
      // Win probability distribution
      prisma.dealIntelligence.groupBy({
        by: ['organizationId'],
        where: { organizationId },
        _count: true,
        _avg: { winProbability: true, healthScore: true, dealValue: true },
      }),
      // Pipeline value by probability tier
      prisma.$queryRaw`
        SELECT
          CASE
            WHEN "winProbability" >= 75 THEN 'High (75-100%)'
            WHEN "winProbability" >= 50 THEN 'Medium (50-74%)'
            WHEN "winProbability" >= 25 THEN 'Low (25-49%)'
            ELSE 'Very Low (0-24%)'
          END as tier,
          COUNT(*) as count,
          SUM("dealValue") as total_value,
          SUM("dealValue" * "winProbability" / 100) as weighted_value
        FROM deal_intelligence
        WHERE "organizationId" = ${organizationId}
        GROUP BY tier
        ORDER BY MIN("winProbability") DESC
      `,
      // Win/Loss stats
      prisma.winLossAnalysis.groupBy({
        by: ['outcome'],
        where: { organizationId },
        _count: true,
        _sum: { dealValue: true },
      }),
      // Recent win/loss entries
      prisma.winLossAnalysis.findMany({
        where: { organizationId },
        orderBy: { closedAt: 'desc' },
        take: 10,
        include: { lead: { select: { id: true, firstName: true, lastName: true } } },
      }),
    ]);

    // Calculate win rate
    const wonDeals = winLossStats.find(s => s.outcome === 'WON');
    const lostDeals = winLossStats.find(s => s.outcome === 'LOST');
    const totalClosed = (wonDeals?._count || 0) + (lostDeals?._count || 0);
    const winRate = totalClosed > 0 ? ((wonDeals?._count || 0) / totalClosed) * 100 : 0;

    return {
      highProbabilityDeals,
      atRiskDeals,
      pendingAlerts,
      stats: probabilityDistribution[0] || { _count: 0, _avg: { winProbability: 0, healthScore: 0, dealValue: 0 } },
      pipelineValue,
      winLossStats,
      recentWinLoss,
      winRate,
    };
  }

  /**
   * Get all deals with intelligence
   */
  async getAllDeals(organizationId: string, options: {
    minProbability?: number;
    maxProbability?: number;
    minHealth?: number;
    maxHealth?: number;
    limit?: number;
    offset?: number;
  } = {}) {
    const { minProbability, maxProbability, minHealth, maxHealth, limit = 50, offset = 0 } = options;

    const where: any = { organizationId };
    if (minProbability !== undefined) where.winProbability = { ...where.winProbability, gte: minProbability };
    if (maxProbability !== undefined) where.winProbability = { ...where.winProbability, lte: maxProbability };
    if (minHealth !== undefined) where.healthScore = { ...where.healthScore, gte: minHealth };
    if (maxHealth !== undefined) where.healthScore = { ...where.healthScore, lte: maxHealth };

    const [deals, total] = await Promise.all([
      prisma.dealIntelligence.findMany({
        where,
        orderBy: [{ winProbability: 'desc' }, { dealValue: 'desc' }],
        take: limit,
        skip: offset,
        include: {
          lead: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
              stage: { select: { name: true } },
            },
          },
          riskAlerts: { where: { isResolved: false }, take: 3 },
        },
      }),
      prisma.dealIntelligence.count({ where }),
    ]);

    return { deals, total };
  }

  /**
   * Batch calculate deal intelligence
   */
  async batchCalculateIntelligence(organizationId: string, limit: number = 100) {
    const leads = await prisma.lead.findMany({
      where: {
        organizationId,
        isConverted: false,
        OR: [
          { dealIntelligence: null },
          { dealIntelligence: { calculatedAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } },
        ],
      },
      take: limit,
    });

    const results = [];
    for (const lead of leads) {
      try {
        const intel = await this.calculateDealIntelligence(lead.id, organizationId);
        results.push({ leadId: lead.id, success: true, ...intel });
      } catch (error) {
        results.push({ leadId: lead.id, success: false, error: (error as Error).message });
      }
    }

    return { processed: results.length, results };
  }
}

export const dealIntelligenceService = new DealIntelligenceService();
