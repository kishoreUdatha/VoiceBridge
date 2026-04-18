/**
 * Tenant Detection Utility
 * Extracts tenant/subdomain from the current URL
 */

// List of subdomains that should NOT be treated as tenant identifiers
const NON_TENANT_SUBDOMAINS = ['www', 'app', 'api', 'admin', 'myleadx'];

// Default tenant for localhost development
// This can be overridden by setting VITE_DEV_TENANT in .env.local
const DEV_TENANT = import.meta.env.VITE_DEV_TENANT || null;

/**
 * Check if we're running on localhost
 */
function isLocalhost(): boolean {
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.');
}

/**
 * Get tenant identifier from the current hostname
 * Examples:
 *   - abc-institute.myleadx.ai -> "abc-institute"
 *   - xyz-corp.myleadx.ai -> "xyz-corp"
 *   - myleadx.ai -> null (main app)
 *   - localhost:5173 -> DEV_TENANT (development with default tenant)
 */
export function getTenantFromHost(): string | null {
  const host = window.location.hostname; // "abc-institute.myleadx.ai"

  // For localhost development, use the configured dev tenant
  if (isLocalhost()) {
    return DEV_TENANT;
  }

  const parts = host.split('.');

  // For production: abc-institute.myleadx.ai
  if (parts.length >= 2) {
    const subdomain = parts[0].toLowerCase();

    // Check if it's a non-tenant subdomain
    if (NON_TENANT_SUBDOMAINS.includes(subdomain)) {
      return null;
    }

    // Check if it looks like an IP address
    if (/^\d+$/.test(subdomain)) {
      return null;
    }

    return subdomain;
  }

  return null;
}

/**
 * Get the full tenant identifier (could be subdomain or custom domain)
 */
export function getTenantIdentifier(): string | null {
  const host = window.location.hostname;

  // Check if it's a custom domain (not *.myleadx.ai)
  if (!host.includes('myleadx') && !host.includes('localhost')) {
    // This is likely a custom domain like crm.customerdomain.com
    return host;
  }

  // Otherwise, extract subdomain
  return getTenantFromHost();
}

/**
 * Check if current site is white-labeled (has a tenant)
 */
export function isWhiteLabeled(): boolean {
  return getTenantIdentifier() !== null;
}

/**
 * Get base URL for the main MyLeadX site (non-white-labeled)
 */
export function getMainSiteUrl(): string {
  if (import.meta.env.DEV) {
    return 'http://localhost:5173';
  }
  return 'https://app.myleadx.ai';
}
