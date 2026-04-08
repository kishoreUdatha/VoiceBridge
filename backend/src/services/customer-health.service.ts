/**
 * Customer Health Scoring Service
 * Health indicators, NPS/CSAT tracking, and proactive intervention alerts
 */

import { PrismaClient, HealthRiskLevel, HealthTrend, InterventionType, InterventionPriority, SurveyType } from '@prisma/client';

const prisma = new PrismaClient();

// Health score weights
const HEALTH_WEIGHTS = {
  engagement: 0.25,
  payment: 0.25,
  support: 0.20,
  satisfaction: 0.20,
  productUsage: 0.10,
};

class CustomerHealthService {
  /**
   * Calculate health score for a customer
   */
  async calculateHealthScore(leadId: string, organizationId: string): Promise<{
    overallScore: number;
    riskLevel: HealthRiskLevel;
    trend: HealthTrend;
    factors: Record<string, any>;
  }> {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        callLogs: { orderBy: { createdAt: 'desc' }, take: 30 },
        activities: { orderBy: { createdAt: 'desc' }, take: 50 },
        surveys: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });

    if (!lead) throw new Error('Lead not found');

    const factors: Record<string, any> = {};

    // 1. Engagement Score
    const recentActivities = lead.activities.filter(a =>
      a.createdAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ).length;
    const engagementScore = Math.min(100, recentActivities * 10);
    factors.engagement = { score: engagementScore, recentActivities };

    // 2. Payment Score
    let paymentScore = 100;
    if (lead.paymentStatus === 'overdue') paymentScore = 20;
    else if (lead.paymentStatus === 'pending') paymentScore = 60;
    else if (lead.paymentStatus === 'partial') paymentScore = 80;
    factors.payment = { score: paymentScore, status: lead.paymentStatus };

    // 3. Support Score (based on call frequency and resolution)
    const recentCalls = lead.callLogs.filter(c =>
      c.createdAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );
    const supportScore = recentCalls.length > 10 ? 40 : recentCalls.length > 5 ? 70 : 100;
    factors.support = { score: supportScore, recentCalls: recentCalls.length };

    // 4. Satisfaction Score (from surveys)
    const recentSurveys = lead.surveys.filter(s => s.score !== null);
    let satisfactionScore = 70; // Default neutral
    if (recentSurveys.length > 0) {
      const avgScore = recentSurveys.reduce((sum, s) => sum + (s.score || 0), 0) / recentSurveys.length;
      // Normalize NPS (-100 to 100) to 0-100
      satisfactionScore = Math.round(((avgScore + 100) / 200) * 100);
    }
    factors.satisfaction = { score: satisfactionScore, surveyCount: recentSurveys.length };

    // 5. Product Usage Score (based on page views and engagement)
    const productUsageScore = Math.min(100, (lead.totalPageViews || 0) * 2);
    factors.productUsage = { score: productUsageScore, pageViews: lead.totalPageViews };

    // Calculate weighted average
    const overallScore = Math.round(
      (engagementScore * HEALTH_WEIGHTS.engagement) +
      (paymentScore * HEALTH_WEIGHTS.payment) +
      (supportScore * HEALTH_WEIGHTS.support) +
      (satisfactionScore * HEALTH_WEIGHTS.satisfaction) +
      (productUsageScore * HEALTH_WEIGHTS.productUsage)
    );

    // Determine risk level
    let riskLevel: HealthRiskLevel = 'LOW';
    if (overallScore < 30) riskLevel = 'CRITICAL';
    else if (overallScore < 50) riskLevel = 'HIGH';
    else if (overallScore < 70) riskLevel = 'MEDIUM';

    // Determine trend (compare with previous score)
    const previousHealth = await prisma.customerHealth.findUnique({ where: { leadId } });
    let trend: HealthTrend = 'STABLE';
    if (previousHealth) {
      const scoreDiff = overallScore - previousHealth.overallScore;
      if (scoreDiff > 10) trend = 'IMPROVING';
      else if (scoreDiff < -10) trend = 'DECLINING';
    }

    // Generate alerts
    const alerts: string[] = [];
    if (engagementScore < 30) alerts.push('Low engagement - consider re-engagement campaign');
    if (paymentScore < 50) alerts.push('Payment issues detected');
    if (supportScore < 50) alerts.push('High support ticket volume');
    if (satisfactionScore < 50) alerts.push('Low satisfaction scores');

    // Store health data
    await prisma.customerHealth.upsert({
      where: { leadId },
      update: {
        overallScore,
        engagementScore,
        paymentScore,
        supportScore,
        satisfactionScore,
        productUsageScore,
        riskLevel,
        trend,
        factors,
        alerts,
        lastActivityAt: lead.lastEngagementAt,
        calculatedAt: new Date(),
      },
      create: {
        organizationId,
        leadId,
        overallScore,
        engagementScore,
        paymentScore,
        supportScore,
        satisfactionScore,
        productUsageScore,
        riskLevel,
        trend,
        factors,
        alerts,
        lastActivityAt: lead.lastEngagementAt,
      },
    });

    // Auto-create intervention if critical
    if (riskLevel === 'CRITICAL' || riskLevel === 'HIGH') {
      const health = await prisma.customerHealth.findUnique({ where: { leadId } });
      if (health) {
        const existingIntervention = await prisma.customerIntervention.findFirst({
          where: { customerHealthId: health.id, status: 'PENDING' },
        });
        if (!existingIntervention) {
          await this.createIntervention({
            organizationId,
            customerHealthId: health.id,
            type: riskLevel === 'CRITICAL' ? 'ESCALATION' : 'CALL',
            reason: alerts[0] || 'Health score declined',
            priority: riskLevel === 'CRITICAL' ? 'URGENT' : 'HIGH',
          });
        }
      }
    }

    return { overallScore, riskLevel, trend, factors };
  }

  /**
   * Get customer health data
   */
  async getCustomerHealth(leadId: string) {
    return prisma.customerHealth.findUnique({
      where: { leadId },
      include: {
        interventions: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });
  }

  /**
   * Create an intervention
   */
  async createIntervention(data: {
    organizationId: string;
    customerHealthId: string;
    type: InterventionType;
    reason: string;
    priority?: InterventionPriority;
    assignedToId?: string;
    scheduledAt?: Date;
  }) {
    return prisma.customerIntervention.create({
      data: {
        organizationId: data.organizationId,
        customerHealthId: data.customerHealthId,
        type: data.type,
        reason: data.reason,
        priority: data.priority || 'MEDIUM',
        assignedToId: data.assignedToId,
        scheduledAt: data.scheduledAt,
      },
    });
  }

  /**
   * Update intervention status
   */
  async updateIntervention(interventionId: string, data: {
    status?: string;
    notes?: string;
    outcome?: string;
  }) {
    const updateData: any = { ...data };
    if (data.status === 'COMPLETED') {
      updateData.completedAt = new Date();
    }
    return prisma.customerIntervention.update({
      where: { id: interventionId },
      data: updateData,
    });
  }

  /**
   * Record a survey response
   */
  async recordSurvey(data: {
    organizationId: string;
    leadId: string;
    type: SurveyType;
    score: number;
    response?: any;
    feedback?: string;
    channel?: string;
    callLogId?: string;
  }) {
    return prisma.customerSurvey.create({
      data: {
        organizationId: data.organizationId,
        leadId: data.leadId,
        type: data.type,
        score: data.score,
        response: data.response,
        feedback: data.feedback,
        channel: data.channel,
        callLogId: data.callLogId,
        respondedAt: new Date(),
      },
    });
  }

  /**
   * Get health dashboard data
   */
  async getDashboardData(organizationId: string) {
    const [
      criticalCustomers,
      highRiskCustomers,
      pendingInterventions,
      healthDistribution,
      trendDistribution,
      recentSurveys,
      avgNPS,
    ] = await Promise.all([
      // Critical risk customers
      prisma.customerHealth.findMany({
        where: { organizationId, riskLevel: 'CRITICAL' },
        orderBy: { overallScore: 'asc' },
        take: 10,
        include: { lead: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } } },
      }),
      // High risk customers
      prisma.customerHealth.findMany({
        where: { organizationId, riskLevel: 'HIGH' },
        orderBy: { overallScore: 'asc' },
        take: 10,
        include: { lead: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } } },
      }),
      // Pending interventions
      prisma.customerIntervention.findMany({
        where: { organizationId, status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          customerHealth: {
            include: { lead: { select: { id: true, firstName: true, lastName: true, phone: true } } },
          },
        },
      }),
      // Health distribution
      prisma.customerHealth.groupBy({
        by: ['riskLevel'],
        where: { organizationId },
        _count: true,
      }),
      // Trend distribution
      prisma.customerHealth.groupBy({
        by: ['trend'],
        where: { organizationId },
        _count: true,
      }),
      // Recent surveys
      prisma.customerSurvey.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { lead: { select: { id: true, firstName: true, lastName: true } } },
      }),
      // Average NPS
      prisma.customerSurvey.aggregate({
        where: { organizationId, type: 'NPS' },
        _avg: { score: true },
        _count: true,
      }),
    ]);

    // Calculate averages
    const avgHealth = await prisma.customerHealth.aggregate({
      where: { organizationId },
      _avg: {
        overallScore: true,
        engagementScore: true,
        paymentScore: true,
        supportScore: true,
        satisfactionScore: true,
      },
    });

    return {
      criticalCustomers,
      highRiskCustomers,
      pendingInterventions,
      healthDistribution,
      trendDistribution,
      recentSurveys,
      avgNPS: avgNPS._avg.score || 0,
      npsResponseCount: avgNPS._count || 0,
      avgHealth,
    };
  }

  /**
   * Get all customer health records
   */
  async getAllHealthRecords(organizationId: string, options: {
    riskLevel?: HealthRiskLevel;
    trend?: HealthTrend;
    limit?: number;
    offset?: number;
  } = {}) {
    const { riskLevel, trend, limit = 50, offset = 0 } = options;

    const where: any = { organizationId };
    if (riskLevel) where.riskLevel = riskLevel;
    if (trend) where.trend = trend;

    const [records, total] = await Promise.all([
      prisma.customerHealth.findMany({
        where,
        orderBy: { overallScore: 'asc' },
        take: limit,
        skip: offset,
        include: {
          lead: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
          interventions: { where: { status: 'PENDING' }, take: 1 },
        },
      }),
      prisma.customerHealth.count({ where }),
    ]);

    return { records, total };
  }

  /**
   * Batch calculate health scores
   */
  async batchCalculateHealth(organizationId: string, limit: number = 100) {
    const leads = await prisma.lead.findMany({
      where: {
        organizationId,
        isConverted: true, // Only for converted leads (customers)
        OR: [
          { customerHealth: null },
          { customerHealth: { calculatedAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } },
        ],
      },
      take: limit,
    });

    const results = [];
    for (const lead of leads) {
      try {
        const health = await this.calculateHealthScore(lead.id, organizationId);
        results.push({ leadId: lead.id, success: true, ...health });
      } catch (error) {
        results.push({ leadId: lead.id, success: false, error: (error as Error).message });
      }
    }

    return { processed: results.length, results };
  }
}

export const customerHealthService = new CustomerHealthService();
