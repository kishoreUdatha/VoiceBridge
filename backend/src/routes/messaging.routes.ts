/**
 * Messaging Routes
 * Handles SMS, WhatsApp, and Email sending for telecaller app
 */

import { Router, Response } from 'express';
import { body, param, query } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { prisma } from '../config/database';
import { authenticate, AuthenticatedRequest } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import { createWhatsAppService } from '../integrations/whatsapp.service';
import { postCallWhatsAppService } from '../services/post-call-whatsapp.service';

// Rate limiter for messaging endpoints
const messagingRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 messages per minute per IP
  message: { success: false, message: 'Too many messages sent. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation rules
const smsValidation = [
  body('to').trim().notEmpty().withMessage('Phone number is required')
    .matches(/^[\d+\-() ]{7,20}$/).withMessage('Invalid phone number format'),
  body('message').trim().notEmpty().withMessage('Message is required')
    .isLength({ max: 1600 }).withMessage('Message must be at most 1600 characters'),
  body('leadId').optional().isUUID().withMessage('Invalid lead ID'),
];

const whatsappValidation = [
  body('to').trim().notEmpty().withMessage('Phone number is required')
    .matches(/^[\d+\-() ]{7,20}$/).withMessage('Invalid phone number format'),
  body('message').trim().notEmpty().withMessage('Message is required')
    .isLength({ max: 4096 }).withMessage('Message must be at most 4096 characters'),
  body('leadId').optional().isUUID().withMessage('Invalid lead ID'),
  body('templateId').optional().isString().withMessage('Invalid template ID'),
];

const emailValidation = [
  body('to').trim().isEmail().withMessage('Valid email address is required'),
  body('subject').optional().trim().isLength({ max: 500 }).withMessage('Subject must be at most 500 characters'),
  body('body').trim().notEmpty().withMessage('Email body is required')
    .isLength({ max: 50000 }).withMessage('Email body must be at most 50000 characters'),
  body('leadId').optional().isUUID().withMessage('Invalid lead ID'),
];

// Validation for college info WhatsApp
const collegeInfoValidation = [
  body('to').trim().notEmpty().withMessage('Phone number is required')
    .matches(/^[\d+\-() ]{7,20}$/).withMessage('Invalid phone number format'),
  body('collegeName').trim().notEmpty().withMessage('College name is required'),
  body('courseName').optional().trim().isLength({ max: 200 }).withMessage('Course name must be at most 200 characters'),
  body('duration').optional().trim().isLength({ max: 100 }).withMessage('Duration must be at most 100 characters'),
  body('fee').optional().trim().isLength({ max: 100 }).withMessage('Fee must be at most 100 characters'),
  body('nextBatch').optional().trim().isLength({ max: 100 }).withMessage('Next batch must be at most 100 characters'),
  body('brochureUrl').optional().trim().isURL().withMessage('Invalid brochure URL'),
  body('websiteUrl').optional().trim().isURL().withMessage('Invalid website URL'),
  body('contactNumber').optional().trim().matches(/^[\d+\-() ]{7,20}$/).withMessage('Invalid contact number'),
  body('counselorName').optional().trim().isLength({ max: 100 }).withMessage('Counselor name must be at most 100 characters'),
  body('leadId').optional().isUUID().withMessage('Invalid lead ID'),
  body('callId').optional().isUUID().withMessage('Invalid call ID'),
];

const quickSendValidation = [
  body('type').isIn(['SMS', 'WHATSAPP', 'EMAIL']).withMessage('Valid message type is required'),
  body('leadId').isUUID().withMessage('Valid lead ID is required'),
  body('phone').optional().matches(/^[\d+\-() ]{7,20}$/).withMessage('Invalid phone number format'),
  body('email').optional().isEmail().withMessage('Invalid email format'),
];

const router = Router();

// Apply authentication and tenant middleware to all routes
router.use(authenticate);
router.use(tenantMiddleware);

/**
 * Send SMS
 * POST /api/messaging/sms
 */
router.post('/sms', messagingRateLimiter, validate(smsValidation), async (req: TenantRequest, res: Response) => {
  try {
    const { to, message, leadId } = req.body;
    const userId = req.user?.id;
    const organizationId = req.organizationId;

    if (!organizationId) {
      return res.status(401).json({ success: false, message: 'Organization not found' });
    }

    // Log the message attempt
    const messageLog = await prisma.messageLog.create({
      data: {
        organizationId,
        leadId,
        userId,
        type: 'SMS',
        to,
        content: message,
        status: 'PENDING',
      },
    });

    // Send SMS via configured provider (Exotel or Plivo)
    const smsResult = await sendSMS(to, message, organizationId);

    // Update message log
    await prisma.messageLog.update({
      where: { id: messageLog.id },
      data: {
        status: smsResult.success ? 'SENT' : 'FAILED',
        externalId: smsResult.messageId,
        sentAt: smsResult.success ? new Date() : undefined,
      },
    });

    // Log activity on lead
    if (leadId) {
      await prisma.leadActivity.create({
        data: {
          leadId,
          type: 'SMS_SENT',
          title: 'SMS Sent',
          description: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
          userId,
          metadata: { messageLogId: messageLog.id },
        },
      });
    }

    res.json({
      success: true,
      data: {
        success: smsResult.success,
        messageId: messageLog.id,
        status: smsResult.success ? 'sent' : 'failed',
      },
    });
  } catch (error) {
    console.error('Error sending SMS:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send SMS',
    });
  }
});

/**
 * Send WhatsApp
 * POST /api/messaging/whatsapp
 */
router.post('/whatsapp', messagingRateLimiter, validate(whatsappValidation), async (req: TenantRequest, res: Response) => {
  try {
    const { to, message, leadId, templateId } = req.body;
    const userId = req.user?.id;
    const organizationId = req.organizationId;

    if (!organizationId) {
      return res.status(401).json({ success: false, message: 'Organization not found' });
    }

    // Log the message attempt
    const messageLog = await prisma.messageLog.create({
      data: {
        organizationId,
        leadId,
        userId,
        type: 'WHATSAPP',
        to,
        content: message,
        templateId,
        status: 'PENDING',
      },
    });

    // Send via WhatsApp Business API
    const whatsappResult = await sendWhatsApp(to, message, organizationId, templateId);

    // Update message log
    await prisma.messageLog.update({
      where: { id: messageLog.id },
      data: {
        status: whatsappResult.success ? 'SENT' : 'FAILED',
        externalId: whatsappResult.messageId,
        sentAt: whatsappResult.success ? new Date() : undefined,
      },
    });

    // Log activity on lead
    if (leadId) {
      await prisma.leadActivity.create({
        data: {
          leadId,
          type: 'WHATSAPP_SENT',
          title: 'WhatsApp Message Sent',
          description: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
          userId,
          metadata: { messageLogId: messageLog.id },
        },
      });
    }

    res.json({
      success: true,
      data: {
        success: whatsappResult.success,
        messageId: messageLog.id,
        status: whatsappResult.success ? 'sent' : 'failed',
      },
    });
  } catch (error) {
    console.error('Error sending WhatsApp:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send WhatsApp message',
    });
  }
});

/**
 * Send College Info via WhatsApp
 * POST /api/messaging/whatsapp/college-info
 *
 * Sends college/course information to a prospect via WhatsApp template
 * Used after AI voice agent calls or manually by telecallers
 */
router.post('/whatsapp/college-info', messagingRateLimiter, validate(collegeInfoValidation), async (req: TenantRequest, res: Response) => {
  try {
    const {
      to,
      collegeName,
      courseName,
      duration,
      fee,
      nextBatch,
      brochureUrl,
      websiteUrl,
      contactNumber,
      counselorName,
      leadId,
      callId,
    } = req.body;

    const organizationId = req.organizationId;

    if (!organizationId) {
      return res.status(401).json({ success: false, message: 'Organization not found' });
    }

    console.log(`[Messaging] Sending college info to ${to} for ${collegeName}`);

    // Send college info via WhatsApp
    const result = await postCallWhatsAppService.sendCollegeInfo(
      to,
      organizationId,
      {
        collegeName,
        courseName,
        duration,
        fee,
        nextBatch,
        brochureUrl,
        websiteUrl,
        contactNumber,
        counselorName,
      },
      callId
    );

    // Log activity on lead if provided
    if (leadId && result.sent) {
      await prisma.leadActivity.create({
        data: {
          leadId,
          type: 'WHATSAPP_SENT',
          title: 'College Info Sent via WhatsApp',
          description: `Sent ${collegeName} - ${courseName || 'course info'} details`,
          userId: req.user?.id,
          metadata: { messageId: result.messageId, callId },
        },
      });
    }

    res.json({
      success: true,
      data: {
        sent: result.sent,
        messageId: result.messageId,
        error: result.error,
      },
    });
  } catch (error) {
    console.error('Error sending college info WhatsApp:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send college information',
    });
  }
});

/**
 * Send Course Brochure via WhatsApp
 * POST /api/messaging/whatsapp/brochure
 */
router.post('/whatsapp/brochure', messagingRateLimiter, async (req: TenantRequest, res: Response) => {
  try {
    const { to, brochureUrl, courseName, collegeName, leadId, callId } = req.body;
    const organizationId = req.organizationId;

    if (!organizationId) {
      return res.status(401).json({ success: false, message: 'Organization not found' });
    }

    if (!to || !brochureUrl || !courseName || !collegeName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: to, brochureUrl, courseName, collegeName',
      });
    }

    const result = await postCallWhatsAppService.sendCourseBrochure(
      to,
      organizationId,
      brochureUrl,
      courseName,
      collegeName,
      callId
    );

    // Log activity on lead if provided
    if (leadId && result.sent) {
      await prisma.leadActivity.create({
        data: {
          leadId,
          type: 'WHATSAPP_SENT',
          title: 'Course Brochure Sent via WhatsApp',
          description: `Sent ${courseName} brochure from ${collegeName}`,
          userId: req.user?.id,
          metadata: { messageId: result.messageId, brochureUrl, callId },
        },
      });
    }

    res.json({
      success: true,
      data: {
        sent: result.sent,
        messageId: result.messageId,
        error: result.error,
      },
    });
  } catch (error) {
    console.error('Error sending brochure WhatsApp:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send brochure',
    });
  }
});

/**
 * Send Missed Call Follow-up via WhatsApp
 * POST /api/messaging/whatsapp/missed-call-followup
 */
router.post('/whatsapp/missed-call-followup', messagingRateLimiter, async (req: TenantRequest, res: Response) => {
  try {
    const { to, agentName, leadId, callId } = req.body;
    const organizationId = req.organizationId;

    if (!organizationId) {
      return res.status(401).json({ success: false, message: 'Organization not found' });
    }

    if (!to) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required',
      });
    }

    const result = await postCallWhatsAppService.sendMissedCallFollowup(
      to,
      organizationId,
      agentName || 'Our Team',
      callId
    );

    // Log activity on lead if provided
    if (leadId && result.sent) {
      await prisma.leadActivity.create({
        data: {
          leadId,
          type: 'WHATSAPP_SENT',
          title: 'Missed Call Follow-up Sent',
          description: 'Sent missed call follow-up message via WhatsApp',
          userId: req.user?.id,
          metadata: { messageId: result.messageId, callId },
        },
      });
    }

    res.json({
      success: true,
      data: {
        sent: result.sent,
        messageId: result.messageId,
        error: result.error,
      },
    });
  } catch (error) {
    console.error('Error sending missed call follow-up:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send missed call follow-up',
    });
  }
});

/**
 * Send Email
 * POST /api/messaging/email
 */
router.post('/email', messagingRateLimiter, validate(emailValidation), async (req: TenantRequest, res: Response) => {
  try {
    const { to, subject, body, leadId } = req.body;
    const userId = req.user?.id;
    const organizationId = req.organizationId;

    if (!organizationId) {
      return res.status(401).json({ success: false, message: 'Organization not found' });
    }

    // Log the message attempt
    const messageLog = await prisma.messageLog.create({
      data: {
        organizationId,
        leadId,
        userId,
        type: 'EMAIL',
        to,
        subject: subject || 'Follow-up from our call',
        content: body,
        status: 'PENDING',
      },
    });

    // Send email via SMTP (Nodemailer)
    const emailResult = await sendEmail(to, subject, body, organizationId);

    // Update message log
    await prisma.messageLog.update({
      where: { id: messageLog.id },
      data: {
        status: emailResult.success ? 'SENT' : 'FAILED',
        externalId: emailResult.messageId,
        sentAt: emailResult.success ? new Date() : undefined,
      },
    });

    // Log activity on lead
    if (leadId) {
      await prisma.leadActivity.create({
        data: {
          leadId,
          type: 'EMAIL_SENT',
          title: 'Email Sent',
          description: subject || 'Follow-up email',
          userId,
          metadata: { messageLogId: messageLog.id },
        },
      });
    }

    res.json({
      success: true,
      data: {
        success: emailResult.success,
        messageId: messageLog.id,
        status: emailResult.success ? 'sent' : 'failed',
      },
    });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send email',
    });
  }
});

/**
 * Quick Send - Uses default template
 * POST /api/messaging/quick-send
 */
router.post('/quick-send', messagingRateLimiter, validate(quickSendValidation), async (req: TenantRequest, res: Response) => {
  try {
    const { type, leadId, phone, email } = req.body;
    const userId = req.user?.id;
    const organizationId = req.organizationId;

    if (!organizationId) {
      return res.status(401).json({ success: false, message: 'Organization not found' });
    }

    // SECURITY: Get lead with organization verification
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId },
      select: { firstName: true, lastName: true, phone: true, email: true },
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found',
      });
    }

    const leadName = `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'there';
    const targetPhone = phone || lead.phone;
    const targetEmail = email || lead.email;

    // Get or create default template
    let message = '';
    let subject = '';

    switch (type) {
      case 'SMS':
        message = `Hi ${leadName}, thank you for speaking with us! We'll send you the details shortly. Reply STOP to opt out.`;
        break;
      case 'WHATSAPP':
        message = `Hi ${leadName}! 👋\n\nThank you for your time on our call. I'll be sending you more information shortly.\n\nFeel free to reach out if you have any questions!`;
        break;
      case 'EMAIL':
        subject = 'Thank you for your time';
        message = `Dear ${leadName},\n\nThank you for taking the time to speak with me today.\n\nI will follow up with the information we discussed.\n\nBest regards`;
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid message type',
        });
    }

    // Log the message
    const messageLog = await prisma.messageLog.create({
      data: {
        organizationId,
        leadId,
        userId,
        type,
        to: type === 'EMAIL' ? targetEmail : targetPhone,
        subject: type === 'EMAIL' ? subject : undefined,
        content: message,
        status: 'PENDING',
      },
    });

    // Send based on type
    let result;
    switch (type) {
      case 'SMS':
        result = await sendSMS(targetPhone, message, organizationId);
        break;
      case 'WHATSAPP':
        result = await sendWhatsApp(targetPhone, message, organizationId);
        break;
      case 'EMAIL':
        if (!targetEmail) {
          return res.status(400).json({
            success: false,
            message: 'No email address available',
          });
        }
        result = await sendEmail(targetEmail, subject, message, organizationId);
        break;
    }

    // Update log
    await prisma.messageLog.update({
      where: { id: messageLog.id },
      data: {
        status: result?.success ? 'SENT' : 'FAILED',
        externalId: result?.messageId,
        sentAt: result?.success ? new Date() : undefined,
      },
    });

    // Log activity
    const activityTypeMap: Record<string, 'SMS_SENT' | 'WHATSAPP_SENT' | 'EMAIL_SENT'> = {
      SMS: 'SMS_SENT',
      WHATSAPP: 'WHATSAPP_SENT',
      EMAIL: 'EMAIL_SENT',
    };
    await prisma.leadActivity.create({
      data: {
        leadId,
        type: activityTypeMap[type] || 'CUSTOM',
        title: `Quick ${type} Sent`,
        description: 'Automated message during call',
        userId,
        metadata: { messageLogId: messageLog.id, quickSend: true },
      },
    });

    res.json({
      success: true,
      data: {
        success: result?.success || false,
        messageId: messageLog.id,
        status: result?.success ? 'sent' : 'failed',
      },
    });
  } catch (error) {
    console.error('Error in quick send:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
    });
  }
});

/**
 * Get message templates
 * GET /api/messaging/templates
 */
router.get('/templates', validate([
  query('type').optional().isIn(['SMS', 'WHATSAPP', 'EMAIL']).withMessage('Invalid template type'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const { type } = req.query;
    const organizationId = req.organizationId;

    const where: any = { organizationId };
    if (type) {
      where.type = type;
    }

    const templates = await prisma.messageTemplate.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    res.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch templates',
    });
  }
});

// ============ Helper Functions ============

// SMS Provider Integration - Uses configured provider (Exotel or Plivo)
async function sendSMS(
  to: string,
  message: string,
  organizationId: string,
  userId?: string,
  leadId?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const { config } = await import('../config');
    const smsProvider = config.smsProvider || 'exotel';

    console.log(`[SMS] Sending via ${smsProvider} to ${to}: ${message.substring(0, 50)}...`);

    if (smsProvider === 'plivo') {
      // Use Plivo
      const { PlivoService } = await import('../integrations/plivo.service');
      const plivoService = new PlivoService();

      if (!plivoService.isConfigured()) {
        console.warn('[SMS] Plivo not configured, message not sent');
        return { success: false, error: 'Plivo not configured' };
      }

      const result = await plivoService.sendSms({
        to,
        message,
        leadId,
        userId,
      });

      return {
        success: true,
        messageId: result.messageId,
      };
    } else {
      // Use Exotel (default for India)
      const { exotelService } = await import('../integrations/exotel.service');

      if (!exotelService.isConfigured()) {
        console.warn('[SMS] Exotel not configured, message not sent');
        return { success: false, error: 'Exotel not configured' };
      }

      const result = await exotelService.sendSMS({
        to,
        message,
        leadId,
        userId,
      });

      return {
        success: result.success,
        messageId: result.messageSid,
        error: result.error,
      };
    }
  } catch (error: any) {
    console.error('SMS send error:', error);
    return { success: false, error: error.message };
  }
}

// WhatsApp Provider Integration - Using real WhatsApp service
async function sendWhatsApp(
  to: string,
  message: string,
  organizationId: string,
  templateId?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    console.log(`[WhatsApp] Sending to ${to}: ${message.substring(0, 50)}...`);

    const whatsappService = createWhatsAppService(organizationId);
    await whatsappService.loadConfig();

    const result = await whatsappService.sendMessage({
      to,
      message,
      templateName: templateId,
    });

    if (result.success) {
      console.log(`[WhatsApp] Message sent successfully: ${result.messageId}`);
      return {
        success: true,
        messageId: result.messageId,
      };
    } else {
      console.error(`[WhatsApp] Failed to send: ${result.error}`);
      return {
        success: false,
        error: result.error,
      };
    }
  } catch (error: any) {
    console.error('WhatsApp send error:', error);
    return { success: false, error: error.message };
  }
}

// Email Provider Integration - Uses SMTP via Nodemailer
async function sendEmail(
  to: string,
  subject: string,
  body: string,
  organizationId: string,
  userId?: string,
  leadId?: string,
  html?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const { emailService } = await import('../integrations/email.service');

    console.log(`[Email] Sending to ${to}: ${subject}`);

    // Verify email service is configured
    const verifyResult = await emailService.verifyConnection();
    if (!verifyResult.success) {
      console.warn('[Email] SMTP not configured:', verifyResult.error);
      return { success: false, error: 'Email service not configured: ' + verifyResult.error };
    }

    const result = await emailService.sendEmail({
      to,
      subject,
      body,
      html: html || `<div style="font-family: Arial, sans-serif;">${body.replace(/\n/g, '<br>')}</div>`,
      userId: userId || 'system',
      leadId,
      enableTracking: true,
    });

    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error: any) {
    console.error('Email send error:', error);
    return { success: false, error: error.message };
  }
}

export default router;
