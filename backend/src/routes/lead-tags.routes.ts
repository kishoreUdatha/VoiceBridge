/**
 * Lead Tags Routes
 * Handles tag management and lead-tag assignments
 */

import { Router, Response } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, authorize } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import { ApiResponse } from '../utils/apiResponse';
import { leadTagsService } from '../services/lead-tags.service';

const router = Router();

router.use(authenticate);
router.use(tenantMiddleware);

// ==================== Tag CRUD ====================

/**
 * GET /api/lead-tags
 * Get all tags for the organization
 */
router.get('/', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const includeCount = req.query.includeCount === 'true';

    const tags = await leadTagsService.getTags(organizationId, includeCount);

    return ApiResponse.success(res, 'Tags retrieved', {
      tags,
      total: tags.length,
    });
  } catch (error) {
    console.error('Error fetching tags:', error);
    return ApiResponse.error(res, 'Failed to fetch tags', 500);
  }
});

/**
 * GET /api/lead-tags/stats
 * Get tag usage statistics
 */
router.get('/stats', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId!;

    const stats = await leadTagsService.getTagStats(organizationId);

    return ApiResponse.success(res, 'Tag statistics retrieved', stats);
  } catch (error) {
    console.error('Error fetching tag stats:', error);
    return ApiResponse.error(res, 'Failed to fetch tag statistics', 500);
  }
});

/**
 * GET /api/lead-tags/:tagId
 * Get a single tag
 */
router.get(
  '/:tagId',
  validate([param('tagId').isUUID()]),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;
      const { tagId } = req.params;

      const tag = await leadTagsService.getTag(tagId, organizationId);

      if (!tag) {
        return ApiResponse.error(res, 'Tag not found', 404);
      }

      return ApiResponse.success(res, 'Tag retrieved', tag);
    } catch (error) {
      console.error('Error fetching tag:', error);
      return ApiResponse.error(res, 'Failed to fetch tag', 500);
    }
  }
);

/**
 * POST /api/lead-tags
 * Create a new tag
 */
router.post(
  '/',
  validate([
    body('name').trim().notEmpty().isLength({ max: 50 }).withMessage('Name is required (max 50 chars)'),
    body('color').optional().isHexColor().withMessage('Invalid color format'),
    body('description').optional().trim().isLength({ max: 200 }),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;

      const tag = await leadTagsService.createTag(organizationId, req.body);

      return ApiResponse.success(res, 'Tag created', tag, 201);
    } catch (error: any) {
      console.error('Error creating tag:', error);
      if (error.code === 'P2002') {
        return ApiResponse.error(res, 'A tag with this name already exists', 400);
      }
      return ApiResponse.error(res, 'Failed to create tag', 500);
    }
  }
);

/**
 * PUT /api/lead-tags/:tagId
 * Update a tag
 */
router.put(
  '/:tagId',
  validate([
    param('tagId').isUUID(),
    body('name').optional().trim().notEmpty().isLength({ max: 50 }),
    body('color').optional().isHexColor(),
    body('description').optional().trim().isLength({ max: 200 }),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;
      const { tagId } = req.params;

      const tag = await leadTagsService.updateTag(tagId, organizationId, req.body);

      return ApiResponse.success(res, 'Tag updated', tag);
    } catch (error: any) {
      console.error('Error updating tag:', error);
      if (error.code === 'P2002') {
        return ApiResponse.error(res, 'A tag with this name already exists', 400);
      }
      return ApiResponse.error(res, 'Failed to update tag', 500);
    }
  }
);

/**
 * DELETE /api/lead-tags/:tagId
 * Delete a tag
 */
router.delete(
  '/:tagId',
  authorize('admin', 'manager'),
  validate([param('tagId').isUUID()]),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;
      const { tagId } = req.params;

      await leadTagsService.deleteTag(tagId, organizationId);

      return ApiResponse.success(res, 'Tag deleted');
    } catch (error: any) {
      console.error('Error deleting tag:', error);
      return ApiResponse.error(res, error.message || 'Failed to delete tag', 400);
    }
  }
);

// ==================== Lead-Tag Assignments ====================

/**
 * GET /api/lead-tags/:tagId/leads
 * Get all leads with a specific tag
 */
router.get(
  '/:tagId/leads',
  validate([
    param('tagId').isUUID(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;
      const { tagId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await leadTagsService.getLeadsByTag(tagId, organizationId, { limit, offset });

      return ApiResponse.success(res, 'Leads retrieved', result);
    } catch (error) {
      console.error('Error fetching leads by tag:', error);
      return ApiResponse.error(res, 'Failed to fetch leads', 500);
    }
  }
);

/**
 * POST /api/lead-tags/filter
 * Get leads by multiple tags
 */
router.post(
  '/filter',
  validate([
    body('tagIds').isArray({ min: 1 }).withMessage('At least one tag ID is required'),
    body('tagIds.*').isUUID(),
    body('logic').optional().isIn(['AND', 'OR']),
    body('limit').optional().isInt({ min: 1, max: 100 }),
    body('offset').optional().isInt({ min: 0 }),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;
      const { tagIds, logic = 'OR', limit = 50, offset = 0 } = req.body;

      const result = await leadTagsService.getLeadsByTags(tagIds, organizationId, logic, {
        limit,
        offset,
      });

      return ApiResponse.success(res, 'Leads retrieved', result);
    } catch (error) {
      console.error('Error filtering leads by tags:', error);
      return ApiResponse.error(res, 'Failed to filter leads', 500);
    }
  }
);

/**
 * GET /api/lead-tags/lead/:leadId
 * Get tags for a specific lead
 */
router.get(
  '/lead/:leadId',
  validate([param('leadId').isUUID()]),
  async (req: TenantRequest, res: Response) => {
    try {
      const { leadId } = req.params;

      const tags = await leadTagsService.getLeadTags(leadId);

      return ApiResponse.success(res, 'Lead tags retrieved', {
        tags,
        total: tags.length,
      });
    } catch (error) {
      console.error('Error fetching lead tags:', error);
      return ApiResponse.error(res, 'Failed to fetch lead tags', 500);
    }
  }
);

/**
 * POST /api/lead-tags/lead/:leadId/assign
 * Assign tags to a lead
 */
router.post(
  '/lead/:leadId/assign',
  validate([
    param('leadId').isUUID(),
    body('tagIds').isArray({ min: 1 }).withMessage('At least one tag ID is required'),
    body('tagIds.*').isUUID(),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;
      const { leadId } = req.params;
      const { tagIds } = req.body;

      const assignments = await leadTagsService.assignTagsToLead(leadId, tagIds, organizationId);

      return ApiResponse.success(res, 'Tags assigned', {
        assignments,
        total: assignments.length,
      });
    } catch (error: any) {
      console.error('Error assigning tags:', error);
      return ApiResponse.error(res, error.message || 'Failed to assign tags', 400);
    }
  }
);

/**
 * POST /api/lead-tags/lead/:leadId/remove
 * Remove tags from a lead
 */
router.post(
  '/lead/:leadId/remove',
  validate([
    param('leadId').isUUID(),
    body('tagIds').isArray({ min: 1 }).withMessage('At least one tag ID is required'),
    body('tagIds.*').isUUID(),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;
      const { leadId } = req.params;
      const { tagIds } = req.body;

      await leadTagsService.removeTagsFromLead(leadId, tagIds, organizationId);

      return ApiResponse.success(res, 'Tags removed');
    } catch (error: any) {
      console.error('Error removing tags:', error);
      return ApiResponse.error(res, error.message || 'Failed to remove tags', 400);
    }
  }
);

/**
 * PUT /api/lead-tags/lead/:leadId/replace
 * Replace all tags on a lead
 */
router.put(
  '/lead/:leadId/replace',
  validate([
    param('leadId').isUUID(),
    body('tagIds').isArray().withMessage('Tag IDs must be an array'),
    body('tagIds.*').isUUID(),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;
      const { leadId } = req.params;
      const { tagIds } = req.body;

      const tags = await leadTagsService.replaceLeadTags(leadId, tagIds, organizationId);

      return ApiResponse.success(res, 'Lead tags replaced', {
        tags,
        total: tags.length,
      });
    } catch (error: any) {
      console.error('Error replacing tags:', error);
      return ApiResponse.error(res, error.message || 'Failed to replace tags', 400);
    }
  }
);

// ==================== Bulk Operations ====================

/**
 * POST /api/lead-tags/:tagId/bulk-assign
 * Bulk assign a tag to multiple leads
 */
router.post(
  '/:tagId/bulk-assign',
  validate([
    param('tagId').isUUID(),
    body('leadIds').isArray({ min: 1, max: 1000 }).withMessage('Lead IDs required (max 1000)'),
    body('leadIds.*').isUUID(),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;
      const { tagId } = req.params;
      const { leadIds } = req.body;

      const result = await leadTagsService.bulkAssignTag(tagId, leadIds, organizationId);

      return ApiResponse.success(res, 'Bulk tag assignment completed', result);
    } catch (error: any) {
      console.error('Error in bulk tag assignment:', error);
      return ApiResponse.error(res, error.message || 'Failed to bulk assign tag', 400);
    }
  }
);

/**
 * POST /api/lead-tags/:tagId/bulk-remove
 * Bulk remove a tag from multiple leads
 */
router.post(
  '/:tagId/bulk-remove',
  validate([
    param('tagId').isUUID(),
    body('leadIds').isArray({ min: 1, max: 1000 }).withMessage('Lead IDs required (max 1000)'),
    body('leadIds.*').isUUID(),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;
      const { tagId } = req.params;
      const { leadIds } = req.body;

      const result = await leadTagsService.bulkRemoveTag(tagId, leadIds, organizationId);

      return ApiResponse.success(res, 'Bulk tag removal completed', result);
    } catch (error: any) {
      console.error('Error in bulk tag removal:', error);
      return ApiResponse.error(res, error.message || 'Failed to bulk remove tag', 400);
    }
  }
);

/**
 * POST /api/lead-tags/create-defaults
 * Create default system tags
 */
router.post(
  '/create-defaults',
  authorize('admin'),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;

      const tags = await leadTagsService.createDefaultTags(organizationId);

      return ApiResponse.success(res, 'Default tags created', {
        tags,
        total: tags.length,
      });
    } catch (error) {
      console.error('Error creating default tags:', error);
      return ApiResponse.error(res, 'Failed to create default tags', 500);
    }
  }
);

export default router;
