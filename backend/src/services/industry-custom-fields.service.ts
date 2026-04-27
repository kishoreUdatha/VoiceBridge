/**
 * Industry Custom Fields Service
 * Handles industry-specific custom fields for leads
 * Uses dynamic industry cache with config file fallback
 */

import { prisma } from '../config/database';
import { OrganizationIndustry, Prisma } from '@prisma/client';
import {
  getIndustryFieldConfig,
  getIndustryFields,
  validateCustomFields,
  getDefaultFieldValues,
  IndustryFieldConfig,
  IndustryField,
} from '../config/industry-fields.config';
import { industryCacheService } from './industry-cache.service';
import { NotFoundError, ValidationError } from '../utils/errors';

export class IndustryCustomFieldsService {
  /**
   * Get field configuration for an organization's industry
   * Uses dynamic industry cache with config file fallback
   */
  async getFieldConfigForOrganization(organizationId: string): Promise<IndustryFieldConfig> {
    // Use the cache service which handles fallback internally
    return industryCacheService.getFieldConfigForOrganization(organizationId);
  }

  /**
   * Get field schema for a specific industry
   * Checks dynamic industry first, falls back to config
   */
  async getFieldSchemaAsync(industrySlug: string): Promise<IndustryField[]> {
    const fields = await industryCacheService.getFieldsForIndustry(industrySlug);
    if (fields.length > 0) {
      return fields.map((f) => ({
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
      }));
    }
    // Fallback for legacy callers
    const industryKey = industrySlug.toUpperCase().replace(/-/g, '_') as OrganizationIndustry;
    return getIndustryFields(industryKey);
  }

  /**
   * Get field schema for a specific industry (sync version for backward compatibility)
   */
  getFieldSchema(industry: OrganizationIndustry): IndustryField[] {
    return getIndustryFields(industry);
  }

  /**
   * Get industry field config
   */
  getFieldConfig(industry: OrganizationIndustry): IndustryFieldConfig {
    return getIndustryFieldConfig(industry);
  }

  /**
   * Validate custom fields based on industry
   */
  validateFields(
    industry: OrganizationIndustry,
    customFields: Record<string, any>
  ): { valid: boolean; errors: string[] } {
    return validateCustomFields(industry, customFields);
  }

  /**
   * Get lead's custom fields
   */
  async getLeadCustomFields(leadId: string): Promise<Record<string, any>> {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { customFields: true },
    });

    if (!lead) {
      throw new NotFoundError('Lead not found');
    }

    return (lead.customFields as Record<string, any>) || {};
  }

  /**
   * Update lead's custom fields
   */
  async updateLeadCustomFields(
    leadId: string,
    organizationId: string,
    customFields: Record<string, any>,
    validateRequired: boolean = false
  ): Promise<{ lead: any; validationWarnings: string[] }> {
    // Get the lead to ensure it exists and belongs to the organization
    const lead = await prisma.lead.findFirst({
      where: {
        id: leadId,
        organizationId,
      },
      select: {
        id: true,
        customFields: true,
        organization: {
          select: { industry: true },
        },
      },
    });

    if (!lead) {
      throw new NotFoundError('Lead not found');
    }

    const industry = lead.organization.industry || 'GENERAL';

    // Validate fields
    const validation = validateCustomFields(industry, customFields);
    if (validateRequired && !validation.valid) {
      throw new ValidationError(validation.errors.join(', '));
    }

    // Merge with existing custom fields
    const existingFields = (lead.customFields as Record<string, any>) || {};
    const mergedFields = {
      ...existingFields,
      ...customFields,
    };

    // Clean up null/undefined values
    for (const key of Object.keys(mergedFields)) {
      if (mergedFields[key] === null || mergedFields[key] === undefined) {
        delete mergedFields[key];
      }
    }

    // Update the lead
    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        customFields: mergedFields as Prisma.InputJsonValue,
      },
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

    // Log the activity
    await prisma.leadActivity.create({
      data: {
        leadId,
        type: 'LEAD_DATA_UPDATED',
        title: 'Custom fields updated',
        description: `Updated ${Object.keys(customFields).length} custom field(s)`,
      },
    });

    return {
      lead: updatedLead,
      validationWarnings: validation.errors,
    };
  }

  /**
   * Initialize custom fields with default values for a new lead
   */
  async initializeLeadCustomFields(
    leadId: string,
    industry: OrganizationIndustry
  ): Promise<void> {
    const defaults = getDefaultFieldValues(industry);

    if (Object.keys(defaults).length === 0) {
      return; // No defaults for this industry
    }

    // Get existing custom fields
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { customFields: true },
    });

    if (!lead) return;

    const existingFields = (lead.customFields as Record<string, any>) || {};

    // Only set defaults for fields that don't already exist
    const mergedFields = { ...defaults };
    for (const [key, value] of Object.entries(existingFields)) {
      if (value !== null && value !== undefined) {
        mergedFields[key] = value;
      }
    }

    await prisma.lead.update({
      where: { id: leadId },
      data: {
        customFields: mergedFields as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Bulk update custom fields for multiple leads
   */
  async bulkUpdateCustomFields(
    leadIds: string[],
    organizationId: string,
    customFields: Record<string, any>
  ): Promise<{ updated: number; failed: string[] }> {
    // Get organization industry
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { industry: true },
    });

    if (!org) {
      throw new NotFoundError('Organization not found');
    }

    const industry = org.industry || 'GENERAL';

    // Validate the custom fields
    const validation = validateCustomFields(industry, customFields);
    if (!validation.valid) {
      throw new ValidationError(validation.errors.join(', '));
    }

    const failed: string[] = [];
    let updated = 0;

    // Update each lead
    for (const leadId of leadIds) {
      try {
        const lead = await prisma.lead.findFirst({
          where: {
            id: leadId,
            organizationId,
          },
          select: { customFields: true },
        });

        if (!lead) {
          failed.push(leadId);
          continue;
        }

        const existingFields = (lead.customFields as Record<string, any>) || {};
        const mergedFields = { ...existingFields, ...customFields };

        await prisma.lead.update({
          where: { id: leadId },
          data: {
            customFields: mergedFields as Prisma.InputJsonValue,
          },
        });

        updated++;
      } catch (error) {
        failed.push(leadId);
      }
    }

    return { updated, failed };
  }

  /**
   * Search leads by custom field values
   */
  async searchByCustomFields(
    organizationId: string,
    filters: Array<{ field: string; operator: 'eq' | 'contains' | 'gt' | 'lt' | 'in'; value: any }>,
    pagination: { page: number; limit: number } = { page: 1, limit: 20 }
  ): Promise<{ leads: any[]; total: number }> {
    // Build Prisma JSON filters
    const jsonFilters: Prisma.LeadWhereInput[] = [];

    for (const filter of filters) {
      const path = ['customFields', filter.field];

      switch (filter.operator) {
        case 'eq':
          jsonFilters.push({
            customFields: {
              path,
              equals: filter.value,
            },
          });
          break;
        case 'contains':
          jsonFilters.push({
            customFields: {
              path,
              string_contains: String(filter.value),
            },
          });
          break;
        case 'gt':
          jsonFilters.push({
            customFields: {
              path,
              gt: Number(filter.value),
            },
          });
          break;
        case 'lt':
          jsonFilters.push({
            customFields: {
              path,
              lt: Number(filter.value),
            },
          });
          break;
        case 'in':
          jsonFilters.push({
            customFields: {
              path,
              array_contains: filter.value,
            },
          });
          break;
      }
    }

    const where: Prisma.LeadWhereInput = {
      organizationId,
      AND: jsonFilters,
    };

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
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
      }),
      prisma.lead.count({ where }),
    ]);

    return { leads, total };
  }

  /**
   * Get analytics/aggregations on custom fields
   */
  async getCustomFieldAnalytics(
    organizationId: string,
    fieldKey: string
  ): Promise<Record<string, number>> {
    // Get all leads with this custom field
    const leads = await prisma.lead.findMany({
      where: {
        organizationId,
        customFields: {
          path: ['$'],
          not: Prisma.AnyNull,
        },
      },
      select: { customFields: true },
    });

    const counts: Record<string, number> = {};

    for (const lead of leads) {
      const customFields = lead.customFields as Record<string, any>;
      const value = customFields?.[fieldKey];

      if (value !== null && value !== undefined) {
        if (Array.isArray(value)) {
          // For multiselect fields
          for (const v of value) {
            counts[String(v)] = (counts[String(v)] || 0) + 1;
          }
        } else {
          // For single value fields
          const key = String(value);
          counts[key] = (counts[key] || 0) + 1;
        }
      }
    }

    return counts;
  }
}

export const industryCustomFieldsService = new IndustryCustomFieldsService();
