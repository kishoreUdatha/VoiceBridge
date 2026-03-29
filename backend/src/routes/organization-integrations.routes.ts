import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { prisma } from '../config/database';
import { authenticate, authorize } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { ApiResponse } from '../utils/apiResponse';
import crypto from 'crypto';

const router = Router();

// Rate limiter for credential operations
const credentialLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  message: { success: false, message: 'Too many credential requests' },
});

// Encryption helpers for sensitive credentials
const ENCRYPTION_KEY = (() => {
  const key = process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!key) {
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      throw new Error('FATAL: CREDENTIALS_ENCRYPTION_KEY environment variable is required in production');
    }
    console.warn('WARNING: CREDENTIALS_ENCRYPTION_KEY not set - using fallback for development only');
    // In development, use a derived key from JWT_SECRET if available, or generate one
    return process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
  }
  return key;
})();
const IV_LENGTH = 16;

// Allowed integration IDs (whitelist)
const ALLOWED_INTEGRATIONS = [
  'whatsapp', 'voice', 'openai', 'elevenlabs', 'twilio', 'exotel',
  'facebook', 'instagram', 'linkedin', 'google', 'razorpay', 'stripe',
  'zapier', 'slack', 'hubspot', 'salesforce', 'mailchimp', 'sendgrid'
];

// Mask sensitive values for display
function maskValue(value: string): string {
  if (!value || value.length < 8) return '****';
  return value.substring(0, 4) + '****' + value.substring(value.length - 4);
}

function encrypt(text: string): string {
  if (!text) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text: string): string {
  if (!text || !text.includes(':')) return text;
  try {
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    return text; // Return as-is if decryption fails (might be unencrypted)
  }
}

// Fields that should be encrypted
const SENSITIVE_FIELDS = [
  'accessToken', 'apiKey', 'apiToken', 'apiSecret', 'pageAccessToken', 'verifyToken'
];

// Apply middleware
router.use(authenticate);
router.use(tenantMiddleware);
router.use(credentialLimiter);

/**
 * GET /organization/integrations
 * Get all integration credentials for the organization (masked for security)
 */
router.get('/', authorize('admin', 'manager'), async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organization!.id;

    // Get all integration settings from organization
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    // Parse stored integrations
    const orgSettings = organization?.settings as Record<string, any> | null;
    const integrations = orgSettings?.integrations
      ? (typeof orgSettings.integrations === 'string'
          ? JSON.parse(orgSettings.integrations)
          : orgSettings.integrations)
      : {};

    // Decrypt sensitive fields and MASK them for display (security)
    const result: Record<string, any> = {};

    for (const [integrationId, config] of Object.entries(integrations as Record<string, any>)) {
      // Only include whitelisted integrations
      if (!ALLOWED_INTEGRATIONS.includes(integrationId)) continue;

      result[integrationId] = { ...config };

      // Check if configured (has at least one required field)
      const hasConfig = Object.keys(config).some(k =>
        config[k] && !['isConfigured', 'lastTested', 'updatedAt'].includes(k)
      );
      result[integrationId].isConfigured = hasConfig;

      // Decrypt and MASK sensitive values - never return full credentials
      for (const field of SENSITIVE_FIELDS) {
        if (config[field]) {
          const decrypted = decrypt(config[field]);
          // Return MASKED version for security
          result[integrationId][field] = maskValue(decrypted);
          // Add a flag indicating the field is configured
          result[integrationId][`${field}Configured`] = true;
        }
      }
    }

    ApiResponse.success(res, 'Integration credentials retrieved', result);
  } catch (error) {
    console.error('Failed to get integrations:', error);
    ApiResponse.error(res, 'Failed to retrieve integration credentials', 500);
  }
});

/**
 * PUT /organization/integrations/:integrationId
 * Save credentials for a specific integration
 */
router.put(
  '/:integrationId',
  authorize('admin'),
  validate([
    param('integrationId').isIn(ALLOWED_INTEGRATIONS).withMessage('Invalid integration ID'),
    body('apiKey').optional().trim().isLength({ max: 500 }).withMessage('API key too long'),
    body('apiToken').optional().trim().isLength({ max: 500 }).withMessage('API token too long'),
    body('apiSecret').optional().trim().isLength({ max: 500 }).withMessage('API secret too long'),
    body('accessToken').optional().trim().isLength({ max: 2000 }).withMessage('Access token too long'),
    body('pageAccessToken').optional().trim().isLength({ max: 2000 }).withMessage('Page access token too long'),
    body('verifyToken').optional().trim().isLength({ max: 500 }).withMessage('Verify token too long'),
    body('phoneNumber').optional().trim().matches(/^[\d+\-() ]{7,20}$/).withMessage('Invalid phone number'),
    body('subdomain').optional().trim().isLength({ max: 100 }).withMessage('Subdomain too long'),
    body('callerId').optional().trim().isLength({ max: 50 }).withMessage('Caller ID too long'),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organization!.id;
      const { integrationId } = req.params;

      // Extract only allowed fields from body (whitelist approach)
      const allowedFields = [
        'apiKey', 'apiToken', 'apiSecret', 'accessToken', 'pageAccessToken', 'verifyToken',
        'phoneNumber', 'phoneNumberId', 'businessAccountId', 'subdomain', 'callerId', 'appId',
        'model', 'defaultVoiceId', 'provider', 'webhookUrl', 'enabled'
      ];
      const credentials: Record<string, any> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          credentials[field] = req.body[field];
        }
      }

    // Get existing settings
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    // Parse existing integrations from organization settings
    const currentSettings = (organization?.settings as Record<string, any>) || {};
    const integrations = currentSettings.integrations
      ? (typeof currentSettings.integrations === 'string'
          ? JSON.parse(currentSettings.integrations)
          : currentSettings.integrations)
      : {};

    // Encrypt sensitive fields
    const encryptedCredentials: Record<string, any> = {};
    for (const [key, value] of Object.entries(credentials)) {
      if (SENSITIVE_FIELDS.includes(key) && value) {
        encryptedCredentials[key] = encrypt(value as string);
      } else {
        encryptedCredentials[key] = value;
      }
    }

    // Update the specific integration
    integrations[integrationId] = {
      ...encryptedCredentials,
      updatedAt: new Date().toISOString(),
    };

    // Update organization settings
    const updatedSettings = { ...currentSettings, integrations };
    await prisma.organization.update({
      where: { id: organizationId },
      data: { settings: updatedSettings },
    });

    // Also update specific tables if they exist (for backward compatibility)
    await updateLegacyTables(organizationId, integrationId, credentials);

    ApiResponse.success(res, `${integrationId} credentials saved successfully`);
  } catch (error) {
    console.error('Failed to save integration:', error);
    ApiResponse.error(res, 'Failed to save integration credentials', 500);
  }
});

/**
 * DELETE /organization/integrations/:integrationId
 * Remove credentials for a specific integration
 */
router.delete(
  '/:integrationId',
  authorize('admin'),
  validate([
    param('integrationId').isIn(ALLOWED_INTEGRATIONS).withMessage('Invalid integration ID'),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organization!.id;
      const { integrationId } = req.params;

      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { settings: true },
      });

      const currentSettings = (organization?.settings as Record<string, any>) || {};
      if (currentSettings.integrations) {
        const integrations = typeof currentSettings.integrations === 'string'
          ? JSON.parse(currentSettings.integrations)
          : currentSettings.integrations;

        delete integrations[integrationId];

        const updatedSettings = { ...currentSettings, integrations };
        await prisma.organization.update({
          where: { id: organizationId },
          data: { settings: updatedSettings },
        });
      }

      ApiResponse.success(res, `${integrationId} credentials removed`);
    } catch (error) {
      console.error('Failed to delete integration:', error);
      ApiResponse.error(res, 'Failed to remove integration credentials', 500);
    }
  }
);

/**
 * Helper to update legacy tables for backward compatibility
 */
async function updateLegacyTables(organizationId: string, integrationId: string, credentials: any) {
  try {
    switch (integrationId) {
      case 'whatsapp':
        // Update WhatsApp-specific settings if table exists
        await prisma.$executeRaw`
          INSERT INTO "OrganizationSettings" ("organizationId", "whatsappProvider", "whatsappPhoneNumber", "whatsappAccessToken", "whatsappPhoneNumberId", "whatsappBusinessAccountId", "whatsappConfigured")
          VALUES (${organizationId}, ${credentials.provider || 'meta'}, ${credentials.phoneNumber}, ${credentials.accessToken}, ${credentials.phoneNumberId}, ${credentials.businessAccountId}, true)
          ON CONFLICT ("organizationId") DO UPDATE SET
            "whatsappProvider" = EXCLUDED."whatsappProvider",
            "whatsappPhoneNumber" = EXCLUDED."whatsappPhoneNumber",
            "whatsappAccessToken" = EXCLUDED."whatsappAccessToken",
            "whatsappPhoneNumberId" = EXCLUDED."whatsappPhoneNumberId",
            "whatsappBusinessAccountId" = EXCLUDED."whatsappBusinessAccountId",
            "whatsappConfigured" = true
        `.catch(() => {}); // Ignore if columns don't exist
        break;

      case 'voice':
        // Update Exotel settings
        await prisma.$executeRaw`
          INSERT INTO "OrganizationSettings" ("organizationId", "exotelApiKey", "exotelApiToken", "exotelSubdomain", "exotelCallerId", "exotelAppId")
          VALUES (${organizationId}, ${credentials.apiKey}, ${credentials.apiToken}, ${credentials.subdomain}, ${credentials.callerId}, ${credentials.appId})
          ON CONFLICT ("organizationId") DO UPDATE SET
            "exotelApiKey" = EXCLUDED."exotelApiKey",
            "exotelApiToken" = EXCLUDED."exotelApiToken",
            "exotelSubdomain" = EXCLUDED."exotelSubdomain",
            "exotelCallerId" = EXCLUDED."exotelCallerId",
            "exotelAppId" = EXCLUDED."exotelAppId"
        `.catch(() => {});
        break;

      case 'openai':
        await prisma.$executeRaw`
          INSERT INTO "OrganizationSettings" ("organizationId", "openaiApiKey", "openaiModel")
          VALUES (${organizationId}, ${credentials.apiKey}, ${credentials.model || 'gpt-4o'})
          ON CONFLICT ("organizationId") DO UPDATE SET
            "openaiApiKey" = EXCLUDED."openaiApiKey",
            "openaiModel" = EXCLUDED."openaiModel"
        `.catch(() => {});
        break;

      case 'elevenlabs':
        await prisma.$executeRaw`
          INSERT INTO "OrganizationSettings" ("organizationId", "elevenlabsApiKey", "elevenlabsVoiceId")
          VALUES (${organizationId}, ${credentials.apiKey}, ${credentials.defaultVoiceId})
          ON CONFLICT ("organizationId") DO UPDATE SET
            "elevenlabsApiKey" = EXCLUDED."elevenlabsApiKey",
            "elevenlabsVoiceId" = EXCLUDED."elevenlabsVoiceId"
        `.catch(() => {});
        break;
    }
  } catch (e) {
    // Silently fail - legacy table updates are optional
    console.log('Legacy table update skipped:', e);
  }
}

export default router;
