import { prisma } from '../config/database';
import { AuthenticatedRequest } from '../middlewares/auth';
import { BaseTenantService } from './base-tenant.service';

/**
 * TENANT REPORTS SERVICE
 *
 * All report queries are automatically filtered by tenant.
 * Super admins can view cross-tenant aggregated reports.
 *
 * SECURITY: Reports NEVER include data from other tenants
 * unless explicitly requested by super admin.
 */

interface DateRange {
  startDate?: Date;
  endDate?: Date;
}

interface ReportFilters extends DateRange {
  branchId?: string;
  userId?: string;
}

export class TenantReportsService extends BaseTenantService {
  /**
   * Lead statistics - tenant filtered
   */
  async getLeadStats(req: AuthenticatedRequest, filters: ReportFilters = {}) {
    const orgId = this.getOrgId(req);

    const whereClause: any = {
      organizationId: orgId,
    };

    if (filters.startDate || filters.endDate) {
      whereClause.createdAt = {};
      if (filters.startDate) {
        whereClause.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        whereClause.createdAt.lte = filters.endDate;
      }
    }

    if (filters.branchId) {
      whereClause.branchId = filters.branchId;
    }

    if (filters.userId) {
      whereClause.assignedToId = filters.userId;
    }

    const [total, byStatus, bySource, conversionRate] = await Promise.all([
      // Total leads
      this.prisma.lead.count({ where: whereClause }),

      // Leads by status
      this.prisma.lead.groupBy({
        by: ['status'],
        where: whereClause,
        _count: { id: true },
      }),

      // Leads by source
      this.prisma.lead.groupBy({
        by: ['source'],
        where: whereClause,
        _count: { id: true },
      }),

      // Conversion rate (leads that became customers)
      this.prisma.lead.count({
        where: {
          ...whereClause,
          status: { in: ['CONVERTED', 'WON', 'CLOSED_WON'] },
        },
      }),
    ]);

    return {
      total,
      byStatus: byStatus.map((s) => ({
        status: s.status,
        count: s._count.id,
      })),
      bySource: bySource.map((s) => ({
        source: s.source,
        count: s._count.id,
      })),
      conversionRate: total > 0 ? (conversionRate / total) * 100 : 0,
    };
  }

  /**
   * User performance report - tenant filtered
   */
  async getUserPerformance(req: AuthenticatedRequest, filters: ReportFilters = {}) {
    const orgId = this.getOrgId(req);

    const whereClause: any = {
      organizationId: orgId,
    };

    if (filters.startDate || filters.endDate) {
      whereClause.createdAt = {};
      if (filters.startDate) {
        whereClause.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        whereClause.createdAt.lte = filters.endDate;
      }
    }

    // Get users with their lead counts
    const users = await this.prisma.user.findMany({
      where: {
        organizationId: orgId,
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        _count: {
          select: {
            assignedLeads: {
              where: whereClause,
            },
          },
        },
      },
    });

    // Get call stats per user
    const callStats = await this.prisma.call.groupBy({
      by: ['userId'],
      where: {
        organizationId: orgId,
        ...(filters.startDate && { createdAt: { gte: filters.startDate } }),
        ...(filters.endDate && { createdAt: { lte: filters.endDate } }),
      },
      _count: { id: true },
      _sum: { duration: true },
    });

    const callStatsMap = new Map(
      callStats.map((c) => [c.userId, { calls: c._count.id, duration: c._sum.duration || 0 }])
    );

    return users.map((user) => ({
      userId: user.id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      leadsAssigned: user._count.assignedLeads,
      totalCalls: callStatsMap.get(user.id)?.calls || 0,
      totalCallDuration: callStatsMap.get(user.id)?.duration || 0,
    }));
  }

  /**
   * Revenue report - tenant filtered
   */
  async getRevenueReport(req: AuthenticatedRequest, filters: ReportFilters = {}) {
    const orgId = this.getOrgId(req);

    const whereClause: any = {
      organizationId: orgId,
      status: 'COMPLETED',
    };

    if (filters.startDate || filters.endDate) {
      whereClause.createdAt = {};
      if (filters.startDate) {
        whereClause.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        whereClause.createdAt.lte = filters.endDate;
      }
    }

    const [totalRevenue, revenueByMonth, revenueByBranch] = await Promise.all([
      // Total revenue
      this.prisma.payment.aggregate({
        where: whereClause,
        _sum: { amount: true },
        _count: { id: true },
      }),

      // Revenue by month (last 12 months)
      this.getMonthlyRevenue(orgId, filters),

      // Revenue by branch
      this.prisma.payment.groupBy({
        by: ['branchId'],
        where: whereClause,
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    return {
      totalRevenue: totalRevenue._sum.amount || 0,
      totalTransactions: totalRevenue._count.id,
      averageTransaction:
        totalRevenue._count.id > 0
          ? (totalRevenue._sum.amount || 0) / totalRevenue._count.id
          : 0,
      byMonth: revenueByMonth,
      byBranch: revenueByBranch,
    };
  }

  /**
   * Monthly revenue breakdown
   */
  private async getMonthlyRevenue(orgId: string, filters: ReportFilters) {
    const startDate = filters.startDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const endDate = filters.endDate || new Date();

    const payments = await this.prisma.payment.findMany({
      where: {
        organizationId: orgId,
        status: 'COMPLETED',
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        amount: true,
        createdAt: true,
      },
    });

    // Group by month
    const monthlyMap = new Map<string, number>();
    payments.forEach((p) => {
      const monthKey = `${p.createdAt.getFullYear()}-${String(p.createdAt.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + Number(p.amount));
    });

    return Array.from(monthlyMap.entries())
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  /**
   * Activity summary - tenant filtered
   */
  async getActivitySummary(req: AuthenticatedRequest, filters: ReportFilters = {}) {
    const orgId = this.getOrgId(req);

    const dateFilter: any = {};
    if (filters.startDate) dateFilter.gte = filters.startDate;
    if (filters.endDate) dateFilter.lte = filters.endDate;

    const [calls, messages, tasks, notes] = await Promise.all([
      // Calls count
      this.prisma.call.count({
        where: {
          organizationId: orgId,
          ...(Object.keys(dateFilter).length && { createdAt: dateFilter }),
        },
      }),

      // Messages count
      this.prisma.message.count({
        where: {
          organizationId: orgId,
          ...(Object.keys(dateFilter).length && { createdAt: dateFilter }),
        },
      }),

      // Tasks count
      this.prisma.task.count({
        where: {
          organizationId: orgId,
          ...(Object.keys(dateFilter).length && { createdAt: dateFilter }),
        },
      }),

      // Notes count
      this.prisma.note.count({
        where: {
          organizationId: orgId,
          ...(Object.keys(dateFilter).length && { createdAt: dateFilter }),
        },
      }),
    ]);

    return {
      calls,
      messages,
      tasks,
      notes,
      total: calls + messages + tasks + notes,
    };
  }

  /**
   * SUPER ADMIN ONLY: Cross-tenant aggregate report
   */
  async getPlatformReport(req: AuthenticatedRequest) {
    const ctx = this.getTenantContext(req);

    if (!ctx.isSuperAdmin) {
      throw new Error('Super admin access required');
    }

    const [
      totalOrganizations,
      activeOrganizations,
      totalUsers,
      activeUsers,
      totalLeads,
      totalRevenue,
      byIndustry,
      byDynamicIndustry,
    ] = await Promise.all([
      this.prisma.organization.count(),
      this.prisma.organization.count({ where: { isActive: true } }),
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.lead.count(),
      this.prisma.payment.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      // Organizations by legacy industry enum
      this.prisma.organization.groupBy({
        by: ['industry'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      // Organizations by dynamic industry (new system)
      this.prisma.organization.groupBy({
        by: ['industrySlug'],
        where: { industrySlug: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
    ]);

    return {
      organizations: {
        total: totalOrganizations,
        active: activeOrganizations,
        byIndustry: byIndustry.map(item => ({
          industry: item.industry || 'GENERAL',
          count: item._count.id,
        })),
        byDynamicIndustry: byDynamicIndustry.map(item => ({
          industrySlug: item.industrySlug || 'general',
          count: item._count.id,
        })),
      },
      users: {
        total: totalUsers,
        active: activeUsers,
      },
      leads: {
        total: totalLeads,
      },
      revenue: {
        total: totalRevenue._sum.amount || 0,
      },
    };
  }

  /**
   * SUPER ADMIN ONLY: Industry-wise detailed report
   */
  async getIndustryReport(req: AuthenticatedRequest) {
    const ctx = this.getTenantContext(req);

    if (!ctx.isSuperAdmin) {
      throw new Error('Super admin access required');
    }

    // Get all dynamic industries with their organization counts
    const industries = await this.prisma.dynamicIndustry.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { organizations: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Get lead counts per industry
    const industryStats = await Promise.all(
      industries.map(async (industry) => {
        const orgIds = await this.prisma.organization.findMany({
          where: { dynamicIndustryId: industry.id },
          select: { id: true },
        });
        const orgIdList = orgIds.map(o => o.id);

        if (orgIdList.length === 0) {
          return {
            industryId: industry.id,
            slug: industry.slug,
            name: industry.name,
            icon: industry.icon,
            color: industry.color,
            organizationCount: 0,
            totalLeads: 0,
            totalUsers: 0,
            totalRevenue: 0,
          };
        }

        const [leadCount, userCount, revenue] = await Promise.all([
          this.prisma.lead.count({
            where: { organizationId: { in: orgIdList } },
          }),
          this.prisma.user.count({
            where: { organizationId: { in: orgIdList }, isActive: true },
          }),
          this.prisma.payment.aggregate({
            where: { organizationId: { in: orgIdList }, status: 'COMPLETED' },
            _sum: { amount: true },
          }),
        ]);

        return {
          industryId: industry.id,
          slug: industry.slug,
          name: industry.name,
          icon: industry.icon,
          color: industry.color,
          organizationCount: industry._count.organizations,
          totalLeads: leadCount,
          totalUsers: userCount,
          totalRevenue: revenue._sum.amount || 0,
        };
      })
    );

    // Sort by organization count descending
    industryStats.sort((a, b) => b.organizationCount - a.organizationCount);

    return {
      industries: industryStats,
      summary: {
        totalIndustries: industries.length,
        totalOrganizations: industryStats.reduce((sum, i) => sum + i.organizationCount, 0),
        totalLeads: industryStats.reduce((sum, i) => sum + i.totalLeads, 0),
        totalRevenue: industryStats.reduce((sum, i) => sum + i.totalRevenue, 0),
      },
    };
  }
}

export const tenantReportsService = new TenantReportsService();
