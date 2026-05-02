/**
 * Appointment Reminder Service
 * Handles API calls for appointment reminder settings and logs
 */

import api from './api';

export interface ReminderSettings {
  enabled: boolean;
  reminder24h: boolean;
  reminder2h: boolean;
  reminder30m: boolean;
  useWhatsApp: boolean;
  useSMS: boolean;
  useEmail: boolean;
  useAICall: boolean;
  template24h: string | null;
  template2h: string | null;
  template30m: string | null;
  createTaskOnNoResponse: boolean;
  notifyManagerOnNoShow: boolean;
}

export interface ReminderLog {
  id: string;
  appointmentId: string;
  reminderType: string;
  channel: string;
  status: string;
  messageId: string | null;
  errorMessage: string | null;
  sentAt: string;
}

export interface SendReminderResult {
  appointmentId: string;
  reminderType: string;
  channels: {
    channel: string;
    success: boolean;
    messageId?: string;
    error?: string;
  }[];
  success: boolean;
}

export interface ReminderStats {
  totalAppointments: number;
  confirmedAppointments: number;
  confirmationRate: string;
  appointmentsWithReminders: number;
  remindersSent: number;
  remindersFailed: number;
  deliveryRate: string;
  channelBreakdown: Record<string, number>;
}

export interface TemplateVariable {
  name: string;
  description: string;
}

export interface DefaultTemplates {
  template24h: string;
  template2h: string;
  template30m: string;
  variables: TemplateVariable[];
}

class AppointmentReminderService {
  /**
   * Get reminder settings for the organization
   */
  async getSettings(): Promise<ReminderSettings> {
    const response = await api.get('/appointment-reminders/settings');
    return response.data.data;
  }

  /**
   * Update reminder settings
   */
  async updateSettings(settings: Partial<ReminderSettings>): Promise<ReminderSettings> {
    const response = await api.put('/appointment-reminders/settings', settings);
    return response.data.data;
  }

  /**
   * Get reminder logs for the organization
   */
  async getLogs(limit = 100): Promise<ReminderLog[]> {
    const response = await api.get('/appointment-reminders/logs', {
      params: { limit },
    });
    return response.data.data;
  }

  /**
   * Get reminder logs for a specific appointment
   */
  async getAppointmentLogs(appointmentId: string): Promise<ReminderLog[]> {
    const response = await api.get(`/appointment-reminders/logs/${appointmentId}`);
    return response.data.data;
  }

  /**
   * Send a test reminder
   */
  async sendTestReminder(
    reminderType: '24h' | '2h' | '30m',
    testPhone?: string,
    testEmail?: string
  ): Promise<SendReminderResult> {
    const response = await api.post('/appointment-reminders/test', {
      reminderType,
      testPhone,
      testEmail,
    });
    return response.data.data;
  }

  /**
   * Confirm an appointment
   */
  async confirmAppointment(appointmentId: string): Promise<void> {
    await api.post(`/appointment-reminders/${appointmentId}/confirm`);
  }

  /**
   * Get reminder statistics
   */
  async getStats(): Promise<ReminderStats> {
    const response = await api.get('/appointment-reminders/stats');
    return response.data.data;
  }

  /**
   * Get default templates with variable documentation
   */
  async getDefaultTemplates(): Promise<DefaultTemplates> {
    const response = await api.get('/appointment-reminders/default-templates');
    return response.data.data;
  }

  /**
   * Manually trigger reminder check (admin only)
   */
  async triggerReminderCheck(): Promise<SendReminderResult[]> {
    const response = await api.post('/appointment-reminders/trigger');
    return response.data.data;
  }
}

export const appointmentReminderService = new AppointmentReminderService();
