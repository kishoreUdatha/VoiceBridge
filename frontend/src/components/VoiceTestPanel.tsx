import { useState, useRef, useEffect } from 'react';
import {
  MicrophoneIcon,
  StopIcon,
  SpeakerWaveIcon,
  PhoneIcon,
  PhoneXMarkIcon,
} from '@heroicons/react/24/solid';
import api from '../services/api';

interface VoiceTestPanelProps {
  greeting: string;
  systemPrompt: string;
  voiceId: string;
  language: string;
  agentName: string;
  accentColor?: string;
  onClose?: () => void;
  autoStart?: boolean; // Auto-start session when mounted
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  audioUrl?: string;
}

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'listening' | 'processing' | 'speaking' | 'error';

const statusLabels: Record<ConnectionStatus, string> = {
  idle: 'Ready to test',
  connecting: 'Connecting...',
  connected: 'Connected',
  listening: 'Listening...',
  processing: 'Thinking...',
  speaking: 'Speaking...',
  error: 'Error',
};

const statusColors: Record<ConnectionStatus, string> = {
  idle: 'bg-gray-400',
  connecting: 'bg-yellow-400',
  connected: 'bg-green-500',
  listening: 'bg-blue-500',
  processing: 'bg-purple-500',
  speaking: 'bg-green-500',
  error: 'bg-red-500',
};

export const VoiceTestPanel: React.FC<VoiceTestPanelProps> = ({
  greeting,
  systemPrompt,
  voiceId,
  language,
  agentName,
  accentColor = '#3B82F6',
  onClose,
  autoStart = false,
}) => {
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const autoStartedRef = useRef(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTranscript, setCurrentTranscript] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasSpokenRef = useRef<boolean>(false);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentTranscript]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Auto-start session when mounted if autoStart is true
  useEffect(() => {
    if (autoStart && !autoStartedRef.current && status === 'idle') {
      autoStartedRef.current = true;
      // Small delay to ensure component is fully mounted
      const timer = setTimeout(() => {
        startSession();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [autoStart, status]);

  const startSession = async () => {
    try {
      setStatus('connecting');
      setError(null);

      // Play greeting first
      await playGreeting();

      // Automatically start listening after greeting
      await startRecording();
    } catch (err: any) {
      setError(err.message || 'Failed to start session');
      setStatus('error');
    }
  };

  const playGreeting = async () => {
    try {
      setStatus('speaking');

      const greetingText = greeting || 'Hello! How can I help you today?';

      // Add greeting message
      const greetingMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: greetingText,
        timestamp: new Date(),
      };
      setMessages([greetingMessage]);

      // Determine provider and clean voice ID
      const isSarvam = voiceId?.startsWith('sarvam-');
      const cleanVoiceId = isSarvam ? voiceId.replace('sarvam-', '') : voiceId;
      const provider = isSarvam ? 'sarvam' : 'openai';

      // Get TTS for greeting
      const response = await api.post('/voice-ai/tts', {
        text: greetingText,
        voice: cleanVoiceId || 'alloy',
        language: language || 'en-IN',
        provider: provider,
      }, { responseType: 'arraybuffer' });

      const contentType = isSarvam ? 'audio/wav' : 'audio/mpeg';
      const audioBlob = new Blob([response.data], { type: contentType });
      const audioUrl = URL.createObjectURL(audioBlob);

      // Play audio
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      await new Promise<void>((resolve, reject) => {
        audio.onended = () => resolve();
        audio.onerror = (e) => {
          console.error('Audio playback error:', e);
          reject(new Error('Audio playback failed'));
        };
        audio.play().catch(reject);
      });

      setStatus('connected');
    } catch (err: any) {
      console.error('Failed to play greeting:', err);
      setStatus('connected'); // Continue anyway
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up audio analysis for VAD (Voice Activity Detection)
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      hasSpokenRef.current = false;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Clean up audio context
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
          silenceTimeoutRef.current = null;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (hasSpokenRef.current && audioBlob.size > 1000) {
          await processAudio(audioBlob);
        } else {
          // No speech detected, restart listening
          setStatus('connected');
          setTimeout(() => startRecording(), 500);
        }
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setStatus('listening');
      setCurrentTranscript('');

      // Start VAD monitoring
      startVADMonitoring();
    } catch (err: any) {
      setError('Microphone access denied. Please allow microphone access.');
      setStatus('error');
    }
  };

  const startVADMonitoring = () => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const SILENCE_THRESHOLD = 15; // Adjust this value for sensitivity
    const SILENCE_DURATION = 1500; // Stop after 1.5 seconds of silence
    let silenceStart: number | null = null;

    const checkAudio = () => {
      if (!analyserRef.current || !mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') {
        return;
      }

      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

      if (average > SILENCE_THRESHOLD) {
        // User is speaking
        hasSpokenRef.current = true;
        silenceStart = null;
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
          silenceTimeoutRef.current = null;
        }
      } else if (hasSpokenRef.current) {
        // Silence detected after speech
        if (!silenceStart) {
          silenceStart = Date.now();
        } else if (Date.now() - silenceStart > SILENCE_DURATION) {
          // Enough silence, stop recording
          stopRecording();
          return;
        }
      }

      requestAnimationFrame(checkAudio);
    };

    checkAudio();
  };

  const stopRecording = () => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setStatus('processing');

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    try {
      setStatus('processing');

      // Convert audio to base64
      const reader = new FileReader();
      const audioBase64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      console.log(`[VoiceTest] Sending audio for transcription: ${audioBlob.size} bytes, type: ${audioBlob.type}`);

      // Transcribe audio
      const transcribeResponse = await api.post('/voice-templates/transcribe', {
        audio: audioBase64,
        language: language || 'en-IN',
      });

      const userText = transcribeResponse.data.data?.text || transcribeResponse.data.text || transcribeResponse.data.transcript;

      if (!userText || userText.trim() === '') {
        setStatus('connected');
        return;
      }

      // Add user message
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: userText,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);

      // Get AI response
      const chatResponse = await api.post('/voice-templates/chat', {
        message: userText,
        systemPrompt: systemPrompt || 'You are a helpful voice AI assistant. Keep responses concise and natural for voice conversation.',
        conversationHistory: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
      });

      const assistantText = chatResponse.data.data?.response || chatResponse.data.response || chatResponse.data.message;

      // Add assistant message
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: assistantText,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Play TTS response
      setStatus('speaking');

      // Determine provider and clean voice ID
      const isSarvam = voiceId?.startsWith('sarvam-');
      const cleanVoiceId = isSarvam ? voiceId.replace('sarvam-', '') : voiceId;
      const provider = isSarvam ? 'sarvam' : 'openai';

      const ttsResponse = await api.post('/voice-ai/tts', {
        text: assistantText,
        voice: cleanVoiceId || 'alloy',
        language: language || 'en-IN',
        provider: provider,
      }, { responseType: 'arraybuffer' });

      const contentType = isSarvam ? 'audio/wav' : 'audio/mpeg';
      const responseAudioBlob = new Blob([ttsResponse.data], { type: contentType });
      const audioUrl = URL.createObjectURL(responseAudioBlob);

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      await new Promise<void>((resolve) => {
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        audio.play().catch(() => resolve());
      });

      // Automatically start listening again after AI response
      await startRecording();
    } catch (err: any) {
      console.error('Failed to process audio:', err);
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to process audio';
      console.error('[VoiceTest] Error details:', {
        status: err.response?.status,
        data: err.response?.data,
        message: errorMessage
      });
      setError(errorMessage);
      setStatus('error');
      setTimeout(() => {
        setError(null);
        setStatus('connected');
        // Try to start listening again after error
        startRecording().catch(console.error);
      }, 3000);
    }
  };

  const endSession = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsRecording(false);
    setStatus('idle');
    setMessages([]);
    setCurrentTranscript('');
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden w-full max-w-md">
      {/* Header */}
      <div
        className="p-4 text-white"
        style={{ backgroundColor: accentColor }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${statusColors[status]} ${status === 'listening' || status === 'processing' ? 'animate-pulse' : ''}`} />
            <div>
              <h3 className="font-semibold">{agentName || 'Voice Agent'}</h3>
              <p className="text-sm text-white/80">{statusLabels[status]}</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/20 transition"
            >
              <PhoneXMarkIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="px-4 py-2 bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Messages */}
      <div className="h-72 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {messages.length === 0 && status === 'idle' && (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <SpeakerWaveIcon className="w-12 h-12 mb-2" />
            <p className="text-sm">{autoStart ? 'Connecting to agent...' : 'Click Start to test your agent'}</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${
                message.role === 'user'
                  ? 'bg-gray-900 text-white rounded-br-md'
                  : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md shadow-sm'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}

        {currentTranscript && (
          <div className="flex justify-end">
            <div className="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-br-md bg-gray-200 text-gray-600 text-sm italic">
              {currentTranscript}
              <span className="inline-block w-1 h-4 ml-1 bg-gray-400 animate-pulse" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Waveform Visualization */}
      {(status === 'listening' || status === 'speaking') && (
        <div className="px-4 py-3 bg-white border-t border-gray-100">
          <div className="flex items-center justify-center gap-1 h-8">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="w-1 rounded-full transition-all duration-100"
                style={{
                  height: `${Math.random() * 100}%`,
                  backgroundColor: status === 'speaking' ? accentColor : '#6B7280',
                  animation: `soundWave 0.5s ease-in-out infinite ${i * 0.05}s`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="p-4 border-t border-gray-200 bg-white">
        {status === 'idle' ? (
          autoStart ? (
            <div className="w-full py-3 rounded-xl text-white font-medium flex items-center justify-center gap-2"
              style={{ backgroundColor: accentColor }}>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Starting...
            </div>
          ) : (
            <button
              onClick={startSession}
              className="w-full py-3 rounded-xl text-white font-medium flex items-center justify-center gap-2 transition hover:opacity-90"
              style={{ backgroundColor: accentColor }}
            >
              <PhoneIcon className="w-5 h-5" />
              Start Test
            </button>
          )
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Mute button */}
              <button
                onClick={toggleMute}
                className={`p-3 rounded-full transition ${
                  isMuted ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <SpeakerWaveIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Record button */}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={status === 'processing' || status === 'speaking' || status === 'connecting'}
              className={`p-4 rounded-full transition transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
                isRecording
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'text-white'
              }`}
              style={!isRecording ? { backgroundColor: accentColor } : undefined}
            >
              {isRecording ? (
                <StopIcon className="w-6 h-6" />
              ) : (
                <MicrophoneIcon className="w-6 h-6" />
              )}
            </button>

            {/* End button */}
            <button
              onClick={endSession}
              className="p-3 rounded-full bg-red-500 text-white hover:bg-red-600 transition"
            >
              <PhoneXMarkIcon className="w-5 h-5" />
            </button>
          </div>
        )}

        {status !== 'idle' && (
          <p className="text-center text-xs text-gray-400 mt-3">
            {isRecording ? 'Tap to stop recording' : 'Tap microphone to speak'}
          </p>
        )}
      </div>
    </div>
  );
};

export default VoiceTestPanel;
