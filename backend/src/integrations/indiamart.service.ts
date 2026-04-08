/**
 * IndiaMART Integration Service
 *
 * Handles pull-based lead sync from IndiaMART CRM Lead Manager API.
 * IndiaMART requires a subscription to their CRM Lead Manager service.
 * Leads are fetched periodically via API calls.
 *
 * API Documentation: https://seller.indiamart.com/crmleadmanager
 */

import { prisma } from '../config/database';
import { IndiaMartIntegration } from '@prisma/client';
import { externalLeadImportService, ExternalLeadData } from '../services/external-lead-import.service';
import axios, { AxiosInstance } from 'axios';

// IndiaMART API endpoint
const INDIAMART_API_URL = 'https://mapi.indiamart.com/wservce/crm/crmListing/v2/';

// IndiaMART API response structure
interface IndiaMartApiResponse {
  STATUS: 'SUCCESS' | 'FAILED';
  TOTAL_RECORDS?: number;
  MESSAGE?: string;
  RESPONSE?: IndiaMartLead[];
}

// IndiaMART lead structure
export interface IndiaMartLead {
  UNIQUE_QUERY_ID: string;
  QUERY_TYPE: string;
  QUERY_TIME: string;
  SENDER_NAME: string;
  SENDER_MOBILE: string;
  SENDER_EMAIL?: string;
  SENDER_COMPANY?: string;
  SENDER_ADDRESS?: string;
  SENDER_CITY?: string;
  SENDER_STATE?: string;
  SENDER_PINCODE?: string;
  SENDER_COUNTRY_ISO?: string;
  SUBJECT?: string;
  QUERY_MESSAGE?: string;
  QUERY_PRODUCT_NAME?: string;
  CALL_DURATION?: string;
  RECEIVER_MOBILE?: string;
  // Additional fields
  [key: string]: any;
}

// Default field mapping from IndiaMART to CRM
export const DEFAULT_INDIAMART_FIELD_MAPPING: Record<string, string> = {
  SENDER_NAME: 'firstName',
  SENDER_MOBILE: 'phone',
  SENDER_EMAIL: 'email',
  SENDER_COMPANY: 'companyName',
  SENDER_ADDRESS: 'address',
  SENDER_CITY: 'city',
  SENDER_STATE: 'state',
  SENDER_PINCODE: 'postalCode',
  QUERY_PRODUCT_NAME: 'customFields.interestedProduct',
  QUERY_MESSAGE: 'customFields.enquiry',
  SUBJECT: 'customFields.subject',
  UNIQUE_QUERY_ID: 'customFields.indiaMartQueryId',
  QUERY_TYPE: 'customFields.queryType',
};

interface SyncResult {
  success: boolean;
  totalFetched: number;
  imported: number;
  duplicates: number;
  errors: number;
  message: string;
}

class IndiaMartService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: INDIAMART_API_URL,
      timeout: 30000,
    });
  }

  /**
   * Create or update IndiaMART integration for an organization
   */
  async setupIntegration(
    organizationId: string,
    config: {
      mobileNumber: string;
      crmKey: string;
      glid?: string;
      syncInterval?: number;
      fieldMapping?: Record<string, string>;
      productFilters?: string[];
      autoAssign?: boolean;
      defaultAssigneeId?: string;
      routingRuleId?: string;
    }
  ): Promise<IndiaMartIntegration> {
    const existing = await prisma.indiaMartIntegration.findUnique({
      where: { organizationId },
    });

    if (existing) {
      return prisma.indiaMartIntegration.update({
        where: { organizationId },
        data: {
          mobileNumber: config.mobileNumber,
          crmKey: config.crmKey,
          glid: config.glid,
          syncInterval: config.syncInterval || 15,
          fieldMapping: config.fieldMapping || undefined,
          productFilters: config.productFilters || undefined,
          autoAssign: config.autoAssign ?? true,
          defaultAssigneeId: config.defaultAssigneeId,
          routingRuleId: config.routingRuleId,
        },
      });
    }

    return prisma.indiaMartIntegration.create({
      data: {
        organizationId,
        mobileNumber: config.mobileNumber,
        crmKey: config.crmKey,
        glid: config.glid,
        syncInterval: config.syncInterval || 15,
        fieldMapping: config.fieldMapping || undefined,
        productFilters: config.productFilters || undefined,
        autoAssign: config.autoAssign ?? true,
        defaultAssigneeId: config.defaultAssigneeId,
        routingRuleId: config.routingRuleId,
      },
    });
  }

  /**
   * Get integration for organization
   */
  async getIntegration(organizationId: string): Promise<IndiaMartIntegration | null> {
    return prisma.indiaMartIntegration.findUnique({
      where: { organizationId },
    });
  }

  /**
   * Test API connection with credentials
   */
  async testConnection(crmKey: string): Promise<{ valid: boolean; message: string }> {
    try {
      const response = await this.client.get('', {
        params: {
          glusr_crm_key: crmKey,
          start: 0,
          end: 1,
        },
      });

      const data: IndiaMartApiResponse = response.data;
      if (data.STATUS === 'SUCCESS') {
        return {
          valid: true,
          message: `Connection successful. Total leads available: ${data.TOTAL_RECORDS || 0}`,
        };
      }

      return {
        valid: false,
        message: data.MESSAGE || 'Invalid credentials',
      };
    } catch (error) {
      console.error('[IndiaMART] Connection test failed:', error);
      return {
        valid: false,
        message: `Connection failed: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Fetch leads from IndiaMART API
   */
  async fetchLeads(
    crmKey: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      glid?: string;
      start?: number;
      end?: number;
    }
  ): Promise<IndiaMartLead[]> {
    try {
      const params: Record<string, any> = {
        glusr_crm_key: crmKey,
      };

      if (options?.startDate) {
        params.start_time = this.formatDate(options.startDate);
      }
      if (options?.endDate) {
        params.end_time = this.formatDate(options.endDate);
      }
      if (options?.glid) {
        params.glusr_glid = options.glid;
      }
      if (options?.start !== undefined) {
        params.start = options.start;
      }
      if (options?.end !== undefined) {
        params.end = options.end;
      }

      const response = await this.client.get('', { params });
      const data: IndiaMartApiResponse = response.data;

      if (data.STATUS !== 'SUCCESS') {
        console.error('[IndiaMART] API error:', data.MESSAGE);
        return [];
      }

      return data.RESPONSE || [];
    } catch (error) {
      console.error('[IndiaMART] Failed to fetch leads:', error);
      throw error;
    }
  }

  /**
   * Format date for IndiaMART API (DD-Mon-YYYY HH:mm:ss)
   */
  private formatDate(date: Date): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = String(date.getDate()).padStart(2, '0');
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
  }

  /**
   * Check if lead passes configured filters
   */
  private passesFilters(
    lead: IndiaMartLead,
    integration: IndiaMartIntegration
  ): boolean {
    const productFilters = integration.productFilters as string[] | null;
    if (productFilters && productFilters.length > 0) {
      const productName = (lead.QUERY_PRODUCT_NAME || '').toLowerCase();
      const matches = productFilters.some(
        (product) => productName.includes(product.toLowerCase())
      );
      if (!matches) {
        console.log(`[IndiaMART] Lead filtered out by product: ${lead.QUERY_PRODUCT_NAME}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Apply field mapping to transform IndiaMART data to CRM format
   */
  private applyFieldMapping(
    lead: IndiaMartLead,
    customMapping?: Record<string, string> | null
  ): Partial<ExternalLeadData> {
    const mapping = {
      ...DEFAULT_INDIAMART_FIELD_MAPPING,
      ...(customMapping || {}),
    };

    const result: Record<string, any> = {
      customFields: {},
    };

    for (const [sourceField, targetField] of Object.entries(mapping)) {
      const value = lead[sourceField];
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
   * Sync leads from IndiaMART for an organization
   */
  async syncLeads(organizationId: string): Promise<SyncResult> {
    const integration = await this.getIntegration(organizationId);
    if (!integration || !integration.isActive) {
      return {
        success: false,
        totalFetched: 0,
        imported: 0,
        duplicates: 0,
        errors: 0,
        message: 'Integration not found or inactive',
      };
    }

    try {
      // Calculate time range: from last sync (or last 7 days) to now
      const startDate = integration.lastSyncAt
        ? new Date(integration.lastSyncAt)
        : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      console.log(
        `[IndiaMART] Syncing leads for org ${organizationId} from ${startDate.toISOString()} to ${endDate.toISOString()}`
      );

      // Fetch leads from API
      const leads = await this.fetchLeads(integration.crmKey, {
        startDate,
        endDate,
        glid: integration.glid || undefined,
      });

      console.log(`[IndiaMART] Fetched ${leads.length} leads from API`);

      let imported = 0;
      let duplicates = 0;
      let errors = 0;

      // Process each lead
      for (const lead of leads) {
        try {
          // Check filters
          if (!this.passesFilters(lead, integration)) {
            continue;
          }

          // Validate required fields
          if (!lead.SENDER_MOBILE) {
            console.warn(`[IndiaMART] Skipping lead without mobile: ${lead.UNIQUE_QUERY_ID}`);
            errors++;
            continue;
          }

          // Apply field mapping
          const mappedData = this.applyFieldMapping(
            lead,
            integration.fieldMapping as Record<string, string> | null
          );

          // Parse name
          let firstName = 'IndiaMART Lead';
          let lastName = '';
          if (lead.SENDER_NAME) {
            const nameParts = lead.SENDER_NAME.trim().split(' ');
            firstName = nameParts[0] || 'IndiaMART Lead';
            lastName = nameParts.slice(1).join(' ');
          }

          // Build lead data
          const leadData: ExternalLeadData = {
            firstName,
            lastName,
            email: lead.SENDER_EMAIL,
            phone: lead.SENDER_MOBILE,
            source: 'INDIAMART',
            sourceDetails: `IndiaMART - ${lead.QUERY_PRODUCT_NAME || 'General'}`,
            companyName: lead.SENDER_COMPANY,
            address: lead.SENDER_ADDRESS,
            city: lead.SENDER_CITY,
            state: lead.SENDER_STATE,
            postalCode: lead.SENDER_PINCODE,
            customFields: {
              ...mappedData.customFields,
              indiaMartQueryId: lead.UNIQUE_QUERY_ID,
              queryType: lead.QUERY_TYPE,
              queryTime: lead.QUERY_TIME,
              interestedProduct: lead.QUERY_PRODUCT_NAME,
              enquiry: lead.QUERY_MESSAGE,
              subject: lead.SUBJECT,
            },
          };

          // Import through external lead import service
          const result = await externalLeadImportService.importExternalLead(
            organizationId,
            leadData
          );

          if (result.isDuplicate) {
            duplicates++;
          } else {
            imported++;

            // Auto-assign if enabled
            if (integration.autoAssign && result.rawImportRecord) {
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
          }
        } catch (error) {
          console.error(`[IndiaMART] Error processing lead ${lead.UNIQUE_QUERY_ID}:`, error);
          errors++;
        }
      }

      // Update integration status
      await prisma.indiaMartIntegration.update({
        where: { id: integration.id },
        data: {
          lastSyncAt: endDate,
          lastSyncStatus: errors > 0 ? 'PARTIAL' : 'SUCCESS',
          lastSyncError: null,
          totalLeadsSynced: { increment: imported },
        },
      });

      console.log(
        `[IndiaMART] Sync complete for org ${organizationId}: ${imported} imported, ${duplicates} duplicates, ${errors} errors`
      );

      return {
        success: true,
        totalFetched: leads.length,
        imported,
        duplicates,
        errors,
        message: `Sync completed successfully`,
      };
    } catch (error) {
      console.error(`[IndiaMART] Sync failed for org ${organizationId}:`, error);

      // Update integration with error
      await prisma.indiaMartIntegration.update({
        where: { id: integration.id },
        data: {
          lastSyncStatus: 'FAILED',
          lastSyncError: (error as Error).message,
        },
      });

      return {
        success: false,
        totalFetched: 0,
        imported: 0,
        duplicates: 0,
        errors: 1,
        message: `Sync failed: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Get all active integrations for scheduled sync
   */
  async getActiveIntegrations(): Promise<IndiaMartIntegration[]> {
    return prisma.indiaMartIntegration.findMany({
      where: { isActive: true },
    });
  }

  /**
   * Check if integration needs sync based on interval
   */
  needsSync(integration: IndiaMartIntegration): boolean {
    if (!integration.lastSyncAt) return true;

    const lastSync = new Date(integration.lastSyncAt);
    const intervalMs = (integration.syncInterval || 15) * 60 * 1000;
    const nextSyncTime = new Date(lastSync.getTime() + intervalMs);

    return new Date() >= nextSyncTime;
  }

  /**
   * Deactivate integration
   */
  async deactivateIntegration(organizationId: string): Promise<void> {
    await prisma.indiaMartIntegration.update({
      where: { organizationId },
      data: { isActive: false },
    });
  }

  /**
   * Activate integration
   */
  async activateIntegration(organizationId: string): Promise<void> {
    await prisma.indiaMartIntegration.update({
      where: { organizationId },
      data: { isActive: true },
    });
  }

  /**
   * Delete integration
   */
  async deleteIntegration(organizationId: string): Promise<void> {
    await prisma.indiaMartIntegration.delete({
      where: { organizationId },
    });
  }

  /**
   * Get integration stats
   */
  async getStats(organizationId: string): Promise<{
    totalLeadsSynced: number;
    lastSyncAt: Date | null;
    lastSyncStatus: string | null;
    nextSyncAt: Date | null;
    leadsToday: number;
    leadsThisWeek: number;
  }> {
    const integration = await this.getIntegration(organizationId);
    if (!integration) {
      return {
        totalLeadsSynced: 0,
        lastSyncAt: null,
        lastSyncStatus: null,
        nextSyncAt: null,
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
          customFields: { path: ['source'], equals: 'INDIAMART' },
          createdAt: { gte: todayStart },
        },
      }),
      prisma.rawImportRecord.count({
        where: {
          organizationId,
          customFields: { path: ['source'], equals: 'INDIAMART' },
          createdAt: { gte: weekStart },
        },
      }),
    ]);

    let nextSyncAt: Date | null = null;
    if (integration.lastSyncAt) {
      nextSyncAt = new Date(
        integration.lastSyncAt.getTime() + (integration.syncInterval || 15) * 60 * 1000
      );
    }

    return {
      totalLeadsSynced: integration.totalLeadsSynced,
      lastSyncAt: integration.lastSyncAt,
      lastSyncStatus: integration.lastSyncStatus,
      nextSyncAt,
      leadsToday,
      leadsThisWeek,
    };
  }
}

export const indiaMartService = new IndiaMartService();
export default indiaMartService;
