import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { usageTrackingService, UsageType } from '../services/usage-tracking.service';

/**
 * Middleware to check plan limits before allowing actions
 */
export const checkPlanLimit = (usageType: UsageType, amount: number = 1) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({
          success: false,
          message: 'Organization not found',
        });
      }

      const result = await usageTrackingService.checkUsage(organizationId, usageType, amount);

      if (!result.allowed) {
        return res.status(403).json({
          success: false,
          code: 'PLAN_LIMIT_EXCEEDED',
          message: result.message,
          usage: {
            type: usageType,
            current: result.current,
            limit: result.limit,
            remaining: result.remaining,
          },
          upgradeUrl: '/pricing',
        });
      }

      // Attach usage info to request for later use
      (req as any).usageInfo = result;

      next();
    } catch (error) {
      console.error('Plan limit check error:', error);
      // Allow the request on error (fail open)
      next();
    }
  };
};

/**
 * Middleware to increment usage after successful action
 */
export const incrementUsage = (usageType: UsageType, amount: number = 1) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original res.json
    const originalJson = res.json.bind(res);

    res.json = function (body: any) {
      // Only increment if request was successful
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const organizationId = (req as any).user?.organizationId;
        if (organizationId) {
          usageTrackingService.incrementUsage(organizationId, usageType, amount).catch(console.error);
        }
      }
      return originalJson(body);
    };

    next();
  };
};

/**
 * Combined middleware: check limit + increment on success
 */
export const withUsageTracking = (usageType: UsageType, amount: number = 1) => {
  return [
    checkPlanLimit(usageType, amount),
    incrementUsage(usageType, amount),
  ];
};

/**
 * Middleware to check subscription status
 */
export const checkSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = (req as any).user?.organizationId;

    if (!organizationId) {
      return next();
    }

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        subscriptionStatus: true,
        trialEndsAt: true,
      },
    });

    if (!org) {
      return next();
    }

    // Check if trial expired
    if (org.subscriptionStatus === 'TRIAL' && org.trialEndsAt) {
      if (new Date(org.trialEndsAt) < new Date()) {
        return res.status(403).json({
          success: false,
          code: 'TRIAL_EXPIRED',
          message: 'Your trial has expired. Please subscribe to continue.',
          upgradeUrl: '/pricing',
        });
      }
    }

    // Check if subscription is expired/cancelled
    if (org.subscriptionStatus === 'EXPIRED' || org.subscriptionStatus === 'CANCELLED') {
      return res.status(403).json({
        success: false,
        code: 'SUBSCRIPTION_INACTIVE',
        message: 'Your subscription is inactive. Please renew to continue.',
        upgradeUrl: '/pricing',
      });
    }

    next();
  } catch (error) {
    console.error('Subscription check error:', error);
    next();
  }
};
