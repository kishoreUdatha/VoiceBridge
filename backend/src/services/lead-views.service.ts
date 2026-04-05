/**
 * Lead Views Service
 * Handles saved views, custom filters, and lead list configurations
 */

import { prisma } from '../config/database';
import { LeadView, Prisma } from '@prisma/client';

interface ViewFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'starts_with' | 'ends_with' | 'in' | 'not_in' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty' | 'between' | 'date_before' | 'date_after' | 'date_between';
  value: any;
}

interface ViewConfig {
  filters: ViewFilter[];
  sortField: string;
  sortOrder: 'asc' | 'desc';
  columns: string[];
  groupBy?: string;
}

export class LeadViewsService {
  // ==================== View CRUD ====================

  /**
   * Create a new view
   */
  async createView(
    organizationId: string,
    userId: string,
    data: {
      name: string;
      description?: string;
      filters?: ViewFilter[];
      sortField?: string;
      sortOrder?: 'asc' | 'desc';
      columns?: string[];
      groupBy?: string;
      isShared?: boolean;
      isDefault?: boolean;
    }
  ): Promise<LeadView> {
    // If setting as default, unset other defaults
    if (data.isDefault) {
      await prisma.leadView.updateMany({
        where: {
          organizationId,
          userId,
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    return prisma.leadView.create({
      data: {
        organizationId,
        userId: data.isShared ? null : userId,
        name: data.name,
        description: data.description,
        filters: data.filters as any || [],
        sortField: data.sortField || 'createdAt',
        sortOrder: data.sortOrder || 'desc',
        columns: data.columns as any || [],
        groupBy: data.groupBy,
        isShared: data.isShared || false,
        isDefault: data.isDefault || false,
      },
    });
  }

  /**
   * Update a view
   */
  async updateView(
    viewId: string,
    organizationId: string,
    userId: string,
    data: Partial<{
      name: string;
      description: string;
      filters: ViewFilter[];
      sortField: string;
      sortOrder: 'asc' | 'desc';
      columns: string[];
      groupBy: string | null;
      isShared: boolean;
      isDefault: boolean;
    }>
  ): Promise<LeadView> {
    // Verify ownership or shared view
    const view = await prisma.leadView.findFirst({
      where: {
        id: viewId,
        organizationId,
        OR: [
          { userId },
          { isShared: true },
        ],
      },
    });

    if (!view) {
      throw new Error('View not found or access denied');
    }

    // Only owner or admin can edit shared views
    if (view.isShared && view.userId !== userId && view.userId !== null) {
      throw new Error('Cannot edit shared view created by another user');
    }

    // If setting as default, unset other defaults
    if (data.isDefault) {
      await prisma.leadView.updateMany({
        where: {
          organizationId,
          userId,
          isDefault: true,
          id: { not: viewId },
        },
        data: { isDefault: false },
      });
    }

    return prisma.leadView.update({
      where: { id: viewId },
      data: {
        ...data,
        filters: data.filters as any,
        columns: data.columns as any,
      },
    });
  }

  /**
   * Delete a view
   */
  async deleteView(viewId: string, organizationId: string, userId: string): Promise<void> {
    const view = await prisma.leadView.findFirst({
      where: {
        id: viewId,
        organizationId,
        OR: [
          { userId },
          { userId: null }, // Shared view with no owner (org-wide)
        ],
      },
    });

    if (!view) {
      throw new Error('View not found or access denied');
    }

    await prisma.leadView.delete({
      where: { id: viewId },
    });
  }

  /**
   * Get views for a user (includes personal and shared views)
   */
  async getViews(organizationId: string, userId: string): Promise<LeadView[]> {
    return prisma.leadView.findMany({
      where: {
        organizationId,
        OR: [
          { userId }, // Personal views
          { isShared: true }, // Shared views
        ],
      },
      orderBy: [
        { isDefault: 'desc' },
        { name: 'asc' },
      ],
    });
  }

  /**
   * Get a single view
   */
  async getView(viewId: string, organizationId: string, userId: string): Promise<LeadView | null> {
    return prisma.leadView.findFirst({
      where: {
        id: viewId,
        organizationId,
        OR: [
          { userId },
          { isShared: true },
        ],
      },
    });
  }

  /**
   * Get default view for a user
   */
  async getDefaultView(organizationId: string, userId: string): Promise<LeadView | null> {
    // First try user's default
    let view = await prisma.leadView.findFirst({
      where: {
        organizationId,
        userId,
        isDefault: true,
      },
    });

    // Fall back to shared default
    if (!view) {
      view = await prisma.leadView.findFirst({
        where: {
          organizationId,
          isShared: true,
          isDefault: true,
        },
      });
    }

    return view;
  }

  // ==================== View Application ====================

  /**
   * Build Prisma where clause from view filters
   */
  buildWhereClause(filters: ViewFilter[], organizationId: string): Prisma.LeadWhereInput {
    const where: Prisma.LeadWhereInput = { organizationId };
    const conditions: Prisma.LeadWhereInput[] = [];

    for (const filter of filters) {
      const condition = this.buildFilterCondition(filter);
      if (condition) {
        conditions.push(condition);
      }
    }

    if (conditions.length > 0) {
      where.AND = conditions;
    }

    return where;
  }

  /**
   * Build a single filter condition
   */
  private buildFilterCondition(filter: ViewFilter): Prisma.LeadWhereInput | null {
    const { field, operator, value } = filter;

    switch (operator) {
      case 'equals':
        return { [field]: value };

      case 'not_equals':
        return { [field]: { not: value } };

      case 'contains':
        return { [field]: { contains: value, mode: 'insensitive' } };

      case 'starts_with':
        return { [field]: { startsWith: value, mode: 'insensitive' } };

      case 'ends_with':
        return { [field]: { endsWith: value, mode: 'insensitive' } };

      case 'in':
        return { [field]: { in: Array.isArray(value) ? value : [value] } };

      case 'not_in':
        return { [field]: { notIn: Array.isArray(value) ? value : [value] } };

      case 'greater_than':
        return { [field]: { gt: value } };

      case 'less_than':
        return { [field]: { lt: value } };

      case 'is_empty':
        return { [field]: null };

      case 'is_not_empty':
        return { [field]: { not: null } };

      case 'between':
        if (Array.isArray(value) && value.length === 2) {
          return { [field]: { gte: value[0], lte: value[1] } };
        }
        return null;

      case 'date_before':
        return { [field]: { lt: new Date(value) } };

      case 'date_after':
        return { [field]: { gt: new Date(value) } };

      case 'date_between':
        if (Array.isArray(value) && value.length === 2) {
          return { [field]: { gte: new Date(value[0]), lte: new Date(value[1]) } };
        }
        return null;

      default:
        return null;
    }
  }

  /**
   * Apply a view and get leads
   */
  async applyView(
    viewId: string,
    organizationId: string,
    userId: string,
    options?: {
      page?: number;
      limit?: number;
    }
  ): Promise<{ leads: any[]; total: number; view: LeadView }> {
    const view = await this.getView(viewId, organizationId, userId);

    if (!view) {
      throw new Error('View not found');
    }

    const filters = view.filters as ViewFilter[];
    const where = this.buildWhereClause(filters, organizationId);

    const page = options?.page || 1;
    const limit = options?.limit || 50;

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: { [view.sortField]: view.sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          stage: true,
          assignments: {
            where: { isActive: true },
            include: {
              assignedTo: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          },
          tagAssignments: {
            include: { tag: true },
          },
        },
      }),
      prisma.lead.count({ where }),
    ]);

    return { leads, total, view };
  }

  // ==================== Default Views ====================

  /**
   * Create default system views for an organization
   */
  async createDefaultViews(organizationId: string): Promise<LeadView[]> {
    const defaultViews = [
      {
        name: 'All Leads',
        description: 'View all leads',
        filters: [],
        sortField: 'createdAt',
        sortOrder: 'desc' as const,
        isShared: true,
        isDefault: true,
      },
      {
        name: 'Hot Leads',
        description: 'High-scoring leads ready to convert',
        filters: [
          { field: 'totalScore', operator: 'greater_than' as const, value: 70 },
          { field: 'status', operator: 'not_in' as const, value: ['WON', 'LOST'] },
        ],
        sortField: 'totalScore',
        sortOrder: 'desc' as const,
        isShared: true,
      },
      {
        name: 'New This Week',
        description: 'Leads created in the last 7 days',
        filters: [
          {
            field: 'createdAt',
            operator: 'date_after' as const,
            value: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ],
        sortField: 'createdAt',
        sortOrder: 'desc' as const,
        isShared: true,
      },
      {
        name: 'Unassigned',
        description: 'Leads without an assigned user',
        filters: [{ field: 'assignedToId', operator: 'is_empty' as const, value: null }],
        sortField: 'createdAt',
        sortOrder: 'desc' as const,
        isShared: true,
      },
      {
        name: 'Follow-up Required',
        description: 'Leads needing follow-up',
        filters: [
          { field: 'status', operator: 'in' as const, value: ['CONTACTED', 'QUALIFIED', 'INTERESTED'] },
        ],
        sortField: 'updatedAt',
        sortOrder: 'asc' as const,
        isShared: true,
      },
      {
        name: 'Won Deals',
        description: 'Successfully converted leads',
        filters: [{ field: 'status', operator: 'equals' as const, value: 'WON' }],
        sortField: 'convertedAt',
        sortOrder: 'desc' as const,
        isShared: true,
      },
    ];

    const createdViews: LeadView[] = [];

    for (const viewData of defaultViews) {
      const view = await prisma.leadView.create({
        data: {
          organizationId,
          userId: null,
          name: viewData.name,
          description: viewData.description,
          filters: viewData.filters as any,
          sortField: viewData.sortField,
          sortOrder: viewData.sortOrder,
          isShared: viewData.isShared,
          isDefault: viewData.isDefault || false,
        },
      });
      createdViews.push(view);
    }

    return createdViews;
  }
}

export const leadViewsService = new LeadViewsService();
