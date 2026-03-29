/**
 * Agent Analytics Routes
 * API endpoints for fetching analytics and conversation history
 */

import { Router } from 'express';
import { authenticate, AuthenticatedRequest } from '../middlewares/auth';
import { tenantMiddleware } from '../middlewares/tenant';
import { agentAnalyticsService } from '../services/agent-analytics.service';
import { prisma } from '../config/database';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticate);
router.use(tenantMiddleware);

/**
 * GET /voice-ai/agents/:agentId/analytics
 * Get comprehensive analytics for an agent
 */
router.get('/agents/:agentId/analytics', async (req: AuthenticatedRequest, res) => {
  try {
    const { agentId } = req.params;
    const organizationId = req.user!.organizationId;

    // Verify agent belongs to organization
    const agent = await prisma.voiceAgent.findFirst({
      where: { id: agentId, organizationId },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const analytics = await agentAnalyticsService.getAgentAnalytics(agentId, organizationId);
    res.json(analytics);
  } catch (error) {
    console.error('[AgentAnalytics] Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

/**
 * GET /voice-ai/agents/:agentId/conversations
 * Get paginated conversation history
 */
router.get('/agents/:agentId/conversations', async (req: AuthenticatedRequest, res) => {
  try {
    const { agentId } = req.params;
    const organizationId = req.user!.organizationId;

    // Parse query params
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 20, 100);

    const filters: any = {};
    if (req.query.startDate) filters.startDate = new Date(req.query.startDate as string);
    if (req.query.endDate) filters.endDate = new Date(req.query.endDate as string);
    if (req.query.sentiment) filters.sentiment = req.query.sentiment;
    if (req.query.outcome) filters.outcome = req.query.outcome;
    if (req.query.search) filters.search = req.query.search;

    // Verify agent belongs to organization
    const agent = await prisma.voiceAgent.findFirst({
      where: { id: agentId, organizationId },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const result = await agentAnalyticsService.getConversationHistory(
      agentId,
      organizationId,
      page,
      pageSize,
      filters
    );

    res.json(result);
  } catch (error) {
    console.error('[AgentAnalytics] Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

/**
 * GET /voice-ai/agents/:agentId/conversations/:conversationId
 * Get single conversation detail
 */
router.get('/agents/:agentId/conversations/:conversationId', async (req: AuthenticatedRequest, res) => {
  try {
    const { agentId, conversationId } = req.params;
    const type = (req.query.type as 'voice_session' | 'outbound_call') || 'voice_session';
    const organizationId = req.user!.organizationId;

    // Verify agent belongs to organization
    const agent = await prisma.voiceAgent.findFirst({
      where: { id: agentId, organizationId },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const conversation = await agentAnalyticsService.getConversationDetail(
      conversationId,
      type,
      organizationId
    );

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json(conversation);
  } catch (error) {
    console.error('[AgentAnalytics] Error fetching conversation detail:', error);
    res.status(500).json({ error: 'Failed to fetch conversation detail' });
  }
});

/**
 * GET /voice-ai/agents/:agentId/conversations/export
 * Export conversations to CSV
 */
router.get('/agents/:agentId/conversations/export', async (req: AuthenticatedRequest, res) => {
  try {
    const { agentId } = req.params;
    const organizationId = req.user!.organizationId;

    const filters: any = {};
    if (req.query.startDate) filters.startDate = new Date(req.query.startDate as string);
    if (req.query.endDate) filters.endDate = new Date(req.query.endDate as string);
    if (req.query.sentiment) filters.sentiment = req.query.sentiment;
    if (req.query.outcome) filters.outcome = req.query.outcome;

    // Verify agent belongs to organization
    const agent = await prisma.voiceAgent.findFirst({
      where: { id: agentId, organizationId },
      select: { id: true, name: true },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const csv = await agentAnalyticsService.exportConversationsCSV(
      agentId,
      organizationId,
      filters
    );

    // Set headers for CSV download
    const filename = `${agent.name.replace(/[^a-z0-9]/gi, '_')}_conversations_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    console.error('[AgentAnalytics] Error exporting conversations:', error);
    res.status(500).json({ error: 'Failed to export conversations' });
  }
});

export default router;
