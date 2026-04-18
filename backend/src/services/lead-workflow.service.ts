/**
 * Lead Workflow Automation Service
 * Handles workflow creation, triggers, actions, and enrollment management
 */

import { prisma } from '../config/database';
import { LeadWorkflow, LeadWorkflowEnrollment, Lead, Prisma } from '@prisma/client';
import { emailService } from '../integrations/email.service';
import { exotelService } from '../integrations/exotel.service';
import { CommunicationService } from './communication.service';

const communicationService = new CommunicationService();

// Trigger types
export type TriggerType =
  | 'LEAD_CREATED'
  | 'STAGE_CHANGED'
  | 'SCORE_THRESHOLD'
  | 'TAG_ADDED'
  | 'FORM_SUBMITTED'
  | 'TIME_BASED'
  | 'MANUAL';

// Action types
export type ActionType =
  | 'SEND_EMAIL'
  | 'SEND_SMS'
  | 'SEND_WHATSAPP'
  | 'ASSIGN_TO_USER'
  | 'ASSIGN_TO_TEAM'
  | 'ADD_TAG'
  | 'REMOVE_TAG'
  | 'CHANGE_STAGE'
  | 'UPDATE_FIELD'
  | 'CREATE_TASK'
  | 'CREATE_FOLLOWUP'
  | 'NOTIFY_USER'
  | 'WEBHOOK';

interface WorkflowAction {
  type: ActionType;
  config: Record<string, any>;
  delayMinutes?: number;
}

interface TriggerConfig {
  stageIds?: string[];
  tagIds?: string[];
  scoreThreshold?: number;
  scoreDirection?: 'above' | 'below';
  formIds?: string[];
  timeField?: string;
  timeValue?: number;
  timeUnit?: 'minutes' | 'hours' | 'days';
}

interface WorkflowWithEnrollments extends LeadWorkflow {
  enrollments?: LeadWorkflowEnrollment[];
}

export class LeadWorkflowService {
  // ==================== Workflow CRUD ====================

  /**
   * Create a new workflow
   */
  async createWorkflow(
    organizationId: string,
    data: {
      name: string;
      description?: string;
      triggerType: TriggerType;
      triggerConfig?: TriggerConfig;
      actions: WorkflowAction[];
    }
  ): Promise<LeadWorkflow> {
    return prisma.leadWorkflow.create({
      data: {
        organizationId,
        name: data.name,
        description: data.description,
        triggerType: data.triggerType,
        triggerConfig: data.triggerConfig as any || {},
        actions: data.actions as any,
      },
    });
  }

  /**
   * Update a workflow
   */
  async updateWorkflow(
    workflowId: string,
    organizationId: string,
    data: Partial<{
      name: string;
      description: string;
      triggerType: TriggerType;
      triggerConfig: TriggerConfig;
      actions: WorkflowAction[];
      isActive: boolean;
    }>
  ): Promise<LeadWorkflow> {
    return prisma.leadWorkflow.update({
      where: { id: workflowId, organizationId },
      data: {
        ...data,
        triggerConfig: data.triggerConfig as any,
        actions: data.actions as any,
      },
    });
  }

  /**
   * Delete a workflow
   */
  async deleteWorkflow(workflowId: string, organizationId: string): Promise<void> {
    await prisma.leadWorkflow.delete({
      where: { id: workflowId, organizationId },
    });
  }

  /**
   * Get all workflows for an organization
   */
  async getWorkflows(
    organizationId: string,
    options?: {
      includeStats?: boolean;
      isActive?: boolean;
    }
  ): Promise<WorkflowWithEnrollments[]> {
    const where: Prisma.LeadWorkflowWhereInput = { organizationId };

    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    return prisma.leadWorkflow.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: options?.includeStats
        ? {
            enrollments: {
              select: {
                id: true,
                status: true,
              },
            },
          }
        : undefined,
    });
  }

  /**
   * Get a single workflow
   */
  async getWorkflow(workflowId: string, organizationId: string): Promise<LeadWorkflow | null> {
    return prisma.leadWorkflow.findFirst({
      where: { id: workflowId, organizationId },
      include: {
        enrollments: {
          orderBy: { enrolledAt: 'desc' },
          take: 10,
          include: {
            lead: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  // ==================== Trigger Handling ====================

  /**
   * Handle a trigger event and enroll qualifying leads in workflows
   */
  async handleTrigger(
    organizationId: string,
    triggerType: TriggerType,
    leadId: string,
    context?: Record<string, any>
  ): Promise<{ enrolledWorkflows: string[] }> {
    // Get all active workflows with this trigger type
    const workflows = await prisma.leadWorkflow.findMany({
      where: {
        organizationId,
        triggerType,
        isActive: true,
      },
    });

    const enrolledWorkflows: string[] = [];

    for (const workflow of workflows) {
      // Check if lead matches trigger conditions
      const matches = await this.checkTriggerConditions(workflow, leadId, context);

      if (matches) {
        // Check if lead is already enrolled
        const existingEnrollment = await prisma.leadWorkflowEnrollment.findUnique({
          where: {
            workflowId_leadId: {
              workflowId: workflow.id,
              leadId,
            },
          },
        });

        if (!existingEnrollment || existingEnrollment.status === 'COMPLETED') {
          // Enroll lead in workflow
          await this.enrollLead(workflow.id, leadId);
          enrolledWorkflows.push(workflow.id);
        }
      }
    }

    return { enrolledWorkflows };
  }

  /**
   * Check if lead matches trigger conditions
   */
  private async checkTriggerConditions(
    workflow: LeadWorkflow,
    leadId: string,
    context?: Record<string, any>
  ): Promise<boolean> {
    const config = workflow.triggerConfig as TriggerConfig;

    switch (workflow.triggerType) {
      case 'LEAD_CREATED':
        return true; // Always matches for new leads

      case 'STAGE_CHANGED':
        if (config.stageIds && context?.newStageId) {
          return config.stageIds.includes(context.newStageId);
        }
        return true;

      case 'TAG_ADDED':
        if (config.tagIds && context?.tagId) {
          return config.tagIds.includes(context.tagId);
        }
        return true;

      case 'SCORE_THRESHOLD':
        if (config.scoreThreshold !== undefined) {
          const lead = await prisma.lead.findUnique({
            where: { id: leadId },
            select: { totalScore: true },
          });

          const score = lead?.totalScore || 0;

          if (config.scoreDirection === 'above') {
            return score >= config.scoreThreshold;
          } else {
            return score <= config.scoreThreshold;
          }
        }
        return false;

      case 'FORM_SUBMITTED':
        if (config.formIds && context?.formId) {
          return config.formIds.includes(context.formId);
        }
        return true;

      case 'MANUAL':
        return true; // Always matches for manual enrollment

      default:
        return false;
    }
  }

  // ==================== Enrollment Management ====================

  /**
   * Enroll a lead in a workflow
   */
  async enrollLead(workflowId: string, leadId: string): Promise<LeadWorkflowEnrollment> {
    const workflow = await prisma.leadWorkflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const actions = workflow.actions as WorkflowAction[];
    const firstAction = actions[0];
    const delayMinutes = firstAction?.delayMinutes || 0;

    // Create enrollment
    const enrollment = await prisma.leadWorkflowEnrollment.upsert({
      where: {
        workflowId_leadId: { workflowId, leadId },
      },
      create: {
        workflowId,
        leadId,
        status: 'ACTIVE',
        currentStep: 0,
        nextStepAt: delayMinutes > 0
          ? new Date(Date.now() + delayMinutes * 60 * 1000)
          : new Date(),
      },
      update: {
        status: 'ACTIVE',
        currentStep: 0,
        completedAt: null,
        nextStepAt: delayMinutes > 0
          ? new Date(Date.now() + delayMinutes * 60 * 1000)
          : new Date(),
      },
    });

    // Execute first step immediately if no delay
    if (delayMinutes === 0) {
      await this.executeWorkflowStep(enrollment.id);
    }

    // Create activity log
    await prisma.leadActivity.create({
      data: {
        leadId,
        type: 'WORKFLOW_ENROLLED',
        title: 'Enrolled in workflow',
        description: `Lead enrolled in workflow: ${workflow.name}`,
        metadata: { workflowId, workflowName: workflow.name },
      },
    });

    return enrollment;
  }

  /**
   * Cancel a workflow enrollment
   */
  async cancelEnrollment(enrollmentId: string, organizationId: string): Promise<void> {
    const enrollment = await prisma.leadWorkflowEnrollment.findFirst({
      where: { id: enrollmentId },
      include: { workflow: true },
    });

    if (!enrollment || enrollment.workflow.organizationId !== organizationId) {
      throw new Error('Enrollment not found');
    }

    await prisma.leadWorkflowEnrollment.update({
      where: { id: enrollmentId },
      data: {
        status: 'CANCELLED',
      },
    });
  }

  /**
   * Pause a workflow enrollment
   */
  async pauseEnrollment(enrollmentId: string, organizationId: string): Promise<void> {
    const enrollment = await prisma.leadWorkflowEnrollment.findFirst({
      where: { id: enrollmentId },
      include: { workflow: true },
    });

    if (!enrollment || enrollment.workflow.organizationId !== organizationId) {
      throw new Error('Enrollment not found');
    }

    await prisma.leadWorkflowEnrollment.update({
      where: { id: enrollmentId },
      data: {
        status: 'PAUSED',
      },
    });
  }

  /**
   * Resume a paused workflow enrollment
   */
  async resumeEnrollment(enrollmentId: string, organizationId: string): Promise<void> {
    const enrollment = await prisma.leadWorkflowEnrollment.findFirst({
      where: { id: enrollmentId },
      include: { workflow: true },
    });

    if (!enrollment || enrollment.workflow.organizationId !== organizationId) {
      throw new Error('Enrollment not found');
    }

    if (enrollment.status !== 'PAUSED') {
      throw new Error('Enrollment is not paused');
    }

    await prisma.leadWorkflowEnrollment.update({
      where: { id: enrollmentId },
      data: {
        status: 'ACTIVE',
        nextStepAt: new Date(),
      },
    });
  }

  // ==================== Workflow Execution ====================

  /**
   * Execute the next step in a workflow enrollment
   */
  async executeWorkflowStep(enrollmentId: string): Promise<void> {
    const enrollment = await prisma.leadWorkflowEnrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        workflow: true,
        lead: true,
      },
    });

    if (!enrollment || enrollment.status !== 'ACTIVE') {
      return;
    }

    const actions = enrollment.workflow.actions as WorkflowAction[];
    const currentAction = actions[enrollment.currentStep];

    if (!currentAction) {
      // No more actions, mark as completed
      await prisma.leadWorkflowEnrollment.update({
        where: { id: enrollmentId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });
      return;
    }

    // Execute the action
    try {
      await this.executeAction(currentAction, enrollment.lead, enrollment.workflow.organizationId);

      // Update enrollment to next step
      const nextStep = enrollment.currentStep + 1;
      const nextAction = actions[nextStep];

      if (nextAction) {
        const delayMinutes = nextAction.delayMinutes || 0;

        await prisma.leadWorkflowEnrollment.update({
          where: { id: enrollmentId },
          data: {
            currentStep: nextStep,
            nextStepAt: new Date(Date.now() + delayMinutes * 60 * 1000),
          },
        });
      } else {
        // All actions complete
        await prisma.leadWorkflowEnrollment.update({
          where: { id: enrollmentId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            currentStep: nextStep,
          },
        });
      }

      // Update workflow stats
      await prisma.leadWorkflow.update({
        where: { id: enrollment.workflowId },
        data: {
          executionCount: { increment: 1 },
          lastExecutedAt: new Date(),
        },
      });
    } catch (error) {
      console.error(`Workflow action failed for enrollment ${enrollmentId}:`, error);
      // Log error but don't stop the workflow
    }
  }

  /**
   * Execute a workflow action
   */
  private async executeAction(
    action: WorkflowAction,
    lead: Lead,
    organizationId: string
  ): Promise<void> {
    switch (action.type) {
      case 'ADD_TAG':
        await this.executeAddTag(lead.id, action.config.tagId, organizationId);
        break;

      case 'REMOVE_TAG':
        await this.executeRemoveTag(lead.id, action.config.tagId);
        break;

      case 'CHANGE_STAGE':
        await this.executeChangeStage(lead.id, action.config.stageId);
        break;

      case 'ASSIGN_TO_USER':
        await this.executeAssignToUser(lead.id, action.config.userId, organizationId);
        break;

      case 'UPDATE_FIELD':
        await this.executeUpdateField(lead.id, action.config.field, action.config.value);
        break;

      case 'CREATE_TASK':
        await this.executeCreateTask(lead.id, action.config);
        break;

      case 'CREATE_FOLLOWUP':
        await this.executeCreateFollowup(lead.id, action.config);
        break;

      case 'NOTIFY_USER':
        await this.executeNotifyUser(lead, action.config);
        break;

      case 'SEND_EMAIL':
        // Would integrate with email service
        await prisma.leadActivity.create({
          data: {
            leadId: lead.id,
            type: 'WORKFLOW_ACTION',
            title: 'Email scheduled',
            description: `Workflow email: ${action.config.subject}`,
          },
        });
        break;

      case 'SEND_SMS':
      case 'SEND_WHATSAPP':
        // Would integrate with messaging service
        await prisma.leadActivity.create({
          data: {
            leadId: lead.id,
            type: 'WORKFLOW_ACTION',
            title: `${action.type === 'SEND_SMS' ? 'SMS' : 'WhatsApp'} scheduled`,
            description: action.config.message?.substring(0, 100) || 'Message sent',
          },
        });
        break;

      default:
        console.log(`Unhandled action type: ${action.type}`);
    }

    // Log the action
    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        type: 'WORKFLOW_ACTION',
        title: `Workflow action: ${action.type}`,
        description: `Executed ${action.type} action`,
        metadata: { actionType: action.type, config: action.config },
      },
    });
  }

  // Action implementations
  private async executeAddTag(leadId: string, tagId: string, organizationId: string): Promise<void> {
    await prisma.leadTagAssignment.upsert({
      where: { leadId_tagId: { leadId, tagId } },
      create: { leadId, tagId },
      update: {},
    });
  }

  private async executeRemoveTag(leadId: string, tagId: string): Promise<void> {
    await prisma.leadTagAssignment.deleteMany({
      where: { leadId, tagId },
    });
  }

  private async executeChangeStage(leadId: string, stageId: string): Promise<void> {
    await prisma.lead.update({
      where: { id: leadId },
      data: { stageId },
    });
  }

  private async executeAssignToUser(leadId: string, userId: string, organizationId: string): Promise<void> {
    // Deactivate existing assignments
    await prisma.leadAssignment.updateMany({
      where: { leadId, isActive: true },
      data: { isActive: false },
    });

    // Create new assignment
    await prisma.leadAssignment.create({
      data: {
        leadId,
        assignedToId: userId,
        assignedById: userId,
        isActive: true,
      },
    });

    await prisma.lead.update({
      where: { id: leadId },
      data: { assignedToId: userId },
    });
  }

  private async executeUpdateField(leadId: string, field: string, value: any): Promise<void> {
    await prisma.lead.update({
      where: { id: leadId },
      data: { [field]: value },
    });
  }

  private async executeCreateTask(leadId: string, config: any): Promise<void> {
    await prisma.leadTask.create({
      data: {
        leadId,
        title: config.title,
        description: config.description,
        dueDate: config.dueDate ? new Date(config.dueDate) : new Date(Date.now() + 24 * 60 * 60 * 1000),
        priority: config.priority || 'MEDIUM',
        assigneeId: config.assigneeId,
      },
    });
  }

  private async executeCreateFollowup(leadId: string, config: any): Promise<void> {
    await prisma.followUp.create({
      data: {
        leadId,
        type: config.type || 'CALL',
        notes: config.notes,
        scheduledAt: config.scheduledAt ? new Date(config.scheduledAt) : new Date(Date.now() + 24 * 60 * 60 * 1000),
        assignedToId: config.assigneeId,
      },
    });
  }

  private async executeNotifyUser(lead: Lead, config: any): Promise<void> {
    // Would integrate with notification service
    console.log(`Notification for user ${config.userId}: Lead ${lead.firstName} ${lead.lastName}`);
  }

  // ==================== Scheduled Processing ====================

  /**
   * Process pending workflow steps (for cron job)
   */
  async processPendingSteps(): Promise<{ processedCount: number }> {
    const pendingEnrollments = await prisma.leadWorkflowEnrollment.findMany({
      where: {
        status: 'ACTIVE',
        nextStepAt: {
          lte: new Date(),
        },
      },
      take: 100, // Process in batches
    });

    let processedCount = 0;

    for (const enrollment of pendingEnrollments) {
      await this.executeWorkflowStep(enrollment.id);
      processedCount++;
    }

    return { processedCount };
  }

  /**
   * Get workflow statistics
   */
  async getWorkflowStats(workflowId: string, organizationId: string): Promise<{
    totalEnrollments: number;
    activeEnrollments: number;
    completedEnrollments: number;
    avgCompletionTime: number | null;
  }> {
    const workflow = await prisma.leadWorkflow.findFirst({
      where: { id: workflowId, organizationId },
    });

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const [total, active, completed] = await Promise.all([
      prisma.leadWorkflowEnrollment.count({ where: { workflowId } }),
      prisma.leadWorkflowEnrollment.count({ where: { workflowId, status: 'ACTIVE' } }),
      prisma.leadWorkflowEnrollment.count({ where: { workflowId, status: 'COMPLETED' } }),
    ]);

    // Calculate average completion time
    const completedEnrollments = await prisma.leadWorkflowEnrollment.findMany({
      where: { workflowId, status: 'COMPLETED', completedAt: { not: null } },
      select: { enrolledAt: true, completedAt: true },
    });

    let avgCompletionTime: number | null = null;
    if (completedEnrollments.length > 0) {
      const totalTime = completedEnrollments.reduce((sum, e) => {
        return sum + (e.completedAt!.getTime() - e.enrolledAt.getTime());
      }, 0);
      avgCompletionTime = Math.round(totalTime / completedEnrollments.length / (1000 * 60)); // In minutes
    }

    return {
      totalEnrollments: total,
      activeEnrollments: active,
      completedEnrollments: completed,
      avgCompletionTime,
    };
  }
}

export const leadWorkflowService = new LeadWorkflowService();
