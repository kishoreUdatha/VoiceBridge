/**
 * Subscription Service - Refactored following SOLID principles
 *
 * This service orchestrates subscription operations using:
 * - PaymentGatewayService: Payment processing (Dependency Inversion)
 * - UsageTrackingService: Usage monitoring (Single Responsibility)
 * - PlanLimitsService: Limit checking (Single Responsibility)
 * - InvoiceService: Invoice generation (Single Responsibility)
 * - PlansConfig: Plan configurations (Single Responsibility)
 */

import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/errors';

// Import extracted services - Dependency Inversion Principle
import { paymentGateway } from './payment-gateway.service';
import { usageTrackingService } from './usage-tracking.service';
import { planLimitsService } from './plan-limits.service';
import { invoiceService } from './invoice.service';
import { PLANS, ADD_ONS, getPlan, getAddOnPrice, type PlanId, type AddOnType } from '../config/plans.config';

const prisma = new PrismaClient();

// Re-export for backward compatibility
export { PLANS, ADD_ONS };

class SubscriptionService {
  /**
   * Create a new subscription
   */
  async createSubscription(
    organizationId: string,
    planId: string,
    billingCycle: 'monthly' | 'annual',
    userCount: number
  ) {
    const plan = getPlan(planId);
    if (!plan) {
      throw new AppError('Invalid plan', 400);
    }

    // Calculate amount
    const pricePerUser = billingCycle === 'annual'
      ? plan.annualPrice / 12
      : plan.monthlyPrice;
    const totalAmount = pricePerUser * userCount * 100; // In paise

    // Create payment order via gateway
    const order = await paymentGateway.createOrder({
      amount: totalAmount,
      currency: 'INR',
      receipt: `sub_${organizationId}_${Date.now()}`,
      notes: {
        organizationId,
        planId,
        billingCycle,
        userCount: userCount.toString(),
      },
    });

    // Store pending subscription
    const subscription = await prisma.subscription.create({
      data: {
        organizationId,
        planId,
        billingCycle,
        userCount,
        status: 'PENDING',
        razorpayOrderId: order.id,
        amount: totalAmount / 100,
        currency: 'INR',
        currentPeriodStart: new Date(),
        currentPeriodEnd: this.calculatePeriodEnd(billingCycle),
      },
    });

    return {
      subscription,
      razorpayOrder: order,
      keyId: paymentGateway.getPublicKey(),
    };
  }

  /**
   * Verify payment and activate subscription
   */
  async verifyPayment(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string
  ) {
    // Verify signature via gateway
    const isValid = paymentGateway.verifyPayment({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
    });

    if (!isValid) {
      throw new AppError('Invalid payment signature', 400);
    }

    // Update subscription status
    const subscription = await prisma.subscription.update({
      where: { razorpayOrderId },
      data: {
        status: 'ACTIVE',
        razorpayPaymentId,
        razorpaySignature,
        activatedAt: new Date(),
      },
    });

    // Update organization's active plan
    await prisma.organization.update({
      where: { id: subscription.organizationId },
      data: {
        activePlanId: subscription.planId,
        subscriptionStatus: 'ACTIVE',
      },
    });

    // Reset usage counters for new billing period
    await usageTrackingService.getOrCreateMonthlyUsage(subscription.organizationId);

    return subscription;
  }

  /**
   * Get current subscription with usage
   */
  async getSubscription(organizationId: string) {
    const subscription = await prisma.subscription.findFirst({
      where: {
        organizationId,
        status: { in: ['ACTIVE', 'TRIAL'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    const usage = await usageTrackingService.getUsageSummary(organizationId);

    if (!subscription) {
      // Return virtual free plan
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { activePlanId: true },
      });

      const planId = org?.activePlanId || 'free';
      const plan = getPlan(planId) || PLANS.free;

      return {
        id: `free_${organizationId}`,
        organizationId,
        planId: plan.id,
        billingCycle: 'monthly' as const,
        userCount: 1,
        status: 'ACTIVE',
        amount: 0,
        currency: 'INR',
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        plan,
        usage: usage.usage,
      };
    }

    const plan = getPlan(subscription.planId);

    return {
      ...subscription,
      plan,
      usage: usage.usage,
    };
  }

  /**
   * Get usage statistics - delegates to usage tracking service
   */
  async getUsage(organizationId: string) {
    return usageTrackingService.getUsageSummary(organizationId);
  }

  /**
   * Track usage - delegates to usage tracking service
   */
  async trackUsage(
    organizationId: string,
    type: 'leads' | 'aiCalls' | 'sms' | 'emails' | 'whatsapp' | 'storage',
    amount: number = 1
  ) {
    await usageTrackingService.incrementUsage(organizationId, type, amount);
    return usageTrackingService.checkUsage(organizationId, type);
  }

  /**
   * Check usage limits - delegates to usage tracking service
   */
  async checkUsageLimits(organizationId: string, type: string) {
    return usageTrackingService.checkUsage(organizationId, type as any);
  }

  /**
   * Upgrade plan
   */
  async upgradePlan(
    organizationId: string,
    newPlanId: string,
    billingCycle: 'monthly' | 'annual'
  ) {
    const currentSubscription = await this.getSubscription(organizationId);
    const newPlan = getPlan(newPlanId);

    if (!newPlan) {
      throw new AppError('Invalid plan', 400);
    }

    // Calculate prorated credit
    let proratedCredit = 0;
    if (currentSubscription && currentSubscription.status === 'ACTIVE') {
      proratedCredit = invoiceService.calculateProratedAmount(
        currentSubscription.amount,
        new Date(currentSubscription.currentPeriodEnd),
        currentSubscription.billingCycle as 'monthly' | 'annual'
      );
    }

    const userCount = currentSubscription?.userCount || 1;
    const newAmount = billingCycle === 'annual'
      ? newPlan.annualPrice * userCount
      : newPlan.monthlyPrice * userCount;

    const finalAmount = Math.max(0, newAmount - proratedCredit);

    // Create payment order
    const order = await paymentGateway.createOrder({
      amount: finalAmount * 100,
      currency: 'INR',
      receipt: `upgrade_${organizationId}_${Date.now()}`,
      notes: {
        organizationId,
        planId: newPlanId,
        billingCycle,
        upgradeFrom: currentSubscription?.planId || 'none',
        proratedCredit: proratedCredit.toString(),
      },
    });

    return {
      order,
      proratedCredit,
      newAmount,
      finalAmount,
      keyId: paymentGateway.getPublicKey(),
    };
  }

  /**
   * Downgrade plan (scheduled for next billing cycle)
   */
  async downgradePlan(organizationId: string, newPlanId: string) {
    const currentSubscription = await this.getSubscription(organizationId);
    if (!currentSubscription || currentSubscription.id.startsWith('free_')) {
      throw new AppError('No active subscription', 400);
    }

    await prisma.subscription.update({
      where: { id: currentSubscription.id },
      data: {
        scheduledPlanChange: newPlanId,
        scheduledChangeDate: currentSubscription.currentPeriodEnd,
      },
    });

    return {
      message: 'Downgrade scheduled',
      effectiveDate: currentSubscription.currentPeriodEnd,
      newPlan: getPlan(newPlanId),
    };
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(organizationId: string, reason?: string) {
    const subscription = await prisma.subscription.findFirst({
      where: { organizationId, status: 'ACTIVE' },
    });

    if (!subscription) {
      throw new AppError('No active subscription', 400);
    }

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        cancelledAt: new Date(),
        cancelReason: reason,
        status: 'CANCELLED',
      },
    });

    await prisma.organization.update({
      where: { id: organizationId },
      data: { subscriptionStatus: 'CANCELLED' },
    });

    return {
      message: 'Subscription cancelled',
      accessUntil: subscription.currentPeriodEnd,
    };
  }

  /**
   * Reactivate cancelled subscription
   */
  async reactivateSubscription(organizationId: string) {
    const subscription = await prisma.subscription.findFirst({
      where: { organizationId, status: 'CANCELLED' },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      throw new AppError('No cancelled subscription found', 400);
    }

    if (new Date() > subscription.currentPeriodEnd) {
      throw new AppError('Grace period expired. Please create a new subscription.', 400);
    }

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'ACTIVE',
        cancelledAt: null,
        cancelReason: null,
      },
    });

    await prisma.organization.update({
      where: { id: organizationId },
      data: { subscriptionStatus: 'ACTIVE' },
    });

    return { message: 'Subscription reactivated' };
  }

  /**
   * Get billing history - delegates to invoice service
   */
  async getBillingHistory(organizationId: string) {
    return invoiceService.getBillingHistory(organizationId);
  }

  /**
   * Generate invoice - delegates to invoice service
   */
  async generateInvoice(subscriptionId: string) {
    return invoiceService.generateInvoice(subscriptionId);
  }

  /**
   * Purchase add-on
   */
  async purchaseAddOn(
    organizationId: string,
    addOnType: AddOnType,
    quantity: number
  ) {
    const subscription = await this.getSubscription(organizationId);
    if (!subscription) {
      throw new AppError('No active subscription', 400);
    }

    const planId = subscription.planId as PlanId;
    const pricePerUnit = getAddOnPrice(addOnType, planId);
    const totalAmount = Math.round(pricePerUnit * quantity * 100);

    const order = await paymentGateway.createOrder({
      amount: totalAmount,
      currency: 'INR',
      receipt: `addon_${addOnType}_${organizationId}_${Date.now()}`,
      notes: {
        organizationId,
        type: 'add_on',
        addOnType,
        quantity: quantity.toString(),
      },
    });

    return {
      order,
      addOnType,
      quantity,
      pricePerUnit,
      totalAmount: totalAmount / 100,
      keyId: paymentGateway.getPublicKey(),
    };
  }

  /**
   * Verify and apply add-on payment
   */
  async verifyAddOnPayment(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string
  ) {
    const isValid = paymentGateway.verifyPayment({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
    });

    if (!isValid) {
      throw new AppError('Invalid payment signature', 400);
    }

    const order = await paymentGateway.fetchOrder(razorpayOrderId);
    const notes = order.notes as any;

    if (notes.type === 'add_on') {
      await prisma.addOnBalance.upsert({
        where: {
          organizationId_type: {
            organizationId: notes.organizationId,
            type: notes.addOnType,
          },
        },
        update: {
          balance: { increment: parseInt(notes.quantity) },
        },
        create: {
          organizationId: notes.organizationId,
          type: notes.addOnType,
          balance: parseInt(notes.quantity),
        },
      });
    } else if (notes.type === 'add_users') {
      await prisma.subscription.updateMany({
        where: {
          organizationId: notes.organizationId,
          status: 'ACTIVE',
        },
        data: {
          userCount: { increment: parseInt(notes.additionalUsers) },
        },
      });
    }

    return { success: true };
  }

  /**
   * Check phone number limit - delegates to plan limits service
   */
  async checkPhoneNumberLimit(organizationId: string) {
    return planLimitsService.checkPhoneNumberLimit(organizationId);
  }

  /**
   * Check voice agent limit - delegates to plan limits service
   */
  async checkVoiceAgentLimit(organizationId: string) {
    return planLimitsService.checkVoiceAgentLimit(organizationId);
  }

  /**
   * Get plan limits - delegates to plan limits service
   */
  async getPlanLimits(organizationId: string) {
    return planLimitsService.getPlanLimits(organizationId);
  }

  /**
   * Get available plans - delegates to plan limits service
   */
  async getAvailablePlans() {
    return planLimitsService.getAvailablePlans();
  }

  // Private helper methods
  private calculatePeriodEnd(billingCycle: 'monthly' | 'annual'): Date {
    const now = new Date();
    if (billingCycle === 'annual') {
      return new Date(now.setFullYear(now.getFullYear() + 1));
    }
    return new Date(now.setMonth(now.getMonth() + 1));
  }
}

export const subscriptionService = new SubscriptionService();
export default subscriptionService;
