/**
 * Team Monitoring Service
 * Provides comprehensive team performance metrics for tenant admins
 */

import { prisma } from '../config/database';
import { userService } from './user.service';

interface TeamMonitoringFilters {
  organizationId: string;
  branchId?: string;
  managerId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  // Role-based filtering
  userRole?: string;
  userId?: string;
}

interface TeamMemberPerformance {
  userId: string;
  name: string;
  avatar?: string;
  role: string;
  branchName?: string;
  totalCalls: number;
  answeredCalls: number;
  avgCallDuration: number;
  conversions: number;
  conversionRate: number;
  avgResponseTime: number;
  pendingFollowUps: number;
  overdueFollowUps: number;
  callOutcomes: Record<string, number>;
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

interface TeamOverview {
  totalCalls: number;
  answeredCalls: number;
  avgResponseTime: number;
  conversionRate: number;
  pendingFollowUps: number;
  overdueFollowUps: number;
  totalLeads: number;
  convertedLeads: number;
  totalTeamMembers: number;
  activeTeamMembers: number;
}

interface LeadAgingBucket {
  bucket: string;
  minDays: number;
  maxDays: number | null;
  count: number;
  percentage: number;
}

interface CallOutcomeData {
  outcome: string;
  count: number;
  percentage: number;
  color: string;
}

interface ConversionTrendData {
  date: string;
  conversions: number;
  totalCalls: number;
  conversionRate: number;
}

interface ResponseTimeMetrics {
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  slaBreachCount: number;
  slaBreachPercentage: number;
  byHour: Array<{ hour: number; avgResponseTime: number; count: number }>;
}

const OUTCOME_COLORS: Record<string, string> = {
  INTERESTED: '#10B981',
  CONVERTED: '#3B82F6',
  CALLBACK: '#F59E0B',
  NOT_INTERESTED: '#EF4444',
  NO_ANSWER: '#6B7280',
  BUSY: '#8B5CF6',
  WRONG_NUMBER: '#EC4899',
  VOICEMAIL: '#14B8A6',
};

class TeamMonitoringService {
  /**
   * Get team overview summary metrics
   */
  async getTeamOverview(filters: TeamMonitoringFilters): Promise<TeamOverview> {
    const { organizationId, branchId, managerId, dateFrom, dateTo, userRole, userId } = filters;
    const now = new Date();
    const defaultDateFrom = dateFrom || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const defaultDateTo = dateTo || now;

    console.log('[TeamMonitoring] getTeamOverview called with:', {
      organizationId,
      branchId,
      managerId,
      userRole,
      userId,
      dateFrom: defaultDateFrom?.toISOString(),
      dateTo: defaultDateTo?.toISOString(),
    });

    // Validate organizationId
    if (!organizationId) {
      console.error('[TeamMonitoring] ERROR: organizationId is undefined!');
      return {
        totalCalls: 0,
        answeredCalls: 0,
        avgResponseTime: 0,
        conversionRate: 0,
        pendingFollowUps: 0,
        overdueFollowUps: 0,
        totalLeads: 0,
        convertedLeads: 0,
        totalTeamMembers: 0,
        activeTeamMembers: 0,
      };
    }

    // Get viewable team member IDs based on role
    let viewableUserIds: string[] | null = null;
    if (userRole && userId) {
      viewableUserIds = await userService.getViewableTeamMemberIds(organizationId, userRole, userId);
    }

    // Build user filter
    const userFilter: any = {
      organizationId,
      isActive: true,
      role: { slug: { in: ['telecaller', 'counselor'] } },
    };

    // Apply role-based filtering first
    if (viewableUserIds !== null) {
      userFilter.id = { in: viewableUserIds };
    }

    if (branchId) userFilter.branchId = branchId;
    if (managerId) userFilter.managerId = managerId;

    console.log('[TeamMonitoring] User filter:', JSON.stringify(userFilter));

    // Get team members
    const teamMembers = await prisma.user.findMany({
      where: userFilter,
      select: { id: true, firstName: true, role: { select: { slug: true } } },
    });
    const teamMemberIds = teamMembers.map((u) => u.id);
    console.log('[TeamMonitoring] Found team members:', teamMemberIds.length, teamMembers.map(m => m.firstName));

    // Get call stats
    const callStats = await prisma.telecallerCall.aggregate({
      where: {
        organizationId,
        telecallerId: { in: teamMemberIds },
        createdAt: { gte: defaultDateFrom, lte: defaultDateTo },
      },
      _count: { id: true },
    });

    const answeredCalls = await prisma.telecallerCall.count({
      where: {
        organizationId,
        telecallerId: { in: teamMemberIds },
        createdAt: { gte: defaultDateFrom, lte: defaultDateTo },
        status: 'COMPLETED',
        duration: { gt: 0 },
      },
    });

    const conversions = await prisma.telecallerCall.count({
      where: {
        organizationId,
        telecallerId: { in: teamMemberIds },
        createdAt: { gte: defaultDateFrom, lte: defaultDateTo },
        outcome: 'CONVERTED',
      },
    });

    // Get follow-up stats
    const pendingFollowUps = await prisma.followUp.count({
      where: {
        assigneeId: { in: teamMemberIds },
        status: 'UPCOMING',
        lead: { organizationId },
      },
    });

    // Overdue = UPCOMING follow-ups with scheduledAt in the past
    const overdueFollowUps = await prisma.followUp.count({
      where: {
        assigneeId: { in: teamMemberIds },
        status: 'UPCOMING',
        scheduledAt: { lt: now },
        lead: { organizationId },
      },
    });

    // Get lead stats
    const leadStats = await prisma.lead.aggregate({
      where: {
        organizationId,
        createdAt: { gte: defaultDateFrom, lte: defaultDateTo },
      },
      _count: { id: true },
    });
    console.log('[TeamMonitoring] Total leads in range:', leadStats._count.id);

    const convertedLeads = await prisma.lead.count({
      where: {
        organizationId,
        createdAt: { gte: defaultDateFrom, lte: defaultDateTo },
        OR: [
          { isConverted: true },
          { stage: { name: { in: ['Converted', 'Won', 'Closed Won', 'Admitted', 'Enrolled', 'ADMITTED', 'ENROLLED'] } } },
        ],
      },
    });
    console.log('[TeamMonitoring] Converted leads:', convertedLeads);
    console.log('[TeamMonitoring] Pending follow-ups:', pendingFollowUps);

    // Calculate average response time from leads with firstResponseAt
    const leadsWithResponse = await prisma.lead.findMany({
      where: {
        organizationId,
        createdAt: { gte: defaultDateFrom, lte: defaultDateTo },
        responseTimeMs: { not: null },
      },
      select: { responseTimeMs: true },
    });

    const avgResponseTime =
      leadsWithResponse.length > 0
        ? leadsWithResponse.reduce((sum, l) => sum + (l.responseTimeMs || 0), 0) / leadsWithResponse.length
        : 0;

    // Count active team members (those who made calls in the period)
    const activeMembers = await prisma.telecallerCall.groupBy({
      by: ['telecallerId'],
      where: {
        organizationId,
        telecallerId: { in: teamMemberIds },
        createdAt: { gte: defaultDateFrom, lte: defaultDateTo },
      },
    });

    const totalCalls = callStats._count.id || 0;
    // Calculate conversion rate: prefer call-based if calls exist, otherwise use lead-based
    const totalLeadsCount = leadStats._count.id || 0;
    const conversionRate = totalLeadsCount > 0 ? (convertedLeads / totalLeadsCount) * 100 : 0;

    const result = {
      totalCalls,
      answeredCalls,
      avgResponseTime: Math.round(avgResponseTime),
      conversionRate: Math.round(conversionRate * 100) / 100,
      pendingFollowUps,
      overdueFollowUps,
      totalLeads: leadStats._count.id || 0,
      convertedLeads,
      totalTeamMembers: teamMembers.length,
      activeTeamMembers: activeMembers.length,
    };
    console.log('[TeamMonitoring] Returning overview:', result);
    return result;
  }

  /**
   * Get individual telecaller performance metrics
   */
  async getTelecallerPerformance(filters: TeamMonitoringFilters): Promise<TeamMemberPerformance[]> {
    const { organizationId, branchId, managerId, dateFrom, dateTo, userRole, userId } = filters;
    const now = new Date();
    const defaultDateFrom = dateFrom || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const defaultDateTo = dateTo || now;

    // Get viewable team member IDs based on role
    let viewableUserIds: string[] | null = null;
    if (userRole && userId) {
      viewableUserIds = await userService.getViewableTeamMemberIds(organizationId, userRole, userId);
    }

    // Build user filter
    const userFilter: any = {
      organizationId,
      isActive: true,
      role: { slug: { in: ['telecaller', 'counselor'] } },
    };

    // Apply role-based filtering first
    if (viewableUserIds !== null) {
      userFilter.id = { in: viewableUserIds };
    }

    if (branchId) userFilter.branchId = branchId;
    if (managerId) userFilter.managerId = managerId;

    // Get team members with their details
    const teamMembers = await prisma.user.findMany({
      where: userFilter,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: { select: { name: true } },
        branch: { select: { name: true } },
      },
    });

    const results: TeamMemberPerformance[] = [];

    for (const member of teamMembers) {
      // Get call stats for this member
      const calls = await prisma.telecallerCall.findMany({
        where: {
          organizationId,
          telecallerId: member.id,
          createdAt: { gte: defaultDateFrom, lte: defaultDateTo },
        },
      });

      const totalCalls = calls.length;
      const answeredCalls = calls.filter((c) => c.status === 'COMPLETED' && c.duration && c.duration > 0).length;
      const totalDuration = calls.reduce((sum, c) => sum + (c.duration || 0), 0);
      const avgCallDuration = answeredCalls > 0 ? Math.round(totalDuration / answeredCalls) : 0;

      // Count outcomes
      const callOutcomes: Record<string, number> = {};
      for (const call of calls) {
        if (call.outcome) {
          callOutcomes[call.outcome] = (callOutcomes[call.outcome] || 0) + 1;
        }
      }

      const conversions = callOutcomes['CONVERTED'] || 0;
      const conversionRate = answeredCalls > 0 ? (conversions / answeredCalls) * 100 : 0;

      // Count sentiment
      const positive = calls.filter((c) => c.sentiment === 'positive').length;
      const negative = calls.filter((c) => c.sentiment === 'negative').length;
      const neutral = calls.filter((c) => c.sentiment === 'neutral' || !c.sentiment).length;

      // Get follow-up counts
      const pendingFollowUps = await prisma.followUp.count({
        where: {
          assigneeId: member.id,
          status: 'UPCOMING',
          lead: { organizationId },
        },
      });

      // Overdue = UPCOMING follow-ups with scheduledAt in the past
      const overdueFollowUps = await prisma.followUp.count({
        where: {
          assigneeId: member.id,
          status: 'UPCOMING',
          scheduledAt: { lt: now },
          lead: { organizationId },
        },
      });

      // Get avg response time for leads assigned to this member
      const memberLeads = await prisma.lead.findMany({
        where: {
          organizationId,
          assignments: { some: { assignedToId: member.id } },
          responseTimeMs: { not: null },
          createdAt: { gte: defaultDateFrom, lte: defaultDateTo },
        },
        select: { responseTimeMs: true },
      });

      const avgResponseTime =
        memberLeads.length > 0
          ? memberLeads.reduce((sum, l) => sum + (l.responseTimeMs || 0), 0) / memberLeads.length
          : 0;

      results.push({
        userId: member.id,
        name: `${member.firstName} ${member.lastName}`,
        avatar: member.avatar || undefined,
        role: member.role?.name || 'Telecaller',
        branchName: member.branch?.name,
        totalCalls,
        answeredCalls,
        avgCallDuration,
        conversions,
        conversionRate: Math.round(conversionRate * 100) / 100,
        avgResponseTime: Math.round(avgResponseTime),
        pendingFollowUps,
        overdueFollowUps,
        callOutcomes,
        sentiment: { positive, neutral, negative },
      });
    }

    // Sort by total calls descending
    return results.sort((a, b) => b.totalCalls - a.totalCalls);
  }

  /**
   * Get manager performance with their team aggregates
   */
  async getManagerPerformance(filters: TeamMonitoringFilters): Promise<any[]> {
    const { organizationId, branchId, dateFrom, dateTo } = filters;

    // Get all managers
    const managerFilter: any = {
      organizationId,
      isActive: true,
      role: { slug: { in: ['manager', 'team_lead'] } },
    };
    if (branchId) managerFilter.branchId = branchId;

    const managers = await prisma.user.findMany({
      where: managerFilter,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: { select: { name: true } },
        branch: { select: { name: true } },
        teamMembers: {
          where: { isActive: true },
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    const results = [];

    for (const manager of managers) {
      const teamMemberIds = manager.teamMembers.map((m) => m.id);

      // Get team performance using the telecaller performance method
      const teamPerformance = await this.getTelecallerPerformance({
        organizationId,
        managerId: manager.id,
        dateFrom,
        dateTo,
      });

      // Aggregate team stats
      const teamStats = teamPerformance.reduce(
        (acc, member) => ({
          totalCalls: acc.totalCalls + member.totalCalls,
          answeredCalls: acc.answeredCalls + member.answeredCalls,
          conversions: acc.conversions + member.conversions,
          pendingFollowUps: acc.pendingFollowUps + member.pendingFollowUps,
          overdueFollowUps: acc.overdueFollowUps + member.overdueFollowUps,
        }),
        { totalCalls: 0, answeredCalls: 0, conversions: 0, pendingFollowUps: 0, overdueFollowUps: 0 }
      );

      const conversionRate = teamStats.answeredCalls > 0 ? (teamStats.conversions / teamStats.answeredCalls) * 100 : 0;

      results.push({
        managerId: manager.id,
        name: `${manager.firstName} ${manager.lastName}`,
        avatar: manager.avatar,
        role: manager.role?.name || 'Manager',
        branchName: manager.branch?.name,
        teamSize: manager.teamMembers.length,
        teamMembers: teamPerformance,
        aggregateStats: {
          ...teamStats,
          conversionRate: Math.round(conversionRate * 100) / 100,
        },
      });
    }

    return results.sort((a, b) => b.aggregateStats.totalCalls - a.aggregateStats.totalCalls);
  }

  /**
   * Get response time analytics
   */
  async getResponseTimeMetrics(filters: TeamMonitoringFilters): Promise<ResponseTimeMetrics> {
    const { organizationId, branchId, dateFrom, dateTo } = filters;
    const now = new Date();
    const defaultDateFrom = dateFrom || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const defaultDateTo = dateTo || now;

    // Get leads with response time
    const leadFilter: any = {
      organizationId,
      responseTimeMs: { not: null },
      createdAt: { gte: defaultDateFrom, lte: defaultDateTo },
    };

    const leads = await prisma.lead.findMany({
      where: leadFilter,
      select: {
        responseTimeMs: true,
        createdAt: true,
      },
    });

    if (leads.length === 0) {
      return {
        avgResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        slaBreachCount: 0,
        slaBreachPercentage: 0,
        byHour: [],
      };
    }

    const responseTimes = leads.map((l) => l.responseTimeMs || 0);
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const minResponseTime = Math.min(...responseTimes);
    const maxResponseTime = Math.max(...responseTimes);

    // SLA threshold: 5 minutes (300000ms)
    const SLA_THRESHOLD_MS = 300000;
    const slaBreachCount = responseTimes.filter((t) => t > SLA_THRESHOLD_MS).length;
    const slaBreachPercentage = (slaBreachCount / responseTimes.length) * 100;

    // Group by hour of day
    const byHour: Map<number, { total: number; count: number }> = new Map();
    for (const lead of leads) {
      const hour = lead.createdAt.getHours();
      const existing = byHour.get(hour) || { total: 0, count: 0 };
      byHour.set(hour, {
        total: existing.total + (lead.responseTimeMs || 0),
        count: existing.count + 1,
      });
    }

    const byHourArray = Array.from(byHour.entries())
      .map(([hour, data]) => ({
        hour,
        avgResponseTime: Math.round(data.total / data.count),
        count: data.count,
      }))
      .sort((a, b) => a.hour - b.hour);

    return {
      avgResponseTime: Math.round(avgResponseTime),
      minResponseTime: Math.round(minResponseTime),
      maxResponseTime: Math.round(maxResponseTime),
      slaBreachCount,
      slaBreachPercentage: Math.round(slaBreachPercentage * 100) / 100,
      byHour: byHourArray,
    };
  }

  /**
   * Get lead aging distribution
   */
  async getLeadAging(filters: TeamMonitoringFilters): Promise<LeadAgingBucket[]> {
    const { organizationId, branchId } = filters;
    const now = new Date();

    // Define age buckets in days
    const buckets = [
      { bucket: '0-1 days', minDays: 0, maxDays: 1 },
      { bucket: '1-3 days', minDays: 1, maxDays: 3 },
      { bucket: '3-7 days', minDays: 3, maxDays: 7 },
      { bucket: '7-14 days', minDays: 7, maxDays: 14 },
      { bucket: '14-30 days', minDays: 14, maxDays: 30 },
      { bucket: '30+ days', minDays: 30, maxDays: null },
    ];

    const leadFilter: any = {
      organizationId,
      stage: { name: { notIn: ['Converted', 'Won', 'Closed Won', 'Lost', 'Closed Lost', 'Admitted', 'Enrolled', 'ADMITTED', 'ENROLLED', 'Dropped', 'DROPPED'] } },
    };
    if (branchId) leadFilter.orgBranchId = branchId;

    // Get all active leads
    const leads = await prisma.lead.findMany({
      where: leadFilter,
      select: {
        lastContactedAt: true,
        createdAt: true,
        dormantSince: true,
      },
    });

    const totalLeads = leads.length;
    const bucketCounts: Record<string, number> = {};

    for (const lead of leads) {
      // Use lastContactedAt if available, otherwise createdAt
      const lastActivity = lead.lastContactedAt || lead.dormantSince || lead.createdAt;
      const daysSinceActivity = Math.floor((now.getTime() - lastActivity.getTime()) / (24 * 60 * 60 * 1000));

      for (const bucket of buckets) {
        if (
          daysSinceActivity >= bucket.minDays &&
          (bucket.maxDays === null || daysSinceActivity < bucket.maxDays)
        ) {
          bucketCounts[bucket.bucket] = (bucketCounts[bucket.bucket] || 0) + 1;
          break;
        }
      }
    }

    return buckets.map((bucket) => ({
      ...bucket,
      count: bucketCounts[bucket.bucket] || 0,
      percentage: totalLeads > 0 ? Math.round(((bucketCounts[bucket.bucket] || 0) / totalLeads) * 10000) / 100 : 0,
    }));
  }

  /**
   * Get pending follow-ups grouped by assignee
   */
  async getPendingFollowUps(filters: TeamMonitoringFilters): Promise<any> {
    const { organizationId, branchId, managerId, userRole, userId } = filters;
    const now = new Date();

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

    // Apply role-based filtering first
    if (viewableUserIds !== null) {
      userFilter.id = { in: viewableUserIds };
    }

    if (branchId) userFilter.branchId = branchId;
    if (managerId) userFilter.managerId = managerId;

    const users = await prisma.user.findMany({
      where: userFilter,
      select: { id: true, firstName: true, lastName: true },
    });
    const userIds = users.map((u) => u.id);

    // Get pending follow-ups (UPCOMING status only - we'll determine overdue by scheduledAt)
    const followUps = await prisma.followUp.findMany({
      where: {
        assigneeId: { in: userIds },
        status: 'UPCOMING',
        lead: { organizationId },
      },
      include: {
        lead: { select: { id: true, firstName: true, lastName: true, phone: true } },
        assignee: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 100,
    });

    // Group by assignee
    const byAssignee: Record<string, any> = {};
    let totalOverdue = 0;
    let totalUpcoming = 0;

    for (const followUp of followUps) {
      const assigneeId = followUp.assigneeId;
      if (!byAssignee[assigneeId]) {
        byAssignee[assigneeId] = {
          assigneeId,
          assigneeName: `${followUp.assignee.firstName} ${followUp.assignee.lastName}`,
          upcoming: 0,
          overdue: 0,
          followUps: [],
        };
      }

      // Determine if overdue by checking if scheduledAt is in the past
      const isOverdue = followUp.scheduledAt < now;
      if (isOverdue) {
        byAssignee[assigneeId].overdue++;
        totalOverdue++;
      } else {
        byAssignee[assigneeId].upcoming++;
        totalUpcoming++;
      }

      byAssignee[assigneeId].followUps.push({
        id: followUp.id,
        leadId: followUp.leadId,
        leadName: `${followUp.lead.firstName} ${followUp.lead.lastName || ''}`.trim(),
        leadPhone: followUp.lead.phone,
        scheduledAt: followUp.scheduledAt,
        status: isOverdue ? 'OVERDUE' : followUp.status,
        message: followUp.message,
      });
    }

    return {
      totalPending: followUps.length,
      totalOverdue,
      totalUpcoming,
      byAssignee: Object.values(byAssignee).sort((a: any, b: any) => b.overdue - a.overdue),
    };
  }

  /**
   * Get call outcome distribution
   */
  async getCallOutcomes(filters: TeamMonitoringFilters): Promise<CallOutcomeData[]> {
    const { organizationId, branchId, managerId, dateFrom, dateTo, userRole, userId } = filters;
    const now = new Date();
    const defaultDateFrom = dateFrom || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const defaultDateTo = dateTo || now;

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

    // Apply role-based filtering first
    if (viewableUserIds !== null) {
      userFilter.id = { in: viewableUserIds };
    }

    if (branchId) userFilter.branchId = branchId;
    if (managerId) userFilter.managerId = managerId;

    const users = await prisma.user.findMany({
      where: userFilter,
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);

    // Get outcome counts
    const outcomes = await prisma.telecallerCall.groupBy({
      by: ['outcome'],
      where: {
        organizationId,
        telecallerId: { in: userIds },
        createdAt: { gte: defaultDateFrom, lte: defaultDateTo },
        outcome: { not: null },
      },
      _count: { id: true },
    });

    const total = outcomes.reduce((sum, o) => sum + o._count.id, 0);

    return outcomes.map((o) => ({
      outcome: o.outcome || 'Unknown',
      count: o._count.id,
      percentage: total > 0 ? Math.round((o._count.id / total) * 10000) / 100 : 0,
      color: OUTCOME_COLORS[o.outcome || ''] || '#6B7280',
    })).sort((a, b) => b.count - a.count);
  }

  /**
   * Get daily conversion trend
   */
  async getConversionTrend(filters: TeamMonitoringFilters): Promise<ConversionTrendData[]> {
    const { organizationId, branchId, managerId, dateFrom, dateTo, userRole, userId } = filters;
    const now = new Date();
    const defaultDateFrom = dateFrom || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const defaultDateTo = dateTo || now;

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

    // Apply role-based filtering first
    if (viewableUserIds !== null) {
      userFilter.id = { in: viewableUserIds };
    }

    if (branchId) userFilter.branchId = branchId;
    if (managerId) userFilter.managerId = managerId;

    const users = await prisma.user.findMany({
      where: userFilter,
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);

    // Get daily performance data
    const dailyData = await prisma.telecallerPerformanceDaily.findMany({
      where: {
        organizationId,
        telecallerId: { in: userIds },
        date: { gte: defaultDateFrom, lte: defaultDateTo },
      },
      orderBy: { date: 'asc' },
    });

    // Group by date
    const byDate: Map<string, { conversions: number; totalCalls: number }> = new Map();
    for (const day of dailyData) {
      const dateStr = day.date.toISOString().split('T')[0];
      const existing = byDate.get(dateStr) || { conversions: 0, totalCalls: 0 };
      byDate.set(dateStr, {
        conversions: existing.conversions + day.convertedCount,
        totalCalls: existing.totalCalls + day.totalCalls,
      });
    }

    return Array.from(byDate.entries()).map(([date, data]) => ({
      date,
      conversions: data.conversions,
      totalCalls: data.totalCalls,
      conversionRate: data.totalCalls > 0 ? Math.round((data.conversions / data.totalCalls) * 10000) / 100 : 0,
    }));
  }

  /**
   * Export team monitoring data to CSV format
   */
  async exportData(filters: TeamMonitoringFilters, exportType: string): Promise<string> {
    let csvContent = '';

    switch (exportType) {
      case 'telecallers': {
        const data = await this.getTelecallerPerformance(filters);
        csvContent = 'Name,Role,Branch,Total Calls,Answered,Conversions,Conversion Rate,Avg Duration,Pending Follow-ups,Overdue\n';
        for (const row of data) {
          csvContent += `"${row.name}","${row.role}","${row.branchName || ''}",${row.totalCalls},${row.answeredCalls},${row.conversions},${row.conversionRate}%,${row.avgCallDuration}s,${row.pendingFollowUps},${row.overdueFollowUps}\n`;
        }
        break;
      }
      case 'outcomes': {
        const data = await this.getCallOutcomes(filters);
        csvContent = 'Outcome,Count,Percentage\n';
        for (const row of data) {
          csvContent += `"${row.outcome}",${row.count},${row.percentage}%\n`;
        }
        break;
      }
      case 'lead-aging': {
        const data = await this.getLeadAging(filters);
        csvContent = 'Age Bucket,Count,Percentage\n';
        for (const row of data) {
          csvContent += `"${row.bucket}",${row.count},${row.percentage}%\n`;
        }
        break;
      }
      case 'follow-ups': {
        const data = await this.getPendingFollowUps(filters);
        csvContent = 'Assignee,Lead Name,Lead Phone,Scheduled At,Status\n';
        for (const assignee of data.byAssignee) {
          for (const followUp of assignee.followUps) {
            csvContent += `"${assignee.assigneeName}","${followUp.leadName}","${followUp.leadPhone}","${followUp.scheduledAt}","${followUp.status}"\n`;
          }
        }
        break;
      }
      default:
        throw new Error(`Unknown export type: ${exportType}`);
    }

    return csvContent;
  }

  /**
   * Get real-time team member status
   * Uses lastActivityAt (updated on every API call) and workStatus (manual override)
   * Applies role-based filtering: managers see their team only, team leads see their reports only
   */
  async getLiveTeamStatus(
    organizationId: string,
    currentUserId?: string,
    currentUserRole?: string
  ): Promise<{
    summary: { total: number; active: number; onBreak: number; offline: number };
    members: Array<{
      id: string;
      name: string;
      avatar?: string;
      role: string;
      status: 'active' | 'break' | 'offline';
      lastActivity?: Date;
    }>;
  }> {
    // Use 30 minutes to match work-session service (consistent with header)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const normalizedRole = currentUserRole?.toLowerCase().replace(/[_-]/g, '');

    // Build where clause based on role
    // Include all active team members including admins for accurate "Active Now" count
    let whereClause: any = {
      organizationId,
      isActive: true,
      role: { slug: { in: ['telecaller', 'counselor', 'team_lead', 'team_leader', 'manager', 'admin', 'super_admin'] } },
    };

    // Role-based filtering
    if (normalizedRole === 'manager' && currentUserId) {
      // Manager: see themselves, their direct reports, and reports of their team leads
      const teamLeads = await prisma.user.findMany({
        where: {
          organizationId,
          managerId: currentUserId,
          role: { slug: { in: ['team_lead', 'team_leader'] } },
          isActive: true,
        },
        select: { id: true },
      });
      const teamLeadIds = teamLeads.map(tl => tl.id);

      whereClause.OR = [
        { id: currentUserId },
        { managerId: currentUserId },
        ...(teamLeadIds.length > 0 ? [{ managerId: { in: teamLeadIds } }] : []),
      ];
    } else if ((normalizedRole === 'teamlead' || normalizedRole === 'teamleader') && currentUserId) {
      // Team Lead: see themselves and their direct reports only
      whereClause.OR = [
        { id: currentUserId },
        { managerId: currentUserId },
      ];
    }
    // Admin: no additional filtering (see all)

    // Get team members with role-based filtering
    const teamMembers = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatar: true,
        lastActivityAt: true,
        workStatus: true,
        role: { select: { name: true, slug: true } },
      },
    });

    // Determine status based on lastActivityAt and workStatus
    const members = teamMembers.map((member) => {
      const lastActivity = member.lastActivityAt;

      // Check manual workStatus first (ON_BREAK takes priority)
      if (member.workStatus === 'ON_BREAK') {
        return {
          id: member.id,
          name: `${member.firstName} ${member.lastName || ''}`.trim(),
          avatar: member.avatar || undefined,
          role: member.role?.name || 'Team Member',
          status: 'break' as const,
          lastActivity: lastActivity || undefined,
        };
      }

      // Determine status based on activity (30 min window - matches header)
      let status: 'active' | 'break' | 'offline' = 'offline';
      if (lastActivity && lastActivity > thirtyMinutesAgo) {
        status = 'active';
      }

      return {
        id: member.id,
        name: `${member.firstName} ${member.lastName || ''}`.trim(),
        avatar: member.avatar || undefined,
        role: member.role?.name || 'Team Member',
        status,
        lastActivity: lastActivity || undefined,
      };
    });

    // Calculate summary
    const summary = {
      total: members.length,
      active: members.filter((m) => m.status === 'active').length,
      onBreak: members.filter((m) => m.status === 'break').length,
      offline: members.filter((m) => m.status === 'offline').length,
    };

    return { summary, members };
  }

  /**
   * Update user work status (for "Take Break" / "Go Active" buttons)
   */
  async updateUserStatus(userId: string, status: 'ACTIVE' | 'ON_BREAK' | 'OFFLINE'): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        workStatus: status,
        // Also update lastActivityAt if going active
        ...(status === 'ACTIVE' ? { lastActivityAt: new Date() } : {}),
      },
    });
  }
}

export const teamMonitoringService = new TeamMonitoringService();
