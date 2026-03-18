import { Router, Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import { googleAdsService } from '../integrations/google-ads.service';
import { ApiResponse } from '../utils/apiResponse';
import { validate } from '../middlewares/validate';
import { authenticate, authorize } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { prisma } from '../config/database';
import { config } from '../config';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(tenantMiddleware);

// Get all Google Ads integrations for the organization
router.get(
  '/integrations',
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const integrations = await prisma.googleAdsIntegration.findMany({
        where: { organizationId: req.organizationId },
        orderBy: { createdAt: 'desc' },
      });

      ApiResponse.success(res, 'Google Ads integrations retrieved', integrations);
    } catch (error) {
      next(error);
    }
  }
);

// Get a specific integration
router.get(
  '/integrations/:id',
  param('id').isUUID(),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const integration = await prisma.googleAdsIntegration.findFirst({
        where: { id: req.params.id, organizationId: req.organizationId },
      });

      if (!integration) {
        return ApiResponse.notFound(res, 'Integration not found');
      }

      ApiResponse.success(res, 'Integration retrieved', integration);
    } catch (error) {
      next(error);
    }
  }
);

// Create a new integration
router.post(
  '/integrations',
  authorize('admin'),
  validate([
    body('customerId').notEmpty().withMessage('Customer ID is required'),
    body('developerToken').notEmpty().withMessage('Developer token is required'),
    body('refreshToken').notEmpty().withMessage('Refresh token is required'),
  ]),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const {
        customerId,
        customerName,
        developerToken,
        clientId,
        clientSecret,
        refreshToken,
        selectedLeadForms,
        fieldMapping,
      } = req.body;

      // Check if integration already exists
      const existing = await prisma.googleAdsIntegration.findUnique({
        where: {
          organizationId_customerId: {
            organizationId: req.organizationId!,
            customerId,
          },
        },
      });

      if (existing) {
        const updated = await prisma.googleAdsIntegration.update({
          where: { id: existing.id },
          data: {
            customerName,
            developerToken,
            clientId,
            clientSecret,
            refreshToken,
            selectedLeadForms: selectedLeadForms || [],
            fieldMapping: fieldMapping || {},
            isActive: true,
            updatedAt: new Date(),
          },
        });

        return ApiResponse.success(res, 'Integration updated', updated);
      }

      const integration = await prisma.googleAdsIntegration.create({
        data: {
          organizationId: req.organizationId!,
          customerId,
          customerName,
          developerToken,
          clientId,
          clientSecret,
          refreshToken,
          selectedLeadForms: selectedLeadForms || [],
          fieldMapping: fieldMapping || {},
        },
      });

      ApiResponse.created(res, 'Integration created', integration);
    } catch (error) {
      next(error);
    }
  }
);

// Update an integration
router.put(
  '/integrations/:id',
  authorize('admin'),
  param('id').isUUID(),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const existing = await prisma.googleAdsIntegration.findFirst({
        where: { id: req.params.id, organizationId: req.organizationId },
      });

      if (!existing) {
        return ApiResponse.notFound(res, 'Integration not found');
      }

      const updated = await prisma.googleAdsIntegration.update({
        where: { id: req.params.id },
        data: {
          ...req.body,
          updatedAt: new Date(),
        },
      });

      ApiResponse.success(res, 'Integration updated', updated);
    } catch (error) {
      next(error);
    }
  }
);

// Delete an integration
router.delete(
  '/integrations/:id',
  authorize('admin'),
  param('id').isUUID(),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const existing = await prisma.googleAdsIntegration.findFirst({
        where: { id: req.params.id, organizationId: req.organizationId },
      });

      if (!existing) {
        return ApiResponse.notFound(res, 'Integration not found');
      }

      await prisma.googleAdsIntegration.delete({
        where: { id: req.params.id },
      });

      ApiResponse.success(res, 'Integration deleted');
    } catch (error) {
      next(error);
    }
  }
);

// Get lead forms
router.get(
  '/lead-forms',
  authorize('admin'),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      // Check if integration exists and use stored credentials
      const integration = await prisma.googleAdsIntegration.findFirst({
        where: { organizationId: req.organizationId, isActive: true },
      });

      if (integration) {
        googleAdsService.initialize({
          clientId: integration.clientId || '',
          clientSecret: integration.clientSecret || '',
          developerToken: integration.developerToken || '',
          refreshToken: integration.refreshToken || '',
          customerId: integration.customerId,
        });
      }

      if (!googleAdsService.isConfigured()) {
        return ApiResponse.error(res, 'Google Ads not configured', 400);
      }

      const forms = await googleAdsService.getLeadForms();
      ApiResponse.success(res, 'Lead forms retrieved', forms);
    } catch (error) {
      next(error);
    }
  }
);

// Get form field schema
router.get(
  '/forms/:formId/fields',
  authorize('admin'),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const integration = await prisma.googleAdsIntegration.findFirst({
        where: { organizationId: req.organizationId, isActive: true },
      });

      if (integration) {
        googleAdsService.initialize({
          clientId: integration.clientId || '',
          clientSecret: integration.clientSecret || '',
          developerToken: integration.developerToken || '',
          refreshToken: integration.refreshToken || '',
          customerId: integration.customerId,
        });
      }

      if (!googleAdsService.isConfigured()) {
        return ApiResponse.error(res, 'Google Ads not configured', 400);
      }

      const fields = await googleAdsService.getFormFields(req.params.formId);
      ApiResponse.success(res, 'Form fields retrieved', fields);
    } catch (error) {
      next(error);
    }
  }
);

// Get webhook URL for setup
router.get(
  '/webhook-url',
  authorize('admin'),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const baseUrl = config.baseUrl || `${req.protocol}://${req.get('host')}`;
      const webhookUrl = `${baseUrl}/api/ads/google/webhook`;

      ApiResponse.success(res, 'Webhook URL retrieved', {
        webhookUrl,
        instructions: [
          '1. Go to Google Ads Console',
          '2. Navigate to Tools & Settings > Lead form extensions',
          '3. Set up webhook delivery for your lead forms',
          `4. Enter Webhook URL: ${webhookUrl}`,
          '5. Configure Google Cloud Pub/Sub for real-time delivery (optional)',
        ],
      });
    } catch (error) {
      next(error);
    }
  }
);

// Test connection / Initialize with credentials
router.post(
  '/test-connection',
  authorize('admin'),
  validate([
    body('customerId').notEmpty().withMessage('Customer ID required'),
    body('developerToken').notEmpty().withMessage('Developer token required'),
    body('refreshToken').notEmpty().withMessage('Refresh token required'),
  ]),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { customerId, developerToken, clientId, clientSecret, refreshToken } = req.body;

      googleAdsService.initialize({
        clientId: clientId || config.google?.adsClientId || '',
        clientSecret: clientSecret || config.google?.adsClientSecret || '',
        developerToken,
        refreshToken,
        customerId,
      });

      // Try to fetch campaigns to validate credentials
      const campaigns = await googleAdsService.syncCampaigns(req.organizationId!);

      ApiResponse.success(res, 'Connection successful', {
        valid: true,
        campaignsCount: campaigns.length,
      });
    } catch (error: any) {
      ApiResponse.success(res, 'Connection failed', {
        valid: false,
        error: error.message,
      });
    }
  }
);

// Manual sync of historical leads from a form
router.post(
  '/sync-leads/:formId',
  authorize('admin'),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { integrationId, days } = req.body;
      const { formId } = req.params;

      // Get integration to use stored credentials
      const integration = await prisma.googleAdsIntegration.findFirst({
        where: integrationId
          ? { id: integrationId, organizationId: req.organizationId }
          : { organizationId: req.organizationId, isActive: true },
      });

      if (!integration) {
        return ApiResponse.error(res, 'No active Google Ads integration found', 400);
      }

      googleAdsService.initialize({
        clientId: integration.clientId || '',
        clientSecret: integration.clientSecret || '',
        developerToken: integration.developerToken || '',
        refreshToken: integration.refreshToken || '',
        customerId: integration.customerId,
      });

      const fieldMapping = (integration.fieldMapping as Record<string, string>) || {};

      const leads = await googleAdsService.syncFormLeads(
        formId,
        req.organizationId!,
        fieldMapping,
        days || 7
      );

      await prisma.googleAdsIntegration.update({
        where: { id: integration.id },
        data: { lastSyncedAt: new Date() },
      });

      ApiResponse.success(res, 'Leads synced', {
        synced: leads.created,
        skipped: leads.skipped,
        total: leads.total,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
