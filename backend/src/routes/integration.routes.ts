/**
 * Integration Routes
 * API endpoints for managing Calendar, CRM, Payment, and Custom API integrations
 */

import { Router, Response } from 'express';
import { body, param, query } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { prisma } from '../config/database';
import { config } from '../config';
import integrationService from '../services/integration.service';
import { authenticate, authorize } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';

const router = Router();

// Rate limiters for expensive operations
const oauthRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 OAuth requests per minute
  message: { success: false, message: 'Too many OAuth requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const paymentRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 payment operations per minute
  message: { success: false, message: 'Too many payment requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiTestRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 API tests per minute
  message: { success: false, message: 'Too many API test requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply authentication and tenant middleware to all routes
router.use(authenticate);
router.use(tenantMiddleware);

// ==================== CALENDAR INTEGRATION ROUTES ====================

// Get calendar integration status
router.get('/calendar', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId;

    const integrations = await prisma.calendarIntegration.findMany({
      where: { organizationId },
      select: {
        id: true,
        provider: true,
        isActive: true,
        calendarId: true,
        syncEnabled: true,
        autoCreateEvents: true,
        checkAvailability: true,
        lastSyncAt: true,
        lastSyncError: true,
        createdAt: true,
      },
    });

    res.json({ success: true, data: integrations });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get OAuth URL for calendar provider
router.get('/calendar/auth/:provider', oauthRateLimiter, validate([
  param('provider').isIn(['google', 'outlook']).withMessage('Provider must be google or outlook'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const { provider } = req.params;
    const organizationId = req.organizationId;
    const redirectUri = `${process.env.APP_URL}/api/integrations/calendar/callback`;

    if (!organizationId) {
      return res.status(401).json({ success: false, message: 'Organization not found' });
    }

    let authUrl: string;

    if (provider === 'google') {
      authUrl = integrationService.calendar.getGoogleAuthUrl(organizationId, redirectUri);
    } else if (provider === 'outlook') {
      authUrl = integrationService.calendar.getOutlookAuthUrl(organizationId, redirectUri);
    } else {
      return res.status(400).json({ success: false, message: 'Invalid provider' });
    }

    res.json({ success: true, data: { authUrl } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// OAuth callback for calendar (public endpoint for OAuth redirect)
router.get('/calendar/callback', async (req: TenantRequest, res: Response) => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      return res.redirect('/settings/integrations?error=missing_params');
    }

    // SECURITY: Safely parse state with error handling
    let stateData: { organizationId?: string; provider?: string };
    try {
      stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
    } catch {
      console.error('Calendar OAuth: Invalid state parameter');
      return res.redirect('/settings/integrations?error=invalid_state');
    }

    const { organizationId, provider } = stateData;

    // SECURITY: Validate required fields
    if (!organizationId || !provider) {
      return res.redirect('/settings/integrations?error=missing_state_params');
    }

    // SECURITY: Validate provider value
    const validProviders = ['google', 'outlook', 'GOOGLE', 'OUTLOOK'];
    if (!validProviders.includes(provider)) {
      return res.redirect('/settings/integrations?error=invalid_provider');
    }

    const redirectUri = `${process.env.APP_URL}/api/integrations/calendar/callback`;

    await integrationService.calendar.handleOAuthCallback(
      code as string,
      provider.toUpperCase() as 'GOOGLE' | 'OUTLOOK',
      organizationId,
      redirectUri
    );

    res.redirect('/settings/integrations?success=calendar_connected');
  } catch (error: any) {
    console.error('Calendar OAuth error:', error);
    res.redirect('/settings/integrations?error=oauth_failed');
  }
});

// Get available calendar slots
router.get('/calendar/:integrationId/slots', validate([
  param('integrationId').isUUID().withMessage('Invalid integration ID'),
  query('date').isISO8601().withMessage('Valid date is required'),
  query('duration').optional().isInt({ min: 5, max: 480 }).withMessage('Duration must be 5-480 minutes'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const { integrationId } = req.params;
    const { date, duration } = req.query;
    const organizationId = req.organizationId;

    // SECURITY: Verify integration belongs to user's organization
    const integration = await prisma.calendarIntegration.findFirst({
      where: { id: integrationId, organizationId },
    });

    if (!integration) {
      return res.status(404).json({ success: false, message: 'Calendar integration not found' });
    }

    const slots = await integrationService.calendar.getAvailableSlots(
      integrationId,
      new Date(date as string),
      parseInt(duration as string) || 30
    );

    res.json({ success: true, data: slots });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Book appointment
router.post('/calendar/:integrationId/book', validate([
  param('integrationId').isUUID().withMessage('Invalid integration ID'),
  body('title').trim().notEmpty().withMessage('Title is required')
    .isLength({ max: 200 }).withMessage('Title must be at most 200 characters'),
  body('description').optional().trim().isLength({ max: 2000 }).withMessage('Description must be at most 2000 characters'),
  body('startTime').isISO8601().withMessage('Valid start time is required'),
  body('endTime').isISO8601().withMessage('Valid end time is required'),
  body('attendeeEmail').optional().isEmail().withMessage('Valid attendee email is required'),
  body('attendeeName').optional().trim().isLength({ max: 100 }).withMessage('Attendee name must be at most 100 characters'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const { integrationId } = req.params;
    const { title, description, startTime, endTime, attendeeEmail, attendeeName } = req.body;
    const organizationId = req.organizationId;

    // SECURITY: Verify integration belongs to user's organization
    const integration = await prisma.calendarIntegration.findFirst({
      where: { id: integrationId, organizationId },
    });

    if (!integration) {
      return res.status(404).json({ success: false, message: 'Calendar integration not found' });
    }

    const event = await integrationService.calendar.bookAppointment(integrationId, {
      title,
      description,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      attendeeEmail,
      attendeeName,
    });

    res.json({ success: true, data: event });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Disconnect calendar
router.delete('/calendar/:integrationId', validate([
  param('integrationId').isUUID().withMessage('Invalid integration ID'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const { integrationId } = req.params;
    const organizationId = req.organizationId;

    // SECURITY: Verify integration exists and belongs to organization before delete
    const integration = await prisma.calendarIntegration.findFirst({
      where: { id: integrationId, organizationId },
    });

    if (!integration) {
      return res.status(404).json({ success: false, message: 'Calendar integration not found' });
    }

    await prisma.calendarIntegration.delete({
      where: { id: integrationId },
    });

    res.json({ success: true, message: 'Calendar disconnected' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== CRM INTEGRATION ROUTES ====================

// Get CRM integrations
router.get('/crm', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId;

    const integrations = await prisma.crmIntegration.findMany({
      where: { organizationId },
      select: {
        id: true,
        type: true,
        isActive: true,
        lastSyncAt: true,
        lastSyncError: true,
        syncCount: true,
        createdAt: true,
      },
    });

    res.json({ success: true, data: integrations });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create/Update CRM integration
router.post('/crm', authorize('admin', 'manager'), validate([
  body('id').optional().isUUID().withMessage('Invalid integration ID'),
  body('name').optional().trim().isLength({ max: 200 }).withMessage('Name must be at most 200 characters'),
  body('type').trim().notEmpty().withMessage('CRM type is required')
    .isIn(['SALESFORCE', 'HUBSPOT', 'ZOHO', 'CUSTOM', 'LEADSQUARED', 'FRESHSALES']).withMessage('Invalid CRM type'),
  body('webhookUrl').optional().isURL().withMessage('Valid webhook URL is required'),
  body('apiKey').optional().isString().withMessage('API key must be a string'),
  body('fieldMappings').optional().isArray().withMessage('Field mappings must be an array'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId;
    if (!organizationId) {
      return res.status(401).json({ success: false, message: 'Organization not found' });
    }
    const { id, name, type, webhookUrl, apiKey, fieldMappings } = req.body;

    // If updating, verify ownership first
    if (id) {
      const existing = await prisma.crmIntegration.findFirst({
        where: { id, organizationId },
      });
      if (!existing) {
        return res.status(404).json({ success: false, message: 'CRM integration not found' });
      }
    }

    const integration = await prisma.crmIntegration.upsert({
      where: {
        id: id || 'new',
      },
      create: {
        organizationId,
        name: name || `${type} Integration`,
        type,
        webhookUrl,
        apiKey: apiKey ? integrationService.encrypt(apiKey) : null,
        fieldMappings: fieldMappings || [],
        isActive: true,
      },
      update: {
        name,
        type,
        webhookUrl,
        apiKey: apiKey ? integrationService.encrypt(apiKey) : undefined,
        fieldMappings: fieldMappings || undefined,
      },
    });

    res.json({ success: true, data: integration });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Lookup lead in CRM
router.get('/crm/:integrationId/lookup', validate([
  param('integrationId').isUUID().withMessage('Invalid integration ID'),
  query('phone').trim().notEmpty().withMessage('Phone number is required')
    .matches(/^[\d+\-() ]{7,20}$/).withMessage('Invalid phone number format'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const { integrationId } = req.params;
    const { phone } = req.query;
    const organizationId = req.organizationId;

    // SECURITY: Verify integration belongs to user's organization
    const integration = await prisma.crmIntegration.findFirst({
      where: { id: integrationId, organizationId },
    });

    if (!integration) {
      return res.status(404).json({ success: false, message: 'CRM integration not found' });
    }

    const lead = await integrationService.crm.lookupLead(integrationId, phone as string);

    res.json({ success: true, data: lead });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create lead in CRM
router.post('/crm/:integrationId/create-lead', validate([
  param('integrationId').isUUID().withMessage('Invalid integration ID'),
  body('firstName').optional().trim().isLength({ max: 100 }).withMessage('First name must be at most 100 characters'),
  body('lastName').optional().trim().isLength({ max: 100 }).withMessage('Last name must be at most 100 characters'),
  body('phone').optional().matches(/^[\d+\-() ]{7,20}$/).withMessage('Invalid phone number format'),
  body('email').optional().isEmail().withMessage('Invalid email format'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const { integrationId } = req.params;
    const { firstName, lastName, phone, email, ...otherFields } = req.body;
    const organizationId = req.organizationId;

    // SECURITY: Verify integration belongs to user's organization
    const integration = await prisma.crmIntegration.findFirst({
      where: { id: integrationId, organizationId },
    });

    if (!integration) {
      return res.status(404).json({ success: false, message: 'CRM integration not found' });
    }

    // SECURITY: Construct safe lead data with explicit fields
    const leadData = {
      firstName,
      lastName,
      phone,
      email,
      ...otherFields,
    };

    const result = await integrationService.crm.createLead(integrationId, leadData);

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete CRM integration
router.delete('/crm/:integrationId', authorize('admin', 'manager'), validate([
  param('integrationId').isUUID().withMessage('Invalid integration ID'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const { integrationId } = req.params;
    const organizationId = req.organizationId;

    // SECURITY: Verify integration exists and belongs to organization before delete
    const integration = await prisma.crmIntegration.findFirst({
      where: { id: integrationId, organizationId },
    });

    if (!integration) {
      return res.status(404).json({ success: false, message: 'CRM integration not found' });
    }

    await prisma.crmIntegration.delete({
      where: { id: integrationId },
    });

    res.json({ success: true, message: 'CRM integration deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== PAYMENT INTEGRATION ROUTES ====================

// Get payment integrations
router.get('/payment', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId;

    const integrations = await prisma.paymentIntegration.findMany({
      where: { organizationId },
      select: {
        id: true,
        provider: true,
        isActive: true,
        isConnected: true,
        currency: true,
        testMode: true,
        lastVerifiedAt: true,
        createdAt: true,
      },
    });

    res.json({ success: true, data: integrations });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create/Update payment integration
router.post('/payment', authorize('admin', 'manager'), paymentRateLimiter, validate([
  body('provider').trim().notEmpty().withMessage('Payment provider is required')
    .isIn(['RAZORPAY', 'STRIPE', 'PAYPAL', 'CASHFREE', 'PAYTM']).withMessage('Invalid payment provider'),
  body('apiKey').optional().isString().isLength({ max: 500 }).withMessage('API key must be at most 500 characters'),
  body('apiSecret').optional().isString().isLength({ max: 500 }).withMessage('API secret must be at most 500 characters'),
  body('webhookSecret').optional().isString().isLength({ max: 500 }).withMessage('Webhook secret must be at most 500 characters'),
  body('merchantId').optional().trim().isLength({ max: 100 }).withMessage('Merchant ID must be at most 100 characters'),
  body('currency').optional().isLength({ min: 3, max: 3 }).withMessage('Currency must be a 3-letter code'),
  body('testMode').optional().isBoolean().withMessage('Test mode must be a boolean'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId;
    if (!organizationId) {
      return res.status(401).json({ success: false, message: 'Organization not found' });
    }
    const { provider, apiKey, apiSecret, webhookSecret, merchantId, currency, testMode } = req.body;

    const integration = await prisma.paymentIntegration.upsert({
      where: {
        organizationId_provider: { organizationId, provider },
      },
      create: {
        organizationId,
        provider,
        apiKey: apiKey ? integrationService.encrypt(apiKey) : null,
        apiSecret: apiSecret ? integrationService.encrypt(apiSecret) : null,
        webhookSecret: webhookSecret ? integrationService.encrypt(webhookSecret) : null,
        merchantId,
        currency: currency || 'INR',
        testMode: testMode || false,
        isConnected: true,
      },
      update: {
        apiKey: apiKey ? integrationService.encrypt(apiKey) : undefined,
        apiSecret: apiSecret ? integrationService.encrypt(apiSecret) : undefined,
        webhookSecret: webhookSecret ? integrationService.encrypt(webhookSecret) : undefined,
        merchantId,
        currency,
        testMode,
        isConnected: true,
        lastVerifiedAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: {
        id: integration.id,
        provider: integration.provider,
        isConnected: integration.isConnected,
        currency: integration.currency,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create payment link
router.post('/payment/:integrationId/create-link', paymentRateLimiter, validate([
  param('integrationId').isUUID().withMessage('Invalid integration ID'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
  body('currency').optional().isLength({ min: 3, max: 3 }).withMessage('Currency must be a 3-letter code'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be at most 500 characters'),
  body('customerName').optional().trim().isLength({ max: 100 }).withMessage('Customer name must be at most 100 characters'),
  body('customerPhone').optional().matches(/^[\d+\-() ]{7,20}$/).withMessage('Invalid phone number format'),
  body('customerEmail').optional().isEmail().withMessage('Invalid email format'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const { integrationId } = req.params;
    const { amount, currency, description, customerName, customerPhone, customerEmail } = req.body;
    const organizationId = req.organizationId;

    // SECURITY: Verify integration belongs to user's organization
    const integration = await prisma.paymentIntegration.findFirst({
      where: { id: integrationId, organizationId },
    });

    if (!integration) {
      return res.status(404).json({ success: false, message: 'Payment integration not found' });
    }

    const paymentLink = await integrationService.payment.createPaymentLink(integrationId, {
      amount,
      currency,
      description,
      customerName,
      customerPhone,
      customerEmail,
    });

    res.json({ success: true, data: paymentLink });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Payment webhook callback (public endpoint - webhooks don't have auth)
// Note: This endpoint should verify webhook signatures for security
router.post('/payment/webhook/:provider', validate([
  param('provider').isIn(['razorpay', 'stripe', 'paypal', 'cashfree', 'paytm']).withMessage('Invalid payment provider'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const { provider } = req.params;

    // Verify webhook signature based on provider
    if (provider === 'razorpay') {
      const signature = req.headers['x-razorpay-signature'] as string;
      if (!signature) {
        return res.status(401).json({ success: false, message: 'Missing signature' });
      }
      // TODO: Verify signature with razorpay webhook secret
      console.log('Razorpay webhook received');
    } else if (provider === 'stripe') {
      const signature = req.headers['stripe-signature'] as string;
      if (!signature) {
        return res.status(401).json({ success: false, message: 'Missing signature' });
      }
      // TODO: Verify signature with stripe webhook secret
      console.log('Stripe webhook received');
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete payment integration
router.delete('/payment/:integrationId', authorize('admin', 'manager'), validate([
  param('integrationId').isUUID().withMessage('Invalid integration ID'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const { integrationId } = req.params;
    const organizationId = req.organizationId;

    // SECURITY: Verify integration exists and belongs to organization before delete
    const integration = await prisma.paymentIntegration.findFirst({
      where: { id: integrationId, organizationId },
    });

    if (!integration) {
      return res.status(404).json({ success: false, message: 'Payment integration not found' });
    }

    await prisma.paymentIntegration.delete({
      where: { id: integrationId },
    });

    res.json({ success: true, message: 'Payment integration deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== CUSTOM API ENDPOINT ROUTES ====================

// Get custom API endpoints
router.get('/custom-api', validate([
  query('voiceAgentId').optional().isUUID().withMessage('Invalid voice agent ID'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId;
    const { voiceAgentId } = req.query;

    // SECURITY: If voiceAgentId provided, verify it belongs to organization
    if (voiceAgentId) {
      const agent = await prisma.voiceAgent.findFirst({
        where: { id: voiceAgentId as string, organizationId },
      });
      if (!agent) {
        return res.status(404).json({ success: false, message: 'Voice agent not found' });
      }
    }

    const endpoints = await prisma.customApiEndpoint.findMany({
      where: {
        organizationId,
        ...(voiceAgentId && { voiceAgentId: voiceAgentId as string }),
      },
      select: {
        id: true,
        name: true,
        url: true,
        method: true,
        trigger: true,
        triggerKeywords: true,
        isActive: true,
        lastCalledAt: true,
        callCount: true,
        lastError: true,
        createdAt: true,
      },
    });

    res.json({ success: true, data: endpoints });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create custom API endpoint
router.post('/custom-api', validate([
  body('voiceAgentId').optional().isUUID().withMessage('Invalid voice agent ID'),
  body('name').trim().notEmpty().withMessage('Name is required')
    .isLength({ max: 200 }).withMessage('Name must be at most 200 characters'),
  body('url').isURL().withMessage('Valid URL is required'),
  body('method').optional().isIn(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).withMessage('Invalid HTTP method'),
  body('headers').optional().isObject().withMessage('Headers must be an object'),
  body('authType').optional().isIn(['NONE', 'BEARER', 'API_KEY', 'BASIC']).withMessage('Invalid auth type'),
  body('authValue').optional().isString().isLength({ max: 1000 }).withMessage('Auth value must be at most 1000 characters'),
  body('trigger').optional().isIn(['ALWAYS', 'KEYWORD', 'INTENT']).withMessage('Invalid trigger type'),
  body('triggerKeywords').optional().isArray().withMessage('Trigger keywords must be an array'),
  body('parseResponse').optional().isBoolean().withMessage('parseResponse must be a boolean'),
  body('responseMapping').optional().isObject().withMessage('Response mapping must be an object'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId;
    if (!organizationId) {
      return res.status(401).json({ success: false, message: 'Organization not found' });
    }
    const {
      voiceAgentId,
      name,
      url,
      method,
      headers,
      authType,
      authValue,
      trigger,
      triggerKeywords,
      parseResponse,
      responseMapping,
    } = req.body;

    // SECURITY: If voiceAgentId provided, verify it belongs to organization
    if (voiceAgentId) {
      const agent = await prisma.voiceAgent.findFirst({
        where: { id: voiceAgentId, organizationId },
      });
      if (!agent) {
        return res.status(404).json({ success: false, message: 'Voice agent not found' });
      }
    }

    const endpoint = await prisma.customApiEndpoint.create({
      data: {
        organizationId,
        voiceAgentId,
        name,
        url,
        method: method || 'POST',
        headers: headers || {},
        authType,
        authValue: authValue ? integrationService.encrypt(authValue) : null,
        trigger,
        triggerKeywords: triggerKeywords || [],
        parseResponse: parseResponse || false,
        responseMapping: responseMapping || {},
        isActive: true,
      },
    });

    res.json({ success: true, data: endpoint });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update custom API endpoint
// SECURITY FIX: Extract specific fields instead of spreading req.body
router.put('/custom-api/:endpointId', validate([
  param('endpointId').isUUID().withMessage('Invalid endpoint ID'),
  body('name').optional().trim().notEmpty().isLength({ max: 200 }).withMessage('Name must be at most 200 characters'),
  body('url').optional().isURL().withMessage('Valid URL is required'),
  body('method').optional().isIn(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).withMessage('Invalid HTTP method'),
  body('headers').optional().isObject().withMessage('Headers must be an object'),
  body('authType').optional().isIn(['NONE', 'BEARER', 'API_KEY', 'BASIC']).withMessage('Invalid auth type'),
  body('authValue').optional().isString().isLength({ max: 1000 }).withMessage('Auth value must be at most 1000 characters'),
  body('trigger').optional().isIn(['ALWAYS', 'KEYWORD', 'INTENT']).withMessage('Invalid trigger type'),
  body('triggerKeywords').optional().isArray().withMessage('Trigger keywords must be an array'),
  body('parseResponse').optional().isBoolean().withMessage('parseResponse must be a boolean'),
  body('responseMapping').optional().isObject().withMessage('Response mapping must be an object'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const { endpointId } = req.params;
    const organizationId = req.organizationId;

    // SECURITY: Verify endpoint exists and belongs to organization
    const existingEndpoint = await prisma.customApiEndpoint.findFirst({
      where: { id: endpointId, organizationId },
    });

    if (!existingEndpoint) {
      return res.status(404).json({ success: false, message: 'Endpoint not found' });
    }

    // SECURITY: Extract only allowed fields - NO direct req.body spread
    const {
      name,
      url,
      method,
      headers,
      authType,
      authValue,
      trigger,
      triggerKeywords,
      parseResponse,
      responseMapping,
      isActive,
    } = req.body;

    // Build update data with only provided fields
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (url !== undefined) updateData.url = url;
    if (method !== undefined) updateData.method = method;
    if (headers !== undefined) updateData.headers = headers;
    if (authType !== undefined) updateData.authType = authType;
    if (authValue !== undefined) updateData.authValue = integrationService.encrypt(authValue);
    if (trigger !== undefined) updateData.trigger = trigger;
    if (triggerKeywords !== undefined) updateData.triggerKeywords = triggerKeywords;
    if (parseResponse !== undefined) updateData.parseResponse = parseResponse;
    if (responseMapping !== undefined) updateData.responseMapping = responseMapping;
    if (isActive !== undefined) updateData.isActive = isActive;

    const endpoint = await prisma.customApiEndpoint.update({
      where: { id: endpointId },
      data: updateData,
    });

    res.json({ success: true, data: endpoint });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Test custom API endpoint
router.post('/custom-api/:endpointId/test', apiTestRateLimiter, validate([
  param('endpointId').isUUID().withMessage('Invalid endpoint ID'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const { endpointId } = req.params;
    const organizationId = req.organizationId;

    // SECURITY: Verify endpoint belongs to user's organization
    const endpoint = await prisma.customApiEndpoint.findFirst({
      where: { id: endpointId, organizationId },
    });

    if (!endpoint) {
      return res.status(404).json({ success: false, message: 'Endpoint not found' });
    }

    // Only pass safe test data fields
    const { testPayload } = req.body;
    const result = await integrationService.customApi.callEndpoint(endpointId, testPayload || {});

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete custom API endpoint
router.delete('/custom-api/:endpointId', validate([
  param('endpointId').isUUID().withMessage('Invalid endpoint ID'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const { endpointId } = req.params;
    const organizationId = req.organizationId;

    // SECURITY: Verify endpoint exists and belongs to organization before delete
    const endpoint = await prisma.customApiEndpoint.findFirst({
      where: { id: endpointId, organizationId },
    });

    if (!endpoint) {
      return res.status(404).json({ success: false, message: 'Endpoint not found' });
    }

    await prisma.customApiEndpoint.delete({
      where: { id: endpointId },
    });

    res.json({ success: true, message: 'Endpoint deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== AGENT INTEGRATION ROUTES ====================

// Get integrations for a voice agent
router.get('/agent/:voiceAgentId', validate([
  param('voiceAgentId').isUUID().withMessage('Invalid voice agent ID'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const { voiceAgentId } = req.params;
    const organizationId = req.organizationId;

    // SECURITY: Verify agent belongs to user's organization
    const agent = await prisma.voiceAgent.findFirst({
      where: { id: voiceAgentId, organizationId },
    });

    if (!agent) {
      return res.status(404).json({ success: false, message: 'Voice agent not found' });
    }

    const integrations = await integrationService.agentIntegration.getAgentIntegrations(voiceAgentId);

    res.json({ success: true, data: integrations });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Enable/disable integration for agent
router.post('/agent/:voiceAgentId/toggle', validate([
  param('voiceAgentId').isUUID().withMessage('Invalid voice agent ID'),
  body('integrationType').trim().notEmpty().withMessage('Integration type is required')
    .isIn(['CALENDAR', 'CRM', 'PAYMENT', 'SHEETS', 'CUSTOM_API']).withMessage('Invalid integration type'),
  body('enabled').isBoolean().withMessage('Enabled must be a boolean'),
  body('config').optional().isObject().withMessage('Config must be an object'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const { voiceAgentId } = req.params;
    const { integrationType, enabled, config } = req.body;
    const organizationId = req.organizationId;

    // SECURITY: Verify agent belongs to user's organization
    const agent = await prisma.voiceAgent.findFirst({
      where: { id: voiceAgentId, organizationId },
    });

    if (!agent) {
      return res.status(404).json({ success: false, message: 'Voice agent not found' });
    }

    const result = await integrationService.agentIntegration.toggleIntegration(
      voiceAgentId,
      integrationType,
      enabled,
      config
    );

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Link specific integration to agent
router.post('/agent/:voiceAgentId/link', validate([
  param('voiceAgentId').isUUID().withMessage('Invalid voice agent ID'),
  body('integrationType').trim().notEmpty().withMessage('Integration type is required')
    .isIn(['CALENDAR', 'CRM', 'PAYMENT', 'SHEETS', 'CUSTOM_API']).withMessage('Invalid integration type'),
  body('integrationId').isUUID().withMessage('Invalid integration ID'),
  body('config').optional().isObject().withMessage('Config must be an object'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const { voiceAgentId } = req.params;
    const { integrationType, integrationId, config } = req.body;
    const organizationId = req.organizationId;

    // SECURITY: Verify agent belongs to user's organization
    const agent = await prisma.voiceAgent.findFirst({
      where: { id: voiceAgentId, organizationId },
    });

    if (!agent) {
      return res.status(404).json({ success: false, message: 'Voice agent not found' });
    }

    const result = await integrationService.agentIntegration.linkIntegration(
      voiceAgentId,
      integrationType,
      integrationId,
      config
    );

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== GOOGLE OAUTH FOR AGENT TOOLS ====================

// Google OAuth initiation for agent tools (calendar, sheets, etc.)
router.get('/google/auth', oauthRateLimiter, validate([
  query('tool').isIn(['calendar', 'sheets']).withMessage('Tool must be calendar or sheets'),
  query('agentId').isUUID().withMessage('Invalid agent ID'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const { tool, agentId } = req.query;
    const organizationId = req.organizationId;

    // SECURITY: Verify agent belongs to user's organization
    const agent = await prisma.voiceAgent.findFirst({
      where: { id: agentId as string, organizationId },
    });

    if (!agent) {
      return res.status(404).json({ success: false, message: 'Voice agent not found' });
    }

    // Define scopes based on tool type
    const scopesByTool: Record<string, string[]> = {
      calendar: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
      ],
      sheets: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file',
      ],
    };

    const scopes = scopesByTool[tool as string] || scopesByTool.calendar;

    // Google OAuth configuration
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = `${config.baseUrl}/api/integrations/google/callback`;

    if (!clientId) {
      return res.status(500).json({
        success: false,
        message: 'Google OAuth not configured. Please set GOOGLE_CLIENT_ID environment variable.'
      });
    }

    // Create state with tool, agentId, and organizationId for callback
    const state = Buffer.from(JSON.stringify({
      tool,
      agentId,
      organizationId,
    })).toString('base64');

    // Build Google OAuth URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopes.join(' '));
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');

    // Redirect to Google OAuth page
    res.redirect(authUrl.toString());
  } catch (error: any) {
    console.error('Google OAuth initiation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Google OAuth callback for agent tools (public endpoint for OAuth redirect)
router.get('/google/callback', async (req: TenantRequest, res: Response) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  try {
    const { code, state, error } = req.query;

    // Handle OAuth errors
    if (error) {
      console.error('Google OAuth error:', error);
      return res.redirect(`${frontendUrl}/voice-ai/agents?error=oauth_denied`);
    }

    if (!code || !state) {
      return res.redirect(`${frontendUrl}/voice-ai/agents?error=missing_params`);
    }

    // SECURITY: Safely decode and parse state with error handling
    let stateData: { tool?: string; agentId?: string; organizationId?: string };
    try {
      stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
    } catch {
      console.error('Google OAuth: Invalid state parameter');
      return res.redirect(`${frontendUrl}/voice-ai/agents?error=invalid_state`);
    }

    const { tool, agentId } = stateData;
    let { organizationId } = stateData;

    // SECURITY: Validate required fields from state
    if (!tool || !agentId) {
      console.error('Google OAuth: Missing required state fields');
      return res.redirect(`${frontendUrl}/voice-ai/agents?error=invalid_state`);
    }

    // SECURITY: Validate tool value
    if (!['calendar', 'sheets'].includes(tool)) {
      console.error('Google OAuth: Invalid tool in state');
      return res.redirect(`${frontendUrl}/voice-ai/agents?error=invalid_tool`);
    }

    // If organizationId is missing, get it from the agent
    if (!organizationId && agentId) {
      const agent = await prisma.voiceAgent.findUnique({
        where: { id: agentId },
        select: { organizationId: true },
      });
      organizationId = agent?.organizationId;
    }

    if (!organizationId) {
      console.error('[GoogleOAuth] Could not determine organizationId');
      return res.redirect(`${frontendUrl}/voice-ai/agents?error=missing_org`);
    }

    // Exchange code for tokens
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${config.baseUrl}/api/integrations/google/callback`;

    if (!clientId || !clientSecret) {
      return res.redirect(`${frontendUrl}/voice-ai/agents?error=oauth_not_configured`);
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: code as string,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json() as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      error?: string;
    };

    if (tokens.error || !tokens.access_token || !tokens.expires_in) {
      console.error('Token exchange error:', tokens);
      return res.redirect(`${frontendUrl}/voice-ai/agents?error=token_exchange_failed`);
    }

    // Store integration based on tool type
    if (tool === 'calendar') {
      // Get user's calendar info
      const calendarResponse = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList/primary', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const calendarInfo = await calendarResponse.json() as { id?: string };

      // Create or update calendar integration
      const existingCalendar = await prisma.calendarIntegration.findFirst({
        where: {
          organizationId,
          provider: 'GOOGLE',
        },
      });

      if (existingCalendar) {
        await prisma.calendarIntegration.update({
          where: { id: existingCalendar.id },
          data: {
            accessToken: integrationService.encrypt(tokens.access_token),
            refreshToken: tokens.refresh_token ? integrationService.encrypt(tokens.refresh_token) : undefined,
            tokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
            calendarId: calendarInfo.id || 'primary',
            isActive: true,
            lastSyncAt: new Date(),
          },
        });
      } else {
        await prisma.calendarIntegration.create({
          data: {
            organizationId,
            provider: 'GOOGLE',
            accessToken: integrationService.encrypt(tokens.access_token),
            refreshToken: tokens.refresh_token ? integrationService.encrypt(tokens.refresh_token) : null,
            tokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
            calendarId: calendarInfo.id || 'primary',
            isActive: true,
            syncEnabled: true,
            autoCreateEvents: true,
            checkAvailability: true,
          },
        });
      }

      // Link calendar integration to agent via AgentIntegration
      // Check if an agent integration already exists
      const existingIntegration = await prisma.agentIntegration.findFirst({
        where: {
          voiceAgentId: agentId,
          integrationType: 'CALENDAR',
        },
      });

      const calendarIntegration = await prisma.calendarIntegration.findFirst({
        where: {
          organizationId,
          provider: 'GOOGLE',
        },
      });

      if (calendarIntegration) {
        if (existingIntegration) {
          // Update existing
          await prisma.agentIntegration.update({
            where: { id: existingIntegration.id },
            data: {
              calendarIntegrationId: calendarIntegration.id,
              isEnabled: true,
              config: {
                connected: true,
                connectedAt: new Date().toISOString(),
              },
            },
          });
        } else {
          // Create new
          await prisma.agentIntegration.create({
            data: {
              voiceAgentId: agentId,
              organizationId,
              integrationType: 'CALENDAR',
              calendarIntegrationId: calendarIntegration.id,
              isEnabled: true,
              config: {
                connected: true,
                connectedAt: new Date().toISOString(),
              },
            },
          });
        }
      }

      console.log('[GoogleOAuth] Calendar integration saved successfully for agent:', agentId);
    } else if (tool === 'sheets') {
      // Store sheets integration in metadata
      const agent = await prisma.voiceAgent.findUnique({
        where: { id: agentId },
        select: { metadata: true },
      });

      if (agent) {
        const currentMetadata = (agent.metadata as Record<string, any>) || {};
        const toolsConfig = currentMetadata.toolsConfig || {};
        toolsConfig.sheets = {
          enabled: true,
          provider: 'google',
          connected: true,
          connectedAt: new Date().toISOString(),
          accessToken: integrationService.encrypt(tokens.access_token),
          refreshToken: tokens.refresh_token ? integrationService.encrypt(tokens.refresh_token) : null,
        };

        await prisma.voiceAgent.update({
          where: { id: agentId },
          data: { metadata: { ...currentMetadata, toolsConfig } },
        });
      }
    }

    // Send a page that closes the popup and notifies the parent window
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Connected!</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center; }
          .container { background: white; padding: 40px; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); color: #333; max-width: 400px; }
          h2 { color: #22c55e; margin-bottom: 16px; }
          p { color: #666; margin-bottom: 24px; }
          .checkmark { width: 80px; height: 80px; background: #22c55e; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
          .checkmark svg { width: 40px; height: 40px; fill: white; }
          .btn { background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 16px; }
          .btn:hover { background: #2563eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="checkmark">
            <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
          </div>
          <h2>Google Calendar Connected!</h2>
          <p>Your calendar has been successfully linked to your AI agent.</p>
          <button class="btn" onclick="closeWindow()">Close This Window</button>
          <p style="font-size: 12px; color: #999; margin-top: 16px;">Window will close automatically in 3 seconds...</p>
        </div>
        <script>
          function closeWindow() {
            try {
              // Notify parent window
              if (window.opener && !window.opener.closed) {
                window.opener.postMessage({ type: 'oauth_success', tool: '${tool}' }, '${frontendUrl}');
                // Refresh parent page to show connected status
                window.opener.location.href = '${frontendUrl}/voice-ai/agents/${agentId}?tab=tools&tool_connected=${tool}';
              }
            } catch (e) {
              console.log('Could not communicate with parent window:', e);
            }
            // Try to close the window
            window.close();
            // If window.close() didn't work, show a message
            setTimeout(function() {
              document.body.innerHTML = '<div class="container"><h2>You can close this window now</h2><p>The calendar has been connected successfully!</p></div>';
            }, 500);
          }
          // Auto-close after 3 seconds
          setTimeout(closeWindow, 3000);
        </script>
      </body>
      </html>
    `);
  } catch (error: any) {
    console.error('Google OAuth callback error:', error);
    res.redirect(`${frontendUrl}/voice-ai/agents?error=oauth_failed`);
  }
});

// Check Google OAuth connection status for a tool
router.get('/google/status', validate([
  query('tool').isIn(['calendar', 'sheets']).withMessage('Tool must be calendar or sheets'),
  query('agentId').isUUID().withMessage('Invalid agent ID'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const { tool, agentId } = req.query;
    const organizationId = req.organizationId;

    // SECURITY: Verify agent belongs to user's organization
    const agent = await prisma.voiceAgent.findFirst({
      where: { id: agentId as string, organizationId },
    });

    if (!agent) {
      return res.status(404).json({ success: false, message: 'Voice agent not found' });
    }

    let connected = false;
    let connectionInfo: any = null;

    if (tool === 'calendar') {
      const integration = await prisma.calendarIntegration.findFirst({
        where: { organizationId, provider: 'GOOGLE', isActive: true },
      });
      connected = !!integration;
      connectionInfo = integration ? {
        calendarId: integration.calendarId,
        lastSyncAt: integration.lastSyncAt,
      } : null;
    } else if (tool === 'sheets') {
      const convAgent = await prisma.voiceAgent.findFirst({
        where: { id: agentId as string, organizationId },
        select: { metadata: true },
      });
      const metadata = (convAgent?.metadata as Record<string, any>) || {};
      const toolsConfig = metadata.toolsConfig || {};
      connected = toolsConfig.sheets?.connected || false;
      // Don't expose sensitive token info
      connectionInfo = toolsConfig.sheets ? {
        connected: toolsConfig.sheets.connected,
        connectedAt: toolsConfig.sheets.connectedAt,
      } : null;
    }

    res.json({
      success: true,
      data: {
        connected,
        connectionInfo,
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Force reset calendar integration (completely delete for fresh OAuth)
router.delete('/google/reset', authorize('admin', 'manager'), validate([
  query('tool').isIn(['calendar', 'sheets']).withMessage('Tool must be calendar or sheets'),
  query('agentId').optional().isUUID().withMessage('Invalid agent ID'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const { tool } = req.query;
    const organizationId = req.organizationId;

    if (tool === 'calendar') {
      // Get the calendar integration first - already scoped to organization
      const calendarIntegration = await prisma.calendarIntegration.findFirst({
        where: { organizationId, provider: 'GOOGLE' },
      });

      if (calendarIntegration) {
        // Delete related agent integrations first
        await prisma.agentIntegration.deleteMany({
          where: { calendarIntegrationId: calendarIntegration.id },
        });

        // Then delete the calendar integration
        await prisma.calendarIntegration.delete({
          where: { id: calendarIntegration.id },
        });
      }

      console.log('[GoogleOAuth] Calendar integration reset successfully for org:', organizationId);
    }

    res.json({ success: true, message: `${tool} integration has been completely reset. Please reconnect.` });
  } catch (error: any) {
    console.error('Google OAuth reset error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Disconnect Google OAuth for a tool
router.delete('/google/disconnect', validate([
  query('tool').isIn(['calendar', 'sheets']).withMessage('Tool must be calendar or sheets'),
  query('agentId').isUUID().withMessage('Invalid agent ID'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const { tool, agentId } = req.query;
    const organizationId = req.organizationId;

    // SECURITY: Verify agent belongs to user's organization
    const voiceAgent = await prisma.voiceAgent.findFirst({
      where: { id: agentId as string, organizationId },
    });

    if (!voiceAgent) {
      return res.status(404).json({ success: false, message: 'Voice agent not found' });
    }

    if (tool === 'calendar') {
      await prisma.calendarIntegration.updateMany({
        where: { organizationId, provider: 'GOOGLE' },
        data: { isActive: false },
      });
    }

    // Update agent tools config in metadata - verify ownership first
    const agent = await prisma.voiceAgent.findFirst({
      where: { id: agentId as string, organizationId },
      select: { id: true, metadata: true },
    });

    if (agent) {
      const currentMetadata = (agent.metadata as Record<string, any>) || {};
      const toolsConfig = currentMetadata.toolsConfig || {};
      if (toolsConfig[tool as string]) {
        toolsConfig[tool as string] = {
          ...toolsConfig[tool as string],
          connected: false,
          disconnectedAt: new Date().toISOString(),
        };
      }

      await prisma.voiceAgent.update({
        where: { id: agent.id },
        data: { metadata: { ...currentMetadata, toolsConfig } },
      });
    }

    res.json({ success: true, message: `${tool} disconnected successfully` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
