/**
 * Pipeline Kanban Routes
 * Handles visual pipeline management with drag-drop
 */

import { Router, Request, Response } from 'express';
import { pipelineKanbanService } from '../services/pipeline-kanban.service';
import { authenticate, authorize as authorizeRoles } from '../middlewares/auth';

const router = Router();

// Get all pipeline views
router.get('/views', authenticate as any, async (req: Request, res: Response) => {
  try {
    const views = await pipelineKanbanService.getPipelineViews(req.user!.organizationId);
    res.json(views);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single pipeline view with data
router.get('/views/:id', authenticate as any, async (req: Request, res: Response) => {
  try {
    const view = await pipelineKanbanService.getPipelineView(
      req.params.id,
      req.user!.organizationId
    );
    if (!view) {
      return res.status(404).json({ error: 'Pipeline view not found' });
    }
    res.json(view);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create pipeline view
router.post('/views', authenticate as any, authorizeRoles('ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  try {
    const view = await pipelineKanbanService.createPipelineView(
      req.user!.organizationId,
      req.user!.id,
      req.body
    );
    res.status(201).json(view);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update pipeline view
router.put('/views/:id', authenticate as any, authorizeRoles('ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  try {
    const view = await pipelineKanbanService.updatePipelineView(req.params.id, req.body);
    res.json(view);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete pipeline view
router.delete('/views/:id', authenticate as any, authorizeRoles('ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  try {
    await pipelineKanbanService.deletePipelineView(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create column
router.post('/views/:viewId/columns', authenticate as any, authorizeRoles('ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  try {
    const column = await pipelineKanbanService.createColumn(req.params.viewId, req.body);
    res.status(201).json(column);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update column
router.put('/columns/:id', authenticate as any, authorizeRoles('ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  try {
    const column = await pipelineKanbanService.updateColumn(req.params.id, req.body);
    res.json(column);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Reorder columns
router.post('/views/:viewId/columns/reorder', authenticate as any, authorizeRoles('ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  try {
    await pipelineKanbanService.reorderColumns(req.params.viewId, req.body.columnIds);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete column
router.delete('/columns/:id', authenticate as any, authorizeRoles('ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  try {
    await pipelineKanbanService.deleteColumn(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Move card (lead) to different column
router.post('/views/:viewId/move-card', authenticate as any, async (req: Request, res: Response) => {
  try {
    const { leadId, sourceColumn, targetColumn } = req.body;
    const result = await pipelineKanbanService.moveCard(
      leadId,
      req.user!.organizationId,
      sourceColumn,
      targetColumn,
      req.params.viewId
    );
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get pipeline statistics
router.get('/views/:viewId/stats', authenticate as any, async (req: Request, res: Response) => {
  try {
    const stats = await pipelineKanbanService.getPipelineStats(
      req.user!.organizationId,
      req.params.viewId
    );
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Detect stalled deals
router.get('/stalled-deals', authenticate as any, async (req: Request, res: Response) => {
  try {
    const threshold = parseInt(req.query.threshold as string) || 7;
    const stalledDeals = await pipelineKanbanService.detectStalledDeals(
      req.user!.organizationId,
      threshold
    );
    res.json(stalledDeals);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get default card fields
router.get('/meta/card-fields', authenticate as any, async (req: Request, res: Response) => {
  try {
    const fields = pipelineKanbanService.getDefaultCardFields();
    res.json(fields);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
