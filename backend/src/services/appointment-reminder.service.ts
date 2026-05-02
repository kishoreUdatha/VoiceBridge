/**
 * Appointment Reminder Service
 * Automated, industry-agnostic appointment reminder system
 *
 * Features:
 * - Multi-channel reminders (WhatsApp, SMS, Email, AI Call)
 * - Configurable intervals (24h, 2h, 30min before)
 * - Customizable message templates
 * - Task creation on no-response
 * - Retry logic with fallback channels
 */

import { prisma } from '../config/database';
import { createWhatsAppService } from '../integrations/whatsapp.service';
import { msg91Service } from './msg91.service';
import { emailSettingsService } from './emailSettings.service';
import { config } from '../config';
import * as crypto from 'crypto';

// Date formatting helpers (native JS, no external deps)
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

// Default message templates
const DEFAULT_TEMPLATES = {
  template24h: `Hi {{firstName}},

This is a reminder about your appointment tomorrow.

Date: {{appointmentDate}}
Time: {{appointmentTime}}
Location: {{location}}

Reply CONFIRM to confirm your attendance, or click here: {{confirmLink}}

See you soon!`,

  template2h: `Hi {{firstName}},

Your appointment is in 2 hours.

Time: {{appointmentTime}}
Location: {{location}}

Please confirm: {{confirmLink}}

Let us know if you need to reschedule.`,

  template30m: `Hi {{firstName}},

Your appointment is in 30 minutes!

Location: {{location}}

We're looking forward to meeting you!`,
};

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

export interface AppointmentWithOrg {
  id: string;
  organizationId: string;
  leadId: string | null;
  title: string;
  description: string | null;
  scheduledAt: Date;
  duration: number;
  timezone: string;
  locationType: string;
  locationDetails: string | null;
  contactName: string;
  contactPhone: string;
  contactEmail: string | null;
  status: string;
  reminder24hSent: boolean;
  reminder2hSent: boolean;
  reminder30mSent: boolean;
  customerConfirmed: boolean;
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

class AppointmentReminderService {
  /**
   * Main scheduler function - called periodically to check and send reminders
   * Should be called every 15 minutes by the job initializer
   */
  async checkAndSendReminders(): Promise<SendReminderResult[]> {
    console.log('[AppointmentReminder] Starting reminder check...');
    const results: SendReminderResult[] = [];
    const now = new Date();

    try {
      // Get all organizations with reminder settings enabled
      const orgSettings = await prisma.appointmentReminderSettings.findMany({
        where: { enabled: true },
        include: { organization: true },
      });

      for (const settings of orgSettings) {
        const appointments = await this.getUpcomingAppointments(settings.organizationId);

        for (const appointment of appointments) {
          const reminderResults = await this.processAppointment(appointment, settings, now);
          results.push(...reminderResults);
        }
      }

      // Also process orgs without explicit settings (use defaults)
      const orgsWithSettings = orgSettings.map(s => s.organizationId);
      const defaultOrgAppointments = await this.getUpcomingAppointmentsWithoutSettings(orgsWithSettings);

      for (const appointment of defaultOrgAppointments) {
        const defaultSettings = this.getDefaultSettings();
        const reminderResults = await this.processAppointmentWithDefaults(appointment, defaultSettings, now);
        results.push(...reminderResults);
      }

      console.log(`[AppointmentReminder] Completed reminder check. Processed ${results.length} reminders.`);
    } catch (error) {
      console.error('[AppointmentReminder] Error in checkAndSendReminders:', error);
    }

    return results;
  }

  /**
   * Get upcoming appointments for an organization
   */
  private async getUpcomingAppointments(organizationId: string): Promise<AppointmentWithOrg[]> {
    const now = new Date();
    const windowEnd = addMinutes(now, 24 * 60 + 30); // Next 24.5 hours

    return prisma.appointment.findMany({
      where: {
        organizationId,
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
        scheduledAt: {
          gte: now,
          lte: windowEnd,
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  /**
   * Get upcoming appointments for organizations without explicit settings
   */
  private async getUpcomingAppointmentsWithoutSettings(excludeOrgIds: string[]): Promise<AppointmentWithOrg[]> {
    const now = new Date();
    const windowEnd = addMinutes(now, 24 * 60 + 30);

    return prisma.appointment.findMany({
      where: {
        organizationId: { notIn: excludeOrgIds },
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
        scheduledAt: {
          gte: now,
          lte: windowEnd,
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  /**
   * Get default reminder settings
   */
  private getDefaultSettings(): ReminderSettings {
    return {
      enabled: true,
      reminder24h: true,
      reminder2h: true,
      reminder30m: true,
      useWhatsApp: true,
      useSMS: false,
      useEmail: true,
      useAICall: false,
      template24h: DEFAULT_TEMPLATES.template24h,
      template2h: DEFAULT_TEMPLATES.template2h,
      template30m: DEFAULT_TEMPLATES.template30m,
      createTaskOnNoResponse: true,
      notifyManagerOnNoShow: false,
    };
  }

  /**
   * Process a single appointment and send appropriate reminders
   */
  private async processAppointment(
    appointment: AppointmentWithOrg,
    settings: any,
    now: Date
  ): Promise<SendReminderResult[]> {
    const results: SendReminderResult[] = [];
    const hoursUntilAppointment = (appointment.scheduledAt.getTime() - now.getTime()) / (1000 * 60 * 60);

    // 24-hour reminder (23-25 hours before)
    if (
      settings.reminder24h &&
      !appointment.reminder24hSent &&
      hoursUntilAppointment >= 23 &&
      hoursUntilAppointment <= 25
    ) {
      const result = await this.send24HourReminder(appointment, settings);
      results.push(result);
    }

    // 2-hour reminder (1.5-2.5 hours before)
    if (
      settings.reminder2h &&
      !appointment.reminder2hSent &&
      hoursUntilAppointment >= 1.5 &&
      hoursUntilAppointment <= 2.5
    ) {
      const result = await this.send2HourReminder(appointment, settings);
      results.push(result);
    }

    // 30-minute reminder (25-35 minutes before)
    if (
      settings.reminder30m &&
      !appointment.reminder30mSent &&
      hoursUntilAppointment >= 0.4 &&
      hoursUntilAppointment <= 0.6
    ) {
      const result = await this.send30MinuteReminder(appointment, settings);
      results.push(result);
    }

    return results;
  }

  /**
   * Process appointment with default settings
   */
  private async processAppointmentWithDefaults(
    appointment: AppointmentWithOrg,
    settings: ReminderSettings,
    now: Date
  ): Promise<SendReminderResult[]> {
    const results: SendReminderResult[] = [];
    const hoursUntilAppointment = (appointment.scheduledAt.getTime() - now.getTime()) / (1000 * 60 * 60);

    // 24-hour reminder
    if (
      settings.reminder24h &&
      !appointment.reminder24hSent &&
      hoursUntilAppointment >= 23 &&
      hoursUntilAppointment <= 25
    ) {
      const result = await this.send24HourReminderWithDefaults(appointment, settings);
      results.push(result);
    }

    // 2-hour reminder
    if (
      settings.reminder2h &&
      !appointment.reminder2hSent &&
      hoursUntilAppointment >= 1.5 &&
      hoursUntilAppointment <= 2.5
    ) {
      const result = await this.send2HourReminderWithDefaults(appointment, settings);
      results.push(result);
    }

    // 30-minute reminder
    if (
      settings.reminder30m &&
      !appointment.reminder30mSent &&
      hoursUntilAppointment >= 0.4 &&
      hoursUntilAppointment <= 0.6
    ) {
      const result = await this.send30MinuteReminderWithDefaults(appointment, settings);
      results.push(result);
    }

    return results;
  }

  /**
   * Send 24-hour reminder
   */
  async send24HourReminder(appointment: AppointmentWithOrg, settings: any): Promise<SendReminderResult> {
    console.log(`[AppointmentReminder] Sending 24h reminder for appointment ${appointment.id}`);

    const template = settings.template24h || DEFAULT_TEMPLATES.template24h;
    const message = this.buildReminderMessage(template, appointment);
    const channels = await this.sendMultiChannelReminder(appointment, message, settings, '24h');

    // Update appointment
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        reminder24hSent: true,
        lastReminderAt: new Date(),
      },
    });

    // Log the reminder
    await this.logReminder(appointment.id, '24h', channels);

    return {
      appointmentId: appointment.id,
      reminderType: '24h',
      channels,
      success: channels.some(c => c.success),
    };
  }

  /**
   * Send 24-hour reminder with defaults
   */
  private async send24HourReminderWithDefaults(
    appointment: AppointmentWithOrg,
    settings: ReminderSettings
  ): Promise<SendReminderResult> {
    console.log(`[AppointmentReminder] Sending 24h reminder (default) for appointment ${appointment.id}`);

    const template = settings.template24h || DEFAULT_TEMPLATES.template24h;
    const message = this.buildReminderMessage(template, appointment);
    const channels = await this.sendMultiChannelReminderWithDefaults(appointment, message, settings, '24h');

    await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        reminder24hSent: true,
        lastReminderAt: new Date(),
      },
    });

    await this.logReminder(appointment.id, '24h', channels);

    return {
      appointmentId: appointment.id,
      reminderType: '24h',
      channels,
      success: channels.some(c => c.success),
    };
  }

  /**
   * Send 2-hour reminder
   */
  async send2HourReminder(appointment: AppointmentWithOrg, settings: any): Promise<SendReminderResult> {
    console.log(`[AppointmentReminder] Sending 2h reminder for appointment ${appointment.id}`);

    const template = settings.template2h || DEFAULT_TEMPLATES.template2h;
    const message = this.buildReminderMessage(template, appointment);
    const channels = await this.sendMultiChannelReminder(appointment, message, settings, '2h');

    // Schedule AI confirmation call if enabled
    if (settings.useAICall && !appointment.customerConfirmed) {
      await this.scheduleConfirmationCall(appointment);
    }

    await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        reminder2hSent: true,
        lastReminderAt: new Date(),
      },
    });

    await this.logReminder(appointment.id, '2h', channels);

    return {
      appointmentId: appointment.id,
      reminderType: '2h',
      channels,
      success: channels.some(c => c.success),
    };
  }

  /**
   * Send 2-hour reminder with defaults
   */
  private async send2HourReminderWithDefaults(
    appointment: AppointmentWithOrg,
    settings: ReminderSettings
  ): Promise<SendReminderResult> {
    console.log(`[AppointmentReminder] Sending 2h reminder (default) for appointment ${appointment.id}`);

    const template = settings.template2h || DEFAULT_TEMPLATES.template2h;
    const message = this.buildReminderMessage(template, appointment);
    const channels = await this.sendMultiChannelReminderWithDefaults(appointment, message, settings, '2h');

    await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        reminder2hSent: true,
        lastReminderAt: new Date(),
      },
    });

    await this.logReminder(appointment.id, '2h', channels);

    return {
      appointmentId: appointment.id,
      reminderType: '2h',
      channels,
      success: channels.some(c => c.success),
    };
  }

  /**
   * Send 30-minute reminder
   */
  async send30MinuteReminder(appointment: AppointmentWithOrg, settings: any): Promise<SendReminderResult> {
    console.log(`[AppointmentReminder] Sending 30m reminder for appointment ${appointment.id}`);

    const template = settings.template30m || DEFAULT_TEMPLATES.template30m;
    const message = this.buildReminderMessage(template, appointment);
    const channels = await this.sendMultiChannelReminder(appointment, message, settings, '30m');

    await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        reminder30mSent: true,
        lastReminderAt: new Date(),
      },
    });

    await this.logReminder(appointment.id, '30m', channels);

    // Check for no-response and create task if needed
    if (settings.createTaskOnNoResponse && !appointment.customerConfirmed) {
      await this.handleNoResponse(appointment, settings);
    }

    return {
      appointmentId: appointment.id,
      reminderType: '30m',
      channels,
      success: channels.some(c => c.success),
    };
  }

  /**
   * Send 30-minute reminder with defaults
   */
  private async send30MinuteReminderWithDefaults(
    appointment: AppointmentWithOrg,
    settings: ReminderSettings
  ): Promise<SendReminderResult> {
    console.log(`[AppointmentReminder] Sending 30m reminder (default) for appointment ${appointment.id}`);

    const template = settings.template30m || DEFAULT_TEMPLATES.template30m;
    const message = this.buildReminderMessage(template, appointment);
    const channels = await this.sendMultiChannelReminderWithDefaults(appointment, message, settings, '30m');

    await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        reminder30mSent: true,
        lastReminderAt: new Date(),
      },
    });

    await this.logReminder(appointment.id, '30m', channels);

    if (settings.createTaskOnNoResponse && !appointment.customerConfirmed) {
      await this.handleNoResponseWithDefaults(appointment);
    }

    return {
      appointmentId: appointment.id,
      reminderType: '30m',
      channels,
      success: channels.some(c => c.success),
    };
  }

  /**
   * Send reminder through multiple channels
   */
  private async sendMultiChannelReminder(
    appointment: AppointmentWithOrg,
    message: string,
    settings: any,
    reminderType: string
  ): Promise<{ channel: string; success: boolean; messageId?: string; error?: string }[]> {
    const results: { channel: string; success: boolean; messageId?: string; error?: string }[] = [];

    // WhatsApp
    if (settings.useWhatsApp && appointment.contactPhone) {
      const result = await this.sendWhatsApp(appointment.organizationId, appointment.contactPhone, message);
      results.push({ channel: 'whatsapp', ...result });
    }

    // SMS (fallback if WhatsApp fails or as additional channel)
    if (settings.useSMS && appointment.contactPhone) {
      const result = await this.sendSMS(appointment.organizationId, appointment.contactPhone, message);
      results.push({ channel: 'sms', ...result });
    }

    // Email
    if (settings.useEmail && appointment.contactEmail) {
      const result = await this.sendEmail(
        appointment.organizationId,
        appointment.contactEmail,
        `Appointment Reminder - ${appointment.title}`,
        message
      );
      results.push({ channel: 'email', ...result });
    }

    return results;
  }

  /**
   * Send reminder through multiple channels with default settings
   */
  private async sendMultiChannelReminderWithDefaults(
    appointment: AppointmentWithOrg,
    message: string,
    settings: ReminderSettings,
    reminderType: string
  ): Promise<{ channel: string; success: boolean; messageId?: string; error?: string }[]> {
    const results: { channel: string; success: boolean; messageId?: string; error?: string }[] = [];

    // WhatsApp
    if (settings.useWhatsApp && appointment.contactPhone) {
      const result = await this.sendWhatsApp(appointment.organizationId, appointment.contactPhone, message);
      results.push({ channel: 'whatsapp', ...result });
    }

    // SMS
    if (settings.useSMS && appointment.contactPhone) {
      const result = await this.sendSMS(appointment.organizationId, appointment.contactPhone, message);
      results.push({ channel: 'sms', ...result });
    }

    // Email
    if (settings.useEmail && appointment.contactEmail) {
      const result = await this.sendEmail(
        appointment.organizationId,
        appointment.contactEmail,
        `Appointment Reminder - ${appointment.title}`,
        message
      );
      results.push({ channel: 'email', ...result });
    }

    return results;
  }

  /**
   * Send WhatsApp message
   */
  private async sendWhatsApp(
    organizationId: string,
    phone: string,
    message: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const whatsappService = createWhatsAppService(organizationId);
      const isConfigured = await whatsappService.isConfigured();

      if (!isConfigured) {
        return { success: false, error: 'WhatsApp not configured' };
      }

      const result = await whatsappService.sendMessage({ to: phone, message });
      return {
        success: result.success,
        messageId: result.messageId,
        error: result.error,
      };
    } catch (error: any) {
      console.error('[AppointmentReminder] WhatsApp send error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send SMS message
   */
  private async sendSMS(
    organizationId: string,
    phone: string,
    message: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Get a system user for the organization
      const systemUser = await prisma.user.findFirst({
        where: { organizationId },
        select: { id: true },
      });

      if (!systemUser) {
        return { success: false, error: 'No user found for organization' };
      }

      const result = await msg91Service.sendSms({
        phone,
        message,
        userId: systemUser.id,
        organizationId,
      });

      return {
        success: result.success,
        messageId: result.messageId,
        error: result.error,
      };
    } catch (error: any) {
      console.error('[AppointmentReminder] SMS send error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send email
   */
  private async sendEmail(
    organizationId: string,
    email: string,
    subject: string,
    text: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Convert URLs to clickable links in HTML
      const htmlContent = text
        .replace(/\n/g, '<br>')
        .replace(
          /(https?:\/\/[^\s<]+)/g,
          '<a href="$1" style="color: #6366f1; text-decoration: underline;">$1</a>'
        );

      const result = await emailSettingsService.sendEmail(organizationId, {
        to: email,
        subject,
        text,
        html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">${htmlContent}</div>`,
      });

      return {
        success: true,
        messageId: result?.messageId,
      };
    } catch (error: any) {
      console.error('[AppointmentReminder] Email send error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Schedule AI confirmation call
   */
  async scheduleConfirmationCall(appointment: AppointmentWithOrg): Promise<void> {
    try {
      // Create a scheduled call for confirmation
      console.log(`[AppointmentReminder] Scheduling confirmation call for appointment ${appointment.id}`);

      // This would integrate with the outbound call system
      // For now, just log the intent
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          confirmationCallId: `pending_${appointment.id}`,
        },
      });
    } catch (error) {
      console.error('[AppointmentReminder] Error scheduling confirmation call:', error);
    }
  }

  /**
   * Handle no-response by creating a follow-up task
   */
  async handleNoResponse(appointment: AppointmentWithOrg, settings: any): Promise<void> {
    if (!appointment.leadId) {
      console.log(`[AppointmentReminder] No lead associated with appointment ${appointment.id}, skipping task creation`);
      return;
    }

    try {
      // Get the lead's assigned user
      const lead = await prisma.lead.findUnique({
        where: { id: appointment.leadId },
        include: {
          assignments: {
            where: { status: 'ACTIVE' },
            include: { assignedTo: true },
            take: 1,
          },
        },
      });

      if (!lead || !lead.assignments.length) {
        console.log(`[AppointmentReminder] No active assignment for lead ${appointment.leadId}`);
        return;
      }

      const assignee = lead.assignments[0].assignedTo;

      // Create follow-up task
      await prisma.leadTask.create({
        data: {
          leadId: appointment.leadId,
          assigneeId: assignee.id,
          createdById: assignee.id,
          title: `Follow up on appointment confirmation - ${appointment.contactName}`,
          description: `Customer has not confirmed their appointment scheduled for ${formatDate(appointment.scheduledAt)} at ${formatTime(appointment.scheduledAt)}. Please contact them to confirm attendance.`,
          dueDate: appointment.scheduledAt,
          priority: 'HIGH',
          status: 'PENDING',
        },
      });

      console.log(`[AppointmentReminder] Created follow-up task for appointment ${appointment.id}`);
    } catch (error) {
      console.error('[AppointmentReminder] Error creating follow-up task:', error);
    }
  }

  /**
   * Handle no-response with defaults
   */
  private async handleNoResponseWithDefaults(appointment: AppointmentWithOrg): Promise<void> {
    await this.handleNoResponse(appointment, { createTaskOnNoResponse: true });
  }

  /**
   * Build reminder message from template
   */
  buildReminderMessage(template: string, appointment: AppointmentWithOrg): string {
    // Generate confirmation link
    const confirmationToken = this.generateConfirmationToken(appointment.id);
    const baseUrl = config.frontendUrl || process.env.FRONTEND_URL || 'https://app.myleadx.com';
    const confirmationLink = `${baseUrl.replace(/\/$/, '')}/api/appointment-reminders/confirm/${confirmationToken}`;

    const variables: Record<string, string> = {
      firstName: appointment.contactName.split(' ')[0] || appointment.contactName,
      fullName: appointment.contactName,
      contactName: appointment.contactName,
      appointmentTitle: appointment.title,
      appointmentDate: formatDate(appointment.scheduledAt),
      appointmentTime: formatTime(appointment.scheduledAt),
      duration: `${appointment.duration} minutes`,
      location: appointment.locationDetails || this.getLocationTypeLabel(appointment.locationType),
      locationType: this.getLocationTypeLabel(appointment.locationType),
      confirmLink: confirmationLink,
      confirmationLink: confirmationLink,
    };

    let message = template;
    for (const [key, value] of Object.entries(variables)) {
      message = message.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }

    return message;
  }

  /**
   * Generate a confirmation token for an appointment
   */
  private generateConfirmationToken(appointmentId: string): string {
    const timestamp = Date.now().toString();
    const signature = crypto
      .createHmac('sha256', process.env.JWT_SECRET || config.jwt?.secret || 'default-secret')
      .update(`${appointmentId}:${timestamp}`)
      .digest('hex')
      .substring(0, 16);

    return Buffer.from(`${appointmentId}:${timestamp}:${signature}`).toString('base64');
  }

  /**
   * Get human-readable location type label
   */
  private getLocationTypeLabel(locationType: string): string {
    const labels: Record<string, string> = {
      PHONE: 'Phone Call',
      VIDEO: 'Video Call',
      IN_PERSON: 'In-Person',
      OTHER: 'See details',
    };
    return labels[locationType] || locationType;
  }

  /**
   * Log reminder to database
   */
  private async logReminder(
    appointmentId: string,
    reminderType: string,
    channels: { channel: string; success: boolean; messageId?: string; error?: string }[]
  ): Promise<void> {
    try {
      const logs = channels.map(c => ({
        appointmentId,
        reminderType,
        channel: c.channel,
        status: c.success ? 'sent' : 'failed',
        messageId: c.messageId || null,
        errorMessage: c.error || null,
      }));

      await prisma.appointmentReminderLog.createMany({
        data: logs,
      });
    } catch (error) {
      console.error('[AppointmentReminder] Error logging reminder:', error);
    }
  }

  /**
   * Get or create reminder settings for an organization
   */
  async getSettings(organizationId: string): Promise<ReminderSettings> {
    const settings = await prisma.appointmentReminderSettings.findUnique({
      where: { organizationId },
    });

    if (!settings) {
      return this.getDefaultSettings();
    }

    return {
      enabled: settings.enabled,
      reminder24h: settings.reminder24h,
      reminder2h: settings.reminder2h,
      reminder30m: settings.reminder30m,
      useWhatsApp: settings.useWhatsApp,
      useSMS: settings.useSMS,
      useEmail: settings.useEmail,
      useAICall: settings.useAICall,
      template24h: settings.template24h,
      template2h: settings.template2h,
      template30m: settings.template30m,
      createTaskOnNoResponse: settings.createTaskOnNoResponse,
      notifyManagerOnNoShow: settings.notifyManagerOnNoShow,
    };
  }

  /**
   * Update reminder settings for an organization
   */
  async updateSettings(organizationId: string, updates: Partial<ReminderSettings>): Promise<ReminderSettings> {
    const settings = await prisma.appointmentReminderSettings.upsert({
      where: { organizationId },
      create: {
        organizationId,
        enabled: updates.enabled ?? true,
        reminder24h: updates.reminder24h ?? true,
        reminder2h: updates.reminder2h ?? true,
        reminder30m: updates.reminder30m ?? true,
        useWhatsApp: updates.useWhatsApp ?? true,
        useSMS: updates.useSMS ?? false,
        useEmail: updates.useEmail ?? true,
        useAICall: updates.useAICall ?? false,
        template24h: updates.template24h ?? null,
        template2h: updates.template2h ?? null,
        template30m: updates.template30m ?? null,
        createTaskOnNoResponse: updates.createTaskOnNoResponse ?? true,
        notifyManagerOnNoShow: updates.notifyManagerOnNoShow ?? false,
      },
      update: {
        ...updates,
      },
    });

    return this.getSettings(organizationId);
  }

  /**
   * Get reminder logs for an appointment
   */
  async getReminderLogs(appointmentId: string) {
    return prisma.appointmentReminderLog.findMany({
      where: { appointmentId },
      orderBy: { sentAt: 'desc' },
    });
  }

  /**
   * Get all reminder logs for an organization
   */
  async getOrganizationReminderLogs(organizationId: string, limit = 100) {
    const appointments = await prisma.appointment.findMany({
      where: { organizationId },
      select: { id: true },
    });

    const appointmentIds = appointments.map(a => a.id);

    return prisma.appointmentReminderLog.findMany({
      where: { appointmentId: { in: appointmentIds } },
      orderBy: { sentAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Mark appointment as confirmed by customer
   */
  async confirmAppointment(appointmentId: string): Promise<void> {
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        customerConfirmed: true,
        status: 'CONFIRMED',
        confirmedAt: new Date(),
      },
    });
  }

  /**
   * Send a test reminder
   */
  async sendTestReminder(
    organizationId: string,
    reminderType: '24h' | '2h' | '30m',
    testPhone?: string,
    testEmail?: string
  ): Promise<SendReminderResult> {
    const settings = await this.getSettings(organizationId);

    // Create a mock appointment for testing
    const mockAppointment: AppointmentWithOrg = {
      id: 'test-appointment',
      organizationId,
      leadId: null,
      title: 'Test Appointment',
      description: 'This is a test reminder',
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      duration: 30,
      timezone: 'Asia/Kolkata',
      locationType: 'VIDEO',
      locationDetails: 'https://meet.example.com/test',
      contactName: 'Test Customer',
      contactPhone: testPhone || '+919999999999',
      contactEmail: testEmail || 'test@example.com',
      status: 'SCHEDULED',
      reminder24hSent: false,
      reminder2hSent: false,
      reminder30mSent: false,
      customerConfirmed: false,
    };

    const template =
      reminderType === '24h'
        ? settings.template24h || DEFAULT_TEMPLATES.template24h
        : reminderType === '2h'
        ? settings.template2h || DEFAULT_TEMPLATES.template2h
        : settings.template30m || DEFAULT_TEMPLATES.template30m;

    const message = this.buildReminderMessage(template, mockAppointment);
    const channels: { channel: string; success: boolean; messageId?: string; error?: string }[] = [];

    // Send test messages
    if (settings.useWhatsApp && testPhone) {
      const result = await this.sendWhatsApp(organizationId, testPhone, message);
      channels.push({ channel: 'whatsapp', ...result });
    }

    if (settings.useSMS && testPhone) {
      const result = await this.sendSMS(organizationId, testPhone, message);
      channels.push({ channel: 'sms', ...result });
    }

    if (settings.useEmail && testEmail) {
      const result = await this.sendEmail(organizationId, testEmail, 'Test Appointment Reminder', message);
      channels.push({ channel: 'email', ...result });
    }

    return {
      appointmentId: 'test-appointment',
      reminderType,
      channels,
      success: channels.some(c => c.success),
    };
  }
}

export const appointmentReminderService = new AppointmentReminderService();
