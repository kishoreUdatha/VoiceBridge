/**
 * Payment Gateway Service - Dependency Inversion Principle
 * Abstract interface for payment processing with Razorpay implementation
 */

import * as Razorpay from 'razorpay';
import * as crypto from 'crypto';
import { AppError } from '../utils/errors';

// Abstract interfaces for payment gateway
export interface PaymentOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface CreateOrderParams {
  amount: number; // In smallest currency unit (paise for INR)
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface VerifyPaymentParams {
  orderId: string;
  paymentId: string;
  signature: string;
}

// Payment Gateway Interface - allows different implementations
export interface IPaymentGateway {
  isConfigured(): boolean;
  createOrder(params: CreateOrderParams): Promise<PaymentOrder>;
  verifyPayment(params: VerifyPaymentParams): boolean;
  fetchOrder(orderId: string): Promise<any>;
  getPublicKey(): string | undefined;
}

/**
 * Razorpay Payment Gateway Implementation
 */
class RazorpayGateway implements IPaymentGateway {
  private razorpay: Razorpay | null = null;
  private keyId: string | undefined;
  private keySecret: string | undefined;

  constructor() {
    this.keyId = process.env.RAZORPAY_KEY_ID;
    this.keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (this.keyId && this.keySecret) {
      this.razorpay = new Razorpay({
        key_id: this.keyId,
        key_secret: this.keySecret,
      });
      console.log('[PaymentGateway] Razorpay initialized successfully');
    } else {
      console.log('[PaymentGateway] Razorpay credentials not configured. Payment features disabled.');
    }
  }

  isConfigured(): boolean {
    return this.razorpay !== null;
  }

  getPublicKey(): string | undefined {
    return this.keyId;
  }

  async createOrder(params: CreateOrderParams): Promise<PaymentOrder> {
    if (!this.razorpay) {
      throw new AppError('Payment gateway not configured', 503);
    }

    const order = await this.razorpay.orders.create({
      amount: params.amount,
      currency: params.currency,
      receipt: params.receipt,
      notes: params.notes,
    });

    return {
      id: order.id,
      amount: order.amount as number,
      currency: order.currency,
      receipt: order.receipt || params.receipt,
      notes: order.notes as Record<string, string>,
    };
  }

  verifyPayment(params: VerifyPaymentParams): boolean {
    if (!this.keySecret) {
      throw new AppError('Payment gateway not configured', 503);
    }

    const body = params.orderId + '|' + params.paymentId;
    const expectedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(body)
      .digest('hex');

    return expectedSignature === params.signature;
  }

  async fetchOrder(orderId: string): Promise<any> {
    if (!this.razorpay) {
      throw new AppError('Payment gateway not configured', 503);
    }

    return await this.razorpay.orders.fetch(orderId);
  }
}

// Singleton instance
export const paymentGateway: IPaymentGateway = new RazorpayGateway();

// Export for testing/mocking
export { RazorpayGateway };
