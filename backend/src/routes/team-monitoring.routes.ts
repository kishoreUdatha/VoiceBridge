/**
 * Team Monitoring Routes
 * API endpoints for team performance monitoring dashboard
 */

import { Router, Response, NextFunction } from 'express';
import { query, validationResult } from 'express-validator';
import { authenticate, authorize } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { teamMonitoringService } from '../services/team-monitoring.service';
import { ApiResponse } from '../utils/apiResponse';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiter for monitoring endpoints
const monitoringRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: 'Too many requests to monitoring endpoints, please try again later.',
});

// Apply middleware to all routes
router.use(authenticate);
router.use(tenantMiddleware);
router.use(monitoringRateLimit);

// Date filter validation
const dateFilterValidation = [
  query('dateFrom').optional().isISO8601().withMessage('dateFrom must be a valid ISO date'),
  query('dateTo').optional().isISO8601().withMessage('dateTo must be a valid ISO date'),
  query('branchId').optional().isUUID().withMessage('branchId must be a valid UUID'),
  query('managerId').optional().isUUID().withMessage('managerId must be a valid UUID'),
];

// Validation middleware
const validate = (req: TenantRequest, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return ApiResponse.validationError(res, 'Validation failed', errors.array());
  }
  next();
};

// Helper to build filters from request
const buildFilters = (req: TenantRequest) => {
  if (!req.organizationId) {
    console.error('[TeamMonitoring] ERROR: organizationId is missing from request!');
    throw new Error('Organization ID is required');
  }
  return {
    organizationId: req.organizationId,
    branchId: req.query.branchId as string | undefined,
    managerId: req.query.managerId as string | undefined,
    dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
    dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
    // Role-based filtering
    userRole: req.user?.roleSlug || req.user?.role,
    userId: req.user?.id,
  };
};

/**
 * GET /api/team-monitoring/overview
 * Get team overview summary metrics
 */
router.get(
  '/overview',
  authorize('admin', 'manager', 'team_lead'),
  dateFilterValidation,
  validate,
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      console.log('[TeamMonitoring Route] /overview called, orgId:', req.organizationId, 'user:', req.user?.email);
      const filters = buildFilters(req);
      const overview = await teamMonitoringService.getTeamOverview(filters);
      ApiResponse.success(res, 'Team overview retrieved successfully', overview);
    } catch (error) {
      console.error('[TeamMonitoring Route] /overview error:', error);
      next(error);
    }
  }
);

/**
 * GET /api/team-monitoring/telecallers
 * Get telecaller performance metrics
 */
router.get(
  '/telecallers',
  authorize('admin', 'manager', 'team_lead'),
  dateFilterValidation,
  validate,
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const filters = buildFilters(req);
      const performance = await teamMonitoringService.getTelecallerPerformance(filters);
      ApiResponse.success(res, 'Telecaller performance retrieved successfully', performance);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/team-monitoring/managers
 * Get manager performance with team aggregates
 */
router.get(
  '/managers',
  authorize('admin'),
  dateFilterValidation,
  validate,
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const filters = buildFilters(req);
      const performance = await teamMonitoringService.getManagerPerformance(filters);
      ApiResponse.success(res, 'Manager performance retrieved successfully', performance);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/team-monitoring/response-time
 * Get response time analytics
 */
router.get(
  '/response-time',
  authorize('admin', 'manager', 'team_lead'),
  dateFilterValidation,
  validate,
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const filters = buildFilters(req);
      const metrics = await teamMonitoringService.getResponseTimeMetrics(filters);
      ApiResponse.success(res, 'Response time metrics retrieved successfully', metrics);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/team-monitoring/lead-aging
 * Get lead aging breakdown
 */
router.get(
  '/lead-aging',
  authorize('admin', 'manager', 'team_lead'),
  dateFilterValidation,
  validate,
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const filters = buildFilters(req);
      const aging = await teamMonitoringService.getLeadAging(filters);
      ApiResponse.success(res, 'Lead aging data retrieved successfully', aging);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/team-monitoring/follow-ups
 * Get pending follow-ups grouped by assignee
 */
router.get(
  '/follow-ups',
  authorize('admin', 'manager', 'team_lead'),
  dateFilterValidation,
  validate,
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const filters = buildFilters(req);
      const followUps = await teamMonitoringService.getPendingFollowUps(filters);
      ApiResponse.success(res, 'Pending follow-ups retrieved successfully', followUps);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/team-monitoring/outcomes
 * Get call outcome distribution
 */
router.get(
  '/outcomes',
  authorize('admin', 'manager', 'team_lead'),
  dateFilterValidation,
  validate,
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const filters = buildFilters(req);
      const outcomes = await teamMonitoringService.getCallOutcomes(filters);
      ApiResponse.success(res, 'Call outcomes retrieved successfully', outcomes);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/team-monitoring/conversions
 * Get conversion trend over time
 */
router.get(
  '/conversions',
  authorize('admin', 'manager', 'team_lead'),
  dateFilterValidation,
  validate,
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const filters = buildFilters(req);
      const trend = await teamMonitoringService.getConversionTrend(filters);
      ApiResponse.success(res, 'Conversion trend retrieved successfully', trend);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/team-monitoring/export
 * Export team monitoring data to CSV
 */
router.get(
  '/export',
  authorize('admin', 'manager'),
  [
    ...dateFilterValidation,
    query('type')
      .isIn(['telecallers', 'outcomes', 'lead-aging', 'follow-ups'])
      .withMessage('Export type must be one of: telecallers, outcomes, lead-aging, follow-ups'),
  ],
  validate,
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const filters = buildFilters(req);
      const exportType = req.query.type as string;
      const csvContent = await teamMonitoringService.exportData(filters, exportType);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=team-monitoring-${exportType}-${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csvContent);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/team-monitoring/live-status
 * Get real-time team member status (active, break, offline)
 */
router.get(
  '/live-status',
  authorize('admin', 'manager', 'team_lead'),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const organizationId = req.organizationId!;
      const currentUserId = req.user!.id;
      const currentUserRole = req.user!.role || req.user!.roleSlug;
      const liveStatus = await teamMonitoringService.getLiveTeamStatus(
        organizationId,
        currentUserId,
        currentUserRole
      );
      ApiResponse.success(res, 'Live team status retrieved successfully', liveStatus);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/team-monitoring/update-status
 * Update current user's work status (for Take Break / Go Active buttons)
 */
router.post(
  '/update-status',
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { status } = req.body;

      // Map frontend values to enum values
      const statusMap: Record<string, 'ACTIVE' | 'ON_BREAK' | 'OFFLINE'> = {
        'active': 'ACTIVE',
        'break': 'ON_BREAK',
        'offline': 'OFFLINE',
        'ACTIVE': 'ACTIVE',
        'ON_BREAK': 'ON_BREAK',
        'OFFLINE': 'OFFLINE',
      };

      const mappedStatus = statusMap[status];
      if (!mappedStatus) {
        return ApiResponse.error(res, 'Invalid status. Must be active, break, or offline', 400);
      }

      await teamMonitoringService.updateUserStatus(userId, mappedStatus);
      ApiResponse.success(res, 'Status updated successfully', { status: mappedStatus });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
