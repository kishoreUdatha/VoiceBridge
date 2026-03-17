/**
 * Pricing Page Constants
 */

import {
  SparklesIcon,
  ChartBarIcon,
  UserGroupIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { Plan, SimplePlanFeature, FAQItem, TrustBadge } from './pricing.types';

export const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    subtitle: 'For small teams',
    monthlyPrice: 1999,
    annualPrice: 1599,
    popular: false,
    icon: SparklesIcon,
    color: 'from-blue-500 to-blue-600',
    lightColor: 'bg-blue-50',
    textColor: 'text-blue-600',
    metrics: {
      minutes: '100',
      numbers: '1',
      agents: '5',
      users: '5',
      leads: '1,000',
    },
    features: [
      'Full CRM Features',
      'Call Recording & Summary',
      'Multilingual (5 languages)',
      'WhatsApp & Email',
      'Email Support',
    ],
    extraRate: 8,
  },
  {
    id: 'pro',
    name: 'Pro',
    subtitle: 'For growing teams',
    monthlyPrice: 6999,
    annualPrice: 5599,
    popular: true,
    icon: ChartBarIcon,
    color: 'from-primary-500 to-primary-600',
    lightColor: 'bg-primary-50',
    textColor: 'text-primary-600',
    metrics: {
      minutes: '500',
      numbers: '3',
      agents: '15',
      users: '15',
      leads: '5,000',
    },
    features: [
      'Everything in Starter',
      'IVR Builder & Call Queues',
      'Advanced Analytics',
      'API Access & Webhooks',
      'Priority Support',
    ],
    extraRate: 6,
  },
  {
    id: 'business',
    name: 'Business',
    subtitle: 'For scaling teams',
    monthlyPrice: 14999,
    annualPrice: 11999,
    popular: false,
    icon: UserGroupIcon,
    color: 'from-purple-500 to-purple-600',
    lightColor: 'bg-purple-50',
    textColor: 'text-purple-600',
    metrics: {
      minutes: '2,000',
      numbers: '10',
      agents: '50',
      users: '50',
      leads: '25,000',
    },
    features: [
      'Everything in Pro',
      'Call Transfer & Routing',
      'White Label Option',
      'Voicemail System',
      'Dedicated Manager',
    ],
    extraRate: 5,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    subtitle: 'Custom solution',
    monthlyPrice: 0,
    annualPrice: 0,
    popular: false,
    customPricing: true,
    icon: ShieldCheckIcon,
    color: 'from-slate-700 to-slate-800',
    lightColor: 'bg-slate-100',
    textColor: 'text-slate-700',
    metrics: {
      minutes: '10,000+',
      numbers: 'Unlimited',
      agents: 'Unlimited',
      users: 'Unlimited',
      leads: 'Unlimited',
    },
    features: [
      'Everything in Business',
      'Custom Integrations',
      'Call Monitoring',
      '99.9% SLA Guarantee',
      'Account Manager',
    ],
    extraRate: 4,
  },
];

export const FEATURE_COMPARISON: SimplePlanFeature[] = [
  // Usage Limits
  { name: 'Voice Minutes/month', starter: '100', pro: '500', business: '2,000', enterprise: '10,000+' },
  { name: 'Extra Minute Rate', starter: '₹8', pro: '₹6', business: '₹5', enterprise: '₹4' },
  { name: 'Phone Numbers', starter: '1', pro: '3', business: '10', enterprise: 'Unlimited' },
  { name: 'AI Voice Agents', starter: '5', pro: '15', business: '50', enterprise: 'Unlimited' },
  { name: 'Concurrent Calls', starter: '1', pro: '5', business: '25', enterprise: 'Unlimited' },
  { name: 'Users', starter: '5', pro: '15', business: '50', enterprise: 'Unlimited' },
  { name: 'Leads Capacity', starter: '1,000', pro: '5,000', business: '25,000', enterprise: 'Unlimited' },
  // Voice Features
  { name: 'Call Recording & Summary', starter: true, pro: true, business: true, enterprise: true },
  { name: 'Multilingual TTS', starter: true, pro: true, business: true, enterprise: true },
  { name: 'IVR Builder', starter: false, pro: true, business: true, enterprise: true },
  { name: 'Call Queues', starter: false, pro: true, business: true, enterprise: true },
  { name: 'Voicemail System', starter: false, pro: false, business: true, enterprise: true },
  { name: 'Call Transfer & Routing', starter: false, pro: false, business: true, enterprise: true },
  { name: 'Call Monitoring', starter: false, pro: false, business: false, enterprise: true },
  // Integration Features
  { name: 'API Access', starter: false, pro: true, business: true, enterprise: true },
  { name: 'Webhooks', starter: false, pro: true, business: true, enterprise: true },
  { name: 'Advanced Analytics', starter: false, pro: true, business: true, enterprise: true },
  { name: 'White Labeling', starter: false, pro: false, business: true, enterprise: true },
  { name: 'Custom Integrations', starter: false, pro: false, business: false, enterprise: true },
  // Support
  { name: 'Support Level', starter: 'Email', pro: 'Priority', business: 'Dedicated', enterprise: 'Account Manager' },
  { name: 'SLA Guarantee', starter: '-', pro: '99%', business: '99.5%', enterprise: '99.9%' },
];

export const FAQ_ITEMS: FAQItem[] = [
  {
    q: 'Can I change plans later?',
    a: "Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate the difference.",
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept UPI, Credit/Debit Cards, Net Banking, and Bank Transfers. EMI options are available for annual plans.',
  },
  {
    q: 'Is there a free trial?',
    a: 'Yes! All plans come with a 14-day free trial. No credit card required to start.',
  },
  {
    q: 'What happens if I exceed my limits?',
    a: "You can purchase add-ons for extra minutes, numbers, or agents. We'll notify you when you're approaching your limits.",
  },
  {
    q: 'Do you offer refunds?',
    a: "Yes, we offer a 30-day money-back guarantee. If you're not satisfied, contact us for a full refund.",
  },
];

export const TRUST_BADGES: TrustBadge[] = [
  { value: '500+', label: 'Active Companies' },
  { value: '1M+', label: 'AI Calls Made' },
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '24/7', label: 'Support Available' },
];

export const PLAN_TIERS = ['starter', 'pro', 'business', 'enterprise'] as const;

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}
