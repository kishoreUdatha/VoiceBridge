/**
 * V2 Dashboard Routes
 *
 * Unified dashboard endpoints that work consistently for both mobile and web.
 * Uses UnifiedDashboardService for role-based statistics.
 */

import { Router, Response } from 'express';
import { authenticate } from '../../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../../middlewares/tenant';
import { ApiResponse } from '../../utils/apiResponse';
import { unifiedDashboardService } from '../../services/unified-dashboard.service';
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
 * GET /api/v2/dashboard/stats
 * Get comprehensive dashboard statistics
 *
 * Query params:
 * - includeCallStats: boolean (default: true)
 * - includeConversionRate: boolean (default: true)
 * - dateFrom: ISO date string
 * - dateTo: ISO date string
 * - pipelineId: string
 */
router.get('/stats', async (req: TenantRequest, res: Response) => {
  try {
    const context = buildContext(req);

    const { includeCallStats, includeConversionRate, dateFrom, dateTo, pipelineId } = req.query;

    const stats = await unifiedDashboardService.getStats(context, {
      includeCallStats: includeCallStats !== 'false',
      includeConversionRate: includeConversionRate !== 'false',
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      pipelineId: pipelineId as string | undefined,
    });

    // Add client type info for debugging
    const clientType = req.headers['x-client-type'] || 'unknown';

    ApiResponse.success(res, 'Dashboard stats retrieved', {
      ...stats,
      _meta: {
        clientType,
        userId: context.userId,
        role: context.role,
      },
    });
  } catch (error) {
    console.error('[V2 Dashboard] Stats error:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

/**
 * GET /api/v2/dashboard/summary
 * Get quick summary counts for dashboard header
 * Optimized for mobile (smaller payload)
 */
router.get('/summary', async (req: TenantRequest, res: Response) => {
  try {
    const context = buildContext(req);

    const summary = await unifiedDashboardService.getSummary(context);

    ApiResponse.success(res, 'Dashboard summary retrieved', summary);
  } catch (error) {
    console.error('[V2 Dashboard] Summary error:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

/**
 * GET /api/v2/dashboard/lead-counts
 * Get lead counts by stage (for pipeline visualization)
 */
router.get('/lead-counts', async (req: TenantRequest, res: Response) => {
  try {
    const context = buildContext(req);

    const stats = await unifiedDashboardService.getStats(context, {
      includeCallStats: false,
      includeConversionRate: true,
    });

    ApiResponse.success(res, 'Lead counts retrieved', {
      total: stats.leads.total,
      converted: stats.leads.converted,
      conversionRate: stats.leads.conversionRate,
      byStatus: stats.leads.byStatus,
    });
  } catch (error) {
    console.error('[V2 Dashboard] Lead counts error:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

/**
 * GET /api/v2/dashboard/follow-ups
 * Get follow-up statistics
 */
router.get('/follow-ups', async (req: TenantRequest, res: Response) => {
  try {
    const context = buildContext(req);

    const stats = await unifiedDashboardService.getStats(context, {
      includeCallStats: false,
    });

    ApiResponse.success(res, 'Follow-up stats retrieved', stats.followUps);
  } catch (error) {
    console.error('[V2 Dashboard] Follow-ups error:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

export default router;
