/**
 * Work Session Service
 * Tracks user work sessions (login/logout) and breaks
 */

import { prisma } from '../config/database';
import { WorkSessionStatus, BreakType } from '@prisma/client';

interface SessionFilters {
  organizationId: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
}

interface SessionSummary {
  userId: string;
  userName: string;
  loginTime: string;
  logoutTime: string;
  activeTime: number;
  breakTime: number;
  idleTime: number;
  totalCalls: number;
  avgCallDuration: number;
}

class WorkSessionService {
  /**
   * Start a new work session when user logs in
   */
  async startSession(userId: string, organizationId: string, metadata?: {
    ipAddress?: string;
    userAgent?: string;
    device?: string;
  }) {
    // End any existing active sessions for this user
    await prisma.workSession.updateMany({
      where: {
        userId,
        organizationId,
        status: { in: ['ACTIVE', 'ON_BREAK'] },
      },
      data: {
        status: 'EXPIRED',
        endedAt: new Date(),
      },
    });

    // Create new session
    const session = await prisma.workSession.create({
      data: {
        userId,
        organizationId,
        status: 'ACTIVE',
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
        device: metadata?.device,
      },
    });

    // Update User.workStatus to ACTIVE for team monitoring dashboard
    await prisma.user.update({
      where: { id: userId },
      data: {
        workStatus: 'ACTIVE',
        lastActivityAt: new Date(),
      },
    });

    return session;
  }

  /**
   * End the current work session (logout)
   */
  async endSession(userId: string, organizationId: string) {
    const session = await prisma.workSession.findFirst({
      where: {
        userId,
        organizationId,
        status: { in: ['ACTIVE', 'ON_BREAK'] },
      },
      orderBy: { startedAt: 'desc' },
    });

    if (!session) {
      return null;
    }

    const endedAt = new Date();
    const duration = Math.floor((endedAt.getTime() - session.startedAt.getTime()) / 1000);

    // Calculate idle time (total - active - break)
    const idleTime = Math.max(0, duration - session.activeTime - session.totalBreakTime);

    const updatedSession = await prisma.workSession.update({
      where: { id: session.id },
      data: {
        status: 'ENDED',
        endedAt,
        duration,
        idleTime,
      },
    });

    // Update User.workStatus to OFFLINE for team monitoring dashboard
    await prisma.user.update({
      where: { id: userId },
      data: { workStatus: 'OFFLINE' },
    });

    return updatedSession;
  }

  /**
   * Get current active session for a user
   */
  async getActiveSession(userId: string, organizationId: string) {
    return prisma.workSession.findFirst({
      where: {
        userId,
        organizationId,
        status: { in: ['ACTIVE', 'ON_BREAK'] },
      },
      orderBy: { startedAt: 'desc' },
      include: {
        breaks: {
          where: { endedAt: null },
        },
      },
    });
  }

  /**
   * Start a break
   */
  async startBreak(userId: string, organizationId: string, breakType: BreakType = 'SHORT', reason?: string) {
    const session = await this.getActiveSession(userId, organizationId);
    if (!session) {
      throw new Error('No active session found');
    }

    if (session.status === 'ON_BREAK') {
      throw new Error('Already on a break');
    }

    // Update session status
    await prisma.workSession.update({
      where: { id: session.id },
      data: { status: 'ON_BREAK' },
    });

    // Also update User.workStatus for team monitoring dashboard sync
    await prisma.user.update({
      where: { id: userId },
      data: { workStatus: 'ON_BREAK' },
    });

    // Create break record
    const breakRecord = await prisma.userBreak.create({
      data: {
        userId,
        organizationId,
        workSessionId: session.id,
        breakType,
        reason,
      },
    });

    return breakRecord;
  }

  /**
   * End current break
   */
  async endBreak(userId: string, organizationId: string) {
    const session = await this.getActiveSession(userId, organizationId);
    if (!session) {
      throw new Error('No active session found');
    }

    // Find active break
    const activeBreak = await prisma.userBreak.findFirst({
      where: {
        userId,
        workSessionId: session.id,
        endedAt: null,
      },
      orderBy: { startedAt: 'desc' },
    });

    if (!activeBreak) {
      throw new Error('No active break found');
    }

    const endedAt = new Date();
    const duration = Math.floor((endedAt.getTime() - activeBreak.startedAt.getTime()) / 1000);

    // Update break record
    const updatedBreak = await prisma.userBreak.update({
      where: { id: activeBreak.id },
      data: {
        endedAt,
        duration,
      },
    });

    // Update session total break time and status
    await prisma.workSession.update({
      where: { id: session.id },
      data: {
        status: 'ACTIVE',
        totalBreakTime: { increment: duration },
      },
    });

    // Also update User.workStatus for team monitoring dashboard sync
    await prisma.user.update({
      where: { id: userId },
      data: {
        workStatus: 'ACTIVE',
        lastActivityAt: new Date(),
      },
    });

    return updatedBreak;
  }

  /**
   * Update active time (called when user completes a call or activity)
   */
  async addActiveTime(userId: string, organizationId: string, seconds: number) {
    const session = await this.getActiveSession(userId, organizationId);
    if (!session) return null;

    return prisma.workSession.update({
      where: { id: session.id },
      data: {
        activeTime: { increment: seconds },
      },
    });
  }

  /**
   * Get session summary for reporting
   */
  async getSessionSummary(filters: SessionFilters): Promise<SessionSummary[]> {
    const { organizationId, userId, startDate, endDate } = filters;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // For endDate, set to end of day (23:59:59) to include all sessions on that day
    let effectiveEndDate = endDate || tomorrow;
    if (endDate) {
      effectiveEndDate = new Date(endDate);
      effectiveEndDate.setHours(23, 59, 59, 999);
    }

    console.log('[WorkSession] getSessionSummary filters:', {
      organizationId,
      startDate: startDate || today,
      endDate: effectiveEndDate,
    });

    const sessions = await prisma.workSession.findMany({
      where: {
        organizationId,
        ...(userId && { userId }),
        startedAt: {
          gte: startDate || today,
          lte: effectiveEndDate,
        },
      },
      include: {
        user: {
          select: { firstName: true, lastName: true },
        },
        breaks: true,
      },
      orderBy: { startedAt: 'desc' },
    });

    // Group by user and aggregate
    const userSessions = new Map<string, {
      sessions: typeof sessions;
      userName: string;
    }>();

    for (const session of sessions) {
      const existing = userSessions.get(session.userId);
      if (existing) {
        existing.sessions.push(session);
      } else {
        userSessions.set(session.userId, {
          sessions: [session],
          userName: `${session.user.firstName || ''} ${session.user.lastName || ''}`.trim(),
        });
      }
    }

    // Get call data for these users
    const userIds = Array.from(userSessions.keys());
    const callData = await prisma.telecallerCall.groupBy({
      by: ['telecallerId'],
      where: {
        telecallerId: { in: userIds },
        createdAt: {
          gte: startDate || today,
          lte: effectiveEndDate,
        },
      },
      _count: { id: true },
      _sum: { duration: true },
    });

    const callMap = new Map(callData.map(c => [c.telecallerId, {
      totalCalls: c._count.id,
      totalDuration: Number(c._sum.duration || 0),
    }]));

    // Build summary for each user
    const summaries: SessionSummary[] = [];

    for (const [userId, data] of userSessions) {
      const { sessions: userSessionsList, userName } = data;
      const calls = callMap.get(userId) || { totalCalls: 0, totalDuration: 0 };

      // Get first login and last logout
      const firstSession = userSessionsList[userSessionsList.length - 1];
      const lastSession = userSessionsList[0];

      // Calculate times dynamically
      let totalSessionDuration = 0;
      let totalBreakTime = 0;
      const now = new Date();

      for (const session of userSessionsList) {
        // Calculate session duration (from login to logout or now)
        const endTime = session.endedAt || now;
        const sessionDuration = Math.floor((endTime.getTime() - session.startedAt.getTime()) / 1000);
        totalSessionDuration += sessionDuration;

        // Sum break time from stored value
        totalBreakTime += session.totalBreakTime || 0;
      }

      // Active Time = Total Session Duration - Break Time
      const totalActiveTime = Math.max(0, totalSessionDuration - totalBreakTime);

      // Idle time is only calculated for ended sessions
      const totalIdleTime = lastSession.endedAt ? (lastSession.idleTime || 0) : 0;

      summaries.push({
        userId,
        userName,
        loginTime: firstSession.startedAt.toISOString(),
        logoutTime: lastSession.endedAt?.toISOString() || '-',
        activeTime: totalActiveTime,
        breakTime: totalBreakTime,
        idleTime: totalIdleTime,
        totalCalls: calls.totalCalls,
        avgCallDuration: calls.totalCalls > 0 ? Math.round(calls.totalDuration / calls.totalCalls) : 0,
      });
    }

    return summaries;
  }

  /**
   * Get all breaks for a user in a date range
   */
  async getUserBreaks(userId: string, organizationId: string, startDate?: Date, endDate?: Date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return prisma.userBreak.findMany({
      where: {
        userId,
        organizationId,
        startedAt: {
          gte: startDate || today,
          lte: endDate || tomorrow,
        },
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  /**
   * Get organization-wide session stats
   */
  async getOrganizationStats(organizationId: string, startDate?: Date, endDate?: Date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // For endDate, set to end of day (23:59:59) to include all sessions on that day
    let effectiveEndDate = endDate || tomorrow;
    if (endDate) {
      effectiveEndDate = new Date(endDate);
      effectiveEndDate.setHours(23, 59, 59, 999);
    }

    console.log('[WorkSession] getOrganizationStats filters:', {
      organizationId,
      startDate: startDate || today,
      endDate: effectiveEndDate,
    });

    // Get all sessions for the date range
    const sessions = await prisma.workSession.findMany({
      where: {
        organizationId,
        startedAt: {
          gte: startDate || today,
          lte: effectiveEndDate,
        },
      },
    });

    console.log('[WorkSession] Found sessions:', sessions.length);

    const now = new Date();
    let totalSessionDuration = 0;
    let totalBreakTime = 0;
    let totalIdleTime = 0;

    for (const session of sessions) {
      // Calculate session duration dynamically
      const endTime = session.endedAt || now;
      const sessionDuration = Math.floor((endTime.getTime() - session.startedAt.getTime()) / 1000);
      totalSessionDuration += sessionDuration;
      totalBreakTime += session.totalBreakTime || 0;
      totalIdleTime += session.idleTime || 0;
    }

    // Active time = Total session duration - Break time
    const totalActiveTime = Math.max(0, totalSessionDuration - totalBreakTime);

    const activeUsers = await prisma.workSession.groupBy({
      by: ['userId'],
      where: {
        organizationId,
        status: { in: ['ACTIVE', 'ON_BREAK'] },
      },
    });

    return {
      totalSessions: sessions.length,
      totalActiveTime,
      totalBreakTime,
      totalIdleTime,
      totalDuration: totalSessionDuration,
      activeUsersCount: activeUsers.length,
    };
  }

  /**
   * Get all team members' current work status (for admins/managers)
   */
  async getTeamWorkStatus(organizationId: string): Promise<{
    active: { id: string; name: string; since: Date }[];
    onBreak: { id: string; name: string; since: Date; breakType: string }[];
    offline: { id: string; name: string; lastSeen?: Date }[];
  }> {
    // Get all active users in the organization
    const users = await prisma.user.findMany({
      where: {
        organizationId,
        isActive: true,
        role: { slug: { in: ['telecaller', 'counselor', 'sales_rep', 'manager', 'team_lead'] } },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        lastActivityAt: true,
      },
    });

    // Get all active work sessions
    const activeSessions = await prisma.workSession.findMany({
      where: {
        organizationId,
        status: { in: ['ACTIVE', 'ON_BREAK'] },
      },
      include: {
        user: { select: { firstName: true, lastName: true } },
        breaks: { where: { endedAt: null } },
      },
    });

    const sessionMap = new Map(activeSessions.map(s => [s.userId, s]));

    // Consider session stale if no activity for 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    const active: { id: string; name: string; since: Date }[] = [];
    const onBreak: { id: string; name: string; since: Date; breakType: string }[] = [];
    const offline: { id: string; name: string; lastSeen?: Date }[] = [];

    for (const user of users) {
      const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown';
      const session = sessionMap.get(user.id);

      // Check if user has been active recently (within 30 minutes)
      const isRecentlyActive = user.lastActivityAt && user.lastActivityAt > thirtyMinutesAgo;

      if (!session || !isRecentlyActive) {
        // No active session OR no recent activity = offline
        offline.push({
          id: user.id,
          name,
          lastSeen: user.lastActivityAt || undefined,
        });
      } else if (session.status === 'ON_BREAK' && session.breaks.length > 0) {
        // On break
        const currentBreak = session.breaks[0];
        onBreak.push({
          id: user.id,
          name,
          since: currentBreak.startedAt,
          breakType: currentBreak.breakType,
        });
      } else {
        // Active = has session AND recent activity
        active.push({
          id: user.id,
          name,
          since: session.startedAt,
        });
      }
    }

    return { active, onBreak, offline };
  }

  /**
   * Get session history for login report
   */
  async getSessionHistory(organizationId: string, startDate?: Date, endDate?: Date) {
    const now = new Date();
    const effectiveStartDate = startDate || new Date(now.getFullYear(), now.getMonth(), 1);
    let effectiveEndDate = endDate || now;

    // Include full end day
    if (endDate) {
      effectiveEndDate = new Date(endDate);
      effectiveEndDate.setHours(23, 59, 59, 999);
    }

    const sessions = await prisma.workSession.findMany({
      where: {
        organizationId,
        startedAt: {
          gte: effectiveStartDate,
          lte: effectiveEndDate,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            manager: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: { startedAt: 'desc' },
    });

    return sessions;
  }
}

export const workSessionService = new WorkSessionService();
