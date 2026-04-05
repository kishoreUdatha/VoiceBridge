import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  collegeService,
  College,
  CollegeStats,
  CollegeFilter,
  CreateCollegeData,
  UpdateCollegeData,
  CreateContactData,
} from '../../../services/fieldSales/college.service';

interface FieldOfficer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  collegeCount: number;
  visitCount: number;
  totalExpenses: number;
}

interface CollegeState {
  colleges: College[];
  currentCollege: College | null;
  stats: CollegeStats | null;
  cities: Array<{ city: string; state: string; count?: number }>;
  states: Array<{ state: string; count?: number }>;
  districts: Array<{ district: string; state: string; count?: number }>;
  fieldOfficers: FieldOfficer[];
  total: number;
  page: number;
  limit: number;
  isLoading: boolean;
  error: string | null;
}

const initialState: CollegeState = {
  colleges: [],
  currentCollege: null,
  stats: null,
  cities: [],
  states: [],
  districts: [],
  fieldOfficers: [],
  total: 0,
  page: 1,
  limit: 20,
  isLoading: false,
  error: null,
};

export const fetchColleges = createAsyncThunk(
  'fieldSales/colleges/fetchColleges',
  async (
    {
      filter,
      page,
      limit,
      sortBy,
      sortOrder,
    }: {
      filter?: CollegeFilter;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
    { rejectWithValue }
  ) => {
    try {
      return await collegeService.getColleges(filter, page, limit, sortBy, sortOrder);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch colleges');
    }
  }
);

export const fetchCollegeById = createAsyncThunk(
  'fieldSales/colleges/fetchCollegeById',
  async (id: string, { rejectWithValue }) => {
    try {
      return await collegeService.getCollegeById(id);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch college');
    }
  }
);

export const createCollege = createAsyncThunk(
  'fieldSales/colleges/createCollege',
  async (data: CreateCollegeData, { rejectWithValue }) => {
    try {
      return await collegeService.createCollege(data);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to create college');
    }
  }
);

export const updateCollege = createAsyncThunk(
  'fieldSales/colleges/updateCollege',
  async ({ id, data }: { id: string; data: UpdateCollegeData }, { rejectWithValue }) => {
    try {
      return await collegeService.updateCollege(id, data);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to update college');
    }
  }
);

export const deleteCollege = createAsyncThunk(
  'fieldSales/colleges/deleteCollege',
  async (id: string, { rejectWithValue }) => {
    try {
      await collegeService.deleteCollege(id);
      return id;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to delete college');
    }
  }
);

export const reassignCollege = createAsyncThunk(
  'fieldSales/colleges/reassignCollege',
  async ({ id, newAssigneeId }: { id: string; newAssigneeId: string }, { rejectWithValue }) => {
    try {
      return await collegeService.reassignCollege(id, newAssigneeId);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to reassign college');
    }
  }
);

export const fetchCollegeStats = createAsyncThunk(
  'fieldSales/colleges/fetchStats',
  async (userId: string | undefined, { rejectWithValue }) => {
    try {
      return await collegeService.getCollegeStats(userId);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch stats');
    }
  }
);

export const fetchCities = createAsyncThunk(
  'fieldSales/colleges/fetchCities',
  async (params: { state?: string; district?: string } | undefined, { rejectWithValue }) => {
    try {
      return await collegeService.getCities(params?.state, params?.district);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch cities');
    }
  }
);

export const fetchStates = createAsyncThunk(
  'fieldSales/colleges/fetchStates',
  async (_, { rejectWithValue }) => {
    try {
      // Use all-states endpoint to get complete list of Indian states
      return await collegeService.getAllIndianStates();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch states');
    }
  }
);

export const fetchDistricts = createAsyncThunk(
  'fieldSales/colleges/fetchDistricts',
  async (state: string, { rejectWithValue }) => {
    try {
      // Use all-districts endpoint to get complete list of districts for a state
      return await collegeService.getAllIndianDistricts(state);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch districts');
    }
  }
);

export const fetchFieldOfficers = createAsyncThunk(
  'fieldSales/colleges/fetchFieldOfficers',
  async (_, { rejectWithValue }) => {
    try {
      return await collegeService.getFieldOfficers();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch field officers');
    }
  }
);

export const addContact = createAsyncThunk(
  'fieldSales/colleges/addContact',
  async ({ collegeId, data }: { collegeId: string; data: CreateContactData }, { rejectWithValue }) => {
    try {
      return await collegeService.addContact(collegeId, data);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to add contact');
    }
  }
);

export const updateContact = createAsyncThunk(
  'fieldSales/colleges/updateContact',
  async (
    { collegeId, contactId, data }: { collegeId: string; contactId: string; data: Partial<CreateContactData> },
    { rejectWithValue }
  ) => {
    try {
      return await collegeService.updateContact(collegeId, contactId, data);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to update contact');
    }
  }
);

export const deleteContact = createAsyncThunk(
  'fieldSales/colleges/deleteContact',
  async ({ collegeId, contactId }: { collegeId: string; contactId: string }, { rejectWithValue }) => {
    try {
      await collegeService.deleteContact(collegeId, contactId);
      return contactId;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to delete contact');
    }
  }
);

const collegeSlice = createSlice({
  name: 'fieldSales/colleges',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentCollege: (state) => {
      state.currentCollege = null;
    },
    setPage: (state, action) => {
      state.page = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Fetch colleges
    builder.addCase(fetchColleges.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchColleges.fulfilled, (state, action) => {
      state.isLoading = false;
      state.colleges = action.payload.colleges;
      state.total = action.payload.total;
    });
    builder.addCase(fetchColleges.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Fetch college by ID
    builder.addCase(fetchCollegeById.pending, (state) => {
      state.isLoading = true;
    });
    builder.addCase(fetchCollegeById.fulfilled, (state, action) => {
      state.isLoading = false;
      state.currentCollege = action.payload;
    });
    builder.addCase(fetchCollegeById.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Create college
    builder.addCase(createCollege.fulfilled, (state, action) => {
      state.colleges.unshift(action.payload);
      state.total += 1;
    });

    // Update college
    builder.addCase(updateCollege.fulfilled, (state, action) => {
      const index = state.colleges.findIndex((c) => c.id === action.payload.id);
      if (index !== -1) {
        state.colleges[index] = action.payload;
      }
      if (state.currentCollege?.id === action.payload.id) {
        state.currentCollege = action.payload;
      }
    });

    // Delete college
    builder.addCase(deleteCollege.fulfilled, (state, action) => {
      state.colleges = state.colleges.filter((c) => c.id !== action.payload);
      state.total -= 1;
    });

    // Reassign college
    builder.addCase(reassignCollege.fulfilled, (state, action) => {
      const index = state.colleges.findIndex((c) => c.id === action.payload.id);
      if (index !== -1) {
        state.colleges[index] = action.payload;
      }
      if (state.currentCollege?.id === action.payload.id) {
        state.currentCollege = action.payload;
      }
    });

    // Fetch stats
    builder.addCase(fetchCollegeStats.fulfilled, (state, action) => {
      state.stats = action.payload;
    });

    // Fetch cities
    builder.addCase(fetchCities.fulfilled, (state, action) => {
      state.cities = action.payload;
    });

    // Fetch states
    builder.addCase(fetchStates.fulfilled, (state, action) => {
      state.states = action.payload;
    });

    // Fetch districts
    builder.addCase(fetchDistricts.fulfilled, (state, action) => {
      state.districts = action.payload;
    });

    // Fetch field officers
    builder.addCase(fetchFieldOfficers.fulfilled, (state, action) => {
      state.fieldOfficers = action.payload;
    });

    // Add contact
    builder.addCase(addContact.fulfilled, (state, action) => {
      if (state.currentCollege) {
        state.currentCollege.contacts = [...(state.currentCollege.contacts || []), action.payload];
      }
    });

    // Update contact
    builder.addCase(updateContact.fulfilled, (state, action) => {
      if (state.currentCollege?.contacts) {
        const index = state.currentCollege.contacts.findIndex((c) => c.id === action.payload.id);
        if (index !== -1) {
          state.currentCollege.contacts[index] = action.payload;
        }
      }
    });

    // Delete contact
    builder.addCase(deleteContact.fulfilled, (state, action) => {
      if (state.currentCollege?.contacts) {
        state.currentCollege.contacts = state.currentCollege.contacts.filter(
          (c) => c.id !== action.payload
        );
      }
    });
  },
});

export const { clearError, clearCurrentCollege, setPage } = collegeSlice.actions;
export default collegeSlice.reducer;
