/**
 * Authentication Service
 *
 * Handles login, logout, registration, and password management
 */

import api from './api';
import { tokenService } from './token.service';
import { socketService } from './socket.service';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  organizationName: string;
  organizationSlug: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  planId?: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    organizationId: string;
    organizationName: string;
    role: string;
    onboardingCompleted?: boolean;
    organizationIndustry?: string | null;
  };
  // Tokens are now in httpOnly cookies, not in response body
  // These fields are kept for backward compatibility but may be undefined
  accessToken?: string;
  refreshToken?: string;
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post('/auth/login', credentials);
    const data = response.data.data;

    // Tokens are now set via httpOnly cookies by the server
    // No need to store them manually

    // Connect socket in background (don't await - let login complete faster)
    socketService.reconnect().catch(err => {
      console.warn('[Auth] Socket reconnect failed:', err);
    });

    return data;
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await api.post('/auth/register', data);
    const result = response.data.data;

    // Tokens are now set via httpOnly cookies by the server
    // No need to store them manually

    // Connect socket (cookies will be sent automatically)
    await socketService.connectAsync();

    return result;
  },

  async logout(): Promise<void> {
    try {
      // Server will clear httpOnly cookies
      await api.post('/auth/logout');
    } finally {
      // Clear any legacy localStorage tokens
      tokenService.clearTokens();
      socketService.disconnect();
    }
  },

  async getCurrentUser() {
    const response = await api.get('/auth/me');
    return response.data.data;
  },

  async forgotPassword(email: string): Promise<void> {
    await api.post('/auth/forgot-password', { email });
  },

  async resetPassword(token: string, password: string): Promise<void> {
    await api.post('/auth/reset-password', { token, password });
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.post('/auth/change-password', { currentPassword, newPassword });
  },

  /**
   * Check if user is authenticated (has valid token)
   */
  isAuthenticated(): boolean {
    return tokenService.isTokenValid();
  },

  /**
   * Get the current access token
   */
  getAccessToken(): string | null {
    return tokenService.getAccessToken();
  },

  /**
   * Refresh the access token manually
   */
  async refreshToken(): Promise<boolean> {
    return tokenService.refreshAccessToken();
  },
};
