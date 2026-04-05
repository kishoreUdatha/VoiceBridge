import { prisma } from '../config/database';
import { Prisma } from '@prisma/client';

interface DateRange {
  from: Date;
  to: Date;
}

interface ProfitDashboardData {
  revenue: {
    totalFees: number;
    totalDonations: number;
    totalCommission: number;
    receivedCommission: number;
    pendingCommission: number;
  };
  expenses: {
    total: number;
    byCategory: { category: string; amount: number }[];
  };
  profit: {
    gross: number;
    net: number;
    margin: number;
  };
  admissions: {
    total: number;
    donation: number;
    nonDonation: number;
    targetProgress?: number;
  };
}

export class ProfitService {
  /**
   * Get profit dashboard data
   */
  async getDashboard(organizationId: string, dateRange?: DateRange): Promise<ProfitDashboardData> {
    const dateFilter = dateRange
      ? { gte: dateRange.from, lte: dateRange.to }
      : undefined;

    const admissionWhere: Prisma.AdmissionWhereInput = {
      organizationId,
      status: 'ACTIVE',
      ...(dateFilter && { closedAt: dateFilter }),
    };

    const expenseWhere: Prisma.BusinessExpenseWhereInput = {
      organizationId,
      status: 'APPROVED',
      ...(dateFilter && { expenseDate: dateFilter }),
    };

    const [
      admissionStats,
      commissionStats,
      expensesByCategory,
      admissionCount,
    ] = await Promise.all([
      // Revenue from admissions
      prisma.admission.aggregate({
        where: admissionWhere,
        _sum: {
          totalFee: true,
          donationAmount: true,
          commissionAmount: true,
        },
      }),
      // Commission status breakdown
      prisma.admission.groupBy({
        by: ['commissionStatus'],
        where: admissionWhere,
        _sum: { commissionAmount: true },
      }),
      // Expenses by category
      prisma.businessExpense.groupBy({
        by: ['category'],
        where: expenseWhere,
        _sum: { amount: true },
      }),
      // Admission counts by type
      prisma.admission.groupBy({
        by: ['admissionType'],
        where: admissionWhere,
        _count: true,
      }),
    ]);

    // Calculate totals
    const totalFees = Number(admissionStats._sum.totalFee) || 0;
    const totalDonations = Number(admissionStats._sum.donationAmount) || 0;
    const totalCommission = Number(admissionStats._sum.commissionAmount) || 0;

    const receivedCommission = commissionStats
      .filter((c) => c.commissionStatus === 'RECEIVED')
      .reduce((sum, c) => sum + (Number(c._sum.commissionAmount) || 0), 0);
    const pendingCommission = totalCommission - receivedCommission;

    const expenseTotal = expensesByCategory.reduce(
      (sum, e) => sum + (Number(e._sum.amount) || 0),
      0
    );

    const donationAdmissions = admissionCount
      .filter((a) => a.admissionType === 'DONATION')
      .reduce((sum, a) => sum + a._count, 0);
    const nonDonationAdmissions = admissionCount
      .filter((a) => a.admissionType !== 'DONATION')
      .reduce((sum, a) => sum + a._count, 0);
    const totalAdmissions = donationAdmissions + nonDonationAdmissions;

    // Gross profit = Commission earned
    // Net profit = Commission - Expenses
    const grossProfit = totalCommission;
    const netProfit = receivedCommission - expenseTotal;
    const margin = totalCommission > 0 ? (netProfit / totalCommission) * 100 : 0;

    return {
      revenue: {
        totalFees,
        totalDonations,
        totalCommission,
        receivedCommission,
        pendingCommission,
      },
      expenses: {
        total: expenseTotal,
        byCategory: expensesByCategory.map((e) => ({
          category: e.category,
          amount: Number(e._sum.amount) || 0,
        })),
      },
      profit: {
        gross: grossProfit,
        net: netProfit,
        margin,
      },
      admissions: {
        total: totalAdmissions,
        donation: donationAdmissions,
        nonDonation: nonDonationAdmissions,
      },
    };
  }

  /**
   * Get profit by university
   */
  async getProfitByUniversity(organizationId: string, dateRange?: DateRange) {
    const dateFilter = dateRange
      ? { gte: dateRange.from, lte: dateRange.to }
      : undefined;

    const admissionWhere: Prisma.AdmissionWhereInput = {
      organizationId,
      status: 'ACTIVE',
      ...(dateFilter && { closedAt: dateFilter }),
    };

    const admissionsByUniversity = await prisma.admission.groupBy({
      by: ['universityId'],
      where: admissionWhere,
      _count: true,
      _sum: {
        totalFee: true,
        commissionAmount: true,
      },
    });

    // Get university details
    const universityIds = admissionsByUniversity.map((a) => a.universityId);
    const universities = await prisma.university.findMany({
      where: { id: { in: universityIds } },
      select: { id: true, name: true, shortName: true },
    });

    const universityMap = new Map(universities.map((u) => [u.id, u]));

    // Get expenses linked to universities (travel visits, etc.)
    const expensesByUniversity = await prisma.businessExpense.groupBy({
      by: ['universityId'],
      where: {
        organizationId,
        status: 'APPROVED',
        universityId: { in: universityIds },
        ...(dateFilter && { expenseDate: dateFilter }),
      },
      _sum: { amount: true },
    });

    const expenseMap = new Map(
      expensesByUniversity.map((e) => [e.universityId, Number(e._sum.amount) || 0])
    );

    return admissionsByUniversity
      .map((a) => {
        const university = universityMap.get(a.universityId);
        const commission = Number(a._sum.commissionAmount) || 0;
        const expenses = expenseMap.get(a.universityId) || 0;
        const profit = commission - expenses;

        return {
          university: university || { id: a.universityId, name: 'Unknown' },
          admissions: a._count,
          revenue: Number(a._sum.totalFee) || 0,
          commission,
          expenses,
          profit,
          margin: commission > 0 ? (profit / commission) * 100 : 0,
        };
      })
      .sort((a, b) => b.profit - a.profit);
  }

  /**
   * Get monthly profit trend
   */
  async getMonthlyTrend(organizationId: string, months: number = 12) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months + 1);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const [admissions, expenses] = await Promise.all([
      prisma.admission.findMany({
        where: {
          organizationId,
          status: 'ACTIVE',
          closedAt: { gte: startDate },
        },
        select: {
          closedAt: true,
          totalFee: true,
          commissionAmount: true,
          admissionType: true,
        },
      }),
      prisma.businessExpense.findMany({
        where: {
          organizationId,
          status: 'APPROVED',
          expenseDate: { gte: startDate },
        },
        select: {
          expenseDate: true,
          amount: true,
        },
      }),
    ]);

    // Group by month
    const monthlyData: Record<string, {
      admissions: number;
      revenue: number;
      commission: number;
      expenses: number;
      profit: number;
    }> = {};

    admissions.forEach((admission) => {
      const monthKey = `${admission.closedAt.getFullYear()}-${String(admission.closedAt.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { admissions: 0, revenue: 0, commission: 0, expenses: 0, profit: 0 };
      }
      monthlyData[monthKey].admissions++;
      monthlyData[monthKey].revenue += Number(admission.totalFee);
      monthlyData[monthKey].commission += Number(admission.commissionAmount);
    });

    expenses.forEach((expense) => {
      const monthKey = `${expense.expenseDate.getFullYear()}-${String(expense.expenseDate.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { admissions: 0, revenue: 0, commission: 0, expenses: 0, profit: 0 };
      }
      monthlyData[monthKey].expenses += Number(expense.amount);
    });

    // Calculate profit for each month
    Object.values(monthlyData).forEach((data) => {
      data.profit = data.commission - data.expenses;
    });

    return Object.entries(monthlyData)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  /**
   * Get profit by user (who closed admissions)
   */
  async getProfitByUser(organizationId: string, dateRange?: DateRange) {
    const dateFilter = dateRange
      ? { gte: dateRange.from, lte: dateRange.to }
      : undefined;

    const admissionsByUser = await prisma.admission.groupBy({
      by: ['closedById'],
      where: {
        organizationId,
        status: 'ACTIVE',
        ...(dateFilter && { closedAt: dateFilter }),
      },
      _count: true,
      _sum: {
        totalFee: true,
        commissionAmount: true,
      },
    });

    // Get user details
    const userIds = admissionsByUser.map((a) => a.closedById);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: { select: { name: true } },
      },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    return admissionsByUser
      .map((a) => {
        const user = userMap.get(a.closedById);
        return {
          user: user || { id: a.closedById, firstName: 'Unknown', lastName: '' },
          admissions: a._count,
          revenue: Number(a._sum.totalFee) || 0,
          commission: Number(a._sum.commissionAmount) || 0,
        };
      })
      .sort((a, b) => b.commission - a.commission);
  }

  /**
   * Get top performing universities
   */
  async getTopUniversities(organizationId: string, limit: number = 5, dateRange?: DateRange) {
    const result = await this.getProfitByUniversity(organizationId, dateRange);
    return result.slice(0, limit);
  }
}

export const profitService = new ProfitService();
