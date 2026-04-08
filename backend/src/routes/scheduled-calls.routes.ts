/**
 * Scheduled Calls Routes
 *
 * Handles scheduled calls, callbacks, and quick reminders.
 */

import { Router, Response } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import { ApiResponse } from '../utils/apiResponse';
import { callSchedulingService, QuickReminderMinutes } from '../services/call-scheduling.service';
import { ScheduledCallStatus } from '@prisma/client';

const router = Router();

router.use(authenticate);
router.use(tenantMiddleware);

// ==================== QUICK REMINDERS ====================

/**
 * Create a quick call reminder (1-click)
 * POST /api/scheduled-calls/quick-reminder
 */
router.post('/quick-reminder', validate([
  body('leadId').isUUID().withMessage('Valid lead ID is required'),
  body('reminderMinutes')
    .isInt()
    .isIn([15, 30, 60, 120, 1440])
    .withMessage('Reminder must be 15, 30, 60, 120, or 1440 minutes'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const { leadId, reminderMinutes } = req.body;

    const reminder = await callSchedulingService.scheduleQuickReminder({
      organizationId: req.organization!.id,
      userId: req.user!.id,
      leadId,
      reminderMinutes: reminderMinutes as QuickReminderMinutes,
    });

    ApiResponse.success(res, 'Reminder scheduled successfully', reminder, 201);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 400);
  }
});

/**
 * Get user's reminders
 * GET /api/scheduled-calls/reminders
 */
router.get('/reminders', async (req: TenantRequest, res: Response) => {
  try {
    const { status, includeExpired } = req.query;

    const reminders = await callSchedulingService.getUserReminders(
      req.organization!.id,
      req.user!.id,
      {
        status: status as ScheduledCallStatus | undefined,
        includeExpired: includeExpired === 'true',
      }
    );

    ApiResponse.success(res, 'Reminders retrieved', reminders);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// ==================== SCHEDULED CALLS ====================

/**
 * Create a scheduled call
 * POST /api/scheduled-calls
 */
router.post('/', validate([
  body('agentId').isUUID().withMessage('Valid agent ID is required'),
  body('phoneNumber').trim().notEmpty().withMessage('Phone number is required'),
  body('scheduledAt').isISO8601().withMessage('Valid scheduled time is required'),
  body('leadId').optional().isUUID().withMessage('Invalid lead ID'),
  body('contactName').optional().trim().isLength({ max: 200 }),
  body('callType').optional().isIn(['SCHEDULED', 'CALLBACK', 'FOLLOWUP', 'REMINDER']),
  body('priority').optional().isInt({ min: 1, max: 10 }),
  body('notes').optional().trim().isLength({ max: 1000 }),
]), async (req: TenantRequest, res: Response) => {
  try {
    const {
      agentId,
      phoneNumber,
      scheduledAt,
      leadId,
      contactName,
      callType,
      priority,
      notes,
    } = req.body;

    const scheduledCall = await callSchedulingService.scheduleCall({
      organizationId: req.organization!.id,
      agentId,
      phoneNumber,
      scheduledAt: new Date(scheduledAt),
      leadId,
      contactName,
      callType,
      priority,
      notes,
    });

    ApiResponse.success(res, 'Call scheduled successfully', scheduledCall, 201);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 400);
  }
});

/**
 * Get scheduled calls
 * GET /api/scheduled-calls
 */
router.get('/', validate([
  query('status').optional().isIn(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED']),
  query('fromDate').optional().isISO8601(),
  query('toDate').optional().isISO8601(),
  query('agentId').optional().isUUID(),
]), async (req: TenantRequest, res: Response) => {
  try {
    const { status, fromDate, toDate, agentId } = req.query;

    const scheduledCalls = await callSchedulingService.getScheduledCalls(
      req.organization!.id,
      {
        status: status as ScheduledCallStatus | undefined,
        fromDate: fromDate ? new Date(fromDate as string) : undefined,
        toDate: toDate ? new Date(toDate as string) : undefined,
        agentId: agentId as string | undefined,
      }
    );

    ApiResponse.success(res, 'Scheduled calls retrieved', scheduledCalls);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

/**
 * Get a single scheduled call
 * GET /api/scheduled-calls/:id
 */
router.get('/:id', validate([
  param('id').isUUID().withMessage('Invalid scheduled call ID'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const scheduledCall = await callSchedulingService.getScheduledCallById(req.params.id);

    if (!scheduledCall) {
      return ApiResponse.error(res, 'Scheduled call not found', 404);
    }

    // Verify organization access
    if (scheduledCall.organizationId !== req.organization!.id) {
      return ApiResponse.error(res, 'Scheduled call not found', 404);
    }

    ApiResponse.success(res, 'Scheduled call retrieved', scheduledCall);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

/**
 * Reschedule a call
 * PUT /api/scheduled-calls/:id/reschedule
 */
router.put('/:id/reschedule', validate([
  param('id').isUUID().withMessage('Invalid scheduled call ID'),
  body('scheduledAt').isISO8601().withMessage('Valid scheduled time is required'),
]), async (req: TenantRequest, res: Response) => {
  try {
    // Verify ownership
    const existing = await callSchedulingService.getScheduledCallById(req.params.id);
    if (!existing || existing.organizationId !== req.organization!.id) {
      return ApiResponse.error(res, 'Scheduled call not found', 404);
    }

    const scheduledCall = await callSchedulingService.rescheduleCall(
      req.params.id,
      new Date(req.body.scheduledAt)
    );

    ApiResponse.success(res, 'Call rescheduled successfully', scheduledCall);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 400);
  }
});

/**
 * Cancel a scheduled call
 * DELETE /api/scheduled-calls/:id
 */
router.delete('/:id', validate([
  param('id').isUUID().withMessage('Invalid scheduled call ID'),
]), async (req: TenantRequest, res: Response) => {
  try {
    // Verify ownership
    const existing = await callSchedulingService.getScheduledCallById(req.params.id);
    if (!existing || existing.organizationId !== req.organization!.id) {
      return ApiResponse.error(res, 'Scheduled call not found', 404);
    }

    const { reason } = req.body;
    const scheduledCall = await callSchedulingService.cancelScheduledCall(
      req.params.id,
      reason
    );

    ApiResponse.success(res, 'Scheduled call cancelled', scheduledCall);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 400);
  }
});

/**
 * Schedule a callback from an existing call
 * POST /api/scheduled-calls/callback
 */
router.post('/callback', validate([
  body('callId').isUUID().withMessage('Valid call ID is required'),
  body('callbackTime').isISO8601().withMessage('Valid callback time is required'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const { callId, callbackTime } = req.body;

    const scheduledCall = await callSchedulingService.scheduleCallback(
      callId,
      new Date(callbackTime)
    );

    ApiResponse.success(res, 'Callback scheduled successfully', scheduledCall, 201);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 400);
  }
});

export default router;
