/**
 * Lead Stage Routes
 * Handles industry-specific lead stage management endpoints
 */

import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import { ApiResponse } from '../utils/apiResponse';
import { leadStageService } from '../services/lead-stage.service';
import { getIndustryOptions, LEAD_STAGE_TEMPLATES } from '../config/lead-stage-templates.config';
import { OrganizationIndustry } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(tenantMiddleware);

// Validation rules
const industryValidation = [
  body('industry')
    .isIn(Object.keys(OrganizationIndustry))
    .withMessage('Invalid industry type'),
  body('resetStages')
    .optional()
    .isBoolean()
    .withMessage('resetStages must be a boolean'),
];

const createStageValidation = [
  body('name').trim().notEmpty().withMessage('Stage name is required'),
  body('slug').optional().trim().isSlug().withMessage('Invalid slug format'),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Invalid color format'),
  body('order').optional().isInt().withMessage('Order must be an integer'),
  body('journeyOrder').optional().isInt().withMessage('Journey order must be an integer'),
  body('icon').optional().trim(),
  body('autoSyncStatus').optional().isIn(['WON', 'LOST']).withMessage('Auto sync status must be WON or LOST'),
];

const updateStageValidation = [
  param('stageId').isUUID().withMessage('Invalid stage ID'),
  body('name').optional().trim().notEmpty().withMessage('Stage name cannot be empty'),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Invalid color format'),
  body('order').optional().isInt().withMessage('Order must be an integer'),
  body('journeyOrder').optional().isInt().withMessage('Journey order must be an integer'),
  body('icon').optional().trim(),
  body('autoSyncStatus').optional().isIn(['WON', 'LOST', null]).withMessage('Auto sync status must be WON, LOST, or null'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];

const updateLeadStageValidation = [
  param('leadId').isUUID().withMessage('Invalid lead ID'),
  body('stageId').isUUID().withMessage('Invalid stage ID'),
];

/**
 * GET /api/lead-stages/templates
 * Get all available industry templates
 */
router.get('/templates', async (req: TenantRequest, res: Response) => {
  try {
    const options = getIndustryOptions();
    return ApiResponse.success(res, 'Industry templates retrieved', { industries: options });
  } catch (error) {
    console.error('Error fetching industry templates:', error);
    return ApiResponse.error(res, 'Failed to fetch industry templates', 500);
  }
});

/**
 * GET /api/lead-stages/templates/:industry
 * Get stages template for a specific industry (preview)
 */
router.get('/templates/:industry', async (req: TenantRequest, res: Response) => {
  try {
    const { industry } = req.params;

    if (!Object.keys(OrganizationIndustry).includes(industry)) {
      return ApiResponse.error(res, 'Invalid industry type', 400);
    }

    const config = LEAD_STAGE_TEMPLATES[industry as OrganizationIndustry];
    return ApiResponse.success(res, 'Industry template retrieved', {
      industry,
      label: config.label,
      description: config.description,
      icon: config.icon,
      color: config.color,
      stages: config.stages,
      lostStage: config.lostStage,
    });
  } catch (error) {
    console.error('Error fetching industry template:', error);
    return ApiResponse.error(res, 'Failed to fetch industry template', 500);
  }
});

/**
 * GET /api/lead-stages/industry
 * Get current organization's industry setting
 */
router.get('/industry', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const industry = await leadStageService.getOrganizationIndustry(organizationId);

    const config = industry ? LEAD_STAGE_TEMPLATES[industry] : LEAD_STAGE_TEMPLATES.GENERAL;

    return ApiResponse.success(res, 'Organization industry retrieved', {
      industry: industry || 'GENERAL',
      label: config.label,
      description: config.description,
      icon: config.icon,
      color: config.color,
    });
  } catch (error) {
    console.error('Error fetching organization industry:', error);
    return ApiResponse.error(res, 'Failed to fetch organization industry', 500);
  }
});

/**
 * PUT /api/lead-stages/industry
 * Set organization's industry and create default stages
 */
router.put('/industry', validate(industryValidation), async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const { industry, resetStages = false } = req.body;

    const result = await leadStageService.setOrganizationIndustry(
      organizationId,
      industry as OrganizationIndustry,
      resetStages
    );

    const config = LEAD_STAGE_TEMPLATES[industry as OrganizationIndustry];

    return ApiResponse.success(res, 'Organization industry updated successfully', {
      organization: {
        ...result.organization,
        industryLabel: config.label,
        industryDescription: config.description,
      },
      stages: result.stages,
      stagesCreated: result.stages.length,
    });
  } catch (error) {
    console.error('Error updating organization industry:', error);
    return ApiResponse.error(res, 'Failed to update organization industry', 500);
  }
});

/**
 * GET /api/lead-stages
 * Get all lead stages for current organization
 */
router.get('/', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const stages = await leadStageService.getOrganizationStages(organizationId);
    const industry = await leadStageService.getOrganizationIndustry(organizationId);

    return ApiResponse.success(res, 'Lead stages retrieved', {
      stages,
      industry: industry || 'GENERAL',
      total: stages.length,
    });
  } catch (error) {
    console.error('Error fetching lead stages:', error);
    return ApiResponse.error(res, 'Failed to fetch lead stages', 500);
  }
});

/**
 * GET /api/lead-stages/journey
 * Get journey stages for visualization (ordered)
 */
router.get('/journey', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const stages = await leadStageService.getJourneyStages(organizationId);
    const industry = await leadStageService.getOrganizationIndustry(organizationId);

    // Separate progress stages from lost/dropped stage
    const progressStages = stages.filter((s) => (s.journeyOrder || 0) >= 0);
    const lostStage = stages.find((s) => (s.journeyOrder || 0) < 0);

    return ApiResponse.success(res, 'Journey stages retrieved', {
      progressStages,
      lostStage,
      industry: industry || 'GENERAL',
    });
  } catch (error) {
    console.error('Error fetching journey stages:', error);
    return ApiResponse.error(res, 'Failed to fetch journey stages', 500);
  }
});

/**
 * POST /api/lead-stages
 * Create a custom lead stage
 */
router.post('/', validate(createStageValidation), async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const { name, slug, color, order, journeyOrder, icon, autoSyncStatus } = req.body;

    const stage = await leadStageService.createCustomStage(organizationId, {
      name,
      slug,
      color,
      order,
      journeyOrder,
      icon,
      autoSyncStatus,
    });

    return ApiResponse.success(res, 'Lead stage created successfully', { stage }, 201);
  } catch (error: any) {
    console.error('Error creating lead stage:', error);
    if (error.code === 'P2002') {
      return ApiResponse.error(res, 'A stage with this slug already exists', 400);
    }
    return ApiResponse.error(res, 'Failed to create lead stage', 500);
  }
});

/**
 * PUT /api/lead-stages/:stageId
 * Update a lead stage
 */
router.put('/:stageId', validate(updateStageValidation), async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const { stageId } = req.params;
    const { name, color, order, journeyOrder, icon, autoSyncStatus, isActive } = req.body;

    const stage = await leadStageService.updateStage(stageId, organizationId, {
      name,
      color,
      order,
      journeyOrder,
      icon,
      autoSyncStatus,
      isActive,
    });

    return ApiResponse.success(res, 'Lead stage updated successfully', { stage });
  } catch (error: any) {
    console.error('Error updating lead stage:', error);
    if (error.code === 'P2025') {
      return ApiResponse.error(res, 'Stage not found', 404);
    }
    return ApiResponse.error(res, 'Failed to update lead stage', 500);
  }
});

/**
 * DELETE /api/lead-stages/:stageId
 * Delete a lead stage (soft delete)
 */
router.delete('/:stageId', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const { stageId } = req.params;

    await leadStageService.deleteStage(stageId, organizationId);

    return ApiResponse.success(res, 'Lead stage deleted successfully');
  } catch (error: any) {
    console.error('Error deleting lead stage:', error);
    if (error.message?.includes('leads are using')) {
      return ApiResponse.error(res, error.message, 400);
    }
    return ApiResponse.error(res, 'Failed to delete lead stage', 500);
  }
});

/**
 * POST /api/lead-stages/reset
 * Reset stages to industry template defaults
 */
router.post('/reset', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const stages = await leadStageService.resetStagesToTemplate(organizationId);

    return ApiResponse.success(res, 'Lead stages reset to template defaults', {
      stages,
      stagesCreated: stages.length,
    });
  } catch (error) {
    console.error('Error resetting lead stages:', error);
    return ApiResponse.error(res, 'Failed to reset lead stages', 500);
  }
});

/**
 * PUT /api/lead-stages/lead/:leadId/stage
 * Update a lead's stage with auto-sync
 */
router.put(
  '/lead/:leadId/stage',
  validate(updateLeadStageValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;
      const { leadId } = req.params;
      const { stageId } = req.body;

      const result = await leadStageService.updateLeadStage(leadId, stageId, organizationId);

      return ApiResponse.success(res, 'Lead stage updated successfully', {
        lead: result.lead,
        autoSyncApplied: result.autoSyncApplied,
        message: result.autoSyncApplied
          ? `Lead stage updated and status auto-synced to ${result.lead.status}`
          : 'Lead stage updated',
      });
    } catch (error: any) {
      console.error('Error updating lead stage:', error);
      if (error.name === 'NotFoundError') {
        return ApiResponse.error(res, error.message, 404);
      }
      return ApiResponse.error(res, 'Failed to update lead stage', 500);
    }
  }
);

export default router;
