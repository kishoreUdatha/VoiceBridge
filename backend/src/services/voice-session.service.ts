/**
 * Voice Session Service - Single Responsibility Principle
 * Handles voice session lifecycle: start, process, end, transcripts
 */

import { VoiceSessionStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import { parseVariables, extractInstitutionContext, extractLeadContext, VariableContext } from '../utils/variableParser';
import { createLeadFromSession } from './voice-lead-integration.service';


const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

/**
 * Start a new voice session
 */
export async function startSession(agentId: string, visitorInfo?: {
  name?: string;
  email?: string;
  phone?: string;
  ip?: string;
  device?: string;
}) {
  const sessionToken = uuidv4();

  const session = await prisma.voiceSession.create({
    data: {
      agentId,
      sessionToken,
      visitorName: visitorInfo?.name,
      visitorEmail: visitorInfo?.email,
      visitorPhone: visitorInfo?.phone,
      visitorIp: visitorInfo?.ip,
      visitorDevice: visitorInfo?.device,
      status: 'ACTIVE',
    },
    include: {
      agent: {
        include: {
          organization: {
            select: { settings: true },
          },
        },
      },
    },
  });

  // Build variable context for greeting
  const variableContext: VariableContext = {
    lead: {
      firstName: visitorInfo?.name?.split(' ')[0],
      phone: visitorInfo?.phone,
      email: visitorInfo?.email,
    },
    institution: extractInstitutionContext((session.agent as any).organization?.settings),
  };

  // Parse variables in greeting
  const parsedGreeting = session.agent.greeting
    ? parseVariables(session.agent.greeting, variableContext)
    : session.agent.greeting;

  // Add greeting as first transcript
  if (parsedGreeting) {
    await addTranscript(session.id, 'assistant', parsedGreeting);
  }

  return {
    sessionId: session.id,
    sessionToken: session.sessionToken,
    greeting: parsedGreeting,
    agentName: session.agent.name,
  };
}

/**
 * Process user message and get AI response
 */
export async function processMessage(sessionId: string, userMessage: string): Promise<{
  response: string;
  audioBuffer?: Buffer;
  qualification?: any;
  shouldEnd?: boolean;
}> {
  const session = await prisma.voiceSession.findUnique({
    where: { id: sessionId },
    include: {
      agent: {
        include: {
          organization: {
            select: { settings: true },
          },
        },
      },
      transcripts: {
        orderBy: { timestamp: 'asc' },
        take: 20,
      },
      lead: true,
    },
  });

  if (!session) {
    throw new Error('Session not found');
  }

  // Save user message to transcript
  await addTranscript(sessionId, 'user', userMessage);

  // Build variable context from session data
  const variableContext: VariableContext = {
    lead: session.lead ? extractLeadContext(session.lead) : {
      firstName: session.visitorName?.split(' ')[0],
      phone: session.visitorPhone || undefined,
      email: session.visitorEmail || undefined,
    },
    institution: extractInstitutionContext((session.agent as any).organization?.settings),
  };

  // Build conversation history
  const messages: any[] = [
    {
      role: 'system',
      content: buildSystemPrompt(session.agent, variableContext),
    },
  ];

  // Add previous messages
  for (const transcript of session.transcripts) {
    messages.push({
      role: transcript.role as 'user' | 'assistant',
      content: transcript.content,
    });
  }

  // Add current user message
  messages.push({
    role: 'user',
    content: userMessage,
  });

  // Get AI response
  const completion = await openai!.chat.completions.create({
    model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
    messages,
    temperature: session.agent.temperature,
    max_tokens: 300,
  });

  const response = completion.choices[0]?.message?.content || session.agent.fallbackMessage || "I'm sorry, I couldn't process that.";

  // Save assistant response to transcript
  await addTranscript(sessionId, 'assistant', response);

  // Extract qualification data from conversation
  const qualification = await extractQualification(session, userMessage);
  if (Object.keys(qualification).length > 0) {
    await prisma.voiceSession.update({
      where: { id: sessionId },
      data: {
        qualification: {
          ...(session.qualification as object || {}),
          ...qualification,
        },
      },
    });
  }

  // Check if conversation should end
  const shouldEnd = checkShouldEnd(response, session);

  return {
    response,
    qualification,
    shouldEnd,
  };
}

/**
 * Build system prompt with context and variable parsing
 */
function buildSystemPrompt(agent: any, variableContext?: VariableContext): string {
  let prompt = agent.systemPrompt;

  // Parse variables in the system prompt
  if (variableContext) {
    prompt = parseVariables(prompt, variableContext);
  }

  // Add questions to collect
  if (agent.questions && (agent.questions as any[]).length > 0) {
    prompt += '\n\nYou should collect the following information during the conversation:\n';
    for (const q of agent.questions as any[]) {
      let questionText = q.question;
      if (variableContext) {
        questionText = parseVariables(questionText, variableContext);
      }
      prompt += `- ${questionText} (${q.required ? 'required' : 'optional'})\n`;
    }
  }

  // Add FAQs
  if (agent.faqs && (agent.faqs as any[]).length > 0) {
    prompt += '\n\nCommon FAQs:\n';
    for (const faq of agent.faqs as any[]) {
      let question = faq.question;
      let answer = faq.answer;
      if (variableContext) {
        question = parseVariables(question, variableContext);
        answer = parseVariables(answer, variableContext);
      }
      prompt += `Q: ${question}\nA: ${answer}\n\n`;
    }
  }

  // Add knowledge base
  if (agent.knowledgeBase) {
    let knowledge = agent.knowledgeBase;
    if (variableContext) {
      knowledge = parseVariables(knowledge, variableContext);
    }
    prompt += `\n\nAdditional Knowledge:\n${knowledge}`;
  }

  return prompt;
}

/**
 * Extract qualification data from message
 */
async function extractQualification(session: any, userMessage: string): Promise<any> {
  const questions = session.agent.questions as any[];
  if (!questions || questions.length === 0) {
    console.info(`[VoiceSession] extractQualification: No questions configured for session: ${session.id}`);
    return {};
  }

  try {
    const completion = await openai!.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Extract qualification data from the user's message. Return JSON only.
Fields to extract: ${questions.map((q: any) => q.field).join(', ')}
If a field is not mentioned, don't include it.`,
        },
        {
          role: 'user',
          content: userMessage,
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
    console.error('[VoiceSession] Extraction error:', error);
  }

  return {};
}

/**
 * Check if conversation should end
 */
function checkShouldEnd(response: string, _session: any): boolean {
  const endIndicators = [
    'goodbye',
    'thank you for your time',
    'have a great day',
    'talk to you soon',
    'end of conversation',
  ];

  const lowerResponse = response.toLowerCase();
  return endIndicators.some(indicator => lowerResponse.includes(indicator));
}

/**
 * Add transcript entry
 */
export async function addTranscript(sessionId: string, role: string, content: string, audioUrl?: string, duration?: number) {
  return await prisma.voiceTranscript.create({
    data: {
      sessionId,
      role,
      content,
      audioUrl,
      duration,
    },
  });
}

/**
 * End session
 */
export async function endSession(sessionId: string, status: VoiceSessionStatus = 'COMPLETED') {
  const session = await prisma.voiceSession.findUnique({
    where: { id: sessionId },
    include: {
      transcripts: true,
      agent: true,
    },
  });

  if (!session) {
    throw new Error('Session not found');
  }

  // Calculate duration
  const duration = Math.floor((Date.now() - session.startedAt.getTime()) / 1000);

  // Generate summary
  const summary = await generateSummary(session);

  // Analyze sentiment
  const sentiment = await analyzeSentiment(session);

  // Update session
  const updatedSession = await prisma.voiceSession.update({
    where: { id: sessionId },
    data: {
      status,
      duration,
      summary,
      sentiment,
      endedAt: new Date(),
    },
  });

  // Create lead if qualification data exists
  if (session.qualification && Object.keys(session.qualification as object).length > 0) {
    await createLeadFromSession({
      ...session,
      duration,
      summary,
      sentiment,
    });
  }

  return updatedSession;
}

/**
 * Generate conversation summary
 */
async function generateSummary(session: any): Promise<string> {
  try {
    const transcripts = session.transcripts
      .map((t: any) => `${t.role}: ${t.content}`)
      .join('\n');

    const completion = await openai!.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Summarize this conversation in 2-3 sentences. Focus on key points and outcomes.',
        },
        {
          role: 'user',
          content: transcripts,
        },
      ],
      temperature: 0.3,
      max_tokens: 150,
    });

    return completion.choices[0]?.message?.content || '';
  } catch (error) {
    return '';
  }
}

/**
 * Analyze conversation sentiment
 */
async function analyzeSentiment(session: any): Promise<string> {
  try {
    const userMessages = session.transcripts
      .filter((t: any) => t.role === 'user')
      .map((t: any) => t.content)
      .join(' ');

    const completion = await openai!.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Analyze the sentiment of these user messages. Reply with only one word: positive, neutral, or negative.',
        },
        {
          role: 'user',
          content: userMessages,
        },
      ],
      temperature: 0,
      max_tokens: 10,
    });

    return completion.choices[0]?.message?.content?.toLowerCase() || 'neutral';
  } catch (error) {
    return 'neutral';
  }
}

/**
 * Get session details
 */
export async function getSession(sessionId: string) {
  return await prisma.voiceSession.findUnique({
    where: { id: sessionId },
    include: {
      agent: true,
      transcripts: {
        orderBy: { timestamp: 'asc' },
      },
      lead: true,
    },
  });
}

/**
 * Get sessions for agent
 */
export async function getAgentSessions(agentId: string, limit: number = 50) {
  return await prisma.voiceSession.findMany({
    where: { agentId },
    include: {
      lead: true,
      _count: {
        select: { transcripts: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/**
 * Get analytics for agent
 */
export async function getAgentAnalytics(agentId: string, days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const sessions = await prisma.voiceSession.findMany({
    where: {
      agentId,
      createdAt: { gte: startDate },
    },
    select: {
      status: true,
      duration: true,
      sentiment: true,
      leadId: true,
    },
  });

  const totalSessions = sessions.length;
  const completedSessions = sessions.filter(s => s.status === 'COMPLETED').length;
  const convertedSessions = sessions.filter(s => s.leadId).length;
  const avgDuration = sessions.reduce((acc, s) => acc + (s.duration || 0), 0) / totalSessions || 0;

  const sentimentCounts = {
    positive: sessions.filter(s => s.sentiment === 'positive').length,
    neutral: sessions.filter(s => s.sentiment === 'neutral').length,
    negative: sessions.filter(s => s.sentiment === 'negative').length,
  };

  return {
    totalSessions,
    completedSessions,
    convertedSessions,
    conversionRate: totalSessions ? (convertedSessions / totalSessions * 100).toFixed(1) : 0,
    avgDuration: Math.round(avgDuration),
    sentimentCounts,
  };
}

export const voiceSessionService = {
  startSession,
  processMessage,
  addTranscript,
  endSession,
  getSession,
  getAgentSessions,
  getAgentAnalytics,
};

export default voiceSessionService;
