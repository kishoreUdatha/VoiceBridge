/**
 * Lead Management Services
 * API client for lead deduplication, routing, tags, workflows, views, and SLA
 */

import api from './api';

// ==================== Lead Deduplication ====================

export const leadDeduplicationService = {
  checkDuplicates: async (phone?: string, email?: string) => {
    const params = new URLSearchParams();
    if (phone) params.append('phone', phone);
    if (email) params.append('email', email);
    const { data } = await api.get(`/lead-deduplication/check?${params}`);
    return data;
  },

  getDuplicateGroups: async (status?: string) => {
    const params = status ? `?status=${status}` : '';
    const { data } = await api.get(`/lead-deduplication/groups${params}`);
    return data;
  },

  findDuplicatesForLead: async (leadId: string) => {
    const { data } = await api.get(`/lead-deduplication/lead/${leadId}`);
    return data;
  },

  autoDetectDuplicates: async () => {
    const { data } = await api.post('/lead-deduplication/auto-detect');
    return data;
  },

  mergeDuplicates: async (primaryLeadId: string, duplicateLeadIds: string[]) => {
    const { data } = await api.post('/lead-deduplication/merge', {
      primaryLeadId,
      duplicateLeadIds,
    });
    return data;
  },

  ignoreDuplicateGroup: async (groupId: string) => {
    const { data } = await api.post(`/lead-deduplication/groups/${groupId}/ignore`);
    return data;
  },

  getMergeHistory: async (leadId: string) => {
    const { data } = await api.get(`/lead-deduplication/lead/${leadId}/history`);
    return data;
  },
};

// ==================== Lead Routing ====================

export const leadRoutingService = {
  routeLead: async (leadId: string) => {
    const { data } = await api.post(`/lead-routing/route/${leadId}`);
    return data;
  },

  getRoutingRules: async () => {
    const { data } = await api.get('/lead-routing/rules');
    return data;
  },

  getRoutingRule: async (ruleId: string) => {
    const { data } = await api.get(`/lead-routing/rules/${ruleId}`);
    return data;
  },

  createRoutingRule: async (rule: {
    name: string;
    actionType: string;
    conditions?: any[];
    conditionLogic?: string;
    priority?: number;
    assignToUserId?: string;
    assignToTeamId?: string;
    routingGroupId?: string;
  }) => {
    const { data } = await api.post('/lead-routing/rules', rule);
    return data;
  },

  updateRoutingRule: async (ruleId: string, updates: any) => {
    const { data } = await api.put(`/lead-routing/rules/${ruleId}`, updates);
    return data;
  },

  deleteRoutingRule: async (ruleId: string) => {
    const { data } = await api.delete(`/lead-routing/rules/${ruleId}`);
    return data;
  },

  getRoutingGroups: async () => {
    const { data } = await api.get('/lead-routing/groups');
    return data;
  },

  createRoutingGroup: async (group: { name: string; description?: string; memberUserIds?: string[] }) => {
    const { data } = await api.post('/lead-routing/groups', group);
    return data;
  },

  updateRoutingGroup: async (groupId: string, updates: any) => {
    const { data } = await api.put(`/lead-routing/groups/${groupId}`, updates);
    return data;
  },

  deleteRoutingGroup: async (groupId: string) => {
    const { data } = await api.delete(`/lead-routing/groups/${groupId}`);
    return data;
  },

  addGroupMember: async (groupId: string, userId: string, options?: { weight?: number; maxLeads?: number }) => {
    const { data } = await api.post(`/lead-routing/groups/${groupId}/members`, { userId, ...options });
    return data;
  },

  removeGroupMember: async (groupId: string, memberId: string) => {
    const { data } = await api.delete(`/lead-routing/groups/${groupId}/members/${memberId}`);
    return data;
  },
};

// ==================== Lead Tags ====================

export const leadTagsService = {
  getTags: async (includeCount = false) => {
    const { data } = await api.get(`/lead-tags?includeCount=${includeCount}`);
    return data;
  },

  getTag: async (tagId: string) => {
    const { data } = await api.get(`/lead-tags/${tagId}`);
    return data;
  },

  createTag: async (tag: { name: string; color?: string; description?: string }) => {
    const { data } = await api.post('/lead-tags', tag);
    return data;
  },

  updateTag: async (tagId: string, updates: { name?: string; color?: string; description?: string }) => {
    const { data } = await api.put(`/lead-tags/${tagId}`, updates);
    return data;
  },

  deleteTag: async (tagId: string) => {
    const { data } = await api.delete(`/lead-tags/${tagId}`);
    return data;
  },

  getLeadTags: async (leadId: string) => {
    const { data } = await api.get(`/lead-tags/lead/${leadId}`);
    return data;
  },

  assignTagsToLead: async (leadId: string, tagIds: string[]) => {
    const { data } = await api.post(`/lead-tags/lead/${leadId}/assign`, { tagIds });
    return data;
  },

  removeTagsFromLead: async (leadId: string, tagIds: string[]) => {
    const { data } = await api.post(`/lead-tags/lead/${leadId}/remove`, { tagIds });
    return data;
  },

  replaceLeadTags: async (leadId: string, tagIds: string[]) => {
    const { data } = await api.put(`/lead-tags/lead/${leadId}/replace`, { tagIds });
    return data;
  },

  getLeadsByTag: async (tagId: string, limit = 50, offset = 0) => {
    const { data } = await api.get(`/lead-tags/${tagId}/leads?limit=${limit}&offset=${offset}`);
    return data;
  },

  filterLeadsByTags: async (tagIds: string[], logic: 'AND' | 'OR' = 'OR', limit = 50, offset = 0) => {
    const { data } = await api.post('/lead-tags/filter', { tagIds, logic, limit, offset });
    return data;
  },

  bulkAssignTag: async (tagId: string, leadIds: string[]) => {
    const { data } = await api.post(`/lead-tags/${tagId}/bulk-assign`, { leadIds });
    return data;
  },

  bulkRemoveTag: async (tagId: string, leadIds: string[]) => {
    const { data } = await api.post(`/lead-tags/${tagId}/bulk-remove`, { leadIds });
    return data;
  },

  createDefaultTags: async () => {
    const { data } = await api.post('/lead-tags/create-defaults');
    return data;
  },

  getTagStats: async () => {
    const { data } = await api.get('/lead-tags/stats');
    return data;
  },
};

// ==================== Lead Workflows ====================

export const leadWorkflowService = {
  getWorkflows: async (includeStats = false, isActive?: boolean) => {
    const params = new URLSearchParams();
    if (includeStats) params.append('includeStats', 'true');
    if (isActive !== undefined) params.append('isActive', String(isActive));
    const { data } = await api.get(`/lead-workflows?${params}`);
    return data;
  },

  getWorkflow: async (workflowId: string) => {
    const { data } = await api.get(`/lead-workflows/${workflowId}`);
    return data;
  },

  getWorkflowStats: async (workflowId: string) => {
    const { data } = await api.get(`/lead-workflows/${workflowId}/stats`);
    return data;
  },

  createWorkflow: async (workflow: {
    name: string;
    description?: string;
    triggerType: string;
    triggerConfig?: any;
    actions: { type: string; config: any; delayMinutes?: number }[];
  }) => {
    const { data } = await api.post('/lead-workflows', workflow);
    return data;
  },

  updateWorkflow: async (workflowId: string, updates: any) => {
    const { data } = await api.put(`/lead-workflows/${workflowId}`, updates);
    return data;
  },

  deleteWorkflow: async (workflowId: string) => {
    const { data } = await api.delete(`/lead-workflows/${workflowId}`);
    return data;
  },

  enrollLead: async (workflowId: string, leadId: string) => {
    const { data } = await api.post(`/lead-workflows/${workflowId}/enroll`, { leadId });
    return data;
  },

  cancelEnrollment: async (enrollmentId: string) => {
    const { data } = await api.post(`/lead-workflows/enrollments/${enrollmentId}/cancel`);
    return data;
  },

  pauseEnrollment: async (enrollmentId: string) => {
    const { data } = await api.post(`/lead-workflows/enrollments/${enrollmentId}/pause`);
    return data;
  },

  resumeEnrollment: async (enrollmentId: string) => {
    const { data } = await api.post(`/lead-workflows/enrollments/${enrollmentId}/resume`);
    return data;
  },

  triggerWorkflows: async (triggerType: string, leadId: string, context?: any) => {
    const { data } = await api.post('/lead-workflows/trigger', { triggerType, leadId, context });
    return data;
  },
};

// ==================== Lead Views ====================

export const leadViewsService = {
  getViews: async () => {
    const { data } = await api.get('/lead-views');
    return data;
  },

  getDefaultView: async () => {
    const { data } = await api.get('/lead-views/default');
    return data;
  },

  getView: async (viewId: string) => {
    const { data } = await api.get(`/lead-views/${viewId}`);
    return data;
  },

  createView: async (view: {
    name: string;
    description?: string;
    filters?: any[];
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
    columns?: string[];
    groupBy?: string;
    isShared?: boolean;
    isDefault?: boolean;
  }) => {
    const { data } = await api.post('/lead-views', view);
    return data;
  },

  updateView: async (viewId: string, updates: any) => {
    const { data } = await api.put(`/lead-views/${viewId}`, updates);
    return data;
  },

  deleteView: async (viewId: string) => {
    const { data } = await api.delete(`/lead-views/${viewId}`);
    return data;
  },

  applyView: async (viewId: string, page = 1, limit = 50) => {
    const { data } = await api.get(`/lead-views/${viewId}/apply?page=${page}&limit=${limit}`);
    return data;
  },

  createDefaultViews: async () => {
    const { data } = await api.post('/lead-views/create-defaults');
    return data;
  },
};

// ==================== Lead SLA ====================

export const leadSlaService = {
  getSlaConfigs: async () => {
    const { data } = await api.get('/lead-sla/configs');
    return data;
  },

  getSlaConfig: async (configId: string) => {
    const { data } = await api.get(`/lead-sla/configs/${configId}`);
    return data;
  },

  createSlaConfig: async (config: {
    name: string;
    description?: string;
    firstResponseMinutes?: number;
    followUpMinutes?: number;
    resolutionMinutes?: number;
    workingHoursOnly?: boolean;
    workingHoursStart?: string;
    workingHoursEnd?: string;
    workingDays?: number[];
    escalationEnabled?: boolean;
    escalationMinutes?: number;
    escalationUserId?: string;
    conditions?: any[];
    isDefault?: boolean;
  }) => {
    const { data } = await api.post('/lead-sla/configs', config);
    return data;
  },

  updateSlaConfig: async (configId: string, updates: any) => {
    const { data } = await api.put(`/lead-sla/configs/${configId}`, updates);
    return data;
  },

  deleteSlaConfig: async (configId: string) => {
    const { data } = await api.delete(`/lead-sla/configs/${configId}`);
    return data;
  },

  getLeadSlaStatus: async (leadId: string) => {
    const { data } = await api.get(`/lead-sla/lead/${leadId}/status`);
    return data;
  },

  getBreachedLeads: async (breachType?: string, limit = 50) => {
    const params = new URLSearchParams();
    if (breachType) params.append('breachType', breachType);
    params.append('limit', String(limit));
    const { data } = await api.get(`/lead-sla/breached?${params}`);
    return data;
  },

  getSlaMetrics: async () => {
    const { data } = await api.get('/lead-sla/metrics');
    return data;
  },
};

// ==================== Lead Scoring ====================

export const leadScoringService = {
  getScoringRules: async () => {
    const { data } = await api.get('/lead-scoring/scoring-rules');
    return data;
  },

  createScoringRule: async (rule: {
    name: string;
    scoreType: string;
    scoreValue: number;
    conditions?: any[];
    scoreAction?: string;
    decayEnabled?: boolean;
    decayDays?: number;
    decayPercent?: number;
  }) => {
    const { data } = await api.post('/lead-scoring/scoring-rules', rule);
    return data;
  },

  updateScoringRule: async (ruleId: string, updates: any) => {
    const { data } = await api.put(`/lead-scoring/scoring-rules/${ruleId}`, updates);
    return data;
  },

  deleteScoringRule: async (ruleId: string) => {
    const { data } = await api.delete(`/lead-scoring/scoring-rules/${ruleId}`);
    return data;
  },

  calculateRuleBasedScore: async (leadId: string) => {
    const { data } = await api.post(`/lead-scoring/calculate-rule-based/${leadId}`);
    return data;
  },

  batchCalculateScores: async () => {
    const { data } = await api.post('/lead-scoring/batch-calculate');
    return data;
  },

  getHotLeads: async (limit = 20) => {
    const { data } = await api.get(`/lead-scoring/hot-leads?limit=${limit}`);
    return data;
  },

  getScoreDistribution: async () => {
    const { data } = await api.get('/lead-scoring/score-distribution');
    return data;
  },

  createDefaultScoringRules: async () => {
    const { data } = await api.post('/lead-scoring/create-default-rules');
    return data;
  },
};
