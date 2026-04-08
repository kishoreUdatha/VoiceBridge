/**
 * Team Messaging Routes
 * Announcements and direct messages for team communication
 */

import { Router, Response, NextFunction } from 'express';
import { teamMessagingService } from '../services/team-messaging.service';
import { authenticate } from '../middlewares/auth';
import { TenantRequest, tenantMiddleware } from '../middlewares/tenant';
import { ApiResponse } from '../utils/apiResponse';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticate as any);
router.use(tenantMiddleware as any);

/**
 * Create a team announcement
 * POST /api/team-messaging/announcements
 */
router.post('/announcements', async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const announcement = await teamMessagingService.createAnnouncement(
      req.organizationId!,
      req.user!.id,
      req.body
    );
    ApiResponse.created(res, 'Announcement created successfully', announcement);
  } catch (error) {
    next(error);
  }
});

/**
 * Get announcements for current user
 * GET /api/team-messaging/announcements
 */
router.get('/announcements', async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const announcements = await teamMessagingService.getAnnouncementsForUser(
      req.organizationId!,
      req.user!.id
    );
    ApiResponse.success(res, 'Announcements retrieved successfully', announcements);
  } catch (error) {
    next(error);
  }
});

/**
 * Mark announcement as read
 * PUT /api/team-messaging/announcements/:id/read
 */
router.put('/announcements/:id/read', async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const result = await teamMessagingService.markAnnouncementAsRead(
      req.organizationId!,
      req.params.id,
      req.user!.id
    );
    ApiResponse.success(res, 'Announcement marked as read', result);
  } catch (error) {
    next(error);
  }
});

/**
 * Delete announcement
 * DELETE /api/team-messaging/announcements/:id
 */
router.delete('/announcements/:id', async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const result = await teamMessagingService.deleteAnnouncement(
      req.organizationId!,
      req.params.id,
      req.user!.id
    );
    ApiResponse.success(res, 'Announcement deleted successfully', result);
  } catch (error) {
    next(error);
  }
});

/**
 * Send direct message
 * POST /api/team-messaging/messages
 */
router.post('/messages', async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const message = await teamMessagingService.sendDirectMessage(
      req.organizationId!,
      req.user!.id,
      req.body
    );
    ApiResponse.created(res, 'Message sent successfully', message);
  } catch (error) {
    next(error);
  }
});

/**
 * Get direct messages with a user
 * GET /api/team-messaging/messages/:userId
 */
router.get('/messages/:userId', async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const messages = await teamMessagingService.getDirectMessages(
      req.organizationId!,
      req.user!.id,
      req.params.userId
    );
    ApiResponse.success(res, 'Messages retrieved successfully', messages);
  } catch (error) {
    next(error);
  }
});

/**
 * Get unread counts
 * GET /api/team-messaging/unread
 */
router.get('/unread', async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const counts = await teamMessagingService.getUnreadCount(
      req.organizationId!,
      req.user!.id
    );
    ApiResponse.success(res, 'Unread counts retrieved', counts);
  } catch (error) {
    next(error);
  }
});

export default router;
