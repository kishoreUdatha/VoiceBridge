import api from './api';

export interface ProfitDashboard {
  revenue: {
    totalFees: number;
    totalDonations: number;
    totalCommission: number;
    receivedCommission: number;
    pendingCommission: number;
  };
  expenses: {
    total: number;
    byCategory: Array<{ category: string; amount: number }>;
  };
  profit: {
    gross: number;
    net: number;
    margin: number;
  };
  admissions: {
    total: number;
    donation: number;
    nonDonation: number;
    targetProgress?: number;
  };
}

export interface ProfitByUniversity {
  university: {
    id: string;
    name: string;
    shortName?: string;
  };
  admissions: number;
  revenue: number;
  commission: number;
  expenses: number;
  profit: number;
  margin: number;
}

export interface MonthlyProfitTrend {
  month: string;
  admissions: number;
  revenue: number;
  commission: number;
  expenses: number;
  profit: number;
}

export interface ProfitByUser {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    role?: { name: string };
  };
  admissions: number;
  revenue: number;
  commission: number;
}

export const profitService = {
  async getDashboard(dateRange?: { from: string; to: string }) {
    const params = new URLSearchParams();
    if (dateRange?.from) params.append('from', dateRange.from);
    if (dateRange?.to) params.append('to', dateRange.to);

    const response = await api.get(`/profit/dashboard?${params}`);
    return response.data.data as ProfitDashboard;
  },

  async getByUniversity(dateRange?: { from: string; to: string }) {
    const params = new URLSearchParams();
    if (dateRange?.from) params.append('from', dateRange.from);
    if (dateRange?.to) params.append('to', dateRange.to);

    const response = await api.get(`/profit/by-university?${params}`);
    return response.data.data as ProfitByUniversity[];
  },

  async getMonthlyTrend(months: number = 12) {
    const response = await api.get(`/profit/by-month?months=${months}`);
    return response.data.data as MonthlyProfitTrend[];
  },

  async getByUser(dateRange?: { from: string; to: string }) {
    const params = new URLSearchParams();
    if (dateRange?.from) params.append('from', dateRange.from);
    if (dateRange?.to) params.append('to', dateRange.to);

    const response = await api.get(`/profit/by-user?${params}`);
    return response.data.data as ProfitByUser[];
  },

  async getTopUniversities(limit: number = 5, dateRange?: { from: string; to: string }) {
    const params = new URLSearchParams();
    params.append('limit', String(limit));
    if (dateRange?.from) params.append('from', dateRange.from);
    if (dateRange?.to) params.append('to', dateRange.to);

    const response = await api.get(`/profit/top-universities?${params}`);
    return response.data.data as ProfitByUniversity[];
  },
};
