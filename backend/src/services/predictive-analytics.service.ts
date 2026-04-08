/**
 * Predictive Analytics Service
 * ML-based lead conversion prediction, churn prediction, and customer LTV calculations
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Feature weights for scoring (simulated ML model)
const CONVERSION_WEIGHTS = {
  engagement: 0.25,
  recency: 0.20,
  source_quality: 0.15,
  demographic_fit: 0.15,
  behavior_signals: 0.15,
  response_time: 0.10,
};

const SOURCE_QUALITY_SCORES: Record<string, number> = {
  REFERRAL: 90,
  ORGANIC: 80,
  WEBSITE: 75,
  SOCIAL_MEDIA: 70,
  PAID_ADS: 60,
  COLD_CALL: 40,
  MANUAL: 50,
  IMPORT: 45,
  API: 55,
};

class PredictiveAnalyticsService {
  /**
   * Calculate conversion probability for a lead
   */
  async calculateConversionScore(leadId: string, organizationId: string): Promise<{
    conversionScore: number;
    factors: Record<string, any>;
    nextBestAction: string;
  }> {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        callLogs: { orderBy: { createdAt: 'desc' }, take: 10 },
        activities: { orderBy: { createdAt: 'desc' }, take: 20 },
        assignments: { where: { isActive: true } },
      },
    });

    if (!lead) throw new Error('Lead not found');

    const factors: Record<string, any> = {};

    // 1. Engagement Score (based on activities and calls)
    const totalActivities = lead.activities.length;
    const totalCalls = lead.callLogs.length;
    const engagementScore = Math.min(100, (totalActivities * 5) + (totalCalls * 10));
    factors.engagement = { score: engagementScore, activities: totalActivities, calls: totalCalls };

    // 2. Recency Score (days since last contact)
    const daysSinceContact = lead.lastContactedAt
      ? Math.floor((Date.now() - lead.lastContactedAt.getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    const recencyScore = daysSinceContact <= 1 ? 100 : daysSinceContact <= 7 ? 80 : daysSinceContact <= 30 ? 50 : 20;
    factors.recency = { score: recencyScore, daysSinceContact };

    // 3. Source Quality Score
    const sourceScore = SOURCE_QUALITY_SCORES[lead.source] || 50;
    factors.sourceQuality = { score: sourceScore, source: lead.source };

    // 4. Demographic Fit (based on completeness of profile)
    const fieldsCompleted = [lead.email, lead.phone, lead.city, lead.companyName, lead.jobTitle].filter(Boolean).length;
    const demographicScore = (fieldsCompleted / 5) * 100;
    factors.demographicFit = { score: demographicScore, fieldsCompleted };

    // 5. Behavior Signals (page views, form fills, etc.)
    const behaviorScore = Math.min(100, (lead.totalPageViews || 0) * 5);
    factors.behaviorSignals = { score: behaviorScore, pageViews: lead.totalPageViews };

    // 6. Response Time Score (how quickly we responded)
    const responseScore = lead.responseTimeMs
      ? lead.responseTimeMs < 300000 ? 100 : lead.responseTimeMs < 3600000 ? 70 : 40
      : 50;
    factors.responseTime = { score: responseScore, responseTimeMs: lead.responseTimeMs };

    // Calculate weighted average
    const conversionScore = Math.round(
      (engagementScore * CONVERSION_WEIGHTS.engagement) +
      (recencyScore * CONVERSION_WEIGHTS.recency) +
      (sourceScore * CONVERSION_WEIGHTS.source_quality) +
      (demographicScore * CONVERSION_WEIGHTS.demographic_fit) +
      (behaviorScore * CONVERSION_WEIGHTS.behavior_signals) +
      (responseScore * CONVERSION_WEIGHTS.response_time)
    );

    // Determine next best action
    let nextBestAction = 'Follow up with a call';
    if (recencyScore < 50) nextBestAction = 'Re-engage with personalized email';
    else if (engagementScore > 70 && conversionScore > 60) nextBestAction = 'Schedule demo/meeting';
    else if (demographicScore < 50) nextBestAction = 'Enrich lead profile';
    else if (conversionScore < 40) nextBestAction = 'Nurture with content sequence';

    // Store the prediction
    await prisma.leadPrediction.upsert({
      where: { leadId },
      update: {
        conversionScore,
        factors,
        nextBestAction,
        calculatedAt: new Date(),
      },
      create: {
        organizationId,
        leadId,
        conversionScore,
        factors,
        nextBestAction,
        modelVersion: 'v1',
        confidence: 0.75,
      },
    });

    return { conversionScore, factors, nextBestAction };
  }

  /**
   * Calculate churn risk for a customer
   */
  async calculateChurnRisk(leadId: string, organizationId: string): Promise<{
    churnRisk: number;
    factors: Record<string, any>;
  }> {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        callLogs: { orderBy: { createdAt: 'desc' }, take: 10 },
        activities: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });

    if (!lead) throw new Error('Lead not found');

    const factors: Record<string, any> = {};

    // 1. Activity Decline
    const recentActivities = lead.activities.filter(a =>
      a.createdAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ).length;
    const activityDeclineRisk = recentActivities === 0 ? 80 : recentActivities < 3 ? 50 : 20;
    factors.activityDecline = { risk: activityDeclineRisk, recentActivities };

    // 2. Engagement Drop
    const daysSinceEngagement = lead.lastEngagementAt
      ? Math.floor((Date.now() - lead.lastEngagementAt.getTime()) / (1000 * 60 * 60 * 24))
      : 90;
    const engagementDropRisk = daysSinceEngagement > 60 ? 90 : daysSinceEngagement > 30 ? 60 : daysSinceEngagement > 14 ? 30 : 10;
    factors.engagementDrop = { risk: engagementDropRisk, daysSinceEngagement };

    // 3. Payment Issues (if applicable)
    const paymentRisk = lead.paymentStatus === 'overdue' ? 90 : lead.paymentStatus === 'pending' ? 40 : 10;
    factors.paymentIssues = { risk: paymentRisk, status: lead.paymentStatus };

    // 4. Support Interaction Sentiment (placeholder for sentiment integration)
    const supportRisk = 30; // Default medium-low
    factors.supportSentiment = { risk: supportRisk };

    // Calculate overall churn risk
    const churnRisk = Math.round(
      (activityDeclineRisk * 0.3) +
      (engagementDropRisk * 0.35) +
      (paymentRisk * 0.25) +
      (supportRisk * 0.1)
    );

    // Update prediction
    await prisma.leadPrediction.upsert({
      where: { leadId },
      update: { churnRisk, calculatedAt: new Date() },
      create: {
        organizationId,
        leadId,
        conversionScore: 0,
        churnRisk,
        factors,
        modelVersion: 'v1',
      },
    });

    return { churnRisk, factors };
  }

  /**
   * Calculate Customer Lifetime Value
   */
  async calculateLTV(leadId: string, organizationId: string): Promise<{
    lifetimeValue: number;
    segment: string;
    details: Record<string, any>;
  }> {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) throw new Error('Lead not found');

    // Calculate historical value
    const payments = await prisma.payment.findMany({
      where: { leadId, status: 'COMPLETED' },
    });

    const historicalValue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalTransactions = payments.length;
    const avgOrderValue = totalTransactions > 0 ? historicalValue / totalTransactions : 0;

    // Estimate future value (simplified model)
    const avgLifespanMonths = 24; // Average customer lifespan
    const purchaseFrequency = totalTransactions > 0 ? totalTransactions / 12 : 0.5; // Per year
    const predictedValue = avgOrderValue * purchaseFrequency * (avgLifespanMonths / 12);

    const lifetimeValue = historicalValue + predictedValue;

    // Determine segment
    let segment = 'Low Value';
    if (lifetimeValue > 100000) segment = 'High Value';
    else if (lifetimeValue > 30000) segment = 'Medium Value';

    // Calculate LTV to CAC ratio (assuming avg CAC)
    const acquisitionCost = 5000; // Default CAC
    const ltvCacRatio = lifetimeValue / acquisitionCost;

    // Store LTV data
    await prisma.customerLTV.upsert({
      where: { leadId },
      update: {
        historicalValue,
        predictedValue,
        lifetimeValue,
        avgOrderValue,
        purchaseFrequency,
        customerLifespan: avgLifespanMonths,
        acquisitionCost,
        ltvCacRatio,
        segment,
        totalTransactions,
        calculatedAt: new Date(),
      },
      create: {
        organizationId,
        leadId,
        historicalValue,
        predictedValue,
        lifetimeValue,
        avgOrderValue,
        purchaseFrequency,
        customerLifespan: avgLifespanMonths,
        acquisitionCost,
        ltvCacRatio,
        segment,
        totalTransactions,
      },
    });

    return {
      lifetimeValue,
      segment,
      details: {
        historicalValue,
        predictedValue,
        avgOrderValue,
        totalTransactions,
        ltvCacRatio,
      },
    };
  }

  /**
   * Get prediction for a lead
   */
  async getLeadPrediction(leadId: string) {
    return prisma.leadPrediction.findUnique({
      where: { leadId },
    });
  }

  /**
   * Get LTV for a lead
   */
  async getLeadLTV(leadId: string) {
    return prisma.customerLTV.findUnique({
      where: { leadId },
    });
  }

  /**
   * Get predictions dashboard data
   */
  async getDashboardData(organizationId: string) {
    const [
      highConversionLeads,
      highChurnRiskLeads,
      highValueCustomers,
      conversionDistribution,
      ltvDistribution,
    ] = await Promise.all([
      // Top leads by conversion score
      prisma.leadPrediction.findMany({
        where: { organizationId, conversionScore: { gte: 70 } },
        orderBy: { conversionScore: 'desc' },
        take: 10,
        include: { lead: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } } },
      }),
      // High churn risk leads
      prisma.leadPrediction.findMany({
        where: { organizationId, churnRisk: { gte: 60 } },
        orderBy: { churnRisk: 'desc' },
        take: 10,
        include: { lead: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } } },
      }),
      // High value customers
      prisma.customerLTV.findMany({
        where: { organizationId, segment: 'High Value' },
        orderBy: { lifetimeValue: 'desc' },
        take: 10,
        include: { lead: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } } },
      }),
      // Conversion score distribution
      prisma.leadPrediction.groupBy({
        by: ['organizationId'],
        where: { organizationId },
        _count: true,
        _avg: { conversionScore: true, churnRisk: true },
      }),
      // LTV segment distribution
      prisma.customerLTV.groupBy({
        by: ['segment'],
        where: { organizationId },
        _count: true,
        _sum: { lifetimeValue: true },
      }),
    ]);

    return {
      highConversionLeads,
      highChurnRiskLeads,
      highValueCustomers,
      conversionDistribution: conversionDistribution[0] || { _count: 0, _avg: { conversionScore: 0, churnRisk: 0 } },
      ltvDistribution,
    };
  }

  /**
   * Batch calculate predictions for organization
   */
  async batchCalculatePredictions(organizationId: string, limit: number = 100) {
    const leads = await prisma.lead.findMany({
      where: {
        organizationId,
        OR: [
          { prediction: null },
          { prediction: { calculatedAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
        ],
      },
      take: limit,
    });

    const results = [];
    for (const lead of leads) {
      try {
        const prediction = await this.calculateConversionScore(lead.id, organizationId);
        results.push({ leadId: lead.id, success: true, ...prediction });
      } catch (error) {
        results.push({ leadId: lead.id, success: false, error: (error as Error).message });
      }
    }

    return { processed: results.length, results };
  }
}

export const predictiveAnalyticsService = new PredictiveAnalyticsService();
