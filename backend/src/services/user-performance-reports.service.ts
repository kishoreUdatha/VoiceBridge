/**
 * User Performance Reports Service
 * Tenant-scoped staff performance tracking
 *
 * SECURITY: All reports filtered by organizationId from JWT token
 */

import { prisma } from '../config/database';
import { Prisma } from '@prisma/client';
import { userService } from './user.service';

interface DateRange {
  start: Date;
  end: Date;
}

interface ReportFilters {
  organizationId: string;
  dateRange?: DateRange;
  userId?: string;
  branchId?: string;
  roleId?: string;
  // Role-based filtering
  currentUserRole?: string;
  currentUserId?: string;
}

interface UserPerformanceSummary {
  userId: string;
  userName: string;
  email: string;
  role: string;
  branch: string | null;
  leadsHandled: number;
  leadsAssigned: number;
  callsMade: number;
  callsConnected: number;
  followUpsCompleted: number;
  followUpsPending: number;
  conversions: number;
  conversionRate: string;
  closureValue: number;
  avgResponseTime: number; // minutes
  lastActivity: Date | null;
}

// Extended User Report data for comprehensive user report
interface UserReportData {
  userId: string;
  username: string;
  reportingManager: string;
  mobileNumber: string;
  date: string;
  // Calls
  totalCalls: number;
  totalCallsConnected: number;
  totalUnconnectedCalls: number;
  // Outgoing
  totalOutgoingCalls: number;
  outgoingConnectedCalls: number;
  outgoingUnansweredCalls: number;
  avgOutgoingCallDuration: number;
  // Incoming
  totalIncomingCalls: number;
  incomingConnectedCalls: number;
  incomingUnansweredCalls: number;
  avgIncomingCallDuration: number;
  // Disposition
  totalDisposedCount: number;
  disposedYesConnectedCount: number;
  disposedNotConnectedCount: number;
  // Leads
  totalInprogressLeads: number;
  totalConvertedLeads: number;
  totalLostLeads: number;
  // Follow-ups
  followUpDueToday: number;
  // Call metrics
  avgStartCallingTime: string;
  avgCallDuration: number;
  avgFormFillingTime: number;
  totalCallDuration: number;
  // Breaks
  totalBreaks: number;
  totalBreakDuration: number;
  // Messaging
  totalWhatsappSent: number;
  totalEmailsSent: number;
  totalSmsSent: number;
}

interface LeadsPerUser {
  userId: string;
  userName: string;
  totalAssigned: number;
  newLeads: number;
  contacted: number;
  qualified: number;
  converted: number;
  lost: number;
}

interface CallsPerUser {
  userId: string;
  userName: string;
  totalCalls: number;
  connectedCalls: number;
  missedCalls: number;
  avgDuration: number;
  totalDuration: number;
  callbacksScheduled: number;
}

interface FollowUpsPerUser {
  userId: string;
  userName: string;
  totalScheduled: number;
  completed: number;
  pending: number;
  overdue: number;
  completionRate: string;
}

interface ConversionPerUser {
  userId: string;
  userName: string;
  leadsAssigned: number;
  conversions: number;
  conversionRate: string;
  avgConversionTime: number; // days
  closureValue: number;
}

interface ActivityLog {
  userId: string;
  userName: string;
  date: string;
  loginTime: Date | null;
  logoutTime: Date | null;
  activeHours: number;
  leadsWorked: number;
  callsMade: number;
  followUpsCompleted: number;
}

interface LoginReport {
  userId: string;
  userName: string;
  totalLogins: number;
  lastLogin: Date | null;
  avgSessionDuration: number; // minutes
  loginDays: number;
  ipAddresses: string[];
}

class UserPerformanceReportsService {
  private getDefaultDateRange(): DateRange {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return { start, end };
  }

  /**
   * 1. USER PERFORMANCE SUMMARY
   */
  async getUserPerformanceSummary(filters: ReportFilters): Promise<UserPerformanceSummary[]> {
    const { organizationId, dateRange = this.getDefaultDateRange(), branchId, roleId } = filters;

    // Get all users in organization
    const users = await prisma.user.findMany({
      where: {
        organizationId,
        isActive: true,
        ...(branchId && { branchId }),
        ...(roleId && { roleId }),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: { select: { name: true } },
        branch: { select: { name: true } },
      },
    });

    const results: UserPerformanceSummary[] = [];

    for (const user of users) {
      // Get leads stats
      const leadsAssigned = await prisma.leadAssignment.count({
        where: {
          assignedToId: user.id,
          createdAt: { gte: dateRange.start, lte: dateRange.end },
        },
      });

      const leadsHandled = await prisma.leadActivity.count({
        where: {
          userId: user.id,
          createdAt: { gte: dateRange.start, lte: dateRange.end },
        },
      });

      // Get calls stats
      const calls = await prisma.telecallerCall.aggregate({
        where: {
          telecallerId: user.id,
          createdAt: { gte: dateRange.start, lte: dateRange.end },
        },
        _count: { id: true },
      });

      const connectedCalls = await prisma.telecallerCall.count({
        where: {
          telecallerId: user.id,
          status: 'COMPLETED',
          createdAt: { gte: dateRange.start, lte: dateRange.end },
        },
      });

      // Get follow-ups
      const followUpsCompleted = await prisma.followUp.count({
        where: {
          assigneeId: user.id,
          status: 'COMPLETED',
          updatedAt: { gte: dateRange.start, lte: dateRange.end },
        },
      });

      const followUpsPending = await prisma.followUp.count({
        where: {
          assigneeId: user.id,
          status: 'PENDING',
        },
      });

      // Get conversions (admissions closed by user)
      const conversions = await prisma.admission.count({
        where: {
          closedById: user.id,
          createdAt: { gte: dateRange.start, lte: dateRange.end },
        },
      });

      // Get closure value
      const closureValue = await prisma.admission.aggregate({
        where: {
          closedById: user.id,
          createdAt: { gte: dateRange.start, lte: dateRange.end },
        },
        _sum: { totalFee: true },
      });

      // Get last activity
      const lastActivity = await prisma.leadActivity.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });

      results.push({
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        role: user.role?.name || 'N/A',
        branch: user.branch?.name || null,
        leadsHandled,
        leadsAssigned,
        callsMade: calls._count.id || 0,
        callsConnected: connectedCalls,
        followUpsCompleted,
        followUpsPending,
        conversions,
        conversionRate: leadsAssigned > 0 ? ((conversions / leadsAssigned) * 100).toFixed(1) : '0',
        closureValue: Number(closureValue._sum.totalFee || 0),
        avgResponseTime: 0, // Would need more complex calculation
        lastActivity: lastActivity?.createdAt || null,
      });
    }

    return results.sort((a, b) => b.conversions - a.conversions);
  }

  /**
   * 2. LEADS PER USER
   */
  async getLeadsPerUser(filters: ReportFilters): Promise<LeadsPerUser[]> {
    const { organizationId, dateRange = this.getDefaultDateRange() } = filters;

    const users = await prisma.user.findMany({
      where: { organizationId, isActive: true },
      select: { id: true, firstName: true, lastName: true },
    });

    const results: LeadsPerUser[] = [];

    for (const user of users) {
      const assignments = await prisma.leadAssignment.findMany({
        where: {
          assignedToId: user.id,
          createdAt: { gte: dateRange.start, lte: dateRange.end },
        },
        include: {
          lead: { select: { stage: { select: { name: true, category: true } } } },
        },
      });

      const stageCounts = {
        new: 0,
        contacted: 0,
        qualified: 0,
        converted: 0,
        lost: 0,
      };

      for (const assignment of assignments) {
        const category = assignment.lead.stage?.category?.toLowerCase() || '';
        if (category === 'new') stageCounts.new++;
        else if (category === 'contacted' || category === 'working') stageCounts.contacted++;
        else if (category === 'qualified') stageCounts.qualified++;
        else if (category === 'won' || category === 'converted') stageCounts.converted++;
        else if (category === 'lost' || category === 'closed') stageCounts.lost++;
      }

      results.push({
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`.trim(),
        totalAssigned: assignments.length,
        ...stageCounts,
      });
    }

    return results.filter(r => r.totalAssigned > 0).sort((a, b) => b.totalAssigned - a.totalAssigned);
  }

  /**
   * 3. CALLS PER USER
   */
  async getCallsPerUser(filters: ReportFilters): Promise<CallsPerUser[]> {
    const { organizationId, dateRange = this.getDefaultDateRange() } = filters;

    const users = await prisma.user.findMany({
      where: { organizationId, isActive: true },
      select: { id: true, firstName: true, lastName: true },
    });

    const results: CallsPerUser[] = [];

    for (const user of users) {
      const calls = await prisma.telecallerCall.findMany({
        where: {
          telecallerId: user.id,
          createdAt: { gte: dateRange.start, lte: dateRange.end },
        },
        select: { status: true, duration: true },
      });

      const totalCalls = calls.length;
      const connectedCalls = calls.filter(c => c.status === 'COMPLETED').length;
      const missedCalls = calls.filter(c => c.status === 'NO_ANSWER' || c.status === 'FAILED').length;
      const totalDuration = calls.reduce((sum, c) => sum + (c.duration || 0), 0);

      // Get scheduled callbacks
      const callbacksScheduled = await prisma.followUp.count({
        where: {
          assigneeId: user.id,
          type: 'CALL',
          status: 'PENDING',
        },
      });

      if (totalCalls > 0) {
        results.push({
          userId: user.id,
          userName: `${user.firstName} ${user.lastName}`.trim(),
          totalCalls,
          connectedCalls,
          missedCalls,
          avgDuration: connectedCalls > 0 ? Math.round(totalDuration / connectedCalls) : 0,
          totalDuration,
          callbacksScheduled,
        });
      }
    }

    return results.sort((a, b) => b.totalCalls - a.totalCalls);
  }

  /**
   * 4. FOLLOW-UPS PER USER
   */
  async getFollowUpsPerUser(filters: ReportFilters): Promise<FollowUpsPerUser[]> {
    const { organizationId, dateRange = this.getDefaultDateRange() } = filters;
    const now = new Date();

    const users = await prisma.user.findMany({
      where: { organizationId, isActive: true },
      select: { id: true, firstName: true, lastName: true },
    });

    const results: FollowUpsPerUser[] = [];

    for (const user of users) {
      const followUps = await prisma.followUp.findMany({
        where: {
          assigneeId: user.id,
          createdAt: { gte: dateRange.start, lte: dateRange.end },
        },
        select: { status: true, scheduledAt: true },
      });

      const totalScheduled = followUps.length;
      const completed = followUps.filter(f => f.status === 'COMPLETED').length;
      const pending = followUps.filter(f => f.status === 'PENDING').length;
      const overdue = followUps.filter(f =>
        f.status === 'PENDING' && f.scheduledAt && f.scheduledAt < now
      ).length;

      if (totalScheduled > 0) {
        results.push({
          userId: user.id,
          userName: `${user.firstName} ${user.lastName}`.trim(),
          totalScheduled,
          completed,
          pending,
          overdue,
          completionRate: ((completed / totalScheduled) * 100).toFixed(1),
        });
      }
    }

    return results.sort((a, b) => parseFloat(b.completionRate) - parseFloat(a.completionRate));
  }

  /**
   * 5. CONVERSION PER USER
   */
  async getConversionPerUser(filters: ReportFilters): Promise<ConversionPerUser[]> {
    const { organizationId, dateRange = this.getDefaultDateRange() } = filters;

    const users = await prisma.user.findMany({
      where: { organizationId, isActive: true },
      select: { id: true, firstName: true, lastName: true },
    });

    const results: ConversionPerUser[] = [];

    for (const user of users) {
      // Get leads assigned
      const leadsAssigned = await prisma.leadAssignment.count({
        where: {
          assigneeId: user.id,
          isActive: true,
        },
      });

      // Get conversions (admissions)
      const admissions = await prisma.admission.findMany({
        where: {
          closedById: user.id,
          createdAt: { gte: dateRange.start, lte: dateRange.end },
        },
        select: { totalFee: true, createdAt: true },
      });

      const conversions = admissions.length;
      const closureValue = admissions.reduce((sum, a) => sum + Number(a.totalFee || 0), 0);

      if (leadsAssigned > 0 || conversions > 0) {
        results.push({
          userId: user.id,
          userName: `${user.firstName} ${user.lastName}`.trim(),
          leadsAssigned,
          conversions,
          conversionRate: leadsAssigned > 0 ? ((conversions / leadsAssigned) * 100).toFixed(1) : '0',
          avgConversionTime: 0, // Would need lead creation date
          closureValue,
        });
      }
    }

    return results.sort((a, b) => b.closureValue - a.closureValue);
  }

  /**
   * 6. ACTIVITY LOG (Daily breakdown)
   */
  async getActivityLog(filters: ReportFilters): Promise<ActivityLog[]> {
    const { organizationId, dateRange = this.getDefaultDateRange(), userId } = filters;

    const users = userId
      ? await prisma.user.findMany({ where: { id: userId }, select: { id: true, firstName: true, lastName: true } })
      : await prisma.user.findMany({ where: { organizationId, isActive: true }, select: { id: true, firstName: true, lastName: true } });

    const results: ActivityLog[] = [];

    // Generate date range
    const dates: Date[] = [];
    const current = new Date(dateRange.start);
    while (current <= dateRange.end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    for (const user of users) {
      for (const date of dates.slice(-30)) { // Last 30 days max
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        // Get activity counts
        const leadsWorked = await prisma.leadActivity.count({
          where: {
            userId: user.id,
            createdAt: { gte: dayStart, lte: dayEnd },
          },
        });

        const callsMade = await prisma.telecallerCall.count({
          where: {
            telecallerId: user.id,
            createdAt: { gte: dayStart, lte: dayEnd },
          },
        });

        const followUpsCompleted = await prisma.followUp.count({
          where: {
            assigneeId: user.id,
            status: 'COMPLETED',
            updatedAt: { gte: dayStart, lte: dayEnd },
          },
        });

        if (leadsWorked > 0 || callsMade > 0 || followUpsCompleted > 0) {
          results.push({
            userId: user.id,
            userName: `${user.firstName} ${user.lastName}`.trim(),
            date: date.toISOString().split('T')[0],
            loginTime: null, // Would need session tracking
            logoutTime: null,
            activeHours: 0,
            leadsWorked,
            callsMade,
            followUpsCompleted,
          });
        }
      }
    }

    return results.sort((a, b) => b.date.localeCompare(a.date));
  }

  /**
   * 7. LOGIN REPORT
   */
  async getLoginReport(filters: ReportFilters): Promise<LoginReport[]> {
    const { organizationId, dateRange = this.getDefaultDateRange() } = filters;

    // Get audit logs for login events
    const loginLogs = await prisma.auditLog.findMany({
      where: {
        organizationId,
        action: { in: ['LOGIN', 'LOGOUT', 'login', 'logout'] },
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by user
    const userLogins = new Map<string, {
      userName: string;
      logins: Date[];
      ipAddresses: Set<string>;
    }>();

    for (const log of loginLogs) {
      if (!log.user) continue;

      const existing = userLogins.get(log.userId) || {
        userName: `${log.user.firstName} ${log.user.lastName}`.trim(),
        logins: [],
        ipAddresses: new Set<string>(),
      };

      if (log.action.toLowerCase() === 'login') {
        existing.logins.push(log.createdAt);
      }
      if (log.ipAddress) {
        existing.ipAddresses.add(log.ipAddress);
      }

      userLogins.set(log.userId, existing);
    }

    const results: LoginReport[] = [];
    for (const [userId, data] of userLogins) {
      const uniqueDays = new Set(data.logins.map(d => d.toISOString().split('T')[0]));

      results.push({
        userId,
        userName: data.userName,
        totalLogins: data.logins.length,
        lastLogin: data.logins[0] || null,
        avgSessionDuration: 0, // Would need session tracking
        loginDays: uniqueDays.size,
        ipAddresses: Array.from(data.ipAddresses),
      });
    }

    return results.sort((a, b) => b.totalLogins - a.totalLogins);
  }

  /**
   * COMPREHENSIVE USER PERFORMANCE REPORT
   * Optimized with batch queries for better performance
   */
  async getComprehensiveReport(filters: ReportFilters): Promise<{
    summary: UserPerformanceSummary[];
    leadsPerUser: LeadsPerUser[];
    callsPerUser: CallsPerUser[];
    followUpsPerUser: FollowUpsPerUser[];
    conversionPerUser: ConversionPerUser[];
  }> {
    const { organizationId, dateRange = this.getDefaultDateRange(), currentUserRole, currentUserId } = filters;
    const now = new Date();

    console.log('[UserPerformance] getComprehensiveReport called for org:', organizationId);
    console.log('[UserPerformance] Date range:', dateRange);
    console.log('[UserPerformance] Role-based filtering - role:', currentUserRole, 'userId:', currentUserId);

    // Get viewable team member IDs based on role
    let viewableUserIds: string[] | null = null;
    if (currentUserRole && currentUserId) {
      viewableUserIds = await userService.getViewableTeamMemberIds(organizationId, currentUserRole, currentUserId);
    }

    // Build user filter
    const userFilter: any = { organizationId, isActive: true };

    // Apply role-based filtering
    if (viewableUserIds !== null) {
      userFilter.id = { in: viewableUserIds };
    }

    // Get all users based on role visibility (single query)
    const users = await prisma.user.findMany({
      where: userFilter,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: { select: { name: true } },
        branch: { select: { name: true } },
      },
      take: 50,
    });

    console.log('[UserPerformance] Found users:', users.length);

    if (users.length === 0) {
      return {
        summary: [],
        leadsPerUser: [],
        callsPerUser: [],
        followUpsPerUser: [],
        conversionPerUser: [],
      };
    }

    const userIds = users.map(u => u.id);

    // Batch queries - get all data in parallel with aggregations
    const [
      leadAssignments,
      leadActivities,
      calls,
      followUps,
      admissions,
    ] = await Promise.all([
      // Lead assignments per user
      prisma.leadAssignment.groupBy({
        by: ['assignedToId'],
        where: {
          assignedToId: { in: userIds },
          assignedAt: { gte: dateRange.start, lte: dateRange.end },
        },
        _count: { id: true },
      }),
      // Lead activities per user
      prisma.leadActivity.groupBy({
        by: ['userId'],
        where: {
          userId: { in: userIds },
          createdAt: { gte: dateRange.start, lte: dateRange.end },
        },
        _count: { id: true },
      }),
      // Calls per user with status breakdown
      prisma.telecallerCall.groupBy({
        by: ['telecallerId', 'status'],
        where: {
          telecallerId: { in: userIds },
          createdAt: { gte: dateRange.start, lte: dateRange.end },
        },
        _count: { id: true },
        _sum: { duration: true },
      }),
      // Follow-ups per user with status breakdown
      prisma.followUp.groupBy({
        by: ['assigneeId', 'status'],
        where: {
          assigneeId: { in: userIds },
          createdAt: { gte: dateRange.start, lte: dateRange.end },
        },
        _count: { id: true },
      }),
      // Admissions (conversions) per user
      prisma.admission.groupBy({
        by: ['closedById'],
        where: {
          closedById: { in: userIds },
          createdAt: { gte: dateRange.start, lte: dateRange.end },
        },
        _count: { id: true },
        _sum: { totalFee: true },
      }),
    ]);

    // Build lookup maps for fast access
    const assignmentsMap = new Map(leadAssignments.map(a => [a.assignedToId, a._count.id]));
    const activitiesMap = new Map(leadActivities.map(a => [a.userId, a._count.id]));
    const admissionsMap = new Map(admissions.map(a => [a.closedById, { count: a._count.id, value: Number(a._sum.totalFee || 0) }]));

    // Process calls data
    const callsMap = new Map<string, { total: number; connected: number; missed: number; duration: number }>();
    for (const call of calls) {
      const existing = callsMap.get(call.telecallerId) || { total: 0, connected: 0, missed: 0, duration: 0 };
      existing.total += call._count.id;
      if (call.status === 'COMPLETED') {
        existing.connected += call._count.id;
        existing.duration += Number(call._sum.duration || 0);
      } else if (call.status === 'NO_ANSWER' || call.status === 'FAILED') {
        existing.missed += call._count.id;
      }
      callsMap.set(call.telecallerId, existing);
    }

    // Process follow-ups data
    const followUpsMap = new Map<string, { total: number; completed: number; pending: number }>();
    for (const fu of followUps) {
      const odlId = fu.assigneeId;
      if (!odlId) continue;
      const existing = followUpsMap.get(odlId) || { total: 0, completed: 0, pending: 0 };
      existing.total += fu._count.id;
      if (fu.status === 'COMPLETED') {
        existing.completed += fu._count.id;
      } else if (fu.status === 'UPCOMING' || fu.status === 'PENDING') {
        existing.pending += fu._count.id;
      }
      followUpsMap.set(odlId, existing);
    }

    // Build summary for each user
    const summary: UserPerformanceSummary[] = users.map(user => {
      const leadsAssigned = assignmentsMap.get(user.id) || 0;
      const leadsHandled = activitiesMap.get(user.id) || 0;
      const callData = callsMap.get(user.id) || { total: 0, connected: 0, missed: 0, duration: 0 };
      const fuData = followUpsMap.get(user.id) || { total: 0, completed: 0, pending: 0 };
      const admData = admissionsMap.get(user.id) || { count: 0, value: 0 };

      return {
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        role: user.role?.name || 'N/A',
        branch: user.branch?.name || null,
        leadsHandled,
        leadsAssigned,
        callsMade: callData.total,
        callsConnected: callData.connected,
        followUpsCompleted: fuData.completed,
        followUpsPending: fuData.pending,
        conversions: admData.count,
        conversionRate: leadsAssigned > 0 ? ((admData.count / leadsAssigned) * 100).toFixed(1) : '0',
        closureValue: admData.value,
        avgResponseTime: 0,
        lastActivity: null,
      };
    });

    // Build other report sections from summary data
    const leadsPerUser: LeadsPerUser[] = summary.map(s => ({
      userId: s.userId,
      userName: s.userName,
      totalAssigned: s.leadsAssigned,
      newLeads: 0,
      contacted: s.leadsHandled,
      qualified: 0,
      converted: s.conversions,
      lost: 0,
    }));

    const callsPerUser: CallsPerUser[] = summary.map(s => {
      const callData = callsMap.get(s.userId) || { total: 0, connected: 0, missed: 0, duration: 0 };
      return {
        userId: s.userId,
        userName: s.userName,
        totalCalls: callData.total,
        connectedCalls: callData.connected,
        missedCalls: callData.missed,
        avgDuration: callData.connected > 0 ? Math.round(callData.duration / callData.connected) : 0,
        totalDuration: callData.duration,
        callbacksScheduled: 0,
      };
    });

    const followUpsPerUser: FollowUpsPerUser[] = summary.map(s => {
      const fuData = followUpsMap.get(s.userId) || { total: 0, completed: 0, pending: 0 };
      return {
        userId: s.userId,
        userName: s.userName,
        totalScheduled: fuData.total,
        completed: fuData.completed,
        pending: fuData.pending,
        overdue: 0,
        completionRate: fuData.total > 0 ? ((fuData.completed / fuData.total) * 100).toFixed(1) : '0',
      };
    });

    const conversionPerUser: ConversionPerUser[] = summary.map(s => ({
      userId: s.userId,
      userName: s.userName,
      leadsAssigned: s.leadsAssigned,
      conversions: s.conversions,
      conversionRate: s.conversionRate,
      avgConversionTime: 0,
      closureValue: s.closureValue,
    }));

    console.log('[UserPerformance] Raw summary count:', summary.length);
    console.log('[UserPerformance] Users with activity:', summary.filter(s => s.leadsAssigned > 0 || s.callsMade > 0 || s.conversions > 0 || s.followUpsCompleted > 0).length);
    console.log('[UserPerformance] Calls data:', calls.length, 'groups');

    // Return all users - even those with zero activity (showing zeros is better than hiding users)
    // Sort by conversions desc, then by calls desc
    const sortedSummary = summary.sort((a, b) => {
      if (b.conversions !== a.conversions) return b.conversions - a.conversions;
      return b.callsMade - a.callsMade;
    });

    console.log('[UserPerformance] Returning all users count:', sortedSummary.length);

    return {
      summary: sortedSummary,
      leadsPerUser: leadsPerUser.sort((a, b) => b.totalAssigned - a.totalAssigned),
      callsPerUser: callsPerUser.sort((a, b) => b.totalCalls - a.totalCalls),
      followUpsPerUser: followUpsPerUser.sort((a, b) => b.completed - a.completed),
      conversionPerUser: conversionPerUser.sort((a, b) => b.closureValue - a.closureValue),
    };
  }

  /**
   * GET USER REPORT DATA - Comprehensive report with all fields
   * Returns all 30+ fields needed for the User Report page
   */
  async getUserReportData(filters: ReportFilters): Promise<UserReportData[]> {
    const { organizationId, dateRange = this.getDefaultDateRange(), currentUserRole, currentUserId } = filters;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const todayStr = today.toISOString().split('T')[0];

    console.log('[UserReportData] Role-based filtering - role:', currentUserRole, 'userId:', currentUserId);

    // Get viewable team member IDs based on role
    let viewableUserIds: string[] | null = null;
    if (currentUserRole && currentUserId) {
      viewableUserIds = await userService.getViewableTeamMemberIds(organizationId, currentUserRole, currentUserId);
    }

    // Build user filter
    const userFilter: any = { organizationId, isActive: true };

    // Apply role-based filtering
    if (viewableUserIds !== null) {
      userFilter.id = { in: viewableUserIds };
    }

    // Get all users with manager info based on role visibility
    const users = await prisma.user.findMany({
      where: userFilter,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: { select: { name: true } },
        branch: { select: { name: true } },
        manager: { select: { firstName: true, lastName: true } },
      },
      take: 100,
    });

    if (users.length === 0) return [];

    const userIds = users.map(u => u.id);

    // Batch queries for all data
    const [
      // Call data from CallLog (has direction)
      callLogs,
      // Telecaller calls (outgoing manual calls)
      telecallerCalls,
      // Follow-ups due today
      followUpsDueToday,
      // Lead assignments with stage info
      leadAssignments,
      // WhatsApp messages sent
      whatsappSent,
      // Emails sent
      emailsSent,
      // SMS sent
      smsSent,
    ] = await Promise.all([
      // CallLog with direction breakdown
      prisma.callLog.groupBy({
        by: ['callerId', 'direction', 'status'],
        where: {
          organizationId,
          callerId: { in: userIds },
          createdAt: { gte: dateRange.start, lte: dateRange.end },
        },
        _count: { id: true },
        _sum: { duration: true },
      }),
      // Telecaller calls
      prisma.telecallerCall.groupBy({
        by: ['telecallerId', 'status'],
        where: {
          telecallerId: { in: userIds },
          createdAt: { gte: dateRange.start, lte: dateRange.end },
        },
        _count: { id: true },
        _sum: { duration: true },
      }),
      // Follow-ups due today per user
      prisma.followUp.groupBy({
        by: ['assigneeId'],
        where: {
          assigneeId: { in: userIds },
          status: 'UPCOMING',
          scheduledAt: { gte: today, lte: todayEnd },
        },
        _count: { id: true },
      }),
      // Lead assignments with stage info
      prisma.leadAssignment.findMany({
        where: {
          assignedToId: { in: userIds },
          isActive: true,
        },
        select: {
          assignedToId: true,
          lead: {
            select: {
              stage: { select: { slug: true, autoSyncStatus: true, name: true } },
            },
          },
        },
      }),
      // WhatsApp sent
      prisma.whatsappLog.groupBy({
        by: ['userId'],
        where: {
          userId: { in: userIds },
          direction: 'OUTBOUND',
          createdAt: { gte: dateRange.start, lte: dateRange.end },
        },
        _count: { id: true },
      }),
      // Emails sent
      prisma.emailLog.groupBy({
        by: ['userId'],
        where: {
          userId: { in: userIds },
          direction: 'OUTBOUND',
          createdAt: { gte: dateRange.start, lte: dateRange.end },
        },
        _count: { id: true },
      }),
      // SMS sent
      prisma.smsLog.groupBy({
        by: ['userId'],
        where: {
          userId: { in: userIds },
          direction: 'OUTBOUND',
          createdAt: { gte: dateRange.start, lte: dateRange.end },
        },
        _count: { id: true },
      }),
    ]);

    // Build lookup maps
    // CallLog data - process by user and direction
    const callLogMap = new Map<string, {
      outgoing: { total: number; connected: number; unanswered: number; duration: number };
      incoming: { total: number; connected: number; unanswered: number; duration: number };
    }>();

    for (const call of callLogs) {
      const userId = call.callerId;
      const existing = callLogMap.get(userId) || {
        outgoing: { total: 0, connected: 0, unanswered: 0, duration: 0 },
        incoming: { total: 0, connected: 0, unanswered: 0, duration: 0 },
      };

      const direction = call.direction === 'OUTBOUND' ? 'outgoing' : 'incoming';
      existing[direction].total += call._count.id;

      if (call.status === 'COMPLETED' || call.status === 'CONNECTED') {
        existing[direction].connected += call._count.id;
        existing[direction].duration += Number(call._sum.duration || 0);
      } else if (call.status === 'NO_ANSWER' || call.status === 'MISSED' || call.status === 'FAILED') {
        existing[direction].unanswered += call._count.id;
      }

      callLogMap.set(userId, existing);
    }

    // Telecaller calls (all outgoing)
    const telecallerMap = new Map<string, { total: number; connected: number; unanswered: number; duration: number }>();
    for (const call of telecallerCalls) {
      const existing = telecallerMap.get(call.telecallerId) || { total: 0, connected: 0, unanswered: 0, duration: 0 };
      existing.total += call._count.id;

      if (call.status === 'COMPLETED') {
        existing.connected += call._count.id;
        existing.duration += Number(call._sum.duration || 0);
      } else if (call.status === 'NO_ANSWER' || call.status === 'MISSED' || call.status === 'FAILED') {
        existing.unanswered += call._count.id;
      }

      telecallerMap.set(call.telecallerId, existing);
    }

    // Follow-ups due today
    const followUpTodayMap = new Map(followUpsDueToday.map(f => [f.assigneeId, f._count.id]));

    // Lead status counts
    const leadStatusMap = new Map<string, { inprogress: number; converted: number; lost: number; disposed: number }>();
    for (const assignment of leadAssignments) {
      const userId = assignment.assignedToId;
      const existing = leadStatusMap.get(userId) || { inprogress: 0, converted: 0, lost: 0, disposed: 0 };
      const stage = assignment.lead.stage;
      const autoSyncStatus = stage?.autoSyncStatus?.toUpperCase() || '';
      const slug = stage?.slug?.toLowerCase() || '';

      // Check for converted/won stages
      if (autoSyncStatus === 'WON' || slug.includes('won') || slug.includes('converted') || slug.includes('admitted')) {
        existing.converted++;
        existing.disposed++;
      // Check for lost stages
      } else if (autoSyncStatus === 'LOST' || slug.includes('lost') || slug.includes('closed') || slug.includes('rejected')) {
        existing.lost++;
        existing.disposed++;
      // Everything else except new is in progress
      } else if (slug !== '' && !slug.includes('new')) {
        existing.inprogress++;
      }

      leadStatusMap.set(userId, existing);
    }

    // Messaging maps
    const whatsappMap = new Map(whatsappSent.map(w => [w.userId, w._count.id]));
    const emailMap = new Map(emailsSent.map(e => [e.userId, e._count.id]));
    const smsMap = new Map(smsSent.map(s => [s.userId, s._count.id]));

    // Build result for each user
    const results: UserReportData[] = users.map(user => {
      const callLogData = callLogMap.get(user.id) || {
        outgoing: { total: 0, connected: 0, unanswered: 0, duration: 0 },
        incoming: { total: 0, connected: 0, unanswered: 0, duration: 0 },
      };
      const telecallerData = telecallerMap.get(user.id) || { total: 0, connected: 0, unanswered: 0, duration: 0 };
      const leadStatus = leadStatusMap.get(user.id) || { inprogress: 0, converted: 0, lost: 0, disposed: 0 };

      // Combine outgoing from CallLog + TelecallerCall
      const totalOutgoing = callLogData.outgoing.total + telecallerData.total;
      const outgoingConnected = callLogData.outgoing.connected + telecallerData.connected;
      const outgoingUnanswered = callLogData.outgoing.unanswered + telecallerData.unanswered;
      const outgoingDuration = callLogData.outgoing.duration + telecallerData.duration;

      // Incoming from CallLog
      const totalIncoming = callLogData.incoming.total;
      const incomingConnected = callLogData.incoming.connected;
      const incomingUnanswered = callLogData.incoming.unanswered;
      const incomingDuration = callLogData.incoming.duration;

      // Total calls
      const totalCalls = totalOutgoing + totalIncoming;
      const totalConnected = outgoingConnected + incomingConnected;
      const totalUnconnected = totalCalls - totalConnected;
      const totalDuration = outgoingDuration + incomingDuration;

      return {
        userId: user.id,
        username: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        reportingManager: user.manager ? `${user.manager.firstName || ''} ${user.manager.lastName || ''}`.trim() : '-',
        mobileNumber: user.phone || '-',
        date: todayStr,
        // Calls
        totalCalls,
        totalCallsConnected: totalConnected,
        totalUnconnectedCalls: totalUnconnected,
        // Outgoing
        totalOutgoingCalls: totalOutgoing,
        outgoingConnectedCalls: outgoingConnected,
        outgoingUnansweredCalls: outgoingUnanswered,
        avgOutgoingCallDuration: outgoingConnected > 0 ? Math.round(outgoingDuration / outgoingConnected) : 0,
        // Incoming
        totalIncomingCalls: totalIncoming,
        incomingConnectedCalls: incomingConnected,
        incomingUnansweredCalls: incomingUnanswered,
        avgIncomingCallDuration: incomingConnected > 0 ? Math.round(incomingDuration / incomingConnected) : 0,
        // Disposition
        totalDisposedCount: leadStatus.disposed,
        disposedYesConnectedCount: leadStatus.converted,
        disposedNotConnectedCount: leadStatus.lost,
        // Leads
        totalInprogressLeads: leadStatus.inprogress,
        totalConvertedLeads: leadStatus.converted,
        totalLostLeads: leadStatus.lost,
        // Follow-ups
        followUpDueToday: followUpTodayMap.get(user.id) || 0,
        // Call metrics
        avgStartCallingTime: '-', // Would need first call time tracking
        avgCallDuration: totalConnected > 0 ? Math.round(totalDuration / totalConnected) : 0,
        avgFormFillingTime: 0, // Would need form tracking
        totalCallDuration: totalDuration,
        // Breaks (not tracked in current schema)
        totalBreaks: 0,
        totalBreakDuration: 0,
        // Messaging
        totalWhatsappSent: whatsappMap.get(user.id) || 0,
        totalEmailsSent: emailMap.get(user.id) || 0,
        totalSmsSent: smsMap.get(user.id) || 0,
      };
    });

    return results;
  }
}

export const userPerformanceReportsService = new UserPerformanceReportsService();
