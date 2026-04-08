/**
 * Collaboration Routes
 * API endpoints for activity feed, mentions, and comments
 */

import { Router, Request, Response } from 'express';
import { collaborationService } from '../services/collaboration.service';
import { authenticate } from '../middlewares/auth';

const router = Router();
router.use(authenticate as any);

// Activity Feed
router.get('/activity', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const { entityType, entityId, userId, limit, offset } = req.query;

    const data = await collaborationService.getActivityFeed(organizationId, {
      entityType: entityType as string,
      entityId: entityId as string,
      userId: userId as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json({ success: true, data: data.activities, total: data.total });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Mentions
router.get('/mentions', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const organizationId = (req as any).user.organizationId;
    const unreadOnly = req.query.unreadOnly === 'true';

    const mentions = await collaborationService.getMentions(userId, organizationId, unreadOnly);
    res.json({ success: true, data: mentions });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/mentions/read', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { mentionIds } = req.body;

    await collaborationService.markMentionsRead(mentionIds, userId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Lead Comments
router.get('/leads/:leadId/comments', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const { leadId } = req.params;

    const comments = await collaborationService.getComments(leadId, organizationId);
    res.json({ success: true, data: comments });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/leads/:leadId/comments', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const organizationId = (req as any).user.organizationId;
    const { leadId } = req.params;
    const { content, mentions, parentId } = req.body;

    const comment = await collaborationService.addComment({
      organizationId,
      leadId,
      userId,
      content,
      mentions,
      parentId,
    });

    res.json({ success: true, data: comment });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/comments/:commentId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const organizationId = (req as any).user.organizationId;
    const { commentId } = req.params;

    await collaborationService.deleteComment(commentId, userId, organizationId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
