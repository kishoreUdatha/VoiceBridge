import { Response, NextFunction } from 'express';
import { businessExpenseService } from '../services/business-expense.service';
import { ApiResponse } from '../utils/apiResponse';
import { TenantRequest } from '../middlewares/tenant';

export class BusinessExpenseController {
  /**
   * Create a new expense
   */
  async create(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const expense = await businessExpenseService.create({
        organizationId: req.organizationId!,
        createdById: req.user!.id,
        ...req.body,
      });

      ApiResponse.created(res, 'Expense created successfully', expense);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all expenses
   */
  async findAll(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        category: req.query.category as string,
        status: req.query.status as string,
        universityId: req.query.universityId as string,
        fromDate: req.query.fromDate ? new Date(req.query.fromDate as string) : undefined,
        toDate: req.query.toDate ? new Date(req.query.toDate as string) : undefined,
        search: req.query.search as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 50,
      };

      const result = await businessExpenseService.findAll(req.organizationId!, filters);
      ApiResponse.success(res, 'Expenses retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a single expense
   */
  async findById(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const expense = await businessExpenseService.findById(req.params.id, req.organizationId!);
      ApiResponse.success(res, 'Expense retrieved successfully', expense);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update an expense
   */
  async update(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const expense = await businessExpenseService.update(
        req.params.id,
        req.organizationId!,
        req.body
      );
      ApiResponse.success(res, 'Expense updated successfully', expense);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete an expense
   */
  async delete(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await businessExpenseService.delete(req.params.id, req.organizationId!);
      ApiResponse.success(res, 'Expense deleted successfully', { deleted: true });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get expense summary by category
   */
  async getSummary(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const dateRange = req.query.from && req.query.to
        ? { from: new Date(req.query.from as string), to: new Date(req.query.to as string) }
        : undefined;

      const summary = await businessExpenseService.getSummaryByCategory(req.organizationId!, dateRange);
      ApiResponse.success(res, 'Expense summary retrieved successfully', summary);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get monthly expense trend
   */
  async getMonthlyTrend(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const months = parseInt(req.query.months as string) || 12;
      const trend = await businessExpenseService.getMonthlyTrend(req.organizationId!, months);
      ApiResponse.success(res, 'Monthly trend retrieved successfully', trend);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get available categories
   */
  async getCategories(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const categories = businessExpenseService.getCategories();
      ApiResponse.success(res, 'Categories retrieved successfully', categories);
    } catch (error) {
      next(error);
    }
  }
}

export const businessExpenseController = new BusinessExpenseController();
