/**
 * Customer Health Service
 * API client for health scoring, interventions, and surveys
 */

import api from './api';

export type HealthRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type HealthTrend = 'IMPROVING' | 'STABLE' | 'DECLINING';
export type InterventionType = 'CALL' | 'EMAIL' | 'MEETING' | 'DISCOUNT' | 'FEATURE' | 'OTHER';
export type InterventionStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type SurveyType = 'NPS' | 'CSAT' | 'CES' | 'CUSTOM';

export interface CustomerHealth {
  id: string;
  leadId: string;
  overallScore: number;
  engagementScore: number | null;
  satisfactionScore: number | null;
  usageScore: number | null;
  paymentScore: number | null;
  supportScore: number | null;
  riskLevel: HealthRiskLevel;
  trend: HealthTrend;
  factors: Record<string, any> | null;
  lastContactAt: string | null;
  nextReviewAt: string | null;
  calculatedAt: string;
  interventions?: CustomerIntervention[];
}

export interface CustomerIntervention {
  id: string;
  healthRecordId: string;
  type: InterventionType;
  reason: string;
  plannedDate: string;
  completedDate: string | null;
  outcome: string | null;
  status: InterventionStatus;
  assignedToId: string | null;
  notes: string | null;
  assignedTo?: { id: string; firstName: string; lastName: string };
}

export interface CustomerSurvey {
  id: string;
  leadId: string;
  type: SurveyType;
  score: number;
  maxScore: number;
  feedback: string | null;
  responses: Record<string, any> | null;
  surveyedAt: string;
}

export interface HealthDashboard {
  totalRecords: number;
  averageHealth: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  trendDistribution: {
    improving: number;
    stable: number;
    declining: number;
  };
  criticalAccounts: Array<{
    leadId: string;
    leadName: string;
    overallScore: number;
    riskLevel: HealthRiskLevel;
    trend: HealthTrend;
  }>;
  recentInterventions: CustomerIntervention[];
  npsScore: number | null;
  csatScore: number | null;
}

export const customerHealthService = {
  // Dashboard
  async getDashboard(): Promise<HealthDashboard> {
    const response = await api.get('/customer-health/dashboard');
    return response.data.data;
  },

  // Get all health records
  async getHealthRecords(params?: {
    riskLevel?: HealthRiskLevel;
    trend?: HealthTrend;
    limit?: number;
    offset?: number;
  }): Promise<{ records: CustomerHealth[]; total: number }> {
    const response = await api.get('/customer-health', { params });
    return { records: response.data.data, total: response.data.total };
  },

  // Get health for a lead
  async getLeadHealth(leadId: string): Promise<CustomerHealth | null> {
    const response = await api.get(`/customer-health/lead/${leadId}`);
    return response.data.data;
  },

  // Calculate health score
  async calculateHealth(leadId: string): Promise<CustomerHealth> {
    const response = await api.post(`/customer-health/lead/${leadId}/calculate`);
    return response.data.data;
  },

  // Create intervention
  async createIntervention(data: {
    healthRecordId: string;
    type: InterventionType;
    reason: string;
    plannedDate: string;
    assignedToId?: string;
    notes?: string;
  }): Promise<CustomerIntervention> {
    const response = await api.post('/customer-health/interventions', data);
    return response.data.data;
  },

  // Update intervention
  async updateIntervention(id: string, data: Partial<{
    status: InterventionStatus;
    completedDate: string;
    outcome: string;
    notes: string;
  }>): Promise<CustomerIntervention> {
    const response = await api.put(`/customer-health/interventions/${id}`, data);
    return response.data.data;
  },

  // Record survey response
  async recordSurvey(data: {
    leadId: string;
    type: SurveyType;
    score: number;
    maxScore?: number;
    feedback?: string;
    responses?: Record<string, any>;
  }): Promise<CustomerSurvey> {
    const response = await api.post('/customer-health/surveys', data);
    return response.data.data;
  },

  // Batch calculate health
  async batchCalculate(limit?: number): Promise<{ processed: number; errors: number }> {
    const response = await api.post('/customer-health/batch-calculate', { limit });
    return response.data.data;
  },
};
