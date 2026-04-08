/**
 * Predictive Analytics Service
 * API client for AI-based lead scoring, conversion prediction, churn risk, and LTV
 */

import api from './api';

export interface LeadPrediction {
  id: string;
  leadId: string;
  conversionScore: number;
  churnRisk: number | null;
  estimatedValue: number | null;
  engagementScore: number | null;
  nextBestAction: string | null;
  factors: Record<string, any> | null;
  confidenceLevel: number | null;
  calculatedAt: string;
}

export interface CustomerLTV {
  id: string;
  leadId: string;
  historicalValue: number;
  predictedValue: number;
  lifetimeValue: number;
  segment: string | null;
  revenueHistory: Record<string, any> | null;
  calculatedAt: string;
}

export interface PredictiveDashboard {
  totalPredictions: number;
  avgConversionScore: number;
  avgChurnRisk: number;
  totalPredictedValue: number;
  conversionDistribution: {
    high: number;
    medium: number;
    low: number;
  };
  churnRiskDistribution: {
    high: number;
    medium: number;
    low: number;
  };
  topConversionLeads: Array<{
    leadId: string;
    leadName: string;
    conversionScore: number;
    estimatedValue: number;
  }>;
  atRiskLeads: Array<{
    leadId: string;
    leadName: string;
    churnRisk: number;
    nextBestAction: string;
  }>;
}

export interface LeadPredictionData {
  prediction: LeadPrediction | null;
  ltv: CustomerLTV | null;
}

export const predictiveAnalyticsService = {
  // Dashboard
  async getDashboard(): Promise<PredictiveDashboard> {
    const response = await api.get('/predictive-analytics/dashboard');
    return response.data.data;
  },

  // Get prediction for a lead
  async getLeadPrediction(leadId: string): Promise<LeadPredictionData> {
    const response = await api.get(`/predictive-analytics/lead/${leadId}`);
    return response.data.data;
  },

  // Calculate conversion score
  async calculateConversionScore(leadId: string): Promise<LeadPrediction> {
    const response = await api.post(`/predictive-analytics/lead/${leadId}/conversion`);
    return response.data.data;
  },

  // Calculate churn risk
  async calculateChurnRisk(leadId: string): Promise<LeadPrediction> {
    const response = await api.post(`/predictive-analytics/lead/${leadId}/churn`);
    return response.data.data;
  },

  // Calculate LTV
  async calculateLTV(leadId: string): Promise<CustomerLTV> {
    const response = await api.post(`/predictive-analytics/lead/${leadId}/ltv`);
    return response.data.data;
  },

  // Batch calculate predictions
  async batchCalculate(limit?: number): Promise<{ processed: number; errors: number }> {
    const response = await api.post('/predictive-analytics/batch-calculate', { limit });
    return response.data.data;
  },
};
