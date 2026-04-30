import api, { getErrorMessage } from './index';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter, NativeModules } from 'react-native';
import {
  LoginCredentials,
  AuthResponse,
  User,
  STORAGE_KEYS,
  ApiResponse,
} from '../types';
import { API_URL } from '../config';

export const authApi = {
  /**
   * Login with email and password
   */
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
      const response = await api.post<ApiResponse<any>>('/auth/login', {
        email: credentials.email,
        password: credentials.password,
      });

      const { user: rawUser, accessToken, refreshToken } = response.data.data;
      const token = accessToken || response.data.data.token || '';

      // Use user data directly from backend (firstName, lastName format)
      const user: User = {
        id: rawUser.id,
        email: rawUser.email,
        firstName: rawUser.firstName || '',
        lastName: rawUser.lastName || '',
        organizationId: rawUser.organizationId,
        organizationName: rawUser.organizationName,
        role: rawUser.role || 'telecaller',
        avatar: rawUser.avatar,
        createdAt: rawUser.createdAt,
      };

      // Clear old cached data for fresh login
      await AsyncStorage.removeItem(STORAGE_KEYS.CACHED_LEADS);

      // Store tokens
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
      await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken || '');
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));

      // Store API URL for background workers (recording cleanup)
      const baseUrl = API_URL.replace('/api', ''); // Remove /api suffix for base URL
      await AsyncStorage.setItem('apiUrl', baseUrl);
      await AsyncStorage.setItem('authToken', token);

      // Schedule hourly recording cleanup with server reporting
      try {
        const { CallRecording } = NativeModules;
        if (CallRecording && CallRecording.scheduleHourlyCleanup) {
          await CallRecording.scheduleHourlyCleanup(baseUrl, token);
          console.log('[Auth] Scheduled hourly recording cleanup');
        }
      } catch (cleanupError) {
        console.log('[Auth] Could not schedule recording cleanup:', cleanupError);
      }

      if (credentials.rememberMe) {
        await AsyncStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'true');
      }

      return { user, token, refreshToken: refreshToken || '' };
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Logout - clear all stored data
   */
  logout: async (): Promise<void> => {
    console.log('[AuthAPI] Starting logout...');
    try {
      // Optionally call backend logout endpoint
      await api.post('/auth/logout').catch(() => {
        console.log('[AuthAPI] Backend logout call failed (ignored)');
      });

      // Clear all stored data
      console.log('[AuthAPI] Clearing storage...');
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER_DATA,
        STORAGE_KEYS.REMEMBER_ME,
      ]);
      console.log('[AuthAPI] Storage cleared');

      // Emit logout event for navigation
      console.log('[AuthAPI] Emitting logout event...');
      DeviceEventEmitter.emit('logout');
      console.log('[AuthAPI] Logout event emitted');
    } catch (error) {
      console.error('[AuthAPI] Logout error:', error);
      // Still clear local storage even if API call fails
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER_DATA,
      ]);

      // Still emit logout event
      console.log('[AuthAPI] Emitting logout event after error...');
      DeviceEventEmitter.emit('logout');
    }
  },

  /**
   * Refresh access token
   */
  refreshToken: async (): Promise<string | null> => {
    try {
      const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

      if (!refreshToken) {
        return null;
      }

      const response = await api.post<ApiResponse<{ token: string; refreshToken: string }>>(
        '/auth/refresh-token',
        { refreshToken }
      );

      const { token, refreshToken: newRefreshToken } = response.data.data;

      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
      await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);

      return token;
    } catch (error) {
      console.error('Token refresh error:', error);
      return null;
    }
  },

  /**
   * Get current user from storage
   */
  getCurrentUser: async (): Promise<User | null> => {
    try {
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      if (!userData) return null;
      return JSON.parse(userData);
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated: async (): Promise<boolean> => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      return !!token;
    } catch (error) {
      return false;
    }
  },

  /**
   * Get stored auth token
   */
  getToken: async (): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    } catch (error) {
      return null;
    }
  },

  /**
   * Update user profile
   */
  updateProfile: async (data: Partial<User>): Promise<User> => {
    try {
      const response = await api.put<ApiResponse<User>>('/auth/profile', data);
      const user = response.data.data;

      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));

      return user;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Change password
   */
  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Get telecaller stats
   */
  getStats: async (): Promise<any> => {
    try {
      const response = await api.get<ApiResponse<any>>('/telecaller/stats');
      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
};

export default authApi;
