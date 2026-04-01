import { Response, NextFunction } from 'express';
import { userService } from '../services/user.service';
import { ApiResponse } from '../utils/apiResponse';
import { TenantRequest } from '../middlewares/tenant';

export class UserController {
  async create(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.create({
        organizationId: req.organizationId!,
        ...req.body,
      });

      ApiResponse.created(res, 'User created successfully', user);
    } catch (error) {
      next(error);
    }
  }

  async findById(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.findById(req.params.id, req.organizationId!);

      ApiResponse.success(res, 'User retrieved successfully', user);
    } catch (error) {
      next(error);
    }
  }

  async findAll(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const filter = {
        organizationId: req.organizationId!,
        roleSlug: req.query.role as string | undefined,
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
        search: req.query.search as string | undefined,
      };

      const { users, total } = await userService.findAll(filter, page, limit);

      ApiResponse.paginated(res, 'Users retrieved successfully', users, page, limit, total);
    } catch (error) {
      next(error);
    }
  }

  async update(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.update(req.params.id, req.organizationId!, req.body);

      ApiResponse.success(res, 'User updated successfully', user);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await userService.delete(req.params.id, req.organizationId!);

      ApiResponse.success(res, 'User deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  async getCounselors(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const counselors = await userService.getCounselors(req.organizationId!);

      ApiResponse.success(res, 'Counselors retrieved successfully', counselors);
    } catch (error) {
      next(error);
    }
  }

  async getTelecallers(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const telecallers = await userService.getTelecallers(req.organizationId!);

      ApiResponse.success(res, 'Telecallers retrieved successfully', telecallers);
    } catch (error) {
      next(error);
    }
  }

  async getRoles(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const roles = await userService.getRoles(req.organizationId!);

      ApiResponse.success(res, 'Roles retrieved successfully', roles);
    } catch (error) {
      next(error);
    }
  }

  async getManagers(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const managers = await userService.getManagers(req.organizationId!);

      ApiResponse.success(res, 'Managers retrieved successfully', managers);
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
