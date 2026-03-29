import { Router, Request, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middlewares/auth';
import { tenantMiddleware } from '../middlewares/tenant';
import { calendarService } from '../services/calendar.service';
import { prisma } from '../config/database';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticate);
router.use(tenantMiddleware);

// Get calendar integration status
router.get('/integration', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const integration = await prisma.calendarIntegration.findFirst({
      where: { organizationId, isActive: true },
      select: {
        id: true,
        provider: true,
        isActive: true,
        calendarId: true,
        syncEnabled: true,
        autoCreateEvents: true,
        checkAvailability: true,
        lastSyncAt: true,
        lastSyncError: true,
      },
    });

    if (!integration) {
      return res.status(404).json({ success: false, message: 'No calendar integration found' });
    }

    res.json({ success: true, data: integration });
  } catch (error: any) {
    console.error('[Calendar] Error fetching integration:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get OAuth URL for connecting calendar
router.get('/auth-url', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const provider = (req.query.provider as string) || 'GOOGLE';
    const organizationId = req.user!.organizationId;

    if (!calendarService.isConfigured()) {
      return res.status(400).json({
        success: false,
        message: 'Calendar integration is not configured. Please set up Google Calendar credentials.',
      });
    }

    if (provider !== 'GOOGLE') {
      return res.status(400).json({
        success: false,
        message: 'Only Google Calendar is currently supported',
      });
    }

    const authUrl = calendarService.getAuthUrl(organizationId, req.user!.id);
    res.json({ success: true, authUrl });
  } catch (error: any) {
    console.error('[Calendar] Error generating auth URL:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// OAuth callback handler
router.get('/oauth/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      return res.redirect('/settings/calendar?error=missing_params');
    }

    await calendarService.handleOAuthCallback(code as string, state as string);
    res.redirect('/settings/calendar?success=connected');
  } catch (error: any) {
    console.error('[Calendar] OAuth callback error:', error);
    res.redirect(`/settings/calendar?error=${encodeURIComponent(error.message)}`);
  }
});

// Update calendar integration settings
router.put('/integration', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const { syncEnabled, autoCreateEvents, checkAvailability } = req.body;

    const integration = await prisma.calendarIntegration.findFirst({
      where: { organizationId, isActive: true },
    });

    if (!integration) {
      return res.status(404).json({ success: false, message: 'No calendar integration found' });
    }

    const updated = await prisma.calendarIntegration.update({
      where: { id: integration.id },
      data: {
        syncEnabled: syncEnabled !== undefined ? syncEnabled : integration.syncEnabled,
        autoCreateEvents: autoCreateEvents !== undefined ? autoCreateEvents : integration.autoCreateEvents,
        checkAvailability: checkAvailability !== undefined ? checkAvailability : integration.checkAvailability,
      },
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('[Calendar] Error updating integration:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Disconnect calendar integration
router.delete('/integration', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    await calendarService.disconnect(organizationId);
    res.json({ success: true, message: 'Calendar disconnected successfully' });
  } catch (error: any) {
    console.error('[Calendar] Error disconnecting:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Manual sync
router.post('/sync', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;

    const integration = await prisma.calendarIntegration.findFirst({
      where: { organizationId, isActive: true },
    });

    if (!integration) {
      return res.status(404).json({ success: false, message: 'No calendar integration found' });
    }

    // Update last sync time
    await prisma.calendarIntegration.update({
      where: { id: integration.id },
      data: { lastSyncAt: new Date(), lastSyncError: null },
    });

    res.json({ success: true, message: 'Sync completed' });
  } catch (error: any) {
    console.error('[Calendar] Error syncing:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get available time slots
router.get('/availability', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const { date, duration } = req.query;

    if (!date) {
      return res.status(400).json({ success: false, message: 'Date is required' });
    }

    const slots = await calendarService.getAvailableSlots(
      organizationId,
      new Date(date as string),
      duration ? parseInt(duration as string) : 30
    );

    res.json({ success: true, data: slots });
  } catch (error: any) {
    console.error('[Calendar] Error fetching availability:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Check availability for specific time
router.post('/check-availability', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const { startTime, endTime } = req.body;

    if (!startTime || !endTime) {
      return res.status(400).json({ success: false, message: 'Start and end time are required' });
    }

    const result = await calendarService.checkAvailability(
      organizationId,
      new Date(startTime),
      new Date(endTime)
    );

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[Calendar] Error checking availability:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
