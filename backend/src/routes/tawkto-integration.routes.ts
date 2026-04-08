/**
 * Tawk.to Integration Routes
 *
 * Handles webhook endpoints and configuration for Tawk.to chat widget integration.
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middlewares/auth';
import { tawkToService, TawkToWebhookPayload } from '../integrations/tawkto.service';

const router = Router();

/**
 * PUBLIC: Webhook endpoint for Tawk.to
 * POST /api/integrations/tawkto/webhook/:propertyId
 *
 * Tawk.to sends webhooks for various events:
 * - chat:start - New chat initiated
 * - chat:end - Chat ended
 * - ticket:create - Offline message/ticket created
 * - visitor:prechat - Pre-chat form submitted
 */
router.post('/webhook/:propertyId', async (req: Request, res: Response) => {
  try {
    const { propertyId } = req.params;
    const payload: TawkToWebhookPayload = req.body;
    const signature = req.headers['x-tawk-signature'] as string;

    console.log(`[Tawk.to] Received ${payload.event} webhook for property ${propertyId}`);

    const result = await tawkToService.processWebhook(propertyId, payload, signature);

    res.status(200).json({
      status: result.success ? 'success' : 'failed',
      message: result.message,
      leadId: result.rawImportRecordId,
      eventType: result.eventType,
    });
  } catch (error) {
    console.error('[Tawk.to] Webhook error:', error);
    res.status(200).json({ status: 'error', message: 'Internal server error' });
  }
});

// ==================== AUTHENTICATED ROUTES ====================

/**
 * Get Tawk.to integration configuration
 * GET /api/integrations/tawkto/config
 */
router.get('/config', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const integration = await tawkToService.getIntegration(organizationId);

    if (!integration) {
      return res.status(404).json({
        success: false,
        message: 'Tawk.to integration not configured',
      });
    }

    // Generate embed code
    const embedCode = tawkToService.getWidgetEmbedCode(
      integration.propertyId,
      integration.widgetId || undefined
    );

    res.json({
      success: true,
      data: {
        id: integration.id,
        propertyId: integration.propertyId,
        widgetId: integration.widgetId,
        hasApiKey: !!integration.apiKey,
        hasWebhookSecret: !!integration.webhookSecret,
        webhookUrl: `${process.env.API_BASE_URL || ''}/api/integrations/tawkto/webhook/${integration.propertyId}`,
        captureAsLead: integration.captureAsLead,
        captureOffline: integration.captureOffline,
        syncTranscripts: integration.syncTranscripts,
        fieldMapping: integration.fieldMapping,
        autoAssign: integration.autoAssign,
        defaultAssigneeId: integration.defaultAssigneeId,
        routingRuleId: integration.routingRuleId,
        totalChats: integration.totalChats,
        totalLeadsCreated: integration.totalLeadsCreated,
        lastChatAt: integration.lastChatAt,
        isActive: integration.isActive,
        createdAt: integration.createdAt,
        embedCode,
      },
    });
  } catch (error) {
    console.error('[Tawk.to] Get config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get Tawk.to configuration',
    });
  }
});

/**
 * Setup or update Tawk.to integration
 * POST /api/integrations/tawkto/config
 */
router.post('/config', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const {
      propertyId,
      widgetId,
      apiKey,
      webhookSecret,
      captureAsLead,
      captureOffline,
      syncTranscripts,
      fieldMapping,
      autoAssign,
      defaultAssigneeId,
      routingRuleId,
    } = req.body;

    // Validate required fields
    if (!propertyId || !apiKey) {
      return res.status(400).json({
        success: false,
        message: 'Property ID and API key are required',
      });
    }

    const integration = await tawkToService.setupIntegration(organizationId, {
      propertyId,
      widgetId,
      apiKey,
      webhookSecret,
      captureAsLead,
      captureOffline,
      syncTranscripts,
      fieldMapping,
      autoAssign,
      defaultAssigneeId,
      routingRuleId,
    });

    // Generate embed code
    const embedCode = tawkToService.getWidgetEmbedCode(
      integration.propertyId,
      integration.widgetId || undefined
    );

    res.json({
      success: true,
      message: 'Tawk.to integration configured successfully',
      data: {
        id: integration.id,
        propertyId: integration.propertyId,
        webhookUrl: `${process.env.API_BASE_URL || ''}/api/integrations/tawkto/webhook/${integration.propertyId}`,
        isActive: integration.isActive,
        embedCode,
      },
    });
  } catch (error) {
    console.error('[Tawk.to] Setup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to configure Tawk.to integration',
    });
  }
});

/**
 * Test API connection
 * POST /api/integrations/tawkto/test-connection
 */
router.post('/test-connection', authenticate, async (req: Request, res: Response) => {
  try {
    const { apiKey } = req.body;

    if (!apiKey) {
      const organizationId = req.user!.organizationId;
      const integration = await tawkToService.getIntegration(organizationId);

      if (!integration) {
        return res.status(400).json({
          success: false,
          message: 'API key is required',
        });
      }

      const result = await tawkToService.testConnection(integration.apiKey);
      return res.json({
        success: result.valid,
        message: result.message,
      });
    }

    const result = await tawkToService.testConnection(apiKey);
    res.json({
      success: result.valid,
      message: result.message,
    });
  } catch (error) {
    console.error('[Tawk.to] Test connection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test connection',
    });
  }
});

/**
 * Get widget embed code
 * GET /api/integrations/tawkto/embed-code
 */
router.get('/embed-code', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const integration = await tawkToService.getIntegration(organizationId);

    if (!integration) {
      return res.status(404).json({
        success: false,
        message: 'Tawk.to integration not configured',
      });
    }

    const embedCode = tawkToService.getWidgetEmbedCode(
      integration.propertyId,
      integration.widgetId || undefined
    );

    res.json({
      success: true,
      data: {
        embedCode,
        propertyId: integration.propertyId,
        widgetId: integration.widgetId,
      },
    });
  } catch (error) {
    console.error('[Tawk.to] Get embed code error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get embed code',
    });
  }
});

/**
 * Get integration statistics
 * GET /api/integrations/tawkto/stats
 */
router.get('/stats', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const stats = await tawkToService.getStats(organizationId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('[Tawk.to] Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get statistics',
    });
  }
});

/**
 * Activate integration
 * POST /api/integrations/tawkto/activate
 */
router.post('/activate', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    await tawkToService.activateIntegration(organizationId);

    res.json({
      success: true,
      message: 'Tawk.to integration activated',
    });
  } catch (error) {
    console.error('[Tawk.to] Activate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to activate integration',
    });
  }
});

/**
 * Deactivate integration
 * POST /api/integrations/tawkto/deactivate
 */
router.post('/deactivate', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    await tawkToService.deactivateIntegration(organizationId);

    res.json({
      success: true,
      message: 'Tawk.to integration deactivated',
    });
  } catch (error) {
    console.error('[Tawk.to] Deactivate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate integration',
    });
  }
});

/**
 * Delete integration
 * DELETE /api/integrations/tawkto
 */
router.delete('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    await tawkToService.deleteIntegration(organizationId);

    res.json({
      success: true,
      message: 'Tawk.to integration deleted',
    });
  } catch (error) {
    console.error('[Tawk.to] Delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete integration',
    });
  }
});

export default router;
