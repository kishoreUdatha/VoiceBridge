import axios from 'axios';
import crypto from 'crypto';
import { config } from '../config';
import { prisma } from '../config/database';
import { AdPlatform, LeadSource, LeadPriority } from '@prisma/client';
import { externalLeadImportService } from '../services/external-lead-import.service';

// Use config for API URL and version
const getFbGraphUrl = () => `${config.apiUrls.facebookGraph}/${config.apiVersions.facebook}`;

interface InstagramLeadData {
  id: string;
  created_time: string;
  field_data: Array<{ name: string; values: string[] }>;
  ad_id?: string;
  adset_id?: string;
  campaign_id?: string;
  form_id?: string;
  platform?: string;
}

interface InstagramInsights {
  impressions: number;
  reach: number;
  engagement: number;
  clicks: number;
  spend: number;
}

interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: {
    id: string;
    username: string;
    profile_picture_url?: string;
    followers_count?: number;
  };
}

interface LeadFormField {
  key: string;
  label: string;
  type: string;
}

interface SyncResult {
  created: number;
  skipped: number;
  total: number;
}

export class InstagramService {
  private accessToken: string | null = null;

  /**
   * Set access token for API calls
   * Note: Instagram uses Facebook's access token
   */
  setAccessToken(token: string) {
    this.accessToken = token;
  }

  /**
   * Verify signature with organization-specific app secret
   * Uses timing-safe comparison to prevent timing attacks
   */
  verifySignatureWithSecret(payload: string, signature: string, appSecret: string): boolean {
    if (!appSecret) {
      console.error('[Instagram] SECURITY: No app secret provided for signature verification');
      return false;
    }
    if (!signature) {
      console.error('[Instagram] SECURITY: No signature provided in webhook request');
      return false;
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', appSecret)
        .update(payload)
        .digest('hex');

      const cleanSignature = signature.replace('sha256=', '');

      // Use timing-safe comparison
      const expectedBuffer = Buffer.from(expectedSignature, 'hex');
      const receivedBuffer = Buffer.from(cleanSignature, 'hex');

      if (expectedBuffer.length !== receivedBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
    } catch (error) {
      console.error('[Instagram] Signature verification error:', error);
      return false;
    }
  }

  /**
   * Verify webhook signature (same as Facebook) - fallback to env
   * Uses timing-safe comparison to prevent timing attacks
   */
  verifySignature(payload: string, signature: string): boolean {
    const secret = config.facebook.appSecret || '';
    if (!secret) {
      console.error('[Instagram] SECURITY: No app secret configured for signature verification');
      return false;
    }
    if (!signature) {
      console.error('[Instagram] SECURITY: No signature provided in webhook request');
      return false;
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      const cleanSignature = signature.replace('sha256=', '');

      // Use timing-safe comparison
      const expectedBuffer = Buffer.from(expectedSignature, 'hex');
      const receivedBuffer = Buffer.from(cleanSignature, 'hex');

      if (expectedBuffer.length !== receivedBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
    } catch (error) {
      console.error('[Instagram] Signature verification error:', error);
      return false;
    }
  }

  /**
   * Handle webhook for Instagram lead ads
   */
  async handleWebhook(payload: Record<string, unknown>, organizationId: string) {
    const entry = (payload.entry as any[])?.[0];
    const changes = entry?.changes?.[0];

    // Check if it's from Instagram
    if (changes?.field === 'leadgen') {
      const leadgenId = changes.value?.leadgen_id;
      const inlineFieldData = changes.value?.field_data;
      const platform = changes.value?.page_id ? 'instagram' : 'facebook';

      // If field_data is provided directly in webhook (for testing), process inline
      if (inlineFieldData && Array.isArray(inlineFieldData)) {
        console.info(`[Instagram] Processing inline field_data for org: ${organizationId}`);
        return this.processInlineLeadData(inlineFieldData, organizationId, changes.value?.campaign_name);
      }

      if (leadgenId && platform === 'instagram') {
        console.info(`[Instagram] Processing leadgen event: ${leadgenId} for org: ${organizationId}`);
        return this.processLeadgenEvent(leadgenId, organizationId);
      }

      if (!leadgenId) {
        console.warn('[Instagram] Webhook received leadgen event but no leadgen_id found');
      } else if (platform !== 'instagram') {
        console.info(`[Instagram] Skipping non-Instagram leadgen event (platform: ${platform})`);
      }
    } else {
      console.info(`[Instagram] Webhook received non-leadgen event: field=${changes?.field || 'unknown'}`);
    }

    return null;
  }

  /**
   * Process inline lead data for testing without Instagram API
   */
  async processInlineLeadData(fieldData: any[], organizationId: string, campaignName?: string) {
    const fields = this.parseFieldData(fieldData);

    const result = await externalLeadImportService.importExternalLead(organizationId, {
      firstName: fields.first_name || fields.full_name?.split(' ')[0] || 'Unknown',
      lastName: fields.last_name || fields.full_name?.split(' ').slice(1).join(' '),
      email: fields.email,
      phone: fields.phone_number || 'N/A',
      source: 'AD_INSTAGRAM',
      sourceDetails: `Campaign: ${campaignName || 'Instagram Test Campaign'}`,
      campaignName: campaignName,
      customFields: {
        inlineData: true,
        processedAt: new Date().toISOString(),
      },
    });

    console.info(`[Instagram] Inline lead processed: ${result.rawImportRecord.id}, duplicate: ${result.isDuplicate}`);
    return result;
  }

  /**
   * Process a lead gen event from Instagram
   */
  async processLeadgenEvent(leadgenId: string, organizationId: string) {
    if (!this.accessToken) {
      throw new Error('Instagram access token not set');
    }

    // Fetch lead data from Facebook Graph API
    const response = await axios.get(`${getFbGraphUrl()}/${leadgenId}`, {
      params: {
        access_token: this.accessToken,
        fields: 'id,created_time,field_data,ad_id,adset_id,campaign_id,form_id',
      },
    });

    const leadData: InstagramLeadData = response.data;
    const fields = this.parseFieldData(leadData.field_data);

    // Find or create ad campaign
    let adCampaign = null;
    if (leadData.campaign_id) {
      adCampaign = await prisma.adCampaign.findUnique({
        where: {
          platform_externalId: {
            platform: AdPlatform.INSTAGRAM,
            externalId: leadData.campaign_id,
          },
        },
      });

      if (!adCampaign) {
        // Fetch campaign details from Facebook API
        const campaignResponse = await axios.get(
          `${getFbGraphUrl()}/${leadData.campaign_id}`,
          {
            params: {
              access_token: this.accessToken,
              fields: 'name,status,objective',
            },
          }
        );

        adCampaign = await prisma.adCampaign.create({
          data: {
            organizationId,
            platform: AdPlatform.INSTAGRAM,
            externalId: leadData.campaign_id,
            name: campaignResponse.data.name || 'Instagram Campaign',
            status: campaignResponse.data.status || 'UNKNOWN',
            syncedAt: new Date(),
          },
        });
      }
    }

    // Route to RawImportRecord instead of creating Lead directly
    // This prevents voice agent loop and gives admin control
    const result = await externalLeadImportService.importExternalLead(organizationId, {
      firstName: fields.first_name || fields.full_name?.split(' ')[0] || 'Unknown',
      lastName: fields.last_name || fields.full_name?.split(' ').slice(1).join(' '),
      email: fields.email,
      phone: fields.phone_number || 'N/A',
      source: 'AD_INSTAGRAM',
      sourceDetails: `Instagram Campaign: ${adCampaign?.name || 'Unknown'}`,
      campaignName: adCampaign?.name,
      customFields: {
        ...fields,
        leadgenId,
        campaignId: leadData.campaign_id,
        adId: leadData.ad_id,
        formId: leadData.form_id,
      },
    });

    if (result.isDuplicate) {
      console.log(`[Instagram] Duplicate lead skipped: ${fields.phone_number}`);
      return result.rawImportRecord;
    }

    // Update campaign conversions count
    if (adCampaign) {
      await prisma.adCampaign.update({
        where: { id: adCampaign.id },
        data: { conversions: { increment: 1 } },
      });
    }

    console.log(`[Instagram] Lead imported to RawImportRecord: ${result.rawImportRecord.id}`);
    return result.rawImportRecord;
  }

  /**
   * Parse field data from lead form
   */
  private parseFieldData(fieldData: Array<{ name: string; values: string[] }>): Record<string, string> {
    const result: Record<string, string> = {};
    for (const field of fieldData) {
      // Normalize field name to lowercase with underscore
      const normalizedName = field.name.toLowerCase().replace(/-/g, '_');
      result[normalizedName] = field.values[0];
    }
    return result;
  }

  /**
   * Sync Instagram campaigns through Facebook API
   */
  async syncCampaigns(organizationId: string, adAccountId: string) {
    if (!this.accessToken) {
      throw new Error('Instagram access token not set');
    }

    // Get campaigns with Instagram placement
    const response = await axios.get(`${getFbGraphUrl()}/act_${adAccountId}/campaigns`, {
      params: {
        access_token: this.accessToken,
        fields: 'id,name,status,objective,effective_status',
        filtering: JSON.stringify([
          {
            field: 'effective_status',
            operator: 'IN',
            value: ['ACTIVE', 'PAUSED', 'PENDING_REVIEW'],
          },
        ]),
      },
    });

    const campaigns = response.data.data;
    const results = [];

    for (const campaign of campaigns) {
      // Check if campaign has Instagram placement
      const adsetsResponse = await axios.get(`${getFbGraphUrl()}/${campaign.id}/adsets`, {
        params: {
          access_token: this.accessToken,
          fields: 'id,targeting',
        },
      });

      const hasInstagram = adsetsResponse.data.data?.some((adset: any) => {
        const placements = adset.targeting?.publisher_platforms || [];
        return placements.includes('instagram');
      });

      if (!hasInstagram) continue;

      const existing = await prisma.adCampaign.findUnique({
        where: {
          platform_externalId: {
            platform: AdPlatform.INSTAGRAM,
            externalId: campaign.id,
          },
        },
      });

      if (existing) {
        const updated = await prisma.adCampaign.update({
          where: { id: existing.id },
          data: {
            name: campaign.name,
            status: campaign.status,
            syncedAt: new Date(),
          },
        });
        results.push(updated);
      } else {
        const created = await prisma.adCampaign.create({
          data: {
            organizationId,
            platform: AdPlatform.INSTAGRAM,
            externalId: campaign.id,
            name: campaign.name,
            status: campaign.status,
            syncedAt: new Date(),
          },
        });
        results.push(created);
      }
    }

    return results;
  }

  /**
   * Get Instagram account insights
   */
  async getAccountInsights(instagramAccountId: string, period: string = 'day') {
    if (!this.accessToken) {
      throw new Error('Instagram access token not set');
    }

    const response = await axios.get(`${getFbGraphUrl()}/${instagramAccountId}/insights`, {
      params: {
        access_token: this.accessToken,
        metric: 'impressions,reach,profile_views,follower_count',
        period,
      },
    });

    return response.data.data;
  }

  /**
   * Get Instagram campaign insights
   */
  async getCampaignInsights(campaignId: string): Promise<InstagramInsights | null> {
    if (!this.accessToken) {
      throw new Error('Instagram access token not set');
    }

    const response = await axios.get(`${getFbGraphUrl()}/${campaignId}/insights`, {
      params: {
        access_token: this.accessToken,
        fields: 'impressions,reach,actions,spend,clicks',
        breakdowns: 'publisher_platform',
      },
    });

    const data = response.data.data?.[0];
    if (!data) return null;

    return {
      impressions: parseInt(data.impressions || '0'),
      reach: parseInt(data.reach || '0'),
      engagement: data.actions?.reduce((acc: number, a: any) => acc + parseInt(a.value || '0'), 0) || 0,
      clicks: parseInt(data.clicks || '0'),
      spend: parseFloat(data.spend || '0'),
    };
  }

  /**
   * Get Instagram lead forms
   */
  async getLeadForms(pageId: string) {
    if (!this.accessToken) {
      throw new Error('Instagram access token not set');
    }

    const response = await axios.get(`${getFbGraphUrl()}/${pageId}/leadgen_forms`, {
      params: {
        access_token: this.accessToken,
        fields: 'id,name,status,leads_count,locale,created_time',
      },
    });

    return response.data.data;
  }

  /**
   * Get leads from a specific form
   */
  async getFormLeads(formId: string, organizationId: string) {
    if (!this.accessToken) {
      throw new Error('Instagram access token not set');
    }

    const response = await axios.get(`${getFbGraphUrl()}/${formId}/leads`, {
      params: {
        access_token: this.accessToken,
        fields: 'id,created_time,field_data,ad_id,adset_id,campaign_id',
      },
    });

    const leads = [];
    for (const leadData of response.data.data) {
      const lead = await this.processLeadgenEvent(leadData.id, organizationId);
      if (lead) leads.push(lead);
    }

    return leads;
  }

  /**
   * Get connected Instagram accounts for a Facebook page
   */
  async getConnectedAccounts(pageId: string) {
    if (!this.accessToken) {
      throw new Error('Instagram access token not set');
    }

    const response = await axios.get(`${getFbGraphUrl()}/${pageId}`, {
      params: {
        access_token: this.accessToken,
        fields: 'instagram_business_account{id,username,profile_picture_url,followers_count}',
      },
    });

    return response.data.instagram_business_account;
  }

  /**
   * Get Facebook pages the user has access to
   */
  async getPages(): Promise<FacebookPage[]> {
    if (!this.accessToken) {
      throw new Error('Instagram access token not set');
    }

    const response = await axios.get(`${getFbGraphUrl()}/me/accounts`, {
      params: {
        access_token: this.accessToken,
        fields: 'id,name,access_token,instagram_business_account{id,username,profile_picture_url,followers_count}',
      },
    });

    return response.data.data || [];
  }

  /**
   * Get form fields schema
   */
  async getFormFields(formId: string): Promise<LeadFormField[]> {
    if (!this.accessToken) {
      throw new Error('Instagram access token not set');
    }

    const response = await axios.get(`${getFbGraphUrl()}/${formId}`, {
      params: {
        access_token: this.accessToken,
        fields: 'id,name,questions',
      },
    });

    const questions = response.data.questions || [];
    return questions.map((q: any) => ({
      key: q.key,
      label: q.label,
      type: q.type,
    }));
  }

  /**
   * Sync leads from a form with deduplication
   */
  async syncFormLeads(
    formId: string,
    organizationId: string,
    fieldMapping: Record<string, string> = {}
  ): Promise<SyncResult> {
    if (!this.accessToken) {
      throw new Error('Instagram access token not set');
    }

    const response = await axios.get(`${getFbGraphUrl()}/${formId}/leads`, {
      params: {
        access_token: this.accessToken,
        fields: 'id,created_time,field_data,ad_id,adset_id,campaign_id',
      },
    });

    const leadsData = response.data.data || [];
    let created = 0;
    let skipped = 0;

    for (const leadData of leadsData) {
      const fields = this.parseFieldData(leadData.field_data);
      const mappedFields = this.applyFieldMapping(fields, fieldMapping);

      const phone = mappedFields.phone || mappedFields.phone_number || '';
      const email = mappedFields.email || '';

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
      await this.createLeadFromData(leadData, organizationId, mappedFields);
      created++;
    }

    return {
      created,
      skipped,
      total: leadsData.length,
    };
  }

  /**
   * Apply field mapping to parsed fields
   */
  private applyFieldMapping(
    fields: Record<string, string>,
    mapping: Record<string, string>
  ): Record<string, string> {
    if (!mapping || Object.keys(mapping).length === 0) {
      return fields;
    }

    const result: Record<string, string> = {};

    for (const [sourceKey, value] of Object.entries(fields)) {
      const targetKey = mapping[sourceKey] || sourceKey;
      result[targetKey] = value;
    }

    return result;
  }

  /**
   * Create lead from Instagram lead data
   */
  private async createLeadFromData(
    leadData: InstagramLeadData,
    organizationId: string,
    fields: Record<string, string>
  ) {
    // Find or create ad campaign
    let adCampaign = null;
    if (leadData.campaign_id) {
      adCampaign = await prisma.adCampaign.findUnique({
        where: {
          platform_externalId: {
            platform: AdPlatform.INSTAGRAM,
            externalId: leadData.campaign_id,
          },
        },
      });

      if (!adCampaign) {
        try {
          const campaignResponse = await axios.get(
            `${getFbGraphUrl()}/${leadData.campaign_id}`,
            {
              params: {
                access_token: this.accessToken,
                fields: 'name,status,objective',
              },
            }
          );

          adCampaign = await prisma.adCampaign.create({
            data: {
              organizationId,
              platform: AdPlatform.INSTAGRAM,
              externalId: leadData.campaign_id,
              name: campaignResponse.data.name || 'Instagram Campaign',
              status: campaignResponse.data.status || 'UNKNOWN',
              syncedAt: new Date(),
            },
          });
        } catch {
          // Campaign fetch failed, create with placeholder name
          adCampaign = await prisma.adCampaign.create({
            data: {
              organizationId,
              platform: AdPlatform.INSTAGRAM,
              externalId: leadData.campaign_id,
              name: 'Instagram Campaign',
              status: 'UNKNOWN',
              syncedAt: new Date(),
            },
          });
        }
      }
    }

    // Route to RawImportRecord instead of creating Lead directly
    const result = await externalLeadImportService.importExternalLead(organizationId, {
      firstName: fields.first_name || fields.firstName || fields.full_name?.split(' ')[0] || 'Unknown',
      lastName: fields.last_name || fields.lastName || fields.full_name?.split(' ').slice(1).join(' '),
      email: fields.email,
      phone: fields.phone_number || fields.phone || 'N/A',
      source: 'AD_INSTAGRAM',
      sourceDetails: `Instagram Campaign: ${adCampaign?.name || 'Unknown'}`,
      campaignName: adCampaign?.name,
      customFields: {
        ...fields,
        leadId: leadData.id,
        campaignId: leadData.campaign_id,
        adId: leadData.ad_id,
        formId: leadData.form_id,
      },
    });

    if (result.isDuplicate) {
      return null;
    }

    if (adCampaign) {
      await prisma.adCampaign.update({
        where: { id: adCampaign.id },
        data: { conversions: { increment: 1 } },
      });
    }

    return result.rawImportRecord;
  }

  /**
   * Handle webhook with field mapping support
   */
  async handleWebhookWithMapping(
    payload: Record<string, unknown>,
    organizationId: string,
    fieldMapping?: Record<string, string>
  ) {
    const entry = (payload.entry as any[])?.[0];
    const changes = entry?.changes?.[0];

    if (changes?.field === 'leadgen') {
      const leadgenId = changes.value?.leadgen_id;
      const pageId = changes.value?.page_id;

      if (leadgenId) {
        // Try to find stored integration with field mapping
        let mapping = fieldMapping || {};

        if (pageId && !fieldMapping) {
          const integration = await prisma.instagramIntegration.findFirst({
            where: {
              organizationId,
              pageId: String(pageId),
              isActive: true,
            },
          });

          if (integration?.fieldMapping) {
            mapping = integration.fieldMapping as Record<string, string>;
          }
        }

        return this.processLeadgenEventWithMapping(leadgenId, organizationId, mapping);
      }
    }

    return null;
  }

  /**
   * Process lead gen event with field mapping
   */
  async processLeadgenEventWithMapping(
    leadgenId: string,
    organizationId: string,
    fieldMapping: Record<string, string> = {}
  ) {
    if (!this.accessToken) {
      throw new Error('Instagram access token not set');
    }

    const response = await axios.get(`${getFbGraphUrl()}/${leadgenId}`, {
      params: {
        access_token: this.accessToken,
        fields: 'id,created_time,field_data,ad_id,adset_id,campaign_id,form_id',
      },
    });

    const leadData: InstagramLeadData = response.data;
    const fields = this.parseFieldData(leadData.field_data);
    const mappedFields = this.applyFieldMapping(fields, fieldMapping);

    // Deduplication check
    const phone = mappedFields.phone || mappedFields.phone_number || '';
    const email = mappedFields.email || '';

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
        return existingLead;
      }
    }

    return this.createLeadFromData(leadData, organizationId, mappedFields);
  }
}

export const instagramService = new InstagramService();
