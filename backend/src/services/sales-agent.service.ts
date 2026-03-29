/**
 * Sales Agent Service - Single Responsibility Principle
 * Handles sales conversations: qualify, pitch, handle objections, close
 */

import { AgentType } from '@prisma/client';
import { prisma } from '../config/database';
import OpenAI from 'openai';
import { AgentContext, AgentResponse, QuoteData } from './specialized-agent.types';


const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

/**
 * Handle sales conversation
 */
export async function handleConversation(context: AgentContext, userMessage: string): Promise<AgentResponse> {
  const agent = await prisma.voiceAgent.findUnique({
    where: { id: context.agentId },
  });

  if (!agent) throw new Error('Agent not found');

  const salesPitch = agent.salesPitch || '';
  const objectionHandling = (agent.objectionHandling as any[]) || [];
  const pricingInfo = agent.pricingInfo as any || {};
  const closingTechniques = (agent.closingTechniques as any[]) || [];

  const systemPrompt = `You are ${agent.name}, a professional sales agent.

YOUR ROLE:
- Qualify the lead's needs and budget
- Present products/services convincingly
- Handle objections professionally
- Negotiate within authorized limits (max ${agent.discountAuthority}% discount)
- Close the deal when ready

SALES PITCH:
${salesPitch}

PRICING INFO:
${JSON.stringify(pricingInfo, null, 2)}

OBJECTION HANDLING:
${objectionHandling.map((o: any) => `- If they say "${o.objection}": ${o.response}`).join('\n')}

CLOSING TECHNIQUES:
${closingTechniques.map((t: any) => `- ${t}`).join('\n')}

IMPORTANT:
- Be consultative, not pushy
- Understand their needs before pitching
- If they're ready to buy, guide them to payment
- If they need an appointment, offer to schedule

Respond naturally in conversation. If the lead is ready to proceed, include [ACTION:PAYMENT] or [ACTION:APPOINTMENT] in your response.`;

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
    temperature: 0.7,
    max_tokens: 500,
  });

  const aiMessage = response.choices[0]?.message?.content || '';

  // Parse actions from response
  let action: string | undefined;
  let nextAgent: AgentType | undefined;
  let cleanMessage = aiMessage;

  if (aiMessage.includes('[ACTION:PAYMENT]')) {
    action = 'initiate_payment';
    nextAgent = 'PAYMENT';
    cleanMessage = aiMessage.replace('[ACTION:PAYMENT]', '').trim();
  } else if (aiMessage.includes('[ACTION:APPOINTMENT]')) {
    action = 'book_appointment';
    nextAgent = 'APPOINTMENT';
    cleanMessage = aiMessage.replace('[ACTION:APPOINTMENT]', '').trim();
  }

  // Update lead custom fields if we have a lead
  if (context.leadId && action) {
    const existingLead = await prisma.lead.findUnique({ where: { id: context.leadId } });
    await prisma.lead.update({
      where: { id: context.leadId },
      data: {
        customFields: {
          ...(existingLead?.customFields as any || {}),
          salesAgentInteraction: new Date().toISOString(),
          lastAction: action,
        },
      },
    });
  }

  return {
    message: cleanMessage,
    action,
    nextAgent,
    shouldEnd: false,
  };
}

/**
 * Generate a quote for the lead
 */
export async function generateQuote(
  context: AgentContext,
  products: Array<{ name: string; price: number; quantity: number }>,
  discount: number = 0
): Promise<QuoteData> {
  const agent = await prisma.voiceAgent.findUnique({
    where: { id: context.agentId },
  });

  if (!agent) throw new Error('Agent not found');

  const maxDiscount = agent.discountAuthority || 0;
  const finalDiscount = Math.min(discount, maxDiscount);

  const subtotal = products.reduce((sum, p) => sum + (p.price * p.quantity), 0);

  const quote: QuoteData = {
    id: `QT-${Date.now()}`,
    leadId: context.leadId,
    products,
    subtotal,
    discount: finalDiscount,
    total: subtotal * (1 - finalDiscount / 100),
    validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    createdAt: new Date(),
  };

  return quote;
}

export const salesAgentService = {
  handleConversation,
  generateQuote,
};

export default salesAgentService;
