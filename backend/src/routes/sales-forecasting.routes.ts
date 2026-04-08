/**
 * Sales Forecasting Routes
 * API endpoints for pipeline forecasting and revenue predictions
 */

import { Router, Request, Response } from 'express';
import { salesForecastingService } from '../services/sales-forecasting.service';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.use(authenticate as any);

/**
 * GET /api/sales-forecasting/pipeline
 */
router.get('/pipeline', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const data = await salesForecastingService.getPipelineOverview(organizationId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/sales-forecasting/monthly
 */
router.get('/monthly', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const months = parseInt(req.query.months as string) || 6;
    const data = await salesForecastingService.getMonthlyForecast(organizationId, months);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/sales-forecasting/win-loss
 */
router.get('/win-loss', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const days = parseInt(req.query.days as string) || 90;
    const data = await salesForecastingService.getWinLossAnalysis(organizationId, days);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/sales-forecasting/accuracy
 */
router.get('/accuracy', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const data = await salesForecastingService.getForecastAccuracy(organizationId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/sales-forecasting/revenue-trend
 */
router.get('/revenue-trend', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const months = parseInt(req.query.months as string) || 12;
    const data = await salesForecastingService.getRevenueTrend(organizationId, months);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
