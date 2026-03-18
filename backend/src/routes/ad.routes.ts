import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import { facebookService } from '../integrations/facebook.service';
import { linkedinService } from '../integrations/linkedin.service';
import { googleAdsService } from '../integrations/google-ads.service';
import { instagramService } from '../integrations/instagram.service';
import { ApiResponse } from '../utils/apiResponse';
import { validate } from '../middlewares/validate';
import { authenticate, authorize } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { verifyFacebookWebhook } from '../middlewares/webhookAuth';
import { webhookLimiter } from '../middlewares/rateLimit';
import { prisma } from '../config/database';

const router = Router();

// Facebook webhook verification (GET)
router.get('/facebook/webhook', async (req: Request, res: Response) => {
  const mode = req.query['hub.mode'] as string;
  const token = req.query['hub.verify_token'] as string;
  const challenge = req.query['hub.challenge'] as string;

  const result = await facebookService.verifyWebhook(mode, token, challenge);
  if (result) {
    res.status(200).send(challenge);
  } else {
    res.status(403).send('Forbidden');
  }
});

// Facebook webhook handler (POST)
router.post('/facebook/webhook', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['x-hub-signature-256'] as string;
    const payload = JSON.stringify(req.body);

    if (!facebookService.verifySignature(payload, signature)) {
      return res.status(401).send('Invalid signature');
    }

    // Get organization from webhook data or default
    const organizationId = req.body.organizationId || process.env.DEFAULT_ORG_ID;

    const lead = await facebookService.handleWebhook(req.body, organizationId);

    ApiResponse.success(res, 'Webhook processed', { lead });
  } catch (error) {
    next(error);
  }
});

// Instagram webhook handler (uses Facebook webhook infrastructure)
router.post('/instagram/webhook', webhookLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['x-hub-signature-256'] as string;
    const payload = JSON.stringify(req.body);

    if (!instagramService.verifySignature(payload, signature)) {
      return res.status(401).send('Invalid signature');
    }

    const organizationId = req.body.organizationId || process.env.DEFAULT_ORG_ID;
    const lead = await instagramService.handleWebhook(req.body, organizationId);

    ApiResponse.success(res, 'Webhook processed', { lead });
  } catch (error) {
    next(error);
  }
});

// LinkedIn webhook verification (GET) - for webhook subscription setup
router.get('/linkedin/webhook', (req: Request, res: Response) => {
  const challenge = req.query.challenge as string || req.query.validationToken as string;

  if (challenge) {
    console.info('[LinkedIn] Webhook verification successful');
    return res.status(200).send(challenge);
  }

  res.status(200).json({ status: 'ok', message: 'LinkedIn webhook endpoint ready' });
});

// LinkedIn webhook handler (POST)
router.post('/linkedin/webhook', webhookLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Verify signature if present
    const signature = req.headers['x-li-signature'] as string ||
                      req.headers['x-linkedin-signature'] as string;

    if (signature) {
      const payload = JSON.stringify(req.body);
      if (!linkedinService.verifyWebhookSignature(payload, signature)) {
        console.warn('[LinkedIn] Invalid webhook signature');
        return res.status(401).json({ success: false, message: 'Invalid signature' });
      }
    }

    // Get organization ID from multiple sources
    const organizationId =
      req.body.organizationId ||
      req.query.organizationId ||
      req.headers['x-organization-id'] ||
      process.env.DEFAULT_ORG_ID;

    if (!organizationId) {
      console.warn('[LinkedIn] No organization ID provided in webhook');
      return res.status(400).json({ success: false, message: 'Organization ID required' });
    }

    // Load stored access token if available
    const integration = await prisma.linkedInIntegration.findFirst({
      where: { organizationId, isActive: true },
    });

    if (integration && integration.accessToken) {
      linkedinService.setAccessToken(integration.accessToken);
    }

    const lead = await linkedinService.handleWebhook(req.body, organizationId);

    res.status(200).json({
      success: true,
      message: 'Webhook processed',
      data: lead ? { leadId: Array.isArray(lead) ? lead.length : lead.id } : null,
    });
  } catch (error: any) {
    console.error('[LinkedIn] Webhook processing error:', error);
    // Return 200 to acknowledge receipt
    res.status(200).json({
      success: false,
      message: error.message,
    });
  }
});

// Google Ads webhook verification (GET) - for webhook setup
router.get('/google/webhook', (req: Request, res: Response) => {
  const challenge = req.query.challenge as string || req.query['hub.challenge'] as string;
  const token = req.query.token as string || req.query['hub.verify_token'] as string;

  // Verify token if provided
  const expectedToken = process.env.GOOGLE_PUBSUB_VERIFICATION_TOKEN;
  if (expectedToken && token && token !== expectedToken) {
    console.warn('[GoogleAds] Webhook verification failed - invalid token');
    return res.status(403).send('Forbidden');
  }

  if (challenge) {
    console.info('[GoogleAds] Webhook verification successful');
    return res.status(200).send(challenge);
  }

  // Return 200 for basic health check
  res.status(200).json({ status: 'ok', message: 'Google Ads webhook endpoint ready' });
});

// Google Ads webhook handler (POST) - for real-time lead delivery
router.post('/google/webhook', webhookLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Verify Pub/Sub token if present (for Google Cloud Pub/Sub push subscriptions)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      if (!googleAdsService.verifyPubSubToken(token)) {
        console.warn('[GoogleAds] Invalid Pub/Sub token');
        return res.status(401).json({ success: false, message: 'Invalid token' });
      }
    }

    // Get organization ID from multiple possible sources
    const organizationId =
      req.body.organizationId ||
      req.query.organizationId ||
      req.headers['x-organization-id'] ||
      process.env.DEFAULT_ORG_ID;

    if (!organizationId) {
      console.warn('[GoogleAds] No organization ID provided in webhook');
      return res.status(400).json({ success: false, message: 'Organization ID required' });
    }

    // Initialize service with stored credentials if needed
    const integration = await prisma.googleAdsIntegration.findFirst({
      where: { organizationId, isActive: true },
    });

    if (integration) {
      googleAdsService.initialize({
        clientId: integration.clientId || '',
        clientSecret: integration.clientSecret || '',
        developerToken: integration.developerToken || '',
        refreshToken: integration.refreshToken || '',
        customerId: integration.customerId,
      });
    }

    // Process the webhook
    const result = await googleAdsService.handleWebhook(req.body, organizationId);

    // Acknowledge receipt (important for Pub/Sub)
    res.status(200).json({
      success: true,
      message: 'Webhook processed',
      data: result ? { leadId: Array.isArray(result) ? result.length : result.id } : null,
    });
  } catch (error: any) {
    console.error('[GoogleAds] Webhook processing error:', error);
    // Still return 200 to acknowledge receipt (prevents Pub/Sub retries for bad data)
    res.status(200).json({
      success: false,
      message: error.message,
    });
  }
});

// Protected routes
router.use(authenticate);
router.use(tenantMiddleware);

// Get all ad campaigns
router.get(
  '/campaigns',
  query('platform').optional().isIn(['FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'GOOGLE']),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const where: any = { organizationId: req.organizationId };
      if (req.query.platform) {
        where.platform = req.query.platform;
      }

      const campaigns = await prisma.adCampaign.findMany({
        where,
        include: {
          _count: { select: { adLeads: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      ApiResponse.success(res, 'Ad campaigns retrieved', campaigns);
    } catch (error) {
      next(error);
    }
  }
);

// Get ad campaign details
router.get(
  '/campaigns/:id',
  param('id').isUUID(),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const campaign = await prisma.adCampaign.findFirst({
        where: { id: req.params.id, organizationId: req.organizationId },
        include: {
          adLeads: {
            include: { lead: true },
            orderBy: { syncedAt: 'desc' },
            take: 100,
          },
        },
      });

      if (!campaign) {
        return ApiResponse.notFound(res, 'Campaign not found');
      }

      ApiResponse.success(res, 'Campaign retrieved', campaign);
    } catch (error) {
      next(error);
    }
  }
);

// Get ad analytics
router.get('/analytics', async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const [totalCampaigns, totalLeads, byPlatform, recentLeads] = await Promise.all([
      prisma.adCampaign.count({ where: { organizationId: req.organizationId } }),
      prisma.adLead.count({
        where: { adCampaign: { organizationId: req.organizationId } },
      }),
      prisma.adCampaign.groupBy({
        by: ['platform'],
        where: { organizationId: req.organizationId },
        _count: true,
        _sum: { impressions: true, clicks: true, conversions: true },
      }),
      prisma.adLead.findMany({
        where: { adCampaign: { organizationId: req.organizationId } },
        include: { lead: true, adCampaign: true },
        orderBy: { syncedAt: 'desc' },
        take: 10,
      }),
    ]);

    ApiResponse.success(res, 'Analytics retrieved', {
      totalCampaigns,
      totalLeads,
      byPlatform,
      recentLeads,
    });
  } catch (error) {
    next(error);
  }
});

// Sync Facebook campaigns
router.post(
  '/facebook/sync',
  authorize('admin'),
  validate([body('adAccountId').notEmpty(), body('accessToken').notEmpty()]),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      facebookService.setAccessToken(req.body.accessToken);
      const campaigns = await facebookService.syncCampaigns(
        req.organizationId!,
        req.body.adAccountId
      );

      ApiResponse.success(res, 'Facebook campaigns synced', { synced: campaigns.length });
    } catch (error) {
      next(error);
    }
  }
);

// Sync Instagram campaigns
router.post(
  '/instagram/sync',
  authorize('admin'),
  validate([body('adAccountId').notEmpty(), body('accessToken').notEmpty()]),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      instagramService.setAccessToken(req.body.accessToken);
      const campaigns = await instagramService.syncCampaigns(
        req.organizationId!,
        req.body.adAccountId
      );

      ApiResponse.success(res, 'Instagram campaigns synced', { synced: campaigns.length });
    } catch (error) {
      next(error);
    }
  }
);

// Get Instagram lead forms
router.get(
  '/instagram/forms/:pageId',
  authorize('admin'),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.query.accessToken) {
        return ApiResponse.error(res, 'Access token required', 400);
      }

      instagramService.setAccessToken(req.query.accessToken as string);
      const forms = await instagramService.getLeadForms(req.params.pageId);

      ApiResponse.success(res, 'Lead forms retrieved', forms);
    } catch (error) {
      next(error);
    }
  }
);

// Get Instagram campaign insights
router.get(
  '/instagram/campaigns/:campaignId/insights',
  authorize('admin'),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.query.accessToken) {
        return ApiResponse.error(res, 'Access token required', 400);
      }

      instagramService.setAccessToken(req.query.accessToken as string);
      const insights = await instagramService.getCampaignInsights(req.params.campaignId);

      ApiResponse.success(res, 'Campaign insights retrieved', insights);
    } catch (error) {
      next(error);
    }
  }
);

// Sync LinkedIn campaigns
router.post(
  '/linkedin/sync',
  authorize('admin'),
  validate([body('adAccountId').notEmpty(), body('accessToken').notEmpty()]),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      linkedinService.setAccessToken(req.body.accessToken);
      const campaigns = await linkedinService.syncCampaigns(
        req.organizationId!,
        req.body.adAccountId
      );

      ApiResponse.success(res, 'LinkedIn campaigns synced', { synced: campaigns.length });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== GOOGLE ADS ====================

// Initialize Google Ads with credentials
router.post(
  '/google/initialize',
  authorize('admin'),
  validate([
    body('clientId').notEmpty(),
    body('clientSecret').notEmpty(),
    body('developerToken').notEmpty(),
    body('refreshToken').notEmpty(),
    body('customerId').notEmpty(),
  ]),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      googleAdsService.initialize({
        clientId: req.body.clientId,
        clientSecret: req.body.clientSecret,
        developerToken: req.body.developerToken,
        refreshToken: req.body.refreshToken,
        customerId: req.body.customerId,
      });

      ApiResponse.success(res, 'Google Ads initialized successfully');
    } catch (error) {
      next(error);
    }
  }
);

// Sync Google Ads campaigns
router.post(
  '/google/sync',
  authorize('admin'),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      if (!googleAdsService.isConfigured()) {
        return ApiResponse.error(res, 'Google Ads not configured. Call /initialize first', 400);
      }

      const campaigns = await googleAdsService.syncCampaigns(req.organizationId!);
      ApiResponse.success(res, 'Google Ads campaigns synced', { synced: campaigns.length });
    } catch (error) {
      next(error);
    }
  }
);

// Get Google Ads lead forms
router.get(
  '/google/lead-forms',
  authorize('admin'),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      if (!googleAdsService.isConfigured()) {
        return ApiResponse.error(res, 'Google Ads not configured', 400);
      }

      const forms = await googleAdsService.getLeadForms();
      ApiResponse.success(res, 'Lead forms retrieved', forms);
    } catch (error) {
      next(error);
    }
  }
);

// Get lead form submissions
router.get(
  '/google/leads',
  authorize('admin'),
  validate([query('formId').notEmpty()]),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      if (!googleAdsService.isConfigured()) {
        return ApiResponse.error(res, 'Google Ads not configured', 400);
      }

      const leads = await googleAdsService.getLeadFormSubmissions(
        req.organizationId!,
        req.query.formId as string,
        parseInt(req.query.days as string) || 7
      );

      ApiResponse.success(res, 'Lead form submissions retrieved', { leads: leads.length });
    } catch (error) {
      next(error);
    }
  }
);

// Get campaign metrics
router.get(
  '/google/campaigns/:campaignId/metrics',
  authorize('admin'),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      if (!googleAdsService.isConfigured()) {
        return ApiResponse.error(res, 'Google Ads not configured', 400);
      }

      const metrics = await googleAdsService.getCampaignMetrics(
        req.params.campaignId,
        (req.query.dateRange as string) || 'LAST_30_DAYS'
      );

      ApiResponse.success(res, 'Campaign metrics retrieved', metrics);
    } catch (error) {
      next(error);
    }
  }
);

// Google Ads webhook handler
router.post(
  '/google/webhook',
  webhookLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = req.body.organizationId || process.env.DEFAULT_ORG_ID;
      const lead = await googleAdsService.handleWebhook(req.body, organizationId);

      ApiResponse.success(res, 'Webhook processed', { lead });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
