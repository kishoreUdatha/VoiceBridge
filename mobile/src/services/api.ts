import axios, { AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

// Get API URL from app config (can be overridden via environment variables)
// Production API endpoint
const API_BASE_URL = 'http://13.206.154.118/api';

console.log('[API] Base URL:', API_BASE_URL);

// Proactive token refresh - prevents auto-logout during continuous use
let tokenRefreshInterval: ReturnType<typeof setInterval> | null = null;
let lastRefreshTime = 0;
const TOKEN_REFRESH_INTERVAL = 12 * 60 * 60 * 1000; // Refresh every 12 hours

/**
 * Proactively refresh tokens to prevent session expiry
 */
const proactiveTokenRefresh = async () => {
  const now = Date.now();
  // Avoid refreshing too frequently (minimum 6 hours between refreshes)
  if (now - lastRefreshTime < 6 * 60 * 60 * 1000) return;

  try {
    const refreshToken = await SecureStore.getItemAsync('refreshToken');
    if (!refreshToken) return;

    console.log('[API] Proactive token refresh...');
    const response = await axios.post(
      `${API_BASE_URL}/auth/refresh-token`,
      { refreshToken },
      { timeout: 15000 }
    );

    const { accessToken, refreshToken: newRefreshToken } = response.data.data;
    if (accessToken) {
      await SecureStore.setItemAsync('accessToken', accessToken);
      await SecureStore.setItemAsync('refreshToken', newRefreshToken);
      lastRefreshTime = now;
      console.log('[API] Proactive token refresh successful');
    }
  } catch (error: any) {
    console.log('[API] Proactive token refresh failed:', error.message);
  }
};

/**
 * Start proactive token refresh - call after successful login
 */
export const startProactiveTokenRefresh = () => {
  if (tokenRefreshInterval) clearInterval(tokenRefreshInterval);

  lastRefreshTime = Date.now();
  console.log('[API] Starting proactive token refresh (every 5 min)');
  tokenRefreshInterval = setInterval(proactiveTokenRefresh, TOKEN_REFRESH_INTERVAL);
};

/**
 * Stop proactive token refresh - call on logout
 */
export const stopProactiveTokenRefresh = () => {
  if (tokenRefreshInterval) {
    clearInterval(tokenRefreshInterval);
    tokenRefreshInterval = null;
  }
  console.log('[API] Stopped proactive token refresh');
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Token refresh state management - prevents multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];
let refreshFailedSubscribers: Array<(error: any) => void> = [];

// Subscribe to token refresh completion
const subscribeTokenRefresh = (onRefreshed: (token: string) => void, onFailed: (error: any) => void) => {
  refreshSubscribers.push(onRefreshed);
  refreshFailedSubscribers.push(onFailed);
};

// Notify all subscribers when token is refreshed
const onTokenRefreshed = (token: string) => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
  refreshFailedSubscribers = [];
};

// Notify all subscribers when refresh fails
const onRefreshFailed = (error: any) => {
  refreshFailedSubscribers.forEach((callback) => callback(error));
  refreshSubscribers = [];
  refreshFailedSubscribers = [];
};

// Check if error is a network/timeout error (not auth related)
const isNetworkError = (error: AxiosError): boolean => {
  return (
    !error.response || // No response = network error
    error.code === 'ECONNABORTED' || // Timeout
    error.code === 'ERR_NETWORK' || // Network error
    error.message?.includes('Network Error') ||
    error.message?.includes('timeout')
  );
};

// Retry with exponential backoff
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const refreshTokenWithRetry = async (maxRetries = 3): Promise<{ accessToken: string; refreshToken: string }> => {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      console.log(`[API] Refresh token attempt ${attempt}/${maxRetries}`);

      const response = await axios.post(
        `${API_BASE_URL}/auth/refresh-token`,
        { refreshToken },
        { timeout: 10000 }
      );

      const { accessToken, refreshToken: newRefreshToken } = response.data.data;
      console.log('[API] Token refresh successful');

      return { accessToken, refreshToken: newRefreshToken };
    } catch (error: any) {
      lastError = error;
      console.log(`[API] Refresh attempt ${attempt} failed:`, error.message);

      // If it's a 401/403, don't retry - token is truly invalid
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log('[API] Refresh token is invalid, not retrying');
        break;
      }

      // For network errors, wait and retry
      if (attempt < maxRetries && isNetworkError(error)) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`[API] Network error, retrying in ${backoffMs}ms`);
        await delay(backoffMs);
      }
    }
  }

  throw lastError;
};

// Clear tokens and trigger logout event
const clearTokensAndLogout = async () => {
  console.log('[API] Clearing tokens due to auth failure');
  await SecureStore.deleteItemAsync('accessToken');
  await SecureStore.deleteItemAsync('refreshToken');
};

api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // Don't retry if no config or already retried
    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Handle 401 Unauthorized - need to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // If already refreshing, wait for the refresh to complete
      if (isRefreshing) {
        console.log('[API] Token refresh in progress, queuing request');
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh(
            (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            (refreshError: any) => {
              reject(refreshError);
            }
          );
        });
      }

      isRefreshing = true;

      try {
        const { accessToken, refreshToken: newRefreshToken } = await refreshTokenWithRetry(3);

        // Save new tokens
        await SecureStore.setItemAsync('accessToken', accessToken);
        await SecureStore.setItemAsync('refreshToken', newRefreshToken);

        // Notify all waiting requests
        onTokenRefreshed(accessToken);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError: any) {
        console.log('[API] Token refresh failed after retries:', refreshError.message);

        // Only clear tokens if it's an actual auth error, not network error
        if (!isNetworkError(refreshError)) {
          await clearTokensAndLogout();
        }

        // Notify all waiting requests that refresh failed
        onRefreshFailed(refreshError);

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // For network errors on non-auth endpoints, don't logout
    if (isNetworkError(error)) {
      console.log('[API] Network error (not logging out):', error.message);
    }

    return Promise.reject(error);
  }
);

export default api;
export { isNetworkError };
