import { Router, Response } from 'express';
import { body, param, query } from 'express-validator';
import { callbackService } from '../services/callback.service';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import { ApiResponse } from '../utils/apiResponse';
import { CallbackStatus, CallbackSource } from '@prisma/client';

// Validation rules
const createCallbackValidation = [
  body('phoneNumber').trim().notEmpty().withMessage('Phone number is required')
    .matches(/^[\d+\-() ]{7,20}$/).withMessage('Invalid phone number format'),
  body('contactName').optional().trim().isLength({ max: 100 }).withMessage('Contact name must be at most 100 characters'),
  body('leadId').optional().isUUID().withMessage('Invalid lead ID'),
  body('source').optional().isIn(Object.values(CallbackSource)).withMessage('Invalid callback source'),
  body('scheduledAt').optional().isISO8601().withMessage('Invalid scheduled date'),
  body('notes').optional().trim().isLength({ max: 1000 }).withMessage('Notes must be at most 1000 characters'),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).withMessage('Invalid priority'),
];

const updateStatusValidation = [
  param('id').isUUID().withMessage('Invalid callback ID'),
  body('status').isIn(Object.values(CallbackStatus)).withMessage('Invalid status'),
  body('notes').optional().trim().isLength({ max: 1000 }).withMessage('Notes must be at most 1000 characters'),
];

const rescheduleValidation = [
  param('id').isUUID().withMessage('Invalid callback ID'),
  body('scheduledAt').isISO8601().withMessage('Invalid scheduled date'),
  body('reason').optional().trim().isLength({ max: 500 }).withMessage('Reason must be at most 500 characters'),
];

const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(Object.values(CallbackStatus)).withMessage('Invalid status'),
  query('search').optional().trim().isLength({ max: 200 }).withMessage('Search must be at most 200 characters'),
];

const router = Router();

router.use(authenticate);
router.use(tenantMiddleware);

// Get all callbacks
router.get('/', validate(paginationValidation), async (req: TenantRequest, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      source,
      assignedAgentId,
      dateFrom,
      dateTo,
      search,
    } = req.query;

    const result = await callbackService.getCallbacks(
      {
        organizationId: req.organizationId!,
        status: status as CallbackStatus,
        source: source as CallbackSource,
        assignedAgentId: assignedAgentId as string,
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
        search: search as string,
      },
      Number(page),
      Number(limit)
    );

    return ApiResponse.paginated(res, 'Callbacks retrieved', result.callbacks, result.page, result.limit, result.total);
  } catch (error: any) {
    return ApiResponse.error(res, error.message);
  }
});

// Get pending callbacks (for agents)
router.get('/pending', async (req: TenantRequest, res: Response) => {
  try {
    const { assignedAgentId } = req.query;

    const callbacks = await callbackService.getPendingCallbacks(
      req.organizationId!,
      assignedAgentId as string
    );

    return ApiResponse.success(res, callbacks);
  } catch (error: any) {
    return ApiResponse.error(res, error.message);
  }
});

// Get single callback
router.get('/:id', validate([
  param('id').isUUID().withMessage('Invalid callback ID'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const callback = await callbackService.getCallbackById(
      req.params.id,
      req.organizationId!
    );
    return ApiResponse.success(res, callback);
  } catch (error: any) {
    return ApiResponse.error(res, error.message, error.statusCode);
  }
});

// Schedule new callback
router.post('/', validate(createCallbackValidation), async (req: TenantRequest, res: Response) => {
  try {
    const {
      phoneNumber,
      contactName,
      leadId,
      source,
      queueId,
      voicemailId,
      ivrFlowId,
      inboundCallId,
      scheduledAt,
      preferredTimeStart,
      preferredTimeEnd,
      assignedAgentId,
      priority,
      notes,
    } = req.body;

    const callback = await callbackService.scheduleCallback({
      organizationId: req.organizationId!,
      phoneNumber,
      contactName,
      leadId,
      source: source || CallbackSource.MANUAL,
      queueId,
      voicemailId,
      ivrFlowId,
      inboundCallId,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      preferredTimeStart: preferredTimeStart ? new Date(preferredTimeStart) : undefined,
      preferredTimeEnd: preferredTimeEnd ? new Date(preferredTimeEnd) : undefined,
      assignedAgentId,
      priority,
      notes,
    });

    return ApiResponse.created(res, callback);
  } catch (error: any) {
    return ApiResponse.error(res, error.message);
  }
});

// Assign callback to agent
router.put('/:id/assign', validate([
  param('id').isUUID().withMessage('Invalid callback ID'),
  body('agentUserId').isUUID().withMessage('Valid agent user ID is required'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const { agentUserId } = req.body;

    const callback = await callbackService.assignCallback(
      req.params.id,
      req.organizationId!,
      agentUserId
    );

    return ApiResponse.success(res, callback);
  } catch (error: any) {
    return ApiResponse.error(res, error.message, error.statusCode);
  }
});

// Update callback status
router.put('/:id/status', validate(updateStatusValidation), async (req: TenantRequest, res: Response) => {
  try {
    const { status, outcomeCallId, outcome, notes } = req.body;

    if (!Object.values(CallbackStatus).includes(status)) {
      return ApiResponse.error(res, 'Invalid callback status', 400);
    }

    const callback = await callbackService.updateStatus(
      req.params.id,
      req.organizationId!,
      status,
      {
        outcomeCallId,
        completedById: req.user!.id,
        outcome,
        notes,
      }
    );

    return ApiResponse.success(res, callback);
  } catch (error: any) {
    return ApiResponse.error(res, error.message, error.statusCode);
  }
});

// Reschedule callback
router.put('/:id/reschedule', validate(rescheduleValidation), async (req: TenantRequest, res: Response) => {
  try {
    const { scheduledAt, notes } = req.body;

    if (!scheduledAt) {
      return ApiResponse.error(res, 'scheduledAt is required', 400);
    }

    const callback = await callbackService.reschedule(
      req.params.id,
      req.organizationId!,
      new Date(scheduledAt),
      notes
    );

    return ApiResponse.success(res, callback);
  } catch (error: any) {
    return ApiResponse.error(res, error.message, error.statusCode);
  }
});

// Cancel callback
router.put('/:id/cancel', validate([
  param('id').isUUID().withMessage('Invalid callback ID'),
  body('reason').optional().trim().isLength({ max: 500 }).withMessage('Reason too long'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const { reason } = req.body;

    const callback = await callbackService.cancel(
      req.params.id,
      req.organizationId!,
      reason
    );

    return ApiResponse.success(res, callback);
  } catch (error: any) {
    return ApiResponse.error(res, error.message, error.statusCode);
  }
});

// Execute callback (initiate the call)
router.post('/:id/execute', validate([
  param('id').isUUID().withMessage('Invalid callback ID'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const result = await callbackService.executeCallback(
      req.params.id,
      req.organizationId!
    );

    return ApiResponse.success(res, result);
  } catch (error: any) {
    return ApiResponse.error(res, error.message, error.statusCode);
  }
});

// Get callback stats
router.get('/stats/overview', async (req: TenantRequest, res: Response) => {
  try {
    const { dateFrom, dateTo } = req.query;

    const stats = await callbackService.getStats(
      req.organizationId!,
      dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo ? new Date(dateTo as string) : undefined
    );

    return ApiResponse.success(res, stats);
  } catch (error: any) {
    return ApiResponse.error(res, error.message);
  }
});

// Get callbacks by source
router.get('/stats/by-source', async (req: TenantRequest, res: Response) => {
  try {
    const stats = await callbackService.getBySource(req.organizationId!);
    return ApiResponse.success(res, stats);
  } catch (error: any) {
    return ApiResponse.error(res, error.message);
  }
});

export default router;
