/**
 * Field Permissions Routes
 * API endpoints for managing field-level access control
 */

import { Router, Request, Response } from 'express';
import { fieldPermissionsService, ENTITY_FIELDS } from '../services/field-permissions.service';
import { authenticate } from '../middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authenticate as any);

/**
 * GET /api/field-permissions/entities
 * Get all available entities and their fields
 */
router.get('/entities', async (_req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: ENTITY_FIELDS,
    });
  } catch (error: any) {
    console.error('Error fetching entities:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch entities',
    });
  }
});

/**
 * GET /api/field-permissions/roles/:roleId
 * Get all permissions for a role
 */
router.get('/roles/:roleId', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const { roleId } = req.params;

    const permissions = await fieldPermissionsService.getAllPermissionsForRole(
      organizationId,
      roleId
    );

    res.json({
      success: true,
      data: permissions,
    });
  } catch (error: any) {
    console.error('Error fetching role permissions:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch permissions',
    });
  }
});

/**
 * GET /api/field-permissions/roles/:roleId/:entity
 * Get permissions for a specific role and entity
 */
router.get('/roles/:roleId/:entity', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const { roleId, entity } = req.params;

    const permissions = await fieldPermissionsService.getPermissions(
      organizationId,
      roleId,
      entity
    );

    res.json({
      success: true,
      data: permissions,
    });
  } catch (error: any) {
    console.error('Error fetching entity permissions:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch permissions',
    });
  }
});

/**
 * PUT /api/field-permissions/roles/:roleId/:entity
 * Update permissions for a role and entity
 */
router.put('/roles/:roleId/:entity', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const { roleId, entity } = req.params;
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      return res.status(400).json({
        success: false,
        message: 'Permissions array is required',
      });
    }

    const result = await fieldPermissionsService.setPermissions(
      organizationId,
      roleId,
      entity,
      permissions
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error updating permissions:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update permissions',
    });
  }
});

/**
 * POST /api/field-permissions/copy
 * Copy permissions from one role to another
 */
router.post('/copy', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const { fromRoleId, toRoleId } = req.body;

    if (!fromRoleId || !toRoleId) {
      return res.status(400).json({
        success: false,
        message: 'fromRoleId and toRoleId are required',
      });
    }

    const result = await fieldPermissionsService.copyPermissions(
      organizationId,
      fromRoleId,
      toRoleId
    );

    res.json({
      success: true,
      data: result,
      message: `Copied ${result.copied} permissions`,
    });
  } catch (error: any) {
    console.error('Error copying permissions:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to copy permissions',
    });
  }
});

/**
 * POST /api/field-permissions/check
 * Check if user can view/edit a specific field
 */
router.post('/check', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const roleId = (req as any).user.roleId;
    const { entity, fieldName, mode } = req.body;

    if (!entity || !fieldName) {
      return res.status(400).json({
        success: false,
        message: 'entity and fieldName are required',
      });
    }

    const allowed = mode === 'edit'
      ? await fieldPermissionsService.canEditField(organizationId, roleId, entity, fieldName)
      : await fieldPermissionsService.canViewField(organizationId, roleId, entity, fieldName);

    res.json({
      success: true,
      data: { allowed },
    });
  } catch (error: any) {
    console.error('Error checking permission:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to check permission',
    });
  }
});

export default router;
