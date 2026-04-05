import api from './api';

export type ExpenseCategory =
  | 'MARKETING'
  | 'SALARY'
  | 'RENT'
  | 'TRAVEL'
  | 'UTILITIES'
  | 'OFFICE_SUPPLIES'
  | 'COMMISSION_PAYOUT'
  | 'OTHER';

export type ExpenseStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export interface BusinessExpense {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  expenseDate: string;
  universityId?: string;
  leadId?: string;
  receiptUrl?: string;
  vendorName?: string;
  status: ExpenseStatus;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id?: string;
    firstName: string;
    lastName: string;
    email?: string;
  };
}

export interface CreateExpenseInput {
  category: ExpenseCategory;
  description: string;
  amount: number;
  expenseDate: string;
  universityId?: string;
  leadId?: string;
  receiptUrl?: string;
  vendorName?: string;
}

export interface ExpenseFilters {
  category?: ExpenseCategory;
  status?: ExpenseStatus;
  universityId?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ExpenseSummary {
  byCategory: Array<{
    category: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
  total: number;
}

export interface MonthlyExpenseTrend {
  month: string;
  total: number;
  byCategory: Record<string, number>;
}

export const businessExpenseService = {
  async getAll(filters: ExpenseFilters = {}) {
    const params = new URLSearchParams();
    if (filters.category) params.append('category', filters.category);
    if (filters.status) params.append('status', filters.status);
    if (filters.universityId) params.append('universityId', filters.universityId);
    if (filters.fromDate) params.append('fromDate', filters.fromDate);
    if (filters.toDate) params.append('toDate', filters.toDate);
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));

    const response = await api.get(`/expenses?${params}`);
    return response.data.data;
  },

  async getById(id: string) {
    const response = await api.get(`/expenses/${id}`);
    return response.data.data as BusinessExpense;
  },

  async create(data: CreateExpenseInput) {
    const response = await api.post('/expenses', data);
    return response.data.data as BusinessExpense;
  },

  async update(id: string, data: Partial<CreateExpenseInput & { status: ExpenseStatus }>) {
    const response = await api.patch(`/expenses/${id}`, data);
    return response.data.data as BusinessExpense;
  },

  async delete(id: string) {
    const response = await api.delete(`/expenses/${id}`);
    return response.data;
  },

  async getSummary(dateRange?: { from: string; to: string }) {
    const params = new URLSearchParams();
    if (dateRange?.from) params.append('from', dateRange.from);
    if (dateRange?.to) params.append('to', dateRange.to);

    const response = await api.get(`/expenses/summary?${params}`);
    return response.data.data as ExpenseSummary;
  },

  async getMonthlyTrend(months: number = 12) {
    const response = await api.get(`/expenses/monthly-trend?months=${months}`);
    return response.data.data as MonthlyExpenseTrend[];
  },

  async getCategories() {
    const response = await api.get('/expenses/categories');
    return response.data.data as ExpenseCategory[];
  },
};

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  MARKETING: 'Marketing',
  SALARY: 'Salary',
  RENT: 'Rent',
  TRAVEL: 'Travel',
  UTILITIES: 'Utilities',
  OFFICE_SUPPLIES: 'Office Supplies',
  COMMISSION_PAYOUT: 'Commission Payout',
  OTHER: 'Other',
};

export const EXPENSE_STATUS_LABELS: Record<ExpenseStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};
