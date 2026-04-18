/**
 * Public Documentation Page
 * Accessible without login
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Play,
  ChevronRight,
  ChevronDown,
  Users,
  Phone,
  MessageSquare,
  BarChart3,
  Upload,
  Bot,
  Headphones,
  FileText,
  Zap,
  ArrowRight,
  Home,
  Menu,
  X,
} from 'lucide-react';

interface GuideStep {
  title: string;
  description: string;
}

interface Guide {
  id: string;
  icon: React.FC<{ className?: string }>;
  title: string;
  description: string;
  color: string;
  steps: GuideStep[];
}

const GUIDES: Guide[] = [
  {
    id: 'getting-started',
    icon: Play,
    title: 'Getting Started',
    description: 'Set up your account and make your first AI call in minutes',
    color: 'violet',
    steps: [
      {
        title: 'Step 1: Create Your Account',
        description: 'Sign up with your business email. You\'ll get a 14-day free trial with full access to all features. No credit card required.',
      },
      {
        title: 'Step 2: Set Up Your Organization',
        description: 'Enter your company name, select your industry (Education, Real Estate, Insurance, etc.), and configure your business settings.',
      },
      {
        title: 'Step 3: Add Team Members',
        description: 'Invite your sales team, managers, and telecallers. Assign roles like Admin, Manager, Telecaller, or Field Sales to control access.',
      },
      {
        title: 'Step 4: Import Your Leads',
        description: 'Upload leads via CSV, connect your forms, or sync from Facebook/Google ads. Your leads appear instantly in the dashboard.',
      },
      {
        title: 'Step 5: Create Your First AI Agent',
        description: 'Choose from pre-built templates or create a custom AI voice agent. Configure the script, voice, and call flow.',
      },
    ],
  },
  {
    id: 'lead-management',
    icon: Users,
    title: 'Lead Management',
    description: 'Organize, track, and convert your leads efficiently',
    color: 'blue',
    steps: [
      {
        title: 'Importing Leads',
        description: 'Go to Leads → Bulk Upload. Download the CSV template, fill in your data, and upload. Duplicate leads are automatically detected and merged.',
      },
      {
        title: 'Lead Stages & Pipeline',
        description: 'Track leads through customizable stages: Inquiry → Interested → Visit Scheduled → Documents → Payment → Converted. Drag and drop to move leads.',
      },
      {
        title: 'Lead Assignment',
        description: 'Auto-assign leads to telecallers using round-robin or weighted distribution. Set assignment schedules for different times and days.',
      },
      {
        title: 'Lead Scoring',
        description: 'AI automatically scores leads based on engagement, qualification, and intent. Focus on hot leads with the highest conversion potential.',
      },
      {
        title: 'Activity Timeline',
        description: 'View complete lead history: calls made, emails sent, WhatsApp messages, stage changes, notes added, and who did what and when.',
      },
    ],
  },
  {
    id: 'ai-voice',
    icon: Bot,
    title: 'AI Voice Agents',
    description: 'Create intelligent voice agents that convert leads 24/7',
    color: 'purple',
    steps: [
      {
        title: 'Creating an AI Agent',
        description: 'Go to Voice AI → New Agent. Choose from templates like Education Counselor, Real Estate Agent, or Insurance Advisor.',
      },
      {
        title: 'Configuring the Script',
        description: 'Customize the greeting, qualification questions, objection handling, and closing script. Add dynamic variables like {{lead.name}}.',
      },
      {
        title: 'Voice & Language Settings',
        description: 'Select from 25+ voices in English, Hindi, Telugu, and other Indian languages. Adjust speaking speed, pitch, and tone.',
      },
      {
        title: 'Call Flow Builder',
        description: 'Create visual call flows with conditions, branching logic, and transfers. Route calls to humans when needed.',
      },
      {
        title: 'Launching Campaigns',
        description: 'Upload contacts or select from your leads. Set calling hours, max attempts, and retry intervals. Monitor progress in real-time.',
      },
    ],
  },
  {
    id: 'telecaller',
    icon: Headphones,
    title: 'Telecaller App',
    description: 'Dedicated interface for your calling team',
    color: 'cyan',
    steps: [
      {
        title: 'Telecaller Dashboard',
        description: 'Telecallers see their assigned leads, pending follow-ups, and today\'s targets. The smart queue prioritizes hot leads.',
      },
      {
        title: 'Making Calls',
        description: 'Click to call directly from the browser. See lead details, previous notes, and suggested talking points during the call.',
      },
      {
        title: 'Logging Outcomes',
        description: 'After each call, log the outcome: Interested, Callback Requested, Not Interested, Wrong Number, etc. Add notes and schedule follow-ups.',
      },
      {
        title: 'Follow-up Management',
        description: 'Never miss a follow-up. Get reminders for scheduled callbacks. View all pending follow-ups in one place.',
      },
      {
        title: 'Performance Tracking',
        description: 'Track your own performance: calls made, talk time, conversions, and compare with team averages.',
      },
    ],
  },
  {
    id: 'campaigns',
    icon: MessageSquare,
    title: 'WhatsApp & SMS Campaigns',
    description: 'Reach leads on their preferred channels',
    color: 'green',
    steps: [
      {
        title: 'WhatsApp Templates',
        description: 'Create pre-approved WhatsApp templates for welcome messages, follow-ups, payment reminders, and document collection.',
      },
      {
        title: 'Bulk Messaging',
        description: 'Select recipients from your leads list. Personalize messages with variables and schedule for optimal delivery times.',
      },
      {
        title: 'SMS Campaigns',
        description: 'Send instant SMS notifications with delivery tracking. Use for urgent communications, OTPs, or reminders.',
      },
      {
        title: 'Email Sequences',
        description: 'Create automated email drip campaigns with triggers like "7 days after inquiry" to nurture leads automatically.',
      },
      {
        title: 'Campaign Analytics',
        description: 'Track delivery rates, open rates, click rates, and conversions. A/B test different messages.',
      },
    ],
  },
  {
    id: 'analytics',
    icon: BarChart3,
    title: 'Analytics & Reports',
    description: 'Data-driven insights to improve conversions',
    color: 'orange',
    steps: [
      {
        title: 'Dashboard Overview',
        description: 'See key metrics: total leads, conversion rate, revenue pipeline, calls made today, and team performance.',
      },
      {
        title: 'Conversion Funnel',
        description: 'Visualize your lead funnel from inquiry to conversion. Identify bottlenecks where leads drop off.',
      },
      {
        title: 'Agent Performance',
        description: 'Compare telecaller performance: calls made, talk time, conversion rate, average handling time.',
      },
      {
        title: 'Lead Source Analysis',
        description: 'Track which sources bring the best leads: Facebook ads, Google ads, website forms, referrals.',
      },
      {
        title: 'Export Reports',
        description: 'Download detailed reports in Excel or PDF. Schedule automated reports daily, weekly, or monthly.',
      },
    ],
  },
  {
    id: 'call-monitoring',
    icon: Phone,
    title: 'Call Monitoring',
    description: 'Listen, whisper, and barge into live calls',
    color: 'rose',
    steps: [
      {
        title: 'Live Call Dashboard',
        description: 'View all active calls in real-time. See which agents are on calls, call duration, and customer details.',
      },
      {
        title: 'Listen Mode',
        description: 'Silently listen to any active call without the agent or customer knowing. Perfect for quality monitoring.',
      },
      {
        title: 'Whisper Mode',
        description: 'Speak to your agent during a call without the customer hearing. Guide agents through difficult conversations.',
      },
      {
        title: 'Barge Mode',
        description: 'Join the call as a three-way conference. Take over when needed for escalations or closing deals.',
      },
      {
        title: 'Call Recordings',
        description: 'All calls are automatically recorded. Listen to past calls for training, quality assurance, or compliance.',
      },
    ],
  },
  {
    id: 'integrations',
    icon: Zap,
    title: 'Integrations & API',
    description: 'Connect with your existing tools',
    color: 'indigo',
    steps: [
      {
        title: 'Ad Platform Integration',
        description: 'Connect Facebook, Instagram, LinkedIn, Google Ads. Leads from ads are automatically imported with UTM tracking.',
      },
      {
        title: 'CRM Integration',
        description: 'Sync with Salesforce, HubSpot, or Zoho CRM. Two-way sync ensures your data is always up to date.',
      },
      {
        title: 'Webhooks',
        description: 'Set up webhooks to receive real-time notifications when leads are created or calls are completed.',
      },
      {
        title: 'REST API',
        description: 'Full API access for custom integrations. Create leads, trigger calls, send messages programmatically.',
      },
      {
        title: 'Zapier & Make',
        description: 'Connect to 5000+ apps via Zapier or Make. Automate workflows easily.',
      },
    ],
  },
];

const colorClasses: Record<string, { bg: string; border: string; icon: string }> = {
  violet: { bg: 'bg-violet-50', border: 'border-violet-200', icon: 'bg-violet-600' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'bg-blue-600' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'bg-purple-600' },
  cyan: { bg: 'bg-cyan-50', border: 'border-cyan-200', icon: 'bg-cyan-600' },
  green: { bg: 'bg-green-50', border: 'border-green-200', icon: 'bg-green-600' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'bg-orange-600' },
  rose: { bg: 'bg-rose-50', border: 'border-rose-200', icon: 'bg-rose-600' },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', icon: 'bg-indigo-600' },
};

const GuideCard: React.FC<{ guide: Guide }> = ({ guide }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const Icon = guide.icon;
  const colors = colorClasses[guide.color] || colorClasses.violet;

  return (
    <div className={`rounded-2xl border ${colors.border} ${colors.bg} overflow-hidden transition-all duration-300`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-6 flex items-center justify-between hover:bg-white/50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 ${colors.icon} rounded-xl flex items-center justify-center`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-bold text-slate-900">{guide.title}</h3>
            <p className="text-sm text-slate-600">{guide.description}</p>
          </div>
        </div>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isExpanded ? colors.icon : 'bg-slate-200'} transition-colors`}>
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-white" />
          ) : (
            <ChevronRight className="w-5 h-5 text-slate-600" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-6 pb-6 space-y-4">
          {guide.steps.map((step, index) => (
            <div key={index} className="bg-white rounded-xl p-5 border border-slate-100">
              <div className="flex items-start gap-4">
                <div className={`w-8 h-8 ${colors.icon} rounded-lg flex items-center justify-center flex-shrink-0 text-white text-sm font-bold`}>
                  {index + 1}
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">{step.title}</h4>
                  <p className="text-slate-600 text-sm leading-relaxed">{step.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function DocsPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <Phone className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900">MyLeadX</span>
            </Link>

            <div className="hidden md:flex items-center gap-6">
              <Link to="/" className="text-sm font-medium text-slate-600 hover:text-violet-600 flex items-center gap-1">
                <Home className="w-4 h-4" />
                Home
              </Link>
              <Link to="/pricing" className="text-sm font-medium text-slate-600 hover:text-violet-600">
                Pricing
              </Link>
              <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-violet-600">
                Sign In
              </Link>
              <Link
                to="/register"
                className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:shadow-lg transition-all"
              >
                Start Free Trial
              </Link>
            </div>

            <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-slate-100">
              <div className="flex flex-col gap-3">
                <Link to="/" className="text-base font-medium text-slate-700 py-2">Home</Link>
                <Link to="/pricing" className="text-base font-medium text-slate-700 py-2">Pricing</Link>
                <Link to="/login" className="text-base font-medium text-slate-700 py-2">Sign In</Link>
                <Link to="/register" className="bg-violet-600 text-white text-center py-3 rounded-full font-semibold mt-2">
                  Start Free Trial
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-24 pb-12 bg-gradient-to-b from-violet-50 to-slate-50">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-violet-100 text-violet-700 px-4 py-2 rounded-full text-sm font-semibold mb-6">
            <BookOpen className="w-4 h-4" />
            Documentation
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Learn How to Use MyLeadX
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Step-by-step guides to help you get started and master all features
          </p>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-12 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Play, title: 'Getting Started', color: 'violet' },
              { icon: Users, title: 'Lead Management', color: 'blue' },
              { icon: Bot, title: 'AI Voice Agents', color: 'purple' },
              { icon: BarChart3, title: 'Analytics', color: 'orange' },
            ].map((item) => (
              <a
                key={item.title}
                href={`#${item.title.toLowerCase().replace(' ', '-')}`}
                className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <div className={`w-10 h-10 bg-${item.color}-100 rounded-lg flex items-center justify-center`}>
                  <item.icon className={`w-5 h-5 text-${item.color}-600`} />
                </div>
                <span className="font-medium text-slate-900">{item.title}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Guides */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">Feature Guides</h2>
          <div className="space-y-4">
            {GUIDES.map((guide) => (
              <GuideCard key={guide.id} guide={guide} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-br from-violet-600 to-indigo-600">
        <div className="max-w-4xl mx-auto px-6 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-violet-200 mb-8">
            Create your free account and start converting leads with AI today.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="bg-white text-violet-600 px-8 py-4 rounded-full font-semibold hover:bg-violet-50 transition-colors flex items-center gap-2"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/login"
              className="border-2 border-white/30 text-white px-8 py-4 rounded-full font-semibold hover:bg-white/10 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p>&copy; {new Date().getFullYear()} MyLeadX. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
