/**
 * Live Chat Widget Service
 * Embeddable chat widget with bot + human handoff
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

export interface ChatMessage {
  id: string;
  sessionId: string;
  sender: 'visitor' | 'bot' | 'agent';
  content: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface ChatSession {
  id: string;
  organizationId: string;
  visitorId: string;
  visitorName?: string;
  visitorEmail?: string;
  visitorPhone?: string;
  status: 'active' | 'waiting' | 'closed';
  assignedAgentId?: string;
  leadId?: string;
  source: string;
  pageUrl?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface WidgetConfig {
  id: string;
  organizationId: string;
  name: string;
  primaryColor: string;
  greeting: string;
  offlineMessage: string;
  collectEmail: boolean;
  collectPhone: boolean;
  collectName: boolean;
  autoReply: boolean;
  autoReplyMessage: string;
  botEnabled: boolean;
  botGreeting: string;
  botFallbackMessage: string;
  businessHours: {
    enabled: boolean;
    timezone: string;
    schedule: { day: number; start: string; end: string }[];
  };
  position: 'bottom-right' | 'bottom-left';
  isActive: boolean;
}

// Simple bot responses for common queries
const BOT_RESPONSES: Record<string, string[]> = {
  greeting: [
    'Hello! How can I help you today?',
    'Hi there! What can I assist you with?',
    'Welcome! How may I help you?',
  ],
  pricing: [
    'Our pricing varies based on your needs. Would you like to speak with our team to get a custom quote?',
    'I can connect you with our sales team to discuss pricing. Would that work for you?',
  ],
  demo: [
    'I\'d be happy to arrange a demo for you! Could you share your email so our team can reach out?',
    'Great! Our team would love to show you a demo. Can I get your contact details?',
  ],
  hours: [
    'Our team is typically available Monday to Friday, 9 AM to 6 PM IST.',
    'We\'re open Mon-Fri, 9 AM - 6 PM IST. Outside these hours, leave a message and we\'ll get back to you!',
  ],
  contact: [
    'You can reach us at support@voicebridge.com or call +91 98765 43210.',
  ],
  thanks: [
    'You\'re welcome! Is there anything else I can help with?',
    'Happy to help! Let me know if you need anything else.',
  ],
  fallback: [
    'I\'m not sure I understand. Would you like me to connect you with a human agent?',
    'Let me get a team member to help you with that. One moment please.',
  ],
};

class LiveChatService {
  /**
   * Create or get widget configuration
   */
  async getOrCreateWidget(organizationId: string): Promise<WidgetConfig> {
    let widget = await prisma.chatWidget.findUnique({
      where: { organizationId },
    });

    if (!widget) {
      widget = await prisma.chatWidget.create({
        data: {
          organizationId,
          name: 'Support Chat',
          primaryColor: '#4F46E5',
          greeting: 'Hi! How can we help you today?',
          offlineMessage: 'We\'re currently offline. Leave a message and we\'ll get back to you.',
          collectEmail: true,
          collectPhone: true,
          collectName: true,
          autoReply: true,
          autoReplyMessage: 'Thanks for reaching out! Our team will respond shortly.',
          botEnabled: true,
          botGreeting: 'Hello! I\'m your virtual assistant. How can I help you today?',
          botFallbackMessage: 'Let me connect you with a human agent who can better assist you.',
          businessHours: {
            enabled: true,
            timezone: 'Asia/Kolkata',
            schedule: [
              { day: 1, start: '09:00', end: '18:00' },
              { day: 2, start: '09:00', end: '18:00' },
              { day: 3, start: '09:00', end: '18:00' },
              { day: 4, start: '09:00', end: '18:00' },
              { day: 5, start: '09:00', end: '18:00' },
            ],
          },
          position: 'bottom-right',
          isActive: true,
        },
      });
    }

    return widget as WidgetConfig;
  }

  /**
   * Update widget configuration
   */
  async updateWidget(organizationId: string, data: Partial<WidgetConfig>): Promise<WidgetConfig> {
    const widget = await prisma.chatWidget.upsert({
      where: { organizationId },
      update: data,
      create: {
        organizationId,
        ...data,
        name: data.name || 'Support Chat',
        primaryColor: data.primaryColor || '#4F46E5',
        greeting: data.greeting || 'Hi! How can we help you today?',
        offlineMessage: data.offlineMessage || 'We\'re offline. Leave a message!',
        collectEmail: data.collectEmail ?? true,
        collectPhone: data.collectPhone ?? true,
        collectName: data.collectName ?? true,
        autoReply: data.autoReply ?? true,
        autoReplyMessage: data.autoReplyMessage || 'Thanks! We\'ll respond shortly.',
        botEnabled: data.botEnabled ?? true,
        botGreeting: data.botGreeting || 'Hello! How can I help?',
        botFallbackMessage: data.botFallbackMessage || 'Let me connect you with an agent.',
        businessHours: data.businessHours || { enabled: false, timezone: 'Asia/Kolkata', schedule: [] },
        position: data.position || 'bottom-right',
        isActive: data.isActive ?? true,
      },
    });

    return widget as WidgetConfig;
  }

  /**
   * Generate embed code for widget
   */
  generateEmbedCode(organizationId: string, widgetId: string): string {
    const baseUrl = process.env.APP_URL || 'https://app.voicebridge.com';
    return `<!-- VoiceBridge Chat Widget -->
<script>
  (function(w,d,s,o,f,js,fjs){
    w['VoiceBridgeChat']=o;w[o]=w[o]||function(){(w[o].q=w[o].q||[]).push(arguments)};
    js=d.createElement(s);fjs=d.getElementsByTagName(s)[0];
    js.id=o;js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
  }(window,document,'script','vbc','${baseUrl}/widget.js'));
  vbc('init', '${widgetId}');
</script>
<!-- End VoiceBridge Chat Widget -->`;
  }

  /**
   * Start a new chat session
   */
  async startSession(data: {
    organizationId: string;
    visitorId: string;
    visitorName?: string;
    visitorEmail?: string;
    visitorPhone?: string;
    source: string;
    pageUrl?: string;
    metadata?: Record<string, any>;
  }): Promise<ChatSession> {
    // Check for existing active session
    let session = await prisma.chatSession.findFirst({
      where: {
        organizationId: data.organizationId,
        visitorId: data.visitorId,
        status: { in: ['active', 'waiting'] },
      },
    });

    if (session) {
      return session as ChatSession;
    }

    // Create new session
    session = await prisma.chatSession.create({
      data: {
        organizationId: data.organizationId,
        visitorId: data.visitorId,
        visitorName: data.visitorName,
        visitorEmail: data.visitorEmail,
        visitorPhone: data.visitorPhone,
        source: data.source,
        pageUrl: data.pageUrl,
        metadata: data.metadata || {},
        status: 'active',
      },
    });

    // Send bot greeting if enabled
    const widget = await this.getOrCreateWidget(data.organizationId);
    if (widget.botEnabled) {
      await this.addMessage({
        sessionId: session.id,
        sender: 'bot',
        content: widget.botGreeting,
      });
    }

    return session as ChatSession;
  }

  /**
   * Add message to chat session
   */
  async addMessage(data: {
    sessionId: string;
    sender: 'visitor' | 'bot' | 'agent';
    content: string;
    metadata?: Record<string, any>;
  }): Promise<ChatMessage> {
    const message = await prisma.chatMessage.create({
      data: {
        sessionId: data.sessionId,
        sender: data.sender,
        content: data.content,
        metadata: data.metadata || {},
      },
    });

    // Update session timestamp
    await prisma.chatSession.update({
      where: { id: data.sessionId },
      data: { updatedAt: new Date() },
    });

    return message as ChatMessage;
  }

  /**
   * Process visitor message and generate bot response
   */
  async processVisitorMessage(sessionId: string, content: string): Promise<ChatMessage[]> {
    const messages: ChatMessage[] = [];

    // Save visitor message
    const visitorMsg = await this.addMessage({
      sessionId,
      sender: 'visitor',
      content,
    });
    messages.push(visitorMsg);

    // Get session and widget config
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    const widget = await this.getOrCreateWidget(session.organizationId);

    // If bot is enabled and no agent assigned, generate bot response
    if (widget.botEnabled && !session.assignedAgentId) {
      const botResponse = this.generateBotResponse(content.toLowerCase());

      const botMsg = await this.addMessage({
        sessionId,
        sender: 'bot',
        content: botResponse.message,
        metadata: { intent: botResponse.intent, handoff: botResponse.handoff },
      });
      messages.push(botMsg);

      // Request human handoff if needed
      if (botResponse.handoff) {
        await this.requestHandoff(sessionId);
      }
    }

    return messages;
  }

  /**
   * Generate bot response based on message content
   */
  private generateBotResponse(content: string): { message: string; intent: string; handoff: boolean } {
    const lowerContent = content.toLowerCase();

    // Check for greeting
    if (lowerContent.match(/^(hi|hello|hey|good morning|good afternoon|good evening)/)) {
      return {
        message: this.randomResponse('greeting'),
        intent: 'greeting',
        handoff: false,
      };
    }

    // Check for pricing
    if (lowerContent.includes('price') || lowerContent.includes('cost') || lowerContent.includes('pricing')) {
      return {
        message: this.randomResponse('pricing'),
        intent: 'pricing',
        handoff: true,
      };
    }

    // Check for demo request
    if (lowerContent.includes('demo') || lowerContent.includes('trial') || lowerContent.includes('try')) {
      return {
        message: this.randomResponse('demo'),
        intent: 'demo',
        handoff: true,
      };
    }

    // Check for hours
    if (lowerContent.includes('hour') || lowerContent.includes('open') || lowerContent.includes('available')) {
      return {
        message: this.randomResponse('hours'),
        intent: 'hours',
        handoff: false,
      };
    }

    // Check for contact
    if (lowerContent.includes('contact') || lowerContent.includes('email') || lowerContent.includes('phone')) {
      return {
        message: this.randomResponse('contact'),
        intent: 'contact',
        handoff: false,
      };
    }

    // Check for thanks
    if (lowerContent.includes('thank') || lowerContent.includes('thanks')) {
      return {
        message: this.randomResponse('thanks'),
        intent: 'thanks',
        handoff: false,
      };
    }

    // Fallback - request handoff
    return {
      message: this.randomResponse('fallback'),
      intent: 'unknown',
      handoff: true,
    };
  }

  /**
   * Get random response from category
   */
  private randomResponse(category: string): string {
    const responses = BOT_RESPONSES[category] || BOT_RESPONSES.fallback;
    return responses[Math.floor(Math.random() * responses.length)];
  }

  /**
   * Request human agent handoff
   */
  async requestHandoff(sessionId: string): Promise<void> {
    const session = await prisma.chatSession.update({
      where: { id: sessionId },
      data: { status: 'waiting' },
      include: {
        organization: true,
      },
    });

    // Send notification to available agents
    try {
      // Get available agents (users with TELECALLER or ADMIN role in the organization)
      const availableAgents = await prisma.user.findMany({
        where: {
          organizationId: session.organizationId,
          role: { in: ['TELECALLER', 'ADMIN', 'MANAGER'] },
          isActive: true,
        },
        select: { id: true },
      });

      if (availableAgents.length > 0) {
        const { pushNotificationService } = await import('./push-notification.service');
        const agentIds = availableAgents.map(a => a.id);

        await pushNotificationService.sendToUsers(agentIds, {
          title: 'New Chat Request',
          body: `A visitor is waiting for assistance${session.visitorName ? ` - ${session.visitorName}` : ''}`,
          type: 'SYSTEM',
          data: {
            sessionId: session.id,
            action: 'CHAT_HANDOFF',
          },
        });
        console.log(`[LiveChat] Notified ${agentIds.length} agents about chat handoff request`);
      }
    } catch (notificationError) {
      console.error('[LiveChat] Failed to send agent notifications:', notificationError);
      // Don't fail the handoff request if notifications fail
    }
  }

  /**
   * Assign agent to chat session
   */
  async assignAgent(sessionId: string, agentId: string): Promise<ChatSession> {
    const session = await prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        assignedAgentId: agentId,
        status: 'active',
      },
    });

    // Add system message
    await this.addMessage({
      sessionId,
      sender: 'bot',
      content: 'An agent has joined the chat. How can we help you?',
      metadata: { type: 'system', event: 'agent_joined' },
    });

    return session as ChatSession;
  }

  /**
   * Close chat session
   */
  async closeSession(sessionId: string): Promise<ChatSession> {
    const session = await prisma.chatSession.update({
      where: { id: sessionId },
      data: { status: 'closed' },
    });

    return session as ChatSession;
  }

  /**
   * Convert chat session to lead
   */
  async convertToLead(sessionId: string): Promise<string> {
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: { messages: true },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    if (session.leadId) {
      return session.leadId;
    }

    // Create lead from chat session
    const lead = await prisma.lead.create({
      data: {
        organizationId: session.organizationId,
        firstName: session.visitorName || 'Chat Visitor',
        email: session.visitorEmail,
        phone: session.visitorPhone || 'Unknown',
        source: 'LIVE_CHAT',
        sourceDetails: `Chat session ${sessionId}`,
        customFields: {
          chatSessionId: sessionId,
          pageUrl: session.pageUrl,
        },
      },
    });

    // Update session with lead ID
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { leadId: lead.id },
    });

    // Add chat transcript as activity
    const transcript = (session.messages as any[])
      .map((m: any) => `[${m.sender}]: ${m.content}`)
      .join('\n');

    await prisma.activity.create({
      data: {
        leadId: lead.id,
        type: 'CHAT_TRANSCRIPT',
        content: transcript,
        metadata: { sessionId, messageCount: session.messages.length },
      },
    });

    return lead.id;
  }

  /**
   * Get chat sessions for organization
   */
  async getSessions(
    organizationId: string,
    options: { status?: string; limit?: number; offset?: number } = {}
  ): Promise<{ sessions: ChatSession[]; total: number }> {
    const where: any = { organizationId };
    if (options.status) {
      where.status = options.status;
    }

    const [sessions, total] = await Promise.all([
      prisma.chatSession.findMany({
        where,
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: options.limit || 50,
        skip: options.offset || 0,
      }),
      prisma.chatSession.count({ where }),
    ]);

    return { sessions: sessions as ChatSession[], total };
  }

  /**
   * Get messages for a session
   */
  async getMessages(sessionId: string): Promise<ChatMessage[]> {
    const messages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });

    return messages as ChatMessage[];
  }

  /**
   * Check if within business hours
   */
  isWithinBusinessHours(widget: WidgetConfig): boolean {
    if (!widget.businessHours?.enabled) {
      return true;
    }

    const now = new Date();
    // Convert to widget timezone (simplified - would use proper timezone library)
    const day = now.getDay();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const schedule = widget.businessHours.schedule.find((s) => s.day === day);
    if (!schedule) {
      return false;
    }

    return time >= schedule.start && time <= schedule.end;
  }

  /**
   * Get chat statistics
   */
  async getStats(organizationId: string, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [totalSessions, activeSessions, convertedLeads, avgResponseTime] = await Promise.all([
      prisma.chatSession.count({
        where: { organizationId, createdAt: { gte: since } },
      }),
      prisma.chatSession.count({
        where: { organizationId, status: { in: ['active', 'waiting'] } },
      }),
      prisma.chatSession.count({
        where: { organizationId, leadId: { not: null }, createdAt: { gte: since } },
      }),
      // Average response time would need more complex calculation
      Promise.resolve(45), // Mock: 45 seconds average
    ]);

    return {
      totalSessions,
      activeSessions,
      convertedLeads,
      conversionRate: totalSessions > 0 ? ((convertedLeads / totalSessions) * 100).toFixed(1) : 0,
      avgResponseTime,
    };
  }
}

export const liveChatService = new LiveChatService();
