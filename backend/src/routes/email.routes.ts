/**
 * Email Routes
 * API endpoints for Email functionality via AWS SES
 */

import { Router, Request, Response } from 'express';
import { body, param, query } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { authenticate, AuthenticatedRequest } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import { ApiResponse } from '../utils/apiResponse';
import { sesService } from '../services/ses.service';
import { prisma } from '../config/database';

const router = Router();

// Rate limiters
const emailSendRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 emails per minute
  message: { success: false, message: 'Too many email requests. Please try again later.' },
});

// ==================== VALIDATION RULES ====================

const sendEmailValidation = [
  body('to').notEmpty().withMessage('Recipient email is required').isEmail().withMessage('Invalid email format'),
  body('subject').notEmpty().withMessage('Subject is required'),
  body('body').notEmpty().withMessage('Body is required'),
  body('html').optional().isString(),
  body('replyTo').optional().isEmail(),
  body('leadId').optional().isUUID(),
];

const sendBulkEmailValidation = [
  body('recipients').isArray({ min: 1 }).withMessage('At least one recipient is required'),
  body('recipients.*.email').notEmpty().isEmail().withMessage('Invalid recipient email'),
  body('recipients.*.variables').optional().isObject(),
  body('templateId').notEmpty().withMessage('Template ID is required for bulk email'),
  body('defaultVariables').optional().isObject(),
];

const sendTemplatedEmailValidation = [
  body('to').notEmpty().withMessage('Recipient email is required').isEmail().withMessage('Invalid email format'),
  body('templateId').notEmpty().withMessage('Template ID is required'),
  body('variables').optional().isObject(),
  body('replyTo').optional().isEmail(),
  body('leadId').optional().isUUID(),
];

// ==================== TEST ENDPOINTS (Development) ====================

/**
 * Test Email configuration (no auth - for development only)
 * GET /api/email/test-config
 */
router.get('/test-config', async (req: Request, res: Response) => {
  try {
    const isConfigured = sesService.isConfigured();
    const quota = await sesService.getSendingQuota();

    ApiResponse.success(res, 'Email configuration test', {
      configured: isConfigured,
      provider: 'AWS SES',
      quota: quota.success ? {
        max24HourSend: quota.max24HourSend,
        maxSendRate: quota.maxSendRate,
        sentLast24Hours: quota.sentLast24Hours,
      } : 'Unable to fetch',
      quotaError: quota.error,
    });
  } catch (error) {
    console.error('[Email Routes] Test config error:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

/**
 * Test Email send (no auth - for development only)
 * GET /api/email/test-send?to=test@example.com&subject=Test&body=Hello
 */
router.get('/test-send', async (req: Request, res: Response) => {
  try {
    const to = req.query.to as string;
    const subject = (req.query.subject as string) || 'Test Email from MyLeadX';
    const body = (req.query.body as string) || 'This is a test email from MyLeadX CRM.';

    if (!to) {
      return ApiResponse.error(res, 'Email is required (e.g., ?to=test@example.com)', 400);
    }

    console.log('[Email Test] Sending to:', to, 'Subject:', subject);

    const result = await sesService.sendEmail({
      to,
      subject,
      body,
      html: `<html><body><h1>${subject}</h1><p>${body}</p><hr><p style="color: #888;">Sent from MyLeadX CRM</p></body></html>`,
      userId: 'test-user',
      organizationId: 'test-org',
    });

    if (result.success) {
      ApiResponse.success(res, 'Test email sent', {
        messageId: result.messageId,
        to,
        subject,
      });
    } else {
      ApiResponse.error(res, result.error || 'Failed to send email', 400);
    }
  } catch (error) {
    console.error('[Email Routes] Test send error:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// ==================== EMAIL ENDPOINTS ====================

/**
 * Send single email
 * POST /api/email/send
 */
router.post(
  '/send',
  authenticate,
  tenantMiddleware,
  emailSendRateLimiter,
  validate(sendEmailValidation),
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest & TenantRequest;
      const { to, subject, body, html, replyTo, leadId } = req.body;

      const result = await sesService.sendEmail({
        to,
        subject,
        body,
        html,
        replyTo,
        leadId,
        userId: authReq.user.id,
        organizationId: authReq.organizationId,
      });

      if (result.success) {
        ApiResponse.success(res, 'Email sent successfully', {
          messageId: result.messageId,
        });
      } else {
        ApiResponse.error(res, result.error || 'Failed to send email', 400);
      }
    } catch (error) {
      console.error('[Email Routes] Send email error:', error);
      ApiResponse.error(res, (error as Error).message, 500);
    }
  }
);

/**
 * Send templated email
 * POST /api/email/send-template
 */
router.post(
  '/send-template',
  authenticate,
  tenantMiddleware,
  emailSendRateLimiter,
  validate(sendTemplatedEmailValidation),
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest & TenantRequest;
      const { to, templateId, variables, replyTo, leadId } = req.body;

      // Verify template belongs to organization
      const template = await prisma.messageTemplate.findFirst({
        where: {
          id: templateId,
          organizationId: authReq.organizationId,
          type: 'EMAIL',
          isActive: true,
        },
      });

      if (!template) {
        return ApiResponse.error(res, 'Template not found or not active', 404);
      }

      const result = await sesService.sendTemplatedEmail({
        to,
        templateId,
        variables: variables || {},
        replyTo,
        leadId,
        userId: authReq.user.id,
        organizationId: authReq.organizationId,
      });

      if (result.success) {
        ApiResponse.success(res, 'Email sent successfully', {
          messageId: result.messageId,
        });
      } else {
        ApiResponse.error(res, result.error || 'Failed to send email', 400);
      }
    } catch (error) {
      console.error('[Email Routes] Send templated email error:', error);
      ApiResponse.error(res, (error as Error).message, 500);
    }
  }
);

/**
 * Send bulk email
 * POST /api/email/bulk
 */
router.post(
  '/bulk',
  authenticate,
  tenantMiddleware,
  emailSendRateLimiter,
  validate(sendBulkEmailValidation),
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest & TenantRequest;
      const { recipients, templateId, defaultVariables } = req.body;

      // Verify template belongs to organization
      const template = await prisma.messageTemplate.findFirst({
        where: {
          id: templateId,
          organizationId: authReq.organizationId,
          type: 'EMAIL',
          isActive: true,
        },
      });

      if (!template) {
        return ApiResponse.error(res, 'Template not found or not active', 404);
      }

      const result = await sesService.sendBulkEmail({
        recipients,
        templateId,
        defaultVariables,
        userId: authReq.user.id,
        organizationId: authReq.organizationId,
      });

      if (result.success) {
        ApiResponse.success(res, 'Bulk email sent', {
          sent: result.sent,
          failed: result.failed,
          results: result.results,
        });
      } else {
        ApiResponse.error(res, 'Failed to send bulk email', 400);
      }
    } catch (error) {
      console.error('[Email Routes] Bulk email error:', error);
      ApiResponse.error(res, (error as Error).message, 500);
    }
  }
);

/**
 * Get email history for a lead
 * GET /api/email/lead/:leadId
 */
router.get(
  '/lead/:leadId',
  authenticate,
  tenantMiddleware,
  param('leadId').isUUID().withMessage('Invalid lead ID'),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest & TenantRequest;
      const { leadId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;

      // Verify lead belongs to organization
      const lead = await prisma.lead.findFirst({
        where: {
          id: leadId,
          organizationId: authReq.organizationId,
        },
      });

      if (!lead) {
        return ApiResponse.error(res, 'Lead not found', 404);
      }

      const history = await sesService.getEmailHistory(leadId, limit);

      ApiResponse.success(res, 'Email history retrieved', history);
    } catch (error) {
      console.error('[Email Routes] Get history error:', error);
      ApiResponse.error(res, (error as Error).message, 500);
    }
  }
);

/**
 * Get email templates
 * GET /api/email/templates
 */
router.get(
  '/templates',
  authenticate,
  tenantMiddleware,
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest & TenantRequest;

      const templates = await prisma.messageTemplate.findMany({
        where: {
          organizationId: authReq.organizationId,
          type: 'EMAIL',
          isActive: true,
        },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          subject: true,
          content: true,
          htmlContent: true,
          variables: true,
          sampleValues: true,
          category: true,
        },
      });

      ApiResponse.success(res, 'Email templates retrieved', templates);
    } catch (error) {
      console.error('[Email Routes] Get templates error:', error);
      ApiResponse.error(res, (error as Error).message, 500);
    }
  }
);

/**
 * Get SES sending quota
 * GET /api/email/quota
 */
router.get(
  '/quota',
  authenticate,
  tenantMiddleware,
  async (req: Request, res: Response) => {
    try {
      const result = await sesService.getSendingQuota();

      if (result.success) {
        ApiResponse.success(res, 'Sending quota retrieved', {
          max24HourSend: result.max24HourSend,
          maxSendRate: result.maxSendRate,
          sentLast24Hours: result.sentLast24Hours,
        });
      } else {
        ApiResponse.error(res, result.error || 'Failed to get quota', 400);
      }
    } catch (error) {
      console.error('[Email Routes] Get quota error:', error);
      ApiResponse.error(res, (error as Error).message, 500);
    }
  }
);

/**
 * Check AWS SES configuration status
 * GET /api/email/status
 */
router.get(
  '/status',
  authenticate,
  tenantMiddleware,
  async (req: Request, res: Response) => {
    try {
      const isConfigured = sesService.isConfigured();

      ApiResponse.success(res, 'Email service status', {
        configured: isConfigured,
        provider: 'AWS SES',
      });
    } catch (error) {
      console.error('[Email Routes] Get status error:', error);
      ApiResponse.error(res, (error as Error).message, 500);
    }
  }
);

export default router;
