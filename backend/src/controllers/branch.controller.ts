import { Response, NextFunction } from 'express';
import { branchService } from '../services/branch.service';
import { ApiResponse } from '../utils/apiResponse';
import { TenantRequest } from '../middlewares/tenant';

export class BranchController {
  /**
   * Create a new branch
   */
  async create(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branch = await branchService.create({
        organizationId: req.organizationId!,
        ...req.body,
      });

      ApiResponse.created(res, 'Branch created successfully', branch);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all branches for the organization
   */
  async findAll(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const isActive = req.query.isActive === 'true' ? true :
                       req.query.isActive === 'false' ? false :
                       undefined;

      const branches = await branchService.findAll(req.organizationId!, { isActive });

      ApiResponse.success(res, 'Branches retrieved successfully', branches);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a single branch by ID
   */
  async findById(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branch = await branchService.findById(req.params.id, req.organizationId!);
      ApiResponse.success(res, 'Branch retrieved successfully', branch);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a branch
   */
  async update(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branch = await branchService.update(
        req.params.id,
        req.organizationId!,
        req.body
      );
      ApiResponse.success(res, 'Branch updated successfully', branch);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a branch (soft delete)
   */
  async delete(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await branchService.delete(req.params.id, req.organizationId!);
      ApiResponse.success(res, 'Branch deleted successfully', { deleted: true });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Assign a manager to a branch
   */
  async assignManager(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.body;
      const branch = await branchService.assignManager(
        req.params.id,
        userId,
        req.organizationId!
      );
      ApiResponse.success(res, 'Branch manager assigned successfully', branch);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Assign users to a branch
   */
  async assignUsers(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userIds } = req.body;
      const result = await branchService.assignUsers(
        req.params.id,
        userIds,
        req.organizationId!
      );
      ApiResponse.success(res, 'Users assigned to branch successfully', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove users from a branch
   */
  async removeUsers(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userIds } = req.body;
      const result = await branchService.removeUsers(
        req.params.id,
        userIds,
        req.organizationId!
      );
      ApiResponse.success(res, 'Users removed from branch successfully', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get users for a branch
   */
  async getUsers(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await branchService.getBranchUsers(
        req.params.id,
        req.organizationId!
      );
      ApiResponse.success(res, 'Branch users retrieved successfully', users);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get branch statistics
   */
  async getStats(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await branchService.getBranchStats(
        req.params.id,
        req.organizationId!
      );
      ApiResponse.success(res, 'Branch statistics retrieved successfully', stats);
    } catch (error) {
      next(error);
    }
  }
}

export const branchController = new BranchController();
