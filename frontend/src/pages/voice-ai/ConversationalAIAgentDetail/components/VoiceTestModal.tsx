/**
 * Voice Test Panel Component
 * Right side panel for real-time voice testing using Web Speech API
 * With fallback to push-to-talk for browsers that don't support continuous recognition
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Volume2,
  Loader2,
  Waves,
  AlertCircle,
  Settings,
  Send,
} from 'lucide-react';
import api from '../../../../services/api';

interface VoiceTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentName: string;
  agentId?: string;
  greeting: string;
  systemPrompt: string;
  voiceId: string;
  language: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

type Status = 'idle' | 'connecting' | 'greeting' | 'listening' | 'processing' | 'speaking' | 'error';

const statusConfig: Record<Status, { label: string; color: string; dotColor: string }> = {
  idle: { label: 'Ready', color: 'text-gray-500', dotColor: 'bg-gray-400' },
  connecting: { label: 'Connecting...', color: 'text-amber-600', dotColor: 'bg-amber-500' },
  greeting: { label: 'Speaking...', color: 'text-blue-600', dotColor: 'bg-blue-500' },
  listening: { label: 'Listening', color: 'text-green-600', dotColor: 'bg-green-500' },
  processing: { label: 'Thinking...', color: 'text-purple-600', dotColor: 'bg-purple-500' },
  speaking: { label: 'Speaking', color: 'text-blue-600', dotColor: 'bg-blue-500' },
  error: { label: 'Error', color: 'text-red-600', dotColor: 'bg-red-500' },
};

// Check for Web Speech API support
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export function VoiceTestModal({
  isOpen,
  onClose,
  agentName,
  greeting,
  systemPrompt,
  voiceId,
  language,
}: VoiceTestModalProps) {
  const [status, setStatus] = useState<Status>('idle');
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isSessionActiveRef = useRef<boolean>(false);
  const conversationHistoryRef = useRef<Message[]>([]);
  const statusRef = useRef<Status>('idle');
  const shouldRestartRef = useRef<boolean>(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTranscriptRef = useRef<string>('');
  const keepaliveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recognitionStartTimeRef = useRef<number>(0);

  // Keep refs in sync
  useEffect(() => {
    isSessionActiveRef.current = isSessionActive;
  }, [isSessionActive]);

  useEffect(() => {
    conversationHistoryRef.current = messages;
  }, [messages]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentTranscript]);

  // Cleanup on unmount or close
  useEffect(() => {
    if (!isOpen) {
      cleanup();
    }
    return () => cleanup();
  }, [isOpen]);

  const cleanup = useCallback(() => {
    shouldRestartRef.current = false;
    setIsRecording(false);
    lastTranscriptRef.current = '';

    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    if (keepaliveIntervalRef.current) {
      clearInterval(keepaliveIntervalRef.current);
      keepaliveIntervalRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        // ignore
      }
      recognitionRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setIsSessionActive(false);
    setStatus('idle');
    setCurrentTranscript('');
    setAudioLevel(0);
  }, []);

  const setupAudioMonitoring = async () => {
    try {
      // Check if permissions API is available
      if (navigator.permissions) {
        try {
          const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          console.log('[VoiceTest] Microphone permission status:', permissionStatus.state);

          if (permissionStatus.state === 'denied') {
            setError('Microphone access was denied. Click the microphone icon in the address bar to allow access, then try again.');
            return false;
          }
        } catch (e) {
          console.log('[VoiceTest] Could not query permission status:', e);
        }
      }

      console.log('[VoiceTest] Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      console.log('[VoiceTest] Microphone access granted');
      mediaStreamRef.current = stream;

      const audioContext = new AudioContext();
      // Resume audio context (required for some browsers)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const timeDomainData = new Uint8Array(analyser.fftSize);

      const updateLevel = () => {
        if (!analyserRef.current || !isSessionActiveRef.current) {
          setAudioLevel(0);
          return;
        }

        // Try frequency data first
        analyserRef.current.getByteFrequencyData(dataArray);
        let average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

        // If frequency data is too low, try time domain (RMS)
        if (average < 5) {
          analyserRef.current.getByteTimeDomainData(timeDomainData);
          let sum = 0;
          for (let i = 0; i < timeDomainData.length; i++) {
            const value = (timeDomainData[i] - 128) / 128;
            sum += value * value;
          }
          const rms = Math.sqrt(sum / timeDomainData.length);
          average = rms * 200; // Scale up for visibility
        }

        const normalizedLevel = Math.min(100, (average / 128) * 100);
        setAudioLevel(normalizedLevel);

        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
      console.log('[VoiceTest] Audio monitoring started, context state:', audioContext.state);
      return true;
    } catch (err: any) {
      console.error('[VoiceTest] Failed to setup audio monitoring:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Microphone access denied. Click the microphone icon (🎤) in the address bar to allow access.');
      } else if (err.name === 'NotFoundError') {
        setError('No microphone found. Please connect a microphone and try again.');
      } else {
        setError(`Microphone error: ${err.message}`);
      }
      return false;
    }
  };

  const startSession = async () => {
    if (!SpeechRecognition) {
      setError('Speech recognition not supported. Please use Chrome or Edge browser.');
      setStatus('error');
      return;
    }

    try {
      setError(null);
      setStatus('connecting');
      setMessages([]);

      // Set session active FIRST so audio monitoring works
      setIsSessionActive(true);
      isSessionActiveRef.current = true;

      // Request microphone permission and setup monitoring
      const micOk = await setupAudioMonitoring();
      if (!micOk) {
        setStatus('error');
        setIsSessionActive(false);
        isSessionActiveRef.current = false;
        return;
      }

      // Play greeting (listening starts during greeting for interruption support)
      await playGreeting();
    } catch (err: any) {
      console.error('Failed to start session:', err);
      setError(err.message || 'Failed to start voice session');
      setStatus('error');
      setIsSessionActive(false);
      isSessionActiveRef.current = false;
    }
  };

  const playGreeting = async () => {
    setStatus('greeting');

    const greetingText = greeting || `Hello! I'm ${agentName}. How can I help you today?`;

    // Add greeting message
    const greetingMsg: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: greetingText,
      timestamp: new Date(),
    };
    setMessages([greetingMsg]);

    try {
      // Determine provider
      const isSarvam = voiceId?.startsWith('sarvam-');
      const isAI4Bharat = voiceId?.startsWith('ai4bharat-');
      const isElevenLabs = voiceId?.startsWith('elevenlabs-');

      let cleanVoiceId = voiceId;
      let provider = 'openai';

      if (isSarvam) {
        cleanVoiceId = voiceId.replace('sarvam-', '');
        provider = 'sarvam';
      } else if (isAI4Bharat) {
        cleanVoiceId = voiceId; // Keep full ID for AI4Bharat
        provider = 'ai4bharat';
      } else if (isElevenLabs) {
        cleanVoiceId = voiceId;
        provider = 'elevenlabs';
      }

      console.log('[VoiceTest] Calling TTS API...', { voice: cleanVoiceId, provider, language });

      const response = await api.post('/voice-ai/tts', {
        text: greetingText,
        voice: cleanVoiceId || 'alloy',
        language: language || 'en-IN',
        provider: provider,
      }, { responseType: 'arraybuffer' });

      console.log('[VoiceTest] TTS response received, size:', response.data.byteLength);

      const contentType = (isSarvam || isAI4Bharat) ? 'audio/wav' : 'audio/mpeg';
      const audioBlob = new Blob([response.data], { type: contentType });
      const audioUrl = URL.createObjectURL(audioBlob);

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      // Start listening WHILE greeting plays (for interruption support)
      if (isSessionActiveRef.current) {
        console.log('[VoiceTest] Starting listening during greeting for interruption support');
        shouldRestartRef.current = true;
        setTimeout(() => startListening(), 500); // Small delay to let audio start first
      }

      await new Promise<void>((resolve) => {
        audio.onended = () => {
          console.log('[VoiceTest] Greeting audio finished');
          resolve();
        };
        audio.onerror = (e) => {
          console.error('[VoiceTest] Audio error:', e);
          resolve();
        };
        audio.play().catch((e) => {
          console.error('[VoiceTest] Play error:', e);
          resolve();
        });
      });
    } catch (err: any) {
      console.error('[VoiceTest] TTS error:', err);
      // Continue without audio - still start listening
    }

    // After greeting, make sure we're listening (in case it wasn't started during audio)
    if (isSessionActiveRef.current && statusRef.current !== 'listening') {
      startListening();
    }
  };

  const startListening = () => {
    if (!isSessionActiveRef.current) {
      console.log('[VoiceTest] Session not active, not starting recognition');
      return;
    }

    // Clean up any existing recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        // ignore
      }
    }

    setStatus('listening');
    setCurrentTranscript('');
    shouldRestartRef.current = true;
    setIsRecording(true);

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    // Configure recognition for better accuracy
    recognition.continuous = true; // Keep listening continuously
    recognition.interimResults = true; // Show interim results
    recognition.maxAlternatives = 3; // More alternatives for better accuracy

    // Set language based on agent language
    const langMap: Record<string, string> = {
      'hi': 'hi-IN',
      'te': 'te-IN',
      'ta': 'ta-IN',
      'kn': 'kn-IN',
      'ml': 'ml-IN',
      'mr': 'mr-IN',
      'bn': 'bn-IN',
      'gu': 'gu-IN',
      'en': 'en-IN',
      'en-US': 'en-US',
      'en-IN': 'en-IN',
    };
    recognition.lang = langMap[language] || 'en-IN';

    console.log('[VoiceTest] Starting speech recognition, lang:', recognition.lang);

    recognition.onstart = () => {
      console.log('[VoiceTest] Speech recognition started');
      recognitionStartTimeRef.current = Date.now();
      setIsRecording(true);

      // Clear any existing keepalive
      if (keepaliveIntervalRef.current) {
        clearInterval(keepaliveIntervalRef.current);
      }

      // Start keepalive - check every 3 seconds if recognition is still active
      keepaliveIntervalRef.current = setInterval(() => {
        if (!isSessionActiveRef.current) {
          if (keepaliveIntervalRef.current) {
            clearInterval(keepaliveIntervalRef.current);
            keepaliveIntervalRef.current = null;
          }
          return;
        }

        // If status is listening but recognition might have stopped, restart it
        if (statusRef.current === 'listening' && shouldRestartRef.current) {
          const timeSinceStart = Date.now() - recognitionStartTimeRef.current;
          console.log('[VoiceTest] Keepalive check, time since start:', timeSinceStart);

          // If it's been more than 10 seconds without any result, force restart
          if (timeSinceStart > 10000) {
            console.log('[VoiceTest] Keepalive: forcing restart due to timeout');
            try {
              recognition.stop();
            } catch (e) {
              // ignore
            }
            setTimeout(() => {
              if (isSessionActiveRef.current && statusRef.current === 'listening') {
                startListening();
              }
            }, 100);
          }
        }
      }, 3000);
    };

    recognition.onaudiostart = () => {
      console.log('[VoiceTest] Audio capture started');
      recognitionStartTimeRef.current = Date.now(); // Reset timer when audio starts
    };

    recognition.onsoundstart = () => {
      console.log('[VoiceTest] Sound detected');
      recognitionStartTimeRef.current = Date.now(); // Reset timer when sound detected
    };

    recognition.onspeechstart = () => {
      console.log('[VoiceTest] Speech detected, current status:', statusRef.current);
      recognitionStartTimeRef.current = Date.now(); // Reset timer when speech detected

      // INTERRUPTION: If agent is speaking, stop the audio immediately
      if (statusRef.current === 'speaking' || statusRef.current === 'greeting') {
        console.log('[VoiceTest] USER INTERRUPTED - stopping agent audio');
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
        setStatus('listening');
      }
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      console.log('[VoiceTest] Result:', { interim: interimTranscript, final: finalTranscript });

      // INTERRUPTION: If we get any speech result while agent is speaking, stop the audio
      if ((interimTranscript || finalTranscript) && (statusRef.current === 'speaking' || statusRef.current === 'greeting')) {
        console.log('[VoiceTest] USER INTERRUPTED via speech result - stopping agent audio');
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
        setStatus('listening');
      }

      // Clear any existing silence timeout
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }

      if (interimTranscript) {
        setCurrentTranscript(interimTranscript);
        lastTranscriptRef.current = interimTranscript;

        // Set a timeout to auto-submit if user stops speaking for 3 seconds
        silenceTimeoutRef.current = setTimeout(() => {
          const currentText = lastTranscriptRef.current;
          if (currentText && currentText.trim() && isSessionActiveRef.current) {
            console.log('[VoiceTest] Silence timeout, auto-submitting:', currentText);
            shouldRestartRef.current = false;
            setCurrentTranscript('');
            lastTranscriptRef.current = '';
            try {
              recognition.stop();
            } catch (e) {
              // ignore
            }
            processUserInput(currentText);
          }
        }, 3000); // 3 seconds of silence
      }

      if (finalTranscript && finalTranscript.trim()) {
        console.log('[VoiceTest] Final transcript:', finalTranscript);
        // Clear silence timeout since we have final result
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
          silenceTimeoutRef.current = null;
        }
        shouldRestartRef.current = false; // Don't restart, we're processing
        setCurrentTranscript('');
        lastTranscriptRef.current = '';
        recognition.stop(); // Stop recognition before processing
        processUserInput(finalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('[VoiceTest] Recognition error:', event.error);
      if (event.error === 'no-speech') {
        // No speech detected - this is normal, will auto-restart
        console.log('[VoiceTest] No speech detected, will restart');
        // Keep shouldRestartRef true to restart
      } else if (event.error === 'aborted') {
        // Aborted by us, don't show error
        console.log('[VoiceTest] Recognition aborted');
      } else if (event.error === 'network') {
        setError('Network error. Check your internet connection.');
        // Still try to restart after network error
        setTimeout(() => {
          if (isSessionActiveRef.current) {
            setError(null);
            startListening();
          }
        }, 2000);
      } else if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow microphone access and refresh the page.');
        setStatus('error');
        shouldRestartRef.current = false;
        setIsRecording(false);
      } else if (event.error === 'audio-capture') {
        setError('No microphone found. Please connect a microphone.');
        setStatus('error');
        shouldRestartRef.current = false;
        setIsRecording(false);
      } else {
        console.log('[VoiceTest] Unknown error, will try to restart:', event.error);
        // Try to restart on other errors
      }
    };

    recognition.onend = () => {
      console.log('[VoiceTest] Recognition ended, shouldRestart:', shouldRestartRef.current, 'sessionActive:', isSessionActiveRef.current, 'status:', statusRef.current);
      setIsRecording(false);

      // Clear keepalive when recognition ends
      if (keepaliveIntervalRef.current) {
        clearInterval(keepaliveIntervalRef.current);
        keepaliveIntervalRef.current = null;
      }

      // Always try to restart if session is active, unless we're processing/speaking
      if (isSessionActiveRef.current) {
        const canRestart = statusRef.current === 'listening' || statusRef.current === 'idle';
        const shouldRestart = shouldRestartRef.current || statusRef.current === 'listening';

        if (canRestart && shouldRestart) {
          console.log('[VoiceTest] Restarting recognition immediately...');
          // Very short delay to avoid race conditions
          setTimeout(() => {
            if (isSessionActiveRef.current && (statusRef.current === 'listening' || statusRef.current === 'idle')) {
              shouldRestartRef.current = true;
              startListening();
            }
          }, 50);
        } else {
          console.log('[VoiceTest] Not restarting, status is:', statusRef.current, 'shouldRestart:', shouldRestartRef.current);
        }
      }
    };

    try {
      recognition.start();
    } catch (err: any) {
      console.error('[VoiceTest] Failed to start recognition:', err);
      // Might already be started, try to restart
      if (isSessionActiveRef.current) {
        setTimeout(() => startListening(), 500);
      }
    }
  };

  const processUserInput = async (userText: string) => {
    if (!userText.trim()) {
      if (isSessionActiveRef.current) startListening();
      return;
    }

    // Stop recognition while processing
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    setStatus('processing');

    // Add user message
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userText,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      // Get AI response
      console.log('[VoiceTest] Getting AI response...');
      const chatResponse = await api.post('/voice-templates/chat', {
        message: userText,
        systemPrompt: systemPrompt || 'You are a helpful voice AI assistant. Keep responses concise and conversational.',
        conversationHistory: conversationHistoryRef.current.map(m => ({
          role: m.role,
          content: m.content,
        })),
      });

      const assistantText = chatResponse.data.data?.response || chatResponse.data.response || chatResponse.data.message;
      console.log('[VoiceTest] AI response:', assistantText);

      // Add assistant message
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: assistantText,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);

      // Play TTS
      setStatus('speaking');

      // Determine provider for TTS
      const isSarvamTTS = voiceId?.startsWith('sarvam-');
      const isAI4BharatTTS = voiceId?.startsWith('ai4bharat-');
      const isElevenLabsTTS = voiceId?.startsWith('elevenlabs-');

      let ttsVoiceId = voiceId;
      let ttsProvider = 'openai';

      if (isSarvamTTS) {
        ttsVoiceId = voiceId.replace('sarvam-', '');
        ttsProvider = 'sarvam';
      } else if (isAI4BharatTTS) {
        ttsVoiceId = voiceId; // Keep full ID for AI4Bharat
        ttsProvider = 'ai4bharat';
      } else if (isElevenLabsTTS) {
        ttsVoiceId = voiceId;
        ttsProvider = 'elevenlabs';
      }

      const ttsResponse = await api.post('/voice-ai/tts', {
        text: assistantText,
        voice: ttsVoiceId || 'alloy',
        language: language || 'en-IN',
        provider: ttsProvider,
      }, { responseType: 'arraybuffer' });

      const contentType = (isSarvamTTS || isAI4BharatTTS) ? 'audio/wav' : 'audio/mpeg';
      const audioBlob = new Blob([ttsResponse.data], { type: contentType });
      const audioUrl = URL.createObjectURL(audioBlob);

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      // Start listening WHILE audio plays (for interruption support)
      if (isSessionActiveRef.current) {
        console.log('[VoiceTest] Starting listening during AI response for interruption support');
        shouldRestartRef.current = true;
        startListening();
      }

      await new Promise<void>((resolve) => {
        audio.onended = () => {
          console.log('[VoiceTest] AI audio finished playing');
          resolve();
        };
        audio.onerror = (e) => {
          console.error('[VoiceTest] AI audio error:', e);
          resolve();
        };
        audio.play().catch((e) => {
          console.error('[VoiceTest] AI audio play error:', e);
          resolve();
        });
      });

      // Audio finished - recognition should already be running
      console.log('[VoiceTest] AI audio complete, recognition should be active');
    } catch (err: any) {
      console.error('[VoiceTest] Processing error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to process');
      setStatus('error');
      setTimeout(() => {
        setError(null);
        if (isSessionActiveRef.current) {
          shouldRestartRef.current = true;
          startListening();
        }
      }, 2000);
    }
  };

  const sendTextMessage = () => {
    if (!textInput.trim()) return;

    // Stop recognition while processing
    shouldRestartRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
    }

    const text = textInput.trim();
    setTextInput('');
    processUserInput(text);
  };

  const endSession = () => {
    cleanup();
    setMessages([]);
    setIsSessionActive(false);
  };

  const handleClose = () => {
    cleanup();
    onClose();
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (recognitionRef.current) {
      if (!isMuted) {
        recognitionRef.current.stop();
      } else if (status === 'listening') {
        startListening();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={handleClose}
      />

      {/* Right Side Panel */}
      <div className="fixed right-0 top-0 h-full w-[420px] bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-gray-200">
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <Mic className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">{agentName}</h2>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${statusConfig[status].dotColor} ${status === 'listening' || status === 'connecting' ? 'animate-pulse' : ''}`} />
                  <span className={`text-xs font-medium ${statusConfig[status].color}`}>
                    {statusConfig[status].label}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="flex-shrink-0 px-4 py-3 bg-red-50 border-b border-red-100 flex items-center gap-2 text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-5 bg-gray-50">
          {messages.length === 0 && !isSessionActive ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mb-5">
                <Phone className="w-12 h-12 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Voice Test</h3>
              <p className="text-sm text-gray-500 mb-6">
                Start a real-time voice conversation with your AI agent.
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Settings className="w-3.5 h-3.5" />
                <span>Using {voiceId || 'alloy'} voice</span>
              </div>
              {!SpeechRecognition && (
                <p className="text-xs text-red-500 mt-4">
                  ⚠️ Speech recognition requires Chrome or Edge browser
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-emerald-600 text-white rounded-br-sm'
                        : 'bg-white shadow-sm border border-gray-100 text-gray-800 rounded-bl-sm'
                    }`}
                  >
                    <p>{msg.content}</p>
                    <p className={`text-[10px] mt-1.5 ${msg.role === 'user' ? 'text-emerald-200' : 'text-gray-400'}`}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}

              {/* Current transcript */}
              {currentTranscript && (
                <div className="flex justify-end">
                  <div className="max-w-[85%] px-4 py-3 rounded-2xl rounded-br-sm bg-emerald-100 text-emerald-800 text-sm italic">
                    {currentTranscript}
                    <span className="inline-block w-1 h-4 ml-1 bg-emerald-500 animate-pulse" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Status Indicator */}
        {status === 'listening' && (
          <div className="flex-shrink-0 px-5 py-4 bg-emerald-50 border-t border-emerald-100">
            <div className="flex flex-col items-center gap-2">
              {/* Audio Level Bars */}
              <div className="flex items-end gap-1 h-8">
                {[...Array(12)].map((_, i) => {
                  const barHeight = Math.max(4, (audioLevel / 100) * 32 * (0.5 + Math.random() * 0.5));
                  return (
                    <div
                      key={i}
                      className={`w-1.5 rounded-full transition-all duration-75 ${
                        audioLevel > 10 ? 'bg-emerald-500' : 'bg-emerald-300'
                      }`}
                      style={{ height: `${barHeight}px` }}
                    />
                  );
                })}
              </div>
              <span className="text-sm text-emerald-700 font-medium">
                {audioLevel > 20 ? 'Hearing you...' : 'Listening... Speak now'}
              </span>
              {audioLevel < 5 && (
                <span className="text-xs text-emerald-600">
                  (No audio detected - check your microphone)
                </span>
              )}
            </div>
          </div>
        )}

        {status === 'processing' && (
          <div className="flex-shrink-0 px-5 py-4 bg-purple-50 border-t border-purple-100">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
              <span className="text-sm text-purple-700 font-medium">Processing...</span>
            </div>
          </div>
        )}

        {(status === 'speaking' || status === 'greeting') && (
          <div className="flex-shrink-0 px-5 py-4 bg-blue-50 border-t border-blue-100">
            <div className="flex items-center justify-center gap-2">
              <Waves className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-700 font-medium">Agent speaking...</span>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex-shrink-0 p-5 border-t border-gray-200 bg-white">
          {!isSessionActive ? (
            <button
              onClick={startSession}
              disabled={status === 'connecting' || !SpeechRecognition}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold flex items-center justify-center gap-2 hover:from-emerald-600 hover:to-teal-700 transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20"
            >
              {status === 'connecting' ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Phone className="w-5 h-5" />
                  Start Voice Test
                </>
              )}
            </button>
          ) : (
            <div className="space-y-3">
              {/* Text Input Fallback */}
              <div className="flex items-center gap-2">
                <input
                  ref={textInputRef}
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendTextMessage();
                    }
                  }}
                  placeholder="Type a message if voice isn't working..."
                  disabled={status === 'processing' || status === 'speaking'}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
                />
                <button
                  onClick={sendTextMessage}
                  disabled={!textInput.trim() || status === 'processing' || status === 'speaking'}
                  className="p-2.5 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Send message"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-center gap-3">
                {/* Mute Button */}
                <button
                  onClick={toggleMute}
                  className={`p-3.5 rounded-xl transition-all ${
                    isMuted
                      ? 'bg-red-100 text-red-600 hover:bg-red-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>

                {/* End Call Button */}
                <button
                  onClick={endSession}
                  className="flex-1 py-3.5 rounded-xl bg-red-500 text-white font-semibold flex items-center justify-center gap-2 hover:bg-red-600 transition-all"
                >
                  <PhoneOff className="w-5 h-5" />
                  End Test
                </button>

                {/* Volume Button */}
                <button
                  onClick={() => {
                    if (audioRef.current) {
                      audioRef.current.muted = !audioRef.current.muted;
                    }
                  }}
                  className="p-3.5 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
                  title="Toggle speaker"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
