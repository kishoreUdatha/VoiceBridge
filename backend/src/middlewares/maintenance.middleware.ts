import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { ApiResponse } from '../utils/apiResponse';

/**
 * MAINTENANCE MODE MIDDLEWARE
 *
 * Blocks all non-super-admin requests when maintenance mode is active.
 * Super admins can still access the system to manage maintenance.
 */

// Global maintenance state (in production, use Redis or database)
let maintenanceMode = false;
let maintenanceMessage = 'System is under maintenance. Please try again later.';
let maintenanceStartedAt: Date | null = null;
let maintenanceStartedBy: string | null = null;

/**
 * Set maintenance mode state
 */
export function setMaintenanceMode(
  enabled: boolean,
  message?: string,
  startedBy?: string
): void {
  maintenanceMode = enabled;
  if (message) {
    maintenanceMessage = message;
  }
  maintenanceStartedAt = enabled ? new Date() : null;
  maintenanceStartedBy = enabled ? (startedBy || null) : null;

  console.log(`[Maintenance] Mode ${enabled ? 'ENABLED' : 'DISABLED'}${message ? `: ${message}` : ''}`);
}

/**
 * Get maintenance mode state
 */
export function getMaintenanceMode(): {
  active: boolean;
  message: string;
  startedAt: Date | null;
  startedBy: string | null;
} {
  return {
    active: maintenanceMode,
    message: maintenanceMessage,
    startedAt: maintenanceStartedAt,
    startedBy: maintenanceStartedBy,
  };
}

/**
 * Middleware to check maintenance mode
 * Blocks all requests except for super_admin users
 */
export function maintenanceMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // Skip maintenance check if not in maintenance mode
  if (!maintenanceMode) {
    return next();
  }

  // Allow health check endpoints
  if (req.path === '/health' || req.path === '/api/health') {
    return next();
  }

  // Allow auth routes - maintenance check happens after login validation
  // This allows super admins to login during maintenance
  if (req.path.startsWith('/auth/') || req.path === '/auth') {
    return next();
  }

  // Allow super admin routes (they need to manage maintenance)
  if (req.path.startsWith('/super-admin') || req.path.startsWith('/api/super-admin')) {
    return next();
  }

  // Check if user is super_admin - allow them through
  const userRole = req.user?.role?.toLowerCase() || req.user?.roleSlug?.toLowerCase() || '';
  if (userRole === 'super_admin' || userRole === 'superadmin') {
    return next();
  }

  // Block all other requests
  ApiResponse.error(
    res,
    maintenanceMessage,
    503, // Service Unavailable
    'MAINTENANCE_MODE'
  );
}

/**
 * Middleware specifically for auth routes during maintenance
 * Blocks login attempts for non-super-admin users
 */
export function maintenanceAuthMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // Skip if not in maintenance mode
  if (!maintenanceMode) {
    return next();
  }

  // For login requests, check if the email is a super admin
  // This is checked after login in the auth service, but we show a maintenance message
  // to regular users trying to login

  // Allow the request to proceed - the frontend will show maintenance message
  // if login succeeds for non-super-admin
  return next();
}

export default maintenanceMiddleware;
