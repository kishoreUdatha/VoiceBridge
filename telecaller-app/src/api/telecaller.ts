import api, { getErrorMessage } from './index';
import {
  TelecallerStats,
  Call,
  StartCallPayload,
  UpdateCallPayload,
  ApiResponse,
  PaginatedResponse,
  AssignedData,
  AssignedDataStats,
  AssignedDataStatus,
} from '../types';

export const telecallerApi = {
  /**
   * Get telecaller dashboard stats
   */
  getStats: async (): Promise<TelecallerStats> => {
    try {
      const response = await api.get<ApiResponse<TelecallerStats>>('/telecaller/stats');
      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Get call history with pagination
   */
  getCalls: async (
    page: number = 1,
    limit: number = 20,
    filters?: {
      startDate?: string;
      endDate?: string;
      outcome?: string;
    }
  ): Promise<PaginatedResponse<Call> & { outcomeCounts?: Record<string, number> }> => {
    try {
      const offset = (page - 1) * limit;
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (filters?.startDate) params.append('dateFrom', filters.startDate);
      if (filters?.endDate) params.append('dateTo', filters.endDate);
      if (filters?.outcome) params.append('outcome', filters.outcome);

      console.log('[TelecallerAPI] Fetching calls with params:', params.toString());
      const response = await api.get(`/telecaller/calls?${params.toString()}`);
      console.log('[TelecallerAPI] Calls response:', JSON.stringify(response.data));

      // Backend returns { success, message, data: { calls, total, outcomeCounts } }
      const responseData = response.data.data || response.data;
      const calls = responseData.calls || [];
      const total = responseData.total || 0;
      const outcomeCounts = responseData.outcomeCounts || {};

      // Transform calls to match app's Call type
      const transformedCalls: Call[] = calls.map((call: any) => ({
        id: call.id,
        leadId: call.leadId || '',
        leadName: call.lead ? `${call.lead.firstName || ''} ${call.lead.lastName || ''}`.trim() : call.contactName || 'Unknown',
        leadPhone: call.lead?.phone || call.phoneNumber || '',
        userId: call.telecallerId || '',
        status: call.status || 'COMPLETED',
        outcome: call.outcome || undefined,
        duration: call.duration || undefined,
        notes: call.notes || undefined,
        recordingUrl: call.recordingUrl || undefined,
        transcript: call.transcript || undefined,
        sentimentScore: call.sentiment ? (call.sentiment === 'positive' ? 80 : call.sentiment === 'negative' ? 30 : 50) : undefined,
        createdAt: call.createdAt || new Date().toISOString(),
        updatedAt: call.updatedAt || call.createdAt || new Date().toISOString(),
      }));

      console.log('[TelecallerAPI] Transformed calls count:', transformedCalls.length);

      return {
        success: true,
        data: transformedCalls,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        outcomeCounts,
      };
    } catch (error) {
      console.error('[TelecallerAPI] Error fetching calls:', error);
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Get single call details
   */
  getCall: async (callId: string): Promise<Call> => {
    try {
      const response = await api.get<ApiResponse<Call>>(`/telecaller/calls/${callId}`);
      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Start a new call - creates call record with INITIATED status
   */
  startCall: async (payload: StartCallPayload): Promise<Call> => {
    try {
      const response = await api.post<ApiResponse<Call>>('/telecaller/calls', payload);
      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Update call with outcome and notes
   */
  updateCall: async (callId: string, payload: UpdateCallPayload): Promise<Call> => {
    try {
      const response = await api.put<ApiResponse<Call>>(`/telecaller/calls/${callId}`, payload);
      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Upload call recording
   */
  uploadRecording: async (
    callId: string,
    recordingPath: string,
    duration?: number,
    onProgress?: (progress: number) => void
  ): Promise<{ recordingUrl: string }> => {
    try {
      const formData = new FormData();

      // Ensure path has file:// prefix for Android
      const fileUri = recordingPath.startsWith('file://')
        ? recordingPath
        : `file://${recordingPath}`;

      console.log('[TelecallerAPI] Uploading recording:', fileUri, 'Duration:', duration);

      // Add recording file to form data
      formData.append('recording', {
        uri: fileUri,
        type: 'audio/m4a',
        name: `call_${callId}_recording.m4a`,
      } as any);

      // Add duration to form data if provided
      if (duration !== undefined && duration > 0) {
        formData.append('duration', duration.toString());
      }

      const response = await api.post<ApiResponse<{ recordingUrl: string }>>(
        `/telecaller/calls/${callId}/recording`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total && onProgress) {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              onProgress(progress);
            }
          },
        }
      );

      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Get today's assigned leads for quick calling
   */
  getTodaysLeads: async (): Promise<number> => {
    try {
      const response = await api.get<ApiResponse<{ count: number }>>('/telecaller/today-leads');
      return response.data.data.count;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Mark callback reminder as completed
   */
  completeCallback: async (callId: string): Promise<void> => {
    try {
      await api.post(`/telecaller/calls/${callId}/callback-complete`);
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Get pending callbacks
   */
  getPendingCallbacks: async (): Promise<Call[]> => {
    try {
      const response = await api.get<ApiResponse<Call[]>>('/telecaller/callbacks');
      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Get calls for a specific lead
   */
  getCallsByLead: async (leadId: string): Promise<Call[]> => {
    try {
      const response = await api.get<ApiResponse<Call[]>>(`/leads/${leadId}/calls`);
      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Get AI analysis status and results for a call
   */
  getCallAnalysis: async (callId: string): Promise<CallAnalysis> => {
    try {
      const response = await api.get<ApiResponse<CallAnalysis>>(`/telecaller/calls/${callId}/analysis`);
      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Trigger re-analysis for a call
   */
  reanalyzeCall: async (callId: string): Promise<void> => {
    try {
      await api.post(`/telecaller/calls/${callId}/reanalyze`);
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Get calls with AI analysis
   */
  getAnalyzedCalls: async (
    page: number = 1,
    limit: number = 20,
    analyzed?: boolean
  ): Promise<PaginatedResponse<Call>> => {
    try {
      const params = new URLSearchParams({
        offset: ((page - 1) * limit).toString(),
        limit: limit.toString(),
      });

      if (analyzed !== undefined) {
        params.append('analyzed', analyzed.toString());
      }

      const response = await api.get<PaginatedResponse<Call>>(
        `/telecaller/calls-analyzed?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  // ==================== QUALIFIED LEADS TRACKING ====================

  /**
   * Get leads that this telecaller qualified (to track conversions)
   */
  getMyQualifiedLeads: async (
    status?: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ leads: QualifiedLead[]; total: number }> => {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });
      if (status) params.append('status', status);

      const response = await api.get<ApiResponse<{ leads: QualifiedLead[]; total: number }>>(
        `/telecaller/my-qualified-leads?${params.toString()}`
      );
      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Get stats for leads qualified by this telecaller
   */
  getMyQualifiedLeadsStats: async (): Promise<QualifiedLeadsStats> => {
    try {
      const response = await api.get<ApiResponse<QualifiedLeadsStats>>(
        '/telecaller/my-qualified-leads/stats'
      );
      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  // ==================== ASSIGNED DATA (Raw Import Records) ====================

  /**
   * Get telecaller's assigned raw data (not yet leads)
   */
  getAssignedData: async (
    status?: string,
    search?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ records: AssignedData[]; total: number }> => {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });
      if (status && status !== 'ALL') params.append('status', status);
      if (search) params.append('search', search);

      const response = await api.get<ApiResponse<{ records: AssignedData[]; total: number }>>(
        `/telecaller/assigned-data?${params.toString()}`
      );
      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Get assigned data stats
   */
  getAssignedDataStats: async (): Promise<AssignedDataStats> => {
    try {
      const response = await api.get<ApiResponse<AssignedDataStats>>('/telecaller/assigned-data/stats');
      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Get single assigned data record
   */
  getAssignedDataRecord: async (id: string): Promise<AssignedData> => {
    try {
      const response = await api.get<ApiResponse<AssignedData>>(`/telecaller/assigned-data/${id}`);
      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Start a call to assigned data contact - creates call record for AI analysis
   */
  startAssignedDataCall: async (dataId: string): Promise<{ call: Call; rawRecordId: string }> => {
    try {
      const response = await api.post<ApiResponse<{ call: Call; rawRecordId: string }>>(
        `/telecaller/assigned-data/${dataId}/call`
      );
      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Update assigned data status (manual update without AI)
   */
  updateAssignedDataStatus: async (
    id: string,
    status: AssignedDataStatus,
    notes?: string
  ): Promise<AssignedData> => {
    try {
      const response = await api.put<ApiResponse<AssignedData>>(
        `/telecaller/assigned-data/${id}/status`,
        { status, notes }
      );
      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Upload recording for assigned data call - triggers AI analysis
   * AI will automatically detect outcome and update status
   */
  uploadAssignedDataRecording: async (
    dataId: string,
    callId: string,
    recordingPath: string,
    duration: number,
    onProgress?: (progress: number) => void
  ): Promise<{ callId: string; rawRecordId: string }> => {
    try {
      // Ensure path has file:// prefix for Android
      const fileUri = recordingPath.startsWith('file://')
        ? recordingPath
        : `file://${recordingPath}`;

      console.log('[TelecallerAPI] Uploading recording:', fileUri, 'duration:', duration);

      const formData = new FormData();
      formData.append('recording', {
        uri: fileUri,
        type: 'audio/m4a',
        name: `assigned_data_${dataId}_recording.m4a`,
      } as any);
      formData.append('callId', callId);
      formData.append('duration', String(duration));

      const response = await api.post<ApiResponse<{ callId: string; rawRecordId: string }>>(
        `/telecaller/assigned-data/${dataId}/recording`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 60000, // 60 seconds for upload
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total && onProgress) {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              onProgress(progress);
            }
          },
        }
      );
      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Convert assigned data to lead (manual conversion)
   */
  convertToLead: async (id: string, notes?: string): Promise<{ lead: any }> => {
    try {
      const response = await api.post<ApiResponse<{ lead: any }>>(
        `/telecaller/assigned-data/${id}/convert`,
        { notes }
      );
      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  // ==================== PERFORMANCE ANALYTICS ====================

  /**
   * Get performance stats with date range
   * @param period - 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisMonth' | 'lastMonth' | 'custom'
   * @param startDate - Required if period is 'custom'
   * @param endDate - Required if period is 'custom'
   */
  getPerformance: async (
    period: PerformancePeriod = 'today',
    startDate?: string,
    endDate?: string
  ): Promise<PerformanceStats> => {
    try {
      const params = new URLSearchParams({ period });
      if (period === 'custom' && startDate && endDate) {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      }

      const response = await api.get<ApiResponse<PerformanceStats>>(
        `/telecaller/performance?${params.toString()}`
      );
      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
};

// Type for qualified leads tracking
export interface QualifiedLead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  status: string;
  priority: string;
  assignedTo: string | null;
  createdAt: string;
  convertedAt: string | null;
}

export interface QualifiedLeadsStats {
  total: number;
  converted: number;
  lost: number;
  pending: number;
  conversionRate: number;
}

// Type for AI analysis response
export interface CallAnalysis {
  id: string;
  aiAnalyzed: boolean;
  analysisStatus: 'completed' | 'pending';
  transcript: string | null;
  sentiment: 'positive' | 'neutral' | 'negative' | null;
  outcome: string | null;
  summary: string | null;
  qualification: {
    name?: string;
    email?: string;
    company?: string;
    budget?: string;
    timeline?: string;
    requirements?: string;
    buyingSignals?: string[];
    objections?: string[];
    aiAnalyzedAt?: string;
    noConversation?: boolean;
    reason?: string;
  } | null;
  recordingUrl: string | null;
  duration: number | null;
  lead: {
    id: string;
    firstName: string;
    lastName: string;
    leadScore?: {
      overallScore: number;
      grade: string;
      aiClassification: string;
    };
  } | null;
}

// Performance Analytics Types
export type PerformancePeriod = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisMonth' | 'lastMonth' | 'custom';

export interface PerformanceStats {
  period: {
    from: string;
    to: string;
    label: string;
  };
  calls: {
    total: number;
    answered: number;
    noAnswer: number;
    answerRate: number;
    avgDuration: number;
    totalDuration: number;
    outcomes: Record<string, number>;
  };
  contacts: {
    contacted: number;
    interested: number;
    notInterested: number;
    callback: number;
    converted: number;
    interestRate: number;
    conversionRate: number;
  };
  leads: {
    created: number;
    won: number;
    lost: number;
    followUpsCompleted: number;
  };
  dailyBreakdown: Array<{
    date: string;
    dayName: string;
    calls: number;
    converted: number;
    interested: number;
  }>;
}

// Follow-up Types
export type FollowUpType = 'AI_CALL' | 'HUMAN_CALL' | 'MANUAL';
export type FollowUpStatus = 'UPCOMING' | 'COMPLETED' | 'MISSED' | 'CANCELLED';

export interface FollowUp {
  id: string;
  leadId: string;
  lead?: {
    id: string;
    firstName: string;
    lastName?: string;
    phone: string;
    email?: string;
    status?: string;
    company?: string;
  };
  scheduledAt: string;
  completedAt?: string;
  status: FollowUpStatus;
  followUpType: FollowUpType;
  message?: string;
  notes?: string;
  assigneeId?: string;
  assignee?: {
    firstName: string;
    lastName?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface FollowUpStats {
  total: number;
  overdue: number;
  today: number;
  upcoming: number;
  completed: number;
}

// Follow-up API Methods
export const followUpApi = {
  /**
   * Get all follow-ups for the current telecaller
   */
  getFollowUps: async (
    status?: FollowUpStatus,
    type?: FollowUpType,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ followUps: FollowUp[]; total: number }> => {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });
      if (status) params.append('status', status);
      if (type) params.append('type', type);

      const response = await api.get<ApiResponse<{ followUps: FollowUp[]; total: number }>>(
        `/telecaller/follow-ups?${params.toString()}`
      );
      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Get follow-up stats
   */
  getFollowUpStats: async (): Promise<FollowUpStats> => {
    try {
      const response = await api.get<ApiResponse<FollowUpStats>>('/telecaller/follow-ups/stats');
      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Get overdue follow-ups
   */
  getOverdueFollowUps: async (): Promise<FollowUp[]> => {
    try {
      const response = await api.get<ApiResponse<FollowUp[]>>('/telecaller/follow-ups/overdue');
      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Get today's follow-ups
   */
  getTodayFollowUps: async (): Promise<FollowUp[]> => {
    try {
      const response = await api.get<ApiResponse<FollowUp[]>>('/telecaller/follow-ups/today');
      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Mark follow-up as completed
   */
  completeFollowUp: async (
    followUpId: string,
    notes?: string
  ): Promise<FollowUp> => {
    try {
      const response = await api.put<ApiResponse<FollowUp>>(
        `/telecaller/follow-ups/${followUpId}/complete`,
        { notes }
      );
      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Reschedule a follow-up
   */
  rescheduleFollowUp: async (
    followUpId: string,
    scheduledAt: string,
    notes?: string
  ): Promise<FollowUp> => {
    try {
      const response = await api.put<ApiResponse<FollowUp>>(
        `/telecaller/follow-ups/${followUpId}/reschedule`,
        { scheduledAt, notes }
      );
      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Create a follow-up for a lead
   */
  createFollowUp: async (
    leadId: string,
    scheduledAt: string,
    followUpType: FollowUpType = 'HUMAN_CALL',
    message?: string
  ): Promise<FollowUp> => {
    try {
      const response = await api.post<ApiResponse<FollowUp>>(
        `/telecaller/leads/${leadId}/follow-ups`,
        { scheduledAt, followUpType, message }
      );
      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Cancel a follow-up
   */
  cancelFollowUp: async (followUpId: string): Promise<void> => {
    try {
      await api.delete(`/telecaller/follow-ups/${followUpId}`);
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
};

export default telecallerApi;
