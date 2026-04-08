/**
 * Report Builder Routes
 * Handles custom report creation, scheduling, and execution
 */

import { Router, Request, Response } from 'express';
import { reportBuilderService } from '../services/report-builder.service';
import { authenticate, authorize as authorizeRoles } from '../middlewares/auth';

const router = Router();

// Get all report definitions
router.get('/definitions', authenticate as any, async (req: Request, res: Response) => {
  try {
    const reports = await reportBuilderService.getReportDefinitions(req.user!.organizationId);
    res.json(reports);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single report definition
router.get('/definitions/:id', authenticate as any, async (req: Request, res: Response) => {
  try {
    const report = await reportBuilderService.getReportDefinition(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json(report);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create report definition
router.post('/definitions', authenticate as any, authorizeRoles('ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  try {
    const report = await reportBuilderService.createReportDefinition(
      req.user!.organizationId,
      req.user!.id,
      req.body
    );
    res.status(201).json(report);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update report definition
router.put('/definitions/:id', authenticate as any, authorizeRoles('ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  try {
    const report = await reportBuilderService.updateReportDefinition(req.params.id, req.body);
    res.json(report);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete report definition
router.delete('/definitions/:id', authenticate as any, authorizeRoles('ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  try {
    await reportBuilderService.deleteReportDefinition(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create schedule for a report
router.post('/definitions/:id/schedules', authenticate as any, authorizeRoles('ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  try {
    const schedule = await reportBuilderService.createSchedule(
      req.params.id,
      req.user!.organizationId,
      req.body
    );
    res.status(201).json(schedule);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update schedule
router.put('/schedules/:id', authenticate as any, authorizeRoles('ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  try {
    const schedule = await reportBuilderService.updateSchedule(req.params.id, req.body);
    res.json(schedule);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete schedule
router.delete('/schedules/:id', authenticate as any, authorizeRoles('ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  try {
    await reportBuilderService.deleteSchedule(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Execute report
router.post('/definitions/:id/execute', authenticate as any, async (req: Request, res: Response) => {
  try {
    const result = await reportBuilderService.executeReport(
      req.params.id,
      req.user!.organizationId,
      req.user!.id
    );
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get execution history
router.get('/definitions/:id/executions', authenticate as any, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const executions = await reportBuilderService.getExecutionHistory(req.params.id, limit);
    res.json(executions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get available data sources
router.get('/data-sources', authenticate as any, async (req: Request, res: Response) => {
  try {
    const sources = reportBuilderService.getAvailableDataSources();
    res.json(sources);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
