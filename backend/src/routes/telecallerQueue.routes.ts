import { Router, Response, NextFunction } from 'express';
import { telecallerQueueService } from '../services/telecallerQueue.service';
import { ApiResponse } from '../utils/apiResponse';
import { authenticate, AuthenticatedRequest } from '../middlewares/auth';
import { TelecallerQueueStatus, TelecallerOutcome } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/telecaller-queue
 * Get queue items for the current telecaller
 */
router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return ApiResponse.unauthorized(res);
    }

    const { status, page, limit, showAll } = req.query;

    const statusArray = status
      ? (status as string).split(',') as TelecallerQueueStatus[]
      : undefined;

    const result = await telecallerQueueService.getQueue(
      req.user.organizationId,
      req.user.id,
      {
        status: statusArray,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
        showAll: showAll === 'true',
      }
    );

    ApiResponse.success(res, 'Queue items retrieved', result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/telecaller-queue/stats
 * Get queue statistics
 */
router.get('/stats', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return ApiResponse.unauthorized(res);
    }

    const stats = await telecallerQueueService.getStats(
      req.user.organizationId,
      req.user.id
    );

    ApiResponse.success(res, 'Queue stats retrieved', stats);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/telecaller-queue/:id
 * Get single queue item details
 */
router.get('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return ApiResponse.unauthorized(res);
    }

    const item = await telecallerQueueService.getItem(req.params.id);

    if (!item) {
      return ApiResponse.notFound(res, 'Queue item not found');
    }

    ApiResponse.success(res, 'Queue item retrieved', item);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/telecaller-queue/:id/claim
 * Claim a queue item
 */
router.post('/:id/claim', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return ApiResponse.unauthorized(res);
    }

    const item = await telecallerQueueService.claimItem(req.params.id, req.user.id);

    ApiResponse.success(res, 'Item claimed successfully', item);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/telecaller-queue/:id/release
 * Release/unclaim an item
 */
router.post('/:id/release', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return ApiResponse.unauthorized(res);
    }

    const item = await telecallerQueueService.releaseItem(req.params.id, req.user.id);

    ApiResponse.success(res, 'Item released successfully', item);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/telecaller-queue/:id/skip
 * Skip an item and put back in queue
 */
router.post('/:id/skip', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return ApiResponse.unauthorized(res);
    }

    const { reason } = req.body;
    const item = await telecallerQueueService.skipItem(req.params.id, req.user.id, reason);

    ApiResponse.success(res, 'Item skipped', item);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/telecaller-queue/:id
 * Update queue item (status, notes, outcome)
 */
router.put('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return ApiResponse.unauthorized(res);
    }

    const { status, telecallerNotes, telecallerOutcome, callbackScheduled } = req.body;

    const item = await telecallerQueueService.updateItem(req.params.id, req.user.id, {
      status: status as TelecallerQueueStatus,
      telecallerNotes,
      telecallerOutcome: telecallerOutcome as TelecallerOutcome,
      callbackScheduled: callbackScheduled ? new Date(callbackScheduled) : undefined,
    });

    ApiResponse.success(res, 'Item updated successfully', item);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/telecaller-queue/:id/complete
 * Mark item as completed with outcome
 */
router.post('/:id/complete', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return ApiResponse.unauthorized(res);
    }

    const { telecallerOutcome, telecallerNotes, callbackScheduled } = req.body;

    if (!telecallerOutcome) {
      return ApiResponse.error(res,'Outcome is required');
    }

    const item = await telecallerQueueService.updateItem(req.params.id, req.user.id, {
      status: callbackScheduled ? 'CALLBACK' : 'COMPLETED',
      telecallerOutcome: telecallerOutcome as TelecallerOutcome,
      telecallerNotes,
      callbackScheduled: callbackScheduled ? new Date(callbackScheduled) : undefined,
    });

    ApiResponse.success(res, 'Item completed', item);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/telecaller-queue/add
 * Manually add a lead to the queue (admin/manager)
 */
router.post('/add', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return ApiResponse.unauthorized(res);
    }

    const {
      leadId,
      phoneNumber,
      contactName,
      email,
      reason,
      priority,
    } = req.body;

    if (!phoneNumber) {
      return ApiResponse.error(res,'Phone number is required');
    }

    const item = await telecallerQueueService.addToQueue({
      organizationId: req.user.organizationId,
      leadId,
      phoneNumber,
      contactName,
      email,
      reason: reason || 'Manually added',
      priority: priority || 5,
    });

    ApiResponse.created(res, 'Added to queue', item);
  } catch (error) {
    next(error);
  }
});

export default router;
