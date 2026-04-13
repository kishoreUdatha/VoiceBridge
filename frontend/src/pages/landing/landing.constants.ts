/**
 * Landing Page Constants
 */

import {
  Bot,
  MessageSquare,
  IndianRupee,
  GraduationCap,
  Home,
  Briefcase,
  ShoppingBag,
  PhoneCall,
  Send,
  Mail,
  Database,
  Target,
  Headphones,
  FileText,
  Globe,
  PieChart,
  Zap,
  Calendar,
  Code,
  Shield,
  Building2,
  Workflow,
  Languages,
  ShieldCheck,
  Users,
  Store,
  Palette,
  GitBranch,
  Brain,
  Search,
} from 'lucide-react';
import { Stat, Differentiator, Industry, Feature, PricingTier, Step, FooterSection } from './landing.types';

export const STATS: Stat[] = [
  { value: '2M+', label: 'AI Calls Made', color: 'text-blue-600' },
  { value: '500+', label: 'Active Businesses', color: 'text-green-600' },
  { value: '10+', label: 'Indian Languages', color: 'text-purple-600' },
  { value: '30+', label: 'Integrations', color: 'text-orange-600' },
];

export const DIFFERENTIATORS: Differentiator[] = [
  {
    id: 'ai-calls',
    icon: Bot,
    title: 'AI Calls Built-In',
    description: 'No need to integrate Qcall.ai, Exotel IVR, or any third-party AI calling service. Our AI agents make calls directly from the CRM.',
    features: ['Natural voice conversations', '24/7 automated outreach', 'Real-time transcription'],
    gradient: 'from-blue-50 to-blue-100',
    iconBg: 'bg-blue-600',
    checkColor: 'text-blue-600',
  },
  {
    id: 'all-channels',
    icon: MessageSquare,
    title: 'All Channels, One Place',
    description: 'Stop switching between WhatsApp Business, SMS gateways, and email tools. Everything is unified in one dashboard.',
    features: ['WhatsApp bulk + templates', 'SMS with delivery tracking', 'Email campaigns + automation'],
    gradient: 'from-green-50 to-green-100',
    iconBg: 'bg-green-600',
    checkColor: 'text-green-600',
  },
  {
    id: 'made-for-india',
    icon: IndianRupee,
    title: 'Made for India',
    description: 'Built specifically for Indian businesses with local integrations, INR pricing, and TRAI compliance.',
    features: ['Exotel, Wati, Gupshup ready', 'DNC/TRAI compliance', 'UPI & Indian payment support'],
    gradient: 'from-orange-50 to-orange-100',
    iconBg: 'bg-orange-600',
    checkColor: 'text-orange-600',
  },
  {
    id: 'partner-platform',
    icon: Users,
    title: 'Partner & White Label',
    description: 'Launch your own branded AI calling platform. Perfect for agencies, resellers, and enterprises.',
    features: ['White label branding', 'Partner commissions', 'Multi-tenant architecture'],
    gradient: 'from-purple-50 to-purple-100',
    iconBg: 'bg-purple-600',
    checkColor: 'text-purple-600',
  },
];

export const INDUSTRIES: Industry[] = [
  {
    id: 'education',
    icon: GraduationCap,
    title: 'Education',
    description: 'Universities, colleges, coaching centers, and EdTech companies',
    features: ['Admission inquiry calls', 'Course information via WhatsApp', 'Counselor assignment'],
    iconBg: 'bg-blue-100',
    hoverBg: 'group-hover:bg-blue-600',
  },
  {
    id: 'real-estate',
    icon: Home,
    title: 'Real Estate',
    description: 'Builders, brokers, and property portals',
    features: ['Site visit scheduling', 'Property details on WhatsApp', 'Lead from 99acres, MagicBricks'],
    iconBg: 'bg-green-100',
    hoverBg: 'group-hover:bg-green-600',
  },
  {
    id: 'insurance-finance',
    icon: Briefcase,
    title: 'Insurance & Finance',
    description: 'Insurance agents, loan DSAs, and financial advisors',
    features: ['Policy renewal reminders', 'Loan eligibility calls', 'Document collection via WhatsApp'],
    iconBg: 'bg-purple-100',
    hoverBg: 'group-hover:bg-purple-600',
  },
  {
    id: 'd2c-ecommerce',
    icon: ShoppingBag,
    title: 'D2C & E-commerce',
    description: 'Online brands and e-commerce stores',
    features: ['Cart abandonment calls', 'Order updates on WhatsApp', 'COD confirmation calls'],
    iconBg: 'bg-orange-100',
    hoverBg: 'group-hover:bg-orange-600',
  },
];

export const FEATURES: Feature[] = [
  // AI & Voice Features
  { id: 'ai-voice', icon: Bot, title: 'AI Voice Agents', description: 'Natural conversations that qualify leads 24/7', iconColor: 'text-blue-600', hoverBg: 'hover:bg-blue-50' },
  { id: 'conversational-ai', icon: Brain, title: 'Conversational AI', description: 'Advanced AI agents with custom logic & RAG', iconColor: 'text-blue-700', hoverBg: 'hover:bg-blue-50' },
  { id: 'auto-calling', icon: PhoneCall, title: 'Automated Calling', description: 'Make thousands of calls simultaneously', iconColor: 'text-blue-600', hoverBg: 'hover:bg-blue-50' },
  { id: 'ivr-builder', icon: GitBranch, title: 'IVR & Call Flows', description: 'Visual drag-drop call flow builder', iconColor: 'text-blue-500', hoverBg: 'hover:bg-blue-50' },

  // Messaging Features
  { id: 'whatsapp', icon: MessageSquare, title: 'WhatsApp Campaigns', description: 'Bulk messaging with templates & media', iconColor: 'text-green-600', hoverBg: 'hover:bg-green-50' },
  { id: 'sms', icon: Send, title: 'SMS Campaigns', description: 'Instant delivery with tracking', iconColor: 'text-purple-600', hoverBg: 'hover:bg-purple-50' },
  { id: 'email', icon: Mail, title: 'Email Marketing', description: 'Automated sequences & templates', iconColor: 'text-red-600', hoverBg: 'hover:bg-red-50' },

  // Lead Management
  { id: 'database', icon: Database, title: 'Lead Database', description: 'Store & organize unlimited leads', iconColor: 'text-yellow-600', hoverBg: 'hover:bg-yellow-50' },
  { id: 'scoring', icon: Target, title: 'AI Lead Scoring', description: 'Prioritize hot leads automatically', iconColor: 'text-orange-600', hoverBg: 'hover:bg-orange-50' },
  { id: 'lifecycle', icon: Workflow, title: 'Lead Lifecycle', description: 'Automated stage progression & nurturing', iconColor: 'text-amber-600', hoverBg: 'hover:bg-amber-50' },
  { id: 'data-scraping', icon: Search, title: 'Data Enrichment', description: 'Apify integration for lead scraping', iconColor: 'text-yellow-700', hoverBg: 'hover:bg-yellow-50' },

  // Team & Operations
  { id: 'telecaller', icon: Headphones, title: 'Telecaller App', description: 'Dedicated app with smart queue', iconColor: 'text-cyan-600', hoverBg: 'hover:bg-cyan-50' },
  { id: 'multilang', icon: Languages, title: 'Multi-language', description: 'Support for regional languages', iconColor: 'text-cyan-500', hoverBg: 'hover:bg-cyan-50' },

  // Forms & Pages
  { id: 'forms', icon: FileText, title: 'Custom Forms', description: 'Drag-drop form builder', iconColor: 'text-indigo-600', hoverBg: 'hover:bg-indigo-50' },
  { id: 'landing', icon: Globe, title: 'Landing Pages', description: 'Beautiful pages with templates', iconColor: 'text-teal-600', hoverBg: 'hover:bg-teal-50' },

  // Analytics & Automation
  { id: 'analytics', icon: PieChart, title: 'Real-time Analytics', description: 'Track calls, conversions, ROI', iconColor: 'text-pink-600', hoverBg: 'hover:bg-pink-50' },
  { id: 'automation', icon: Zap, title: 'Workflow Automation', description: 'Auto follow-ups & assignments', iconColor: 'text-violet-600', hoverBg: 'hover:bg-violet-50' },
  { id: 'calendar', icon: Calendar, title: 'Appointment Booking', description: 'Schedule demos & meetings', iconColor: 'text-emerald-600', hoverBg: 'hover:bg-emerald-50' },

  // Compliance & Security
  { id: 'compliance', icon: ShieldCheck, title: 'Compliance Dashboard', description: 'DNC, consent & audit management', iconColor: 'text-rose-600', hoverBg: 'hover:bg-rose-50' },
  { id: 'security', icon: Shield, title: 'Enterprise Security', description: 'SSO, encryption, role-based access', iconColor: 'text-rose-700', hoverBg: 'hover:bg-rose-50' },

  // Integrations & Platform
  { id: 'social', icon: Building2, title: 'Social Media Ads', description: 'FB, Google, LinkedIn, Instagram & more', iconColor: 'text-sky-600', hoverBg: 'hover:bg-sky-50' },
  { id: 'api', icon: Code, title: 'REST API', description: 'Integrate with any system', iconColor: 'text-slate-600', hoverBg: 'hover:bg-slate-100' },
  { id: 'marketplace', icon: Store, title: 'Agent Marketplace', description: 'Pre-built AI agents & templates', iconColor: 'text-sky-500', hoverBg: 'hover:bg-sky-50' },
  { id: 'whitelabel', icon: Palette, title: 'White Label', description: 'Launch your own branded platform', iconColor: 'text-purple-600', hoverBg: 'hover:bg-purple-50' },
];

export const PRICING_TIERS: PricingTier[] = [
  { id: 'starter', name: 'Starter', price: '₹2,999', period: '/mo', description: '500 AI mins, 5 users', link: '/register?plan=starter' },
  { id: 'growth', name: 'Growth', price: '₹7,999', period: '/mo', description: '2,000 AI mins, 15 users', isPopular: true, link: '/register?plan=growth' },
  { id: 'business', name: 'Business', price: '₹19,999', period: '/mo', description: '5,000 AI mins, 50 users', link: '/register?plan=business' },
  { id: 'enterprise', name: 'Enterprise', price: 'Custom', description: 'Unlimited, white label', link: '/pricing' },
];

export const STEPS: Step[] = [
  { number: 1, title: 'Sign Up Free', description: 'Create your account in 2 minutes. No credit card required.' },
  { number: 2, title: 'Import Leads', description: 'Upload CSV, connect forms, or capture from ads.' },
  { number: 3, title: 'Start Converting', description: 'Let AI call, WhatsApp, and nurture your leads.' },
];

export const FOOTER_SECTIONS: FooterSection[] = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Industries', href: '#industries' },
      { label: 'Marketplace', href: '/marketplace' },
      { label: 'API Docs', href: '/api-keys/docs' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', href: '/docs' },
      { label: 'Getting Started', href: '/docs' },
      { label: 'User Guide', href: '/docs' },
      { label: 'Video Tutorials', href: '/docs' },
    ],
  },
  {
    title: 'Partners',
    links: [
      { label: 'Partner Program', href: '/partner/apply' },
      { label: 'White Label', href: '/partner' },
      { label: 'Reseller Portal', href: '/partner' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '#' },
      { label: 'Terms of Service', href: '#' },
      { label: 'TRAI Compliance', href: '#' },
    ],
  },
];
