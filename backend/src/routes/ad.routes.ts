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

// Rate limiter for test endpoints
import rateLimit from 'express-rate-limit';
const testEndpointLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 test requests per hour
  message: { success: false, message: 'Too many test requests' },
});

// ==================== TEST ENDPOINTS (Development Only) ====================

// Test Facebook lead capture WITHOUT signature verification
// SECURITY: Requires authentication and uses authenticated user's organization
router.post('/facebook/test-lead', authenticate, tenantMiddleware, testEndpointLimiter, validate([
  body('firstName').optional().trim().isLength({ max: 100 }).withMessage('First name too long'),
  body('lastName').optional().trim().isLength({ max: 100 }).withMessage('Last name too long'),
  body('email').optional().trim().isEmail().withMessage('Invalid email'),
  body('phone').optional().trim().matches(/^[\d+\-() ]{7,20}$/).withMessage('Invalid phone'),
  body('campaignName').optional().trim().isLength({ max: 200 }).withMessage('Campaign name too long'),
]), async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    // Only allow in development mode
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ success: false, message: 'Test endpoints disabled in production' });
    }

    const { firstName, lastName, email, phone, campaignName } = req.body;
    const organizationId = req.organizationId!; // Use authenticated user's organization

    // Simulate a Facebook lead webhook payload
    const mockPayload = {
      object: 'page',
      entry: [{
        id: 'test-page-' + Date.now(),
        time: Date.now(),
        changes: [{
          field: 'leadgen',
          value: {
            leadgen_id: 'test-lead-' + Date.now(),
            page_id: 'test-page-123',
            form_id: 'test-form-123',
            created_time: Math.floor(Date.now() / 1000),
          },
        }],
      }],
    };

    // Create lead directly in RawImportRecord for testing
    const { externalLeadImportService } = await import('../services/external-lead-import.service');

    const result = await externalLeadImportService.importExternalLead(organizationId, {
      firstName: firstName || 'Test',
      lastName: lastName || 'Lead',
      email: email || `test${Date.now()}@example.com`,
      phone: phone || `+91${Math.floor(Math.random() * 9000000000) + 1000000000}`,
      source: 'AD_FACEBOOK',
      sourceDetails: `Test Campaign: ${campaignName || 'Facebook Test Campaign'}`,
      campaignName: campaignName || 'Facebook Test Campaign',
      customFields: {
        testLead: true,
        createdAt: new Date().toISOString(),
      },
    });

    console.log(`[Facebook Test] Lead created: ${result.rawImportRecord.id}`);

    res.status(200).json({
      success: true,
      message: 'Test lead created successfully',
      data: {
        id: result.rawImportRecord.id,
        isDuplicate: result.isDuplicate,
      },
    });
  } catch (error: any) {
    console.error('[Facebook Test] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Test Instagram lead capture WITHOUT signature verification
// SECURITY: Requires authentication and uses authenticated user's organization
router.post('/instagram/test-lead', authenticate, tenantMiddleware, testEndpointLimiter, validate([
  body('firstName').optional().trim().isLength({ max: 100 }).withMessage('First name too long'),
  body('lastName').optional().trim().isLength({ max: 100 }).withMessage('Last name too long'),
  body('email').optional().trim().isEmail().withMessage('Invalid email'),
  body('phone').optional().trim().matches(/^[\d+\-() ]{7,20}$/).withMessage('Invalid phone'),
  body('campaignName').optional().trim().isLength({ max: 200 }).withMessage('Campaign name too long'),
]), async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    // Only allow in development mode
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ success: false, message: 'Test endpoints disabled in production' });
    }

    const { firstName, lastName, email, phone, campaignName } = req.body;
    const organizationId = req.organizationId!; // Use authenticated user's organization

    const { externalLeadImportService } = await import('../services/external-lead-import.service');

    const result = await externalLeadImportService.importExternalLead(organizationId, {
      firstName: firstName || 'Test',
      lastName: lastName || 'Lead',
      email: email || `test${Date.now()}@example.com`,
      phone: phone || `+91${Math.floor(Math.random() * 9000000000) + 1000000000}`,
      source: 'AD_INSTAGRAM',
      sourceDetails: `Test Campaign: ${campaignName || 'Instagram Test Campaign'}`,
      campaignName: campaignName || 'Instagram Test Campaign',
      customFields: {
        testLead: true,
        createdAt: new Date().toISOString(),
      },
    });

    console.log(`[Instagram Test] Lead created: ${result.rawImportRecord.id}`);

    res.status(200).json({
      success: true,
      message: 'Test lead created successfully',
      data: {
        id: result.rawImportRecord.id,
        isDuplicate: result.isDuplicate,
      },
    });
  } catch (error: any) {
    console.error('[Instagram Test] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== WEBHOOK ENDPOINTS ====================

// Facebook webhook verification (GET)
// Multi-tenant: searches ALL integrations for matching verify token
router.get('/facebook/webhook', async (req: Request, res: Response) => {
  const mode = req.query['hub.mode'] as string;
  const token = req.query['hub.verify_token'] as string;
  const challenge = req.query['hub.challenge'] as string;
  const orgId = req.query['org'] as string; // Optional: org ID in webhook URL

  console.log(`[Facebook] Webhook verification request - mode: ${mode}, token: [REDACTED]`);

  if (mode !== 'subscribe') {
    console.warn('[Facebook] Invalid mode for webhook verification');
    return res.status(403).send('Forbidden');
  }

  // If org ID provided, look up org-specific verify token first
  if (orgId) {
    const integration = await prisma.facebookIntegration.findFirst({
      where: { organizationId: orgId, isActive: true },
    });
    if (integration?.verifyToken && integration.verifyToken === token) {
      console.info(`[Facebook] Webhook verified for org ${orgId}`);
      return res.status(200).send(challenge);
    }
  }

  // Multi-tenant: Search ALL integrations for matching verify token
  const matchingIntegration = await prisma.facebookIntegration.findFirst({
    where: {
      verifyToken: token,
      isActive: true
    },
  });

  if (matchingIntegration) {
    console.info(`[Facebook] Webhook verified for org ${matchingIntegration.organizationId}`);
    return res.status(200).send(challenge);
  }

  // Fallback to env variable (for backwards compatibility)
  const envToken = process.env.FACEBOOK_VERIFY_TOKEN;
  if (envToken && token === envToken) {
    console.info('[Facebook] Webhook verified using env token');
    return res.status(200).send(challenge);
  }

  console.warn(`[Facebook] No matching verify token found`);
  res.status(403).send('Forbidden');
});

// Facebook webhook handler (POST)
// Looks up organization by page ID and uses org-specific app secret
router.post('/facebook/webhook', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['x-hub-signature-256'] as string;
    // Use raw body for signature verification (captured by express.json verify function)
    const payload = (req as any).rawBody || JSON.stringify(req.body);
    const isTestMode = req.headers['x-test-mode'] === 'true' && process.env.NODE_ENV === 'development';

    // Extract page ID from webhook payload to find organization
    const entry = (req.body.entry as any[])?.[0];
    const pageId = entry?.id;

    let organizationId: string | null = null;
    let appSecret: string | null = null;
    let accessToken: string | null = null;

    // Look up integration by page ID to get org-specific credentials
    if (pageId) {
      const integration = await prisma.facebookIntegration.findFirst({
        where: { pageId, isActive: true },
      });
      if (integration) {
        organizationId = integration.organizationId;
        appSecret = integration.appSecret;
        accessToken = integration.accessToken;
      }
    }

    // If not found by pageId, try lookup by organizationId from query/header
    if (!appSecret) {
      const orgIdFromRequest = req.query.organizationId as string || req.headers['x-organization-id'] as string;
      if (orgIdFromRequest) {
        const integration = await prisma.facebookIntegration.findFirst({
          where: { organizationId: orgIdFromRequest, isActive: true },
        });
        if (integration) {
          organizationId = integration.organizationId;
          appSecret = integration.appSecret;
          accessToken = integration.accessToken;
          // Update the pageId in the database for future lookups
          if (pageId && integration.pageId !== pageId) {
            await prisma.facebookIntegration.update({
              where: { id: integration.id },
              data: { pageId, pageName: `Page ${pageId}` },
            });
            console.info(`[Facebook] Updated pageId to ${pageId} for org ${organizationId}`);
          }
        }
      }
    }

    // Skip signature verification in test mode (development only)
    if (!isTestMode) {
      // Verify signature with org-specific secret or fallback
      if (appSecret) {
        if (!facebookService.verifySignatureWithSecret(payload, signature, appSecret)) {
          console.warn(`[Facebook] Invalid signature for page ${pageId}`);
          return res.status(401).send('Invalid signature');
        }
      } else if (signature) {
        // Fallback to env-based verification
        if (!facebookService.verifySignature(payload, signature)) {
          return res.status(401).send('Invalid signature');
        }
      }
    } else {
      console.info('[Facebook] Test mode - skipping signature verification');
    }

    // Use found org ID or fallback - SECURITY: Do NOT accept from body (can be spoofed)
    if (!organizationId) {
      organizationId =
        req.query.organizationId as string ||
        req.headers['x-organization-id'] as string ||
        process.env.DEFAULT_ORG_ID || null;
    }

    if (!organizationId) {
      console.warn('[Facebook] No organization found for webhook');
      return res.status(400).send('Organization not found');
    }

    // Set the access token from the integration for fetching lead data
    if (accessToken) {
      facebookService.setAccessToken(accessToken);
    } else {
      console.warn('[Facebook] No access token found for integration, lead data may not be fetchable');
    }

    const lead = await facebookService.handleWebhook(req.body, organizationId);

    ApiResponse.success(res, 'Webhook processed', { lead });
  } catch (error) {
    next(error);
  }
});

// Instagram webhook handler (uses Facebook webhook infrastructure)
// Looks up organization by page ID and uses org-specific app secret
router.post('/instagram/webhook', webhookLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['x-hub-signature-256'] as string;
    const payload = JSON.stringify(req.body);

    // Extract page ID from webhook payload to find organization
    const entry = (req.body.entry as any[])?.[0];
    const pageId = entry?.id;

    let organizationId: string | null = null;
    let appSecret: string | null = null;

    // Look up integration by page ID to get org-specific credentials
    if (pageId) {
      const integration = await prisma.instagramIntegration.findFirst({
        where: { pageId, isActive: true },
      });
      if (integration) {
        organizationId = integration.organizationId;
        appSecret = integration.appSecret;
      }
    }

    // Skip signature verification in test mode (development only)
    const isTestMode = req.headers['x-test-mode'] === 'true' && process.env.NODE_ENV === 'development';

    if (!isTestMode) {
      // Verify signature with org-specific secret or fallback
      if (appSecret) {
        if (!instagramService.verifySignatureWithSecret(payload, signature, appSecret)) {
          console.warn(`[Instagram] Invalid signature for page ${pageId}`);
          return res.status(401).send('Invalid signature');
        }
      } else if (signature) {
        if (!instagramService.verifySignature(payload, signature)) {
          return res.status(401).send('Invalid signature');
        }
      }
    } else {
      console.info('[Instagram] Test mode - skipping signature verification');
    }

    // Use found org ID or fallback - SECURITY: Do NOT accept from body (can be spoofed)
    if (!organizationId) {
      organizationId =
        req.query.organizationId as string ||
        req.headers['x-organization-id'] as string ||
        process.env.DEFAULT_ORG_ID || null;
    }

    if (!organizationId) {
      console.warn('[Instagram] No organization found for webhook');
      return res.status(400).send('Organization not found');
    }

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

    // Get organization ID - SECURITY: Do NOT accept from body (can be spoofed)
    const organizationId =
      req.query.organizationId as string ||
      req.headers['x-organization-id'] as string ||
      process.env.DEFAULT_ORG_ID || null;

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

    // Get organization ID - SECURITY: Do NOT accept from body (can be spoofed)
    const organizationId =
      req.query.organizationId as string ||
      req.headers['x-organization-id'] as string ||
      process.env.DEFAULT_ORG_ID || null;

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

// NOTE: Google Ads webhook handler is defined above at /google/webhook (before protected routes)
// This duplicate endpoint was removed for security - it accepted organizationId from body

export default router;
