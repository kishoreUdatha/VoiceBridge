import api from './api';

export type StudentVisitStatus = 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export interface StudentVisit {
  id: string;
  leadId: string;
  universityId: string;
  visitDate: string;
  visitTime?: string;
  status: StudentVisitStatus;
  arrangedById: string;
  accompaniedById?: string;
  travelArranged: boolean;
  travelExpense?: number;
  feedback?: string;
  studentRating?: number;
  interestedInAdmission?: boolean;
  completedAt?: string;
  notes?: string;
  createdAt: string;
  lead: {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
  };
  university: {
    id?: string;
    name: string;
    shortName?: string;
    city?: string;
  };
  arrangedBy: {
    firstName: string;
    lastName: string;
  };
  accompaniedBy?: {
    firstName: string;
    lastName: string;
  };
}

export interface ScheduleVisitInput {
  leadId: string;
  universityId: string;
  visitDate: string;
  visitTime?: string;
  accompaniedById?: string;
  travelArranged?: boolean;
  travelExpense?: number;
  notes?: string;
}

export interface CompleteVisitInput {
  feedback?: string;
  studentRating?: number;
  interestedInAdmission?: boolean;
  notes?: string;
}

export interface VisitFilters {
  status?: StudentVisitStatus;
  universityId?: string;
  leadId?: string;
  arrangedById?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface VisitStats {
  total: number;
  byStatus: Array<{ status: string; count: number }>;
  byUniversity: Array<{
    university: { id: string; name: string; shortName?: string };
    count: number;
  }>;
}

export const studentVisitService = {
  async getAll(filters: VisitFilters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.universityId) params.append('universityId', filters.universityId);
    if (filters.leadId) params.append('leadId', filters.leadId);
    if (filters.arrangedById) params.append('arrangedById', filters.arrangedById);
    if (filters.fromDate) params.append('fromDate', filters.fromDate);
    if (filters.toDate) params.append('toDate', filters.toDate);
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));

    const response = await api.get(`/student-visits?${params}`);
    return response.data.data;
  },

  async getById(id: string) {
    const response = await api.get(`/student-visits/${id}`);
    return response.data.data as StudentVisit;
  },

  async schedule(data: ScheduleVisitInput) {
    const response = await api.post('/student-visits', data);
    return response.data.data as StudentVisit;
  },

  async update(id: string, data: Partial<ScheduleVisitInput>) {
    const response = await api.patch(`/student-visits/${id}`, data);
    return response.data.data as StudentVisit;
  },

  async confirm(id: string) {
    const response = await api.post(`/student-visits/${id}/confirm`);
    return response.data.data as StudentVisit;
  },

  async complete(id: string, data: CompleteVisitInput) {
    const response = await api.post(`/student-visits/${id}/complete`, data);
    return response.data.data as StudentVisit;
  },

  async cancel(id: string, reason?: string) {
    const response = await api.post(`/student-visits/${id}/cancel`, { reason });
    return response.data.data as StudentVisit;
  },

  async markNoShow(id: string, notes?: string) {
    const response = await api.post(`/student-visits/${id}/no-show`, { notes });
    return response.data.data as StudentVisit;
  },

  async getUpcomingToday(userId?: string) {
    const params = userId ? `?userId=${userId}` : '';
    const response = await api.get(`/student-visits/upcoming-today${params}`);
    return response.data.data as StudentVisit[];
  },

  async getStats(dateRange?: { from: string; to: string }) {
    const params = new URLSearchParams();
    if (dateRange?.from) params.append('from', dateRange.from);
    if (dateRange?.to) params.append('to', dateRange.to);

    const response = await api.get(`/student-visits/stats?${params}`);
    return response.data.data as VisitStats;
  },
};
