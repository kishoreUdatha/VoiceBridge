/**
 * Industry Cache Service
 * Provides O(1) in-memory lookups for industry configurations
 * with TTL-based cache invalidation
 */

import { prisma } from '../config/database';
import {
  CachedIndustry,
  CachedIndustryField,
  CachedIndustryStage,
  IndustryDefaultLabels,
} from '../types/industry.types';

// Fallback to config files during migration
import {
  INDUSTRY_FIELD_CONFIGS,
  getIndustryFieldConfig,
  IndustryFieldConfig,
} from '../config/industry-fields.config';
import { LEAD_STAGE_TEMPLATES } from '../config/lead-stage-templates.config';
import { OrganizationIndustry } from '@prisma/client';

// Helper to convert industry key to slug
function toSlug(key: string): string {
  return key.toLowerCase().replace(/_/g, '-');
}

class IndustryCacheService {
  private cache: Map<string, CachedIndustry> = new Map();
  private TTL = 5 * 60 * 1000; // 5 minutes
  private warmUpComplete = false;
  private warmUpPromise: Promise<void> | null = null;

  /**
   * Get industry configuration by slug
   * Returns cached data if available and not expired
   */
  async getIndustryConfig(slug: string): Promise<CachedIndustry | null> {
    // Check cache first
    const cached = this.cache.get(slug);
    if (cached && Date.now() - cached.cachedAt < this.TTL) {
      return cached;
    }

    // Fetch from database
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
      return null;
    }

    // Transform and cache
    const cachedIndustry = this.transformToCache(industry);
    this.cache.set(slug, cachedIndustry);

    return cachedIndustry;
  }

  /**
   * Get fields for an industry by slug
   * Falls back to config file if not in database
   */
  async getFieldsForIndustry(slug: string): Promise<CachedIndustryField[]> {
    const cached = await this.getIndustryConfig(slug);
    if (cached) {
      return cached.fields;
    }

    // Fallback to config file for backward compatibility
    const industryKey = slug.toUpperCase().replace(/-/g, '_') as OrganizationIndustry;
    const config = INDUSTRY_FIELD_CONFIGS[industryKey];
    if (config) {
      return config.fields.map((field, index) => ({
        key: field.key,
        label: field.label,
        fieldType: field.type,
        isRequired: field.required || false,
        placeholder: field.placeholder,
        helpText: field.helpText,
        options: field.options,
        minValue: field.min,
        maxValue: field.max,
        unit: field.unit,
        groupName: undefined,
        displayOrder: index,
        gridSpan: field.gridSpan || 1,
      }));
    }

    return [];
  }

  /**
   * Get stages for an industry by slug
   * Falls back to config file if not in database
   */
  async getStagesForIndustry(slug: string): Promise<CachedIndustryStage[]> {
    const cached = await this.getIndustryConfig(slug);
    if (cached) {
      return cached.stages;
    }

    // Fallback to config file for backward compatibility
    const industryKey = slug.toUpperCase().replace(/-/g, '_') as OrganizationIndustry;
    const config = LEAD_STAGE_TEMPLATES[industryKey];
    if (config) {
      const stages: CachedIndustryStage[] = config.stages.map((stage) => ({
        id: '', // No ID in config file
        name: stage.name,
        slug: stage.slug,
        color: stage.color,
        icon: stage.icon,
        journeyOrder: stage.journeyOrder,
        isDefault: stage.isDefault || false,
        isLostStage: false,
        autoSyncStatus: stage.autoSyncStatus,
      }));

      // Add lost stage
      stages.push({
        id: '',
        name: config.lostStage.name,
        slug: config.lostStage.slug,
        color: config.lostStage.color,
        icon: config.lostStage.icon,
        journeyOrder: config.lostStage.journeyOrder,
        isDefault: false,
        isLostStage: true,
        autoSyncStatus: config.lostStage.autoSyncStatus,
      });

      return stages;
    }

    return [];
  }

  /**
   * Get field config for an organization
   * Uses dynamic industry if available, falls back to config
   */
  async getFieldConfigForOrganization(organizationId: string): Promise<IndustryFieldConfig> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        industrySlug: true,
        industry: true,
      },
    });

    if (!org) {
      return getIndustryFieldConfig(OrganizationIndustry.GENERAL);
    }

    // Try dynamic industry first
    if (org.industrySlug) {
      const cached = await this.getIndustryConfig(org.industrySlug);
      if (cached) {
        return {
          industry: org.industry || OrganizationIndustry.GENERAL,
          label: cached.name,
          icon: cached.icon || 'BuildingOfficeIcon',
          color: cached.color,
          fields: cached.fields.map((f) => ({
            key: f.key,
            label: f.label,
            type: f.fieldType,
            required: f.isRequired,
            placeholder: f.placeholder,
            options: f.options,
            min: f.minValue,
            max: f.maxValue,
            unit: f.unit,
            helpText: f.helpText,
            gridSpan: f.gridSpan as 1 | 2,
          })),
        };
      }
    }

    // Fallback to config file
    const industry = org.industry || OrganizationIndustry.GENERAL;
    return getIndustryFieldConfig(industry);
  }

  /**
   * Invalidate cache for a specific industry
   */
  async invalidate(slug: string): Promise<void> {
    this.cache.delete(slug);
  }

  /**
   * Invalidate all cached data
   */
  async invalidateAll(): Promise<void> {
    this.cache.clear();
    this.warmUpComplete = false;
  }

  /**
   * Warm up cache by loading all active industries
   * Should be called on application startup
   */
  async warmUp(): Promise<void> {
    // Prevent multiple concurrent warmups
    if (this.warmUpPromise) {
      return this.warmUpPromise;
    }

    this.warmUpPromise = this.performWarmUp();
    await this.warmUpPromise;
    this.warmUpPromise = null;
  }

  private async performWarmUp(): Promise<void> {
    try {
      const industries = await prisma.dynamicIndustry.findMany({
        where: { isActive: true },
        include: {
          fieldTemplates: {
            orderBy: { displayOrder: 'asc' },
          },
          stageTemplates: {
            orderBy: { journeyOrder: 'asc' },
          },
        },
      });

      for (const industry of industries) {
        const cached = this.transformToCache(industry);
        this.cache.set(industry.slug, cached);
      }

      this.warmUpComplete = true;
      console.log(`[IndustryCache] Warmed up ${industries.length} industries`);
    } catch (error) {
      console.error('[IndustryCache] Warm up failed:', error);
      // Don't throw - cache will work on-demand
    }
  }

  /**
   * Transform database model to cached format
   */
  private transformToCache(industry: any): CachedIndustry {
    const fields: CachedIndustryField[] = (industry.fieldTemplates || []).map(
      (field: any) => ({
        key: field.key,
        label: field.label,
        fieldType: field.fieldType,
        isRequired: field.isRequired,
        placeholder: field.placeholder,
        helpText: field.helpText,
        options: field.options,
        minValue: field.minValue,
        maxValue: field.maxValue,
        unit: field.unit,
        groupName: field.groupName,
        displayOrder: field.displayOrder,
        gridSpan: field.gridSpan,
      })
    );

    const stages: CachedIndustryStage[] = (industry.stageTemplates || []).map(
      (stage: any) => ({
        id: stage.id,
        name: stage.name,
        slug: stage.slug,
        color: stage.color,
        icon: stage.icon,
        journeyOrder: stage.journeyOrder,
        isDefault: stage.isDefault,
        isLostStage: stage.isLostStage,
        autoSyncStatus: stage.autoSyncStatus,
      })
    );

    return {
      id: industry.id,
      slug: industry.slug,
      name: industry.name,
      description: industry.description,
      icon: industry.icon,
      color: industry.color,
      isSystem: industry.isSystem,
      isActive: industry.isActive,
      defaultLabels: (industry.defaultLabels as IndustryDefaultLabels) || {},
      fields,
      stages,
      cachedAt: Date.now(),
    };
  }

  /**
   * Get all active industries (from cache if warm, otherwise from DB)
   */
  async getAllActiveIndustries(): Promise<CachedIndustry[]> {
    if (!this.warmUpComplete) {
      await this.warmUp();
    }

    const industries: CachedIndustry[] = [];
    for (const cached of this.cache.values()) {
      if (cached.isActive) {
        industries.push(cached);
      }
    }

    return industries;
  }

  /**
   * Check if an industry exists (either in DB or config fallback)
   */
  async industryExists(slug: string): Promise<boolean> {
    // Check cache
    if (this.cache.has(slug)) {
      return true;
    }

    // Check database
    const industry = await prisma.dynamicIndustry.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (industry) {
      return true;
    }

    // Check config fallback
    const industryKey = slug.toUpperCase().replace(/-/g, '_') as OrganizationIndustry;
    return industryKey in INDUSTRY_FIELD_CONFIGS;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    warmUpComplete: boolean;
    ttlMs: number;
  } {
    return {
      size: this.cache.size,
      warmUpComplete: this.warmUpComplete,
      ttlMs: this.TTL,
    };
  }
}

// Export singleton instance
export const industryCacheService = new IndustryCacheService();

// Export class for testing
export { IndustryCacheService };
