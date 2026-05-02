import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authService, LoginCredentials, RegisterData, AuthResponse } from '../../services/auth.service';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  role: string;
  permissions: string[];
  phone?: string;
  branchId?: string | null;
  branchName?: string | null;
  onboardingCompleted?: boolean;
  organizationIndustry?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean; // Track if we've checked auth status
  error: string | null;
  tenantUrl: string | null; // URL with subdomain for redirect
}

// With httpOnly cookies, we can't check localStorage for auth status
// We need to verify auth via API call on app load
const initialState: AuthState = {
  user: null,
  isAuthenticated: false, // Will be set true after successful API check
  isLoading: false,
  isInitialized: false, // Set to true after first auth check
  error: null,
  tenantUrl: null, // Set after login for subdomain redirect
};

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials);
      return response;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Login failed');
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (data: RegisterData, { rejectWithValue }) => {
    try {
      const response = await authService.register(data);
      return response;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Registration failed');
    }
  }
);

export const fetchCurrentUser = createAsyncThunk(
  'auth/fetchCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authService.getCurrentUser();
      return response;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch user');
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  await authService.logout();
});

export const loginWithOtp = createAsyncThunk(
  'auth/loginWithOtp',
  async (phone: string, { rejectWithValue }) => {
    try {
      const response = await authService.loginWithOtp(phone);
      return response;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'OTP login failed');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    // Deprecated: tokens are now in httpOnly cookies
    setTokens: (state, _action: PayloadAction<{ accessToken: string }>) => {
      state.isAuthenticated = true;
    },
    setInitialized: (state) => {
      state.isInitialized = true;
    },
  },
  extraReducers: (builder) => {
    // Login
    builder.addCase(login.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(login.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
      state.isLoading = false;
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.isInitialized = true;
      state.tenantUrl = action.payload.tenantUrl || null;
    });
    builder.addCase(login.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Register
    builder.addCase(register.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(register.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
      state.isLoading = false;
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.isInitialized = true;
    });
    builder.addCase(register.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Fetch current user (used to check auth status on app load)
    builder.addCase(fetchCurrentUser.pending, (state) => {
      state.isLoading = true;
    });
    builder.addCase(fetchCurrentUser.fulfilled, (state, action) => {
      state.isLoading = false;
      state.user = action.payload;
      state.isAuthenticated = true;
      state.isInitialized = true;
    });
    builder.addCase(fetchCurrentUser.rejected, (state) => {
      state.isLoading = false;
      state.isAuthenticated = false;
      state.user = null;
      state.isInitialized = true;
    });

    // Logout
    builder.addCase(logout.fulfilled, (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.tenantUrl = null;
    });

    // Login with OTP
    builder.addCase(loginWithOtp.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(loginWithOtp.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
      state.isLoading = false;
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.isInitialized = true;
      state.tenantUrl = action.payload.tenantUrl || null;
    });
    builder.addCase(loginWithOtp.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });
  },
});

export const { clearError, setTokens, setInitialized } = authSlice.actions;
export default authSlice.reducer;
