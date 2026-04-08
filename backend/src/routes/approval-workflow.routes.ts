/**
 * Approval Workflow Routes
 * API endpoints for managing approval workflows and requests
 */

import { Router, Response } from 'express';
import { body, param, query } from 'express-validator';
import { TenantRequest, authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { approvalWorkflowService } from '../services/approval-workflow.service';
import { ApprovalEntityType, ApprovalStatus, ApprovalDecision, ApproverType } from '@prisma/client';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// ==================== WORKFLOW MANAGEMENT ====================

/**
 * Create a new approval workflow
 * POST /api/approvals/workflows
 */
router.post(
  '/workflows',
  validate([
    body('name').notEmpty().withMessage('Workflow name is required'),
    body('entityType')
      .isIn(Object.values(ApprovalEntityType))
      .withMessage('Invalid entity type'),
    body('steps')
      .isArray({ min: 1 })
      .withMessage('At least one approval step is required'),
    body('steps.*.name').notEmpty().withMessage('Step name is required'),
    body('steps.*.approverType')
      .isIn(Object.values(ApproverType))
      .withMessage('Invalid approver type'),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;
      const userId = req.user!.id;

      const workflow = await approvalWorkflowService.createWorkflow(
        organizationId,
        userId,
        req.body
      );

      res.status(201).json({
        success: true,
        message: 'Workflow created successfully',
        data: workflow,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * Get all workflows
 * GET /api/approvals/workflows
 */
router.get('/workflows', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const entityType = req.query.entityType as ApprovalEntityType | undefined;

    const workflows = await approvalWorkflowService.getWorkflows(
      organizationId,
      entityType
    );

    res.json({
      success: true,
      data: workflows,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * Get a single workflow
 * GET /api/approvals/workflows/:id
 */
router.get(
  '/workflows/:id',
  validate([param('id').isUUID().withMessage('Invalid workflow ID')]),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;

      const workflow = await approvalWorkflowService.getWorkflow(
        organizationId,
        req.params.id
      );

      if (!workflow) {
        return res.status(404).json({
          success: false,
          message: 'Workflow not found',
        });
      }

      res.json({
        success: true,
        data: workflow,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * Update a workflow
 * PUT /api/approvals/workflows/:id
 */
router.put(
  '/workflows/:id',
  validate([param('id').isUUID().withMessage('Invalid workflow ID')]),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;

      const workflow = await approvalWorkflowService.updateWorkflow(
        organizationId,
        req.params.id,
        req.body
      );

      res.json({
        success: true,
        message: 'Workflow updated successfully',
        data: workflow,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * Delete a workflow
 * DELETE /api/approvals/workflows/:id
 */
router.delete(
  '/workflows/:id',
  validate([param('id').isUUID().withMessage('Invalid workflow ID')]),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;

      await approvalWorkflowService.deleteWorkflow(organizationId, req.params.id);

      res.json({
        success: true,
        message: 'Workflow deleted successfully',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// ==================== APPROVAL REQUESTS ====================

/**
 * Submit an item for approval
 * POST /api/approvals/requests
 */
router.post(
  '/requests',
  validate([
    body('entityType')
      .isIn(Object.values(ApprovalEntityType))
      .withMessage('Invalid entity type'),
    body('entityId').notEmpty().withMessage('Entity ID is required'),
    body('title').notEmpty().withMessage('Title is required'),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;
      const userId = req.user!.id;

      const request = await approvalWorkflowService.submitForApproval(
        organizationId,
        userId,
        req.body
      );

      res.status(201).json({
        success: true,
        message: 'Request submitted for approval',
        data: request,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * Get all approval requests with filters
 * GET /api/approvals/requests
 */
router.get('/requests', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const {
      status,
      entityType,
      submittedById,
      dateFrom,
      dateTo,
      page,
      limit,
    } = req.query;

    const result = await approvalWorkflowService.getRequests(organizationId, {
      status: status as ApprovalStatus,
      entityType: entityType as ApprovalEntityType,
      submittedById: submittedById as string,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20,
    });

    res.json({
      success: true,
      data: result.requests,
      pagination: result.pagination,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * Get pending approvals for current user
 * GET /api/approvals/pending
 */
router.get('/pending', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const userId = req.user!.id;

    const requests = await approvalWorkflowService.getPendingApprovals(
      organizationId,
      userId
    );

    res.json({
      success: true,
      data: requests,
      count: requests.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * Get requests submitted by current user
 * GET /api/approvals/my-requests
 */
router.get('/my-requests', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const userId = req.user!.id;
    const status = req.query.status as ApprovalStatus | undefined;

    const requests = await approvalWorkflowService.getMyRequests(
      organizationId,
      userId,
      status
    );

    res.json({
      success: true,
      data: requests,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * Get a single approval request
 * GET /api/approvals/requests/:id
 */
router.get(
  '/requests/:id',
  validate([param('id').isUUID().withMessage('Invalid request ID')]),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;

      const request = await approvalWorkflowService.getRequest(
        organizationId,
        req.params.id
      );

      if (!request) {
        return res.status(404).json({
          success: false,
          message: 'Request not found',
        });
      }

      res.json({
        success: true,
        data: request,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * Take action on an approval request (approve/reject/request changes)
 * POST /api/approvals/requests/:id/action
 */
router.post(
  '/requests/:id/action',
  validate([
    param('id').isUUID().withMessage('Invalid request ID'),
    body('decision')
      .isIn(Object.values(ApprovalDecision))
      .withMessage('Invalid decision'),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;
      const userId = req.user!.id;

      const request = await approvalWorkflowService.takeAction(
        organizationId,
        req.params.id,
        userId,
        req.body
      );

      res.json({
        success: true,
        message: `Request ${req.body.decision.toLowerCase()}`,
        data: request,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * Cancel an approval request (by submitter)
 * POST /api/approvals/requests/:id/cancel
 */
router.post(
  '/requests/:id/cancel',
  validate([param('id').isUUID().withMessage('Invalid request ID')]),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;
      const userId = req.user!.id;

      const request = await approvalWorkflowService.cancelRequest(
        organizationId,
        req.params.id,
        userId
      );

      res.json({
        success: true,
        message: 'Request cancelled',
        data: request,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * Get approval statistics
 * GET /api/approvals/statistics
 */
router.get('/statistics', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const { dateFrom, dateTo } = req.query;

    const stats = await approvalWorkflowService.getStatistics(
      organizationId,
      dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo ? new Date(dateTo as string) : undefined
    );

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
