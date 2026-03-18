import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { PLANS } from '../services/subscription.service';
import { AppError } from '../utils/errors';
import { AuthenticatedRequest } from './auth';

const prisma = new PrismaClient();

type PlanFeature =
  | 'aiCalls'
  | 'voiceAgents'
  | 'sms'
  | 'whatsapp'
  | 'telecallerQueue'
  | 'socialMediaAds'
  | 'leadScoring'
  | 'webhooks'
  | 'apiAccess'
  | 'sso'
  | 'whiteLabeling'
  | 'appointments';

// Middleware to check if feature is available in current plan
export function requireFeature(feature: PlanFeature) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        throw new AppError('Organization not found', 401);
      }

      // Get organization's active plan
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { activePlanId: true, subscriptionStatus: true },
      });

      if (!organization) {
        throw new AppError('Organization not found', 404);
      }

      // Check subscription status
      if (organization.subscriptionStatus !== 'ACTIVE' && organization.subscriptionStatus !== 'TRIAL') {
        throw new AppError('Active subscription required', 402);
      }

      // Get plan features
      const planId = organization.activePlanId || 'starter';
      const plan = PLANS[planId as keyof typeof PLANS];

      if (!plan) {
        throw new AppError('Invalid plan', 500);
      }

      // Check feature availability
      const featureMapping: Record<PlanFeature, string> = {
        aiCalls: 'aiCallsPerMonth',
        voiceAgents: 'voiceAgents',
        sms: 'smsPerMonth',
        whatsapp: 'hasWhatsApp',
        telecallerQueue: 'hasTelecallerQueue',
        socialMediaAds: 'hasSocialMediaAds',
        leadScoring: 'hasLeadScoring',
        webhooks: 'hasWebhooks',
        apiAccess: 'hasApiAccess',
        sso: 'hasSso',
        whiteLabeling: 'hasWhiteLabeling',
        appointments: 'hasAppointments',
      };

      const planFeatureKey = featureMapping[feature];
      const featureValue = plan.features[planFeatureKey as keyof typeof plan.features];

      // Check if feature is enabled
      if (typeof featureValue === 'boolean' && !featureValue) {
        throw new AppError(
          `Feature '${feature}' is not available in your ${plan.name} plan. Please upgrade to access this feature.`,
          403
        );
      }

      // For numeric limits, check if it's 0 (not available)
      if (typeof featureValue === 'number' && featureValue === 0) {
        throw new AppError(
          `Feature '${feature}' is not available in your ${plan.name} plan. Please upgrade to access this feature.`,
          403
        );
      }

      // Feature is available
      next();
    } catch (error) {
      next(error);
    }
  };
}

// Middleware to check usage limits
export function checkUsageLimit(type: 'leads' | 'aiCalls' | 'sms' | 'emails' | 'whatsapp' | 'users') {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        throw new AppError('Organization not found', 401);
      }

      // Get organization's active plan
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { activePlanId: true },
      });

      const planId = organization?.activePlanId || 'starter';
      const plan = PLANS[planId as keyof typeof PLANS];

      // Get current usage
      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear();

      const usage = await prisma.usageTracking.findFirst({
        where: { organizationId, month, year },
      });

      // Check add-on balance
      const addOnBalance = await prisma.addOnBalance.findFirst({
        where: { organizationId, type },
      });

      const additionalBalance = addOnBalance?.balance || 0;

      // Determine limit and current usage
      let limit: number;
      let currentUsage: number;

      switch (type) {
        case 'leads':
          limit = plan.features.maxLeads;
          currentUsage = usage?.leadsCount || 0;
          break;
        case 'aiCalls':
          limit = plan.features.voiceMinutesIncluded;
          currentUsage = usage?.aiCallsCount || 0;
          break;
        case 'sms':
          limit = plan.features.smsPerMonth;
          currentUsage = usage?.smsCount || 0;
          break;
        case 'emails':
          limit = plan.features.emailsPerMonth;
          currentUsage = usage?.emailsCount || 0;
          break;
        case 'whatsapp':
          limit = plan.features.hasWhatsApp ? -1 : 0; // WhatsApp is boolean
          currentUsage = usage?.whatsappCount || 0;
          break;
        case 'users':
          limit = plan.features.maxUsers;
          const userCount = await prisma.user.count({ where: { organizationId } });
          currentUsage = userCount;
          break;
        default:
          limit = -1;
          currentUsage = 0;
      }

      // -1 means unlimited
      if (limit !== -1) {
        const totalLimit = limit + additionalBalance;
        if (currentUsage >= totalLimit) {
          throw new AppError(
            `You have reached your ${type} limit (${totalLimit}). Please upgrade your plan or purchase add-ons.`,
            429
          );
        }
      }

      // Attach remaining usage to request for reference
      (req as any).remainingUsage = {
        type,
        limit: limit === -1 ? 'unlimited' : limit + additionalBalance,
        used: currentUsage,
        remaining: limit === -1 ? 'unlimited' : (limit + additionalBalance - currentUsage),
      };

      next();
    } catch (error) {
      next(error);
    }
  };
}

// Middleware to check organization limits
export function checkOrgLimit(resourceType: 'forms' | 'landingPages' | 'voiceAgents') {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        throw new AppError('Organization not found', 401);
      }

      // Get organization's active plan
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { activePlanId: true },
      });

      const planId = organization?.activePlanId || 'starter';
      const plan = PLANS[planId as keyof typeof PLANS];

      // Get current count
      let currentCount: number;
      let limit: number;

      switch (resourceType) {
        case 'forms':
          currentCount = await prisma.customForm.count({ where: { organizationId } });
          limit = plan.features.maxForms;
          break;
        case 'landingPages':
          currentCount = await prisma.landingPage.count({ where: { organizationId } });
          limit = plan.features.maxLandingPages;
          break;
        case 'voiceAgents':
          currentCount = await prisma.voiceAgent.count({ where: { organizationId } });
          limit = plan.features.maxVoiceAgents;
          break;
        default:
          currentCount = 0;
          limit = -1;
      }

      // -1 means unlimited
      if (limit !== -1 && currentCount >= limit) {
        throw new AppError(
          `You have reached your ${resourceType} limit (${limit}). Please upgrade your plan.`,
          429
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

// Get plan info for current user
export async function getPlanInfo(organizationId: string) {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { activePlanId: true, subscriptionStatus: true },
  });

  const planId = organization?.activePlanId || 'starter';
  const plan = PLANS[planId as keyof typeof PLANS];

  const month = new Date().getMonth() + 1;
  const year = new Date().getFullYear();

  const usage = await prisma.usageTracking.findFirst({
    where: { organizationId, month, year },
  });

  return {
    plan,
    planId,
    subscriptionStatus: organization?.subscriptionStatus || 'NONE',
    usage: usage || {
      leadsCount: 0,
      aiCallsCount: 0,
      smsCount: 0,
      emailsCount: 0,
      whatsappCount: 0,
      storageUsedMb: 0,
    },
  };
}

export default { requireFeature, checkUsageLimit, checkOrgLimit, getPlanInfo };
