/**
 * Customer Journey Routes
 */

import { Router, Response, NextFunction } from 'express';
import { customerJourneyService } from '../services/customer-journey.service';
import { authenticate } from '../middlewares/auth';
import { TenantRequest, tenantMiddleware } from '../middlewares/tenant';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticate as any);
router.use(tenantMiddleware as any);

// ==================== Templates ====================

// Get templates
router.get('/templates', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const templates = await customerJourneyService.getTemplates(organizationId);
    res.json(templates);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single template
router.get('/templates/:id', async (req: TenantRequest, res: Response) => {
  try {
    const template = await customerJourneyService.getTemplate(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json(template);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create template
router.post('/templates', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const template = await customerJourneyService.createTemplate(organizationId, req.body);
    res.status(201).json(template);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update template
router.put('/templates/:id', async (req: TenantRequest, res: Response) => {
  try {
    const template = await customerJourneyService.updateTemplate(req.params.id, req.body);
    res.json(template);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== Journeys ====================

// Get journeys
router.get('/', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const { status, templateId, leadId, accountId, limit } = req.query;

    const journeys = await customerJourneyService.getJourneys(organizationId, {
      status,
      templateId,
      leadId,
      accountId,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json(journeys);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== Analytics (must be before /:id) ====================

// Get journey analytics
router.get('/analytics', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const { templateId } = req.query;
    const analytics = await customerJourneyService.getJourneyAnalytics(
      organizationId,
      templateId as string
    );
    res.json(analytics);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== Touchpoints (must be before /:id) ====================

// Get pending touchpoints
router.get('/touchpoints/pending', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const touchpoints = await customerJourneyService.getPendingTouchpoints(organizationId);
    res.json(touchpoints);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single journey (must be AFTER specific routes like /analytics, /touchpoints/pending)
router.get('/:id', async (req: TenantRequest, res: Response) => {
  try {
    const journey = await customerJourneyService.getJourney(req.params.id);
    if (!journey) {
      return res.status(404).json({ error: 'Journey not found' });
    }
    res.json(journey);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Start journey
router.post('/start', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const { templateId, leadId, accountId, contactId } = req.body;
    const journey = await customerJourneyService.startJourney(organizationId, templateId, {
      leadId,
      accountId,
      contactId,
    });
    res.status(201).json(journey);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Advance stage
router.post('/:id/advance', async (req: TenantRequest, res: Response) => {
  try {
    const journey = await customerJourneyService.advanceStage(req.params.id);
    res.json(journey);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Pause journey
router.post('/:id/pause', async (req: TenantRequest, res: Response) => {
  try {
    const journey = await customerJourneyService.pauseJourney(req.params.id);
    res.json(journey);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Resume journey
router.post('/:id/resume', async (req: TenantRequest, res: Response) => {
  try {
    const journey = await customerJourneyService.resumeJourney(req.params.id);
    res.json(journey);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Exit journey
router.post('/:id/exit', async (req: TenantRequest, res: Response) => {
  try {
    const { reason } = req.body;
    const journey = await customerJourneyService.exitJourney(req.params.id, reason);
    res.json(journey);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== Touchpoint Actions ====================

// Complete touchpoint
router.post('/touchpoints/:id/complete', async (req: TenantRequest, res: Response) => {
  try {
    const { outcome, response, sentiment } = req.body;
    const touchpoint = await customerJourneyService.completeTouchpoint(
      req.params.id,
      outcome,
      response,
      sentiment
    );
    res.json(touchpoint);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Skip touchpoint
router.post('/touchpoints/:id/skip', async (req: TenantRequest, res: Response) => {
  try {
    const { reason } = req.body;
    const touchpoint = await customerJourneyService.skipTouchpoint(req.params.id, reason);
    res.json(touchpoint);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Trigger journey for event
router.post('/trigger', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const { eventType, entityId, entityType } = req.body;
    const journeys = await customerJourneyService.triggerJourneyForEvent(
      organizationId,
      eventType,
      entityId,
      entityType
    );
    res.json(journeys);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
