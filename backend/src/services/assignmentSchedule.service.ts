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
  orgBranchId?: string | null; // null = org-wide, set = branch-specific
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
  branchId: string | null;
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

interface BranchBreakdown {
  [branchId: string]: {
    assigned: number;
    skipped: number;
  };
}

export class AssignmentScheduleService {
  // ==================== CRUD OPERATIONS ====================

  async createSchedule(data: CreateScheduleData) {
    const {
      organizationId,
      orgBranchId = null,
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
        orgBranchId: orgBranchId || null,
        name,
        scheduleType,
        scheduleTimes,
        timezone,
        cronExpression,
        assignToTelecallers,
        assignToVoiceAgents,
        voiceAgentId: voiceAgentId || null,
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
        orgBranch: {
          select: { id: true, name: true, code: true },
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

    // Convert empty strings to null for foreign keys
    const updateData = {
      ...data,
      voiceAgentId: data.voiceAgentId === '' ? null : data.voiceAgentId,
      orgBranchId: data.orgBranchId === '' ? null : data.orgBranchId,
      bulkImportIds: data.bulkImportIds
        ? (data.bulkImportIds as Prisma.InputJsonValue)
        : undefined,
      nextRunAt,
    };

    const updatedSchedule = await prisma.assignmentSchedule.update({
      where: { id },
      data: updateData,
      include: {
        voiceAgent: {
          select: { id: true, name: true },
        },
        orgBranch: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    return updatedSchedule;
  }

  async getSchedules(
    organizationId: string,
    branchId: string | null = null,
    canAccessAllBranches: boolean = true
  ) {
    // Build where clause based on access
    const whereClause: any = { organizationId };

    if (!canAccessAllBranches && branchId) {
      // Non-admin: show their branch schedules + org-wide schedules
      whereClause.OR = [
        { orgBranchId: branchId },
        { orgBranchId: null },
      ];
    } else if (branchId) {
      // Admin with branch filter: show specific branch + org-wide
      whereClause.OR = [
        { orgBranchId: branchId },
        { orgBranchId: null },
      ];
    }
    // Admin without filter: show all (no additional where clause)

    const schedules = await prisma.assignmentSchedule.findMany({
      where: whereClause,
      include: {
        voiceAgent: {
          select: { id: true, name: true },
        },
        orgBranch: {
          select: { id: true, name: true, code: true },
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
        orgBranch: {
          select: { id: true, name: true, code: true },
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
        orgBranch: {
          select: { id: true, name: true, code: true },
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

    // Skip assignment on Sundays (day 0)
    const today = new Date();
    if (today.getDay() === 0) {
      console.log(`[AssignmentSchedule] Skipping schedule ${scheduleId} - Sunday`);
      return {
        success: true,
        skippedReason: 'Sunday - no assignments',
        totalRecordsAssigned: 0,
      };
    }

    const schedule = await prisma.assignmentSchedule.findUnique({
      where: { id: scheduleId },
      include: {
        voiceAgent: true,
        orgBranch: true,
      },
    });

    if (!schedule) {
      throw new NotFoundError('Assignment schedule not found');
    }

    const organizationId = schedule.organizationId;
    const branchId = schedule.orgBranchId; // null = org-wide, set = branch-specific

    // Get pending records count before run
    const pendingBefore = await this.getPendingRecordsCount(
      organizationId,
      schedule.bulkImportIds as string[] | null,
      branchId
    );

    let totalRecordsAssigned = 0;
    let recordsSkipped = 0;
    const telecallerAssignments: AssignmentResult[] = [];
    const voiceAgentAssignments: AssignmentResult[] = [];
    let branchBreakdown: BranchBreakdown = {};
    let errors: string | null = null;

    try {
      // Assign to telecallers
      if (schedule.assignToTelecallers) {
        const telecallerResult = await this.assignToTelecallers(
          organizationId,
          schedule.telecallerDailyLimit,
          schedule.distributionStrategy,
          schedule.bulkImportIds as string[] | null,
          branchId
        );
        totalRecordsAssigned += telecallerResult.totalAssigned;
        recordsSkipped += telecallerResult.skipped;
        telecallerAssignments.push(...telecallerResult.assignments);
        branchBreakdown = { ...branchBreakdown, ...telecallerResult.branchBreakdown };
      }

      // Assign to voice agents
      if (schedule.assignToVoiceAgents) {
        const agentResult = await this.assignToVoiceAgents(
          organizationId,
          schedule.voiceAgentId,
          schedule.voiceAgentDailyLimit,
          schedule.bulkImportIds as string[] | null,
          branchId
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
      schedule.bulkImportIds as string[] | null,
      branchId
    );

    const runDurationMs = Date.now() - startTime;

    // Create run log
    const runLog = await prisma.assignmentRunLog.create({
      data: {
        scheduleId,
        organizationId,
        orgBranchId: branchId,
        totalRecordsAssigned,
        telecallerAssignments: telecallerAssignments as Prisma.InputJsonValue,
        voiceAgentAssignments: voiceAgentAssignments as Prisma.InputJsonValue,
        recordsSkipped,
        pendingBefore,
        pendingAfter,
        branchBreakdown: branchBreakdown as Prisma.InputJsonValue,
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
        `${totalRecordsAssigned} assigned, ${recordsSkipped} skipped, ` +
        `pendingBefore: ${pendingBefore}, pendingAfter: ${pendingAfter}`
    );

    return runLog;
  }

  // ==================== TELECALLER ASSIGNMENT ====================

  async assignToTelecallers(
    organizationId: string,
    dailyLimit: number,
    strategy: DistributionStrategy,
    bulkImportIds: string[] | null,
    _branchId: string | null = null // Not used - always get all telecallers
  ) {
    // Get ALL telecallers in the organization (ignore branch filtering)
    const telecallers = await this.getTelecallerCapacity(organizationId, dailyLimit, null);

    console.log(`[AssignmentSchedule] Found ${telecallers.length} telecallers for org ${organizationId}`);
    telecallers.forEach(t => console.log(`  - ${t.userName}: available=${t.available}, limit=${t.limit}, pending=${t.pending}`));

    if (telecallers.length === 0) {
      console.log('[AssignmentSchedule] No telecallers found, returning');
      return { totalAssigned: 0, skipped: 0, assignments: [], branchBreakdown: {} };
    }

    // Calculate total available capacity
    const totalCapacity = telecallers.reduce((sum, t) => sum + t.available, 0);

    if (totalCapacity === 0) {
      console.log('[AssignmentSchedule] All telecallers at capacity, returning');
      return {
        totalAssigned: 0,
        skipped: telecallers.length,
        assignments: [],
        branchBreakdown: {},
      };
    }

    // Get ALL pending records (ignore branch filtering)
    const pendingRecords = await this.getPendingRecords(
      organizationId,
      totalCapacity,
      bulkImportIds,
      null // Get all pending records
    );

    console.log(`[AssignmentSchedule] Found ${pendingRecords.length} pending records to assign`);

    if (pendingRecords.length === 0) {
      console.log('[AssignmentSchedule] No pending records found, returning');
      return { totalAssigned: 0, skipped: 0, assignments: [], branchBreakdown: {} };
    }

    // Simple distribution to all telecallers based on strategy
    const assignments: AssignmentResult[] = [];
    const recordAssignments: { recordId: string; userId: string }[] = [];

    console.log(`[AssignmentSchedule] Using ${strategy} distribution to all telecallers`);

    switch (strategy) {
      case 'CAPACITY_BASED':
      case 'PRIORITY_BASED':
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
    }

    const branchBreakdown: BranchBreakdown = {
      'all': {
        assigned: recordAssignments.length,
        skipped: telecallers.filter((t) => t.available === 0).length,
      },
    };

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
      branchBreakdown,
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

  /**
   * Branch-aware distribution for org-wide schedules
   * Matches records to telecallers by branch:
   * - Records with orgBranchId go to telecallers with matching branchId
   * - Records without branch go to telecallers without branch (org-level)
   * - If no matching telecallers, records remain unassigned
   */
  private distributeBranchAware(
    records: { id: string; orgBranchId: string | null }[],
    telecallers: TelecallerCapacity[],
    strategy: DistributionStrategy
  ): {
    recordAssignments: { recordId: string; userId: string }[];
    assignments: AssignmentResult[];
    branchBreakdown: BranchBreakdown;
  } {
    const recordAssignments: { recordId: string; userId: string }[] = [];
    const assignmentCounts: Record<string, number> = {};
    const branchBreakdown: BranchBreakdown = {};

    // Initialize counts for all telecallers
    telecallers.forEach((t) => {
      assignmentCounts[t.userId] = 0;
    });

    // Group records by branch
    const recordsByBranch: Record<string, { id: string; orgBranchId: string | null }[]> = {};
    const NO_BRANCH_KEY = '__no_branch__';

    for (const record of records) {
      const branchKey = record.orgBranchId || NO_BRANCH_KEY;
      if (!recordsByBranch[branchKey]) {
        recordsByBranch[branchKey] = [];
      }
      recordsByBranch[branchKey].push(record);
    }

    // Group telecallers by branch
    const telecallersByBranch: Record<string, TelecallerCapacity[]> = {};
    for (const t of telecallers) {
      const branchKey = t.branchId || NO_BRANCH_KEY;
      if (!telecallersByBranch[branchKey]) {
        telecallersByBranch[branchKey] = [];
      }
      telecallersByBranch[branchKey].push(t);
    }

    // Log branch distribution for debugging
    console.log(`[AssignmentSchedule] Records by branch: ${Object.keys(recordsByBranch).map(k => `${k === NO_BRANCH_KEY ? 'no-branch' : k}=${recordsByBranch[k].length}`).join(', ')}`);
    console.log(`[AssignmentSchedule] Telecallers by branch: ${Object.keys(telecallersByBranch).map(k => `${k === NO_BRANCH_KEY ? 'no-branch' : k}=${telecallersByBranch[k].length}`).join(', ')}`);

    // Track remaining capacity
    const capacityRemaining: Record<string, number> = {};
    telecallers.forEach((t) => {
      capacityRemaining[t.userId] = t.available;
    });

    // Process each branch's records
    for (const branchKey of Object.keys(recordsByBranch)) {
      const branchRecords = recordsByBranch[branchKey];
      let targetTelecallers = telecallersByBranch[branchKey] || [];

      // If no telecallers in this branch, try org-level telecallers (no branch)
      if (targetTelecallers.length === 0 && branchKey !== NO_BRANCH_KEY) {
        targetTelecallers = telecallersByBranch[NO_BRANCH_KEY] || [];
      }

      // If still no telecallers, fall back to ALL telecallers (ignore branch matching)
      if (targetTelecallers.length === 0) {
        console.log(`[AssignmentSchedule] No telecallers for branch ${branchKey}, falling back to all telecallers`);
        targetTelecallers = telecallers;
      }

      // Initialize branch breakdown
      const actualBranchId = branchKey === NO_BRANCH_KEY ? 'org-level' : branchKey;
      branchBreakdown[actualBranchId] = { assigned: 0, skipped: 0 };

      if (targetTelecallers.length === 0) {
        // No telecallers available for this branch
        branchBreakdown[actualBranchId].skipped = branchRecords.length;
        continue;
      }

      // Filter to telecallers with remaining capacity
      const availableTelecallers = targetTelecallers.filter(
        (t) => capacityRemaining[t.userId] > 0
      );

      if (availableTelecallers.length === 0) {
        branchBreakdown[actualBranchId].skipped = branchRecords.length;
        continue;
      }

      // Distribute records to telecallers based on strategy
      if (strategy === 'ROUND_ROBIN') {
        let index = 0;
        for (const record of branchRecords) {
          let attempts = 0;
          while (attempts < availableTelecallers.length) {
            const t = availableTelecallers[index % availableTelecallers.length];
            if (capacityRemaining[t.userId] > 0) {
              recordAssignments.push({ recordId: record.id, userId: t.userId });
              assignmentCounts[t.userId]++;
              capacityRemaining[t.userId]--;
              branchBreakdown[actualBranchId].assigned++;
              index++;
              break;
            }
            index++;
            attempts++;
          }
          if (attempts >= availableTelecallers.length) {
            branchBreakdown[actualBranchId].skipped++;
          }
        }
      } else {
        // CAPACITY_BASED or PRIORITY_BASED
        for (const record of branchRecords) {
          // Find telecaller with most remaining capacity
          let bestTelecaller: TelecallerCapacity | null = null;
          let maxCapacity = 0;

          for (const t of availableTelecallers) {
            if (capacityRemaining[t.userId] > maxCapacity) {
              maxCapacity = capacityRemaining[t.userId];
              bestTelecaller = t;
            }
          }

          if (bestTelecaller && maxCapacity > 0) {
            recordAssignments.push({ recordId: record.id, userId: bestTelecaller.userId });
            assignmentCounts[bestTelecaller.userId]++;
            capacityRemaining[bestTelecaller.userId]--;
            branchBreakdown[actualBranchId].assigned++;
          } else {
            branchBreakdown[actualBranchId].skipped++;
          }
        }
      }
    }

    // Build assignment results
    const assignments: AssignmentResult[] = [];
    for (const t of telecallers) {
      if (assignmentCounts[t.userId] > 0) {
        assignments.push({
          userId: t.userId,
          userName: t.userName,
          count: assignmentCounts[t.userId],
        });
      }
    }

    return { recordAssignments, assignments, branchBreakdown };
  }

  // ==================== VOICE AGENT ASSIGNMENT ====================

  async assignToVoiceAgents(
    organizationId: string,
    specificAgentId: string | null,
    dailyLimit: number,
    bulkImportIds: string[] | null,
    branchId: string | null = null
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

    // Get pending records (filtered by branch if branch-specific schedule)
    const pendingRecords = await this.getPendingRecords(
      organizationId,
      totalCapacity,
      bulkImportIds,
      branchId
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
    dailyLimit: number,
    branchId: string | null = null
  ): Promise<TelecallerCapacity[]> {
    // Build where clause - filter by branch if specified
    // Include various telecaller-type roles that can receive assignments
    const whereClause: any = {
      organizationId,
      isActive: true,
      role: {
        slug: {
          in: ['telecaller', 'counselor', 'caller'],
        },
      },
    };

    // For branch-specific schedules, only get telecallers in that branch
    if (branchId) {
      whereClause.branchId = branchId;
    }
    // For org-wide schedules (branchId = null), get all telecallers

    // Get telecallers (filtered by branch if specified)
    const telecallers = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        branchId: true,
      },
    });

    // Count ALL pending records for each telecaller (not just today's)
    // This ensures yesterday's incomplete work is counted towards daily limit
    const capacities: TelecallerCapacity[] = [];

    for (const telecaller of telecallers) {
      // Count ALL records that are still pending (ASSIGNED or CALLING status)
      // This includes records from previous days that weren't completed
      const pendingCount = await prisma.rawImportRecord.count({
        where: {
          organizationId,
          assignedToId: telecaller.id,
          status: {
            in: ['ASSIGNED', 'CALLING'],
          },
        },
      });

      const available = Math.max(0, dailyLimit - pendingCount);

      capacities.push({
        userId: telecaller.id,
        userName: `${telecaller.firstName} ${telecaller.lastName}`.trim(),
        branchId: telecaller.branchId,
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

    // Count ALL pending records for each agent (not just today's)
    // This ensures yesterday's incomplete work is counted towards daily limit
    const capacities: VoiceAgentCapacity[] = [];

    for (const agent of agents) {
      const pendingCount = await prisma.rawImportRecord.count({
        where: {
          organizationId,
          assignedAgentId: agent.id,
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

  async getCapacityStats(organizationId: string, _branchId: string | null = null) {
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

    // Always get ALL telecallers (ignore branch filtering)
    const telecallerCapacity = await this.getTelecallerCapacity(
      organizationId,
      telecallerLimit,
      null // Get all telecallers
    );
    const voiceAgentCapacity = await this.getVoiceAgentCapacity(
      organizationId,
      null,
      voiceAgentLimit
    );

    // Get ALL pending records count
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
    bulkImportIds: string[] | null,
    branchId: string | null = null
  ): Promise<number> {
    const whereClause: any = {
      organizationId,
      status: 'PENDING',
    };

    if (bulkImportIds && bulkImportIds.length > 0) {
      whereClause.bulkImportId = { in: bulkImportIds };
    }

    // Filter by branch for branch-specific schedules
    if (branchId) {
      whereClause.orgBranchId = branchId;
    }

    return prisma.rawImportRecord.count({ where: whereClause });
  }

  private async getPendingRecords(
    organizationId: string,
    limit: number,
    bulkImportIds: string[] | null,
    branchId: string | null = null
  ) {
    const whereClause: any = {
      organizationId,
      status: 'PENDING',
    };

    if (bulkImportIds && bulkImportIds.length > 0) {
      whereClause.bulkImportId = { in: bulkImportIds };
    }

    // Filter by branch for branch-specific schedules
    if (branchId) {
      whereClause.orgBranchId = branchId;
    }

    return prisma.rawImportRecord.findMany({
      where: whereClause,
      select: { id: true, orgBranchId: true }, // Include orgBranchId for branch-aware distribution
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
