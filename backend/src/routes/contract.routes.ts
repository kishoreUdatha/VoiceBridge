/**
 * Contract Management Routes
 */

import { Router, Request, Response } from 'express';
import { contractService } from '../services/contract.service';

const router = Router();

// Get all contracts
router.get('/', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { status, type, accountId, ownerId, search, limit, offset } = req.query;

    const contracts = await contractService.getContracts(organizationId, {
      status,
      type,
      accountId,
      ownerId,
      search,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json(contracts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single contract
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const contract = await contractService.getContract(req.params.id);
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    res.json(contract);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create contract
router.post('/', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const contract = await contractService.createContract(organizationId, req.body);
    res.status(201).json(contract);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update contract
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const contract = await contractService.updateContract(req.params.id, req.body);
    res.json(contract);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create new version
router.post('/:id/versions', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { documentUrl, changes } = req.body;
    const version = await contractService.createVersion(
      req.params.id,
      documentUrl,
      changes,
      userId
    );
    res.status(201).json(version);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Send for signature
router.post('/:id/send-for-signature', async (req: Request, res: Response) => {
  try {
    const { signatureProvider } = req.body;
    const contract = await contractService.sendForSignature(req.params.id, signatureProvider);
    res.json(contract);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Record signature (webhook from signature provider)
router.post('/:id/signatures', async (req: Request, res: Response) => {
  try {
    const { signatoryEmail, signatureData } = req.body;
    const contract = await contractService.recordSignature(
      req.params.id,
      signatoryEmail,
      signatureData
    );
    res.json(contract);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Activate contract
router.post('/:id/activate', async (req: Request, res: Response) => {
  try {
    const contract = await contractService.activateContract(req.params.id);
    res.json(contract);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Terminate contract
router.post('/:id/terminate', async (req: Request, res: Response) => {
  try {
    const { reason } = req.body;
    const contract = await contractService.terminateContract(req.params.id, reason);
    res.json(contract);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get contracts for renewal
router.get('/renewals/upcoming', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { daysAhead } = req.query;
    const contracts = await contractService.getContractsForRenewal(
      organizationId,
      daysAhead ? parseInt(daysAhead as string) : undefined
    );
    res.json(contracts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Renew contract
router.post('/:id/renew', async (req: Request, res: Response) => {
  try {
    const { newEndDate, newValue } = req.body;
    const contract = await contractService.renewContract(
      req.params.id,
      new Date(newEndDate),
      newValue
    );
    res.json(contract);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== Templates ====================

// Get templates
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { type } = req.query;
    const templates = await contractService.getTemplates(organizationId, type as any);
    res.json(templates);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create template
router.post('/templates', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { name, type, content, description, mergeFields } = req.body;
    const template = await contractService.createTemplate(
      organizationId,
      name,
      type,
      content,
      description,
      mergeFields
    );
    res.status(201).json(template);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Generate from template
router.post('/templates/:id/generate', async (req: Request, res: Response) => {
  try {
    const content = await contractService.generateFromTemplate(req.params.id, req.body);
    res.json({ content });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get contract statistics
router.get('/stats/overview', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const stats = await contractService.getContractStats(organizationId);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
