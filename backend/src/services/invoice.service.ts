/**
 * Invoice Service - Single Responsibility Principle
 * Handles invoice generation and billing history
 */

import { prisma } from '../config/database';
import { PLANS, getPlan } from '../config/plans.config';
import { AppError } from '../utils/errors';


export interface Invoice {
  invoiceNumber: string;
  date: Date;
  organization: {
    id: string;
    name: string;
    email?: string;
    gstin?: string;
    address?: string;
  };
  plan: string;
  billingCycle: string;
  userCount: number;
  subtotal: number;
  gst: number;
  total: number;
  currency: string;
  paymentId: string | null;
  status: string;
}

export interface BillingHistoryItem {
  id: string;
  planId: string;
  planName: string;
  amount: number;
  currency: string;
  status: string;
  billingCycle: string;
  createdAt: Date;
  activatedAt: Date | null;
  paymentId: string | null;
}

class InvoiceService {
  /**
   * Generate invoice for a subscription
   */
  async generateInvoice(subscriptionId: string): Promise<Invoice> {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { organization: true },
    });

    if (!subscription) {
      throw new AppError('Subscription not found', 404);
    }

    const plan = getPlan(subscription.planId);
    const gstRate = 0.18; // 18% GST
    const gstAmount = subscription.amount * gstRate;
    const totalAmount = subscription.amount + gstAmount;

    return {
      invoiceNumber: this.generateInvoiceNumber(),
      date: subscription.activatedAt || subscription.createdAt,
      organization: {
        id: subscription.organization.id,
        name: subscription.organization.name,
        email: subscription.organization.email || undefined,
        gstin: (subscription.organization as any).gstin || undefined,
        address: (subscription.organization as any).billingAddress || undefined,
      },
      plan: plan?.name || subscription.planId,
      billingCycle: subscription.billingCycle,
      userCount: subscription.userCount,
      subtotal: subscription.amount,
      gst: gstAmount,
      total: totalAmount,
      currency: subscription.currency || 'INR',
      paymentId: subscription.razorpayPaymentId,
      status: subscription.status,
    };
  }

  /**
   * Get billing history for an organization
   */
  async getBillingHistory(organizationId: string): Promise<BillingHistoryItem[]> {
    const payments = await prisma.subscription.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        planId: true,
        amount: true,
        currency: true,
        status: true,
        billingCycle: true,
        createdAt: true,
        activatedAt: true,
        razorpayPaymentId: true,
      },
    });

    return payments.map(p => ({
      id: p.id,
      planId: p.planId,
      planName: PLANS[p.planId as keyof typeof PLANS]?.name || p.planId,
      amount: p.amount,
      currency: p.currency || 'INR',
      status: p.status,
      billingCycle: p.billingCycle,
      createdAt: p.createdAt,
      activatedAt: p.activatedAt,
      paymentId: p.razorpayPaymentId,
    }));
  }

  /**
   * Get invoice by ID
   */
  async getInvoice(invoiceId: string): Promise<Invoice | null> {
    // Invoice ID format: INV-{subscriptionId}
    const subscriptionId = invoiceId.replace('INV-', '');

    try {
      return await this.generateInvoice(subscriptionId);
    } catch {
      return null;
    }
  }

  /**
   * Get all invoices for organization
   */
  async getInvoices(organizationId: string): Promise<Invoice[]> {
    const subscriptions = await prisma.subscription.findMany({
      where: {
        organizationId,
        status: { in: ['ACTIVE', 'CANCELLED', 'EXPIRED'] },
      },
      include: { organization: true },
      orderBy: { createdAt: 'desc' },
    });

    return subscriptions.map(sub => {
      const plan = getPlan(sub.planId);
      const gstAmount = sub.amount * 0.18;

      return {
        invoiceNumber: `INV-${sub.id.slice(-8).toUpperCase()}`,
        date: sub.activatedAt || sub.createdAt,
        organization: {
          id: sub.organization.id,
          name: sub.organization.name,
          email: sub.organization.email || undefined,
        },
        plan: plan?.name || sub.planId,
        billingCycle: sub.billingCycle,
        userCount: sub.userCount,
        subtotal: sub.amount,
        gst: gstAmount,
        total: sub.amount + gstAmount,
        currency: sub.currency || 'INR',
        paymentId: sub.razorpayPaymentId,
        status: sub.status,
      };
    });
  }

  /**
   * Calculate prorated amount for mid-cycle changes
   */
  calculateProratedAmount(
    currentAmount: number,
    periodEnd: Date,
    billingCycle: 'monthly' | 'annual'
  ): number {
    const now = new Date();
    const daysRemaining = Math.max(0, Math.ceil(
      (periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    ));

    const totalDays = billingCycle === 'annual' ? 365 : 30;
    const dailyRate = currentAmount / totalDays;

    return Math.round(daysRemaining * dailyRate);
  }

  /**
   * Generate unique invoice number
   */
  private generateInvoiceNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `INV-${timestamp}-${random}`;
  }
}

export const invoiceService = new InvoiceService();
export default invoiceService;
