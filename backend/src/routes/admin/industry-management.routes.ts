/**
 * Admin Industry Management Routes
 * API endpoints for managing dynamic industries (Super Admin only)
 */

import { Router, Response } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, authorize } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { ApiResponse } from '../../utils/apiResponse';
import { dynamicIndustryService } from '../../services/dynamic-industry.service';
import { industryCacheService } from '../../services/industry-cache.service';
import { VALID_FIELD_TYPES } from '../../types/industry.types';

const router = Router();

// All routes require authentication and super admin/org admin access
router.use(authenticate);
router.use(authorize('super_admin', 'org_admin'));

// =====================================================
// Validation Rules
// =====================================================

const createIndustryValidation = [
  body('name').trim().notEmpty().withMessage('Industry name is required'),
  body('slug')
    .optional()
    .trim()
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Slug must be lowercase alphanumeric with hyphens'),
  body('description').optional().trim(),
  body('icon').optional().trim(),
  body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Color must be a valid hex color'),
  body('defaultLabels').optional().isObject().withMessage('defaultLabels must be an object'),
  body('isActive').optional().isBoolean(),
];

const updateIndustryValidation = [
  param('slug').trim().notEmpty().withMessage('Industry slug is required'),
  body('name').optional().trim().notEmpty(),
  body('description').optional().trim(),
  body('icon').optional().trim(),
  body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Color must be a valid hex color'),
  body('defaultLabels').optional().isObject(),
  body('isActive').optional().isBoolean(),
];

const fieldTemplateValidation = [
  param('slug').trim().notEmpty().withMessage('Industry slug is required'),
  body('key')
    .trim()
    .notEmpty()
    .matches(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .withMessage('Field key must be a valid identifier'),
  body('label').trim().notEmpty().withMessage('Field label is required'),
  body('fieldType')
    .isIn(VALID_FIELD_TYPES)
    .withMessage(`Field type must be one of: ${VALID_FIELD_TYPES.join(', ')}`),
  body('isRequired').optional().isBoolean(),
  body('placeholder').optional().trim(),
  body('helpText').optional().trim(),
  body('options').optional().isArray(),
  body('minValue').optional().isNumeric(),
  body('maxValue').optional().isNumeric(),
  body('unit').optional().trim(),
  body('groupName').optional().trim(),
  body('displayOrder').optional().isInt({ min: 0 }),
  body('gridSpan').optional().isInt({ min: 1, max: 4 }),
];

const updateFieldTemplateValidation = [
  param('slug').trim().notEmpty().withMessage('Industry slug is required'),
  param('key').trim().notEmpty().withMessage('Field key is required'),
  body('label').optional().trim().notEmpty(),
  body('fieldType').optional().isIn(VALID_FIELD_TYPES),
  body('isRequired').optional().isBoolean(),
  body('placeholder').optional().trim(),
  body('helpText').optional().trim(),
  body('options').optional().isArray(),
  body('minValue').optional().isNumeric(),
  body('maxValue').optional().isNumeric(),
  body('unit').optional().trim(),
  body('groupName').optional().trim(),
  body('displayOrder').optional().isInt({ min: 0 }),
  body('gridSpan').optional().isInt({ min: 1, max: 4 }),
];

const stageTemplateValidation = [
  param('slug').trim().notEmpty().withMessage('Industry slug is required'),
  body('name').trim().notEmpty().withMessage('Stage name is required'),
  body('slug')
    .trim()
    .notEmpty()
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Stage slug must be lowercase alphanumeric with hyphens'),
  body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Color must be a valid hex color'),
  body('icon').optional().trim(),
  body('journeyOrder').isInt().withMessage('Journey order is required'),
  body('isDefault').optional().isBoolean(),
  body('isLostStage').optional().isBoolean(),
  body('autoSyncStatus').optional().isIn(['WON', 'LOST', null]),
];

const updateStageTemplateValidation = [
  param('slug').trim().notEmpty().withMessage('Industry slug is required'),
  param('stageSlug').trim().notEmpty().withMessage('Stage slug is required'),
  body('name').optional().trim().notEmpty(),
  body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Color must be a valid hex color'),
  body('icon').optional().trim(),
  body('journeyOrder').optional().isInt(),
  body('isDefault').optional().isBoolean(),
  body('isLostStage').optional().isBoolean(),
  body('autoSyncStatus').optional().isIn(['WON', 'LOST', null]),
];

const reorderFieldsValidation = [
  param('slug').trim().notEmpty().withMessage('Industry slug is required'),
  body('fieldKeys').isArray({ min: 1 }).withMessage('fieldKeys must be a non-empty array'),
  body('fieldKeys.*').isString().withMessage('Each field key must be a string'),
];

// =====================================================
// Industry CRUD Endpoints
// =====================================================

/**
 * GET /api/admin/industries
 * List all industries
 */
router.get(
  '/',
  [
    query('isActive').optional().isBoolean(),
    query('isSystem').optional().isBoolean(),
  ],
  async (req: any, res: Response) => {
    try {
      const filters = {
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
        isSystem: req.query.isSystem === 'true' ? true : req.query.isSystem === 'false' ? false : undefined,
      };

      const industries = await dynamicIndustryService.listIndustries(filters);

      return ApiResponse.success(res, 'Industries retrieved', {
        industries,
        total: industries.length,
      });
    } catch (error: any) {
      console.error('Error listing industries:', error);
      return ApiResponse.error(res, error.message || 'Failed to list industries', 500);
    }
  }
);

/**
 * POST /api/admin/industries
 * Create a new custom industry
 */
router.post(
  '/',
  validate(createIndustryValidation),
  async (req: any, res: Response) => {
    try {
      const industry = await dynamicIndustryService.createIndustry(req.body);

      return ApiResponse.success(res, 'Industry created successfully', { industry }, 201);
    } catch (error: any) {
      console.error('Error creating industry:', error);
      if (error.name === 'ValidationError') {
        return ApiResponse.error(res, error.message, 400);
      }
      return ApiResponse.error(res, error.message || 'Failed to create industry', 500);
    }
  }
);

/**
 * GET /api/admin/industries/:slug
 * Get industry details
 */
router.get(
  '/:slug',
  [param('slug').trim().notEmpty()],
  async (req: any, res: Response) => {
    try {
      const { slug } = req.params;
      const industry = await dynamicIndustryService.getIndustryBySlug(slug);

      if (!industry) {
        return ApiResponse.error(res, 'Industry not found', 404);
      }

      return ApiResponse.success(res, 'Industry retrieved', { industry });
    } catch (error: any) {
      console.error('Error getting industry:', error);
      return ApiResponse.error(res, error.message || 'Failed to get industry', 500);
    }
  }
);

/**
 * PUT /api/admin/industries/:slug
 * Update an industry
 */
router.put(
  '/:slug',
  validate(updateIndustryValidation),
  async (req: any, res: Response) => {
    try {
      const { slug } = req.params;
      const industry = await dynamicIndustryService.updateIndustry(slug, req.body);

      return ApiResponse.success(res, 'Industry updated successfully', { industry });
    } catch (error: any) {
      console.error('Error updating industry:', error);
      if (error.name === 'NotFoundError') {
        return ApiResponse.error(res, error.message, 404);
      }
      return ApiResponse.error(res, error.message || 'Failed to update industry', 500);
    }
  }
);

/**
 * DELETE /api/admin/industries/:slug
 * Delete a custom industry
 */
router.delete(
  '/:slug',
  [param('slug').trim().notEmpty()],
  async (req: any, res: Response) => {
    try {
      const { slug } = req.params;
      await dynamicIndustryService.deleteIndustry(slug);

      return ApiResponse.success(res, 'Industry deleted successfully');
    } catch (error: any) {
      console.error('Error deleting industry:', error);
      if (error.name === 'NotFoundError') {
        return ApiResponse.error(res, error.message, 404);
      }
      if (error.name === 'ValidationError') {
        return ApiResponse.error(res, error.message, 400);
      }
      return ApiResponse.error(res, error.message || 'Failed to delete industry', 500);
    }
  }
);

// =====================================================
// Field Template Endpoints
// =====================================================

/**
 * GET /api/admin/industries/:slug/fields
 * List field templates for an industry
 */
router.get(
  '/:slug/fields',
  [param('slug').trim().notEmpty()],
  async (req: any, res: Response) => {
    try {
      const { slug } = req.params;
      const fields = await dynamicIndustryService.getFieldTemplates(slug);

      return ApiResponse.success(res, 'Field templates retrieved', {
        fields,
        total: fields.length,
      });
    } catch (error: any) {
      console.error('Error listing field templates:', error);
      if (error.name === 'NotFoundError') {
        return ApiResponse.error(res, error.message, 404);
      }
      return ApiResponse.error(res, error.message || 'Failed to list field templates', 500);
    }
  }
);

/**
 * POST /api/admin/industries/:slug/fields
 * Add a field template to an industry
 */
router.post(
  '/:slug/fields',
  validate(fieldTemplateValidation),
  async (req: any, res: Response) => {
    try {
      const { slug } = req.params;
      const field = await dynamicIndustryService.addFieldTemplate(slug, req.body);

      return ApiResponse.success(res, 'Field template added successfully', { field }, 201);
    } catch (error: any) {
      console.error('Error adding field template:', error);
      if (error.name === 'NotFoundError') {
        return ApiResponse.error(res, error.message, 404);
      }
      if (error.name === 'ValidationError') {
        return ApiResponse.error(res, error.message, 400);
      }
      return ApiResponse.error(res, error.message || 'Failed to add field template', 500);
    }
  }
);

/**
 * PUT /api/admin/industries/:slug/fields/:key
 * Update a field template
 */
router.put(
  '/:slug/fields/:key',
  validate(updateFieldTemplateValidation),
  async (req: any, res: Response) => {
    try {
      const { slug, key } = req.params;
      const field = await dynamicIndustryService.updateFieldTemplate(slug, key, req.body);

      return ApiResponse.success(res, 'Field template updated successfully', { field });
    } catch (error: any) {
      console.error('Error updating field template:', error);
      if (error.name === 'NotFoundError') {
        return ApiResponse.error(res, error.message, 404);
      }
      return ApiResponse.error(res, error.message || 'Failed to update field template', 500);
    }
  }
);

/**
 * DELETE /api/admin/industries/:slug/fields/:key
 * Remove a field template
 */
router.delete(
  '/:slug/fields/:key',
  [param('slug').trim().notEmpty(), param('key').trim().notEmpty()],
  async (req: any, res: Response) => {
    try {
      const { slug, key } = req.params;
      await dynamicIndustryService.removeFieldTemplate(slug, key);

      return ApiResponse.success(res, 'Field template removed successfully');
    } catch (error: any) {
      console.error('Error removing field template:', error);
      if (error.name === 'NotFoundError') {
        return ApiResponse.error(res, error.message, 404);
      }
      return ApiResponse.error(res, error.message || 'Failed to remove field template', 500);
    }
  }
);

/**
 * POST /api/admin/industries/:slug/fields/reorder
 * Reorder field templates
 */
router.post(
  '/:slug/fields/reorder',
  validate(reorderFieldsValidation),
  async (req: any, res: Response) => {
    try {
      const { slug } = req.params;
      const { fieldKeys } = req.body;
      await dynamicIndustryService.reorderFields(slug, fieldKeys);

      return ApiResponse.success(res, 'Fields reordered successfully');
    } catch (error: any) {
      console.error('Error reordering fields:', error);
      if (error.name === 'NotFoundError') {
        return ApiResponse.error(res, error.message, 404);
      }
      return ApiResponse.error(res, error.message || 'Failed to reorder fields', 500);
    }
  }
);

// =====================================================
// Stage Template Endpoints
// =====================================================

/**
 * GET /api/admin/industries/:slug/stages
 * List stage templates for an industry
 */
router.get(
  '/:slug/stages',
  [param('slug').trim().notEmpty()],
  async (req: any, res: Response) => {
    try {
      const { slug } = req.params;
      const stages = await dynamicIndustryService.getStageTemplates(slug);

      return ApiResponse.success(res, 'Stage templates retrieved', {
        stages,
        total: stages.length,
      });
    } catch (error: any) {
      console.error('Error listing stage templates:', error);
      if (error.name === 'NotFoundError') {
        return ApiResponse.error(res, error.message, 404);
      }
      return ApiResponse.error(res, error.message || 'Failed to list stage templates', 500);
    }
  }
);

/**
 * POST /api/admin/industries/:slug/stages
 * Add a stage template to an industry
 */
router.post(
  '/:slug/stages',
  validate(stageTemplateValidation),
  async (req: any, res: Response) => {
    try {
      const { slug } = req.params;
      const stage = await dynamicIndustryService.addStageTemplate(slug, req.body);

      return ApiResponse.success(res, 'Stage template added successfully', { stage }, 201);
    } catch (error: any) {
      console.error('Error adding stage template:', error);
      if (error.name === 'NotFoundError') {
        return ApiResponse.error(res, error.message, 404);
      }
      if (error.name === 'ValidationError') {
        return ApiResponse.error(res, error.message, 400);
      }
      return ApiResponse.error(res, error.message || 'Failed to add stage template', 500);
    }
  }
);

/**
 * PUT /api/admin/industries/:slug/stages/:stageSlug
 * Update a stage template
 */
router.put(
  '/:slug/stages/:stageSlug',
  validate(updateStageTemplateValidation),
  async (req: any, res: Response) => {
    try {
      const { slug, stageSlug } = req.params;
      const stage = await dynamicIndustryService.updateStageTemplate(slug, stageSlug, req.body);

      return ApiResponse.success(res, 'Stage template updated successfully', { stage });
    } catch (error: any) {
      console.error('Error updating stage template:', error);
      if (error.name === 'NotFoundError') {
        return ApiResponse.error(res, error.message, 404);
      }
      return ApiResponse.error(res, error.message || 'Failed to update stage template', 500);
    }
  }
);

/**
 * DELETE /api/admin/industries/:slug/stages/:stageSlug
 * Remove a stage template
 */
router.delete(
  '/:slug/stages/:stageSlug',
  [param('slug').trim().notEmpty(), param('stageSlug').trim().notEmpty()],
  async (req: any, res: Response) => {
    try {
      const { slug, stageSlug } = req.params;
      await dynamicIndustryService.removeStageTemplate(slug, stageSlug);

      return ApiResponse.success(res, 'Stage template removed successfully');
    } catch (error: any) {
      console.error('Error removing stage template:', error);
      if (error.name === 'NotFoundError') {
        return ApiResponse.error(res, error.message, 404);
      }
      return ApiResponse.error(res, error.message || 'Failed to remove stage template', 500);
    }
  }
);

// =====================================================
// Import/Export Endpoints
// =====================================================

/**
 * GET /api/admin/industries/:slug/export
 * Export an industry as JSON
 */
router.get(
  '/:slug/export',
  [param('slug').trim().notEmpty()],
  async (req: any, res: Response) => {
    try {
      const { slug } = req.params;
      const exportData = await dynamicIndustryService.exportIndustry(slug);

      return ApiResponse.success(res, 'Industry exported', { export: exportData });
    } catch (error: any) {
      console.error('Error exporting industry:', error);
      if (error.name === 'NotFoundError') {
        return ApiResponse.error(res, error.message, 404);
      }
      return ApiResponse.error(res, error.message || 'Failed to export industry', 500);
    }
  }
);

/**
 * POST /api/admin/industries/import
 * Import an industry from JSON
 */
router.post(
  '/import',
  [
    body('slug').trim().notEmpty().withMessage('Slug is required'),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('fields').optional().isArray(),
    body('stages').optional().isArray(),
  ],
  async (req: any, res: Response) => {
    try {
      const industry = await dynamicIndustryService.importIndustry(req.body);

      return ApiResponse.success(res, 'Industry imported successfully', { industry }, 201);
    } catch (error: any) {
      console.error('Error importing industry:', error);
      if (error.name === 'ValidationError') {
        return ApiResponse.error(res, error.message, 400);
      }
      return ApiResponse.error(res, error.message || 'Failed to import industry', 500);
    }
  }
);

// =====================================================
// Cache Management Endpoints
// =====================================================

/**
 * GET /api/admin/industries/cache/stats
 * Get cache statistics
 */
router.get('/cache/stats', async (req: any, res: Response) => {
  try {
    const stats = industryCacheService.getStats();

    return ApiResponse.success(res, 'Cache stats retrieved', { stats });
  } catch (error: any) {
    console.error('Error getting cache stats:', error);
    return ApiResponse.error(res, 'Failed to get cache stats', 500);
  }
});

/**
 * POST /api/admin/industries/cache/warmup
 * Warm up the industry cache
 */
router.post('/cache/warmup', async (req: any, res: Response) => {
  try {
    await industryCacheService.warmUp();
    const stats = industryCacheService.getStats();

    return ApiResponse.success(res, 'Cache warmed up', { stats });
  } catch (error: any) {
    console.error('Error warming up cache:', error);
    return ApiResponse.error(res, 'Failed to warm up cache', 500);
  }
});

/**
 * POST /api/admin/industries/cache/invalidate
 * Invalidate all industry cache
 */
router.post('/cache/invalidate', async (req: any, res: Response) => {
  try {
    await industryCacheService.invalidateAll();

    return ApiResponse.success(res, 'Cache invalidated');
  } catch (error: any) {
    console.error('Error invalidating cache:', error);
    return ApiResponse.error(res, 'Failed to invalidate cache', 500);
  }
});

export default router;
