/**
 * Lead Pipeline Routes
 * API endpoints for unified pipeline management
 */

import { Router, Response, NextFunction } from 'express';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { leadPipelineService } from '../services/lead-pipeline.service';

const router = Router();

// Apply middleware
router.use(authenticate);
router.use(tenantMiddleware);

/**
 * GET /api/lead-pipeline/stages
 * Get pipeline stages for Kanban view
 * Optional: ?leadId=xxx to get stages from that lead's specific pipeline
 */
router.get('/stages', async (req: TenantRequest, res: Response) => {
  try {
    const { leadId } = req.query;
    const stages = await leadPipelineService.getPipelineStages(req.organizationId!, leadId as string);
    res.json({
      success: true,
      data: stages,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pipeline stages',
      error: error.message,
    });
  }
});

/**
 * GET /api/lead-pipeline/kanban
 * Get leads grouped by pipeline stage for Kanban view
 */
router.get('/kanban', async (req: TenantRequest, res: Response) => {
  try {
    const { assignedTo, source, search } = req.query;

    console.log('[LeadPipeline] Kanban request:', { organizationId: req.organizationId, assignedTo, source, search });

    const result = await leadPipelineService.getLeadsByStage(req.organizationId!, {
      assignedTo: assignedTo as string,
      source: source as string,
      search: search as string,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('[LeadPipeline] Kanban error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Kanban data',
      error: error.message,
    });
  }
});

/**
 * GET /api/lead-pipeline/analytics
 * Get pipeline analytics
 */
router.get('/analytics', async (req: TenantRequest, res: Response) => {
  try {
    const analytics = await leadPipelineService.getPipelineAnalytics(req.organizationId!);
    res.json({
      success: true,
      data: analytics,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: error.message,
    });
  }
});

/**
 * GET /api/lead-pipeline/sla-breaches
 * Get leads that have breached SLA
 */
router.get('/sla-breaches', async (req: TenantRequest, res: Response) => {
  try {
    const breaches = await leadPipelineService.checkSLABreaches(req.organizationId!);
    res.json({
      success: true,
      data: breaches,
      count: breaches.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to check SLA breaches',
      error: error.message,
    });
  }
});

/**
 * POST /api/lead-pipeline/:leadId/move
 * Move a lead to a different stage
 */
router.post('/:leadId/move', async (req: TenantRequest, res: Response) => {
  try {
    const { leadId } = req.params;
    const { toStageId, reason } = req.body;

    if (!toStageId) {
      return res.status(400).json({
        success: false,
        message: 'toStageId is required',
      });
    }

    const lead = await leadPipelineService.moveLeadToStage({
      leadId,
      toStageId,
      userId: req.user!.id,
      reason,
    });

    res.json({
      success: true,
      message: 'Lead moved successfully',
      data: lead,
    });
  } catch (error: any) {
    const statusCode = error.name === 'NotFoundError' ? 404 :
                       error.name === 'BadRequestError' ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to move lead',
    });
  }
});

/**
 * GET /api/lead-pipeline/:leadId/history
 * Get stage history for a lead
 */
router.get('/:leadId/history', async (req: TenantRequest, res: Response) => {
  try {
    const { leadId } = req.params;
    const history = await leadPipelineService.getLeadStageHistory(leadId);
    res.json({
      success: true,
      data: history,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stage history',
      error: error.message,
    });
  }
});

/**
 * POST /api/lead-pipeline/:leadId/assign
 * Manually assign a lead to the default pipeline
 */
router.post('/:leadId/assign', async (req: TenantRequest, res: Response) => {
  try {
    const { leadId } = req.params;
    const lead = await leadPipelineService.assignLeadToPipeline(leadId, req.organizationId!);

    if (!lead) {
      return res.status(400).json({
        success: false,
        message: 'Could not assign lead to pipeline. Make sure a default pipeline exists.',
      });
    }

    res.json({
      success: true,
      message: 'Lead assigned to pipeline',
      data: lead,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to assign lead to pipeline',
      error: error.message,
    });
  }
});

/**
 * POST /api/lead-pipeline/migrate-leads
 * Migrate all leads without pipelineStageId to the default pipeline
 * Admin only
 */
router.post('/migrate-leads', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId!;

    // Get default pipeline
    const pipeline = await leadPipelineService.getDefaultPipeline(organizationId);
    if (!pipeline) {
      return res.status(400).json({
        success: false,
        message: 'No default pipeline found. Please create a pipeline first.',
      });
    }

    // Get entry stage
    const entryStage = pipeline.stages.find(s => s.stageType === 'entry') || pipeline.stages[0];
    if (!entryStage) {
      return res.status(400).json({
        success: false,
        message: 'Pipeline has no stages. Please add stages first.',
      });
    }

    // Find all leads without pipelineStageId
    const { prisma } = await import('../config/database');
    const leadsToMigrate = await prisma.lead.findMany({
      where: {
        organizationId,
        pipelineStageId: null,
      },
      select: { id: true },
    });

    if (leadsToMigrate.length === 0) {
      return res.json({
        success: true,
        message: 'All leads are already assigned to a pipeline stage.',
        data: { migratedCount: 0 },
      });
    }

    // Batch update leads
    const result = await prisma.lead.updateMany({
      where: {
        organizationId,
        pipelineStageId: null,
      },
      data: {
        pipelineStageId: entryStage.id,
        pipelineEnteredAt: new Date(),
        pipelineDaysInStage: 0,
      },
    });

    console.log(`[LeadPipeline] Migrated ${result.count} leads to pipeline "${pipeline.name}" (stage: "${entryStage.name}")`);

    res.json({
      success: true,
      message: `Successfully migrated ${result.count} leads to the pipeline.`,
      data: {
        migratedCount: result.count,
        pipelineName: pipeline.name,
        entryStage: entryStage.name,
      },
    });
  } catch (error: any) {
    console.error('[LeadPipeline] Migration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to migrate leads',
      error: error.message,
    });
  }
});

export default router;
