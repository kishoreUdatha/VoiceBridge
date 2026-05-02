/**
 * Unified Dashboard Service
 *
 * Provides consistent dashboard statistics across mobile and web platforms.
 * Uses UnifiedAccessService for role-based filtering.
 *
 * This consolidates logic from:
 * - telecaller.routes.ts (GET /stats)
 * - lead.service.ts (getStats)
 */

import { prisma } from '../config/database';
import { unifiedAccessService, AccessContext } from './unified-access.service';
import { Prisma } from '@prisma/client';

/**
 * Dashboard statistics options
 */
export interface DashboardOptions {
  dateFrom?: Date;
  dateTo?: Date;
  pipelineId?: string;
  includeCallStats?: boolean;
  includeConversionRate?: boolean;
}

/**
 * Dashboard statistics result
 */
export interface DashboardStats {
  leads: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
    converted: number;
    conversionRate: number;
    byStatus: Record<string, number>;
    bySource: Record<string, number>;
  };
  calls?: {
    total: number;
    today: number;
    connected: number;
    avgDuration: number;
    byOutcome: Record<string, number>;
  };
  followUps?: {
    pending: number;
    overdue: number;
    completedToday: number;
  };
  pipeline?: {
    stageStats: Array<{
      stageId: string;
      stageName: string;
      count: number;
    }>;
  };
}

/**
 * Quick summary counts (for mobile dashboard header)
 */
export interface DashboardSummary {
  totalLeads: number;
  pendingFollowUps: number;
  todayCalls: number;
  conversionRate: number;
}

/**
 * Unified Dashboard Service
 */
export class UnifiedDashboardService {
  /**
   * Get comprehensive dashboard statistics
   * Works consistently for both mobile and web
   */
  async getStats(context: AccessContext, options: DashboardOptions = {}): Promise<DashboardStats> {
    const { includeCallStats = true, includeConversionRate = true } = options;

    // Get role-based lead filter
    const leadFilter = await unifiedAccessService.getLeadFilter(context);

    // Calculate date boundaries
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);

    const monthStart = new Date(now);
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    // Build queries with role-based filter
    const [
      totalLeads,
      convertedLeads,
      todayLeads,
      weekLeads,
      monthLeads,
      byStatus,
      byPipelineStage,
      bySource,
      stages,
      pipelineStages,
    ] = await Promise.all([
      // Total leads
      prisma.lead.count({ where: leadFilter }),

      // Converted leads
      prisma.lead.count({ where: { ...leadFilter, isConverted: true } }),

      // Today's leads
      prisma.lead.count({
        where: { ...leadFilter, createdAt: { gte: todayStart } },
      }),

      // This week's leads
      prisma.lead.count({
        where: { ...leadFilter, createdAt: { gte: weekStart } },
      }),

      // This month's leads
      prisma.lead.count({
        where: { ...leadFilter, createdAt: { gte: monthStart } },
      }),

      // Group by lead stage (stageId)
      prisma.lead.groupBy({
        by: ['stageId'],
        where: { ...leadFilter, stageId: { not: null } },
        _count: true,
      }),

      // Group by pipeline stage (pipelineStageId) - for leads without stageId
      prisma.lead.groupBy({
        by: ['pipelineStageId'],
        where: { ...leadFilter, stageId: null, pipelineStageId: { not: null } },
        _count: true,
      }),

      // Group by source
      prisma.lead.groupBy({
        by: ['source'],
        where: leadFilter,
        _count: true,
      }),

      // Get stage names
      prisma.leadStage.findMany({
        where: { organizationId: context.organizationId },
        select: { id: true, name: true },
      }),

      // Get pipeline stage names
      prisma.pipelineStage.findMany({
        where: { pipeline: { organizationId: context.organizationId } },
        select: { id: true, name: true },
      }),
    ]);

    // Build stage name maps
    const stageMap = stages.reduce((acc, s) => {
      acc[s.id] = s.name;
      return acc;
    }, {} as Record<string, string>);

    const pipelineStageMap = pipelineStages.reduce((acc, s) => {
      acc[s.id] = s.name;
      return acc;
    }, {} as Record<string, string>);

    // Combine status counts (prefer lead stages over pipeline stages)
    const statusCounts: Record<string, number> = {};

    // Add lead stage counts
    byStatus.forEach((item) => {
      if (item.stageId) {
        const stageName = stageMap[item.stageId] || 'Unknown';
        statusCounts[stageName] = (statusCounts[stageName] || 0) + item._count;
      }
    });

    // Add pipeline stage counts (fallback)
    byPipelineStage.forEach((item) => {
      if (item.pipelineStageId) {
        const stageName = pipelineStageMap[item.pipelineStageId] || 'Unknown';
        statusCounts[stageName] = (statusCounts[stageName] || 0) + item._count;
      }
    });

    // Calculate unassigned count
    const leadsWithStatus = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
    const unassignedCount = totalLeads - leadsWithStatus;
    if (unassignedCount > 0) {
      statusCounts['Unassigned'] = unassignedCount;
    }

    // Build source counts
    const sourceCounts = bySource.reduce((acc, item) => {
      acc[item.source] = item._count;
      return acc;
    }, {} as Record<string, number>);

    // Calculate conversion rate
    const conversionRate = includeConversionRate && totalLeads > 0
      ? Math.round((convertedLeads / totalLeads) * 1000) / 10
      : 0;

    // Build result
    const result: DashboardStats = {
      leads: {
        total: totalLeads,
        today: todayLeads,
        thisWeek: weekLeads,
        thisMonth: monthLeads,
        converted: convertedLeads,
        conversionRate,
        byStatus: statusCounts,
        bySource: sourceCounts,
      },
    };

    // Add call stats if requested
    if (includeCallStats) {
      const callStats = await this.getCallStats(context, todayStart);
      result.calls = callStats;
    }

    // Add follow-up stats
    result.followUps = await this.getFollowUpStats(context, todayStart);

    return result;
  }

  /**
   * Get quick summary counts for dashboard header
   */
  async getSummary(context: AccessContext): Promise<DashboardSummary> {
    const leadFilter = await unifiedAccessService.getLeadFilter(context);
    const followUpFilter = await unifiedAccessService.getFollowUpFilter(context);

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const [totalLeads, pendingFollowUps, todayCalls, convertedLeads] = await Promise.all([
      prisma.lead.count({ where: leadFilter }),

      prisma.followUp.count({
        where: {
          ...followUpFilter,
          status: 'UPCOMING',
          scheduledAt: { lte: todayEnd },
        },
      }),

      prisma.telecallerCall.count({
        where: {
          organizationId: context.organizationId,
          telecallerId: context.userId,
          createdAt: { gte: todayStart },
        },
      }),

      prisma.lead.count({
        where: { ...leadFilter, isConverted: true },
      }),
    ]);

    return {
      totalLeads,
      pendingFollowUps,
      todayCalls,
      conversionRate: totalLeads > 0
        ? Math.round((convertedLeads / totalLeads) * 1000) / 10
        : 0,
    };
  }

  /**
   * Get call statistics
   */
  private async getCallStats(
    context: AccessContext,
    todayStart: Date
  ): Promise<DashboardStats['calls']> {
    const callFilter = await unifiedAccessService.getCallFilter(context);

    const [totalCalls, todayCalls, connectedCalls, avgDuration, byOutcome] = await Promise.all([
      prisma.telecallerCall.count({ where: callFilter }),

      prisma.telecallerCall.count({
        where: { ...callFilter, createdAt: { gte: todayStart } },
      }),

      prisma.telecallerCall.count({
        where: { ...callFilter, status: 'COMPLETED' },
      }),

      prisma.telecallerCall.aggregate({
        where: { ...callFilter, duration: { gt: 0 } },
        _avg: { duration: true },
      }),

      prisma.telecallerCall.groupBy({
        by: ['outcome'],
        where: callFilter,
        _count: true,
      }),
    ]);

    const outcomeCounts = byOutcome.reduce((acc, item) => {
      if (item.outcome) {
        acc[item.outcome] = item._count;
      }
      return acc;
    }, {} as Record<string, number>);

    return {
      total: totalCalls,
      today: todayCalls,
      connected: connectedCalls,
      avgDuration: Math.round(avgDuration._avg.duration || 0),
      byOutcome: outcomeCounts,
    };
  }

  /**
   * Get follow-up statistics
   */
  private async getFollowUpStats(
    context: AccessContext,
    todayStart: Date
  ): Promise<DashboardStats['followUps']> {
    const followUpFilter = await unifiedAccessService.getFollowUpFilter(context);
    const now = new Date();
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const [pending, overdue, completedToday] = await Promise.all([
      // Pending follow-ups (scheduled for today or earlier, not completed)
      prisma.followUp.count({
        where: {
          ...followUpFilter,
          status: 'UPCOMING',
          scheduledAt: { lte: todayEnd },
        },
      }),

      // Overdue follow-ups (past due, not completed)
      prisma.followUp.count({
        where: {
          ...followUpFilter,
          status: 'UPCOMING',
          scheduledAt: { lt: todayStart },
        },
      }),

      // Completed today
      prisma.followUp.count({
        where: {
          ...followUpFilter,
          status: 'COMPLETED',
          completedAt: { gte: todayStart },
        },
      }),
    ]);

    return {
      pending,
      overdue,
      completedToday,
    };
  }
}

// Export singleton instance
export const unifiedDashboardService = new UnifiedDashboardService();
