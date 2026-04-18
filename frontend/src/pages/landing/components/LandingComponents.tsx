/**
 * Landing Page Components - Premium Enterprise Design
 */

import React from 'react';
import { Link } from 'react-router-dom';
import {
  Phone,
  ArrowRight,
  Check,
  Play,
  Star,
  Shield,
  Lock,
  Award,
  Globe,
  Sparkles,
  Menu,
  X,
  Bot,
  MessageCircle,
  BarChart3,
  Users,
  Zap,
  Clock,
  TrendingUp,
  Headphones
} from 'lucide-react';
import {
  Stat,
  Differentiator,
  Industry,
  Feature,
  PricingTier,
  Step,
  FooterSection,
} from '../landing.types';

// Navigation
export const Navigation: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-center h-18 py-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/25">
              <Phone className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-slate-900">MyLeadX</span>
              <span className="text-[10px] font-semibold text-violet-600 uppercase tracking-widest">Enterprise Platform</span>
            </div>
          </div>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-violet-600 transition-colors">Features</a>
            <a href="#solutions" className="text-sm font-medium text-slate-600 hover:text-violet-600 transition-colors">Solutions</a>
            <a href="#pricing" className="text-sm font-medium text-slate-600 hover:text-violet-600 transition-colors">Pricing</a>
            <Link to="/docs" className="text-sm font-medium text-slate-600 hover:text-violet-600 transition-colors">Documentation</Link>
          </div>

          {/* CTA Buttons */}
          <div className="hidden lg:flex items-center gap-4">
            <Link to="/login" className="text-sm font-semibold text-slate-700 hover:text-violet-600 transition-colors px-4 py-2">
              Sign In
            </Link>
            <Link
              to="/register?plan=starter"
              className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold px-6 py-3 rounded-full hover:shadow-lg hover:shadow-violet-500/30 hover:-translate-y-0.5 transition-all duration-200"
            >
              Start Free Trial
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button className="lg:hidden p-2" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="lg:hidden py-6 border-t border-slate-100">
            <div className="flex flex-col gap-4">
              <a href="#features" className="text-base font-medium text-slate-700 py-2">Features</a>
              <a href="#solutions" className="text-base font-medium text-slate-700 py-2">Solutions</a>
              <a href="#pricing" className="text-base font-medium text-slate-700 py-2">Pricing</a>
              <Link to="/docs" className="text-base font-medium text-slate-700 py-2">Documentation</Link>
              <div className="flex gap-3 pt-4 mt-2 border-t border-slate-100">
                <Link to="/login" className="flex-1 text-center text-sm font-semibold text-slate-700 py-3 border border-slate-200 rounded-full">
                  Sign In
                </Link>
                <Link to="/register" className="flex-1 text-center bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold py-3 rounded-full">
                  Start Free
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

// Hero Section
interface HeroSectionProps {
  stats: Stat[];
}

export const HeroSection: React.FC<HeroSectionProps> = ({ stats }) => (
  <section className="pt-32 pb-20 relative overflow-hidden">
    {/* Background */}
    <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-violet-50/30 to-indigo-50/40" />
    <div className="absolute top-0 right-0 w-[1000px] h-[1000px] bg-gradient-to-br from-violet-200/30 to-indigo-200/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
    <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-violet-200/20 to-fuchsia-200/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />

    <div className="max-w-7xl mx-auto px-6 relative">
      {/* Announcement */}
      <div className="flex justify-center mb-12">
        <div className="inline-flex items-center gap-3 bg-white border border-violet-200/60 rounded-full pl-1.5 pr-5 py-1.5 shadow-sm shadow-violet-100">
          <span className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">NEW</span>
          <span className="text-sm text-slate-600">Conversational AI with 25+ Languages</span>
          <Sparkles className="w-4 h-4 text-violet-500" />
        </div>
      </div>

      {/* Hero Content */}
      <div className="text-center max-w-5xl mx-auto">
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-slate-900 mb-8 leading-[1.1]">
          Transform Leads into
          <span className="block bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent mt-2">
            Revenue with AI
          </span>
        </h1>

        <p className="text-xl md:text-2xl text-slate-600 mb-10 max-w-3xl mx-auto leading-relaxed">
          The all-in-one platform for AI voice calls, WhatsApp campaigns,
          and intelligent lead management. Built for enterprises that scale.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <Link
            to="/register?plan=starter"
            className="group w-full sm:w-auto bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-8 py-4 rounded-full font-semibold shadow-xl shadow-violet-500/25 hover:shadow-2xl hover:shadow-violet-500/30 hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2"
          >
            Start Free Trial
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <button className="group w-full sm:w-auto bg-white border-2 border-slate-200 text-slate-800 px-8 py-4 rounded-full font-semibold hover:border-violet-300 hover:bg-violet-50/50 transition-all duration-300 flex items-center justify-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-full flex items-center justify-center">
              <Play className="w-4 h-4 text-violet-600 ml-0.5" />
            </div>
            Watch Demo
          </button>
        </div>

        <p className="text-sm text-slate-500">
          ✓ No credit card &nbsp;&nbsp; ✓ 14-day free trial &nbsp;&nbsp; ✓ Cancel anytime
        </p>
      </div>

      {/* Stats */}
      <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="text-center p-6 bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:border-violet-100 hover:-translate-y-1 transition-all duration-300"
          >
            <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent mb-2">
              {stat.value}
            </div>
            <div className="text-sm text-slate-500 font-medium">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Trust Logos */}
      <div className="mt-20 text-center">
        <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest mb-8">Powering 500+ Enterprises</p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
          {['Exotel', 'Gupshup', 'Wati', 'Plivo', 'Razorpay'].map((logo) => (
            <div key={logo} className="text-xl font-bold text-slate-300 hover:text-violet-400 transition-colors cursor-pointer">
              {logo}
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

// Features Overview Section
export const FeaturesOverviewSection: React.FC = () => {
  const highlights = [
    { icon: Bot, title: 'AI Voice Agents', desc: 'Natural conversations 24/7', color: 'from-violet-500 to-purple-500' },
    { icon: MessageCircle, title: 'Omnichannel', desc: 'WhatsApp, SMS, Email', color: 'from-emerald-500 to-teal-500' },
    { icon: BarChart3, title: 'Smart Analytics', desc: 'Real-time insights', color: 'from-blue-500 to-indigo-500' },
    { icon: Shield, title: 'Enterprise Security', desc: 'SOC 2 compliant', color: 'from-orange-500 to-rose-500' },
  ];

  return (
    <section className="py-20 bg-white border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-6">
          {highlights.map((item, index) => (
            <div key={index} className="group p-8 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-3xl hover:shadow-xl transition-all duration-300 border border-slate-100">
              <div className={`w-14 h-14 bg-gradient-to-br ${item.color} rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                <item.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{item.title}</h3>
              <p className="text-slate-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Platform Section (Differentiators)
interface DifferentiatorsSectionProps {
  differentiators: Differentiator[];
}

export const DifferentiatorsSection: React.FC<DifferentiatorsSectionProps> = ({ differentiators }) => (
  <section id="platform" className="py-24 bg-gradient-to-b from-white to-slate-50">
    <div className="max-w-7xl mx-auto px-6">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 bg-violet-100 text-violet-700 px-4 py-2 rounded-full text-sm font-semibold mb-6">
          <Zap className="w-4 h-4" />
          Why MyLeadX
        </div>
        <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
          Everything you need, <br />
          <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">nothing you don't</span>
        </h2>
        <p className="text-xl text-slate-600">
          Replace 5+ tools with one unified platform built for Indian enterprises.
        </p>
      </div>

      {/* Cards Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {differentiators.map((diff, index) => {
          const Icon = diff.icon;
          const colors = [
            { bg: 'from-violet-500 to-purple-600', light: 'bg-violet-50', border: 'border-violet-100', check: 'text-violet-600' },
            { bg: 'from-emerald-500 to-teal-600', light: 'bg-emerald-50', border: 'border-emerald-100', check: 'text-emerald-600' },
            { bg: 'from-orange-500 to-rose-600', light: 'bg-orange-50', border: 'border-orange-100', check: 'text-orange-600' },
            { bg: 'from-blue-500 to-indigo-600', light: 'bg-blue-50', border: 'border-blue-100', check: 'text-blue-600' },
          ][index % 4];

          return (
            <div
              key={diff.id}
              className={`group p-8 ${colors.light} rounded-3xl border ${colors.border} hover:shadow-2xl hover:-translate-y-2 transition-all duration-300`}
            >
              <div className={`w-14 h-14 bg-gradient-to-br ${colors.bg} rounded-2xl flex items-center justify-center mb-6 shadow-lg`}>
                <Icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{diff.title}</h3>
              <p className="text-slate-600 mb-6 text-sm leading-relaxed">{diff.description}</p>
              <ul className="space-y-3">
                {diff.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-sm text-slate-700">
                    <Check className={`w-5 h-5 ${colors.check} flex-shrink-0`} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  </section>
);

// Solutions Section (Industries)
interface IndustriesSectionProps {
  industries: Industry[];
}

export const IndustriesSection: React.FC<IndustriesSectionProps> = ({ industries }) => (
  <section id="solutions" className="py-24 bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 text-white relative overflow-hidden">
    {/* Background Effects */}
    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')]" />
    <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-violet-500/10 rounded-full blur-3xl" />
    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-3xl" />

    <div className="max-w-7xl mx-auto px-6 relative">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 bg-white/10 text-violet-300 px-4 py-2 rounded-full text-sm font-semibold mb-6 backdrop-blur-sm">
          <Users className="w-4 h-4" />
          Industry Solutions
        </div>
        <h2 className="text-4xl md:text-5xl font-bold mb-6">
          Built for your <span className="text-violet-400">industry</span>
        </h2>
        <p className="text-xl text-slate-400">
          Pre-configured workflows for high-volume lead businesses across India.
        </p>
      </div>

      {/* Industry Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {industries.map((industry) => {
          const Icon = industry.icon;
          return (
            <div
              key={industry.id}
              className="group p-8 bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 hover:bg-white/10 hover:border-violet-500/30 transition-all duration-300"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-violet-500/20">
                <Icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">{industry.title}</h3>
              <p className="text-slate-400 text-sm mb-6">{industry.description}</p>
              <ul className="space-y-3">
                {industry.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3 text-sm text-slate-300">
                    <Check className="w-4 h-4 text-violet-400 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  </section>
);

// Features Section
interface FeaturesSectionProps {
  features: Feature[];
}

export const FeaturesSection: React.FC<FeaturesSectionProps> = ({ features }) => {
  const featureGroups = [
    { title: 'AI & Voice', emoji: '🤖', features: features.slice(0, 4), color: 'violet' },
    { title: 'Messaging', emoji: '💬', features: features.slice(4, 7), color: 'emerald' },
    { title: 'Lead Management', emoji: '📊', features: features.slice(7, 11), color: 'blue' },
    { title: 'Team Tools', emoji: '👥', features: features.slice(11, 13), color: 'orange' },
    { title: 'Marketing', emoji: '🎯', features: features.slice(13, 15), color: 'rose' },
    { title: 'Analytics', emoji: '⚡', features: features.slice(15, 18), color: 'purple' },
    { title: 'Security', emoji: '🔒', features: features.slice(18, 20), color: 'slate' },
    { title: 'Integrations', emoji: '🔗', features: features.slice(20), color: 'indigo' },
  ];

  return (
    <section id="features" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 bg-violet-100 text-violet-700 px-4 py-2 rounded-full text-sm font-semibold mb-6">
            <Sparkles className="w-4 h-4" />
            25+ Features
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
            Powerful features for <br />
            <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">modern sales teams</span>
          </h2>
        </div>

        {/* Feature Groups */}
        <div className="space-y-12">
          {featureGroups.map((group, groupIndex) => (
            <div key={groupIndex} className="bg-slate-50 rounded-3xl p-8">
              <div className="flex items-center gap-4 mb-8">
                <span className="text-3xl">{group.emoji}</span>
                <h3 className="text-xl font-bold text-slate-900">{group.title}</h3>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {group.features.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <div
                      key={feature.id}
                      className="group bg-white p-6 rounded-2xl border border-slate-200 hover:border-violet-300 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                    >
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center mb-4`}>
                        <Icon className={`w-6 h-6 ${feature.iconColor}`} />
                      </div>
                      <h4 className="font-bold text-slate-900 mb-2">{feature.title}</h4>
                      <p className="text-sm text-slate-500">{feature.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// How It Works
interface HowItWorksSectionProps {
  steps: Step[];
}

export const HowItWorksSection: React.FC<HowItWorksSectionProps> = ({ steps }) => (
  <section className="py-24 bg-gradient-to-b from-slate-50 to-white">
    <div className="max-w-7xl mx-auto px-6">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-semibold mb-6">
          <Clock className="w-4 h-4" />
          Quick Setup
        </div>
        <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
          Go live in <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">3 minutes</span>
        </h2>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {steps.map((step, index) => (
          <div key={step.number} className="text-center relative">
            {/* Connection Line */}
            {index < steps.length - 1 && (
              <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-violet-300 to-transparent" />
            )}
            <div className="w-24 h-24 bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-3xl flex items-center justify-center text-4xl font-bold mx-auto mb-8 shadow-xl shadow-violet-500/30 relative z-10">
              {step.number}
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">{step.title}</h3>
            <p className="text-slate-600">{step.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

// Testimonials
export const TestimonialsSection: React.FC = () => {
  const testimonials = [
    {
      quote: "MyLeadX helped us achieve 3x higher conversion rates. The AI agents are incredibly natural.",
      author: "Rahul Mehta",
      role: "VP Sales, TechEd Solutions",
      avatar: "RM",
      gradient: "from-violet-500 to-purple-600"
    },
    {
      quote: "We replaced 5 different tools with MyLeadX. The ROI was visible in the first month.",
      author: "Priya Sharma",
      role: "COO, PropMax Realty",
      avatar: "PS",
      gradient: "from-emerald-500 to-teal-600"
    },
    {
      quote: "The WhatsApp integration alone saves us ₹50,000 monthly. Enterprise features are top-notch.",
      author: "Amit Patel",
      role: "CTO, FinSecure Insurance",
      avatar: "AP",
      gradient: "from-blue-500 to-indigo-600"
    },
  ];

  return (
    <section className="py-24 bg-white border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 px-4 py-2 rounded-full text-sm font-semibold mb-6">
            <Star className="w-4 h-4" />
            Customer Stories
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
            Loved by <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">500+ teams</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((t, index) => (
            <div key={index} className="p-8 bg-slate-50 rounded-3xl border border-slate-100 hover:shadow-xl transition-shadow duration-300">
              <div className="flex gap-1 mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-amber-500 fill-amber-500" />
                ))}
              </div>
              <p className="text-slate-700 text-lg leading-relaxed mb-8">"{t.quote}"</p>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 bg-gradient-to-br ${t.gradient} text-white rounded-full flex items-center justify-center font-bold`}>
                  {t.avatar}
                </div>
                <div>
                  <p className="font-bold text-slate-900">{t.author}</p>
                  <p className="text-sm text-slate-500">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Security Section
export const SecuritySection: React.FC = () => (
  <section className="py-24 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white relative overflow-hidden">
    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')]" />

    <div className="max-w-7xl mx-auto px-6 relative">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <div className="inline-flex items-center gap-2 bg-white/10 text-emerald-400 px-4 py-2 rounded-full text-sm font-semibold mb-6 backdrop-blur-sm">
            <Shield className="w-4 h-4" />
            Enterprise Security
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Bank-grade security <br />
            <span className="text-violet-400">you can trust</span>
          </h2>
          <p className="text-xl text-slate-400 leading-relaxed mb-10">
            Your data is protected with industry-leading security standards and compliance certifications.
          </p>
          <div className="grid sm:grid-cols-2 gap-6">
            {[
              { icon: Shield, title: 'SOC 2 Type II', desc: 'Certified compliant' },
              { icon: Lock, title: 'E2E Encryption', desc: 'Data at rest & transit' },
              { icon: Award, title: 'TRAI Compliant', desc: 'DNC list integration' },
              { icon: Globe, title: '99.9% Uptime', desc: 'Enterprise SLA' },
            ].map((item, idx) => (
              <div key={idx} className="flex gap-4 items-start">
                <div className="w-12 h-12 bg-gradient-to-br from-violet-500/20 to-indigo-500/20 rounded-xl flex items-center justify-center border border-violet-500/20">
                  <item.icon className="w-6 h-6 text-violet-400" />
                </div>
                <div>
                  <p className="font-bold">{item.title}</p>
                  <p className="text-sm text-slate-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm rounded-3xl p-10 border border-white/10">
          <h3 className="text-2xl font-bold mb-8">Enterprise Features</h3>
          <ul className="space-y-4">
            {[
              'Single Sign-On (SSO) with SAML 2.0',
              'Role-based access control (RBAC)',
              'Audit logs & activity monitoring',
              'Custom data retention policies',
              'Dedicated account manager',
              'Priority 24/7 support',
              'Custom SLA agreements',
              'On-premise deployment option',
            ].map((feature, idx) => (
              <li key={idx} className="flex items-center gap-4 text-slate-300">
                <div className="w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-emerald-400" />
                </div>
                {feature}
              </li>
            ))}
          </ul>
          <Link
            to="/register?plan=business"
            className="inline-flex items-center gap-2 mt-10 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-6 py-3 rounded-full font-semibold hover:shadow-lg hover:shadow-violet-500/30 transition-all"
          >
            Contact Enterprise Sales
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  </section>
);

// Pricing Section
interface PricingPreviewSectionProps {
  tiers: PricingTier[];
}

export const PricingPreviewSection: React.FC<PricingPreviewSectionProps> = ({ tiers }) => (
  <section id="pricing" className="py-24 bg-slate-50">
    <div className="max-w-7xl mx-auto px-6">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 bg-violet-100 text-violet-700 px-4 py-2 rounded-full text-sm font-semibold mb-6">
          <TrendingUp className="w-4 h-4" />
          Pricing
        </div>
        <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
          Simple, <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">transparent</span> pricing
        </h2>
        <p className="text-xl text-slate-600">Start free, scale as you grow. No hidden fees.</p>
      </div>

      <div className="grid md:grid-cols-4 gap-6 max-w-6xl mx-auto">
        {tiers.map((tier) => (
          <div
            key={tier.id}
            className={`relative rounded-3xl p-8 transition-all duration-300 hover:-translate-y-2 ${
              tier.isPopular
                ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-2xl shadow-violet-500/30 scale-105 z-10'
                : 'bg-white border border-slate-200 hover:border-violet-200 hover:shadow-xl'
            }`}
          >
            {tier.isPopular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                MOST POPULAR
              </div>
            )}
            <div className="mb-6">
              <h3 className={`text-lg font-bold mb-2 ${tier.isPopular ? 'text-white' : 'text-slate-900'}`}>
                {tier.name}
              </h3>
              <div className={`text-4xl font-bold ${tier.isPopular ? 'text-white' : 'text-slate-900'}`}>
                {tier.price}
                {tier.period && <span className="text-base font-normal opacity-60">{tier.period}</span>}
              </div>
            </div>
            <p className={`text-sm mb-8 ${tier.isPopular ? 'text-violet-200' : 'text-slate-500'}`}>
              {tier.description}
            </p>
            <Link
              to={tier.link}
              className={`block w-full py-4 rounded-full font-semibold text-center transition-all ${
                tier.isPopular
                  ? 'bg-white text-violet-600 hover:bg-violet-50'
                  : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:shadow-lg hover:shadow-violet-500/25'
              }`}
            >
              {tier.id === 'free' ? 'Start Free' : 'Get Started'}
            </Link>
          </div>
        ))}
      </div>

      {/* Enterprise CTA */}
      <div className="mt-16 text-center">
        <div className="inline-flex flex-col sm:flex-row items-center gap-6 bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
          <div className="text-left">
            <p className="font-bold text-slate-900 text-lg">Need a custom plan?</p>
            <p className="text-slate-500">Talk to our enterprise team for custom pricing</p>
          </div>
          <Link
            to="/pricing"
            className="bg-slate-900 text-white px-8 py-4 rounded-full font-semibold hover:bg-slate-800 transition-colors flex items-center gap-2"
          >
            <Headphones className="w-5 h-5" />
            Contact Sales
          </Link>
        </div>
      </div>
    </div>
  </section>
);

// CTA Section
export const CTASection: React.FC = () => (
  <section className="py-24 bg-white">
    <div className="max-w-5xl mx-auto px-6">
      <div className="bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 rounded-[3rem] p-12 md:p-16 text-center text-white relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl" />

        <div className="relative">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to grow your sales?
          </h2>
          <p className="text-xl text-violet-200 mb-10 max-w-2xl mx-auto">
            Join 500+ enterprises transforming their lead conversion with MyLeadX.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register?plan=starter"
              className="group w-full sm:w-auto bg-white text-violet-600 px-8 py-4 rounded-full font-bold hover:bg-violet-50 transition-all flex items-center justify-center gap-2 shadow-xl"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="mailto:enterprise@myleadx.in"
              className="w-full sm:w-auto border-2 border-white/30 text-white px-8 py-4 rounded-full font-semibold hover:bg-white/10 transition-all"
            >
              Talk to Sales
            </a>
          </div>
          <p className="text-violet-300 text-sm mt-8">
            No credit card required · 14-day free trial · Cancel anytime
          </p>
        </div>
      </div>
    </div>
  </section>
);

// Footer
interface FooterProps {
  sections: FooterSection[];
}

export const Footer: React.FC<FooterProps> = ({ sections }) => (
  <footer className="bg-slate-900 text-slate-400 pt-20 pb-8">
    <div className="max-w-7xl mx-auto px-6">
      <div className="grid md:grid-cols-6 gap-8 mb-16">
        {/* Brand */}
        <div className="md:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <Phone className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">MyLeadX</span>
          </div>
          <p className="text-sm leading-relaxed mb-6 max-w-xs">
            The AI-powered platform for enterprise lead conversion. Transform your sales today.
          </p>
          <div className="flex gap-3">
            {['T', 'L', 'Y'].map((letter, i) => (
              <a
                key={i}
                href="#"
                className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-sm font-bold hover:bg-violet-600 transition-colors"
              >
                {letter}
              </a>
            ))}
          </div>
        </div>

        {/* Links */}
        {sections.map((section) => (
          <div key={section.title}>
            <h4 className="font-bold text-white mb-4">{section.title}</h4>
            <ul className="space-y-3 text-sm">
              {section.links.map((link) => (
                <li key={link.label}>
                  {link.href.startsWith('/') ? (
                    <Link to={link.href} className="hover:text-violet-400 transition-colors">{link.label}</Link>
                  ) : (
                    <a href={link.href} className="hover:text-violet-400 transition-colors">{link.label}</a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom */}
      <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-sm">&copy; {new Date().getFullYear()} MyLeadX. All rights reserved.</p>
        <div className="flex items-center gap-6 text-sm">
          <a href="#" className="hover:text-violet-400 transition-colors">Privacy</a>
          <a href="#" className="hover:text-violet-400 transition-colors">Terms</a>
          <a href="#" className="hover:text-violet-400 transition-colors">Security</a>
        </div>
      </div>
    </div>
  </footer>
);
