import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type UsageType = 'leads' | 'aiCalls' | 'aiMinutes' | 'sms' | 'emails' | 'whatsapp' | 'storage';

export interface UsageResult {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  message?: string;
}

// Plan limits configuration (aligned with subscription.service.ts)
const PLAN_LIMITS: Record<string, Record<UsageType, number>> = {
  free: {
    leads: 100,
    aiCalls: 0,
    aiMinutes: 0,
    sms: 0,
    emails: 100,
    whatsapp: 0,
    storage: 100, // MB
  },
  starter: {
    leads: 2000,
    aiCalls: 50,
    aiMinutes: 50, // 50 minutes per month
    sms: 100,
    emails: 1000,
    whatsapp: 500,
    storage: 512,
  },
  growth: {
    leads: 10000,
    aiCalls: 200,
    aiMinutes: 200, // 200 minutes per month
    sms: 500,
    emails: 5000,
    whatsapp: 2000,
    storage: 2048,
  },
  business: {
    leads: 50000,
    aiCalls: 1000,
    aiMinutes: 1000, // 1000 minutes per month
    sms: 2000,
    emails: 25000,
    whatsapp: 10000,
    storage: 10240,
  },
  enterprise: {
    leads: -1, // unlimited
    aiCalls: -1,
    aiMinutes: -1,
    sms: -1,
    emails: -1,
    whatsapp: -1,
    storage: -1,
  },
};

class UsageTrackingService {
  /**
   * Get or create usage record for current month
   */
  async getOrCreateMonthlyUsage(organizationId: string) {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    let usage = await prisma.usageTracking.findUnique({
      where: {
        organizationId_month_year: {
          organizationId,
          month,
          year,
        },
      },
    });

    if (!usage) {
      usage = await prisma.usageTracking.create({
        data: {
          organizationId,
          month,
          year,
        },
      });
    }

    return usage;
  }

  /**
   * Get plan limits for an organization
   */
  async getPlanLimits(organizationId: string): Promise<Record<UsageType, number>> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { activePlanId: true },
    });

    const planId = org?.activePlanId || 'starter';
    return PLAN_LIMITS[planId] || PLAN_LIMITS.starter;
  }

  /**
   * Get addon balance for a type
   */
  async getAddonBalance(organizationId: string, type: UsageType): Promise<number> {
    const addon = await prisma.addOnBalance.findUnique({
      where: {
        organizationId_type: {
          organizationId,
          type,
        },
      },
    });

    return addon?.balance || 0;
  }

  /**
   * Get actual AI minutes used this month from call logs
   */
  async getAIMinutesUsed(organizationId: string): Promise<number> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const result = await prisma.aICallLog.aggregate({
      where: {
        organizationId,
        createdAt: { gte: startOfMonth },
      },
      _sum: {
        durationSeconds: true,
      },
    });

    // Convert seconds to minutes (rounded up)
    return Math.ceil((result._sum.durationSeconds || 0) / 60);
  }

  /**
   * Check if usage is allowed (within limits + addons)
   */
  async checkUsage(organizationId: string, type: UsageType, amount: number = 1): Promise<UsageResult> {
    const usage = await this.getOrCreateMonthlyUsage(organizationId);
    const limits = await this.getPlanLimits(organizationId);
    const addonBalance = await this.getAddonBalance(organizationId, type);

    const limit = limits[type];
    let current: number;

    switch (type) {
      case 'leads':
        current = usage.leadsCount;
        break;
      case 'aiCalls':
        current = usage.aiCallsCount;
        break;
      case 'aiMinutes':
        // Calculate actual minutes from call logs
        current = await this.getAIMinutesUsed(organizationId);
        break;
      case 'sms':
        current = usage.smsCount;
        break;
      case 'emails':
        current = usage.emailsCount;
        break;
      case 'whatsapp':
        current = usage.whatsappCount;
        break;
      case 'storage':
        current = Math.ceil(usage.storageUsedMb);
        break;
      default:
        current = 0;
    }

    // Unlimited plan
    if (limit === -1) {
      return {
        allowed: true,
        current,
        limit: -1,
        remaining: -1,
      };
    }

    const totalLimit = limit + addonBalance;
    const remaining = totalLimit - current;
    const allowed = remaining >= amount;

    if (!allowed) {
      // Log the limit event
      await prisma.usageLimitEvent.create({
        data: {
          organizationId,
          type,
          message: `${type} limit reached. Current: ${current}, Limit: ${totalLimit}`,
        },
      });
    }

    return {
      allowed,
      current,
      limit: totalLimit,
      remaining: Math.max(0, remaining),
      message: allowed ? undefined : `${type} limit reached. Please upgrade your plan or purchase add-ons.`,
    };
  }

  /**
   * Increment usage counter
   */
  async incrementUsage(organizationId: string, type: UsageType, amount: number = 1): Promise<void> {
    const usage = await this.getOrCreateMonthlyUsage(organizationId);

    const updateData: Record<string, number> = {};

    switch (type) {
      case 'leads':
        updateData.leadsCount = usage.leadsCount + amount;
        break;
      case 'aiCalls':
        updateData.aiCallsCount = usage.aiCallsCount + amount;
        break;
      case 'sms':
        updateData.smsCount = usage.smsCount + amount;
        break;
      case 'emails':
        updateData.emailsCount = usage.emailsCount + amount;
        break;
      case 'whatsapp':
        updateData.whatsappCount = usage.whatsappCount + amount;
        break;
      case 'storage':
        updateData.storageUsedMb = usage.storageUsedMb + amount;
        break;
    }

    await prisma.usageTracking.update({
      where: { id: usage.id },
      data: updateData,
    });
  }

  /**
   * Decrement addon balance (when using paid addons)
   */
  async decrementAddon(organizationId: string, type: UsageType, amount: number = 1): Promise<void> {
    const addon = await prisma.addOnBalance.findUnique({
      where: {
        organizationId_type: {
          organizationId,
          type,
        },
      },
    });

    if (addon && addon.balance >= amount) {
      await prisma.addOnBalance.update({
        where: { id: addon.id },
        data: { balance: addon.balance - amount },
      });
    }
  }

  /**
   * Get usage summary for organization
   */
  async getUsageSummary(organizationId: string) {
    const usage = await this.getOrCreateMonthlyUsage(organizationId);
    const limits = await this.getPlanLimits(organizationId);

    const getPercentage = (current: number, limit: number) => {
      if (limit === -1) return 0;
      return Math.round((current / limit) * 100);
    };

    return {
      period: {
        month: usage.month,
        year: usage.year,
      },
      usage: {
        leads: {
          current: usage.leadsCount,
          limit: limits.leads,
          percentage: getPercentage(usage.leadsCount, limits.leads),
        },
        aiCalls: {
          current: usage.aiCallsCount,
          limit: limits.aiCalls,
          percentage: getPercentage(usage.aiCallsCount, limits.aiCalls),
        },
        sms: {
          current: usage.smsCount,
          limit: limits.sms,
          percentage: getPercentage(usage.smsCount, limits.sms),
        },
        emails: {
          current: usage.emailsCount,
          limit: limits.emails,
          percentage: getPercentage(usage.emailsCount, limits.emails),
        },
        whatsapp: {
          current: usage.whatsappCount,
          limit: limits.whatsapp,
          percentage: getPercentage(usage.whatsappCount, limits.whatsapp),
        },
        storage: {
          current: Math.round(usage.storageUsedMb),
          limit: limits.storage,
          percentage: getPercentage(usage.storageUsedMb, limits.storage),
        },
      },
    };
  }

  /**
   * Log AI call for billing
   */
  async logAICall(data: {
    organizationId: string;
    userId?: string;
    callSid?: string;
    provider: string;
    direction: string;
    fromNumber?: string;
    toNumber?: string;
    durationSeconds: number;
    status: string;
    agentId?: string;
    leadId?: string;
    campaignId?: string;
    phoneNumberId?: string;
  }) {
    // Calculate cost
    const costPerMinute = this.getProviderCost(data.provider);
    const minutes = Math.ceil(data.durationSeconds / 60);
    const totalCost = minutes * costPerMinute;

    await prisma.aICallLog.create({
      data: {
        organizationId: data.organizationId,
        userId: data.userId,
        callSid: data.callSid,
        provider: data.provider,
        direction: data.direction,
        fromNumber: data.fromNumber,
        toNumber: data.toNumber,
        durationSeconds: data.durationSeconds,
        costPerMinute,
        totalCost,
        status: data.status,
        agentId: data.agentId,
        leadId: data.leadId,
        campaignId: data.campaignId,
        phoneNumberId: data.phoneNumberId,
        startedAt: new Date(Date.now() - data.durationSeconds * 1000),
        endedAt: new Date(),
      },
    });

    // Increment usage (calls count)
    await this.incrementUsage(data.organizationId, 'aiCalls', 1);
  }

  /**
   * Get AI usage summary for billing dashboard
   */
  async getAIUsageSummary(organizationId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [callStats, limits] = await Promise.all([
      prisma.aICallLog.aggregate({
        where: {
          organizationId,
          createdAt: { gte: startOfMonth },
        },
        _sum: {
          durationSeconds: true,
          totalCost: true,
        },
        _count: true,
      }),
      this.getPlanLimits(organizationId),
    ]);

    const totalMinutes = Math.ceil((callStats._sum.durationSeconds || 0) / 60);
    const totalCost = callStats._sum.totalCost || 0;
    const totalCalls = callStats._count;

    return {
      totalCalls,
      totalMinutes,
      totalCost,
      limits: {
        aiCalls: limits.aiCalls,
        aiMinutes: limits.aiMinutes,
      },
      usage: {
        callsPercentage: limits.aiCalls === -1 ? 0 : Math.round((totalCalls / limits.aiCalls) * 100),
        minutesPercentage: limits.aiMinutes === -1 ? 0 : Math.round((totalMinutes / limits.aiMinutes) * 100),
      },
    };
  }

  /**
   * Get provider cost per minute
   */
  private getProviderCost(provider: string): number {
    const costs: Record<string, number> = {
      exotel: 2.0,
      plivo: 0.5,
      twilio: 4.0,
      msg91: 0.25,
      demo: 0,
    };
    return costs[provider] || 1.0;
  }
}

export const usageTrackingService = new UsageTrackingService();
export default usageTrackingService;
