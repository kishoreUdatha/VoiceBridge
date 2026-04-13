import { CalendarProvider } from '@prisma/client';
import { google, calendar_v3 } from 'googleapis';
import { prisma } from '../config/database';
import { config } from '../config';
import integrationService from './integration.service';
import { emailService } from '../integrations/email.service';

// Environment variables for Google OAuth (fallback if org-level not configured)
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
// GOOGLE_CALENDAR_REDIRECT_URI must be set in production - uses config.baseUrl
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_CALENDAR_REDIRECT_URI ||
  `${config.baseUrl}/api/calendar/oauth/callback`;

interface CreateEventData {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  attendees?: { email: string; name?: string }[];
  location?: string;
  reminders?: { minutes: number; method: 'email' | 'popup' }[];
}

interface TimeSlot {
  start: Date;
  end: Date;
}

interface OrgCalendarConfig {
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
}

class CalendarService {
  private oauth2Client: any;

  constructor() {
    if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
      this.oauth2Client = new google.auth.OAuth2(
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        GOOGLE_REDIRECT_URI
      );
    }
  }

  /**
   * Get organization-level calendar configuration
   */
  async getOrgConfig(organizationId: string): Promise<OrgCalendarConfig | null> {
    try {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { settings: true },
      });

      const settings = (org?.settings as any) || {};
      const calendarConfig = settings.calendar;

      if (calendarConfig?.clientId && calendarConfig?.clientSecret) {
        // Decrypt the client secret
        let clientSecret = calendarConfig.clientSecret;
        try {
          clientSecret = integrationService.decrypt(calendarConfig.clientSecret);
        } catch (e) {
          // May not be encrypted (legacy)
          console.log('[Calendar] Using client secret as-is');
        }

        return {
          clientId: calendarConfig.clientId,
          clientSecret,
          redirectUri: calendarConfig.redirectUri || GOOGLE_REDIRECT_URI,
        };
      }

      return null;
    } catch (error) {
      console.error('[Calendar] Error getting org config:', error);
      return null;
    }
  }

  /**
   * Get OAuth2 client for organization (uses org-level config or falls back to env)
   */
  async getOAuth2ClientForOrg(organizationId: string): Promise<any> {
    // First try org-level config
    const orgConfig = await this.getOrgConfig(organizationId);

    if (orgConfig) {
      console.log('[Calendar] Using organization-level credentials');
      return new google.auth.OAuth2(
        orgConfig.clientId,
        orgConfig.clientSecret,
        orgConfig.redirectUri || GOOGLE_REDIRECT_URI
      );
    }

    // Fall back to env variables
    if (this.oauth2Client) {
      console.log('[Calendar] Using environment-level credentials');
      return this.oauth2Client;
    }

    throw new Error('Google Calendar not configured. Please set up credentials in Settings > Calendar.');
  }

  /**
   * Check if Google Calendar is configured (env-level)
   */
  isConfigured(): boolean {
    return !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
  }

  /**
   * Check if Google Calendar is configured for a specific organization
   */
  async isConfiguredForOrg(organizationId: string): Promise<boolean> {
    // Check org-level config first
    const orgConfig = await this.getOrgConfig(organizationId);
    if (orgConfig) return true;

    // Fall back to env-level config
    return this.isConfigured();
  }

  /**
   * Generate OAuth URL for connecting Google Calendar
   */
  async getAuthUrl(organizationId: string, userId?: string): Promise<string> {
    // Get OAuth client for this organization
    const oauth2Client = await this.getOAuth2ClientForOrg(organizationId);

    const state = Buffer.from(JSON.stringify({ organizationId, userId })).toString('base64');

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
      ],
      state,
      prompt: 'consent',
    });
  }

  /**
   * Handle OAuth callback and store tokens
   */
  async handleOAuthCallback(code: string, state: string) {
    const { organizationId, userId } = JSON.parse(Buffer.from(state, 'base64').toString());

    // Get OAuth client for this organization
    const oauth2Client = await this.getOAuth2ClientForOrg(organizationId);

    const { tokens } = await oauth2Client.getToken(code);

    // Get primary calendar ID
    oauth2Client.setCredentials(tokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const calendars = await calendar.calendarList.list();
    const primaryCalendar = calendars.data.items?.find(c => c.primary) || calendars.data.items?.[0];

    // Store integration
    const integration = await prisma.calendarIntegration.upsert({
      where: {
        organizationId_userId_provider: {
          organizationId,
          userId: userId || '',
          provider: 'GOOGLE',
        },
      },
      create: {
        organizationId,
        userId,
        provider: 'GOOGLE',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        calendarId: primaryCalendar?.id || 'primary',
        isActive: true,
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || undefined,
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        calendarId: primaryCalendar?.id || 'primary',
        isActive: true,
        lastSyncError: null,
      },
    });

    return integration;
  }

  /**
   * Get calendar integration for organization
   */
  async getIntegration(organizationId: string, provider: CalendarProvider = 'GOOGLE') {
    return prisma.calendarIntegration.findFirst({
      where: {
        organizationId,
        provider,
        isActive: true,
      },
    });
  }

  /**
   * Get authenticated calendar client
   */
  private async getCalendarClient(integration: any): Promise<calendar_v3.Calendar> {
    if (!this.oauth2Client) {
      throw new Error('Google Calendar not configured');
    }

    // Decrypt tokens (they are stored encrypted)
    let accessToken = integration.accessToken;
    let refreshToken = integration.refreshToken;

    try {
      accessToken = integrationService.decrypt(integration.accessToken);
      refreshToken = integration.refreshToken ? integrationService.decrypt(integration.refreshToken) : null;
      console.log('[Calendar] Tokens decrypted successfully');
    } catch (e) {
      // Tokens might not be encrypted (legacy data)
      console.log('[Calendar] Using tokens as-is (not encrypted or decryption failed)');
    }

    // Check if token needs refresh
    if (integration.tokenExpiry && new Date(integration.tokenExpiry) < new Date()) {
      try {
        console.log('[Calendar] Token expired, refreshing...');
        this.oauth2Client.setCredentials({
          refresh_token: refreshToken,
        });

        const { credentials } = await this.oauth2Client.refreshAccessToken();

        // Update stored tokens (encrypted)
        await prisma.calendarIntegration.update({
          where: { id: integration.id },
          data: {
            accessToken: integrationService.encrypt(credentials.access_token!),
            tokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
          },
        });

        this.oauth2Client.setCredentials(credentials);
        console.log('[Calendar] Token refreshed successfully');
      } catch (error) {
        console.error('[Calendar] Token refresh failed:', error);
        throw new Error('Calendar authentication expired. Please reconnect.');
      }
    } else {
      console.log('[Calendar] Using existing token');
      this.oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    }

    return google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * Create calendar event for appointment
   */
  async createEvent(organizationId: string, data: CreateEventData): Promise<{ eventId: string; eventLink: string } | null> {
    const integration = await this.getIntegration(organizationId);
    if (!integration) {
      console.log('[Calendar] No active calendar integration found');
      return null;
    }
    console.log('[Calendar] Found integration, creating event...');

    try {
      const calendar = await this.getCalendarClient(integration);

      const event: calendar_v3.Schema$Event = {
        summary: data.title,
        description: data.description,
        start: {
          dateTime: data.startTime.toISOString(),
          timeZone: 'Asia/Kolkata',
        },
        end: {
          dateTime: data.endTime.toISOString(),
          timeZone: 'Asia/Kolkata',
        },
        location: data.location,
        // Explicitly set attendees with notification preferences
        attendees: data.attendees?.map(a => ({
          email: a.email,
          displayName: a.name,
          responseStatus: 'needsAction',
        })),
        // Allow guests to see other guests and modify event
        guestsCanSeeOtherGuests: true,
        guestsCanInviteOthers: false,
        guestsCanModify: false,
        reminders: {
          useDefault: false,
          overrides: data.reminders?.map(r => ({
            method: r.method,
            minutes: r.minutes,
          })) || [
            { method: 'email', minutes: 60 },
            { method: 'popup', minutes: 15 },
          ],
        },
      };

      console.log('[Calendar] Inserting event with sendUpdates=all, sendNotifications=true');
      console.log('[Calendar] Attendees to notify:', JSON.stringify(event.attendees));

      const response = await calendar.events.insert({
        calendarId: integration.calendarId || 'primary',
        requestBody: event,
        sendUpdates: 'all',
        sendNotifications: true, // Explicitly send email notifications
      });

      // Update last sync
      await prisma.calendarIntegration.update({
        where: { id: integration.id },
        data: { lastSyncAt: new Date(), lastSyncError: null },
      });

      console.log(`[Calendar] Created event: ${response.data.id}`);
      console.log(`[Calendar] Event details:`, {
        id: response.data.id,
        htmlLink: response.data.htmlLink,
        attendees: response.data.attendees,
        status: response.data.status,
      });

      // Also send email invitation with ICS attachment (as backup for Google's invitation system)
      if (data.attendees && data.attendees.length > 0) {
        for (const attendee of data.attendees) {
          try {
            await emailService.sendCalendarInvitation({
              to: attendee.email,
              toName: attendee.name,
              eventTitle: data.title,
              eventDescription: data.description,
              startTime: data.startTime,
              endTime: data.endTime,
              location: data.location,
              eventId: response.data.id!,
            });
            console.log(`[Calendar] Email invitation sent to ${attendee.email}`);
          } catch (emailError: any) {
            console.error(`[Calendar] Failed to send email invitation to ${attendee.email}:`, emailError.message);
            // Don't fail the whole operation if email fails
          }
        }
      }

      return {
        eventId: response.data.id!,
        eventLink: response.data.htmlLink!,
      };
    } catch (error: any) {
      console.error('[Calendar] Failed to create event:', error.message);

      // Update sync error
      await prisma.calendarIntegration.update({
        where: { id: integration.id },
        data: { lastSyncError: error.message },
      });

      return null;
    }
  }

  /**
   * Check availability for a time range
   */
  async checkAvailability(
    organizationId: string,
    startTime: Date,
    endTime: Date
  ): Promise<{ available: boolean; conflicts: any[] }> {
    const integration = await this.getIntegration(organizationId);
    if (!integration || !integration.checkAvailability) {
      return { available: true, conflicts: [] };
    }

    try {
      const calendar = await this.getCalendarClient(integration);

      const response = await calendar.freebusy.query({
        requestBody: {
          timeMin: startTime.toISOString(),
          timeMax: endTime.toISOString(),
          items: [{ id: integration.calendarId || 'primary' }],
        },
      });

      const busy = response.data.calendars?.[integration.calendarId || 'primary']?.busy || [];

      return {
        available: busy.length === 0,
        conflicts: busy.map(slot => ({
          start: slot.start,
          end: slot.end,
        })),
      };
    } catch (error: any) {
      console.error('[Calendar] Availability check failed:', error.message);
      return { available: true, conflicts: [] };
    }
  }

  /**
   * Get available time slots for a day
   */
  async getAvailableSlots(
    organizationId: string,
    date: Date,
    slotDurationMinutes: number = 30,
    workingHoursStart: number = 9,
    workingHoursEnd: number = 18
  ): Promise<TimeSlot[]> {
    const integration = await this.getIntegration(organizationId);

    // Set up working hours for the day
    const dayStart = new Date(date);
    dayStart.setHours(workingHoursStart, 0, 0, 0);

    const dayEnd = new Date(date);
    dayEnd.setHours(workingHoursEnd, 0, 0, 0);

    // Get busy times
    let busySlots: { start: Date; end: Date }[] = [];

    if (integration && integration.checkAvailability) {
      try {
        const calendar = await this.getCalendarClient(integration);

        const response = await calendar.freebusy.query({
          requestBody: {
            timeMin: dayStart.toISOString(),
            timeMax: dayEnd.toISOString(),
            items: [{ id: integration.calendarId || 'primary' }],
          },
        });

        const busy = response.data.calendars?.[integration.calendarId || 'primary']?.busy || [];
        busySlots = busy.map(slot => ({
          start: new Date(slot.start!),
          end: new Date(slot.end!),
        }));
      } catch (error: any) {
        console.error('[Calendar] Failed to get busy times:', error.message);
      }
    }

    // Generate available slots
    const slots: TimeSlot[] = [];
    let currentTime = new Date(dayStart);

    while (currentTime < dayEnd) {
      const slotEnd = new Date(currentTime.getTime() + slotDurationMinutes * 60000);

      // Check if this slot overlaps with any busy time
      const isAvailable = !busySlots.some(busy =>
        (currentTime < busy.end && slotEnd > busy.start)
      );

      // Also check if slot is in the future
      if (isAvailable && currentTime > new Date()) {
        slots.push({
          start: new Date(currentTime),
          end: slotEnd,
        });
      }

      currentTime = slotEnd;
    }

    return slots;
  }

  /**
   * Update calendar event
   */
  async updateEvent(
    organizationId: string,
    eventId: string,
    data: Partial<CreateEventData>
  ): Promise<boolean> {
    const integration = await this.getIntegration(organizationId);
    if (!integration) return false;

    try {
      const calendar = await this.getCalendarClient(integration);

      const updateData: calendar_v3.Schema$Event = {};

      if (data.title) updateData.summary = data.title;
      if (data.description) updateData.description = data.description;
      if (data.location) updateData.location = data.location;
      if (data.startTime) {
        updateData.start = {
          dateTime: data.startTime.toISOString(),
          timeZone: 'Asia/Kolkata',
        };
      }
      if (data.endTime) {
        updateData.end = {
          dateTime: data.endTime.toISOString(),
          timeZone: 'Asia/Kolkata',
        };
      }

      await calendar.events.patch({
        calendarId: integration.calendarId || 'primary',
        eventId,
        requestBody: updateData,
        sendUpdates: 'all',
      });

      return true;
    } catch (error: any) {
      console.error('[Calendar] Failed to update event:', error.message);
      return false;
    }
  }

  /**
   * Delete calendar event
   */
  async deleteEvent(organizationId: string, eventId: string): Promise<boolean> {
    const integration = await this.getIntegration(organizationId);
    if (!integration) return false;

    try {
      const calendar = await this.getCalendarClient(integration);

      await calendar.events.delete({
        calendarId: integration.calendarId || 'primary',
        eventId,
        sendUpdates: 'all',
      });

      return true;
    } catch (error: any) {
      console.error('[Calendar] Failed to delete event:', error.message);
      return false;
    }
  }

  /**
   * Disconnect calendar integration
   */
  async disconnect(organizationId: string, provider: CalendarProvider = 'GOOGLE') {
    await prisma.calendarIntegration.updateMany({
      where: { organizationId, provider },
      data: { isActive: false },
    });
  }

  /**
   * Sync appointment to calendar
   */
  async syncAppointmentToCalendar(appointment: any, lead?: any): Promise<string | null> {
    const endTime = new Date(appointment.scheduledAt);
    endTime.setMinutes(endTime.getMinutes() + (appointment.duration || 30));

    const result = await this.createEvent(appointment.organizationId, {
      title: appointment.title || `Appointment: ${appointment.contactName}`,
      description: `
${appointment.description || ''}

Contact: ${appointment.contactName}
Phone: ${appointment.contactPhone}
${appointment.contactEmail ? `Email: ${appointment.contactEmail}` : ''}
${lead ? `Lead ID: ${lead.id}` : ''}
${appointment.notes ? `Notes: ${appointment.notes}` : ''}

Created by: Voice AI System
      `.trim(),
      startTime: new Date(appointment.scheduledAt),
      endTime,
      location: appointment.locationDetails,
      attendees: appointment.contactEmail ? [{ email: appointment.contactEmail, name: appointment.contactName }] : [],
      reminders: [
        { method: 'email', minutes: 60 },
        { method: 'popup', minutes: 15 },
      ],
    });

    return result?.eventId || null;
  }
}

export const calendarService = new CalendarService();
