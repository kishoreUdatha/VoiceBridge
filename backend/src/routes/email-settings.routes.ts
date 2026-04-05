import { Router, Request, Response, NextFunction } from 'express';
import { emailSettingsService } from '../services/emailSettings.service';
import { authenticate, AuthenticatedRequest } from '../middlewares/auth';
import { tenantMiddleware } from '../middlewares/tenant';

const router = Router();

/**
 * GET /email-settings - Get email settings for organization
 */
router.get('/', authenticate, tenantMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = (req as AuthenticatedRequest).user!.organizationId;

    const settings = await emailSettingsService.getSettings(organizationId);

    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /email-settings - Create or update email settings
 */
router.post('/', authenticate, tenantMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = (req as AuthenticatedRequest).user!.organizationId;

    const {
      provider,
      smtpHost,
      smtpPort,
      smtpSecure,
      smtpUser,
      smtpPassword,
      sendgridApiKey,
      sesAccessKeyId,
      sesSecretAccessKey,
      sesRegion,
      mailgunApiKey,
      mailgunDomain,
      fromEmail,
      fromName,
      replyToEmail,
      emailSignature,
      emailFooter,
      dailyLimit,
      hourlyLimit,
      isActive,
    } = req.body;

    const settings = await emailSettingsService.createOrUpdateSettings(organizationId, {
      provider,
      smtpHost,
      smtpPort,
      smtpSecure,
      smtpUser,
      smtpPassword,
      sendgridApiKey,
      sesAccessKeyId,
      sesSecretAccessKey,
      sesRegion,
      mailgunApiKey,
      mailgunDomain,
      fromEmail,
      fromName,
      replyToEmail,
      emailSignature,
      emailFooter,
      dailyLimit,
      hourlyLimit,
      isActive,
    });

    res.json({
      success: true,
      data: settings,
      message: 'Email settings saved successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /email-settings - Update email settings (alias for POST)
 */
router.put('/', authenticate, tenantMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = (req as AuthenticatedRequest).user!.organizationId;

    const settings = await emailSettingsService.createOrUpdateSettings(organizationId, req.body);

    res.json({
      success: true,
      data: settings,
      message: 'Email settings updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /email-settings - Delete email settings
 */
router.delete('/', authenticate, tenantMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = (req as AuthenticatedRequest).user!.organizationId;

    await emailSettingsService.deleteSettings(organizationId);

    res.json({
      success: true,
      message: 'Email settings deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /email-settings/test-connection - Test email connection
 */
router.post('/test-connection', authenticate, tenantMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = (req as AuthenticatedRequest).user!.organizationId;

    const result = await emailSettingsService.testConnection(organizationId);

    res.json({
      success: result.success,
      message: result.success ? result.message : result.error,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /email-settings/send-test - Send a test email
 */
router.post('/send-test', authenticate, tenantMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = (req as AuthenticatedRequest).user!.organizationId;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required',
      });
    }

    const result = await emailSettingsService.sendTestEmail(organizationId, email);

    res.json({
      success: true,
      message: 'Test email sent successfully',
      messageId: result.messageId,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /email-settings/providers - Get available email providers
 */
router.get('/providers', authenticate, async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: [
      {
        id: 'smtp',
        name: 'SMTP',
        description: 'Use your own SMTP server (Gmail, Outlook, etc.)',
        fields: ['smtpHost', 'smtpPort', 'smtpSecure', 'smtpUser', 'smtpPassword'],
      },
      {
        id: 'sendgrid',
        name: 'SendGrid',
        description: 'SendGrid email delivery service',
        fields: ['sendgridApiKey'],
      },
      {
        id: 'ses',
        name: 'AWS SES',
        description: 'Amazon Simple Email Service',
        fields: ['sesAccessKeyId', 'sesSecretAccessKey', 'sesRegion'],
      },
      {
        id: 'mailgun',
        name: 'Mailgun',
        description: 'Mailgun email delivery service',
        fields: ['mailgunApiKey', 'mailgunDomain'],
      },
    ],
  });
});

export default router;
