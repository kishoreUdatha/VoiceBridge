import { prisma } from '../config/database';
import crypto from 'crypto';
import { AppError } from '../utils/errors';


// API Key Permissions
export const API_PERMISSIONS = {
  // Agents
  AGENTS_READ: 'agents:read',
  AGENTS_CALL: 'agents:call',

  // Sessions
  SESSIONS_READ: 'sessions:read',
  SESSIONS_CREATE: 'sessions:create',
  SESSIONS_MESSAGE: 'sessions:message',

  // Leads
  LEADS_READ: 'leads:read',
  LEADS_CREATE: 'leads:create',
  LEADS_UPDATE: 'leads:update',
  LEADS_DELETE: 'leads:delete',

  // SMS
  SMS_SEND: 'sms:send',
  SMS_BULK: 'sms:bulk',
  SMS_READ: 'sms:read',

  // WhatsApp
  WHATSAPP_SEND: 'whatsapp:send',
  WHATSAPP_BULK: 'whatsapp:bulk',
  WHATSAPP_READ: 'whatsapp:read',

  // Email
  EMAIL_SEND: 'email:send',
  EMAIL_BULK: 'email:bulk',
  EMAIL_READ: 'email:read',

  // Calls
  CALLS_MAKE: 'calls:make',
  CALLS_READ: 'calls:read',
  CALLS_BULK: 'calls:bulk',

  // Campaigns
  CAMPAIGNS_READ: 'campaigns:read',
  CAMPAIGNS_CREATE: 'campaigns:create',
  CAMPAIGNS_UPDATE: 'campaigns:update',

  // Contacts
  CONTACTS_READ: 'contacts:read',
  CONTACTS_CREATE: 'contacts:create',
  CONTACTS_BULK: 'contacts:bulk',

  // Analytics
  ANALYTICS_READ: 'analytics:read',

  // Webhooks
  WEBHOOKS_MANAGE: 'webhooks:manage',
} as const;

export type ApiPermission = typeof API_PERMISSIONS[keyof typeof API_PERMISSIONS];

interface CreateApiKeyParams {
  organizationId: string;
  name: string;
  permissions: ApiPermission[];
  allowedAgents?: string[];
  allowedIPs?: string[];
  rateLimit?: number;
  expiresAt?: Date;
  description?: string;
  environment?: 'production' | 'sandbox';
}

interface ValidateApiKeyResult {
  valid: boolean;
  apiKey?: any;
  error?: string;
}

class ApiKeyService {
  /**
   * Generate a new API key
   */
  async createApiKey(params: CreateApiKeyParams) {
    const {
      organizationId,
      name,
      permissions,
      allowedAgents = [],
      allowedIPs = [],
      rateLimit = 1000,
      expiresAt,
      description,
      environment = 'production',
    } = params;

    // Generate a secure API key
    const rawKey = this.generateSecureKey();
    const keyPrefix = rawKey.substring(0, 8);
    const hashedKey = this.hashKey(rawKey);

    const apiKey = await prisma.apiKey.create({
      data: {
        organizationId,
        name,
        key: hashedKey,
        keyPrefix,
        permissions: permissions as any,
        allowedAgents: allowedAgents as any,
        allowedIPs: allowedIPs as any,
        rateLimit,
        expiresAt,
        description,
        environment,
      },
    });

    // Return the raw key only once - it won't be retrievable later
    return {
      id: apiKey.id,
      name: apiKey.name,
      key: rawKey, // Full key shown only at creation
      keyPrefix: apiKey.keyPrefix,
      permissions: apiKey.permissions,
      rateLimit: apiKey.rateLimit,
      expiresAt: apiKey.expiresAt,
      environment: apiKey.environment,
      createdAt: apiKey.createdAt,
    };
  }

  /**
   * Validate an API key
   */
  async validateApiKey(rawKey: string): Promise<ValidateApiKeyResult> {
    if (!rawKey) {
      return { valid: false, error: 'API key is required' };
    }

    const hashedKey = this.hashKey(rawKey);

    const apiKey = await prisma.apiKey.findUnique({
      where: { key: hashedKey },
    });

    if (!apiKey) {
      return { valid: false, error: 'Invalid API key' };
    }

    if (!apiKey.isActive) {
      return { valid: false, error: 'API key is inactive' };
    }

    if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
      return { valid: false, error: 'API key has expired' };
    }

    // Update last used timestamp
    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: {
        lastUsedAt: new Date(),
        totalRequests: { increment: 1 },
      },
    });

    return { valid: true, apiKey };
  }

  /**
   * Check if API key has permission
   */
  hasPermission(apiKey: any, permission: ApiPermission): boolean {
    const permissions = apiKey.permissions as ApiPermission[];
    return permissions.includes(permission) || permissions.includes('*' as any);
  }

  /**
   * Check if API key can access agent
   */
  canAccessAgent(apiKey: any, agentId: string): boolean {
    const allowedAgents = apiKey.allowedAgents as string[];
    // Empty array means all agents are allowed
    if (!allowedAgents || allowedAgents.length === 0) {
      return true;
    }
    return allowedAgents.includes(agentId);
  }

  /**
   * Check rate limit
   */
  async checkRateLimit(apiKeyId: string, rateLimit: number, window: number): Promise<boolean> {
    const windowStart = new Date(Date.now() - window * 1000);

    const requestCount = await prisma.apiUsageLog.count({
      where: {
        apiKeyId,
        createdAt: { gte: windowStart },
      },
    });

    return requestCount < rateLimit;
  }

  /**
   * Log API usage
   */
  async logUsage(params: {
    apiKeyId: string;
    endpoint: string;
    method: string;
    statusCode: number;
    responseTime: number;
    ipAddress?: string;
    userAgent?: string;
    agentId?: string;
    sessionId?: string;
    action?: string;
    tokensUsed?: number;
    costIncurred?: number;
    errorMessage?: string;
  }) {
    await prisma.apiUsageLog.create({
      data: params,
    });
  }

  /**
   * Get API keys for organization
   */
  async getApiKeys(organizationId: string) {
    const apiKeys = await prisma.apiKey.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        permissions: true,
        allowedAgents: true,
        rateLimit: true,
        isActive: true,
        expiresAt: true,
        environment: true,
        totalRequests: true,
        lastUsedAt: true,
        description: true,
        createdAt: true,
      },
    });

    return apiKeys;
  }

  /**
   * Get API key by ID
   */
  async getApiKeyById(id: string, organizationId: string) {
    const apiKey = await prisma.apiKey.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        permissions: true,
        allowedAgents: true,
        allowedIPs: true,
        rateLimit: true,
        rateLimitWindow: true,
        isActive: true,
        expiresAt: true,
        environment: true,
        totalRequests: true,
        lastUsedAt: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!apiKey) {
      throw new AppError('API key not found', 404);
    }

    return apiKey;
  }

  /**
   * Update API key
   */
  async updateApiKey(id: string, organizationId: string, data: {
    name?: string;
    permissions?: ApiPermission[];
    allowedAgents?: string[];
    allowedIPs?: string[];
    rateLimit?: number;
    isActive?: boolean;
    expiresAt?: Date | null;
    description?: string;
  }) {
    const apiKey = await prisma.apiKey.findFirst({
      where: { id, organizationId },
    });

    if (!apiKey) {
      throw new AppError('API key not found', 404);
    }

    return prisma.apiKey.update({
      where: { id },
      data: {
        ...data,
        permissions: data.permissions as any,
        allowedAgents: data.allowedAgents as any,
        allowedIPs: data.allowedIPs as any,
      },
    });
  }

  /**
   * Revoke (delete) API key
   */
  async revokeApiKey(id: string, organizationId: string) {
    const apiKey = await prisma.apiKey.findFirst({
      where: { id, organizationId },
    });

    if (!apiKey) {
      throw new AppError('API key not found', 404);
    }

    await prisma.apiKey.delete({ where: { id } });

    return { success: true };
  }

  /**
   * Regenerate API key
   */
  async regenerateApiKey(id: string, organizationId: string) {
    const apiKey = await prisma.apiKey.findFirst({
      where: { id, organizationId },
    });

    if (!apiKey) {
      throw new AppError('API key not found', 404);
    }

    const rawKey = this.generateSecureKey();
    const keyPrefix = rawKey.substring(0, 8);
    const hashedKey = this.hashKey(rawKey);

    await prisma.apiKey.update({
      where: { id },
      data: {
        key: hashedKey,
        keyPrefix,
        totalRequests: 0,
      },
    });

    return {
      id,
      key: rawKey,
      keyPrefix,
    };
  }

  /**
   * Get usage statistics
   */
  async getUsageStats(organizationId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get all API keys for org
    const apiKeys = await prisma.apiKey.findMany({
      where: { organizationId },
      select: { id: true },
    });

    const apiKeyIds = apiKeys.map(k => k.id);

    // Get usage stats
    const [totalRequests, successfulRequests, failedRequests, dailyStats] = await Promise.all([
      prisma.apiUsageLog.count({
        where: {
          apiKeyId: { in: apiKeyIds },
          createdAt: { gte: startDate },
        },
      }),
      prisma.apiUsageLog.count({
        where: {
          apiKeyId: { in: apiKeyIds },
          createdAt: { gte: startDate },
          statusCode: { lt: 400 },
        },
      }),
      prisma.apiUsageLog.count({
        where: {
          apiKeyId: { in: apiKeyIds },
          createdAt: { gte: startDate },
          statusCode: { gte: 400 },
        },
      }),
      prisma.$queryRaw`
        SELECT
          DATE(created_at) as date,
          COUNT(*) as requests,
          COUNT(CASE WHEN status_code < 400 THEN 1 END) as successful,
          AVG(response_time) as avg_response_time
        FROM api_usage_logs
        WHERE api_key_id = ANY(${apiKeyIds}::uuid[])
        AND created_at >= ${startDate}
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `,
    ]);

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      successRate: totalRequests > 0 ? (successfulRequests / totalRequests * 100).toFixed(2) : '0',
      dailyStats,
    };
  }

  /**
   * Generate secure API key
   */
  private generateSecureKey(): string {
    const prefix = 'sk_live_'; // sk_live_ for production, sk_test_ for sandbox
    const randomPart = crypto.randomBytes(32).toString('hex');
    return prefix + randomPart;
  }

  /**
   * Hash API key for storage
   */
  private hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }
}

export const apiKeyService = new ApiKeyService();
