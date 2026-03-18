import OpenAI from 'openai';
import { config } from '../config';
import { prisma } from '../config/database';
import { ConversationStatus, LeadSource, LeadPriority } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { circuitBreakers, CircuitBreakerError } from '../utils/circuitBreaker';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ExtractedData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  preferredCourse?: string;
  preferredCountry?: string;
  [key: string]: unknown;
}

const LEAD_COLLECTION_PROMPT = `You are a helpful education counselor chatbot. Your goal is to:
1. Greet the visitor warmly
2. Collect their information (name, email, phone number)
3. Understand their educational goals (preferred course, country)
4. Answer any questions about study abroad programs
5. Be helpful, professional, and encouraging

When you have collected sufficient information (at least name and contact), thank them and let them know a counselor will reach out.

Keep responses concise and conversational. Ask one question at a time.`;

export class OpenAIService {
  private client: OpenAI | null = null;

  constructor() {
    if (config.openai.apiKey) {
      this.client = new OpenAI({
        apiKey: config.openai.apiKey,
      });
    } else {
      console.warn('OpenAI API key not configured. AI features will be disabled.');
    }
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  async chat(sessionId: string, userMessage: string, organizationId: string) {
    if (!this.client) {
      throw new Error('OpenAI is not configured. Please set OPENAI_API_KEY in environment variables.');
    }

    // Get or create conversation
    let conversation = await prisma.chatbotConversation.findUnique({
      where: { sessionId },
    });

    if (!conversation) {
      conversation = await prisma.chatbotConversation.create({
        data: {
          organizationId,
          sessionId,
          messages: [],
          extractedData: {},
          status: ConversationStatus.ACTIVE,
        },
      });
    }

    // Build message history
    const messages: ChatMessage[] = [
      { role: 'system', content: LEAD_COLLECTION_PROMPT },
      ...((conversation.messages as unknown as ChatMessage[]) || []),
      { role: 'user', content: userMessage },
    ];

    // Get AI response with circuit breaker protection
    let assistantMessage: string;
    try {
      const completion = await circuitBreakers.openai.execute(() =>
        this.client!.chat.completions.create({
          model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
          messages,
          max_tokens: 500,
          temperature: 0.7,
        })
      );
      assistantMessage = completion.choices[0]?.message?.content || "I'm sorry, I couldn't process that. Could you please try again?";
    } catch (error) {
      if (error instanceof CircuitBreakerError) {
        console.warn(`[OpenAI] Circuit breaker OPEN for chat, returning fallback response`);
        assistantMessage = "I'm currently experiencing high demand. Please try again in a moment, or leave your contact information and we'll reach out to you.";
      } else {
        throw error;
      }
    }

    // Update conversation history
    const updatedMessages = [
      ...((conversation.messages as unknown as ChatMessage[]) || []),
      { role: 'user' as const, content: userMessage },
      { role: 'assistant' as const, content: assistantMessage },
    ];

    // Extract data from conversation
    const extractedData = await this.extractLeadData(updatedMessages);

    // Update conversation
    await prisma.chatbotConversation.update({
      where: { sessionId },
      data: {
        messages: JSON.parse(JSON.stringify(updatedMessages)),
        extractedData: JSON.parse(JSON.stringify({ ...((conversation.extractedData as ExtractedData) || {}), ...extractedData })),
        visitorName: extractedData.firstName
          ? `${extractedData.firstName} ${extractedData.lastName || ''}`.trim()
          : (conversation.visitorName || undefined),
        visitorEmail: extractedData.email || (conversation.visitorEmail || undefined),
        visitorPhone: extractedData.phone || (conversation.visitorPhone || undefined),
      },
    });

    return {
      message: assistantMessage,
      sessionId,
      extractedData,
    };
  }

  async extractLeadData(messages: ChatMessage[]): Promise<ExtractedData> {
    if (!this.client) {
      console.warn('[OpenAI] extractLeadData: Client not configured, returning empty data');
      return {};
    }

    const extractionPrompt = `Based on the following conversation, extract any lead information that was provided. Return a JSON object with the following fields (only include fields that were explicitly mentioned):
- firstName
- lastName
- email
- phone
- preferredCourse
- preferredCountry

Conversation:
${messages.filter((m) => m.role !== 'system').map((m) => `${m.role}: ${m.content}`).join('\n')}

Return only valid JSON, no explanations.`;

    try {
      const completion = await circuitBreakers.openai.execute(() =>
        this.client!.chat.completions.create({
          model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
          messages: [{ role: 'user', content: extractionPrompt }],
          max_tokens: 200,
          temperature: 0,
        })
      );

      const content = completion.choices[0]?.message?.content || '{}';
      return JSON.parse(content);
    } catch (error) {
      if (error instanceof CircuitBreakerError) {
        console.warn('[OpenAI] Circuit breaker OPEN for extractLeadData, returning empty data');
      } else {
        console.error('Failed to extract lead data:', error);
      }
      return {};
    }
  }

  async convertConversationToLead(sessionId: string) {
    const conversation = await prisma.chatbotConversation.findUnique({
      where: { sessionId },
    });

    if (!conversation) {
      console.warn(`[OpenAI] convertConversationToLead: No conversation found for sessionId=${sessionId}`);
      return null;
    }

    if (conversation.leadId) {
      console.info(`[OpenAI] convertConversationToLead: Lead already exists for sessionId=${sessionId}, leadId=${conversation.leadId}`);
      return null;
    }

    const data = conversation.extractedData as ExtractedData;

    if (!data.firstName || (!data.phone && !data.email)) {
      console.warn(`[OpenAI] convertConversationToLead: Insufficient data for sessionId=${sessionId} - firstName: ${!!data.firstName}, phone: ${!!data.phone}, email: ${!!data.email}`);
      return null;
    }

    // Create lead
    const lead = await prisma.lead.create({
      data: {
        organizationId: conversation.organizationId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone || 'N/A',
        source: LeadSource.CHATBOT,
        priority: LeadPriority.MEDIUM,
        customFields: {
          preferredCourse: data.preferredCourse,
          preferredCountry: data.preferredCountry,
          chatSessionId: sessionId,
        },
      },
    });

    // Update conversation
    await prisma.chatbotConversation.update({
      where: { sessionId },
      data: {
        leadId: lead.id,
        status: ConversationStatus.CONVERTED,
      },
    });

    return lead;
  }

  async transcribeAudio(audioBuffer: Buffer, format = 'webm'): Promise<string> {
    if (!this.client) {
      throw new Error('OpenAI is not configured');
    }

    const file = new File([audioBuffer], `audio.${format}`, {
      type: `audio/${format}`,
    });

    try {
      const transcription = await circuitBreakers.openai.execute(() =>
        this.client!.audio.transcriptions.create({
          file,
          model: process.env.OPENAI_STT_MODEL || 'whisper-1',
        })
      );
      return transcription.text;
    } catch (error) {
      if (error instanceof CircuitBreakerError) {
        console.warn('[OpenAI] Circuit breaker OPEN for transcribeAudio');
        throw new Error('Speech-to-text service is temporarily unavailable. Please try again later.');
      }
      throw error;
    }
  }

  async textToSpeech(text: string): Promise<Buffer> {
    if (!this.client) {
      throw new Error('OpenAI is not configured');
    }

    try {
      const mp3 = await circuitBreakers.openai.execute(() =>
        this.client!.audio.speech.create({
          model: process.env.TTS_MODEL || 'tts-1-hd',
          voice: 'alloy',
          input: text,
        })
      );
      const arrayBuffer = await mp3.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      if (error instanceof CircuitBreakerError) {
        console.warn('[OpenAI] Circuit breaker OPEN for textToSpeech');
        throw new Error('Text-to-speech service is temporarily unavailable. Please try again later.');
      }
      throw error;
    }
  }

  async voiceChat(sessionId: string, audioBuffer: Buffer, organizationId: string) {
    // Transcribe audio
    const userMessage = await this.transcribeAudio(audioBuffer);

    // Get chat response
    const chatResponse = await this.chat(sessionId, userMessage, organizationId);

    // Convert response to speech
    const audioResponse = await this.textToSpeech(chatResponse.message);

    return {
      transcription: userMessage,
      response: chatResponse.message,
      audio: audioResponse,
      sessionId,
      extractedData: chatResponse.extractedData,
    };
  }

  async generateAICallScript(leadInfo: { name: string; preferredCourse?: string; preferredCountry?: string }) {
    if (!this.client) {
      return 'Hello! This is a counselor calling. How can I help you today?';
    }

    const prompt = `Generate a natural phone call script for an education counselor calling a prospective student.

Student Info:
- Name: ${leadInfo.name}
- Preferred Course: ${leadInfo.preferredCourse || 'Not specified'}
- Preferred Country: ${leadInfo.preferredCountry || 'Not specified'}

The script should:
1. Introduce yourself as a counselor
2. Reference any information we have about them
3. Ask about their goals and timeline
4. Offer to help with the application process
5. Schedule a follow-up if interested

Keep it conversational and under 200 words.`;

    try {
      const completion = await circuitBreakers.openai.execute(() =>
        this.client!.chat.completions.create({
          model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 400,
        })
      );
      return completion.choices[0]?.message?.content || '';
    } catch (error) {
      if (error instanceof CircuitBreakerError) {
        console.warn('[OpenAI] Circuit breaker OPEN for generateAICallScript, returning default script');
        return `Hello ${leadInfo.name}! This is a counselor calling about your study abroad inquiry. How can I assist you today?`;
      }
      throw error;
    }
  }
}

export const openaiService = new OpenAIService();
