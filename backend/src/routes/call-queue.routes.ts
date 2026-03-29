import { Router, Response } from 'express';
import { body, param, query } from 'express-validator';
import { callQueueService } from '../services/call-queue.service';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import { ApiResponse } from '../utils/apiResponse';
import { AgentStatus, QueueRoutingStrategy } from '@prisma/client';

// Validation rules
const createQueueValidation = [
  body('name').trim().notEmpty().withMessage('Queue name is required')
    .isLength({ max: 100 }).withMessage('Queue name must be at most 100 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be at most 500 characters'),
  body('routingStrategy').optional().isIn(Object.values(QueueRoutingStrategy)).withMessage('Invalid routing strategy'),
  body('maxWaitTime').optional().isInt({ min: 0 }).withMessage('Max wait time must be a positive integer'),
  body('maxQueueSize').optional().isInt({ min: 1 }).withMessage('Max queue size must be a positive integer'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];

const updateQueueValidation = [
  param('id').isUUID().withMessage('Invalid queue ID'),
  body('name').optional().trim().notEmpty().withMessage('Queue name cannot be empty')
    .isLength({ max: 100 }).withMessage('Queue name must be at most 100 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be at most 500 characters'),
  body('routingStrategy').optional().isIn(Object.values(QueueRoutingStrategy)).withMessage('Invalid routing strategy'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];

const uuidParamValidation = [
  param('id').isUUID().withMessage('Invalid ID'),
];

const addMemberValidation = [
  param('id').isUUID().withMessage('Invalid queue ID'),
  body('userId').isUUID().withMessage('Valid user ID is required'),
  body('priority').optional().isInt({ min: 1, max: 100 }).withMessage('Priority must be between 1 and 100'),
  body('maxConcurrentCalls').optional().isInt({ min: 1, max: 10 }).withMessage('Max concurrent calls must be between 1 and 10'),
  body('wrapUpTime').optional().isInt({ min: 0 }).withMessage('Wrap up time must be a positive integer'),
  body('skills').optional().isArray().withMessage('Skills must be an array'),
];

const updateStatusValidation = [
  param('id').isUUID().withMessage('Invalid queue ID'),
  param('userId').isUUID().withMessage('Invalid user ID'),
  body('status').isIn(Object.values(AgentStatus)).withMessage('Invalid agent status'),
];

const addEntryValidation = [
  param('id').isUUID().withMessage('Invalid queue ID'),
  body('callerNumber').trim().notEmpty().withMessage('Caller number is required')
    .matches(/^[\d+\-() ]{7,20}$/).withMessage('Invalid phone number format'),
  body('callerId').optional().trim().isLength({ max: 100 }).withMessage('Caller ID must be at most 100 characters'),
  body('leadId').optional().isUUID().withMessage('Invalid lead ID'),
  body('inboundCallId').optional().isUUID().withMessage('Invalid inbound call ID'),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).withMessage('Invalid priority'),
];

const updateEntryStatusValidation = [
  param('entryId').isUUID().withMessage('Invalid entry ID'),
  body('status').notEmpty().withMessage('Status is required'),
  body('assignedAgentId').optional().isUUID().withMessage('Invalid agent ID'),
];

const transferValidation = [
  param('entryId').isUUID().withMessage('Invalid entry ID'),
  body('toAgentUserId').optional().isUUID().withMessage('Invalid agent user ID'),
  body('toNumber').optional().matches(/^[\d+\-() ]{7,20}$/).withMessage('Invalid phone number format'),
];

const scheduleValidation = [
  param('id').isUUID().withMessage('Invalid queue ID'),
  body('dayOfWeek').isInt({ min: 0, max: 6 }).withMessage('Day of week must be between 0 and 6'),
  body('startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid start time format (HH:MM)'),
  body('endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid end time format (HH:MM)'),
  body('timezone').optional().isString().withMessage('Timezone must be a string'),
];

const router = Router();

router.use(authenticate);
router.use(tenantMiddleware);

// ==================== Queue Management ====================

// Get all queues
router.get('/', async (req: TenantRequest, res: Response) => {
  try {
    const { isActive } = req.query;
    const queues = await callQueueService.getQueues(
      req.organizationId!,
      isActive === 'true' ? true : isActive === 'false' ? false : undefined
    );
    return ApiResponse.success(res, queues);
  } catch (error: any) {
    return ApiResponse.error(res, error.message);
  }
});

// Get single queue
router.get('/:id', validate(uuidParamValidation), async (req: TenantRequest, res: Response) => {
  try {
    const queue = await callQueueService.getQueueById(req.params.id, req.organizationId!);
    return ApiResponse.success(res, queue);
  } catch (error: any) {
    return ApiResponse.error(res, error.message, error.statusCode);
  }
});

// Create queue
router.post('/', validate(createQueueValidation), async (req: TenantRequest, res: Response) => {
  try {
    const queue = await callQueueService.createQueue({
      organizationId: req.organizationId!,
      ...req.body,
    });
    return ApiResponse.created(res, queue);
  } catch (error: any) {
    return ApiResponse.error(res, error.message);
  }
});

// Update queue
router.put('/:id', validate(updateQueueValidation), async (req: TenantRequest, res: Response) => {
  try {
    const queue = await callQueueService.updateQueue(
      req.params.id,
      req.organizationId!,
      req.body
    );
    return ApiResponse.success(res, queue);
  } catch (error: any) {
    return ApiResponse.error(res, error.message, error.statusCode);
  }
});

// Delete queue
router.delete('/:id', validate(uuidParamValidation), async (req: TenantRequest, res: Response) => {
  try {
    await callQueueService.deleteQueue(req.params.id, req.organizationId!);
    return ApiResponse.success(res, { message: 'Queue deleted successfully' });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, error.statusCode);
  }
});

// Get queue stats (real-time)
router.get('/:id/stats', validate(uuidParamValidation), async (req: TenantRequest, res: Response) => {
  try {
    const stats = await callQueueService.getQueueStats(req.params.id);
    return ApiResponse.success(res, stats);
  } catch (error: any) {
    return ApiResponse.error(res, error.message, error.statusCode);
  }
});

// ==================== Queue Members ====================

// Add member to queue
router.post('/:id/members', validate(addMemberValidation), async (req: TenantRequest, res: Response) => {
  try {
    const { userId, priority, maxConcurrentCalls, wrapUpTime, skills } = req.body;

    const member = await callQueueService.addMember({
      queueId: req.params.id,
      userId,
      priority,
      maxConcurrentCalls,
      wrapUpTime,
      skills,
    });

    return ApiResponse.created(res, member);
  } catch (error: any) {
    return ApiResponse.error(res, error.message);
  }
});

// Remove member from queue
router.delete('/:id/members/:userId', validate([
  param('id').isUUID().withMessage('Invalid queue ID'),
  param('userId').isUUID().withMessage('Invalid user ID'),
]), async (req: TenantRequest, res: Response) => {
  try {
    await callQueueService.removeMember(req.params.id, req.params.userId);
    return ApiResponse.success(res, { message: 'Member removed from queue' });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, error.statusCode);
  }
});

// Update agent status
router.put('/:id/members/:userId/status', validate(updateStatusValidation), async (req: TenantRequest, res: Response) => {
  try {
    const { status } = req.body;

    if (!Object.values(AgentStatus).includes(status)) {
      return ApiResponse.error(res, 'Invalid agent status', 400);
    }

    const member = await callQueueService.updateAgentStatus(
      req.params.id,
      req.params.userId,
      status
    );

    return ApiResponse.success(res, member);
  } catch (error: any) {
    return ApiResponse.error(res, error.message, error.statusCode);
  }
});

// Get agent's queues
router.get('/agent/:userId/queues', validate([
  param('userId').isUUID().withMessage('Invalid user ID'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const queues = await callQueueService.getAgentQueues(req.params.userId);
    return ApiResponse.success(res, queues);
  } catch (error: any) {
    return ApiResponse.error(res, error.message);
  }
});

// ==================== Queue Entries ====================

// Add caller to queue (typically called by IVR webhook)
router.post('/:id/entries', validate(addEntryValidation), async (req: TenantRequest, res: Response) => {
  try {
    const { callerNumber, callerId, leadId, inboundCallId, priority, ivrData } = req.body;

    const result = await callQueueService.addToQueue({
      queueId: req.params.id,
      callerNumber,
      callerId,
      leadId,
      inboundCallId,
      priority,
      ivrData,
    });

    return ApiResponse.created(res, result);
  } catch (error: any) {
    return ApiResponse.error(res, error.message);
  }
});

// Update queue entry status
router.put('/entries/:entryId/status', validate(updateEntryStatusValidation), async (req: TenantRequest, res: Response) => {
  try {
    const { status, assignedAgentId } = req.body;

    const entry = await callQueueService.updateQueueEntry(
      req.params.entryId,
      status,
      assignedAgentId
    );

    return ApiResponse.success(res, entry);
  } catch (error: any) {
    return ApiResponse.error(res, error.message, error.statusCode);
  }
});

// Remove from queue
router.delete('/entries/:entryId', validate([
  param('entryId').isUUID().withMessage('Invalid entry ID'),
]), async (req: TenantRequest, res: Response) => {
  try {
    await callQueueService.removeFromQueue(req.params.entryId);
    return ApiResponse.success(res, { message: 'Entry removed from queue' });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, error.statusCode);
  }
});

// ==================== Routing ====================

// Route next call from queue
router.post('/:id/route', validate(uuidParamValidation), async (req: TenantRequest, res: Response) => {
  try {
    const agent = await callQueueService.routeCall(req.params.id);

    if (!agent) {
      return ApiResponse.error(res, 'No available agents', 404);
    }

    return ApiResponse.success(res, agent);
  } catch (error: any) {
    return ApiResponse.error(res, error.message, error.statusCode);
  }
});

// ==================== Transfers ====================

// Warm transfer
router.post('/entries/:entryId/warm-transfer', validate([
  param('entryId').isUUID().withMessage('Invalid entry ID'),
  body('toAgentUserId').isUUID().withMessage('Valid agent user ID is required'),
  body('consultFirst').optional().isBoolean().withMessage('consultFirst must be a boolean'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const { toAgentUserId, consultFirst } = req.body;

    const result = await callQueueService.warmTransfer(
      req.params.entryId,
      toAgentUserId,
      consultFirst
    );

    return ApiResponse.success(res, result);
  } catch (error: any) {
    return ApiResponse.error(res, error.message, error.statusCode);
  }
});

// Cold transfer
router.post('/entries/:entryId/cold-transfer', validate([
  param('entryId').isUUID().withMessage('Invalid entry ID'),
  body('toNumber').matches(/^[\d+\-() ]{7,20}$/).withMessage('Valid phone number is required'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const { toNumber } = req.body;

    const result = await callQueueService.coldTransfer(req.params.entryId, toNumber);

    return ApiResponse.success(res, result);
  } catch (error: any) {
    return ApiResponse.error(res, error.message, error.statusCode);
  }
});

// ==================== Schedules ====================

// Set schedule for queue
router.post('/:id/schedules', validate(scheduleValidation), async (req: TenantRequest, res: Response) => {
  try {
    const { dayOfWeek, startTime, endTime, timezone } = req.body;

    const schedule = await callQueueService.setSchedule(
      req.params.id,
      dayOfWeek,
      startTime,
      endTime,
      timezone
    );

    return ApiResponse.success(res, schedule);
  } catch (error: any) {
    return ApiResponse.error(res, error.message);
  }
});

// Check if queue is open
router.get('/:id/is-open', validate(uuidParamValidation), async (req: TenantRequest, res: Response) => {
  try {
    const isOpen = await callQueueService.isQueueOpen(req.params.id);
    return ApiResponse.success(res, { isOpen });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, error.statusCode);
  }
});

export default router;
