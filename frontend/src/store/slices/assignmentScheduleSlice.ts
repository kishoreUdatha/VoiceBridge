import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  assignmentScheduleService,
  AssignmentSchedule,
  AssignmentRunLog,
  CapacityStats,
  CreateScheduleData,
  UpdateScheduleData,
} from '../../services/assignmentSchedule.service';

interface AssignmentScheduleState {
  schedules: AssignmentSchedule[];
  currentSchedule: AssignmentSchedule | null;
  runLogs: AssignmentRunLog[];
  runLogsTotal: number;
  capacityStats: CapacityStats | null;
  isLoading: boolean;
  isRunning: boolean;
  error: string | null;
}

const initialState: AssignmentScheduleState = {
  schedules: [],
  currentSchedule: null,
  runLogs: [],
  runLogsTotal: 0,
  capacityStats: null,
  isLoading: false,
  isRunning: false,
  error: null,
};

export const fetchSchedules = createAsyncThunk(
  'assignmentSchedules/fetchSchedules',
  async (_, { rejectWithValue }) => {
    try {
      return await assignmentScheduleService.getSchedules();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch schedules');
    }
  }
);

export const fetchScheduleById = createAsyncThunk(
  'assignmentSchedules/fetchScheduleById',
  async (id: string, { rejectWithValue }) => {
    try {
      return await assignmentScheduleService.getScheduleById(id);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch schedule');
    }
  }
);

export const createSchedule = createAsyncThunk(
  'assignmentSchedules/createSchedule',
  async (data: CreateScheduleData, { rejectWithValue }) => {
    try {
      return await assignmentScheduleService.createSchedule(data);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to create schedule');
    }
  }
);

export const updateSchedule = createAsyncThunk(
  'assignmentSchedules/updateSchedule',
  async ({ id, data }: { id: string; data: UpdateScheduleData }, { rejectWithValue }) => {
    try {
      return await assignmentScheduleService.updateSchedule(id, data);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to update schedule');
    }
  }
);

export const deleteSchedule = createAsyncThunk(
  'assignmentSchedules/deleteSchedule',
  async (id: string, { rejectWithValue }) => {
    try {
      await assignmentScheduleService.deleteSchedule(id);
      return id;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to delete schedule');
    }
  }
);

export const runSchedule = createAsyncThunk(
  'assignmentSchedules/runSchedule',
  async (id: string, { rejectWithValue }) => {
    try {
      return await assignmentScheduleService.runSchedule(id);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to run schedule');
    }
  }
);

export const fetchRunLogs = createAsyncThunk(
  'assignmentSchedules/fetchRunLogs',
  async ({ id, page, limit }: { id: string; page?: number; limit?: number }, { rejectWithValue }) => {
    try {
      return await assignmentScheduleService.getRunLogs(id, page, limit);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch run logs');
    }
  }
);

export const fetchCapacityStats = createAsyncThunk(
  'assignmentSchedules/fetchCapacityStats',
  async (_, { rejectWithValue }) => {
    try {
      return await assignmentScheduleService.getCapacityStats();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch capacity stats');
    }
  }
);

const assignmentScheduleSlice = createSlice({
  name: 'assignmentSchedules',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentSchedule: (state) => {
      state.currentSchedule = null;
      state.runLogs = [];
      state.runLogsTotal = 0;
    },
  },
  extraReducers: (builder) => {
    // Fetch schedules
    builder.addCase(fetchSchedules.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchSchedules.fulfilled, (state, action) => {
      state.isLoading = false;
      state.schedules = action.payload;
    });
    builder.addCase(fetchSchedules.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Fetch schedule by ID
    builder.addCase(fetchScheduleById.pending, (state) => {
      state.isLoading = true;
    });
    builder.addCase(fetchScheduleById.fulfilled, (state, action) => {
      state.isLoading = false;
      state.currentSchedule = action.payload;
    });
    builder.addCase(fetchScheduleById.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Create schedule
    builder.addCase(createSchedule.pending, (state) => {
      state.isLoading = true;
    });
    builder.addCase(createSchedule.fulfilled, (state, action) => {
      state.isLoading = false;
      state.schedules.unshift(action.payload);
    });
    builder.addCase(createSchedule.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Update schedule
    builder.addCase(updateSchedule.pending, (state) => {
      state.isLoading = true;
    });
    builder.addCase(updateSchedule.fulfilled, (state, action) => {
      state.isLoading = false;
      const index = state.schedules.findIndex((s) => s.id === action.payload.id);
      if (index !== -1) {
        state.schedules[index] = action.payload;
      }
      if (state.currentSchedule?.id === action.payload.id) {
        state.currentSchedule = action.payload;
      }
    });
    builder.addCase(updateSchedule.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Delete schedule
    builder.addCase(deleteSchedule.fulfilled, (state, action) => {
      state.schedules = state.schedules.filter((s) => s.id !== action.payload);
    });

    // Run schedule
    builder.addCase(runSchedule.pending, (state) => {
      state.isRunning = true;
    });
    builder.addCase(runSchedule.fulfilled, (state, action) => {
      state.isRunning = false;
      // Add new run log to the front
      state.runLogs.unshift(action.payload);
      state.runLogsTotal += 1;
    });
    builder.addCase(runSchedule.rejected, (state, action) => {
      state.isRunning = false;
      state.error = action.payload as string;
    });

    // Fetch run logs
    builder.addCase(fetchRunLogs.fulfilled, (state, action) => {
      state.runLogs = action.payload.logs;
      state.runLogsTotal = action.payload.total;
    });

    // Fetch capacity stats
    builder.addCase(fetchCapacityStats.fulfilled, (state, action) => {
      state.capacityStats = action.payload;
    });
  },
});

export const { clearError, clearCurrentSchedule } = assignmentScheduleSlice.actions;
export default assignmentScheduleSlice.reducer;
