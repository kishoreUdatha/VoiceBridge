/**
 * Telephony Types
 * Provider-agnostic interfaces for telephony operations
 */

export type TelephonyProviderType = 'PLIVO' | 'EXOTEL' | 'TWILIO';

export interface MakeCallParams {
  from: string;           // Caller ID (phone number)
  to: string;             // Destination phone number
  answerUrl?: string;     // Webhook URL when call is answered
  statusCallback?: string; // Webhook URL for status updates
  record?: boolean;       // Enable call recording
  recordingChannels?: 'single' | 'dual';
  timeLimit?: number;     // Max call duration in seconds
  timeout?: number;       // Ring timeout in seconds
  customData?: Record<string, any>; // Custom metadata
  // AI-specific params
  agentId?: string;       // Voice agent ID for AI calls
  leadId?: string;        // Lead ID for context
}

// ==================== AI VOICE AGENT TYPES ====================

export interface AICallParams extends MakeCallParams {
  agentId: string;
  greeting?: string;
  language?: string;
  voiceId?: string;
}

export interface AIConversationContext {
  callId: string;
  agentId: string;
  leadId?: string;
  transcript: TranscriptEntry[];
  qualification: Record<string, any>;
  language: string;
  voiceId: string;
}

export interface TranscriptEntry {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface SpeechInputResult {
  text: string;
  confidence: number;
  language?: string;
  isFinal: boolean;
}

export interface AIResponseResult {
  text: string;
  audioUrl?: string;
  audioBase64?: string;
  shouldEnd: boolean;
  shouldTransfer: boolean;
  transferTo?: string;
  qualification?: Record<string, any>;
}

export interface XMLGeneratorParams {
  sayText?: string;
  playUrl?: string;
  gatherInput?: boolean;
  gatherAction?: string;
  gatherTimeout?: number;
  speechInput?: boolean;
  speechAction?: string;
  speechLanguage?: string;
  streamUrl?: string;
  recordingUrl?: string;
  dialNumber?: string;
  hangup?: boolean;
}

export interface StreamConfig {
  url: string;
  contentType?: string;
  track?: 'inbound' | 'outbound' | 'both';
}

export interface CallResult {
  success: boolean;
  callId?: string;        // Provider's call ID
  status?: string;        // Initial status
  error?: string;         // Error message if failed
  provider: TelephonyProviderType;
  data?: any;             // Raw provider response
}

export interface CallStatus {
  callId: string;
  status: 'queued' | 'ringing' | 'in-progress' | 'completed' | 'busy' | 'failed' | 'no-answer' | 'canceled';
  duration?: number;
  recordingUrl?: string;
  from: string;
  to: string;
  direction: 'inbound' | 'outbound';
}

export interface EndCallResult {
  success: boolean;
  error?: string;
}

export interface ProviderConfig {
  isConfigured: boolean;
  balance?: number;
  accountName?: string;
}

/**
 * Telephony Provider Interface
 * All providers must implement this interface
 */
export interface ITelephonyProvider {
  readonly providerName: TelephonyProviderType;

  /**
   * Check if provider is configured and ready
   */
  isConfigured(): Promise<boolean>;

  /**
   * Get provider configuration status
   */
  getConfig(): Promise<ProviderConfig>;

  /**
   * Make an outbound call
   */
  makeCall(params: MakeCallParams): Promise<CallResult>;

  /**
   * Make an AI-powered outbound call
   */
  makeAICall(params: AICallParams): Promise<CallResult>;

  /**
   * End an active call
   */
  endCall(callId: string): Promise<EndCallResult>;

  /**
   * Get call status/details
   */
  getCallStatus(callId: string): Promise<CallStatus | null>;

  /**
   * Parse webhook data from provider
   */
  parseWebhook(body: any): CallStatus;

  /**
   * Parse speech/transcription webhook data
   */
  parseSpeechWebhook(body: any): SpeechInputResult;

  /**
   * Format phone number for this provider
   */
  formatPhoneNumber(phone: string): string;

  /**
   * Generate XML/ExoML response for call handling
   */
  generateXML(params: XMLGeneratorParams): string;

  /**
   * Generate XML for AI conversation flow
   */
  generateAIResponseXML(params: {
    responseText: string;
    voiceId?: string;
    language?: string;
    callId: string;
    baseUrl: string;
    shouldEnd?: boolean;
    shouldTransfer?: boolean;
    transferTo?: string;
    playAudioUrl?: string;
  }): string;

  /**
   * Generate XML for gathering speech input
   */
  generateGatherSpeechXML(params: {
    promptText?: string;
    promptAudioUrl?: string;
    callId: string;
    baseUrl: string;
    language?: string;
    voiceId?: string;
    timeout?: number;
  }): string;

  /**
   * Generate XML for bidirectional audio streaming
   */
  generateStreamXML(params: {
    streamUrl: string;
    callId: string;
    greeting?: string;
    voiceId?: string;
    language?: string;
  }): string;

  /**
   * Get webhook URLs for this provider
   */
  getWebhookUrls(baseUrl: string, callId: string): {
    answer: string;
    status: string;
    speech: string;
    stream: string;
    recording: string;
  };
}
