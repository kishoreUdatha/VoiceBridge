/**
 * Numbers Shop Service
 * Handles phone number browsing, purchasing, and wallet management
 *
 * Supports two modes:
 * - BYOC (Bring Your Own Carrier): Customer connects their own Exotel account
 * - PLATFORM: Customer buys numbers from MyLeadX's master Exotel account
 */

import { prisma } from '../config/database';
import { AppError } from '../utils/errors';
import { createExotelService, exotelService } from '../integrations/exotel.service';
import { PhoneNumberProvider, PhoneNumberType, PhoneNumberSource, WalletTransactionType, WalletTransactionStatus } from '@prisma/client';
import crypto from 'crypto';

// Pricing configuration (in USD)
const PRICING = {
  INDIA: {
    LOCAL: 5.06,      // $5.06/month for Indian landline numbers
    MOBILE: 6.00,     // $6/month for Indian mobile numbers
    TOLL_FREE: 15.00, // $15/month for toll-free
  },
  DEFAULT: {
    LOCAL: 5.00,
    MOBILE: 6.00,
    TOLL_FREE: 15.00,
  },
};

// Platform markup for reselling numbers (default 40%)
const PLATFORM_MARKUP_PERCENT = parseFloat(process.env.PLATFORM_MARKUP_PERCENT || '40');

// ==================== ENCRYPTION HELPERS ====================
// These match the organization-integrations.routes.ts encryption

const ENCRYPTION_KEY = (() => {
  const key = process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!key) {
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      console.error('FATAL: CREDENTIALS_ENCRYPTION_KEY environment variable is required in production');
      return '';
    }
    return process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
  }
  return key;
})();

const IV_LENGTH = 16;

function encrypt(text: string): string {
  if (!text) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text: string): string {
  if (!text || !text.includes(':')) return text;
  try {
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    return text;
  }
}

interface AvailableNumber {
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

interface PurchaseResult {
  success: boolean;
  phoneNumber?: any;
  transaction?: any;
  error?: string;
}

interface ExotelConnectionStatus {
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

class NumbersShopService {
  // ==================== EXOTEL CONNECTION MANAGEMENT ====================

  /**
   * Connect customer's own Exotel account
   */
  async connectExotel(organizationId: string, credentials: {
    accountSid: string;
    apiKey: string;
    apiToken: string;
    callerId?: string;
    subdomain?: string;
  }): Promise<{ success: boolean; message: string; testResult?: any }> {
    // Validate required fields
    if (!credentials.accountSid || !credentials.apiKey || !credentials.apiToken) {
      throw new AppError('Account SID, API Key, and API Token are required', 400);
    }

    // Test the credentials before saving
    const testService = createExotelService();
    // Temporarily set credentials to test
    const testResult = await this.testExotelCredentials(credentials);

    if (!testResult.success) {
      throw new AppError(`Failed to connect: ${testResult.message}`, 400);
    }

    // Encrypt sensitive credentials
    const encryptedCredentials = {
      accountSid: encrypt(credentials.accountSid),
      apiKey: encrypt(credentials.apiKey),
      apiToken: encrypt(credentials.apiToken),
      callerId: credentials.callerId || '',
      subdomain: credentials.subdomain || 'api.exotel.com',
      isConfigured: true,
      connectedAt: new Date().toISOString(),
      lastTested: new Date().toISOString(),
    };

    // Get existing settings
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    const currentSettings = (organization?.settings as Record<string, any>) || {};
    const integrations = currentSettings.integrations
      ? (typeof currentSettings.integrations === 'string'
          ? JSON.parse(currentSettings.integrations)
          : currentSettings.integrations)
      : {};

    // Update exotel integration
    integrations.exotel = encryptedCredentials;

    // Save to organization settings
    const updatedSettings = { ...currentSettings, integrations };
    await prisma.organization.update({
      where: { id: organizationId },
      data: { settings: updatedSettings },
    });

    // Auto-verify KYC since Exotel already handles KYC verification
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        kycVerified: true,
        kycVerifiedAt: new Date(),
        kycDocuments: { source: 'exotel', note: 'KYC verified via connected Exotel account' },
      },
    });

    return {
      success: true,
      message: 'Exotel account connected successfully',
      testResult,
    };
  }

  /**
   * Test Exotel credentials without saving
   */
  async testExotelCredentials(credentials: {
    accountSid: string;
    apiKey: string;
    apiToken: string;
    subdomain?: string;
  }): Promise<{ success: boolean; message: string; balance?: number }> {
    try {
      const axios = require('axios');
      const subdomain = credentials.subdomain || 'api.exotel.com';
      const baseUrl = `https://${subdomain}/v1/Accounts/${credentials.accountSid}`;

      const response = await axios.get(`${baseUrl}.json`, {
        auth: {
          username: credentials.apiKey,
          password: credentials.apiToken,
        },
      });

      if (response.data && response.data.Account) {
        return {
          success: true,
          message: 'Successfully connected to Exotel',
          balance: parseFloat(response.data.Account.Balance || '0'),
        };
      }

      return {
        success: false,
        message: 'Unexpected response from Exotel',
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.RestException?.Message
        || error.response?.data?.message
        || error.message
        || 'Failed to connect to Exotel';

      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  /**
   * Get Exotel connection status
   */
  async getExotelConnectionStatus(organizationId: string): Promise<ExotelConnectionStatus> {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    if (!organization?.settings) {
      return { isConnected: false };
    }

    const settings = organization.settings as Record<string, any>;
    const integrations = settings.integrations
      ? (typeof settings.integrations === 'string'
          ? JSON.parse(settings.integrations)
          : settings.integrations)
      : {};

    const exotelConfig = integrations.exotel;
    if (!exotelConfig || !exotelConfig.isConfigured) {
      return { isConnected: false };
    }

    // Decrypt accountSid for display (masked)
    const accountSid = exotelConfig.accountSid ? decrypt(exotelConfig.accountSid) : '';
    const maskedSid = accountSid ? `${accountSid.substring(0, 4)}****${accountSid.substring(accountSid.length - 4)}` : '';

    return {
      isConnected: true,
      accountSid: maskedSid,
      callerId: exotelConfig.callerId,
      subdomain: exotelConfig.subdomain,
      connectedAt: exotelConfig.connectedAt,
      lastTested: exotelConfig.lastTested,
    };
  }

  /**
   * Disconnect customer's Exotel account
   */
  async disconnectExotel(organizationId: string): Promise<{ success: boolean }> {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    const currentSettings = (organization?.settings as Record<string, any>) || {};
    const integrations = currentSettings.integrations
      ? (typeof currentSettings.integrations === 'string'
          ? JSON.parse(currentSettings.integrations)
          : currentSettings.integrations)
      : {};

    // Remove exotel integration
    delete integrations.exotel;

    // Save updated settings
    const updatedSettings = { ...currentSettings, integrations };
    await prisma.organization.update({
      where: { id: organizationId },
      data: { settings: updatedSettings },
    });

    return { success: true };
  }

  // ==================== WALLET ENDPOINTS ====================

  /**
   * Get organization's wallet balance
   */
  async getWalletBalance(organizationId: string): Promise<{
    balance: number;
    currency: string;
    kycVerified: boolean;
  }> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        walletBalance: true,
        walletCurrency: true,
        kycVerified: true,
      },
    });

    if (!org) {
      throw new AppError('Organization not found', 404);
    }

    return {
      balance: org.walletBalance,
      currency: org.walletCurrency,
      kycVerified: org.kycVerified,
    };
  }

  /**
   * Add funds to wallet
   */
  async addFunds(
    organizationId: string,
    amount: number,
    paymentDetails: {
      razorpayOrderId?: string;
      razorpayPaymentId?: string;
      description?: string;
    }
  ): Promise<{ balance: number; transaction: any }> {
    if (amount <= 0) {
      throw new AppError('Amount must be positive', 400);
    }

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { walletBalance: true, walletCurrency: true },
    });

    if (!org) {
      throw new AppError('Organization not found', 404);
    }

    const balanceBefore = org.walletBalance;
    const balanceAfter = balanceBefore + amount;

    // Create transaction and update balance atomically
    const [transaction, updatedOrg] = await prisma.$transaction([
      prisma.walletTransaction.create({
        data: {
          organizationId,
          type: WalletTransactionType.CREDIT,
          amount,
          currency: org.walletCurrency,
          balanceBefore,
          balanceAfter,
          referenceType: paymentDetails.razorpayPaymentId ? 'razorpay_payment' : 'manual_credit',
          referenceId: paymentDetails.razorpayPaymentId,
          description: paymentDetails.description || 'Wallet top-up',
          metadata: {
            razorpayOrderId: paymentDetails.razorpayOrderId,
            razorpayPaymentId: paymentDetails.razorpayPaymentId,
          },
          status: WalletTransactionStatus.COMPLETED,
        },
      }),
      prisma.organization.update({
        where: { id: organizationId },
        data: { walletBalance: balanceAfter },
      }),
    ]);

    return {
      balance: updatedOrg.walletBalance,
      transaction,
    };
  }

  /**
   * Get wallet transaction history
   */
  async getTransactionHistory(
    organizationId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ transactions: any[]; total: number }> {
    const { limit = 20, offset = 0 } = options;

    const [transactions, total] = await Promise.all([
      prisma.walletTransaction.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.walletTransaction.count({
        where: { organizationId },
      }),
    ]);

    return { transactions, total };
  }

  // ==================== AVAILABLE NUMBERS ====================

  /**
   * List available phone numbers from Exotel
   * Falls back to sample numbers for demo if Exotel doesn't return any
   */
  async listAvailableNumbers(params: {
    country?: string;
    type?: 'Landline' | 'Mobile' | 'TollFree';
    region?: string;
    pattern?: string;
    limit?: number;
  } = {}): Promise<AvailableNumber[]> {
    const country = params.country || 'IN';

    // Try to fetch from platform Exotel (uses env vars)
    const result = await exotelService.listAvailableNumbers(params);

    let numbers = result.success ? (result.numbers || []) : [];

    // If no numbers from Exotel, use sample numbers for demo
    if (numbers.length === 0 && country === 'IN') {
      numbers = this.getSampleIndianNumbers(params.pattern, params.type);
    }

    // Transform and add pricing with markup
    return numbers.map((num) => {
      const pricing = country === 'IN' ? PRICING.INDIA : PRICING.DEFAULT;
      const type = num.type?.toUpperCase() || 'LOCAL';
      const basePrice = pricing[type as keyof typeof pricing] || pricing.LOCAL;
      // Apply platform markup
      const monthlyPrice = basePrice * (1 + PLATFORM_MARKUP_PERCENT / 100);

      return {
        phoneNumber: num.phoneNumber,
        displayNumber: this.formatDisplayNumber(num.phoneNumber),
        region: num.region,
        city: this.getCityFromRegion(num.region),
        type: num.type,
        capabilities: num.capabilities,
        monthlyPrice: Math.round(monthlyPrice * 100) / 100, // Round to 2 decimals
        currency: 'USD',
        provider: 'EXOTEL',
        source: 'PLATFORM' as const,
      };
    });
  }

  /**
   * List platform numbers (from MyLeadX's master Exotel account)
   */
  async listPlatformNumbers(params: {
    country?: string;
    type?: 'Landline' | 'Mobile' | 'TollFree';
    region?: string;
    pattern?: string;
    limit?: number;
  } = {}): Promise<AvailableNumber[]> {
    return this.listAvailableNumbers(params);
  }

  /**
   * Search available numbers by pattern
   */
  async searchNumbers(params: {
    pattern: string;
    country?: string;
    type?: 'Landline' | 'Mobile' | 'TollFree';
  }): Promise<AvailableNumber[]> {
    return this.listAvailableNumbers({
      pattern: params.pattern,
      country: params.country,
      type: params.type,
      limit: 20,
    });
  }

  // ==================== PURCHASE ====================

  /**
   * Purchase a phone number from platform (MyLeadX's Exotel)
   */
  async purchaseFromPlatform(
    organizationId: string,
    phoneNumber: string,
    options: {
      friendlyName?: string;
      assignToAgentId?: string;
    } = {}
  ): Promise<PurchaseResult> {
    // Get organization and check KYC status
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        walletBalance: true,
        walletCurrency: true,
        kycVerified: true,
      },
    });

    if (!org) {
      throw new AppError('Organization not found', 404);
    }

    // Check KYC for Indian numbers
    if (phoneNumber.startsWith('+91') && !org.kycVerified) {
      throw new AppError('KYC verification is required to purchase Indian numbers', 400);
    }

    // Calculate price with markup (first month charge)
    const basePrice = this.getMonthlyPrice(phoneNumber);
    const monthlyPrice = basePrice * (1 + PLATFORM_MARKUP_PERCENT / 100);
    const roundedPrice = Math.round(monthlyPrice * 100) / 100;

    // Check wallet balance
    if (org.walletBalance < roundedPrice) {
      throw new AppError(
        `Insufficient wallet balance. Required: $${roundedPrice.toFixed(2)}, Available: $${org.walletBalance.toFixed(2)}`,
        400
      );
    }

    // Check if number already exists in organization
    const existingNumber = await prisma.phoneNumber.findFirst({
      where: {
        organizationId,
        number: phoneNumber,
      },
    });

    if (existingNumber) {
      throw new AppError('This phone number is already in your organization', 400);
    }

    // Purchase from platform Exotel (uses env vars)
    const purchaseResult = await exotelService.purchaseNumber({
      phoneNumber,
      friendlyName: options.friendlyName || `MyLeadX - ${phoneNumber}`,
    });

    if (!purchaseResult.success) {
      throw new AppError(purchaseResult.error || 'Failed to purchase number from provider', 500);
    }

    // Deduct from wallet and create records atomically
    const balanceBefore = org.walletBalance;
    const balanceAfter = balanceBefore - roundedPrice;

    const [transaction, phoneNumberRecord, updatedOrg] = await prisma.$transaction([
      // Create wallet transaction
      prisma.walletTransaction.create({
        data: {
          organizationId,
          type: WalletTransactionType.DEBIT,
          amount: -roundedPrice,
          currency: org.walletCurrency,
          balanceBefore,
          balanceAfter,
          referenceType: 'phone_number',
          description: `Phone number purchase: ${phoneNumber}`,
          metadata: {
            phoneNumber,
            providerSid: purchaseResult.exophone?.sid,
            provider: 'EXOTEL',
            source: 'PLATFORM',
          },
          status: WalletTransactionStatus.COMPLETED,
        },
      }),
      // Create phone number record
      prisma.phoneNumber.create({
        data: {
          organizationId,
          number: phoneNumber,
          displayNumber: this.formatDisplayNumber(phoneNumber),
          friendlyName: options.friendlyName || null,
          provider: PhoneNumberProvider.EXOTEL,
          providerNumberId: purchaseResult.exophone?.sid,
          source: PhoneNumberSource.PLATFORM,
          type: this.getPhoneNumberType(phoneNumber),
          capabilities: { voice: true, sms: false },
          status: options.assignToAgentId ? 'ASSIGNED' : 'AVAILABLE',
          assignedToAgentId: options.assignToAgentId || null,
          assignedAt: options.assignToAgentId ? new Date() : null,
          monthlyRent: roundedPrice,
          perMinuteRate: 0.04, // Default per-minute rate
          currency: 'USD',
          region: 'India',
        },
      }),
      // Update wallet balance
      prisma.organization.update({
        where: { id: organizationId },
        data: { walletBalance: balanceAfter },
      }),
    ]);

    return {
      success: true,
      phoneNumber: phoneNumberRecord,
      transaction,
    };
  }

  /**
   * Purchase a phone number (legacy method - routes to platform purchase)
   */
  async purchaseNumber(
    organizationId: string,
    phoneNumber: string,
    options: {
      friendlyName?: string;
      assignToAgentId?: string;
    } = {}
  ): Promise<PurchaseResult> {
    return this.purchaseFromPlatform(organizationId, phoneNumber, options);
  }

  // ==================== KYC ====================

  /**
   * Update KYC status for an organization
   */
  async updateKycStatus(
    organizationId: string,
    verified: boolean,
    documents?: {
      panNumber?: string;
      gstNumber?: string;
      addressProof?: string;
      authorizationLetter?: string;
    }
  ): Promise<{ kycVerified: boolean }> {
    const org = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        kycVerified: verified,
        kycVerifiedAt: verified ? new Date() : null,
        kycDocuments: documents || {},
      },
    });

    return { kycVerified: org.kycVerified };
  }

  /**
   * Get KYC status
   */
  async getKycStatus(organizationId: string): Promise<{
    verified: boolean;
    verifiedAt: Date | null;
    documents: any;
  }> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        kycVerified: true,
        kycVerifiedAt: true,
        kycDocuments: true,
      },
    });

    if (!org) {
      throw new AppError('Organization not found', 404);
    }

    return {
      verified: org.kycVerified,
      verifiedAt: org.kycVerifiedAt,
      documents: org.kycDocuments,
    };
  }

  // ==================== IMPORT ====================

  /**
   * Import/sync phone numbers from customer's own Exotel account (BYOC)
   * Uses org-specific credentials
   */
  async importFromOwnExotel(organizationId: string): Promise<{
    imported: number;
    skipped: number;
    numbers: any[];
  }> {
    // Create org-specific Exotel service
    const orgExotelService = createExotelService(organizationId);

    // Check if org has Exotel configured
    const isConfigured = await orgExotelService.isConfigured();
    if (!isConfigured) {
      throw new AppError('Exotel is not connected. Please connect your Exotel account first.', 400);
    }

    // Fetch purchased numbers from org's Exotel account
    const result = await orgExotelService.listPurchasedNumbers();

    if (!result.success) {
      throw new AppError(result.error || 'Failed to fetch numbers from Exotel', 500);
    }

    const exotelNumbers = result.numbers || [];
    let imported = 0;
    let skipped = 0;
    const importedNumbers: any[] = [];

    // Auto-verify KYC since Exotel already handles KYC verification
    if (exotelNumbers.length > 0) {
      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          kycVerified: true,
          kycVerifiedAt: new Date(),
          kycDocuments: { source: 'exotel', note: 'KYC verified via Exotel account' },
        },
      });
    }

    for (const num of exotelNumbers) {
      // Check if number already exists
      const existing = await prisma.phoneNumber.findFirst({
        where: {
          organizationId,
          number: num.phoneNumber,
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      // Create phone number record with BYOC source
      const phoneNumber = await prisma.phoneNumber.create({
        data: {
          organizationId,
          number: num.phoneNumber,
          displayNumber: this.formatDisplayNumber(num.phoneNumber),
          friendlyName: num.friendlyName || null,
          provider: PhoneNumberProvider.EXOTEL,
          providerNumberId: num.sid,
          source: PhoneNumberSource.BYOC, // Customer's own carrier
          type: this.getPhoneNumberType(num.phoneNumber),
          capabilities: num.capabilities || { voice: true, sms: false },
          status: 'AVAILABLE',
          monthlyRent: 0, // No charge for BYOC numbers (they pay Exotel directly)
          perMinuteRate: 0,
          currency: 'USD',
          region: num.region || 'India',
        },
      });

      importedNumbers.push(phoneNumber);
      imported++;
    }

    return {
      imported,
      skipped,
      numbers: importedNumbers,
    };
  }

  /**
   * Import/sync phone numbers from Exotel account
   * This is the legacy method - now routes to importFromOwnExotel for BYOC
   */
  async importFromExotel(organizationId: string): Promise<{
    imported: number;
    skipped: number;
    numbers: any[];
  }> {
    // Check if org has their own Exotel connected
    const connectionStatus = await this.getExotelConnectionStatus(organizationId);

    if (connectionStatus.isConnected) {
      // Import from customer's own Exotel (BYOC)
      return this.importFromOwnExotel(organizationId);
    }

    // Fall back to platform import (using env vars)
    // This is mainly for backward compatibility
    const result = await exotelService.listPurchasedNumbers();

    if (!result.success) {
      throw new AppError(result.error || 'Failed to fetch numbers from Exotel', 500);
    }

    const exotelNumbers = result.numbers || [];
    let imported = 0;
    let skipped = 0;
    const importedNumbers: any[] = [];

    if (exotelNumbers.length > 0) {
      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          kycVerified: true,
          kycVerifiedAt: new Date(),
          kycDocuments: { source: 'exotel', note: 'KYC verified via Exotel account' },
        },
      });
    }

    for (const num of exotelNumbers) {
      const existing = await prisma.phoneNumber.findFirst({
        where: {
          organizationId,
          number: num.phoneNumber,
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      const phoneNumber = await prisma.phoneNumber.create({
        data: {
          organizationId,
          number: num.phoneNumber,
          displayNumber: this.formatDisplayNumber(num.phoneNumber),
          friendlyName: num.friendlyName || null,
          provider: PhoneNumberProvider.EXOTEL,
          providerNumberId: num.sid,
          source: PhoneNumberSource.PLATFORM,
          type: this.getPhoneNumberType(num.phoneNumber),
          capabilities: num.capabilities || { voice: true, sms: false },
          status: 'AVAILABLE',
          monthlyRent: this.getMonthlyPrice(num.phoneNumber),
          perMinuteRate: 0.04,
          currency: 'USD',
          region: num.region || 'India',
        },
      });

      importedNumbers.push(phoneNumber);
      imported++;
    }

    return {
      imported,
      skipped,
      numbers: importedNumbers,
    };
  }

  // ==================== MY NUMBERS ====================

  /**
   * Get purchased numbers for organization
   */
  async getMyNumbers(
    organizationId: string,
    filters?: {
      status?: string;
      provider?: string;
      source?: 'PLATFORM' | 'BYOC';
    }
  ): Promise<any[]> {
    const where: any = { organizationId };

    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.provider) {
      where.provider = filters.provider;
    }
    if (filters?.source) {
      where.source = filters.source;
    }

    return prisma.phoneNumber.findMany({
      where,
      include: {
        assignedAgent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Release a purchased number
   */
  async releaseNumber(
    organizationId: string,
    phoneNumberId: string
  ): Promise<{ success: boolean }> {
    const phoneNumber = await prisma.phoneNumber.findFirst({
      where: { id: phoneNumberId, organizationId },
    });

    if (!phoneNumber) {
      throw new AppError('Phone number not found', 404);
    }

    if (phoneNumber.assignedToAgentId) {
      throw new AppError('Cannot release a number that is assigned to an agent. Unassign it first.', 400);
    }

    // Release from Exotel if provider number ID exists
    if (phoneNumber.providerNumberId && phoneNumber.provider === 'EXOTEL') {
      // Use org-specific service for BYOC numbers, platform service for PLATFORM numbers
      const exotel = phoneNumber.source === 'BYOC'
        ? createExotelService(organizationId)
        : exotelService;

      const releaseResult = await exotel.releaseNumber(phoneNumber.providerNumberId);
      if (!releaseResult.success) {
        console.warn('[NumbersShop] Failed to release number from Exotel:', releaseResult.error);
        // Continue anyway - we'll remove from our records
      }
    }

    // Delete from our records
    await prisma.phoneNumber.delete({
      where: { id: phoneNumberId },
    });

    return { success: true };
  }

  // ==================== HELPER METHODS ====================

  /**
   * Generate sample Indian phone numbers for demo purposes
   */
  private getSampleIndianNumbers(pattern?: string, type?: string): Array<{
    phoneNumber: string;
    region: string;
    type: string;
    capabilities: { voice: boolean; sms: boolean };
  }> {
    // Sample numbers by region (Bangalore 80xx, Mumbai 22xx, Delhi 11xx, etc.)
    const sampleNumbers = [
      // Bangalore (Karnataka) - 80xx
      { phoneNumber: '+918048799709', region: 'Karnataka', type: 'Landline' },
      { phoneNumber: '+918048799794', region: 'Karnataka', type: 'Landline' },
      { phoneNumber: '+918048799872', region: 'Karnataka', type: 'Landline' },
      { phoneNumber: '+918048799918', region: 'Karnataka', type: 'Landline' },
      { phoneNumber: '+918048799863', region: 'Karnataka', type: 'Landline' },
      { phoneNumber: '+918048799728', region: 'Karnataka', type: 'Landline' },
      { phoneNumber: '+918048799834', region: 'Karnataka', type: 'Landline' },
      { phoneNumber: '+918048799698', region: 'Karnataka', type: 'Landline' },
      { phoneNumber: '+918048799714', region: 'Karnataka', type: 'Landline' },
      { phoneNumber: '+918048799831', region: 'Karnataka', type: 'Landline' },
      // Mumbai (Maharashtra) - 22xx
      { phoneNumber: '+912248799123', region: 'Maharashtra', type: 'Landline' },
      { phoneNumber: '+912248799456', region: 'Maharashtra', type: 'Landline' },
      { phoneNumber: '+912248799789', region: 'Maharashtra', type: 'Landline' },
      // Delhi - 11xx
      { phoneNumber: '+911148799234', region: 'Delhi', type: 'Landline' },
      { phoneNumber: '+911148799567', region: 'Delhi', type: 'Landline' },
      // Chennai (Tamil Nadu) - 44xx
      { phoneNumber: '+914448799345', region: 'Tamil Nadu', type: 'Landline' },
      { phoneNumber: '+914448799678', region: 'Tamil Nadu', type: 'Landline' },
      // Hyderabad (Telangana) - 40xx
      { phoneNumber: '+914048799456', region: 'Telangana', type: 'Landline' },
      { phoneNumber: '+914048799789', region: 'Telangana', type: 'Landline' },
      // Mobile numbers
      { phoneNumber: '+919876543210', region: 'All India', type: 'Mobile' },
      { phoneNumber: '+919988776655', region: 'All India', type: 'Mobile' },
    ];

    let filtered = sampleNumbers;

    // Filter by pattern if provided
    if (pattern) {
      filtered = filtered.filter(num =>
        num.phoneNumber.includes(pattern) ||
        num.phoneNumber.replace('+91', '').startsWith(pattern)
      );
    }

    // Filter by type if provided
    if (type) {
      filtered = filtered.filter(num =>
        num.type.toLowerCase() === type.toLowerCase()
      );
    }

    return filtered.map(num => ({
      ...num,
      capabilities: { voice: true, sms: false },
    }));
  }

  private formatDisplayNumber(phone: string): string {
    if (phone.startsWith('+91') && phone.length === 13) {
      const number = phone.slice(3);
      return `+91 ${number.slice(0, 5)} ${number.slice(5)}`;
    }
    return phone;
  }

  private getCityFromRegion(region: string): string | undefined {
    const regionCityMap: Record<string, string> = {
      'Karnataka': 'Bangalore',
      'Maharashtra': 'Mumbai',
      'Delhi': 'Delhi',
      'Tamil Nadu': 'Chennai',
      'Telangana': 'Hyderabad',
      'West Bengal': 'Kolkata',
      'Gujarat': 'Ahmedabad',
      'Rajasthan': 'Jaipur',
      'Uttar Pradesh': 'Lucknow',
      'Kerala': 'Kochi',
    };
    return regionCityMap[region];
  }

  private getMonthlyPrice(phoneNumber: string): number {
    // Check if Indian number
    if (phoneNumber.startsWith('+91')) {
      // Check if it's a toll-free number (1800)
      if (phoneNumber.includes('1800')) {
        return PRICING.INDIA.TOLL_FREE;
      }
      // Mobile numbers start with 6,7,8,9 after country code
      const firstDigit = phoneNumber.charAt(3);
      if (['6', '7', '8', '9'].includes(firstDigit)) {
        return PRICING.INDIA.MOBILE;
      }
      return PRICING.INDIA.LOCAL;
    }
    return PRICING.DEFAULT.LOCAL;
  }

  private getPhoneNumberType(phoneNumber: string): PhoneNumberType {
    if (phoneNumber.includes('1800')) {
      return PhoneNumberType.TOLL_FREE;
    }
    if (phoneNumber.startsWith('+91')) {
      const firstDigit = phoneNumber.charAt(3);
      if (['6', '7', '8', '9'].includes(firstDigit)) {
        return PhoneNumberType.MOBILE;
      }
    }
    return PhoneNumberType.LOCAL;
  }
}

export const numbersShopService = new NumbersShopService();
export default numbersShopService;
