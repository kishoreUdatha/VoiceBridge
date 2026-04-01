import { Request, Response, NextFunction } from 'express';
import { assignmentScheduleService } from '../services/assignmentSchedule.service';
import { BadRequestError } from '../utils/errors';

export class AssignmentScheduleController {
  /**
   * Create a new assignment schedule
   * POST /api/assignment-schedules
   */
  async createSchedule(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;

      const {
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
      } = req.body;

      if (!name) {
        throw new BadRequestError('Schedule name is required');
      }

      const schedule = await assignmentScheduleService.createSchedule({
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
      const organizationId = req.user!.organizationId;

      const schedules = await assignmentScheduleService.getSchedules(organizationId);

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
      const organizationId = req.user!.organizationId;
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
      const organizationId = req.user!.organizationId;
      const { id } = req.params;

      const {
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
      } = req.body;

      const schedule = await assignmentScheduleService.updateSchedule(
        id,
        organizationId,
        {
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
      const organizationId = req.user!.organizationId;
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
      const organizationId = req.user!.organizationId;
      const userId = req.user!.id;
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
      const organizationId = req.user!.organizationId;
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
   * GET /api/assignment-schedules/capacity
   */
  async getCapacityStats(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;

      const stats = await assignmentScheduleService.getCapacityStats(organizationId);

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
