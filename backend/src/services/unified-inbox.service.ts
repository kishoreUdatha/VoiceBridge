/**
 * Unified Inbox Service
 * Aggregates communications from all channels: WhatsApp, Email, SMS, Calls, Chat
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
  metadata?: any;
  createdAt: Date;
  read: boolean;
}

class UnifiedInboxService {
  /**
   * Get unified inbox messages
   */
  async getInboxMessages(
    organizationId: string,
    options: {
      channel?: string;
      direction?: 'inbound' | 'outbound';
      leadId?: string;
      userId?: string;
      unreadOnly?: boolean;
      searchQuery?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ messages: UnifiedMessage[]; total: number; unreadCount: number }> {
    const { channel, direction, leadId, userId, unreadOnly, searchQuery, limit = 50, offset = 0 } = options;

    const messages: UnifiedMessage[] = [];
    let whereClause: any = { organizationId };

    // Fetch WhatsApp messages
    if (!channel || channel === 'whatsapp') {
      try {
        const whatsappMessages = await prisma.whatsAppMessage.findMany({
          where: {
            ...whereClause,
            ...(leadId && { leadId }),
            ...(direction === 'inbound' && { direction: 'INBOUND' }),
            ...(direction === 'outbound' && { direction: 'OUTBOUND' }),
          },
          include: {
            lead: { select: { id: true, name: true, phone: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
        });

        messages.push(
          ...whatsappMessages.map(msg => ({
            id: `whatsapp_${msg.id}`,
            channel: 'whatsapp' as const,
            direction: msg.direction === 'INBOUND' ? ('inbound' as const) : ('outbound' as const),
            leadId: msg.leadId || undefined,
            leadName: msg.lead?.name || undefined,
            leadPhone: msg.lead?.phone || msg.to || msg.from,
            leadEmail: msg.lead?.email || undefined,
            content: msg.body || msg.mediaUrl || '[Media]',
            status: msg.status,
            metadata: { mediaType: msg.mediaType, mediaUrl: msg.mediaUrl },
            createdAt: msg.createdAt,
            read: true,
          }))
        );
      } catch (e) {
        console.log('WhatsApp messages not available');
      }
    }

    // Fetch Email messages
    if (!channel || channel === 'email') {
      try {
        const emailMessages = await prisma.emailTracking.findMany({
          where: {
            ...whereClause,
            ...(leadId && { leadId }),
          },
          include: {
            lead: { select: { id: true, name: true, phone: true, email: true } },
          },
          orderBy: { sentAt: 'desc' },
          take: limit,
        });

        messages.push(
          ...emailMessages.map(msg => ({
            id: `email_${msg.id}`,
            channel: 'email' as const,
            direction: 'outbound' as const,
            leadId: msg.leadId || undefined,
            leadName: msg.lead?.name || undefined,
            leadPhone: msg.lead?.phone || undefined,
            leadEmail: msg.toEmail,
            content: msg.subject,
            subject: msg.subject,
            status: msg.status,
            metadata: { opens: msg.opens, clicks: msg.clicks },
            createdAt: msg.sentAt,
            read: true,
          }))
        );
      } catch (e) {
        console.log('Email tracking not available');
      }
    }

    // Fetch SMS messages
    if (!channel || channel === 'sms') {
      try {
        const smsMessages = await prisma.sMSMessage.findMany({
          where: {
            ...whereClause,
            ...(leadId && { leadId }),
            ...(direction === 'inbound' && { direction: 'INBOUND' }),
            ...(direction === 'outbound' && { direction: 'OUTBOUND' }),
          },
          include: {
            lead: { select: { id: true, name: true, phone: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
        });

        messages.push(
          ...smsMessages.map(msg => ({
            id: `sms_${msg.id}`,
            channel: 'sms' as const,
            direction: msg.direction === 'INBOUND' ? ('inbound' as const) : ('outbound' as const),
            leadId: msg.leadId || undefined,
            leadName: msg.lead?.name || undefined,
            leadPhone: msg.lead?.phone || msg.to || msg.from,
            leadEmail: msg.lead?.email || undefined,
            content: msg.body,
            status: msg.status,
            createdAt: msg.createdAt,
            read: true,
          }))
        );
      } catch (e) {
        console.log('SMS messages not available');
      }
    }

    // Fetch Call logs
    if (!channel || channel === 'call') {
      try {
        const callLogs = await prisma.callLog.findMany({
          where: {
            ...whereClause,
            ...(leadId && { leadId }),
            ...(userId && { userId }),
          },
          include: {
            lead: { select: { id: true, name: true, phone: true, email: true } },
            user: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
        });

        messages.push(
          ...callLogs.map(call => ({
            id: `call_${call.id}`,
            channel: 'call' as const,
            direction: call.direction === 'INBOUND' ? ('inbound' as const) : ('outbound' as const),
            leadId: call.leadId || undefined,
            leadName: call.lead?.name || undefined,
            leadPhone: call.lead?.phone || call.toNumber || call.fromNumber,
            leadEmail: call.lead?.email || undefined,
            content: call.notes || `${call.direction} call - ${call.duration || 0}s`,
            status: call.status,
            userId: call.userId || undefined,
            userName: call.user ? `${call.user.firstName} ${call.user.lastName}` : undefined,
            metadata: {
              duration: call.duration,
              recordingUrl: call.recordingUrl,
              transcription: call.transcription,
            },
            createdAt: call.createdAt,
            read: true,
          }))
        );
      } catch (e) {
        console.log('Call logs not available');
      }
    }

    // Fetch Chat messages (from live chat widget)
    if (!channel || channel === 'chat') {
      try {
        const chatMessages = await prisma.liveChatMessage.findMany({
          where: {
            session: { organizationId },
            ...(leadId && { session: { leadId } }),
          },
          include: {
            session: {
              include: {
                lead: { select: { id: true, name: true, phone: true, email: true } },
              },
            },
            user: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
        });

        messages.push(
          ...chatMessages.map(msg => ({
            id: `chat_${msg.id}`,
            channel: 'chat' as const,
            direction: msg.senderType === 'VISITOR' ? ('inbound' as const) : ('outbound' as const),
            leadId: msg.session.leadId || undefined,
            leadName: msg.session.lead?.name || msg.session.visitorName || 'Visitor',
            leadPhone: msg.session.lead?.phone || undefined,
            leadEmail: msg.session.lead?.email || msg.session.visitorEmail || undefined,
            content: msg.content,
            status: 'delivered',
            userId: msg.userId || undefined,
            userName: msg.user ? `${msg.user.firstName} ${msg.user.lastName}` : undefined,
            createdAt: msg.createdAt,
            read: msg.readAt !== null,
          }))
        );
      } catch (e) {
        console.log('Live chat messages not available');
      }
    }

    // Sort all messages by date
    messages.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply search filter
    let filteredMessages = messages;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredMessages = messages.filter(
        msg =>
          msg.content?.toLowerCase().includes(query) ||
          msg.leadName?.toLowerCase().includes(query) ||
          msg.leadPhone?.includes(query) ||
          msg.leadEmail?.toLowerCase().includes(query)
      );
    }

    // Apply unread filter
    if (unreadOnly) {
      filteredMessages = filteredMessages.filter(msg => !msg.read);
    }

    // Apply pagination
    const paginatedMessages = filteredMessages.slice(offset, offset + limit);
    const unreadCount = filteredMessages.filter(msg => !msg.read).length;

    return {
      messages: paginatedMessages,
      total: filteredMessages.length,
      unreadCount,
    };
  }

  /**
   * Get conversation thread for a lead
   */
  async getLeadConversation(
    organizationId: string,
    leadId: string
  ): Promise<UnifiedMessage[]> {
    const { messages } = await this.getInboxMessages(organizationId, {
      leadId,
      limit: 100,
    });

    return messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  /**
   * Get inbox statistics
   */
  async getInboxStats(organizationId: string): Promise<{
    total: number;
    byChannel: Record<string, number>;
    byDirection: { inbound: number; outbound: number };
    todayCount: number;
    unreplied: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { messages } = await this.getInboxMessages(organizationId, { limit: 1000 });

    const byChannel: Record<string, number> = {
      whatsapp: 0,
      email: 0,
      sms: 0,
      call: 0,
      chat: 0,
    };

    let inbound = 0;
    let outbound = 0;
    let todayCount = 0;

    messages.forEach(msg => {
      byChannel[msg.channel] = (byChannel[msg.channel] || 0) + 1;
      if (msg.direction === 'inbound') inbound++;
      else outbound++;
      if (msg.createdAt >= today) todayCount++;
    });

    // Find unreplied (inbound messages without subsequent outbound)
    const leadLastInbound: Record<string, Date> = {};
    const leadLastOutbound: Record<string, Date> = {};

    messages.forEach(msg => {
      if (!msg.leadId) return;
      if (msg.direction === 'inbound') {
        if (!leadLastInbound[msg.leadId] || msg.createdAt > leadLastInbound[msg.leadId]) {
          leadLastInbound[msg.leadId] = msg.createdAt;
        }
      } else {
        if (!leadLastOutbound[msg.leadId] || msg.createdAt > leadLastOutbound[msg.leadId]) {
          leadLastOutbound[msg.leadId] = msg.createdAt;
        }
      }
    });

    let unreplied = 0;
    Object.keys(leadLastInbound).forEach(leadId => {
      if (!leadLastOutbound[leadId] || leadLastInbound[leadId] > leadLastOutbound[leadId]) {
        unreplied++;
      }
    });

    return {
      total: messages.length,
      byChannel,
      byDirection: { inbound, outbound },
      todayCount,
      unreplied,
    };
  }
}

export const unifiedInboxService = new UnifiedInboxService();
