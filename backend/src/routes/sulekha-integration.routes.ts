/**
 * Sulekha Integration Routes
 *
 * Handles webhook endpoints and configuration for Sulekha lead capture.
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middlewares/auth';
import { sulekhaService, SulekhaWebhookPayload, SULEKHA_CATEGORIES } from '../integrations/sulekha.service';

const router = Router();

/**
 * PUBLIC: Webhook endpoint for Sulekha
 * POST /api/integrations/sulekha/webhook/:webhookToken
 */
router.post('/webhook/:webhookToken', async (req: Request, res: Response) => {
  try {
    const { webhookToken } = req.params;
    const payload: SulekhaWebhookPayload = req.body;
    const apiKeyHeader = req.headers['x-sulekha-api-key'] as string;

    console.log(`[Sulekha] Received webhook with token ${webhookToken.slice(0, 8)}...`);

    const result = await sulekhaService.processWebhook(webhookToken, payload, apiKeyHeader);

    res.status(200).json({
      status: result.success ? 'success' : 'failed',
      message: result.message,
      leadId: result.rawImportRecordId,
    });
  } catch (error) {
    console.error('[Sulekha] Webhook error:', error);
    res.status(200).json({ status: 'error', message: 'Internal server error' });
  }
});

// ==================== AUTHENTICATED ROUTES ====================

/**
 * Get available Sulekha categories
 * GET /api/integrations/sulekha/categories
 */
router.get('/categories', authenticate, async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: SULEKHA_CATEGORIES,
  });
});

/**
 * Get Sulekha integration configuration
 * GET /api/integrations/sulekha/config
 */
router.get('/config', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const integration = await sulekhaService.getIntegration(organizationId);

    if (!integration) {
      return res.status(404).json({
        success: false,
        message: 'Sulekha integration not configured',
      });
    }

    res.json({
      success: true,
      data: {
        id: integration.id,
        partnerId: integration.partnerId,
        hasApiKey: !!integration.apiKey,
        webhookToken: integration.webhookToken,
        webhookUrl: `${process.env.API_BASE_URL || ''}/api/integrations/sulekha/webhook/${integration.webhookToken}`,
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
    console.error('[Sulekha] Get config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get Sulekha configuration',
    });
  }
});

/**
 * Setup or update Sulekha integration
 * POST /api/integrations/sulekha/config
 */
router.post('/config', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const {
      partnerId,
      apiKey,
      categoryFilters,
      cityFilters,
      fieldMapping,
      autoAssign,
      defaultAssigneeId,
      routingRuleId,
    } = req.body;

    // Validate required fields
    if (!partnerId || !apiKey) {
      return res.status(400).json({
        success: false,
        message: 'Partner ID and API key are required',
      });
    }

    const integration = await sulekhaService.setupIntegration(organizationId, {
      partnerId,
      apiKey,
      categoryFilters,
      cityFilters,
      fieldMapping,
      autoAssign,
      defaultAssigneeId,
      routingRuleId,
    });

    res.json({
      success: true,
      message: 'Sulekha integration configured successfully',
      data: {
        id: integration.id,
        webhookToken: integration.webhookToken,
        webhookUrl: `${process.env.API_BASE_URL || ''}/api/integrations/sulekha/webhook/${integration.webhookToken}`,
        isActive: integration.isActive,
      },
    });
  } catch (error) {
    console.error('[Sulekha] Setup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to configure Sulekha integration',
    });
  }
});

/**
 * Regenerate webhook token
 * POST /api/integrations/sulekha/regenerate-token
 */
router.post('/regenerate-token', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const newToken = await sulekhaService.regenerateWebhookToken(organizationId);

    res.json({
      success: true,
      message: 'Webhook token regenerated',
      data: {
        webhookToken: newToken,
        webhookUrl: `${process.env.API_BASE_URL || ''}/api/integrations/sulekha/webhook/${newToken}`,
      },
    });
  } catch (error) {
    console.error('[Sulekha] Regenerate token error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to regenerate webhook token',
    });
  }
});

/**
 * Get integration statistics
 * GET /api/integrations/sulekha/stats
 */
router.get('/stats', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const stats = await sulekhaService.getStats(organizationId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('[Sulekha] Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get statistics',
    });
  }
});

/**
 * Activate integration
 * POST /api/integrations/sulekha/activate
 */
router.post('/activate', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    await sulekhaService.activateIntegration(organizationId);

    res.json({
      success: true,
      message: 'Sulekha integration activated',
    });
  } catch (error) {
    console.error('[Sulekha] Activate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to activate integration',
    });
  }
});

/**
 * Deactivate integration
 * POST /api/integrations/sulekha/deactivate
 */
router.post('/deactivate', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    await sulekhaService.deactivateIntegration(organizationId);

    res.json({
      success: true,
      message: 'Sulekha integration deactivated',
    });
  } catch (error) {
    console.error('[Sulekha] Deactivate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate integration',
    });
  }
});

/**
 * Delete integration
 * DELETE /api/integrations/sulekha
 */
router.delete('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    await sulekhaService.deleteIntegration(organizationId);

    res.json({
      success: true,
      message: 'Sulekha integration deleted',
    });
  } catch (error) {
    console.error('[Sulekha] Delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete integration',
    });
  }
});

export default router;
