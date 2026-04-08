/**
 * Role Management Routes
 * API endpoints for managing roles and permissions
 */

import { Router, Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import { roleService } from '../services/role.service';
import { validate } from '../middlewares/validate';
import { authenticate, authorize } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { ApiResponse } from '../utils/apiResponse';

const router = Router();

// Apply authentication and tenant middleware to all routes
router.use(authenticate);
router.use(tenantMiddleware);

// All role management requires admin access
router.use(authorize('admin'));

// Get all roles
router.get('/', async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const roles = await roleService.getRoles(req.organizationId!);
    ApiResponse.success(res, 'Roles retrieved successfully', roles);
  } catch (error) {
    next(error);
  }
});

// Get permission categories (for UI)
router.get('/permissions', async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const categories = roleService.getPermissionCategories();
    ApiResponse.success(res, 'Permission categories retrieved', categories);
  } catch (error) {
    next(error);
  }
});

// Get a single role
router.get(
  '/:id',
  validate([param('id').isUUID().withMessage('Invalid role ID')]),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const role = await roleService.getRole(req.params.id, req.organizationId!);
      ApiResponse.success(res, 'Role retrieved successfully', role);
    } catch (error) {
      next(error);
    }
  }
);

// Get users with a specific role
router.get(
  '/:id/users',
  validate([
    param('id').isUUID().withMessage('Invalid role ID'),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ]),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await roleService.getRoleUsers(req.params.id, req.organizationId!, page, limit);
      ApiResponse.success(res, 'Role users retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  }
);

// Create a new role
router.post(
  '/',
  validate([
    body('name').trim().notEmpty().withMessage('Role name is required'),
    body('slug')
      .optional()
      .trim()
      .matches(/^[a-z0-9_]+$/)
      .withMessage('Slug must contain only lowercase letters, numbers, and underscores'),
    body('description').optional().trim(),
    body('permissions').optional().isArray().withMessage('Permissions must be an array'),
  ]),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const slug = req.body.slug || req.body.name.toLowerCase().replace(/\s+/g, '_');
      const role = await roleService.createRole({
        organizationId: req.organizationId!,
        name: req.body.name,
        slug,
        description: req.body.description,
        permissions: req.body.permissions,
      });
      ApiResponse.created(res, 'Role created successfully', role);
    } catch (error) {
      next(error);
    }
  }
);

// Update a role
router.put(
  '/:id',
  validate([
    param('id').isUUID().withMessage('Invalid role ID'),
    body('name').optional().trim().notEmpty().withMessage('Role name cannot be empty'),
    body('description').optional().trim(),
    body('permissions').optional().isArray().withMessage('Permissions must be an array'),
  ]),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const role = await roleService.updateRole(req.params.id, req.organizationId!, {
        name: req.body.name,
        description: req.body.description,
        permissions: req.body.permissions,
      });
      ApiResponse.success(res, 'Role updated successfully', role);
    } catch (error) {
      next(error);
    }
  }
);

// Update role permissions only
router.put(
  '/:id/permissions',
  validate([
    param('id').isUUID().withMessage('Invalid role ID'),
    body('permissions').isArray().withMessage('Permissions array is required'),
  ]),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const role = await roleService.updatePermissions(
        req.params.id,
        req.organizationId!,
        req.body.permissions
      );
      ApiResponse.success(res, 'Role permissions updated successfully', role);
    } catch (error) {
      next(error);
    }
  }
);

// Clone a role
router.post(
  '/:id/clone',
  validate([
    param('id').isUUID().withMessage('Invalid role ID'),
    body('name').trim().notEmpty().withMessage('New role name is required'),
  ]),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const role = await roleService.cloneRole(req.params.id, req.organizationId!, req.body.name);
      ApiResponse.created(res, 'Role cloned successfully', role);
    } catch (error) {
      next(error);
    }
  }
);

// Delete a role
router.delete(
  '/:id',
  validate([param('id').isUUID().withMessage('Invalid role ID')]),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const result = await roleService.deleteRole(req.params.id, req.organizationId!);
      ApiResponse.success(res, result.message, result);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
