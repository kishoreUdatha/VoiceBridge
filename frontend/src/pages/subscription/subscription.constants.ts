/**
 * Subscription Management Constants
 */

import { AddOn, AddOnPricing } from './subscription.types';

export const ADD_ON_PRICING: Record<string, AddOnPricing> = {
  voiceMinutes: { starter: 8, pro: 6, business: 5, enterprise: 4 },
  sms: { starter: 0.40, pro: 0.35, business: 0.30, enterprise: 0.25 },
  whatsapp: { starter: 1.20, pro: 1.00, business: 0.80, enterprise: 0.60 },
  leads: { starter: 0.60, pro: 0.50, business: 0.40, enterprise: 0.30 },
  phoneNumbers: { starter: 499, pro: 399, business: 299, enterprise: 199 },
  voiceAgents: { starter: 149, pro: 99, business: 79, enterprise: 49 },
};

export const ADD_ONS: AddOn[] = [
  { id: 'voiceMinutes', name: 'Voice Minutes', unit: 'minutes', defaultQty: 100, description: 'Extra AI voice call minutes' },
  { id: 'sms', name: 'SMS Credits', unit: 'messages', defaultQty: 500, description: 'SMS messages' },
  { id: 'whatsapp', name: 'WhatsApp Credits', unit: 'messages', defaultQty: 200, description: 'WhatsApp messages' },
  { id: 'leads', name: 'Lead Capacity', unit: 'leads', defaultQty: 1000, description: 'Additional lead storage' },
  { id: 'phoneNumbers', name: 'Phone Number', unit: 'number', defaultQty: 1, description: 'Additional phone number (monthly)' },
  { id: 'voiceAgents', name: 'Voice Agent', unit: 'agent', defaultQty: 1, description: 'Additional AI voice agent (monthly)' },
];

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function getUsagePercentage(used: number, limit: number): number {
  if (limit === -1) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

export function getUsageColor(percentage: number): string {
  if (percentage >= 90) return 'bg-red-500';
  if (percentage >= 70) return 'bg-amber-500';
  return 'bg-primary-500';
}

export function getAddOnPrice(addOnId: string, planId: string): number {
  const pricing = ADD_ON_PRICING[addOnId];
  if (!pricing) return 0;
  return pricing[planId as keyof AddOnPricing] || pricing.starter || 0;
}
