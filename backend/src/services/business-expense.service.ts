import { prisma } from '../config/database';
import { Prisma } from '@prisma/client';
import { NotFoundError, BadRequestError } from '../utils/errors';

interface CreateExpenseInput {
  organizationId: string;
  category: string;
  description: string;
  amount: number;
  expenseDate: Date;
  universityId?: string;
  leadId?: string;
  receiptUrl?: string;
  vendorName?: string;
  createdById: string;
}

interface UpdateExpenseInput {
  category?: string;
  description?: string;
  amount?: number;
  expenseDate?: Date;
  universityId?: string | null;
  leadId?: string | null;
  receiptUrl?: string | null;
  vendorName?: string | null;
  status?: string;
}

interface ExpenseFilters {
  category?: string;
  status?: string;
  fromDate?: Date;
  toDate?: Date;
  universityId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const EXPENSE_CATEGORIES = [
  'MARKETING',
  'SALARY',
  'RENT',
  'TRAVEL',
  'UTILITIES',
  'OFFICE_SUPPLIES',
  'COMMISSION_PAYOUT',
  'OTHER',
];

export class BusinessExpenseService {
  /**
   * Create a new expense
   */
  async create(input: CreateExpenseInput) {
    if (!EXPENSE_CATEGORIES.includes(input.category)) {
      throw new BadRequestError(`Invalid category. Must be one of: ${EXPENSE_CATEGORIES.join(', ')}`);
    }

    const expense = await prisma.businessExpense.create({
      data: {
        organizationId: input.organizationId,
        category: input.category,
        description: input.description,
        amount: input.amount,
        expenseDate: input.expenseDate,
        universityId: input.universityId,
        leadId: input.leadId,
        receiptUrl: input.receiptUrl,
        vendorName: input.vendorName,
        createdById: input.createdById,
      },
      include: {
        createdBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    return expense;
  }

  /**
   * Find all expenses with filters
   */
  async findAll(organizationId: string, filters: ExpenseFilters = {}) {
    const { category, status, fromDate, toDate, universityId, search, page = 1, limit = 50 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.BusinessExpenseWhereInput = { organizationId };

    if (category) where.category = category;
    if (status) where.status = status;
    if (universityId) where.universityId = universityId;

    if (fromDate || toDate) {
      where.expenseDate = {};
      if (fromDate) where.expenseDate.gte = fromDate;
      if (toDate) where.expenseDate.lte = toDate;
    }

    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { vendorName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [expenses, total] = await Promise.all([
      prisma.businessExpense.findMany({
        where,
        include: {
          createdBy: {
            select: { firstName: true, lastName: true },
          },
        },
        orderBy: { expenseDate: 'desc' },
        skip,
        take: limit,
      }),
      prisma.businessExpense.count({ where }),
    ]);

    return {
      expenses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find an expense by ID
   */
  async findById(id: string, organizationId: string) {
    const expense = await prisma.businessExpense.findFirst({
      where: { id, organizationId },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!expense) {
      throw new NotFoundError('Expense not found');
    }

    return expense;
  }

  /**
   * Update an expense
   */
  async update(id: string, organizationId: string, data: UpdateExpenseInput) {
    const existing = await prisma.businessExpense.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundError('Expense not found');
    }

    if (data.category && !EXPENSE_CATEGORIES.includes(data.category)) {
      throw new BadRequestError(`Invalid category. Must be one of: ${EXPENSE_CATEGORIES.join(', ')}`);
    }

    const expense = await prisma.businessExpense.update({
      where: { id },
      data,
      include: {
        createdBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    return expense;
  }

  /**
   * Delete an expense
   */
  async delete(id: string, organizationId: string) {
    const expense = await prisma.businessExpense.findFirst({
      where: { id, organizationId },
    });

    if (!expense) {
      throw new NotFoundError('Expense not found');
    }

    await prisma.businessExpense.delete({ where: { id } });
  }

  /**
   * Get expense summary by category
   */
  async getSummaryByCategory(organizationId: string, dateRange?: { from: Date; to: Date }) {
    const dateFilter = dateRange
      ? { gte: dateRange.from, lte: dateRange.to }
      : undefined;

    const where: Prisma.BusinessExpenseWhereInput = {
      organizationId,
      status: 'APPROVED',
      ...(dateFilter && { expenseDate: dateFilter }),
    };

    const summary = await prisma.businessExpense.groupBy({
      by: ['category'],
      where,
      _sum: { amount: true },
      _count: true,
    });

    const total = summary.reduce((sum, item) => sum + (Number(item._sum.amount) || 0), 0);

    return {
      byCategory: summary.map((s) => ({
        category: s.category,
        amount: Number(s._sum.amount) || 0,
        count: s._count,
        percentage: total > 0 ? ((Number(s._sum.amount) || 0) / total) * 100 : 0,
      })),
      total,
    };
  }

  /**
   * Get monthly expense trend
   */
  async getMonthlyTrend(organizationId: string, months: number = 12) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months + 1);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const expenses = await prisma.businessExpense.findMany({
      where: {
        organizationId,
        status: 'APPROVED',
        expenseDate: { gte: startDate },
      },
      select: {
        amount: true,
        expenseDate: true,
        category: true,
      },
      orderBy: { expenseDate: 'asc' },
    });

    // Group by month
    const monthlyData: Record<string, { total: number; byCategory: Record<string, number> }> = {};

    expenses.forEach((expense) => {
      const monthKey = `${expense.expenseDate.getFullYear()}-${String(expense.expenseDate.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { total: 0, byCategory: {} };
      }
      monthlyData[monthKey].total += Number(expense.amount);
      monthlyData[monthKey].byCategory[expense.category] =
        (monthlyData[monthKey].byCategory[expense.category] || 0) + Number(expense.amount);
    });

    return Object.entries(monthlyData).map(([month, data]) => ({
      month,
      ...data,
    }));
  }

  /**
   * Get available categories
   */
  getCategories() {
    return EXPENSE_CATEGORIES;
  }
}

export const businessExpenseService = new BusinessExpenseService();
