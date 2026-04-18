/**
 * Zapier Integration Routes
 * API endpoints for Zapier triggers and actions
 */

import { Router, Request, Response } from 'express';
import { authenticate as authenticateToken, authorize as authorize } from '../middlewares/auth';
import { zapierService } from '../integrations/zapier.service';

const router = Router();

// =====================================
// ZAPIER AUTHENTICATION
// =====================================

/**
 * Authenticate Zapier connection
 * Used by Zapier to verify API key
 */
router.get('/auth/test', authenticateToken, async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      message: 'Authentication successful',
      organization: {
        id: req.user?.organizationId,
        name: 'MyLeadX Organization',
      },
    });
  } catch (error) {
    console.error('Zapier auth test error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
});

// =====================================
// TRIGGERS - Subscribe/Unsubscribe
// =====================================

/**
 * List available triggers
 */
router.get('/triggers', authenticateToken, async (req: Request, res: Response) => {
  try {
    const triggers = zapierService.getAvailableTriggers();
    res.json(triggers);
  } catch (error) {
    console.error('Error fetching triggers:', error);
    res.status(500).json({ error: 'Failed to fetch triggers' });
  }
});

/**
 * Subscribe to a trigger (Zapier calls this when setting up a zap)
 */
router.post('/triggers/:event/subscribe', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { event } = req.params;
    const { hookUrl } = req.body;
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Organization not found' });
    }

    if (!hookUrl) {
      return res.status(400).json({ error: 'hookUrl is required' });
    }

    const subscription = await zapierService.registerTrigger(
      organizationId,
      event,
      hookUrl
    );

    res.json({
      id: subscription.id,
      event: subscription.event,
      isActive: subscription.isActive,
    });
  } catch (error) {
    console.error('Error subscribing to trigger:', error);
    res.status(500).json({ error: 'Failed to subscribe to trigger' });
  }
});

/**
 * Unsubscribe from a trigger (Zapier calls this when deleting a zap)
 */
router.delete('/triggers/:subscriptionId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { subscriptionId } = req.params;

    await zapierService.unregisterTrigger(subscriptionId);

    res.json({ success: true });
  } catch (error) {
    console.error('Error unsubscribing from trigger:', error);
    res.status(500).json({ error: 'Failed to unsubscribe from trigger' });
  }
});

/**
 * Get sample data for a trigger (for Zapier field mapping)
 */
router.get('/triggers/:event/sample', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { event } = req.params;
    const sampleData = zapierService.getSampleData(event);

    // Return as array (Zapier expects array of objects)
    res.json([sampleData]);
  } catch (error) {
    console.error('Error fetching sample data:', error);
    res.status(500).json({ error: 'Failed to fetch sample data' });
  }
});

/**
 * List active subscriptions
 */
router.get('/subscriptions', authenticateToken, authorize(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Organization not found' });
    }

    const subscriptions = await zapierService.getSubscriptions(organizationId);
    res.json(subscriptions);
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

// =====================================
// ACTIONS - Create/Update/etc.
// =====================================

/**
 * List available actions
 */
router.get('/actions', authenticateToken, async (req: Request, res: Response) => {
  try {
    const actions = zapierService.getAvailableActions();
    res.json(actions);
  } catch (error) {
    console.error('Error fetching actions:', error);
    res.status(500).json({ error: 'Failed to fetch actions' });
  }
});

/**
 * Create Lead action
 */
router.post('/actions/create-lead', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Organization not found' });
    }

    const { firstName, lastName, email, phone, source, notes, customFields } = req.body;

    if (!firstName || !phone) {
      return res.status(400).json({ error: 'firstName and phone are required' });
    }

    const lead = await zapierService.createLead(organizationId, {
      firstName,
      lastName,
      email,
      phone,
      source,
      notes,
      customFields,
    });

    res.json({
      id: lead.id,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      source: lead.source,
      createdAt: lead.createdAt,
    });
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

/**
 * Update Lead action
 */
router.post('/actions/update-lead', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Organization not found' });
    }

    const { leadId, firstName, lastName, email, phone, stage, notes, customFields } = req.body;

    if (!leadId) {
      return res.status(400).json({ error: 'leadId is required' });
    }

    const lead = await zapierService.updateLead(organizationId, leadId, {
      firstName,
      lastName,
      email,
      phone,
      stage,
      notes,
      customFields,
    });

    res.json({
      id: lead.id,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      stage: lead.stage,
      updatedAt: lead.updatedAt,
    });
  } catch (error: any) {
    console.error('Error updating lead:', error);
    if (error.message === 'Lead not found') {
      return res.status(404).json({ error: 'Lead not found' });
    }
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

/**
 * Add Note action
 */
router.post('/actions/add-note', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Organization not found' });
    }

    const { leadId, content } = req.body;

    if (!leadId || !content) {
      return res.status(400).json({ error: 'leadId and content are required' });
    }

    const activity = await zapierService.addNote(organizationId, leadId, content);

    res.json({
      id: activity.id,
      leadId: activity.leadId,
      type: activity.type,
      content: activity.content,
      createdAt: activity.createdAt,
    });
  } catch (error: any) {
    console.error('Error adding note:', error);
    if (error.message === 'Lead not found') {
      return res.status(404).json({ error: 'Lead not found' });
    }
    res.status(500).json({ error: 'Failed to add note' });
  }
});

/**
 * Schedule Call action
 */
router.post('/actions/schedule-call', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Organization not found' });
    }

    const { leadId, scheduledAt, assignedToId, notes } = req.body;

    if (!leadId || !scheduledAt) {
      return res.status(400).json({ error: 'leadId and scheduledAt are required' });
    }

    const scheduledCall = await zapierService.scheduleCall(organizationId, {
      leadId,
      scheduledAt: new Date(scheduledAt),
      assignedToId,
      notes,
    });

    res.json({
      id: scheduledCall.id,
      leadId: scheduledCall.leadId,
      scheduledAt: scheduledCall.scheduledAt,
      status: scheduledCall.status,
      createdAt: scheduledCall.createdAt,
    });
  } catch (error: any) {
    console.error('Error scheduling call:', error);
    if (error.message === 'Lead not found') {
      return res.status(404).json({ error: 'Lead not found' });
    }
    res.status(500).json({ error: 'Failed to schedule call' });
  }
});

// =====================================
// WEBHOOK TOKEN MANAGEMENT
// =====================================

/**
 * Generate a new webhook token for the organization
 */
router.post('/webhook-token/generate', authenticateToken, authorize(['admin']), async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Organization not found' });
    }

    const token = zapierService.generateWebhookToken(organizationId);

    res.json({ webhookToken: token });
  } catch (error) {
    console.error('Error generating webhook token:', error);
    res.status(500).json({ error: 'Failed to generate webhook token' });
  }
});

export default router;
