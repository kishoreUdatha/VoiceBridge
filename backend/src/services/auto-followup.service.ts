/**
 * Auto Follow-up Service - Single Responsibility Principle
 * Handles automatic follow-up rules and execution
 */

import { CallOutcome, FollowUpActionType } from '@prisma/client';
import OpenAI from 'openai';
import { prisma } from '../config/database';
import { exotelService } from '../integrations/exotel.service';
import { emailService } from '../integrations/email.service';
import { callSchedulingService } from './call-scheduling.service';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export interface CreateRuleData {
  organizationId: string;
  agentId?: string;
  name: string;
  triggerOutcome?: CallOutcome;
  triggerSentiment?: string;
  triggerEvent?: string;
  minCallDuration?: number;
  actionType?: FollowUpActionType;
  action?: string;
  delayMinutes: number;
  messageTemplate?: string;
  useAI?: boolean;
  isActive?: boolean;
  conditions?: Record<string, any>;
  actionConfig?: Record<string, any>;
}

/**
 * Create a new follow-up rule
 */
export async function createRule(data: CreateRuleData) {
  return prisma.followUpRule.create({
    data: {
      organizationId: data.organizationId,
      agentId: data.agentId,
      name: data.name,
      triggerOutcome: data.triggerOutcome,
      triggerSentiment: data.triggerSentiment,
      minCallDuration: data.minCallDuration,
      actionType: data.actionType || 'WHATSAPP',
      delayMinutes: data.delayMinutes,
      messageTemplate: data.messageTemplate || '',
      useAI: data.useAI,
      isActive: data.isActive ?? true,
    },
  });
}

/**
 * Process a call for matching follow-up rules
 */
export async function processCallForFollowUp(callId: string) {
  const call = await prisma.outboundCall.findUnique({
    where: { id: callId },
    include: { agent: true },
  });

  if (!call || !call.agent) return;

  // Find matching rules
  const rules = await prisma.followUpRule.findMany({
    where: {
      organizationId: call.agent.organizationId,
      isActive: true,
      OR: [
        { agentId: call.agentId },
        { agentId: null },
      ],
    },
  });

  for (const rule of rules) {
    if (ruleMatches(rule, call)) {
      await scheduleFollowUp(rule, call);
    }
  }
}

/**
 * Check if a rule matches a call
 */
function ruleMatches(rule: any, call: any): boolean {
  if (rule.triggerOutcome && rule.triggerOutcome !== call.outcome) return false;
  if (rule.triggerSentiment && rule.triggerSentiment !== call.sentiment) return false;
  if (rule.minCallDuration && (call.duration || 0) < rule.minCallDuration) return false;
  return true;
}

/**
 * Schedule a follow-up based on rule
 */
async function scheduleFollowUp(rule: any, call: any) {
  const scheduledAt = new Date(Date.now() + rule.delayMinutes * 60 * 1000);

  // Personalize message if AI enabled
  let message = rule.messageTemplate;
  if (rule.useAI && openai) {
    message = await personalizeMessage(rule.messageTemplate, call);
  }

  await prisma.followUpLog.create({
    data: {
      ruleId: rule.id,
      callId: call.id,
      leadId: call.generatedLeadId,
      actionType: rule.actionType,
      scheduledAt,
      message,
    },
  });
}

/**
 * Personalize follow-up message using AI
 */
async function personalizeMessage(template: string, call: any): Promise<string> {
  if (!openai) return template;

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Personalize this follow-up message based on the call summary. Keep it concise and professional.
Template: ${template}
Call Summary: ${call.summary || 'No summary available'}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    return completion.choices[0]?.message?.content || template;
  } catch {
    return template;
  }
}

/**
 * Execute all pending follow-ups
 */
export async function executePendingFollowUps() {
  const pending = await prisma.followUpLog.findMany({
    where: {
      status: 'PENDING',
      scheduledAt: { lte: new Date() },
    },
    take: 50,
  });

  for (const followUp of pending) {
    try {
      await executeFollowUp(followUp);
    } catch (error) {
      await prisma.followUpLog.update({
        where: { id: followUp.id },
        data: { status: 'FAILED', error: (error as Error).message },
      });
    }
  }
}

/**
 * Execute a single follow-up
 */
async function executeFollowUp(followUp: any) {
  const call = await prisma.outboundCall.findUnique({
    where: { id: followUp.callId },
    include: { agent: true },
  });

  if (!call) {
    throw new Error('Call not found');
  }

  switch (followUp.actionType) {
    case 'SMS':
      await exotelService.sendSMS({
        to: call.phoneNumber,
        body: followUp.message,
      });
      break;

    case 'EMAIL':
      if (followUp.leadId) {
        const lead = await prisma.lead.findUnique({
          where: { id: followUp.leadId },
          select: { email: true, alternateEmail: true, firstName: true },
        });

        if (lead && (lead.email || lead.alternateEmail)) {
          await emailService.sendEmail({
            to: lead.email || lead.alternateEmail!,
            subject: 'Follow-up',
            body: followUp.message,
            html: `<p>${followUp.message.replace(/\n/g, '<br>')}</p>`,
            leadId: followUp.leadId,
            userId: 'system',
          });
        } else {
          throw new Error('Lead has no email address');
        }
      } else {
        throw new Error('No lead associated with this follow-up');
      }
      break;

    case 'WHATSAPP':
      await exotelService.sendWhatsApp({
        to: call.phoneNumber,
        message: followUp.message,
      });
      break;

    case 'SCHEDULE_CALL':
      if (call.agent) {
        await callSchedulingService.scheduleCall({
          organizationId: call.agent.organizationId,
          agentId: call.agentId,
          phoneNumber: call.phoneNumber,
          scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          leadId: followUp.leadId || undefined,
          callType: 'FOLLOWUP',
          priority: 3,
          notes: `Auto follow-up: ${followUp.message}`,
        });
      } else {
        throw new Error('Cannot schedule call: original call not found');
      }
      break;
  }

  await prisma.followUpLog.update({
    where: { id: followUp.id },
    data: { status: 'SENT', executedAt: new Date() },
  });
}

/**
 * Get all follow-up rules for organization
 */
export async function getFollowUpRules(organizationId: string) {
  return prisma.followUpRule.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Update a follow-up rule
 */
export async function updateRule(id: string, data: any) {
  return prisma.followUpRule.update({ where: { id }, data });
}

/**
 * Delete a follow-up rule
 */
export async function deleteRule(id: string) {
  return prisma.followUpRule.delete({ where: { id } });
}

/**
 * Get follow-up logs for organization
 */
export async function getFollowUpLogs(organizationId: string, options?: {
  status?: string;
  limit?: number;
}) {
  // First get rule IDs for this organization
  const rules = await prisma.followUpRule.findMany({
    where: { organizationId },
    select: { id: true, name: true, actionType: true },
  });

  type RuleItem = typeof rules[0];
  const ruleIds = rules.map((r: RuleItem) => r.id);
  const ruleMap = new Map(rules.map((r: RuleItem) => [r.id, { name: r.name, actionType: r.actionType }]));

  // Then get logs for those rules
  const logs = await prisma.followUpLog.findMany({
    where: {
      ruleId: { in: ruleIds },
      ...(options?.status && { status: options.status as any }),
    },
    orderBy: { scheduledAt: 'desc' },
    take: options?.limit || 50,
  });

  // Attach rule info to logs
  type LogItem = typeof logs[0];
  return logs.map((log: LogItem) => ({
    ...log,
    rule: ruleMap.get(log.ruleId),
  }));
}

export const autoFollowUpService = {
  createRule,
  processCallForFollowUp,
  executePendingFollowUps,
  getFollowUpRules,
  updateRule,
  deleteRule,
  getFollowUpLogs,
};

export default autoFollowUpService;
