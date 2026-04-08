/**
 * Deal Intelligence Service
 * API client for deal health, win probability, and risk assessment
 */

import api from './api';

export type DealRiskSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type WinLossOutcome = 'WON' | 'LOST' | 'PENDING';

export interface DealIntelligence {
  id: string;
  organizationId: string;
  leadId: string;
  quotationId: string | null;
  dealValue: number;
  winProbability: number;
  healthScore: number;
  riskScore: number | null;
  engagementLevel: number | null;
  competitorPresence: boolean;
  stakeholderEngagement: number | null;
  decisionTimelineRisk: number | null;
  nextSteps: string[] | null;
  riskFactors: string[] | null;
  strengthFactors: string[] | null;
  recommendedActions: string[] | null;
  calculatedAt: string;
  riskAlerts?: DealRiskAlert[];
  lead?: {
    id: string;
    firstName: string;
    lastName: string;
    company: string;
    stage: string;
  };
}

export interface DealRiskAlert {
  id: string;
  intelligenceId: string;
  alertType: string;
  severity: DealRiskSeverity;
  message: string;
  isResolved: boolean;
  resolvedById: string | null;
  resolvedAt: string | null;
  createdAt: string;
  resolvedBy?: { id: string; firstName: string; lastName: string };
}

export interface WinLossAnalysis {
  id: string;
  organizationId: string;
  leadId: string;
  outcome: WinLossOutcome;
  dealValue: number;
  competitorId: string | null;
  competitorName: string | null;
  lossReason: string | null;
  winFactors: string[] | null;
  lossFactors: string[] | null;
  lessonsLearned: string | null;
  analyzedById: string;
  analyzedAt: string;
}

export interface DealDashboard {
  totalDeals: number;
  totalValue: number;
  avgWinProbability: number;
  avgHealthScore: number;
  pipelineByStage: Record<string, { count: number; value: number }>;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  topDeals: Array<{
    leadId: string;
    leadName: string;
    dealValue: number;
    winProbability: number;
    healthScore: number;
  }>;
  atRiskDeals: Array<{
    leadId: string;
    leadName: string;
    dealValue: number;
    riskScore: number;
    alerts: DealRiskAlert[];
  }>;
  activeAlerts: DealRiskAlert[];
  winLossStats: {
    totalWon: number;
    totalLost: number;
    winRate: number;
    avgWonValue: number;
    avgLostValue: number;
    topLossReasons: Array<{ reason: string; count: number }>;
  };
}

export const dealIntelligenceService = {
  // Dashboard
  async getDashboard(): Promise<DealDashboard> {
    const response = await api.get('/deal-intelligence/dashboard');
    return response.data.data;
  },

  // Get all deals with intelligence
  async getDeals(params?: {
    minProbability?: number;
    maxProbability?: number;
    minHealth?: number;
    maxHealth?: number;
    limit?: number;
    offset?: number;
  }): Promise<{ deals: DealIntelligence[]; total: number }> {
    const response = await api.get('/deal-intelligence', { params });
    return { deals: response.data.data, total: response.data.total };
  },

  // Get deal intelligence for a lead
  async getLeadDealIntelligence(leadId: string): Promise<DealIntelligence | null> {
    const response = await api.get(`/deal-intelligence/lead/${leadId}`);
    return response.data.data;
  },

  // Calculate deal intelligence
  async calculateIntelligence(leadId: string): Promise<DealIntelligence> {
    const response = await api.post(`/deal-intelligence/lead/${leadId}/calculate`);
    return response.data.data;
  },

  // Resolve risk alert
  async resolveAlert(alertId: string): Promise<DealRiskAlert> {
    const response = await api.post(`/deal-intelligence/alerts/${alertId}/resolve`);
    return response.data.data;
  },

  // Record win/loss analysis
  async recordWinLoss(data: {
    leadId: string;
    outcome: WinLossOutcome;
    dealValue: number;
    competitorName?: string;
    lossReason?: string;
    winFactors?: string[];
    lossFactors?: string[];
    lessonsLearned?: string;
  }): Promise<WinLossAnalysis> {
    const response = await api.post('/deal-intelligence/win-loss', data);
    return response.data.data;
  },

  // Batch calculate
  async batchCalculate(limit?: number): Promise<{ processed: number; errors: number }> {
    const response = await api.post('/deal-intelligence/batch-calculate', { limit });
    return response.data.data;
  },
};

// Win probability color coding
export const WIN_PROBABILITY_COLORS = {
  high: '#22c55e', // green-500 (>70%)
  medium: '#f59e0b', // amber-500 (40-70%)
  low: '#ef4444', // red-500 (<40%)
};

// Health score color coding
export const HEALTH_SCORE_COLORS = {
  excellent: '#10b981', // emerald-500 (>80)
  good: '#22c55e', // green-500 (60-80)
  fair: '#f59e0b', // amber-500 (40-60)
  poor: '#f97316', // orange-500 (20-40)
  critical: '#ef4444', // red-500 (<20)
};

// Common loss reasons
export const COMMON_LOSS_REASONS = [
  'Price too high',
  'Competitor chosen',
  'Budget constraints',
  'Timing not right',
  'Feature gap',
  'No decision made',
  'Contact went cold',
  'Internal politics',
  'Requirements changed',
  'Other',
];
