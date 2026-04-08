import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../config/database';
import { realtimeVoiceService } from './realtime-voice.service';
import { webrtcSignalingService } from './webrtc-signaling.service';
import {
  RealtimeStartPayload,
  RealtimeAudioPayload,
  RealtimeEndPayload,
  WebRTCOfferPayload,
  WebRTCAnswerPayload,
  WebRTCIceCandidatePayload,
} from '../types/realtime.types';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  organizationId?: string;
}

class WebSocketService {
  private io: Server | null = null;
  private connectedUsers: Map<string, Set<string>> = new Map(); // orgId -> Set of socket ids
  private agentSubscriptions: Map<string, Set<string>> = new Map(); // agentId -> Set of socket ids

  initialize(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: config.corsOrigins,
        methods: ['GET', 'POST'],
        credentials: true,
      },
      // Allow both transports
      transports: ['polling', 'websocket'],
      allowUpgrades: true,
      // Explicit path to avoid conflicts
      path: '/socket.io/',
    });

    console.log('[WebSocket] Socket.IO server configured on /socket.io/');

    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        // Try to get token from auth object first, then from cookie
        let token = socket.handshake.auth.token;

        // If no token in auth, try to get from httpOnly cookie
        if (!token || token === 'httpOnly-cookie-auth') {
          const cookies = socket.handshake.headers.cookie;
          if (cookies) {
            const accessTokenMatch = cookies.match(/accessToken=([^;]+)/);
            if (accessTokenMatch) {
              token = accessTokenMatch[1];
            }
          }
        }

        if (!token) {
          return next(new Error('Authentication required'));
        }

        const decoded = jwt.verify(token, config.jwt.secret) as { userId: string };
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          include: { organization: true },
        });

        if (!user) {
          return next(new Error('User not found'));
        }

        socket.userId = user.id;
        socket.organizationId = user.organizationId;
        next();
      } catch (error) {
        next(new Error('Invalid token'));
      }
    });

    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`User connected: ${socket.userId}`);

      // Join organization room
      if (socket.organizationId) {
        socket.join(`org:${socket.organizationId}`);

        // Track connected users
        if (!this.connectedUsers.has(socket.organizationId)) {
          this.connectedUsers.set(socket.organizationId, new Set());
        }
        this.connectedUsers.get(socket.organizationId)?.add(socket.id);

        // Notify org about new connection
        this.emitToOrg(socket.organizationId, 'user:connected', {
          userId: socket.userId,
          activeUsers: this.connectedUsers.get(socket.organizationId)?.size || 0,
        });
      }

      // Handle call events
      socket.on('call:start', (data) => {
        if (socket.organizationId) {
          this.emitToOrg(socket.organizationId, 'call:started', {
            ...data,
            userId: socket.userId,
            timestamp: new Date().toISOString(),
          });
        }
      });

      socket.on('call:end', (data) => {
        if (socket.organizationId) {
          this.emitToOrg(socket.organizationId, 'call:ended', {
            ...data,
            userId: socket.userId,
            timestamp: new Date().toISOString(),
          });
        }
      });

      socket.on('call:update', (data) => {
        if (socket.organizationId) {
          this.emitToOrg(socket.organizationId, 'call:updated', {
            ...data,
            timestamp: new Date().toISOString(),
          });
        }
      });

      // Handle lead events
      socket.on('lead:update', (data) => {
        if (socket.organizationId) {
          this.emitToOrg(socket.organizationId, 'lead:updated', data);
        }
      });

      // ==================== AGENT REAL-TIME SYNC EVENTS ====================

      // Subscribe to agent updates (for real-time sync across tabs)
      socket.on('agent:subscribe', (data: { agentId: string }) => {
        const { agentId } = data;
        if (!agentId) return;

        // Join agent-specific room
        socket.join(`agent:${agentId}`);

        // Track subscription
        if (!this.agentSubscriptions.has(agentId)) {
          this.agentSubscriptions.set(agentId, new Set());
        }
        this.agentSubscriptions.get(agentId)?.add(socket.id);

        console.log(`[WebSocket] User ${socket.userId} subscribed to agent ${agentId}`);

        // Notify about current viewers count
        const viewerCount = this.agentSubscriptions.get(agentId)?.size || 0;
        this.io?.to(`agent:${agentId}`).emit('agent:viewers', {
          agentId,
          viewerCount,
        });
      });

      // Unsubscribe from agent updates
      socket.on('agent:unsubscribe', (data: { agentId: string }) => {
        const { agentId } = data;
        if (!agentId) return;

        socket.leave(`agent:${agentId}`);
        this.agentSubscriptions.get(agentId)?.delete(socket.id);

        console.log(`[WebSocket] User ${socket.userId} unsubscribed from agent ${agentId}`);

        // Notify about updated viewers count
        const viewerCount = this.agentSubscriptions.get(agentId)?.size || 0;
        this.io?.to(`agent:${agentId}`).emit('agent:viewers', {
          agentId,
          viewerCount,
        });
      });

      // Handle agent field updates (broadcast to other subscribers)
      socket.on('agent:update', (data: { agentId: string; field: string; value: any; updatedBy: string }) => {
        const { agentId, field, value, updatedBy } = data;
        if (!agentId || !socket.organizationId) return;

        // Broadcast to all other subscribers of this agent (excluding sender)
        socket.to(`agent:${agentId}`).emit('agent:updated', {
          agentId,
          field,
          value,
          updatedBy,
          timestamp: new Date().toISOString(),
        });
      });

      // ==================== REALTIME VOICE EVENTS ====================

      // Start a realtime voice session
      socket.on('realtime:start', async (data: RealtimeStartPayload) => {
        try {
          const result = await realtimeVoiceService.startSession(
            socket,
            data,
            socket.userId,
            socket.organizationId
          );
          socket.emit('realtime:started', result);
        } catch (error) {
          console.error('[WebSocket] Realtime start error:', error);
          socket.emit('realtime:error', {
            code: 'start_failed',
            message: error instanceof Error ? error.message : 'Failed to start session',
            recoverable: false,
          });
        }
      });

      // Receive audio from client
      socket.on('realtime:audio', async (data: RealtimeAudioPayload) => {
        try {
          await realtimeVoiceService.handleAudio(socket.id, data.audio);
        } catch (error) {
          console.error('[WebSocket] Realtime audio error:', error);
        }
      });

      // Handle user interruption
      socket.on('realtime:interrupt', async () => {
        try {
          await realtimeVoiceService.handleInterrupt(socket.id);
        } catch (error) {
          console.error('[WebSocket] Realtime interrupt error:', error);
        }
      });

      // End realtime session
      socket.on('realtime:end', async (data: RealtimeEndPayload) => {
        try {
          await realtimeVoiceService.endSession(socket.id, data.reason || 'user');
        } catch (error) {
          console.error('[WebSocket] Realtime end error:', error);
        }
      });

      // ==================== WEBRTC SIGNALING EVENTS ====================

      // Handle WebRTC offer
      socket.on('webrtc:offer', async (data: WebRTCOfferPayload) => {
        try {
          const answer = await webrtcSignalingService.handleOffer(
            socket,
            data,
            socket.organizationId
          );
          if (answer) {
            socket.emit('webrtc:answer', answer);
          }
        } catch (error) {
          console.error('[WebSocket] WebRTC offer error:', error);
          socket.emit('webrtc:error', {
            message: error instanceof Error ? error.message : 'WebRTC error',
          });
        }
      });

      // Handle WebRTC answer (for relay mode)
      socket.on('webrtc:answer', async (data: WebRTCAnswerPayload) => {
        try {
          await webrtcSignalingService.handleAnswer(socket, data);
        } catch (error) {
          console.error('[WebSocket] WebRTC answer error:', error);
        }
      });

      // Handle ICE candidates
      socket.on('webrtc:ice', async (data: WebRTCIceCandidatePayload) => {
        try {
          await webrtcSignalingService.handleIceCandidate(socket, data);
        } catch (error) {
          console.error('[WebSocket] WebRTC ICE error:', error);
        }
      });

      // Get ICE server configuration
      socket.on('webrtc:config', () => {
        socket.emit('webrtc:config', {
          iceServers: webrtcSignalingService.getIceServers(),
          isServerSideEnabled: webrtcSignalingService.isServerSideWebRTCEnabled(),
        });
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.userId}`);

        // Clean up realtime sessions
        realtimeVoiceService.handleDisconnect(socket.id);

        // Clean up WebRTC peers
        webrtcSignalingService.handleDisconnect(socket.id);

        // Clean up agent subscriptions
        for (const [agentId, subscribers] of this.agentSubscriptions.entries()) {
          if (subscribers.has(socket.id)) {
            subscribers.delete(socket.id);
            // Notify remaining subscribers about viewer count
            this.io?.to(`agent:${agentId}`).emit('agent:viewers', {
              agentId,
              viewerCount: subscribers.size,
            });
          }
        }

        if (socket.organizationId) {
          this.connectedUsers.get(socket.organizationId)?.delete(socket.id);
          this.emitToOrg(socket.organizationId, 'user:disconnected', {
            userId: socket.userId,
            activeUsers: this.connectedUsers.get(socket.organizationId)?.size || 0,
          });
        }
      });
    });

    console.log('WebSocket server initialized');
  }

  // Emit to all users in an organization
  emitToOrg(organizationId: string, event: string, data: any) {
    if (this.io) {
      this.io.to(`org:${organizationId}`).emit(event, data);
    }
  }

  // Emit to a specific user
  emitToUser(userId: string, event: string, data: any) {
    if (this.io) {
      this.io.to(`user:${userId}`).emit(event, data);
    }
  }

  // Emit call status update
  emitCallUpdate(organizationId: string, callData: {
    callId: string;
    status: string;
    phoneNumber: string;
    contactName?: string;
    duration?: number;
    agentId?: string;
  }) {
    this.emitToOrg(organizationId, 'call:status', {
      ...callData,
      timestamp: new Date().toISOString(),
    });
  }

  // Emit new lead notification
  emitNewLead(organizationId: string, lead: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    source: string;
    score?: number;
  }) {
    this.emitToOrg(organizationId, 'lead:new', {
      ...lead,
      timestamp: new Date().toISOString(),
    });
  }

  // Emit appointment notification
  emitAppointmentUpdate(organizationId: string, appointment: {
    id: string;
    contactName: string;
    scheduledAt: Date;
    status: string;
    type: string;
  }) {
    this.emitToOrg(organizationId, 'appointment:update', {
      ...appointment,
      timestamp: new Date().toISOString(),
    });
  }

  // Emit analytics update
  emitAnalyticsUpdate(organizationId: string, stats: {
    activeCalls: number;
    callsToday: number;
    leadsToday: number;
    conversionRate: number;
  }) {
    this.emitToOrg(organizationId, 'analytics:update', {
      ...stats,
      timestamp: new Date().toISOString(),
    });
  }

  // Get active connections count for org
  getActiveConnections(organizationId: string): number {
    return this.connectedUsers.get(organizationId)?.size || 0;
  }

  // ==================== AGENT REAL-TIME SYNC METHODS ====================

  // Emit agent update from server (e.g., when API updates agent)
  emitAgentUpdate(agentId: string, updates: {
    field?: string;
    value?: any;
    fullAgent?: any;
    updatedBy?: string;
  }) {
    if (this.io) {
      this.io.to(`agent:${agentId}`).emit('agent:updated', {
        agentId,
        ...updates,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Emit full agent reload (when major changes require full refresh)
  emitAgentReload(agentId: string, agent: any) {
    if (this.io) {
      this.io.to(`agent:${agentId}`).emit('agent:reload', {
        agentId,
        agent,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get count of users viewing an agent
  getAgentViewerCount(agentId: string): number {
    return this.agentSubscriptions.get(agentId)?.size || 0;
  }

  // Notify agent subscribers about status changes (e.g., RAG indexing)
  emitAgentStatus(agentId: string, status: {
    type: 'rag_indexing' | 'rag_complete' | 'error' | 'info';
    message: string;
    data?: any;
  }) {
    if (this.io) {
      this.io.to(`agent:${agentId}`).emit('agent:status', {
        agentId,
        ...status,
        timestamp: new Date().toISOString(),
      });
    }
  }
}

export const websocketService = new WebSocketService();
