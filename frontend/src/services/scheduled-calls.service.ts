/**
 * Scheduled Calls Service
 * API client for scheduled calls and quick reminders
 */

import api from './api';

export type QuickReminderMinutes = 15 | 30 | 60 | 120 | 1440;

export const REMINDER_OPTIONS: { value: QuickReminderMinutes; label: string }[] = [
  { value: 15, label: 'In 15 minutes' },
  { value: 30, label: 'In 30 minutes' },
  { value: 60, label: 'In 1 hour' },
  { value: 120, label: 'In 2 hours' },
  { value: 1440, label: 'Tomorrow' },
];

export interface ScheduledCall {
  id: string;
  organizationId: string;
  agentId?: string;
  phoneNumber: string;
  leadId?: string;
  contactName?: string;
  scheduledAt: string;
  callType: 'SCHEDULED' | 'CALLBACK' | 'FOLLOWUP' | 'REMINDER';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  priority: number;
  notes?: string;
  result?: string;
  createdAt: string;
  updatedAt: string;
  lead?: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
}

export const scheduledCallsService = {
  /**
   * Create a quick reminder (1-click)
   */
  async createQuickReminder(leadId: string, reminderMinutes: QuickReminderMinutes): Promise<ScheduledCall> {
    const response = await api.post('/scheduled-calls/quick-reminder', {
      leadId,
      reminderMinutes,
    });
    return response.data.data;
  },

  /**
   * Get user's reminders
   */
  async getReminders(options?: {
    status?: string;
    includeExpired?: boolean;
  }): Promise<ScheduledCall[]> {
    const params = new URLSearchParams();
    if (options?.status) params.append('status', options.status);
    if (options?.includeExpired) params.append('includeExpired', 'true');

    const response = await api.get(`/scheduled-calls/reminders?${params.toString()}`);
    return response.data.data;
  },

  /**
   * Create a scheduled call
   */
  async createScheduledCall(data: {
    agentId: string;
    phoneNumber: string;
    scheduledAt: string;
    leadId?: string;
    contactName?: string;
    callType?: string;
    priority?: number;
    notes?: string;
  }): Promise<ScheduledCall> {
    const response = await api.post('/scheduled-calls', data);
    return response.data.data;
  },

  /**
   * Get scheduled calls
   */
  async getScheduledCalls(filters?: {
    status?: string;
    fromDate?: string;
    toDate?: string;
    agentId?: string;
  }): Promise<ScheduledCall[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.fromDate) params.append('fromDate', filters.fromDate);
    if (filters?.toDate) params.append('toDate', filters.toDate);
    if (filters?.agentId) params.append('agentId', filters.agentId);

    const response = await api.get(`/scheduled-calls?${params.toString()}`);
    return response.data.data;
  },

  /**
   * Reschedule a call
   */
  async rescheduleCall(id: string, scheduledAt: string): Promise<ScheduledCall> {
    const response = await api.put(`/scheduled-calls/${id}/reschedule`, { scheduledAt });
    return response.data.data;
  },

  /**
   * Cancel a scheduled call
   */
  async cancelCall(id: string, reason?: string): Promise<ScheduledCall> {
    const response = await api.delete(`/scheduled-calls/${id}`, { data: { reason } });
    return response.data.data;
  },

  /**
   * Schedule a callback from an existing call
   */
  async scheduleCallback(callId: string, callbackTime: string): Promise<ScheduledCall> {
    const response = await api.post('/scheduled-calls/callback', {
      callId,
      callbackTime,
    });
    return response.data.data;
  },
};

export default scheduledCallsService;
