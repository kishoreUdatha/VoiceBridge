/**
 * Social CRM Service
 */

import api from './api';

export interface SocialProfile {
  id: string;
  leadId?: string;
  contactId?: string;
  accountId?: string;
  platform: 'FACEBOOK' | 'TWITTER' | 'LINKEDIN' | 'INSTAGRAM';
  profileUrl: string;
  username?: string;
  followers?: number;
  following?: number;
  bio?: string;
  location?: string;
  isVerified: boolean;
  lastActivity?: string;
  engagementRate?: number;
  createdAt: string;
}

export interface SocialMention {
  id: string;
  platform: 'FACEBOOK' | 'TWITTER' | 'LINKEDIN' | 'INSTAGRAM';
  profileId?: string;
  content: string;
  author: string;
  authorProfileUrl?: string;
  postUrl?: string;
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  engagementScore: number;
  likes: number;
  shares: number;
  comments: number;
  mentionedAt: string;
  isResponded: boolean;
  respondedAt?: string;
  respondedBy?: string;
  response?: string;
  leadId?: string;
  createdAt: string;
}

export interface SocialCampaign {
  id: string;
  name: string;
  description?: string;
  platforms: string[];
  hashtags?: string[];
  keywords?: string[];
  startDate: string;
  endDate?: string;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  mentionsCount: number;
  positiveSentiment: number;
  negativeSentiment: number;
  neutralSentiment: number;
  totalReach: number;
  createdAt: string;
}

export const socialCrmService = {
  // Profiles
  async getProfiles(filters?: { platform?: string; leadId?: string }): Promise<SocialProfile[]> {
    const params = new URLSearchParams();
    if (filters?.platform) params.append('platform', filters.platform);
    if (filters?.leadId) params.append('leadId', filters.leadId);

    const response = await api.get(`/social/profiles?${params.toString()}`);
    return response.data;
  },

  async addProfile(data: Partial<SocialProfile>): Promise<SocialProfile> {
    const response = await api.post('/social/profiles', data);
    return response.data;
  },

  async syncProfile(profileId: string): Promise<SocialProfile> {
    const response = await api.post(`/social/profiles/${profileId}/sync`, {});
    return response.data;
  },

  // Mentions
  async getMentions(filters?: {
    platform?: string;
    sentiment?: string;
    isResponded?: boolean;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<SocialMention[]> {
    const params = new URLSearchParams();
    Object.entries(filters || {}).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, String(value));
    });

    const response = await api.get(`/social/mentions?${params.toString()}`);
    return response.data;
  },

  async respondToMention(mentionId: string, response: string): Promise<SocialMention> {
    const res = await api.post(`/social/mentions/${mentionId}/respond`, { response });
    return res.data;
  },

  async flagMention(mentionId: string, reason: string): Promise<void> {
    await api.post(`/social/mentions/${mentionId}/flag`, { reason });
  },

  // Campaigns
  async getCampaigns(status?: string): Promise<SocialCampaign[]> {
    const params = status ? `?status=${status}` : '';
    const response = await api.get(`/social/campaigns${params}`);
    return response.data;
  },

  async createCampaign(data: Partial<SocialCampaign>): Promise<SocialCampaign> {
    const response = await api.post('/social/campaigns', data);
    return response.data;
  },

  async updateCampaign(id: string, data: Partial<SocialCampaign>): Promise<SocialCampaign> {
    const response = await api.put(`/social/campaigns/${id}`, data);
    return response.data;
  },

  // Analytics
  async getSocialAnalytics(dateRange?: { startDate: string; endDate: string }): Promise<any> {
    const params = dateRange
      ? `?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
      : '';
    const response = await api.get(`/social/analytics${params}`);
    return response.data;
  },

  async getSentimentTrends(days = 30): Promise<any> {
    const response = await api.get(`/social/analytics/sentiment?days=${days}`);
    return response.data;
  },
};
