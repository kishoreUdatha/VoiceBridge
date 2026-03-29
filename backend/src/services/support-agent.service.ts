/**
 * Support Agent Service - Single Responsibility Principle
 * Handles customer support conversations with RAG-powered knowledge retrieval
 */

import { prisma } from '../config/database';
import OpenAI from 'openai';
import { AgentContext, AgentResponse, SupportTicket } from './specialized-agent.types';
import { ragService } from './rag.service';


const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

/**
 * Handle support conversation with RAG-powered knowledge retrieval
 */
export async function handleConversation(context: AgentContext, userMessage: string): Promise<AgentResponse> {
  const agent = await prisma.voiceAgent.findUnique({
    where: { id: context.agentId },
  });

  if (!agent) throw new Error('Agent not found');

  const ticketCategories = (agent.ticketCategories as string[]) || [];
  const escalationRules = (agent.escalationRules as any[]) || [];

  // Use RAG to retrieve relevant knowledge instead of full knowledge base
  let relevantKnowledge = '';
  try {
    const ragSettings = (agent.ragSettings as any) || {};
    const topK = ragSettings.topK || 5;
    const similarityThreshold = ragSettings.similarityThreshold || 0.5;

    // Check if agent has indexed knowledge
    const indexStatus = await ragService.getIndexStatus(context.agentId);

    if (indexStatus.indexed && indexStatus.totalChunks > 0) {
      // Use RAG retrieval
      const results = await ragService.hybridSearch(context.agentId, userMessage, {
        topK,
        similarityThreshold,
      });

      if (results.length > 0) {
        relevantKnowledge = ragService.buildContextFromResults(results, 2000);
        console.log(`[Support] RAG retrieved ${results.length} relevant chunks for query`);
      }
    } else {
      // Fallback to full knowledge base if not indexed
      const knowledgeBase = agent.knowledgeBase || '';
      const faqs = (agent.faqs as any[]) || [];

      relevantKnowledge = knowledgeBase;
      if (faqs.length > 0) {
        relevantKnowledge += '\n\nFAQS:\n' + faqs.map((f: any) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n');
      }
      console.log(`[Support] Using full knowledge base (not indexed)`);
    }
  } catch (error) {
    console.error('[Support] RAG retrieval error, falling back to full knowledge:', error);
    // Fallback to full knowledge base on error
    relevantKnowledge = agent.knowledgeBase || '';
    const faqs = (agent.faqs as any[]) || [];
    if (faqs.length > 0) {
      relevantKnowledge += '\n\nFAQS:\n' + faqs.map((f: any) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n');
    }
  }

  const systemPrompt = `You are ${agent.name}, a customer support agent.

YOUR ROLE:
- Help customers with their queries and issues
- Provide accurate information from the knowledge base
- Create support tickets for complex issues
- Escalate to human agents when needed

RELEVANT KNOWLEDGE (retrieved based on customer's query):
${relevantKnowledge || 'No specific knowledge found for this query.'}

TICKET CATEGORIES:
${ticketCategories.map(c => `- ${c}`).join('\n')}

ESCALATION RULES:
${escalationRules.map((r: any) => `- If "${r.trigger}": Escalate to ${r.team}`).join('\n')}

CONVERSATION FLOW:
1. Understand the customer's issue
2. Try to resolve using the knowledge provided above
3. If complex, create a ticket
4. If urgent or negative sentiment, escalate

When creating a ticket, include [CREATE_TICKET:category,priority] in your response.
When escalating, include [ESCALATE:reason].
When issue is resolved, include [RESOLVED].`;

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
    temperature: 0.6,
    max_tokens: 500,
  });

  const aiMessage = response.choices[0]?.message?.content || '';
  let cleanMessage = aiMessage;
  let action: string | undefined;
  let data: Record<string, any> | undefined;

  // Parse ticket creation
  const ticketMatch = aiMessage.match(/\[CREATE_TICKET:([^,]+),(\w+)\]/);
  if (ticketMatch) {
    action = 'create_ticket';
    const ticket = await createTicket(context, ticketMatch[1], ticketMatch[2], userMessage);
    data = { ticketId: ticket.id, category: ticketMatch[1], priority: ticketMatch[2] };
    cleanMessage = aiMessage.replace(/\[CREATE_TICKET:[^\]]+\]/, `\n\nI've created ticket #${ticket.id} for you.`).trim();
  }

  // Parse escalation
  const escalateMatch = aiMessage.match(/\[ESCALATE:([^\]]+)\]/);
  if (escalateMatch) {
    action = 'escalate';
    data = { reason: escalateMatch[1] };
    cleanMessage = aiMessage.replace(/\[ESCALATE:[^\]]+\]/, '\n\nI\'m connecting you with a human agent now.').trim();
  }

  // Parse resolved
  if (aiMessage.includes('[RESOLVED]')) {
    action = 'resolved';
    cleanMessage = aiMessage.replace('[RESOLVED]', '').trim();
  }

  return {
    message: cleanMessage,
    action,
    data,
    shouldEnd: action === 'escalate',
  };
}

/**
 * Create support ticket
 */
export async function createTicket(
  context: AgentContext,
  category: string,
  priority: string,
  description: string
): Promise<SupportTicket> {
  // This would integrate with your ticketing system
  const ticket: SupportTicket = {
    id: `TKT-${Date.now()}`,
    leadId: context.leadId,
    category,
    priority,
    description,
    status: 'OPEN',
    createdAt: new Date(),
  };

  // Store in database or send to external ticketing system
  console.log('[Support] Created ticket:', ticket);

  return ticket;
}

export const supportAgentService = {
  handleConversation,
  createTicket,
};

export default supportAgentService;
