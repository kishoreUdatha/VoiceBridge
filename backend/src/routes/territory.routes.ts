/**
 * Territory Management Routes
 */

import { Router, Request, Response } from 'express';
import { territoryService } from '../services/territory.service';

const router = Router();

// Get all territories
router.get('/', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { type, parentId, search } = req.query;

    const territories = await territoryService.getTerritories(organizationId, {
      type,
      parentId,
      search,
    });

    res.json(territories);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single territory
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const territory = await territoryService.getTerritory(req.params.id);
    if (!territory) {
      return res.status(404).json({ error: 'Territory not found' });
    }
    res.json(territory);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create territory
router.post('/', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const territory = await territoryService.createTerritory(organizationId, req.body);
    res.status(201).json(territory);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update territory
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const territory = await territoryService.updateTerritory(req.params.id, req.body);
    res.json(territory);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete territory
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await territoryService.deleteTerritory(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Assign user to territory
router.post('/:id/assign', async (req: Request, res: Response) => {
  try {
    const { userId, role, isPrimary } = req.body;
    const assignment = await territoryService.assignUserToTerritory(
      req.params.id,
      userId,
      role,
      isPrimary
    );
    res.status(201).json(assignment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Remove user from territory
router.delete('/:id/assign/:userId', async (req: Request, res: Response) => {
  try {
    await territoryService.removeUserFromTerritory(req.params.id, req.params.userId);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get territory statistics
router.get('/:id/stats', async (req: Request, res: Response) => {
  try {
    const stats = await territoryService.getTerritoryStats(req.params.id);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Auto-assign lead to territory
router.post('/auto-assign/:leadId', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const result = await territoryService.autoAssignLeadToTerritory(
      organizationId,
      req.params.leadId
    );
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
