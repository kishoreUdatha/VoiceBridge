/**
 * Unified Voice Routes
 * Provider-agnostic voice call handling for AI agents
 *
 * These routes work with both Plivo and Exotel based on configuration
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../../config/database';
import { config } from '../../config';
import { telephonyService } from '../../services/telephony';
import { TelephonyProviderType } from '../../services/telephony/telephony.types';
import { callSpeechService } from '../../services/call-speech.service';

const router = Router();

// ==================== CALL INITIATION ====================

/**
 * POST /call - Make an outbound call
 * If agentId provided, uses agent's assigned phone number
 * Otherwise uses 'from' number provided
 */
router.post('/call', async (req: Request, res: Response) => {
  try {
    const { to, from, agentId, leadId } = req.body;

    if (!to) {
      return res.status(400).json({ error: 'Missing required field: to' });
    }

    // If agentId provided, use AI call flow
    if (agentId) {
      const result = await telephonyService.makeAICall({
        from: from || '',
        to,
        agentId,
        leadId,
      });

      if (result.success) {
        await prisma.outboundCall.create({
          data: {
            id: result.callId || `call-${Date.now()}`,
            agentId,
            leadId,
            phoneNumber: to,
            status: 'INITIATED',
            twilioCallSid: result.callId,
            direction: 'OUTBOUND',
          },
        });
      }

      return res.json(result);
    }

    // Regular call (non-AI) - requires 'from' number
    if (!from) {
      return res.status(400).json({ error: 'Missing required field: from (or provide agentId)' });
    }

    const provider = await telephonyService.getProviderForNumber(from);
    if (!provider) {
      return res.status(503).json({ error: 'No telephony provider configured for this number' });
    }

    const result = await provider.makeCall({ from, to });
    res.json(result);
  } catch (error: any) {
    console.error('[Voice] Call error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /ai-call - Make an AI-powered call
 * Provider is determined by the phone number assigned to the agent
 */
router.post('/ai-call', async (req: Request, res: Response) => {
  try {
    const { to, agentId, leadId } = req.body;

    if (!to || !agentId) {
      return res.status(400).json({ error: 'Missing required fields: to, agentId' });
    }

    // Get agent to verify it exists
    const agent = await prisma.voiceAgent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Make AI call - provider is determined by agent's assigned phone number
    const result = await telephonyService.makeAICall({
      from: '', // Will be set by telephonyService from assigned phone
      to,
      agentId,
      leadId,
      greeting: agent.greeting || undefined,
      language: agent.language || 'en-IN',
      voiceId: agent.voiceId || undefined,
    });

    if (result.success) {
      // Store call record
      const outboundCall = await prisma.outboundCall.create({
        data: {
          id: result.callId || `call-${Date.now()}`,
          agentId,
          leadId,
          phoneNumber: to,
          status: 'INITIATED',
          twilioCallSid: result.callId,
          direction: 'OUTBOUND',
        },
      });

      res.json({
        success: true,
        callId: result.callId,
        outboundCallId: outboundCall.id,
        provider: result.provider,
        status: result.status,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        provider: result.provider,
      });
    }
  } catch (error: any) {
    console.error('[Voice] AI Call error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== WEBHOOKS (Provider-Agnostic) ====================

/**
 * POST /ai-answer/:agentId - Initial answer webhook for AI calls
 * Works with both Plivo and Exotel
 */
router.post('/ai-answer/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const provider = telephonyService.detectProviderFromWebhook(req.body, req.headers as any);

    console.log(`[Voice] AI Answer webhook for agent ${agentId} from ${provider}`);

    // Get agent
    const agent = await prisma.voiceAgent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      const xml = telephonyService.generateXML(provider, {
        sayText: 'Sorry, this agent is not available.',
        hangup: true,
      });
      return res.type('application/xml').send(xml);
    }

    // Parse call info from webhook
    const callStatus = telephonyService.parseWebhook(provider, req.body);
    const callId = callStatus.callId;
    const baseUrl = config.baseUrl || process.env.API_BASE_URL || '';

    // Create or update outbound call record
    await prisma.outboundCall.upsert({
      where: { id: callId },
      update: { status: 'IN_PROGRESS' },
      create: {
        id: callId,
        agentId,
        phoneNumber: callStatus.to,
        status: 'IN_PROGRESS',
        twilioCallSid: callId,
        direction: callStatus.direction === 'inbound' ? 'INBOUND' : 'OUTBOUND',
      },
    });

    // Generate initial greeting and gather speech
    const xml = telephonyService.generateGatherSpeechXML(provider, {
      promptText: agent.greeting || `Hello! I'm ${agent.name}. How can I help you today?`,
      callId,
      baseUrl,
      language: agent.language || 'en-IN',
      voiceId: agent.voiceId || undefined,
      timeout: 5,
    });

    res.type('application/xml').send(xml);
  } catch (error: any) {
    console.error('[Voice] AI Answer error:', error);
    const provider = telephonyService.getDefaultProviderName();
    const xml = telephonyService.generateXML(provider, {
      sayText: 'Sorry, an error occurred. Please try again later.',
      hangup: true,
    });
    res.type('application/xml').send(xml);
  }
});

/**
 * POST /answer/:callId - Answer webhook for existing calls
 */
router.post('/answer/:callId', async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;
    const provider = telephonyService.detectProviderFromWebhook(req.body, req.headers as any);

    // Get call record
    const call = await prisma.outboundCall.findUnique({
      where: { id: callId },
      include: { agent: true },
    });

    if (!call || !call.agent) {
      const xml = telephonyService.generateXML(provider, {
        sayText: 'Sorry, this call is not available.',
        hangup: true,
      });
      return res.type('application/xml').send(xml);
    }

    const baseUrl = config.baseUrl || process.env.API_BASE_URL || '';

    // Generate gather speech XML
    const xml = telephonyService.generateGatherSpeechXML(provider, {
      promptText: call.agent.greeting || 'Hello! How can I help you?',
      callId,
      baseUrl,
      language: call.agent.language || 'en-IN',
      voiceId: call.agent.voiceId || undefined,
    });

    res.type('application/xml').send(xml);
  } catch (error: any) {
    console.error('[Voice] Answer error:', error);
    const provider = telephonyService.getDefaultProviderName();
    const xml = telephonyService.generateXML(provider, {
      sayText: 'Sorry, an error occurred.',
      hangup: true,
    });
    res.type('application/xml').send(xml);
  }
});

/**
 * POST /speech/:callId - Speech input webhook
 * Processes user speech and generates AI response
 */
router.post('/speech/:callId', async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;
    const provider = telephonyService.detectProviderFromWebhook(req.body, req.headers as any);

    console.log(`[Voice] Speech webhook for call ${callId} from ${provider}`);

    // Parse speech result
    const speechResult = telephonyService.parseSpeechWebhook(provider, req.body);
    const userSpeech = speechResult.text;

    console.log(`[Voice] User said: "${userSpeech}"`);

    // Get call record with agent
    const call = await prisma.outboundCall.findUnique({
      where: { id: callId },
      include: { agent: true },
    });

    if (!call || !call.agent) {
      const xml = telephonyService.generateXML(provider, {
        sayText: 'Sorry, the call session has ended.',
        hangup: true,
      });
      return res.type('application/xml').send(xml);
    }

    const baseUrl = config.baseUrl || process.env.API_BASE_URL || '';

    // Check for DTMF input (0 = transfer to human)
    const dtmfDigits = req.body.Digits || req.body.digits;

    // Use call-speech service to handle the input
    const responseXml = await callSpeechService.handleSpeechInput(
      callId,
      userSpeech,
      dtmfDigits
    );

    res.type('application/xml').send(responseXml);
  } catch (error: any) {
    console.error('[Voice] Speech webhook error:', error);
    const provider = telephonyService.getDefaultProviderName();
    const xml = telephonyService.generateXML(provider, {
      sayText: "I'm sorry, I encountered an error. Please try again.",
      hangup: true,
    });
    res.type('application/xml').send(xml);
  }
});

/**
 * POST /status - Call status webhook
 */
router.post('/status', async (req: Request, res: Response) => {
  try {
    const provider = telephonyService.detectProviderFromWebhook(req.body, req.headers as any);
    const callStatus = telephonyService.parseWebhook(provider, req.body);

    console.log(`[Voice] Status webhook: ${callStatus.callId} -> ${callStatus.status}`);

    // Update call record
    const updateData: any = {};

    switch (callStatus.status) {
      case 'completed':
        updateData.status = 'COMPLETED';
        updateData.duration = callStatus.duration;
        updateData.endedAt = new Date();
        break;
      case 'busy':
        updateData.status = 'BUSY';
        updateData.endedAt = new Date();
        break;
      case 'no-answer':
        updateData.status = 'NO_ANSWER';
        updateData.endedAt = new Date();
        break;
      case 'failed':
        updateData.status = 'FAILED';
        updateData.endedAt = new Date();
        break;
      case 'in-progress':
        updateData.status = 'IN_PROGRESS';
        updateData.answeredAt = new Date();
        break;
      case 'ringing':
        updateData.status = 'RINGING';
        break;
    }

    if (callStatus.recordingUrl) {
      updateData.recordingUrl = callStatus.recordingUrl;
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.outboundCall.update({
        where: { id: callStatus.callId },
        data: updateData,
      }).catch(() => {
        // Call might not exist in DB
      });
    }

    res.status(200).send('OK');
  } catch (error: any) {
    console.error('[Voice] Status webhook error:', error);
    res.status(200).send('OK'); // Always return 200 to prevent retries
  }
});

/**
 * POST /recording - Recording webhook
 */
router.post('/recording', async (req: Request, res: Response) => {
  try {
    const provider = telephonyService.detectProviderFromWebhook(req.body, req.headers as any);

    // Get recording URL based on provider
    let recordingUrl: string | undefined;
    let callId: string | undefined;

    if (provider === 'PLIVO') {
      recordingUrl = req.body.RecordUrl || req.body.RecordingUrl;
      callId = req.body.CallUUID;
    } else {
      recordingUrl = req.body.RecordingUrl;
      callId = req.body.CallSid;
    }

    if (callId && recordingUrl) {
      await prisma.outboundCall.update({
        where: { id: callId },
        data: { recordingUrl },
      }).catch(() => {});

      console.log(`[Voice] Recording saved for call ${callId}: ${recordingUrl}`);
    }

    res.status(200).send('OK');
  } catch (error: any) {
    console.error('[Voice] Recording webhook error:', error);
    res.status(200).send('OK');
  }
});

/**
 * POST /stream/:callId - WebSocket stream URL for bidirectional audio
 */
router.post('/stream/:callId', async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;
    const provider = telephonyService.detectProviderFromWebhook(req.body, req.headers as any);

    const call = await prisma.outboundCall.findUnique({
      where: { id: callId },
      include: { agent: true },
    });

    if (!call || !call.agent) {
      return res.status(404).json({ error: 'Call not found' });
    }

    // Generate WebSocket URL for streaming
    const wsBaseUrl = (config.baseUrl || '').replace('http', 'ws');
    const streamUrl = `${wsBaseUrl}/voice-stream?callId=${callId}&agentId=${call.agentId}`;

    const xml = telephonyService.generateStreamXML(provider, {
      streamUrl,
      callId,
      greeting: call.agent.greeting || undefined,
      voiceId: call.agent.voiceId || undefined,
      language: call.agent.language || 'en-IN',
    });

    res.type('application/xml').send(xml);
  } catch (error: any) {
    console.error('[Voice] Stream error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== UTILITY ENDPOINTS ====================

/**
 * GET /status - Get telephony status
 */
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const [providersStatus, defaultProvider, availableProviders] = await Promise.all([
      telephonyService.getProvidersStatus(),
      telephonyService.getDefaultProvider(),
      telephonyService.getAvailableProviders(),
    ]);

    res.json({
      defaultProvider: telephonyService.getDefaultProviderName(),
      activeProvider: defaultProvider?.providerName || null,
      availableProviders,
      providers: providersStatus,
      note: 'Provider is determined by phone number assigned to agent',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /end-call - End an active call
 */
router.post('/end-call', async (req: Request, res: Response) => {
  try {
    const { callId, provider } = req.body;

    if (!callId) {
      return res.status(400).json({ error: 'Missing callId' });
    }

    const providerType = (provider?.toUpperCase() || telephonyService.getDefaultProviderName()) as TelephonyProviderType;
    const result = await telephonyService.endCall(callId, providerType);

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /call/:callId - Get call status
 */
router.get('/call/:callId', async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;
    const provider = (req.query.provider?.toString().toUpperCase() || telephonyService.getDefaultProviderName()) as TelephonyProviderType;

    const callStatus = await telephonyService.getCallStatus(callId, provider);

    if (!callStatus) {
      return res.status(404).json({ error: 'Call not found' });
    }

    res.json(callStatus);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
