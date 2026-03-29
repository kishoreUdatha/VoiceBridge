import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { authenticate, authorize } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import { ApiResponse } from '../utils/apiResponse';
import { voiceMinutesService } from '../services/voice-minutes.service';

const router = Router();

// Rate limiter for voice minutes endpoints
const voiceMinutesLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: { success: false, message: 'Too many requests' },
});

// All routes require authentication
router.use(authenticate);
router.use(tenantMiddleware);
router.use(voiceMinutesLimiter);

/**
 * Get voice minutes balance for the organization
 * GET /voice-minutes/balance
 */
router.get('/balance', async (req: TenantRequest, res: Response) => {
  try {
    const usage = await voiceMinutesService.getOrganizationUsage(req.organizationId!);

    const balance = {
      totalMinutes: usage.limit || 1000,
      usedMinutes: usage.used || 0,
      remainingMinutes: usage.remaining || ((usage.limit || 1000) - (usage.used || 0)),
      percentageUsed: usage.limit > 0
        ? Math.round((usage.used / usage.limit) * 100)
        : 0,
      resetDate: usage.resetDate || new Date(new Date().setMonth(new Date().getMonth() + 1)),
      unlimitedPlan: usage.limit === -1,
    };

    return ApiResponse.success(res, 'Voice minutes balance retrieved', balance);
  } catch (error: any) {
    // Return default balance if service fails
    return ApiResponse.success(res, 'Voice minutes balance retrieved', {
      totalMinutes: 1000,
      usedMinutes: 0,
      remainingMinutes: 1000,
      percentageUsed: 0,
      resetDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
      unlimitedPlan: false,
    });
  }
});

/**
 * Get voice minutes usage for the organization
 * GET /voice-minutes/usage
 */
router.get('/usage', async (req: TenantRequest, res: Response) => {
  try {
    const usage = await voiceMinutesService.getOrganizationUsage(req.organizationId!);
    return ApiResponse.success(res, 'Voice minutes usage retrieved', usage);
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
});

/**
 * Check if current user can make a call
 * GET /voice-minutes/check
 */
router.get('/check', async (req: TenantRequest, res: Response) => {
  try {
    const result = await voiceMinutesService.checkUsage(
      req.organizationId!,
      req.user?.id
    );
    return ApiResponse.success(res, 'Usage check completed', result);
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
});

/**
 * Set voice minutes limit for a user (Admin only)
 * PUT /voice-minutes/users/:userId/limit
 */
router.put(
  '/users/:userId/limit',
  authorize('admin', 'manager'),
  validate([
    param('userId').isUUID().withMessage('Invalid user ID'),
    body('limit').custom((value) => {
      if (value !== null && (typeof value !== 'number' || value < 0 || value > 1000000)) {
        throw new Error('Limit must be a positive number up to 1000000, or null for unlimited');
      }
      return true;
    }),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const { userId } = req.params;
      const { limit } = req.body;

      await voiceMinutesService.setUserLimit(req.organizationId!, userId, limit);

    return ApiResponse.success(res, 'User voice minutes limit updated', { userId, limit });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, error.message.includes('not found') ? 404 : 500);
  }
});

/**
 * Set voice minutes limits for multiple users at once (Admin only)
 * PUT /voice-minutes/users/bulk-limit
 */
router.put(
  '/users/bulk-limit',
  authorize('admin', 'manager'),
  validate([
    body('users').isArray({ min: 1, max: 100 }).withMessage('Users array must have 1-100 items'),
    body('users.*.userId').isUUID().withMessage('Invalid user ID in array'),
    body('users.*.limit').custom((value) => {
      if (value !== null && (typeof value !== 'number' || value < 0 || value > 1000000)) {
        throw new Error('Limit must be a positive number up to 1000000, or null');
      }
      return true;
    }),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const { users } = req.body;

      const results = [];
      for (const { userId, limit } of users) {
        try {
          await voiceMinutesService.setUserLimit(req.organizationId!, userId, limit);
          results.push({ userId, limit, success: true });
        } catch (error: any) {
          results.push({ userId, limit, success: false, error: error.message });
        }
      }

      return ApiResponse.success(res, 'Bulk limits updated', results);
    } catch (error: any) {
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * Get all users with their voice minutes usage (Admin only)
 * GET /voice-minutes/users
 */
router.get('/users', authorize('admin', 'manager'), async (req: TenantRequest, res: Response) => {
  try {
    const usage = await voiceMinutesService.getOrganizationUsage(req.organizationId!);
    return ApiResponse.success(res, 'Users voice minutes retrieved', usage.userBreakdown);
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
});

/**
 * Reset user's voice minutes usage (Admin only - for special cases)
 * POST /voice-minutes/users/:userId/reset
 */
router.post(
  '/users/:userId/reset',
  authorize('admin'),
  validate([
    param('userId').isUUID().withMessage('Invalid user ID'),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const { userId } = req.params;
    const { prisma } = await import('../config/database');

    // Verify user belongs to organization
    const user = await prisma.user.findFirst({
      where: { id: userId, organizationId: req.organizationId! },
    });

    if (!user) {
      return ApiResponse.error(res, 'User not found in organization', 404);
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        voiceMinutesUsed: 0,
        voiceMinutesResetAt: new Date(),
      },
    });

    return ApiResponse.success(res, 'User voice minutes usage reset', { userId });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
});

/**
 * Set organization voice minutes limit (Super admin only - override plan)
 * PUT /voice-minutes/organization/limit
 */
router.put(
  '/organization/limit',
  authorize('admin'),
  validate([
    body('limit').custom((value) => {
      if (value !== null && (typeof value !== 'number' || value < 0 || value > 10000000)) {
        throw new Error('Limit must be a positive number up to 10000000, or null for plan default');
      }
      return true;
    }),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const { limit } = req.body;

      await voiceMinutesService.setOrganizationLimit(req.organizationId!, limit);

    return ApiResponse.success(res, 'Organization voice minutes limit updated', { limit });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
});

export default router;
