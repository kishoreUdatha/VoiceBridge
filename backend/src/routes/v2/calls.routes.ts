/**
 * V2 Calls Routes
 *
 * Unified call management endpoints that work consistently for both mobile and web.
 * Uses UnifiedAccessService for role-based filtering.
 */

import { Router, Response } from 'express';
import { authenticate } from '../../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../../middlewares/tenant';
import { ApiResponse } from '../../utils/apiResponse';
import { prisma } from '../../config/database';
import { unifiedAccessService, AccessContext } from '../../services/unified-access.service';
import { Prisma, TelecallerCallOutcome } from '@prisma/client';

const router = Router();

// Apply authentication
router.use(authenticate);
router.use(tenantMiddleware);

/**
 * Helper to build access context from request
 */
function buildContext(req: TenantRequest): AccessContext {
  const selectedBranchId = req.headers['x-branch-id'] as string | undefined;

  return unifiedAccessService.buildContextFromUser(
    {
      id: req.user!.id,
      role: req.user!.role,
      branchId: req.user!.branchId,
      managerId: req.user!.managerId,
    },
    req.organizationId!,
    selectedBranchId || null
  );
}

/**
 * GET /api/v2/calls
 * List calls with role-based filtering
 *
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 20)
 * - telecallerId: string (filter by specific telecaller)
 * - leadId: string (filter by lead)
 * - outcome: string (filter by outcome)
 * - dateFrom: ISO date string
 * - dateTo: ISO date string
 * - sortBy: 'createdAt' | 'duration'
 * - sortOrder: 'asc' | 'desc'
 */
router.get('/', async (req: TenantRequest, res: Response) => {
  try {
    const context = buildContext(req);

    const {
      page = '1',
      limit = '20',
      telecallerId,
      leadId,
      outcome,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // Get base call filter
    const baseFilter = await unifiedAccessService.getCallFilter(context);

    // Build where clause
    const where: Prisma.TelecallerCallWhereInput = { ...baseFilter };

    // If specific telecaller requested, add filter (must still be within viewable users)
    if (telecallerId) {
      where.telecallerId = telecallerId as string;
    }

    // Lead filter
    if (leadId) {
      where.leadId = leadId as string;
    }

    // Outcome filter
    if (outcome) {
      where.outcome = outcome as TelecallerCallOutcome;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        const start = new Date(dateFrom as string);
        start.setHours(0, 0, 0, 0);
        where.createdAt.gte = start;
      }
      if (dateTo) {
        const end = new Date(dateTo as string);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const [calls, total] = await Promise.all([
      prisma.telecallerCall.findMany({
        where,
        include: {
          telecaller: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          lead: {
            select: { id: true, firstName: true, lastName: true, phone: true },
          },
        },
        orderBy: { [sortBy as string]: sortOrder },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.telecallerCall.count({ where }),
    ]);

    ApiResponse.success(res, 'Calls retrieved', {
      calls,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error('[V2 Calls] List error:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

/**
 * GET /api/v2/calls/stats
 * Get call statistics with role-based filtering
 */
router.get('/stats', async (req: TenantRequest, res: Response) => {
  try {
    const context = buildContext(req);
    const { dateFrom, dateTo } = req.query;

    // Get base call filter
    const baseFilter = await unifiedAccessService.getCallFilter(context);

    // Add date filter if provided
    const where: Prisma.TelecallerCallWhereInput = { ...baseFilter };
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        const start = new Date(dateFrom as string);
        start.setHours(0, 0, 0, 0);
        where.createdAt.gte = start;
      }
      if (dateTo) {
        const end = new Date(dateTo as string);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    // Calculate today's stats
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [totalCalls, todayCalls, connectedCalls, avgDuration, byOutcome, byStatus] =
      await Promise.all([
        prisma.telecallerCall.count({ where }),

        prisma.telecallerCall.count({
          where: { ...baseFilter, createdAt: { gte: todayStart } },
        }),

        prisma.telecallerCall.count({
          where: { ...where, status: 'COMPLETED' },
        }),

        prisma.telecallerCall.aggregate({
          where: { ...where, duration: { gt: 0 } },
          _avg: { duration: true },
          _sum: { duration: true },
        }),

        prisma.telecallerCall.groupBy({
          by: ['outcome'],
          where,
          _count: true,
        }),

        prisma.telecallerCall.groupBy({
          by: ['status'],
          where,
          _count: true,
        }),
      ]);

    const outcomeCounts = byOutcome.reduce((acc, item) => {
      if (item.outcome) {
        acc[item.outcome] = item._count;
      }
      return acc;
    }, {} as Record<string, number>);

    const statusCounts = byStatus.reduce((acc, item) => {
      if (item.status) {
        acc[item.status] = item._count;
      }
      return acc;
    }, {} as Record<string, number>);

    ApiResponse.success(res, 'Call stats retrieved', {
      total: totalCalls,
      today: todayCalls,
      connected: connectedCalls,
      avgDuration: Math.round(avgDuration._avg.duration || 0),
      totalDuration: avgDuration._sum.duration || 0,
      connectionRate:
        totalCalls > 0 ? Math.round((connectedCalls / totalCalls) * 1000) / 10 : 0,
      byOutcome: outcomeCounts,
      byStatus: statusCounts,
    });
  } catch (error) {
    console.error('[V2 Calls] Stats error:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

/**
 * POST /api/v2/calls
 * Log a new call
 */
router.post('/', async (req: TenantRequest, res: Response) => {
  try {
    const context = buildContext(req);

    const {
      leadId,
      phoneNumber,
      contactName,
      outcome,
      summary,
      duration,
      status,
      recordingUrl,
      callType,
      startedAt,
      endedAt,
    } = req.body;

    // Validate required fields
    if (!phoneNumber && !leadId) {
      return ApiResponse.error(res, 'Either leadId or phoneNumber is required', 400);
    }

    // Create call record
    const call = await prisma.telecallerCall.create({
      data: {
        organizationId: context.organizationId,
        telecallerId: context.userId,
        leadId: leadId || null,
        phoneNumber: phoneNumber || '',
        contactName: contactName || null,
        outcome: (outcome as TelecallerCallOutcome) || TelecallerCallOutcome.NO_ANSWER,
        summary: summary || null,
        duration: duration || 0,
        status: status || 'COMPLETED',
        recordingUrl: recordingUrl || null,
        callType: callType || 'OUTBOUND',
        startedAt: startedAt ? new Date(startedAt) : new Date(),
        endedAt: endedAt ? new Date(endedAt) : null,
      },
      include: {
        lead: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
      },
    });

    ApiResponse.success(res, 'Call logged', call, 201);
  } catch (error) {
    console.error('[V2 Calls] Create error:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

/**
 * GET /api/v2/calls/:id
 * Get a single call by ID
 */
router.get('/:id', async (req: TenantRequest, res: Response) => {
  try {
    const context = buildContext(req);
    const { id } = req.params;

    // Get call filter to ensure user can access
    const baseFilter = await unifiedAccessService.getCallFilter(context);

    const call = await prisma.telecallerCall.findFirst({
      where: {
        id,
        ...baseFilter,
      },
      include: {
        telecaller: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    if (!call) {
      return ApiResponse.error(res, 'Call not found', 404);
    }

    ApiResponse.success(res, 'Call retrieved', call);
  } catch (error) {
    console.error('[V2 Calls] Get by ID error:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

/**
 * PUT /api/v2/calls/:id
 * Update a call record
 */
router.put('/:id', async (req: TenantRequest, res: Response) => {
  try {
    const context = buildContext(req);
    const { id } = req.params;

    // Get call filter to ensure user can access
    const baseFilter = await unifiedAccessService.getCallFilter(context);

    // Check if call exists and user can access
    const existingCall = await prisma.telecallerCall.findFirst({
      where: { id, ...baseFilter },
    });

    if (!existingCall) {
      return ApiResponse.error(res, 'Call not found', 404);
    }

    const { outcome, notes, duration, status, recordingUrl, aiAnalysis, aiSummary } =
      req.body;

    const call = await prisma.telecallerCall.update({
      where: { id },
      data: {
        ...(outcome && { outcome }),
        ...(notes !== undefined && { notes }),
        ...(duration !== undefined && { duration }),
        ...(status && { status }),
        ...(recordingUrl && { recordingUrl }),
        ...(aiAnalysis && { aiAnalysis }),
        ...(aiSummary && { aiSummary }),
      },
      include: {
        lead: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
      },
    });

    ApiResponse.success(res, 'Call updated', call);
  } catch (error) {
    console.error('[V2 Calls] Update error:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

export default router;
