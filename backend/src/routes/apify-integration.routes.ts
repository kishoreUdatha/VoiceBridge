/**
 * Apify Integration Routes
 *
 * API endpoints for managing Apify web scraping integration.
 */

import { Router, Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import { ApiResponse } from '../utils/apiResponse';
import { validate } from '../middlewares/validate';
import { authenticate, authorize } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { prisma } from '../config/database';
import {
  apifyService,
  getApifyServiceForOrg,
  SCRAPER_TEMPLATES,
  DEFAULT_FIELD_MAPPINGS,
  APIFY_ACTORS,
} from '../integrations/apify.service';
import { apifySchedulerService } from '../services/apify-scheduler.service';
import { jobQueueService } from '../services/job-queue.service';
import { ApifyScraperType, ScheduleInterval } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(tenantMiddleware);

// ===========================================
// Integration Management
// ===========================================

/**
 * Get organization's Apify integration
 */
router.get(
  '/integration',
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const integration = await prisma.apifyIntegration.findUnique({
        where: { organizationId: req.organizationId! },
        include: {
          _count: {
            select: {
              scraperConfigs: true,
              scrapeJobs: true,
            },
          },
        },
      });

      if (!integration) {
        return ApiResponse.success(res, 'No Apify integration configured', null);
      }

      // Mask API token
      const maskedIntegration = {
        ...integration,
        apiToken: integration.apiToken.slice(0, 8) + '...' + integration.apiToken.slice(-4),
      };

      ApiResponse.success(res, 'Apify integration retrieved', maskedIntegration);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Create or update Apify integration
 */
router.post(
  '/integration',
  authorize('admin'),
  validate([
    body('apiToken').notEmpty().withMessage('API token is required'),
  ]),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { apiToken } = req.body;

      // Test the token first
      apifyService.setApiToken(apiToken);
      const testResult = await apifyService.testConnection();

      if (!testResult.valid) {
        return ApiResponse.badRequest(res, `Invalid API token: ${testResult.error}`);
      }

      // Upsert integration
      const integration = await prisma.apifyIntegration.upsert({
        where: { organizationId: req.organizationId! },
        update: {
          apiToken,
          isActive: true,
          updatedAt: new Date(),
        },
        create: {
          organizationId: req.organizationId!,
          apiToken,
          isActive: true,
        },
      });

      ApiResponse.success(res, 'Apify integration saved', {
        id: integration.id,
        isActive: integration.isActive,
        user: testResult.user,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Test API token connection
 */
router.post(
  '/test-connection',
  validate([
    body('apiToken').notEmpty().withMessage('API token is required'),
  ]),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { apiToken } = req.body;

      apifyService.setApiToken(apiToken);
      const result = await apifyService.testConnection();

      if (result.valid) {
        ApiResponse.success(res, 'Connection successful', { user: result.user });
      } else {
        ApiResponse.badRequest(res, result.error || 'Connection failed');
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Delete Apify integration
 */
router.delete(
  '/integration',
  authorize('admin'),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const integration = await prisma.apifyIntegration.findUnique({
        where: { organizationId: req.organizationId! },
      });

      if (!integration) {
        return ApiResponse.notFound(res, 'No integration found');
      }

      await prisma.apifyIntegration.delete({
        where: { id: integration.id },
      });

      ApiResponse.success(res, 'Apify integration deleted');
    } catch (error) {
      next(error);
    }
  }
);

// ===========================================
// Scraper Configuration
// ===========================================

/**
 * Get scraper templates
 */
router.get(
  '/scraper-templates',
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      ApiResponse.success(res, 'Scraper templates retrieved', SCRAPER_TEMPLATES);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get default field mapping for a scraper type
 */
router.get(
  '/field-mappings/:scraperType',
  param('scraperType').isIn(Object.keys(DEFAULT_FIELD_MAPPINGS)),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const scraperType = req.params.scraperType as ApifyScraperType;
      const mapping = DEFAULT_FIELD_MAPPINGS[scraperType] || {};

      ApiResponse.success(res, 'Field mapping retrieved', mapping);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * List scraper configurations
 */
router.get(
  '/scrapers',
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const integration = await prisma.apifyIntegration.findUnique({
        where: { organizationId: req.organizationId! },
      });

      if (!integration) {
        return ApiResponse.success(res, 'No integration configured', []);
      }

      const scrapers = await prisma.apifyScraperConfig.findMany({
        where: { integrationId: integration.id },
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { scrapeJobs: true },
          },
        },
      });

      ApiResponse.success(res, 'Scrapers retrieved', scrapers);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get a specific scraper configuration
 */
router.get(
  '/scrapers/:id',
  param('id').isUUID(),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const integration = await prisma.apifyIntegration.findUnique({
        where: { organizationId: req.organizationId! },
      });

      if (!integration) {
        return ApiResponse.notFound(res, 'No integration configured');
      }

      const scraper = await prisma.apifyScraperConfig.findFirst({
        where: {
          id: req.params.id,
          integrationId: integration.id,
        },
        include: {
          scrapeJobs: {
            take: 5,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!scraper) {
        return ApiResponse.notFound(res, 'Scraper not found');
      }

      ApiResponse.success(res, 'Scraper retrieved', scraper);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Create a scraper configuration
 */
router.post(
  '/scrapers',
  authorize('admin'),
  validate([
    body('name').notEmpty().withMessage('Name is required'),
    body('scraperType').isIn(Object.values(ApifyScraperType)).withMessage('Invalid scraper type'),
    body('actorId').notEmpty().withMessage('Actor ID is required'),
  ]),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const integration = await prisma.apifyIntegration.findUnique({
        where: { organizationId: req.organizationId! },
      });

      if (!integration) {
        return ApiResponse.badRequest(res, 'Please configure Apify integration first');
      }

      const {
        name,
        scraperType,
        actorId,
        inputConfig,
        fieldMapping,
        scheduleEnabled,
        scheduleInterval,
        scheduleCron,
      } = req.body;

      // Get default field mapping if not provided
      const finalFieldMapping = fieldMapping || DEFAULT_FIELD_MAPPINGS[scraperType as ApifyScraperType] || {};

      // Calculate next scheduled time if schedule is enabled
      let nextScheduledAt: Date | null = null;
      if (scheduleEnabled) {
        nextScheduledAt = apifySchedulerService.calculateNextRunTime(
          scheduleInterval || 'DAILY',
          scheduleCron
        );
      }

      const scraper = await prisma.apifyScraperConfig.create({
        data: {
          integrationId: integration.id,
          name,
          scraperType: scraperType as ApifyScraperType,
          actorId,
          inputConfig: inputConfig || {},
          fieldMapping: finalFieldMapping,
          scheduleEnabled: scheduleEnabled || false,
          scheduleInterval: scheduleInterval || 'DAILY',
          scheduleCron,
          nextScheduledAt,
        },
      });

      ApiResponse.created(res, 'Scraper created', scraper);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Update a scraper configuration
 */
router.put(
  '/scrapers/:id',
  authorize('admin'),
  param('id').isUUID(),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const integration = await prisma.apifyIntegration.findUnique({
        where: { organizationId: req.organizationId! },
      });

      if (!integration) {
        return ApiResponse.badRequest(res, 'No integration configured');
      }

      const scraper = await prisma.apifyScraperConfig.findFirst({
        where: {
          id: req.params.id,
          integrationId: integration.id,
        },
      });

      if (!scraper) {
        return ApiResponse.notFound(res, 'Scraper not found');
      }

      const {
        name,
        actorId,
        inputConfig,
        fieldMapping,
        scheduleEnabled,
        scheduleInterval,
        scheduleCron,
        isActive,
      } = req.body;

      // Calculate next scheduled time if schedule is being enabled
      let nextScheduledAt = scraper.nextScheduledAt;
      if (scheduleEnabled && (!scraper.scheduleEnabled || scheduleInterval !== scraper.scheduleInterval)) {
        nextScheduledAt = apifySchedulerService.calculateNextRunTime(
          scheduleInterval || scraper.scheduleInterval,
          scheduleCron || scraper.scheduleCron
        );
      } else if (scheduleEnabled === false) {
        nextScheduledAt = null;
      }

      const updated = await prisma.apifyScraperConfig.update({
        where: { id: scraper.id },
        data: {
          name: name ?? scraper.name,
          actorId: actorId ?? scraper.actorId,
          inputConfig: inputConfig ?? scraper.inputConfig,
          fieldMapping: fieldMapping ?? scraper.fieldMapping,
          scheduleEnabled: scheduleEnabled ?? scraper.scheduleEnabled,
          scheduleInterval: scheduleInterval ?? scraper.scheduleInterval,
          scheduleCron: scheduleCron ?? scraper.scheduleCron,
          nextScheduledAt,
          isActive: isActive ?? scraper.isActive,
        },
      });

      ApiResponse.success(res, 'Scraper updated', updated);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Delete a scraper configuration
 */
router.delete(
  '/scrapers/:id',
  authorize('admin'),
  param('id').isUUID(),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const integration = await prisma.apifyIntegration.findUnique({
        where: { organizationId: req.organizationId! },
      });

      if (!integration) {
        return ApiResponse.badRequest(res, 'No integration configured');
      }

      const scraper = await prisma.apifyScraperConfig.findFirst({
        where: {
          id: req.params.id,
          integrationId: integration.id,
        },
      });

      if (!scraper) {
        return ApiResponse.notFound(res, 'Scraper not found');
      }

      await prisma.apifyScraperConfig.delete({
        where: { id: scraper.id },
      });

      ApiResponse.success(res, 'Scraper deleted');
    } catch (error) {
      next(error);
    }
  }
);

// ===========================================
// Scrape Jobs
// ===========================================

/**
 * Trigger a manual scrape run
 */
router.post(
  '/scrapers/:id/run',
  authorize('admin'),
  param('id').isUUID(),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const service = await getApifyServiceForOrg(req.organizationId!);
      if (!service) {
        return ApiResponse.badRequest(res, 'Apify integration not configured or inactive');
      }

      const integration = await prisma.apifyIntegration.findUnique({
        where: { organizationId: req.organizationId! },
      });

      const scraper = await prisma.apifyScraperConfig.findFirst({
        where: {
          id: req.params.id,
          integrationId: integration!.id,
        },
      });

      if (!scraper) {
        return ApiResponse.notFound(res, 'Scraper not found');
      }

      // Add job to queue
      const jobId = await jobQueueService.addJob(
        'APIFY_SCRAPE_RUN',
        {
          configId: scraper.id,
          integrationId: integration!.id,
          actorId: scraper.actorId,
          inputConfig: scraper.inputConfig,
          fieldMapping: scraper.fieldMapping,
          scraperType: scraper.scraperType,
          isScheduled: false,
        },
        { organizationId: req.organizationId }
      );

      ApiResponse.success(res, 'Scrape job queued', { jobId });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * List scrape jobs
 */
router.get(
  '/jobs',
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const integration = await prisma.apifyIntegration.findUnique({
        where: { organizationId: req.organizationId! },
      });

      if (!integration) {
        return ApiResponse.success(res, 'No integration configured', []);
      }

      const { status, configId, limit = '20', offset = '0' } = req.query;

      const where: any = { integrationId: integration.id };
      if (status) where.status = status;
      if (configId) where.configId = configId;

      const [jobs, total] = await Promise.all([
        prisma.apifyScrapeJob.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: parseInt(limit as string),
          skip: parseInt(offset as string),
          include: {
            config: {
              select: { name: true, scraperType: true },
            },
          },
        }),
        prisma.apifyScrapeJob.count({ where }),
      ]);

      ApiResponse.success(res, 'Jobs retrieved', { jobs, total });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get job details
 */
router.get(
  '/jobs/:id',
  param('id').isUUID(),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const integration = await prisma.apifyIntegration.findUnique({
        where: { organizationId: req.organizationId! },
      });

      if (!integration) {
        return ApiResponse.notFound(res, 'No integration configured');
      }

      const job = await prisma.apifyScrapeJob.findFirst({
        where: {
          id: req.params.id,
          integrationId: integration.id,
        },
        include: {
          config: true,
        },
      });

      if (!job) {
        return ApiResponse.notFound(res, 'Job not found');
      }

      // If job is running, fetch latest status from Apify
      if (job.status === 'RUNNING' || job.status === 'PENDING') {
        try {
          const service = await getApifyServiceForOrg(req.organizationId!);
          if (service) {
            const runStatus = await service.getRunStatus(job.apifyRunId);
            // Map Apify status to our status
            const statusMap: Record<string, 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED'> = {
              READY: 'PENDING',
              RUNNING: 'RUNNING',
              SUCCEEDED: 'SUCCEEDED',
              FAILED: 'FAILED',
              ABORTED: 'CANCELLED',
              'TIMING-OUT': 'RUNNING',
              'TIMED-OUT': 'FAILED',
            };

            if (runStatus.status && statusMap[runStatus.status] !== job.status) {
              // Update job status
              await prisma.apifyScrapeJob.update({
                where: { id: job.id },
                data: {
                  status: statusMap[runStatus.status] || job.status,
                  completedAt: runStatus.finishedAt ? new Date(runStatus.finishedAt) : null,
                },
              });
            }
          }
        } catch (error) {
          console.warn('[Apify] Failed to fetch run status:', error);
        }
      }

      ApiResponse.success(res, 'Job retrieved', job);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get records for a specific job
 */
router.get(
  '/jobs/:id/records',
  param('id').isUUID(),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const integration = await prisma.apifyIntegration.findUnique({
        where: { organizationId: req.organizationId! },
      });

      if (!integration) {
        return ApiResponse.notFound(res, 'No integration configured');
      }

      const job = await prisma.apifyScrapeJob.findFirst({
        where: {
          id: req.params.id,
          integrationId: integration.id,
        },
        include: {
          config: {
            select: { name: true, scraperType: true },
          },
        },
      });

      if (!job) {
        return ApiResponse.notFound(res, 'Job not found');
      }

      if (!job.bulkImportId) {
        return ApiResponse.success(res, 'No records imported yet', {
          job,
          records: [],
          total: 0,
        });
      }

      // Get pagination params
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 25;
      const skip = (page - 1) * limit;
      const search = req.query.search as string;
      const status = req.query.status as string;

      // Build filter
      const where: any = {
        bulkImportId: job.bulkImportId,
        organizationId: req.organizationId!,
      };

      if (status && status !== 'all') {
        where.status = status;
      }

      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
        ];
      }

      // Fetch records
      const [records, total] = await Promise.all([
        prisma.rawImportRecord.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.rawImportRecord.count({ where }),
      ]);

      ApiResponse.success(res, 'Records retrieved', {
        job,
        records,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Cancel a running job
 */
router.post(
  '/jobs/:id/cancel',
  authorize('admin'),
  param('id').isUUID(),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const service = await getApifyServiceForOrg(req.organizationId!);
      if (!service) {
        return ApiResponse.badRequest(res, 'Apify integration not configured');
      }

      const integration = await prisma.apifyIntegration.findUnique({
        where: { organizationId: req.organizationId! },
      });

      const job = await prisma.apifyScrapeJob.findFirst({
        where: {
          id: req.params.id,
          integrationId: integration!.id,
        },
      });

      if (!job) {
        return ApiResponse.notFound(res, 'Job not found');
      }

      if (job.status !== 'RUNNING' && job.status !== 'PENDING') {
        return ApiResponse.badRequest(res, 'Job is not running');
      }

      // Abort the run in Apify
      await service.abortRun(job.apifyRunId);

      // Update job status
      await prisma.apifyScrapeJob.update({
        where: { id: job.id },
        data: {
          status: 'CANCELLED',
          completedAt: new Date(),
        },
      });

      ApiResponse.success(res, 'Job cancelled');
    } catch (error) {
      next(error);
    }
  }
);

// ===========================================
// Smart Scrape (AI-Powered)
// ===========================================

/**
 * Smart scrape - AI interprets prompt and runs scraper
 */
router.post(
  '/smart-scrape',
  authorize('admin'),
  validate([
    body('prompt').notEmpty().withMessage('Prompt is required'),
  ]),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { prompt, extractEmails = false, source } = req.body;

      const service = await getApifyServiceForOrg(req.organizationId!);
      if (!service) {
        return ApiResponse.badRequest(res, 'Please configure Apify integration first');
      }

      const integration = await prisma.apifyIntegration.findUnique({
        where: { organizationId: req.organizationId! },
      });

      if (!integration) {
        return ApiResponse.badRequest(res, 'No Apify integration found');
      }

      // Map source to scraper type if provided
      const sourceToScraperType: Record<string, string> = {
        'google_maps': 'GOOGLE_MAPS',
        'linkedin_company': 'LINKEDIN_COMPANY',
        'linkedin_people': 'LINKEDIN_PEOPLE',
        'yellow_pages': 'YELLOW_PAGES',
      };
      const forcedScraperType = source ? sourceToScraperType[source] : undefined;

      // Use AI to interpret the prompt and generate search queries
      const { searchQueries, scraperType, country, countryCode } = await interpretPromptForScraping(prompt, forcedScraperType);

      // Determine actor ID based on scraper type
      // Use free/freemium actors where possible
      const actorIds: Record<string, string> = {
        GOOGLE_MAPS: 'apify~google-maps-scraper',  // Free tier available
        LINKEDIN_COMPANY: 'anchor~linkedin-scraper',  // Has free tier
        LINKEDIN_PEOPLE: 'anchor~linkedin-scraper',   // Same scraper for people
        YELLOW_PAGES: 'apify~yellow-pages-scraper',   // Free tier
      };

      const actorId = actorIds[scraperType] || actorIds.GOOGLE_MAPS;

      // Build input config based on scraper type
      let inputConfig: Record<string, any> = {};

      if (scraperType === 'GOOGLE_MAPS') {
        // Google Maps scraper config
        inputConfig = {
          searchStringsArray: searchQueries,
          maxCrawledPlacesPerSearch: 50,
          maxCrawledPlaces: 100,
          extractEmails,
          language: 'en',
          deeperCityScrape: true,
          skipClosedPlaces: true,
          countryCode: countryCode.toUpperCase(),
        };

        // Add country-specific geolocation
        if (countryCode === 'in') {
          inputConfig.customGeolocation = { lat: 20.5937, lng: 78.9629 };
        } else if (countryCode === 'us') {
          inputConfig.customGeolocation = { lat: 37.0902, lng: -95.7129 };
        } else if (countryCode === 'uk') {
          inputConfig.customGeolocation = { lat: 55.3781, lng: -3.4360 };
        }
      } else if (scraperType === 'LINKEDIN_COMPANY') {
        // LinkedIn Company scraper config
        // This scraper works with search URLs or direct company URLs
        inputConfig = {
          searchUrl: `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(searchQueries[0] || prompt)}`,
          maxResults: 100,
          proxy: {
            useApifyProxy: true,
            apifyProxyGroups: ['RESIDENTIAL'],
          },
        };
      } else if (scraperType === 'LINKEDIN_PEOPLE') {
        // LinkedIn People scraper config
        inputConfig = {
          searchUrl: `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(searchQueries[0] || prompt)}`,
          maxResults: 100,
          proxy: {
            useApifyProxy: true,
            apifyProxyGroups: ['RESIDENTIAL'],
          },
        };
      } else if (scraperType === 'YELLOW_PAGES') {
        // Yellow Pages scraper config
        inputConfig = {
          search: searchQueries[0] || prompt,
          location: country,
          maxItems: 100,
        };
      }

      console.log(`[SmartScrape] Starting scrape with config:`, JSON.stringify(inputConfig, null, 2));

      // Create scraper config
      const scraper = await prisma.apifyScraperConfig.create({
        data: {
          integrationId: integration.id,
          name: `Smart Scrape: ${prompt.slice(0, 50)}... (${country})`,
          scraperType: scraperType as ApifyScraperType,
          actorId,
          inputConfig,
          fieldMapping: DEFAULT_FIELD_MAPPINGS[scraperType as ApifyScraperType] || {},
          isActive: true,
        },
      });

      // Create job record immediately with PENDING status so it shows in the list
      const scrapeJob = await prisma.apifyScrapeJob.create({
        data: {
          integrationId: integration.id,
          configId: scraper.id,
          apifyRunId: `pending_${Date.now()}`, // Temporary ID until actual run starts
          actorId,
          status: 'PENDING',
          inputSnapshot: inputConfig,
        },
      });

      // Start the scrape job with email extraction flag
      const jobId = await jobQueueService.addJob(
        'APIFY_SCRAPE_RUN',
        {
          configId: scraper.id,
          integrationId: integration.id,
          actorId,
          inputConfig: scraper.inputConfig,
          fieldMapping: scraper.fieldMapping,
          scraperType,
          isScheduled: false,
          extractEmails, // Pass to job processor
          scrapeJobId: scrapeJob.id, // Pass the pre-created job ID
        },
        { organizationId: req.organizationId }
      );

      ApiResponse.success(res, 'Smart scrape started', {
        searchQueries,
        scraperType,
        scraperId: scraper.id,
        scrapeJobId: scrapeJob.id,
        jobId,
        extractEmails,
        status: 'STARTED',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Interpret user prompt and generate search queries with location detection
 */
async function interpretPromptForScraping(prompt: string, forcedScraperType?: string): Promise<{
  searchQueries: string[];
  scraperType: string;
  country: string;
  countryCode: string;
}> {
  const promptLower = prompt.toLowerCase();

  // Use forced scraper type if provided
  let scraperType = forcedScraperType || 'GOOGLE_MAPS';

  // Only auto-detect if not forced
  if (!forcedScraperType) {
    // Detect scraper type based on keywords
    if (promptLower.includes('linkedin company') || promptLower.includes('linkedin companies') ||
        promptLower.includes('linkedin business') || promptLower.includes('company on linkedin')) {
      scraperType = 'LINKEDIN_COMPANY';
    } else if (promptLower.includes('linkedin profile') || promptLower.includes('linkedin people') ||
               promptLower.includes('linkedin person') || promptLower.includes('people on linkedin') ||
               promptLower.includes('linkedin user') || promptLower.includes('profile on linkedin')) {
      scraperType = 'LINKEDIN_PEOPLE';
    } else if (promptLower.includes('linkedin') && !promptLower.includes('google')) {
      // Generic LinkedIn mention - default to company scraper
      scraperType = 'LINKEDIN_COMPANY';
    } else if (promptLower.includes('yellow pages')) {
      scraperType = 'YELLOW_PAGES';
    }
  }

  // Detect country from prompt
  let country = 'India';
  let countryCode = 'in';

  // Check for US locations
  const usLocations = ['usa', 'united states', 'america', 'new york', 'california', 'texas', 'florida', 'los angeles', 'san francisco', 'chicago', 'seattle', 'boston'];
  const ukLocations = ['uk', 'united kingdom', 'london', 'manchester', 'birmingham', 'england', 'scotland'];

  for (const loc of usLocations) {
    if (promptLower.includes(loc)) {
      country = 'United States';
      countryCode = 'us';
      break;
    }
  }

  for (const loc of ukLocations) {
    if (promptLower.includes(loc)) {
      country = 'United Kingdom';
      countryCode = 'uk';
      break;
    }
  }

  // Extract Indian cities (override country if Indian city found)
  const indianCities: Record<string, string> = {
    'bangalore': 'Bangalore, Karnataka, India',
    'bengaluru': 'Bangalore, Karnataka, India',
    'mumbai': 'Mumbai, Maharashtra, India',
    'delhi': 'Delhi, India',
    'new delhi': 'New Delhi, India',
    'hyderabad': 'Hyderabad, Telangana, India',
    'chennai': 'Chennai, Tamil Nadu, India',
    'pune': 'Pune, Maharashtra, India',
    'kolkata': 'Kolkata, West Bengal, India',
    'ahmedabad': 'Ahmedabad, Gujarat, India',
    'gurgaon': 'Gurgaon, Haryana, India',
    'gurugram': 'Gurugram, Haryana, India',
    'noida': 'Noida, Uttar Pradesh, India',
    'ncr': 'Delhi NCR, India',
    'jaipur': 'Jaipur, Rajasthan, India',
    'lucknow': 'Lucknow, Uttar Pradesh, India',
    'chandigarh': 'Chandigarh, India',
    'kochi': 'Kochi, Kerala, India',
    'coimbatore': 'Coimbatore, Tamil Nadu, India',
    'indore': 'Indore, Madhya Pradesh, India',
    'india': 'India',
  };

  const locations: string[] = [];

  for (const [cityKey, cityFull] of Object.entries(indianCities)) {
    if (promptLower.includes(cityKey)) {
      locations.push(cityFull);
      country = 'India';
      countryCode = 'in';
    }
  }

  // Default to major Indian cities if no location specified and country is India
  if (locations.length === 0) {
    if (country === 'India') {
      locations.push('Bangalore, Karnataka, India');
      locations.push('Mumbai, Maharashtra, India');
      locations.push('Delhi, India');
    } else {
      locations.push(country);
    }
  }

  // Extract business type keywords
  const businessKeywords = [
    'investor', 'investors', 'vc', 'venture capital', 'angel investor',
    'restaurant', 'restaurants', 'cafe', 'hotel', 'hotels',
    'gym', 'fitness', 'spa', 'salon',
    'real estate', 'property', 'builder',
    'software', 'it company', 'tech', 'startup',
    'hospital', 'clinic', 'doctor',
    'school', 'college', 'university',
    'lawyer', 'advocate', 'legal',
    'accountant', 'ca', 'chartered accountant',
    'wedding', 'event', 'planner',
  ];

  let businessType = '';
  for (const keyword of businessKeywords) {
    if (promptLower.includes(keyword)) {
      businessType = keyword;
      break;
    }
  }

  if (!businessType) {
    // Extract main subject from prompt
    businessType = prompt.replace(/find|get|scrape|all|in|from|with|contact|details|the|india|bangalore|mumbai|delhi|hyderabad/gi, '').trim();
  }

  // Generate search queries with full location names
  const searchQueries: string[] = [];

  for (const location of locations) {
    searchQueries.push(`${businessType} in ${location}`);
  }

  // Add variations for investors
  if (promptLower.includes('investor') || promptLower.includes('vc')) {
    for (const location of locations) {
      searchQueries.push(`venture capital firms in ${location}`);
      searchQueries.push(`angel investors in ${location}`);
    }
  }

  console.log(`[SmartScrape] Parsed prompt: "${prompt}"`);
  console.log(`[SmartScrape] Country: ${country}, Queries:`, searchQueries);

  return {
    searchQueries: [...new Set(searchQueries)].slice(0, 5), // Max 5 unique queries
    scraperType,
    country,
    countryCode,
  };
}

// ===========================================
// Statistics
// ===========================================

/**
 * Get Apify integration statistics
 */
router.get(
  '/stats',
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const integration = await prisma.apifyIntegration.findUnique({
        where: { organizationId: req.organizationId! },
      });

      if (!integration) {
        return ApiResponse.success(res, 'No integration configured', {
          totalScrapers: 0,
          activeScrapers: 0,
          totalJobs: 0,
          totalLeadsScraped: 0,
          recentJobs: [],
        });
      }

      const [
        totalScrapers,
        activeScrapers,
        totalJobs,
        jobStats,
        recentJobs,
        totalLeadsScraped,
      ] = await Promise.all([
        prisma.apifyScraperConfig.count({
          where: { integrationId: integration.id },
        }),
        prisma.apifyScraperConfig.count({
          where: { integrationId: integration.id, isActive: true },
        }),
        prisma.apifyScrapeJob.count({
          where: { integrationId: integration.id },
        }),
        prisma.apifyScrapeJob.groupBy({
          by: ['status'],
          where: { integrationId: integration.id },
          _count: { status: true },
        }),
        prisma.apifyScrapeJob.findMany({
          where: { integrationId: integration.id },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            config: {
              select: { name: true, scraperType: true },
            },
          },
        }),
        prisma.apifyScraperConfig.aggregate({
          where: { integrationId: integration.id },
          _sum: { totalLeadsScraped: true },
        }),
      ]);

      const jobsByStatus = jobStats.reduce(
        (acc, item) => {
          acc[item.status] = item._count.status;
          return acc;
        },
        {} as Record<string, number>
      );

      ApiResponse.success(res, 'Statistics retrieved', {
        totalScrapers,
        activeScrapers,
        totalJobs,
        jobsByStatus,
        totalLeadsScraped: totalLeadsScraped._sum.totalLeadsScraped || 0,
        recentJobs,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ===========================================
// Email Enrichment
// ===========================================

/**
 * Extract emails from websites for a specific job's records
 */
router.post(
  '/jobs/:id/enrich-emails',
  authorize('admin'),
  param('id').isUUID(),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const service = await getApifyServiceForOrg(req.organizationId!);
      if (!service) {
        return ApiResponse.badRequest(res, 'Apify integration not configured');
      }

      const integration = await prisma.apifyIntegration.findUnique({
        where: { organizationId: req.organizationId! },
      });

      const job = await prisma.apifyScrapeJob.findFirst({
        where: {
          id: req.params.id,
          integrationId: integration!.id,
        },
      });

      if (!job) {
        return ApiResponse.notFound(res, 'Job not found');
      }

      if (!job.bulkImportId) {
        return ApiResponse.badRequest(res, 'No records to enrich');
      }

      // Start email enrichment in background
      const result = await service.enrichLeadsWithEmails(
        req.organizationId!,
        job.bulkImportId
      );

      ApiResponse.success(res, 'Email enrichment completed', result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Extract emails from a list of websites (manual)
 */
router.post(
  '/extract-emails',
  authorize('admin'),
  validate([
    body('websites').isArray().withMessage('Websites must be an array'),
  ]),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const service = await getApifyServiceForOrg(req.organizationId!);
      if (!service) {
        return ApiResponse.badRequest(res, 'Apify integration not configured');
      }

      const { websites } = req.body;

      if (!websites || websites.length === 0) {
        return ApiResponse.badRequest(res, 'No websites provided');
      }

      // Start the extraction run
      const run = await service.extractEmailsFromWebsites(websites);

      ApiResponse.success(res, 'Email extraction started', {
        runId: run.id,
        status: run.status,
        websitesCount: websites.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get email extraction results
 */
router.get(
  '/extract-emails/:runId',
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const service = await getApifyServiceForOrg(req.organizationId!);
      if (!service) {
        return ApiResponse.badRequest(res, 'Apify integration not configured');
      }

      const { runId } = req.params;

      // Get run status
      const run = await service.getRunStatus(runId);

      if (run.status === 'SUCCEEDED') {
        // Get results
        const results = await service.processEmailExtractionResults(run.defaultDatasetId);
        const resultsArray = Array.from(results.entries()).map(([domain, info]) => ({
          domain,
          ...info,
        }));

        ApiResponse.success(res, 'Email extraction completed', {
          status: run.status,
          results: resultsArray,
        });
      } else {
        ApiResponse.success(res, 'Email extraction in progress', {
          status: run.status,
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

export default router;
