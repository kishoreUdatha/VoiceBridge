/**
 * Report Builder Service
 * Handles custom report creation, scheduling, and execution
 */

import api from './api';

export interface ColumnDefinition {
  field: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  format?: string;
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
}

export interface FilterCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in' | 'between';
  value: any;
}

export interface ReportDefinition {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  type: 'TABLE' | 'CHART' | 'PIVOT' | 'SUMMARY' | 'DASHBOARD';
  category?: string;
  dataSource: string;
  columns: ColumnDefinition[];
  filters?: FilterCondition[];
  groupBy?: string[];
  sortBy?: { field: string; direction: 'asc' | 'desc' }[];
  aggregations?: { field: string; type: string }[];
  chartConfig?: Record<string, any>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  schedules?: ReportSchedule[];
  _count?: { executions: number };
}

export interface ReportSchedule {
  id: string;
  reportDefinitionId: string;
  name: string;
  frequency: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
  dayOfWeek?: number;
  dayOfMonth?: number;
  timeOfDay: string;
  timezone?: string;
  deliveryMethod: 'EMAIL' | 'WEBHOOK' | 'SLACK' | 'DOWNLOAD';
  recipients: string[];
  format: 'PDF' | 'EXCEL' | 'CSV' | 'JSON';
  isActive: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
}

export interface ReportExecution {
  id: string;
  reportDefinitionId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  triggeredBy: string;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  rowCount?: number;
  errorMessage?: string;
  fileUrl?: string;
}

export interface DataSource {
  id: string;
  name: string;
  fields: { field: string; label: string; type: string }[];
}

export interface ReportConfig {
  name: string;
  description?: string;
  type: 'TABLE' | 'CHART' | 'PIVOT' | 'SUMMARY' | 'DASHBOARD';
  category?: string;
  dataSource: string;
  columns: ColumnDefinition[];
  filters?: FilterCondition[];
  groupBy?: string[];
  sortBy?: { field: string; direction: 'asc' | 'desc' }[];
  aggregations?: { field: string; type: string }[];
  chartConfig?: Record<string, any>;
}

export interface ScheduleConfig {
  name: string;
  frequency: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
  dayOfWeek?: number;
  dayOfMonth?: number;
  timeOfDay: string;
  timezone?: string;
  deliveryMethod: 'EMAIL' | 'WEBHOOK' | 'SLACK' | 'DOWNLOAD';
  recipients: string[];
  format: 'PDF' | 'EXCEL' | 'CSV' | 'JSON';
}

const reportBuilderService = {
  // Get all report definitions
  async getReportDefinitions(): Promise<ReportDefinition[]> {
    const response = await api.get('/reports/definitions');
    return response.data;
  },

  // Get single report definition
  async getReportDefinition(id: string): Promise<ReportDefinition> {
    const response = await api.get(`/reports/definitions/${id}`);
    return response.data;
  },

  // Create report definition
  async createReportDefinition(config: ReportConfig): Promise<ReportDefinition> {
    const response = await api.post('/reports/definitions', config);
    return response.data;
  },

  // Update report definition
  async updateReportDefinition(id: string, config: Partial<ReportConfig>): Promise<ReportDefinition> {
    const response = await api.put(`/reports/definitions/${id}`, config);
    return response.data;
  },

  // Delete report definition
  async deleteReportDefinition(id: string): Promise<void> {
    await api.delete(`/reports/definitions/${id}`);
  },

  // Create schedule
  async createSchedule(reportId: string, config: ScheduleConfig): Promise<ReportSchedule> {
    const response = await api.post(`/reports/definitions/${reportId}/schedules`, config);
    return response.data;
  },

  // Update schedule
  async updateSchedule(id: string, config: Partial<ScheduleConfig & { isActive?: boolean }>): Promise<ReportSchedule> {
    const response = await api.put(`/reports/schedules/${id}`, config);
    return response.data;
  },

  // Delete schedule
  async deleteSchedule(id: string): Promise<void> {
    await api.delete(`/reports/schedules/${id}`);
  },

  // Execute report
  async executeReport(reportId: string): Promise<{ execution: ReportExecution; data: any[] }> {
    const response = await api.post(`/reports/definitions/${reportId}/execute`);
    return response.data;
  },

  // Get execution history
  async getExecutionHistory(reportId: string, limit = 20): Promise<ReportExecution[]> {
    const response = await api.get(`/reports/definitions/${reportId}/executions`, {
      params: { limit },
    });
    return response.data;
  },

  // Get available data sources
  async getDataSources(): Promise<DataSource[]> {
    const response = await api.get('/reports/data-sources');
    return response.data;
  },
};

export default reportBuilderService;
