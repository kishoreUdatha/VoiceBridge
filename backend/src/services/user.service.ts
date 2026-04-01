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
}

interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  roleId?: string;
  isActive?: boolean;
  managerId?: string | null;
}

interface UserFilter {
  organizationId: string;
  roleSlug?: string;
  isActive?: boolean;
  search?: string;
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

    const user = await prisma.user.create({
      data: {
        organizationId: input.organizationId,
        email: input.email,
        password: hashedPassword,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        roleId: input.roleId,
        managerId: input.managerId,
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

    if (filter.roleSlug) {
      where.role = { slug: filter.roleSlug };
    }

    if (filter.isActive !== undefined) {
      where.isActive = filter.isActive;
    }

    if (filter.search) {
      where.OR = [
        { firstName: { contains: filter.search, mode: 'insensitive' } },
        { lastName: { contains: filter.search, mode: 'insensitive' } },
        { email: { contains: filter.search, mode: 'insensitive' } },
      ];
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

    const updatedUser = await prisma.user.update({
      where: { id },
      data: input,
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

  async getCounselors(organizationId: string) {
    const users = await prisma.user.findMany({
      where: {
        organizationId,
        role: { slug: 'counselor' },
        isActive: true,
      },
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

  async getTelecallers(organizationId: string) {
    const users = await prisma.user.findMany({
      where: {
        organizationId,
        role: { slug: 'telecaller' },
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
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
      activeRecordCount: user._count.rawImportsAssignedTo,
    }));
  }

  async getRoles(organizationId: string) {
    // Only return organization-specific roles to avoid duplicates with system roles
    return prisma.role.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
    });
  }

  async getManagers(organizationId: string) {
    const users = await prisma.user.findMany({
      where: {
        organizationId,
        role: { slug: 'manager' },
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
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
      teamMemberCount: user._count.teamMembers,
    }));
  }
}

export const userService = new UserService();
