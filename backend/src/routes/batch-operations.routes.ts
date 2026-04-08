/**
 * Batch Operations Routes
 * Handles bulk operations on leads with audit trail and rollback
 */

import { Router, Request, Response } from 'express';
import { batchOperationsService } from '../services/batch-operations.service';
import { authenticate, authorize as authorizeRoles } from '../middlewares/auth';

const router = Router();

// Get all batch operations
router.get('/', authenticate as any, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const operations = await batchOperationsService.getBatchOperations(
      req.user!.organizationId,
      limit
    );
    res.json(operations);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single batch operation with items
router.get('/:id', authenticate as any, async (req: Request, res: Response) => {
  try {
    const operation = await batchOperationsService.getBatchOperation(req.params.id);
    if (!operation) {
      return res.status(404).json({ error: 'Operation not found' });
    }
    res.json(operation);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create and start batch operation
router.post('/', authenticate as any, authorizeRoles('ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  try {
    const operation = await batchOperationsService.createBatchOperation(
      req.user!.organizationId,
      req.user!.id,
      req.body
    );
    res.status(201).json(operation);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Rollback batch operation
router.post('/:id/rollback', authenticate as any, authorizeRoles('ADMIN'), async (req: Request, res: Response) => {
  try {
    const result = await batchOperationsService.rollbackBatchOperation(
      req.params.id,
      req.user!.id
    );
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Pause batch operation
router.post('/:id/pause', authenticate as any, authorizeRoles('ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  try {
    const operation = await batchOperationsService.pauseBatchOperation(req.params.id);
    res.json(operation);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Resume batch operation
router.post('/:id/resume', authenticate as any, authorizeRoles('ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  try {
    const result = await batchOperationsService.resumeBatchOperation(req.params.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel batch operation
router.post('/:id/cancel', authenticate as any, authorizeRoles('ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  try {
    const operation = await batchOperationsService.cancelBatchOperation(req.params.id);
    res.json(operation);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get operation types
router.get('/meta/operation-types', authenticate as any, async (req: Request, res: Response) => {
  try {
    const types = batchOperationsService.getOperationTypes();
    res.json(types);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
