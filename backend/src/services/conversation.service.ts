import { PrismaClient, ConversationChannel, ConversationState, MessageDirection, MessageContentType, MessageDeliveryStatus, SenderType } from '@prisma/client';
import { AppError } from '../utils/errors';

const prisma = new PrismaClient();

interface CreateConversationParams {
  organizationId: string;
  leadId?: string;
  contactPhone?: string;
  contactEmail?: string;
  channel: ConversationChannel;
  subject?: string;
  customFields?: any;
}

interface AddMessageParams {
  conversationId: string;
  direction: MessageDirection;
  content: string;
  contentType?: MessageContentType;
  externalId?: string;
  senderType?: SenderType;
  senderId?: string;
  senderName?: string;
}

interface UpdateMessageStatusParams {
  messageId: string;
  status: MessageDeliveryStatus;
  externalId?: string;
  errorCode?: string;
  errorMessage?: string;
}

class ConversationService {
  /**
   * Create or find existing conversation
   */
  async getOrCreateConversation(params: CreateConversationParams) {
    const { organizationId, leadId, contactPhone, contactEmail, channel, subject, customFields } = params;

    // Try to find existing open conversation
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        organizationId,
        channel,
        status: { in: ['OPEN', 'PENDING'] },
        OR: [
          leadId ? { leadId } : {},
          contactPhone ? { contactPhone } : {},
          contactEmail ? { contactEmail } : {},
        ].filter(c => Object.keys(c).length > 0),
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    if (existingConversation) {
      return existingConversation;
    }

    // Create new conversation
    const conversation = await prisma.conversation.create({
      data: {
        organizationId,
        leadId,
        contactPhone,
        contactEmail,
        channel,
        subject,
        customFields: customFields || {},
        status: 'OPEN',
      },
    });

    return conversation;
  }

  /**
   * Get conversation by ID
   */
  async getConversationById(id: string, organizationId: string) {
    const conversation = await prisma.conversation.findFirst({
      where: { id, organizationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 50,
        },
      },
    });

    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    return conversation;
  }

  /**
   * List conversations for organization
   */
  async getConversations(
    organizationId: string,
    options: {
      channel?: ConversationChannel;
      status?: ConversationState;
      assignedToId?: string;
      leadId?: string;
      search?: string;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const { channel, status, assignedToId, leadId, search, page = 1, limit = 20 } = options;

    const where: any = { organizationId };
    if (channel) where.channel = channel;
    if (status) where.status = status;
    if (assignedToId) where.assignedToId = assignedToId;
    if (leadId) where.leadId = leadId;
    if (search) {
      where.OR = [
        { contactPhone: { contains: search } },
        { contactEmail: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { lastMessageAt: 'desc' },
      }),
      prisma.conversation.count({ where }),
    ]);

    return {
      data: conversations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Add message to conversation
   */
  async addMessage(params: AddMessageParams) {
    const { conversationId, direction, content, contentType = 'TEXT', externalId, senderType, senderId, senderName } = params;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    // Determine sender type based on direction
    const actualSenderType = senderType || (direction === 'OUTBOUND' ? 'SYSTEM' : 'CUSTOMER');

    const message = await prisma.conversationMessage.create({
      data: {
        conversation: { connect: { id: conversationId } },
        direction,
        content,
        contentType,
        externalId,
        senderType: actualSenderType,
        senderId,
        senderName,
        status: direction === 'OUTBOUND' ? 'PENDING' : 'DELIVERED',
        sentAt: direction === 'OUTBOUND' ? new Date() : undefined,
        deliveredAt: direction === 'INBOUND' ? new Date() : undefined,
      },
    });

    // Update conversation
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
        messageCount: { increment: 1 },
        lastMessageType: direction,
        status: conversation.status === 'CLOSED' ? 'OPEN' : conversation.status,
      },
    });

    // Create initial status update
    await prisma.messageStatusUpdate.create({
      data: {
        messageId: message.id,
        status: message.status,
      },
    });

    return message;
  }

  /**
   * Get messages in conversation
   */
  async getMessages(
    conversationId: string,
    organizationId: string,
    options: {
      page?: number;
      limit?: number;
      before?: string;
      after?: string;
    } = {}
  ) {
    const { page = 1, limit = 50, before, after } = options;

    // Verify conversation belongs to org
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, organizationId },
    });
    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    const where: any = { conversationId };
    if (before) {
      where.createdAt = { lt: new Date(before) };
    }
    if (after) {
      where.createdAt = { gt: new Date(after) };
    }

    const [messages, total] = await Promise.all([
      prisma.conversationMessage.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          statusUpdates: {
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
        },
      }),
      prisma.conversationMessage.count({ where }),
    ]);

    return {
      data: messages.reverse(),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update message status
   */
  async updateMessageStatus(params: UpdateMessageStatusParams) {
    const { messageId, status, externalId, errorCode, errorMessage } = params;

    const message = await prisma.conversationMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new AppError('Message not found', 404);
    }

    // Update message status
    const updateData: any = { status };
    if (status === 'DELIVERED') updateData.deliveredAt = new Date();
    if (status === 'READ') updateData.readAt = new Date();
    if (status === 'FAILED') {
      updateData.failedAt = new Date();
      updateData.errorCode = errorCode;
      updateData.errorMessage = errorMessage;
    }
    if (externalId) updateData.externalId = externalId;

    const updatedMessage = await prisma.conversationMessage.update({
      where: { id: messageId },
      data: updateData,
    });

    // Record status update
    const statusUpdate = await prisma.messageStatusUpdate.create({
      data: {
        messageId,
        status,
        errorCode,
        errorMessage,
      },
    });

    return { message: updatedMessage, statusUpdate };
  }

  /**
   * Update conversation status
   */
  async updateConversation(
    id: string,
    organizationId: string,
    data: {
      status?: ConversationState;
      priority?: string;
      assignedToId?: string;
      subject?: string;
      tags?: string[];
    }
  ) {
    const conversation = await prisma.conversation.findFirst({
      where: { id, organizationId },
    });

    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    const updateData: any = {};
    if (data.status) {
      updateData.status = data.status;
      if (data.status === 'RESOLVED') updateData.resolvedAt = new Date();
    }
    if (data.priority) updateData.priority = data.priority;
    if (data.assignedToId) updateData.assignedToId = data.assignedToId;
    if (data.subject) updateData.subject = data.subject;
    if (data.tags) updateData.tags = data.tags;

    const updated = await prisma.conversation.update({
      where: { id },
      data: updateData,
    });

    return updated;
  }

  /**
   * Assign conversation to user
   */
  async assignConversation(id: string, organizationId: string, assignedToId: string) {
    const conversation = await prisma.conversation.findFirst({
      where: { id, organizationId },
    });

    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    const updated = await prisma.conversation.update({
      where: { id },
      data: { assignedToId },
    });

    return updated;
  }

  /**
   * Close conversation
   */
  async closeConversation(id: string, organizationId: string, resolution?: string) {
    const conversation = await prisma.conversation.findFirst({
      where: { id, organizationId },
    });

    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    const updated = await prisma.conversation.update({
      where: { id },
      data: {
        status: 'CLOSED',
        resolution,
      },
    });

    return updated;
  }

  /**
   * Get conversation stats
   */
  async getConversationStats(organizationId: string, dateRange?: { start: Date; end: Date }) {
    const where: any = { organizationId };
    if (dateRange) {
      where.createdAt = {
        gte: dateRange.start,
        lte: dateRange.end,
      };
    }

    const [
      total,
      open,
      pending,
      closed,
      resolved,
      byChannel,
    ] = await Promise.all([
      prisma.conversation.count({ where }),
      prisma.conversation.count({ where: { ...where, status: 'OPEN' } }),
      prisma.conversation.count({ where: { ...where, status: 'PENDING' } }),
      prisma.conversation.count({ where: { ...where, status: 'CLOSED' } }),
      prisma.conversation.count({ where: { ...where, status: 'RESOLVED' } }),
      prisma.conversation.groupBy({
        by: ['channel'],
        where,
        _count: { id: true },
      }),
    ]);

    return {
      total,
      open,
      pending,
      closed,
      resolved,
      byChannel: byChannel.reduce((acc, c) => {
        acc[c.channel] = c._count.id;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  /**
   * Find message by external ID
   */
  async findMessageByExternalId(externalId: string) {
    const message = await prisma.conversationMessage.findFirst({
      where: { externalId },
      include: {
        conversation: true,
      },
    });

    return message;
  }
}

export const conversationService = new ConversationService();
