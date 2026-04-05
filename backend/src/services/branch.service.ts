import { prisma } from '../config/database';
import { Prisma } from '@prisma/client';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors';

interface CreateBranchInput {
  organizationId: string;
  name: string;
  code: string;
  isHeadquarters?: boolean;
  address: string;
  city: string;
  state: string;
  country?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  branchManagerId?: string;
}

interface UpdateBranchInput {
  name?: string;
  code?: string;
  isHeadquarters?: boolean;
  isActive?: boolean;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  branchManagerId?: string | null;
}

interface BranchStats {
  totalUsers: number;
  totalLeads: number;
  totalCampaigns: number;
  totalColleges: number;
}

export class BranchService {
  /**
   * Create a new branch
   */
  async create(input: CreateBranchInput) {
    // Check if branch code already exists
    const existingBranch = await prisma.branch.findFirst({
      where: {
        organizationId: input.organizationId,
        code: input.code,
      },
    });

    if (existingBranch) {
      throw new BadRequestError(`Branch with code "${input.code}" already exists`);
    }

    // If setting as headquarters, unset any existing HQ
    if (input.isHeadquarters) {
      await prisma.branch.updateMany({
        where: {
          organizationId: input.organizationId,
          isHeadquarters: true,
        },
        data: { isHeadquarters: false },
      });
    }

    // Validate branch manager if provided
    if (input.branchManagerId) {
      const manager = await prisma.user.findFirst({
        where: {
          id: input.branchManagerId,
          organizationId: input.organizationId,
          isActive: true,
        },
      });
      if (!manager) {
        throw new BadRequestError('Invalid branch manager');
      }
    }

    const branch = await prisma.branch.create({
      data: {
        organizationId: input.organizationId,
        name: input.name,
        code: input.code,
        isHeadquarters: input.isHeadquarters ?? false,
        address: input.address,
        city: input.city,
        state: input.state,
        country: input.country ?? 'India',
        pincode: input.pincode,
        latitude: input.latitude,
        longitude: input.longitude,
        phone: input.phone,
        email: input.email,
        branchManagerId: input.branchManagerId,
      },
      include: {
        branchManager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return branch;
  }

  /**
   * Find all branches for an organization
   */
  async findAll(organizationId: string, options?: { isActive?: boolean }) {
    const where: Prisma.BranchWhereInput = { organizationId };

    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    const branches = await prisma.branch.findMany({
      where,
      include: {
        branchManager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            users: true,
            leads: true,
            campaigns: true,
            colleges: true,
          },
        },
      },
      orderBy: [{ isHeadquarters: 'desc' }, { name: 'asc' }],
    });

    return branches;
  }

  /**
   * Find a branch by ID
   */
  async findById(id: string, organizationId: string) {
    const branch = await prisma.branch.findFirst({
      where: { id, organizationId },
      include: {
        branchManager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        _count: {
          select: {
            users: true,
            leads: true,
            campaigns: true,
            colleges: true,
          },
        },
      },
    });

    if (!branch) {
      throw new NotFoundError('Branch not found');
    }

    return branch;
  }

  /**
   * Update a branch
   */
  async update(id: string, organizationId: string, data: UpdateBranchInput) {
    // Verify branch exists
    const existingBranch = await prisma.branch.findFirst({
      where: { id, organizationId },
    });

    if (!existingBranch) {
      throw new NotFoundError('Branch not found');
    }

    // Check code uniqueness if changing
    if (data.code && data.code !== existingBranch.code) {
      const codeExists = await prisma.branch.findFirst({
        where: {
          organizationId,
          code: data.code,
          id: { not: id },
        },
      });
      if (codeExists) {
        throw new BadRequestError(`Branch with code "${data.code}" already exists`);
      }
    }

    // If setting as headquarters, unset any existing HQ
    if (data.isHeadquarters && !existingBranch.isHeadquarters) {
      await prisma.branch.updateMany({
        where: {
          organizationId,
          isHeadquarters: true,
          id: { not: id },
        },
        data: { isHeadquarters: false },
      });
    }

    // Validate branch manager if provided
    if (data.branchManagerId) {
      const manager = await prisma.user.findFirst({
        where: {
          id: data.branchManagerId,
          organizationId,
          isActive: true,
        },
      });
      if (!manager) {
        throw new BadRequestError('Invalid branch manager');
      }
    }

    const branch = await prisma.branch.update({
      where: { id },
      data,
      include: {
        branchManager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return branch;
  }

  /**
   * Delete a branch (soft delete by setting isActive = false)
   */
  async delete(id: string, organizationId: string) {
    const branch = await prisma.branch.findFirst({
      where: { id, organizationId },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!branch) {
      throw new NotFoundError('Branch not found');
    }

    // Don't allow deleting headquarters
    if (branch.isHeadquarters) {
      throw new BadRequestError('Cannot delete headquarters branch');
    }

    // Check if branch has users
    if (branch._count.users > 0) {
      throw new BadRequestError(
        `Cannot delete branch with ${branch._count.users} assigned users. Reassign them first.`
      );
    }

    // Soft delete
    await prisma.branch.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Assign a manager to a branch
   */
  async assignManager(branchId: string, userId: string, organizationId: string) {
    // Verify branch exists
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, organizationId },
    });

    if (!branch) {
      throw new NotFoundError('Branch not found');
    }

    // Verify user exists and is in the same org
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        organizationId,
        isActive: true,
      },
    });

    if (!user) {
      throw new BadRequestError('User not found or inactive');
    }

    const updatedBranch = await prisma.branch.update({
      where: { id: branchId },
      data: { branchManagerId: userId },
      include: {
        branchManager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return updatedBranch;
  }

  /**
   * Assign users to a branch
   */
  async assignUsers(branchId: string, userIds: string[], organizationId: string) {
    // Verify branch exists
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, organizationId, isActive: true },
    });

    if (!branch) {
      throw new NotFoundError('Branch not found');
    }

    // Verify all users exist and are in the same org
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
        organizationId,
      },
    });

    if (users.length !== userIds.length) {
      throw new BadRequestError('Some users not found or not in organization');
    }

    // Update users' branch
    await prisma.user.updateMany({
      where: {
        id: { in: userIds },
        organizationId,
      },
      data: { branchId },
    });

    return { assigned: userIds.length };
  }

  /**
   * Remove users from a branch
   */
  async removeUsers(branchId: string, userIds: string[], organizationId: string) {
    // Verify branch exists
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, organizationId },
    });

    if (!branch) {
      throw new NotFoundError('Branch not found');
    }

    // Update users' branch to null
    await prisma.user.updateMany({
      where: {
        id: { in: userIds },
        organizationId,
        branchId,
      },
      data: { branchId: null },
    });

    return { removed: userIds.length };
  }

  /**
   * Get users for a branch
   */
  async getBranchUsers(branchId: string, organizationId: string) {
    // Verify branch exists
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, organizationId },
    });

    if (!branch) {
      throw new NotFoundError('Branch not found');
    }

    const users = await prisma.user.findMany({
      where: {
        branchId,
        organizationId,
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: {
          select: {
            name: true,
            slug: true,
          },
        },
        createdAt: true,
      },
      orderBy: { firstName: 'asc' },
    });

    return users;
  }

  /**
   * Get branch statistics
   */
  async getBranchStats(branchId: string, organizationId: string): Promise<BranchStats> {
    // Verify branch exists
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, organizationId },
    });

    if (!branch) {
      throw new NotFoundError('Branch not found');
    }

    const [totalUsers, totalLeads, totalCampaigns, totalColleges] = await Promise.all([
      prisma.user.count({
        where: { branchId, organizationId, isActive: true },
      }),
      prisma.lead.count({
        where: { orgBranchId: branchId, organizationId },
      }),
      prisma.campaign.count({
        where: { orgBranchId: branchId, organizationId },
      }),
      prisma.college.count({
        where: { orgBranchId: branchId, organizationId },
      }),
    ]);

    return {
      totalUsers,
      totalLeads,
      totalCampaigns,
      totalColleges,
    };
  }

  /**
   * Get headquarters branch for an organization
   */
  async getHeadquarters(organizationId: string) {
    const hq = await prisma.branch.findFirst({
      where: {
        organizationId,
        isHeadquarters: true,
        isActive: true,
      },
    });

    return hq;
  }
}

export const branchService = new BranchService();
