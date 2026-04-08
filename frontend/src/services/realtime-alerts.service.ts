/**
 * Real-time Alerts Service
 * Handles alert rules, notifications, and user preferences
 */

import api from './api';

export type AlertTriggerEvent =
  | 'LEAD_CREATED'
  | 'LEAD_UPDATED'
  | 'STAGE_CHANGED'
  | 'DEAL_WON'
  | 'DEAL_LOST'
  | 'CALL_MISSED'
  | 'CALL_COMPLETED'
  | 'SLA_BREACH'
  | 'SCORE_THRESHOLD'
  | 'INACTIVITY'
  | 'HIGH_VALUE_LEAD'
  | 'ASSIGNMENT_CHANGE';

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL' | 'URGENT';

export type AlertChannel = 'IN_APP' | 'EMAIL' | 'SMS' | 'PUSH' | 'WEBHOOK' | 'SLACK';

export interface AlertCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in';
  value: any;
}

export interface AlertRule {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  triggerEvent: AlertTriggerEvent;
  conditions: AlertCondition[];
  severity: AlertSeverity;
  channels: AlertChannel[];
  recipients?: string[];
  webhookUrl?: string;
  slackChannel?: string;
  messageTemplate?: string;
  isActive: boolean;
  triggeredCount: number;
  lastTriggeredAt?: string;
  createdAt: string;
}

export interface Alert {
  id: string;
  alertRuleId: string;
  organizationId: string;
  entityType?: string;
  entityId?: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  data?: Record<string, any>;
  createdAt: string;
  recipients?: AlertRecipient[];
}

export interface AlertRecipient {
  id: string;
  alertId: string;
  userId: string;
  channel: AlertChannel;
  sentAt?: string;
  readAt?: string;
  deliveryStatus: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED';
}

export interface NotificationPreference {
  id: string;
  userId: string;
  channel: AlertChannel;
  isEnabled: boolean;
  settings?: Record<string, any>;
}

export interface TriggerEventInfo {
  event: AlertTriggerEvent;
  name: string;
  description: string;
  availableConditions: { field: string; label: string; type: string }[];
}

export interface AlertRuleConfig {
  name: string;
  description?: string;
  triggerEvent: AlertTriggerEvent;
  conditions: AlertCondition[];
  severity: AlertSeverity;
  channels: AlertChannel[];
  recipients?: string[];
  webhookUrl?: string;
  slackChannel?: string;
  messageTemplate?: string;
}

export interface UserAlert {
  id: string;
  alert: Alert;
  channel: AlertChannel;
  sentAt?: string;
  readAt?: string;
  isRead: boolean;
}

const realtimeAlertsService = {
  // Get all alert rules
  async getAlertRules(): Promise<AlertRule[]> {
    const response = await api.get('/alerts/rules');
    return response.data;
  },

  // Get single alert rule
  async getAlertRule(id: string): Promise<AlertRule> {
    const response = await api.get(`/alerts/rules/${id}`);
    return response.data;
  },

  // Create alert rule
  async createAlertRule(config: AlertRuleConfig): Promise<AlertRule> {
    const response = await api.post('/alerts/rules', config);
    return response.data;
  },

  // Update alert rule
  async updateAlertRule(id: string, config: Partial<AlertRuleConfig & { isActive?: boolean }>): Promise<AlertRule> {
    const response = await api.put(`/alerts/rules/${id}`, config);
    return response.data;
  },

  // Delete alert rule
  async deleteAlertRule(id: string): Promise<void> {
    await api.delete(`/alerts/rules/${id}`);
  },

  // Get user alerts
  async getUserAlerts(unreadOnly = false, limit = 50): Promise<UserAlert[]> {
    const response = await api.get('/alerts/user', {
      params: { unreadOnly, limit },
    });
    return response.data;
  },

  // Get unread alert count
  async getUnreadCount(): Promise<number> {
    const response = await api.get('/alerts/user/unread-count');
    return response.data.count;
  },

  // Mark alert as read
  async markAlertRead(alertId: string): Promise<void> {
    await api.post(`/alerts/alerts/${alertId}/read`);
  },

  // Mark all alerts as read
  async markAllAlertsRead(): Promise<void> {
    await api.post('/alerts/user/mark-all-read');
  },

  // Get notification preferences
  async getNotificationPreferences(): Promise<NotificationPreference[]> {
    const response = await api.get('/alerts/preferences');
    return response.data;
  },

  // Update notification preferences
  async updateNotificationPreferences(
    preferences: { channel: AlertChannel; isEnabled: boolean; settings?: Record<string, any> }[]
  ): Promise<NotificationPreference[]> {
    const response = await api.put('/alerts/preferences', preferences);
    return response.data;
  },

  // Get trigger event options
  async getTriggerEvents(): Promise<TriggerEventInfo[]> {
    const response = await api.get('/alerts/meta/trigger-events');
    return response.data;
  },

  // Subscribe to real-time alerts via SSE
  subscribeToAlerts(onAlert: (alert: Alert) => void): EventSource {
    const eventSource = new EventSource('/api/alerts/stream', {
      withCredentials: true,
    });

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'alert') {
          onAlert(data.alert);
        }
      } catch (error) {
        console.error('Failed to parse alert event:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
    };

    return eventSource;
  },
};

export default realtimeAlertsService;
