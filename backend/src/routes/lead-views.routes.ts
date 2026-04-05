/**
 * Lead Views Routes
 * Handles saved views and custom lead list configurations
 */

import { Router, Response } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, authorize } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import { ApiResponse } from '../utils/apiResponse';
import { leadViewsService } from '../services/lead-views.service';

const router = Router();

router.use(authenticate);
router.use(tenantMiddleware);

/**
 * GET /api/lead-views
 * Get all views for the current user
 */
router.get('/', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const userId = req.user!.id;

    const views = await leadViewsService.getViews(organizationId, userId);

    return ApiResponse.success(res, 'Views retrieved', {
      views,
      total: views.length,
    });
  } catch (error) {
    console.error('Error fetching views:', error);
    return ApiResponse.error(res, 'Failed to fetch views', 500);
  }
});

/**
 * GET /api/lead-views/default
 * Get the default view for the current user
 */
router.get('/default', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const userId = req.user!.id;

    const view = await leadViewsService.getDefaultView(organizationId, userId);

    if (!view) {
      return ApiResponse.success(res, 'No default view set', null);
    }

    return ApiResponse.success(res, 'Default view retrieved', view);
  } catch (error) {
    console.error('Error fetching default view:', error);
    return ApiResponse.error(res, 'Failed to fetch default view', 500);
  }
});

/**
 * GET /api/lead-views/:viewId
 * Get a single view
 */
router.get(
  '/:viewId',
  validate([param('viewId').isUUID()]),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;
      const userId = req.user!.id;
      const { viewId } = req.params;

      const view = await leadViewsService.getView(viewId, organizationId, userId);

      if (!view) {
        return ApiResponse.error(res, 'View not found', 404);
      }

      return ApiResponse.success(res, 'View retrieved', view);
    } catch (error) {
      console.error('Error fetching view:', error);
      return ApiResponse.error(res, 'Failed to fetch view', 500);
    }
  }
);

/**
 * POST /api/lead-views
 * Create a new view
 */
router.post(
  '/',
  validate([
    body('name').trim().notEmpty().isLength({ max: 100 }).withMessage('Name is required (max 100 chars)'),
    body('description').optional().trim().isLength({ max: 500 }),
    body('filters').optional().isArray(),
    body('filters.*.field').optional().isString(),
    body('filters.*.operator').optional().isString(),
    body('sortField').optional().isString(),
    body('sortOrder').optional().isIn(['asc', 'desc']),
    body('columns').optional().isArray(),
    body('groupBy').optional().isString(),
    body('isShared').optional().isBoolean(),
    body('isDefault').optional().isBoolean(),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;
      const userId = req.user!.id;

      const view = await leadViewsService.createView(organizationId, userId, req.body);

      return ApiResponse.success(res, 'View created', view, 201);
    } catch (error) {
      console.error('Error creating view:', error);
      return ApiResponse.error(res, 'Failed to create view', 500);
    }
  }
);

/**
 * PUT /api/lead-views/:viewId
 * Update a view
 */
router.put(
  '/:viewId',
  validate([
    param('viewId').isUUID(),
    body('name').optional().trim().notEmpty().isLength({ max: 100 }),
    body('description').optional().trim().isLength({ max: 500 }),
    body('filters').optional().isArray(),
    body('sortField').optional().isString(),
    body('sortOrder').optional().isIn(['asc', 'desc']),
    body('columns').optional().isArray(),
    body('groupBy').optional(),
    body('isShared').optional().isBoolean(),
    body('isDefault').optional().isBoolean(),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;
      const userId = req.user!.id;
      const { viewId } = req.params;

      const view = await leadViewsService.updateView(viewId, organizationId, userId, req.body);

      return ApiResponse.success(res, 'View updated', view);
    } catch (error: any) {
      console.error('Error updating view:', error);
      return ApiResponse.error(res, error.message || 'Failed to update view', 400);
    }
  }
);

/**
 * DELETE /api/lead-views/:viewId
 * Delete a view
 */
router.delete(
  '/:viewId',
  validate([param('viewId').isUUID()]),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;
      const userId = req.user!.id;
      const { viewId } = req.params;

      await leadViewsService.deleteView(viewId, organizationId, userId);

      return ApiResponse.success(res, 'View deleted');
    } catch (error: any) {
      console.error('Error deleting view:', error);
      return ApiResponse.error(res, error.message || 'Failed to delete view', 400);
    }
  }
);

/**
 * GET /api/lead-views/:viewId/apply
 * Apply a view and get leads
 */
router.get(
  '/:viewId/apply',
  validate([
    param('viewId').isUUID(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;
      const userId = req.user!.id;
      const { viewId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const result = await leadViewsService.applyView(viewId, organizationId, userId, { page, limit });

      return ApiResponse.success(res, 'View applied', {
        ...result,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
        },
      });
    } catch (error: any) {
      console.error('Error applying view:', error);
      return ApiResponse.error(res, error.message || 'Failed to apply view', 400);
    }
  }
);

/**
 * POST /api/lead-views/create-defaults
 * Create default system views
 */
router.post(
  '/create-defaults',
  authorize('admin'),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;

      const views = await leadViewsService.createDefaultViews(organizationId);

      return ApiResponse.success(res, 'Default views created', {
        views,
        total: views.length,
      });
    } catch (error) {
      console.error('Error creating default views:', error);
      return ApiResponse.error(res, 'Failed to create default views', 500);
    }
  }
);

export default router;
