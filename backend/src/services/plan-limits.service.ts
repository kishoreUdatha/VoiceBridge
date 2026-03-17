/**
 * Plan Limits Service - Single Responsibility Principle
 * Handles all plan limit checking and enforcement
 */

import { PrismaClient } from '@prisma/client';
import { PLANS, getPlan, isUnlimited, type PlanId } from '../config/plans.config';

const prisma = new PrismaClient();

export interface LimitCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  reason?: string;
}

export interface PlanLimitsSummary {
  plan: {
    id: string;
    name: string;
    monthlyPrice: number;
  };
  limits: {
    phoneNumbers: { used: number; limit: number };
    voiceAgents: { used: number; limit: number };
    voiceMinutes: { used: number; limit: number; extraRate: number };
    users: { used: number; limit: number };
    leads: { used: number; limit: number };
  };
  features: Record<string, any>;
  addOnPricing: { extraPhoneNumber: number; extraVoiceAgent: number; extraUser: number } | null;
}

class PlanLimitsService {
  /**
   * Get the current plan for an organization
   */
  async getOrganizationPlan(organizationId: string): Promise<typeof PLANS[PlanId] | null> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { activePlanId: true },
    });

    const planId = org?.activePlanId || 'free';
    return getPlan(planId);
  }

  /**
   * Check phone number limit
   */
  async checkPhoneNumberLimit(organizationId: string): Promise<LimitCheckResult> {
    const plan = await this.getOrganizationPlan(organizationId);
    const limit = plan?.features?.maxPhoneNumbers ?? 0;

    const currentCount = await prisma.phoneNumber.count({
      where: { organizationId, status: { not: 'DISABLED' } },
    });

    if (!isUnlimited(limit) && currentCount >= limit) {
      return {
        allowed: false,
        current: currentCount,
        limit,
        reason: `Phone number limit (${limit}) reached. Please upgrade your plan.`,
      };
    }

    return { allowed: true, current: currentCount, limit };
  }

  /**
   * Check voice agent limit
   */
  async checkVoiceAgentLimit(organizationId: string): Promise<LimitCheckResult> {
    const plan = await this.getOrganizationPlan(organizationId);
    const limit = plan?.features?.maxVoiceAgents ?? 0;

    const currentCount = await prisma.voiceAgent.count({
      where: { organizationId, isActive: true },
    });

    if (!isUnlimited(limit) && currentCount >= limit) {
      return {
        allowed: false,
        current: currentCount,
        limit,
        reason: `Voice agent limit (${limit}) reached. Please upgrade your plan.`,
      };
    }

    return { allowed: true, current: currentCount, limit };
  }

  /**
   * Check user limit
   */
  async checkUserLimit(organizationId: string): Promise<LimitCheckResult> {
    const plan = await this.getOrganizationPlan(organizationId);
    const limit = plan?.features?.maxUsers ?? 1;

    const currentCount = await prisma.user.count({
      where: { organizationId, isActive: true },
    });

    if (!isUnlimited(limit) && currentCount >= limit) {
      return {
        allowed: false,
        current: currentCount,
        limit,
        reason: `User limit (${limit}) reached. Please upgrade your plan.`,
      };
    }

    return { allowed: true, current: currentCount, limit };
  }

  /**
   * Check lead limit
   */
  async checkLeadLimit(organizationId: string): Promise<LimitCheckResult> {
    const plan = await this.getOrganizationPlan(organizationId);
    const limit = plan?.features?.maxLeads ?? 50;

    const currentCount = await prisma.lead.count({
      where: { organizationId },
    });

    if (!isUnlimited(limit) && currentCount >= limit) {
      return {
        allowed: false,
        current: currentCount,
        limit,
        reason: `Lead limit (${limit}) reached. Please upgrade your plan.`,
      };
    }

    return { allowed: true, current: currentCount, limit };
  }

  /**
   * Check if a feature is available in the plan
   */
  async hasFeature(organizationId: string, featureName: string): Promise<boolean> {
    const plan = await this.getOrganizationPlan(organizationId);
    if (!plan) return false;

    const features = plan.features as Record<string, any>;
    return features[featureName] === true;
  }

  /**
   * Get complete plan limits summary
   */
  async getPlanLimits(organizationId: string): Promise<PlanLimitsSummary | null> {
    const plan = await this.getOrganizationPlan(organizationId);
    if (!plan) return null;

    // Get current counts in parallel
    const [phoneNumberCount, voiceAgentCount, userCount, leadCount, org] = await Promise.all([
      prisma.phoneNumber.count({ where: { organizationId, status: { not: 'DISABLED' } } }),
      prisma.voiceAgent.count({ where: { organizationId, isActive: true } }),
      prisma.user.count({ where: { organizationId, isActive: true } }),
      prisma.lead.count({ where: { organizationId } }),
      prisma.organization.findUnique({
        where: { id: organizationId },
        select: { voiceMinutesUsed: true, voiceMinutesLimit: true },
      }),
    ]);

    const voiceMinutesLimit = org?.voiceMinutesLimit ?? plan.features.voiceMinutesIncluded;
    const voiceMinutesUsed = org?.voiceMinutesUsed ?? 0;

    return {
      plan: {
        id: plan.id,
        name: plan.name,
        monthlyPrice: plan.monthlyPrice,
      },
      limits: {
        phoneNumbers: { used: phoneNumberCount, limit: plan.features.maxPhoneNumbers },
        voiceAgents: { used: voiceAgentCount, limit: plan.features.maxVoiceAgents },
        voiceMinutes: {
          used: Math.round(voiceMinutesUsed),
          limit: voiceMinutesLimit,
          extraRate: plan.features.extraMinuteRate,
        },
        users: { used: userCount, limit: plan.features.maxUsers },
        leads: { used: leadCount, limit: plan.features.maxLeads },
      },
      features: plan.features,
      addOnPricing: plan.addOnPricing || null,
    };
  }

  /**
   * Get available plans for upgrade
   */
  async getAvailablePlans(): Promise<Array<any>> {
    // First try database
    const dbPlans = await prisma.planDefinition.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    if (dbPlans.length > 0) {
      return dbPlans.map(plan => ({
        id: plan.slug,
        name: plan.name,
        description: plan.description,
        monthlyPrice: plan.monthlyPrice,
        yearlyPrice: plan.yearlyPrice,
        features: {
          maxUsers: plan.maxUsers,
          maxLeads: plan.maxLeads,
          maxPhoneNumbers: plan.maxPhoneNumbers,
          maxVoiceAgents: plan.maxVoiceAgents,
          voiceMinutesIncluded: plan.voiceMinutesIncluded,
          extraMinuteRate: plan.extraMinuteRate,
          maxSMS: plan.maxSMS,
          maxEmails: plan.maxEmails,
          maxWhatsapp: plan.maxWhatsapp,
          features: plan.features,
        },
        addOnPricing: {
          extraPhoneNumber: plan.extraPhoneNumberRate,
          extraVoiceAgent: plan.extraAgentRate,
          extraUser: plan.extraUserRate,
        },
        isPopular: plan.isPopular,
      }));
    }

    // Fallback to static plans
    return Object.values(PLANS).map(plan => ({
      ...plan,
      yearlyPrice: plan.annualPrice,
    }));
  }
}

export const planLimitsService = new PlanLimitsService();
export default planLimitsService;
