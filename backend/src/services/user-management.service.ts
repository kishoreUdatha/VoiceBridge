import { prisma } from '../config/database';
import { NotFoundError } from '../utils/errors';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';

interface BulkUpdateInput {
  userIds: string[];
  roleId?: string;
  managerId?: string | null;
  isActive?: boolean;
}

interface ImportUserInput {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roleSlug: string;
  managerEmail?: string;
  password?: string;
}

interface UserAnalytics {
  userId: string;
  totalCalls: number;
  successfulCalls: number;
  averageCallDuration: number;
  leadsAssigned: number;
  leadsConverted: number;
  conversionRate: number;
  lastActiveAt: Date | null;
  loginCount: number;
  activeSessions: number;
}

export class UserManagementService {
  // ================== LOGIN HISTORY ==================

  async recordLogin(
    userId: string,
    organizationId: string,
    data: {
      ipAddress?: string;
      userAgent?: string;
      status: 'success' | 'failed' | 'blocked';
      failReason?: string;
    }
  ) {
    const { device, browser, os } = this.parseUserAgent(data.userAgent || '');

    const loginHistory = await prisma.loginHistory.create({
      data: {
        userId,
        organizationId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        device,
        browser,
        os,
        status: data.status,
        failReason: data.failReason,
      },
    });

    // Update lastLoginAt on successful login
    if (data.status === 'success') {
      await prisma.user.update({
        where: { id: userId },
        data: { lastLoginAt: new Date() },
      });
    }

    return loginHistory;
  }

  async getLoginHistory(
    organizationId: string,
    userId?: string,
    page = 1,
    limit = 20
  ) {
    const where: Prisma.LoginHistoryWhereInput = { organizationId };
    if (userId) where.userId = userId;

    const [history, total] = await Promise.all([
      prisma.loginHistory.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.loginHistory.count({ where }),
    ]);

    return { history, total };
  }

  // ================== SESSION MANAGEMENT ==================

  async createSession(
    userId: string,
    organizationId: string,
    token: string,
    data: {
      ipAddress?: string;
      userAgent?: string;
      expiresAt: Date;
    }
  ) {
    const { device, browser, os } = this.parseUserAgent(data.userAgent || '');

    return prisma.userSession.create({
      data: {
        userId,
        organizationId,
        token,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        device,
        browser,
        os,
        expiresAt: data.expiresAt,
      },
    });
  }

  async getActiveSessions(organizationId: string, userId: string) {
    return prisma.userSession.findMany({
      where: {
        organizationId,
        userId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActivityAt: 'desc' },
    });
  }

  async getAllActiveSessions(organizationId: string) {
    return prisma.userSession.findMany({
      where: {
        organizationId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: { lastActivityAt: 'desc' },
    });
  }

  async revokeSession(sessionId: string, organizationId: string) {
    const session = await prisma.userSession.findFirst({
      where: { id: sessionId, organizationId },
    });

    if (!session) {
      throw new NotFoundError('Session not found');
    }

    return prisma.userSession.update({
      where: { id: sessionId },
      data: { isActive: false },
    });
  }

  async revokeAllUserSessions(userId: string, organizationId: string, exceptToken?: string) {
    const where: Prisma.UserSessionWhereInput = {
      userId,
      organizationId,
      isActive: true,
    };

    if (exceptToken) {
      where.token = { not: exceptToken };
    }

    return prisma.userSession.updateMany({
      where,
      data: { isActive: false },
    });
  }

  // ================== BULK OPERATIONS ==================

  async bulkUpdateUsers(organizationId: string, input: BulkUpdateInput) {
    const updateData: Prisma.UserUpdateManyMutationInput = {};

    if (input.roleId !== undefined) {
      updateData.roleId = input.roleId;
    }
    if (input.managerId !== undefined) {
      updateData.managerId = input.managerId;
    }
    if (input.isActive !== undefined) {
      updateData.isActive = input.isActive;
    }

    const result = await prisma.user.updateMany({
      where: {
        id: { in: input.userIds },
        organizationId,
      },
      data: updateData,
    });

    return { updated: result.count };
  }

  async bulkDeleteUsers(organizationId: string, userIds: string[]) {
    const result = await prisma.user.deleteMany({
      where: {
        id: { in: userIds },
        organizationId,
      },
    });

    return { deleted: result.count };
  }

  // ================== CSV IMPORT ==================

  async importUsersFromCSV(organizationId: string, users: ImportUserInput[]) {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as { row: number; email: string; error: string }[],
    };

    // Get all roles for the organization
    const roles = await prisma.role.findMany({
      where: { organizationId },
    });

    // Get all managers for mapping
    const managers = await prisma.user.findMany({
      where: {
        organizationId,
        role: { slug: 'manager' },
        isActive: true,
      },
      select: { id: true, email: true },
    });

    const managerMap = new Map(managers.map(m => [m.email.toLowerCase(), m.id]));

    for (let i = 0; i < users.length; i++) {
      const userData = users[i];
      try {
        // Find role by slug
        const role = roles.find(r => r.slug === userData.roleSlug);
        if (!role) {
          throw new Error(`Role '${userData.roleSlug}' not found`);
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
          where: {
            organizationId_email: {
              organizationId,
              email: userData.email.toLowerCase(),
            },
          },
        });

        if (existingUser) {
          throw new Error('User with this email already exists');
        }

        // Find manager if specified
        let managerId: string | undefined;
        if (userData.managerEmail) {
          managerId = managerMap.get(userData.managerEmail.toLowerCase());
          if (!managerId) {
            throw new Error(`Manager with email '${userData.managerEmail}' not found`);
          }
        }

        // Generate password if not provided
        const password = userData.password || this.generateRandomPassword();
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        await prisma.user.create({
          data: {
            organizationId,
            email: userData.email.toLowerCase(),
            password: hashedPassword,
            firstName: userData.firstName,
            lastName: userData.lastName,
            phone: userData.phone,
            roleId: role.id,
            managerId,
          },
        });

        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          row: i + 1,
          email: userData.email,
          error: error.message,
        });
      }
    }

    return results;
  }

  // ================== USER ANALYTICS ==================

  async getUserAnalytics(organizationId: string, userId: string): Promise<UserAnalytics> {
    const user = await prisma.user.findFirst({
      where: { id: userId, organizationId },
      include: {
        role: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Get call stats
    const callStats = await prisma.telecallerCall.aggregate({
      where: {
        organizationId,
        telecallerId: userId,
      },
      _count: { id: true },
      _avg: { duration: true },
    });

    // Get successful calls
    const successfulCalls = await prisma.telecallerCall.count({
      where: {
        organizationId,
        telecallerId: userId,
        outcome: { in: ['CONVERTED', 'INTERESTED', 'CALLBACK'] },
      },
    });

    // Get lead stats
    const leadsAssigned = await prisma.leadAssignment.count({
      where: { assignedToId: userId },
    });

    const leadsConverted = await prisma.telecallerCall.count({
      where: {
        organizationId,
        telecallerId: userId,
        outcome: 'CONVERTED',
      },
    });

    // Get login stats
    const loginCount = await prisma.loginHistory.count({
      where: {
        organizationId,
        userId,
        status: 'success',
      },
    });

    // Get active sessions
    const activeSessions = await prisma.userSession.count({
      where: {
        organizationId,
        userId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
    });

    const totalCalls = callStats._count.id;

    return {
      userId,
      totalCalls,
      successfulCalls,
      averageCallDuration: callStats._avg.duration || 0,
      leadsAssigned,
      leadsConverted,
      conversionRate: leadsAssigned > 0 ? (leadsConverted / leadsAssigned) * 100 : 0,
      lastActiveAt: user.lastLoginAt,
      loginCount,
      activeSessions,
    };
  }

  async getBulkUserAnalytics(organizationId: string, userIds: string[]) {
    const analytics: Record<string, UserAnalytics> = {};

    // Get all call stats in bulk
    const callStats = await prisma.telecallerCall.groupBy({
      by: ['telecallerId'],
      where: {
        organizationId,
        telecallerId: { in: userIds },
      },
      _count: { id: true },
      _avg: { duration: true },
    });

    // Get successful calls
    const successfulCalls = await prisma.telecallerCall.groupBy({
      by: ['telecallerId'],
      where: {
        organizationId,
        telecallerId: { in: userIds },
        outcome: { in: ['CONVERTED', 'INTERESTED', 'CALLBACK'] },
      },
      _count: { id: true },
    });

    // Get conversions
    const conversions = await prisma.telecallerCall.groupBy({
      by: ['telecallerId'],
      where: {
        organizationId,
        telecallerId: { in: userIds },
        outcome: 'CONVERTED',
      },
      _count: { id: true },
    });

    // Get lead assignments
    const leadAssignments = await prisma.leadAssignment.groupBy({
      by: ['assignedToId'],
      where: { assignedToId: { in: userIds } },
      _count: { id: true },
    });

    // Get login counts
    const loginCounts = await prisma.loginHistory.groupBy({
      by: ['userId'],
      where: {
        organizationId,
        userId: { in: userIds },
        status: 'success',
      },
      _count: { id: true },
    });

    // Get active session counts
    const sessionCounts = await prisma.userSession.groupBy({
      by: ['userId'],
      where: {
        organizationId,
        userId: { in: userIds },
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      _count: { id: true },
    });

    // Get user last login times
    const users = await prisma.user.findMany({
      where: { id: { in: userIds }, organizationId },
      select: { id: true, lastLoginAt: true },
    });

    // Initialize analytics for all users
    for (const userId of userIds) {
      analytics[userId] = {
        userId,
        totalCalls: 0,
        successfulCalls: 0,
        averageCallDuration: 0,
        leadsAssigned: 0,
        leadsConverted: 0,
        conversionRate: 0,
        lastActiveAt: null,
        loginCount: 0,
        activeSessions: 0,
      };
    }

    // Populate call stats
    for (const stat of callStats) {
      if (analytics[stat.telecallerId]) {
        analytics[stat.telecallerId].totalCalls = stat._count.id;
        analytics[stat.telecallerId].averageCallDuration = stat._avg.duration || 0;
      }
    }

    // Populate successful calls
    for (const stat of successfulCalls) {
      if (analytics[stat.telecallerId]) {
        analytics[stat.telecallerId].successfulCalls = stat._count.id;
      }
    }

    // Populate conversions
    for (const stat of conversions) {
      if (analytics[stat.telecallerId]) {
        analytics[stat.telecallerId].leadsConverted = stat._count.id;
      }
    }

    // Populate lead assignments
    for (const stat of leadAssignments) {
      if (analytics[stat.assignedToId]) {
        analytics[stat.assignedToId].leadsAssigned = stat._count.id;
        // Calculate conversion rate
        const leadsConverted = analytics[stat.assignedToId].leadsConverted;
        analytics[stat.assignedToId].conversionRate =
          stat._count.id > 0 ? (leadsConverted / stat._count.id) * 100 : 0;
      }
    }

    // Populate login counts
    for (const stat of loginCounts) {
      if (analytics[stat.userId]) {
        analytics[stat.userId].loginCount = stat._count.id;
      }
    }

    // Populate session counts
    for (const stat of sessionCounts) {
      if (analytics[stat.userId]) {
        analytics[stat.userId].activeSessions = stat._count.id;
      }
    }

    // Populate last active times
    for (const user of users) {
      if (analytics[user.id]) {
        analytics[user.id].lastActiveAt = user.lastLoginAt;
      }
    }

    return analytics;
  }

  // ================== 2FA MANAGEMENT ==================

  async toggle2FA(userId: string, organizationId: string, enabled: boolean) {
    const user = await prisma.user.findFirst({
      where: { id: userId, organizationId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: enabled,
        twoFactorSecret: enabled ? undefined : null,
      },
      select: {
        id: true,
        twoFactorEnabled: true,
      },
    });
  }

  // ================== HELPER METHODS ==================

  private parseUserAgent(userAgent: string) {
    let device = 'desktop';
    let browser = 'Unknown';
    let os = 'Unknown';

    // Detect device
    if (/Mobile|Android|iPhone|iPad/i.test(userAgent)) {
      device = /iPad/i.test(userAgent) ? 'tablet' : 'mobile';
    }

    // Detect browser
    if (/Chrome/i.test(userAgent) && !/Edge|Edg/i.test(userAgent)) {
      browser = 'Chrome';
    } else if (/Firefox/i.test(userAgent)) {
      browser = 'Firefox';
    } else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) {
      browser = 'Safari';
    } else if (/Edge|Edg/i.test(userAgent)) {
      browser = 'Edge';
    } else if (/MSIE|Trident/i.test(userAgent)) {
      browser = 'Internet Explorer';
    }

    // Detect OS
    if (/Windows/i.test(userAgent)) {
      os = 'Windows';
    } else if (/Mac OS/i.test(userAgent)) {
      os = 'macOS';
    } else if (/Linux/i.test(userAgent)) {
      os = 'Linux';
    } else if (/Android/i.test(userAgent)) {
      os = 'Android';
    } else if (/iOS|iPhone|iPad/i.test(userAgent)) {
      os = 'iOS';
    }

    return { device, browser, os };
  }

  private generateRandomPassword(length = 12) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}

export const userManagementService = new UserManagementService();
