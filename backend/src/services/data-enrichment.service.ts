/**
 * Data Enrichment Service
 * Handles lead/company data enrichment via third-party providers
 */

import { PrismaClient, EnrichmentProviderType, EnrichmentStatus } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

interface EnrichmentResult {
  success: boolean;
  data?: Record<string, any>;
  fieldsEnriched?: string[];
  error?: string;
}

export const dataEnrichmentService = {
  // Get enrichment providers
  async getProviders(organizationId: string) {
    return prisma.enrichmentProvider.findMany({
      where: { organizationId },
      select: {
        id: true,
        provider: true,
        isActive: true,
        autoEnrichLeads: true,
        autoEnrichAccounts: true,
        dailyLimit: true,
        dailyUsed: true,
        monthlyLimit: true,
        monthlyUsed: true,
        fieldsToEnrich: true,
        createdAt: true,
      },
    });
  },

  // Configure provider
  async configureProvider(
    organizationId: string,
    provider: EnrichmentProviderType,
    apiKey: string,
    settings?: {
      autoEnrichLeads?: boolean;
      autoEnrichAccounts?: boolean;
      fieldsToEnrich?: string[];
      dailyLimit?: number;
      monthlyLimit?: number;
    }
  ) {
    return prisma.enrichmentProvider.upsert({
      where: { organizationId_provider: { organizationId, provider } },
      update: {
        apiKey,
        isActive: true,
        autoEnrichLeads: settings?.autoEnrichLeads,
        autoEnrichAccounts: settings?.autoEnrichAccounts,
        fieldsToEnrich: settings?.fieldsToEnrich as any,
        dailyLimit: settings?.dailyLimit,
        monthlyLimit: settings?.monthlyLimit,
      },
      create: {
        organizationId,
        provider,
        apiKey,
        autoEnrichLeads: settings?.autoEnrichLeads || false,
        autoEnrichAccounts: settings?.autoEnrichAccounts || false,
        fieldsToEnrich: settings?.fieldsToEnrich as any,
        dailyLimit: settings?.dailyLimit,
        monthlyLimit: settings?.monthlyLimit,
      },
    });
  },

  // Disable provider
  async disableProvider(organizationId: string, provider: EnrichmentProviderType) {
    return prisma.enrichmentProvider.update({
      where: { organizationId_provider: { organizationId, provider } },
      data: { isActive: false },
    });
  },

  // Enrich lead
  async enrichLead(organizationId: string, leadId: string) {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new Error('Lead not found');

    const providers = await prisma.enrichmentProvider.findMany({
      where: { organizationId, isActive: true },
    });

    const results: Record<string, EnrichmentResult> = {};
    let enrichedData: Record<string, any> = {};

    for (const provider of providers) {
      // Check rate limits
      if (provider.dailyLimit && provider.dailyUsed >= provider.dailyLimit) {
        results[provider.provider] = { success: false, error: 'Daily limit exceeded' };
        continue;
      }

      const result = await this.enrichFromProvider(provider, 'lead', lead);
      results[provider.provider] = result;

      if (result.success && result.data) {
        enrichedData = { ...enrichedData, ...result.data };

        // Log enrichment
        await prisma.enrichmentLog.create({
          data: {
            providerId: provider.id,
            organizationId,
            entityType: 'lead',
            entityId: leadId,
            status: 'SUCCESS',
            responseData: result.data as any,
            enrichedFields: result.fieldsEnriched as any,
          },
        });

        // Update usage
        await prisma.enrichmentProvider.update({
          where: { id: provider.id },
          data: { dailyUsed: { increment: 1 }, monthlyUsed: { increment: 1 } },
        });
      } else if (result.error) {
        await prisma.enrichmentLog.create({
          data: {
            providerId: provider.id,
            organizationId,
            entityType: 'lead',
            entityId: leadId,
            status: 'FAILED',
            errorMessage: result.error,
          },
        });
      }
    }

    // Update lead with enriched data
    if (Object.keys(enrichedData).length > 0) {
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          companyName: enrichedData.companyName || lead.companyName,
          city: enrichedData.city || lead.city,
          state: enrichedData.state || lead.state,
          // Add more fields as needed
        },
      });
    }

    return { results, enrichedData };
  },

  // Enrich account
  async enrichAccount(organizationId: string, accountId: string) {
    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new Error('Account not found');

    const providers = await prisma.enrichmentProvider.findMany({
      where: { organizationId, isActive: true },
    });

    const results: Record<string, EnrichmentResult> = {};
    let enrichedData: Record<string, any> = {};

    for (const provider of providers) {
      if (provider.dailyLimit && provider.dailyUsed >= provider.dailyLimit) {
        results[provider.provider] = { success: false, error: 'Daily limit exceeded' };
        continue;
      }

      const result = await this.enrichFromProvider(provider, 'account', account);
      results[provider.provider] = result;

      if (result.success && result.data) {
        enrichedData = { ...enrichedData, ...result.data };

        await prisma.enrichmentLog.create({
          data: {
            providerId: provider.id,
            organizationId,
            entityType: 'account',
            entityId: accountId,
            status: 'SUCCESS',
            responseData: result.data as any,
            enrichedFields: result.fieldsEnriched as any,
          },
        });

        await prisma.enrichmentProvider.update({
          where: { id: provider.id },
          data: { dailyUsed: { increment: 1 }, monthlyUsed: { increment: 1 } },
        });
      }
    }

    // Update account
    if (Object.keys(enrichedData).length > 0) {
      await prisma.account.update({
        where: { id: accountId },
        data: {
          industry: enrichedData.industry || account.industry,
          employeeCount: enrichedData.employeeCount || account.employeeCount,
          annualRevenue: enrichedData.annualRevenue || account.annualRevenue,
          description: enrichedData.description || account.description,
        },
      });
    }

    return { results, enrichedData };
  },

  // Provider-specific enrichment
  async enrichFromProvider(
    provider: any,
    entityType: string,
    entity: any
  ): Promise<EnrichmentResult> {
    try {
      switch (provider.provider) {
        case 'CLEARBIT':
          return this.enrichFromClearbit(provider.apiKey, entityType, entity);
        case 'HUNTER_IO':
          return this.enrichFromHunter(provider.apiKey, entityType, entity);
        case 'APOLLO':
          return this.enrichFromApollo(provider.apiKey, entityType, entity);
        default:
          return { success: false, error: 'Unknown provider' };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // Clearbit enrichment
  async enrichFromClearbit(apiKey: string, entityType: string, entity: any): Promise<EnrichmentResult> {
    try {
      const email = entity.email;
      if (!email) return { success: false, error: 'No email provided' };

      const response = await axios.get(`https://person.clearbit.com/v2/combined/find`, {
        params: { email },
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      const data = response.data;
      const enriched: Record<string, any> = {};
      const fieldsEnriched: string[] = [];

      if (data.person) {
        if (data.person.name?.fullName) {
          enriched.fullName = data.person.name.fullName;
          fieldsEnriched.push('fullName');
        }
        if (data.person.employment?.title) {
          enriched.jobTitle = data.person.employment.title;
          fieldsEnriched.push('jobTitle');
        }
      }

      if (data.company) {
        if (data.company.name) {
          enriched.companyName = data.company.name;
          fieldsEnriched.push('companyName');
        }
        if (data.company.industry) {
          enriched.industry = data.company.industry;
          fieldsEnriched.push('industry');
        }
        if (data.company.metrics?.employees) {
          enriched.employeeCount = data.company.metrics.employees;
          fieldsEnriched.push('employeeCount');
        }
        if (data.company.metrics?.annualRevenue) {
          enriched.annualRevenue = data.company.metrics.annualRevenue;
          fieldsEnriched.push('annualRevenue');
        }
      }

      return { success: true, data: enriched, fieldsEnriched };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error?.message || error.message };
    }
  },

  // Hunter.io enrichment
  async enrichFromHunter(apiKey: string, entityType: string, entity: any): Promise<EnrichmentResult> {
    try {
      const email = entity.email;
      if (!email) return { success: false, error: 'No email provided' };

      const response = await axios.get(`https://api.hunter.io/v2/email-verifier`, {
        params: { email, api_key: apiKey },
      });

      const data = response.data.data;
      const enriched: Record<string, any> = {};
      const fieldsEnriched: string[] = [];

      if (data.status === 'valid') {
        enriched.emailVerified = true;
        fieldsEnriched.push('emailVerified');
      }

      if (data.first_name) {
        enriched.firstName = data.first_name;
        fieldsEnriched.push('firstName');
      }

      if (data.last_name) {
        enriched.lastName = data.last_name;
        fieldsEnriched.push('lastName');
      }

      return { success: true, data: enriched, fieldsEnriched };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.errors?.[0]?.details || error.message };
    }
  },

  // Apollo enrichment
  async enrichFromApollo(apiKey: string, entityType: string, entity: any): Promise<EnrichmentResult> {
    try {
      const email = entity.email;
      if (!email) return { success: false, error: 'No email provided' };

      const response = await axios.post(
        `https://api.apollo.io/v1/people/match`,
        { email },
        { headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' } }
      );

      const data = response.data.person;
      if (!data) return { success: false, error: 'No data found' };

      const enriched: Record<string, any> = {};
      const fieldsEnriched: string[] = [];

      if (data.title) {
        enriched.jobTitle = data.title;
        fieldsEnriched.push('jobTitle');
      }

      if (data.linkedin_url) {
        enriched.linkedinUrl = data.linkedin_url;
        fieldsEnriched.push('linkedinUrl');
      }

      if (data.organization) {
        if (data.organization.name) {
          enriched.companyName = data.organization.name;
          fieldsEnriched.push('companyName');
        }
        if (data.organization.industry) {
          enriched.industry = data.organization.industry;
          fieldsEnriched.push('industry');
        }
      }

      return { success: true, data: enriched, fieldsEnriched };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || error.message };
    }
  },

  // Get enrichment logs
  async getEnrichmentLogs(organizationId: string, filters?: {
    leadId?: any;
    accountId?: any;
    provider?: any;
    status?: any;
    limit?: number;
  }) {
    const where: any = { organizationId };
    if (filters?.leadId) where.entityId = filters.leadId;
    if (filters?.accountId) where.entityId = filters.accountId;
    if (filters?.status) where.status = filters.status;
    if (filters?.provider) {
      where.provider = { provider: filters.provider };
    }

    return prisma.enrichmentLog.findMany({
      where,
      include: { provider: { select: { provider: true } } },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 100,
    });
  },

  // Get enrichment stats
  async getEnrichmentStats(organizationId: string) {
    const [totalLogs, byStatus, byProvider, recentActivity] = await Promise.all([
      prisma.enrichmentLog.count({ where: { organizationId } }),
      prisma.enrichmentLog.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: true,
      }),
      prisma.enrichmentLog.groupBy({
        by: ['providerId'],
        where: { organizationId },
        _count: true,
      }),
      prisma.enrichmentLog.count({
        where: {
          organizationId,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    const successCount = byStatus.find(s => s.status === 'SUCCESS')?._count || 0;
    const failedCount = byStatus.find(s => s.status === 'FAILED')?._count || 0;

    return {
      total: totalLogs,
      successCount,
      failedCount,
      successRate: totalLogs > 0 ? (successCount / totalLogs) * 100 : 0,
      recentActivity,
      byStatus,
      byProvider,
    };
  },

  // Reset daily usage (called by cron job)
  async resetDailyUsage() {
    await prisma.enrichmentProvider.updateMany({
      data: { dailyUsed: 0, lastResetDate: new Date() },
    });
  },

  // Reset monthly usage (called by cron job)
  async resetMonthlyUsage() {
    await prisma.enrichmentProvider.updateMany({
      data: { monthlyUsed: 0 },
    });
  },
};
