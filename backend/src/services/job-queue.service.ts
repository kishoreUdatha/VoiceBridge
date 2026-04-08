import Bull, { Queue, Job, JobOptions } from 'bull';
import { config } from '../config';
import { prisma } from '../config/database';
import { scoreDecayService } from './score-decay.service';
import { emailService } from '../integrations/email.service';

// Job types
export type JobType =
  | 'BULK_EMAIL'
  | 'BULK_SMS'
  | 'SCORE_DECAY'
  | 'CSV_IMPORT'
  | 'REPORT_GENERATION'
  | 'CLEANUP_FILES'
  | 'WEBHOOK_DELIVERY'
  | 'CAMPAIGN_PROCESSING'
  | 'SCHEDULED_CALL'
  | 'CHECK_SCHEDULED_CALLS'
  | 'AD_INSIGHTS_SYNC'
  | 'AD_INSIGHTS_SYNC_ALL'
  | 'APIFY_SCRAPE_RUN'
  | 'APIFY_SCRAPE_POLL'
  | 'APIFY_SCRAPE_IMPORT'
  | 'APIFY_SCHEDULED_CHECK'
  | 'ADMISSION_PAYMENT_REMINDER'
  | 'INDIAMART_SYNC'
  | 'INDIAMART_SYNC_ALL'
  | 'QUICK_CALL_REMINDER'
  | 'PERFORMANCE_CHECK'
  | 'DAILY_SUMMARY';

interface JobData {
  type: JobType;
  payload: Record<string, any>;
  organizationId?: string;
  userId?: string;
}

interface JobResult {
  success: boolean;
  processed: number;
  failed: number;
  errors?: string[];
  data?: any;
}

interface JobRecord {
  id: string;
  type: JobType;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  payload: Record<string, any>;
  result?: JobResult;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  organizationId?: string;
  userId?: string;
}

class JobQueueService {
  private queue: Queue<JobData> | null = null;
  private inMemoryJobs: Map<string, JobRecord> = new Map();
  private isRedisAvailable: boolean = false;
  private jobCounter: number = 0;
  private redisErrorLogged: boolean = false;

  constructor() {
    this.initializeQueue();
  }

  private initializeQueue() {
    const redisUrl = config.redis?.url || process.env.REDIS_URL;

    if (redisUrl) {
      try {
        this.queue = new Bull<JobData>('crm-jobs', redisUrl, {
          defaultJobOptions: {
            removeOnComplete: 100,
            removeOnFail: 50,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000,
            },
          },
        });

        this.queue.on('ready', () => {
          console.log('Job queue connected to Redis');
          this.isRedisAvailable = true;
          this.redisErrorLogged = false;
        });

        this.queue.on('error', (error) => {
          // Only log Redis connection error once to avoid spam
          if (!this.redisErrorLogged) {
            console.warn('[JobQueue] Redis unavailable, using in-memory fallback. Further errors will be suppressed.');
            this.redisErrorLogged = true;
          }
          this.isRedisAvailable = false;
        });

        // Register job processors
        this.registerProcessors();
      } catch (error) {
        console.warn('Redis not available, using in-memory queue');
        this.isRedisAvailable = false;
      }
    } else {
      console.log('No Redis URL configured, using in-memory job queue');
    }
  }

  private registerProcessors() {
    if (!this.queue) return;

    this.queue.process(async (job: Job<JobData>) => {
      return this.processJob(job.data);
    });
  }

  /**
   * Add a job to the queue
   */
  async addJob(
    type: JobType,
    payload: Record<string, any>,
    options?: {
      organizationId?: string;
      userId?: string;
      delay?: number;
      priority?: number;
    }
  ): Promise<string> {
    const jobData: JobData = {
      type,
      payload,
      organizationId: options?.organizationId,
      userId: options?.userId,
    };

    if (this.queue && this.isRedisAvailable) {
      const bullOptions: JobOptions = {
        delay: options?.delay,
        priority: options?.priority,
      };

      const job = await this.queue.add(jobData, bullOptions);
      return job.id.toString();
    }

    // Fallback to in-memory processing
    return this.addInMemoryJob(jobData, options?.delay);
  }

  private async addInMemoryJob(data: JobData, delay?: number): Promise<string> {
    const id = `job_${++this.jobCounter}_${Date.now()}`;
    const record: JobRecord = {
      id,
      type: data.type,
      status: 'pending',
      payload: data.payload,
      createdAt: new Date(),
      organizationId: data.organizationId,
      userId: data.userId,
    };

    this.inMemoryJobs.set(id, record);

    // Process after delay or immediately
    const processDelay = delay || 0;
    setTimeout(() => this.processInMemoryJob(id), processDelay);

    return id;
  }

  private async processInMemoryJob(id: string) {
    const record = this.inMemoryJobs.get(id);
    if (!record || record.status !== 'pending') return;

    record.status = 'processing';
    record.startedAt = new Date();

    try {
      const result = await this.processJob({
        type: record.type,
        payload: record.payload,
        organizationId: record.organizationId,
        userId: record.userId,
      });

      record.status = 'completed';
      record.result = result;
      record.completedAt = new Date();
    } catch (error) {
      record.status = 'failed';
      record.error = (error as Error).message;
      record.completedAt = new Date();
    }
  }

  /**
   * Process a job based on its type
   */
  private async processJob(data: JobData): Promise<JobResult> {
    switch (data.type) {
      case 'BULK_EMAIL':
        return this.processBulkEmail(data.payload);

      case 'BULK_SMS':
        return this.processBulkSms(data.payload);

      case 'SCORE_DECAY':
        return this.processScoreDecay(data.payload, data.organizationId);

      case 'CSV_IMPORT':
        return this.processCsvImport(data.payload, data.organizationId);

      case 'REPORT_GENERATION':
        return this.processReportGeneration(data.payload, data.organizationId);

      case 'CLEANUP_FILES':
        return this.processFileCleanup(data.payload);

      case 'WEBHOOK_DELIVERY':
        return this.processWebhookDelivery(data.payload);

      case 'CAMPAIGN_PROCESSING':
        return this.processCampaign(data.payload);

      case 'SCHEDULED_CALL':
        return this.processScheduledCall(data.payload);

      case 'CHECK_SCHEDULED_CALLS':
        return this.checkScheduledCalls();

      case 'AD_INSIGHTS_SYNC':
        return this.processAdInsightsSync(data.payload, data.organizationId);

      case 'AD_INSIGHTS_SYNC_ALL':
        return this.processAdInsightsSyncAll();

      case 'APIFY_SCRAPE_RUN':
        return this.processApifyScrapeRun(data.payload, data.organizationId);

      case 'APIFY_SCRAPE_POLL':
        return this.processApifyScrapePoll(data.payload, data.organizationId);

      case 'APIFY_SCRAPE_IMPORT':
        return this.processApifyScrapeImport(data.payload, data.organizationId);

      case 'APIFY_SCHEDULED_CHECK':
        return this.processApifyScheduledCheck();

      case 'ADMISSION_PAYMENT_REMINDER':
        return this.processAdmissionPaymentReminders();

      case 'INDIAMART_SYNC':
        return this.processIndiaMartSync(data.organizationId);

      case 'INDIAMART_SYNC_ALL':
        return this.processIndiaMartSyncAll();

      case 'QUICK_CALL_REMINDER':
        return this.processQuickCallReminder(data.payload);

      case 'PERFORMANCE_CHECK':
        return this.processPerformanceCheck(data.organizationId!);

      case 'DAILY_SUMMARY':
        return this.processDailySummary(data.organizationId!);

      default:
        throw new Error(`Unknown job type: ${data.type}`);
    }
  }

  /**
   * Bulk email processing
   */
  private async processBulkEmail(payload: Record<string, any>): Promise<JobResult> {
    const { recipients, subject, body, html, userId } = payload;
    let processed = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const recipient of recipients) {
      try {
        await emailService.sendEmail({
          to: recipient.email,
          subject,
          body,
          html,
          leadId: recipient.leadId,
          userId,
        });
        processed++;
      } catch (error) {
        failed++;
        errors.push(`${recipient.email}: ${(error as Error).message}`);
      }

      // Rate limiting - 1 email per 100ms
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return { success: failed === 0, processed, failed, errors };
  }

  /**
   * Bulk SMS processing
   */
  private async processBulkSms(payload: Record<string, any>): Promise<JobResult> {
    const { recipients, message, userId } = payload;
    let processed = 0;
    let failed = 0;
    const errors: string[] = [];

    // Dynamic import to avoid circular dependency
    const { exotelService } = await import('../integrations/exotel.service');

    for (const recipient of recipients) {
      try {
        const personalizedMessage = message
          .replace(/{name}/g, recipient.name || 'Student')
          .replace(/{phone}/g, recipient.phone);

        await exotelService.sendSMS({ to: recipient.phone, body: personalizedMessage });
        processed++;
      } catch (error) {
        failed++;
        errors.push(`${recipient.phone}: ${(error as Error).message}`);
      }

      // Rate limiting - 1 SMS per 200ms
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    return { success: failed === 0, processed, failed, errors };
  }

  /**
   * Score decay processing
   */
  private async processScoreDecay(
    payload: Record<string, any>,
    organizationId?: string
  ): Promise<JobResult> {
    if (organizationId) {
      const result = await scoreDecayService.processOrganizationDecay(organizationId);
      return {
        success: result.errors === 0,
        processed: result.processed,
        failed: result.errors,
        data: { updated: result.updated },
      };
    }

    const result = await scoreDecayService.processAllDecay();
    return {
      success: result.totalErrors === 0,
      processed: result.totalProcessed,
      failed: result.totalErrors,
      data: {
        organizations: result.organizations,
        updated: result.totalUpdated,
      },
    };
  }

  /**
   * CSV import processing
   */
  private async processCsvImport(
    payload: Record<string, any>,
    organizationId?: string
  ): Promise<JobResult> {
    const { records, mappings, userId } = payload;
    let processed = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const record of records) {
      try {
        // Map CSV fields to lead fields
        const leadData: Record<string, any> = {
          organizationId,
          source: 'BULK_UPLOAD',
        };

        for (const [csvField, leadField] of Object.entries(mappings)) {
          if (record[csvField]) {
            leadData[leadField as string] = record[csvField];
          }
        }

        // Validate required fields
        if (!leadData.firstName || !leadData.phone) {
          throw new Error('Missing required fields: firstName or phone');
        }

        // Check for duplicates
        const existing = await prisma.lead.findFirst({
          where: {
            organizationId,
            phone: leadData.phone,
          },
        });

        if (existing) {
          // Update existing lead
          await prisma.lead.update({
            where: { id: existing.id },
            data: {
              ...leadData,
              isReEnquiry: true,
            },
          });
        } else {
          // Create new lead
          await prisma.lead.create({
            data: leadData as any,
          });
        }

        processed++;
      } catch (error) {
        failed++;
        errors.push(`Row ${processed + failed}: ${(error as Error).message}`);
      }
    }

    return { success: failed === 0, processed, failed, errors };
  }

  /**
   * Report generation
   */
  private async processReportGeneration(
    payload: Record<string, any>,
    organizationId?: string
  ): Promise<JobResult> {
    const { reportType, dateFrom, dateTo, filters } = payload;

    try {
      let data: any;

      switch (reportType) {
        case 'leads':
          data = await prisma.lead.findMany({
            where: {
              organizationId,
              createdAt: {
                gte: new Date(dateFrom),
                lte: new Date(dateTo),
              },
              ...filters,
            },
            include: {
              stage: true,
              channel: true,
              assignments: {
                where: { isActive: true },
                include: { assignedTo: true },
              },
            },
          });
          break;

        case 'calls':
          data = await prisma.callLog.findMany({
            where: {
              lead: { organizationId },
              createdAt: {
                gte: new Date(dateFrom),
                lte: new Date(dateTo),
              },
            },
            include: {
              lead: true,
              caller: true,
            },
          });
          break;

        case 'campaigns':
          data = await prisma.campaign.findMany({
            where: {
              organizationId,
              createdAt: {
                gte: new Date(dateFrom),
                lte: new Date(dateTo),
              },
            },
            include: {
              recipients: true,
            },
          });
          break;

        default:
          throw new Error(`Unknown report type: ${reportType}`);
      }

      return {
        success: true,
        processed: data.length,
        failed: 0,
        data,
      };
    } catch (error) {
      return {
        success: false,
        processed: 0,
        failed: 1,
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * File cleanup processing
   */
  private async processFileCleanup(payload: Record<string, any>): Promise<JobResult> {
    const { olderThanDays = 30, fileTypes } = payload;
    let processed = 0;
    let failed = 0;

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      // Find old attachments
      const oldAttachments = await prisma.leadAttachment.findMany({
        where: {
          uploadedAt: { lt: cutoffDate },
          ...(fileTypes ? { mimeType: { in: fileTypes } } : {}),
        },
      });

      for (const attachment of oldAttachments) {
        try {
          // Delete from S3 if applicable
          if (attachment.fileUrl.includes('s3.amazonaws.com')) {
            const { s3Service } = await import('../integrations/s3.service');
            const key = attachment.fileUrl.split('/').pop();
            if (key) {
              await s3Service.deleteFile(key);
            }
          }

          // Delete record
          await prisma.leadAttachment.delete({
            where: { id: attachment.id },
          });

          processed++;
        } catch (error) {
          failed++;
        }
      }

      return { success: failed === 0, processed, failed };
    } catch (error) {
      return {
        success: false,
        processed,
        failed: 1,
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Webhook delivery processing
   */
  private async processWebhookDelivery(payload: Record<string, any>): Promise<JobResult> {
    const { webhookId, event, data } = payload;

    try {
      const webhook = await prisma.webhookConfig.findUnique({
        where: { id: webhookId },
      });

      if (!webhook || !webhook.isActive) {
        return { success: false, processed: 0, failed: 1, errors: ['Webhook not found or inactive'] };
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add authentication
      if (webhook.authType !== 'NONE' && webhook.authHeader && webhook.authValue) {
        headers[webhook.authHeader] = webhook.authValue;
      }

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ event, data, timestamp: new Date().toISOString() }),
        signal: AbortSignal.timeout(webhook.timeoutSeconds * 1000),
      });

      // Log the delivery
      await prisma.webhookLog.create({
        data: {
          webhookId,
          event,
          payload: data,
          status: response.ok ? 'SUCCESS' : 'FAILED',
          responseCode: response.status,
          responseBody: await response.text(),
        },
      });

      // Update webhook stats
      await prisma.webhookConfig.update({
        where: { id: webhookId },
        data: {
          lastTriggeredAt: new Date(),
          successCount: response.ok ? { increment: 1 } : undefined,
          failureCount: !response.ok ? { increment: 1 } : undefined,
          lastError: !response.ok ? `HTTP ${response.status}` : null,
        },
      });

      return { success: response.ok, processed: 1, failed: response.ok ? 0 : 1 };
    } catch (error) {
      await prisma.webhookLog.create({
        data: {
          webhookId,
          event,
          payload: data,
          status: 'FAILED',
          error: (error as Error).message,
        },
      });

      return { success: false, processed: 0, failed: 1, errors: [(error as Error).message] };
    }
  }

  /**
   * Campaign processing
   */
  private async processCampaign(payload: Record<string, any>): Promise<JobResult> {
    const { campaignId } = payload;

    try {
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: { recipients: { where: { status: 'PENDING' } } },
      });

      if (!campaign) {
        return { success: false, processed: 0, failed: 1, errors: ['Campaign not found'] };
      }

      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'RUNNING', startedAt: new Date() },
      });

      let processed = 0;
      let failed = 0;

      for (const recipient of campaign.recipients) {
        try {
          if (campaign.type === 'EMAIL' && recipient.email) {
            await emailService.sendEmail({
              to: recipient.email,
              subject: campaign.subject || '',
              body: campaign.content,
              html: campaign.content,
              userId: campaign.createdById,
              campaignId: campaign.id,
            });
          }

          await prisma.campaignRecipient.update({
            where: { id: recipient.id },
            data: { status: 'SENT', sentAt: new Date() },
          });

          processed++;
        } catch (error) {
          await prisma.campaignRecipient.update({
            where: { id: recipient.id },
            data: { status: 'FAILED', failedReason: (error as Error).message },
          });
          failed++;
        }
      }

      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          stats: { processed, failed },
        },
      });

      return { success: failed === 0, processed, failed };
    } catch (error) {
      return { success: false, processed: 0, failed: 1, errors: [(error as Error).message] };
    }
  }

  /**
   * Process a scheduled call
   */
  private async processScheduledCall(payload: Record<string, any>): Promise<JobResult> {
    const { scheduledCallId } = payload;

    try {
      const scheduledCall = await prisma.scheduledCall.findUnique({
        where: { id: scheduledCallId },
        include: { agent: true },
      });

      if (!scheduledCall) {
        return { success: false, processed: 0, failed: 1, errors: ['Scheduled call not found'] };
      }

      if (scheduledCall.status !== 'PENDING') {
        return { success: false, processed: 0, failed: 1, errors: ['Call already processed'] };
      }

      // Update status to IN_PROGRESS
      await prisma.scheduledCall.update({
        where: { id: scheduledCallId },
        data: { status: 'IN_PROGRESS', attemptCount: { increment: 1 }, lastAttemptAt: new Date() },
      });

      // Import outbound call service dynamically
      const { outboundCallService } = await import('../integrations/outbound-call.service');

      // Make the call
      const result = await outboundCallService.makeCall({
        phone: scheduledCall.phoneNumber,
        agentId: scheduledCall.agentId,
        leadId: scheduledCall.leadId || undefined,
      });

      // Update scheduled call with result
      await prisma.scheduledCall.update({
        where: { id: scheduledCallId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          resultCallId: result.callId,
        },
      });

      console.log(`[JobQueue] Scheduled call ${scheduledCallId} completed successfully`);
      return { success: true, processed: 1, failed: 0, data: { callId: result.callId } };
    } catch (error) {
      console.error(`[JobQueue] Scheduled call ${scheduledCallId} failed:`, error);

      // Update status to FAILED
      await prisma.scheduledCall.update({
        where: { id: scheduledCallId },
        data: { status: 'FAILED' },
      });

      return { success: false, processed: 0, failed: 1, errors: [(error as Error).message] };
    }
  }

  /**
   * Check for scheduled calls that need to be executed
   */
  private async checkScheduledCalls(): Promise<JobResult> {
    try {
      const now = new Date();

      // Find all pending scheduled calls that are due
      const pendingCalls = await prisma.scheduledCall.findMany({
        where: {
          status: 'PENDING',
          scheduledAt: { lte: now },
          attemptCount: { lt: 3 }, // Max 3 attempts
        },
        orderBy: { priority: 'desc' },
        take: 10, // Process 10 at a time
      });

      console.log(`[JobQueue] Found ${pendingCalls.length} scheduled calls to process`);

      let processed = 0;
      let failed = 0;

      for (const call of pendingCalls) {
        try {
          // Add each call as a separate job
          await this.addJob('SCHEDULED_CALL', { scheduledCallId: call.id }, {
            organizationId: call.organizationId,
            priority: call.priority,
          });
          processed++;
        } catch (error) {
          failed++;
        }
      }

      return { success: failed === 0, processed, failed };
    } catch (error) {
      return { success: false, processed: 0, failed: 1, errors: [(error as Error).message] };
    }
  }

  /**
   * Ad insights sync for a single organization
   */
  private async processAdInsightsSync(
    payload: Record<string, any>,
    organizationId?: string
  ): Promise<JobResult> {
    if (!organizationId) {
      return { success: false, processed: 0, failed: 1, errors: ['Organization ID required'] };
    }

    try {
      // Dynamic import to avoid circular dependency
      const { adInsightsSyncService } = await import('./ad-insights-sync.service');
      const result = await adInsightsSyncService.syncAllPlatforms(organizationId);

      console.log(`[JobQueue] Ad insights sync completed for org ${organizationId}: ${result.totalSynced} synced, ${result.totalErrors} errors`);

      return {
        success: result.totalErrors === 0,
        processed: result.totalSynced,
        failed: result.totalErrors,
        data: result,
      };
    } catch (error) {
      console.error(`[JobQueue] Ad insights sync failed for org ${organizationId}:`, error);
      return { success: false, processed: 0, failed: 1, errors: [(error as Error).message] };
    }
  }

  /**
   * Ad insights sync for all organizations
   */
  private async processAdInsightsSyncAll(): Promise<JobResult> {
    try {
      // Dynamic import to avoid circular dependency
      const { adInsightsSyncService } = await import('./ad-insights-sync.service');
      const result = await adInsightsSyncService.syncAllOrganizations();

      console.log(`[JobQueue] Batch ad insights sync completed: ${result.totalSynced} campaigns synced across ${result.organizations} orgs`);

      return {
        success: result.totalErrors === 0,
        processed: result.totalSynced,
        failed: result.totalErrors,
        data: result,
      };
    } catch (error) {
      console.error('[JobQueue] Batch ad insights sync failed:', error);
      return { success: false, processed: 0, failed: 1, errors: [(error as Error).message] };
    }
  }

  /**
   * Start an Apify scrape run
   */
  private async processApifyScrapeRun(
    payload: Record<string, any>,
    organizationId?: string
  ): Promise<JobResult> {
    try {
      const { getApifyServiceForOrg } = await import('../integrations/apify.service');

      if (!organizationId) {
        throw new Error('Organization ID is required');
      }

      const service = await getApifyServiceForOrg(organizationId);
      if (!service) {
        throw new Error('Apify integration not configured');
      }

      const { configId, integrationId, actorId, inputConfig, fieldMapping, scraperType, extractEmails = false, scrapeJobId } = payload;

      let run;
      try {
        // Start the Apify run
        run = await service.startRun(actorId, inputConfig);
      } catch (runError: any) {
        // If the run fails to start, update the pre-created job to FAILED
        if (scrapeJobId) {
          await prisma.apifyScrapeJob.update({
            where: { id: scrapeJobId },
            data: {
              status: 'FAILED',
              errorMessage: runError.message || 'Failed to start Apify run',
              completedAt: new Date(),
            },
          });
        }
        throw runError;
      }

      // Update existing job record or create new one
      let job;
      if (scrapeJobId) {
        // Update the pre-created job record
        job = await prisma.apifyScrapeJob.update({
          where: { id: scrapeJobId },
          data: {
            apifyRunId: run.id,
            status: 'RUNNING',
            startedAt: new Date(),
          },
        });
      } else {
        // Fallback: create job record in database (for scheduled jobs)
        job = await prisma.apifyScrapeJob.create({
          data: {
            integrationId,
            configId,
            apifyRunId: run.id,
            actorId,
            status: 'RUNNING',
            startedAt: new Date(),
            inputSnapshot: inputConfig,
          },
        });
      }

      // Update config last run info
      if (configId) {
        await prisma.apifyScraperConfig.update({
          where: { id: configId },
          data: {
            lastRunAt: new Date(),
            lastRunStatus: 'RUNNING',
          },
        });
      }

      // Queue a poll job to check status
      await this.addJob(
        'APIFY_SCRAPE_POLL',
        {
          jobId: job.id,
          runId: run.id,
          configId,
          fieldMapping,
          scraperType,
          extractEmails,
          pollCount: 0,
        },
        { organizationId, delay: 30000 } // Poll after 30 seconds
      );

      console.log(`[JobQueue] Started Apify run ${run.id} for config ${configId}`);

      return {
        success: true,
        processed: 1,
        failed: 0,
        data: { runId: run.id, jobId: job.id },
      };
    } catch (error) {
      console.error('[JobQueue] Apify scrape run failed:', error);
      return { success: false, processed: 0, failed: 1, errors: [(error as Error).message] };
    }
  }

  /**
   * Poll an Apify run for completion
   */
  private async processApifyScrapePoll(
    payload: Record<string, any>,
    organizationId?: string
  ): Promise<JobResult> {
    try {
      const { getApifyServiceForOrg } = await import('../integrations/apify.service');

      if (!organizationId) {
        throw new Error('Organization ID is required');
      }

      const service = await getApifyServiceForOrg(organizationId);
      if (!service) {
        throw new Error('Apify integration not configured');
      }

      const { jobId, runId, configId, fieldMapping, scraperType, extractEmails = false, pollCount = 0 } = payload;

      // Get run status from Apify
      const run = await service.getRunStatus(runId);

      // Map Apify status to our status
      const statusMap: Record<string, 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED'> = {
        READY: 'PENDING',
        RUNNING: 'RUNNING',
        SUCCEEDED: 'SUCCEEDED',
        FAILED: 'FAILED',
        ABORTED: 'CANCELLED',
        ABORTING: 'RUNNING',
        'TIMING-OUT': 'RUNNING',
        'TIMED-OUT': 'FAILED',
      };

      const status = statusMap[run.status] || 'RUNNING';

      // Update job status
      await prisma.apifyScrapeJob.update({
        where: { id: jobId },
        data: {
          status,
          completedAt: run.finishedAt ? new Date(run.finishedAt) : null,
        },
      });

      if (status === 'SUCCEEDED') {
        // Queue import job
        await this.addJob(
          'APIFY_SCRAPE_IMPORT',
          {
            jobId,
            runId,
            configId,
            fieldMapping,
            scraperType,
            extractEmails,
          },
          { organizationId }
        );

        console.log(`[JobQueue] Apify run ${runId} succeeded, queuing import`);

        return {
          success: true,
          processed: 1,
          failed: 0,
          data: { status: 'SUCCEEDED' },
        };
      } else if (status === 'FAILED' || status === 'CANCELLED') {
        // Update config status
        if (configId) {
          await prisma.apifyScraperConfig.update({
            where: { id: configId },
            data: { lastRunStatus: status },
          });
        }

        console.log(`[JobQueue] Apify run ${runId} ${status}`);

        return {
          success: false,
          processed: 0,
          failed: 1,
          data: { status },
        };
      } else {
        // Still running - queue another poll if under limit
        const maxPolls = 120; // 120 polls * 30s = 1 hour max
        if (pollCount < maxPolls) {
          await this.addJob(
            'APIFY_SCRAPE_POLL',
            {
              jobId,
              runId,
              configId,
              fieldMapping,
              scraperType,
              extractEmails,
              pollCount: pollCount + 1,
            },
            { organizationId, delay: 30000 }
          );
        } else {
          // Timeout - mark as failed
          await prisma.apifyScrapeJob.update({
            where: { id: jobId },
            data: {
              status: 'FAILED',
              errorMessage: 'Polling timeout exceeded',
              completedAt: new Date(),
            },
          });

          return {
            success: false,
            processed: 0,
            failed: 1,
            errors: ['Polling timeout exceeded'],
          };
        }

        return {
          success: true,
          processed: 0,
          failed: 0,
          data: { status: 'RUNNING', pollCount: pollCount + 1 },
        };
      }
    } catch (error) {
      console.error('[JobQueue] Apify scrape poll failed:', error);
      return { success: false, processed: 0, failed: 1, errors: [(error as Error).message] };
    }
  }

  /**
   * Import results from a completed Apify run
   */
  private async processApifyScrapeImport(
    payload: Record<string, any>,
    organizationId?: string
  ): Promise<JobResult> {
    try {
      const { getApifyServiceForOrg } = await import('../integrations/apify.service');

      if (!organizationId) {
        throw new Error('Organization ID is required');
      }

      const service = await getApifyServiceForOrg(organizationId);
      if (!service) {
        throw new Error('Apify integration not configured');
      }

      const { jobId, runId, configId, fieldMapping, scraperType, extractEmails = false } = payload;

      // Process and import results
      const result = await service.processAndImportResults(
        organizationId,
        runId,
        fieldMapping,
        scraperType
      );

      // Update job with import results
      await prisma.apifyScrapeJob.update({
        where: { id: jobId },
        data: {
          totalItems: result.totalItems,
          importedItems: result.importedItems,
          duplicateItems: result.duplicateItems,
          failedItems: result.failedItems,
          bulkImportId: result.bulkImportId,
        },
      });

      // Update config stats
      if (configId) {
        await prisma.apifyScraperConfig.update({
          where: { id: configId },
          data: {
            lastRunStatus: 'SUCCEEDED',
            totalLeadsScraped: {
              increment: result.importedItems,
            },
          },
        });
      }

      console.log(`[JobQueue] Imported ${result.importedItems} leads from Apify run ${runId}`);

      // If email extraction is enabled, enrich leads with emails from their websites
      if (extractEmails && result.bulkImportId && result.importedItems > 0) {
        console.log(`[JobQueue] Starting email extraction for ${result.importedItems} leads...`);
        try {
          const emailResult = await service.enrichLeadsWithEmails(
            organizationId,
            result.bulkImportId
          );
          console.log(`[JobQueue] Email extraction complete: ${emailResult.enriched}/${emailResult.total} enriched`);
        } catch (emailError) {
          console.error('[JobQueue] Email extraction failed:', emailError);
          // Don't fail the whole job if email extraction fails
        }
      }

      return {
        success: true,
        processed: result.importedItems,
        failed: result.failedItems,
        data: result,
      };
    } catch (error) {
      console.error('[JobQueue] Apify scrape import failed:', error);

      // Update job with error
      if (payload.jobId) {
        await prisma.apifyScrapeJob.update({
          where: { id: payload.jobId },
          data: {
            status: 'FAILED',
            errorMessage: (error as Error).message,
            completedAt: new Date(),
          },
        });
      }

      return { success: false, processed: 0, failed: 1, errors: [(error as Error).message] };
    }
  }

  /**
   * Check for scheduled Apify scrapes
   */
  private async processApifyScheduledCheck(): Promise<JobResult> {
    try {
      const { apifySchedulerService } = await import('./apify-scheduler.service');
      await apifySchedulerService.checkScheduledScrapes();

      return {
        success: true,
        processed: 1,
        failed: 0,
      };
    } catch (error) {
      console.error('[JobQueue] Apify scheduled check failed:', error);
      return { success: false, processed: 0, failed: 1, errors: [(error as Error).message] };
    }
  }

  /**
   * Process admission payment reminders
   */
  private async processAdmissionPaymentReminders(): Promise<JobResult> {
    try {
      const { admissionNotificationService } = await import('./admission-notification.service');
      const result = await admissionNotificationService.checkAndSendPaymentReminders();

      console.log(`[JobQueue] Admission payment reminders: ${result.sent} sent, ${result.failed} failed`);

      return {
        success: result.failed === 0,
        processed: result.sent,
        failed: result.failed,
      };
    } catch (error) {
      console.error('[JobQueue] Admission payment reminders failed:', error);
      return { success: false, processed: 0, failed: 1, errors: [(error as Error).message] };
    }
  }

  /**
   * Start the scheduled call checker (runs every minute)
   */
  startScheduledCallChecker(): void {
    console.log('[JobQueue] Starting scheduled call checker (runs every minute)');

    // Check immediately on startup
    this.checkScheduledCalls();

    // Then check every minute
    setInterval(() => {
      this.checkScheduledCalls();
    }, 60 * 1000); // Every 60 seconds
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<JobRecord | null> {
    // Check in-memory first
    const inMemoryJob = this.inMemoryJobs.get(jobId);
    if (inMemoryJob) return inMemoryJob;

    // Check Bull queue
    if (this.queue && this.isRedisAvailable) {
      const job = await this.queue.getJob(jobId);
      if (job) {
        const state = await job.getState();
        return {
          id: job.id.toString(),
          type: job.data.type,
          status: state === 'active' ? 'processing' : state === 'completed' ? 'completed' : state === 'failed' ? 'failed' : 'pending',
          payload: job.data.payload,
          result: job.returnvalue,
          createdAt: new Date(job.timestamp),
          organizationId: job.data.organizationId,
          userId: job.data.userId,
        };
      }
    }

    return null;
  }

  /**
   * Get all jobs for an organization
   */
  async getOrganizationJobs(organizationId: string): Promise<JobRecord[]> {
    const jobs: JobRecord[] = [];

    // In-memory jobs
    for (const job of this.inMemoryJobs.values()) {
      if (job.organizationId === organizationId) {
        jobs.push(job);
      }
    }

    return jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Schedule recurring score decay job
   */
  async scheduleScoreDecayJob(cronExpression?: string): Promise<void> {
    if (this.queue && this.isRedisAvailable) {
      // Remove existing repeatable job
      await this.queue.removeRepeatable('score-decay', {
        cron: cronExpression || '0 2 * * *', // Default: 2 AM daily
      });

      // Add new repeatable job
      await this.queue.add(
        { type: 'SCORE_DECAY', payload: {} },
        {
          repeat: { cron: cronExpression || '0 2 * * *' },
          jobId: 'score-decay',
        }
      );

      console.log('Score decay job scheduled');
    } else {
      console.log('Score decay scheduling requires Redis');
    }
  }

  /**
   * Schedule recurring ad insights sync job
   * Runs every 4 hours by default to sync impressions, clicks, and spend from ad platforms
   */
  async scheduleAdInsightsSyncJob(cronExpression?: string): Promise<void> {
    if (this.queue && this.isRedisAvailable) {
      // Remove existing repeatable job
      await this.queue.removeRepeatable('ad-insights-sync', {
        cron: cronExpression || '0 */4 * * *', // Default: Every 4 hours
      });

      // Add new repeatable job
      await this.queue.add(
        { type: 'AD_INSIGHTS_SYNC_ALL', payload: {} },
        {
          repeat: { cron: cronExpression || '0 */4 * * *' },
          jobId: 'ad-insights-sync',
        }
      );

      console.log('[JobQueue] Ad insights sync job scheduled (every 4 hours)');
    } else {
      console.log('[JobQueue] Ad insights sync scheduling requires Redis');
    }
  }

  /**
   * Start the ad insights sync checker (fallback for in-memory queue)
   * Runs every 4 hours
   */
  startAdInsightsSyncChecker(): void {
    console.log('[JobQueue] Starting ad insights sync checker (runs every 4 hours)');

    // Run every 4 hours
    setInterval(() => {
      this.addJob('AD_INSIGHTS_SYNC_ALL', {});
    }, 4 * 60 * 60 * 1000); // Every 4 hours
  }

  /**
   * Schedule recurring admission payment reminder job
   * Runs daily at 10 AM by default
   */
  async scheduleAdmissionPaymentReminderJob(cronExpression?: string): Promise<void> {
    if (this.queue && this.isRedisAvailable) {
      // Remove existing repeatable job
      await this.queue.removeRepeatable('admission-payment-reminder', {
        cron: cronExpression || '0 10 * * *', // Default: 10 AM daily
      });

      // Add new repeatable job
      await this.queue.add(
        { type: 'ADMISSION_PAYMENT_REMINDER', payload: {} },
        {
          repeat: { cron: cronExpression || '0 10 * * *' },
          jobId: 'admission-payment-reminder',
        }
      );

      console.log('[JobQueue] Admission payment reminder job scheduled (daily at 10 AM)');
    } else {
      console.log('[JobQueue] Admission payment reminder scheduling requires Redis');
    }
  }

  /**
   * Start the admission payment reminder checker (fallback for in-memory queue)
   * Runs daily at 10 AM
   */
  startAdmissionPaymentReminderChecker(): void {
    console.log('[JobQueue] Starting admission payment reminder checker (runs daily at 10 AM)');

    // Calculate milliseconds until next 10 AM
    const getNextRunTime = (): number => {
      const now = new Date();
      const next10AM = new Date(now);
      next10AM.setHours(10, 0, 0, 0);

      // If it's past 10 AM, schedule for tomorrow
      if (now.getHours() >= 10) {
        next10AM.setDate(next10AM.getDate() + 1);
      }

      return next10AM.getTime() - now.getTime();
    };

    // Schedule first run
    const scheduleNextRun = () => {
      const delay = getNextRunTime();
      console.log(`[JobQueue] Next payment reminder check in ${Math.round(delay / 1000 / 60)} minutes`);

      setTimeout(() => {
        this.addJob('ADMISSION_PAYMENT_REMINDER', {});
        // Schedule next run for tomorrow
        scheduleNextRun();
      }, delay);
    };

    scheduleNextRun();
  }

  /**
   * Process IndiaMART sync for a single organization
   */
  private async processIndiaMartSync(organizationId?: string): Promise<JobResult> {
    if (!organizationId) {
      return { success: false, processed: 0, failed: 1, errors: ['Organization ID is required'] };
    }

    try {
      const { indiaMartService } = await import('../integrations/indiamart.service');
      const result = await indiaMartService.syncLeads(organizationId);

      return {
        success: result.success,
        processed: result.imported,
        failed: result.errors,
        data: {
          totalFetched: result.totalFetched,
          duplicates: result.duplicates,
        },
      };
    } catch (error) {
      console.error('[JobQueue] IndiaMART sync failed:', error);
      return { success: false, processed: 0, failed: 1, errors: [(error as Error).message] };
    }
  }

  /**
   * Process IndiaMART sync for all active integrations
   */
  private async processIndiaMartSyncAll(): Promise<JobResult> {
    try {
      const { indiaMartService } = await import('../integrations/indiamart.service');
      const integrations = await indiaMartService.getActiveIntegrations();

      let totalProcessed = 0;
      let totalFailed = 0;
      const errors: string[] = [];

      for (const integration of integrations) {
        // Check if sync is needed based on interval
        if (!indiaMartService.needsSync(integration)) {
          continue;
        }

        try {
          const result = await indiaMartService.syncLeads(integration.organizationId);
          totalProcessed += result.imported;
          if (!result.success) {
            totalFailed++;
            errors.push(`Org ${integration.organizationId}: ${result.message}`);
          }
        } catch (error) {
          totalFailed++;
          errors.push(`Org ${integration.organizationId}: ${(error as Error).message}`);
        }
      }

      console.log(`[JobQueue] IndiaMART sync all: processed ${totalProcessed}, failed ${totalFailed}`);

      return {
        success: totalFailed === 0,
        processed: totalProcessed,
        failed: totalFailed,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      console.error('[JobQueue] IndiaMART sync all failed:', error);
      return { success: false, processed: 0, failed: 1, errors: [(error as Error).message] };
    }
  }

  /**
   * Process a quick call reminder (1-click reminder)
   */
  private async processQuickCallReminder(payload: Record<string, any>): Promise<JobResult> {
    const { leadId, userId, organizationId, reminderMessage, reminderType } = payload;

    try {
      // Get lead info
      const lead = await prisma.lead.findFirst({
        where: { id: leadId, organizationId },
        include: {
          assignedTo: true,
        },
      });

      if (!lead) {
        return { success: false, processed: 0, failed: 1, errors: ['Lead not found'] };
      }

      // Create notification for the user
      // This can trigger push notification, browser notification, etc.
      const notification = await prisma.leadActivity.create({
        data: {
          leadId,
          type: 'REMINDER',
          title: `Call Reminder: ${lead.firstName} ${lead.lastName || ''}`,
          description: reminderMessage || `Reminder to call ${lead.phone}`,
          userId,
        },
      });

      // If push notifications are available, send them
      try {
        const deviceTokens = await prisma.deviceToken.findMany({
          where: { userId, isActive: true },
        });

        if (deviceTokens.length > 0) {
          // Import Firebase dynamically
          const admin = await import('firebase-admin').catch(() => null);
          if (admin && admin.apps?.length > 0) {
            const tokens = deviceTokens.map((t) => t.token);
            await admin.messaging().sendEachForMulticast({
              tokens,
              notification: {
                title: 'Call Reminder',
                body: `Time to call ${lead.firstName} ${lead.lastName || ''} - ${lead.phone}`,
              },
              data: {
                type: 'CALL_REMINDER',
                leadId,
                phone: lead.phone || '',
              },
            });
          }
        }
      } catch (notifError) {
        console.warn('[JobQueue] Push notification failed:', notifError);
      }

      console.log(`[JobQueue] Quick call reminder processed for lead ${leadId}`);

      return {
        success: true,
        processed: 1,
        failed: 0,
        data: { notificationId: notification.id },
      };
    } catch (error) {
      console.error('[JobQueue] Quick call reminder failed:', error);
      return { success: false, processed: 0, failed: 1, errors: [(error as Error).message] };
    }
  }

  /**
   * Process performance check for an organization
   */
  private async processPerformanceCheck(organizationId: string): Promise<JobResult> {
    try {
      const { performanceTargetsService } = await import('./performance-targets.service');
      const alerts = await performanceTargetsService.checkAndSendAlerts(organizationId);

      return {
        success: true,
        processed: alerts.length,
        failed: 0,
        data: { alertsGenerated: alerts.length },
      };
    } catch (error) {
      console.error('[JobQueue] Performance check failed:', error);
      return { success: false, processed: 0, failed: 1, errors: [(error as Error).message] };
    }
  }

  /**
   * Process daily summary notifications
   */
  private async processDailySummary(organizationId: string): Promise<JobResult> {
    try {
      const { performanceTargetsService } = await import('./performance-targets.service');
      await performanceTargetsService.sendDailySummary(organizationId);

      return {
        success: true,
        processed: 1,
        failed: 0,
      };
    } catch (error) {
      console.error('[JobQueue] Daily summary failed:', error);
      return { success: false, processed: 0, failed: 1, errors: [(error as Error).message] };
    }
  }

  /**
   * Start periodic IndiaMART sync (every 15 minutes)
   */
  startIndiaMartSyncScheduler() {
    // Run immediately on startup
    this.addJob('INDIAMART_SYNC_ALL', {});

    // Then run every 15 minutes
    setInterval(() => {
      this.addJob('INDIAMART_SYNC_ALL', {});
    }, 15 * 60 * 1000);

    console.log('[JobQueue] IndiaMART sync scheduler started (every 15 minutes)');
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    isRedisAvailable: boolean;
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    inMemoryJobs: number;
  }> {
    const stats = {
      isRedisAvailable: this.isRedisAvailable,
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      inMemoryJobs: this.inMemoryJobs.size,
    };

    if (this.queue && this.isRedisAvailable) {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.queue.getWaitingCount(),
        this.queue.getActiveCount(),
        this.queue.getCompletedCount(),
        this.queue.getFailedCount(),
        this.queue.getDelayedCount(),
      ]);

      stats.waiting = waiting;
      stats.active = active;
      stats.completed = completed;
      stats.failed = failed;
      stats.delayed = delayed;
    }

    return stats;
  }

  /**
   * Clean up old jobs
   */
  async cleanup(olderThanMs: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    const cutoff = Date.now() - olderThanMs;

    // Clean in-memory jobs
    for (const [id, job] of this.inMemoryJobs.entries()) {
      if (job.createdAt.getTime() < cutoff && ['completed', 'failed'].includes(job.status)) {
        this.inMemoryJobs.delete(id);
      }
    }

    // Clean Bull queue
    if (this.queue && this.isRedisAvailable) {
      await this.queue.clean(olderThanMs, 'completed');
      await this.queue.clean(olderThanMs, 'failed');
    }
  }
}

export const jobQueueService = new JobQueueService();
