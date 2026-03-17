/**
 * Manual Call Queue Types
 */

export interface Lead {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string;
  source: string | null;
  customFields: Record<string, unknown>;
  createdAt: string;
}

export interface LastCall {
  id: string;
  status: string;
  outcome: string | null;
  duration: number | null;
  sentiment: string | null;
  summary: string | null;
  createdAt: string;
}

export interface Contact {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  status: string;
  attempts: number;
  lastAttemptAt: string | null;
  nextAttemptAt: string | null;
  customData: Record<string, unknown>;
  leadId: string | null;
  lead: Lead | null;
  lastCall: LastCall | null;
}

export interface Campaign {
  id: string;
  name: string;
  status: string;
  callingMode: string;
  agent: {
    id: string;
    name: string;
    industry: string;
  };
}

export interface QueueStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  failed: number;
}

export interface ScheduleData {
  contactId: string;
  date: string;
  time: string;
  notes: string;
}

export interface ActiveCall {
  callId: string;
  status: string;
}

export type ContactStatus = 'ALL' | 'PENDING' | 'SCHEDULED' | 'COMPLETED' | 'FAILED' | 'IN_PROGRESS' | 'DO_NOT_CALL';
