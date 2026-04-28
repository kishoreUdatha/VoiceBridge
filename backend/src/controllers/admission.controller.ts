import { Response, NextFunction } from 'express';
import { admissionService } from '../services/admission.service';
import { ApiResponse } from '../utils/apiResponse';
import { TenantRequest } from '../middlewares/tenant';
import { AdmissionType } from '@prisma/client';

export class AdmissionController {
  /**
   * Close/Create an admission
   */
  async create(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const admission = await admissionService.create({
        organizationId: req.organizationId!,
        closedById: req.user!.id,
        ...req.body,
      });

      ApiResponse.created(res, 'Admission closed successfully', admission);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all admissions
   */
  async findAll(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        universityId: req.query.universityId as string,
        admissionType: req.query.admissionType as AdmissionType | undefined,
        paymentStatus: req.query.paymentStatus as string,
        commissionStatus: req.query.commissionStatus as string,
        academicYear: req.query.academicYear as string,
        closedById: req.query.closedById as string,
        branchId: req.query.branchId as string,
        fromDate: req.query.fromDate ? new Date(req.query.fromDate as string) : undefined,
        toDate: req.query.toDate ? new Date(req.query.toDate as string) : undefined,
        search: req.query.search as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 50,
      };

      const result = await admissionService.findAll(req.organizationId!, filters);
      ApiResponse.success(res, 'Admissions retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a single admission
   */
  async findById(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const admission = await admissionService.findById(req.params.id, req.organizationId!);
      ApiResponse.success(res, 'Admission retrieved successfully', admission);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update an admission
   */
  async update(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const admission = await admissionService.update(
        req.params.id,
        req.organizationId!,
        req.body
      );
      ApiResponse.success(res, 'Admission updated successfully', admission);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Record a payment
   */
  async recordPayment(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const payment = await admissionService.recordPayment(
        req.params.id,
        req.organizationId!,
        {
          ...req.body,
          receivedById: req.user!.id,
        }
      );
      ApiResponse.created(res, 'Payment recorded successfully', payment);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark commission as received
   */
  async markCommissionReceived(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const admission = await admissionService.markCommissionReceived(
        req.params.id,
        req.organizationId!
      );
      ApiResponse.success(res, 'Commission marked as received', admission);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel an admission
   */
  async cancel(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const admission = await admissionService.cancel(
        req.params.id,
        req.organizationId!,
        req.body.reason
      );
      ApiResponse.success(res, 'Admission cancelled successfully', admission);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get admission statistics
   */
  async getStats(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const dateRange = req.query.from && req.query.to
        ? { from: new Date(req.query.from as string), to: new Date(req.query.to as string) }
        : undefined;

      const stats = await admissionService.getStats(req.organizationId!, dateRange);
      ApiResponse.success(res, 'Admission statistics retrieved successfully', stats);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get academic years
   */
  async getAcademicYears(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const years = await admissionService.getAcademicYears(req.organizationId!);
      ApiResponse.success(res, 'Academic years retrieved successfully', years);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Backfill commissions for existing admissions
   */
  async backfillCommissions(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await admissionService.backfillCommissions(req.organizationId!);
      ApiResponse.success(res, 'Commission backfill completed', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Backfill payment records for paid admissions
   */
  async backfillPayments(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await admissionService.backfillPayments(req.organizationId!);
      ApiResponse.success(res, 'Payment backfill completed', result);
    } catch (error) {
      next(error);
    }
  }
}

export const admissionController = new AdmissionController();
