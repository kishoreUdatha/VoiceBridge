/**
 * Pricing Page Constants
 * VoiceBridge - AI Voice CRM Platform
 */

import {
  SparklesIcon,
  ChartBarIcon,
  UserGroupIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { Plan, SimplePlanFeature, FAQItem, TrustBadge, AddOn, FeatureCategory } from './pricing.types';

export const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    subtitle: 'For small teams getting started',
    monthlyPrice: 2999,
    annualPrice: 2499,
    popular: false,
    icon: SparklesIcon,
    color: 'from-blue-500 to-blue-600',
    lightColor: 'bg-blue-50',
    textColor: 'text-blue-600',
    metrics: {
      minutes: '500',
      numbers: '1',
      agents: '3',
      users: '5',
      leads: '2,500',
    },
    features: [
      'AI Voice Agents (English + Hindi)',
      'Click-to-Call & Auto Dialer',
      'Full CRM with Pipeline',
      'WhatsApp & SMS Integration',
      'Call Recording & Transcription',
      'Basic Reports & Dashboard',
    ],
    extraRate: 1.5,
  },
  {
    id: 'growth',
    name: 'Growth',
    subtitle: 'For growing sales teams',
    monthlyPrice: 7999,
    annualPrice: 6499,
    popular: true,
    icon: ChartBarIcon,
    color: 'from-primary-500 to-primary-600',
    lightColor: 'bg-primary-50',
    textColor: 'text-primary-600',
    metrics: {
      minutes: '2,000',
      numbers: '3',
      agents: '10',
      users: '15',
      leads: '10,000',
    },
    features: [
      'Everything in Starter',
      '10 Indian Languages Support',
      'Facebook & Google Ads Integration',
      'IndiaMART & JustDial Leads',
      'IVR Builder & Call Routing',
      'Advanced Analytics & Reports',
    ],
    extraRate: 1.2,
  },
  {
    id: 'business',
    name: 'Business',
    subtitle: 'For scaling organizations',
    monthlyPrice: 19999,
    annualPrice: 16999,
    popular: false,
    icon: UserGroupIcon,
    color: 'from-purple-500 to-purple-600',
    lightColor: 'bg-purple-50',
    textColor: 'text-purple-600',
    metrics: {
      minutes: '5,000',
      numbers: '10',
      agents: '25',
      users: '50',
      leads: '50,000',
    },
    features: [
      'Everything in Growth',
      'Custom Voice Cloning',
      'Workflow Automation',
      'Multi-Branch & Team Hierarchy',
      'Commission Management',
      'Dedicated Account Manager',
    ],
    extraRate: 1,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    subtitle: 'Custom solution for large teams',
    monthlyPrice: 0,
    annualPrice: 0,
    popular: false,
    customPricing: true,
    icon: ShieldCheckIcon,
    color: 'from-slate-700 to-slate-800',
    lightColor: 'bg-slate-100',
    textColor: 'text-slate-700',
    metrics: {
      minutes: 'Unlimited',
      numbers: 'Unlimited',
      agents: 'Unlimited',
      users: 'Unlimited',
      leads: 'Unlimited',
    },
    features: [
      'Everything in Business',
      'White Label & Custom Domain',
      'On-Premise Deployment Option',
      'Custom Integrations & API',
      'SLA with 99.9% Uptime',
      'Dedicated Success Team',
    ],
    extraRate: 0.8,
  },
];

// Comprehensive feature comparison organized by category
export const FEATURE_CATEGORIES: FeatureCategory[] = [
  {
    category: 'Usage & Limits',
    features: [
      { name: 'AI Voice Minutes/month', starter: '500', growth: '2,000', business: '5,000', enterprise: 'Unlimited' },
      { name: 'Phone Numbers', starter: '1', growth: '3', business: '10', enterprise: 'Unlimited' },
      { name: 'AI Voice Agents', starter: '3', growth: '10', business: '25', enterprise: 'Unlimited' },
      { name: 'Team Members', starter: '5', growth: '15', business: '50', enterprise: 'Unlimited' },
      { name: 'Lead Capacity', starter: '2,500', growth: '10,000', business: '50,000', enterprise: 'Unlimited' },
      { name: 'Concurrent Calls', starter: '2', growth: '10', business: '50', enterprise: 'Unlimited' },
      { name: 'WhatsApp Messages/month', starter: '1,000', growth: '5,000', business: '25,000', enterprise: 'Unlimited' },
      { name: 'SMS Credits/month', starter: '500', growth: '2,000', business: '10,000', enterprise: 'Unlimited' },
      { name: 'Extra Minute Rate', starter: '₹1.5', growth: '₹1.2', business: '₹1', enterprise: '₹0.8' },
    ],
  },
  {
    category: 'AI Voice Capabilities',
    features: [
      { name: 'AI Voice Agents', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Real-time Voice AI (OpenAI)', starter: true, growth: true, business: true, enterprise: true },
      { name: 'English & Hindi Support', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Indian Languages (10+)', starter: false, growth: true, business: true, enterprise: true },
      { name: 'AI4Bharat Integration', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Call Recording', starter: true, growth: true, business: true, enterprise: true },
      { name: 'AI Call Summary', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Real-time Transcription', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Sentiment Analysis', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Custom Voice Cloning (ElevenLabs)', starter: false, growth: false, business: true, enterprise: true },
      { name: 'Voice Mood Detection', starter: false, growth: false, business: true, enterprise: true },
      { name: 'Speaker Identification', starter: false, growth: false, business: true, enterprise: true },
    ],
  },
  {
    category: 'Call Management',
    features: [
      { name: 'Click-to-Call', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Auto Dialer', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Inbound Call Handling', starter: true, growth: true, business: true, enterprise: true },
      { name: 'IVR Builder', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Call Queue Management', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Call Transfer & Routing', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Voicemail System', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Call Monitoring (Listen/Whisper)', starter: false, growth: false, business: true, enterprise: true },
      { name: 'Call Flow Designer', starter: false, growth: false, business: true, enterprise: true },
      { name: 'Scheduled Calls', starter: false, growth: true, business: true, enterprise: true },
    ],
  },
  {
    category: 'CRM & Lead Management',
    features: [
      { name: 'Lead Management', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Deal Pipeline', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Contact Management', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Custom Stages & Statuses', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Follow-up Scheduling', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Task Management', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Notes & Activity Timeline', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Tags & Custom Fields', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Bulk Import (CSV/Excel)', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Lead Scoring (AI)', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Duplicate Detection', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Lead Assignment Rules', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Round Robin Distribution', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Workflow Automation', starter: false, growth: false, business: true, enterprise: true },
      { name: 'Approval Workflows', starter: false, growth: false, business: true, enterprise: true },
    ],
  },
  {
    category: 'Communication Channels',
    features: [
      { name: 'WhatsApp Integration', starter: true, growth: true, business: true, enterprise: true },
      { name: 'WhatsApp Templates', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Bulk WhatsApp', starter: false, growth: true, business: true, enterprise: true },
      { name: 'SMS Integration', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Bulk SMS (DLT Compliant)', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Email Integration', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Email Sequences', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Drip Campaigns', starter: false, growth: false, business: true, enterprise: true },
    ],
  },
  {
    category: 'Lead Source Integrations',
    features: [
      { name: 'Facebook Ads', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Google Ads', starter: false, growth: true, business: true, enterprise: true },
      { name: 'IndiaMART', starter: false, growth: true, business: true, enterprise: true },
      { name: 'JustDial', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Housing.com', starter: false, growth: true, business: true, enterprise: true },
      { name: '99acres', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Sulekha', starter: false, growth: true, business: true, enterprise: true },
      { name: 'TradeIndia', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Instagram Ads', starter: false, growth: true, business: true, enterprise: true },
      { name: 'LinkedIn Ads', starter: false, growth: false, business: true, enterprise: true },
      { name: 'Custom Webhooks', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Zapier Integration', starter: false, growth: false, business: true, enterprise: true },
    ],
  },
  {
    category: 'Campaigns & Automation',
    features: [
      { name: 'Campaign Management', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Campaign Limit', starter: '3', growth: '20', business: 'Unlimited', enterprise: 'Unlimited' },
      { name: 'Auto Follow-ups', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Scheduled Messaging', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Lead Source Tracking', starter: true, growth: true, business: true, enterprise: true },
    ],
  },
  {
    category: 'Reports & Analytics',
    features: [
      { name: 'Dashboard Overview', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Call Reports', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Lead Reports', starter: true, growth: true, business: true, enterprise: true },
      { name: 'User Performance Reports', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Campaign Analytics', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Business Trends Dashboard', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Deal Velocity Report', starter: false, growth: true, business: true, enterprise: true },
      { name: 'AI Usage Reports', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Commission Reports', starter: false, growth: false, business: true, enterprise: true },
      { name: 'Custom Report Builder', starter: false, growth: false, business: true, enterprise: true },
      { name: 'Scheduled Report Emails', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Export (PDF/Excel)', starter: true, growth: true, business: true, enterprise: true },
    ],
  },
  {
    category: 'Team & Organization',
    features: [
      { name: 'Role-Based Access', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Custom Roles & Permissions', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Team Hierarchy', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Multi-Branch Support', starter: false, growth: false, business: true, enterprise: true },
      { name: 'Commission Management', starter: false, growth: false, business: true, enterprise: true },
      { name: 'Incentive Tracking', starter: false, growth: false, business: true, enterprise: true },
      { name: 'Break Time Management', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Login & Activity Tracking', starter: false, growth: true, business: true, enterprise: true },
    ],
  },
  {
    category: 'Industry Solutions',
    features: [
      { name: 'Sales CRM', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Education CRM (Admissions)', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Real Estate CRM', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Field Sales Management', starter: false, growth: false, business: true, enterprise: true },
      { name: 'Visit & Expense Tracking', starter: false, growth: false, business: true, enterprise: true },
    ],
  },
  {
    category: 'Payments & Billing',
    features: [
      { name: 'Razorpay Integration', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Payment Links', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Invoice Generation', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Payment Tracking', starter: false, growth: true, business: true, enterprise: true },
    ],
  },
  {
    category: 'Security & Compliance',
    features: [
      { name: 'Data Encryption (AES-256)', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Two-Factor Authentication', starter: true, growth: true, business: true, enterprise: true },
      { name: 'DNC List Compliance', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Consent Management', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Audit Logs', starter: false, growth: true, business: true, enterprise: true },
      { name: 'SSO (SAML/OAuth)', starter: false, growth: false, business: false, enterprise: true },
      { name: 'IP Whitelisting', starter: false, growth: false, business: false, enterprise: true },
      { name: 'Custom Data Retention', starter: false, growth: false, business: false, enterprise: true },
    ],
  },
  {
    category: 'Platform & API',
    features: [
      { name: 'REST API Access', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Webhooks', starter: false, growth: true, business: true, enterprise: true },
      { name: 'API Rate Limit', starter: '-', growth: '1000/hr', business: '5000/hr', enterprise: 'Unlimited' },
      { name: 'White Label', starter: false, growth: false, business: false, enterprise: true },
      { name: 'Custom Domain', starter: false, growth: false, business: false, enterprise: true },
      { name: 'On-Premise Option', starter: false, growth: false, business: false, enterprise: true },
    ],
  },
  {
    category: 'Support',
    features: [
      { name: 'Email Support', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Chat Support', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Phone Support', starter: false, growth: false, business: true, enterprise: true },
      { name: 'Dedicated Account Manager', starter: false, growth: false, business: true, enterprise: true },
      { name: 'Onboarding Training', starter: '1 session', growth: '3 sessions', business: '5 sessions', enterprise: 'Unlimited' },
      { name: 'Response Time SLA', starter: '48 hrs', growth: '24 hrs', business: '4 hrs', enterprise: '1 hr' },
      { name: 'Uptime SLA', starter: '99%', growth: '99.5%', business: '99.9%', enterprise: '99.99%' },
    ],
  },
];

// Flattened feature comparison for simple display
export const FEATURE_COMPARISON: SimplePlanFeature[] = FEATURE_CATEGORIES.flatMap(cat => cat.features);

// Add-ons for extra capacity
export const ADD_ONS: AddOn[] = [
  {
    id: 'voice-minutes-1000',
    name: '1,000 AI Voice Minutes',
    description: 'Additional minutes for AI voice calls',
    price: 999,
    unit: 'one-time',
    popular: true,
  },
  {
    id: 'voice-minutes-5000',
    name: '5,000 AI Voice Minutes',
    description: 'Bulk minutes pack with 20% savings',
    price: 3999,
    unit: 'one-time',
    popular: true,
  },
  {
    id: 'extra-phone-number',
    name: 'Additional Phone Number',
    description: 'Add more phone numbers for campaigns',
    price: 299,
    unit: 'per month',
  },
  {
    id: 'extra-users-5',
    name: '5 Additional Users',
    description: 'Add more team members',
    price: 999,
    unit: 'per month',
  },
  {
    id: 'extra-agents-5',
    name: '5 Additional AI Agents',
    description: 'Create more AI voice agents',
    price: 499,
    unit: 'per month',
  },
  {
    id: 'whatsapp-5000',
    name: '5,000 WhatsApp Messages',
    description: 'Additional WhatsApp message credits',
    price: 499,
    unit: 'one-time',
  },
  {
    id: 'sms-2000',
    name: '2,000 SMS Credits',
    description: 'Additional SMS credits (DLT compliant)',
    price: 399,
    unit: 'one-time',
  },
  {
    id: 'custom-voice-clone',
    name: 'Custom Voice Clone',
    description: 'Create your brand voice with ElevenLabs',
    price: 4999,
    unit: 'one-time setup',
  },
  {
    id: 'indian-languages',
    name: 'Indian Languages Pack',
    description: 'Add AI4Bharat support for 10+ Indian languages',
    price: 1999,
    unit: 'per month',
  },
  {
    id: 'lead-integrations',
    name: 'Lead Integrations Pack',
    description: 'Facebook, Google, IndiaMART, JustDial & more',
    price: 1499,
    unit: 'per month',
  },
  {
    id: 'advanced-analytics',
    name: 'Advanced Analytics',
    description: 'Business trends, custom reports & dashboards',
    price: 999,
    unit: 'per month',
  },
  {
    id: 'dedicated-support',
    name: 'Priority Support',
    description: '4-hour response time with dedicated manager',
    price: 2999,
    unit: 'per month',
  },
];

export const FAQ_ITEMS: FAQItem[] = [
  {
    q: 'What are AI Voice Minutes?',
    a: 'AI Voice Minutes are the time your AI agents spend on calls. This includes both inbound and outbound calls handled by AI. Human agent calls don\'t count against your minutes.',
  },
  {
    q: 'Which Indian languages are supported?',
    a: 'With AI4Bharat integration, we support Hindi, Telugu, Tamil, Kannada, Malayalam, Bengali, Gujarati, Marathi, Punjabi, and Odia. English is available on all plans.',
  },
  {
    q: 'Can I integrate with my existing lead sources?',
    a: 'Yes! Growth and above plans include integrations with Facebook Ads, Google Ads, IndiaMART, JustDial, Housing.com, 99acres, and more. Custom webhooks allow any lead source integration.',
  },
  {
    q: 'How does billing work?',
    a: 'You can choose monthly or annual billing (20% discount). Prices are in INR excluding GST. Add-ons can be purchased anytime and are billed separately.',
  },
  {
    q: 'Is there a free trial?',
    a: 'Yes! All plans include a 14-day free trial with full features. No credit card required to start. We\'ll help you set up during the trial.',
  },
  {
    q: 'What happens if I exceed my limits?',
    a: 'You\'ll receive alerts at 80% usage. You can purchase add-on packs anytime or upgrade your plan. Services continue uninterrupted.',
  },
  {
    q: 'Can I change plans later?',
    a: 'Yes, you can upgrade anytime and the difference is prorated. Downgrades take effect at the next billing cycle.',
  },
  {
    q: 'Is my data secure?',
    a: 'Absolutely. We use AES-256 encryption, secure data centers, and comply with data protection regulations. Enterprise plans include additional security features like SSO and IP whitelisting.',
  },
  {
    q: 'Do you offer custom enterprise solutions?',
    a: 'Yes! Enterprise plans are fully customizable including on-premise deployment, custom integrations, white labeling, and dedicated support teams. Contact us for a custom quote.',
  },
  {
    q: 'What support is included?',
    a: 'All plans include email support. Growth adds chat support, Business adds phone support with a dedicated account manager, and Enterprise includes a dedicated success team with 1-hour SLA.',
  },
];

export const TRUST_BADGES: TrustBadge[] = [
  { value: '500+', label: 'Active Businesses' },
  { value: '2M+', label: 'AI Calls Handled' },
  { value: '10+', label: 'Indian Languages' },
  { value: '30+', label: 'Integrations' },
];

export const PLAN_TIERS = ['starter', 'growth', 'business', 'enterprise'] as const;

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}
