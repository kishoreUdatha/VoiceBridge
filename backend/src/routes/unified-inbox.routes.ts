/**
 * Unified Inbox Routes
 * API endpoints for multi-channel inbox
 */

import { Router, Request, Response } from 'express';
import { unifiedInboxService } from '../services/unified-inbox.service';
import { authenticate } from '../middlewares/auth';

const router = Router();
router.use(authenticate as any);

// Get inbox messages
router.get('/', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const { channel, direction, leadId, userId, unreadOnly, search, limit, offset } = req.query;

    const data = await unifiedInboxService.getInboxMessages(organizationId, {
      channel: channel as string,
      direction: direction as 'inbound' | 'outbound',
      leadId: leadId as string,
      userId: userId as string,
      unreadOnly: unreadOnly === 'true',
      searchQuery: search as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json({
      success: true,
      data: data.messages,
      total: data.total,
      unreadCount: data.unreadCount,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get conversation for a lead
router.get('/lead/:leadId', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const { leadId } = req.params;

    const messages = await unifiedInboxService.getLeadConversation(organizationId, leadId);

    res.json({ success: true, data: messages });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get inbox statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;

    const stats = await unifiedInboxService.getInboxStats(organizationId);

    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
