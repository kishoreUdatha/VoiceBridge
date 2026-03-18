import { Router, Response } from 'express';
import { callQueueService } from '../services/call-queue.service';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { ApiResponse } from '../utils/apiResponse';
import { AgentStatus } from '@prisma/client';

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
router.get('/:id', async (req: TenantRequest, res: Response) => {
  try {
    const queue = await callQueueService.getQueueById(req.params.id, req.organizationId!);
    return ApiResponse.success(res, queue);
  } catch (error: any) {
    return ApiResponse.error(res, error.message, error.statusCode);
  }
});

// Create queue
router.post('/', async (req: TenantRequest, res: Response) => {
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
router.put('/:id', async (req: TenantRequest, res: Response) => {
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
router.delete('/:id', async (req: TenantRequest, res: Response) => {
  try {
    await callQueueService.deleteQueue(req.params.id, req.organizationId!);
    return ApiResponse.success(res, { message: 'Queue deleted successfully' });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, error.statusCode);
  }
});

// Get queue stats (real-time)
router.get('/:id/stats', async (req: TenantRequest, res: Response) => {
  try {
    const stats = await callQueueService.getQueueStats(req.params.id);
    return ApiResponse.success(res, stats);
  } catch (error: any) {
    return ApiResponse.error(res, error.message, error.statusCode);
  }
});

// ==================== Queue Members ====================

// Add member to queue
router.post('/:id/members', async (req: TenantRequest, res: Response) => {
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
router.delete('/:id/members/:userId', async (req: TenantRequest, res: Response) => {
  try {
    await callQueueService.removeMember(req.params.id, req.params.userId);
    return ApiResponse.success(res, { message: 'Member removed from queue' });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, error.statusCode);
  }
});

// Update agent status
router.put('/:id/members/:userId/status', async (req: TenantRequest, res: Response) => {
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
router.get('/agent/:userId/queues', async (req: TenantRequest, res: Response) => {
  try {
    const queues = await callQueueService.getAgentQueues(req.params.userId);
    return ApiResponse.success(res, queues);
  } catch (error: any) {
    return ApiResponse.error(res, error.message);
  }
});

// ==================== Queue Entries ====================

// Add caller to queue (typically called by IVR webhook)
router.post('/:id/entries', async (req: TenantRequest, res: Response) => {
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
router.put('/entries/:entryId/status', async (req: TenantRequest, res: Response) => {
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
router.delete('/entries/:entryId', async (req: TenantRequest, res: Response) => {
  try {
    await callQueueService.removeFromQueue(req.params.entryId);
    return ApiResponse.success(res, { message: 'Entry removed from queue' });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, error.statusCode);
  }
});

// ==================== Routing ====================

// Route next call from queue
router.post('/:id/route', async (req: TenantRequest, res: Response) => {
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
router.post('/entries/:entryId/warm-transfer', async (req: TenantRequest, res: Response) => {
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
router.post('/entries/:entryId/cold-transfer', async (req: TenantRequest, res: Response) => {
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
router.post('/:id/schedules', async (req: TenantRequest, res: Response) => {
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
router.get('/:id/is-open', async (req: TenantRequest, res: Response) => {
  try {
    const isOpen = await callQueueService.isQueueOpen(req.params.id);
    return ApiResponse.success(res, { isOpen });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, error.statusCode);
  }
});

export default router;
