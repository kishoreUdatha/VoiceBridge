import { Response, NextFunction } from 'express';
import { rawImportService } from '../services/rawImport.service';
import { ApiResponse } from '../utils/apiResponse';
import { TenantRequest } from '../middlewares/tenant';
import { RawImportRecordStatus, LeadSource, LeadPriority } from '@prisma/client';

export class RawImportController {
  // ==================== BULK IMPORTS ====================

  async listBulkImports(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const { imports, total } = await rawImportService.getBulkImports(
        req.organizationId!,
        page,
        limit
      );

      ApiResponse.paginated(res, 'Bulk imports retrieved successfully', imports, page, limit, total);
    } catch (error) {
      next(error);
    }
  }

  async getBulkImport(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const bulkImport = await rawImportService.getBulkImportById(
        req.params.id,
        req.organizationId!
      );

      ApiResponse.success(res, 'Bulk import retrieved successfully', bulkImport);
    } catch (error) {
      next(error);
    }
  }

  async getStats(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await rawImportService.getStats(req.organizationId!);

      ApiResponse.success(res, 'Raw import stats retrieved successfully', stats);
    } catch (error) {
      next(error);
    }
  }

  async getTelecallerAssignmentStats(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await rawImportService.getTelecallerAssignmentStats(req.organizationId!);

      ApiResponse.success(res, 'Telecaller assignment stats retrieved successfully', stats);
    } catch (error) {
      next(error);
    }
  }

  // ==================== RECORDS ====================

  async listRecords(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const filter = {
        organizationId: req.organizationId!,
        bulkImportId: req.query.bulkImportId as string | undefined,
        status: req.query.status as RawImportRecordStatus | undefined,
        assignedToId: req.query.assignedToId as string | undefined,
        assignedAgentId: req.query.assignedAgentId as string | undefined,
        search: req.query.search as string | undefined,
      };

      const { records, total } = await rawImportService.getRecords(filter, page, limit);

      ApiResponse.paginated(res, 'Records retrieved successfully', records, page, limit, total);
    } catch (error) {
      next(error);
    }
  }

  async getRecord(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const record = await rawImportService.getRecordById(
        req.params.id,
        req.organizationId!
      );

      ApiResponse.success(res, 'Record retrieved successfully', record);
    } catch (error) {
      next(error);
    }
  }

  // ==================== ASSIGNMENT ====================

  async assignToTelecallers(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { recordIds, telecallerIds } = req.body;

      const result = await rawImportService.assignToTelecallers(
        recordIds,
        telecallerIds,
        req.user!.id,
        req.organizationId!
      );

      ApiResponse.success(res, 'Records assigned to telecallers successfully', result);
    } catch (error) {
      next(error);
    }
  }

  async assignToAIAgent(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { recordIds, agentId } = req.body;

      const result = await rawImportService.assignToAIAgent(
        recordIds,
        agentId,
        req.user!.id,
        req.organizationId!
      );

      ApiResponse.success(res, 'Records assigned to AI agent successfully', result);
    } catch (error) {
      next(error);
    }
  }

  // ==================== STATUS UPDATES ====================

  async updateRecordStatus(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, notes, callSummary, callSentiment, interestLevel, outboundCallId } = req.body;

      const record = await rawImportService.updateRecordStatus(
        req.params.id,
        req.organizationId!,
        status,
        { notes, callSummary, callSentiment, interestLevel, outboundCallId }
      );

      ApiResponse.success(res, 'Record status updated successfully', record);
    } catch (error) {
      next(error);
    }
  }

  // ==================== CONVERSION ====================

  async convertToLead(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { source, priority, notes } = req.body;

      const lead = await rawImportService.convertToLead(
        req.params.id,
        req.organizationId!,
        req.user!.id,
        {
          source: source as LeadSource,
          priority: priority as LeadPriority,
          notes,
        }
      );

      ApiResponse.created(res, 'Record converted to lead successfully', lead);
    } catch (error) {
      next(error);
    }
  }

  async bulkConvertToLeads(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { recordIds } = req.body;

      const result = await rawImportService.bulkConvertToLeads(
        recordIds,
        req.organizationId!,
        req.user!.id
      );

      ApiResponse.success(res, 'Records converted to leads successfully', result);
    } catch (error) {
      next(error);
    }
  }

  async bulkUpdateStatus(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { recordIds, status } = req.body;

      const result = await rawImportService.bulkUpdateStatus(
        recordIds,
        req.organizationId!,
        status as RawImportRecordStatus
      );

      ApiResponse.success(res, 'Record statuses updated successfully', result);
    } catch (error) {
      next(error);
    }
  }

  // ==================== DELETE ====================

  async deleteRecord(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await rawImportService.deleteRecord(req.params.id, req.organizationId!);
      ApiResponse.success(res, 'Record deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  async bulkDeleteRecords(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { recordIds } = req.body;
      const result = await rawImportService.bulkDeleteRecords(recordIds, req.organizationId!);
      ApiResponse.success(res, 'Records deleted successfully', result);
    } catch (error) {
      next(error);
    }
  }

  async deleteBulkImport(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await rawImportService.deleteBulkImport(req.params.id, req.organizationId!);
      ApiResponse.success(res, 'Import and all records deleted successfully', result);
    } catch (error) {
      next(error);
    }
  }

  // ==================== MANUAL RECORD ADDITION ====================

  async addManualRecord(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { bulkImportId, firstName, lastName, email, phone, alternatePhone, customFields } = req.body;

      const record = await rawImportService.addManualRecord(
        bulkImportId,
        req.organizationId!,
        {
          firstName,
          lastName,
          email,
          phone,
          alternatePhone,
          customFields,
        }
      );

      ApiResponse.created(res, 'Record added successfully', record);
    } catch (error) {
      next(error);
    }
  }

  async addBulkManualRecords(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { bulkImportId, records } = req.body;

      const result = await rawImportService.addBulkManualRecords(
        bulkImportId,
        req.organizationId!,
        records
      );

      ApiResponse.created(res, `${result.count} records added successfully`, result);
    } catch (error) {
      next(error);
    }
  }
}

export const rawImportController = new RawImportController();
