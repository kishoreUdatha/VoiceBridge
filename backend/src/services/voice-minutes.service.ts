import { prisma } from '../config/database';

interface VoiceMinutesUsage {
  organizationId: string;
  userId?: string;

  // Organization level
  orgLimit: number;
  orgUsed: number;
  orgRemaining: number;

  // User level (if applicable)
  userLimit: number | null;
  userUsed: number;
  userRemaining: number | null;

  // Can make call?
  canMakeCall: boolean;
  reason?: string;
}

interface UsageCheckResult {
  allowed: boolean;
  reason?: string;
  usage: VoiceMinutesUsage;
}

// Default plan limits (fallback if no plan found)
const DEFAULT_PLAN_LIMITS: Record<string, number> = {
  starter: 100,
  professional: 500,
  business: 2000,
  enterprise: 10000,
};

class VoiceMinutesService {
  /**
   * Check if a user can make a voice call
   */
  async checkUsage(organizationId: string, userId?: string): Promise<UsageCheckResult> {
    // Get organization with plan
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        activePlanId: true,
        voiceMinutesLimit: true,
        voiceMinutesUsed: true,
        voiceMinutesResetAt: true,
        subscriptionStatus: true,
      },
    });

    if (!organization) {
      return {
        allowed: false,
        reason: 'Organization not found',
        usage: this.emptyUsage(organizationId),
      };
    }

    // Check if subscription is active
    if (organization.subscriptionStatus === 'CANCELLED' || organization.subscriptionStatus === 'EXPIRED') {
      return {
        allowed: false,
        reason: 'Subscription is not active',
        usage: this.emptyUsage(organizationId),
      };
    }

    // Reset usage if new month
    await this.checkAndResetMonthlyUsage(organizationId);

    // Get plan limit
    let orgLimit = organization.voiceMinutesLimit;
    if (orgLimit === null) {
      // Get from plan definition
      const plan = await prisma.planDefinition.findFirst({
        where: { slug: organization.activePlanId || 'starter' },
      });
      orgLimit = plan?.voiceMinutesIncluded ?? DEFAULT_PLAN_LIMITS[organization.activePlanId || 'starter'] ?? 100;
    }

    // Refresh org usage after potential reset
    const refreshedOrg = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { voiceMinutesUsed: true },
    });
    const orgUsed = refreshedOrg?.voiceMinutesUsed ?? 0;
    const finalOrgLimit = orgLimit ?? 100; // Default to 100 if null
    const orgRemaining = Math.max(0, finalOrgLimit - orgUsed);

    // Build usage object
    const usage: VoiceMinutesUsage = {
      organizationId,
      userId,
      orgLimit: finalOrgLimit,
      orgUsed,
      orgRemaining,
      userLimit: null,
      userUsed: 0,
      userRemaining: null,
      canMakeCall: true,
    };

    // Check organization limit
    if (orgUsed >= finalOrgLimit) {
      usage.canMakeCall = false;
      usage.reason = 'Organization has reached its monthly voice minutes limit';
      return { allowed: false, reason: usage.reason, usage };
    }

    // Check user-specific limit if userId provided
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          voiceMinutesLimit: true,
          voiceMinutesUsed: true,
          voiceMinutesResetAt: true,
        },
      });

      if (user) {
        // Reset user usage if new month
        await this.checkAndResetUserMonthlyUsage(userId);

        // Refresh user data
        const refreshedUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { voiceMinutesUsed: true, voiceMinutesLimit: true },
        });

        usage.userUsed = refreshedUser?.voiceMinutesUsed ?? 0;
        usage.userLimit = refreshedUser?.voiceMinutesLimit ?? null;

        if (usage.userLimit !== null) {
          usage.userRemaining = Math.max(0, usage.userLimit - usage.userUsed);

          if (usage.userUsed >= usage.userLimit) {
            usage.canMakeCall = false;
            usage.reason = 'You have reached your personal voice minutes limit';
            return { allowed: false, reason: usage.reason, usage };
          }
        }
      }
    }

    return { allowed: true, usage };
  }

  /**
   * Record voice minutes usage after a call
   */
  async recordUsage(organizationId: string, userId: string | null, minutes: number): Promise<void> {
    // Update organization usage
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        voiceMinutesUsed: { increment: minutes },
      },
    });

    // Update user usage if userId provided
    if (userId) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          voiceMinutesUsed: { increment: minutes },
        },
      });
    }

    console.log(`[VoiceMinutes] Recorded ${minutes} minutes for org ${organizationId}, user ${userId || 'N/A'}`);
  }

  /**
   * Get usage statistics for an organization
   */
  async getOrganizationUsage(organizationId: string): Promise<{
    limit: number;
    used: number;
    remaining: number;
    resetDate: Date;
    userBreakdown: Array<{
      userId: string;
      name: string;
      email: string;
      limit: number | null;
      used: number;
    }>;
  }> {
    // Check and reset if needed
    await this.checkAndResetMonthlyUsage(organizationId);

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        activePlanId: true,
        voiceMinutesLimit: true,
        voiceMinutesUsed: true,
        voiceMinutesResetAt: true,
      },
    });

    if (!organization) {
      throw new Error('Organization not found');
    }

    // Get plan limit
    let limit: number | null = organization.voiceMinutesLimit;
    if (limit === null) {
      const plan = await prisma.planDefinition.findFirst({
        where: { slug: organization.activePlanId || 'starter' },
      });
      limit = plan?.voiceMinutesIncluded ?? DEFAULT_PLAN_LIMITS[organization.activePlanId || 'starter'] ?? 100;
    }
    const finalLimit = limit ?? 100;

    // Get user breakdown
    const users = await prisma.user.findMany({
      where: { organizationId, isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        voiceMinutesLimit: true,
        voiceMinutesUsed: true,
      },
      orderBy: { voiceMinutesUsed: 'desc' },
    });

    // Calculate next reset date (1st of next month)
    const now = new Date();
    const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    return {
      limit: finalLimit,
      used: organization.voiceMinutesUsed,
      remaining: Math.max(0, finalLimit - organization.voiceMinutesUsed),
      resetDate,
      userBreakdown: users.map(u => ({
        userId: u.id,
        name: `${u.firstName} ${u.lastName}`,
        email: u.email,
        limit: u.voiceMinutesLimit,
        used: u.voiceMinutesUsed,
      })),
    };
  }

  /**
   * Set voice minutes limit for a user
   */
  async setUserLimit(organizationId: string, userId: string, limit: number | null): Promise<void> {
    // Verify user belongs to organization
    const user = await prisma.user.findFirst({
      where: { id: userId, organizationId },
    });

    if (!user) {
      throw new Error('User not found in organization');
    }

    await prisma.user.update({
      where: { id: userId },
      data: { voiceMinutesLimit: limit },
    });

    console.log(`[VoiceMinutes] Set limit for user ${userId} to ${limit ?? 'unlimited'}`);
  }

  /**
   * Set voice minutes limit for organization (override plan limit)
   */
  async setOrganizationLimit(organizationId: string, limit: number | null): Promise<void> {
    await prisma.organization.update({
      where: { id: organizationId },
      data: { voiceMinutesLimit: limit },
    });

    console.log(`[VoiceMinutes] Set org ${organizationId} limit to ${limit ?? 'plan default'}`);
  }

  /**
   * Check and reset monthly usage for organization
   */
  private async checkAndResetMonthlyUsage(organizationId: string): Promise<void> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { voiceMinutesResetAt: true },
    });

    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    if (!org?.voiceMinutesResetAt || org.voiceMinutesResetAt < currentMonth) {
      // Reset usage for new month
      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          voiceMinutesUsed: 0,
          voiceMinutesResetAt: now,
        },
      });

      // Also reset all user usage in this organization
      await prisma.user.updateMany({
        where: { organizationId },
        data: {
          voiceMinutesUsed: 0,
          voiceMinutesResetAt: now,
        },
      });

      console.log(`[VoiceMinutes] Reset monthly usage for org ${organizationId}`);
    }
  }

  /**
   * Check and reset monthly usage for a specific user
   */
  private async checkAndResetUserMonthlyUsage(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { voiceMinutesResetAt: true },
    });

    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    if (!user?.voiceMinutesResetAt || user.voiceMinutesResetAt < currentMonth) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          voiceMinutesUsed: 0,
          voiceMinutesResetAt: now,
        },
      });
    }
  }

  /**
   * Empty usage object for error cases
   */
  private emptyUsage(organizationId: string): VoiceMinutesUsage {
    return {
      organizationId,
      orgLimit: 0,
      orgUsed: 0,
      orgRemaining: 0,
      userLimit: null,
      userUsed: 0,
      userRemaining: null,
      canMakeCall: false,
    };
  }
}

export const voiceMinutesService = new VoiceMinutesService();
