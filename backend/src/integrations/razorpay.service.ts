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

  async getPaymentDetails(orderId: string) {
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

    return payment;
  }

  async getPaymentHistory(studentProfileId: string) {
    return prisma.payment.findMany({
      where: { studentProfileId },
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

  async handleWebhook(payload: Record<string, unknown>, signature: string) {
    // Verify webhook signature
    const webhookSecret = config.razorpay.keySecret || '';
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (expectedSignature !== signature) {
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
