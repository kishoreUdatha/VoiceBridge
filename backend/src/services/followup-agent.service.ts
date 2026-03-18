/**
 * Follow-Up Agent Service - Single Responsibility Principle
 * Handles follow-up and lead nurturing conversations
 */

import { PrismaClient, AgentType } from '@prisma/client';
import OpenAI from 'openai';
import { AgentContext, AgentResponse } from './specialized-agent.types';

const prisma = new PrismaClient();

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

/**
 * Handle follow-up/nurturing conversation
 */
export async function handleConversation(context: AgentContext, userMessage: string): Promise<AgentResponse> {
  const agent = await prisma.voiceAgent.findUnique({
    where: { id: context.agentId },
  });

  if (!agent) throw new Error('Agent not found');

  // Get lead's history
  const lead = context.leadId ? await prisma.lead.findUnique({
    where: { id: context.leadId },
    include: {
      callLogs: { orderBy: { createdAt: 'desc' }, take: 5 },
      stage: true,
    },
  }) : null;

  const lastInteraction = lead?.callLogs?.[0]?.createdAt || lead?.updatedAt;
  const daysSinceLastContact = lastInteraction
    ? Math.floor((Date.now() - new Date(lastInteraction).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const systemPrompt = `You are ${agent.name}, a follow-up and nurturing agent.

YOUR ROLE:
- Re-engage leads who haven't responded
- Provide value through helpful information
- Understand why they went cold
- Reignite their interest
- Never be pushy or aggressive

LEAD CONTEXT:
- Name: ${context.firstName || 'Customer'}
- Days since last contact: ${daysSinceLastContact}
- Previous stage: ${lead?.stage?.name || 'Unknown'}

APPROACH:
${daysSinceLastContact < 7
  ? '- Gentle check-in, offer assistance'
  : daysSinceLastContact < 30
  ? '- Re-introduce yourself, share new offers/updates'
  : '- Win-back approach, ask what changed, offer incentive'}

CONVERSATION FLOW:
1. Warm greeting, acknowledge time gap
2. Ask how they're doing (genuine interest)
3. Share relevant value (news, offers, updates)
4. Gauge interest level
5. If interested, hand off to sales agent

When lead shows interest, include [INTERESTED:level] where level is hot/warm/cold.
When lead explicitly declines, include [DECLINED].
When suggesting sales conversation, include [HANDOFF:SALES].`;

  const messages: any[] = [
    { role: 'system', content: systemPrompt },
    ...context.conversationHistory,
    { role: 'user', content: userMessage },
  ];

  if (!openai) {
    return { message: 'AI service unavailable', shouldEnd: true };
  }

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
    messages,
    temperature: 0.8,
    max_tokens: 400,
  });

  const aiMessage = response.choices[0]?.message?.content || '';
  let cleanMessage = aiMessage;
  let action: string | undefined;
  let nextAgent: AgentType | undefined;

  // Parse interest level
  const interestMatch = aiMessage.match(/\[INTERESTED:(\w+)\]/);
  if (interestMatch) {
    action = 'interest_detected';
    cleanMessage = aiMessage.replace(/\[INTERESTED:\w+\]/, '').trim();

    // Note: Lead stage updates should be handled through proper stage management
    // to ensure correct stageId is used
  }

  // Parse handoff
  if (aiMessage.includes('[HANDOFF:SALES]')) {
    action = 'handoff';
    nextAgent = 'SALES';
    cleanMessage = aiMessage.replace('[HANDOFF:SALES]', '').trim();
  }

  // Parse decline
  if (aiMessage.includes('[DECLINED]')) {
    action = 'declined';
    cleanMessage = aiMessage.replace('[DECLINED]', '').trim();

    // Note: Lead stage updates should be handled through proper stage management
  }

  return {
    message: cleanMessage,
    action,
    nextAgent,
  };
}

/**
 * Execute follow-up sequence for a lead
 */
export async function executeFollowUpSequence(leadId: string, agentId: string): Promise<void> {
  const agent = await prisma.voiceAgent.findUnique({
    where: { id: agentId },
  });

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
  });

  if (!agent || !lead) return;

  const sequence = (agent.followupSequence as any[]) || [];

  for (const step of sequence) {
    const { dayOffset, channel, template } = step;

    // Schedule the follow-up
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + dayOffset);

    // Create scheduled task (this would integrate with a job queue)
    console.log(`[FollowUp] Scheduled ${channel} for lead ${leadId} on ${scheduledDate.toISOString()}`);
  }
}

export const followUpAgentService = {
  handleConversation,
  executeFollowUpSequence,
};

export default followUpAgentService;
