/**
 * Account Management Routes
 */

import { Router, Request, Response } from 'express';
import { accountService } from '../services/account.service';

const router = Router();

// Get account statistics (must be before /:id to avoid matching "stats" as an id)
router.get('/stats/overview', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const stats = await accountService.getAccountStats(organizationId);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all accounts
router.get('/', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { industry, type, tier, ownerId, search, limit, offset } = req.query;

    const accounts = await accountService.getAccounts(organizationId, {
      industry,
      type,
      tier,
      ownerId,
      search,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json(accounts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single account
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const account = await accountService.getAccount(req.params.id);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    res.json(account);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create account
router.post('/', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const account = await accountService.createAccount(organizationId, req.body);
    res.status(201).json(account);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update account
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const account = await accountService.updateAccount(req.params.id, req.body);
    res.json(account);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get account hierarchy
router.get('/:id/hierarchy', async (req: Request, res: Response) => {
  try {
    const hierarchy = await accountService.getAccountHierarchy(req.params.id);
    res.json(hierarchy);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add contact to account
router.post('/:id/contacts', async (req: Request, res: Response) => {
  try {
    const contact = await accountService.addContact(req.params.id, req.body);
    res.status(201).json(contact);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update contact
router.put('/:id/contacts/:contactId', async (req: Request, res: Response) => {
  try {
    const contact = await accountService.updateContact(req.params.contactId, req.body);
    res.json(contact);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete contact
router.delete('/:id/contacts/:contactId', async (req: Request, res: Response) => {
  try {
    await accountService.removeContact(req.params.contactId);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Log activity
router.post('/:id/activities', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { type, subject, description, relatedEntityType, relatedEntityId } = req.body;
    const activity = await accountService.logActivity(
      req.params.id,
      userId,
      type,
      subject,
      description,
      relatedEntityType,
      relatedEntityId
    );
    res.status(201).json(activity);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add note
router.post('/:id/notes', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { content, isPinned } = req.body;
    const note = await accountService.addNote(req.params.id, userId, content, isPinned);
    res.status(201).json(note);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Calculate health score
router.post('/:id/health-score', async (req: Request, res: Response) => {
  try {
    const score = await accountService.calculateHealthScore(req.params.id);
    res.json({ healthScore: score });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Merge accounts
router.post('/:id/merge/:targetId', async (req: Request, res: Response) => {
  try {
    const result = await accountService.mergeAccounts(req.params.id, req.params.targetId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
