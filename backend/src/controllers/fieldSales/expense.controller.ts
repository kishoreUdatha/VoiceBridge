import { Request, Response, NextFunction } from 'express';
import { expenseService } from '../../services/fieldSales';
import { BadRequestError } from '../../utils/errors';

export class ExpenseController {
  /**
   * Create a new expense
   * POST /api/field-sales/expenses
   */
  async createExpense(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;
      const userId = req.user!.id;

      const {
        collegeId,
        visitId,
        category,
        amount,
        description,
        expenseDate,
        receiptUrl,
      } = req.body;

      if (!category || !amount || !description || !expenseDate || !collegeId) {
        throw new BadRequestError('Category, amount, description, expense date, and college are required');
      }

      const result = await expenseService.createExpense({
        organizationId,
        userId,
        collegeId,
        visitId,
        category,
        amount: parseFloat(amount),
        description,
        expenseDate: new Date(expenseDate),
        receiptUrl,
      });

      res.status(201).json({
        success: true,
        data: result.expense,
        warning: result.exceedsLimit
          ? `Amount exceeds category limit of ₹${result.categoryLimit}`
          : undefined,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all expenses
   * GET /api/field-sales/expenses
   */
  async getExpenses(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const filter: any = {
        organizationId,
        collegeId: req.query.collegeId as string,
        status: req.query.status as any,
        category: req.query.category as any,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };

      // If not admin/manager, only show own expenses
      if (!['admin', 'manager', 'owner'].includes(userRole)) {
        filter.userId = userId;
      } else if (req.query.userId) {
        filter.userId = req.query.userId as string;
      } else {
        // Admin/manager can see all expenses EXCEPT other users' drafts
        // They can only see their own drafts
        filter.excludeOthersDrafts = userId;
      }

      const { expenses, total } = await expenseService.getExpenses(filter, page, limit);

      res.json({
        success: true,
        data: expenses,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get expense by ID
   * GET /api/field-sales/expenses/:id
   */
  async getExpenseById(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;
      const { id } = req.params;

      const expense = await expenseService.getExpenseById(id, organizationId);

      res.json({
        success: true,
        data: expense,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update expense
   * PUT /api/field-sales/expenses/:id
   */
  async updateExpense(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;
      const userId = req.user!.id;
      const { id } = req.params;

      const expense = await expenseService.updateExpense(id, organizationId, userId, req.body);

      res.json({
        success: true,
        data: expense,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete expense
   * DELETE /api/field-sales/expenses/:id
   */
  async deleteExpense(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;
      const userId = req.user!.id;
      const { id } = req.params;

      await expenseService.deleteExpense(id, organizationId, userId);

      res.json({
        success: true,
        message: 'Expense deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Submit expense for approval
   * POST /api/field-sales/expenses/:id/submit
   */
  async submitExpense(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;
      const userId = req.user!.id;
      const { id } = req.params;

      const expense = await expenseService.submitExpense(id, organizationId, userId);

      res.json({
        success: true,
        data: expense,
        message: 'Expense submitted for approval',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Submit multiple expenses for approval
   * POST /api/field-sales/expenses/submit-multiple
   */
  async submitMultipleExpenses(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;
      const userId = req.user!.id;
      const { ids } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw new BadRequestError('Expense IDs array is required');
      }

      const result = await expenseService.submitMultipleExpenses(ids, organizationId, userId);

      res.json({
        success: true,
        data: result,
        message: `${result.submitted} expenses submitted for approval`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Approve or reject expense
   * POST /api/field-sales/expenses/:id/approve
   */
  async approveOrRejectExpense(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;
      const approverId = req.user!.id;
      const { id } = req.params;
      const { status, approverComments } = req.body;

      if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
        throw new BadRequestError('Status must be APPROVED or REJECTED');
      }

      const expense = await expenseService.approveOrRejectExpense(id, organizationId, approverId, {
        status,
        approverComments,
      });

      res.json({
        success: true,
        data: expense,
        message: `Expense ${status.toLowerCase()}`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk approve expenses
   * POST /api/field-sales/expenses/bulk-approve
   */
  async bulkApprove(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;
      const approverId = req.user!.id;
      const { ids } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw new BadRequestError('Expense IDs array is required');
      }

      const result = await expenseService.bulkApprove(ids, organizationId, approverId);

      res.json({
        success: true,
        data: result,
        message: `${result.approved} expenses approved`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark expense as paid
   * POST /api/field-sales/expenses/:id/paid
   */
  async markAsPaid(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;
      const paidById = req.user!.id;
      const { id } = req.params;
      const { paymentReference } = req.body;

      const expense = await expenseService.markAsPaid(id, organizationId, paidById, paymentReference);

      res.json({
        success: true,
        data: expense,
        message: 'Expense marked as paid',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get pending approvals
   * GET /api/field-sales/expenses/pending-approvals
   */
  async getPendingApprovals(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;

      const result = await expenseService.getPendingApprovals(organizationId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get expense statistics
   * GET /api/field-sales/expenses/stats
   */
  async getExpenseStats(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      const filterUserId = ['admin', 'manager', 'owner'].includes(userRole)
        ? (req.query.userId as string) || undefined
        : userId;

      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : undefined;
      const endDate = req.query.endDate
        ? new Date(req.query.endDate as string)
        : undefined;

      const stats = await expenseService.getExpenseStats(
        organizationId,
        filterUserId,
        startDate,
        endDate
      );

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user expense summary for a month
   * GET /api/field-sales/expenses/my-summary
   */
  async getUserExpenseSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;
      const userId = req.user!.id;
      const month = req.query.month ? new Date(req.query.month as string) : undefined;

      const summary = await expenseService.getUserExpenseSummary(userId, organizationId, month);

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get category limits
   * GET /api/field-sales/expenses/limits
   */
  async getCategoryLimits(req: Request, res: Response, next: NextFunction) {
    try {
      const limits = expenseService.getCategoryLimits();
      const mileageRate = expenseService.getMileageRate();

      res.json({
        success: true,
        data: {
          categoryLimits: limits,
          mileageRate,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get expense transaction logs (audit trail)
   * GET /api/field-sales/expenses/:id/logs
   */
  async getExpenseLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;
      const { id } = req.params;

      const logs = await expenseService.getExpenseLogs(id, organizationId);

      res.json({
        success: true,
        data: logs,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const expenseController = new ExpenseController();
