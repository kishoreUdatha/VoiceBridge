/**
 * Team Management Routes
 * API endpoints for team analytics, workload, and capacity planning
 */

import { Router, Response, NextFunction } from 'express';
import { teamManagementService } from '../services/team-management.service';
import { authenticate } from '../middlewares/auth';
import { TenantRequest, tenantMiddleware } from '../middlewares/tenant';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticate as any);
router.use(tenantMiddleware as any);

/**
 * GET /api/team-management/overview
 * Get team overview for the current manager
 */
router.get('/overview', async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const organizationId = req.organizationId!;

    const overview = await teamManagementService.getTeamOverview(userId, organizationId);

    res.json({
      success: true,
      data: overview,
    });
  } catch (error: any) {
    console.error('Error fetching team overview:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch team overview',
    });
  }
});

/**
 * GET /api/team-management/members
 * Get detailed stats for all team members
 */
router.get('/members', async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const organizationId = req.organizationId!;

    const members = await teamManagementService.getTeamMemberStats(userId, organizationId);

    res.json({
      success: true,
      data: members,
    });
  } catch (error: any) {
    console.error('Error fetching team members:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch team members',
    });
  }
});

/**
 * GET /api/team-management/hierarchy
 * Get organizational hierarchy tree
 */
router.get('/hierarchy', async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.organizationId!;

    const hierarchy = await teamManagementService.getOrganizationHierarchy(organizationId);

    res.json({
      success: true,
      data: hierarchy,
    });
  } catch (error: any) {
    console.error('Error fetching hierarchy:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch hierarchy',
    });
  }
});

/**
 * GET /api/team-management/goals
 * Get team goals and KPIs
 */
router.get('/goals', async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const organizationId = req.organizationId!;

    const goals = await teamManagementService.getTeamGoals(userId, organizationId);

    res.json({
      success: true,
      data: goals,
    });
  } catch (error: any) {
    console.error('Error fetching team goals:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch team goals',
    });
  }
});

/**
 * GET /api/team-management/capacity
 * Get capacity planning data for all teams
 */
router.get('/capacity', async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.organizationId!;

    const capacity = await teamManagementService.getCapacityPlanning(organizationId);

    res.json({
      success: true,
      data: capacity,
    });
  } catch (error: any) {
    console.error('Error fetching capacity data:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch capacity data',
    });
  }
});

/**
 * POST /api/team-management/reassign
 * Reassign leads between team members
 */
router.post('/reassign', async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const { fromUserId, toUserId, leadIds } = req.body;
    const organizationId = req.organizationId!;

    if (!toUserId || !leadIds || !Array.isArray(leadIds)) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: toUserId, leadIds',
      });
    }

    const result = await teamManagementService.reassignLeads(
      fromUserId || req.user!.id,
      toUserId,
      leadIds,
      organizationId
    );

    res.json({
      success: true,
      data: result,
      message: `${result.count} leads reassigned successfully`,
    });
  } catch (error: any) {
    console.error('Error reassigning leads:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to reassign leads',
    });
  }
});

export default router;
