/**
 * Deal Intelligence Routes
 */

import { Router, Request, Response } from 'express';
import { dealIntelligenceService } from '../services/deal-intelligence.service';
import { authenticate } from '../middlewares/auth';

const router = Router();
router.use(authenticate as any);

// Get dashboard data
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const data = await dealIntelligenceService.getDashboardData(organizationId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all deals with intelligence
router.get('/', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const { minProbability, maxProbability, minHealth, maxHealth, limit, offset } = req.query;
    const data = await dealIntelligenceService.getAllDeals(organizationId, {
      minProbability: minProbability ? parseFloat(minProbability as string) : undefined,
      maxProbability: maxProbability ? parseFloat(maxProbability as string) : undefined,
      minHealth: minHealth ? parseFloat(minHealth as string) : undefined,
      maxHealth: maxHealth ? parseFloat(maxHealth as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });
    res.json({ success: true, data: data.deals, total: data.total });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get deal intelligence for a lead
router.get('/lead/:leadId', async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;
    const data = await dealIntelligenceService.getDealIntelligence(leadId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Calculate deal intelligence for a lead
router.post('/lead/:leadId/calculate', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const { leadId } = req.params;
    const result = await dealIntelligenceService.calculateDealIntelligence(leadId, organizationId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Resolve a risk alert
router.post('/alerts/:alertId/resolve', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { alertId } = req.params;
    const result = await dealIntelligenceService.resolveRiskAlert(alertId, userId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Record win/loss analysis
router.post('/win-loss', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const userId = (req as any).user.id;
    const result = await dealIntelligenceService.recordWinLossAnalysis({
      organizationId,
      analyzedById: userId,
      ...req.body,
    });
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Batch calculate deal intelligence
router.post('/batch-calculate', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const { limit } = req.body;
    const result = await dealIntelligenceService.batchCalculateIntelligence(organizationId, limit);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
