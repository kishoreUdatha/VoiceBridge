import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import leadReducer from './slices/leadSlice';
import userReducer from './slices/userSlice';
import rawImportReducer from './slices/rawImportSlice';
import assignmentScheduleReducer from './slices/assignmentScheduleSlice';
import branchReducer from './slices/branchSlice';
import {
  collegeReducer,
  visitReducer,
  dealReducer,
  expenseReducer,
} from './slices/fieldSales';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    leads: leadReducer,
    users: userReducer,
    rawImports: rawImportReducer,
    assignmentSchedules: assignmentScheduleReducer,
    branches: branchReducer,
    // Field Sales
    fieldSalesColleges: collegeReducer,
    fieldSalesVisits: visitReducer,
    fieldSalesDeals: dealReducer,
    fieldSalesExpenses: expenseReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
