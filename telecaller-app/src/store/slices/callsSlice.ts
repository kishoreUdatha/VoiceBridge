import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { telecallerApi } from '../../api/telecaller';
import {
  CallsState,
  Call,
  StartCallPayload,
  UpdateCallPayload,
  TelecallerStats,
  STORAGE_KEYS,
} from '../../types';

interface CallsStateWithStats extends CallsState {
  stats: TelecallerStats | null;
  pendingUploads: Array<{ callId: string; recordingPath: string }>;
  outcomeCounts: Record<string, number>;
  currentRecordingPath: string | null;
}

const initialState: CallsStateWithStats = {
  calls: [],
  currentCall: null,
  isRecording: false,
  callDuration: 0,
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    hasMore: true,
  },
  stats: null,
  pendingUploads: [],
  outcomeCounts: {},
  currentRecordingPath: null,
};

// Async thunks
export const fetchStats = createAsyncThunk('calls/fetchStats', async (_, { rejectWithValue }) => {
  try {
    const stats = await telecallerApi.getStats();
    return stats;
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch stats');
  }
});

export const fetchCalls = createAsyncThunk(
  'calls/fetchCalls',
  async (
    {
      page = 1,
      filters,
      refresh = false,
    }: {
      page?: number;
      filters?: { startDate?: string; endDate?: string; outcome?: string };
      refresh?: boolean;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await telecallerApi.getCalls(page, 20, filters);
      return {
        calls: response.data,
        pagination: response.pagination,
        outcomeCounts: response.outcomeCounts || {},
        refresh,
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch calls');
    }
  }
);

export const fetchCallHistory = createAsyncThunk(
  'calls/fetchCallHistory',
  async ({ leadId }: { leadId: string }, { rejectWithValue }) => {
    try {
      const calls = await telecallerApi.getCallsByLead(leadId);
      return calls;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch call history');
    }
  }
);

export const startCall = createAsyncThunk(
  'calls/startCall',
  async (payload: StartCallPayload, { rejectWithValue }) => {
    try {
      const call = await telecallerApi.startCall(payload);
      return call;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to start call');
    }
  }
);

export const updateCall = createAsyncThunk(
  'calls/updateCall',
  async (
    { callId, payload }: { callId: string; payload: UpdateCallPayload },
    { rejectWithValue }
  ) => {
    try {
      const call = await telecallerApi.updateCall(callId, payload);
      return call;
    } catch (error) {
      // Store update locally for retry
      const pendingCalls = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_CALLS);
      const pending = pendingCalls ? JSON.parse(pendingCalls) : [];
      pending.push({ callId, payload, timestamp: Date.now() });
      await AsyncStorage.setItem(STORAGE_KEYS.PENDING_CALLS, JSON.stringify(pending));

      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update call');
    }
  }
);

export const uploadRecording = createAsyncThunk(
  'calls/uploadRecording',
  async (
    {
      callId,
      recordingPath,
      duration,
      onProgress,
    }: { callId: string; recordingPath: string; duration?: number; onProgress?: (progress: number) => void },
    { rejectWithValue }
  ) => {
    try {
      const result = await telecallerApi.uploadRecording(callId, recordingPath, duration, onProgress);
      return { callId, ...result };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to upload recording');
    }
  }
);

export const syncPendingCalls = createAsyncThunk(
  'calls/syncPending',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const pendingCalls = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_CALLS);
      if (!pendingCalls) return [];

      const pending = JSON.parse(pendingCalls);
      const synced: string[] = [];
      const failed: any[] = [];

      for (const item of pending) {
        try {
          await telecallerApi.updateCall(item.callId, item.payload);
          synced.push(item.callId);
        } catch {
          failed.push(item);
        }
      }

      // Keep only failed items
      await AsyncStorage.setItem(STORAGE_KEYS.PENDING_CALLS, JSON.stringify(failed));

      return synced;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Sync failed');
    }
  }
);

const callsSlice = createSlice({
  name: 'calls',
  initialState,
  reducers: {
    setCurrentCall: (state, action: PayloadAction<Call | null>) => {
      state.currentCall = action.payload;
    },
    setIsRecording: (state, action: PayloadAction<boolean>) => {
      state.isRecording = action.payload;
    },
    setCallDuration: (state, action: PayloadAction<number>) => {
      state.callDuration = action.payload;
    },
    incrementCallDuration: (state) => {
      state.callDuration += 1;
    },
    resetCallState: (state) => {
      state.currentCall = null;
      state.isRecording = false;
      state.callDuration = 0;
      state.currentRecordingPath = null;
    },
    setRecordingPath: (state, action: PayloadAction<string | null>) => {
      state.currentRecordingPath = action.payload;
    },
    addPendingUpload: (
      state,
      action: PayloadAction<{ callId: string; recordingPath: string }>
    ) => {
      state.pendingUploads.push(action.payload);
    },
    removePendingUpload: (state, action: PayloadAction<string>) => {
      state.pendingUploads = state.pendingUploads.filter((u) => u.callId !== action.payload);
    },
    clearError: (state) => {
      state.error = null;
    },
    resetCalls: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Fetch Stats
      .addCase(fetchStats.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchStats.fulfilled, (state, action) => {
        state.isLoading = false;
        state.stats = action.payload;
      })
      .addCase(fetchStats.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch Calls
      .addCase(fetchCalls.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCalls.fulfilled, (state, action) => {
        state.isLoading = false;
        const { calls, pagination, outcomeCounts, refresh } = action.payload;

        if (refresh || pagination.page === 1) {
          state.calls = calls;
        } else {
          const existingIds = new Set(state.calls.map((c) => c.id));
          const newCalls = calls.filter((c) => !existingIds.has(c.id));
          state.calls = [...state.calls, ...newCalls];
        }

        state.pagination = {
          page: pagination.page,
          limit: pagination.limit,
          total: pagination.total,
          hasMore: pagination.page < pagination.totalPages,
        };

        // Update outcome counts
        if (outcomeCounts && Object.keys(outcomeCounts).length > 0) {
          state.outcomeCounts = outcomeCounts;
        }
      })
      .addCase(fetchCalls.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Start Call
      .addCase(startCall.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(startCall.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentCall = action.payload;
        state.callDuration = 0;
      })
      .addCase(startCall.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update Call
      .addCase(updateCall.fulfilled, (state, action) => {
        state.currentCall = action.payload;
        // Update in list
        const index = state.calls.findIndex((c) => c.id === action.payload.id);
        if (index >= 0) {
          state.calls[index] = action.payload;
        } else {
          state.calls.unshift(action.payload);
        }
      })
      // Upload Recording
      .addCase(uploadRecording.fulfilled, (state, action) => {
        const index = state.calls.findIndex((c) => c.id === action.payload.callId);
        if (index >= 0) {
          state.calls[index].recordingUrl = action.payload.recordingUrl;
        }
        state.pendingUploads = state.pendingUploads.filter(
          (u) => u.callId !== action.payload.callId
        );
      })
      .addCase(uploadRecording.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // Fetch Call History
      .addCase(fetchCallHistory.fulfilled, (state, action) => {
        // Merge with existing calls, avoiding duplicates
        const existingIds = new Set(state.calls.map((c) => c.id));
        const newCalls = action.payload.filter((c: Call) => !existingIds.has(c.id));
        state.calls = [...state.calls, ...newCalls];
      });
  },
});

export const {
  setCurrentCall,
  setIsRecording,
  setCallDuration,
  incrementCallDuration,
  resetCallState,
  setRecordingPath,
  addPendingUpload,
  removePendingUpload,
  clearError,
  resetCalls,
} = callsSlice.actions;

export default callsSlice.reducer;
