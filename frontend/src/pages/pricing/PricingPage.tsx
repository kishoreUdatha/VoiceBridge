/**
 * Pricing Page
 * Displays pricing plans with feature comparison
 */

import { usePricing } from './hooks';
import {
  Navigation,
  HeroSection,
  PricingCards,
  TrustBadges,
  ComparisonToggle,
  CategoryComparisonTable,
  AddOnsSection,
  FAQSection,
  CTASection,
  Footer,
} from './components';
import { PLANS, FEATURE_CATEGORIES, FAQ_ITEMS, TRUST_BADGES, ADD_ONS } from './pricing.constants';

export default function PricingPage() {
  const {
    isAnnual,
    showComparison,
    toggleBilling,
    toggleComparison,
    handleSelectPlan,
  } = usePricing();

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />

      <HeroSection isAnnual={isAnnual} onToggleBilling={toggleBilling} />

      <PricingCards
        plans={PLANS}
        isAnnual={isAnnual}
        onSelectPlan={handleSelectPlan}
      />

      <TrustBadges badges={TRUST_BADGES} />

      <ComparisonToggle
        showComparison={showComparison}
        onToggle={toggleComparison}
      />

      {showComparison && <CategoryComparisonTable categories={FEATURE_CATEGORIES} />}

      <AddOnsSection addOns={ADD_ONS} />

      <FAQSection items={FAQ_ITEMS} />

      <CTASection onSelectPlan={handleSelectPlan} />

      <Footer />
    </div>
  );
}
