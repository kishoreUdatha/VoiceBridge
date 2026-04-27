/**
 * Landing Page - Premium SaaS Design (Zoho-style)
 */

import { useEffect } from 'react';
import {
  Navigation,
  HeroSection,
  FeaturesSection,
  ProductDemoSection,
  IndustriesSection,
  AISection,
  IntegrationsSection,
  TestimonialsSection,
  PricingSection,
  CTASection,
  Footer,
} from './components';

export default function LandingPage() {
  useEffect(() => {
    // Scroll to top on mount
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <Navigation />
      <HeroSection />
      <FeaturesSection />
      <ProductDemoSection />
      <IndustriesSection />
      <AISection />
      <IntegrationsSection />
      <TestimonialsSection />
      <PricingSection />
      <CTASection />
      <Footer />
    </div>
  );
}
