import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { ApiResponse } from '../utils/apiResponse';
import { prisma } from '../config/database';
import { getAccessToken } from '../utils/cookies';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    organizationId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    roleSlug: string; // Kept for backwards compatibility
    permissions: string[];
    managerId: string | null; // Manager ID for team-based access control
  };
}

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get token from cookie or Authorization header
    const token = getAccessToken(req);

    if (!token) {
      ApiResponse.unauthorized(res, 'No token provided');
      return;
    }

    const decoded = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        role: true,
      },
    });

    if (!user || !user.isActive) {
      ApiResponse.unauthorized(res, 'User not found or inactive');
      return;
    }

    req.user = {
      id: user.id,
      organizationId: user.organizationId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role.slug,
      roleSlug: user.role.slug, // Kept for backwards compatibility
      permissions: (user.role.permissions as string[]) || [],
      managerId: user.managerId,
    };

    next();
  } catch (error) {
    ApiResponse.unauthorized(res, 'Invalid or expired token');
  }
}

export function authorize(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      ApiResponse.unauthorized(res);
      return;
    }

    if (!allowedRoles.includes(req.user.roleSlug)) {
      ApiResponse.forbidden(res, 'You do not have permission to perform this action');
      return;
    }

    next();
  };
}

export function hasPermission(...requiredPermissions: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      ApiResponse.unauthorized(res);
      return;
    }

    const userPermissions = req.user.permissions || [];
    const hasAllPermissions = requiredPermissions.every((permission) =>
      userPermissions.includes(permission)
    );

    if (!hasAllPermissions) {
      ApiResponse.forbidden(res, 'Insufficient permissions');
      return;
    }

    next();
  };
}

// Optional authentication - continues even if no token provided
export async function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get token from cookie or Authorization header
    const token = getAccessToken(req);

    if (!token) {
      // No token, continue without user
      next();
      return;
    }

    const decoded = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        role: true,
      },
    });

    if (user && user.isActive) {
      req.user = {
        id: user.id,
        organizationId: user.organizationId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role.slug,
        roleSlug: user.role.slug,
        permissions: (user.role.permissions as string[]) || [],
        managerId: user.managerId,
      };
    }

    next();
  } catch {
    // Invalid token, continue without user
    next();
  }
}
