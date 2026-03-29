import axios from 'axios';
import { config } from '../config';
import { prisma } from '../config/database';
import { AdPlatform, LeadSource, LeadPriority } from '@prisma/client';
import { externalLeadImportService } from '../services/external-lead-import.service';

// Use config for API URL
const getLinkedInApiUrl = () => `${config.apiUrls.linkedin}/${config.apiVersions.linkedin}`;

interface LinkedInLeadData {
  id: string;
  submittedAt: number;
  leadType: string;
  versionedLeadGenFormUrn: string;
  associatedEntityUrn: string;
  formResponse: {
    answers: Array<{
      questionId: string;
      answerDetails: {
        textQuestionAnswer?: { answer: string };
      };
    }>;
    leadGenFormUrn: string;
    leadGenFormVersionId: number;
  };
}

interface LinkedInCampaign {
  id: string;
  name: string;
  status: string;
  costInLocalCurrency?: string;
  impressions?: number;
  clicks?: number;
}

interface LinkedInAdAccount {
  id: string;
  name: string;
  status: string;
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

export class LinkedInService {
  private accessToken: string | null = null;

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  /**
   * Verify LinkedIn webhook signature
   * LinkedIn uses HMAC-SHA256 for webhook signatures
   * Uses timing-safe comparison to prevent timing attacks
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    const clientSecret = config.linkedin.clientSecret;
    if (!clientSecret) {
      console.error('[LinkedIn] SECURITY: Client secret not configured - rejecting webhook');
      return false; // NEVER allow unsigned webhooks in any environment
    }

    if (!signature) {
      console.error('[LinkedIn] SECURITY: No signature provided in webhook request');
      return false;
    }

    try {
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', clientSecret)
        .update(payload)
        .digest('hex');

      // Handle both with and without sha256= prefix
      const cleanSignature = signature.replace('sha256=', '');

      // Use timing-safe comparison to prevent timing attacks
      const expectedBuffer = Buffer.from(expectedSignature, 'hex');
      const receivedBuffer = Buffer.from(cleanSignature, 'hex');

      if (expectedBuffer.length !== receivedBuffer.length) {
        console.warn('[LinkedIn] Signature length mismatch');
        return false;
      }

      return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
    } catch (error) {
      console.error('[LinkedIn] Signature verification error:', error);
      return false;
    }
  }

  /**
   * Handle webhook events from LinkedIn
   * Supports multiple formats:
   * 1. Standard LinkedIn Lead Gen webhook
   * 2. LinkedIn Partner Events format
   * 3. Zapier/Make integration format
   * 4. Batch lead format
   */
  async handleWebhook(payload: Record<string, unknown>, organizationId: string) {
    console.info(`[LinkedIn] Processing webhook for org: ${organizationId}`);

    // Format 1: Standard LinkedIn Lead Gen webhook with formResponse
    const leadData = payload as unknown as LinkedInLeadData;
    if (leadData.formResponse) {
      console.info(`[LinkedIn] Processing standard lead: ${leadData.id}`);
      return this.processLeadDataWithDedup(leadData, organizationId);
    }

    // Format 2: LinkedIn Partner Events format
    if (payload.eventType === 'LEAD_GEN_FORM_SUBMIT' && payload.leadGenFormSubmission) {
      const submission = payload.leadGenFormSubmission as LinkedInLeadData;
      console.info(`[LinkedIn] Processing Partner Event lead: ${submission.id}`);
      return this.processLeadDataWithDedup(submission, organizationId);
    }

    // Format 3: Array of leads (batch processing)
    if (Array.isArray(payload.leads) || Array.isArray(payload.elements)) {
      const leads = (payload.leads || payload.elements) as LinkedInLeadData[];
      console.info(`[LinkedIn] Processing batch of ${leads.length} leads`);

      const results = [];
      for (const lead of leads) {
        try {
          const result = await this.processLeadDataWithDedup(lead, organizationId);
          if (result) results.push(result);
        } catch (error) {
          console.error(`[LinkedIn] Failed to process lead in batch:`, error);
        }
      }
      return results;
    }

    // Format 4: Flat field format (Zapier/Make integrations)
    if (payload.email || payload.firstName || payload.leadId) {
      console.info(`[LinkedIn] Processing flat format lead`);

      const syntheticLead: LinkedInLeadData = {
        id: (payload.leadId as string) || `linkedin-${Date.now()}`,
        submittedAt: payload.submittedAt as number || Date.now(),
        leadType: 'LEAD_GEN_FORM',
        versionedLeadGenFormUrn: (payload.formUrn as string) || '',
        associatedEntityUrn: (payload.campaignUrn as string) || (payload.associatedEntityUrn as string) || '',
        formResponse: {
          answers: this.flatFieldsToAnswers(payload),
          leadGenFormUrn: (payload.formUrn as string) || '',
          leadGenFormVersionId: 1,
        },
      };

      return this.processLeadDataWithDedup(syntheticLead, organizationId);
    }

    console.warn('[LinkedIn] Webhook received but no recognizable lead format found', {
      hasFormResponse: !!leadData.formResponse,
      hasEventType: !!payload.eventType,
      hasLeads: !!payload.leads,
      hasEmail: !!payload.email,
      payloadKeys: Object.keys(payload),
    });

    return null;
  }

  /**
   * Convert flat fields to LinkedIn answer format
   */
  private flatFieldsToAnswers(payload: Record<string, unknown>): LinkedInLeadData['formResponse']['answers'] {
    const fieldMappings: Record<string, string> = {
      firstName: 'firstName',
      lastName: 'lastName',
      email: 'emailAddress',
      phone: 'phoneNumber',
      company: 'companyName',
      jobTitle: 'jobTitle',
      city: 'city',
      country: 'country',
    };

    const answers = [];
    for (const [key, questionId] of Object.entries(fieldMappings)) {
      const value = payload[key];
      if (value && typeof value === 'string') {
        answers.push({
          questionId,
          answerDetails: {
            textQuestionAnswer: { answer: value },
          },
        });
      }
    }

    return answers;
  }

  /**
   * Process lead data with duplicate checking
   */
  async processLeadDataWithDedup(leadData: LinkedInLeadData, organizationId: string) {
    // Check if lead already exists by external ID
    const existingAdLead = await prisma.adLead.findFirst({
      where: { externalId: leadData.id },
    });

    if (existingAdLead) {
      console.info(`[LinkedIn] Lead already exists: ${leadData.id}`);
      return null;
    }

    // Parse fields and check for duplicate by email/phone
    const fields = this.parseFormAnswers(leadData.formResponse.answers);

    if (fields.email || fields.phone) {
      const existingLead = await prisma.lead.findFirst({
        where: {
          organizationId,
          OR: [
            ...(fields.email ? [{ email: fields.email }] : []),
            ...(fields.phone ? [{ phone: fields.phone }] : []),
          ],
        },
      });

      if (existingLead) {
        console.info(`[LinkedIn] Duplicate lead found by email/phone: ${existingLead.id}`);
        // Still create AdLead record for tracking
        const campaignUrn = leadData.associatedEntityUrn;
        const campaignId = campaignUrn.split(':').pop() || 'unknown';

        const adCampaign = await prisma.adCampaign.findUnique({
          where: {
            platform_externalId: {
              platform: AdPlatform.LINKEDIN,
              externalId: campaignId,
            },
          },
        });

        if (adCampaign) {
          await prisma.adLead.create({
            data: {
              adCampaignId: adCampaign.id,
              leadId: existingLead.id,
              externalId: leadData.id,
              rawData: leadData as any,
            },
          });
        }

        return existingLead;
      }
    }

    return this.processLeadData(leadData, organizationId);
  }

  async processLeadData(leadData: LinkedInLeadData, organizationId: string) {
    // Parse answers
    const fields = this.parseFormAnswers(leadData.formResponse.answers);

    // Extract campaign ID from associated entity
    const campaignUrn = leadData.associatedEntityUrn;
    const campaignId = campaignUrn.split(':').pop() || 'unknown';

    // Find or create ad campaign
    let adCampaign = await prisma.adCampaign.findUnique({
      where: {
        platform_externalId: {
          platform: AdPlatform.LINKEDIN,
          externalId: campaignId,
        },
      },
    });

    if (!adCampaign) {
      adCampaign = await prisma.adCampaign.create({
        data: {
          organizationId,
          platform: AdPlatform.LINKEDIN,
          externalId: campaignId,
          name: 'LinkedIn Campaign',
          status: 'ACTIVE',
          syncedAt: new Date(),
        },
      });
    }

    // Use externalLeadImportService to route to Raw Imports (like other platforms)
    const result = await externalLeadImportService.importExternalLead(organizationId, {
      firstName: fields.firstName || fields.name?.split(' ')[0] || 'Unknown',
      lastName: fields.lastName || fields.name?.split(' ').slice(1).join(' ') || '',
      email: fields.email || '',
      phone: fields.phone || '',
      source: 'AD_LINKEDIN',
      sourceDetails: `LinkedIn Campaign: ${adCampaign.name}`,
      customFields: {
        ...fields,
        linkedInLeadId: leadData.id,
        campaignId: campaignId,
        campaignName: adCampaign.name,
        company: fields.company || '',
        jobTitle: fields.title || '',
      },
    });

    // Update campaign conversions
    await prisma.adCampaign.update({
      where: { id: adCampaign.id },
      data: { conversions: { increment: 1 } },
    });

    console.info(`[LinkedIn] Lead imported to Raw Imports: ${result.id}`);
    return result;
  }

  private parseFormAnswers(answers: LinkedInLeadData['formResponse']['answers']): Record<string, string> {
    const result: Record<string, string> = {};
    const fieldMappings: Record<string, string> = {
      firstName: 'firstName',
      lastName: 'lastName',
      emailAddress: 'email',
      phoneNumber: 'phone',
      companyName: 'company',
      jobTitle: 'title',
    };

    for (const answer of answers) {
      const value = answer.answerDetails.textQuestionAnswer?.answer;
      if (value) {
        const fieldName = fieldMappings[answer.questionId] || answer.questionId;
        result[fieldName] = value;
      }
    }

    return result;
  }

  async syncCampaigns(organizationId: string, adAccountId: string) {
    if (!this.accessToken) {
      throw new Error('LinkedIn access token not set');
    }

    const response = await axios.get(`${getLinkedInApiUrl()}/adCampaignsV2`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      params: {
        q: 'search',
        'search.account.values[0]': `urn:li:sponsoredAccount:${adAccountId}`,
      },
    });

    const campaigns: LinkedInCampaign[] = response.data.elements;
    const results = [];

    for (const campaign of campaigns) {
      const campaignId = String(campaign.id);

      const existing = await prisma.adCampaign.findUnique({
        where: {
          platform_externalId: {
            platform: AdPlatform.LINKEDIN,
            externalId: campaignId,
          },
        },
      });

      if (existing) {
        const updated = await prisma.adCampaign.update({
          where: { id: existing.id },
          data: {
            name: campaign.name,
            status: campaign.status,
            impressions: campaign.impressions,
            clicks: campaign.clicks,
            syncedAt: new Date(),
          },
        });
        results.push(updated);
      } else {
        const created = await prisma.adCampaign.create({
          data: {
            organizationId,
            platform: AdPlatform.LINKEDIN,
            externalId: campaignId,
            name: campaign.name,
            status: campaign.status,
            impressions: campaign.impressions,
            clicks: campaign.clicks,
            syncedAt: new Date(),
          },
        });
        results.push(created);
      }
    }

    return results;
  }

  async getLeadGenForms(adAccountId: string) {
    if (!this.accessToken) {
      throw new Error('LinkedIn access token not set');
    }

    const response = await axios.get(`${getLinkedInApiUrl()}/leadGenForms`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      params: {
        q: 'account',
        account: `urn:li:sponsoredAccount:${adAccountId}`,
      },
    });

    return response.data.elements;
  }

  /**
   * Get LinkedIn ad accounts
   */
  async getAdAccounts(): Promise<LinkedInAdAccount[]> {
    if (!this.accessToken) {
      throw new Error('LinkedIn access token not set');
    }

    const response = await axios.get(`${getLinkedInApiUrl()}/adAccountsV2`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      params: {
        q: 'search',
      },
    });

    return (response.data.elements || []).map((acc: any) => ({
      id: String(acc.id),
      name: acc.name,
      status: acc.status,
    }));
  }

  /**
   * Get form fields schema
   */
  async getFormFields(formId: string): Promise<LeadFormField[]> {
    if (!this.accessToken) {
      throw new Error('LinkedIn access token not set');
    }

    const response = await axios.get(`${getLinkedInApiUrl()}/leadGenForms/${formId}`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    const questions = response.data.questions || [];
    return questions.map((q: any) => ({
      key: q.questionId || q.name,
      label: q.questionText || q.name,
      type: q.questionType || 'TEXT',
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
      throw new Error('LinkedIn access token not set');
    }

    const response = await axios.get(`${getLinkedInApiUrl()}/leadGenFormResponses`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      params: {
        q: 'form',
        form: `urn:li:leadGenForm:${formId}`,
      },
    });

    const leadsData = response.data.elements || [];
    let created = 0;
    let skipped = 0;

    for (const leadData of leadsData) {
      const fields = this.parseFormAnswers(leadData.formResponse?.answers || []);
      const mappedFields = this.applyFieldMapping(fields, fieldMapping);

      const phone = mappedFields.phone || '';
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

    return { created, skipped, total: leadsData.length };
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
   * Create lead from LinkedIn data
   */
  private async createLeadFromData(
    leadData: any,
    organizationId: string,
    fields: Record<string, string>
  ) {
    const campaignUrn = leadData.associatedEntityUrn || '';
    const campaignId = campaignUrn.split(':').pop() || 'unknown';

    let adCampaign = await prisma.adCampaign.findUnique({
      where: {
        platform_externalId: {
          platform: AdPlatform.LINKEDIN,
          externalId: campaignId,
        },
      },
    });

    if (!adCampaign) {
      adCampaign = await prisma.adCampaign.create({
        data: {
          organizationId,
          platform: AdPlatform.LINKEDIN,
          externalId: campaignId,
          name: 'LinkedIn Campaign',
          status: 'ACTIVE',
          syncedAt: new Date(),
        },
      });
    }

    const lead = await prisma.lead.create({
      data: {
        organizationId,
        firstName: fields.firstName || fields.name?.split(' ')[0] || 'Unknown',
        lastName: fields.lastName || fields.name?.split(' ').slice(1).join(' '),
        email: fields.email,
        phone: fields.phone || 'N/A',
        source: LeadSource.AD_LINKEDIN,
        sourceDetails: `LinkedIn Campaign: ${adCampaign.name}`,
        priority: LeadPriority.MEDIUM,
        customFields: fields,
      },
    });

    await prisma.adLead.create({
      data: {
        adCampaignId: adCampaign.id,
        leadId: lead.id,
        externalId: leadData.id || `linkedin-${Date.now()}`,
        rawData: leadData as any,
      },
    });

    await prisma.adCampaign.update({
      where: { id: adCampaign.id },
      data: { conversions: { increment: 1 } },
    });

    return lead;
  }
}

export const linkedinService = new LinkedInService();
