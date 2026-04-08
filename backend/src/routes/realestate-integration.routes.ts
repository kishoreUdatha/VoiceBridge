/**
 * Real Estate Portals Integration Routes
 *
 * Handles webhook endpoints and configuration for:
 * - 99Acres
 * - MagicBricks
 * - Housing.com
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middlewares/auth';
import { RealEstatePlatform } from '@prisma/client';
import {
  realEstatePortalsService,
  Acres99WebhookPayload,
  MagicBricksWebhookPayload,
  HousingWebhookPayload,
  PLATFORM_NAMES,
} from '../integrations/realestate-portals.service';

const router = Router();

// ==================== PUBLIC WEBHOOK ENDPOINTS ====================

/**
 * Webhook endpoint for 99Acres
 * POST /api/integrations/realestate/99acres/webhook/:webhookToken
 */
router.post('/99acres/webhook/:webhookToken', async (req: Request, res: Response) => {
  try {
    const { webhookToken } = req.params;
    const payload: Acres99WebhookPayload = req.body;
    const signature = req.headers['x-99acres-signature'] as string;

    console.log(`[99Acres] Received webhook with token ${webhookToken.slice(0, 8)}...`);

    const result = await realEstatePortalsService.processWebhook(
      webhookToken,
      'ACRES_99',
      payload,
      signature
    );

    res.status(200).json({
      status: result.success ? 'success' : 'failed',
      message: result.message,
      leadId: result.rawImportRecordId,
    });
  } catch (error) {
    console.error('[99Acres] Webhook error:', error);
    res.status(200).json({ status: 'error', message: 'Internal server error' });
  }
});

/**
 * Webhook endpoint for MagicBricks
 * POST /api/integrations/realestate/magicbricks/webhook/:webhookToken
 */
router.post('/magicbricks/webhook/:webhookToken', async (req: Request, res: Response) => {
  try {
    const { webhookToken } = req.params;
    const payload: MagicBricksWebhookPayload = req.body;
    const signature = req.headers['x-magicbricks-signature'] as string;

    console.log(`[MagicBricks] Received webhook with token ${webhookToken.slice(0, 8)}...`);

    const result = await realEstatePortalsService.processWebhook(
      webhookToken,
      'MAGICBRICKS',
      payload,
      signature
    );

    res.status(200).json({
      status: result.success ? 'success' : 'failed',
      message: result.message,
      leadId: result.rawImportRecordId,
    });
  } catch (error) {
    console.error('[MagicBricks] Webhook error:', error);
    res.status(200).json({ status: 'error', message: 'Internal server error' });
  }
});

/**
 * Webhook endpoint for Housing.com
 * POST /api/integrations/realestate/housing/webhook/:webhookToken
 */
router.post('/housing/webhook/:webhookToken', async (req: Request, res: Response) => {
  try {
    const { webhookToken } = req.params;
    const payload: HousingWebhookPayload = req.body;
    const signature = req.headers['x-housing-signature'] as string;

    console.log(`[Housing.com] Received webhook with token ${webhookToken.slice(0, 8)}...`);

    const result = await realEstatePortalsService.processWebhook(
      webhookToken,
      'HOUSING',
      payload,
      signature
    );

    res.status(200).json({
      status: result.success ? 'success' : 'failed',
      message: result.message,
      leadId: result.rawImportRecordId,
    });
  } catch (error) {
    console.error('[Housing.com] Webhook error:', error);
    res.status(200).json({ status: 'error', message: 'Internal server error' });
  }
});

// ==================== AUTHENTICATED ROUTES ====================

/**
 * Normalize platform parameter to match enum
 */
function normalizePlatform(platform: string): string {
  const upper = platform.toUpperCase();
  // Handle 'acres99' -> 'ACRES_99' and '99acres' -> 'ACRES_99'
  if (upper === 'ACRES99' || upper === '99ACRES') return 'ACRES_99';
  return upper;
}

/**
 * Validate platform parameter
 */
function validatePlatform(platform: string): platform is RealEstatePlatform {
  return ['ACRES_99', 'MAGICBRICKS', 'HOUSING'].includes(platform);
}

/**
 * Get all real estate integrations
 * GET /api/integrations/realestate/config
 */
router.get('/config', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const integrations = await realEstatePortalsService.getAllIntegrations(organizationId);

    const result = integrations.map((integration) => ({
      id: integration.id,
      platform: integration.platform,
      platformName: PLATFORM_NAMES[integration.platform],
      webhookToken: integration.webhookToken,
      webhookUrl: `${process.env.API_BASE_URL || ''}/api/integrations/realestate/${integration.platform.toLowerCase().replace('_', '')}/webhook/${integration.webhookToken}`,
      hasApiKey: !!integration.apiKey,
      hasSecretKey: !!integration.secretKey,
      projectFilters: integration.projectFilters,
      cityFilters: integration.cityFilters,
      propertyTypeFilters: integration.propertyTypeFilters,
      budgetFilters: integration.budgetFilters,
      fieldMapping: integration.fieldMapping,
      autoAssign: integration.autoAssign,
      defaultAssigneeId: integration.defaultAssigneeId,
      routingRuleId: integration.routingRuleId,
      totalLeadsReceived: integration.totalLeadsReceived,
      lastLeadAt: integration.lastLeadAt,
      isActive: integration.isActive,
      createdAt: integration.createdAt,
    }));

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[RealEstate] Get config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get real estate configurations',
    });
  }
});

/**
 * Get specific platform configuration
 * GET /api/integrations/realestate/:platform/config
 */
router.get('/:platform/config', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const { platform } = req.params;

    if (!validatePlatform(normalizePlatform(platform))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid platform. Must be ACRES_99, MAGICBRICKS, or HOUSING',
      });
    }

    const platformEnum = normalizePlatform(platform) as RealEstatePlatform;
    const integration = await realEstatePortalsService.getIntegration(organizationId, platformEnum);

    if (!integration) {
      return res.status(404).json({
        success: false,
        message: `${PLATFORM_NAMES[platformEnum]} integration not configured`,
      });
    }

    // Build webhook URL based on platform
    const platformPath = platform.toLowerCase().replace('_', '');
    const webhookUrl = `${process.env.API_BASE_URL || ''}/api/integrations/realestate/${platformPath}/webhook/${integration.webhookToken}`;

    res.json({
      success: true,
      data: {
        id: integration.id,
        platform: integration.platform,
        platformName: PLATFORM_NAMES[platformEnum],
        webhookToken: integration.webhookToken,
        webhookUrl,
        hasApiKey: !!integration.apiKey,
        hasSecretKey: !!integration.secretKey,
        projectFilters: integration.projectFilters,
        cityFilters: integration.cityFilters,
        propertyTypeFilters: integration.propertyTypeFilters,
        budgetFilters: integration.budgetFilters,
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
    console.error('[RealEstate] Get platform config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get configuration',
    });
  }
});

/**
 * Setup or update platform integration
 * POST /api/integrations/realestate/:platform/config
 */
router.post('/:platform/config', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const { platform } = req.params;

    if (!validatePlatform(normalizePlatform(platform))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid platform',
      });
    }

    const platformEnum = normalizePlatform(platform) as RealEstatePlatform;
    const {
      apiKey,
      secretKey,
      projectFilters,
      cityFilters,
      propertyTypeFilters,
      budgetFilters,
      fieldMapping,
      autoAssign,
      defaultAssigneeId,
      routingRuleId,
    } = req.body;

    const integration = await realEstatePortalsService.setupIntegration(
      organizationId,
      platformEnum,
      {
        apiKey,
        secretKey,
        projectFilters,
        cityFilters,
        propertyTypeFilters,
        budgetFilters,
        fieldMapping,
        autoAssign,
        defaultAssigneeId,
        routingRuleId,
      }
    );

    const platformPath = platform.toLowerCase().replace('_', '');
    const webhookUrl = `${process.env.API_BASE_URL || ''}/api/integrations/realestate/${platformPath}/webhook/${integration.webhookToken}`;

    res.json({
      success: true,
      message: `${PLATFORM_NAMES[platformEnum]} integration configured successfully`,
      data: {
        id: integration.id,
        webhookToken: integration.webhookToken,
        webhookUrl,
        isActive: integration.isActive,
      },
    });
  } catch (error) {
    console.error('[RealEstate] Setup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to configure integration',
    });
  }
});

/**
 * Regenerate webhook token
 * POST /api/integrations/realestate/:platform/regenerate-token
 */
router.post('/:platform/regenerate-token', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const { platform } = req.params;

    if (!validatePlatform(normalizePlatform(platform))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid platform',
      });
    }

    const platformEnum = normalizePlatform(platform) as RealEstatePlatform;
    const newToken = await realEstatePortalsService.regenerateWebhookToken(
      organizationId,
      platformEnum
    );

    const platformPath = platform.toLowerCase().replace('_', '');
    const webhookUrl = `${process.env.API_BASE_URL || ''}/api/integrations/realestate/${platformPath}/webhook/${newToken}`;

    res.json({
      success: true,
      message: 'Webhook token regenerated',
      data: {
        webhookToken: newToken,
        webhookUrl,
      },
    });
  } catch (error) {
    console.error('[RealEstate] Regenerate token error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to regenerate webhook token',
    });
  }
});

/**
 * Get platform statistics
 * GET /api/integrations/realestate/:platform/stats
 */
router.get('/:platform/stats', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const { platform } = req.params;

    if (!validatePlatform(normalizePlatform(platform))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid platform',
      });
    }

    const platformEnum = normalizePlatform(platform) as RealEstatePlatform;
    const stats = await realEstatePortalsService.getStats(organizationId, platformEnum);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('[RealEstate] Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get statistics',
    });
  }
});

/**
 * Get combined statistics for all platforms
 * GET /api/integrations/realestate/stats
 */
router.get('/stats', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const stats = await realEstatePortalsService.getCombinedStats(organizationId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('[RealEstate] Get combined stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get statistics',
    });
  }
});

/**
 * Activate platform integration
 * POST /api/integrations/realestate/:platform/activate
 */
router.post('/:platform/activate', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const { platform } = req.params;

    if (!validatePlatform(normalizePlatform(platform))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid platform',
      });
    }

    const platformEnum = normalizePlatform(platform) as RealEstatePlatform;
    await realEstatePortalsService.activateIntegration(organizationId, platformEnum);

    res.json({
      success: true,
      message: `${PLATFORM_NAMES[platformEnum]} integration activated`,
    });
  } catch (error) {
    console.error('[RealEstate] Activate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to activate integration',
    });
  }
});

/**
 * Deactivate platform integration
 * POST /api/integrations/realestate/:platform/deactivate
 */
router.post('/:platform/deactivate', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const { platform } = req.params;

    if (!validatePlatform(normalizePlatform(platform))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid platform',
      });
    }

    const platformEnum = normalizePlatform(platform) as RealEstatePlatform;
    await realEstatePortalsService.deactivateIntegration(organizationId, platformEnum);

    res.json({
      success: true,
      message: `${PLATFORM_NAMES[platformEnum]} integration deactivated`,
    });
  } catch (error) {
    console.error('[RealEstate] Deactivate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate integration',
    });
  }
});

/**
 * Delete platform integration
 * DELETE /api/integrations/realestate/:platform
 */
router.delete('/:platform', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const { platform } = req.params;

    if (!validatePlatform(normalizePlatform(platform))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid platform',
      });
    }

    const platformEnum = normalizePlatform(platform) as RealEstatePlatform;
    await realEstatePortalsService.deleteIntegration(organizationId, platformEnum);

    res.json({
      success: true,
      message: `${PLATFORM_NAMES[platformEnum]} integration deleted`,
    });
  } catch (error) {
    console.error('[RealEstate] Delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete integration',
    });
  }
});

export default router;
