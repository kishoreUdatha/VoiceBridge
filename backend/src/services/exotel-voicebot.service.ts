/**
 * Exotel Voice Bot Service - Orchestration Layer
 * Handles WebSocket-based real-time voice conversations with Exotel
 *
 * This service orchestrates the voice bot functionality by delegating to:
 * - voicebot-session.service: Session lifecycle management
 * - voicebot-audio.service: Audio processing and VAD
 * - voicebot-transcription.service: Speech-to-text
 * - voicebot-tts.service: Text-to-speech
 * - voicebot-ai.service: AI response generation
 * - voicebot-mood.service: User mood detection
 * - voicebot-document.service: Document sharing
 * - voicebot-callback.service: Callback scheduling
 *
 * Audio Format from Exotel:
 * - Raw PCM: 16-bit, 8kHz, mono, little-endian
 * - Base64 encoded
 * - Chunk size: 320 bytes multiples (min 3.2KB, max 100KB)
 */

import * as WebSocket from 'ws';
import { prisma } from '../config/database';

// Import extracted services
import {
  createSession,
  getSession,
  deleteSession,
  getActiveSessionsCount,
  clearSessionTimeouts,
  addToTranscript,
  updateQualification,
  updateSessionMood,
  finalizeSession,
  VoiceBotSession,
  SILENCE_THRESHOLD,
  MAX_AUDIO_WAIT,
  MAX_BUFFER_SIZE,
} from './voicebot-session.service';

import {
  detectVoiceActivity,
  isSpeechDetected,
  pcmToWav,
  SAMPLE_RATE,
  BITS_PER_SAMPLE,
  CHANNELS,
  AUDIO_ENERGY_THRESHOLD,
} from './voicebot-audio.service';

import {
  transcribeAudio,
  normalizeLanguageCode,
} from './voicebot-transcription.service';

import {
  generateTTS,
  sendAudioChunks,
} from './voicebot-tts.service';

import {
  generateAIResponse,
  extractQualificationData,
} from './voicebot-ai.service';

import {
  detectDocumentRequest,
  sendDocumentsViaWhatsApp,
  AgentDocument,
} from './voicebot-document.service';


/**
 * Handle new WebSocket connection from Exotel
 */
export async function handleExotelWebSocket(ws: WebSocket.WebSocket, callId: string, agentId: string) {
  console.log(`[VoiceBot] New connection for call: ${callId}, agent: ${agentId}`);

  // Get agent details
  let agent = await findAgent(agentId);

  // Create session
  const session = createSession(callId, agentId, ws, agent);

  // Handle incoming messages
  ws.on('message', async (data: Buffer | string) => {
    try {
      await handleIncomingMessage(session, data);
    } catch (error) {
      console.error('[VoiceBot] Error handling message:', error);
      if (Buffer.isBuffer(data)) {
        console.log(`[VoiceBot] Treating as raw audio: ${data.length} bytes`);
        session.audioBuffer = Buffer.concat([session.audioBuffer, data]);
      }
    }
  });

  // Handle connection close
  ws.on('close', async () => {
    console.log(`[VoiceBot] Connection closed for call: ${callId}`);
    clearSessionTimeouts(session);
    await finalizeSession(session);
    deleteSession(callId);
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error(`[VoiceBot] WebSocket error for call ${callId}:`, error);
  });
}

/**
 * Find agent by ID or get fallback
 */
async function findAgent(agentId: string): Promise<any> {
  let agent = null;

  if (agentId && agentId !== 'undefined') {
    agent = await prisma.voiceAgent.findUnique({ where: { id: agentId } });
    console.log(`[VoiceBot] Looking for agent with ID: ${agentId}, found: ${agent?.name || 'NOT FOUND'}`);
  } else {
    console.log(`[VoiceBot] WARNING: No agentId provided! Falling back to first active agent.`);
  }

  if (!agent) {
    agent = await prisma.voiceAgent.findFirst({ where: { isActive: true } });
    console.log(`[VoiceBot] Using fallback agent: ${agent?.name || 'NONE'}`);
  }

  if (!agent) {
    console.log('[VoiceBot] No agent found, using default greeting');
  } else {
    console.log(`[VoiceBot] Agent loaded: ${agent.name}, language: ${agent.language}, voice: ${agent.voiceId}`);
  }

  return agent;
}

/**
 * Handle incoming WebSocket message
 */
async function handleIncomingMessage(session: VoiceBotSession, data: Buffer | string) {
  const isBuffer = Buffer.isBuffer(data);
  const dataSize = isBuffer ? data.length : data.length;

  // Check if it's binary audio data (not JSON)
  if (isBuffer && (data as Buffer)[0] !== 123) { // 123 = '{' in ASCII
    console.log(`[VoiceBot] Received binary audio: ${dataSize} bytes`);
    session.audioBuffer = Buffer.concat([session.audioBuffer, data as Buffer]);

    // Reset and set silence timeout
    if (session.silenceTimeout) clearTimeout(session.silenceTimeout);
    session.silenceTimeout = setTimeout(async () => {
      if (!session.isProcessing && session.audioBuffer.length > 1600) {
        console.log(`[VoiceBot] Processing binary audio: ${session.audioBuffer.length} bytes`);
        await processAudioBuffer(session);
      }
    }, SILENCE_THRESHOLD);
    return;
  }

  const message = typeof data === 'string' ? JSON.parse(data) : JSON.parse(data.toString());

  // Log first few messages in detail
  if (session.transcript.length < 3) {
    console.log(`[VoiceBot] Raw message keys:`, Object.keys(message));
  }

  await handleExotelMessage(session, message);
}

/**
 * Handle incoming message from Exotel
 */
async function handleExotelMessage(session: VoiceBotSession, message: any) {
  const { event, media, start, stop, streamSid } = message;

  // Log all incoming messages for debugging (except media)
  if (event !== 'media') {
    console.log(`[VoiceBot] Received message:`, JSON.stringify(message, null, 2));
  }

  // Store stream SID
  if (streamSid) {
    session.streamSid = streamSid;
  }

  // Handle raw audio data without event field
  if (!event) {
    await handleRawAudioData(session, message);
    return;
  }

  switch (event) {
    case 'connected':
      console.log(`[VoiceBot] Stream connected for call: ${session.callId}`);
      break;

    case 'start':
      await handleStreamStart(session, start, streamSid);
      break;

    case 'media':
      await handleMediaEvent(session, media, streamSid);
      break;

    case 'stop':
      console.log(`[VoiceBot] Stream stopped for call: ${session.callId}`);
      if (session.audioBuffer.length > 0 && !session.isProcessing) {
        await processAudioBuffer(session);
      }
      break;

    case 'mark':
      console.log(`[VoiceBot] Playback mark received:`, message.mark?.name);
      break;

    default:
      console.log(`[VoiceBot] Unknown event: ${event}`, message);
  }
}

/**
 * Handle raw audio data without event field
 */
async function handleRawAudioData(session: VoiceBotSession, message: any) {
  if (message.audio || message.payload || message.data) {
    const audioPayload = message.audio || message.payload || message.data;
    console.log(`[VoiceBot] Received raw audio (no event field), processing...`);

    const audioData = Buffer.from(audioPayload, 'base64');
    session.audioBuffer = Buffer.concat([session.audioBuffer, audioData]);

    // Reset and set silence timeout
    if (session.silenceTimeout) clearTimeout(session.silenceTimeout);
    session.silenceTimeout = setTimeout(async () => {
      if (!session.isProcessing && session.audioBuffer.length > 1600) {
        await processAudioBuffer(session);
      }
    }, SILENCE_THRESHOLD);
    return;
  }

  console.log(`[VoiceBot] No event field - waiting for 'start' event before sending greeting`);
}

/**
 * Handle stream start event
 */
async function handleStreamStart(session: VoiceBotSession, start: any, streamSid: string | null) {
  console.log(`[VoiceBot] Stream started:`, JSON.stringify(start, null, 2));
  session.streamSid = start?.streamSid || streamSid;

  // Try to find the correct call and agent
  const foundCall = await findCallFromStartEvent(session, start);

  if (foundCall?.agent) {
    session.agent = foundCall.agent;
    session.agentId = foundCall.agent.id;
    session.language = normalizeLanguageCode(foundCall.agent.language) || 'en-IN';
    console.log(`[VoiceBot] Found agent from call: ${foundCall.agent.name}, language: ${session.language}`);

    // Update call status
    await prisma.outboundCall.update({
      where: { id: foundCall.id },
      data: { startedAt: new Date(), answeredAt: new Date(), status: 'IN_PROGRESS' },
    });
  }

  // Send initial greeting
  if (!session.greetingSent) {
    await sendGreeting(session);
  }
}

/**
 * Find call from start event parameters
 */
async function findCallFromStartEvent(session: VoiceBotSession, start: any): Promise<any> {
  let foundCall: any = null;

  // Method 1: Try custom_parameters
  if (start?.custom_parameters && !foundCall) {
    try {
      const customParamKey = Object.keys(start.custom_parameters)[0];
      if (customParamKey) {
        const decoded = customParamKey
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>');
        const parsed = JSON.parse(decoded);

        if (parsed.callId) {
          console.log(`[VoiceBot] Found callId in custom_parameters: ${parsed.callId}`);
          session.dbCallId = parsed.callId;
          foundCall = await prisma.outboundCall.findUnique({
            where: { id: parsed.callId },
            include: { agent: true },
          });
        }
      }
    } catch (e) {
      console.log('[VoiceBot] Could not parse custom_parameters:', e);
    }
  }

  // Method 2: Try Exotel Call SID
  if (!foundCall && (session.streamSid || start?.callSid || start?.call_sid)) {
    const exotelCallSid = session.streamSid || start?.callSid || start?.call_sid;
    console.log(`[VoiceBot] Trying to find call by Exotel SID: ${exotelCallSid}`);
    foundCall = await prisma.outboundCall.findFirst({
      where: { twilioCallSid: exotelCallSid },
      include: { agent: true },
    });
    if (foundCall) {
      session.dbCallId = foundCall.id;
    }
  }

  // Method 3: Find most recent active call
  if (!foundCall && session.callId) {
    console.log(`[VoiceBot] Trying to find recent call by session callId: ${session.callId}`);
    foundCall = await prisma.outboundCall.findFirst({
      where: {
        status: { in: ['INITIATED', 'QUEUED', 'RINGING', 'IN_PROGRESS'] },
      },
      orderBy: { createdAt: 'desc' },
      include: { agent: true },
    });
    if (foundCall) {
      session.dbCallId = foundCall.id;
    }
  }

  return foundCall;
}

/**
 * Handle media event
 */
async function handleMediaEvent(session: VoiceBotSession, media: any, streamSid: string | null) {
  // Debug logging for first few messages
  if (!session.mediaLogged || session.audioBuffer.length < 5000) {
    console.log(`[VoiceBot] Media keys:`, media ? Object.keys(media) : 'media is null/undefined');
    session.mediaLogged = true;
  }

  // Handle first media without start event
  if (!session.greetingSent && session.audioBuffer.length === 0) {
    await handleFirstMediaWithoutStart(session, streamSid);
  }

  // Process audio payload
  const audioPayload = media?.payload || media?.chunk || media?.audio || media?.data || media?.track;
  if (!audioPayload) {
    console.log(`[VoiceBot] WARNING: No audio payload found! Media object:`, JSON.stringify(media));
    return;
  }

  // Decode audio
  const audioData = Buffer.from(audioPayload, 'base64');
  session.audioBuffer = Buffer.concat([session.audioBuffer, audioData]);

  // Voice Activity Detection
  const energyLevel = detectVoiceActivity(audioData);
  const isSpeech = energyLevel > AUDIO_ENERGY_THRESHOLD;

  // Log audio reception periodically
  if (session.audioBuffer.length % 20000 < audioData.length) {
    console.log(`[VoiceBot] Audio buffer: ${session.audioBuffer.length} bytes, energy: ${energyLevel.toFixed(0)}, speech: ${isSpeech}`);
  }

  // Force processing if buffer gets too large
  if (session.audioBuffer.length >= MAX_BUFFER_SIZE && !session.isProcessing) {
    console.log(`[VoiceBot] Buffer size limit reached, forcing processing`);
    clearSessionTimeouts(session);
    await processAudioBuffer(session);
    return;
  }

  // Handle speech detection and interruption
  if (isSpeech) {
    await handleSpeechDetected(session);
  } else if (session.speechDetected && !session.silenceTimeout) {
    // No speech but had speech before - start silence timeout
    session.silenceTimeout = setTimeout(async () => {
      session.silenceTimeout = null;
      if (session.maxWaitTimeout) {
        clearTimeout(session.maxWaitTimeout);
        session.maxWaitTimeout = null;
      }
      if (!session.isProcessing && session.audioBuffer.length > 1600) {
        console.log(`[VoiceBot] Silence detected after speech, processing ${session.audioBuffer.length} bytes`);
        await processAudioBuffer(session);
      }
    }, SILENCE_THRESHOLD);
  }
}

/**
 * Handle first media event without start event
 */
async function handleFirstMediaWithoutStart(session: VoiceBotSession, streamSid: string | null) {
  console.log(`[VoiceBot] First media received without 'start' event - trying to find correct agent`);

  if (streamSid && !session.streamSid) {
    session.streamSid = streamSid;
  }

  let foundCall: any = null;

  // Try to find call by stream_sid
  if (session.streamSid) {
    foundCall = await prisma.outboundCall.findFirst({
      where: { twilioCallSid: session.streamSid },
      include: { agent: true },
    });
  }

  // Fallback to most recent active call
  if (!foundCall) {
    foundCall = await prisma.outboundCall.findFirst({
      where: {
        status: { in: ['INITIATED', 'QUEUED', 'RINGING', 'IN_PROGRESS'] },
      },
      orderBy: { createdAt: 'desc' },
      include: { agent: true },
    });
  }

  if (foundCall?.agent) {
    session.agent = foundCall.agent;
    session.agentId = foundCall.agent.id;
    session.dbCallId = foundCall.id;
    session.language = normalizeLanguageCode(foundCall.agent.language) || 'en-IN';
    console.log(`[VoiceBot] Found agent from call (on first media): ${foundCall.agent.name}`);

    await prisma.outboundCall.update({
      where: { id: foundCall.id },
      data: { startedAt: new Date(), answeredAt: new Date(), status: 'IN_PROGRESS' },
    });
  }

  // Send greeting
  await sendGreeting(session);
}

/**
 * Handle speech detection
 */
async function handleSpeechDetected(session: VoiceBotSession) {
  // Check for interruption
  const withinGracePeriod = Date.now() < session.greetingGraceUntil;
  if (session.isSpeaking && !session.interruptTTS && !withinGracePeriod) {
    console.log(`[VoiceBot] User interrupted AI - stopping TTS playback`);
    session.interruptTTS = true;
  }

  // Update speech tracking
  session.lastSpeechTime = Date.now();
  session.speechDetected = true;

  if (session.silenceTimeout) {
    clearTimeout(session.silenceTimeout);
    session.silenceTimeout = null;
  }

  // Start max wait timeout
  if (!session.maxWaitTimeout && session.audioBuffer.length > 1600) {
    session.maxWaitTimeout = setTimeout(async () => {
      console.log(`[VoiceBot] Max wait timeout reached, forcing processing`);
      session.maxWaitTimeout = null;
      if (!session.isProcessing && session.audioBuffer.length > 1600) {
        await processAudioBuffer(session);
      }
    }, MAX_AUDIO_WAIT);
  }
}

/**
 * Send greeting to caller
 */
async function sendGreeting(session: VoiceBotSession) {
  session.greetingSent = true;
  session.greetingGraceUntil = Date.now() + 3000;
  const greeting = session.agent?.greeting || "Hello! How can I help you today?";
  console.log(`[VoiceBot] Sending greeting: ${greeting}`);

  await sendTTSResponse(session, greeting);
  addToTranscript(session, 'assistant', greeting);

  // Set timeout for follow-up if no audio received
  setTimeout(async () => {
    if (session.audioBuffer.length > 1600 && !session.isProcessing && session.ws.readyState === WebSocket.OPEN) {
      console.log(`[VoiceBot] Processing audio after greeting timeout`);
      await processAudioBuffer(session);
    } else if (session.audioBuffer.length < 1600 && !session.isProcessing && session.ws.readyState === WebSocket.OPEN) {
      console.log('[VoiceBot] No audio received after greeting, sending follow-up prompt');
      const followUp = "I'm here to help you. Please go ahead and tell me what you need.";
      await sendTTSResponse(session, followUp);
      addToTranscript(session, 'assistant', followUp);
    }
  }, 5000);
}

/**
 * Process accumulated audio buffer - transcribe and respond
 */
async function processAudioBuffer(session: VoiceBotSession) {
  if (session.isProcessing || session.audioBuffer.length < 1600) {
    return;
  }

  session.isProcessing = true;
  const audioData = session.audioBuffer;
  session.audioBuffer = Buffer.alloc(0);
  session.speechDetected = false;
  session.lastSpeechTime = 0;

  try {
    console.log(`[VoiceBot] Processing ${audioData.length} bytes of audio`);

    // Convert PCM to WAV and transcribe
    const wavBuffer = pcmToWav(audioData, SAMPLE_RATE, BITS_PER_SAMPLE, CHANNELS);
    const transcription = await transcribeAudio(wavBuffer, session.language);

    if (!transcription || transcription.trim().length === 0) {
      console.log('[VoiceBot] No speech detected or empty transcription');
      return;
    }

    console.log(`[VoiceBot] Customer said: "${transcription}"`);
    addToTranscript(session, 'user', transcription);

    // Check for end conditions
    if (await handleEndConditions(session, transcription)) {
      return;
    }

    // Check for document request
    if (await handleDocumentRequest(session, transcription)) {
      return;
    }

    // Generate and send AI response
    await handleAIResponse(session, transcription);

  } catch (error) {
    console.error('[VoiceBot] Error processing audio:', error);
    const fallbackMessage = session.agent?.fallbackMessage ||
      "I'm sorry, I didn't catch that. Could you please repeat?";
    await sendTTSResponse(session, fallbackMessage);
  } finally {
    session.isProcessing = false;
  }
}

/**
 * Handle call end conditions
 */
async function handleEndConditions(session: VoiceBotSession, transcription: string): Promise<boolean> {
  const endKeywords = ['bye', 'goodbye', 'thank you bye', 'thanks bye', 'no thanks', 'not interested', 'hang up'];
  const shouldEnd = endKeywords.some(kw => transcription.toLowerCase().includes(kw));

  if (shouldEnd) {
    const endMessage = session.agent?.endMessage ||
      'Thank you for your time. Our team will follow up with you shortly. Have a great day!';
    await sendTTSResponse(session, endMessage);
    addToTranscript(session, 'assistant', endMessage);

    // Close connection after response plays
    setTimeout(() => {
      if (session.ws.readyState === WebSocket.OPEN) {
        session.ws.close();
      }
    }, 5000);
    return true;
  }

  return false;
}

/**
 * Handle document request
 */
async function handleDocumentRequest(session: VoiceBotSession, transcription: string): Promise<boolean> {
  const agentDocuments = (session.agent?.documents || []) as AgentDocument[];
  const documentRequest = await detectDocumentRequest(transcription, agentDocuments);

  if (!documentRequest.isDocumentRequest || documentRequest.matchedDocuments.length === 0) {
    return false;
  }

  console.log(`[VoiceBot] Document request detected: ${documentRequest.matchedDocuments.map(d => d.name).join(', ')}`);

  // Get phone number
  let phoneNumber = session.qualification.phone || '';
  if (!phoneNumber && session.dbCallId) {
    const call = await prisma.outboundCall.findUnique({ where: { id: session.dbCallId } });
    phoneNumber = call?.phoneNumber || '';
  }

  if (phoneNumber) {
    const sent = await sendDocumentsViaWhatsApp(
      phoneNumber,
      documentRequest.matchedDocuments,
      session.agent?.name || 'AI Assistant'
    );

    const confirmationMessage = sent
      ? documentRequest.confirmationMessage
      : "I'd like to send you the documents, but I need your WhatsApp number. Could you please confirm your number?";

    addToTranscript(session, 'assistant', confirmationMessage);
    await sendTTSResponse(session, confirmationMessage);

    if (sent) {
      session.qualification.documentsSent = documentRequest.matchedDocuments.map(d => d.name);
    }
  } else {
    const askPhoneMessage = "I can send you those documents on WhatsApp. Could you please share your WhatsApp number?";
    addToTranscript(session, 'assistant', askPhoneMessage);
    await sendTTSResponse(session, askPhoneMessage);
  }

  return true;
}

/**
 * Handle AI response generation
 */
async function handleAIResponse(session: VoiceBotSession, transcription: string) {
  const aiResponse = await generateAIResponse(
    session.agent,
    session.transcript,
    transcription,
    session.language,
    session.userMood,
    (newLanguage: string) => {
      session.language = newLanguage;
    }
  );

  if (aiResponse) {
    console.log(`[VoiceBot] AI responds: "${aiResponse}"`);
    addToTranscript(session, 'assistant', aiResponse);
    await sendTTSResponse(session, aiResponse);

    // Extract qualification data
    const extracted = await extractQualificationData(transcription, session.transcript, session.agent);
    if (Object.keys(extracted).length > 0) {
      updateQualification(session, extracted);
    }
  }
}

/**
 * Send TTS response back to Exotel via WebSocket
 */
async function sendTTSResponse(session: VoiceBotSession, text: string): Promise<void> {
  if (session.ws.readyState !== WebSocket.OPEN) {
    console.error('[VoiceBot] WebSocket not open');
    return;
  }

  session.interruptTTS = false;

  try {
    const audioBuffer = await generateTTS(
      text,
      session.language,
      session.agent?.voiceId
    );

    console.log(`[VoiceBot] Sending ${audioBuffer.length} bytes of audio`);

    session.isSpeaking = true;
    await sendAudioChunks(
      session.ws,
      session.streamSid || session.callId,
      audioBuffer,
      () => session.interruptTTS
    );
  } catch (error) {
    console.error('[VoiceBot] TTS error:', error);
  } finally {
    session.isSpeaking = false;
  }
}

// Re-export for external use
export { getSession, getActiveSessionsCount };

export default {
  handleExotelWebSocket,
  getSession,
  getActiveSessionsCount,
};
