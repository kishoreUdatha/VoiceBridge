/**
 * Branding Context
 * Provides white-label branding throughout the app
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getTenantIdentifier } from '../utils/tenant';
import api from '../services/api';

export interface BrandingConfig {
  organizationId?: string;
  brandName: string;
  logo: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  favicon: string | null;
  loginBgImage: string | null;
  footerText: string | null;
  hidePoweredBy: boolean;
  isDefault: boolean;
  isLoading: boolean;
}

const defaultBranding: BrandingConfig = {
  brandName: 'MyLeadX',
  logo: null,
  primaryColor: '#6366f1',
  secondaryColor: '#4f46e5',
  accentColor: '#10b981',
  favicon: null,
  loginBgImage: null,
  footerText: null,
  hidePoweredBy: false,
  isDefault: true,
  isLoading: true,
};

const BrandingContext = createContext<BrandingConfig>(defaultBranding);

interface BrandingProviderProps {
  children: ReactNode;
}

export function BrandingProvider({ children }: BrandingProviderProps) {
  const [branding, setBranding] = useState<BrandingConfig>(defaultBranding);

  useEffect(() => {
    async function fetchBranding() {
      const tenant = getTenantIdentifier();

      if (!tenant) {
        // No tenant, use default branding
        setBranding({ ...defaultBranding, isLoading: false });
        return;
      }

      try {
        const response = await api.get(`/branding/${tenant}`);
        const data = response.data.data;

        const newBranding: BrandingConfig = {
          organizationId: data.organizationId,
          brandName: data.brandName || 'MyLeadX',
          logo: data.logo,
          primaryColor: data.primaryColor || '#6366f1',
          secondaryColor: data.secondaryColor || '#4f46e5',
          accentColor: data.accentColor || '#10b981',
          favicon: data.favicon,
          loginBgImage: data.loginBgImage,
          footerText: data.footerText,
          hidePoweredBy: data.hidePoweredBy || false,
          isDefault: data.isDefault || false,
          isLoading: false,
        };

        setBranding(newBranding);

        // Apply CSS custom properties
        applyBrandingStyles(newBranding);

        // Update document title
        document.title = newBranding.brandName;

        // Update favicon if provided
        if (newBranding.favicon) {
          updateFavicon(newBranding.favicon);
        }
      } catch (error) {
        console.error('Failed to fetch branding:', error);
        setBranding({ ...defaultBranding, isLoading: false });
      }
    }

    fetchBranding();
  }, []);

  return (
    <BrandingContext.Provider value={branding}>
      {children}
    </BrandingContext.Provider>
  );
}

/**
 * Hook to access branding configuration
 */
export function useBranding(): BrandingConfig {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
}

/**
 * Apply branding colors as CSS custom properties
 */
function applyBrandingStyles(branding: BrandingConfig) {
  const root = document.documentElement;

  // Convert hex to RGB for Tailwind compatibility
  const primaryRgb = hexToRgb(branding.primaryColor);
  const secondaryRgb = hexToRgb(branding.secondaryColor);
  const accentRgb = hexToRgb(branding.accentColor);

  if (primaryRgb) {
    root.style.setProperty('--color-primary', branding.primaryColor);
    root.style.setProperty('--color-primary-rgb', `${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}`);
  }

  if (secondaryRgb) {
    root.style.setProperty('--color-secondary', branding.secondaryColor);
    root.style.setProperty('--color-secondary-rgb', `${secondaryRgb.r}, ${secondaryRgb.g}, ${secondaryRgb.b}`);
  }

  if (accentRgb) {
    root.style.setProperty('--color-accent', branding.accentColor);
    root.style.setProperty('--color-accent-rgb', `${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}`);
  }
}

/**
 * Update the favicon dynamically
 */
function updateFavicon(faviconUrl: string) {
  // Remove existing favicons
  const existingLinks = document.querySelectorAll("link[rel*='icon']");
  existingLinks.forEach(link => link.remove());

  // Add new favicon
  const link = document.createElement('link');
  link.rel = 'icon';
  link.href = faviconUrl;
  document.head.appendChild(link);
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

export default BrandingContext;
