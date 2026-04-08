/**
 * Industry Fields Service
 * API service for managing industry-specific custom fields
 */

import api from './api';

// Field Types
export type FieldType = 'text' | 'number' | 'select' | 'multiselect' | 'date' | 'boolean' | 'currency' | 'textarea';

export interface FieldOption {
  value: string;
  label: string;
}

export interface IndustryField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: FieldOption[];
  min?: number;
  max?: number;
  unit?: string;
  helpText?: string;
  gridSpan?: 1 | 2;
}

export interface IndustryFieldConfig {
  industry: string;
  label: string;
  icon: string;
  color: string;
  fields: IndustryField[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface LeadCustomFieldsResponse {
  customFields: Record<string, any>;
  fieldConfig: IndustryFieldConfig;
}

export interface UpdateCustomFieldsResponse {
  lead: any;
  validationWarnings: string[];
}

export interface BulkUpdateResult {
  updated: number;
  failed: string[];
}

export interface SearchFilter {
  field: string;
  operator: 'eq' | 'contains' | 'gt' | 'lt' | 'in';
  value: any;
}

export interface SearchResult {
  leads: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

class IndustryFieldsService {
  private basePath = '/industry-fields';

  /**
   * Get field schema for the current organization's industry
   */
  async getFieldSchema(): Promise<{ data: IndustryFieldConfig }> {
    const response = await api.get(`${this.basePath}/schema`);
    return response.data;
  }

  /**
   * Get field schema for a specific industry
   */
  async getIndustryFields(industry: string): Promise<{ data: { config: IndustryFieldConfig; fields: IndustryField[] } }> {
    const response = await api.get(`${this.basePath}/industries/${industry}/fields`);
    return response.data;
  }

  /**
   * Get custom fields for a specific lead
   */
  async getLeadCustomFields(leadId: string): Promise<{ data: LeadCustomFieldsResponse }> {
    const response = await api.get(`${this.basePath}/leads/${leadId}/custom-fields`);
    return response.data;
  }

  /**
   * Update custom fields for a specific lead
   */
  async updateLeadCustomFields(
    leadId: string,
    customFields: Record<string, any>,
    validateRequired: boolean = false
  ): Promise<{ data: UpdateCustomFieldsResponse }> {
    const response = await api.patch(`${this.basePath}/leads/${leadId}/custom-fields`, {
      customFields,
      validateRequired,
    });
    return response.data;
  }

  /**
   * Bulk update custom fields for multiple leads
   */
  async bulkUpdateCustomFields(
    leadIds: string[],
    customFields: Record<string, any>
  ): Promise<{ data: BulkUpdateResult }> {
    const response = await api.post(`${this.basePath}/leads/bulk-update`, {
      leadIds,
      customFields,
    });
    return response.data;
  }

  /**
   * Search leads by custom field values
   */
  async searchByCustomFields(
    filters: SearchFilter[],
    page: number = 1,
    limit: number = 20
  ): Promise<{ data: SearchResult }> {
    const response = await api.post(`${this.basePath}/leads/search`, {
      filters,
      page,
      limit,
    });
    return response.data;
  }

  /**
   * Get analytics/aggregations on a specific custom field
   */
  async getFieldAnalytics(fieldKey: string): Promise<{ data: Record<string, number> }> {
    const response = await api.get(`${this.basePath}/analytics/${fieldKey}`);
    return response.data;
  }

  /**
   * Validate custom fields against industry schema
   */
  async validateFields(
    customFields: Record<string, any>,
    industry?: string
  ): Promise<{ data: ValidationResult }> {
    const response = await api.post(`${this.basePath}/validate`, {
      customFields,
      industry,
    });
    return response.data;
  }
}

// Export singleton instance
const industryFieldsService = new IndustryFieldsService();
export default industryFieldsService;

// Named export for direct imports
export { industryFieldsService };
