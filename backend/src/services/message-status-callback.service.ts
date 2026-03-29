import { MessageDeliveryStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { webhookService, WEBHOOK_EVENTS } from './webhook.service';
import { conversationService } from './conversation.service';
import { withRetry, webhookRetryQueue, RetryQueueItem } from '../utils/retry';


// Configuration for retry behavior
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

interface StatusUpdatePayload {
  externalId: string;
  status: MessageDeliveryStatus;
  errorCode?: string;
  errorMessage?: string;
  timestamp?: string;
  provider: 'twilio' | 'plivo' | 'whatsapp' | 'email' | 'custom';
  rawPayload?: any;
}

interface TwilioStatusCallback {
  MessageSid: string;
  MessageStatus: string;
  ErrorCode?: string;
  ErrorMessage?: string;
  To?: string;
  From?: string;
}

interface PlivoStatusCallback {
  MessageUUID: string;
  Status: string;
  ErrorCode?: string;
  To?: string;
  From?: string;
}

interface WhatsAppStatusCallback {
  entry: Array<{
    changes: Array<{
      value: {
        statuses?: Array<{
          id: string;
          status: string;
          timestamp: string;
          errors?: Array<{ code: number; title: string }>;
        }>;
      };
    }>;
  }>;
}

class MessageStatusCallbackService {
  /**
   * Map provider status to internal status
   */
  private mapStatus(provider: string, status: string): MessageDeliveryStatus {
    const statusMap: Record<string, Record<string, MessageDeliveryStatus>> = {
      twilio: {
        queued: 'PENDING',
        sending: 'SENT',
        sent: 'SENT',
        delivered: 'DELIVERED',
        undelivered: 'FAILED',
        failed: 'FAILED',
        read: 'READ',
      },
      plivo: {
        queued: 'PENDING',
        sent: 'SENT',
        delivered: 'DELIVERED',
        undelivered: 'FAILED',
        failed: 'FAILED',
        rejected: 'FAILED',
      },
      whatsapp: {
        sent: 'SENT',
        delivered: 'DELIVERED',
        read: 'READ',
        failed: 'FAILED',
      },
      email: {
        sent: 'SENT',
        delivered: 'DELIVERED',
        opened: 'READ',
        bounced: 'FAILED',
        failed: 'FAILED',
      },
    };

    return statusMap[provider]?.[status.toLowerCase()] || 'PENDING';
  }

  /**
   * Process status update and trigger webhooks with retry logic
   */
  async processStatusUpdate(payload: StatusUpdatePayload) {
    const { externalId, status, errorCode, errorMessage, provider, rawPayload } = payload;

    try {
      // Find message by external ID with retry
      const message = await withRetry(
        () => conversationService.findMessageByExternalId(externalId),
        {
          ...RETRY_CONFIG,
          onRetry: (error, attempt, delay) => {
            console.warn(`[MessageStatus] Retry ${attempt} finding message ${externalId}, delay: ${delay}ms`, error.message);
          },
        }
      );

      if (!message) {
        // Message might not exist yet (webhook arrived before DB write)
        // Queue for retry
        console.warn(`[MessageStatus] Message not found for external ID: ${externalId}, queueing for retry`);
        webhookRetryQueue.add(`status-${externalId}`, payload);
        return { success: false, error: 'Message not found, queued for retry', queued: true };
      }

      // Update message status with retry
      const result = await withRetry(
        () => conversationService.updateMessageStatus({
          messageId: message.id,
          status,
          externalId,
          errorCode,
          errorMessage,
        }),
        RETRY_CONFIG
      );

      // Record raw payload in status update
      await withRetry(
        () => prisma.messageStatusUpdate.update({
          where: { id: result.statusUpdate.id },
          data: { providerData: rawPayload || {} },
        }),
        RETRY_CONFIG
      );

      // Trigger webhook based on status and channel
      const conversation = message.conversation;
      if (conversation) {
        try {
          await this.triggerStatusWebhookWithRetry(
            conversation.organizationId,
            conversation.channel,
            status,
            {
              messageId: message.id,
              conversationId: conversation.id,
              externalId,
              status,
              errorCode,
              errorMessage,
              leadId: conversation.leadId,
              contactPhone: conversation.contactPhone,
              contactEmail: conversation.contactEmail,
              timestamp: new Date().toISOString(),
            }
          );
        } catch (webhookError) {
          // Don't fail the whole operation if webhook fails
          console.error(`[MessageStatus] Webhook trigger failed for ${externalId}:`, webhookError);
        }
      }

      return { success: true, message: result.message };
    } catch (error: any) {
      console.error(`[MessageStatus] Failed to process status update for ${externalId}:`, error);

      // Queue for retry on failure
      webhookRetryQueue.add(`status-${externalId}`, payload);

      return {
        success: false,
        error: error.message,
        queued: true,
      };
    }
  }

  /**
   * Trigger status webhook based on channel and status
   */
  private async triggerStatusWebhook(
    organizationId: string,
    channel: string,
    status: MessageDeliveryStatus,
    data: any
  ) {
    const eventMap: Record<string, Record<string, string>> = {
      SMS: {
        SENT: WEBHOOK_EVENTS.SMS_SENT,
        DELIVERED: WEBHOOK_EVENTS.SMS_DELIVERED,
        FAILED: WEBHOOK_EVENTS.SMS_FAILED,
      },
      WHATSAPP: {
        SENT: WEBHOOK_EVENTS.WHATSAPP_SENT,
        DELIVERED: WEBHOOK_EVENTS.WHATSAPP_DELIVERED,
        READ: WEBHOOK_EVENTS.WHATSAPP_READ,
        FAILED: WEBHOOK_EVENTS.WHATSAPP_FAILED,
      },
      EMAIL: {
        SENT: WEBHOOK_EVENTS.EMAIL_SENT,
        DELIVERED: WEBHOOK_EVENTS.EMAIL_DELIVERED,
        READ: WEBHOOK_EVENTS.EMAIL_OPENED,
        BOUNCED: WEBHOOK_EVENTS.EMAIL_BOUNCED,
        FAILED: WEBHOOK_EVENTS.EMAIL_FAILED,
      },
    };

    const event = eventMap[channel]?.[status];
    if (event) {
      await webhookService.trigger({
        organizationId,
        event: event as any,
        data,
      });
    }
  }

  /**
   * Trigger status webhook with retry logic
   */
  private async triggerStatusWebhookWithRetry(
    organizationId: string,
    channel: string,
    status: MessageDeliveryStatus,
    data: any
  ) {
    await withRetry(
      () => this.triggerStatusWebhook(organizationId, channel, status, data),
      {
        ...RETRY_CONFIG,
        maxRetries: 5,
        onRetry: (error, attempt, delay) => {
          console.warn(
            `[MessageStatus] Webhook retry ${attempt} for ${data.messageId}, delay: ${delay}ms`,
            error.message
          );
        },
      }
    );
  }

  /**
   * Handle Twilio status callback
   */
  async handleTwilioCallback(payload: TwilioStatusCallback) {
    const status = this.mapStatus('twilio', payload.MessageStatus);

    return this.processStatusUpdate({
      externalId: payload.MessageSid,
      status,
      errorCode: payload.ErrorCode,
      errorMessage: payload.ErrorMessage,
      provider: 'twilio',
      rawPayload: payload,
    });
  }

  /**
   * Handle Plivo status callback
   */
  async handlePlivoCallback(payload: PlivoStatusCallback) {
    const status = this.mapStatus('plivo', payload.Status);

    return this.processStatusUpdate({
      externalId: payload.MessageUUID,
      status,
      errorCode: payload.ErrorCode,
      provider: 'plivo',
      rawPayload: payload,
    });
  }

  /**
   * Handle WhatsApp status callback
   */
  async handleWhatsAppCallback(payload: WhatsAppStatusCallback) {
    const results: any[] = [];

    for (const entry of payload.entry || []) {
      for (const change of entry.changes || []) {
        for (const statusUpdate of change.value.statuses || []) {
          const status = this.mapStatus('whatsapp', statusUpdate.status);
          const error = statusUpdate.errors?.[0];

          const result = await this.processStatusUpdate({
            externalId: statusUpdate.id,
            status,
            errorCode: error?.code?.toString(),
            errorMessage: error?.title,
            timestamp: statusUpdate.timestamp,
            provider: 'whatsapp',
            rawPayload: statusUpdate,
          });

          results.push(result);
        }
      }
    }

    return { success: true, processed: results.length, results };
  }

  /**
   * Handle email status callback (generic format)
   */
  async handleEmailCallback(payload: {
    messageId: string;
    event: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';
    errorCode?: string;
    errorMessage?: string;
    metadata?: any;
  }) {
    const status = this.mapStatus('email', payload.event);

    return this.processStatusUpdate({
      externalId: payload.messageId,
      status,
      errorCode: payload.errorCode,
      errorMessage: payload.errorMessage,
      provider: 'email',
      rawPayload: payload,
    });
  }

  /**
   * Get status update history for a message
   */
  async getMessageStatusHistory(messageId: string) {
    const updates = await prisma.messageStatusUpdate.findMany({
      where: { messageId },
      orderBy: { timestamp: 'asc' },
    });

    return updates;
  }

  /**
   * Get all status updates for organization (for debugging/monitoring)
   */
  async getRecentStatusUpdates(
    organizationId: string,
    options: { page?: number; limit?: number; status?: MessageDeliveryStatus } = {}
  ) {
    const { page = 1, limit = 50, status } = options;

    // Get message IDs for this org
    const conversations = await prisma.conversation.findMany({
      where: { organizationId },
      select: { id: true },
    });

    const conversationIds = conversations.map(c => c.id);

    const where: any = {
      message: {
        conversationId: { in: conversationIds },
      },
    };

    if (status) {
      where.status = status;
    }

    const [updates, total] = await Promise.all([
      prisma.messageStatusUpdate.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { timestamp: 'desc' },
        include: {
          message: {
            select: {
              id: true,
              externalId: true,
              direction: true,
              content: true,
              conversation: {
                select: {
                  id: true,
                  channel: true,
                  contactPhone: true,
                  contactEmail: true,
                },
              },
            },
          },
        },
      }),
      prisma.messageStatusUpdate.count({ where }),
    ]);

    return {
      data: updates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Mark status update webhook as sent
   */
  async markWebhookSent(statusUpdateId: string) {
    await prisma.messageStatusUpdate.update({
      where: { id: statusUpdateId },
      data: { webhookSent: true },
    });
  }

  /**
   * Get pending webhook notifications
   */
  async getPendingWebhooks() {
    return prisma.messageStatusUpdate.findMany({
      where: { webhookSent: false },
      include: {
        message: {
          include: {
            conversation: {
              select: {
                organizationId: true,
                channel: true,
                leadId: true,
                contactPhone: true,
                contactEmail: true,
              },
            },
          },
        },
      },
      orderBy: { timestamp: 'asc' },
      take: 100,
    });
  }

  /**
   * Process pending webhooks (for cron job)
   */
  async processPendingWebhooks() {
    const pending = await this.getPendingWebhooks();
    let processed = 0;
    let failed = 0;

    for (const update of pending) {
      if (!update.message?.conversation) continue;

      const conversation = update.message.conversation;

      try {
        await this.triggerStatusWebhookWithRetry(
          conversation.organizationId,
          conversation.channel,
          update.status,
          {
            messageId: update.messageId,
            conversationId: update.message.conversationId,
            externalId: update.message.externalId,
            status: update.status,
            errorCode: update.errorCode,
            errorMessage: update.errorMessage,
            leadId: conversation.leadId,
            contactPhone: conversation.contactPhone,
            contactEmail: conversation.contactEmail,
            timestamp: update.timestamp.toISOString(),
          }
        );

        await this.markWebhookSent(update.id);
        processed++;
      } catch (error: any) {
        console.error(`[MessageStatus] Failed to process pending webhook ${update.id}:`, error.message);
        failed++;
      }
    }

    return { processed, failed, total: pending.length };
  }

  /**
   * Initialize retry queue processor
   */
  initializeRetryQueue() {
    webhookRetryQueue.startProcessing(async (item: RetryQueueItem<StatusUpdatePayload>) => {
      console.info(`[MessageStatus] Processing retry queue item: ${item.id}`);
      const result = await this.processStatusUpdate(item.data);
      return result.success;
    });
    console.info('[MessageStatus] Retry queue processor initialized');
  }

  /**
   * Get retry queue statistics
   */
  getRetryQueueStats() {
    return webhookRetryQueue.getStats();
  }

  /**
   * Shutdown retry queue
   */
  shutdownRetryQueue() {
    webhookRetryQueue.stopProcessing();
  }
}

export const messageStatusCallbackService = new MessageStatusCallbackService();

// Initialize retry queue on module load (can be disabled in tests)
if (process.env.NODE_ENV !== 'test') {
  messageStatusCallbackService.initializeRetryQueue();
}
