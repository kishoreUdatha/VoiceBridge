/**
 * Lead Tags Service
 * Handles lead tagging, categorization, and bulk tag operations
 */

import { prisma } from '../config/database';
import { LeadTag, LeadTagAssignment, Prisma } from '@prisma/client';

interface TagWithCount extends LeadTag {
  _count?: {
    leadAssignments: number;
  };
}

export class LeadTagsService {
  /**
   * Generate slug from tag name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // ==================== Tag CRUD Operations ====================

  /**
   * Create a new tag
   */
  async createTag(
    organizationId: string,
    data: {
      name: string;
      color?: string;
      description?: string;
      isSystem?: boolean;
    }
  ): Promise<LeadTag> {
    const slug = this.generateSlug(data.name);

    return prisma.leadTag.create({
      data: {
        organizationId,
        name: data.name,
        slug,
        color: data.color || '#6B7280',
        description: data.description,
        isSystem: data.isSystem || false,
      },
    });
  }

  /**
   * Update a tag
   */
  async updateTag(
    tagId: string,
    organizationId: string,
    data: Partial<{
      name: string;
      color: string;
      description: string;
    }>
  ): Promise<LeadTag> {
    const updateData: any = { ...data };

    // Generate new slug if name is being updated
    if (data.name) {
      updateData.slug = this.generateSlug(data.name);
    }

    return prisma.leadTag.update({
      where: { id: tagId, organizationId },
      data: updateData,
    });
  }

  /**
   * Delete a tag
   */
  async deleteTag(tagId: string, organizationId: string): Promise<void> {
    const tag = await prisma.leadTag.findFirst({
      where: { id: tagId, organizationId },
    });

    if (!tag) {
      throw new Error('Tag not found');
    }

    if (tag.isSystem) {
      throw new Error('System tags cannot be deleted');
    }

    await prisma.leadTag.delete({
      where: { id: tagId },
    });
  }

  /**
   * Get all tags for an organization
   */
  async getTags(organizationId: string, includeCount = false): Promise<TagWithCount[]> {
    return prisma.leadTag.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
      include: includeCount
        ? {
            _count: {
              select: { leadAssignments: true },
            },
          }
        : undefined,
    });
  }

  /**
   * Get a single tag by ID
   */
  async getTag(tagId: string, organizationId: string): Promise<LeadTag | null> {
    return prisma.leadTag.findFirst({
      where: { id: tagId, organizationId },
      include: {
        _count: {
          select: { leadAssignments: true },
        },
      },
    });
  }

  /**
   * Get tag by slug
   */
  async getTagBySlug(slug: string, organizationId: string): Promise<LeadTag | null> {
    return prisma.leadTag.findFirst({
      where: { slug, organizationId },
    });
  }

  // ==================== Lead Tag Assignment Operations ====================

  /**
   * Assign tags to a lead
   */
  async assignTagsToLead(
    leadId: string,
    tagIds: string[],
    organizationId: string
  ): Promise<LeadTagAssignment[]> {
    // Verify lead belongs to organization
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId },
    });

    if (!lead) {
      throw new Error('Lead not found');
    }

    // Verify all tags belong to organization
    const tags = await prisma.leadTag.findMany({
      where: {
        id: { in: tagIds },
        organizationId,
      },
    });

    if (tags.length !== tagIds.length) {
      throw new Error('One or more tags not found');
    }

    // Create assignments (upsert to avoid duplicates)
    const assignments: LeadTagAssignment[] = [];

    for (const tagId of tagIds) {
      const assignment = await prisma.leadTagAssignment.upsert({
        where: {
          leadId_tagId: {
            leadId,
            tagId,
          },
        },
        create: {
          leadId,
          tagId,
        },
        update: {},
      });
      assignments.push(assignment);
    }

    // Create activity log
    await prisma.leadActivity.create({
      data: {
        leadId,
        type: 'TAGS_UPDATED',
        title: 'Tags assigned',
        description: `${tagIds.length} tag(s) assigned to lead`,
        metadata: { tagIds },
      },
    });

    return assignments;
  }

  /**
   * Remove tags from a lead
   */
  async removeTagsFromLead(
    leadId: string,
    tagIds: string[],
    organizationId: string
  ): Promise<void> {
    // Verify lead belongs to organization
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId },
    });

    if (!lead) {
      throw new Error('Lead not found');
    }

    await prisma.leadTagAssignment.deleteMany({
      where: {
        leadId,
        tagId: { in: tagIds },
      },
    });

    // Create activity log
    await prisma.leadActivity.create({
      data: {
        leadId,
        type: 'TAGS_UPDATED',
        title: 'Tags removed',
        description: `${tagIds.length} tag(s) removed from lead`,
        metadata: { tagIds },
      },
    });
  }

  /**
   * Get tags for a lead
   */
  async getLeadTags(leadId: string): Promise<LeadTag[]> {
    const assignments = await prisma.leadTagAssignment.findMany({
      where: { leadId },
      include: { tag: true },
    });

    return assignments.map((a) => a.tag);
  }

  /**
   * Get leads by tag
   */
  async getLeadsByTag(
    tagId: string,
    organizationId: string,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<{ leads: any[]; total: number }> {
    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where: {
          organizationId,
          tagAssignments: {
            some: { tagId },
          },
        },
        include: {
          stage: true,
          tagAssignments: {
            include: { tag: true },
          },
        },
        take: options?.limit || 50,
        skip: options?.offset || 0,
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.lead.count({
        where: {
          organizationId,
          tagAssignments: {
            some: { tagId },
          },
        },
      }),
    ]);

    return { leads, total };
  }

  /**
   * Get leads by multiple tags (AND/OR logic)
   */
  async getLeadsByTags(
    tagIds: string[],
    organizationId: string,
    logic: 'AND' | 'OR' = 'OR',
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<{ leads: any[]; total: number }> {
    let whereClause: Prisma.LeadWhereInput;

    if (logic === 'AND') {
      // Lead must have ALL specified tags
      whereClause = {
        organizationId,
        AND: tagIds.map((tagId) => ({
          tagAssignments: {
            some: { tagId },
          },
        })),
      };
    } else {
      // Lead must have ANY of the specified tags
      whereClause = {
        organizationId,
        tagAssignments: {
          some: { tagId: { in: tagIds } },
        },
      };
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where: whereClause,
        include: {
          stage: true,
          tagAssignments: {
            include: { tag: true },
          },
        },
        take: options?.limit || 50,
        skip: options?.offset || 0,
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.lead.count({ where: whereClause }),
    ]);

    return { leads, total };
  }

  // ==================== Bulk Operations ====================

  /**
   * Bulk assign tag to multiple leads
   */
  async bulkAssignTag(
    tagId: string,
    leadIds: string[],
    organizationId: string
  ): Promise<{ successCount: number; failedCount: number }> {
    // Verify tag exists
    const tag = await prisma.leadTag.findFirst({
      where: { id: tagId, organizationId },
    });

    if (!tag) {
      throw new Error('Tag not found');
    }

    // Verify all leads belong to organization
    const leads = await prisma.lead.findMany({
      where: {
        id: { in: leadIds },
        organizationId,
      },
      select: { id: true },
    });

    const validLeadIds = leads.map((l) => l.id);
    let successCount = 0;
    let failedCount = leadIds.length - validLeadIds.length;

    // Create assignments in batch
    for (const leadId of validLeadIds) {
      try {
        await prisma.leadTagAssignment.upsert({
          where: {
            leadId_tagId: { leadId, tagId },
          },
          create: { leadId, tagId },
          update: {},
        });
        successCount++;
      } catch (error) {
        failedCount++;
      }
    }

    return { successCount, failedCount };
  }

  /**
   * Bulk remove tag from multiple leads
   */
  async bulkRemoveTag(
    tagId: string,
    leadIds: string[],
    organizationId: string
  ): Promise<{ removedCount: number }> {
    // Verify tag exists
    const tag = await prisma.leadTag.findFirst({
      where: { id: tagId, organizationId },
    });

    if (!tag) {
      throw new Error('Tag not found');
    }

    const result = await prisma.leadTagAssignment.deleteMany({
      where: {
        tagId,
        leadId: { in: leadIds },
        lead: { organizationId },
      },
    });

    return { removedCount: result.count };
  }

  /**
   * Replace all tags on a lead
   */
  async replaceLeadTags(
    leadId: string,
    tagIds: string[],
    organizationId: string
  ): Promise<LeadTag[]> {
    // Verify lead belongs to organization
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId },
    });

    if (!lead) {
      throw new Error('Lead not found');
    }

    // Delete all existing tag assignments
    await prisma.leadTagAssignment.deleteMany({
      where: { leadId },
    });

    // Create new assignments
    if (tagIds.length > 0) {
      await prisma.leadTagAssignment.createMany({
        data: tagIds.map((tagId) => ({
          leadId,
          tagId,
        })),
      });
    }

    // Get and return the new tags
    return this.getLeadTags(leadId);
  }

  // ==================== System Tags ====================

  /**
   * Create default system tags for an organization
   */
  async createDefaultTags(organizationId: string): Promise<LeadTag[]> {
    const defaultTags = [
      { name: 'Hot Lead', color: '#EF4444', description: 'High priority lead ready to convert' },
      { name: 'VIP', color: '#8B5CF6', description: 'Very important contact' },
      { name: 'Follow Up', color: '#F59E0B', description: 'Needs follow-up' },
      { name: 'Not Interested', color: '#6B7280', description: 'Lead declined offer' },
      { name: 'Callback', color: '#3B82F6', description: 'Requested callback' },
      { name: 'Documents Pending', color: '#EC4899', description: 'Waiting for documents' },
      { name: 'Payment Pending', color: '#10B981', description: 'Payment awaited' },
    ];

    const createdTags: LeadTag[] = [];

    for (const tag of defaultTags) {
      const slug = this.generateSlug(tag.name);

      const created = await prisma.leadTag.upsert({
        where: {
          organizationId_slug: { organizationId, slug },
        },
        create: {
          organizationId,
          name: tag.name,
          slug,
          color: tag.color,
          description: tag.description,
          isSystem: true,
        },
        update: {},
      });

      createdTags.push(created);
    }

    return createdTags;
  }

  /**
   * Get tag usage statistics
   */
  async getTagStats(organizationId: string): Promise<{
    totalTags: number;
    mostUsedTags: { tag: LeadTag; count: number }[];
    unusedTags: LeadTag[];
  }> {
    const tags = await prisma.leadTag.findMany({
      where: { organizationId },
      include: {
        _count: {
          select: { leadAssignments: true },
        },
      },
    });

    const sortedByUsage = [...tags].sort(
      (a, b) => (b._count?.leadAssignments || 0) - (a._count?.leadAssignments || 0)
    );

    return {
      totalTags: tags.length,
      mostUsedTags: sortedByUsage.slice(0, 10).map((t) => ({
        tag: t,
        count: t._count?.leadAssignments || 0,
      })),
      unusedTags: tags.filter((t) => (t._count?.leadAssignments || 0) === 0),
    };
  }
}

export const leadTagsService = new LeadTagsService();
