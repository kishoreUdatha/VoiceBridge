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

// Roles that have elevated access (can see all leads in organization)
const ELEVATED_ROLES = ['admin', 'manager'];

/**
 * Context needed for lead access checks
 */
export interface LeadAccessContext {
  userId: string;
  organizationId: string;
  role: string;
}

/**
 * Extract lead access context from a request
 */
export function getLeadAccessContext(req: TenantRequest): LeadAccessContext {
  return {
    userId: req.user!.id,
    organizationId: req.organizationId!,
    role: req.user!.role,
  };
}

/**
 * Check if the user's role has elevated access (admin/manager)
 */
export function hasElevatedAccess(role: string): boolean {
  return ELEVATED_ROLES.includes(role);
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

  // Elevated roles can access any lead in their organization
  if (hasElevatedAccess(role)) {
    return true;
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
 * @returns Prisma where clause to filter leads
 */
export function buildLeadAccessFilter(
  context: LeadAccessContext
): Prisma.LeadWhereInput {
  const { userId, organizationId, role } = context;

  // Base filter: always filter by organization
  const baseFilter: Prisma.LeadWhereInput = {
    organizationId,
  };

  // Elevated roles see all leads in organization
  if (hasElevatedAccess(role)) {
    return baseFilter;
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
 * @returns Prisma where clause to filter follow-ups by lead access
 */
export function buildFollowUpAccessFilter(
  context: LeadAccessContext
): Prisma.FollowUpWhereInput {
  const { userId, organizationId, role } = context;

  // Base filter: always filter by organization through lead
  const baseFilter: Prisma.FollowUpWhereInput = {
    lead: {
      organizationId,
    },
  };

  // Elevated roles see all follow-ups in organization
  if (hasElevatedAccess(role)) {
    return baseFilter;
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
