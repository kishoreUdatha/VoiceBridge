/**
 * Account-Based Marketing Service
 */

import api from './api';

export interface ABMCampaign {
  id: string;
  name: string;
  description?: string;
  tier: 'ONE_TO_ONE' | 'ONE_TO_FEW' | 'ONE_TO_MANY';
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';
  targetAccounts: string[];
  goals?: Record<string, number>;
  budget?: number;
  startDate: string;
  endDate?: string;
  accountsEngaged: number;
  contactsReached: number;
  meetingsBooked: number;
  opportunitiesCreated: number;
  pipelineGenerated: number;
  revenueWon: number;
  createdAt: string;
  plays?: ABMPlay[];
  accountEngagement?: ABMAccountEngagement[];
  _count?: { accountEngagement: number };
}

export interface ABMPlay {
  id: string;
  campaignId: string;
  name: string;
  description?: string;
  triggerType: 'MANUAL' | 'TIME_BASED' | 'EVENT_BASED' | 'SCORE_BASED';
  triggerConfig?: Record<string, any>;
  actions: any[];
  personalizationRules?: Record<string, any>;
  sequence: number;
  delayDays: number;
  isActive: boolean;
}

export interface ABMAccountEngagement {
  id: string;
  campaignId: string;
  accountId: string;
  stage: 'AWARE' | 'ENGAGED' | 'MARKETING_QUALIFIED' | 'SALES_QUALIFIED' | 'OPPORTUNITY' | 'CUSTOMER';
  engagementScore: number;
  websiteVisits: number;
  emailOpens: number;
  emailClicks: number;
  adImpressions: number;
  adClicks: number;
  contentDownloads: number;
  meetingsHeld: number;
  totalTouchpoints: number;
  lastActivityAt?: string;
  stageChangedAt?: string;
}

export const abmService = {
  async getCampaigns(filters?: { status?: string; tier?: string }): Promise<ABMCampaign[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.tier) params.append('tier', filters.tier);

    const response = await api.get(`/abm/campaigns?${params.toString()}`);
    return response.data;
  },

  async getCampaign(id: string): Promise<ABMCampaign> {
    const response = await api.get(`/abm/campaigns/${id}`);
    return response.data;
  },

  async createCampaign(data: Partial<ABMCampaign>): Promise<ABMCampaign> {
    const response = await api.post('/abm/campaigns', data);
    return response.data;
  },

  async updateCampaign(id: string, data: Partial<ABMCampaign>): Promise<ABMCampaign> {
    const response = await api.put(`/abm/campaigns/${id}`, data);
    return response.data;
  },

  async addPlay(campaignId: string, data: Partial<ABMPlay>): Promise<ABMPlay> {
    const response = await api.post(`/abm/campaigns/${campaignId}/plays`, data);
    return response.data;
  },

  async updatePlay(playId: string, data: Partial<ABMPlay>): Promise<ABMPlay> {
    const response = await api.put(`/abm/plays/${playId}`, data);
    return response.data;
  },

  async deletePlay(playId: string): Promise<void> {
    await api.delete(`/abm/plays/${playId}`);
  },

  async addAccounts(campaignId: string, accountIds: string[]): Promise<{ added: number }> {
    const response = await api.post(`/abm/campaigns/${campaignId}/accounts`, { accountIds });
    return response.data;
  },

  async removeAccount(campaignId: string, accountId: string): Promise<void> {
    await api.delete(`/abm/campaigns/${campaignId}/accounts/${accountId}`);
  },

  async trackEngagement(
    campaignId: string,
    accountId: string,
    eventType: string,
    metadata?: Record<string, any>
  ): Promise<ABMAccountEngagement> {
    const response = await api.post(`/abm/campaigns/${campaignId}/accounts/${accountId}/engagement`, { eventType, metadata });
    return response.data;
  },

  async updateEngagementStage(campaignId: string, accountId: string, stage: string): Promise<ABMAccountEngagement> {
    const response = await api.put(`/abm/campaigns/${campaignId}/accounts/${accountId}/stage`, { stage });
    return response.data;
  },

  async getCampaignAnalytics(campaignId: string): Promise<any> {
    const response = await api.get(`/abm/campaigns/${campaignId}/analytics`);
    return response.data;
  },

  async getTargetAccountRecommendations(limit = 20): Promise<any[]> {
    const response = await api.get(`/abm/recommendations?limit=${limit}`);
    return response.data;
  },
};
