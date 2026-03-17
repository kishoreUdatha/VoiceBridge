/**
 * Create Campaign Constants
 * Shared configuration for campaign creation
 */

import { CampaignFormData } from './create-campaign.types';

export const industryLabels: Record<string, string> = {
  EDUCATION: 'Education',
  IT_RECRUITMENT: 'IT Recruitment',
  REAL_ESTATE: 'Real Estate',
  CUSTOMER_CARE: 'Customer Care',
  TECHNICAL_INTERVIEW: 'Technical Interview',
  HEALTHCARE: 'Healthcare',
  FINANCE: 'Finance',
  ECOMMERCE: 'E-Commerce',
  CUSTOM: 'Custom',
};

export const initialFormData: CampaignFormData = {
  name: '',
  description: '',
  agentId: '',
  callingMode: 'MANUAL',
  maxConcurrentCalls: 1,
  callsBetweenHours: { start: 9, end: 18 },
  retryAttempts: 2,
  retryDelayMinutes: 30,
  scheduledAt: '',
};

export const PHONE_REGEX = /^\+?[1-9]\d{9,14}$/;

export const validatePhoneNumber = (phone: string): boolean => {
  const cleanPhone = phone.replace(/[\s-()]/g, '');
  return PHONE_REGEX.test(cleanPhone);
};

export const cleanPhoneNumber = (phone: string): string => {
  return phone.replace(/[\s-()]/g, '');
};
