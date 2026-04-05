import { Response, NextFunction } from 'express';
import { profitService } from '../services/profit.service';
import { ApiResponse } from '../utils/apiResponse';
import { TenantRequest } from '../middlewares/tenant';

export class ProfitController {
  /**
   * Get profit dashboard
   */
  async getDashboard(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const dateRange = req.query.from && req.query.to
        ? { from: new Date(req.query.from as string), to: new Date(req.query.to as string) }
        : undefined;

      const dashboard = await profitService.getDashboard(req.organizationId!, dateRange);
      ApiResponse.success(res, 'Profit dashboard retrieved successfully', dashboard);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get profit by university
   */
  async getByUniversity(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const dateRange = req.query.from && req.query.to
        ? { from: new Date(req.query.from as string), to: new Date(req.query.to as string) }
        : undefined;

      const data = await profitService.getProfitByUniversity(req.organizationId!, dateRange);
      ApiResponse.success(res, 'Profit by university retrieved successfully', data);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get monthly profit trend
   */
  async getMonthlyTrend(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const months = parseInt(req.query.months as string) || 12;
      const trend = await profitService.getMonthlyTrend(req.organizationId!, months);
      ApiResponse.success(res, 'Monthly trend retrieved successfully', trend);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get profit by user
   */
  async getByUser(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const dateRange = req.query.from && req.query.to
        ? { from: new Date(req.query.from as string), to: new Date(req.query.to as string) }
        : undefined;

      const data = await profitService.getProfitByUser(req.organizationId!, dateRange);
      ApiResponse.success(res, 'Profit by user retrieved successfully', data);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get top universities
   */
  async getTopUniversities(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const dateRange = req.query.from && req.query.to
        ? { from: new Date(req.query.from as string), to: new Date(req.query.to as string) }
        : undefined;

      const data = await profitService.getTopUniversities(req.organizationId!, limit, dateRange);
      ApiResponse.success(res, 'Top universities retrieved successfully', data);
    } catch (error) {
      next(error);
    }
  }
}

export const profitController = new ProfitController();
