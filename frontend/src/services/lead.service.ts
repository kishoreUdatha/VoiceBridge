import api from './api';

export type AdmissionStatus =
  | 'INQUIRY'
  | 'INTERESTED'
  | 'VISIT_SCHEDULED'
  | 'VISIT_COMPLETED'
  | 'DOCUMENTS_PENDING'
  | 'ADMISSION_PROCESSING'
  | 'PAYMENT_PENDING'
  | 'ADMITTED'
  | 'ENROLLED'
  | 'DROPPED';

export type AdmissionType = 'DONATION' | 'NON_DONATION' | 'NRI' | 'SCHOLARSHIP';

export interface Lead {
  id: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone: string;
  alternatePhone?: string;
  whatsapp?: string;
  source: string;
  sourceDetails?: string;
  status: string;
  priority: string;
  notes?: string;
  customFields?: Record<string, unknown>;
  isConverted?: boolean;
  convertedAt?: string;
  createdAt: string;
  updatedAt: string;
  stageId?: string;
  stage?: {
    id: string;
    name: string;
    color?: string;
  };
  // Unified Pipeline System
  pipelineStageId?: string;
  pipelineStage?: {
    id: string;
    name: string;
    color?: string;
    stageType?: string;
    order?: number;
  };
  pipelineEnteredAt?: string;
  pipelineDaysInStage?: number;
  channel?: {
    id: string;
    name: string;
  };
  assignments?: Array<{
    id: string;
    assignedTo: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  }>;
  tagAssignments?: Array<{
    tag: {
      id: string;
      name: string;
      color: string;
      slug?: string;
    };
  }>;
  // Common fields (proper columns)
  fatherName?: string;
  fatherPhone?: string;
  motherName?: string;
  motherPhone?: string;
  occupation?: string;
  budget?: number;
  preferredContactMethod?: string;
  preferredContactTime?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  dateOfBirth?: string;
  gender?: string;
  // B2B fields
  companyName?: string;
  jobTitle?: string;
  industryType?: string;
  // Education Admission Management fields
  admissionStatus?: AdmissionStatus;
  admissionType?: AdmissionType;
  expectedFee?: number;
  actualFee?: number;
  commissionPercentage?: number;
  commissionAmount?: number;
  donationAmount?: number;
  admissionClosedAt?: string;
  admissionClosedById?: string;
  enrollmentNumber?: string;
  academicYear?: string;
  preferredUniversities?: string[];
  // Legacy aliases (for backward compatibility)
  fatherMobile?: string;
  motherMobile?: string;
}

export interface LeadFilter {
  status?: string;
  pipelineStageId?: string; // Unified Pipeline Stage filter
  source?: string;
  priority?: string;
  assignedToId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  isConverted?: string;
  tag?: string;
  customFields?: string; // JSON string of custom field filters
  page?: number;
  limit?: number;
}

export interface LeadStats {
  total: number;
  converted: number;
  conversionRate: number;
  byStatus: Record<string, number>;
  bySource: Record<string, number>;
  todayCount: number;
  thisWeekCount: number;
  thisMonthCount: number;
}

export interface BulkUploadResult {
  bulkImportId?: string;
  totalRows: number;
  validRows: number;
  duplicateRows: number;
  invalidRows: number;
  insertedLeads: number;
  insertedRecords?: number;
  duplicates: Array<{ phone: string; email?: string; reason: string }>;
  errors: Array<{ row: number; errors: string[] }>;
}

export const leadService = {
  async getAll(filter: LeadFilter = {}) {
    const params = new URLSearchParams();
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, String(value));
      }
    });

    const response = await api.get(`/leads?${params.toString()}`);
    return {
      leads: response.data.data,
      total: response.data.meta?.total || 0,
      page: response.data.meta?.page || 1,
      limit: response.data.meta?.limit || 20,
    };
  },

  async getById(id: string): Promise<Lead> {
    const response = await api.get(`/leads/${id}`);
    return response.data.data;
  },

  async create(data: Partial<Lead>): Promise<Lead> {
    const response = await api.post('/leads', data);
    return response.data.data;
  },

  async update(id: string, data: Partial<Lead>): Promise<Lead> {
    const response = await api.put(`/leads/${id}`, data);
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/leads/${id}`);
  },

  async assign(leadId: string, assignedToId: string) {
    const response = await api.put(`/leads/${leadId}/assign`, { assignedToId });
    return response.data.data;
  },

  async getStats(): Promise<LeadStats> {
    const response = await api.get('/leads/stats');
    return response.data.data;
  },

  async bulkUpload(file: File, counselorIds?: string[]): Promise<BulkUploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    if (counselorIds) {
      formData.append('counselorIds', JSON.stringify(counselorIds));
    }

    const response = await api.post('/leads/bulk-upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  async updateAdmissionStatus(id: string, admissionStatus: AdmissionStatus): Promise<Lead> {
    const response = await api.put(`/leads/${id}`, { admissionStatus });
    return response.data.data;
  },
};
