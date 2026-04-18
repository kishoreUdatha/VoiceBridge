/**
 * Error Tracking Utility
 * Provides error monitoring integration (Sentry-ready)
 */

interface ErrorContext {
  userId?: string;
  organizationId?: string;
  route?: string;
  action?: string;
  extra?: Record<string, any>;
}

interface BreadcrumbData {
  category: string;
  message: string;
  level?: 'debug' | 'info' | 'warning' | 'error';
  data?: Record<string, any>;
}

class ErrorTracker {
  private isInitialized = false;
  private dsn: string | null = null;
  private breadcrumbs: BreadcrumbData[] = [];
  private maxBreadcrumbs = 50;
  private userContext: ErrorContext = {};

  /**
   * Initialize error tracking
   */
  init(dsn?: string): void {
    this.dsn = dsn || import.meta.env.VITE_SENTRY_DSN || null;

    if (this.dsn) {
      // Sentry integration would go here
      // import * as Sentry from '@sentry/react';
      // Sentry.init({ dsn: this.dsn, ... });
      console.log('[ErrorTracking] Initialized with DSN');
      this.isInitialized = true;
    } else {
      console.log('[ErrorTracking] Running in development mode (no DSN)');
      this.isInitialized = true;
    }

    // Set up global error handlers
    this.setupGlobalHandlers();
  }

  /**
   * Set up global error handlers
   */
  private setupGlobalHandlers(): void {
    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureException(event.reason, {
        action: 'unhandledrejection',
        extra: { promise: event.promise },
      });
    });

    // Global errors
    window.addEventListener('error', (event) => {
      this.captureException(event.error || new Error(event.message), {
        action: 'window.onerror',
        extra: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    });
  }

  /**
   * Set user context for error tracking
   */
  setUser(user: { id: string; email?: string; organizationId?: string } | null): void {
    if (user) {
      this.userContext = {
        userId: user.id,
        organizationId: user.organizationId,
      };
      // Sentry.setUser({ id: user.id, email: user.email });
    } else {
      this.userContext = {};
      // Sentry.setUser(null);
    }
  }

  /**
   * Add breadcrumb for debugging
   */
  addBreadcrumb(data: BreadcrumbData): void {
    this.breadcrumbs.push({
      ...data,
      level: data.level || 'info',
    });

    // Keep only last N breadcrumbs
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.maxBreadcrumbs);
    }

    // Sentry.addBreadcrumb(data);
  }

  /**
   * Capture an exception
   */
  captureException(error: Error | unknown, context?: ErrorContext): string {
    const errorId = this.generateErrorId();
    const enrichedContext = { ...this.userContext, ...context };

    // Log to console in development
    console.error('[ErrorTracking] Captured exception:', {
      errorId,
      error,
      context: enrichedContext,
      breadcrumbs: this.breadcrumbs.slice(-10),
    });

    // In production with Sentry:
    // Sentry.captureException(error, {
    //   tags: { errorId },
    //   extra: enrichedContext,
    // });

    // Store in localStorage for debugging
    this.storeErrorLocally(errorId, error, enrichedContext);

    return errorId;
  }

  /**
   * Capture a message
   */
  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: ErrorContext): void {
    const enrichedContext = { ...this.userContext, ...context };

    console.log(`[ErrorTracking] ${level.toUpperCase()}: ${message}`, enrichedContext);

    // Sentry.captureMessage(message, level);
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Store error locally for debugging
   */
  private storeErrorLocally(errorId: string, error: Error | unknown, context: ErrorContext): void {
    try {
      const errors = JSON.parse(localStorage.getItem('myleadx_errors') || '[]');
      errors.push({
        id: errorId,
        timestamp: new Date().toISOString(),
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        context,
        breadcrumbs: this.breadcrumbs.slice(-5),
      });

      // Keep only last 20 errors
      if (errors.length > 20) {
        errors.splice(0, errors.length - 20);
      }

      localStorage.setItem('myleadx_errors', JSON.stringify(errors));
    } catch (e) {
      // localStorage might be full or unavailable
    }
  }

  /**
   * Get stored errors for debugging
   */
  getStoredErrors(): any[] {
    try {
      return JSON.parse(localStorage.getItem('myleadx_errors') || '[]');
    } catch {
      return [];
    }
  }

  /**
   * Clear stored errors
   */
  clearStoredErrors(): void {
    localStorage.removeItem('myleadx_errors');
  }
}

// Singleton instance
export const errorTracker = new ErrorTracker();

// Convenience functions
export const captureException = (error: Error | unknown, context?: ErrorContext) =>
  errorTracker.captureException(error, context);

export const captureMessage = (message: string, level?: 'info' | 'warning' | 'error', context?: ErrorContext) =>
  errorTracker.captureMessage(message, level, context);

export const addBreadcrumb = (data: BreadcrumbData) =>
  errorTracker.addBreadcrumb(data);

export const setUser = (user: { id: string; email?: string; organizationId?: string } | null) =>
  errorTracker.setUser(user);

export default errorTracker;
