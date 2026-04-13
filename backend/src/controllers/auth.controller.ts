import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { ApiResponse } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middlewares/auth';
import { setAuthCookies, clearAuthCookies, getRefreshToken } from '../utils/cookies';
import { SubdomainRequest } from '../middlewares/subdomain';
import { getMaintenanceMode } from '../middlewares/maintenance.middleware';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { organizationName, organizationSlug, email, password, firstName, lastName, phone, planId, industry, teamSize, expectedLeadsPerMonth, country, currency } =
        req.body;

      const result = await authService.register({
        organizationName,
        organizationSlug,
        email,
        password,
        firstName,
        lastName,
        phone,
        planId,
        industry,
        teamSize,
        expectedLeadsPerMonth,
        country,
        currency,
      });

      // Set httpOnly cookies for tokens
      setAuthCookies(res, {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });

      // Return user data without tokens in response body (tokens are in cookies)
      const { accessToken, refreshToken, ...safeResult } = result;
      ApiResponse.created(res, 'Registration successful', safeResult);
    } catch (error) {
      next(error);
    }
  }

  async login(req: SubdomainRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      // Pass tenant slug from subdomain middleware (if present)
      // This validates that the user belongs to the subdomain's organization
      const result = await authService.login({
        email,
        password,
        tenantSlug: req.tenantSlug
      });

      // Check maintenance mode - only allow super_admin logins
      const maintenance = getMaintenanceMode();
      if (maintenance.active) {
        const userRole = result.user?.role?.slug?.toLowerCase() || result.user?.roleSlug?.toLowerCase() || '';
        if (userRole !== 'super_admin' && userRole !== 'superadmin') {
          ApiResponse.error(
            res,
            maintenance.message || 'System is under maintenance. Please try again later.',
            503,
            'MAINTENANCE_MODE'
          );
          return;
        }
      }

      // Set httpOnly cookies for tokens (for web clients)
      setAuthCookies(res, {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });

      // Check if request is from mobile app (no cookie support)
      const userAgent = req.headers['user-agent'] || '';
      const isMobileApp = userAgent.includes('okhttp') ||
                          userAgent.includes('Expo') ||
                          userAgent.includes('React Native') ||
                          req.headers['x-client-type'] === 'mobile';

      if (isMobileApp) {
        // Return tokens in response body for mobile apps
        ApiResponse.success(res, 'Login successful', result);
      } else {
        // Return user data without tokens in response body for web (tokens are in cookies)
        const { accessToken, refreshToken, ...safeResult } = result;
        ApiResponse.success(res, 'Login successful', safeResult);
      }
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Get refresh token from cookie or body (backward compatibility)
      const refreshToken = getRefreshToken(req);

      if (!refreshToken) {
        ApiResponse.unauthorized(res, 'Refresh token required');
        return;
      }

      const tokens = await authService.refreshTokens(refreshToken);

      // Set new httpOnly cookies (web clients)
      setAuthCookies(res, tokens);

      // Mobile clients can't read httpOnly cookies — return the new tokens in
      // the body so the JS interceptor can persist them to AsyncStorage.
      const userAgent = req.headers['user-agent'] || '';
      const isMobileApp =
        userAgent.includes('okhttp') ||
        userAgent.includes('Expo') ||
        userAgent.includes('React Native') ||
        req.headers['x-client-type'] === 'mobile';

      if (isMobileApp) {
        ApiResponse.success(res, 'Tokens refreshed successfully', {
          token: tokens.accessToken,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        });
      } else {
        ApiResponse.success(res, 'Tokens refreshed successfully', { message: 'Tokens refreshed' });
      }
    } catch (error) {
      next(error);
    }
  }

  async logout(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user) {
        await authService.logout(req.user.id, req.user.organizationId);
      }

      // Clear auth cookies
      clearAuthCookies(res);

      ApiResponse.success(res, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;

      await authService.forgotPassword(email);

      ApiResponse.success(res, 'If an account exists, a password reset email has been sent');
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, password } = req.body;

      await authService.resetPassword(token, password);

      ApiResponse.success(res, 'Password reset successful');
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!req.user) {
        ApiResponse.unauthorized(res);
        return;
      }

      await authService.changePassword(req.user.id, currentPassword, newPassword);

      ApiResponse.success(res, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  }

  async me(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        ApiResponse.unauthorized(res);
        return;
      }

      ApiResponse.success(res, 'User profile retrieved', req.user);
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
