import { prisma } from '../config/database';
import { NotFoundError } from '../utils/errors';
import { IvrNodeType, Prisma } from '@prisma/client';

interface CreateIvrFlowInput {
  organizationId: string;
  name: string;
  description?: string;
  welcomeMessage?: string;
  timeoutSeconds?: number;
  maxRetries?: number;
  invalidInputMessage?: string;
}

interface UpdateIvrFlowInput {
  name?: string;
  description?: string;
  isActive?: boolean;
  isDefault?: boolean;
  nodes?: Prisma.InputJsonValue;
  edges?: Prisma.InputJsonValue;
  welcomeMessage?: string;
  timeoutSeconds?: number;
  maxRetries?: number;
  invalidInputMessage?: string;
}

interface CreateIvrNodeInput {
  organizationId: string;
  name: string;
  type: IvrNodeType;
  config?: Prisma.InputJsonValue;
  audioUrl?: string;
  ttsText?: string;
  ttsVoice?: string;
  timeoutSeconds?: number;
  timeoutNextNodeId?: string;
  invalidInputNextNodeId?: string;
}

interface IvrFlowFilter {
  organizationId: string;
  isActive?: boolean;
  search?: string;
}

interface IvrExecutionContext {
  callSid: string;
  callerNumber: string;
  calledNumber: string;
  currentNodeId?: string;
  variables: Record<string, unknown>;
  inputs: string[];
}

export class IvrService {
  // === IVR Flow CRUD ===
  async createFlow(input: CreateIvrFlowInput) {
    return prisma.ivrFlow.create({
      data: {
        organizationId: input.organizationId,
        name: input.name,
        description: input.description,
        welcomeMessage: input.welcomeMessage,
        timeoutSeconds: input.timeoutSeconds ?? 10,
        maxRetries: input.maxRetries ?? 3,
        invalidInputMessage: input.invalidInputMessage,
        nodes: [],
        edges: [],
      },
    });
  }

  async updateFlow(id: string, organizationId: string, input: UpdateIvrFlowInput) {
    const flow = await this.getFlowById(id, organizationId);

    return prisma.ivrFlow.update({
      where: { id: flow.id },
      data: {
        ...input,
        version: input.nodes || input.edges ? { increment: 1 } : undefined,
        updatedAt: new Date(),
      },
    });
  }

  async publishFlow(id: string, organizationId: string) {
    const flow = await this.getFlowById(id, organizationId);

    return prisma.ivrFlow.update({
      where: { id: flow.id },
      data: {
        publishedAt: new Date(),
        isActive: true,
      },
    });
  }

  async deleteFlow(id: string, organizationId: string) {
    const flow = await this.getFlowById(id, organizationId);

    // Check if flow is assigned to any phone numbers
    const assignedNumbers = await prisma.ivrPhoneNumber.count({
      where: { flowId: flow.id },
    });

    if (assignedNumbers > 0) {
      throw new Error('Cannot delete flow that is assigned to phone numbers');
    }

    return prisma.ivrFlow.delete({
      where: { id: flow.id },
    });
  }

  async getFlowById(id: string, organizationId: string) {
    const flow = await prisma.ivrFlow.findFirst({
      where: { id, organizationId },
      include: {
        phoneNumbers: true,
      },
    });

    if (!flow) {
      throw new NotFoundError('IVR flow not found');
    }

    return flow;
  }

  async getFlows(filter: IvrFlowFilter, page = 1, limit = 20) {
    const where: Prisma.IvrFlowWhereInput = {
      organizationId: filter.organizationId,
    };

    if (filter.isActive !== undefined) {
      where.isActive = filter.isActive;
    }

    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const [flows, total] = await Promise.all([
      prisma.ivrFlow.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          phoneNumbers: true,
          _count: {
            select: { callLogs: true },
          },
        },
      }),
      prisma.ivrFlow.count({ where }),
    ]);

    return { flows, total, page, limit };
  }

  // === Phone Number Mapping ===
  async assignPhoneNumber(
    organizationId: string,
    phoneNumber: string,
    flowId: string,
    phoneNumberId?: string
  ) {
    // Verify flow exists
    await this.getFlowById(flowId, organizationId);

    return prisma.ivrPhoneNumber.upsert({
      where: {
        organizationId_phoneNumber: { organizationId, phoneNumber },
      },
      create: {
        organizationId,
        phoneNumber,
        phoneNumberId,
        flowId,
      },
      update: {
        flowId,
        phoneNumberId,
        isActive: true,
      },
    });
  }

  async unassignPhoneNumber(organizationId: string, phoneNumber: string) {
    const mapping = await prisma.ivrPhoneNumber.findFirst({
      where: { organizationId, phoneNumber },
    });

    if (!mapping) {
      throw new NotFoundError('Phone number mapping not found');
    }

    return prisma.ivrPhoneNumber.update({
      where: { id: mapping.id },
      data: { isActive: false },
    });
  }

  async getFlowForNumber(phoneNumber: string) {
    const mapping = await prisma.ivrPhoneNumber.findFirst({
      where: {
        phoneNumber,
        isActive: true,
      },
      include: {
        flow: true,
      },
    });

    return mapping?.flow ?? null;
  }

  // === IVR Node Management ===
  async createNode(input: CreateIvrNodeInput) {
    return prisma.ivrNode.create({
      data: {
        organizationId: input.organizationId,
        name: input.name,
        type: input.type,
        config: input.config ?? {},
        audioUrl: input.audioUrl,
        ttsText: input.ttsText,
        ttsVoice: input.ttsVoice ?? 'alloy',
        timeoutSeconds: input.timeoutSeconds ?? 10,
        timeoutNextNodeId: input.timeoutNextNodeId,
        invalidInputNextNodeId: input.invalidInputNextNodeId,
      },
    });
  }

  async getNodes(organizationId: string, type?: IvrNodeType) {
    const where: Prisma.IvrNodeWhereInput = { organizationId };

    if (type) {
      where.type = type;
    }

    return prisma.ivrNode.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  // === IVR Execution ===
  async executeFlow(flowId: string, context: IvrExecutionContext) {
    const flow = await prisma.ivrFlow.findUnique({
      where: { id: flowId },
    });

    if (!flow) {
      throw new NotFoundError('IVR flow not found');
    }

    const nodes = flow.nodes as unknown as Array<{
      position: { x: number; y: number };
      id: string;
      type: IvrNodeType;
      data: Record<string, unknown>;
    }>;

    const edges = flow.edges as unknown as Array<{
      id: string;
      source: string;
      target: string;
      sourceHandle?: string;
    }>;

    // Find start node (first node or node with type START)
    let currentNode = context.currentNodeId
      ? nodes.find(n => n.id === context.currentNodeId)
      : nodes.find(n => n.type === 'PLAY' || !edges.some(e => e.target === n.id));

    if (!currentNode) {
      throw new Error('No start node found in IVR flow');
    }

    return this.processNode(currentNode, nodes, edges, context);
  }

  private async processNode(
    node: { id: string; type: IvrNodeType; data: Record<string, unknown> },
    nodes: Array<{ id: string; type: IvrNodeType; data: Record<string, unknown>; position: { x: number; y: number } }>,
    edges: Array<{ id: string; source: string; target: string; sourceHandle?: string }>,
    context: IvrExecutionContext
  ): Promise<{
    action: string;
    data: Record<string, unknown>;
    nextNodeId?: string;
  }> {
    switch (node.type) {
      case 'PLAY':
        return {
          action: 'play',
          data: {
            text: node.data.ttsText,
            audioUrl: node.data.audioUrl,
          },
          nextNodeId: this.findNextNode(node.id, edges),
        };

      case 'MENU':
        return {
          action: 'gather',
          data: {
            text: node.data.menuText,
            options: node.data.options,
            numDigits: 1,
            timeout: node.data.timeout ?? 10,
          },
        };

      case 'GATHER':
        return {
          action: 'gather',
          data: {
            text: node.data.prompt,
            numDigits: node.data.numDigits ?? 4,
            finishOnKey: node.data.finishOnKey ?? '#',
            timeout: node.data.timeout ?? 10,
          },
        };

      case 'QUEUE':
        return {
          action: 'queue',
          data: {
            queueId: node.data.queueId,
            holdMusic: node.data.holdMusicUrl,
            announcePosition: node.data.announcePosition ?? true,
          },
        };

      case 'TRANSFER':
        return {
          action: 'transfer',
          data: {
            type: node.data.transferType ?? 'cold',
            number: node.data.number,
            sipUri: node.data.sipUri,
          },
        };

      case 'VOICEMAIL':
        return {
          action: 'voicemail',
          data: {
            mailboxId: node.data.mailboxId,
            greeting: node.data.greeting,
            maxDuration: node.data.maxDuration ?? 120,
          },
        };

      case 'WEBHOOK':
        return {
          action: 'webhook',
          data: {
            url: node.data.webhookUrl,
            method: node.data.method ?? 'POST',
          },
          nextNodeId: this.findNextNode(node.id, edges),
        };

      case 'END':
        return {
          action: 'hangup',
          data: {
            message: node.data.message,
          },
        };

      default:
        return {
          action: 'continue',
          data: {},
          nextNodeId: this.findNextNode(node.id, edges),
        };
    }
  }

  private findNextNode(
    currentNodeId: string,
    edges: Array<{ source: string; target: string; sourceHandle?: string }>,
    handle?: string
  ): string | undefined {
    const edge = edges.find(e =>
      e.source === currentNodeId && (!handle || e.sourceHandle === handle)
    );
    return edge?.target;
  }

  async handleDtmfInput(flowId: string, nodeId: string, digit: string, context: IvrExecutionContext) {
    const flow = await prisma.ivrFlow.findUnique({
      where: { id: flowId },
    });

    if (!flow) {
      throw new NotFoundError('IVR flow not found');
    }

    const nodes = flow.nodes as unknown as Array<{
      position: { x: number; y: number };
      id: string;
      type: IvrNodeType;
      data: Record<string, unknown>;
    }>;

    const edges = flow.edges as unknown as Array<{
      id: string;
      source: string;
      target: string;
      sourceHandle?: string;
    }>;

    const currentNode = nodes.find(n => n.id === nodeId);

    if (!currentNode) {
      throw new Error('Node not found');
    }

    // Find the edge for this digit
    const nextEdge = edges.find(e =>
      e.source === nodeId && e.sourceHandle === `digit-${digit}`
    );

    if (!nextEdge) {
      // No match - use invalid input handling
      const invalidEdge = edges.find(e =>
        e.source === nodeId && e.sourceHandle === 'invalid'
      );

      if (invalidEdge) {
        const nextNode = nodes.find(n => n.id === invalidEdge.target);
        if (nextNode) {
          return this.processNode(nextNode, nodes, edges, context);
        }
      }

      return {
        action: 'replay',
        data: {
          message: 'Invalid input. Please try again.',
        },
      };
    }

    const nextNode = nodes.find(n => n.id === nextEdge.target);
    if (!nextNode) {
      throw new Error('Next node not found');
    }

    // Update context
    context.inputs.push(digit);
    context.currentNodeId = nextNode.id;

    return this.processNode(nextNode, nodes, edges, context);
  }

  // === Statistics ===
  async updateFlowStats(flowId: string, completed: boolean, duration: number) {
    const flow = await prisma.ivrFlow.findUnique({
      where: { id: flowId },
    });

    if (!flow) return;

    const newTotalCalls = flow.totalCalls + 1;
    const newCompletedCalls = flow.completedCalls + (completed ? 1 : 0);
    const newAvgDuration = Math.round(
      (flow.avgDuration * flow.totalCalls + duration) / newTotalCalls
    );

    await prisma.ivrFlow.update({
      where: { id: flowId },
      data: {
        totalCalls: newTotalCalls,
        completedCalls: newCompletedCalls,
        avgDuration: newAvgDuration,
      },
    });
  }
}

export const ivrService = new IvrService();
