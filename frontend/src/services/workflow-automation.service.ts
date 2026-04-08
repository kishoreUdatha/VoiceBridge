/**
 * Workflow Automation Service
 * Handles visual workflow creation and execution
 */

import api from './api';

export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, any>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
}

export interface WorkflowDefinition {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  category?: 'LEAD_MANAGEMENT' | 'SALES_AUTOMATION' | 'SUPPORT' | 'MARKETING' | 'CUSTOM';
  triggerType: 'MANUAL' | 'LEAD_CREATED' | 'LEAD_UPDATED' | 'STAGE_CHANGED' | 'SCORE_CHANGED' |
               'TIME_BASED' | 'WEBHOOK' | 'FORM_SUBMITTED' | 'CALL_COMPLETED' | 'EMAIL_OPENED';
  triggerConfig?: Record<string, any>;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  isActive: boolean;
  executionCount: number;
  lastExecutedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowExecution {
  id: string;
  workflowDefinitionId: string;
  entityId?: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  startedAt?: string;
  completedAt?: string;
  currentNodeId?: string;
  executionData?: Record<string, any>;
  errorMessage?: string;
  steps?: WorkflowExecutionStep[];
}

export interface WorkflowExecutionStep {
  id: string;
  nodeId: string;
  nodeType: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  startedAt?: string;
  completedAt?: string;
  inputData?: Record<string, any>;
  outputData?: Record<string, any>;
  errorMessage?: string;
}

export interface NodeType {
  type: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  configFields: { name: string; label: string; type: string; required: boolean; options?: string[] }[];
}

export interface TriggerType {
  type: string;
  name: string;
  description: string;
  configFields: { name: string; label: string; type: string; required: boolean }[];
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  triggerType: string;
}

export interface WorkflowConfig {
  name: string;
  description?: string;
  category?: string;
  triggerType: string;
  triggerConfig?: Record<string, any>;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

const workflowAutomationService = {
  // Get all workflows
  async getWorkflows(): Promise<WorkflowDefinition[]> {
    const response = await api.get('/workflows');
    return response.data;
  },

  // Get single workflow
  async getWorkflow(id: string): Promise<WorkflowDefinition> {
    const response = await api.get(`/workflows/${id}`);
    return response.data;
  },

  // Create workflow
  async createWorkflow(config: WorkflowConfig): Promise<WorkflowDefinition> {
    const response = await api.post('/workflows', config);
    return response.data;
  },

  // Update workflow
  async updateWorkflow(id: string, config: Partial<WorkflowConfig>): Promise<WorkflowDefinition> {
    const response = await api.put(`/workflows/${id}`, config);
    return response.data;
  },

  // Delete workflow
  async deleteWorkflow(id: string): Promise<void> {
    await api.delete(`/workflows/${id}`);
  },

  // Toggle workflow active status
  async toggleWorkflow(id: string): Promise<WorkflowDefinition> {
    const response = await api.patch(`/workflows/${id}/toggle`);
    return response.data;
  },

  // Manually trigger workflow
  async triggerWorkflow(id: string, entityId: string, data?: Record<string, any>): Promise<WorkflowExecution> {
    const response = await api.post(`/workflows/${id}/trigger`, { entityId, data });
    return response.data;
  },

  // Get workflow executions
  async getExecutions(workflowId: string, limit = 50): Promise<WorkflowExecution[]> {
    const response = await api.get(`/workflows/${workflowId}/executions`, {
      params: { limit },
    });
    return response.data;
  },

  // Get single execution with steps
  async getExecutionDetails(executionId: string): Promise<WorkflowExecution> {
    const response = await api.get(`/workflows/executions/${executionId}`);
    return response.data;
  },

  // Get workflow templates
  async getTemplates(): Promise<WorkflowTemplate[]> {
    const response = await api.get('/workflows/meta/templates');
    return response.data;
  },

  // Get available node types
  async getNodeTypes(): Promise<NodeType[]> {
    const response = await api.get('/workflows/meta/node-types');
    return response.data;
  },

  // Get trigger types
  async getTriggerTypes(): Promise<TriggerType[]> {
    const response = await api.get('/workflows/meta/trigger-types');
    return response.data;
  },
};

export default workflowAutomationService;
