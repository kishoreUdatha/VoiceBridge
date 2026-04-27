/**
 * Public Documentation Page
 * Professional design with screenshots
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Play,
  ChevronRight,
  Users,
  Phone,
  MessageSquare,
  BarChart3,
  Upload,
  Bot,
  Settings,
  Zap,
  ArrowRight,
  Home,
  Menu,
  X,
  CheckCircle2,
  ExternalLink,
  Search,
} from 'lucide-react';

export default function DocsPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('getting-started');

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  const sections = [
    { id: 'getting-started', title: 'Getting Started', icon: Play },
    { id: 'lead-management', title: 'Lead Management', icon: Users },
    { id: 'ai-calling', title: 'AI Voice Calling', icon: Bot },
    { id: 'campaigns', title: 'Campaigns', icon: MessageSquare },
    { id: 'analytics', title: 'Analytics & Reports', icon: BarChart3 },
    { id: 'integrations', title: 'Integrations', icon: Zap },
    { id: 'settings', title: 'Settings', icon: Settings },
  ];

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      const offset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2">
                <img src="/logo.png" alt="MyLeadX" className="w-8 h-8 rounded-lg" />
                <span className="text-xl font-bold text-gray-900">MyLeadX</span>
              </Link>
              <span className="hidden sm:block text-gray-300">|</span>
              <span className="hidden sm:block text-sm font-medium text-gray-600">Documentation</span>
            </div>

            <div className="hidden md:flex items-center gap-6">
              <Link to="/" className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1">
                <Home className="w-4 h-4" />
                Home
              </Link>
              <Link to="/pricing" className="text-sm text-gray-600 hover:text-gray-900">
                Pricing
              </Link>
              <Link
                to="/register"
                className="bg-violet-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-violet-700 transition-colors"
              >
                Get Started
              </Link>
            </div>

            <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute right-0 top-16 bottom-0 w-72 bg-white shadow-xl overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Documentation</h3>
              <nav className="space-y-1">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                      activeSection === section.id
                        ? 'bg-violet-50 text-violet-700'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <section.icon className="w-4 h-4" />
                    {section.title}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>
      )}

      <div className="pt-16 flex">
        {/* Sidebar */}
        <aside className="hidden lg:block w-64 fixed left-0 top-16 bottom-0 border-r border-gray-200 overflow-y-auto">
          <div className="p-6">
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search docs..."
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <nav className="space-y-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-colors ${
                    activeSection === section.id
                      ? 'bg-violet-50 text-violet-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <section.icon className="w-4 h-4" />
                  {section.title}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-64">
          <div className="max-w-4xl mx-auto px-6 py-12">

            {/* Getting Started */}
            <section id="getting-started" className="mb-16 scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                  <Play className="w-5 h-5 text-violet-600" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900">Getting Started</h1>
              </div>
              <p className="text-lg text-gray-600 mb-8">
                Welcome to MyLeadX! Follow these steps to set up your account and start converting leads with AI.
              </p>

              {/* Step 1 */}
              <div className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-8 h-8 bg-violet-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                  <h3 className="text-xl font-semibold text-gray-900">Create Your Account</h3>
                </div>
                <p className="text-gray-600 mb-4 ml-11">
                  Sign up with your business email to get a 14-day free trial. No credit card required.
                </p>
                <div className="ml-11 bg-gray-100 rounded-xl p-4 mb-4">
                  <div className="aspect-video bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                        <Users className="w-8 h-8 text-violet-600" />
                      </div>
                      <p className="text-gray-500 text-sm">Registration Screen</p>
                    </div>
                  </div>
                </div>
                <div className="ml-11 flex items-center gap-2 text-sm text-gray-500">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Takes less than 2 minutes</span>
                </div>
              </div>

              {/* Step 2 */}
              <div className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-8 h-8 bg-violet-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                  <h3 className="text-xl font-semibold text-gray-900">Set Up Your Organization</h3>
                </div>
                <p className="text-gray-600 mb-4 ml-11">
                  Enter your company details and select your industry. This helps us customize the platform for your business.
                </p>
                <div className="ml-11 bg-gray-100 rounded-xl p-4 mb-4">
                  <div className="aspect-video bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                        <Settings className="w-8 h-8 text-violet-600" />
                      </div>
                      <p className="text-gray-500 text-sm">Organization Setup</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-8 h-8 bg-violet-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                  <h3 className="text-xl font-semibold text-gray-900">Import Your Leads</h3>
                </div>
                <p className="text-gray-600 mb-4 ml-11">
                  Upload your leads via CSV, connect your web forms, or sync from Facebook/Google Ads.
                </p>
                <div className="ml-11 bg-gray-100 rounded-xl p-4 mb-4">
                  <div className="aspect-video bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                        <Upload className="w-8 h-8 text-violet-600" />
                      </div>
                      <p className="text-gray-500 text-sm">Lead Import Screen</p>
                    </div>
                  </div>
                </div>
                <div className="ml-11 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-800 text-sm">
                    <strong>Tip:</strong> Download our CSV template to ensure your data imports correctly.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-8 h-8 bg-violet-600 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
                  <h3 className="text-xl font-semibold text-gray-900">Create Your First AI Agent</h3>
                </div>
                <p className="text-gray-600 mb-4 ml-11">
                  Choose from pre-built templates or create a custom AI voice agent for your business.
                </p>
                <div className="ml-11 bg-gray-100 rounded-xl p-4">
                  <div className="aspect-video bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                        <Bot className="w-8 h-8 text-violet-600" />
                      </div>
                      <p className="text-gray-500 text-sm">AI Agent Builder</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Lead Management */}
            <section id="lead-management" className="mb-16 scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Lead Management</h2>
              </div>
              <p className="text-lg text-gray-600 mb-8">
                Organize, track, and convert your leads efficiently with our powerful CRM features.
              </p>

              <div className="space-y-8">
                <div className="border border-gray-200 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Lead Dashboard</h3>
                  <p className="text-gray-600 mb-4">
                    View all your leads in one place. Filter by status, source, assigned agent, or date range.
                  </p>
                  <div className="bg-gray-100 rounded-xl p-4">
                    <div className="aspect-video bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                          <Users className="w-8 h-8 text-blue-600" />
                        </div>
                        <p className="text-gray-500 text-sm">Lead Dashboard View</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Lead Stages & Pipeline</h3>
                  <p className="text-gray-600 mb-4">
                    Track leads through customizable stages: New → Contacted → Interested → Demo → Negotiation → Won/Lost
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {['New', 'Contacted', 'Interested', 'Demo', 'Negotiation', 'Won'].map((stage, i) => (
                      <span key={stage} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm flex items-center gap-1">
                        {stage}
                        {i < 5 && <ChevronRight className="w-3 h-3" />}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="border border-gray-200 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Bulk Import</h3>
                  <p className="text-gray-600 mb-4">
                    Import thousands of leads at once using our CSV template. Duplicate detection included.
                  </p>
                  <div className="bg-gray-100 rounded-xl p-4">
                    <div className="aspect-video bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                          <Upload className="w-8 h-8 text-blue-600" />
                        </div>
                        <p className="text-gray-500 text-sm">Bulk Import Screen</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* AI Voice Calling */}
            <section id="ai-calling" className="mb-16 scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Bot className="w-5 h-5 text-purple-600" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900">AI Voice Calling</h2>
              </div>
              <p className="text-lg text-gray-600 mb-8">
                Create intelligent AI agents that make calls, qualify leads, and book appointments 24/7.
              </p>

              <div className="space-y-8">
                <div className="border border-gray-200 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Create AI Agent</h3>
                  <p className="text-gray-600 mb-4">
                    Build your AI calling agent with our visual builder. Choose voice, language, and conversation flow.
                  </p>
                  <div className="bg-gray-100 rounded-xl p-4">
                    <div className="aspect-video bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                          <Bot className="w-8 h-8 text-purple-600" />
                        </div>
                        <p className="text-gray-500 text-sm">AI Agent Builder</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Voice & Language Options</h3>
                  <p className="text-gray-600 mb-4">
                    Choose from 25+ natural voices in English, Hindi, Telugu, Tamil, and more Indian languages.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {['English', 'Hindi', 'Telugu', 'Tamil', 'Kannada', 'Malayalam', 'Marathi', 'Bengali'].map((lang) => (
                      <div key={lang} className="bg-purple-50 text-purple-700 px-3 py-2 rounded-lg text-sm text-center">
                        {lang}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border border-gray-200 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Call Campaigns</h3>
                  <p className="text-gray-600 mb-4">
                    Launch automated calling campaigns. Set calling hours, retry rules, and daily limits.
                  </p>
                  <div className="bg-gray-100 rounded-xl p-4">
                    <div className="aspect-video bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                          <Phone className="w-8 h-8 text-purple-600" />
                        </div>
                        <p className="text-gray-500 text-sm">Campaign Dashboard</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Campaigns */}
            <section id="campaigns" className="mb-16 scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-green-600" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Campaigns</h2>
              </div>
              <p className="text-lg text-gray-600 mb-8">
                Reach your leads through WhatsApp, SMS, and Email campaigns.
              </p>

              <div className="grid sm:grid-cols-3 gap-6">
                <div className="border border-gray-200 rounded-xl p-6 text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">WhatsApp</h3>
                  <p className="text-gray-600 text-sm">Send templates, media, and bulk messages</p>
                </div>
                <div className="border border-gray-200 rounded-xl p-6 text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">SMS</h3>
                  <p className="text-gray-600 text-sm">Instant SMS delivery with tracking</p>
                </div>
                <div className="border border-gray-200 rounded-xl p-6 text-center">
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-6 h-6 text-orange-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Email</h3>
                  <p className="text-gray-600 text-sm">Automated sequences and templates</p>
                </div>
              </div>
            </section>

            {/* Analytics */}
            <section id="analytics" className="mb-16 scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-orange-600" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Analytics & Reports</h2>
              </div>
              <p className="text-lg text-gray-600 mb-8">
                Track performance, measure conversions, and make data-driven decisions.
              </p>

              <div className="border border-gray-200 rounded-xl p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Dashboard Overview</h3>
                <p className="text-gray-600 mb-4">
                  View key metrics at a glance: total leads, calls made, conversion rate, and revenue.
                </p>
                <div className="bg-gray-100 rounded-xl p-4">
                  <div className="aspect-video bg-gradient-to-br from-orange-100 to-orange-200 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                        <BarChart3 className="w-8 h-8 text-orange-600" />
                      </div>
                      <p className="text-gray-500 text-sm">Analytics Dashboard</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div className="border border-gray-200 rounded-xl p-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Agent Performance</h3>
                  <p className="text-gray-600 text-sm">Compare telecaller metrics: calls, talk time, conversions</p>
                </div>
                <div className="border border-gray-200 rounded-xl p-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Lead Source Analysis</h3>
                  <p className="text-gray-600 text-sm">Track which sources bring the best leads</p>
                </div>
                <div className="border border-gray-200 rounded-xl p-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Conversion Funnel</h3>
                  <p className="text-gray-600 text-sm">Visualize your pipeline and identify bottlenecks</p>
                </div>
                <div className="border border-gray-200 rounded-xl p-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Export Reports</h3>
                  <p className="text-gray-600 text-sm">Download Excel/PDF reports or schedule automated emails</p>
                </div>
              </div>
            </section>

            {/* Integrations */}
            <section id="integrations" className="mb-16 scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-indigo-600" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Integrations</h2>
              </div>
              <p className="text-lg text-gray-600 mb-8">
                Connect MyLeadX with your favorite tools and platforms.
              </p>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { name: 'Facebook Ads', desc: 'Auto-import leads' },
                  { name: 'Google Ads', desc: 'Sync lead forms' },
                  { name: 'WhatsApp Business', desc: 'Send messages' },
                  { name: 'Zapier', desc: '5000+ apps' },
                  { name: 'Google Sheets', desc: 'Two-way sync' },
                  { name: 'REST API', desc: 'Custom integrations' },
                ].map((item) => (
                  <div key={item.name} className="border border-gray-200 rounded-xl p-4 flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Zap className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{item.name}</h4>
                      <p className="text-sm text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Settings */}
            <section id="settings" className="mb-16 scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Settings className="w-5 h-5 text-gray-600" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Settings</h2>
              </div>
              <p className="text-lg text-gray-600 mb-8">
                Configure your account, team, and preferences.
              </p>

              <div className="space-y-4">
                {[
                  { title: 'Team Management', desc: 'Add users, assign roles, set permissions' },
                  { title: 'Phone Numbers', desc: 'Buy and manage your calling numbers' },
                  { title: 'Lead Stages', desc: 'Customize your pipeline stages' },
                  { title: 'Notifications', desc: 'Configure email and push notifications' },
                  { title: 'API Keys', desc: 'Generate keys for integrations' },
                  { title: 'Billing', desc: 'Manage subscription and invoices' },
                ].map((item) => (
                  <div key={item.title} className="border border-gray-200 rounded-xl p-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer">
                    <div>
                      <h4 className="font-medium text-gray-900">{item.title}</h4>
                      <p className="text-sm text-gray-500">{item.desc}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                ))}
              </div>
            </section>

            {/* CTA */}
            <section className="bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl p-8 text-center text-white">
              <h2 className="text-2xl font-bold mb-3">Need Help?</h2>
              <p className="text-violet-200 mb-6">
                Our support team is here to assist you.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                  href="mailto:support@myleadx.ai"
                  className="bg-white text-violet-600 px-6 py-3 rounded-lg font-medium hover:bg-violet-50 transition-colors flex items-center gap-2"
                >
                  Contact Support
                  <ExternalLink className="w-4 h-4" />
                </a>
                <Link
                  to="/register"
                  className="border border-white/30 text-white px-6 py-3 rounded-lg font-medium hover:bg-white/10 transition-colors flex items-center gap-2"
                >
                  Start Free Trial
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </section>

          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="lg:ml-64 border-t border-gray-200 py-8">
        <div className="max-w-4xl mx-auto px-6 text-center text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} MyLeadX. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
