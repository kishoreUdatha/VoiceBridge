import { Request, Response, NextFunction } from 'express';
import { assignmentScheduleService } from '../services/assignmentSchedule.service';
import { BadRequestError } from '../utils/errors';
import { getBranchAccessContext, canAccessBranch } from '../utils/branchAccess';
import { AuthenticatedRequest } from '../middlewares/auth';

export class AssignmentScheduleController {
  /**
   * Create a new assignment schedule
   * POST /api/assignment-schedules
   */
  async createSchedule(req: Request, res: Response, next: NextFunction) {
    try {
      const branchContext = getBranchAccessContext(req as AuthenticatedRequest);
      const organizationId = branchContext.organizationId;

      const {
        name,
        orgBranchId,
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
        bulkImportIds,
        isActive,
      } = req.body;

      if (!name) {
        throw new BadRequestError('Schedule name is required');
      }

      // Validate branch access for non-admin users
      if (orgBranchId && !canAccessBranch(branchContext, orgBranchId)) {
        throw new BadRequestError('You do not have access to create schedules for this branch');
      }

      // Non-admin users can only create schedules for their own branch
      const effectiveBranchId = branchContext.canAccessAllBranches
        ? (orgBranchId || null)  // Admin can create org-wide or branch-specific
        : branchContext.branchId; // Non-admin must use their branch

      const schedule = await assignmentScheduleService.createSchedule({
        organizationId,
        orgBranchId: effectiveBranchId,
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
        bulkImportIds,
        isActive,
      });

      res.status(201).json({
        success: true,
        data: schedule,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all schedules for organization
   * GET /api/assignment-schedules
   */
  async getSchedules(req: Request, res: Response, next: NextFunction) {
    try {
      const branchContext = getBranchAccessContext(req as AuthenticatedRequest);

      const schedules = await assignmentScheduleService.getSchedules(
        branchContext.organizationId,
        branchContext.branchId,
        branchContext.canAccessAllBranches
      );

      res.json({
        success: true,
        data: schedules,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a single schedule by ID
   * GET /api/assignment-schedules/:id
   */
  async getScheduleById(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as AuthenticatedRequest).user!.organizationId;
      const { id } = req.params;

      const schedule = await assignmentScheduleService.getScheduleById(
        id,
        organizationId
      );

      res.json({
        success: true,
        data: schedule,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a schedule
   * PUT /api/assignment-schedules/:id
   */
  async updateSchedule(req: Request, res: Response, next: NextFunction) {
    try {
      const branchContext = getBranchAccessContext(req as AuthenticatedRequest);
      const { id } = req.params;

      const {
        name,
        orgBranchId,
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
        bulkImportIds,
        isActive,
      } = req.body;

      // Validate branch access if changing branch
      if (orgBranchId !== undefined && !canAccessBranch(branchContext, orgBranchId)) {
        throw new BadRequestError('You do not have access to this branch');
      }

      const schedule = await assignmentScheduleService.updateSchedule(
        id,
        branchContext.organizationId,
        {
          name,
          orgBranchId: branchContext.canAccessAllBranches ? orgBranchId : undefined, // Only admin can change branch
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
          bulkImportIds,
          isActive,
        }
      );

      res.json({
        success: true,
        data: schedule,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a schedule
   * DELETE /api/assignment-schedules/:id
   */
  async deleteSchedule(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as AuthenticatedRequest).user!.organizationId;
      const { id } = req.params;

      await assignmentScheduleService.deleteSchedule(id, organizationId);

      res.json({
        success: true,
        message: 'Schedule deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Manually run a schedule
   * POST /api/assignment-schedules/:id/run
   */
  async runSchedule(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as AuthenticatedRequest).user!;
      const organizationId = user.organizationId;
      const userId = user.id;
      const { id } = req.params;

      // Verify schedule belongs to org
      await assignmentScheduleService.getScheduleById(id, organizationId);

      // Run the schedule
      const runLog = await assignmentScheduleService.runScheduledAssignment(
        id,
        userId
      );

      res.json({
        success: true,
        data: runLog,
        message: `Assigned ${runLog.totalRecordsAssigned} records`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get run logs for a schedule
   * GET /api/assignment-schedules/:id/logs
   */
  async getRunLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as AuthenticatedRequest).user!.organizationId;
      const { id } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const { logs, total } = await assignmentScheduleService.getRunLogs(
        id,
        organizationId,
        page,
        limit
      );

      res.json({
        success: true,
        data: logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current capacity stats
   * GET /api/assignment-schedules/capacity?branchId=xxx
   */
  async getCapacityStats(req: Request, res: Response, next: NextFunction) {
    try {
      const branchContext = getBranchAccessContext(req as AuthenticatedRequest);
      const queryBranchId = req.query.branchId as string | undefined;

      // Determine which branch to filter by
      let effectiveBranchId: string | null = null;

      if (branchContext.canAccessAllBranches) {
        // Admin can specify branch via query param
        effectiveBranchId = queryBranchId || null;
      } else {
        // Non-admin uses their assigned branch
        effectiveBranchId = branchContext.branchId;
      }

      const stats = await assignmentScheduleService.getCapacityStats(
        branchContext.organizationId,
        effectiveBranchId
      );

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const assignmentScheduleController = new AssignmentScheduleController();
