import { NotificationChannelType } from '@prisma/client';
import { prisma } from '../config/database';


// Notification Events
export const NOTIFICATION_EVENTS = {
  LEAD_CREATED: 'lead.created',
  LEAD_UPDATED: 'lead.updated',
  LEAD_CONVERTED: 'lead.converted',
  CALL_COMPLETED: 'call.completed',
  CALL_MISSED: 'call.missed',
  APPOINTMENT_BOOKED: 'appointment.booked',
  APPOINTMENT_REMINDER: 'appointment.reminder',
  VOICE_SESSION_ENDED: 'voice.session.ended',
  HIGH_VALUE_LEAD: 'lead.high_value',
  NEGATIVE_SENTIMENT: 'call.negative_sentiment',
} as const;

export type NotificationEvent = typeof NOTIFICATION_EVENTS[keyof typeof NOTIFICATION_EVENTS];

interface NotificationPayload {
  event: NotificationEvent;
  organizationId: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  mentionUsers?: string[];
}

interface SlackBlock {
  type: string;
  text?: { type: string; text: string; emoji?: boolean };
  elements?: any[];
  fields?: any[];
  accessory?: any;
}

class NotificationChannelService {
  /**
   * Create a new notification channel
   */
  async createChannel(data: {
    organizationId: string;
    name: string;
    type: NotificationChannelType;
    webhookUrl: string;
    webhookSecret?: string;
    events: NotificationEvent[];
    includeDetails?: boolean;
    mentionUsers?: string[];
  }) {
    // Validate webhook URL
    try {
      new URL(data.webhookUrl);
    } catch {
      throw new Error('Invalid webhook URL');
    }

    return prisma.notificationChannel.create({
      data: {
        organizationId: data.organizationId,
        name: data.name,
        type: data.type,
        webhookUrl: data.webhookUrl,
        webhookSecret: data.webhookSecret,
        events: data.events,
        includeDetails: data.includeDetails ?? true,
        mentionUsers: data.mentionUsers || [],
      },
    });
  }

  /**
   * Get all channels for organization
   */
  async getChannels(organizationId: string) {
    return prisma.notificationChannel.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update channel
   */
  async updateChannel(id: string, organizationId: string, data: {
    name?: string;
    webhookUrl?: string;
    events?: NotificationEvent[];
    isActive?: boolean;
    includeDetails?: boolean;
    mentionUsers?: string[];
  }) {
    return prisma.notificationChannel.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete channel
   */
  async deleteChannel(id: string, organizationId: string) {
    return prisma.notificationChannel.delete({
      where: { id },
    });
  }

  /**
   * Send notification to all subscribed channels
   */
  async notify(payload: NotificationPayload) {
    const channels = await prisma.notificationChannel.findMany({
      where: {
        organizationId: payload.organizationId,
        isActive: true,
      },
    });

    // Filter channels subscribed to this event
    const subscribedChannels = channels.filter(channel => {
      const events = channel.events as string[];
      return events.includes(payload.event) || events.includes('*');
    });

    if (subscribedChannels.length === 0) {
      return { sent: 0 };
    }

    const results = await Promise.allSettled(
      subscribedChannels.map(channel => this.sendToChannel(channel, payload))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return { sent: successful, failed };
  }

  /**
   * Send notification to a specific channel
   */
  private async sendToChannel(channel: any, payload: NotificationPayload) {
    try {
      let body: any;
      let headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      switch (channel.type) {
        case 'SLACK':
          body = this.buildSlackPayload(channel, payload);
          break;
        case 'TEAMS':
          body = this.buildTeamsPayload(channel, payload);
          break;
        case 'DISCORD':
          body = this.buildDiscordPayload(channel, payload);
          break;
        default:
          body = this.buildCustomPayload(channel, payload);
          if (channel.webhookSecret) {
            headers['Authorization'] = `Bearer ${channel.webhookSecret}`;
          }
      }

      const response = await fetch(channel.webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      // Update success stats
      await prisma.notificationChannel.update({
        where: { id: channel.id },
        data: {
          successCount: { increment: 1 },
          lastTriggeredAt: new Date(),
          lastError: null,
        },
      });

      return { success: true, channelId: channel.id };
    } catch (error: any) {
      console.error(`[Notification] Failed to send to ${channel.name}:`, error.message);

      // Update failure stats
      await prisma.notificationChannel.update({
        where: { id: channel.id },
        data: {
          failureCount: { increment: 1 },
          lastTriggeredAt: new Date(),
          lastError: error.message,
        },
      });

      throw error;
    }
  }

  /**
   * Build Slack message payload
   */
  private buildSlackPayload(channel: any, payload: NotificationPayload): any {
    const blocks: SlackBlock[] = [];
    const mentionUsers = [...(channel.mentionUsers as string[] || []), ...(payload.mentionUsers || [])];

    // Header with emoji based on event type
    const emoji = this.getEventEmoji(payload.event);
    blocks.push({
      type: 'header',
      text: { type: 'plain_text', text: `${emoji} ${payload.title}`, emoji: true },
    });

    // Main message
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: payload.message },
    });

    // Add details if enabled
    if (channel.includeDetails && payload.data) {
      const fields = this.buildSlackFields(payload.data);
      if (fields.length > 0) {
        blocks.push({
          type: 'section',
          fields,
        });
      }
    }

    // Add mentions
    if (mentionUsers.length > 0) {
      const mentions = mentionUsers.map(u => u.startsWith('@') ? u : `<@${u}>`).join(' ');
      blocks.push({
        type: 'context',
        elements: [{ type: 'mrkdwn', text: `cc: ${mentions}` }],
      });
    }

    // Timestamp
    blocks.push({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: `_${new Date().toLocaleString()}_` }],
    });

    return { blocks };
  }

  /**
   * Build Microsoft Teams message payload
   */
  private buildTeamsPayload(channel: any, payload: NotificationPayload): any {
    const emoji = this.getEventEmoji(payload.event);
    const themeColor = this.getEventColor(payload.priority || 'normal');

    const card: any = {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      themeColor,
      summary: payload.title,
      sections: [
        {
          activityTitle: `${emoji} ${payload.title}`,
          activitySubtitle: new Date().toLocaleString(),
          text: payload.message,
        },
      ],
    };

    // Add facts if details enabled
    if (channel.includeDetails && payload.data) {
      const facts = this.buildTeamsFacts(payload.data);
      if (facts.length > 0) {
        card.sections[0].facts = facts;
      }
    }

    return card;
  }

  /**
   * Build Discord message payload
   */
  private buildDiscordPayload(channel: any, payload: NotificationPayload): any {
    const color = this.getDiscordColor(payload.priority || 'normal');

    const embed: any = {
      title: payload.title,
      description: payload.message,
      color,
      timestamp: new Date().toISOString(),
    };

    if (channel.includeDetails && payload.data) {
      embed.fields = this.buildDiscordFields(payload.data);
    }

    return { embeds: [embed] };
  }

  /**
   * Build custom webhook payload
   */
  private buildCustomPayload(channel: any, payload: NotificationPayload): any {
    return {
      event: payload.event,
      timestamp: new Date().toISOString(),
      title: payload.title,
      message: payload.message,
      priority: payload.priority || 'normal',
      data: channel.includeDetails ? payload.data : undefined,
    };
  }

  /**
   * Get emoji for event type
   */
  private getEventEmoji(event: NotificationEvent): string {
    const emojis: Record<string, string> = {
      'lead.created': '🆕',
      'lead.updated': '✏️',
      'lead.converted': '🎉',
      'call.completed': '📞',
      'call.missed': '📵',
      'appointment.booked': '📅',
      'appointment.reminder': '⏰',
      'voice.session.ended': '🤖',
      'lead.high_value': '⭐',
      'call.negative_sentiment': '⚠️',
    };
    return emojis[event] || '📢';
  }

  /**
   * Get color for priority
   */
  private getEventColor(priority: string): string {
    const colors: Record<string, string> = {
      low: '808080',
      normal: '0078D7',
      high: 'FFA500',
      urgent: 'FF0000',
    };
    return colors[priority] || colors.normal;
  }

  /**
   * Get Discord color code
   */
  private getDiscordColor(priority: string): number {
    const colors: Record<string, number> = {
      low: 0x808080,
      normal: 0x0078D7,
      high: 0xFFA500,
      urgent: 0xFF0000,
    };
    return colors[priority] || colors.normal;
  }

  /**
   * Build Slack fields from data
   */
  private buildSlackFields(data: Record<string, any>): any[] {
    const fields: any[] = [];
    const displayFields = ['leadName', 'phone', 'email', 'source', 'stage', 'sentiment', 'duration', 'outcome'];

    for (const key of displayFields) {
      if (data[key]) {
        fields.push({
          type: 'mrkdwn',
          text: `*${this.formatFieldName(key)}:*\n${data[key]}`,
        });
      }
    }

    return fields.slice(0, 10); // Slack limit
  }

  /**
   * Build Teams facts from data
   */
  private buildTeamsFacts(data: Record<string, any>): any[] {
    const facts: any[] = [];
    const displayFields = ['leadName', 'phone', 'email', 'source', 'stage', 'sentiment', 'duration', 'outcome'];

    for (const key of displayFields) {
      if (data[key]) {
        facts.push({
          name: this.formatFieldName(key),
          value: String(data[key]),
        });
      }
    }

    return facts;
  }

  /**
   * Build Discord fields from data
   */
  private buildDiscordFields(data: Record<string, any>): any[] {
    const fields: any[] = [];
    const displayFields = ['leadName', 'phone', 'email', 'source', 'stage', 'sentiment', 'duration', 'outcome'];

    for (const key of displayFields) {
      if (data[key]) {
        fields.push({
          name: this.formatFieldName(key),
          value: String(data[key]),
          inline: true,
        });
      }
    }

    return fields.slice(0, 25); // Discord limit
  }

  /**
   * Format field name for display
   */
  private formatFieldName(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  /**
   * Test a notification channel
   */
  async testChannel(id: string, organizationId: string) {
    const channel = await prisma.notificationChannel.findFirst({
      where: { id, organizationId },
    });

    if (!channel) {
      throw new Error('Channel not found');
    }

    return this.sendToChannel(channel, {
      event: 'lead.created' as NotificationEvent,
      organizationId,
      title: 'Test Notification',
      message: 'This is a test notification from your CRM. If you see this, your notification channel is working correctly!',
      priority: 'normal',
      data: {
        leadName: 'Test Lead',
        phone: '+91 98765 43210',
        source: 'Test',
      },
    });
  }

  // ==================== HELPER METHODS FOR VOICE AI INTEGRATION ====================

  /**
   * Notify about new lead from voice AI
   */
  async notifyLeadCreated(organizationId: string, lead: any, session?: any) {
    await this.notify({
      event: NOTIFICATION_EVENTS.LEAD_CREATED,
      organizationId,
      title: 'New Lead Created',
      message: `A new lead *${lead.firstName} ${lead.lastName || ''}* was created from ${session ? 'Voice AI conversation' : 'manual entry'}.`,
      priority: 'normal',
      data: {
        leadId: lead.id,
        leadName: `${lead.firstName} ${lead.lastName || ''}`.trim(),
        phone: lead.phone,
        email: lead.email,
        source: lead.sourceDetails || lead.source,
        ...(session && {
          sentiment: session.sentiment,
          duration: `${session.duration || 0}s`,
          summary: session.summary,
        }),
      },
    });
  }

  /**
   * Notify about completed voice call
   */
  async notifyCallCompleted(organizationId: string, call: any, lead?: any) {
    const sentiment = call.sentiment || 'neutral';
    const priority = sentiment === 'negative' ? 'high' : 'normal';

    await this.notify({
      event: sentiment === 'negative' ? NOTIFICATION_EVENTS.NEGATIVE_SENTIMENT : NOTIFICATION_EVENTS.CALL_COMPLETED,
      organizationId,
      title: sentiment === 'negative' ? 'Negative Sentiment Call' : 'Voice Call Completed',
      message: lead
        ? `Call with *${lead.firstName}* (${call.phoneNumber}) completed. Sentiment: ${sentiment}.`
        : `Voice call with ${call.phoneNumber} completed. Sentiment: ${sentiment}.`,
      priority,
      data: {
        callId: call.id,
        phone: call.phoneNumber,
        duration: `${call.duration || 0}s`,
        sentiment,
        outcome: call.outcome,
        summary: call.summary,
        ...(lead && {
          leadId: lead.id,
          leadName: `${lead.firstName} ${lead.lastName || ''}`.trim(),
        }),
      },
    });
  }

  /**
   * Notify about booked appointment
   */
  async notifyAppointmentBooked(organizationId: string, appointment: any, lead?: any) {
    await this.notify({
      event: NOTIFICATION_EVENTS.APPOINTMENT_BOOKED,
      organizationId,
      title: 'Appointment Booked',
      message: `Appointment scheduled for *${appointment.contactName}* on ${new Date(appointment.scheduledAt).toLocaleString()}.`,
      priority: 'normal',
      data: {
        appointmentId: appointment.id,
        contactName: appointment.contactName,
        contactPhone: appointment.contactPhone,
        scheduledAt: new Date(appointment.scheduledAt).toLocaleString(),
        duration: `${appointment.duration} min`,
        type: appointment.appointmentType,
        ...(lead && { leadId: lead.id }),
      },
    });
  }
}

export const notificationChannelService = new NotificationChannelService();
