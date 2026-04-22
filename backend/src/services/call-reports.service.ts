/**
 * Call Reports Service
 * Tenant-scoped call reporting for telecalling and AI calling operations
 *
 * SECURITY: All reports filtered by organizationId from JWT token
 */

import { prisma } from '../config/database';
import { Prisma, CallDirection, CallStatus, CallOutcome, OutboundCallStatus } from '@prisma/client';
import { userService } from './user.service';

interface DateRange {
  start: Date;
  end: Date;
}

interface ReportFilters {
  organizationId: string;
  dateRange?: DateRange;
  agentId?: string; // User or AI agent
  campaignId?: string;
  // Role-based filtering
  userRole?: string;
  userId?: string;
}

interface CallSummary {
  totalCalls: number;
  outboundCalls: number;
  inboundCalls: number;
  connectedCalls: number;
  missedCalls: number;
  failedCalls: number;
  totalDuration: number; // seconds
  avgDuration: number; // seconds
  connectionRate: string;
}

interface CallOutcomeSummary {
  outcome: string;
  count: number;
  percentage: string;
}

interface AgentPerformance {
  agentId: string;
  agentName: string;
  agentType: 'human' | 'ai';
  totalCalls: number;
  connectedCalls: number;
  interested: number;
  converted: number;
  totalDuration: number;
  avgDuration: number;
  conversionRate: string;
  connectionRate: string;
}

interface CallTrend {
  date: string;
  totalCalls: number;
  connected: number;
  interested: number;
  converted: number;
}

interface AIvsHumanComparison {
  metric: string;
  aiCalls: number | string;
  humanCalls: number | string;
  winner: 'ai' | 'human' | 'tie';
}

class CallReportsService {
  /**
   * Get default date range (last 30 days)
   */
  private getDefaultDateRange(): DateRange {
    const end = new Date();
    const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { start, end };
  }

  /**
   * 1. CALL SUMMARY - Total calls overview
   */
  async getCallSummary(filters: ReportFilters): Promise<CallSummary> {
    const { organizationId, dateRange = this.getDefaultDateRange() } = filters;

    // Get stats from CallLog (telecaller calls)
    const [
      callLogStats,
      outboundCallStats,
      inboundCallStats,
    ] = await Promise.all([
      // CallLog stats
      prisma.callLog.aggregate({
        where: {
          organizationId,
          createdAt: { gte: dateRange.start, lte: dateRange.end },
        },
        _count: { id: true },
        _sum: { duration: true },
        _avg: { duration: true },
      }),
      // OutboundCall stats (AI calls)
      prisma.outboundCall.aggregate({
        where: {
          agent: { organizationId },
          createdAt: { gte: dateRange.start, lte: dateRange.end },
        },
        _count: { id: true },
        _sum: { duration: true },
        _avg: { duration: true },
      }),
      // InboundCallLog stats
      prisma.inboundCallLog.aggregate({
        where: {
          organizationId,
          startedAt: { gte: dateRange.start, lte: dateRange.end },
        },
        _count: { id: true },
        _sum: { duration: true },
        _avg: { duration: true },
      }),
    ]);

    // Get connected/missed counts
    const [connectedCallLog, missedCallLog, connectedOutbound, missedOutbound] = await Promise.all([
      prisma.callLog.count({
        where: {
          organizationId,
          createdAt: { gte: dateRange.start, lte: dateRange.end },
          status: 'COMPLETED',
        },
      }),
      prisma.callLog.count({
        where: {
          organizationId,
          createdAt: { gte: dateRange.start, lte: dateRange.end },
          status: { in: ['MISSED', 'NO_ANSWER', 'BUSY'] },
        },
      }),
      prisma.outboundCall.count({
        where: {
          agent: { organizationId },
          createdAt: { gte: dateRange.start, lte: dateRange.end },
          status: 'COMPLETED',
        },
      }),
      prisma.outboundCall.count({
        where: {
          agent: { organizationId },
          createdAt: { gte: dateRange.start, lte: dateRange.end },
          status: { in: ['NO_ANSWER', 'BUSY', 'FAILED'] },
        },
      }),
    ]);

    const totalCalls = (callLogStats._count.id || 0) + (outboundCallStats._count.id || 0);
    const connectedCalls = connectedCallLog + connectedOutbound;
    const missedCalls = missedCallLog + missedOutbound;
    const totalDuration = (callLogStats._sum.duration || 0) + (outboundCallStats._sum.duration || 0);

    return {
      totalCalls,
      outboundCalls: (callLogStats._count.id || 0) + (outboundCallStats._count.id || 0),
      inboundCalls: inboundCallStats._count.id || 0,
      connectedCalls,
      missedCalls,
      failedCalls: totalCalls - connectedCalls - missedCalls,
      totalDuration,
      avgDuration: totalCalls > 0 ? Math.round(totalDuration / connectedCalls) : 0,
      connectionRate: totalCalls > 0 ? ((connectedCalls / totalCalls) * 100).toFixed(1) : '0',
    };
  }

  /**
   * 2. CALL OUTCOME SUMMARY
   */
  async getCallOutcomeSummary(filters: ReportFilters): Promise<{
    outcomes: CallOutcomeSummary[];
    totalInterested: number;
    totalConverted: number;
    conversionFunnel: { stage: string; count: number; percentage: string }[];
  }> {
    const { organizationId, dateRange = this.getDefaultDateRange() } = filters;

    // Get outcomes from OutboundCall (which has outcome field)
    const outboundOutcomes = await prisma.outboundCall.groupBy({
      by: ['outcome'],
      where: {
        agent: { organizationId },
        createdAt: { gte: dateRange.start, lte: dateRange.end },
        outcome: { not: null },
      },
      _count: { id: true },
    });

    const total = outboundOutcomes.reduce((sum, o) => sum + o._count.id, 0);

    const outcomes: CallOutcomeSummary[] = outboundOutcomes
      .filter(o => o.outcome)
      .map(o => ({
        outcome: o.outcome!,
        count: o._count.id,
        percentage: total > 0 ? ((o._count.id / total) * 100).toFixed(1) : '0',
      }))
      .sort((a, b) => b.count - a.count);

    // Calculate funnel
    const interested = outboundOutcomes.find(o => o.outcome === 'INTERESTED')?._count.id || 0;
    const callbackRequested = outboundOutcomes.find(o => o.outcome === 'CALLBACK_REQUESTED')?._count.id || 0;
    const appointmentBooked = outboundOutcomes.find(o => o.outcome === 'APPOINTMENT_BOOKED')?._count.id || 0;
    const converted = outboundOutcomes.find(o => o.outcome === 'CONVERTED')?._count.id || 0;

    return {
      outcomes,
      totalInterested: interested,
      totalConverted: converted,
      conversionFunnel: [
        { stage: 'Total Calls', count: total, percentage: '100' },
        { stage: 'Connected', count: total, percentage: '100' }, // Already filtered
        { stage: 'Interested', count: interested, percentage: total > 0 ? ((interested / total) * 100).toFixed(1) : '0' },
        { stage: 'Callback/Appointment', count: callbackRequested + appointmentBooked, percentage: total > 0 ? (((callbackRequested + appointmentBooked) / total) * 100).toFixed(1) : '0' },
        { stage: 'Converted', count: converted, percentage: total > 0 ? ((converted / total) * 100).toFixed(1) : '0' },
      ],
    };
  }

  /**
   * 3. CONNECTED VS MISSED CALLS
   */
  async getConnectedVsMissed(filters: ReportFilters): Promise<{
    connected: { count: number; percentage: string; avgDuration: number };
    missed: { count: number; percentage: string; reasons: { reason: string; count: number }[] };
    byHour: { hour: number; connected: number; missed: number }[];
  }> {
    const { organizationId, dateRange = this.getDefaultDateRange() } = filters;

    // Get connected and missed counts
    const [connected, missed, noAnswer, busy, failed] = await Promise.all([
      prisma.outboundCall.aggregate({
        where: {
          agent: { organizationId },
          createdAt: { gte: dateRange.start, lte: dateRange.end },
          status: 'COMPLETED',
        },
        _count: { id: true },
        _avg: { duration: true },
      }),
      prisma.outboundCall.count({
        where: {
          agent: { organizationId },
          createdAt: { gte: dateRange.start, lte: dateRange.end },
          status: { in: ['NO_ANSWER', 'BUSY', 'FAILED'] },
        },
      }),
      prisma.outboundCall.count({
        where: {
          agent: { organizationId },
          createdAt: { gte: dateRange.start, lte: dateRange.end },
          status: 'NO_ANSWER',
        },
      }),
      prisma.outboundCall.count({
        where: {
          agent: { organizationId },
          createdAt: { gte: dateRange.start, lte: dateRange.end },
          status: 'BUSY',
        },
      }),
      prisma.outboundCall.count({
        where: {
          agent: { organizationId },
          createdAt: { gte: dateRange.start, lte: dateRange.end },
          status: 'FAILED',
        },
      }),
    ]);

    const total = (connected._count.id || 0) + missed;

    // Get calls by hour for pattern analysis
    const allCalls = await prisma.outboundCall.findMany({
      where: {
        agent: { organizationId },
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      },
      select: { createdAt: true, status: true },
    });

    const byHourMap: Record<number, { connected: number; missed: number }> = {};
    for (let i = 0; i < 24; i++) {
      byHourMap[i] = { connected: 0, missed: 0 };
    }

    for (const call of allCalls) {
      const hour = call.createdAt.getHours();
      if (call.status === 'COMPLETED') {
        byHourMap[hour].connected++;
      } else if (['NO_ANSWER', 'BUSY', 'FAILED'].includes(call.status)) {
        byHourMap[hour].missed++;
      }
    }

    return {
      connected: {
        count: connected._count.id || 0,
        percentage: total > 0 ? (((connected._count.id || 0) / total) * 100).toFixed(1) : '0',
        avgDuration: Math.round(connected._avg.duration || 0),
      },
      missed: {
        count: missed,
        percentage: total > 0 ? ((missed / total) * 100).toFixed(1) : '0',
        reasons: [
          { reason: 'No Answer', count: noAnswer },
          { reason: 'Busy', count: busy },
          { reason: 'Failed', count: failed },
        ],
      },
      byHour: Object.entries(byHourMap).map(([hour, data]) => ({
        hour: parseInt(hour),
        ...data,
      })),
    };
  }

  /**
   * 4. INBOUND VS OUTBOUND COMPARISON
   */
  async getInboundVsOutbound(filters: ReportFilters): Promise<{
    inbound: { count: number; connected: number; avgDuration: number; avgWaitTime: number };
    outbound: { count: number; connected: number; avgDuration: number; conversionRate: string };
  }> {
    const { organizationId, dateRange = this.getDefaultDateRange() } = filters;

    const [inboundStats, inboundConnected, outboundStats, outboundConnected, outboundConverted] = await Promise.all([
      prisma.inboundCallLog.aggregate({
        where: {
          organizationId,
          startedAt: { gte: dateRange.start, lte: dateRange.end },
        },
        _count: { id: true },
        _avg: { duration: true, queueWaitTime: true },
      }),
      prisma.inboundCallLog.count({
        where: {
          organizationId,
          startedAt: { gte: dateRange.start, lte: dateRange.end },
          status: 'ANSWERED',
        },
      }),
      prisma.outboundCall.aggregate({
        where: {
          agent: { organizationId },
          createdAt: { gte: dateRange.start, lte: dateRange.end },
        },
        _count: { id: true },
        _avg: { duration: true },
      }),
      prisma.outboundCall.count({
        where: {
          agent: { organizationId },
          createdAt: { gte: dateRange.start, lte: dateRange.end },
          status: 'COMPLETED',
        },
      }),
      prisma.outboundCall.count({
        where: {
          agent: { organizationId },
          createdAt: { gte: dateRange.start, lte: dateRange.end },
          outcome: 'CONVERTED',
        },
      }),
    ]);

    return {
      inbound: {
        count: inboundStats._count.id || 0,
        connected: inboundConnected,
        avgDuration: Math.round(inboundStats._avg.duration || 0),
        avgWaitTime: Math.round(inboundStats._avg.queueWaitTime || 0),
      },
      outbound: {
        count: outboundStats._count.id || 0,
        connected: outboundConnected,
        avgDuration: Math.round(outboundStats._avg.duration || 0),
        conversionRate: outboundConnected > 0 ? ((outboundConverted / outboundConnected) * 100).toFixed(1) : '0',
      },
    };
  }

  /**
   * 5. CALL DURATION REPORT
   */
  async getCallDurationReport(filters: ReportFilters): Promise<{
    avgDuration: number;
    totalDuration: number;
    distribution: { range: string; count: number; percentage: string }[];
    longestCalls: { id: string; duration: number; phone: string; outcome: string | null }[];
  }> {
    const { organizationId, dateRange = this.getDefaultDateRange() } = filters;

    const calls = await prisma.outboundCall.findMany({
      where: {
        agent: { organizationId },
        createdAt: { gte: dateRange.start, lte: dateRange.end },
        status: 'COMPLETED',
        duration: { not: null },
      },
      select: { id: true, duration: true, phoneNumber: true, outcome: true },
      orderBy: { duration: 'desc' },
    });

    const totalDuration = calls.reduce((sum, c) => sum + (c.duration || 0), 0);
    const avgDuration = calls.length > 0 ? Math.round(totalDuration / calls.length) : 0;

    // Distribution buckets (in seconds)
    const buckets = [
      { range: '0-30s', min: 0, max: 30 },
      { range: '30s-1m', min: 30, max: 60 },
      { range: '1-2m', min: 60, max: 120 },
      { range: '2-5m', min: 120, max: 300 },
      { range: '5-10m', min: 300, max: 600 },
      { range: '10m+', min: 600, max: Infinity },
    ];

    const distribution = buckets.map(bucket => {
      const count = calls.filter(c => (c.duration || 0) >= bucket.min && (c.duration || 0) < bucket.max).length;
      return {
        range: bucket.range,
        count,
        percentage: calls.length > 0 ? ((count / calls.length) * 100).toFixed(1) : '0',
      };
    });

    return {
      avgDuration,
      totalDuration,
      distribution,
      longestCalls: calls.slice(0, 10).map(c => ({
        id: c.id,
        duration: c.duration || 0,
        phone: c.phoneNumber,
        outcome: c.outcome,
      })),
    };
  }

  /**
   * 6. AGENT-WISE CALL PERFORMANCE
   */
  async getAgentPerformance(filters: ReportFilters): Promise<AgentPerformance[]> {
    const { organizationId, dateRange = this.getDefaultDateRange(), userRole, userId } = filters;

    // Get viewable team member IDs based on role
    let viewableUserIds: string[] | null = null;
    if (userRole && userId) {
      viewableUserIds = await userService.getViewableTeamMemberIds(organizationId, userRole, userId);
    }

    // Build human agent filter
    const agentFilter: any = {
      organizationId,
      isActive: true,
      role: { slug: { in: ['telecaller', 'counselor', 'sales_rep'] } },
    };

    // Apply role-based filtering
    if (viewableUserIds !== null) {
      agentFilter.id = { in: viewableUserIds };
    }

    // Get human agents (telecallers)
    const humanAgents = await prisma.user.findMany({
      where: agentFilter,
      select: { id: true, firstName: true, lastName: true },
    });

    // Get AI agents
    const aiAgents = await prisma.voiceAgent.findMany({
      where: { organizationId, isActive: true },
      select: { id: true, name: true },
    });

    const results: AgentPerformance[] = [];

    // Human agent stats from CallLog
    for (const agent of humanAgents) {
      const stats = await prisma.callLog.aggregate({
        where: {
          organizationId,
          callerId: agent.id,
          createdAt: { gte: dateRange.start, lte: dateRange.end },
        },
        _count: { id: true },
        _sum: { duration: true },
      });

      const connected = await prisma.callLog.count({
        where: {
          organizationId,
          callerId: agent.id,
          createdAt: { gte: dateRange.start, lte: dateRange.end },
          status: 'COMPLETED',
        },
      });

      results.push({
        agentId: agent.id,
        agentName: `${agent.firstName} ${agent.lastName}`.trim(),
        agentType: 'human',
        totalCalls: stats._count.id || 0,
        connectedCalls: connected,
        interested: 0, // Would need outcome tracking in CallLog
        converted: 0,
        totalDuration: stats._sum.duration || 0,
        avgDuration: connected > 0 ? Math.round((stats._sum.duration || 0) / connected) : 0,
        conversionRate: '0',
        connectionRate: (stats._count.id || 0) > 0 ? ((connected / (stats._count.id || 0)) * 100).toFixed(1) : '0',
      });
    }

    // AI agent stats from OutboundCall
    for (const agent of aiAgents) {
      const stats = await prisma.outboundCall.aggregate({
        where: {
          agentId: agent.id,
          createdAt: { gte: dateRange.start, lte: dateRange.end },
        },
        _count: { id: true },
        _sum: { duration: true },
      });

      const [connected, interested, converted] = await Promise.all([
        prisma.outboundCall.count({
          where: {
            agentId: agent.id,
            createdAt: { gte: dateRange.start, lte: dateRange.end },
            status: 'COMPLETED',
          },
        }),
        prisma.outboundCall.count({
          where: {
            agentId: agent.id,
            createdAt: { gte: dateRange.start, lte: dateRange.end },
            outcome: 'INTERESTED',
          },
        }),
        prisma.outboundCall.count({
          where: {
            agentId: agent.id,
            createdAt: { gte: dateRange.start, lte: dateRange.end },
            outcome: 'CONVERTED',
          },
        }),
      ]);

      results.push({
        agentId: agent.id,
        agentName: agent.name,
        agentType: 'ai',
        totalCalls: stats._count.id || 0,
        connectedCalls: connected,
        interested,
        converted,
        totalDuration: stats._sum.duration || 0,
        avgDuration: connected > 0 ? Math.round((stats._sum.duration || 0) / connected) : 0,
        conversionRate: connected > 0 ? ((converted / connected) * 100).toFixed(1) : '0',
        connectionRate: (stats._count.id || 0) > 0 ? ((connected / (stats._count.id || 0)) * 100).toFixed(1) : '0',
      });
    }

    return results.sort((a, b) => b.totalCalls - a.totalCalls);
  }

  /**
   * 7. AI VS HUMAN CALL COMPARISON
   */
  async getAIvsHumanComparison(filters: ReportFilters): Promise<AIvsHumanComparison[]> {
    const { organizationId, dateRange = this.getDefaultDateRange() } = filters;

    // AI stats from OutboundCall
    const aiStats = await prisma.outboundCall.aggregate({
      where: {
        agent: { organizationId },
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      },
      _count: { id: true },
      _sum: { duration: true },
      _avg: { duration: true },
    });

    const [aiConnected, aiInterested, aiConverted] = await Promise.all([
      prisma.outboundCall.count({
        where: {
          agent: { organizationId },
          createdAt: { gte: dateRange.start, lte: dateRange.end },
          status: 'COMPLETED',
        },
      }),
      prisma.outboundCall.count({
        where: {
          agent: { organizationId },
          createdAt: { gte: dateRange.start, lte: dateRange.end },
          outcome: 'INTERESTED',
        },
      }),
      prisma.outboundCall.count({
        where: {
          agent: { organizationId },
          createdAt: { gte: dateRange.start, lte: dateRange.end },
          outcome: 'CONVERTED',
        },
      }),
    ]);

    // Human stats from CallLog
    const humanStats = await prisma.callLog.aggregate({
      where: {
        organizationId,
        callType: 'MANUAL',
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      },
      _count: { id: true },
      _sum: { duration: true },
      _avg: { duration: true },
    });

    const humanConnected = await prisma.callLog.count({
      where: {
        organizationId,
        callType: 'MANUAL',
        createdAt: { gte: dateRange.start, lte: dateRange.end },
        status: 'COMPLETED',
      },
    });

    const aiTotal = aiStats._count.id || 0;
    const humanTotal = humanStats._count.id || 0;

    const aiConnectionRate = aiTotal > 0 ? (aiConnected / aiTotal) * 100 : 0;
    const humanConnectionRate = humanTotal > 0 ? (humanConnected / humanTotal) * 100 : 0;

    const aiConversionRate = aiConnected > 0 ? (aiConverted / aiConnected) * 100 : 0;

    return [
      {
        metric: 'Total Calls',
        aiCalls: aiTotal,
        humanCalls: humanTotal,
        winner: aiTotal > humanTotal ? 'ai' : aiTotal < humanTotal ? 'human' : 'tie',
      },
      {
        metric: 'Connected Calls',
        aiCalls: aiConnected,
        humanCalls: humanConnected,
        winner: aiConnected > humanConnected ? 'ai' : aiConnected < humanConnected ? 'human' : 'tie',
      },
      {
        metric: 'Connection Rate',
        aiCalls: `${aiConnectionRate.toFixed(1)}%`,
        humanCalls: `${humanConnectionRate.toFixed(1)}%`,
        winner: aiConnectionRate > humanConnectionRate ? 'ai' : aiConnectionRate < humanConnectionRate ? 'human' : 'tie',
      },
      {
        metric: 'Avg Duration (sec)',
        aiCalls: Math.round(aiStats._avg.duration || 0),
        humanCalls: Math.round(humanStats._avg.duration || 0),
        winner: (aiStats._avg.duration || 0) > (humanStats._avg.duration || 0) ? 'ai' : 'human',
      },
      {
        metric: 'Interested Leads',
        aiCalls: aiInterested,
        humanCalls: 'N/A', // Need outcome tracking in CallLog
        winner: 'ai',
      },
      {
        metric: 'Converted',
        aiCalls: aiConverted,
        humanCalls: 'N/A',
        winner: 'ai',
      },
      {
        metric: 'Conversion Rate',
        aiCalls: `${aiConversionRate.toFixed(1)}%`,
        humanCalls: 'N/A',
        winner: 'ai',
      },
    ];
  }

  /**
   * 8. CALL TRENDS
   */
  async getCallTrends(filters: ReportFilters, interval: 'day' | 'week' | 'month' = 'day'): Promise<CallTrend[]> {
    const { organizationId, dateRange = this.getDefaultDateRange() } = filters;

    const calls = await prisma.outboundCall.findMany({
      where: {
        agent: { organizationId },
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      },
      select: { createdAt: true, status: true, outcome: true },
      orderBy: { createdAt: 'asc' },
    });

    const groupedData = new Map<string, { total: number; connected: number; interested: number; converted: number }>();

    for (const call of calls) {
      const key = this.getIntervalKey(call.createdAt, interval);
      const current = groupedData.get(key) || { total: 0, connected: 0, interested: 0, converted: 0 };
      current.total++;
      if (call.status === 'COMPLETED') current.connected++;
      if (call.outcome === 'INTERESTED') current.interested++;
      if (call.outcome === 'CONVERTED') current.converted++;
      groupedData.set(key, current);
    }

    return Array.from(groupedData.entries())
      .map(([date, data]) => ({
        date,
        totalCalls: data.total,
        connected: data.connected,
        interested: data.interested,
        converted: data.converted,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * COMPREHENSIVE CALL REPORT
   */
  async getComprehensiveReport(filters: ReportFilters): Promise<{
    summary: CallSummary;
    outcomes: Awaited<ReturnType<typeof this.getCallOutcomeSummary>>;
    connectedVsMissed: Awaited<ReturnType<typeof this.getConnectedVsMissed>>;
    inboundVsOutbound: Awaited<ReturnType<typeof this.getInboundVsOutbound>>;
    duration: Awaited<ReturnType<typeof this.getCallDurationReport>>;
    agentPerformance: AgentPerformance[];
    aiVsHuman: AIvsHumanComparison[];
    trends: CallTrend[];
  }> {
    const [
      summary,
      outcomes,
      connectedVsMissed,
      inboundVsOutbound,
      duration,
      agentPerformance,
      aiVsHuman,
      trends,
    ] = await Promise.all([
      this.getCallSummary(filters),
      this.getCallOutcomeSummary(filters),
      this.getConnectedVsMissed(filters),
      this.getInboundVsOutbound(filters),
      this.getCallDurationReport(filters),
      this.getAgentPerformance(filters),
      this.getAIvsHumanComparison(filters),
      this.getCallTrends(filters),
    ]);

    return {
      summary,
      outcomes,
      connectedVsMissed,
      inboundVsOutbound,
      duration,
      agentPerformance,
      aiVsHuman,
      trends,
    };
  }

  /**
   * 9. LEAD DISPOSITION REPORT - Per user call breakdown with dispositions
   */
  async getLeadDispositionReport(filters: ReportFilters): Promise<{
    summary: { totalCalls: number; connected: number; notConnected: number; connectionRate: string };
    dispositions: {
      user: string;
      userId: string;
      totalCalls: number;
      connected: number;
      notConnected: number;
      interested: number;
      notInterested: number;
      callback: number;
      converted: number;
      noAnswer: number;
      busy: number;
      wrongNumber: number;
    }[];
  }> {
    const { organizationId, dateRange = this.getDefaultDateRange(), userRole, userId } = filters;

    console.log('[CallReports] getLeadDispositionReport called, orgId:', organizationId);
    console.log('[CallReports] Date range:', dateRange);
    console.log('[CallReports] Role-based filtering - role:', userRole, 'userId:', userId);

    // Get viewable team member IDs based on role
    let viewableUserIds: string[] | null = null;
    if (userRole && userId) {
      viewableUserIds = await userService.getViewableTeamMemberIds(organizationId, userRole, userId);
    }

    // Build user filter
    const userFilter: any = {
      organizationId,
      isActive: true,
      role: { slug: { in: ['telecaller', 'counselor', 'sales_rep', 'manager', 'admin'] } },
    };

    // Apply role-based filtering
    if (viewableUserIds !== null) {
      userFilter.id = { in: viewableUserIds };
    }

    // Get all telecallers/counselors based on role visibility
    const users = await prisma.user.findMany({
      where: userFilter,
      select: { id: true, firstName: true, lastName: true },
    });

    console.log('[CallReports] Found users:', users.length);

    const dispositions: {
      user: string;
      userId: string;
      totalCalls: number;
      connected: number;
      notConnected: number;
      interested: number;
      notInterested: number;
      callback: number;
      converted: number;
      noAnswer: number;
      busy: number;
      wrongNumber: number;
    }[] = [];

    let totalCalls = 0;
    let totalConnected = 0;
    let totalNotConnected = 0;

    for (const user of users) {
      // Get TelecallerCall stats for this user
      const calls = await prisma.telecallerCall.findMany({
        where: {
          telecallerId: user.id,
          createdAt: { gte: dateRange.start, lte: dateRange.end },
        },
        select: { status: true, outcome: true },
      });

      if (calls.length === 0) continue;

      const userStats = {
        user: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown',
        userId: user.id,
        totalCalls: calls.length,
        connected: 0,
        notConnected: 0,
        interested: 0,
        notInterested: 0,
        callback: 0,
        converted: 0,
        noAnswer: 0,
        busy: 0,
        wrongNumber: 0,
      };

      for (const call of calls) {
        // Connected status - TelecallerCallStatus enum: INITIATED, IN_PROGRESS, COMPLETED, MISSED, FAILED
        if (call.status === 'COMPLETED' || call.status === 'IN_PROGRESS') {
          userStats.connected++;
        } else {
          userStats.notConnected++;
        }

        // Disposition breakdown based on outcome
        // TelecallerCallOutcome enum: INTERESTED, NOT_INTERESTED, CALLBACK, CONVERTED, NO_ANSWER, WRONG_NUMBER, BUSY
        switch (call.outcome) {
          case 'INTERESTED':
            userStats.interested++;
            break;
          case 'NOT_INTERESTED':
            userStats.notInterested++;
            break;
          case 'CALLBACK':
            userStats.callback++;
            break;
          case 'CONVERTED':
            userStats.converted++;
            break;
          case 'NO_ANSWER':
            userStats.noAnswer++;
            break;
          case 'BUSY':
            userStats.busy++;
            break;
          case 'WRONG_NUMBER':
            userStats.wrongNumber++;
            break;
        }

        // If no outcome set, check status for missed calls
        if (!call.outcome && (call.status === 'MISSED' || call.status === 'FAILED')) {
          userStats.noAnswer++;
        }
      }

      totalCalls += userStats.totalCalls;
      totalConnected += userStats.connected;
      totalNotConnected += userStats.notConnected;

      dispositions.push(userStats);
    }

    // Sort by total calls descending
    dispositions.sort((a, b) => b.totalCalls - a.totalCalls);

    return {
      summary: {
        totalCalls,
        connected: totalConnected,
        notConnected: totalNotConnected,
        connectionRate: totalCalls > 0 ? ((totalConnected / totalCalls) * 100).toFixed(1) + '%' : '0%',
      },
      dispositions,
    };
  }

  /**
   * 10. USER CALL REPORT - User call stats
   */
  async getUserCallReport(filters: ReportFilters): Promise<{
    users: {
      no: number;
      username: string;
      oderId: string;
      mobileNumber: string;
      totalCalls: number;
      totalCallsConnected: number;
      totalUnconnectedCalls: number;
      totalDisposedCount: number;
      totalCallTime: string;
      avgCallTime: string;
    }[];
    summary: {
      totalCalls: number;
      totalConnected: number;
    };
  }> {
    const { organizationId, dateRange = this.getDefaultDateRange(), userRole, userId } = filters;

    console.log('[UserCallReport] Fetching for org:', organizationId, 'dateRange:', dateRange);
    console.log('[UserCallReport] Role-based filtering - role:', userRole, 'userId:', userId);

    // Get viewable team member IDs based on role
    let viewableUserIds: string[] | null = null;
    if (userRole && userId) {
      viewableUserIds = await userService.getViewableTeamMemberIds(organizationId, userRole, userId);
    }

    // Build user filter
    const userFilter: any = {
      organizationId,
      isActive: true,
    };

    // Apply role-based filtering
    if (viewableUserIds !== null) {
      userFilter.id = { in: viewableUserIds };
    }

    // Get all active users based on role visibility
    const users = await prisma.user.findMany({
      where: userFilter,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: { select: { slug: true } },
      },
    });

    console.log('[UserCallReport] Found users:', users.length, 'roles:', [...new Set(users.map(u => u.role?.slug))]);

    const result: {
      no: number;
      username: string;
      oderId: string;
      mobileNumber: string;
      totalCalls: number;
      totalCallsConnected: number;
      totalUnconnectedCalls: number;
      totalDisposedCount: number;
      totalCallTime: string;
      avgCallTime: string;
    }[] = [];

    let summaryTotalCalls = 0;
    let summaryTotalConnected = 0;
    let index = 1;

    // Also get total call count for debugging
    const totalCallsInRange = await prisma.telecallerCall.count({
      where: {
        organizationId,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      },
    });
    console.log('[UserCallReport] Total telecaller calls in date range:', totalCallsInRange);

    for (const user of users) {
      // Get TelecallerCall stats
      const calls = await prisma.telecallerCall.findMany({
        where: {
          telecallerId: user.id,
          createdAt: { gte: dateRange.start, lte: dateRange.end },
        },
        select: {
          status: true,
          outcome: true,
          duration: true,
        },
      });

      if (calls.length === 0) continue;

      console.log('[UserCallReport] User', user.firstName, user.lastName, 'has', calls.length, 'calls');

      const connected = calls.filter(c => c.status === 'COMPLETED' || c.status === 'IN_PROGRESS').length;
      const totalDuration = calls.reduce((sum, c) => sum + (c.duration || 0), 0);
      const disposed = calls.filter(c => c.outcome !== null).length;

      const formatDuration = (seconds: number): string => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.round(seconds % 60);
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      };

      summaryTotalCalls += calls.length;
      summaryTotalConnected += connected;

      result.push({
        no: index++,
        username: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown',
        oderId: user.id,
        mobileNumber: user.phone || '-',
        totalCalls: calls.length,
        totalCallsConnected: connected,
        totalUnconnectedCalls: calls.length - connected,
        totalDisposedCount: disposed,
        totalCallTime: formatDuration(totalDuration),
        avgCallTime: connected > 0 ? formatDuration(totalDuration / connected) : '00:00:00',
      });
    }

    result.sort((a, b) => b.totalCalls - a.totalCalls);
    result.forEach((r, i) => (r.no = i + 1));

    return {
      users: result,
      summary: {
        totalCalls: summaryTotalCalls,
        totalConnected: summaryTotalConnected,
      },
    };
  }

  /**
   * Get AI-powered failure analysis report for non-converted calls
   */
  async getFailureAnalysisReport(filters: ReportFilters) {
    const { organizationId, dateRange, userRole, userId } = filters;

    // Get viewable team member IDs based on role
    let viewableUserIds: string[] | null = null;
    if (userRole && userId) {
      viewableUserIds = await userService.getViewableTeamMemberIds(organizationId, userRole, userId);
    }

    const whereClause: any = {
      organizationId,
      outcome: {
        in: ['NOT_INTERESTED', 'NO_ANSWER', 'CALLBACK', 'WRONG_NUMBER', 'BUSY'],
      },
      failurePrimaryReason: { not: null },
    };

    // Apply role-based filtering
    if (viewableUserIds !== null) {
      whereClause.telecallerId = { in: viewableUserIds };
    }

    if (dateRange) {
      whereClause.startedAt = {
        gte: dateRange.start,
        lte: dateRange.end,
      };
    }

    // Get all failed calls with analysis
    const calls = await prisma.telecallerCall.findMany({
      where: whereClause,
      select: {
        id: true,
        contactName: true,
        phoneNumber: true,
        outcome: true,
        duration: true,
        startedAt: true,
        endedAt: true,
        callType: true,
        sentiment: true,
        callQualityScore: true,
        summary: true,
        notes: true,
        recordingUrl: true,
        failurePrimaryReason: true,
        failurePrimaryReasonConfidence: true,
        failureRecoveryProbability: true,
        failureWhyNotConverted: true,
        failureSuggestedFollowUp: true,
        failureCustomerObjections: true,
        failureSecondaryReasons: true,
        telecaller: {
          select: { firstName: true, lastName: true, email: true },
        },
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            stage: { select: { name: true } },
          },
        },
      },
      orderBy: { startedAt: 'desc' },
    });

    // Get call counts per phone number for "attempts" column
    const phoneCounts = await prisma.telecallerCall.groupBy({
      by: ['phoneNumber'],
      where: { organizationId },
      _count: { id: true },
    });
    const phoneCountMap = new Map(phoneCounts.map(p => [p.phoneNumber, p._count.id]));

    // Calculate reason breakdown
    const reasonCounts: Record<string, number> = {};
    let totalRecoveryProb = 0;

    calls.forEach((call) => {
      const reason = call.failurePrimaryReason || 'other';
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
      totalRecoveryProb += call.failureRecoveryProbability || 0;
    });

    const totalCalls = calls.length;
    const reasonBreakdown = Object.entries(reasonCounts)
      .map(([reason, count]) => ({
        reason,
        count,
        percentage: totalCalls > 0 ? Math.round((count / totalCalls) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const topReason = reasonBreakdown[0]?.reason || 'N/A';

    return {
      calls: calls.map((call) => ({
        id: call.id,
        contactName: call.contactName,
        phoneNumber: call.phoneNumber,
        outcome: call.outcome,
        duration: call.duration,
        startedAt: call.startedAt,
        endedAt: call.endedAt,
        callType: call.callType,
        sentiment: call.sentiment,
        callQualityScore: call.callQualityScore,
        summary: call.summary,
        notes: call.notes,
        recordingUrl: call.recordingUrl,
        totalAttempts: phoneCountMap.get(call.phoneNumber) || 1,
        leadStage: call.lead?.stage?.name || null,
        leadName: call.lead ? `${call.lead.firstName || ''} ${call.lead.lastName || ''}`.trim() : null,
        telecallerName: call.telecaller
          ? `${call.telecaller.firstName} ${call.telecaller.lastName || ''}`.trim()
          : 'Unknown',
        telecallerEmail: call.telecaller?.email,
        failurePrimaryReason: call.failurePrimaryReason,
        failureConfidence: call.failurePrimaryReasonConfidence,
        failureRecoveryProbability: call.failureRecoveryProbability,
        failureWhyNotConverted: call.failureWhyNotConverted,
        failureSuggestedFollowUp: call.failureSuggestedFollowUp,
        failureObjections: call.failureCustomerObjections,
        failureSecondaryReasons: call.failureSecondaryReasons,
      })),
      summary: {
        totalFailedCalls: totalCalls,
        avgRecoveryProbability: totalCalls > 0 ? Math.round(totalRecoveryProb / totalCalls) : 0,
        topFailureReason: topReason,
        reasonBreakdown,
      },
    };
  }

  /**
   * Helper: Get interval key for time series
   */
  private getIntervalKey(date: Date, interval: string): string {
    const d = new Date(date);
    switch (interval) {
      case 'day':
        return d.toISOString().slice(0, 10);
      case 'week':
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        return weekStart.toISOString().slice(0, 10);
      case 'month':
        return d.toISOString().slice(0, 7);
      default:
        return d.toISOString().slice(0, 10);
    }
  }
}

export const callReportsService = new CallReportsService();
