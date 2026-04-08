/**
 * IndiaMART Integration Routes
 *
 * Handles configuration and manual sync for IndiaMART CRM Lead Manager integration.
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middlewares/auth';
import { indiaMartService } from '../integrations/indiamart.service';

const router = Router();

/**
 * Get IndiaMART integration configuration
 * GET /api/integrations/indiamart/config
 */
router.get('/config', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const integration = await indiaMartService.getIntegration(organizationId);

    if (!integration) {
      return res.status(404).json({
        success: false,
        message: 'IndiaMART integration not configured',
      });
    }

    // Don't expose sensitive keys in response
    res.json({
      success: true,
      data: {
        id: integration.id,
        mobileNumber: integration.mobileNumber,
        hasCrmKey: !!integration.crmKey,
        glid: integration.glid,
        syncInterval: integration.syncInterval,
        lastSyncAt: integration.lastSyncAt,
        lastSyncStatus: integration.lastSyncStatus,
        lastSyncError: integration.lastSyncError,
        fieldMapping: integration.fieldMapping,
        productFilters: integration.productFilters,
        autoAssign: integration.autoAssign,
        defaultAssigneeId: integration.defaultAssigneeId,
        routingRuleId: integration.routingRuleId,
        totalLeadsSynced: integration.totalLeadsSynced,
        isActive: integration.isActive,
        createdAt: integration.createdAt,
      },
    });
  } catch (error) {
    console.error('[IndiaMART] Get config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get IndiaMART configuration',
    });
  }
});

/**
 * Setup or update IndiaMART integration
 * POST /api/integrations/indiamart/config
 */
router.post('/config', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const {
      mobileNumber,
      crmKey,
      glid,
      syncInterval,
      fieldMapping,
      productFilters,
      autoAssign,
      defaultAssigneeId,
      routingRuleId,
    } = req.body;

    // Validate required fields
    if (!mobileNumber || !crmKey) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number and CRM key are required',
      });
    }

    const integration = await indiaMartService.setupIntegration(organizationId, {
      mobileNumber,
      crmKey,
      glid,
      syncInterval,
      fieldMapping,
      productFilters,
      autoAssign,
      defaultAssigneeId,
      routingRuleId,
    });

    res.json({
      success: true,
      message: 'IndiaMART integration configured successfully',
      data: {
        id: integration.id,
        mobileNumber: integration.mobileNumber,
        syncInterval: integration.syncInterval,
        isActive: integration.isActive,
      },
    });
  } catch (error) {
    console.error('[IndiaMART] Setup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to configure IndiaMART integration',
    });
  }
});

/**
 * Test IndiaMART connection
 * POST /api/integrations/indiamart/test-connection
 */
router.post('/test-connection', authenticate, async (req: Request, res: Response) => {
  try {
    const { crmKey } = req.body;

    if (!crmKey) {
      // If no key provided, use existing integration
      const organizationId = req.user!.organizationId;
      const integration = await indiaMartService.getIntegration(organizationId);

      if (!integration) {
        return res.status(400).json({
          success: false,
          message: 'CRM key is required',
        });
      }

      const result = await indiaMartService.testConnection(integration.crmKey);
      return res.json({
        success: result.valid,
        message: result.message,
      });
    }

    const result = await indiaMartService.testConnection(crmKey);
    res.json({
      success: result.valid,
      message: result.message,
    });
  } catch (error) {
    console.error('[IndiaMART] Test connection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test connection',
    });
  }
});

/**
 * Manually trigger lead sync
 * POST /api/integrations/indiamart/sync
 */
router.post('/sync', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const result = await indiaMartService.syncLeads(organizationId);

    res.json({
      success: result.success,
      message: result.message,
      data: {
        totalFetched: result.totalFetched,
        imported: result.imported,
        duplicates: result.duplicates,
        errors: result.errors,
      },
    });
  } catch (error) {
    console.error('[IndiaMART] Sync error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync leads',
    });
  }
});

/**
 * Get integration statistics
 * GET /api/integrations/indiamart/stats
 */
router.get('/stats', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const stats = await indiaMartService.getStats(organizationId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('[IndiaMART] Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get statistics',
    });
  }
});

/**
 * Activate integration
 * POST /api/integrations/indiamart/activate
 */
router.post('/activate', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    await indiaMartService.activateIntegration(organizationId);

    res.json({
      success: true,
      message: 'IndiaMART integration activated',
    });
  } catch (error) {
    console.error('[IndiaMART] Activate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to activate integration',
    });
  }
});

/**
 * Deactivate integration
 * POST /api/integrations/indiamart/deactivate
 */
router.post('/deactivate', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    await indiaMartService.deactivateIntegration(organizationId);

    res.json({
      success: true,
      message: 'IndiaMART integration deactivated',
    });
  } catch (error) {
    console.error('[IndiaMART] Deactivate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate integration',
    });
  }
});

/**
 * Delete integration
 * DELETE /api/integrations/indiamart
 */
router.delete('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    await indiaMartService.deleteIntegration(organizationId);

    res.json({
      success: true,
      message: 'IndiaMART integration deleted',
    });
  } catch (error) {
    console.error('[IndiaMART] Delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete integration',
    });
  }
});

/**
 * Update sync interval
 * PATCH /api/integrations/indiamart/sync-interval
 */
router.patch('/sync-interval', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const { syncInterval } = req.body;

    if (!syncInterval || syncInterval < 5 || syncInterval > 1440) {
      return res.status(400).json({
        success: false,
        message: 'Sync interval must be between 5 and 1440 minutes',
      });
    }

    const integration = await indiaMartService.setupIntegration(organizationId, {
      mobileNumber: '', // Will be ignored in update
      crmKey: '', // Will be ignored in update
      syncInterval,
    });

    res.json({
      success: true,
      message: 'Sync interval updated',
      data: {
        syncInterval: integration.syncInterval,
      },
    });
  } catch (error) {
    console.error('[IndiaMART] Update sync interval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update sync interval',
    });
  }
});

export default router;
