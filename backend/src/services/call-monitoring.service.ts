import { prisma } from '../config/database';
import { NotFoundError } from '../utils/errors';
import { MonitoringMode, Prisma } from '@prisma/client';

interface StartMonitoringInput {
  organizationId: string;
  supervisorId: string;
  agentUserId: string;
  inboundCallId?: string;
  outboundCallId?: string;
  mode?: MonitoringMode;
}

export class CallMonitoringService {
  // === Start Monitoring ===
  async startMonitoring(input: StartMonitoringInput) {
    // Verify there's an active call to monitor
    if (input.inboundCallId) {
      const call = await prisma.inboundCallLog.findFirst({
        where: {
          id: input.inboundCallId,
          organizationId: input.organizationId,
          status: 'IN_PROGRESS',
        },
      });

      if (!call) {
        throw new NotFoundError('No active inbound call found');
      }
    } else if (input.outboundCallId) {
      const call = await prisma.outboundCall.findFirst({
        where: {
          id: input.outboundCallId,
          status: 'IN_PROGRESS',
        },
      });

      if (!call) {
        throw new NotFoundError('No active outbound call found');
      }
    } else {
      throw new Error('Either inboundCallId or outboundCallId is required');
    }

    // Check if supervisor already monitoring this call
    const existingSession = await prisma.callMonitoringSession.findFirst({
      where: {
        supervisorId: input.supervisorId,
        endedAt: null,
      },
    });

    if (existingSession) {
      // End previous session
      await this.stopMonitoring(existingSession.id);
    }

    return prisma.callMonitoringSession.create({
      data: {
        organizationId: input.organizationId,
        supervisorId: input.supervisorId,
        agentUserId: input.agentUserId,
        inboundCallId: input.inboundCallId,
        outboundCallId: input.outboundCallId,
        mode: input.mode ?? MonitoringMode.LISTEN,
      },
    });
  }

  // === Change Monitoring Mode ===
  async startWhisper(sessionId: string) {
    const session = await this.getActiveSession(sessionId);

    return prisma.callMonitoringSession.update({
      where: { id: session.id },
      data: { mode: MonitoringMode.WHISPER },
    });
  }

  async bargeIn(sessionId: string) {
    const session = await this.getActiveSession(sessionId);

    return prisma.callMonitoringSession.update({
      where: { id: session.id },
      data: { mode: MonitoringMode.BARGE },
    });
  }

  async switchToListen(sessionId: string) {
    const session = await this.getActiveSession(sessionId);

    return prisma.callMonitoringSession.update({
      where: { id: session.id },
      data: { mode: MonitoringMode.LISTEN },
    });
  }

  // === Stop Monitoring ===
  async stopMonitoring(sessionId: string, notes?: string) {
    const session = await prisma.callMonitoringSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundError('Monitoring session not found');
    }

    return prisma.callMonitoringSession.update({
      where: { id: sessionId },
      data: {
        endedAt: new Date(),
        notes,
      },
    });
  }

  // === Get Active Sessions ===
  async getActiveSession(sessionId: string) {
    const session = await prisma.callMonitoringSession.findFirst({
      where: {
        id: sessionId,
        endedAt: null,
      },
    });

    if (!session) {
      throw new NotFoundError('Active monitoring session not found');
    }

    return session;
  }

  async getActiveSessions(organizationId: string) {
    return prisma.callMonitoringSession.findMany({
      where: {
        organizationId,
        endedAt: null,
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  async getSupervisorSessions(supervisorId: string) {
    return prisma.callMonitoringSession.findMany({
      where: {
        supervisorId,
        endedAt: null,
      },
    });
  }

  async getAgentBeingMonitored(agentUserId: string) {
    return prisma.callMonitoringSession.findFirst({
      where: {
        agentUserId,
        endedAt: null,
      },
    });
  }

  // === Get Active Calls for Monitoring ===
  async getActiveCallsForMonitoring(organizationId: string) {
    const [inboundCalls, outboundCalls] = await Promise.all([
      prisma.inboundCallLog.findMany({
        where: {
          organizationId,
          status: 'IN_PROGRESS',
        },
        select: {
          id: true,
          callerNumber: true,
          answeredByUserId: true,
          startedAt: true,
          duration: true,
        },
      }),
      prisma.outboundCall.findMany({
        where: {
          campaign: { organizationId },
          status: 'IN_PROGRESS',
        },
        select: {
          id: true,
          phoneNumber: true,
          agentId: true,
          startedAt: true,
          duration: true,
        },
      }),
    ]);

    // Get user details for agents
    const agentIds = [
      ...inboundCalls.map(c => c.answeredByUserId).filter(Boolean),
      // Outbound calls use voice agent IDs, not user IDs
    ] as string[];

    const users = await prisma.user.findMany({
      where: { id: { in: agentIds } },
      select: { id: true, firstName: true, lastName: true },
    });

    const userMap = new Map(users.map(u => [u.id, `${u.firstName} ${u.lastName}`]));

    return {
      inbound: inboundCalls.map(call => ({
        id: call.id,
        type: 'inbound' as const,
        phoneNumber: call.callerNumber,
        agentUserId: call.answeredByUserId,
        agentName: call.answeredByUserId ? userMap.get(call.answeredByUserId) : undefined,
        startedAt: call.startedAt,
        duration: call.duration,
      })),
      outbound: outboundCalls.map(call => ({
        id: call.id,
        type: 'outbound' as const,
        phoneNumber: call.phoneNumber,
        agentId: call.agentId,
        startedAt: call.startedAt,
        duration: call.duration,
      })),
    };
  }

  // === Session History ===
  async getSessionHistory(
    organizationId: string,
    supervisorId?: string,
    agentUserId?: string,
    page = 1,
    limit = 20
  ) {
    const where: Prisma.CallMonitoringSessionWhereInput = {
      organizationId,
      endedAt: { not: null },
    };

    if (supervisorId) {
      where.supervisorId = supervisorId;
    }

    if (agentUserId) {
      where.agentUserId = agentUserId;
    }

    const [sessions, total] = await Promise.all([
      prisma.callMonitoringSession.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.callMonitoringSession.count({ where }),
    ]);

    return { sessions, total, page, limit };
  }

  // === Stats ===
  async getMonitoringStats(organizationId: string, dateFrom?: Date, dateTo?: Date) {
    const where: Prisma.CallMonitoringSessionWhereInput = {
      organizationId,
    };

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const [totalSessions, byMode] = await Promise.all([
      prisma.callMonitoringSession.count({ where }),
      prisma.callMonitoringSession.groupBy({
        by: ['mode'],
        where,
        _count: { id: true },
      }),
    ]);

    const modeStats = byMode.reduce((acc, item) => {
      acc[item.mode] = item._count.id;
      return acc;
    }, {} as Record<MonitoringMode, number>);

    return {
      totalSessions,
      byMode: modeStats,
    };
  }

  // === Call Analytics for Monitoring Dashboard ===
  async getCallAnalytics(
    organizationId: string,
    type: 'AI' | 'HUMAN',
    dateFrom: Date,
    dateTo: Date
  ) {
    // Calculate time range for grouping
    const diffHours = (dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60);
    const groupByHour = diffHours <= 24;
    const groupByDay = diffHours <= 168; // 7 days

    if (type === 'AI') {
      return this.getAICallAnalytics(organizationId, dateFrom, dateTo, groupByHour, groupByDay);
    } else {
      return this.getHumanCallAnalytics(organizationId, dateFrom, dateTo, groupByHour, groupByDay);
    }
  }

  private async getAICallAnalytics(
    organizationId: string,
    dateFrom: Date,
    dateTo: Date,
    groupByHour: boolean,
    groupByDay: boolean
  ) {
    // Get AI outbound calls
    const outboundCalls = await prisma.outboundCall.findMany({
      where: {
        agent: { organizationId },
        createdAt: { gte: dateFrom, lte: dateTo },
      },
      select: {
        id: true,
        status: true,
        duration: true,
        createdAt: true,
        agent: { select: { name: true } },
      },
    });

    // Get AI voice sessions (inbound)
    const voiceSessions = await prisma.voiceSession.findMany({
      where: {
        agent: { organizationId },
        createdAt: { gte: dateFrom, lte: dateTo },
      },
      select: {
        id: true,
        status: true,
        duration: true,
        createdAt: true,
        agent: { select: { name: true } },
      },
    });

    // Combine all AI calls
    const allCalls = [
      ...outboundCalls.map(c => ({
        id: c.id,
        status: c.status,
        duration: c.duration,
        createdAt: c.createdAt,
        queue: c.agent?.name || 'Unknown',
      })),
      ...voiceSessions.map(s => ({
        id: s.id,
        status: s.status === 'COMPLETED' ? 'COMPLETED' : s.status === 'ACTIVE' ? 'IN_PROGRESS' : 'FAILED',
        duration: s.duration,
        createdAt: s.createdAt,
        queue: s.agent?.name || 'Unknown',
      })),
    ];

    return this.processCallAnalytics(allCalls, dateFrom, dateTo, groupByHour, groupByDay);
  }

  private async getHumanCallAnalytics(
    organizationId: string,
    dateFrom: Date,
    dateTo: Date,
    groupByHour: boolean,
    groupByDay: boolean
  ) {
    // Get human telecaller calls from CallLog
    const callLogs = await prisma.callLog.findMany({
      where: {
        organizationId,
        callType: 'MANUAL',
        createdAt: { gte: dateFrom, lte: dateTo },
      },
      select: {
        id: true,
        status: true,
        duration: true,
        createdAt: true,
        caller: { select: { firstName: true, lastName: true } },
      },
    });

    // Get inbound calls answered by humans
    const inboundCalls = await prisma.inboundCallLog.findMany({
      where: {
        organizationId,
        answeredByUserId: { not: null },
        createdAt: { gte: dateFrom, lte: dateTo },
      },
      select: {
        id: true,
        status: true,
        duration: true,
        createdAt: true,
        queueId: true,
      },
    });

    // Get queue names
    const queueIds = [...new Set(inboundCalls.map(c => c.queueId).filter(Boolean))] as string[];
    const queues = await prisma.callQueue.findMany({
      where: { id: { in: queueIds } },
      select: { id: true, name: true },
    });
    const queueMap = new Map(queues.map(q => [q.id, q.name]));

    // Combine all human calls
    const allCalls = [
      ...callLogs.map(c => ({
        id: c.id,
        status: c.status,
        duration: c.duration,
        createdAt: c.createdAt,
        queue: c.caller ? `${c.caller.firstName} ${c.caller.lastName}` : 'Unknown',
      })),
      ...inboundCalls.map(c => ({
        id: c.id,
        status: c.status,
        duration: c.duration,
        createdAt: c.createdAt,
        queue: c.queueId ? queueMap.get(c.queueId) || 'General' : 'General',
      })),
    ];

    return this.processCallAnalytics(allCalls, dateFrom, dateTo, groupByHour, groupByDay);
  }

  private processCallAnalytics(
    calls: Array<{ id: string; status: string; duration: number | null; createdAt: Date; queue: string }>,
    dateFrom: Date,
    dateTo: Date,
    groupByHour: boolean,
    groupByDay: boolean
  ) {
    // Status distribution
    const statusCounts: Record<string, number> = {
      COMPLETED: 0,
      IN_PROGRESS: 0,
      FAILED: 0,
      MISSED: 0,
    };

    calls.forEach(call => {
      const status = call.status.toUpperCase();
      if (status === 'COMPLETED' || status === 'ANSWERED') {
        statusCounts.COMPLETED++;
      } else if (status === 'IN_PROGRESS' || status === 'RINGING' || status === 'INITIATED') {
        statusCounts.IN_PROGRESS++;
      } else if (status === 'FAILED' || status === 'BUSY' || status === 'NO_ANSWER') {
        statusCounts.FAILED++;
      } else if (status === 'MISSED') {
        statusCounts.MISSED++;
      } else {
        statusCounts.FAILED++;
      }
    });

    // Queue distribution
    const queueCounts: Record<string, number> = {};
    calls.forEach(call => {
      const queue = call.queue || 'Unknown';
      queueCounts[queue] = (queueCounts[queue] || 0) + 1;
    });

    // Time-based volume data
    const volumeData: Array<{ label: string; count: number }> = [];

    if (groupByHour) {
      // Group by hour
      const hourCounts: Record<number, number> = {};
      calls.forEach(call => {
        const hour = call.createdAt.getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });

      for (let h = 9; h <= 18; h++) {
        const label = h === 12 ? '12PM' : h < 12 ? `${h}AM` : `${h - 12}PM`;
        volumeData.push({ label, count: hourCounts[h] || 0 });
      }
    } else if (groupByDay) {
      // Group by day
      const dayCounts: Record<string, number> = {};
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      calls.forEach(call => {
        const dayName = dayNames[call.createdAt.getDay()];
        dayCounts[dayName] = (dayCounts[dayName] || 0) + 1;
      });

      dayNames.forEach(day => {
        volumeData.push({ label: day, count: dayCounts[day] || 0 });
      });
    } else {
      // Group by week
      const weekCounts: Record<number, number> = {};
      calls.forEach(call => {
        const weekNum = Math.floor((call.createdAt.getTime() - dateFrom.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
        weekCounts[weekNum] = (weekCounts[weekNum] || 0) + 1;
      });

      const totalWeeks = Math.ceil((dateTo.getTime() - dateFrom.getTime()) / (7 * 24 * 60 * 60 * 1000));
      for (let w = 1; w <= Math.min(totalWeeks, 4); w++) {
        volumeData.push({ label: `Week ${w}`, count: weekCounts[w] || 0 });
      }
    }

    // Get top 3 queues
    const topQueues = Object.entries(queueCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));

    return {
      totalCalls: calls.length,
      statusDistribution: [
        { name: 'Completed', count: statusCounts.COMPLETED, color: '#10B981' },
        { name: 'In Progress', count: statusCounts.IN_PROGRESS, color: '#3B82F6' },
        { name: 'Failed', count: statusCounts.FAILED, color: '#EF4444' },
        { name: 'Missed', count: statusCounts.MISSED, color: '#F59E0B' },
      ],
      queueDistribution: topQueues.length > 0 ? topQueues.map((q, i) => ({
        name: q.name,
        count: q.count,
        color: ['#3B82F6', '#10B981', '#F59E0B'][i] || '#6B7280',
      })) : [
        { name: 'Sales', count: 0, color: '#3B82F6' },
        { name: 'Support', count: 0, color: '#10B981' },
        { name: 'General', count: 0, color: '#F59E0B' },
      ],
      volumeData,
    };
  }

  // === Get Live Active Calls ===
  async getLiveActiveCalls(organizationId: string, type: 'AI' | 'HUMAN') {
    if (type === 'AI') {
      // Get active AI outbound calls
      const outboundCalls = await prisma.outboundCall.findMany({
        where: {
          agent: { organizationId },
          status: 'IN_PROGRESS',
        },
        select: {
          id: true,
          phoneNumber: true,
          startedAt: true,
          duration: true,
          agent: { select: { id: true, name: true } },
        },
        take: 50,
      });

      // Get active voice sessions
      const voiceSessions = await prisma.voiceSession.findMany({
        where: {
          agent: { organizationId },
          status: 'ACTIVE',
        },
        select: {
          id: true,
          visitorPhone: true,
          visitorName: true,
          startedAt: true,
          duration: true,
          agent: { select: { id: true, name: true } },
        },
        take: 50,
      });

      return [
        ...outboundCalls.map(c => ({
          id: c.id,
          agentName: c.agent?.name || 'AI Agent',
          callerNumber: c.phoneNumber,
          callerName: null,
          queueName: c.agent?.name || 'Outbound',
          startTime: c.startedAt?.toISOString() || new Date().toISOString(),
          duration: c.duration || 0,
          status: 'IN_PROGRESS',
          type: 'AI' as const,
          isMonitored: false,
        })),
        ...voiceSessions.map(s => ({
          id: s.id,
          agentName: s.agent?.name || 'AI Agent',
          callerNumber: s.visitorPhone || 'Web Session',
          callerName: s.visitorName,
          queueName: s.agent?.name || 'Inbound',
          startTime: s.startedAt?.toISOString() || new Date().toISOString(),
          duration: s.duration || 0,
          status: 'IN_PROGRESS',
          type: 'AI' as const,
          isMonitored: false,
        })),
      ];
    } else {
      // Get active human calls
      const inboundCalls = await prisma.inboundCallLog.findMany({
        where: {
          organizationId,
          status: 'IN_PROGRESS',
        },
        include: {
          queue: { select: { name: true } },
        },
        take: 50,
      });

      // Get call logs in progress
      const callLogs = await prisma.callLog.findMany({
        where: {
          organizationId,
          callType: 'MANUAL',
          status: 'IN_PROGRESS',
        },
        include: {
          caller: { select: { firstName: true, lastName: true } },
          lead: { select: { firstName: true, lastName: true } },
        },
        take: 50,
      });

      return [
        ...inboundCalls.map(c => ({
          id: c.id,
          agentName: 'Telecaller',
          callerNumber: c.callerNumber,
          callerName: c.callerName,
          queueName: c.queue?.name || 'General',
          startTime: c.startedAt?.toISOString() || new Date().toISOString(),
          duration: c.duration || 0,
          status: c.status,
          type: 'HUMAN' as const,
          isMonitored: false,
        })),
        ...callLogs.map(c => ({
          id: c.id,
          agentName: c.caller ? `${c.caller.firstName} ${c.caller.lastName}` : 'Telecaller',
          callerNumber: c.phoneNumber,
          callerName: c.lead ? `${c.lead.firstName} ${c.lead.lastName}` : null,
          queueName: 'Outbound',
          startTime: c.startedAt?.toISOString() || new Date().toISOString(),
          duration: c.duration || 0,
          status: c.status,
          type: 'HUMAN' as const,
          isMonitored: false,
        })),
      ];
    }
  }

  // === Get Calls By Date Range (for table listing) ===
  async getCallsByDateRange(
    organizationId: string,
    type: 'AI' | 'HUMAN',
    dateFrom: Date,
    dateTo: Date,
    status?: string,
    queue?: string,
    search?: string,
    limit = 100
  ) {
    if (type === 'AI') {
      // Get AI outbound calls
      const outboundWhere: any = {
        agent: { organizationId },
        createdAt: { gte: dateFrom, lte: dateTo },
      };
      if (status && status !== 'all') {
        outboundWhere.status = status;
      }
      if (search) {
        outboundWhere.OR = [
          { phoneNumber: { contains: search } },
          { agent: { name: { contains: search, mode: 'insensitive' } } },
        ];
      }

      const outboundCalls = await prisma.outboundCall.findMany({
        where: outboundWhere,
        select: {
          id: true,
          phoneNumber: true,
          status: true,
          duration: true,
          startedAt: true,
          createdAt: true,
          agent: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      // Get voice sessions
      const sessionWhere: any = {
        agent: { organizationId },
        createdAt: { gte: dateFrom, lte: dateTo },
      };
      if (status && status !== 'all') {
        if (status === 'IN_PROGRESS') sessionWhere.status = 'ACTIVE';
        else if (status === 'COMPLETED') sessionWhere.status = 'COMPLETED';
        else sessionWhere.status = { in: ['ABANDONED', 'ERROR'] };
      }
      if (search) {
        sessionWhere.OR = [
          { visitorPhone: { contains: search } },
          { visitorName: { contains: search, mode: 'insensitive' } },
        ];
      }

      const voiceSessions = await prisma.voiceSession.findMany({
        where: sessionWhere,
        select: {
          id: true,
          visitorPhone: true,
          visitorName: true,
          status: true,
          duration: true,
          startedAt: true,
          createdAt: true,
          agent: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return [
        ...outboundCalls.map(c => ({
          id: c.id,
          agentName: c.agent?.name || 'AI Agent',
          callerNumber: c.phoneNumber,
          callerName: null,
          queueName: c.agent?.name || 'Outbound',
          startTime: c.startedAt?.toISOString() || c.createdAt.toISOString(),
          duration: c.duration || 0,
          status: c.status,
          type: 'AI' as const,
          isMonitored: false,
        })),
        ...voiceSessions.map(s => ({
          id: s.id,
          agentName: s.agent?.name || 'AI Agent',
          callerNumber: s.visitorPhone || 'Web Session',
          callerName: s.visitorName,
          queueName: s.agent?.name || 'Inbound',
          startTime: s.startedAt?.toISOString() || s.createdAt.toISOString(),
          duration: s.duration || 0,
          status: s.status === 'ACTIVE' ? 'IN_PROGRESS' : s.status === 'COMPLETED' ? 'COMPLETED' : 'FAILED',
          type: 'AI' as const,
          isMonitored: false,
        })),
      ].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()).slice(0, limit);
    } else {
      // Get human call logs
      const callLogWhere: any = {
        organizationId,
        callType: 'MANUAL',
        createdAt: { gte: dateFrom, lte: dateTo },
      };
      if (status && status !== 'all') {
        callLogWhere.status = status;
      }
      if (search) {
        callLogWhere.OR = [
          { phoneNumber: { contains: search } },
          { caller: { OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
          ]}},
        ];
      }

      const callLogs = await prisma.callLog.findMany({
        where: callLogWhere,
        include: {
          caller: { select: { firstName: true, lastName: true } },
          lead: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      // Get inbound calls
      const inboundWhere: any = {
        organizationId,
        answeredByUserId: { not: null },
        createdAt: { gte: dateFrom, lte: dateTo },
      };
      if (status && status !== 'all') {
        inboundWhere.status = status;
      }
      if (search) {
        inboundWhere.OR = [
          { callerNumber: { contains: search } },
          { callerName: { contains: search, mode: 'insensitive' } },
        ];
      }

      const inboundCalls = await prisma.inboundCallLog.findMany({
        where: inboundWhere,
        include: {
          queue: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return [
        ...callLogs.map(c => ({
          id: c.id,
          agentName: c.caller ? `${c.caller.firstName} ${c.caller.lastName}` : 'Telecaller',
          callerNumber: c.phoneNumber,
          callerName: c.lead ? `${c.lead.firstName} ${c.lead.lastName}` : null,
          queueName: 'Outbound',
          startTime: c.startedAt?.toISOString() || c.createdAt.toISOString(),
          duration: c.duration || 0,
          status: c.status,
          type: 'HUMAN' as const,
          isMonitored: false,
        })),
        ...inboundCalls.map(c => ({
          id: c.id,
          agentName: 'Telecaller',
          callerNumber: c.callerNumber,
          callerName: c.callerName,
          queueName: c.queue?.name || 'General',
          startTime: c.startedAt?.toISOString() || c.createdAt.toISOString(),
          duration: c.duration || 0,
          status: c.status,
          type: 'HUMAN' as const,
          isMonitored: false,
        })),
      ].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()).slice(0, limit);
    }
  }

  // === Get Agent Status ===
  async getAgentStatuses(organizationId: string, type: 'AI' | 'HUMAN') {
    if (type === 'AI') {
      const agents = await prisma.voiceAgent.findMany({
        where: { organizationId, isActive: true },
        select: { id: true, name: true },
      });

      // Get today's call counts per agent
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const callCounts = await prisma.outboundCall.groupBy({
        by: ['agentId'],
        where: {
          agentId: { in: agents.map(a => a.id) },
          createdAt: { gte: today },
        },
        _count: { id: true },
        _avg: { duration: true },
      });

      const callCountMap = new Map(callCounts.map(c => [c.agentId, { count: c._count.id, avgDuration: c._avg.duration || 0 }]));

      // Check for active calls
      const activeCalls = await prisma.outboundCall.findMany({
        where: {
          agentId: { in: agents.map(a => a.id) },
          status: 'IN_PROGRESS',
        },
        select: { agentId: true },
      });

      const activeAgentIds = new Set(activeCalls.map(c => c.agentId));

      return agents.map(agent => ({
        userId: agent.id,
        name: agent.name,
        status: activeAgentIds.has(agent.id) ? 'ON_CALL' : 'AVAILABLE',
        type: 'AI' as const,
        callsToday: callCountMap.get(agent.id)?.count || 0,
        avgHandleTime: Math.round(callCountMap.get(agent.id)?.avgDuration || 0),
      }));
    } else {
      // Get telecaller users
      const telecallers = await prisma.user.findMany({
        where: {
          organizationId,
          role: { name: { in: ['TELECALLER', 'AGENT', 'ADMIN'] } },
          isActive: true,
        },
        select: { id: true, firstName: true, lastName: true },
      });

      // Get today's call counts
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const callCounts = await prisma.callLog.groupBy({
        by: ['callerId'],
        where: {
          callerId: { in: telecallers.map(t => t.id) },
          createdAt: { gte: today },
        },
        _count: { id: true },
        _avg: { duration: true },
      });

      const callCountMap = new Map(callCounts.map(c => [c.callerId, { count: c._count.id, avgDuration: c._avg.duration || 0 }]));

      // Check for active calls
      const activeCalls = await prisma.callLog.findMany({
        where: {
          callerId: { in: telecallers.map(t => t.id) },
          status: 'IN_PROGRESS',
        },
        select: { callerId: true },
      });

      const activeCallerIds = new Set(activeCalls.map(c => c.callerId));

      return telecallers.map(user => ({
        userId: user.id,
        name: `${user.firstName} ${user.lastName}`,
        status: activeCallerIds.has(user.id) ? 'ON_CALL' : 'AVAILABLE',
        type: 'HUMAN' as const,
        callsToday: callCountMap.get(user.id)?.count || 0,
        avgHandleTime: Math.round(callCountMap.get(user.id)?.avgDuration || 0),
      }));
    }
  }
}

export const callMonitoringService = new CallMonitoringService();
