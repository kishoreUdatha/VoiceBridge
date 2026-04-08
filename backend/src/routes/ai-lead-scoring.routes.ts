/**
 * AI Lead Scoring Routes
 * API endpoints for ML-based lead scoring
 */

import { Router, Request, Response } from 'express';
import { authenticate as authenticateToken, authorize as requireRole } from '../middlewares/auth';
import { aiLeadScoringService } from '../services/ai-lead-scoring.service';

const router = Router();

/**
 * Calculate/recalculate score for a specific lead
 */
router.post('/leads/:leadId/score', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;

    const score = await aiLeadScoringService.calculateScore(leadId);

    res.json({
      success: true,
      data: score,
    });
  } catch (error: any) {
    console.error('Error calculating lead score:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to calculate lead score',
    });
  }
});

/**
 * Get best time to call a lead
 */
router.get('/leads/:leadId/best-time', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;

    const bestTime = await aiLeadScoringService.predictBestTimeToCall(leadId);

    res.json({
      success: true,
      data: bestTime,
    });
  } catch (error: any) {
    console.error('Error predicting best time to call:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to predict best time',
    });
  }
});

/**
 * Get next best action recommendations for a lead
 */
router.get('/leads/:leadId/next-actions', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;

    const actions = await aiLeadScoringService.recommendNextAction(leadId);

    res.json({
      success: true,
      data: actions,
    });
  } catch (error: any) {
    console.error('Error recommending next action:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to recommend actions',
    });
  }
});

/**
 * Batch score leads for organization
 */
router.post('/batch-score', authenticateToken, requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const { limit = 100 } = req.body;

    if (!organizationId) {
      return res.status(401).json({ error: 'Organization not found' });
    }

    const result = await aiLeadScoringService.batchScoreLeads(organizationId, limit);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error batch scoring leads:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to batch score leads',
    });
  }
});

/**
 * Get organization scoring insights
 */
router.get('/insights', authenticateToken, requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Organization not found' });
    }

    const insights = await aiLeadScoringService.getOrganizationInsights(organizationId);

    res.json({
      success: true,
      data: insights,
    });
  } catch (error: any) {
    console.error('Error getting scoring insights:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get insights',
    });
  }
});

export default router;
