/**
 * Telecaller Analytics Routes
 * Role-based access:
 * - Admin: sees all branches
 * - Manager: sees only their branch
 * - Team Lead: sees only their assigned telecallers
 */

import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { telecallerAnalyticsService } from '../services/telecaller-analytics.service';

const router = Router();

// Helper to get role-based filters
function getRoleBasedFilters(user: any): { branchId?: string; managerId?: string } {
  const roleSlug = user.role?.slug || user.roleSlug;

  // Admin sees everything
  if (roleSlug === 'admin' || roleSlug === 'owner') {
    return {};
  }

  // Manager sees their branch only
  if (roleSlug === 'manager') {
    return { branchId: user.branchId || undefined };
  }

  // Team Lead sees their assigned telecallers only
  if (roleSlug === 'team_lead' || roleSlug === 'teamlead') {
    return { managerId: user.id };
  }

  // Default: show nothing for other roles
  return { managerId: 'none' };
}

// Get telecaller leaderboard with role-based filtering
router.get('/leaderboard', authenticate, asyncHandler(async (req, res) => {
  const { organizationId } = req.user!;
  const { metric = 'calls', startDate, endDate, limit = '50' } = req.query;

  // Get role-based filters
  const filters = getRoleBasedFilters(req.user);

  const data = await telecallerAnalyticsService.getTelecallerLeaderboard(
    organizationId,
    metric as string,
    {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: parseInt(limit as string),
      ...filters,
    }
  );

  res.json({ success: true, data });
}));

// Get daily report with role-based filtering
router.get('/daily-report', authenticate, asyncHandler(async (req, res) => {
  const { organizationId } = req.user!;
  const { date } = req.query;

  // Get role-based filters
  const filters = getRoleBasedFilters(req.user);

  const reportDate = date ? new Date(date as string) : new Date();

  const data = await telecallerAnalyticsService.getDailyReport(
    organizationId,
    reportDate,
    filters
  );

  res.json({ success: true, data });
}));

// Get specific telecaller performance
router.get('/telecallers/:id', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { days = '30' } = req.query;

  const data = await telecallerAnalyticsService.getTelecallerPerformance(id, parseInt(days as string));
  res.json({ success: true, data });
}));

// Aggregate daily performance (admin only)
router.post('/aggregate', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const { organizationId } = req.user!;
  const { date } = req.body;

  const result = await telecallerAnalyticsService.aggregateDailyPerformance(
    organizationId,
    date ? new Date(date) : new Date()
  );

  res.json({ success: true, data: result });
}));

export default router;
