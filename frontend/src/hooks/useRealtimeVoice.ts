import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  VoiceSessionMode,
  TranscriptEntry,
  RealtimeStartPayload,
  RealtimeStartedPayload,
  RealtimeTranscriptionPayload,
  RealtimeAudioResponsePayload,
  RealtimeStatusPayload,
  RealtimeErrorPayload,
  RealtimeEndedPayload,
  RealtimeVoiceState,
  DEFAULT_AUDIO_CONFIG,
} from '../types/realtime.types';

// Socket URL derived from API URL - falls back to relative URL in production if not set
const getSocketUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) {
    return apiUrl.replace(/\/api\/?$/, '');
  }
  // In production, use relative URL; in development, use localhost
  return import.meta.env.PROD ? '' : 'http://localhost:3000';
};

const SOCKET_URL = getSocketUrl();

interface UseRealtimeVoiceOptions {
  agentId: string;
  mode?: VoiceSessionMode;
  autoStart?: boolean;
  onSessionEnd?: (result: RealtimeEndedPayload) => void;
  onError?: (error: RealtimeErrorPayload) => void;
  onTranscription?: (transcription: RealtimeTranscriptionPayload) => void;
}

export function useRealtimeVoice(options: UseRealtimeVoiceOptions) {
  const { agentId, mode = 'REALTIME', autoStart = false, onSessionEnd, onError, onTranscription } = options;

  const socketRef = useRef<Socket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false);

  const [state, setState] = useState<RealtimeVoiceState>({
    isConnected: false,
    status: 'idle',
    sessionId: null,
    mode,
    transcripts: [],
    currentUserText: '',
    currentAssistantText: '',
    error: null,
    isRecording: false,
    isMuted: false,
    volume: 1.0,
  });

  // Update state helper
  const updateState = useCallback((updates: Partial<RealtimeVoiceState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Connect to socket
  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const token = localStorage.getItem('accessToken');
    if (!token) {
      updateState({ error: 'Authentication required' });
      return;
    }

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[RealtimeVoice] Socket connected');
      updateState({ isConnected: true, error: null });
    });

    socket.on('disconnect', () => {
      console.log('[RealtimeVoice] Socket disconnected');
      updateState({ isConnected: false, status: 'disconnected' });
    });

    socket.on('connect_error', (error) => {
      console.error('[RealtimeVoice] Connection error:', error);
      updateState({ error: 'Connection failed', isConnected: false });
    });

    // Realtime events
    socket.on('realtime:started', (data: RealtimeStartedPayload) => {
      console.log('[RealtimeVoice] Session started:', data.sessionId);
      updateState({
        sessionId: data.sessionId,
        mode: data.mode,
        status: 'connected',
      });

      // Add greeting as first transcript if present
      if (data.greeting) {
        const greetingEntry: TranscriptEntry = {
          id: `greeting-${Date.now()}`,
          role: 'assistant',
          text: data.greeting,
          timestamp: new Date(),
          isFinal: true,
        };
        setState(prev => ({
          ...prev,
          transcripts: [...prev.transcripts, greetingEntry],
        }));
      }
    });

    socket.on('realtime:transcription', (data: RealtimeTranscriptionPayload) => {
      if (data.role === 'user') {
        updateState({ currentUserText: data.text });
        if (data.isFinal) {
          const entry: TranscriptEntry = {
            id: data.itemId || `user-${Date.now()}`,
            role: 'user',
            text: data.text,
            timestamp: new Date(),
            isFinal: true,
          };
          setState(prev => ({
            ...prev,
            transcripts: [...prev.transcripts, entry],
            currentUserText: '',
          }));
        }
      } else {
        updateState({ currentAssistantText: data.text });
        if (data.isFinal) {
          const entry: TranscriptEntry = {
            id: data.itemId || `assistant-${Date.now()}`,
            role: 'assistant',
            text: data.text,
            timestamp: new Date(),
            isFinal: true,
          };
          setState(prev => ({
            ...prev,
            transcripts: [...prev.transcripts, entry],
            currentAssistantText: '',
          }));
        }
      }
      onTranscription?.(data);
    });

    socket.on('realtime:audio', (data: RealtimeAudioResponsePayload) => {
      playAudioChunk(data.audio, data.format);
    });

    socket.on('realtime:status', (data: RealtimeStatusPayload) => {
      updateState({ status: data.status });
    });

    socket.on('realtime:error', (data: RealtimeErrorPayload) => {
      console.error('[RealtimeVoice] Error:', data);
      updateState({ error: data.message });
      onError?.(data);
    });

    socket.on('realtime:ended', (data: RealtimeEndedPayload) => {
      console.log('[RealtimeVoice] Session ended:', data);
      updateState({
        status: 'disconnected',
        sessionId: null,
        isRecording: false,
      });
      stopRecording();
      onSessionEnd?.(data);
    });
  }, [updateState, onSessionEnd, onError, onTranscription]);

  // Start session
  const startSession = useCallback(async (visitorInfo?: { name?: string; email?: string; phone?: string }) => {
    if (!socketRef.current?.connected) {
      connect();
      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (!socketRef.current?.connected) {
      updateState({ error: 'Failed to connect' });
      return;
    }

    updateState({ status: 'connecting', error: null });

    const payload: RealtimeStartPayload = {
      agentId,
      mode,
      visitorInfo,
    };

    socketRef.current.emit('realtime:start', payload);
  }, [connect, agentId, mode, updateState]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: DEFAULT_AUDIO_CONFIG.sampleRate,
          channelCount: DEFAULT_AUDIO_CONFIG.channelCount,
          echoCancellation: DEFAULT_AUDIO_CONFIG.echoCancellation,
          noiseSuppression: DEFAULT_AUDIO_CONFIG.noiseSuppression,
          autoGainControl: DEFAULT_AUDIO_CONFIG.autoGainControl,
        },
      });

      mediaStreamRef.current = stream;

      // Create audio context
      const audioContext = new AudioContext({
        sampleRate: DEFAULT_AUDIO_CONFIG.sampleRate,
      });
      audioContextRef.current = audioContext;

      // Create source from stream
      const source = audioContext.createMediaStreamSource(stream);

      // Create script processor for audio processing
      // Note: AudioWorklet would be better but requires more setup
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (event) => {
        if (state.isMuted || !socketRef.current?.connected) return;

        const inputData = event.inputBuffer.getChannelData(0);

        // Convert float32 to int16 PCM
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Convert to base64
        const base64 = arrayBufferToBase64(pcm16.buffer);

        // Send to server
        socketRef.current?.emit('realtime:audio', { audio: base64 });
      };

      source.connect(processor);
      // Connect to a dummy destination to keep processor active, but don't play back mic audio
      // This prevents hearing your own voice (echo)
      processor.connect(audioContext.createGain());

      updateState({ isRecording: true });
      console.log('[RealtimeVoice] Recording started');
    } catch (error) {
      console.error('[RealtimeVoice] Failed to start recording:', error);
      updateState({ error: 'Microphone access denied' });
    }
  }, [state.isMuted, updateState]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    updateState({ isRecording: false });
    console.log('[RealtimeVoice] Recording stopped');
  }, [updateState]);

  // Play audio chunk
  const playAudioChunk = useCallback(async (base64Audio: string, _format: string) => {
    const audioData = base64ToArrayBuffer(base64Audio);
    audioQueueRef.current.push(audioData);

    if (!isPlayingRef.current) {
      playNextChunk();
    }
  }, []);

  const playNextChunk = useCallback(async () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }

    isPlayingRef.current = true;
    const audioData = audioQueueRef.current.shift()!;

    try {
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      }

      // Convert PCM16 to Float32
      const pcm16 = new Int16Array(audioData);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768;
      }

      // Create audio buffer
      const audioBuffer = audioContextRef.current.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      // Play
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;

      const gainNode = audioContextRef.current.createGain();
      gainNode.gain.value = state.volume;

      source.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);

      source.onended = () => {
        playNextChunk();
      };

      source.start();
    } catch (error) {
      console.error('[RealtimeVoice] Audio playback error:', error);
      playNextChunk();
    }
  }, [state.volume]);

  // Interrupt
  const interrupt = useCallback(() => {
    socketRef.current?.emit('realtime:interrupt');
    audioQueueRef.current = [];
    isPlayingRef.current = false;
  }, []);

  // End session
  const endSession = useCallback((reason: 'user' | 'timeout' | 'error' = 'user') => {
    socketRef.current?.emit('realtime:end', { reason });
    stopRecording();
  }, [stopRecording]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setState(prev => ({ ...prev, isMuted: !prev.isMuted }));
  }, []);

  // Set volume
  const setVolume = useCallback((volume: number) => {
    setState(prev => ({ ...prev, volume: Math.max(0, Math.min(1, volume)) }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      socketRef.current?.disconnect();
    };
  }, [stopRecording]);

  // Auto-start if enabled
  useEffect(() => {
    if (autoStart) {
      connect();
    }
  }, [autoStart, connect]);

  return {
    ...state,
    connect,
    startSession,
    startRecording,
    stopRecording,
    interrupt,
    endSession,
    toggleMute,
    setVolume,
  };
}

// Utility functions
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
