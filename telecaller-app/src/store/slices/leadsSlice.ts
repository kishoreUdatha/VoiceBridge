import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { leadsApi } from '../../api/leads';
import { LeadsState, Lead, LeadStatus, LeadFormData } from '../../types';

const initialState: LeadsState = {
  leads: [],
  selectedLead: null,
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    hasMore: true,
  },
  filters: {},
};

// Async thunks
export const fetchLeads = createAsyncThunk(
  'leads/fetchLeads',
  async (
    {
      page = 1,
      refresh = false,
      showTeam = false,
    }: { page?: number; refresh?: boolean; showTeam?: boolean },
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as { leads: LeadsState };
      const { filters } = state.leads;

      const response = await leadsApi.getAssignedLeads(page, 20, { ...filters, showTeam });
      console.log('[LeadsSlice] Got leads:', response.data?.length, 'pagination:', response.pagination);

      return {
        leads: response.data,
        pagination: response.pagination,
        refresh,
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch leads');
    }
  }
);

export const fetchCachedLeads = createAsyncThunk(
  'leads/fetchCachedLeads',
  async (_, { rejectWithValue }) => {
    try {
      const leads = await leadsApi.getCachedLeads();
      return leads;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to fetch cached leads'
      );
    }
  }
);

export const searchLeads = createAsyncThunk(
  'leads/searchLeads',
  async (query: string, { rejectWithValue }) => {
    try {
      // First try online search
      const response = await leadsApi.getAssignedLeads(1, 50, { search: query });
      return response.data;
    } catch {
      // Fall back to offline search
      const leads = await leadsApi.searchCachedLeads(query);
      return leads;
    }
  }
);

export const fetchLead = createAsyncThunk(
  'leads/fetchLead',
  async (leadId: string, { rejectWithValue }) => {
    try {
      const lead = await leadsApi.getLead(leadId);
      return lead;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch lead');
    }
  }
);

export const updateLeadStatus = createAsyncThunk(
  'leads/updateStatus',
  async ({ leadId, status }: { leadId: string; status: LeadStatus }, { rejectWithValue }) => {
    try {
      const lead = await leadsApi.updateLeadStatus(leadId, status);
      return lead;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to update lead status'
      );
    }
  }
);

export const fetchLeadById = createAsyncThunk(
  'leads/fetchLeadById',
  async (leadId: string, { rejectWithValue }) => {
    try {
      const lead = await leadsApi.getLead(leadId);
      return lead;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch lead');
    }
  }
);

export const updateLead = createAsyncThunk(
  'leads/updateLead',
  async ({ leadId, data }: { leadId: string; data: LeadFormData }, { rejectWithValue }) => {
    try {
      const lead = await leadsApi.updateLead(leadId, data);
      return lead;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update lead');
    }
  }
);

export const createLead = createAsyncThunk(
  'leads/createLead',
  async (data: LeadFormData, { rejectWithValue }) => {
    try {
      const lead = await leadsApi.createLead(data);
      return lead;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create lead');
    }
  }
);

const leadsSlice = createSlice({
  name: 'leads',
  initialState,
  reducers: {
    setFilter: (state, action: PayloadAction<{ status?: LeadStatus; search?: string }>) => {
      state.filters = { ...state.filters, ...action.payload };
      state.pagination.page = 1;
      state.leads = [];
    },
    clearFilters: (state) => {
      state.filters = {};
      state.pagination.page = 1;
    },
    selectLead: (state, action: PayloadAction<Lead | null>) => {
      state.selectedLead = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    resetLeads: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Fetch Leads
      .addCase(fetchLeads.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchLeads.fulfilled, (state, action) => {
        state.isLoading = false;
        const { leads, pagination, refresh } = action.payload;

        if (refresh || pagination.page === 1) {
          state.leads = leads;
        } else {
          // Append new leads, avoiding duplicates
          const existingIds = new Set(state.leads.map((l) => l.id));
          const newLeads = leads.filter((l) => !existingIds.has(l.id));
          state.leads = [...state.leads, ...newLeads];
        }

        state.pagination = {
          page: pagination.page,
          limit: pagination.limit,
          total: pagination.total,
          hasMore: pagination.page < pagination.totalPages,
        };
      })
      .addCase(fetchLeads.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch Cached Leads
      .addCase(fetchCachedLeads.fulfilled, (state, action) => {
        state.leads = action.payload;
        state.pagination.hasMore = false;
      })
      // Search Leads
      .addCase(searchLeads.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(searchLeads.fulfilled, (state, action) => {
        state.isLoading = false;
        state.leads = action.payload;
        state.pagination.hasMore = false;
      })
      .addCase(searchLeads.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch Single Lead
      .addCase(fetchLead.fulfilled, (state, action) => {
        state.selectedLead = action.payload;
        // Update in list if exists
        const index = state.leads.findIndex((l) => l.id === action.payload.id);
        if (index >= 0) {
          state.leads[index] = action.payload;
        }
      })
      // Update Lead Status
      .addCase(updateLeadStatus.fulfilled, (state, action) => {
        const index = state.leads.findIndex((l) => l.id === action.payload.id);
        if (index >= 0) {
          state.leads[index] = action.payload;
        }
        if (state.selectedLead?.id === action.payload.id) {
          state.selectedLead = action.payload;
        }
      })
      // Fetch Lead By ID
      .addCase(fetchLeadById.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchLeadById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedLead = action.payload;
        const index = state.leads.findIndex((l) => l.id === action.payload.id);
        if (index >= 0) {
          state.leads[index] = action.payload;
        }
      })
      .addCase(fetchLeadById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update Lead
      .addCase(updateLead.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateLead.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.leads.findIndex((l) => l.id === action.payload.id);
        if (index >= 0) {
          state.leads[index] = action.payload;
        }
        if (state.selectedLead?.id === action.payload.id) {
          state.selectedLead = action.payload;
        }
      })
      .addCase(updateLead.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Create Lead
      .addCase(createLead.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createLead.fulfilled, (state, action) => {
        state.isLoading = false;
        state.leads.unshift(action.payload);
        state.pagination.total += 1;
      })
      .addCase(createLead.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setFilter, clearFilters, selectLead, clearError, resetLeads } = leadsSlice.actions;
export default leadsSlice.reducer;
