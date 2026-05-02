/**
 * Call Outcome Routes
 * Handles custom call outcomes management for telecaller app
 */

import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import { authenticate, authorize } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import { ApiResponse } from '../utils/apiResponse';
import { callOutcomeService } from '../services/call-outcome.service';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(tenantMiddleware);

// Validation rules
const createOutcomeValidation = [
  body('name').trim().notEmpty().withMessage('Outcome name is required'),
  body('slug')
    .optional()
    .trim()
    .matches(/^[a-z0-9_]+$/)
    .withMessage('Slug must contain only lowercase letters, numbers, and underscores'),
  body('icon').optional().trim(),
  body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Invalid color format (use hex like #FF5733)'),
  body('notePrompt').optional().trim(),
  body('requiresFollowUp').optional().isBoolean().withMessage('requiresFollowUp must be a boolean'),
  body('requiresSubOption').optional().isBoolean().withMessage('requiresSubOption must be a boolean'),
  body('subOptions').optional().isArray().withMessage('subOptions must be an array'),
  body('mapsToStatus').optional().trim(),
  body('order').optional().isInt({ min: 0 }).withMessage('Order must be a non-negative integer'),
];

const updateOutcomeValidation = [
  param('id').isUUID().withMessage('Invalid outcome ID'),
  body('name').optional().trim().notEmpty().withMessage('Outcome name cannot be empty'),
  body('icon').optional().trim(),
  body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Invalid color format (use hex like #FF5733)'),
  body('notePrompt').optional().trim(),
  body('requiresFollowUp').optional().isBoolean().withMessage('requiresFollowUp must be a boolean'),
  body('requiresSubOption').optional().isBoolean().withMessage('requiresSubOption must be a boolean'),
  body('subOptions').optional().isArray().withMessage('subOptions must be an array'),
  body('mapsToStatus').optional().trim(),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  body('order').optional().isInt({ min: 0 }).withMessage('Order must be a non-negative integer'),
];

const reorderValidation = [
  body('orderedIds').isArray({ min: 1 }).withMessage('orderedIds must be a non-empty array'),
  body('orderedIds.*').isUUID().withMessage('Each ID must be a valid UUID'),
];

/**
 * GET /api/call-outcomes
 * Get all call outcomes for the organization
 * Available to all authenticated users
 */
router.get('/', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const includeInactive = req.query.includeInactive === 'true';

    // Initialize defaults if needed and get all outcomes
    const outcomes = await callOutcomeService.getAll(organizationId, includeInactive);

    // If no outcomes exist, initialize defaults
    if (outcomes.length === 0) {
      const initializedOutcomes = await callOutcomeService.initializeDefaultOutcomes(organizationId);
      return ApiResponse.success(res, 'Call outcomes initialized', {
        outcomes: initializedOutcomes,
        total: initializedOutcomes.length,
      });
    }

    return ApiResponse.success(res, 'Call outcomes retrieved', {
      outcomes,
      total: outcomes.length,
    });
  } catch (error) {
    console.error('Error fetching call outcomes:', error);
    return ApiResponse.error(res, 'Failed to fetch call outcomes', 500);
  }
});

/**
 * GET /api/call-outcomes/telecaller-app
 * Get outcomes formatted for telecaller mobile app
 * Available to all authenticated users (telecallers need this)
 */
router.get('/telecaller-app', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const userId = req.user?.id;
    console.log(`[CallOutcomes] Telecaller app request - org: ${organizationId}, user: ${userId}`);

    const result = await callOutcomeService.getForTelecallerApp(organizationId);
    console.log(`[CallOutcomes] Returning ${result.outcomes.length} outcomes for org ${organizationId}`);

    return ApiResponse.success(res, 'Call outcomes retrieved for telecaller app', result);
  } catch (error) {
    console.error('Error fetching call outcomes for telecaller app:', error);
    return ApiResponse.error(res, 'Failed to fetch call outcomes', 500);
  }
});

/**
 * GET /api/call-outcomes/:id
 * Get a single call outcome by ID
 */
router.get('/:id', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const { id } = req.params;

    const outcome = await callOutcomeService.getById(id, organizationId);

    return ApiResponse.success(res, 'Call outcome retrieved', { outcome });
  } catch (error: any) {
    console.error('Error fetching call outcome:', error);
    if (error.name === 'NotFoundError') {
      return ApiResponse.error(res, error.message, 404);
    }
    return ApiResponse.error(res, 'Failed to fetch call outcome', 500);
  }
});

/**
 * POST /api/call-outcomes
 * Create a new custom call outcome
 * Admin only
 */
router.post(
  '/',
  authorize('admin', 'org_admin', 'super_admin'),
  validate(createOutcomeValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;
      const { name, slug, icon, color, notePrompt, requiresFollowUp, requiresSubOption, subOptions, mapsToStatus, order } =
        req.body;

      const outcome = await callOutcomeService.create(organizationId, {
        name,
        slug,
        icon,
        color,
        notePrompt,
        requiresFollowUp,
        requiresSubOption,
        subOptions,
        mapsToStatus,
        order,
      });

      return ApiResponse.success(res, 'Call outcome created successfully', { outcome }, 201);
    } catch (error: any) {
      console.error('Error creating call outcome:', error);
      if (error.name === 'ValidationError') {
        return ApiResponse.error(res, error.message, 400);
      }
      if (error.code === 'P2002') {
        return ApiResponse.error(res, 'An outcome with this slug already exists', 400);
      }
      return ApiResponse.error(res, 'Failed to create call outcome', 500);
    }
  }
);

/**
 * PUT /api/call-outcomes/:id
 * Update an existing call outcome
 * Admin only
 */
router.put(
  '/:id',
  authorize('admin', 'org_admin', 'super_admin'),
  validate(updateOutcomeValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;
      const { name, icon, color, notePrompt, requiresFollowUp, requiresSubOption, subOptions, mapsToStatus, isActive, order } =
        req.body;

      const outcome = await callOutcomeService.update(id, organizationId, {
        name,
        icon,
        color,
        notePrompt,
        requiresFollowUp,
        requiresSubOption,
        subOptions,
        mapsToStatus,
        isActive,
        order,
      });

      return ApiResponse.success(res, 'Call outcome updated successfully', { outcome });
    } catch (error: any) {
      console.error('Error updating call outcome:', error);
      if (error.name === 'NotFoundError') {
        return ApiResponse.error(res, error.message, 404);
      }
      return ApiResponse.error(res, 'Failed to update call outcome', 500);
    }
  }
);

/**
 * DELETE /api/call-outcomes/:id
 * Delete a call outcome (soft delete if in use)
 * Admin only
 */
router.delete(
  '/:id',
  authorize('admin', 'org_admin', 'super_admin'),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;

      await callOutcomeService.delete(id, organizationId);

      return ApiResponse.success(res, 'Call outcome deleted successfully');
    } catch (error: any) {
      console.error('Error deleting call outcome:', error);
      if (error.name === 'NotFoundError') {
        return ApiResponse.error(res, error.message, 404);
      }
      return ApiResponse.error(res, 'Failed to delete call outcome', 500);
    }
  }
);

/**
 * POST /api/call-outcomes/reorder
 * Reorder call outcomes
 * Admin only
 */
router.post(
  '/reorder',
  authorize('admin', 'org_admin', 'super_admin'),
  validate(reorderValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;
      const { orderedIds } = req.body;

      const outcomes = await callOutcomeService.reorder(organizationId, orderedIds);

      return ApiResponse.success(res, 'Call outcomes reordered successfully', {
        outcomes,
        total: outcomes.length,
      });
    } catch (error) {
      console.error('Error reordering call outcomes:', error);
      return ApiResponse.error(res, 'Failed to reorder call outcomes', 500);
    }
  }
);

/**
 * POST /api/call-outcomes/initialize
 * Initialize default outcomes for an organization
 * Admin only - useful for resetting to defaults
 */
router.post(
  '/initialize',
  authorize('admin', 'org_admin', 'super_admin'),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;

      const outcomes = await callOutcomeService.initializeDefaultOutcomes(organizationId);

      return ApiResponse.success(res, 'Default call outcomes initialized', {
        outcomes,
        total: outcomes.length,
      });
    } catch (error) {
      console.error('Error initializing call outcomes:', error);
      return ApiResponse.error(res, 'Failed to initialize call outcomes', 500);
    }
  }
);

export default router;
