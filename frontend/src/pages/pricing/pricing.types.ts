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
  growth: boolean | string;
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

export interface AddOn {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: string;
  popular?: boolean;
}

export interface FeatureCategory {
  category: string;
  features: SimplePlanFeature[];
}

export type PlanTier = 'starter' | 'growth' | 'business' | 'enterprise';
