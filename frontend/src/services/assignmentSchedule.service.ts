import api from './api';

export type ScheduleType = 'DAILY' | 'HOURLY' | 'CUSTOM_CRON';
export type DistributionStrategy = 'ROUND_ROBIN' | 'CAPACITY_BASED' | 'PRIORITY_BASED';

export interface AssignmentSchedule {
  id: string;
  organizationId: string;
  name: string;
  isActive: boolean;
  scheduleType: ScheduleType;
  scheduleTimes: string[];
  timezone: string;
  cronExpression?: string | null;
  assignToTelecallers: boolean;
  assignToVoiceAgents: boolean;
  voiceAgentId?: string | null;
  telecallerDailyLimit: number;
  voiceAgentDailyLimit: number;
  distributionStrategy: DistributionStrategy;
  bulkImportIds?: string[];
  lastRunAt?: string | null;
  nextRunAt?: string | null;
  createdAt: string;
  updatedAt: string;
  voiceAgent?: {
    id: string;
    name: string;
  } | null;
  _count?: {
    runLogs: number;
  };
}

export interface AssignmentRunLog {
  id: string;
  scheduleId: string;
  organizationId: string;
  runAt: string;
  totalRecordsAssigned: number;
  telecallerAssignments: Array<{
    userId: string;
    userName: string;
    count: number;
  }>;
  voiceAgentAssignments: Array<{
    agentId: string;
    agentName: string;
    count: number;
  }>;
  recordsSkipped: number;
  pendingBefore: number;
  pendingAfter: number;
  errors?: string | null;
  runDurationMs?: number | null;
  triggeredBy?: string | null;
}

export interface TelecallerCapacity {
  userId: string;
  userName: string;
  pending: number;
  limit: number;
  available: number;
}

export interface VoiceAgentCapacity {
  agentId: string;
  agentName: string;
  pending: number;
  limit: number;
  available: number;
}

export interface CapacityStats {
  telecallers: TelecallerCapacity[];
  voiceAgents: VoiceAgentCapacity[];
  totalTelecallerCapacity: number;
  totalVoiceAgentCapacity: number;
  pendingRecords: number;
}

export interface CreateScheduleData {
  name: string;
  scheduleType?: ScheduleType;
  scheduleTimes?: string[];
  timezone?: string;
  cronExpression?: string;
  assignToTelecallers?: boolean;
  assignToVoiceAgents?: boolean;
  voiceAgentId?: string;
  telecallerDailyLimit?: number;
  voiceAgentDailyLimit?: number;
  distributionStrategy?: DistributionStrategy;
  bulkImportIds?: string[];
  isActive?: boolean;
}

export interface UpdateScheduleData extends Partial<CreateScheduleData> {
  isActive?: boolean;
}

export const assignmentScheduleService = {
  async getSchedules(): Promise<AssignmentSchedule[]> {
    const response = await api.get('/assignment-schedules');
    return response.data.data;
  },

  async getScheduleById(id: string): Promise<AssignmentSchedule> {
    const response = await api.get(`/assignment-schedules/${id}`);
    return response.data.data;
  },

  async createSchedule(data: CreateScheduleData): Promise<AssignmentSchedule> {
    const response = await api.post('/assignment-schedules', data);
    return response.data.data;
  },

  async updateSchedule(id: string, data: UpdateScheduleData): Promise<AssignmentSchedule> {
    const response = await api.put(`/assignment-schedules/${id}`, data);
    return response.data.data;
  },

  async deleteSchedule(id: string): Promise<void> {
    await api.delete(`/assignment-schedules/${id}`);
  },

  async runSchedule(id: string): Promise<AssignmentRunLog> {
    const response = await api.post(`/assignment-schedules/${id}/run`);
    return response.data.data;
  },

  async getRunLogs(
    id: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ logs: AssignmentRunLog[]; total: number }> {
    const response = await api.get(`/assignment-schedules/${id}/logs`, {
      params: { page, limit },
    });
    return {
      logs: response.data.data,
      total: response.data.pagination.total,
    };
  },

  async getCapacityStats(): Promise<CapacityStats> {
    const response = await api.get('/assignment-schedules/capacity');
    return response.data.data;
  },
};
