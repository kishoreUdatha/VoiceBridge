import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../config/database';
import { generateTokenPair, verifyRefreshToken } from '../utils/jwt';
import { UnauthorizedError, NotFoundError, ConflictError, BadRequestError } from '../utils/errors';
import { emailService } from '../integrations/email.service';

interface RegisterInput {
  organizationName: string;
  organizationSlug: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  planId?: string;
}

interface LoginInput {
  email: string;
  password: string;
}

interface AuthResult {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    organizationId: string;
    organizationName: string;
    role: string;
    onboardingCompleted: boolean;
    organizationIndustry: string | null;
  };
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  async register(input: RegisterInput): Promise<AuthResult> {
    // Check if organization slug exists
    const existingOrg = await prisma.organization.findUnique({
      where: { slug: input.organizationSlug },
    });

    if (existingOrg) {
      throw new ConflictError('Organization with this slug already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(input.password, 12);

    // Create organization, admin role, and user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create organization with plan (default to 'free' if not specified)
      const organization = await tx.organization.create({
        data: {
          name: input.organizationName,
          slug: input.organizationSlug,
          email: input.email,
          activePlanId: input.planId || 'free',
        },
      });

      // Create default roles for the organization
      const adminRole = await tx.role.create({
        data: {
          organizationId: organization.id,
          name: 'Admin',
          slug: 'admin',
          permissions: [
            'users.read',
            'users.write',
            'users.delete',
            'leads.read',
            'leads.write',
            'leads.delete',
            'leads.assign',
            'leads.bulk_upload',
            'forms.read',
            'forms.write',
            'forms.delete',
            'campaigns.read',
            'campaigns.write',
            'campaigns.execute',
            'payments.read',
            'payments.write',
            'reports.read',
            'settings.read',
            'settings.write',
            'expenses.approve',
            'expenses.reject',
            'expenses.mark_paid',
          ],
        },
      });

      await tx.role.create({
        data: {
          organizationId: organization.id,
          name: 'Manager',
          slug: 'manager',
          permissions: [
            'users.read',
            'leads.read',
            'leads.write',
            'leads.assign',
            'campaigns.read',
            'campaigns.write',
            'payments.read',
            'payments.write',
            'reports.read',
            'expenses.approve',
            'expenses.reject',
          ],
        },
      });

      await tx.role.create({
        data: {
          organizationId: organization.id,
          name: 'Counselor',
          slug: 'counselor',
          permissions: [
            'leads.read',
            'leads.write',
            'leads.call',
            'campaigns.read',
            'payments.read',
            'payments.write',
          ],
        },
      });

      await tx.role.create({
        data: {
          organizationId: organization.id,
          name: 'Student',
          slug: 'student',
          permissions: ['profile.read', 'profile.write', 'payments.read'],
        },
      });

      // Create admin user
      const user = await tx.user.create({
        data: {
          organizationId: organization.id,
          email: input.email,
          password: hashedPassword,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          roleId: adminRole.id,
        },
      });

      return { organization, user, role: adminRole };
    });

    // Generate tokens
    const tokens = generateTokenPair({
      userId: result.user.id,
      organizationId: result.organization.id,
      roleSlug: 'admin',
    });

    // Save refresh token
    await prisma.user.update({
      where: { id: result.user.id },
      data: { refreshToken: tokens.refreshToken },
    });

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        organizationId: result.organization.id,
        organizationName: result.organization.name,
        role: 'admin',
        onboardingCompleted: false, // New organizations haven't completed onboarding
        organizationIndustry: null, // Industry not set yet
      },
      ...tokens,
    };
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await prisma.user.findFirst({
      where: { email: input.email },
      include: {
        organization: true,
        role: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Your account has been deactivated');
    }

    if (!user.organization.isActive) {
      throw new UnauthorizedError('Your organization has been deactivated');
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Generate tokens
    const tokens = generateTokenPair({
      userId: user.id,
      organizationId: user.organizationId,
      roleSlug: user.role.slug,
    });

    // Update refresh token and last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken: tokens.refreshToken,
        lastLoginAt: new Date(),
      },
    });

    // Get onboarding status from organization settings
    const orgSettings = (user.organization.settings as any) || {};
    const onboardingCompleted = orgSettings.onboardingCompleted || false;

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        organizationId: user.organizationId,
        organizationName: user.organization.name,
        role: user.role.slug,
        onboardingCompleted,
        organizationIndustry: user.organization.industry,
      },
      ...tokens,
    };
  }

  async refreshTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const decoded = verifyRefreshToken(refreshToken);

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: { role: true },
      });

      if (!user || user.refreshToken !== refreshToken) {
        throw new UnauthorizedError('Invalid refresh token');
      }

      if (!user.isActive) {
        throw new UnauthorizedError('User account is deactivated');
      }

      // Generate new tokens
      const tokens = generateTokenPair({
        userId: user.id,
        organizationId: user.organizationId,
        roleSlug: user.role.slug,
      });

      // Update refresh token
      await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: tokens.refreshToken },
      });

      return tokens;
    } catch (error) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }

  async logout(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await prisma.user.findFirst({
      where: { email },
    });

    if (!user) {
      // Don't reveal if user exists - return silently
      return;
    }

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Save hashed token to database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: hashedToken,
        passwordResetExpires: expiresAt,
      },
    });

    // Send password reset email
    try {
      await emailService.sendPasswordResetEmail(email, resetToken);
    } catch (error) {
      // Clear token if email fails
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: null,
          passwordResetExpires: null,
        },
      });
      throw error;
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Validate password
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestError('Password must be at least 8 characters');
    }

    // Hash the token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid token
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestError('Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
        refreshToken: null, // Invalidate existing sessions
      },
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }
}

export const authService = new AuthService();
