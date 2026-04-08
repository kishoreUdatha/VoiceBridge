/**
 * Lead Routing Service
 * Handles smart routing rules, round-robin assignment, and capacity management
 */

import { prisma } from '../config/database';
import { Lead, LeadRoutingRule, RoutingGroup, RoutingGroupMember, Prisma } from '@prisma/client';

interface RuleCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'starts_with' | 'ends_with' | 'in' | 'not_in' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
  value: any;
}

interface RoutingResult {
  success: boolean;
  assignedToUserId?: string;
  assignedToUser?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  matchedRuleId?: string;
  matchedRuleName?: string;
  reason: string;
}

interface RuleWithGroup extends LeadRoutingRule {
  routingGroup?: RoutingGroup & {
    members: RoutingGroupMember[];
  } | null;
}

export class LeadRoutingService {
  /**
   * Route a lead based on organization's routing rules
   */
  async routeLead(leadId: string, organizationId: string): Promise<RoutingResult> {
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId },
    });

    if (!lead) {
      return { success: false, reason: 'Lead not found' };
    }

    // Get all active routing rules ordered by priority
    const rules = await prisma.leadRoutingRule.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      orderBy: { priority: 'desc' },
      include: {
        routingGroup: {
          include: {
            members: {
              where: { isActive: true },
              orderBy: { weight: 'desc' },
            },
          },
        },
      },
    }) as RuleWithGroup[];

    // Evaluate each rule
    for (const rule of rules) {
      const matches = await this.evaluateRule(lead, rule);

      if (matches) {
        const assignmentResult = await this.executeRuleAction(rule, lead, organizationId);

        if (assignmentResult.success) {
          // Update rule statistics
          await prisma.leadRoutingRule.update({
            where: { id: rule.id },
            data: {
              matchCount: { increment: 1 },
              lastMatchedAt: new Date(),
            },
          });

          return {
            ...assignmentResult,
            matchedRuleId: rule.id,
            matchedRuleName: rule.name,
          };
        }
      }
    }

    return { success: false, reason: 'No matching routing rule found' };
  }

  /**
   * Evaluate if a lead matches a rule's conditions
   */
  private async evaluateRule(lead: Lead, rule: LeadRoutingRule): Promise<boolean> {
    const conditions = rule.conditions as RuleCondition[];

    if (!conditions || conditions.length === 0) {
      return true; // No conditions = matches all
    }

    const results = conditions.map((condition) => this.evaluateCondition(lead, condition));

    if (rule.conditionLogic === 'OR') {
      return results.some((r) => r);
    }
    return results.every((r) => r); // AND logic
  }

  /**
   * Evaluate a single condition against a lead
   */
  private evaluateCondition(lead: Lead, condition: RuleCondition): boolean {
    const leadValue = this.getLeadFieldValue(lead, condition.field);
    const conditionValue = condition.value;

    switch (condition.operator) {
      case 'equals':
        return String(leadValue).toLowerCase() === String(conditionValue).toLowerCase();

      case 'not_equals':
        return String(leadValue).toLowerCase() !== String(conditionValue).toLowerCase();

      case 'contains':
        return String(leadValue).toLowerCase().includes(String(conditionValue).toLowerCase());

      case 'starts_with':
        return String(leadValue).toLowerCase().startsWith(String(conditionValue).toLowerCase());

      case 'ends_with':
        return String(leadValue).toLowerCase().endsWith(String(conditionValue).toLowerCase());

      case 'in':
        const inValues = Array.isArray(conditionValue) ? conditionValue : [conditionValue];
        return inValues.some((v: any) => String(v).toLowerCase() === String(leadValue).toLowerCase());

      case 'not_in':
        const notInValues = Array.isArray(conditionValue) ? conditionValue : [conditionValue];
        return !notInValues.some((v: any) => String(v).toLowerCase() === String(leadValue).toLowerCase());

      case 'greater_than':
        return Number(leadValue) > Number(conditionValue);

      case 'less_than':
        return Number(leadValue) < Number(conditionValue);

      case 'is_empty':
        return !leadValue || leadValue === '';

      case 'is_not_empty':
        return !!leadValue && leadValue !== '';

      default:
        return false;
    }
  }

  /**
   * Get a field value from a lead (supports nested fields)
   */
  private getLeadFieldValue(lead: Lead, field: string): any {
    const parts = field.split('.');
    let value: any = lead;

    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = (value as any)[part];
      } else {
        return null;
      }
    }

    return value;
  }

  /**
   * Execute the action specified by a routing rule
   */
  private async executeRuleAction(
    rule: RuleWithGroup,
    lead: Lead,
    organizationId: string
  ): Promise<RoutingResult> {
    switch (rule.actionType) {
      case 'ASSIGN_USER':
        if (!rule.assignToUserId) {
          return { success: false, reason: 'No user specified for assignment' };
        }
        return this.assignToUser(lead.id, rule.assignToUserId, organizationId);

      case 'ASSIGN_TEAM':
        if (!rule.assignToTeamId) {
          return { success: false, reason: 'No team specified for assignment' };
        }
        return this.assignToTeamMember(lead.id, rule.assignToTeamId, organizationId);

      case 'ROUND_ROBIN':
        if (!rule.routingGroup) {
          return { success: false, reason: 'No routing group configured' };
        }
        return this.roundRobinAssign(lead.id, rule.routingGroup, organizationId);

      case 'LOAD_BALANCE':
        if (!rule.routingGroup) {
          return { success: false, reason: 'No routing group configured' };
        }
        return this.loadBalanceAssign(lead.id, rule.routingGroup, organizationId);

      case 'ASSIGN_BY_LOCATION':
        return this.assignByLocation(lead, organizationId);

      case 'ASSIGN_BY_LANGUAGE':
        return this.assignByLanguage(lead, organizationId);

      case 'ASSIGN_BY_SOURCE':
        return this.assignBySource(lead, organizationId, rule);

      default:
        return { success: false, reason: `Unknown action type: ${rule.actionType}` };
    }
  }

  /**
   * Assign lead to a specific user
   */
  private async assignToUser(
    leadId: string,
    userId: string,
    organizationId: string
  ): Promise<RoutingResult> {
    const user = await prisma.user.findFirst({
      where: { id: userId, organizationId, isActive: true },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    if (!user) {
      return { success: false, reason: 'Target user not found or inactive' };
    }

    await this.createAssignment(leadId, userId, organizationId);

    return {
      success: true,
      assignedToUserId: user.id,
      assignedToUser: user,
      reason: 'Assigned to specific user',
    };
  }

  /**
   * Assign lead to a team member (based on role)
   */
  private async assignToTeamMember(
    leadId: string,
    roleId: string,
    organizationId: string
  ): Promise<RoutingResult> {
    // Find least loaded team member with this role
    const teamMembers = await prisma.user.findMany({
      where: {
        organizationId,
        roleId,
        isActive: true,
      },
      include: {
        leadAssignments: {
          where: {
            isActive: true,
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)), // Today
            },
          },
        },
      },
    });

    if (teamMembers.length === 0) {
      return { success: false, reason: 'No active team members found' };
    }

    // Sort by current load (ascending)
    teamMembers.sort((a, b) => a.leadAssignments.length - b.leadAssignments.length);
    const selectedUser = teamMembers[0];

    await this.createAssignment(leadId, selectedUser.id, organizationId);

    return {
      success: true,
      assignedToUserId: selectedUser.id,
      assignedToUser: {
        id: selectedUser.id,
        firstName: selectedUser.firstName,
        lastName: selectedUser.lastName,
        email: selectedUser.email,
      },
      reason: 'Assigned to team member with lowest load',
    };
  }

  /**
   * Round-robin assignment within a routing group
   */
  private async roundRobinAssign(
    leadId: string,
    group: RoutingGroup & { members: RoutingGroupMember[] },
    organizationId: string
  ): Promise<RoutingResult> {
    const activeMembers = group.members.filter((m) => m.isActive);

    if (activeMembers.length === 0) {
      return { success: false, reason: 'No active members in routing group' };
    }

    // Get the next member based on weighted round-robin
    const selectedMember = await this.getNextRoundRobinMember(group.id, activeMembers);

    if (!selectedMember) {
      return { success: false, reason: 'All members at capacity' };
    }

    const user = await prisma.user.findUnique({
      where: { id: selectedMember.userId },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    if (!user) {
      return { success: false, reason: 'Selected user not found' };
    }

    await this.createAssignment(leadId, user.id, organizationId);

    // Update member's current leads count and last assigned time
    await prisma.routingGroupMember.update({
      where: { id: selectedMember.id },
      data: {
        currentLeads: { increment: 1 },
        lastAssignedAt: new Date(),
      },
    });

    // Update group's current index
    const nextIndex = (group.currentIndex + 1) % activeMembers.length;
    await prisma.routingGroup.update({
      where: { id: group.id },
      data: { currentIndex: nextIndex },
    });

    return {
      success: true,
      assignedToUserId: user.id,
      assignedToUser: user,
      reason: 'Assigned via round-robin',
    };
  }

  /**
   * Get next member in weighted round-robin
   */
  private async getNextRoundRobinMember(
    groupId: string,
    members: RoutingGroupMember[]
  ): Promise<RoutingGroupMember | null> {
    const group = await prisma.routingGroup.findUnique({
      where: { id: groupId },
    });

    if (!group) return null;

    // Create weighted list
    const weightedMembers: RoutingGroupMember[] = [];
    for (const member of members) {
      // Skip if at capacity
      if (member.maxLeads && member.currentLeads >= member.maxLeads) {
        continue;
      }
      // Add member weight times
      for (let i = 0; i < member.weight; i++) {
        weightedMembers.push(member);
      }
    }

    if (weightedMembers.length === 0) {
      return null;
    }

    const index = group.currentIndex % weightedMembers.length;
    return weightedMembers[index];
  }

  /**
   * Load-balanced assignment (assigns to least loaded member)
   */
  private async loadBalanceAssign(
    leadId: string,
    group: RoutingGroup & { members: RoutingGroupMember[] },
    organizationId: string
  ): Promise<RoutingResult> {
    const activeMembers = group.members.filter((m) => m.isActive);

    if (activeMembers.length === 0) {
      return { success: false, reason: 'No active members in routing group' };
    }

    // Sort by current load (considering weight and capacity)
    const availableMembers = activeMembers
      .filter((m) => !m.maxLeads || m.currentLeads < m.maxLeads)
      .sort((a, b) => {
        // Calculate load percentage considering weight
        const loadA = a.currentLeads / (a.weight || 1);
        const loadB = b.currentLeads / (b.weight || 1);
        return loadA - loadB;
      });

    if (availableMembers.length === 0) {
      return { success: false, reason: 'All members at capacity' };
    }

    const selectedMember = availableMembers[0];

    const user = await prisma.user.findUnique({
      where: { id: selectedMember.userId },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    if (!user) {
      return { success: false, reason: 'Selected user not found' };
    }

    await this.createAssignment(leadId, user.id, organizationId);

    // Update member's current leads count
    await prisma.routingGroupMember.update({
      where: { id: selectedMember.id },
      data: {
        currentLeads: { increment: 1 },
        lastAssignedAt: new Date(),
      },
    });

    return {
      success: true,
      assignedToUserId: user.id,
      assignedToUser: user,
      reason: 'Assigned via load balancing',
    };
  }

  /**
   * Assign lead based on location (city/state) matching
   * Matches lead's city/state to users' assignedRegions
   */
  private async assignByLocation(
    lead: Lead,
    organizationId: string
  ): Promise<RoutingResult> {
    const leadCity = ((lead as any).city || '').toLowerCase().trim();
    const leadState = ((lead as any).state || '').toLowerCase().trim();
    const customFields = (lead as any).customFields as Record<string, any> || {};
    const customCity = (customFields.city || '').toLowerCase().trim();
    const customState = (customFields.state || '').toLowerCase().trim();

    // Get all active users with assigned regions
    const users = await prisma.user.findMany({
      where: {
        organizationId,
        isActive: true,
        assignedRegions: { not: null },
      },
      include: {
        leadAssignments: {
          where: {
            isActive: true,
            createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          },
        },
      },
    });

    // Find users whose regions match the lead's location
    const matchingUsers = users.filter((user) => {
      const regions = (user.assignedRegions as string[]) || [];
      return regions.some((region) => {
        const regionLower = region.toLowerCase().trim();
        return (
          regionLower === leadCity ||
          regionLower === leadState ||
          regionLower === customCity ||
          regionLower === customState ||
          leadCity.includes(regionLower) ||
          leadState.includes(regionLower)
        );
      });
    });

    if (matchingUsers.length === 0) {
      return { success: false, reason: 'No users found matching lead location' };
    }

    // Sort by current load (ascending) and pick the least loaded
    matchingUsers.sort((a, b) => a.leadAssignments.length - b.leadAssignments.length);
    const selectedUser = matchingUsers[0];

    await this.createAssignment(lead.id, selectedUser.id, organizationId);

    return {
      success: true,
      assignedToUserId: selectedUser.id,
      assignedToUser: {
        id: selectedUser.id,
        firstName: selectedUser.firstName,
        lastName: selectedUser.lastName,
        email: selectedUser.email,
      },
      reason: `Assigned by location match (${leadCity || leadState || customCity || customState})`,
    };
  }

  /**
   * Assign lead based on language preference
   * Matches lead's language to users' spokenLanguages
   */
  private async assignByLanguage(
    lead: Lead,
    organizationId: string
  ): Promise<RoutingResult> {
    const customFields = (lead as any).customFields as Record<string, any> || {};
    const leadLanguage = (
      (lead as any).language ||
      customFields.language ||
      customFields.preferredLanguage ||
      ''
    ).toLowerCase().trim();

    if (!leadLanguage) {
      return { success: false, reason: 'Lead has no language preference specified' };
    }

    // Get all active users with spoken languages
    const users = await prisma.user.findMany({
      where: {
        organizationId,
        isActive: true,
        spokenLanguages: { not: null },
      },
      include: {
        leadAssignments: {
          where: {
            isActive: true,
            createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          },
        },
      },
    });

    // Find users who speak the lead's language
    const matchingUsers = users.filter((user) => {
      const languages = (user.spokenLanguages as string[]) || [];
      return languages.some((lang) => {
        const langLower = lang.toLowerCase().trim();
        return langLower === leadLanguage || leadLanguage.includes(langLower);
      });
    });

    if (matchingUsers.length === 0) {
      return { success: false, reason: `No users found speaking ${leadLanguage}` };
    }

    // Sort by current load (ascending) and pick the least loaded
    matchingUsers.sort((a, b) => a.leadAssignments.length - b.leadAssignments.length);
    const selectedUser = matchingUsers[0];

    await this.createAssignment(lead.id, selectedUser.id, organizationId);

    return {
      success: true,
      assignedToUserId: selectedUser.id,
      assignedToUser: {
        id: selectedUser.id,
        firstName: selectedUser.firstName,
        lastName: selectedUser.lastName,
        email: selectedUser.email,
      },
      reason: `Assigned by language match (${leadLanguage})`,
    };
  }

  /**
   * Assign lead based on source (JustDial, IndiaMART, etc.)
   * Uses rule configuration to route specific sources to specific users/teams
   */
  private async assignBySource(
    lead: Lead,
    organizationId: string,
    rule: RuleWithGroup
  ): Promise<RoutingResult> {
    const customFields = (lead as any).customFields as Record<string, any> || {};
    const leadSource = (
      (lead as any).source ||
      customFields.source ||
      ''
    ).toUpperCase();

    // Get source mapping from rule metadata
    const metadata = (rule as any).metadata as Record<string, any> || {};
    const sourceMapping = metadata.sourceMapping as Record<string, string> || {};

    // Check if there's a specific user mapped for this source
    const mappedUserId = sourceMapping[leadSource];
    if (mappedUserId) {
      const user = await prisma.user.findFirst({
        where: { id: mappedUserId, organizationId, isActive: true },
        select: { id: true, firstName: true, lastName: true, email: true },
      });

      if (user) {
        await this.createAssignment(lead.id, user.id, organizationId);
        return {
          success: true,
          assignedToUserId: user.id,
          assignedToUser: user,
          reason: `Assigned by source (${leadSource}) to dedicated user`,
        };
      }
    }

    // If no direct mapping, use the routing group
    if (rule.routingGroup) {
      return this.roundRobinAssign(lead.id, rule.routingGroup, organizationId);
    }

    return { success: false, reason: `No routing configured for source: ${leadSource}` };
  }

  /**
   * Create a lead assignment
   */
  private async createAssignment(
    leadId: string,
    userId: string,
    organizationId: string
  ): Promise<void> {
    // Deactivate existing assignments
    await prisma.leadAssignment.updateMany({
      where: { leadId, isActive: true },
      data: { isActive: false },
    });

    // Create new assignment
    await prisma.leadAssignment.create({
      data: {
        leadId,
        assignedToId: userId,
        assignedById: userId, // Auto-assigned
        isActive: true,
      },
    });

    // Update lead's assignedToId
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        assignedToId: userId,
        assignedAt: new Date(),
      },
    });

    // Create activity log
    await prisma.leadActivity.create({
      data: {
        leadId,
        type: 'LEAD_ASSIGNED',
        title: 'Lead auto-assigned',
        description: 'Lead automatically assigned via routing rules',
        userId,
      },
    });
  }

  // ==================== CRUD Operations ====================

  /**
   * Create a routing rule
   */
  async createRoutingRule(
    organizationId: string,
    data: {
      name: string;
      description?: string;
      priority?: number;
      conditions: RuleCondition[];
      conditionLogic?: 'AND' | 'OR';
      actionType: string;
      assignToUserId?: string;
      assignToTeamId?: string;
      routingGroupId?: string;
    }
  ): Promise<LeadRoutingRule> {
    return prisma.leadRoutingRule.create({
      data: {
        organizationId,
        name: data.name,
        description: data.description,
        priority: data.priority || 0,
        conditions: data.conditions as any,
        conditionLogic: data.conditionLogic || 'AND',
        actionType: data.actionType,
        assignToUserId: data.assignToUserId,
        assignToTeamId: data.assignToTeamId,
        routingGroupId: data.routingGroupId,
      },
    });
  }

  /**
   * Update a routing rule
   */
  async updateRoutingRule(
    ruleId: string,
    organizationId: string,
    data: Partial<{
      name: string;
      description: string;
      priority: number;
      conditions: RuleCondition[];
      conditionLogic: 'AND' | 'OR';
      actionType: string;
      assignToUserId: string;
      assignToTeamId: string;
      routingGroupId: string;
      isActive: boolean;
    }>
  ): Promise<LeadRoutingRule> {
    return prisma.leadRoutingRule.update({
      where: { id: ruleId, organizationId },
      data: {
        ...data,
        conditions: data.conditions as any,
      },
    });
  }

  /**
   * Delete a routing rule
   */
  async deleteRoutingRule(ruleId: string, organizationId: string): Promise<void> {
    await prisma.leadRoutingRule.delete({
      where: { id: ruleId, organizationId },
    });
  }

  /**
   * Get all routing rules for an organization
   */
  async getRoutingRules(organizationId: string): Promise<LeadRoutingRule[]> {
    return prisma.leadRoutingRule.findMany({
      where: { organizationId },
      orderBy: { priority: 'desc' },
      include: {
        routingGroup: {
          include: {
            members: true,
          },
        },
      },
    });
  }

  /**
   * Get a single routing rule
   */
  async getRoutingRule(ruleId: string, organizationId: string): Promise<LeadRoutingRule | null> {
    return prisma.leadRoutingRule.findFirst({
      where: { id: ruleId, organizationId },
      include: {
        routingGroup: {
          include: {
            members: true,
          },
        },
      },
    });
  }

  // ==================== Routing Group Operations ====================

  /**
   * Create a routing group
   */
  async createRoutingGroup(
    organizationId: string,
    data: {
      name: string;
      description?: string;
      memberUserIds?: string[];
    }
  ): Promise<RoutingGroup> {
    const group = await prisma.routingGroup.create({
      data: {
        organizationId,
        name: data.name,
        description: data.description,
      },
    });

    // Add initial members
    if (data.memberUserIds && data.memberUserIds.length > 0) {
      await prisma.routingGroupMember.createMany({
        data: data.memberUserIds.map((userId) => ({
          groupId: group.id,
          userId,
        })),
      });
    }

    return group;
  }

  /**
   * Update a routing group
   */
  async updateRoutingGroup(
    groupId: string,
    organizationId: string,
    data: Partial<{
      name: string;
      description: string;
      isActive: boolean;
    }>
  ): Promise<RoutingGroup> {
    return prisma.routingGroup.update({
      where: { id: groupId, organizationId },
      data,
    });
  }

  /**
   * Delete a routing group
   */
  async deleteRoutingGroup(groupId: string, organizationId: string): Promise<void> {
    await prisma.routingGroup.delete({
      where: { id: groupId, organizationId },
    });
  }

  /**
   * Get all routing groups
   */
  async getRoutingGroups(organizationId: string): Promise<RoutingGroup[]> {
    return prisma.routingGroup.findMany({
      where: { organizationId },
      include: {
        members: {
          include: {
            // We can't include user directly, need to fetch separately
          },
        },
      },
    });
  }

  /**
   * Add member to routing group
   */
  async addGroupMember(
    groupId: string,
    userId: string,
    options?: { weight?: number; maxLeads?: number }
  ): Promise<RoutingGroupMember> {
    return prisma.routingGroupMember.create({
      data: {
        groupId,
        userId,
        weight: options?.weight || 1,
        maxLeads: options?.maxLeads,
      },
    });
  }

  /**
   * Update group member
   */
  async updateGroupMember(
    memberId: string,
    data: Partial<{
      isActive: boolean;
      weight: number;
      maxLeads: number;
    }>
  ): Promise<RoutingGroupMember> {
    return prisma.routingGroupMember.update({
      where: { id: memberId },
      data,
    });
  }

  /**
   * Remove member from routing group
   */
  async removeGroupMember(memberId: string): Promise<void> {
    await prisma.routingGroupMember.delete({
      where: { id: memberId },
    });
  }

  /**
   * Reset daily lead counts for all routing group members
   * (Should be called by a daily cron job)
   */
  async resetDailyLeadCounts(organizationId: string): Promise<number> {
    const result = await prisma.routingGroupMember.updateMany({
      where: {
        group: { organizationId },
      },
      data: {
        currentLeads: 0,
      },
    });

    return result.count;
  }
}

export const leadRoutingService = new LeadRoutingService();
