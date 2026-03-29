import { Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/database';
import { Prisma } from '@prisma/client';
import { config } from '../config';
import OpenAI from 'openai';
import {
  openaiRealtimeService,
  OpenAIRealtimeConnection,
} from '../integrations/openai-realtime.service';
import {
  ai4bharatService,
  AI4BHARAT_LANGUAGES,
  AI4BharatLanguageCode,
} from '../integrations/ai4bharat.service';
import { agentSecurityService, SecurityContext } from './agent-security.service';
import {
  RealtimeSession,
  RealtimeStatus,
  VoiceSessionMode,
  RealtimeStartPayload,
  RealtimeStartedPayload,
  RealtimeTranscriptionPayload,
  RealtimeAudioResponsePayload,
  RealtimeStatusPayload,
  RealtimeErrorPayload,
  RealtimeEndedPayload,
  TranscriptEntry,
  QualificationData,
} from '../types/realtime.types';

// OpenAI client for hybrid mode (GPT for AI responses)
const openai = new OpenAI({ apiKey: config.openai.apiKey });

// Indian languages that should use hybrid mode with AI4Bharat
const INDIAN_LANGUAGE_CODES = Object.keys(AI4BHARAT_LANGUAGES);

/**
 * Check if an agent should use hybrid mode (AI4Bharat STT/TTS + GPT)
 * Returns true if voice is AI4Bharat or language is Indian
 */
function shouldUseHybridMode(voiceId: string | null, language: string | null): boolean {
  // If AI4Bharat voice is selected
  if (voiceId?.startsWith('ai4bharat-')) {
    return true;
  }
  // If Indian language is selected
  if (language && INDIAN_LANGUAGE_CODES.includes(language)) {
    return true;
  }
  return false;
}

/**
 * Extract language code from AI4Bharat voice ID
 * e.g., 'ai4bharat-te-female' -> 'te-IN'
 */
function getLanguageFromVoiceId(voiceId: string): AI4BharatLanguageCode | null {
  const match = voiceId.match(/ai4bharat-(\w{2})-/);
  if (match) {
    const langCode = `${match[1]}-IN` as AI4BharatLanguageCode;
    if (INDIAN_LANGUAGE_CODES.includes(langCode)) {
      return langCode;
    }
  }
  return null;
}

/**
 * Extract gender from AI4Bharat voice ID
 * e.g., 'ai4bharat-te-female' -> 'female'
 */
function getGenderFromVoiceId(voiceId: string): 'male' | 'female' {
  return voiceId.includes('female') ? 'female' : 'male';
}

interface ActiveSession extends RealtimeSession {
  socket: Socket;
  connection?: OpenAIRealtimeConnection;
  // Hybrid mode properties
  isHybridMode?: boolean;
  hybridLanguage?: AI4BharatLanguageCode;
  hybridGender?: 'male' | 'female';
  hybridConversationHistory?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  hybridAudioBuffer?: Buffer[];
  hybridProcessing?: boolean;
}

// Valid OpenAI Realtime voices
const VALID_OPENAI_VOICES = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse', 'marin', 'cedar'] as const;
type OpenAIVoice = typeof VALID_OPENAI_VOICES[number];

// Voice mapping from frontend voice IDs to OpenAI Realtime voices
// Based on voiceAgent.constants.ts voice definitions
const VOICE_TO_OPENAI_MAP: Record<string, OpenAIVoice> = {
  // Direct OpenAI voices (from openai-* IDs)
  'nova': 'shimmer',      // nova not in Realtime, map to shimmer (similar warm female)
  'shimmer': 'shimmer',
  'alloy': 'alloy',
  'echo': 'echo',
  'onyx': 'echo',         // onyx not in Realtime, map to echo (similar deep male)
  'fable': 'sage',        // fable not in Realtime, map to sage
  'ash': 'ash',
  'ballad': 'ballad',
  'coral': 'coral',
  'sage': 'sage',
  'verse': 'verse',
  'marin': 'marin',
  'cedar': 'cedar',

  // Sarvam female voices -> shimmer (warm, friendly female)
  'priya': 'shimmer',
  'kavya': 'shimmer',
  'meera': 'shimmer',
  'aarti': 'shimmer',
  'pooja': 'shimmer',
  'neha': 'shimmer',
  'divya': 'shimmer',
  'anjali': 'shimmer',
  'deepa': 'shimmer',
  'lakshmi': 'shimmer',
  'sreeja': 'shimmer',
  'shweta': 'shimmer',
  'ritika': 'shimmer',
  'ishita': 'shimmer',
  'hetal': 'shimmer',
  'nisha': 'shimmer',
  'simran': 'shimmer',
  'manpreet': 'shimmer',
  'suchitra': 'shimmer',
  'junali': 'shimmer',
  'zara': 'shimmer',
  'lavanya': 'shimmer',

  // Sarvam male voices -> echo (warm, conversational male)
  'dev': 'echo',
  'ravi': 'echo',
  'amit': 'echo',
  'rohit': 'echo',
  'karthik': 'echo',
  'vijay': 'echo',
  'aditya': 'echo',
  'prasad': 'echo',
  'rahul': 'echo',
  'anand': 'echo',
  'sachin': 'echo',
  'ganesh': 'echo',
  'arjun': 'echo',
  'sourav': 'echo',
  'jayesh': 'echo',
  'hardik': 'echo',
  'gurpreet': 'echo',
  'harjot': 'echo',
  'biswajit': 'echo',
  'bhaskar': 'echo',
  'farhan': 'echo',
  'suresh': 'echo',
};

/**
 * Map any voice ID to a valid OpenAI Realtime voice.
 * Non-OpenAI voices (like Sarvam, ElevenLabs) are mapped to their closest OpenAI equivalent.
 *
 * Voice ID formats handled:
 * - sarvam-kavya, sarvam-priya (Sarvam AI voices)
 * - openai-nova, openai-echo (OpenAI TTS voices)
 * - elevenlabs-xxx (ElevenLabs voices)
 * - voice-sarvam-kavya (legacy format with voice- prefix)
 * - alloy, shimmer (raw OpenAI voice names)
 */
function mapToOpenAIVoice(voiceId: string | null | undefined): OpenAIVoice {
  if (!voiceId) return 'alloy';

  const normalizedVoice = voiceId.toLowerCase();

  // If it's already a valid OpenAI Realtime voice, use it directly
  if (VALID_OPENAI_VOICES.includes(normalizedVoice as OpenAIVoice)) {
    return normalizedVoice as OpenAIVoice;
  }

  // Extract the voice name from various formats:
  // voice-sarvam-kavya -> kavya
  // sarvam-kavya -> kavya
  // openai-nova -> nova
  // elevenlabs-xxx -> (handle separately)
  let voiceName = normalizedVoice;

  // Remove common prefixes
  voiceName = voiceName
    .replace(/^voice-/, '')
    .replace(/^sarvam-/, '')
    .replace(/^openai-/, '')
    .replace(/-intl$/, '');

  // Check if the extracted name maps to an OpenAI voice
  if (VOICE_TO_OPENAI_MAP[voiceName]) {
    return VOICE_TO_OPENAI_MAP[voiceName];
  }

  // Handle ElevenLabs voices - default to shimmer (professional female)
  if (normalizedVoice.includes('elevenlabs') || normalizedVoice.includes('eleven')) {
    // ElevenLabs female voices
    if (['rachel', 'bella', 'charlotte', 'dorothy'].some(name => normalizedVoice.includes(name))) {
      return 'shimmer';
    }
    // ElevenLabs male voices
    if (['adam', 'josh', 'daniel', 'charlie', 'james', 'thomas', 'matthew'].some(name => normalizedVoice.includes(name))) {
      return 'echo';
    }
    return 'shimmer'; // Default for ElevenLabs
  }

  // Detect gender from voice name for unmapped voices
  const femaleIndicators = ['female', 'woman', 'girl', 'she', 'her'];
  const maleIndicators = ['male', 'man', 'boy', 'he', 'him'];

  if (femaleIndicators.some(ind => normalizedVoice.includes(ind))) {
    return 'shimmer';
  }
  if (maleIndicators.some(ind => normalizedVoice.includes(ind))) {
    return 'echo';
  }

  // Default fallback
  console.log(`[RealtimeVoice] Mapping unknown voice "${voiceId}" to "alloy"`);
  return 'alloy';
}

class RealtimeVoiceService {
  private activeSessions: Map<string, ActiveSession> = new Map();
  private socketToSession: Map<string, string> = new Map();

  async startSession(
    socket: Socket,
    payload: RealtimeStartPayload,
    userId?: string,
    organizationId?: string,
    securityContext?: SecurityContext
  ): Promise<RealtimeStartedPayload> {
    const { agentId, mode = 'REALTIME', leadId, visitorInfo } = payload;

    // Validate agent exists and is configured for realtime
    const agent = await prisma.voiceAgent.findUnique({
      where: { id: agentId },
      include: { organization: true },
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    // ==================== PUBLISH STATUS CHECK ====================
    // Only allow published agents to handle live sessions
    if (agent.status !== 'PUBLISHED') {
      console.log(`[RealtimeVoice] Agent ${agentId} is not published (status: ${agent.status})`);
      throw new Error('This agent is not published yet. Please publish the agent to enable live conversations.');
    }
    // ==================== END PUBLISH STATUS CHECK ====================

    // ==================== SECURITY CHECKS ====================
    // Build security context from socket and provided context
    const fullSecurityContext: SecurityContext = {
      ipAddress: socket.handshake.address || securityContext?.ipAddress,
      domain: socket.handshake.headers.origin?.replace(/^https?:\/\//, '').split('/')[0] || securityContext?.domain,
      userId: userId,
      isAuthenticated: !!userId,
      ...securityContext,
    };

    // Perform security checks
    const securityResult = await agentSecurityService.checkSecurity(agent, fullSecurityContext);
    if (!securityResult.allowed) {
      console.log(`[RealtimeVoice] Security check failed for agent ${agentId}: ${securityResult.error}`);
      throw new Error(securityResult.error || 'Security check failed');
    }

    // Record request for rate limiting
    agentSecurityService.recordRequest(agentId, fullSecurityContext);
    console.log(`[RealtimeVoice] Security checks passed for agent ${agentId}`);
    // ==================== END SECURITY CHECKS ====================

    if (mode === 'REALTIME' && !agent.realtimeEnabled) {
      throw new Error('Realtime mode not enabled for this agent');
    }

    if (mode === 'WEBRTC' && !agent.webrtcEnabled) {
      throw new Error('WebRTC mode not enabled for this agent');
    }

    // Check if OpenAI API key is configured
    if (!config.openai.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const sessionId = uuidv4();
    const sessionToken = uuidv4();

    // Create database session
    const dbSession = await prisma.voiceSession.create({
      data: {
        id: sessionId,
        agentId,
        leadId,
        sessionToken,
        mode,
        visitorName: visitorInfo?.name,
        visitorEmail: visitorInfo?.email,
        visitorPhone: visitorInfo?.phone,
        status: 'ACTIVE',
      },
    });

    // Check if hybrid mode should be used (AI4Bharat STT/TTS + GPT)
    const useHybridMode = shouldUseHybridMode(agent.voiceId, agent.language) && ai4bharatService.isAvailable();

    // Determine hybrid mode settings
    let hybridLanguage: AI4BharatLanguageCode | undefined;
    let hybridGender: 'male' | 'female' = 'female';

    if (useHybridMode) {
      // PRIORITY: Use agent's configured language first, then fall back to voice ID extraction
      // Normalize short language codes (e.g., 'te' -> 'te-IN')
      let agentLang = agent.language;
      if (agentLang && agentLang.length === 2) {
        agentLang = `${agentLang}-IN`; // Convert short code to full Indian locale
      }

      // Use agent language if it's a valid Indian language, otherwise extract from voice ID
      if (agentLang && INDIAN_LANGUAGE_CODES.includes(agentLang)) {
        hybridLanguage = agentLang as AI4BharatLanguageCode;
      } else {
        hybridLanguage = getLanguageFromVoiceId(agent.voiceId) || undefined;
      }

      hybridGender = getGenderFromVoiceId(agent.voiceId);
      console.log(`[RealtimeVoice] Using HYBRID mode (AI4Bharat STT/TTS + GPT) for ${hybridLanguage} (${hybridGender}), agent.language: ${agent.language}`);
    }

    // Create the active session object
    const session: ActiveSession = {
      id: sessionId,
      socketId: socket.id,
      agentId,
      organizationId: organizationId || agent.organizationId,
      userId,
      leadId,
      mode,
      status: 'connecting',
      startedAt: new Date(),
      lastActivityAt: new Date(),
      transcripts: [],
      qualification: {},
      interruptionCount: 0,
      socket,
      // Hybrid mode properties
      isHybridMode: useHybridMode,
      hybridLanguage,
      hybridGender,
      hybridConversationHistory: useHybridMode ? [
        { role: 'system' as const, content: this.buildInstructions(agent) }
      ] : undefined,
      hybridAudioBuffer: useHybridMode ? [] : undefined,
      hybridProcessing: false,
    };

    this.activeSessions.set(sessionId, session);
    this.socketToSession.set(socket.id, sessionId);

    // Setup connection based on mode
    if (mode === 'REALTIME' || mode === 'WEBRTC') {
      try {
        if (useHybridMode) {
          // Hybrid mode: No OpenAI Realtime connection needed
          // Just mark as connected and send greeting
          session.status = 'connected';
          console.log(`[RealtimeVoice] Hybrid mode session ${sessionId} ready`);

          // Send greeting via AI4Bharat TTS if available
          if (agent.greeting && hybridLanguage) {
            setTimeout(async () => {
              await this.speakHybridResponse(session, agent.greeting!);
            }, 500);
          }
        } else {
          // Standard OpenAI Realtime mode
          await this.setupRealtimeConnection(session, agent);
          session.status = 'connected';
        }
      } catch (error) {
        session.status = 'error';
        console.error('[RealtimeVoice] Failed to setup connection:', error);
        throw error;
      }
    }

    // Emit status update
    this.emitStatus(socket, session.status);

    // Log event
    await this.logEvent(sessionId, 'session_started', { mode, agentId });

    return {
      sessionId,
      mode,
      greeting: agent.greeting || undefined,
    };
  }

  private async setupRealtimeConnection(
    session: ActiveSession,
    agent: {
      systemPrompt: string;
      voiceId: string;
      temperature: number;
      questions: unknown;
      knowledgeBase: string | null;
      greeting: string | null;
      maxDuration?: number;
      silenceTimeout?: number;
      interruptHandling?: string;
      appointmentEnabled?: boolean;
      personality?: string;
      language?: string;
    }
  ): Promise<void> {
    // Store agent settings in session for later use (appointment booking, etc.)
    (session as any).agentSettings = {
      maxDuration: agent.maxDuration || 1800,
      silenceTimeout: agent.silenceTimeout || 60,
      interruptHandling: agent.interruptHandling || 'polite',
      appointmentEnabled: agent.appointmentEnabled || false,
      personality: agent.personality || 'professional',
    };

    // Calculate silence duration - keep it short for fast response (800ms default)
    // Agent silenceTimeout is for inactivity (seconds), not speech detection (ms)
    const silenceDurationMs = 800; // Fast 800ms silence detection for responsive conversation

    // Map the agent's voice to a valid OpenAI voice
    const openAIVoice = mapToOpenAIVoice(agent.voiceId);
    console.log(`[RealtimeVoice] Using OpenAI voice "${openAIVoice}" (agent voiceId: "${agent.voiceId}")`);

    const connection = openaiRealtimeService.createConnection(session.id, {
      apiKey: config.openai.apiKey!,
      voice: openAIVoice,
      temperature: agent.temperature || 0.8,
      instructions: this.buildInstructions(agent),
      silenceDurationMs, // Pass to OpenAI config
    });

    session.connection = connection;

    // Set up event handlers
    this.setupConnectionEventHandlers(session, connection);

    // Connect to OpenAI
    await connection.connect();

    // After connection is established, send greeting to make the agent speak first
    if (agent.greeting) {
      // Wait a moment for the session to be fully configured
      setTimeout(() => {
        // Send the greeting as a system message to trigger the agent to speak
        connection.createResponse({
          instructions: `Start the conversation by saying: "${agent.greeting}"`,
        });
      }, 500);
    }
  }

  private buildInstructions(agent: {
    systemPrompt: string;
    questions: unknown;
    knowledgeBase: string | null;
    greeting: string | null;
    personality?: string;
    appointmentEnabled?: boolean;
    language?: string;
  }): string {
    let instructions = agent.systemPrompt;

    // Add language-specific instructions for better multilingual support
    if (agent.language && agent.language !== 'en-US' && agent.language !== 'en') {
      const languageNames: Record<string, string> = {
        'te-IN': 'Telugu',
        'hi-IN': 'Hindi',
        'ta-IN': 'Tamil',
        'kn-IN': 'Kannada',
        'ml-IN': 'Malayalam',
        'mr-IN': 'Marathi',
        'bn-IN': 'Bengali',
        'gu-IN': 'Gujarati',
        'pa-IN': 'Punjabi',
        'or-IN': 'Odia',
      };
      const langName = languageNames[agent.language] || agent.language;
      instructions = `IMPORTANT: The user prefers to communicate in ${langName}.
- When the user speaks in ${langName}, always respond in ${langName}
- The user's speech may be transcribed with some errors due to accent - try to understand the intent
- If the user switches to English, you can respond in English
- Be patient with pronunciation variations

${instructions}`;
    }

    // Add personality instruction
    if (agent.personality) {
      const personalityGuides: Record<string, string> = {
        professional: 'Maintain a professional and courteous tone throughout the conversation.',
        friendly: 'Be warm, friendly, and approachable in your responses.',
        casual: 'Keep the conversation casual and relaxed, like talking to a friend.',
      };
      if (personalityGuides[agent.personality]) {
        instructions += `\n\nTone: ${personalityGuides[agent.personality]}`;
      }
    }

    // Add qualification questions
    if (agent.questions && Array.isArray(agent.questions) && agent.questions.length > 0) {
      instructions += '\n\nDuring the conversation, collect the following information:';
      for (const q of agent.questions as { question: string; required: boolean }[]) {
        instructions += `\n- ${q.question} (${q.required ? 'required' : 'optional'})`;
      }
      instructions += '\n\nUse the collect_qualification_data function to record this information.';
    }

    // Add knowledge base
    if (agent.knowledgeBase) {
      instructions += `\n\nAdditional knowledge:\n${agent.knowledgeBase}`;
    }

    // Add appointment booking instructions if enabled
    if (agent.appointmentEnabled) {
      instructions += `\n\nAppointment Booking:
1. Collect details ONE BY ONE: name, phone, email, preferred time
2. After each detail, call collect_qualification_data to save it
3. After collecting ALL details, CONFIRM with user: "Let me confirm: Name is [X], Phone is [Y], Email is [Z], Appointment at [time]. Is this correct?"
4. Wait for user to say "yes" or "correct" before calling schedule_callback
5. NEVER book without user confirmation
6. If user wants to change something, update it and confirm again`;
    }

    // Add conversation guidelines
    instructions += `\n\nGuidelines:
- Be natural and conversational
- Keep responses concise for voice
- Use the schedule_callback function if the user wants to speak with a human or book an appointment
- Use the end_conversation function when the conversation is complete
- IMPORTANT: When collecting email, phone numbers, or names that need to be spelled out:
  - Ask the user to spell it out if unclear
  - Listen carefully to each letter without interrupting
  - Repeat back what you heard to confirm (e.g., "Let me confirm: J-O-H-N at gmail dot com")
  - If the user is spelling something, wait patiently for them to finish all letters`;

    return instructions;
  }

  private setupConnectionEventHandlers(
    session: ActiveSession,
    connection: OpenAIRealtimeConnection
  ): void {
    const { socket } = session;

    // Session events
    connection.on('session.created', async (data) => {
      session.openaiSessionId = data.id;
      await prisma.voiceSession.update({
        where: { id: session.id },
        data: { realtimeSessionId: data.id },
      });
    });

    // Speech detection events - handle interruption
    connection.on('speech.started', async (data) => {
      console.log(`[RealtimeVoice] Speech started detected, current status: ${session.status}`);

      // If assistant was speaking, cancel the response (interruption)
      if (session.status === 'speaking') {
        console.log(`[RealtimeVoice] User interrupted assistant - canceling response and clearing buffer`);
        connection.cancelResponse();
        connection.clearAudioBuffer();
        session.interruptionCount++;
        socket.emit('realtime:interrupted', {
          interruptionCount: session.interruptionCount
        });
        // Notify frontend to stop audio playback
        socket.emit('realtime:stop_audio');
      }
      session.status = 'listening';
      this.emitStatus(socket, 'listening');
      await this.logEvent(session.id, 'speech_started', data);
    });

    connection.on('speech.stopped', async (data) => {
      session.status = 'thinking';
      this.emitStatus(socket, 'thinking');
      await this.logEvent(session.id, 'speech_stopped', data);
    });

    // Transcription events
    connection.on('transcription.user', async (data) => {
      console.log(`[RealtimeVoice] User transcription: "${data.transcript}" (final: ${data.isFinal})`);
      const transcription: RealtimeTranscriptionPayload = {
        role: 'user',
        text: data.transcript,
        isFinal: data.isFinal,
        itemId: data.itemId,
      };
      socket.emit('realtime:transcription', transcription);

      if (data.isFinal) {
        session.transcripts.push({
          id: uuidv4(),
          role: 'user',
          content: data.transcript,
          timestamp: new Date(),
          isFinal: true,
        });

        // Save to database
        await prisma.voiceTranscript.create({
          data: {
            sessionId: session.id,
            role: 'user',
            content: data.transcript,
          },
        });
      }

      session.lastActivityAt = new Date();
    });

    connection.on('transcription.assistant', async (data) => {
      const transcription: RealtimeTranscriptionPayload = {
        role: 'assistant',
        text: data.transcript,
        isFinal: data.isFinal,
        itemId: data.itemId,
      };
      socket.emit('realtime:transcription', transcription);

      if (data.isFinal) {
        session.transcripts.push({
          id: uuidv4(),
          role: 'assistant',
          content: data.transcript,
          timestamp: new Date(),
          isFinal: true,
        });

        // Save to database
        await prisma.voiceTranscript.create({
          data: {
            sessionId: session.id,
            role: 'assistant',
            content: data.transcript,
          },
        });
      }
    });

    // Audio events
    connection.on('response.created', () => {
      session.status = 'speaking';
      this.emitStatus(socket, 'speaking');
    });

    connection.on('audio.delta', (data) => {
      const audioResponse: RealtimeAudioResponsePayload = {
        audio: data.audio,
        format: 'pcm16',
      };
      socket.emit('realtime:audio', audioResponse);
    });

    connection.on('audio.done', () => {
      session.status = 'listening';
      this.emitStatus(socket, 'listening');
    });

    connection.on('response.done', async (data) => {
      await this.logEvent(session.id, 'response_done', { usage: data.usage });
    });

    // Function call events
    connection.on('function.call', async (data) => {
      const result = await openaiRealtimeService.processFunctionCall(
        data.callId,
        data.name,
        data.arguments,
        { sessionId: session.id, organizationId: session.organizationId }
      );

      // Handle specific function results
      if (data.name === 'collect_qualification_data' && result.success) {
        const qualData = JSON.parse(data.arguments) as QualificationData;
        session.qualification = { ...session.qualification, ...qualData };

        // Update database
        await prisma.voiceSession.update({
          where: { id: session.id },
          data: {
            qualification: session.qualification as Prisma.InputJsonValue,
          },
        });
      }

      if (data.name === 'end_conversation' && result.success) {
        // Mark for ending after response completes
        setTimeout(() => this.endSession(session.id, 'user'), 2000);
      }

      // Submit result back to OpenAI
      connection.submitFunctionResult(data.callId, result.result);

      await this.logEvent(session.id, 'function_call', {
        name: data.name,
        success: result.success,
      });
    });

    // Error handling
    connection.on('error', (error) => {
      console.error('[RealtimeVoice] OpenAI error:', error);
      const errorPayload: RealtimeErrorPayload = {
        code: error.code,
        message: error.message,
        recoverable: error.code !== 'authentication_error',
      };
      socket.emit('realtime:error', errorPayload);
    });

    connection.on('disconnected', async (reason) => {
      console.log('[RealtimeVoice] OpenAI disconnected:', reason);
      await this.endSession(session.id, 'error');
    });
  }

  private audioPacketCount: Map<string, number> = new Map();
  private hybridSilenceTimeout: Map<string, NodeJS.Timeout> = new Map();

  async handleAudio(socketId: string, audioBase64: string): Promise<void> {
    const session = this.getSessionBySocketId(socketId);
    if (!session) {
      return;
    }

    // Debug logging (log every 50 packets to avoid spam)
    const count = (this.audioPacketCount.get(socketId) || 0) + 1;
    this.audioPacketCount.set(socketId, count);
    if (count === 1 || count % 50 === 0) {
      console.log(`[RealtimeVoice] Received audio packet #${count} from ${socketId}, size: ${audioBase64.length}`);
    }

    session.lastActivityAt = new Date();

    // Route to appropriate handler based on mode
    if (session.isHybridMode) {
      await this.handleHybridAudio(session, audioBase64);
    } else if (session.connection) {
      session.connection.appendAudio(audioBase64);
    }
  }

  /**
   * Handle audio in hybrid mode (AI4Bharat STT + GPT + AI4Bharat TTS)
   */
  private async handleHybridAudio(session: ActiveSession, audioBase64: string): Promise<void> {
    // Buffer the audio
    if (!session.hybridAudioBuffer) {
      session.hybridAudioBuffer = [];
    }

    const audioBuffer = Buffer.from(audioBase64, 'base64');
    session.hybridAudioBuffer.push(audioBuffer);

    // Clear existing silence timeout
    const existingTimeout = this.hybridSilenceTimeout.get(session.id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set silence detection timeout (800ms of silence = end of speech)
    const silenceTimeout = setTimeout(async () => {
      if (session.hybridProcessing) {
        return; // Already processing
      }

      // Check if we have enough audio to process (at least 0.5 seconds worth)
      const totalBytes = session.hybridAudioBuffer?.reduce((sum, buf) => sum + buf.length, 0) || 0;
      if (totalBytes < 8000) { // Less than 0.5s at 16kHz 16-bit
        session.hybridAudioBuffer = [];
        return;
      }

      await this.processHybridSpeech(session);
    }, 800);

    this.hybridSilenceTimeout.set(session.id, silenceTimeout);

    // Update status to listening
    if (session.status !== 'listening') {
      session.status = 'listening';
      this.emitStatus(session.socket, 'listening');
    }
  }

  /**
   * Process accumulated speech in hybrid mode
   */
  private async processHybridSpeech(session: ActiveSession): Promise<void> {
    if (!session.hybridAudioBuffer || session.hybridAudioBuffer.length === 0) {
      return;
    }

    session.hybridProcessing = true;
    session.status = 'thinking';
    this.emitStatus(session.socket, 'thinking');

    try {
      // Combine audio buffers
      const combinedAudio = Buffer.concat(session.hybridAudioBuffer);
      session.hybridAudioBuffer = []; // Clear buffer

      // Convert PCM16 to WAV for AI4Bharat
      const wavBuffer = this.pcmToWav(combinedAudio, 24000);

      console.log(`[RealtimeVoice] Hybrid: Processing ${wavBuffer.length} bytes of audio`);

      // 1. STT: Transcribe using AI4Bharat IndicWhisper
      const transcription = await ai4bharatService.transcribe(
        wavBuffer,
        session.hybridLanguage!,
        16000
      );

      const userText = transcription.text.trim();
      if (!userText) {
        console.log('[RealtimeVoice] Hybrid: Empty transcription, skipping');
        session.hybridProcessing = false;
        session.status = 'connected';
        this.emitStatus(session.socket, 'connected');
        return;
      }

      console.log(`[RealtimeVoice] Hybrid STT: "${userText}"`);

      // Content filtering check
      const agent = await prisma.voiceAgent.findUnique({ where: { id: session.agentId } });
      if (agent) {
        const contentCheck = await agentSecurityService.checkContent(agent, userText);
        if (!contentCheck.allowed) {
          console.log(`[RealtimeVoice] Content filtered: ${contentCheck.error}`);
          session.socket.emit('realtime:transcription', {
            role: 'assistant',
            text: 'I apologize, but I cannot process that request. Please rephrase your question.',
            isFinal: true,
            itemId: `system-${Date.now()}`,
          } as RealtimeTranscriptionPayload);
          session.hybridProcessing = false;
          session.status = 'connected';
          this.emitStatus(session.socket, 'connected');
          return;
        }
      }

      // Emit user transcription to frontend
      session.socket.emit('realtime:transcription', {
        role: 'user',
        text: userText,
        isFinal: true,
        itemId: `user-${Date.now()}`,
      } as RealtimeTranscriptionPayload);

      // Save transcript
      await this.saveTranscript(session.id, 'user', userText);
      session.transcripts.push({ role: 'user', content: userText, timestamp: new Date(), id: `user-${Date.now()}`, isFinal: true });

      // Add to conversation history
      session.hybridConversationHistory?.push({ role: 'user', content: userText });

      // 2. AI: Get response from GPT
      const aiResponse = await this.getHybridAIResponse(session);
      console.log(`[RealtimeVoice] Hybrid GPT: "${aiResponse.substring(0, 100)}..."`);

      // Emit assistant transcription
      session.socket.emit('realtime:transcription', {
        role: 'assistant',
        text: aiResponse,
        isFinal: true,
        itemId: `assistant-${Date.now()}`,
      } as RealtimeTranscriptionPayload);

      // Save transcript
      await this.saveTranscript(session.id, 'assistant', aiResponse);
      session.transcripts.push({ role: 'assistant', content: aiResponse, timestamp: new Date(), id: `assistant-${Date.now()}`, isFinal: true });

      // Add to conversation history
      session.hybridConversationHistory?.push({ role: 'assistant', content: aiResponse });

      // 3. TTS: Speak response using AI4Bharat
      await this.speakHybridResponse(session, aiResponse);

    } catch (error: any) {
      console.error('[RealtimeVoice] Hybrid processing error:', error.message);
      session.socket.emit('realtime:error', {
        message: error.message,
        code: 'HYBRID_PROCESSING_ERROR',
      });
    } finally {
      session.hybridProcessing = false;
      session.status = 'connected';
      this.emitStatus(session.socket, 'connected');
    }
  }

  /**
   * Get AI response using GPT for hybrid mode
   */
  private async getHybridAIResponse(session: ActiveSession): Promise<string> {
    const messages = session.hybridConversationHistory || [];

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages as any,
      max_tokens: 300,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
  }

  /**
   * Speak text using AI4Bharat TTS in hybrid mode
   */
  private async speakHybridResponse(session: ActiveSession, text: string): Promise<void> {
    if (!session.hybridLanguage) {
      console.error('[RealtimeVoice] Hybrid: No language set for TTS');
      return;
    }

    session.status = 'speaking';
    this.emitStatus(session.socket, 'speaking');

    try {
      // Generate audio using AI4Bharat TTS
      const ttsResult = await ai4bharatService.synthesize(
        text,
        session.hybridLanguage,
        session.hybridGender || 'female',
        24000 // 24kHz for better quality
      );

      console.log(`[RealtimeVoice] Hybrid TTS: Generated ${ttsResult.audio.length} bytes`);

      // Convert WAV to PCM16 for streaming
      let pcmData = ttsResult.audio;
      if (ttsResult.format === 'wav') {
        // Skip WAV header (44 bytes)
        pcmData = ttsResult.audio.slice(44);
      }

      // Stream audio in chunks to frontend
      const chunkSize = 4096; // 4KB chunks
      for (let i = 0; i < pcmData.length; i += chunkSize) {
        const chunk = pcmData.slice(i, i + chunkSize);
        const audioResponse: RealtimeAudioResponsePayload = {
          audio: chunk.toString('base64'),
          format: 'pcm16',
          sampleRate: 24000,
        };
        session.socket.emit('realtime:audio', audioResponse);

        // Small delay between chunks to prevent buffer overflow
        await new Promise(resolve => setTimeout(resolve, 10));
      }

    } catch (error: any) {
      console.error('[RealtimeVoice] Hybrid TTS error:', error.message);
    }
  }

  /**
   * Convert PCM16 to WAV format
   */
  private pcmToWav(pcmData: Buffer, sampleRate: number): Buffer {
    const wavHeader = Buffer.alloc(44);
    const fileSize = pcmData.length + 36;

    wavHeader.write('RIFF', 0);
    wavHeader.writeUInt32LE(fileSize, 4);
    wavHeader.write('WAVE', 8);
    wavHeader.write('fmt ', 12);
    wavHeader.writeUInt32LE(16, 16); // fmt chunk size
    wavHeader.writeUInt16LE(1, 20); // audio format (PCM)
    wavHeader.writeUInt16LE(1, 22); // num channels
    wavHeader.writeUInt32LE(sampleRate, 24); // sample rate
    wavHeader.writeUInt32LE(sampleRate * 2, 28); // byte rate
    wavHeader.writeUInt16LE(2, 32); // block align
    wavHeader.writeUInt16LE(16, 34); // bits per sample
    wavHeader.write('data', 36);
    wavHeader.writeUInt32LE(pcmData.length, 40);

    return Buffer.concat([wavHeader, pcmData]);
  }

  /**
   * Save transcript to database
   */
  private async saveTranscript(sessionId: string, role: 'user' | 'assistant', content: string): Promise<void> {
    await prisma.voiceTranscript.create({
      data: {
        id: uuidv4(),
        sessionId,
        role,
        content,
        timestamp: new Date(),
      },
    });
  }

  async handleInterrupt(socketId: string): Promise<void> {
    const session = this.getSessionBySocketId(socketId);
    if (!session) {
      return;
    }

    console.log(`[RealtimeVoice] Handling interrupt for session ${session.id}, current status: ${session.status}`);

    if (session.isHybridMode) {
      // Hybrid mode: Clear audio buffer and stop processing
      session.hybridAudioBuffer = [];
      session.hybridProcessing = false;

      // Clear silence timeout
      const timeout = this.hybridSilenceTimeout.get(session.id);
      if (timeout) {
        clearTimeout(timeout);
        this.hybridSilenceTimeout.delete(session.id);
      }
    } else if (session.connection) {
      // OpenAI Realtime mode
      session.connection.cancelResponse();
      session.connection.clearAudioBuffer();
    }

    session.interruptionCount++;
    session.status = 'listening';

    // Emit signals to stop audio playback on frontend
    session.socket.emit('realtime:interrupted', {
      interruptionCount: session.interruptionCount
    });
    session.socket.emit('realtime:stop_audio');

    // Update status
    this.emitStatus(session.socket, 'listening');

    await prisma.voiceSession.update({
      where: { id: session.id },
      data: { interruptionCount: session.interruptionCount },
    });

    await this.logEvent(session.id, 'interruption', {
      count: session.interruptionCount,
    });
  }

  async endSession(
    sessionIdOrSocketId: string,
    reason: 'user' | 'timeout' | 'error' | 'transfer' = 'user'
  ): Promise<RealtimeEndedPayload | null> {
    let session = this.activeSessions.get(sessionIdOrSocketId);

    // Try to find by socket ID
    if (!session) {
      const sessionId = this.socketToSession.get(sessionIdOrSocketId);
      if (sessionId) {
        session = this.activeSessions.get(sessionId);
      }
    }

    if (!session) {
      return null;
    }

    // Close OpenAI connection
    if (session.connection) {
      session.connection.disconnect();
    }

    // Calculate duration
    const duration = Math.floor(
      (Date.now() - session.startedAt.getTime()) / 1000
    );

    // Generate summary and analyze sentiment
    const { summary, sentiment } = await this.generateSummaryAndSentiment(
      session.transcripts
    );

    // Determine final status
    let status: 'COMPLETED' | 'TRANSFERRED' | 'ABANDONED' | 'ERROR' = 'COMPLETED';
    if (reason === 'error') status = 'ERROR';
    if (reason === 'transfer') status = 'TRANSFERRED';
    if (reason === 'timeout') status = 'ABANDONED';

    // Update database
    const dbSession = await prisma.voiceSession.update({
      where: { id: session.id },
      data: {
        status,
        duration,
        summary,
        sentiment,
        endedAt: new Date(),
      },
    });

    // Create lead if we have qualification data
    let leadId = session.leadId;
    if (!leadId && Object.keys(session.qualification).length > 0) {
      try {
        const lead = await this.createLeadFromSession(session);
        leadId = lead?.id;
      } catch (error) {
        console.error('[RealtimeVoice] Failed to create lead:', error);
      }
    }

    // Log event
    await this.logEvent(session.id, 'session_ended', {
      reason,
      duration,
      status,
    });

    // Prepare result
    const result: RealtimeEndedPayload = {
      sessionId: session.id,
      duration,
      summary,
      qualification: session.qualification,
      sentiment,
      leadId,
    };

    // Emit to client
    session.socket.emit('realtime:ended', result);

    // Clean up
    this.activeSessions.delete(session.id);
    this.socketToSession.delete(session.socketId);

    return result;
  }

  handleDisconnect(socketId: string): void {
    const sessionId = this.socketToSession.get(socketId);
    if (sessionId) {
      this.endSession(sessionId, 'error');
    }
  }

  private async generateSummaryAndSentiment(
    transcripts: TranscriptEntry[]
  ): Promise<{ summary: string; sentiment: string }> {
    if (transcripts.length === 0) {
      return { summary: '', sentiment: 'neutral' };
    }

    // For now, create a simple summary
    // In production, this would use GPT-4
    const userMessages = transcripts
      .filter((t) => t.role === 'user')
      .map((t) => t.content)
      .join(' ');

    const summary = transcripts
      .slice(-3)
      .map((t) => `${t.role}: ${t.content.substring(0, 100)}`)
      .join('; ');

    // Simple sentiment analysis
    const positiveWords = ['great', 'good', 'yes', 'interested', 'love', 'perfect'];
    const negativeWords = ['no', 'not', 'bad', 'hate', 'wrong', 'cancel'];

    const lowerMessages = userMessages.toLowerCase();
    const positiveCount = positiveWords.filter((w) =>
      lowerMessages.includes(w)
    ).length;
    const negativeCount = negativeWords.filter((w) =>
      lowerMessages.includes(w)
    ).length;

    let sentiment = 'neutral';
    if (positiveCount > negativeCount) sentiment = 'positive';
    if (negativeCount > positiveCount) sentiment = 'negative';

    return { summary, sentiment };
  }

  private async createLeadFromSession(
    session: ActiveSession
  ): Promise<{ id: string } | null> {
    const agent = await prisma.voiceAgent.findUnique({
      where: { id: session.agentId },
    });

    if (!agent) return null;

    const qual = session.qualification as QualificationData;

    const lead = await prisma.lead.create({
      data: {
        organizationId: agent.organizationId,
        firstName: qual.name || 'Voice Lead',
        phone: qual.phone || 'unknown',
        email: qual.email,
        source: 'CHATBOT',
        sourceDetails: `Voice AI (Realtime) - ${agent.name}`,
        customFields: session.qualification as Prisma.InputJsonValue,
      },
    });

    // Link session to lead
    await prisma.voiceSession.update({
      where: { id: session.id },
      data: { leadId: lead.id },
    });

    return lead;
  }

  private async logEvent(
    sessionId: string,
    eventType: string,
    eventData?: Record<string, unknown>
  ): Promise<void> {
    try {
      await prisma.realtimeEvent.create({
        data: {
          sessionId,
          eventType,
          eventData: (eventData || {}) as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      console.error('[RealtimeVoice] Failed to log event:', error);
    }
  }

  private emitStatus(socket: Socket, status: RealtimeStatus): void {
    const payload: RealtimeStatusPayload = { status };
    socket.emit('realtime:status', payload);
  }

  private getSessionBySocketId(socketId: string): ActiveSession | undefined {
    const sessionId = this.socketToSession.get(socketId);
    return sessionId ? this.activeSessions.get(sessionId) : undefined;
  }

  getSession(sessionId: string): ActiveSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  getActiveSessionCount(): number {
    return this.activeSessions.size;
  }

  getActiveSessionsForOrg(organizationId: string): ActiveSession[] {
    return Array.from(this.activeSessions.values()).filter(
      (s) => s.organizationId === organizationId
    );
  }
}

export const realtimeVoiceService = new RealtimeVoiceService();
