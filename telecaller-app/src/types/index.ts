// User & Auth Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId?: string;
  organizationName?: string;
  role: string;
  avatar?: string;
  createdAt?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthResponse {
  user: User;
  token: string;
  accessToken?: string;
  refreshToken: string;
}

// Lead Types
export type LeadStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'QUALIFIED'
  | 'NEGOTIATION'
  | 'CONVERTED'
  | 'LOST';

export interface Lead {
  id: string;
  name: string;
  email?: string;
  phone: string;
  company?: string;
  status: LeadStatus;
  source?: string;
  assignedTo?: string;
  notes?: string;
  lastContactedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeadsState {
  leads: Lead[];
  selectedLead: Lead | null;
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  filters: {
    status?: LeadStatus;
    search?: string;
  };
}

// Call Types
export type CallOutcome =
  | 'INTERESTED'
  | 'NOT_INTERESTED'
  | 'CALLBACK'
  | 'CONVERTED'
  | 'NO_ANSWER'
  | 'BUSY'
  | 'WRONG_NUMBER'
  | 'VOICEMAIL';

export type CallStatus = 'INITIATED' | 'RINGING' | 'CONNECTED' | 'COMPLETED' | 'FAILED';

export interface Call {
  id: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  userId: string;
  status: CallStatus;
  outcome?: CallOutcome;
  duration?: number;
  notes?: string;
  recordingUrl?: string;
  transcript?: string;
  sentimentScore?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CallsState {
  calls: Call[];
  currentCall: Call | null;
  isRecording: boolean;
  callDuration: number;
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface StartCallPayload {
  leadId: string;
  phoneNumber: string;
}

export interface UpdateCallPayload {
  outcome: CallOutcome;
  notes?: string;
  duration: number;
  callbackAt?: string; // ISO date string for callback scheduling
}

// Dashboard Stats
export interface TelecallerStats {
  todayCalls: number;
  totalCalls: number;
  conversionRate: number;
  assignedLeads: number;
  averageCallDuration: number;
  callsByOutcome: Record<CallOutcome, number>;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Navigation Types
export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  Call: { lead: Lead };
  CallAssignedData: { data: AssignedData };
  SmartCallPrep: { lead: Lead };
  Outcome: { call: Call; recordingPath?: string };
  OutcomeAssignedData: { callId: string; data: AssignedData; recordingPath?: string };
  CallAnalysis: { callId: string; duration: number; recordingPath?: string };
  LeadDetail: { leadId: string };
  LeadDisposition: { leadId: string; callId?: string };
  EditLead: { leadId: string };
  CreateLead: undefined;
  Analytics: undefined;
  Notifications: undefined;
  Profile: undefined;
  AIAnalysis: { callId: string };
  AssignedData: undefined;
  QualifiedLeads: undefined;
  Performance: undefined;
  FollowUps: undefined;
  NotificationSettings: undefined;
  CallRecordingSetup: undefined;
};

// Lead Form Data
export interface LeadFormData {
  name: string;
  phone: string;
  email?: string;
  company?: string;
  source?: string;
  notes?: string;
  status?: LeadStatus;
}

export type MainTabParamList = {
  Dashboard: undefined;
  AssignedData: undefined;
  Leads: undefined;
  History: undefined;
  Settings: undefined;
};

// Assigned Data (Raw Import Record) Types
export type AssignedDataStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'CALLING'
  | 'INTERESTED'
  | 'NOT_INTERESTED'
  | 'NO_ANSWER'
  | 'CALLBACK_REQUESTED'
  | 'CONVERTED';

export interface AssignedData {
  id: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone: string;
  alternatePhone?: string;
  status: AssignedDataStatus;
  notes?: string;
  callSummary?: string;
  callSentiment?: 'positive' | 'neutral' | 'negative';
  interestLevel?: 'high' | 'medium' | 'low';
  callAttempts: number;
  lastCallAt?: string;
  assignedAt?: string;
  customFields?: {
    aiAnalyzed?: boolean;
    lastCallOutcome?: string;
    buyingSignals?: string[];
    objections?: string[];
    [key: string]: any;
  };
  bulkImport?: { fileName: string };
  assignedBy?: { firstName: string; lastName: string };
}

export interface AssignedDataStats {
  total: number;
  new: number;
  pending: number;
  assigned: number;
  calling?: number;
  interested: number;
  notInterested: number;
  noAnswer: number;
  callback: number;
  converted: number;
}

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: '@telecaller/auth_token',
  REFRESH_TOKEN: '@telecaller/refresh_token',
  USER_DATA: '@telecaller/user_data',
  REMEMBER_ME: '@telecaller/remember_me',
  PENDING_CALLS: '@telecaller/pending_calls',
  CACHED_LEADS: '@telecaller/cached_leads',
} as const;
