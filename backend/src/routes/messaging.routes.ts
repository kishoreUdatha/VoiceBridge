/**
 * Messaging Routes
 * Handles SMS, WhatsApp, and Email sending for telecaller app
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middlewares/auth';
import { createWhatsAppService } from '../integrations/whatsapp.service';

const router = Router();
const prisma = new PrismaClient();

// Apply authentication to all routes
router.use(authenticate);

/**
 * Send SMS
 * POST /api/messaging/sms
 */
router.post('/sms', async (req: Request, res: Response) => {
  try {
    const { to, message, leadId } = req.body;
    const userId = (req as any).user?.id;
    const organizationId = (req as any).user?.organizationId;

    if (!to || !message) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and message are required',
      });
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

    // TODO: Integrate with actual SMS provider (Twilio, MSG91, etc.)
    // For now, simulate sending
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
router.post('/whatsapp', async (req: Request, res: Response) => {
  try {
    const { to, message, leadId, templateId } = req.body;
    const userId = (req as any).user?.id;
    const organizationId = (req as any).user?.organizationId;

    if (!to || !message) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and message are required',
      });
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

    // TODO: Integrate with WhatsApp Business API
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
 * Send Email
 * POST /api/messaging/email
 */
router.post('/email', async (req: Request, res: Response) => {
  try {
    const { to, subject, body, leadId } = req.body;
    const userId = (req as any).user?.id;
    const organizationId = (req as any).user?.organizationId;

    if (!to || !body) {
      return res.status(400).json({
        success: false,
        message: 'Email address and body are required',
      });
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

    // TODO: Integrate with email provider (SendGrid, SES, etc.)
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
router.post('/quick-send', async (req: Request, res: Response) => {
  try {
    const { type, leadId, phone, email } = req.body;
    const userId = (req as any).user?.id;
    const organizationId = (req as any).user?.organizationId;

    if (!type || !leadId) {
      return res.status(400).json({
        success: false,
        message: 'Message type and leadId are required',
      });
    }

    // Get lead info
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
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
    await prisma.leadActivity.create({
      data: {
        leadId,
        type: `${type}_SENT`,
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
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const { type } = req.query;
    const organizationId = (req as any).user?.organizationId;

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

// SMS Provider Integration
async function sendSMS(
  to: string,
  message: string,
  organizationId: string
): Promise<{ success: boolean; messageId?: string }> {
  try {
    // TODO: Replace with actual SMS provider integration
    // Example providers: Twilio, MSG91, Plivo, Gupshup

    // For now, simulate success
    console.log(`[SMS] Sending to ${to}: ${message.substring(0, 50)}...`);

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      success: true,
      messageId: `sms_${Date.now()}`,
    };
  } catch (error) {
    console.error('SMS send error:', error);
    return { success: false };
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

// Email Provider Integration
async function sendEmail(
  to: string,
  subject: string,
  body: string,
  organizationId: string
): Promise<{ success: boolean; messageId?: string }> {
  try {
    // TODO: Replace with actual email provider integration
    // Providers: SendGrid, Amazon SES, Mailgun, Postmark

    console.log(`[Email] Sending to ${to}: ${subject}`);

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      success: true,
      messageId: `email_${Date.now()}`,
    };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false };
  }
}

export default router;
