/**
 * Unified Access Service
 *
 * Single source of truth for role-based access control across all APIs.
 * Consolidates logic from:
 * - backend/src/utils/leadAccess.ts
 * - backend/src/services/user.service.ts (getViewableTeamMemberIds)
 * - backend/src/services/lead.service.ts (role-based filtering)
 *
 * Role Hierarchy:
 * - Admin/Super Admin/Owner: Full organization access (all branches)
 * - Manager: Branch-level access + team hierarchy (team leads + their telecallers)
 * - Team Lead: Own leads + team members' leads + unassigned leads
 * - Telecaller/Counselor: Only own assigned leads
 */

import { prisma } from '../config/database';
import { Prisma } from '@prisma/client';

// Roles with full organization access (can see all branches)
const ADMIN_ROLES = ['admin', 'super_admin', 'superadmin', 'owner', 'org_admin'];

// Roles with team-based access
const MANAGER_ROLES = ['manager'];

// Roles with team lead access (team + unassigned)
const TEAM_LEAD_ROLES = ['team_lead', 'teamlead', 'team_leader'];

// Roles with individual access only
const INDIVIDUAL_ROLES = ['telecaller', 'counselor', 'counsellor', 'agent', 'sales_agent', 'salesagent', 'salesrep', 'sales', 'user'];

/**
 * Context for access control decisions
 */
export interface AccessContext {
  userId: string;
  organizationId: string;
  role: string;
  branchId?: string | null;
  managerId?: string | null;
  selectedBranchId?: string | null; // Admin's selected branch filter (from x-branch-id header)
}

/**
 * Result of viewable users query
 * null means "all users" (no filtering needed - for admins)
 * string[] means specific user IDs to filter by
 */
export type ViewableUserIds = string[] | null;

/**
 * Unified Access Service
 * Provides consistent access control across all services and APIs
 */
export class UnifiedAccessService {
  /**
   * Normalize role string for comparison
   */
  private normalizeRole(role: string): string {
    return role?.toLowerCase().replace(/[_-]/g, '') || '';
  }

  /**
   * Check if role has admin-level access (full organization)
   */
  hasAdminAccess(role: string): boolean {
    const normalized = this.normalizeRole(role);
    return ADMIN_ROLES.some(r => this.normalizeRole(r) === normalized);
  }

  /**
   * Check if role has manager-level access (team hierarchy)
   */
  hasManagerAccess(role: string): boolean {
    const normalized = this.normalizeRole(role);
    return MANAGER_ROLES.some(r => this.normalizeRole(r) === normalized);
  }

  /**
   * Check if role has team lead access (team + unassigned)
   */
  hasTeamLeadAccess(role: string): boolean {
    const normalized = this.normalizeRole(role);
    return TEAM_LEAD_ROLES.some(r => this.normalizeRole(r) === normalized);
  }

  /**
   * Check if role has individual-only access
   */
  hasIndividualAccess(role: string): boolean {
    const normalized = this.normalizeRole(role);
    // If it's not admin, manager, or team lead, treat as individual
    if (this.hasAdminAccess(role) || this.hasManagerAccess(role) || this.hasTeamLeadAccess(role)) {
      return false;
    }
    return true;
  }

  /**
   * Get team member IDs for a user
   * Returns direct reports (users where managerId = userId)
   */
  async getDirectReportIds(userId: string, organizationId: string): Promise<string[]> {
    const reports = await prisma.user.findMany({
      where: {
        managerId: userId,
        organizationId,
        isActive: true,
      },
      select: { id: true },
    });
    return reports.map(u => u.id);
  }

  /**
   * Get team leads under a manager
   */
  async getTeamLeadIds(managerId: string, organizationId: string): Promise<string[]> {
    const teamLeads = await prisma.user.findMany({
      where: {
        managerId,
        organizationId,
        isActive: true,
        role: {
          slug: { in: ['team_lead', 'team_leader'] },
        },
      },
      select: { id: true },
    });
    return teamLeads.map(u => u.id);
  }

  /**
   * Get all users in a manager's hierarchy (team leads + their telecallers + direct reports)
   */
  async getManagerHierarchyIds(managerId: string, organizationId: string): Promise<string[]> {
    // Get team leads under this manager
    const teamLeadIds = await this.getTeamLeadIds(managerId, organizationId);

    // Get users under those team leads + direct reports to manager
    const teamMembers = await prisma.user.findMany({
      where: {
        organizationId,
        isActive: true,
        OR: [
          { managerId }, // Direct reports
          { managerId: { in: teamLeadIds } }, // Reports to team leads
        ],
      },
      select: { id: true },
    });

    // Include manager themselves + team leads + all team members
    return [managerId, ...teamLeadIds, ...teamMembers.map(m => m.id)];
  }

  /**
   * Get IDs of users that the current user can view
   * Returns null for admins (view all), or array of specific user IDs
   *
   * This is the SINGLE SOURCE OF TRUTH for determining viewable users.
   */
  async getViewableUserIds(context: AccessContext): Promise<ViewableUserIds> {
    const { userId, organizationId, role } = context;

    // Admin/Owner can view all - return null to indicate no filtering needed
    if (this.hasAdminAccess(role)) {
      return null;
    }

    // Manager: view their team leads + telecallers under those team leads + direct reports
    if (this.hasManagerAccess(role)) {
      return this.getManagerHierarchyIds(userId, organizationId);
    }

    // Team Lead: view themselves + their direct reports
    if (this.hasTeamLeadAccess(role)) {
      const directReports = await this.getDirectReportIds(userId, organizationId);
      return [userId, ...directReports];
    }

    // Telecaller/Counselor/Individual: only view themselves
    return [userId];
  }

  /**
   * Build Prisma where clause for filtering leads based on user access
   * This is the SINGLE SOURCE OF TRUTH for lead filtering.
   */
  async getLeadFilter(context: AccessContext): Promise<Prisma.LeadWhereInput> {
    const { userId, organizationId, role, branchId, selectedBranchId } = context;

    // Base filter: always filter by organization
    const baseFilter: Prisma.LeadWhereInput = {
      organizationId,
    };

    // Admin: see all leads in organization
    if (this.hasAdminAccess(role)) {
      // If admin has selected a branch filter, apply it
      if (selectedBranchId) {
        return {
          ...baseFilter,
          orgBranchId: selectedBranchId,
        };
      }
      return baseFilter;
    }

    // For non-admin roles, optionally add branch filter if user has a branch
    const branchFilter: Prisma.LeadWhereInput = branchId
      ? { ...baseFilter, orgBranchId: branchId }
      : baseFilter;

    // Manager: see leads assigned to their hierarchy
    if (this.hasManagerAccess(role)) {
      const hierarchyIds = await this.getManagerHierarchyIds(userId, organizationId);
      return {
        ...branchFilter,
        assignments: {
          some: {
            assignedToId: { in: hierarchyIds },
            isActive: true,
          },
        },
      };
    }

    // Team Lead: see unassigned leads + leads assigned to themselves or team
    if (this.hasTeamLeadAccess(role)) {
      const directReports = await this.getDirectReportIds(userId, organizationId);
      const allowedUserIds = [userId, ...directReports];
      return {
        ...branchFilter,
        OR: [
          // Unassigned leads (no active assignment)
          { assignments: { none: { isActive: true } } },
          // Leads assigned to team lead or their team
          { assignments: { some: { assignedToId: { in: allowedUserIds }, isActive: true } } },
        ],
      };
    }

    // Telecaller/Counselor: only see leads assigned to them
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
   * Build Prisma where clause for filtering follow-ups based on user access
   */
  async getFollowUpFilter(context: AccessContext): Promise<Prisma.FollowUpWhereInput> {
    const leadFilter = await this.getLeadFilter(context);
    return {
      lead: leadFilter,
    };
  }

  /**
   * Build Prisma where clause for filtering calls/telecaller activities
   */
  async getCallFilter(context: AccessContext): Promise<Prisma.TelecallerCallWhereInput> {
    const { userId, organizationId, role } = context;

    // Base filter
    const baseFilter: Prisma.TelecallerCallWhereInput = {
      organizationId,
    };

    // Admin: see all calls
    if (this.hasAdminAccess(role)) {
      return baseFilter;
    }

    // Get viewable user IDs
    const viewableUserIds = await this.getViewableUserIds(context);

    // If viewableUserIds is null (shouldn't happen for non-admins), return base
    if (viewableUserIds === null) {
      return baseFilter;
    }

    // Filter by telecaller ID
    return {
      ...baseFilter,
      telecallerId: { in: viewableUserIds },
    };
  }

  /**
   * Check if user can access a specific lead
   */
  async canAccessLead(context: AccessContext, leadId: string): Promise<boolean> {
    const { organizationId, role, userId } = context;

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

    // Admin can access any lead
    if (this.hasAdminAccess(role)) {
      return true;
    }

    // Manager and Team Lead can access any lead in their organization
    // (for better usability - they may need to view/reassign leads)
    if (this.hasManagerAccess(role) || this.hasTeamLeadAccess(role)) {
      return true;
    }

    // Individual users can only access leads assigned to them
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
   * Extract access context from request
   * Can be used by routes to build context from request
   */
  buildContextFromUser(
    user: { id: string; role: string; branchId?: string | null; managerId?: string | null },
    organizationId: string,
    selectedBranchId?: string | null
  ): AccessContext {
    return {
      userId: user.id,
      organizationId,
      role: user.role,
      branchId: user.branchId,
      managerId: user.managerId,
      selectedBranchId,
    };
  }
}

// Export singleton instance
export const unifiedAccessService = new UnifiedAccessService();
