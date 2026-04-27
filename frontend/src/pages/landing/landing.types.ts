/**
 * Landing Page Types
 */

export interface Stat {
  value: string;
  label: string;
}

export interface Differentiator {
  id: string;
  icon: string;
  title: string;
  description: string;
  features: string[];
}

export interface Industry {
  icon: string;
  name: string;
  description: string;
}

export interface Feature {
  icon: string;
  title: string;
  description: string;
}

export interface PricingTier {
  id: string;
  name: string;
  price: string;
  description: string;
  highlighted?: boolean;
  link: string;
}

export interface Step {
  title: string;
  description: string;
}

export interface FooterSection {
  title: string;
  links: { label: string; href: string }[];
}
