import { Router, Request, Response } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { handleExotelWebSocket, getActiveSessionsCount } from '../services/exotel-voicebot.service';
import { prisma } from '../config/database';
import { config } from '../config';

const router = Router();

/**
 * Voice Bot WebSocket Routes
 * Handles Exotel Voice Bot streaming connections
 */

let wss: WebSocketServer | null = null;

/**
 * Validate WebSocket connection for Voice Bot
 * Ensures the agent exists and the connection is authorized
 */
async function validateWebSocketConnection(
  agentId: string,
  callId: string,
  headers: Record<string, string | string[] | undefined>
): Promise<{ valid: boolean; error?: string; agent?: { id: string; organizationId: string } }> {
  // Validate agentId is provided
  if (!agentId) {
    return { valid: false, error: 'Agent ID is required' };
  }

  // Validate callId is provided
  if (!callId) {
    return { valid: false, error: 'Call ID is required' };
  }

  try {
    // Verify agent exists and is active
    const agent = await prisma.voiceAgent.findUnique({
      where: { id: agentId },
      select: { id: true, isActive: true, organizationId: true },
    });

    if (!agent) {
      console.warn(`[VoiceBot] SECURITY: Connection attempt with invalid agent ID: ${agentId}`);
      return { valid: false, error: 'Invalid agent ID' };
    }

    if (!agent.isActive) {
      console.warn(`[VoiceBot] SECURITY: Connection attempt with inactive agent: ${agentId}`);
      return { valid: false, error: 'Agent is not active' };
    }

    // Log successful validation (for audit trail)
    console.info(`[VoiceBot] Connection validated - Agent: ${agentId}, Call: ${callId}, Org: ${agent.organizationId}`);

    return { valid: true, agent: { id: agent.id, organizationId: agent.organizationId } };
  } catch (error) {
    console.error('[VoiceBot] Error validating connection:', error);
    return { valid: false, error: 'Validation error' };
  }
}

/**
 * Initialize WebSocket server for Voice Bot
 * Includes authentication and security validations
 */
export function initializeVoiceBotWebSocket(server: Server): void {
  wss = new WebSocketServer({
    server,
    path: '/voice-stream',
    // Verify client during upgrade
    verifyClient: async (info, callback) => {
      const url = new URL(info.req.url || '', `http://${info.req.headers.host}`);
      const agentId = url.searchParams.get('agentId') || '';
      const callId = url.searchParams.get('callId') || '';

      // Allow health checks without full validation
      if (url.pathname === '/voice-stream/health') {
        callback(true);
        return;
      }

      // Validate the connection
      const validation = await validateWebSocketConnection(
        agentId,
        callId,
        info.req.headers as Record<string, string | string[] | undefined>
      );

      if (!validation.valid) {
        console.warn(`[VoiceBot] SECURITY: Rejected WebSocket connection - ${validation.error}`);
        callback(false, 401, validation.error || 'Unauthorized');
        return;
      }

      callback(true);
    },
  });

  console.log('[VoiceBot] WebSocket server initialized on /voice-stream (with authentication)');

  wss.on('connection', async (ws: WebSocket, req) => {
    // Parse query parameters from URL
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const callId = url.searchParams.get('callId') || `call_${Date.now()}`;
    const agentId = url.searchParams.get('agentId') || '';

    // Log connection (without sensitive headers)
    console.log(`[VoiceBot] WebSocket connected - Call: ${callId}, Agent: ${agentId}`);

    // Set connection timeout (prevent hanging connections)
    const connectionTimeout = setTimeout(() => {
      console.warn(`[VoiceBot] Connection timeout - Call: ${callId}`);
      ws.close(1000, 'Connection timeout');
    }, 30 * 60 * 1000); // 30 minutes max

    ws.on('close', () => {
      clearTimeout(connectionTimeout);
      console.log(`[VoiceBot] WebSocket closed - Call: ${callId}`);
    });

    // Handle the connection
    await handleExotelWebSocket(ws, callId, agentId);
  });

  wss.on('error', (error) => {
    console.error('[VoiceBot] WebSocket server error:', error);
  });
}

/**
 * Health check endpoint for Voice Bot
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'voice-bot',
    websocket: wss ? 'running' : 'not initialized',
    activeSessions: getActiveSessionsCount(),
    timestamp: new Date().toISOString(),
  });
});

/**
 * Get Voice Bot WebSocket URL
 */
router.get('/websocket-url', (req: Request, res: Response) => {
  const baseUrl = config.baseUrl;
  const wsUrl = baseUrl.replace('https://', 'wss://').replace('http://', 'ws://');

  res.json({
    success: true,
    websocketUrl: `${wsUrl}/voice-stream`,
    exampleWithParams: `${wsUrl}/voice-stream?callId=YOUR_CALL_ID&agentId=YOUR_AGENT_ID`,
    instructions: [
      '1. Configure this URL in Exotel Voice Bot applet',
      '2. Exotel will connect when a call starts',
      '3. Audio will stream bidirectionally',
    ],
  });
});

/**
 * Test page for Voice Bot
 */
router.get('/test', async (req: Request, res: Response) => {
  const baseUrl = config.baseUrl;
  const wsUrl = baseUrl.replace('https://', 'wss://').replace('http://', 'ws://');

  // Get available agents
  const agents = await prisma.voiceAgent.findMany({
    where: { isActive: true },
    select: { id: true, name: true, industry: true, greeting: true },
  });

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Voice Bot Test</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 900px; margin: 50px auto; padding: 20px; background: #f5f5f5; }
        .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; margin-bottom: 10px; }
        .subtitle { color: #666; margin-bottom: 30px; }
        .info-box { background: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .url-box { background: #f0f0f0; padding: 15px; border-radius: 6px; font-family: monospace; word-break: break-all; margin: 10px 0; }
        .copy-btn { background: #4CAF50; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-left: 10px; }
        .copy-btn:hover { background: #45a049; }
        .agent-card { border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 8px; }
        .agent-card h4 { margin: 0 0 10px 0; color: #333; }
        .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 12px; background: #d4edda; color: #155724; }
        .status { padding: 10px; border-radius: 6px; margin: 10px 0; }
        .status.success { background: #d4edda; color: #155724; }
        .status.warning { background: #fff3cd; color: #856404; }
        pre { background: #f5f5f5; padding: 15px; overflow: auto; border-radius: 6px; font-size: 13px; }
        .steps { background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .steps ol { margin: 0; padding-left: 20px; }
        .steps li { margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🤖 Exotel Voice Bot Integration</h1>
        <p class="subtitle">Real-time AI voice conversations via WebSocket</p>

        <div class="info-box">
          <h3>📡 WebSocket URL for Exotel</h3>
          <div class="url-box" id="wsUrl">${wsUrl}/voice-stream</div>
          <button class="copy-btn" onclick="copyUrl()">Copy URL</button>

          <h4 style="margin-top: 20px;">With Agent Parameter:</h4>
          <div class="url-box" id="wsUrlWithAgent">${wsUrl}/voice-stream?agentId=${agents[0]?.id || 'AGENT_ID'}</div>
        </div>

        <div class="steps">
          <h3>📋 Setup Steps in Exotel Dashboard</h3>
          <ol>
            <li><strong>Go to App Bazaar</strong> → Create new flow</li>
            <li><strong>Add Greeting applet</strong> (optional - or let our AI greet)</li>
            <li><strong>Add Voice Bot applet</strong> → Paste the WebSocket URL above</li>
            <li><strong>Save the flow</strong></li>
            <li><strong>Go to ExoPhones</strong> → Assign flow to your number</li>
            <li><strong>Make a test call</strong> to your ExoPhone number</li>
          </ol>
        </div>

        <div class="status ${agents.length > 0 ? 'success' : 'warning'}">
          <strong>AI Agents:</strong> ${agents.length > 0 ? `${agents.length} active agent(s)` : 'No agents configured'}
        </div>

        ${agents.length > 0 ? `
          <h3>🎭 Available AI Agents</h3>
          ${agents.map(agent => `
            <div class="agent-card">
              <h4>${agent.name} <span class="badge">${agent.industry}</span></h4>
              <p style="color: #666; margin: 5px 0;">"${(agent.greeting || '').substring(0, 100)}..."</p>
              <small>ID: <code>${agent.id}</code></small>
            </div>
          `).join('')}
        ` : `
          <div class="status warning">
            No AI agents found. Create one at <a href="/test-call/ai">/test-call/ai</a>
          </div>
        `}

        <h3>📊 Connection Status</h3>
        <div id="connectionStatus">
          <p>Active Sessions: <strong>${getActiveSessionsCount()}</strong></p>
        </div>

        <h3>🔧 Audio Format</h3>
        <pre>
Exotel sends: Raw PCM, 16-bit, 8kHz, mono, little-endian, base64
Our response: Same format, chunks of 320 byte multiples
        </pre>

        <h3>📝 API Endpoints</h3>
        <pre>
GET  /api/voicebot/health         - Health check
GET  /api/voicebot/websocket-url  - Get WebSocket URL
GET  /api/voicebot/test           - This page
WSS  /voice-stream                - WebSocket endpoint
        </pre>
      </div>

      <script>
        function copyUrl() {
          const url = document.getElementById('wsUrl').textContent;
          navigator.clipboard.writeText(url).then(() => {
            alert('WebSocket URL copied to clipboard!');
          });
        }

        // Refresh status every 10 seconds
        setInterval(async () => {
          try {
            const res = await fetch('/api/voicebot/health');
            const data = await res.json();
            document.getElementById('connectionStatus').innerHTML =
              '<p>Active Sessions: <strong>' + data.activeSessions + '</strong></p>' +
              '<p>Status: <strong>' + data.status + '</strong></p>';
          } catch (e) {}
        }, 10000);
      </script>
    </body>
    </html>
  `);
});

/**
 * Initiate an outbound AI call
 */
router.post('/call', async (req: Request, res: Response) => {
  try {
    const { to, agentId } = req.body;

    if (!to) {
      return res.status(400).json({ success: false, error: 'Phone number required' });
    }

    // Get agent (only PUBLISHED agents can handle real calls)
    let agent = null;
    if (agentId) {
      agent = await prisma.voiceAgent.findUnique({ where: { id: agentId } });
      // Verify agent is published
      if (agent && agent.status !== 'PUBLISHED') {
        console.log(`[VoiceBot] Agent ${agent.name} is not published (status: ${agent.status})`);
        agent = null;
      }
    }
    if (!agent) {
      agent = await prisma.voiceAgent.findFirst({
        where: {
          isActive: true,
          status: 'PUBLISHED'  // Only published agents can handle live calls
        }
      });
    }
    if (!agent) {
      return res.status(400).json({
        success: false,
        error: 'No published voice agent found. Please publish an agent first.'
      });
    }

    // Create call record
    const call = await prisma.outboundCall.create({
      data: {
        agentId: agent.id,
        phoneNumber: to,
        status: 'INITIATED',
        direction: 'OUTBOUND',
      },
    });

    // Return info - actual call needs to be made via Exotel dashboard/API
    // because Voice Bot requires the Exotel flow to be set up
    const baseUrl = config.baseUrl;
    const wsUrl = baseUrl.replace('https://', 'wss://').replace('http://', 'ws://');

    res.json({
      success: true,
      callId: call.id,
      agent: { id: agent.id, name: agent.name },
      websocketUrl: `${wsUrl}/voice-stream?callId=${call.id}&agentId=${agent.id}`,
      note: 'For outbound calls with Voice Bot, configure the flow in Exotel dashboard and use their API to initiate calls.',
    });
  } catch (error: any) {
    console.error('[VoiceBot] Call error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
