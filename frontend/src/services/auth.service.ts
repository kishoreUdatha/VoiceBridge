/**
 * Authentication Service
 *
 * Handles login, logout, registration, and password management
 */

import api, { startProactiveTokenRefresh, stopProactiveTokenRefresh } from './api';
import { tokenService } from './token.service';
import { socketService } from './socket.service';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface OtpSendResponse {
  success: boolean;
  message: string;
  otpId?: string;
  expiresAt?: string;
  channelUsed?: 'SMS' | 'WHATSAPP' | 'EMAIL';
  canResendAt?: string;
}

export interface ValidateCredentialsResponse {
  success: boolean;
  message: string;
  phone?: string;
  userId?: string;
}

export interface OtpVerifyResponse {
  success: boolean;
  message: string;
  attemptsRemaining?: number;
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
  industry: string;
  teamSize: string;
  expectedLeadsPerMonth?: string;
  country: string;
  currency?: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    organizationId: string;
    organizationName: string;
    organizationSlug: string;
    role: string;
    permissions: string[];
    onboardingCompleted?: boolean;
    organizationIndustry?: string | null;
  };
  // Tokens are now in httpOnly cookies, not in response body
  // These fields are kept for backward compatibility but may be undefined
  accessToken?: string;
  refreshToken?: string;
  // Tenant URL for subdomain redirect
  tenantUrl?: string;
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post('/auth/login', credentials);
    const data = response.data.data;

    // Tokens are now set via httpOnly cookies by the server
    // No need to store them manually

    // Start proactive token refresh to prevent session timeout
    startProactiveTokenRefresh();

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

    // Start proactive token refresh to prevent session timeout
    startProactiveTokenRefresh();

    // Connect socket (cookies will be sent automatically)
    await socketService.connectAsync();

    return result;
  },

  async logout(): Promise<void> {
    try {
      // Stop proactive token refresh
      stopProactiveTokenRefresh();
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
    // User is authenticated, start proactive token refresh
    startProactiveTokenRefresh();
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

  // ==================== OTP Authentication ====================

  /**
   * Validate credentials without completing login
   * Returns user's phone for OTP verification
   */
  async validateCredentials(email: string, password: string): Promise<ValidateCredentialsResponse> {
    try {
      const response = await api.post('/auth/validate-credentials', { email, password });
      return response.data.data || response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return {
        success: false,
        message: err.response?.data?.message || 'Invalid credentials',
      };
    }
  },

  /**
   * Send OTP to phone number for login
   * Uses WhatsApp by default with SMS fallback
   */
  async sendLoginOtp(phone: string, channel: 'WHATSAPP' | 'SMS' = 'WHATSAPP'): Promise<OtpSendResponse> {
    const response = await api.post('/otp/send', {
      identifier: phone,
      identifierType: 'PHONE',
      purpose: 'ACCOUNT_LOGIN',
      channel,
    });
    return response.data;
  },

  /**
   * Verify OTP and login
   */
  async verifyLoginOtp(phone: string, otp: string): Promise<OtpVerifyResponse> {
    const response = await api.post('/otp/verify', {
      identifier: phone,
      purpose: 'ACCOUNT_LOGIN',
      otp,
    });
    return response.data;
  },

  /**
   * Login with verified OTP
   * Call this after OTP is verified to get auth tokens
   */
  async loginWithOtp(phone: string): Promise<AuthResponse> {
    const response = await api.post('/auth/login-otp', { phone });
    const data = response.data.data;

    // Start proactive token refresh to prevent session timeout
    startProactiveTokenRefresh();

    // Connect socket in background
    socketService.reconnect().catch(err => {
      console.warn('[Auth] Socket reconnect failed:', err);
    });

    return data;
  },

  /**
   * Resend OTP
   */
  async resendLoginOtp(phone: string): Promise<OtpSendResponse> {
    const response = await api.post('/otp/resend', {
      identifier: phone,
      purpose: 'ACCOUNT_LOGIN',
    });
    return response.data;
  },

  // ==================== Registration Verification ====================

  /**
   * Send phone verification OTP for registration
   */
  async sendPhoneVerificationOtp(phone: string, channel: 'WHATSAPP' | 'SMS' = 'WHATSAPP'): Promise<OtpSendResponse> {
    const response = await api.post('/otp/send', {
      identifier: phone,
      identifierType: 'PHONE',
      purpose: 'PHONE_VERIFICATION',
      channel,
    });
    return response.data;
  },

  /**
   * Verify phone OTP for registration
   */
  async verifyPhoneOtp(phone: string, otp: string): Promise<OtpVerifyResponse> {
    const response = await api.post('/otp/verify', {
      identifier: phone,
      purpose: 'PHONE_VERIFICATION',
      otp,
    });
    return response.data;
  },

  /**
   * Send email verification OTP for registration
   */
  async sendEmailVerificationOtp(email: string): Promise<OtpSendResponse> {
    const response = await api.post('/otp/send', {
      identifier: email,
      identifierType: 'EMAIL',
      purpose: 'EMAIL_VERIFICATION',
      channel: 'EMAIL',
    });
    return response.data;
  },

  /**
   * Verify email OTP for registration
   */
  async verifyEmailOtp(email: string, otp: string): Promise<OtpVerifyResponse> {
    const response = await api.post('/otp/verify', {
      identifier: email,
      purpose: 'EMAIL_VERIFICATION',
      otp,
    });
    return response.data;
  },

  /**
   * Resend phone verification OTP
   */
  async resendPhoneVerificationOtp(phone: string): Promise<OtpSendResponse> {
    const response = await api.post('/otp/resend', {
      identifier: phone,
      purpose: 'PHONE_VERIFICATION',
    });
    return response.data;
  },

  /**
   * Resend email verification OTP
   */
  async resendEmailVerificationOtp(email: string): Promise<OtpSendResponse> {
    const response = await api.post('/otp/resend', {
      identifier: email,
      purpose: 'EMAIL_VERIFICATION',
    });
    return response.data;
  },
};
