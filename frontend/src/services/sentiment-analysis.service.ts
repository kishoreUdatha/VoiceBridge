/**
 * Sentiment Analysis Service
 * API client for analyzing customer sentiment from calls and messages
 */

import api from './api';

export type SentimentScore = 'VERY_NEGATIVE' | 'NEGATIVE' | 'NEUTRAL' | 'POSITIVE' | 'VERY_POSITIVE';

export interface SentimentAnalysis {
  id: string;
  organizationId: string;
  leadId: string | null;
  callLogId: string | null;
  messageId: string | null;
  source: 'CALL' | 'EMAIL' | 'CHAT' | 'WHATSAPP' | 'MANUAL';
  content: string | null;
  overallSentiment: SentimentScore;
  sentimentScore: number;
  emotions: Record<string, number> | null;
  keyPhrases: string[] | null;
  customerMood: string | null;
  agentTone: string | null;
  escalationRisk: number | null;
  analyzedAt: string;
}

export interface SentimentTrend {
  id: string;
  organizationId: string;
  leadId: string | null;
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  periodStart: string;
  periodEnd: string;
  avgSentiment: number;
  totalAnalyses: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  topEmotions: Record<string, number> | null;
}

export interface SentimentDashboard {
  totalAnalyses: number;
  avgSentiment: number;
  sentimentDistribution: {
    veryNegative: number;
    negative: number;
    neutral: number;
    positive: number;
    veryPositive: number;
  };
  topEmotions: Array<{
    emotion: string;
    count: number;
  }>;
  recentAnalyses: SentimentAnalysis[];
  escalationRiskLeads: Array<{
    leadId: string;
    leadName: string;
    escalationRisk: number;
    lastSentiment: SentimentScore;
  }>;
  trendData: SentimentTrend[];
}

export interface TextSentimentResult {
  overallSentiment: SentimentScore;
  sentimentScore: number;
  emotions: Record<string, number>;
  keyPhrases: string[];
}

export const sentimentAnalysisService = {
  // Dashboard
  async getDashboard(): Promise<SentimentDashboard> {
    const response = await api.get('/sentiment-analysis/dashboard');
    return response.data.data;
  },

  // Get sentiment for a lead
  async getLeadSentiment(leadId: string): Promise<{
    analyses: SentimentAnalysis[];
    trends: SentimentTrend[];
    avgSentiment: number;
  }> {
    const response = await api.get(`/sentiment-analysis/lead/${leadId}`);
    return response.data.data;
  },

  // Analyze call sentiment
  async analyzeCall(callLogId: string): Promise<SentimentAnalysis> {
    const response = await api.post(`/sentiment-analysis/call/${callLogId}`);
    return response.data.data;
  },

  // Analyze message sentiment
  async analyzeMessage(data: {
    leadId?: string;
    messageId?: string;
    content: string;
    source: 'EMAIL' | 'CHAT' | 'WHATSAPP' | 'MANUAL';
  }): Promise<SentimentAnalysis> {
    const response = await api.post('/sentiment-analysis/message', data);
    return response.data.data;
  },

  // Analyze text (ad-hoc, no storage)
  async analyzeText(text: string): Promise<TextSentimentResult> {
    const response = await api.post('/sentiment-analysis/analyze-text', { text });
    return response.data.data;
  },

  // Calculate sentiment trends
  async calculateTrends(period: 'daily' | 'weekly' | 'monthly'): Promise<SentimentTrend[]> {
    const response = await api.post(`/sentiment-analysis/trends/${period}`);
    return response.data.data;
  },

  // Batch analyze calls
  async batchAnalyze(limit?: number): Promise<{ processed: number; errors: number }> {
    const response = await api.post('/sentiment-analysis/batch-analyze', { limit });
    return response.data.data;
  },
};

// Sentiment colors for UI
export const SENTIMENT_COLORS: Record<SentimentScore, string> = {
  'VERY_NEGATIVE': '#ef4444', // red-500
  'NEGATIVE': '#f97316', // orange-500
  'NEUTRAL': '#6b7280', // gray-500
  'POSITIVE': '#22c55e', // green-500
  'VERY_POSITIVE': '#10b981', // emerald-500
};

// Emotion icons mapping
export const EMOTION_ICONS: Record<string, string> = {
  'joy': '😊',
  'satisfaction': '😌',
  'gratitude': '🙏',
  'excitement': '🎉',
  'trust': '🤝',
  'anger': '😠',
  'frustration': '😤',
  'disappointment': '😞',
  'anxiety': '😰',
  'confusion': '😕',
};
