/**
 * WebRTC Test Modal Component
 * Real-time voice testing using WebRTC (FREE - no phone charges)
 * Works with DRAFT agents for testing before publishing
 */

import { useState, useEffect, useRef } from 'react';
import {
  X,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Volume2,
  VolumeX,
  Loader2,
  Waves,
  AlertCircle,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import { useRealtimeVoice } from '../../../../hooks/useRealtimeVoice';
import { TranscriptEntry } from '../../../../types/realtime.types';

interface WebRTCTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentId: string;
  agentName: string;
  agentStatus: 'DRAFT' | 'PUBLISHED';
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  idle: { label: 'Ready to Test', color: 'text-gray-600', bgColor: 'bg-gray-100', icon: <Phone className="w-4 h-4" /> },
  connecting: { label: 'Connecting...', color: 'text-amber-600', bgColor: 'bg-amber-50', icon: <Loader2 className="w-4 h-4 animate-spin" /> },
  connected: { label: 'Connected', color: 'text-green-600', bgColor: 'bg-green-50', icon: <CheckCircle2 className="w-4 h-4" /> },
  listening: { label: 'Listening...', color: 'text-emerald-600', bgColor: 'bg-emerald-50', icon: <Mic className="w-4 h-4 animate-pulse" /> },
  processing: { label: 'Thinking...', color: 'text-purple-600', bgColor: 'bg-purple-50', icon: <Loader2 className="w-4 h-4 animate-spin" /> },
  speaking: { label: 'Speaking...', color: 'text-blue-600', bgColor: 'bg-blue-50', icon: <Waves className="w-4 h-4" /> },
  disconnected: { label: 'Disconnected', color: 'text-gray-500', bgColor: 'bg-gray-100', icon: <PhoneOff className="w-4 h-4" /> },
};

export function WebRTCTestModal({
  isOpen,
  onClose,
  agentId,
  agentName,
  agentStatus,
}: WebRTCTestModalProps) {
  const [isSessionStarted, setIsSessionStarted] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    isConnected,
    status,
    transcripts,
    currentUserText,
    currentAssistantText,
    error,
    isRecording,
    isMuted,
    volume,
    connect,
    startSession,
    startRecording,
    stopRecording,
    interrupt,
    endSession,
    toggleMute,
    setVolume,
  } = useRealtimeVoice({
    agentId,
    mode: 'REALTIME',
    testMode: true, // Enable test mode to bypass PUBLISHED check
    onError: (err) => {
      console.error('[WebRTCTest] Error:', err);
      setLocalError(err.message);
    },
    onSessionEnd: () => {
      console.log('[WebRTCTest] Session ended');
      setIsSessionStarted(false);
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts, currentUserText, currentAssistantText]);

  // Cleanup on close
  useEffect(() => {
    if (!isOpen) {
      if (isSessionStarted) {
        endSession('user');
      }
      setIsSessionStarted(false);
      setLocalError(null);
    }
  }, [isOpen, isSessionStarted, endSession]);

  const handleStartTest = async () => {
    try {
      setLocalError(null);
      await connect();
      await startSession();
      setIsSessionStarted(true);
      // Auto-start recording after session starts
      setTimeout(() => {
        startRecording();
      }, 500);
    } catch (err: any) {
      setLocalError(err.message || 'Failed to start test');
    }
  };

  const handleEndTest = () => {
    endSession('user');
    setIsSessionStarted(false);
  };

  const handleClose = () => {
    if (isSessionStarted) {
      endSession('user');
    }
    onClose();
  };

  const currentStatus = statusConfig[status] || statusConfig.idle;
  const displayError = localError || error;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed right-0 top-0 h-full w-[460px] bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-gray-200 bg-gradient-to-r from-violet-600 to-purple-600">
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-white">{agentName}</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/80">WebRTC Test</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    agentStatus === 'DRAFT'
                      ? 'bg-amber-400/20 text-amber-100'
                      : 'bg-green-400/20 text-green-100'
                  }`}>
                    {agentStatus}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="flex-shrink-0 px-4 py-3 bg-violet-50 border-b border-violet-100">
          <div className="flex items-start gap-2">
            <Zap className="w-4 h-4 text-violet-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-violet-700">
              <span className="font-medium">FREE WebRTC Test</span> - No phone charges.
              Audio streams directly through your browser.
              {agentStatus === 'DRAFT' && (
                <span className="block mt-1 text-amber-600">
                  Testing DRAFT agent - publish when ready for production.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Error Banner */}
        {displayError && (
          <div className="flex-shrink-0 px-4 py-3 bg-red-50 border-b border-red-100 flex items-center gap-2 text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{displayError}</span>
          </div>
        )}

        {/* Status Bar */}
        {isSessionStarted && (
          <div className={`flex-shrink-0 px-4 py-2 ${currentStatus.bgColor} border-b flex items-center justify-center gap-2`}>
            {currentStatus.icon}
            <span className={`text-sm font-medium ${currentStatus.color}`}>
              {currentStatus.label}
            </span>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-5 bg-gray-50">
          {!isSessionStarted ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center mb-5">
                <Zap className="w-10 h-10 text-violet-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">WebRTC Voice Test</h3>
              <p className="text-sm text-gray-500 mb-4">
                Test your AI agent with real-time voice streaming.
                <span className="block mt-1 font-medium text-green-600">
                  No phone charges - completely FREE!
                </span>
              </p>
              <div className="text-xs text-gray-400 space-y-1">
                <p>Uses OpenAI Realtime API</p>
                <p>Full duplex audio streaming</p>
                <p>Interrupt the agent anytime</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {transcripts.map((entry: TranscriptEntry) => (
                <div
                  key={entry.id}
                  className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      entry.role === 'user'
                        ? 'bg-violet-600 text-white rounded-br-sm'
                        : 'bg-white shadow-sm border border-gray-100 text-gray-800 rounded-bl-sm'
                    }`}
                  >
                    <p>{entry.text}</p>
                    <p className={`text-[10px] mt-1.5 ${
                      entry.role === 'user' ? 'text-violet-200' : 'text-gray-400'
                    }`}>
                      {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}

              {/* Current user transcript (interim) */}
              {currentUserText && (
                <div className="flex justify-end">
                  <div className="max-w-[85%] px-4 py-3 rounded-2xl rounded-br-sm bg-violet-100 text-violet-800 text-sm italic">
                    {currentUserText}
                    <span className="inline-block w-1 h-4 ml-1 bg-violet-500 animate-pulse" />
                  </div>
                </div>
              )}

              {/* Current assistant transcript (interim) */}
              {currentAssistantText && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] px-4 py-3 rounded-2xl rounded-bl-sm bg-white shadow-sm border border-gray-100 text-gray-600 text-sm italic">
                    {currentAssistantText}
                    <span className="inline-block w-1 h-4 ml-1 bg-gray-400 animate-pulse" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex-shrink-0 p-5 border-t border-gray-200 bg-white">
          {!isSessionStarted ? (
            <button
              onClick={handleStartTest}
              disabled={status === 'connecting'}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold flex items-center justify-center gap-2 hover:from-violet-700 hover:to-purple-700 transition-all disabled:opacity-50 shadow-lg shadow-violet-500/25"
            >
              {status === 'connecting' ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Start WebRTC Test
                </>
              )}
            </button>
          ) : (
            <div className="space-y-3">
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

                {/* Interrupt Button */}
                <button
                  onClick={interrupt}
                  disabled={status !== 'speaking'}
                  className="p-3.5 rounded-xl bg-amber-100 text-amber-600 hover:bg-amber-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Interrupt agent"
                >
                  <Waves className="w-5 h-5" />
                </button>

                {/* End Call Button */}
                <button
                  onClick={handleEndTest}
                  className="flex-1 py-3.5 rounded-xl bg-red-500 text-white font-semibold flex items-center justify-center gap-2 hover:bg-red-600 transition-all"
                >
                  <PhoneOff className="w-5 h-5" />
                  End Test
                </button>

                {/* Volume Button */}
                <button
                  onClick={() => setVolume(volume === 0 ? 1 : 0)}
                  className="p-3.5 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
                  title={volume === 0 ? 'Unmute speaker' : 'Mute speaker'}
                >
                  {volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
              </div>

              {/* Recording Status */}
              <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                {isRecording ? 'Recording active' : 'Recording paused'}
              </div>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="flex-shrink-0 px-5 py-3 bg-gray-50 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Powered by OpenAI Realtime</span>
            <span className="text-green-600 font-medium">No phone charges</span>
          </div>
        </div>
      </div>
    </>
  );
}

export default WebRTCTestModal;
