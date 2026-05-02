/**
 * CSRF Protection Middleware
 *
 * Uses the double-submit cookie pattern:
 * 1. A CSRF token is set in a regular cookie (readable by JS)
 * 2. Client must send this token in a custom header
 * 3. Server verifies the header matches the cookie
 *
 * This protects against CSRF attacks because:
 * - Attackers can't read the cookie due to same-origin policy
 * - Attackers can't set custom headers in cross-origin requests
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '../config';

const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_TOKEN_LENGTH = 32;

/**
 * Generate a random CSRF token
 */
function generateCsrfToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/**
 * Set CSRF token cookie if not already set
 */
export function csrfTokenSetter(req: Request, res: Response, next: NextFunction): void {
  // Skip for non-browser requests (API keys, etc.)
  const apiKey = req.headers['x-api-key'];
  if (apiKey) {
    return next();
  }

  // Check if CSRF token cookie exists
  const existingToken = req.cookies?.[CSRF_COOKIE_NAME];

  if (!existingToken) {
    // Generate and set new CSRF token
    const token = generateCsrfToken();
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false, // Must be readable by JavaScript
      secure: config.cookie.secure, // Use same setting as auth cookies
      sameSite: config.cookie.sameSite,
      domain: config.cookie.domain, // Share across subdomains
      path: '/',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
  }

  next();
}

/**
 * Validate CSRF token on state-changing requests
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void | Response {
  // Skip for safe methods (GET, HEAD, OPTIONS)
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Skip for API key authenticated requests
  const apiKey = req.headers['x-api-key'];
  if (apiKey) {
    return next();
  }

  // Skip for Bearer token authenticated requests (mobile apps using JWT)
  // JWT-based auth doesn't need CSRF protection since tokens are not automatically sent
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return next();
  }

  // Skip for webhook endpoints (they use their own authentication)
  if (req.path.includes('/webhook')) {
    return next();
  }

  // Skip for telephony provider callbacks (Plivo, Exotel, etc.)
  if (req.path.includes('/telephony/plivo/') || req.path.includes('/telephony/exotel/')) {
    return next();
  }

  // Skip for Plivo routes (webhooks and answer callbacks)
  if (req.path.includes('/plivo/')) {
    return next();
  }

  // Skip for Exotel routes
  if (req.path.includes('/exotel/')) {
    return next();
  }

  // Skip for softphone callbacks from telephony providers (Plivo/Exotel webhooks)
  if (req.path.includes('/softphone/') && (
    req.path.includes('/answer/') ||
    req.path.includes('/telecaller-answer/') ||
    req.path.includes('/recording/') ||
    req.path.includes('/conference-status/') ||
    req.path.includes('/speech/') ||
    req.path.includes('/status/')
  )) {
    return next();
  }

  // Skip for auth endpoints that don't have session yet or use httpOnly cookie auth
  // Also skip logout - it's a session-destroying action that should work even if CSRF cookie is stale
  const csrfExemptEndpoints = [
    '/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password',
    '/auth/refresh-token', '/auth/logout', '/super-admin/login', '/super-admin/logout',
    '/super-admin/setup', // First-time setup endpoint
    // Onboarding endpoints - CSRF cookie may not be set yet after login
    '/lead-stages/industry', '/onboarding', '/organization/complete-onboarding',
    // Mobile app notification endpoints
    '/notifications/register-device', '/notifications/unregister-device', '/notifications/test'
  ];
  if (csrfExemptEndpoints.some(endpoint => req.path.endsWith(endpoint) || req.path.includes(endpoint))) {
    return next();
  }

  // Get tokens
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME] as string;

  // Validate tokens exist
  if (!cookieToken || !headerToken) {
    console.warn('[CSRF] Missing token', {
      path: req.path,
      hasCookie: !!cookieToken,
      hasHeader: !!headerToken,
    });
    return res.status(403).json({
      success: false,
      error: 'CSRF token missing',
      code: 'CSRF_TOKEN_MISSING',
    });
  }

  // Use timing-safe comparison to prevent timing attacks
  const cookieBuffer = Buffer.from(cookieToken);
  const headerBuffer = Buffer.from(headerToken);

  if (cookieBuffer.length !== headerBuffer.length ||
      !crypto.timingSafeEqual(cookieBuffer, headerBuffer)) {
    console.warn('[CSRF] Token mismatch', { path: req.path });
    return res.status(403).json({
      success: false,
      error: 'CSRF token invalid',
      code: 'CSRF_TOKEN_INVALID',
    });
  }

  next();
}

/**
 * Get CSRF token endpoint (for SPAs to fetch token)
 */
export function csrfTokenEndpoint(req: Request, res: Response): void {
  let token = req.cookies?.[CSRF_COOKIE_NAME];

  if (!token) {
    token = generateCsrfToken();
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false,
      secure: config.cookie.secure, // Use same setting as auth cookies
      sameSite: config.cookie.sameSite,
      domain: config.cookie.domain, // Share across subdomains
      path: '/',
      maxAge: 24 * 60 * 60 * 1000,
    });
  }

  res.json({
    success: true,
    token,
  });
}
