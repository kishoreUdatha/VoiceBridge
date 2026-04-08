/**
 * Video Meeting Service
 * Handles Zoom/Meet/Teams integration with scheduling and recording
 */

import { PrismaClient, VideoProvider, MeetingStatus, ParticipantRole } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

interface MeetingConfig {
  title: string;
  description?: string;
  provider: VideoProvider;
  scheduledStart: Date;
  scheduledEnd: Date;
  timezone?: string;
  hostId: string;
  leadId?: string;
  accountId?: string;
  opportunityId?: string;
  participants?: { email: string; name?: string; role?: ParticipantRole }[];
  waitingRoom?: boolean;
  muteOnEntry?: boolean;
}

export const videoMeetingService = {
  // Get provider configuration
  async getProviderConfig(organizationId: string, provider: VideoProvider) {
    return prisma.videoProviderConfig.findUnique({
      where: { organizationId_provider: { organizationId, provider } },
    });
  },

  // Configure provider
  async configureProvider(
    organizationId: string,
    provider: VideoProvider,
    credentials: {
      clientId?: string;
      clientSecret?: string;
      accessToken?: string;
      refreshToken?: string;
      apiKey?: string;
    }
  ) {
    return prisma.videoProviderConfig.upsert({
      where: { organizationId_provider: { organizationId, provider } },
      update: { ...credentials, isActive: true },
      create: { organizationId, provider, ...credentials },
    });
  },

  // Get all meetings
  async getMeetings(organizationId: string, filters?: any) {
    const where: any = { organizationId };

    if (filters?.status) where.status = filters.status;
    if (filters?.hostId) where.hostId = filters.hostId;
    if (filters?.leadId) where.leadId = filters.leadId;
    if (filters?.dateRange) {
      where.scheduledStart = {
        gte: filters.dateRange.start,
        lte: filters.dateRange.end,
      };
    }

    return prisma.videoMeeting.findMany({
      where,
      include: {
        participants: true,
        _count: { select: { participants: true } },
      },
      orderBy: { scheduledStart: 'desc' },
      take: filters?.limit || 50,
    });
  },

  // Get single meeting
  async getMeeting(id: string) {
    return prisma.videoMeeting.findUnique({
      where: { id },
      include: { participants: true },
    });
  },

  // Create meeting
  async createMeeting(organizationId: string, config: MeetingConfig) {
    // Get provider config
    const providerConfig = await this.getProviderConfig(organizationId, config.provider);
    if (!providerConfig || !providerConfig.isActive) {
      throw new Error(`${config.provider} is not configured`);
    }

    // Create meeting with provider
    let externalMeeting: any = null;
    try {
      switch (config.provider) {
        case 'ZOOM':
          externalMeeting = await this.createZoomMeeting(providerConfig, config);
          break;
        case 'GOOGLE_MEET':
          externalMeeting = await this.createGoogleMeeting(providerConfig, config);
          break;
        case 'MICROSOFT_TEAMS':
          externalMeeting = await this.createTeamsMeeting(providerConfig, config);
          break;
      }
    } catch (error: any) {
      console.error('Failed to create external meeting:', error);
      // Continue without external meeting
    }

    // Create meeting record
    const meeting = await prisma.videoMeeting.create({
      data: {
        organizationId,
        title: config.title,
        description: config.description,
        provider: config.provider,
        externalMeetingId: externalMeeting?.id,
        joinUrl: externalMeeting?.joinUrl,
        hostUrl: externalMeeting?.hostUrl,
        password: externalMeeting?.password,
        scheduledStart: config.scheduledStart,
        scheduledEnd: config.scheduledEnd,
        timezone: config.timezone || 'Asia/Kolkata',
        hostId: config.hostId,
        leadId: config.leadId,
        accountId: config.accountId,
        opportunityId: config.opportunityId,
        waitingRoom: config.waitingRoom ?? true,
        muteOnEntry: config.muteOnEntry ?? true,
      },
    });

    // Add participants
    if (config.participants && config.participants.length > 0) {
      await prisma.meetingParticipant.createMany({
        data: config.participants.map((p) => ({
          meetingId: meeting.id,
          email: p.email,
          name: p.name,
          role: p.role || 'ATTENDEE',
          invitedAt: new Date(),
        })),
      });
    }

    return this.getMeeting(meeting.id);
  },

  // Create Zoom meeting
  async createZoomMeeting(providerConfig: any, config: MeetingConfig) {
    const response = await axios.post(
      'https://api.zoom.us/v2/users/me/meetings',
      {
        topic: config.title,
        type: 2, // Scheduled meeting
        start_time: config.scheduledStart.toISOString(),
        duration: Math.ceil((config.scheduledEnd.getTime() - config.scheduledStart.getTime()) / 60000),
        timezone: config.timezone || 'Asia/Kolkata',
        agenda: config.description,
        settings: {
          waiting_room: config.waitingRoom ?? true,
          mute_upon_entry: config.muteOnEntry ?? true,
          auto_recording: 'cloud',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${providerConfig.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      id: response.data.id,
      joinUrl: response.data.join_url,
      hostUrl: response.data.start_url,
      password: response.data.password,
    };
  },

  // Create Google Meet
  async createGoogleMeeting(providerConfig: any, config: MeetingConfig) {
    // Google Calendar API for Meet links
    const response = await axios.post(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        summary: config.title,
        description: config.description,
        start: {
          dateTime: config.scheduledStart.toISOString(),
          timeZone: config.timezone || 'Asia/Kolkata',
        },
        end: {
          dateTime: config.scheduledEnd.toISOString(),
          timeZone: config.timezone || 'Asia/Kolkata',
        },
        conferenceData: {
          createRequest: {
            requestId: `meet-${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${providerConfig.accessToken}`,
          'Content-Type': 'application/json',
        },
        params: { conferenceDataVersion: 1 },
      }
    );

    return {
      id: response.data.id,
      joinUrl: response.data.hangoutLink || response.data.conferenceData?.entryPoints?.[0]?.uri,
      hostUrl: response.data.htmlLink,
    };
  },

  // Create Teams meeting
  async createTeamsMeeting(providerConfig: any, config: MeetingConfig) {
    const response = await axios.post(
      'https://graph.microsoft.com/v1.0/me/onlineMeetings',
      {
        subject: config.title,
        startDateTime: config.scheduledStart.toISOString(),
        endDateTime: config.scheduledEnd.toISOString(),
        lobbyBypassSettings: {
          scope: config.waitingRoom ? 'organization' : 'everyone',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${providerConfig.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      id: response.data.id,
      joinUrl: response.data.joinWebUrl,
      hostUrl: response.data.joinWebUrl,
    };
  },

  // Update meeting
  async updateMeeting(id: string, updates: Partial<MeetingConfig>) {
    return prisma.videoMeeting.update({
      where: { id },
      data: {
        title: updates.title,
        description: updates.description,
        scheduledStart: updates.scheduledStart,
        scheduledEnd: updates.scheduledEnd,
        waitingRoom: updates.waitingRoom,
        muteOnEntry: updates.muteOnEntry,
      },
    });
  },

  // Cancel meeting
  async cancelMeeting(id: string) {
    return prisma.videoMeeting.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  },

  // Start meeting (update status)
  async startMeeting(id: string) {
    return prisma.videoMeeting.update({
      where: { id },
      data: { status: 'IN_PROGRESS', actualStart: new Date() },
    });
  },

  // End meeting
  async endMeeting(id: string) {
    const meeting = await prisma.videoMeeting.findUnique({ where: { id } });
    if (!meeting) throw new Error('Meeting not found');

    const actualParticipants = await prisma.meetingParticipant.count({
      where: { meetingId: id, joinedAt: { not: null } },
    });

    return prisma.videoMeeting.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        actualEnd: new Date(),
        actualParticipants,
      },
    });
  },

  // Record participant join
  async participantJoined(meetingId: string, email: string) {
    return prisma.meetingParticipant.update({
      where: { meetingId_email: { meetingId, email } },
      data: { joinedAt: new Date() },
    });
  },

  // Record participant leave
  async participantLeft(meetingId: string, email: string) {
    const participant = await prisma.meetingParticipant.findUnique({
      where: { meetingId_email: { meetingId, email } },
    });

    if (!participant) return null;

    const duration = participant.joinedAt
      ? Math.floor((Date.now() - participant.joinedAt.getTime()) / 1000)
      : null;

    return prisma.meetingParticipant.update({
      where: { meetingId_email: { meetingId, email } },
      data: { leftAt: new Date(), duration },
    });
  },

  // Update recording info
  async updateRecording(id: string, recordingUrl: string, recordingDuration: number, transcriptUrl?: string) {
    return prisma.videoMeeting.update({
      where: { id },
      data: {
        isRecorded: true,
        recordingUrl,
        recordingDuration,
        transcriptUrl,
      },
    });
  },

  // Get upcoming meetings for user
  async getUpcomingMeetings(userId: string, days = 7) {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    return prisma.videoMeeting.findMany({
      where: {
        OR: [
          { hostId: userId },
          { participants: { some: { userId } } },
        ],
        status: 'SCHEDULED',
        scheduledStart: { gte: new Date(), lte: endDate },
      },
      include: { participants: true },
      orderBy: { scheduledStart: 'asc' },
    });
  },

  // Get meeting statistics
  async getMeetingStats(organizationId: string, dateRange?: { start: Date; end: Date }) {
    const where: any = { organizationId };
    if (dateRange) {
      where.scheduledStart = { gte: dateRange.start, lte: dateRange.end };
    }

    const [total, byStatus, byProvider, avgDuration] = await Promise.all([
      prisma.videoMeeting.count({ where }),
      prisma.videoMeeting.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      prisma.videoMeeting.groupBy({
        by: ['provider'],
        where,
        _count: true,
      }),
      prisma.videoMeeting.aggregate({
        where: { ...where, status: 'COMPLETED' },
        _avg: { recordingDuration: true },
      }),
    ]);

    return {
      total,
      byStatus,
      byProvider,
      avgDurationMinutes: avgDuration._avg.recordingDuration
        ? avgDuration._avg.recordingDuration / 60
        : 0,
    };
  },
};
