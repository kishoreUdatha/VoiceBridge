import { prisma } from '../config/database';
import { NotFoundError } from '../utils/errors';
import {
  QueueRoutingStrategy,
  OverflowAction,
  AgentStatus,
  QueueEntryStatus,
  Prisma
} from '@prisma/client';

interface CreateQueueInput {
  organizationId: string;
  name: string;
  description?: string;
  routingStrategy?: QueueRoutingStrategy;
  maxWaitTime?: number;
  maxQueueSize?: number;
  holdMusicUrl?: string;
  holdMessage?: string;
  holdMessageInterval?: number;
  announcePosition?: boolean;
  announceWaitTime?: boolean;
  overflowAction?: OverflowAction;
  overflowDestination?: string;
  slaSeconds?: number;
}

interface UpdateQueueInput {
  name?: string;
  description?: string;
  isActive?: boolean;
  routingStrategy?: QueueRoutingStrategy;
  maxWaitTime?: number;
  maxQueueSize?: number;
  holdMusicUrl?: string;
  holdMessage?: string;
  holdMessageInterval?: number;
  announcePosition?: boolean;
  announceWaitTime?: boolean;
  overflowAction?: OverflowAction;
  overflowDestination?: string;
  slaSeconds?: number;
}

interface AddToQueueInput {
  queueId: string;
  callerNumber: string;
  callerId?: string;
  leadId?: string;
  inboundCallId?: string;
  priority?: number;
  ivrData?: Record<string, unknown>;
}

interface QueueMemberInput {
  queueId: string;
  userId: string;
  priority?: number;
  maxConcurrentCalls?: number;
  wrapUpTime?: number;
  skills?: string[];
}

export class CallQueueService {
  // === Queue CRUD ===
  async createQueue(input: CreateQueueInput) {
    return prisma.callQueue.create({
      data: {
        organizationId: input.organizationId,
        name: input.name,
        description: input.description,
        routingStrategy: input.routingStrategy ?? QueueRoutingStrategy.ROUND_ROBIN,
        maxWaitTime: input.maxWaitTime ?? 300,
        maxQueueSize: input.maxQueueSize ?? 50,
        holdMusicUrl: input.holdMusicUrl,
        holdMessage: input.holdMessage,
        holdMessageInterval: input.holdMessageInterval ?? 60,
        announcePosition: input.announcePosition ?? true,
        announceWaitTime: input.announceWaitTime ?? true,
        overflowAction: input.overflowAction ?? OverflowAction.VOICEMAIL,
        overflowDestination: input.overflowDestination,
        slaSeconds: input.slaSeconds ?? 30,
      },
    });
  }

  async updateQueue(id: string, organizationId: string, input: UpdateQueueInput) {
    const queue = await this.getQueueById(id, organizationId);

    return prisma.callQueue.update({
      where: { id: queue.id },
      data: input,
    });
  }

  async deleteQueue(id: string, organizationId: string) {
    const queue = await this.getQueueById(id, organizationId);

    // Check for active entries
    const activeEntries = await prisma.queueEntry.count({
      where: {
        queueId: queue.id,
        status: { in: ['WAITING', 'RINGING'] },
      },
    });

    if (activeEntries > 0) {
      throw new Error('Cannot delete queue with active callers');
    }

    return prisma.callQueue.delete({
      where: { id: queue.id },
    });
  }

  async getQueueById(id: string, organizationId: string) {
    const queue = await prisma.callQueue.findFirst({
      where: { id, organizationId },
      include: {
        members: {
          where: { isActive: true },
          orderBy: { priority: 'asc' },
        },
        entries: {
          where: { status: { in: ['WAITING', 'RINGING'] } },
          orderBy: { position: 'asc' },
        },
        schedules: true,
        _count: {
          select: { entries: true, inboundCalls: true },
        },
      },
    });

    if (!queue) {
      throw new NotFoundError('Queue not found');
    }

    return queue;
  }

  async getQueues(organizationId: string, isActive?: boolean) {
    const where: Prisma.CallQueueWhereInput = { organizationId };

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    return prisma.callQueue.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        members: {
          where: { isActive: true },
        },
        _count: {
          select: {
            entries: { where: { status: 'WAITING' } },
            inboundCalls: true,
          },
        },
      },
    });
  }

  // === Queue Entry Management ===
  async addToQueue(input: AddToQueueInput): Promise<{
    entry: Awaited<ReturnType<typeof prisma.queueEntry.create>>;
    position: number;
    estimatedWaitTime: number;
  }> {
    const queue = await prisma.callQueue.findUnique({
      where: { id: input.queueId },
      include: {
        entries: {
          where: { status: 'WAITING' },
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!queue) {
      throw new NotFoundError('Queue not found');
    }

    // Check queue capacity
    if (queue.entries.length >= queue.maxQueueSize) {
      throw new Error('Queue is full');
    }

    // Calculate position
    const position = queue.entries.length + 1;

    // Estimate wait time based on avg handle time
    const estimatedWaitTime = position * (queue.avgHandleTime || 120);

    const entry = await prisma.queueEntry.create({
      data: {
        queueId: input.queueId,
        callerNumber: input.callerNumber,
        callerId: input.callerId,
        leadId: input.leadId,
        inboundCallId: input.inboundCallId,
        position,
        priority: input.priority ?? 5,
        ivrData: (input.ivrData ?? {}) as Prisma.InputJsonValue,
      },
    });

    // Update queue stats
    await prisma.callQueue.update({
      where: { id: input.queueId },
      data: { totalCalls: { increment: 1 } },
    });

    return { entry, position, estimatedWaitTime };
  }

  async updateQueueEntry(
    entryId: string,
    status: QueueEntryStatus,
    assignedAgentId?: string
  ) {
    const entry = await prisma.queueEntry.findUnique({
      where: { id: entryId },
    });

    if (!entry) {
      throw new NotFoundError('Queue entry not found');
    }

    const updateData: Prisma.QueueEntryUpdateInput = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'RINGING' || status === 'CONNECTED') {
      updateData.assignedAgentId = assignedAgentId;
      updateData.assignedAt = new Date();
    }

    if (status === 'CONNECTED') {
      updateData.answeredAt = new Date();

      // Update queue stats
      await prisma.callQueue.update({
        where: { id: entry.queueId },
        data: { answeredCalls: { increment: 1 } },
      });

      // Check SLA
      const queue = await prisma.callQueue.findUnique({
        where: { id: entry.queueId },
      });

      if (queue) {
        const waitTime = Math.floor(
          (Date.now() - entry.enteredAt.getTime()) / 1000
        );

        if (waitTime <= queue.slaSeconds) {
          // Met SLA - update service level
          const newServiceLevel =
            (queue.serviceLevel * queue.answeredCalls + 100) /
            (queue.answeredCalls + 1);

          await prisma.callQueue.update({
            where: { id: queue.id },
            data: { serviceLevel: newServiceLevel },
          });
        }
      }
    }

    if (status === 'ABANDONED') {
      updateData.abandonedAt = new Date();

      await prisma.callQueue.update({
        where: { id: entry.queueId },
        data: { abandonedCalls: { increment: 1 } },
      });
    }

    return prisma.queueEntry.update({
      where: { id: entryId },
      data: updateData,
    });
  }

  async removeFromQueue(entryId: string) {
    const entry = await prisma.queueEntry.findUnique({
      where: { id: entryId },
    });

    if (!entry) {
      throw new NotFoundError('Queue entry not found');
    }

    // Update positions of entries behind this one
    await prisma.queueEntry.updateMany({
      where: {
        queueId: entry.queueId,
        position: { gt: entry.position },
        status: 'WAITING',
      },
      data: {
        position: { decrement: 1 },
      },
    });

    return prisma.queueEntry.delete({
      where: { id: entryId },
    });
  }

  // === Call Routing ===
  async routeCall(queueId: string): Promise<{
    agentUserId: string;
    agentName: string;
  } | null> {
    const queue = await prisma.callQueue.findUnique({
      where: { id: queueId },
      include: {
        members: {
          where: {
            isActive: true,
            status: AgentStatus.AVAILABLE,
          },
          orderBy: { priority: 'asc' },
        },
      },
    });

    if (!queue || queue.members.length === 0) {
      return null;
    }

    let selectedAgent = null;

    switch (queue.routingStrategy) {
      case 'ROUND_ROBIN':
        // Get agent with oldest lastCallAt
        selectedAgent = queue.members.sort((a, b) =>
          (a.lastCallAt?.getTime() ?? 0) - (b.lastCallAt?.getTime() ?? 0)
        )[0];
        break;

      case 'LONGEST_IDLE':
        // Get agent with longest idle time
        selectedAgent = queue.members.sort((a, b) =>
          (a.statusChangedAt?.getTime() ?? 0) - (b.statusChangedAt?.getTime() ?? 0)
        )[0];
        break;

      case 'LEAST_CALLS':
        // Get agent with fewest calls today
        selectedAgent = queue.members.sort((a, b) =>
          a.callsToday - b.callsToday
        )[0];
        break;

      case 'PRIORITY_BASED':
        // Already sorted by priority
        selectedAgent = queue.members[0];
        break;

      case 'RANDOM':
        selectedAgent = queue.members[
          Math.floor(Math.random() * queue.members.length)
        ];
        break;

      case 'SKILLS_BASED':
        // Get first available agent with required skills
        // Skills matching is done at a higher level
        selectedAgent = queue.members[0];
        break;

      default:
        selectedAgent = queue.members[0];
    }

    if (!selectedAgent) {
      return null;
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: selectedAgent.userId },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!user) {
      return null;
    }

    // Update agent status
    await this.updateAgentStatus(queueId, selectedAgent.userId, AgentStatus.ON_CALL);

    return {
      agentUserId: user.id,
      agentName: `${user.firstName} ${user.lastName}`,
    };
  }

  // === Transfer Functions ===
  async warmTransfer(
    entryId: string,
    toAgentUserId: string,
    consultFirst: boolean = true
  ) {
    const entry = await prisma.queueEntry.findUnique({
      where: { id: entryId },
    });

    if (!entry) {
      throw new NotFoundError('Queue entry not found');
    }

    // Update entry with new agent
    return prisma.queueEntry.update({
      where: { id: entryId },
      data: {
        assignedAgentId: toAgentUserId,
        assignedAt: new Date(),
      },
    });
  }

  async coldTransfer(entryId: string, toNumber: string) {
    const entry = await prisma.queueEntry.findUnique({
      where: { id: entryId },
    });

    if (!entry) {
      throw new NotFoundError('Queue entry not found');
    }

    // Mark entry as transferred
    return prisma.queueEntry.update({
      where: { id: entryId },
      data: {
        status: 'OVERFLOW',
      },
    });
  }

  // === Queue Member Management ===
  async addMember(input: QueueMemberInput) {
    return prisma.queueMember.create({
      data: {
        queueId: input.queueId,
        userId: input.userId,
        priority: input.priority ?? 1,
        maxConcurrentCalls: input.maxConcurrentCalls ?? 1,
        wrapUpTime: input.wrapUpTime ?? 30,
        skills: input.skills ?? [],
        status: AgentStatus.OFFLINE,
      },
    });
  }

  async removeMember(queueId: string, userId: string) {
    const member = await prisma.queueMember.findFirst({
      where: { queueId, userId },
    });

    if (!member) {
      throw new NotFoundError('Queue member not found');
    }

    return prisma.queueMember.update({
      where: { id: member.id },
      data: { isActive: false },
    });
  }

  async updateAgentStatus(queueId: string, userId: string, status: AgentStatus) {
    const member = await prisma.queueMember.findFirst({
      where: { queueId, userId, isActive: true },
    });

    if (!member) {
      throw new NotFoundError('Queue member not found');
    }

    return prisma.queueMember.update({
      where: { id: member.id },
      data: {
        status,
        statusChangedAt: new Date(),
        lastCallAt: status === AgentStatus.ON_CALL ? new Date() : member.lastCallAt,
        callsToday: status === AgentStatus.ON_CALL
          ? { increment: 1 }
          : member.callsToday,
      },
    });
  }

  async getAgentQueues(userId: string) {
    return prisma.queueMember.findMany({
      where: { userId, isActive: true },
      include: {
        queue: {
          include: {
            _count: {
              select: {
                entries: { where: { status: 'WAITING' } },
              },
            },
          },
        },
      },
    });
  }

  // === Schedule Management ===
  async setSchedule(
    queueId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    timezone: string = 'Asia/Kolkata'
  ) {
    return prisma.queueSchedule.upsert({
      where: {
        queueId_dayOfWeek: { queueId, dayOfWeek },
      },
      create: {
        queueId,
        dayOfWeek,
        startTime,
        endTime,
        timezone,
      },
      update: {
        startTime,
        endTime,
        timezone,
      },
    });
  }

  async isQueueOpen(queueId: string): Promise<boolean> {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentTime = now.toTimeString().slice(0, 5);

    const schedule = await prisma.queueSchedule.findFirst({
      where: {
        queueId,
        dayOfWeek,
        isActive: true,
      },
    });

    if (!schedule) {
      return true; // No schedule = always open
    }

    return currentTime >= schedule.startTime && currentTime <= schedule.endTime;
  }

  // === Real-time Stats ===
  async getQueueStats(queueId: string) {
    const queue = await prisma.callQueue.findUnique({
      where: { id: queueId },
      include: {
        entries: {
          where: { status: 'WAITING' },
        },
        members: {
          where: { isActive: true },
        },
      },
    });

    if (!queue) {
      throw new NotFoundError('Queue not found');
    }

    const waitingCount = queue.entries.length;
    const availableAgents = queue.members.filter(
      m => m.status === AgentStatus.AVAILABLE
    ).length;
    const busyAgents = queue.members.filter(
      m => m.status === AgentStatus.ON_CALL
    ).length;

    const oldestEntry = queue.entries[0];
    const longestWaitTime = oldestEntry
      ? Math.floor((Date.now() - oldestEntry.enteredAt.getTime()) / 1000)
      : 0;

    const estimatedWaitTime = availableAgents > 0
      ? Math.ceil(waitingCount / availableAgents) * (queue.avgHandleTime || 120)
      : waitingCount * (queue.avgHandleTime || 120);

    return {
      queueId,
      name: queue.name,
      waitingCount,
      availableAgents,
      busyAgents,
      totalAgents: queue.members.length,
      longestWaitTime,
      estimatedWaitTime,
      serviceLevel: queue.serviceLevel,
      avgWaitTime: queue.avgWaitTime,
      avgHandleTime: queue.avgHandleTime,
    };
  }
}

export const callQueueService = new CallQueueService();
