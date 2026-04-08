/**
 * Predictive Analytics Routes
 */

import { Router, Request, Response } from 'express';
import { predictiveAnalyticsService } from '../services/predictive-analytics.service';
import { authenticate } from '../middlewares/auth';

const router = Router();
router.use(authenticate as any);

// Get dashboard data
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const data = await predictiveAnalyticsService.getDashboardData(organizationId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get prediction for a lead
router.get('/lead/:leadId', async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;
    const prediction = await predictiveAnalyticsService.getLeadPrediction(leadId);
    const ltv = await predictiveAnalyticsService.getLeadLTV(leadId);
    res.json({ success: true, data: { prediction, ltv } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Calculate conversion score for a lead
router.post('/lead/:leadId/conversion', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const { leadId } = req.params;
    const result = await predictiveAnalyticsService.calculateConversionScore(leadId, organizationId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Calculate churn risk for a lead
router.post('/lead/:leadId/churn', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const { leadId } = req.params;
    const result = await predictiveAnalyticsService.calculateChurnRisk(leadId, organizationId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Calculate LTV for a lead
router.post('/lead/:leadId/ltv', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const { leadId } = req.params;
    const result = await predictiveAnalyticsService.calculateLTV(leadId, organizationId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Batch calculate predictions
router.post('/batch-calculate', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const { limit } = req.body;
    const result = await predictiveAnalyticsService.batchCalculatePredictions(organizationId, limit);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
