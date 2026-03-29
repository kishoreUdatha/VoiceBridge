/**
 * Survey Agent Service - Single Responsibility Principle
 * Handles survey and feedback collection conversations
 */

import { prisma } from '../config/database';
import OpenAI from 'openai';
import { emailService } from '../integrations/email.service';
import { communicationService } from './communication.service';
import { AgentContext, AgentResponse } from './specialized-agent.types';


const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

/**
 * Handle survey conversation
 */
export async function handleConversation(context: AgentContext, userMessage: string): Promise<AgentResponse> {
  const agent = await prisma.voiceAgent.findUnique({
    where: { id: context.agentId },
  });

  if (!agent) throw new Error('Agent not found');

  const surveyType = agent.surveyType || 'NPS';
  const surveyQuestions = (agent.surveyQuestions as any[]) || [];
  const reviewPlatforms = (agent.reviewPlatforms as string[]) || [];

  // Default NPS questions if none configured
  const questions = surveyQuestions.length > 0 ? surveyQuestions : [
    { id: 1, question: 'On a scale of 0-10, how likely are you to recommend us to a friend?', type: 'rating' },
    { id: 2, question: 'What is the primary reason for your score?', type: 'text' },
    { id: 3, question: 'Is there anything we could do better?', type: 'text' },
  ];

  const systemPrompt = `You are ${agent.name}, a friendly survey/feedback agent.

YOUR ROLE:
- Collect customer feedback professionally
- Keep it conversational, not robotic
- Thank them sincerely for their time
- Handle negative feedback gracefully
- Ask for reviews on external platforms for promoters

SURVEY TYPE: ${surveyType}

QUESTIONS TO ASK:
${questions.map((q: any, i: number) => `${i + 1}. ${q.question} (${q.type})`).join('\n')}

REVIEW PLATFORMS: ${reviewPlatforms.join(', ') || 'None configured'}

CONVERSATION FLOW:
1. Thank them for being a customer
2. Ask survey questions one by one
3. Listen and acknowledge responses
4. For high scores (9-10), ask for online review
5. For low scores (0-6), empathize and ask how to improve
6. Thank them and close

Record answers using [ANSWER:questionId,response].
For NPS score, include [NPS:score].
When requesting review, include [REVIEW_REQUEST:platform].
When survey is complete, include [SURVEY_COMPLETE].`;

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

  // Parse NPS score
  const npsMatch = aiMessage.match(/\[NPS:(\d+)\]/);
  if (npsMatch) {
    const npsScore = parseInt(npsMatch[1]);
    action = 'nps_recorded';
    data = { npsScore };
    cleanMessage = aiMessage.replace(/\[NPS:\d+\]/, '').trim();

    // Store NPS score
    if (context.leadId) {
      await prisma.lead.update({
        where: { id: context.leadId },
        data: {
          customFields: {
            ...((await prisma.lead.findUnique({ where: { id: context.leadId } }))?.customFields as any || {}),
            npsScore,
            npsDate: new Date().toISOString(),
          },
        },
      });
    }
  }

  // Parse survey complete
  if (aiMessage.includes('[SURVEY_COMPLETE]')) {
    action = 'survey_complete';
    cleanMessage = aiMessage.replace('[SURVEY_COMPLETE]', '').trim();
  }

  return {
    message: cleanMessage,
    action,
    data,
    shouldEnd: action === 'survey_complete',
  };
}

/**
 * Send survey request
 */
export async function sendSurveyRequest(
  leadId: string,
  agentId: string,
  channel: 'sms' | 'whatsapp' | 'email' = 'sms'
): Promise<void> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  const agent = await prisma.voiceAgent.findUnique({ where: { id: agentId } });

  if (!lead || !agent) return;

  const message = `Hi ${lead.firstName}! We'd love to hear about your experience. Would you mind sharing your feedback? Reply YES to start a quick survey.`;

  if (channel === 'sms' && lead.phone) {
    await communicationService.sendSms({
      to: lead.phone,
      message,
      leadId,
      userId: 'system',
    });
  } else if (channel === 'email' && lead.email) {
    await emailService.sendEmail({
      to: lead.email,
      subject: 'We\'d love your feedback!',
      body: message,
      leadId,
      userId: 'system',
    });
  }
}

export const surveyAgentService = {
  handleConversation,
  sendSurveyRequest,
};

export default surveyAgentService;
