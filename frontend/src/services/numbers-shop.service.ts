/**
 * Numbers Shop Service
 * API calls for phone number marketplace
 *
 * Supports two options:
 * 1. Connect Your Exotel (BYOC) - Use your own Exotel account
 * 2. Buy from VoiceBridge (PLATFORM) - Purchase numbers from our pool
 */

import api from './api';

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
  source?: 'PLATFORM' | 'BYOC';
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
  source?: 'PLATFORM' | 'BYOC';
  monthlyRent: number;
  perMinuteRate: number;
  currency: string;
  assignedAgent?: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
}

export interface ExotelConnectionStatus {
  isConnected: boolean;
  accountSid?: string;
  callerId?: string;
  subdomain?: string;
  connectedAt?: string;
  lastTested?: string;
  testResult?: {
    success: boolean;
    message: string;
    balance?: number;
  };
}

export interface ExotelCredentials {
  accountSid: string;
  apiKey: string;
  apiToken: string;
  callerId?: string;
  subdomain?: string;
}

class NumbersShopService {
  // ==================== EXOTEL CONNECTION ====================

  /**
   * Connect your own Exotel account
   */
  async connectExotel(credentials: ExotelCredentials): Promise<{
    success: boolean;
    message: string;
    testResult?: any;
  }> {
    const response = await api.post('/numbers-shop/connect-exotel', credentials);
    return response.data.data;
  }

  /**
   * Test Exotel credentials without saving
   */
  async testExotelConnection(credentials: ExotelCredentials): Promise<{
    success: boolean;
    message: string;
    balance?: number;
  }> {
    const response = await api.post('/numbers-shop/test-connection', credentials);
    return response.data.data;
  }

  /**
   * Get Exotel connection status
   */
  async getConnectionStatus(): Promise<ExotelConnectionStatus> {
    const response = await api.get('/numbers-shop/connection-status');
    return response.data.data;
  }

  /**
   * Disconnect your Exotel account
   */
  async disconnectExotel(): Promise<{ success: boolean }> {
    const response = await api.delete('/numbers-shop/disconnect-exotel');
    return response.data;
  }

  // ==================== WALLET ====================

  async getWalletBalance(): Promise<WalletInfo> {
    const response = await api.get('/numbers-shop/wallet');
    return response.data.data;
  }

  async addFunds(amount: number, paymentDetails?: {
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    description?: string;
  }): Promise<{ balance: number; transaction: WalletTransaction }> {
    const response = await api.post('/numbers-shop/wallet/add-funds', {
      amount,
      ...paymentDetails,
    });
    return response.data.data;
  }

  async getTransactionHistory(options?: {
    limit?: number;
    offset?: number;
  }): Promise<{ transactions: WalletTransaction[]; total: number }> {
    const response = await api.get('/numbers-shop/wallet/transactions', {
      params: options,
    });
    return {
      transactions: response.data.data,
      total: response.data.meta?.total || response.data.data.length,
    };
  }

  // ==================== KYC ====================

  async getKycStatus(): Promise<KycStatus> {
    const response = await api.get('/numbers-shop/kyc');
    return response.data.data;
  }

  async submitKyc(documents: {
    panNumber?: string;
    gstNumber?: string;
    addressProof?: string;
    authorizationLetter?: string;
  }): Promise<{ kycVerified: boolean }> {
    const response = await api.post('/numbers-shop/kyc', documents);
    return response.data.data;
  }

  // ==================== AVAILABLE NUMBERS ====================

  async listAvailableNumbers(params?: {
    country?: string;
    type?: 'Landline' | 'Mobile' | 'TollFree';
    region?: string;
    pattern?: string;
    limit?: number;
  }): Promise<{ numbers: AvailableNumber[]; wallet: WalletInfo }> {
    const response = await api.get('/numbers-shop/available', { params });
    return response.data.data;
  }

  /**
   * List platform numbers (from VoiceBridge pool)
   */
  async listPlatformNumbers(params?: {
    country?: string;
    type?: 'Landline' | 'Mobile' | 'TollFree';
    region?: string;
    pattern?: string;
    limit?: number;
  }): Promise<{ numbers: AvailableNumber[]; wallet: WalletInfo }> {
    const response = await api.get('/numbers-shop/platform-numbers', { params });
    return response.data.data;
  }

  async searchNumbers(params: {
    pattern: string;
    country?: string;
    type?: 'Landline' | 'Mobile' | 'TollFree';
  }): Promise<AvailableNumber[]> {
    const response = await api.get('/numbers-shop/search', { params });
    return response.data.data;
  }

  // ==================== IMPORT ====================

  /**
   * Import numbers from your connected Exotel account
   */
  async importFromExotel(): Promise<{
    imported: number;
    skipped: number;
    numbers: PurchasedNumber[];
  }> {
    const response = await api.post('/numbers-shop/import');
    return response.data.data;
  }

  /**
   * Import numbers from your own Exotel (BYOC)
   */
  async importFromOwnExotel(): Promise<{
    imported: number;
    skipped: number;
    numbers: PurchasedNumber[];
  }> {
    const response = await api.post('/numbers-shop/import-own');
    return response.data.data;
  }

  // ==================== PURCHASE ====================

  /**
   * Purchase a number from platform pool
   */
  async purchaseNumber(params: {
    phoneNumber: string;
    friendlyName?: string;
    assignToAgentId?: string;
  }): Promise<{
    phoneNumber: PurchasedNumber;
    transaction: WalletTransaction;
  }> {
    const response = await api.post('/numbers-shop/purchase', params);
    return response.data.data;
  }

  // ==================== MY NUMBERS ====================

  async getMyNumbers(filters?: {
    status?: string;
    provider?: string;
    source?: 'PLATFORM' | 'BYOC';
  }): Promise<PurchasedNumber[]> {
    const response = await api.get('/numbers-shop/my-numbers', { params: filters });
    return response.data.data;
  }

  async releaseNumber(id: string): Promise<{ success: boolean }> {
    const response = await api.delete(`/numbers-shop/my-numbers/${id}`);
    return response.data;
  }
}

export const numbersShopService = new NumbersShopService();
export default numbersShopService;
