import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { userService, User, Role, Manager } from '../../services/user.service';

interface UserState {
  users: User[];
  counselors: User[];
  telecallers: User[];
  managers: Manager[];
  roles: Role[];
  currentUser: User | null;
  total: number;
  isLoading: boolean;
  error: string | null;
}

const initialState: UserState = {
  users: [],
  counselors: [],
  telecallers: [],
  managers: [],
  roles: [],
  currentUser: null,
  total: 0,
  isLoading: false,
  error: null,
};

export const fetchUsers = createAsyncThunk(
  'users/fetchUsers',
  async (params: { page?: number; limit?: number; role?: string; search?: string }, { rejectWithValue }) => {
    try {
      const response = await userService.getAll(params);
      return response;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch users');
    }
  }
);

export const fetchCounselors = createAsyncThunk(
  'users/fetchCounselors',
  async (_, { rejectWithValue }) => {
    try {
      const response = await userService.getCounselors();
      return response;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch counselors');
    }
  }
);

export const fetchTelecallers = createAsyncThunk(
  'users/fetchTelecallers',
  async (_, { rejectWithValue }) => {
    try {
      const response = await userService.getTelecallers();
      return response;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch telecallers');
    }
  }
);

export const fetchRoles = createAsyncThunk(
  'users/fetchRoles',
  async (_, { rejectWithValue }) => {
    try {
      const response = await userService.getRoles();
      return response;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch roles');
    }
  }
);

export const fetchManagers = createAsyncThunk(
  'users/fetchManagers',
  async (_, { rejectWithValue }) => {
    try {
      const response = await userService.getManagers();
      return response;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch managers');
    }
  }
);

export const createUser = createAsyncThunk(
  'users/createUser',
  async (data: Partial<User> & { password?: string }, { rejectWithValue }) => {
    try {
      const response = await userService.create(data);
      return response;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to create user');
    }
  }
);

export const updateUser = createAsyncThunk(
  'users/updateUser',
  async ({ id, data }: { id: string; data: Partial<User> }, { rejectWithValue }) => {
    try {
      const response = await userService.update(id, data);
      return response;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to update user');
    }
  }
);

export const deleteUser = createAsyncThunk(
  'users/deleteUser',
  async (id: string, { rejectWithValue }) => {
    try {
      await userService.delete(id);
      return id;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to delete user');
    }
  }
);

const userSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch users
    builder.addCase(fetchUsers.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchUsers.fulfilled, (state, action) => {
      state.isLoading = false;
      state.users = action.payload.users;
      state.total = action.payload.total;
    });
    builder.addCase(fetchUsers.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Fetch counselors
    builder.addCase(fetchCounselors.fulfilled, (state, action) => {
      state.counselors = action.payload;
    });

    // Fetch telecallers
    builder.addCase(fetchTelecallers.fulfilled, (state, action) => {
      state.telecallers = action.payload;
    });

    // Fetch roles
    builder.addCase(fetchRoles.fulfilled, (state, action) => {
      state.roles = action.payload;
    });

    // Fetch managers
    builder.addCase(fetchManagers.fulfilled, (state, action) => {
      state.managers = action.payload;
    });

    // Create user
    builder.addCase(createUser.pending, (state) => {
      state.isLoading = true;
    });
    builder.addCase(createUser.fulfilled, (state, action) => {
      state.isLoading = false;
      state.users.unshift(action.payload);
      state.total += 1;
    });
    builder.addCase(createUser.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Update user
    builder.addCase(updateUser.fulfilled, (state, action) => {
      const index = state.users.findIndex((u) => u.id === action.payload.id);
      if (index !== -1) {
        state.users[index] = action.payload;
      }
    });

    // Delete user
    builder.addCase(deleteUser.fulfilled, (state, action) => {
      state.users = state.users.filter((u) => u.id !== action.payload);
      state.total -= 1;
    });
  },
});

export const { clearError } = userSlice.actions;
export default userSlice.reducer;
