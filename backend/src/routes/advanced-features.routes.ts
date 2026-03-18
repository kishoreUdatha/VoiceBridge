import { Router, Response } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import { ApiResponse } from '../utils/apiResponse';
import {
  leadScoringService,
  callSchedulingService,
  dncListService,
  autoFollowUpService,
  appointmentService,
  webhookService,
  analyticsService,
} from '../services/advanced-features.service';
import { scoreDecayService } from '../services/score-decay.service';
import { jobQueueService } from '../services/job-queue.service';
import { fileCleanupService } from '../services/file-cleanup.service';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(tenantMiddleware);

// ==================== LEAD SCORING ====================

// Get lead score
router.get(
  '/lead-scores/:leadId',
  validate([param('leadId').isUUID().withMessage('Invalid lead ID')]),
  async (req: TenantRequest, res: Response) => {
    try {
      const score = await leadScoringService.getLeadScore(req.params.leadId);
      return ApiResponse.success(res, score);
    } catch (error) {
      ApiResponse.error(res, (error as Error).message, 500);
    }
  }
);

// Get top leads by score
router.get('/lead-scores/top', async (req: TenantRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const leads = await leadScoringService.getTopLeads(req.organization!.id, limit);
    return ApiResponse.success(res, leads);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Recalculate lead score
router.post(
  '/lead-scores/:leadId/recalculate',
  validate([
    param('leadId').isUUID().withMessage('Invalid lead ID'),
    body('duration').optional().isInt({ min: 0 }).withMessage('Duration must be a positive integer'),
    body('sentiment').optional().isIn(['positive', 'neutral', 'negative']).withMessage('Invalid sentiment value'),
    body('outcome').optional().isIn(['CONVERTED', 'NEEDS_FOLLOWUP', 'NOT_INTERESTED', 'NO_ANSWER']).withMessage('Invalid outcome'),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const { transcript, duration, sentiment, qualification, outcome } = req.body;
      const score = await leadScoringService.calculateScore(req.params.leadId, {
        transcript: transcript || [],
        duration: duration || 0,
        sentiment: sentiment || 'neutral',
        qualification: qualification || {},
        outcome: outcome || 'NEEDS_FOLLOWUP',
      });
      return ApiResponse.success(res, score);
    } catch (error) {
      ApiResponse.error(res, (error as Error).message, 500);
    }
  }
);

// ==================== SCORE DECAY ====================

// Process decay for a single lead
router.post(
  '/score-decay/:leadId/process',
  validate([param('leadId').isUUID().withMessage('Invalid lead ID')]),
  async (req: TenantRequest, res: Response) => {
    try {
      const result = await scoreDecayService.processLeadDecay(req.params.leadId);

      if (!result) {
        return ApiResponse.notFound(res, 'Lead score not found');
      }

      return ApiResponse.success(res, result);
    } catch (error) {
      ApiResponse.error(res, (error as Error).message, 500);
    }
  }
);

// Process decay for all leads in the organization
router.post('/score-decay/process-all', async (req: TenantRequest, res: Response) => {
  try {
    const result = await scoreDecayService.processOrganizationDecay(req.organization!.id);
    return ApiResponse.success(res, result);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Get decay preview for a lead
router.get(
  '/score-decay/:leadId/preview',
  validate([param('leadId').isUUID().withMessage('Invalid lead ID')]),
  async (req: TenantRequest, res: Response) => {
    try {
      const preview = await scoreDecayService.getDecayPreview(req.params.leadId);

      if (!preview) {
        return ApiResponse.notFound(res, 'Lead score not found');
      }

      return ApiResponse.success(res, preview);
    } catch (error) {
      ApiResponse.error(res, (error as Error).message, 500);
    }
  }
);

// Boost score on activity
router.post(
  '/score-decay/:leadId/boost',
  validate([
    param('leadId').isUUID().withMessage('Invalid lead ID'),
    body('boostPercentage').optional().isInt({ min: 1, max: 100 }).withMessage('Boost percentage must be between 1 and 100'),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const { boostPercentage } = req.body;
      await scoreDecayService.boostScoreOnActivity(
        req.params.leadId,
        boostPercentage || 5
      );
      return ApiResponse.success(res, { message: 'Lead score boosted' });
    } catch (error) {
      ApiResponse.error(res, (error as Error).message, 500);
    }
  }
);

// ==================== SCHEDULED CALLS ====================

// Create scheduled call
router.post(
  '/scheduled-calls',
  validate([
    body('agentId').notEmpty().withMessage('Agent ID is required'),
    body('phoneNumber').notEmpty().withMessage('Phone number is required'),
    body('scheduledAt').isISO8601().withMessage('Invalid scheduled time format'),
    body('leadId').optional().isUUID().withMessage('Invalid lead ID'),
    body('callType').optional().isIn(['OUTBOUND', 'CALLBACK', 'FOLLOW_UP']).withMessage('Invalid call type'),
    body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).withMessage('Invalid priority'),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const { agentId, phoneNumber, contactName, scheduledAt, leadId, callType, priority, notes } = req.body;

      const scheduled = await callSchedulingService.scheduleCall({
        organizationId: req.organization!.id,
        agentId,
        phoneNumber,
        contactName,
        scheduledAt: new Date(scheduledAt),
        leadId,
        callType,
        priority,
        notes,
      });

      return ApiResponse.created(res, scheduled);
    } catch (error) {
      ApiResponse.error(res, (error as Error).message, 500);
    }
  }
);

// Schedule callback from a call
router.post(
  '/scheduled-calls/callback/:callId',
  validate([
    param('callId').isUUID().withMessage('Invalid call ID'),
    body('callbackTime').isISO8601().withMessage('Invalid callback time format'),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const { callbackTime } = req.body;

      const scheduled = await callSchedulingService.scheduleCallback(
        req.params.callId,
        new Date(callbackTime)
      );

      return ApiResponse.created(res, scheduled);
    } catch (error) {
      ApiResponse.error(res, (error as Error).message, 500);
    }
  }
);

// Get scheduled calls
router.get('/scheduled-calls', async (req: TenantRequest, res: Response) => {
  try {
    const { status, fromDate, toDate, agentId } = req.query;

    const calls = await callSchedulingService.getScheduledCalls(req.organization!.id, {
      status: status as any,
      fromDate: fromDate ? new Date(fromDate as string) : undefined,
      toDate: toDate ? new Date(toDate as string) : undefined,
      agentId: agentId as string,
    });

    return ApiResponse.success(res, calls);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Reschedule call
router.put(
  '/scheduled-calls/:id/reschedule',
  validate([
    param('id').isUUID().withMessage('Invalid scheduled call ID'),
    body('newTime').isISO8601().withMessage('Invalid time format'),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const { newTime } = req.body;
      const updated = await callSchedulingService.rescheduleCall(req.params.id, new Date(newTime));
      return ApiResponse.success(res, updated);
    } catch (error) {
      ApiResponse.error(res, (error as Error).message, 500);
    }
  }
);

// Cancel scheduled call
router.put(
  '/scheduled-calls/:id/cancel',
  validate([param('id').isUUID().withMessage('Invalid scheduled call ID')]),
  async (req: TenantRequest, res: Response) => {
    try {
      const updated = await callSchedulingService.updateScheduledCallStatus(req.params.id, 'CANCELLED');
      return ApiResponse.success(res, updated);
    } catch (error) {
      ApiResponse.error(res, (error as Error).message, 500);
    }
  }
);

// ==================== DNC LIST ====================

// Add to DNC list
router.post(
  '/dnc-list',
  validate([
    body('phoneNumber').notEmpty().withMessage('Phone number is required'),
    body('reason').isIn(['CUSTOMER_REQUEST', 'LEGAL', 'INTERNAL', 'COMPLAINT', 'OTHER']).withMessage('Valid reason is required'),
    body('expiresAt').optional().isISO8601().withMessage('Invalid expiry date format'),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const { phoneNumber, reason, notes, expiresAt } = req.body;

      const entry = await dncListService.addToDNCList({
        organizationId: req.organization!.id,
        phoneNumber,
        reason,
        notes,
        addedBy: req.user!.id,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      });

      return ApiResponse.created(res, entry);
    } catch (error) {
      ApiResponse.error(res, (error as Error).message, 500);
    }
  }
);

// Import DNC list (bulk)
router.post(
  '/dnc-list/import',
  validate([
    body('phoneNumbers').isArray({ min: 1 }).withMessage('Phone numbers array is required'),
    body('phoneNumbers.*').notEmpty().withMessage('Each phone number must be non-empty'),
    body('reason').isIn(['CUSTOMER_REQUEST', 'LEGAL', 'INTERNAL', 'COMPLAINT', 'OTHER']).withMessage('Valid reason is required'),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const { phoneNumbers, reason } = req.body;

      const result = await dncListService.importDNCList(
        req.organization!.id,
        phoneNumbers,
        reason,
        req.user!.id
      );

      return ApiResponse.success(res, { count: result.count });
    } catch (error) {
      ApiResponse.error(res, (error as Error).message, 500);
    }
  }
);

// Get DNC list
router.get('/dnc-list', async (req: TenantRequest, res: Response) => {
  try {
    const list = await dncListService.getDNCList(req.organization!.id);
    return ApiResponse.success(res, list);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Check if number is on DNC
router.get('/dnc-list/check/:phoneNumber', async (req: TenantRequest, res: Response) => {
  try {
    const isDNC = await dncListService.isOnDNCList(req.organization!.id, req.params.phoneNumber);
    return ApiResponse.success(res, { phoneNumber: req.params.phoneNumber, isDNC });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Remove from DNC list
router.delete('/dnc-list/:phoneNumber', async (req: TenantRequest, res: Response) => {
  try {
    await dncListService.removeFromDNCList(req.organization!.id, req.params.phoneNumber);
    return ApiResponse.success(res, { message: 'Removed from DNC list' });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// ==================== AUTO FOLLOW-UP RULES ====================

// Create follow-up rule
router.post(
  '/follow-up-rules',
  validate([
    body('name').notEmpty().withMessage('Rule name is required'),
    body('triggerEvent').notEmpty().withMessage('Trigger event is required'),
    body('delayMinutes').isInt({ min: 0 }).withMessage('Delay must be a non-negative integer'),
    body('action').notEmpty().withMessage('Action is required'),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const rule = await autoFollowUpService.createRule({
        organizationId: req.organization!.id,
        ...req.body,
      });

      return ApiResponse.created(res, rule);
    } catch (error) {
      ApiResponse.error(res, (error as Error).message, 500);
    }
  }
);

// Get follow-up rules
router.get('/follow-up-rules', async (req: TenantRequest, res: Response) => {
  try {
    const rules = await autoFollowUpService.getFollowUpRules(req.organization!.id);
    return ApiResponse.success(res, rules);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Update follow-up rule
router.put(
  '/follow-up-rules/:id',
  validate([
    param('id').isUUID().withMessage('Invalid rule ID'),
    body('name').optional().notEmpty().withMessage('Rule name cannot be empty'),
    body('delayMinutes').optional().isInt({ min: 0 }).withMessage('Delay must be a non-negative integer'),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const rule = await autoFollowUpService.updateRule(req.params.id, req.body);
      return ApiResponse.success(res, rule);
    } catch (error) {
      ApiResponse.error(res, (error as Error).message, 500);
    }
  }
);

// Delete follow-up rule
router.delete(
  '/follow-up-rules/:id',
  validate([param('id').isUUID().withMessage('Invalid rule ID')]),
  async (req: TenantRequest, res: Response) => {
    try {
      await autoFollowUpService.deleteRule(req.params.id);
      return ApiResponse.success(res, { message: 'Follow-up rule deleted' });
    } catch (error) {
      ApiResponse.error(res, (error as Error).message, 500);
    }
  }
);

// ==================== APPOINTMENTS ====================

// Book appointment
router.post(
  '/appointments',
  validate([
    body('leadId').isUUID().withMessage('Valid lead ID is required'),
    body('scheduledAt').isISO8601().withMessage('Valid scheduled time is required'),
    body('duration').optional().isInt({ min: 5, max: 480 }).withMessage('Duration must be between 5 and 480 minutes'),
    body('type').optional().isIn(['CALL', 'VIDEO', 'IN_PERSON']).withMessage('Invalid appointment type'),
    body('notes').optional().isString(),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const appointment = await appointmentService.bookAppointment({
        organizationId: req.organization!.id,
        ...req.body,
      });

      return ApiResponse.created(res, appointment);
    } catch (error) {
      ApiResponse.error(res, (error as Error).message, 500);
    }
  }
);

// Book appointment from call
router.post(
  '/appointments/from-call/:callId',
  validate([
    param('callId').isUUID().withMessage('Invalid call ID'),
    body('scheduledAt').isISO8601().withMessage('Valid scheduled time is required'),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const appointment = await appointmentService.bookFromCall(req.params.callId, req.body);
      return ApiResponse.created(res, appointment);
    } catch (error) {
      ApiResponse.error(res, (error as Error).message, 500);
    }
  }
);

// Get appointments
router.get('/appointments', async (req: TenantRequest, res: Response) => {
  try {
    const { fromDate, toDate, status } = req.query;

    const appointments = await appointmentService.getAppointments(req.organization!.id, {
      fromDate: fromDate ? new Date(fromDate as string) : undefined,
      toDate: toDate ? new Date(toDate as string) : undefined,
      status: status as string,
    });

    return ApiResponse.success(res, appointments);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Update appointment status
router.put(
  '/appointments/:id/status',
  validate([
    param('id').isUUID().withMessage('Invalid appointment ID'),
    body('status').isIn(['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).withMessage('Invalid status'),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const { status } = req.body;
      const appointment = await appointmentService.updateAppointmentStatus(req.params.id, status);
      return ApiResponse.success(res, appointment);
    } catch (error) {
      ApiResponse.error(res, (error as Error).message, 500);
    }
  }
);

// ==================== WEBHOOKS ====================

// Create webhook
router.post(
  '/webhooks',
  validate([
    body('name').notEmpty().withMessage('Webhook name is required'),
    body('url').isURL().withMessage('Valid URL is required'),
    body('events').isArray({ min: 1 }).withMessage('At least one event is required'),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const webhook = await webhookService.createWebhook({
        organizationId: req.organization!.id,
        ...req.body,
      });

      return ApiResponse.created(res, webhook);
    } catch (error) {
      ApiResponse.error(res, (error as Error).message, 500);
    }
  }
);

// Get webhooks
router.get('/webhooks', async (req: TenantRequest, res: Response) => {
  try {
    const webhooks = await webhookService.getWebhooks(req.organization!.id);
    return ApiResponse.success(res, webhooks);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Delete webhook
router.delete(
  '/webhooks/:id',
  validate([param('id').isUUID().withMessage('Invalid webhook ID')]),
  async (req: TenantRequest, res: Response) => {
    try {
      await webhookService.deleteWebhook(req.params.id, req.organizationId!);
      return ApiResponse.success(res, { message: 'Webhook deleted' });
    } catch (error) {
      ApiResponse.error(res, (error as Error).message, 500);
    }
  }
);

// ==================== ANALYTICS ====================

// Get analytics
router.get(
  '/analytics',
  validate([
    query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365'),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const analytics = await analyticsService.getAnalytics(req.organization!.id, days);
      return ApiResponse.success(res, analytics);
    } catch (error) {
      ApiResponse.error(res, (error as Error).message, 500);
    }
  }
);

// Trigger daily aggregation (for testing)
router.post(
  '/analytics/aggregate',
  validate([
    body('date').optional().isISO8601().withMessage('Invalid date format'),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const date = req.body.date ? new Date(req.body.date) : new Date();
      await analyticsService.aggregateDailyStats(req.organization!.id, date);
      return ApiResponse.success(res, { message: 'Analytics aggregated' });
    } catch (error) {
      ApiResponse.error(res, (error as Error).message, 500);
    }
  }
);

// ==================== JOB QUEUE ====================

// Add a job to the queue
router.post(
  '/jobs',
  validate([
    body('type').notEmpty().withMessage('Job type is required'),
    body('payload').notEmpty().withMessage('Job payload is required'),
    body('delay').optional().isInt({ min: 0 }).withMessage('Delay must be a non-negative integer'),
    body('priority').optional().isIn(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']).withMessage('Invalid priority'),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const { type, payload, delay, priority } = req.body;

      const jobId = await jobQueueService.addJob(type, payload, {
        organizationId: req.organization!.id,
        userId: req.user!.id,
        delay,
        priority,
      });

      return ApiResponse.created(res, { jobId });
    } catch (error) {
      ApiResponse.error(res, (error as Error).message, 500);
    }
  }
);

// Get job status
router.get(
  '/jobs/:jobId',
  validate([param('jobId').notEmpty().withMessage('Job ID is required')]),
  async (req: TenantRequest, res: Response) => {
    try {
      const job = await jobQueueService.getJobStatus(req.params.jobId);

      if (!job) {
        return ApiResponse.notFound(res, 'Job not found');
      }

      return ApiResponse.success(res, job);
    } catch (error) {
      ApiResponse.error(res, (error as Error).message, 500);
    }
  }
);

// Get organization jobs
router.get('/jobs', async (req: TenantRequest, res: Response) => {
  try {
    const jobs = await jobQueueService.getOrganizationJobs(req.organization!.id);
    return ApiResponse.success(res, jobs);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Get queue statistics
router.get('/jobs/queue/stats', async (req: TenantRequest, res: Response) => {
  try {
    const stats = await jobQueueService.getQueueStats();
    return ApiResponse.success(res, stats);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Bulk email job
router.post('/jobs/bulk-email', async (req: TenantRequest, res: Response) => {
  try {
    const { recipients, subject, body, html } = req.body;

    if (!recipients || !Array.isArray(recipients) || !subject || !body) {
      return ApiResponse.error(res, 'Recipients array, subject, and body are required', 400);
    }

    const jobId = await jobQueueService.addJob(
      'BULK_EMAIL',
      { recipients, subject, body, html, userId: req.user!.id },
      { organizationId: req.organization!.id, userId: req.user!.id }
    );

    return ApiResponse.created(res, { jobId, recipientCount: recipients.length });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Bulk SMS job
router.post('/jobs/bulk-sms', async (req: TenantRequest, res: Response) => {
  try {
    const { recipients, message } = req.body;

    if (!recipients || !Array.isArray(recipients) || !message) {
      return ApiResponse.error(res, 'Recipients array and message are required', 400);
    }

    const jobId = await jobQueueService.addJob(
      'BULK_SMS',
      { recipients, message, userId: req.user!.id },
      { organizationId: req.organization!.id, userId: req.user!.id }
    );

    return ApiResponse.created(res, { jobId, recipientCount: recipients.length });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// CSV import job
router.post('/jobs/csv-import', async (req: TenantRequest, res: Response) => {
  try {
    const { records, mappings } = req.body;

    if (!records || !Array.isArray(records) || !mappings) {
      return ApiResponse.error(res, 'Records array and field mappings are required', 400);
    }

    const jobId = await jobQueueService.addJob(
      'CSV_IMPORT',
      { records, mappings, userId: req.user!.id },
      { organizationId: req.organization!.id, userId: req.user!.id }
    );

    return ApiResponse.created(res, { jobId, recordCount: records.length });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Report generation job
router.post('/jobs/report', async (req: TenantRequest, res: Response) => {
  try {
    const { reportType, dateFrom, dateTo, filters } = req.body;

    if (!reportType || !dateFrom || !dateTo) {
      return ApiResponse.error(res, 'Report type, dateFrom, and dateTo are required', 400);
    }

    const jobId = await jobQueueService.addJob(
      'REPORT_GENERATION',
      { reportType, dateFrom, dateTo, filters },
      { organizationId: req.organization!.id, userId: req.user!.id }
    );

    return ApiResponse.created(res, { jobId });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// ==================== FILE CLEANUP ====================

// Get cleanup preview
router.get('/cleanup/preview', async (req: TenantRequest, res: Response) => {
  try {
    const preview = await fileCleanupService.getCleanupPreview();
    return ApiResponse.success(res, preview);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Get storage stats
router.get('/cleanup/storage-stats', async (req: TenantRequest, res: Response) => {
  try {
    const stats = await fileCleanupService.getLocalStorageStats();
    return ApiResponse.success(res, stats);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Run full cleanup
router.post('/cleanup/run', async (req: TenantRequest, res: Response) => {
  try {
    const result = await fileCleanupService.runFullCleanup();
    return ApiResponse.success(res, result);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Cleanup temp files only
router.post('/cleanup/temp-files', async (req: TenantRequest, res: Response) => {
  try {
    const result = await fileCleanupService.cleanupTempFiles();
    return ApiResponse.success(res, result);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Cleanup orphaned attachments
router.post('/cleanup/orphaned-files', async (req: TenantRequest, res: Response) => {
  try {
    const result = await fileCleanupService.cleanupOrphanedAttachments();
    return ApiResponse.success(res, result);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Cleanup old tracking events
router.post('/cleanup/tracking-events', async (req: TenantRequest, res: Response) => {
  try {
    const result = await fileCleanupService.cleanupOldEmailTrackingEvents();
    return ApiResponse.success(res, result);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Cleanup old webhook logs
router.post('/cleanup/webhook-logs', async (req: TenantRequest, res: Response) => {
  try {
    const result = await fileCleanupService.cleanupOldWebhookLogs();
    return ApiResponse.success(res, result);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Schedule cleanup as job
router.post('/cleanup/schedule', async (req: TenantRequest, res: Response) => {
  try {
    const jobId = await jobQueueService.addJob(
      'CLEANUP_FILES',
      {},
      { organizationId: req.organization!.id, userId: req.user!.id }
    );
    return ApiResponse.created(res, { jobId });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

export default router;
