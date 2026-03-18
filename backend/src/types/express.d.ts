/**
 * Express type augmentation for user authentication
 */

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        organizationId: string;
        email: string;
        firstName: string;
        lastName: string;
        role: string;
        roleSlug: string;
        permissions: string[];
      };
    }
  }
}

export {};
