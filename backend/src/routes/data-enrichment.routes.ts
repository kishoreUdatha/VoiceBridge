/**
 * Data Enrichment Routes
 */

import { Router, Request, Response } from 'express';
import { dataEnrichmentService } from '../services/data-enrichment.service';

const router = Router();

// Get enrichment providers
router.get('/providers', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const providers = await dataEnrichmentService.getProviders(organizationId);
    res.json(providers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Configure provider
router.post('/providers', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { provider, apiKey, config } = req.body;
    const result = await dataEnrichmentService.configureProvider(
      organizationId,
      provider,
      apiKey,
      config
    );
    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update provider
router.put('/providers/:id', async (req: Request, res: Response) => {
  try {
    const { apiKey, config, isActive } = req.body;
    const result = await dataEnrichmentService.updateProvider(req.params.id, {
      apiKey,
      config,
      isActive,
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Enrich lead
router.post('/enrich/lead/:leadId', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { provider } = req.body;
    const result = await dataEnrichmentService.enrichLead(
      organizationId,
      req.params.leadId,
      provider
    );
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Enrich account
router.post('/enrich/account/:accountId', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { provider } = req.body;
    const result = await dataEnrichmentService.enrichAccount(
      organizationId,
      req.params.accountId,
      provider
    );
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk enrich leads
router.post('/enrich/leads/bulk', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { leadIds, provider } = req.body;
    const results = await dataEnrichmentService.bulkEnrichLeads(
      organizationId,
      leadIds,
      provider
    );
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get enrichment logs (also available as /history for frontend compatibility)
router.get('/logs', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { leadId, accountId, provider, status, limit } = req.query;
    const logs = await dataEnrichmentService.getEnrichmentLogs(organizationId, {
      leadId,
      accountId,
      provider,
      status,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Alias for /logs - frontend uses /history
router.get('/history', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { leadId, accountId, provider, status, limit } = req.query;
    const logs = await dataEnrichmentService.getEnrichmentLogs(organizationId, {
      leadId,
      accountId,
      provider,
      status,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get enrichment stats
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const stats = await dataEnrichmentService.getEnrichmentStats(organizationId);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
