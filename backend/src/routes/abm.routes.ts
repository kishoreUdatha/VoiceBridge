/**
 * Account-Based Marketing Routes
 */

import { Router, Request, Response } from 'express';
import { abmService } from '../services/abm.service';

const router = Router();

// Get all campaigns
router.get('/campaigns', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { status, tier } = req.query;

    const campaigns = await abmService.getCampaigns(organizationId, { status, tier });
    res.json(campaigns);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single campaign
router.get('/campaigns/:id', async (req: Request, res: Response) => {
  try {
    const campaign = await abmService.getCampaign(req.params.id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    res.json(campaign);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create campaign
router.post('/campaigns', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const campaign = await abmService.createCampaign(organizationId, userId, req.body);
    res.status(201).json(campaign);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update campaign
router.put('/campaigns/:id', async (req: Request, res: Response) => {
  try {
    const campaign = await abmService.updateCampaign(req.params.id, req.body);
    res.json(campaign);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add play to campaign
router.post('/campaigns/:id/plays', async (req: Request, res: Response) => {
  try {
    const play = await abmService.addPlay(req.params.id, req.body);
    res.status(201).json(play);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update play
router.put('/plays/:id', async (req: Request, res: Response) => {
  try {
    const play = await abmService.updatePlay(req.params.id, req.body);
    res.json(play);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete play
router.delete('/plays/:id', async (req: Request, res: Response) => {
  try {
    await abmService.deletePlay(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add accounts to campaign
router.post('/campaigns/:id/accounts', async (req: Request, res: Response) => {
  try {
    const { accountIds } = req.body;
    const result = await abmService.addAccountsToCampaign(req.params.id, accountIds);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Remove account from campaign
router.delete('/campaigns/:campaignId/accounts/:accountId', async (req: Request, res: Response) => {
  try {
    await abmService.removeAccountFromCampaign(req.params.campaignId, req.params.accountId);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Track engagement
router.post('/campaigns/:campaignId/accounts/:accountId/engagement', async (req: Request, res: Response) => {
  try {
    const { eventType, metadata } = req.body;
    const engagement = await abmService.trackEngagement(
      req.params.campaignId,
      req.params.accountId,
      eventType,
      metadata
    );
    res.json(engagement);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update engagement stage
router.put('/campaigns/:campaignId/accounts/:accountId/stage', async (req: Request, res: Response) => {
  try {
    const { stage } = req.body;
    const engagement = await abmService.updateEngagementStage(
      req.params.campaignId,
      req.params.accountId,
      stage
    );
    res.json(engagement);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get account engagement
router.get('/campaigns/:campaignId/accounts/:accountId/engagement', async (req: Request, res: Response) => {
  try {
    const engagement = await abmService.getAccountEngagement(
      req.params.campaignId,
      req.params.accountId
    );
    res.json(engagement);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get campaign analytics
router.get('/campaigns/:id/analytics', async (req: Request, res: Response) => {
  try {
    const analytics = await abmService.getCampaignAnalytics(req.params.id);
    res.json(analytics);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update campaign metrics
router.post('/campaigns/:id/metrics', async (req: Request, res: Response) => {
  try {
    const campaign = await abmService.updateCampaignMetrics(req.params.id);
    res.json(campaign);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get target account recommendations
router.get('/recommendations', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { limit } = req.query;
    const recommendations = await abmService.getTargetAccountRecommendations(
      organizationId,
      limit ? parseInt(limit as string) : undefined
    );
    res.json(recommendations);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
