import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Mic, MicOff, Phone, PhoneOff, Radio, Headphones, Volume2, Loader2, AlertCircle, Hand, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import io, { Socket } from 'socket.io-client';

// API URL from environment - falls back to relative URL in production
const getApiUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) {
    return apiUrl.replace(/\/api\/?$/, '');
  }
  return import.meta.env.PROD ? '' : 'http://localhost:3000';
};

const API_URL = getApiUrl();

type Status = 'idle' | 'connecting' | 'connected' | 'listening' | 'thinking' | 'speaking' | 'error';

interface TranscriptEntry {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

const RealtimeTestPage: React.FC = () => {
  const [status, setStatus] = useState<Status>('idle');
  const [, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [currentText, setCurrentText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcripts
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts, currentText]);

  const connectSocket = () => {
    if (socketRef.current?.connected) return;

    const socket = io(API_URL, {
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
      setStatus('idle');
    });

    socket.on('realtime:started', (data) => {
      console.log('Realtime session started:', data);
      setSessionId(data.sessionId);
      setStatus('connected');
    });

    socket.on('realtime:transcription', (data) => {
      console.log('Transcription:', data);
      if (data.isFinal) {
        setTranscripts(prev => [...prev, {
          id: Date.now().toString(),
          role: data.role,
          text: data.text,
          timestamp: new Date(),
        }]);
        setCurrentText('');
      } else {
        setCurrentText(data.text);
      }
    });

    socket.on('realtime:status', (data) => {
      console.log('Status:', data);
      setStatus(data.status as Status);
    });

    socket.on('realtime:audio', (data) => {
      // Play audio response
      playAudio(data.audio);
    });

    socket.on('realtime:error', (data) => {
      console.error('Realtime error:', data);
      setError(data.message);
      setStatus('error');
    });

    socket.on('realtime:ended', (data) => {
      console.log('Session ended:', data);
      setSessionId(null);
      setStatus('idle');
    });

    socketRef.current = socket;
  };

  const playAudio = async (base64Audio: string) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      const audioData = atob(base64Audio);
      const arrayBuffer = new ArrayBuffer(audioData.length);
      const view = new Uint8Array(arrayBuffer);
      for (let i = 0; i < audioData.length; i++) {
        view[i] = audioData.charCodeAt(i);
      }

      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start();
    } catch (err) {
      console.error('Error playing audio:', err);
    }
  };

  const startSession = async () => {
    setError(null);
    setStatus('connecting');
    setTranscripts([]);

    try {
      // Connect socket if not connected
      connectSocket();

      // Wait for socket connection
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Connection timeout')), 5000);

        if (socketRef.current?.connected) {
          clearTimeout(timeout);
          resolve();
        } else {
          socketRef.current?.once('connect', () => {
            clearTimeout(timeout);
            resolve();
          });
        }
      });

      // Start realtime session
      socketRef.current?.emit('realtime:start', { agentId: 'demo-agent' });

      // Start microphone
      await startMicrophone();

    } catch (err: any) {
      console.error('Failed to start session:', err);
      setError(err.message || 'Failed to start session');
      setStatus('error');
    }
  };

  const startMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0 && socketRef.current?.connected && !isMuted) {
          // Convert to base64 and send
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            socketRef.current?.emit('realtime:audio', { audio: base64 });
          };
          reader.readAsDataURL(event.data);
        }
      };

      mediaRecorder.start(100); // Send audio every 100ms
      mediaRecorderRef.current = mediaRecorder;
      setStatus('listening');

    } catch (err: any) {
      console.error('Microphone error:', err);
      setError('Could not access microphone. Please allow microphone permission.');
      setStatus('error');
    }
  };

  const endSession = () => {
    // Stop media recorder
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      mediaRecorderRef.current = null;
    }

    // End socket session
    socketRef.current?.emit('realtime:end');
    setSessionId(null);
    setStatus('idle');
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const interrupt = () => {
    socketRef.current?.emit('realtime:interrupt');
  };

  const statusConfig: Record<Status, { label: string; color: string }> = {
    idle: { label: 'Ready to Start', color: 'bg-gray-400' },
    connecting: { label: 'Connecting...', color: 'bg-yellow-400 animate-pulse' },
    connected: { label: 'Connected', color: 'bg-green-500' },
    listening: { label: 'Listening...', color: 'bg-blue-500 animate-pulse' },
    thinking: { label: 'AI Thinking...', color: 'bg-purple-500 animate-pulse' },
    speaking: { label: 'AI Speaking...', color: 'bg-green-500 animate-pulse' },
    error: { label: 'Error', color: 'bg-red-500' },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2 text-white/70 hover:text-white transition">
                <ArrowLeft className="h-5 w-5" />
                Back
              </Link>
              <div className="h-6 w-px bg-white/20" />
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <Radio className="h-6 w-6 text-green-400" />
                Realtime Voice AI Test
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <div className={`h-3 w-3 rounded-full ${statusConfig[status].color}`} />
              <span className="text-white/80 text-sm">{statusConfig[status].label}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Voice Widget Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Widget Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">AI Sales Assistant</h2>
                <p className="text-white/80 mt-1">Real-time voice conversation</p>
              </div>
              <div className={`px-4 py-2 rounded-full ${statusConfig[status].color} text-white text-sm font-medium`}>
                {statusConfig[status].label}
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="px-6 py-3 bg-red-50 text-red-700 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
                &times;
              </button>
            </div>
          )}

          {/* Transcript Area */}
          <div className="h-80 overflow-y-auto p-6 bg-gray-50">
            {transcripts.length === 0 && !sessionId && (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <MessageSquare className="w-16 h-16 mb-4" />
                <p className="text-lg">Click "Start Call" to begin</p>
                <p className="text-sm mt-2">You'll need to allow microphone access</p>
              </div>
            )}

            {transcripts.map((entry) => (
              <div key={entry.id} className={`mb-4 flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                  entry.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-white shadow-md text-gray-800 rounded-bl-none'
                }`}>
                  <p>{entry.text}</p>
                  <p className={`text-xs mt-1 ${entry.role === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>
                    {entry.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}

            {currentText && (
              <div className="mb-4 flex justify-start">
                <div className="max-w-[80%] px-4 py-3 rounded-2xl bg-white shadow-md text-gray-600 rounded-bl-none italic">
                  {currentText}
                  <span className="inline-block w-2 h-4 ml-1 bg-blue-500 animate-pulse" />
                </div>
              </div>
            )}

            <div ref={transcriptEndRef} />
          </div>

          {/* Controls */}
          <div className="p-6 border-t bg-white">
            {!sessionId ? (
              /* Start Button */
              <button
                onClick={startSession}
                disabled={status === 'connecting'}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-lg flex items-center justify-center gap-3 hover:opacity-90 transition disabled:opacity-50"
              >
                {status === 'connecting' ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Phone className="w-6 h-6" />
                    Start Call
                  </>
                )}
              </button>
            ) : (
              /* Active Call Controls */
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Mute Button */}
                  <button
                    onClick={toggleMute}
                    className={`p-4 rounded-full transition ${
                      isMuted ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                  </button>

                  {/* Volume */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-full">
                    <Volume2 className="w-5 h-5 text-gray-500" />
                    <input
                      type="range"
                      min="0"
                      max="100"
                      defaultValue="80"
                      className="w-20"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Interrupt Button */}
                  {status === 'speaking' && (
                    <button
                      onClick={interrupt}
                      className="p-4 rounded-full bg-yellow-100 text-yellow-600 hover:bg-yellow-200 transition"
                      title="Interrupt AI"
                    >
                      <Hand className="w-6 h-6" />
                    </button>
                  )}

                  {/* End Call Button */}
                  <button
                    onClick={endSession}
                    className="px-6 py-4 rounded-xl bg-red-500 text-white font-bold flex items-center gap-2 hover:bg-red-600 transition"
                  >
                    <PhoneOff className="w-6 h-6" />
                    End Call
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Mic className="h-5 w-5 text-blue-400" />
              How to Test
            </h3>
            <ol className="space-y-2 text-white/80 text-sm">
              <li>1. Click the <strong>"Start Call"</strong> button above</li>
              <li>2. Allow microphone access when prompted</li>
              <li>3. Speak naturally into your microphone</li>
              <li>4. Watch your words appear in real-time</li>
              <li>5. AI will respond with voice</li>
              <li>6. Click "End Call" when done</li>
            </ol>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Headphones className="h-5 w-5 text-purple-400" />
              Features
            </h3>
            <ul className="space-y-2 text-white/80 text-sm">
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                OpenAI GPT-4o Realtime Voice
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Live Speech Transcription
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Natural Voice Response
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Interrupt AI Anytime
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealtimeTestPage;
