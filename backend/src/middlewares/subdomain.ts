import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { ApiResponse } from '../utils/apiResponse';
import { config } from '../config';

export interface SubdomainRequest extends Request {
  tenantSlug?: string;
  tenantId?: string;
  tenantName?: string;
}

/**
 * List of reserved subdomains that should not be treated as tenant slugs
 */
const RESERVED_SUBDOMAINS = [
  'www',
  'app',
  'api',
  'admin',
  'super-admin',
  'platform',
  'dashboard',
  'auth',
  'login',
  'register',
  'docs',
  'help',
  'support',
  'status',
  'blog',
  'mail',
  'smtp',
  'ftp',
  'cdn',
  'static',
  'assets',
  'media',
];

/**
 * Extract subdomain from hostname
 * Examples:
 *   abc-college.myleadx.com → abc-college
 *   xyz-hospital.crm.myleadx.com → xyz-hospital
 *   localhost:5000 → null
 *   myleadx.com → null
 */
function extractSubdomain(hostname: string): string | null {
  // Remove port if present
  const host = hostname.split(':')[0];

  // Skip localhost and IP addresses
  if (host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return null;
  }

  const parts = host.split('.');

  // Need at least 3 parts for subdomain (sub.domain.tld)
  // Or 4 parts for sub.domain.co.in style
  if (parts.length < 3) {
    return null;
  }

  const subdomain = parts[0].toLowerCase();

  // Check if it's a reserved subdomain
  if (RESERVED_SUBDOMAINS.includes(subdomain)) {
    return null;
  }

  return subdomain;
}

/**
 * Middleware to identify tenant from subdomain
 * Adds tenantSlug, tenantId, tenantName to request if valid subdomain found
 */
export async function subdomainTenant(
  req: SubdomainRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const subdomain = extractSubdomain(req.hostname);

    if (!subdomain) {
      // No subdomain, continue without tenant context
      // This allows access to main app (myleadx.com)
      next();
      return;
    }

    // Look up organization by slug
    const organization = await prisma.organization.findUnique({
      where: { slug: subdomain },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        subscriptionStatus: true,
      },
    });

    if (!organization) {
      // Invalid subdomain - organization not found
      ApiResponse.notFound(res, `Organization '${subdomain}' not found`);
      return;
    }

    if (!organization.isActive) {
      ApiResponse.forbidden(res, 'This organization account is inactive');
      return;
    }

    if (organization.subscriptionStatus === 'SUSPENDED') {
      ApiResponse.forbidden(res, 'This organization account is suspended');
      return;
    }

    // Attach tenant info to request
    req.tenantSlug = organization.slug;
    req.tenantId = organization.id;
    req.tenantName = organization.name;

    next();
  } catch (error) {
    console.error('[Subdomain] Error identifying tenant:', error);
    next(); // Continue without tenant context on error
  }
}

/**
 * Middleware to require subdomain tenant
 * Use this for routes that MUST have a valid tenant subdomain
 */
export async function requireSubdomainTenant(
  req: SubdomainRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  await subdomainTenant(req, res, () => {
    if (!req.tenantId) {
      ApiResponse.badRequest(res, 'Please access via your organization subdomain');
      return;
    }
    next();
  });
}

/**
 * Validate that authenticated user belongs to the subdomain tenant
 * Use after both authenticate and subdomainTenant middlewares
 */
export function validateUserTenant(
  req: SubdomainRequest & { user?: { organizationId: string } },
  res: Response,
  next: NextFunction
): void {
  // If no subdomain tenant, skip validation
  if (!req.tenantId) {
    next();
    return;
  }

  // If no authenticated user, skip validation (auth middleware will handle)
  if (!req.user) {
    next();
    return;
  }

  // Validate user belongs to this tenant
  if (req.user.organizationId !== req.tenantId) {
    ApiResponse.forbidden(res, 'You do not have access to this organization');
    return;
  }

  next();
}

/**
 * Get tenant URL for an organization
 */
export function getTenantUrl(slug: string): string {
  const baseUrl = config.frontendUrl || 'http://localhost:5173';

  // Parse the base URL
  try {
    const url = new URL(baseUrl);

    // For localhost, just return base URL (no subdomain support)
    if (url.hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(url.hostname)) {
      return baseUrl;
    }

    // Insert subdomain
    url.hostname = `${slug}.${url.hostname}`;
    return url.toString().replace(/\/$/, ''); // Remove trailing slash
  } catch {
    return baseUrl;
  }
}

/**
 * Helper to check if request is from main domain (no subdomain)
 */
export function isMainDomain(req: SubdomainRequest): boolean {
  return !req.tenantSlug;
}

export default {
  subdomainTenant,
  requireSubdomainTenant,
  validateUserTenant,
  getTenantUrl,
  isMainDomain,
  extractSubdomain,
};
