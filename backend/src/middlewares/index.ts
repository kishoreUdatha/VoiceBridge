/**
 * MIDDLEWARE EXPORTS
 *
 * Central export for all middleware functions
 */

// Authentication & Authorization
export {
  authenticate,
  authorize,
  hasPermission,
  optionalAuth,
  AuthenticatedRequest,
} from './auth';

// Tenant Isolation (Core security)
export {
  tenantMiddleware,
  withTenant,
  tenantFilter,
  TenantRequest,
} from './tenant';

// Advanced Tenant Isolation & Security
export {
  enforceTenantIsolation,
  injectTenantId,
  requireResourceOwnership,
  requireSuperAdmin,
  auditAction,
  getEffectiveOrgId,
  tenantWhere,
  validateResourceOwnership,
  logSecurityEvent,
  logAuditEvent,
  isSuperAdmin,
  createTenantPrisma,
} from './tenant-isolation';

// Subdomain-based Tenant Identification
export {
  subdomainTenant,
  requireSubdomainTenant,
  validateUserTenant,
  getTenantUrl,
  isMainDomain,
  SubdomainRequest,
} from './subdomain';

// Validation
export { validate } from './validate';

// Rate Limiting
export { apiLimiter } from './rateLimit';

// Audit Logging
export { auditMiddleware } from './audit';

// CSRF Protection
export { csrfTokenSetter, csrfProtection, csrfTokenEndpoint } from './csrf';

// Error Handling
export { errorHandler, notFoundHandler } from './errorHandler';

// Maintenance Mode
export {
  maintenanceMiddleware,
  setMaintenanceMode,
  getMaintenanceMode,
} from './maintenance.middleware';
