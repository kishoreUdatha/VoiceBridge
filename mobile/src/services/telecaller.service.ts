import api from './api';

export interface TelecallerCall {
  id: string;
  phoneNumber: string;
  contactName?: string;
  status: 'INITIATED' | 'IN_PROGRESS' | 'COMPLETED' | 'MISSED' | 'FAILED';
  outcome?: 'INTERESTED' | 'NOT_INTERESTED' | 'CALLBACK' | 'CONVERTED' | 'NO_ANSWER' | 'WRONG_NUMBER' | 'BUSY';
  duration?: number;
  notes?: string;
  sentiment?: string;
  summary?: string;
  createdAt: string;
  leadId?: string;
  lead?: {
    id: string;
    firstName: string;
    lastName?: string;
    phone: string;
  };
}

export interface CallLogData {
  phoneNumber: string;
  contactName?: string;
  leadId?: string;
  status: 'COMPLETED' | 'MISSED' | 'FAILED';
  outcome?: string;
  duration?: number;
  notes?: string;
  callDirection?: 'OUTBOUND' | 'INBOUND';
}

export interface TelecallerStats {
  totalCalls: number;
  todayCalls: number;
  interested: number;
  converted: number;
  callbacks: number;
  avgDuration: number;
}

export const telecallerService = {
  // Get my calls (for telecaller)
  getMyCalls: (params?: {
    dateFrom?: string;
    dateTo?: string;
    outcome?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) => api.get<{ data: { calls: TelecallerCall[]; total: number } }>('/telecaller/calls', { params }),

  // Log a new call
  logCall: (data: CallLogData) => api.post<{ data: TelecallerCall }>('/telecaller/calls', data),

  // Update call outcome
  updateCall: (callId: string, data: { outcome?: string; notes?: string; duration?: number }) =>
    api.patch<{ data: TelecallerCall }>(`/telecaller/calls/${callId}`, data),

  // Get my stats
  getMyStats: () => api.get<{ data: TelecallerStats }>('/telecaller/stats'),

  // Get leads to call
  getLeadsToCall: (params?: { limit?: number; offset?: number }) =>
    api.get('/telecaller/leads', { params }),

  // Start a call (creates a call record with INITIATED status)
  startCall: (data: { phoneNumber: string; contactName?: string; leadId?: string }) =>
    api.post<{ data: TelecallerCall }>('/telecaller/calls/start', data),

  // End a call (updates the call with final status and outcome)
  endCall: (callId: string, data: { status: string; outcome?: string; duration: number; notes?: string }) =>
    api.post<{ data: TelecallerCall }>(`/telecaller/calls/${callId}/end`, data),

  // Schedule a callback
  scheduleCallback: (data: { leadId?: string; phoneNumber: string; contactName?: string; scheduledAt: string; notes?: string }) =>
    api.post('/telecaller/callbacks', data),

  // Get my callbacks
  getMyCallbacks: () => api.get('/telecaller/callbacks'),
};

export default telecallerService;
