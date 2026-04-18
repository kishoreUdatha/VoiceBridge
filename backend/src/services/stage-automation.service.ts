/**
 * Stage Automation Service
 * Executes automations when leads enter or exit pipeline stages
 */

import { PrismaClient } from '@prisma/client';
import { emailService } from '../integrations/email.service';
import { exotelService } from '../integrations/exotel.service';
import { CommunicationService } from './communication.service';
import axios from 'axios';

const prisma = new PrismaClient();
const communicationService = new CommunicationService();

// Automation action types
type ActionType =
  | 'send_email'
  | 'send_sms'
  | 'send_whatsapp'
  | 'assign_user'
  | 'create_task'
  | 'create_followup'
  | 'update_field'
  | 'add_tag'
  | 'remove_tag'
  | 'webhook'
  | 'notify_user';

interface ActionConfig {
  enabled?: boolean;
  // Email
  subject?: string;
  body?: string;
  templateId?: string;
  // SMS/WhatsApp
  message?: string;
  // Assign
  userId?: string;
  assignmentType?: 'PRIMARY' | 'SECONDARY';
  roundRobin?: boolean;
  // Task
  taskTitle?: string;
  taskDescription?: string;
  taskDueHours?: number;
  taskAssigneeId?: string;
  // Follow-up
  followupType?: string;
  followupDueHours?: number;
  followupNotes?: string;
  // Field update
  fieldName?: string;
  fieldValue?: any;
  // Tags
  tagId?: string;
  tagName?: string;
  // Webhook
  webhookUrl?: string;
  webhookMethod?: 'GET' | 'POST' | 'PUT';
  webhookHeaders?: Record<string, string>;
  webhookBody?: Record<string, any>;
  // Notify
  notifyUserId?: string;
  notifyMessage?: string;
  notifyChannel?: 'email' | 'sms' | 'push';
}

interface AutomationContext {
  leadId: string;
  organizationId: string;
  stageName: string;
  stageId: string;
  previousStage?: string;
  triggeredBy?: string;
  lead?: any;
}

interface ExecutionResult {
  action: ActionType;
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
}

class StageAutomationService {
  /**
   * Execute all automations for a stage entry
   */
  async executeEntryAutomations(
    context: AutomationContext,
    autoActions: Record<string, ActionConfig>
  ): Promise<ExecutionResult[]> {
    console.log(`[StageAutomation] Executing entry automations for lead ${context.leadId} entering stage ${context.stageName}`);
    return this.executeAutomations(context, autoActions, 'entry');
  }

  /**
   * Execute all automations for a stage exit
   */
  async executeExitAutomations(
    context: AutomationContext,
    exitActions: Record<string, ActionConfig>
  ): Promise<ExecutionResult[]> {
    console.log(`[StageAutomation] Executing exit automations for lead ${context.leadId} exiting stage ${context.stageName}`);
    return this.executeAutomations(context, exitActions, 'exit');
  }

  /**
   * Execute automations
   */
  private async executeAutomations(
    context: AutomationContext,
    actions: Record<string, ActionConfig>,
    trigger: 'entry' | 'exit'
  ): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];

    // Fetch lead data if not provided
    if (!context.lead) {
      context.lead = await prisma.lead.findUnique({
        where: { id: context.leadId },
        include: {
          assignments: { include: { user: true } },
          tags: { include: { tag: true } },
        },
      });
    }

    if (!context.lead) {
      console.error(`[StageAutomation] Lead ${context.leadId} not found`);
      return [{ action: 'send_email', success: false, error: 'Lead not found' }];
    }

    // Execute each action
    for (const [actionType, config] of Object.entries(actions)) {
      if (!config || config.enabled === false) continue;

      try {
        const result = await this.executeAction(
          actionType as ActionType,
          config,
          context
        );
        results.push(result);

        // Log successful execution
        await this.logExecution(context, actionType, trigger, result);
      } catch (error: any) {
        console.error(`[StageAutomation] Action ${actionType} failed:`, error.message);
        results.push({
          action: actionType as ActionType,
          success: false,
          error: error.message,
        });

        // Log failed execution
        await this.logExecution(context, actionType, trigger, {
          action: actionType as ActionType,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Execute a single action
   */
  private async executeAction(
    actionType: ActionType,
    config: ActionConfig,
    context: AutomationContext
  ): Promise<ExecutionResult> {
    const lead = context.lead;

    switch (actionType) {
      case 'send_email':
        return this.sendEmail(config, context);

      case 'send_sms':
        return this.sendSms(config, context);

      case 'send_whatsapp':
        return this.sendWhatsApp(config, context);

      case 'assign_user':
        return this.assignUser(config, context);

      case 'create_task':
        return this.createTask(config, context);

      case 'create_followup':
        return this.createFollowup(config, context);

      case 'update_field':
        return this.updateField(config, context);

      case 'add_tag':
        return this.addTag(config, context);

      case 'remove_tag':
        return this.removeTag(config, context);

      case 'webhook':
        return this.callWebhook(config, context);

      case 'notify_user':
        return this.notifyUser(config, context);

      default:
        return {
          action: actionType,
          success: false,
          error: `Unknown action type: ${actionType}`,
        };
    }
  }

  /**
   * Send email automation
   */
  private async sendEmail(config: ActionConfig, context: AutomationContext): Promise<ExecutionResult> {
    const lead = context.lead;
    const email = lead.email;

    if (!email) {
      return { action: 'send_email', success: false, error: 'Lead has no email address' };
    }

    const subject = this.replaceVariables(config.subject || 'Update on your inquiry', lead);
    const body = this.replaceVariables(config.body || '', lead);

    await emailService.sendEmail({
      to: email,
      subject,
      body,
      html: body,
      leadId: context.leadId,
      organizationId: context.organizationId,
    });

    return {
      action: 'send_email',
      success: true,
      message: `Email sent to ${email}`,
      data: { to: email, subject },
    };
  }

  /**
   * Send SMS automation
   */
  private async sendSms(config: ActionConfig, context: AutomationContext): Promise<ExecutionResult> {
    const lead = context.lead;
    const phone = lead.phone || lead.mobile;

    if (!phone) {
      return { action: 'send_sms', success: false, error: 'Lead has no phone number' };
    }

    const message = this.replaceVariables(config.message || '', lead);

    if (!communicationService.isSmsConfigured()) {
      console.warn('[StageAutomation] SMS not configured, skipping');
      return { action: 'send_sms', success: false, error: 'SMS provider not configured' };
    }

    await communicationService.sendSms({
      to: phone,
      message,
      leadId: context.leadId,
    });

    return {
      action: 'send_sms',
      success: true,
      message: `SMS sent to ${phone}`,
      data: { to: phone },
    };
  }

  /**
   * Send WhatsApp automation
   */
  private async sendWhatsApp(config: ActionConfig, context: AutomationContext): Promise<ExecutionResult> {
    const lead = context.lead;
    const phone = lead.phone || lead.mobile || lead.whatsappNumber;

    if (!phone) {
      return { action: 'send_whatsapp', success: false, error: 'Lead has no phone number' };
    }

    const message = this.replaceVariables(config.message || '', lead);

    if (!exotelService.isWhatsAppConfigured()) {
      console.warn('[StageAutomation] WhatsApp not configured, skipping');
      return { action: 'send_whatsapp', success: false, error: 'WhatsApp not configured' };
    }

    await exotelService.sendWhatsApp({
      to: phone,
      message,
    });

    return {
      action: 'send_whatsapp',
      success: true,
      message: `WhatsApp sent to ${phone}`,
      data: { to: phone },
    };
  }

  /**
   * Assign user automation
   */
  private async assignUser(config: ActionConfig, context: AutomationContext): Promise<ExecutionResult> {
    let userId = config.userId;

    // If round robin, get next available user
    if (config.roundRobin) {
      const users = await prisma.user.findMany({
        where: {
          organizationId: context.organizationId,
          isActive: true,
          role: { in: ['telecaller', 'counselor', 'sales'] },
        },
        orderBy: { lastAssignedAt: 'asc' },
        take: 1,
      });

      if (users.length > 0) {
        userId = users[0].id;
        // Update last assigned time
        await prisma.user.update({
          where: { id: userId },
          data: { lastAssignedAt: new Date() },
        });
      }
    }

    if (!userId) {
      return { action: 'assign_user', success: false, error: 'No user to assign' };
    }

    // Check if already assigned
    const existing = await prisma.leadAssignment.findFirst({
      where: {
        leadId: context.leadId,
        userId,
        type: config.assignmentType || 'PRIMARY',
      },
    });

    if (!existing) {
      await prisma.leadAssignment.create({
        data: {
          leadId: context.leadId,
          userId,
          type: config.assignmentType || 'PRIMARY',
          assignedAt: new Date(),
        },
      });
    }

    return {
      action: 'assign_user',
      success: true,
      message: `Lead assigned to user ${userId}`,
      data: { userId },
    };
  }

  /**
   * Create task automation
   */
  private async createTask(config: ActionConfig, context: AutomationContext): Promise<ExecutionResult> {
    const lead = context.lead;
    const dueDate = config.taskDueHours
      ? new Date(Date.now() + config.taskDueHours * 60 * 60 * 1000)
      : new Date(Date.now() + 24 * 60 * 60 * 1000); // Default 24 hours

    const title = this.replaceVariables(config.taskTitle || `Follow up with ${lead.firstName || 'lead'}`, lead);
    const description = this.replaceVariables(config.taskDescription || '', lead);

    // Get assignee - use config or primary assignment
    let assigneeId = config.taskAssigneeId;
    if (!assigneeId && lead.assignments?.length > 0) {
      const primary = lead.assignments.find((a: any) => a.type === 'PRIMARY');
      assigneeId = primary?.userId || lead.assignments[0].userId;
    }

    const task = await prisma.leadTask.create({
      data: {
        leadId: context.leadId,
        title,
        description,
        dueDate,
        assignedToId: assigneeId,
        status: 'PENDING',
        priority: 'MEDIUM',
        createdById: context.triggeredBy,
      },
    });

    return {
      action: 'create_task',
      success: true,
      message: `Task created: ${title}`,
      data: { taskId: task.id, title, dueDate },
    };
  }

  /**
   * Create follow-up automation
   */
  private async createFollowup(config: ActionConfig, context: AutomationContext): Promise<ExecutionResult> {
    const lead = context.lead;
    const dueDate = config.followupDueHours
      ? new Date(Date.now() + config.followupDueHours * 60 * 60 * 1000)
      : new Date(Date.now() + 24 * 60 * 60 * 1000);

    const notes = this.replaceVariables(config.followupNotes || '', lead);

    const followup = await prisma.followUp.create({
      data: {
        leadId: context.leadId,
        organizationId: context.organizationId,
        type: config.followupType || 'CALL',
        scheduledFor: dueDate,
        notes,
        status: 'PENDING',
      },
    });

    return {
      action: 'create_followup',
      success: true,
      message: `Follow-up scheduled for ${dueDate.toISOString()}`,
      data: { followupId: followup.id, dueDate },
    };
  }

  /**
   * Update field automation
   */
  private async updateField(config: ActionConfig, context: AutomationContext): Promise<ExecutionResult> {
    if (!config.fieldName) {
      return { action: 'update_field', success: false, error: 'No field name specified' };
    }

    await prisma.lead.update({
      where: { id: context.leadId },
      data: { [config.fieldName]: config.fieldValue },
    });

    return {
      action: 'update_field',
      success: true,
      message: `Updated ${config.fieldName} to ${config.fieldValue}`,
      data: { field: config.fieldName, value: config.fieldValue },
    };
  }

  /**
   * Add tag automation
   */
  private async addTag(config: ActionConfig, context: AutomationContext): Promise<ExecutionResult> {
    let tagId = config.tagId;

    // Find or create tag by name
    if (!tagId && config.tagName) {
      let tag = await prisma.tag.findFirst({
        where: {
          organizationId: context.organizationId,
          name: config.tagName,
        },
      });

      if (!tag) {
        tag = await prisma.tag.create({
          data: {
            organizationId: context.organizationId,
            name: config.tagName,
            color: '#3B82F6',
          },
        });
      }
      tagId = tag.id;
    }

    if (!tagId) {
      return { action: 'add_tag', success: false, error: 'No tag specified' };
    }

    // Check if already tagged
    const existing = await prisma.leadTag.findFirst({
      where: { leadId: context.leadId, tagId },
    });

    if (!existing) {
      await prisma.leadTag.create({
        data: { leadId: context.leadId, tagId },
      });
    }

    return {
      action: 'add_tag',
      success: true,
      message: `Tag added`,
      data: { tagId },
    };
  }

  /**
   * Remove tag automation
   */
  private async removeTag(config: ActionConfig, context: AutomationContext): Promise<ExecutionResult> {
    let tagId = config.tagId;

    if (!tagId && config.tagName) {
      const tag = await prisma.tag.findFirst({
        where: {
          organizationId: context.organizationId,
          name: config.tagName,
        },
      });
      tagId = tag?.id;
    }

    if (!tagId) {
      return { action: 'remove_tag', success: false, error: 'Tag not found' };
    }

    await prisma.leadTag.deleteMany({
      where: { leadId: context.leadId, tagId },
    });

    return {
      action: 'remove_tag',
      success: true,
      message: `Tag removed`,
      data: { tagId },
    };
  }

  /**
   * Call webhook automation
   */
  private async callWebhook(config: ActionConfig, context: AutomationContext): Promise<ExecutionResult> {
    if (!config.webhookUrl) {
      return { action: 'webhook', success: false, error: 'No webhook URL specified' };
    }

    const lead = context.lead;
    const method = config.webhookMethod || 'POST';

    // Build payload with lead data
    const payload = {
      event: 'stage_change',
      timestamp: new Date().toISOString(),
      lead: {
        id: lead.id,
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
      },
      stage: {
        id: context.stageId,
        name: context.stageName,
        previousStage: context.previousStage,
      },
      organizationId: context.organizationId,
      ...config.webhookBody,
    };

    try {
      const response = await axios({
        method,
        url: config.webhookUrl,
        headers: {
          'Content-Type': 'application/json',
          ...config.webhookHeaders,
        },
        data: method !== 'GET' ? payload : undefined,
        params: method === 'GET' ? payload : undefined,
        timeout: 10000,
      });

      return {
        action: 'webhook',
        success: true,
        message: `Webhook called: ${config.webhookUrl}`,
        data: { status: response.status, url: config.webhookUrl },
      };
    } catch (error: any) {
      return {
        action: 'webhook',
        success: false,
        error: `Webhook failed: ${error.message}`,
        data: { url: config.webhookUrl },
      };
    }
  }

  /**
   * Notify user automation
   */
  private async notifyUser(config: ActionConfig, context: AutomationContext): Promise<ExecutionResult> {
    const userId = config.notifyUserId;
    const message = this.replaceVariables(config.notifyMessage || '', context.lead);

    if (!userId) {
      return { action: 'notify_user', success: false, error: 'No user to notify' };
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return { action: 'notify_user', success: false, error: 'User not found' };
    }

    // Create in-app notification
    await prisma.notification.create({
      data: {
        userId,
        organizationId: context.organizationId,
        type: 'STAGE_CHANGE',
        title: `Lead moved to ${context.stageName}`,
        message,
        data: {
          leadId: context.leadId,
          stageName: context.stageName,
        } as any,
        isRead: false,
      },
    });

    // Send email notification if configured
    if (config.notifyChannel === 'email' && user.email) {
      await emailService.sendEmail({
        to: user.email,
        subject: `Lead Update: ${context.lead.firstName || 'Lead'} moved to ${context.stageName}`,
        body: message,
        organizationId: context.organizationId,
      });
    }

    return {
      action: 'notify_user',
      success: true,
      message: `User ${userId} notified`,
      data: { userId, channel: config.notifyChannel || 'push' },
    };
  }

  /**
   * Replace variables in template strings
   */
  private replaceVariables(template: string, lead: any): string {
    if (!template) return '';

    return template
      .replace(/\{\{firstName\}\}/g, lead.firstName || '')
      .replace(/\{\{lastName\}\}/g, lead.lastName || '')
      .replace(/\{\{fullName\}\}/g, `${lead.firstName || ''} ${lead.lastName || ''}`.trim())
      .replace(/\{\{email\}\}/g, lead.email || '')
      .replace(/\{\{phone\}\}/g, lead.phone || lead.mobile || '')
      .replace(/\{\{course\}\}/g, lead.interestedCourse || '')
      .replace(/\{\{source\}\}/g, lead.source || '')
      .replace(/\{\{leadId\}\}/g, lead.id || '')
      .replace(/\{\{createdAt\}\}/g, lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : '');
  }

  /**
   * Log automation execution
   */
  private async logExecution(
    context: AutomationContext,
    actionType: string,
    trigger: 'entry' | 'exit',
    result: ExecutionResult
  ): Promise<void> {
    try {
      await prisma.activityLog.create({
        data: {
          organizationId: context.organizationId,
          leadId: context.leadId,
          userId: context.triggeredBy,
          action: 'AUTOMATION_EXECUTED',
          entityType: 'LEAD',
          entityId: context.leadId,
          description: `${trigger === 'entry' ? 'Entry' : 'Exit'} automation: ${actionType} - ${result.success ? 'Success' : 'Failed'}`,
          metadata: {
            actionType,
            trigger,
            stageName: context.stageName,
            stageId: context.stageId,
            result: result.success,
            error: result.error,
            data: result.data,
          } as any,
        },
      });
    } catch (error) {
      console.error('[StageAutomation] Failed to log execution:', error);
    }
  }
}

export const stageAutomationService = new StageAutomationService();
export default stageAutomationService;
