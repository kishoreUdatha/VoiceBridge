/**
 * Dynamic Industry System Types
 * Type definitions for the database-driven industry configuration system
 */

// Field types supported by dynamic industries
export type IndustryFieldType =
  | 'text'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'date'
  | 'boolean'
  | 'currency'
  | 'textarea';

// Field option for select/multiselect fields
export interface FieldOption {
  value: string;
  label: string;
  color?: string;
}

// Default labels for terminology customization
export interface IndustryDefaultLabels {
  lead?: string; // e.g., "Buyer", "Patient", "Candidate"
  deal?: string; // e.g., "Booking", "Treatment", "Placement"
  stage?: string; // e.g., "Stage", "Phase", "Step"
  contact?: string; // e.g., "Contact", "Client", "Customer"
}

// =====================================================
// Dynamic Industry DTOs
// =====================================================

export interface CreateIndustryDTO {
  slug: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  defaultLabels?: IndustryDefaultLabels;
  isActive?: boolean;
}

export interface UpdateIndustryDTO {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  defaultLabels?: IndustryDefaultLabels;
  isActive?: boolean;
}

// =====================================================
// Field Template DTOs
// =====================================================

export interface FieldTemplateDTO {
  key: string;
  label: string;
  fieldType: IndustryFieldType;
  isRequired?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: FieldOption[];
  minValue?: number;
  maxValue?: number;
  unit?: string;
  groupName?: string;
  displayOrder?: number;
  gridSpan?: number;
}

export interface UpdateFieldTemplateDTO {
  label?: string;
  fieldType?: IndustryFieldType;
  isRequired?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: FieldOption[];
  minValue?: number;
  maxValue?: number;
  unit?: string;
  groupName?: string;
  displayOrder?: number;
  gridSpan?: number;
}

// =====================================================
// Stage Template DTOs
// =====================================================

export interface StageTemplateDTO {
  name: string;
  slug: string;
  color?: string;
  icon?: string;
  journeyOrder: number;
  isDefault?: boolean;
  isLostStage?: boolean;
  autoSyncStatus?: 'WON' | 'LOST';
}

export interface UpdateStageTemplateDTO {
  name?: string;
  color?: string;
  icon?: string;
  journeyOrder?: number;
  isDefault?: boolean;
  isLostStage?: boolean;
  autoSyncStatus?: 'WON' | 'LOST' | null;
}

// =====================================================
// Cached Industry Types (for IndustryCacheService)
// =====================================================

export interface CachedIndustryField {
  key: string;
  label: string;
  fieldType: IndustryFieldType;
  isRequired: boolean;
  placeholder?: string;
  helpText?: string;
  options?: FieldOption[];
  minValue?: number;
  maxValue?: number;
  unit?: string;
  groupName?: string;
  displayOrder: number;
  gridSpan: number;
}

export interface CachedIndustryStage {
  id: string;
  name: string;
  slug: string;
  color: string;
  icon?: string;
  journeyOrder: number;
  isDefault: boolean;
  isLostStage: boolean;
  autoSyncStatus?: string;
}

export interface CachedIndustry {
  id: string;
  slug: string;
  name: string;
  description?: string;
  icon?: string;
  color: string;
  isSystem: boolean;
  isActive: boolean;
  defaultLabels: IndustryDefaultLabels;
  fields: CachedIndustryField[];
  stages: CachedIndustryStage[];
  cachedAt: number;
}

// =====================================================
// Response Types
// =====================================================

export interface IndustryListItem {
  id: string;
  slug: string;
  name: string;
  description?: string;
  icon?: string;
  color: string;
  isSystem: boolean;
  isActive: boolean;
  fieldCount: number;
  stageCount: number;
  organizationCount: number;
}

export interface IndustryExport {
  slug: string;
  name: string;
  description?: string;
  icon?: string;
  color: string;
  defaultLabels?: IndustryDefaultLabels;
  fields: FieldTemplateDTO[];
  stages: StageTemplateDTO[];
  exportedAt: string;
  version: number;
}

// =====================================================
// Validation Types
// =====================================================

export interface FieldValidationResult {
  valid: boolean;
  errors: string[];
}

export interface IndustryValidationResult {
  valid: boolean;
  errors: {
    industry?: string[];
    fields?: Record<string, string[]>;
    stages?: Record<string, string[]>;
  };
}

// =====================================================
// Utility Helpers
// =====================================================

/**
 * Convert industry key to slug format
 * e.g., "REAL_ESTATE" -> "real-estate"
 */
export function toIndustrySlug(key: string): string {
  return key.toLowerCase().replace(/_/g, '-');
}

/**
 * Convert slug to industry key format
 * e.g., "real-estate" -> "REAL_ESTATE"
 */
export function toIndustryKey(slug: string): string {
  return slug.toUpperCase().replace(/-/g, '_');
}

/**
 * Generate a valid slug from a name
 * e.g., "Real Estate" -> "real-estate"
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Valid field types
 */
export const VALID_FIELD_TYPES: IndustryFieldType[] = [
  'text',
  'number',
  'select',
  'multiselect',
  'date',
  'boolean',
  'currency',
  'textarea',
];

/**
 * Check if a field type is valid
 */
export function isValidFieldType(type: string): type is IndustryFieldType {
  return VALID_FIELD_TYPES.includes(type as IndustryFieldType);
}
