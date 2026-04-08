/**
 * Social CRM Routes
 */

import { Router, Request, Response } from 'express';
import { socialCrmService } from '../services/social-crm.service';

const router = Router();

// ==================== Social Profiles ====================

// Get profiles for entity
router.get('/profiles/:entityType/:entityId', async (req: Request, res: Response) => {
  try {
    const profiles = await socialCrmService.getSocialProfiles(
      req.params.entityType as any,
      req.params.entityId
    );
    res.json(profiles);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add social profile
router.post('/profiles/:entityType/:entityId', async (req: Request, res: Response) => {
  try {
    const profile = await socialCrmService.addSocialProfile(
      req.params.entityType as any,
      req.params.entityId,
      req.body
    );
    res.status(201).json(profile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update social profile
router.put('/profiles/:id', async (req: Request, res: Response) => {
  try {
    const profile = await socialCrmService.updateSocialProfile(req.params.id, req.body);
    res.json(profile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete social profile
router.delete('/profiles/:id', async (req: Request, res: Response) => {
  try {
    await socialCrmService.deleteSocialProfile(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Enrich social profile
router.post('/profiles/:id/enrich', async (req: Request, res: Response) => {
  try {
    const profile = await socialCrmService.enrichSocialProfile(req.params.id);
    res.json(profile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== Social Mentions ====================

// Get mentions
router.get('/mentions', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { platform, sentiment, status, queryId, startDate, endDate, limit, offset } = req.query;

    const mentions = await socialCrmService.getMentions(organizationId, {
      platform,
      sentiment,
      status,
      queryId,
      dateRange: startDate && endDate
        ? { start: new Date(startDate as string), end: new Date(endDate as string) }
        : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json(mentions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single mention
router.get('/mentions/:id', async (req: Request, res: Response) => {
  try {
    const mention = await socialCrmService.getMention(req.params.id);
    if (!mention) {
      return res.status(404).json({ error: 'Mention not found' });
    }
    res.json(mention);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create mention (webhook from social listening tool)
router.post('/mentions', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { queryId, ...data } = req.body;
    const mention = await socialCrmService.createMention(organizationId, queryId, data);
    res.status(201).json(mention);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update mention status
router.put('/mentions/:id/status', async (req: Request, res: Response) => {
  try {
    const { status, notes } = req.body;
    const mention = await socialCrmService.updateMentionStatus(req.params.id, status, notes);
    res.json(mention);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Link mention to lead
router.post('/mentions/:id/link-lead', async (req: Request, res: Response) => {
  try {
    const { leadId } = req.body;
    const mention = await socialCrmService.linkMentionToLead(req.params.id, leadId);
    res.json(mention);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Link mention to account
router.post('/mentions/:id/link-account', async (req: Request, res: Response) => {
  try {
    const { accountId } = req.body;
    const mention = await socialCrmService.linkMentionToAccount(req.params.id, accountId);
    res.json(mention);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Convert mention to lead
router.post('/mentions/:id/convert', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { assignedToId } = req.body;
    const lead = await socialCrmService.convertMentionToLead(
      req.params.id,
      organizationId,
      assignedToId
    );
    res.status(201).json(lead);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Analyze sentiment
router.post('/mentions/analyze-sentiment', async (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    const sentiment = await socialCrmService.analyzeSentiment(content);
    res.json({ sentiment });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== Listening Queries ====================

// Get listening queries
router.get('/queries', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const queries = await socialCrmService.getListeningQueries(organizationId);
    res.json(queries);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create listening query
router.post('/queries', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const query = await socialCrmService.createListeningQuery(organizationId, req.body);
    res.status(201).json(query);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update listening query
router.put('/queries/:id', async (req: Request, res: Response) => {
  try {
    const query = await socialCrmService.updateListeningQuery(req.params.id, req.body);
    res.json(query);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Deactivate listening query
router.post('/queries/:id/deactivate', async (req: Request, res: Response) => {
  try {
    const query = await socialCrmService.deactivateListeningQuery(req.params.id);
    res.json(query);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Execute listening query
router.post('/queries/:id/execute', async (req: Request, res: Response) => {
  try {
    const result = await socialCrmService.executeListeningQuery(req.params.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== Analytics ====================

// Get social analytics
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { startDate, endDate } = req.query;
    const dateRange = startDate && endDate
      ? { start: new Date(startDate as string), end: new Date(endDate as string) }
      : undefined;
    const analytics = await socialCrmService.getSocialAnalytics(organizationId, dateRange);
    res.json(analytics);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get trending topics
router.get('/analytics/trending', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { limit } = req.query;
    const topics = await socialCrmService.getTrendingTopics(
      organizationId,
      limit ? parseInt(limit as string) : undefined
    );
    res.json(topics);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get influencers
router.get('/analytics/influencers', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { limit } = req.query;
    const influencers = await socialCrmService.getInfluencers(
      organizationId,
      limit ? parseInt(limit as string) : undefined
    );
    res.json(influencers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
