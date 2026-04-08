/**
 * Workflow Automation Service
 * Handles visual workflow creation, execution, and management
 */

import { PrismaClient, WorkflowCategory, WorkflowTriggerType, WorkflowExecutionStatus, WorkflowStepStatus } from '@prisma/client';

const prisma = new PrismaClient();

interface WorkflowNode {
  id: string;
  type: string;
  name: string;
  config: Record<string, any>;
  position: { x: number; y: number };
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  condition?: {
    field: string;
    operator: string;
    value: any;
  };
}

interface WorkflowConfig {
  name: string;
  description?: string;
  category: WorkflowCategory;
  triggerType: WorkflowTriggerType;
  triggerConfig?: Record<string, any>;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables?: Record<string, any>;
}

// Node type handlers
const nodeHandlers: Record<string, (context: any, config: any) => Promise<any>> = {
  // Conditions
  'condition': async (context, config) => {
    const { field, operator, value } = config;
    const fieldValue = getNestedValue(context, field);

    switch (operator) {
      case 'equals': return fieldValue === value;
      case 'not_equals': return fieldValue !== value;
      case 'contains': return String(fieldValue).includes(value);
      case 'greater_than': return fieldValue > value;
      case 'less_than': return fieldValue < value;
      case 'is_empty': return !fieldValue;
      case 'is_not_empty': return !!fieldValue;
      default: return false;
    }
  },

  // Actions
  'update_lead': async (context, config) => {
    const { leadId, updates } = config;
    const id = leadId || context.entityId;

    if (id) {
      await prisma.lead.update({
        where: { id },
        data: updates,
      });
    }
    return { updated: true, leadId: id };
  },

  'assign_user': async (context, config) => {
    const { leadId, userId, assignmentType } = config;
    const id = leadId || context.entityId;

    if (id && userId) {
      await prisma.leadAssignment.create({
        data: {
          leadId: id,
          userId,
          type: assignmentType || 'PRIMARY',
        },
      });
    }
    return { assigned: true, leadId: id, userId };
  },

  'send_email': async (context, config) => {
    const { to, subject, body, templateId } = config;
    // In production, integrate with email service
    console.log('Sending email:', { to, subject });
    return { sent: true, to };
  },

  'send_sms': async (context, config) => {
    const { to, message, templateId } = config;
    // In production, integrate with SMS service
    console.log('Sending SMS:', { to, message });
    return { sent: true, to };
  },

  'send_whatsapp': async (context, config) => {
    const { to, message, templateId } = config;
    // In production, integrate with WhatsApp service
    console.log('Sending WhatsApp:', { to, message });
    return { sent: true, to };
  },

  'create_task': async (context, config) => {
    const { leadId, title, description, dueDate, assigneeId } = config;
    const id = leadId || context.entityId;

    if (id) {
      const task = await prisma.leadTask.create({
        data: {
          leadId: id,
          title,
          description,
          dueDate: dueDate ? new Date(dueDate) : null,
          assignedToId: assigneeId || context.triggeredBy,
          status: 'PENDING',
          createdById: context.triggeredBy || '',
        },
      });
      return { created: true, taskId: task.id };
    }
    return { created: false };
  },

  'schedule_call': async (context, config) => {
    const { leadId, scheduledAt, userId, notes } = config;
    const id = leadId || context.entityId;

    if (id) {
      const call = await prisma.scheduledCall.create({
        data: {
          leadId: id,
          organizationId: context.organizationId,
          userId: userId || context.triggeredBy,
          scheduledAt: new Date(scheduledAt),
          notes,
          status: 'SCHEDULED',
        },
      });
      return { scheduled: true, callId: call.id };
    }
    return { scheduled: false };
  },

  'add_tag': async (context, config) => {
    const { leadId, tagId } = config;
    const id = leadId || context.entityId;

    if (id && tagId) {
      await prisma.leadTagAssignment.create({
        data: {
          leadId: id,
          tagId,
        },
      });
      return { tagged: true };
    }
    return { tagged: false };
  },

  'wait': async (context, config) => {
    const { duration, unit } = config;
    // In production, this would pause execution and resume later
    const waitMs = duration * (unit === 'hours' ? 3600000 : unit === 'days' ? 86400000 : 60000);
    return { waitUntil: new Date(Date.now() + waitMs) };
  },

  'webhook': async (context, config) => {
    const { url, method, headers, body } = config;
    // In production, make HTTP request
    console.log('Calling webhook:', { url, method });
    return { called: true, url };
  },

  'delay': async (context, config) => {
    return { delayed: true };
  },
};

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
}

export const workflowAutomationService = {
  // Get all workflows
  async getWorkflows(organizationId: string, category?: WorkflowCategory) {
    return prisma.workflowDefinition.findMany({
      where: {
        organizationId,
        isActive: true,
        ...(category && { category }),
      },
      include: {
        _count: {
          select: { executions: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  },

  // Get single workflow
  async getWorkflow(id: string) {
    return prisma.workflowDefinition.findUnique({
      where: { id },
      include: {
        executions: {
          take: 10,
          orderBy: { startedAt: 'desc' },
          include: {
            steps: {
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });
  },

  // Create workflow
  async createWorkflow(organizationId: string, userId: string, config: WorkflowConfig) {
    return prisma.workflowDefinition.create({
      data: {
        organizationId,
        name: config.name,
        description: config.description,
        category: config.category,
        triggerType: config.triggerType,
        triggerConfig: config.triggerConfig as any,
        nodes: config.nodes as any,
        edges: config.edges as any,
        variables: config.variables as any,
        createdById: userId,
      },
    });
  },

  // Update workflow
  async updateWorkflow(id: string, config: Partial<WorkflowConfig>) {
    const current = await prisma.workflowDefinition.findUnique({ where: { id } });

    return prisma.workflowDefinition.update({
      where: { id },
      data: {
        name: config.name,
        description: config.description,
        category: config.category,
        triggerType: config.triggerType,
        triggerConfig: config.triggerConfig as any,
        nodes: config.nodes as any,
        edges: config.edges as any,
        variables: config.variables as any,
        version: (current?.version || 0) + 1,
      },
    });
  },

  // Publish workflow
  async publishWorkflow(id: string, userId: string) {
    return prisma.workflowDefinition.update({
      where: { id },
      data: {
        publishedAt: new Date(),
        publishedById: userId,
        isActive: true,
      },
    });
  },

  // Delete workflow
  async deleteWorkflow(id: string) {
    return prisma.workflowDefinition.update({
      where: { id },
      data: { isActive: false },
    });
  },

  // Toggle workflow active status
  async toggleWorkflow(id: string) {
    const workflow = await prisma.workflowDefinition.findUnique({ where: { id } });
    if (!workflow) throw new Error('Workflow not found');

    return prisma.workflowDefinition.update({
      where: { id },
      data: { isActive: !workflow.isActive },
    });
  },

  // Trigger workflow execution
  async triggerWorkflow(
    workflowId: string,
    organizationId: string,
    triggeredBy: string,
    triggerData: any,
    entityType?: string,
    entityId?: string
  ) {
    const workflow = await prisma.workflowDefinition.findUnique({
      where: { id: workflowId },
    });

    if (!workflow || !workflow.isActive) {
      throw new Error('Workflow not found or inactive');
    }

    // Create execution
    const execution = await prisma.workflowExecution.create({
      data: {
        workflowId,
        organizationId,
        triggeredBy,
        triggerData: triggerData as any,
        entityType,
        entityId,
        status: 'PENDING',
        context: { ...triggerData, organizationId, triggeredBy, entityType, entityId },
      },
    });

    // Start execution in background
    this.executeWorkflow(execution.id).catch(console.error);

    return execution;
  },

  // Execute workflow
  async executeWorkflow(executionId: string) {
    const execution = await prisma.workflowExecution.findUnique({
      where: { id: executionId },
      include: { workflow: true },
    });

    if (!execution || !execution.workflow) {
      throw new Error('Execution not found');
    }

    try {
      // Update status
      await prisma.workflowExecution.update({
        where: { id: executionId },
        data: { status: 'RUNNING', startedAt: new Date() },
      });

      const nodes = execution.workflow.nodes as WorkflowNode[];
      const edges = execution.workflow.edges as WorkflowEdge[];
      let context = execution.context as Record<string, any> || {};

      // Find start node (trigger node or first node without incoming edges)
      const targetNodeIds = new Set(edges.map(e => e.target));
      let startNode = nodes.find(n => n.type === 'trigger') ||
                      nodes.find(n => !targetNodeIds.has(n.id));

      if (!startNode) {
        throw new Error('No start node found');
      }

      // Execute nodes
      const executed = new Set<string>();
      const queue = [startNode.id];

      while (queue.length > 0) {
        const nodeId = queue.shift()!;
        if (executed.has(nodeId)) continue;

        const node = nodes.find(n => n.id === nodeId);
        if (!node) continue;

        // Create step record
        const step = await prisma.workflowExecutionStep.create({
          data: {
            executionId,
            nodeId: node.id,
            nodeType: node.type,
            nodeName: node.name,
            status: 'RUNNING',
            startedAt: new Date(),
            input: context as any,
          },
        });

        try {
          // Execute node
          const handler = nodeHandlers[node.type];
          let result: any = null;

          if (handler) {
            result = await handler(context, node.config);
            context = { ...context, [`${node.id}_result`]: result };
          }

          // Update step
          await prisma.workflowExecutionStep.update({
            where: { id: step.id },
            data: {
              status: 'COMPLETED',
              completedAt: new Date(),
              output: result as any,
            },
          });

          executed.add(nodeId);

          // Find next nodes
          const outgoingEdges = edges.filter(e => e.source === nodeId);
          for (const edge of outgoingEdges) {
            // Check condition if present
            if (edge.condition) {
              const conditionResult = await nodeHandlers['condition'](context, edge.condition);
              if (!conditionResult) continue;
            }
            queue.push(edge.target);
          }
        } catch (error: any) {
          await prisma.workflowExecutionStep.update({
            where: { id: step.id },
            data: {
              status: 'FAILED',
              completedAt: new Date(),
              errorMessage: error.message,
            },
          });
          throw error;
        }
      }

      // Complete execution
      await prisma.workflowExecution.update({
        where: { id: executionId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          context: context as any,
          result: { nodesExecuted: executed.size } as any,
        },
      });
    } catch (error: any) {
      await prisma.workflowExecution.update({
        where: { id: executionId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: error.message,
        },
      });
      throw error;
    }
  },

  // Get execution details
  async getExecution(id: string) {
    return prisma.workflowExecution.findUnique({
      where: { id },
      include: {
        workflow: true,
        steps: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  },

  // Get executions for a workflow
  async getExecutions(workflowId: string, limit = 20) {
    return prisma.workflowExecution.findMany({
      where: { workflowId },
      orderBy: { startedAt: 'desc' },
      take: limit,
      include: {
        steps: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  },

  // Alias for getExecutions (used by routes)
  async getWorkflowExecutions(workflowId: string, limit = 20) {
    return this.getExecutions(workflowId, limit);
  },

  // Alias for getExecution (used by routes)
  async getExecutionDetails(id: string) {
    return this.getExecution(id);
  },

  // Cancel execution
  async cancelExecution(id: string) {
    return prisma.workflowExecution.update({
      where: { id },
      data: { status: 'CANCELLED', completedAt: new Date() },
    });
  },

  // Get workflow templates
  getWorkflowTemplates() {
    return [
      {
        id: 'lead_nurture',
        name: 'Lead Nurture Sequence',
        description: 'Automated follow-up sequence for new leads',
        category: 'LEAD_MANAGEMENT',
        triggerType: 'LEAD_CREATED',
        nodes: [
          { id: '1', type: 'trigger', name: 'New Lead Created', config: {}, position: { x: 100, y: 100 } },
          { id: '2', type: 'send_email', name: 'Welcome Email', config: { templateId: 'welcome' }, position: { x: 100, y: 200 } },
          { id: '3', type: 'wait', name: 'Wait 2 Days', config: { duration: 2, unit: 'days' }, position: { x: 100, y: 300 } },
          { id: '4', type: 'create_task', name: 'Follow-up Task', config: { title: 'Follow up with lead' }, position: { x: 100, y: 400 } },
        ],
        edges: [
          { id: 'e1', source: '1', target: '2' },
          { id: 'e2', source: '2', target: '3' },
          { id: 'e3', source: '3', target: '4' },
        ],
      },
      {
        id: 'hot_lead_alert',
        name: 'Hot Lead Alert',
        description: 'Alert sales team when high-score lead is created',
        category: 'SALES',
        triggerType: 'LEAD_CREATED',
        nodes: [
          { id: '1', type: 'trigger', name: 'New Lead', config: {}, position: { x: 100, y: 100 } },
          { id: '2', type: 'condition', name: 'High Score?', config: { field: 'totalScore', operator: 'greater_than', value: 80 }, position: { x: 100, y: 200 } },
          { id: '3', type: 'send_email', name: 'Alert Team', config: { to: 'sales@company.com', subject: 'Hot Lead Alert!' }, position: { x: 200, y: 300 } },
          { id: '4', type: 'assign_user', name: 'Auto Assign', config: { assignmentType: 'PRIMARY' }, position: { x: 200, y: 400 } },
        ],
        edges: [
          { id: 'e1', source: '1', target: '2' },
          { id: 'e2', source: '2', target: '3', condition: { field: 'result', operator: 'equals', value: true } },
          { id: 'e3', source: '3', target: '4' },
        ],
      },
      {
        id: 'win_back',
        name: 'Win Back Campaign',
        description: 'Re-engage lost or dormant leads',
        category: 'MARKETING',
        triggerType: 'LEAD_STAGE_CHANGED',
        nodes: [
          { id: '1', type: 'trigger', name: 'Stage Changed', config: {}, position: { x: 100, y: 100 } },
          { id: '2', type: 'condition', name: 'Is Lost?', config: { field: 'stage', operator: 'equals', value: 'LOST' }, position: { x: 100, y: 200 } },
          { id: '3', type: 'wait', name: 'Wait 30 Days', config: { duration: 30, unit: 'days' }, position: { x: 200, y: 300 } },
          { id: '4', type: 'send_email', name: 'Win Back Email', config: { templateId: 'win_back' }, position: { x: 200, y: 400 } },
        ],
        edges: [
          { id: 'e1', source: '1', target: '2' },
          { id: 'e2', source: '2', target: '3', condition: { field: 'result', operator: 'equals', value: true } },
          { id: 'e3', source: '3', target: '4' },
        ],
      },
    ];
  },

  // Get available node types
  getNodeTypes() {
    return [
      { type: 'trigger', name: 'Trigger', category: 'trigger', description: 'Workflow start point' },
      { type: 'condition', name: 'Condition', category: 'logic', description: 'Branch based on condition' },
      { type: 'wait', name: 'Wait/Delay', category: 'logic', description: 'Pause execution' },
      { type: 'update_lead', name: 'Update Lead', category: 'action', description: 'Update lead fields' },
      { type: 'assign_user', name: 'Assign User', category: 'action', description: 'Assign lead to user' },
      { type: 'send_email', name: 'Send Email', category: 'communication', description: 'Send email notification' },
      { type: 'send_sms', name: 'Send SMS', category: 'communication', description: 'Send SMS message' },
      { type: 'send_whatsapp', name: 'Send WhatsApp', category: 'communication', description: 'Send WhatsApp message' },
      { type: 'create_task', name: 'Create Task', category: 'action', description: 'Create follow-up task' },
      { type: 'schedule_call', name: 'Schedule Call', category: 'action', description: 'Schedule a call' },
      { type: 'add_tag', name: 'Add Tag', category: 'action', description: 'Add tag to lead' },
      { type: 'webhook', name: 'Webhook', category: 'integration', description: 'Call external API' },
    ];
  },

  // Get available trigger types
  getTriggerTypes() {
    return [
      { type: 'LEAD_CREATED', name: 'Lead Created', description: 'Triggered when a new lead is created', category: 'lead' },
      { type: 'LEAD_UPDATED', name: 'Lead Updated', description: 'Triggered when a lead is updated', category: 'lead' },
      { type: 'LEAD_STAGE_CHANGED', name: 'Lead Stage Changed', description: 'Triggered when lead stage changes', category: 'lead' },
      { type: 'LEAD_ASSIGNED', name: 'Lead Assigned', description: 'Triggered when a lead is assigned', category: 'lead' },
      { type: 'LEAD_SCORE_CHANGED', name: 'Lead Score Changed', description: 'Triggered when lead score changes', category: 'lead' },
      { type: 'TASK_CREATED', name: 'Task Created', description: 'Triggered when a task is created', category: 'task' },
      { type: 'TASK_COMPLETED', name: 'Task Completed', description: 'Triggered when a task is completed', category: 'task' },
      { type: 'CALL_COMPLETED', name: 'Call Completed', description: 'Triggered when a call is completed', category: 'call' },
      { type: 'FORM_SUBMITTED', name: 'Form Submitted', description: 'Triggered when a form is submitted', category: 'form' },
      { type: 'EMAIL_OPENED', name: 'Email Opened', description: 'Triggered when an email is opened', category: 'email' },
      { type: 'EMAIL_CLICKED', name: 'Email Link Clicked', description: 'Triggered when email link is clicked', category: 'email' },
      { type: 'SCHEDULED', name: 'Scheduled', description: 'Triggered on a schedule (cron)', category: 'schedule' },
      { type: 'MANUAL', name: 'Manual Trigger', description: 'Manually triggered workflow', category: 'manual' },
    ];
  },
};
