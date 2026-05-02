/**
 * V2 Pipelines Routes
 *
 * Unified pipeline management endpoints that work consistently for both mobile and web.
 * Uses UnifiedAccessService for role-based filtering in analytics.
 */

import { Router, Response } from 'express';
import { authenticate } from '../../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../../middlewares/tenant';
import { ApiResponse } from '../../utils/apiResponse';
import { prisma } from '../../config/database';
import pipelineService from '../../services/pipeline.service';
import { unifiedAccessService, AccessContext } from '../../services/unified-access.service';

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
 * GET /api/v2/pipelines
 * List all pipelines for the organization
 *
 * Query params:
 * - entityType: string (filter by entity type, e.g., 'LEAD')
 */
router.get('/', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const { entityType } = req.query;

    const pipelines = await pipelineService.getPipelines(
      organizationId,
      entityType as string | undefined
    );

    ApiResponse.success(res, 'Pipelines retrieved', pipelines);
  } catch (error) {
    console.error('[V2 Pipelines] List error:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

/**
 * GET /api/v2/pipelines/:id
 * Get a single pipeline with stages
 */
router.get('/:id', async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;

    const pipeline = await pipelineService.getPipelineById(id);

    if (!pipeline) {
      return ApiResponse.error(res, 'Pipeline not found', 404);
    }

    // Verify organization access
    if (pipeline.organizationId !== req.organizationId) {
      return ApiResponse.error(res, 'Pipeline not found', 404);
    }

    ApiResponse.success(res, 'Pipeline retrieved', pipeline);
  } catch (error) {
    console.error('[V2 Pipelines] Get by ID error:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

/**
 * GET /api/v2/pipelines/:id/analytics
 * Get pipeline analytics with role-based filtering
 *
 * This is the key endpoint that ensures consistent data across mobile and web.
 */
router.get('/:id/analytics', async (req: TenantRequest, res: Response) => {
  try {
    const context = buildContext(req);
    const { id } = req.params;

    // Verify pipeline exists and belongs to organization
    const pipeline = await prisma.pipeline.findFirst({
      where: { id, organizationId: context.organizationId },
    });

    if (!pipeline) {
      return ApiResponse.error(res, 'Pipeline not found', 404);
    }

    // Get analytics with role-based filtering
    const analytics = await pipelineService.getPipelineAnalytics(id, {
      organizationId: context.organizationId,
      userRole: context.role,
      userId: context.userId,
    });

    // Add client type info for debugging
    const clientType = req.headers['x-client-type'] || 'unknown';

    ApiResponse.success(res, 'Pipeline analytics retrieved', {
      ...analytics,
      _meta: {
        clientType,
        userId: context.userId,
        role: context.role,
      },
    });
  } catch (error) {
    console.error('[V2 Pipelines] Analytics error:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

/**
 * GET /api/v2/pipelines/:id/stages
 * Get stages for a pipeline
 */
router.get('/:id/stages', async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Verify pipeline exists and belongs to organization
    const pipeline = await prisma.pipeline.findFirst({
      where: { id, organizationId: req.organizationId },
    });

    if (!pipeline) {
      return ApiResponse.error(res, 'Pipeline not found', 404);
    }

    const stages = await prisma.pipelineStage.findMany({
      where: {
        pipelineId: id,
        isActive: true,
      },
      orderBy: { order: 'asc' },
    });

    ApiResponse.success(res, 'Pipeline stages retrieved', stages);
  } catch (error) {
    console.error('[V2 Pipelines] Stages error:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

/**
 * GET /api/v2/pipelines/:id/leads
 * Get leads in a specific pipeline with role-based filtering
 */
router.get('/:id/leads', async (req: TenantRequest, res: Response) => {
  try {
    const context = buildContext(req);
    const { id } = req.params;
    const { page = '1', limit = '20', stageId } = req.query;

    // Verify pipeline exists and belongs to organization
    const pipeline = await prisma.pipeline.findFirst({
      where: { id, organizationId: context.organizationId },
      include: {
        stages: {
          where: { isActive: true },
          select: { id: true },
        },
      },
    });

    if (!pipeline) {
      return ApiResponse.error(res, 'Pipeline not found', 404);
    }

    // Get lead filter with role-based access
    const leadFilter = await unifiedAccessService.getLeadFilter(context);
    const stageIds = pipeline.stages.map((s) => s.id);

    // Build where clause
    const where: any = {
      ...leadFilter,
      pipelineStageId: stageId
        ? (stageId as string)
        : { in: stageIds },
    };

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: {
          stage: { select: { id: true, name: true, color: true } },
          pipelineStage: { select: { id: true, name: true, color: true, stageType: true } },
          assignments: {
            where: { isActive: true },
            include: {
              assignedTo: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.lead.count({ where }),
    ]);

    ApiResponse.success(res, 'Pipeline leads retrieved', {
      leads,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error('[V2 Pipelines] Leads error:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

/**
 * POST /api/v2/pipelines/:id/move-lead
 * Move a lead to a different stage in the pipeline
 */
router.post('/:id/move-lead', async (req: TenantRequest, res: Response) => {
  try {
    const context = buildContext(req);
    const { id } = req.params;
    const { leadId, toStageId, reason } = req.body;

    if (!leadId || !toStageId) {
      return ApiResponse.error(res, 'leadId and toStageId are required', 400);
    }

    // Verify access to the lead
    const canAccess = await unifiedAccessService.canAccessLead(context, leadId);
    if (!canAccess) {
      return ApiResponse.error(res, 'Lead not found', 404);
    }

    // Verify stage belongs to this pipeline
    const stage = await prisma.pipelineStage.findFirst({
      where: { id: toStageId, pipelineId: id },
    });

    if (!stage) {
      return ApiResponse.error(res, 'Invalid stage', 400);
    }

    // Update lead's pipeline stage
    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        pipelineStageId: toStageId,
        pipelineEnteredAt: new Date(),
        pipelineDaysInStage: 0,
      },
      include: {
        pipelineStage: { select: { id: true, name: true, color: true, stageType: true } },
      },
    });

    // Log activity
    await prisma.leadActivity.create({
      data: {
        leadId,
        userId: context.userId,
        type: 'STAGE_CHANGED',
        title: `Moved to ${stage.name}`,
        description: reason || `Lead moved to ${stage.name} stage`,
        metadata: {
          toStageId,
          toStageName: stage.name,
        },
      },
    });

    ApiResponse.success(res, 'Lead moved', updatedLead);
  } catch (error) {
    console.error('[V2 Pipelines] Move lead error:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

export default router;
