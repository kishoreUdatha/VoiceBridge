/**
 * WebRTC type declarations for Node.js environment
 * These types are normally available in browser but need to be declared for Node.js
 */

declare module 'wrtc' {
  export const RTCPeerConnection: any;
  export const RTCSessionDescription: any;
  export const RTCIceCandidate: any;
  export const MediaStream: any;
  export const MediaStreamTrack: any;
  export const nonstandard: any;
}

// Global WebRTC types for Node.js
declare global {
  interface RTCSessionDescriptionInit {
    type: 'offer' | 'answer' | 'pranswer' | 'rollback';
    sdp?: string;
  }

  interface RTCIceCandidateInit {
    candidate?: string;
    sdpMid?: string | null;
    sdpMLineIndex?: number | null;
    usernameFragment?: string | null;
  }

  interface RTCIceServer {
    urls: string | string[];
    username?: string;
    credential?: string;
    credentialType?: 'password' | 'oauth';
  }

  interface RTCConfiguration {
    iceServers?: RTCIceServer[];
    iceTransportPolicy?: 'all' | 'relay';
    bundlePolicy?: 'balanced' | 'max-bundle' | 'max-compat';
    rtcpMuxPolicy?: 'negotiate' | 'require';
    iceCandidatePoolSize?: number;
  }

  interface RTCPeerConnection {
    localDescription: RTCSessionDescription | null;
    remoteDescription: RTCSessionDescription | null;
    iceConnectionState: string;
    connectionState: string;
    signalingState: string;

    createOffer(options?: any): Promise<RTCSessionDescriptionInit>;
    createAnswer(options?: any): Promise<RTCSessionDescriptionInit>;
    setLocalDescription(description?: RTCSessionDescriptionInit): Promise<void>;
    setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void>;
    addIceCandidate(candidate?: RTCIceCandidateInit): Promise<void>;
    close(): void;

    onicecandidate: ((event: any) => void) | null;
    ontrack: ((event: any) => void) | null;
    oniceconnectionstatechange: (() => void) | null;
    onconnectionstatechange: (() => void) | null;
  }

  interface RTCSessionDescription {
    type: 'offer' | 'answer' | 'pranswer' | 'rollback';
    sdp: string;
  }

  interface MediaStreamTrack {
    kind: 'audio' | 'video';
    id: string;
    label: string;
    enabled: boolean;
    muted: boolean;
    readyState: 'live' | 'ended';
  }

  interface MediaStream {
    id: string;
    active: boolean;
    getTracks(): MediaStreamTrack[];
    getAudioTracks(): MediaStreamTrack[];
    getVideoTracks(): MediaStreamTrack[];
    addTrack(track: MediaStreamTrack): void;
    removeTrack(track: MediaStreamTrack): void;
  }

  var RTCPeerConnection: {
    new(configuration?: RTCConfiguration): RTCPeerConnection;
    prototype: RTCPeerConnection;
  };

  var RTCSessionDescription: {
    new(descriptionInitDict?: RTCSessionDescriptionInit): RTCSessionDescription;
    prototype: RTCSessionDescription;
  };

  var RTCIceCandidate: {
    new(candidateInitDict?: RTCIceCandidateInit): any;
    prototype: any;
  };

  var MediaStream: {
    new(): MediaStream;
    prototype: MediaStream;
  };

  var MediaStreamTrack: {
    prototype: MediaStreamTrack;
  };
}

export {};
