/**
 * Commission Tracking Service
 * Handles commission rules, calculations, and payouts
 */

import { PrismaClient, CommissionStatus, CommissionType } from '@prisma/client';

const prisma = new PrismaClient();

class CommissionService {
  /**
   * Create a commission rule
   */
  async createRule(data: {
    organizationId: string;
    name: string;
    description?: string;
    type: CommissionType;
    rate: number;
    minValue?: number;
    maxValue?: number;
    roleId?: string;
    userId?: string;
  }) {
    return prisma.commissionRule.create({ data });
  }

  /**
   * Get all commission rules
   */
  async getRules(organizationId: string) {
    return prisma.commissionRule.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update a commission rule
   */
  async updateRule(id: string, organizationId: string, data: Partial<{
    name: string;
    description: string;
    type: CommissionType;
    rate: number;
    minValue: number;
    maxValue: number;
    isActive: boolean;
  }>) {
    return prisma.commissionRule.update({
      where: { id },
      data,
    });
  }

  /**
   * Calculate commission for a conversion/payment
   */
  async calculateCommission(data: {
    organizationId: string;
    userId: string;
    baseValue: number;
    leadId?: string;
    paymentId?: string;
    roleId: string;
  }) {
    // Get applicable rules
    const rules = await prisma.commissionRule.findMany({
      where: {
        organizationId: data.organizationId,
        isActive: true,
        OR: [
          { userId: data.userId },
          { roleId: data.roleId },
          { userId: null, roleId: null }, // Global rules
        ],
      },
    });

    if (rules.length === 0) return null;

    // Find the most specific rule (user > role > global)
    const rule = rules.find(r => r.userId === data.userId) ||
                 rules.find(r => r.roleId === data.roleId) ||
                 rules[0];

    // Check value limits
    if (rule.minValue && data.baseValue < rule.minValue) return null;
    if (rule.maxValue && data.baseValue > rule.maxValue) return null;

    // Calculate commission
    let amount = 0;
    if (rule.type === 'PERCENTAGE') {
      amount = data.baseValue * (rule.rate / 100);
    } else if (rule.type === 'FIXED') {
      amount = rule.rate;
    }

    // Create commission record
    const commission = await prisma.commission.create({
      data: {
        organizationId: data.organizationId,
        userId: data.userId,
        leadId: data.leadId,
        paymentId: data.paymentId,
        ruleId: rule.id,
        amount,
        rate: rule.rate,
        baseValue: data.baseValue,
        status: 'PENDING',
      },
    });

    return commission;
  }

  /**
   * Get commissions for a user
   */
  async getUserCommissions(userId: string, organizationId: string, options: {
    status?: CommissionStatus;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
  } = {}) {
    const { status, dateFrom, dateTo, limit = 50, offset = 0 } = options;

    const where: any = { organizationId, userId };
    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const [commissions, total] = await Promise.all([
      prisma.commission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.commission.count({ where }),
    ]);

    return { commissions, total };
  }

  /**
   * Get all commissions (for admin)
   */
  async getAllCommissions(organizationId: string, options: {
    userId?: string;
    status?: CommissionStatus;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
  } = {}) {
    const { userId, status, dateFrom, dateTo, limit = 50, offset = 0 } = options;

    const where: any = { organizationId };
    if (userId) where.userId = userId;
    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const [commissions, total] = await Promise.all([
      prisma.commission.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.commission.count({ where }),
    ]);

    return { commissions, total };
  }

  /**
   * Approve a commission
   */
  async approveCommission(commissionId: string, approverId: string, organizationId: string) {
    return prisma.commission.update({
      where: { id: commissionId },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedById: approverId,
      },
    });
  }

  /**
   * Mark commission as paid
   */
  async markAsPaid(commissionId: string, organizationId: string) {
    return prisma.commission.update({
      where: { id: commissionId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
      },
    });
  }

  /**
   * Reject a commission
   */
  async rejectCommission(commissionId: string, approverId: string, notes: string, organizationId: string) {
    return prisma.commission.update({
      where: { id: commissionId },
      data: {
        status: 'REJECTED',
        approvedById: approverId,
        notes,
      },
    });
  }

  /**
   * Get commission summary/stats
   */
  async getCommissionStats(organizationId: string, userId?: string) {
    const where: any = { organizationId };
    if (userId) where.userId = userId;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, pending, approved, paid, thisMonth] = await Promise.all([
      prisma.commission.aggregate({ where, _sum: { amount: true } }),
      prisma.commission.aggregate({ where: { ...where, status: 'PENDING' }, _sum: { amount: true }, _count: true }),
      prisma.commission.aggregate({ where: { ...where, status: 'APPROVED' }, _sum: { amount: true }, _count: true }),
      prisma.commission.aggregate({ where: { ...where, status: 'PAID' }, _sum: { amount: true }, _count: true }),
      prisma.commission.aggregate({
        where: { ...where, createdAt: { gte: startOfMonth } },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    return {
      totalEarned: total._sum.amount || 0,
      pending: { amount: pending._sum.amount || 0, count: pending._count },
      approved: { amount: approved._sum.amount || 0, count: approved._count },
      paid: { amount: paid._sum.amount || 0, count: paid._count },
      thisMonth: { amount: thisMonth._sum.amount || 0, count: thisMonth._count },
    };
  }
}

export const commissionService = new CommissionService();
