/**
 * Pipeline Kanban Service
 * Handles visual pipeline management with drag-drop
 */

import api from './api';

export interface CardFieldConfig {
  field: string;
  label: string;
  type: 'text' | 'badge' | 'currency' | 'date' | 'avatar';
}

export interface PipelineColumn {
  id: string;
  pipelineViewId: string;
  name: string;
  stageValue: string;
  position: number;
  color?: string;
  icon?: string;
  autoActions?: Record<string, any>;
  wipLimit?: number;
  leads?: KanbanCard[];
  count?: number;
}

export interface PipelineView {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  type: 'KANBAN' | 'LIST' | 'TIMELINE';
  entityType: string;
  stageField: string;
  cardFields: CardFieldConfig[];
  cardColorField?: string;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  filters?: Record<string, any>;
  isDefault: boolean;
  columns: PipelineColumn[];
  createdAt: string;
  updatedAt: string;
}

export interface KanbanCard {
  id: string;
  title: string;
  subtitle?: string;
  assignee?: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  velocity?: {
    daysInStage: number;
    isStalled: boolean;
    velocityScore?: number;
  };
  [key: string]: any;
}

export interface PipelineStats {
  columns: {
    columnId: string;
    columnName: string;
    stageValue: string;
    count: number;
    totalValue: number;
    wipLimit?: number;
    overLimit: boolean;
  }[];
  totalLeads: number;
  totalValue: number;
  avgDaysPerStage?: number;
  avgVelocityScore?: number;
  stalledDeals: number;
}

export interface StalledDeal {
  id: string;
  leadId: string;
  currentStage: string;
  stageEnteredAt: string;
  stalledDays: number;
  lead: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface PipelineViewConfig {
  name: string;
  description?: string;
  type?: 'KANBAN' | 'LIST' | 'TIMELINE';
  entityType?: string;
  stageField?: string;
  cardFields: CardFieldConfig[];
  cardColorField?: string;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

export interface ColumnConfig {
  name: string;
  stageValue: string;
  position: number;
  color?: string;
  icon?: string;
  autoActions?: Record<string, any>;
  wipLimit?: number;
}

const pipelineKanbanService = {
  // Get all pipeline views
  async getPipelineViews(): Promise<PipelineView[]> {
    const response = await api.get('/pipeline/views');
    return response.data;
  },

  // Get single pipeline view with data
  async getPipelineView(id: string): Promise<PipelineView> {
    const response = await api.get(`/pipeline/views/${id}`);
    return response.data;
  },

  // Create pipeline view
  async createPipelineView(config: PipelineViewConfig): Promise<PipelineView> {
    const response = await api.post('/pipeline/views', config);
    return response.data;
  },

  // Update pipeline view
  async updatePipelineView(id: string, config: Partial<PipelineViewConfig>): Promise<PipelineView> {
    const response = await api.put(`/pipeline/views/${id}`, config);
    return response.data;
  },

  // Delete pipeline view
  async deletePipelineView(id: string): Promise<void> {
    await api.delete(`/pipeline/views/${id}`);
  },

  // Create column
  async createColumn(viewId: string, config: ColumnConfig): Promise<PipelineColumn> {
    const response = await api.post(`/pipeline/views/${viewId}/columns`, config);
    return response.data;
  },

  // Update column
  async updateColumn(id: string, config: Partial<ColumnConfig>): Promise<PipelineColumn> {
    const response = await api.put(`/pipeline/columns/${id}`, config);
    return response.data;
  },

  // Reorder columns
  async reorderColumns(viewId: string, columnIds: string[]): Promise<void> {
    await api.post(`/pipeline/views/${viewId}/columns/reorder`, { columnIds });
  },

  // Delete column
  async deleteColumn(id: string): Promise<void> {
    await api.delete(`/pipeline/columns/${id}`);
  },

  // Move card (lead) to different column
  async moveCard(
    viewId: string,
    leadId: string,
    sourceColumn: string,
    targetColumn: string
  ): Promise<any> {
    const response = await api.post(`/pipeline/views/${viewId}/move-card`, {
      leadId,
      sourceColumn,
      targetColumn,
    });
    return response.data;
  },

  // Get pipeline statistics
  async getPipelineStats(viewId: string): Promise<PipelineStats> {
    const response = await api.get(`/pipeline/views/${viewId}/stats`);
    return response.data;
  },

  // Detect stalled deals
  async getStalledDeals(threshold = 7): Promise<StalledDeal[]> {
    const response = await api.get('/pipeline/stalled-deals', {
      params: { threshold },
    });
    return response.data;
  },

  // Get default card fields
  async getDefaultCardFields(): Promise<CardFieldConfig[]> {
    const response = await api.get('/pipeline/meta/card-fields');
    return response.data;
  },
};

export default pipelineKanbanService;
