/**
 * JustDial Integration Routes
 *
 * Handles webhook endpoints and configuration for JustDial lead capture.
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middlewares/auth';
import { justDialService, JustDialWebhookPayload } from '../integrations/justdial.service';

const router = Router();

/**
 * PUBLIC: Webhook endpoint for JustDial
 * POST /api/integrations/justdial/webhook/:webhookToken
 *
 * This endpoint is called by JustDial when a new lead comes in.
 * No authentication required - verified by webhook token.
 */
router.post('/webhook/:webhookToken', async (req: Request, res: Response) => {
  try {
    const { webhookToken } = req.params;
    const payload: JustDialWebhookPayload = req.body;
    const signature = req.headers['x-justdial-signature'] as string;

    console.log(`[JustDial] Received webhook with token ${webhookToken.slice(0, 8)}...`);
    console.log(`[JustDial] Payload:`, JSON.stringify(payload).slice(0, 500));

    const result = await justDialService.processWebhook(webhookToken, payload, signature);

    if (result.success) {
      res.status(200).json({
        status: 'success',
        message: result.message,
        leadId: result.rawImportRecordId,
      });
    } else {
      // JustDial expects 200 even on validation failures to prevent retries
      res.status(200).json({
        status: 'failed',
        message: result.message,
      });
    }
  } catch (error) {
    console.error('[JustDial] Webhook error:', error);
    // Return 200 to prevent JustDial from retrying
    res.status(200).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
});

// ==================== AUTHENTICATED ROUTES ====================

/**
 * Get JustDial integration configuration
 * GET /api/integrations/justdial/config
 */
router.get('/config', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const integration = await justDialService.getIntegration(organizationId);

    if (!integration) {
      return res.status(404).json({
        success: false,
        message: 'JustDial integration not configured',
      });
    }

    // Don't expose sensitive keys in response
    res.json({
      success: true,
      data: {
        id: integration.id,
        webhookToken: integration.webhookToken,
        webhookUrl: `${process.env.API_BASE_URL || ''}/api/integrations/justdial/webhook/${integration.webhookToken}`,
        hasApiKey: !!integration.apiKey,
        hasSecretKey: !!integration.secretKey,
        categoryFilters: integration.categoryFilters,
        cityFilters: integration.cityFilters,
        fieldMapping: integration.fieldMapping,
        autoAssign: integration.autoAssign,
        defaultAssigneeId: integration.defaultAssigneeId,
        routingRuleId: integration.routingRuleId,
        totalLeadsReceived: integration.totalLeadsReceived,
        lastLeadAt: integration.lastLeadAt,
        isActive: integration.isActive,
        createdAt: integration.createdAt,
      },
    });
  } catch (error) {
    console.error('[JustDial] Get config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get JustDial configuration',
    });
  }
});

/**
 * Setup or update JustDial integration
 * POST /api/integrations/justdial/config
 */
router.post('/config', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const {
      apiKey,
      secretKey,
      categoryFilters,
      cityFilters,
      fieldMapping,
      autoAssign,
      defaultAssigneeId,
      routingRuleId,
    } = req.body;

    const integration = await justDialService.setupIntegration(organizationId, {
      apiKey,
      secretKey,
      categoryFilters,
      cityFilters,
      fieldMapping,
      autoAssign,
      defaultAssigneeId,
      routingRuleId,
    });

    res.json({
      success: true,
      message: 'JustDial integration configured successfully',
      data: {
        id: integration.id,
        webhookToken: integration.webhookToken,
        webhookUrl: `${process.env.API_BASE_URL || ''}/api/integrations/justdial/webhook/${integration.webhookToken}`,
        isActive: integration.isActive,
      },
    });
  } catch (error) {
    console.error('[JustDial] Setup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to configure JustDial integration',
    });
  }
});

/**
 * Regenerate webhook token
 * POST /api/integrations/justdial/regenerate-token
 */
router.post('/regenerate-token', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const newToken = await justDialService.regenerateWebhookToken(organizationId);

    res.json({
      success: true,
      message: 'Webhook token regenerated',
      data: {
        webhookToken: newToken,
        webhookUrl: `${process.env.API_BASE_URL || ''}/api/integrations/justdial/webhook/${newToken}`,
      },
    });
  } catch (error) {
    console.error('[JustDial] Regenerate token error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to regenerate webhook token',
    });
  }
});

/**
 * Get integration statistics
 * GET /api/integrations/justdial/stats
 */
router.get('/stats', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const stats = await justDialService.getStats(organizationId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('[JustDial] Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get statistics',
    });
  }
});

/**
 * Activate integration
 * POST /api/integrations/justdial/activate
 */
router.post('/activate', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    await justDialService.activateIntegration(organizationId);

    res.json({
      success: true,
      message: 'JustDial integration activated',
    });
  } catch (error) {
    console.error('[JustDial] Activate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to activate integration',
    });
  }
});

/**
 * Deactivate integration
 * POST /api/integrations/justdial/deactivate
 */
router.post('/deactivate', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    await justDialService.deactivateIntegration(organizationId);

    res.json({
      success: true,
      message: 'JustDial integration deactivated',
    });
  } catch (error) {
    console.error('[JustDial] Deactivate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate integration',
    });
  }
});

/**
 * Delete integration
 * DELETE /api/integrations/justdial
 */
router.delete('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    await justDialService.deleteIntegration(organizationId);

    res.json({
      success: true,
      message: 'JustDial integration deleted',
    });
  } catch (error) {
    console.error('[JustDial] Delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete integration',
    });
  }
});

/**
 * Test webhook endpoint (for development/testing)
 * POST /api/integrations/justdial/test-webhook
 */
router.post('/test-webhook', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const integration = await justDialService.getIntegration(organizationId);

    if (!integration) {
      return res.status(404).json({
        success: false,
        message: 'JustDial integration not configured',
      });
    }

    // Create test payload
    const testPayload: JustDialWebhookPayload = {
      leadid: `TEST-${Date.now()}`,
      name: 'Test Lead',
      mobile: '+919999999999',
      email: 'test@example.com',
      category: 'Test Category',
      city: 'Mumbai',
      area: 'Andheri',
      query: 'This is a test enquiry from JustDial webhook test',
      leadtype: 'premium',
    };

    const result = await justDialService.processWebhook(
      integration.webhookToken,
      testPayload
    );

    res.json({
      success: result.success,
      message: result.message,
      data: {
        rawImportRecordId: result.rawImportRecordId,
        isDuplicate: result.isDuplicate,
      },
    });
  } catch (error) {
    console.error('[JustDial] Test webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test webhook',
    });
  }
});

export default router;
