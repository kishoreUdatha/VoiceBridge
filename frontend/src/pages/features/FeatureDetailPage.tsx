/**
 * Feature Detail Page - Public pages for each feature
 * Rich content with animations and detailed information
 */
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  LayoutDashboard,
  GitBranch,
  Bot,
  BarChart3,
  Users,
  Activity,
  Workflow,
  PieChart,
  Target,
  PhoneCall,
  Headphones,
  Clock,
  Route,
  Brain,
  Smartphone,
  MessageSquare,
  Play,
  Sparkles,
  ChevronRight,
  Zap,
  Shield,
  Globe,
  TrendingUp,
  Star,
  Award,
  Layers,
  Settings,
  Bell,
  Mail,
  Calendar,
  FileText,
  Database,
  Lock,
  Cpu,
  Network,
  CircuitBoard,
  Mic,
  Volume2,
  BarChart2,
  LineChart,
  PieChartIcon,
  Filter,
  Search,
  Download,
  Upload,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  Plus,
  Minus,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  HelpCircle,
  ExternalLink,
  Share2,
  Copy,
  Bookmark,
  Heart,
  ThumbsUp,
  MessageCircle,
  Send,
  Inbox,
  Archive,
  Tag,
  Flag,
  MapPin,
  Navigation,
  Compass,
  Map,
} from 'lucide-react';
import { Navigation as Nav, Footer } from '../landing/components/LandingComponents';

// Feature data with comprehensive details
const FEATURES_DATA: Record<string, {
  title: string;
  subtitle: string;
  description: string;
  longDescription: string;
  icon: React.ElementType;
  gradient: string;
  heroImage: string;
  benefits: { title: string; description: string; icon: React.ElementType }[];
  capabilities: { title: string; description: string; icon: React.ElementType }[];
  stats: { value: string; label: string }[];
  useCases: { title: string; description: string }[];
  faqs: { question: string; answer: string }[];
  integrations?: string[];
  testimonial?: { quote: string; author: string; role: string; company: string };
}> = {
  'dashboard': {
    title: 'Dashboard Overview',
    subtitle: 'Real-time Sales Metrics & KPIs',
    description: 'Get a bird\'s eye view of your entire sales operation with beautiful, actionable dashboards.',
    longDescription: 'The MyLeadX Dashboard is your command center for sales intelligence. Built with AI at its core, it provides real-time visibility into every aspect of your sales operation. From lead flow to revenue metrics, team performance to conversion rates - everything you need is just a glance away. Our smart widgets automatically highlight what matters most, so you can make data-driven decisions instantly.',
    icon: LayoutDashboard,
    gradient: 'from-cyan-500 to-blue-600',
    heroImage: '/screenshots/02-dashboard.png',
    benefits: [
      { title: 'Real-time Updates', description: 'Metrics refresh every 60 seconds automatically', icon: RefreshCw },
      { title: 'Smart Alerts', description: 'AI notifies you of important changes instantly', icon: Bell },
      { title: 'Custom Widgets', description: 'Drag and drop to create your perfect view', icon: Layers },
      { title: 'Role-based Views', description: 'Different dashboards for different team roles', icon: Users },
    ],
    capabilities: [
      { title: 'Live KPI Tracking', description: 'Monitor conversion rates, revenue, call metrics, and team performance in real-time with AI-powered insights', icon: TrendingUp },
      { title: 'Team Leaderboards', description: 'Gamified leaderboards to motivate your team with rankings, badges, and achievement tracking', icon: Award },
      { title: 'Activity Timeline', description: 'Chronological feed of all activities across your organization with smart filtering and search', icon: Clock },
      { title: 'Revenue Analytics', description: 'Track daily, weekly, monthly revenue with forecasting and trend analysis powered by machine learning', icon: BarChart3 },
    ],
    stats: [
      { value: '99.9%', label: 'Uptime SLA' },
      { value: '<1s', label: 'Load Time' },
      { value: '50+', label: 'Widget Types' },
      { value: '24/7', label: 'Real-time Data' },
    ],
    useCases: [
      { title: 'Sales Managers', description: 'Monitor team performance and pipeline health at a glance' },
      { title: 'Business Owners', description: 'Track revenue, growth metrics, and business KPIs' },
      { title: 'Team Leaders', description: 'Keep tabs on team activities and individual performance' },
      { title: 'Operations Heads', description: 'Ensure smooth operations with system health monitoring' },
    ],
    faqs: [
      { question: 'Can I customize the dashboard?', answer: 'Yes! You can drag-and-drop widgets, resize them, and create multiple dashboard layouts for different purposes.' },
      { question: 'How often does data refresh?', answer: 'Dashboard data refreshes automatically every 60 seconds. You can also manually refresh anytime.' },
      { question: 'Can different team members see different dashboards?', answer: 'Absolutely. Role-based access control lets you create custom dashboards for different roles like sales reps, managers, and executives.' },
    ],
    testimonial: {
      quote: 'The dashboard gives me everything I need in one place. I start every morning here to check team performance and pipeline health.',
      author: 'Rajesh Kumar',
      role: 'Sales Director',
      company: 'TechEd Solutions',
    },
  },
  'pipeline': {
    title: 'Sales Pipeline',
    subtitle: 'Kanban Board with Drag-Drop Stages',
    description: 'Visualize your entire sales process with an intuitive Kanban board.',
    longDescription: 'Transform how you manage deals with our visual sales pipeline. The drag-and-drop Kanban interface makes it effortless to track every opportunity from first contact to closed won. AI automatically suggests next best actions, predicts close probabilities, and alerts you when deals are at risk. Create unlimited custom pipelines for different products, teams, or sales processes.',
    icon: GitBranch,
    gradient: 'from-purple-500 to-pink-500',
    heroImage: '/screenshots/04-pipeline.png',
    benefits: [
      { title: 'Visual Deal Tracking', description: 'See all deals at a glance with intuitive Kanban cards', icon: Eye },
      { title: 'AI Deal Predictions', description: 'ML models predict close probability for each deal', icon: Brain },
      { title: 'Automated Workflows', description: 'Trigger actions automatically when deals move stages', icon: Workflow },
      { title: 'Revenue Forecasting', description: 'Accurate revenue predictions based on pipeline data', icon: TrendingUp },
    ],
    capabilities: [
      { title: 'Multiple Pipelines', description: 'Create separate pipelines for different products, services, or teams with unique stages and rules', icon: Layers },
      { title: 'Stage Automation', description: 'Auto-trigger emails, tasks, notifications when leads move between stages', icon: Zap },
      { title: 'Deal Scoring', description: 'AI analyzes engagement, timeline, and behavior to score deals and highlight winners', icon: Star },
      { title: 'Pipeline Analytics', description: 'Identify bottlenecks, optimize stage conversion rates, and improve velocity', icon: BarChart3 },
    ],
    stats: [
      { value: '40%', label: 'Faster Deal Velocity' },
      { value: '3x', label: 'Better Visibility' },
      { value: '25%', label: 'Higher Win Rate' },
      { value: '∞', label: 'Custom Pipelines' },
    ],
    useCases: [
      { title: 'B2B Sales Teams', description: 'Track complex enterprise deals through long sales cycles' },
      { title: 'Real Estate', description: 'Manage property listings and buyer journeys visually' },
      { title: 'Education', description: 'Track student admissions from inquiry to enrollment' },
      { title: 'Insurance', description: 'Manage policy applications and renewals efficiently' },
    ],
    faqs: [
      { question: 'How many pipelines can I create?', answer: 'You can create unlimited pipelines. Most teams create separate pipelines for different products or sales processes.' },
      { question: 'Can I customize pipeline stages?', answer: 'Yes, you can add, remove, rename, and reorder stages. You can also set stage-specific automations and requirements.' },
      { question: 'Does it integrate with other features?', answer: 'The pipeline is deeply integrated with leads, calls, analytics, and automation features for a seamless workflow.' },
    ],
    testimonial: {
      quote: 'We went from losing deals in spreadsheets to having complete visibility. Our win rate improved by 30% in the first quarter.',
      author: 'Priya Sharma',
      role: 'Head of Sales',
      company: 'PropMart Realty',
    },
  },
  'voice-ai': {
    title: 'Voice AI Agents',
    subtitle: 'Create AI Bots That Call in 10+ Languages',
    description: 'Deploy intelligent voice agents that make natural-sounding calls to your leads.',
    longDescription: 'Revolutionary AI voice technology that transforms how you engage with leads. Our voice agents conduct natural, human-like conversations in Hindi, English, Tamil, Telugu, and 6+ more Indian languages. They can qualify leads, answer questions, handle objections, and book meetings - all automatically. With sentiment analysis and real-time adaptation, every conversation feels personal and authentic.',
    icon: Bot,
    gradient: 'from-cyan-500 to-blue-600',
    heroImage: '/screenshots/07-calling.png',
    benefits: [
      { title: 'Multi-lingual AI', description: 'Native fluency in 10+ Indian languages including Hindi, Tamil, Telugu', icon: Globe },
      { title: 'Natural Conversations', description: 'Human-like voice with emotional intelligence and context awareness', icon: MessageCircle },
      { title: '24/7 Availability', description: 'AI agents work round the clock, never miss a lead', icon: Clock },
      { title: 'Instant Scaling', description: 'Make 1000s of calls simultaneously without hiring', icon: Zap },
    ],
    capabilities: [
      { title: 'Conversational AI Engine', description: 'Advanced NLP understands context, handles interruptions, and responds naturally to any question', icon: Brain },
      { title: 'Voice Cloning', description: 'Create custom AI voices that match your brand personality or clone existing voices', icon: Mic },
      { title: 'Sentiment Analysis', description: 'Real-time emotion detection adapts conversation tone and approach dynamically', icon: Heart },
      { title: 'Smart Handoffs', description: 'Seamlessly transfer to human agents when needed with full context', icon: Users },
    ],
    stats: [
      { value: '10+', label: 'Languages Supported' },
      { value: '95%', label: 'Understanding Accuracy' },
      { value: '3x', label: 'More Calls Per Day' },
      { value: '60%', label: 'Cost Reduction' },
    ],
    useCases: [
      { title: 'Lead Qualification', description: 'AI qualifies leads 24/7, passing only hot prospects to your team' },
      { title: 'Appointment Setting', description: 'Book meetings automatically by checking calendar availability' },
      { title: 'Follow-up Calls', description: 'Never miss a follow-up with automated reminder calls' },
      { title: 'Survey & Feedback', description: 'Collect customer feedback at scale with conversational surveys' },
    ],
    faqs: [
      { question: 'How natural does the AI voice sound?', answer: 'Our AI uses state-of-the-art neural voice synthesis. Most people cannot distinguish it from a human caller.' },
      { question: 'Can the AI handle complex questions?', answer: 'Yes! The AI is trained on your business context and can answer product questions, handle objections, and escalate when needed.' },
      { question: 'What languages are supported?', answer: 'Hindi, English, Tamil, Telugu, Kannada, Malayalam, Bengali, Marathi, Gujarati, and Punjabi with more coming soon.' },
    ],
    testimonial: {
      quote: 'The AI agents handle 500+ calls daily in Hindi and English. Our conversion rate jumped from 8% to 23% in just 2 months.',
      author: 'Amit Patel',
      role: 'CEO',
      company: 'EduTech Solutions',
    },
    integrations: ['Twilio', 'Exotel', 'Knowlarity', 'Ozonetel', 'Custom SIP'],
  },
  'analytics': {
    title: 'Analytics & Reports',
    subtitle: 'Conversion Funnel & Team Performance',
    description: 'Make data-driven decisions with comprehensive analytics and AI insights.',
    longDescription: 'Turn data into action with MyLeadX Analytics. Our AI doesn\'t just show you numbers - it tells you what they mean and what to do about it. From conversion funnel analysis to predictive revenue forecasting, get insights that drive real business results. Custom report builder lets you create exactly the reports you need, delivered automatically to your inbox.',
    icon: BarChart3,
    gradient: 'from-green-500 to-emerald-500',
    heroImage: '/screenshots/05-analytics.png',
    benefits: [
      { title: 'AI-Powered Insights', description: 'Machine learning identifies patterns and opportunities automatically', icon: Brain },
      { title: 'Custom Reports', description: 'Drag-and-drop report builder for any metric combination', icon: FileText },
      { title: 'Automated Delivery', description: 'Schedule reports to arrive in your inbox daily/weekly', icon: Mail },
      { title: 'Export Anywhere', description: 'Export to Excel, PDF, or integrate with BI tools', icon: Download },
    ],
    capabilities: [
      { title: 'Conversion Funnel', description: 'Visualize every step of your sales process, identify drop-offs, and optimize conversion rates', icon: Filter },
      { title: 'Team Performance', description: 'Compare team members, track quotas, identify top performers and coaching opportunities', icon: Users },
      { title: 'Revenue Analytics', description: 'Track ARR, MRR, churn, LTV and other SaaS metrics with cohort analysis', icon: TrendingUp },
      { title: 'Campaign ROI', description: 'Measure marketing campaign effectiveness with multi-touch attribution', icon: Target },
    ],
    stats: [
      { value: '100+', label: 'Report Templates' },
      { value: '50+', label: 'Metrics Tracked' },
      { value: '99%', label: 'Data Accuracy' },
      { value: 'Real-time', label: 'Data Updates' },
    ],
    useCases: [
      { title: 'Sales Managers', description: 'Track team performance and identify coaching opportunities' },
      { title: 'Marketing Teams', description: 'Measure campaign ROI and optimize spend allocation' },
      { title: 'C-Suite Executives', description: 'Get board-ready reports on business performance' },
      { title: 'Operations', description: 'Monitor efficiency metrics and process improvements' },
    ],
    faqs: [
      { question: 'Can I build custom reports?', answer: 'Yes! Our drag-and-drop report builder lets you combine any metrics, apply filters, and save custom reports.' },
      { question: 'How far back does historical data go?', answer: 'We store all historical data with no limits. Analyze trends over any time period.' },
      { question: 'Can I export reports?', answer: 'Export to Excel, CSV, PDF, or connect to BI tools like Power BI, Tableau, and Google Data Studio.' },
    ],
    testimonial: {
      quote: 'The analytics dashboard helped us identify a bottleneck in our funnel that was costing us 20% of conversions. Fixed it in a week.',
      author: 'Sneha Reddy',
      role: 'VP Sales',
      company: 'InsureTech India',
    },
  },
  'team-management': {
    title: 'Team Management',
    subtitle: 'Manage Users, Roles & Permissions',
    description: 'Organize your team with powerful user management and access control.',
    longDescription: 'Build and manage high-performing sales teams with comprehensive user management. Create custom roles with granular permissions, organize teams by branch or department, and track individual performance. Our hierarchy system supports complex organizational structures while keeping administration simple.',
    icon: Users,
    gradient: 'from-orange-500 to-red-500',
    heroImage: '/screenshots/06-team.png',
    benefits: [
      { title: 'Granular Permissions', description: 'Control access to every feature and data point', icon: Lock },
      { title: 'Team Hierarchy', description: 'Mirror your org structure with managers and teams', icon: Network },
      { title: 'Activity Tracking', description: 'See who did what, when, with full audit logs', icon: Eye },
      { title: 'Bulk Operations', description: 'Add, update, or reassign users in bulk', icon: Upload },
    ],
    capabilities: [
      { title: 'Custom Roles', description: 'Create unlimited roles with specific permissions for each feature and action', icon: Shield },
      { title: 'Branch Management', description: 'Organize users by branch, department, or region with separate data access', icon: MapPin },
      { title: 'Performance Tracking', description: 'Monitor individual metrics, set targets, and track goal achievement', icon: Target },
      { title: 'Audit Logs', description: 'Complete audit trail of all user actions for compliance and security', icon: FileText },
    ],
    stats: [
      { value: 'Unlimited', label: 'Users Supported' },
      { value: '100+', label: 'Permission Options' },
      { value: 'GDPR', label: 'Compliant' },
      { value: 'SOC 2', label: 'Certified' },
    ],
    useCases: [
      { title: 'Large Teams', description: 'Manage hundreds of users with role-based access control' },
      { title: 'Multi-branch Orgs', description: 'Separate data and access by location or department' },
      { title: 'Enterprises', description: 'Complex permission hierarchies for regulated industries' },
      { title: 'BPOs', description: 'Manage agent shifts, queues, and performance' },
    ],
    faqs: [
      { question: 'How many users can I add?', answer: 'There\'s no limit on users. Our platform scales to support organizations of any size.' },
      { question: 'Can I restrict data access by branch?', answer: 'Yes! Branch-level permissions ensure users only see data relevant to their location.' },
      { question: 'Is there an audit log?', answer: 'Complete audit logs track every action with timestamps, IP addresses, and user details.' },
    ],
    testimonial: {
      quote: 'Managing 200+ telecallers across 5 cities became effortless. The role-based access saves us hours of admin work.',
      author: 'Vikram Singh',
      role: 'Operations Head',
      company: 'CallCenter Pro',
    },
  },
  'call-monitoring': {
    title: 'Live Call Monitoring',
    subtitle: 'Listen to Calls & Coach in Real-time',
    description: 'Monitor live calls, whisper guidance, and improve call quality.',
    longDescription: 'Take your team\'s call quality to the next level with live monitoring. Listen to any active call in real-time, whisper coaching tips that only your agent can hear, or barge in when needed. AI automatically scores every call and provides actionable feedback. Use call recordings for training and compliance.',
    icon: Activity,
    gradient: 'from-red-500 to-rose-500',
    heroImage: '/screenshots/02-dashboard.png',
    benefits: [
      { title: 'Live Listening', description: 'Monitor any call in real-time from anywhere', icon: Headphones },
      { title: 'Whisper Mode', description: 'Coach agents without the customer hearing', icon: Volume2 },
      { title: 'Barge-in', description: 'Join calls when intervention is needed', icon: PhoneCall },
      { title: 'AI Scoring', description: 'Every call automatically scored for quality', icon: Star },
    ],
    capabilities: [
      { title: 'Real-time Dashboard', description: 'See all active calls with agent name, duration, customer info, and sentiment indicator', icon: LayoutDashboard },
      { title: 'Call Recording', description: 'Every call automatically recorded, transcribed, and stored for review', icon: Database },
      { title: 'Quality Scorecards', description: 'AI evaluates calls on greeting, pitch, objection handling, and closing', icon: CheckCircle },
      { title: 'Training Library', description: 'Save best calls as examples for training new agents', icon: Bookmark },
    ],
    stats: [
      { value: 'Real-time', label: 'Monitoring' },
      { value: '100%', label: 'Calls Recorded' },
      { value: 'AI', label: 'Call Scoring' },
      { value: '30%', label: 'Quality Improvement' },
    ],
    useCases: [
      { title: 'QA Managers', description: 'Monitor and score calls for quality assurance' },
      { title: 'Team Leaders', description: 'Coach team members in real-time during calls' },
      { title: 'Training', description: 'Use recorded calls for onboarding new agents' },
      { title: 'Compliance', description: 'Ensure regulatory compliance with call recordings' },
    ],
    faqs: [
      { question: 'Can customers hear me in whisper mode?', answer: 'No, whisper mode is one-way. Only your agent can hear your coaching tips.' },
      { question: 'How long are recordings stored?', answer: 'Recordings are stored based on your plan. Enterprise plans offer unlimited retention.' },
      { question: 'Is call recording compliant?', answer: 'Yes, we support automatic disclosure messages for compliance with recording laws.' },
    ],
    testimonial: {
      quote: 'The whisper coaching feature transformed our training. New agents ramp up 50% faster with real-time guidance.',
      author: 'Meera Nair',
      role: 'Training Manager',
      company: 'SalesForce India',
    },
  },
  'workflow-builder': {
    title: 'Workflow Builder',
    subtitle: 'Visual Automation with Triggers',
    description: 'Automate repetitive tasks with a visual drag-and-drop workflow builder.',
    longDescription: 'Stop doing repetitive tasks manually. Our visual workflow builder lets you automate complex sales processes with simple drag-and-drop. Set triggers based on lead actions, time delays, or AI insights. Chain multiple actions including emails, SMS, WhatsApp, calls, task creation, and more. Pre-built templates get you started in minutes.',
    icon: Workflow,
    gradient: 'from-blue-500 to-indigo-500',
    heroImage: '/screenshots/02-dashboard.png',
    benefits: [
      { title: 'No Code Required', description: 'Visual drag-and-drop interface for everyone', icon: Layers },
      { title: 'Multi-channel', description: 'Trigger actions across email, SMS, WhatsApp, calls', icon: Share2 },
      { title: 'Smart Conditions', description: 'Add if/then logic for intelligent automation', icon: GitBranch },
      { title: 'Templates', description: '50+ pre-built workflows for common use cases', icon: Copy },
    ],
    capabilities: [
      { title: 'Trigger Library', description: 'Start workflows from lead creation, stage change, form submission, or custom events', icon: Zap },
      { title: 'Action Builder', description: 'Send emails, SMS, WhatsApp, create tasks, update fields, or trigger AI calls', icon: Settings },
      { title: 'Conditional Logic', description: 'Add branches based on lead data, behavior, or AI scoring for personalized journeys', icon: GitBranch },
      { title: 'Time Delays', description: 'Wait for specified time periods or until specific conditions are met', icon: Clock },
    ],
    stats: [
      { value: '50+', label: 'Templates' },
      { value: '20+', label: 'Trigger Types' },
      { value: '30+', label: 'Action Types' },
      { value: '80%', label: 'Time Saved' },
    ],
    useCases: [
      { title: 'Lead Nurturing', description: 'Automated email sequences based on lead behavior' },
      { title: 'Follow-up Automation', description: 'Never miss a follow-up with automated reminders' },
      { title: 'Task Assignment', description: 'Auto-assign leads to reps based on rules' },
      { title: 'Notifications', description: 'Alert team members when important events occur' },
    ],
    faqs: [
      { question: 'Do I need coding skills?', answer: 'Not at all! The visual builder is designed for non-technical users. Just drag, drop, and connect.' },
      { question: 'Can workflows trigger AI calls?', answer: 'Yes! You can trigger AI voice agent calls as part of any workflow.' },
      { question: 'How many workflows can I create?', answer: 'Unlimited workflows on all plans. Run as many automations as you need.' },
    ],
    testimonial: {
      quote: 'We automated our entire follow-up process. What took 3 hours daily now runs automatically while we focus on selling.',
      author: 'Karthik Rao',
      role: 'Sales Manager',
      company: 'FinServ Solutions',
    },
  },
  'predictive-analytics': {
    title: 'Predictive Analytics',
    subtitle: 'AI Forecasts & Deal Predictions',
    description: 'Let AI predict outcomes and recommend the best actions.',
    longDescription: 'Harness the power of machine learning to predict sales outcomes before they happen. Our AI analyzes thousands of data points to forecast revenue, predict which leads will convert, identify at-risk deals, and recommend the next best action. Make proactive decisions based on data, not guesswork.',
    icon: PieChart,
    gradient: 'from-purple-500 to-pink-500',
    heroImage: '/screenshots/05-analytics.png',
    benefits: [
      { title: 'Revenue Forecasting', description: 'AI predicts monthly/quarterly revenue with 90%+ accuracy', icon: TrendingUp },
      { title: 'Lead Scoring', description: 'Know which leads are most likely to convert', icon: Target },
      { title: 'Churn Prediction', description: 'Identify at-risk customers before they leave', icon: AlertCircle },
      { title: 'Next Best Action', description: 'AI recommends what to do next for each lead', icon: Compass },
    ],
    capabilities: [
      { title: 'Conversion Prediction', description: 'ML models predict conversion probability for each lead based on 100+ signals', icon: Brain },
      { title: 'Revenue Forecast', description: 'Accurate monthly and quarterly projections with confidence intervals', icon: LineChart },
      { title: 'Risk Detection', description: 'Early warning system for deals that are stalling or at risk', icon: Shield },
      { title: 'Recommendation Engine', description: 'AI suggests optimal timing, channel, and message for each interaction', icon: Sparkles },
    ],
    stats: [
      { value: '94%', label: 'Prediction Accuracy' },
      { value: '2x', label: 'Faster Decisions' },
      { value: '30%', label: 'Revenue Increase' },
      { value: '50%', label: 'Churn Reduction' },
    ],
    useCases: [
      { title: 'Sales Planning', description: 'Accurate forecasts for quota setting and resource allocation' },
      { title: 'Revenue Operations', description: 'Data-driven pipeline management and forecasting' },
      { title: 'Customer Success', description: 'Proactive intervention for at-risk accounts' },
      { title: 'Strategy', description: 'Identify patterns and optimize sales processes' },
    ],
    faqs: [
      { question: 'How accurate are the predictions?', answer: 'Our models achieve 94% accuracy on average, improving over time as they learn from your data.' },
      { question: 'How much data do you need?', answer: 'Predictions start working with just 100 leads. Accuracy improves with more historical data.' },
      { question: 'Can I see why AI made a prediction?', answer: 'Yes! Every prediction includes explainability - the factors that contributed to the score.' },
    ],
    testimonial: {
      quote: 'The revenue forecasting is incredibly accurate. We now plan with confidence instead of guessing.',
      author: 'Suresh Menon',
      role: 'CFO',
      company: 'GrowthTech India',
    },
  },
  'leads': {
    title: 'Lead Management',
    subtitle: 'Track Leads with AI Scoring',
    description: 'Capture, organize, and prioritize all your leads in one place.',
    longDescription: 'Your complete system for lead management. Capture leads from any source - web forms, ads, manual entry, or API integrations. AI automatically enriches lead data, assigns priority scores, and distributes to the right team members. Track every interaction, set follow-up reminders, and never let a hot lead go cold.',
    icon: Target,
    gradient: 'from-orange-500 to-red-500',
    heroImage: '/screenshots/03-leads.png',
    benefits: [
      { title: 'Multi-source Capture', description: 'Collect leads from forms, ads, APIs, and more', icon: Download },
      { title: 'AI Enrichment', description: 'Auto-enrich leads with company and contact data', icon: Database },
      { title: 'Smart Distribution', description: 'Auto-assign leads based on rules and availability', icon: Share2 },
      { title: 'Activity Timeline', description: 'Complete history of every interaction', icon: Clock },
    ],
    capabilities: [
      { title: 'Lead Capture', description: 'Forms, landing pages, Facebook Ads, Google Ads, and 30+ integrations', icon: Download },
      { title: 'Data Enrichment', description: 'AI auto-fills company info, social profiles, and contact details', icon: Sparkles },
      { title: 'Lead Distribution', description: 'Round-robin, weighted, or rule-based auto-assignment', icon: Users },
      { title: 'Duplicate Detection', description: 'AI identifies and merges duplicate leads automatically', icon: Copy },
    ],
    stats: [
      { value: '30+', label: 'Integrations' },
      { value: '95%', label: 'Data Accuracy' },
      { value: '50%', label: 'Faster Response' },
      { value: '100%', label: 'Lead Visibility' },
    ],
    useCases: [
      { title: 'Sales Teams', description: 'Centralized lead database with complete context' },
      { title: 'Marketing', description: 'Track lead sources and campaign performance' },
      { title: 'Education', description: 'Manage student inquiries and applications' },
      { title: 'Real Estate', description: 'Track property inquiries and buyer journeys' },
    ],
    faqs: [
      { question: 'How do leads get into the system?', answer: 'Multiple ways: web forms, Facebook/Google Ads integration, manual entry, bulk import, or API.' },
      { question: 'Can I import existing leads?', answer: 'Yes! Bulk import from Excel/CSV with automatic field mapping and duplicate detection.' },
      { question: 'How does lead assignment work?', answer: 'Configure rules based on source, location, product interest, or use round-robin distribution.' },
    ],
    testimonial: {
      quote: 'We went from leads scattered in spreadsheets to a single source of truth. Response time improved by 60%.',
      author: 'Ananya Iyer',
      role: 'Marketing Head',
      company: 'LearnHub Academy',
    },
  },
  'outbound-calls': {
    title: 'AI Outbound Calling',
    subtitle: 'Single Calls & Bulk Campaigns',
    description: 'Make calls at scale with AI handling the conversations.',
    longDescription: 'Revolutionize your outbound calling with AI. Make single calls with one click or launch campaigns that call thousands of leads automatically. AI handles the entire conversation - qualifying leads, answering questions, handling objections, and booking meetings. Your team focuses on closing while AI does the heavy lifting.',
    icon: PhoneCall,
    gradient: 'from-cyan-500 to-blue-600',
    heroImage: '/screenshots/07-calling.png',
    benefits: [
      { title: 'One-Click Calling', description: 'Make calls instantly from any lead record', icon: PhoneCall },
      { title: 'Bulk Campaigns', description: 'Upload lists and let AI call thousands', icon: Upload },
      { title: 'AI Conversations', description: 'Natural conversations that qualify and convert', icon: Bot },
      { title: 'Smart Scheduling', description: 'Call at optimal times for each timezone', icon: Calendar },
    ],
    capabilities: [
      { title: 'Campaign Builder', description: 'Create campaigns with targeting rules, scripts, and scheduling in minutes', icon: Settings },
      { title: 'Power Dialer', description: 'Auto-dial through lists with smart pacing and retry logic', icon: Zap },
      { title: 'Call Recording', description: 'Every call recorded, transcribed, and analyzed automatically', icon: Mic },
      { title: 'Real-time Analytics', description: 'Monitor campaign performance with live dashboards', icon: BarChart3 },
    ],
    stats: [
      { value: '10x', label: 'More Calls/Day' },
      { value: '60%', label: 'Cost Savings' },
      { value: '24/7', label: 'AI Availability' },
      { value: '3x', label: 'Conversion Rate' },
    ],
    useCases: [
      { title: 'Lead Qualification', description: 'AI calls and qualifies leads before human follow-up' },
      { title: 'Appointment Setting', description: 'Book demos and meetings automatically' },
      { title: 'Collections', description: 'Payment reminders and follow-ups at scale' },
      { title: 'Surveys', description: 'Collect feedback with conversational surveys' },
    ],
    faqs: [
      { question: 'How many calls can AI make per day?', answer: 'Unlimited! AI can handle thousands of concurrent calls. Scale based on your needs.' },
      { question: 'Do I need to provide phone numbers?', answer: 'We can provide local and toll-free numbers, or use your existing numbers.' },
      { question: 'What if someone wants to talk to a human?', answer: 'AI seamlessly transfers to available agents with full context of the conversation.' },
    ],
    testimonial: {
      quote: 'We replaced 10 callers with AI and increased our qualified leads by 300%. The ROI was immediate.',
      author: 'Rakesh Gupta',
      role: 'Call Center Manager',
      company: 'QuickLoans India',
    },
  },
  'telecaller-app': {
    title: 'Telecaller Dashboard',
    subtitle: 'Call Queue, Scripts & One-Click Dialing',
    description: 'Everything telecallers need in one streamlined interface.',
    longDescription: 'Purpose-built for telecallers, this dashboard puts everything needed at their fingertips. See the call queue prioritized by AI, view lead details and history before calling, follow dynamic scripts, and update dispositions with one click. Designed for efficiency, it minimizes clicks and maximizes talk time.',
    icon: Headphones,
    gradient: 'from-green-500 to-emerald-500',
    heroImage: '/screenshots/02-dashboard.png',
    benefits: [
      { title: 'Smart Queue', description: 'AI-prioritized list of leads to call', icon: Layers },
      { title: 'One-Click Dial', description: 'Start calls instantly without switching screens', icon: PhoneCall },
      { title: 'Dynamic Scripts', description: 'AI-suggested talking points based on lead profile', icon: FileText },
      { title: 'Quick Disposition', description: 'Update outcomes with single-click buttons', icon: Check },
    ],
    capabilities: [
      { title: 'Priority Queue', description: 'AI ranks leads by conversion probability and optimal call timing', icon: TrendingUp },
      { title: 'Lead Context', description: 'Full lead history, notes, and previous interactions visible before calling', icon: Eye },
      { title: 'Script Display', description: 'Dynamic scripts with branching based on customer responses', icon: MessageCircle },
      { title: 'Personal Stats', description: 'Real-time view of personal performance vs targets', icon: BarChart3 },
    ],
    stats: [
      { value: '40%', label: 'More Calls/Day' },
      { value: '2x', label: 'Talk Time' },
      { value: '50%', label: 'Faster Disposition' },
      { value: '30%', label: 'Better Conversion' },
    ],
    useCases: [
      { title: 'Inside Sales', description: 'Efficient calling for high-volume sales teams' },
      { title: 'Customer Service', description: 'Outbound support and check-in calls' },
      { title: 'Collections', description: 'Payment follow-up with prioritized queues' },
      { title: 'Surveys', description: 'Customer feedback and research calls' },
    ],
    faqs: [
      { question: 'Can telecallers see their performance?', answer: 'Yes! Personal dashboards show calls made, conversions, and progress vs targets.' },
      { question: 'How does the queue get prioritized?', answer: 'AI considers lead score, last contact time, timezone, and historical best times to connect.' },
      { question: 'Can managers see telecaller activity?', answer: 'Managers get real-time visibility into who\'s calling, call durations, and outcomes.' },
    ],
    testimonial: {
      quote: 'The telecaller dashboard increased our calls per agent by 40%. Less clicking, more talking.',
      author: 'Deepa Krishnan',
      role: 'Team Lead',
      company: 'InsureMax',
    },
  },
  'call-history': {
    title: 'Call History & Recordings',
    subtitle: 'Full Recordings with AI Transcripts',
    description: 'Access complete call history with recordings and AI analysis.',
    longDescription: 'Never lose track of a conversation again. Every call is automatically recorded, transcribed, and analyzed by AI. Search across thousands of calls by keyword, filter by outcome or agent, and get instant access to any recording. AI extracts key points, action items, and sentiment from every conversation.',
    icon: Clock,
    gradient: 'from-purple-500 to-pink-500',
    heroImage: '/screenshots/02-dashboard.png',
    benefits: [
      { title: 'Auto Recording', description: 'Every call recorded automatically, no setup needed', icon: Mic },
      { title: 'AI Transcription', description: 'Accurate transcripts in multiple languages', icon: FileText },
      { title: 'Smart Search', description: 'Find any call by keyword, date, or agent', icon: Search },
      { title: 'Sentiment Analysis', description: 'AI detects customer sentiment and emotions', icon: Heart },
    ],
    capabilities: [
      { title: 'Universal Recording', description: 'Record all inbound and outbound calls across AI and human agents', icon: Mic },
      { title: 'Multi-lingual Transcription', description: 'Accurate transcripts in Hindi, English, and regional languages', icon: Globe },
      { title: 'Call Analytics', description: 'Talk ratio, silence detection, keywords mentioned, and more', icon: BarChart3 },
      { title: 'Action Extraction', description: 'AI identifies action items and follow-up tasks from conversations', icon: CheckCircle },
    ],
    stats: [
      { value: '100%', label: 'Calls Recorded' },
      { value: '95%', label: 'Transcription Accuracy' },
      { value: 'Instant', label: 'Search Results' },
      { value: '10+', label: 'Languages' },
    ],
    useCases: [
      { title: 'Quality Assurance', description: 'Review calls for training and compliance' },
      { title: 'Training', description: 'Use best calls as examples for new hires' },
      { title: 'Compliance', description: 'Maintain records for regulatory requirements' },
      { title: 'Dispute Resolution', description: 'Reference recordings to resolve disagreements' },
    ],
    faqs: [
      { question: 'How long are recordings stored?', answer: 'Storage duration depends on your plan. Enterprise plans offer unlimited retention.' },
      { question: 'Can I download recordings?', answer: 'Yes, recordings can be downloaded as MP3 files or exported in bulk.' },
      { question: 'Is recording compliant with regulations?', answer: 'Yes, we support automatic disclosure and consent management for compliance.' },
    ],
    testimonial: {
      quote: 'The AI transcription is a game-changer. We can search for keywords across thousands of calls in seconds.',
      author: 'Nikhil Sharma',
      role: 'QA Manager',
      company: 'TeleServices Ltd',
    },
  },
  'customer-journey': {
    title: 'Customer Journey',
    subtitle: 'Track Every Lead Interaction',
    description: 'See the complete journey from first touch to conversion.',
    longDescription: 'Understand exactly how your customers interact with your business across every touchpoint. From the first ad click to the final purchase, visualize the complete journey. AI identifies common paths to conversion, highlights friction points, and recommends optimization opportunities. Essential for improving conversion rates.',
    icon: Route,
    gradient: 'from-blue-500 to-indigo-500',
    heroImage: '/screenshots/02-dashboard.png',
    benefits: [
      { title: 'Complete Timeline', description: 'Every interaction in chronological order', icon: Clock },
      { title: 'Multi-channel Tracking', description: 'Calls, emails, WhatsApp, web visits unified', icon: Layers },
      { title: 'Journey Mapping', description: 'Visualize common paths to conversion', icon: Map },
      { title: 'Attribution', description: 'Know which touchpoints drive conversions', icon: Target },
    ],
    capabilities: [
      { title: 'Unified Timeline', description: 'All interactions across channels displayed in one chronological view', icon: Clock },
      { title: 'Journey Analytics', description: 'Identify the most common paths that lead to conversion', icon: TrendingUp },
      { title: 'Attribution Modeling', description: 'First-touch, last-touch, and multi-touch attribution options', icon: GitBranch },
      { title: 'Engagement Scoring', description: 'Track and visualize engagement level over time', icon: BarChart3 },
    ],
    stats: [
      { value: '360°', label: 'Customer View' },
      { value: 'All', label: 'Channels Tracked' },
      { value: 'Real-time', label: 'Updates' },
      { value: '3x', label: 'Better Attribution' },
    ],
    useCases: [
      { title: 'Marketing', description: 'Understand which channels and campaigns drive results' },
      { title: 'Sales', description: 'See full context before every conversation' },
      { title: 'Customer Success', description: 'Track engagement and identify at-risk accounts' },
      { title: 'Product', description: 'Understand how customers use your product' },
    ],
    faqs: [
      { question: 'What touchpoints are tracked?', answer: 'Calls, emails, SMS, WhatsApp, website visits, form submissions, ad clicks, and more.' },
      { question: 'How does attribution work?', answer: 'Choose from first-touch, last-touch, linear, or custom multi-touch attribution models.' },
      { question: 'Can I see individual customer journeys?', answer: 'Yes, view the complete journey for any lead or customer with full interaction history.' },
    ],
    testimonial: {
      quote: 'Understanding the customer journey helped us identify that 80% of conversions came from a specific touchpoint sequence. We doubled down on it.',
      author: 'Pooja Mehta',
      role: 'Marketing Director',
      company: 'EduFirst',
    },
  },
  'ai-scoring': {
    title: 'AI Lead Scoring',
    subtitle: 'Prioritize High-Intent Leads',
    description: 'Let AI analyze leads and assign priority scores.',
    longDescription: 'Stop guessing which leads to call first. Our AI analyzes hundreds of signals - behavioral data, profile information, engagement patterns, and historical outcomes - to score every lead. High scores mean high intent. Your team focuses on leads most likely to convert, improving efficiency and win rates dramatically.',
    icon: Brain,
    gradient: 'from-cyan-500 to-blue-600',
    heroImage: '/screenshots/05-analytics.png',
    benefits: [
      { title: 'Automatic Scoring', description: 'Every lead scored without manual effort', icon: Sparkles },
      { title: 'Multi-signal Analysis', description: 'Behavior, profile, and engagement combined', icon: Layers },
      { title: 'Real-time Updates', description: 'Scores change as leads engage more', icon: RefreshCw },
      { title: 'Explainable AI', description: 'See why each lead got their score', icon: Info },
    ],
    capabilities: [
      { title: 'Behavioral Scoring', description: 'Website visits, email opens, content downloads, and engagement patterns', icon: Activity },
      { title: 'Profile Scoring', description: 'Company size, industry, job title, and fit with ideal customer profile', icon: Users },
      { title: 'Predictive Modeling', description: 'ML learns from your conversion history to improve accuracy', icon: Brain },
      { title: 'Score Decay', description: 'Scores automatically decrease for inactive leads', icon: TrendingUp },
    ],
    stats: [
      { value: '94%', label: 'Prediction Accuracy' },
      { value: '50%', label: 'Less Wasted Effort' },
      { value: '2x', label: 'Conversion Rate' },
      { value: '100+', label: 'Signals Analyzed' },
    ],
    useCases: [
      { title: 'Lead Prioritization', description: 'Call high-score leads first for better conversion' },
      { title: 'Marketing Qualification', description: 'Auto-qualify MQLs based on engagement' },
      { title: 'Sales Efficiency', description: 'Focus team time on leads that matter' },
      { title: 'ABM', description: 'Score and prioritize target accounts' },
    ],
    faqs: [
      { question: 'How is the score calculated?', answer: 'AI combines behavioral signals, profile data, and historical patterns to predict conversion likelihood.' },
      { question: 'Can I customize scoring criteria?', answer: 'Yes, adjust weights for different signals and add custom scoring rules.' },
      { question: 'How quickly do scores update?', answer: 'Scores update in real-time as leads engage with your content and communications.' },
    ],
    testimonial: {
      quote: 'AI lead scoring helped us focus on the right leads. We now convert 3x more with the same team size.',
      author: 'Rohit Jain',
      role: 'Sales VP',
      company: 'CloudTech Solutions',
    },
  },
  'mobile-app': {
    title: 'Mobile App',
    subtitle: 'Android Telecaller App with Offline Sync',
    description: 'Full CRM power in your pocket with offline capability.',
    longDescription: 'Take your CRM everywhere with our native Android app. Telecallers can view their queue, make calls, update leads, and log activities from anywhere. Offline mode ensures productivity even without internet - all data syncs automatically when connectivity returns. GPS tracking helps managers monitor field teams.',
    icon: Smartphone,
    gradient: 'from-orange-500 to-red-500',
    heroImage: '/screenshots/02-dashboard.png',
    benefits: [
      { title: 'Native Android App', description: 'Smooth performance on any Android device', icon: Smartphone },
      { title: 'Offline Mode', description: 'Work without internet, sync when connected', icon: Database },
      { title: 'Click-to-Call', description: 'Call leads directly from the app', icon: PhoneCall },
      { title: 'GPS Tracking', description: 'Track field team locations in real-time', icon: MapPin },
    ],
    capabilities: [
      { title: 'Mobile Calling', description: 'Make and log calls with one tap, with call recording integration', icon: PhoneCall },
      { title: 'Offline Data', description: 'Access leads, update statuses, and add notes even without internet', icon: Database },
      { title: 'Location Services', description: 'Check-in at locations, track routes, and verify field visits', icon: Navigation },
      { title: 'Push Notifications', description: 'Instant alerts for new leads, follow-ups, and important updates', icon: Bell },
    ],
    stats: [
      { value: '4.5★', label: 'Play Store Rating' },
      { value: '100%', label: 'Offline Capable' },
      { value: 'Real-time', label: 'Sync' },
      { value: 'Free', label: 'Download' },
    ],
    useCases: [
      { title: 'Field Sales', description: 'Manage leads and log visits while in the field' },
      { title: 'Telecallers', description: 'Call from personal phones with CRM integration' },
      { title: 'Service Teams', description: 'Track service visits and update job status' },
      { title: 'Remote Teams', description: 'Stay productive from anywhere' },
    ],
    faqs: [
      { question: 'Is there an iOS app?', answer: 'Android app is available now. iOS app is coming soon.' },
      { question: 'Does it work offline?', answer: 'Yes! View leads, make updates, and log activities offline. Everything syncs when back online.' },
      { question: 'Is the app free?', answer: 'The app is free to download. You just need an active MyLeadX subscription.' },
    ],
    testimonial: {
      quote: 'The mobile app is essential for our field team. They update leads in real-time and we have complete visibility.',
      author: 'Arun Kumar',
      role: 'Field Sales Manager',
      company: 'PropValue Realty',
    },
  },
  'whatsapp-sms': {
    title: 'WhatsApp & SMS',
    subtitle: 'Multi-Channel Lead Engagement',
    description: 'Engage leads on their preferred messaging channels.',
    longDescription: 'Meet customers where they are - on WhatsApp and SMS. Our official WhatsApp Business API integration enables rich conversations with templates, media, and buttons. Bulk SMS campaigns reach thousands instantly. Automated sequences nurture leads while you sleep. Two-way messaging brings all conversations into your CRM.',
    icon: MessageSquare,
    gradient: 'from-green-500 to-emerald-500',
    heroImage: '/screenshots/02-dashboard.png',
    benefits: [
      { title: 'WhatsApp Business API', description: 'Official integration with green tick verification', icon: CheckCircle },
      { title: 'Bulk Campaigns', description: 'Send to thousands with personalization', icon: Send },
      { title: 'Template Management', description: 'Pre-approved templates for compliance', icon: FileText },
      { title: 'Two-way Inbox', description: 'Receive and respond in unified inbox', icon: Inbox },
    ],
    capabilities: [
      { title: 'WhatsApp Templates', description: 'Create and manage approved templates with buttons, images, and rich media', icon: Layers },
      { title: 'Bulk Messaging', description: 'Send personalized messages to thousands with merge fields', icon: Users },
      { title: 'Auto-responses', description: 'Instant replies to common questions with AI chatbot integration', icon: Bot },
      { title: 'Unified Inbox', description: 'All WhatsApp and SMS conversations in one place', icon: Inbox },
    ],
    stats: [
      { value: '98%', label: 'WhatsApp Open Rate' },
      { value: '45%', label: 'Response Rate' },
      { value: '10x', label: 'vs Email CTR' },
      { value: '24/7', label: 'Auto-replies' },
    ],
    useCases: [
      { title: 'Lead Nurturing', description: 'Automated message sequences for new leads' },
      { title: 'Appointment Reminders', description: 'Reduce no-shows with WhatsApp reminders' },
      { title: 'Order Updates', description: 'Send delivery and order status notifications' },
      { title: 'Promotional Campaigns', description: 'Launch offers and promotions at scale' },
    ],
    faqs: [
      { question: 'Is this the official WhatsApp API?', answer: 'Yes, we use the official WhatsApp Business API, not unofficial methods.' },
      { question: 'Do I need approval for templates?', answer: 'WhatsApp requires template approval. We help you create compliant templates.' },
      { question: 'Can customers reply to messages?', answer: 'Yes! Two-way messaging means customer replies come into your CRM inbox.' },
    ],
    testimonial: {
      quote: 'WhatsApp integration changed our game. 90% of customers prefer WhatsApp over email. Our response rates tripled.',
      author: 'Simran Kaur',
      role: 'Customer Success',
      company: 'FashionKart',
    },
  },
  'campaigns': {
    title: 'Campaign Management',
    subtitle: 'Multi-Channel Marketing Campaigns',
    description: 'Create, manage, and track marketing campaigns across all channels.',
    longDescription: 'Launch powerful marketing campaigns that reach your audience across multiple channels. Create targeted campaigns with custom audience segments, schedule them for optimal timing, and track performance in real-time. Our AI analyzes campaign effectiveness and suggests optimizations to maximize ROI.',
    icon: Send,
    gradient: 'from-pink-500 to-rose-500',
    heroImage: '/screenshots/02-dashboard.png',
    benefits: [
      { title: 'Multi-Channel', description: 'Run campaigns across calls, SMS, WhatsApp, and email', icon: Share2 },
      { title: 'Audience Segmentation', description: 'Target specific groups with personalized messaging', icon: Users },
      { title: 'Scheduling', description: 'Schedule campaigns for optimal delivery times', icon: Calendar },
      { title: 'A/B Testing', description: 'Test different messages to find what works best', icon: GitBranch },
    ],
    capabilities: [
      { title: 'Campaign Builder', description: 'Visual drag-and-drop campaign builder with templates for quick setup', icon: Layers },
      { title: 'Audience Targeting', description: 'Create segments based on lead data, behavior, and engagement history', icon: Target },
      { title: 'Multi-Channel Delivery', description: 'Send via AI calls, SMS, WhatsApp, and email from one campaign', icon: Send },
      { title: 'Performance Analytics', description: 'Track opens, clicks, responses, and conversions in real-time', icon: BarChart3 },
    ],
    stats: [
      { value: '5x', label: 'Higher Engagement' },
      { value: '100K+', label: 'Messages/Day' },
      { value: '40%', label: 'Better Conversion' },
      { value: 'Real-time', label: 'Analytics' },
    ],
    useCases: [
      { title: 'Product Launches', description: 'Announce new products to targeted audience segments' },
      { title: 'Seasonal Promotions', description: 'Run time-limited offers and flash sales' },
      { title: 'Re-engagement', description: 'Win back dormant leads with personalized campaigns' },
      { title: 'Event Invitations', description: 'Promote webinars, workshops, and events' },
    ],
    faqs: [
      { question: 'How many campaigns can I run?', answer: 'Unlimited campaigns on all plans. Run as many as you need.' },
      { question: 'Can I schedule campaigns?', answer: 'Yes, schedule campaigns for any future date/time with timezone support.' },
      { question: 'Is there A/B testing?', answer: 'Yes, test different subject lines, messages, and CTAs to optimize performance.' },
    ],
    testimonial: {
      quote: 'We ran a product launch campaign that reached 50,000 leads in 2 hours. The response was incredible.',
      author: 'Ravi Shankar',
      role: 'Marketing Head',
      company: 'TechGadgets India',
    },
  },
  'templates': {
    title: 'Message Templates',
    subtitle: 'Pre-Approved Templates for All Channels',
    description: 'Create and manage templates for calls, SMS, WhatsApp, and emails.',
    longDescription: 'Save time with reusable message templates across all communication channels. Create call scripts, SMS templates, WhatsApp message templates (with Meta approval workflow), and email templates. Use dynamic variables for personalization and maintain brand consistency across all touchpoints.',
    icon: FileText,
    gradient: 'from-indigo-500 to-purple-500',
    heroImage: '/screenshots/02-dashboard.png',
    benefits: [
      { title: 'Multi-Channel', description: 'Templates for calls, SMS, WhatsApp, and email', icon: Layers },
      { title: 'Dynamic Variables', description: 'Personalize with lead name, company, and custom fields', icon: Edit },
      { title: 'Approval Workflow', description: 'Built-in WhatsApp template approval process', icon: CheckCircle },
      { title: 'Version Control', description: 'Track changes and maintain template history', icon: Clock },
    ],
    capabilities: [
      { title: 'Call Scripts', description: 'Create dynamic scripts with branching logic based on customer responses', icon: PhoneCall },
      { title: 'WhatsApp Templates', description: 'Design rich templates with buttons, images, and quick replies', icon: MessageSquare },
      { title: 'Email Templates', description: 'HTML email templates with drag-and-drop builder', icon: Mail },
      { title: 'SMS Templates', description: 'Character-optimized SMS templates with dynamic fields', icon: MessageCircle },
    ],
    stats: [
      { value: '200+', label: 'Pre-built Templates' },
      { value: '10x', label: 'Faster Creation' },
      { value: '95%', label: 'Approval Rate' },
      { value: '∞', label: 'Custom Templates' },
    ],
    useCases: [
      { title: 'Sales Teams', description: 'Standardize pitch scripts and follow-up messages' },
      { title: 'Support Teams', description: 'Quick responses for common queries' },
      { title: 'Marketing', description: 'Maintain brand voice across all communications' },
      { title: 'Compliance', description: 'Ensure all messages meet regulatory requirements' },
    ],
    faqs: [
      { question: 'How do WhatsApp templates work?', answer: 'We guide you through Meta\'s approval process. Most templates get approved within 24 hours.' },
      { question: 'Can I use variables in templates?', answer: 'Yes, use dynamic variables like {{name}}, {{company}}, {{custom_field}} for personalization.' },
      { question: 'Are there pre-built templates?', answer: 'Yes, we provide 200+ industry-specific templates you can customize.' },
    ],
    testimonial: {
      quote: 'Templates saved our team hours every week. Consistent messaging, faster responses.',
      author: 'Neha Gupta',
      role: 'Operations Manager',
      company: 'ServiceFirst',
    },
  },
  'followups': {
    title: 'Follow-up Management',
    subtitle: 'Never Miss a Follow-up Again',
    description: 'Automated follow-up scheduling and reminders for your team.',
    longDescription: 'Transform your follow-up process with intelligent automation. Set follow-up reminders, automate follow-up sequences, and ensure no lead falls through the cracks. Our AI suggests optimal follow-up times based on lead behavior and historical data, maximizing your chances of connection.',
    icon: RefreshCw,
    gradient: 'from-amber-500 to-orange-500',
    heroImage: '/screenshots/02-dashboard.png',
    benefits: [
      { title: 'Auto Reminders', description: 'Never forget a follow-up with smart notifications', icon: Bell },
      { title: 'Optimal Timing', description: 'AI suggests best times to follow up', icon: Clock },
      { title: 'Sequences', description: 'Create automated multi-step follow-up sequences', icon: GitBranch },
      { title: 'Escalation', description: 'Auto-escalate overdue follow-ups to managers', icon: TrendingUp },
    ],
    capabilities: [
      { title: 'Follow-up Calendar', description: 'Visual calendar showing all scheduled follow-ups across team', icon: Calendar },
      { title: 'Auto Sequences', description: 'Create drip sequences that automatically follow up until response', icon: Workflow },
      { title: 'Reminder System', description: 'Push, email, and in-app reminders so nothing is missed', icon: Bell },
      { title: 'Performance Tracking', description: 'Track follow-up completion rates and outcomes', icon: BarChart3 },
    ],
    stats: [
      { value: '80%', label: 'Follow-up Rate' },
      { value: '3x', label: 'More Connections' },
      { value: '0', label: 'Missed Follow-ups' },
      { value: '50%', label: 'Time Saved' },
    ],
    useCases: [
      { title: 'Sales Reps', description: 'Stay on top of all lead follow-ups automatically' },
      { title: 'Account Managers', description: 'Regular check-ins with existing customers' },
      { title: 'Support Teams', description: 'Follow up on unresolved tickets' },
      { title: 'Collections', description: 'Payment reminder sequences' },
    ],
    faqs: [
      { question: 'How do reminders work?', answer: 'Get push notifications, email alerts, and in-app reminders before each follow-up.' },
      { question: 'Can I automate follow-ups?', answer: 'Yes, create sequences that automatically send messages until the lead responds.' },
      { question: 'What if I miss a follow-up?', answer: 'Overdue follow-ups are highlighted and can auto-escalate to managers.' },
    ],
    testimonial: {
      quote: 'Our follow-up completion rate went from 40% to 95%. No more leads slipping through.',
      author: 'Arjun Mehta',
      role: 'Sales Manager',
      company: 'GrowthSales',
    },
  },
  'data-import': {
    title: 'Data Import & Web Scraping',
    subtitle: 'Import Leads from Any Source',
    description: 'Import data from Excel, CSV, or scrape leads from the web.',
    longDescription: 'Get leads into MyLeadX from any source. Import from Excel and CSV files with intelligent field mapping. Use our web scraping tools to extract leads from websites, directories, and social platforms. Automatic deduplication ensures clean data every time.',
    icon: Download,
    gradient: 'from-cyan-500 to-teal-500',
    heroImage: '/screenshots/02-dashboard.png',
    benefits: [
      { title: 'Smart Import', description: 'AI maps columns automatically from any file format', icon: Sparkles },
      { title: 'Web Scraping', description: 'Extract leads from websites and directories', icon: Globe },
      { title: 'Deduplication', description: 'Automatically detect and merge duplicate leads', icon: Copy },
      { title: 'Validation', description: 'Validate emails and phone numbers on import', icon: CheckCircle },
    ],
    capabilities: [
      { title: 'File Import', description: 'Import from Excel, CSV, Google Sheets with drag-and-drop simplicity', icon: Upload },
      { title: 'Web Scraper', description: 'Built-in scraping tools for JustDial, IndiaMart, LinkedIn, and more', icon: Globe },
      { title: 'Field Mapping', description: 'AI-powered field mapping with manual override options', icon: Settings },
      { title: 'Import History', description: 'Track all imports with ability to rollback if needed', icon: Clock },
    ],
    stats: [
      { value: '1M+', label: 'Leads Imported' },
      { value: '50+', label: 'Sources Supported' },
      { value: '99%', label: 'Mapping Accuracy' },
      { value: '0', label: 'Duplicates' },
    ],
    useCases: [
      { title: 'Migration', description: 'Move from spreadsheets or other CRMs to MyLeadX' },
      { title: 'Lead Generation', description: 'Scrape leads from directories and websites' },
      { title: 'Event Leads', description: 'Import attendee lists from events and webinars' },
      { title: 'Partner Data', description: 'Import leads from partners and vendors' },
    ],
    faqs: [
      { question: 'What file formats are supported?', answer: 'Excel (.xlsx, .xls), CSV, Google Sheets, and JSON files.' },
      { question: 'Is web scraping legal?', answer: 'We only scrape publicly available data. Always check website terms of service.' },
      { question: 'How does deduplication work?', answer: 'AI matches on email, phone, and name combinations to identify duplicates.' },
    ],
    testimonial: {
      quote: 'We imported 100,000 leads from 5 different sources in one afternoon. The mapping was perfect.',
      author: 'Sanjay Patel',
      role: 'Data Manager',
      company: 'LeadGen Pro',
    },
  },
  'lead-distribution': {
    title: 'Lead Distribution',
    subtitle: 'Smart Lead Assignment & Routing',
    description: 'Automatically distribute leads to the right team members.',
    longDescription: 'Ensure every lead reaches the right person instantly. Configure distribution rules based on geography, product interest, lead score, or any custom criteria. Round-robin, weighted, and rule-based assignment options ensure fair and optimal distribution across your team.',
    icon: Share2,
    gradient: 'from-violet-500 to-purple-500',
    heroImage: '/screenshots/02-dashboard.png',
    benefits: [
      { title: 'Auto Assignment', description: 'Leads assigned instantly based on your rules', icon: Zap },
      { title: 'Round Robin', description: 'Fair distribution across team members', icon: RefreshCw },
      { title: 'Rule-Based', description: 'Route based on location, product, or any field', icon: GitBranch },
      { title: 'Load Balancing', description: 'Consider agent availability and capacity', icon: Users },
    ],
    capabilities: [
      { title: 'Distribution Rules', description: 'Create complex rules with multiple conditions and actions', icon: Settings },
      { title: 'Territory Management', description: 'Assign leads based on geographic territories', icon: MapPin },
      { title: 'Capacity Planning', description: 'Set max leads per agent to prevent overload', icon: BarChart3 },
      { title: 'Reassignment', description: 'Auto-reassign if agent is unavailable or on leave', icon: RefreshCw },
    ],
    stats: [
      { value: '<1s', label: 'Assignment Time' },
      { value: '100%', label: 'Leads Assigned' },
      { value: '30%', label: 'Faster Response' },
      { value: '0', label: 'Lost Leads' },
    ],
    useCases: [
      { title: 'Regional Teams', description: 'Route leads to regional sales reps automatically' },
      { title: 'Product Specialists', description: 'Send leads to specialists based on product interest' },
      { title: 'Skill-Based', description: 'Match leads to agents with relevant expertise' },
      { title: 'Load Balancing', description: 'Distribute fairly based on current workload' },
    ],
    faqs: [
      { question: 'How fast are leads assigned?', answer: 'Leads are assigned within 1 second of creation or import.' },
      { question: 'Can I set up territories?', answer: 'Yes, create geographic territories and assign owners to each.' },
      { question: 'What if an agent is on leave?', answer: 'Leads automatically route to backup agents or pool.' },
    ],
    testimonial: {
      quote: 'Lead assignment used to take hours. Now it\'s instant and always goes to the right person.',
      author: 'Divya Sharma',
      role: 'Sales Director',
      company: 'MultiZone Sales',
    },
  },
  'data-export': {
    title: 'Data Export',
    subtitle: 'Export Your Data Anytime',
    description: 'Export leads, reports, and analytics in multiple formats.',
    longDescription: 'Your data belongs to you. Export leads, call recordings, reports, and analytics in multiple formats including Excel, CSV, PDF, and JSON. Schedule automatic exports to your email or cloud storage. Full data portability with no lock-in.',
    icon: Upload,
    gradient: 'from-emerald-500 to-green-500',
    heroImage: '/screenshots/02-dashboard.png',
    benefits: [
      { title: 'Multiple Formats', description: 'Export to Excel, CSV, PDF, or JSON', icon: FileText },
      { title: 'Scheduled Exports', description: 'Automatic daily/weekly exports to email', icon: Calendar },
      { title: 'Cloud Sync', description: 'Export directly to Google Drive or Dropbox', icon: Database },
      { title: 'Full History', description: 'Export all historical data with no limits', icon: Clock },
    ],
    capabilities: [
      { title: 'Lead Export', description: 'Export all leads with full history and custom fields', icon: Users },
      { title: 'Report Export', description: 'Download any report as PDF or Excel', icon: FileText },
      { title: 'Recording Export', description: 'Download call recordings in bulk', icon: Mic },
      { title: 'API Access', description: 'Programmatic access to export any data via API', icon: Database },
    ],
    stats: [
      { value: '100%', label: 'Data Portable' },
      { value: '5', label: 'Export Formats' },
      { value: 'Unlimited', label: 'Historical Data' },
      { value: '0', label: 'Lock-in' },
    ],
    useCases: [
      { title: 'Reporting', description: 'Export data for external analysis and BI tools' },
      { title: 'Compliance', description: 'Maintain data records for audits' },
      { title: 'Migration', description: 'Move data to other systems if needed' },
      { title: 'Backup', description: 'Regular backups of your critical data' },
    ],
    faqs: [
      { question: 'Is there a limit on exports?', answer: 'No limits. Export all your data anytime.' },
      { question: 'Can I schedule automatic exports?', answer: 'Yes, schedule daily, weekly, or monthly exports to your email.' },
      { question: 'Do I own my data?', answer: 'Absolutely. Your data is yours. Export it anytime with no restrictions.' },
    ],
    testimonial: {
      quote: 'The export feature gives us peace of mind. We can always access our data.',
      author: 'Rajesh Iyer',
      role: 'IT Manager',
      company: 'DataFirst Corp',
    },
  },
  'quotations': {
    title: 'Quotations & Proposals',
    subtitle: 'Professional Quotes in Minutes',
    description: 'Create and send professional quotations to your leads.',
    longDescription: 'Win more deals with professional quotations that impress. Create beautiful, branded quotations in minutes using our template builder. Track when quotes are viewed, send reminders for pending quotes, and convert accepted quotes to deals automatically.',
    icon: FileText,
    gradient: 'from-blue-500 to-indigo-500',
    heroImage: '/screenshots/02-dashboard.png',
    benefits: [
      { title: 'Professional Templates', description: 'Beautiful branded quotation templates', icon: Layers },
      { title: 'View Tracking', description: 'Know when customers view your quotes', icon: Eye },
      { title: 'E-Signatures', description: 'Get quotes signed digitally', icon: Edit },
      { title: 'Auto Convert', description: 'Accepted quotes become deals automatically', icon: CheckCircle },
    ],
    capabilities: [
      { title: 'Quote Builder', description: 'Drag-and-drop builder with product catalog integration', icon: Settings },
      { title: 'Pricing Rules', description: 'Set up discounts, taxes, and custom pricing logic', icon: Tag },
      { title: 'Quote Analytics', description: 'Track quote performance, win rates, and average deal size', icon: BarChart3 },
      { title: 'Follow-up Automation', description: 'Auto-remind customers about pending quotes', icon: Bell },
    ],
    stats: [
      { value: '5min', label: 'Quote Creation' },
      { value: '40%', label: 'Higher Win Rate' },
      { value: '2x', label: 'Faster Closing' },
      { value: '100%', label: 'Branded' },
    ],
    useCases: [
      { title: 'B2B Sales', description: 'Send detailed proposals for enterprise deals' },
      { title: 'Services', description: 'Quote for projects and service packages' },
      { title: 'Real Estate', description: 'Property quotations with all details' },
      { title: 'Education', description: 'Fee quotations for courses and programs' },
    ],
    faqs: [
      { question: 'Can I customize templates?', answer: 'Yes, fully customize with your logo, colors, and terms.' },
      { question: 'Do you support e-signatures?', answer: 'Yes, customers can sign quotes digitally.' },
      { question: 'Can I track if quotes are viewed?', answer: 'Yes, get notified when customers open your quotes.' },
    ],
    testimonial: {
      quote: 'Professional quotes that close deals faster. Our win rate improved by 35%.',
      author: 'Kavitha Reddy',
      role: 'Business Development',
      company: 'TechServices India',
    },
  },
  'payments': {
    title: 'Payment Collection',
    subtitle: 'Collect Payments Seamlessly',
    description: 'Accept payments online with integrated payment gateway.',
    longDescription: 'Get paid faster with integrated payment collection. Send payment links via WhatsApp, SMS, or email. Accept payments via UPI, cards, net banking, and wallets. Automatic reconciliation and instant notifications keep you informed of every transaction.',
    icon: Tag,
    gradient: 'from-green-500 to-emerald-500',
    heroImage: '/screenshots/02-dashboard.png',
    benefits: [
      { title: 'Payment Links', description: 'Send payment links via any channel', icon: ExternalLink },
      { title: 'Multiple Methods', description: 'UPI, cards, net banking, and wallets', icon: Tag },
      { title: 'Auto Reconciliation', description: 'Payments auto-matched to leads and deals', icon: CheckCircle },
      { title: 'Instant Alerts', description: 'Get notified immediately on payment', icon: Bell },
    ],
    capabilities: [
      { title: 'Payment Gateway', description: 'Integrated Razorpay with all payment modes', icon: Tag },
      { title: 'Payment Links', description: 'Generate and send payment links in one click', icon: ExternalLink },
      { title: 'Partial Payments', description: 'Accept installments and partial payments', icon: Tag },
      { title: 'Payment Reports', description: 'Track collections, pending, and overdue payments', icon: BarChart3 },
    ],
    stats: [
      { value: '50%', label: 'Faster Collection' },
      { value: '10+', label: 'Payment Methods' },
      { value: 'Instant', label: 'Notifications' },
      { value: '0%', label: 'Manual Entry' },
    ],
    useCases: [
      { title: 'Education', description: 'Collect fees with installment options' },
      { title: 'Services', description: 'Project milestone payments' },
      { title: 'Real Estate', description: 'Booking amounts and EMIs' },
      { title: 'Subscriptions', description: 'Recurring payment collection' },
    ],
    faqs: [
      { question: 'Which payment methods are supported?', answer: 'UPI, credit/debit cards, net banking, wallets, and EMI options.' },
      { question: 'How do payment links work?', answer: 'Generate a link and send via WhatsApp/SMS. Customer clicks and pays.' },
      { question: 'Is it secure?', answer: 'Yes, PCI-DSS compliant with Razorpay\'s secure infrastructure.' },
    ],
    testimonial: {
      quote: 'Payment collection that used to take days now happens in minutes. Customers love the convenience.',
      author: 'Mohan Krishnan',
      role: 'Finance Head',
      company: 'EduFirst Academy',
    },
  },
  'invoices': {
    title: 'Invoice Management',
    subtitle: 'Professional Invoicing Made Easy',
    description: 'Create, send, and track invoices from your CRM.',
    longDescription: 'Streamline your billing with integrated invoice management. Create professional GST-compliant invoices, send them directly to customers, and track payment status. Automatic reminders for overdue invoices ensure you get paid on time.',
    icon: FileText,
    gradient: 'from-amber-500 to-yellow-500',
    heroImage: '/screenshots/02-dashboard.png',
    benefits: [
      { title: 'GST Compliant', description: 'Invoices with GSTIN and proper tax calculations', icon: CheckCircle },
      { title: 'Auto Numbering', description: 'Sequential invoice numbers as per compliance', icon: Database },
      { title: 'Payment Tracking', description: 'Track paid, pending, and overdue invoices', icon: Eye },
      { title: 'Auto Reminders', description: 'Send payment reminders automatically', icon: Bell },
    ],
    capabilities: [
      { title: 'Invoice Builder', description: 'Create invoices with line items, taxes, and discounts', icon: Settings },
      { title: 'Recurring Invoices', description: 'Set up automatic invoices for subscriptions', icon: RefreshCw },
      { title: 'Payment Integration', description: 'Accept payments directly from invoice', icon: Tag },
      { title: 'Reports', description: 'Revenue reports, aging analysis, and tax summaries', icon: BarChart3 },
    ],
    stats: [
      { value: '100%', label: 'GST Compliant' },
      { value: '2min', label: 'Invoice Creation' },
      { value: '30%', label: 'Faster Payment' },
      { value: 'Auto', label: 'Reminders' },
    ],
    useCases: [
      { title: 'Service Businesses', description: 'Invoice clients for projects and retainers' },
      { title: 'Education', description: 'Fee invoices with tax compliance' },
      { title: 'Subscriptions', description: 'Recurring invoices for SaaS and memberships' },
      { title: 'Freelancers', description: 'Professional invoicing for independent work' },
    ],
    faqs: [
      { question: 'Are invoices GST compliant?', answer: 'Yes, fully GST compliant with proper HSN/SAC codes and tax calculations.' },
      { question: 'Can customers pay from invoice?', answer: 'Yes, invoices include a pay button for instant payment.' },
      { question: 'Do you support recurring invoices?', answer: 'Yes, set up monthly, quarterly, or annual recurring invoices.' },
    ],
    testimonial: {
      quote: 'Invoicing is now a breeze. GST compliant, professional, and customers can pay instantly.',
      author: 'Pradeep Kumar',
      role: 'Accountant',
      company: 'ServicePro Solutions',
    },
  },
  'ad-integrations': {
    title: 'Facebook & Google Ads',
    subtitle: 'Automatic Lead Capture from Ads',
    description: 'Capture leads from Facebook and Google Ads automatically.',
    longDescription: 'Connect your ad accounts and capture leads automatically. Facebook Lead Ads and Google Ads leads flow directly into MyLeadX in real-time. No manual downloads, no delays. Leads are instantly assigned and your team can respond in seconds.',
    icon: Send,
    gradient: 'from-blue-600 to-indigo-600',
    heroImage: '/screenshots/02-dashboard.png',
    benefits: [
      { title: 'Real-time Sync', description: 'Leads arrive instantly from ad platforms', icon: Zap },
      { title: 'Auto Assignment', description: 'Leads distributed to team immediately', icon: Share2 },
      { title: 'ROI Tracking', description: 'Track which campaigns drive conversions', icon: TrendingUp },
      { title: 'Cost per Lead', description: 'See actual cost per lead and CPQ', icon: Tag },
    ],
    capabilities: [
      { title: 'Facebook Lead Ads', description: 'Automatic sync of leads from Facebook and Instagram', icon: Users },
      { title: 'Google Ads', description: 'Capture leads from Google Search and Display ads', icon: Globe },
      { title: 'Attribution', description: 'Track which ad, campaign, and keyword generated each lead', icon: Target },
      { title: 'Performance Dashboard', description: 'Ad performance metrics alongside CRM data', icon: BarChart3 },
    ],
    stats: [
      { value: '<1min', label: 'Lead Arrival' },
      { value: '100%', label: 'Auto Captured' },
      { value: '50%', label: 'Better ROI' },
      { value: '2x', label: 'Response Speed' },
    ],
    useCases: [
      { title: 'Lead Generation', description: 'Capture leads from paid campaigns instantly' },
      { title: 'Education', description: 'Enrollment campaigns to CRM automatically' },
      { title: 'Real Estate', description: 'Property ad leads to sales team' },
      { title: 'E-commerce', description: 'Product interest leads for follow-up' },
    ],
    faqs: [
      { question: 'How fast do leads sync?', answer: 'Leads appear in MyLeadX within seconds of form submission.' },
      { question: 'Do I need technical setup?', answer: 'No, just connect your ad account. We handle the rest.' },
      { question: 'Can I track ad ROI?', answer: 'Yes, see cost per lead, cost per conversion, and ROAS.' },
    ],
    testimonial: {
      quote: 'Our response time went from hours to minutes. Leads from ads are now contacted instantly.',
      author: 'Ankit Bansal',
      role: 'Digital Marketing Head',
      company: 'AdFirst Agency',
    },
  },
  'lead-sources': {
    title: 'Lead Source Integrations',
    subtitle: 'Connect 30+ Lead Sources',
    description: 'Import leads from JustDial, IndiaMart, Housing, and more.',
    longDescription: 'Connect to India\'s top lead sources and portals. Automatic sync with JustDial, IndiaMart, 99acres, Housing, MagicBricks, and 25+ more platforms. Leads flow in automatically, deduplicated and enriched, ready for your team to contact.',
    icon: Download,
    gradient: 'from-orange-500 to-red-500',
    heroImage: '/screenshots/02-dashboard.png',
    benefits: [
      { title: '30+ Sources', description: 'Connect to all major Indian lead portals', icon: Globe },
      { title: 'Auto Sync', description: 'Leads imported automatically, no manual work', icon: RefreshCw },
      { title: 'Deduplication', description: 'Same lead from multiple sources? Auto-merged', icon: Copy },
      { title: 'Source Tracking', description: 'Know which source generates best leads', icon: Target },
    ],
    capabilities: [
      { title: 'Portal Integration', description: 'JustDial, IndiaMart, 99acres, Housing, MagicBricks, and more', icon: Globe },
      { title: 'Email Parsing', description: 'Auto-capture leads from inquiry emails', icon: Mail },
      { title: 'Webhook Support', description: 'Connect any source that supports webhooks', icon: Database },
      { title: 'Source Analytics', description: 'Compare lead quality and conversion by source', icon: BarChart3 },
    ],
    stats: [
      { value: '30+', label: 'Sources' },
      { value: 'Auto', label: 'Sync' },
      { value: '0', label: 'Manual Entry' },
      { value: 'Real-time', label: 'Updates' },
    ],
    useCases: [
      { title: 'Real Estate', description: '99acres, Housing, MagicBricks integration' },
      { title: 'Education', description: 'Shiksha, CollegeDunia, Careers360' },
      { title: 'B2B', description: 'IndiaMart, TradeIndia, ExportersIndia' },
      { title: 'Local Services', description: 'JustDial, Sulekha, UrbanClap' },
    ],
    faqs: [
      { question: 'Which portals are supported?', answer: 'JustDial, IndiaMart, 99acres, Housing, MagicBricks, and 25+ more.' },
      { question: 'How often do leads sync?', answer: 'Real-time for most sources. Some batch every 5-15 minutes.' },
      { question: 'What about duplicate leads?', answer: 'AI automatically detects and merges duplicates from multiple sources.' },
    ],
    testimonial: {
      quote: 'All our leads from 5 different portals now land in one place. Game changer!',
      author: 'Suresh Rajan',
      role: 'Sales Head',
      company: 'PropertyKing Realtors',
    },
  },
  'email-sms-integration': {
    title: 'Email & SMS Integration',
    subtitle: 'Connect Your Communication Channels',
    description: 'Integrate email and SMS providers for seamless communication.',
    longDescription: 'Connect your preferred email and SMS providers for seamless communication. Support for SendGrid, Mailgun, AWS SES for email, and MSG91, Kaleyra, Twilio for SMS. Send bulk messages, track delivery, and maintain communication history in one place.',
    icon: Mail,
    gradient: 'from-sky-500 to-blue-500',
    heroImage: '/screenshots/02-dashboard.png',
    benefits: [
      { title: 'Multi-Provider', description: 'Connect any email or SMS provider', icon: Share2 },
      { title: 'Delivery Tracking', description: 'Track sent, delivered, opened, and clicked', icon: Eye },
      { title: 'Templates', description: 'Use templates for consistent messaging', icon: FileText },
      { title: 'Unified History', description: 'All communication in lead timeline', icon: Clock },
    ],
    capabilities: [
      { title: 'Email Providers', description: 'SendGrid, Mailgun, AWS SES, SMTP, and more', icon: Mail },
      { title: 'SMS Providers', description: 'MSG91, Kaleyra, Twilio, Gupshup, and more', icon: MessageCircle },
      { title: 'Bulk Sending', description: 'Send thousands of messages with personalization', icon: Send },
      { title: 'Analytics', description: 'Delivery rates, open rates, and engagement metrics', icon: BarChart3 },
    ],
    stats: [
      { value: '10+', label: 'Providers' },
      { value: '99%', label: 'Delivery Rate' },
      { value: '1M+', label: 'Messages/Day' },
      { value: 'Real-time', label: 'Tracking' },
    ],
    useCases: [
      { title: 'Marketing', description: 'Email campaigns and newsletters' },
      { title: 'Transactional', description: 'Order confirmations and updates' },
      { title: 'Notifications', description: 'Reminders and alerts via SMS' },
      { title: 'OTP', description: 'Secure verification messages' },
    ],
    faqs: [
      { question: 'Which providers are supported?', answer: 'SendGrid, Mailgun, AWS SES, MSG91, Kaleyra, Twilio, and more.' },
      { question: 'Can I use my existing provider?', answer: 'Yes, bring your own provider. We support standard APIs.' },
      { question: 'Is there a message limit?', answer: 'No limit from us. Only your provider limits apply.' },
    ],
    testimonial: {
      quote: 'Connected our existing MSG91 account in minutes. All SMS history now in CRM.',
      author: 'Rahul Verma',
      role: 'Tech Lead',
      company: 'QuickComm',
    },
  },
  'webhooks': {
    title: 'Webhooks & API',
    subtitle: 'Connect Anything with Webhooks',
    description: 'Send and receive data with any application via webhooks.',
    longDescription: 'Build powerful integrations with webhooks and APIs. Send lead data to any external system in real-time. Receive leads from any source that supports webhooks. Our REST API gives you full programmatic access to all CRM data and functionality.',
    icon: Database,
    gradient: 'from-slate-600 to-slate-800',
    heroImage: '/screenshots/02-dashboard.png',
    benefits: [
      { title: 'Real-time Events', description: 'Get notified instantly when things happen', icon: Zap },
      { title: 'Custom Payloads', description: 'Configure exactly what data to send', icon: Settings },
      { title: 'REST API', description: 'Full API access for custom integrations', icon: Database },
      { title: 'Retry Logic', description: 'Automatic retries for failed webhooks', icon: RefreshCw },
    ],
    capabilities: [
      { title: 'Outbound Webhooks', description: 'Send data to external systems on any CRM event', icon: Send },
      { title: 'Inbound Webhooks', description: 'Receive leads and data from any source', icon: Download },
      { title: 'REST API', description: 'Complete API for leads, calls, users, and more', icon: Database },
      { title: 'API Keys', description: 'Secure authentication with API keys and OAuth', icon: Lock },
    ],
    stats: [
      { value: 'REST', label: 'API Standard' },
      { value: '50+', label: 'Event Types' },
      { value: '99.9%', label: 'Uptime' },
      { value: 'Full', label: 'Documentation' },
    ],
    useCases: [
      { title: 'Zapier/Make', description: 'Connect to 5000+ apps via Zapier' },
      { title: 'Custom Apps', description: 'Build your own integrations' },
      { title: 'BI Tools', description: 'Sync data to analytics platforms' },
      { title: 'Legacy Systems', description: 'Connect existing enterprise systems' },
    ],
    faqs: [
      { question: 'Is there API documentation?', answer: 'Yes, comprehensive documentation with examples and SDKs.' },
      { question: 'What events trigger webhooks?', answer: 'Lead created, updated, call made, deal closed, and 50+ more events.' },
      { question: 'Is there a rate limit?', answer: 'Yes, fair usage limits apply. Enterprise plans have higher limits.' },
    ],
    testimonial: {
      quote: 'The webhook API let us connect MyLeadX to our custom ERP seamlessly.',
      author: 'Vikram Joshi',
      role: 'CTO',
      company: 'TechBridge Solutions',
    },
  },
  'roles-permissions': {
    title: 'Roles & Permissions',
    subtitle: 'Granular Access Control',
    description: 'Create custom roles with fine-grained permissions.',
    longDescription: 'Control exactly who can see and do what in your CRM. Create custom roles with granular permissions for every feature. From viewing leads to deleting records, manage access at the most detailed level. Role hierarchy ensures managers see their team\'s data.',
    icon: Shield,
    gradient: 'from-red-500 to-pink-500',
    heroImage: '/screenshots/02-dashboard.png',
    benefits: [
      { title: 'Custom Roles', description: 'Create unlimited roles for your team structure', icon: Users },
      { title: 'Granular Control', description: 'Permission for every action in the system', icon: Lock },
      { title: 'Role Hierarchy', description: 'Managers see their team\'s data automatically', icon: Network },
      { title: 'Audit Trail', description: 'Track who changed what and when', icon: Eye },
    ],
    capabilities: [
      { title: 'Role Builder', description: 'Create roles with specific permissions for each module', icon: Settings },
      { title: 'Data Access', description: 'Control which records users can see and modify', icon: Eye },
      { title: 'Feature Access', description: 'Enable or disable features per role', icon: Lock },
      { title: 'Inheritance', description: 'Child roles inherit parent permissions', icon: GitBranch },
    ],
    stats: [
      { value: '100+', label: 'Permissions' },
      { value: 'Unlimited', label: 'Custom Roles' },
      { value: 'Full', label: 'Audit Trail' },
      { value: 'GDPR', label: 'Compliant' },
    ],
    useCases: [
      { title: 'Enterprise', description: 'Complex role hierarchies for large teams' },
      { title: 'Compliance', description: 'Ensure data access meets regulations' },
      { title: 'Multi-team', description: 'Separate access for different departments' },
      { title: 'Partners', description: 'Limited access for external partners' },
    ],
    faqs: [
      { question: 'How many roles can I create?', answer: 'Unlimited custom roles on all plans.' },
      { question: 'Can managers see their team\'s data?', answer: 'Yes, role hierarchy automatically grants visibility to subordinates\' data.' },
      { question: 'Is there an audit trail?', answer: 'Yes, complete audit log of all permission changes and data access.' },
    ],
    testimonial: {
      quote: 'Finally, proper access control. Each team sees only what they need.',
      author: 'Ashok Menon',
      role: 'IT Director',
      company: 'SecureEnterprises',
    },
  },
  'leaderboard': {
    title: 'Leaderboard & Gamification',
    subtitle: 'Motivate Your Team with Gamification',
    description: 'Drive performance with leaderboards, badges, and competitions.',
    longDescription: 'Turn sales into a game with leaderboards and gamification. Real-time rankings motivate your team to perform better. Award badges for achievements, run sales competitions, and celebrate wins. Proven to increase engagement and results.',
    icon: Award,
    gradient: 'from-yellow-500 to-orange-500',
    heroImage: '/screenshots/02-dashboard.png',
    benefits: [
      { title: 'Live Rankings', description: 'Real-time leaderboards updated constantly', icon: TrendingUp },
      { title: 'Badges & Awards', description: 'Recognize achievements with digital badges', icon: Award },
      { title: 'Competitions', description: 'Run sales contests and challenges', icon: Target },
      { title: 'Recognition', description: 'Public recognition for top performers', icon: Star },
    ],
    capabilities: [
      { title: 'Multi-Metric Boards', description: 'Leaderboards for calls, conversions, revenue, and more', icon: BarChart3 },
      { title: 'Badge System', description: 'Award badges for streaks, milestones, and achievements', icon: Award },
      { title: 'Competitions', description: 'Time-bound contests with prizes and recognition', icon: Award },
      { title: 'Team vs Team', description: 'Pit teams against each other for friendly competition', icon: Users },
    ],
    stats: [
      { value: '25%', label: 'Performance Boost' },
      { value: '50+', label: 'Badge Types' },
      { value: 'Real-time', label: 'Updates' },
      { value: '3x', label: 'Engagement' },
    ],
    useCases: [
      { title: 'Sales Teams', description: 'Drive competitive spirit and results' },
      { title: 'Call Centers', description: 'Motivate agents with rankings' },
      { title: 'New Hires', description: 'Gamify onboarding and ramp-up' },
      { title: 'Campaigns', description: 'Contest during product launches' },
    ],
    faqs: [
      { question: 'What metrics can be tracked?', answer: 'Calls made, leads converted, revenue generated, meetings booked, and more.' },
      { question: 'Can I run competitions?', answer: 'Yes, create time-bound contests with custom rules and prizes.' },
      { question: 'Do badges have real impact?', answer: 'Studies show gamification increases engagement by 50%+. It works!' },
    ],
    testimonial: {
      quote: 'The leaderboard created healthy competition. Team productivity jumped 30%.',
      author: 'Deepak Narayan',
      role: 'VP Sales',
      company: 'SalesForce India',
    },
  },
  'audit-logs': {
    title: 'Audit Logs',
    subtitle: 'Complete Activity Tracking',
    description: 'Track every action with detailed audit logs.',
    longDescription: 'Know exactly what happened, when, and by whom. Comprehensive audit logs track every action in your CRM - logins, data changes, exports, and more. Essential for compliance, security, and troubleshooting. Searchable logs with powerful filters.',
    icon: Eye,
    gradient: 'from-gray-600 to-gray-800',
    heroImage: '/screenshots/02-dashboard.png',
    benefits: [
      { title: 'Complete History', description: 'Every action logged with timestamp and user', icon: Clock },
      { title: 'Searchable', description: 'Find any action with powerful search', icon: Search },
      { title: 'Exportable', description: 'Export logs for compliance audits', icon: Download },
      { title: 'Real-time', description: 'Logs updated instantly as actions occur', icon: Zap },
    ],
    capabilities: [
      { title: 'Action Tracking', description: 'Log creates, updates, deletes, views, and exports', icon: Eye },
      { title: 'User Activity', description: 'See all actions by any user', icon: Users },
      { title: 'Data Changes', description: 'Before and after values for all changes', icon: Edit },
      { title: 'Security Events', description: 'Login attempts, password changes, and access', icon: Lock },
    ],
    stats: [
      { value: '100%', label: 'Actions Logged' },
      { value: '1 Year', label: 'Retention' },
      { value: 'Instant', label: 'Search' },
      { value: 'SOC 2', label: 'Compliant' },
    ],
    useCases: [
      { title: 'Compliance', description: 'Meet GDPR, SOC 2, and regulatory requirements' },
      { title: 'Security', description: 'Detect unauthorized access and anomalies' },
      { title: 'Troubleshooting', description: 'Understand what happened and when' },
      { title: 'Accountability', description: 'Know who made what changes' },
    ],
    faqs: [
      { question: 'How long are logs retained?', answer: '1 year on standard plans, unlimited on Enterprise.' },
      { question: 'Can I export audit logs?', answer: 'Yes, export to CSV or JSON for compliance audits.' },
      { question: 'What actions are logged?', answer: 'Everything - logins, data changes, exports, settings changes, and more.' },
    ],
    testimonial: {
      quote: 'Audit logs saved us during a compliance audit. Everything was documented.',
      author: 'Lakshmi Narayanan',
      role: 'Compliance Officer',
      company: 'RegulatedFinance Ltd',
    },
  },
};

export const FeatureDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const feature = slug ? FEATURES_DATA[slug] : null;
  const [activeQuestion, setActiveQuestion] = useState<number | null>(null);

  // Scroll to top on page load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  if (!feature) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Nav />
        <div className="pt-32 pb-20 text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Feature Not Found</h1>
          <p className="text-gray-400 mb-8">The feature you're looking for doesn't exist.</p>
          <Link to="/" className="text-cyan-400 hover:text-cyan-300">
            &larr; Back to Home
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const Icon = feature.icon;

  return (
    <div className="min-h-screen bg-slate-950">
      <Nav />

      {/* Hero Section - Full Width Design */}
      <section className="pt-20 pb-16 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:60px_60px]"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }}></div>

        <div className="relative w-full px-4 sm:px-6 lg:px-12">
          {/* Main Hero Grid - 2 Columns: Content Left, Image Right */}
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
            {/* Left Content */}
            <div>
              <div className={`inline-flex items-center bg-gradient-to-r ${feature.gradient} bg-opacity-10 border border-white/20 rounded-full px-4 py-2 mb-6`}>
                <Icon className="w-5 h-5 text-white mr-2" />
                <span className="text-white text-sm font-medium">{feature.subtitle}</span>
              </div>

              <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6 leading-tight">
                {feature.title}
              </h1>

              <p className="text-lg text-gray-400 mb-6 leading-relaxed">
                {feature.longDescription}
              </p>

              {/* Stats Row */}
              <div className="grid grid-cols-4 gap-3 mb-8 p-4 bg-slate-800/30 rounded-2xl border border-slate-700/30">
                {feature.stats.map((stat, i) => (
                  <div key={i} className="text-center">
                    <div className={`text-2xl font-bold bg-gradient-to-r ${feature.gradient} bg-clip-text text-transparent`}>
                      {stat.value}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-4 mb-8">
                <Link
                  to="/register"
                  className={`inline-flex items-center justify-center bg-gradient-to-r ${feature.gradient} text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:shadow-cyan-500/40 hover:scale-105 group`}
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

              {/* Feature Pills */}
              <div className="flex flex-wrap gap-2 mb-8">
                {feature.benefits.map((benefit, i) => {
                  const BIcon = benefit.icon;
                  return (
                    <div
                      key={i}
                      className="group flex items-center gap-2 bg-slate-800/60 border border-slate-700/50 rounded-full px-4 py-2.5 text-sm cursor-default hover:bg-slate-700/60 hover:border-cyan-500/30 transition-all"
                    >
                      <BIcon className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                      <span className="text-gray-300 group-hover:text-white transition-colors">{benefit.title}</span>
                    </div>
                  );
                })}
              </div>

              {/* Trust Badges */}
              <div className="flex flex-wrap items-center gap-4 pt-6 border-t border-slate-700/50">
                <div className="flex items-center gap-3 bg-slate-800/50 rounded-full px-4 py-2 border border-slate-700/50">
                  <div className="flex -space-x-2">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className={`w-8 h-8 rounded-full bg-gradient-to-r ${feature.gradient} border-2 border-slate-900 flex items-center justify-center text-white text-xs font-bold shadow-lg`}>
                        {String.fromCharCode(65 + i)}
                      </div>
                    ))}
                  </div>
                  <span className="text-white text-sm font-medium">500+ teams</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-800/50 rounded-full px-4 py-2 border border-slate-700/50">
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                  <span className="text-white text-sm font-medium">4.9/5</span>
                </div>
                <div className="flex items-center gap-2 bg-green-500/10 rounded-full px-4 py-2 border border-green-500/30">
                  <Shield className="w-4 h-4 text-green-400" />
                  <span className="text-green-400 text-sm font-medium">SOC 2</span>
                </div>
              </div>
            </div>

            {/* Right Side - Screenshot */}
            <div className="relative lg:mt-24">
              <div className="relative group">
                {/* Glow Effect */}
                <div className={`absolute inset-0 bg-gradient-to-r ${feature.gradient} opacity-20 blur-3xl -z-10 scale-95 group-hover:opacity-30 transition-opacity`}></div>

                {/* Browser Window */}
                <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-2xl border border-white/10 overflow-hidden shadow-2xl transform group-hover:scale-[1.02] transition-transform duration-500">
                  <div className="bg-slate-800/80 border-b border-white/10 px-4 py-3 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                    <div className="flex-1 text-center">
                      <span className="text-xs text-gray-500">app.myleadx.ai</span>
                    </div>
                  </div>
                  <div className="relative">
                    <img
                      src={feature.heroImage}
                      alt={feature.title}
                      className="w-full h-auto"
                      onError={(e) => {
                        e.currentTarget.src = '/screenshots/02-dashboard.png';
                      }}
                    />
                    {/* Live Demo Badge */}
                    <div className="absolute top-4 right-4 bg-green-500/90 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                      <span className="w-2 h-2 bg-white rounded-full animate-ping"></span>
                      Live Demo
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Add CSS for floating animation */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>

      {/* Benefits Section */}
      <section className="py-20 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Why Teams Love <span className={`bg-gradient-to-r ${feature.gradient} bg-clip-text text-transparent`}>{feature.title}</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Discover the key benefits that make this feature essential for growing teams.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {feature.benefits.map((benefit, i) => {
              const BenefitIcon = benefit.icon;
              return (
                <div
                  key={i}
                  className="group bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 hover:border-cyan-500/30 transition-all duration-300 hover:transform hover:-translate-y-2"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <BenefitIcon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{benefit.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{benefit.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Capabilities Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center bg-cyan-500/10 border border-cyan-500/20 rounded-full px-4 py-2 mb-6">
              <Cpu className="w-4 h-4 text-cyan-400 mr-2" />
              <span className="text-cyan-300 text-sm font-medium">Powerful Capabilities</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Deep dive into the powerful capabilities that set MyLeadX apart.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {feature.capabilities.map((cap, i) => {
              const CapIcon = cap.icon;
              return (
                <div
                  key={i}
                  className="group flex gap-6 bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-8 border border-slate-700/50 hover:border-cyan-500/30 transition-all duration-300"
                >
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                    <CapIcon className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-3">{cap.title}</h3>
                    <p className="text-gray-400 leading-relaxed">{cap.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-20 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Perfect For
            </h2>
            <p className="text-gray-400 text-lg">
              See how different teams use {feature.title} to drive results.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {feature.useCases.map((useCase, i) => (
              <div
                key={i}
                className={`bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-6 border border-slate-700/50 hover:border-purple-500/30 transition-all text-center hover:transform hover:-translate-y-1`}
              >
                <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${feature.gradient} flex items-center justify-center mx-auto mb-4`}>
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{useCase.title}</h3>
                <p className="text-gray-400 text-sm">{useCase.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      {feature.testimonial && (
        <section className="py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className={`bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-3xl p-10 border border-slate-700/50 relative overflow-hidden`}>
              <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${feature.gradient}`}></div>
              <div className="flex gap-1 mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <blockquote className="text-2xl text-white font-medium leading-relaxed mb-8">
                "{feature.testimonial.quote}"
              </blockquote>
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-full bg-gradient-to-r ${feature.gradient} flex items-center justify-center text-white text-xl font-bold`}>
                  {feature.testimonial.author.charAt(0)}
                </div>
                <div>
                  <div className="text-white font-semibold">{feature.testimonial.author}</div>
                  <div className="text-gray-400 text-sm">{feature.testimonial.role}, {feature.testimonial.company}</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* FAQ Section */}
      <section className="py-20 bg-slate-900/50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-gray-400 text-lg">
              Got questions? We've got answers.
            </p>
          </div>

          <div className="space-y-4">
            {feature.faqs.map((faq, i) => (
              <div
                key={i}
                className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden"
              >
                <button
                  onClick={() => setActiveQuestion(activeQuestion === i ? null : i)}
                  className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-700/30 transition-colors"
                >
                  <span className="text-white font-medium pr-4">{faq.question}</span>
                  <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${activeQuestion === i ? 'rotate-90' : ''}`} />
                </button>
                {activeQuestion === i && (
                  <div className="px-6 pb-6 text-gray-400 leading-relaxed animate-fade-in">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={`py-20 bg-gradient-to-r ${feature.gradient} relative overflow-hidden`}>
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-white/10 rounded-full blur-[80px]"></div>
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-white/10 rounded-full blur-[100px]"></div>
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            Ready to Transform Your Sales?
          </h2>
          <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            Join thousands of teams using {feature.title} to close more deals. Start your free 14-day trial today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="inline-flex items-center justify-center bg-white text-slate-900 px-10 py-4 rounded-xl font-semibold text-lg hover:bg-gray-100 transition-all shadow-xl hover:scale-105 group"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Start Free Trial
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center border-2 border-white/30 text-white px-10 py-4 rounded-xl font-semibold text-lg hover:bg-white/10 transition-all backdrop-blur-sm"
            >
              View Pricing
            </Link>
          </div>
          <p className="text-white/60 text-sm mt-6">No credit card required • Full access for 14 days • Cancel anytime</p>
        </div>
      </section>

      {/* Related Features */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">
              Explore More Features
            </h2>
          </div>

          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Object.entries(FEATURES_DATA)
              .filter(([key]) => key !== slug)
              .slice(0, 4)
              .map(([key, feat]) => {
                const FeatIcon = feat.icon;
                return (
                  <Link
                    key={key}
                    to={`/features/${key}`}
                    className="group bg-slate-800/50 rounded-xl p-5 border border-slate-700/50 hover:border-cyan-500/30 transition-all hover:transform hover:-translate-y-1"
                  >
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${feat.gradient} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                      <FeatIcon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-white font-semibold mb-1">{feat.title}</h3>
                    <p className="text-gray-400 text-sm">{feat.subtitle}</p>
                  </Link>
                );
              })}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default FeatureDetailPage;
