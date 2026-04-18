/**
 * Variable Parser Utility
 *
 * Centralized utility for parsing {{variable}} syntax in prompts, greetings, and scripts.
 * Supports lead variables (firstName, lastName, etc.) and institution variables.
 */

export interface LeadContext {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  company?: string;
  customFields?: Record<string, any>;
}

export interface InstitutionContext {
  name?: string;
  location?: string;
  website?: string;
  description?: string;
  courses?: string;
  phone?: string;
  email?: string;
}

export interface VariableContext {
  lead?: LeadContext;
  institution?: InstitutionContext;
  custom?: Record<string, string>;
}

// Default fallback values when variables are not provided
const DEFAULT_VALUES: Record<string, string> = {
  firstName: 'there',
  lastName: '',
  phone: '',
  email: '',
  company: '',
  INSTITUTION_NAME: 'Our Institution',
  INSTITUTION_LOCATION: '',
  INSTITUTION_WEBSITE: '',
  INSTITUTION_DESCRIPTION: '',
  INSTITUTION_COURSES: '',
  INSTITUTION_PHONE: '',
  INSTITUTION_EMAIL: '',
};

/**
 * Parse variables in text using {{variable}} syntax
 *
 * Supported variables:
 * - Lead variables: {{firstName}}, {{lastName}}, {{phone}}, {{email}}, {{company}}
 * - Institution variables: {{INSTITUTION_NAME}}, {{INSTITUTION_PHONE}}, etc.
 * - Custom fields: {{customField}} for any custom field in lead data
 *
 * @param text - The text containing {{variable}} placeholders
 * @param context - The context object containing lead and institution data
 * @returns The text with all variables replaced
 */
export function parseVariables(text: string, context: VariableContext = {}): string {
  if (!text) return text;

  let result = text;

  // Replace lead variables
  if (context.lead) {
    result = result
      .replace(/\{\{firstName\}\}/g, context.lead.firstName || DEFAULT_VALUES.firstName)
      .replace(/\{\{lastName\}\}/g, context.lead.lastName || DEFAULT_VALUES.lastName)
      .replace(/\{\{phone\}\}/g, context.lead.phone || DEFAULT_VALUES.phone)
      .replace(/\{\{email\}\}/g, context.lead.email || DEFAULT_VALUES.email)
      .replace(/\{\{company\}\}/g, context.lead.company || DEFAULT_VALUES.company);

    // Replace custom fields from lead
    if (context.lead.customFields) {
      for (const [key, value] of Object.entries(context.lead.customFields)) {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        result = result.replace(regex, String(value || ''));
      }
    }
  }

  // Replace institution variables
  if (context.institution) {
    result = result
      .replace(/\{\{INSTITUTION_NAME\}\}/g, context.institution.name || DEFAULT_VALUES.INSTITUTION_NAME)
      .replace(/\{\{INSTITUTION_LOCATION\}\}/g, context.institution.location || DEFAULT_VALUES.INSTITUTION_LOCATION)
      .replace(/\{\{INSTITUTION_WEBSITE\}\}/g, context.institution.website || DEFAULT_VALUES.INSTITUTION_WEBSITE)
      .replace(/\{\{INSTITUTION_DESCRIPTION\}\}/g, context.institution.description || DEFAULT_VALUES.INSTITUTION_DESCRIPTION)
      .replace(/\{\{INSTITUTION_COURSES\}\}/g, context.institution.courses || DEFAULT_VALUES.INSTITUTION_COURSES)
      .replace(/\{\{INSTITUTION_PHONE\}\}/g, context.institution.phone || DEFAULT_VALUES.INSTITUTION_PHONE)
      .replace(/\{\{INSTITUTION_EMAIL\}\}/g, context.institution.email || DEFAULT_VALUES.INSTITUTION_EMAIL);
  }

  // Replace custom variables
  if (context.custom) {
    for (const [key, value] of Object.entries(context.custom)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, value || '');
    }
  }

  // Clean up any remaining unreplaced variables with empty string
  // This ensures no {{variable}} syntax appears in the output
  result = result.replace(/\{\{[a-zA-Z_]+\}\}/g, '');

  return result;
}

/**
 * Extract variable context from organization settings
 *
 * @param orgSettings - Organization settings object
 * @returns InstitutionContext extracted from settings
 */
export function extractInstitutionContext(orgSettings: any): InstitutionContext {
  if (!orgSettings?.institution) return {};

  const institution = orgSettings.institution;
  return {
    name: institution.name,
    location: institution.location,
    website: institution.website,
    description: institution.description,
    courses: institution.courses,
    phone: institution.phone,
    email: institution.email,
  };
}

/**
 * Extract variable context from a lead object
 *
 * @param lead - Lead object from database
 * @returns LeadContext extracted from lead
 */
export function extractLeadContext(lead: any): LeadContext {
  if (!lead) return {};

  return {
    firstName: lead.firstName,
    lastName: lead.lastName,
    phone: lead.phone,
    email: lead.email,
    company: lead.company,
    customFields: lead.customFields as Record<string, any>,
  };
}

/**
 * List of available variables for UI display
 */
export const AVAILABLE_VARIABLES = [
  { key: 'firstName', label: 'First Name', description: "Lead's first name", example: 'John' },
  { key: 'lastName', label: 'Last Name', description: "Lead's last name", example: 'Doe' },
  { key: 'phone', label: 'Phone', description: "Lead's phone number", example: '+1234567890' },
  { key: 'email', label: 'Email', description: "Lead's email address", example: 'john@example.com' },
  { key: 'company', label: 'Company', description: "Lead's company name", example: 'Acme Inc' },
  { key: 'INSTITUTION_NAME', label: 'Institution Name', description: 'Your institution name', example: 'MyLeadX' },
  { key: 'INSTITUTION_PHONE', label: 'Institution Phone', description: 'Your institution phone', example: '+1800123456' },
  { key: 'INSTITUTION_EMAIL', label: 'Institution Email', description: 'Your institution email', example: 'info@example.com' },
  { key: 'INSTITUTION_WEBSITE', label: 'Institution Website', description: 'Your institution website', example: 'www.example.com' },
  { key: 'INSTITUTION_LOCATION', label: 'Institution Location', description: 'Your institution location', example: 'New York, USA' },
];
