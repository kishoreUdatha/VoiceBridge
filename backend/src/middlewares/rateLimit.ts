import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

// Check if rate limiting should be disabled (for testing)
const isTestMode = process.env.DISABLE_RATE_LIMIT === 'true' || process.env.NODE_ENV === 'test';

// No-op middleware for test mode
const noopMiddleware = (_req: Request, _res: Response, next: NextFunction) => next();

// General API rate limiter
export const apiLimiter = isTestMode ? noopMiddleware : rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 500 : 5000, // Higher limit for development
  message: {
    success: false,
    message: 'Too many requests, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use user ID if authenticated, otherwise IP
    return (req as any).user?.id || req.ip || 'anonymous';
  },
});

// Strict limiter for authentication endpoints
export const authLimiter = isTestMode ? noopMiddleware : rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 10 : 1000, // Much higher limit for development
  message: {
    success: false,
    message: 'Too many login attempts, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
});

// Limiter for password reset
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 password reset requests per hour
  message: {
    success: false,
    message: 'Too many password reset attempts, please try again after an hour',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limiter for SMS/Email sending (prevent abuse)
export const messagingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 messages per minute
  message: {
    success: false,
    message: 'Too many messages sent, please slow down',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return (req as any).user?.organizationId || req.ip || 'anonymous';
  },
});

// Limiter for bulk operations
export const bulkOperationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 bulk operations per hour
  message: {
    success: false,
    message: 'Too many bulk operations, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return (req as any).user?.organizationId || req.ip || 'anonymous';
  },
});

// Limiter for file uploads
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 uploads per hour
  message: {
    success: false,
    message: 'Too many file uploads, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return (req as any).user?.id || req.ip || 'anonymous';
  },
});

// Limiter for webhook endpoints (more lenient)
export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200, // 200 webhook calls per minute
  message: {
    success: false,
    message: 'Too many webhook requests',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limiter for API key based requests
export const apiKeyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: {
    success: false,
    message: 'API rate limit exceeded',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use API key or organization ID
    const apiKey = req.headers['x-api-key'] as string;
    return apiKey || (req as any).user?.organizationId || req.ip || 'anonymous';
  },
});

// Dynamic rate limiter factory
export const createRateLimiter = (options: {
  windowMs?: number;
  max?: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}) => {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.max || 100,
    message: {
      success: false,
      message: options.message || 'Too many requests, please try again later',
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: options.keyGenerator || ((req: Request) => req.ip || 'anonymous'),
  });
};
