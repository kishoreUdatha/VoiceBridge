import { Router, Request, Response } from 'express';
import { prisma } from '../config/database';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware } from '../middlewares/tenant';

const router = Router();

/**
 * GET /white-label - Get white-label settings for organization
 */
router.get('/', authenticate, tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;

    let settings = await prisma.whiteLabelSettings.findUnique({
      where: { organizationId },
    });

    // Create default settings if not exists
    if (!settings) {
      settings = await prisma.whiteLabelSettings.create({
        data: { organizationId },
      });
    }

    res.json({ success: true, settings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /white-label - Update white-label settings
 */
router.put('/', authenticate, tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const {
      logoUrl,
      faviconUrl,
      primaryColor,
      secondaryColor,
      accentColor,
      customDomain,
      appName,
      supportEmail,
      supportPhone,
      footerText,
      privacyPolicyUrl,
      termsUrl,
      emailFromName,
      emailFooter,
      hidePoweredBy,
    } = req.body;

    const settings = await prisma.whiteLabelSettings.upsert({
      where: { organizationId },
      update: {
        logoUrl,
        faviconUrl,
        primaryColor,
        secondaryColor,
        accentColor,
        customDomain,
        appName,
        supportEmail,
        supportPhone,
        footerText,
        privacyPolicyUrl,
        termsUrl,
        emailFromName,
        emailFooter,
        hidePoweredBy,
      },
      create: {
        organizationId,
        logoUrl,
        faviconUrl,
        primaryColor,
        secondaryColor,
        accentColor,
        customDomain,
        appName,
        supportEmail,
        supportPhone,
        footerText,
        privacyPolicyUrl,
        termsUrl,
        emailFromName,
        emailFooter,
        hidePoweredBy,
      },
    });

    res.json({ success: true, settings });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * POST /white-label/verify-domain - Verify custom domain
 */
router.post('/verify-domain', authenticate, tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const { domain } = req.body;

    // In production, you would verify DNS records here
    // For now, we'll just mark it as verified

    const settings = await prisma.whiteLabelSettings.update({
      where: { organizationId },
      data: {
        customDomain: domain,
        domainVerified: true,
      },
    });

    res.json({
      success: true,
      message: 'Domain verified successfully',
      settings,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * GET /white-label/public/:domain - Get public settings by domain
 * This is used by the frontend to load branding
 */
router.get('/public/:domain', async (req: Request, res: Response) => {
  try {
    const { domain } = req.params;

    const settings = await prisma.whiteLabelSettings.findFirst({
      where: {
        customDomain: domain,
        domainVerified: true,
      },
      select: {
        logoUrl: true,
        faviconUrl: true,
        primaryColor: true,
        secondaryColor: true,
        accentColor: true,
        appName: true,
        supportEmail: true,
        footerText: true,
        privacyPolicyUrl: true,
        termsUrl: true,
        hidePoweredBy: true,
      },
    });

    if (!settings) {
      return res.status(404).json({ success: false, message: 'Domain not found' });
    }

    res.json({ success: true, settings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
