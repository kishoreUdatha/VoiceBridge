/**
 * Sentiment Analysis Routes
 */

import { Router, Request, Response } from 'express';
import { sentimentAnalysisService } from '../services/sentiment-analysis.service';
import { authenticate } from '../middlewares/auth';

const router = Router();
router.use(authenticate as any);

// Get dashboard data
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const data = await sentimentAnalysisService.getDashboardData(organizationId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get sentiment for a lead
router.get('/lead/:leadId', async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;
    const data = await sentimentAnalysisService.getLeadSentiment(leadId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Analyze call sentiment
router.post('/call/:callLogId', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const { callLogId } = req.params;
    const result = await sentimentAnalysisService.analyzeCallSentiment(callLogId, organizationId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Analyze message sentiment
router.post('/message', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const result = await sentimentAnalysisService.analyzeMessageSentiment({
      organizationId,
      ...req.body,
    });
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Analyze text (ad-hoc)
router.post('/analyze-text', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, message: 'Text is required' });
    }
    const result = sentimentAnalysisService.analyzeTextSentiment(text);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Calculate sentiment trends
router.post('/trends/:period', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const { period } = req.params;
    if (!['daily', 'weekly', 'monthly'].includes(period)) {
      return res.status(400).json({ success: false, message: 'Invalid period' });
    }
    const result = await sentimentAnalysisService.calculateSentimentTrends(
      organizationId,
      period as 'daily' | 'weekly' | 'monthly'
    );
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Batch analyze calls
router.post('/batch-analyze', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const { limit } = req.body;
    const result = await sentimentAnalysisService.batchAnalyzeCalls(organizationId, limit);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
