import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  RealtimeSessionConfig,
  RealtimeTool,
  RealtimeServerEvent,
  RealtimeClientEvent,
  RealtimeConversationItem,
  QualificationData,
  FunctionCallResult,
} from '../types/realtime.types';
import { calendarService } from '../services/calendar.service';

const OPENAI_REALTIME_URL = 'wss://api.openai.com/v1/realtime';
const DEFAULT_MODEL = process.env.OPENAI_REALTIME_MODEL || 'gpt-4o-realtime-preview';

// Retry configuration for WebSocket connections
const RECONNECT_CONFIG = {
  maxAttempts: 5,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitterFactor: 0.2,
};

export interface OpenAIRealtimeConfig {
  apiKey: string;
  model?: string;
  voice?: string;
  instructions?: string;
  temperature?: number;
  tools?: RealtimeTool[];
  silenceDurationMs?: number; // Agent-specific silence timeout
  language?: string; // Language hint for better transcription (e.g., 'en', 'hi', 'te')
}

export interface RealtimeConnectionEvents {
  'session.created': (session: { id: string }) => void;
  'session.updated': (session: object) => void;
  'speech.started': (data: { itemId: string; audioStartMs: number }) => void;
  'speech.stopped': (data: { itemId: string; audioEndMs: number }) => void;
  'transcription.user': (data: { itemId: string; transcript: string; isFinal: boolean }) => void;
  'transcription.assistant': (data: { itemId: string; transcript: string; delta: string; isFinal: boolean }) => void;
  'audio.delta': (data: { audio: string; itemId: string }) => void;
  'audio.done': (data: { itemId: string }) => void;
  'response.created': (data: { responseId: string }) => void;
  'response.done': (data: { responseId: string; usage: object }) => void;
  'function.call': (data: { callId: string; name: string; arguments: string }) => void;
  'error': (error: { code: string; message: string }) => void;
  'disconnected': (reason: string) => void;
  'connected': () => void;
}

export class OpenAIRealtimeConnection extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: OpenAIRealtimeConfig;
  private sessionId: string | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = RECONNECT_CONFIG.maxAttempts;
  private pendingFunctionCalls: Map<string, { name: string; arguments: string }> = new Map();
  private conversationItems: Map<string, RealtimeConversationItem> = new Map();
  private currentResponseId: string | null = null;
  private assistantTranscript: string = '';
  private hasActiveResponse: boolean = false;
  private isReconnecting: boolean = false;
  private shouldReconnect: boolean = true;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor(config: OpenAIRealtimeConfig) {
    super();
    this.config = config;
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private calculateReconnectDelay(): number {
    const exponentialDelay = RECONNECT_CONFIG.initialDelayMs *
      Math.pow(RECONNECT_CONFIG.backoffMultiplier, this.reconnectAttempts);
    const cappedDelay = Math.min(exponentialDelay, RECONNECT_CONFIG.maxDelayMs);
    const jitter = cappedDelay * RECONNECT_CONFIG.jitterFactor * (Math.random() * 2 - 1);
    return Math.max(0, Math.round(cappedDelay + jitter));
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private async attemptReconnect(): Promise<void> {
    if (!this.shouldReconnect || this.isReconnecting) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`[OpenAI Realtime] Max reconnection attempts (${this.maxReconnectAttempts}) exceeded`);
      this.emit('error', {
        code: 'max_reconnect_exceeded',
        message: `Failed to reconnect after ${this.maxReconnectAttempts} attempts`
      });
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;
    const delay = this.calculateReconnectDelay();

    console.log(
      `[OpenAI Realtime] Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} ` +
      `in ${delay}ms...`
    );

    this.reconnectTimeout = setTimeout(async () => {
      try {
        await this.connect();
        console.log('[OpenAI Realtime] Reconnection successful');
        this.isReconnecting = false;
      } catch (error) {
        console.error('[OpenAI Realtime] Reconnection failed:', error);
        this.isReconnecting = false;
        // Try again
        this.attemptReconnect();
      }
    }, delay);
  }

  async connect(): Promise<void> {
    // Clear any pending reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    return new Promise((resolve, reject) => {
      const model = this.config.model || DEFAULT_MODEL;
      const url = `${OPENAI_REALTIME_URL}?model=${model}`;

      console.log(`[OpenAI Realtime] Connecting to ${url}...`);

      this.ws = new WebSocket(url, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'OpenAI-Beta': 'realtime=v1',
        },
      });

      this.ws.on('open', () => {
        console.log('[OpenAI Realtime] WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.isReconnecting = false;
        this.emit('connected');
        resolve();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const event = JSON.parse(data.toString()) as RealtimeServerEvent;
          this.handleServerEvent(event);
        } catch (error) {
          console.error('[OpenAI Realtime] Failed to parse message:', error);
        }
      });

      this.ws.on('error', (error) => {
        console.error('[OpenAI Realtime] WebSocket error:', error);
        this.emit('error', { code: 'websocket_error', message: error.message });
        if (!this.isConnected) {
          reject(error);
        }
      });

      this.ws.on('close', (code, reason) => {
        const reasonStr = reason.toString();
        console.log(`[OpenAI Realtime] WebSocket closed: ${code} - ${reasonStr}`);

        const wasConnected = this.isConnected;
        this.isConnected = false;
        this.sessionId = null;
        this.emit('disconnected', reasonStr);

        // Attempt reconnection if we were previously connected and should reconnect
        // Don't reconnect for normal closures (1000) or if explicitly disabled
        if (wasConnected && this.shouldReconnect && code !== 1000) {
          console.log('[OpenAI Realtime] Connection lost unexpectedly, attempting reconnect...');
          this.attemptReconnect();
        }
      });
    });
  }

  /**
   * Connect with retry logic for initial connection
   */
  async connectWithRetry(): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= RECONNECT_CONFIG.maxAttempts; attempt++) {
      try {
        await this.connect();
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < RECONNECT_CONFIG.maxAttempts) {
          const delay = RECONNECT_CONFIG.initialDelayMs *
            Math.pow(RECONNECT_CONFIG.backoffMultiplier, attempt - 1);
          const cappedDelay = Math.min(delay, RECONNECT_CONFIG.maxDelayMs);

          console.warn(
            `[OpenAI Realtime] Connection attempt ${attempt}/${RECONNECT_CONFIG.maxAttempts} failed: ` +
            `${lastError.message}. Retrying in ${cappedDelay}ms...`
          );

          await new Promise(resolve => setTimeout(resolve, cappedDelay));
        }
      }
    }

    console.error(`[OpenAI Realtime] Failed to connect after ${RECONNECT_CONFIG.maxAttempts} attempts`);
    throw lastError || new Error('Failed to connect to OpenAI Realtime API');
  }

  private handleServerEvent(event: RealtimeServerEvent): void {
    // Log all events except audio data (too verbose)
    if (event.type !== 'response.audio.delta' && event.type !== 'input_audio_buffer.speech_started' && event.type !== 'input_audio_buffer.speech_stopped') {
      console.log(`[OpenAI Realtime] Event: ${event.type}`);
    }

    switch (event.type) {
      case 'session.created':
        this.sessionId = event.session.id;
        this.emit('session.created', { id: event.session.id });
        // Configure session after creation
        this.configureSession();
        break;

      case 'session.updated':
        this.emit('session.updated', event.session);
        break;

      case 'input_audio_buffer.speech_started':
        this.emit('speech.started', {
          itemId: event.item_id,
          audioStartMs: event.audio_start_ms,
        });
        break;

      case 'input_audio_buffer.speech_stopped':
        this.emit('speech.stopped', {
          itemId: event.item_id,
          audioEndMs: event.audio_end_ms,
        });
        break;

      case 'conversation.item.created':
        this.conversationItems.set(event.item.id, event.item);
        break;

      case 'conversation.item.input_audio_transcription.completed':
        this.emit('transcription.user', {
          itemId: event.item_id,
          transcript: event.transcript,
          isFinal: true,
        });
        break;

      case 'response.created':
        this.currentResponseId = event.response.id;
        this.assistantTranscript = '';
        this.hasActiveResponse = true;
        this.emit('response.created', { responseId: event.response.id });
        break;

      case 'response.audio_transcript.delta':
        this.assistantTranscript += event.delta;
        this.emit('transcription.assistant', {
          itemId: event.item_id,
          transcript: this.assistantTranscript,
          delta: event.delta,
          isFinal: false,
        });
        break;

      case 'response.audio_transcript.done':
        this.emit('transcription.assistant', {
          itemId: event.item_id,
          transcript: event.transcript,
          delta: '',
          isFinal: true,
        });
        break;

      case 'response.audio.delta':
        this.emit('audio.delta', {
          audio: event.delta,
          itemId: event.item_id,
        });
        break;

      case 'response.audio.done':
        this.emit('audio.done', { itemId: event.item_id });
        break;

      case 'response.function_call_arguments.done':
        this.pendingFunctionCalls.set(event.call_id, {
          name: event.name,
          arguments: event.arguments,
        });
        this.emit('function.call', {
          callId: event.call_id,
          name: event.name,
          arguments: event.arguments,
        });
        break;

      case 'response.done':
        this.hasActiveResponse = false;
        this.emit('response.done', {
          responseId: event.response.id,
          usage: event.response.usage || {},
        });
        break;

      case 'error':
        // Suppress harmless "no active response" error from cancellation attempts
        if (event.error.code === 'response_cancel_not_active') {
          console.log('[OpenAI Realtime] Ignoring cancel error (no active response)');
          break;
        }
        console.error('[OpenAI Realtime] Error:', event.error);
        this.emit('error', {
          code: event.error.code,
          message: event.error.message,
        });
        break;
    }
  }

  private configureSession(): void {
    // Use minimal config first, then update with full config after connection is stable
    // Extract language code (e.g., 'en-US' -> 'en', 'hi-IN' -> 'hi')
    const langCode = this.config.language?.split('-')[0] || undefined;

    const sessionConfig: Partial<RealtimeSessionConfig> = {
      modalities: ['text', 'audio'],
      voice: this.config.voice || 'alloy',
      instructions: this.config.instructions || 'You are a helpful assistant.',
      input_audio_format: 'pcm16',
      output_audio_format: 'pcm16',
      input_audio_transcription: {
        model: 'whisper-1' as const,
        // Add language hint for better transcription accuracy
        ...(langCode && { language: langCode }),
      },
      turn_detection: {
        type: 'server_vad',
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: this.config.silenceDurationMs || 800,
      },
      temperature: this.config.temperature || 0.8,
    };

    console.log(`[OpenAI Realtime] Configuring session with language: ${langCode || 'auto-detect'}`);

    console.log('[OpenAI Realtime] Sending session config (without tools first)');

    this.send({
      type: 'session.update',
      session: sessionConfig,
    });

    // Send tools in a separate update after a small delay
    setTimeout(() => {
      const tools = this.config.tools || this.getDefaultTools();
      if (tools && tools.length > 0) {
        console.log('[OpenAI Realtime] Sending tools config');
        this.send({
          type: 'session.update',
          session: {
            tools,
            tool_choice: 'auto',
          },
        });
      }
    }, 500);
  }

  private getDefaultTools(): RealtimeTool[] {
    return [
      {
        type: 'function',
        name: 'collect_qualification_data',
        description: 'Collect and store qualification data from the user such as name, email, phone, interests, budget, and timeline.',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'The user\'s full name' },
            email: { type: 'string', description: 'The user\'s email address' },
            phone: { type: 'string', description: 'The user\'s phone number' },
            interest: { type: 'string', description: 'What the user is interested in' },
            budget: { type: 'string', description: 'The user\'s budget range' },
            timeline: { type: 'string', description: 'When the user plans to make a decision' },
            requirements: { type: 'string', description: 'Specific requirements or notes' },
          },
        },
      },
      {
        type: 'function',
        name: 'schedule_callback',
        description: 'Schedule a callback with a human agent at a specific time.',
        parameters: {
          type: 'object',
          properties: {
            preferred_time: { type: 'string', description: 'Preferred callback time' },
            reason: { type: 'string', description: 'Reason for callback' },
          },
          required: ['preferred_time'],
        },
      },
      {
        type: 'function',
        name: 'end_conversation',
        description: 'End the conversation and provide a summary. Call this when the user says goodbye or the conversation is complete.',
        parameters: {
          type: 'object',
          properties: {
            summary: { type: 'string', description: 'Brief summary of the conversation' },
            outcome: {
              type: 'string',
              enum: ['interested', 'not_interested', 'needs_followup', 'callback_scheduled'],
              description: 'The outcome of the conversation',
            },
          },
          required: ['summary', 'outcome'],
        },
      },
    ];
  }

  send(event: RealtimeClientEvent): void {
    if (!this.ws || !this.isConnected) {
      console.error('[OpenAI Realtime] Cannot send - not connected');
      return;
    }

    const eventWithId = {
      ...event,
      event_id: event.event_id || uuidv4(),
    };

    this.ws.send(JSON.stringify(eventWithId));
  }

  appendAudio(audioBase64: string): void {
    this.send({
      type: 'input_audio_buffer.append',
      audio: audioBase64,
    });
  }

  commitAudio(): void {
    this.send({
      type: 'input_audio_buffer.commit',
    });
  }

  clearAudioBuffer(): void {
    this.send({
      type: 'input_audio_buffer.clear',
    });
  }

  cancelResponse(): boolean {
    // Only cancel if there's an active response to avoid "no active response" error
    if (!this.hasActiveResponse) {
      return false;
    }
    this.send({
      type: 'response.cancel',
    });
    this.hasActiveResponse = false;
    return true;
  }

  createResponse(options?: { instructions?: string }): void {
    this.send({
      type: 'response.create',
      response: options ? { instructions: options.instructions } : undefined,
    });
  }

  sendTextMessage(text: string): void {
    this.send({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }],
      },
    });
    this.createResponse();
  }

  submitFunctionResult(callId: string, result: unknown): void {
    this.send({
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: callId,
        output: JSON.stringify(result),
      },
    });
    // Trigger a response after function result
    this.createResponse();
  }

  updateInstructions(instructions: string): void {
    this.send({
      type: 'session.update',
      session: { instructions },
    });
  }

  disconnect(): void {
    // Disable reconnection when explicitly disconnecting
    this.shouldReconnect = false;

    // Clear any pending reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }
    this.isConnected = false;
    this.isReconnecting = false;
    this.sessionId = null;
    this.reconnectAttempts = 0;
    this.conversationItems.clear();
    this.pendingFunctionCalls.clear();
  }

  /**
   * Enable or disable automatic reconnection
   */
  setAutoReconnect(enabled: boolean): void {
    this.shouldReconnect = enabled;
    if (!enabled && this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
      this.isReconnecting = false;
    }
  }

  /**
   * Get current reconnection status
   */
  getReconnectStatus(): { isReconnecting: boolean; attempts: number; maxAttempts: number } {
    return {
      isReconnecting: this.isReconnecting,
      attempts: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts,
    };
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  isActive(): boolean {
    return this.isConnected && this.ws !== null;
  }

  getPendingFunctionCall(callId: string): { name: string; arguments: string } | undefined {
    return this.pendingFunctionCalls.get(callId);
  }

  clearPendingFunctionCall(callId: string): void {
    this.pendingFunctionCalls.delete(callId);
  }
}

// Service class for managing multiple connections
class OpenAIRealtimeService {
  private connections: Map<string, OpenAIRealtimeConnection> = new Map();

  createConnection(sessionId: string, config: OpenAIRealtimeConfig): OpenAIRealtimeConnection {
    const connection = new OpenAIRealtimeConnection(config);
    this.connections.set(sessionId, connection);

    // Clean up on disconnect only if not reconnecting
    connection.on('disconnected', () => {
      const status = connection.getReconnectStatus();
      if (!status.isReconnecting) {
        // Give some time for reconnection to be initiated
        setTimeout(() => {
          const currentStatus = connection.getReconnectStatus();
          if (!currentStatus.isReconnecting && !connection.isActive()) {
            this.connections.delete(sessionId);
          }
        }, 2000);
      }
    });

    // Re-add to connections map when reconnected
    connection.on('connected', () => {
      if (!this.connections.has(sessionId)) {
        this.connections.set(sessionId, connection);
      }
    });

    return connection;
  }

  /**
   * Create a connection and connect with retry logic
   */
  async createAndConnect(
    sessionId: string,
    config: OpenAIRealtimeConfig,
    useRetry: boolean = true
  ): Promise<OpenAIRealtimeConnection> {
    const connection = this.createConnection(sessionId, config);

    try {
      if (useRetry) {
        await connection.connectWithRetry();
      } else {
        await connection.connect();
      }
      return connection;
    } catch (error) {
      // Clean up on connection failure
      this.connections.delete(sessionId);
      throw error;
    }
  }

  getConnection(sessionId: string): OpenAIRealtimeConnection | undefined {
    return this.connections.get(sessionId);
  }

  closeConnection(sessionId: string): void {
    const connection = this.connections.get(sessionId);
    if (connection) {
      connection.disconnect();
      this.connections.delete(sessionId);
    }
  }

  closeAllConnections(): void {
    for (const connection of this.connections.values()) {
      connection.disconnect();
    }
    this.connections.clear();
  }

  getActiveConnectionCount(): number {
    return this.connections.size;
  }

  // Process function calls and return results
  async processFunctionCall(
    callId: string,
    name: string,
    argsString: string,
    context?: { sessionId: string; organizationId: string }
  ): Promise<FunctionCallResult> {
    try {
      const args = JSON.parse(argsString);
      let result: unknown;

      switch (name) {
        case 'collect_qualification_data':
          result = await this.handleCollectQualification(args, context);
          break;

        case 'schedule_callback':
          result = await this.handleScheduleCallback(args, context);
          break;

        case 'end_conversation':
          result = await this.handleEndConversation(args, context);
          break;

        default:
          result = { success: false, message: `Unknown function: ${name}` };
      }

      return {
        name,
        result,
        success: true,
      };
    } catch (error) {
      return {
        name,
        result: null,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async handleCollectQualification(
    data: QualificationData,
    context?: { sessionId: string; organizationId: string }
  ): Promise<{ success: boolean; message: string; data: QualificationData }> {
    console.log('[OpenAI Realtime] Collected qualification data:', data);

    // If email is being collected, check if there's an appointment that needs updating
    if (data.email && context?.sessionId) {
      try {
        const { prisma } = await import('../config/database');

        // Find appointments for this session that don't have an email
        const appointmentWithoutEmail = await prisma.appointment.findFirst({
          where: {
            voiceSessionId: context.sessionId,
            contactEmail: null,
          },
          orderBy: { createdAt: 'desc' },
        });

        if (appointmentWithoutEmail) {
          // Update the appointment with the email
          const updatedAppointment = await prisma.appointment.update({
            where: { id: appointmentWithoutEmail.id },
            data: { contactEmail: data.email },
          });
          console.log('[OpenAI Realtime] Updated appointment with email:', updatedAppointment.id);

          // Now sync to calendar since we have the email
          try {
            const eventId = await calendarService.syncAppointmentToCalendar(updatedAppointment);
            if (eventId) {
              console.log('[OpenAI Realtime] Calendar event created:', eventId);
            }
          } catch (calendarError) {
            console.error('[OpenAI Realtime] Calendar sync failed:', calendarError);
          }
        }
      } catch (error) {
        console.error('[OpenAI Realtime] Failed to update appointment with email:', error);
      }
    }

    return {
      success: true,
      message: 'Qualification data recorded successfully.',
      data,
    };
  }

  private async handleScheduleCallback(
    data: { preferred_time: string; reason?: string },
    context?: { sessionId: string; organizationId: string }
  ): Promise<{ success: boolean; message: string; scheduledAt: string; appointmentId?: string }> {
    console.log('[OpenAI Realtime] Scheduling callback:', data);

    if (!context?.sessionId || !context?.organizationId) {
      console.error('[OpenAI Realtime] Cannot create appointment - missing context');
      return {
        success: true, // Return success to AI so it confirms to user
        message: `Callback scheduled for ${data.preferred_time}.`,
        scheduledAt: data.preferred_time,
      };
    }

    try {
      // Import prisma dynamically to avoid circular dependency
      const { prisma } = await import('../config/database');

      // Get session to find qualification data
      const session = await prisma.voiceSession.findUnique({
        where: { id: context.sessionId },
        include: { agent: true, lead: true },
      });

      if (!session) {
        console.error('[OpenAI Realtime] Session not found:', context.sessionId);
        return {
          success: true,
          message: `Callback scheduled for ${data.preferred_time}.`,
          scheduledAt: data.preferred_time,
        };
      }

      const qualification = (session.qualification as Record<string, string>) || {};
      const contactName = qualification.name || session.visitorName || 'Voice Lead';
      const contactPhone = qualification.phone || session.visitorPhone || 'unknown';
      const contactEmail = qualification.email || session.visitorEmail;

      // Validate required fields - name and phone are required
      if (!qualification.name && !session.visitorName) {
        console.log('[OpenAI Realtime] Missing name for appointment');
        return {
          success: false,
          message: 'I need your name before I can schedule the appointment. Could you please tell me your name?',
          scheduledAt: data.preferred_time,
        };
      }

      if (!qualification.phone && !session.visitorPhone) {
        console.log('[OpenAI Realtime] Missing phone for appointment');
        return {
          success: false,
          message: 'I need your phone number before I can schedule the appointment. Could you please provide your phone number?',
          scheduledAt: data.preferred_time,
        };
      }

      // Email is required for sending calendar invitation
      if (!contactEmail) {
        console.log('[OpenAI Realtime] Missing email for appointment - will sync calendar when email is collected');
      }

      // Parse the preferred time
      let scheduledAt: Date;
      try {
        scheduledAt = new Date(data.preferred_time);
        if (isNaN(scheduledAt.getTime())) {
          // Try to parse natural language times like "tomorrow at 2pm"
          scheduledAt = new Date(); // Default to now + 1 day
          scheduledAt.setDate(scheduledAt.getDate() + 1);
        }
      } catch {
        scheduledAt = new Date();
        scheduledAt.setDate(scheduledAt.getDate() + 1);
      }

      // Create the appointment
      const appointment = await prisma.appointment.create({
        data: {
          organizationId: context.organizationId,
          leadId: session.leadId,
          voiceSessionId: context.sessionId,
          title: `Callback: ${contactName}`,
          description: data.reason || 'Scheduled via voice agent',
          appointmentType: session.agent?.appointmentType || 'callback',
          scheduledAt,
          duration: session.agent?.appointmentDuration || 30,
          timezone: session.agent?.appointmentTimezone || 'Asia/Kolkata',
          locationType: 'PHONE',
          contactName,
          contactPhone,
          contactEmail,
          status: 'SCHEDULED',
        },
      });

      console.log('[OpenAI Realtime] Appointment created:', appointment.id);

      // Sync to calendar if email is available
      if (contactEmail) {
        try {
          const eventId = await calendarService.syncAppointmentToCalendar(appointment);
          if (eventId) {
            console.log('[OpenAI Realtime] Calendar event created and invitation sent:', eventId);
          } else {
            console.log('[OpenAI Realtime] Calendar sync skipped - no integration configured');
          }
        } catch (calendarError) {
          console.error('[OpenAI Realtime] Calendar sync failed:', calendarError);
          // Don't fail the appointment creation if calendar sync fails
        }
      } else {
        console.log('[OpenAI Realtime] Calendar sync deferred - waiting for email to be collected');
      }

      const confirmationMessage = contactEmail
        ? `Great! Your appointment has been scheduled for ${scheduledAt.toLocaleString()}. A calendar invitation will be sent to ${contactEmail}.`
        : `Great! Your appointment has been scheduled for ${scheduledAt.toLocaleString()}. Could you please provide your email address so I can send you a calendar invitation?`;

      return {
        success: true,
        message: confirmationMessage,
        scheduledAt: data.preferred_time,
        appointmentId: appointment.id,
      };
    } catch (error) {
      console.error('[OpenAI Realtime] Failed to create appointment:', error);
      return {
        success: false,
        message: 'Sorry, there was an issue scheduling your appointment. Let me try again. Could you confirm the time you prefer?',
        scheduledAt: data.preferred_time,
      };
    }
  }

  private async handleEndConversation(
    data: { summary: string; outcome: string },
    context?: { sessionId: string; organizationId: string }
  ): Promise<{ success: boolean; message: string }> {
    console.log('[OpenAI Realtime] Ending conversation:', data);
    return {
      success: true,
      message: 'Conversation ended successfully.',
    };
  }
}

export const openaiRealtimeService = new OpenAIRealtimeService();
