import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import { AppError } from '../utils/errors';

const prisma = new PrismaClient();

// Webhook Event Types
export const WEBHOOK_EVENTS = {
  // Lead events
  LEAD_CREATED: 'lead.created',
  LEAD_UPDATED: 'lead.updated',
  LEAD_DELETED: 'lead.deleted',
  LEAD_CONVERTED: 'lead.converted',
  LEAD_ASSIGNED: 'lead.assigned',

  // Call events
  CALL_STARTED: 'call.started',
  CALL_ENDED: 'call.ended',
  CALL_FAILED: 'call.failed',
  CALL_TRANSFERRED: 'call.transferred',

  // Session events
  SESSION_CREATED: 'session.created',
  SESSION_MESSAGE: 'session.message',
  SESSION_ENDED: 'session.ended',

  // SMS events
  SMS_SENT: 'sms.sent',
  SMS_DELIVERED: 'sms.delivered',
  SMS_FAILED: 'sms.failed',
  SMS_RECEIVED: 'sms.received',

  // WhatsApp events
  WHATSAPP_SENT: 'whatsapp.sent',
  WHATSAPP_DELIVERED: 'whatsapp.delivered',
  WHATSAPP_READ: 'whatsapp.read',
  WHATSAPP_FAILED: 'whatsapp.failed',
  WHATSAPP_RECEIVED: 'whatsapp.received',

  // Email events
  EMAIL_SENT: 'email.sent',
  EMAIL_DELIVERED: 'email.delivered',
  EMAIL_OPENED: 'email.opened',
  EMAIL_CLICKED: 'email.clicked',
  EMAIL_BOUNCED: 'email.bounced',
  EMAIL_FAILED: 'email.failed',

  // Campaign events
  CAMPAIGN_STARTED: 'campaign.started',
  CAMPAIGN_COMPLETED: 'campaign.completed',
  CAMPAIGN_PAUSED: 'campaign.paused',

  // Agent events
  AGENT_CREATED: 'agent.created',
  AGENT_UPDATED: 'agent.updated',
} as const;

export type WebhookEvent = typeof WEBHOOK_EVENTS[keyof typeof WEBHOOK_EVENTS];

interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: any;
  organizationId: string;
}

interface CreateWebhookParams {
  organizationId: string;
  name: string;
  url: string;
  events: WebhookEvent[];
  description?: string;
}

interface TriggerWebhookParams {
  organizationId: string;
  event: WebhookEvent;
  data: any;
}

class WebhookService {
  private readonly MAX_RETRIES = 5;
  private readonly RETRY_DELAYS = [60, 300, 900, 3600, 7200]; // seconds: 1min, 5min, 15min, 1hr, 2hr

  /**
   * Create a new webhook
   */
  async createWebhook(params: CreateWebhookParams) {
    const { organizationId, name, url, events, description } = params;

    // Validate URL
    try {
      new URL(url);
    } catch {
      throw new AppError('Invalid webhook URL', 400);
    }

    // Generate secret for HMAC signing
    const secret = this.generateSecret();

    const webhook = await prisma.apiWebhook.create({
      data: {
        organizationId,
        name,
        url,
        secret,
        events: events as any,
      },
    });

    return {
      id: webhook.id,
      name: webhook.name,
      url: webhook.url,
      secret: webhook.secret, // Show secret only at creation
      events: webhook.events,
      isActive: webhook.isActive,
      createdAt: webhook.createdAt,
    };
  }

  /**
   * Get webhooks for organization
   */
  async getWebhooks(organizationId: string) {
    return prisma.apiWebhook.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        url: true,
        events: true,
        isActive: true,
        successCount: true,
        failureCount: true,
        lastTriggeredAt: true,
        lastError: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Get webhook by ID
   */
  async getWebhookById(id: string, organizationId: string) {
    const webhook = await prisma.apiWebhook.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        name: true,
        url: true,
        events: true,
        isActive: true,
        successCount: true,
        failureCount: true,
        lastTriggeredAt: true,
        lastError: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!webhook) {
      throw new AppError('Webhook not found', 404);
    }

    return webhook;
  }

  /**
   * Update webhook
   */
  async updateWebhook(id: string, organizationId: string, data: {
    name?: string;
    url?: string;
    events?: WebhookEvent[];
    isActive?: boolean;
  }) {
    const webhook = await prisma.apiWebhook.findFirst({
      where: { id, organizationId },
    });

    if (!webhook) {
      throw new AppError('Webhook not found', 404);
    }

    if (data.url) {
      try {
        new URL(data.url);
      } catch {
        throw new AppError('Invalid webhook URL', 400);
      }
    }

    return prisma.apiWebhook.update({
      where: { id },
      data: {
        ...data,
        events: data.events as any,
      },
      select: {
        id: true,
        name: true,
        url: true,
        events: true,
        isActive: true,
        successCount: true,
        failureCount: true,
        lastTriggeredAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(id: string, organizationId: string) {
    const webhook = await prisma.apiWebhook.findFirst({
      where: { id, organizationId },
    });

    if (!webhook) {
      throw new AppError('Webhook not found', 404);
    }

    await prisma.apiWebhook.delete({ where: { id } });
    return { success: true };
  }

  /**
   * Regenerate webhook secret
   */
  async regenerateSecret(id: string, organizationId: string) {
    const webhook = await prisma.apiWebhook.findFirst({
      where: { id, organizationId },
    });

    if (!webhook) {
      throw new AppError('Webhook not found', 404);
    }

    const newSecret = this.generateSecret();

    await prisma.apiWebhook.update({
      where: { id },
      data: { secret: newSecret },
    });

    return { id, secret: newSecret };
  }

  /**
   * Trigger webhooks for an event
   */
  async trigger(params: TriggerWebhookParams) {
    const { organizationId, event, data } = params;

    // Find all active webhooks subscribed to this event
    const webhooks = await prisma.apiWebhook.findMany({
      where: {
        organizationId,
        isActive: true,
      },
    });

    // Filter webhooks that are subscribed to this event
    const subscribedWebhooks = webhooks.filter(webhook => {
      const events = webhook.events as string[];
      return events.includes(event) || events.includes('*');
    });

    if (subscribedWebhooks.length === 0) {
      return { triggered: 0 };
    }

    const eventId = this.generateEventId();
    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
      organizationId,
    };

    // Create delivery logs and trigger webhooks
    const deliveryPromises = subscribedWebhooks.map(async (webhook) => {
      // Create delivery log
      const deliveryLog = await prisma.webhookDeliveryLog.create({
        data: {
          webhookId: webhook.id,
          eventType: event,
          eventId,
          payload: payload as any,
          status: 'PENDING',
        },
      });

      // Attempt delivery (fire and forget for now)
      this.deliverWebhook(webhook, deliveryLog.id, payload).catch(err => {
        console.error(`Webhook delivery error: ${err.message}`);
      });

      return deliveryLog.id;
    });

    const deliveryIds = await Promise.all(deliveryPromises);

    return {
      triggered: subscribedWebhooks.length,
      deliveryIds,
      eventId,
    };
  }

  /**
   * Deliver webhook
   */
  private async deliverWebhook(
    webhook: any,
    deliveryLogId: string,
    payload: WebhookPayload
  ) {
    const startTime = Date.now();
    const signature = this.signPayload(payload, webhook.secret);

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': payload.event,
          'X-Webhook-Delivery-Id': deliveryLogId,
          'X-Webhook-Timestamp': payload.timestamp,
          'User-Agent': 'CRM-Webhook/1.0',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      const responseTime = Date.now() - startTime;
      const responseBody = await response.text().catch(() => '');

      if (response.ok) {
        // Success
        await prisma.$transaction([
          prisma.webhookDeliveryLog.update({
            where: { id: deliveryLogId },
            data: {
              status: 'DELIVERED',
              statusCode: response.status,
              responseBody: responseBody.substring(0, 1000), // Limit response size
              responseTime,
              deliveredAt: new Date(),
            },
          }),
          prisma.apiWebhook.update({
            where: { id: webhook.id },
            data: {
              successCount: { increment: 1 },
              lastTriggeredAt: new Date(),
              lastError: null,
            },
          }),
        ]);
      } else {
        // HTTP error - schedule retry
        await this.handleDeliveryFailure(
          webhook,
          deliveryLogId,
          `HTTP ${response.status}: ${responseBody.substring(0, 200)}`,
          response.status,
          responseTime
        );
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      await this.handleDeliveryFailure(
        webhook,
        deliveryLogId,
        error.message || 'Unknown error',
        null,
        responseTime
      );
    }
  }

  /**
   * Handle delivery failure
   */
  private async handleDeliveryFailure(
    webhook: any,
    deliveryLogId: string,
    error: string,
    statusCode: number | null,
    responseTime: number
  ) {
    const deliveryLog = await prisma.webhookDeliveryLog.findUnique({
      where: { id: deliveryLogId },
    });

    if (!deliveryLog) return;

    const attempt = deliveryLog.attempt;
    const maxAttempts = deliveryLog.maxAttempts;

    if (attempt >= maxAttempts) {
      // Max retries reached - mark as failed
      await prisma.$transaction([
        prisma.webhookDeliveryLog.update({
          where: { id: deliveryLogId },
          data: {
            status: 'FAILED',
            statusCode,
            error,
            responseTime,
          },
        }),
        prisma.apiWebhook.update({
          where: { id: webhook.id },
          data: {
            failureCount: { increment: 1 },
            lastTriggeredAt: new Date(),
            lastError: error,
          },
        }),
      ]);
    } else {
      // Schedule retry
      const delaySeconds = this.RETRY_DELAYS[attempt - 1] || 3600;
      const nextRetryAt = new Date(Date.now() + delaySeconds * 1000);

      await prisma.webhookDeliveryLog.update({
        where: { id: deliveryLogId },
        data: {
          status: 'RETRYING',
          attempt: attempt + 1,
          statusCode,
          error,
          responseTime,
          nextRetryAt,
        },
      });
    }
  }

  /**
   * Process pending retries (call this from a cron job)
   */
  async processRetries() {
    const pendingRetries = await prisma.webhookDeliveryLog.findMany({
      where: {
        status: 'RETRYING',
        nextRetryAt: { lte: new Date() },
      },
      include: {
        webhook: true,
      },
      take: 100,
    });

    for (const delivery of pendingRetries) {
      if (delivery.webhook.isActive) {
        this.deliverWebhook(
          delivery.webhook,
          delivery.id,
          delivery.payload as unknown as WebhookPayload
        ).catch(err => {
          console.error(`Retry delivery error: ${err.message}`);
        });
      }
    }

    return { processed: pendingRetries.length };
  }

  /**
   * Get delivery logs for a webhook
   */
  async getDeliveryLogs(webhookId: string, organizationId: string, options: {
    page?: number;
    limit?: number;
    status?: string;
  } = {}) {
    // Verify webhook belongs to org
    const webhook = await prisma.apiWebhook.findFirst({
      where: { id: webhookId, organizationId },
    });

    if (!webhook) {
      throw new AppError('Webhook not found', 404);
    }

    const { page = 1, limit = 20, status } = options;
    const skip = (page - 1) * limit;

    const where: any = { webhookId };
    if (status) {
      where.status = status;
    }

    const [logs, total] = await Promise.all([
      prisma.webhookDeliveryLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          eventType: true,
          eventId: true,
          attempt: true,
          maxAttempts: true,
          statusCode: true,
          responseTime: true,
          status: true,
          error: true,
          nextRetryAt: true,
          createdAt: true,
          deliveredAt: true,
        },
      }),
      prisma.webhookDeliveryLog.count({ where }),
    ]);

    return {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get delivery log details
   */
  async getDeliveryLogDetail(logId: string, organizationId: string) {
    const log = await prisma.webhookDeliveryLog.findUnique({
      where: { id: logId },
      include: {
        webhook: {
          select: { organizationId: true },
        },
      },
    });

    if (!log || log.webhook.organizationId !== organizationId) {
      throw new AppError('Delivery log not found', 404);
    }

    return {
      id: log.id,
      eventType: log.eventType,
      eventId: log.eventId,
      payload: log.payload,
      attempt: log.attempt,
      maxAttempts: log.maxAttempts,
      statusCode: log.statusCode,
      responseBody: log.responseBody,
      responseTime: log.responseTime,
      status: log.status,
      error: log.error,
      nextRetryAt: log.nextRetryAt,
      createdAt: log.createdAt,
      deliveredAt: log.deliveredAt,
    };
  }

  /**
   * Retry a failed delivery
   */
  async retryDelivery(logId: string, organizationId: string) {
    const log = await prisma.webhookDeliveryLog.findUnique({
      where: { id: logId },
      include: { webhook: true },
    });

    if (!log || log.webhook.organizationId !== organizationId) {
      throw new AppError('Delivery log not found', 404);
    }

    if (log.status === 'DELIVERED') {
      throw new AppError('Cannot retry a successfully delivered webhook', 400);
    }

    // Reset for retry
    await prisma.webhookDeliveryLog.update({
      where: { id: logId },
      data: {
        status: 'PENDING',
        attempt: 1,
        error: null,
        nextRetryAt: null,
      },
    });

    // Trigger delivery
    this.deliverWebhook(
      log.webhook,
      logId,
      log.payload as unknown as WebhookPayload
    ).catch(err => {
      console.error(`Manual retry error: ${err.message}`);
    });

    return { success: true, message: 'Retry initiated' };
  }

  /**
   * Test webhook
   */
  async testWebhook(id: string, organizationId: string) {
    const webhook = await prisma.apiWebhook.findFirst({
      where: { id, organizationId },
    });

    if (!webhook) {
      throw new AppError('Webhook not found', 404);
    }

    const testPayload: WebhookPayload = {
      event: 'test' as any,
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook delivery',
        webhookId: webhook.id,
        webhookName: webhook.name,
      },
      organizationId,
    };

    const eventId = this.generateEventId();
    const deliveryLog = await prisma.webhookDeliveryLog.create({
      data: {
        webhookId: webhook.id,
        eventType: 'test',
        eventId,
        payload: testPayload as any,
        status: 'PENDING',
      },
    });

    // Deliver synchronously for test
    await this.deliverWebhook(webhook, deliveryLog.id, testPayload);

    // Get updated delivery log
    const result = await prisma.webhookDeliveryLog.findUnique({
      where: { id: deliveryLog.id },
    });

    return {
      success: result?.status === 'DELIVERED',
      deliveryId: deliveryLog.id,
      status: result?.status,
      statusCode: result?.statusCode,
      responseTime: result?.responseTime,
      error: result?.error,
    };
  }

  /**
   * Get available event types
   */
  getEventTypes() {
    return Object.entries(WEBHOOK_EVENTS).map(([key, value]) => ({
      key,
      event: value,
      category: value.split('.')[0],
      description: this.getEventDescription(value),
    }));
  }

  /**
   * Generate webhook secret
   */
  private generateSecret(): string {
    return 'whsec_' + crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate event ID
   */
  private generateEventId(): string {
    return 'evt_' + crypto.randomBytes(16).toString('hex');
  }

  /**
   * Sign payload with HMAC
   */
  private signPayload(payload: any, secret: string): string {
    const payloadString = JSON.stringify(payload);
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payloadString);
    return 'sha256=' + hmac.digest('hex');
  }

  /**
   * Verify webhook signature (for external use)
   */
  verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = 'sha256=' + crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Get event description
   */
  private getEventDescription(event: string): string {
    const descriptions: Record<string, string> = {
      'lead.created': 'Triggered when a new lead is created',
      'lead.updated': 'Triggered when a lead is updated',
      'lead.deleted': 'Triggered when a lead is deleted',
      'lead.converted': 'Triggered when a lead is converted',
      'lead.assigned': 'Triggered when a lead is assigned to a user',
      'call.started': 'Triggered when an outbound call starts',
      'call.ended': 'Triggered when a call ends',
      'call.failed': 'Triggered when a call fails',
      'call.transferred': 'Triggered when a call is transferred',
      'session.created': 'Triggered when a new AI session starts',
      'session.message': 'Triggered when a message is sent in a session',
      'session.ended': 'Triggered when an AI session ends',
      'sms.sent': 'Triggered when an SMS is sent',
      'sms.delivered': 'Triggered when an SMS is delivered',
      'sms.failed': 'Triggered when an SMS fails',
      'sms.received': 'Triggered when an SMS is received',
      'whatsapp.sent': 'Triggered when a WhatsApp message is sent',
      'whatsapp.delivered': 'Triggered when a WhatsApp message is delivered',
      'whatsapp.read': 'Triggered when a WhatsApp message is read',
      'whatsapp.failed': 'Triggered when a WhatsApp message fails',
      'whatsapp.received': 'Triggered when a WhatsApp message is received',
      'email.sent': 'Triggered when an email is sent',
      'email.delivered': 'Triggered when an email is delivered',
      'email.opened': 'Triggered when an email is opened',
      'email.clicked': 'Triggered when a link in an email is clicked',
      'email.bounced': 'Triggered when an email bounces',
      'email.failed': 'Triggered when an email fails to send',
      'campaign.started': 'Triggered when a campaign starts',
      'campaign.completed': 'Triggered when a campaign completes',
      'campaign.paused': 'Triggered when a campaign is paused',
      'agent.created': 'Triggered when a new AI agent is created',
      'agent.updated': 'Triggered when an AI agent is updated',
    };
    return descriptions[event] || event;
  }
}

export const webhookService = new WebhookService();
