/**
 * Dynamic Industry Service
 * CRUD operations for managing dynamic industries, field templates, and stage templates
 */

import { prisma } from '../config/database';
import { industryCacheService } from './industry-cache.service';
import {
  CreateIndustryDTO,
  UpdateIndustryDTO,
  FieldTemplateDTO,
  UpdateFieldTemplateDTO,
  StageTemplateDTO,
  UpdateStageTemplateDTO,
  IndustryListItem,
  IndustryExport,
  CachedIndustry,
  generateSlug,
} from '../types/industry.types';
import { NotFoundError, ValidationError } from '../utils/errors';

class DynamicIndustryService {
  // =====================================================
  // Industry CRUD Operations
  // =====================================================

  /**
   * Create a new custom industry
   */
  async createIndustry(data: CreateIndustryDTO): Promise<any> {
    // Generate slug if not provided
    const slug = data.slug || generateSlug(data.name);

    // Check for existing slug
    const existing = await prisma.dynamicIndustry.findUnique({
      where: { slug },
    });

    if (existing) {
      throw new ValidationError(`Industry with slug "${slug}" already exists`);
    }

    const industry = await prisma.dynamicIndustry.create({
      data: {
        slug,
        name: data.name,
        description: data.description,
        icon: data.icon,
        color: data.color || '#6B7280',
        defaultLabels: data.defaultLabels || {},
        isSystem: false, // Custom industries are never system industries
        isActive: data.isActive !== false,
      },
    });

    // Invalidate cache
    await industryCacheService.invalidate(slug);

    return industry;
  }

  /**
   * Get industry by slug
   */
  async getIndustryBySlug(slug: string): Promise<any | null> {
    return prisma.dynamicIndustry.findUnique({
      where: { slug },
      include: {
        fieldTemplates: {
          orderBy: { displayOrder: 'asc' },
        },
        stageTemplates: {
          orderBy: { journeyOrder: 'asc' },
        },
        _count: {
          select: { organizations: true },
        },
      },
    });
  }

  /**
   * Update an industry
   */
  async updateIndustry(slug: string, data: UpdateIndustryDTO): Promise<any> {
    const industry = await prisma.dynamicIndustry.findUnique({
      where: { slug },
    });

    if (!industry) {
      throw new NotFoundError(`Industry "${slug}" not found`);
    }

    const updated = await prisma.dynamicIndustry.update({
      where: { slug },
      data: {
        name: data.name,
        description: data.description,
        icon: data.icon,
        color: data.color,
        defaultLabels: data.defaultLabels,
        isActive: data.isActive,
        version: { increment: 1 },
      },
    });

    // Invalidate cache
    await industryCacheService.invalidate(slug);

    return updated;
  }

  /**
   * Delete a custom industry (system industries cannot be deleted)
   */
  async deleteIndustry(slug: string): Promise<void> {
    const industry = await prisma.dynamicIndustry.findUnique({
      where: { slug },
      include: {
        _count: {
          select: { organizations: true },
        },
      },
    });

    if (!industry) {
      throw new NotFoundError(`Industry "${slug}" not found`);
    }

    if (industry.isSystem) {
      throw new ValidationError('System industries cannot be deleted');
    }

    if (industry._count.organizations > 0) {
      throw new ValidationError(
        `Cannot delete industry: ${industry._count.organizations} organizations are using it`
      );
    }

    await prisma.dynamicIndustry.delete({
      where: { slug },
    });

    // Invalidate cache
    await industryCacheService.invalidate(slug);
  }

  /**
   * List all industries with optional filters
   */
  async listIndustries(filters?: {
    isActive?: boolean;
    isSystem?: boolean;
  }): Promise<IndustryListItem[]> {
    const where: any = {};
    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }
    if (filters?.isSystem !== undefined) {
      where.isSystem = filters.isSystem;
    }

    const industries = await prisma.dynamicIndustry.findMany({
      where,
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
      include: {
        _count: {
          select: {
            organizations: true,
            fieldTemplates: true,
            stageTemplates: true,
          },
        },
      },
    });

    return industries.map((ind) => ({
      id: ind.id,
      slug: ind.slug,
      name: ind.name,
      description: ind.description,
      icon: ind.icon,
      color: ind.color,
      isSystem: ind.isSystem,
      isActive: ind.isActive,
      fieldCount: ind._count.fieldTemplates,
      stageCount: ind._count.stageTemplates,
      organizationCount: ind._count.organizations,
    }));
  }

  // =====================================================
  // Field Template Management
  // =====================================================

  /**
   * Get field templates for an industry
   */
  async getFieldTemplates(industrySlug: string): Promise<any[]> {
    const industry = await prisma.dynamicIndustry.findUnique({
      where: { slug: industrySlug },
    });

    if (!industry) {
      throw new NotFoundError(`Industry "${industrySlug}" not found`);
    }

    return prisma.dynamicIndustryFieldTemplate.findMany({
      where: { industryId: industry.id },
      orderBy: { displayOrder: 'asc' },
    });
  }

  /**
   * Add a field template to an industry
   */
  async addFieldTemplate(
    industrySlug: string,
    field: FieldTemplateDTO
  ): Promise<any> {
    const industry = await prisma.dynamicIndustry.findUnique({
      where: { slug: industrySlug },
    });

    if (!industry) {
      throw new NotFoundError(`Industry "${industrySlug}" not found`);
    }

    // Check for duplicate key
    const existing = await prisma.dynamicIndustryFieldTemplate.findFirst({
      where: {
        industryId: industry.id,
        key: field.key,
      },
    });

    if (existing) {
      throw new ValidationError(`Field with key "${field.key}" already exists`);
    }

    // Get max display order
    const maxOrder = await prisma.dynamicIndustryFieldTemplate.aggregate({
      where: { industryId: industry.id },
      _max: { displayOrder: true },
    });

    const template = await prisma.dynamicIndustryFieldTemplate.create({
      data: {
        industryId: industry.id,
        key: field.key,
        label: field.label,
        fieldType: field.fieldType,
        isRequired: field.isRequired || false,
        placeholder: field.placeholder,
        helpText: field.helpText,
        options: field.options || null,
        minValue: field.minValue,
        maxValue: field.maxValue,
        unit: field.unit,
        groupName: field.groupName,
        displayOrder: field.displayOrder ?? (maxOrder._max.displayOrder || 0) + 1,
        gridSpan: field.gridSpan || 1,
      },
    });

    // Invalidate cache and increment version
    await prisma.dynamicIndustry.update({
      where: { slug: industrySlug },
      data: { version: { increment: 1 } },
    });
    await industryCacheService.invalidate(industrySlug);

    return template;
  }

  /**
   * Update a field template
   */
  async updateFieldTemplate(
    industrySlug: string,
    fieldKey: string,
    data: UpdateFieldTemplateDTO
  ): Promise<any> {
    const industry = await prisma.dynamicIndustry.findUnique({
      where: { slug: industrySlug },
    });

    if (!industry) {
      throw new NotFoundError(`Industry "${industrySlug}" not found`);
    }

    const field = await prisma.dynamicIndustryFieldTemplate.findFirst({
      where: {
        industryId: industry.id,
        key: fieldKey,
      },
    });

    if (!field) {
      throw new NotFoundError(`Field "${fieldKey}" not found`);
    }

    const updated = await prisma.dynamicIndustryFieldTemplate.update({
      where: { id: field.id },
      data: {
        label: data.label,
        fieldType: data.fieldType,
        isRequired: data.isRequired,
        placeholder: data.placeholder,
        helpText: data.helpText,
        options: data.options,
        minValue: data.minValue,
        maxValue: data.maxValue,
        unit: data.unit,
        groupName: data.groupName,
        displayOrder: data.displayOrder,
        gridSpan: data.gridSpan,
      },
    });

    // Invalidate cache and increment version
    await prisma.dynamicIndustry.update({
      where: { slug: industrySlug },
      data: { version: { increment: 1 } },
    });
    await industryCacheService.invalidate(industrySlug);

    return updated;
  }

  /**
   * Remove a field template
   */
  async removeFieldTemplate(industrySlug: string, fieldKey: string): Promise<void> {
    const industry = await prisma.dynamicIndustry.findUnique({
      where: { slug: industrySlug },
    });

    if (!industry) {
      throw new NotFoundError(`Industry "${industrySlug}" not found`);
    }

    const field = await prisma.dynamicIndustryFieldTemplate.findFirst({
      where: {
        industryId: industry.id,
        key: fieldKey,
      },
    });

    if (!field) {
      throw new NotFoundError(`Field "${fieldKey}" not found`);
    }

    await prisma.dynamicIndustryFieldTemplate.delete({
      where: { id: field.id },
    });

    // Invalidate cache and increment version
    await prisma.dynamicIndustry.update({
      where: { slug: industrySlug },
      data: { version: { increment: 1 } },
    });
    await industryCacheService.invalidate(industrySlug);
  }

  /**
   * Reorder field templates
   */
  async reorderFields(industrySlug: string, fieldKeys: string[]): Promise<void> {
    const industry = await prisma.dynamicIndustry.findUnique({
      where: { slug: industrySlug },
    });

    if (!industry) {
      throw new NotFoundError(`Industry "${industrySlug}" not found`);
    }

    // Update display order for each field
    await prisma.$transaction(
      fieldKeys.map((key, index) =>
        prisma.dynamicIndustryFieldTemplate.updateMany({
          where: {
            industryId: industry.id,
            key,
          },
          data: {
            displayOrder: index,
          },
        })
      )
    );

    // Invalidate cache and increment version
    await prisma.dynamicIndustry.update({
      where: { slug: industrySlug },
      data: { version: { increment: 1 } },
    });
    await industryCacheService.invalidate(industrySlug);
  }

  // =====================================================
  // Stage Template Management
  // =====================================================

  /**
   * Get stage templates for an industry
   */
  async getStageTemplates(industrySlug: string): Promise<any[]> {
    const industry = await prisma.dynamicIndustry.findUnique({
      where: { slug: industrySlug },
    });

    if (!industry) {
      throw new NotFoundError(`Industry "${industrySlug}" not found`);
    }

    return prisma.dynamicIndustryStageTemplate.findMany({
      where: { industryId: industry.id },
      orderBy: { journeyOrder: 'asc' },
    });
  }

  /**
   * Add a stage template to an industry
   */
  async addStageTemplate(
    industrySlug: string,
    stage: StageTemplateDTO
  ): Promise<any> {
    const industry = await prisma.dynamicIndustry.findUnique({
      where: { slug: industrySlug },
    });

    if (!industry) {
      throw new NotFoundError(`Industry "${industrySlug}" not found`);
    }

    // Check for duplicate slug
    const existing = await prisma.dynamicIndustryStageTemplate.findFirst({
      where: {
        industryId: industry.id,
        slug: stage.slug,
      },
    });

    if (existing) {
      throw new ValidationError(`Stage with slug "${stage.slug}" already exists`);
    }

    const template = await prisma.dynamicIndustryStageTemplate.create({
      data: {
        industryId: industry.id,
        name: stage.name,
        slug: stage.slug,
        color: stage.color || '#6B7280',
        icon: stage.icon,
        journeyOrder: stage.journeyOrder,
        isDefault: stage.isDefault || false,
        isLostStage: stage.isLostStage || false,
        autoSyncStatus: stage.autoSyncStatus,
      },
    });

    // Invalidate cache and increment version
    await prisma.dynamicIndustry.update({
      where: { slug: industrySlug },
      data: { version: { increment: 1 } },
    });
    await industryCacheService.invalidate(industrySlug);

    return template;
  }

  /**
   * Update a stage template
   */
  async updateStageTemplate(
    industrySlug: string,
    stageSlug: string,
    data: UpdateStageTemplateDTO
  ): Promise<any> {
    const industry = await prisma.dynamicIndustry.findUnique({
      where: { slug: industrySlug },
    });

    if (!industry) {
      throw new NotFoundError(`Industry "${industrySlug}" not found`);
    }

    const stage = await prisma.dynamicIndustryStageTemplate.findFirst({
      where: {
        industryId: industry.id,
        slug: stageSlug,
      },
    });

    if (!stage) {
      throw new NotFoundError(`Stage "${stageSlug}" not found`);
    }

    const updated = await prisma.dynamicIndustryStageTemplate.update({
      where: { id: stage.id },
      data: {
        name: data.name,
        color: data.color,
        icon: data.icon,
        journeyOrder: data.journeyOrder,
        isDefault: data.isDefault,
        isLostStage: data.isLostStage,
        autoSyncStatus: data.autoSyncStatus,
      },
    });

    // Invalidate cache and increment version
    await prisma.dynamicIndustry.update({
      where: { slug: industrySlug },
      data: { version: { increment: 1 } },
    });
    await industryCacheService.invalidate(industrySlug);

    return updated;
  }

  /**
   * Remove a stage template
   */
  async removeStageTemplate(industrySlug: string, stageSlug: string): Promise<void> {
    const industry = await prisma.dynamicIndustry.findUnique({
      where: { slug: industrySlug },
    });

    if (!industry) {
      throw new NotFoundError(`Industry "${industrySlug}" not found`);
    }

    const stage = await prisma.dynamicIndustryStageTemplate.findFirst({
      where: {
        industryId: industry.id,
        slug: stageSlug,
      },
    });

    if (!stage) {
      throw new NotFoundError(`Stage "${stageSlug}" not found`);
    }

    await prisma.dynamicIndustryStageTemplate.delete({
      where: { id: stage.id },
    });

    // Invalidate cache and increment version
    await prisma.dynamicIndustry.update({
      where: { slug: industrySlug },
      data: { version: { increment: 1 } },
    });
    await industryCacheService.invalidate(industrySlug);
  }

  // =====================================================
  // Organization Integration
  // =====================================================

  /**
   * Apply an industry to an organization
   */
  async applyIndustryToOrganization(
    orgId: string,
    industrySlug: string
  ): Promise<any> {
    const industry = await prisma.dynamicIndustry.findUnique({
      where: { slug: industrySlug },
    });

    if (!industry) {
      throw new NotFoundError(`Industry "${industrySlug}" not found`);
    }

    if (!industry.isActive) {
      throw new ValidationError('Cannot apply inactive industry');
    }

    const organization = await prisma.organization.update({
      where: { id: orgId },
      data: {
        dynamicIndustryId: industry.id,
        industrySlug: industry.slug,
      },
      select: {
        id: true,
        name: true,
        dynamicIndustryId: true,
        industrySlug: true,
        industry: true,
      },
    });

    return organization;
  }

  /**
   * Get organization's industry configuration
   */
  async getOrganizationIndustry(orgId: string): Promise<CachedIndustry | null> {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        industrySlug: true,
        industry: true,
      },
    });

    if (!org) {
      throw new NotFoundError('Organization not found');
    }

    if (org.industrySlug) {
      return industryCacheService.getIndustryConfig(org.industrySlug);
    }

    // No dynamic industry set
    return null;
  }

  // =====================================================
  // Import/Export
  // =====================================================

  /**
   * Export an industry as JSON
   */
  async exportIndustry(slug: string): Promise<IndustryExport> {
    const industry = await prisma.dynamicIndustry.findUnique({
      where: { slug },
      include: {
        fieldTemplates: {
          orderBy: { displayOrder: 'asc' },
        },
        stageTemplates: {
          orderBy: { journeyOrder: 'asc' },
        },
      },
    });

    if (!industry) {
      throw new NotFoundError(`Industry "${slug}" not found`);
    }

    return {
      slug: industry.slug,
      name: industry.name,
      description: industry.description || undefined,
      icon: industry.icon || undefined,
      color: industry.color,
      defaultLabels: industry.defaultLabels as any,
      fields: industry.fieldTemplates.map((f) => ({
        key: f.key,
        label: f.label,
        fieldType: f.fieldType as any,
        isRequired: f.isRequired,
        placeholder: f.placeholder || undefined,
        helpText: f.helpText || undefined,
        options: f.options as any,
        minValue: f.minValue || undefined,
        maxValue: f.maxValue || undefined,
        unit: f.unit || undefined,
        groupName: f.groupName || undefined,
        displayOrder: f.displayOrder,
        gridSpan: f.gridSpan,
      })),
      stages: industry.stageTemplates.map((s) => ({
        name: s.name,
        slug: s.slug,
        color: s.color,
        icon: s.icon || undefined,
        journeyOrder: s.journeyOrder,
        isDefault: s.isDefault,
        isLostStage: s.isLostStage,
        autoSyncStatus: s.autoSyncStatus as any,
      })),
      exportedAt: new Date().toISOString(),
      version: industry.version,
    };
  }

  /**
   * Import an industry from JSON
   */
  async importIndustry(data: IndustryExport): Promise<any> {
    // Check if industry already exists
    const existing = await prisma.dynamicIndustry.findUnique({
      where: { slug: data.slug },
    });

    if (existing) {
      throw new ValidationError(
        `Industry with slug "${data.slug}" already exists. Use update instead.`
      );
    }

    // Create industry with all templates in a transaction
    const industry = await prisma.$transaction(async (tx) => {
      const newIndustry = await tx.dynamicIndustry.create({
        data: {
          slug: data.slug,
          name: data.name,
          description: data.description,
          icon: data.icon,
          color: data.color || '#6B7280',
          defaultLabels: data.defaultLabels || {},
          isSystem: false,
          isActive: true,
        },
      });

      // Create field templates
      if (data.fields && data.fields.length > 0) {
        await tx.dynamicIndustryFieldTemplate.createMany({
          data: data.fields.map((f, index) => ({
            industryId: newIndustry.id,
            key: f.key,
            label: f.label,
            fieldType: f.fieldType,
            isRequired: f.isRequired || false,
            placeholder: f.placeholder,
            helpText: f.helpText,
            options: f.options || null,
            minValue: f.minValue,
            maxValue: f.maxValue,
            unit: f.unit,
            groupName: f.groupName,
            displayOrder: f.displayOrder ?? index,
            gridSpan: f.gridSpan || 1,
          })),
        });
      }

      // Create stage templates
      if (data.stages && data.stages.length > 0) {
        await tx.dynamicIndustryStageTemplate.createMany({
          data: data.stages.map((s) => ({
            industryId: newIndustry.id,
            name: s.name,
            slug: s.slug,
            color: s.color || '#6B7280',
            icon: s.icon,
            journeyOrder: s.journeyOrder,
            isDefault: s.isDefault || false,
            isLostStage: s.isLostStage || false,
            autoSyncStatus: s.autoSyncStatus,
          })),
        });
      }

      return newIndustry;
    });

    return industry;
  }
}

// Export singleton instance
export const dynamicIndustryService = new DynamicIndustryService();

// Export class for testing
export { DynamicIndustryService };
