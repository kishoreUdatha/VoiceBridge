/**
 * Commission Service
 * Handles commission rules, tracking, and payouts
 */

import api from './api';

export type CommissionType = 'PERCENTAGE' | 'FIXED' | 'TIERED';
export type CommissionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';

export interface CommissionRule {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  type: CommissionType;
  rate: number;
  minValue?: number;
  maxValue?: number;
  roleId?: string;
  userId?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Commission {
  id: string;
  organizationId: string;
  userId: string;
  leadId?: string;
  paymentId?: string;
  ruleId: string;
  amount: number;
  rate: number;
  baseValue: number;
  status: CommissionStatus;
  notes?: string;
  approvedAt?: string;
  approvedById?: string;
  paidAt?: string;
  createdAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface CommissionStats {
  totalEarned: number;
  pending: { amount: number; count: number };
  approved: { amount: number; count: number };
  paid: { amount: number; count: number };
  thisMonth: { amount: number; count: number };
}

class CommissionService {
  /**
   * Get all commission rules
   */
  async getRules(): Promise<CommissionRule[]> {
    const response = await api.get('/commissions/rules');
    return response.data.data;
  }

  /**
   * Create a commission rule
   */
  async createRule(data: {
    name: string;
    description?: string;
    type: CommissionType;
    rate: number;
    minValue?: number;
    maxValue?: number;
    roleId?: string;
    userId?: string;
  }): Promise<CommissionRule> {
    const response = await api.post('/commissions/rules', data);
    return response.data.data;
  }

  /**
   * Update a commission rule
   */
  async updateRule(id: string, data: Partial<CommissionRule>): Promise<CommissionRule> {
    const response = await api.put(`/commissions/rules/${id}`, data);
    return response.data.data;
  }

  /**
   * Get all commissions (admin)
   */
  async getAllCommissions(params?: {
    userId?: string;
    status?: CommissionStatus;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ commissions: Commission[]; total: number }> {
    const response = await api.get('/commissions', { params });
    return { commissions: response.data.data, total: response.data.total };
  }

  /**
   * Get current user's commissions
   */
  async getMyCommissions(params?: {
    status?: CommissionStatus;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ commissions: Commission[]; total: number }> {
    const response = await api.get('/commissions/my', { params });
    return { commissions: response.data.data, total: response.data.total };
  }

  /**
   * Get commission stats
   */
  async getStats(userId?: string): Promise<CommissionStats> {
    const response = await api.get('/commissions/stats', {
      params: userId ? { userId } : undefined,
    });
    return response.data.data;
  }

  /**
   * Approve a commission
   */
  async approve(commissionId: string): Promise<Commission> {
    const response = await api.post(`/commissions/${commissionId}/approve`);
    return response.data.data;
  }

  /**
   * Reject a commission
   */
  async reject(commissionId: string, notes: string): Promise<Commission> {
    const response = await api.post(`/commissions/${commissionId}/reject`, { notes });
    return response.data.data;
  }

  /**
   * Mark commission as paid
   */
  async markAsPaid(commissionId: string): Promise<Commission> {
    const response = await api.post(`/commissions/${commissionId}/pay`);
    return response.data.data;
  }
}

export const commissionService = new CommissionService();
