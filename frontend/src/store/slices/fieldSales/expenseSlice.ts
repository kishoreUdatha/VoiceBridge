import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  expenseService,
  Expense,
  ExpenseStats,
  ExpenseFilter,
  CreateExpenseData,
  ApprovalData,
  UserExpenseSummary,
  PendingApprovals,
  CategoryLimits,
} from '../../../services/fieldSales/expense.service';

interface ExpenseState {
  expenses: Expense[];
  currentExpense: Expense | null;
  stats: ExpenseStats | null;
  mySummary: UserExpenseSummary | null;
  pendingApprovals: PendingApprovals | null;
  categoryLimits: CategoryLimits | null;
  total: number;
  page: number;
  limit: number;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
}

const initialState: ExpenseState = {
  expenses: [],
  currentExpense: null,
  stats: null,
  mySummary: null,
  pendingApprovals: null,
  categoryLimits: null,
  total: 0,
  page: 1,
  limit: 20,
  isLoading: false,
  isSubmitting: false,
  error: null,
};

export const fetchExpenses = createAsyncThunk(
  'fieldSales/expenses/fetchExpenses',
  async (
    { filter, page, limit }: { filter?: ExpenseFilter; page?: number; limit?: number },
    { rejectWithValue }
  ) => {
    try {
      return await expenseService.getExpenses(filter, page, limit);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch expenses');
    }
  }
);

export const fetchExpenseById = createAsyncThunk(
  'fieldSales/expenses/fetchExpenseById',
  async (id: string, { rejectWithValue }) => {
    try {
      return await expenseService.getExpenseById(id);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch expense');
    }
  }
);

export const createExpense = createAsyncThunk(
  'fieldSales/expenses/createExpense',
  async (data: CreateExpenseData, { rejectWithValue }) => {
    try {
      return await expenseService.createExpense(data);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to create expense');
    }
  }
);

export const updateExpense = createAsyncThunk(
  'fieldSales/expenses/updateExpense',
  async ({ id, data }: { id: string; data: Partial<CreateExpenseData> }, { rejectWithValue }) => {
    try {
      return await expenseService.updateExpense(id, data);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to update expense');
    }
  }
);

export const deleteExpense = createAsyncThunk(
  'fieldSales/expenses/deleteExpense',
  async (id: string, { rejectWithValue }) => {
    try {
      await expenseService.deleteExpense(id);
      return id;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to delete expense');
    }
  }
);

export const submitExpense = createAsyncThunk(
  'fieldSales/expenses/submitExpense',
  async (id: string, { rejectWithValue }) => {
    try {
      return await expenseService.submitExpense(id);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to submit expense');
    }
  }
);

export const submitMultipleExpenses = createAsyncThunk(
  'fieldSales/expenses/submitMultiple',
  async (ids: string[], { rejectWithValue }) => {
    try {
      return await expenseService.submitMultipleExpenses(ids);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to submit expenses');
    }
  }
);

export const approveOrRejectExpense = createAsyncThunk(
  'fieldSales/expenses/approveOrReject',
  async ({ id, data }: { id: string; data: ApprovalData }, { rejectWithValue }) => {
    try {
      return await expenseService.approveOrRejectExpense(id, data);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to process expense');
    }
  }
);

export const bulkApprove = createAsyncThunk(
  'fieldSales/expenses/bulkApprove',
  async (ids: string[], { rejectWithValue }) => {
    try {
      return await expenseService.bulkApprove(ids);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to approve expenses');
    }
  }
);

export const markAsPaid = createAsyncThunk(
  'fieldSales/expenses/markAsPaid',
  async ({ id, paymentReference }: { id: string; paymentReference?: string }, { rejectWithValue }) => {
    try {
      return await expenseService.markAsPaid(id, paymentReference);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to mark as paid');
    }
  }
);

export const fetchPendingApprovals = createAsyncThunk(
  'fieldSales/expenses/fetchPendingApprovals',
  async (_, { rejectWithValue }) => {
    try {
      return await expenseService.getPendingApprovals();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch pending approvals');
    }
  }
);

export const fetchExpenseStats = createAsyncThunk(
  'fieldSales/expenses/fetchStats',
  async (
    { userId, startDate, endDate }: { userId?: string; startDate?: string; endDate?: string },
    { rejectWithValue }
  ) => {
    try {
      return await expenseService.getExpenseStats(userId, startDate, endDate);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch expense stats');
    }
  }
);

export const fetchMySummary = createAsyncThunk(
  'fieldSales/expenses/fetchMySummary',
  async (month: string | undefined, { rejectWithValue }) => {
    try {
      return await expenseService.getUserExpenseSummary(month);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch summary');
    }
  }
);

export const fetchCategoryLimits = createAsyncThunk(
  'fieldSales/expenses/fetchLimits',
  async (_, { rejectWithValue }) => {
    try {
      return await expenseService.getCategoryLimits();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch category limits');
    }
  }
);

const expenseSlice = createSlice({
  name: 'fieldSales/expenses',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentExpense: (state) => {
      state.currentExpense = null;
    },
    setPage: (state, action) => {
      state.page = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Fetch expenses
    builder.addCase(fetchExpenses.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchExpenses.fulfilled, (state, action) => {
      state.isLoading = false;
      state.expenses = action.payload.expenses;
      state.total = action.payload.total;
    });
    builder.addCase(fetchExpenses.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Fetch expense by ID
    builder.addCase(fetchExpenseById.pending, (state) => {
      state.isLoading = true;
    });
    builder.addCase(fetchExpenseById.fulfilled, (state, action) => {
      state.isLoading = false;
      state.currentExpense = action.payload;
    });
    builder.addCase(fetchExpenseById.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Create expense
    builder.addCase(createExpense.fulfilled, (state, action) => {
      state.expenses.unshift(action.payload.expense);
      state.total += 1;
    });

    // Update expense
    builder.addCase(updateExpense.fulfilled, (state, action) => {
      const index = state.expenses.findIndex((e) => e.id === action.payload.id);
      if (index !== -1) {
        state.expenses[index] = action.payload;
      }
      if (state.currentExpense?.id === action.payload.id) {
        state.currentExpense = action.payload;
      }
    });

    // Delete expense
    builder.addCase(deleteExpense.fulfilled, (state, action) => {
      state.expenses = state.expenses.filter((e) => e.id !== action.payload);
      state.total -= 1;
    });

    // Submit expense
    builder.addCase(submitExpense.pending, (state) => {
      state.isSubmitting = true;
    });
    builder.addCase(submitExpense.fulfilled, (state, action) => {
      state.isSubmitting = false;
      const index = state.expenses.findIndex((e) => e.id === action.payload.id);
      if (index !== -1) {
        state.expenses[index] = action.payload;
      }
    });
    builder.addCase(submitExpense.rejected, (state, action) => {
      state.isSubmitting = false;
      state.error = action.payload as string;
    });

    // Approve or reject
    builder.addCase(approveOrRejectExpense.fulfilled, (state, action) => {
      const index = state.expenses.findIndex((e) => e.id === action.payload.id);
      if (index !== -1) {
        state.expenses[index] = action.payload;
      }
      if (state.currentExpense?.id === action.payload.id) {
        state.currentExpense = action.payload;
      }
    });

    // Mark as paid
    builder.addCase(markAsPaid.fulfilled, (state, action) => {
      const index = state.expenses.findIndex((e) => e.id === action.payload.id);
      if (index !== -1) {
        state.expenses[index] = action.payload;
      }
      if (state.currentExpense?.id === action.payload.id) {
        state.currentExpense = action.payload;
      }
    });

    // Fetch pending approvals
    builder.addCase(fetchPendingApprovals.fulfilled, (state, action) => {
      state.pendingApprovals = action.payload;
    });

    // Fetch stats
    builder.addCase(fetchExpenseStats.fulfilled, (state, action) => {
      state.stats = action.payload;
    });

    // Fetch my summary
    builder.addCase(fetchMySummary.fulfilled, (state, action) => {
      state.mySummary = action.payload;
    });

    // Fetch category limits
    builder.addCase(fetchCategoryLimits.fulfilled, (state, action) => {
      state.categoryLimits = action.payload;
    });
  },
});

export const { clearError, clearCurrentExpense, setPage } = expenseSlice.actions;
export default expenseSlice.reducer;
