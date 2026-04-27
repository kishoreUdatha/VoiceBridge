/**
 * Industry Custom Fields Routes
 * API endpoints for managing industry-specific custom fields
 */

import { Router, Response } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { industryCustomFieldsService } from '../services/industry-custom-fields.service';
import { industryCacheService } from '../services/industry-cache.service';
import { getIndustryFieldConfig, getIndustryFields } from '../config/industry-fields.config';
import { OrganizationIndustry } from '@prisma/client';
import { ApiResponse } from '../utils/apiResponse';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticate);
router.use(tenantMiddleware);

/**
 * GET /api/industry-fields/schema
 * Get field schema for the current organization's industry
 */
router.get('/schema', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId;

    if (!organizationId) {
      return ApiResponse.error(res, 'Organization not found', 400);
    }

    const config = await industryCustomFieldsService.getFieldConfigForOrganization(organizationId);

    return ApiResponse.success(res, 'Field schema retrieved successfully', config);
  } catch (error) {
    console.error('Error getting field schema:', error);
    return ApiResponse.error(res, 'Failed to get field schema', 500);
  }
});

/**
 * GET /api/industry-fields/industries/:industry/fields
 * Get field schema for a specific industry (useful for previewing)
 * Supports both enum keys and slugs for dynamic industries
 */
router.get('/industries/:industry/fields', async (req: TenantRequest, res: Response) => {
  try {
    const { industry } = req.params;

    // Try enum first (backward compatibility)
    const validIndustries = Object.values(OrganizationIndustry);
    if (validIndustries.includes(industry as OrganizationIndustry)) {
      const config = getIndustryFieldConfig(industry as OrganizationIndustry);
      const fields = getIndustryFields(industry as OrganizationIndustry);
      return ApiResponse.success(res, 'Industry fields retrieved successfully', { config, fields });
    }

    // Try dynamic industry by slug
    const slug = industry.toLowerCase().replace(/_/g, '-');
    const cached = await industryCacheService.getIndustryConfig(slug);
    if (cached) {
      const config = {
        industry: slug,
        label: cached.name,
        icon: cached.icon,
        color: cached.color,
        fields: cached.fields.map((f) => ({
          key: f.key,
          label: f.label,
          type: f.fieldType,
          required: f.isRequired,
          placeholder: f.placeholder,
          options: f.options,
          min: f.minValue,
          max: f.maxValue,
          unit: f.unit,
          helpText: f.helpText,
          gridSpan: f.gridSpan,
        })),
      };
      return ApiResponse.success(res, 'Industry fields retrieved successfully', {
        config,
        fields: config.fields,
      });
    }

    return ApiResponse.error(res, 'Invalid industry', 400);
  } catch (error) {
    console.error('Error getting industry fields:', error);
    return ApiResponse.error(res, 'Failed to get industry fields', 500);
  }
});

/**
 * GET /api/industry-fields/leads/:leadId/custom-fields
 * Get custom fields for a specific lead
 */
router.get('/leads/:leadId/custom-fields', async (req: TenantRequest, res: Response) => {
  try {
    const { leadId } = req.params;
    const organizationId = req.organizationId;

    if (!organizationId) {
      return ApiResponse.error(res, 'Organization not found', 400);
    }

    const customFields = await industryCustomFieldsService.getLeadCustomFields(leadId);
    const config = await industryCustomFieldsService.getFieldConfigForOrganization(organizationId);

    return ApiResponse.success(res, 'Lead custom fields retrieved successfully', {
      customFields,
      fieldConfig: config,
    });
  } catch (error) {
    console.error('Error getting lead custom fields:', error);
    return ApiResponse.error(res, 'Failed to get lead custom fields', 500);
  }
});

/**
 * PATCH /api/industry-fields/leads/:leadId/custom-fields
 * Update custom fields for a specific lead
 */
router.patch('/leads/:leadId/custom-fields', async (req: TenantRequest, res: Response) => {
  try {
    const { leadId } = req.params;
    const { customFields, validateRequired = false } = req.body;
    const organizationId = req.organizationId;

    if (!organizationId) {
      return ApiResponse.error(res, 'Organization not found', 400);
    }

    if (!customFields || typeof customFields !== 'object') {
      return ApiResponse.error(res, 'customFields must be an object', 400);
    }

    const result = await industryCustomFieldsService.updateLeadCustomFields(
      leadId,
      organizationId,
      customFields,
      validateRequired
    );

    return ApiResponse.success(res, 'Custom fields updated successfully', {
      lead: result.lead,
      validationWarnings: result.validationWarnings,
    });
  } catch (error) {
    console.error('Error updating lead custom fields:', error);
    return ApiResponse.error(res, 'Failed to update lead custom fields', 500);
  }
});

/**
 * POST /api/industry-fields/leads/bulk-update
 * Bulk update custom fields for multiple leads
 */
router.post('/leads/bulk-update', authorize('admin', 'manager'), async (req: TenantRequest, res: Response) => {
  try {
    const { leadIds, customFields } = req.body;
    const organizationId = req.organizationId;

    if (!organizationId) {
      return ApiResponse.error(res, 'Organization not found', 400);
    }

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return ApiResponse.error(res, 'leadIds must be a non-empty array', 400);
    }

    if (!customFields || typeof customFields !== 'object') {
      return ApiResponse.error(res, 'customFields must be an object', 400);
    }

    const result = await industryCustomFieldsService.bulkUpdateCustomFields(
      leadIds,
      organizationId,
      customFields
    );

    return ApiResponse.success(
      res,
      `Updated ${result.updated} leads, ${result.failed.length} failed`,
      result
    );
  } catch (error) {
    console.error('Error bulk updating custom fields:', error);
    return ApiResponse.error(res, 'Failed to bulk update custom fields', 500);
  }
});

/**
 * POST /api/industry-fields/leads/search
 * Search leads by custom field values
 */
router.post('/leads/search', async (req: TenantRequest, res: Response) => {
  try {
    const { filters, page = 1, limit = 20 } = req.body;
    const organizationId = req.organizationId;

    if (!organizationId) {
      return ApiResponse.error(res, 'Organization not found', 400);
    }

    if (!Array.isArray(filters)) {
      return ApiResponse.error(res, 'filters must be an array', 400);
    }

    const result = await industryCustomFieldsService.searchByCustomFields(
      organizationId,
      filters,
      { page, limit }
    );

    return ApiResponse.success(res, 'Search completed successfully', {
      leads: result.leads,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    });
  } catch (error) {
    console.error('Error searching by custom fields:', error);
    return ApiResponse.error(res, 'Failed to search by custom fields', 500);
  }
});

/**
 * GET /api/industry-fields/analytics/:fieldKey
 * Get analytics/aggregations on a specific custom field
 */
router.get('/analytics/:fieldKey', async (req: TenantRequest, res: Response) => {
  try {
    const { fieldKey } = req.params;
    const organizationId = req.organizationId;

    if (!organizationId) {
      return ApiResponse.error(res, 'Organization not found', 400);
    }

    const analytics = await industryCustomFieldsService.getCustomFieldAnalytics(
      organizationId,
      fieldKey
    );

    return ApiResponse.success(res, 'Analytics retrieved successfully', analytics);
  } catch (error) {
    console.error('Error getting custom field analytics:', error);
    return ApiResponse.error(res, 'Failed to get custom field analytics', 500);
  }
});

/**
 * POST /api/industry-fields/validate
 * Validate custom fields against industry schema
 * Supports both enum keys and slugs for dynamic industries
 */
router.post('/validate', async (req: TenantRequest, res: Response) => {
  try {
    const { customFields, industry } = req.body;
    const organizationId = req.organizationId;

    let targetIndustry: OrganizationIndustry;

    if (industry) {
      // Try enum first
      const validIndustries = Object.values(OrganizationIndustry);
      if (validIndustries.includes(industry)) {
        targetIndustry = industry;
      } else {
        // Try dynamic industry
        const slug = industry.toLowerCase().replace(/_/g, '-');
        const exists = await industryCacheService.industryExists(slug);
        if (!exists) {
          return ApiResponse.error(res, 'Invalid industry', 400);
        }
        // For dynamic industries, use GENERAL validation with custom schema
        // A more complete implementation would build validation rules from cached fields
        targetIndustry = OrganizationIndustry.GENERAL;
      }
    } else if (organizationId) {
      const config = await industryCustomFieldsService.getFieldConfigForOrganization(organizationId);
      targetIndustry = config.industry;
    } else {
      return ApiResponse.error(res, 'Industry or organization required', 400);
    }

    const validation = industryCustomFieldsService.validateFields(targetIndustry, customFields);

    return ApiResponse.success(res, 'Validation completed', validation);
  } catch (error) {
    console.error('Error validating custom fields:', error);
    return ApiResponse.error(res, 'Failed to validate custom fields', 500);
  }
});

export default router;
