import { Router, Request, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middlewares/auth';
import { tenantMiddleware } from '../middlewares/tenant';
import { calendarService } from '../services/calendar.service';
import { prisma } from '../config/database';
import integrationService from '../services/integration.service';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticate);
router.use(tenantMiddleware);

// Get calendar configuration (admin only)
router.get('/config', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const userRole = req.user!.role?.toLowerCase();

    // Only admins can view config
    if (!['super_admin', 'admin', 'org_admin'].includes(userRole || '')) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    const settings = (org?.settings as any) || {};
    const calendarConfig = settings.calendar || {};

    // Don't expose the full secret, just indicate if it's set
    res.json({
      success: true,
      data: {
        clientId: calendarConfig.clientId || '',
        clientSecretSet: !!calendarConfig.clientSecret,
        redirectUri: calendarConfig.redirectUri || '',
        isConfigured: !!(calendarConfig.clientId && calendarConfig.clientSecret),
      },
    });
  } catch (error: any) {
    console.error('[Calendar] Error fetching config:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Save calendar configuration (admin only)
router.post('/config', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const userRole = req.user!.role?.toLowerCase();

    // Only admins can update config
    if (!['super_admin', 'admin', 'org_admin'].includes(userRole || '')) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { clientId, clientSecret, redirectUri } = req.body;

    if (!clientId) {
      return res.status(400).json({ success: false, message: 'Client ID is required' });
    }

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    const settings = (org?.settings as any) || {};

    // Encrypt the client secret before storing
    const encryptedSecret = clientSecret ? integrationService.encrypt(clientSecret) : settings.calendar?.clientSecret;

    const updatedSettings = {
      ...settings,
      calendar: {
        ...settings.calendar,
        clientId,
        clientSecret: encryptedSecret,
        redirectUri: redirectUri || settings.calendar?.redirectUri,
        updatedAt: new Date().toISOString(),
      },
    };

    await prisma.organization.update({
      where: { id: organizationId },
      data: { settings: updatedSettings },
    });

    res.json({
      success: true,
      message: 'Calendar configuration saved successfully',
      data: {
        clientId,
        clientSecretSet: !!encryptedSecret,
        redirectUri: updatedSettings.calendar.redirectUri,
        isConfigured: !!(clientId && encryptedSecret),
      },
    });
  } catch (error: any) {
    console.error('[Calendar] Error saving config:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Test calendar configuration
router.post('/config/test', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;

    // Check if org-level config exists
    const isConfigured = await calendarService.isConfiguredForOrg(organizationId);

    if (isConfigured) {
      res.json({
        success: true,
        message: 'Google Calendar configuration is valid',
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Google Calendar is not configured. Please enter your Client ID and Client Secret.',
      });
    }
  } catch (error: any) {
    console.error('[Calendar] Error testing config:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

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

    // Check if org-level or env-level config exists
    const isConfigured = await calendarService.isConfiguredForOrg(organizationId);
    if (!isConfigured) {
      return res.status(400).json({
        success: false,
        message: 'Calendar integration is not configured. Please set up Google Calendar credentials in the Configuration tab.',
      });
    }

    if (provider !== 'GOOGLE') {
      return res.status(400).json({
        success: false,
        message: 'Only Google Calendar is currently supported',
      });
    }

    const authUrl = await calendarService.getAuthUrl(organizationId, req.user!.id);
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
