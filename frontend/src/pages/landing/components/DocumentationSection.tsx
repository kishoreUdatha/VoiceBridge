/**
 * Documentation Section - User Guide with Visual Screenshots
 * Comprehensive guide showing how to use VoiceBridge features
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
} from 'lucide-react';

interface GuideStep {
  title: string;
  description: string;
  image?: string;
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
        description: 'Go to Voice AI → New Agent. Choose from templates like Education Counselor, Real Estate Agent, or Insurance Advisor. Each template comes with industry-specific scripts.',
      },
      {
        title: 'Configuring the Script',
        description: 'Customize the greeting, qualification questions, objection handling, and closing script. Add dynamic variables like {{lead.name}} and {{lead.course}}.',
      },
      {
        title: 'Voice & Language Settings',
        description: 'Select from 25+ voices in English, Hindi, Telugu, and other Indian languages. Adjust speaking speed, pitch, and tone to match your brand.',
      },
      {
        title: 'Call Flow Builder',
        description: 'Create visual call flows with conditions, branching logic, and transfers. Route calls to humans when needed or schedule callbacks.',
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
        description: 'Telecallers see their assigned leads, pending follow-ups, and today\'s targets. The smart queue prioritizes hot leads and scheduled callbacks.',
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
        description: 'Telecallers can track their own performance: calls made, talk time, conversions, and compare with team averages.',
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
        description: 'Create pre-approved WhatsApp templates for different purposes: welcome messages, follow-ups, payment reminders, documents collection.',
      },
      {
        title: 'Bulk Messaging',
        description: 'Select recipients from your leads list or upload a contact list. Personalize messages with variables and schedule for optimal delivery times.',
      },
      {
        title: 'SMS Campaigns',
        description: 'Send instant SMS notifications with delivery tracking. Use for urgent communications, OTPs, or reminders.',
      },
      {
        title: 'Email Sequences',
        description: 'Create automated email drip campaigns. Set triggers like "7 days after inquiry" or "after site visit" to nurture leads automatically.',
      },
      {
        title: 'Campaign Analytics',
        description: 'Track delivery rates, open rates, click rates, and conversions. A/B test different messages to optimize performance.',
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
        description: 'See key metrics at a glance: total leads, conversion rate, revenue pipeline, calls made today, and team performance.',
      },
      {
        title: 'Conversion Funnel',
        description: 'Visualize your lead funnel from inquiry to conversion. Identify bottlenecks where leads drop off and optimize accordingly.',
      },
      {
        title: 'Agent Performance',
        description: 'Compare telecaller performance: calls made, talk time, conversion rate, average handling time. Identify top performers and areas for coaching.',
      },
      {
        title: 'Lead Source Analysis',
        description: 'Track which sources bring the best leads: Facebook ads, Google ads, website forms, referrals. Optimize your ad spend accordingly.',
      },
      {
        title: 'Export Reports',
        description: 'Download detailed reports in Excel or PDF. Schedule automated reports to be emailed daily, weekly, or monthly.',
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
        description: 'Silently listen to any active call without the agent or customer knowing. Perfect for quality monitoring and training.',
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
        description: 'Connect Facebook, Instagram, LinkedIn, Google Ads, YouTube, and more. Leads from ads are automatically imported with UTM tracking.',
      },
      {
        title: 'CRM Integration',
        description: 'Sync with Salesforce, HubSpot, or Zoho CRM. Two-way sync ensures your data is always up to date.',
      },
      {
        title: 'Webhooks',
        description: 'Set up webhooks to receive real-time notifications when leads are created, calls are completed, or deals are closed.',
      },
      {
        title: 'REST API',
        description: 'Full API access for custom integrations. Create leads, trigger calls, send messages, and fetch analytics programmatically.',
      },
      {
        title: 'Zapier & Make',
        description: 'Connect to 5000+ apps via Zapier or Make. Automate workflows like "Add lead from Typeform" or "Notify Slack on conversion".',
      },
    ],
  },
];

// Expandable Guide Card
const GuideCard: React.FC<{ guide: Guide }> = ({ guide }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const Icon = guide.icon;

  const colorClasses: Record<string, { bg: string; border: string; icon: string; text: string }> = {
    violet: { bg: 'bg-violet-50', border: 'border-violet-200', icon: 'bg-violet-600', text: 'text-violet-600' },
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'bg-blue-600', text: 'text-blue-600' },
    purple: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'bg-purple-600', text: 'text-purple-600' },
    cyan: { bg: 'bg-cyan-50', border: 'border-cyan-200', icon: 'bg-cyan-600', text: 'text-cyan-600' },
    green: { bg: 'bg-green-50', border: 'border-green-200', icon: 'bg-green-600', text: 'text-green-600' },
    orange: { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'bg-orange-600', text: 'text-orange-600' },
    rose: { bg: 'bg-rose-50', border: 'border-rose-200', icon: 'bg-rose-600', text: 'text-rose-600' },
    indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', icon: 'bg-indigo-600', text: 'text-indigo-600' },
  };

  const colors = colorClasses[guide.color] || colorClasses.violet;

  return (
    <div className={`rounded-2xl border ${colors.border} ${colors.bg} overflow-hidden transition-all duration-300`}>
      {/* Header */}
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

      {/* Expanded Content */}
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

// Quick Start Card
const QuickStartCard: React.FC<{
  icon: React.FC<{ className?: string }>;
  title: string;
  description: string;
  link: string;
  gradient: string;
}> = ({ icon: Icon, title, description, link, gradient }) => (
  <Link
    to={link}
    className="group block p-6 bg-white rounded-2xl border border-slate-200 hover:border-violet-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
  >
    <div className={`w-14 h-14 ${gradient} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
      <Icon className="w-7 h-7 text-white" />
    </div>
    <h3 className="font-bold text-slate-900 mb-2 group-hover:text-violet-600 transition-colors">{title}</h3>
    <p className="text-sm text-slate-600 mb-4">{description}</p>
    <div className="flex items-center gap-2 text-violet-600 font-medium text-sm">
      Learn more
      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
    </div>
  </Link>
);

// Main Documentation Section
export const DocumentationSection: React.FC = () => {
  return (
    <section id="documentation" className="py-24 bg-gradient-to-b from-white to-slate-50">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 bg-violet-100 text-violet-700 px-4 py-2 rounded-full text-sm font-semibold mb-6">
            <BookOpen className="w-4 h-4" />
            User Guide
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
            Learn how to use{' '}
            <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              VoiceBridge
            </span>
          </h2>
          <p className="text-xl text-slate-600">
            Step-by-step guides to help you get the most out of our platform.
            From setup to advanced features.
          </p>
        </div>

        {/* Quick Start Cards */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-slate-900 mb-8 text-center">Quick Start Guides</h3>
          <div className="grid md:grid-cols-4 gap-6">
            <QuickStartCard
              icon={Play}
              title="First Steps"
              description="Create account, set up org, import leads"
              link="/register"
              gradient="bg-gradient-to-br from-violet-500 to-purple-600"
            />
            <QuickStartCard
              icon={Bot}
              title="Create AI Agent"
              description="Build your first voice agent in 5 minutes"
              link="/register"
              gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
            />
            <QuickStartCard
              icon={Upload}
              title="Import Leads"
              description="Upload CSV or connect ad platforms"
              link="/register"
              gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
            />
            <QuickStartCard
              icon={Phone}
              title="Start Calling"
              description="Launch your first AI call campaign"
              link="/register"
              gradient="bg-gradient-to-br from-orange-500 to-rose-600"
            />
          </div>
        </div>

        {/* Feature Guides */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-slate-900 mb-8 text-center">Feature Guides</h3>
          <div className="grid md:grid-cols-2 gap-6">
            {GUIDES.map((guide) => (
              <GuideCard key={guide.id} guide={guide} />
            ))}
          </div>
        </div>

        {/* Video Tutorials CTA */}
        <div className="bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 rounded-3xl p-10 md:p-16 text-white text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')]" />

          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8">
              <Play className="w-10 h-10 text-white ml-1" />
            </div>
            <h3 className="text-3xl md:text-4xl font-bold mb-4">
              Prefer watching videos?
            </h3>
            <p className="text-xl text-violet-200 mb-8 max-w-2xl mx-auto">
              Check out our YouTube channel for detailed video tutorials,
              feature walkthroughs, and best practices.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white text-violet-600 px-8 py-4 rounded-full font-semibold hover:bg-violet-50 transition-colors flex items-center gap-2"
              >
                <Play className="w-5 h-5" />
                Watch Tutorials
              </a>
              <Link
                to="/register"
                className="border-2 border-white/30 text-white px-8 py-4 rounded-full font-semibold hover:bg-white/10 transition-colors"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>

        {/* FAQ Teaser */}
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-bold text-slate-900 mb-4">Still have questions?</h3>
          <p className="text-slate-600 mb-6">
            Our support team is available 24/7 to help you succeed.
          </p>
          <div className="flex items-center justify-center gap-4">
            <a
              href="mailto:support@voicebridge.in"
              className="inline-flex items-center gap-2 bg-violet-100 text-violet-700 px-6 py-3 rounded-full font-semibold hover:bg-violet-200 transition-colors"
            >
              <MessageSquare className="w-5 h-5" />
              Contact Support
            </a>
            <a
              href="#"
              className="inline-flex items-center gap-2 text-slate-600 hover:text-violet-600 font-semibold transition-colors"
            >
              <FileText className="w-5 h-5" />
              View FAQ
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DocumentationSection;
