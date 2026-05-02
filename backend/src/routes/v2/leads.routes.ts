/**
 * V2 Leads Routes
 *
 * Unified lead management endpoints that work consistently for both mobile and web.
 * Uses UnifiedLeadsService for role-based filtering.
 */

import { Router, Response } from 'express';
import { authenticate } from '../../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../../middlewares/tenant';
import { ApiResponse } from '../../utils/apiResponse';
import { unifiedLeadsService } from '../../services/unified-leads.service';
import { unifiedAccessService, AccessContext } from '../../services/unified-access.service';
import { LeadSource, LeadPriority } from '@prisma/client';

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
 * GET /api/v2/leads
 * List leads with role-based filtering
 *
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 20)
 * - search: string
 * - stageId: string
 * - pipelineStageId: string
 * - source: LeadSource
 * - priority: LeadPriority
 * - assignedToId: string
 * - tagId: string
 * - dateFrom: ISO date string
 * - dateTo: ISO date string
 * - isConverted: boolean
 * - pendingFollowUp: boolean
 * - unassignedOnly: boolean
 * - sortBy: 'createdAt' | 'updatedAt' | 'firstName' | 'priority'
 * - sortOrder: 'asc' | 'desc'
 */
router.get('/', async (req: TenantRequest, res: Response) => {
  try {
    const context = buildContext(req);

    const {
      page,
      limit,
      search,
      stageId,
      pipelineStageId,
      source,
      priority,
      assignedToId,
      tagId,
      dateFrom,
      dateTo,
      isConverted,
      pendingFollowUp,
      unassignedOnly,
      sortBy,
      sortOrder,
    } = req.query;

    const result = await unifiedLeadsService.list(context, {
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20,
      search: search as string | undefined,
      stageId: stageId as string | undefined,
      pipelineStageId: pipelineStageId as string | undefined,
      source: source as LeadSource | undefined,
      priority: priority as LeadPriority | undefined,
      assignedToId: assignedToId as string | undefined,
      tagId: tagId as string | undefined,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      isConverted: isConverted !== undefined ? isConverted === 'true' : undefined,
      pendingFollowUp: pendingFollowUp === 'true',
      unassignedOnly: unassignedOnly === 'true',
      sortBy: sortBy as any,
      sortOrder: sortOrder as any,
    });

    // Add client type info for debugging
    const clientType = req.headers['x-client-type'] || 'unknown';

    ApiResponse.success(res, 'Leads retrieved', {
      ...result,
      _meta: {
        clientType,
        userId: context.userId,
        role: context.role,
      },
    });
  } catch (error) {
    console.error('[V2 Leads] List error:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

/**
 * GET /api/v2/leads/:id
 * Get a single lead by ID
 */
router.get('/:id', async (req: TenantRequest, res: Response) => {
  try {
    const context = buildContext(req);
    const { id } = req.params;

    const lead = await unifiedLeadsService.getById(context, id);

    ApiResponse.success(res, 'Lead retrieved', lead);
  } catch (error) {
    console.error('[V2 Leads] Get by ID error:', error);
    const statusCode = (error as any).statusCode || 500;
    ApiResponse.error(res, (error as Error).message, statusCode);
  }
});

/**
 * POST /api/v2/leads
 * Create a new lead
 */
router.post('/', async (req: TenantRequest, res: Response) => {
  try {
    const context = buildContext(req);

    const lead = await unifiedLeadsService.create(context, req.body);

    ApiResponse.success(res, 'Lead created', lead, 201);
  } catch (error) {
    console.error('[V2 Leads] Create error:', error);
    const statusCode = (error as any).statusCode || 500;
    ApiResponse.error(res, (error as Error).message, statusCode);
  }
});

/**
 * PUT /api/v2/leads/:id
 * Update a lead
 */
router.put('/:id', async (req: TenantRequest, res: Response) => {
  try {
    const context = buildContext(req);
    const { id } = req.params;

    const lead = await unifiedLeadsService.update(context, id, req.body);

    ApiResponse.success(res, 'Lead updated', lead);
  } catch (error) {
    console.error('[V2 Leads] Update error:', error);
    const statusCode = (error as any).statusCode || 500;
    ApiResponse.error(res, (error as Error).message, statusCode);
  }
});

/**
 * PATCH /api/v2/leads/:id
 * Partial update a lead (same as PUT, for compatibility)
 */
router.patch('/:id', async (req: TenantRequest, res: Response) => {
  try {
    const context = buildContext(req);
    const { id } = req.params;

    const lead = await unifiedLeadsService.update(context, id, req.body);

    ApiResponse.success(res, 'Lead updated', lead);
  } catch (error) {
    console.error('[V2 Leads] Patch error:', error);
    const statusCode = (error as any).statusCode || 500;
    ApiResponse.error(res, (error as Error).message, statusCode);
  }
});

/**
 * GET /api/v2/leads/:id/calls
 * Get call history for a lead
 */
router.get('/:id/calls', async (req: TenantRequest, res: Response) => {
  try {
    const context = buildContext(req);
    const { id } = req.params;
    const { page, limit } = req.query;

    const result = await unifiedLeadsService.getCallHistory(context, id, {
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20,
    });

    ApiResponse.success(res, 'Call history retrieved', result);
  } catch (error) {
    console.error('[V2 Leads] Call history error:', error);
    const statusCode = (error as any).statusCode || 500;
    ApiResponse.error(res, (error as Error).message, statusCode);
  }
});

/**
 * GET /api/v2/leads/:id/follow-ups
 * Get follow-ups for a lead
 */
router.get('/:id/follow-ups', async (req: TenantRequest, res: Response) => {
  try {
    const context = buildContext(req);
    const { id } = req.params;
    const { status, page, limit } = req.query;

    const result = await unifiedLeadsService.getFollowUps(context, id, {
      status: status as string | undefined,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20,
    });

    ApiResponse.success(res, 'Follow-ups retrieved', result);
  } catch (error) {
    console.error('[V2 Leads] Follow-ups error:', error);
    const statusCode = (error as any).statusCode || 500;
    ApiResponse.error(res, (error as Error).message, statusCode);
  }
});

export default router;
