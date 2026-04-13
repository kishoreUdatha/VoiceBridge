/**
 * User Trends Service
 * Provides user-based metrics: call time, breaks, calls per user
 */

import { prisma } from '../config/database';

interface TrendsFilters {
  organizationId: string;
  startDate?: string;
  endDate?: string;
  userId?: string; // Can be comma-separated for multiple users
}

// Helper to parse comma-separated userIds
function parseUserIds(userId?: string): string[] | undefined {
  if (!userId) return undefined;
  return userId.split(',').map(id => id.trim()).filter(id => id);
}

interface UserCallMetric {
  userId: string;
  userName: string;
  totalCalls: number;
  connectedCalls: number;
  totalDuration: number; // in minutes
}

interface UserLeadMetric {
  userId: string;
  userName: string;
  closedLeads: number;
  convertedLeads: number;
}

interface UserLostLeadMetric {
  userId: string;
  userName: string;
  lostLeads: number;
}

interface UserBreakMetric {
  userId: string;
  userName: string;
  totalBreakTime: number; // in minutes
  totalBreaks: number;
}

interface SummaryWithComparison {
  current: {
    value: number;
    startDate: string;
    endDate: string;
  };
  previous: {
    value: number;
    startDate: string;
    endDate: string;
  };
  percentChange: number;
}

class UserTrendsService {
  /**
   * Get summary metrics with comparison to previous period
   */
  async getSummary(filters: TrendsFilters) {
    const { organizationId, startDate, endDate } = filters;

    // Current period
    const currentEnd = endDate ? new Date(endDate) : new Date();
    currentEnd.setHours(23, 59, 59, 999); // Include full day
    const currentStart = startDate ? new Date(startDate) : new Date(currentEnd.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Calculate period length for previous comparison
    const periodLength = currentEnd.getTime() - currentStart.getTime();
    const previousEnd = new Date(currentStart.getTime() - 1); // Day before current start
    const previousStart = new Date(previousEnd.getTime() - periodLength);

    // Get current period call data from callLog
    const currentCallLogs = await prisma.callLog.findMany({
      where: {
        organizationId,
        startedAt: { gte: currentStart, lte: currentEnd },
      },
      select: { duration: true, status: true },
    });

    // Get current period telecaller calls
    const currentTelecallerCalls = await prisma.telecallerCall.findMany({
      where: {
        organizationId,
        startedAt: { gte: currentStart, lte: currentEnd },
      },
      select: { duration: true, status: true },
    });

    // Combine current calls
    const currentCalls = [
      ...currentCallLogs.map(c => ({ duration: c.duration, status: c.status })),
      ...currentTelecallerCalls.map(c => ({ duration: c.duration, status: c.status })),
    ];

    // Get previous period call data from callLog
    const previousCallLogs = await prisma.callLog.findMany({
      where: {
        organizationId,
        startedAt: { gte: previousStart, lte: previousEnd },
      },
      select: { duration: true, status: true },
    });

    // Get previous period telecaller calls
    const previousTelecallerCalls = await prisma.telecallerCall.findMany({
      where: {
        organizationId,
        startedAt: { gte: previousStart, lte: previousEnd },
      },
      select: { duration: true, status: true },
    });

    // Combine previous calls
    const previousCalls = [
      ...previousCallLogs.map(c => ({ duration: c.duration, status: c.status })),
      ...previousTelecallerCalls.map(c => ({ duration: c.duration, status: c.status })),
    ];

    // Get current period breaks
    const currentBreaks = await prisma.userBreak.findMany({
      where: {
        organizationId,
        startedAt: { gte: currentStart, lte: currentEnd },
      },
      select: { duration: true },
    });

    // Get previous period breaks
    const previousBreaks = await prisma.userBreak.findMany({
      where: {
        organizationId,
        startedAt: { gte: previousStart, lte: previousEnd },
      },
      select: { duration: true },
    });

    // Calculate metrics
    const currentTotalCallTime = currentCalls.reduce((sum, c) => sum + (c.duration || 0), 0) / 60; // minutes
    const previousTotalCallTime = previousCalls.reduce((sum, c) => sum + (c.duration || 0), 0) / 60;

    const currentAvgCallTime = currentCalls.length > 0 ? currentTotalCallTime / currentCalls.length : 0;
    const previousAvgCallTime = previousCalls.length > 0 ? previousTotalCallTime / previousCalls.length : 0;

    const currentTotalBreakTime = currentBreaks.reduce((sum, b) => sum + (b.duration || 0), 0) / 60; // minutes
    const previousTotalBreakTime = previousBreaks.reduce((sum, b) => sum + (b.duration || 0), 0) / 60;

    const currentAvgBreaks = currentBreaks.length;
    const previousAvgBreaks = previousBreaks.length;

    const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const calcPercentChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      averageCallTime: {
        current: {
          value: Math.round(currentAvgCallTime * 100) / 100,
          startDate: formatDate(currentStart),
          endDate: formatDate(currentEnd),
        },
        previous: {
          value: Math.round(previousAvgCallTime * 100) / 100,
          startDate: formatDate(previousStart),
          endDate: formatDate(previousEnd),
        },
        percentChange: Math.round(calcPercentChange(currentAvgCallTime, previousAvgCallTime) * 100) / 100,
      },
      totalBreakTime: {
        current: {
          value: Math.round(currentTotalBreakTime * 100) / 100,
          startDate: formatDate(currentStart),
          endDate: formatDate(currentEnd),
        },
        previous: {
          value: Math.round(previousTotalBreakTime * 100) / 100,
          startDate: formatDate(previousStart),
          endDate: formatDate(previousEnd),
        },
        percentChange: Math.round(calcPercentChange(currentTotalBreakTime, previousTotalBreakTime) * 100) / 100,
      },
      totalCallTime: {
        current: {
          value: Math.round(currentTotalCallTime * 100) / 100,
          startDate: formatDate(currentStart),
          endDate: formatDate(currentEnd),
        },
        previous: {
          value: Math.round(previousTotalCallTime * 100) / 100,
          startDate: formatDate(previousStart),
          endDate: formatDate(previousEnd),
        },
        percentChange: Math.round(calcPercentChange(currentTotalCallTime, previousTotalCallTime) * 100) / 100,
      },
      averageBreaks: {
        current: {
          value: currentAvgBreaks,
          startDate: formatDate(currentStart),
          endDate: formatDate(currentEnd),
        },
        previous: {
          value: previousAvgBreaks,
          startDate: formatDate(previousStart),
          endDate: formatDate(previousEnd),
        },
        percentChange: Math.round(calcPercentChange(currentAvgBreaks, previousAvgBreaks) * 100) / 100,
      },
    };
  }

  /**
   * Get calls per user
   */
  async getCallsPerUser(filters: TrendsFilters): Promise<UserCallMetric[]> {
    const { organizationId, startDate, endDate, userId } = filters;
    const userIds = parseUserIds(userId);

    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999); // Include full day
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get all calls from callLog with caller info
    const callLogs = await prisma.callLog.findMany({
      where: {
        organizationId,
        startedAt: { gte: start, lte: end },
        ...(userIds && userIds.length > 0 && { callerId: { in: userIds } }),
      },
      select: {
        callerId: true,
        status: true,
        duration: true,
        caller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Get telecaller calls
    const telecallerCalls = await prisma.telecallerCall.findMany({
      where: {
        organizationId,
        startedAt: { gte: start, lte: end },
        ...(userIds && userIds.length > 0 && { telecallerId: { in: userIds } }),
      },
      select: {
        telecallerId: true,
        status: true,
        duration: true,
        telecaller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Group by user
    const userMap = new Map<string, UserCallMetric>();

    // Process callLog entries
    callLogs.forEach(call => {
      const usrId = call.callerId;
      const userName = `${call.caller.firstName || ''} ${call.caller.lastName || ''}`.trim() || 'Unknown';

      if (!userMap.has(usrId)) {
        userMap.set(usrId, {
          userId: usrId,
          userName,
          totalCalls: 0,
          connectedCalls: 0,
          totalDuration: 0,
        });
      }

      const metrics = userMap.get(usrId)!;
      metrics.totalCalls++;
      if (call.status === 'COMPLETED' || call.status === 'IN_PROGRESS') {
        metrics.connectedCalls++;
      }
      metrics.totalDuration += (call.duration || 0) / 60; // Convert to minutes
    });

    // Process telecaller calls
    telecallerCalls.forEach(call => {
      const usrId = call.telecallerId;
      const userName = `${call.telecaller.firstName || ''} ${call.telecaller.lastName || ''}`.trim() || 'Unknown';

      if (!userMap.has(usrId)) {
        userMap.set(usrId, {
          userId: usrId,
          userName,
          totalCalls: 0,
          connectedCalls: 0,
          totalDuration: 0,
        });
      }

      const metrics = userMap.get(usrId)!;
      metrics.totalCalls++;
      if (call.status === 'COMPLETED' || call.status === 'CONNECTED') {
        metrics.connectedCalls++;
      }
      metrics.totalDuration += (call.duration || 0) / 60; // Convert to minutes
    });

    // Sort by total calls descending
    return Array.from(userMap.values())
      .sort((a, b) => b.totalCalls - a.totalCalls);
  }

  /**
   * Get call duration per user
   */
  async getDurationPerUser(filters: TrendsFilters): Promise<{ userId: string; userName: string; duration: number }[]> {
    const { organizationId, startDate, endDate, userId } = filters;
    const userIds = parseUserIds(userId);

    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999); // Include full day
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get callLog entries
    const callLogs = await prisma.callLog.findMany({
      where: {
        organizationId,
        startedAt: { gte: start, lte: end },
        duration: { not: null },
        ...(userIds && userIds.length > 0 && { callerId: { in: userIds } }),
      },
      select: {
        callerId: true,
        duration: true,
        caller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Get telecaller calls
    const telecallerCalls = await prisma.telecallerCall.findMany({
      where: {
        organizationId,
        startedAt: { gte: start, lte: end },
        duration: { not: null },
        ...(userIds && userIds.length > 0 && { telecallerId: { in: userIds } }),
      },
      select: {
        telecallerId: true,
        duration: true,
        telecaller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Group by user
    const userMap = new Map<string, { userId: string; userName: string; duration: number }>();

    // Process callLog
    callLogs.forEach(call => {
      const usrId = call.callerId;
      const userName = `${call.caller.firstName || ''} ${call.caller.lastName || ''}`.trim() || 'Unknown';

      if (!userMap.has(usrId)) {
        userMap.set(usrId, { userId: usrId, userName, duration: 0 });
      }

      userMap.get(usrId)!.duration += (call.duration || 0) / 60; // minutes
    });

    // Process telecaller calls
    telecallerCalls.forEach(call => {
      const usrId = call.telecallerId;
      const userName = `${call.telecaller.firstName || ''} ${call.telecaller.lastName || ''}`.trim() || 'Unknown';

      if (!userMap.has(usrId)) {
        userMap.set(usrId, { userId: usrId, userName, duration: 0 });
      }

      userMap.get(usrId)!.duration += (call.duration || 0) / 60; // minutes
    });

    return Array.from(userMap.values())
      .map(u => ({ ...u, duration: Math.round(u.duration * 100) / 100 }))
      .sort((a, b) => b.duration - a.duration);
  }

  /**
   * Get leads closed vs converted per user
   */
  async getLeadsClosedConvertedPerUser(filters: TrendsFilters): Promise<UserLeadMetric[]> {
    const { organizationId, startDate, endDate, userId } = filters;
    const userIds = parseUserIds(userId);

    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999); // Include full day
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get all leads with their assignments and stages
    const leads = await prisma.lead.findMany({
      where: {
        organizationId,
        createdAt: { gte: start, lte: end },
        ...(userIds && userIds.length > 0 && { assignments: { some: { assignedToId: { in: userIds }, isActive: true } } }),
      },
      select: {
        id: true,
        isConverted: true,
        stage: {
          select: {
            autoSyncStatus: true,
          },
        },
        assignments: {
          where: { isActive: true },
          select: {
            assignedTo: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          take: 1,
        },
      },
    });

    // Group by user
    const userMap = new Map<string, UserLeadMetric>();

    leads.forEach(lead => {
      const assignment = lead.assignments[0];
      if (!assignment) return;

      const user = assignment.assignedTo;
      const usrId = user.id;
      const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown';

      if (!userMap.has(usrId)) {
        userMap.set(usrId, {
          userId: usrId,
          userName,
          closedLeads: 0,
          convertedLeads: 0,
        });
      }

      const metrics = userMap.get(usrId)!;

      // Closed = stage is WON
      if (lead.stage?.autoSyncStatus === 'WON') {
        metrics.closedLeads++;
      }

      // Converted
      if (lead.isConverted) {
        metrics.convertedLeads++;
      }
    });

    return Array.from(userMap.values())
      .sort((a, b) => b.closedLeads - a.closedLeads);
  }

  /**
   * Get lost leads per user
   */
  async getLostLeadsPerUser(filters: TrendsFilters): Promise<UserLostLeadMetric[]> {
    const { organizationId, startDate, endDate, userId } = filters;
    const userIds = parseUserIds(userId);

    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999); // Include full day
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get leads with LOST stage
    const leads = await prisma.lead.findMany({
      where: {
        organizationId,
        createdAt: { gte: start, lte: end },
        stage: {
          autoSyncStatus: 'LOST',
        },
        ...(userIds && userIds.length > 0 && { assignments: { some: { assignedToId: { in: userIds }, isActive: true } } }),
      },
      select: {
        id: true,
        assignments: {
          where: { isActive: true },
          select: {
            assignedTo: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          take: 1,
        },
      },
    });

    // Group by user
    const userMap = new Map<string, UserLostLeadMetric>();

    leads.forEach(lead => {
      const assignment = lead.assignments[0];
      if (!assignment) return;

      const user = assignment.assignedTo;
      const usrId = user.id;
      const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown';

      if (!userMap.has(usrId)) {
        userMap.set(usrId, {
          userId: usrId,
          userName,
          lostLeads: 0,
        });
      }

      userMap.get(usrId)!.lostLeads++;
    });

    return Array.from(userMap.values())
      .sort((a, b) => b.lostLeads - a.lostLeads);
  }

  /**
   * Get breaks per user (break time and break count)
   */
  async getBreaksPerUser(filters: TrendsFilters): Promise<UserBreakMetric[]> {
    const { organizationId, startDate, endDate, userId } = filters;
    const userIds = parseUserIds(userId);

    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999); // Include full day
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get all breaks with user info
    const breaks = await prisma.userBreak.findMany({
      where: {
        organizationId,
        startedAt: { gte: start, lte: end },
        ...(userIds && userIds.length > 0 && { userId: { in: userIds } }),
      },
      select: {
        userId: true,
        duration: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Group by user
    const userMap = new Map<string, UserBreakMetric>();

    breaks.forEach(brk => {
      const usrId = brk.userId;
      const userName = `${brk.user.firstName || ''} ${brk.user.lastName || ''}`.trim() || 'Unknown';

      if (!userMap.has(usrId)) {
        userMap.set(usrId, {
          userId: usrId,
          userName,
          totalBreakTime: 0,
          totalBreaks: 0,
        });
      }

      const metrics = userMap.get(usrId)!;
      metrics.totalBreaks++;
      metrics.totalBreakTime += (brk.duration || 0) / 60; // Convert seconds to minutes
    });

    return Array.from(userMap.values())
      .map(u => ({ ...u, totalBreakTime: Math.round(u.totalBreakTime * 100) / 100 }))
      .sort((a, b) => b.totalBreakTime - a.totalBreakTime);
  }

  /**
   * Get users list for filter dropdown
   */
  async getUsers(organizationId: string) {
    const users = await prisma.user.findMany({
      where: { organizationId, isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
      orderBy: { firstName: 'asc' },
    });

    return users.map(u => ({
      id: u.id,
      name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Unknown',
    }));
  }

  /**
   * Get comprehensive report
   */
  async getComprehensiveReport(filters: TrendsFilters) {
    const [summary, callsPerUser, durationPerUser, leadsClosedConverted, lostLeads, breaksPerUser] = await Promise.all([
      this.getSummary(filters),
      this.getCallsPerUser(filters),
      this.getDurationPerUser(filters),
      this.getLeadsClosedConvertedPerUser(filters),
      this.getLostLeadsPerUser(filters),
      this.getBreaksPerUser(filters),
    ]);

    return { summary, callsPerUser, durationPerUser, leadsClosedConverted, lostLeads, breaksPerUser };
  }
}

export const userTrendsService = new UserTrendsService();
