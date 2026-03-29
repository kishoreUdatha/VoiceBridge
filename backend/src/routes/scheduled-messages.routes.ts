import { Router } from 'express';
import { scheduledMessageService } from '../services/scheduled-message.service';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware } from '../middlewares/tenant';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errors';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticate);
router.use(tenantMiddleware);

/**
 * @api {get} /scheduled-messages List Scheduled Messages
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const {
      type,
      status,
      upcoming,
      page = '1',
      limit = '20',
    } = req.query;

    const result = await scheduledMessageService.getScheduledMessages(organizationId, {
      type: type as any,
      status: status as any,
      upcoming: upcoming === 'true',
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });

    res.json({
      success: true,
      ...result,
    });
  })
);

/**
 * @api {get} /scheduled-messages/stats Get Stats
 */
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const stats = await scheduledMessageService.getStats(organizationId);

    res.json({
      success: true,
      data: stats,
    });
  })
);

/**
 * @api {post} /scheduled-messages Create Scheduled Message
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { organizationId, id: userId } = req.user!;
    const {
      type,
      recipients,
      subject,
      content,
      htmlContent,
      templateId,
      variables,
      scheduledAt,
      timezone,
      isRecurring,
      recurringRule,
      recurringEndAt,
      name,
      campaignId,
    } = req.body;

    if (!type || !['SMS', 'EMAIL', 'WHATSAPP'].includes(type)) {
      throw new AppError('Valid type is required (SMS, EMAIL, WHATSAPP)', 400);
    }

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      throw new AppError('Recipients array is required', 400);
    }

    if (!scheduledAt) {
      throw new AppError('Scheduled time is required', 400);
    }

    const message = await scheduledMessageService.createScheduledMessage({
      organizationId,
      type,
      recipients,
      subject,
      content,
      htmlContent,
      templateId,
      variables,
      scheduledAt: new Date(scheduledAt),
      timezone,
      isRecurring,
      recurringRule,
      recurringEndAt: recurringEndAt ? new Date(recurringEndAt) : undefined,
      name,
      createdById: userId,
      campaignId,
    });

    res.status(201).json({
      success: true,
      message: 'Message scheduled successfully',
      data: message,
    });
  })
);

/**
 * @api {get} /scheduled-messages/:id Get Scheduled Message
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { id } = req.params;

    const message = await scheduledMessageService.getScheduledMessageById(id, organizationId);

    res.json({
      success: true,
      data: message,
    });
  })
);

/**
 * @api {put} /scheduled-messages/:id Update Scheduled Message
 */
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { id } = req.params;
    const {
      recipients,
      subject,
      content,
      htmlContent,
      templateId,
      variables,
      scheduledAt,
      timezone,
      isRecurring,
      recurringRule,
      recurringEndAt,
      name,
    } = req.body;

    const message = await scheduledMessageService.updateScheduledMessage(id, organizationId, {
      recipients,
      subject,
      content,
      htmlContent,
      templateId,
      variables,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      timezone,
      isRecurring,
      recurringRule,
      recurringEndAt: recurringEndAt ? new Date(recurringEndAt) : undefined,
      name,
    });

    res.json({
      success: true,
      message: 'Scheduled message updated',
      data: message,
    });
  })
);

/**
 * @api {post} /scheduled-messages/:id/cancel Cancel Scheduled Message
 */
router.post(
  '/:id/cancel',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { id } = req.params;

    const message = await scheduledMessageService.cancelScheduledMessage(id, organizationId);

    res.json({
      success: true,
      message: 'Scheduled message cancelled',
      data: message,
    });
  })
);

/**
 * @api {post} /scheduled-messages/:id/pause Pause Scheduled Message
 */
router.post(
  '/:id/pause',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { id } = req.params;

    const message = await scheduledMessageService.pauseScheduledMessage(id, organizationId);

    res.json({
      success: true,
      message: 'Scheduled message paused',
      data: message,
    });
  })
);

/**
 * @api {post} /scheduled-messages/:id/resume Resume Scheduled Message
 */
router.post(
  '/:id/resume',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { id } = req.params;

    const message = await scheduledMessageService.resumeScheduledMessage(id, organizationId);

    res.json({
      success: true,
      message: 'Scheduled message resumed',
      data: message,
    });
  })
);

/**
 * @api {delete} /scheduled-messages/:id Delete Scheduled Message
 */
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { id } = req.params;

    await scheduledMessageService.deleteScheduledMessage(id, organizationId);

    res.json({
      success: true,
      message: 'Scheduled message deleted',
    });
  })
);

/**
 * @api {post} /scheduled-messages/process Process Due Messages (Internal/Cron)
 */
router.post(
  '/process',
  asyncHandler(async (req, res) => {
    // This endpoint should be protected or called by a cron job
    const result = await scheduledMessageService.processDueMessages();

    res.json({
      success: true,
      message: `Processed ${result.processed} messages`,
      data: result,
    });
  })
);

export default router;
