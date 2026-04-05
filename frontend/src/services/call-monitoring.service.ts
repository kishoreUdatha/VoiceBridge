import api from './api';

export interface ActiveCall {
  id: string;
  agentName: string;
  callerNumber: string;
  callerName: string | null;
  queueName: string | null;
  startTime: string;
  duration: number;
  status: 'RINGING' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'FAILED' | 'NO_ANSWER' | 'BUSY' | 'INITIATED';
  type: 'AI' | 'HUMAN';
  isMonitored: boolean;
}

export interface AgentStatus {
  userId: string;
  name: string;
  status: 'AVAILABLE' | 'ON_CALL' | 'WRAP_UP' | 'AWAY' | 'OFFLINE';
  type: 'AI' | 'HUMAN';
  callsToday: number;
  avgHandleTime: number;
}

export interface StatusDistribution {
  name: string;
  count: number;
  color: string;
}

export interface QueueDistribution {
  name: string;
  count: number;
  color: string;
}

export interface VolumeData {
  label: string;
  count: number;
}

export interface CallAnalytics {
  totalCalls: number;
  statusDistribution: StatusDistribution[];
  queueDistribution: QueueDistribution[];
  volumeData: VolumeData[];
}

class CallMonitoringService {
  /**
   * Get call analytics with date range filtering
   */
  async getAnalytics(
    type: 'AI' | 'HUMAN',
    dateFrom: Date,
    dateTo: Date
  ): Promise<CallAnalytics> {
    const response = await api.get('/monitoring/analytics', {
      params: {
        type,
        dateFrom: dateFrom.toISOString(),
        dateTo: dateTo.toISOString(),
      },
    });
    return response.data.data;
  }

  /**
   * Get live active calls
   */
  async getLiveCalls(type: 'AI' | 'HUMAN'): Promise<ActiveCall[]> {
    const response = await api.get('/monitoring/live-calls', {
      params: { type },
    });
    return response.data.data;
  }

  /**
   * Get calls by date range (for table listing)
   */
  async getCallsByDateRange(
    type: 'AI' | 'HUMAN',
    dateFrom: Date,
    dateTo: Date,
    filters?: {
      status?: string;
      queue?: string;
      search?: string;
    }
  ): Promise<ActiveCall[]> {
    const response = await api.get('/monitoring/calls', {
      params: {
        type,
        dateFrom: dateFrom.toISOString(),
        dateTo: dateTo.toISOString(),
        ...(filters?.status && { status: filters.status }),
        ...(filters?.queue && { queue: filters.queue }),
        ...(filters?.search && { search: filters.search }),
      },
    });
    return response.data.data;
  }

  /**
   * Get agent statuses
   */
  async getAgents(type: 'AI' | 'HUMAN'): Promise<AgentStatus[]> {
    const response = await api.get('/monitoring/agents', {
      params: { type },
    });
    return response.data.data;
  }

  /**
   * Start monitoring a call
   */
  async startMonitoring(
    agentUserId: string,
    callId: string,
    callType: 'inbound' | 'outbound',
    mode: 'LISTEN' | 'WHISPER' | 'BARGE' = 'LISTEN'
  ) {
    const response = await api.post('/monitoring/start', {
      agentUserId,
      [callType === 'inbound' ? 'inboundCallId' : 'outboundCallId']: callId,
      mode,
    });
    return response.data.data;
  }

  /**
   * Change monitoring mode
   */
  async changeMode(sessionId: string, mode: 'LISTEN' | 'WHISPER' | 'BARGE') {
    const endpoint = mode.toLowerCase();
    const response = await api.post(`/monitoring/sessions/${sessionId}/${endpoint}`);
    return response.data.data;
  }

  /**
   * Stop monitoring
   */
  async stopMonitoring(sessionId: string, notes?: string) {
    const response = await api.post(`/monitoring/sessions/${sessionId}/stop`, { notes });
    return response.data.data;
  }

  /**
   * Get active monitoring sessions
   */
  async getActiveSessions() {
    const response = await api.get('/monitoring/sessions');
    return response.data.data;
  }
}

export const callMonitoringService = new CallMonitoringService();
