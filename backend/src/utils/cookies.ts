/**
 * Cookie Utilities
 *
 * Secure cookie handling for authentication tokens.
 * Uses httpOnly cookies to prevent XSS attacks.
 */

import { Response } from 'express';
import { config } from '../config';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Set authentication cookies on the response
 * Uses httpOnly to prevent JavaScript access (XSS protection)
 */
export function setAuthCookies(res: Response, tokens: TokenPair): void {
  const { accessToken, refreshToken } = tokens;

  // Access token cookie - shorter lived
  res.cookie('accessToken', accessToken, {
    httpOnly: config.cookie.httpOnly,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    domain: config.cookie.domain,
    maxAge: config.cookie.accessTokenMaxAge,
    path: '/',
  });

  // Refresh token cookie - longer lived, restricted path
  res.cookie('refreshToken', refreshToken, {
    httpOnly: config.cookie.httpOnly,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    domain: config.cookie.domain,
    maxAge: config.cookie.refreshTokenMaxAge,
    path: '/api/auth', // Only sent to auth endpoints
  });
}

/**
 * Clear authentication cookies on logout
 */
export function clearAuthCookies(res: Response): void {
  res.clearCookie('accessToken', {
    httpOnly: config.cookie.httpOnly,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    domain: config.cookie.domain,
    path: '/',
  });

  res.clearCookie('refreshToken', {
    httpOnly: config.cookie.httpOnly,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    domain: config.cookie.domain,
    path: '/api/auth',
  });
}

/**
 * Get access token from cookies or Authorization header
 * Supports both cookie-based and header-based auth for backward compatibility
 */
export function getAccessToken(req: { cookies?: { accessToken?: string }; headers: { authorization?: string } }): string | null {
  // First try cookies (preferred)
  if (req.cookies?.accessToken) {
    return req.cookies.accessToken;
  }

  // Fallback to Authorization header (for API clients, mobile apps)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}

/**
 * Get refresh token from cookies or request body
 */
export function getRefreshToken(req: { cookies?: { refreshToken?: string }; body?: { refreshToken?: string } }): string | null {
  // First try cookies (preferred)
  if (req.cookies?.refreshToken) {
    return req.cookies.refreshToken;
  }

  // Fallback to request body (for backward compatibility)
  if (req.body?.refreshToken) {
    return req.body.refreshToken;
  }

  return null;
}
