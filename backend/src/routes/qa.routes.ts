/**
 * QA (Quality Assurance) Routes
 * API endpoints for call review and scoring
 */

import { Router, Response, NextFunction } from 'express';
import { qaService } from '../services/qa.service';
import { authenticate } from '../middlewares/auth';
import { TenantRequest, tenantMiddleware } from '../middlewares/tenant';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticate as any);
router.use(tenantMiddleware as any);

// ==================== Templates ====================

/**
 * GET /api/qa/templates
 * Get all QA scoring templates
 */
router.get('/templates', async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.organizationId!;
    const templates = await qaService.getTemplates(organizationId);

    res.json({
      success: true,
      data: templates,
    });
  } catch (error: any) {
    console.error('Error fetching QA templates:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch templates',
    });
  }
});

/**
 * POST /api/qa/templates
 * Create a new QA scoring template
 */
router.post('/templates', async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.organizationId!;
    const { name, description, criteria, passingScore, isDefault } = req.body;

    if (!name || !criteria || !Array.isArray(criteria)) {
      return res.status(400).json({
        success: false,
        message: 'Name and criteria are required',
      });
    }

    const template = await qaService.createTemplate({
      organizationId,
      name,
      description,
      criteria,
      passingScore,
      isDefault,
    });

    res.json({
      success: true,
      data: template,
    });
  } catch (error: any) {
    console.error('Error creating QA template:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create template',
    });
  }
});

/**
 * GET /api/qa/templates/:id
 * Get template by ID
 */
router.get('/templates/:id', async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.organizationId!;
    const { id } = req.params;

    const template = await qaService.getTemplateById(id, organizationId);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found',
      });
    }

    res.json({
      success: true,
      data: template,
    });
  } catch (error: any) {
    console.error('Error fetching QA template:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch template',
    });
  }
});

/**
 * PUT /api/qa/templates/:id
 * Update a template
 */
router.put('/templates/:id', async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.organizationId!;
    const { id } = req.params;

    const template = await qaService.updateTemplate(id, organizationId, req.body);

    res.json({
      success: true,
      data: template,
    });
  } catch (error: any) {
    console.error('Error updating QA template:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update template',
    });
  }
});

// ==================== Pending Calls ====================

/**
 * GET /api/qa/pending-calls
 * Get calls pending QA review
 */
router.get('/pending-calls', async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.organizationId!;
    const { agentId, dateFrom, dateTo, limit, offset } = req.query;

    const result = await qaService.getPendingReviewCalls(organizationId, {
      agentId: agentId as string,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json({
      success: true,
      data: result.calls,
      total: result.total,
    });
  } catch (error: any) {
    console.error('Error fetching pending calls:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch pending calls',
    });
  }
});

// ==================== Reviews ====================

/**
 * GET /api/qa/reviews
 * Get QA reviews with filters
 */
router.get('/reviews', async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.organizationId!;
    const { agentId, reviewerId, status, passed, dateFrom, dateTo, limit, offset } = req.query;

    const result = await qaService.getReviews(organizationId, {
      agentId: agentId as string,
      reviewerId: reviewerId as string,
      status: status as any,
      passed: passed === 'true' ? true : passed === 'false' ? false : undefined,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json({
      success: true,
      data: result.reviews,
      total: result.total,
    });
  } catch (error: any) {
    console.error('Error fetching QA reviews:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch reviews',
    });
  }
});

/**
 * POST /api/qa/reviews
 * Create a new QA review
 */
router.post('/reviews', async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.organizationId!;
    const reviewerId = req.user!.id;
    const { callLogId, templateId, agentId, scores, strengths, improvements, coachingNotes, status } = req.body;

    if (!callLogId || !templateId || !agentId || !scores) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    const review = await qaService.createReview({
      organizationId,
      callLogId,
      templateId,
      reviewerId,
      agentId,
      scores,
      strengths,
      improvements,
      coachingNotes,
      status,
    });

    res.json({
      success: true,
      data: review,
    });
  } catch (error: any) {
    console.error('Error creating QA review:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create review',
    });
  }
});

/**
 * GET /api/qa/reviews/:id
 * Get review by ID
 */
router.get('/reviews/:id', async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.organizationId!;
    const { id } = req.params;

    const review = await qaService.getReviewById(id, organizationId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    res.json({
      success: true,
      data: review,
    });
  } catch (error: any) {
    console.error('Error fetching QA review:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch review',
    });
  }
});

/**
 * PUT /api/qa/reviews/:id
 * Update a review
 */
router.put('/reviews/:id', async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.organizationId!;
    const { id } = req.params;

    const review = await qaService.updateReview(id, organizationId, req.body);

    res.json({
      success: true,
      data: review,
    });
  } catch (error: any) {
    console.error('Error updating QA review:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update review',
    });
  }
});

// ==================== Stats & Dashboard ====================

/**
 * GET /api/qa/dashboard
 * Get QA dashboard overview
 */
router.get('/dashboard', async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.organizationId!;

    const dashboard = await qaService.getDashboardOverview(organizationId);

    res.json({
      success: true,
      data: dashboard,
    });
  } catch (error: any) {
    console.error('Error fetching QA dashboard:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch dashboard',
    });
  }
});

/**
 * GET /api/qa/agent-stats/:agentId
 * Get QA statistics for a specific agent
 */
router.get('/agent-stats/:agentId', async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.organizationId!;
    const { agentId } = req.params;
    const { dateFrom, dateTo } = req.query;

    const stats = await qaService.getAgentStats(
      organizationId,
      agentId,
      dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo ? new Date(dateTo as string) : undefined
    );

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('Error fetching agent stats:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch agent stats',
    });
  }
});

export default router;
