import api from '../api';

export type DealStage =
  | 'PROSPECTING'
  | 'FIRST_MEETING'
  | 'NEEDS_ANALYSIS'
  | 'PROPOSAL_SENT'
  | 'NEGOTIATION'
  | 'DECISION_PENDING'
  | 'WON'
  | 'LOST'
  | 'ON_HOLD';

export interface StageHistoryEntry {
  stage: DealStage;
  previousStage?: DealStage;
  changedAt: string;
  changedBy: string;
  reason?: string;
}

export interface Deal {
  id: string;
  collegeId: string;
  organizationId: string;
  ownerId: string;
  dealName: string;
  description?: string;
  products?: string[];
  dealValue?: number;
  stage: DealStage;
  probability: number;
  expectedCloseDate?: string;
  actualCloseDate?: string;
  wonLostReason?: string;
  competitorWon?: string;
  stageHistory?: StageHistoryEntry[];
  createdAt: string;
  updatedAt: string;
  college?: {
    id: string;
    name: string;
    city: string;
  };
  owner?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  };
}

export interface DealFilter {
  ownerId?: string;
  stage?: DealStage;
  minValue?: number;
  maxValue?: number;
}

export interface CreateDealData {
  collegeId: string;
  ownerId?: string;
  dealName?: string;
  description?: string;
  products?: string[];
  dealValue?: number;
  stage?: DealStage;
  expectedCloseDate?: string;
}

export interface UpdateDealData {
  description?: string;
  products?: string[];
  dealValue?: number;
  expectedCloseDate?: string;
  wonLostReason?: string;
  competitorWon?: string;
}

export interface PipelineStageData {
  count: number;
  value: number;
  weightedValue: number;
}

export interface Pipeline {
  pipeline: Record<string, Deal[]>;
  totals: Record<string, PipelineStageData>;
}

export interface DealStats {
  totalDeals: number;
  openDeals: number;
  wonDeals: number;
  lostDeals: number;
  winRate: number;
  totalPipelineValue: number;
  wonValue: number;
}

export const dealService = {
  async getDeals(
    filter: DealFilter = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{ deals: Deal[]; total: number }> {
    const response = await api.get('/field-sales/deals', {
      params: { ...filter, page, limit },
    });
    return {
      deals: response.data.data,
      total: response.data.pagination.total,
    };
  },

  async getDealById(id: string): Promise<Deal> {
    const response = await api.get(`/field-sales/deals/${id}`);
    return response.data.data;
  },

  async getDealByCollegeId(collegeId: string): Promise<Deal | null> {
    const response = await api.get(`/field-sales/deals/college/${collegeId}`);
    return response.data.data;
  },

  async createDeal(data: CreateDealData): Promise<Deal> {
    const response = await api.post('/field-sales/deals', data);
    return response.data.data;
  },

  async updateDeal(id: string, data: UpdateDealData): Promise<Deal> {
    const response = await api.put(`/field-sales/deals/${id}`, data);
    return response.data.data;
  },

  async updateStage(id: string, stage: DealStage, reason?: string): Promise<Deal> {
    const response = await api.post(`/field-sales/deals/${id}/stage`, { stage, reason });
    return response.data.data;
  },

  async deleteDeal(id: string): Promise<void> {
    await api.delete(`/field-sales/deals/${id}`);
  },

  async getPipeline(ownerId?: string): Promise<Pipeline> {
    const response = await api.get('/field-sales/deals/pipeline', {
      params: ownerId ? { ownerId } : {},
    });
    return response.data.data;
  },

  async getDealStats(ownerId?: string, startDate?: string, endDate?: string): Promise<DealStats> {
    const response = await api.get('/field-sales/deals/stats', {
      params: { ownerId, startDate, endDate },
    });
    return response.data.data;
  },

  async getRecentWins(limit: number = 5): Promise<Deal[]> {
    const response = await api.get('/field-sales/deals/recent-wins', {
      params: { limit },
    });
    return response.data.data;
  },
};
