// ==================== REALTIME VOICE TYPES ====================

export type VoiceSessionMode = 'BATCH' | 'REALTIME' | 'WEBRTC';

export type RealtimeStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'error'
  | 'disconnected';

export interface TranscriptEntry {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  isFinal: boolean;
}

// ==================== SOCKET.IO EVENT PAYLOADS ====================

// Client -> Server
export interface RealtimeStartPayload {
  agentId: string;
  mode?: VoiceSessionMode;
  leadId?: string;
  visitorInfo?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  testMode?: boolean; // Allow testing DRAFT agents from dashboard
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

// Server -> Client
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

// ==================== WEBRTC SIGNALING PAYLOADS ====================

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

// ==================== HOOK STATE TYPES ====================

export interface RealtimeVoiceState {
  isConnected: boolean;
  status: RealtimeStatus;
  sessionId: string | null;
  mode: VoiceSessionMode;
  transcripts: TranscriptEntry[];
  currentUserText: string;
  currentAssistantText: string;
  error: string | null;
  isRecording: boolean;
  isMuted: boolean;
  volume: number;
}

export interface WebRTCState {
  isConnected: boolean;
  peerId: string | null;
  connectionState: RTCPeerConnectionState | null;
  iceConnectionState: RTCIceConnectionState | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  error: string | null;
}

// ==================== COMPONENT PROPS ====================

export interface RealtimeVoiceWidgetProps {
  agentId: string;
  onSessionEnd?: (result: RealtimeEndedPayload) => void;
  onError?: (error: RealtimeErrorPayload) => void;
  defaultMode?: VoiceSessionMode;
  showModeSelector?: boolean;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  theme?: {
    primaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
  };
  visitorInfo?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  /** Enable test mode to bypass publish/mode checks (for dashboard testing) */
  testMode?: boolean;
}

export interface VoiceVisualizerProps {
  isActive: boolean;
  audioLevel: number;
  status: RealtimeStatus;
}

export interface TranscriptDisplayProps {
  transcripts: TranscriptEntry[];
  currentUserText: string;
  currentAssistantText: string;
  showTimestamps?: boolean;
}

// ==================== AUDIO PROCESSING TYPES ====================

export interface AudioWorkletMessage {
  type: 'audio' | 'volume' | 'silence';
  data?: Float32Array;
  volume?: number;
  timestamp?: number;
}

export interface AudioConfig {
  sampleRate: number;
  channelCount: number;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
}

export const DEFAULT_AUDIO_CONFIG: AudioConfig = {
  sampleRate: 24000,
  channelCount: 1,
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

// ==================== API TYPES ====================

export interface RealtimeConfig {
  enabled: boolean;
  model: string;
  webrtcEnabled: boolean;
  maxSessionDuration: number;
  fallbackToBatch: boolean;
}

export interface VoiceAgentConfig {
  id: string;
  name: string;
  greeting?: string;
  voice: string;
  language: string;
  realtimeEnabled: boolean;
  webrtcEnabled: boolean;
}
