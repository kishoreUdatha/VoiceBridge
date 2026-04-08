/**
 * Team Management Service
 * Provides team analytics, workload distribution, and capacity planning
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface TeamMemberStats {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  activeLeads: number;
  completedLeads: number;
  conversionRate: number;
  avgResponseTime: number; // in minutes
  callsMade: number;
  callsAnswered: number;
  lastActivityAt: Date | null;
  workloadScore: number; // 0-100
  capacityUsed: number; // percentage
}

export interface TeamOverview {
  totalMembers: number;
  activeMembers: number;
  totalLeads: number;
  activeLeads: number;
  completedLeads: number;
  avgConversionRate: number;
  avgResponseTime: number;
  totalCalls: number;
  workloadDistribution: {
    underloaded: number;
    optimal: number;
    overloaded: number;
  };
}

export interface TeamHierarchy {
  id: string;
  name: string;
  email: string;
  role: string;
  teamMembers: TeamHierarchy[];
  stats?: {
    totalLeads: number;
    conversionRate: number;
  };
}

class TeamManagementService {
  /**
   * Get team overview for a manager
   */
  async getTeamOverview(managerId: string, organizationId: string): Promise<TeamOverview> {
    // Get team members under this manager
    const teamMembers = await prisma.user.findMany({
      where: {
        organizationId,
        managerId,
        isActive: true,
      },
      select: { id: true },
    });

    const memberIds = teamMembers.map(m => m.id);

    // If manager has no direct reports, include themselves
    if (memberIds.length === 0) {
      memberIds.push(managerId);
    }

    // Get lead statistics
    const [totalLeads, completedLeads] = await Promise.all([
      prisma.lead.count({
        where: {
          organizationId,
          assignments: { some: { assignedToId: { in: memberIds }, isActive: true } },
        },
      }),
      prisma.lead.count({
        where: {
          organizationId,
          assignments: { some: { assignedToId: { in: memberIds }, isActive: true } },
          isConverted: true,
        },
      }),
    ]);

    const activeLeads = totalLeads - completedLeads;

    // Get call statistics (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const callStats = await prisma.callLog.aggregate({
      where: {
        organizationId,
        callerId: { in: memberIds },
        createdAt: { gte: thirtyDaysAgo },
      },
      _count: true,
    });

    // Calculate workload distribution
    const memberStats = await this.getTeamMemberStats(managerId, organizationId);
    const workloadDistribution = {
      underloaded: memberStats.filter(m => m.workloadScore < 40).length,
      optimal: memberStats.filter(m => m.workloadScore >= 40 && m.workloadScore <= 80).length,
      overloaded: memberStats.filter(m => m.workloadScore > 80).length,
    };

    const avgConversionRate = totalLeads > 0 ? (completedLeads / totalLeads) * 100 : 0;

    return {
      totalMembers: memberIds.length,
      activeMembers: memberIds.length,
      totalLeads,
      activeLeads,
      completedLeads,
      avgConversionRate: Math.round(avgConversionRate * 10) / 10,
      avgResponseTime: 45, // TODO: Calculate from actual data
      totalCalls: callStats._count || 0,
      workloadDistribution,
    };
  }

  /**
   * Get detailed stats for each team member
   */
  async getTeamMemberStats(managerId: string, organizationId: string): Promise<TeamMemberStats[]> {
    // Get team members
    const teamMembers = await prisma.user.findMany({
      where: {
        organizationId,
        managerId,
        isActive: true,
      },
      include: {
        role: true,
      },
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const stats: TeamMemberStats[] = [];

    for (const member of teamMembers) {
      // Get lead counts
      const [totalLeads, completedLeads] = await Promise.all([
        prisma.lead.count({
          where: {
            organizationId,
            assignments: { some: { assignedToId: member.id, isActive: true } },
          },
        }),
        prisma.lead.count({
          where: {
            organizationId,
            assignments: { some: { assignedToId: member.id, isActive: true } },
            isConverted: true,
          },
        }),
      ]);

      const activeLeads = totalLeads - completedLeads;

      // Get call counts
      const callCounts = await prisma.callLog.aggregate({
        where: {
          organizationId,
          callerId: member.id,
          createdAt: { gte: thirtyDaysAgo },
        },
        _count: true,
      });

      const answeredCalls = await prisma.callLog.count({
        where: {
          organizationId,
          callerId: member.id,
          createdAt: { gte: thirtyDaysAgo },
          status: 'COMPLETED',
        },
      });

      // Calculate workload score based on active leads and recent activity
      const maxLeadsPerPerson = 50; // Configurable threshold
      const workloadScore = Math.min(100, (activeLeads / maxLeadsPerPerson) * 100);

      stats.push({
        userId: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        role: member.role.name,
        activeLeads,
        completedLeads,
        conversionRate: totalLeads > 0 ? Math.round((completedLeads / totalLeads) * 1000) / 10 : 0,
        avgResponseTime: 30, // TODO: Calculate from actual data
        callsMade: callCounts._count || 0,
        callsAnswered: answeredCalls,
        lastActivityAt: member.lastLoginAt,
        workloadScore: Math.round(workloadScore),
        capacityUsed: Math.round(workloadScore),
      });
    }

    return stats;
  }

  /**
   * Get organizational hierarchy tree
   */
  async getOrganizationHierarchy(organizationId: string): Promise<TeamHierarchy[]> {
    // Get all users with their managers
    const users = await prisma.user.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      include: {
        role: true,
      },
    });

    // Build hierarchy map
    const userMap = new Map<string, TeamHierarchy>();

    for (const user of users) {
      // Get quick stats for each user
      const leadCount = await prisma.lead.count({
        where: {
          organizationId,
          assignments: { some: { assignedToId: user.id, isActive: true } },
        },
      });

      const convertedCount = await prisma.lead.count({
        where: {
          organizationId,
          assignments: { some: { assignedToId: user.id, isActive: true } },
          isConverted: true,
        },
      });

      userMap.set(user.id, {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: user.role.name,
        teamMembers: [],
        stats: {
          totalLeads: leadCount,
          conversionRate: leadCount > 0 ? Math.round((convertedCount / leadCount) * 100) : 0,
        },
      });
    }

    // Link team members to managers
    for (const user of users) {
      if (user.managerId && userMap.has(user.managerId)) {
        const manager = userMap.get(user.managerId)!;
        const member = userMap.get(user.id)!;
        manager.teamMembers.push(member);
      }
    }

    // Return top-level users (those without managers or whose manager doesn't exist)
    const topLevel: TeamHierarchy[] = [];
    for (const user of users) {
      if (!user.managerId || !userMap.has(user.managerId)) {
        const node = userMap.get(user.id);
        if (node) topLevel.push(node);
      }
    }

    return topLevel;
  }

  /**
   * Get team goals and KPIs
   */
  async getTeamGoals(managerId: string, organizationId: string) {
    const teamMembers = await prisma.user.findMany({
      where: {
        organizationId,
        managerId,
        isActive: true,
      },
      select: { id: true },
    });

    const memberIds = teamMembers.map(m => m.id);
    if (memberIds.length === 0) memberIds.push(managerId);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get this month's stats
    const leadsThisMonth = await prisma.lead.count({
      where: {
        organizationId,
        assignments: { some: { assignedToId: { in: memberIds }, isActive: true } },
        createdAt: { gte: startOfMonth },
      },
    });

    const conversionsThisMonth = await prisma.lead.count({
      where: {
        organizationId,
        assignments: { some: { assignedToId: { in: memberIds }, isActive: true } },
        isConverted: true,
        updatedAt: { gte: startOfMonth },
      },
    });

    const callsThisMonth = await prisma.callLog.count({
      where: {
        organizationId,
        callerId: { in: memberIds },
        createdAt: { gte: startOfMonth },
      },
    });

    // Define goals (these could be stored in DB and made configurable)
    return {
      goals: [
        {
          id: 'leads',
          name: 'New Leads',
          target: memberIds.length * 100, // 100 leads per person
          current: leadsThisMonth,
          unit: 'leads',
        },
        {
          id: 'conversions',
          name: 'Conversions',
          target: memberIds.length * 20, // 20 conversions per person
          current: conversionsThisMonth,
          unit: 'conversions',
        },
        {
          id: 'calls',
          name: 'Calls Made',
          target: memberIds.length * 500, // 500 calls per person
          current: callsThisMonth,
          unit: 'calls',
        },
        {
          id: 'response-time',
          name: 'Avg Response Time',
          target: 30, // 30 minutes target
          current: 45, // TODO: Calculate actual
          unit: 'minutes',
          lowerIsBetter: true,
        },
      ],
    };
  }

  /**
   * Get capacity planning data
   */
  async getCapacityPlanning(organizationId: string) {
    // Get all team leads/managers
    const managers = await prisma.user.findMany({
      where: {
        organizationId,
        isActive: true,
        role: {
          slug: { in: ['admin', 'manager', 'team_lead'] },
        },
      },
      include: {
        role: true,
        teamMembers: {
          where: { isActive: true },
          include: { role: true },
        },
      },
    });

    const capacityData = [];

    for (const manager of managers) {
      const teamIds = manager.teamMembers.map(m => m.id);

      // Get active leads for this team
      const teamOrManagerIds = teamIds.length > 0 ? teamIds : [manager.id];
      const activeLeads = await prisma.lead.count({
        where: {
          organizationId,
          assignments: { some: { assignedToId: { in: teamOrManagerIds }, isActive: true } },
          stage: { slug: { notIn: ['converted', 'closed', 'won', 'lost'] } },
        },
      });

      const teamSize = manager.teamMembers.length || 1;
      const maxCapacity = teamSize * 50; // 50 leads per person max
      const optimalCapacity = teamSize * 30; // 30 leads per person optimal

      capacityData.push({
        managerId: manager.id,
        managerName: `${manager.firstName} ${manager.lastName}`,
        teamSize,
        activeLeads,
        maxCapacity,
        optimalCapacity,
        capacityUsed: Math.round((activeLeads / maxCapacity) * 100),
        status: activeLeads > maxCapacity ? 'overloaded' :
                activeLeads > optimalCapacity ? 'high' :
                activeLeads < optimalCapacity * 0.5 ? 'underutilized' : 'optimal',
      });
    }

    return capacityData;
  }

  /**
   * Reassign leads between team members
   */
  async reassignLeads(
    fromUserId: string,
    toUserId: string,
    leadIds: string[],
    organizationId: string
  ) {
    // Deactivate old assignments
    await prisma.leadAssignment.updateMany({
      where: {
        leadId: { in: leadIds },
        isActive: true,
      },
      data: {
        isActive: false,
        unassignedAt: new Date(),
      },
    });

    // Create new assignments
    const newAssignments = leadIds.map(leadId => ({
      leadId,
      assignedToId: toUserId,
      assignedById: fromUserId,
      isActive: true,
      assignedAt: new Date(),
    }));

    const result = await prisma.leadAssignment.createMany({
      data: newAssignments,
    });

    // Log the reassignment
    await prisma.auditLog.create({
      data: {
        organizationId,
        actorType: 'user',
        actorId: fromUserId,
        action: 'LEAD_REASSIGNMENT',
        targetType: 'Lead',
        targetId: leadIds.join(','),
        changes: {
          fromUserId,
          toUserId,
          leadCount: leadIds.length,
        },
      },
    });

    return { count: result.count };
  }
}

export const teamManagementService = new TeamManagementService();
