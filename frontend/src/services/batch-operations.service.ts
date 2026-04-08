/**
 * Batch Operations Service
 * Handles bulk operations on leads with audit trail and rollback
 */

import api from './api';

export type BatchOperationType =
  | 'UPDATE_FIELD'
  | 'UPDATE_STAGE'
  | 'ASSIGN_USER'
  | 'ASSIGN_TEAM'
  | 'ADD_TAGS'
  | 'REMOVE_TAGS'
  | 'DELETE'
  | 'SEND_EMAIL'
  | 'SEND_SMS'
  | 'SEND_WHATSAPP'
  | 'ADD_TO_CAMPAIGN'
  | 'REMOVE_FROM_CAMPAIGN';

export type SelectionType = 'SELECTED' | 'FILTERED' | 'ALL';

export type BatchOperationStatus = 'PENDING' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'ROLLED_BACK';

export type BatchItemStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'SKIPPED';

export interface BatchOperation {
  id: string;
  organizationId: string;
  name: string;
  type: BatchOperationType;
  entityType: string;
  selectionType: SelectionType;
  selectionFilters?: Record<string, any>;
  selectedIds?: string[];
  totalCount: number;
  processedCount: number;
  successCount: number;
  failedCount: number;
  status: BatchOperationStatus;
  operationData: Record<string, any>;
  canRollback: boolean;
  rollbackData?: any[];
  startedAt?: string;
  completedAt?: string;
  rolledBackAt?: string;
  createdAt: string;
  items?: BatchOperationItem[];
}

export interface BatchOperationItem {
  id: string;
  batchOperationId: string;
  entityId: string;
  status: BatchItemStatus;
  beforeData?: Record<string, any>;
  afterData?: Record<string, any>;
  errorMessage?: string;
  processedAt?: string;
}

export interface OperationTypeInfo {
  type: BatchOperationType;
  name: string;
  description: string;
  canRollback: boolean;
}

export interface BatchOperationConfig {
  name?: string;
  type: BatchOperationType;
  entityType?: string;
  selectionType: SelectionType;
  selectionFilters?: Record<string, any>;
  selectedIds?: string[];
  operationData: Record<string, any>;
}

const batchOperationsService = {
  // Get all batch operations
  async getBatchOperations(limit = 50): Promise<BatchOperation[]> {
    const response = await api.get('/batch-operations', {
      params: { limit },
    });
    return response.data;
  },

  // Get single batch operation with items
  async getBatchOperation(id: string): Promise<BatchOperation> {
    const response = await api.get(`/batch-operations/${id}`);
    return response.data;
  },

  // Create and start batch operation
  async createBatchOperation(config: BatchOperationConfig): Promise<BatchOperation> {
    const response = await api.post('/batch-operations', config);
    return response.data;
  },

  // Rollback batch operation
  async rollbackBatchOperation(id: string): Promise<{ rolledBack: number }> {
    const response = await api.post(`/batch-operations/${id}/rollback`);
    return response.data;
  },

  // Pause batch operation
  async pauseBatchOperation(id: string): Promise<BatchOperation> {
    const response = await api.post(`/batch-operations/${id}/pause`);
    return response.data;
  },

  // Resume batch operation
  async resumeBatchOperation(id: string): Promise<{ resumed: boolean }> {
    const response = await api.post(`/batch-operations/${id}/resume`);
    return response.data;
  },

  // Cancel batch operation
  async cancelBatchOperation(id: string): Promise<BatchOperation> {
    const response = await api.post(`/batch-operations/${id}/cancel`);
    return response.data;
  },

  // Get operation types
  async getOperationTypes(): Promise<OperationTypeInfo[]> {
    const response = await api.get('/batch-operations/meta/operation-types');
    return response.data;
  },
};

export default batchOperationsService;
