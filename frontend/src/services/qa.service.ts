/**
 * QA (Quality Assurance) Service
 * API client for call review and scoring
 */

import api from './api';

export interface ScoreCriterion {
  id: string;
  name: string;
  description: string;
  weight: number;
  maxScore: number;
}

export interface QATemplate {
  id: string;
  name: string;
  description?: string;
  criteria: ScoreCriterion[];
  totalMaxScore: number;
  passingScore: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface ReviewScore {
  criterionId: string;
  score: number;
  notes?: string;
}

export interface QAReview {
  id: string;
  callLogId: string;
  templateId: string;
  reviewerId: string;
  agentId: string;
  scores: ReviewScore[];
  totalScore: number;
  percentage: number;
  passed: boolean;
  strengths?: string;
  improvements?: string;
  coachingNotes?: string;
  status: 'DRAFT' | 'SUBMITTED' | 'ACKNOWLEDGED' | 'DISPUTED';
  reviewedAt?: string;
  acknowledgedAt?: string;
  createdAt: string;
  template?: QATemplate;
  reviewer?: { id: string; firstName: string; lastName: string };
  agent?: { id: string; firstName: string; lastName: string };
}

export interface PendingCall {
  id: string;
  duration: number;
  status: string;
  recordingUrl?: string;
  createdAt: string;
  user?: { id: string; firstName: string; lastName: string; email: string };
  lead?: { id: string; firstName: string; lastName: string; phone: string };
}

export interface QADashboard {
  totalReviews: number;
  pendingReviews: number;
  passedReviews: number;
  reviewsThisMonth: number;
  averageScore: number;
  passRate: number;
  topPerformers: { agentId: string; agentName: string; averageScore: number; reviewCount: number }[];
  needsImprovement: { agentId: string; agentName: string; averageScore: number; reviewCount: number }[];
}

export interface AgentStats {
  totalReviews: number;
  averageScore: number;
  passRate: number;
  passedCount?: number;
  failedCount?: number;
}

export const qaService = {
  // Templates
  async getTemplates(): Promise<QATemplate[]> {
    const response = await api.get('/qa/templates');
    return response.data.data;
  },

  async createTemplate(data: {
    name: string;
    description?: string;
    criteria: ScoreCriterion[];
    passingScore?: number;
    isDefault?: boolean;
  }): Promise<QATemplate> {
    const response = await api.post('/qa/templates', data);
    return response.data.data;
  },

  async getTemplate(id: string): Promise<QATemplate> {
    const response = await api.get(`/qa/templates/${id}`);
    return response.data.data;
  },

  async updateTemplate(id: string, data: Partial<QATemplate>): Promise<QATemplate> {
    const response = await api.put(`/qa/templates/${id}`, data);
    return response.data.data;
  },

  // Pending Calls
  async getPendingCalls(params?: {
    agentId?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: PendingCall[]; total: number }> {
    const response = await api.get('/qa/pending-calls', { params });
    return { data: response.data.data, total: response.data.total };
  },

  // Reviews
  async getReviews(params?: {
    agentId?: string;
    reviewerId?: string;
    status?: string;
    passed?: boolean;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: QAReview[]; total: number }> {
    const response = await api.get('/qa/reviews', { params });
    return { data: response.data.data, total: response.data.total };
  },

  async createReview(data: {
    callLogId: string;
    templateId: string;
    agentId: string;
    scores: ReviewScore[];
    strengths?: string;
    improvements?: string;
    coachingNotes?: string;
    status?: 'DRAFT' | 'SUBMITTED';
  }): Promise<QAReview> {
    const response = await api.post('/qa/reviews', data);
    return response.data.data;
  },

  async getReview(id: string): Promise<QAReview> {
    const response = await api.get(`/qa/reviews/${id}`);
    return response.data.data;
  },

  async updateReview(id: string, data: Partial<{
    scores: ReviewScore[];
    strengths: string;
    improvements: string;
    coachingNotes: string;
    status: 'DRAFT' | 'SUBMITTED' | 'ACKNOWLEDGED' | 'DISPUTED';
  }>): Promise<QAReview> {
    const response = await api.put(`/qa/reviews/${id}`, data);
    return response.data.data;
  },

  // Dashboard & Stats
  async getDashboard(): Promise<QADashboard> {
    const response = await api.get('/qa/dashboard');
    return response.data.data;
  },

  async getAgentStats(agentId: string, params?: {
    dateFrom?: string;
    dateTo?: string;
  }): Promise<AgentStats> {
    const response = await api.get(`/qa/agent-stats/${agentId}`, { params });
    return response.data.data;
  },
};

// Default scoring template
export const DEFAULT_CRITERIA: ScoreCriterion[] = [
  { id: 'greeting', name: 'Greeting & Introduction', description: 'Professional greeting and clear introduction', weight: 10, maxScore: 10 },
  { id: 'listening', name: 'Active Listening', description: 'Demonstrates understanding of customer needs', weight: 15, maxScore: 15 },
  { id: 'product-knowledge', name: 'Product Knowledge', description: 'Accurate and helpful product information', weight: 20, maxScore: 20 },
  { id: 'communication', name: 'Communication Skills', description: 'Clear, professional, and courteous communication', weight: 15, maxScore: 15 },
  { id: 'problem-solving', name: 'Problem Solving', description: 'Effective handling of customer issues', weight: 15, maxScore: 15 },
  { id: 'closing', name: 'Closing & Next Steps', description: 'Clear summary and next steps provided', weight: 10, maxScore: 10 },
  { id: 'compliance', name: 'Compliance', description: 'Follows required disclosures and scripts', weight: 15, maxScore: 15 },
];
