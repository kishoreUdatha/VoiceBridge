import { Router } from 'express';
import { leadTrackingService, LEAD_SOURCES } from '../services/lead-tracking.service';
import { adInteractionService } from '../services/ad-interaction.service';
import { linkedinService } from '../integrations/linkedin.service';
import { twitterAdsService } from '../integrations/twitter-ads.service';
import { tiktokAdsService } from '../integrations/tiktok-ads.service';
import { youtubeAdsService } from '../integrations/youtube-ads.service';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware } from '../middlewares/tenant';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errors';
import { prisma } from '../config/database';

const router = Router();

/**
 * PUBLIC ENDPOINTS - No authentication required
 * These are called from tracking pixels and embedded forms
 */

/**
 * @api {get} /tracking/pixel Tracking Pixel Endpoint
 * Receives page view data from tracking pixel
 */
router.get(
  '/pixel',
  asyncHandler(async (req, res) => {
    try {
      const dataStr = req.query.data as string;
      if (dataStr) {
        const data = JSON.parse(decodeURIComponent(dataStr));

        await leadTrackingService.trackPageView({
          organizationId: data.organizationId,
          visitorId: data.visitorId,
          source: data.source || 'direct',
          medium: data.medium,
          campaign: data.campaign,
          content: data.content,
          term: data.term,
          gclid: data.gclid,
          fbclid: data.fbclid,
          utmId: data.utmId,
          referrer: data.referrer,
          landingPage: data.landingPage,
          userAgent: data.userAgent || req.headers['user-agent'],
          ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip,
        });
      }
    } catch (error) {
      console.error('Tracking pixel error:', error);
    }

    // Return 1x1 transparent GIF
    const pixel = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    );
    res.writeHead(200, {
      'Content-Type': 'image/gif',
      'Content-Length': pixel.length,
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    });
    res.end(pixel);
  })
);

/**
 * @api {post} /tracking/capture Capture Lead
 * Receives lead data from forms and tracking
 */
router.post(
  '/capture',
  asyncHandler(async (req, res) => {
    const {
      organizationId,
      source,
      email,
      phone,
      firstName,
      lastName,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      utmTerm,
      referrer,
      landingPage,
      formId,
      customFields,
      visitorId,
      gclid,
      fbclid,
    } = req.body;

    if (!organizationId) {
      throw new AppError('Organization ID is required', 400);
    }

    if (!email && !phone) {
      throw new AppError('Email or phone is required', 400);
    }

    const result = await leadTrackingService.captureLead({
      organizationId,
      source: source || 'website',
      email,
      phone,
      firstName,
      lastName,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      utmTerm,
      referrer,
      landingPage,
      formId,
      customFields,
      visitorId,
      gclid,
      fbclid,
      ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Set CORS headers for cross-origin form submissions
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    res.json(result);
  })
);

/**
 * @api {options} /tracking/capture CORS Preflight
 */
router.options('/capture', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.sendStatus(200);
});

/**
 * @api {post} /tracking/webhooks/facebook Facebook Lead Ads Webhook
 */
router.post(
  '/webhooks/facebook',
  asyncHandler(async (req, res) => {
    // Facebook sends a verification request first
    if (req.query['hub.mode'] === 'subscribe') {
      const verifyToken = process.env.FACEBOOK_VERIFY_TOKEN || 'crm_lead_verify';
      if (req.query['hub.verify_token'] === verifyToken) {
        res.send(req.query['hub.challenge']);
        return;
      }
      res.sendStatus(403);
      return;
    }

    // Process lead webhook
    const { object, entry } = req.body;

    if (object === 'page' && entry) {
      // Get organization from page mapping (you'd store this when connecting Facebook)
      // For now, we'll use a header or query param
      const organizationId = req.headers['x-organization-id'] as string;
      const accessToken = process.env.FACEBOOK_ACCESS_TOKEN || '';

      if (organizationId && accessToken) {
        await leadTrackingService.handleFacebookLeadWebhook(
          organizationId,
          req.body,
          accessToken
        );
      }
    }

    res.sendStatus(200);
  })
);

/**
 * @api {get} /tracking/webhooks/facebook Facebook Webhook Verification
 */
router.get(
  '/webhooks/facebook',
  (req, res) => {
    const verifyToken = process.env.FACEBOOK_VERIFY_TOKEN || 'crm_lead_verify';
    if (
      req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === verifyToken
    ) {
      res.send(req.query['hub.challenge']);
    } else {
      res.sendStatus(403);
    }
  }
);

/**
 * @api {post} /tracking/webhooks/google Google Ads Webhook
 * Receives lead form submissions from Google Ads
 */
router.post(
  '/webhooks/google',
  asyncHandler(async (req, res) => {
    const { lead_id, form_id, campaign_id, user_column_data, api_version } = req.body;
    const organizationId = req.headers['x-organization-id'] as string;

    if (!organizationId) {
      res.sendStatus(400);
      return;
    }

    // Parse Google lead data
    const fields: Record<string, string> = {};
    if (user_column_data) {
      for (const col of user_column_data) {
        fields[col.column_name?.toLowerCase()] = col.string_value || '';
      }
    }

    await leadTrackingService.captureLead({
      organizationId,
      source: 'google_ad',
      email: fields.email,
      phone: fields.phone_number || fields.phone,
      firstName: fields.first_name,
      lastName: fields.last_name,
      utmSource: 'google',
      utmMedium: 'cpc',
      campaignId: campaign_id,
      customFields: { lead_id, form_id, ...fields },
    });

    res.sendStatus(200);
  })
);

/**
 * @api {post} /tracking/impression Track Impression/Engagement
 * Receives engagement data from enhanced tracking pixel
 */
router.post(
  '/impression',
  asyncHandler(async (req, res) => {
    try {
      const {
        organizationId,
        visitorId,
        sessionId,
        scrollDepth,
        timeOnPage,
        videoWatchTime,
        videoPercentage,
        videoEvent,
        type,
        utmSource,
        utmMedium,
        utmCampaign,
        landingPage,
        userAgent,
      } = req.body;

      if (!organizationId || !visitorId) {
        res.sendStatus(400);
        return;
      }

      const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip;

      // Handle different types of tracking events
      if (scrollDepth !== undefined || timeOnPage !== undefined || videoWatchTime !== undefined) {
        // Engagement tracking
        await adInteractionService.trackEngagement({
          organizationId,
          visitorId,
          sessionId,
          scrollDepth,
          timeOnPage,
          videoWatchTime,
          videoPercentage,
        });
      } else if (type === 'session_end') {
        // Final session data
        await adInteractionService.trackEngagement({
          organizationId,
          visitorId,
          sessionId,
          scrollDepth,
          timeOnPage,
        });
      } else {
        // Impression tracking
        await adInteractionService.trackImpression({
          organizationId,
          visitorId,
          sessionId,
          utmSource,
          utmMedium,
          utmCampaign,
          landingPage,
          userAgent,
          ipAddress,
        });
      }

      res.sendStatus(200);
    } catch (error) {
      console.error('Impression tracking error:', error);
      res.sendStatus(200); // Don't fail the tracking pixel
    }
  })
);

/**
 * @api {post} /tracking/webhooks/linkedin LinkedIn Lead Gen Webhook
 * Receives lead form submissions from LinkedIn Lead Gen Forms
 */
router.post(
  '/webhooks/linkedin',
  asyncHandler(async (req, res) => {
    const organizationId = req.headers['x-organization-id'] as string;
    const signature = req.headers['x-linkedin-signature'] as string;

    // Verify signature if provided
    if (signature) {
      const isValid = linkedinService.verifyWebhookSignature(
        JSON.stringify(req.body),
        signature
      );
      if (!isValid) {
        console.warn('[LinkedIn Webhook] Invalid signature');
        res.sendStatus(403);
        return;
      }
    }

    // If no organization header, try to find from integration mapping
    let orgId = organizationId;
    if (!orgId && req.body.associatedEntityUrn) {
      const campaignId = req.body.associatedEntityUrn.split(':').pop();
      const campaign = await prisma.adCampaign.findFirst({
        where: { externalId: campaignId, platform: 'LINKEDIN' },
        select: { organizationId: true },
      });
      orgId = campaign?.organizationId || '';
    }

    if (!orgId) {
      console.warn('[LinkedIn Webhook] No organization ID found');
      res.sendStatus(400);
      return;
    }

    await linkedinService.handleWebhook(req.body, orgId);
    res.sendStatus(200);
  })
);

/**
 * @api {get} /tracking/webhooks/linkedin LinkedIn Webhook Verification
 */
router.get(
  '/webhooks/linkedin',
  (req, res) => {
    const challenge = req.query.challenge as string;
    if (challenge) {
      res.send(challenge);
    } else {
      res.sendStatus(200);
    }
  }
);

/**
 * @api {post} /tracking/webhooks/twitter Twitter/X Lead Gen Webhook
 * Receives lead card submissions from Twitter Ads
 */
router.post(
  '/webhooks/twitter',
  asyncHandler(async (req, res) => {
    const organizationId = req.headers['x-organization-id'] as string;
    const signature = req.headers['x-twitter-webhooks-signature'] as string;

    // Handle CRC challenge
    if (req.body.crc_token) {
      const integration = await prisma.twitterAdsIntegration.findFirst({
        where: { organizationId, isActive: true },
      });
      if (integration?.webhookSecret) {
        twitterAdsService.initialize({
          accessToken: integration.accessToken,
          adAccountId: integration.adAccountId,
          webhookSecret: integration.webhookSecret,
        });
        const response = twitterAdsService.handleCrcChallenge(req.body.crc_token);
        res.json({ response_token: response });
        return;
      }
    }

    // Verify signature if provided
    if (signature && organizationId) {
      const integration = await prisma.twitterAdsIntegration.findFirst({
        where: { organizationId, isActive: true },
      });
      if (integration?.webhookSecret) {
        twitterAdsService.initialize({
          accessToken: integration.accessToken,
          adAccountId: integration.adAccountId,
          webhookSecret: integration.webhookSecret,
        });
        const isValid = twitterAdsService.verifyWebhookSignature(
          JSON.stringify(req.body),
          signature
        );
        if (!isValid) {
          console.warn('[Twitter Webhook] Invalid signature');
          res.sendStatus(403);
          return;
        }
      }
    }

    // Find organization from integration if not provided
    let orgId = organizationId;
    if (!orgId && req.body.for_user_id) {
      const integration = await prisma.twitterAdsIntegration.findFirst({
        where: { isActive: true },
        select: { organizationId: true, accessToken: true, adAccountId: true },
      });
      if (integration) {
        orgId = integration.organizationId;
        twitterAdsService.initialize({
          accessToken: integration.accessToken,
          adAccountId: integration.adAccountId,
        });
      }
    }

    if (!orgId) {
      console.warn('[Twitter Webhook] No organization ID found');
      res.sendStatus(400);
      return;
    }

    await twitterAdsService.handleWebhook(req.body, orgId);
    res.sendStatus(200);
  })
);

/**
 * @api {get} /tracking/webhooks/twitter Twitter CRC Verification
 */
router.get(
  '/webhooks/twitter',
  asyncHandler(async (req, res) => {
    const crcToken = req.query.crc_token as string;
    const organizationId = req.query.organization_id as string;

    if (crcToken && organizationId) {
      const integration = await prisma.twitterAdsIntegration.findFirst({
        where: { organizationId, isActive: true },
      });

      if (integration?.webhookSecret) {
        twitterAdsService.initialize({
          accessToken: integration.accessToken,
          adAccountId: integration.adAccountId,
          webhookSecret: integration.webhookSecret,
        });
        const response = twitterAdsService.handleCrcChallenge(crcToken);
        res.json({ response_token: response });
        return;
      }
    }

    res.sendStatus(200);
  })
);

/**
 * @api {post} /tracking/webhooks/tiktok TikTok Instant Form Webhook
 * Receives lead form submissions from TikTok Ads
 */
router.post(
  '/webhooks/tiktok',
  asyncHandler(async (req, res) => {
    const organizationId = req.headers['x-organization-id'] as string;
    const signature = req.headers['x-tiktok-signature'] as string;
    const timestamp = req.headers['x-tiktok-timestamp'] as string;

    // Verify signature if provided
    if (signature && timestamp && organizationId) {
      const integration = await prisma.tikTokAdsIntegration.findFirst({
        where: { organizationId, isActive: true },
      });

      if (integration?.webhookSecret) {
        tiktokAdsService.initialize({
          accessToken: integration.accessToken,
          advertiserId: integration.advertiserId,
          webhookSecret: integration.webhookSecret,
        });

        const isValid = tiktokAdsService.verifyWebhookSignature(
          JSON.stringify(req.body),
          signature,
          timestamp
        );

        if (!isValid) {
          console.warn('[TikTok Webhook] Invalid signature');
          res.sendStatus(403);
          return;
        }
      }
    }

    // Find organization from integration if not provided
    let orgId = organizationId;
    if (!orgId && req.body.advertiser_id) {
      const integration = await prisma.tikTokAdsIntegration.findFirst({
        where: { advertiserId: req.body.advertiser_id, isActive: true },
        select: { organizationId: true, accessToken: true, advertiserId: true },
      });

      if (integration) {
        orgId = integration.organizationId;
        tiktokAdsService.initialize({
          accessToken: integration.accessToken,
          advertiserId: integration.advertiserId,
        });
      }
    }

    if (!orgId) {
      console.warn('[TikTok Webhook] No organization ID found');
      res.sendStatus(400);
      return;
    }

    await tiktokAdsService.handleWebhook(req.body, orgId);
    res.sendStatus(200);
  })
);

/**
 * @api {get} /tracking/webhooks/tiktok TikTok Webhook Verification
 */
router.get(
  '/webhooks/tiktok',
  (req, res) => {
    // TikTok uses a simple GET request to verify the endpoint
    const challenge = req.query.challenge as string;
    if (challenge) {
      res.send(challenge);
    } else {
      res.json({ status: 'ok' });
    }
  }
);

/**
 * @api {post} /tracking/webhooks/youtube YouTube TrueView Lead Webhook
 * Receives lead form submissions from YouTube video campaigns
 */
router.post(
  '/webhooks/youtube',
  asyncHandler(async (req, res) => {
    const organizationId = req.headers['x-organization-id'] as string;

    // Find organization from integration if not provided
    let orgId = organizationId;
    if (!orgId && req.body.campaign_id) {
      const campaign = await prisma.adCampaign.findFirst({
        where: { externalId: req.body.campaign_id, platform: 'YOUTUBE' },
        select: { organizationId: true },
      });
      orgId = campaign?.organizationId || '';
    }

    if (!orgId) {
      // Try to find any active YouTube integration
      const integration = await prisma.youTubeAdsIntegration.findFirst({
        where: { isActive: true },
        select: { organizationId: true, accessToken: true, channelId: true, customerId: true },
      });

      if (integration) {
        orgId = integration.organizationId;
        youtubeAdsService.initialize({
          accessToken: integration.accessToken,
          channelId: integration.channelId,
          customerId: integration.customerId || undefined,
        });
      }
    }

    if (!orgId) {
      console.warn('[YouTube Webhook] No organization ID found');
      res.sendStatus(400);
      return;
    }

    await youtubeAdsService.handleWebhook(req.body, orgId);
    res.sendStatus(200);
  })
);

/**
 * @api {get} /tracking/webhooks/youtube YouTube Webhook Verification
 */
router.get(
  '/webhooks/youtube',
  (req, res) => {
    const challenge = req.query['hub.challenge'] as string;
    if (challenge) {
      res.send(challenge);
    } else {
      res.json({ status: 'ok' });
    }
  }
);

/**
 * AUTHENTICATED ENDPOINTS - Require login
 */

/**
 * @api {get} /tracking/pixel-code Get Tracking Pixel Code
 */
router.get(
  '/pixel-code',
  authenticate,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const baseUrl = process.env.API_URL || `${req.protocol}://${req.get('host')}`;

    const pixelCode = leadTrackingService.generateTrackingPixel(organizationId, baseUrl);

    res.json({
      success: true,
      data: {
        pixelCode,
        instructions: [
          'Copy the code above and paste it into the <head> section of your website.',
          'The pixel will automatically track page views and UTM parameters.',
          'Use window.CRMCaptureLead({ email, phone, firstName, lastName }) to capture leads.',
        ],
      },
    });
  })
);

/**
 * @api {get} /tracking/form-code Get Embeddable Form Code
 */
router.get(
  '/form-code',
  authenticate,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const baseUrl = process.env.API_URL || `${req.protocol}://${req.get('host')}`;
    const { title, fields, buttonText, successMessage, theme } = req.query;

    const formCode = leadTrackingService.generateLeadCaptureForm(organizationId, baseUrl, {
      title: title as string,
      fields: fields ? (fields as string).split(',') : undefined,
      buttonText: buttonText as string,
      successMessage: successMessage as string,
      theme: theme as 'light' | 'dark',
    });

    res.json({
      success: true,
      data: {
        formCode,
        instructions: [
          'Copy the code above and paste it into your landing page or website.',
          'Customize the form by adding query parameters: title, fields, buttonText, successMessage, theme',
          'Available fields: firstName, lastName, email, phone, company, message',
        ],
      },
    });
  })
);

/**
 * @api {get} /tracking/sources Lead Sources Analytics
 */
router.get(
  '/sources',
  authenticate,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const analytics = await leadTrackingService.getLeadSourcesAnalytics(organizationId, { start, end });

    res.json({ success: true, data: analytics });
  })
);

/**
 * @api {get} /tracking/campaigns Campaign Performance
 */
router.get(
  '/campaigns',
  authenticate,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const performance = await leadTrackingService.getCampaignPerformance(organizationId, { start, end });

    res.json({ success: true, data: performance });
  })
);

/**
 * @api {get} /tracking/sources-list Available Lead Sources
 */
router.get(
  '/sources-list',
  authenticate,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: Object.entries(LEAD_SOURCES).map(([key, value]) => ({
        key,
        value,
        label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      })),
    });
  })
);

/**
 * AD INTERACTION ENDPOINTS
 */

/**
 * @api {get} /tracking/ad-interactions Ad Interaction Analytics
 * Get analytics for ad interactions (clicks and conversions)
 */
router.get(
  '/ad-interactions',
  authenticate,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const analytics = await adInteractionService.getAnalytics(organizationId, { start, end });

    res.json({ success: true, data: analytics });
  })
);

/**
 * @api {get} /tracking/ad-interactions/unconverted Get Unconverted Clicks
 * Get ad clicks that haven't converted to leads (for retargeting)
 */
router.get(
  '/ad-interactions/unconverted',
  authenticate,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { days, limit, offset } = req.query;

    const result = await adInteractionService.getUnconvertedClicks({
      organizationId,
      days: days ? parseInt(days as string) : 30,
      limit: limit ? parseInt(limit as string) : 100,
      offset: offset ? parseInt(offset as string) : 0,
    });

    res.json({ success: true, data: result });
  })
);

/**
 * @api {get} /tracking/ad-interactions/lead/:leadId Get Ad Interaction for Lead
 * Get the ad interaction that led to a specific lead
 */
router.get(
  '/ad-interactions/lead/:leadId',
  authenticate,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const { leadId } = req.params;

    const interaction = await adInteractionService.getByLeadId(leadId);

    res.json({ success: true, data: interaction });
  })
);

export default router;
