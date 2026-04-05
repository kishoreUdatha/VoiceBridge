/**
 * Lead Deduplication Routes
 * Handles finding, grouping, and merging duplicate leads
 */

import { Router, Response } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import { ApiResponse } from '../utils/apiResponse';
import { leadDeduplicationService } from '../services/lead-deduplication.service';

const router = Router();

router.use(authenticate);
router.use(tenantMiddleware);

/**
 * GET /api/lead-deduplication/check
 * Check for duplicates before creating a lead
 */
router.get(
  '/check',
  validate([
    query('phone').optional().trim(),
    query('email').optional().trim().isEmail(),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;
      const { phone, email } = req.query;

      if (!phone && !email) {
        return ApiResponse.error(res, 'Phone or email is required', 400);
      }

      const result = await leadDeduplicationService.checkBeforeCreate(
        organizationId,
        phone as string,
        email as string
      );

      return ApiResponse.success(res, 'Duplicate check completed', result);
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      return ApiResponse.error(res, 'Failed to check for duplicates', 500);
    }
  }
);

/**
 * GET /api/lead-deduplication/groups
 * Get all duplicate groups
 */
router.get(
  '/groups',
  validate([query('status').optional().isIn(['PENDING', 'MERGED', 'IGNORED'])]),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;
      const status = req.query.status as string | undefined;

      const groups = await leadDeduplicationService.getDuplicateGroups(organizationId, status);

      return ApiResponse.success(res, 'Duplicate groups retrieved', {
        groups,
        total: groups.length,
      });
    } catch (error) {
      console.error('Error fetching duplicate groups:', error);
      return ApiResponse.error(res, 'Failed to fetch duplicate groups', 500);
    }
  }
);

/**
 * GET /api/lead-deduplication/lead/:leadId
 * Find duplicates for a specific lead
 */
router.get(
  '/lead/:leadId',
  validate([param('leadId').isUUID()]),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;
      const { leadId } = req.params;

      const duplicates = await leadDeduplicationService.findDuplicatesForLead(
        leadId,
        organizationId
      );

      return ApiResponse.success(res, 'Duplicates found', {
        duplicates,
        total: duplicates.length,
      });
    } catch (error: any) {
      console.error('Error finding duplicates:', error);
      return ApiResponse.error(res, error.message || 'Failed to find duplicates', 500);
    }
  }
);

/**
 * POST /api/lead-deduplication/auto-detect
 * Run auto-detection for all leads
 */
router.post('/auto-detect', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId!;

    const result = await leadDeduplicationService.autoDetectDuplicates(organizationId);

    return ApiResponse.success(res, 'Auto-detection completed', result);
  } catch (error) {
    console.error('Error running auto-detection:', error);
    return ApiResponse.error(res, 'Failed to run auto-detection', 500);
  }
});

/**
 * POST /api/lead-deduplication/merge
 * Merge duplicate leads
 */
router.post(
  '/merge',
  validate([
    body('primaryLeadId').isUUID().withMessage('Primary lead ID is required'),
    body('duplicateLeadIds')
      .isArray({ min: 1 })
      .withMessage('At least one duplicate lead ID is required'),
    body('duplicateLeadIds.*').isUUID().withMessage('Invalid lead ID'),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;
      const { primaryLeadId, duplicateLeadIds } = req.body;

      const result = await leadDeduplicationService.mergeDuplicates(
        primaryLeadId,
        duplicateLeadIds,
        organizationId
      );

      return ApiResponse.success(res, 'Leads merged successfully', result);
    } catch (error: any) {
      console.error('Error merging leads:', error);
      return ApiResponse.error(res, error.message || 'Failed to merge leads', 500);
    }
  }
);

/**
 * POST /api/lead-deduplication/groups/:groupId/ignore
 * Ignore a duplicate group
 */
router.post(
  '/groups/:groupId/ignore',
  validate([param('groupId').isUUID()]),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;
      const { groupId } = req.params;

      await leadDeduplicationService.ignoreDuplicateGroup(groupId, organizationId);

      return ApiResponse.success(res, 'Duplicate group ignored');
    } catch (error) {
      console.error('Error ignoring duplicate group:', error);
      return ApiResponse.error(res, 'Failed to ignore duplicate group', 500);
    }
  }
);

/**
 * GET /api/lead-deduplication/lead/:leadId/history
 * Get merge history for a lead
 */
router.get(
  '/lead/:leadId/history',
  validate([param('leadId').isUUID()]),
  async (req: TenantRequest, res: Response) => {
    try {
      const { leadId } = req.params;

      const history = await leadDeduplicationService.getMergeHistory(leadId);

      return ApiResponse.success(res, 'Merge history retrieved', {
        history,
        total: history.length,
      });
    } catch (error) {
      console.error('Error fetching merge history:', error);
      return ApiResponse.error(res, 'Failed to fetch merge history', 500);
    }
  }
);

export default router;
