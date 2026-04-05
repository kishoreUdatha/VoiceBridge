import { Response, NextFunction } from 'express';
import { studentVisitService } from '../services/student-visit.service';
import { ApiResponse } from '../utils/apiResponse';
import { TenantRequest } from '../middlewares/tenant';
import { StudentVisitStatus } from '@prisma/client';

export class StudentVisitController {
  /**
   * Schedule a new visit
   */
  async schedule(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const visit = await studentVisitService.schedule({
        organizationId: req.organizationId!,
        arrangedById: req.user!.id,
        ...req.body,
      });

      ApiResponse.created(res, 'Visit scheduled successfully', visit);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all visits
   */
  async findAll(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        status: req.query.status as StudentVisitStatus | undefined,
        universityId: req.query.universityId as string,
        leadId: req.query.leadId as string,
        arrangedById: req.query.arrangedById as string,
        fromDate: req.query.fromDate ? new Date(req.query.fromDate as string) : undefined,
        toDate: req.query.toDate ? new Date(req.query.toDate as string) : undefined,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 50,
      };

      const result = await studentVisitService.findAll(req.organizationId!, filters);
      ApiResponse.success(res, 'Visits retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a single visit
   */
  async findById(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const visit = await studentVisitService.findById(req.params.id, req.organizationId!);
      ApiResponse.success(res, 'Visit retrieved successfully', visit);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a visit
   */
  async update(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const visit = await studentVisitService.update(
        req.params.id,
        req.organizationId!,
        req.body
      );
      ApiResponse.success(res, 'Visit updated successfully', visit);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Confirm a visit
   */
  async confirm(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const visit = await studentVisitService.confirm(req.params.id, req.organizationId!);
      ApiResponse.success(res, 'Visit confirmed successfully', visit);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Complete a visit
   */
  async complete(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const visit = await studentVisitService.complete(
        req.params.id,
        req.organizationId!,
        req.body
      );
      ApiResponse.success(res, 'Visit completed successfully', visit);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel a visit
   */
  async cancel(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const visit = await studentVisitService.cancel(
        req.params.id,
        req.organizationId!,
        req.body.reason
      );
      ApiResponse.success(res, 'Visit cancelled successfully', visit);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark visit as no-show
   */
  async markNoShow(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const visit = await studentVisitService.markNoShow(
        req.params.id,
        req.organizationId!,
        req.body.notes
      );
      ApiResponse.success(res, 'Visit marked as no-show', visit);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get upcoming visits for today
   */
  async getUpcomingToday(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.query.userId as string || req.user!.id;
      const visits = await studentVisitService.getUpcomingToday(req.organizationId!, userId);
      ApiResponse.success(res, 'Upcoming visits retrieved successfully', visits);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get visit statistics
   */
  async getStats(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const dateRange = req.query.from && req.query.to
        ? { from: new Date(req.query.from as string), to: new Date(req.query.to as string) }
        : undefined;

      const stats = await studentVisitService.getStats(req.organizationId!, dateRange);
      ApiResponse.success(res, 'Visit statistics retrieved successfully', stats);
    } catch (error) {
      next(error);
    }
  }
}

export const studentVisitController = new StudentVisitController();
