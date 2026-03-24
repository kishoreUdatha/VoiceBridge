import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { ApiResponse } from '../utils/apiResponse';
import { createWhatsAppService } from '../integrations/whatsapp.service';

const router = Router();
const prisma = new PrismaClient();

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
router.put('/institution', async (req: TenantRequest, res: Response) => {
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
router.post('/preview-prompt', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId;
    const { prompt } = req.body;

    if (!prompt) {
      return ApiResponse.error(res, 'Prompt is required', 400);
    }

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
    let whatsapp = settings.whatsapp || {
      provider: 'meta',
      phoneNumber: '',
      isConfigured: false,
    };

    // Check for environment variables if no org-level config
    const envAccessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const envPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const envBusinessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
    const hasEnvConfig = !!(envAccessToken && envPhoneNumberId);

    // If no org config but env vars exist, indicate that
    if (!whatsapp.isConfigured && hasEnvConfig) {
      whatsapp = {
        ...whatsapp,
        provider: 'meta',
        phoneNumberId: envPhoneNumberId,
        businessAccountId: envBusinessAccountId || '',
        accessToken: envAccessToken,
        isConfigured: true,
        configuredViaEnv: true,
      };
    }

    // Don't send secrets to frontend - mask them
    const safeWhatsapp = {
      ...whatsapp,
      apiKey: whatsapp.apiKey ? '••••••••' + whatsapp.apiKey.slice(-4) : '',
      apiSecret: whatsapp.apiSecret ? '••••••••' + whatsapp.apiSecret.slice(-4) : '',
      accessToken: whatsapp.accessToken ? '••••••••' + whatsapp.accessToken.slice(-4) : '',
      hasEnvConfig,
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
router.post('/settings/whatsapp', async (req: TenantRequest, res: Response) => {
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
    let whatsapp = settings.whatsapp || {};

    // Check for env variables if no org-level config
    if (!whatsapp.isConfigured && !whatsapp.phoneNumberId && !whatsapp.accessToken) {
      const envAccessToken = process.env.WHATSAPP_ACCESS_TOKEN;
      const envPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
      const envBusinessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;

      if (envAccessToken && envPhoneNumberId) {
        whatsapp = {
          provider: 'meta',
          phoneNumber: envPhoneNumberId,
          accessToken: envAccessToken,
          phoneNumberId: envPhoneNumberId,
          businessAccountId: envBusinessAccountId,
          isConfigured: true,
        };
      }
    }

    // For Meta API, phoneNumberId is sufficient (phoneNumber is optional)
    const hasValidConfig = whatsapp.phoneNumber || whatsapp.phoneNumberId || whatsapp.accessToken;

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

export default router;
