import { Router, Request, Response } from 'express';
import { prisma } from '../config/database';
import { authenticate } from '../middlewares/auth';
import { realtimeVoiceService } from '../services/realtime-voice.service';
import { webrtcSignalingService } from '../services/webrtc-signaling.service';
import { openaiRealtimeService } from '../integrations/openai-realtime.service';

const router = Router();

// Get realtime configuration for an agent
router.get('/config/:agentId', authenticate, async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;

    const agent = await prisma.voiceAgent.findUnique({
      where: { id: agentId },
      select: {
        id: true,
        name: true,
        realtimeEnabled: true,
        webrtcEnabled: true,
        voiceId: true,
        language: true,
        greeting: true,
        widgetTitle: true,
        widgetSubtitle: true,
        widgetColor: true,
        widgetPosition: true,
      },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    res.json({
      agent,
      realtime: {
        enabled: agent.realtimeEnabled,
        model: process.env.OPENAI_REALTIME_MODEL || 'gpt-4o-realtime-preview',
      },
      webrtc: {
        enabled: agent.webrtcEnabled,
        iceServers: webrtcSignalingService.getIceServers(),
        serverSideEnabled: webrtcSignalingService.isServerSideWebRTCEnabled(),
      },
    });
  } catch (error) {
    console.error('[RealtimeRoutes] Config error:', error);
    res.status(500).json({ error: 'Failed to get configuration' });
  }
});

// Get realtime session by ID
router.get('/sessions/:sessionId', authenticate, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const session = await prisma.voiceSession.findUnique({
      where: { id: sessionId },
      include: {
        agent: {
          select: { id: true, name: true, industry: true },
        },
        transcripts: {
          orderBy: { timestamp: 'asc' },
        },
        realtimeEvents: {
          orderBy: { timestamp: 'asc' },
          take: 100,
        },
        lead: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(session);
  } catch (error) {
    console.error('[RealtimeRoutes] Session fetch error:', error);
    res.status(500).json({ error: 'Failed to get session' });
  }
});

// Get realtime sessions for an agent
router.get('/agents/:agentId/sessions', authenticate, async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const { mode, status, limit = '50' } = req.query;

    const where: any = { agentId };
    if (mode) where.mode = mode;
    if (status) where.status = status;

    const sessions = await prisma.voiceSession.findMany({
      where,
      include: {
        lead: {
          select: { id: true, firstName: true, lastName: true },
        },
        _count: {
          select: { transcripts: true, realtimeEvents: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
    });

    res.json(sessions);
  } catch (error) {
    console.error('[RealtimeRoutes] Sessions fetch error:', error);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

// Get realtime analytics for an agent
router.get('/agents/:agentId/analytics', authenticate, async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const { days = '30' } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days as string));

    // Get session stats
    const sessions = await prisma.voiceSession.findMany({
      where: {
        agentId,
        createdAt: { gte: startDate },
      },
      select: {
        mode: true,
        status: true,
        duration: true,
        sentiment: true,
        interruptionCount: true,
        leadId: true,
      },
    });

    const totalSessions = sessions.length;
    const realtimeSessions = sessions.filter((s) => s.mode !== 'BATCH').length;
    const completedSessions = sessions.filter((s) => s.status === 'COMPLETED').length;
    const conversions = sessions.filter((s) => s.leadId).length;
    const totalDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const avgDuration = totalSessions > 0 ? totalDuration / totalSessions : 0;
    const totalInterruptions = sessions.reduce((sum, s) => sum + s.interruptionCount, 0);

    const sentimentCounts = {
      positive: sessions.filter((s) => s.sentiment === 'positive').length,
      neutral: sessions.filter((s) => s.sentiment === 'neutral').length,
      negative: sessions.filter((s) => s.sentiment === 'negative').length,
    };

    // Get realtime event stats
    const eventStats = await prisma.realtimeEvent.groupBy({
      by: ['eventType'],
      where: {
        session: { agentId },
        timestamp: { gte: startDate },
      },
      _count: true,
      _avg: { latencyMs: true },
    });

    res.json({
      period: { days: parseInt(days as string), startDate },
      sessions: {
        total: totalSessions,
        realtime: realtimeSessions,
        batch: totalSessions - realtimeSessions,
        completed: completedSessions,
        completionRate: totalSessions > 0 ? (completedSessions / totalSessions * 100).toFixed(1) : 0,
      },
      conversions: {
        total: conversions,
        rate: totalSessions > 0 ? (conversions / totalSessions * 100).toFixed(1) : 0,
      },
      duration: {
        total: totalDuration,
        average: Math.round(avgDuration),
      },
      interruptions: {
        total: totalInterruptions,
        avgPerSession: totalSessions > 0 ? (totalInterruptions / totalSessions).toFixed(2) : 0,
      },
      sentiment: sentimentCounts,
      events: eventStats,
    });
  } catch (error) {
    console.error('[RealtimeRoutes] Analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// Update agent realtime settings
router.patch('/agents/:agentId/settings', authenticate, async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const { realtimeEnabled, webrtcEnabled, voiceId } = req.body;

    const updateData: any = {};
    if (typeof realtimeEnabled === 'boolean') updateData.realtimeEnabled = realtimeEnabled;
    if (typeof webrtcEnabled === 'boolean') updateData.webrtcEnabled = webrtcEnabled;
    if (voiceId) updateData.voiceId = voiceId;

    const agent = await prisma.voiceAgent.update({
      where: { id: agentId },
      data: updateData,
      select: {
        id: true,
        name: true,
        realtimeEnabled: true,
        webrtcEnabled: true,
        voiceId: true,
      },
    });

    res.json(agent);
  } catch (error) {
    console.error('[RealtimeRoutes] Settings update error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Get active realtime sessions (for monitoring)
router.get('/active', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const organizationId = user?.organizationId;

    const activeSessions = realtimeVoiceService.getActiveSessionsForOrg(organizationId);

    res.json({
      count: activeSessions.length,
      sessions: activeSessions.map((s) => ({
        id: s.id,
        agentId: s.agentId,
        mode: s.mode,
        status: s.status,
        startedAt: s.startedAt,
        transcriptCount: s.transcripts.length,
      })),
      openaiConnections: openaiRealtimeService.getActiveConnectionCount(),
      webrtcPeers: webrtcSignalingService.getActivePeerCount(),
    });
  } catch (error) {
    console.error('[RealtimeRoutes] Active sessions error:', error);
    res.status(500).json({ error: 'Failed to get active sessions' });
  }
});

// Get system status
router.get('/status', authenticate, async (req: Request, res: Response) => {
  try {
    const openaiConfigured = !!process.env.OPENAI_API_KEY;
    const realtimeEnabled = process.env.ENABLE_REALTIME_VOICE !== 'false';
    const webrtcEnabled = process.env.ENABLE_WEBRTC !== 'false';

    res.json({
      openai: {
        configured: openaiConfigured,
        model: process.env.OPENAI_REALTIME_MODEL || 'gpt-4o-realtime-preview',
      },
      features: {
        realtime: realtimeEnabled && openaiConfigured,
        webrtc: webrtcEnabled,
        serverSideWebRTC: webrtcSignalingService.isServerSideWebRTCEnabled(),
      },
      stats: {
        activeRealtimeSessions: realtimeVoiceService.getActiveSessionCount(),
        activeOpenAIConnections: openaiRealtimeService.getActiveConnectionCount(),
        activeWebRTCPeers: webrtcSignalingService.getActivePeerCount(),
      },
    });
  } catch (error) {
    console.error('[RealtimeRoutes] Status error:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

export default router;
