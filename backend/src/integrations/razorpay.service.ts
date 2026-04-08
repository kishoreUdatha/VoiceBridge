import Razorpay from 'razorpay';
import crypto from 'crypto';
import { config } from '../config';
import { prisma } from '../config/database';
import { PaymentStatus } from '@prisma/client';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { circuitBreakers, CircuitBreakerError } from '../utils/circuitBreaker';

interface CreateOrderInput {
  organizationId: string;
  studentProfileId: string;
  createdById: string;
  amount: number;
  currency?: string;
  description?: string;
  splits?: Array<{ amount: number; dueDate: Date }>;
}

interface CreatePaymentLinkInput {
  organizationId: string;
  amount: number;
  leadId?: string;
  description?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  expireBy?: Date;
  notifyVia?: ('sms' | 'email' | 'whatsapp')[];
  currency?: string;
}

interface CreateSubscriptionInput {
  organizationId: string;
  leadId?: string;
  studentProfileId?: string;
  planName: string;
  totalAmount: number;
  installments: number;
  startDate?: Date;
  interval?: 'daily' | 'weekly' | 'monthly';
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

interface VerifyPaymentInput {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export class RazorpayService {
  private razorpay: Razorpay | null = null;

  constructor() {
    if (config.razorpay.keyId && config.razorpay.keySecret) {
      this.razorpay = new Razorpay({
        key_id: config.razorpay.keyId,
        key_secret: config.razorpay.keySecret,
      });
    } else {
      console.warn('Razorpay credentials not configured. Payment features will be disabled.');
    }
  }

  private ensureInitialized(): Razorpay {
    if (!this.razorpay) {
      throw new BadRequestError('Razorpay is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
    }
    return this.razorpay;
  }

  async createOrder(input: CreateOrderInput) {
    const razorpay = this.ensureInitialized();
    const amountInPaise = Math.round(input.amount * 100);

    // Create Razorpay order with circuit breaker protection
    let razorpayOrder;
    try {
      razorpayOrder = await circuitBreakers.razorpay.execute(() =>
        razorpay.orders.create({
          amount: amountInPaise,
          currency: input.currency || 'INR',
          receipt: `receipt_${Date.now()}`,
          notes: {
            organizationId: input.organizationId,
            studentProfileId: input.studentProfileId,
          },
        })
      );
    } catch (error) {
      if (error instanceof CircuitBreakerError) {
        console.warn('[Razorpay] Circuit breaker OPEN for createOrder');
        throw new BadRequestError('Payment service is temporarily unavailable. Please try again later.');
      }
      throw error;
    }

    // Create payment record in database
    const payment = await prisma.payment.create({
      data: {
        organizationId: input.organizationId,
        studentProfileId: input.studentProfileId,
        createdById: input.createdById,
        orderId: razorpayOrder.id,
        amount: input.amount,
        currency: input.currency || 'INR',
        status: PaymentStatus.PENDING,
        description: input.description,
        metadata: { razorpayOrder: JSON.parse(JSON.stringify(razorpayOrder)) },
      },
    });

    // Create payment splits if provided
    if (input.splits && input.splits.length > 0) {
      await prisma.paymentSplit.createMany({
        data: input.splits.map((split, index) => ({
          paymentId: payment.id,
          splitNumber: index + 1,
          amount: split.amount,
          dueDate: split.dueDate,
          status: PaymentStatus.PENDING,
        })),
      });
    }

    return {
      payment,
      razorpayOrderId: razorpayOrder.id,
      razorpayKeyId: config.razorpay.keyId,
      amount: amountInPaise,
      currency: input.currency || 'INR',
    };
  }

  async verifyPayment(input: VerifyPaymentInput) {
    // Verify signature
    const body = input.razorpayOrderId + '|' + input.razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', config.razorpay.keySecret || '')
      .update(body)
      .digest('hex');

    if (expectedSignature !== input.razorpaySignature) {
      throw new BadRequestError('Invalid payment signature');
    }

    // Update payment record
    const payment = await prisma.payment.findUnique({
      where: { orderId: input.razorpayOrderId },
    });

    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        paymentId: input.razorpayPaymentId,
        status: PaymentStatus.COMPLETED,
        paidAt: new Date(),
      },
    });

    return updatedPayment;
  }

  async getPaymentDetails(orderId: string, organizationId?: string) {
    const payment = await prisma.payment.findUnique({
      where: { orderId },
      include: {
        splits: true,
        studentProfile: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    // Verify organization ownership if organizationId is provided
    if (organizationId && payment.organizationId !== organizationId) {
      throw new NotFoundError('Payment not found'); // Don't reveal existence to unauthorized users
    }

    return payment;
  }

  async getPaymentHistory(studentProfileId: string, organizationId?: string) {
    // Build where clause with organization filter if provided
    const whereClause: any = { studentProfileId };
    if (organizationId) {
      whereClause.organizationId = organizationId;
    }

    return prisma.payment.findMany({
      where: whereClause,
      include: { splits: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPaymentsByOrganization(organizationId: string, page = 1, limit = 20) {
    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where: { organizationId },
        include: {
          studentProfile: {
            include: {
              user: {
                select: { firstName: true, lastName: true, email: true },
              },
            },
          },
          splits: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.payment.count({ where: { organizationId } }),
    ]);

    return { payments, total };
  }

  async createPaymentLink(input: CreateOrderInput) {
    const order = await this.createOrder(input);

    // Generate a payment link
    const paymentLink = `${config.frontendUrl}/pay/${order.razorpayOrderId}`;

    return {
      ...order,
      paymentLink,
    };
  }

  /**
   * Create a shareable payment link with optional notifications
   * Enhanced version for lead-based payments with notifications
   */
  async createShareablePaymentLink(input: CreatePaymentLinkInput): Promise<{
    paymentLinkId: string;
    shortUrl: string;
    amount: number;
    currency: string;
    expiresAt?: Date;
    status: string;
    leadId?: string;
  }> {
    const razorpay = this.ensureInitialized();
    const amountInPaise = Math.round(input.amount * 100);

    try {
      // Create payment link using Razorpay Payment Links API
      const paymentLink = await circuitBreakers.razorpay.execute(() =>
        razorpay.paymentLink.create({
          amount: amountInPaise,
          currency: input.currency || 'INR',
          accept_partial: false,
          description: input.description || 'Payment Request',
          customer: {
            name: input.customerName,
            email: input.customerEmail,
            contact: input.customerPhone,
          },
          notify: {
            sms: input.notifyVia?.includes('sms') ?? false,
            email: input.notifyVia?.includes('email') ?? false,
          },
          expire_by: input.expireBy ? Math.floor(input.expireBy.getTime() / 1000) : undefined,
          notes: {
            organizationId: input.organizationId,
            leadId: input.leadId || '',
          },
        } as any)
      );

      // Store payment link in database
      await prisma.payment.create({
        data: {
          organizationId: input.organizationId,
          orderId: (paymentLink as any).id,
          amount: input.amount,
          currency: input.currency || 'INR',
          status: PaymentStatus.PENDING,
          description: input.description,
          metadata: {
            paymentLinkId: (paymentLink as any).id,
            shortUrl: (paymentLink as any).short_url,
            type: 'payment_link',
            leadId: input.leadId,
            notifyVia: input.notifyVia,
          },
        },
      });

      // Send WhatsApp notification if requested
      if (input.notifyVia?.includes('whatsapp') && input.customerPhone) {
        try {
          const { messagingService } = await import('../services/messaging.service');
          await messagingService.sendWhatsAppMessage({
            organizationId: input.organizationId,
            to: input.customerPhone,
            template: 'payment_link',
            variables: {
              name: input.customerName || 'Customer',
              amount: input.amount.toString(),
              link: (paymentLink as any).short_url,
              description: input.description || 'Payment',
            },
          });
        } catch (whatsappError) {
          console.warn('[Razorpay] Failed to send WhatsApp notification:', whatsappError);
        }
      }

      return {
        paymentLinkId: (paymentLink as any).id,
        shortUrl: (paymentLink as any).short_url,
        amount: input.amount,
        currency: input.currency || 'INR',
        expiresAt: input.expireBy,
        status: 'created',
        leadId: input.leadId,
      };
    } catch (error) {
      if (error instanceof CircuitBreakerError) {
        throw new BadRequestError('Payment service is temporarily unavailable. Please try again later.');
      }
      throw error;
    }
  }

  /**
   * Send payment link during an active call
   * Triggered by call flow action node
   */
  async sendPaymentLinkDuringCall(params: {
    sessionId: string;
    amount: number;
    description?: string;
    organizationId: string;
  }): Promise<{
    success: boolean;
    shortUrl?: string;
    message: string;
  }> {
    try {
      // Get call session to find lead/customer info
      const call = await prisma.outboundCall.findFirst({
        where: {
          OR: [
            { id: params.sessionId },
            { twilioSid: params.sessionId },
          ],
        },
        include: {
          existingLead: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
            },
          },
        },
      });

      if (!call) {
        return { success: false, message: 'Call session not found' };
      }

      const customerPhone = call.phoneNumber;
      const customerName = call.existingLead
        ? `${call.existingLead.firstName || ''} ${call.existingLead.lastName || ''}`.trim()
        : 'Customer';

      // Create payment link
      const paymentLink = await this.createShareablePaymentLink({
        organizationId: params.organizationId,
        amount: params.amount,
        leadId: call.existingLead?.id,
        description: params.description || 'Payment requested during call',
        customerName,
        customerPhone,
        notifyVia: ['whatsapp'], // Send via WhatsApp during call
        expireBy: new Date(Date.now() + 24 * 60 * 60 * 1000), // Expires in 24 hours
      });

      // Update call record with payment link info
      await prisma.outboundCall.update({
        where: { id: call.id },
        data: {
          extractedData: {
            ...(call.extractedData as any || {}),
            paymentLinkSent: true,
            paymentLinkId: paymentLink.paymentLinkId,
            paymentAmount: params.amount,
            paymentLinkUrl: paymentLink.shortUrl,
          },
        },
      });

      return {
        success: true,
        shortUrl: paymentLink.shortUrl,
        message: `Payment link sent to ${customerPhone}`,
      };
    } catch (error) {
      console.error('[Razorpay] Error sending payment link during call:', error);
      return {
        success: false,
        message: (error as Error).message,
      };
    }
  }

  /**
   * Create a subscription/recurring payment plan
   * For education/service industries with installment payments
   */
  async createSubscription(input: CreateSubscriptionInput): Promise<{
    subscriptionId: string;
    planId: string;
    totalAmount: number;
    installmentAmount: number;
    installments: number;
    startDate: Date;
    status: string;
  }> {
    const razorpay = this.ensureInitialized();

    // Calculate installment amount
    const installmentAmount = Math.round((input.totalAmount / input.installments) * 100) / 100;
    const amountInPaise = Math.round(installmentAmount * 100);

    // Determine interval
    const intervalMap = {
      daily: 1,
      weekly: 7,
      monthly: 30,
    };
    const periodDays = intervalMap[input.interval || 'monthly'];

    try {
      // Create a plan
      const plan = await circuitBreakers.razorpay.execute(() =>
        razorpay.plans.create({
          period: input.interval || 'monthly',
          interval: 1,
          item: {
            name: input.planName,
            amount: amountInPaise,
            currency: 'INR',
            description: `Installment payment plan - ${input.installments} payments of ₹${installmentAmount}`,
          },
        })
      );

      // Create subscription
      const startDate = input.startDate || new Date();
      const subscription = await circuitBreakers.razorpay.execute(() =>
        razorpay.subscriptions.create({
          plan_id: (plan as any).id,
          customer_notify: 1,
          quantity: 1,
          total_count: input.installments,
          start_at: Math.floor(startDate.getTime() / 1000),
          notes: {
            organizationId: input.organizationId,
            leadId: input.leadId || '',
            studentProfileId: input.studentProfileId || '',
            totalAmount: input.totalAmount.toString(),
          },
        })
      );

      // Store subscription in database
      await prisma.payment.create({
        data: {
          organizationId: input.organizationId,
          studentProfileId: input.studentProfileId,
          orderId: (subscription as any).id,
          amount: input.totalAmount,
          currency: 'INR',
          status: PaymentStatus.PENDING,
          description: `Subscription: ${input.planName}`,
          metadata: {
            type: 'subscription',
            planId: (plan as any).id,
            subscriptionId: (subscription as any).id,
            installments: input.installments,
            installmentAmount,
            leadId: input.leadId,
            interval: input.interval || 'monthly',
          },
        },
      });

      // Create payment splits for tracking each installment
      const splits = Array.from({ length: input.installments }, (_, i) => ({
        amount: installmentAmount,
        dueDate: new Date(startDate.getTime() + i * periodDays * 24 * 60 * 60 * 1000),
      }));

      const payment = await prisma.payment.findFirst({
        where: { orderId: (subscription as any).id },
      });

      if (payment) {
        await prisma.paymentSplit.createMany({
          data: splits.map((split, index) => ({
            paymentId: payment.id,
            splitNumber: index + 1,
            amount: split.amount,
            dueDate: split.dueDate,
            status: PaymentStatus.PENDING,
          })),
        });
      }

      return {
        subscriptionId: (subscription as any).id,
        planId: (plan as any).id,
        totalAmount: input.totalAmount,
        installmentAmount,
        installments: input.installments,
        startDate,
        status: (subscription as any).status,
      };
    } catch (error) {
      if (error instanceof CircuitBreakerError) {
        throw new BadRequestError('Payment service is temporarily unavailable. Please try again later.');
      }
      throw error;
    }
  }

  /**
   * Get payment analytics for dashboard
   */
  async getPaymentAnalytics(organizationId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [
      totalPayments,
      completedPayments,
      pendingPayments,
      failedPayments,
      recentPayments,
    ] = await Promise.all([
      prisma.payment.count({
        where: { organizationId, createdAt: { gte: startDate } },
      }),
      prisma.payment.aggregate({
        where: { organizationId, status: PaymentStatus.COMPLETED, createdAt: { gte: startDate } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.payment.aggregate({
        where: { organizationId, status: PaymentStatus.PENDING, createdAt: { gte: startDate } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.payment.count({
        where: { organizationId, status: PaymentStatus.FAILED, createdAt: { gte: startDate } },
      }),
      prisma.payment.findMany({
        where: { organizationId, createdAt: { gte: startDate } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          studentProfile: {
            include: {
              user: { select: { firstName: true, lastName: true, email: true } },
            },
          },
        },
      }),
    ]);

    // Daily breakdown
    const dailyBreakdown = await prisma.$queryRaw<Array<{
      date: Date;
      count: bigint;
      total: number;
    }>>`
      SELECT
        DATE("createdAt") as date,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total
      FROM "payments"
      WHERE "organizationId" = ${organizationId}
        AND "createdAt" >= ${startDate}
        AND status = 'COMPLETED'
      GROUP BY DATE("createdAt")
      ORDER BY date DESC
    `;

    return {
      summary: {
        totalPayments,
        completedCount: completedPayments._count,
        completedAmount: completedPayments._sum.amount || 0,
        pendingCount: pendingPayments._count,
        pendingAmount: pendingPayments._sum.amount || 0,
        failedCount: failedPayments,
        conversionRate: totalPayments > 0
          ? Math.round((completedPayments._count / totalPayments) * 100)
          : 0,
      },
      recentPayments,
      dailyBreakdown: dailyBreakdown.map(d => ({
        date: d.date,
        count: Number(d.count),
        total: d.total,
      })),
    };
  }

  /**
   * Get payment link status
   */
  async getPaymentLinkStatus(paymentLinkId: string) {
    const razorpay = this.ensureInitialized();

    try {
      const paymentLink = await circuitBreakers.razorpay.execute(() =>
        razorpay.paymentLink.fetch(paymentLinkId)
      );

      return {
        id: (paymentLink as any).id,
        status: (paymentLink as any).status,
        amount: (paymentLink as any).amount / 100,
        amountPaid: (paymentLink as any).amount_paid / 100,
        shortUrl: (paymentLink as any).short_url,
        expiredAt: (paymentLink as any).expire_by
          ? new Date((paymentLink as any).expire_by * 1000)
          : null,
        payments: (paymentLink as any).payments || [],
      };
    } catch (error) {
      if (error instanceof CircuitBreakerError) {
        throw new BadRequestError('Payment service is temporarily unavailable.');
      }
      throw error;
    }
  }

  /**
   * Cancel a payment link
   */
  async cancelPaymentLink(paymentLinkId: string, organizationId: string) {
    const razorpay = this.ensureInitialized();

    // Verify ownership
    const payment = await prisma.payment.findFirst({
      where: {
        orderId: paymentLinkId,
        organizationId,
      },
    });

    if (!payment) {
      throw new NotFoundError('Payment link not found');
    }

    try {
      await circuitBreakers.razorpay.execute(() =>
        razorpay.paymentLink.cancel(paymentLinkId)
      );

      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      });

      return { success: true, message: 'Payment link cancelled' };
    } catch (error) {
      if (error instanceof CircuitBreakerError) {
        throw new BadRequestError('Payment service is temporarily unavailable.');
      }
      throw error;
    }
  }

  async handleWebhook(payload: Record<string, unknown>, signature: string) {
    // Verify webhook signature with timing-safe comparison
    const webhookSecret = config.razorpay.keySecret || '';

    if (!webhookSecret) {
      console.error('[Razorpay] SECURITY: Webhook secret not configured');
      throw new BadRequestError('Webhook verification failed');
    }

    if (!signature) {
      console.error('[Razorpay] SECURITY: No signature provided in webhook request');
      throw new BadRequestError('Webhook signature required');
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    try {
      const expectedBuffer = Buffer.from(expectedSignature, 'hex');
      const receivedBuffer = Buffer.from(signature, 'hex');

      if (expectedBuffer.length !== receivedBuffer.length ||
          !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)) {
        throw new BadRequestError('Invalid webhook signature');
      }
    } catch (error) {
      if (error instanceof BadRequestError) throw error;
      throw new BadRequestError('Invalid webhook signature');
    }

    const event = payload.event as string;
    const paymentEntity = (payload.payload as Record<string, unknown>)?.payment as Record<string, unknown>;

    if (event === 'payment.captured') {
      const orderId = (paymentEntity?.entity as Record<string, unknown>)?.order_id as string;
      const paymentId = (paymentEntity?.entity as Record<string, unknown>)?.id as string;

      await prisma.payment.update({
        where: { orderId },
        data: {
          paymentId,
          status: PaymentStatus.COMPLETED,
          paidAt: new Date(),
        },
      });
    } else if (event === 'payment.failed') {
      const orderId = (paymentEntity?.entity as Record<string, unknown>)?.order_id as string;

      await prisma.payment.update({
        where: { orderId },
        data: {
          status: PaymentStatus.FAILED,
        },
      });
    }

    return { received: true };
  }
}

export const razorpayService = new RazorpayService();
