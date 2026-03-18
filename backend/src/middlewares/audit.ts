import { Request, Response, NextFunction } from 'express';
import { auditLogService, AuditAction, TargetType } from '../services/audit-log.service';

// Extend Express Request to include audit info
declare global {
  namespace Express {
    interface Request {
      auditInfo?: {
        targetType?: TargetType;
        targetId?: string;
        action?: AuditAction;
        description?: string;
        changes?: { before?: any; after?: any };
        skip?: boolean;
      };
    }
  }
}

// Map HTTP methods to default actions
const methodToAction: Record<string, AuditAction> = {
  POST: 'created',
  PUT: 'updated',
  PATCH: 'updated',
  DELETE: 'deleted',
  GET: 'viewed',
};

// Routes to skip auditing
const skipRoutes = [
  '/health',
  '/api/health',
  '/api/auth/me',
  '/api/v1/rate-limit',
];

// Routes to always audit (even GETs)
const alwaysAuditRoutes = [
  '/api/leads/export',
  '/api/contact-lists/*/export',
  '/api/audit-logs',
];

/**
 * Extract target type from route
 */
function extractTargetType(path: string): TargetType | undefined {
  const pathParts = path.split('/').filter(p => p && p !== 'api');

  const typeMap: Record<string, TargetType> = {
    leads: 'lead',
    users: 'user',
    organizations: 'organization',
    campaigns: 'campaign',
    forms: 'form',
    'landing-pages': 'landing_page',
    'api-keys': 'api_key',
    webhooks: 'webhook',
    templates: 'template',
    'contact-lists': 'contact_list',
    conversations: 'conversation',
    settings: 'settings',
  };

  for (const part of pathParts) {
    if (typeMap[part]) {
      return typeMap[part];
    }
  }

  return undefined;
}

/**
 * Extract target ID from route
 */
function extractTargetId(req: Request): string | undefined {
  // Check common param names
  const paramNames = ['id', 'leadId', 'userId', 'apiKeyId', 'webhookId', 'templateId'];

  for (const name of paramNames) {
    if (req.params[name]) {
      return req.params[name];
    }
  }

  // Check if response contains an ID (for create operations)
  const resBody = (req as any)._auditResponseBody;
  if (resBody?.data?.id) {
    return resBody.data.id;
  }

  return undefined;
}

/**
 * Check if route should be skipped
 */
function shouldSkipRoute(path: string, method: string): boolean {
  // Skip health checks and similar
  if (skipRoutes.some(route => path.startsWith(route))) {
    return true;
  }

  // Skip most GET requests (unless in alwaysAudit list)
  if (method === 'GET') {
    return !alwaysAuditRoutes.some(route => {
      const regex = new RegExp('^' + route.replace(/\*/g, '[^/]+') + '$');
      return regex.test(path);
    });
  }

  return false;
}

/**
 * Audit logging middleware
 * Automatically logs API actions to audit log
 */
export function auditMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip if route should not be audited
  if (shouldSkipRoute(req.path, req.method)) {
    return next();
  }

  // Store original end function
  const originalEnd = res.end;
  const originalJson = res.json;
  let responseBody: any;

  // Override json to capture response
  res.json = function(body: any) {
    responseBody = body;
    (req as any)._auditResponseBody = body;
    return originalJson.call(this, body);
  };

  // Override end to log after response is sent
  res.end = function(chunk?: any, encoding?: any, callback?: any) {
    // Only log successful operations (2xx status codes)
    if (res.statusCode >= 200 && res.statusCode < 300) {
      // Don't block the response
      setImmediate(async () => {
        try {
          // Skip if explicitly marked to skip
          if (req.auditInfo?.skip) {
            return;
          }

          const user = req.user;
          const apiKey = (req as any).apiKey;

          // Determine actor
          let actorType: 'user' | 'api_key' | 'system' = 'system';
          let actorId: string | undefined;
          let actorEmail: string | undefined;
          let organizationId: string | undefined;

          if (user) {
            actorType = 'user';
            actorId = user.id;
            actorEmail = user.email;
            organizationId = user.organizationId;
          } else if (apiKey) {
            actorType = 'api_key';
            actorId = apiKey.id;
            organizationId = apiKey.organizationId;
          }

          // Skip if no organization context
          if (!organizationId) {
            return;
          }

          // Determine action
          const action = req.auditInfo?.action || methodToAction[req.method] || 'viewed';

          // Determine target
          const targetType = req.auditInfo?.targetType || extractTargetType(req.path);
          const targetId = req.auditInfo?.targetId || extractTargetId(req);

          // Build description
          let description = req.auditInfo?.description;
          if (!description) {
            const actionVerb = action.charAt(0).toUpperCase() + action.slice(1);
            description = `${actionVerb} ${targetType || 'resource'}`;
            if (targetId) {
              description += ` (${targetId})`;
            }
          }

          // Log the action
          await auditLogService.log({
            actorType,
            actorId,
            actorEmail,
            organizationId,
            targetType,
            targetId,
            action,
            description,
            changes: req.auditInfo?.changes,
            ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip,
            userAgent: req.headers['user-agent'],
          });
        } catch (error) {
          console.error('Audit logging error:', error);
        }
      });
    }

    return originalEnd.call(this, chunk, encoding, callback);
  };

  next();
}

/**
 * Helper to set audit info in request handlers
 */
export function setAuditInfo(
  req: Request,
  info: {
    targetType?: TargetType;
    targetId?: string;
    action?: AuditAction;
    description?: string;
    changes?: { before?: any; after?: any };
    skip?: boolean;
  }
) {
  req.auditInfo = { ...req.auditInfo, ...info };
}

/**
 * Decorator function to audit specific routes
 */
export function auditAction(
  action: AuditAction,
  targetType?: TargetType,
  descriptionFn?: (req: Request) => string
) {
  return (req: Request, res: Response, next: NextFunction) => {
    setAuditInfo(req, {
      action,
      targetType,
      description: descriptionFn ? descriptionFn(req) : undefined,
    });
    next();
  };
}

/**
 * Skip audit for specific route
 */
export function skipAudit(req: Request, res: Response, next: NextFunction) {
  setAuditInfo(req, { skip: true });
  next();
}
