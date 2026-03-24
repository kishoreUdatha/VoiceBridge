import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX, X, Minimize2, Maximize2 } from 'lucide-react';

interface VoiceWidgetProps {
  agentId: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  primaryColor?: string;
  title?: string;
  subtitle?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface PreChatFormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'textarea';
  required: boolean;
  placeholder?: string;
}

interface VisitorInfo {
  name?: string;
  email?: string;
  phone?: string;
  [key: string]: string | undefined;
}

// API URL from environment - falls back to relative URL in production
const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3000/api');

export const VoiceWidget: React.FC<VoiceWidgetProps> = ({
  agentId,
  position = 'bottom-right',
  primaryColor = '#3B82F6',
  title = 'Voice Assistant',
  subtitle = 'Click to start talking',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [agentInfo, setAgentInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Pre-chat form state
  const [showPreChatForm, setShowPreChatForm] = useState(false);
  const [visitorInfo, setVisitorInfo] = useState<VisitorInfo>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Position styles
  const positionStyles: Record<string, React.CSSProperties> = {
    'bottom-right': { bottom: '20px', right: '20px' },
    'bottom-left': { bottom: '20px', left: '20px' },
    'top-right': { top: '20px', right: '20px' },
    'top-left': { top: '20px', left: '20px' },
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch agent info
  useEffect(() => {
    const fetchAgentInfo = async () => {
      try {
        const response = await fetch(`${API_URL}/voice-ai/widget/${agentId}`);
        const data = await response.json();
        if (data.success) {
          setAgentInfo(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch agent info:', err);
      }
    };

    if (agentId) {
      fetchAgentInfo();
    }
  }, [agentId]);

  // Check if pre-chat form is required before starting session
  const handleStartCall = () => {
    if (agentInfo?.authenticationRequired || agentInfo?.preChatFormEnabled) {
      setShowPreChatForm(true);
      setFormErrors({});
    } else {
      startSession();
    }
  };

  // Validate pre-chat form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    const fields: PreChatFormField[] = agentInfo?.preChatFormFields || [];

    for (const field of fields) {
      const value = visitorInfo[field.name]?.trim();

      if (field.required && !value) {
        errors[field.name] = `${field.label} is required`;
      } else if (value) {
        // Email validation
        if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors[field.name] = 'Please enter a valid email';
        }
        // Phone validation (basic)
        if (field.type === 'tel' && !/^[+]?[\d\s-]{10,}$/.test(value.replace(/\s/g, ''))) {
          errors[field.name] = 'Please enter a valid phone number';
        }
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit pre-chat form and start session
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setShowPreChatForm(false);
    await startSession(visitorInfo);
  };

  // Start session
  const startSession = async (visitorData?: VisitorInfo) => {
    try {
      setError(null);
      const response = await fetch(`${API_URL}/voice-ai/session/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          visitorInfo: visitorData || visitorInfo,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSessionId(data.data.sessionId);
        setIsConnected(true);

        // Personalize greeting with visitor name
        let greeting = data.data.greeting || '';
        if (visitorData?.name && greeting) {
          // Replace {{name}} placeholder if exists, or prepend name
          if (greeting.includes('{{name}}')) {
            greeting = greeting.replace('{{name}}', visitorData.name);
          }
        }

        // Add greeting message
        if (greeting) {
          setMessages([{
            role: 'assistant',
            content: greeting,
            timestamp: new Date(),
          }]);

          // Play greeting audio
          await playTextAsAudio(greeting);
        }
      } else {
        // Check if pre-chat form is required
        if (data.error?.code === 'PRE_CHAT_REQUIRED') {
          setShowPreChatForm(true);
        } else {
          setError(data.message);
        }
      }
    } catch (err) {
      setError('Failed to start session');
      console.error(err);
    }
  };

  // End session
  const endSession = async () => {
    if (sessionId) {
      try {
        await fetch(`${API_URL}/voice-ai/session/${sessionId}/end`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'COMPLETED' }),
        });
      } catch (err) {
        console.error('Failed to end session:', err);
      }
    }

    setSessionId(null);
    setIsConnected(false);
    setMessages([]);
    stopListening();
  };

  // Start listening
  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await sendAudioMessage(audioBlob);

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsListening(true);
    } catch (err) {
      setError('Microphone access denied');
      console.error(err);
    }
  };

  // Stop listening
  const stopListening = () => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  };

  // Send audio message
  const sendAudioMessage = async (audioBlob: Blob) => {
    if (!sessionId) return;

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');

      const response = await fetch(`${API_URL}/voice-ai/session/${sessionId}/message`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        // Add user message
        setMessages(prev => [...prev, {
          role: 'user',
          content: data.data.userMessage,
          timestamp: new Date(),
        }]);

        // Add assistant message
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.data.response,
          timestamp: new Date(),
        }]);

        // Play audio response
        if (data.data.audio && !isMuted) {
          await playAudioFromBase64(data.data.audio);
        }

        // Check if conversation should end
        if (data.data.shouldEnd) {
          setTimeout(() => endSession(), 2000);
        }
      }
    } catch (err) {
      console.error('Failed to send audio:', err);
    }
  };

  // Play audio from base64
  const playAudioFromBase64 = async (base64Audio: string) => {
    try {
      setIsSpeaking(true);

      const audioData = atob(base64Audio);
      const arrayBuffer = new ArrayBuffer(audioData.length);
      const view = new Uint8Array(arrayBuffer);
      for (let i = 0; i < audioData.length; i++) {
        view[i] = audioData.charCodeAt(i);
      }

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);

      source.onended = () => {
        setIsSpeaking(false);
      };

      source.start();
    } catch (err) {
      console.error('Failed to play audio:', err);
      setIsSpeaking(false);
    }
  };

  // Play text as audio (TTS)
  const playTextAsAudio = async (text: string) => {
    if (isMuted) return;

    try {
      setIsSpeaking(true);

      const response = await fetch(`${API_URL}/voice-ai/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice: agentInfo?.voiceId || 'alloy'
        }),
      });

      const arrayBuffer = await response.arrayBuffer();

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);

      source.onended = () => {
        setIsSpeaking(false);
      };

      source.start();
    } catch (err) {
      console.error('Failed to play TTS:', err);
      setIsSpeaking(false);
    }
  };

  // Toggle widget
  const toggleWidget = () => {
    if (!isOpen) {
      setIsOpen(true);
      setIsMinimized(false);
    } else if (!isMinimized) {
      setIsMinimized(true);
    } else {
      setIsMinimized(false);
    }
  };

  // Close widget
  const closeWidget = () => {
    if (isConnected) {
      endSession();
    }
    setIsOpen(false);
    setIsMinimized(false);
  };

  // Toggle call
  const toggleCall = () => {
    if (isConnected) {
      endSession();
    } else {
      handleStartCall();
    }
  };

  // Toggle microphone
  const toggleMic = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const effectiveColor = agentInfo?.widgetColor || primaryColor;
  const effectiveTitle = agentInfo?.widgetTitle || title;
  const effectiveSubtitle = agentInfo?.widgetSubtitle || subtitle;

  return (
    <div style={{
      position: 'fixed',
      zIndex: 9999,
      ...positionStyles[agentInfo?.widgetPosition || position]
    }}>
      {/* Main Widget */}
      {isOpen && (
        <div style={{
          width: isMinimized ? '300px' : '380px',
          height: isMinimized ? '60px' : '500px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          marginBottom: '10px',
          transition: 'all 0.3s ease',
        }}>
          {/* Header */}
          <div style={{
            backgroundColor: effectiveColor,
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: 'white',
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                {effectiveTitle}
              </h3>
              {!isMinimized && (
                <p style={{ margin: '4px 0 0', fontSize: '12px', opacity: 0.9 }}>
                  {isConnected ? 'Connected' : effectiveSubtitle}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={toggleWidget}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  color: 'white',
                }}
              >
                {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
              </button>
              <button
                onClick={closeWidget}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  color: 'white',
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Body */}
          {!isMinimized && (
            <>
              {/* Pre-chat Form */}
              {showPreChatForm && (
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '20px',
                  backgroundColor: '#f9fafb',
                }}>
                  <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <h4 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 600, color: '#1f2937' }}>
                      {agentInfo?.preChatFormTitle || 'Before we start'}
                    </h4>
                    <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
                      {agentInfo?.preChatFormSubtitle || 'Please provide your details'}
                    </p>
                  </div>

                  <form onSubmit={handleFormSubmit}>
                    {(agentInfo?.preChatFormFields || []).map((field: PreChatFormField) => (
                      <div key={field.name} style={{ marginBottom: '16px' }}>
                        <label
                          htmlFor={field.name}
                          style={{
                            display: 'block',
                            fontSize: '13px',
                            fontWeight: 500,
                            color: '#374151',
                            marginBottom: '6px',
                          }}
                        >
                          {field.label}
                          {field.required && <span style={{ color: '#dc2626', marginLeft: '4px' }}>*</span>}
                        </label>
                        <input
                          id={field.name}
                          type={field.type === 'textarea' ? 'text' : field.type}
                          placeholder={field.placeholder || `Enter your ${field.label.toLowerCase()}`}
                          value={visitorInfo[field.name] || ''}
                          onChange={(e) => setVisitorInfo({ ...visitorInfo, [field.name]: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            fontSize: '14px',
                            border: formErrors[field.name] ? '1px solid #dc2626' : '1px solid #d1d5db',
                            borderRadius: '8px',
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        />
                        {formErrors[field.name] && (
                          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#dc2626' }}>
                            {formErrors[field.name]}
                          </p>
                        )}
                      </div>
                    ))}

                    <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                      <button
                        type="button"
                        onClick={() => setShowPreChatForm(false)}
                        style={{
                          flex: 1,
                          padding: '12px',
                          fontSize: '14px',
                          fontWeight: 500,
                          backgroundColor: '#f3f4f6',
                          color: '#374151',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        style={{
                          flex: 1,
                          padding: '12px',
                          fontSize: '14px',
                          fontWeight: 500,
                          backgroundColor: effectiveColor,
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                        }}
                      >
                        Start Conversation
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Messages */}
              {!showPreChatForm && (
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px',
                backgroundColor: '#f9fafb',
              }}>
                {messages.length === 0 && !isConnected && (
                  <div style={{
                    textAlign: 'center',
                    color: '#6b7280',
                    padding: '40px 20px',
                  }}>
                    <Volume2 size={48} style={{ opacity: 0.5, marginBottom: '16px' }} />
                    <p>Click the call button to start a voice conversation</p>
                  </div>
                )}

                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                      marginBottom: '12px',
                    }}
                  >
                    <div style={{
                      maxWidth: '80%',
                      padding: '12px 16px',
                      borderRadius: '16px',
                      backgroundColor: msg.role === 'user' ? effectiveColor : '#ffffff',
                      color: msg.role === 'user' ? '#ffffff' : '#1f2937',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    }}>
                      <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.5 }}>
                        {msg.content}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              )}

              {/* Error */}
              {error && (
                <div style={{
                  padding: '8px 16px',
                  backgroundColor: '#fef2f2',
                  color: '#dc2626',
                  fontSize: '12px',
                }}>
                  {error}
                </div>
              )}

              {/* Controls */}
              <div style={{
                padding: '16px',
                backgroundColor: '#ffffff',
                borderTop: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'center',
                gap: '16px',
              }}>
                {/* Mute button */}
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: isMuted ? '#fee2e2' : '#f3f4f6',
                    color: isMuted ? '#dc2626' : '#6b7280',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>

                {/* Call button */}
                <button
                  onClick={toggleCall}
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: isConnected ? '#dc2626' : effectiveColor,
                    color: '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  }}
                >
                  {isConnected ? <PhoneOff size={28} /> : <Phone size={28} />}
                </button>

                {/* Mic button */}
                <button
                  onClick={toggleMic}
                  disabled={!isConnected || isSpeaking}
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: isListening ? '#dc2626' : '#f3f4f6',
                    color: isListening ? '#ffffff' : '#6b7280',
                    cursor: isConnected && !isSpeaking ? 'pointer' : 'not-allowed',
                    opacity: isConnected ? 1 : 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
              </div>

              {/* Status */}
              <div style={{
                padding: '8px',
                textAlign: 'center',
                fontSize: '12px',
                color: '#6b7280',
                backgroundColor: '#f9fafb',
              }}>
                {isSpeaking && '🔊 Speaking...'}
                {isListening && '🎤 Listening...'}
                {isConnected && !isSpeaking && !isListening && '⏸️ Hold mic button to speak'}
                {!isConnected && 'Click call button to start'}
              </div>
            </>
          )}
        </div>
      )}

      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: effectiveColor,
            color: '#ffffff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}
        >
          <Phone size={24} />
        </button>
      )}
    </div>
  );
};

export default VoiceWidget;
