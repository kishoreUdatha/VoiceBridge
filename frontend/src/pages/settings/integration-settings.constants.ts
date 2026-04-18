/**
 * Integration Settings Constants
 */

import { CRMProvider, MyLeadXField, TriggerOption } from './integration-settings.types';

export const CRM_PROVIDERS: CRMProvider[] = [
  { id: 'salesforce', name: 'Salesforce', logo: '\u2601\uFE0F', color: 'bg-blue-500', authType: 'oauth' },
  { id: 'hubspot', name: 'HubSpot', logo: '\uD83D\uDFE0', color: 'bg-orange-500', authType: 'oauth' },
  { id: 'zoho', name: 'Zoho CRM', logo: '\uD83D\uDFE2', color: 'bg-green-500', authType: 'oauth' },
  { id: 'pipedrive', name: 'Pipedrive', logo: '\uD83D\uDFE3', color: 'bg-purple-500', authType: 'api_key' },
  { id: 'freshsales', name: 'Freshsales', logo: '\uD83D\uDD35', color: 'bg-cyan-500', authType: 'api_key' },
  { id: 'custom', name: 'Custom CRM', logo: '\u2699\uFE0F', color: 'bg-gray-500', authType: 'webhook' },
];

export const MYLEADX_FIELDS: MyLeadXField[] = [
  { id: 'firstName', label: 'First Name' },
  { id: 'lastName', label: 'Last Name' },
  { id: 'phone', label: 'Phone Number' },
  { id: 'email', label: 'Email' },
  { id: 'company', label: 'Company' },
  { id: 'source', label: 'Lead Source' },
  { id: 'status', label: 'Lead Status' },
  { id: 'callSummary', label: 'Call Summary' },
  { id: 'appointmentDate', label: 'Appointment Date' },
  { id: 'notes', label: 'Notes' },
  { id: 'tags', label: 'Tags' },
  { id: 'customField1', label: 'Custom Field 1' },
  { id: 'customField2', label: 'Custom Field 2' },
];

export const TRIGGER_OPTIONS: TriggerOption[] = [
  { id: 'on_call_start', label: 'When call starts' },
  { id: 'on_call_end', label: 'When call ends' },
  { id: 'on_lead_created', label: 'When lead is created' },
  { id: 'on_appointment_booked', label: 'When appointment is booked' },
  { id: 'on_transfer_requested', label: 'When human transfer requested' },
  { id: 'on_payment_completed', label: 'When payment is completed' },
];

export const INITIAL_FIELD_MAPPINGS = [
  { sourceField: 'firstName', targetField: 'first_name' },
  { sourceField: 'lastName', targetField: 'last_name' },
  { sourceField: 'phone', targetField: 'phone' },
  { sourceField: 'email', targetField: 'email' },
];

export const INITIAL_NEW_ENDPOINT = {
  name: '',
  url: '',
  method: 'POST' as const,
  trigger: 'on_call_end',
  apiKey: '',
  headers: {} as Record<string, string>,
};

export const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
  alert('Copied to clipboard!');
};
