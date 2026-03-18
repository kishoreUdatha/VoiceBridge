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

const OPENAI_REALTIME_URL = 'wss://api.openai.com/v1/realtime';
const DEFAULT_MODEL = process.env.OPENAI_REALTIME_MODEL || 'gpt-4o-realtime-preview-2024-12-17';

export interface OpenAIRealtimeConfig {
  apiKey: string;
  model?: string;
  voice?: string;
  instructions?: string;
  temperature?: number;
  tools?: RealtimeTool[];
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
  private maxReconnectAttempts: number = 3;
  private pendingFunctionCalls: Map<string, { name: string; arguments: string }> = new Map();
  private conversationItems: Map<string, RealtimeConversationItem> = new Map();
  private currentResponseId: string | null = null;
  private assistantTranscript: string = '';

  constructor(config: OpenAIRealtimeConfig) {
    super();
    this.config = config;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const model = this.config.model || DEFAULT_MODEL;
      const url = `${OPENAI_REALTIME_URL}?model=${model}`;

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
        console.log(`[OpenAI Realtime] WebSocket closed: ${code} - ${reason}`);
        this.isConnected = false;
        this.sessionId = null;
        this.emit('disconnected', reason.toString());
      });
    });
  }

  private handleServerEvent(event: RealtimeServerEvent): void {
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
        this.emit('response.done', {
          responseId: event.response.id,
          usage: event.response.usage || {},
        });
        break;

      case 'error':
        console.error('[OpenAI Realtime] Error:', event.error);
        this.emit('error', {
          code: event.error.code,
          message: event.error.message,
        });
        break;
    }
  }

  private configureSession(): void {
    const sessionConfig: Partial<RealtimeSessionConfig> = {
      voice: this.config.voice || 'alloy',
      instructions: this.config.instructions || 'You are a helpful assistant.',
      input_audio_format: 'pcm16',
      output_audio_format: 'pcm16',
      input_audio_transcription: {
        model: 'whisper-1' as const,
      },
      turn_detection: {
        type: 'server_vad',
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 500,
      },
      temperature: this.config.temperature || 0.8,
      tools: this.config.tools || this.getDefaultTools(),
      tool_choice: 'auto',
    };

    this.send({
      type: 'session.update',
      session: sessionConfig,
    });
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

  cancelResponse(): void {
    this.send({
      type: 'response.cancel',
    });
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
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.sessionId = null;
    this.conversationItems.clear();
    this.pendingFunctionCalls.clear();
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

    // Clean up on disconnect
    connection.on('disconnected', () => {
      this.connections.delete(sessionId);
    });

    return connection;
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
    // In a real implementation, this would save to the database
    console.log('[OpenAI Realtime] Collected qualification data:', data);
    return {
      success: true,
      message: 'Qualification data recorded successfully.',
      data,
    };
  }

  private async handleScheduleCallback(
    data: { preferred_time: string; reason?: string },
    context?: { sessionId: string; organizationId: string }
  ): Promise<{ success: boolean; message: string; scheduledAt: string }> {
    console.log('[OpenAI Realtime] Scheduling callback:', data);
    return {
      success: true,
      message: `Callback scheduled for ${data.preferred_time}.`,
      scheduledAt: data.preferred_time,
    };
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
