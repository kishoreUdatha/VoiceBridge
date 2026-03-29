// ==================== OPENAI REALTIME API TYPES ====================

export interface RealtimeSessionConfig {
  modalities: ('text' | 'audio')[];  // Enable text and/or audio modalities for real-time streaming
  model: string;
  voice: string;
  instructions: string;
  input_audio_format: 'pcm16' | 'g711_ulaw' | 'g711_alaw';
  output_audio_format: 'pcm16' | 'g711_ulaw' | 'g711_alaw';
  input_audio_transcription: {
    model: 'whisper-1';
  } | null;
  turn_detection: {
    type: 'server_vad';
    threshold: number;
    prefix_padding_ms: number;
    silence_duration_ms: number;
    create_response?: boolean;  // Automatically create response when turn ends
  } | null;
  tools: RealtimeTool[];
  tool_choice: 'auto' | 'none' | 'required' | { type: 'function'; name: string };
  temperature: number;
  max_response_output_tokens: number | 'inf';
}

export interface RealtimeTool {
  type: 'function';
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description?: string;
      enum?: string[];
    }>;
    required?: string[];
  };
}

// OpenAI Realtime Server Events
export type RealtimeServerEvent =
  | RealtimeErrorEvent
  | RealtimeSessionCreatedEvent
  | RealtimeSessionUpdatedEvent
  | RealtimeInputAudioBufferCommittedEvent
  | RealtimeInputAudioBufferClearedEvent
  | RealtimeInputAudioBufferSpeechStartedEvent
  | RealtimeInputAudioBufferSpeechStoppedEvent
  | RealtimeConversationItemCreatedEvent
  | RealtimeConversationItemInputAudioTranscriptionCompletedEvent
  | RealtimeConversationItemInputAudioTranscriptionFailedEvent
  | RealtimeConversationItemTruncatedEvent
  | RealtimeConversationItemDeletedEvent
  | RealtimeResponseCreatedEvent
  | RealtimeResponseDoneEvent
  | RealtimeResponseOutputItemAddedEvent
  | RealtimeResponseOutputItemDoneEvent
  | RealtimeResponseContentPartAddedEvent
  | RealtimeResponseContentPartDoneEvent
  | RealtimeResponseTextDeltaEvent
  | RealtimeResponseTextDoneEvent
  | RealtimeResponseAudioTranscriptDeltaEvent
  | RealtimeResponseAudioTranscriptDoneEvent
  | RealtimeResponseAudioDeltaEvent
  | RealtimeResponseAudioDoneEvent
  | RealtimeResponseFunctionCallArgumentsDeltaEvent
  | RealtimeResponseFunctionCallArgumentsDoneEvent
  | RealtimeRateLimitsUpdatedEvent;

export interface RealtimeErrorEvent {
  type: 'error';
  event_id: string;
  error: {
    type: string;
    code: string;
    message: string;
    param: string | null;
    event_id: string | null;
  };
}

export interface RealtimeSessionCreatedEvent {
  type: 'session.created';
  event_id: string;
  session: {
    id: string;
    object: 'realtime.session';
    model: string;
    modalities: string[];
    voice: string;
    instructions: string;
    input_audio_format: string;
    output_audio_format: string;
    input_audio_transcription: object | null;
    turn_detection: object | null;
    tools: RealtimeTool[];
    tool_choice: string;
    temperature: number;
    max_response_output_tokens: number | string;
  };
}

export interface RealtimeSessionUpdatedEvent {
  type: 'session.updated';
  event_id: string;
  session: RealtimeSessionCreatedEvent['session'];
}

export interface RealtimeInputAudioBufferCommittedEvent {
  type: 'input_audio_buffer.committed';
  event_id: string;
  previous_item_id: string | null;
  item_id: string;
}

export interface RealtimeInputAudioBufferClearedEvent {
  type: 'input_audio_buffer.cleared';
  event_id: string;
}

export interface RealtimeInputAudioBufferSpeechStartedEvent {
  type: 'input_audio_buffer.speech_started';
  event_id: string;
  audio_start_ms: number;
  item_id: string;
}

export interface RealtimeInputAudioBufferSpeechStoppedEvent {
  type: 'input_audio_buffer.speech_stopped';
  event_id: string;
  audio_end_ms: number;
  item_id: string;
}

export interface RealtimeConversationItemCreatedEvent {
  type: 'conversation.item.created';
  event_id: string;
  previous_item_id: string | null;
  item: RealtimeConversationItem;
}

export interface RealtimeConversationItem {
  id: string;
  object: 'realtime.item';
  type: 'message' | 'function_call' | 'function_call_output';
  status: 'completed' | 'in_progress' | 'incomplete';
  role?: 'user' | 'assistant' | 'system';
  content?: Array<{
    type: 'input_text' | 'input_audio' | 'text' | 'audio';
    text?: string;
    audio?: string;
    transcript?: string;
  }>;
  call_id?: string;
  name?: string;
  arguments?: string;
  output?: string;
}

export interface RealtimeConversationItemInputAudioTranscriptionCompletedEvent {
  type: 'conversation.item.input_audio_transcription.completed';
  event_id: string;
  item_id: string;
  content_index: number;
  transcript: string;
}

export interface RealtimeConversationItemInputAudioTranscriptionFailedEvent {
  type: 'conversation.item.input_audio_transcription.failed';
  event_id: string;
  item_id: string;
  content_index: number;
  error: {
    type: string;
    code: string;
    message: string;
    param: string | null;
  };
}

export interface RealtimeConversationItemTruncatedEvent {
  type: 'conversation.item.truncated';
  event_id: string;
  item_id: string;
  content_index: number;
  audio_end_ms: number;
}

export interface RealtimeConversationItemDeletedEvent {
  type: 'conversation.item.deleted';
  event_id: string;
  item_id: string;
}

export interface RealtimeResponseCreatedEvent {
  type: 'response.created';
  event_id: string;
  response: RealtimeResponse;
}

export interface RealtimeResponse {
  id: string;
  object: 'realtime.response';
  status: 'in_progress' | 'completed' | 'cancelled' | 'failed' | 'incomplete';
  status_details: object | null;
  output: RealtimeConversationItem[];
  usage: {
    total_tokens: number;
    input_tokens: number;
    output_tokens: number;
    input_token_details: {
      cached_tokens: number;
      text_tokens: number;
      audio_tokens: number;
    };
    output_token_details: {
      text_tokens: number;
      audio_tokens: number;
    };
  } | null;
}

export interface RealtimeResponseDoneEvent {
  type: 'response.done';
  event_id: string;
  response: RealtimeResponse;
}

export interface RealtimeResponseOutputItemAddedEvent {
  type: 'response.output_item.added';
  event_id: string;
  response_id: string;
  output_index: number;
  item: RealtimeConversationItem;
}

export interface RealtimeResponseOutputItemDoneEvent {
  type: 'response.output_item.done';
  event_id: string;
  response_id: string;
  output_index: number;
  item: RealtimeConversationItem;
}

export interface RealtimeResponseContentPartAddedEvent {
  type: 'response.content_part.added';
  event_id: string;
  response_id: string;
  item_id: string;
  output_index: number;
  content_index: number;
  part: {
    type: 'text' | 'audio';
    text?: string;
    audio?: string;
    transcript?: string;
  };
}

export interface RealtimeResponseContentPartDoneEvent {
  type: 'response.content_part.done';
  event_id: string;
  response_id: string;
  item_id: string;
  output_index: number;
  content_index: number;
  part: {
    type: 'text' | 'audio';
    text?: string;
    audio?: string;
    transcript?: string;
  };
}

export interface RealtimeResponseTextDeltaEvent {
  type: 'response.text.delta';
  event_id: string;
  response_id: string;
  item_id: string;
  output_index: number;
  content_index: number;
  delta: string;
}

export interface RealtimeResponseTextDoneEvent {
  type: 'response.text.done';
  event_id: string;
  response_id: string;
  item_id: string;
  output_index: number;
  content_index: number;
  text: string;
}

export interface RealtimeResponseAudioTranscriptDeltaEvent {
  type: 'response.audio_transcript.delta';
  event_id: string;
  response_id: string;
  item_id: string;
  output_index: number;
  content_index: number;
  delta: string;
}

export interface RealtimeResponseAudioTranscriptDoneEvent {
  type: 'response.audio_transcript.done';
  event_id: string;
  response_id: string;
  item_id: string;
  output_index: number;
  content_index: number;
  transcript: string;
}

export interface RealtimeResponseAudioDeltaEvent {
  type: 'response.audio.delta';
  event_id: string;
  response_id: string;
  item_id: string;
  output_index: number;
  content_index: number;
  delta: string; // base64 encoded audio
}

export interface RealtimeResponseAudioDoneEvent {
  type: 'response.audio.done';
  event_id: string;
  response_id: string;
  item_id: string;
  output_index: number;
  content_index: number;
}

export interface RealtimeResponseFunctionCallArgumentsDeltaEvent {
  type: 'response.function_call_arguments.delta';
  event_id: string;
  response_id: string;
  item_id: string;
  output_index: number;
  call_id: string;
  delta: string;
}

export interface RealtimeResponseFunctionCallArgumentsDoneEvent {
  type: 'response.function_call_arguments.done';
  event_id: string;
  response_id: string;
  item_id: string;
  output_index: number;
  call_id: string;
  name: string;
  arguments: string;
}

export interface RealtimeRateLimitsUpdatedEvent {
  type: 'rate_limits.updated';
  event_id: string;
  rate_limits: Array<{
    name: string;
    limit: number;
    remaining: number;
    reset_seconds: number;
  }>;
}

// OpenAI Realtime Client Events
export type RealtimeClientEvent =
  | RealtimeSessionUpdateEvent
  | RealtimeInputAudioBufferAppendEvent
  | RealtimeInputAudioBufferCommitEvent
  | RealtimeInputAudioBufferClearEvent
  | RealtimeConversationItemCreateEvent
  | RealtimeConversationItemTruncateEvent
  | RealtimeConversationItemDeleteEvent
  | RealtimeResponseCreateEvent
  | RealtimeResponseCancelEvent;

export interface RealtimeSessionUpdateEvent {
  type: 'session.update';
  event_id?: string;
  session: Partial<RealtimeSessionConfig>;
}

export interface RealtimeInputAudioBufferAppendEvent {
  type: 'input_audio_buffer.append';
  event_id?: string;
  audio: string; // base64 encoded audio
}

export interface RealtimeInputAudioBufferCommitEvent {
  type: 'input_audio_buffer.commit';
  event_id?: string;
}

export interface RealtimeInputAudioBufferClearEvent {
  type: 'input_audio_buffer.clear';
  event_id?: string;
}

export interface RealtimeConversationItemCreateEvent {
  type: 'conversation.item.create';
  event_id?: string;
  previous_item_id?: string;
  item: {
    type: 'message' | 'function_call_output';
    role?: 'user' | 'assistant' | 'system';
    content?: Array<{
      type: 'input_text' | 'input_audio' | 'text';
      text?: string;
      audio?: string;
    }>;
    call_id?: string;
    output?: string;
  };
}

export interface RealtimeConversationItemTruncateEvent {
  type: 'conversation.item.truncate';
  event_id?: string;
  item_id: string;
  content_index: number;
  audio_end_ms: number;
}

export interface RealtimeConversationItemDeleteEvent {
  type: 'conversation.item.delete';
  event_id?: string;
  item_id: string;
}

export interface RealtimeResponseCreateEvent {
  type: 'response.create';
  event_id?: string;
  response?: {
    modalities?: ('text' | 'audio')[];
    instructions?: string;
    voice?: string;
    output_audio_format?: string;
    tools?: RealtimeTool[];
    tool_choice?: string;
    temperature?: number;
    max_output_tokens?: number | 'inf';
  };
}

export interface RealtimeResponseCancelEvent {
  type: 'response.cancel';
  event_id?: string;
}

// ==================== SESSION MANAGEMENT TYPES ====================

export type VoiceSessionMode = 'BATCH' | 'REALTIME' | 'WEBRTC';

export type RealtimeStatus = 'connecting' | 'connected' | 'listening' | 'thinking' | 'speaking' | 'error' | 'disconnected';

export interface RealtimeSession {
  id: string;
  socketId: string;
  agentId: string;
  organizationId: string;
  userId?: string;
  leadId?: string;
  mode: VoiceSessionMode;
  status: RealtimeStatus;
  openaiSessionId?: string;
  startedAt: Date;
  lastActivityAt: Date;
  transcripts: TranscriptEntry[];
  qualification: Record<string, unknown>;
  interruptionCount: number;
}

export interface TranscriptEntry {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isFinal: boolean;
  audioUrl?: string;
}

// ==================== SOCKET.IO EVENT TYPES ====================

// Client -> Server Events
export interface RealtimeStartPayload {
  agentId: string;
  mode?: VoiceSessionMode;
  leadId?: string;
  visitorInfo?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

export interface RealtimeAudioPayload {
  audio: string; // base64 PCM16
  sampleRate?: number;
}

export interface RealtimeInterruptPayload {
  timestamp?: number;
}

export interface RealtimeEndPayload {
  reason?: 'user' | 'timeout' | 'error' | 'transfer';
}

// Server -> Client Events
export interface RealtimeStartedPayload {
  sessionId: string;
  mode: VoiceSessionMode;
  greeting?: string;
}

export interface RealtimeTranscriptionPayload {
  role: 'user' | 'assistant';
  text: string;
  isFinal: boolean;
  itemId?: string;
}

export interface RealtimeAudioResponsePayload {
  audio: string; // base64
  format: 'pcm16' | 'mp3';
  sampleRate?: number;
}

export interface RealtimeStatusPayload {
  status: RealtimeStatus;
  message?: string;
}

export interface RealtimeErrorPayload {
  code: string;
  message: string;
  recoverable: boolean;
}

export interface RealtimeEndedPayload {
  sessionId: string;
  duration: number;
  summary?: string;
  qualification?: Record<string, unknown>;
  sentiment?: string;
  leadId?: string;
}

// ==================== WEBRTC SIGNALING TYPES ====================

export interface WebRTCOfferPayload {
  peerId: string;
  offer: RTCSessionDescriptionInit;
}

export interface WebRTCAnswerPayload {
  peerId: string;
  answer: RTCSessionDescriptionInit;
}

export interface WebRTCIceCandidatePayload {
  peerId: string;
  candidate: RTCIceCandidateInit;
}

export interface WebRTCPeerConfig {
  peerId: string;
  socketId: string;
  organizationId: string;
  sessionId?: string;
  connection?: unknown; // RTCPeerConnection on server
  audioTrack?: unknown;
}

// ==================== FUNCTION CALLING TYPES ====================

export interface QualificationData {
  name?: string;
  email?: string;
  phone?: string;
  interest?: string;
  budget?: string;
  timeline?: string;
  requirements?: string[];
  [key: string]: unknown;
}

export interface FunctionCallResult {
  name: string;
  result: unknown;
  success: boolean;
  error?: string;
}

// ==================== REALTIME EVENT LOGGING ====================

export interface RealtimeEventLog {
  id: string;
  sessionId: string;
  eventType: string;
  eventData?: Record<string, unknown>;
  latencyMs?: number;
  timestamp: Date;
}
