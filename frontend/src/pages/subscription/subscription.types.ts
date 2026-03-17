/**
 * Subscription Management Types
 */

export interface AddOn {
  id: string;
  name: string;
  unit: string;
  defaultQty: number;
  description: string;
}

export interface AddOnPricing {
  starter: number;
  pro: number;
  business: number;
  enterprise: number;
}

export interface BillingHistoryItem {
  id: string;
  createdAt: string;
  planName: string;
  billingCycle: string;
  amount: number;
  status: 'ACTIVE' | 'PENDING' | 'CANCELLED' | string;
  razorpayPaymentId?: string;
}
