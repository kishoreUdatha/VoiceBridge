/**
 * Workflow Automation Routes
 * Handles visual workflow creation and execution
 */

import { Router, Request, Response } from 'express';
import { workflowAutomationService } from '../services/workflow-automation.service';
import { authenticate, authorize as authorizeRoles } from '../middlewares/auth';

const router = Router();

// Get all workflows
router.get('/', authenticate as any, async (req: Request, res: Response) => {
  try {
    const workflows = await workflowAutomationService.getWorkflows(req.user!.organizationId);
    res.json(workflows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single workflow
router.get('/:id', authenticate as any, async (req: Request, res: Response) => {
  try {
    const workflow = await workflowAutomationService.getWorkflow(req.params.id);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    res.json(workflow);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create workflow
router.post('/', authenticate as any, authorizeRoles('ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  try {
    const workflow = await workflowAutomationService.createWorkflow(
      req.user!.organizationId,
      req.user!.id,
      req.body
    );
    res.status(201).json(workflow);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update workflow
router.put('/:id', authenticate as any, authorizeRoles('ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  try {
    const workflow = await workflowAutomationService.updateWorkflow(req.params.id, req.body);
    res.json(workflow);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete workflow
router.delete('/:id', authenticate as any, authorizeRoles('ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  try {
    await workflowAutomationService.deleteWorkflow(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle workflow active status
router.patch('/:id/toggle', authenticate as any, authorizeRoles('ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  try {
    const workflow = await workflowAutomationService.toggleWorkflow(req.params.id);
    res.json(workflow);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Manually trigger workflow
router.post('/:id/trigger', authenticate as any, authorizeRoles('ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  try {
    const { entityId, data } = req.body;
    const execution = await workflowAutomationService.triggerWorkflow(
      req.params.id,
      entityId,
      data
    );
    res.json(execution);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get workflow executions
router.get('/:id/executions', authenticate as any, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const executions = await workflowAutomationService.getWorkflowExecutions(req.params.id, limit);
    res.json(executions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single execution with steps
router.get('/executions/:executionId', authenticate as any, async (req: Request, res: Response) => {
  try {
    const execution = await workflowAutomationService.getExecutionDetails(req.params.executionId);
    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }
    res.json(execution);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get workflow templates
router.get('/meta/templates', authenticate as any, async (req: Request, res: Response) => {
  try {
    const templates = workflowAutomationService.getWorkflowTemplates();
    res.json(templates);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get available node types
router.get('/meta/node-types', authenticate as any, async (req: Request, res: Response) => {
  try {
    const nodeTypes = workflowAutomationService.getNodeTypes();
    res.json(nodeTypes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get trigger types
router.get('/meta/trigger-types', authenticate as any, async (req: Request, res: Response) => {
  try {
    const triggerTypes = workflowAutomationService.getTriggerTypes();
    res.json(triggerTypes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
