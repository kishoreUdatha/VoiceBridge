import { Response, NextFunction } from 'express';
import { userManagementService } from '../services/user-management.service';
import { ApiResponse } from '../utils/apiResponse';
import { TenantRequest } from '../middlewares/tenant';

export class UserManagementController {
  // ================== LOGIN HISTORY ==================

  async getLoginHistory(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const userId = req.query.userId as string | undefined;

      const { history, total } = await userManagementService.getLoginHistory(
        req.organizationId!,
        userId,
        page,
        limit
      );

      ApiResponse.paginated(res, 'Login history retrieved successfully', history, page, limit, total);
    } catch (error) {
      next(error);
    }
  }

  async getUserLoginHistory(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const { history, total } = await userManagementService.getLoginHistory(
        req.organizationId!,
        req.params.id,
        page,
        limit
      );

      ApiResponse.paginated(res, 'User login history retrieved successfully', history, page, limit, total);
    } catch (error) {
      next(error);
    }
  }

  // ================== SESSION MANAGEMENT ==================

  async getAllActiveSessions(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessions = await userManagementService.getAllActiveSessions(req.organizationId!);
      ApiResponse.success(res, 'Active sessions retrieved successfully', sessions);
    } catch (error) {
      next(error);
    }
  }

  async getUserSessions(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessions = await userManagementService.getActiveSessions(
        req.organizationId!,
        req.params.id
      );
      ApiResponse.success(res, 'User sessions retrieved successfully', sessions);
    } catch (error) {
      next(error);
    }
  }

  async revokeSession(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await userManagementService.revokeSession(req.params.sessionId, req.organizationId!);
      ApiResponse.success(res, 'Session revoked successfully');
    } catch (error) {
      next(error);
    }
  }

  async revokeAllUserSessions(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await userManagementService.revokeAllUserSessions(
        req.params.id,
        req.organizationId!,
        req.body.exceptCurrentSession ? req.body.currentToken : undefined
      );
      ApiResponse.success(res, 'All user sessions revoked successfully');
    } catch (error) {
      next(error);
    }
  }

  // ================== BULK OPERATIONS ==================

  async bulkUpdateUsers(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userIds, roleId, managerId, isActive } = req.body;

      const result = await userManagementService.bulkUpdateUsers(req.organizationId!, {
        userIds,
        roleId,
        managerId,
        isActive,
      });

      ApiResponse.success(res, `${result.updated} users updated successfully`, result);
    } catch (error) {
      next(error);
    }
  }

  async bulkDeleteUsers(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userIds } = req.body;

      const result = await userManagementService.bulkDeleteUsers(req.organizationId!, userIds);

      ApiResponse.success(res, `${result.deleted} users deleted successfully`, result);
    } catch (error) {
      next(error);
    }
  }

  // ================== CSV IMPORT ==================

  async importUsers(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { users } = req.body;

      const result = await userManagementService.importUsersFromCSV(req.organizationId!, users);

      ApiResponse.success(
        res,
        `Import complete: ${result.success} successful, ${result.failed} failed`,
        result
      );
    } catch (error) {
      next(error);
    }
  }

  // ================== USER ANALYTICS ==================

  async getUserAnalytics(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const analytics = await userManagementService.getUserAnalytics(
        req.organizationId!,
        req.params.id
      );
      ApiResponse.success(res, 'User analytics retrieved successfully', analytics);
    } catch (error) {
      next(error);
    }
  }

  async getBulkUserAnalytics(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userIds = (req.query.userIds as string)?.split(',').filter(Boolean) || [];

      if (userIds.length === 0) {
        ApiResponse.success(res, 'No user IDs provided', {});
        return;
      }

      const analytics = await userManagementService.getBulkUserAnalytics(
        req.organizationId!,
        userIds
      );
      ApiResponse.success(res, 'User analytics retrieved successfully', analytics);
    } catch (error) {
      next(error);
    }
  }

  // ================== 2FA MANAGEMENT ==================

  async toggle2FA(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { enabled } = req.body;
      const result = await userManagementService.toggle2FA(
        req.params.id,
        req.organizationId!,
        enabled
      );
      ApiResponse.success(res, `Two-factor authentication ${enabled ? 'enabled' : 'disabled'}`, result);
    } catch (error) {
      next(error);
    }
  }
}

export const userManagementController = new UserManagementController();
