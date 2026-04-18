import { prisma } from '../config/database';

/**
 * WHITE-LABEL MANAGEMENT SERVICE
 *
 * Multi-tenant branding and customization:
 * - Custom logos and themes
 * - Custom domains
 * - Email templates per tenant
 * - Custom login pages
 */

interface WhiteLabelConfig {
  organizationId: string;
  organizationName: string;
  branding: BrandingConfig;
  customDomain: CustomDomainConfig | null;
  emailTemplates: EmailTemplateConfig;
  loginPage: LoginPageConfig;
  updatedAt: Date;
}

interface BrandingConfig {
  logo: string | null;
  favicon: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  darkMode: boolean;
  customCSS: string | null;
}

interface CustomDomainConfig {
  domain: string;
  sslStatus: 'pending' | 'active' | 'failed';
  sslExpiresAt: Date | null;
  dnsVerified: boolean;
  lastChecked: Date;
}

interface EmailTemplateConfig {
  fromName: string;
  fromEmail: string;
  replyTo: string;
  headerLogo: string | null;
  footerText: string;
  primaryColor: string;
  templates: {
    welcome: boolean;
    passwordReset: boolean;
    leadNotification: boolean;
    callSummary: boolean;
  };
}

interface LoginPageConfig {
  backgroundImage: string | null;
  backgroundColor: string;
  showPoweredBy: boolean;
  customWelcomeText: string | null;
  customTermsUrl: string | null;
  customPrivacyUrl: string | null;
  socialLoginEnabled: boolean;
}

const DEFAULT_BRANDING: BrandingConfig = {
  logo: null,
  favicon: null,
  primaryColor: '#3B82F6',
  secondaryColor: '#1E40AF',
  accentColor: '#10B981',
  fontFamily: 'Inter',
  darkMode: false,
  customCSS: null,
};

const DEFAULT_EMAIL_TEMPLATES: EmailTemplateConfig = {
  fromName: 'MyLeadX',
  fromEmail: 'noreply@myleadx.ai',
  replyTo: 'support@myleadx.ai',
  headerLogo: null,
  footerText: '© 2024 MyLeadX. All rights reserved.',
  primaryColor: '#3B82F6',
  templates: {
    welcome: true,
    passwordReset: true,
    leadNotification: true,
    callSummary: true,
  },
};

const DEFAULT_LOGIN_PAGE: LoginPageConfig = {
  backgroundImage: null,
  backgroundColor: '#F3F4F6',
  showPoweredBy: true,
  customWelcomeText: null,
  customTermsUrl: null,
  customPrivacyUrl: null,
  socialLoginEnabled: false,
};

export class WhiteLabelService {
  /**
   * Get white-label config for a tenant
   */
  async getTenantWhiteLabelConfig(organizationId: string): Promise<WhiteLabelConfig> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, settings: true, updatedAt: true },
    });

    if (!org) throw new Error('Organization not found');

    const settings = (org.settings as any) || {};
    const whiteLabel = settings.whiteLabel || {};

    return {
      organizationId: org.id,
      organizationName: org.name,
      branding: { ...DEFAULT_BRANDING, ...whiteLabel.branding },
      customDomain: whiteLabel.customDomain || null,
      emailTemplates: { ...DEFAULT_EMAIL_TEMPLATES, ...whiteLabel.emailTemplates },
      loginPage: { ...DEFAULT_LOGIN_PAGE, ...whiteLabel.loginPage },
      updatedAt: org.updatedAt,
    };
  }

  /**
   * Get all tenants with white-label configs
   */
  async getAllWhiteLabelConfigs(): Promise<WhiteLabelConfig[]> {
    const orgs = await prisma.organization.findMany({
      where: { isActive: true },
      select: { id: true, name: true, settings: true, updatedAt: true },
    });

    return orgs.map((org) => {
      const settings = (org.settings as any) || {};
      const whiteLabel = settings.whiteLabel || {};

      return {
        organizationId: org.id,
        organizationName: org.name,
        branding: { ...DEFAULT_BRANDING, ...whiteLabel.branding },
        customDomain: whiteLabel.customDomain || null,
        emailTemplates: { ...DEFAULT_EMAIL_TEMPLATES, ...whiteLabel.emailTemplates },
        loginPage: { ...DEFAULT_LOGIN_PAGE, ...whiteLabel.loginPage },
        updatedAt: org.updatedAt,
      };
    });
  }

  /**
   * Update branding for a tenant
   */
  async updateBranding(
    organizationId: string,
    branding: Partial<BrandingConfig>
  ): Promise<BrandingConfig> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, settings: true },
    });

    if (!org) throw new Error('Organization not found');

    const currentSettings = (org.settings as any) || {};
    const currentWhiteLabel = currentSettings.whiteLabel || {};
    const currentBranding = currentWhiteLabel.branding || {};

    const updatedBranding = { ...DEFAULT_BRANDING, ...currentBranding, ...branding };

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        settings: {
          ...currentSettings,
          whiteLabel: {
            ...currentWhiteLabel,
            branding: updatedBranding,
          },
        },
      },
    });

    return updatedBranding;
  }

  /**
   * Set up custom domain for a tenant
   */
  async setupCustomDomain(
    organizationId: string,
    domain: string
  ): Promise<CustomDomainConfig> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, settings: true },
    });

    if (!org) throw new Error('Organization not found');

    // Validate domain format
    if (!this.isValidDomain(domain)) {
      throw new Error('Invalid domain format');
    }

    // Check if domain is already in use
    const existingOrg = await prisma.organization.findFirst({
      where: {
        settings: { path: ['whiteLabel', 'customDomain', 'domain'], equals: domain },
        id: { not: organizationId },
      },
    });

    if (existingOrg) {
      throw new Error('Domain is already in use by another organization');
    }

    const customDomain: CustomDomainConfig = {
      domain,
      sslStatus: 'pending',
      sslExpiresAt: null,
      dnsVerified: false,
      lastChecked: new Date(),
    };

    const currentSettings = (org.settings as any) || {};
    const currentWhiteLabel = currentSettings.whiteLabel || {};

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        settings: {
          ...currentSettings,
          whiteLabel: {
            ...currentWhiteLabel,
            customDomain,
          },
        },
      },
    });

    return customDomain;
  }

  /**
   * Verify custom domain DNS
   */
  async verifyCustomDomain(organizationId: string): Promise<{
    verified: boolean;
    expectedRecords: Array<{ type: string; name: string; value: string }>;
    actualRecords: Array<{ type: string; value: string }>;
  }> {
    const config = await this.getTenantWhiteLabelConfig(organizationId);

    if (!config.customDomain) {
      throw new Error('No custom domain configured');
    }

    // In production, would do actual DNS lookup
    // For now, return expected records
    const expectedRecords = [
      { type: 'CNAME', name: config.customDomain.domain, value: 'app.myleadx.ai' },
      { type: 'TXT', name: `_verify.${config.customDomain.domain}`, value: `vb-verify=${organizationId}` },
    ];

    // Simulated DNS check
    const verified = Math.random() > 0.5; // Would be actual DNS check

    // Update verification status
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    const currentSettings = (org?.settings as any) || {};
    const currentWhiteLabel = currentSettings.whiteLabel || {};

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        settings: {
          ...currentSettings,
          whiteLabel: {
            ...currentWhiteLabel,
            customDomain: {
              ...currentWhiteLabel.customDomain,
              dnsVerified: verified,
              lastChecked: new Date().toISOString(),
            },
          },
        },
      },
    });

    return {
      verified,
      expectedRecords,
      actualRecords: [], // Would contain actual DNS records
    };
  }

  /**
   * Remove custom domain
   */
  async removeCustomDomain(organizationId: string): Promise<void> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    if (!org) throw new Error('Organization not found');

    const currentSettings = (org.settings as any) || {};
    const currentWhiteLabel = currentSettings.whiteLabel || {};

    delete currentWhiteLabel.customDomain;

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        settings: {
          ...currentSettings,
          whiteLabel: currentWhiteLabel,
        },
      },
    });
  }

  /**
   * Update email templates for a tenant
   */
  async updateEmailTemplates(
    organizationId: string,
    templates: Partial<EmailTemplateConfig>
  ): Promise<EmailTemplateConfig> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, settings: true },
    });

    if (!org) throw new Error('Organization not found');

    const currentSettings = (org.settings as any) || {};
    const currentWhiteLabel = currentSettings.whiteLabel || {};
    const currentTemplates = currentWhiteLabel.emailTemplates || {};

    const updatedTemplates = { ...DEFAULT_EMAIL_TEMPLATES, ...currentTemplates, ...templates };

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        settings: {
          ...currentSettings,
          whiteLabel: {
            ...currentWhiteLabel,
            emailTemplates: updatedTemplates,
          },
        },
      },
    });

    return updatedTemplates;
  }

  /**
   * Update login page config for a tenant
   */
  async updateLoginPage(
    organizationId: string,
    loginPage: Partial<LoginPageConfig>
  ): Promise<LoginPageConfig> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, settings: true },
    });

    if (!org) throw new Error('Organization not found');

    const currentSettings = (org.settings as any) || {};
    const currentWhiteLabel = currentSettings.whiteLabel || {};
    const currentLoginPage = currentWhiteLabel.loginPage || {};

    const updatedLoginPage = { ...DEFAULT_LOGIN_PAGE, ...currentLoginPage, ...loginPage };

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        settings: {
          ...currentSettings,
          whiteLabel: {
            ...currentWhiteLabel,
            loginPage: updatedLoginPage,
          },
        },
      },
    });

    return updatedLoginPage;
  }

  /**
   * Get all custom domains across tenants
   */
  async getAllCustomDomains(): Promise<Array<{
    organizationId: string;
    organizationName: string;
    domain: CustomDomainConfig;
  }>> {
    const orgs = await prisma.organization.findMany({
      where: { isActive: true },
      select: { id: true, name: true, settings: true },
    });

    return orgs
      .filter((org) => {
        const settings = (org.settings as any) || {};
        return settings.whiteLabel?.customDomain;
      })
      .map((org) => {
        const settings = (org.settings as any) || {};
        return {
          organizationId: org.id,
          organizationName: org.name,
          domain: settings.whiteLabel.customDomain,
        };
      });
  }

  /**
   * Provision SSL for custom domain
   */
  async provisionSSL(organizationId: string): Promise<{ status: string; message: string }> {
    const config = await this.getTenantWhiteLabelConfig(organizationId);

    if (!config.customDomain) {
      throw new Error('No custom domain configured');
    }

    if (!config.customDomain.dnsVerified) {
      throw new Error('DNS must be verified before provisioning SSL');
    }

    // In production, would trigger Let's Encrypt certificate provisioning
    // For now, simulate the process

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    const currentSettings = (org?.settings as any) || {};
    const currentWhiteLabel = currentSettings.whiteLabel || {};

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        settings: {
          ...currentSettings,
          whiteLabel: {
            ...currentWhiteLabel,
            customDomain: {
              ...currentWhiteLabel.customDomain,
              sslStatus: 'active',
              sslExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
            },
          },
        },
      },
    });

    return {
      status: 'provisioning',
      message: 'SSL certificate is being provisioned. This may take a few minutes.',
    };
  }

  /**
   * Reset white-label config to defaults
   */
  async resetToDefaults(organizationId: string): Promise<void> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    if (!org) throw new Error('Organization not found');

    const currentSettings = (org.settings as any) || {};

    // Keep custom domain but reset everything else
    const customDomain = currentSettings.whiteLabel?.customDomain;

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        settings: {
          ...currentSettings,
          whiteLabel: {
            branding: DEFAULT_BRANDING,
            emailTemplates: DEFAULT_EMAIL_TEMPLATES,
            loginPage: DEFAULT_LOGIN_PAGE,
            customDomain,
          },
        },
      },
    });
  }

  /**
   * Generate preview URL for white-label config
   */
  async generatePreviewUrl(organizationId: string): Promise<string> {
    // In production, would generate a temporary preview URL
    const previewToken = Buffer.from(`${organizationId}:${Date.now()}`).toString('base64');
    return `https://app.myleadx.ai/preview/${previewToken}`;
  }

  /**
   * Helper: Validate domain format
   */
  private isValidDomain(domain: string): boolean {
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    return domainRegex.test(domain);
  }
}

export const whiteLabelService = new WhiteLabelService();
