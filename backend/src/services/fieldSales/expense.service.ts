import { prisma } from '../../config/database';
import { ExpenseCategory, ExpenseStatus, ExpenseLogAction, Prisma } from '@prisma/client';
import { BadRequestError, NotFoundError } from '../../utils/errors';

interface CreateExpenseData {
  organizationId: string;
  userId: string;
  collegeId: string;
  visitId?: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  expenseDate: Date;
  receiptUrl?: string;
}

interface ExpenseFilter {
  organizationId: string;
  userId?: string;
  collegeId?: string;
  status?: ExpenseStatus;
  category?: ExpenseCategory;
  startDate?: Date;
  endDate?: Date;
  excludeOthersDrafts?: string; // Current user ID - exclude other users' drafts
}

interface ApprovalData {
  status: 'APPROVED' | 'REJECTED';
  approverComments?: string;
}

// Expense limits per category (in INR)
const categoryLimits: Record<ExpenseCategory, number> = {
  TRAVEL_FUEL: 5000,
  TRAVEL_TAXI: 3000,
  TRAVEL_AUTO: 2000,
  TRAVEL_BUS: 1000,
  TRAVEL_TRAIN: 2000,
  TRAVEL_FLIGHT: 10000,
  TRAVEL_PARKING: 500,
  FOOD_MEALS: 1000,
  FOOD_SNACKS: 300,
  FOOD_ENTERTAINMENT: 2000,
  ACCOMMODATION: 3000,
  MARKETING_MATERIALS: 2000,
  COMMUNICATION: 500,
  OTHER: 1000,
};

export class ExpenseService {
  // ==================== CRUD OPERATIONS ====================

  async createExpense(data: CreateExpenseData) {
    // Verify college if provided
    if (data.collegeId) {
      const college = await prisma.college.findFirst({
        where: { id: data.collegeId, organizationId: data.organizationId },
      });
      if (!college) {
        throw new NotFoundError('College not found');
      }
    }

    // Verify visit if provided
    if (data.visitId) {
      const visit = await prisma.collegeVisit.findFirst({
        where: { id: data.visitId, organizationId: data.organizationId },
      });
      if (!visit) {
        throw new NotFoundError('Visit not found');
      }
    }

    // Check if amount exceeds category limit (for warning, not blocking)
    const exceedsLimit = data.amount > categoryLimits[data.category];

    // collegeId is required - validate
    if (!data.collegeId) {
      throw new BadRequestError('College is required for expenses');
    }

    const expense = await prisma.collegeExpense.create({
      data: {
        organizationId: data.organizationId,
        userId: data.userId,
        collegeId: data.collegeId,
        visitId: data.visitId,
        category: data.category,
        amount: data.amount,
        description: data.description,
        expenseDate: data.expenseDate,
        receiptUrl: data.receiptUrl,
        status: 'DRAFT',
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
        college: {
          select: { id: true, name: true, city: true },
        },
        visit: {
          select: { id: true, visitDate: true, purpose: true },
        },
      },
    });

    // Create audit log
    await this.createLog(expense.id, data.userId, 'CREATED', null, 'DRAFT', 'Expense created');

    return { expense, exceedsLimit, categoryLimit: categoryLimits[data.category] };
  }

  async getExpenses(
    filter: ExpenseFilter,
    page: number = 1,
    limit: number = 20
  ) {
    const skip = (page - 1) * limit;

    const where: Prisma.CollegeExpenseWhereInput = {
      organizationId: filter.organizationId,
    };

    if (filter.userId) where.userId = filter.userId;
    if (filter.collegeId) where.collegeId = filter.collegeId;
    if (filter.status) where.status = filter.status;
    if (filter.category) where.category = filter.category;

    if (filter.startDate || filter.endDate) {
      where.expenseDate = {};
      if (filter.startDate) where.expenseDate.gte = filter.startDate;
      if (filter.endDate) where.expenseDate.lte = filter.endDate;
    }

    // Admin/manager should not see other users' draft expenses
    // They can see: their own drafts + all non-draft expenses from everyone
    if (filter.excludeOthersDrafts) {
      where.OR = [
        { status: { not: 'DRAFT' } }, // All non-draft expenses
        { userId: filter.excludeOthersDrafts, status: 'DRAFT' }, // Own drafts only
      ];
    }

    const [expenses, total] = await Promise.all([
      prisma.collegeExpense.findMany({
        where,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
          college: {
            select: { id: true, name: true, city: true },
          },
          approvedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { expenseDate: 'desc' },
        skip,
        take: limit,
      }),
      prisma.collegeExpense.count({ where }),
    ]);

    return { expenses, total };
  }

  async getExpenseById(id: string, organizationId: string) {
    const expense = await prisma.collegeExpense.findFirst({
      where: { id, organizationId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        college: {
          select: { id: true, name: true, city: true },
        },
        visit: {
          select: { id: true, visitDate: true, purpose: true, summary: true },
        },
        approvedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!expense) {
      throw new NotFoundError('Expense not found');
    }

    return expense;
  }

  async updateExpense(id: string, organizationId: string, userId: string, data: Partial<CreateExpenseData>) {
    const expense = await prisma.collegeExpense.findFirst({
      where: { id, organizationId, userId },
    });

    if (!expense) {
      throw new NotFoundError('Expense not found');
    }

    // Can only update DRAFT expenses
    if (expense.status !== 'DRAFT') {
      throw new BadRequestError('Can only edit draft expenses');
    }

    const updated = await prisma.collegeExpense.update({
      where: { id },
      data,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
        college: {
          select: { id: true, name: true, city: true },
        },
      },
    });

    // Create audit log
    await this.createLog(id, userId, 'UPDATED', 'DRAFT', 'DRAFT', 'Expense details updated');

    return updated;
  }

  async deleteExpense(id: string, organizationId: string, userId: string) {
    const expense = await prisma.collegeExpense.findFirst({
      where: { id, organizationId, userId },
    });

    if (!expense) {
      throw new NotFoundError('Expense not found');
    }

    // Can only delete DRAFT expenses
    if (expense.status !== 'DRAFT') {
      throw new BadRequestError('Can only delete draft expenses');
    }

    await prisma.collegeExpense.delete({
      where: { id },
    });

    return { deleted: true };
  }

  // ==================== SUBMISSION & APPROVAL ====================

  async submitExpense(id: string, organizationId: string, userId: string) {
    const expense = await prisma.collegeExpense.findFirst({
      where: { id, organizationId, userId },
    });

    if (!expense) {
      throw new NotFoundError('Expense not found');
    }

    if (expense.status !== 'DRAFT') {
      throw new BadRequestError('Expense is not in draft status');
    }

    // Receipt is required for submission
    if (!expense.receiptUrl) {
      throw new BadRequestError('Receipt is required. Please upload a receipt before submitting.');
    }

    const updated = await prisma.collegeExpense.update({
      where: { id },
      data: {
        status: 'SUBMITTED',
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
        college: {
          select: { id: true, name: true, city: true },
        },
      },
    });

    // Create audit log
    await this.createLog(id, userId, 'SUBMITTED', 'DRAFT', 'SUBMITTED', 'Expense submitted for approval');

    return updated;
  }

  async submitMultipleExpenses(ids: string[], organizationId: string, userId: string) {
    const expenses = await prisma.collegeExpense.findMany({
      where: { id: { in: ids }, organizationId, userId, status: 'DRAFT' },
    });

    if (expenses.length === 0) {
      throw new BadRequestError('No valid draft expenses found');
    }

    await prisma.collegeExpense.updateMany({
      where: { id: { in: expenses.map(e => e.id) } },
      data: {
        status: 'SUBMITTED',
      },
    });

    return { submitted: expenses.length };
  }

  async approveOrRejectExpense(
    id: string,
    organizationId: string,
    approverId: string,
    data: ApprovalData
  ) {
    const expense = await prisma.collegeExpense.findFirst({
      where: { id, organizationId },
    });

    if (!expense) {
      throw new NotFoundError('Expense not found');
    }

    if (expense.status !== 'SUBMITTED') {
      throw new BadRequestError('Expense must be in submitted status');
    }

    const updated = await prisma.collegeExpense.update({
      where: { id },
      data: {
        status: data.status,
        approvedById: approverId,
        approvedAt: new Date(),
        rejectionReason: data.approverComments,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
        college: {
          select: { id: true, name: true, city: true },
        },
        approvedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Create audit log
    const action = data.status === 'APPROVED' ? 'APPROVED' : 'REJECTED';
    const comment = data.status === 'APPROVED'
      ? 'Expense approved by manager'
      : `Expense rejected: ${data.approverComments || 'No reason provided'}`;
    await this.createLog(id, approverId, action, 'SUBMITTED', data.status, comment);

    return updated;
  }

  async bulkApprove(ids: string[], organizationId: string, approverId: string) {
    const expenses = await prisma.collegeExpense.findMany({
      where: { id: { in: ids }, organizationId, status: 'SUBMITTED' },
    });

    if (expenses.length === 0) {
      throw new BadRequestError('No valid submitted expenses found');
    }

    await prisma.collegeExpense.updateMany({
      where: { id: { in: expenses.map(e => e.id) } },
      data: {
        status: 'APPROVED',
        approvedById: approverId,
        approvedAt: new Date(),
      },
    });

    return { approved: expenses.length };
  }

  async markAsPaid(id: string, organizationId: string, paidById: string, paymentReference?: string) {
    const expense = await prisma.collegeExpense.findFirst({
      where: { id, organizationId },
    });

    if (!expense) {
      throw new NotFoundError('Expense not found');
    }

    if (expense.status !== 'APPROVED') {
      throw new BadRequestError('Expense must be approved before payment');
    }

    const updated = await prisma.collegeExpense.update({
      where: { id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paymentRef: paymentReference,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Create audit log with payment details
    const comment = paymentReference
      ? `Payment processed. Reference: ${paymentReference}`
      : 'Payment processed';
    await this.createLog(id, paidById, 'PAYMENT_PROCESSED', 'APPROVED', 'PAID', comment, {
      paymentReference,
      paidAt: new Date().toISOString(),
    });

    return updated;
  }

  // ==================== PENDING APPROVALS ====================

  async getPendingApprovals(organizationId: string) {
    const expenses = await prisma.collegeExpense.findMany({
      where: {
        organizationId,
        status: 'SUBMITTED',
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
        college: {
          select: { id: true, name: true, city: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by user
    const byUser = expenses.reduce((acc, expense) => {
      const userId = expense.userId;
      if (!acc[userId]) {
        acc[userId] = {
          user: expense.user,
          expenses: [],
          totalAmount: 0,
        };
      }
      acc[userId].expenses.push(expense);
      acc[userId].totalAmount += Number(expense.amount);
      return acc;
    }, {} as Record<string, { user: any; expenses: any[]; totalAmount: number }>);

    return {
      total: expenses.length,
      totalAmount: expenses.reduce((sum, e) => sum + Number(e.amount), 0),
      byUser: Object.values(byUser),
    };
  }

  // ==================== STATISTICS ====================

  async getExpenseStats(organizationId: string, userId?: string, startDate?: Date, endDate?: Date) {
    const where: Prisma.CollegeExpenseWhereInput = {
      organizationId,
    };

    if (userId) where.userId = userId;
    if (startDate || endDate) {
      where.expenseDate = {};
      if (startDate) where.expenseDate.gte = startDate;
      if (endDate) where.expenseDate.lte = endDate;
    }

    const [
      totalExpenses,
      statusBreakdown,
      categoryBreakdown,
      totalByStatus,
    ] = await Promise.all([
      prisma.collegeExpense.count({ where }),
      prisma.collegeExpense.groupBy({
        by: ['status'],
        where,
        _count: { status: true },
        _sum: { amount: true },
      }),
      prisma.collegeExpense.groupBy({
        by: ['category'],
        where: { ...where, status: { in: ['APPROVED', 'PAID'] } },
        _sum: { amount: true },
        _count: { category: true },
      }),
      prisma.collegeExpense.aggregate({
        where: { ...where, status: { in: ['APPROVED', 'PAID'] } },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalExpenses,
      statusBreakdown: statusBreakdown.reduce((acc, item) => {
        acc[item.status] = {
          count: item._count.status,
          amount: Number(item._sum.amount || 0),
        };
        return acc;
      }, {} as Record<string, { count: number; amount: number }>),
      categoryBreakdown: categoryBreakdown.reduce((acc, item) => {
        acc[item.category] = {
          count: item._count.category,
          amount: Number(item._sum.amount || 0),
        };
        return acc;
      }, {} as Record<string, { count: number; amount: number }>),
      totalApprovedAmount: Number(totalByStatus._sum.amount || 0),
      totalMileageAmount: 0,
    };
  }

  async getUserExpenseSummary(userId: string, organizationId: string, month?: Date) {
    const startOfMonth = month || new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);

    const where: Prisma.CollegeExpenseWhereInput = {
      userId,
      organizationId,
      expenseDate: {
        gte: startOfMonth,
        lt: endOfMonth,
      },
    };

    const [
      draft,
      submitted,
      approved,
      rejected,
      paid,
    ] = await Promise.all([
      prisma.collegeExpense.aggregate({
        where: { ...where, status: 'DRAFT' },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.collegeExpense.aggregate({
        where: { ...where, status: 'SUBMITTED' },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.collegeExpense.aggregate({
        where: { ...where, status: 'APPROVED' },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.collegeExpense.aggregate({
        where: { ...where, status: 'REJECTED' },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.collegeExpense.aggregate({
        where: { ...where, status: 'PAID' },
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    return {
      month: startOfMonth,
      draft: { count: draft._count.id, amount: Number(draft._sum.amount || 0) },
      submitted: { count: submitted._count.id, amount: Number(submitted._sum.amount || 0) },
      approved: { count: approved._count.id, amount: Number(approved._sum.amount || 0) },
      rejected: { count: rejected._count.id, amount: Number(rejected._sum.amount || 0) },
      paid: { count: paid._count.id, amount: Number(paid._sum.amount || 0) },
      totalReimbursable: Number(approved._sum.amount || 0) + Number(paid._sum.amount || 0),
    };
  }

  // ==================== HELPER METHODS ====================

  getCategoryLimits() {
    return categoryLimits;
  }

  getMileageRate() {
    return 0;
  }

  // ==================== AUDIT LOG METHODS ====================

  private async createLog(
    expenseId: string,
    userId: string,
    action: ExpenseLogAction,
    fromStatus: ExpenseStatus | null,
    toStatus: ExpenseStatus | null,
    comments?: string,
    metadata?: Record<string, any>
  ) {
    return prisma.expenseLog.create({
      data: {
        expenseId,
        userId,
        action,
        fromStatus,
        toStatus,
        comments,
        metadata: metadata || undefined,
      },
    });
  }

  async getExpenseLogs(expenseId: string, organizationId: string) {
    // Verify expense belongs to organization
    const expense = await prisma.collegeExpense.findFirst({
      where: { id: expenseId, organizationId },
    });

    if (!expense) {
      throw new NotFoundError('Expense not found');
    }

    const logs = await prisma.expenseLog.findMany({
      where: { expenseId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return logs;
  }
}

export const expenseService = new ExpenseService();
