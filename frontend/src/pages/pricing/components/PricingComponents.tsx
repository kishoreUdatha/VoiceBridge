/**
 * Pricing Page Components - Modern User-Friendly Design
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckIcon,
  XMarkIcon,
  SparklesIcon,
  ArrowRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';
import { Plan, FAQItem, TrustBadge, AddOn, FeatureCategory, PlanCategory, WalletRate } from '../pricing.types';
import { formatPrice, PLAN_TIERS } from '../pricing.constants';
import type { PlanTier } from '../pricing.types';

// =============================================
// NAVIGATION - Matches Landing Page
// =============================================
export const Navigation: React.FC = () => {
  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`fixed w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-white shadow-md' : 'bg-white/95 backdrop-blur-md'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-3">
            <img src="/logo.png" alt="MyLeadX" className="h-9 w-9 rounded-lg" />
            <span className="text-xl font-bold text-gray-900">MyLeadX</span>
          </Link>

          <nav className="hidden md:flex items-center space-x-8">
            <Link to="/#features" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">Features</Link>
            <Link to="/pricing" className="text-blue-600 font-medium">Pricing</Link>
            <Link to="/docs" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">Documentation</Link>
            <Link to="/login" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">Login</Link>
            <Link to="/register" className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors">
              Start Free Trial
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
};

// =============================================
// HERO SECTION
// =============================================
interface HeroSectionProps {
  isAnnual: boolean;
  onToggleBilling: (annual: boolean) => void;
  planCategory: PlanCategory;
  onToggleCategory: (category: PlanCategory) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ isAnnual, onToggleBilling, planCategory, onToggleCategory }) => (
  <div className="pt-16 pb-4">
    <div className="max-w-7xl mx-auto px-4">
      {/* Compact header with title and toggles on same row */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pricing</h1>
          <p className="text-sm text-gray-500">14-day free trial. No credit card required.</p>
        </div>

        {/* Toggles */}
        <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => onToggleCategory('crm-only')}
            className={`px-4 py-2 rounded-md font-medium transition-all text-sm ${
              planCategory === 'crm-only'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            CRM Only
          </button>
          <button
            onClick={() => onToggleCategory('crm-ai-voice')}
            className={`px-4 py-2 rounded-md font-medium transition-all text-sm flex items-center gap-1.5 ${
              planCategory === 'crm-ai-voice'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            CRM + AI Voice
            <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">Popular</span>
          </button>
        </div>

        {/* Billing Toggle */}
        <div className="inline-flex items-center bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => onToggleBilling(false)}
            className={`px-4 py-2 rounded-md font-medium transition-all text-sm ${
              !isAnnual
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => onToggleBilling(true)}
            className={`px-4 py-2 rounded-md font-medium transition-all text-sm flex items-center gap-1.5 ${
              isAnnual
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Yearly
            <span className="bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              Save 20%
            </span>
          </button>
        </div>
        </div>
      </div>
    </div>
  </div>
);

// =============================================
// PRICING CARDS
// =============================================
interface PlanCardProps {
  plan: Plan;
  isAnnual: boolean;
  onSelectPlan: (planId: string) => void;
}

const PlanCard: React.FC<PlanCardProps> = ({ plan, isAnnual, onSelectPlan }) => {
  const isCrmOnly = plan.category === 'crm-only';
  const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;

  return (
    <div
      className={`relative bg-white rounded-xl overflow-hidden flex flex-col transition-all duration-300 hover:shadow-xl ${
        plan.popular
          ? 'ring-2 ring-blue-600 shadow-xl'
          : 'border border-gray-200 shadow-sm hover:border-blue-200'
      }`}
    >
      {/* Popular Badge Header */}
      {plan.popular && (
        <div className="bg-blue-600 text-white text-center py-2 text-xs font-bold tracking-wide">
          MOST POPULAR
        </div>
      )}

      <div className="p-6 flex flex-col flex-1">
        {/* Plan Header */}
        <div className="mb-4">
          <h3 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h3>
          <p className="text-gray-500 text-sm">{plan.subtitle}</p>
        </div>

        {/* Price */}
        <div className="mb-5">
          {plan.customPricing ? (
            <div>
              <span className="text-3xl font-bold text-gray-900">Custom</span>
              <p className="text-gray-500 text-sm">Contact us for pricing</p>
            </div>
          ) : (
            <div>
              <div className="flex items-baseline">
                <span className="text-3xl font-bold text-gray-900">{formatPrice(price)}</span>
                <span className="text-gray-500 ml-1 text-sm">/month</span>
              </div>
              {isAnnual && (
                <p className="text-green-600 text-xs font-medium mt-1">
                  Save {formatPrice((plan.monthlyPrice - plan.annualPrice) * 12)}/year
                </p>
              )}
            </div>
          )}
        </div>

        {/* Key Metrics */}
        <div className="bg-gray-50 rounded-lg p-3 mb-5 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Team Members</span>
            <span className="font-semibold text-gray-900">{plan.metrics.users}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Lead Capacity</span>
            <span className="font-semibold text-gray-900">{plan.metrics.leads}</span>
          </div>
          {!isCrmOnly && (
            <>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">AI Minutes/mo</span>
                <span className="font-semibold text-gray-900">{plan.metrics.minutes}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">AI Agents</span>
                <span className="font-semibold text-gray-900">{plan.metrics.agents}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Phone Numbers</span>
                <span className="font-semibold text-gray-900">{plan.metrics.numbers}</span>
              </div>
            </>
          )}
        </div>

        {/* Features */}
        <ul className="space-y-2 mb-5 flex-1">
          {plan.features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-gray-600 text-sm">{feature}</span>
            </li>
          ))}
        </ul>

        {/* CTA Button */}
        <button
          onClick={() => onSelectPlan(plan.id)}
          className={`w-full py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 text-sm ${
            plan.popular
              ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/30'
              : 'bg-gray-900 text-white hover:bg-gray-800'
          }`}
        >
          {plan.customPricing ? 'Contact Sales' : 'Start Free Trial'}
          <ArrowRightIcon className="w-4 h-4" />
        </button>

        {/* Extra Rate Info */}
        {!isCrmOnly && plan.extraRate > 0 && (
          <p className="text-xs text-gray-400 text-center mt-3">
            Extra AI minutes at {formatPrice(plan.extraRate)}/min
          </p>
        )}
      </div>
    </div>
  );
};

interface PricingCardsProps {
  plans: Plan[];
  isAnnual: boolean;
  onSelectPlan: (planId: string) => void;
}

export const PricingCards: React.FC<PricingCardsProps> = ({ plans, isAnnual, onSelectPlan }) => (
  <div className="max-w-7xl mx-auto px-4 py-6">
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 items-start">
      {plans.map(plan => (
        <PlanCard
          key={plan.id}
          plan={plan}
          isAnnual={isAnnual}
          onSelectPlan={onSelectPlan}
        />
      ))}
    </div>

    {/* Enterprise CTA */}
    <div className="mt-12 text-center">
      <p className="text-gray-600 mb-4">
        Need a custom solution for your enterprise?
      </p>
      <Link
        to="/contact"
        className="inline-flex items-center gap-2 text-blue-600 font-semibold hover:text-blue-700"
      >
        Talk to our sales team
        <ArrowRightIcon className="w-4 h-4" />
      </Link>
    </div>
  </div>
);

// =============================================
// TRUST BADGES
// =============================================
interface TrustBadgesProps {
  badges: TrustBadge[];
}

export const TrustBadges: React.FC<TrustBadgesProps> = ({ badges }) => (
  <div className="bg-gradient-to-r from-blue-600 to-blue-700 py-8">
    <div className="max-w-7xl mx-auto px-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
        {badges.map((badge, idx) => (
          <div key={idx} className="px-4">
            <div className="text-2xl sm:text-3xl font-bold text-white">{badge.value}</div>
            <div className="text-blue-100 text-sm mt-1">{badge.label}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// =============================================
// WALLET RATES
// =============================================
interface WalletRatesSectionProps {
  rates: WalletRate[];
}

export const WalletRatesSection: React.FC<WalletRatesSectionProps> = ({ rates }) => (
  <div className="py-20 bg-white">
    <div className="max-w-6xl mx-auto px-4">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Pay-As-You-Go Rates
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Top up your wallet and pay only for what you use. Transparent pricing with no hidden fees.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {rates.map((rate) => {
          const IconComponent = rate.icon;
          return (
            <div
              key={rate.id}
              className="bg-gray-50 rounded-xl p-6 text-center hover:shadow-lg hover:bg-white transition-all border border-transparent hover:border-blue-100"
            >
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                <IconComponent className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">{rate.name}</h3>
              <p className="text-xs text-gray-500 mb-3 min-h-[32px]">{rate.description}</p>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-2xl font-bold text-blue-600">
                  {formatPrice(rate.rate)}
                </span>
                <span className="text-sm text-gray-500">{rate.unit}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);

// =============================================
// COMPARISON TOGGLE
// =============================================
interface ComparisonToggleProps {
  showComparison: boolean;
  onToggle: () => void;
}

export const ComparisonToggle: React.FC<ComparisonToggleProps> = ({ showComparison, onToggle }) => (
  <div className="max-w-7xl mx-auto px-4 py-8">
    <button
      onClick={onToggle}
      className="w-full py-4 bg-gray-50 hover:bg-gray-100 rounded-xl text-center text-blue-600 font-semibold flex items-center justify-center gap-2 transition-colors"
    >
      {showComparison ? 'Hide' : 'Show'} Full Feature Comparison
      {showComparison ? (
        <ChevronUpIcon className="w-5 h-5" />
      ) : (
        <ChevronDownIcon className="w-5 h-5" />
      )}
    </button>
  </div>
);

// =============================================
// CATEGORY COMPARISON TABLE
// =============================================
interface CategoryComparisonTableProps {
  categories: FeatureCategory[];
}

export const CategoryComparisonTable: React.FC<CategoryComparisonTableProps> = ({ categories }) => (
  <div className="max-w-7xl mx-auto px-4 pb-16">
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-900 text-white">
              <th className="px-6 py-5 text-left text-sm font-bold sticky left-0 bg-gray-900 min-w-[220px]">Feature</th>
              <th className="px-4 py-5 text-center text-sm font-bold min-w-[100px]">Starter</th>
              <th className="px-4 py-5 text-center text-sm font-bold bg-blue-600 min-w-[100px]">Growth</th>
              <th className="px-4 py-5 text-center text-sm font-bold min-w-[100px]">Business</th>
              <th className="px-4 py-5 text-center text-sm font-bold min-w-[100px]">Enterprise</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category, catIdx) => (
              <React.Fragment key={catIdx}>
                <tr className="bg-gray-100">
                  <td colSpan={5} className="px-6 py-3 text-sm font-bold text-gray-900">
                    {category.category}
                  </td>
                </tr>
                {category.features.map((feature, idx) => (
                  <tr key={`${catIdx}-${idx}`} className="border-b border-gray-100 hover:bg-blue-50/50 transition-colors">
                    <td className="px-6 py-3 text-sm text-gray-700 sticky left-0 bg-white">
                      {feature.name}
                    </td>
                    {PLAN_TIERS.map((plan: PlanTier) => (
                      <td key={plan} className={`px-4 py-3 text-center ${plan === 'growth' ? 'bg-blue-50/50' : ''}`}>
                        {typeof feature[plan] === 'boolean' ? (
                          feature[plan] ? (
                            <CheckIcon className="w-5 h-5 text-green-500 mx-auto" />
                          ) : (
                            <XMarkIcon className="w-5 h-5 text-gray-300 mx-auto" />
                          )
                        ) : (
                          <span className="text-gray-900 font-medium text-sm">{feature[plan]}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

// =============================================
// ADD-ONS SECTION
// =============================================
interface AddOnsSectionProps {
  addOns: AddOn[];
}

export const AddOnsSection: React.FC<AddOnsSectionProps> = ({ addOns }) => (
  <div className="bg-gray-50 py-20">
    <div className="max-w-6xl mx-auto px-4">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Add-Ons & Extras
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Expand your plan with additional capacity and features as your business grows
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {addOns.map((addon) => (
          <div
            key={addon.id}
            className={`relative bg-white rounded-xl border p-6 hover:shadow-lg transition-all ${
              addon.popular ? 'border-blue-200 ring-1 ring-blue-100' : 'border-gray-200'
            }`}
          >
            {addon.popular && (
              <span className="absolute -top-2.5 left-4 bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                Popular
              </span>
            )}
            <h3 className="font-bold text-gray-900 mb-2">{addon.name}</h3>
            <p className="text-sm text-gray-500 mb-4">{addon.description}</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-gray-900">{formatPrice(addon.price)}</span>
              <span className="text-sm text-gray-500">{addon.unit}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// =============================================
// FAQ SECTION
// =============================================
interface FAQSectionProps {
  items: FAQItem[];
}

export const FAQSection: React.FC<FAQSectionProps> = ({ items }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="py-20 bg-white">
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-gray-600">Everything you need to know about our pricing</p>
        </div>

        <div className="space-y-4">
          {items.map((faq, idx) => (
            <div
              key={idx}
              className="bg-gray-50 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                className="w-full px-6 py-5 text-left flex items-center justify-between hover:bg-gray-100 transition-colors"
              >
                <span className="font-semibold text-gray-900 pr-4">{faq.q}</span>
                {openIndex === idx ? (
                  <ChevronUpIcon className="w-5 h-5 text-gray-500 flex-shrink-0" />
                ) : (
                  <ChevronDownIcon className="w-5 h-5 text-gray-500 flex-shrink-0" />
                )}
              </button>
              {openIndex === idx && (
                <div className="px-6 pb-5">
                  <p className="text-gray-600 leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// =============================================
// CTA SECTION
// =============================================
interface CTASectionProps {
  onSelectPlan: (planId: string) => void;
}

export const CTASection: React.FC<CTASectionProps> = ({ onSelectPlan }) => (
  <div className="py-20 bg-gradient-to-br from-blue-600 to-blue-800">
    <div className="max-w-4xl mx-auto px-4 text-center">
      <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
        Ready to Transform Your Sales?
      </h2>
      <p className="text-blue-100 mb-8 text-lg max-w-2xl mx-auto">
        Join 500+ businesses using MyLeadX to automate calls and close more deals.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={() => onSelectPlan('scale')}
          className="px-8 py-4 bg-white text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition-all shadow-xl flex items-center justify-center gap-2"
        >
          Start 14-Day Free Trial
          <ArrowRightIcon className="w-5 h-5" />
        </button>
        <button
          onClick={() => onSelectPlan('enterprise')}
          className="px-8 py-4 bg-blue-700/50 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all border border-white/20 flex items-center justify-center gap-2"
        >
          Talk to Sales
        </button>
      </div>
      <p className="text-blue-200 text-sm mt-6">No credit card required</p>
    </div>
  </div>
);

// =============================================
// FOOTER
// =============================================
export const Footer: React.FC = () => (
  <footer className="bg-gray-900 text-gray-400 py-12">
    <div className="max-w-7xl mx-auto px-4">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="MyLeadX" className="h-8 w-8 rounded-lg" />
          <span className="text-white font-bold">MyLeadX</span>
        </div>
        <p className="text-sm text-center">
          All prices are in INR and exclude GST (18%)
        </p>
        <div className="flex items-center gap-6 text-sm">
          <Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy</Link>
          <Link to="/terms-of-service" className="hover:text-white transition-colors">Terms</Link>
          <a href="mailto:sales@myleadx.ai" className="hover:text-white transition-colors">Contact</a>
        </div>
      </div>
      <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm">
        <p>&copy; {new Date().getFullYear()} MyLeadX. All rights reserved.</p>
      </div>
    </div>
  </footer>
);
