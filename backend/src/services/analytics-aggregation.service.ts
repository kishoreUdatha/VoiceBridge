/**
 * Analytics Aggregation Service - Single Responsibility Principle
 * Handles analytics data aggregation and retrieval
 */

import { prisma } from '../config/database';


/**
 * Aggregate daily statistics for an organization
 */
export async function aggregateDailyStats(organizationId: string, date: Date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Get all calls for the day
  const calls = await prisma.outboundCall.findMany({
    where: {
      agent: { organizationId },
      createdAt: { gte: startOfDay, lte: endOfDay },
    },
  });

  const totalCalls = calls.length;
  const answeredCalls = calls.filter(c => c.status === 'COMPLETED' && c.duration && c.duration > 0).length;
  const missedCalls = calls.filter(c => ['NO_ANSWER', 'BUSY', 'FAILED'].includes(c.status)).length;
  const totalDuration = calls.reduce((sum, c) => sum + (c.duration || 0), 0);

  const outcomes = {
    interested: calls.filter(c => c.outcome === 'INTERESTED').length,
    notInterested: calls.filter(c => c.outcome === 'NOT_INTERESTED').length,
    callbacks: calls.filter(c => c.outcome === 'CALLBACK_REQUESTED').length,
    converted: calls.filter(c => c.outcome === 'CONVERTED').length,
  };

  const sentiment = {
    positive: calls.filter(c => c.sentiment === 'positive').length,
    neutral: calls.filter(c => c.sentiment === 'neutral').length,
    negative: calls.filter(c => c.sentiment === 'negative').length,
  };

  const leadsGenerated = calls.filter(c => c.leadGenerated).length;

  await prisma.analyticsDaily.upsert({
    where: {
      organizationId_agentId_date: {
        organizationId,
        agentId: null as any,
        date: startOfDay,
      },
    },
    create: {
      organizationId,
      date: startOfDay,
      totalCalls,
      answeredCalls,
      missedCalls,
      totalDuration,
      avgDuration: answeredCalls > 0 ? Math.round(totalDuration / answeredCalls) : 0,
      ...outcomes,
      leadsGenerated,
      positiveCount: sentiment.positive,
      neutralCount: sentiment.neutral,
      negativeCount: sentiment.negative,
      answerRate: totalCalls > 0 ? (answeredCalls / totalCalls) * 100 : 0,
      conversionRate: answeredCalls > 0 ? (outcomes.converted / answeredCalls) * 100 : 0,
    },
    update: {
      totalCalls,
      answeredCalls,
      missedCalls,
      totalDuration,
      avgDuration: answeredCalls > 0 ? Math.round(totalDuration / answeredCalls) : 0,
      ...outcomes,
      leadsGenerated,
      positiveCount: sentiment.positive,
      neutralCount: sentiment.neutral,
      negativeCount: sentiment.negative,
      answerRate: totalCalls > 0 ? (answeredCalls / totalCalls) * 100 : 0,
      conversionRate: answeredCalls > 0 ? (outcomes.converted / answeredCalls) * 100 : 0,
    },
  });
}

/**
 * Get analytics for a time period
 */
export async function getAnalytics(organizationId: string, days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const dailyStats = await prisma.analyticsDaily.findMany({
    where: {
      organizationId,
      date: { gte: startDate },
    },
    orderBy: { date: 'asc' },
  });

  // Calculate totals
  const totals = dailyStats.reduce(
    (acc, day) => ({
      totalCalls: acc.totalCalls + day.totalCalls,
      answeredCalls: acc.answeredCalls + day.answeredCalls,
      missedCalls: acc.missedCalls + day.missedCalls,
      totalDuration: acc.totalDuration + day.totalDuration,
      interested: acc.interested + day.interested,
      notInterested: acc.notInterested + day.notInterested,
      callbacks: acc.callbacks + day.callbacks,
      converted: acc.converted + day.converted,
      leadsGenerated: acc.leadsGenerated + day.leadsGenerated,
      positive: acc.positive + day.positiveCount,
      neutral: acc.neutral + day.neutralCount,
      negative: acc.negative + day.negativeCount,
    }),
    {
      totalCalls: 0,
      answeredCalls: 0,
      missedCalls: 0,
      totalDuration: 0,
      interested: 0,
      notInterested: 0,
      callbacks: 0,
      converted: 0,
      leadsGenerated: 0,
      positive: 0,
      neutral: 0,
      negative: 0,
    }
  );

  return {
    period: { days, startDate, endDate: new Date() },
    totals: {
      ...totals,
      avgDuration: totals.answeredCalls > 0 ? Math.round(totals.totalDuration / totals.answeredCalls) : 0,
      answerRate: totals.totalCalls > 0 ? ((totals.answeredCalls / totals.totalCalls) * 100).toFixed(1) : 0,
      conversionRate: totals.answeredCalls > 0 ? ((totals.converted / totals.answeredCalls) * 100).toFixed(1) : 0,
    },
    dailyStats: dailyStats.map(d => ({
      date: d.date.toISOString().split('T')[0],
      calls: d.totalCalls,
      answered: d.answeredCalls,
      converted: d.converted,
      leads: d.leadsGenerated,
    })),
    outcomeBreakdown: {
      interested: totals.interested,
      notInterested: totals.notInterested,
      callbacks: totals.callbacks,
      converted: totals.converted,
    },
    sentimentBreakdown: {
      positive: totals.positive,
      neutral: totals.neutral,
      negative: totals.negative,
    },
  };
}

/**
 * Get agent-specific analytics
 */
export async function getAgentAnalytics(organizationId: string, agentId: string, days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const calls = await prisma.outboundCall.findMany({
    where: {
      agentId,
      createdAt: { gte: startDate },
    },
    select: {
      status: true,
      duration: true,
      outcome: true,
      sentiment: true,
      leadGenerated: true,
    },
  });

  const totalCalls = calls.length;
  const answeredCalls = calls.filter(c => c.status === 'COMPLETED').length;
  const totalDuration = calls.reduce((sum, c) => sum + (c.duration || 0), 0);

  return {
    totalCalls,
    answeredCalls,
    avgDuration: answeredCalls > 0 ? Math.round(totalDuration / answeredCalls) : 0,
    answerRate: totalCalls > 0 ? ((answeredCalls / totalCalls) * 100).toFixed(1) : 0,
    outcomes: {
      interested: calls.filter(c => c.outcome === 'INTERESTED').length,
      notInterested: calls.filter(c => c.outcome === 'NOT_INTERESTED').length,
      callbacks: calls.filter(c => c.outcome === 'CALLBACK_REQUESTED').length,
      converted: calls.filter(c => c.outcome === 'CONVERTED').length,
    },
    sentiment: {
      positive: calls.filter(c => c.sentiment === 'positive').length,
      neutral: calls.filter(c => c.sentiment === 'neutral').length,
      negative: calls.filter(c => c.sentiment === 'negative').length,
    },
    leadsGenerated: calls.filter(c => c.leadGenerated).length,
  };
}

/**
 * Run daily aggregation for all organizations
 */
export async function runDailyAggregation() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const organizations = await prisma.organization.findMany({
    select: { id: true },
  });

  for (const org of organizations) {
    try {
      await aggregateDailyStats(org.id, yesterday);
    } catch (error) {
      console.error(`Failed to aggregate stats for org ${org.id}:`, error);
    }
  }
}

export const analyticsAggregationService = {
  aggregateDailyStats,
  getAnalytics,
  getAgentAnalytics,
  runDailyAggregation,
};

export default analyticsAggregationService;
