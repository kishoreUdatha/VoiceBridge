/**
 * Lead SLA Routes
 * Handles SLA configuration and tracking
 */

import { Router, Response } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, authorize } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import { ApiResponse } from '../utils/apiResponse';
import { leadSlaService } from '../services/lead-sla.service';

const router = Router();

router.use(authenticate);
router.use(tenantMiddleware);

// ==================== SLA Configuration ====================

/**
 * GET /api/lead-sla/configs
 * Get all SLA configurations
 */
router.get('/configs', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId!;

    const configs = await leadSlaService.getSlaConfigs(organizationId);

    return ApiResponse.success(res, 'SLA configurations retrieved', {
      configs,
      total: configs.length,
    });
  } catch (error) {
    console.error('Error fetching SLA configs:', error);
    return ApiResponse.error(res, 'Failed to fetch SLA configurations', 500);
  }
});

/**
 * GET /api/lead-sla/configs/:configId
 * Get a single SLA configuration
 */
router.get(
  '/configs/:configId',
  validate([param('configId').isUUID()]),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;
      const { configId } = req.params;

      const config = await leadSlaService.getSlaConfig(configId, organizationId);

      if (!config) {
        return ApiResponse.error(res, 'SLA configuration not found', 404);
      }

      return ApiResponse.success(res, 'SLA configuration retrieved', config);
    } catch (error) {
      console.error('Error fetching SLA config:', error);
      return ApiResponse.error(res, 'Failed to fetch SLA configuration', 500);
    }
  }
);

/**
 * POST /api/lead-sla/configs
 * Create an SLA configuration
 */
router.post(
  '/configs',
  authorize('admin', 'manager'),
  validate([
    body('name').trim().notEmpty().isLength({ max: 100 }).withMessage('Name is required (max 100 chars)'),
    body('description').optional().trim().isLength({ max: 500 }),
    body('firstResponseMinutes').optional().isInt({ min: 1 }),
    body('followUpMinutes').optional().isInt({ min: 1 }),
    body('resolutionMinutes').optional().isInt({ min: 1 }),
    body('workingHoursOnly').optional().isBoolean(),
    body('workingHoursStart').optional().matches(/^\d{2}:\d{2}$/),
    body('workingHoursEnd').optional().matches(/^\d{2}:\d{2}$/),
    body('workingDays').optional().isArray(),
    body('escalationEnabled').optional().isBoolean(),
    body('escalationMinutes').optional().isInt({ min: 1 }),
    body('escalationUserId').optional().isUUID(),
    body('conditions').optional().isArray(),
    body('isDefault').optional().isBoolean(),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;

      const config = await leadSlaService.createSlaConfig(organizationId, req.body);

      return ApiResponse.success(res, 'SLA configuration created', config, 201);
    } catch (error) {
      console.error('Error creating SLA config:', error);
      return ApiResponse.error(res, 'Failed to create SLA configuration', 500);
    }
  }
);

/**
 * PUT /api/lead-sla/configs/:configId
 * Update an SLA configuration
 */
router.put(
  '/configs/:configId',
  authorize('admin', 'manager'),
  validate([
    param('configId').isUUID(),
    body('name').optional().trim().notEmpty().isLength({ max: 100 }),
    body('description').optional().trim().isLength({ max: 500 }),
    body('firstResponseMinutes').optional().isInt({ min: 1 }),
    body('followUpMinutes').optional().isInt({ min: 1 }),
    body('resolutionMinutes').optional().isInt({ min: 1 }),
    body('workingHoursOnly').optional().isBoolean(),
    body('workingHoursStart').optional().matches(/^\d{2}:\d{2}$/),
    body('workingHoursEnd').optional().matches(/^\d{2}:\d{2}$/),
    body('workingDays').optional().isArray(),
    body('escalationEnabled').optional().isBoolean(),
    body('isActive').optional().isBoolean(),
    body('isDefault').optional().isBoolean(),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;
      const { configId } = req.params;

      const config = await leadSlaService.updateSlaConfig(configId, organizationId, req.body);

      return ApiResponse.success(res, 'SLA configuration updated', config);
    } catch (error) {
      console.error('Error updating SLA config:', error);
      return ApiResponse.error(res, 'Failed to update SLA configuration', 500);
    }
  }
);

/**
 * DELETE /api/lead-sla/configs/:configId
 * Delete an SLA configuration
 */
router.delete(
  '/configs/:configId',
  authorize('admin', 'manager'),
  validate([param('configId').isUUID()]),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;
      const { configId } = req.params;

      await leadSlaService.deleteSlaConfig(configId, organizationId);

      return ApiResponse.success(res, 'SLA configuration deleted');
    } catch (error) {
      console.error('Error deleting SLA config:', error);
      return ApiResponse.error(res, 'Failed to delete SLA configuration', 500);
    }
  }
);

// ==================== SLA Tracking ====================

/**
 * GET /api/lead-sla/lead/:leadId/status
 * Get SLA status for a specific lead
 */
router.get(
  '/lead/:leadId/status',
  validate([param('leadId').isUUID()]),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;
      const { leadId } = req.params;

      const status = await leadSlaService.getSlaStatus(leadId, organizationId);

      if (!status) {
        return ApiResponse.success(res, 'No SLA configured for this lead', null);
      }

      return ApiResponse.success(res, 'SLA status retrieved', status);
    } catch (error) {
      console.error('Error fetching SLA status:', error);
      return ApiResponse.error(res, 'Failed to fetch SLA status', 500);
    }
  }
);

/**
 * GET /api/lead-sla/breached
 * Get leads with SLA breaches
 */
router.get(
  '/breached',
  validate([
    query('breachType').optional().isIn(['first_response', 'follow_up', 'resolution']),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;
      const breachType = req.query.breachType as 'first_response' | 'follow_up' | 'resolution' | undefined;
      const limit = parseInt(req.query.limit as string) || 50;

      const leads = await leadSlaService.getBreachedLeads(organizationId, {
        breachType,
        limit,
      });

      return ApiResponse.success(res, 'Breached leads retrieved', {
        leads,
        total: leads.length,
      });
    } catch (error) {
      console.error('Error fetching breached leads:', error);
      return ApiResponse.error(res, 'Failed to fetch breached leads', 500);
    }
  }
);

/**
 * GET /api/lead-sla/metrics
 * Get SLA dashboard metrics
 */
router.get('/metrics', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId!;

    const metrics = await leadSlaService.getSlaMetrics(organizationId);

    return ApiResponse.success(res, 'SLA metrics retrieved', metrics);
  } catch (error) {
    console.error('Error fetching SLA metrics:', error);
    return ApiResponse.error(res, 'Failed to fetch SLA metrics', 500);
  }
});

export default router;
