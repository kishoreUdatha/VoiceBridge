/**
 * Branding Routes
 * Public API for fetching organization branding by subdomain/slug
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Public endpoint - no auth required
// GET /api/branding/:identifier (subdomain or slug)
router.get('/:identifier', async (req: Request, res: Response) => {
  try {
    const { identifier } = req.params;

    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: 'Identifier (subdomain or slug) is required',
      });
    }

    // Find organization by subdomain, customDomain, or slug
    const organization = await prisma.organization.findFirst({
      where: {
        OR: [
          { subdomain: identifier },
          { customDomain: identifier },
          { slug: identifier },
        ],
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        subdomain: true,
        customDomain: true,
        brandName: true,
        primaryColor: true,
        secondaryColor: true,
        accentColor: true,
        favicon: true,
        loginBgImage: true,
        footerText: true,
        hidePoweredBy: true,
      },
    });

    if (!organization) {
      // Return default branding if not found
      return res.json({
        success: true,
        data: {
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
        },
      });
    }

    return res.json({
      success: true,
      data: {
        organizationId: organization.id,
        brandName: organization.brandName || organization.name,
        logo: organization.logo,
        primaryColor: organization.primaryColor || '#6366f1',
        secondaryColor: organization.secondaryColor || '#4f46e5',
        accentColor: organization.accentColor || '#10b981',
        favicon: organization.favicon,
        loginBgImage: organization.loginBgImage,
        footerText: organization.footerText,
        hidePoweredBy: organization.hidePoweredBy || false,
        isDefault: false,
      },
    });
  } catch (error) {
    console.error('Error fetching branding:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch branding',
    });
  }
});

export default router;
