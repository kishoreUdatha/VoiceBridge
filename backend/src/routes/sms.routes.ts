/**
 * SMS Routes
 * API endpoints for SMS functionality via MSG91 and Email OTP via Resend
 */

import { Router, Request, Response } from 'express';
import { body, param, query } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { authenticate, AuthenticatedRequest } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import { ApiResponse } from '../utils/apiResponse';
import { msg91Service } from '../services/msg91.service';
import { resendService } from '../services/resend.service';
import { prisma } from '../config/database';

// In-memory OTP storage (use Redis in production)
const emailOtpStore: Map<string, { otp: string; expiresAt: number }> = new Map();

const router = Router();

// Rate limiters
const smsSendRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 SMS per minute
  message: { success: false, message: 'Too many SMS requests. Please try again later.' },
});

const otpSendRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 OTP requests per minute
  message: { success: false, message: 'Too many OTP requests. Please try again later.' },
});

// ==================== VALIDATION RULES ====================

const sendSmsValidation = [
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('message').notEmpty().withMessage('Message is required'),
  body('templateId').optional().isString(),
  body('dltTemplateId').optional().isString(),
  body('variables').optional().isObject(),
  body('leadId').optional().isUUID(),
];

const sendBulkSmsValidation = [
  body('phones').isArray({ min: 1 }).withMessage('At least one phone number is required'),
  body('phones.*').notEmpty().withMessage('Invalid phone number'),
  body('templateId').notEmpty().withMessage('Template ID is required for bulk SMS'),
  body('variables').optional().isObject(),
  body('leadIds').optional().isArray(),
];

const sendOtpValidation = [
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('templateId').optional().isString(),
  body('otpLength').optional().isInt({ min: 4, max: 8 }),
  body('otpExpiry').optional().isInt({ min: 1, max: 30 }),
];

const verifyOtpValidation = [
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('otp').notEmpty().withMessage('OTP is required'),
];

// ==================== SMS ENDPOINTS ====================

/**
 * Test SMS configuration (no auth - for development only)
 * GET /api/sms/test-config
 */
router.get('/test-config', async (req: Request, res: Response) => {
  try {
    const isConfigured = msg91Service.isConfigured();
    const balance = await msg91Service.getBalance();

    ApiResponse.success(res, 'SMS configuration test', {
      configured: isConfigured,
      provider: 'MSG91',
      balance: balance.success ? balance.balance : 'Unable to fetch',
      balanceError: balance.error,
    });
  } catch (error) {
    console.error('[SMS Routes] Test config error:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

/**
 * Test SMS send (no auth - for development only)
 * GET /api/sms/test-send?phone=919876543210&message=Hello
 */
router.get('/test-send', async (req: Request, res: Response) => {
  try {
    const phone = req.query.phone as string;
    const message = (req.query.message as string) || 'Test SMS from MyLeadX';

    if (!phone) {
      return ApiResponse.error(res, 'Phone is required (e.g., ?phone=919876543210)', 400);
    }

    console.log('[SMS Test] Sending to:', phone, 'Message:', message);

    const result = await msg91Service.sendSms({
      phone,
      message,
      userId: 'test-user',
      organizationId: 'test-org',
    });

    if (result.success) {
      ApiResponse.success(res, 'Test SMS sent', {
        messageId: result.messageId,
        phone,
        message,
      });
    } else {
      ApiResponse.error(res, result.error || 'Failed to send SMS', 400);
    }
  } catch (error) {
    console.error('[SMS Routes] Test send error:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

/**
 * Send single SMS
 * POST /api/sms/send
 */
router.post(
  '/send',
  authenticate,
  tenantMiddleware,
  smsSendRateLimiter,
  validate(sendSmsValidation),
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest & TenantRequest;
      const { phone, message, templateId, dltTemplateId, variables, leadId } = req.body;

      const result = await msg91Service.sendSms({
        phone,
        message,
        templateId,
        dltTemplateId,
        variables,
        leadId,
        userId: authReq.user.id,
        organizationId: authReq.organizationId,
      });

      if (result.success) {
        ApiResponse.success(res, 'SMS sent successfully', {
          messageId: result.messageId,
        });
      } else {
        ApiResponse.error(res, result.error || 'Failed to send SMS', 400);
      }
    } catch (error) {
      console.error('[SMS Routes] Send SMS error:', error);
      ApiResponse.error(res, (error as Error).message, 500);
    }
  }
);

/**
 * Send bulk SMS
 * POST /api/sms/bulk
 */
router.post(
  '/bulk',
  authenticate,
  tenantMiddleware,
  smsSendRateLimiter,
  validate(sendBulkSmsValidation),
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest & TenantRequest;
      const { phones, templateId, variables, leadIds } = req.body;

      // Verify template belongs to organization
      const template = await prisma.messageTemplate.findFirst({
        where: {
          id: templateId,
          organizationId: authReq.organizationId,
          type: 'SMS',
          isActive: true,
        },
      });

      if (!template) {
        return ApiResponse.error(res, 'Template not found or not active', 404);
      }

      const result = await msg91Service.sendBulkSms({
        phones,
        templateId,
        variables,
        leadIds,
        userId: authReq.user.id,
        organizationId: authReq.organizationId,
      });

      if (result.success) {
        ApiResponse.success(res, 'Bulk SMS sent successfully', {
          sent: result.sent,
          failed: result.failed,
          requestId: result.requestId,
        });
      } else {
        ApiResponse.error(res, result.errors?.join(', ') || 'Failed to send bulk SMS', 400);
      }
    } catch (error) {
      console.error('[SMS Routes] Bulk SMS error:', error);
      ApiResponse.error(res, (error as Error).message, 500);
    }
  }
);

/**
 * Send OTP
 * POST /api/sms/otp/send
 */
router.post(
  '/otp/send',
  otpSendRateLimiter,
  validate(sendOtpValidation),
  async (req: Request, res: Response) => {
    try {
      const { phone, templateId, otpLength, otpExpiry } = req.body;

      const result = await msg91Service.sendOtp({
        phone,
        templateId,
        otpLength,
        otpExpiry,
      });

      if (result.success) {
        ApiResponse.success(res, 'OTP sent successfully', {
          requestId: result.requestId,
        });
      } else {
        ApiResponse.error(res, result.error || 'Failed to send OTP', 400);
      }
    } catch (error) {
      console.error('[SMS Routes] Send OTP error:', error);
      ApiResponse.error(res, (error as Error).message, 500);
    }
  }
);

/**
 * Verify OTP
 * POST /api/sms/otp/verify
 */
router.post(
  '/otp/verify',
  otpSendRateLimiter,
  validate(verifyOtpValidation),
  async (req: Request, res: Response) => {
    try {
      const { phone, otp } = req.body;

      const result = await msg91Service.verifyOtp({ phone, otp });

      if (result.success) {
        ApiResponse.success(res, 'OTP verified successfully');
      } else {
        ApiResponse.error(res, result.error || 'Invalid OTP', 400);
      }
    } catch (error) {
      console.error('[SMS Routes] Verify OTP error:', error);
      ApiResponse.error(res, (error as Error).message, 500);
    }
  }
);

/**
 * Resend OTP
 * POST /api/sms/otp/resend
 */
router.post(
  '/otp/resend',
  otpSendRateLimiter,
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('retryType').optional().isIn(['text', 'voice']),
  async (req: Request, res: Response) => {
    try {
      const { phone, retryType } = req.body;

      const result = await msg91Service.resendOtp(phone, retryType || 'text');

      if (result.success) {
        ApiResponse.success(res, 'OTP resent successfully');
      } else {
        ApiResponse.error(res, result.error || 'Failed to resend OTP', 400);
      }
    } catch (error) {
      console.error('[SMS Routes] Resend OTP error:', error);
      ApiResponse.error(res, (error as Error).message, 500);
    }
  }
);

/**
 * Get SMS history for a lead
 * GET /api/sms/lead/:leadId
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

      const history = await msg91Service.getSmsHistory(leadId, limit);

      ApiResponse.success(res, 'SMS history retrieved', history);
    } catch (error) {
      console.error('[SMS Routes] Get history error:', error);
      ApiResponse.error(res, (error as Error).message, 500);
    }
  }
);

/**
 * Get SMS templates
 * GET /api/sms/templates
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
          type: 'SMS',
          isActive: true,
        },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          content: true,
          variables: true,
          sampleValues: true,
          dltTemplateId: true,
          msg91TemplateId: true,
          category: true,
        },
      });

      ApiResponse.success(res, 'SMS templates retrieved', templates);
    } catch (error) {
      console.error('[SMS Routes] Get templates error:', error);
      ApiResponse.error(res, (error as Error).message, 500);
    }
  }
);

/**
 * Get SMS balance/credits
 * GET /api/sms/balance
 */
router.get(
  '/balance',
  authenticate,
  tenantMiddleware,
  async (req: Request, res: Response) => {
    try {
      const result = await msg91Service.getBalance();

      if (result.success) {
        ApiResponse.success(res, 'Balance retrieved', {
          balance: result.balance,
        });
      } else {
        ApiResponse.error(res, result.error || 'Failed to get balance', 400);
      }
    } catch (error) {
      console.error('[SMS Routes] Get balance error:', error);
      ApiResponse.error(res, (error as Error).message, 500);
    }
  }
);

/**
 * Check MSG91 configuration status
 * GET /api/sms/status
 */
router.get(
  '/status',
  authenticate,
  tenantMiddleware,
  async (req: Request, res: Response) => {
    try {
      const isConfigured = msg91Service.isConfigured();

      ApiResponse.success(res, 'SMS service status', {
        configured: isConfigured,
        provider: 'MSG91',
      });
    } catch (error) {
      console.error('[SMS Routes] Get status error:', error);
      ApiResponse.error(res, (error as Error).message, 500);
    }
  }
);

// ==================== EMAIL OTP ENDPOINTS (via Resend) ====================

const emailOtpSendValidation = [
  body('email').notEmpty().isEmail().withMessage('Valid email is required'),
  body('otpLength').optional().isInt({ min: 4, max: 8 }),
  body('otpExpiry').optional().isInt({ min: 1, max: 30 }),
];

const emailOtpVerifyValidation = [
  body('email').notEmpty().isEmail().withMessage('Valid email is required'),
  body('otp').notEmpty().withMessage('OTP is required'),
];

/**
 * Test Resend configuration
 * GET /api/sms/email/test-config
 */
router.get('/email/test-config', async (req: Request, res: Response) => {
  try {
    const isConfigured = resendService.isConfigured();
    ApiResponse.success(res, 'Email (Resend) configuration test', {
      configured: isConfigured,
      provider: 'Resend',
    });
  } catch (error) {
    console.error('[Email OTP] Test config error:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

/**
 * Send Email OTP
 * POST /api/sms/email/otp/send
 */
router.post(
  '/email/otp/send',
  otpSendRateLimiter,
  validate(emailOtpSendValidation),
  async (req: Request, res: Response) => {
    try {
      const { email, otpLength = 6, otpExpiry = 5 } = req.body;

      if (!resendService.isConfigured()) {
        return ApiResponse.error(res, 'Email service not configured', 500);
      }

      // Generate OTP
      const otp = resendService.generateOtp(otpLength);
      const expiresAt = Date.now() + otpExpiry * 60 * 1000;

      // Store OTP
      emailOtpStore.set(email.toLowerCase(), { otp, expiresAt });

      // Send OTP email
      const result = await resendService.sendOtp({
        to: email,
        otp,
        expiryMinutes: otpExpiry,
      });

      if (result.success) {
        console.log(`[Email OTP] Sent to ${email}`);
        ApiResponse.success(res, 'OTP sent successfully', {
          messageId: result.messageId,
        });
      } else {
        ApiResponse.error(res, result.error || 'Failed to send OTP', 400);
      }
    } catch (error) {
      console.error('[Email OTP] Send error:', error);
      ApiResponse.error(res, (error as Error).message, 500);
    }
  }
);

/**
 * Verify Email OTP
 * POST /api/sms/email/otp/verify
 */
router.post(
  '/email/otp/verify',
  otpSendRateLimiter,
  validate(emailOtpVerifyValidation),
  async (req: Request, res: Response) => {
    try {
      const { email, otp } = req.body;
      const key = email.toLowerCase();

      const stored = emailOtpStore.get(key);

      if (!stored) {
        return ApiResponse.error(res, 'OTP not found or expired', 400);
      }

      if (Date.now() > stored.expiresAt) {
        emailOtpStore.delete(key);
        return ApiResponse.error(res, 'OTP expired', 400);
      }

      if (stored.otp !== otp) {
        return ApiResponse.error(res, 'Invalid OTP', 400);
      }

      // OTP verified - remove from store
      emailOtpStore.delete(key);

      console.log(`[Email OTP] Verified for ${email}`);
      ApiResponse.success(res, 'OTP verified successfully');
    } catch (error) {
      console.error('[Email OTP] Verify error:', error);
      ApiResponse.error(res, (error as Error).message, 500);
    }
  }
);

/**
 * Resend Email OTP
 * POST /api/sms/email/otp/resend
 */
router.post(
  '/email/otp/resend',
  otpSendRateLimiter,
  body('email').notEmpty().isEmail().withMessage('Valid email is required'),
  async (req: Request, res: Response) => {
    try {
      const { email, otpExpiry = 5 } = req.body;

      if (!resendService.isConfigured()) {
        return ApiResponse.error(res, 'Email service not configured', 500);
      }

      // Generate new OTP
      const otp = resendService.generateOtp(6);
      const expiresAt = Date.now() + otpExpiry * 60 * 1000;

      // Store OTP
      emailOtpStore.set(email.toLowerCase(), { otp, expiresAt });

      // Send OTP email
      const result = await resendService.sendOtp({
        to: email,
        otp,
        expiryMinutes: otpExpiry,
      });

      if (result.success) {
        ApiResponse.success(res, 'OTP resent successfully');
      } else {
        ApiResponse.error(res, result.error || 'Failed to resend OTP', 400);
      }
    } catch (error) {
      console.error('[Email OTP] Resend error:', error);
      ApiResponse.error(res, (error as Error).message, 500);
    }
  }
);

export default router;
