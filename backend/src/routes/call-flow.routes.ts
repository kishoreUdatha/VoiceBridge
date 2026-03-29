/**
 * Call Flow Routes
 * API endpoints for managing structured call flows
 */

import { Router, Response } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, authorize, AuthenticatedRequest } from '../middlewares/auth';
import { tenantMiddleware } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import { callFlowService } from '../services/call-flow.service';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticate);
router.use(tenantMiddleware);

/**
 * GET /api/call-flows
 * Get all call flows for the organization
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const callFlows = await callFlowService.getCallFlows(organizationId);
    res.json({ success: true, data: callFlows });
  } catch (error: any) {
    console.error('[CallFlow] Error fetching call flows:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/call-flows/templates
 * Get available call flow templates
 */
router.get('/templates', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const templates = await callFlowService.getTemplates(organizationId);
    res.json({ success: true, data: templates });
  } catch (error: any) {
    console.error('[CallFlow] Error fetching templates:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/call-flows/:id
 * Get a single call flow
 */
router.get('/:id', validate([
  param('id').isUUID().withMessage('Invalid call flow ID'),
]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const callFlow = await callFlowService.getCallFlow(req.params.id, organizationId);
    if (!callFlow) {
      return res.status(404).json({ success: false, message: 'Call flow not found' });
    }

    res.json({ success: true, data: callFlow });
  } catch (error: any) {
    console.error('[CallFlow] Error fetching call flow:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/call-flows
 * Create a new call flow
 */
router.post('/', authorize('admin', 'manager'), validate([
  body('name').trim().notEmpty().withMessage('Name is required')
    .isLength({ max: 100 }).withMessage('Name too long'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description too long'),
  body('nodes').optional().isArray({ max: 100 }).withMessage('Too many nodes'),
  body('edges').optional().isArray({ max: 200 }).withMessage('Too many edges'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id;
    if (!organizationId || !userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { name, description, nodes, edges, isActive } = req.body;

    const callFlow = await callFlowService.createCallFlow(organizationId, userId, {
      name,
      description,
      nodes,
      edges,
      isActive,
    });
    res.status(201).json({ success: true, data: callFlow });
  } catch (error: any) {
    console.error('[CallFlow] Error creating call flow:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/call-flows/:id
 * Update a call flow
 */
router.put('/:id', authorize('admin', 'manager'), validate([
  param('id').isUUID().withMessage('Invalid call flow ID'),
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty')
    .isLength({ max: 100 }).withMessage('Name too long'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description too long'),
  body('nodes').optional().isArray({ max: 100 }).withMessage('Too many nodes'),
  body('edges').optional().isArray({ max: 200 }).withMessage('Too many edges'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { name, description, nodes, edges, isActive } = req.body;

    const callFlow = await callFlowService.updateCallFlow(req.params.id, organizationId, {
      name,
      description,
      nodes,
      edges,
      isActive,
    });
    res.json({ success: true, data: callFlow });
  } catch (error: any) {
    console.error('[CallFlow] Error updating call flow:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/call-flows/:id
 * Delete a call flow
 */
router.delete('/:id', authorize('admin'), validate([
  param('id').isUUID().withMessage('Invalid call flow ID'),
]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    await callFlowService.deleteCallFlow(req.params.id, organizationId);
    res.json({ success: true, message: 'Call flow deleted' });
  } catch (error: any) {
    console.error('[CallFlow] Error deleting call flow:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/call-flows/:id/duplicate
 * Duplicate a call flow
 */
router.post('/:id/duplicate', authorize('admin', 'manager'), validate([
  param('id').isUUID().withMessage('Invalid call flow ID'),
  body('name').optional().trim().isLength({ max: 100 }).withMessage('Name too long'),
]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id;
    if (!organizationId || !userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { name } = req.body;

    const callFlow = await callFlowService.duplicateCallFlow(
      req.params.id,
      organizationId,
      userId,
      name
    );
    res.status(201).json({ success: true, data: callFlow });
  } catch (error: any) {
    console.error('[CallFlow] Error duplicating call flow:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/call-flows/:id/assign
 * Assign call flow to a voice agent
 */
router.post('/:id/assign', authorize('admin', 'manager'), validate([
  param('id').isUUID().withMessage('Invalid call flow ID'),
  body('agentId').isUUID().withMessage('Valid agent ID is required'),
]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { agentId } = req.body;

    const agent = await callFlowService.assignToAgent(req.params.id, agentId, organizationId);
    res.json({ success: true, data: agent });
  } catch (error: any) {
    console.error('[CallFlow] Error assigning call flow:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/call-flows/from-template
 * Create a call flow from a template
 */
router.post('/from-template', authorize('admin', 'manager'), validate([
  body('templateId').trim().notEmpty().withMessage('Template ID is required')
    .isLength({ max: 100 }).withMessage('Template ID too long'),
  body('name').trim().notEmpty().withMessage('Name is required')
    .isLength({ max: 100 }).withMessage('Name too long'),
]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id;
    if (!organizationId || !userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { templateId, name } = req.body;

    const callFlow = await callFlowService.createFromTemplate(templateId, organizationId, userId, name);
    res.status(201).json({ success: true, data: callFlow });
  } catch (error: any) {
    console.error('[CallFlow] Error creating from template:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/call-flows/:id/analytics
 * Get analytics for a call flow
 */
router.get('/:id/analytics', validate([
  param('id').isUUID().withMessage('Invalid call flow ID'),
  query('startDate').optional().isISO8601().withMessage('Invalid start date'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date'),
]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    let dateRange: { start: Date; end: Date } | undefined;
    if (req.query.startDate && req.query.endDate) {
      dateRange = {
        start: new Date(req.query.startDate as string),
        end: new Date(req.query.endDate as string),
      };
    }

    const analytics = await callFlowService.getAnalytics(req.params.id, organizationId, dateRange);
    res.json({ success: true, data: analytics });
  } catch (error: any) {
    console.error('[CallFlow] Error fetching analytics:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/call-flows/:id/execute
 * Execute/test a call flow with simulated inputs
 */
router.post('/:id/execute', validate([
  param('id').isUUID().withMessage('Invalid call flow ID'),
  body('simulatedInputs').optional().isArray({ max: 100 }).withMessage('Too many simulated inputs'),
  body('initialVariables').optional().isObject().withMessage('Initial variables must be an object'),
]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Verify call flow belongs to org
    const callFlow = await callFlowService.getCallFlow(req.params.id, organizationId);
    if (!callFlow) {
      return res.status(404).json({ success: false, message: 'Call flow not found' });
    }

    const { simulatedInputs = [], initialVariables = {} } = req.body;

    // Execute the flow test
    const result = await callFlowService.executeFlowTest(
      req.params.id,
      simulatedInputs,
      initialVariables
    );

    res.json({
      success: true,
      data: {
        transcript: result.transcript,
        collectedVariables: result.variables,
        outcome: result.outcome,
        visitedNodes: result.visitedNodes,
        nodeCount: result.visitedNodes.length,
      },
    });
  } catch (error: any) {
    console.error('[CallFlow] Error executing call flow:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/call-flows/:id/init-session
 * Initialize a call flow execution session for a real call
 */
router.post('/:id/init-session', validate([
  param('id').isUUID().withMessage('Invalid call flow ID'),
  body('sessionId').isUUID().withMessage('Valid session ID is required'),
  body('initialVariables').optional().isObject().withMessage('Initial variables must be an object'),
]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Verify call flow belongs to org
    const callFlow = await callFlowService.getCallFlow(req.params.id, organizationId);
    if (!callFlow) {
      return res.status(404).json({ success: false, message: 'Call flow not found' });
    }

    const { sessionId, initialVariables = {} } = req.body;

    // Initialize execution context
    const context = await callFlowService.initializeExecution(
      req.params.id,
      sessionId,
      initialVariables
    );

    // Process first node to get initial response
    const result = await callFlowService.processNode(context);

    res.json({
      success: true,
      data: {
        context: {
          callFlowId: context.callFlowId,
          sessionId: context.sessionId,
          currentNodeId: context.currentNodeId,
          visitedNodes: context.visitedNodes,
          variables: context.variables,
        },
        initialResponse: result.response,
        shouldWaitForInput: result.shouldWaitForInput,
        shouldEnd: result.shouldEnd,
        shouldTransfer: result.shouldTransfer,
      },
    });
  } catch (error: any) {
    console.error('[CallFlow] Error initializing session:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/call-flows/:id/process-input
 * Process user input in an active call flow session
 */
router.post('/:id/process-input', validate([
  param('id').isUUID().withMessage('Invalid call flow ID'),
  body('context').isObject().withMessage('Execution context is required'),
  body('context.callFlowId').isUUID().withMessage('Invalid call flow ID in context'),
  body('context.sessionId').isUUID().withMessage('Invalid session ID in context'),
  body('userInput').trim().notEmpty().withMessage('User input is required')
    .isLength({ max: 5000 }).withMessage('User input too long'),
]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { context, userInput } = req.body;

    // Process the user input
    const result = await callFlowService.processNode(context, userInput);

    // Update context based on result
    const updatedContext = {
      ...context,
      currentNodeId: result.nextNodeId || context.currentNodeId,
      visitedNodes: [...context.visitedNodes, ...(result.nextNodeId ? [result.nextNodeId] : [])],
      variables: {
        ...context.variables,
        ...(result.variableCollected ? { [result.variableCollected.name]: result.variableCollected.value } : {}),
      },
    };

    // If there's a next node and we shouldn't wait, continue processing
    let response = result.response;
    let shouldWaitForInput = result.shouldWaitForInput;

    if (result.nextNodeId && !result.shouldWaitForInput && !result.shouldEnd && !result.shouldTransfer) {
      const nextResult = await callFlowService.processNode(updatedContext);
      response = nextResult.response || response;
      shouldWaitForInput = nextResult.shouldWaitForInput;

      if (nextResult.nextNodeId) {
        updatedContext.currentNodeId = nextResult.nextNodeId;
        updatedContext.visitedNodes.push(nextResult.nextNodeId);
      }
    }

    res.json({
      success: true,
      data: {
        context: updatedContext,
        response,
        shouldWaitForInput,
        shouldEnd: result.shouldEnd,
        shouldTransfer: result.shouldTransfer,
        transferConfig: result.transferConfig,
        outcome: result.outcome,
        variableCollected: result.variableCollected,
        action: result.action,
      },
    });
  } catch (error: any) {
    console.error('[CallFlow] Error processing input:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
