import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { NotFoundError, ConflictError } from '../utils/errors';
import { Prisma } from '@prisma/client';

interface CreateUserInput {
  organizationId: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roleId: string;
  managerId?: string | null;
  branchId?: string | null;
}

interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  roleId?: string;
  isActive?: boolean;
  managerId?: string | null;
  branchId?: string | null;
}

interface UserFilter {
  organizationId: string;
  roleSlug?: string;
  isActive?: boolean;
  search?: string;
  // For role-based filtering
  currentUserId?: string;
  currentUserRole?: string;
  currentUserBranchId?: string | null;
}

export class UserService {
  async create(input: CreateUserInput) {
    // Check if email exists in the organization
    const existingUser = await prisma.user.findUnique({
      where: {
        organizationId_email: {
          organizationId: input.organizationId,
          email: input.email,
        },
      },
    });

    if (existingUser) {
      throw new ConflictError('A user with this email already exists in this organization');
    }

    const hashedPassword = await bcrypt.hash(input.password, 12);

    // Sanitize empty strings to null for foreign key fields
    const managerId = input.managerId === '' ? null : input.managerId;
    const branchId = input.branchId === '' ? null : input.branchId;

    const user = await prisma.user.create({
      data: {
        organizationId: input.organizationId,
        email: input.email,
        password: hashedPassword,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        roleId: input.roleId,
        managerId,
        branchId,
      },
      include: {
        role: true,
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    const { password: _, refreshToken: __, ...userWithoutSensitive } = user;
    return userWithoutSensitive;
  }

  async findById(id: string, organizationId: string) {
    const user = await prisma.user.findFirst({
      where: { id, organizationId },
      include: {
        role: true,
        studentProfile: true,
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const { password: _, refreshToken: __, ...userWithoutSensitive } = user;
    return userWithoutSensitive;
  }

  async findAll(filter: UserFilter, page = 1, limit = 20) {
    const where: Prisma.UserWhereInput = {
      organizationId: filter.organizationId,
    };

    // Role-based data isolation
    const normalizedRole = filter.currentUserRole?.toLowerCase().replace(/[_-]/g, '');

    if (normalizedRole === 'manager' && filter.currentUserId) {
      // Manager: see only users in their branch OR their direct reports
      // First get team leads under this manager
      const teamLeads = await prisma.user.findMany({
        where: {
          organizationId: filter.organizationId,
          managerId: filter.currentUserId,
          role: { slug: { in: ['team_lead', 'team_leader'] } },
          isActive: true,
        },
        select: { id: true },
      });
      const teamLeadIds = teamLeads.map(tl => tl.id);

      // Manager can see: themselves, their direct reports, and reports of their team leads
      where.OR = [
        { id: filter.currentUserId }, // Themselves
        { managerId: filter.currentUserId }, // Direct reports
        ...(teamLeadIds.length > 0 ? [{ managerId: { in: teamLeadIds } }] : []), // Reports of their team leads
      ];
    } else if ((normalizedRole === 'teamlead' || normalizedRole === 'teamleader') && filter.currentUserId) {
      // Team Lead: see only themselves and their direct reports
      where.OR = [
        { id: filter.currentUserId }, // Themselves
        { managerId: filter.currentUserId }, // Direct reports
      ];
    }
    // Admin/Super Admin: no additional filtering (see all users in organization)

    if (filter.roleSlug) {
      where.role = { slug: filter.roleSlug };
    }

    if (filter.isActive !== undefined) {
      where.isActive = filter.isActive;
    }

    if (filter.search) {
      // If we already have an OR clause for role-based filtering, wrap it in AND
      const searchCondition = {
        OR: [
          { firstName: { contains: filter.search, mode: 'insensitive' as const } },
          { lastName: { contains: filter.search, mode: 'insensitive' as const } },
          { email: { contains: filter.search, mode: 'insensitive' as const } },
        ],
      };

      if (where.OR) {
        where.AND = [{ OR: where.OR }, searchCondition];
        delete where.OR;
      } else {
        where.OR = searchCondition.OR;
      }
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          role: true,
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          branch: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    const usersWithoutSensitive = users.map((user) => {
      const { password: _, refreshToken: __, ...rest } = user;
      return rest;
    });

    return { users: usersWithoutSensitive, total };
  }

  async update(id: string, organizationId: string, input: UpdateUserInput) {
    const user = await prisma.user.findFirst({
      where: { id, organizationId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Sanitize empty strings to null for foreign key fields
    const sanitizedInput = {
      ...input,
      managerId: input.managerId === '' ? null : input.managerId,
      branchId: input.branchId === '' ? null : input.branchId,
    };

    const updatedUser = await prisma.user.update({
      where: { id },
      data: sanitizedInput,
      include: {
        role: true,
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    const { password: _, refreshToken: __, ...userWithoutSensitive } = updatedUser;
    return userWithoutSensitive;
  }

  async delete(id: string, organizationId: string) {
    const user = await prisma.user.findFirst({
      where: { id, organizationId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    await prisma.user.delete({ where: { id } });
  }

  async getCounselors(organizationId: string, userRole?: string, userId?: string) {
    const whereClause: any = {
      organizationId,
      role: { slug: 'counselor' },
      isActive: true,
    };

    // Role-based filtering
    const normalizedRole = userRole?.toLowerCase().replace('_', '');

    if ((normalizedRole === 'teamlead') && userId) {
      // Team Lead: only see their direct reports
      whereClause.managerId = userId;
    } else if (normalizedRole === 'manager' && userId) {
      // Manager: see counselors under their team leads + direct reports
      const teamLeads = await prisma.user.findMany({
        where: {
          organizationId,
          managerId: userId,
          role: { slug: 'team_lead' },
          isActive: true,
        },
        select: { id: true },
      });
      const teamLeadIds = teamLeads.map((tl) => tl.id);

      if (teamLeadIds.length > 0) {
        whereClause.managerId = { in: [...teamLeadIds, userId] };
      } else {
        whereClause.managerId = userId;
      }
    }
    // Admin sees all

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        _count: {
          select: {
            leadAssignments: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    return users.map((user) => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      activeLeadCount: user._count.leadAssignments,
    }));
  }

  async getTelecallers(organizationId: string, userRole?: string, userId?: string) {
    // Build query based on requester's role hierarchy
    const whereClause: any = {
      organizationId,
      role: { slug: { in: ['telecaller', 'counselor'] } },
      isActive: true,
    };

    const normalizedRole = userRole?.toLowerCase().replace('_', '');

    // Team Lead: only see their direct reports
    if ((normalizedRole === 'teamlead' || normalizedRole === 'team_lead') && userId) {
      whereClause.managerId = userId;
    }
    // Manager: see telecallers who report to team leads under them
    else if (normalizedRole === 'manager' && userId) {
      // First get all team leads who report to this manager
      const teamLeads = await prisma.user.findMany({
        where: {
          organizationId,
          managerId: userId,
          role: { slug: 'team_lead' },
          isActive: true,
        },
        select: { id: true },
      });

      const teamLeadIds = teamLeads.map((tl) => tl.id);

      // Include telecallers who report to these team leads OR directly to the manager
      if (teamLeadIds.length > 0) {
        whereClause.managerId = { in: [...teamLeadIds, userId] };
      } else {
        // Manager has no team leads, show only direct reports
        whereClause.managerId = userId;
      }
    }
    // Admin: sees all telecallers (no filter needed)

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        managerId: true,
        branchId: true,
        branch: {
          select: { id: true, name: true },
        },
        manager: {
          select: { firstName: true, lastName: true },
        },
        _count: {
          select: {
            rawImportsAssignedTo: {
              where: { status: { in: ['ASSIGNED', 'CALLING'] } },
            },
          },
        },
      },
    });

    return users.map((user) => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      branchId: user.branchId,
      branchName: user.branch?.name || null,
      managerName: user.manager ? `${user.manager.firstName} ${user.manager.lastName}` : null,
      activeRecordCount: user._count.rawImportsAssignedTo,
    }));
  }

  /**
   * Get users that the current user can assign leads to based on hierarchy
   * Admin: can assign to managers, team leads, telecallers
   * Manager: can assign to their team leads and telecallers
   * Team Lead: can assign to their telecallers only
   */
  async getAssignableUsers(organizationId: string, userRole: string, userId: string) {
    const normalizedRole = userRole?.toLowerCase().replace('_', '');
    let assignableUsers: any[] = [];

    if (normalizedRole === 'admin' || normalizedRole === 'super_admin' || normalizedRole === 'superadmin') {
      // Admin can assign to anyone except other admins
      assignableUsers = await prisma.user.findMany({
        where: {
          organizationId,
          isActive: true,
          role: { slug: { notIn: ['admin', 'super_admin'] } },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          managerId: true,
          branchId: true,
          role: { select: { name: true, slug: true } },
          branch: { select: { id: true, name: true } },
          manager: { select: { firstName: true, lastName: true } },
        },
      });
    } else if (normalizedRole === 'manager') {
      // Manager can assign to:
      // 1. Team leads who report directly to them
      // 2. Telecallers who report to them or to their team leads
      const teamLeads = await prisma.user.findMany({
        where: {
          organizationId,
          managerId: userId,
          isActive: true,
        },
        select: { id: true },
      });
      const teamLeadIds = teamLeads.map((tl) => tl.id);

      assignableUsers = await prisma.user.findMany({
        where: {
          organizationId,
          isActive: true,
          OR: [
            { managerId: userId }, // Direct reports (team leads or telecallers)
            { managerId: { in: teamLeadIds } }, // Telecallers under team leads
          ],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          managerId: true,
          branchId: true,
          role: { select: { name: true, slug: true } },
          branch: { select: { id: true, name: true } },
          manager: { select: { firstName: true, lastName: true } },
        },
      });
    } else if (normalizedRole === 'teamlead' || normalizedRole === 'team_lead') {
      // Team lead can only assign to their direct reports
      assignableUsers = await prisma.user.findMany({
        where: {
          organizationId,
          managerId: userId,
          isActive: true,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          managerId: true,
          branchId: true,
          role: { select: { name: true, slug: true } },
          branch: { select: { id: true, name: true } },
          manager: { select: { firstName: true, lastName: true } },
        },
      });
    }

    return assignableUsers.map((user) => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role?.name || user.role?.slug || 'Unknown',
      roleSlug: user.role?.slug || '',
      branchId: user.branchId,
      branchName: user.branch?.name || null,
      managerName: user.manager ? `${user.manager.firstName} ${user.manager.lastName}` : null,
    }));
  }

  async getRoles(organizationId: string) {
    // Return only organization-specific roles (no duplicates)
    return prisma.role.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
    });
  }

  async getManagers(organizationId: string) {
    const users = await prisma.user.findMany({
      where: {
        organizationId,
        // Include admin, org_admin, manager, and team_lead/team_leader as potential managers
        role: { slug: { in: ['admin', 'org_admin', 'manager', 'team_lead', 'team_leader'] } },
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        branchId: true,
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        role: {
          select: {
            slug: true,
            name: true,
          },
        },
        _count: {
          select: {
            teamMembers: {
              where: { isActive: true },
            },
          },
        },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });

    return users.map((user) => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      branchId: user.branchId,
      branchName: user.branch?.name || null,
      roleSlug: user.role?.slug || null,
      roleName: user.role?.name || null,
      teamMemberCount: user._count.teamMembers,
    }));
  }

  async resetPassword(id: string, organizationId: string, newPassword: string) {
    const user = await prisma.user.findFirst({
      where: { id, organizationId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });
  }

  async getBulkStats(organizationId: string, userIds: string[]) {
    const stats: Record<string, { totalCalls: number; leadsAssigned: number; conversions: number; lastActiveAt: string | null }> = {};

    // Get telecaller call stats
    const telecallerCallStats = await prisma.telecallerCall.groupBy({
      by: ['telecallerId'],
      where: {
        organizationId,
        telecallerId: { in: userIds },
      },
      _count: { id: true },
      _max: { createdAt: true },
    });

    // Get lead assignment stats
    const leadStats = await prisma.leadAssignment.groupBy({
      by: ['assignedToId'],
      where: {
        assignedToId: { in: userIds },
      },
      _count: { id: true },
    });

    // Get conversion stats (leads that converted)
    const conversionStats = await prisma.telecallerCall.groupBy({
      by: ['telecallerId'],
      where: {
        organizationId,
        telecallerId: { in: userIds },
        outcome: 'CONVERTED',
      },
      _count: { id: true },
    });

    // Initialize stats for all users
    for (const userId of userIds) {
      stats[userId] = {
        totalCalls: 0,
        leadsAssigned: 0,
        conversions: 0,
        lastActiveAt: null,
      };
    }

    // Populate call stats
    for (const stat of telecallerCallStats) {
      if (stats[stat.telecallerId]) {
        stats[stat.telecallerId].totalCalls = stat._count.id;
        stats[stat.telecallerId].lastActiveAt = stat._max.createdAt?.toISOString() || null;
      }
    }

    // Populate lead stats
    for (const stat of leadStats) {
      if (stats[stat.assignedToId]) {
        stats[stat.assignedToId].leadsAssigned = stat._count.id;
      }
    }

    // Populate conversion stats
    for (const stat of conversionStats) {
      if (stats[stat.telecallerId]) {
        stats[stat.telecallerId].conversions = stat._count.id;
      }
    }

    return stats;
  }
}

export const userService = new UserService();
