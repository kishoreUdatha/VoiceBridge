import { CallOutcome } from '@prisma/client';
import { prisma } from '../config/database';

// ==================== TYPES ====================

interface FunnelStage {
  name: string;
  order: number;
}

interface TrackFunnelEventParams {
  organizationId: string;
  leadId?: string;
  funnelName?: string;
  stageName: string;
  stageOrder: number;
  sourceCallId?: string;
  sourceAgentId?: string;
  previousStage?: string;
  metadata?: any;
}

interface FunnelAnalyticsOptions {
  startDate?: Date;
  endDate?: Date;
}

interface LeaderboardOptions {
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

// ==================== DEFAULT FUNNEL STAGES ====================

const DEFAULT_SALES_FUNNEL: FunnelStage[] = [
  { name: 'lead', order: 1 },
  { name: 'contacted', order: 2 },
  { name: 'qualified', order: 3 },
  { name: 'appointment', order: 4 },
  { name: 'payment', order: 5 },
  { name: 'converted', order: 6 },
];

// ==================== CALL ANALYTICS SERVICE ====================

class CallAnalyticsService {
  // ==================== FUNNEL TRACKING ====================

  /**
   * Track a funnel stage transition
   */
  async trackFunnelEvent(params: TrackFunnelEventParams) {
    // Close previous stage if exists
    if (params.previousStage && params.leadId) {
      await prisma.funnelEvent.updateMany({
        where: {
          organizationId: params.organizationId,
          leadId: params.leadId,
          funnelName: params.funnelName || 'sales',
          stageName: params.previousStage,
          exitedAt: null,
        },
        data: {
          exitedAt: new Date(),
        },
      });
    }

    // Create new funnel event
    return prisma.funnelEvent.create({
      data: {
        organizationId: params.organizationId,
        leadId: params.leadId,
        funnelName: params.funnelName || 'sales',
        stageName: params.stageName,
        stageOrder: params.stageOrder,
        sourceCallId: params.sourceCallId,
        sourceAgentId: params.sourceAgentId,
        previousStage: params.previousStage,
        metadata: params.metadata,
      },
    });
  }

  /**
   * Get funnel analytics for an organization
   * Uses real Lead data grouped by LeadStage
   */
  async getFunnelAnalytics(
    organizationId: string,
    funnelName: string = 'sales',
    options: FunnelAnalyticsOptions = {}
  ) {
    const { startDate, endDate } = options;

    // First, try to get data from FunnelEvent table
    const funnelEventWhere: any = {
      organizationId,
      funnelName,
    };

    if (startDate || endDate) {
      funnelEventWhere.enteredAt = {};
      if (startDate) funnelEventWhere.enteredAt.gte = startDate;
      if (endDate) funnelEventWhere.enteredAt.lte = endDate;
    }

    const stageCounts = await prisma.funnelEvent.groupBy({
      by: ['stageName', 'stageOrder'],
      where: funnelEventWhere,
      _count: { id: true },
      orderBy: { stageOrder: 'asc' },
    });

    // If FunnelEvent has data, use it
    if (stageCounts.length > 0) {
      interface StageData { name: string; order: number; count: number }
      const stages: StageData[] = stageCounts.map((s: typeof stageCounts[0]) => ({
        name: s.stageName,
        order: s.stageOrder,
        count: s._count.id,
      }));

      const funnelData = stages.map((stage: StageData, index: number) => {
        const previousStage = index > 0 ? stages[index - 1] : null;
        const conversionRate = previousStage
          ? previousStage.count > 0
            ? (stage.count / previousStage.count) * 100
            : 0
          : 100;

        return {
          ...stage,
          conversionRate: Math.round(conversionRate * 100) / 100,
          dropoffRate: Math.round((100 - conversionRate) * 100) / 100,
        };
      });

      const firstStage = funnelData[0];
      const lastStage = funnelData[funnelData.length - 1];
      const overallConversion = firstStage && lastStage && firstStage.count > 0
        ? (lastStage.count / firstStage.count) * 100
        : 0;

      return {
        funnelName,
        period: { startDate, endDate },
        stages: funnelData,
        totalLeads: firstStage?.count || 0,
        totalConverted: lastStage?.count || 0,
        overallConversionRate: Math.round(overallConversion * 100) / 100,
      };
    }

    // Fallback: Get real funnel data from Leads grouped by LeadStage
    return this.getFunnelFromLeads(organizationId, startDate, endDate);
  }

  /**
   * Get funnel data from actual Leads grouped by their LeadStage
   */
  private async getFunnelFromLeads(
    organizationId: string,
    startDate?: Date,
    endDate?: Date
  ) {
    // Get all lead stages for the organization, ordered
    const leadStages = await prisma.leadStage.findMany({
      where: { organizationId, isActive: true },
      orderBy: { order: 'asc' },
    });

    // If no stages defined, create default ones
    if (leadStages.length === 0) {
      // Return default funnel structure
      const defaultStages = DEFAULT_SALES_FUNNEL.map((stage, index) => ({
        name: stage.name,
        order: stage.order,
        count: 0,
        conversionRate: index === 0 ? 100 : 0,
        dropoffRate: index === 0 ? 0 : 100,
      }));

      return {
        funnelName: 'sales',
        period: { startDate, endDate },
        stages: defaultStages,
        totalLeads: 0,
        totalConverted: 0,
        overallConversionRate: 0,
      };
    }

    // Build where clause for leads
    const leadWhere: any = { organizationId };
    if (startDate || endDate) {
      leadWhere.createdAt = {};
      if (startDate) leadWhere.createdAt.gte = startDate;
      if (endDate) leadWhere.createdAt.lte = endDate;
    }

    // Get lead counts by stage
    const leadsByStage = await prisma.lead.groupBy({
      by: ['stageId'],
      where: leadWhere,
      _count: { id: true },
    });

    // Also count leads with no stage (new leads)
    const leadsWithNoStage = await prisma.lead.count({
      where: { ...leadWhere, stageId: null },
    });

    // Map stage counts
    const stageCountMap: Record<string, number> = {};
    leadsByStage.forEach((item) => {
      if (item.stageId) {
        stageCountMap[item.stageId] = item._count.id;
      }
    });

    // Build stages array with counts
    interface StageData { name: string; order: number; count: number }
    const stages: StageData[] = leadStages.map((stage) => ({
      name: stage.slug || stage.name.toLowerCase().replace(/\s+/g, '_'),
      order: stage.order,
      count: stageCountMap[stage.id] || 0,
    }));

    // Add "new" stage at the beginning for leads without a stage
    if (leadsWithNoStage > 0 || stages.length === 0 || stages[0].name !== 'new') {
      const existingNewStage = stages.find(s => s.name === 'new');
      if (existingNewStage) {
        existingNewStage.count += leadsWithNoStage;
      } else {
        stages.unshift({
          name: 'new',
          order: 0,
          count: leadsWithNoStage,
        });
      }
    }

    // Sort by order
    stages.sort((a, b) => a.order - b.order);

    // Calculate total leads (sum of all stages)
    const totalLeads = stages.reduce((sum, s) => sum + s.count, 0);

    // Calculate conversion rates - use cumulative approach
    // First stage should show total leads entering the funnel
    // Subsequent stages show how many progressed to that stage

    // For a proper funnel, we need cumulative counts from top
    // Leads at stage N means they've passed through stages 1 to N-1
    let cumulativeCount = totalLeads;

    const funnelData = stages.map((stage, index) => {
      // For first stage, count is total leads
      // For subsequent stages, it's the count at that stage plus all stages after
      const stageCount = index === 0
        ? totalLeads
        : stages.slice(index).reduce((sum, s) => sum + s.count, 0);

      const previousCount = index > 0 ?
        stages.slice(index - 1).reduce((sum, s) => sum + s.count, 0) : totalLeads;

      const conversionRate = previousCount > 0 && index > 0
        ? (stageCount / previousCount) * 100
        : 100;

      return {
        name: stage.name,
        order: stage.order,
        count: stageCount,
        conversionRate: Math.round(conversionRate * 100) / 100,
        dropoffRate: Math.round((100 - conversionRate) * 100) / 100,
      };
    });

    // Get converted count (last stage or stages marked as won/converted)
    const lastStage = funnelData[funnelData.length - 1];
    const convertedCount = lastStage?.count || 0;

    const overallConversion = totalLeads > 0
      ? (convertedCount / totalLeads) * 100
      : 0;

    return {
      funnelName: 'sales',
      period: { startDate, endDate },
      stages: funnelData,
      totalLeads,
      totalConverted: convertedCount,
      overallConversionRate: Math.round(overallConversion * 100) / 100,
    };
  }

  /**
   * Get lead journey through funnel
   */
  async getLeadJourney(leadId: string, funnelName: string = 'sales') {
    const events = await prisma.funnelEvent.findMany({
      where: { leadId, funnelName },
      orderBy: { enteredAt: 'asc' },
    });

    return events.map(event => ({
      stage: event.stageName,
      order: event.stageOrder,
      enteredAt: event.enteredAt,
      exitedAt: event.exitedAt,
      duration: event.exitedAt
        ? Math.round((event.exitedAt.getTime() - event.enteredAt.getTime()) / 1000 / 60)
        : null,
      sourceCallId: event.sourceCallId,
      metadata: event.metadata,
    }));
  }

  // ==================== AGENT PERFORMANCE ====================

  /**
   * Aggregate daily performance for all agents
   */
  async aggregateDailyPerformance(organizationId: string, date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all voice agents for the organization
    const agents = await prisma.voiceAgent.findMany({
      where: { organizationId, isActive: true },
      select: { id: true, name: true },
    });

    for (const agent of agents) {
      // Get all calls for this agent on this day
      const calls = await prisma.outboundCall.findMany({
        where: {
          agentId: agent.id,
          createdAt: { gte: startOfDay, lte: endOfDay },
        },
      });

      const totalCalls = calls.length;
      const answeredCalls = calls.filter(c => c.status === 'COMPLETED' && c.duration && c.duration > 0).length;
      const totalDuration = calls.reduce((sum, c) => sum + (c.duration || 0), 0);

      // Count outcomes
      const interestedCount = calls.filter(c => c.outcome === 'INTERESTED').length;
      const appointmentsBooked = calls.filter(c => c.outcome === 'APPOINTMENT_BOOKED').length;
      const paymentsCollected = calls.filter(c => c.outcome === 'PAYMENT_COLLECTED').length;
      const leadsGenerated = calls.filter(c => c.leadGenerated).length;
      const callbacksRequested = calls.filter(c => c.outcome === 'CALLBACK_REQUESTED').length;

      // Sentiment counts
      const positiveCallsCount = calls.filter(c => c.sentiment === 'positive').length;
      const negativeCallsCount = calls.filter(c => c.sentiment === 'negative').length;

      // Calculate averages
      const avgCallDuration = answeredCalls > 0 ? Math.round(totalDuration / answeredCalls) : 0;
      const conversionRate = answeredCalls > 0 ? (interestedCount / answeredCalls) * 100 : 0;
      const answerRate = totalCalls > 0 ? (answeredCalls / totalCalls) * 100 : 0;

      // Calculate sentiment score (-1 to 1)
      const sentimentTotal = positiveCallsCount - negativeCallsCount;
      const avgSentimentScore = answeredCalls > 0 ? sentimentTotal / answeredCalls : 0;

      // Upsert the daily performance record
      await prisma.agentPerformanceDaily.upsert({
        where: {
          organizationId_agentId_date: {
            organizationId,
            agentId: agent.id,
            date: startOfDay,
          },
        },
        create: {
          organizationId,
          agentId: agent.id,
          agentName: agent.name,
          date: startOfDay,
          totalCalls,
          answeredCalls,
          avgCallDuration,
          totalTalkTime: totalDuration,
          interestedCount,
          appointmentsBooked,
          paymentsCollected,
          leadsGenerated,
          callbacksRequested,
          avgSentimentScore,
          positiveCallsCount,
          negativeCallsCount,
          conversionRate,
          answerRate,
        },
        update: {
          agentName: agent.name,
          totalCalls,
          answeredCalls,
          avgCallDuration,
          totalTalkTime: totalDuration,
          interestedCount,
          appointmentsBooked,
          paymentsCollected,
          leadsGenerated,
          callbacksRequested,
          avgSentimentScore,
          positiveCallsCount,
          negativeCallsCount,
          conversionRate,
          answerRate,
        },
      });
    }

    return { success: true, agentsProcessed: agents.length };
  }

  /**
   * Get agent leaderboard
   */
  async getAgentLeaderboard(
    organizationId: string,
    metric: 'calls' | 'conversions' | 'appointments' | 'payments' | 'sentiment' = 'calls',
    options: LeaderboardOptions = {}
  ) {
    const { startDate, endDate, limit = 10 } = options;

    // Default to last 30 days
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);

    const where: any = {
      organizationId,
      date: {
        gte: startDate || defaultStartDate,
        lte: endDate || new Date(),
      },
    };

    // Aggregate performance data
    const performance = await prisma.agentPerformanceDaily.groupBy({
      by: ['agentId', 'agentName'],
      where,
      _sum: {
        totalCalls: true,
        answeredCalls: true,
        interestedCount: true,
        appointmentsBooked: true,
        paymentsCollected: true,
        paymentsAmount: true,
        totalTalkTime: true,
        positiveCallsCount: true,
        negativeCallsCount: true,
      },
      _avg: {
        conversionRate: true,
        answerRate: true,
        avgSentimentScore: true,
      },
    });

    // Sort by the selected metric
    type PerformanceItem = typeof performance[0];
    const sortedPerformance = performance.sort((a: PerformanceItem, b: PerformanceItem) => {
      switch (metric) {
        case 'calls':
          return (b._sum.totalCalls || 0) - (a._sum.totalCalls || 0);
        case 'conversions':
          return (b._sum.interestedCount || 0) - (a._sum.interestedCount || 0);
        case 'appointments':
          return (b._sum.appointmentsBooked || 0) - (a._sum.appointmentsBooked || 0);
        case 'payments':
          return (b._sum.paymentsCollected || 0) - (a._sum.paymentsCollected || 0);
        case 'sentiment':
          return (b._avg.avgSentimentScore || 0) - (a._avg.avgSentimentScore || 0);
        default:
          return (b._sum.totalCalls || 0) - (a._sum.totalCalls || 0);
      }
    });

    return sortedPerformance.slice(0, limit).map((agent: PerformanceItem, index: number) => ({
      rank: index + 1,
      agentId: agent.agentId,
      agentName: agent.agentName,
      metrics: {
        totalCalls: agent._sum.totalCalls || 0,
        answeredCalls: agent._sum.answeredCalls || 0,
        interestedCount: agent._sum.interestedCount || 0,
        appointmentsBooked: agent._sum.appointmentsBooked || 0,
        paymentsCollected: agent._sum.paymentsCollected || 0,
        paymentsAmount: agent._sum.paymentsAmount || 0,
        totalTalkTime: agent._sum.totalTalkTime || 0,
        avgConversionRate: Math.round((agent._avg.conversionRate || 0) * 100) / 100,
        avgAnswerRate: Math.round((agent._avg.answerRate || 0) * 100) / 100,
        avgSentimentScore: Math.round((agent._avg.avgSentimentScore || 0) * 100) / 100,
      },
    }));
  }

  /**
   * Get performance for a specific agent
   */
  async getAgentPerformance(agentId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const dailyData = await prisma.agentPerformanceDaily.findMany({
      where: {
        agentId,
        date: { gte: startDate },
      },
      orderBy: { date: 'asc' },
    });

    // Calculate totals
    interface DailyTotals {
      totalCalls: number;
      answeredCalls: number;
      interestedCount: number;
      appointmentsBooked: number;
      paymentsCollected: number;
      totalTalkTime: number;
    }
    type DailyDataItem = typeof dailyData[0];
    const totals = dailyData.reduce(
      (acc: DailyTotals, day: DailyDataItem) => ({
        totalCalls: acc.totalCalls + day.totalCalls,
        answeredCalls: acc.answeredCalls + day.answeredCalls,
        interestedCount: acc.interestedCount + day.interestedCount,
        appointmentsBooked: acc.appointmentsBooked + day.appointmentsBooked,
        paymentsCollected: acc.paymentsCollected + day.paymentsCollected,
        totalTalkTime: acc.totalTalkTime + day.totalTalkTime,
      }),
      {
        totalCalls: 0,
        answeredCalls: 0,
        interestedCount: 0,
        appointmentsBooked: 0,
        paymentsCollected: 0,
        totalTalkTime: 0,
      }
    );

    return {
      agentId,
      period: { days, startDate, endDate: new Date() },
      totals,
      averages: {
        callsPerDay: Math.round(totals.totalCalls / days),
        conversionRate: totals.answeredCalls > 0
          ? Math.round((totals.interestedCount / totals.answeredCalls) * 10000) / 100
          : 0,
        answerRate: totals.totalCalls > 0
          ? Math.round((totals.answeredCalls / totals.totalCalls) * 10000) / 100
          : 0,
      },
      dailyTrend: dailyData.map((d: DailyDataItem) => ({
        date: d.date.toISOString().split('T')[0],
        calls: d.totalCalls,
        answered: d.answeredCalls,
        interested: d.interestedCount,
        appointments: d.appointmentsBooked,
        conversionRate: d.conversionRate,
      })),
    };
  }

  // ==================== OUTCOME ANALYTICS ====================

  /**
   * Get outcome distribution
   */
  async getOutcomeDistribution(organizationId: string, options: {
    startDate?: Date;
    endDate?: Date;
    agentId?: string;
  } = {}) {
    const { startDate, endDate, agentId } = options;

    // Default to last 30 days
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);

    const where: any = {
      agent: { organizationId },
      createdAt: {
        gte: startDate || defaultStartDate,
        lte: endDate || new Date(),
      },
    };

    if (agentId) where.agentId = agentId;

    const outcomes = await prisma.outboundCall.groupBy({
      by: ['outcome'],
      where,
      _count: { id: true },
    });

    type OutcomeItem = typeof outcomes[0];
    const total = outcomes.reduce((sum: number, o: OutcomeItem) => sum + o._count.id, 0);

    return {
      period: { startDate: startDate || defaultStartDate, endDate: endDate || new Date() },
      total,
      distribution: outcomes.map((o: OutcomeItem) => ({
        outcome: o.outcome,
        count: o._count.id,
        percentage: total > 0 ? Math.round((o._count.id / total) * 10000) / 100 : 0,
      })),
    };
  }

  /**
   * Get outcome trends over time
   */
  async getOutcomeTrends(organizationId: string, days: number = 30, options: {
    agentId?: string;
    outcomes?: CallOutcome[];
  } = {}) {
    const { agentId, outcomes } = options;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const where: any = {
      agent: { organizationId },
      createdAt: { gte: startDate },
    };

    if (agentId) where.agentId = agentId;
    if (outcomes && outcomes.length > 0) where.outcome = { in: outcomes };

    const calls = await prisma.outboundCall.findMany({
      where,
      select: {
        outcome: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date and outcome
    type CallItem = typeof calls[0];
    const dailyData: Record<string, Record<string, number>> = {};

    calls.forEach((call: CallItem) => {
      const date = call.createdAt.toISOString().split('T')[0];
      const outcome = call.outcome || 'UNKNOWN';

      if (!dailyData[date]) dailyData[date] = {};
      if (!dailyData[date][outcome]) dailyData[date][outcome] = 0;
      dailyData[date][outcome]++;
    });

    // Convert to array format
    const trend = Object.entries(dailyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, outcomes]) => ({
        date,
        ...outcomes,
        total: Object.values(outcomes).reduce((sum, count) => sum + count, 0),
      }));

    return {
      period: { days, startDate, endDate: new Date() },
      trend,
    };
  }

  // ==================== LEAD SOURCES ANALYTICS ====================

  /**
   * Get lead sources analytics - Social Media vs AI Voice Agent
   */
  async getLeadSourcesAnalytics(organizationId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Social Media Sources
    const SOCIAL_MEDIA_SOURCES = ['AD_FACEBOOK', 'AD_INSTAGRAM', 'AD_LINKEDIN', 'AD_GOOGLE'];
    // AI Voice Agent Sources
    const AI_VOICE_SOURCES = ['AI_VOICE_AGENT', 'AI_VOICE_INBOUND', 'AI_VOICE_OUTBOUND'];

    // Get all leads grouped by source
    const leadsBySource = await prisma.lead.groupBy({
      by: ['source'],
      where: {
        organizationId,
        createdAt: { gte: startDate },
      },
      _count: { id: true },
    });

    // Get converted leads grouped by source
    const convertedBySource = await prisma.lead.groupBy({
      by: ['source'],
      where: {
        organizationId,
        createdAt: { gte: startDate },
        isConverted: true,
      },
      _count: { id: true },
    });

    // Create a map for converted leads
    type LeadSourceItem = typeof leadsBySource[0];
    type ConvertedSourceItem = typeof convertedBySource[0];
    const convertedMap: Record<string, number> = {};
    convertedBySource.forEach((c: ConvertedSourceItem) => {
      convertedMap[c.source] = c._count.id;
    });

    // Calculate Social Media totals
    let socialMediaTotal = 0;
    let socialMediaConverted = 0;
    const socialMediaByPlatform: Record<string, number> = {};

    leadsBySource.forEach((lead: LeadSourceItem) => {
      if (SOCIAL_MEDIA_SOURCES.includes(lead.source)) {
        socialMediaTotal += lead._count.id;
        socialMediaConverted += convertedMap[lead.source] || 0;
        socialMediaByPlatform[lead.source] = lead._count.id;
      }
    });

    // Calculate AI Voice Agent totals
    let aiVoiceTotal = 0;
    let aiVoiceConverted = 0;
    let aiInbound = 0;
    let aiOutbound = 0;

    leadsBySource.forEach((lead: LeadSourceItem) => {
      if (AI_VOICE_SOURCES.includes(lead.source)) {
        aiVoiceTotal += lead._count.id;
        aiVoiceConverted += convertedMap[lead.source] || 0;
        if (lead.source === 'AI_VOICE_INBOUND') aiInbound = lead._count.id;
        if (lead.source === 'AI_VOICE_OUTBOUND') aiOutbound = lead._count.id;
        if (lead.source === 'AI_VOICE_AGENT') {
          // Split equally for demo if not specific
          aiInbound += Math.floor(lead._count.id / 2);
          aiOutbound += Math.ceil(lead._count.id / 2);
        }
      }
    });

    // Calculate Other sources totals
    let otherTotal = 0;
    let otherConverted = 0;
    const otherBySource: Record<string, number> = {};

    leadsBySource.forEach(lead => {
      if (!SOCIAL_MEDIA_SOURCES.includes(lead.source) && !AI_VOICE_SOURCES.includes(lead.source)) {
        otherTotal += lead._count.id;
        otherConverted += convertedMap[lead.source] || 0;
        otherBySource[lead.source] = lead._count.id;
      }
    });

    // Generate trend data (leads per day)
    const trendData = await prisma.lead.groupBy({
      by: ['createdAt', 'source'],
      where: {
        organizationId,
        createdAt: { gte: startDate },
      },
      _count: { id: true },
    });

    // Process trend data by day
    const socialTrendMap: Record<string, number> = {};
    const aiTrendMap: Record<string, number> = {};

    // Initialize all days
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      socialTrendMap[dateStr] = 0;
      aiTrendMap[dateStr] = 0;
    }

    // Group leads by source per day using raw query for proper date grouping
    const dailyLeads = await prisma.$queryRaw<Array<{ date: Date; source: string; count: bigint }>>`
      SELECT DATE(created_at) as date, source, COUNT(*)::bigint as count
      FROM leads
      WHERE organization_id = ${organizationId}
        AND created_at >= ${startDate}
      GROUP BY DATE(created_at), source
      ORDER BY date ASC
    `;

    dailyLeads.forEach(row => {
      const dateStr = new Date(row.date).toISOString().split('T')[0];
      const count = Number(row.count);
      if (SOCIAL_MEDIA_SOURCES.includes(row.source)) {
        socialTrendMap[dateStr] = (socialTrendMap[dateStr] || 0) + count;
      }
      if (AI_VOICE_SOURCES.includes(row.source)) {
        aiTrendMap[dateStr] = (aiTrendMap[dateStr] || 0) + count;
      }
    });

    const socialTrend = Object.entries(socialTrendMap).map(([date, count]) => ({ date, count }));
    const aiTrend = Object.entries(aiTrendMap).map(([date, count]) => ({ date, count }));

    // Build comparison table
    const comparison = leadsBySource
      .map(lead => ({
        source: lead.source,
        count: lead._count.id,
        converted: convertedMap[lead.source] || 0,
        conversionRate: lead._count.id > 0
          ? Math.round(((convertedMap[lead.source] || 0) / lead._count.id) * 10000) / 100
          : 0,
        avgResponseTime: SOCIAL_MEDIA_SOURCES.includes(lead.source) ? 24 :
          AI_VOICE_SOURCES.includes(lead.source) ? 2 : 12, // Mock response times
        revenue: (convertedMap[lead.source] || 0) * 2500, // Mock revenue per lead
      }))
      .sort((a, b) => b.count - a.count);

    return {
      period: `${days} days`,
      socialMedia: {
        total: socialMediaTotal,
        converted: socialMediaConverted,
        byPlatform: socialMediaByPlatform,
        trend: socialTrend,
      },
      aiVoiceAgent: {
        total: aiVoiceTotal,
        converted: aiVoiceConverted,
        inbound: aiInbound,
        outbound: aiOutbound,
        trend: aiTrend,
      },
      other: {
        total: otherTotal,
        converted: otherConverted,
        bySource: otherBySource,
      },
      comparison,
    };
  }

  // ==================== DASHBOARD DATA ====================

  /**
   * Get combined analytics dashboard data
   */
  async getDashboardData(organizationId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [
      funnelData,
      leaderboard,
      outcomeDistribution,
      outcomeTrends,
      totalCalls,
      todayCalls,
    ] = await Promise.all([
      this.getFunnelAnalytics(organizationId, 'sales', { startDate }),
      this.getAgentLeaderboard(organizationId, 'calls', { startDate, limit: 5 }),
      this.getOutcomeDistribution(organizationId, { startDate }),
      this.getOutcomeTrends(organizationId, days),
      prisma.outboundCall.count({
        where: {
          agent: { organizationId },
          createdAt: { gte: startDate },
        },
      }),
      prisma.outboundCall.count({
        where: {
          agent: { organizationId },
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ]);

    return {
      period: { days, startDate, endDate: new Date() },
      summary: {
        totalCalls,
        todayCalls,
        conversionRate: funnelData.overallConversionRate,
        topOutcome: outcomeDistribution.distribution[0]?.outcome || 'N/A',
      },
      funnel: funnelData,
      leaderboard,
      outcomes: {
        distribution: outcomeDistribution,
        trends: outcomeTrends,
      },
    };
  }

  // ==================== AI INSIGHTS ====================

  /**
   * Get recent calls for AI insights
   */
  async getRecentCalls(organizationId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const calls = await prisma.outboundCall.findMany({
      where: {
        agent: { organizationId },
        createdAt: { gte: startDate },
      },
      select: {
        id: true,
        status: true,
        outcome: true,
        sentiment: true,
        duration: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 1000, // Limit for performance
    });

    return calls;
  }

  /**
   * Get call analytics summary
   */
  async getSummary(organizationId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [
      totalCalls,
      completedCalls,
      outcomeData,
      sentimentData,
      agentCount,
      avgDurationResult,
    ] = await Promise.all([
      // Total calls
      prisma.outboundCall.count({
        where: {
          agent: { organizationId },
          createdAt: { gte: startDate },
        },
      }),
      // Completed/answered calls
      prisma.outboundCall.count({
        where: {
          agent: { organizationId },
          createdAt: { gte: startDate },
          status: 'COMPLETED',
        },
      }),
      // Outcome distribution
      prisma.outboundCall.groupBy({
        by: ['outcome'],
        where: {
          agent: { organizationId },
          createdAt: { gte: startDate },
        },
        _count: { id: true },
      }),
      // Sentiment distribution
      prisma.outboundCall.groupBy({
        by: ['sentiment'],
        where: {
          agent: { organizationId },
          createdAt: { gte: startDate },
        },
        _count: { id: true },
      }),
      // Active agents count
      prisma.voiceAgent.count({
        where: { organizationId, isActive: true },
      }),
      // Average call duration
      prisma.outboundCall.aggregate({
        where: {
          agent: { organizationId },
          createdAt: { gte: startDate },
          duration: { gt: 0 },
        },
        _avg: { duration: true },
      }),
    ]);

    // Calculate answer rate
    const answerRate = totalCalls > 0
      ? Math.round((completedCalls / totalCalls) * 10000) / 100
      : 0;

    // Build outcome summary
    const outcomes: Record<string, number> = {};
    outcomeData.forEach(o => {
      outcomes[o.outcome || 'unknown'] = o._count.id;
    });

    // Build sentiment summary
    const sentiments: Record<string, number> = {};
    sentimentData.forEach(s => {
      sentiments[s.sentiment || 'unknown'] = s._count.id;
    });

    // Calculate interested/conversion metrics
    const interestedCount = outcomes['INTERESTED'] || 0;
    const appointmentsBooked = outcomes['APPOINTMENT_BOOKED'] || 0;
    const conversionRate = completedCalls > 0
      ? Math.round((interestedCount / completedCalls) * 10000) / 100
      : 0;

    return {
      period: { days, startDate, endDate: new Date() },
      overview: {
        totalCalls,
        completedCalls,
        answerRate,
        avgDuration: Math.round(avgDurationResult._avg.duration || 0),
        activeAgents: agentCount,
      },
      outcomes: {
        distribution: outcomes,
        topOutcome: outcomeData.sort((a, b) => b._count.id - a._count.id)[0]?.outcome || 'N/A',
        interestedCount,
        appointmentsBooked,
        conversionRate,
      },
      sentiment: {
        distribution: sentiments,
        positive: sentiments['positive'] || 0,
        neutral: sentiments['neutral'] || 0,
        negative: sentiments['negative'] || 0,
      },
      performance: {
        callsPerDay: Math.round(totalCalls / days),
        avgCallDuration: Math.round(avgDurationResult._avg.duration || 0),
      },
    };
  }
}

export const callAnalyticsService = new CallAnalyticsService();
