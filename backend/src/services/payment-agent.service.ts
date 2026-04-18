/**
 * Payment Agent Service - Single Responsibility Principle
 * Handles payment collection conversations
 */

import { prisma } from '../config/database';
import OpenAI from 'openai';
import { communicationService } from './communication.service';
import { AgentContext, AgentResponse, PendingPayment } from './specialized-agent.types';


const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

/**
 * Handle payment collection conversation
 */
export async function handleConversation(context: AgentContext, userMessage: string): Promise<AgentResponse> {
  const agent = await prisma.voiceAgent.findUnique({
    where: { id: context.agentId },
  });

  if (!agent) throw new Error('Agent not found');

  const paymentTypes = (agent.paymentTypes as string[]) || ['full', 'emi', 'partial'];
  const emiOptions = (agent.emiOptions as any[]) || [];

  // Get pending payments for this lead
  const pendingPayments = context.leadId ? await getPendingPayments(context.leadId) : [];

  const systemPrompt = `You are ${agent.name}, a payment collection assistant.

YOUR ROLE:
- Help customers complete their payments
- Explain payment options (full, EMI, partial)
- Generate and share payment links
- Handle payment-related queries
- Follow up on failed/pending payments

PAYMENT OPTIONS:
${paymentTypes.map(t => `- ${t.toUpperCase()}`).join('\n')}

EMI PLANS:
${emiOptions.map((e: any) => `- ${e.months} months: ${e.interest}% interest, min amount: ${e.minAmount}`).join('\n')}

PENDING PAYMENTS:
${pendingPayments.length > 0
  ? pendingPayments.map(p => `- Invoice ${p.id}: ₹${p.amount} due on ${p.dueDate}`).join('\n')
  : 'No pending payments'}

CONVERSATION FLOW:
1. Acknowledge the payment due
2. Explain payment options
3. Generate payment link when ready
4. Confirm payment status

When generating payment link, include [PAYMENT_LINK:amount,type] in your response.
When payment is confirmed, include [PAYMENT_CONFIRMED:paymentId].`;

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
    max_tokens: 400,
  });

  const aiMessage = response.choices[0]?.message?.content || '';
  let cleanMessage = aiMessage;
  let action: string | undefined;
  let data: Record<string, any> | undefined;

  // Parse payment link action
  const paymentMatch = aiMessage.match(/\[PAYMENT_LINK:(\d+),(\w+)\]/);
  if (paymentMatch) {
    action = 'generate_payment_link';
    const amount = parseInt(paymentMatch[1]);
    const type = paymentMatch[2];

    // Generate payment link
    const paymentLink = await generatePaymentLink(context, amount, type);
    data = { paymentLink, amount, type };
    cleanMessage = aiMessage.replace(/\[PAYMENT_LINK:[^\]]+\]/, `\n\nPayment Link: ${paymentLink}`).trim();
  }

  return {
    message: cleanMessage,
    action,
    data,
  };
}

/**
 * Get pending payments for a lead
 */
export async function getPendingPayments(leadId: string): Promise<PendingPayment[]> {
  // This would integrate with your payment/invoice system
  // For now, return empty array
  return [];
}

/**
 * Generate payment link
 */
export async function generatePaymentLink(context: AgentContext, amount: number, type: string): Promise<string> {
  // This should integrate with Razorpay/Stripe
  // For now, return a mock link
  const baseUrl = process.env.FRONTEND_URL || 'https://app.myleadx.com';
  return `${baseUrl}/pay/${context.leadId}?amount=${amount}&type=${type}`;
}

/**
 * Send payment reminder
 */
export async function sendPaymentReminder(leadId: string, invoiceId: string, daysOverdue: number): Promise<void> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return;

  const message = daysOverdue > 7
    ? `Important: Your payment of ₹X is ${daysOverdue} days overdue. Please pay immediately to avoid service interruption.`
    : `Friendly reminder: Your payment is due. Please complete it at your earliest convenience.`;

  if (lead.phone) {
    await communicationService.sendSms({
      to: lead.phone,
      message,
      leadId,
      userId: 'system',
    });
  }
}

export const paymentAgentService = {
  handleConversation,
  getPendingPayments,
  generatePaymentLink,
  sendPaymentReminder,
};

export default paymentAgentService;
