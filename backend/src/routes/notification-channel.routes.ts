import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middlewares/auth';
import { tenantMiddleware } from '../middlewares/tenant';
import { notificationChannelService } from '../services/notification-channel.service';
import { prisma } from '../config/database';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticate);
router.use(tenantMiddleware);

// Get all notification channels
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const channels = await prisma.notificationChannel.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: channels });
  } catch (error: any) {
    console.error('[NotificationChannels] Error fetching channels:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single notification channel
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const channel = await prisma.notificationChannel.findFirst({
      where: { id: req.params.id, organizationId },
    });

    if (!channel) {
      return res.status(404).json({ success: false, message: 'Channel not found' });
    }

    res.json({ success: true, data: channel });
  } catch (error: any) {
    console.error('[NotificationChannels] Error fetching channel:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create notification channel
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const { name, type, webhookUrl, events } = req.body;

    if (!name || !type || !webhookUrl) {
      return res.status(400).json({
        success: false,
        message: 'Name, type, and webhookUrl are required',
      });
    }

    const validTypes = ['SLACK', 'TEAMS', 'DISCORD', 'CUSTOM_WEBHOOK'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Type must be one of: ${validTypes.join(', ')}`,
      });
    }

    const channel = await notificationChannelService.createChannel({organizationId,
      name,
      type,
      webhookUrl,
      events: events || ['lead.created', 'call.completed', 'appointment.booked'],
    });

    res.status(201).json({ success: true, data: channel });
  } catch (error: any) {
    console.error('[NotificationChannels] Error creating channel:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update notification channel
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const { name, webhookUrl, events, isActive } = req.body;

    const channel = await prisma.notificationChannel.findFirst({
      where: { id: req.params.id, organizationId },
    });

    if (!channel) {
      return res.status(404).json({ success: false, message: 'Channel not found' });
    }

    const updated = await prisma.notificationChannel.update({
      where: { id: req.params.id },
      data: {
        name: name || channel.name,
        webhookUrl: webhookUrl || channel.webhookUrl,
        events: events || channel.events,
        isActive: isActive !== undefined ? isActive : channel.isActive,
      },
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('[NotificationChannels] Error updating channel:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete notification channel
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;

    const channel = await prisma.notificationChannel.findFirst({
      where: { id: req.params.id, organizationId },
    });

    if (!channel) {
      return res.status(404).json({ success: false, message: 'Channel not found' });
    }

    await prisma.notificationChannel.delete({
      where: { id: req.params.id },
    });

    res.json({ success: true, message: 'Channel deleted successfully' });
  } catch (error: any) {
    console.error('[NotificationChannels] Error deleting channel:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Test notification channel
router.post('/:id/test', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;

    const channel = await prisma.notificationChannel.findFirst({
      where: { id: req.params.id, organizationId },
    });

    if (!channel) {
      return res.status(404).json({ success: false, message: 'Channel not found' });
    }

    const success = await notificationChannelService.testChannel(channel.id, organizationId);

    if (success) {
      res.json({ success: true, message: 'Test notification sent successfully' });
    } else {
      res.status(400).json({ success: false, message: 'Failed to send test notification' });
    }
  } catch (error: any) {
    console.error('[NotificationChannels] Error testing channel:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
