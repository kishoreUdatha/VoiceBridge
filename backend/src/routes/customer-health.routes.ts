/**
 * Customer Health Routes
 */

import { Router, Request, Response } from 'express';
import { customerHealthService } from '../services/customer-health.service';
import { authenticate } from '../middlewares/auth';

const router = Router();
router.use(authenticate as any);

// Get dashboard data
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const data = await customerHealthService.getDashboardData(organizationId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all health records
router.get('/', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const { riskLevel, trend, limit, offset } = req.query;
    const data = await customerHealthService.getAllHealthRecords(organizationId, {
      riskLevel: riskLevel as any,
      trend: trend as any,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });
    res.json({ success: true, data: data.records, total: data.total });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get health for a specific lead
router.get('/lead/:leadId', async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;
    const health = await customerHealthService.getCustomerHealth(leadId);
    res.json({ success: true, data: health });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Calculate health score for a lead
router.post('/lead/:leadId/calculate', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const { leadId } = req.params;
    const result = await customerHealthService.calculateHealthScore(leadId, organizationId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create intervention
router.post('/interventions', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const intervention = await customerHealthService.createIntervention({
      organizationId,
      ...req.body,
    });
    res.json({ success: true, data: intervention });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update intervention
router.put('/interventions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const intervention = await customerHealthService.updateIntervention(id, req.body);
    res.json({ success: true, data: intervention });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Record survey response
router.post('/surveys', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const survey = await customerHealthService.recordSurvey({
      organizationId,
      ...req.body,
    });
    res.json({ success: true, data: survey });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Batch calculate health scores
router.post('/batch-calculate', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const { limit } = req.body;
    const result = await customerHealthService.batchCalculateHealth(organizationId, limit);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
