/**
 * Branch Access Utility
 *
 * Reusable functions for multi-branch data isolation.
 *
 * Access Control Rules:
 * - Admin: Can access ALL branches in their organization
 * - Other roles: Can only access data from their assigned branch
 */

import { Prisma } from '@prisma/client';
import { AuthenticatedRequest } from '../middlewares/auth';

// Roles that have full organization access (can see all branches)
const ADMIN_ROLES = ['admin'];

/**
 * Context needed for branch access checks
 */
export interface BranchAccessContext {
  userId: string;
  organizationId: string;
  role: string;
  branchId: string | null;
  canAccessAllBranches: boolean;
}

/**
 * Extract branch access context from a request
 */
export function getBranchAccessContext(req: AuthenticatedRequest): BranchAccessContext {
  const role = req.user!.role;
  const canAccessAllBranches = ADMIN_ROLES.includes(role);

  // Check for admin's selected branch filter from header
  const selectedBranchId = req.headers['x-branch-id'] as string | undefined;

  return {
    userId: req.user!.id,
    organizationId: req.user!.organizationId,
    role,
    branchId: canAccessAllBranches
      ? (selectedBranchId || null)  // Admin can filter by branch or see all
      : (req.user!.branchId || null), // Non-admin uses their assigned branch
    canAccessAllBranches,
  };
}

/**
 * Check if the user's role has admin access (can see all branches)
 */
export function hasAdminBranchAccess(role: string): boolean {
  return ADMIN_ROLES.includes(role);
}

/**
 * Build a Prisma where clause for filtering by branch
 * Returns {} for admin (no restriction unless they select a specific branch)
 * Returns { orgBranchId: branchId } for non-admin users
 */
export function buildBranchFilter(context: BranchAccessContext): Prisma.LeadWhereInput {
  // Admin with no branch selected - no restriction
  if (context.canAccessAllBranches && !context.branchId) {
    return {};
  }

  // Admin with branch selected OR non-admin user
  if (context.branchId) {
    return { orgBranchId: context.branchId };
  }

  // Non-admin with no branch assigned - should not happen normally
  // Return empty filter which will show nothing (safe default)
  return {};
}

/**
 * Build a combined organization + branch filter
 * Always includes organizationId, conditionally includes orgBranchId
 */
export function buildOrgBranchFilter(context: BranchAccessContext): Prisma.LeadWhereInput {
  const baseFilter: Prisma.LeadWhereInput = {
    organizationId: context.organizationId,
  };

  // Admin with no branch selected - org filter only
  if (context.canAccessAllBranches && !context.branchId) {
    return baseFilter;
  }

  // Admin with branch selected OR non-admin user
  if (context.branchId) {
    return {
      ...baseFilter,
      orgBranchId: context.branchId,
    };
  }

  // Non-admin with no branch assigned
  return baseFilter;
}

/**
 * Build filter for User model (uses branchId instead of orgBranchId)
 */
export function buildUserBranchFilter(context: BranchAccessContext): Prisma.UserWhereInput {
  const baseFilter: Prisma.UserWhereInput = {
    organizationId: context.organizationId,
  };

  // Admin with no branch selected - org filter only
  if (context.canAccessAllBranches && !context.branchId) {
    return baseFilter;
  }

  // Admin with branch selected OR non-admin user
  if (context.branchId) {
    return {
      ...baseFilter,
      branchId: context.branchId,
    };
  }

  return baseFilter;
}

/**
 * Build filter for Campaign model
 */
export function buildCampaignBranchFilter(context: BranchAccessContext): Prisma.CampaignWhereInput {
  const baseFilter: Prisma.CampaignWhereInput = {
    organizationId: context.organizationId,
  };

  if (context.canAccessAllBranches && !context.branchId) {
    return baseFilter;
  }

  if (context.branchId) {
    return {
      ...baseFilter,
      orgBranchId: context.branchId,
    };
  }

  return baseFilter;
}

/**
 * Build filter for College model
 */
export function buildCollegeBranchFilter(context: BranchAccessContext): Prisma.CollegeWhereInput {
  const baseFilter: Prisma.CollegeWhereInput = {
    organizationId: context.organizationId,
  };

  if (context.canAccessAllBranches && !context.branchId) {
    return baseFilter;
  }

  if (context.branchId) {
    return {
      ...baseFilter,
      orgBranchId: context.branchId,
    };
  }

  return baseFilter;
}

/**
 * Build filter for RawImportRecord model
 */
export function buildRawImportBranchFilter(context: BranchAccessContext): Prisma.RawImportRecordWhereInput {
  const baseFilter: Prisma.RawImportRecordWhereInput = {
    organizationId: context.organizationId,
  };

  if (context.canAccessAllBranches && !context.branchId) {
    return baseFilter;
  }

  if (context.branchId) {
    return {
      ...baseFilter,
      orgBranchId: context.branchId,
    };
  }

  return baseFilter;
}

/**
 * Validate that a user can access a specific branch
 */
export function canAccessBranch(context: BranchAccessContext, targetBranchId: string | null): boolean {
  // Admin can access all branches
  if (context.canAccessAllBranches) {
    return true;
  }

  // Non-admin can only access their own branch
  return context.branchId === targetBranchId;
}

/**
 * Get the branch ID to assign to new records
 * Uses user's branch for non-admin, or selected branch for admin
 */
export function getBranchIdForNewRecord(context: BranchAccessContext): string | null {
  // If admin has selected a branch, use that
  if (context.canAccessAllBranches && context.branchId) {
    return context.branchId;
  }

  // Non-admin uses their assigned branch
  if (!context.canAccessAllBranches) {
    return context.branchId;
  }

  // Admin with no branch selected - null (org-level record)
  return null;
}

/**
 * Build filter for AssignmentSchedule model
 * Returns schedules visible to the user based on their branch access:
 * - Admin: all schedules (can filter by branch via header)
 * - Non-admin: their branch's schedules + org-wide schedules
 */
export function buildAssignmentScheduleBranchFilter(context: BranchAccessContext): Prisma.AssignmentScheduleWhereInput {
  const baseFilter: Prisma.AssignmentScheduleWhereInput = {
    organizationId: context.organizationId,
  };

  // Admin with no branch selected - show all schedules
  if (context.canAccessAllBranches && !context.branchId) {
    return baseFilter;
  }

  // Admin with branch selected OR non-admin user
  // Show schedules for their branch + org-wide schedules
  if (context.branchId) {
    return {
      ...baseFilter,
      OR: [
        { orgBranchId: context.branchId },
        { orgBranchId: null }, // Org-wide schedules
      ],
    };
  }

  // Non-admin with no branch - show only org-wide schedules
  return {
    ...baseFilter,
    orgBranchId: null,
  };
}
