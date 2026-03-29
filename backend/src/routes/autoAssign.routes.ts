import { Router, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { leadAutoAssignService } from '../services/leadAutoAssign.service';
import { ApiResponse } from '../utils/apiResponse';
import { authenticate, authorize, AuthenticatedRequest } from '../middlewares/auth';
import { tenantMiddleware } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import { prisma } from '../config/database';

const router = Router();

// All routes require authentication, tenant context, and admin/manager role
router.use(authenticate);
router.use(tenantMiddleware);
router.use(authorize('admin', 'manager'));

/**
 * GET /api/auto-assign/config
 * Get current auto-assign configuration
 */
router.get('/config', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return ApiResponse.unauthorized(res);
    }

    const config = await leadAutoAssignService.getOrganizationConfig(req.user.organizationId);

    // Get available AI agents for dropdown
    const agents = await prisma.voiceAgent.findMany({
      where: { organizationId: req.user.organizationId, isActive: true },
      select: { id: true, name: true, industry: true },
    });

    // Get counselors for dropdown
    const counselors = await prisma.user.findMany({
      where: {
        organizationId: req.user.organizationId,
        isActive: true,
        role: { slug: 'counselor' },
      },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    ApiResponse.success(res, 'Auto-assign config retrieved', {
      config,
      availableAgents: agents,
      availableCounselors: counselors,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/auto-assign/config
 * Update auto-assign configuration
 */
router.put(
  '/config',
  validate([
    body('enableAICalling').optional().isBoolean(),
    body('aiAgentId').optional().isUUID(),
    body('assignToCounselorId').optional().isUUID(),
    body('callDelayMinutes').optional().isInt({ min: 0, max: 60 }),
    body('workingHoursOnly').optional().isBoolean(),
    body('workingHoursStart').optional().isInt({ min: 0, max: 23 }),
    body('workingHoursEnd').optional().isInt({ min: 0, max: 23 }),
    body('sourceTypes').optional().isArray(),
  ]),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return ApiResponse.unauthorized(res);
      }

      const config = await leadAutoAssignService.updateOrganizationConfig(
        req.user.organizationId,
        req.body
      );

      ApiResponse.success(res, 'Auto-assign config updated', config);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auto-assign/test
 * Test auto-assign with a specific lead
 */
router.post(
  '/test',
  validate([body('leadId').isUUID()]),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return ApiResponse.unauthorized(res);
      }

      const { leadId } = req.body;

      // Verify lead belongs to organization
      const lead = await prisma.lead.findFirst({
        where: { id: leadId, organizationId: req.user.organizationId },
      });

      if (!lead) {
        return ApiResponse.notFound(res, 'Lead not found');
      }

      const result = await leadAutoAssignService.processNewLead(leadId);

      ApiResponse.success(res, 'Auto-assign test completed', result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/auto-assign/stats
 * Get auto-assign statistics
 */
router.get('/stats', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return ApiResponse.unauthorized(res);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalLeadsToday,
      autoAssignedToday,
      aiCallsToday,
      scheduledCallsToday,
    ] = await Promise.all([
      // Total leads from social media today
      prisma.lead.count({
        where: {
          organizationId: req.user.organizationId,
          source: { in: ['AD_FACEBOOK', 'AD_INSTAGRAM', 'AD_LINKEDIN', 'AD_GOOGLE'] },
          createdAt: { gte: today },
        },
      }),
      // Leads with AI call initiated
      prisma.lead.count({
        where: {
          organizationId: req.user.organizationId,
          createdAt: { gte: today },
          customFields: { path: ['aiCallInitiated'], equals: true },
        },
      }),
      // AI calls made today
      prisma.outboundCall.count({
        where: {
          agent: { organizationId: req.user.organizationId },
          createdAt: { gte: today },
        },
      }),
      // Scheduled calls pending
      prisma.scheduledCall.count({
        where: {
          organizationId: req.user.organizationId,
          status: 'PENDING',
        },
      }),
    ]);

    ApiResponse.success(res, 'Auto-assign stats retrieved', {
      totalLeadsToday,
      autoAssignedToday,
      aiCallsToday,
      scheduledCallsToday,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
