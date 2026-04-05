/**
 * Landing Page
 * Premium Enterprise marketing homepage for VoiceBridge
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
  DocumentationSection,
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
    <div className="min-h-screen bg-white antialiased">
      <Navigation />
      <HeroSection stats={STATS} />
      <FeaturesOverviewSection />
      <DifferentiatorsSection differentiators={DIFFERENTIATORS} />
      <IndustriesSection industries={INDUSTRIES} />
      <FeaturesSection features={FEATURES} />
      <HowItWorksSection steps={STEPS} />
      <DocumentationSection />
      <TestimonialsSection />
      <SecuritySection />
      <PricingPreviewSection tiers={PRICING_TIERS} />
      <CTASection />
      <Footer sections={FOOTER_SECTIONS} />
    </div>
  );
}
