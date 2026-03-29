/**
 * Notification Device Routes
 * Handles FCM device token registration for push notifications
 */

import { Router, Response } from 'express';
import { prisma } from '../config/database';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { ApiResponse } from '../utils/apiResponse';
import { body, validationResult } from 'express-validator';

const router = Router();

// Apply authentication
router.use(authenticate);
router.use(tenantMiddleware);

/**
 * Register device for push notifications
 * POST /api/notifications/register-device
 */
router.post(
  '/register-device',
  [
    body('token').notEmpty().withMessage('FCM token is required'),
    body('platform').isIn(['android', 'ios']).withMessage('Platform must be android or ios'),
  ],
  async (req: TenantRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ApiResponse.badRequest(res, errors.array()[0].msg);
      }

      const userId = req.user!.id;
      const organizationId = req.organizationId!;
      const { token, platform, deviceId } = req.body;

      // Check if this token already exists
      const existingDevice = await prisma.deviceToken.findFirst({
        where: { token },
      });

      if (existingDevice) {
        // Update existing device
        await prisma.deviceToken.update({
          where: { id: existingDevice.id },
          data: {
            userId,
            organizationId,
            platform,
            deviceId: deviceId || existingDevice.deviceId,
            lastActiveAt: new Date(),
            isActive: true,
          },
        });

        return ApiResponse.success(res, 'Device token updated');
      }

      // Deactivate old tokens for this user on same platform
      await prisma.deviceToken.updateMany({
        where: {
          userId,
          platform,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });

      // Create new device token
      await prisma.deviceToken.create({
        data: {
          userId,
          organizationId,
          token,
          platform,
          deviceId: deviceId || `${platform}-${Date.now()}`,
          isActive: true,
          lastActiveAt: new Date(),
        },
      });

      ApiResponse.success(res, 'Device registered for notifications');
    } catch (error) {
      console.error('[Notifications] Register device error:', error);
      ApiResponse.error(res, (error as Error).message, 500);
    }
  }
);

/**
 * Unregister device (on logout)
 * POST /api/notifications/unregister-device
 */
router.post(
  '/unregister-device',
  [body('token').notEmpty().withMessage('FCM token is required')],
  async (req: TenantRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ApiResponse.badRequest(res, errors.array()[0].msg);
      }

      const { token } = req.body;

      // Deactivate the token
      await prisma.deviceToken.updateMany({
        where: { token },
        data: { isActive: false },
      });

      ApiResponse.success(res, 'Device unregistered');
    } catch (error) {
      console.error('[Notifications] Unregister device error:', error);
      ApiResponse.error(res, (error as Error).message, 500);
    }
  }
);

/**
 * Get user's registered devices
 * GET /api/notifications/devices
 */
router.get('/devices', async (req: TenantRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const devices = await prisma.deviceToken.findMany({
      where: {
        userId,
        isActive: true,
      },
      select: {
        id: true,
        platform: true,
        deviceId: true,
        lastActiveAt: true,
        createdAt: true,
      },
    });

    ApiResponse.success(res, 'Devices retrieved', devices);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

/**
 * Update notification preferences
 * PUT /api/notifications/preferences
 */
router.put('/preferences', async (req: TenantRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const preferences = req.body;

    // Store preferences in user settings (using customFields or a dedicated table)
    await prisma.user.update({
      where: { id: userId },
      data: {
        settings: {
          ...(await prisma.user.findUnique({ where: { id: userId } }))?.settings as any || {},
          notificationPreferences: preferences,
        },
      },
    });

    ApiResponse.success(res, 'Preferences updated');
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

/**
 * Get notification preferences
 * GET /api/notifications/preferences
 */
router.get('/preferences', async (req: TenantRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { settings: true },
    });

    const preferences = (user?.settings as any)?.notificationPreferences || {
      enabled: true,
      newAssignments: true,
      followUpReminders: true,
      leadUpdates: true,
      callbackReminders: true,
      aiAnalysis: true,
      performanceAlerts: true,
    };

    ApiResponse.success(res, 'Preferences retrieved', preferences);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

export default router;
