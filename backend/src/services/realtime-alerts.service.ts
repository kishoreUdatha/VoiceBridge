/**
 * Real-time Alerts Service
 * Handles WebSocket notifications, alert rules, and user preferences
 */

import { PrismaClient, AlertTriggerEvent, AlertSeverity, RecipientType } from '@prisma/client';

const prisma = new PrismaClient();

// In-memory store for WebSocket connections (use Redis in production)
const connections: Map<string, any> = new Map();

interface AlertRuleConfig {
  name: string;
  description?: string;
  entityType: string;
  triggerEvent: AlertTriggerEvent;
  conditions: ConditionConfig[];
  severity: AlertSeverity;
  channels: ChannelConfig[];
  recipientType: RecipientType;
  recipientIds?: string[];
  recipientRoles?: string[];
  cooldownMinutes?: number;
  maxPerDay?: number;
}

interface ConditionConfig {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in';
  value: any;
}

interface ChannelConfig {
  type: 'in_app' | 'email' | 'push' | 'sms' | 'slack' | 'webhook';
  config?: Record<string, any>;
}

export const realtimeAlertsService = {
  // ==================
  // ALERT RULES
  // ==================

  // Get all alert rules
  async getAlertRules(organizationId: string) {
    return prisma.alertRule.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  },

  // Get single alert rule
  async getAlertRule(id: string) {
    return prisma.alertRule.findUnique({
      where: { id },
      include: {
        alerts: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  },

  // Create alert rule
  async createAlertRule(organizationId: string, userId: string, config: AlertRuleConfig) {
    return prisma.alertRule.create({
      data: {
        organizationId,
        name: config.name,
        description: config.description,
        entityType: config.entityType,
        triggerEvent: config.triggerEvent,
        conditions: config.conditions as any,
        severity: config.severity,
        channels: config.channels as any,
        recipientType: config.recipientType,
        recipientIds: config.recipientIds as any,
        recipientRoles: config.recipientRoles as any,
        cooldownMinutes: config.cooldownMinutes,
        maxPerDay: config.maxPerDay,
        createdById: userId,
      },
    });
  },

  // Update alert rule
  async updateAlertRule(id: string, config: Partial<AlertRuleConfig>) {
    return prisma.alertRule.update({
      where: { id },
      data: {
        name: config.name,
        description: config.description,
        entityType: config.entityType,
        triggerEvent: config.triggerEvent,
        conditions: config.conditions as any,
        severity: config.severity,
        channels: config.channels as any,
        recipientType: config.recipientType,
        recipientIds: config.recipientIds as any,
        recipientRoles: config.recipientRoles as any,
        cooldownMinutes: config.cooldownMinutes,
        maxPerDay: config.maxPerDay,
      },
    });
  },

  // Toggle alert rule active status
  async toggleAlertRule(id: string, isActive: boolean) {
    return prisma.alertRule.update({
      where: { id },
      data: { isActive },
    });
  },

  // Delete alert rule
  async deleteAlertRule(id: string) {
    return prisma.alertRule.delete({ where: { id } });
  },

  // ==================
  // ALERT TRIGGERING
  // ==================

  // Process event and check alert rules
  async processEvent(
    organizationId: string,
    event: AlertTriggerEvent,
    entityType: string,
    entityId: string,
    entityData: Record<string, any>
  ) {
    // Find matching rules
    const rules = await prisma.alertRule.findMany({
      where: {
        organizationId,
        triggerEvent: event,
        entityType,
        isActive: true,
      },
    });

    const triggeredAlerts = [];

    for (const rule of rules) {
      // Check conditions
      const conditions = rule.conditions as ConditionConfig[];
      const conditionsMet = this.evaluateConditions(conditions, entityData);

      if (!conditionsMet) continue;

      // Check cooldown
      if (rule.cooldownMinutes) {
        const cooldownTime = new Date();
        cooldownTime.setMinutes(cooldownTime.getMinutes() - rule.cooldownMinutes);

        if (rule.lastTriggeredAt && rule.lastTriggeredAt > cooldownTime) {
          continue;
        }
      }

      // Check daily limit
      if (rule.maxPerDay) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayCount = await prisma.alert.count({
          where: {
            alertRuleId: rule.id,
            createdAt: { gte: today },
          },
        });

        if (todayCount >= rule.maxPerDay) continue;
      }

      // Create alert
      const alert = await this.createAlert(rule, entityType, entityId, entityData);
      triggeredAlerts.push(alert);

      // Update rule
      await prisma.alertRule.update({
        where: { id: rule.id },
        data: {
          lastTriggeredAt: new Date(),
          triggerCount: { increment: 1 },
        },
      });
    }

    return triggeredAlerts;
  },

  // Evaluate conditions
  evaluateConditions(conditions: ConditionConfig[], data: Record<string, any>): boolean {
    for (const condition of conditions) {
      const value = this.getNestedValue(data, condition.field);

      switch (condition.operator) {
        case 'eq':
          if (value !== condition.value) return false;
          break;
        case 'neq':
          if (value === condition.value) return false;
          break;
        case 'gt':
          if (value <= condition.value) return false;
          break;
        case 'gte':
          if (value < condition.value) return false;
          break;
        case 'lt':
          if (value >= condition.value) return false;
          break;
        case 'lte':
          if (value > condition.value) return false;
          break;
        case 'contains':
          if (!String(value).includes(condition.value)) return false;
          break;
        case 'in':
          if (!condition.value.includes(value)) return false;
          break;
      }
    }
    return true;
  },

  getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((acc, part) => acc?.[part], obj);
  },

  // Create alert and send notifications
  async createAlert(
    rule: any,
    entityType: string,
    entityId: string,
    entityData: Record<string, any>
  ) {
    // Build alert message
    const title = this.buildAlertTitle(rule.triggerEvent, entityData);
    const message = this.buildAlertMessage(rule.triggerEvent, entityData);
    const entityName = entityData.firstName
      ? `${entityData.firstName} ${entityData.lastName || ''}`
      : entityData.name || entityId;

    // Get recipients
    const recipientIds = await this.getRecipients(rule);

    // Create alert
    const alert = await prisma.alert.create({
      data: {
        alertRuleId: rule.id,
        organizationId: rule.organizationId,
        title,
        message,
        severity: rule.severity,
        entityType,
        entityId,
        entityName,
        data: entityData as any,
        channels: rule.channels,
        recipients: {
          create: recipientIds.map(userId => ({ userId })),
        },
      },
      include: {
        recipients: true,
      },
    });

    // Send via channels
    const channels = rule.channels as ChannelConfig[];
    for (const channel of channels) {
      await this.sendViaChannel(channel, alert, recipientIds);
    }

    return alert;
  },

  // Build alert title
  buildAlertTitle(event: AlertTriggerEvent, data: Record<string, any>): string {
    const titles: Record<string, string> = {
      LEAD_CREATED: 'New Lead Created',
      LEAD_STAGE_CHANGED: 'Lead Stage Changed',
      LEAD_STALLED: 'Lead Stalled - Action Required',
      LEAD_AT_RISK: 'Lead At Risk',
      DEAL_WON: 'Deal Won!',
      DEAL_LOST: 'Deal Lost',
      CALL_MISSED: 'Missed Call Alert',
      CALL_FAILED: 'Call Failed',
      TARGET_ACHIEVED: 'Target Achieved!',
      TARGET_AT_RISK: 'Target At Risk',
      PAYMENT_RECEIVED: 'Payment Received',
      PAYMENT_OVERDUE: 'Payment Overdue',
      CUSTOMER_HEALTH_LOW: 'Customer Health Alert',
      SENTIMENT_NEGATIVE: 'Negative Sentiment Detected',
      SLA_BREACH: 'SLA Breach Alert',
      CUSTOM: 'Alert',
    };
    return titles[event] || 'Alert';
  },

  // Build alert message
  buildAlertMessage(event: AlertTriggerEvent, data: Record<string, any>): string {
    const name = data.firstName ? `${data.firstName} ${data.lastName || ''}` : 'A lead';

    const messages: Record<string, string> = {
      LEAD_CREATED: `${name} has been added to the system`,
      LEAD_STAGE_CHANGED: `${name} has moved to ${data.stage || 'a new stage'}`,
      LEAD_STALLED: `${name} has been inactive for too long`,
      LEAD_AT_RISK: `${name} shows signs of disengagement`,
      DEAL_WON: `Congratulations! Deal with ${name} has been closed`,
      DEAL_LOST: `Deal with ${name} was lost`,
      CALL_MISSED: `Missed call from ${data.phone || 'unknown'}`,
      CALL_FAILED: `Call to ${name} failed`,
      TARGET_ACHIEVED: `Target has been achieved!`,
      TARGET_AT_RISK: `You may not meet your target`,
      PAYMENT_RECEIVED: `Payment of ₹${data.amount || '0'} received`,
      PAYMENT_OVERDUE: `Payment from ${name} is overdue`,
      CUSTOMER_HEALTH_LOW: `${name} health score has dropped`,
      SENTIMENT_NEGATIVE: `Negative sentiment detected in conversation`,
      SLA_BREACH: `SLA has been breached for ${name}`,
      CUSTOM: data.message || 'An event has occurred',
    };
    return messages[event] || 'An event has occurred';
  },

  // Get recipients based on rule config
  async getRecipients(rule: any): Promise<string[]> {
    const recipientIds: Set<string> = new Set();

    switch (rule.recipientType) {
      case 'USER':
        if (rule.recipientIds) {
          rule.recipientIds.forEach((id: string) => recipientIds.add(id));
        }
        break;

      case 'TEAM':
        if (rule.recipientIds) {
          for (const teamLeadId of rule.recipientIds) {
            const members = await prisma.user.findMany({
              where: { managerId: teamLeadId, isActive: true },
              select: { id: true },
            });
            members.forEach(m => recipientIds.add(m.id));
            recipientIds.add(teamLeadId);
          }
        }
        break;

      case 'ROLE':
        if (rule.recipientRoles) {
          const roles = await prisma.role.findMany({
            where: {
              organizationId: rule.organizationId,
              slug: { in: rule.recipientRoles },
            },
            select: { id: true },
          });
          const users = await prisma.user.findMany({
            where: {
              organizationId: rule.organizationId,
              roleId: { in: roles.map(r => r.id) },
              isActive: true,
            },
            select: { id: true },
          });
          users.forEach(u => recipientIds.add(u.id));
        }
        break;

      case 'OWNER':
        // Get lead owner - implement based on your assignment logic
        break;

      case 'MANAGER':
        // Get user's manager
        break;
    }

    return Array.from(recipientIds);
  },

  // Send alert via specific channel
  async sendViaChannel(channel: ChannelConfig, alert: any, recipientIds: string[]) {
    switch (channel.type) {
      case 'in_app':
        // Send via WebSocket
        for (const userId of recipientIds) {
          this.sendToUser(userId, {
            type: 'alert',
            data: alert,
          });
        }
        break;

      case 'push':
        // Send push notification
        // Integrate with push notification service
        break;

      case 'email':
        // Send email
        // Integrate with email service
        break;

      case 'sms':
        // Send SMS
        // Integrate with SMS service
        break;

      case 'slack':
        // Send to Slack
        if (channel.config?.webhookUrl) {
          // Call Slack webhook
        }
        break;

      case 'webhook':
        // Call custom webhook
        if (channel.config?.url) {
          // Make HTTP request
        }
        break;
    }
  },

  // ==================
  // ALERTS MANAGEMENT
  // ==================

  // Get alerts for user
  async getUserAlerts(userId: string, params?: {
    isRead?: boolean;
    severity?: AlertSeverity;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {
      recipients: {
        some: { userId },
      },
    };

    if (params?.isRead !== undefined) {
      where.recipients = {
        some: { userId, isRead: params.isRead },
      };
    }

    if (params?.severity) {
      where.severity = params.severity;
    }

    const alerts = await prisma.alert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: params?.limit || 50,
      skip: params?.offset || 0,
      include: {
        recipients: {
          where: { userId },
        },
      },
    });

    const total = await prisma.alert.count({ where });
    const unreadCount = await prisma.alertRecipient.count({
      where: { userId, isRead: false },
    });

    return { alerts, total, unreadCount };
  },

  // Mark alert as read
  async markAlertRead(alertId: string, userId: string) {
    return prisma.alertRecipient.update({
      where: {
        alertId_userId: { alertId, userId },
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  },

  // Mark all alerts as read
  async markAllAlertsRead(userId: string) {
    return prisma.alertRecipient.updateMany({
      where: { userId, isRead: false },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  },

  // Dismiss alert
  async dismissAlert(alertId: string, userId: string) {
    return prisma.alert.update({
      where: { id: alertId },
      data: {
        isDismissed: true,
        dismissedAt: new Date(),
        dismissedBy: userId,
      },
    });
  },

  // Record action taken
  async recordAction(alertId: string, userId: string, action: string) {
    return prisma.alert.update({
      where: { id: alertId },
      data: {
        actionTaken: action,
        actionTakenAt: new Date(),
        actionTakenBy: userId,
      },
    });
  },

  // ==================
  // USER PREFERENCES
  // ==================

  // Get notification preferences
  async getNotificationPreferences(userId: string) {
    return prisma.notificationPreference.findUnique({
      where: { userId },
    });
  },

  // Update notification preferences
  async updateNotificationPreferences(userId: string, organizationId: string, preferences: {
    emailEnabled?: boolean;
    pushEnabled?: boolean;
    smsEnabled?: boolean;
    inAppEnabled?: boolean;
    preferences?: Record<string, any>;
    quietHoursEnabled?: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
    digestEnabled?: boolean;
    digestFrequency?: string;
    digestTime?: string;
  }) {
    return prisma.notificationPreference.upsert({
      where: { userId },
      create: {
        userId,
        organizationId,
        ...preferences,
        preferences: preferences.preferences as any,
      },
      update: {
        ...preferences,
        preferences: preferences.preferences as any,
      },
    });
  },

  // ==================
  // WEBSOCKET MANAGEMENT
  // ==================

  // Register WebSocket connection
  registerConnection(userId: string, socket: any) {
    connections.set(userId, socket);
  },

  // Remove WebSocket connection
  removeConnection(userId: string) {
    connections.delete(userId);
  },

  // Send message to user
  sendToUser(userId: string, message: any) {
    const socket = connections.get(userId);
    if (socket && socket.readyState === 1) {
      socket.send(JSON.stringify(message));
    }
  },

  // Broadcast to organization
  broadcastToOrganization(organizationId: string, message: any) {
    // In production, use Redis pub/sub for multi-server
    connections.forEach((socket, userId) => {
      // Check if user belongs to organization
      this.sendToUser(userId, message);
    });
  },

  // Get available trigger events
  getTriggerEvents() {
    return [
      { event: 'LEAD_CREATED', name: 'Lead Created', description: 'When a new lead is added' },
      { event: 'LEAD_STAGE_CHANGED', name: 'Lead Stage Changed', description: 'When lead moves to a different stage' },
      { event: 'LEAD_STALLED', name: 'Lead Stalled', description: 'When lead has no activity for X days' },
      { event: 'LEAD_AT_RISK', name: 'Lead At Risk', description: 'When lead shows disengagement signals' },
      { event: 'DEAL_WON', name: 'Deal Won', description: 'When a deal is marked as won' },
      { event: 'DEAL_LOST', name: 'Deal Lost', description: 'When a deal is marked as lost' },
      { event: 'CALL_MISSED', name: 'Call Missed', description: 'When an incoming call is missed' },
      { event: 'CALL_FAILED', name: 'Call Failed', description: 'When an outbound call fails' },
      { event: 'TARGET_ACHIEVED', name: 'Target Achieved', description: 'When a performance target is met' },
      { event: 'TARGET_AT_RISK', name: 'Target At Risk', description: 'When target achievement is unlikely' },
      { event: 'PAYMENT_RECEIVED', name: 'Payment Received', description: 'When a payment is received' },
      { event: 'PAYMENT_OVERDUE', name: 'Payment Overdue', description: 'When a payment is past due' },
      { event: 'CUSTOMER_HEALTH_LOW', name: 'Customer Health Low', description: 'When customer health score drops' },
      { event: 'SENTIMENT_NEGATIVE', name: 'Negative Sentiment', description: 'When negative sentiment is detected' },
      { event: 'SLA_BREACH', name: 'SLA Breach', description: 'When SLA is about to be or has been breached' },
      { event: 'CUSTOM', name: 'Custom Event', description: 'Custom trigger via API' },
    ];
  },
};
