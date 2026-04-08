/**
 * Unified Inbox Service
 * Handles multi-channel communication inbox
 */

import api from './api';

export interface UnifiedMessage {
  id: string;
  channel: 'whatsapp' | 'email' | 'sms' | 'call' | 'chat';
  direction: 'inbound' | 'outbound';
  leadId?: string;
  leadName?: string;
  leadPhone?: string;
  leadEmail?: string;
  content: string;
  subject?: string;
  status: string;
  userId?: string;
  userName?: string;
  metadata?: {
    duration?: number;
    recordingUrl?: string;
    transcription?: string;
    mediaType?: string;
    mediaUrl?: string;
    opens?: number;
    clicks?: number;
  };
  createdAt: string;
  read: boolean;
}

export interface InboxStats {
  total: number;
  byChannel: Record<string, number>;
  byDirection: { inbound: number; outbound: number };
  todayCount: number;
  unreplied: number;
}

class UnifiedInboxService {
  /**
   * Get inbox messages
   */
  async getMessages(params?: {
    channel?: string;
    direction?: 'inbound' | 'outbound';
    leadId?: string;
    userId?: string;
    unreadOnly?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ messages: UnifiedMessage[]; total: number; unreadCount: number }> {
    const response = await api.get('/unified-inbox', { params });
    return {
      messages: response.data.data,
      total: response.data.total,
      unreadCount: response.data.unreadCount,
    };
  }

  /**
   * Get conversation for a lead
   */
  async getLeadConversation(leadId: string): Promise<UnifiedMessage[]> {
    const response = await api.get(`/unified-inbox/lead/${leadId}`);
    return response.data.data;
  }

  /**
   * Get inbox statistics
   */
  async getStats(): Promise<InboxStats> {
    const response = await api.get('/unified-inbox/stats');
    return response.data.data;
  }
}

export const unifiedInboxService = new UnifiedInboxService();
