/**
 * Sales Playbook Service
 */

import api from './api';

export interface SalesPlaybook {
  id: string;
  name: string;
  description?: string;
  type: 'SALES_PROCESS' | 'OBJECTION_HANDLING' | 'COMPETITOR_BATTLE_CARD' | 'BEST_PRACTICES';
  stages?: PlaybookStage[];
  objections?: ObjectionHandler[];
  battleCards?: BattleCard[];
  tips?: string[];
  targetRole?: string;
  industry?: string;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
}

export interface PlaybookStage {
  name: string;
  description?: string;
  order: number;
  activities: string[];
  exitCriteria?: string[];
  resources?: string[];
}

export interface ObjectionHandler {
  objection: string;
  response: string;
  category?: string;
  examples?: string[];
}

export interface BattleCard {
  competitor: string;
  strengths: string[];
  weaknesses: string[];
  ourAdvantages: string[];
  talkingPoints: string[];
}

export const salesPlaybookService = {
  async getPlaybooks(filters?: { type?: string; isActive?: boolean }): Promise<SalesPlaybook[]> {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive));

    const response = await api.get(`/playbooks?${params.toString()}`);
    return response.data;
  },

  async getPlaybook(id: string): Promise<SalesPlaybook> {
    const response = await api.get(`/playbooks/${id}`);
    return response.data;
  },

  async createPlaybook(data: Partial<SalesPlaybook>): Promise<SalesPlaybook> {
    const response = await api.post('/playbooks', data);
    return response.data;
  },

  async updatePlaybook(id: string, data: Partial<SalesPlaybook>): Promise<SalesPlaybook> {
    const response = await api.put(`/playbooks/${id}`, data);
    return response.data;
  },

  async deletePlaybook(id: string): Promise<void> {
    await api.delete(`/playbooks/${id}`);
  },

  async trackUsage(playbookId: string): Promise<void> {
    await api.post(`/playbooks/${playbookId}/usage`, {});
  },

  async getRecommendedPlaybooks(context: {
    leadStage?: string;
    dealSize?: number;
    industry?: string;
  }): Promise<SalesPlaybook[]> {
    const response = await api.post('/playbooks/recommend', context);
    return response.data;
  },
};
