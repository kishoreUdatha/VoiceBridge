import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authService } from '../../services/auth.service';
import * as SecureStore from 'expo-secure-store';
import { isNetworkError, startProactiveTokenRefresh, stopProactiveTokenRefresh } from '../../services/api';

interface Role {
  id: string;
  name: string;
  slug: string;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  organizationName?: string;
  role?: Role;
  roleName?: string; // Fallback for flat role name
  branchId?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  networkError: boolean; // Track if we have a network issue vs auth issue
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  networkError: false,
};

// Helper to check if error is network-related
const isNetworkIssue = (error: any): boolean => {
  if (!error) return false;

  // Check if it's an axios network error
  if (isNetworkError(error)) return true;

  // Check error message patterns
  const message = error.message?.toLowerCase() || '';
  return (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('econnaborted') ||
    message.includes('err_network') ||
    !error.response // No response usually means network issue
  );
};

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials);
      await SecureStore.setItemAsync('accessToken', response.accessToken);
      await SecureStore.setItemAsync('refreshToken', response.refreshToken);
      // Start proactive token refresh to prevent auto-logout
      startProactiveTokenRefresh();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Login failed');
    }
  }
);

export const checkAuth = createAsyncThunk(
  'auth/checkAuth',
  async (_, { rejectWithValue, getState }) => {
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (!token) {
        // No token means user never logged in or explicitly logged out
        return rejectWithValue({ type: 'no_token', message: 'No token' });
      }
      const user = await authService.getCurrentUser();
      // Start proactive token refresh to prevent auto-logout
      startProactiveTokenRefresh();
      return user;
    } catch (error: any) {
      console.log('[AuthSlice] checkAuth error:', error.message);

      // Check if this is a network error
      if (isNetworkIssue(error)) {
        console.log('[AuthSlice] Network error during checkAuth - keeping session');
        // Don't clear tokens on network error - user might just be offline
        return rejectWithValue({ type: 'network_error', message: 'Network error' });
      }

      // Check if this is an actual auth error (401/403)
      const status = error.response?.status;
      if (status === 401 || status === 403) {
        console.log('[AuthSlice] Auth error - clearing tokens');
        // Only clear tokens on actual auth errors
        await SecureStore.deleteItemAsync('accessToken');
        await SecureStore.deleteItemAsync('refreshToken');
        return rejectWithValue({ type: 'auth_error', message: 'Not authenticated' });
      }

      // For other errors (500, etc), don't clear tokens - might be server issue
      console.log('[AuthSlice] Server error during checkAuth - keeping session');
      return rejectWithValue({ type: 'server_error', message: error.message || 'Server error' });
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  console.log('[AuthSlice] Logging out - stopping token refresh and clearing tokens');
  // Stop proactive token refresh
  stopProactiveTokenRefresh();
  await SecureStore.deleteItemAsync('accessToken');
  await SecureStore.deleteItemAsync('refreshToken');
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
      state.networkError = false;
    },
    // Allow manual retry after network recovery
    setNetworkError: (state, action: PayloadAction<boolean>) => {
      state.networkError = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.networkError = false;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.networkError = false;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(checkAuth.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.networkError = false;
      })
      .addCase(checkAuth.rejected, (state, action) => {
        state.isLoading = false;
        const payload = action.payload as { type: string; message: string } | undefined;

        if (payload?.type === 'network_error' || payload?.type === 'server_error') {
          // Network/server error - keep authenticated state if user was logged in
          // This prevents logout on temporary network issues
          state.networkError = true;
          // Don't change isAuthenticated - let the user continue if they have tokens
          // The API interceptor will handle token refresh when network recovers
          console.log('[AuthSlice] Network/server error - preserving auth state');
        } else {
          // Actual auth error or no token - user is not authenticated
          state.isAuthenticated = false;
          state.user = null;
          state.networkError = false;
        }
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.networkError = false;
      });
  },
});

export const { clearError, setNetworkError } = authSlice.actions;
export default authSlice.reducer;
