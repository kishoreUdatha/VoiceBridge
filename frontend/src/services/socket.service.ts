/**
 * Socket.IO Service for Real-Time Communication
 *
 * Handles WebSocket connections with automatic token refresh
 */

import { io, Socket } from 'socket.io-client';
import { tokenService } from './token.service';

// Get socket URL from API URL
const getSocketUrl = (): string => {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) {
    // Remove /api suffix to get base URL
    return apiUrl.replace(/\/api\/?$/, '');
  }
  // Fallback: in production use relative, in dev use localhost:3001
  return import.meta.env.PROD ? '' : 'http://localhost:3001';
};

type TokenRefreshCallback = (refreshed: boolean) => void;

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isReconnecting = false;
  private tokenRefreshCallbacks: TokenRefreshCallback[] = [];

  /**
   * Connect to Socket.IO server with automatic token handling
   */
  async connectAsync(): Promise<Socket | null> {
    // Get a valid token (refreshing if needed)
    const token = await tokenService.getValidToken();

    if (!token) {
      console.warn('[Socket] No valid token available, cannot connect');
      return null;
    }

    return this.connect(token);
  }

  /**
   * Connect with a specific token
   */
  connect(token: string): Socket {
    // If already connected with valid token, return existing socket
    if (this.socket?.connected) {
      console.log('[Socket] Already connected, reusing socket:', this.socket.id);
      return this.socket;
    }

    // If socket exists but not connected, disconnect and create new
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    const socketUrl = getSocketUrl();
    console.log('[Socket] Connecting to:', socketUrl);

    this.socket = io(socketUrl, {
      auth: { token },
      // Use polling first, then upgrade to WebSocket (more reliable)
      transports: ['polling', 'websocket'],
      upgrade: true,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      path: '/socket.io/',
      // Send cookies with websocket requests for httpOnly cookie auth
      withCredentials: true,
    });

    this.setupEventHandlers();

    return this.socket;
  }

  /**
   * Setup socket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('[Socket] Connected successfully! Socket ID:', this.socket?.id);
      this.reconnectAttempts = 0;
      this.isReconnecting = false;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected. Reason:', reason);
    });

    this.socket.on('connect_error', async (error) => {
      console.error('[Socket] Connection error:', error.message);
      this.reconnectAttempts++;

      // Handle token-related errors
      if (
        error.message === 'Invalid token' ||
        error.message === 'Authentication required' ||
        error.message === 'jwt expired'
      ) {
        await this.handleTokenError();
      }
    });

    this.socket.on('error', (error) => {
      console.error('[Socket] Socket error:', error);
    });
  }

  /**
   * Handle token errors by refreshing and reconnecting
   * Uses silent mode to avoid redirecting to login page
   */
  private async handleTokenError(): Promise<void> {
    if (this.isReconnecting) {
      console.log('[Socket] Already attempting to reconnect with new token');
      return;
    }

    this.isReconnecting = true;
    console.log('[Socket] Token error detected, attempting to refresh...');

    try {
      // Use silent mode to avoid redirecting to login page
      // Socket failures should degrade gracefully, not interrupt the user
      const newToken = await tokenService.refreshAccessToken({ silent: true });

      if (newToken) {
        console.log('[Socket] Token refreshed, reconnecting...');

        // Disconnect current socket
        if (this.socket) {
          this.socket.disconnect();
          this.socket = null;
        }

        // Reconnect - cookies are automatically sent
        await this.connectAsync();

        // Notify callbacks about token refresh
        this.tokenRefreshCallbacks.forEach((callback) => callback(true));
      } else {
        console.warn('[Socket] Token refresh failed, realtime features disabled');
        // Don't redirect - just disable realtime features
      }
    } catch (error) {
      console.error('[Socket] Error during token refresh:', error);
    } finally {
      this.isReconnecting = false;
    }
  }

  /**
   * Register callback for when token is refreshed
   */
  onTokenRefresh(callback: TokenRefreshCallback): void {
    this.tokenRefreshCallbacks.push(callback);
  }

  /**
   * Remove token refresh callback
   */
  offTokenRefresh(callback: TokenRefreshCallback): void {
    this.tokenRefreshCallbacks = this.tokenRefreshCallbacks.filter((cb) => cb !== callback);
  }

  /**
   * Disconnect from socket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Get current socket instance
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Reconnect with fresh token (useful after manual login)
   */
  async reconnect(): Promise<Socket | null> {
    this.disconnect();
    return this.connectAsync();
  }

  // Agent-specific methods
  subscribeToAgent(agentId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('agent:subscribe', { agentId });
    }
  }

  unsubscribeFromAgent(agentId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('agent:unsubscribe', { agentId });
    }
  }

  emitAgentUpdate(agentId: string, field: string, value: any, updatedBy: string): void {
    if (this.socket?.connected) {
      this.socket.emit('agent:update', { agentId, field, value, updatedBy });
    }
  }

  onAgentUpdated(
    callback: (data: {
      agentId: string;
      field: string;
      value: any;
      updatedBy: string;
      timestamp: string;
    }) => void
  ): void {
    this.socket?.on('agent:updated', callback);
  }

  offAgentUpdated(): void {
    this.socket?.off('agent:updated');
  }

  onAgentReload(callback: (data: { agentId: string; agent: any; timestamp: string }) => void): void {
    this.socket?.on('agent:reload', callback);
  }

  offAgentReload(): void {
    this.socket?.off('agent:reload');
  }

  onAgentViewers(callback: (data: { agentId: string; viewerCount: number }) => void): void {
    this.socket?.on('agent:viewers', callback);
  }

  offAgentViewers(): void {
    this.socket?.off('agent:viewers');
  }

  onAgentStatus(
    callback: (data: {
      agentId: string;
      type: string;
      message: string;
      data?: any;
      timestamp: string;
    }) => void
  ): void {
    this.socket?.on('agent:status', callback);
  }

  offAgentStatus(): void {
    this.socket?.off('agent:status');
  }
}

export const socketService = new SocketService();
