import api from '../api';

export type ExpenseCategory =
  | 'TRAVEL_FUEL'
  | 'TRAVEL_TAXI'
  | 'TRAVEL_AUTO'
  | 'TRAVEL_BUS'
  | 'TRAVEL_TRAIN'
  | 'TRAVEL_FLIGHT'
  | 'TRAVEL_PARKING'
  | 'FOOD_MEALS'
  | 'FOOD_SNACKS'
  | 'FOOD_ENTERTAINMENT'
  | 'ACCOMMODATION'
  | 'MARKETING_MATERIALS'
  | 'COMMUNICATION'
  | 'OTHER';

export type ExpenseStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PAID';

export interface Expense {
  id: string;
  organizationId: string;
  userId: string;
  collegeId?: string;
  visitId?: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  expenseDate: string;
  receiptUrl?: string;
  status: ExpenseStatus;
  approvedById?: string;
  approvedAt?: string;
  rejectionReason?: string;
  paidAt?: string;
  paymentRef?: string;
  createdAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  };
  college?: {
    id: string;
    name: string;
    city: string;
  };
  visit?: {
    id: string;
    visitDate: string;
    purpose: string;
  };
  approvedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface ExpenseFilter {
  userId?: string;
  collegeId?: string;
  status?: ExpenseStatus;
  category?: ExpenseCategory;
  startDate?: string;
  endDate?: string;
}

export interface CreateExpenseData {
  collegeId: string;
  visitId?: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  expenseDate: string;
  receiptUrl?: string;
}

export interface ApprovalData {
  status: 'APPROVED' | 'REJECTED';
  approverComments?: string;
}

export interface ExpenseStats {
  totalExpenses: number;
  statusBreakdown: Record<string, { count: number; amount: number }>;
  categoryBreakdown: Record<string, { count: number; amount: number }>;
  totalApprovedAmount: number;
  totalMileageAmount: number;
}

export interface UserExpenseSummary {
  month: string;
  draft: { count: number; amount: number };
  submitted: { count: number; amount: number };
  approved: { count: number; amount: number };
  rejected: { count: number; amount: number };
  paid: { count: number; amount: number };
  totalReimbursable: number;
}

export interface PendingApprovals {
  total: number;
  totalAmount: number;
  byUser: Array<{
    user: {
      id: string;
      firstName: string;
      lastName: string;
    };
    expenses: Expense[];
    totalAmount: number;
  }>;
}

export interface CategoryLimits {
  categoryLimits: Record<ExpenseCategory, number>;
  mileageRate: number;
}

export type ExpenseLogAction =
  | 'CREATED'
  | 'UPDATED'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'PAYMENT_PROCESSED'
  | 'RECEIPT_UPLOADED';

export interface ExpenseLog {
  id: string;
  expenseId: string;
  userId: string;
  action: ExpenseLogAction;
  fromStatus?: ExpenseStatus;
  toStatus?: ExpenseStatus;
  comments?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export const expenseService = {
  async getExpenses(
    filter: ExpenseFilter = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{ expenses: Expense[]; total: number }> {
    const response = await api.get('/field-sales/expenses', {
      params: { ...filter, page, limit },
    });
    return {
      expenses: response.data.data,
      total: response.data.pagination.total,
    };
  },

  async getExpenseById(id: string): Promise<Expense> {
    const response = await api.get(`/field-sales/expenses/${id}`);
    return response.data.data;
  },

  async createExpense(data: CreateExpenseData): Promise<{ expense: Expense; warning?: string }> {
    const response = await api.post('/field-sales/expenses', data);
    return {
      expense: response.data.data,
      warning: response.data.warning,
    };
  },

  async updateExpense(id: string, data: Partial<CreateExpenseData>): Promise<Expense> {
    const response = await api.put(`/field-sales/expenses/${id}`, data);
    return response.data.data;
  },

  async deleteExpense(id: string): Promise<void> {
    await api.delete(`/field-sales/expenses/${id}`);
  },

  async submitExpense(id: string): Promise<Expense> {
    const response = await api.post(`/field-sales/expenses/${id}/submit`);
    return response.data.data;
  },

  async submitMultipleExpenses(ids: string[]): Promise<{ submitted: number }> {
    const response = await api.post('/field-sales/expenses/submit-multiple', { ids });
    return response.data.data;
  },

  async approveOrRejectExpense(id: string, data: ApprovalData): Promise<Expense> {
    const response = await api.post(`/field-sales/expenses/${id}/approve`, data);
    return response.data.data;
  },

  async bulkApprove(ids: string[]): Promise<{ approved: number }> {
    const response = await api.post('/field-sales/expenses/bulk-approve', { ids });
    return response.data.data;
  },

  async markAsPaid(id: string, paymentReference?: string): Promise<Expense> {
    const response = await api.post(`/field-sales/expenses/${id}/paid`, { paymentReference });
    return response.data.data;
  },

  async getPendingApprovals(): Promise<PendingApprovals> {
    const response = await api.get('/field-sales/expenses/pending-approvals');
    return response.data.data;
  },

  async getExpenseStats(userId?: string, startDate?: string, endDate?: string): Promise<ExpenseStats> {
    const response = await api.get('/field-sales/expenses/stats', {
      params: { userId, startDate, endDate },
    });
    return response.data.data;
  },

  async getUserExpenseSummary(month?: string): Promise<UserExpenseSummary> {
    const response = await api.get('/field-sales/expenses/my-summary', {
      params: month ? { month } : {},
    });
    return response.data.data;
  },

  async getCategoryLimits(): Promise<CategoryLimits> {
    const response = await api.get('/field-sales/expenses/limits');
    return response.data.data;
  },

  async getExpenseLogs(expenseId: string): Promise<ExpenseLog[]> {
    const response = await api.get(`/field-sales/expenses/${expenseId}/logs`);
    return response.data.data;
  },
};
