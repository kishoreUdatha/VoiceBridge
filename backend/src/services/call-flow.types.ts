/**
 * Call Flow Types - Shared interfaces for call flow services
 */

import { CallOutcome } from '@prisma/client';

/**
 * Node Types for call flow visualization and execution
 */
export interface CallFlowNode {
  id: string;
  type: 'START' | 'GREETING' | 'QUESTION' | 'CONDITION' | 'AI_RESPONSE' | 'ACTION' | 'TRANSFER' | 'END';
  position: { x: number; y: number };
  data: {
    label: string;
    message?: string;           // For GREETING, AI_RESPONSE, END
    question?: string;          // For QUESTION
    variableName?: string;      // Variable to store response
    variableType?: 'text' | 'number' | 'email' | 'phone' | 'date' | 'boolean' | 'choice';
    choices?: string[];         // For choice type questions
    required?: boolean;
    validation?: string;        // Validation regex
    condition?: {               // For CONDITION node
      variable: string;
      operator: 'equals' | 'contains' | 'greater' | 'less' | 'exists' | 'not_exists';
      value: string;
    };
    actionType?: string;        // For ACTION node
    actionConfig?: Record<string, any>;
    transferNumber?: string;    // For TRANSFER node
    transferMessage?: string;
    outcomeType?: CallOutcome;  // For END node
    aiPrompt?: string;          // For AI_RESPONSE - dynamic AI response
    maxRetries?: number;        // Retry count for questions
    retryMessage?: string;
  };
}

/**
 * Edge connecting two nodes in a call flow
 */
export interface CallFlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;  // For condition branches: 'true' or 'false'
  label?: string;
}

/**
 * Input for creating a call flow
 */
export interface CreateCallFlowInput {
  name: string;
  description?: string;
  industry?: string;
  nodes: CallFlowNode[];
  edges: CallFlowEdge[];
  variables?: Array<{ name: string; type: string; defaultValue?: string }>;
  defaultGreeting?: string;
  defaultFallback?: string;
  defaultTransfer?: string;
  defaultEnd?: string;
  successOutcomes?: CallOutcome[];
  failureOutcomes?: CallOutcome[];
  isActive?: boolean;
}

/**
 * Execution context for tracking call flow state during a call
 */
export interface CallFlowExecutionContext {
  callFlowId: string;
  sessionId: string;
  currentNodeId: string;
  visitedNodes: string[];
  variables: Record<string, any>;
  transcript: Array<{ role: string; content: string; timestamp: Date; nodeId?: string }>;
  startedAt: Date;
  lastNodeAt: Date;
  retryCount: number;
  maxRetries: number;
  outcome?: CallOutcome;
  shouldTransfer: boolean;
  transferConfig?: any;
  shouldEnd: boolean;
  endMessage?: string;
}

/**
 * Result from processing a node
 */
export interface NodeProcessingResult {
  response?: string;
  nextNodeId?: string;
  shouldWaitForInput: boolean;
  shouldEnd: boolean;
  shouldTransfer: boolean;
  transferConfig?: any;
  outcome?: CallOutcome;
  variableCollected?: { name: string; value: any };
  action?: { type: string; data: any };
}

/**
 * Input for logging call flow execution
 */
export interface CallFlowLogInput {
  sessionId?: string;
  leadId?: string;
  phoneNumber: string;
  direction?: string;
  nodesVisited?: string[];
  variablesCollected?: Record<string, any>;
  outcome?: CallOutcome;
  outcomeReason?: string;
  sentiment?: string;
  transcript?: Array<{ role: string; content: string; timestamp: Date }>;
  summary?: string;
  actionsTaken?: Array<{ type: string; data: any; timestamp: Date }>;
  duration?: number;
}

/**
 * Analytics result for a call flow
 */
export interface CallFlowAnalytics {
  totalCalls: number;
  successfulCalls: number;
  conversionRate: number;
  avgDuration: number;
  avgQualityScore: number;
  outcomes: Record<string, number>;
  sentiments: Record<string, number>;
}

/**
 * Test execution result
 */
export interface FlowTestResult {
  transcript: Array<{ role: string; content: string }>;
  variables: Record<string, any>;
  outcome?: CallOutcome;
  visitedNodes: string[];
}
