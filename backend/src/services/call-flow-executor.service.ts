/**
 * Call Flow Executor Service - Single Responsibility Principle
 * Handles call flow execution engine and node processing
 */

import { CallOutcome } from '@prisma/client';
import { prisma } from '../config/database';
import {
  CallFlowNode,
  CallFlowEdge,
  CallFlowExecutionContext,
  NodeProcessingResult,
  FlowTestResult,
} from './call-flow.types';


/**
 * Initialize a new execution context for a call flow
 */
export async function initializeExecution(
  callFlowId: string,
  sessionId: string,
  initialVariables?: Record<string, any>
): Promise<CallFlowExecutionContext> {
  const callFlow = await prisma.callFlow.findUnique({
    where: { id: callFlowId },
  });

  if (!callFlow) {
    throw new Error('Call flow not found');
  }

  const nodes = callFlow.nodes as unknown as CallFlowNode[];
  const startNode = nodes.find(n => n.type === 'START');

  if (!startNode) {
    throw new Error('Call flow has no START node');
  }

  return {
    callFlowId,
    sessionId,
    currentNodeId: startNode.id,
    visitedNodes: [startNode.id],
    variables: initialVariables || {},
    transcript: [],
    startedAt: new Date(),
    lastNodeAt: new Date(),
    retryCount: 0,
    maxRetries: 3,
    shouldTransfer: false,
    shouldEnd: false,
  };
}

/**
 * Process the current node and determine next action
 */
export async function processCurrentNode(
  context: CallFlowExecutionContext,
  userInput?: string
): Promise<NodeProcessingResult> {
  const callFlow = await prisma.callFlow.findUnique({
    where: { id: context.callFlowId },
  });

  if (!callFlow) {
    throw new Error('Call flow not found');
  }

  const nodes = callFlow.nodes as unknown as CallFlowNode[];
  const edges = callFlow.edges as unknown as CallFlowEdge[];
  const currentNode = nodes.find(n => n.id === context.currentNodeId);

  if (!currentNode) {
    throw new Error(`Node ${context.currentNodeId} not found in call flow`);
  }

  context.lastNodeAt = new Date();

  // Process based on node type
  switch (currentNode.type) {
    case 'START':
      return processStartNode(context, currentNode, edges);

    case 'GREETING':
      return processGreetingNode(context, currentNode, edges);

    case 'QUESTION':
      return processQuestionNode(context, currentNode, edges, userInput);

    case 'CONDITION':
      return processConditionNode(context, currentNode, edges);

    case 'AI_RESPONSE':
      return processAIResponseNode(context, currentNode, edges, userInput);

    case 'ACTION':
      return processActionNode(context, currentNode, edges);

    case 'TRANSFER':
      return processTransferNode(context, currentNode);

    case 'END':
      return processEndNode(context, currentNode);

    default:
      throw new Error(`Unknown node type: ${currentNode.type}`);
  }
}

/**
 * Process START node - just move to next
 */
function processStartNode(
  context: CallFlowExecutionContext,
  node: CallFlowNode,
  edges: CallFlowEdge[]
): NodeProcessingResult {
  const nextNodeId = getNextNodeId(node.id, edges);
  if (nextNodeId) {
    context.currentNodeId = nextNodeId;
    context.visitedNodes.push(nextNodeId);
  }
  return {
    shouldWaitForInput: false,
    shouldEnd: !nextNodeId,
    shouldTransfer: false,
    nextNodeId,
  };
}

/**
 * Process GREETING node - return greeting message and move to next
 */
function processGreetingNode(
  context: CallFlowExecutionContext,
  node: CallFlowNode,
  edges: CallFlowEdge[]
): NodeProcessingResult {
  const message = parseVariables(node.data.message || node.data.label, context.variables);

  context.transcript.push({
    role: 'assistant',
    content: message,
    timestamp: new Date(),
    nodeId: node.id,
  });

  const nextNodeId = getNextNodeId(node.id, edges);
  if (nextNodeId) {
    context.currentNodeId = nextNodeId;
    context.visitedNodes.push(nextNodeId);
  }

  return {
    response: message,
    nextNodeId,
    shouldWaitForInput: false,
    shouldEnd: !nextNodeId,
    shouldTransfer: false,
  };
}

/**
 * Process QUESTION node - ask question and wait for input, or process input
 */
function processQuestionNode(
  context: CallFlowExecutionContext,
  node: CallFlowNode,
  edges: CallFlowEdge[],
  userInput?: string
): NodeProcessingResult {
  // If no user input, ask the question
  if (!userInput) {
    const question = parseVariables(node.data.question || node.data.label, context.variables);

    context.transcript.push({
      role: 'assistant',
      content: question,
      timestamp: new Date(),
      nodeId: node.id,
    });

    return {
      response: question,
      shouldWaitForInput: true,
      shouldEnd: false,
      shouldTransfer: false,
    };
  }

  // Process user input
  context.transcript.push({
    role: 'user',
    content: userInput,
    timestamp: new Date(),
    nodeId: node.id,
  });

  // Validate input if validation is specified
  if (node.data.validation) {
    const regex = new RegExp(node.data.validation);
    if (!regex.test(userInput)) {
      context.retryCount++;
      if (context.retryCount >= (node.data.maxRetries || context.maxRetries)) {
        // Max retries exceeded, move to next with empty value
        const nextNodeId = getNextNodeId(node.id, edges);
        if (nextNodeId) {
          context.currentNodeId = nextNodeId;
          context.visitedNodes.push(nextNodeId);
        }
        return {
          response: node.data.retryMessage || "Let's continue with the next question.",
          nextNodeId,
          shouldWaitForInput: false,
          shouldEnd: !nextNodeId,
          shouldTransfer: false,
        };
      }
      return {
        response: node.data.retryMessage || "I didn't quite catch that. Could you please try again?",
        shouldWaitForInput: true,
        shouldEnd: false,
        shouldTransfer: false,
      };
    }
  }

  // Store variable
  let variableCollected: { name: string; value: any } | undefined;
  if (node.data.variableName) {
    const value = parseInputValue(userInput, node.data.variableType, node.data.choices);
    context.variables[node.data.variableName] = value;
    variableCollected = { name: node.data.variableName, value };
  }

  // Reset retry count and move to next
  context.retryCount = 0;
  const nextNodeId = getNextNodeId(node.id, edges);
  if (nextNodeId) {
    context.currentNodeId = nextNodeId;
    context.visitedNodes.push(nextNodeId);
  }

  return {
    nextNodeId,
    shouldWaitForInput: false,
    shouldEnd: !nextNodeId,
    shouldTransfer: false,
    variableCollected,
  };
}

/**
 * Parse user input based on variable type
 */
function parseInputValue(
  userInput: string,
  variableType?: string,
  choices?: string[]
): any {
  switch (variableType) {
    case 'number':
      return parseFloat(userInput.replace(/[^0-9.-]/g, '')) || 0;
    case 'boolean':
      return /^(yes|yeah|yep|sure|ok|okay|true|1|haan|ha)$/i.test(userInput.trim());
    case 'email':
      const emailMatch = userInput.match(/[\w.-]+@[\w.-]+\.\w+/);
      return emailMatch ? emailMatch[0] : userInput;
    case 'phone':
      return userInput.replace(/[^0-9+]/g, '');
    case 'date':
      return new Date(userInput).toISOString();
    case 'choice':
      if (choices) {
        const matchedChoice = choices.find(
          (c: string) => c.toLowerCase() === userInput.toLowerCase()
        );
        return matchedChoice || userInput;
      }
      return userInput;
    default:
      return userInput.trim();
  }
}

/**
 * Process CONDITION node - evaluate condition and branch accordingly
 */
function processConditionNode(
  context: CallFlowExecutionContext,
  node: CallFlowNode,
  edges: CallFlowEdge[]
): NodeProcessingResult {
  const condition = node.data.condition;
  if (!condition) {
    // No condition, go to default (first edge)
    const nextNodeId = getNextNodeId(node.id, edges);
    if (nextNodeId) {
      context.currentNodeId = nextNodeId;
      context.visitedNodes.push(nextNodeId);
    }
    return {
      nextNodeId,
      shouldWaitForInput: false,
      shouldEnd: !nextNodeId,
      shouldTransfer: false,
    };
  }

  const result = evaluateCondition(condition, context.variables);

  // Find the appropriate edge based on condition result
  const trueEdge = edges.find(e => e.source === node.id && e.sourceHandle === 'true');
  const falseEdge = edges.find(e => e.source === node.id && e.sourceHandle === 'false');
  const defaultEdge = edges.find(e => e.source === node.id && !e.sourceHandle);

  let nextNodeId: string | undefined;
  if (result && trueEdge) {
    nextNodeId = trueEdge.target;
  } else if (!result && falseEdge) {
    nextNodeId = falseEdge.target;
  } else if (defaultEdge) {
    nextNodeId = defaultEdge.target;
  }

  if (nextNodeId) {
    context.currentNodeId = nextNodeId;
    context.visitedNodes.push(nextNodeId);
  }

  return {
    nextNodeId,
    shouldWaitForInput: false,
    shouldEnd: !nextNodeId,
    shouldTransfer: false,
  };
}

/**
 * Evaluate a condition against collected variables
 */
function evaluateCondition(
  condition: { variable: string; operator: string; value: string },
  variables: Record<string, any>
): boolean {
  const actualValue = variables[condition.variable];
  const expectedValue = condition.value;

  switch (condition.operator) {
    case 'equals':
      return String(actualValue).toLowerCase() === String(expectedValue).toLowerCase();
    case 'contains':
      return String(actualValue).toLowerCase().includes(String(expectedValue).toLowerCase());
    case 'greater':
      return parseFloat(actualValue) > parseFloat(expectedValue);
    case 'less':
      return parseFloat(actualValue) < parseFloat(expectedValue);
    case 'exists':
      return actualValue !== undefined && actualValue !== null && actualValue !== '';
    case 'not_exists':
      return actualValue === undefined || actualValue === null || actualValue === '';
    default:
      return false;
  }
}

/**
 * Process AI_RESPONSE node - generate dynamic AI response
 */
function processAIResponseNode(
  context: CallFlowExecutionContext,
  node: CallFlowNode,
  edges: CallFlowEdge[],
  userInput?: string
): NodeProcessingResult {
  // For AI response, we need to generate a response using the AI prompt
  const prompt = parseVariables(node.data.aiPrompt || node.data.message || node.data.label, context.variables);

  // If there's user input, include it in transcript
  if (userInput) {
    context.transcript.push({
      role: 'user',
      content: userInput,
      timestamp: new Date(),
      nodeId: node.id,
    });
  }

  // The actual AI response will be generated by the calling service
  // Here we just provide the prompt
  context.transcript.push({
    role: 'assistant',
    content: prompt,
    timestamp: new Date(),
    nodeId: node.id,
  });

  const nextNodeId = getNextNodeId(node.id, edges);
  if (nextNodeId) {
    context.currentNodeId = nextNodeId;
    context.visitedNodes.push(nextNodeId);
  }

  return {
    response: prompt,
    nextNodeId,
    shouldWaitForInput: true, // Wait for user response after AI speaks
    shouldEnd: false,
    shouldTransfer: false,
  };
}

/**
 * Process ACTION node - execute an action and continue
 */
function processActionNode(
  context: CallFlowExecutionContext,
  node: CallFlowNode,
  edges: CallFlowEdge[]
): NodeProcessingResult {
  const actionType = node.data.actionType;
  const actionConfig = node.data.actionConfig || {};

  // Execute action based on type
  let actionResult: { type: string; data: any } | null = null;

  switch (actionType) {
    case 'webhook':
      // Trigger webhook with collected variables
      actionResult = { type: 'webhook', data: { url: actionConfig.url, variables: context.variables } };
      break;
    case 'create_lead':
      // Mark for lead creation
      actionResult = { type: 'create_lead', data: context.variables };
      break;
    case 'send_sms':
      // Queue SMS
      actionResult = { type: 'send_sms', data: { phone: context.variables.phone, message: actionConfig.message } };
      break;
    case 'send_whatsapp':
      // Queue WhatsApp message
      actionResult = { type: 'send_whatsapp', data: { phone: context.variables.phone, message: actionConfig.message } };
      break;
    case 'schedule_callback':
      // Schedule callback
      actionResult = { type: 'schedule_callback', data: context.variables };
      break;
    default:
      console.warn(`Unknown action type: ${actionType}`);
  }

  const nextNodeId = getNextNodeId(node.id, edges);
  if (nextNodeId) {
    context.currentNodeId = nextNodeId;
    context.visitedNodes.push(nextNodeId);
  }

  return {
    nextNodeId,
    shouldWaitForInput: false,
    shouldEnd: !nextNodeId,
    shouldTransfer: false,
    action: actionResult || undefined,
  };
}

/**
 * Process TRANSFER node - initiate transfer to human agent
 */
function processTransferNode(
  context: CallFlowExecutionContext,
  node: CallFlowNode
): NodeProcessingResult {
  const message = parseVariables(
    node.data.transferMessage || node.data.message || "Please hold while I transfer you.",
    context.variables
  );

  context.transcript.push({
    role: 'assistant',
    content: message,
    timestamp: new Date(),
    nodeId: node.id,
  });

  context.shouldTransfer = true;
  context.transferConfig = {
    transferNumber: node.data.transferNumber,
    message,
  };

  return {
    response: message,
    shouldWaitForInput: false,
    shouldEnd: false,
    shouldTransfer: true,
    transferConfig: context.transferConfig,
  };
}

/**
 * Process END node - end the call with outcome
 */
function processEndNode(
  context: CallFlowExecutionContext,
  node: CallFlowNode
): NodeProcessingResult {
  const message = parseVariables(
    node.data.message || node.data.label || "Thank you for your time. Goodbye!",
    context.variables
  );

  context.transcript.push({
    role: 'assistant',
    content: message,
    timestamp: new Date(),
    nodeId: node.id,
  });

  context.shouldEnd = true;
  context.endMessage = message;
  context.outcome = node.data.outcomeType || ('NEEDS_FOLLOWUP' as CallOutcome);

  return {
    response: message,
    shouldWaitForInput: false,
    shouldEnd: true,
    shouldTransfer: false,
    outcome: context.outcome,
  };
}

/**
 * Get the next node ID from edges
 */
function getNextNodeId(currentNodeId: string, edges: CallFlowEdge[]): string | undefined {
  const edge = edges.find(e => e.source === currentNodeId && !e.sourceHandle);
  return edge?.target;
}

/**
 * Parse variables in a text string
 */
function parseVariables(text: string, variables: Record<string, any>): string {
  if (!text) return '';

  return text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    return variables[varName] !== undefined ? String(variables[varName]) : match;
  });
}

/**
 * Run the call flow to completion (for testing)
 */
export async function executeFlowTest(
  callFlowId: string,
  simulatedInputs: string[],
  initialVariables?: Record<string, any>
): Promise<FlowTestResult> {
  const context = await initializeExecution(callFlowId, 'test-' + Date.now(), initialVariables);
  let inputIndex = 0;
  let iterations = 0;
  const maxIterations = 100; // Prevent infinite loops

  while (!context.shouldEnd && !context.shouldTransfer && iterations < maxIterations) {
    iterations++;
    const result = await processCurrentNode(context);

    if (result.shouldWaitForInput && inputIndex < simulatedInputs.length) {
      // Process with simulated input
      const input = simulatedInputs[inputIndex++];
      const inputResult = await processCurrentNode(context, input);

      if (inputResult.shouldEnd) break;
      if (inputResult.shouldTransfer) break;
    } else if (result.shouldWaitForInput) {
      // No more inputs, end test
      break;
    }

    if (result.shouldEnd || result.shouldTransfer) break;
    if (!result.nextNodeId && !result.shouldWaitForInput) break;
  }

  return {
    transcript: context.transcript.map(t => ({ role: t.role, content: t.content })),
    variables: context.variables,
    outcome: context.outcome,
    visitedNodes: context.visitedNodes,
  };
}

export const callFlowExecutorService = {
  initializeExecution,
  processCurrentNode,
  executeFlowTest,
  parseVariables,
  evaluateCondition,
};

export default callFlowExecutorService;
