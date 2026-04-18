/**
 * Create Campaign Types
 * Type definitions for campaign creation
 */

export interface VoiceAgent {
  id: string;
  name: string;
  industry: string;
  isActive: boolean;
}

export interface Contact {
  phone: string;
  name: string;
  email: string;
}

export interface Lead {
  id: string;
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
  source?: string;
  createdAt: string;
}

export interface CampaignFormData {
  name: string;
  description: string;
  agentId: string;
  callingMode: 'AUTOMATIC' | 'MANUAL';
  maxConcurrentCalls: number;
  callsBetweenHours: { start: number; end: number };
  retryAttempts: number;
  retryDelayMinutes: number;
  scheduledAt: string;
}

export interface LeadFilter {
  source: string;
  search: string;
}

export interface RawImportRecord {
  id: string;
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
  status: string;
  bulkImport?: {
    id: string;
    fileName: string;
  };
  createdAt: string;
}

export interface RawImportFilter {
  status: string;
  search: string;
}

export type ContactSource = 'manual' | 'csv' | 'leads' | 'rawImports';
