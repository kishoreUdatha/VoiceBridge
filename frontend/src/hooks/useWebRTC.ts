import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  WebRTCState,
  WebRTCOfferPayload,
  WebRTCAnswerPayload,
  WebRTCIceCandidatePayload,
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

interface UseWebRTCOptions {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: string) => void;
  onRemoteStream?: (stream: MediaStream) => void;
}

export function useWebRTC(options: UseWebRTCOptions = {}) {
  const { onConnect, onDisconnect, onError, onRemoteStream } = options;

  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [state, setState] = useState<WebRTCState>({
    isConnected: false,
    peerId: null,
    connectionState: null,
    iceConnectionState: null,
    localStream: null,
    remoteStream: null,
    error: null,
  });

  // Update state helper
  const updateState = useCallback((updates: Partial<WebRTCState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Get ICE servers from server
  const [iceServers, setIceServers] = useState<RTCIceServer[]>([
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]);

  // Connect to signaling server
  const connectSignaling = useCallback(() => {
    if (socketRef.current?.connected) return;

    // Use cookies for authentication instead of localStorage
    const socket = io(SOCKET_URL, {
      withCredentials: true, // Send cookies for authentication
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[WebRTC] Signaling connected');
      // Request ICE server config
      socket.emit('webrtc:config');
    });

    socket.on('disconnect', () => {
      console.log('[WebRTC] Signaling disconnected');
      cleanup();
    });

    socket.on('webrtc:config', (config: { iceServers: RTCIceServer[]; isServerSideEnabled: boolean }) => {
      console.log('[WebRTC] Received config:', config);
      if (config.iceServers?.length) {
        setIceServers(config.iceServers);
      }
    });

    socket.on('webrtc:answer', async (data: WebRTCAnswerPayload) => {
      console.log('[WebRTC] Received answer');
      if (pcRef.current) {
        try {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        } catch (error) {
          console.error('[WebRTC] Error setting remote description:', error);
        }
      }
    });

    socket.on('webrtc:ice', async (data: WebRTCIceCandidatePayload) => {
      console.log('[WebRTC] Received ICE candidate');
      if (pcRef.current && data.candidate) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (error) {
          console.error('[WebRTC] Error adding ICE candidate:', error);
        }
      }
    });

    socket.on('webrtc:error', (data: { message: string }) => {
      console.error('[WebRTC] Error:', data.message);
      updateState({ error: data.message });
      onError?.(data.message);
    });
  }, [updateState, onError]);

  // Create peer connection
  const createPeerConnection = useCallback(() => {
    const config: RTCConfiguration = {
      iceServers,
      iceCandidatePoolSize: 10,
    };

    const pc = new RTCPeerConnection(config);
    pcRef.current = pc;

    // Generate peer ID
    const peerId = `peer-${Date.now().toString(36)}`;
    updateState({ peerId });

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('[WebRTC] Sending ICE candidate');
        socketRef.current?.emit('webrtc:ice', {
          peerId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', pc.connectionState);
      updateState({ connectionState: pc.connectionState });

      if (pc.connectionState === 'connected') {
        updateState({ isConnected: true });
        onConnect?.();
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        updateState({ isConnected: false });
        onDisconnect?.();
      }
    };

    // Handle ICE connection state changes
    pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE connection state:', pc.iceConnectionState);
      updateState({ iceConnectionState: pc.iceConnectionState });
    };

    // Handle incoming tracks
    pc.ontrack = (event) => {
      console.log('[WebRTC] Received remote track:', event.track.kind);
      if (event.streams && event.streams[0]) {
        updateState({ remoteStream: event.streams[0] });
        onRemoteStream?.(event.streams[0]);
      }
    };

    return pc;
  }, [iceServers, updateState, onConnect, onDisconnect, onRemoteStream]);

  // Start connection
  const connect = useCallback(async () => {
    try {
      // Connect signaling if not connected
      if (!socketRef.current?.connected) {
        connectSignaling();
        // Wait for connection
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Get local media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      localStreamRef.current = stream;
      updateState({ localStream: stream });

      // Create peer connection
      const pc = createPeerConnection();

      // Add local tracks
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Create offer
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
      });
      await pc.setLocalDescription(offer);

      // Send offer to server
      console.log('[WebRTC] Sending offer');
      socketRef.current?.emit('webrtc:offer', {
        peerId: state.peerId,
        offer: {
          type: offer.type,
          sdp: offer.sdp,
        },
      } as WebRTCOfferPayload);

    } catch (error) {
      console.error('[WebRTC] Connection error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      updateState({ error: errorMessage });
      onError?.(errorMessage);
    }
  }, [connectSignaling, createPeerConnection, state.peerId, updateState, onError]);

  // Cleanup
  const cleanup = useCallback(() => {
    // Stop local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    // Close peer connection
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    updateState({
      isConnected: false,
      connectionState: null,
      iceConnectionState: null,
      localStream: null,
      remoteStream: null,
    });
  }, [updateState]);

  // Disconnect
  const disconnect = useCallback(() => {
    cleanup();
    socketRef.current?.disconnect();
    socketRef.current = null;
  }, [cleanup]);

  // Toggle audio
  const toggleAudio = useCallback((enabled: boolean) => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    toggleAudio,
    iceServers,
  };
}
