/**
 * Follow-up Reports Service
 * Tenant-scoped follow-up reporting for daily operations tracking
 *
 * SECURITY: All reports filtered by organizationId from JWT token
 */

import { prisma } from '../config/database';
import { Prisma, FollowUpStatus } from '@prisma/client';

interface DateRange {
  start: Date;
  end: Date;
}

interface ReportFilters {
  organizationId: string;
  dateRange?: DateRange;
  assigneeId?: string;
  branchId?: string;
  // Role-based filtering
  userRole?: string;
  userId?: string;
}

interface FollowUpSummary {
  total: number;
  pending: number;
  overdue: number;
  completed: number;
  missed: number;
  rescheduled: number;
  completionRate: string;
}

interface FollowUpsByEmployee {
  userId: string;
  userName: string;
  email: string;
  pending: number;
  overdue: number;
  completedToday: number;
  completedThisWeek: number;
  totalAssigned: number;
  completionRate: string;
}

interface ScheduledFollowUp {
  id: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  leadSource: string;
  lastContactedAt: Date | null;
  scheduledAt: Date;
  message: string | null;
  notes: string | null;
  assigneeName: string;
  reportingManager: string;
  followUpType: string;
  attemptCount: number;
  lastAttemptAt: Date | null;
  isOverdue: boolean;
}

interface NoResponseLead {
  leadId: string;
  leadName: string;
  leadPhone: string;
  leadEmail: string | null;
  lastFollowUpAt: Date | null;
  followUpCount: number;
  daysSinceLastContact: number;
  assigneeName: string | null;
  stage: string;
}

class FollowUpReportsService {
  /**
   * Build tenant-scoped where clause
   * @param skipDateRange - Skip date range filter for queries that have their own date logic (schedule, overdue)
   */
  private async buildWhereClause(filters: ReportFilters, skipDateRange = false): Promise<Prisma.FollowUpWhereInput> {
    const { organizationId, dateRange, assigneeId, userRole, userId } = filters;

    // Base filter - tenant isolation through lead relation
    const where: Prisma.FollowUpWhereInput = {
      lead: { organizationId },
    };

    // Date range filter - only apply if not skipped (for queries without their own date logic)
    if (dateRange && !skipDateRange) {
      where.scheduledAt = { gte: dateRange.start, lte: dateRange.end };
    }

    // Assignee filter
    if (assigneeId) {
      where.assigneeId = assigneeId;
    }

    // Role-based filtering
    const normalizedRole = userRole?.toLowerCase().replace('_', '');

    if (normalizedRole === 'telecaller' || normalizedRole === 'counselor') {
      // Only their own follow-ups
      if (userId) {
        where.assigneeId = userId;
      }
    } else if (normalizedRole === 'teamlead' && userId) {
      // Team lead sees their team's follow-ups
      const teamMembers = await prisma.user.findMany({
        where: { organizationId, managerId: userId, isActive: true },
        select: { id: true },
      });
      const allMemberIds = [userId, ...teamMembers.map(m => m.id)];
      where.assigneeId = { in: allMemberIds };
    } else if (normalizedRole === 'manager' && userId) {
      // Manager sees hierarchy follow-ups
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
      where.assigneeId = { in: allMemberIds };
    }
    // Admin sees all

    return where;
  }

  /**
   * 1. FOLLOW-UP SUMMARY
   */
  async getSummary(filters: ReportFilters): Promise<FollowUpSummary> {
    const where = await this.buildWhereClause(filters);
    const now = new Date();

    const [total, pending, overdue, completed, missed, rescheduled] = await Promise.all([
      prisma.followUp.count({ where }),
      prisma.followUp.count({
        where: { ...where, status: 'UPCOMING', scheduledAt: { gte: now } },
      }),
      prisma.followUp.count({
        where: { ...where, status: 'UPCOMING', scheduledAt: { lt: now } },
      }),
      prisma.followUp.count({ where: { ...where, status: 'COMPLETED' } }),
      prisma.followUp.count({ where: { ...where, status: 'MISSED' } }),
      prisma.followUp.count({ where: { ...where, status: 'RESCHEDULED' } }),
    ]);

    const totalClosed = completed + missed;
    const completionRate = totalClosed > 0 ? ((completed / totalClosed) * 100).toFixed(1) : '0';

    return {
      total,
      pending,
      overdue,
      completed,
      missed,
      rescheduled,
      completionRate,
    };
  }

  /**
   * 2. PENDING FOLLOW-UPS
   */
  async getPendingFollowUps(filters: ReportFilters, limit = 50): Promise<ScheduledFollowUp[]> {
    const where = await this.buildWhereClause(filters);
    const now = new Date();

    const followUps = await prisma.followUp.findMany({
      where: {
        ...where,
        status: 'UPCOMING',
        scheduledAt: { gte: now },
      },
      include: {
        lead: { select: { id: true, firstName: true, lastName: true, phone: true, source: true, lastContactedAt: true, firstResponseAt: true, updatedAt: true } },
        assignee: {
          select: {
            firstName: true,
            lastName: true,
            manager: { select: { firstName: true, lastName: true } }
          }
        },
      },
      orderBy: { scheduledAt: 'asc' },
      take: limit,
    });

    return followUps.map(f => ({
      id: f.id,
      leadId: f.leadId,
      leadName: `${f.lead.firstName || ''} ${f.lead.lastName || ''}`.trim() || 'Unknown',
      leadPhone: f.lead.phone || '',
      leadSource: f.lead.source || 'Unknown',
      lastContactedAt: f.lead.lastContactedAt || f.lead.firstResponseAt || f.lead.updatedAt,
      scheduledAt: f.scheduledAt,
      message: f.message,
      notes: f.notes,
      assigneeName: `${f.assignee.firstName} ${f.assignee.lastName}`.trim(),
      reportingManager: f.assignee.manager ? `${f.assignee.manager.firstName} ${f.assignee.manager.lastName}`.trim() : '-',
      followUpType: f.followUpType,
      attemptCount: f.attemptCount,
      lastAttemptAt: f.lastAttemptAt,
      isOverdue: false,
    }));
  }

  /**
   * 3. OVERDUE FOLLOW-UPS
   */
  async getOverdueFollowUps(filters: ReportFilters, limit = 50): Promise<ScheduledFollowUp[]> {
    // Skip date range filter - overdue has its own date logic (scheduledAt < now)
    const where = await this.buildWhereClause(filters, true);
    const now = new Date();

    const followUps = await prisma.followUp.findMany({
      where: {
        ...where,
        OR: [
          { status: 'UPCOMING', scheduledAt: { lt: now } },
          { status: 'MISSED' },
        ],
      },
      include: {
        lead: { select: { id: true, firstName: true, lastName: true, phone: true, source: true, lastContactedAt: true, firstResponseAt: true, updatedAt: true } },
        assignee: {
          select: {
            firstName: true,
            lastName: true,
            manager: { select: { firstName: true, lastName: true } }
          }
        },
      },
      orderBy: { scheduledAt: 'asc' },
      take: limit,
    });

    return followUps.map(f => ({
      id: f.id,
      leadId: f.leadId,
      leadName: `${f.lead.firstName || ''} ${f.lead.lastName || ''}`.trim() || 'Unknown',
      leadPhone: f.lead.phone || '',
      leadSource: f.lead.source || 'Unknown',
      lastContactedAt: f.lead.lastContactedAt || f.lead.firstResponseAt || f.lead.updatedAt,
      scheduledAt: f.scheduledAt,
      message: f.message,
      notes: f.notes,
      assigneeName: `${f.assignee.firstName} ${f.assignee.lastName}`.trim(),
      reportingManager: f.assignee.manager ? `${f.assignee.manager.firstName} ${f.assignee.manager.lastName}`.trim() : '-',
      followUpType: f.followUpType,
      attemptCount: f.attemptCount,
      lastAttemptAt: f.lastAttemptAt,
      isOverdue: true,
    }));
  }

  /**
   * 4. COMPLETED FOLLOW-UPS
   */
  async getCompletedFollowUps(filters: ReportFilters, limit = 50): Promise<{
    followUps: ScheduledFollowUp[];
    todayCount: number;
    weekCount: number;
    monthCount: number;
  }> {
    const where = await this.buildWhereClause(filters);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [followUps, todayCount, weekCount, monthCount] = await Promise.all([
      prisma.followUp.findMany({
        where: { ...where, status: 'COMPLETED' },
        include: {
          lead: { select: { id: true, firstName: true, lastName: true, phone: true, source: true, lastContactedAt: true, firstResponseAt: true, updatedAt: true } },
          assignee: {
            select: {
              firstName: true,
              lastName: true,
              manager: { select: { firstName: true, lastName: true } }
            }
          },
        },
        orderBy: { completedAt: 'desc' },
        take: limit,
      }),
      prisma.followUp.count({
        where: { ...where, status: 'COMPLETED', completedAt: { gte: todayStart } },
      }),
      prisma.followUp.count({
        where: { ...where, status: 'COMPLETED', completedAt: { gte: weekStart } },
      }),
      prisma.followUp.count({
        where: { ...where, status: 'COMPLETED', completedAt: { gte: monthStart } },
      }),
    ]);

    return {
      followUps: followUps.map(f => ({
        id: f.id,
        leadId: f.leadId,
        leadName: `${f.lead.firstName || ''} ${f.lead.lastName || ''}`.trim() || 'Unknown',
        leadPhone: f.lead.phone || '',
        leadSource: f.lead.source || 'Unknown',
        lastContactedAt: f.lead.lastContactedAt || f.lead.firstResponseAt || f.lead.updatedAt,
        scheduledAt: f.scheduledAt,
        message: f.message,
        notes: f.notes,
        assigneeName: `${f.assignee.firstName} ${f.assignee.lastName}`.trim(),
        reportingManager: f.assignee.manager ? `${f.assignee.manager.firstName} ${f.assignee.manager.lastName}`.trim() : '-',
        followUpType: f.followUpType,
        attemptCount: f.attemptCount,
        lastAttemptAt: f.lastAttemptAt,
        isOverdue: false,
      })),
      todayCount,
      weekCount,
      monthCount,
    };
  }

  /**
   * 5. FOLLOW-UPS BY EMPLOYEE
   */
  async getFollowUpsByEmployee(filters: ReportFilters): Promise<FollowUpsByEmployee[]> {
    const { organizationId } = filters;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get all users who have follow-ups assigned
    const users = await prisma.user.findMany({
      where: {
        organizationId,
        isActive: true,
        OR: [
          { role: { slug: { in: ['telecaller', 'counselor', 'sales_rep', 'team_lead'] } } },
          { followUps: { some: { lead: { organizationId } } } },
        ],
      },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    const results: FollowUpsByEmployee[] = [];

    for (const user of users) {
      const baseWhere: Prisma.FollowUpWhereInput = {
        assigneeId: user.id,
        lead: { organizationId },
      };

      const [pending, overdue, completedToday, completedThisWeek, totalAssigned, totalCompleted] =
        await Promise.all([
          prisma.followUp.count({
            where: { ...baseWhere, status: 'UPCOMING', scheduledAt: { gte: now } },
          }),
          prisma.followUp.count({
            where: {
              ...baseWhere,
              OR: [
                { status: 'UPCOMING', scheduledAt: { lt: now } },
                { status: 'MISSED' },
              ],
            },
          }),
          prisma.followUp.count({
            where: { ...baseWhere, status: 'COMPLETED', completedAt: { gte: todayStart } },
          }),
          prisma.followUp.count({
            where: { ...baseWhere, status: 'COMPLETED', completedAt: { gte: weekStart } },
          }),
          prisma.followUp.count({ where: baseWhere }),
          prisma.followUp.count({ where: { ...baseWhere, status: 'COMPLETED' } }),
        ]);

      results.push({
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        pending,
        overdue,
        completedToday,
        completedThisWeek,
        totalAssigned,
        completionRate: totalAssigned > 0 ? ((totalCompleted / totalAssigned) * 100).toFixed(1) : '0',
      });
    }

    return results.sort((a, b) => b.overdue - a.overdue); // Sort by overdue (urgent first)
  }

  /**
   * 6. NEXT FOLLOW-UP SCHEDULE (Today and Tomorrow)
   */
  async getNextFollowUpSchedule(filters: ReportFilters): Promise<{
    today: ScheduledFollowUp[];
    tomorrow: ScheduledFollowUp[];
    thisWeek: ScheduledFollowUp[];
    overdueCount: number;
  }> {
    // Skip date range filter - schedule has its own date logic (today, tomorrow, week)
    const where = await this.buildWhereClause(filters, true);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowEnd = new Date(todayStart.getTime() + 2 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    const includeFields = {
      lead: { select: { id: true, firstName: true, lastName: true, phone: true, source: true, lastContactedAt: true, firstResponseAt: true, updatedAt: true } },
      assignee: {
        select: {
          firstName: true,
          lastName: true,
          manager: { select: { firstName: true, lastName: true } }
        }
      },
    };

    const [today, tomorrow, thisWeek, overdueCount] = await Promise.all([
      prisma.followUp.findMany({
        where: {
          ...where,
          status: 'UPCOMING',
          scheduledAt: { gte: todayStart, lt: todayEnd },
        },
        include: includeFields,
        orderBy: { scheduledAt: 'asc' },
      }),
      prisma.followUp.findMany({
        where: {
          ...where,
          status: 'UPCOMING',
          scheduledAt: { gte: todayEnd, lt: tomorrowEnd },
        },
        include: includeFields,
        orderBy: { scheduledAt: 'asc' },
      }),
      prisma.followUp.findMany({
        where: {
          ...where,
          status: 'UPCOMING',
          scheduledAt: { gte: tomorrowEnd, lt: weekEnd },
        },
        include: includeFields,
        orderBy: { scheduledAt: 'asc' },
        take: 50,
      }),
      prisma.followUp.count({
        where: {
          ...where,
          OR: [
            { status: 'UPCOMING', scheduledAt: { lt: now } },
            { status: 'MISSED' },
          ],
        },
      }),
    ]);

    const mapFollowUp = (f: any, isOverdue = false): ScheduledFollowUp => ({
      id: f.id,
      leadId: f.leadId,
      leadName: `${f.lead.firstName || ''} ${f.lead.lastName || ''}`.trim() || 'Unknown',
      leadPhone: f.lead.phone || '',
      leadSource: f.lead.source || 'Unknown',
      lastContactedAt: f.lead.lastContactedAt || f.lead.firstResponseAt || f.lead.updatedAt,
      scheduledAt: f.scheduledAt,
      message: f.message,
      notes: f.notes,
      assigneeName: `${f.assignee.firstName} ${f.assignee.lastName}`.trim(),
      reportingManager: f.assignee.manager ? `${f.assignee.manager.firstName} ${f.assignee.manager.lastName}`.trim() : '-',
      followUpType: f.followUpType,
      attemptCount: f.attemptCount,
      lastAttemptAt: f.lastAttemptAt,
      isOverdue,
    });

    return {
      today: today.map(f => mapFollowUp(f)),
      tomorrow: tomorrow.map(f => mapFollowUp(f)),
      thisWeek: thisWeek.map(f => mapFollowUp(f)),
      overdueCount,
    };
  }

  /**
   * 7. NO-RESPONSE LEADS (Leads with multiple follow-ups but no positive response)
   */
  async getNoResponseLeads(filters: ReportFilters, minFollowUps = 3): Promise<NoResponseLead[]> {
    const { organizationId } = filters;

    // Get leads with multiple follow-ups but still in early stages
    const activeStages = await prisma.leadStage.findMany({
      where: {
        organizationId,
        autoSyncStatus: null,
        order: { lt: 3 }, // Early pipeline stages
      },
      select: { id: true, name: true },
    });
    const activeStageIds = activeStages.map(s => s.id);
    const stageMap = activeStages.reduce((acc, s) => {
      acc[s.id] = s.name;
      return acc;
    }, {} as Record<string, string>);

    // Find leads with follow-ups >= minFollowUps and still in early stage
    const leads = await prisma.lead.findMany({
      where: {
        organizationId,
        stageId: { in: activeStageIds },
        followUps: { some: {} },
      },
      include: {
        followUps: {
          orderBy: { scheduledAt: 'desc' },
          take: 1,
          select: { scheduledAt: true, completedAt: true },
        },
        assignments: {
          where: { isActive: true },
          include: { assignedTo: { select: { firstName: true, lastName: true } } },
          take: 1,
        },
        _count: { select: { followUps: true } },
      },
    });

    const now = new Date();
    const results: NoResponseLead[] = [];

    for (const lead of leads) {
      if (lead._count.followUps < minFollowUps) continue;

      const lastFollowUp = lead.followUps[0];
      const lastContactDate = lastFollowUp?.completedAt || lastFollowUp?.scheduledAt || lead.createdAt;
      const daysSinceLastContact = Math.floor(
        (now.getTime() - lastContactDate.getTime()) / (24 * 60 * 60 * 1000)
      );

      const assignee = lead.assignments[0]?.assignedTo;

      results.push({
        leadId: lead.id,
        leadName: `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Unknown',
        leadPhone: lead.phone || '',
        leadEmail: lead.email,
        lastFollowUpAt: lastContactDate,
        followUpCount: lead._count.followUps,
        daysSinceLastContact,
        assigneeName: assignee ? `${assignee.firstName} ${assignee.lastName}`.trim() : null,
        stage: lead.stageId ? stageMap[lead.stageId] || 'Unknown' : 'No Stage',
      });
    }

    return results.sort((a, b) => b.daysSinceLastContact - a.daysSinceLastContact);
  }

  /**
   * COMPREHENSIVE FOLLOW-UP REPORT
   */
  async getComprehensiveReport(filters: ReportFilters): Promise<{
    summary: FollowUpSummary;
    byEmployee: FollowUpsByEmployee[];
    schedule: Awaited<ReturnType<typeof this.getNextFollowUpSchedule>>;
    overdue: ScheduledFollowUp[];
    noResponse: NoResponseLead[];
  }> {
    const [summary, byEmployee, schedule, overdue, noResponse] = await Promise.all([
      this.getSummary(filters),
      this.getFollowUpsByEmployee(filters),
      this.getNextFollowUpSchedule(filters),
      this.getOverdueFollowUps(filters, 100),
      this.getNoResponseLeads(filters),
    ]);

    return {
      summary,
      byEmployee,
      schedule,
      overdue,
      noResponse,
    };
  }
}

export const followUpReportsService = new FollowUpReportsService();
