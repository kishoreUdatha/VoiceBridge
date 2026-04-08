/**
 * Territory Management Service
 * Handles geographic/account-based territory assignment and analytics
 */

import { PrismaClient, TerritoryType, TerritoryRole } from '@prisma/client';

const prisma = new PrismaClient();

interface TerritoryConfig {
  name: string;
  code?: string;
  description?: string;
  parentId?: string;
  type: TerritoryType;
  countries?: string[];
  states?: string[];
  cities?: string[];
  postalCodes?: string[];
  assignmentRules?: Record<string, any>;
  roundRobinEnabled?: boolean;
  targetRevenue?: number;
}

export const territoryService = {
  // Get all territories
  async getTerritories(organizationId: string) {
    return prisma.territory.findMany({
      where: { organizationId, isActive: true },
      include: {
        parent: { select: { id: true, name: true } },
        children: { select: { id: true, name: true } },
        assignments: {
          where: { isActive: true },
          include: { territory: false },
        },
        _count: {
          select: { leads: true, accounts: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  },

  // Get territory hierarchy
  async getTerritoryHierarchy(organizationId: string) {
    const territories = await prisma.territory.findMany({
      where: { organizationId, isActive: true, parentId: null },
      include: {
        children: {
          include: {
            children: {
              include: { children: true },
            },
          },
        },
        assignments: { where: { isActive: true } },
      },
    });
    return territories;
  },

  // Get single territory
  async getTerritory(id: string) {
    return prisma.territory.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        assignments: {
          where: { isActive: true },
        },
        leads: { take: 10, orderBy: { createdAt: 'desc' } },
        accounts: { take: 10, orderBy: { createdAt: 'desc' } },
      },
    });
  },

  // Create territory
  async createTerritory(organizationId: string, config: TerritoryConfig) {
    return prisma.territory.create({
      data: {
        organizationId,
        name: config.name,
        code: config.code,
        description: config.description,
        parentId: config.parentId,
        type: config.type,
        countries: config.countries as any,
        states: config.states as any,
        cities: config.cities as any,
        postalCodes: config.postalCodes as any,
        assignmentRules: config.assignmentRules as any,
        roundRobinEnabled: config.roundRobinEnabled || false,
        targetRevenue: config.targetRevenue,
      },
    });
  },

  // Update territory
  async updateTerritory(id: string, config: Partial<TerritoryConfig>) {
    return prisma.territory.update({
      where: { id },
      data: {
        name: config.name,
        code: config.code,
        description: config.description,
        parentId: config.parentId,
        type: config.type,
        countries: config.countries as any,
        states: config.states as any,
        cities: config.cities as any,
        postalCodes: config.postalCodes as any,
        assignmentRules: config.assignmentRules as any,
        roundRobinEnabled: config.roundRobinEnabled,
        targetRevenue: config.targetRevenue,
      },
    });
  },

  // Delete territory
  async deleteTerritory(id: string) {
    return prisma.territory.update({
      where: { id },
      data: { isActive: false },
    });
  },

  // Assign user to territory
  async assignUserToTerritory(
    territoryId: string,
    userId: string,
    role: TerritoryRole = 'MEMBER',
    isPrimary = false
  ) {
    return prisma.territoryAssignment.upsert({
      where: { territoryId_userId: { territoryId, userId } },
      update: { role, isPrimary, isActive: true },
      create: { territoryId, userId, role, isPrimary },
    });
  },

  // Remove user from territory
  async removeUserFromTerritory(territoryId: string, userId: string) {
    return prisma.territoryAssignment.update({
      where: { territoryId_userId: { territoryId, userId } },
      data: { isActive: false, endDate: new Date() },
    });
  },

  // Get territory assignments for user
  async getUserTerritories(userId: string) {
    return prisma.territoryAssignment.findMany({
      where: { userId, isActive: true },
      include: { territory: true },
    });
  },

  // Auto-assign lead to territory based on rules
  async autoAssignLeadToTerritory(organizationId: string, leadData: any) {
    const territories = await prisma.territory.findMany({
      where: { organizationId, isActive: true },
      include: { assignments: { where: { isActive: true } } },
    });

    for (const territory of territories) {
      if (this.matchesTerritoryRules(territory, leadData)) {
        return territory;
      }
    }
    return null;
  },

  // Check if lead matches territory rules
  matchesTerritoryRules(territory: any, leadData: any): boolean {
    // Check geographic matching
    if (territory.countries?.length > 0 && leadData.country) {
      if (!territory.countries.includes(leadData.country)) return false;
    }
    if (territory.states?.length > 0 && leadData.state) {
      if (!territory.states.includes(leadData.state)) return false;
    }
    if (territory.cities?.length > 0 && leadData.city) {
      if (!territory.cities.includes(leadData.city)) return false;
    }
    if (territory.postalCodes?.length > 0 && leadData.postalCode) {
      const matchesPostal = territory.postalCodes.some((range: string) => {
        if (range.includes('-')) {
          const [start, end] = range.split('-');
          return leadData.postalCode >= start && leadData.postalCode <= end;
        }
        return leadData.postalCode === range;
      });
      if (!matchesPostal) return false;
    }

    // Check custom rules
    if (territory.assignmentRules) {
      const rules = territory.assignmentRules;
      for (const [field, condition] of Object.entries(rules)) {
        if (!this.evaluateCondition(leadData[field], condition as any)) {
          return false;
        }
      }
    }

    return true;
  },

  evaluateCondition(value: any, condition: any): boolean {
    if (typeof condition === 'object') {
      if (condition.eq !== undefined) return value === condition.eq;
      if (condition.in !== undefined) return condition.in.includes(value);
      if (condition.gt !== undefined) return value > condition.gt;
      if (condition.gte !== undefined) return value >= condition.gte;
      if (condition.lt !== undefined) return value < condition.lt;
      if (condition.lte !== undefined) return value <= condition.lte;
    }
    return value === condition;
  },

  // Get territory statistics
  async getTerritoryStats(territoryId: string) {
    const territory = await prisma.territory.findUnique({
      where: { id: territoryId },
      include: {
        _count: { select: { leads: true, accounts: true } },
      },
    });

    if (!territory) return null;

    const [leadStats, revenueStats] = await Promise.all([
      prisma.lead.groupBy({
        by: ['stageId'],
        where: { territoryId },
        _count: true,
      }),
      prisma.lead.aggregate({
        where: { territoryId },
        _sum: { totalFees: true },
      }),
    ]);

    return {
      territory,
      leadCount: territory._count.leads,
      accountCount: territory._count.accounts,
      leadsByStage: leadStats,
      totalRevenue: revenueStats._sum.totalFees || 0,
      targetRevenue: territory.targetRevenue || 0,
      revenueProgress: territory.targetRevenue
        ? ((revenueStats._sum.totalFees || 0) / territory.targetRevenue) * 100
        : 0,
    };
  },

  // Get territory performance comparison
  async compareTerritories(organizationId: string) {
    const territories = await prisma.territory.findMany({
      where: { organizationId, isActive: true },
      include: {
        _count: { select: { leads: true, accounts: true } },
      },
    });

    const stats = await Promise.all(
      territories.map(async (territory) => {
        const revenue = await prisma.lead.aggregate({
          where: { territoryId: territory.id, isConverted: true },
          _sum: { totalFees: true },
        });

        return {
          id: territory.id,
          name: territory.name,
          leadCount: territory._count.leads,
          accountCount: territory._count.accounts,
          revenue: revenue._sum.totalFees || 0,
          targetRevenue: territory.targetRevenue || 0,
        };
      })
    );

    return stats;
  },
};
