/**
 * CRM Automation Service
 * Handles API calls for CRM automation settings and logs
 */

import api from './api';

export interface CrmAutomationSettings {
  // ===== Birthday/Anniversary Greetings =====
  birthdayEnabled: boolean;
  birthdayChannels: string[];
  birthdayTemplate: string | null;
  birthdayDaysBefore: number;
  birthdayTime: string;
  anniversaryEnabled: boolean;
  anniversaryTemplate: string | null;

  // ===== Lead Re-engagement Campaign =====
  reengagementEnabled: boolean;
  reengagementDaysInactive: number;
  reengagementChannels: string[];
  reengagementTemplate: string | null;
  reengagementMaxAttempts: number;
  reengagementInterval: number;
  reengagementExcludeConverted: boolean;

  // ===== SLA Breach Alerts =====
  slaEnabled: boolean;
  slaFirstResponseMins: number;
  slaFollowUpHours: number;
  slaAlertChannels: string[];
  slaAlertToManager: boolean;
  slaAlertToAssignee: boolean;
  slaEscalateAfterBreaches: number;

  // ===== Payment/Invoice Reminders =====
  paymentReminderEnabled: boolean;
  paymentReminder1DaysBefore: number;
  paymentReminder2DaysBefore: number;
  paymentReminder3DaysAfter: number;
  paymentReminderChannels: string[];
  paymentReminderTemplate: string | null;
  paymentOverdueTemplate: string | null;

  // ===== Quote/Proposal Follow-up =====
  quoteFollowupEnabled: boolean;
  quoteFollowupDays: number[];
  quoteFollowupChannels: string[];
  quoteFollowupTemplate: string | null;
  quoteExpiryReminderDays: number;

  // ===== Lead Aging Alerts =====
  leadAgingEnabled: boolean;
  leadAgingDays: number;
  leadAgingAlertTo: string[];
  leadAgingChannels: string[];
  leadAgingAutoReassign: boolean;
  leadAgingReassignDays: number;

  // ===== Welcome Series =====
  welcomeEnabled: boolean;
  welcomeChannels: string[];
  welcomeDelayMinutes: number;
  welcomeTemplate: string | null;
  welcomeIncludeIntro: boolean;
  welcomeIncludeCatalog: boolean;

  // ===== Review/Feedback Request =====
  reviewRequestEnabled: boolean;
  reviewRequestDelay: number;
  reviewRequestChannels: string[];
  reviewRequestTemplate: string | null;
  reviewPlatforms: string[];
  reviewMinDealValue: number | null;
}

export interface CrmAutomationLog {
  id: string;
  organizationId: string;
  automationType: string;
  targetType: string;
  targetId: string;
  channel: string;
  status: string;
  messageId: string | null;
  errorMessage: string | null;
  metadata: Record<string, any> | null;
  executedAt: string;
}

export interface CrmAutomationStats {
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  byChannel: Record<string, number>;
  today: any[];
  dailyTrend: any[];
  totalLogs: number;
  successRate: string | number;
}

export interface CrmAutomationTemplates {
  birthday: {
    whatsapp: string;
    email: { subject: string; body: string };
  };
  reengagement: {
    whatsapp: string;
    email: { subject: string; body: string };
  };
  paymentReminder: {
    whatsapp: string;
    email: { subject: string; body: string };
  };
  quoteFollowup: {
    whatsapp: string;
    email: { subject: string; body: string };
  };
  welcome: {
    step1: string;
    step2: string;
    step3: string;
  };
  reviewRequest: {
    whatsapp: string;
    email: { subject: string; body: string };
  };
  variables: { name: string; description: string }[];
}

class CrmAutomationService {
  /**
   * Get automation settings for the organization
   */
  async getSettings(): Promise<CrmAutomationSettings> {
    const response = await api.get('/crm-automations/settings');
    return response.data.data;
  }

  /**
   * Update automation settings
   */
  async updateSettings(settings: Partial<CrmAutomationSettings>): Promise<CrmAutomationSettings> {
    const response = await api.put('/crm-automations/settings', settings);
    return response.data.data;
  }

  /**
   * Get automation logs
   */
  async getLogs(params?: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
    targetId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    logs: CrmAutomationLog[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const response = await api.get('/crm-automations/logs', { params });
    return response.data.data;
  }

  /**
   * Get automation statistics
   */
  async getStats(): Promise<CrmAutomationStats> {
    const response = await api.get('/crm-automations/stats');
    return response.data.data;
  }

  /**
   * Manually trigger all automations (admin only)
   */
  async triggerAutomations(): Promise<any> {
    const response = await api.post('/crm-automations/trigger');
    return response.data.data;
  }

  /**
   * Trigger a specific automation type (admin only)
   */
  async triggerAutomationType(
    type: 'birthday' | 'reengagement' | 'sla' | 'payment' | 'quote' | 'aging' | 'review'
  ): Promise<any> {
    const response = await api.post(`/crm-automations/trigger/${type}`);
    return response.data.data;
  }

  /**
   * Trigger welcome series for a specific lead
   */
  async triggerWelcomeSeries(leadId: string): Promise<void> {
    await api.post(`/crm-automations/welcome/${leadId}`);
  }

  /**
   * Get default templates
   */
  async getTemplates(): Promise<CrmAutomationTemplates> {
    const response = await api.get('/crm-automations/templates');
    return response.data.data;
  }

  /**
   * Get automation logs for a specific lead
   */
  async getLeadLogs(leadId: string): Promise<CrmAutomationLog[]> {
    const response = await api.get(`/crm-automations/lead/${leadId}/logs`);
    return response.data.data;
  }
}

export const crmAutomationService = new CrmAutomationService();
