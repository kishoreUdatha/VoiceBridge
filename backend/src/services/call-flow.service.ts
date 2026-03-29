/**
 * Call Flow Service - Single Responsibility Principle
 * Handles CRUD operations for structured call flows
 */

import { CallOutcome } from '@prisma/client';
import { prisma } from '../config/database';
import {
  CallFlowNode,
  CallFlowEdge,
  CreateCallFlowInput,
  CallFlowLogInput,
  CallFlowAnalytics,
  CallFlowExecutionContext,
  NodeProcessingResult,
  FlowTestResult,
} from './call-flow.types';
import { callFlowExecutorService } from './call-flow-executor.service';


// Re-export types for convenience
export * from './call-flow.types';

/**
 * Create a new call flow
 */
export async function createCallFlow(
  organizationId: string,
  userId: string,
  input: CreateCallFlowInput
) {
  return prisma.callFlow.create({
    data: {
      organizationId,
      createdById: userId,
      name: input.name,
      description: input.description,
      industry: input.industry,
      nodes: input.nodes as any,
      edges: input.edges as any,
      variables: input.variables || [],
      defaultGreeting: input.defaultGreeting,
      defaultFallback: input.defaultFallback,
      defaultTransfer: input.defaultTransfer,
      defaultEnd: input.defaultEnd,
      successOutcomes: input.successOutcomes || ['INTERESTED', 'APPOINTMENT_BOOKED', 'PAYMENT_COLLECTED'],
      failureOutcomes: input.failureOutcomes || ['NOT_INTERESTED', 'WRONG_NUMBER', 'DNC_REQUESTED'],
    },
  });
}

/**
 * Get all call flows for an organization
 */
export async function getCallFlows(organizationId: string) {
  return prisma.callFlow.findMany({
    where: { organizationId },
    include: {
      createdBy: {
        select: { firstName: true, lastName: true },
      },
      _count: {
        select: { voiceAgents: true, callLogs: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });
}

/**
 * Get a single call flow by ID
 */
export async function getCallFlow(id: string, organizationId: string) {
  return prisma.callFlow.findFirst({
    where: { id, organizationId },
    include: {
      createdBy: {
        select: { firstName: true, lastName: true },
      },
      voiceAgents: {
        select: { id: true, name: true },
      },
    },
  });
}

/**
 * Update a call flow
 */
export async function updateCallFlow(
  id: string,
  organizationId: string,
  input: Partial<CreateCallFlowInput>
) {
  const callFlow = await prisma.callFlow.findFirst({
    where: { id, organizationId },
  });

  if (!callFlow) {
    throw new Error('Call flow not found');
  }

  return prisma.callFlow.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description,
      industry: input.industry,
      nodes: input.nodes as any,
      edges: input.edges as any,
      variables: input.variables,
      defaultGreeting: input.defaultGreeting,
      defaultFallback: input.defaultFallback,
      defaultTransfer: input.defaultTransfer,
      defaultEnd: input.defaultEnd,
      successOutcomes: input.successOutcomes,
      failureOutcomes: input.failureOutcomes,
      version: { increment: 1 },
    },
  });
}

/**
 * Delete a call flow
 */
export async function deleteCallFlow(id: string, organizationId: string) {
  const callFlow = await prisma.callFlow.findFirst({
    where: { id, organizationId },
    include: { voiceAgents: true },
  });

  if (!callFlow) {
    throw new Error('Call flow not found');
  }

  if (callFlow.voiceAgents.length > 0) {
    throw new Error('Cannot delete call flow that is assigned to agents');
  }

  return prisma.callFlow.delete({ where: { id } });
}

/**
 * Duplicate a call flow
 */
export async function duplicateCallFlow(
  id: string,
  organizationId: string,
  userId: string,
  newName?: string
) {
  const original = await prisma.callFlow.findFirst({
    where: { id, organizationId },
  });

  if (!original) {
    throw new Error('Call flow not found');
  }

  return prisma.callFlow.create({
    data: {
      organizationId,
      createdById: userId,
      name: newName || `${original.name} (Copy)`,
      description: original.description,
      industry: original.industry,
      nodes: original.nodes as any,
      edges: original.edges as any,
      variables: original.variables as any,
      defaultGreeting: original.defaultGreeting,
      defaultFallback: original.defaultFallback,
      defaultTransfer: original.defaultTransfer,
      defaultEnd: original.defaultEnd,
      successOutcomes: original.successOutcomes as any,
      failureOutcomes: original.failureOutcomes as any,
    },
  });
}

/**
 * Assign call flow to voice agent
 */
export async function assignToAgent(
  callFlowId: string,
  agentId: string,
  organizationId: string
) {
  // Verify both belong to same org
  const [callFlow, agent] = await Promise.all([
    prisma.callFlow.findFirst({ where: { id: callFlowId, organizationId } }),
    prisma.voiceAgent.findFirst({ where: { id: agentId, organizationId } }),
  ]);

  if (!callFlow || !agent) {
    throw new Error('Call flow or agent not found');
  }

  return prisma.voiceAgent.update({
    where: { id: agentId },
    data: { callFlowId },
  });
}

/**
 * Get call flow templates (system-wide or organization templates)
 */
export async function getTemplates(organizationId?: string) {
  return prisma.callFlow.findMany({
    where: {
      isTemplate: true,
      OR: [
        { organizationId: organizationId },
        // System templates would have a specific org ID or null
      ],
    },
    orderBy: { name: 'asc' },
  });
}

/**
 * Create flow from template
 */
export async function createFromTemplate(
  templateId: string,
  organizationId: string,
  userId: string,
  name: string
) {
  const template = await prisma.callFlow.findFirst({
    where: { id: templateId, isTemplate: true },
  });

  if (!template) {
    throw new Error('Template not found');
  }

  return prisma.callFlow.create({
    data: {
      organizationId,
      createdById: userId,
      name,
      description: template.description,
      industry: template.industry,
      nodes: template.nodes as any,
      edges: template.edges as any,
      variables: template.variables as any,
      defaultGreeting: template.defaultGreeting,
      defaultFallback: template.defaultFallback,
      defaultTransfer: template.defaultTransfer,
      defaultEnd: template.defaultEnd,
      successOutcomes: template.successOutcomes as any,
      failureOutcomes: template.failureOutcomes as any,
      isTemplate: false,
    },
  });
}

/**
 * Log a call flow execution
 */
export async function logExecution(callFlowId: string, data: CallFlowLogInput) {
  return prisma.callFlowLog.create({
    data: {
      callFlowId,
      sessionId: data.sessionId,
      leadId: data.leadId,
      phoneNumber: data.phoneNumber,
      direction: data.direction || 'outbound',
      nodesVisited: data.nodesVisited || [],
      variablesCollected: data.variablesCollected || {},
      outcome: data.outcome,
      outcomeReason: data.outcomeReason,
      sentiment: data.sentiment,
      transcript: data.transcript || [],
      summary: data.summary,
      actionsTaken: data.actionsTaken || [],
      duration: data.duration,
      endedAt: new Date(),
    },
  });
}

/**
 * Get flow analytics
 */
export async function getAnalytics(
  callFlowId: string,
  organizationId: string,
  dateRange?: { start: Date; end: Date }
): Promise<CallFlowAnalytics> {
  const flow = await prisma.callFlow.findFirst({
    where: { id: callFlowId, organizationId },
  });

  if (!flow) {
    throw new Error('Call flow not found');
  }

  const where: any = { callFlowId };
  if (dateRange) {
    where.startedAt = {
      gte: dateRange.start,
      lte: dateRange.end,
    };
  }

  const logs = await prisma.callFlowLog.findMany({
    where,
    select: {
      outcome: true,
      duration: true,
      sentiment: true,
      qualityScore: true,
    },
  });

  const totalCalls = logs.length;
  type LogItem = typeof logs[0];
  const outcomes = logs.reduce((acc: Record<string, number>, log: LogItem) => {
    if (log.outcome) {
      acc[log.outcome] = (acc[log.outcome] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const successOutcomes = (flow.successOutcomes as string[]) || [];
  const successfulCalls = logs.filter((l: LogItem) => l.outcome && successOutcomes.includes(l.outcome)).length;

  const avgDuration = logs.reduce((sum: number, l: LogItem) => sum + (l.duration || 0), 0) / (totalCalls || 1);
  const avgQuality = logs.reduce((sum: number, l: LogItem) => sum + (l.qualityScore || 0), 0) / (totalCalls || 1);

  const sentiments = logs.reduce((acc, log) => {
    if (log.sentiment) {
      acc[log.sentiment] = (acc[log.sentiment] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  return {
    totalCalls,
    successfulCalls,
    conversionRate: totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0,
    avgDuration: Math.round(avgDuration),
    avgQualityScore: Math.round(avgQuality * 10) / 10,
    outcomes,
    sentiments,
  };
}

// ==================== EXECUTION METHODS (delegated to executor service) ====================

/**
 * Initialize execution context for a call
 */
export async function initializeExecution(
  callFlowId: string,
  sessionId: string,
  initialVariables?: Record<string, any>
): Promise<CallFlowExecutionContext> {
  return callFlowExecutorService.initializeExecution(callFlowId, sessionId, initialVariables);
}

/**
 * Process the current node in the execution context
 */
export async function processNode(
  context: CallFlowExecutionContext,
  userInput?: string
): Promise<NodeProcessingResult> {
  return callFlowExecutorService.processCurrentNode(context, userInput);
}

/**
 * Test execute a call flow with simulated inputs
 */
export async function executeFlowTest(
  callFlowId: string,
  simulatedInputs: string[],
  initialVariables?: Record<string, any>
): Promise<FlowTestResult> {
  return callFlowExecutorService.executeFlowTest(callFlowId, simulatedInputs, initialVariables);
}

// Re-export executor service for direct access
export { callFlowExecutorService, callFlowExecutorService as callFlowExecutor } from './call-flow-executor.service';

export const callFlowService = {
  createCallFlow,
  getCallFlows,
  getCallFlow,
  updateCallFlow,
  deleteCallFlow,
  duplicateCallFlow,
  assignToAgent,
  getTemplates,
  createFromTemplate,
  logExecution,
  getAnalytics,
  initializeExecution,
  processNode,
  executeFlowTest,
};

export default callFlowService;
