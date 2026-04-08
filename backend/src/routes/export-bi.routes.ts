/**
 * Export & BI Routes
 */

import { Router, Request, Response } from 'express';
import { exportBIService } from '../services/export-bi.service';

const router = Router();

// ==================== Data Exports ====================

// Get export jobs
router.get('/exports', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { status, entity, limit } = req.query;

    const jobs = await exportBIService.getExportJobs(organizationId, {
      status,
      entity,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json(jobs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create export job
router.post('/exports', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const job = await exportBIService.createExportJob(organizationId, userId, req.body);
    res.status(201).json(job);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Execute export
router.post('/exports/:id/execute', async (req: Request, res: Response) => {
  try {
    const job = await exportBIService.executeExport(req.params.id);
    res.json(job);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Cleanup old exports
router.post('/exports/cleanup', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { daysOld } = req.body;
    const result = await exportBIService.cleanupOldExports(organizationId, daysOld);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== BI Connectors ====================

// Get BI connectors
router.get('/connectors', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const connectors = await exportBIService.getBIConnectors(organizationId);
    res.json(connectors);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create BI connector
router.post('/connectors', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const connector = await exportBIService.createBIConnector(organizationId, req.body);
    res.status(201).json(connector);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update BI connector
router.put('/connectors/:id', async (req: Request, res: Response) => {
  try {
    const connector = await exportBIService.updateBIConnector(req.params.id, req.body);
    res.json(connector);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Test BI connection
router.post('/connectors/:id/test', async (req: Request, res: Response) => {
  try {
    const result = await exportBIService.testBIConnection(req.params.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Sync to BI platform
router.post('/connectors/:id/sync', async (req: Request, res: Response) => {
  try {
    const result = await exportBIService.syncToBIPlatform(req.params.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete BI connector
router.delete('/connectors/:id', async (req: Request, res: Response) => {
  try {
    await exportBIService.deleteBIConnector(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== Analytics ====================

// Get executive dashboard
router.get('/analytics/dashboard', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { startDate, endDate } = req.query;
    const dateRange = startDate && endDate
      ? { start: new Date(startDate as string), end: new Date(endDate as string) }
      : undefined;
    const dashboard = await exportBIService.getExecutiveDashboard(organizationId, dateRange);
    res.json(dashboard);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get conversion funnel
router.get('/analytics/funnel', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { startDate, endDate } = req.query;
    const dateRange = startDate && endDate
      ? { start: new Date(startDate as string), end: new Date(endDate as string) }
      : undefined;
    const funnel = await exportBIService.getConversionFunnel(organizationId, dateRange);
    res.json(funnel);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get sales velocity
router.get('/analytics/velocity', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const velocity = await exportBIService.getSalesVelocity(organizationId);
    res.json(velocity);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get activity trends
router.get('/analytics/trends', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { days } = req.query;
    const trends = await exportBIService.getActivityTrends(
      organizationId,
      days ? parseInt(days as string) : undefined
    );
    res.json(trends);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
