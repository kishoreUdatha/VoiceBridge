/**
 * Landing Page - Clean Modern Design
 */

import {
  Navigation,
  HeroSection,
  FeaturesOverviewSection,
  DifferentiatorsSection,
  IndustriesSection,
  FeaturesSection,
  HowItWorksSection,
  TestimonialsSection,
  SecuritySection,
  PricingPreviewSection,
  CTASection,
  Footer,
} from './components';
import {
  STATS,
  DIFFERENTIATORS,
  INDUSTRIES,
  FEATURES,
  PRICING_TIERS,
  STEPS,
  FOOTER_SECTIONS,
} from './landing.constants';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <HeroSection stats={STATS} />
      <FeaturesOverviewSection />
      <DifferentiatorsSection differentiators={DIFFERENTIATORS} />
      <IndustriesSection industries={INDUSTRIES} />
      <FeaturesSection features={FEATURES} />
      <HowItWorksSection steps={STEPS} />
      <TestimonialsSection />
      <SecuritySection />
      <PricingPreviewSection tiers={PRICING_TIERS} />
      <CTASection />
      <Footer sections={FOOTER_SECTIONS} />
    </div>
  );
}
