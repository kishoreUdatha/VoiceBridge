import { Response, NextFunction } from 'express';
import { leadService } from '../services/lead.service';
import { bulkUploadService } from '../services/bulkUpload.service';
import { ApiResponse } from '../utils/apiResponse';
import { TenantRequest } from '../middlewares/tenant';
import { LeadSource, LeadPriority } from '@prisma/client';
import { hasElevatedAccess, getLeadAccessContext } from '../utils/leadAccess';

export class LeadController {
  async create(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const lead = await leadService.create({
        organizationId: req.organizationId!,
        ...req.body,
      });

      ApiResponse.created(res, 'Lead created successfully', lead);
    } catch (error) {
      next(error);
    }
  }

  async findById(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const lead = await leadService.findById(req.params.id, req.organizationId!);

      ApiResponse.success(res, 'Lead retrieved successfully', lead);
    } catch (error) {
      next(error);
    }
  }

  async findAll(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const userRole = req.user!.role;
      const userId = req.user!.id;

      // For telecallers/counselors, force filter to only their assigned leads
      let assignedToIdFilter = req.query.assignedToId as string | undefined;
      if (!hasElevatedAccess(userRole)) {
        // Non-elevated users can only see their own assigned leads
        assignedToIdFilter = userId;
      }

      const filter = {
        organizationId: req.organizationId!,
        stageId: req.query.stageId as string | undefined,
        source: req.query.source as LeadSource | undefined,
        priority: req.query.priority as LeadPriority | undefined,
        assignedToId: assignedToIdFilter,
        search: req.query.search as string | undefined,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
        isConverted: req.query.isConverted === 'true' ? true : req.query.isConverted === 'false' ? false : undefined,
      };

      const { leads, total } = await leadService.findAll(filter, page, limit);

      ApiResponse.paginated(res, 'Leads retrieved successfully', leads, page, limit, total);
    } catch (error) {
      next(error);
    }
  }

  async update(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const lead = await leadService.update(req.params.id, req.organizationId!, req.body);

      ApiResponse.success(res, 'Lead updated successfully', lead);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await leadService.delete(req.params.id, req.organizationId!);

      ApiResponse.success(res, 'Lead deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  async assign(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { assignedToId } = req.body;
      const assignment = await leadService.assignLead(
        req.params.id,
        assignedToId,
        req.user!.id,
        req.organizationId!
      );

      ApiResponse.success(res, 'Lead assigned successfully', assignment);
    } catch (error) {
      next(error);
    }
  }

  async getStats(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userRole = req.user!.role;
      const userId = req.user!.id;

      // For telecallers/counselors, only show stats for their assigned leads
      const assignedToId = hasElevatedAccess(userRole) ? undefined : userId;

      const stats = await leadService.getStats(req.organizationId!, assignedToId);

      ApiResponse.success(res, 'Lead statistics retrieved successfully', stats);
    } catch (error) {
      next(error);
    }
  }

  async bulkUpload(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        ApiResponse.error(res, 'No file uploaded', 400);
        return;
      }

      // Use new flow: upload to raw import records (not leads directly)
      const result = await bulkUploadService.processUploadToRaw(
        req.organizationId!,
        req.user!.id,
        req.file.buffer,
        req.file.mimetype,
        req.file.originalname,
        req.file.size
      );

      ApiResponse.success(res, 'Bulk upload processed successfully', {
        bulkImportId: result.bulkImportId,
        totalRows: result.totalRows,
        validRows: result.validRows,
        duplicateRows: result.duplicateRows,
        invalidRows: result.invalidRows,
        insertedRecords: result.insertedRecords,
        // For backward compatibility with frontend
        insertedLeads: 0,
        duplicates: [],
        errors: [],
      });
    } catch (error) {
      next(error);
    }
  }

  async assignBulk(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { source, counselorIds } = req.body;

      const result = await leadService.assignBulk(
        req.organizationId!,
        counselorIds,
        req.user!.id,
        source
      );

      ApiResponse.success(res, 'Leads assigned successfully', result);
    } catch (error) {
      next(error);
    }
  }
}

export const leadController = new LeadController();
