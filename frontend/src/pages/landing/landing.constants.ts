/**
 * Landing Page Constants - Modern AI Theme
 */

import { Stat, Feature, Step, Industry, PricingTier, FooterSection } from './landing.types';

export const STATS: Stat[] = [
  { value: '500+', label: 'Active Businesses' },
  { value: '2M+', label: 'AI Calls Made' },
  { value: '45%', label: 'Avg. Conversion Lift' },
  { value: '10+', label: 'Indian Languages' },
];

export const FEATURES: Feature[] = [
  {
    icon: 'Bot',
    title: 'AI Voice Agents',
    description: 'Deploy intelligent AI agents that call, qualify, and nurture leads 24/7. Natural conversations in English, Hindi, and 10+ Indian languages.',
  },
  {
    icon: 'Phone',
    title: 'Smart Auto Dialer',
    description: 'Automatically dial through your lead list with intelligent pacing. Skip busy signals, detect voicemails, and maximize connect rates.',
  },
  {
    icon: 'MessageSquare',
    title: 'WhatsApp & SMS',
    description: 'Reach leads on their preferred channel. Send bulk campaigns, automated follow-ups, and personalized messages at scale.',
  },
  {
    icon: 'BarChart3',
    title: 'Real-time Analytics',
    description: 'Track every call, conversion, and revenue metric. AI-powered insights help you optimize campaigns and close more deals.',
  },
  {
    icon: 'Users',
    title: 'Full CRM Suite',
    description: 'Manage leads, deals, and customers in one place. Custom pipelines, task automation, and team collaboration built-in.',
  },
  {
    icon: 'Zap',
    title: 'Instant Integrations',
    description: 'Connect with Facebook Ads, Google Ads, IndiaMART, JustDial, and 30+ platforms. Auto-import leads in real-time.',
  },
];

export const HOW_IT_WORKS: Step[] = [
  {
    title: 'Import Your Leads',
    description: 'Upload CSV, connect your ad accounts, or integrate with your existing tools. All leads flow into one dashboard.',
  },
  {
    title: 'Configure AI Agent',
    description: 'Choose voice, language, and script. Train your AI on your product in minutes. No coding required.',
  },
  {
    title: 'Watch AI Close Deals',
    description: 'AI calls leads, qualifies them, books meetings, and hands off hot leads to your team. You focus on closing.',
  },
];

export const INDUSTRIES: Industry[] = [
  {
    icon: '🎓',
    name: 'Education',
    description: 'Admission campaigns, course inquiries, and student follow-ups automated.',
  },
  {
    icon: '🏠',
    name: 'Real Estate',
    description: 'Property inquiries, site visit scheduling, and buyer qualification.',
  },
  {
    icon: '🛡️',
    name: 'Insurance',
    description: 'Policy renewals, lead qualification, and claim follow-ups.',
  },
  {
    icon: '🛒',
    name: 'E-commerce',
    description: 'Order confirmations, COD verification, and cart recovery calls.',
  },
  {
    icon: '🏥',
    name: 'Healthcare',
    description: 'Appointment reminders, patient follow-ups, and health campaigns.',
  },
  {
    icon: '💰',
    name: 'Financial Services',
    description: 'Loan applications, KYC verification, and payment reminders.',
  },
  {
    icon: '🚗',
    name: 'Automotive',
    description: 'Test drive bookings, service reminders, and sales follow-ups.',
  },
  {
    icon: '✈️',
    name: 'Travel',
    description: 'Booking confirmations, itinerary updates, and travel inquiries.',
  },
];

export const TESTIMONIALS = [
  {
    quote: 'MyLeadX AI agents handle 500+ calls daily for us. Our conversion rate jumped from 8% to 23% in just 2 months.',
    author: 'Rajesh Kumar',
    role: 'Sales Director',
    company: 'EduTech Solutions',
  },
  {
    quote: 'The WhatsApp integration alone saved us 4 hours daily. Now our team focuses on closing instead of chasing leads.',
    author: 'Priya Sharma',
    role: 'Head of Sales',
    company: 'PropMart Realty',
  },
  {
    quote: 'Best investment for our insurance agency. AI qualifies leads before our agents even pick up the phone.',
    author: 'Amit Patel',
    role: 'Agency Owner',
    company: 'SecureLife Insurance',
  },
];

export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'growth',
    name: 'Growth',
    price: '₹7,999',
    description: 'For growing sales teams',
    highlighted: false,
    link: '/pricing',
  },
  {
    id: 'scale',
    name: 'Scale',
    price: '₹19,999',
    description: 'For high-volume operations',
    highlighted: true,
    link: '/pricing',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    description: 'For large organizations',
    highlighted: false,
    link: '/pricing',
  },
];

export const FOOTER_SECTIONS: FooterSection[] = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '/#features' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Integrations', href: '/docs' },
      { label: 'API', href: '/docs' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', href: '/docs' },
      { label: 'Blog', href: '/docs' },
      { label: 'Support', href: 'mailto:support@myleadx.ai' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy-policy' },
      { label: 'Terms of Service', href: '/terms-of-service' },
    ],
  },
];
