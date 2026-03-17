/**
 * Pricing Page Types
 */

import { ComponentType } from 'react';

export interface PlanMetrics {
  minutes: string;
  numbers: string;
  agents: string;
  users: string;
  leads: string;
}

export interface Plan {
  id: string;
  name: string;
  subtitle: string;
  monthlyPrice: number;
  annualPrice: number;
  popular: boolean;
  customPricing?: boolean;
  icon: ComponentType<{ className?: string }>;
  color: string;
  lightColor: string;
  textColor: string;
  metrics: PlanMetrics;
  features: string[];
  extraRate: number;
}

export interface SimplePlanFeature {
  name: string;
  starter: boolean | string;
  pro: boolean | string;
  business: boolean | string;
  enterprise: boolean | string;
}

export interface FAQItem {
  q: string;
  a: string;
}

export interface TrustBadge {
  value: string;
  label: string;
}

export type PlanTier = 'starter' | 'pro' | 'business' | 'enterprise';
