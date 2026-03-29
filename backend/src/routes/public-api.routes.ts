import { Router, Response } from 'express';
import { voiceAIService } from '../integrations/voice-ai.service';
import { apiAuth, requirePermission, requireAgentAccess, ApiAuthRequest } from '../middlewares/apiAuth';
import { API_PERMISSIONS } from '../services/api-key.service';
import { prisma } from '../config/database';
import { exotelService } from '../integrations/exotel.service';
import { webhookService, WEBHOOK_EVENTS } from '../services/webhook.service';
import { templateService } from '../services/template.service';
import { scheduledMessageService } from '../services/scheduled-message.service';
import { rateLimiters, dynamicApiKeyRateLimiter } from '../services/rate-limit.service';
import multer from 'multer';

const router = Router();

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// Apply API authentication to all routes
router.use(apiAuth);

// Apply dynamic rate limiting based on API key settings
router.use(dynamicApiKeyRateLimiter);

// ==================== AGENT ENDPOINTS ====================

/**
 * @api {get} /v1/agents List Available Agents
 */
router.get(
  '/agents',
  requirePermission(API_PERMISSIONS.AGENTS_READ),
  async (req: ApiAuthRequest, res: Response) => {
    try {
      const agents = await prisma.voiceAgent.findMany({
        where: {
          organizationId: req.organizationId,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          description: true,
          industry: true,
          language: true,
          greeting: true,
          voiceId: true,
          isActive: true,
          createdAt: true,
        },
      });

      const allowedAgents = req.apiKey.allowedAgents as string[];
      const filteredAgents = allowedAgents?.length > 0
        ? agents.filter(a => allowedAgents.includes(a.id))
        : agents;

      res.json({ success: true, data: filteredAgents, count: filteredAgents.length });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to list agents', code: 'INTERNAL_ERROR' });
    }
  }
);

/**
 * @api {get} /v1/agents/:agentId Get Agent Details
 */
router.get(
  '/agents/:agentId',
  requirePermission(API_PERMISSIONS.AGENTS_READ),
  requireAgentAccess(),
  async (req: ApiAuthRequest, res: Response) => {
    try {
      const agent = await prisma.voiceAgent.findFirst({
        where: { id: req.params.agentId, organizationId: req.organizationId },
      });

      if (!agent) {
        return res.status(404).json({ success: false, error: 'Agent not found', code: 'AGENT_NOT_FOUND' });
      }

      res.json({ success: true, data: agent });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to get agent', code: 'INTERNAL_ERROR' });
    }
  }
);

// ==================== SESSION ENDPOINTS ====================

/**
 * @api {post} /v1/sessions Create Session
 */
router.post(
  '/sessions',
  requirePermission(API_PERMISSIONS.SESSIONS_CREATE),
  async (req: ApiAuthRequest, res: Response) => {
    try {
      const { agentId, metadata } = req.body;

      if (!agentId) {
        return res.status(400).json({ success: false, error: 'agentId is required', code: 'MISSING_AGENT_ID' });
      }

      const session = await voiceAIService.startSession(agentId, {
        ...metadata,
        source: 'api',
        apiKeyId: req.apiKey.id,
      });

      res.status(201).json({
        success: true,
        data: {
          sessionId: session.sessionId,
          agentId,
          greeting: session.greeting,
          createdAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to create session', code: 'INTERNAL_ERROR' });
    }
  }
);

/**
 * @api {post} /v1/sessions/:sessionId/messages Send Message
 */
router.post(
  '/sessions/:sessionId/messages',
  requirePermission(API_PERMISSIONS.SESSIONS_MESSAGE),
  async (req: ApiAuthRequest, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { message } = req.body;

      if (!message) {
        return res.status(400).json({ success: false, error: 'message is required', code: 'MISSING_MESSAGE' });
      }

      const result = await voiceAIService.processMessage(sessionId, message);

      res.json({
        success: true,
        data: {
          sessionId,
          userMessage: message,
          response: result.response,
          qualification: result.qualification,
          shouldEnd: result.shouldEnd,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to send message', code: 'INTERNAL_ERROR' });
    }
  }
);

/**
 * @api {get} /v1/sessions/:sessionId Get Session
 */
router.get(
  '/sessions/:sessionId',
  requirePermission(API_PERMISSIONS.SESSIONS_READ),
  async (req: ApiAuthRequest, res: Response) => {
    try {
      const session = await voiceAIService.getSession(req.params.sessionId);

      if (!session) {
        return res.status(404).json({ success: false, error: 'Session not found', code: 'SESSION_NOT_FOUND' });
      }

      res.json({ success: true, data: session });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to get session', code: 'INTERNAL_ERROR' });
    }
  }
);

/**
 * @api {post} /v1/sessions/:sessionId/end End Session
 */
router.post(
  '/sessions/:sessionId/end',
  requirePermission(API_PERMISSIONS.SESSIONS_CREATE),
  async (req: ApiAuthRequest, res: Response) => {
    try {
      const session = await voiceAIService.endSession(req.params.sessionId, req.body.status || 'COMPLETED');

      res.json({
        success: true,
        data: {
          sessionId: session.id,
          status: session.status,
          duration: session.duration,
          summary: session.summary,
          sentiment: session.sentiment,
          leadCreated: !!session.leadId,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to end session', code: 'INTERNAL_ERROR' });
    }
  }
);

// ==================== TEMPLATE ENDPOINTS ====================

/**
 * @api {get} /v1/templates List Templates
 */
router.get(
  '/templates',
  requirePermission(API_PERMISSIONS.AGENTS_READ), // Using agents:read as a base permission
  async (req: ApiAuthRequest, res: Response) => {
    try {
      const { type, category, search, page = '1', limit = '20' } = req.query;

      const result = await templateService.getTemplates(req.organizationId!, {
        type: type as any,
        category: category as string,
        isActive: true,
        search: search as string,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      });

      res.json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to list templates', code: 'INTERNAL_ERROR' });
    }
  }
);

/**
 * @api {get} /v1/templates/:id Get Template
 */
router.get(
  '/templates/:id',
  requirePermission(API_PERMISSIONS.AGENTS_READ),
  async (req: ApiAuthRequest, res: Response) => {
    try {
      const template = await templateService.getTemplateById(req.params.id, req.organizationId!);
      res.json({ success: true, data: template });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'Failed to get template',
        code: 'TEMPLATE_NOT_FOUND'
      });
    }
  }
);

/**
 * @api {post} /v1/templates/:id/render Render Template
 */
router.post(
  '/templates/:id/render',
  requirePermission(API_PERMISSIONS.AGENTS_READ),
  async (req: ApiAuthRequest, res: Response) => {
    try {
      const { variables } = req.body;

      if (!variables || typeof variables !== 'object') {
        return res.status(400).json({ success: false, error: 'Variables object is required', code: 'MISSING_VARIABLES' });
      }

      const rendered = await templateService.renderTemplate(req.params.id, req.organizationId!, variables);
      res.json({ success: true, data: rendered });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'Failed to render template',
        code: 'RENDER_FAILED'
      });
    }
  }
);

// ==================== SMS ENDPOINTS ====================

// Helper to get system user for API operations
async function getSystemUser(organizationId: string) {
  const user = await prisma.user.findFirst({
    where: { organizationId },
    orderBy: { createdAt: 'asc' },
  });
  return user;
}

/**
 * @api {post} /v1/sms/send Send Single SMS
 * Supports either direct message or templateId with variables
 */
router.post(
  '/sms/send',
  rateLimiters.publicApiMessaging,
  requirePermission(API_PERMISSIONS.SMS_SEND),
  async (req: ApiAuthRequest, res: Response) => {
    try {
      const { to, message, templateId, variables } = req.body;

      if (!to) {
        return res.status(400).json({ success: false, error: 'to is required', code: 'MISSING_PARAMS' });
      }

      // Determine message content - either direct or from template
      let finalMessage = message;

      if (templateId) {
        try {
          const rendered = await templateService.renderTemplate(templateId, req.organizationId!, variables || {});
          if (rendered.type !== 'SMS') {
            return res.status(400).json({ success: false, error: 'Template is not an SMS template', code: 'INVALID_TEMPLATE_TYPE' });
          }
          finalMessage = rendered.content;
        } catch (err: any) {
          return res.status(400).json({ success: false, error: err.message || 'Failed to render template', code: 'TEMPLATE_ERROR' });
        }
      }

      if (!finalMessage) {
        return res.status(400).json({ success: false, error: 'message or templateId is required', code: 'MISSING_PARAMS' });
      }

      // Get system user for logging
      const systemUser = await getSystemUser(req.organizationId!);
      if (!systemUser) {
        return res.status(400).json({ success: false, error: 'No user found in organization', code: 'NO_USER' });
      }

      // Use Exotel to send SMS
      let result: { success: boolean; messageSid?: string; error?: string } = { success: false, error: '' };
      try {
        result = await exotelService.sendSMS({ to, body: finalMessage });
      } catch (err: any) {
        result.error = err.message || 'SMS provider error';
      }

      // Log the SMS
      const smsLog = await prisma.smsLog.create({
        data: {
          userId: systemUser.id,
          phone: to,
          message: finalMessage,
          direction: 'OUTBOUND',
          status: result.success ? 'SENT' : 'FAILED',
          provider: 'EXOTEL',
          providerMsgId: result.messageSid || null,
        },
      });

      // Trigger webhook
      webhookService.trigger({
        organizationId: req.organizationId!,
        event: result.success ? WEBHOOK_EVENTS.SMS_SENT : WEBHOOK_EVENTS.SMS_FAILED,
        data: { id: smsLog.id, to, message: finalMessage, templateId, status: result.success ? 'SENT' : 'FAILED' },
      }).catch(err => console.error('Webhook trigger error:', err));

      res.json({
        success: true,
        data: {
          messageId: smsLog.id,
          providerMessageId: result.messageSid,
          to,
          status: result.success ? 'SENT' : 'QUEUED',
          note: result.error || (result.success ? 'SMS sent successfully' : 'SMS queued - Exotel KYC pending'),
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to send SMS', code: 'SMS_FAILED' });
    }
  }
);

/**
 * @api {post} /v1/sms/bulk Send Bulk SMS
 */
router.post(
  '/sms/bulk',
  rateLimiters.publicApiBulk,
  requirePermission(API_PERMISSIONS.SMS_BULK),
  async (req: ApiAuthRequest, res: Response) => {
    try {
      const { recipients, message } = req.body;

      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({ success: false, error: 'recipients array is required', code: 'MISSING_PARAMS' });
      }

      if (!message) {
        return res.status(400).json({ success: false, error: 'message is required', code: 'MISSING_PARAMS' });
      }

      if (recipients.length > 1000) {
        return res.status(400).json({ success: false, error: 'Maximum 1000 recipients per request', code: 'LIMIT_EXCEEDED' });
      }

      const systemUser = await getSystemUser(req.organizationId!);
      if (!systemUser) {
        return res.status(400).json({ success: false, error: 'No user found in organization', code: 'NO_USER' });
      }

      const results = [];
      let successCount = 0;
      let failCount = 0;

      for (const recipient of recipients) {
        const phone = typeof recipient === 'string' ? recipient : recipient.phone;
        const customMessage = typeof recipient === 'object' && recipient.message ? recipient.message : message;

        try {
          let result: { success: boolean; messageSid?: string } = { success: false };
          try {
            result = await exotelService.sendSMS({ to: phone, body: customMessage });
          } catch (err) {
            // SMS provider error - log anyway
          }

          const smsLog = await prisma.smsLog.create({
            data: {
              userId: systemUser.id,
              phone,
              message: customMessage,
              direction: 'OUTBOUND',
              status: result.success ? 'SENT' : 'PENDING',
              provider: 'EXOTEL',
              providerMsgId: result.messageSid || null,
            },
          });

          results.push({ phone, status: result.success ? 'SENT' : 'QUEUED', messageId: smsLog.id });
          successCount++;
        } catch (err) {
          results.push({ phone, status: 'FAILED', error: 'Create failed' });
          failCount++;
        }
      }

      res.json({
        success: true,
        data: {
          total: recipients.length,
          queued: successCount,
          failed: failCount,
          results,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to send bulk SMS', code: 'INTERNAL_ERROR' });
    }
  }
);

/**
 * @api {get} /v1/sms Get SMS History
 */
router.get(
  '/sms',
  requirePermission(API_PERMISSIONS.SMS_READ),
  async (req: ApiAuthRequest, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

      // Get users from organization to filter SMS logs
      const users = await prisma.user.findMany({
        where: { organizationId: req.organizationId },
        select: { id: true },
      });
      const userIds = users.map(u => u.id);

      const [logs, total] = await Promise.all([
        prisma.smsLog.findMany({
          where: { userId: { in: userIds } },
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.smsLog.count({ where: { userId: { in: userIds } } }),
      ]);

      res.json({
        success: true,
        data: logs,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to get SMS history', code: 'INTERNAL_ERROR' });
    }
  }
);

// ==================== WHATSAPP ENDPOINTS ====================

/**
 * @api {post} /v1/whatsapp/send Send WhatsApp Message
 * Supports either direct message or templateId with variables
 */
router.post(
  '/whatsapp/send',
  rateLimiters.publicApiMessaging,
  requirePermission(API_PERMISSIONS.WHATSAPP_SEND),
  async (req: ApiAuthRequest, res: Response) => {
    try {
      const { to, message, mediaUrl, templateId, variables } = req.body;

      if (!to) {
        return res.status(400).json({ success: false, error: 'to is required', code: 'MISSING_PARAMS' });
      }

      // Determine message content - either direct or from template
      let finalMessage = message;

      if (templateId) {
        try {
          const rendered = await templateService.renderTemplate(templateId, req.organizationId!, variables || {});
          if (rendered.type !== 'WHATSAPP') {
            return res.status(400).json({ success: false, error: 'Template is not a WhatsApp template', code: 'INVALID_TEMPLATE_TYPE' });
          }
          finalMessage = rendered.content;
        } catch (err: any) {
          return res.status(400).json({ success: false, error: err.message || 'Failed to render template', code: 'TEMPLATE_ERROR' });
        }
      }

      if (!finalMessage) {
        return res.status(400).json({ success: false, error: 'message or templateId is required', code: 'MISSING_PARAMS' });
      }

      const systemUser = await getSystemUser(req.organizationId!);
      if (!systemUser) {
        return res.status(400).json({ success: false, error: 'No user found in organization', code: 'NO_USER' });
      }

      // Log the WhatsApp message
      const log = await prisma.whatsappLog.create({
        data: {
          userId: systemUser.id,
          phone: to,
          message: finalMessage,
          mediaUrl,
          direction: 'OUTBOUND',
          status: 'PENDING',
          provider: 'TWILIO',
        },
      });

      // Trigger webhook
      webhookService.trigger({
        organizationId: req.organizationId!,
        event: WEBHOOK_EVENTS.WHATSAPP_SENT,
        data: { id: log.id, to, message: finalMessage, templateId, status: 'QUEUED' },
      }).catch(err => console.error('Webhook trigger error:', err));

      // Note: Actual WhatsApp sending would use Twilio/WhatsApp Business API

      res.json({
        success: true,
        data: {
          messageId: log.id,
          to,
          status: 'QUEUED',
          note: 'WhatsApp message queued for delivery',
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to send WhatsApp message', code: 'INTERNAL_ERROR' });
    }
  }
);

/**
 * @api {post} /v1/whatsapp/bulk Send Bulk WhatsApp Messages
 */
router.post(
  '/whatsapp/bulk',
  rateLimiters.publicApiBulk,
  requirePermission(API_PERMISSIONS.WHATSAPP_BULK),
  async (req: ApiAuthRequest, res: Response) => {
    try {
      const { recipients, message, templateId } = req.body;

      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({ success: false, error: 'recipients array is required', code: 'MISSING_PARAMS' });
      }

      if (!message && !templateId) {
        return res.status(400).json({ success: false, error: 'message or templateId is required', code: 'MISSING_PARAMS' });
      }

      if (recipients.length > 500) {
        return res.status(400).json({ success: false, error: 'Maximum 500 recipients per request', code: 'LIMIT_EXCEEDED' });
      }

      const systemUser = await getSystemUser(req.organizationId!);
      if (!systemUser) {
        return res.status(400).json({ success: false, error: 'No user found in organization', code: 'NO_USER' });
      }

      const results = [];
      for (const recipient of recipients) {
        const phone = typeof recipient === 'string' ? recipient : recipient.phone;
        const customMessage = typeof recipient === 'object' && recipient.message ? recipient.message : message;

        const log = await prisma.whatsappLog.create({
          data: {
            userId: systemUser.id,
            phone,
            message: customMessage,
            direction: 'OUTBOUND',
            status: 'PENDING',
            provider: 'TWILIO',
          },
        });

        results.push({ phone, messageId: log.id, status: 'QUEUED' });
      }

      res.json({
        success: true,
        data: {
          total: recipients.length,
          queued: results.length,
          results,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to send bulk WhatsApp', code: 'INTERNAL_ERROR' });
    }
  }
);

/**
 * @api {get} /v1/whatsapp Get WhatsApp History
 */
router.get(
  '/whatsapp',
  requirePermission(API_PERMISSIONS.WHATSAPP_READ),
  async (req: ApiAuthRequest, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

      const users = await prisma.user.findMany({
        where: { organizationId: req.organizationId },
        select: { id: true },
      });
      const userIds = users.map(u => u.id);

      const [logs, total] = await Promise.all([
        prisma.whatsappLog.findMany({
          where: { userId: { in: userIds } },
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.whatsappLog.count({ where: { userId: { in: userIds } } }),
      ]);

      res.json({
        success: true,
        data: logs,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to get WhatsApp history', code: 'INTERNAL_ERROR' });
    }
  }
);

// ==================== EMAIL ENDPOINTS ====================

/**
 * @api {post} /v1/email/send Send Email
 * Supports either direct content or templateId with variables
 */
router.post(
  '/email/send',
  rateLimiters.publicApiMessaging,
  requirePermission(API_PERMISSIONS.EMAIL_SEND),
  async (req: ApiAuthRequest, res: Response) => {
    try {
      const { to, subject, body, html, templateId, variables } = req.body;

      if (!to) {
        return res.status(400).json({ success: false, error: 'to is required', code: 'MISSING_PARAMS' });
      }

      // Determine content - either direct or from template
      let finalSubject = subject;
      let finalBody = html || body;
      let finalHtml = html;

      if (templateId) {
        try {
          const rendered = await templateService.renderTemplate(templateId, req.organizationId!, variables || {});
          if (rendered.type !== 'EMAIL') {
            return res.status(400).json({ success: false, error: 'Template is not an Email template', code: 'INVALID_TEMPLATE_TYPE' });
          }
          finalSubject = rendered.subject || subject;
          finalBody = rendered.htmlContent || rendered.content;
          finalHtml = rendered.htmlContent;
        } catch (err: any) {
          return res.status(400).json({ success: false, error: err.message || 'Failed to render template', code: 'TEMPLATE_ERROR' });
        }
      }

      if (!finalSubject || !finalBody) {
        return res.status(400).json({ success: false, error: 'subject and body/html are required (or use templateId)', code: 'MISSING_PARAMS' });
      }

      const systemUser = await getSystemUser(req.organizationId!);
      if (!systemUser) {
        return res.status(400).json({ success: false, error: 'No user found in organization', code: 'NO_USER' });
      }

      // Log the email
      const log = await prisma.emailLog.create({
        data: {
          userId: systemUser.id,
          toEmail: to,
          subject: finalSubject,
          body: finalBody,
          direction: 'OUTBOUND',
          status: 'PENDING',
        },
      });

      // Trigger webhook
      webhookService.trigger({
        organizationId: req.organizationId!,
        event: WEBHOOK_EVENTS.EMAIL_SENT,
        data: { id: log.id, to, subject: finalSubject, templateId, status: 'QUEUED' },
      }).catch(err => console.error('Webhook trigger error:', err));

      // Note: Actual email sending would use nodemailer or email service

      res.json({
        success: true,
        data: {
          emailId: log.id,
          to,
          subject: finalSubject,
          status: 'QUEUED',
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to send email', code: 'INTERNAL_ERROR' });
    }
  }
);

/**
 * @api {post} /v1/email/bulk Send Bulk Emails
 */
router.post(
  '/email/bulk',
  rateLimiters.publicApiBulk,
  requirePermission(API_PERMISSIONS.EMAIL_BULK),
  async (req: ApiAuthRequest, res: Response) => {
    try {
      const { recipients, subject, body, html } = req.body;

      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({ success: false, error: 'recipients array is required', code: 'MISSING_PARAMS' });
      }

      if (!subject) {
        return res.status(400).json({ success: false, error: 'subject is required', code: 'MISSING_PARAMS' });
      }

      if (recipients.length > 500) {
        return res.status(400).json({ success: false, error: 'Maximum 500 recipients per request', code: 'LIMIT_EXCEEDED' });
      }

      const systemUser = await getSystemUser(req.organizationId!);
      if (!systemUser) {
        return res.status(400).json({ success: false, error: 'No user found in organization', code: 'NO_USER' });
      }

      const results = [];
      for (const recipient of recipients) {
        const email = typeof recipient === 'string' ? recipient : recipient.email;
        const customBody = typeof recipient === 'object' && recipient.body ? recipient.body : (html || body);

        const log = await prisma.emailLog.create({
          data: {
            userId: systemUser.id,
            toEmail: email,
            subject,
            body: customBody || '',
            direction: 'OUTBOUND',
            status: 'PENDING',
          },
        });

        results.push({ email, emailId: log.id, status: 'QUEUED' });
      }

      res.json({
        success: true,
        data: {
          total: recipients.length,
          queued: results.length,
          results,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to send bulk emails', code: 'INTERNAL_ERROR' });
    }
  }
);

/**
 * @api {get} /v1/email Get Email History
 */
router.get(
  '/email',
  requirePermission(API_PERMISSIONS.EMAIL_READ),
  async (req: ApiAuthRequest, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

      const users = await prisma.user.findMany({
        where: { organizationId: req.organizationId },
        select: { id: true },
      });
      const userIds = users.map(u => u.id);

      const [logs, total] = await Promise.all([
        prisma.emailLog.findMany({
          where: { userId: { in: userIds } },
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.emailLog.count({ where: { userId: { in: userIds } } }),
      ]);

      res.json({
        success: true,
        data: logs,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to get email history', code: 'INTERNAL_ERROR' });
    }
  }
);

// ==================== CALL ENDPOINTS ====================

/**
 * @api {post} /v1/calls/make Make Outbound Call
 */
router.post(
  '/calls/make',
  requirePermission(API_PERMISSIONS.CALLS_MAKE),
  async (req: ApiAuthRequest, res: Response) => {
    try {
      const { to, agentId, from } = req.body;

      if (!to) {
        return res.status(400).json({ success: false, error: 'to is required', code: 'MISSING_PARAMS' });
      }

      // Create call record
      const call = await prisma.outboundCall.create({
        data: {
          agentId: agentId || null,
          phoneNumber: to,
          direction: 'OUTBOUND',
          status: 'INITIATED',
        },
      });

      // If using Exotel, initiate the call
      if (agentId) {
        // AI call via agent
        try {
          const result = await exotelService.makeCall({
            to,
            callerId: from || process.env.EXOTEL_CALLER_ID || '',
            record: true,
            recordingChannels: 'dual', // Separate agent & customer channels
            recordingFormat: 'mp3',
          });

          await prisma.outboundCall.update({
            where: { id: call.id },
            data: {
              twilioCallSid: result.callSid,
              status: result.success ? 'QUEUED' : 'FAILED'
            },
          });
        } catch (err) {
          // Call might fail due to KYC
        }
      }

      res.status(201).json({
        success: true,
        data: {
          callId: call.id,
          to,
          status: call.status,
          agentId: agentId || null,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to make call', code: 'INTERNAL_ERROR' });
    }
  }
);

/**
 * @api {post} /v1/calls/bulk Initiate Bulk Calls
 */
router.post(
  '/calls/bulk',
  rateLimiters.publicApiBulk,
  requirePermission(API_PERMISSIONS.CALLS_BULK),
  async (req: ApiAuthRequest, res: Response) => {
    try {
      const { recipients, agentId } = req.body;

      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({ success: false, error: 'recipients array is required', code: 'MISSING_PARAMS' });
      }

      if (!agentId) {
        return res.status(400).json({ success: false, error: 'agentId is required for bulk calls', code: 'MISSING_PARAMS' });
      }

      if (recipients.length > 100) {
        return res.status(400).json({ success: false, error: 'Maximum 100 recipients per request', code: 'LIMIT_EXCEEDED' });
      }

      const results = [];
      for (const recipient of recipients) {
        const phone = typeof recipient === 'string' ? recipient : recipient.phone;

        const call = await prisma.outboundCall.create({
          data: {
            agentId,
            phoneNumber: phone,
            direction: 'OUTBOUND',
            status: 'QUEUED',
          },
        });

        results.push({ phone, callId: call.id, status: 'QUEUED' });
      }

      res.json({
        success: true,
        data: {
          total: recipients.length,
          queued: results.length,
          agentId,
          results,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to queue bulk calls', code: 'INTERNAL_ERROR' });
    }
  }
);

/**
 * @api {get} /v1/calls Get Call History
 */
router.get(
  '/calls',
  requirePermission(API_PERMISSIONS.CALLS_READ),
  async (req: ApiAuthRequest, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const status = req.query.status as string;
      const agentId = req.query.agentId as string;

      const agents = await prisma.voiceAgent.findMany({
        where: { organizationId: req.organizationId },
        select: { id: true },
      });
      const agentIds = agents.map(a => a.id);

      const where: any = { agentId: { in: agentIds } };
      if (status) where.status = status;
      if (agentId) where.agentId = agentId;

      const [calls, total] = await Promise.all([
        prisma.outboundCall.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            agent: { select: { id: true, name: true } },
          },
        }),
        prisma.outboundCall.count({ where }),
      ]);

      res.json({
        success: true,
        data: calls,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to get calls', code: 'INTERNAL_ERROR' });
    }
  }
);

/**
 * @api {get} /v1/calls/:callId Get Call Details
 */
router.get(
  '/calls/:callId',
  requirePermission(API_PERMISSIONS.CALLS_READ),
  async (req: ApiAuthRequest, res: Response) => {
    try {
      const call = await prisma.outboundCall.findUnique({
        where: { id: req.params.callId },
        include: {
          agent: { select: { id: true, name: true, organizationId: true } },
        },
      });

      if (!call || call.agent?.organizationId !== req.organizationId) {
        return res.status(404).json({ success: false, error: 'Call not found', code: 'CALL_NOT_FOUND' });
      }

      res.json({ success: true, data: call });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to get call', code: 'INTERNAL_ERROR' });
    }
  }
);

// ==================== LEAD ENDPOINTS ====================

/**
 * @api {get} /v1/leads List Leads
 */
router.get(
  '/leads',
  requirePermission(API_PERMISSIONS.LEADS_READ),
  async (req: ApiAuthRequest, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const search = req.query.search as string;
      const source = req.query.source as string;
      const stageId = req.query.stageId as string;

      const where: any = { organizationId: req.organizationId };
      if (source) where.source = source;
      if (stageId) where.stageId = stageId;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
        ];
      }

      const [leads, total] = await Promise.all([
        prisma.lead.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            stage: { select: { id: true, name: true, color: true } },
          },
        }),
        prisma.lead.count({ where }),
      ]);

      res.json({
        success: true,
        data: leads,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to list leads', code: 'INTERNAL_ERROR' });
    }
  }
);

/**
 * @api {get} /v1/leads/:leadId Get Lead Details
 */
router.get(
  '/leads/:leadId',
  requirePermission(API_PERMISSIONS.LEADS_READ),
  async (req: ApiAuthRequest, res: Response) => {
    try {
      const lead = await prisma.lead.findFirst({
        where: { id: req.params.leadId, organizationId: req.organizationId },
        include: {
          stage: true,
          assignments: { include: { assignedTo: { select: { id: true, firstName: true, lastName: true } } } },
        },
      });

      if (!lead) {
        return res.status(404).json({ success: false, error: 'Lead not found', code: 'LEAD_NOT_FOUND' });
      }

      res.json({ success: true, data: lead });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to get lead', code: 'INTERNAL_ERROR' });
    }
  }
);

/**
 * @api {post} /v1/leads Create Lead
 */
router.post(
  '/leads',
  requirePermission(API_PERMISSIONS.LEADS_CREATE),
  async (req: ApiAuthRequest, res: Response) => {
    try {
      const { firstName, lastName, name, email, phone, source, customFields, stageId, city, state, country } = req.body;

      // Support both name and firstName/lastName
      const leadFirstName = firstName || (name ? name.split(' ')[0] : null);
      const leadLastName = lastName || (name ? name.split(' ').slice(1).join(' ') : null);

      if (!leadFirstName) {
        return res.status(400).json({ success: false, error: 'firstName or name is required', code: 'MISSING_NAME' });
      }

      if (!phone) {
        return res.status(400).json({ success: false, error: 'phone is required', code: 'MISSING_PHONE' });
      }

      const defaultStage = stageId || (await prisma.leadStage.findFirst({
        where: { organizationId: req.organizationId, isDefault: true },
      }))?.id;

      // Map source to valid enum value or default to MANUAL
      const validSources = ['MANUAL', 'WEBSITE', 'REFERRAL', 'AD_GOOGLE', 'AD_FACEBOOK', 'AD_INSTAGRAM', 'WHATSAPP', 'LANDING_PAGE', 'IMPORT', 'API'];
      const leadSource = validSources.includes(source?.toUpperCase()) ? source.toUpperCase() : 'API';

      const lead = await prisma.lead.create({
        data: {
          organizationId: req.organizationId!,
          firstName: leadFirstName,
          lastName: leadLastName || '',
          email,
          phone,
          source: leadSource as any,
          customFields: customFields || {},
          stageId: defaultStage,
          city,
          state,
          country,
        },
      });

      // Trigger webhook
      webhookService.trigger({
        organizationId: req.organizationId!,
        event: WEBHOOK_EVENTS.LEAD_CREATED,
        data: lead,
      }).catch(err => console.error('Webhook trigger error:', err));

      res.status(201).json({ success: true, data: lead });
    } catch (error) {
      console.error('Lead creation error:', error);
      res.status(500).json({ success: false, error: 'Failed to create lead', code: 'INTERNAL_ERROR' });
    }
  }
);

/**
 * @api {post} /v1/leads/bulk Bulk Create Leads
 */
router.post(
  '/leads/bulk',
  rateLimiters.publicApiBulk,
  requirePermission(API_PERMISSIONS.CONTACTS_BULK),
  async (req: ApiAuthRequest, res: Response) => {
    try {
      const { leads } = req.body;

      if (!leads || !Array.isArray(leads) || leads.length === 0) {
        return res.status(400).json({ success: false, error: 'leads array is required', code: 'MISSING_PARAMS' });
      }

      if (leads.length > 500) {
        return res.status(400).json({ success: false, error: 'Maximum 500 leads per request', code: 'LIMIT_EXCEEDED' });
      }

      const defaultStage = await prisma.leadStage.findFirst({
        where: { organizationId: req.organizationId, isDefault: true },
      });

      const results = [];
      let successCount = 0;
      let failCount = 0;

      for (const leadData of leads) {
        try {
          // Split name into firstName and lastName if needed
          const nameParts = (leadData.name || '').split(' ');
          const firstName = nameParts[0] || 'Unknown';
          const lastName = nameParts.slice(1).join(' ') || undefined;

          const lead = await prisma.lead.create({
            data: {
              organizationId: req.organizationId!,
              firstName,
              lastName,
              email: leadData.email,
              phone: leadData.phone,
              source: leadData.source || 'API',
              customFields: leadData.customFields || {},
              stageId: defaultStage?.id,
            },
          });
          results.push({ name: leadData.name, id: lead.id, status: 'CREATED' });
          successCount++;
        } catch (err) {
          results.push({ name: leadData.name, status: 'FAILED', error: 'Create failed' });
          failCount++;
        }
      }

      res.json({
        success: true,
        data: {
          total: leads.length,
          created: successCount,
          failed: failCount,
          results,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to bulk create leads', code: 'INTERNAL_ERROR' });
    }
  }
);

/**
 * @api {put} /v1/leads/:leadId Update Lead
 */
router.put(
  '/leads/:leadId',
  requirePermission(API_PERMISSIONS.LEADS_UPDATE),
  async (req: ApiAuthRequest, res: Response) => {
    try {
      const existingLead = await prisma.lead.findFirst({
        where: { id: req.params.leadId, organizationId: req.organizationId },
      });

      if (!existingLead) {
        return res.status(404).json({ success: false, error: 'Lead not found', code: 'LEAD_NOT_FOUND' });
      }

      const lead = await prisma.lead.update({
        where: { id: req.params.leadId },
        data: req.body,
      });

      res.json({ success: true, data: lead });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to update lead', code: 'INTERNAL_ERROR' });
    }
  }
);

/**
 * @api {delete} /v1/leads/:leadId Delete Lead
 */
router.delete(
  '/leads/:leadId',
  requirePermission(API_PERMISSIONS.LEADS_DELETE),
  async (req: ApiAuthRequest, res: Response) => {
    try {
      const existingLead = await prisma.lead.findFirst({
        where: { id: req.params.leadId, organizationId: req.organizationId },
      });

      if (!existingLead) {
        return res.status(404).json({ success: false, error: 'Lead not found', code: 'LEAD_NOT_FOUND' });
      }

      await prisma.lead.delete({ where: { id: req.params.leadId } });

      res.json({ success: true, message: 'Lead deleted' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to delete lead', code: 'INTERNAL_ERROR' });
    }
  }
);

// ==================== CAMPAIGN ENDPOINTS ====================

/**
 * @api {get} /v1/campaigns List Campaigns
 */
router.get(
  '/campaigns',
  requirePermission(API_PERMISSIONS.CAMPAIGNS_READ),
  async (req: ApiAuthRequest, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

      const [campaigns, total] = await Promise.all([
        prisma.campaign.findMany({
          where: { organizationId: req.organizationId },
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.campaign.count({ where: { organizationId: req.organizationId } }),
      ]);

      res.json({
        success: true,
        data: campaigns,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to list campaigns', code: 'INTERNAL_ERROR' });
    }
  }
);

/**
 * @api {post} /v1/campaigns Create Campaign
 */
router.post(
  '/campaigns',
  requirePermission(API_PERMISSIONS.CAMPAIGNS_CREATE),
  async (req: ApiAuthRequest, res: Response) => {
    try {
      const { name, type, message, scheduledAt, recipients } = req.body;

      if (!name || !type) {
        return res.status(400).json({ success: false, error: 'name and type are required', code: 'MISSING_PARAMS' });
      }

      // Get system user for campaign creation
      const systemUser = await getSystemUser(req.organizationId!);
      if (!systemUser) {
        return res.status(400).json({ success: false, error: 'No user found in organization', code: 'NO_USER' });
      }

      const campaign = await prisma.campaign.create({
        data: {
          organizationId: req.organizationId!,
          createdById: systemUser.id,
          name,
          type,
          content: message || '',
          scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
          status: 'DRAFT',
        },
      });

      res.status(201).json({ success: true, data: campaign });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to create campaign', code: 'INTERNAL_ERROR' });
    }
  }
);

// ==================== ANALYTICS ENDPOINTS ====================

/**
 * @api {get} /v1/analytics/overview Get Analytics Overview
 */
router.get(
  '/analytics/overview',
  requirePermission(API_PERMISSIONS.ANALYTICS_READ),
  async (req: ApiAuthRequest, res: Response) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const [
        totalLeads,
        newLeads,
        totalCalls,
        totalSMS,
        totalEmails,
        totalWhatsApp,
      ] = await Promise.all([
        prisma.lead.count({ where: { organizationId: req.organizationId } }),
        prisma.lead.count({ where: { organizationId: req.organizationId, createdAt: { gte: startDate } } }),
        prisma.outboundCall.count({
          where: {
            agent: { organizationId: req.organizationId },
            createdAt: { gte: startDate },
          },
        }),
        prisma.smsLog.count({ where: { user: { organizationId: req.organizationId }, createdAt: { gte: startDate } } }),
        prisma.emailLog.count({ where: { user: { organizationId: req.organizationId }, createdAt: { gte: startDate } } }),
        prisma.whatsappLog.count({ where: { user: { organizationId: req.organizationId }, createdAt: { gte: startDate } } }),
      ]);

      res.json({
        success: true,
        data: {
          period: { start: startDate.toISOString(), end: new Date().toISOString(), days },
          leads: { total: totalLeads, new: newLeads },
          calls: { total: totalCalls },
          sms: { total: totalSMS },
          emails: { total: totalEmails },
          whatsapp: { total: totalWhatsApp },
        },
      });
    } catch (error) {
      console.error('Analytics error:', error);
      res.status(500).json({ success: false, error: 'Failed to get analytics', code: 'INTERNAL_ERROR' });
    }
  }
);

/**
 * @api {get} /v1/analytics/daily Get Daily Analytics
 */
router.get(
  '/analytics/daily',
  requirePermission(API_PERMISSIONS.ANALYTICS_READ),
  async (req: ApiAuthRequest, res: Response) => {
    try {
      const days = parseInt(req.query.days as string) || 7;

      const agents = await prisma.voiceAgent.findMany({
        where: { organizationId: req.organizationId },
        select: { id: true },
      });

      const analytics = await prisma.analyticsDaily.findMany({
        where: {
          organizationId: req.organizationId,
          date: { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
        },
        orderBy: { date: 'desc' },
      });

      res.json({ success: true, data: analytics });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to get daily analytics', code: 'INTERNAL_ERROR' });
    }
  }
);

// ==================== SCHEDULED MESSAGE ENDPOINTS ====================

/**
 * @api {post} /v1/scheduled Create Scheduled Message
 * Schedule a message (SMS, Email, or WhatsApp) for future delivery
 */
router.post(
  '/scheduled',
  requirePermission(API_PERMISSIONS.SMS_SEND), // Base permission - check message type specific permission too
  async (req: ApiAuthRequest, res: Response) => {
    try {
      const {
        type,
        recipients,
        subject,
        content,
        htmlContent,
        templateId,
        variables,
        scheduledAt,
        timezone,
        isRecurring,
        recurringRule,
        recurringEndAt,
        name,
      } = req.body;

      // Validate type
      if (!type || !['SMS', 'EMAIL', 'WHATSAPP'].includes(type)) {
        return res.status(400).json({
          success: false,
          error: 'Valid type is required (SMS, EMAIL, WHATSAPP)',
          code: 'INVALID_TYPE',
        });
      }

      // Validate recipients
      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Recipients array is required',
          code: 'MISSING_RECIPIENTS',
        });
      }

      // Validate scheduledAt
      if (!scheduledAt) {
        return res.status(400).json({
          success: false,
          error: 'scheduledAt is required',
          code: 'MISSING_SCHEDULED_AT',
        });
      }

      const scheduledDate = new Date(scheduledAt);
      if (scheduledDate <= new Date()) {
        return res.status(400).json({
          success: false,
          error: 'scheduledAt must be in the future',
          code: 'INVALID_SCHEDULED_AT',
        });
      }

      // Validate content or templateId
      if (!content && !templateId) {
        return res.status(400).json({
          success: false,
          error: 'content or templateId is required',
          code: 'MISSING_CONTENT',
        });
      }

      // Get system user for createdById
      const systemUser = await getSystemUser(req.organizationId!);

      const message = await scheduledMessageService.createScheduledMessage({
        organizationId: req.organizationId!,
        type,
        recipients,
        subject,
        content,
        htmlContent,
        templateId,
        variables: variables || {},
        scheduledAt: scheduledDate,
        timezone: timezone || 'UTC',
        isRecurring: isRecurring || false,
        recurringRule,
        recurringEndAt: recurringEndAt ? new Date(recurringEndAt) : undefined,
        name,
        createdById: systemUser?.id,
      });

      res.status(201).json({
        success: true,
        data: {
          id: message.id,
          type: message.type,
          recipients: message.recipients,
          scheduledAt: message.scheduledAt,
          status: message.status,
          isRecurring: message.isRecurring,
          name: message.name,
        },
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'Failed to create scheduled message',
        code: 'SCHEDULE_FAILED',
      });
    }
  }
);

/**
 * @api {get} /v1/scheduled List Scheduled Messages
 */
router.get(
  '/scheduled',
  requirePermission(API_PERMISSIONS.SMS_READ),
  async (req: ApiAuthRequest, res: Response) => {
    try {
      const { type, status, upcoming, page = '1', limit = '20' } = req.query;

      const result = await scheduledMessageService.getScheduledMessages(req.organizationId!, {
        type: type as any,
        status: status as any,
        upcoming: upcoming === 'true',
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      });

      res.json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to list scheduled messages',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * @api {get} /v1/scheduled/:id Get Scheduled Message
 */
router.get(
  '/scheduled/:id',
  requirePermission(API_PERMISSIONS.SMS_READ),
  async (req: ApiAuthRequest, res: Response) => {
    try {
      const message = await scheduledMessageService.getScheduledMessageById(
        req.params.id,
        req.organizationId!
      );

      res.json({ success: true, data: message });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'Failed to get scheduled message',
        code: 'NOT_FOUND',
      });
    }
  }
);

/**
 * @api {post} /v1/scheduled/:id/cancel Cancel Scheduled Message
 */
router.post(
  '/scheduled/:id/cancel',
  requirePermission(API_PERMISSIONS.SMS_SEND),
  async (req: ApiAuthRequest, res: Response) => {
    try {
      const message = await scheduledMessageService.cancelScheduledMessage(
        req.params.id,
        req.organizationId!
      );

      res.json({
        success: true,
        message: 'Scheduled message cancelled',
        data: { id: message.id, status: message.status },
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'Failed to cancel scheduled message',
        code: 'CANCEL_FAILED',
      });
    }
  }
);

// ==================== UTILITY ENDPOINTS ====================

/**
 * @api {post} /v1/tts Text to Speech
 */
router.post(
  '/tts',
  requirePermission(API_PERMISSIONS.SESSIONS_MESSAGE),
  async (req: ApiAuthRequest, res: Response) => {
    try {
      const { text, voice } = req.body;

      if (!text) {
        return res.status(400).json({ success: false, error: 'text is required', code: 'MISSING_TEXT' });
      }

      const audioBuffer = await voiceAIService.textToSpeech(text, voice || 'alloy');

      res.json({
        success: true,
        data: {
          audio: audioBuffer.toString('base64'),
          format: 'mp3',
          voice: voice || 'alloy',
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to convert text to speech', code: 'INTERNAL_ERROR' });
    }
  }
);

/**
 * @api {post} /v1/stt Speech to Text
 */
router.post(
  '/stt',
  requirePermission(API_PERMISSIONS.SESSIONS_MESSAGE),
  upload.single('audio'),
  async (req: ApiAuthRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'audio file is required', code: 'MISSING_AUDIO' });
      }

      const text = await voiceAIService.speechToText(
        req.file.buffer,
        req.file.mimetype.split('/')[1] || 'webm'
      );

      res.json({ success: true, data: { text } });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to convert speech to text', code: 'INTERNAL_ERROR' });
    }
  }
);

/**
 * @api {get} /v1/account Get Account Info
 */
router.get('/account', async (req: ApiAuthRequest, res: Response) => {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: req.organizationId },
      select: {
        id: true,
        name: true,
        email: true,
        subscriptionStatus: true,
        activePlanId: true,
      },
    });

    const apiKey = req.apiKey;

    // Get rate limit info from headers (set by middleware)
    const rateLimitInfo = {
      limit: parseInt(res.getHeader('X-RateLimit-Limit') as string) || apiKey.rateLimit,
      remaining: parseInt(res.getHeader('X-RateLimit-Remaining') as string) || apiKey.rateLimit,
      resetTime: res.getHeader('X-RateLimit-Reset'),
    };

    res.json({
      success: true,
      data: {
        organization: org,
        apiKey: {
          id: apiKey.id,
          name: apiKey.name,
          permissions: apiKey.permissions,
          rateLimit: apiKey.rateLimit,
          rateLimitWindow: apiKey.rateLimitWindow || 60,
          totalRequests: apiKey.totalRequests,
        },
        rateLimit: rateLimitInfo,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get account info', code: 'INTERNAL_ERROR' });
  }
});

/**
 * @api {get} /v1/rate-limit Get Current Rate Limit Status
 */
router.get('/rate-limit', async (req: ApiAuthRequest, res: Response) => {
  try {
    const apiKey = req.apiKey;

    // Get rate limit info from headers (set by middleware)
    const limit = parseInt(res.getHeader('X-RateLimit-Limit') as string) || apiKey.rateLimit;
    const remaining = parseInt(res.getHeader('X-RateLimit-Remaining') as string) || apiKey.rateLimit;
    const resetTimestamp = parseInt(res.getHeader('X-RateLimit-Reset') as string) || Math.ceil(Date.now() / 1000) + (apiKey.rateLimitWindow || 60);

    res.json({
      success: true,
      data: {
        limit,
        remaining,
        used: limit - remaining,
        resetTime: new Date(resetTimestamp * 1000).toISOString(),
        windowSeconds: apiKey.rateLimitWindow || 60,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get rate limit status', code: 'INTERNAL_ERROR' });
  }
});

export default router;
