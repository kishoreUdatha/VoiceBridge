import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  visitService,
  Visit,
  VisitStats,
  VisitFilter,
  CheckInData,
  CheckOutData,
  CreateVisitData,
  TodaySchedule,
} from '../../../services/fieldSales/visit.service';

interface VisitState {
  visits: Visit[];
  currentVisit: Visit | null;
  openVisit: Visit | null;
  hasOpenVisit: boolean;
  stats: VisitStats | null;
  todaySchedule: TodaySchedule | null;
  total: number;
  page: number;
  limit: number;
  isLoading: boolean;
  isCheckingIn: boolean;
  isCheckingOut: boolean;
  error: string | null;
}

const initialState: VisitState = {
  visits: [],
  currentVisit: null,
  openVisit: null,
  hasOpenVisit: false,
  stats: null,
  todaySchedule: null,
  total: 0,
  page: 1,
  limit: 20,
  isLoading: false,
  isCheckingIn: false,
  isCheckingOut: false,
  error: null,
};

export const checkIn = createAsyncThunk(
  'fieldSales/visits/checkIn',
  async (data: CheckInData, { rejectWithValue }) => {
    try {
      return await visitService.checkIn(data);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to check in');
    }
  }
);

export const checkOut = createAsyncThunk(
  'fieldSales/visits/checkOut',
  async ({ visitId, data }: { visitId: string; data: CheckOutData }, { rejectWithValue }) => {
    try {
      return await visitService.checkOut(visitId, data);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to check out');
    }
  }
);

export const fetchVisits = createAsyncThunk(
  'fieldSales/visits/fetchVisits',
  async (
    { filter, page, limit }: { filter?: VisitFilter; page?: number; limit?: number },
    { rejectWithValue }
  ) => {
    try {
      return await visitService.getVisits(filter, page, limit);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch visits');
    }
  }
);

export const fetchVisitById = createAsyncThunk(
  'fieldSales/visits/fetchVisitById',
  async (id: string, { rejectWithValue }) => {
    try {
      return await visitService.getVisitById(id);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch visit');
    }
  }
);

export const createVisit = createAsyncThunk(
  'fieldSales/visits/createVisit',
  async (data: CreateVisitData, { rejectWithValue }) => {
    try {
      return await visitService.createVisit(data);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to create visit');
    }
  }
);

export const updateVisit = createAsyncThunk(
  'fieldSales/visits/updateVisit',
  async ({ id, data }: { id: string; data: Partial<CheckOutData> }, { rejectWithValue }) => {
    try {
      return await visitService.updateVisit(id, data);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to update visit');
    }
  }
);

export const deleteVisit = createAsyncThunk(
  'fieldSales/visits/deleteVisit',
  async (id: string, { rejectWithValue }) => {
    try {
      await visitService.deleteVisit(id);
      return id;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to delete visit');
    }
  }
);

export const fetchOpenVisit = createAsyncThunk(
  'fieldSales/visits/fetchOpenVisit',
  async (_, { rejectWithValue }) => {
    try {
      return await visitService.getOpenVisit();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch open visit');
    }
  }
);

export const fetchVisitStats = createAsyncThunk(
  'fieldSales/visits/fetchStats',
  async (
    { userId, startDate, endDate }: { userId?: string; startDate?: string; endDate?: string },
    { rejectWithValue }
  ) => {
    try {
      return await visitService.getVisitStats(userId, startDate, endDate);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch visit stats');
    }
  }
);

export const fetchTodaySchedule = createAsyncThunk(
  'fieldSales/visits/fetchTodaySchedule',
  async (_, { rejectWithValue }) => {
    try {
      return await visitService.getTodaySchedule();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch today schedule');
    }
  }
);

const visitSlice = createSlice({
  name: 'fieldSales/visits',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentVisit: (state) => {
      state.currentVisit = null;
    },
    setPage: (state, action) => {
      state.page = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Check in
    builder.addCase(checkIn.pending, (state) => {
      state.isCheckingIn = true;
      state.error = null;
    });
    builder.addCase(checkIn.fulfilled, (state, action) => {
      state.isCheckingIn = false;
      state.openVisit = action.payload;
      state.hasOpenVisit = true;
      state.visits.unshift(action.payload);
    });
    builder.addCase(checkIn.rejected, (state, action) => {
      state.isCheckingIn = false;
      state.error = action.payload as string;
    });

    // Check out
    builder.addCase(checkOut.pending, (state) => {
      state.isCheckingOut = true;
      state.error = null;
    });
    builder.addCase(checkOut.fulfilled, (state, action) => {
      state.isCheckingOut = false;
      state.openVisit = null;
      state.hasOpenVisit = false;
      const index = state.visits.findIndex((v) => v.id === action.payload.id);
      if (index !== -1) {
        state.visits[index] = action.payload;
      }
    });
    builder.addCase(checkOut.rejected, (state, action) => {
      state.isCheckingOut = false;
      state.error = action.payload as string;
    });

    // Fetch visits
    builder.addCase(fetchVisits.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchVisits.fulfilled, (state, action) => {
      state.isLoading = false;
      state.visits = action.payload.visits;
      state.total = action.payload.total;
    });
    builder.addCase(fetchVisits.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Fetch visit by ID
    builder.addCase(fetchVisitById.pending, (state) => {
      state.isLoading = true;
    });
    builder.addCase(fetchVisitById.fulfilled, (state, action) => {
      state.isLoading = false;
      state.currentVisit = action.payload;
    });
    builder.addCase(fetchVisitById.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Create visit
    builder.addCase(createVisit.fulfilled, (state, action) => {
      state.visits.unshift(action.payload);
      state.total += 1;
    });

    // Update visit
    builder.addCase(updateVisit.fulfilled, (state, action) => {
      const index = state.visits.findIndex((v) => v.id === action.payload.id);
      if (index !== -1) {
        state.visits[index] = action.payload;
      }
      if (state.currentVisit?.id === action.payload.id) {
        state.currentVisit = action.payload;
      }
    });

    // Delete visit
    builder.addCase(deleteVisit.fulfilled, (state, action) => {
      state.visits = state.visits.filter((v) => v.id !== action.payload);
      state.total -= 1;
    });

    // Fetch open visit
    builder.addCase(fetchOpenVisit.fulfilled, (state, action) => {
      state.openVisit = action.payload.visit;
      state.hasOpenVisit = action.payload.hasOpenVisit;
    });

    // Fetch stats
    builder.addCase(fetchVisitStats.fulfilled, (state, action) => {
      state.stats = action.payload;
    });

    // Fetch today schedule
    builder.addCase(fetchTodaySchedule.fulfilled, (state, action) => {
      state.todaySchedule = action.payload;
    });
  },
});

export const { clearError, clearCurrentVisit, setPage } = visitSlice.actions;
export default visitSlice.reducer;
