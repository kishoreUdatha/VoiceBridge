/**
 * Approval Workflow Service
 * API client for approval workflow management
 */

import api from './api';

export type ApprovalEntityType =
  | 'LEAD_CONVERSION'
  | 'PAYMENT'
  | 'ADMISSION'
  | 'DISCOUNT'
  | 'REFUND'
  | 'FEE_WAIVER'
  | 'COMMISSION'
  | 'QUOTATION'
  | 'CUSTOM';

export type ApproverType = 'ROLE' | 'SPECIFIC_USER' | 'MANAGER' | 'BRANCH_MANAGER';

export type ApprovalMode = 'ANY' | 'ALL';

export type ApprovalStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXPIRED';

export type ApprovalDecision = 'APPROVED' | 'REJECTED' | 'REQUEST_CHANGES' | 'ESCALATED';

export interface ApprovalStep {
  id?: string;
  stepOrder: number;
  name: string;
  description?: string;
  approverType: ApproverType;
  approverRoleId?: string;
  approverUserId?: string;
  approvalMode: ApprovalMode;
  autoApproveConditions?: Record<string, any>;
  slaHours?: number;
  escalateAfterHours?: number;
  escalateToUserId?: string;
  escalateToRoleId?: string;
  approverRole?: { id: string; name: string };
  approverUser?: { id: string; firstName: string; lastName: string };
}

export interface ApprovalWorkflow {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  entityType: ApprovalEntityType;
  conditions?: Record<string, any>;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  steps: ApprovalStep[];
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  _count?: {
    requests: number;
  };
}

export interface ApprovalAction {
  id: string;
  requestId: string;
  stepId: string;
  actorId: string;
  decision: ApprovalDecision;
  comments?: string;
  isAutoApproved: boolean;
  isEscalated: boolean;
  createdAt: string;
  actor?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  step?: ApprovalStep;
}

export interface ApprovalRequest {
  id: string;
  organizationId: string;
  workflowId: string;
  entityType: ApprovalEntityType;
  entityId: string;
  title: string;
  description?: string;
  amount?: number;
  metadata?: Record<string, any>;
  status: ApprovalStatus;
  currentStep: number;
  submittedAt: string;
  completedAt?: string;
  finalDecision?: ApprovalDecision;
  finalComments?: string;
  workflow?: ApprovalWorkflow;
  submittedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  decidedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  actions?: ApprovalAction[];
}

export interface CreateWorkflowInput {
  name: string;
  description?: string;
  entityType: ApprovalEntityType;
  conditions?: Record<string, any>;
  isDefault?: boolean;
  steps: Omit<ApprovalStep, 'id' | 'stepOrder'>[];
}

export interface SubmitApprovalInput {
  entityType: ApprovalEntityType;
  entityId: string;
  title: string;
  description?: string;
  amount?: number;
  metadata?: Record<string, any>;
  workflowId?: string;
}

export interface ApprovalStatistics {
  byStatus: Record<ApprovalStatus, number>;
  byEntityType: Record<ApprovalEntityType, number>;
  totalApprovedAmount: number;
}

export const approvalService = {
  // ==================== WORKFLOWS ====================

  async getWorkflows(entityType?: ApprovalEntityType): Promise<ApprovalWorkflow[]> {
    const params = entityType ? `?entityType=${entityType}` : '';
    const response = await api.get(`/approvals/workflows${params}`);
    return response.data.data;
  },

  async getWorkflow(id: string): Promise<ApprovalWorkflow> {
    const response = await api.get(`/approvals/workflows/${id}`);
    return response.data.data;
  },

  async createWorkflow(data: CreateWorkflowInput): Promise<ApprovalWorkflow> {
    const response = await api.post('/approvals/workflows', data);
    return response.data.data;
  },

  async updateWorkflow(id: string, data: Partial<CreateWorkflowInput>): Promise<ApprovalWorkflow> {
    const response = await api.put(`/approvals/workflows/${id}`, data);
    return response.data.data;
  },

  async deleteWorkflow(id: string): Promise<void> {
    await api.delete(`/approvals/workflows/${id}`);
  },

  // ==================== REQUESTS ====================

  async submitForApproval(data: SubmitApprovalInput): Promise<ApprovalRequest> {
    const response = await api.post('/approvals/requests', data);
    return response.data.data;
  },

  async getRequests(filters?: {
    status?: ApprovalStatus;
    entityType?: ApprovalEntityType;
    submittedById?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }): Promise<{ requests: ApprovalRequest[]; pagination: any }> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, String(value));
        }
      });
    }
    const response = await api.get(`/approvals/requests?${params.toString()}`);
    return {
      requests: response.data.data,
      pagination: response.data.pagination,
    };
  },

  async getRequest(id: string): Promise<ApprovalRequest> {
    const response = await api.get(`/approvals/requests/${id}`);
    return response.data.data;
  },

  async getPendingApprovals(): Promise<ApprovalRequest[]> {
    const response = await api.get('/approvals/pending');
    return response.data.data;
  },

  async getMyRequests(status?: ApprovalStatus): Promise<ApprovalRequest[]> {
    const params = status ? `?status=${status}` : '';
    const response = await api.get(`/approvals/my-requests${params}`);
    return response.data.data;
  },

  async takeAction(
    requestId: string,
    decision: ApprovalDecision,
    comments?: string
  ): Promise<ApprovalRequest> {
    const response = await api.post(`/approvals/requests/${requestId}/action`, {
      decision,
      comments,
    });
    return response.data.data;
  },

  async cancelRequest(requestId: string): Promise<ApprovalRequest> {
    const response = await api.post(`/approvals/requests/${requestId}/cancel`);
    return response.data.data;
  },

  async getStatistics(dateFrom?: string, dateTo?: string): Promise<ApprovalStatistics> {
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    const response = await api.get(`/approvals/statistics?${params.toString()}`);
    return response.data.data;
  },
};
