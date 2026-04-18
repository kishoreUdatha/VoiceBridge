/**
 * Integration Settings Types
 */

export interface CRMIntegration {
  id: string;
  type: string;
  name: string;
  isActive: boolean;
  connected: boolean;
  lastSyncAt?: string;
  lastSyncError?: string;
}

export interface CustomEndpoint {
  id: string;
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT';
  trigger: string;
  isActive: boolean;
  lastCalledAt?: string;
  lastError?: string;
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
}

export interface NewEndpointForm {
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT';
  trigger: string;
  apiKey: string;
  headers: Record<string, string>;
}

export type ActiveSection = 'crm' | 'webhook' | 'knowledge' | 'field-mapping';

export interface CRMProvider {
  id: string;
  name: string;
  logo: string;
  color: string;
  authType: 'oauth' | 'api_key' | 'webhook';
}

export interface MyLeadXField {
  id: string;
  label: string;
}

export interface TriggerOption {
  id: string;
  label: string;
}
