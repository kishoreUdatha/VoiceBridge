/**
 * Agent Orchestrator Service - Single Responsibility Principle
 * Routes conversations to appropriate specialized agents
 */

import { AgentType } from '@prisma/client';
import { AgentContext, AgentResponse, HANDOFF_MESSAGES } from './specialized-agent.types';
import { salesAgentService } from './sales-agent.service';
import { appointmentAgentService } from './appointment-agent.service';
import { paymentAgentService } from './payment-agent.service';
import { supportAgentService } from './support-agent.service';
import { followUpAgentService } from './followup-agent.service';
import { surveyAgentService } from './survey-agent.service';

/**
 * Route conversation to appropriate agent
 */
export async function handleConversation(
  agentType: AgentType,
  context: AgentContext,
  userMessage: string
): Promise<AgentResponse> {
  switch (agentType) {
    case 'SALES':
      return salesAgentService.handleConversation(context, userMessage);
    case 'APPOINTMENT':
      return appointmentAgentService.handleConversation(context, userMessage);
    case 'PAYMENT':
      return paymentAgentService.handleConversation(context, userMessage);
    case 'SUPPORT':
      return supportAgentService.handleConversation(context, userMessage);
    case 'FOLLOWUP':
      return followUpAgentService.handleConversation(context, userMessage);
    case 'SURVEY':
      return surveyAgentService.handleConversation(context, userMessage);
    default:
      throw new Error(`Unknown agent type: ${agentType}`);
  }
}

/**
 * Hand off conversation from one agent to another
 */
export async function handoffConversation(
  fromAgentType: AgentType,
  toAgentType: AgentType,
  context: AgentContext
): Promise<AgentResponse> {
  // Log the handoff
  console.log(`[Orchestrator] Handing off from ${fromAgentType} to ${toAgentType}`);

  return {
    message: HANDOFF_MESSAGES[toAgentType],
    action: 'handoff',
    data: { fromAgent: fromAgentType, toAgent: toAgentType },
  };
}

/**
 * Determine the best agent for a given query
 */
export function determineAgentType(query: string): AgentType {
  const lowerQuery = query.toLowerCase();

  // Payment keywords
  if (lowerQuery.includes('pay') || lowerQuery.includes('price') || lowerQuery.includes('cost') ||
      lowerQuery.includes('invoice') || lowerQuery.includes('emi') || lowerQuery.includes('bill')) {
    return 'PAYMENT';
  }

  // Appointment keywords
  if (lowerQuery.includes('appointment') || lowerQuery.includes('schedule') || lowerQuery.includes('book') ||
      lowerQuery.includes('meeting') || lowerQuery.includes('demo') || lowerQuery.includes('call back')) {
    return 'APPOINTMENT';
  }

  // Support keywords
  if (lowerQuery.includes('help') || lowerQuery.includes('issue') || lowerQuery.includes('problem') ||
      lowerQuery.includes('support') || lowerQuery.includes('not working') || lowerQuery.includes('error')) {
    return 'SUPPORT';
  }

  // Survey keywords
  if (lowerQuery.includes('feedback') || lowerQuery.includes('survey') || lowerQuery.includes('review') ||
      lowerQuery.includes('rating') || lowerQuery.includes('experience')) {
    return 'SURVEY';
  }

  // Default to sales
  return 'SALES';
}

export const agentOrchestratorService = {
  handleConversation,
  handoffConversation,
  determineAgentType,
};

export default agentOrchestratorService;
