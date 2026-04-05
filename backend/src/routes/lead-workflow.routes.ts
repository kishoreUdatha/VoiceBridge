/**
 * Lead Workflow Routes
 * Handles workflow automation management and execution
 */

import { Router, Response } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, authorize } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import { ApiResponse } from '../utils/apiResponse';
import { leadWorkflowService } from '../services/lead-workflow.service';

const router = Router();

router.use(authenticate);
router.use(tenantMiddleware);

// ==================== Workflow CRUD ====================

/**
 * GET /api/lead-workflows
 * Get all workflows for the organization
 */
router.get('/', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const includeStats = req.query.includeStats === 'true';
    const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;

    const workflows = await leadWorkflowService.getWorkflows(organizationId, { includeStats, isActive });

    return ApiResponse.success(res, 'Workflows retrieved', {
      workflows,
      total: workflows.length,
    });
  } catch (error) {
    console.error('Error fetching workflows:', error);
    return ApiResponse.error(res, 'Failed to fetch workflows', 500);
  }
});

/**
 * GET /api/lead-workflows/:workflowId
 * Get a single workflow with recent enrollments
 */
router.get(
  '/:workflowId',
  validate([param('workflowId').isUUID()]),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;
      const { workflowId } = req.params;

      const workflow = await leadWorkflowService.getWorkflow(workflowId, organizationId);

      if (!workflow) {
        return ApiResponse.error(res, 'Workflow not found', 404);
      }

      return ApiResponse.success(res, 'Workflow retrieved', workflow);
    } catch (error) {
      console.error('Error fetching workflow:', error);
      return ApiResponse.error(res, 'Failed to fetch workflow', 500);
    }
  }
);

/**
 * GET /api/lead-workflows/:workflowId/stats
 * Get workflow statistics
 */
router.get(
  '/:workflowId/stats',
  validate([param('workflowId').isUUID()]),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;
      const { workflowId } = req.params;

      const stats = await leadWorkflowService.getWorkflowStats(workflowId, organizationId);

      return ApiResponse.success(res, 'Workflow statistics retrieved', stats);
    } catch (error: any) {
      console.error('Error fetching workflow stats:', error);
      return ApiResponse.error(res, error.message || 'Failed to fetch workflow statistics', 500);
    }
  }
);

/**
 * POST /api/lead-workflows
 * Create a new workflow
 */
router.post(
  '/',
  authorize('admin', 'manager'),
  validate([
    body('name').trim().notEmpty().isLength({ max: 100 }).withMessage('Name is required (max 100 chars)'),
    body('description').optional().trim().isLength({ max: 500 }),
    body('triggerType')
      .isIn(['LEAD_CREATED', 'STAGE_CHANGED', 'SCORE_THRESHOLD', 'TAG_ADDED', 'FORM_SUBMITTED', 'TIME_BASED', 'MANUAL'])
      .withMessage('Invalid trigger type'),
    body('triggerConfig').optional().isObject(),
    body('actions').isArray({ min: 1 }).withMessage('At least one action is required'),
    body('actions.*.type')
      .isIn([
        'SEND_EMAIL', 'SEND_SMS', 'SEND_WHATSAPP', 'ASSIGN_TO_USER', 'ASSIGN_TO_TEAM',
        'ADD_TAG', 'REMOVE_TAG', 'CHANGE_STAGE', 'UPDATE_FIELD', 'CREATE_TASK',
        'CREATE_FOLLOWUP', 'NOTIFY_USER', 'WEBHOOK'
      ])
      .withMessage('Invalid action type'),
    body('actions.*.config').isObject(),
    body('actions.*.delayMinutes').optional().isInt({ min: 0 }),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;

      const workflow = await leadWorkflowService.createWorkflow(organizationId, req.body);

      return ApiResponse.success(res, 'Workflow created', workflow, 201);
    } catch (error) {
      console.error('Error creating workflow:', error);
      return ApiResponse.error(res, 'Failed to create workflow', 500);
    }
  }
);

/**
 * PUT /api/lead-workflows/:workflowId
 * Update a workflow
 */
router.put(
  '/:workflowId',
  authorize('admin', 'manager'),
  validate([
    param('workflowId').isUUID(),
    body('name').optional().trim().notEmpty().isLength({ max: 100 }),
    body('description').optional().trim().isLength({ max: 500 }),
    body('triggerType').optional().isIn([
      'LEAD_CREATED', 'STAGE_CHANGED', 'SCORE_THRESHOLD', 'TAG_ADDED', 'FORM_SUBMITTED', 'TIME_BASED', 'MANUAL'
    ]),
    body('actions').optional().isArray({ min: 1 }),
    body('isActive').optional().isBoolean(),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;
      const { workflowId } = req.params;

      const workflow = await leadWorkflowService.updateWorkflow(workflowId, organizationId, req.body);

      return ApiResponse.success(res, 'Workflow updated', workflow);
    } catch (error) {
      console.error('Error updating workflow:', error);
      return ApiResponse.error(res, 'Failed to update workflow', 500);
    }
  }
);

/**
 * DELETE /api/lead-workflows/:workflowId
 * Delete a workflow
 */
router.delete(
  '/:workflowId',
  authorize('admin', 'manager'),
  validate([param('workflowId').isUUID()]),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;
      const { workflowId } = req.params;

      await leadWorkflowService.deleteWorkflow(workflowId, organizationId);

      return ApiResponse.success(res, 'Workflow deleted');
    } catch (error) {
      console.error('Error deleting workflow:', error);
      return ApiResponse.error(res, 'Failed to delete workflow', 500);
    }
  }
);

// ==================== Enrollment Management ====================

/**
 * POST /api/lead-workflows/:workflowId/enroll
 * Manually enroll a lead in a workflow
 */
router.post(
  '/:workflowId/enroll',
  validate([
    param('workflowId').isUUID(),
    body('leadId').isUUID().withMessage('Lead ID is required'),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const { workflowId } = req.params;
      const { leadId } = req.body;

      const enrollment = await leadWorkflowService.enrollLead(workflowId, leadId);

      return ApiResponse.success(res, 'Lead enrolled in workflow', enrollment, 201);
    } catch (error: any) {
      console.error('Error enrolling lead:', error);
      return ApiResponse.error(res, error.message || 'Failed to enroll lead', 400);
    }
  }
);

/**
 * POST /api/lead-workflows/enrollments/:enrollmentId/cancel
 * Cancel a workflow enrollment
 */
router.post(
  '/enrollments/:enrollmentId/cancel',
  validate([param('enrollmentId').isUUID()]),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;
      const { enrollmentId } = req.params;

      await leadWorkflowService.cancelEnrollment(enrollmentId, organizationId);

      return ApiResponse.success(res, 'Enrollment cancelled');
    } catch (error: any) {
      console.error('Error cancelling enrollment:', error);
      return ApiResponse.error(res, error.message || 'Failed to cancel enrollment', 400);
    }
  }
);

/**
 * POST /api/lead-workflows/enrollments/:enrollmentId/pause
 * Pause a workflow enrollment
 */
router.post(
  '/enrollments/:enrollmentId/pause',
  validate([param('enrollmentId').isUUID()]),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;
      const { enrollmentId } = req.params;

      await leadWorkflowService.pauseEnrollment(enrollmentId, organizationId);

      return ApiResponse.success(res, 'Enrollment paused');
    } catch (error: any) {
      console.error('Error pausing enrollment:', error);
      return ApiResponse.error(res, error.message || 'Failed to pause enrollment', 400);
    }
  }
);

/**
 * POST /api/lead-workflows/enrollments/:enrollmentId/resume
 * Resume a paused workflow enrollment
 */
router.post(
  '/enrollments/:enrollmentId/resume',
  validate([param('enrollmentId').isUUID()]),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;
      const { enrollmentId } = req.params;

      await leadWorkflowService.resumeEnrollment(enrollmentId, organizationId);

      return ApiResponse.success(res, 'Enrollment resumed');
    } catch (error: any) {
      console.error('Error resuming enrollment:', error);
      return ApiResponse.error(res, error.message || 'Failed to resume enrollment', 400);
    }
  }
);

// ==================== Trigger Handling ====================

/**
 * POST /api/lead-workflows/trigger
 * Manually trigger workflows for a lead
 */
router.post(
  '/trigger',
  validate([
    body('triggerType').isIn([
      'LEAD_CREATED', 'STAGE_CHANGED', 'SCORE_THRESHOLD', 'TAG_ADDED', 'FORM_SUBMITTED', 'MANUAL'
    ]),
    body('leadId').isUUID(),
    body('context').optional().isObject(),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;
      const { triggerType, leadId, context } = req.body;

      const result = await leadWorkflowService.handleTrigger(
        organizationId,
        triggerType,
        leadId,
        context
      );

      return ApiResponse.success(res, 'Trigger processed', result);
    } catch (error) {
      console.error('Error processing trigger:', error);
      return ApiResponse.error(res, 'Failed to process trigger', 500);
    }
  }
);

/**
 * POST /api/lead-workflows/process-pending
 * Process pending workflow steps (for cron job or manual execution)
 */
router.post(
  '/process-pending',
  authorize('admin'),
  async (req: TenantRequest, res: Response) => {
    try {
      const result = await leadWorkflowService.processPendingSteps();

      return ApiResponse.success(res, 'Pending steps processed', result);
    } catch (error) {
      console.error('Error processing pending steps:', error);
      return ApiResponse.error(res, 'Failed to process pending steps', 500);
    }
  }
);

export default router;
