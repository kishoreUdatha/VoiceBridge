import { Router, Request, Response } from 'express';
import { plivoService } from '../integrations/plivo.service';
import { plivoVoiceService } from '../integrations/plivo-voice.service';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { verifyPlivoWebhook } from '../middlewares/webhookAuth';
import { webhookLimiter } from '../middlewares/rateLimit';
import { ApiResponse } from '../utils/apiResponse';
import { prisma } from '../config/database';
import { config } from '../config';
import OpenAI from 'openai';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const router = Router();

// ==================== WEBHOOKS (No Auth, but verified) ====================

// Incoming SMS webhook
router.post('/webhook/sms', webhookLimiter, verifyPlivoWebhook, async (req: Request, res: Response) => {
  try {
    const { From, To, Text, MessageUUID } = req.body;

    const result = await plivoService.handleIncomingSms(From, To, Text, MessageUUID);

    // Return 200 to acknowledge receipt
    res.status(200).send('OK');
  } catch (error) {
    console.error('Plivo SMS webhook error:', error);
    res.status(500).send('Error');
  }
});

// Call status webhook
router.post('/webhook/call-status', async (req: Request, res: Response) => {
  try {
    const { CallUUID, CallStatus, Duration, RecordUrl } = req.body;

    await plivoService.handleCallStatus(
      CallUUID,
      CallStatus,
      Duration ? parseInt(Duration) : undefined,
      RecordUrl
    );

    res.status(200).send('OK');
  } catch (error) {
    console.error('Plivo call status webhook error:', error);
    res.status(500).send('Error');
  }
});

// Call answer webhook - returns XML for call flow
router.post('/webhook/answer', async (req: Request, res: Response) => {
  try {
    const xml = plivoService.generateAnswerXml(
      'Hello! Thank you for calling. Please hold while we connect you to a representative.'
    );

    res.set('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error('Plivo answer webhook error:', error);
    res.status(500).send('Error');
  }
});

// Call hangup webhook
router.post('/webhook/hangup', async (req: Request, res: Response) => {
  try {
    console.log('[Plivo] Hangup webhook body:', JSON.stringify(req.body));

    const CallUUID = req.body.CallUUID || req.body.call_uuid;
    const RequestUUID = req.body.RequestUUID || req.body.request_uuid;
    const Duration = req.body.Duration || req.body.duration;
    const To = req.body.To || req.body.to;

    // Find the call
    let call = await prisma.outboundCall.findFirst({
      where: { twilioCallSid: CallUUID },
    });

    if (!call && RequestUUID) {
      call = await prisma.outboundCall.findFirst({
        where: { twilioCallSid: RequestUUID },
      });
    }

    // Fallback: find by phone number
    if (!call && To) {
      const phoneDigits = To.replace(/\D/g, '').slice(-10);
      call = await prisma.outboundCall.findFirst({
        where: {
          phoneNumber: { contains: phoneDigits },
          status: 'IN_PROGRESS',
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (call) {
      await prisma.outboundCall.update({
        where: { id: call.id },
        data: {
          status: 'COMPLETED',
          duration: Duration ? parseInt(Duration) : undefined,
          endedAt: new Date(),
        },
      });
      console.log(`[Plivo] Call ${call.id} marked as COMPLETED`);
    } else {
      console.warn(`[Plivo] Hangup: Call not found for UUID=${CallUUID}`);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Plivo hangup webhook error:', error);
    res.status(500).send('Error');
  }
});

// Recording callback webhook
router.post('/webhook/recording', async (req: Request, res: Response) => {
  try {
    const { CallUUID, RecordUrl, RecordingDuration } = req.body;

    await plivoService.updateCallStatus(
      CallUUID,
      'COMPLETED' as any,
      RecordingDuration ? parseInt(RecordingDuration) : undefined,
      RecordUrl
    );

    res.status(200).send('OK');
  } catch (error) {
    console.error('Plivo recording webhook error:', error);
    res.status(500).send('Error');
  }
});

// Voice Agent answer webhook - returns XML for AI agent call flow with natural conversation
router.post('/answer/:callId', async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;

    console.log(`[Plivo] Answer webhook for call ${callId}`);

    // Get the call and agent details
    const call = await prisma.outboundCall.findUnique({
      where: { id: callId },
      include: { agent: true },
    });

    if (!call || !call.agent) {
      console.error(`[Plivo] Call ${callId} or agent not found`);
      const xml = plivoVoiceService.generateHangupXML('Sorry, an error occurred. Goodbye.');
      res.set('Content-Type', 'application/xml');
      return res.send(xml);
    }

    // Update call status
    await prisma.outboundCall.update({
      where: { id: callId },
      data: {
        status: 'IN_PROGRESS',
        answeredAt: new Date(),
      },
    });

    // Determine language
    const language = call.agent.language || 'en-IN';

    // Use the agent's greeting or generate a natural one
    const greeting = call.agent.greeting || 'Hello! This is a call from MyLeadX. How are you doing today?';
    const baseUrl = config.baseUrl;

    console.log(`[Plivo] Generating speech input XML with greeting: ${greeting}`);

    // Generate XML with speech recognition for natural conversation
    const xml = plivoVoiceService.generateConversationXML({
      text: greeting,
      language,
      action: `${baseUrl}/api/plivo/webhook/speech/${callId}`,
      timeout: 20,
    });

    // Store greeting in transcript
    await prisma.outboundCall.update({
      where: { id: callId },
      data: {
        transcript: [
          { role: 'assistant', content: greeting, timestamp: new Date().toISOString() },
        ],
      },
    });

    console.log(`[Plivo] Sending XML response for call ${callId}`);
    res.set('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error('Plivo answer webhook error:', error);
    const xml = plivoVoiceService.generateHangupXML('Sorry, an error occurred. Goodbye.');
    res.set('Content-Type', 'application/xml');
    res.send(xml);
  }
});

// Voice Agent speech input handler - processes natural conversation
router.post('/webhook/speech/:callId', async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;

    // Get speech recognition result from Plivo
    const speech = req.body.Speech || req.body.speech || '';
    const speechConfidence = req.body.SpeechConfidence || req.body.speechConfidence || '0';
    const inputType = req.body.InputType || req.body.inputType || 'speech';

    console.log(`[Plivo] Speech received for call ${callId}:`, { speech, speechConfidence, inputType });
    console.log(`[Plivo] Full webhook body:`, JSON.stringify(req.body));

    const call = await prisma.outboundCall.findUnique({
      where: { id: callId },
      include: { agent: true, lead: true },
    });

    if (!call || !call.agent) {
      const xml = plivoVoiceService.generateHangupXML('Sorry, an error occurred. Goodbye.');
      res.set('Content-Type', 'application/xml');
      return res.send(xml);
    }

    const language = call.agent.language || 'en-IN';
    const baseUrl = config.baseUrl;

    // Update transcript with user's speech
    const currentTranscript = (call.transcript as any[]) || [];

    // Handle timeout or no speech
    if (!speech || speech.trim() === '') {
      console.log(`[Plivo] No speech detected for call ${callId}, prompting again`);

      currentTranscript.push({
        role: 'user',
        content: '[No speech detected]',
        timestamp: new Date().toISOString(),
      });

      const promptAgain = "I didn't catch that. Could you please repeat?";
      currentTranscript.push({
        role: 'assistant',
        content: promptAgain,
        timestamp: new Date().toISOString(),
      });

      await prisma.outboundCall.update({
        where: { id: callId },
        data: { transcript: currentTranscript },
      });

      const xml = plivoVoiceService.generateConversationXML({
        text: promptAgain,
        language,
        action: `${baseUrl}/api/plivo/webhook/speech/${callId}`,
        timeout: 20,
      });

      res.set('Content-Type', 'application/xml');
      return res.send(xml);
    }

    // Add user's speech to transcript
    currentTranscript.push({
      role: 'user',
      content: speech,
      timestamp: new Date().toISOString(),
    });

    // Check for end conversation keywords
    const endKeywords = ['bye', 'goodbye', 'no thanks', 'not interested', 'stop calling', 'hang up', 'end call'];
    const speechLower = speech.toLowerCase();

    if (endKeywords.some(keyword => speechLower.includes(keyword))) {
      console.log(`[Plivo] End keyword detected, ending call ${callId}`);

      const farewell = "Thank you for your time. Have a great day! Goodbye.";
      currentTranscript.push({
        role: 'assistant',
        content: farewell,
        timestamp: new Date().toISOString(),
      });

      await prisma.outboundCall.update({
        where: { id: callId },
        data: { transcript: currentTranscript },
      });

      const xml = plivoVoiceService.generateHangupXML(farewell, language);
      res.set('Content-Type', 'application/xml');
      return res.send(xml);
    }

    // Generate AI response using OpenAI
    try {
      const systemPrompt = call.agent.prompt || `You are a helpful sales agent for ${call.agent.name}.
        Be conversational, friendly, and helpful. Keep responses brief (1-2 sentences).
        Your goal is to understand the customer's needs and provide relevant information.
        ${call.agent.script ? `Follow this script: ${call.agent.script}` : ''}`;

      // Build conversation history for context
      const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
        { role: 'system', content: systemPrompt },
      ];

      // Add conversation history
      for (const entry of currentTranscript) {
        if (entry.role === 'user' && entry.content !== '[No speech detected]') {
          messages.push({ role: 'user', content: entry.content });
        } else if (entry.role === 'assistant') {
          messages.push({ role: 'assistant', content: entry.content });
        }
      }

      console.log(`[Plivo] Generating AI response for call ${callId}`);

      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        messages,
        max_tokens: 150,
        temperature: 0.7,
      });

      const aiResponse = completion.choices[0]?.message?.content || "I understand. Is there anything else I can help you with?";

      console.log(`[Plivo] AI response: ${aiResponse}`);

      // Add AI response to transcript
      currentTranscript.push({
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString(),
      });

      await prisma.outboundCall.update({
        where: { id: callId },
        data: { transcript: currentTranscript },
      });

      // Check if conversation should end (AI might signal completion)
      const aiLower = aiResponse.toLowerCase();
      if (aiLower.includes('goodbye') || aiLower.includes('have a great day') || currentTranscript.length > 20) {
        const xml = plivoVoiceService.generateHangupXML(aiResponse, language);
        res.set('Content-Type', 'application/xml');
        return res.send(xml);
      }

      // Continue conversation
      const xml = plivoVoiceService.generateConversationXML({
        text: aiResponse,
        language,
        action: `${baseUrl}/api/plivo/webhook/speech/${callId}`,
        timeout: 20,
      });

      res.set('Content-Type', 'application/xml');
      res.send(xml);

    } catch (aiError) {
      console.error(`[Plivo] OpenAI error for call ${callId}:`, aiError);

      // Fallback response
      const fallback = "I appreciate your response. A team member will follow up with you shortly. Thank you for your time!";
      currentTranscript.push({
        role: 'assistant',
        content: fallback,
        timestamp: new Date().toISOString(),
      });

      await prisma.outboundCall.update({
        where: { id: callId },
        data: { transcript: currentTranscript },
      });

      const xml = plivoVoiceService.generateHangupXML(fallback, language);
      res.set('Content-Type', 'application/xml');
      res.send(xml);
    }

  } catch (error) {
    console.error('Plivo speech webhook error:', error);
    const xml = plivoVoiceService.generateHangupXML('Sorry, an error occurred. Goodbye.');
    res.set('Content-Type', 'application/xml');
    res.send(xml);
  }
});

// Voice Agent DTMF input handler (fallback for keypress input)
router.post('/webhook/input/:callId', async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;
    const digits = req.body.Digits || req.body.digits;

    console.log(`[Plivo] Input received for call ${callId}: ${digits}`);

    const call = await prisma.outboundCall.findUnique({
      where: { id: callId },
      include: { agent: true },
    });

    if (!call || !call.agent) {
      const xml = plivoVoiceService.generateHangupXML('Sorry, an error occurred. Goodbye.');
      res.set('Content-Type', 'application/xml');
      return res.send(xml);
    }

    const language = call.agent.language || 'en-IN';

    // Update transcript with user's input
    const currentTranscript = (call.transcript as any[]) || [];
    currentTranscript.push({
      role: 'user',
      content: `Pressed: ${digits || 'timeout'}`,
      timestamp: new Date().toISOString(),
    });

    await prisma.outboundCall.update({
      where: { id: callId },
      data: { transcript: currentTranscript },
    });

    // Handle the input
    if (digits === '1') {
      const acknowledgment = "Great! Thank you for confirming. A team member will follow up with you shortly. Goodbye!";
      const xml = plivoVoiceService.generateHangupXML(acknowledgment, language);
      res.set('Content-Type', 'application/xml');
      return res.send(xml);
    } else {
      const acknowledgment = "Thank you for your time. Goodbye!";
      const xml = plivoVoiceService.generateHangupXML(acknowledgment, language);
      res.set('Content-Type', 'application/xml');
      return res.send(xml);
    }
  } catch (error) {
    console.error('Plivo input webhook error:', error);
    const xml = plivoVoiceService.generateHangupXML('Sorry, an error occurred. Goodbye.');
    res.set('Content-Type', 'application/xml');
    res.send(xml);
  }
});

// Call status webhook for voice agent calls
router.post('/webhook/status', async (req: Request, res: Response) => {
  try {
    console.log('[Plivo] Status webhook body:', JSON.stringify(req.body));

    const CallUUID = req.body.CallUUID || req.body.call_uuid || req.body.callUuid;
    const RequestUUID = req.body.RequestUUID || req.body.request_uuid;
    const CallStatus = req.body.CallStatus || req.body.call_status || req.body.callStatus || req.body.Status || req.body.status;
    const Duration = req.body.Duration || req.body.duration || req.body.TotalDuration || req.body.total_duration;
    const BillDuration = req.body.BillDuration || req.body.bill_duration || req.body.billDuration;
    const To = req.body.To || req.body.to;

    console.log(`[Plivo] Status: CallUUID=${CallUUID}, RequestUUID=${RequestUUID}, Status=${CallStatus}`);

    // Try to find call by CallUUID or RequestUUID
    let call = await prisma.outboundCall.findFirst({
      where: { twilioCallSid: CallUUID },
    });

    if (!call && RequestUUID) {
      call = await prisma.outboundCall.findFirst({
        where: { twilioCallSid: RequestUUID },
      });
    }

    // Fallback: find by phone number for recent IN_PROGRESS calls
    if (!call && To) {
      const phoneDigits = To.replace(/\D/g, '').slice(-10);
      call = await prisma.outboundCall.findFirst({
        where: {
          phoneNumber: { contains: phoneDigits },
          status: 'IN_PROGRESS',
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (call) {
      const statusMap: Record<string, string> = {
        'ringing': 'RINGING',
        'in-progress': 'IN_PROGRESS',
        'completed': 'COMPLETED',
        'busy': 'BUSY',
        'no-answer': 'NO_ANSWER',
        'failed': 'FAILED',
        'canceled': 'CANCELLED',
        'cancelled': 'CANCELLED',
        'hangup': 'COMPLETED',
      };

      const mappedStatus = statusMap[CallStatus?.toLowerCase()];

      if (mappedStatus) {
        const isTerminal = ['COMPLETED', 'FAILED', 'BUSY', 'NO_ANSWER', 'CANCELLED'].includes(mappedStatus);

        await prisma.outboundCall.update({
          where: { id: call.id },
          data: {
            status: mappedStatus,
            duration: Duration ? parseInt(Duration) : (BillDuration ? parseInt(BillDuration) : undefined),
            endedAt: isTerminal ? new Date() : undefined,
          },
        });
        console.log(`[Plivo] Updated call ${call.id} to ${mappedStatus}`);
      } else {
        console.warn(`[Plivo] Unknown status: ${CallStatus}`);
      }
    } else {
      console.warn(`[Plivo] Call not found for UUID=${CallUUID}`);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Plivo status webhook error:', error);
    res.status(500).send('Error');
  }
});

// IVR input handler
router.post('/webhook/ivr-input', async (req: Request, res: Response) => {
  try {
    const { Digits, CallUUID } = req.body;

    let xml: string;

    switch (Digits) {
      case '1':
        xml = plivoService.generateConnectXml(process.env.SALES_PHONE || '');
        break;
      case '2':
        xml = plivoService.generateConnectXml(process.env.SUPPORT_PHONE || '');
        break;
      case '3':
        xml = plivoService.generateRecordXml(`${process.env.FRONTEND_URL}/api/plivo/webhook/voicemail`);
        break;
      default:
        xml = plivoService.generateAnswerXml('Invalid option. Goodbye.');
    }

    res.set('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error('Plivo IVR input error:', error);
    res.status(500).send('Error');
  }
});

// ==================== TEST ENDPOINT (No Auth) ====================

// Simple test call endpoint for quick testing
router.post('/test-call', async (req: Request, res: Response) => {
  try {
    const { to } = req.body;

    if (!to) {
      return res.status(400).json({ success: false, error: 'Phone number is required' });
    }

    console.log(`[Plivo] Test call requested to ${to}`);

    if (!plivoVoiceService.isConfigured()) {
      return res.status(400).json({
        success: false,
        error: 'Plivo is not configured. Check PLIVO_AUTH_ID, PLIVO_AUTH_TOKEN, PLIVO_PHONE_NUMBER.'
      });
    }

    // Get a published agent (only PUBLISHED agents can handle real calls)
    const agent = await prisma.voiceAgent.findFirst({
      where: {
        isActive: true,
        status: 'PUBLISHED'  // Only published agents can handle live calls
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!agent) {
      return res.status(400).json({
        success: false,
        error: 'No published voice agent found. Please publish an agent first to make calls.'
      });
    }

    // Format phone number
    const formattedPhone = plivoVoiceService.formatIndianNumber(to);
    const baseUrl = config.baseUrl;

    console.log(`[Plivo] Using baseUrl: ${baseUrl}`);

    // Create call record
    const call = await prisma.outboundCall.create({
      data: {
        agentId: agent.id,
        phoneNumber: formattedPhone,
        status: 'INITIATED',
        direction: 'OUTBOUND',
      },
    });

    // Make the call
    const result = await plivoVoiceService.makeCall({
      to: formattedPhone,
      answerUrl: `${baseUrl}/api/plivo/answer/${call.id}`,
      hangupUrl: `${baseUrl}/api/plivo/webhook/hangup`,
      callbackUrl: `${baseUrl}/api/plivo/webhook/status`,
      ringTimeout: 30,
    });

    if (result.success) {
      await prisma.outboundCall.update({
        where: { id: call.id },
        data: { twilioCallSid: result.callUuid, status: 'QUEUED' },
      });

      console.log(`[Plivo] Test call initiated: ${result.callUuid}`);

      return res.json({
        success: true,
        callId: call.id,
        callUuid: result.callUuid,
        phoneNumber: formattedPhone,
        agent: agent.name,
        message: 'Call is being connected. You should receive a call shortly.',
      });
    } else {
      await prisma.outboundCall.update({
        where: { id: call.id },
        data: { status: 'FAILED' },
      });
      return res.status(500).json({ success: false, error: result.error });
    }
  } catch (error: any) {
    console.error('[Plivo] Test call error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== AUTHENTICATED ENDPOINTS ====================

router.use(authenticate);
router.use(tenantMiddleware);

// Send SMS
router.post('/sms/send', async (req: TenantRequest, res: Response) => {
  try {
    const { to, message, leadId } = req.body;

    if (!to || !message) {
      return ApiResponse.error(res, 'Phone number and message are required', 400);
    }

    const result = await plivoService.sendSms({
      to,
      message,
      leadId,
      userId: req.user!.id,
    });

    ApiResponse.success(res, 'SMS sent successfully', result);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Send bulk SMS
router.post('/sms/bulk', async (req: TenantRequest, res: Response) => {
  try {
    const { recipients } = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return ApiResponse.error(res, 'Recipients array is required', 400);
    }

    const results = await plivoService.sendBulkSms(recipients, req.user!.id);

    ApiResponse.success(res, 'Bulk SMS sent', {
      total: recipients.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Make call
router.post('/call/make', async (req: TenantRequest, res: Response) => {
  try {
    const { to, leadId, callType } = req.body;

    if (!to) {
      return ApiResponse.error(res, 'Phone number is required', 400);
    }

    const answerUrl = `${process.env.FRONTEND_URL}/api/plivo/webhook/answer`;

    const result = await plivoService.makeCall({
      to,
      leadId,
      callerId: req.user!.id,
      organizationId: req.user!.organizationId,
      callType,
    }, answerUrl);

    ApiResponse.success(res, 'Call initiated successfully', result);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Get account balance
router.get('/account/balance', async (req: TenantRequest, res: Response) => {
  try {
    const balance = await plivoService.getAccountBalance();
    ApiResponse.success(res, 'Account balance retrieved', balance);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Get message details
router.get('/sms/:messageId', async (req: TenantRequest, res: Response) => {
  try {
    const details = await plivoService.getMessageDetails(req.params.messageId);
    ApiResponse.success(res, 'Message details retrieved', details);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Get call details
router.get('/call/:callId', async (req: TenantRequest, res: Response) => {
  try {
    const details = await plivoService.getCallDetails(req.params.callId);
    ApiResponse.success(res, 'Call details retrieved', details);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// List phone numbers
router.get('/numbers', async (req: TenantRequest, res: Response) => {
  try {
    const numbers = await plivoService.listPhoneNumbers();
    ApiResponse.success(res, 'Phone numbers retrieved', numbers);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Check if Plivo is configured
router.get('/status', async (req: TenantRequest, res: Response) => {
  try {
    const isConfigured = plivoService.isConfigured();

    if (isConfigured) {
      const balance = await plivoService.getAccountBalance();
      ApiResponse.success(res, 'Plivo is configured', {
        configured: true,
        balance: balance.balance,
        currency: balance.currency,
      });
    } else {
      ApiResponse.success(res, 'Plivo is not configured', {
        configured: false,
      });
    }
  } catch (error) {
    ApiResponse.success(res, 'Plivo configuration error', {
      configured: false,
      error: (error as Error).message,
    });
  }
});

export default router;
