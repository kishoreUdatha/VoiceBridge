/**
 * Customer Journey Service
 */

import api from './api';

export interface JourneyTemplate {
  id: string;
  name: string;
  description?: string;
  stages: JourneyStage[];
  triggers?: Record<string, any>;
  exitCriteria?: Record<string, any>;
  isActive: boolean;
  createdAt: string;
}

export interface JourneyStage {
  name: string;
  description?: string;
  order: number;
  expectedDays?: number;
  touchpoints?: {
    type: string;
    channel?: string;
    content?: string;
    delayDays?: number;
  }[];
}

export interface CustomerJourney {
  id: string;
  templateId: string;
  leadId?: string;
  accountId?: string;
  contactId?: string;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'EXITED';
  currentStage: string;
  stageEnteredAt: string;
  startedAt: string;
  completedAt?: string;
  exitReason?: string;
  template?: JourneyTemplate;
  touchpoints?: JourneyTouchpoint[];
  _count?: { touchpoints: number };
}

export interface JourneyTouchpoint {
  id: string;
  journeyId: string;
  stageName: string;
  type: string;
  channel?: string;
  content?: any;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED' | 'FAILED';
  scheduledAt: string;
  completedAt?: string;
  outcome?: string;
  response?: any;
  sentiment?: string;
  order: number;
}

export const customerJourneyService = {
  // Templates
  async getTemplates(): Promise<JourneyTemplate[]> {
    const response = await api.get('/journeys/templates');
    return response.data;
  },

  async getTemplate(id: string): Promise<JourneyTemplate> {
    const response = await api.get(`/journeys/templates/${id}`);
    return response.data;
  },

  async createTemplate(data: Partial<JourneyTemplate>): Promise<JourneyTemplate> {
    const response = await api.post('/journeys/templates', data);
    return response.data;
  },

  async updateTemplate(id: string, data: Partial<JourneyTemplate>): Promise<JourneyTemplate> {
    const response = await api.put(`/journeys/templates/${id}`, data);
    return response.data;
  },

  // Journeys
  async getJourneys(filters?: {
    status?: string;
    templateId?: string;
    leadId?: string;
    accountId?: string;
    limit?: number;
  }): Promise<CustomerJourney[]> {
    const params = new URLSearchParams();
    Object.entries(filters || {}).forEach(([key, value]) => {
      if (value) params.append(key, String(value));
    });

    const response = await api.get(`/journeys?${params.toString()}`);
    return response.data;
  },

  async getJourney(id: string): Promise<CustomerJourney> {
    const response = await api.get(`/journeys/${id}`);
    return response.data;
  },

  async startJourney(templateId: string, data: {
    leadId?: string;
    accountId?: string;
    contactId?: string;
  }): Promise<CustomerJourney> {
    const response = await api.post('/journeys/start', { templateId, ...data });
    return response.data;
  },

  async advanceStage(journeyId: string): Promise<CustomerJourney> {
    const response = await api.post(`/journeys/${journeyId}/advance`, {});
    return response.data;
  },

  async pauseJourney(journeyId: string): Promise<CustomerJourney> {
    const response = await api.post(`/journeys/${journeyId}/pause`, {});
    return response.data;
  },

  async resumeJourney(journeyId: string): Promise<CustomerJourney> {
    const response = await api.post(`/journeys/${journeyId}/resume`, {});
    return response.data;
  },

  async exitJourney(journeyId: string, reason: string): Promise<CustomerJourney> {
    const response = await api.post(`/journeys/${journeyId}/exit`, { reason });
    return response.data;
  },

  // Touchpoints
  async completeTouchpoint(touchpointId: string, outcome: string, response?: any, sentiment?: string): Promise<JourneyTouchpoint> {
    const res = await api.post(`/journeys/touchpoints/${touchpointId}/complete`, { outcome, response, sentiment });
    return res.data;
  },

  async skipTouchpoint(touchpointId: string, reason: string): Promise<JourneyTouchpoint> {
    const response = await api.post(`/journeys/touchpoints/${touchpointId}/skip`, { reason });
    return response.data;
  },

  async getPendingTouchpoints(): Promise<JourneyTouchpoint[]> {
    const response = await api.get('/journeys/touchpoints/pending');
    return response.data;
  },

  // Analytics
  async getJourneyAnalytics(templateId?: string): Promise<any> {
    const params = templateId ? `?templateId=${templateId}` : '';
    const response = await api.get(`/journeys/analytics${params}`);
    return response.data;
  },
};
