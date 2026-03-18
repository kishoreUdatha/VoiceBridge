import { Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import {
  WebRTCOfferPayload,
  WebRTCAnswerPayload,
  WebRTCIceCandidatePayload,
  WebRTCPeerConfig,
} from '../types/realtime.types';

// Optional wrtc import for server-side WebRTC
// @ts-ignore - wrtc is an optional runtime dependency
let wrtc: any = null;
try {
  // @ts-ignore - optional runtime import
  wrtc = require('wrtc');
  console.log('[WebRTC] Server-side WebRTC (wrtc) loaded successfully');
} catch (error) {
  console.log('[WebRTC] wrtc not available - using relay mode only');
}

interface PeerConnection {
  peerId: string;
  socketId: string;
  organizationId: string;
  sessionId?: string;
  pc?: RTCPeerConnection;
  createdAt: Date;
  lastActivityAt: Date;
}

class WebRTCSignalingService {
  private peers: Map<string, PeerConnection> = new Map();
  private socketToPeer: Map<string, string> = new Map();
  private isWrtcAvailable: boolean = wrtc !== null;

  isServerSideWebRTCEnabled(): boolean {
    return this.isWrtcAvailable;
  }

  async handleOffer(
    socket: Socket,
    payload: WebRTCOfferPayload,
    organizationId?: string,
    sessionId?: string
  ): Promise<WebRTCAnswerPayload | null> {
    const { peerId, offer } = payload;

    console.log(`[WebRTC] Received offer from peer: ${peerId}`);

    // Create peer connection record
    const peerConnection: PeerConnection = {
      peerId,
      socketId: socket.id,
      organizationId: organizationId || '',
      sessionId,
      createdAt: new Date(),
      lastActivityAt: new Date(),
    };

    this.peers.set(peerId, peerConnection);
    this.socketToPeer.set(socket.id, peerId);

    // If wrtc is available, create a server-side peer connection
    if (this.isWrtcAvailable && wrtc) {
      try {
        const pc = new wrtc.RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ],
        });

        peerConnection.pc = pc;

        // Handle ICE candidates
        pc.onicecandidate = (event: any) => {
          if (event.candidate) {
            socket.emit('webrtc:ice', {
              peerId,
              candidate: event.candidate.toJSON(),
            });
          }
        };

        // Handle connection state changes
        pc.onconnectionstatechange = () => {
          console.log(`[WebRTC] Connection state: ${pc.connectionState}`);
          if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
            this.closePeerConnection(peerId);
          }
        };

        // Handle incoming tracks (audio from client)
        pc.ontrack = (event: any) => {
          console.log('[WebRTC] Received track:', event.track.kind);
          // Process audio track - could be connected to OpenAI Realtime
          // For now, just log it
          if (event.track.kind === 'audio') {
            this.handleAudioTrack(peerId, event.track, event.streams[0]);
          }
        };

        // Set remote description (offer)
        await pc.setRemoteDescription(new wrtc.RTCSessionDescription(offer));

        // Create answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        console.log(`[WebRTC] Created answer for peer: ${peerId}`);

        return {
          peerId,
          answer: {
            type: answer.type,
            sdp: answer.sdp,
          },
        };
      } catch (error) {
        console.error('[WebRTC] Error creating peer connection:', error);
        this.closePeerConnection(peerId);
        throw error;
      }
    }

    // If wrtc is not available, just relay to other peers in the same org
    // This is a fallback for environments without wrtc
    return null;
  }

  async handleAnswer(
    socket: Socket,
    payload: WebRTCAnswerPayload
  ): Promise<void> {
    const { peerId, answer } = payload;
    const peerConnection = this.peers.get(peerId);

    if (!peerConnection || !peerConnection.pc) {
      console.warn(`[WebRTC] No peer connection found for: ${peerId}`);
      return;
    }

    try {
      await peerConnection.pc.setRemoteDescription(
        new (wrtc!.RTCSessionDescription)(answer)
      );
      peerConnection.lastActivityAt = new Date();
      console.log(`[WebRTC] Set remote description for peer: ${peerId}`);
    } catch (error) {
      console.error('[WebRTC] Error setting remote description:', error);
    }
  }

  async handleIceCandidate(
    socket: Socket,
    payload: WebRTCIceCandidatePayload
  ): Promise<void> {
    const { peerId, candidate } = payload;
    const peerConnection = this.peers.get(peerId);

    if (!peerConnection || !peerConnection.pc) {
      console.warn(`[WebRTC] No peer connection found for ICE: ${peerId}`);
      return;
    }

    try {
      await peerConnection.pc.addIceCandidate(
        new (wrtc!.RTCIceCandidate)(candidate)
      );
      peerConnection.lastActivityAt = new Date();
      console.log(`[WebRTC] Added ICE candidate for peer: ${peerId}`);
    } catch (error) {
      console.error('[WebRTC] Error adding ICE candidate:', error);
    }
  }

  private handleAudioTrack(
    peerId: string,
    track: MediaStreamTrack,
    stream: MediaStream
  ): void {
    const peerConnection = this.peers.get(peerId);
    if (!peerConnection) return;

    console.log(`[WebRTC] Processing audio track from peer: ${peerId}`);

    // In a full implementation, this would:
    // 1. Convert the audio stream to PCM16
    // 2. Send it to OpenAI Realtime API
    // 3. Receive audio back and send to the client

    // For now, we're just logging that we received audio
    // The actual audio processing would require additional setup
  }

  closePeerConnection(peerId: string): void {
    const peerConnection = this.peers.get(peerId);
    if (!peerConnection) return;

    if (peerConnection.pc) {
      try {
        peerConnection.pc.close();
      } catch (error) {
        console.error('[WebRTC] Error closing peer connection:', error);
      }
    }

    this.peers.delete(peerId);
    this.socketToPeer.delete(peerConnection.socketId);
    console.log(`[WebRTC] Closed peer connection: ${peerId}`);
  }

  handleDisconnect(socketId: string): void {
    const peerId = this.socketToPeer.get(socketId);
    if (peerId) {
      this.closePeerConnection(peerId);
    }
  }

  getPeer(peerId: string): PeerConnection | undefined {
    return this.peers.get(peerId);
  }

  getPeerBySocketId(socketId: string): PeerConnection | undefined {
    const peerId = this.socketToPeer.get(socketId);
    return peerId ? this.peers.get(peerId) : undefined;
  }

  getActivePeerCount(): number {
    return this.peers.size;
  }

  getPeersForOrg(organizationId: string): PeerConnection[] {
    return Array.from(this.peers.values()).filter(
      (p) => p.organizationId === organizationId
    );
  }

  // Generate a unique peer ID
  generatePeerId(): string {
    return `peer-${uuidv4().substring(0, 8)}`;
  }

  // Get STUN/TURN server configuration for clients
  getIceServers(): RTCIceServer[] {
    const servers: RTCIceServer[] = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ];

    // Add TURN servers if configured
    const turnUrl = process.env.TURN_SERVER_URL;
    const turnUser = process.env.TURN_USERNAME;
    const turnPassword = process.env.TURN_PASSWORD;

    if (turnUrl && turnUser && turnPassword) {
      servers.push({
        urls: turnUrl,
        username: turnUser,
        credential: turnPassword,
      });
    }

    return servers;
  }

  // Clean up stale connections (older than 10 minutes)
  cleanupStaleConnections(): void {
    const staleThreshold = Date.now() - 10 * 60 * 1000; // 10 minutes

    for (const [peerId, peer] of this.peers) {
      if (peer.lastActivityAt.getTime() < staleThreshold) {
        console.log(`[WebRTC] Cleaning up stale peer: ${peerId}`);
        this.closePeerConnection(peerId);
      }
    }
  }
}

export const webrtcSignalingService = new WebRTCSignalingService();

// Run cleanup every 5 minutes
setInterval(() => {
  webrtcSignalingService.cleanupStaleConnections();
}, 5 * 60 * 1000);
