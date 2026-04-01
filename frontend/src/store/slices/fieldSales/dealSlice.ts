import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  dealService,
  Deal,
  DealStats,
  DealFilter,
  CreateDealData,
  UpdateDealData,
  Pipeline,
  DealStage,
} from '../../../services/fieldSales/deal.service';

interface DealState {
  deals: Deal[];
  currentDeal: Deal | null;
  pipeline: Pipeline | null;
  stats: DealStats | null;
  recentWins: Deal[];
  total: number;
  page: number;
  limit: number;
  isLoading: boolean;
  error: string | null;
}

const initialState: DealState = {
  deals: [],
  currentDeal: null,
  pipeline: null,
  stats: null,
  recentWins: [],
  total: 0,
  page: 1,
  limit: 20,
  isLoading: false,
  error: null,
};

export const fetchDeals = createAsyncThunk(
  'fieldSales/deals/fetchDeals',
  async (
    { filter, page, limit }: { filter?: DealFilter; page?: number; limit?: number },
    { rejectWithValue }
  ) => {
    try {
      return await dealService.getDeals(filter, page, limit);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch deals');
    }
  }
);

export const fetchDealById = createAsyncThunk(
  'fieldSales/deals/fetchDealById',
  async (id: string, { rejectWithValue }) => {
    try {
      return await dealService.getDealById(id);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch deal');
    }
  }
);

export const fetchDealByCollegeId = createAsyncThunk(
  'fieldSales/deals/fetchDealByCollegeId',
  async (collegeId: string, { rejectWithValue }) => {
    try {
      return await dealService.getDealByCollegeId(collegeId);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch deal');
    }
  }
);

export const createDeal = createAsyncThunk(
  'fieldSales/deals/createDeal',
  async (data: CreateDealData, { rejectWithValue }) => {
    try {
      return await dealService.createDeal(data);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to create deal');
    }
  }
);

export const updateDeal = createAsyncThunk(
  'fieldSales/deals/updateDeal',
  async ({ id, data }: { id: string; data: UpdateDealData }, { rejectWithValue }) => {
    try {
      return await dealService.updateDeal(id, data);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to update deal');
    }
  }
);

export const updateStage = createAsyncThunk(
  'fieldSales/deals/updateStage',
  async ({ id, stage, reason }: { id: string; stage: DealStage; reason?: string }, { rejectWithValue }) => {
    try {
      return await dealService.updateStage(id, stage, reason);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to update stage');
    }
  }
);

export const deleteDeal = createAsyncThunk(
  'fieldSales/deals/deleteDeal',
  async (id: string, { rejectWithValue }) => {
    try {
      await dealService.deleteDeal(id);
      return id;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to delete deal');
    }
  }
);

export const fetchPipeline = createAsyncThunk(
  'fieldSales/deals/fetchPipeline',
  async (ownerId: string | undefined, { rejectWithValue }) => {
    try {
      return await dealService.getPipeline(ownerId);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch pipeline');
    }
  }
);

export const fetchDealStats = createAsyncThunk(
  'fieldSales/deals/fetchStats',
  async (
    { ownerId, startDate, endDate }: { ownerId?: string; startDate?: string; endDate?: string },
    { rejectWithValue }
  ) => {
    try {
      return await dealService.getDealStats(ownerId, startDate, endDate);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch deal stats');
    }
  }
);

export const fetchRecentWins = createAsyncThunk(
  'fieldSales/deals/fetchRecentWins',
  async (limit: number = 5, { rejectWithValue }) => {
    try {
      return await dealService.getRecentWins(limit);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch recent wins');
    }
  }
);

const dealSlice = createSlice({
  name: 'fieldSales/deals',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentDeal: (state) => {
      state.currentDeal = null;
    },
    setPage: (state, action) => {
      state.page = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Fetch deals
    builder.addCase(fetchDeals.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchDeals.fulfilled, (state, action) => {
      state.isLoading = false;
      state.deals = action.payload.deals;
      state.total = action.payload.total;
    });
    builder.addCase(fetchDeals.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Fetch deal by ID
    builder.addCase(fetchDealById.pending, (state) => {
      state.isLoading = true;
    });
    builder.addCase(fetchDealById.fulfilled, (state, action) => {
      state.isLoading = false;
      state.currentDeal = action.payload;
    });
    builder.addCase(fetchDealById.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Fetch deal by college ID
    builder.addCase(fetchDealByCollegeId.fulfilled, (state, action) => {
      state.currentDeal = action.payload;
    });

    // Create deal
    builder.addCase(createDeal.fulfilled, (state, action) => {
      state.deals.unshift(action.payload);
      state.total += 1;
    });

    // Update deal
    builder.addCase(updateDeal.fulfilled, (state, action) => {
      const index = state.deals.findIndex((d) => d.id === action.payload.id);
      if (index !== -1) {
        state.deals[index] = action.payload;
      }
      if (state.currentDeal?.id === action.payload.id) {
        state.currentDeal = action.payload;
      }
    });

    // Update stage
    builder.addCase(updateStage.fulfilled, (state, action) => {
      const index = state.deals.findIndex((d) => d.id === action.payload.id);
      if (index !== -1) {
        state.deals[index] = action.payload;
      }
      if (state.currentDeal?.id === action.payload.id) {
        state.currentDeal = action.payload;
      }
      // Update pipeline if loaded
      if (state.pipeline) {
        // Re-fetch pipeline after stage change would be better
      }
    });

    // Delete deal
    builder.addCase(deleteDeal.fulfilled, (state, action) => {
      state.deals = state.deals.filter((d) => d.id !== action.payload);
      state.total -= 1;
    });

    // Fetch pipeline
    builder.addCase(fetchPipeline.pending, (state) => {
      state.isLoading = true;
    });
    builder.addCase(fetchPipeline.fulfilled, (state, action) => {
      state.isLoading = false;
      state.pipeline = action.payload;
    });
    builder.addCase(fetchPipeline.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Fetch stats
    builder.addCase(fetchDealStats.fulfilled, (state, action) => {
      state.stats = action.payload;
    });

    // Fetch recent wins
    builder.addCase(fetchRecentWins.fulfilled, (state, action) => {
      state.recentWins = action.payload;
    });
  },
});

export const { clearError, clearCurrentDeal, setPage } = dealSlice.actions;
export default dealSlice.reducer;
