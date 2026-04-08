/**
 * Sulekha Integration Service
 *
 * Handles webhook-based lead capture from Sulekha.
 * Sulekha is India's leading local services marketplace covering:
 * - Home services (packers & movers, cleaning, etc.)
 * - Education (tutors, coaching centers)
 * - Events (photographers, caterers, etc.)
 * - Health & wellness
 *
 * Requires Sulekha Business account with API access.
 */

import { prisma } from '../config/database';
import { SulekhaIntegration } from '@prisma/client';
import { externalLeadImportService, ExternalLeadData } from '../services/external-lead-import.service';
import crypto from 'crypto';

// Sulekha webhook payload structure
export interface SulekhaWebhookPayload {
  lead_id?: string;
  customer_name: string;
  customer_mobile: string;
  customer_email?: string;
  customer_address?: string;
  city?: string;
  area?: string;
  pincode?: string;
  category?: string;
  sub_category?: string;
  service_required?: string;
  budget_range?: string;
  requirements?: string;
  date_required?: string;
  time_slot?: string;
  lead_type?: string; // premium, verified
  source_page?: string;
  timestamp?: string;
  [key: string]: any;
}

// Default field mapping from Sulekha to CRM
export const DEFAULT_SULEKHA_FIELD_MAPPING: Record<string, string> = {
  customer_name: 'firstName',
  customer_mobile: 'phone',
  customer_email: 'email',
  customer_address: 'address',
  city: 'city',
  area: 'customFields.area',
  pincode: 'postalCode',
  category: 'customFields.category',
  sub_category: 'customFields.subCategory',
  service_required: 'customFields.serviceRequired',
  budget_range: 'customFields.budget',
  requirements: 'customFields.enquiry',
  date_required: 'customFields.dateRequired',
  time_slot: 'customFields.timeSlot',
  lead_id: 'customFields.sulekhaLeadId',
  lead_type: 'customFields.leadType',
};

// Sulekha service categories
export const SULEKHA_CATEGORIES = [
  'Packers & Movers',
  'Home Cleaning',
  'Pest Control',
  'Interior Designers',
  'Home Renovation',
  'Tutors & Coaching',
  'Photography',
  'Catering',
  'Wedding Services',
  'Fitness & Yoga',
  'Computer & IT Training',
  'Home Appliance Repair',
  'Car Services',
  'Legal Services',
  'Accounting & Tax',
];

interface ProcessWebhookResult {
  success: boolean;
  rawImportRecordId?: string;
  message: string;
  isDuplicate?: boolean;
}

class SulekhaService {
  /**
   * Create or update Sulekha integration for an organization
   */
  async setupIntegration(
    organizationId: string,
    config: {
      partnerId: string;
      apiKey: string;
      categoryFilters?: string[];
      cityFilters?: string[];
      fieldMapping?: Record<string, string>;
      autoAssign?: boolean;
      defaultAssigneeId?: string;
      routingRuleId?: string;
    }
  ): Promise<SulekhaIntegration> {
    const existing = await prisma.sulekhaIntegration.findUnique({
      where: { organizationId },
    });

    if (existing) {
      return prisma.sulekhaIntegration.update({
        where: { organizationId },
        data: {
          partnerId: config.partnerId,
          apiKey: config.apiKey,
          categoryFilters: config.categoryFilters || undefined,
          cityFilters: config.cityFilters || undefined,
          fieldMapping: config.fieldMapping || undefined,
          autoAssign: config.autoAssign ?? true,
          defaultAssigneeId: config.defaultAssigneeId,
          routingRuleId: config.routingRuleId,
        },
      });
    }

    return prisma.sulekhaIntegration.create({
      data: {
        organizationId,
        partnerId: config.partnerId,
        apiKey: config.apiKey,
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
  async getIntegrationByToken(webhookToken: string): Promise<SulekhaIntegration | null> {
    return prisma.sulekhaIntegration.findFirst({
      where: {
        webhookToken,
        isActive: true,
      },
    });
  }

  /**
   * Get integration for organization
   */
  async getIntegration(organizationId: string): Promise<SulekhaIntegration | null> {
    return prisma.sulekhaIntegration.findUnique({
      where: { organizationId },
    });
  }

  /**
   * Verify webhook using API key
   */
  verifyWebhook(apiKeyHeader: string, apiKey: string): boolean {
    if (!apiKey) return true;
    return apiKeyHeader === apiKey;
  }

  /**
   * Check if lead passes configured filters
   */
  private passesFilters(
    payload: SulekhaWebhookPayload,
    integration: SulekhaIntegration
  ): boolean {
    // Check category filters
    const categoryFilters = integration.categoryFilters as string[] | null;
    if (categoryFilters && categoryFilters.length > 0) {
      const payloadCategory = (payload.category || '').toLowerCase();
      const payloadSubCategory = (payload.sub_category || '').toLowerCase();
      const matches = categoryFilters.some(
        (cat) =>
          payloadCategory.includes(cat.toLowerCase()) ||
          payloadSubCategory.includes(cat.toLowerCase())
      );
      if (!matches) {
        console.log(`[Sulekha] Lead filtered out by category: ${payload.category}`);
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
        console.log(`[Sulekha] Lead filtered out by city: ${payload.city}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Apply field mapping to transform Sulekha data to CRM format
   */
  private applyFieldMapping(
    payload: SulekhaWebhookPayload,
    customMapping?: Record<string, string> | null
  ): Partial<ExternalLeadData> {
    const mapping = {
      ...DEFAULT_SULEKHA_FIELD_MAPPING,
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
   * Process incoming webhook from Sulekha
   */
  async processWebhook(
    webhookToken: string,
    payload: SulekhaWebhookPayload,
    apiKeyHeader?: string
  ): Promise<ProcessWebhookResult> {
    // Find integration by webhook token
    const integration = await this.getIntegrationByToken(webhookToken);
    if (!integration) {
      return {
        success: false,
        message: 'Integration not found or inactive',
      };
    }

    // Verify API key if provided
    if (apiKeyHeader && !this.verifyWebhook(apiKeyHeader, integration.apiKey)) {
      console.warn(`[Sulekha] Invalid API key for org ${integration.organizationId}`);
      return {
        success: false,
        message: 'Invalid API key',
      };
    }

    // Check filters
    if (!this.passesFilters(payload, integration)) {
      return {
        success: false,
        message: 'Lead filtered out by category/city rules',
      };
    }

    // Validate required fields
    if (!payload.customer_mobile) {
      return {
        success: false,
        message: 'Customer mobile number is required',
      };
    }

    // Apply field mapping
    const mappedData = this.applyFieldMapping(
      payload,
      integration.fieldMapping as Record<string, string> | null
    );

    // Parse name
    let firstName = 'Sulekha Lead';
    let lastName = '';
    if (payload.customer_name) {
      const nameParts = payload.customer_name.trim().split(' ');
      firstName = nameParts[0] || 'Sulekha Lead';
      lastName = nameParts.slice(1).join(' ');
    }

    // Build lead data
    const leadData: ExternalLeadData = {
      firstName,
      lastName,
      email: payload.customer_email,
      phone: payload.customer_mobile,
      source: 'SULEKHA',
      sourceDetails: `Sulekha - ${payload.category || 'General'}`,
      address: payload.customer_address,
      city: payload.city,
      postalCode: payload.pincode,
      customFields: {
        ...mappedData.customFields,
        sulekhaLeadId: payload.lead_id,
        category: payload.category,
        subCategory: payload.sub_category,
        serviceRequired: payload.service_required,
        requirements: payload.requirements,
        budgetRange: payload.budget_range,
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
      await prisma.sulekhaIntegration.update({
        where: { id: integration.id },
        data: {
          totalLeadsReceived: { increment: 1 },
          lastLeadAt: new Date(),
        },
      });

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
        `[Sulekha] Processed lead from ${payload.city || 'unknown city'}: ${firstName} ${lastName} - ${
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
      console.error('[Sulekha] Failed to process webhook:', error);
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
    await prisma.sulekhaIntegration.update({
      where: { organizationId },
      data: { isActive: false },
    });
  }

  /**
   * Activate integration
   */
  async activateIntegration(organizationId: string): Promise<void> {
    await prisma.sulekhaIntegration.update({
      where: { organizationId },
      data: { isActive: true },
    });
  }

  /**
   * Delete integration
   */
  async deleteIntegration(organizationId: string): Promise<void> {
    await prisma.sulekhaIntegration.delete({
      where: { organizationId },
    });
  }

  /**
   * Regenerate webhook token
   */
  async regenerateWebhookToken(organizationId: string): Promise<string> {
    const newToken = crypto.randomUUID();
    await prisma.sulekhaIntegration.update({
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
          customFields: { path: ['source'], equals: 'SULEKHA' },
          createdAt: { gte: todayStart },
        },
      }),
      prisma.rawImportRecord.count({
        where: {
          organizationId,
          customFields: { path: ['source'], equals: 'SULEKHA' },
          createdAt: { gte: weekStart },
        },
      }),
      prisma.rawImportRecord.count({
        where: {
          organizationId,
          customFields: { path: ['source'], equals: 'SULEKHA' },
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

export const sulekhaService = new SulekhaService();
export default sulekhaService;
