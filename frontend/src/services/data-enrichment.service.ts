/**
 * Data Enrichment Service
 * Integrations with Clearbit, Hunter.io, Apollo, and other enrichment providers
 */

import api from './api';

export interface EnrichmentProvider {
  id: string;
  name: string;
  type: 'CLEARBIT' | 'HUNTER' | 'APOLLO' | 'ZOOMINFO' | 'LUSHA' | 'CUSTOM';
  isConfigured: boolean;
  isActive: boolean;
  creditsUsed: number;
  creditsRemaining?: number;
  lastSyncAt?: string;
}

export interface EnrichmentResult {
  id: string;
  leadId?: string;
  contactId?: string;
  accountId?: string;
  provider: string;
  status: 'PENDING' | 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'NOT_FOUND';
  enrichedData: Record<string, any>;
  confidence: number;
  creditsUsed: number;
  enrichedAt: string;
}

export interface CompanyEnrichment {
  name?: string;
  domain?: string;
  industry?: string;
  employeeCount?: number;
  revenue?: string;
  location?: string;
  description?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  technologies?: string[];
  funding?: string;
}

export interface ContactEnrichment {
  email?: string;
  emailVerified?: boolean;
  phone?: string;
  title?: string;
  department?: string;
  seniority?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  location?: string;
  company?: CompanyEnrichment;
}

export const dataEnrichmentService = {
  // Provider Management
  async getProviders(): Promise<EnrichmentProvider[]> {
    const response = await api.get('/data-enrichment/providers');
    return response.data;
  },

  async configureProvider(
    type: string,
    config: { apiKey: string; webhookSecret?: string }
  ): Promise<EnrichmentProvider> {
    const response = await api.post('/data-enrichment/providers', { type, ...config });
    return response.data;
  },

  async updateProvider(
    providerId: string,
    data: { isActive?: boolean; apiKey?: string }
  ): Promise<EnrichmentProvider> {
    const response = await api.put(`/data-enrichment/providers/${providerId}`, data);
    return response.data;
  },

  async testProvider(providerId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`/data-enrichment/providers/${providerId}/test`, {});
    return response.data;
  },

  // Enrichment Operations
  async enrichLead(leadId: string, providers?: string[]): Promise<EnrichmentResult> {
    const response = await api.post(`/data-enrichment/enrich/lead/${leadId}`, { providers });
    return response.data;
  },

  async enrichContact(contactId: string, providers?: string[]): Promise<EnrichmentResult> {
    const response = await api.post(`/data-enrichment/enrich/contact/${contactId}`, { providers });
    return response.data;
  },

  async enrichAccount(accountId: string, providers?: string[]): Promise<EnrichmentResult> {
    const response = await api.post(`/data-enrichment/enrich/account/${accountId}`, { providers });
    return response.data;
  },

  async enrichByEmail(email: string): Promise<ContactEnrichment> {
    const response = await api.post('/data-enrichment/enrich/email', { email });
    return response.data;
  },

  async enrichByDomain(domain: string): Promise<CompanyEnrichment> {
    const response = await api.post('/data-enrichment/enrich/domain', { domain });
    return response.data;
  },

  async findEmail(data: {
    firstName: string;
    lastName: string;
    domain: string;
  }): Promise<{ email: string; confidence: number; verified: boolean }> {
    const response = await api.post('/data-enrichment/find-email', data);
    return response.data;
  },

  async verifyEmail(email: string): Promise<{
    valid: boolean;
    disposable: boolean;
    deliverable: boolean;
    catchAll: boolean;
  }> {
    const response = await api.post('/data-enrichment/verify-email', { email });
    return response.data;
  },

  // Bulk Operations
  async bulkEnrich(
    entityType: 'leads' | 'contacts' | 'accounts',
    entityIds: string[],
    providers?: string[]
  ): Promise<{ jobId: string; totalRecords: number }> {
    const response = await api.post('/data-enrichment/bulk-enrich', { entityType, entityIds, providers });
    return response.data;
  },

  async getBulkEnrichmentStatus(jobId: string): Promise<{
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    progress: number;
    successCount: number;
    failedCount: number;
  }> {
    const response = await api.get(`/data-enrichment/bulk-enrich/${jobId}/status`);
    return response.data;
  },

  // History & Analytics
  async getEnrichmentHistory(filters?: {
    entityType?: string;
    provider?: string;
    status?: string;
    limit?: number;
  }): Promise<EnrichmentResult[]> {
    const params = new URLSearchParams();
    Object.entries(filters || {}).forEach(([key, value]) => {
      if (value) params.append(key, String(value));
    });

    const response = await api.get(`/data-enrichment/history?${params.toString()}`);
    return response.data;
  },

  async getEnrichmentStats(): Promise<{
    totalEnrichments: number;
    successRate: number;
    creditsUsedThisMonth: number;
    byProvider: { provider: string; count: number; successRate: number }[];
  }> {
    const response = await api.get('/data-enrichment/stats');
    return response.data;
  },
};
