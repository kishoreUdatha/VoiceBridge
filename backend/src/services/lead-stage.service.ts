/**
 * Lead Stage Service
 * Handles industry-specific lead stage management
 */

import { prisma } from '../config/database';
import { OrganizationIndustry, LeadStage, Prisma } from '@prisma/client';
import { LEAD_STAGE_TEMPLATES, getStageTemplatesForIndustry, LeadStageTemplate } from '../config/lead-stage-templates.config';
import { NotFoundError } from '../utils/errors';

export class LeadStageService {
  /**
   * Create lead stages from industry template
   * This will replace existing system stages with new ones from the template
   */
  async createStagesFromTemplate(
    organizationId: string,
    industry: OrganizationIndustry,
    replaceExisting: boolean = false
  ): Promise<LeadStage[]> {
    const templates = getStageTemplatesForIndustry(industry);

    // Use transaction to ensure atomicity
    return prisma.$transaction(async (tx) => {
      if (replaceExisting) {
        // Delete existing system stages (keep user-created custom stages)
        await tx.leadStage.deleteMany({
          where: {
            organizationId,
            isSystemStage: true,
          },
        });
      }

      // Check for existing stages with same slugs
      const existingSlugs = await tx.leadStage.findMany({
        where: { organizationId },
        select: { slug: true },
      });
      const existingSlugSet = new Set(existingSlugs.map((s) => s.slug));

      // Create new stages from templates
      const stagesToCreate = templates.filter((t) => !existingSlugSet.has(t.slug));

      if (stagesToCreate.length === 0) {
        // Return existing stages if no new ones to create
        return tx.leadStage.findMany({
          where: { organizationId },
          orderBy: { journeyOrder: 'asc' },
        });
      }

      const createdStages = await Promise.all(
        stagesToCreate.map((template, index) =>
          tx.leadStage.create({
            data: {
              organizationId,
              name: template.name,
              slug: template.slug,
              color: template.color,
              order: template.journeyOrder,
              journeyOrder: template.journeyOrder,
              isDefault: template.isDefault || false,
              isSystemStage: true,
              templateSlug: template.slug,
              autoSyncStatus: template.autoSyncStatus || null,
              icon: template.icon,
              isActive: true,
            },
          })
        )
      );

      return createdStages;
    });
  }

  /**
   * Get journey stages for an organization (ordered for display)
   */
  async getJourneyStages(organizationId: string): Promise<LeadStage[]> {
    return prisma.leadStage.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      orderBy: [
        { journeyOrder: 'asc' },
        { order: 'asc' },
      ],
    });
  }

  /**
   * Get all stages for an organization
   */
  async getOrganizationStages(organizationId: string): Promise<LeadStage[]> {
    return prisma.leadStage.findMany({
      where: { organizationId },
      orderBy: [{ journeyOrder: 'asc' }, { order: 'asc' }],
    });
  }

  /**
   * Update a lead's stage with auto-sync to lead status
   */
  async updateLeadStage(
    leadId: string,
    stageId: string,
    organizationId: string
  ): Promise<{ lead: any; autoSyncApplied: boolean }> {
    // Get the target stage
    const stage = await prisma.leadStage.findFirst({
      where: {
        id: stageId,
        organizationId,
      },
    });

    if (!stage) {
      throw new NotFoundError('Stage not found');
    }

    // Prepare lead update data
    const updateData: Prisma.LeadUpdateInput = {
      stage: { connect: { id: stageId } },
    };

    let autoSyncApplied = false;

    // Apply auto-sync logic
    if (stage.autoSyncStatus === 'WON') {
      updateData.status = 'WON';
      updateData.isConverted = true;
      autoSyncApplied = true;
    } else if (stage.autoSyncStatus === 'LOST') {
      updateData.status = 'LOST';
      autoSyncApplied = true;
    }

    // Update the lead
    const lead = await prisma.lead.update({
      where: { id: leadId },
      data: updateData,
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
      },
    });

    // Create activity log
    await prisma.leadActivity.create({
      data: {
        leadId,
        type: 'STAGE_CHANGED',
        description: `Stage changed to "${stage.name}"${autoSyncApplied ? ` (Status auto-synced to ${stage.autoSyncStatus})` : ''}`,
      },
    });

    return { lead, autoSyncApplied };
  }

  /**
   * Get organization's current industry
   */
  async getOrganizationIndustry(organizationId: string): Promise<OrganizationIndustry | null> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { industry: true },
    });
    return org?.industry || null;
  }

  /**
   * Set organization's industry and create default stages
   */
  async setOrganizationIndustry(
    organizationId: string,
    industry: OrganizationIndustry,
    resetStages: boolean = false
  ): Promise<{ organization: any; stages: LeadStage[] }> {
    // Update organization industry
    const organization = await prisma.organization.update({
      where: { id: organizationId },
      data: { industry },
      select: {
        id: true,
        name: true,
        industry: true,
      },
    });

    // Create stages from template
    const stages = await this.createStagesFromTemplate(organizationId, industry, resetStages);

    return { organization, stages };
  }

  /**
   * Reset stages to industry template defaults
   */
  async resetStagesToTemplate(organizationId: string): Promise<LeadStage[]> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { industry: true },
    });

    const industry = org?.industry || OrganizationIndustry.GENERAL;
    return this.createStagesFromTemplate(organizationId, industry, true);
  }

  /**
   * Get stage by slug for an organization
   */
  async getStageBySlug(organizationId: string, slug: string): Promise<LeadStage | null> {
    return prisma.leadStage.findFirst({
      where: {
        organizationId,
        slug,
        isActive: true,
      },
    });
  }

  /**
   * Create a custom stage (not from template)
   */
  async createCustomStage(
    organizationId: string,
    data: {
      name: string;
      slug?: string;
      color?: string;
      order?: number;
      journeyOrder?: number;
      icon?: string;
      autoSyncStatus?: 'WON' | 'LOST';
    }
  ): Promise<LeadStage> {
    const slug = data.slug || data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    return prisma.leadStage.create({
      data: {
        organizationId,
        name: data.name,
        slug,
        color: data.color || '#6B7280',
        order: data.order || 0,
        journeyOrder: data.journeyOrder || 0,
        icon: data.icon,
        autoSyncStatus: data.autoSyncStatus,
        isSystemStage: false,
        isActive: true,
      },
    });
  }

  /**
   * Update an existing stage
   */
  async updateStage(
    stageId: string,
    organizationId: string,
    data: {
      name?: string;
      color?: string;
      order?: number;
      journeyOrder?: number;
      icon?: string;
      autoSyncStatus?: 'WON' | 'LOST' | null;
      isActive?: boolean;
    }
  ): Promise<LeadStage> {
    return prisma.leadStage.update({
      where: {
        id: stageId,
        organizationId,
      },
      data,
    });
  }

  /**
   * Delete a stage (soft delete by setting isActive = false)
   */
  async deleteStage(stageId: string, organizationId: string): Promise<LeadStage> {
    // Check if any leads are using this stage
    const leadsUsingStage = await prisma.lead.count({
      where: { stageId },
    });

    if (leadsUsingStage > 0) {
      throw new Error(`Cannot delete stage: ${leadsUsingStage} leads are using this stage`);
    }

    return prisma.leadStage.update({
      where: {
        id: stageId,
        organizationId,
      },
      data: { isActive: false },
    });
  }
}

export const leadStageService = new LeadStageService();
