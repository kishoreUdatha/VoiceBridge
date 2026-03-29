import { Router, Request, Response } from 'express';
import { prisma } from '../config/database';
import { circuitBreakerRegistry, CircuitState } from '../utils/circuitBreaker';
import { webhookRetryQueue } from '../utils/retry';
import { validateConfig, getConfiguredFeatures, isFeatureConfigured } from '../utils/configValidator';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

interface ServiceStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency?: number;
  message?: string;
  details?: Record<string, unknown>;
}

interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  services: {
    database: ServiceStatus;
    circuitBreakers: {
      overall: ServiceStatus;
      breakers: Record<string, {
        state: string;
        stats: {
          failures: number;
          successes: number;
          totalRequests: number;
        };
      }>;
    };
    retryQueue: ServiceStatus;
  };
}

/**
 * Basic health check - returns 200 if server is responding
 * Use for load balancer health checks
 */
router.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Liveness probe - confirms the application is running
 * Returns 200 if process is alive
 */
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Readiness probe - checks if application is ready to receive traffic
 * Returns 200 if database is connected
 */
router.get('/ready', async (req: Request, res: Response) => {
  try {
    // Quick database check
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'not_ready',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Detailed health check - comprehensive system status
 * Returns status of all services and dependencies
 */
router.get('/detailed', async (req: Request, res: Response) => {
  const startTime = Date.now();

  // Check database
  const dbStatus = await checkDatabase();

  // Check circuit breakers
  const circuitBreakerStatus = checkCircuitBreakers();

  // Check retry queue
  const retryQueueStatus = checkRetryQueue();

  // Determine overall status
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  if (dbStatus.status === 'unhealthy') {
    overallStatus = 'unhealthy';
  } else if (
    dbStatus.status === 'degraded' ||
    circuitBreakerStatus.overall.status === 'degraded' ||
    retryQueueStatus.status === 'degraded'
  ) {
    overallStatus = 'degraded';
  }

  const response: HealthCheckResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    services: {
      database: dbStatus,
      circuitBreakers: circuitBreakerStatus,
      retryQueue: retryQueueStatus,
    },
  };

  const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;
  res.status(statusCode).json(response);
});

/**
 * Circuit breaker status endpoint
 */
router.get('/circuit-breakers', (req: Request, res: Response) => {
  const status = checkCircuitBreakers();
  res.json(status);
});

/**
 * Retry queue status endpoint
 */
router.get('/retry-queue', (req: Request, res: Response) => {
  const stats = webhookRetryQueue.getStats();
  res.json({
    status: stats.failedItems > 10 ? 'degraded' : 'healthy',
    ...stats,
  });
});

/**
 * Force close a circuit breaker (admin only)
 * Protected endpoint - requires ADMIN role
 */
router.post('/circuit-breakers/:name/close', authenticate, authorize('ADMIN'), (req: Request, res: Response) => {
  const { name } = req.params;
  const breaker = circuitBreakerRegistry.get(name);

  if (!breaker) {
    return res.status(404).json({
      success: false,
      message: `Circuit breaker '${name}' not found`,
    });
  }

  breaker.forceClose();
  res.json({
    success: true,
    message: `Circuit breaker '${name}' forced to CLOSED state`,
    state: breaker.getState(),
  });
});

/**
 * Force open a circuit breaker (admin only - for maintenance)
 * Protected endpoint - requires ADMIN role
 */
router.post('/circuit-breakers/:name/open', authenticate, authorize('ADMIN'), (req: Request, res: Response) => {
  const { name } = req.params;
  const breaker = circuitBreakerRegistry.get(name);

  if (!breaker) {
    return res.status(404).json({
      success: false,
      message: `Circuit breaker '${name}' not found`,
    });
  }

  breaker.forceOpen();
  res.json({
    success: true,
    message: `Circuit breaker '${name}' forced to OPEN state`,
    state: breaker.getState(),
  });
});

/**
 * Reset all circuit breakers (admin only)
 * Protected endpoint - requires ADMIN role
 */
router.post('/circuit-breakers/reset-all', authenticate, authorize('ADMIN'), (req: Request, res: Response) => {
  circuitBreakerRegistry.resetAll();
  res.json({
    success: true,
    message: 'All circuit breakers reset to CLOSED state',
  });
});

/**
 * Configuration status endpoint
 * Returns which features are configured (does not expose secrets)
 */
router.get('/config', (req: Request, res: Response) => {
  const result = validateConfig();
  const configuredFeatures = getConfiguredFeatures();

  res.json({
    valid: result.valid,
    summary: result.summary,
    configuredFeatures,
    features: {
      openai: isFeatureConfigured('openai'),
      sarvam: isFeatureConfigured('sarvam'),
      plivo: isFeatureConfigured('plivo'),
      exotel: isFeatureConfigured('exotel'),
      twilio: isFeatureConfigured('twilio'),
      razorpay: isFeatureConfigured('razorpay'),
      facebook: isFeatureConfigured('facebook'),
      linkedin: isFeatureConfigured('linkedin'),
      googleAds: isFeatureConfigured('googleAds'),
      aws: isFeatureConfigured('aws'),
      smtp: isFeatureConfigured('smtp'),
      redis: isFeatureConfigured('redis'),
      whatsapp: isFeatureConfigured('whatsapp'),
      sendgrid: isFeatureConfigured('sendgrid'),
    },
    // Only show warnings in non-production (don't expose config details in prod)
    warnings: process.env.NODE_ENV !== 'production' ? result.warnings : undefined,
  });
});

/**
 * Check if a specific feature is configured
 */
router.get('/config/:feature', (req: Request, res: Response) => {
  const { feature } = req.params;
  const configured = isFeatureConfigured(feature);

  res.json({
    feature,
    configured,
    message: configured
      ? `${feature} is configured and ready to use`
      : `${feature} is not configured. Check environment variables.`,
  });
});

// Helper functions

async function checkDatabase(): Promise<ServiceStatus> {
  const startTime = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - startTime;

    return {
      status: latency > 1000 ? 'degraded' : 'healthy',
      latency,
      message: latency > 1000 ? 'High database latency' : 'Connected',
    };
  } catch (error: any) {
    return {
      status: 'unhealthy',
      message: `Database connection failed: ${error.message}`,
    };
  }
}

function checkCircuitBreakers(): {
  overall: ServiceStatus;
  breakers: Record<string, { state: string; stats: { failures: number; successes: number; totalRequests: number } }>;
} {
  const allBreakers = circuitBreakerRegistry.getAll();
  const allStats = circuitBreakerRegistry.getAllStats();

  const breakers: Record<string, { state: string; stats: { failures: number; successes: number; totalRequests: number } }> = {};
  let openCount = 0;
  let halfOpenCount = 0;

  for (const [name, breaker] of allBreakers) {
    const stats = allStats[name];
    breakers[name] = {
      state: breaker.getState(),
      stats: {
        failures: stats.failures,
        successes: stats.successes,
        totalRequests: stats.totalRequests,
      },
    };

    if (breaker.getState() === CircuitState.OPEN) {
      openCount++;
    } else if (breaker.getState() === CircuitState.HALF_OPEN) {
      halfOpenCount++;
    }
  }

  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  let message = 'All circuit breakers healthy';

  if (openCount > 0) {
    overallStatus = 'degraded';
    message = `${openCount} circuit breaker(s) OPEN`;
  } else if (halfOpenCount > 0) {
    overallStatus = 'degraded';
    message = `${halfOpenCount} circuit breaker(s) in HALF_OPEN state`;
  }

  return {
    overall: {
      status: overallStatus,
      message,
      details: {
        total: allBreakers.size,
        open: openCount,
        halfOpen: halfOpenCount,
        closed: allBreakers.size - openCount - halfOpenCount,
      },
    },
    breakers,
  };
}

function checkRetryQueue(): ServiceStatus {
  const stats = webhookRetryQueue.getStats();

  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  let message = 'Retry queue operating normally';

  if (stats.failedItems > 10) {
    status = 'degraded';
    message = `${stats.failedItems} items have exceeded max retry attempts`;
  } else if (stats.totalItems > 100) {
    status = 'degraded';
    message = `High queue backlog: ${stats.totalItems} items pending`;
  }

  return {
    status,
    message,
    details: stats,
  };
}

export default router;
