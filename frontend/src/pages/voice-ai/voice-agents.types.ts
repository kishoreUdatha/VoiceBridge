/**
 * Voice Agents Types
 * Type definitions for voice agents page
 */

export interface VoiceAgent {
  id: string;
  name: string;
  industry: string;
  isActive: boolean;
  status: 'DRAFT' | 'PUBLISHED';
  voiceId: string;
  widgetColor: string;
  language?: string;
  createdAt: string;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  phoneNumbers?: {
    id: string;
    number: string;
    displayNumber?: string;
  }[];
  _count: {
    sessions: number;
  };
}

export interface VoiceTemplate {
  id: string;
  name: string;
  industry: string;
  icon: string;
  color: string;
  description: string;
  systemPrompt?: string;
  greeting?: string;
  greetings?: Record<string, string>;
  questions?: any[];
  faqs?: any[];
  knowledgeBase?: string;
  voiceId?: string;
  language?: string;
  fallbackMessage?: string;
  endMessage?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface IndustryColors {
  bg: string;
  accent: string;
  wave: string;
  text: string;
  light: string;
}

export interface CategoryFilter {
  key: string;
  label: string;
}
