/**
 * Tawk.to Chat Widget Integration Service
 *
 * Handles integration with Tawk.to live chat:
 * - Webhook notifications for new chats/tickets
 * - REST API for fetching chat transcripts
 * - Lead capture from chat conversations
 *
 * Tawk.to is a free live chat widget widely used for customer support.
 */

import { prisma } from '../config/database';
import { TawkToIntegration } from '@prisma/client';
import { externalLeadImportService, ExternalLeadData } from '../services/external-lead-import.service';
import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';

// Tawk.to API endpoint
const TAWKTO_API_URL = 'https://api.tawk.to/v3';

// Tawk.to webhook event types
export type TawkToEventType =
  | 'chat:start'
  | 'chat:end'
  | 'chat:message'
  | 'ticket:create'
  | 'ticket:update'
  | 'visitor:prechat';

// Tawk.to webhook payload structure
export interface TawkToWebhookPayload {
  event: TawkToEventType;
  chatId?: string;
  ticketId?: string;
  time?: string;
  property?: {
    id: string;
    name: string;
  };
  visitor?: {
    name?: string;
    email?: string;
    phone?: string;
    city?: string;
    country?: string;
    customFields?: Record<string, any>;
  };
  message?: {
    text: string;
    sender: 'agent' | 'visitor';
    time: string;
  };
  chat?: {
    id: string;
    startTime: string;
    endTime?: string;
    messages?: Array<{
      text: string;
      sender: 'agent' | 'visitor';
      time: string;
    }>;
    duration?: number;
    rating?: number;
    tags?: string[];
  };
  ticket?: {
    id: string;
    subject: string;
    message: string;
    status: string;
    priority: string;
  };
  prechatData?: {
    name?: string;
    email?: string;
    phone?: string;
    question?: string;
    customFields?: Record<string, any>;
  };
  [key: string]: any;
}

// Default field mapping from Tawk.to to CRM
export const DEFAULT_TAWKTO_FIELD_MAPPING: Record<string, string> = {
  'visitor.name': 'firstName',
  'visitor.email': 'email',
  'visitor.phone': 'phone',
  'visitor.city': 'city',
  'visitor.country': 'customFields.country',
  'chat.id': 'customFields.tawkChatId',
  'ticket.id': 'customFields.tawkTicketId',
  'ticket.subject': 'customFields.enquiry',
};

interface ProcessWebhookResult {
  success: boolean;
  rawImportRecordId?: string;
  message: string;
  isDuplicate?: boolean;
  eventType?: string;
}

class TawkToService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: TAWKTO_API_URL,
      timeout: 30000,
    });
  }

  /**
   * Create or update Tawk.to integration for an organization
   */
  async setupIntegration(
    organizationId: string,
    config: {
      propertyId: string;
      widgetId?: string;
      apiKey: string;
      webhookSecret?: string;
      captureAsLead?: boolean;
      captureOffline?: boolean;
      syncTranscripts?: boolean;
      fieldMapping?: Record<string, string>;
      autoAssign?: boolean;
      defaultAssigneeId?: string;
      routingRuleId?: string;
    }
  ): Promise<TawkToIntegration> {
    const existing = await prisma.tawkToIntegration.findUnique({
      where: { organizationId },
    });

    if (existing) {
      return prisma.tawkToIntegration.update({
        where: { organizationId },
        data: {
          propertyId: config.propertyId,
          widgetId: config.widgetId,
          apiKey: config.apiKey,
          webhookSecret: config.webhookSecret,
          captureAsLead: config.captureAsLead ?? true,
          captureOffline: config.captureOffline ?? true,
          syncTranscripts: config.syncTranscripts ?? true,
          fieldMapping: config.fieldMapping || undefined,
          autoAssign: config.autoAssign ?? true,
          defaultAssigneeId: config.defaultAssigneeId,
          routingRuleId: config.routingRuleId,
        },
      });
    }

    return prisma.tawkToIntegration.create({
      data: {
        organizationId,
        propertyId: config.propertyId,
        widgetId: config.widgetId,
        apiKey: config.apiKey,
        webhookSecret: config.webhookSecret,
        captureAsLead: config.captureAsLead ?? true,
        captureOffline: config.captureOffline ?? true,
        syncTranscripts: config.syncTranscripts ?? true,
        fieldMapping: config.fieldMapping || undefined,
        autoAssign: config.autoAssign ?? true,
        defaultAssigneeId: config.defaultAssigneeId,
        routingRuleId: config.routingRuleId,
      },
    });
  }

  /**
   * Get integration by property ID
   */
  async getIntegrationByPropertyId(propertyId: string): Promise<TawkToIntegration | null> {
    return prisma.tawkToIntegration.findFirst({
      where: {
        propertyId,
        isActive: true,
      },
    });
  }

  /**
   * Get integration for organization
   */
  async getIntegration(organizationId: string): Promise<TawkToIntegration | null> {
    return prisma.tawkToIntegration.findUnique({
      where: { organizationId },
    });
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(
    payload: string,
    signature: string,
    webhookSecret: string
  ): boolean {
    if (!webhookSecret) return true;

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature || ''),
        Buffer.from(expectedSignature)
      );
    } catch {
      return false;
    }
  }

  /**
   * Extract visitor info from payload
   */
  private extractVisitorInfo(payload: TawkToWebhookPayload): {
    name?: string;
    email?: string;
    phone?: string;
    city?: string;
    customFields?: Record<string, any>;
  } {
    // Try different locations for visitor data
    const visitor = payload.visitor || {};
    const prechat = payload.prechatData || {};

    return {
      name: visitor.name || prechat.name,
      email: visitor.email || prechat.email,
      phone: visitor.phone || prechat.phone,
      city: visitor.city,
      customFields: {
        ...(visitor.customFields || {}),
        ...(prechat.customFields || {}),
        question: prechat.question,
      },
    };
  }

  /**
   * Should this event create a lead?
   */
  private shouldCreateLead(
    event: TawkToEventType,
    integration: TawkToIntegration
  ): boolean {
    if (!integration.captureAsLead) return false;

    switch (event) {
      case 'chat:end':
        return true;
      case 'ticket:create':
        return integration.captureOffline;
      case 'visitor:prechat':
        return true;
      default:
        return false;
    }
  }

  /**
   * Process incoming webhook from Tawk.to
   */
  async processWebhook(
    propertyId: string,
    payload: TawkToWebhookPayload,
    signature?: string
  ): Promise<ProcessWebhookResult> {
    // Find integration by property ID
    const integration = await this.getIntegrationByPropertyId(propertyId);
    if (!integration) {
      return {
        success: false,
        message: 'Integration not found or inactive',
      };
    }

    // Verify signature if webhook secret is configured
    if (integration.webhookSecret && signature) {
      const isValid = this.verifyWebhookSignature(
        JSON.stringify(payload),
        signature,
        integration.webhookSecret
      );
      if (!isValid) {
        console.warn(`[Tawk.to] Invalid webhook signature for org ${integration.organizationId}`);
        return {
          success: false,
          message: 'Invalid signature',
        };
      }
    }

    const event = payload.event;
    console.log(`[Tawk.to] Received ${event} event for property ${propertyId}`);

    // Update chat count
    if (event === 'chat:end' || event === 'chat:start') {
      await prisma.tawkToIntegration.update({
        where: { id: integration.id },
        data: {
          totalChats: { increment: 1 },
          lastChatAt: new Date(),
        },
      });
    }

    // Check if we should create a lead for this event
    if (!this.shouldCreateLead(event, integration)) {
      return {
        success: true,
        message: `Event ${event} processed but not configured to create lead`,
        eventType: event,
      };
    }

    // Extract visitor info
    const visitorInfo = this.extractVisitorInfo(payload);

    // Check if we have enough info to create a lead
    if (!visitorInfo.email && !visitorInfo.phone) {
      console.log(`[Tawk.to] Skipping lead creation - no contact info provided`);
      return {
        success: true,
        message: 'No contact information provided by visitor',
        eventType: event,
      };
    }

    // Parse name
    let firstName = 'Tawk.to Visitor';
    let lastName = '';
    if (visitorInfo.name) {
      const nameParts = visitorInfo.name.trim().split(' ');
      firstName = nameParts[0] || 'Tawk.to Visitor';
      lastName = nameParts.slice(1).join(' ');
    }

    // Build chat transcript if available
    let transcript = '';
    if (payload.chat?.messages && integration.syncTranscripts) {
      transcript = payload.chat.messages
        .map((m) => `[${m.sender}]: ${m.text}`)
        .join('\n');
    }

    // Build lead data
    const leadData: ExternalLeadData = {
      firstName,
      lastName,
      email: visitorInfo.email,
      phone: visitorInfo.phone || '',
      source: 'TAWKTO',
      sourceDetails: `Tawk.to - ${event === 'ticket:create' ? 'Ticket' : 'Live Chat'}`,
      city: visitorInfo.city,
      customFields: {
        tawkChatId: payload.chatId || payload.chat?.id,
        tawkTicketId: payload.ticketId || payload.ticket?.id,
        eventType: event,
        chatDuration: payload.chat?.duration,
        chatRating: payload.chat?.rating,
        ticketSubject: payload.ticket?.subject,
        ticketMessage: payload.ticket?.message,
        transcript: transcript || undefined,
        visitorQuestion: visitorInfo.customFields?.question,
        ...visitorInfo.customFields,
        receivedAt: new Date().toISOString(),
      },
    };

    try {
      // Import through external lead import service
      const result = await externalLeadImportService.importExternalLead(
        integration.organizationId,
        leadData
      );

      // Update integration stats
      if (!result.isDuplicate) {
        await prisma.tawkToIntegration.update({
          where: { id: integration.id },
          data: {
            totalLeadsCreated: { increment: 1 },
          },
        });
      }

      // Auto-assign if enabled
      if (!result.isDuplicate && integration.autoAssign && result.rawImportRecord) {
        if (integration.defaultAssigneeId) {
          await prisma.rawImportRecord.update({
            where: { id: result.rawImportRecord.id },
            data: {
              assignedToId: integration.defaultAssigneeId,
              assignedAt: new Date(),
            },
          });
        }
      }

      console.log(
        `[Tawk.to] Processed ${event}: ${firstName} ${lastName} - ${
          result.isDuplicate ? 'DUPLICATE' : 'NEW'
        }`
      );

      return {
        success: true,
        rawImportRecordId: result.rawImportRecord?.id,
        message: result.isDuplicate ? 'Duplicate lead detected' : 'Lead captured successfully',
        isDuplicate: result.isDuplicate,
        eventType: event,
      };
    } catch (error) {
      console.error('[Tawk.to] Failed to process webhook:', error);
      return {
        success: false,
        message: `Failed to process lead: ${(error as Error).message}`,
        eventType: event,
      };
    }
  }

  /**
   * Fetch chat transcript using API (optional enhancement)
   */
  async fetchChatTranscript(
    apiKey: string,
    chatId: string
  ): Promise<string | null> {
    try {
      const response = await this.client.get(`/chats/${chatId}`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      const messages = response.data?.messages || [];
      return messages
        .map((m: any) => `[${m.sender}]: ${m.text}`)
        .join('\n');
    } catch (error) {
      console.error('[Tawk.to] Failed to fetch chat transcript:', error);
      return null;
    }
  }

  /**
   * Test API connection
   */
  async testConnection(apiKey: string): Promise<{ valid: boolean; message: string }> {
    try {
      const response = await this.client.get('/property', {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (response.data) {
        return {
          valid: true,
          message: 'Connection successful',
        };
      }

      return {
        valid: false,
        message: 'Invalid response from Tawk.to API',
      };
    } catch (error: any) {
      return {
        valid: false,
        message: error.response?.data?.message || 'Connection failed',
      };
    }
  }

  /**
   * Get widget embed code
   */
  getWidgetEmbedCode(propertyId: string, widgetId?: string): string {
    const widget = widgetId || 'default';
    return `<!--Start of Tawk.to Script-->
<script type="text/javascript">
var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
(function(){
var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
s1.async=true;
s1.src='https://embed.tawk.to/${propertyId}/${widget}';
s1.charset='UTF-8';
s1.setAttribute('crossorigin','*');
s0.parentNode.insertBefore(s1,s0);
})();
</script>
<!--End of Tawk.to Script-->`;
  }

  /**
   * Deactivate integration
   */
  async deactivateIntegration(organizationId: string): Promise<void> {
    await prisma.tawkToIntegration.update({
      where: { organizationId },
      data: { isActive: false },
    });
  }

  /**
   * Activate integration
   */
  async activateIntegration(organizationId: string): Promise<void> {
    await prisma.tawkToIntegration.update({
      where: { organizationId },
      data: { isActive: true },
    });
  }

  /**
   * Delete integration
   */
  async deleteIntegration(organizationId: string): Promise<void> {
    await prisma.tawkToIntegration.delete({
      where: { organizationId },
    });
  }

  /**
   * Get integration stats
   */
  async getStats(organizationId: string): Promise<{
    totalChats: number;
    totalLeadsCreated: number;
    lastChatAt: Date | null;
    leadsToday: number;
    leadsThisWeek: number;
  }> {
    const integration = await this.getIntegration(organizationId);
    if (!integration) {
      return {
        totalChats: 0,
        totalLeadsCreated: 0,
        lastChatAt: null,
        leadsToday: 0,
        leadsThisWeek: 0,
      };
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    const [leadsToday, leadsThisWeek] = await Promise.all([
      prisma.rawImportRecord.count({
        where: {
          organizationId,
          customFields: { path: ['source'], equals: 'TAWKTO' },
          createdAt: { gte: todayStart },
        },
      }),
      prisma.rawImportRecord.count({
        where: {
          organizationId,
          customFields: { path: ['source'], equals: 'TAWKTO' },
          createdAt: { gte: weekStart },
        },
      }),
    ]);

    return {
      totalChats: integration.totalChats,
      totalLeadsCreated: integration.totalLeadsCreated,
      lastChatAt: integration.lastChatAt,
      leadsToday,
      leadsThisWeek,
    };
  }
}

export const tawkToService = new TawkToService();
export default tawkToService;
