/**
 * Performance Targets & Alerts Routes
 * Daily targets, performance tracking, and alerts
 */

import { Router, Response, NextFunction } from 'express';
import { performanceTargetsService } from '../services/performance-targets.service';
import { authenticate, authorize } from '../middlewares/auth';
import { TenantRequest, tenantMiddleware } from '../middlewares/tenant';
import { ApiResponse } from '../utils/apiResponse';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticate as any);
router.use(tenantMiddleware as any);

/**
 * Get my targets and progress
 * GET /api/performance/my-targets
 */
router.get('/my-targets', async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const date = req.query.date as string | undefined;
    const targets = await performanceTargetsService.getUserTargets(
      req.organizationId!,
      req.user!.id,
      date
    );
    ApiResponse.success(res, 'Targets retrieved successfully', targets);
  } catch (error) {
    next(error);
  }
});

/**
 * Get targets for a specific user (admin/manager only)
 * GET /api/performance/users/:userId/targets
 */
router.get(
  '/users/:userId/targets',
  authorize('admin', 'manager', 'team_lead'),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const date = req.query.date as string | undefined;
      const targets = await performanceTargetsService.getUserTargets(
        req.organizationId!,
        req.params.userId,
        date
      );
      ApiResponse.success(res, 'Targets retrieved successfully', targets);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Set targets for a user (admin/manager only)
 * PUT /api/performance/users/:userId/targets
 */
router.put(
  '/users/:userId/targets',
  authorize('admin', 'manager', 'team_lead'),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const targets = await performanceTargetsService.setDailyTarget(
        req.organizationId!,
        req.params.userId,
        req.body,
        req.user!.id
      );
      ApiResponse.success(res, 'Targets updated successfully', targets);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Set organization default targets (admin only)
 * PUT /api/performance/default-targets
 */
router.put(
  '/default-targets',
  authorize('admin'),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const targets = await performanceTargetsService.setOrganizationDefaultTargets(
        req.organizationId!,
        req.body,
        req.user!.id
      );
      ApiResponse.success(res, 'Default targets updated successfully', targets);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get team performance overview
 * GET /api/performance/team
 */
router.get(
  '/team',
  authorize('admin', 'manager', 'team_lead'),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const userRole = req.user!.role || req.user!.roleSlug;
      const normalizedRole = userRole?.toLowerCase();

      // Team leads only see their team
      const managerId = (normalizedRole === 'team_lead' || normalizedRole === 'teamlead')
        ? req.user!.id
        : undefined;

      const performance = await performanceTargetsService.getTeamPerformance(
        req.organizationId!,
        managerId
      );
      ApiResponse.success(res, 'Team performance retrieved successfully', performance);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get performance alerts
 * GET /api/performance/alerts
 */
router.get('/alerts', async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const userRole = req.user!.role || req.user!.roleSlug;
    const alerts = await performanceTargetsService.getAlerts(
      req.organizationId!,
      req.user!.id,
      userRole
    );
    ApiResponse.success(res, 'Alerts retrieved successfully', alerts);
  } catch (error) {
    next(error);
  }
});

/**
 * Trigger performance check (admin only, for manual trigger)
 * POST /api/performance/check-alerts
 */
router.post(
  '/check-alerts',
  authorize('admin'),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const newAlerts = await performanceTargetsService.checkAndSendAlerts(req.organizationId!);
      ApiResponse.success(res, 'Performance check completed', { alertsGenerated: newAlerts.length });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get leaderboard
 * GET /api/performance/leaderboard
 */
router.get('/leaderboard', async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const period = (req.query.period as 'day' | 'week' | 'month') || 'day';
    const userRole = req.user!.role || req.user!.roleSlug;
    const normalizedRole = userRole?.toLowerCase();

    // Team leads only see their team
    const managerId = (normalizedRole === 'team_lead' || normalizedRole === 'teamlead')
      ? req.user!.id
      : undefined;

    const leaderboard = await performanceTargetsService.getLeaderboard(
      req.organizationId!,
      period,
      managerId
    );
    ApiResponse.success(res, 'Leaderboard retrieved successfully', leaderboard);
  } catch (error) {
    next(error);
  }
});

/**
 * Send daily summary (admin only, can be scheduled via cron)
 * POST /api/performance/daily-summary
 */
router.post(
  '/daily-summary',
  authorize('admin'),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      await performanceTargetsService.sendDailySummary(req.organizationId!);
      ApiResponse.success(res, 'Daily summary sent to all telecallers');
    } catch (error) {
      next(error);
    }
  }
);

export default router;
