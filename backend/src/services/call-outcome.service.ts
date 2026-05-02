/**
 * Call Outcome Service
 * Handles custom call outcomes management for telecaller app
 */

import { prisma } from '../config/database';
import { CustomCallOutcome, Prisma } from '@prisma/client';
import { NotFoundError, ValidationError } from '../utils/errors';

// Default system outcomes that will be created for new organizations
const DEFAULT_OUTCOMES = [
  {
    name: 'Interested',
    slug: 'interested',
    icon: 'thumb-up',
    color: '#10B981',
    notePrompt: 'What are they interested in? Any specific requirements?',
    requiresFollowUp: true,
    isSystem: true,
    order: 1,
  },
  {
    name: 'Not Interested',
    slug: 'not_interested',
    icon: 'thumb-down',
    color: '#EF4444',
    notePrompt: 'Why are they not interested? (e.g., budget, timing, already have solution)',
    requiresFollowUp: false,
    isSystem: true,
    order: 2,
  },
  {
    name: 'Callback',
    slug: 'callback',
    icon: 'phone-return',
    color: '#F59E0B',
    notePrompt: 'When is convenient for them to receive a callback?',
    requiresFollowUp: true,
    isSystem: true,
    order: 3,
  },
  {
    name: 'Converted',
    slug: 'converted',
    icon: 'check-circle',
    color: '#22C55E',
    notePrompt: 'What convinced them? Any special terms discussed?',
    requiresFollowUp: false,
    mapsToStatus: 'CONVERTED',
    isSystem: true,
    order: 4,
  },
  {
    name: 'No Answer',
    slug: 'no_answer',
    icon: 'phone-missed',
    color: '#6B7280',
    notePrompt: 'How many attempts? Best time to reach them?',
    requiresFollowUp: true,
    isSystem: true,
    order: 5,
  },
  {
    name: 'Busy',
    slug: 'busy',
    icon: 'phone-lock',
    color: '#F97316',
    notePrompt: 'Did they say when to call back?',
    requiresFollowUp: true,
    isSystem: true,
    order: 6,
  },
  {
    name: 'Wrong Number',
    slug: 'wrong_number',
    icon: 'phone-cancel',
    color: '#DC2626',
    notePrompt: 'Any additional info? (e.g., correct number if provided)',
    requiresFollowUp: false,
    isSystem: true,
    order: 7,
  },
  {
    name: 'Voicemail',
    slug: 'voicemail',
    icon: 'voicemail',
    color: '#8B5CF6',
    notePrompt: 'What message did you leave?',
    requiresFollowUp: true,
    isSystem: true,
    order: 8,
  },
];

interface CreateOutcomeInput {
  name: string;
  slug?: string;
  icon?: string;
  color?: string;
  notePrompt?: string;
  requiresFollowUp?: boolean;
  requiresSubOption?: boolean;
  subOptions?: string[];
  mapsToStatus?: string;
  order?: number;
}

interface UpdateOutcomeInput {
  name?: string;
  icon?: string;
  color?: string;
  notePrompt?: string;
  requiresFollowUp?: boolean;
  requiresSubOption?: boolean;
  subOptions?: string[];
  mapsToStatus?: string;
  isActive?: boolean;
  order?: number;
}

export class CallOutcomeService {
  /**
   * Generate a URL-friendly slug from a name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '_')
      .replace(/-+/g, '_');
  }

  /**
   * Initialize default outcomes for an organization
   * Called when organization is created or when outcomes are first accessed
   */
  async initializeDefaultOutcomes(organizationId: string): Promise<CustomCallOutcome[]> {
    // Check if outcomes already exist
    const existingCount = await prisma.customCallOutcome.count({
      where: { organizationId },
    });

    if (existingCount > 0) {
      return this.getAll(organizationId);
    }

    // Create default outcomes
    const outcomes = await prisma.$transaction(
      DEFAULT_OUTCOMES.map((outcome) =>
        prisma.customCallOutcome.create({
          data: {
            organizationId,
            ...outcome,
            subOptions: [],
          },
        })
      )
    );

    return outcomes;
  }

  /**
   * Get all outcomes for an organization
   */
  async getAll(organizationId: string, includeInactive = false): Promise<CustomCallOutcome[]> {
    const where: Prisma.CustomCallOutcomeWhereInput = {
      organizationId,
    };

    if (!includeInactive) {
      where.isActive = true;
    }

    return prisma.customCallOutcome.findMany({
      where,
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Get a single outcome by ID
   */
  async getById(id: string, organizationId: string): Promise<CustomCallOutcome> {
    const outcome = await prisma.customCallOutcome.findFirst({
      where: { id, organizationId },
    });

    if (!outcome) {
      throw new NotFoundError('Call outcome not found');
    }

    return outcome;
  }

  /**
   * Get a single outcome by slug
   */
  async getBySlug(slug: string, organizationId: string): Promise<CustomCallOutcome | null> {
    return prisma.customCallOutcome.findFirst({
      where: { slug, organizationId },
    });
  }

  /**
   * Create a new custom outcome
   */
  async create(organizationId: string, input: CreateOutcomeInput): Promise<CustomCallOutcome> {
    const slug = input.slug || this.generateSlug(input.name);

    // Check for duplicate slug
    const existing = await this.getBySlug(slug, organizationId);
    if (existing) {
      throw new ValidationError(`An outcome with slug "${slug}" already exists`);
    }

    // Get max order for positioning
    const maxOrder = await prisma.customCallOutcome.aggregate({
      where: { organizationId },
      _max: { order: true },
    });

    return prisma.customCallOutcome.create({
      data: {
        organizationId,
        name: input.name,
        slug,
        icon: input.icon || 'phone-check',
        color: input.color || '#6366F1',
        notePrompt: input.notePrompt,
        requiresFollowUp: input.requiresFollowUp || false,
        requiresSubOption: input.requiresSubOption || false,
        subOptions: input.subOptions || [],
        mapsToStatus: input.mapsToStatus,
        isSystem: false,
        isActive: true,
        order: input.order ?? (maxOrder._max.order || 0) + 1,
      },
    });
  }

  /**
   * Update an existing outcome
   */
  async update(
    id: string,
    organizationId: string,
    input: UpdateOutcomeInput
  ): Promise<CustomCallOutcome> {
    // Verify outcome exists and belongs to organization
    const existing = await this.getById(id, organizationId);

    // Don't allow editing slug of system outcomes
    if (existing.isSystem && input.name) {
      // System outcomes can update everything except the slug
    }

    return prisma.customCallOutcome.update({
      where: { id },
      data: {
        name: input.name,
        icon: input.icon,
        color: input.color,
        notePrompt: input.notePrompt,
        requiresFollowUp: input.requiresFollowUp,
        requiresSubOption: input.requiresSubOption,
        subOptions: input.subOptions,
        mapsToStatus: input.mapsToStatus,
        isActive: input.isActive,
        order: input.order,
      },
    });
  }

  /**
   * Delete an outcome (soft delete - sets isActive to false)
   */
  async delete(id: string, organizationId: string): Promise<void> {
    const outcome = await this.getById(id, organizationId);

    // Don't allow deleting system outcomes, only deactivate them
    if (outcome.isSystem) {
      await prisma.customCallOutcome.update({
        where: { id },
        data: { isActive: false },
      });
      return;
    }

    // Check if outcome is used in any calls
    const usageCount = await prisma.telecallerCall.count({
      where: {
        organizationId,
        customOutcomeId: id,
      },
    });

    if (usageCount > 0) {
      // Soft delete if in use
      await prisma.customCallOutcome.update({
        where: { id },
        data: { isActive: false },
      });
    } else {
      // Hard delete if not in use
      await prisma.customCallOutcome.delete({
        where: { id },
      });
    }
  }

  /**
   * Reorder outcomes
   */
  async reorder(organizationId: string, orderedIds: string[]): Promise<CustomCallOutcome[]> {
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.customCallOutcome.update({
          where: { id },
          data: { order: index + 1 },
        })
      )
    );

    return this.getAll(organizationId);
  }

  /**
   * Get outcomes formatted for telecaller app
   */
  async getForTelecallerApp(organizationId: string): Promise<{
    outcomes: Array<{
      id: string;
      slug: string;
      name: string;
      icon: string;
      color: string;
      notePrompt: string | null;
      requiresFollowUp: boolean;
      requiresSubOption: boolean;
      subOptions: string[];
    }>;
  }> {
    // Ensure default outcomes exist
    await this.initializeDefaultOutcomes(organizationId);

    const outcomes = await this.getAll(organizationId);

    return {
      outcomes: outcomes.map((o) => ({
        id: o.id,
        slug: o.slug,
        name: o.name,
        icon: o.icon || 'phone-check',
        color: o.color || '#6366F1',
        notePrompt: o.notePrompt,
        requiresFollowUp: o.requiresFollowUp,
        requiresSubOption: o.requiresSubOption,
        subOptions: (o.subOptions as string[]) || [],
      })),
    };
  }
}

export const callOutcomeService = new CallOutcomeService();
