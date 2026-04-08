/**
 * Export & BI Service
 */

import api from './api';

export interface ExportJob {
  id: string;
  name: string;
  entity: string;
  format: 'CSV' | 'EXCEL' | 'JSON' | 'PDF';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  filters?: Record<string, any>;
  fields?: string[];
  includeRelations?: string[];
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time?: string;
    dayOfWeek?: number;
    dayOfMonth?: number;
    recipients?: string[];
  };
  fileUrl?: string;
  fileSize?: number;
  rowCount?: number;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  createdById?: string;
}

export interface BIConnector {
  id: string;
  provider: 'POWER_BI' | 'TABLEAU' | 'LOOKER' | 'METABASE' | 'GOOGLE_DATA_STUDIO';
  name: string;
  status: 'PENDING' | 'CONNECTED' | 'ERROR' | 'DISCONNECTED';
  syncTables?: string[];
  syncSchedule?: string;
  lastSyncAt?: string;
  errorMessage?: string;
  createdAt: string;
}

export interface ExecutiveDashboard {
  leads: { stage: string; _count: number }[];
  opportunities: { wonCount: number; wonValue: number };
  calls: { total: number; totalDuration: number };
  tickets: { status: string; _count: number }[];
  activeContractValue: number;
}

export interface ConversionFunnel {
  stage: string;
  count: number;
  conversionRate: number;
}

export interface SalesVelocity {
  velocity: number;
  avgDealSize: number;
  avgCycleTime: number;
  winRate: number;
  dealsWon: number;
}

export const exportBIService = {
  // Exports
  async getExportJobs(filters?: { status?: string; entity?: string; limit?: number }): Promise<ExportJob[]> {
    const params = new URLSearchParams();
    Object.entries(filters || {}).forEach(([key, value]) => {
      if (value) params.append(key, String(value));
    });

    const response = await api.get(`/export-bi/exports?${params.toString()}`);
    return response.data;
  },

  async createExportJob(data: Partial<ExportJob>): Promise<ExportJob> {
    const response = await api.post('/export-bi/exports', data);
    return response.data;
  },

  async executeExport(jobId: string): Promise<ExportJob> {
    const response = await api.post(`/export-bi/exports/${jobId}/execute`, {});
    return response.data;
  },

  // BI Connectors
  async getBIConnectors(): Promise<BIConnector[]> {
    const response = await api.get('/export-bi/connectors');
    return response.data;
  },

  async createBIConnector(data: {
    provider: string;
    name: string;
    credentials: Record<string, string>;
    syncTables?: string[];
    syncSchedule?: string;
  }): Promise<BIConnector> {
    const response = await api.post('/export-bi/connectors', data);
    return response.data;
  },

  async updateBIConnector(id: string, data: Partial<BIConnector>): Promise<BIConnector> {
    const response = await api.put(`/export-bi/connectors/${id}`, data);
    return response.data;
  },

  async testBIConnection(id: string): Promise<{ success: boolean; error?: string }> {
    const response = await api.post(`/export-bi/connectors/${id}/test`, {});
    return response.data;
  },

  async syncBIConnector(id: string): Promise<{ success: boolean; tablesSync: number }> {
    const response = await api.post(`/export-bi/connectors/${id}/sync`, {});
    return response.data;
  },

  async deleteBIConnector(id: string): Promise<void> {
    await api.delete(`/export-bi/connectors/${id}`);
  },

  // Analytics
  async getExecutiveDashboard(dateRange?: { startDate: string; endDate: string }): Promise<ExecutiveDashboard> {
    const params = new URLSearchParams();
    if (dateRange) {
      params.append('startDate', dateRange.startDate);
      params.append('endDate', dateRange.endDate);
    }

    const response = await api.get(`/export-bi/analytics/dashboard?${params.toString()}`);
    return response.data;
  },

  async getConversionFunnel(dateRange?: { startDate: string; endDate: string }): Promise<ConversionFunnel[]> {
    const params = new URLSearchParams();
    if (dateRange) {
      params.append('startDate', dateRange.startDate);
      params.append('endDate', dateRange.endDate);
    }

    const response = await api.get(`/export-bi/analytics/funnel?${params.toString()}`);
    return response.data;
  },

  async getSalesVelocity(): Promise<SalesVelocity> {
    const response = await api.get('/export-bi/analytics/velocity');
    return response.data;
  },

  async getActivityTrends(days = 30): Promise<{ date: string; calls: number; leads: number }[]> {
    const response = await api.get(`/export-bi/analytics/trends?days=${days}`);
    return response.data;
  },
};
