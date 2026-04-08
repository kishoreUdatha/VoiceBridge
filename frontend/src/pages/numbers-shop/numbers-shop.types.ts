/**
 * Numbers Shop Types
 */

export interface WalletInfo {
  balance: number;
  currency: string;
  kycVerified: boolean;
}

export interface WalletTransaction {
  id: string;
  type: 'CREDIT' | 'DEBIT' | 'REFUND';
  amount: number;
  currency: string;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  referenceType?: string;
  referenceId?: string;
  status: string;
  createdAt: string;
}

export interface AvailableNumber {
  phoneNumber: string;
  displayNumber: string;
  region: string;
  city?: string;
  type: string;
  capabilities: { voice: boolean; sms: boolean };
  monthlyPrice: number;
  currency: string;
  provider: string;
}

export interface KycStatus {
  verified: boolean;
  verifiedAt: string | null;
  documents: {
    panNumber?: string;
    gstNumber?: string;
    addressProof?: string;
    authorizationLetter?: string;
  };
}

export interface PurchasedNumber {
  id: string;
  number: string;
  displayNumber: string;
  friendlyName?: string;
  provider: string;
  providerNumberId?: string;
  type: string;
  capabilities: { voice: boolean; sms: boolean };
  status: string;
  monthlyRent: number;
  perMinuteRate: number;
  currency: string;
  assignedAgent?: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
}

export interface NumbersShopFilters {
  country: string;
  type: '' | 'Landline' | 'Mobile' | 'TollFree';
  pattern: string;
}

export type TabType = 'shop' | 'my-numbers' | 'wallet';
