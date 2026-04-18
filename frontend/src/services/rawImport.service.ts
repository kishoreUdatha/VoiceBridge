import api from './api';

export interface BulkImport {
  id: string;
  organizationId: string;
  uploadedById: string;
  fileName: string;
  fileSize: number;
  mimeType?: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  convertedCount: number;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  uploadedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  _count?: {
    records: number;
  };
  statusBreakdown?: Record<string, number>;
}

export interface RawImportRecord {
  id: string;
  bulkImportId: string;
  organizationId: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone: string;
  alternatePhone?: string;
  customFields?: Record<string, unknown>;
  assignedToId?: string;
  assignedAgentId?: string;
  assignedById?: string;
  assignedAt?: string;
  status: RawImportRecordStatus;
  lastCallAt?: string;
  callAttempts: number;
  outboundCallId?: string;
  interestLevel?: string;
  notes?: string;
  callSummary?: string;
  callSentiment?: string;
  convertedLeadId?: string;
  convertedAt?: string;
  convertedById?: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  assignedAgent?: {
    id: string;
    name: string;
  };
  bulkImport?: {
    id: string;
    fileName: string;
  };
}

export type RawImportRecordStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'CALLING'
  | 'INTERESTED'
  | 'NOT_INTERESTED'
  | 'NO_ANSWER'
  | 'CALLBACK_REQUESTED'
  | 'CONVERTED'
  | 'REJECTED';

export interface RawImportStats {
  totalImports: number;
  totalRecords: number;
  pendingRecords: number;
  assignedRecords: number;
  interestedRecords: number;
  convertedRecords: number;
  notInterestedRecords: number;
  byStatus?: Record<string, number>;
  todayAssigned?: number;
}

export interface TelecallerAssignmentStat {
  telecallerId: string;
  telecallerName: string;
  email: string;
  isActive: boolean;
  role: string;
  totalAssigned: number;
  statusBreakdown: {
    assigned: number;
    calling: number;
    interested: number;
    notInterested: number;
    callbackRequested: number;
    noAnswer: number;
    converted: number;
  };
}

export interface TelecallerAssignmentStats {
  telecallers: TelecallerAssignmentStat[];
  unassignedCount: number;
  totalTelecallers: number;
}

export interface RecordFilter {
  bulkImportId?: string;
  status?: RawImportRecordStatus;
  assignedToId?: string;
  assignedAgentId?: string;
  search?: string;
  page?: number;
  limit?: number;
  assignedDateFrom?: string;
  assignedDateTo?: string;
}

export const rawImportService = {
  // Bulk Imports
  async getBulkImports(page: number = 1, limit: number = 20) {
    const response = await api.get(`/raw-imports?page=${page}&limit=${limit}`);
    return {
      imports: response.data.data as BulkImport[],
      total: response.data.meta?.total || 0,
      page: response.data.meta?.page || 1,
      limit: response.data.meta?.limit || 20,
    };
  },

  async getBulkImportById(id: string): Promise<BulkImport> {
    const response = await api.get(`/raw-imports/${id}`);
    return response.data.data;
  },

  async getStats(): Promise<RawImportStats> {
    const response = await api.get('/raw-imports/stats');
    return response.data.data;
  },

  // Telecaller Assignment Stats (for admin/manager dashboard)
  async getTelecallerAssignmentStats(filter?: { assignedDateFrom?: string; assignedDateTo?: string }): Promise<TelecallerAssignmentStats> {
    const params = new URLSearchParams();
    if (filter?.assignedDateFrom) {
      params.append('assignedDateFrom', filter.assignedDateFrom);
    }
    if (filter?.assignedDateTo) {
      params.append('assignedDateTo', filter.assignedDateTo);
    }
    const queryString = params.toString();
    const url = `/raw-imports/stats/telecaller-assignments${queryString ? `?${queryString}` : ''}`;
    const response = await api.get(url);
    return response.data.data;
  },

  // Records
  async getRecords(filter: RecordFilter = {}) {
    const params = new URLSearchParams();
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, String(value));
      }
    });

    const response = await api.get(`/raw-imports/records?${params.toString()}`);
    return {
      records: response.data.data as RawImportRecord[],
      total: response.data.meta?.total || 0,
      page: response.data.meta?.page || 1,
      limit: response.data.meta?.limit || 50,
    };
  },

  async getRecordById(id: string): Promise<RawImportRecord> {
    const response = await api.get(`/raw-imports/records/${id}`);
    return response.data.data;
  },

  // Assignment
  async assignToTelecallers(recordIds: string[], telecallerIds: string[]) {
    const response = await api.post('/raw-imports/assign/telecallers', {
      recordIds,
      telecallerIds,
    });
    return response.data.data;
  },

  async assignToAIAgent(recordIds: string[], agentId: string) {
    const response = await api.post('/raw-imports/assign/ai-agent', {
      recordIds,
      agentId,
    });
    return response.data.data;
  },

  // Status Update
  async updateRecordStatus(
    recordId: string,
    status: RawImportRecordStatus,
    data?: {
      notes?: string;
      callSummary?: string;
      callSentiment?: string;
      interestLevel?: string;
    }
  ) {
    const response = await api.put(`/raw-imports/records/${recordId}/status`, {
      status,
      ...data,
    });
    return response.data.data;
  },

  // Conversion
  async convertToLead(
    recordId: string,
    options?: {
      source?: string;
      priority?: string;
      notes?: string;
    }
  ) {
    const response = await api.post(`/raw-imports/records/${recordId}/convert`, options || {});
    return response.data.data;
  },

  async bulkConvertToLeads(recordIds: string[]) {
    const response = await api.post('/raw-imports/records/bulk-convert', {
      recordIds,
    });
    return response.data.data;
  },

  // Bulk Status Update
  async bulkUpdateStatus(recordIds: string[], status: RawImportRecordStatus) {
    const response = await api.post('/raw-imports/records/bulk-status', {
      recordIds,
      status,
    });
    return response.data.data;
  },
};
