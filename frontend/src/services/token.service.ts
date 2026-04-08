/**
 * Token Management Service
 *
 * With httpOnly cookie authentication, tokens are managed by the browser automatically.
 * This service now handles auth state tracking and coordinates token refresh.
 *
 * SECURITY: Tokens are stored in httpOnly cookies (not accessible via JavaScript)
 * This protects against XSS attacks that could steal tokens from localStorage.
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Track if we're currently refreshing to prevent duplicate refresh calls
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

class TokenService {
  /**
   * Check if user is authenticated by making a request to the /me endpoint
   * This is the only reliable way to check auth status with httpOnly cookies
   */
  async checkAuthStatus(): Promise<boolean> {
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/me`, {
        withCredentials: true,
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  /**
   * Refresh the access token
   * The refresh token is sent automatically via httpOnly cookie
   * @param options.silent - If true, don't redirect to login on failure (for background operations)
   */
  async refreshAccessToken(options?: { silent?: boolean }): Promise<boolean> {
    // If already refreshing, wait for that to complete
    if (isRefreshing && refreshPromise) {
      return refreshPromise;
    }

    isRefreshing = true;
    console.log('[TokenService] Refreshing access token...');

    refreshPromise = (async () => {
      try {
        await axios.post(
          `${API_BASE_URL}/auth/refresh-token`,
          {},
          { withCredentials: true }
        );
        console.log('[TokenService] Token refreshed successfully');
        return true;
      } catch (error) {
        console.error('[TokenService] Token refresh failed:', error);

        // Redirect to login unless silent mode (for background operations like socket connections)
        if (!options?.silent && typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }

        return false;
      } finally {
        isRefreshing = false;
        refreshPromise = null;
      }
    })();

    return refreshPromise;
  }

  /**
   * Clear authentication by calling logout endpoint
   * The server will clear the httpOnly cookies
   */
  async logout(): Promise<void> {
    try {
      await axios.post(
        `${API_BASE_URL}/auth/logout`,
        {},
        { withCredentials: true }
      );
    } catch (error) {
      console.error('[TokenService] Logout error:', error);
    }
  }

  // ============================================
  // DEPRECATED: These methods are kept for backward compatibility
  // but no longer store tokens in localStorage
  // ============================================

  /** @deprecated Tokens are now in httpOnly cookies */
  getAccessToken(): string | null {
    // Return null - tokens are in httpOnly cookies, not accessible via JS
    return null;
  }

  /** @deprecated Tokens are now in httpOnly cookies */
  getRefreshToken(): string | null {
    return null;
  }

  /** @deprecated Tokens are now in httpOnly cookies */
  setTokens(_accessToken: string, _refreshToken: string): void {
    // No-op - tokens are set via httpOnly cookies by the server
    console.warn('[TokenService] setTokens is deprecated - tokens are managed via httpOnly cookies');
  }

  /** @deprecated Use logout() instead */
  clearTokens(): void {
    // Clear any legacy localStorage tokens
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  /** @deprecated Cannot check token expiry with httpOnly cookies */
  isTokenValid(): boolean {
    // Cannot check - token is in httpOnly cookie
    // Use checkAuthStatus() for reliable auth check
    return true; // Assume valid, let API calls handle 401
  }

  /** @deprecated Use checkAuthStatus() instead */
  async getValidToken(): Promise<string | null> {
    // With httpOnly cookies, we don't return the token
    // Just verify auth status
    const isValid = await this.checkAuthStatus();
    return isValid ? 'httpOnly-cookie-auth' : null;
  }

  /** @deprecated Cannot access token with httpOnly cookies */
  canRefresh(): boolean {
    return true; // Assume we can refresh, let the server decide
  }

  /** @deprecated Cannot access token with httpOnly cookies */
  getUserIdFromToken(): string | null {
    return null;
  }
}

export const tokenService = new TokenService();
