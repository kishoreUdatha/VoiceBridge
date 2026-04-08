/**
 * Role Management Service
 * Handles CRUD operations for roles and permissions
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { ConflictError, NotFoundError, BadRequestError } from '../utils/errors';

const prisma = new PrismaClient();

// Default permissions for each role type
const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  admin: ['*'],
  manager: ['leads:*', 'users:read', 'campaigns:*', 'reports:*', 'forms:read', 'analytics:read'],
  team_lead: ['leads:*', 'users:read', 'reports:read', 'analytics:read'],
  counselor: ['leads:read', 'leads:update', 'campaigns:read', 'forms:read'],
  telecaller: ['leads:read', 'leads:update'],
  field_sales: ['leads:*', 'visits:*', 'expenses:*'],
};

interface CreateRoleInput {
  organizationId: string;
  name: string;
  slug: string;
  description?: string;
  permissions?: string[];
}

interface UpdateRoleInput {
  name?: string;
  description?: string;
  permissions?: string[];
}

export const roleService = {
  // Get all roles for an organization
  async getRoles(organizationId: string) {
    const roles = await prisma.role.findMany({
      where: { organizationId },
      include: {
        _count: {
          select: { users: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return roles.map((role) => ({
      ...role,
      userCount: role._count.users,
      _count: undefined,
    }));
  },

  // Get a single role by ID
  async getRole(id: string, organizationId: string) {
    const role = await prisma.role.findFirst({
      where: { id, organizationId },
      include: {
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            isActive: true,
          },
          take: 10,
        },
        _count: {
          select: { users: true },
        },
      },
    });

    if (!role) {
      throw new NotFoundError('Role not found');
    }

    return {
      ...role,
      userCount: role._count.users,
      _count: undefined,
    };
  },

  // Create a new role
  async createRole(input: CreateRoleInput) {
    // Check if slug already exists in organization
    const existingRole = await prisma.role.findFirst({
      where: {
        organizationId: input.organizationId,
        slug: input.slug,
      },
    });

    if (existingRole) {
      throw new ConflictError(`A role with slug "${input.slug}" already exists`);
    }

    // Generate slug from name if not provided
    const slug = input.slug || input.name.toLowerCase().replace(/\s+/g, '_');

    // Use default permissions if not provided
    const permissions = input.permissions || DEFAULT_PERMISSIONS[slug] || [];

    const role = await prisma.role.create({
      data: {
        organizationId: input.organizationId,
        name: input.name,
        slug,
        description: input.description,
        permissions: permissions as Prisma.JsonArray,
        isSystem: false,
      },
    });

    return role;
  },

  // Update an existing role
  async updateRole(id: string, organizationId: string, input: UpdateRoleInput) {
    const role = await prisma.role.findFirst({
      where: { id, organizationId },
    });

    if (!role) {
      throw new NotFoundError('Role not found');
    }

    // Prevent modifying system roles' core properties
    if (role.isSystem && input.permissions) {
      throw new BadRequestError('Cannot modify permissions of system roles');
    }

    const updatedRole = await prisma.role.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        permissions: input.permissions as Prisma.JsonArray | undefined,
      },
    });

    return updatedRole;
  },

  // Delete a role
  async deleteRole(id: string, organizationId: string) {
    const role = await prisma.role.findFirst({
      where: { id, organizationId },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!role) {
      throw new NotFoundError('Role not found');
    }

    if (role.isSystem) {
      throw new BadRequestError('Cannot delete system roles');
    }

    if (role._count.users > 0) {
      throw new BadRequestError(
        `Cannot delete role "${role.name}" because it has ${role._count.users} user(s) assigned. Please reassign users first.`
      );
    }

    await prisma.role.delete({
      where: { id },
    });

    return { success: true, message: 'Role deleted successfully' };
  },

  // Clone a role
  async cloneRole(id: string, organizationId: string, newName: string) {
    const sourceRole = await prisma.role.findFirst({
      where: { id, organizationId },
    });

    if (!sourceRole) {
      throw new NotFoundError('Source role not found');
    }

    const newSlug = newName.toLowerCase().replace(/\s+/g, '_');

    // Check if new slug exists
    const existingRole = await prisma.role.findFirst({
      where: { organizationId, slug: newSlug },
    });

    if (existingRole) {
      throw new ConflictError(`A role with slug "${newSlug}" already exists`);
    }

    const clonedRole = await prisma.role.create({
      data: {
        organizationId,
        name: newName,
        slug: newSlug,
        description: `Cloned from ${sourceRole.name}`,
        permissions: sourceRole.permissions as Prisma.JsonArray,
        isSystem: false,
      },
    });

    // Also clone field permissions if they exist
    const fieldPermissions = await prisma.fieldPermission.findMany({
      where: { roleId: id, organizationId },
    });

    if (fieldPermissions.length > 0) {
      await prisma.fieldPermission.createMany({
        data: fieldPermissions.map((fp) => ({
          organizationId,
          roleId: clonedRole.id,
          entity: fp.entity,
          fieldName: fp.fieldName,
          canView: fp.canView,
          canEdit: fp.canEdit,
        })),
      });
    }

    return clonedRole;
  },

  // Get users with a specific role
  async getRoleUsers(id: string, organizationId: string, page = 1, limit = 20) {
    const role = await prisma.role.findFirst({
      where: { id, organizationId },
    });

    if (!role) {
      throw new NotFoundError('Role not found');
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: { roleId: id, organizationId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          isActive: true,
          createdAt: true,
          branch: {
            select: { id: true, name: true },
          },
          manager: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({
        where: { roleId: id, organizationId },
      }),
    ]);

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  // Update role permissions
  async updatePermissions(id: string, organizationId: string, permissions: string[]) {
    const role = await prisma.role.findFirst({
      where: { id, organizationId },
    });

    if (!role) {
      throw new NotFoundError('Role not found');
    }

    if (role.isSystem) {
      throw new BadRequestError('Cannot modify permissions of system roles');
    }

    const updatedRole = await prisma.role.update({
      where: { id },
      data: {
        permissions: permissions as Prisma.JsonArray,
      },
    });

    return updatedRole;
  },

  // Get available permission categories
  getPermissionCategories() {
    return [
      {
        category: 'Leads',
        permissions: [
          { key: 'leads:read', label: 'View Leads', description: 'Can view lead details' },
          { key: 'leads:create', label: 'Create Leads', description: 'Can create new leads' },
          { key: 'leads:update', label: 'Edit Leads', description: 'Can edit lead information' },
          { key: 'leads:delete', label: 'Delete Leads', description: 'Can delete leads' },
          { key: 'leads:*', label: 'Full Access', description: 'Full access to leads' },
        ],
      },
      {
        category: 'Users',
        permissions: [
          { key: 'users:read', label: 'View Users', description: 'Can view user details' },
          { key: 'users:create', label: 'Create Users', description: 'Can create new users' },
          { key: 'users:update', label: 'Edit Users', description: 'Can edit user information' },
          { key: 'users:delete', label: 'Delete Users', description: 'Can delete users' },
          { key: 'users:*', label: 'Full Access', description: 'Full access to users' },
        ],
      },
      {
        category: 'Campaigns',
        permissions: [
          { key: 'campaigns:read', label: 'View Campaigns', description: 'Can view campaigns' },
          { key: 'campaigns:create', label: 'Create Campaigns', description: 'Can create campaigns' },
          { key: 'campaigns:update', label: 'Edit Campaigns', description: 'Can edit campaigns' },
          { key: 'campaigns:delete', label: 'Delete Campaigns', description: 'Can delete campaigns' },
          { key: 'campaigns:*', label: 'Full Access', description: 'Full access to campaigns' },
        ],
      },
      {
        category: 'Reports & Analytics',
        permissions: [
          { key: 'reports:read', label: 'View Reports', description: 'Can view reports' },
          { key: 'reports:create', label: 'Create Reports', description: 'Can create custom reports' },
          { key: 'analytics:read', label: 'View Analytics', description: 'Can view analytics dashboards' },
        ],
      },
      {
        category: 'Voice AI',
        permissions: [
          { key: 'agents:read', label: 'View AI Agents', description: 'Can view AI agents' },
          { key: 'agents:create', label: 'Create AI Agents', description: 'Can create AI agents' },
          { key: 'agents:call', label: 'Make AI Calls', description: 'Can initiate AI calls' },
          { key: 'agents:*', label: 'Full Access', description: 'Full access to AI agents' },
        ],
      },
      {
        category: 'Settings',
        permissions: [
          { key: 'settings:read', label: 'View Settings', description: 'Can view settings' },
          { key: 'settings:update', label: 'Edit Settings', description: 'Can modify settings' },
          { key: 'settings:*', label: 'Full Access', description: 'Full access to settings' },
        ],
      },
    ];
  },
};
