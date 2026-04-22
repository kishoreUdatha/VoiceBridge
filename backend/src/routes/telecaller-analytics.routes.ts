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

// Helper to get role-based filters - now uses getViewableTeamMemberIds in service
function getRoleBasedFilters(user: any): { branchId?: string; managerId?: string; userRole?: string; userId?: string; organizationId?: string } {
  const roleSlug = user.role?.slug || user.roleSlug;

  // Pass role info to let service handle filtering via getViewableTeamMemberIds
  return {
    userRole: roleSlug,
    userId: user.id,
    organizationId: user.organizationId,
    // Keep legacy filters for backward compatibility
    branchId: roleSlug === 'manager' ? (user.branchId || undefined) : undefined,
  };
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
  const { organizationId, id: userId } = req.user!;
  const roleSlug = (req.user as any).role?.slug || (req.user as any).roleSlug;

  // Telecallers / counselors can only see their own performance
  if (roleSlug !== 'admin' && roleSlug !== 'owner' && roleSlug !== 'manager' && roleSlug !== 'team_lead' && roleSlug !== 'teamlead') {
    if (id !== userId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
  }

  const data = await telecallerAnalyticsService.getTelecallerPerformance(id, parseInt(days as string), organizationId);
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
