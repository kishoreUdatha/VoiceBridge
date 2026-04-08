/**
 * Apify Web Scraping Integration Service
 *
 * Provides integration with Apify for automated lead scraping from:
 * - Google Maps (local businesses)
 * - LinkedIn Companies & People
 * - Yellow Pages
 * - Custom actors
 */

import axios, { AxiosInstance } from 'axios';
import { prisma } from '../config/database';
import { ApifyScraperType, ApifyScrapeJobStatus, Prisma } from '@prisma/client';
import { externalLeadImportService, ExternalLeadData } from '../services/external-lead-import.service';
import { circuitBreakers } from '../utils/circuitBreaker';

// Use config for API URL
import { config } from '../config';
const APIFY_API_URL = config.apiUrls.apify;

// Predefined actor IDs for common scrapers
// These are popular actors from the Apify Store with free tiers
export const APIFY_ACTORS = {
  GOOGLE_MAPS: 'apify~google-maps-scraper',
  LINKEDIN_COMPANY: 'anchor~linkedin-scraper',
  LINKEDIN_PEOPLE: 'anchor~linkedin-scraper',
  YELLOW_PAGES: 'apify~yellow-pages-scraper',
  // Email extraction from websites
  CONTACT_INFO_SCRAPER: 'apify~contact-info-scraper',
  EMAIL_EXTRACTOR: 'lukaskrivka~contact-info-scraper',
} as const;

// Default field mappings for each scraper type
// Maps Apify output fields -> CRM fields
export const DEFAULT_FIELD_MAPPINGS: Record<ApifyScraperType, Record<string, string>> = {
  GOOGLE_MAPS: {
    // Business name variations
    title: 'companyName',
    name: 'companyName',
    businessName: 'companyName',
    // Contact info
    phone: 'phone',
    phoneNumber: 'phone',
    telephone: 'phone',
    phones: 'phone',
    email: 'email',
    emails: 'email',
    // Website
    website: 'website',
    url: 'website',
    websiteUrl: 'website',
    // Address fields
    address: 'address',
    fullAddress: 'address',
    street: 'address',
    city: 'city',
    state: 'state',
    postalCode: 'postalCode',
    zipCode: 'postalCode',
    country: 'country',
    // Category/Industry
    categoryName: 'industry',
    category: 'industry',
    categories: 'industry',
    type: 'industry',
    // Ratings
    totalScore: 'customFields.rating',
    rating: 'customFields.rating',
    stars: 'customFields.rating',
    reviewsCount: 'customFields.reviewsCount',
    reviewCount: 'customFields.reviewsCount',
    // Owner/Contact person
    ownerName: 'customFields.contactPerson',
    contactName: 'customFields.contactPerson',
    owner: 'customFields.contactPerson',
  },
  LINKEDIN_COMPANY: {
    name: 'companyName',
    website: 'website',
    industry: 'industry',
    companySize: 'customFields.companySize',
    headquarters: 'address',
    description: 'customFields.description',
    linkedinUrl: 'customFields.linkedinUrl',
  },
  LINKEDIN_PEOPLE: {
    firstName: 'firstName',
    lastName: 'lastName',
    headline: 'customFields.title',
    company: 'companyName',
    location: 'address',
    profileUrl: 'customFields.linkedinUrl',
    email: 'email',
  },
  YELLOW_PAGES: {
    name: 'companyName',
    phone: 'phone',
    address: 'address',
    city: 'city',
    state: 'state',
    zip: 'postalCode',
    website: 'website',
    categories: 'customFields.categories',
  },
  CUSTOM: {},
};

// Scraper templates for UI
export const SCRAPER_TEMPLATES = [
  {
    type: 'GOOGLE_MAPS' as ApifyScraperType,
    name: 'Google Maps Business Scraper',
    description: 'Scrape local businesses from Google Maps with contact info, ratings, and reviews',
    actorId: APIFY_ACTORS.GOOGLE_MAPS,
    icon: 'map-pin',
    color: '#4285F4',
    inputFields: [
      { key: 'searchStringsArray', label: 'Search Terms', type: 'array', placeholder: 'e.g., "restaurants in New York"' },
      { key: 'maxCrawledPlaces', label: 'Max Results', type: 'number', default: 20 },
      { key: 'language', label: 'Language', type: 'select', options: ['en', 'es', 'fr', 'de', 'it'], default: 'en' },
    ],
  },
  {
    type: 'LINKEDIN_COMPANY' as ApifyScraperType,
    name: 'LinkedIn Company Scraper',
    description: 'Scrape company profiles from LinkedIn for B2B lead generation',
    actorId: APIFY_ACTORS.LINKEDIN_COMPANY,
    icon: 'building-office',
    color: '#0A66C2',
    inputFields: [
      { key: 'startUrls', label: 'LinkedIn Company URLs', type: 'array', placeholder: 'https://linkedin.com/company/...' },
    ],
  },
  {
    type: 'LINKEDIN_PEOPLE' as ApifyScraperType,
    name: 'LinkedIn People Scraper',
    description: 'Scrape professional profiles to find decision makers and contacts',
    actorId: APIFY_ACTORS.LINKEDIN_PEOPLE,
    icon: 'users',
    color: '#0A66C2',
    inputFields: [
      { key: 'startUrls', label: 'LinkedIn Profile URLs', type: 'array', placeholder: 'https://linkedin.com/in/...' },
    ],
  },
  {
    type: 'YELLOW_PAGES' as ApifyScraperType,
    name: 'Yellow Pages Scraper',
    description: 'Scrape business directory listings with contact information',
    actorId: APIFY_ACTORS.YELLOW_PAGES,
    icon: 'book-open',
    color: '#FFD700',
    inputFields: [
      { key: 'search', label: 'Search Term', type: 'string', placeholder: 'e.g., "plumbers"' },
      { key: 'location', label: 'Location', type: 'string', placeholder: 'e.g., "Los Angeles, CA"' },
      { key: 'maxItems', label: 'Max Results', type: 'number', default: 100 },
    ],
  },
  {
    type: 'CUSTOM' as ApifyScraperType,
    name: 'Custom Actor',
    description: 'Use any Apify actor with custom configuration',
    actorId: '',
    icon: 'cog',
    color: '#6B7280',
    inputFields: [
      { key: 'actorId', label: 'Actor ID', type: 'string', placeholder: 'username/actor-name or actor ID' },
    ],
  },
];

interface ApifyUser {
  id: string;
  username: string;
  email: string;
  profile: {
    name?: string;
  };
}

interface ApifyRunResult {
  id: string;
  actorId: string;
  status: 'READY' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'ABORTING' | 'ABORTED' | 'TIMING-OUT' | 'TIMED-OUT';
  startedAt: string;
  finishedAt?: string;
  defaultDatasetId: string;
  stats?: {
    inputBodyLen: number;
    durationMillis: number;
  };
}

interface ApifyDatasetItem {
  [key: string]: any;
}

interface TestConnectionResult {
  valid: boolean;
  user?: ApifyUser;
  error?: string;
}

interface ImportResult {
  totalItems: number;
  importedItems: number;
  duplicateItems: number;
  failedItems: number;
  bulkImportId?: string;
}

// Use the shared circuit breaker for Apify API
const apifyCircuitBreaker = circuitBreakers.apify;

export class ApifyService {
  private apiToken: string | null = null;
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: APIFY_API_URL,
      timeout: 30000,
    });
  }

  /**
   * Set the API token for Apify requests
   */
  setApiToken(token: string) {
    this.apiToken = token;
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Test connection with API token
   */
  async testConnection(): Promise<TestConnectionResult> {
    if (!this.apiToken) {
      return { valid: false, error: 'No API token configured' };
    }

    try {
      const response = await apifyCircuitBreaker.execute(async () => {
        return this.client.get('/users/me');
      });

      return {
        valid: true,
        user: response.data.data,
      };
    } catch (error: any) {
      console.error('[Apify] Connection test failed:', error.message);
      return {
        valid: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }

  /**
   * Start an Apify actor run
   */
  async startRun(actorId: string, input: Record<string, any>): Promise<ApifyRunResult> {
    if (!this.apiToken) {
      throw new Error('No API token configured');
    }

    try {
      const response = await apifyCircuitBreaker.execute(async () => {
        return this.client.post(`/acts/${actorId}/runs`, input, {
          params: { token: this.apiToken },
        });
      });

      console.info(`[Apify] Started run ${response.data.data.id} for actor ${actorId}`);
      return response.data.data;
    } catch (error: any) {
      console.error('[Apify] Failed to start run:', error.message);
      throw new Error(error.response?.data?.error?.message || 'Failed to start Apify run');
    }
  }

  /**
   * Get the status of a run
   */
  async getRunStatus(runId: string): Promise<ApifyRunResult> {
    if (!this.apiToken) {
      throw new Error('No API token configured');
    }

    try {
      const response = await apifyCircuitBreaker.execute(async () => {
        return this.client.get(`/actor-runs/${runId}`, {
          params: { token: this.apiToken },
        });
      });

      return response.data.data;
    } catch (error: any) {
      console.error('[Apify] Failed to get run status:', error.message);
      throw new Error(error.response?.data?.error?.message || 'Failed to get run status');
    }
  }

  /**
   * Get items from a dataset
   */
  async getDatasetItems(datasetId: string, limit: number = 1000, offset: number = 0): Promise<ApifyDatasetItem[]> {
    if (!this.apiToken) {
      throw new Error('No API token configured');
    }

    try {
      const response = await apifyCircuitBreaker.execute(async () => {
        return this.client.get(`/datasets/${datasetId}/items`, {
          params: {
            token: this.apiToken,
            limit,
            offset,
            format: 'json',
          },
        });
      });

      return response.data;
    } catch (error: any) {
      console.error('[Apify] Failed to get dataset items:', error.message);
      throw new Error(error.response?.data?.error?.message || 'Failed to get dataset items');
    }
  }

  /**
   * Abort a running actor run
   */
  async abortRun(runId: string): Promise<void> {
    if (!this.apiToken) {
      throw new Error('No API token configured');
    }

    try {
      await apifyCircuitBreaker.execute(async () => {
        return this.client.post(`/actor-runs/${runId}/abort`, null, {
          params: { token: this.apiToken },
        });
      });

      console.info(`[Apify] Aborted run ${runId}`);
    } catch (error: any) {
      console.error('[Apify] Failed to abort run:', error.message);
      throw new Error(error.response?.data?.error?.message || 'Failed to abort run');
    }
  }

  /**
   * Apply field mapping to transform scraped data
   */
  applyFieldMapping(
    item: ApifyDatasetItem,
    fieldMapping: Record<string, string>
  ): Partial<ExternalLeadData> {
    const result: Record<string, any> = {
      customFields: {},
    };

    for (const [sourceField, targetField] of Object.entries(fieldMapping)) {
      const value = this.getNestedValue(item, sourceField);
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
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Process and import results from a completed run
   */
  async processAndImportResults(
    organizationId: string,
    runId: string,
    fieldMapping: Record<string, string>,
    scraperType: ApifyScraperType
  ): Promise<ImportResult> {
    // Get the run to find dataset ID
    const run = await this.getRunStatus(runId);
    if (run.status !== 'SUCCEEDED') {
      throw new Error(`Run ${runId} has status ${run.status}, cannot import`);
    }

    // Fetch all items from dataset
    const items = await this.getDatasetItems(run.defaultDatasetId);
    console.info(`[Apify] Fetched ${items.length} items from run ${runId}`);

    // Log first item for debugging
    if (items.length > 0) {
      console.info(`[Apify] Sample item fields:`, Object.keys(items[0]));
      console.info(`[Apify] Sample item:`, JSON.stringify(items[0]).slice(0, 500));
    }

    let importedItems = 0;
    let duplicateItems = 0;
    let failedItems = 0;
    let bulkImportId: string | undefined;

    // Process each item
    for (const item of items) {
      try {
        // Apply field mapping
        const mappedData = this.applyFieldMapping(item, fieldMapping);

        // Extract business/company name - PRIORITY (do this first)
        if (!mappedData.companyName) {
          // Extended list of possible name fields from various scrapers
          const possibleNameFields = [
            'title', 'name', 'businessName', 'companyName', 'placeName', 'storeName',
            'searchString', 'place_name', 'displayName', 'company_name', 'business_name',
            'organizationName', 'establishment', 'label', 'heading', 'shopName'
          ];
          for (const field of possibleNameFields) {
            if (item[field] && typeof item[field] === 'string' && item[field].trim()) {
              mappedData.companyName = String(item[field]).trim();
              break;
            }
          }
        }

        // Check nested structures for name
        if (!mappedData.companyName) {
          // Some scrapers nest data
          const nestedPaths = ['place.name', 'business.name', 'data.title', 'info.name'];
          for (const path of nestedPaths) {
            const value = this.getNestedValue(item, path);
            if (value && typeof value === 'string') {
              mappedData.companyName = value.trim();
              break;
            }
          }
        }

        // Extract phone from various possible fields
        if (!mappedData.phone) {
          const possiblePhoneFields = [
            'phone', 'telephone', 'phoneNumber', 'contact', 'mobile', 'phones',
            'phoneNumbers', 'contactPhone', 'businessPhone', 'phone_number',
            'primaryPhone', 'mainPhone', 'tel'
          ];
          for (const field of possiblePhoneFields) {
            const value = item[field];
            if (value) {
              // Handle array of phones
              const phoneStr = Array.isArray(value) ? value[0] : String(value);
              if (phoneStr && phoneStr.trim()) {
                mappedData.phone = phoneStr.replace(/[^\d+()-\s]/g, '').trim();
                break;
              }
            }
          }
        }

        // Extract email from various possible fields
        if (!mappedData.email) {
          const possibleEmailFields = ['email', 'emails', 'emailAddress', 'contactEmail', 'mail', 'email_address'];
          for (const field of possibleEmailFields) {
            const value = item[field];
            if (value) {
              const emailStr = Array.isArray(value) ? value[0] : String(value);
              if (emailStr && emailStr.includes('@')) {
                mappedData.email = emailStr.trim();
                break;
              }
            }
          }
        }

        // Extract website
        if (!mappedData.website) {
          const possibleWebFields = ['website', 'url', 'websiteUrl', 'webUrl', 'homepage', 'siteUrl', 'web', 'site'];
          for (const field of possibleWebFields) {
            if (item[field] && typeof item[field] === 'string') {
              mappedData.website = String(item[field]).trim();
              break;
            }
          }
        }

        // Extract address
        if (!mappedData.address) {
          const possibleAddrFields = [
            'address', 'fullAddress', 'street', 'streetAddress', 'location',
            'formattedAddress', 'full_address', 'completeAddress', 'addr'
          ];
          for (const field of possibleAddrFields) {
            if (item[field] && typeof item[field] === 'string') {
              mappedData.address = String(item[field]).trim();
              break;
            }
          }
        }

        // Extract city for location context
        if (!mappedData.city) {
          const possibleCityFields = ['city', 'locality', 'town', 'district', 'municipality'];
          for (const field of possibleCityFields) {
            if (item[field] && typeof item[field] === 'string') {
              mappedData.city = String(item[field]).trim();
              break;
            }
          }
        }

        // Extract category/industry
        if (!mappedData.industry) {
          const possibleCategoryFields = ['categoryName', 'category', 'categories', 'type', 'industry', 'businessType'];
          for (const field of possibleCategoryFields) {
            const value = item[field];
            if (value) {
              mappedData.industry = Array.isArray(value) ? value[0] : String(value).trim();
              break;
            }
          }
        }

        // Skip if no contact info at all
        if (!mappedData.phone && !mappedData.email) {
          console.debug(`[Apify] Skipping item (no contact info): ${mappedData.companyName || 'unnamed'}`);
          failedItems++;
          continue;
        }

        // For businesses, use company name as first name if no person name
        let firstName = mappedData.firstName as string || '';
        let lastName = mappedData.lastName as string || '';

        // If no person name but we have company name, use it
        if (!firstName && !lastName && mappedData.companyName) {
          firstName = mappedData.companyName as string;
        }

        // Last resort: use part of the search query or a generic name
        if (!firstName) {
          firstName = mappedData.industry ? `${mappedData.industry} Business` : 'Business Lead';
        }

        // Build lead data
        const leadData: ExternalLeadData = {
          firstName: firstName,
          lastName: lastName,
          email: mappedData.email as string,
          phone: (mappedData.phone as string) || '',
          source: 'APIFY',
          sourceDetails: `Apify ${scraperType} Scraper`,
          customFields: {
            ...mappedData.customFields,
            companyName: mappedData.companyName,
            website: mappedData.website,
            address: mappedData.address,
            city: mappedData.city,
            state: mappedData.state,
            postalCode: mappedData.postalCode,
            industry: mappedData.industry,
            // Store original raw data for reference
            rawSource: JSON.stringify(item).slice(0, 1000),
          },
        };

        // Import through external lead import service
        const result = await externalLeadImportService.importExternalLead(
          organizationId,
          leadData
        );

        if (result.isDuplicate) {
          duplicateItems++;
        } else {
          importedItems++;
          if (!bulkImportId && result.bulkImport) {
            bulkImportId = result.bulkImport.id;
          }
        }
      } catch (error) {
        console.error('[Apify] Failed to import item:', error);
        failedItems++;
      }
    }

    return {
      totalItems: items.length,
      importedItems,
      duplicateItems,
      failedItems,
      bulkImportId,
    };
  }

  /**
   * Get available actors (for custom actor selection)
   */
  async getAvailableActors(search?: string): Promise<any[]> {
    if (!this.apiToken) {
      throw new Error('No API token configured');
    }

    try {
      const response = await apifyCircuitBreaker.execute(async () => {
        return this.client.get('/store', {
          params: {
            token: this.apiToken,
            search,
            limit: 20,
            sortBy: 'popularity',
          },
        });
      });

      return response.data.data?.items || [];
    } catch (error: any) {
      console.error('[Apify] Failed to search actors:', error.message);
      return [];
    }
  }

  /**
   * Get actor details
   */
  async getActorDetails(actorId: string): Promise<any> {
    if (!this.apiToken) {
      throw new Error('No API token configured');
    }

    try {
      const response = await apifyCircuitBreaker.execute(async () => {
        return this.client.get(`/acts/${actorId}`, {
          params: { token: this.apiToken },
        });
      });

      return response.data.data;
    } catch (error: any) {
      console.error('[Apify] Failed to get actor details:', error.message);
      throw new Error(error.response?.data?.error?.message || 'Failed to get actor details');
    }
  }

  /**
   * Get run logs for debugging
   */
  async getRunLogs(runId: string): Promise<string> {
    if (!this.apiToken) {
      throw new Error('No API token configured');
    }

    try {
      const response = await apifyCircuitBreaker.execute(async () => {
        return this.client.get(`/actor-runs/${runId}/log`, {
          params: { token: this.apiToken },
          responseType: 'text',
        });
      });

      return response.data;
    } catch (error: any) {
      console.error('[Apify] Failed to get run logs:', error.message);
      return '';
    }
  }

  /**
   * Extract emails from a list of websites using Apify Contact Info Scraper
   * @param websites Array of website URLs to scrape
   * @returns Run result with extracted contact info
   */
  async extractEmailsFromWebsites(websites: string[]): Promise<ApifyRunResult> {
    if (!this.apiToken) {
      throw new Error('No API token configured');
    }

    // Filter valid URLs
    const validUrls = websites
      .filter(url => url && url.trim())
      .map(url => {
        // Ensure URL has protocol
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          return `https://${url}`;
        }
        return url;
      })
      .slice(0, 100); // Limit to 100 websites

    if (validUrls.length === 0) {
      throw new Error('No valid URLs provided');
    }

    console.info(`[Apify] Starting email extraction for ${validUrls.length} websites`);

    // Use contact-info-scraper actor
    const input = {
      startUrls: validUrls.map(url => ({ url })),
      maxRequestsPerStartUrl: 10,
      maxDepth: 2,
      sameDomain: true,
      considerChildFrames: false,
      // Extract contact info patterns
      emailPatterns: true,
      phonePatterns: true,
      socialPatterns: true,
    };

    return this.startRun(APIFY_ACTORS.CONTACT_INFO_SCRAPER, input);
  }

  /**
   * Process email extraction results and return mapped data
   */
  async processEmailExtractionResults(datasetId: string): Promise<Map<string, {
    emails: string[];
    phones: string[];
    socialLinks: Record<string, string>;
  }>> {
    const items = await this.getDatasetItems(datasetId);
    const results = new Map<string, {
      emails: string[];
      phones: string[];
      socialLinks: Record<string, string>;
    }>();

    for (const item of items) {
      const domain = this.extractDomain(item.url || item.startUrl || '');
      if (!domain) continue;

      const existing = results.get(domain) || {
        emails: [],
        phones: [],
        socialLinks: {},
      };

      // Extract emails
      if (item.emails && Array.isArray(item.emails)) {
        existing.emails.push(...item.emails);
      }
      if (item.email) {
        existing.emails.push(item.email);
      }

      // Extract phones
      if (item.phones && Array.isArray(item.phones)) {
        existing.phones.push(...item.phones);
      }
      if (item.phone) {
        existing.phones.push(item.phone);
      }

      // Extract social links
      if (item.linkedIn) existing.socialLinks.linkedin = item.linkedIn;
      if (item.facebook) existing.socialLinks.facebook = item.facebook;
      if (item.twitter) existing.socialLinks.twitter = item.twitter;
      if (item.instagram) existing.socialLinks.instagram = item.instagram;

      // Deduplicate
      existing.emails = [...new Set(existing.emails)];
      existing.phones = [...new Set(existing.phones)];

      results.set(domain, existing);
    }

    console.info(`[Apify] Extracted contact info from ${results.size} domains`);
    return results;
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return '';
    }
  }

  /**
   * Enrich leads with emails by scraping their websites
   * @param leads Array of leads with website URLs
   * @returns Updated leads with extracted emails
   */
  async enrichLeadsWithEmails(
    organizationId: string,
    bulkImportId: string
  ): Promise<{ enriched: number; total: number }> {
    // Get leads with websites but no email
    const records = await prisma.rawImportRecord.findMany({
      where: {
        bulkImportId,
        organizationId,
        email: null,
        customFields: {
          path: ['website'],
          not: Prisma.DbNull,
        },
      },
      take: 100,
    });

    if (records.length === 0) {
      return { enriched: 0, total: 0 };
    }

    // Extract websites
    const websites: string[] = [];
    const recordsByDomain = new Map<string, typeof records>();

    for (const record of records) {
      const customFields = record.customFields as Record<string, any>;
      const website = customFields?.website;
      if (website) {
        const domain = this.extractDomain(website);
        websites.push(website);

        const existing = recordsByDomain.get(domain) || [];
        existing.push(record);
        recordsByDomain.set(domain, existing);
      }
    }

    if (websites.length === 0) {
      return { enriched: 0, total: records.length };
    }

    // Start email extraction
    const run = await this.extractEmailsFromWebsites(websites);

    // Wait for completion (with timeout)
    let status = run.status;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max

    while ((status === 'RUNNING' || status === 'READY') && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      const updatedRun = await this.getRunStatus(run.id);
      status = updatedRun.status;
      attempts++;
    }

    if (status !== 'SUCCEEDED') {
      console.warn(`[Apify] Email extraction did not complete successfully: ${status}`);
      return { enriched: 0, total: records.length };
    }

    // Process results
    const completedRun = await this.getRunStatus(run.id);
    const emailResults = await this.processEmailExtractionResults(completedRun.defaultDatasetId);

    // Update records with found emails
    let enriched = 0;
    for (const [domain, contactInfo] of emailResults) {
      const matchingRecords = recordsByDomain.get(domain);
      if (!matchingRecords || contactInfo.emails.length === 0) continue;

      const primaryEmail = contactInfo.emails[0];

      for (const record of matchingRecords) {
        try {
          const existingCustomFields = (record.customFields as Record<string, any>) || {};

          await prisma.rawImportRecord.update({
            where: { id: record.id },
            data: {
              email: primaryEmail,
              customFields: {
                ...existingCustomFields,
                extractedEmails: contactInfo.emails,
                extractedPhones: contactInfo.phones,
                socialLinks: contactInfo.socialLinks,
              },
            },
          });
          enriched++;
        } catch (error) {
          console.error(`[Apify] Failed to update record ${record.id}:`, error);
        }
      }
    }

    console.info(`[Apify] Enriched ${enriched} of ${records.length} records with emails`);
    return { enriched, total: records.length };
  }
}

// Export singleton instance
export const apifyService = new ApifyService();

// Export service for organization-specific instances
export async function getApifyServiceForOrg(organizationId: string): Promise<ApifyService | null> {
  const integration = await prisma.apifyIntegration.findUnique({
    where: { organizationId },
  });

  if (!integration || !integration.isActive) {
    return null;
  }

  const service = new ApifyService();
  service.setApiToken(integration.apiToken);
  return service;
}
