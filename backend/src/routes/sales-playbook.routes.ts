/**
 * Sales Playbook Routes
 */

import { Router, Request, Response } from 'express';
import { salesPlaybookService } from '../services/sales-playbook.service';

const router = Router();

// ==================== Playbooks ====================

// Get all playbooks
router.get('/', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { type, search } = req.query;

    const playbooks = await salesPlaybookService.getPlaybooks(organizationId, { type, search });
    res.json(playbooks);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single playbook
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const playbook = await salesPlaybookService.getPlaybook(req.params.id);
    if (!playbook) {
      return res.status(404).json({ error: 'Playbook not found' });
    }
    res.json(playbook);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create playbook
router.post('/', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const playbook = await salesPlaybookService.createPlaybook(organizationId, userId, req.body);
    res.status(201).json(playbook);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update playbook
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const playbook = await salesPlaybookService.updatePlaybook(req.params.id, req.body);
    res.json(playbook);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Clone playbook
router.post('/:id/clone', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { newName } = req.body;
    const playbook = await salesPlaybookService.clonePlaybook(req.params.id, newName, userId);
    res.status(201).json(playbook);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Deactivate playbook
router.post('/:id/deactivate', async (req: Request, res: Response) => {
  try {
    const playbook = await salesPlaybookService.deactivatePlaybook(req.params.id);
    res.json(playbook);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get playbook analytics
router.get('/:id/analytics', async (req: Request, res: Response) => {
  try {
    const analytics = await salesPlaybookService.getPlaybookAnalytics(req.params.id);
    res.json(analytics);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get objection handlers
router.get('/:id/steps/:stepName/objections', async (req: Request, res: Response) => {
  try {
    const handlers = await salesPlaybookService.getObjectionHandlers(
      req.params.id,
      req.params.stepName
    );
    res.json(handlers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get battle cards
router.get('/:id/battle-cards', async (req: Request, res: Response) => {
  try {
    const { tags } = req.query;
    const cards = await salesPlaybookService.getBattleCards(
      req.params.id,
      tags ? (tags as string).split(',') : undefined
    );
    res.json(cards);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get recommended playbook for lead
router.get('/recommend/:leadId', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const playbook = await salesPlaybookService.getRecommendedPlaybook(
      organizationId,
      req.params.leadId
    );
    res.json(playbook);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== Executions ====================

// Get executions
router.get('/executions', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { playbookId, userId, leadId, status, limit } = req.query;

    const executions = await salesPlaybookService.getExecutions(organizationId, {
      playbookId,
      userId,
      leadId,
      status,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json(executions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single execution
router.get('/executions/:id', async (req: Request, res: Response) => {
  try {
    const execution = await salesPlaybookService.getExecution(req.params.id);
    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }
    res.json(execution);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Start execution
router.post('/executions', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { playbookId, leadId, opportunityId, accountId } = req.body;
    const execution = await salesPlaybookService.startExecution(playbookId, userId, {
      leadId,
      opportunityId,
      accountId,
    });
    res.status(201).json(execution);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Complete step
router.post('/executions/:id/steps/:stepName/complete', async (req: Request, res: Response) => {
  try {
    const { notes, outcome } = req.body;
    const execution = await salesPlaybookService.completeStep(
      req.params.id,
      req.params.stepName,
      notes,
      outcome
    );
    res.json(execution);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Skip step
router.post('/executions/:id/steps/:stepName/skip', async (req: Request, res: Response) => {
  try {
    const { reason } = req.body;
    const execution = await salesPlaybookService.skipStep(
      req.params.id,
      req.params.stepName,
      reason
    );
    res.json(execution);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Pause execution
router.post('/executions/:id/pause', async (req: Request, res: Response) => {
  try {
    const execution = await salesPlaybookService.pauseExecution(req.params.id);
    res.json(execution);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Resume execution
router.post('/executions/:id/resume', async (req: Request, res: Response) => {
  try {
    const execution = await salesPlaybookService.resumeExecution(req.params.id);
    res.json(execution);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Abandon execution
router.post('/executions/:id/abandon', async (req: Request, res: Response) => {
  try {
    const { reason } = req.body;
    const execution = await salesPlaybookService.abandonExecution(req.params.id, reason);
    res.json(execution);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
