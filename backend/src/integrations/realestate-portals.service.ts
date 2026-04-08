/**
 * Real Estate Portals Integration Service
 *
 * Handles webhook-based lead capture from:
 * - 99Acres
 * - MagicBricks
 * - Housing.com
 *
 * All three portals support webhook-based lead notifications.
 */

import { prisma } from '../config/database';
import { RealEstateIntegration, RealEstatePlatform } from '@prisma/client';
import { externalLeadImportService, ExternalLeadData } from '../services/external-lead-import.service';
import crypto from 'crypto';

// Webhook payload structures for each platform
export interface Acres99WebhookPayload {
  lead_id?: string;
  name: string;
  phone: string;
  email?: string;
  project_name?: string;
  property_type?: string; // Residential, Commercial, Plot
  budget?: string;
  city?: string;
  locality?: string;
  requirement?: string;
  date?: string;
  [key: string]: any;
}

export interface MagicBricksWebhookPayload {
  enquiry_id?: string;
  customer_name: string;
  customer_mobile: string;
  customer_email?: string;
  property_id?: string;
  property_name?: string;
  property_type?: string;
  city?: string;
  locality?: string;
  budget_min?: number;
  budget_max?: number;
  message?: string;
  timestamp?: string;
  [key: string]: any;
}

export interface HousingWebhookPayload {
  lead_id?: string;
  user_name: string;
  user_phone: string;
  user_email?: string;
  project_id?: string;
  project_name?: string;
  configuration?: string;
  city?: string;
  locality?: string;
  budget_range?: string;
  query?: string;
  created_at?: string;
  [key: string]: any;
}

type RealEstateWebhookPayload = Acres99WebhookPayload | MagicBricksWebhookPayload | HousingWebhookPayload;

// Default field mappings for each platform
export const DEFAULT_FIELD_MAPPINGS: Record<RealEstatePlatform, Record<string, string>> = {
  ACRES_99: {
    name: 'firstName',
    phone: 'phone',
    email: 'email',
    project_name: 'customFields.projectName',
    property_type: 'customFields.propertyType',
    budget: 'customFields.budget',
    city: 'city',
    locality: 'customFields.locality',
    requirement: 'customFields.enquiry',
    lead_id: 'customFields.portalLeadId',
  },
  MAGICBRICKS: {
    customer_name: 'firstName',
    customer_mobile: 'phone',
    customer_email: 'email',
    property_name: 'customFields.projectName',
    property_type: 'customFields.propertyType',
    city: 'city',
    locality: 'customFields.locality',
    message: 'customFields.enquiry',
    enquiry_id: 'customFields.portalLeadId',
  },
  HOUSING: {
    user_name: 'firstName',
    user_phone: 'phone',
    user_email: 'email',
    project_name: 'customFields.projectName',
    configuration: 'customFields.configuration',
    city: 'city',
    locality: 'customFields.locality',
    budget_range: 'customFields.budget',
    query: 'customFields.enquiry',
    lead_id: 'customFields.portalLeadId',
  },
};

// Platform display names
export const PLATFORM_NAMES: Record<RealEstatePlatform, string> = {
  ACRES_99: '99Acres',
  MAGICBRICKS: 'MagicBricks',
  HOUSING: 'Housing.com',
};

interface ProcessWebhookResult {
  success: boolean;
  rawImportRecordId?: string;
  message: string;
  isDuplicate?: boolean;
}

class RealEstatePortalsService {
  /**
   * Create or update real estate integration for an organization
   */
  async setupIntegration(
    organizationId: string,
    platform: RealEstatePlatform,
    config: {
      apiKey?: string;
      secretKey?: string;
      projectFilters?: string[];
      cityFilters?: string[];
      propertyTypeFilters?: string[];
      budgetFilters?: { min?: number; max?: number };
      fieldMapping?: Record<string, string>;
      autoAssign?: boolean;
      defaultAssigneeId?: string;
      routingRuleId?: string;
    }
  ): Promise<RealEstateIntegration> {
    const existing = await prisma.realEstateIntegration.findUnique({
      where: {
        organizationId_platform: {
          organizationId,
          platform,
        },
      },
    });

    if (existing) {
      return prisma.realEstateIntegration.update({
        where: { id: existing.id },
        data: {
          apiKey: config.apiKey,
          secretKey: config.secretKey,
          projectFilters: config.projectFilters || undefined,
          cityFilters: config.cityFilters || undefined,
          propertyTypeFilters: config.propertyTypeFilters || undefined,
          budgetFilters: config.budgetFilters || undefined,
          fieldMapping: config.fieldMapping || undefined,
          autoAssign: config.autoAssign ?? true,
          defaultAssigneeId: config.defaultAssigneeId,
          routingRuleId: config.routingRuleId,
        },
      });
    }

    return prisma.realEstateIntegration.create({
      data: {
        organizationId,
        platform,
        apiKey: config.apiKey,
        secretKey: config.secretKey,
        projectFilters: config.projectFilters || undefined,
        cityFilters: config.cityFilters || undefined,
        propertyTypeFilters: config.propertyTypeFilters || undefined,
        budgetFilters: config.budgetFilters || undefined,
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
  async getIntegrationByToken(webhookToken: string): Promise<RealEstateIntegration | null> {
    return prisma.realEstateIntegration.findFirst({
      where: {
        webhookToken,
        isActive: true,
      },
    });
  }

  /**
   * Get integration for organization and platform
   */
  async getIntegration(
    organizationId: string,
    platform: RealEstatePlatform
  ): Promise<RealEstateIntegration | null> {
    return prisma.realEstateIntegration.findUnique({
      where: {
        organizationId_platform: {
          organizationId,
          platform,
        },
      },
    });
  }

  /**
   * Get all integrations for organization
   */
  async getAllIntegrations(organizationId: string): Promise<RealEstateIntegration[]> {
    return prisma.realEstateIntegration.findMany({
      where: { organizationId },
    });
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(
    payload: string,
    signature: string,
    secretKey: string
  ): boolean {
    if (!secretKey) return true;

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
   * Extract phone number from payload based on platform
   */
  private extractPhone(payload: RealEstateWebhookPayload, platform: RealEstatePlatform): string {
    switch (platform) {
      case 'ACRES_99':
        return (payload as Acres99WebhookPayload).phone || '';
      case 'MAGICBRICKS':
        return (payload as MagicBricksWebhookPayload).customer_mobile || '';
      case 'HOUSING':
        return (payload as HousingWebhookPayload).user_phone || '';
      default:
        return '';
    }
  }

  /**
   * Extract name from payload based on platform
   */
  private extractName(payload: RealEstateWebhookPayload, platform: RealEstatePlatform): string {
    switch (platform) {
      case 'ACRES_99':
        return (payload as Acres99WebhookPayload).name || '';
      case 'MAGICBRICKS':
        return (payload as MagicBricksWebhookPayload).customer_name || '';
      case 'HOUSING':
        return (payload as HousingWebhookPayload).user_name || '';
      default:
        return '';
    }
  }

  /**
   * Get source identifier for external lead
   */
  private getSourceIdentifier(platform: RealEstatePlatform): 'ACRES_99' | 'MAGICBRICKS' | 'HOUSING' {
    return platform;
  }

  /**
   * Check if lead passes configured filters
   */
  private passesFilters(
    payload: RealEstateWebhookPayload,
    integration: RealEstateIntegration
  ): boolean {
    // City filters
    const cityFilters = integration.cityFilters as string[] | null;
    if (cityFilters && cityFilters.length > 0) {
      const payloadCity = ((payload as any).city || '').toLowerCase();
      const matches = cityFilters.some(
        (city) => payloadCity.includes(city.toLowerCase())
      );
      if (!matches) {
        console.log(`[RealEstate:${integration.platform}] Lead filtered out by city`);
        return false;
      }
    }

    // Project filters
    const projectFilters = integration.projectFilters as string[] | null;
    if (projectFilters && projectFilters.length > 0) {
      const projectName = (
        (payload as any).project_name ||
        (payload as any).property_name ||
        ''
      ).toLowerCase();
      const matches = projectFilters.some(
        (project) => projectName.includes(project.toLowerCase())
      );
      if (!matches) {
        console.log(`[RealEstate:${integration.platform}] Lead filtered out by project`);
        return false;
      }
    }

    // Property type filters
    const propertyTypeFilters = integration.propertyTypeFilters as string[] | null;
    if (propertyTypeFilters && propertyTypeFilters.length > 0) {
      const propType = (
        (payload as any).property_type ||
        (payload as any).configuration ||
        ''
      ).toLowerCase();
      const matches = propertyTypeFilters.some(
        (type) => propType.includes(type.toLowerCase())
      );
      if (!matches) {
        console.log(`[RealEstate:${integration.platform}] Lead filtered out by property type`);
        return false;
      }
    }

    return true;
  }

  /**
   * Apply field mapping to transform portal data to CRM format
   */
  private applyFieldMapping(
    payload: RealEstateWebhookPayload,
    platform: RealEstatePlatform,
    customMapping?: Record<string, string> | null
  ): Partial<ExternalLeadData> {
    const defaultMapping = DEFAULT_FIELD_MAPPINGS[platform];
    const mapping = {
      ...defaultMapping,
      ...(customMapping || {}),
    };

    const result: Record<string, any> = {
      customFields: {},
    };

    for (const [sourceField, targetField] of Object.entries(mapping)) {
      const value = (payload as any)[sourceField];
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
   * Process incoming webhook from any real estate portal
   */
  async processWebhook(
    webhookToken: string,
    platform: RealEstatePlatform,
    payload: RealEstateWebhookPayload,
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

    // Verify platform matches
    if (integration.platform !== platform) {
      return {
        success: false,
        message: 'Platform mismatch',
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
        console.warn(`[RealEstate:${platform}] Invalid webhook signature`);
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
        message: 'Lead filtered out by configured rules',
      };
    }

    // Extract and validate phone
    const phone = this.extractPhone(payload, platform);
    if (!phone) {
      return {
        success: false,
        message: 'Phone number is required',
      };
    }

    // Apply field mapping
    const mappedData = this.applyFieldMapping(
      payload,
      platform,
      integration.fieldMapping as Record<string, string> | null
    );

    // Parse name
    const fullName = this.extractName(payload, platform);
    let firstName = 'Real Estate Lead';
    let lastName = '';
    if (fullName) {
      const nameParts = fullName.trim().split(' ');
      firstName = nameParts[0] || 'Real Estate Lead';
      lastName = nameParts.slice(1).join(' ');
    }

    // Build lead data
    const leadData: ExternalLeadData = {
      firstName,
      lastName,
      email: mappedData.email as string,
      phone,
      source: this.getSourceIdentifier(platform),
      sourceDetails: `${PLATFORM_NAMES[platform]} - ${(payload as any).project_name || (payload as any).property_name || 'Property Enquiry'}`,
      city: mappedData.city as string,
      customFields: {
        ...mappedData.customFields,
        platform: PLATFORM_NAMES[platform],
        propertyType: (payload as any).property_type || (payload as any).configuration,
        locality: (payload as any).locality,
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
      await prisma.realEstateIntegration.update({
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
        `[RealEstate:${platform}] Processed lead: ${firstName} ${lastName} - ${
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
      console.error(`[RealEstate:${platform}] Failed to process webhook:`, error);
      return {
        success: false,
        message: `Failed to process lead: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Deactivate integration
   */
  async deactivateIntegration(organizationId: string, platform: RealEstatePlatform): Promise<void> {
    const integration = await this.getIntegration(organizationId, platform);
    if (integration) {
      await prisma.realEstateIntegration.update({
        where: { id: integration.id },
        data: { isActive: false },
      });
    }
  }

  /**
   * Activate integration
   */
  async activateIntegration(organizationId: string, platform: RealEstatePlatform): Promise<void> {
    const integration = await this.getIntegration(organizationId, platform);
    if (integration) {
      await prisma.realEstateIntegration.update({
        where: { id: integration.id },
        data: { isActive: true },
      });
    }
  }

  /**
   * Delete integration
   */
  async deleteIntegration(organizationId: string, platform: RealEstatePlatform): Promise<void> {
    const integration = await this.getIntegration(organizationId, platform);
    if (integration) {
      await prisma.realEstateIntegration.delete({
        where: { id: integration.id },
      });
    }
  }

  /**
   * Regenerate webhook token
   */
  async regenerateWebhookToken(
    organizationId: string,
    platform: RealEstatePlatform
  ): Promise<string> {
    const newToken = crypto.randomUUID();
    const integration = await this.getIntegration(organizationId, platform);
    if (integration) {
      await prisma.realEstateIntegration.update({
        where: { id: integration.id },
        data: { webhookToken: newToken },
      });
    }
    return newToken;
  }

  /**
   * Get stats for a platform
   */
  async getStats(
    organizationId: string,
    platform: RealEstatePlatform
  ): Promise<{
    totalLeads: number;
    lastLeadAt: Date | null;
    leadsToday: number;
    leadsThisWeek: number;
  }> {
    const integration = await this.getIntegration(organizationId, platform);
    if (!integration) {
      return {
        totalLeads: 0,
        lastLeadAt: null,
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
          customFields: { path: ['platform'], equals: PLATFORM_NAMES[platform] },
          createdAt: { gte: todayStart },
        },
      }),
      prisma.rawImportRecord.count({
        where: {
          organizationId,
          customFields: { path: ['platform'], equals: PLATFORM_NAMES[platform] },
          createdAt: { gte: weekStart },
        },
      }),
    ]);

    return {
      totalLeads: integration.totalLeadsReceived,
      lastLeadAt: integration.lastLeadAt,
      leadsToday,
      leadsThisWeek,
    };
  }

  /**
   * Get combined stats for all platforms
   */
  async getCombinedStats(organizationId: string): Promise<{
    byPlatform: Record<
      RealEstatePlatform,
      {
        totalLeads: number;
        lastLeadAt: Date | null;
        isActive: boolean;
      }
    >;
    totalLeads: number;
    leadsToday: number;
    leadsThisWeek: number;
  }> {
    const integrations = await this.getAllIntegrations(organizationId);

    const byPlatform: Record<
      RealEstatePlatform,
      { totalLeads: number; lastLeadAt: Date | null; isActive: boolean }
    > = {
      ACRES_99: { totalLeads: 0, lastLeadAt: null, isActive: false },
      MAGICBRICKS: { totalLeads: 0, lastLeadAt: null, isActive: false },
      HOUSING: { totalLeads: 0, lastLeadAt: null, isActive: false },
    };

    let totalLeads = 0;

    for (const integration of integrations) {
      byPlatform[integration.platform] = {
        totalLeads: integration.totalLeadsReceived,
        lastLeadAt: integration.lastLeadAt,
        isActive: integration.isActive,
      };
      totalLeads += integration.totalLeadsReceived;
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    const [leadsToday, leadsThisWeek] = await Promise.all([
      prisma.rawImportRecord.count({
        where: {
          organizationId,
          customFields: {
            path: ['platform'],
            string_contains: '', // Any platform that has this field
          },
          createdAt: { gte: todayStart },
        },
      }),
      prisma.rawImportRecord.count({
        where: {
          organizationId,
          customFields: {
            path: ['platform'],
            string_contains: '',
          },
          createdAt: { gte: weekStart },
        },
      }),
    ]);

    return {
      byPlatform,
      totalLeads,
      leadsToday,
      leadsThisWeek,
    };
  }
}

export const realEstatePortalsService = new RealEstatePortalsService();
export default realEstatePortalsService;
