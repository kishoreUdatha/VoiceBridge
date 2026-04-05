/**
 * Lead Access Utility
 *
 * Reusable functions for role-based lead access control.
 *
 * Access Control Rules:
 * - Admin: Can access any lead in their organization (all branches)
 * - Manager: Can access leads in their branch assigned to themselves or team
 * - Counselor/Telecaller: Can only access leads in their branch assigned to them
 */

import { prisma } from '../config/database';
import { Prisma } from '@prisma/client';
import { TenantRequest } from '../middlewares/tenant';

// Roles that have full organization access (can see all branches)
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
  branchId?: string | null; // User's assigned branch
  selectedBranchId?: string | null; // Admin's selected branch filter (from header)
}

/**
 * Extract lead access context from a request
 */
export function getLeadAccessContext(req: TenantRequest): LeadAccessContext {
  // Check for admin's selected branch filter from header
  const selectedBranchId = req.headers['x-branch-id'] as string | undefined;

  return {
    userId: req.user!.id,
    organizationId: req.organizationId!,
    role: req.user!.role,
    managerId: req.user!.managerId,
    branchId: req.user!.branchId,
    selectedBranchId: selectedBranchId || null,
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
  const { userId, organizationId, role, branchId, selectedBranchId } = context;

  // Base filter: always filter by organization
  const baseFilter: Prisma.LeadWhereInput = {
    organizationId,
  };

  // Admin roles see all leads in organization (optionally filtered by selected branch)
  if (hasAdminAccess(role)) {
    // If admin has selected a branch filter, apply it
    if (selectedBranchId) {
      return {
        ...baseFilter,
        orgBranchId: selectedBranchId,
      };
    }
    return baseFilter;
  }

  // For non-admin roles, add branch filter if user has a branch assigned
  const branchFilter: Prisma.LeadWhereInput = branchId
    ? { ...baseFilter, orgBranchId: branchId }
    : baseFilter;

  // Manager roles see leads assigned to themselves or their team members
  if (hasManagerAccess(role) && teamMemberIds) {
    const allowedUserIds = [userId, ...teamMemberIds];
    return {
      ...branchFilter,
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
    ...branchFilter,
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
  const { userId, organizationId, role, branchId, selectedBranchId } = context;

  // Base filter: always filter by organization through lead
  const baseLeadFilter: Prisma.LeadWhereInput = {
    organizationId,
  };

  // Admin roles see all follow-ups in organization (optionally filtered by selected branch)
  if (hasAdminAccess(role)) {
    if (selectedBranchId) {
      return {
        lead: {
          ...baseLeadFilter,
          orgBranchId: selectedBranchId,
        },
      };
    }
    return { lead: baseLeadFilter };
  }

  // For non-admin roles, add branch filter if user has a branch assigned
  const branchLeadFilter: Prisma.LeadWhereInput = branchId
    ? { ...baseLeadFilter, orgBranchId: branchId }
    : baseLeadFilter;

  // Manager roles see follow-ups for leads assigned to themselves or their team
  if (hasManagerAccess(role) && teamMemberIds) {
    const allowedUserIds = [userId, ...teamMemberIds];
    return {
      lead: {
        ...branchLeadFilter,
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
      ...branchLeadFilter,
      assignments: {
        some: {
          assignedToId: userId,
          isActive: true,
        },
      },
    },
  };
}
