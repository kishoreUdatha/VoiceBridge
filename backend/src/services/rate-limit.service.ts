import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';

// Rate limit configuration per endpoint type
export interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
  message?: string;      // Custom error message
  keyGenerator?: (req: Request) => string;
  skipFailedRequests?: boolean;
  skipSuccessfulRequests?: boolean;
  handler?: (req: Request, res: Response, next: NextFunction, options: RateLimitInfo) => void;
}

export interface RateLimitInfo {
  limit: number;
  current: number;
  remaining: number;
  resetTime: Date;
  retryAfter: number; // seconds
}

// Check if rate limiting should be relaxed (for testing/development)
const isProduction = process.env.NODE_ENV === 'production';

// Default rate limit configurations
export const RATE_LIMITS = {
  // Authentication endpoints - strict limits to prevent brute force
  AUTH_LOGIN: {
    windowMs: 15 * 60 * 1000,  // 15 minutes
    maxRequests: isProduction ? 5 : 1000,  // 5 in production, 1000 in development
    message: 'Too many login attempts. Please try again in 15 minutes.',
  },
  AUTH_REGISTER: {
    windowMs: 60 * 60 * 1000,  // 1 hour
    maxRequests: 5,            // 5 registrations per hour
    message: 'Too many registration attempts. Please try again later.',
  },
  AUTH_PASSWORD_RESET: {
    windowMs: 60 * 60 * 1000,  // 1 hour
    maxRequests: 3,            // 3 password reset requests
    message: 'Too many password reset requests. Please try again later.',
  },

  // Public API - per API key
  PUBLIC_API_DEFAULT: {
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 60,           // 60 requests per minute (1/sec)
    message: 'API rate limit exceeded. Please slow down.',
  },
  PUBLIC_API_BULK: {
    windowMs: 60 * 60 * 1000,  // 1 hour
    maxRequests: 10,           // 10 bulk operations per hour
    message: 'Bulk operation rate limit exceeded.',
  },
  PUBLIC_API_MESSAGING: {
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 30,           // 30 messages per minute
    message: 'Messaging rate limit exceeded.',
  },

  // General API - per user/organization
  GENERAL_API: {
    windowMs: 15 * 60 * 1000,  // 15 minutes
    maxRequests: 500,          // 500 requests per 15 min
    message: 'Too many requests. Please try again later.',
  },

  // File uploads
  FILE_UPLOAD: {
    windowMs: 60 * 60 * 1000,  // 1 hour
    maxRequests: 50,           // 50 uploads per hour
    message: 'Upload limit exceeded. Please try again later.',
  },

  // Webhook endpoints - more lenient for external services
  WEBHOOK: {
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 100,          // 100 webhook calls per minute
    message: 'Webhook rate limit exceeded.',
  },

  // Search/heavy operations
  SEARCH: {
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 20,           // 20 searches per minute
    message: 'Search rate limit exceeded.',
  },

  // AI/Voice operations - expensive
  AI_OPERATIONS: {
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 10,           // 10 AI calls per minute
    message: 'AI operation rate limit exceeded.',
  },
} as const;

// In-memory store for rate limiting (fallback when Redis not available)
class MemoryStore {
  private store: Map<string, { count: number; resetTime: number }> = new Map();

  async increment(key: string, windowMs: number): Promise<{ count: number; resetTime: Date }> {
    const now = Date.now();
    const existing = this.store.get(key);

    if (!existing || now > existing.resetTime) {
      const resetTime = now + windowMs;
      this.store.set(key, { count: 1, resetTime });
      return { count: 1, resetTime: new Date(resetTime) };
    }

    existing.count++;
    return { count: existing.count, resetTime: new Date(existing.resetTime) };
  }

  async get(key: string): Promise<{ count: number; resetTime: Date } | null> {
    const existing = this.store.get(key);
    if (!existing || Date.now() > existing.resetTime) {
      return null;
    }
    return { count: existing.count, resetTime: new Date(existing.resetTime) };
  }

  // Clean up expired entries periodically
  cleanup() {
    const now = Date.now();
    for (const [key, value] of this.store.entries()) {
      if (now > value.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

class RateLimitService {
  private redis: Redis | null = null;
  private memoryStore: MemoryStore = new MemoryStore();
  private useRedis: boolean = false;
  private redisErrorLogged: boolean = false;

  constructor() {
    this.initializeRedis();
    // Clean up memory store every 5 minutes
    setInterval(() => this.memoryStore.cleanup(), 5 * 60 * 1000);
  }

  private async initializeRedis() {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      try {
        this.redis = new Redis(redisUrl, {
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => {
            if (times > 3) {
              if (!this.redisErrorLogged) {
                console.warn('[RateLimiter] Redis connection failed, using memory store');
                this.redisErrorLogged = true;
              }
              return null;
            }
            return Math.min(times * 100, 3000);
          },
        });

        this.redis.on('connect', () => {
          console.log('Rate limiter connected to Redis');
          this.useRedis = true;
          this.redisErrorLogged = false;
        });

        this.redis.on('error', () => {
          // Suppress repeated Redis errors - just switch to memory fallback
          this.useRedis = false;
        });
      } catch (error) {
        console.warn('Failed to initialize Redis, using memory store');
        this.useRedis = false;
      }
    } else {
      console.log('Redis URL not configured, using memory store for rate limiting');
    }
  }

  /**
   * Check rate limit using sliding window algorithm
   */
  async checkLimit(
    key: string,
    config: RateLimitConfig
  ): Promise<{ allowed: boolean; info: RateLimitInfo }> {
    const { windowMs, maxRequests } = config;

    if (this.useRedis && this.redis) {
      return this.checkLimitRedis(key, windowMs, maxRequests);
    }

    return this.checkLimitMemory(key, windowMs, maxRequests);
  }

  private async checkLimitRedis(
    key: string,
    windowMs: number,
    maxRequests: number
  ): Promise<{ allowed: boolean; info: RateLimitInfo }> {
    const now = Date.now();
    const windowStart = now - windowMs;
    const redisKey = `rate_limit:${key}`;

    try {
      // Use sliding window with sorted set
      const pipeline = this.redis!.pipeline();

      // Remove old entries outside the window
      pipeline.zremrangebyscore(redisKey, 0, windowStart);

      // Count current entries in window
      pipeline.zcard(redisKey);

      // Add current request
      pipeline.zadd(redisKey, now, `${now}-${Math.random()}`);

      // Set expiry
      pipeline.pexpire(redisKey, windowMs);

      const results = await pipeline.exec();
      const currentCount = (results?.[1]?.[1] as number) || 0;

      const resetTime = new Date(now + windowMs);
      const remaining = Math.max(0, maxRequests - currentCount - 1);
      const retryAfter = Math.ceil(windowMs / 1000);

      return {
        allowed: currentCount < maxRequests,
        info: {
          limit: maxRequests,
          current: currentCount + 1,
          remaining,
          resetTime,
          retryAfter,
        },
      };
    } catch (error) {
      console.error('Redis rate limit error:', error);
      // Fallback to memory on Redis error
      return this.checkLimitMemory(key, windowMs, maxRequests);
    }
  }

  private async checkLimitMemory(
    key: string,
    windowMs: number,
    maxRequests: number
  ): Promise<{ allowed: boolean; info: RateLimitInfo }> {
    const result = await this.memoryStore.increment(key, windowMs);
    const remaining = Math.max(0, maxRequests - result.count);
    const retryAfter = Math.ceil((result.resetTime.getTime() - Date.now()) / 1000);

    return {
      allowed: result.count <= maxRequests,
      info: {
        limit: maxRequests,
        current: result.count,
        remaining,
        resetTime: result.resetTime,
        retryAfter: Math.max(0, retryAfter),
      },
    };
  }

  /**
   * Create rate limit middleware
   */
  createMiddleware(config: RateLimitConfig) {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Generate key
      const keyGenerator = config.keyGenerator || this.defaultKeyGenerator;
      const key = keyGenerator(req);

      // Check rate limit
      const { allowed, info } = await this.checkLimit(key, config);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', info.limit);
      res.setHeader('X-RateLimit-Remaining', info.remaining);
      res.setHeader('X-RateLimit-Reset', Math.ceil(info.resetTime.getTime() / 1000));

      if (!allowed) {
        res.setHeader('Retry-After', info.retryAfter);

        if (config.handler) {
          return config.handler(req, res, next, info);
        }

        return res.status(429).json({
          success: false,
          error: config.message || 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: info.retryAfter,
          limit: info.limit,
          resetTime: info.resetTime.toISOString(),
        });
      }

      next();
    };
  }

  /**
   * Default key generator - uses IP + user ID if available
   */
  private defaultKeyGenerator(req: Request): string {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const userId = (req as any).user?.id;
    const orgId = (req as any).user?.organizationId;
    const apiKeyId = (req as any).apiKey?.id;

    if (apiKeyId) {
      return `api_key:${apiKeyId}`;
    }
    if (userId) {
      return `user:${userId}`;
    }
    if (orgId) {
      return `org:${orgId}:${ip}`;
    }
    return `ip:${ip}`;
  }

  /**
   * Get key generator for specific use cases
   */
  getKeyGenerators() {
    return {
      byIP: (req: Request) => `ip:${req.ip || req.socket.remoteAddress || 'unknown'}`,

      byUser: (req: Request) => {
        const userId = (req as any).user?.id;
        return userId ? `user:${userId}` : this.defaultKeyGenerator(req);
      },

      byOrganization: (req: Request) => {
        const orgId = (req as any).user?.organizationId || (req as any).organizationId;
        return orgId ? `org:${orgId}` : this.defaultKeyGenerator(req);
      },

      byApiKey: (req: Request) => {
        const apiKeyId = (req as any).apiKey?.id;
        const apiKeyHeader = req.headers['x-api-key'] as string;
        return apiKeyId ? `api_key:${apiKeyId}` : `api_key_header:${apiKeyHeader || 'unknown'}`;
      },

      byEndpoint: (req: Request) => {
        const base = this.defaultKeyGenerator(req);
        return `${base}:${req.method}:${req.path}`;
      },

      byIPAndEndpoint: (req: Request) => {
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        return `ip:${ip}:${req.method}:${req.path}`;
      },
    };
  }

  /**
   * Get current rate limit status for a key
   */
  async getStatus(key: string, windowMs: number, maxRequests: number): Promise<RateLimitInfo | null> {
    if (this.useRedis && this.redis) {
      try {
        const redisKey = `rate_limit:${key}`;
        const now = Date.now();
        const windowStart = now - windowMs;

        // Remove old entries and count
        await this.redis.zremrangebyscore(redisKey, 0, windowStart);
        const count = await this.redis.zcard(redisKey);

        return {
          limit: maxRequests,
          current: count,
          remaining: Math.max(0, maxRequests - count),
          resetTime: new Date(now + windowMs),
          retryAfter: Math.ceil(windowMs / 1000),
        };
      } catch (error) {
        console.error('Redis status check error:', error);
      }
    }

    const memResult = await this.memoryStore.get(key);
    if (!memResult) return null;

    return {
      limit: maxRequests,
      current: memResult.count,
      remaining: Math.max(0, maxRequests - memResult.count),
      resetTime: memResult.resetTime,
      retryAfter: Math.ceil((memResult.resetTime.getTime() - Date.now()) / 1000),
    };
  }

  /**
   * Reset rate limit for a key (admin function)
   */
  async resetLimit(key: string): Promise<void> {
    if (this.useRedis && this.redis) {
      try {
        await this.redis.del(`rate_limit:${key}`);
      } catch (error) {
        console.error('Redis reset error:', error);
      }
    }
  }
}

// Singleton instance
export const rateLimitService = new RateLimitService();

// Pre-configured middleware instances
export const rateLimiters = {
  // Authentication
  authLogin: rateLimitService.createMiddleware({
    ...RATE_LIMITS.AUTH_LOGIN,
    keyGenerator: rateLimitService.getKeyGenerators().byIP,
    skipSuccessfulRequests: true,
  }),

  authRegister: rateLimitService.createMiddleware({
    ...RATE_LIMITS.AUTH_REGISTER,
    keyGenerator: rateLimitService.getKeyGenerators().byIP,
  }),

  authPasswordReset: rateLimitService.createMiddleware({
    ...RATE_LIMITS.AUTH_PASSWORD_RESET,
    keyGenerator: rateLimitService.getKeyGenerators().byIP,
  }),

  // Public API
  publicApiDefault: rateLimitService.createMiddleware({
    ...RATE_LIMITS.PUBLIC_API_DEFAULT,
    keyGenerator: rateLimitService.getKeyGenerators().byApiKey,
  }),

  publicApiBulk: rateLimitService.createMiddleware({
    ...RATE_LIMITS.PUBLIC_API_BULK,
    keyGenerator: rateLimitService.getKeyGenerators().byApiKey,
  }),

  publicApiMessaging: rateLimitService.createMiddleware({
    ...RATE_LIMITS.PUBLIC_API_MESSAGING,
    keyGenerator: rateLimitService.getKeyGenerators().byApiKey,
  }),

  // General API
  generalApi: rateLimitService.createMiddleware({
    ...RATE_LIMITS.GENERAL_API,
    keyGenerator: rateLimitService.getKeyGenerators().byUser,
  }),

  // File uploads
  fileUpload: rateLimitService.createMiddleware({
    ...RATE_LIMITS.FILE_UPLOAD,
    keyGenerator: rateLimitService.getKeyGenerators().byUser,
  }),

  // Webhooks
  webhook: rateLimitService.createMiddleware({
    ...RATE_LIMITS.WEBHOOK,
    keyGenerator: rateLimitService.getKeyGenerators().byIP,
  }),

  // Search
  search: rateLimitService.createMiddleware({
    ...RATE_LIMITS.SEARCH,
    keyGenerator: rateLimitService.getKeyGenerators().byUser,
  }),

  // AI Operations
  aiOperations: rateLimitService.createMiddleware({
    ...RATE_LIMITS.AI_OPERATIONS,
    keyGenerator: rateLimitService.getKeyGenerators().byOrganization,
  }),
};

// Dynamic rate limiter based on API key settings
export const dynamicApiKeyRateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const apiKey = (req as any).apiKey;

  if (!apiKey) {
    return next();
  }

  // Use API key's custom rate limit if set
  const rateLimit = apiKey.rateLimit || RATE_LIMITS.PUBLIC_API_DEFAULT.maxRequests;
  const rateLimitWindow = (apiKey.rateLimitWindow || 60) * 1000; // Convert to ms

  const config: RateLimitConfig = {
    windowMs: rateLimitWindow,
    maxRequests: rateLimit,
    message: 'API rate limit exceeded',
    keyGenerator: () => `api_key:${apiKey.id}`,
  };

  const middleware = rateLimitService.createMiddleware(config);
  return middleware(req, res, next);
};
