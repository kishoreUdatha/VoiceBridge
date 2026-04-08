/**
 * Video Meeting Service
 */

import api from './api';

export interface VideoMeeting {
  id: string;
  title: string;
  description?: string;
  provider: 'ZOOM' | 'GOOGLE_MEET' | 'MICROSOFT_TEAMS';
  platform?: string; // Alias for provider for backward compatibility
  externalMeetingId?: string;
  joinUrl?: string;
  hostUrl?: string;
  password?: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  scheduledStart: string;
  scheduledAt?: string; // Alias for scheduledStart
  scheduledEnd: string;
  duration?: number; // Calculated duration in minutes
  actualStart?: string;
  actualEnd?: string;
  actualDuration?: number;
  timezone: string;
  hostId: string;
  leadId?: string;
  accountId?: string;
  opportunityId?: string;
  waitingRoom: boolean;
  muteOnEntry: boolean;
  isRecorded: boolean;
  recordingUrl?: string;
  recordingDuration?: number;
  transcriptUrl?: string;
  actualParticipants: number;
  createdAt: string;
  participants?: MeetingParticipant[];
}

export interface MeetingParticipant {
  id: string;
  meetingId: string;
  userId?: string;
  email: string;
  name?: string;
  role: 'HOST' | 'CO_HOST' | 'ATTENDEE' | 'PRESENTER';
  invitedAt: string;
  joinedAt?: string;
  leftAt?: string;
  duration?: number;
}

export interface VideoProviderConfig {
  id: string;
  provider: string;
  isActive: boolean;
}

export const videoMeetingService = {
  async getProviderConfig(provider: string): Promise<VideoProviderConfig | null> {
    const response = await api.get(`/video-meetings/providers/${provider}`);
    return response.data;
  },

  async configureProvider(provider: string, credentials: Record<string, string>): Promise<VideoProviderConfig> {
    const response = await api.post(`/video-meetings/providers/${provider}`, credentials);
    return response.data;
  },

  async getMeetings(filters?: {
    status?: string;
    hostId?: string;
    leadId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<VideoMeeting[]> {
    const params = new URLSearchParams();
    Object.entries(filters || {}).forEach(([key, value]) => {
      if (value) params.append(key, String(value));
    });

    const response = await api.get(`/video-meetings?${params.toString()}`);
    // Add computed fields for backward compatibility
    return response.data.map((m: VideoMeeting) => ({
      ...m,
      platform: m.provider,
      scheduledAt: m.scheduledStart,
      duration: m.duration || Math.round((new Date(m.scheduledEnd).getTime() - new Date(m.scheduledStart).getTime()) / 60000),
    }));
  },

  async getMeeting(id: string): Promise<VideoMeeting> {
    const response = await api.get(`/video-meetings/${id}`);
    const m = response.data;
    return {
      ...m,
      platform: m.provider,
      scheduledAt: m.scheduledStart,
      duration: m.duration || Math.round((new Date(m.scheduledEnd).getTime() - new Date(m.scheduledStart).getTime()) / 60000),
    };
  },

  async createMeeting(data: {
    title: string;
    description?: string;
    provider: string;
    scheduledStart: string;
    scheduledEnd: string;
    timezone?: string;
    hostId: string;
    leadId?: string;
    accountId?: string;
    opportunityId?: string;
    participants?: { email: string; name?: string; role?: string }[];
    waitingRoom?: boolean;
    muteOnEntry?: boolean;
  }): Promise<VideoMeeting> {
    const response = await api.post('/video-meetings', data);
    return response.data;
  },

  async updateMeeting(id: string, data: Partial<VideoMeeting>): Promise<VideoMeeting> {
    const response = await api.put(`/video-meetings/${id}`, data);
    return response.data;
  },

  async cancelMeeting(id: string): Promise<VideoMeeting> {
    const response = await api.post(`/video-meetings/${id}/cancel`, {});
    return response.data;
  },

  async startMeeting(id: string): Promise<VideoMeeting> {
    const response = await api.post(`/video-meetings/${id}/start`, {});
    return response.data;
  },

  async endMeeting(id: string): Promise<VideoMeeting> {
    const response = await api.post(`/video-meetings/${id}/end`, {});
    return response.data;
  },

  async getUpcomingMeetings(userId: string, days = 7): Promise<VideoMeeting[]> {
    const response = await api.get(`/video-meetings/user/${userId}/upcoming?days=${days}`);
    return response.data;
  },

  async getMeetingStats(dateRange?: { startDate: string; endDate: string }): Promise<any> {
    const params = new URLSearchParams();
    if (dateRange) {
      params.append('startDate', dateRange.startDate);
      params.append('endDate', dateRange.endDate);
    }

    const response = await api.get(`/video-meetings/stats/overview?${params.toString()}`);
    return response.data;
  },
};
