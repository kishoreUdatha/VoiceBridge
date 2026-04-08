/**
 * Live Chat Widget Routes
 * API endpoints for chat widget and inbox
 */

import { Router, Request, Response } from 'express';
import { authenticate as authenticateToken, authorize as requireRole } from '../middlewares/auth';
import { liveChatService } from '../services/live-chat.service';

const router = Router();

// =====================================
// WIDGET CONFIGURATION
// =====================================

/**
 * Get widget configuration
 */
router.get('/widget/config', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organization not found' });
    }

    const widget = await liveChatService.getOrCreateWidget(organizationId);
    res.json({ success: true, data: widget });
  } catch (error: any) {
    console.error('Error getting widget config:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update widget configuration
 */
router.put('/widget/config', authenticateToken, requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organization not found' });
    }

    const widget = await liveChatService.updateWidget(organizationId, req.body);
    res.json({ success: true, data: widget });
  } catch (error: any) {
    console.error('Error updating widget config:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get embed code
 */
router.get('/widget/embed-code', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organization not found' });
    }

    const widget = await liveChatService.getOrCreateWidget(organizationId);
    const embedCode = liveChatService.generateEmbedCode(organizationId, widget.id);

    res.json({ success: true, data: { embedCode, widgetId: widget.id } });
  } catch (error: any) {
    console.error('Error generating embed code:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================
// PUBLIC WIDGET API (for embedded widget)
// =====================================

/**
 * Get public widget config (for embedding)
 */
router.get('/public/:widgetId', async (req: Request, res: Response) => {
  try {
    const { widgetId } = req.params;

    // Get widget by ID (would need to store widgetId separately)
    // For now, return basic config
    res.json({
      success: true,
      data: {
        primaryColor: '#4F46E5',
        greeting: 'Hi! How can we help you today?',
        position: 'bottom-right',
        collectName: true,
        collectEmail: true,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Start chat session (public)
 */
router.post('/public/:widgetId/session', async (req: Request, res: Response) => {
  try {
    const { widgetId } = req.params;
    const { visitorId, visitorName, visitorEmail, visitorPhone, pageUrl } = req.body;

    // Get organization from widget (simplified)
    // In real implementation, look up widget -> organization
    const organizationId = widgetId; // Placeholder

    const session = await liveChatService.startSession({
      organizationId,
      visitorId: visitorId || `visitor_${Date.now()}`,
      visitorName,
      visitorEmail,
      visitorPhone,
      source: 'widget',
      pageUrl,
    });

    res.json({ success: true, data: session });
  } catch (error: any) {
    console.error('Error starting session:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Send message (public)
 */
router.post('/public/sessions/:sessionId/messages', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { content } = req.body;

    const messages = await liveChatService.processVisitorMessage(sessionId, content);

    res.json({ success: true, data: messages });
  } catch (error: any) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get messages (public)
 */
router.get('/public/sessions/:sessionId/messages', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const messages = await liveChatService.getMessages(sessionId);

    res.json({ success: true, data: messages });
  } catch (error: any) {
    console.error('Error getting messages:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================
// ADMIN/AGENT INBOX
// =====================================

/**
 * Get all chat sessions
 */
router.get('/sessions', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organization not found' });
    }

    const { status, limit, offset } = req.query;

    const result = await liveChatService.getSessions(organizationId, {
      status: status as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error getting sessions:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get session messages
 */
router.get('/sessions/:sessionId/messages', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const messages = await liveChatService.getMessages(sessionId);

    res.json({ success: true, data: messages });
  } catch (error: any) {
    console.error('Error getting session messages:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Send agent message
 */
router.post('/sessions/:sessionId/messages', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { content } = req.body;

    const message = await liveChatService.addMessage({
      sessionId,
      sender: 'agent',
      content,
      metadata: { agentId: req.user?.id, agentName: req.user?.firstName },
    });

    res.json({ success: true, data: message });
  } catch (error: any) {
    console.error('Error sending agent message:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Assign agent to session
 */
router.post('/sessions/:sessionId/assign', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const agentId = req.body.agentId || req.user?.id;

    const session = await liveChatService.assignAgent(sessionId, agentId);

    res.json({ success: true, data: session });
  } catch (error: any) {
    console.error('Error assigning agent:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Close chat session
 */
router.post('/sessions/:sessionId/close', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const session = await liveChatService.closeSession(sessionId);

    res.json({ success: true, data: session });
  } catch (error: any) {
    console.error('Error closing session:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Convert chat to lead
 */
router.post('/sessions/:sessionId/convert', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const leadId = await liveChatService.convertToLead(sessionId);

    res.json({ success: true, data: { leadId } });
  } catch (error: any) {
    console.error('Error converting to lead:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get chat statistics
 */
router.get('/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organization not found' });
    }

    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    const stats = await liveChatService.getStats(organizationId, days);

    res.json({ success: true, data: stats });
  } catch (error: any) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
