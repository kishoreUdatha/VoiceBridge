/**
 * Real-time Alerts Routes
 * Handles alert rules, notifications, and user preferences
 */

import { Router, Request, Response } from 'express';
import { realtimeAlertsService } from '../services/realtime-alerts.service';
import { authenticate, authorize as authorizeRoles } from '../middlewares/auth';

const router = Router();

// Get all alert rules
router.get('/rules', authenticate as any, async (req: Request, res: Response) => {
  try {
    const rules = await realtimeAlertsService.getAlertRules(req.user!.organizationId);
    res.json(rules);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single alert rule
router.get('/rules/:id', authenticate as any, async (req: Request, res: Response) => {
  try {
    const rule = await realtimeAlertsService.getAlertRule(req.params.id);
    if (!rule) {
      return res.status(404).json({ error: 'Alert rule not found' });
    }
    res.json(rule);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create alert rule
router.post('/rules', authenticate as any, authorizeRoles('ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  try {
    const rule = await realtimeAlertsService.createAlertRule(
      req.user!.organizationId,
      req.user!.id,
      req.body
    );
    res.status(201).json(rule);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update alert rule
router.put('/rules/:id', authenticate as any, authorizeRoles('ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  try {
    const rule = await realtimeAlertsService.updateAlertRule(req.params.id, req.body);
    res.json(rule);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete alert rule
router.delete('/rules/:id', authenticate as any, authorizeRoles('ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  try {
    await realtimeAlertsService.deleteAlertRule(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get user alerts
router.get('/user', authenticate as any, async (req: Request, res: Response) => {
  try {
    const unreadOnly = req.query.unreadOnly === 'true';
    const limit = parseInt(req.query.limit as string) || 50;
    const alerts = await realtimeAlertsService.getUserAlerts(req.user!.id, unreadOnly, limit);
    res.json(alerts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get unread alert count
router.get('/user/unread-count', authenticate as any, async (req: Request, res: Response) => {
  try {
    const count = await realtimeAlertsService.getUnreadCount(req.user!.id);
    res.json({ count });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Mark alert as read
router.post('/alerts/:alertId/read', authenticate as any, async (req: Request, res: Response) => {
  try {
    await realtimeAlertsService.markAlertRead(req.params.alertId, req.user!.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Mark all alerts as read
router.post('/user/mark-all-read', authenticate as any, async (req: Request, res: Response) => {
  try {
    await realtimeAlertsService.markAllAlertsRead(req.user!.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get notification preferences
router.get('/preferences', authenticate as any, async (req: Request, res: Response) => {
  try {
    const preferences = await realtimeAlertsService.getNotificationPreferences(req.user!.id);
    res.json(preferences);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update notification preferences
router.put('/preferences', authenticate as any, async (req: Request, res: Response) => {
  try {
    const preferences = await realtimeAlertsService.updateNotificationPreferences(
      req.user!.id,
      req.body
    );
    res.json(preferences);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get trigger event options
router.get('/meta/trigger-events', authenticate as any, async (req: Request, res: Response) => {
  try {
    const events = realtimeAlertsService.getTriggerEvents();
    res.json(events);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// WebSocket registration endpoint (for SSE fallback)
router.get('/stream', authenticate as any, async (req: Request, res: Response) => {
  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: 'connected', userId: req.user!.id })}\n\n`);

  // Keep connection alive
  const keepAlive = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 30000);

  // Clean up on close
  req.on('close', () => {
    clearInterval(keepAlive);
  });
});

export default router;
