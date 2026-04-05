import api from './api';

export interface University {
  id: string;
  name: string;
  shortName?: string;
  type?: string;
  city?: string;
  state?: string;
  website?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  defaultCommissionPercent?: number;
  donationCommissionPercent?: number;
  totalAdmissions: number;
  totalRevenue: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    studentVisits: number;
    admissions: number;
  };
}

export interface UniversityStats {
  totalAdmissions: number;
  totalVisits: number;
  totalRevenue: number;
  totalCommission: number;
  conversionRate: number;
  admissionsByType: Array<{
    admissionType: string;
    _count: number;
    _sum: { totalFee: number; commissionAmount: number };
  }>;
  recentAdmissions: Array<{
    id: string;
    admissionNumber: string;
    totalFee: number;
    lead: { firstName: string; lastName: string };
  }>;
}

export interface CreateUniversityInput {
  name: string;
  shortName?: string;
  type?: string;
  city?: string;
  state?: string;
  website?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  defaultCommissionPercent?: number;
  donationCommissionPercent?: number;
}

export interface UniversityFilters {
  search?: string;
  type?: string;
  state?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export const universityService = {
  async getAll(filters: UniversityFilters = {}) {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.type) params.append('type', filters.type);
    if (filters.state) params.append('state', filters.state);
    if (filters.isActive !== undefined) params.append('isActive', String(filters.isActive));
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));

    const response = await api.get(`/universities?${params}`);
    return response.data.data;
  },

  async getById(id: string) {
    const response = await api.get(`/universities/${id}`);
    return response.data.data as University;
  },

  async create(data: CreateUniversityInput) {
    const response = await api.post('/universities', data);
    return response.data.data as University;
  },

  async update(id: string, data: Partial<CreateUniversityInput>) {
    const response = await api.patch(`/universities/${id}`, data);
    return response.data.data as University;
  },

  async delete(id: string) {
    const response = await api.delete(`/universities/${id}`);
    return response.data;
  },

  async getStats(id: string, dateRange?: { from: string; to: string }) {
    const params = new URLSearchParams();
    if (dateRange?.from) params.append('from', dateRange.from);
    if (dateRange?.to) params.append('to', dateRange.to);

    const response = await api.get(`/universities/${id}/stats?${params}`);
    return response.data.data as UniversityStats;
  },

  async getTypes() {
    const response = await api.get('/universities/types');
    return response.data.data as string[];
  },

  async getStates() {
    const response = await api.get('/universities/states');
    return response.data.data as string[];
  },
};
