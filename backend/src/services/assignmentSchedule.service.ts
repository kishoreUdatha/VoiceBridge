import { prisma } from '../config/database';
import {
  ScheduleType,
  DistributionStrategy,
  RawImportRecordStatus,
  Prisma,
} from '@prisma/client';
import { BadRequestError, NotFoundError } from '../utils/errors';

interface CreateScheduleData {
  organizationId: string;
  name: string;
  scheduleType?: ScheduleType;
  scheduleTimes?: string[];
  timezone?: string;
  cronExpression?: string;
  assignToTelecallers?: boolean;
  assignToVoiceAgents?: boolean;
  voiceAgentId?: string;
  telecallerDailyLimit?: number;
  voiceAgentDailyLimit?: number;
  distributionStrategy?: DistributionStrategy;
  bulkImportIds?: string[];
  isActive?: boolean;
}

interface UpdateScheduleData extends Partial<CreateScheduleData> {
  isActive?: boolean;
}

interface TelecallerCapacity {
  userId: string;
  userName: string;
  pending: number;
  limit: number;
  available: number;
}

interface VoiceAgentCapacity {
  agentId: string;
  agentName: string;
  pending: number;
  limit: number;
  available: number;
}

interface AssignmentResult {
  userId?: string;
  userName?: string;
  agentId?: string;
  agentName?: string;
  count: number;
}

export class AssignmentScheduleService {
  // ==================== CRUD OPERATIONS ====================

  async createSchedule(data: CreateScheduleData) {
    const {
      organizationId,
      name,
      scheduleType = 'DAILY',
      scheduleTimes = ['09:00', '13:00', '17:00'],
      timezone = 'Asia/Kolkata',
      cronExpression,
      assignToTelecallers = true,
      assignToVoiceAgents = false,
      voiceAgentId,
      telecallerDailyLimit = 200,
      voiceAgentDailyLimit = 500,
      distributionStrategy = 'CAPACITY_BASED',
      bulkImportIds = [],
      isActive = true,
    } = data;

    // Validate voice agent if specified
    if (voiceAgentId) {
      const agent = await prisma.voiceAgent.findFirst({
        where: { id: voiceAgentId, organizationId, isActive: true },
      });
      if (!agent) {
        throw new BadRequestError('Voice agent not found or inactive');
      }
    }

    // Calculate next run time
    const nextRunAt = isActive
      ? this.calculateNextRunTime(scheduleType, scheduleTimes, timezone, cronExpression)
      : null;

    const schedule = await prisma.assignmentSchedule.create({
      data: {
        organizationId,
        name,
        scheduleType,
        scheduleTimes,
        timezone,
        cronExpression,
        assignToTelecallers,
        assignToVoiceAgents,
        voiceAgentId,
        telecallerDailyLimit,
        voiceAgentDailyLimit,
        distributionStrategy,
        bulkImportIds: bulkImportIds as Prisma.InputJsonValue,
        isActive,
        nextRunAt,
      },
      include: {
        voiceAgent: {
          select: { id: true, name: true },
        },
      },
    });

    return schedule;
  }

  async updateSchedule(id: string, organizationId: string, data: UpdateScheduleData) {
    const schedule = await prisma.assignmentSchedule.findFirst({
      where: { id, organizationId },
    });

    if (!schedule) {
      throw new NotFoundError('Assignment schedule not found');
    }

    // Validate voice agent if specified
    if (data.voiceAgentId) {
      const agent = await prisma.voiceAgent.findFirst({
        where: { id: data.voiceAgentId, organizationId, isActive: true },
      });
      if (!agent) {
        throw new BadRequestError('Voice agent not found or inactive');
      }
    }

    // Recalculate next run time if schedule parameters changed
    const scheduleType = data.scheduleType ?? schedule.scheduleType;
    const scheduleTimes = data.scheduleTimes ?? schedule.scheduleTimes;
    const timezone = data.timezone ?? schedule.timezone;
    const cronExpression = data.cronExpression ?? schedule.cronExpression;
    const isActive = data.isActive ?? schedule.isActive;

    const nextRunAt = isActive
      ? this.calculateNextRunTime(scheduleType, scheduleTimes, timezone, cronExpression)
      : null;

    const updatedSchedule = await prisma.assignmentSchedule.update({
      where: { id },
      data: {
        ...data,
        bulkImportIds: data.bulkImportIds
          ? (data.bulkImportIds as Prisma.InputJsonValue)
          : undefined,
        nextRunAt,
      },
      include: {
        voiceAgent: {
          select: { id: true, name: true },
        },
      },
    });

    return updatedSchedule;
  }

  async getSchedules(organizationId: string) {
    const schedules = await prisma.assignmentSchedule.findMany({
      where: { organizationId },
      include: {
        voiceAgent: {
          select: { id: true, name: true },
        },
        _count: {
          select: { runLogs: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return schedules;
  }

  async getScheduleById(id: string, organizationId: string) {
    const schedule = await prisma.assignmentSchedule.findFirst({
      where: { id, organizationId },
      include: {
        voiceAgent: {
          select: { id: true, name: true },
        },
        runLogs: {
          orderBy: { runAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!schedule) {
      throw new NotFoundError('Assignment schedule not found');
    }

    return schedule;
  }

  async deleteSchedule(id: string, organizationId: string) {
    const schedule = await prisma.assignmentSchedule.findFirst({
      where: { id, organizationId },
    });

    if (!schedule) {
      throw new NotFoundError('Assignment schedule not found');
    }

    await prisma.assignmentSchedule.delete({
      where: { id },
    });

    return { deleted: true };
  }

  async getRunLogs(
    scheduleId: string,
    organizationId: string,
    page: number = 1,
    limit: number = 20
  ) {
    const skip = (page - 1) * limit;

    // Verify schedule belongs to org
    const schedule = await prisma.assignmentSchedule.findFirst({
      where: { id: scheduleId, organizationId },
    });

    if (!schedule) {
      throw new NotFoundError('Assignment schedule not found');
    }

    const [logs, total] = await Promise.all([
      prisma.assignmentRunLog.findMany({
        where: { scheduleId },
        orderBy: { runAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.assignmentRunLog.count({ where: { scheduleId } }),
    ]);

    return { logs, total };
  }

  // ==================== CORE ASSIGNMENT LOGIC ====================

  async getDueSchedules(): Promise<any[]> {
    const now = new Date();

    const schedules = await prisma.assignmentSchedule.findMany({
      where: {
        isActive: true,
        nextRunAt: {
          lte: now,
        },
      },
      include: {
        voiceAgent: {
          select: { id: true, name: true },
        },
      },
    });

    return schedules;
  }

  async runScheduledAssignment(
    scheduleId: string,
    triggeredBy: string = 'scheduler'
  ) {
    const startTime = Date.now();

    const schedule = await prisma.assignmentSchedule.findUnique({
      where: { id: scheduleId },
      include: {
        voiceAgent: true,
      },
    });

    if (!schedule) {
      throw new NotFoundError('Assignment schedule not found');
    }

    const organizationId = schedule.organizationId;

    // Get pending records count before run
    const pendingBefore = await this.getPendingRecordsCount(
      organizationId,
      schedule.bulkImportIds as string[] | null
    );

    let totalRecordsAssigned = 0;
    let recordsSkipped = 0;
    const telecallerAssignments: AssignmentResult[] = [];
    const voiceAgentAssignments: AssignmentResult[] = [];
    let errors: string | null = null;

    try {
      // Assign to telecallers
      if (schedule.assignToTelecallers) {
        const telecallerResult = await this.assignToTelecallers(
          organizationId,
          schedule.telecallerDailyLimit,
          schedule.distributionStrategy,
          schedule.bulkImportIds as string[] | null
        );
        totalRecordsAssigned += telecallerResult.totalAssigned;
        recordsSkipped += telecallerResult.skipped;
        telecallerAssignments.push(...telecallerResult.assignments);
      }

      // Assign to voice agents
      if (schedule.assignToVoiceAgents) {
        const agentResult = await this.assignToVoiceAgents(
          organizationId,
          schedule.voiceAgentId,
          schedule.voiceAgentDailyLimit,
          schedule.bulkImportIds as string[] | null
        );
        totalRecordsAssigned += agentResult.totalAssigned;
        recordsSkipped += agentResult.skipped;
        voiceAgentAssignments.push(...agentResult.assignments);
      }
    } catch (error: any) {
      errors = error.message || 'Unknown error during assignment';
      console.error('[AssignmentSchedule] Error during assignment:', error);
    }

    // Get pending records count after run
    const pendingAfter = await this.getPendingRecordsCount(
      organizationId,
      schedule.bulkImportIds as string[] | null
    );

    const runDurationMs = Date.now() - startTime;

    // Create run log
    const runLog = await prisma.assignmentRunLog.create({
      data: {
        scheduleId,
        organizationId,
        totalRecordsAssigned,
        telecallerAssignments: telecallerAssignments as Prisma.InputJsonValue,
        voiceAgentAssignments: voiceAgentAssignments as Prisma.InputJsonValue,
        recordsSkipped,
        pendingBefore,
        pendingAfter,
        errors,
        runDurationMs,
        triggeredBy,
      },
    });

    // Update schedule with last run time and calculate next run
    const nextRunAt = this.calculateNextRunTime(
      schedule.scheduleType,
      schedule.scheduleTimes,
      schedule.timezone,
      schedule.cronExpression
    );

    await prisma.assignmentSchedule.update({
      where: { id: scheduleId },
      data: {
        lastRunAt: new Date(),
        nextRunAt,
      },
    });

    console.log(
      `[AssignmentSchedule] Run completed for schedule ${schedule.name}: ` +
        `${totalRecordsAssigned} assigned, ${recordsSkipped} skipped`
    );

    return runLog;
  }

  // ==================== TELECALLER ASSIGNMENT ====================

  async assignToTelecallers(
    organizationId: string,
    dailyLimit: number,
    strategy: DistributionStrategy,
    bulkImportIds: string[] | null
  ) {
    // Get all active telecallers
    const telecallers = await this.getTelecallerCapacity(organizationId, dailyLimit);

    if (telecallers.length === 0) {
      return { totalAssigned: 0, skipped: 0, assignments: [] };
    }

    // Calculate total available capacity
    const totalCapacity = telecallers.reduce((sum, t) => sum + t.available, 0);

    if (totalCapacity === 0) {
      return {
        totalAssigned: 0,
        skipped: telecallers.length,
        assignments: [],
      };
    }

    // Get pending records
    const pendingRecords = await this.getPendingRecords(
      organizationId,
      totalCapacity,
      bulkImportIds
    );

    if (pendingRecords.length === 0) {
      return { totalAssigned: 0, skipped: 0, assignments: [] };
    }

    // Distribute records based on strategy
    const assignments: AssignmentResult[] = [];
    const recordAssignments: { recordId: string; userId: string }[] = [];

    switch (strategy) {
      case 'CAPACITY_BASED':
        this.distributeByCapacity(
          pendingRecords,
          telecallers,
          recordAssignments,
          assignments
        );
        break;

      case 'ROUND_ROBIN':
        this.distributeRoundRobin(
          pendingRecords,
          telecallers,
          recordAssignments,
          assignments
        );
        break;

      case 'PRIORITY_BASED':
        // For now, use same as capacity-based (could add priority logic later)
        this.distributeByCapacity(
          pendingRecords,
          telecallers,
          recordAssignments,
          assignments
        );
        break;
    }

    // Execute assignments in batches
    const BATCH_SIZE = 500;
    for (let i = 0; i < recordAssignments.length; i += BATCH_SIZE) {
      const batch = recordAssignments.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map((assignment) =>
          prisma.rawImportRecord.update({
            where: { id: assignment.recordId },
            data: {
              assignedToId: assignment.userId,
              assignedAt: new Date(),
              status: 'ASSIGNED',
            },
          })
        )
      );
    }

    const skipped = telecallers.filter((t) => t.available === 0).length;

    return {
      totalAssigned: recordAssignments.length,
      skipped,
      assignments,
    };
  }

  private distributeByCapacity(
    records: { id: string }[],
    telecallers: TelecallerCapacity[],
    recordAssignments: { recordId: string; userId: string }[],
    assignments: AssignmentResult[]
  ) {
    // Sort by available capacity (descending)
    const sortedTelecallers = [...telecallers]
      .filter((t) => t.available > 0)
      .sort((a, b) => b.available - a.available);

    if (sortedTelecallers.length === 0) return;

    // Track assignments per telecaller
    const assignmentCounts: Record<string, number> = {};
    const capacityRemaining: Record<string, number> = {};

    sortedTelecallers.forEach((t) => {
      assignmentCounts[t.userId] = 0;
      capacityRemaining[t.userId] = t.available;
    });

    // Assign records to telecallers with most available capacity
    for (const record of records) {
      // Find telecaller with most remaining capacity
      let bestTelecaller: TelecallerCapacity | null = null;
      let maxCapacity = 0;

      for (const t of sortedTelecallers) {
        if (capacityRemaining[t.userId] > maxCapacity) {
          maxCapacity = capacityRemaining[t.userId];
          bestTelecaller = t;
        }
      }

      if (!bestTelecaller || maxCapacity === 0) break;

      recordAssignments.push({
        recordId: record.id,
        userId: bestTelecaller.userId,
      });

      assignmentCounts[bestTelecaller.userId]++;
      capacityRemaining[bestTelecaller.userId]--;
    }

    // Build assignment results
    for (const t of sortedTelecallers) {
      if (assignmentCounts[t.userId] > 0) {
        assignments.push({
          userId: t.userId,
          userName: t.userName,
          count: assignmentCounts[t.userId],
        });
      }
    }
  }

  private distributeRoundRobin(
    records: { id: string }[],
    telecallers: TelecallerCapacity[],
    recordAssignments: { recordId: string; userId: string }[],
    assignments: AssignmentResult[]
  ) {
    const activeTelecallers = telecallers.filter((t) => t.available > 0);
    if (activeTelecallers.length === 0) return;

    const assignmentCounts: Record<string, number> = {};
    const capacityRemaining: Record<string, number> = {};

    activeTelecallers.forEach((t) => {
      assignmentCounts[t.userId] = 0;
      capacityRemaining[t.userId] = t.available;
    });

    let index = 0;
    for (const record of records) {
      // Find next telecaller with capacity
      let attempts = 0;
      while (attempts < activeTelecallers.length) {
        const telecaller = activeTelecallers[index % activeTelecallers.length];
        if (capacityRemaining[telecaller.userId] > 0) {
          recordAssignments.push({
            recordId: record.id,
            userId: telecaller.userId,
          });
          assignmentCounts[telecaller.userId]++;
          capacityRemaining[telecaller.userId]--;
          index++;
          break;
        }
        index++;
        attempts++;
      }

      if (attempts >= activeTelecallers.length) break; // No capacity left
    }

    // Build assignment results
    for (const t of activeTelecallers) {
      if (assignmentCounts[t.userId] > 0) {
        assignments.push({
          userId: t.userId,
          userName: t.userName,
          count: assignmentCounts[t.userId],
        });
      }
    }
  }

  // ==================== VOICE AGENT ASSIGNMENT ====================

  async assignToVoiceAgents(
    organizationId: string,
    specificAgentId: string | null,
    dailyLimit: number,
    bulkImportIds: string[] | null
  ) {
    // Get voice agent(s) capacity
    const agents = await this.getVoiceAgentCapacity(
      organizationId,
      specificAgentId,
      dailyLimit
    );

    if (agents.length === 0) {
      return { totalAssigned: 0, skipped: 0, assignments: [] };
    }

    // Calculate total available capacity
    const totalCapacity = agents.reduce((sum, a) => sum + a.available, 0);

    if (totalCapacity === 0) {
      return {
        totalAssigned: 0,
        skipped: agents.length,
        assignments: [],
      };
    }

    // Get pending records
    const pendingRecords = await this.getPendingRecords(
      organizationId,
      totalCapacity,
      bulkImportIds
    );

    if (pendingRecords.length === 0) {
      return { totalAssigned: 0, skipped: 0, assignments: [] };
    }

    // Assign to agent(s)
    const assignments: AssignmentResult[] = [];
    const recordAssignments: { recordId: string; agentId: string }[] = [];

    if (specificAgentId) {
      // Assign all to specific agent
      const agent = agents[0];
      const assignCount = Math.min(pendingRecords.length, agent.available);

      for (let i = 0; i < assignCount; i++) {
        recordAssignments.push({
          recordId: pendingRecords[i].id,
          agentId: agent.agentId,
        });
      }

      if (assignCount > 0) {
        assignments.push({
          agentId: agent.agentId,
          agentName: agent.agentName,
          count: assignCount,
        });
      }
    } else {
      // Round-robin across all agents
      let index = 0;
      const capacityRemaining: Record<string, number> = {};
      const assignmentCounts: Record<string, number> = {};

      agents.forEach((a) => {
        capacityRemaining[a.agentId] = a.available;
        assignmentCounts[a.agentId] = 0;
      });

      for (const record of pendingRecords) {
        let attempts = 0;
        while (attempts < agents.length) {
          const agent = agents[index % agents.length];
          if (capacityRemaining[agent.agentId] > 0) {
            recordAssignments.push({
              recordId: record.id,
              agentId: agent.agentId,
            });
            assignmentCounts[agent.agentId]++;
            capacityRemaining[agent.agentId]--;
            index++;
            break;
          }
          index++;
          attempts++;
        }

        if (attempts >= agents.length) break;
      }

      // Build assignment results
      for (const a of agents) {
        if (assignmentCounts[a.agentId] > 0) {
          assignments.push({
            agentId: a.agentId,
            agentName: a.agentName,
            count: assignmentCounts[a.agentId],
          });
        }
      }
    }

    // Execute assignments in batches
    const BATCH_SIZE = 500;
    for (let i = 0; i < recordAssignments.length; i += BATCH_SIZE) {
      const batch = recordAssignments.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map((assignment) =>
          prisma.rawImportRecord.update({
            where: { id: assignment.recordId },
            data: {
              assignedAgentId: assignment.agentId,
              assignedAt: new Date(),
              status: 'ASSIGNED',
            },
          })
        )
      );
    }

    const skipped = agents.filter((a) => a.available === 0).length;

    return {
      totalAssigned: recordAssignments.length,
      skipped,
      assignments,
    };
  }

  // ==================== CAPACITY CALCULATION ====================

  async getTelecallerCapacity(
    organizationId: string,
    dailyLimit: number
  ): Promise<TelecallerCapacity[]> {
    // Get all active telecallers (users with telecaller role)
    const telecallers = await prisma.user.findMany({
      where: {
        organizationId,
        isActive: true,
        role: {
          slug: {
            in: ['telecaller', 'counselor', 'sales'],
          },
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });

    // Count pending records for each telecaller
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const capacities: TelecallerCapacity[] = [];

    for (const telecaller of telecallers) {
      // Count records assigned today that are not completed
      const pendingCount = await prisma.rawImportRecord.count({
        where: {
          organizationId,
          assignedToId: telecaller.id,
          assignedAt: {
            gte: today,
          },
          status: {
            in: ['ASSIGNED', 'CALLING'],
          },
        },
      });

      const available = Math.max(0, dailyLimit - pendingCount);

      capacities.push({
        userId: telecaller.id,
        userName: `${telecaller.firstName} ${telecaller.lastName}`.trim(),
        pending: pendingCount,
        limit: dailyLimit,
        available,
      });
    }

    return capacities;
  }

  async getVoiceAgentCapacity(
    organizationId: string,
    specificAgentId: string | null,
    dailyLimit: number
  ): Promise<VoiceAgentCapacity[]> {
    const whereClause: any = {
      organizationId,
      isActive: true,
    };

    if (specificAgentId) {
      whereClause.id = specificAgentId;
    }

    const agents = await prisma.voiceAgent.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
      },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const capacities: VoiceAgentCapacity[] = [];

    for (const agent of agents) {
      const pendingCount = await prisma.rawImportRecord.count({
        where: {
          organizationId,
          assignedAgentId: agent.id,
          assignedAt: {
            gte: today,
          },
          status: {
            in: ['ASSIGNED', 'CALLING'],
          },
        },
      });

      const available = Math.max(0, dailyLimit - pendingCount);

      capacities.push({
        agentId: agent.id,
        agentName: agent.name,
        pending: pendingCount,
        limit: dailyLimit,
        available,
      });
    }

    return capacities;
  }

  async getCapacityStats(organizationId: string) {
    // Get all schedules for the org
    const schedules = await prisma.assignmentSchedule.findMany({
      where: { organizationId },
      select: {
        telecallerDailyLimit: true,
        voiceAgentDailyLimit: true,
      },
    });

    // Use default or first schedule limits
    const telecallerLimit = schedules[0]?.telecallerDailyLimit ?? 200;
    const voiceAgentLimit = schedules[0]?.voiceAgentDailyLimit ?? 500;

    const telecallerCapacity = await this.getTelecallerCapacity(
      organizationId,
      telecallerLimit
    );
    const voiceAgentCapacity = await this.getVoiceAgentCapacity(
      organizationId,
      null,
      voiceAgentLimit
    );

    // Get pending records count
    const pendingRecords = await prisma.rawImportRecord.count({
      where: {
        organizationId,
        status: 'PENDING',
      },
    });

    return {
      telecallers: telecallerCapacity,
      voiceAgents: voiceAgentCapacity,
      totalTelecallerCapacity: telecallerCapacity.reduce((sum, t) => sum + t.available, 0),
      totalVoiceAgentCapacity: voiceAgentCapacity.reduce((sum, a) => sum + a.available, 0),
      pendingRecords,
    };
  }

  // ==================== HELPER METHODS ====================

  private async getPendingRecordsCount(
    organizationId: string,
    bulkImportIds: string[] | null
  ): Promise<number> {
    const whereClause: any = {
      organizationId,
      status: 'PENDING',
    };

    if (bulkImportIds && bulkImportIds.length > 0) {
      whereClause.bulkImportId = { in: bulkImportIds };
    }

    return prisma.rawImportRecord.count({ where: whereClause });
  }

  private async getPendingRecords(
    organizationId: string,
    limit: number,
    bulkImportIds: string[] | null
  ) {
    const whereClause: any = {
      organizationId,
      status: 'PENDING',
    };

    if (bulkImportIds && bulkImportIds.length > 0) {
      whereClause.bulkImportId = { in: bulkImportIds };
    }

    return prisma.rawImportRecord.findMany({
      where: whereClause,
      select: { id: true },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  private calculateNextRunTime(
    scheduleType: ScheduleType,
    scheduleTimes: string[],
    timezone: string,
    cronExpression: string | null
  ): Date {
    const now = new Date();

    switch (scheduleType) {
      case 'DAILY':
        return this.getNextDailyRunTime(now, scheduleTimes, timezone);

      case 'HOURLY':
        // Run at the top of the next hour
        const nextHour = new Date(now);
        nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
        return nextHour;

      case 'CUSTOM_CRON':
        // For custom cron, calculate next run based on expression
        // Simplified: default to next day at first schedule time
        if (cronExpression) {
          // Could use a cron parser library here
          // For now, fallback to daily
        }
        return this.getNextDailyRunTime(now, scheduleTimes, timezone);

      default:
        return this.getNextDailyRunTime(now, scheduleTimes, timezone);
    }
  }

  private getNextDailyRunTime(
    now: Date,
    scheduleTimes: string[],
    timezone: string
  ): Date {
    // Sort times
    const sortedTimes = [...scheduleTimes].sort();

    // Get current time in timezone (simplified - using UTC offset approach)
    // In production, would use a proper timezone library like luxon or dayjs-timezone
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute
      .toString()
      .padStart(2, '0')}`;

    // Find next scheduled time today
    for (const time of sortedTimes) {
      if (time > currentTimeStr) {
        const [hours, minutes] = time.split(':').map(Number);
        const nextRun = new Date(now);
        nextRun.setHours(hours, minutes, 0, 0);
        return nextRun;
      }
    }

    // No more times today, use first time tomorrow
    const [hours, minutes] = sortedTimes[0].split(':').map(Number);
    const nextRun = new Date(now);
    nextRun.setDate(nextRun.getDate() + 1);
    nextRun.setHours(hours, minutes, 0, 0);
    return nextRun;
  }
}

export const assignmentScheduleService = new AssignmentScheduleService();
