/**
 * Lead Reports Service
 * Tenant-scoped lead reporting for tenant admins
 *
 * SECURITY: All reports are filtered by organizationId from JWT token
 * Tenant admins can only see their own organization's data
 */

import { prisma } from '../config/database';
import { Prisma } from '@prisma/client';

interface DateRange {
  start: Date;
  end: Date;
}

interface ReportFilters {
  organizationId: string;
  dateRange?: DateRange;
  branchId?: string;
  sourceId?: string;
  stageId?: string;
  assignedToId?: string;
  // Role-based filtering
  userRole?: string;
  userId?: string;
}

interface LeadSummary {
  totalLeads: number;
  newLeads: number;
  convertedLeads: number;
  lostLeads: number;
  conversionRate: string;
  avgLeadAge: number;
}

interface LeadsBySource {
  source: string;
  sourceId: string | null;
  count: number;
  converted: number;
  conversionRate: string;
}

interface LeadsByStage {
  stageId: string;
  stageName: string;
  stageColor: string;
  count: number;
  percentage: string;
}

interface LeadsByCounselor {
  userId: string;
  userName: string;
  email: string;
  totalAssigned: number;
  converted: number;
  pending: number;
  conversionRate: string;
  avgResponseTime: number | null;
}

interface LeadsByBranch {
  branchId: string;
  branchName: string;
  totalLeads: number;
  newLeads: number;
  converted: number;
  conversionRate: string;
}

interface LeadsTrend {
  date: string;
  newLeads: number;
  converted: number;
  cumulative: number;
}

class LeadReportsService {
  /**
   * Build role-based where clause for tenant isolation
   * Ensures users only see leads they're authorized to view
   */
  private async buildRoleBasedWhere(filters: ReportFilters): Promise<Prisma.LeadWhereInput> {
    const { organizationId, userRole, userId, dateRange, branchId, sourceId, stageId, assignedToId } = filters;

    // Base filter - ALWAYS filter by organization (tenant isolation)
    const where: Prisma.LeadWhereInput = { organizationId };

    // Date range filter
    if (dateRange) {
      where.createdAt = { gte: dateRange.start, lte: dateRange.end };
    }

    // Additional filters
    if (branchId) where.branchId = branchId;
    if (sourceId) where.customSourceId = sourceId;
    if (stageId) where.stageId = stageId;
    if (assignedToId) {
      where.assignments = { some: { assignedToId, isActive: true } };
    }

    // Role-based filtering
    const normalizedRole = userRole?.toLowerCase().replace('_', '');

    if (normalizedRole === 'telecaller' || normalizedRole === 'counselor') {
      // Telecaller/Counselor: only their assigned leads
      if (userId) {
        where.assignments = { some: { assignedToId: userId, isActive: true } };
      }
    } else if (normalizedRole === 'teamlead' && userId) {
      // Team Lead: see leads assigned to themselves or team members
      const teamMembers = await prisma.user.findMany({
        where: { organizationId, managerId: userId, isActive: true },
        select: { id: true },
      });
      const allMemberIds = [userId, ...teamMembers.map(m => m.id)];

      where.OR = [
        { assignments: { none: { isActive: true } } }, // Unassigned
        { assignments: { some: { assignedToId: { in: allMemberIds }, isActive: true } } },
      ];
    } else if (normalizedRole === 'manager' && userId) {
      // Manager: see all leads in their hierarchy
      const teamLeads = await prisma.user.findMany({
        where: { organizationId, managerId: userId, isActive: true },
        select: { id: true },
      });
      const teamLeadIds = teamLeads.map(tl => tl.id);

      const allTeamMembers = await prisma.user.findMany({
        where: {
          organizationId,
          OR: [{ managerId: { in: teamLeadIds } }, { managerId: userId }],
          isActive: true,
        },
        select: { id: true },
      });
      const allMemberIds = [userId, ...teamLeadIds, ...allTeamMembers.map(m => m.id)];

      where.OR = [
        { assignments: { none: { isActive: true } } },
        { assignments: { some: { assignedToId: { in: allMemberIds }, isActive: true } } },
      ];
    }
    // Admin/Owner sees all leads (no additional filter)

    return where;
  }

  /**
   * 1. TOTAL LEADS - Summary statistics
   */
  async getTotalLeads(filters: ReportFilters): Promise<LeadSummary> {
    const where = await this.buildRoleBasedWhere(filters);
    const { organizationId, dateRange } = filters;

    // Get won/lost stage IDs
    const stages = await prisma.leadStage.findMany({
      where: { organizationId },
      select: { id: true, slug: true, autoSyncStatus: true },
    });
    const wonStageIds = stages.filter(s => s.autoSyncStatus === 'WON' || s.slug?.includes('won') || s.slug?.includes('enrolled')).map(s => s.id);
    const lostStageIds = stages.filter(s => s.autoSyncStatus === 'LOST' || s.slug?.includes('lost')).map(s => s.id);

    const [totalLeads, newLeads, convertedLeads, lostLeads, avgAge] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.count({
        where: {
          ...where,
          createdAt: dateRange ? { gte: dateRange.start, lte: dateRange.end } : undefined,
        },
      }),
      prisma.lead.count({
        where: {
          ...where,
          stageId: { in: wonStageIds },
        },
      }),
      prisma.lead.count({
        where: {
          ...where,
          stageId: { in: lostStageIds },
        },
      }),
      // Average lead age in days
      prisma.$queryRaw<[{ avg_age: number }]>`
        SELECT AVG(EXTRACT(DAY FROM NOW() - "createdAt")) as avg_age
        FROM leads
        WHERE "organizationId" = ${organizationId}
        AND "stageId" NOT IN (${Prisma.join(wonStageIds.length ? wonStageIds : [''])})
        AND "stageId" NOT IN (${Prisma.join(lostStageIds.length ? lostStageIds : [''])})
      `.catch(() => [{ avg_age: 0 }]),
    ]);

    return {
      totalLeads,
      newLeads,
      convertedLeads,
      lostLeads,
      conversionRate: totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(2) : '0',
      avgLeadAge: Math.round(avgAge[0]?.avg_age || 0),
    };
  }

  /**
   * 2. LEADS BY SOURCE
   */
  async getLeadsBySource(filters: ReportFilters): Promise<LeadsBySource[]> {
    const where = await this.buildRoleBasedWhere(filters);
    const { organizationId } = filters;

    // Get won stage IDs for conversion calculation
    const wonStages = await prisma.leadStage.findMany({
      where: { organizationId, OR: [{ autoSyncStatus: 'WON' }, { slug: { contains: 'won' } }] },
      select: { id: true },
    });
    const wonStageIds = wonStages.map(s => s.id);

    // Group by source
    const leadsBySource = await prisma.lead.groupBy({
      by: ['source', 'customSourceId'],
      where,
      _count: { id: true },
    });

    // Get custom source names
    const customSources = await prisma.customLeadSource.findMany({
      where: { organizationId },
      select: { id: true, name: true },
    });
    const sourceMap = customSources.reduce((acc, s) => {
      acc[s.id] = s.name;
      return acc;
    }, {} as Record<string, string>);

    // Calculate conversions per source
    const results: LeadsBySource[] = [];
    for (const item of leadsBySource) {
      const converted = await prisma.lead.count({
        where: {
          ...where,
          source: item.source,
          customSourceId: item.customSourceId,
          stageId: { in: wonStageIds },
        },
      });

      const sourceName = item.customSourceId
        ? sourceMap[item.customSourceId] || item.source || 'Unknown'
        : item.source || 'Unknown';

      results.push({
        source: sourceName,
        sourceId: item.customSourceId,
        count: item._count.id,
        converted,
        conversionRate: item._count.id > 0 ? ((converted / item._count.id) * 100).toFixed(2) : '0',
      });
    }

    return results.sort((a, b) => b.count - a.count);
  }

  /**
   * 3. LEADS BY STAGE (Pipeline view)
   */
  async getLeadsByStage(filters: ReportFilters): Promise<LeadsByStage[]> {
    const where = await this.buildRoleBasedWhere(filters);
    const { organizationId } = filters;

    // Get all stages
    const stages = await prisma.leadStage.findMany({
      where: { organizationId, isActive: true },
      orderBy: { order: 'asc' },
      select: { id: true, name: true, color: true },
    });

    // Group leads by stage
    const leadsByStage = await prisma.lead.groupBy({
      by: ['stageId'],
      where,
      _count: { id: true },
    });

    const totalLeads = leadsByStage.reduce((sum, item) => sum + item._count.id, 0);

    const stageCountMap = leadsByStage.reduce((acc, item) => {
      if (item.stageId) acc[item.stageId] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    return stages.map(stage => ({
      stageId: stage.id,
      stageName: stage.name,
      stageColor: stage.color || '#3B82F6',
      count: stageCountMap[stage.id] || 0,
      percentage: totalLeads > 0 ? (((stageCountMap[stage.id] || 0) / totalLeads) * 100).toFixed(1) : '0',
    }));
  }

  /**
   * 4. LEADS BY COUNSELOR/ASSIGNEE
   */
  async getLeadsByCounselor(filters: ReportFilters): Promise<LeadsByCounselor[]> {
    const { organizationId, dateRange } = filters;

    // Get won stage IDs
    const wonStages = await prisma.leadStage.findMany({
      where: { organizationId, OR: [{ autoSyncStatus: 'WON' }, { slug: { contains: 'won' } }] },
      select: { id: true },
    });
    const wonStageIds = wonStages.map(s => s.id);

    // Get all counselors/telecallers
    const users = await prisma.user.findMany({
      where: {
        organizationId,
        isActive: true,
        role: { slug: { in: ['telecaller', 'counselor', 'sales_rep', 'team_lead'] } },
      },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    const results: LeadsByCounselor[] = [];

    for (const user of users) {
      const baseWhere: Prisma.LeadWhereInput = {
        organizationId,
        assignments: { some: { assignedToId: user.id, isActive: true } },
      };

      if (dateRange) {
        baseWhere.createdAt = { gte: dateRange.start, lte: dateRange.end };
      }

      const [totalAssigned, converted, pending] = await Promise.all([
        prisma.lead.count({ where: baseWhere }),
        prisma.lead.count({
          where: { ...baseWhere, stageId: { in: wonStageIds } },
        }),
        prisma.lead.count({
          where: { ...baseWhere, stageId: { notIn: wonStageIds } },
        }),
      ]);

      results.push({
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        totalAssigned,
        converted,
        pending,
        conversionRate: totalAssigned > 0 ? ((converted / totalAssigned) * 100).toFixed(2) : '0',
        avgResponseTime: null, // Would need call/activity logs to calculate
      });
    }

    return results.sort((a, b) => b.totalAssigned - a.totalAssigned);
  }

  /**
   * 5. LEADS BY BRANCH
   */
  async getLeadsByBranch(filters: ReportFilters): Promise<LeadsByBranch[]> {
    const where = await this.buildRoleBasedWhere(filters);
    const { organizationId, dateRange } = filters;

    // Get all branches
    const branches = await prisma.branch.findMany({
      where: { organizationId, isActive: true },
      select: { id: true, name: true },
    });

    // Get won stage IDs
    const wonStages = await prisma.leadStage.findMany({
      where: { organizationId, OR: [{ autoSyncStatus: 'WON' }, { slug: { contains: 'won' } }] },
      select: { id: true },
    });
    const wonStageIds = wonStages.map(s => s.id);

    const results: LeadsByBranch[] = [];

    for (const branch of branches) {
      const branchWhere: Prisma.LeadWhereInput = { ...where, branchId: branch.id };

      const [totalLeads, newLeads, converted] = await Promise.all([
        prisma.lead.count({ where: branchWhere }),
        prisma.lead.count({
          where: {
            ...branchWhere,
            createdAt: dateRange ? { gte: dateRange.start, lte: dateRange.end } : undefined,
          },
        }),
        prisma.lead.count({
          where: { ...branchWhere, stageId: { in: wonStageIds } },
        }),
      ]);

      results.push({
        branchId: branch.id,
        branchName: branch.name,
        totalLeads,
        newLeads,
        converted,
        conversionRate: totalLeads > 0 ? ((converted / totalLeads) * 100).toFixed(2) : '0',
      });
    }

    // Add "No Branch" count
    const noBranchWhere: Prisma.LeadWhereInput = { ...where, branchId: null };
    const [noBranchTotal, noBranchNew, noBranchConverted] = await Promise.all([
      prisma.lead.count({ where: noBranchWhere }),
      prisma.lead.count({
        where: {
          ...noBranchWhere,
          createdAt: dateRange ? { gte: dateRange.start, lte: dateRange.end } : undefined,
        },
      }),
      prisma.lead.count({
        where: { ...noBranchWhere, stageId: { in: wonStageIds } },
      }),
    ]);

    if (noBranchTotal > 0) {
      results.push({
        branchId: 'none',
        branchName: 'No Branch Assigned',
        totalLeads: noBranchTotal,
        newLeads: noBranchNew,
        converted: noBranchConverted,
        conversionRate: noBranchTotal > 0 ? ((noBranchConverted / noBranchTotal) * 100).toFixed(2) : '0',
      });
    }

    return results.sort((a, b) => b.totalLeads - a.totalLeads);
  }

  /**
   * 6. LEADS BY DATE RANGE (Trend analysis)
   */
  async getLeadsTrend(filters: ReportFilters, interval: 'day' | 'week' | 'month' = 'day'): Promise<LeadsTrend[]> {
    const where = await this.buildRoleBasedWhere(filters);
    const { organizationId, dateRange } = filters;

    if (!dateRange) {
      // Default to last 30 days
      const end = new Date();
      const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
      filters.dateRange = { start, end };
    }

    // Get won stage IDs
    const wonStages = await prisma.leadStage.findMany({
      where: { organizationId, OR: [{ autoSyncStatus: 'WON' }, { slug: { contains: 'won' } }] },
      select: { id: true },
    });
    const wonStageIds = wonStages.map(s => s.id);

    // Get all leads in date range
    const leads = await prisma.lead.findMany({
      where: {
        ...where,
        createdAt: { gte: filters.dateRange!.start, lte: filters.dateRange!.end },
      },
      select: { createdAt: true, stageId: true, convertedAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by interval
    const groupedData = new Map<string, { newLeads: number; converted: number }>();

    for (const lead of leads) {
      const key = this.getIntervalKey(lead.createdAt, interval);
      const current = groupedData.get(key) || { newLeads: 0, converted: 0 };
      current.newLeads++;
      if (lead.stageId && wonStageIds.includes(lead.stageId)) {
        current.converted++;
      }
      groupedData.set(key, current);
    }

    // Convert to array with cumulative
    let cumulative = 0;
    const results: LeadsTrend[] = [];
    const sortedKeys = Array.from(groupedData.keys()).sort();

    for (const date of sortedKeys) {
      const data = groupedData.get(date)!;
      cumulative += data.newLeads;
      results.push({
        date,
        newLeads: data.newLeads,
        converted: data.converted,
        cumulative,
      });
    }

    return results;
  }

  /**
   * 7. NEW VS OLD LEADS
   */
  async getNewVsOldLeads(filters: ReportFilters, daysThreshold: number = 30): Promise<{
    newLeads: { count: number; percentage: string };
    oldLeads: { count: number; percentage: string };
    threshold: number;
  }> {
    const where = await this.buildRoleBasedWhere(filters);

    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

    const [newLeads, oldLeads] = await Promise.all([
      prisma.lead.count({
        where: { ...where, createdAt: { gte: thresholdDate } },
      }),
      prisma.lead.count({
        where: { ...where, createdAt: { lt: thresholdDate } },
      }),
    ]);

    const total = newLeads + oldLeads;

    return {
      newLeads: {
        count: newLeads,
        percentage: total > 0 ? ((newLeads / total) * 100).toFixed(1) : '0',
      },
      oldLeads: {
        count: oldLeads,
        percentage: total > 0 ? ((oldLeads / total) * 100).toFixed(1) : '0',
      },
      threshold: daysThreshold,
    };
  }

  /**
   * 8. UNASSIGNED LEADS
   */
  async getUnassignedLeads(filters: ReportFilters): Promise<{
    count: number;
    percentage: string;
    bySource: { source: string; count: number }[];
    byStage: { stage: string; count: number }[];
    oldestUnassigned: Date | null;
  }> {
    const { organizationId, dateRange } = filters;

    const baseWhere: Prisma.LeadWhereInput = {
      organizationId,
      assignments: { none: { isActive: true } },
    };

    if (dateRange) {
      baseWhere.createdAt = { gte: dateRange.start, lte: dateRange.end };
    }

    const [unassignedCount, totalCount, bySource, byStage, oldest] = await Promise.all([
      prisma.lead.count({ where: baseWhere }),
      prisma.lead.count({ where: { organizationId } }),
      prisma.lead.groupBy({
        by: ['source'],
        where: baseWhere,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      prisma.lead.groupBy({
        by: ['stageId'],
        where: baseWhere,
        _count: { id: true },
      }),
      prisma.lead.findFirst({
        where: baseWhere,
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      }),
    ]);

    // Get stage names
    const stages = await prisma.leadStage.findMany({
      where: { organizationId },
      select: { id: true, name: true },
    });
    const stageMap = stages.reduce((acc, s) => {
      acc[s.id] = s.name;
      return acc;
    }, {} as Record<string, string>);

    return {
      count: unassignedCount,
      percentage: totalCount > 0 ? ((unassignedCount / totalCount) * 100).toFixed(1) : '0',
      bySource: bySource.map(item => ({
        source: item.source || 'Unknown',
        count: item._count.id,
      })),
      byStage: byStage.map(item => ({
        stage: item.stageId ? stageMap[item.stageId] || 'Unknown' : 'No Stage',
        count: item._count.id,
      })),
      oldestUnassigned: oldest?.createdAt || null,
    };
  }

  /**
   * 9. STALE LEADS (No activity for X days)
   */
  async getStaleLeads(filters: ReportFilters, staleDays: number = 7): Promise<{
    count: number;
    percentage: string;
    byCounselor: { name: string; count: number }[];
    byStage: { stage: string; count: number }[];
    avgDaysSinceActivity: number;
  }> {
    const { organizationId } = filters;

    const staleDate = new Date();
    staleDate.setDate(staleDate.getDate() - staleDays);

    // Get non-closed stages
    const activeStages = await prisma.leadStage.findMany({
      where: {
        organizationId,
        autoSyncStatus: null, // Not won or lost
        slug: { notIn: ['won', 'lost', 'enrolled', 'closed'] },
      },
      select: { id: true, name: true },
    });
    const activeStageIds = activeStages.map(s => s.id);
    const stageMap = activeStages.reduce((acc, s) => {
      acc[s.id] = s.name;
      return acc;
    }, {} as Record<string, string>);

    // Stale = in active stage + no recent activity
    const staleWhere: Prisma.LeadWhereInput = {
      organizationId,
      stageId: { in: activeStageIds },
      updatedAt: { lt: staleDate },
    };

    const [staleCount, totalActive, byStage, byCounselor] = await Promise.all([
      prisma.lead.count({ where: staleWhere }),
      prisma.lead.count({ where: { organizationId, stageId: { in: activeStageIds } } }),
      prisma.lead.groupBy({
        by: ['stageId'],
        where: staleWhere,
        _count: { id: true },
      }),
      // Get stale leads by counselor
      prisma.lead.findMany({
        where: staleWhere,
        select: {
          assignments: {
            where: { isActive: true },
            select: {
              assignedTo: { select: { firstName: true, lastName: true } },
            },
            take: 1,
          },
        },
      }),
    ]);

    // Count by counselor
    const counselorCounts: Record<string, number> = {};
    for (const lead of byCounselor) {
      const assignment = lead.assignments[0];
      const name = assignment
        ? `${assignment.assignedTo.firstName} ${assignment.assignedTo.lastName}`.trim()
        : 'Unassigned';
      counselorCounts[name] = (counselorCounts[name] || 0) + 1;
    }

    // Calculate average days since activity
    const avgDays = await prisma.$queryRaw<[{ avg_days: number }]>`
      SELECT AVG(EXTRACT(DAY FROM NOW() - "updatedAt")) as avg_days
      FROM leads
      WHERE "organizationId" = ${organizationId}
      AND "stageId" = ANY(${activeStageIds}::text[])
      AND "updatedAt" < ${staleDate}
    `.catch(() => [{ avg_days: staleDays }]);

    return {
      count: staleCount,
      percentage: totalActive > 0 ? ((staleCount / totalActive) * 100).toFixed(1) : '0',
      byCounselor: Object.entries(counselorCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      byStage: byStage.map(item => ({
        stage: item.stageId ? stageMap[item.stageId] || 'Unknown' : 'No Stage',
        count: item._count.id,
      })),
      avgDaysSinceActivity: Math.round(avgDays[0]?.avg_days || staleDays),
    };
  }

  /**
   * COMPREHENSIVE LEAD REPORT - All metrics in one call
   */
  async getComprehensiveReport(filters: ReportFilters): Promise<{
    summary: LeadSummary;
    bySource: LeadsBySource[];
    byStage: LeadsByStage[];
    byCounselor: LeadsByCounselor[];
    byBranch: LeadsByBranch[];
    trend: LeadsTrend[];
    newVsOld: Awaited<ReturnType<typeof this.getNewVsOldLeads>>;
    unassigned: Awaited<ReturnType<typeof this.getUnassignedLeads>>;
    stale: Awaited<ReturnType<typeof this.getStaleLeads>>;
  }> {
    const [
      summary,
      bySource,
      byStage,
      byCounselor,
      byBranch,
      trend,
      newVsOld,
      unassigned,
      stale,
    ] = await Promise.all([
      this.getTotalLeads(filters),
      this.getLeadsBySource(filters),
      this.getLeadsByStage(filters),
      this.getLeadsByCounselor(filters),
      this.getLeadsByBranch(filters),
      this.getLeadsTrend(filters),
      this.getNewVsOldLeads(filters),
      this.getUnassignedLeads(filters),
      this.getStaleLeads(filters),
    ]);

    return {
      summary,
      bySource,
      byStage,
      byCounselor,
      byBranch,
      trend,
      newVsOld,
      unassigned,
      stale,
    };
  }

  /**
   * 10. USER STAGE REPORT - Lead stage distribution by user
   */
  async getUserStageReport(filters: ReportFilters): Promise<{
    users: {
      no: number;
      userId: string;
      username: string;
      totalAssignedLeads: number;
      stageBreakdown: Record<string, number>;
      converted: number;
      lost: number;
      inProgress: number;
    }[];
    summary: {
      totalLeads: number;
      totalConverted: number;
      totalInProgress: number;
      totalLost: number;
    };
    stages: { id: string; name: string; slug: string }[];
  }> {
    const { organizationId, dateRange } = filters;

    // Get all stages for this organization
    const stages = await prisma.leadStage.findMany({
      where: { organizationId, isActive: true },
      orderBy: { order: 'asc' },
      select: { id: true, name: true, slug: true, autoSyncStatus: true },
    });

    const wonStageIds = stages.filter(s => s.autoSyncStatus === 'WON' || s.slug?.includes('won') || s.slug?.includes('converted') || s.slug?.includes('admitted') || s.slug?.includes('enrolled')).map(s => s.id);
    const lostStageIds = stages.filter(s => s.autoSyncStatus === 'LOST' || s.slug?.includes('lost')).map(s => s.id);

    // Get all users with assignments
    const users = await prisma.user.findMany({
      where: {
        organizationId,
        isActive: true,
        role: { slug: { in: ['telecaller', 'counselor', 'sales_rep', 'team_lead', 'manager', 'admin', 'owner'] } },
      },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: 'asc' },
    });

    const results: {
      no: number;
      userId: string;
      username: string;
      totalAssignedLeads: number;
      stageBreakdown: Record<string, number>;
      converted: number;
      lost: number;
      inProgress: number;
    }[] = [];

    let totalLeads = 0;
    let totalConverted = 0;
    let totalLost = 0;
    let totalInProgress = 0;

    for (let i = 0; i < users.length; i++) {
      const user = users[i];

      // Get all leads assigned to this user
      const baseWhere: Prisma.LeadWhereInput = {
        organizationId,
        assignments: { some: { assignedToId: user.id, isActive: true } },
      };

      if (dateRange) {
        baseWhere.createdAt = { gte: dateRange.start, lte: dateRange.end };
      }

      // Get leads grouped by stage
      const leadsByStage = await prisma.lead.groupBy({
        by: ['stageId'],
        where: baseWhere,
        _count: { id: true },
      });

      // Build stage breakdown
      const stageBreakdown: Record<string, number> = {};
      let userTotal = 0;
      let userConverted = 0;
      let userLost = 0;
      let userInProgress = 0;

      for (const stage of stages) {
        const found = leadsByStage.find(l => l.stageId === stage.id);
        const count = found?._count.id || 0;
        stageBreakdown[stage.slug || stage.name] = count;
        userTotal += count;

        if (wonStageIds.includes(stage.id)) {
          userConverted += count;
        } else if (lostStageIds.includes(stage.id)) {
          userLost += count;
        } else {
          userInProgress += count;
        }
      }

      // Only include users with assigned leads
      if (userTotal > 0) {
        results.push({
          no: results.length + 1,
          userId: user.id,
          username: `${user.firstName} ${user.lastName}`.trim(),
          totalAssignedLeads: userTotal,
          stageBreakdown,
          converted: userConverted,
          lost: userLost,
          inProgress: userInProgress,
        });

        totalLeads += userTotal;
        totalConverted += userConverted;
        totalLost += userLost;
        totalInProgress += userInProgress;
      }
    }

    return {
      users: results,
      summary: {
        totalLeads,
        totalConverted,
        totalInProgress,
        totalLost,
      },
      stages: stages.map(s => ({ id: s.id, name: s.name, slug: s.slug || s.name })),
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

export const leadReportsService = new LeadReportsService();
