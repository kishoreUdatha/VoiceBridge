import api from './api';

export type AdmissionType = 'DONATION' | 'NON_DONATION' | 'NRI' | 'SCHOLARSHIP';

export interface Admission {
  id: string;
  admissionNumber: string;
  leadId: string;
  universityId: string;
  courseName?: string;
  branch?: string;
  academicYear: string;
  admissionType: AdmissionType;
  totalFee: number;
  donationAmount: number;
  paidAmount: number;
  pendingAmount: number;
  paymentStatus: 'PENDING' | 'PARTIAL' | 'PAID';
  commissionPercent: number;
  commissionAmount: number;
  commissionStatus: 'PENDING' | 'RECEIVED';
  commissionReceivedAt?: string;
  closedById: string;
  closedAt: string;
  status: 'ACTIVE' | 'CANCELLED' | 'REFUNDED';
  createdAt: string;
  lead: {
    id?: string;
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    fatherName?: string;
    fatherMobile?: string;
    address?: string;
    city?: string;
    state?: string;
  };
  university: {
    id?: string;
    name: string;
    shortName?: string;
    city?: string;
    contactPerson?: string;
    contactPhone?: string;
  };
  closedBy: {
    id?: string;
    firstName: string;
    lastName: string;
    email?: string;
  };
  payments?: AdmissionPayment[];
  _count?: {
    payments: number;
  };
}

export interface AdmissionPayment {
  id: string;
  paymentNumber: number;
  amount: number;
  paymentType: 'FEE' | 'DONATION' | 'MISCELLANEOUS';
  paymentMode?: 'CASH' | 'CHEQUE' | 'ONLINE' | 'UPI';
  referenceNumber?: string;
  paidAt?: string;
  notes?: string;
  receiptUrl?: string;
  receivedBy?: {
    firstName: string;
    lastName: string;
  };
}

export interface CreateAdmissionInput {
  leadId: string;
  universityId: string;
  academicYear: string;
  admissionType: AdmissionType;
  totalFee: number;
  commissionPercent: number;
  courseName?: string;
  branch?: string;
  donationAmount?: number;
}

export interface RecordPaymentInput {
  amount: number;
  paymentType: 'FEE' | 'DONATION' | 'MISCELLANEOUS';
  paymentMode?: 'CASH' | 'CHEQUE' | 'ONLINE' | 'UPI';
  referenceNumber?: string;
  notes?: string;
  receiptUrl?: string;
}

export interface AdmissionFilters {
  universityId?: string;
  admissionType?: AdmissionType;
  paymentStatus?: string;
  commissionStatus?: string;
  academicYear?: string;
  closedById?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AdmissionStats {
  totalAdmissions: number;
  byType: Array<{
    type: AdmissionType;
    count: number;
    totalFee: number;
    totalCommission: number;
  }>;
  byPaymentStatus: Array<{ status: string; count: number }>;
  byCommissionStatus: Array<{ status: string; count: number; amount: number }>;
  financials: {
    totalFee: number;
    totalDonation: number;
    totalPaid: number;
    totalPending: number;
    totalCommission: number;
  };
}

export const admissionService = {
  async getAll(filters: AdmissionFilters = {}) {
    const params = new URLSearchParams();
    if (filters.universityId) params.append('universityId', filters.universityId);
    if (filters.admissionType) params.append('admissionType', filters.admissionType);
    if (filters.paymentStatus) params.append('paymentStatus', filters.paymentStatus);
    if (filters.commissionStatus) params.append('commissionStatus', filters.commissionStatus);
    if (filters.academicYear) params.append('academicYear', filters.academicYear);
    if (filters.closedById) params.append('closedById', filters.closedById);
    if (filters.fromDate) params.append('fromDate', filters.fromDate);
    if (filters.toDate) params.append('toDate', filters.toDate);
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));

    const response = await api.get(`/admissions?${params}`);
    return response.data.data;
  },

  async getById(id: string) {
    const response = await api.get(`/admissions/${id}`);
    return response.data.data as Admission;
  },

  async create(data: CreateAdmissionInput) {
    const response = await api.post('/admissions', data);
    return response.data.data as Admission;
  },

  async update(id: string, data: Partial<CreateAdmissionInput>) {
    const response = await api.patch(`/admissions/${id}`, data);
    return response.data.data as Admission;
  },

  async recordPayment(id: string, data: RecordPaymentInput) {
    const response = await api.post(`/admissions/${id}/payment`, data);
    return response.data.data as AdmissionPayment;
  },

  async markCommissionReceived(id: string) {
    const response = await api.post(`/admissions/${id}/commission-received`);
    return response.data.data as Admission;
  },

  async cancel(id: string, reason?: string) {
    const response = await api.post(`/admissions/${id}/cancel`, { reason });
    return response.data.data as Admission;
  },

  async getStats(dateRange?: { from: string; to: string }) {
    const params = new URLSearchParams();
    if (dateRange?.from) params.append('from', dateRange.from);
    if (dateRange?.to) params.append('to', dateRange.to);

    const response = await api.get(`/admissions/stats?${params}`);
    return response.data.data as AdmissionStats;
  },

  async getAcademicYears() {
    const response = await api.get('/admissions/academic-years');
    return response.data.data as string[];
  },
};
