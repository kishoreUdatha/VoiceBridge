/**
 * Industry Detail Page - Public pages for each industry
 * Rich content with use cases, features, and testimonials
 */
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  GraduationCap,
  Home,
  Shield,
  Briefcase,
  Headphones,
  Play,
  Sparkles,
  Zap,
  Star,
  ChevronDown,
  Award,
  Users,
  Target,
  TrendingUp,
  BarChart3,
  PhoneCall,
  Phone,
  Bot,
  Clock,
  CheckCircle,
  Building2,
  MapPin,
  Calendar,
  FileText,
  MessageSquare,
  Globe,
  Layers,
  Settings,
  Bell,
  Mail,
  Database,
  PieChart,
  Activity,
  Workflow,
  Brain,
  CreditCard,
  DollarSign,
  Percent,
  UserCheck,
  ClipboardList,
  Smartphone,
  Mic,
  Volume2,
  RefreshCw,
  Send,
  Heart,
  Stethoscope,
  Car,
  ShoppingCart,
  Landmark,
  Banknote,
  Route,
} from 'lucide-react';
import { Navigation as Nav, Footer } from '../landing/components/LandingComponents';

// Industry data with comprehensive details
const INDUSTRIES_DATA: Record<string, {
  title: string;
  subtitle: string;
  description: string;
  longDescription: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  heroImage: string;
  stats: { value: string; label: string }[];
  pipelineStages: string[];
  integrations: string[];
  beforeAfter: { metric: string; before: string; after: string }[];
  faqs: { question: string; answer: string }[];
  challenges: { title: string; description: string; icon: React.ComponentType<{ className?: string }> }[];
  solutions: { title: string; description: string; icon: React.ComponentType<{ className?: string }> }[];
  features: { title: string; description: string; icon: React.ComponentType<{ className?: string }> }[];
  useCases: { title: string; description: string }[];
  benefits: { value: string; label: string }[];
  testimonial: { quote: string; author: string; role: string; company: string };
}> = {
  'education': {
    title: 'Education & EdTech',
    subtitle: 'Admissions CRM for Schools, Colleges & EdTech',
    description: 'Streamline student admissions with AI-powered lead management.',
    longDescription: 'Transform your admissions process with MyLeadX. From inquiry to enrollment, manage the entire student journey with AI-powered automation. Our education CRM helps schools, colleges, universities, and EdTech companies increase enrollments while reducing manual work.',
    icon: GraduationCap,
    gradient: 'from-blue-500 to-indigo-600',
    heroImage: '/screenshots/02-dashboard.png',
    stats: [
      { value: '500+', label: 'Institutions' },
      { value: '2M+', label: 'Students Enrolled' },
      { value: '45%', label: 'Higher Conversion' },
      { value: '60%', label: 'Time Saved' },
    ],
    pipelineStages: ['Inquiry', 'Campus Visit', 'Application', 'Documents', 'Fee Paid', 'Enrolled'],
    integrations: ['WhatsApp', 'Facebook Ads', 'Google Ads', 'JustDial', 'Shiksha', 'CollegeDunia', 'Razorpay', 'Gmail'],
    beforeAfter: [
      { metric: 'Response Time', before: '24 hours', after: '5 minutes' },
      { metric: 'Counselor Calls/Day', before: '30 calls', after: '80 calls' },
      { metric: 'Admission Conversion', before: '8%', after: '23%' },
      { metric: 'Follow-up Rate', before: '40%', after: '95%' },
    ],
    faqs: [
      { question: 'Can MyLeadX handle multiple campuses?', answer: 'Yes, MyLeadX supports multi-branch management. You can track leads, admissions, and counselor performance separately for each campus while having a unified dashboard for the management.' },
      { question: 'Does it integrate with our existing student management system?', answer: 'MyLeadX integrates with popular SMS platforms via API and webhooks. Once a student is enrolled, data can be automatically synced to your existing system.' },
      { question: 'How does AI calling work for admissions?', answer: 'Our AI voice agents can make initial screening calls in Hindi, English, and regional languages. They qualify leads by asking about course interest, budget, and timeline, then transfer hot leads to counselors.' },
    ],
    challenges: [
      { title: 'High Volume Inquiries', description: 'Thousands of inquiries during admission season overwhelm counselors', icon: Users },
      { title: 'Slow Response Time', description: 'Delayed responses lead to losing students to competitors', icon: Clock },
      { title: 'Manual Follow-ups', description: 'Counselors spend hours on repetitive follow-up calls', icon: PhoneCall },
      { title: 'No Visibility', description: 'Management lacks real-time visibility into admission pipeline', icon: BarChart3 },
    ],
    solutions: [
      { title: 'AI Voice Agents', description: 'Automated calls in Hindi, English & regional languages for initial screening', icon: Bot },
      { title: 'Instant Response', description: 'Auto-respond to inquiries via WhatsApp, SMS & calls within seconds', icon: Zap },
      { title: 'Smart Lead Scoring', description: 'AI prioritizes high-intent students based on engagement', icon: Brain },
      { title: 'Real-time Dashboard', description: 'Track admissions pipeline, counselor performance & revenue', icon: PieChart },
    ],
    features: [
      { title: 'Admission Pipeline', description: 'Visual Kanban board for Inquiry → Application → Document → Fee → Enrolled', icon: Layers },
      { title: 'Course Management', description: 'Manage courses, fees, eligibility criteria & seat availability', icon: GraduationCap },
      { title: 'Campus Visit Scheduling', description: 'Let students book campus visits with automatic reminders', icon: Calendar },
      { title: 'Fee Collection', description: 'Accept fees online with payment links via WhatsApp/SMS', icon: CreditCard },
      { title: 'Document Collection', description: 'Collect & verify documents digitally with status tracking', icon: FileText },
      { title: 'Counselor Performance', description: 'Track calls made, conversions & revenue per counselor', icon: Activity },
    ],
    useCases: [
      { title: 'Schools & K-12', description: 'Manage admissions for multiple grades with parent communication' },
      { title: 'Colleges & Universities', description: 'Handle high-volume applications with course-wise tracking' },
      { title: 'Coaching Institutes', description: 'Convert inquiries to enrollments for competitive exam prep' },
      { title: 'EdTech Platforms', description: 'Scale online course sales with AI-powered calling' },
    ],
    benefits: [
      { value: '3x', label: 'More Enrollments' },
      { value: '50%', label: 'Faster Admissions' },
      { value: '80%', label: 'Auto Follow-ups' },
      { value: '100%', label: 'Fee Tracking' },
    ],
    testimonial: {
      quote: 'MyLeadX transformed our admission process. We enrolled 40% more students this year with the same team size. The AI calling feature alone saved us 100+ hours of manual work.',
      author: 'Dr. Priya Sharma',
      role: 'Director of Admissions',
      company: 'Delhi Public School Group',
    },
  },
  'real-estate': {
    title: 'Real Estate',
    subtitle: 'CRM for Builders, Brokers & Property Developers',
    description: 'Convert property inquiries to site visits and bookings.',
    longDescription: 'Close more property deals with MyLeadX real estate CRM. Manage leads from multiple portals (99acres, Housing, MagicBricks), schedule site visits, track inventory, and automate follow-ups. Perfect for builders, brokers, and real estate agencies.',
    icon: Home,
    gradient: 'from-emerald-500 to-teal-600',
    heroImage: '/screenshots/02-dashboard.png',
    stats: [
      { value: '300+', label: 'Developers' },
      { value: '₹5000Cr+', label: 'Deals Closed' },
      { value: '35%', label: 'More Site Visits' },
      { value: '2x', label: 'Faster Closures' },
    ],
    pipelineStages: ['Inquiry', 'Site Visit', 'Negotiation', 'Token', 'Agreement', 'Registration'],
    integrations: ['99acres', 'Housing.com', 'MagicBricks', 'CommonFloor', 'Facebook Ads', 'Google Ads', 'WhatsApp', 'Razorpay'],
    beforeAfter: [
      { metric: 'Site Visit Rate', before: '15%', after: '40%' },
      { metric: 'Lead Response Time', before: '6 hours', after: '10 minutes' },
      { metric: 'No-show Rate', before: '50%', after: '15%' },
      { metric: 'Sales Cycle', before: '90 days', after: '60 days' },
    ],
    faqs: [
      { question: 'Can I import leads from property portals automatically?', answer: 'Yes, MyLeadX integrates with 99acres, Housing.com, MagicBricks, and other portals. Leads are automatically captured and assigned to sales reps based on project, location, or budget.' },
      { question: 'How do you handle site visit scheduling?', answer: 'Our system allows online booking of site visits with calendar integration. AI calls confirm visits 24 hours before and sends WhatsApp reminders, reducing no-shows by 70%.' },
      { question: 'Can I track inventory and unit availability?', answer: 'Yes, you can manage multiple projects with floor-wise unit inventory, pricing, and availability status. Sales reps see real-time availability during client conversations.' },
    ],
    challenges: [
      { title: 'Multiple Lead Sources', description: 'Leads from 99acres, Housing, MagicBricks scattered everywhere', icon: Globe },
      { title: 'Site Visit No-Shows', description: 'Scheduled visits often result in no-shows', icon: MapPin },
      { title: 'Inventory Tracking', description: 'Difficulty tracking available units across projects', icon: Building2 },
      { title: 'Long Sales Cycle', description: 'Property decisions take months with multiple stakeholders', icon: Clock },
    ],
    solutions: [
      { title: 'Unified Lead Inbox', description: 'All portal leads auto-captured in one dashboard', icon: Database },
      { title: 'AI Calling for Visits', description: 'AI confirms site visits and sends reminders', icon: Bot },
      { title: 'Unit Inventory', description: 'Real-time inventory with floor plans & pricing', icon: Layers },
      { title: 'Automated Nurturing', description: 'Multi-month follow-up sequences for long cycles', icon: RefreshCw },
    ],
    features: [
      { title: 'Property Listings', description: 'Manage multiple projects with units, pricing & availability', icon: Building2 },
      { title: 'Site Visit Management', description: 'Schedule, confirm & track site visits with agent assignment', icon: MapPin },
      { title: 'Booking Management', description: 'Handle token, agreement, registration & possession stages', icon: ClipboardList },
      { title: 'Brokerage Tracking', description: 'Calculate & track broker commissions automatically', icon: Percent },
      { title: 'Customer Portal', description: 'Let buyers view payment schedule & construction updates', icon: Users },
      { title: 'Portal Integration', description: '99acres, Housing, MagicBricks, CommonFloor auto-sync', icon: Globe },
    ],
    useCases: [
      { title: 'Builders & Developers', description: 'Manage sales for multiple residential/commercial projects' },
      { title: 'Real Estate Brokers', description: 'Handle client relationships across properties' },
      { title: 'Property Agencies', description: 'Scale team operations with lead distribution' },
      { title: 'Plot Developers', description: 'Manage land sales with plot inventory' },
    ],
    benefits: [
      { value: '40%', label: 'More Site Visits' },
      { value: '25%', label: 'Higher Conversion' },
      { value: '0', label: 'Lost Leads' },
      { value: '100%', label: 'Inventory Visibility' },
    ],
    testimonial: {
      quote: 'We integrated 5 property portals and now all leads come to one place. Site visit conversions improved by 35% with AI confirmation calls.',
      author: 'Rajesh Agarwal',
      role: 'Sales Director',
      company: 'Prestige Properties',
    },
  },
  'insurance': {
    title: 'Insurance & BFSI',
    subtitle: 'CRM for Insurance Agents & Financial Advisors',
    description: 'Manage policies, renewals, and client relationships.',
    longDescription: 'Grow your insurance business with MyLeadX. Track policies, automate renewal reminders, manage claims, and nurture leads through the sales cycle. Built for insurance agents, brokers, and financial services companies.',
    icon: Shield,
    gradient: 'from-purple-500 to-violet-600',
    heroImage: '/screenshots/02-dashboard.png',
    stats: [
      { value: '200+', label: 'Agencies' },
      { value: '₹1000Cr+', label: 'Premiums Managed' },
      { value: '95%', label: 'Renewal Rate' },
      { value: '3x', label: 'Policy Sales' },
    ],
    pipelineStages: ['Lead', 'Need Analysis', 'Quote', 'Proposal', 'Documents', 'Policy Issued'],
    integrations: ['WhatsApp', 'Gmail', 'PolicyBazaar', 'Razorpay', 'Tally', 'Google Calendar', 'SMS Gateway', 'DigiLocker'],
    beforeAfter: [
      { metric: 'Renewal Rate', before: '70%', after: '95%' },
      { metric: 'Policy Lapse', before: '25%', after: '5%' },
      { metric: 'Cross-sell Rate', before: '10%', after: '35%' },
      { metric: 'Commission Tracking', before: 'Manual', after: 'Automated' },
    ],
    faqs: [
      { question: 'How do renewal reminders work?', answer: 'MyLeadX automatically tracks policy expiry dates and triggers multi-channel reminders (AI calls, WhatsApp, SMS) at 30, 15, and 7 days before renewal. You can customize the reminder schedule.' },
      { question: 'Can I track commissions for different policy types?', answer: 'Yes, you can set up commission structures for each insurance company and policy type. The system automatically calculates expected and received commissions with reconciliation reports.' },
      { question: 'Is client data secure and compliant?', answer: 'MyLeadX is compliant with data protection regulations. All data is encrypted, access is role-based, and we maintain complete audit trails for regulatory compliance.' },
    ],
    challenges: [
      { title: 'Missed Renewals', description: 'Policies lapse due to missed renewal follow-ups', icon: Clock },
      { title: 'Manual Tracking', description: 'Spreadsheets for policies, claims & commissions', icon: FileText },
      { title: 'Lead Nurturing', description: 'Insurance decisions need multiple touchpoints', icon: RefreshCw },
      { title: 'Compliance', description: 'Maintaining records for regulatory compliance', icon: Shield },
    ],
    solutions: [
      { title: 'Auto Renewal Alerts', description: 'AI calls clients 30/15/7 days before renewal', icon: Bell },
      { title: 'Policy Management', description: 'Track all policies with premium, coverage & expiry', icon: FileText },
      { title: 'Drip Campaigns', description: 'Educational content sequences for insurance awareness', icon: Mail },
      { title: 'Audit Trail', description: 'Complete history of all client interactions', icon: ClipboardList },
    ],
    features: [
      { title: 'Policy Dashboard', description: 'View all policies by type, status, premium & renewal date', icon: PieChart },
      { title: 'Quotation Builder', description: 'Generate policy quotes with coverage options', icon: FileText },
      { title: 'Renewal Pipeline', description: 'Visual pipeline for upcoming renewals with priority', icon: Layers },
      { title: 'Claims Tracking', description: 'Track claim status from filing to settlement', icon: ClipboardList },
      { title: 'Commission Calculator', description: 'Automatic commission calculation by policy type', icon: Percent },
      { title: 'Family Mapping', description: 'Track family relationships for cross-selling', icon: Users },
    ],
    useCases: [
      { title: 'Life Insurance', description: 'Manage policies, nominations & maturity tracking' },
      { title: 'Health Insurance', description: 'Handle renewals, claims & cashless network' },
      { title: 'General Insurance', description: 'Motor, home, travel insurance management' },
      { title: 'Mutual Funds & SIP', description: 'Track investments, NAV & SIP schedules' },
    ],
    benefits: [
      { value: '95%', label: 'Renewal Rate' },
      { value: '50%', label: 'Time Saved' },
      { value: '2x', label: 'Cross-selling' },
      { value: '100%', label: 'Compliance' },
    ],
    testimonial: {
      quote: 'Our renewal rate jumped from 70% to 95% after implementing automated reminder calls. The commission tracking alone saves us hours every month.',
      author: 'Vikram Mehta',
      role: 'Agency Owner',
      company: 'SecureLife Insurance Brokers',
    },
  },
  'b2b-sales': {
    title: 'B2B Sales',
    subtitle: 'Enterprise CRM for B2B Companies',
    description: 'Manage complex sales cycles with multiple stakeholders.',
    longDescription: 'Win more enterprise deals with MyLeadX B2B CRM. Handle long sales cycles, multiple decision-makers, complex proposals, and account management. Built for IT services, manufacturing, wholesale, and B2B SaaS companies.',
    icon: Briefcase,
    gradient: 'from-orange-500 to-red-600',
    heroImage: '/screenshots/02-dashboard.png',
    stats: [
      { value: '400+', label: 'B2B Companies' },
      { value: '₹2000Cr+', label: 'Deals Managed' },
      { value: '30%', label: 'Higher Win Rate' },
      { value: '25%', label: 'Shorter Cycle' },
    ],
    pipelineStages: ['Lead', 'Discovery', 'Demo', 'Proposal', 'Negotiation', 'Won'],
    integrations: ['LinkedIn', 'Zapier', 'HubSpot', 'Slack', 'Google Workspace', 'Zoom', 'DocuSign', 'Razorpay'],
    beforeAfter: [
      { metric: 'Win Rate', before: '15%', after: '30%' },
      { metric: 'Sales Cycle', before: '120 days', after: '90 days' },
      { metric: 'Demo to Proposal', before: '40%', after: '65%' },
      { metric: 'Pipeline Visibility', before: 'Spreadsheets', after: 'Real-time' },
    ],
    faqs: [
      { question: 'Can I manage multiple contacts per company?', answer: 'Yes, MyLeadX supports account-based selling. You can add unlimited contacts per company, map their roles (Decision Maker, Influencer, User), and track interactions with each stakeholder.' },
      { question: 'How do you handle complex B2B proposals?', answer: 'Our quotation builder supports line items, custom pricing, multiple currencies, terms & conditions, and e-signatures. You can create templates for faster proposal generation.' },
      { question: 'Can I track deal value and revenue forecasting?', answer: 'Yes, track deal values at each stage with weighted pipeline forecasting. Get monthly/quarterly revenue predictions based on deal probability and expected close dates.' },
    ],
    challenges: [
      { title: 'Long Sales Cycles', description: 'B2B deals take 3-12 months with many touchpoints', icon: Clock },
      { title: 'Multiple Stakeholders', description: 'Need to track decision-makers, influencers & gatekeepers', icon: Users },
      { title: 'Complex Proposals', description: 'Custom pricing, terms & technical requirements', icon: FileText },
      { title: 'Account Management', description: 'Upselling & retention of existing accounts', icon: RefreshCw },
    ],
    solutions: [
      { title: 'Deal Stages', description: 'Custom pipeline stages for your B2B process', icon: Layers },
      { title: 'Contact Hierarchy', description: 'Map org structure with roles & influence level', icon: Users },
      { title: 'Proposal Builder', description: 'Create professional proposals with e-signatures', icon: FileText },
      { title: 'Account Health', description: 'Track account engagement & expansion opportunities', icon: Activity },
    ],
    features: [
      { title: 'Company Profiles', description: 'Detailed company info with industry, size & revenue', icon: Building2 },
      { title: 'Contact Management', description: 'Multiple contacts per company with roles & relationships', icon: Users },
      { title: 'Deal Pipeline', description: 'Customizable stages from lead to closed-won', icon: Layers },
      { title: 'Quotation System', description: 'Line items, discounts, taxes & terms', icon: FileText },
      { title: 'Contract Management', description: 'Track contract value, renewal & amendments', icon: ClipboardList },
      { title: 'Meeting Scheduler', description: 'Book meetings with calendar integration', icon: Calendar },
    ],
    useCases: [
      { title: 'IT Services', description: 'Manage project-based sales with SOW tracking' },
      { title: 'Manufacturing', description: 'Handle distributor/dealer relationships' },
      { title: 'SaaS Companies', description: 'Track MRR, churn & expansion revenue' },
      { title: 'Wholesale/Distribution', description: 'Manage retailer accounts & orders' },
    ],
    benefits: [
      { value: '30%', label: 'Higher Win Rate' },
      { value: '25%', label: 'Faster Closing' },
      { value: '100%', label: 'Pipeline Visibility' },
      { value: '2x', label: 'Account Growth' },
    ],
    testimonial: {
      quote: 'Managing 50+ enterprise accounts is now effortless. The contact hierarchy feature helps us navigate complex organizations effectively.',
      author: 'Anand Krishnan',
      role: 'VP Sales',
      company: 'TechSolutions India Pvt Ltd',
    },
  },
  'call-centers': {
    title: 'Call Centers & BPO',
    subtitle: 'High-Volume Calling for BPOs & Contact Centers',
    description: 'Scale outbound calling with AI and human agents.',
    longDescription: 'Handle thousands of calls daily with MyLeadX call center solution. Combine AI voice agents with human telecallers for maximum efficiency. Real-time monitoring, quality scoring, and performance analytics built for high-volume operations.',
    icon: Headphones,
    gradient: 'from-cyan-500 to-blue-600',
    heroImage: '/screenshots/02-dashboard.png',
    stats: [
      { value: '100+', label: 'Call Centers' },
      { value: '10M+', label: 'Calls/Month' },
      { value: '300%', label: 'More Productivity' },
      { value: '40%', label: 'Cost Reduction' },
    ],
    pipelineStages: ['New', 'Contacted', 'Interested', 'Qualified', 'Transferred', 'Converted'],
    integrations: ['Exotel', 'Twilio', 'Ozonetel', 'Knowlarity', 'WhatsApp', 'Slack', 'Google Sheets', 'Zapier'],
    beforeAfter: [
      { metric: 'Calls per Agent', before: '80/day', after: '200/day' },
      { metric: 'Connect Rate', before: '25%', after: '45%' },
      { metric: 'Quality Score', before: 'Sample 5%', after: '100% AI scored' },
      { metric: 'Cost per Lead', before: '₹150', after: '₹60' },
    ],
    faqs: [
      { question: 'How does AI pre-screening work?', answer: 'AI voice agents make initial calls to verify interest, qualify leads based on your criteria, and only transfer hot leads to human agents. This increases agent productivity by 3x.' },
      { question: 'Can I monitor calls in real-time?', answer: 'Yes, supervisors can listen to live calls, whisper coach agents without the customer hearing, and barge in if needed. All calls are recorded with AI-powered transcription and quality scoring.' },
      { question: 'How do you handle different campaigns?', answer: 'Create unlimited campaigns with separate scripts, dispositions, and agent assignments. Track performance metrics per campaign with detailed analytics.' },
    ],
    challenges: [
      { title: 'Agent Productivity', description: 'Agents waste time on unanswered calls & wrong numbers', icon: Clock },
      { title: 'Quality Monitoring', description: 'Cannot monitor all calls for quality assurance', icon: Activity },
      { title: 'High Attrition', description: 'Repetitive work leads to agent burnout', icon: Users },
      { title: 'Scale Limitations', description: 'Hiring & training limits growth capacity', icon: TrendingUp },
    ],
    solutions: [
      { title: 'AI Pre-screening', description: 'AI handles initial calls, transfers hot leads to humans', icon: Bot },
      { title: 'Auto Quality Scoring', description: 'AI analyzes 100% of calls for quality metrics', icon: Star },
      { title: 'Smart Routing', description: 'Route calls based on skill, language & availability', icon: RefreshCw },
      { title: 'Unlimited AI Agents', description: 'Scale instantly with AI voice agents', icon: Zap },
    ],
    features: [
      { title: 'Predictive Dialer', description: 'Auto-dial with answering machine detection', icon: PhoneCall },
      { title: 'Call Queue Management', description: 'Distribute calls fairly across agents', icon: Users },
      { title: 'Live Monitoring', description: 'Listen to live calls with whisper coaching', icon: Headphones },
      { title: 'Call Recording', description: 'Record all calls with AI transcription', icon: Mic },
      { title: 'Agent Scorecard', description: 'Track calls, talk time, conversions per agent', icon: BarChart3 },
      { title: 'Shift Management', description: 'Schedule shifts with break tracking', icon: Calendar },
    ],
    useCases: [
      { title: 'Outbound Sales', description: 'Lead generation & appointment setting' },
      { title: 'Collections', description: 'Payment reminders & debt collection' },
      { title: 'Customer Support', description: 'Inbound support with ticket creation' },
      { title: 'Survey & Research', description: 'Market research & feedback collection' },
    ],
    benefits: [
      { value: '3x', label: 'Agent Productivity' },
      { value: '100%', label: 'Call Monitoring' },
      { value: '40%', label: 'Cost Savings' },
      { value: '∞', label: 'Scalability' },
    ],
    testimonial: {
      quote: 'We reduced our cost per call by 40% while improving quality scores. AI handles routine calls, letting our best agents focus on complex conversations.',
      author: 'Sanjay Gupta',
      role: 'Operations Head',
      company: 'CallPro BPO Services',
    },
  },
  'healthcare': {
    title: 'Healthcare & Clinics',
    subtitle: 'CRM for Hospitals, Clinics & Diagnostics',
    description: 'Manage patient appointments, follow-ups, and care coordination.',
    longDescription: 'Streamline patient management with MyLeadX healthcare CRM. From appointment scheduling to treatment follow-ups, manage the entire patient journey. Perfect for hospitals, clinics, diagnostic centers, and healthcare chains looking to improve patient experience and retention.',
    icon: Stethoscope,
    gradient: 'from-rose-500 to-pink-600',
    heroImage: '/screenshots/02-dashboard.png',
    stats: [
      { value: '150+', label: 'Healthcare Providers' },
      { value: '5M+', label: 'Patients Managed' },
      { value: '40%', label: 'More Appointments' },
      { value: '90%', label: 'Show-up Rate' },
    ],
    pipelineStages: ['Inquiry', 'Appointment', 'Consultation', 'Treatment', 'Follow-up', 'Completed'],
    integrations: ['WhatsApp', 'Google Calendar', 'Practo', 'Razorpay', 'SMS Gateway', 'Gmail', 'Zoom', 'Lab Systems'],
    beforeAfter: [
      { metric: 'No-show Rate', before: '30%', after: '8%' },
      { metric: 'Appointment Bookings', before: 'Phone only', after: 'Online 24/7' },
      { metric: 'Follow-up Compliance', before: '40%', after: '90%' },
      { metric: 'Patient Reviews', before: '10/month', after: '50/month' },
    ],
    faqs: [
      { question: 'How do appointment reminders reduce no-shows?', answer: 'AI calls patients 24 hours before the appointment to confirm. If they cant make it, it offers rescheduling options. WhatsApp reminders are sent 2 hours before with clinic directions.' },
      { question: 'Can patients book appointments online?', answer: 'Yes, patients can book via WhatsApp, website widget, or a dedicated booking link. They see real-time doctor availability and can choose their preferred slot.' },
      { question: 'Is patient data HIPAA compliant?', answer: 'MyLeadX follows healthcare data protection standards. All patient information is encrypted, access is role-based, and we maintain audit trails for compliance.' },
    ],
    challenges: [
      { title: 'Appointment No-Shows', description: 'Patients forget appointments leading to revenue loss', icon: Clock },
      { title: 'Manual Reminders', description: 'Staff spends hours calling patients for reminders', icon: PhoneCall },
      { title: 'Follow-up Gaps', description: 'Post-treatment follow-ups often missed', icon: RefreshCw },
      { title: 'Patient Records', description: 'Difficulty tracking patient history across visits', icon: FileText },
    ],
    solutions: [
      { title: 'Auto Appointment Reminders', description: 'AI calls patients 24hrs & 2hrs before appointment', icon: Bell },
      { title: 'Treatment Follow-ups', description: 'Automated post-visit check-in calls', icon: Heart },
      { title: 'Patient Journey', description: 'Track complete patient history & interactions', icon: Activity },
      { title: 'Multi-location Support', description: 'Manage appointments across branches', icon: MapPin },
    ],
    features: [
      { title: 'Appointment Booking', description: 'Online booking with doctor availability sync', icon: Calendar },
      { title: 'Patient Records', description: 'Complete patient history with visit notes', icon: FileText },
      { title: 'Treatment Tracking', description: 'Track ongoing treatments & medications', icon: ClipboardList },
      { title: 'Lab Integration', description: 'Connect with diagnostic systems for reports', icon: Activity },
      { title: 'Billing & Payments', description: 'Generate bills and collect payments online', icon: CreditCard },
      { title: 'Doctor Dashboard', description: 'Daily schedule & patient queue for doctors', icon: Users },
    ],
    useCases: [
      { title: 'Hospitals & Multi-Specialty', description: 'Manage OPD appointments across departments' },
      { title: 'Clinics & Polyclinics', description: 'Schedule patients with multiple doctors' },
      { title: 'Diagnostic Centers', description: 'Book tests and share reports automatically' },
      { title: 'Dental & Eye Care', description: 'Treatment plans with recall appointments' },
    ],
    benefits: [
      { value: '90%', label: 'Show-up Rate' },
      { value: '50%', label: 'Less No-Shows' },
      { value: '3x', label: 'More Reviews' },
      { value: '100%', label: 'Follow-up Coverage' },
    ],
    testimonial: {
      quote: 'Patient no-shows dropped by 50% after implementing automated reminder calls. Our doctors now see more patients without overbooking.',
      author: 'Dr. Meera Reddy',
      role: 'Chief Medical Officer',
      company: 'Apollo Clinics',
    },
  },
  'automotive': {
    title: 'Automotive & Dealers',
    subtitle: 'CRM for Car Dealers & Service Centers',
    description: 'Convert inquiries to test drives and close more vehicle sales.',
    longDescription: 'Accelerate your automotive sales with MyLeadX. Manage leads from OLX, CarDekho, and walk-ins. Schedule test drives, track negotiations, and automate service reminders. Built for car dealers, two-wheeler showrooms, and service centers.',
    icon: Car,
    gradient: 'from-amber-500 to-orange-600',
    heroImage: '/screenshots/02-dashboard.png',
    stats: [
      { value: '200+', label: 'Dealerships' },
      { value: '₹3000Cr+', label: 'Vehicles Sold' },
      { value: '35%', label: 'More Test Drives' },
      { value: '25%', label: 'Higher Conversion' },
    ],
    pipelineStages: ['Inquiry', 'Test Drive', 'Quote', 'Negotiation', 'Booking', 'Delivery'],
    integrations: ['CarDekho', 'OLX Auto', 'CarWale', 'Facebook Ads', 'WhatsApp', 'Razorpay', 'HDFC Bank', 'ICICI Finance'],
    beforeAfter: [
      { metric: 'Test Drive Conversion', before: '20%', after: '45%' },
      { metric: 'Lead Capture', before: '60%', after: '100%' },
      { metric: 'Service Retention', before: '40%', after: '75%' },
      { metric: 'Response Time', before: '4 hours', after: '15 minutes' },
    ],
    faqs: [
      { question: 'Can I import leads from auto portals?', answer: 'Yes, MyLeadX integrates with CarDekho, OLX Auto, CarWale, and others. Leads are auto-captured with vehicle interest, budget, and contact details for instant follow-up.' },
      { question: 'How do you track vehicle inventory?', answer: 'Manage your showroom inventory with model, variant, color, and price. Sales reps see real-time stock availability. Track vehicles from arrival to delivery.' },
      { question: 'Can I automate service reminders?', answer: 'Yes, the system tracks service due dates based on purchase date or last service. Automated reminders via call and WhatsApp bring customers back for regular servicing.' },
    ],
    challenges: [
      { title: 'Lead Leakage', description: 'Leads from portals, walk-ins & calls not captured', icon: Database },
      { title: 'Test Drive Scheduling', description: 'Manual coordination for test drive bookings', icon: Calendar },
      { title: 'Long Negotiation', description: 'Vehicle purchases involve multiple visits', icon: Clock },
      { title: 'Service Follow-ups', description: 'Missing service reminders lose retention revenue', icon: RefreshCw },
    ],
    solutions: [
      { title: 'Unified Lead Capture', description: 'Auto-capture from OLX, CarDekho, walk-ins', icon: Database },
      { title: 'Test Drive Automation', description: 'AI schedules and confirms test drives', icon: Bot },
      { title: 'Deal Tracking', description: 'Track negotiations, quotes & financing status', icon: Layers },
      { title: 'Service Reminders', description: 'Auto reminders for service due dates', icon: Bell },
    ],
    features: [
      { title: 'Vehicle Inventory', description: 'Track stock with variant, color & price', icon: Car },
      { title: 'Test Drive Schedule', description: 'Book slots with vehicle & sales exec assignment', icon: Calendar },
      { title: 'Exchange Valuation', description: 'Capture old vehicle details for exchange', icon: RefreshCw },
      { title: 'Finance Integration', description: 'Track loan applications & approvals', icon: Banknote },
      { title: 'Service History', description: 'Complete service records per vehicle', icon: ClipboardList },
      { title: 'Insurance Tracking', description: 'Track insurance renewals & claims', icon: Shield },
    ],
    useCases: [
      { title: 'Car Dealerships', description: 'New & used car sales with exchange' },
      { title: 'Two-Wheeler Showrooms', description: 'Bike & scooter sales management' },
      { title: 'Service Centers', description: 'Service booking & parts inventory' },
      { title: 'Multi-brand Dealers', description: 'Manage multiple OEM relationships' },
    ],
    benefits: [
      { value: '35%', label: 'More Test Drives' },
      { value: '25%', label: 'Higher Closure' },
      { value: '2x', label: 'Service Revenue' },
      { value: '0', label: 'Lost Leads' },
    ],
    testimonial: {
      quote: 'We capture every lead now - from portals, walk-ins, and calls. Test drive conversions improved by 35% with automated scheduling.',
      author: 'Suresh Kumar',
      role: 'Dealer Principal',
      company: 'Maruti Suzuki Arena',
    },
  },
  'ecommerce': {
    title: 'E-commerce & Retail',
    subtitle: 'CRM for Online Stores & Retail Chains',
    description: 'Convert browsers to buyers and boost repeat purchases.',
    longDescription: 'Maximize your e-commerce revenue with MyLeadX. Recover abandoned carts, nurture first-time visitors, and turn customers into repeat buyers. Perfect for D2C brands, online stores, and retail chains looking to increase customer lifetime value.',
    icon: ShoppingCart,
    gradient: 'from-green-500 to-emerald-600',
    heroImage: '/screenshots/02-dashboard.png',
    stats: [
      { value: '300+', label: 'Online Stores' },
      { value: '₹500Cr+', label: 'Revenue Recovered' },
      { value: '25%', label: 'Cart Recovery' },
      { value: '3x', label: 'Repeat Purchases' },
    ],
    pipelineStages: ['Visitor', 'Cart Added', 'Checkout', 'Payment', 'Shipped', 'Delivered'],
    integrations: ['Shopify', 'WooCommerce', 'Razorpay', 'WhatsApp', 'Facebook Ads', 'Google Ads', 'Shiprocket', 'Delhivery'],
    beforeAfter: [
      { metric: 'Cart Recovery', before: '5%', after: '25%' },
      { metric: 'Repeat Purchase', before: '15%', after: '40%' },
      { metric: 'COD Confirmation', before: '70%', after: '95%' },
      { metric: 'Review Collection', before: '2%', after: '15%' },
    ],
    faqs: [
      { question: 'How does cart recovery calling work?', answer: 'When a customer abandons cart, AI calls within 30 minutes to understand concerns (price, shipping, payment). It can offer discounts, answer questions, and help complete the purchase.' },
      { question: 'Can I verify COD orders before shipping?', answer: 'Yes, AI calls confirm COD orders to verify address and intent. This reduces RTO (return to origin) by 40% and saves shipping costs on fake orders.' },
      { question: 'How do you increase repeat purchases?', answer: 'Track customer purchase history and trigger personalized offers via WhatsApp/call. Remind customers when they might need to reorder (based on product lifecycle).' },
    ],
    challenges: [
      { title: 'Cart Abandonment', description: '70% of carts abandoned without purchase', icon: ShoppingCart },
      { title: 'One-time Buyers', description: 'Most customers never return for second purchase', icon: Users },
      { title: 'COD Failures', description: 'Cash on delivery orders often rejected', icon: CreditCard },
      { title: 'Support Overload', description: 'Order status queries overwhelm support', icon: Headphones },
    ],
    solutions: [
      { title: 'Cart Recovery Calls', description: 'AI calls within 30 mins of abandonment', icon: Bot },
      { title: 'Repeat Purchase Campaigns', description: 'Personalized offers based on purchase history', icon: RefreshCw },
      { title: 'COD Confirmation', description: 'Verify COD orders before shipping', icon: PhoneCall },
      { title: 'Order Status Bot', description: 'AI handles delivery status queries', icon: MessageSquare },
    ],
    features: [
      { title: 'Abandoned Cart Tracking', description: 'Real-time alerts for cart abandonment', icon: ShoppingCart },
      { title: 'Customer Segments', description: 'Segment by purchase value, frequency, category', icon: Users },
      { title: 'WhatsApp Commerce', description: 'Send catalogs & take orders via WhatsApp', icon: MessageSquare },
      { title: 'Review Collection', description: 'Auto request reviews after delivery', icon: Star },
      { title: 'Loyalty Programs', description: 'Track points & reward redemptions', icon: Award },
      { title: 'Inventory Alerts', description: 'Back-in-stock notifications to waitlist', icon: Bell },
    ],
    useCases: [
      { title: 'D2C Brands', description: 'Direct-to-consumer sales & engagement' },
      { title: 'Fashion & Apparel', description: 'Size recommendations & style advice' },
      { title: 'Electronics', description: 'Pre-sales queries & warranty registration' },
      { title: 'Grocery & FMCG', description: 'Repeat order reminders & subscriptions' },
    ],
    benefits: [
      { value: '25%', label: 'Cart Recovery' },
      { value: '40%', label: 'Repeat Rate' },
      { value: '90%', label: 'COD Verification' },
      { value: '5x', label: 'Review Collection' },
    ],
    testimonial: {
      quote: 'Cart recovery calls alone brought back ₹15 lakhs in revenue last month. The AI understands customer objections and offers perfect solutions.',
      author: 'Neha Jain',
      role: 'Head of Growth',
      company: 'FashionKart',
    },
  },
  'banking': {
    title: 'Banking & NBFC',
    subtitle: 'CRM for Banks, NBFCs & Lending Companies',
    description: 'Accelerate loan processing and improve collection rates.',
    longDescription: 'Transform your lending operations with MyLeadX. From lead generation to loan disbursement and collections, manage the entire lending lifecycle. Built for banks, NBFCs, microfinance, and fintech lenders looking to scale efficiently.',
    icon: Landmark,
    gradient: 'from-blue-600 to-indigo-700',
    heroImage: '/screenshots/02-dashboard.png',
    stats: [
      { value: '100+', label: 'Lenders' },
      { value: '₹10,000Cr+', label: 'Loans Processed' },
      { value: '40%', label: 'Faster Processing' },
      { value: '95%', label: 'Collection Rate' },
    ],
    pipelineStages: ['Lead', 'Eligibility', 'Documents', 'Verification', 'Sanction', 'Disbursed'],
    integrations: ['WhatsApp', 'DigiLocker', 'CIBIL', 'Razorpay', 'SMS Gateway', 'Perfios', 'Karza', 'E-Sign'],
    beforeAfter: [
      { metric: 'Loan Processing', before: '7 days', after: '2 days' },
      { metric: 'Document Collection', before: '3 visits', after: 'Digital' },
      { metric: 'EMI Collection', before: '85%', after: '97%' },
      { metric: 'Lead Qualification', before: 'Manual', after: 'AI Pre-screened' },
    ],
    faqs: [
      { question: 'How does AI pre-qualification work?', answer: 'AI calls leads to verify basic eligibility (income, employment, existing loans). Only qualified leads are passed to loan officers, saving 60% of their time on unqualified applications.' },
      { question: 'Can I collect documents via WhatsApp?', answer: 'Yes, customers can submit documents via WhatsApp. AI verifies document quality and extracts data using OCR. DigiLocker integration enables verified document fetch.' },
      { question: 'How do you handle EMI collections?', answer: 'Automated reminders via call, WhatsApp, and SMS before EMI due date. For overdue accounts, AI makes collection calls with payment link. Escalation workflows for persistent defaults.' },
    ],
    challenges: [
      { title: 'Lead Quality', description: 'Many unqualified leads waste sales team time', icon: Target },
      { title: 'Document Collection', description: 'Chasing documents delays loan processing', icon: FileText },
      { title: 'Payment Delays', description: 'EMI collection requires constant follow-up', icon: Clock },
      { title: 'Compliance', description: 'Maintaining regulatory compliance records', icon: Shield },
    ],
    solutions: [
      { title: 'AI Pre-qualification', description: 'AI screens leads for eligibility before sales call', icon: Bot },
      { title: 'Digital Document Collection', description: 'WhatsApp-based document submission', icon: Smartphone },
      { title: 'Payment Reminders', description: 'Multi-channel EMI reminders before due date', icon: Bell },
      { title: 'Audit Trail', description: 'Complete interaction history for compliance', icon: ClipboardList },
    ],
    features: [
      { title: 'Loan Pipeline', description: 'Track applications from inquiry to disbursement', icon: Layers },
      { title: 'Credit Scoring', description: 'AI-assisted credit assessment', icon: Brain },
      { title: 'Document Verification', description: 'OCR-based document verification', icon: FileText },
      { title: 'EMI Calculator', description: 'Share personalized EMI options instantly', icon: DollarSign },
      { title: 'Collection Dashboard', description: 'Track overdue accounts with priority', icon: BarChart3 },
      { title: 'Disbursement Tracking', description: 'Monitor loan disbursement status', icon: Banknote },
    ],
    useCases: [
      { title: 'Personal Loans', description: 'Quick disbursement with minimal documentation' },
      { title: 'Business Loans', description: 'Working capital & term loan management' },
      { title: 'Vehicle Finance', description: 'Two-wheeler & car loan processing' },
      { title: 'Microfinance', description: 'Group lending & collection management' },
    ],
    benefits: [
      { value: '40%', label: 'Faster Processing' },
      { value: '95%', label: 'Collection Rate' },
      { value: '60%', label: 'Less Documentation Time' },
      { value: '100%', label: 'Compliance' },
    ],
    testimonial: {
      quote: 'Loan processing time reduced from 7 days to 3 days. AI pre-screening helps us focus on qualified leads only.',
      author: 'Karthik Raman',
      role: 'Head of Retail Lending',
      company: 'FastMoney NBFC',
    },
  },
  'travel': {
    title: 'Travel & Hospitality',
    subtitle: 'CRM for Travel Agents & Hotels',
    description: 'Convert inquiries to bookings and manage guest experiences.',
    longDescription: 'Boost your travel business with MyLeadX. Handle holiday inquiries, manage group bookings, and automate guest communication. Perfect for travel agents, tour operators, hotels, and hospitality businesses looking to deliver exceptional experiences.',
    icon: Globe,
    gradient: 'from-sky-500 to-blue-600',
    heroImage: '/screenshots/02-dashboard.png',
    stats: [
      { value: '250+', label: 'Travel Businesses' },
      { value: '2M+', label: 'Bookings Managed' },
      { value: '30%', label: 'More Conversions' },
      { value: '50%', label: 'Less Response Time' },
    ],
    pipelineStages: ['Inquiry', 'Itinerary', 'Quote', 'Booked', 'Trip Done', 'Review'],
    integrations: ['WhatsApp', 'Razorpay', 'Google Calendar', 'TripAdvisor', 'MakeMyTrip', 'Gmail', 'Zoom', 'Canva'],
    beforeAfter: [
      { metric: 'Quote Response', before: '24 hours', after: '2 hours' },
      { metric: 'Booking Conversion', before: '10%', after: '25%' },
      { metric: 'Review Collection', before: '5%', after: '40%' },
      { metric: 'Repeat Bookings', before: '20%', after: '45%' },
    ],
    faqs: [
      { question: 'Can I create trip itineraries quickly?', answer: 'Yes, use our itinerary builder with day-wise planning, hotel/activity options, and pricing. Save templates for popular destinations to create quotes in minutes instead of hours.' },
      { question: 'How do you handle group bookings?', answer: 'Manage group inquiries with participant tracking, document collection, and payment splitting. Send group-specific communications and track individual confirmations.' },
      { question: 'Can customers pay in installments?', answer: 'Yes, set up payment schedules with automated reminders. Track partial payments and send balance due alerts. Integrate with payment gateways for easy collection.' },
    ],
    challenges: [
      { title: 'Quote Delays', description: 'Custom trip quotes take too long to prepare', icon: Clock },
      { title: 'Follow-up Fatigue', description: 'Travel decisions need multiple touchpoints', icon: RefreshCw },
      { title: 'Seasonal Peaks', description: 'Inquiry volume spikes during holiday seasons', icon: TrendingUp },
      { title: 'Guest Communication', description: 'Pre & post travel communication gaps', icon: MessageSquare },
    ],
    solutions: [
      { title: 'Quick Quote Builder', description: 'Generate trip quotes in minutes', icon: FileText },
      { title: 'AI Follow-ups', description: 'Automated follow-ups until booking confirmation', icon: Bot },
      { title: 'Scalable AI Agents', description: 'Handle peak season with AI voice agents', icon: Zap },
      { title: 'Guest Journey', description: 'Pre-trip, on-trip & post-trip automation', icon: Route },
    ],
    features: [
      { title: 'Trip Planning', description: 'Build itineraries with day-wise activities', icon: Calendar },
      { title: 'Package Management', description: 'Create & manage tour packages', icon: Layers },
      { title: 'Booking Calendar', description: 'Track room/vehicle availability', icon: Calendar },
      { title: 'Visa Tracking', description: 'Monitor visa application status', icon: FileText },
      { title: 'Vendor Management', description: 'Manage hotels, transport & activity vendors', icon: Users },
      { title: 'Review Collection', description: 'Auto-collect reviews after trip completion', icon: Star },
    ],
    useCases: [
      { title: 'Travel Agencies', description: 'Domestic & international holiday packages' },
      { title: 'Tour Operators', description: 'Group tours & customized itineraries' },
      { title: 'Hotels & Resorts', description: 'Direct bookings & guest management' },
      { title: 'MICE & Corporate', description: 'Conference & corporate travel handling' },
    ],
    benefits: [
      { value: '30%', label: 'More Bookings' },
      { value: '50%', label: 'Faster Quotes' },
      { value: '4x', label: 'Peak Handling' },
      { value: '5x', label: 'More Reviews' },
    ],
    testimonial: {
      quote: 'During peak season, we handle 3x more inquiries with the same team. AI responses keep leads warm until our consultants call back.',
      author: 'Rohit Malhotra',
      role: 'Founder',
      company: 'Wanderlust Holidays',
    },
  },
  'fitness': {
    title: 'Fitness & Wellness',
    subtitle: 'CRM for Gyms, Studios & Wellness Centers',
    description: 'Convert trials to memberships and reduce member churn.',
    longDescription: 'Grow your fitness business with MyLeadX. Convert trial requests to memberships, manage renewals, and keep members engaged. Built for gyms, yoga studios, fitness centers, and wellness businesses looking to maximize member lifetime value.',
    icon: Heart,
    gradient: 'from-red-500 to-rose-600',
    heroImage: '/screenshots/02-dashboard.png',
    stats: [
      { value: '300+', label: 'Fitness Centers' },
      { value: '500K+', label: 'Members Managed' },
      { value: '40%', label: 'Trial Conversion' },
      { value: '85%', label: 'Renewal Rate' },
    ],
    pipelineStages: ['Inquiry', 'Trial', 'Tour', 'Offer', 'Joined', 'Renewed'],
    integrations: ['WhatsApp', 'Razorpay', 'Google Calendar', 'Instagram', 'Facebook', 'Fitbit', 'Apple Health', 'Zoom'],
    beforeAfter: [
      { metric: 'Trial Conversion', before: '20%', after: '45%' },
      { metric: 'Renewal Rate', before: '60%', after: '85%' },
      { metric: 'Member Churn', before: '8%/month', after: '3%/month' },
      { metric: 'Referrals', before: '10%', after: '30%' },
    ],
    faqs: [
      { question: 'How do you improve trial conversions?', answer: 'AI confirms trial appointments, sends reminders with gym directions, and follows up within 2 hours after trial. Personalized offers are sent based on their interests discussed during the trial.' },
      { question: 'Can I track member attendance?', answer: 'Yes, track check-ins via app or biometric. Get alerts when members skip visits for a week. Automated engagement campaigns re-activate inactive members before they churn.' },
      { question: 'How do renewal reminders work?', answer: 'Automated reminders start 30 days before expiry via AI call and WhatsApp. Offer early renewal discounts to encourage on-time renewals. Track renewal pipeline in real-time.' },
    ],
    challenges: [
      { title: 'Trial No-Shows', description: 'Free trial signups often dont show up', icon: Clock },
      { title: 'Membership Renewals', description: 'Members forget to renew, leading to churn', icon: RefreshCw },
      { title: 'Engagement Drop', description: 'Members stop coming after initial enthusiasm', icon: TrendingUp },
      { title: 'Competition', description: 'New gyms constantly poaching members', icon: Users },
    ],
    solutions: [
      { title: 'Trial Confirmation', description: 'AI confirms trial visits with reminders', icon: Bot },
      { title: 'Renewal Automation', description: 'Auto-reminders 30/15/7 days before expiry', icon: Bell },
      { title: 'Engagement Tracking', description: 'Alert when members skip visits', icon: Activity },
      { title: 'Win-back Campaigns', description: 'Re-engage lapsed members automatically', icon: RefreshCw },
    ],
    features: [
      { title: 'Membership Management', description: 'Track plans, payments & freezes', icon: Users },
      { title: 'Class Scheduling', description: 'Group class booking with capacity limits', icon: Calendar },
      { title: 'PT Sessions', description: 'Personal trainer session tracking', icon: UserCheck },
      { title: 'Check-in System', description: 'Track member visits & attendance', icon: CheckCircle },
      { title: 'Body Metrics', description: 'Record weight, BMI & progress photos', icon: Activity },
      { title: 'Referral Program', description: 'Member referral tracking & rewards', icon: Award },
    ],
    useCases: [
      { title: 'Gyms & Fitness Centers', description: 'Membership & equipment usage tracking' },
      { title: 'Yoga & Pilates Studios', description: 'Class-based membership management' },
      { title: 'CrossFit & Bootcamps', description: 'WOD tracking & community building' },
      { title: 'Wellness Spas', description: 'Treatment bookings & packages' },
    ],
    benefits: [
      { value: '40%', label: 'Trial Conversion' },
      { value: '85%', label: 'Renewal Rate' },
      { value: '30%', label: 'More Referrals' },
      { value: '50%', label: 'Less Churn' },
    ],
    testimonial: {
      quote: 'Member renewals jumped from 60% to 85% with automated reminders. We also recover 30% of lapsed members with win-back calls.',
      author: 'Priya Kapoor',
      role: 'Owner',
      company: 'FitZone Gym',
    },
  },
  'it-services': {
    title: 'IT Services',
    subtitle: 'CRM for Software Companies & IT Consultants',
    description: 'Manage projects, proposals, and client relationships.',
    longDescription: 'Win more IT projects with MyLeadX. Manage leads from LinkedIn, referrals, and RFPs. Track proposals, project timelines, and client relationships. Built for software companies, IT consultants, and digital agencies looking to scale their business.',
    icon: Briefcase,
    gradient: 'from-indigo-500 to-purple-600',
    heroImage: '/screenshots/02-dashboard.png',
    stats: [
      { value: '350+', label: 'IT Companies' },
      { value: '₹1500Cr+', label: 'Projects Managed' },
      { value: '35%', label: 'Higher Win Rate' },
      { value: '40%', label: 'Faster Proposals' },
    ],
    pipelineStages: ['Lead', 'Discovery', 'Proposal', 'Negotiation', 'SOW', 'Won'],
    integrations: ['LinkedIn', 'Upwork', 'Clutch', 'Google Workspace', 'Slack', 'Jira', 'Zoom', 'DocuSign'],
    beforeAfter: [
      { metric: 'Proposal Time', before: '5 days', after: '1 day' },
      { metric: 'Lead Response', before: '48 hours', after: '2 hours' },
      { metric: 'Win Rate', before: '15%', after: '35%' },
      { metric: 'Project Tracking', before: 'Spreadsheets', after: 'Automated' },
    ],
    faqs: [
      { question: 'Can I manage multiple projects per client?', answer: 'Yes, MyLeadX supports account-based management. Track multiple projects under each client with separate timelines, budgets, and team assignments. View all projects in a unified dashboard.' },
      { question: 'How do you handle proposal management?', answer: 'Create professional proposals with our template builder. Include scope, timeline, pricing, and terms. Track proposal views, get e-signatures, and automate follow-ups.' },
      { question: 'Does it integrate with project management tools?', answer: 'Yes, we integrate with Jira, Asana, Trello, and other PM tools. Sync project status, track milestones, and update clients automatically on progress.' },
    ],
    challenges: [
      { title: 'Long Sales Cycles', description: 'IT projects take months from lead to contract signing', icon: Clock },
      { title: 'Proposal Overhead', description: 'Creating detailed proposals takes significant time', icon: FileText },
      { title: 'Multiple Stakeholders', description: 'Need to manage CTO, PM, and procurement contacts', icon: Users },
      { title: 'Project Tracking', description: 'Difficulty tracking multiple ongoing projects', icon: Layers },
    ],
    solutions: [
      { title: 'Pipeline Management', description: 'Visual pipeline from lead to project kickoff', icon: Layers },
      { title: 'Proposal Builder', description: 'Create professional proposals in minutes', icon: FileText },
      { title: 'Stakeholder Mapping', description: 'Track all decision-makers per account', icon: Users },
      { title: 'Project Dashboard', description: 'Track project status, timelines & revenue', icon: BarChart3 },
    ],
    features: [
      { title: 'Account Management', description: 'Multi-contact companies with project history', icon: Building2 },
      { title: 'Proposal Templates', description: 'Reusable templates for faster proposals', icon: FileText },
      { title: 'SOW Generator', description: 'Create detailed scope of work documents', icon: ClipboardList },
      { title: 'Resource Planning', description: 'Track team availability & allocation', icon: Users },
      { title: 'Time Tracking', description: 'Log hours against projects & milestones', icon: Clock },
      { title: 'Invoice Generation', description: 'Generate invoices from project milestones', icon: CreditCard },
    ],
    useCases: [
      { title: 'Software Development', description: 'Manage custom software project sales' },
      { title: 'IT Consulting', description: 'Track consulting engagements & retainers' },
      { title: 'Digital Agencies', description: 'Handle web, mobile & marketing projects' },
      { title: 'System Integrators', description: 'Manage complex enterprise implementations' },
    ],
    benefits: [
      { value: '35%', label: 'Higher Win Rate' },
      { value: '60%', label: 'Faster Proposals' },
      { value: '100%', label: 'Project Visibility' },
      { value: '2x', label: 'Account Growth' },
    ],
    testimonial: {
      quote: 'We reduced proposal creation time from 5 days to 1 day. The pipeline visibility helped us forecast revenue accurately for the first time.',
      author: 'Amit Sharma',
      role: 'CEO',
      company: 'TechNova Solutions',
    },
  },
  'it-recruitment': {
    title: 'IT Recruitment',
    subtitle: 'CRM for Staffing Agencies & HR Consultants',
    description: 'Manage candidates, clients, and placements efficiently.',
    longDescription: 'Place more candidates with MyLeadX recruitment CRM. Source from job boards, track candidates through interview stages, manage client relationships, and close placements faster. Built for IT staffing agencies, HR consultants, and recruitment firms.',
    icon: UserCheck,
    gradient: 'from-teal-500 to-cyan-600',
    heroImage: '/screenshots/02-dashboard.png',
    stats: [
      { value: '200+', label: 'Recruitment Firms' },
      { value: '50K+', label: 'Placements Made' },
      { value: '45%', label: 'Faster Placements' },
      { value: '3x', label: 'More Submissions' },
    ],
    pipelineStages: ['Sourced', 'Screened', 'Submitted', 'Interview', 'Offered', 'Joined'],
    integrations: ['LinkedIn', 'Naukri', 'Indeed', 'Monster', 'WhatsApp', 'Gmail', 'Zoom', 'Google Calendar'],
    beforeAfter: [
      { metric: 'Time to Submit', before: '3 days', after: '1 day' },
      { metric: 'Candidate Reach', before: '50/week', after: '200/week' },
      { metric: 'Interview Show-up', before: '60%', after: '90%' },
      { metric: 'Placement Cycle', before: '45 days', after: '25 days' },
    ],
    faqs: [
      { question: 'Can I import candidates from job boards?', answer: 'Yes, integrate with LinkedIn, Naukri, Indeed, and Monster. Candidates are auto-imported with their profile details, skills, and experience for instant screening.' },
      { question: 'How do you track candidate-client matching?', answer: 'Our AI matches candidates to open positions based on skills, experience, location, and salary expectations. Get ranked recommendations for each job requirement.' },
      { question: 'Can I manage both candidates and clients?', answer: 'Yes, MyLeadX has dual pipelines - one for candidates and one for client jobs. Track requirements, submissions, and placements in a unified view.' },
    ],
    challenges: [
      { title: 'Candidate Sourcing', description: 'Finding qualified candidates takes too much time', icon: Users },
      { title: 'Interview No-shows', description: 'Candidates skip interviews without notice', icon: Clock },
      { title: 'Client Management', description: 'Juggling multiple client requirements', icon: Briefcase },
      { title: 'Placement Tracking', description: 'Tracking candidates across multiple stages', icon: Layers },
    ],
    solutions: [
      { title: 'Multi-source Import', description: 'Import from LinkedIn, Naukri, Indeed in one click', icon: Database },
      { title: 'Interview Reminders', description: 'AI calls candidates to confirm interviews', icon: Bot },
      { title: 'Client Portal', description: 'Let clients view submissions & provide feedback', icon: Building2 },
      { title: 'Dual Pipeline', description: 'Separate pipelines for candidates & jobs', icon: Layers },
    ],
    features: [
      { title: 'Candidate Database', description: 'Searchable database with skills & experience', icon: Database },
      { title: 'Job Management', description: 'Track open positions with requirements', icon: ClipboardList },
      { title: 'Resume Parsing', description: 'Auto-extract details from resumes', icon: FileText },
      { title: 'Interview Scheduler', description: 'Coordinate interviews with calendar sync', icon: Calendar },
      { title: 'Offer Management', description: 'Track offers, negotiations & joining', icon: Award },
      { title: 'Commission Tracking', description: 'Calculate placement fees & payouts', icon: CreditCard },
    ],
    useCases: [
      { title: 'IT Staffing', description: 'Place developers, testers & IT professionals' },
      { title: 'Executive Search', description: 'High-level placements with confidentiality' },
      { title: 'Contract Staffing', description: 'Manage contract resources & renewals' },
      { title: 'RPO Services', description: 'Recruitment process outsourcing' },
    ],
    benefits: [
      { value: '45%', label: 'Faster Placements' },
      { value: '3x', label: 'More Submissions' },
      { value: '90%', label: 'Interview Show-up' },
      { value: '100%', label: 'Pipeline Visibility' },
    ],
    testimonial: {
      quote: 'We tripled our submissions per recruiter. The AI calling feature confirms interviews and reduced no-shows from 40% to 10%.',
      author: 'Neha Gupta',
      role: 'Director',
      company: 'TalentBridge Consulting',
    },
  },
};

export const IndustryDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const industry = slug ? INDUSTRIES_DATA[slug] : null;
  const [activeQuestion, setActiveQuestion] = useState<number | null>(null);
  const [leadsPerMonth, setLeadsPerMonth] = useState<number>(100);
  const [avgDealValue, setAvgDealValue] = useState<number>(10000);

  // Scroll to top on page load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  if (!industry) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Nav />
        <div className="pt-32 pb-20 text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Industry Not Found</h1>
          <p className="text-gray-400 mb-8">The industry page you're looking for doesn't exist.</p>
          <Link to="/" className="text-cyan-400 hover:text-cyan-300">
            &larr; Back to Home
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const Icon = industry.icon;

  return (
    <div className="min-h-screen bg-slate-950">
      <Nav />

      {/* Hero Section */}
      <section className="pt-20 pb-16 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:60px_60px]"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-[100px]"></div>

        <div className="relative w-full px-4 sm:px-6 lg:px-12">
          {/* Main Hero Grid - 2 Columns: Content Left, Image Right */}
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
            {/* Left Content */}
            <div>
              <div className={`inline-flex items-center bg-gradient-to-r ${industry.gradient} bg-opacity-10 border border-white/20 rounded-full px-4 py-2 mb-6`}>
                <Icon className="w-5 h-5 text-white mr-2" />
                <span className="text-white text-sm font-medium">Industry Solution</span>
              </div>

              <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
                {industry.title}
              </h1>

              <p className="text-xl text-cyan-400 font-medium mb-4">
                {industry.subtitle}
              </p>

              <p className="text-lg text-gray-400 mb-6 leading-relaxed">
                {industry.longDescription}
              </p>

              {/* Stats Row */}
              <div className="grid grid-cols-4 gap-3 mb-6 p-4 bg-slate-800/30 rounded-2xl border border-slate-700/30">
                {industry.stats.map((stat, i) => (
                  <div key={i} className="text-center">
                    <div className={`text-2xl font-bold bg-gradient-to-r ${industry.gradient} bg-clip-text text-transparent`}>
                      {stat.value}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Pipeline Stages */}
              <div className="mb-8 p-4 bg-slate-800/30 rounded-2xl border border-slate-700/30">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-3 text-center">Your Sales Pipeline</p>
                <div className="flex items-center justify-between">
                  {industry.pipelineStages.map((stage, i) => (
                    <React.Fragment key={i}>
                      <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${industry.gradient} flex items-center justify-center text-white text-xs font-bold shadow-lg`}>
                          {i + 1}
                        </div>
                        <span className="text-xs text-gray-400 mt-2 text-center max-w-[60px]">{stage}</span>
                      </div>
                      {i < industry.pipelineStages.length - 1 && (
                        <div className={`flex-1 h-0.5 bg-gradient-to-r ${industry.gradient} mx-1 opacity-30`}></div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-4 mb-8">
                <Link
                  to="/register"
                  className={`inline-flex items-center justify-center bg-gradient-to-r ${industry.gradient} text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl hover:scale-105 group`}
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Start Free Trial
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <a
                  href="#demo"
                  className="inline-flex items-center justify-center bg-white/5 border-2 border-white/20 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/10 hover:border-white/30 transition-all group"
                >
                  <Play className="w-5 h-5 mr-2 fill-white group-hover:scale-110 transition-transform" />
                  Watch Demo
                </a>
              </div>

              {/* Trust Badges */}
              <div className="flex flex-wrap items-center gap-4 pt-6 border-t border-slate-700/50">
                <div className="flex items-center gap-3 bg-slate-800/50 rounded-full px-4 py-2 border border-slate-700/50">
                  <div className="flex -space-x-2">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className={`w-8 h-8 rounded-full bg-gradient-to-r ${industry.gradient} border-2 border-slate-900 flex items-center justify-center text-white text-xs font-bold shadow-lg`}>
                        {String.fromCharCode(65 + i)}
                      </div>
                    ))}
                  </div>
                  <span className="text-white text-sm font-medium">500+ companies</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-800/50 rounded-full px-4 py-2 border border-slate-700/50">
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                  <span className="text-white text-sm font-medium">4.9/5</span>
                </div>
              </div>
            </div>

            {/* Right Side - Industry Highlights */}
            <div className="relative lg:mt-16">
              <div className="relative">
                {/* Glow Effect */}
                <div className={`absolute inset-0 bg-gradient-to-r ${industry.gradient} opacity-20 blur-3xl -z-10 scale-95`}></div>

                {/* Highlights Card */}
                <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-2xl border border-white/10 overflow-hidden shadow-2xl p-6">
                  {/* Header */}
                  <div className="text-center mb-6">
                    <h3 className={`text-lg font-bold bg-gradient-to-r ${industry.gradient} bg-clip-text text-transparent mb-2`}>
                      Why {industry.title} Choose MyLeadX
                    </h3>
                  </div>

                  {/* Key Benefits */}
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${industry.gradient} flex items-center justify-center flex-shrink-0`}>
                        <Check className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-gray-300 text-sm">{industry.stats[0].value} {industry.stats[0].label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${industry.gradient} flex items-center justify-center flex-shrink-0`}>
                        <Check className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-gray-300 text-sm">{industry.stats[2].value} {industry.stats[2].label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${industry.gradient} flex items-center justify-center flex-shrink-0`}>
                        <Check className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-gray-300 text-sm">AI-powered automation built-in</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${industry.gradient} flex items-center justify-center flex-shrink-0`}>
                        <Check className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-gray-300 text-sm">Industry-specific pipeline stages</span>
                    </div>
                  </div>

                  {/* Top Integrations */}
                  <div className="mb-6">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Top Integrations</p>
                    <div className="flex flex-wrap gap-2">
                      {industry.integrations.slice(0, 5).map((integration, i) => (
                        <span
                          key={i}
                          className="bg-slate-700/50 text-gray-300 text-xs px-3 py-1.5 rounded-full border border-slate-600/50"
                        >
                          {integration}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Mini Testimonial */}
                  <div className={`bg-gradient-to-r ${industry.gradient} rounded-xl p-4 relative mb-6`}>
                    <div className="absolute inset-0 bg-black/20 rounded-xl"></div>
                    <div className="relative">
                      <div className="flex items-center gap-1 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                        ))}
                      </div>
                      <p className="text-white text-sm italic mb-2 line-clamp-2">
                        "{industry.testimonial.quote.substring(0, 100)}..."
                      </p>
                      <p className="text-white/80 text-xs font-medium">
                        {industry.testimonial.author}, {industry.testimonial.company}
                      </p>
                    </div>
                  </div>

                  {/* Quick Contact */}
                  <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/30">
                    <p className="text-gray-400 text-xs uppercase tracking-wider mb-3 text-center">Need Help?</p>
                    <a
                      href="tel:+919876543210"
                      className="flex items-center justify-center gap-2 w-full bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 rounded-lg py-2.5 mb-2 transition-colors"
                    >
                      <Phone className="w-4 h-4 text-green-400" />
                      <span className="text-white font-medium text-sm">Talk to Sales</span>
                    </a>
                    <p className="text-center text-gray-500 text-xs">or email us at sales@myleadx.ai</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Challenges Section */}
      <section className="py-20 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Challenges in <span className={`bg-gradient-to-r ${industry.gradient} bg-clip-text text-transparent`}>{industry.title}</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Common pain points we help solve for {industry.title.toLowerCase()} businesses.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {industry.challenges.map((challenge, i) => {
              const ChallengeIcon = challenge.icon;
              return (
                <div
                  key={i}
                  className="bg-slate-800/50 rounded-2xl p-6 border border-red-500/20 hover:border-red-500/40 transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-4">
                    <ChallengeIcon className="w-6 h-6 text-red-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{challenge.title}</h3>
                  <p className="text-gray-400 text-sm">{challenge.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Solutions Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              How MyLeadX <span className={`bg-gradient-to-r ${industry.gradient} bg-clip-text text-transparent`}>Solves It</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              AI-powered solutions designed specifically for {industry.title.toLowerCase()}.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {industry.solutions.map((solution, i) => {
              const SolutionIcon = solution.icon;
              return (
                <div
                  key={i}
                  className="bg-slate-800/50 rounded-2xl p-6 border border-green-500/20 hover:border-green-500/40 transition-all"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${industry.gradient} flex items-center justify-center mb-4`}>
                    <SolutionIcon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{solution.title}</h3>
                  <p className="text-gray-400 text-sm">{solution.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-20 bg-slate-900/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Why Choose <span className={`bg-gradient-to-r ${industry.gradient} bg-clip-text text-transparent`}>MyLeadX</span>?
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              See how MyLeadX compares to other solutions.
            </p>
          </div>

          <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-4 bg-slate-700/50 p-4">
              <div className="text-gray-400 font-medium">Feature</div>
              <div className="text-center text-gray-400 font-medium">Spreadsheets</div>
              <div className="text-center text-gray-400 font-medium">Other CRMs</div>
              <div className={`text-center font-bold bg-gradient-to-r ${industry.gradient} bg-clip-text text-transparent`}>MyLeadX</div>
            </div>
            {/* Row 1 */}
            <div className="grid grid-cols-4 p-4 border-t border-slate-700/30">
              <div className="text-white font-medium">AI Voice Calling</div>
              <div className="text-center text-red-400">✗</div>
              <div className="text-center text-red-400">✗</div>
              <div className="text-center text-green-400 font-bold">✓</div>
            </div>
            {/* Row 2 */}
            <div className="grid grid-cols-4 p-4 bg-slate-800/30 border-t border-slate-700/30">
              <div className="text-white font-medium">WhatsApp Integration</div>
              <div className="text-center text-red-400">✗</div>
              <div className="text-center text-yellow-400">Paid Add-on</div>
              <div className="text-center text-green-400 font-bold">✓ Included</div>
            </div>
            {/* Row 3 */}
            <div className="grid grid-cols-4 p-4 border-t border-slate-700/30">
              <div className="text-white font-medium">Auto Follow-ups</div>
              <div className="text-center text-red-400">✗</div>
              <div className="text-center text-green-400">✓</div>
              <div className="text-center text-green-400 font-bold">✓ AI-Powered</div>
            </div>
            {/* Row 4 */}
            <div className="grid grid-cols-4 p-4 bg-slate-800/30 border-t border-slate-700/30">
              <div className="text-white font-medium">{industry.title} Pipeline</div>
              <div className="text-center text-red-400">✗</div>
              <div className="text-center text-red-400">✗ Generic</div>
              <div className="text-center text-green-400 font-bold">✓ Pre-built</div>
            </div>
            {/* Row 5 */}
            <div className="grid grid-cols-4 p-4 border-t border-slate-700/30">
              <div className="text-white font-medium">Telecaller Mobile App</div>
              <div className="text-center text-red-400">✗</div>
              <div className="text-center text-yellow-400">Limited</div>
              <div className="text-center text-green-400 font-bold">✓ Full-Featured</div>
            </div>
            {/* Row 6 */}
            <div className="grid grid-cols-4 p-4 bg-slate-800/30 border-t border-slate-700/30">
              <div className="text-white font-medium">Starting Price</div>
              <div className="text-center text-gray-400">Free</div>
              <div className="text-center text-gray-400">₹2000+/user</div>
              <div className="text-center text-green-400 font-bold">₹499/user</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Features for <span className={`bg-gradient-to-r ${industry.gradient} bg-clip-text text-transparent`}>{industry.title}</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Industry-specific features that make MyLeadX perfect for your business.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {industry.features.map((feature, i) => {
              const FeatureIcon = feature.icon;
              return (
                <div
                  key={i}
                  className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 hover:border-cyan-500/30 transition-colors"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${industry.gradient} flex items-center justify-center mb-4`}>
                    <FeatureIcon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-gray-400 text-sm">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Use Cases
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              See how different types of {industry.title.toLowerCase()} businesses use MyLeadX.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {industry.useCases.map((useCase, i) => (
              <div
                key={i}
                className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 hover:border-cyan-500/30 transition-all flex items-start gap-4"
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${industry.gradient} flex items-center justify-center flex-shrink-0`}>
                  <Check className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">{useCase.title}</h3>
                  <p className="text-gray-400">{useCase.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Stats */}
      <section className="py-20 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Results You Can Expect
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {industry.benefits.map((benefit, i) => (
              <div key={i} className="text-center p-6 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                <div className={`text-4xl font-bold bg-gradient-to-r ${industry.gradient} bg-clip-text text-transparent mb-2`}>
                  {benefit.value}
                </div>
                <div className="text-gray-400">{benefit.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`bg-gradient-to-r ${industry.gradient} rounded-3xl p-8 md:p-12 text-center relative overflow-hidden`}>
            <div className="absolute inset-0 bg-black/20"></div>
            <div className="relative">
              <div className="flex justify-center mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <blockquote className="text-xl md:text-2xl text-white font-medium mb-6 leading-relaxed">
                "{industry.testimonial.quote}"
              </blockquote>
              <div className="text-white/90">
                <p className="font-semibold">{industry.testimonial.author}</p>
                <p className="text-white/70">{industry.testimonial.role}, {industry.testimonial.company}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Integrations Section */}
      <section className="py-20 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Integrates With Your <span className={`bg-gradient-to-r ${industry.gradient} bg-clip-text text-transparent`}>Favorite Tools</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Connect MyLeadX with the tools you already use.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            {industry.integrations.map((integration, i) => (
              <div
                key={i}
                className="bg-slate-800/50 rounded-xl px-6 py-3 border border-slate-700/50 text-white font-medium"
              >
                {integration}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Before vs After Section */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Before & After <span className={`bg-gradient-to-r ${industry.gradient} bg-clip-text text-transparent`}>MyLeadX</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              See the real impact on your {industry.title.toLowerCase()} business.
            </p>
          </div>

          <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden">
            <div className="grid grid-cols-3 bg-slate-700/50 p-4">
              <div className="text-gray-400 font-medium">Metric</div>
              <div className="text-center text-red-400 font-medium">Before</div>
              <div className="text-center text-green-400 font-medium">After MyLeadX</div>
            </div>
            {industry.beforeAfter.map((item, i) => (
              <div key={i} className={`grid grid-cols-3 p-4 ${i % 2 === 0 ? 'bg-slate-800/30' : ''}`}>
                <div className="text-white font-medium">{item.metric}</div>
                <div className="text-center text-red-400">{item.before}</div>
                <div className="text-center text-green-400 font-semibold">{item.after}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ROI Calculator */}
      <section className="py-20 bg-slate-900/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Calculate Your <span className={`bg-gradient-to-r ${industry.gradient} bg-clip-text text-transparent`}>ROI</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              See how much more revenue you could generate with MyLeadX.
            </p>
          </div>

          <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-8">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Input Section */}
              <div className="space-y-6">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Leads per month</label>
                  <input
                    type="number"
                    value={leadsPerMonth}
                    onChange={(e) => setLeadsPerMonth(Number(e.target.value) || 0)}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white text-lg focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Average deal value (₹)</label>
                  <input
                    type="number"
                    value={avgDealValue}
                    onChange={(e) => setAvgDealValue(Number(e.target.value) || 0)}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white text-lg focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="pt-4 border-t border-slate-700">
                  <p className="text-gray-500 text-sm">Based on average improvement of 2.5x conversion rate with MyLeadX</p>
                </div>
              </div>

              {/* Results Section */}
              <div className={`bg-gradient-to-br ${industry.gradient} rounded-xl p-6 relative`}>
                <div className="absolute inset-0 bg-black/20 rounded-xl"></div>
                <div className="relative space-y-4">
                  <h3 className="text-white/80 text-sm font-medium uppercase tracking-wider">With MyLeadX</h3>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-white/80">Extra conversions/month</span>
                      <span className="text-white text-xl font-bold">+{Math.round(leadsPerMonth * 0.10)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/80">Additional revenue</span>
                      <span className="text-white text-xl font-bold">₹{(Math.round(leadsPerMonth * 0.10) * avgDealValue).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/80">Hours saved/month</span>
                      <span className="text-white text-xl font-bold">{Math.round(leadsPerMonth * 0.5)} hrs</span>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-white/20">
                    <div className="flex justify-between items-center">
                      <span className="text-white font-medium">Annual Impact</span>
                      <span className="text-white text-2xl font-bold">₹{(Math.round(leadsPerMonth * 0.10) * avgDealValue * 12).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Frequently Asked <span className={`bg-gradient-to-r ${industry.gradient} bg-clip-text text-transparent`}>Questions</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Common questions about MyLeadX for {industry.title.toLowerCase()}.
            </p>
          </div>

          <div className="space-y-4">
            {industry.faqs.map((faq, i) => (
              <div
                key={i}
                className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden"
              >
                <button
                  onClick={() => setActiveQuestion(activeQuestion === i ? null : i)}
                  className="w-full flex items-center justify-between p-6 text-left"
                >
                  <span className="text-white font-medium pr-4">{faq.question}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${activeQuestion === i ? 'rotate-180' : ''}`}
                  />
                </button>
                {activeQuestion === i && (
                  <div className="px-6 pb-6 text-gray-400">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Transform Your {industry.title} Business?
          </h2>
          <p className="text-gray-400 text-lg mb-8">
            Join 500+ {industry.title.toLowerCase()} companies using MyLeadX to grow faster.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/register"
              className={`inline-flex items-center justify-center bg-gradient-to-r ${industry.gradient} text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl hover:scale-105 group`}
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Start Free Trial
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center bg-white/5 border-2 border-white/20 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/10 hover:border-white/30 transition-all"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default IndustryDetailPage;
