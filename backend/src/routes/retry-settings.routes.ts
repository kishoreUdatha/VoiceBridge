import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate, authorize } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import { retrySettingsService } from '../services/retry-settings.service';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticate);
router.use(tenantMiddleware);

// ==================== RETRY SETTINGS ====================

// GET /api/settings/retry - Get retry settings
router.get('/retry', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = (req as TenantRequest).organizationId!;
    const settings = await retrySettingsService.getRetrySettings(organizationId);
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
});

// PUT /api/settings/retry - Update retry settings (admin only)
router.put(
  '/retry',
  authorize(['super_admin', 'admin']),
  validate([
    body('callRetryEnabled').optional().isBoolean(),
    body('callMaxAttempts').optional().isInt({ min: 1, max: 10 }),
    body('callRetryInterval').optional().isInt({ min: 1, max: 10080 }),
    body('callRetryStartTime').optional({ nullable: true }).custom((value) => value === null || /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value)),
    body('callRetryEndTime').optional({ nullable: true }).custom((value) => value === null || /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value)),
    body('callRetryDays').optional().isArray(),
    body('whatsappRetryEnabled').optional().isBoolean(),
    body('whatsappMaxAttempts').optional().isInt({ min: 1, max: 10 }),
    body('whatsappRetryInterval').optional().isInt({ min: 1, max: 10080 }),
    body('whatsappRetryStartTime').optional({ nullable: true }).custom((value) => value === null || /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value)),
    body('whatsappRetryEndTime').optional({ nullable: true }).custom((value) => value === null || /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value)),
    body('smsRetryEnabled').optional().isBoolean(),
    body('smsMaxAttempts').optional().isInt({ min: 1, max: 10 }),
    body('smsRetryInterval').optional().isInt({ min: 1, max: 10080 }),
    body('smsRetryStartTime').optional({ nullable: true }).custom((value) => value === null || /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value)),
    body('smsRetryEndTime').optional({ nullable: true }).custom((value) => value === null || /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value)),
    body('emailRetryEnabled').optional().isBoolean(),
    body('emailMaxAttempts').optional().isInt({ min: 1, max: 10 }),
    body('emailRetryInterval').optional().isInt({ min: 1, max: 10080 }),
    body('skipWeekends').optional().isBoolean(),
    body('skipHolidays').optional().isBoolean(),
    body('respectDND').optional().isBoolean(),
    body('maxTotalAttempts').optional().isInt({ min: 1, max: 50 }),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as TenantRequest).organizationId!;
      const settings = await retrySettingsService.updateRetrySettings(organizationId, req.body);
      res.json({ success: true, data: settings, message: 'Retry settings updated successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== CHANNEL-SPECIFIC SETTINGS ====================

// GET /api/settings/retry/:channel - Get channel-specific retry settings
router.get(
  '/retry/:channel',
  validate([param('channel').isIn(['call', 'whatsapp', 'sms', 'email'])]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as TenantRequest).organizationId!;
      const { channel } = req.params;
      const settings = await retrySettingsService.getChannelRetrySettings(
        organizationId,
        channel as 'call' | 'whatsapp' | 'sms' | 'email'
      );
      res.json({ success: true, data: settings });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/settings/retry/:channel - Update channel-specific retry settings
router.put(
  '/retry/:channel',
  authorize(['super_admin', 'admin']),
  validate([
    param('channel').isIn(['call', 'whatsapp', 'sms', 'email']),
    body('enabled').optional().isBoolean(),
    body('maxAttempts').optional().isInt({ min: 1, max: 10 }),
    body('retryInterval').optional().isInt({ min: 15, max: 1440 }),
    body('startTime').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('endTime').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('retryDays').optional().isArray(),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as TenantRequest).organizationId!;
      const { channel } = req.params;
      const settings = await retrySettingsService.updateChannelRetrySettings(
        organizationId,
        channel as 'call' | 'whatsapp' | 'sms' | 'email',
        req.body
      );
      res.json({ success: true, data: settings, message: `${channel} retry settings updated` });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/settings/retry/reset - Reset retry settings to defaults
router.post(
  '/retry/reset',
  authorize(['super_admin', 'admin']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as TenantRequest).organizationId!;
      const settings = await retrySettingsService.resetRetrySettings(organizationId);
      res.json({ success: true, data: settings, message: 'Retry settings reset to defaults' });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/settings/retry/check - Check if retry is allowed
router.post(
  '/retry/check',
  validate([
    body('channel').isIn(['call', 'whatsapp', 'sms', 'email']),
    body('currentAttempts').isInt({ min: 0 }),
    body('totalAttempts').isInt({ min: 0 }),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as TenantRequest).organizationId!;
      const { channel, currentAttempts, totalAttempts } = req.body;
      const allowed = await retrySettingsService.isRetryAllowed(
        organizationId,
        channel,
        currentAttempts,
        totalAttempts
      );
      res.json({ success: true, data: { allowed } });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
