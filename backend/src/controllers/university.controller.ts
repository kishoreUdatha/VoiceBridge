import { Response, NextFunction } from 'express';
import { universityService } from '../services/university.service';
import { ApiResponse } from '../utils/apiResponse';
import { TenantRequest } from '../middlewares/tenant';

export class UniversityController {
  /**
   * Create a new university
   */
  async create(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const university = await universityService.create({
        organizationId: req.organizationId!,
        ...req.body,
      });

      ApiResponse.created(res, 'University created successfully', university);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all universities
   */
  async findAll(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        search: req.query.search as string,
        type: req.query.type as string,
        state: req.query.state as string,
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 50,
      };

      const result = await universityService.findAll(req.organizationId!, filters);
      ApiResponse.success(res, 'Universities retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a single university by ID
   */
  async findById(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const university = await universityService.findById(req.params.id, req.organizationId!);
      ApiResponse.success(res, 'University retrieved successfully', university);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a university
   */
  async update(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const university = await universityService.update(
        req.params.id,
        req.organizationId!,
        req.body
      );
      ApiResponse.success(res, 'University updated successfully', university);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a university (soft delete)
   */
  async delete(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await universityService.delete(req.params.id, req.organizationId!);
      ApiResponse.success(res, 'University deleted successfully', { deleted: true });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get university performance statistics
   */
  async getStats(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const dateRange = req.query.from && req.query.to
        ? { from: new Date(req.query.from as string), to: new Date(req.query.to as string) }
        : undefined;

      const stats = await universityService.getStats(
        req.params.id,
        req.organizationId!,
        dateRange
      );
      ApiResponse.success(res, 'University statistics retrieved successfully', stats);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all university types
   */
  async getTypes(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const types = await universityService.getTypes(req.organizationId!);
      ApiResponse.success(res, 'University types retrieved successfully', types);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all states with universities
   */
  async getStates(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const states = await universityService.getStates(req.organizationId!);
      ApiResponse.success(res, 'University states retrieved successfully', states);
    } catch (error) {
      next(error);
    }
  }
}

export const universityController = new UniversityController();
