/**
 * Error Tracking Service
 *
 * Centralized error tracking and monitoring for production.
 * Supports integration with Sentry, DataDog, or custom logging.
 *
 * Usage:
 *   import { errorTracker } from '../utils/errorTracking';
 *   errorTracker.captureException(error, { userId, endpoint });
 */

interface ErrorContext {
  userId?: string;
  organizationId?: string;
  endpoint?: string;
  method?: string;
  requestId?: string;
  userAgent?: string;
  ip?: string;
  extra?: Record<string, any>;
}

interface ErrorEvent {
  timestamp: string;
  level: 'error' | 'warning' | 'info';
  message: string;
  stack?: string;
  context: ErrorContext;
  fingerprint?: string;
}

class ErrorTrackingService {
  private isProduction: boolean;
  private serviceName: string;
  private dsn?: string; // Sentry DSN or similar
  private errorBuffer: ErrorEvent[] = [];
  private maxBufferSize = 100;

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.serviceName = process.env.SERVICE_NAME || 'voicebridge-backend';
    this.dsn = process.env.SENTRY_DSN || process.env.ERROR_TRACKING_DSN;

    // Initialize external service if configured
    if (this.dsn && this.isProduction) {
      this.initializeExternalService();
    }
  }

  private initializeExternalService(): void {
    // Placeholder for Sentry or similar initialization
    // In production, uncomment and configure:
    //
    // import * as Sentry from '@sentry/node';
    // Sentry.init({
    //   dsn: this.dsn,
    //   environment: process.env.NODE_ENV,
    //   release: process.env.APP_VERSION,
    //   tracesSampleRate: 0.1,
    // });

    console.info('[ErrorTracking] Service initialized');
  }

  /**
   * Generate a fingerprint for error deduplication
   */
  private generateFingerprint(error: Error, context: ErrorContext): string {
    const parts = [
      error.name,
      error.message.slice(0, 100),
      context.endpoint || 'unknown',
    ];
    return Buffer.from(parts.join('|')).toString('base64').slice(0, 32);
  }

  /**
   * Capture an exception for tracking
   */
  captureException(error: Error, context: ErrorContext = {}): void {
    const event: ErrorEvent = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message: error.message,
      stack: error.stack,
      context: {
        ...context,
        extra: {
          ...context.extra,
          errorName: error.name,
        },
      },
      fingerprint: this.generateFingerprint(error, context),
    };

    // Always log in development
    if (!this.isProduction) {
      console.error('[ErrorTracking]', {
        message: event.message,
        context: event.context,
      });
      return;
    }

    // Production: send to external service or buffer
    if (this.dsn) {
      this.sendToExternalService(event);
    } else {
      this.bufferError(event);
    }

    // Always log critical errors
    console.error(`[Error] ${error.message}`, {
      fingerprint: event.fingerprint,
      userId: context.userId,
      endpoint: context.endpoint,
    });
  }

  /**
   * Capture a warning message
   */
  captureWarning(message: string, context: ErrorContext = {}): void {
    const event: ErrorEvent = {
      timestamp: new Date().toISOString(),
      level: 'warning',
      message,
      context,
    };

    if (this.isProduction && this.dsn) {
      this.sendToExternalService(event);
    }

    console.warn(`[Warning] ${message}`, context);
  }

  /**
   * Capture an info message for audit
   */
  captureInfo(message: string, context: ErrorContext = {}): void {
    if (!this.isProduction) return;

    const event: ErrorEvent = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      context,
    };

    if (this.dsn) {
      this.sendToExternalService(event);
    }
  }

  /**
   * Set user context for subsequent errors
   */
  setUserContext(userId: string, organizationId?: string): void {
    // Placeholder for Sentry setUser
    // Sentry.setUser({ id: userId, organizationId });
  }

  /**
   * Clear user context (on logout)
   */
  clearUserContext(): void {
    // Sentry.setUser(null);
  }

  /**
   * Add breadcrumb for debugging
   */
  addBreadcrumb(message: string, category: string, data?: Record<string, any>): void {
    // Sentry.addBreadcrumb({ message, category, data, level: 'info' });
    if (!this.isProduction) {
      console.debug(`[Breadcrumb:${category}] ${message}`, data);
    }
  }

  private sendToExternalService(event: ErrorEvent): void {
    // Placeholder for actual Sentry/DataDog call
    // Sentry.captureEvent(event);

    // For now, just log it
    console.error('[ErrorTracking:External]', JSON.stringify(event));
  }

  private bufferError(event: ErrorEvent): void {
    this.errorBuffer.push(event);

    // Keep buffer size manageable
    if (this.errorBuffer.length > this.maxBufferSize) {
      this.errorBuffer.shift();
    }

    // Persist to file or database for later analysis
    this.persistBufferedErrors();
  }

  private persistBufferedErrors(): void {
    // Could write to a log file or database
    // For now, just keep in memory
  }

  /**
   * Get buffered errors (for admin dashboard)
   */
  getBufferedErrors(): ErrorEvent[] {
    return [...this.errorBuffer];
  }

  /**
   * Create Express error handler middleware
   */
  expressErrorHandler() {
    return (error: Error, req: any, res: any, next: any) => {
      this.captureException(error, {
        userId: req.user?.id,
        organizationId: req.organization?.id,
        endpoint: `${req.method} ${req.path}`,
        method: req.method,
        requestId: req.headers['x-request-id'] as string,
        userAgent: req.headers['user-agent'] as string,
        ip: req.ip,
        extra: {
          query: req.query,
          body: this.sanitizeBody(req.body),
        },
      });

      next(error);
    };
  }

  /**
   * Sanitize request body for logging (remove sensitive fields)
   */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') return body;

    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'accessToken', 'refreshToken', 'creditCard'];
    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}

// Export singleton instance
export const errorTracker = new ErrorTrackingService();

// Export Express middleware
export const errorTrackingMiddleware = () => errorTracker.expressErrorHandler();
