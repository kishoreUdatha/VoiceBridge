import { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Volume2,
  Loader2,
  AlertCircle,
  MessageSquare,
  Wifi,
  WifiOff,
  Hand,
  Settings,
  X,
  ChevronDown,
} from 'lucide-react';
import { useRealtimeVoice } from '../hooks/useRealtimeVoice';
import type {
  VoiceSessionMode,
  RealtimeStatus,
  TranscriptEntry,
  RealtimeVoiceWidgetProps,
  RealtimeEndedPayload,
} from '../types/realtime.types';

const statusLabels: Record<RealtimeStatus, string> = {
  idle: 'Ready',
  connecting: 'Connecting...',
  connected: 'Connected',
  listening: 'Listening...',
  thinking: 'Processing...',
  speaking: 'Speaking...',
  error: 'Error',
  disconnected: 'Disconnected',
};

const statusColors: Record<RealtimeStatus, string> = {
  idle: 'bg-gray-400',
  connecting: 'bg-yellow-400 animate-pulse',
  connected: 'bg-green-500',
  listening: 'bg-blue-500 animate-pulse',
  thinking: 'bg-purple-500 animate-pulse',
  speaking: 'bg-green-500',
  error: 'bg-red-500',
  disconnected: 'bg-gray-400',
};

const modeLabels: Record<VoiceSessionMode, string> = {
  BATCH: 'Standard',
  REALTIME: 'Realtime',
  WEBRTC: 'WebRTC',
};

export function RealtimeVoiceWidget({
  agentId,
  onSessionEnd,
  onError,
  defaultMode = 'REALTIME',
  showModeSelector = true,
  position = 'bottom-right',
  theme = {},
  visitorInfo,
  startExpanded = false,
  testMode = false,
}: RealtimeVoiceWidgetProps & { startExpanded?: boolean }) {
  const [isExpanded, setIsExpanded] = useState(startExpanded);
  const [selectedMode, setSelectedMode] = useState<VoiceSessionMode>(defaultMode);
  const [showSettings, setShowSettings] = useState(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const {
    isConnected,
    status,
    sessionId,
    transcripts,
    currentUserText,
    currentAssistantText,
    error,
    isRecording,
    isMuted,
    volume,
    startSession,
    startRecording,
    interrupt,
    endSession,
    toggleMute,
    setVolume,
  } = useRealtimeVoice({
    agentId,
    mode: selectedMode,
    testMode,
    onSessionEnd: (result: RealtimeEndedPayload) => {
      onSessionEnd?.(result);
    },
    onError: (err) => {
      onError?.(err);
    },
  });

  // Auto-scroll to bottom of transcripts
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts, currentUserText, currentAssistantText]);

  const handleStartCall = async () => {
    await startSession(visitorInfo);
    await startRecording();
  };

  const handleEndCall = () => {
    endSession('user');
    setIsExpanded(false);
  };

  const handleInterrupt = () => {
    interrupt();
  };

  const primaryColor = theme.primaryColor || '#3B82F6';
  const backgroundColor = theme.backgroundColor || '#ffffff';
  const textColor = theme.textColor || '#1f2937';

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
  };

  if (!isExpanded) {
    // Floating button
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={`fixed ${positionClasses[position]} z-50 flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-300 hover:scale-110`}
        style={{ backgroundColor: primaryColor }}
        title="Start Voice Call"
      >
        <Mic className="w-6 h-6 text-white" />
      </button>
    );
  }

  return (
    <div
      className={`fixed ${positionClasses[position]} z-50 w-96 max-w-[calc(100vw-2rem)] rounded-2xl shadow-2xl overflow-hidden transition-all duration-300`}
      style={{ backgroundColor }}
    >
      {/* Header */}
      <div
        className="p-4 text-white flex items-center justify-between"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${statusColors[status]}`} />
          <span className="font-medium">{statusLabels[status]}</span>
        </div>
        <div className="flex items-center gap-2">
          {showModeSelector && !sessionId && (
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-1.5 rounded-full hover:bg-white/20 transition"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setIsExpanded(false)}
            className="p-1.5 rounded-full hover:bg-white/20 transition"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (sessionId) endSession('user');
              setIsExpanded(false);
            }}
            className="p-1.5 rounded-full hover:bg-white/20 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && !sessionId && (
        <div className="p-4 border-b" style={{ color: textColor }}>
          <h3 className="text-sm font-medium mb-2">Connection Mode</h3>
          <div className="flex gap-2">
            {(['REALTIME', 'WEBRTC', 'BATCH'] as VoiceSessionMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setSelectedMode(mode)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  selectedMode === mode
                    ? 'text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={selectedMode === mode ? { backgroundColor: primaryColor } : undefined}
              >
                {modeLabels[mode]}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {selectedMode === 'REALTIME' && 'Ultra-low latency voice streaming'}
            {selectedMode === 'WEBRTC' && 'Direct peer-to-peer connection'}
            {selectedMode === 'BATCH' && 'Standard recording mode'}
          </p>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="px-4 py-2 bg-red-50 text-red-700 flex items-center gap-2 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{error}</span>
        </div>
      )}

      {/* Transcript Area */}
      <div
        className="h-64 overflow-y-auto p-4 space-y-3"
        style={{ color: textColor }}
      >
        {transcripts.length === 0 && !sessionId && (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <MessageSquare className="w-12 h-12 mb-2" />
            <p className="text-sm">Start a conversation</p>
          </div>
        )}

        {transcripts.map((entry) => (
          <TranscriptBubble key={entry.id} entry={entry} primaryColor={primaryColor} />
        ))}

        {/* Streaming text */}
        {currentUserText && (
          <div className="flex justify-end">
            <div className="max-w-[80%] px-4 py-2 rounded-2xl rounded-br-none bg-gray-100 text-gray-600 italic">
              {currentUserText}
              <span className="inline-block w-1 h-4 ml-1 bg-gray-400 animate-pulse" />
            </div>
          </div>
        )}

        {currentAssistantText && (
          <div className="flex justify-start">
            <div
              className="max-w-[80%] px-4 py-2 rounded-2xl rounded-bl-none text-white italic"
              style={{ backgroundColor: primaryColor }}
            >
              {currentAssistantText}
              <span className="inline-block w-1 h-4 ml-1 bg-white/50 animate-pulse" />
            </div>
          </div>
        )}

        <div ref={transcriptEndRef} />
      </div>

      {/* Controls */}
      <div className="p-4 border-t" style={{ borderColor: '#e5e7eb' }}>
        {!sessionId ? (
          // Start call button
          <button
            onClick={handleStartCall}
            disabled={status === 'connecting'}
            className="w-full py-3 rounded-xl text-white font-medium flex items-center justify-center gap-2 transition hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: primaryColor }}
          >
            {status === 'connecting' ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Phone className="w-5 h-5" />
                Start Call
              </>
            )}
          </button>
        ) : (
          // Active call controls
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Mute button */}
              <button
                onClick={toggleMute}
                className={`p-3 rounded-full transition ${
                  isMuted ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {/* Volume slider */}
              <div className="flex items-center gap-1 px-2">
                <Volume2 className="w-4 h-4 text-gray-400" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-16 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Interrupt button */}
              {status === 'speaking' && (
                <button
                  onClick={handleInterrupt}
                  className="p-3 rounded-full bg-yellow-100 text-yellow-600 hover:bg-yellow-200 transition"
                  title="Interrupt"
                >
                  <Hand className="w-5 h-5" />
                </button>
              )}

              {/* End call button */}
              <button
                onClick={handleEndCall}
                className="p-3 rounded-full bg-red-500 text-white hover:bg-red-600 transition"
                title="End Call"
              >
                <PhoneOff className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Status indicator */}
        {sessionId && (
          <div className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-500">
            {isConnected ? (
              <Wifi className="w-3 h-3 text-green-500" />
            ) : (
              <WifiOff className="w-3 h-3 text-red-500" />
            )}
            <span>
              {selectedMode} Mode
              {isRecording && ' | Recording'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// Transcript bubble component
function TranscriptBubble({
  entry,
  primaryColor,
}: {
  entry: TranscriptEntry;
  primaryColor: string;
}) {
  const isUser = entry.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] px-4 py-2 rounded-2xl ${
          isUser
            ? 'rounded-br-none bg-gray-100 text-gray-800'
            : 'rounded-bl-none text-white'
        }`}
        style={!isUser ? { backgroundColor: primaryColor } : undefined}
      >
        <p className="text-sm">{entry.text}</p>
        <p className={`text-xs mt-1 ${isUser ? 'text-gray-400' : 'text-white/70'}`}>
          {new Date(entry.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
}

// Demo page component
export function RealtimeVoiceDemo() {
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [agents, setAgents] = useState<Array<{ id: string; name: string }>>([]);
  const [sessionResult, setSessionResult] = useState<RealtimeEndedPayload | null>(null);

  useEffect(() => {
    // Fetch agents using cookies for authentication
    const fetchAgents = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/voice-ai/agents`,
          {
            credentials: 'include', // Send cookies for authentication
          }
        );
        if (response.ok) {
          const data = await response.json();
          setAgents(data);
          if (data.length > 0) {
            setSelectedAgent(data[0].id);
          }
        }
      } catch (error) {
        console.error('Failed to fetch agents:', error);
      }
    };

    fetchAgents();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Realtime Voice Demo
        </h1>
        <p className="text-gray-600 mb-8">
          Test the AI voice agent with ultra-low latency realtime streaming.
        </p>

        {/* Agent Selection */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Select Agent</h2>
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="w-full p-3 border rounded-lg"
          >
            <option value="">Select an agent...</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
        </div>

        {/* Session Result */}
        {sessionResult && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4">Session Result</h2>
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium">Duration:</span>{' '}
                {Math.floor(sessionResult.duration / 60)}m {sessionResult.duration % 60}s
              </p>
              <p>
                <span className="font-medium">Sentiment:</span>{' '}
                <span
                  className={`px-2 py-0.5 rounded text-white ${
                    sessionResult.sentiment === 'positive'
                      ? 'bg-green-500'
                      : sessionResult.sentiment === 'negative'
                      ? 'bg-red-500'
                      : 'bg-gray-500'
                  }`}
                >
                  {sessionResult.sentiment || 'neutral'}
                </span>
              </p>
              {sessionResult.summary && (
                <p>
                  <span className="font-medium">Summary:</span> {sessionResult.summary}
                </p>
              )}
              {sessionResult.leadId && (
                <p>
                  <span className="font-medium">Lead Created:</span>{' '}
                  <a href={`/leads/${sessionResult.leadId}`} className="text-blue-600 hover:underline">
                    View Lead
                  </a>
                </p>
              )}
              {sessionResult.qualification && Object.keys(sessionResult.qualification).length > 0 && (
                <div>
                  <span className="font-medium">Qualification Data:</span>
                  <pre className="mt-1 p-2 bg-gray-50 rounded text-xs overflow-auto">
                    {JSON.stringify(sessionResult.qualification, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">
            How to Use
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-blue-800">
            <li>Select an agent from the dropdown above</li>
            <li>Click the microphone button in the bottom-right corner</li>
            <li>Choose your connection mode (Realtime recommended)</li>
            <li>Click "Start Call" to begin the conversation</li>
            <li>Speak naturally - your words will be transcribed in real-time</li>
            <li>Use the interrupt button to cut off the AI while speaking</li>
            <li>Click the red phone button to end the call</li>
          </ol>
        </div>
      </div>

      {/* Widget */}
      {selectedAgent && (
        <RealtimeVoiceWidget
          agentId={selectedAgent}
          onSessionEnd={(result) => {
            setSessionResult(result);
          }}
          onError={(error) => {
            console.error('Voice error:', error);
          }}
          showModeSelector={true}
          theme={{
            primaryColor: '#3B82F6',
          }}
        />
      )}
    </div>
  );
}

export default RealtimeVoiceWidget;
