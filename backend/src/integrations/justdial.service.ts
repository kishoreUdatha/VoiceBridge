/**
 * JustDial Integration Service
 *
 * Handles webhook-based lead capture from JustDial.
 * JustDial sends leads via POST webhook when someone enquires.
 * Requires JustDial Premium/Business account with API access.
 */

import { prisma } from '../config/database';
import { JustDialIntegration } from '@prisma/client';
import { externalLeadImportService, ExternalLeadData } from '../services/external-lead-import.service';
import { leadRoutingService } from '../services/lead-routing.service';
import crypto from 'crypto';

// JustDial webhook payload structure
export interface JustDialWebhookPayload {
  leadid?: string;
  name: string;
  mobile: string;
  phone?: string;
  email?: string;
  category?: string;
  city?: string;
  area?: string;
  query?: string;
  date?: string;
  time?: string;
  leadtype?: string; // premium, verified, etc.
  parentid?: string;
  // Additional fields that may vary
  [key: string]: any;
}

// Default field mapping from JustDial to CRM
export const DEFAULT_JUSTDIAL_FIELD_MAPPING: Record<string, string> = {
  name: 'firstName',
  mobile: 'phone',
  phone: 'alternatePhone',
  email: 'email',
  category: 'customFields.category',
  city: 'city',
  area: 'customFields.area',
  query: 'customFields.enquiry',
  leadtype: 'customFields.leadType',
  leadid: 'customFields.justDialLeadId',
};

interface ProcessWebhookResult {
  success: boolean;
  leadId?: string;
  rawImportRecordId?: string;
  message: string;
  isDuplicate?: boolean;
}

class JustDialService {
  /**
   * Create or update JustDial integration for an organization
   */
  async setupIntegration(
    organizationId: string,
    config: {
      apiKey?: string;
      secretKey?: string;
      categoryFilters?: string[];
      cityFilters?: string[];
      fieldMapping?: Record<string, string>;
      autoAssign?: boolean;
      defaultAssigneeId?: string;
      routingRuleId?: string;
    }
  ): Promise<JustDialIntegration> {
    const existing = await prisma.justDialIntegration.findUnique({
      where: { organizationId },
    });

    if (existing) {
      return prisma.justDialIntegration.update({
        where: { organizationId },
        data: {
          apiKey: config.apiKey,
          secretKey: config.secretKey,
          categoryFilters: config.categoryFilters || undefined,
          cityFilters: config.cityFilters || undefined,
          fieldMapping: config.fieldMapping || undefined,
          autoAssign: config.autoAssign ?? true,
          defaultAssigneeId: config.defaultAssigneeId,
          routingRuleId: config.routingRuleId,
        },
      });
    }

    return prisma.justDialIntegration.create({
      data: {
        organizationId,
        apiKey: config.apiKey,
        secretKey: config.secretKey,
        categoryFilters: config.categoryFilters || undefined,
        cityFilters: config.cityFilters || undefined,
        fieldMapping: config.fieldMapping || undefined,
        autoAssign: config.autoAssign ?? true,
        defaultAssigneeId: config.defaultAssigneeId,
        routingRuleId: config.routingRuleId,
      },
    });
  }

  /**
   * Get integration by webhook token
   */
  async getIntegrationByToken(webhookToken: string): Promise<JustDialIntegration | null> {
    return prisma.justDialIntegration.findFirst({
      where: {
        webhookToken,
        isActive: true,
      },
    });
  }

  /**
   * Get integration for organization
   */
  async getIntegration(organizationId: string): Promise<JustDialIntegration | null> {
    return prisma.justDialIntegration.findUnique({
      where: { organizationId },
    });
  }

  /**
   * Verify webhook signature (HMAC verification)
   */
  verifyWebhookSignature(
    payload: string,
    signature: string,
    secretKey: string
  ): boolean {
    if (!secretKey) return true; // Skip if no secret configured

    const expectedSignature = crypto
      .createHmac('sha256', secretKey)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature || ''),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Check if lead passes configured filters
   */
  private passesFilters(
    payload: JustDialWebhookPayload,
    integration: JustDialIntegration
  ): boolean {
    // Check category filters
    const categoryFilters = integration.categoryFilters as string[] | null;
    if (categoryFilters && categoryFilters.length > 0) {
      const payloadCategory = (payload.category || '').toLowerCase();
      const matches = categoryFilters.some(
        (cat) => payloadCategory.includes(cat.toLowerCase())
      );
      if (!matches) {
        console.log(`[JustDial] Lead filtered out by category: ${payload.category}`);
        return false;
      }
    }

    // Check city filters
    const cityFilters = integration.cityFilters as string[] | null;
    if (cityFilters && cityFilters.length > 0) {
      const payloadCity = (payload.city || '').toLowerCase();
      const matches = cityFilters.some(
        (city) => payloadCity.includes(city.toLowerCase())
      );
      if (!matches) {
        console.log(`[JustDial] Lead filtered out by city: ${payload.city}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Apply field mapping to transform JustDial data to CRM format
   */
  private applyFieldMapping(
    payload: JustDialWebhookPayload,
    customMapping?: Record<string, string> | null
  ): Partial<ExternalLeadData> {
    const mapping = {
      ...DEFAULT_JUSTDIAL_FIELD_MAPPING,
      ...(customMapping || {}),
    };

    const result: Record<string, any> = {
      customFields: {},
    };

    for (const [sourceField, targetField] of Object.entries(mapping)) {
      const value = payload[sourceField];
      if (value !== undefined && value !== null && value !== '') {
        if (targetField.startsWith('customFields.')) {
          const customKey = targetField.replace('customFields.', '');
          result.customFields[customKey] = value;
        } else {
          result[targetField] = value;
        }
      }
    }

    return result;
  }

  /**
   * Process incoming webhook from JustDial
   */
  async processWebhook(
    webhookToken: string,
    payload: JustDialWebhookPayload,
    signature?: string
  ): Promise<ProcessWebhookResult> {
    // Find integration by webhook token
    const integration = await this.getIntegrationByToken(webhookToken);
    if (!integration) {
      return {
        success: false,
        message: 'Integration not found or inactive',
      };
    }

    // Verify signature if secret key is configured
    if (integration.secretKey && signature) {
      const isValid = this.verifyWebhookSignature(
        JSON.stringify(payload),
        signature,
        integration.secretKey
      );
      if (!isValid) {
        console.warn(`[JustDial] Invalid webhook signature for org ${integration.organizationId}`);
        return {
          success: false,
          message: 'Invalid signature',
        };
      }
    }

    // Check filters
    if (!this.passesFilters(payload, integration)) {
      return {
        success: false,
        message: 'Lead filtered out by category/city rules',
      };
    }

    // Validate required fields
    if (!payload.mobile && !payload.phone) {
      return {
        success: false,
        message: 'Phone number is required',
      };
    }

    // Apply field mapping
    const mappedData = this.applyFieldMapping(
      payload,
      integration.fieldMapping as Record<string, string> | null
    );

    // Parse name into first/last name
    let firstName = mappedData.firstName as string || 'JustDial Lead';
    let lastName = '';
    if (payload.name) {
      const nameParts = payload.name.trim().split(' ');
      firstName = nameParts[0] || 'JustDial Lead';
      lastName = nameParts.slice(1).join(' ');
    }

    // Build lead data
    const leadData: ExternalLeadData = {
      firstName,
      lastName,
      email: mappedData.email as string,
      phone: payload.mobile || payload.phone || '',
      alternatePhone: mappedData.alternatePhone as string,
      source: 'JUSTDIAL',
      sourceDetails: `JustDial - ${payload.category || 'General'}`,
      city: mappedData.city as string,
      customFields: {
        ...mappedData.customFields,
        justDialLeadId: payload.leadid,
        justDialCategory: payload.category,
        enquiry: payload.query,
        area: payload.area,
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
      await prisma.justDialIntegration.update({
        where: { id: integration.id },
        data: {
          totalLeadsReceived: { increment: 1 },
          lastLeadAt: new Date(),
        },
      });

      // Auto-assign if enabled
      if (!result.isDuplicate && integration.autoAssign && result.rawImportRecord) {
        // If routing rule is configured, use it
        if (integration.routingRuleId) {
          // Convert to lead first then route (or route raw import)
          console.log(`[JustDial] Lead will be routed via rule ${integration.routingRuleId}`);
        } else if (integration.defaultAssigneeId) {
          // Direct assignment to default user
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
        `[JustDial] Processed lead from ${payload.city || 'unknown city'}: ${firstName} ${lastName} - ${
          result.isDuplicate ? 'DUPLICATE' : 'NEW'
        }`
      );

      return {
        success: true,
        rawImportRecordId: result.rawImportRecord?.id,
        message: result.isDuplicate ? 'Duplicate lead detected' : 'Lead captured successfully',
        isDuplicate: result.isDuplicate,
      };
    } catch (error) {
      console.error('[JustDial] Failed to process webhook:', error);
      return {
        success: false,
        message: `Failed to process lead: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Deactivate integration
   */
  async deactivateIntegration(organizationId: string): Promise<void> {
    await prisma.justDialIntegration.update({
      where: { organizationId },
      data: { isActive: false },
    });
  }

  /**
   * Activate integration
   */
  async activateIntegration(organizationId: string): Promise<void> {
    await prisma.justDialIntegration.update({
      where: { organizationId },
      data: { isActive: true },
    });
  }

  /**
   * Delete integration
   */
  async deleteIntegration(organizationId: string): Promise<void> {
    await prisma.justDialIntegration.delete({
      where: { organizationId },
    });
  }

  /**
   * Regenerate webhook token
   */
  async regenerateWebhookToken(organizationId: string): Promise<string> {
    const newToken = crypto.randomUUID();
    await prisma.justDialIntegration.update({
      where: { organizationId },
      data: { webhookToken: newToken },
    });
    return newToken;
  }

  /**
   * Get integration stats
   */
  async getStats(organizationId: string): Promise<{
    totalLeads: number;
    lastLeadAt: Date | null;
    leadsToday: number;
    leadsThisWeek: number;
    leadsThisMonth: number;
  }> {
    const integration = await this.getIntegration(organizationId);
    if (!integration) {
      return {
        totalLeads: 0,
        lastLeadAt: null,
        leadsToday: 0,
        leadsThisWeek: 0,
        leadsThisMonth: 0,
      };
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [leadsToday, leadsThisWeek, leadsThisMonth] = await Promise.all([
      prisma.rawImportRecord.count({
        where: {
          organizationId,
          customFields: { path: ['source'], equals: 'JUSTDIAL' },
          createdAt: { gte: todayStart },
        },
      }),
      prisma.rawImportRecord.count({
        where: {
          organizationId,
          customFields: { path: ['source'], equals: 'JUSTDIAL' },
          createdAt: { gte: weekStart },
        },
      }),
      prisma.rawImportRecord.count({
        where: {
          organizationId,
          customFields: { path: ['source'], equals: 'JUSTDIAL' },
          createdAt: { gte: monthStart },
        },
      }),
    ]);

    return {
      totalLeads: integration.totalLeadsReceived,
      lastLeadAt: integration.lastLeadAt,
      leadsToday,
      leadsThisWeek,
      leadsThisMonth,
    };
  }
}

export const justDialService = new JustDialService();
export default justDialService;
