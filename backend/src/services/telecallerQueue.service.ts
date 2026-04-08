import { prisma } from '../config/database';
import { TelecallerQueueStatus, TelecallerOutcome, CallOutcome } from '@prisma/client';

interface AddToQueueParams {
  organizationId: string;
  leadId?: string;
  outboundCallId?: string;
  phoneNumber: string;
  contactName?: string;
  email?: string;
  aiCallSummary?: string;
  aiCallSentiment?: string;
  aiCallOutcome?: CallOutcome;
  aiCallDuration?: number;
  qualification?: any;
  reason?: string;
  priority?: number;
}

interface UpdateQueueItemParams {
  status?: TelecallerQueueStatus;
  telecallerNotes?: string;
  telecallerOutcome?: TelecallerOutcome;
  callbackScheduled?: Date;
}

class TelecallerQueueService {
  /**
   * Add a lead to the telecaller queue (typically after AI call)
   */
  async addToQueue(params: AddToQueueParams) {
    // Calculate priority based on AI outcome
    let priority = params.priority || 5;
    if (params.aiCallOutcome === 'INTERESTED') priority = 1;
    else if (params.aiCallOutcome === 'CALLBACK_REQUESTED') priority = 2;
    else if (params.aiCallOutcome === 'NEEDS_FOLLOWUP') priority = 3;

    // Determine reason
    let reason = params.reason;
    if (!reason && params.aiCallOutcome) {
      const reasonMap: Record<string, string> = {
        'INTERESTED': 'Lead showed interest during AI call',
        'CALLBACK_REQUESTED': 'Lead requested callback',
        'NEEDS_FOLLOWUP': 'AI recommended follow-up',
        'CONVERTED': 'Potential conversion opportunity',
      };
      reason = reasonMap[params.aiCallOutcome] || 'AI qualified lead';
    }

    return prisma.telecallerQueue.create({
      data: {
        organizationId: params.organizationId,
        leadId: params.leadId,
        outboundCallId: params.outboundCallId,
        phoneNumber: params.phoneNumber,
        contactName: params.contactName,
        email: params.email,
        aiCallSummary: params.aiCallSummary,
        aiCallSentiment: params.aiCallSentiment,
        aiCallOutcome: params.aiCallOutcome,
        aiCallDuration: params.aiCallDuration,
        qualification: params.qualification || {},
        priority,
        reason,
        status: 'PENDING',
      },
    });
  }

  /**
   * Get queue items for a telecaller
   */
  async getQueue(
    organizationId: string,
    userId?: string,
    options?: {
      status?: TelecallerQueueStatus[];
      page?: number;
      limit?: number;
      showAll?: boolean;
      userRole?: string;
    }
  ) {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      organizationId,
    };

    // Filter by status
    if (options?.status && options.status.length > 0) {
      where.status = { in: options.status };
    } else {
      // Default: show pending and claimed items
      where.status = { in: ['PENDING', 'CLAIMED', 'CALLBACK'] };
    }

    // Role-based filtering
    const normalizedRole = options?.userRole?.toLowerCase().replace('_', '');

    if (normalizedRole === 'teamlead' && userId) {
      // Team Lead: see queue items assigned to their team members
      const teamMembers = await prisma.user.findMany({
        where: {
          organizationId,
          managerId: userId,
          isActive: true,
        },
        select: { id: true },
      });
      const teamMemberIds = teamMembers.map(m => m.id);

      if (teamMemberIds.length > 0) {
        where.OR = [
          { assignedToId: null }, // Unassigned items
          { assignedToId: { in: teamMemberIds } }, // Team members' items
        ];
      } else {
        where.assignedToId = null; // No team, show only unassigned
      }
    } else if (normalizedRole === 'manager' && userId) {
      // Manager: see queue items for their team leads' teams
      const teamLeads = await prisma.user.findMany({
        where: {
          organizationId,
          managerId: userId,
          role: { slug: 'team_lead' },
          isActive: true,
        },
        select: { id: true },
      });
      const teamLeadIds = teamLeads.map(tl => tl.id);

      const allTeamMembers = await prisma.user.findMany({
        where: {
          organizationId,
          OR: [
            { managerId: { in: teamLeadIds } },
            { managerId: userId },
          ],
          isActive: true,
        },
        select: { id: true },
      });
      const allMemberIds = allTeamMembers.map(m => m.id);

      if (allMemberIds.length > 0) {
        where.OR = [
          { assignedToId: null },
          { assignedToId: { in: allMemberIds } },
        ];
      }
      // If no members, manager sees all (no filter)
    } else if (normalizedRole === 'telecaller' || normalizedRole === 'counselor') {
      // Telecaller/Counselor: only see unassigned or their own items
      if (userId) {
        where.OR = [
          { assignedToId: null },
          { assignedToId: userId },
        ];
      }
    } else if (!options?.showAll && userId) {
      // Default behavior for other roles if not showAll
      where.OR = [
        { assignedToId: null },
        { assignedToId: userId },
      ];
    }
    // Admin with showAll sees everything

    const [items, total] = await Promise.all([
      prisma.telecallerQueue.findMany({
        where,
        orderBy: [
          { priority: 'asc' },
          { addedAt: 'asc' },
        ],
        skip,
        take: limit,
        include: {
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.telecallerQueue.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Claim a queue item
   */
  async claimItem(itemId: string, userId: string) {
    const item = await prisma.telecallerQueue.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new Error('Queue item not found');
    }

    if (item.status !== 'PENDING' && item.assignedToId !== userId) {
      throw new Error('Item is already claimed by another telecaller');
    }

    return prisma.telecallerQueue.update({
      where: { id: itemId },
      data: {
        assignedToId: userId,
        assignedAt: new Date(),
        claimedAt: new Date(),
        status: 'CLAIMED',
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Update queue item status/outcome
   */
  async updateItem(itemId: string, userId: string, params: UpdateQueueItemParams) {
    const item = await prisma.telecallerQueue.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new Error('Queue item not found');
    }

    if (item.assignedToId && item.assignedToId !== userId) {
      throw new Error('Item is assigned to another telecaller');
    }

    const updateData: any = { ...params };

    // If completing, set completedAt
    if (params.status === 'COMPLETED' || params.telecallerOutcome) {
      updateData.completedAt = new Date();
    }

    // If setting callback, change status
    if (params.callbackScheduled) {
      updateData.status = 'CALLBACK';
    }

    return prisma.telecallerQueue.update({
      where: { id: itemId },
      data: updateData,
      include: {
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Release/unclaim an item
   */
  async releaseItem(itemId: string, userId: string) {
    const item = await prisma.telecallerQueue.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new Error('Queue item not found');
    }

    if (item.assignedToId !== userId) {
      throw new Error('You cannot release an item you did not claim');
    }

    return prisma.telecallerQueue.update({
      where: { id: itemId },
      data: {
        assignedToId: null,
        assignedAt: null,
        claimedAt: null,
        status: 'PENDING',
      },
    });
  }

  /**
   * Skip an item (put back in queue with lower priority)
   */
  async skipItem(itemId: string, userId: string, reason?: string) {
    const item = await prisma.telecallerQueue.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new Error('Queue item not found');
    }

    return prisma.telecallerQueue.update({
      where: { id: itemId },
      data: {
        assignedToId: null,
        assignedAt: null,
        claimedAt: null,
        status: 'PENDING',
        priority: Math.min(item.priority + 1, 10), // Lower priority
        telecallerNotes: reason ? `Skipped: ${reason}` : item.telecallerNotes,
      },
    });
  }

  /**
   * Get queue statistics
   */
  async getStats(organizationId: string, userId?: string) {
    const baseWhere: any = { organizationId };

    const [
      totalPending,
      totalClaimed,
      totalCompleted,
      totalCallback,
      myItems,
      highPriority,
    ] = await Promise.all([
      prisma.telecallerQueue.count({
        where: { ...baseWhere, status: 'PENDING' },
      }),
      prisma.telecallerQueue.count({
        where: { ...baseWhere, status: 'CLAIMED' },
      }),
      prisma.telecallerQueue.count({
        where: {
          ...baseWhere,
          status: 'COMPLETED',
          completedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)), // Today
          },
        },
      }),
      prisma.telecallerQueue.count({
        where: { ...baseWhere, status: 'CALLBACK' },
      }),
      userId
        ? prisma.telecallerQueue.count({
            where: {
              ...baseWhere,
              assignedToId: userId,
              status: { in: ['CLAIMED', 'CALLBACK'] },
            },
          })
        : 0,
      prisma.telecallerQueue.count({
        where: {
          ...baseWhere,
          status: 'PENDING',
          priority: { lte: 2 },
        },
      }),
    ]);

    return {
      totalPending,
      totalClaimed,
      totalCompleted,
      totalCallback,
      myItems,
      highPriority,
    };
  }

  /**
   * Get single queue item with details
   */
  async getItem(itemId: string) {
    return prisma.telecallerQueue.findUnique({
      where: { id: itemId },
      include: {
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Auto-add to queue after AI call completion
   * Call this from the outbound call service when a call completes
   */
  async processAICallCompletion(outboundCallId: string) {
    const call = await prisma.outboundCall.findUnique({
      where: { id: outboundCallId },
      include: {
        agent: true,
        contact: true,
      },
    });

    if (!call) return null;

    // Only add to queue for certain outcomes
    const queueableOutcomes: CallOutcome[] = [
      'INTERESTED',
      'CALLBACK_REQUESTED',
      'NEEDS_FOLLOWUP',
    ];

    if (!call.outcome || !queueableOutcomes.includes(call.outcome)) {
      return null;
    }

    // Check if already in queue
    const existing = await prisma.telecallerQueue.findUnique({
      where: { outboundCallId: call.id },
    });

    if (existing) return existing;

    // Get organization from agent
    const agent = await prisma.voiceAgent.findUnique({
      where: { id: call.agentId },
    });

    if (!agent) return null;

    return this.addToQueue({
      organizationId: agent.organizationId,
      leadId: call.leadId || undefined,
      outboundCallId: call.id,
      phoneNumber: call.phoneNumber,
      contactName: call.contact?.name || undefined,
      email: call.contact?.email || undefined,
      aiCallSummary: call.summary || undefined,
      aiCallSentiment: call.sentiment || undefined,
      aiCallOutcome: call.outcome,
      aiCallDuration: call.duration || undefined,
      qualification: call.qualification || {},
    });
  }
}

export const telecallerQueueService = new TelecallerQueueService();
