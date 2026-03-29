/**
 * Call Summary Types
 * TypeScript interfaces for the enhanced call summary page
 */

export interface EnhancedTranscriptMessage {
  role: 'assistant' | 'user';
  content: string;
  startTimeSeconds: number;
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface ContactInfo {
  name: string;
  phone: string;
  email?: string | null;
  alternatePhone?: string | null;
  source?: string | null;
  priority?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  stage?: string | null;
  subStage?: string | null;
  leadId?: string | null;
}

export interface AgentInfo {
  id: string;
  name: string;
  industry?: string;
}

export interface CampaignInfo {
  id: string;
  name: string;
}

// AI Coaching Types
export interface CoachingHighlight {
  text: string;
  timestamp?: number;
}

export interface CoachingImprovement {
  issue: string;
  suggestion: string;
  timestamp?: number;
}

export interface CoachingSuggestions {
  positiveHighlights: CoachingHighlight[];
  areasToImprove: CoachingImprovement[];
  nextCallTips: string[];
  coachingSummary: string;
  talkListenFeedback: string;
  empathyScore: number;
  objectionHandlingScore: number;
  closingScore: number;
}

export interface EnhancedCallDetails {
  id: string;
  phoneNumber: string;
  direction: 'INBOUND' | 'OUTBOUND';
  contact: ContactInfo;
  duration: number;
  recordingUrl: string | null;
  summary: string;
  sentiment: string;
  sentimentIntensity: 'low' | 'medium' | 'high';
  outcome: string;
  outcomeNotes?: string | null;
  callQualityScore: number;
  keyQuestionsAsked: string[];
  keyIssuesDiscussed: string[];
  agentSpeakingTime: number;
  customerSpeakingTime: number;
  nonSpeechTime: number;
  enhancedTranscript: EnhancedTranscriptMessage[];
  agent: AgentInfo;
  campaign?: CampaignInfo | null;
  leadId?: string | null;
  createdAt: string;
  answeredAt?: string;
  endedAt?: string;
  // AI Coaching fields
  coaching?: CoachingSuggestions;
  // Extracted data from conversation
  extractedData?: ExtractedCallData;
  // Lead journey - previous calls to this contact
  leadJourney?: LeadJourneyCall[];
  currentCallNumber?: number;
  totalCallsToLead?: number;
  isFollowUpCall?: boolean;
}

export interface SpeakingTimeBreakdown {
  agentPercent: number;
  customerPercent: number;
  silencePercent: number;
}

export type SentimentType = 'positive' | 'neutral' | 'negative';

export interface TranscriptFilter {
  searchQuery: string;
  speakerFilter: 'all' | 'agent' | 'customer';
}

// Extracted Data from Call (education example: student details, course interest, etc.)
export interface ExtractedDataItem {
  label: string;
  value: string;
  category?: 'contact' | 'interest' | 'timeline' | 'other';
}

export interface ExtractedCallData {
  items: ExtractedDataItem[];
  callbackRequested?: boolean;
  callbackDate?: string;
  callbackTime?: string;
  callbackNotes?: string;
}

// Lead Journey - Previous calls to the same contact
export interface LeadJourneyCall {
  id: string;
  callNumber: number;
  date: string;
  duration: number;
  outcome: string;
  sentiment: string;
  summary: string;
  isFollowUp: boolean;
  followUpNumber: number;
  agentName: string;
  extractedData?: ExtractedCallData | null;
}
