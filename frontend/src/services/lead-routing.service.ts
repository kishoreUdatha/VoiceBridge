/**
 * Lead Routing Service
 * API client for lead routing rules and groups
 */

import api from './api';

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'starts_with'
  | 'ends_with'
  | 'in'
  | 'not_in'
  | 'greater_than'
  | 'less_than'
  | 'is_empty'
  | 'is_not_empty';

export type ActionType = 'ASSIGN_USER' | 'ASSIGN_TEAM' | 'ROUND_ROBIN' | 'LOAD_BALANCE';

export interface RuleCondition {
  id: string;
  field: string;
  operator: ConditionOperator;
  value: any;
}

export interface RoutingRule {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  conditions: RuleCondition[];
  conditionLogic: 'AND' | 'OR';
  actionType: ActionType;
  assignToUserId?: string;
  assignToTeamId?: string;
  routingGroupId?: string;
  priority: number;
  isActive: boolean;
  matchCount: number;
  lastMatchedAt?: string;
  createdAt: string;
  updatedAt: string;
  assignToUser?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  routingGroup?: RoutingGroup;
}

export interface RoutingGroupMember {
  id: string;
  routingGroupId: string;
  userId: string;
  weight: number;
  maxLeadsPerDay?: number;
  currentDailyLeads: number;
  isActive: boolean;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface RoutingGroup {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  members: RoutingGroupMember[];
}

export interface CreateRuleInput {
  name: string;
  description?: string;
  conditions?: Omit<RuleCondition, 'id'>[];
  conditionLogic?: 'AND' | 'OR';
  actionType: ActionType;
  assignToUserId?: string;
  assignToTeamId?: string;
  routingGroupId?: string;
  priority?: number;
}

export interface UpdateRuleInput extends Partial<CreateRuleInput> {
  isActive?: boolean;
}

export const CONDITION_FIELDS = [
  { value: 'source', label: 'Lead Source', type: 'text' },
  { value: 'status', label: 'Status', type: 'select' },
  { value: 'city', label: 'City', type: 'text' },
  { value: 'state', label: 'State', type: 'text' },
  { value: 'country', label: 'Country', type: 'text' },
  { value: 'leadScore', label: 'Lead Score', type: 'number' },
  { value: 'budget', label: 'Budget', type: 'number' },
  { value: 'industry', label: 'Industry', type: 'text' },
  { value: 'companySize', label: 'Company Size', type: 'text' },
  { value: 'tags', label: 'Tags', type: 'array' },
];

export const CONDITION_OPERATORS: { value: ConditionOperator; label: string; types: string[] }[] = [
  { value: 'equals', label: 'Equals', types: ['text', 'select', 'number'] },
  { value: 'not_equals', label: 'Not Equals', types: ['text', 'select', 'number'] },
  { value: 'contains', label: 'Contains', types: ['text', 'array'] },
  { value: 'starts_with', label: 'Starts With', types: ['text'] },
  { value: 'ends_with', label: 'Ends With', types: ['text'] },
  { value: 'in', label: 'In List', types: ['text', 'select'] },
  { value: 'not_in', label: 'Not In List', types: ['text', 'select'] },
  { value: 'greater_than', label: 'Greater Than', types: ['number'] },
  { value: 'less_than', label: 'Less Than', types: ['number'] },
  { value: 'is_empty', label: 'Is Empty', types: ['text', 'array'] },
  { value: 'is_not_empty', label: 'Is Not Empty', types: ['text', 'array'] },
];

export const ACTION_TYPES: { value: ActionType; label: string; description: string }[] = [
  { value: 'ASSIGN_USER', label: 'Assign to User', description: 'Assign directly to a specific user' },
  { value: 'ASSIGN_TEAM', label: 'Assign to Team', description: 'Assign to a team for distribution' },
  { value: 'ROUND_ROBIN', label: 'Round Robin', description: 'Distribute equally among group members' },
  { value: 'LOAD_BALANCE', label: 'Load Balance', description: 'Distribute based on current workload' },
];

export const leadRoutingService = {
  // ==================== Rules ====================

  async getRules(): Promise<RoutingRule[]> {
    const response = await api.get('/lead-routing/rules');
    return response.data.data.rules;
  },

  async getRule(ruleId: string): Promise<RoutingRule> {
    const response = await api.get(`/lead-routing/rules/${ruleId}`);
    return response.data.data;
  },

  async createRule(data: CreateRuleInput): Promise<RoutingRule> {
    const response = await api.post('/lead-routing/rules', data);
    return response.data.data;
  },

  async updateRule(ruleId: string, data: UpdateRuleInput): Promise<RoutingRule> {
    const response = await api.put(`/lead-routing/rules/${ruleId}`, data);
    return response.data.data;
  },

  async deleteRule(ruleId: string): Promise<void> {
    await api.delete(`/lead-routing/rules/${ruleId}`);
  },

  // ==================== Groups ====================

  async getGroups(): Promise<RoutingGroup[]> {
    const response = await api.get('/lead-routing/groups');
    return response.data.data.groups;
  },

  async createGroup(data: { name: string; description?: string; memberUserIds?: string[] }): Promise<RoutingGroup> {
    const response = await api.post('/lead-routing/groups', data);
    return response.data.data;
  },

  async updateGroup(groupId: string, data: { name?: string; description?: string; isActive?: boolean }): Promise<RoutingGroup> {
    const response = await api.put(`/lead-routing/groups/${groupId}`, data);
    return response.data.data;
  },

  async deleteGroup(groupId: string): Promise<void> {
    await api.delete(`/lead-routing/groups/${groupId}`);
  },

  // ==================== Group Members ====================

  async addGroupMember(groupId: string, userId: string, options?: { weight?: number; maxLeads?: number }): Promise<RoutingGroupMember> {
    const response = await api.post(`/lead-routing/groups/${groupId}/members`, {
      userId,
      ...options,
    });
    return response.data.data;
  },

  async updateGroupMember(groupId: string, memberId: string, data: { isActive?: boolean; weight?: number; maxLeads?: number }): Promise<RoutingGroupMember> {
    const response = await api.put(`/lead-routing/groups/${groupId}/members/${memberId}`, data);
    return response.data.data;
  },

  async removeGroupMember(groupId: string, memberId: string): Promise<void> {
    await api.delete(`/lead-routing/groups/${groupId}/members/${memberId}`);
  },

  // ==================== Routing ====================

  async routeLead(leadId: string): Promise<{
    success: boolean;
    assignedToUserId?: string;
    assignedToUser?: { id: string; firstName: string; lastName: string; email: string };
    matchedRuleId?: string;
    matchedRuleName?: string;
    reason: string;
  }> {
    const response = await api.post(`/lead-routing/route/${leadId}`);
    return response.data.data;
  },
};

export default leadRoutingService;
