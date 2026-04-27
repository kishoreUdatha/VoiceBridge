import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import { prisma } from '../config/database';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import { ApiResponse } from '../utils/apiResponse';
import { createWhatsAppService } from '../integrations/whatsapp.service';
import { dynamicIndustryService } from '../services/dynamic-industry.service';
import { industryCacheService } from '../services/industry-cache.service';

// Validation rules
const institutionValidation = [
  body('name').optional().trim().isLength({ max: 200 }).withMessage('Name must be at most 200 characters'),
  body('location').optional().trim().isLength({ max: 500 }).withMessage('Location must be at most 500 characters'),
  body('website').optional().trim().isURL().withMessage('Invalid website URL'),
  body('description').optional().trim().isLength({ max: 2000 }).withMessage('Description must be at most 2000 characters'),
  body('courses').optional().trim().isLength({ max: 5000 }).withMessage('Courses must be at most 5000 characters'),
  body('phone').optional().trim().matches(/^[\d+\-() ]{0,20}$/).withMessage('Invalid phone number format'),
  body('email').optional().trim().isEmail().withMessage('Invalid email format'),
];

const promptValidation = [
  body('prompt').trim().notEmpty().withMessage('Prompt is required')
    .isLength({ max: 10000 }).withMessage('Prompt must be at most 10000 characters'),
];

const whatsappSettingsValidation = [
  body('provider').optional().isIn(['exotel', 'meta', 'gupshup', 'wati']).withMessage('Invalid provider'),
  body('phoneNumber').optional().trim().matches(/^[\d+\-() ]{0,20}$/).withMessage('Invalid phone number format'),
  body('apiKey').optional().trim().isLength({ max: 500 }).withMessage('API key must be at most 500 characters'),
  body('apiSecret').optional().trim().isLength({ max: 500 }).withMessage('API secret must be at most 500 characters'),
  body('accessToken').optional().trim().isLength({ max: 500 }).withMessage('Access token must be at most 500 characters'),
  body('businessAccountId').optional().trim().isLength({ max: 100 }).withMessage('Business account ID must be at most 100 characters'),
  body('phoneNumberId').optional().trim().isLength({ max: 100 }).withMessage('Phone number ID must be at most 100 characters'),
  body('appSecret').optional().trim().isLength({ max: 100 }).withMessage('App secret must be at most 100 characters'),
];

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(tenantMiddleware);

/**
 * @swagger
 * /api/organization/institution:
 *   get:
 *     summary: Get institution settings
 *     tags: [Organization]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Institution settings retrieved successfully
 */
router.get('/institution', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId;

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        settings: true,
      },
    });

    if (!organization) {
      return ApiResponse.error(res, 'Organization not found', 404);
    }

    const settings = (organization.settings as any) || {};
    const institution = settings.institution || {
      name: organization.name,
      location: '',
      website: '',
      description: '',
      courses: '',
      phone: '',
      email: '',
    };

    return ApiResponse.success(res, 'Institution settings retrieved', {
      institution,
      organizationId: organization.id,
      organizationName: organization.name,
    });
  } catch (error) {
    console.error('Error fetching institution settings:', error);
    return ApiResponse.error(res, 'Failed to fetch institution settings', 500);
  }
});

/**
 * @swagger
 * /api/organization/institution:
 *   put:
 *     summary: Update institution settings
 *     tags: [Organization]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Institution name (e.g., "Amrutha University")
 *               location:
 *                 type: string
 *                 description: Location/City (e.g., "Hyderabad, Telangana")
 *               website:
 *                 type: string
 *                 description: Website URL
 *               description:
 *                 type: string
 *                 description: About the institution
 *               courses:
 *                 type: string
 *                 description: Courses offered (can be multiline)
 *               phone:
 *                 type: string
 *                 description: Contact phone number
 *               email:
 *                 type: string
 *                 description: Contact email
 *     responses:
 *       200:
 *         description: Institution settings updated successfully
 */
router.put('/institution', validate(institutionValidation), async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId;
    const { name, location, website, description, courses, phone, email } = req.body;

    // Get current organization
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      return ApiResponse.error(res, 'Organization not found', 404);
    }

    // Merge with existing settings
    const currentSettings = (organization.settings as any) || {};
    const updatedSettings = {
      ...currentSettings,
      institution: {
        name: name || currentSettings.institution?.name || organization.name,
        location: location ?? currentSettings.institution?.location ?? '',
        website: website ?? currentSettings.institution?.website ?? '',
        description: description ?? currentSettings.institution?.description ?? '',
        courses: courses ?? currentSettings.institution?.courses ?? '',
        phone: phone ?? currentSettings.institution?.phone ?? '',
        email: email ?? currentSettings.institution?.email ?? '',
      },
    };

    // Update organization
    const updated = await prisma.organization.update({
      where: { id: organizationId },
      data: { settings: updatedSettings },
      select: {
        id: true,
        name: true,
        settings: true,
      },
    });

    return ApiResponse.success(res, 'Institution settings updated successfully', {
      institution: (updated.settings as any).institution,
    });
  } catch (error) {
    console.error('Error updating institution settings:', error);
    return ApiResponse.error(res, 'Failed to update institution settings', 500);
  }
});

/**
 * @swagger
 * /api/organization/placeholders:
 *   get:
 *     summary: Get available placeholders for AI agents
 *     tags: [Organization]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of available placeholders
 */
router.get('/placeholders', async (req: TenantRequest, res: Response) => {
  try {
    const placeholders = [
      {
        key: '{{INSTITUTION_NAME}}',
        description: 'Institution/University name',
        example: 'Amrutha University',
        field: 'name',
      },
      {
        key: '{{INSTITUTION_LOCATION}}',
        description: 'City/Location of the institution',
        example: 'Hyderabad, Telangana',
        field: 'location',
      },
      {
        key: '{{INSTITUTION_WEBSITE}}',
        description: 'Website URL',
        example: 'www.amrutha.edu',
        field: 'website',
      },
      {
        key: '{{INSTITUTION_DESCRIPTION}}',
        description: 'About the institution',
        example: 'A leading university offering...',
        field: 'description',
      },
      {
        key: '{{INSTITUTION_COURSES}}',
        description: 'Courses offered',
        example: 'B.Tech, MBA, BBA, MCA...',
        field: 'courses',
      },
      {
        key: '{{INSTITUTION_PHONE}}',
        description: 'Contact phone number',
        example: '+91-9876543210',
        field: 'phone',
      },
      {
        key: '{{INSTITUTION_EMAIL}}',
        description: 'Contact email address',
        example: 'admissions@amrutha.edu',
        field: 'email',
      },
    ];

    return ApiResponse.success(res, 'Placeholders retrieved', {
      placeholders,
      usage: 'Use these placeholders in your AI agent prompts. They will be automatically replaced with your institution settings when making calls.',
    });
  } catch (error) {
    console.error('Error fetching placeholders:', error);
    return ApiResponse.error(res, 'Failed to fetch placeholders', 500);
  }
});

/**
 * @swagger
 * /api/organization/preview-prompt:
 *   post:
 *     summary: Preview prompt with placeholders replaced
 *     tags: [Organization]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prompt
 *             properties:
 *               prompt:
 *                 type: string
 *                 description: Prompt text with placeholders
 *     responses:
 *       200:
 *         description: Prompt with placeholders replaced
 */
router.post('/preview-prompt', validate(promptValidation), async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId;
    const { prompt } = req.body;

    // Get organization settings
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true, name: true },
    });

    if (!organization) {
      return ApiResponse.error(res, 'Organization not found', 404);
    }

    const settings = (organization.settings as any) || {};
    const institution = settings.institution || {};

    // Replace placeholders
    const previewedPrompt = prompt
      .replace(/\{\{INSTITUTION_NAME\}\}/g, institution.name || organization.name || 'Our Institution')
      .replace(/\{\{INSTITUTION_LOCATION\}\}/g, institution.location || '[Location not set]')
      .replace(/\{\{INSTITUTION_WEBSITE\}\}/g, institution.website || '[Website not set]')
      .replace(/\{\{INSTITUTION_DESCRIPTION\}\}/g, institution.description || '[Description not set]')
      .replace(/\{\{INSTITUTION_COURSES\}\}/g, institution.courses || '[Courses not set]')
      .replace(/\{\{INSTITUTION_PHONE\}\}/g, institution.phone || '[Phone not set]')
      .replace(/\{\{INSTITUTION_EMAIL\}\}/g, institution.email || '[Email not set]');

    return ApiResponse.success(res, 'Preview generated', {
      original: prompt,
      preview: previewedPrompt,
      institution,
    });
  } catch (error) {
    console.error('Error previewing prompt:', error);
    return ApiResponse.error(res, 'Failed to preview prompt', 500);
  }
});

/**
 * @swagger
 * /api/organization:
 *   get:
 *     summary: Get all organization settings
 *     tags: [Organization]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Organization settings retrieved successfully
 */
router.get('/', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId;

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        settings: true,
      },
    });

    if (!organization) {
      return ApiResponse.error(res, 'Organization not found', 404);
    }

    return ApiResponse.success(res, 'Organization settings retrieved', {
      organizationId: organization.id,
      organizationName: organization.name,
      settings: organization.settings || {},
    });
  } catch (error) {
    console.error('Error fetching organization settings:', error);
    return ApiResponse.error(res, 'Failed to fetch organization settings', 500);
  }
});

/**
 * @swagger
 * /api/organization:
 *   put:
 *     summary: Update organization settings (partial update)
 *     tags: [Organization]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Settings to update (merged with existing)
 *     responses:
 *       200:
 *         description: Organization settings updated successfully
 */
router.put('/', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId;
    const newSettings = req.body;

    // Validate settings object - prevent dangerous patterns
    if (typeof newSettings !== 'object' || newSettings === null) {
      return ApiResponse.error(res, 'Settings must be an object', 400);
    }

    // Prevent prototype pollution
    const settingsStr = JSON.stringify(newSettings);
    if (settingsStr.includes('__proto__') || settingsStr.includes('constructor') || settingsStr.includes('prototype')) {
      return ApiResponse.error(res, 'Invalid settings content', 400);
    }

    // Size limit for settings
    if (settingsStr.length > 100000) {
      return ApiResponse.error(res, 'Settings too large (max 100KB)', 400);
    }

    // Get current organization
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      return ApiResponse.error(res, 'Organization not found', 404);
    }

    // Merge with existing settings (deep merge for nested objects)
    const currentSettings = (organization.settings as any) || {};
    const updatedSettings = deepMerge(currentSettings, newSettings);

    // Update organization
    const updated = await prisma.organization.update({
      where: { id: organizationId },
      data: { settings: updatedSettings },
      select: {
        id: true,
        name: true,
        settings: true,
      },
    });

    return ApiResponse.success(res, 'Organization settings updated successfully', {
      settings: updated.settings,
    });
  } catch (error) {
    console.error('Error updating organization settings:', error);
    return ApiResponse.error(res, 'Failed to update organization settings', 500);
  }
});

// Helper function for deep merging objects
function deepMerge(target: any, source: any): any {
  const result = { ...target };
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

/**
 * @swagger
 * /api/organization/settings/whatsapp:
 *   get:
 *     summary: Get WhatsApp settings for organization
 *     tags: [Organization]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: WhatsApp settings retrieved successfully
 */
router.get('/settings/whatsapp', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId;

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    if (!organization) {
      return ApiResponse.error(res, 'Organization not found', 404);
    }

    const settings = (organization.settings as any) || {};
    const whatsapp = settings.whatsapp || {
      provider: 'meta',
      phoneNumber: '',
      isConfigured: false,
    };

    // Don't send secrets to frontend - mask them
    const safeWhatsapp = {
      ...whatsapp,
      apiKey: whatsapp.apiKey ? '••••••••' + whatsapp.apiKey.slice(-4) : '',
      apiSecret: whatsapp.apiSecret ? '••••••••' + whatsapp.apiSecret.slice(-4) : '',
      accessToken: whatsapp.accessToken ? '••••••••' + whatsapp.accessToken.slice(-4) : '',
      appSecret: whatsapp.appSecret ? '••••••••' + whatsapp.appSecret.slice(-4) : '',
    };

    return ApiResponse.success(res, 'WhatsApp settings retrieved', safeWhatsapp);
  } catch (error) {
    console.error('Error fetching WhatsApp settings:', error);
    return ApiResponse.error(res, 'Failed to fetch WhatsApp settings', 500);
  }
});

/**
 * @swagger
 * /api/organization/settings/whatsapp:
 *   post:
 *     summary: Update WhatsApp settings for organization
 *     tags: [Organization]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               provider:
 *                 type: string
 *                 enum: [exotel, meta, gupshup, wati]
 *               phoneNumber:
 *                 type: string
 *               apiKey:
 *                 type: string
 *               apiSecret:
 *                 type: string
 *               accessToken:
 *                 type: string
 *               businessAccountId:
 *                 type: string
 *               phoneNumberId:
 *                 type: string
 *     responses:
 *       200:
 *         description: WhatsApp settings updated successfully
 */
router.post('/settings/whatsapp', validate(whatsappSettingsValidation), async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId;
    const {
      provider,
      phoneNumber,
      apiKey,
      apiSecret,
      accessToken,
      businessAccountId,
      phoneNumberId,
      appSecret,
    } = req.body;

    // Get current organization
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      return ApiResponse.error(res, 'Organization not found', 404);
    }

    const currentSettings = (organization.settings as any) || {};
    const currentWhatsapp = currentSettings.whatsapp || {};

    // Only update fields that are provided (don't overwrite with empty masked values)
    const updatedWhatsapp = {
      provider: provider || currentWhatsapp.provider || 'exotel',
      phoneNumber: phoneNumber || currentWhatsapp.phoneNumber || '',
      apiKey: apiKey && !apiKey.startsWith('••••') ? apiKey : currentWhatsapp.apiKey || '',
      apiSecret: apiSecret && !apiSecret.startsWith('••••') ? apiSecret : currentWhatsapp.apiSecret || '',
      accessToken: accessToken && !accessToken.startsWith('••••') ? accessToken : currentWhatsapp.accessToken || '',
      appSecret: appSecret && !appSecret.startsWith('••••') ? appSecret : currentWhatsapp.appSecret || '',
      businessAccountId: businessAccountId || currentWhatsapp.businessAccountId || '',
      phoneNumberId: phoneNumberId || currentWhatsapp.phoneNumberId || '',
      isConfigured: !!(phoneNumber || currentWhatsapp.phoneNumber || phoneNumberId || currentWhatsapp.phoneNumberId || accessToken || currentWhatsapp.accessToken),
      updatedAt: new Date().toISOString(),
    };

    const updatedSettings = {
      ...currentSettings,
      whatsapp: updatedWhatsapp,
    };

    await prisma.organization.update({
      where: { id: organizationId },
      data: { settings: updatedSettings },
    });

    return ApiResponse.success(res, 'WhatsApp settings saved successfully', {
      provider: updatedWhatsapp.provider,
      phoneNumber: updatedWhatsapp.phoneNumber,
      isConfigured: updatedWhatsapp.isConfigured,
    });
  } catch (error) {
    console.error('Error updating WhatsApp settings:', error);
    return ApiResponse.error(res, 'Failed to update WhatsApp settings', 500);
  }
});

/**
 * @swagger
 * /api/organization/settings/whatsapp/test:
 *   post:
 *     summary: Test WhatsApp connection
 *     tags: [Organization]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: WhatsApp connection test result
 */
router.post('/settings/whatsapp/test', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId;

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    if (!organization) {
      return ApiResponse.error(res, 'Organization not found', 404);
    }

    const settings = (organization.settings as any) || {};
    const whatsapp = settings.whatsapp || {};

    // Tenant must configure their own WhatsApp - no fallback to platform credentials
    const hasValidConfig = whatsapp.isConfigured && (whatsapp.phoneNumber || whatsapp.phoneNumberId) && whatsapp.accessToken;

    if (!hasValidConfig) {
      return ApiResponse.error(res, 'WhatsApp not configured. Please add credentials in Settings.', 400);
    }

    // Use the WhatsApp service to test connection
    const whatsappService = createWhatsAppService(organizationId!);
    const testResult = await whatsappService.testConnection();

    if (testResult.success) {
      // Update isConfigured status
      const updatedSettings = {
        ...settings,
        whatsapp: {
          ...whatsapp,
          isConfigured: true,
          testedAt: new Date().toISOString(),
        },
      };

      await prisma.organization.update({
        where: { id: organizationId },
        data: { settings: updatedSettings },
      });

      return ApiResponse.success(res, testResult.message, {
        provider: whatsapp.provider,
        phoneNumber: whatsapp.phoneNumber,
      });
    } else {
      return ApiResponse.error(res, testResult.message, 400);
    }
  } catch (error) {
    console.error('Error testing WhatsApp connection:', error);
    return ApiResponse.error(res, 'Failed to test WhatsApp connection', 500);
  }
});

// ==================== LANGUAGE PREFERENCES ====================

/**
 * @swagger
 * /api/organization/language:
 *   get:
 *     summary: Get organization's preferred language for transcription
 *     tags: [Organization]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Language preference retrieved successfully
 */
router.get('/language', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId;

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        preferredLanguage: true,
      },
    });

    if (!organization) {
      return ApiResponse.error(res, 'Organization not found', 404);
    }

    // Supported languages
    const supportedLanguages = [
      { code: 'te-IN', name: 'Telugu', nativeName: 'తెలుగు' },
      { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी' },
      { code: 'ta-IN', name: 'Tamil', nativeName: 'தமிழ்' },
      { code: 'kn-IN', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
      { code: 'ml-IN', name: 'Malayalam', nativeName: 'മലയാളം' },
      { code: 'mr-IN', name: 'Marathi', nativeName: 'मराठी' },
      { code: 'bn-IN', name: 'Bengali', nativeName: 'বাংলা' },
      { code: 'gu-IN', name: 'Gujarati', nativeName: 'ગુજરાતી' },
      { code: 'pa-IN', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
      { code: 'or-IN', name: 'Odia', nativeName: 'ଓଡ଼ିଆ' },
      { code: 'en-IN', name: 'English (India)', nativeName: 'English' },
    ];

    return ApiResponse.success(res, 'Language preference retrieved', {
      preferredLanguage: organization.preferredLanguage || 'te-IN',
      organizationName: organization.name,
      supportedLanguages,
    });
  } catch (error) {
    console.error('Error fetching language preference:', error);
    return ApiResponse.error(res, 'Failed to fetch language preference', 500);
  }
});

/**
 * @swagger
 * /api/organization/language:
 *   put:
 *     summary: Update organization's preferred language for transcription
 *     tags: [Organization]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               language:
 *                 type: string
 *                 example: te-IN
 *     responses:
 *       200:
 *         description: Language preference updated successfully
 */
router.put('/language', validate([
  body('language')
    .trim()
    .notEmpty().withMessage('Language is required')
    .isIn(['te-IN', 'hi-IN', 'ta-IN', 'kn-IN', 'ml-IN', 'mr-IN', 'bn-IN', 'gu-IN', 'pa-IN', 'or-IN', 'en-IN'])
    .withMessage('Invalid language code'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId;
    const { language } = req.body;

    const organization = await prisma.organization.update({
      where: { id: organizationId },
      data: { preferredLanguage: language },
      select: {
        id: true,
        name: true,
        preferredLanguage: true,
      },
    });

    console.log(`[Organization] Updated preferred language for ${organization.name} to ${language}`);

    return ApiResponse.success(res, 'Language preference updated successfully', {
      preferredLanguage: organization.preferredLanguage,
      organizationName: organization.name,
    });
  } catch (error) {
    console.error('Error updating language preference:', error);
    return ApiResponse.error(res, 'Failed to update language preference', 500);
  }
});

// ==================== BRANDING ====================

/**
 * @swagger
 * /api/organizations/branding:
 *   get:
 *     summary: Get organization branding settings
 *     tags: [Organization]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Branding settings retrieved successfully
 */
router.get('/branding', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId;

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        brandName: true,
        logo: true,
        primaryColor: true,
        secondaryColor: true,
        accentColor: true,
        favicon: true,
        loginBgImage: true,
        footerText: true,
        hidePoweredBy: true,
      },
    });

    if (!organization) {
      return ApiResponse.error(res, 'Organization not found', 404);
    }

    return ApiResponse.success(res, 'Branding settings retrieved', {
      brandName: organization.brandName || organization.name,
      logo: organization.logo,
      primaryColor: organization.primaryColor || '#6366f1',
      secondaryColor: organization.secondaryColor || '#4f46e5',
      accentColor: organization.accentColor || '#10b981',
      favicon: organization.favicon,
      loginBgImage: organization.loginBgImage,
      footerText: organization.footerText,
      hidePoweredBy: organization.hidePoweredBy || false,
    });
  } catch (error) {
    console.error('Error fetching branding settings:', error);
    return ApiResponse.error(res, 'Failed to fetch branding settings', 500);
  }
});

/**
 * @swagger
 * /api/organizations/branding:
 *   put:
 *     summary: Update organization branding settings
 *     tags: [Organization]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               brandName:
 *                 type: string
 *               logo:
 *                 type: string
 *               primaryColor:
 *                 type: string
 *               secondaryColor:
 *                 type: string
 *               accentColor:
 *                 type: string
 *               favicon:
 *                 type: string
 *               loginBgImage:
 *                 type: string
 *               footerText:
 *                 type: string
 *               hidePoweredBy:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Branding settings updated successfully
 */
router.put('/branding', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId;
    const {
      brandName,
      logo,
      primaryColor,
      secondaryColor,
      accentColor,
      favicon,
      loginBgImage,
      footerText,
      hidePoweredBy,
    } = req.body;

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      return ApiResponse.error(res, 'Organization not found', 404);
    }

    const updated = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        brandName: brandName !== undefined ? brandName : organization.brandName,
        logo: logo !== undefined ? logo : organization.logo,
        primaryColor: primaryColor !== undefined ? primaryColor : organization.primaryColor,
        secondaryColor: secondaryColor !== undefined ? secondaryColor : organization.secondaryColor,
        accentColor: accentColor !== undefined ? accentColor : organization.accentColor,
        favicon: favicon !== undefined ? favicon : organization.favicon,
        loginBgImage: loginBgImage !== undefined ? loginBgImage : organization.loginBgImage,
        footerText: footerText !== undefined ? footerText : organization.footerText,
        hidePoweredBy: hidePoweredBy !== undefined ? hidePoweredBy : organization.hidePoweredBy,
      },
      select: {
        id: true,
        name: true,
        brandName: true,
        logo: true,
        primaryColor: true,
        secondaryColor: true,
        accentColor: true,
        favicon: true,
        loginBgImage: true,
        footerText: true,
        hidePoweredBy: true,
      },
    });

    console.log(`[Organization] Updated branding for ${updated.name}`);

    return ApiResponse.success(res, 'Branding settings updated successfully', {
      brandName: updated.brandName || updated.name,
      logo: updated.logo,
      primaryColor: updated.primaryColor || '#6366f1',
      secondaryColor: updated.secondaryColor || '#4f46e5',
      accentColor: updated.accentColor || '#10b981',
      favicon: updated.favicon,
      loginBgImage: updated.loginBgImage,
      footerText: updated.footerText,
      hidePoweredBy: updated.hidePoweredBy || false,
    });
  } catch (error) {
    console.error('Error updating branding settings:', error);
    return ApiResponse.error(res, 'Failed to update branding settings', 500);
  }
});

// ==================== ONBOARDING ====================

const VALID_INDUSTRIES = [
  'EDUCATION',
  'REAL_ESTATE',
  'HEALTHCARE',
  'INSURANCE',
  'FINANCE',
  'IT_RECRUITMENT',
  'ECOMMERCE',
  'GENERAL',
];

/**
 * @swagger
 * /api/organization/complete-onboarding:
 *   post:
 *     summary: Complete organization onboarding
 *     tags: [Organization]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - industry
 *             properties:
 *               industry:
 *                 type: string
 *                 enum: [EDUCATION, REAL_ESTATE, HEALTHCARE, INSURANCE, FINANCE, IT_RECRUITMENT, ECOMMERCE, GENERAL]
 *     responses:
 *       200:
 *         description: Onboarding completed successfully
 */
router.post('/complete-onboarding', validate([
  body('industry')
    .trim()
    .notEmpty().withMessage('Industry is required')
    .isIn(VALID_INDUSTRIES)
    .withMessage('Invalid industry'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId;
    const { industry } = req.body;

    // Get current organization
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      return ApiResponse.error(res, 'Organization not found', 404);
    }

    // Update organization with industry and mark onboarding as complete
    const currentSettings = (organization.settings as any) || {};
    const updatedSettings = {
      ...currentSettings,
      onboardingCompleted: true,
      onboardingCompletedAt: new Date().toISOString(),
    };

    const updated = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        industry: industry,
        settings: updatedSettings,
      },
      select: {
        id: true,
        name: true,
        industry: true,
        settings: true,
      },
    });

    console.log(`[Organization] Completed onboarding for ${updated.name}, industry: ${industry}`);

    return ApiResponse.success(res, 'Onboarding completed successfully', {
      industry: updated.industry,
      onboardingCompleted: true,
    });
  } catch (error) {
    console.error('Error completing onboarding:', error);
    return ApiResponse.error(res, 'Failed to complete onboarding', 500);
  }
});

/**
 * @swagger
 * /api/organization/onboarding-status:
 *   get:
 *     summary: Get organization onboarding status
 *     tags: [Organization]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Onboarding status retrieved successfully
 */
router.get('/onboarding-status', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId;

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        industry: true,
        settings: true,
      },
    });

    if (!organization) {
      return ApiResponse.error(res, 'Organization not found', 404);
    }

    const settings = (organization.settings as any) || {};
    const onboardingCompleted = settings.onboardingCompleted || false;

    return ApiResponse.success(res, 'Onboarding status retrieved', {
      onboardingCompleted,
      industry: organization.industry,
      organizationName: organization.name,
    });
  } catch (error) {
    console.error('Error fetching onboarding status:', error);
    return ApiResponse.error(res, 'Failed to fetch onboarding status', 500);
  }
});

/**
 * GET /api/organization/billing-details
 * Get billing details for invoices
 */
router.get('/billing-details', async (req: TenantRequest, res: Response) => {
  try {
    const organization = await prisma.organization.findUnique({
      where: { id: req.organizationId },
      select: {
        name: true,
        email: true,
        taxId: true,
        billingAddress: true,
      },
    });

    if (!organization) {
      return ApiResponse.error(res, 'Organization not found', 404);
    }

    return ApiResponse.success(res, 'Billing details retrieved', {
      name: organization.name,
      email: organization.email,
      gstin: organization.taxId,
      billingAddress: organization.billingAddress,
    });
  } catch (error) {
    console.error('Error fetching billing details:', error);
    return ApiResponse.error(res, 'Failed to fetch billing details', 500);
  }
});

/**
 * PATCH /api/organization/billing-details
 * Update billing details for invoices
 */
router.patch(
  '/billing-details',
  validate([
    body('gstin').optional().trim().isLength({ max: 15 }).matches(/^[A-Z0-9]*$/).withMessage('Invalid GSTIN format'),
    body('billingAddress').optional().trim().isLength({ max: 500 }).withMessage('Address must be at most 500 characters'),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const { gstin, billingAddress } = req.body;

      const organization = await prisma.organization.update({
        where: { id: req.organizationId },
        data: {
          ...(gstin !== undefined && { taxId: gstin }),
          ...(billingAddress !== undefined && { billingAddress }),
        },
        select: {
          name: true,
          email: true,
          taxId: true,
          billingAddress: true,
        },
      });

      return ApiResponse.success(res, 'Billing details updated', {
        name: organization.name,
        email: organization.email,
        gstin: organization.taxId,
        billingAddress: organization.billingAddress,
      });
    } catch (error) {
      console.error('Error updating billing details:', error);
      return ApiResponse.error(res, 'Failed to update billing details', 500);
    }
  }
);

// ==================== DYNAMIC INDUSTRY MANAGEMENT ====================

/**
 * @swagger
 * /api/organization/industry:
 *   get:
 *     summary: Get organization's industry configuration
 *     tags: [Organization]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Industry configuration retrieved successfully
 */
router.get('/industry', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId;

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        industry: true,
        industrySlug: true,
        dynamicIndustryId: true,
        dynamicIndustry: {
          select: {
            id: true,
            slug: true,
            name: true,
            description: true,
            icon: true,
            color: true,
            isSystem: true,
            isActive: true,
          },
        },
      },
    });

    if (!organization) {
      return ApiResponse.error(res, 'Organization not found', 404);
    }

    // Get full industry config from cache
    const industrySlug = organization.industrySlug || organization.industry?.toLowerCase().replace(/_/g, '-') || 'general';
    const industryConfig = await industryCacheService.getIndustryConfig(industrySlug);

    return ApiResponse.success(res, 'Industry configuration retrieved', {
      industry: organization.dynamicIndustry || {
        slug: industrySlug,
        name: organization.industry || 'General',
      },
      legacyIndustry: organization.industry,
      config: industryConfig,
    });
  } catch (error) {
    console.error('Error fetching industry configuration:', error);
    return ApiResponse.error(res, 'Failed to fetch industry configuration', 500);
  }
});

/**
 * @swagger
 * /api/organization/industry:
 *   put:
 *     summary: Change organization's industry
 *     tags: [Organization]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - industrySlug
 *             properties:
 *               industrySlug:
 *                 type: string
 *                 description: The slug of the new industry
 *     responses:
 *       200:
 *         description: Industry changed successfully
 */
router.put('/industry', validate([
  body('industrySlug').trim().notEmpty().withMessage('Industry slug is required'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId;
    const { industrySlug } = req.body;

    // Apply the new industry
    const result = await dynamicIndustryService.applyIndustryToOrganization(organizationId!, industrySlug);

    // Get the full industry config
    const industryConfig = await industryCacheService.getIndustryConfig(industrySlug);

    console.log(`[Organization] Changed industry for org ${organizationId} to ${industrySlug}`);

    return ApiResponse.success(res, 'Industry changed successfully', {
      industry: result,
      config: industryConfig,
    });
  } catch (error: any) {
    console.error('Error changing industry:', error);
    return ApiResponse.error(res, error.message || 'Failed to change industry', error.statusCode || 500);
  }
});

/**
 * @swagger
 * /api/organization/industry/fields:
 *   get:
 *     summary: Get industry field templates for the organization
 *     tags: [Organization]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Field templates retrieved successfully
 */
router.get('/industry/fields', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId;

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        industrySlug: true,
        industry: true,
      },
    });

    if (!organization) {
      return ApiResponse.error(res, 'Organization not found', 404);
    }

    const industrySlug = organization.industrySlug || organization.industry?.toLowerCase().replace(/_/g, '-') || 'general';

    // Get fields from cache (includes both industry templates)
    const industryConfig = await industryCacheService.getIndustryConfig(industrySlug);

    return ApiResponse.success(res, 'Field templates retrieved', {
      industrySlug,
      fields: industryConfig?.fields || [],
    });
  } catch (error) {
    console.error('Error fetching field templates:', error);
    return ApiResponse.error(res, 'Failed to fetch field templates', 500);
  }
});

/**
 * @swagger
 * /api/organization/industry/stages:
 *   get:
 *     summary: Get industry stage templates for the organization
 *     tags: [Organization]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Stage templates retrieved successfully
 */
router.get('/industry/stages', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId;

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        industrySlug: true,
        industry: true,
      },
    });

    if (!organization) {
      return ApiResponse.error(res, 'Organization not found', 404);
    }

    const industrySlug = organization.industrySlug || organization.industry?.toLowerCase().replace(/_/g, '-') || 'general';

    // Get stages from cache
    const industryConfig = await industryCacheService.getIndustryConfig(industrySlug);

    return ApiResponse.success(res, 'Stage templates retrieved', {
      industrySlug,
      stages: industryConfig?.stages || [],
    });
  } catch (error) {
    console.error('Error fetching stage templates:', error);
    return ApiResponse.error(res, 'Failed to fetch stage templates', 500);
  }
});

/**
 * @swagger
 * /api/organization/industries:
 *   get:
 *     summary: Get list of available industries for selection
 *     tags: [Organization]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Industries list retrieved successfully
 */
router.get('/industries', async (req: TenantRequest, res: Response) => {
  try {
    // Get all active industries for selection
    const industries = await industryCacheService.getAllActiveIndustries();

    const industryList = industries
      .filter((ind) => ind.isActive)
      .map((ind) => ({
        slug: ind.slug,
        name: ind.name,
        description: ind.description,
        icon: ind.icon,
        color: ind.color,
        isSystem: ind.isSystem,
        fieldCount: ind.fields?.length || 0,
        stageCount: ind.stages?.length || 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return ApiResponse.success(res, 'Industries retrieved', industryList);
  } catch (error) {
    console.error('Error fetching industries:', error);
    return ApiResponse.error(res, 'Failed to fetch industries', 500);
  }
});

/**
 * @swagger
 * /api/organization/industries/{slug}:
 *   get:
 *     summary: Get detailed industry information (preview before switching)
 *     tags: [Organization]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Industry details retrieved successfully
 */
router.get('/industries/:slug', validate([
  param('slug').trim().notEmpty().withMessage('Industry slug is required'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const { slug } = req.params;

    const industryConfig = await industryCacheService.getIndustryConfig(slug);

    if (!industryConfig) {
      return ApiResponse.error(res, 'Industry not found', 404);
    }

    return ApiResponse.success(res, 'Industry details retrieved', industryConfig);
  } catch (error) {
    console.error('Error fetching industry details:', error);
    return ApiResponse.error(res, 'Failed to fetch industry details', 500);
  }
});

export default router;
