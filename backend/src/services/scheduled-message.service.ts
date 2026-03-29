import { ScheduledMessageType, ScheduledMessageStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../utils/errors';
import { templateService } from './template.service';
import { exotelService } from '../integrations/exotel.service';
import { webhookService, WEBHOOK_EVENTS } from './webhook.service';


interface CreateScheduledMessageParams {
  organizationId: string;
  type: ScheduledMessageType;
  recipients: string[];
  subject?: string;
  content?: string;
  htmlContent?: string;
  templateId?: string;
  variables?: Record<string, string>;
  scheduledAt: Date;
  timezone?: string;
  isRecurring?: boolean;
  recurringRule?: string;
  recurringEndAt?: Date;
  name?: string;
  createdById?: string;
  campaignId?: string;
}

interface UpdateScheduledMessageParams {
  recipients?: string[];
  subject?: string;
  content?: string;
  htmlContent?: string;
  templateId?: string;
  variables?: Record<string, string>;
  scheduledAt?: Date;
  timezone?: string;
  isRecurring?: boolean;
  recurringRule?: string;
  recurringEndAt?: Date;
  name?: string;
  status?: ScheduledMessageStatus;
}

class ScheduledMessageService {
  /**
   * Create a scheduled message
   */
  async createScheduledMessage(params: CreateScheduledMessageParams) {
    const {
      organizationId,
      type,
      recipients,
      subject,
      content,
      htmlContent,
      templateId,
      variables = {},
      scheduledAt,
      timezone = 'UTC',
      isRecurring = false,
      recurringRule,
      recurringEndAt,
      name,
      createdById,
      campaignId,
    } = params;

    // Validate recipients
    if (!recipients || recipients.length === 0) {
      throw new AppError('At least one recipient is required', 400);
    }

    // Validate scheduled time is in the future
    if (new Date(scheduledAt) <= new Date()) {
      throw new AppError('Scheduled time must be in the future', 400);
    }

    // Validate content or templateId
    if (!content && !templateId) {
      throw new AppError('Either content or templateId is required', 400);
    }

    // Validate email has subject
    if (type === 'EMAIL' && !subject && !templateId) {
      throw new AppError('Subject is required for email messages', 400);
    }

    // Validate template if provided
    if (templateId) {
      const template = await prisma.messageTemplate.findFirst({
        where: { id: templateId, organizationId },
      });
      if (!template) {
        throw new AppError('Template not found', 404);
      }
      if (template.type !== type) {
        throw new AppError(`Template type (${template.type}) does not match message type (${type})`, 400);
      }
    }

    const scheduledMessage = await prisma.scheduledMessage.create({
      data: {
        organizationId,
        type,
        recipients: recipients as any,
        subject,
        content: content || '',
        htmlContent,
        templateId,
        variables: variables as any,
        scheduledAt: new Date(scheduledAt),
        timezone,
        isRecurring,
        recurringRule,
        recurringEndAt: recurringEndAt ? new Date(recurringEndAt) : null,
        nextRunAt: isRecurring ? new Date(scheduledAt) : null,
        name,
        createdById,
        campaignId,
        totalRecipients: recipients.length,
      },
    });

    return scheduledMessage;
  }

  /**
   * Get scheduled messages for organization
   */
  async getScheduledMessages(organizationId: string, options: {
    type?: ScheduledMessageType;
    status?: ScheduledMessageStatus;
    upcoming?: boolean;
    page?: number;
    limit?: number;
  } = {}) {
    const { type, status, upcoming, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const where: any = { organizationId };

    if (type) where.type = type;
    if (status) where.status = status;
    if (upcoming) {
      where.scheduledAt = { gte: new Date() };
      where.status = { in: ['PENDING', 'PAUSED'] };
    }

    const [messages, total] = await Promise.all([
      prisma.scheduledMessage.findMany({
        where,
        orderBy: { scheduledAt: 'asc' },
        skip,
        take: limit,
      }),
      prisma.scheduledMessage.count({ where }),
    ]);

    return {
      data: messages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get scheduled message by ID
   */
  async getScheduledMessageById(id: string, organizationId: string) {
    const message = await prisma.scheduledMessage.findFirst({
      where: { id, organizationId },
    });

    if (!message) {
      throw new AppError('Scheduled message not found', 404);
    }

    return message;
  }

  /**
   * Update scheduled message
   */
  async updateScheduledMessage(id: string, organizationId: string, data: UpdateScheduledMessageParams) {
    const message = await prisma.scheduledMessage.findFirst({
      where: { id, organizationId },
    });

    if (!message) {
      throw new AppError('Scheduled message not found', 404);
    }

    // Can only update pending or paused messages
    if (!['PENDING', 'PAUSED'].includes(message.status)) {
      throw new AppError('Cannot update a message that has been processed or cancelled', 400);
    }

    // Validate scheduled time if being updated
    if (data.scheduledAt && new Date(data.scheduledAt) <= new Date()) {
      throw new AppError('Scheduled time must be in the future', 400);
    }

    return prisma.scheduledMessage.update({
      where: { id },
      data: {
        ...data,
        recipients: data.recipients as any,
        variables: data.variables as any,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        recurringEndAt: data.recurringEndAt ? new Date(data.recurringEndAt) : undefined,
        totalRecipients: data.recipients?.length,
      },
    });
  }

  /**
   * Cancel scheduled message
   */
  async cancelScheduledMessage(id: string, organizationId: string) {
    const message = await prisma.scheduledMessage.findFirst({
      where: { id, organizationId },
    });

    if (!message) {
      throw new AppError('Scheduled message not found', 404);
    }

    if (!['PENDING', 'PAUSED'].includes(message.status)) {
      throw new AppError('Cannot cancel a message that has been processed', 400);
    }

    return prisma.scheduledMessage.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  /**
   * Pause scheduled message
   */
  async pauseScheduledMessage(id: string, organizationId: string) {
    const message = await prisma.scheduledMessage.findFirst({
      where: { id, organizationId },
    });

    if (!message) {
      throw new AppError('Scheduled message not found', 404);
    }

    if (message.status !== 'PENDING') {
      throw new AppError('Can only pause pending messages', 400);
    }

    return prisma.scheduledMessage.update({
      where: { id },
      data: { status: 'PAUSED' },
    });
  }

  /**
   * Resume paused message
   */
  async resumeScheduledMessage(id: string, organizationId: string) {
    const message = await prisma.scheduledMessage.findFirst({
      where: { id, organizationId },
    });

    if (!message) {
      throw new AppError('Scheduled message not found', 404);
    }

    if (message.status !== 'PAUSED') {
      throw new AppError('Can only resume paused messages', 400);
    }

    // If scheduled time has passed, require rescheduling
    if (new Date(message.scheduledAt) <= new Date()) {
      throw new AppError('Scheduled time has passed. Please reschedule the message.', 400);
    }

    return prisma.scheduledMessage.update({
      where: { id },
      data: { status: 'PENDING' },
    });
  }

  /**
   * Delete scheduled message
   */
  async deleteScheduledMessage(id: string, organizationId: string) {
    const message = await prisma.scheduledMessage.findFirst({
      where: { id, organizationId },
    });

    if (!message) {
      throw new AppError('Scheduled message not found', 404);
    }

    // Can only delete cancelled or completed messages, or pending ones
    if (message.status === 'PROCESSING') {
      throw new AppError('Cannot delete a message that is being processed', 400);
    }

    await prisma.scheduledMessage.delete({ where: { id } });
    return { success: true };
  }

  /**
   * Process due scheduled messages (called by cron job)
   */
  async processDueMessages() {
    const now = new Date();

    // Find all pending messages that are due
    const dueMessages = await prisma.scheduledMessage.findMany({
      where: {
        status: 'PENDING',
        scheduledAt: { lte: now },
      },
      take: 50, // Process in batches
    });

    const results = [];

    for (const message of dueMessages) {
      try {
        // Mark as processing
        await prisma.scheduledMessage.update({
          where: { id: message.id },
          data: { status: 'PROCESSING' },
        });

        // Process the message
        const result = await this.sendScheduledMessage(message);
        results.push({ id: message.id, success: true, ...result });

        // Handle recurring messages
        if (message.isRecurring && message.recurringRule) {
          const nextRun = this.calculateNextRun(message.scheduledAt, message.recurringRule);

          if (!message.recurringEndAt || nextRun <= message.recurringEndAt) {
            // Create next occurrence
            await prisma.scheduledMessage.update({
              where: { id: message.id },
              data: {
                status: 'COMPLETED',
                processedAt: now,
                sentCount: result.sent,
                failedCount: result.failed,
              },
            });

            // Schedule next run
            await this.createScheduledMessage({
              organizationId: message.organizationId,
              type: message.type,
              recipients: message.recipients as string[],
              subject: message.subject || undefined,
              content: message.content,
              htmlContent: message.htmlContent || undefined,
              templateId: message.templateId || undefined,
              variables: message.variables as Record<string, string>,
              scheduledAt: nextRun,
              timezone: message.timezone,
              isRecurring: true,
              recurringRule: message.recurringRule || undefined,
              recurringEndAt: message.recurringEndAt || undefined,
              name: message.name || undefined,
              createdById: message.createdById || undefined,
              campaignId: message.campaignId || undefined,
            });
          } else {
            // Recurring schedule ended
            await prisma.scheduledMessage.update({
              where: { id: message.id },
              data: {
                status: 'COMPLETED',
                processedAt: now,
                sentCount: result.sent,
                failedCount: result.failed,
              },
            });
          }
        } else {
          // Non-recurring - mark as completed
          await prisma.scheduledMessage.update({
            where: { id: message.id },
            data: {
              status: 'COMPLETED',
              processedAt: now,
              sentCount: result.sent,
              failedCount: result.failed,
            },
          });
        }
      } catch (error: any) {
        console.error(`Failed to process scheduled message ${message.id}:`, error);

        await prisma.scheduledMessage.update({
          where: { id: message.id },
          data: {
            status: 'FAILED',
            processedAt: now,
            errorMessage: error.message || 'Unknown error',
          },
        });

        results.push({ id: message.id, success: false, error: error.message });
      }
    }

    return { processed: dueMessages.length, results };
  }

  /**
   * Send a scheduled message
   */
  private async sendScheduledMessage(message: any): Promise<{ sent: number; failed: number }> {
    const recipients = message.recipients as string[];
    let sent = 0;
    let failed = 0;

    // Get content (from template or direct)
    let content = message.content;
    let subject = message.subject;
    let htmlContent = message.htmlContent;

    if (message.templateId) {
      try {
        const rendered = await templateService.renderTemplate(
          message.templateId,
          message.organizationId,
          message.variables as Record<string, string>
        );
        content = rendered.content;
        subject = rendered.subject || subject;
        htmlContent = rendered.htmlContent || htmlContent;
      } catch (error) {
        console.error('Template render error:', error);
        // Fall back to direct content
      }
    }

    // Get system user for logging
    const systemUser = await prisma.user.findFirst({
      where: { organizationId: message.organizationId },
      orderBy: { createdAt: 'asc' },
    });

    if (!systemUser) {
      throw new AppError('No user found in organization', 400);
    }

    // Send to each recipient
    for (const recipient of recipients) {
      try {
        switch (message.type) {
          case 'SMS':
            await this.sendSMS(recipient, content, systemUser.id, message.organizationId);
            sent++;
            break;

          case 'EMAIL':
            await this.sendEmail(recipient, subject, content, htmlContent, systemUser.id, message.organizationId);
            sent++;
            break;

          case 'WHATSAPP':
            await this.sendWhatsApp(recipient, content, systemUser.id, message.organizationId);
            sent++;
            break;
        }
      } catch (error) {
        console.error(`Failed to send to ${recipient}:`, error);
        failed++;
      }
    }

    return { sent, failed };
  }

  /**
   * Send SMS
   */
  private async sendSMS(to: string, message: string, userId: string, organizationId: string) {
    let result: { success: boolean; messageSid?: string } = { success: false };
    try {
      result = await exotelService.sendSMS({ to, body: message });
    } catch (error) {
      // Log anyway
    }

    await prisma.smsLog.create({
      data: {
        userId,
        phone: to,
        message,
        direction: 'OUTBOUND',
        status: result.success ? 'SENT' : 'FAILED',
        provider: 'EXOTEL',
        providerMsgId: result.messageSid || null,
      },
    });

    // Trigger webhook
    webhookService.trigger({
      organizationId,
      event: result.success ? WEBHOOK_EVENTS.SMS_SENT : WEBHOOK_EVENTS.SMS_FAILED,
      data: { to, message, scheduled: true },
    }).catch(console.error);
  }

  /**
   * Send Email
   */
  private async sendEmail(to: string, subject: string, body: string, html: string | null, userId: string, organizationId: string) {
    await prisma.emailLog.create({
      data: {
        userId,
        toEmail: to,
        subject: subject || 'No Subject',
        body: html || body,
        direction: 'OUTBOUND',
        status: 'PENDING',
      },
    });

    // Trigger webhook
    webhookService.trigger({
      organizationId,
      event: WEBHOOK_EVENTS.EMAIL_SENT,
      data: { to, subject, scheduled: true },
    }).catch(console.error);

    // Note: Actual email sending would go here
  }

  /**
   * Send WhatsApp
   */
  private async sendWhatsApp(to: string, message: string, userId: string, organizationId: string) {
    await prisma.whatsappLog.create({
      data: {
        userId,
        phone: to,
        message,
        direction: 'OUTBOUND',
        status: 'PENDING',
        provider: 'TWILIO',
      },
    });

    // Trigger webhook
    webhookService.trigger({
      organizationId,
      event: WEBHOOK_EVENTS.WHATSAPP_SENT,
      data: { to, message, scheduled: true },
    }).catch(console.error);

    // Note: Actual WhatsApp sending would go here
  }

  /**
   * Calculate next run time for recurring messages
   */
  private calculateNextRun(lastRun: Date, rule: string): Date {
    const next = new Date(lastRun);

    switch (rule.toLowerCase()) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'biweekly':
        next.setDate(next.getDate() + 14);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'quarterly':
        next.setMonth(next.getMonth() + 3);
        break;
      case 'yearly':
        next.setFullYear(next.getFullYear() + 1);
        break;
      default:
        // Try to parse as hours interval (e.g., "every_6_hours")
        const hourMatch = rule.match(/every_(\d+)_hours?/i);
        if (hourMatch) {
          next.setHours(next.getHours() + parseInt(hourMatch[1]));
        } else {
          // Default to daily
          next.setDate(next.getDate() + 1);
        }
    }

    return next;
  }

  /**
   * Get scheduled message stats
   */
  async getStats(organizationId: string) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(today);
    thisWeek.setDate(thisWeek.getDate() - 7);

    const [
      totalPending,
      totalCompleted,
      totalFailed,
      upcomingToday,
      upcomingThisWeek,
      recentCompleted,
    ] = await Promise.all([
      prisma.scheduledMessage.count({ where: { organizationId, status: 'PENDING' } }),
      prisma.scheduledMessage.count({ where: { organizationId, status: 'COMPLETED' } }),
      prisma.scheduledMessage.count({ where: { organizationId, status: 'FAILED' } }),
      prisma.scheduledMessage.count({
        where: {
          organizationId,
          status: 'PENDING',
          scheduledAt: { gte: now, lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.scheduledMessage.count({
        where: {
          organizationId,
          status: 'PENDING',
          scheduledAt: { gte: now, lt: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.scheduledMessage.findMany({
        where: { organizationId, status: 'COMPLETED', processedAt: { gte: thisWeek } },
        orderBy: { processedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          type: true,
          totalRecipients: true,
          sentCount: true,
          failedCount: true,
          processedAt: true,
        },
      }),
    ]);

    return {
      pending: totalPending,
      completed: totalCompleted,
      failed: totalFailed,
      upcomingToday,
      upcomingThisWeek,
      recentCompleted,
    };
  }
}

export const scheduledMessageService = new ScheduledMessageService();
