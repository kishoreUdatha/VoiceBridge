import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { STORAGE_KEYS } from '../types';
import { API_URL } from '../config';

// Base URL for API - uses platform-specific URL from config
const API_BASE_URL = API_URL;

// Proactive token refresh - prevents auto-logout during continuous use
let tokenRefreshInterval: ReturnType<typeof setInterval> | null = null;
let lastRefreshTime = 0;
const TOKEN_REFRESH_INTERVAL = 12 * 60 * 60 * 1000; // Refresh every 12 hours

/**
 * Proactively refresh tokens to prevent session expiry
 * Called every 5 minutes while the app is active
 */
const proactiveTokenRefresh = async () => {
  const now = Date.now();
  // Avoid refreshing too frequently (minimum 6 hours between refreshes)
  if (now - lastRefreshTime < 6 * 60 * 60 * 1000) {
    return;
  }

  try {
    const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    if (!refreshToken) {
      console.log('[API] No refresh token for proactive refresh');
      return;
    }

    console.log('[API] Proactive token refresh...');
    const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
      refreshToken,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-client-type': 'mobile',
      },
      timeout: 15000,
    });

    const { token, accessToken, refreshToken: newRefreshToken } = response.data.data || response.data;
    const newToken = token || accessToken;

    if (newToken) {
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, newToken);
      if (newRefreshToken) {
        await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);
      }
      lastRefreshTime = now;
      console.log('[API] Proactive token refresh successful');
    }
  } catch (error: any) {
    console.log('[API] Proactive token refresh failed:', error.message);
    // Don't logout on proactive refresh failure - let the 401 interceptor handle it
  }
};

/**
 * Start proactive token refresh - call after successful login
 */
export const startProactiveTokenRefresh = () => {
  // Clear any existing interval
  if (tokenRefreshInterval) {
    clearInterval(tokenRefreshInterval);
  }

  lastRefreshTime = Date.now();
  console.log('[API] Starting proactive token refresh (every 5 min)');

  // Refresh every 5 minutes
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

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'x-client-type': 'mobile', // Identify as mobile app to get tokens in response
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (__DEV__ && config.url?.includes('/auth/')) {
        console.log('[API] Auth request:', config.url);
      }
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If 401 and not already retried, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

        if (refreshToken) {
          console.log('[API] Attempting token refresh...');
          const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
            refreshToken,
          });

          const { token, refreshToken: newRefreshToken } = response.data.data || response.data;

          if (token) {
            await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
            if (newRefreshToken) {
              await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);
            }

            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }

            console.log('[API] Token refresh successful, retrying request...');
            return api(originalRequest);
          }
        }

        // No refresh token or refresh failed - force logout
        throw new Error('No valid refresh token');
      } catch (refreshError) {
        console.log('[API] Token refresh failed, logging out...');
        // Clear tokens
        await AsyncStorage.multiRemove([
          STORAGE_KEYS.AUTH_TOKEN,
          STORAGE_KEYS.REFRESH_TOKEN,
          STORAGE_KEYS.USER_DATA,
        ]);
        // Emit logout event to trigger navigation to login screen
        DeviceEventEmitter.emit('logout');
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// Helper function to handle API errors
export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.message || 'An error occurred';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

// Helper to check if online
export const isOnline = async (): Promise<boolean> => {
  try {
    const NetInfo = require('@react-native-community/netinfo').default;
    const state = await NetInfo.fetch();
    return state.isConnected ?? false;
  } catch {
    return true; // Assume online if NetInfo fails
  }
};
