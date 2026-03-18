import { Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/database';
import { Prisma } from '@prisma/client';
import { config } from '../config';
import {
  openaiRealtimeService,
  OpenAIRealtimeConnection,
} from '../integrations/openai-realtime.service';
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

interface ActiveSession extends RealtimeSession {
  socket: Socket;
  connection?: OpenAIRealtimeConnection;
}

class RealtimeVoiceService {
  private activeSessions: Map<string, ActiveSession> = new Map();
  private socketToSession: Map<string, string> = new Map();

  async startSession(
    socket: Socket,
    payload: RealtimeStartPayload,
    userId?: string,
    organizationId?: string
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
    };

    this.activeSessions.set(sessionId, session);
    this.socketToSession.set(socket.id, sessionId);

    // For realtime mode, establish OpenAI connection
    if (mode === 'REALTIME' || mode === 'WEBRTC') {
      try {
        await this.setupRealtimeConnection(session, agent);
        session.status = 'connected';
      } catch (error) {
        session.status = 'error';
        console.error('[RealtimeVoice] Failed to setup realtime connection:', error);
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
    }
  ): Promise<void> {
    const connection = openaiRealtimeService.createConnection(session.id, {
      apiKey: config.openai.apiKey!,
      voice: agent.voiceId || 'alloy',
      temperature: agent.temperature || 0.8,
      instructions: this.buildInstructions(agent),
    });

    session.connection = connection;

    // Set up event handlers
    this.setupConnectionEventHandlers(session, connection);

    // Connect to OpenAI
    await connection.connect();
  }

  private buildInstructions(agent: {
    systemPrompt: string;
    questions: unknown;
    knowledgeBase: string | null;
    greeting: string | null;
  }): string {
    let instructions = agent.systemPrompt;

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

    // Add conversation guidelines
    instructions += `\n\nGuidelines:
- Be natural and conversational
- Keep responses concise for voice
- Use the schedule_callback function if the user wants to speak with a human
- Use the end_conversation function when the conversation is complete`;

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

    // Speech detection events
    connection.on('speech.started', async (data) => {
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

  async handleAudio(socketId: string, audioBase64: string): Promise<void> {
    const session = this.getSessionBySocketId(socketId);
    if (!session || !session.connection) {
      return;
    }

    session.connection.appendAudio(audioBase64);
    session.lastActivityAt = new Date();
  }

  async handleInterrupt(socketId: string): Promise<void> {
    const session = this.getSessionBySocketId(socketId);
    if (!session || !session.connection) {
      return;
    }

    session.connection.cancelResponse();
    session.connection.clearAudioBuffer();
    session.interruptionCount++;
    session.status = 'listening';

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
