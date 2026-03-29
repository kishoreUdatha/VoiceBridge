import { Router } from 'express';
import { apiKeyService, API_PERMISSIONS } from '../services/api-key.service';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware } from '../middlewares/tenant';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errors';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticate);
router.use(tenantMiddleware);

// List all API keys
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;

    const apiKeys = await apiKeyService.getApiKeys(organizationId);

    res.json({
      success: true,
      data: apiKeys,
    });
  })
);

// Get available permissions
router.get(
  '/permissions',
  asyncHandler(async (req, res) => {
    const permissions = Object.entries(API_PERMISSIONS).map(([key, value]) => ({
      key,
      value,
      description: getPermissionDescription(value),
    }));

    res.json({
      success: true,
      data: permissions,
    });
  })
);

// Create new API key
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const {
      name,
      permissions,
      allowedAgents,
      allowedIPs,
      rateLimit,
      expiresAt,
      description,
      environment,
    } = req.body;

    if (!name) {
      throw new AppError('API key name is required', 400);
    }

    if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
      throw new AppError('At least one permission is required', 400);
    }

    const apiKey = await apiKeyService.createApiKey({
      organizationId,
      name,
      permissions,
      allowedAgents,
      allowedIPs,
      rateLimit,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      description,
      environment,
    });

    res.status(201).json({
      success: true,
      message: 'API key created. Save the key - it will not be shown again.',
      data: apiKey,
    });
  })
);

// Get single API key
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { id } = req.params;

    const apiKey = await apiKeyService.getApiKeyById(id, organizationId);

    res.json({
      success: true,
      data: apiKey,
    });
  })
);

// Update API key
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { id } = req.params;
    const {
      name,
      permissions,
      allowedAgents,
      allowedIPs,
      rateLimit,
      isActive,
      expiresAt,
      description,
    } = req.body;

    const apiKey = await apiKeyService.updateApiKey(id, organizationId, {
      name,
      permissions,
      allowedAgents,
      allowedIPs,
      rateLimit,
      isActive,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      description,
    });

    res.json({
      success: true,
      message: 'API key updated',
      data: apiKey,
    });
  })
);

// Regenerate API key
router.post(
  '/:id/regenerate',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { id } = req.params;

    const result = await apiKeyService.regenerateApiKey(id, organizationId);

    res.json({
      success: true,
      message: 'API key regenerated. Save the new key - it will not be shown again.',
      data: result,
    });
  })
);

// Revoke (delete) API key
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { id } = req.params;

    await apiKeyService.revokeApiKey(id, organizationId);

    res.json({
      success: true,
      message: 'API key revoked',
    });
  })
);

// Get usage statistics
router.get(
  '/stats/usage',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const days = parseInt(req.query.days as string) || 30;

    const stats = await apiKeyService.getUsageStats(organizationId, days);

    res.json({
      success: true,
      data: stats,
    });
  })
);

// Helper function
function getPermissionDescription(permission: string): string {
  const descriptions: Record<string, string> = {
    // Agents
    'agents:read': 'View agent details and list agents',
    'agents:call': 'Initiate AI calls via agents',

    // Sessions
    'sessions:read': 'View session details and transcripts',
    'sessions:create': 'Start and end conversation sessions',
    'sessions:message': 'Send messages to active sessions',

    // Leads
    'leads:read': 'View and list leads',
    'leads:create': 'Create new leads',
    'leads:update': 'Update existing leads',
    'leads:delete': 'Delete leads',

    // SMS
    'sms:send': 'Send single SMS messages',
    'sms:bulk': 'Send bulk SMS messages',
    'sms:read': 'View SMS history',

    // WhatsApp
    'whatsapp:send': 'Send WhatsApp messages',
    'whatsapp:bulk': 'Send bulk WhatsApp messages',
    'whatsapp:read': 'View WhatsApp history',

    // Email
    'email:send': 'Send single emails',
    'email:bulk': 'Send bulk emails',
    'email:read': 'View email history',

    // Calls
    'calls:make': 'Make outbound calls',
    'calls:read': 'View call history and details',
    'calls:bulk': 'Initiate bulk calling campaigns',

    // Campaigns
    'campaigns:read': 'View campaigns',
    'campaigns:create': 'Create campaigns',
    'campaigns:update': 'Update campaigns',

    // Contacts
    'contacts:read': 'View contacts',
    'contacts:create': 'Create contacts',
    'contacts:bulk': 'Bulk import contacts/leads',

    // Analytics
    'analytics:read': 'Access analytics and statistics',

    // Webhooks
    'webhooks:manage': 'Manage webhook configurations',
  };
  return descriptions[permission] || permission;
}

export default router;
