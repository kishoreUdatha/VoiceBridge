/**
 * Lead Source Service
 * Manages custom lead sources for organizations
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Default system lead sources that match the enum
const DEFAULT_LEAD_SOURCES = [
  { name: 'Manual Entry', slug: 'manual', color: '#6B7280', icon: 'PencilIcon', isSystem: true, order: 1 },
  { name: 'Bulk Upload', slug: 'bulk_upload', color: '#8B5CF6', icon: 'ArrowUpTrayIcon', isSystem: true, order: 2 },
  { name: 'Website Form', slug: 'form', color: '#3B82F6', icon: 'DocumentTextIcon', isSystem: true, order: 3 },
  { name: 'Landing Page', slug: 'landing_page', color: '#10B981', icon: 'GlobeAltIcon', isSystem: true, order: 4 },
  { name: 'Chatbot', slug: 'chatbot', color: '#F59E0B', icon: 'ChatBubbleLeftRightIcon', isSystem: true, order: 5 },
  { name: 'Facebook Ads', slug: 'ad_facebook', color: '#1877F2', icon: 'ShareIcon', isSystem: true, order: 6 },
  { name: 'Instagram Ads', slug: 'ad_instagram', color: '#E4405F', icon: 'CameraIcon', isSystem: true, order: 7 },
  { name: 'LinkedIn Ads', slug: 'ad_linkedin', color: '#0A66C2', icon: 'BriefcaseIcon', isSystem: true, order: 8 },
  { name: 'Google Ads', slug: 'ad_google', color: '#4285F4', icon: 'MagnifyingGlassIcon', isSystem: true, order: 9 },
  { name: 'Referral', slug: 'referral', color: '#EC4899', icon: 'UserGroupIcon', isSystem: true, order: 10 },
  { name: 'Website', slug: 'website', color: '#14B8A6', icon: 'GlobeAltIcon', isSystem: true, order: 11 },
  { name: 'AI Voice Agent', slug: 'ai_voice_agent', color: '#8B5CF6', icon: 'PhoneIcon', isSystem: true, order: 12 },
  { name: 'Walk-in', slug: 'walk_in', color: '#F97316', icon: 'BuildingOfficeIcon', isSystem: false, order: 13 },
  { name: 'Phone Inquiry', slug: 'phone_inquiry', color: '#06B6D4', icon: 'PhoneIcon', isSystem: false, order: 14 },
  { name: 'Email', slug: 'email', color: '#EF4444', icon: 'EnvelopeIcon', isSystem: false, order: 15 },
  { name: 'Other', slug: 'other', color: '#6B7280', icon: 'EllipsisHorizontalIcon', isSystem: true, order: 99 },
];

interface CreateLeadSourceInput {
  name: string;
  slug?: string;
  color?: string;
  icon?: string;
  description?: string;
  order?: number;
}

interface UpdateLeadSourceInput {
  name?: string;
  color?: string;
  icon?: string;
  description?: string;
  isActive?: boolean;
  order?: number;
}

export const leadSourceService = {
  /**
   * Initialize default lead sources for an organization
   */
  async initializeDefaults(organizationId: string) {
    const existing = await prisma.customLeadSource.findMany({
      where: { organizationId },
    });

    if (existing.length > 0) {
      return existing;
    }

    const sources = await prisma.customLeadSource.createMany({
      data: DEFAULT_LEAD_SOURCES.map((source) => ({
        organizationId,
        ...source,
      })),
    });

    return prisma.customLeadSource.findMany({
      where: { organizationId },
      orderBy: { order: 'asc' },
    });
  },

  /**
   * Get all lead sources for an organization
   */
  async getAll(organizationId: string, includeInactive = false) {
    // Initialize defaults if none exist
    const count = await prisma.customLeadSource.count({
      where: { organizationId },
    });

    if (count === 0) {
      await this.initializeDefaults(organizationId);
    }

    return prisma.customLeadSource.findMany({
      where: {
        organizationId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: { order: 'asc' },
    });
  },

  /**
   * Get a single lead source
   */
  async getById(id: string, organizationId: string) {
    return prisma.customLeadSource.findFirst({
      where: { id, organizationId },
    });
  },

  /**
   * Generate a unique slug for a lead source
   */
  async generateUniqueSlug(organizationId: string, baseName: string): Promise<string> {
    const baseSlug = baseName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

    // Check if base slug exists
    const existing = await prisma.customLeadSource.findFirst({
      where: { organizationId, slug: baseSlug },
    });

    if (!existing) {
      return baseSlug;
    }

    // Find a unique slug by appending a number
    let counter = 1;
    let uniqueSlug = `${baseSlug}_${counter}`;

    while (true) {
      const exists = await prisma.customLeadSource.findFirst({
        where: { organizationId, slug: uniqueSlug },
      });

      if (!exists) {
        return uniqueSlug;
      }

      counter++;
      uniqueSlug = `${baseSlug}_${counter}`;

      // Safety limit
      if (counter > 100) {
        uniqueSlug = `${baseSlug}_${Date.now()}`;
        break;
      }
    }

    return uniqueSlug;
  },

  /**
   * Create a custom lead source
   */
  async create(organizationId: string, input: CreateLeadSourceInput) {
    // Generate unique slug
    const slug = input.slug
      ? await this.generateUniqueSlug(organizationId, input.slug)
      : await this.generateUniqueSlug(organizationId, input.name);

    // Get max order
    const maxOrder = await prisma.customLeadSource.aggregate({
      where: { organizationId },
      _max: { order: true },
    });

    return prisma.customLeadSource.create({
      data: {
        organizationId,
        name: input.name,
        slug,
        color: input.color || '#6366F1',
        icon: input.icon,
        description: input.description,
        order: input.order ?? (maxOrder._max.order || 0) + 1,
        isSystem: false,
      },
    });
  },

  /**
   * Update a lead source
   */
  async update(id: string, organizationId: string, input: UpdateLeadSourceInput) {
    const source = await prisma.customLeadSource.findFirst({
      where: { id, organizationId },
    });

    if (!source) {
      throw new Error('Lead source not found');
    }

    return prisma.customLeadSource.update({
      where: { id },
      data: input,
    });
  },

  /**
   * Delete a lead source (soft delete by setting isActive = false)
   */
  async delete(id: string, organizationId: string) {
    const source = await prisma.customLeadSource.findFirst({
      where: { id, organizationId },
    });

    if (!source) {
      throw new Error('Lead source not found');
    }

    if (source.isSystem) {
      throw new Error('Cannot delete system lead sources');
    }

    return prisma.customLeadSource.update({
      where: { id },
      data: { isActive: false },
    });
  },

  /**
   * Reorder lead sources
   */
  async reorder(organizationId: string, sourceIds: string[]) {
    const updates = sourceIds.map((id, index) =>
      prisma.customLeadSource.updateMany({
        where: { id, organizationId },
        data: { order: index + 1 },
      })
    );

    await prisma.$transaction(updates);

    return this.getAll(organizationId);
  },

  /**
   * Get lead sources analytics (count of leads per source)
   */
  async getAnalytics(organizationId: string, dateFrom?: Date, dateTo?: Date) {
    const sources = await this.getAll(organizationId);

    // This would need to be mapped to the Lead model's source field
    // For now, return basic structure
    return sources.map((source) => ({
      ...source,
      leadCount: 0, // TODO: Map to actual lead counts
    }));
  },
};
