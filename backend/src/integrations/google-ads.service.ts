import { GoogleAdsApi, Customer, enums } from 'google-ads-api';
import { config } from '../config';
import { prisma } from '../config/database';
import { AdPlatform, LeadSource, LeadPriority } from '@prisma/client';
import { externalLeadImportService } from '../services/external-lead-import.service';

interface SyncResult {
  created: number;
  skipped: number;
  total: number;
}

interface LeadFormField {
  key: string;
  label: string;
  type: string;
}

interface GoogleAdsCredentials {
  clientId: string;
  clientSecret: string;
  developerToken: string;
  refreshToken: string;
  customerId: string;
}

interface GoogleLeadFormSubmission {
  lead_id: string;
  form_id: string;
  campaign_id: string;
  ad_group_id: string;
  creative_id: string;
  lead_submit_timestamp: string;
  column_data: Array<{
    column_id: string;
    column_name: string;
    string_value?: string;
  }>;
  user_column_data: Array<{
    column_id: string;
    column_name: string;
    string_value?: string;
  }>;
}

export class GoogleAdsService {
  private client: GoogleAdsApi | null = null;
  private credentials: GoogleAdsCredentials | null = null;

  /**
   * Initialize the Google Ads client with credentials
   */
  initialize(credentials: GoogleAdsCredentials) {
    this.credentials = credentials;
    this.client = new GoogleAdsApi({
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      developer_token: credentials.developerToken,
    });
  }

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return this.client !== null && this.credentials !== null;
  }

  /**
   * Get customer instance for API calls
   */
  private getCustomer(): Customer {
    if (!this.client || !this.credentials) {
      throw new Error('Google Ads not configured');
    }

    return this.client.Customer({
      customer_id: this.credentials.customerId,
      refresh_token: this.credentials.refreshToken,
    });
  }

  /**
   * Sync campaigns from Google Ads
   */
  async syncCampaigns(organizationId: string): Promise<any[]> {
    const customer = this.getCustomer();

    const campaigns = await customer.query(`
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        campaign_budget.amount_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.cost_micros
      FROM campaign
      WHERE campaign.status != 'REMOVED'
      ORDER BY campaign.id
    `);

    const results = [];

    for (const row of campaigns) {
      const campaignId = row.campaign?.id?.toString() || '';
      const campaignName = row.campaign?.name || 'Unknown Campaign';
      const status = row.campaign?.status || 'UNKNOWN';

      const existing = await prisma.adCampaign.findUnique({
        where: {
          platform_externalId: {
            platform: AdPlatform.GOOGLE,
            externalId: campaignId,
          },
        },
      });

      const data = {
        name: campaignName,
        status: String(status),
        impressions: Number(row.metrics?.impressions || 0),
        clicks: Number(row.metrics?.clicks || 0),
        conversions: Number(row.metrics?.conversions || 0),
        spend: Number(row.metrics?.cost_micros || 0) / 1000000,
        syncedAt: new Date(),
      };

      if (existing) {
        const updated = await prisma.adCampaign.update({
          where: { id: existing.id },
          data,
        });
        results.push(updated);
      } else {
        const created = await prisma.adCampaign.create({
          data: {
            organizationId,
            platform: AdPlatform.GOOGLE,
            externalId: campaignId,
            ...data,
          },
        });
        results.push(created);
      }
    }

    return results;
  }

  /**
   * Get lead form submissions from a campaign
   */
  async getLeadFormSubmissions(
    organizationId: string,
    formId: string,
    sinceDays: number = 7
  ): Promise<any[]> {
    const customer = this.getCustomer();

    const submissions = await customer.query(`
      SELECT
        lead_form_submission_data.id,
        lead_form_submission_data.lead_form_submission_fields,
        lead_form_submission_data.campaign,
        lead_form_submission_data.ad_group,
        lead_form_submission_data.submission_date_time
      FROM lead_form_submission_data
      WHERE lead_form_submission_data.lead_form = '${formId}'
      AND segments.date DURING LAST_${sinceDays}_DAYS
    `);

    const leads = [];

    for (const row of submissions) {
      const lead = await this.processLeadSubmission(row as unknown as GoogleLeadFormSubmission, organizationId);
      if (lead) {
        leads.push(lead);
      }
    }

    return leads;
  }

  /**
   * Process a lead form submission and create a lead
   */
  async processLeadSubmission(
    submission: GoogleLeadFormSubmission,
    organizationId: string
  ) {
    // Check if lead already exists
    const existingLead = await prisma.adLead.findFirst({
      where: {
        adCampaignId: submission.campaign_id,
        externalId: submission.lead_id,
      },
    });

    if (existingLead) {
      return null; // Already processed
    }

    // Parse lead data from columns
    const fields: Record<string, string> = {};
    const allData = [...(submission.column_data || []), ...(submission.user_column_data || [])];

    for (const col of allData) {
      if (col.string_value) {
        // Map common field names
        const fieldName = this.mapFieldName(col.column_name);
        fields[fieldName] = col.string_value;
      }
    }

    // Find or create campaign
    let adCampaign = await prisma.adCampaign.findUnique({
      where: {
        platform_externalId: {
          platform: AdPlatform.GOOGLE,
          externalId: submission.campaign_id,
        },
      },
    });

    if (!adCampaign) {
      adCampaign = await prisma.adCampaign.create({
        data: {
          organizationId,
          platform: AdPlatform.GOOGLE,
          externalId: submission.campaign_id,
          name: 'Google Ads Campaign',
          status: 'ACTIVE',
          syncedAt: new Date(),
        },
      });
    }

    // Route to RawImportRecord instead of creating Lead directly
    // This prevents voice agent loop and gives admin control
    const result = await externalLeadImportService.importExternalLead(organizationId, {
      firstName: fields.firstName || fields.fullName?.split(' ')[0] || 'Unknown',
      lastName: fields.lastName || fields.fullName?.split(' ').slice(1).join(' '),
      email: fields.email,
      phone: fields.phone || 'N/A',
      source: 'AD_GOOGLE',
      sourceDetails: `Google Ads Campaign: ${adCampaign.name}`,
      campaignName: adCampaign.name,
      customFields: {
        ...fields,
        leadId: submission.lead_id,
        campaignId: submission.campaign_id,
        adGroupId: submission.ad_group_id,
        formId: submission.form_id,
      },
    });

    if (result.isDuplicate) {
      console.log(`[GoogleAds] Duplicate lead skipped: ${fields.phone}`);
      return null;
    }

    // Update campaign conversions
    await prisma.adCampaign.update({
      where: { id: adCampaign.id },
      data: { conversions: { increment: 1 } },
    });

    console.log(`[GoogleAds] Lead imported to RawImportRecord: ${result.rawImportRecord.id}`);
    return result.rawImportRecord;
  }

  /**
   * Map Google Ads field names to standard field names
   */
  private mapFieldName(googleFieldName: string): string {
    const mappings: Record<string, string> = {
      'FULL_NAME': 'fullName',
      'FIRST_NAME': 'firstName',
      'LAST_NAME': 'lastName',
      'EMAIL': 'email',
      'PHONE_NUMBER': 'phone',
      'CITY': 'city',
      'REGION': 'state',
      'COUNTRY': 'country',
      'POSTAL_CODE': 'postalCode',
      'COMPANY_NAME': 'company',
      'JOB_TITLE': 'jobTitle',
      'WORK_EMAIL': 'workEmail',
      'WORK_PHONE': 'workPhone',
    };

    return mappings[googleFieldName] || googleFieldName.toLowerCase();
  }

  /**
   * Get campaign performance metrics
   */
  async getCampaignMetrics(campaignId: string, dateRange: string = 'LAST_30_DAYS') {
    const customer = this.getCustomer();

    const metrics = await customer.query(`
      SELECT
        campaign.id,
        campaign.name,
        metrics.impressions,
        metrics.clicks,
        metrics.ctr,
        metrics.average_cpc,
        metrics.conversions,
        metrics.cost_per_conversion,
        metrics.cost_micros
      FROM campaign
      WHERE campaign.id = ${campaignId}
      AND segments.date DURING ${dateRange}
    `);

    return metrics[0] || null;
  }

  /**
   * Get conversion tracking data
   */
  async getConversions(organizationId: string, dateRange: string = 'LAST_30_DAYS') {
    const customer = this.getCustomer();

    const conversions = await customer.query(`
      SELECT
        conversion_action.id,
        conversion_action.name,
        metrics.conversions,
        metrics.conversions_value,
        segments.conversion_action_category
      FROM conversion_action
      WHERE segments.date DURING ${dateRange}
    `);

    return conversions;
  }

  /**
   * Webhook handler for Google Ads lead form submissions
   * Supports multiple webhook formats:
   * 1. Direct Google Ads lead form webhook
   * 2. Google Cloud Pub/Sub webhook
   * 3. Zapier/Make integration format
   */
  async handleWebhook(payload: any, organizationId: string): Promise<any> {
    console.info(`[GoogleAds] Processing webhook for org: ${organizationId}`);

    // Format 1: Direct lead form submission
    if (payload.leadFormSubmission) {
      console.info(`[GoogleAds] Processing direct leadFormSubmission: ${payload.leadFormSubmission.lead_id}`);
      return this.processLeadSubmission(payload.leadFormSubmission, organizationId);
    }

    // Format 2: Google Cloud Pub/Sub message format
    if (payload.message && payload.message.data) {
      try {
        const decodedData = Buffer.from(payload.message.data, 'base64').toString('utf-8');
        const leadData = JSON.parse(decodedData);
        console.info(`[GoogleAds] Processing Pub/Sub message: ${leadData.lead_id || 'unknown'}`);

        if (leadData.lead_id && leadData.column_data) {
          return this.processLeadSubmission(leadData, organizationId);
        }
      } catch (error) {
        console.error('[GoogleAds] Failed to parse Pub/Sub message:', error);
        throw new Error('Invalid Pub/Sub message format');
      }
    }

    // Format 3: Zapier/Make integration format
    if (payload.lead_id || payload.leadId) {
      const leadSubmission: GoogleLeadFormSubmission = {
        lead_id: payload.lead_id || payload.leadId,
        form_id: payload.form_id || payload.formId || 'unknown',
        campaign_id: payload.campaign_id || payload.campaignId || 'unknown',
        ad_group_id: payload.ad_group_id || payload.adGroupId || 'unknown',
        creative_id: payload.creative_id || payload.creativeId || 'unknown',
        lead_submit_timestamp: payload.timestamp || payload.submittedAt || new Date().toISOString(),
        column_data: [],
        user_column_data: [],
      };

      // Map flat fields to column_data format
      const fieldMappings = ['firstName', 'lastName', 'email', 'phone', 'company', 'jobTitle', 'city', 'country'];
      for (const field of fieldMappings) {
        if (payload[field]) {
          leadSubmission.user_column_data.push({
            column_id: field,
            column_name: field.toUpperCase(),
            string_value: payload[field],
          });
        }
      }

      // Also check for nested user_data or lead_data
      const userData = payload.user_data || payload.lead_data || payload.data || {};
      for (const [key, value] of Object.entries(userData)) {
        if (typeof value === 'string') {
          leadSubmission.user_column_data.push({
            column_id: key,
            column_name: key.toUpperCase(),
            string_value: value,
          });
        }
      }

      console.info(`[GoogleAds] Processing Zapier/Make format lead: ${leadSubmission.lead_id}`);
      return this.processLeadSubmission(leadSubmission, organizationId);
    }

    // Format 4: Batch format (array of leads)
    if (Array.isArray(payload.leads)) {
      console.info(`[GoogleAds] Processing batch of ${payload.leads.length} leads`);
      const results = [];
      for (const lead of payload.leads) {
        try {
          const result = await this.handleWebhook(lead, organizationId);
          if (result) results.push(result);
        } catch (error) {
          console.error(`[GoogleAds] Failed to process lead in batch:`, error);
        }
      }
      return results;
    }

    console.warn('[GoogleAds] Webhook received but no recognizable lead format found', {
      hasLeadFormSubmission: !!payload.leadFormSubmission,
      hasMessage: !!payload.message,
      hasLeadId: !!payload.lead_id,
      payloadKeys: Object.keys(payload),
    });

    return null;
  }

  /**
   * Verify Google Cloud Pub/Sub webhook token
   * Used when receiving webhooks via Pub/Sub push subscription
   */
  verifyPubSubToken(token: string): boolean {
    const expectedToken = process.env.GOOGLE_PUBSUB_VERIFICATION_TOKEN;
    if (!expectedToken) {
      console.warn('[GoogleAds] GOOGLE_PUBSUB_VERIFICATION_TOKEN not configured');
      return true; // Allow in development
    }
    return token === expectedToken;
  }

  /**
   * Handle webhook verification (for webhook setup)
   */
  handleVerification(challenge: string): string {
    console.info('[GoogleAds] Webhook verification requested');
    return challenge;
  }

  /**
   * Get lead forms for campaigns
   */
  async getLeadForms() {
    const customer = this.getCustomer();

    const forms = await customer.query(`
      SELECT
        asset.id,
        asset.name,
        asset.lead_form_asset.business_name,
        asset.lead_form_asset.call_to_action_type,
        asset.lead_form_asset.headline,
        asset.lead_form_asset.description
      FROM asset
      WHERE asset.type = 'LEAD_FORM'
    `);

    return forms;
  }

  /**
   * Get ad groups with lead form extensions
   */
  async getAdGroupsWithLeadForms(campaignId: string) {
    const customer = this.getCustomer();

    const adGroups = await customer.query(`
      SELECT
        ad_group.id,
        ad_group.name,
        ad_group.status,
        campaign.id,
        campaign.name
      FROM ad_group
      WHERE campaign.id = ${campaignId}
      AND ad_group.status != 'REMOVED'
    `);

    return adGroups;
  }

  /**
   * Get form fields schema
   */
  async getFormFields(formId: string): Promise<LeadFormField[]> {
    const customer = this.getCustomer();

    const form = await customer.query(`
      SELECT
        asset.id,
        asset.lead_form_asset.fields
      FROM asset
      WHERE asset.id = ${formId}
      AND asset.type = 'LEAD_FORM'
    `);

    if (!form[0]) return [];

    const fields = form[0].asset?.lead_form_asset?.fields || [];
    return fields.map((f: any) => ({
      key: f.input_type || f.field_type,
      label: f.input_type || f.field_type,
      type: 'TEXT',
    }));
  }

  /**
   * Sync leads from a form with deduplication
   */
  async syncFormLeads(
    formId: string,
    organizationId: string,
    fieldMapping: Record<string, string> = {},
    sinceDays: number = 7
  ): Promise<SyncResult> {
    const customer = this.getCustomer();

    const submissions = await customer.query(`
      SELECT
        lead_form_submission_data.id,
        lead_form_submission_data.lead_form_submission_fields,
        lead_form_submission_data.campaign,
        lead_form_submission_data.ad_group,
        lead_form_submission_data.submission_date_time
      FROM lead_form_submission_data
      WHERE lead_form_submission_data.lead_form = '${formId}'
      AND segments.date DURING LAST_${sinceDays}_DAYS
    `);

    let created = 0;
    let skipped = 0;

    for (const row of submissions) {
      const fields: Record<string, string> = {};
      const submissionFields = row.lead_form_submission_data?.lead_form_submission_fields || [];

      for (const field of submissionFields) {
        if (field.field_value) {
          const mappedKey = this.mapFieldName(String(field.field_type || ''));
          const finalKey = fieldMapping[mappedKey] || mappedKey;
          fields[finalKey] = field.field_value;
        }
      }

      const phone = fields.phone || '';
      const email = fields.email || '';

      // Check for duplicates
      if (phone || email) {
        const existingLead = await prisma.lead.findFirst({
          where: {
            organizationId,
            OR: [
              ...(phone ? [{ phone }] : []),
              ...(email ? [{ email }] : []),
            ],
          },
        });

        if (existingLead) {
          skipped++;
          continue;
        }
      }

      // Create lead
      await this.createLeadFromFields(row, organizationId, fields);
      created++;
    }

    return { created, skipped, total: submissions.length };
  }

  /**
   * Create lead from parsed fields
   */
  private async createLeadFromFields(
    row: any,
    organizationId: string,
    fields: Record<string, string>
  ) {
    const campaignId = row.lead_form_submission_data?.campaign?.toString() || 'unknown';

    let adCampaign = await prisma.adCampaign.findUnique({
      where: {
        platform_externalId: {
          platform: AdPlatform.GOOGLE,
          externalId: campaignId,
        },
      },
    });

    if (!adCampaign) {
      adCampaign = await prisma.adCampaign.create({
        data: {
          organizationId,
          platform: AdPlatform.GOOGLE,
          externalId: campaignId,
          name: 'Google Ads Campaign',
          status: 'ACTIVE',
          syncedAt: new Date(),
        },
      });
    }

    const lead = await prisma.lead.create({
      data: {
        organizationId,
        firstName: fields.firstName || fields.fullName?.split(' ')[0] || 'Unknown',
        lastName: fields.lastName || fields.fullName?.split(' ').slice(1).join(' '),
        email: fields.email,
        phone: fields.phone || 'N/A',
        source: LeadSource.AD_GOOGLE,
        sourceDetails: `Google Ads Campaign: ${adCampaign.name}`,
        priority: LeadPriority.MEDIUM,
        customFields: fields,
      },
    });

    const leadId = row.lead_form_submission_data?.id?.toString() || `google-${Date.now()}`;

    await prisma.adLead.create({
      data: {
        adCampaignId: adCampaign.id,
        leadId: lead.id,
        externalId: leadId,
        rawData: row as any,
      },
    });

    await prisma.adCampaign.update({
      where: { id: adCampaign.id },
      data: { conversions: { increment: 1 } },
    });

    return lead;
  }
}

export const googleAdsService = new GoogleAdsService();
