/**
 * Plan Configurations - Centralized pricing and feature definitions
 * Following Single Responsibility Principle
 */

export interface PlanFeatures {
  maxLeads: number;
  maxUsers: number;
  maxForms: number;
  maxLandingPages: number;
  // Voice AI Features
  maxPhoneNumbers: number;
  maxVoiceAgents: number;
  voiceMinutesIncluded: number;
  extraMinuteRate: number;
  concurrentCalls: number;
  // Communication
  smsPerMonth: number;
  whatsappPerMonth: number;
  emailsPerMonth: number;
  // Feature flags
  hasWhatsApp: boolean;
  hasTelecallerQueue: boolean;
  hasSocialMediaAds: boolean;
  hasLeadScoring: boolean;
  hasWebhooks: boolean;
  hasApiAccess: boolean;
  hasSso: boolean;
  hasWhiteLabeling: boolean;
  hasEmailCampaigns: boolean;
  hasIvrBuilder: boolean;
  hasCallQueues: boolean;
  hasCallRecording: boolean;
  hasCallSummary: boolean;
  hasMultilingual: boolean;
  hasSipTrunking?: boolean;
  hasAgentSdk?: boolean;
  supportLevel: string;
}

export interface AddOnPricing {
  extraPhoneNumber: number;
  extraVoiceAgent: number;
  extraUser: number;
}

export interface Plan {
  id: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  customPricing?: boolean;
  features: PlanFeatures;
  addOnPricing?: AddOnPricing;
}

export type PlanId = 'free' | 'starter' | 'pro' | 'business' | 'enterprise';

// Plan configurations - CRM + Voice AI Balanced Pricing (2026)
export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Free Trial',
    monthlyPrice: 0,
    annualPrice: 0,
    features: {
      maxLeads: 50,
      maxUsers: 1,
      maxForms: 1,
      maxLandingPages: 0,
      maxPhoneNumbers: 0,
      maxVoiceAgents: 1,
      voiceMinutesIncluded: 15,
      extraMinuteRate: 0,
      concurrentCalls: 1,
      smsPerMonth: 0,
      whatsappPerMonth: 50,
      emailsPerMonth: 100,
      hasWhatsApp: false,
      hasTelecallerQueue: false,
      hasSocialMediaAds: false,
      hasLeadScoring: false,
      hasWebhooks: false,
      hasApiAccess: false,
      hasSso: false,
      hasWhiteLabeling: false,
      hasEmailCampaigns: false,
      hasIvrBuilder: false,
      hasCallQueues: false,
      hasCallRecording: true,
      hasCallSummary: false,
      hasMultilingual: false,
      supportLevel: 'community',
    },
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 1999,
    annualPrice: 1599 * 12,
    features: {
      maxLeads: 1000,
      maxUsers: 5,
      maxForms: 3,
      maxLandingPages: 2,
      maxPhoneNumbers: 1,
      maxVoiceAgents: 5,
      voiceMinutesIncluded: 100,
      extraMinuteRate: 8.0,
      concurrentCalls: 1,
      smsPerMonth: 200,
      whatsappPerMonth: 500,
      emailsPerMonth: 1000,
      hasWhatsApp: true,
      hasTelecallerQueue: true,
      hasSocialMediaAds: false,
      hasLeadScoring: false,
      hasWebhooks: false,
      hasApiAccess: false,
      hasSso: false,
      hasWhiteLabeling: false,
      hasEmailCampaigns: true,
      hasIvrBuilder: false,
      hasCallQueues: false,
      hasCallRecording: true,
      hasCallSummary: true,
      hasMultilingual: true,
      supportLevel: 'email',
    },
    addOnPricing: {
      extraPhoneNumber: 499,
      extraVoiceAgent: 149,
      extraUser: 299,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 6999,
    annualPrice: 5599 * 12,
    features: {
      maxLeads: 5000,
      maxUsers: 15,
      maxForms: 10,
      maxLandingPages: 5,
      maxPhoneNumbers: 3,
      maxVoiceAgents: 15,
      voiceMinutesIncluded: 500,
      extraMinuteRate: 6.0,
      concurrentCalls: 5,
      smsPerMonth: 1000,
      whatsappPerMonth: 2000,
      emailsPerMonth: 5000,
      hasWhatsApp: true,
      hasTelecallerQueue: true,
      hasSocialMediaAds: true,
      hasLeadScoring: true,
      hasWebhooks: true,
      hasApiAccess: true,
      hasSso: false,
      hasWhiteLabeling: false,
      hasEmailCampaigns: true,
      hasIvrBuilder: true,
      hasCallQueues: true,
      hasCallRecording: true,
      hasCallSummary: true,
      hasMultilingual: true,
      supportLevel: 'priority',
    },
    addOnPricing: {
      extraPhoneNumber: 399,
      extraVoiceAgent: 99,
      extraUser: 199,
    },
  },
  business: {
    id: 'business',
    name: 'Business',
    monthlyPrice: 14999,
    annualPrice: 11999 * 12,
    features: {
      maxLeads: 25000,
      maxUsers: 50,
      maxForms: -1,
      maxLandingPages: 20,
      maxPhoneNumbers: 10,
      maxVoiceAgents: 50,
      voiceMinutesIncluded: 2000,
      extraMinuteRate: 5.0,
      concurrentCalls: 25,
      smsPerMonth: 5000,
      whatsappPerMonth: 10000,
      emailsPerMonth: 25000,
      hasWhatsApp: true,
      hasTelecallerQueue: true,
      hasSocialMediaAds: true,
      hasLeadScoring: true,
      hasWebhooks: true,
      hasApiAccess: true,
      hasSso: true,
      hasWhiteLabeling: false,
      hasEmailCampaigns: true,
      hasIvrBuilder: true,
      hasCallQueues: true,
      hasCallRecording: true,
      hasCallSummary: true,
      hasMultilingual: true,
      hasSipTrunking: true,
      supportLevel: 'dedicated',
    },
    addOnPricing: {
      extraPhoneNumber: 299,
      extraVoiceAgent: 79,
      extraUser: 149,
    },
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: 0,
    annualPrice: 0,
    customPricing: true,
    features: {
      maxLeads: -1,
      maxUsers: -1,
      maxForms: -1,
      maxLandingPages: -1,
      maxPhoneNumbers: -1,
      maxVoiceAgents: -1,
      voiceMinutesIncluded: -1,
      extraMinuteRate: 4.0,
      concurrentCalls: -1,
      smsPerMonth: -1,
      whatsappPerMonth: -1,
      emailsPerMonth: -1,
      hasWhatsApp: true,
      hasTelecallerQueue: true,
      hasSocialMediaAds: true,
      hasLeadScoring: true,
      hasWebhooks: true,
      hasApiAccess: true,
      hasSso: true,
      hasWhiteLabeling: true,
      hasEmailCampaigns: true,
      hasIvrBuilder: true,
      hasCallQueues: true,
      hasCallRecording: true,
      hasCallSummary: true,
      hasMultilingual: true,
      hasSipTrunking: true,
      hasAgentSdk: true,
      supportLevel: 'dedicated_account_manager',
    },
    addOnPricing: {
      extraPhoneNumber: 199,
      extraVoiceAgent: 49,
      extraUser: 99,
    },
  },
};

// Add-on pricing per plan
export type AddOnType = 'voiceMinutes' | 'aiCalls' | 'sms' | 'whatsapp' | 'storage' | 'leads' | 'users' | 'phoneNumbers' | 'voiceAgents';

export const ADD_ONS: Record<AddOnType, Record<PlanId, number>> = {
  voiceMinutes: { free: 10, starter: 8, pro: 6, business: 5, enterprise: 4 },
  aiCalls: { free: 10, starter: 8, pro: 6, business: 5, enterprise: 4 },
  sms: { free: 0.50, starter: 0.40, pro: 0.35, business: 0.30, enterprise: 0.25 },
  whatsapp: { free: 1.50, starter: 1.20, pro: 1.00, business: 0.80, enterprise: 0.60 },
  storage: { free: 100, starter: 75, pro: 50, business: 35, enterprise: 20 },
  leads: { free: 800, starter: 600, pro: 500, business: 400, enterprise: 300 },
  users: { free: 0, starter: 299, pro: 199, business: 149, enterprise: 99 },
  phoneNumbers: { free: 0, starter: 499, pro: 399, business: 299, enterprise: 199 },
  voiceAgents: { free: 0, starter: 149, pro: 99, business: 79, enterprise: 49 },
};

// Helper functions
export function getPlan(planId: string): Plan | null {
  return PLANS[planId as PlanId] || null;
}

export function getAddOnPrice(addOnType: AddOnType, planId: string): number {
  return ADD_ONS[addOnType]?.[planId as PlanId] ?? 0;
}

export function isUnlimited(value: number): boolean {
  return value === -1;
}
