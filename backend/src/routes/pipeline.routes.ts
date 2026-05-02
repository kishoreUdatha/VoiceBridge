import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import pipelineService from '../services/pipeline.service';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/pipelines
 * Get all pipelines for the organization
 */
router.get('/', async (req, res) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const { entityType } = req.query;

    const pipelines = await pipelineService.getPipelines(
      organizationId,
      entityType as string | undefined
    );

    res.json({
      success: true,
      data: pipelines,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pipelines',
      error: error.message,
    });
  }
});

/**
 * GET /api/pipelines/:id
 * Get a single pipeline with stages
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pipeline = await pipelineService.getPipelineById(id);

    if (!pipeline) {
      return res.status(404).json({
        success: false,
        message: 'Pipeline not found',
      });
    }

    res.json({
      success: true,
      data: pipeline,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pipeline',
      error: error.message,
    });
  }
});

/**
 * POST /api/pipelines
 * Create a new pipeline
 */
router.post('/', authorize(['admin', 'tenant_admin', 'super_admin', 'owner']), async (req, res) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const { name, slug, description, entityType, icon, color, isDefault } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Pipeline name is required',
      });
    }

    const pipeline = await pipelineService.createPipeline(organizationId, {
      name,
      slug,
      description,
      entityType,
      icon,
      color,
      isDefault,
    });

    res.status(201).json({
      success: true,
      data: pipeline,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to create pipeline',
      error: error.message,
    });
  }
});

/**
 * PUT /api/pipelines/:id
 * Update a pipeline
 */
router.put('/:id', authorize(['admin', 'tenant_admin', 'super_admin', 'owner']), async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const pipeline = await pipelineService.updatePipeline(id, data);

    res.json({
      success: true,
      data: pipeline,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to update pipeline',
      error: error.message,
    });
  }
});

/**
 * DELETE /api/pipelines/:id
 * Delete a pipeline
 */
router.delete('/:id', authorize(['admin', 'tenant_admin', 'super_admin', 'owner']), async (req, res) => {
  try {
    const { id } = req.params;
    await pipelineService.deletePipeline(id);

    res.json({
      success: true,
      message: 'Pipeline deleted successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete pipeline',
      error: error.message,
    });
  }
});

/**
 * GET /api/pipelines/:id/analytics
 * Get pipeline analytics with role-based filtering
 */
router.get('/:id/analytics', async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const roleSlug = user?.role?.slug || user?.roleSlug;

    const analytics = await pipelineService.getPipelineAnalytics(id, {
      organizationId: user?.organizationId,
      userRole: roleSlug,
      userId: user?.id,
    });

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pipeline analytics',
      error: error.message,
    });
  }
});

// ============ Stage Routes ============

/**
 * POST /api/pipelines/:id/stages
 * Create a new stage in the pipeline
 */
router.post('/:id/stages', authorize(['admin', 'tenant_admin', 'super_admin', 'owner']), async (req, res) => {
  try {
    const { id: pipelineId } = req.params;
    const data = req.body;

    if (!data.name) {
      return res.status(400).json({
        success: false,
        message: 'Stage name is required',
      });
    }

    const stage = await pipelineService.createPipelineStage(pipelineId, data);

    res.status(201).json({
      success: true,
      data: stage,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to create stage',
      error: error.message,
    });
  }
});

/**
 * PUT /api/pipelines/:pipelineId/stages/:stageId
 * Update a pipeline stage
 */
router.put('/:pipelineId/stages/:stageId', authorize(['admin', 'tenant_admin', 'super_admin', 'owner']), async (req, res) => {
  try {
    const { stageId } = req.params;
    const data = req.body;

    const stage = await pipelineService.updatePipelineStage(stageId, data);

    res.json({
      success: true,
      data: stage,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to update stage',
      error: error.message,
    });
  }
});

/**
 * DELETE /api/pipelines/:pipelineId/stages/:stageId
 * Delete a pipeline stage
 */
router.delete('/:pipelineId/stages/:stageId', authorize(['admin', 'tenant_admin', 'super_admin', 'owner']), async (req, res) => {
  try {
    const { stageId } = req.params;
    await pipelineService.deletePipelineStage(stageId);

    res.json({
      success: true,
      message: 'Stage deleted successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete stage',
      error: error.message,
    });
  }
});

/**
 * PUT /api/pipelines/:id/stages/reorder
 * Reorder pipeline stages
 */
router.put('/:id/stages/reorder', authorize(['admin', 'tenant_admin', 'super_admin', 'owner']), async (req, res) => {
  try {
    const { id: pipelineId } = req.params;
    const { stageOrders } = req.body;

    if (!Array.isArray(stageOrders)) {
      return res.status(400).json({
        success: false,
        message: 'stageOrders must be an array',
      });
    }

    await pipelineService.reorderPipelineStages(pipelineId, stageOrders);

    res.json({
      success: true,
      message: 'Stages reordered successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to reorder stages',
      error: error.message,
    });
  }
});

// ============ Transition Routes ============

/**
 * GET /api/pipelines/stages/:stageId/transitions
 * Get allowed transitions from a stage
 */
router.get('/stages/:stageId/transitions', async (req, res) => {
  try {
    const { stageId } = req.params;
    const transitions = await pipelineService.getAllowedTransitions(stageId);

    res.json({
      success: true,
      data: transitions,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transitions',
      error: error.message,
    });
  }
});

/**
 * POST /api/pipelines/transitions
 * Create a stage transition rule
 */
router.post('/transitions', authorize(['admin', 'tenant_admin', 'super_admin', 'owner']), async (req, res) => {
  try {
    const data = req.body;

    if (!data.fromStageId || !data.toStageId) {
      return res.status(400).json({
        success: false,
        message: 'fromStageId and toStageId are required',
      });
    }

    const transition = await pipelineService.createStageTransition(data);

    res.status(201).json({
      success: true,
      data: transition,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to create transition',
      error: error.message,
    });
  }
});

/**
 * PUT /api/pipelines/transitions/:id
 * Update a stage transition rule
 */
router.put('/transitions/:id', authorize(['admin', 'tenant_admin', 'super_admin', 'owner']), async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const transition = await pipelineService.updateStageTransition(id, data);

    res.json({
      success: true,
      data: transition,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to update transition',
      error: error.message,
    });
  }
});

/**
 * DELETE /api/pipelines/transitions/:id
 * Delete a stage transition rule
 */
router.delete('/transitions/:id', authorize(['admin', 'tenant_admin', 'super_admin', 'owner']), async (req, res) => {
  try {
    const { id } = req.params;
    await pipelineService.deleteStageTransition(id);

    res.json({
      success: true,
      message: 'Transition deleted successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete transition',
      error: error.message,
    });
  }
});

// ============ Pipeline Record Routes ============

/**
 * POST /api/pipelines/:id/records
 * Add a record to a pipeline
 */
router.post('/:id/records', async (req, res) => {
  try {
    const { id: pipelineId } = req.params;
    const { entityType, entityId, stageId } = req.body;

    if (!entityType || !entityId) {
      return res.status(400).json({
        success: false,
        message: 'entityType and entityId are required',
      });
    }

    const record = await pipelineService.addRecordToPipeline(
      pipelineId,
      entityType,
      entityId,
      stageId
    );

    res.status(201).json({
      success: true,
      data: record,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to add record to pipeline',
      error: error.message,
    });
  }
});

/**
 * PUT /api/pipelines/records/:recordId/move
 * Move a record to a different stage
 */
router.put('/records/:recordId/move', async (req, res) => {
  try {
    const { recordId } = req.params;
    const { toStageId, reason } = req.body;
    const userId = (req as any).user.id;

    if (!toStageId) {
      return res.status(400).json({
        success: false,
        message: 'toStageId is required',
      });
    }

    const record = await pipelineService.moveRecordToStage(
      recordId,
      toStageId,
      userId,
      reason
    );

    res.json({
      success: true,
      data: record,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to move record',
    });
  }
});

/**
 * GET /api/pipelines/records/:recordId/history
 * Get record stage history
 */
router.get('/records/:recordId/history', async (req, res) => {
  try {
    const { recordId } = req.params;
    const history = await pipelineService.getPipelineRecordHistory(recordId);

    res.json({
      success: true,
      data: history,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch record history',
      error: error.message,
    });
  }
});

export default router;
