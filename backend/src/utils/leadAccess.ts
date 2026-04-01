/**
 * Lead Access Utility
 *
 * Reusable functions for role-based lead access control.
 *
 * Access Control Rules:
 * - Admin/Manager: Can access any lead in their organization
 * - Counselor/Telecaller: Can only access leads actively assigned to them
 */

import { prisma } from '../config/database';
import { Prisma } from '@prisma/client';
import { TenantRequest } from '../middlewares/tenant';

// Roles that have full organization access (can see all leads)
const ADMIN_ROLES = ['admin'];

// Roles that have team-based access (can see their team members' leads)
const MANAGER_ROLES = ['manager'];

/**
 * Context needed for lead access checks
 */
export interface LeadAccessContext {
  userId: string;
  organizationId: string;
  role: string;
  managerId?: string | null;
}

/**
 * Extract lead access context from a request
 */
export function getLeadAccessContext(req: TenantRequest): LeadAccessContext {
  return {
    userId: req.user!.id,
    organizationId: req.organizationId!,
    role: req.user!.role,
    managerId: req.user!.managerId,
  };
}

/**
 * Check if the user's role has full admin access
 */
export function hasAdminAccess(role: string): boolean {
  return ADMIN_ROLES.includes(role);
}

/**
 * Check if the user's role has manager-level access (team-based)
 */
export function hasManagerAccess(role: string): boolean {
  return MANAGER_ROLES.includes(role);
}

/**
 * Check if the user's role has elevated access (admin or manager)
 * @deprecated Use hasAdminAccess or hasManagerAccess for more specific checks
 */
export function hasElevatedAccess(role: string): boolean {
  return hasAdminAccess(role) || hasManagerAccess(role);
}

/**
 * Get IDs of all team members assigned to a manager
 */
export async function getTeamMemberIds(managerId: string, organizationId: string): Promise<string[]> {
  const teamMembers = await prisma.user.findMany({
    where: {
      managerId,
      organizationId,
      isActive: true,
    },
    select: { id: true },
  });
  return teamMembers.map(member => member.id);
}

/**
 * Check if a user can access a specific lead
 *
 * @param leadId - The lead ID to check access for
 * @param context - The user's access context (userId, organizationId, role)
 * @returns true if user can access the lead, false otherwise
 */
export async function canAccessLead(
  leadId: string,
  context: LeadAccessContext
): Promise<boolean> {
  const { userId, organizationId, role } = context;

  // First, verify the lead belongs to the organization
  const lead = await prisma.lead.findFirst({
    where: {
      id: leadId,
      organizationId,
    },
    select: { id: true },
  });

  if (!lead) {
    return false;
  }

  // Admin roles can access any lead in their organization
  if (hasAdminAccess(role)) {
    return true;
  }

  // Manager roles can access leads assigned to themselves or their team members
  if (hasManagerAccess(role)) {
    const teamMemberIds = await getTeamMemberIds(userId, organizationId);
    const allowedUserIds = [userId, ...teamMemberIds];

    const assignment = await prisma.leadAssignment.findFirst({
      where: {
        leadId,
        assignedToId: { in: allowedUserIds },
        isActive: true,
      },
      select: { id: true },
    });

    return assignment !== null;
  }

  // Other roles can only access leads actively assigned to them
  const assignment = await prisma.leadAssignment.findFirst({
    where: {
      leadId,
      assignedToId: userId,
      isActive: true,
    },
    select: { id: true },
  });

  return assignment !== null;
}

/**
 * Build a Prisma where clause for filtering leads based on user access
 *
 * @param context - The user's access context
 * @param teamMemberIds - Optional pre-fetched team member IDs for managers
 * @returns Prisma where clause to filter leads
 */
export function buildLeadAccessFilter(
  context: LeadAccessContext,
  teamMemberIds?: string[]
): Prisma.LeadWhereInput {
  const { userId, organizationId, role } = context;

  // Base filter: always filter by organization
  const baseFilter: Prisma.LeadWhereInput = {
    organizationId,
  };

  // Admin roles see all leads in organization
  if (hasAdminAccess(role)) {
    return baseFilter;
  }

  // Manager roles see leads assigned to themselves or their team members
  if (hasManagerAccess(role) && teamMemberIds) {
    const allowedUserIds = [userId, ...teamMemberIds];
    return {
      ...baseFilter,
      assignments: {
        some: {
          assignedToId: { in: allowedUserIds },
          isActive: true,
        },
      },
    };
  }

  // Other roles only see leads assigned to them
  return {
    ...baseFilter,
    assignments: {
      some: {
        assignedToId: userId,
        isActive: true,
      },
    },
  };
}

/**
 * Build a Prisma where clause for filtering follow-ups based on user access
 * This is useful for the pending-follow-ups endpoint
 *
 * @param context - The user's access context
 * @param teamMemberIds - Optional pre-fetched team member IDs for managers
 * @returns Prisma where clause to filter follow-ups by lead access
 */
export function buildFollowUpAccessFilter(
  context: LeadAccessContext,
  teamMemberIds?: string[]
): Prisma.FollowUpWhereInput {
  const { userId, organizationId, role } = context;

  // Base filter: always filter by organization through lead
  const baseFilter: Prisma.FollowUpWhereInput = {
    lead: {
      organizationId,
    },
  };

  // Admin roles see all follow-ups in organization
  if (hasAdminAccess(role)) {
    return baseFilter;
  }

  // Manager roles see follow-ups for leads assigned to themselves or their team
  if (hasManagerAccess(role) && teamMemberIds) {
    const allowedUserIds = [userId, ...teamMemberIds];
    return {
      lead: {
        organizationId,
        assignments: {
          some: {
            assignedToId: { in: allowedUserIds },
            isActive: true,
          },
        },
      },
    };
  }

  // Other roles only see follow-ups for leads assigned to them
  return {
    lead: {
      organizationId,
      assignments: {
        some: {
          assignedToId: userId,
          isActive: true,
        },
      },
    },
  };
}
