/**
 * Pricing Page Components
 */

import React from 'react';
import { Link } from 'react-router-dom';
import {
  CheckIcon,
  XMarkIcon,
  PhoneIcon,
  ArrowLeftIcon,
  SparklesIcon,
  UserGroupIcon,
  ChartBarIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';
import { Plan, SimplePlanFeature, FAQItem, TrustBadge, PlanTier, AddOn, FeatureCategory } from '../pricing.types';
import { formatPrice, PLAN_TIERS } from '../pricing.constants';

// Navigation Component
export const Navigation: React.FC = () => (
  <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center h-16">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20">
            <PhoneIcon className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">VoiceCRM</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-1 text-slate-600 hover:text-slate-900 text-sm">
            <ArrowLeftIcon className="w-4 h-4" />
            Home
          </Link>
          <Link to="/login" className="text-slate-600 hover:text-slate-900 font-medium text-sm">
            Sign In
          </Link>
          <Link
            to="/register"
            className="bg-gradient-to-r from-primary-500 to-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:from-primary-600 hover:to-primary-700 transition-all shadow-lg shadow-primary-500/20 text-sm"
          >
            Get Started Free
          </Link>
        </div>
      </div>
    </div>
  </nav>
);

// Hero Section Component
interface HeroSectionProps {
  isAnnual: boolean;
  onToggleBilling: (annual: boolean) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ isAnnual, onToggleBilling }) => (
  <div className="relative pt-24 pb-20 overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-primary-900"></div>
    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50"></div>

    <div className="relative max-w-7xl mx-auto px-4 text-center">
      <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-6">
        <StarIcon className="w-4 h-4 text-yellow-400" />
        <span className="text-white/90 text-sm font-medium">14-Day Free Trial on All Plans</span>
      </div>

      <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
        Simple, Transparent
        <span className="block bg-gradient-to-r from-primary-400 to-cyan-400 bg-clip-text text-transparent">
          Pricing
        </span>
      </h1>

      <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-10">
        CRM + AI Voice Agent in one platform. Choose the plan that fits your team.
      </p>

      {/* Billing Toggle */}
      <div className="inline-flex items-center gap-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-2">
        <button
          onClick={() => onToggleBilling(false)}
          className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${
            !isAnnual
              ? 'bg-white text-slate-900 shadow-lg'
              : 'text-white/70 hover:text-white'
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => onToggleBilling(true)}
          className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
            isAnnual
              ? 'bg-white text-slate-900 shadow-lg'
              : 'text-white/70 hover:text-white'
          }`}
        >
          Annual
          <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
            -20%
          </span>
        </button>
      </div>
    </div>
  </div>
);

// Plan Card Component
interface PlanCardProps {
  plan: Plan;
  isAnnual: boolean;
  onSelectPlan: (planId: string) => void;
}

export const PlanCard: React.FC<PlanCardProps> = ({ plan, isAnnual, onSelectPlan }) => {
  const IconComponent = plan.icon;

  return (
    <div
      className={`relative bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${
        plan.popular ? 'ring-2 ring-primary-500 lg:scale-[1.02]' : 'border border-slate-200'
      }`}
    >
      {/* Popular Badge */}
      {plan.popular && (
        <div className="bg-primary-500 text-white text-center py-2 text-sm font-semibold">
          MOST POPULAR
        </div>
      )}

      <div className="p-6 flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${plan.color} flex items-center justify-center`}>
            <IconComponent className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
            <p className="text-xs text-slate-500">{plan.subtitle}</p>
          </div>
        </div>

        {/* Price */}
        <div className="mb-5 pb-5 border-b-2 border-slate-100">
          {plan.customPricing ? (
            <div>
              <div className="text-4xl font-extrabold text-slate-900">Custom</div>
              <p className="text-sm text-slate-500 mt-1">Contact for pricing</p>
            </div>
          ) : (
            <div>
              <div className="flex items-baseline">
                <span className="text-4xl font-extrabold text-slate-900">
                  {formatPrice(isAnnual ? plan.annualPrice : plan.monthlyPrice)}
                </span>
                <span className="text-slate-500 ml-1">/month</span>
              </div>
              {isAnnual && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-slate-400 line-through">
                    {formatPrice(plan.monthlyPrice)}
                  </span>
                  <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded">
                    SAVE 20%
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Key Limits */}
        <div className="space-y-3 mb-5 pb-5 border-b-2 border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 flex items-center gap-2">
              <ClockIcon className="w-4 h-4 text-primary-500" />
              Voice Minutes
            </span>
            <span className="font-bold text-slate-900">{plan.metrics.minutes}/mo</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 flex items-center gap-2">
              <PhoneIcon className="w-4 h-4 text-primary-500" />
              Phone Numbers
            </span>
            <span className="font-bold text-slate-900">{plan.metrics.numbers}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 flex items-center gap-2">
              <SparklesIcon className="w-4 h-4 text-primary-500" />
              AI Voice Agents
            </span>
            <span className="font-bold text-slate-900">{plan.metrics.agents}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 flex items-center gap-2">
              <UserGroupIcon className="w-4 h-4 text-primary-500" />
              Team Members
            </span>
            <span className="font-bold text-slate-900">{plan.metrics.users}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 flex items-center gap-2">
              <ChartBarIcon className="w-4 h-4 text-primary-500" />
              Leads Capacity
            </span>
            <span className="font-bold text-slate-900">{plan.metrics.leads}</span>
          </div>
        </div>

        {/* Features */}
        <div className="flex-1 mb-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Features Included:</p>
          <ul className="space-y-2">
            {plan.features.map((feature, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <CheckIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="text-sm text-slate-700">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA Button */}
        <button
          onClick={() => onSelectPlan(plan.id)}
          className={`w-full py-3.5 px-4 rounded-xl font-bold text-base transition-all ${
            plan.popular
              ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-lg shadow-primary-500/30'
              : plan.id === 'enterprise'
              ? 'bg-slate-800 text-white hover:bg-slate-900'
              : 'bg-slate-900 text-white hover:bg-slate-800'
          }`}
        >
          {plan.id === 'enterprise' ? 'Contact Sales' : 'Start Free Trial'}
        </button>

        {/* Extra Rate */}
        <p className="text-xs text-slate-400 text-center mt-3">
          Extra minutes: <span className="font-semibold text-slate-600">₹{plan.extraRate}/min</span>
        </p>
      </div>
    </div>
  );
};

// Pricing Cards Grid Component
interface PricingCardsProps {
  plans: Plan[];
  isAnnual: boolean;
  onSelectPlan: (planId: string) => void;
}

export const PricingCards: React.FC<PricingCardsProps> = ({ plans, isAnnual, onSelectPlan }) => (
  <div className="max-w-7xl mx-auto px-4 -mt-10 relative z-10 pb-20">
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
      {plans.map(plan => (
        <PlanCard
          key={plan.id}
          plan={plan}
          isAnnual={isAnnual}
          onSelectPlan={onSelectPlan}
        />
      ))}
    </div>
  </div>
);

// Trust Badges Component
interface TrustBadgesProps {
  badges: TrustBadge[];
}

export const TrustBadges: React.FC<TrustBadgesProps> = ({ badges }) => (
  <div className="bg-white border-y border-slate-200 py-12">
    <div className="max-w-7xl mx-auto px-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        {badges.map((badge, idx) => (
          <div key={idx}>
            <div className="text-3xl font-bold text-slate-900">{badge.value}</div>
            <div className="text-sm text-slate-500 mt-1">{badge.label}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Comparison Toggle Component
interface ComparisonToggleProps {
  showComparison: boolean;
  onToggle: () => void;
}

export const ComparisonToggle: React.FC<ComparisonToggleProps> = ({ showComparison, onToggle }) => (
  <div className="max-w-7xl mx-auto px-4 py-12">
    <button
      onClick={onToggle}
      className="w-full py-4 text-center text-primary-600 font-semibold hover:text-primary-700 flex items-center justify-center gap-2"
    >
      <span>{showComparison ? 'Hide' : 'Show'} Full Feature Comparison</span>
      <svg className={`w-5 h-5 transition-transform ${showComparison ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  </div>
);

// Feature Comparison Table Component
interface ComparisonTableProps {
  features: SimplePlanFeature[];
}

export const ComparisonTable: React.FC<ComparisonTableProps> = ({ features }) => (
  <div className="max-w-6xl mx-auto px-4 pb-16">
    <h3 className="text-2xl font-bold text-slate-900 text-center mb-8">Compare All Features</h3>
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-900 text-white">
              <th className="px-6 py-5 text-left text-sm font-bold sticky left-0 bg-slate-900 min-w-[200px]">Feature</th>
              <th className="px-6 py-5 text-center text-sm font-bold min-w-[130px]">
                <div>Starter</div>
                <div className="text-xs font-normal text-slate-300 mt-1">₹2,999/mo</div>
              </th>
              <th className="px-6 py-5 text-center text-sm font-bold bg-primary-600 min-w-[130px]">
                <div className="flex items-center justify-center gap-1">
                  Growth
                  <span className="bg-white text-primary-600 text-[10px] px-1.5 py-0.5 rounded font-bold">POPULAR</span>
                </div>
                <div className="text-xs font-normal text-primary-100 mt-1">₹7,999/mo</div>
              </th>
              <th className="px-6 py-5 text-center text-sm font-bold min-w-[130px]">
                <div>Business</div>
                <div className="text-xs font-normal text-slate-300 mt-1">₹19,999/mo</div>
              </th>
              <th className="px-6 py-5 text-center text-sm font-bold min-w-[130px]">
                <div>Enterprise</div>
                <div className="text-xs font-normal text-slate-300 mt-1">Custom</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {features.map((feature, idx) => (
              <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-blue-50 transition-colors`}>
                <td className={`px-6 py-4 text-sm text-slate-800 font-semibold sticky left-0 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                  {feature.name}
                </td>
                {PLAN_TIERS.map((plan: PlanTier) => (
                  <td
                    key={plan}
                    className={`px-6 py-4 text-center ${plan === 'growth' ? 'bg-primary-50' : ''}`}
                  >
                    {typeof feature[plan] === 'boolean' ? (
                      feature[plan] ? (
                        <div className="flex justify-center">
                          <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckIcon className="w-4 h-4 text-green-600" />
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-center">
                          <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center">
                            <XMarkIcon className="w-4 h-4 text-slate-400" />
                          </div>
                        </div>
                      )
                    ) : (
                      <span className="text-slate-900 font-bold text-sm">{feature[plan]}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

// FAQ Section Component
interface FAQSectionProps {
  items: FAQItem[];
}

export const FAQSection: React.FC<FAQSectionProps> = ({ items }) => (
  <div className="bg-slate-100 py-20">
    <div className="max-w-3xl mx-auto px-4">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-slate-900 mb-4">
          Frequently Asked Questions
        </h2>
        <p className="text-slate-600">Everything you need to know about our pricing</p>
      </div>

      <div className="space-y-4">
        {items.map((faq, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-2">{faq.q}</h3>
            <p className="text-slate-600 text-sm leading-relaxed">{faq.a}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// CTA Section Component
interface CTASectionProps {
  onSelectPlan: (planId: string) => void;
}

export const CTASection: React.FC<CTASectionProps> = ({ onSelectPlan }) => (
  <div className="relative py-20 overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-br from-primary-600 to-primary-800"></div>
    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50"></div>

    <div className="relative max-w-4xl mx-auto px-4 text-center">
      <ChatBubbleLeftRightIcon className="w-16 h-16 text-white/20 mx-auto mb-6" />
      <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
        Ready to transform your sales?
      </h2>
      <p className="text-primary-100 mb-8 text-lg max-w-2xl mx-auto">
        Join 500+ companies using VoiceCRM to automate calls and close more deals.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={() => onSelectPlan('growth')}
          className="px-8 py-4 bg-white text-primary-600 font-semibold rounded-xl hover:bg-primary-50 transition-all shadow-xl"
        >
          Start 14-Day Free Trial
        </button>
        <button
          onClick={() => onSelectPlan('enterprise')}
          className="px-8 py-4 bg-primary-700/50 text-white font-semibold rounded-xl hover:bg-primary-700 transition-all border border-white/20"
        >
          Talk to Sales
        </button>
      </div>
      <p className="text-primary-200 text-sm mt-6">No credit card required</p>
    </div>
  </div>
);

// Add-Ons Section Component
interface AddOnsSectionProps {
  addOns: AddOn[];
}

export const AddOnsSection: React.FC<AddOnsSectionProps> = ({ addOns }) => (
  <div className="bg-white py-16">
    <div className="max-w-6xl mx-auto px-4">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-slate-900 mb-4">
          Add-Ons & Extras
        </h2>
        <p className="text-slate-600 max-w-2xl mx-auto">
          Expand your plan with additional capacity and features as your business grows
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {addOns.map((addon) => (
          <div
            key={addon.id}
            className={`relative bg-white rounded-xl border ${
              addon.popular ? 'border-primary-300 ring-1 ring-primary-200' : 'border-slate-200'
            } p-5 hover:shadow-lg transition-all`}
          >
            {addon.popular && (
              <span className="absolute -top-2.5 left-4 bg-primary-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                Popular
              </span>
            )}
            <h3 className="font-bold text-slate-900 mb-1">{addon.name}</h3>
            <p className="text-sm text-slate-500 mb-3">{addon.description}</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-slate-900">
                {formatPrice(addon.price)}
              </span>
              <span className="text-sm text-slate-500">{addon.unit}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Category-based Comparison Table Component
interface CategoryComparisonTableProps {
  categories: FeatureCategory[];
}

export const CategoryComparisonTable: React.FC<CategoryComparisonTableProps> = ({ categories }) => (
  <div className="max-w-6xl mx-auto px-4 pb-16">
    <h3 className="text-2xl font-bold text-slate-900 text-center mb-8">Compare All Features</h3>
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-900 text-white">
              <th className="px-6 py-5 text-left text-sm font-bold sticky left-0 bg-slate-900 min-w-[240px]">Feature</th>
              <th className="px-6 py-5 text-center text-sm font-bold min-w-[120px]">
                <div>Starter</div>
                <div className="text-xs font-normal text-slate-300 mt-1">₹2,999/mo</div>
              </th>
              <th className="px-6 py-5 text-center text-sm font-bold bg-primary-600 min-w-[120px]">
                <div className="flex items-center justify-center gap-1">
                  Growth
                  <span className="bg-white text-primary-600 text-[10px] px-1.5 py-0.5 rounded font-bold">POPULAR</span>
                </div>
                <div className="text-xs font-normal text-primary-100 mt-1">₹7,999/mo</div>
              </th>
              <th className="px-6 py-5 text-center text-sm font-bold min-w-[120px]">
                <div>Business</div>
                <div className="text-xs font-normal text-slate-300 mt-1">₹19,999/mo</div>
              </th>
              <th className="px-6 py-5 text-center text-sm font-bold min-w-[120px]">
                <div>Enterprise</div>
                <div className="text-xs font-normal text-slate-300 mt-1">Custom</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category, catIdx) => (
              <React.Fragment key={catIdx}>
                {/* Category Header */}
                <tr className="bg-slate-800">
                  <td colSpan={5} className="px-6 py-3 text-sm font-bold text-white">
                    {category.category}
                  </td>
                </tr>
                {/* Category Features */}
                {category.features.map((feature, idx) => (
                  <tr key={`${catIdx}-${idx}`} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-blue-50 transition-colors`}>
                    <td className={`px-6 py-3 text-sm text-slate-700 sticky left-0 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-blue-50`}>
                      {feature.name}
                    </td>
                    {PLAN_TIERS.map((plan: PlanTier) => (
                      <td
                        key={plan}
                        className={`px-6 py-3 text-center ${plan === 'growth' ? 'bg-primary-50/50' : ''}`}
                      >
                        {typeof feature[plan] === 'boolean' ? (
                          feature[plan] ? (
                            <div className="flex justify-center">
                              <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                                <CheckIcon className="w-3 h-3 text-green-600" />
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-center">
                              <div className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center">
                                <XMarkIcon className="w-3 h-3 text-slate-400" />
                              </div>
                            </div>
                          )
                        ) : (
                          <span className="text-slate-800 font-semibold text-sm">{feature[plan]}</span>
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

// Footer Component
export const Footer: React.FC = () => (
  <div className="bg-slate-900 text-slate-400 py-8 px-4 text-center text-sm">
    <p>All prices are in INR and exclude GST (18%)</p>
    <p className="mt-2">
      Questions? Email us at{' '}
      <a href="mailto:support@voicecrm.com" className="text-primary-400 hover:text-primary-300">
        support@voicecrm.com
      </a>
    </p>
  </div>
);
