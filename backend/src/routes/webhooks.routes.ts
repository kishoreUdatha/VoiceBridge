import { Router } from 'express';
import { webhookService, WEBHOOK_EVENTS } from '../services/webhook.service';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware } from '../middlewares/tenant';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errors';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticate);
router.use(tenantMiddleware);

/**
 * @api {get} /webhooks List Webhooks
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const webhooks = await webhookService.getWebhooks(organizationId);

    res.json({
      success: true,
      data: webhooks,
    });
  })
);

/**
 * @api {get} /webhooks/events Get Available Event Types
 */
router.get(
  '/events',
  asyncHandler(async (req, res) => {
    const events = webhookService.getEventTypes();

    // Group by category
    const grouped = events.reduce((acc, event) => {
      if (!acc[event.category]) {
        acc[event.category] = [];
      }
      acc[event.category].push(event);
      return acc;
    }, {} as Record<string, typeof events>);

    res.json({
      success: true,
      data: {
        events,
        grouped,
      },
    });
  })
);

/**
 * @api {post} /webhooks Create Webhook
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { name, url, events } = req.body;

    if (!name) {
      throw new AppError('Webhook name is required', 400);
    }

    if (!url) {
      throw new AppError('Webhook URL is required', 400);
    }

    if (!events || !Array.isArray(events) || events.length === 0) {
      throw new AppError('At least one event is required', 400);
    }

    // Validate events
    const validEvents = Object.values(WEBHOOK_EVENTS);
    const invalidEvents = events.filter(e => e !== '*' && !validEvents.includes(e));
    if (invalidEvents.length > 0) {
      throw new AppError(`Invalid events: ${invalidEvents.join(', ')}`, 400);
    }

    const webhook = await webhookService.createWebhook({
      organizationId,
      name,
      url,
      events,
    });

    res.status(201).json({
      success: true,
      message: 'Webhook created. Save the secret - it will not be shown again.',
      data: webhook,
    });
  })
);

/**
 * @api {get} /webhooks/:id Get Webhook
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { id } = req.params;

    const webhook = await webhookService.getWebhookById(id, organizationId);

    res.json({
      success: true,
      data: webhook,
    });
  })
);

/**
 * @api {put} /webhooks/:id Update Webhook
 */
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { id } = req.params;
    const { name, url, events, isActive } = req.body;

    // Validate events if provided
    if (events) {
      const validEvents = Object.values(WEBHOOK_EVENTS);
      const invalidEvents = events.filter((e: string) => e !== '*' && !validEvents.includes(e as any));
      if (invalidEvents.length > 0) {
        throw new AppError(`Invalid events: ${invalidEvents.join(', ')}`, 400);
      }
    }

    const webhook = await webhookService.updateWebhook(id, organizationId, {
      name,
      url,
      events,
      isActive,
    });

    res.json({
      success: true,
      message: 'Webhook updated',
      data: webhook,
    });
  })
);

/**
 * @api {delete} /webhooks/:id Delete Webhook
 */
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { id } = req.params;

    await webhookService.deleteWebhook(id, organizationId);

    res.json({
      success: true,
      message: 'Webhook deleted',
    });
  })
);

/**
 * @api {post} /webhooks/:id/regenerate-secret Regenerate Webhook Secret
 */
router.post(
  '/:id/regenerate-secret',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { id } = req.params;

    const result = await webhookService.regenerateSecret(id, organizationId);

    res.json({
      success: true,
      message: 'Secret regenerated. Save the new secret - it will not be shown again.',
      data: result,
    });
  })
);

/**
 * @api {post} /webhooks/:id/test Test Webhook
 */
router.post(
  '/:id/test',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { id } = req.params;

    const result = await webhookService.testWebhook(id, organizationId);

    res.json({
      success: result.success,
      message: result.success ? 'Test webhook delivered successfully' : 'Test webhook failed',
      data: result,
    });
  })
);

/**
 * @api {get} /webhooks/:id/logs Get Webhook Delivery Logs
 */
router.get(
  '/:id/logs',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;

    const result = await webhookService.getDeliveryLogs(id, organizationId, {
      page,
      limit,
      status,
    });

    res.json({
      success: true,
      ...result,
    });
  })
);

/**
 * @api {get} /webhooks/logs/:logId Get Delivery Log Detail
 */
router.get(
  '/logs/:logId/detail',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { logId } = req.params;

    const log = await webhookService.getDeliveryLogDetail(logId, organizationId);

    res.json({
      success: true,
      data: log,
    });
  })
);

/**
 * @api {post} /webhooks/logs/:logId/retry Retry Failed Delivery
 */
router.post(
  '/logs/:logId/retry',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { logId } = req.params;

    const result = await webhookService.retryDelivery(logId, organizationId);

    res.json({
      success: true,
      message: result.message,
    });
  })
);

export default router;
