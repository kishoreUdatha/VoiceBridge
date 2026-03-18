import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import { exotelService } from './exotel.service';
import { outboundCallService } from './outbound-call.service';

const prisma = new PrismaClient();

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

interface ConversationContext {
  leadId?: string;
  phone: string;
  channel: 'WHATSAPP' | 'SMS' | 'CALL';
  agentId: string;
  organizationId: string;
  history: Array<{ role: string; content: string; channel: string; timestamp: Date }>;
  qualification: Record<string, any>;
  lastInteraction: Date;
}

class HybridAgentService {
  // Get or create unified conversation context for a phone number
  async getConversationContext(
    phone: string,
    organizationId: string,
    channel: 'WHATSAPP' | 'SMS' | 'CALL'
  ): Promise<ConversationContext> {
    // Try to find existing lead
    const lead = await prisma.lead.findFirst({
      where: {
        organizationId,
        phone,
      },
      include: {
        whatsappLogs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        smsLogs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        callLogs: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    // Get default voice agent
    const agent = await prisma.voiceAgent.findFirst({
      where: { organizationId, isActive: true },
    });

    if (!agent) {
      throw new Error('No active voice agent found');
    }

    // Build conversation history from all channels
    const history: ConversationContext['history'] = [];

    if (lead) {
      // Add WhatsApp messages
      for (const msg of lead.whatsappLogs || []) {
        history.push({
          role: msg.direction === 'INBOUND' ? 'user' : 'assistant',
          content: msg.message,
          channel: 'WHATSAPP',
          timestamp: msg.createdAt,
        });
      }

      // Add SMS messages
      for (const sms of lead.smsLogs || []) {
        history.push({
          role: sms.direction === 'INBOUND' ? 'user' : 'assistant',
          content: sms.message,
          channel: 'SMS',
          timestamp: sms.createdAt,
        });
      }

      // Add call transcripts
      for (const call of lead.callLogs || []) {
        if (call.transcript) {
          history.push({
            role: 'system',
            content: `[Call Summary] ${call.notes || call.transcript}`,
            channel: 'CALL',
            timestamp: call.createdAt,
          });
        }
      }
    }

    // Sort by timestamp
    history.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return {
      leadId: lead?.id,
      phone,
      channel,
      agentId: agent.id,
      organizationId,
      history: history.slice(-20), // Keep last 20 messages for context
      qualification: (lead?.customFields as Record<string, any>) || {},
      lastInteraction: history.length > 0 ? history[history.length - 1].timestamp : new Date(),
    };
  }

  // Generate AI response based on unified context
  async generateResponse(
    context: ConversationContext,
    userMessage: string
  ): Promise<string> {
    const agent = await prisma.voiceAgent.findUnique({
      where: { id: context.agentId },
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    if (!openai) {
      throw new Error('OpenAI is not configured. Please set OPENAI_API_KEY.');
    }

    // Build system prompt
    const systemPrompt = this.buildHybridSystemPrompt(agent, context);

    // Build messages array
    const messages: any[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation history
    for (const msg of context.history) {
      if (msg.role !== 'system') {
        messages.push({
          role: msg.role,
          content: `[${msg.channel}] ${msg.content}`,
        });
      }
    }

    // Add current message
    messages.push({
      role: 'user',
      content: `[${context.channel}] ${userMessage}`,
    });

    // Generate response
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      messages,
      temperature: agent.temperature,
      max_tokens: context.channel === 'SMS' ? 160 : 500, // SMS has character limit
    });

    return completion.choices[0]?.message?.content ||
      agent.fallbackMessage ||
      "I'm sorry, I couldn't process your request. Please try again.";
  }

  // Build system prompt for hybrid conversations
  private buildHybridSystemPrompt(agent: any, context: ConversationContext): string {
    const questions = agent.questions as any[] || [];

    let prompt = `You are an AI assistant that can communicate across multiple channels. ${agent.systemPrompt}

CURRENT CHANNEL: ${context.channel}
${context.channel === 'SMS' ? 'IMPORTANT: Keep responses under 160 characters for SMS.' : ''}
${context.channel === 'WHATSAPP' ? 'You can use emojis sparingly for WhatsApp messages.' : ''}

CONVERSATION CONTEXT:
- You have access to the full conversation history across WhatsApp, SMS, and Phone calls
- Messages are prefixed with [CHANNEL] to show which channel they came from
- Maintain context continuity across all channels
- If the user switches channels, acknowledge it naturally

COLLECTED INFORMATION SO FAR:
${JSON.stringify(context.qualification, null, 2)}

QUALIFICATION QUESTIONS TO ASK:
`;

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const isCollected = context.qualification[q.field];
      prompt += `${i + 1}. ${q.question} (field: ${q.field})${isCollected ? ' [COLLECTED]' : q.required ? ' [REQUIRED]' : ''}\n`;
    }

    prompt += `
Ask questions naturally based on the flow of conversation.
Do NOT repeat questions that have already been answered.
`;

    return prompt;
  }

  // Send message via appropriate channel
  async sendMessage(
    context: ConversationContext,
    message: string,
    userId: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      switch (context.channel) {
        case 'WHATSAPP':
          return await this.sendWhatsApp(context, message, userId);

        case 'SMS':
          return await this.sendSMS(context, message, userId);

        case 'CALL':
          // For calls, we can't "send" a message - the call service handles TwiML
          return { success: true };

        default:
          return { success: false, error: 'Unknown channel' };
      }
    } catch (error) {
      console.error(`Error sending ${context.channel} message:`, error);
      return { success: false, error: (error as Error).message };
    }
  }

  // Send WhatsApp message
  private async sendWhatsApp(
    context: ConversationContext,
    message: string,
    userId: string
  ): Promise<{ success: boolean; messageId?: string }> {
    // Create log entry first
    const logEntry = await prisma.whatsappLog.create({
      data: {
        leadId: context.leadId,
        userId,
        phone: context.phone,
        message,
        direction: 'OUTBOUND',
        status: 'PENDING',
      },
    });

    try {
      const result = await exotelService.sendWhatsApp({ to: context.phone, message });

      await prisma.whatsappLog.update({
        where: { id: logEntry.id },
        data: {
          status: 'SENT',
          providerMsgId: result?.messageId,
          sentAt: new Date(),
        },
      });

      return { success: true, messageId: logEntry.id };
    } catch (error) {
      await prisma.whatsappLog.update({
        where: { id: logEntry.id },
        data: { status: 'FAILED' },
      });
      throw error;
    }
  }

  // Send SMS message
  private async sendSMS(
    context: ConversationContext,
    message: string,
    userId: string
  ): Promise<{ success: boolean; messageId?: string }> {
    // Create log entry first
    const logEntry = await prisma.smsLog.create({
      data: {
        leadId: context.leadId,
        userId,
        phone: context.phone,
        message,
        direction: 'OUTBOUND',
        status: 'PENDING',
      },
    });

    try {
      const result = await exotelService.sendSMS({ to: context.phone, body: message });

      await prisma.smsLog.update({
        where: { id: logEntry.id },
        data: {
          status: 'SENT',
          providerMsgId: result?.messageSid,
          sentAt: new Date(),
        },
      });

      return { success: true, messageId: logEntry.id };
    } catch (error) {
      await prisma.smsLog.update({
        where: { id: logEntry.id },
        data: { status: 'FAILED' },
      });
      throw error;
    }
  }

  // Switch channel for a conversation
  async switchChannel(
    context: ConversationContext,
    newChannel: 'WHATSAPP' | 'SMS' | 'CALL',
    userId: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    if (context.channel === newChannel) {
      return { success: true, message: 'Already on this channel' };
    }

    const oldChannel = context.channel;
    context.channel = newChannel;

    // Send notification on old channel about switch
    const switchMessage = newChannel === 'CALL'
      ? "I'll call you shortly to continue our conversation."
      : `Let's continue our conversation on ${newChannel}. I'll message you there.`;

    await this.sendMessage({ ...context, channel: oldChannel }, switchMessage, userId);

    // If switching to call, initiate the call
    if (newChannel === 'CALL') {
      try {
        await outboundCallService.makeCall({
          agentId: context.agentId,
          phone: context.phone,
          leadId: context.leadId,
          contactName: undefined,
        });
        return { success: true, message: 'Call initiated' };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    }

    // Send greeting on new channel
    const greetingMessage = `Continuing from our ${oldChannel} conversation. How can I help you?`;
    await this.sendMessage(context, greetingMessage, userId);

    return { success: true, message: `Switched to ${newChannel}` };
  }

  // Handle incoming message from any channel
  async handleIncomingMessage(data: {
    phone: string;
    message: string;
    channel: 'WHATSAPP' | 'SMS';
    organizationId: string;
    userId?: string;
  }): Promise<{ response: string; leadId?: string }> {
    // Get or create context
    const context = await this.getConversationContext(
      data.phone,
      data.organizationId,
      data.channel
    );

    // Generate AI response
    const response = await this.generateResponse(context, data.message);

    // Extract any qualification data
    const qualification = await this.extractQualificationFromMessage(
      data.message,
      context.agentId
    );

    // Update lead with new qualification data
    if (context.leadId && Object.keys(qualification).length > 0) {
      await prisma.lead.update({
        where: { id: context.leadId },
        data: {
          customFields: {
            ...context.qualification,
            ...qualification,
          },
        },
      });
    }

    // Create or update lead if we don't have one
    let leadId = context.leadId;
    if (!leadId && Object.keys(qualification).length > 0) {
      const lead = await prisma.lead.create({
        data: {
          organizationId: data.organizationId,
          firstName: qualification.name || qualification.firstName || 'Unknown',
          phone: data.phone,
          email: qualification.email,
          source: 'CHATBOT',
          sourceDetails: `Hybrid Agent - ${data.channel}`,
          customFields: qualification,
        },
      });
      leadId = lead.id;
    }

    // Send the response
    if (data.userId) {
      await this.sendMessage({ ...context, leadId }, response, data.userId);
    }

    return { response, leadId };
  }

  // Extract qualification data from message
  private async extractQualificationFromMessage(
    message: string,
    agentId: string
  ): Promise<Record<string, any>> {
    const agent = await prisma.voiceAgent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      console.warn(`[HybridAgent] extractQualification: Agent not found: ${agentId}`);
      return {};
    }

    const questions = agent.questions as any[] || [];
    if (questions.length === 0) {
      console.info(`[HybridAgent] extractQualification: No questions configured for agent: ${agentId}`);
      return {};
    }

    if (!openai) {
      console.warn('[HybridAgent] extractQualification: OpenAI is not configured');
      return {};
    }

    try {
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Extract qualification data from the message. Return JSON only.
Fields to extract: ${questions.map((q: any) => q.field).join(', ')}
If a field is not mentioned, don't include it.`,
          },
          {
            role: 'user',
            content: message,
          },
        ],
        temperature: 0,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content;
      if (content) {
        return JSON.parse(content);
      }
    } catch (error) {
      console.error('Qualification extraction error:', error);
    }

    return {};
  }

  // Get unified conversation history for a phone number
  async getUnifiedHistory(
    phone: string,
    organizationId: string
  ): Promise<Array<{
    id: string;
    channel: string;
    direction: string;
    message: string;
    timestamp: Date;
    status: string;
  }>> {
    const lead = await prisma.lead.findFirst({
      where: { organizationId, phone },
    });

    if (!lead) {
      console.info(`[HybridAgent] getUnifiedHistory: No lead found for phone: ${phone} in org: ${organizationId}`);
      return [];
    }

    // Get all communications
    const [whatsapp, sms, calls] = await Promise.all([
      prisma.whatsappLog.findMany({
        where: { leadId: lead.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.smsLog.findMany({
        where: { leadId: lead.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.callLog.findMany({
        where: { leadId: lead.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    const history: Array<{
      id: string;
      channel: string;
      direction: string;
      message: string;
      timestamp: Date;
      status: string;
    }> = [];

    for (const w of whatsapp) {
      history.push({
        id: w.id,
        channel: 'WHATSAPP',
        direction: w.direction,
        message: w.message,
        timestamp: w.createdAt,
        status: w.status,
      });
    }

    for (const s of sms) {
      history.push({
        id: s.id,
        channel: 'SMS',
        direction: s.direction,
        message: s.message,
        timestamp: s.createdAt,
        status: s.status,
      });
    }

    for (const c of calls) {
      history.push({
        id: c.id,
        channel: 'CALL',
        direction: c.direction,
        message: c.notes || `Call - ${c.status} - ${c.duration || 0}s`,
        timestamp: c.createdAt,
        status: c.status,
      });
    }

    // Sort by timestamp
    history.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return history;
  }
}

export const hybridAgentService = new HybridAgentService();
