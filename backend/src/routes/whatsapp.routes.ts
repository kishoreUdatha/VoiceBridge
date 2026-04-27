/**
 * WhatsApp Routes
 * Handles WhatsApp Business API integration - Templates, Messages, Webhooks
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, query } from 'express-validator';
import axios from 'axios';
import crypto from 'crypto';
import { prisma } from '../config/database';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import { createWhatsAppService } from '../integrations/whatsapp.service';

const router = Router();

// ============ Webhook Signature Validation ============

/**
 * Gets App Secret for a phone number from organization settings
 * Falls back to environment variable if not found
 */
async function getAppSecretForPhoneNumber(phoneNumberId: string): Promise<string | null> {
  try {
    // Find organization with this phone number configured
    const orgs = await prisma.organization.findMany({
      where: {
        settings: {
          path: ['whatsapp', 'phoneNumberId'],
          equals: phoneNumberId
        }
      },
      select: { settings: true }
    });

    if (orgs.length > 0) {
      const settings = orgs[0].settings as any;
      if (settings?.whatsapp?.appSecret) {
        return settings.whatsapp.appSecret;
      }
    }

    // Fallback to env var for phone number in env
    if (phoneNumberId === process.env.WHATSAPP_PHONE_NUMBER_ID) {
      return process.env.WHATSAPP_APP_SECRET || process.env.FACEBOOK_APP_SECRET || null;
    }

    return null;
  } catch (error) {
    console.error('[WhatsApp Webhook] Error fetching app secret:', error);
    return process.env.WHATSAPP_APP_SECRET || process.env.FACEBOOK_APP_SECRET || null;
  }
}

/**
 * Validates that webhook requests are actually from Meta
 * Meta signs all webhook payloads with SHA256 using the App Secret
 * Signature is sent in X-Hub-Signature-256 header
 *
 * App Secret is loaded from:
 * 1. Organization settings (tenant-level) based on phone_number_id
 * 2. Environment variable (fallback)
 */
async function validateWebhookSignature(req: Request, res: Response, next: NextFunction) {
  const signature = req.headers['x-hub-signature-256'] as string;
  const rawBody = (req as any).rawBody;

  // If no signature provided
  if (!signature) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[WhatsApp Webhook] Missing X-Hub-Signature-256 header');
      return res.sendStatus(401);
    }
    console.warn('[WhatsApp Webhook] WARNING: No signature header - allowing in development mode');
    return next();
  }

  // Get raw body for signature verification
  if (!rawBody) {
    console.error('[WhatsApp Webhook] Raw body not available for signature verification');
    return next();
  }

  // Extract phone_number_id from payload to find the right app secret
  let appSecret: string | null = null;
  try {
    const body = JSON.parse(rawBody);
    const phoneNumberId = body?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;

    if (phoneNumberId) {
      appSecret = await getAppSecretForPhoneNumber(phoneNumberId);
    }
  } catch (e) {
    // If parsing fails, try env var
    appSecret = process.env.WHATSAPP_APP_SECRET || process.env.FACEBOOK_APP_SECRET || null;
  }

  // If no app secret found
  if (!appSecret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[WhatsApp Webhook] No App Secret configured for this phone number');
      return res.sendStatus(401);
    }
    console.warn('[WhatsApp Webhook] WARNING: No App Secret configured - skipping validation in development');
    return next();
  }

  // Calculate expected signature
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex');

  // Compare signatures using timing-safe comparison
  try {
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (signatureBuffer.length !== expectedBuffer.length ||
        !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
      console.error('[WhatsApp Webhook] Invalid signature - request rejected');
      return res.sendStatus(401);
    }
  } catch (error) {
    console.error('[WhatsApp Webhook] Signature comparison error:', error);
    return res.sendStatus(401);
  }

  console.log('[WhatsApp Webhook] Signature validated successfully');
  next();
}

// ============ Public Webhook Routes (No Auth) ============

/**
 * WhatsApp Webhook Verification
 * GET /api/whatsapp/webhook
 */
router.get('/webhook', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'voicebridge-whatsapp-verify';

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[WhatsApp Webhook] Verified successfully');
    res.status(200).send(challenge);
  } else {
    console.warn('[WhatsApp Webhook] Verification failed');
    res.sendStatus(403);
  }
});

/**
 * WhatsApp Webhook Handler
 * POST /api/whatsapp/webhook
 * Receives incoming messages and status updates
 * Protected by signature validation to ensure requests are from Meta
 */
router.post('/webhook', validateWebhookSignature, async (req: Request, res: Response) => {
  try {
    const body = req.body;

    console.log('[WhatsApp Webhook] Received:', JSON.stringify(body, null, 2));

    // Handle incoming messages
    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === 'messages') {
            const value = change.value;

            // Handle incoming messages
            if (value.messages) {
              for (const message of value.messages) {
                await handleIncomingMessage(message, value.metadata);
              }
            }

            // Handle status updates
            if (value.statuses) {
              for (const status of value.statuses) {
                await handleStatusUpdate(status);
              }
            }
          }
        }
      }
    }

    // Always respond with 200 to acknowledge receipt
    res.sendStatus(200);
  } catch (error) {
    console.error('[WhatsApp Webhook] Error:', error);
    res.sendStatus(200); // Still respond 200 to prevent retries
  }
});

// ============ Authenticated Routes ============

router.use(authenticate);
router.use(tenantMiddleware);

/**
 * Get WhatsApp Templates from Meta
 * GET /api/whatsapp/templates
 */
router.get('/templates', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId;

    if (!organizationId) {
      return res.status(401).json({ success: false, message: 'Organization not found' });
    }

    // Get WhatsApp config
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    const settings = (org?.settings as any) || {};
    const whatsappConfig = settings.whatsapp;

    // Use org config or fall back to env vars
    const accessToken = whatsappConfig?.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;
    const businessAccountId = whatsappConfig?.businessAccountId || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;

    if (!accessToken || !businessAccountId) {
      return res.status(400).json({
        success: false,
        message: 'WhatsApp not configured. Please add Access Token and Business Account ID.',
      });
    }

    // Fetch templates from Meta API
    const response = await axios.get(
      `https://graph.facebook.com/v18.0/${businessAccountId}/message_templates`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { fields: 'name,status,language,category,components', limit: 100 },
      }
    );

    const templates = response.data.data || [];

    // Log templates for debugging
    console.log('[WhatsApp Templates] Found templates:', templates.map((t: any) => ({ name: t.name, status: t.status })));

    res.json({
      success: true,
      data: templates.map((t: any) => ({
        id: t.id,
        name: t.name,
        status: t.status,
        language: t.language,
        category: t.category,
        components: t.components,
      })),
    });
  } catch (error: any) {
    console.error('[WhatsApp Templates] Error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: error.response?.data?.error?.message || 'Failed to fetch templates',
    });
  }
});

/**
 * Send Template Message
 * POST /api/whatsapp/send-template
 */
router.post('/send-template', validate([
  body('to').notEmpty().withMessage('Phone number is required'),
  body('templateName').notEmpty().withMessage('Template name is required'),
  body('templateParams').optional().isArray().withMessage('Template params must be an array'),
  body('leadId').optional().isUUID().withMessage('Invalid lead ID'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const { to, templateName, templateParams, language, leadId } = req.body;
    const organizationId = req.organizationId;
    const userId = req.user?.id;

    if (!organizationId) {
      return res.status(401).json({ success: false, message: 'Organization not found' });
    }

    // Get WhatsApp config
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    const settings = (org?.settings as any) || {};
    const whatsappConfig = settings.whatsapp;

    const accessToken = whatsappConfig?.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = whatsappConfig?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!accessToken || !phoneNumberId) {
      return res.status(400).json({
        success: false,
        message: 'WhatsApp not configured',
      });
    }

    // Format phone number
    let formattedPhone = to.replace(/[^\d]/g, '');
    if (formattedPhone.length === 10) {
      formattedPhone = '91' + formattedPhone;
    }

    // Build template payload
    const payload: any = {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'template',
      template: {
        name: templateName,
        language: { code: language || 'en' },
      },
    };

    // Add template parameters if provided
    if (templateParams && templateParams.length > 0) {
      payload.template.components = [{
        type: 'body',
        parameters: templateParams.map((text: string) => ({ type: 'text', text })),
      }];
    }

    // Send via Meta API
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const messageId = response.data.messages?.[0]?.id;

    // Log message
    await prisma.messageLog.create({
      data: {
        organizationId,
        leadId,
        userId,
        type: 'WHATSAPP',
        to: formattedPhone,
        content: `Template: ${templateName}`,
        templateId: templateName,
        status: 'SENT',
        externalId: messageId,
        sentAt: new Date(),
      },
    });

    // Log activity on lead
    if (leadId) {
      await prisma.leadActivity.create({
        data: {
          leadId,
          type: 'WHATSAPP_SENT',
          title: 'WhatsApp Template Sent',
          description: `Sent template: ${templateName}`,
          userId,
          metadata: { messageId, templateName },
        },
      });
    }

    res.json({
      success: true,
      data: {
        messageId,
        status: 'sent',
      },
    });
  } catch (error: any) {
    console.error('[WhatsApp Send Template] Error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: error.response?.data?.error?.message || 'Failed to send template message',
    });
  }
});

/**
 * Send Free-form Message (within 24-hour window)
 * POST /api/whatsapp/send
 */
router.post('/send', validate([
  body('to').notEmpty().withMessage('Phone number is required'),
  body('message').notEmpty().withMessage('Message is required'),
  body('leadId').optional().isUUID().withMessage('Invalid lead ID'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const { to, message, mediaUrl, leadId } = req.body;
    const organizationId = req.organizationId;
    const userId = req.user?.id;

    if (!organizationId) {
      return res.status(401).json({ success: false, message: 'Organization not found' });
    }

    const whatsappService = createWhatsAppService(organizationId);
    await whatsappService.loadConfig();

    const result = await whatsappService.sendMessage({
      to,
      message,
      mediaUrl,
    });

    if (result.success) {
      // Log successful message
      await prisma.messageLog.create({
        data: {
          organizationId,
          leadId,
          userId,
          type: 'WHATSAPP',
          to,
          content: message,
          status: 'SENT',
          externalId: result.messageId,
          sentAt: new Date(),
        },
      });

      // Log activity on lead
      if (leadId) {
        await prisma.leadActivity.create({
          data: {
            leadId,
            type: 'WHATSAPP_SENT',
            title: 'WhatsApp Message Sent',
            description: message.substring(0, 100),
            userId,
            metadata: { messageId: result.messageId },
          },
        });
      }
    } else {
      // Log failed message with retry scheduling
      const { messageRetryService } = await import('../services/message-retry.service');

      const failedMessage = await prisma.messageLog.create({
        data: {
          organizationId,
          leadId,
          userId,
          type: 'WHATSAPP',
          to,
          content: message,
          status: 'FAILED',
          error: result.error || 'Send failed',
          retryCount: 0,
          maxRetries: 3,
          nextRetryAt: new Date(Date.now() + 60 * 1000), // Retry in 1 minute
        },
      });

      console.log(`[WhatsApp Send] Message ${failedMessage.id} failed, scheduled for retry`);
    }

    res.json({
      success: result.success,
      data: {
        messageId: result.messageId,
        status: result.success ? 'sent' : 'failed',
        error: result.error,
        willRetry: !result.success, // Indicate that failed messages will be retried
      },
    });
  } catch (error: any) {
    console.error('[WhatsApp Send] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
    });
  }
});

/**
 * Test WhatsApp Connection
 * GET /api/whatsapp/test-connection
 */
router.get('/test-connection', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId;

    if (!organizationId) {
      return res.status(401).json({ success: false, message: 'Organization not found' });
    }

    const whatsappService = createWhatsAppService(organizationId);
    const result = await whatsappService.testConnection();

    res.json({
      success: result.success,
      message: result.message,
      provider: result.provider,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * Get Phone Number Status
 * GET /api/whatsapp/phone-status
 */
router.get('/phone-status', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId;

    if (!organizationId) {
      return res.status(401).json({ success: false, message: 'Organization not found' });
    }

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    const settings = (org?.settings as any) || {};
    const whatsappConfig = settings.whatsapp;

    const accessToken = whatsappConfig?.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = whatsappConfig?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!accessToken || !phoneNumberId) {
      return res.json({
        success: true,
        data: { configured: false },
      });
    }

    const response = await axios.get(
      `https://graph.facebook.com/v18.0/${phoneNumberId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { fields: 'display_phone_number,verified_name,status,quality_rating' },
      }
    );

    res.json({
      success: true,
      data: {
        configured: true,
        phoneNumber: response.data.display_phone_number,
        verifiedName: response.data.verified_name,
        status: response.data.status,
        qualityRating: response.data.quality_rating,
      },
    });
  } catch (error: any) {
    console.error('[WhatsApp Phone Status] Error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: error.response?.data?.error?.message || 'Failed to get phone status',
    });
  }
});

/**
 * Get Message History
 * GET /api/whatsapp/messages
 */
router.get('/messages', validate([
  query('leadId').optional().isUUID().withMessage('Invalid lead ID'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId;
    const { leadId, limit = 50 } = req.query;

    if (!organizationId) {
      return res.status(401).json({ success: false, message: 'Organization not found' });
    }

    const where: any = {
      organizationId,
      type: 'WHATSAPP',
    };

    if (leadId) {
      where.leadId = leadId;
    }

    const messages = await prisma.messageLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      include: {
        lead: { select: { firstName: true, lastName: true, phone: true } },
        user: { select: { firstName: true, lastName: true } },
      },
    });

    res.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error('[WhatsApp Messages] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
    });
  }
});

// ============ Retry Endpoints ============

/**
 * Manual retry a failed message
 * POST /api/whatsapp/retry/:messageId
 */
router.post('/retry/:messageId', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId;
    const { messageId } = req.params;

    if (!organizationId) {
      return res.status(401).json({ success: false, message: 'Organization not found' });
    }

    // Verify message belongs to organization
    const message = await prisma.messageLog.findFirst({
      where: {
        id: messageId,
        organizationId,
        type: 'WHATSAPP',
      },
    });

    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    if (message.status !== 'FAILED') {
      return res.status(400).json({ success: false, message: 'Message is not in failed status' });
    }

    const { messageRetryService } = await import('../services/message-retry.service');
    const result = await messageRetryService.manualRetry(messageId);

    res.json({
      success: result.success,
      message: result.success ? 'Message sent successfully' : 'Retry failed',
      error: result.error,
      nextRetryAt: result.nextRetryAt,
    });
  } catch (error: any) {
    console.error('[WhatsApp Retry] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retry message',
    });
  }
});

/**
 * Get retry statistics
 * GET /api/whatsapp/retry/stats
 */
router.get('/retry/stats', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId;

    if (!organizationId) {
      return res.status(401).json({ success: false, message: 'Organization not found' });
    }

    const { messageRetryService } = await import('../services/message-retry.service');
    const stats = await messageRetryService.getRetryStats(organizationId, 'WHATSAPP');

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('[WhatsApp Retry Stats] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get retry stats',
    });
  }
});

/**
 * Get failed messages pending retry
 * GET /api/whatsapp/failed
 */
router.get('/failed', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId;

    if (!organizationId) {
      return res.status(401).json({ success: false, message: 'Organization not found' });
    }

    const failedMessages = await prisma.messageLog.findMany({
      where: {
        organizationId,
        type: 'WHATSAPP',
        status: 'FAILED',
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        lead: { select: { firstName: true, lastName: true, phone: true } },
      },
    });

    res.json({
      success: true,
      data: failedMessages.map(msg => ({
        id: msg.id,
        to: msg.to,
        content: msg.content.substring(0, 100) + (msg.content.length > 100 ? '...' : ''),
        error: msg.error,
        retryCount: msg.retryCount,
        maxRetries: msg.maxRetries,
        nextRetryAt: msg.nextRetryAt,
        lastRetryAt: msg.lastRetryAt,
        createdAt: msg.createdAt,
        lead: msg.lead,
        canRetry: msg.retryCount < msg.maxRetries,
      })),
    });
  } catch (error: any) {
    console.error('[WhatsApp Failed] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get failed messages',
    });
  }
});

// ============ Helper Functions ============

async function handleIncomingMessage(message: any, metadata: any) {
  try {
    const from = message.from;
    const messageType = message.type;
    const timestamp = new Date(parseInt(message.timestamp) * 1000);

    let content = '';
    if (messageType === 'text') {
      content = message.text?.body || '';
    } else if (messageType === 'image') {
      content = '[Image]';
    } else if (messageType === 'audio') {
      content = '[Audio]';
    } else if (messageType === 'document') {
      content = '[Document]';
    }

    console.log(`[WhatsApp Incoming] From: ${from}, Type: ${messageType}, Content: ${content}`);

    // Find lead by phone number
    const lead = await prisma.lead.findFirst({
      where: {
        OR: [
          { phone: from },
          { phone: `+${from}` },
          { phone: from.replace(/^91/, '') },
        ],
      },
    });

    // Log incoming message
    if (lead?.organizationId) {
      await prisma.messageLog.create({
        data: {
          organizationId: lead.organizationId,
          leadId: lead.id,
          type: 'WHATSAPP',
          to: from, // Store sender's number in 'to' field for incoming
          content: `[INBOUND] ${content}`,
          status: 'DELIVERED',
          externalId: message.id,
          deliveredAt: timestamp,
        },
      });
    }

    // Create lead activity if lead found
    if (lead) {
      await prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          type: 'WHATSAPP_RECEIVED',
          title: 'WhatsApp Message Received',
          description: content.substring(0, 100),
          metadata: { messageId: message.id, messageType },
        },
      });
    }
  } catch (error) {
    console.error('[WhatsApp] Error handling incoming message:', error);
  }
}

async function handleStatusUpdate(status: any) {
  try {
    const messageId = status.id;
    const statusValue = status.status; // sent, delivered, read, failed

    console.log(`[WhatsApp Status] Message ${messageId}: ${statusValue}`);

    // Update message log
    await prisma.messageLog.updateMany({
      where: { externalId: messageId },
      data: {
        status: statusValue.toUpperCase(),
        deliveredAt: statusValue === 'delivered' ? new Date() : undefined,
        readAt: statusValue === 'read' ? new Date() : undefined,
      },
    });
  } catch (error) {
    console.error('[WhatsApp] Error handling status update:', error);
  }
}

export default router;
