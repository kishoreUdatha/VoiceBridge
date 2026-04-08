import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { branchService, Branch, BranchStats, CreateBranchInput, UpdateBranchInput } from '../../services/branch.service';

interface BranchState {
  branches: Branch[];
  currentBranch: Branch | null;
  currentBranchStats: BranchStats | null;
  selectedBranchId: string | null; // Admin's selected branch filter
  isLoading: boolean;
  error: string | null;
}

// Persist selected branch in localStorage
const SELECTED_BRANCH_KEY = 'selectedBranchId';

const getInitialSelectedBranch = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(SELECTED_BRANCH_KEY);
  }
  return null;
};

const initialState: BranchState = {
  branches: [],
  currentBranch: null,
  currentBranchStats: null,
  selectedBranchId: getInitialSelectedBranch(),
  isLoading: false,
  error: null,
};

export const fetchBranches = createAsyncThunk(
  'branches/fetchBranches',
  async (isActive: boolean | undefined, { rejectWithValue }) => {
    try {
      const response = await branchService.getAll(isActive);
      return response;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch branches');
    }
  }
);

export const fetchBranchById = createAsyncThunk(
  'branches/fetchBranchById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await branchService.getById(id);
      return response;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch branch');
    }
  }
);

export const fetchBranchStats = createAsyncThunk(
  'branches/fetchBranchStats',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await branchService.getBranchStats(id);
      return response;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch branch stats');
    }
  }
);

export const createBranch = createAsyncThunk(
  'branches/createBranch',
  async (data: CreateBranchInput, { rejectWithValue }) => {
    try {
      const response = await branchService.create(data);
      return response;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to create branch');
    }
  }
);

export const updateBranch = createAsyncThunk(
  'branches/updateBranch',
  async ({ id, data }: { id: string; data: UpdateBranchInput }, { rejectWithValue }) => {
    try {
      const response = await branchService.update(id, data);
      return response;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to update branch');
    }
  }
);

export const deleteBranch = createAsyncThunk(
  'branches/deleteBranch',
  async (id: string, { rejectWithValue }) => {
    try {
      await branchService.delete(id);
      return id;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to delete branch');
    }
  }
);

const branchSlice = createSlice({
  name: 'branches',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setSelectedBranch: (state, action: PayloadAction<string | null>) => {
      state.selectedBranchId = action.payload;
      // Persist to localStorage
      if (typeof window !== 'undefined') {
        if (action.payload) {
          localStorage.setItem(SELECTED_BRANCH_KEY, action.payload);
        } else {
          localStorage.removeItem(SELECTED_BRANCH_KEY);
        }
      }
    },
    clearCurrentBranch: (state) => {
      state.currentBranch = null;
      state.currentBranchStats = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch branches
    builder.addCase(fetchBranches.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchBranches.fulfilled, (state, action) => {
      state.isLoading = false;
      state.branches = action.payload;
    });
    builder.addCase(fetchBranches.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Fetch branch by ID
    builder.addCase(fetchBranchById.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchBranchById.fulfilled, (state, action) => {
      state.isLoading = false;
      state.currentBranch = action.payload;
    });
    builder.addCase(fetchBranchById.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Fetch branch stats
    builder.addCase(fetchBranchStats.fulfilled, (state, action) => {
      state.currentBranchStats = action.payload;
    });

    // Create branch
    builder.addCase(createBranch.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(createBranch.fulfilled, (state, action) => {
      state.isLoading = false;
      state.branches.push(action.payload);
    });
    builder.addCase(createBranch.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Update branch
    builder.addCase(updateBranch.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(updateBranch.fulfilled, (state, action) => {
      state.isLoading = false;
      const index = state.branches.findIndex(b => b.id === action.payload.id);
      if (index !== -1) {
        state.branches[index] = action.payload;
      }
      if (state.currentBranch?.id === action.payload.id) {
        state.currentBranch = action.payload;
      }
    });
    builder.addCase(updateBranch.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Delete branch
    builder.addCase(deleteBranch.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(deleteBranch.fulfilled, (state, action) => {
      state.isLoading = false;
      state.branches = state.branches.filter(b => b.id !== action.payload);
      if (state.currentBranch?.id === action.payload) {
        state.currentBranch = null;
      }
      if (state.selectedBranchId === action.payload) {
        state.selectedBranchId = null;
        localStorage.removeItem(SELECTED_BRANCH_KEY);
      }
    });
    builder.addCase(deleteBranch.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });
  },
});

export const { clearError, setSelectedBranch, clearCurrentBranch } = branchSlice.actions;
export default branchSlice.reducer;
