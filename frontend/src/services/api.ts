/**
 * API Service
 *
 * Axios instance with automatic token management, refresh, and CSRF protection
 * Includes proactive token refresh to prevent session interruptions
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Proactive token refresh timer
let tokenRefreshTimer: ReturnType<typeof setTimeout> | null = null;
let lastRefreshTime = 0;

// Refresh tokens every 7 minutes to ensure they don't expire during use
// This is less than the typical JWT expiry (8h) but frequent enough to keep session alive
const TOKEN_REFRESH_INTERVAL = 7 * 60 * 1000; // 7 minutes

/**
 * Schedule proactive token refresh
 * Refreshes tokens before they expire to prevent session interruptions
 */
function scheduleTokenRefresh() {
  // Clear any existing timer
  if (tokenRefreshTimer) {
    clearTimeout(tokenRefreshTimer);
  }

  tokenRefreshTimer = setTimeout(async () => {
    const now = Date.now();
    // Avoid refreshing too frequently (minimum 5 minutes between refreshes)
    if (now - lastRefreshTime < 5 * 60 * 1000) {
      scheduleTokenRefresh();
      return;
    }

    try {
      // Refresh tokens proactively
      await axios.post(`${API_BASE_URL}/auth/refresh-token`, {}, { withCredentials: true });
      lastRefreshTime = now;
      console.debug('[API] Proactive token refresh successful');
    } catch (error) {
      console.debug('[API] Proactive token refresh failed - user may need to login again');
    }

    // Schedule next refresh
    scheduleTokenRefresh();
  }, TOKEN_REFRESH_INTERVAL);
}

/**
 * Start proactive token refresh (call after successful login)
 */
export function startProactiveTokenRefresh() {
  lastRefreshTime = Date.now();
  scheduleTokenRefresh();
}

/**
 * Stop proactive token refresh (call on logout)
 */
export function stopProactiveTokenRefresh() {
  if (tokenRefreshTimer) {
    clearTimeout(tokenRefreshTimer);
    tokenRefreshTimer = null;
  }
}

/**
 * Get CSRF token from cookie
 */
function getCsrfToken(): string | null {
  const name = 'csrf-token=';
  const decodedCookie = decodeURIComponent(document.cookie);
  const cookies = decodedCookie.split(';');
  for (let cookie of cookies) {
    cookie = cookie.trim();
    if (cookie.indexOf(name) === 0) {
      return cookie.substring(name.length);
    }
  }
  return null;
}

// Track if we're currently fetching CSRF token to avoid multiple requests
let csrfFetchPromise: Promise<string | null> | null = null;
// Cache the token from the server response (more reliable than reading from cookie)
let cachedCsrfToken: string | null = null;

/**
 * Ensure CSRF token is available
 * Fetches from server if not in cookie or cache
 */
async function ensureCsrfToken(): Promise<string | null> {
  // First check cache, then cookie
  if (cachedCsrfToken) return cachedCsrfToken;

  let token = getCsrfToken();
  if (token) {
    cachedCsrfToken = token;
    return token;
  }

  // Avoid multiple concurrent fetches
  if (!csrfFetchPromise) {
    csrfFetchPromise = axios.get(`${API_BASE_URL}/csrf-token`, { withCredentials: true })
      .then((response) => {
        // Use token from response body (more reliable than cookie)
        const serverToken = response.data?.token;
        if (serverToken) {
          cachedCsrfToken = serverToken;
        }
        return serverToken || getCsrfToken();
      })
      .catch(() => {
        return getCsrfToken();
      })
      .finally(() => {
        csrfFetchPromise = null;
      });
  }

  return csrfFetchPromise;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send cookies with requests (httpOnly auth + CSRF)
});

/**
 * Get selected branch ID from localStorage (for admin branch filtering)
 */
function getSelectedBranchId(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('selectedBranchId');
  }
  return null;
}

// Request interceptor - add CSRF token and branch header
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Add CSRF token for non-GET requests
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (config.method && !safeMethods.includes(config.method.toUpperCase())) {
      // Ensure CSRF token is available before making state-changing requests
      const csrfToken = await ensureCsrfToken();
      if (csrfToken && config.headers) {
        config.headers['x-csrf-token'] = csrfToken;
      }
    }

    // Add branch ID header for admin branch filtering
    const selectedBranchId = getSelectedBranchId();
    if (selectedBranchId && config.headers) {
      config.headers['x-branch-id'] = selectedBranchId;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh on 401 and CSRF retry on 403
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean; _csrfRetry?: boolean };

    // Skip retry for auth endpoints or if already retried
    const isAuthEndpoint =
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/register') ||
      originalRequest.url?.includes('/auth/refresh-token');

    // Handle CSRF token errors (403 with CSRF error code)
    const responseData = error.response?.data as { code?: string } | undefined;
    if (error.response?.status === 403 &&
        responseData?.code?.startsWith('CSRF_') &&
        !originalRequest._csrfRetry) {
      originalRequest._csrfRetry = true;

      try {
        // Clear cached token and fetch fresh one
        cachedCsrfToken = null;

        // Fetch fresh CSRF token
        const response = await axios.get(`${API_BASE_URL}/csrf-token`, { withCredentials: true });

        // Use token from response body (more reliable)
        const newToken = response.data?.token || getCsrfToken();
        if (newToken) {
          cachedCsrfToken = newToken;
          if (originalRequest.headers) {
            originalRequest.headers['x-csrf-token'] = newToken;
          }
        }

        // Retry the original request
        return api(originalRequest);
      } catch (csrfError) {
        console.error('[API] CSRF token refresh failed:', csrfError);
      }
    }

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      try {
        // Try to refresh the token via cookie-based endpoint
        // The refresh token is sent automatically via httpOnly cookie
        await api.post('/auth/refresh-token');

        // Token refresh successful - restart proactive refresh timer
        lastRefreshTime = Date.now();
        scheduleTokenRefresh();

        // Retry the original request (new access token is now in cookie)
        return api(originalRequest);
      } catch (refreshError) {
        // Token refresh failed, stop proactive refresh and redirect to login
        stopProactiveTokenRefresh();
        console.error('[API] Token refresh failed:', refreshError);

        // Clear any local state and redirect (except for public pages)
        const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/pricing', '/docs', '/realtime-test', '/'];
        const currentPath = window.location.pathname;
        const isPublicPage = publicPaths.some(path => currentPath === path || currentPath.startsWith(path + '/'));

        if (typeof window !== 'undefined' && !isPublicPage) {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
