import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import jwt from 'jsonwebtoken';
import { superAdminService } from '../services/super-admin.service';
import { tenantReportsService } from '../services/tenant-reports.service';
import { config } from '../config';
import { validate } from '../middlewares/validate';
import { prisma } from '../config/database';
import { getAccessToken } from '../utils/cookies';
import { setAuthCookies, clearAuthCookies } from '../utils/cookies';
import advancedRoutes from './super-admin-advanced.routes';

// Validation rules
const setupValidation = [
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 12 }).withMessage('Password must be at least 12 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character'),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('phone').optional().trim().matches(/^[\d+\-() ]{7,20}$/).withMessage('Invalid phone format'),
  body('setupKey').notEmpty().withMessage('Setup key is required'),
];

const loginValidation = [
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const planValidation = [
  body('slug').trim().notEmpty().withMessage('Plan slug is required')
    .matches(/^[a-z0-9-]+$/).withMessage('Slug must be lowercase alphanumeric with hyphens'),
  body('name').trim().notEmpty().withMessage('Plan name is required'),
  body('price').isInt({ min: 0 }).withMessage('Price must be a non-negative integer'),
  body('interval').optional().isIn(['monthly', 'yearly']).withMessage('Invalid interval'),
  body('features').optional().isObject().withMessage('Features must be an object'),
];

const createOrgValidation = [
  body('organizationName').trim().notEmpty().withMessage('Organization name is required')
    .isLength({ max: 200 }).withMessage('Organization name must be at most 200 characters'),
  body('slug').trim().notEmpty().withMessage('Slug is required')
    .matches(/^[a-z0-9-]+$/).withMessage('Slug must be lowercase alphanumeric with hyphens'),
  body('adminEmail').trim().isEmail().withMessage('Valid admin email is required'),
  body('adminFirstName').trim().notEmpty().withMessage('Admin first name is required'),
  body('adminLastName').trim().notEmpty().withMessage('Admin last name is required'),
  body('planId').optional().isUUID().withMessage('Invalid plan ID'),
];

const bulkEmailValidation = [
  body('subject').trim().notEmpty().withMessage('Subject is required')
    .isLength({ max: 500 }).withMessage('Subject must be at most 500 characters'),
  body('body').trim().notEmpty().withMessage('Body is required')
    .isLength({ max: 50000 }).withMessage('Body must be at most 50000 characters'),
  body('html').optional().isString().withMessage('HTML must be a string'),
  body('filter').optional().isObject().withMessage('Filter must be an object'),
];

const router = Router();

/**
 * Middleware to verify super admin access
 * Supports multiple authentication methods:
 * 1. Dedicated super admin token with isSuperAdmin: true
 * 2. Regular user token with 'super-admin' or 'platform-admin' role
 * 3. Both cookie-based and Bearer token authentication
 */
const verifySuperAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Try to get token from cookie first, then Authorization header
    let token = getAccessToken(req);

    // Fallback to Authorization header for legacy support
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, config.jwt.secret) as any;

    // Method 1: Dedicated super admin token
    if (decoded.isSuperAdmin) {
      (req as any).superAdmin = decoded;
      return next();
    }

    // Method 2: Regular user with super-admin role
    if (decoded.userId && decoded.roleSlug) {
      const superAdminRoles = ['super-admin', 'super_admin', 'platform-admin', 'superadmin', 'platform_admin'];
      if (superAdminRoles.includes(decoded.roleSlug.toLowerCase())) {
        // Fetch user details for super admin context
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: { select: { slug: true } },
          },
        });

        if (user) {
          (req as any).superAdmin = {
            isSuperAdmin: true,
            superAdminId: user.id,
            userId: user.id,
            email: user.email,
            roleSlug: decoded.roleSlug,
          };
          return next();
        }
      }
    }

    return res.status(403).json({ success: false, message: 'Not authorized as super admin' });
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// ==================== AUTH ====================

/**
 * POST /super-admin/setup - First time setup (create super admin)
 */
router.post('/setup', validate(setupValidation), async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, phone, setupKey } = req.body;

    // Verify setup key (MUST be set in environment - no default allowed)
    const validSetupKey = process.env.SUPER_ADMIN_SETUP_KEY;
    if (!validSetupKey) {
      console.error('SECURITY: SUPER_ADMIN_SETUP_KEY not configured - setup endpoint disabled');
      return res.status(503).json({
        success: false,
        message: 'Super admin setup is not configured. Contact system administrator.'
      });
    }
    if (!setupKey || setupKey !== validSetupKey) {
      return res.status(403).json({ success: false, message: 'Invalid setup key' });
    }

    const admin = await superAdminService.createSuperAdmin({
      email,
      password,
      firstName,
      lastName,
      phone,
    });

    // Log audit
    await superAdminService.createAuditLog({
      actorType: 'system',
      action: 'super_admin_created',
      description: `Super admin created: ${email}`,
    });

    res.status(201).json({
      success: true,
      message: 'Super admin created successfully',
      admin,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * POST /super-admin/login
 */
router.post('/login', validate(loginValidation), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = await superAdminService.login(email, password);

    // Set httpOnly cookies for token storage (more secure)
    if (result.accessToken && result.refreshToken) {
      setAuthCookies(res, {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    }

    // Log audit
    await superAdminService.createAuditLog({
      actorType: 'superadmin',
      actorId: result.admin.id,
      actorEmail: email,
      action: 'login',
      description: 'Super admin logged in',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Return response without exposing tokens in body (they're in cookies)
    res.json({
      success: true,
      admin: result.admin,
      message: 'Login successful',
    });
  } catch (error: any) {
    res.status(401).json({ success: false, message: error.message });
  }
});

/**
 * POST /super-admin/logout
 */
router.post('/logout', verifySuperAdmin, async (req: Request, res: Response) => {
  try {
    const superAdmin = (req as any).superAdmin;

    // Clear httpOnly cookies
    clearAuthCookies(res);

    // Log audit
    await superAdminService.createAuditLog({
      actorType: 'superadmin',
      actorId: superAdmin?.superAdminId,
      action: 'logout',
      description: 'Super admin logged out',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /super-admin/me - Get current super admin info
 */
router.get('/me', verifySuperAdmin, async (req: Request, res: Response) => {
  try {
    const superAdmin = (req as any).superAdmin;

    // Check if this is a regular user with super-admin role
    if (superAdmin.userId && superAdmin.roleSlug) {
      const user = await prisma.user.findUnique({
        where: { id: superAdmin.userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          createdAt: true,
          lastLoginAt: true,
          role: { select: { name: true, slug: true } },
        },
      });

      if (!user) {
        return res.status(404).json({ success: false, message: 'Admin not found' });
      }

      return res.json({
        success: true,
        admin: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
          role: user.role?.name || 'Super Admin',
        },
      });
    }

    // Dedicated super admin from SuperAdmin table
    const admin = await prisma.superAdmin.findUnique({
      where: { id: superAdmin.id || superAdmin.superAdminId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    res.json({ success: true, admin });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== DASHBOARD ====================

/**
 * GET /super-admin/stats - Get platform statistics
 */
router.get('/stats', verifySuperAdmin, async (req: Request, res: Response) => {
  try {
    const stats = await superAdminService.getPlatformStats();
    res.json({ success: true, ...stats });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /super-admin/revenue - Get revenue analytics
 */
router.get('/revenue', verifySuperAdmin, validate([
  query('months').optional().isInt({ min: 1, max: 120 }).withMessage('Months must be between 1 and 120'),
]), async (req: Request, res: Response) => {
  try {
    const months = Math.min(parseInt(req.query.months as string) || 12, 120);
    const data = await superAdminService.getRevenueAnalytics(months);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== ORGANIZATIONS ====================

/**
 * GET /super-admin/organizations - List all organizations
 */
router.get('/organizations', verifySuperAdmin, async (req: Request, res: Response) => {
  try {
    const { page, limit, search, status, plan } = req.query;
    const result = await superAdminService.getAllOrganizations({
      page: parseInt(page as string) || 1,
      limit: parseInt(limit as string) || 20,
      search: search as string,
      status: status as string,
      plan: plan as string,
    });
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /super-admin/organizations/:id - Get organization details
 */
router.get('/organizations/:id', verifySuperAdmin, validate([
  param('id').isUUID().withMessage('Invalid organization ID'),
]), async (req: Request, res: Response) => {
  try {
    const org = await superAdminService.getOrganizationDetails(req.params.id);
    res.json({ success: true, organization: org });
  } catch (error: any) {
    res.status(404).json({ success: false, message: error.message });
  }
});

/**
 * GET /super-admin/tenants/:id - Get detailed tenant information
 * Comprehensive tenant tracking with usage, billing, and activity
 */
router.get('/tenants/:id', verifySuperAdmin, validate([
  param('id').isUUID().withMessage('Invalid tenant ID'),
]), async (req: Request, res: Response) => {
  try {
    const tenant = await superAdminService.getTenantDetails(req.params.id);
    res.json({ success: true, tenant });
  } catch (error: any) {
    res.status(404).json({ success: false, message: error.message });
  }
});

/**
 * PATCH /super-admin/organizations/:id - Update organization
 */
router.patch('/organizations/:id', verifySuperAdmin, validate([
  param('id').isUUID().withMessage('Invalid organization ID'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
  body('activePlanId').optional().isUUID().withMessage('Invalid plan ID'),
  body('subscriptionStatus').optional().isIn(['ACTIVE', 'INACTIVE', 'TRIAL', 'SUSPENDED', 'CANCELLED'])
    .withMessage('Invalid subscription status'),
]), async (req: Request, res: Response) => {
  try {
    const { isActive, activePlanId, subscriptionStatus } = req.body;
    const org = await superAdminService.updateOrganization(req.params.id, {
      isActive,
      activePlanId,
      subscriptionStatus,
    });

    // Log audit
    await superAdminService.createAuditLog({
      actorType: 'superadmin',
      actorId: (req as any).superAdmin.id,
      organizationId: req.params.id,
      targetType: 'organization',
      targetId: req.params.id,
      action: 'organization_updated',
      description: `Organization updated`,
      changes: { isActive, activePlanId, subscriptionStatus },
    });

    res.json({ success: true, organization: org });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ==================== AUDIT LOGS ====================

/**
 * GET /super-admin/audit-logs - Get audit logs
 */
router.get('/audit-logs', verifySuperAdmin, async (req: Request, res: Response) => {
  try {
    const { organizationId, actorId, action, page, limit } = req.query;
    const result = await superAdminService.getAuditLogs({
      organizationId: organizationId as string,
      actorId: actorId as string,
      action: action as string,
      page: parseInt(page as string) || 1,
      limit: parseInt(limit as string) || 50,
    });
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== PLAN MANAGEMENT ====================

/**
 * GET /super-admin/plans - Get all plan definitions
 */
router.get('/plans', verifySuperAdmin, async (req: Request, res: Response) => {
  try {
    const plans = await prisma.planDefinition.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    res.json({ success: true, plans });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /super-admin/plans - Create/update plan
 */
router.post('/plans', verifySuperAdmin, validate(planValidation), async (req: Request, res: Response) => {
  try {
    const { slug, name, monthlyPrice, yearlyPrice, features, description, sortOrder, isActive, maxUsers, maxLeads } = req.body;

    const plan = await prisma.planDefinition.upsert({
      where: { slug },
      update: { name, monthlyPrice, yearlyPrice, features, description, sortOrder, isActive, maxUsers, maxLeads },
      create: { slug, name, monthlyPrice: monthlyPrice || 0, yearlyPrice: yearlyPrice || 0, features, description, sortOrder, isActive, maxUsers, maxLeads },
    });

    // Log audit
    await superAdminService.createAuditLog({
      actorType: 'superadmin',
      actorId: (req as any).superAdmin.id,
      action: 'plan_updated',
      description: `Plan "${slug}" created/updated`,
      changes: { slug, name, monthlyPrice },
    });

    res.json({ success: true, plan });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ==================== CREATE ORGANIZATION ====================

/**
 * POST /super-admin/organizations - Create organization manually
 */
router.post('/organizations', verifySuperAdmin, validate(createOrgValidation), async (req: Request, res: Response) => {
  try {
    const { organizationName, slug, adminEmail, adminFirstName, adminLastName, planId } = req.body;

    const result = await superAdminService.createOrganization({
      organizationName,
      slug,
      adminEmail,
      adminFirstName,
      adminLastName,
      planId,
    });

    // Log audit
    await superAdminService.createAuditLog({
      actorType: 'superadmin',
      actorId: (req as any).superAdmin.id,
      organizationId: result.organization.id,
      targetType: 'organization',
      targetId: result.organization.id,
      action: 'organization_created',
      description: `Organization "${organizationName}" created manually by super admin`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({ success: true, ...result });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ==================== IMPERSONATION ====================

/**
 * POST /super-admin/impersonate/:userId - Login as any user
 */
router.post('/impersonate/:userId', verifySuperAdmin, validate([
  param('userId').isUUID().withMessage('Invalid user ID'),
]), async (req: Request, res: Response) => {
  try {
    const superAdminId = (req as any).superAdmin.id;
    const result = await superAdminService.impersonateUser(req.params.userId, superAdminId);

    // Log audit
    await superAdminService.createAuditLog({
      actorType: 'superadmin',
      actorId: superAdminId,
      organizationId: result.user.organizationId,
      targetType: 'user',
      targetId: req.params.userId,
      action: 'impersonation_started',
      description: `Super admin started impersonating user ${result.user.email}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * POST /super-admin/exit-impersonation - Return to super admin session
 */
router.post('/exit-impersonation', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret) as any;

    if (!decoded.isImpersonating || !decoded.impersonatedBy) {
      return res.status(400).json({ success: false, message: 'Not in impersonation mode' });
    }

    const result = await superAdminService.exitImpersonation(decoded.impersonatedBy);

    // Log audit
    await superAdminService.createAuditLog({
      actorType: 'superadmin',
      actorId: decoded.impersonatedBy,
      targetType: 'user',
      targetId: decoded.userId,
      action: 'impersonation_ended',
      description: `Super admin ended impersonation session`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ==================== BULK EMAIL ====================

/**
 * POST /super-admin/bulk-email - Send bulk email to organizations
 */
router.post('/bulk-email', verifySuperAdmin, validate(bulkEmailValidation), async (req: Request, res: Response) => {
  try {
    const { subject, body, html, filter } = req.body;

    const result = await superAdminService.sendBulkEmailToOrganizations({
      subject,
      body,
      html,
      filter: filter || {},
      superAdminId: (req as any).superAdmin.id,
    });

    // Log audit
    await superAdminService.createAuditLog({
      actorType: 'superadmin',
      actorId: (req as any).superAdmin.id,
      action: 'bulk_email_sent',
      description: `Bulk email sent to ${result.totalSent} organizations`,
      changes: { filter, totalSent: result.totalSent, totalFailed: result.totalFailed },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== EXPORTS ====================

/**
 * GET /super-admin/export/organizations - Export organizations to XLSX
 */
router.get('/export/organizations', verifySuperAdmin, async (req: Request, res: Response) => {
  try {
    const buffer = await superAdminService.exportOrganizations();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=organizations.xlsx');
    res.send(Buffer.from(buffer));
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /super-admin/export/revenue - Export revenue report to XLSX
 */
router.get('/export/revenue', verifySuperAdmin, async (req: Request, res: Response) => {
  try {
    const months = parseInt(req.query.months as string) || 12;
    const buffer = await superAdminService.exportRevenueReport(months);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=revenue-report.xlsx');
    res.send(Buffer.from(buffer));
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /super-admin/export/usage - Export usage statistics to XLSX
 */
router.get('/export/usage', verifySuperAdmin, async (req: Request, res: Response) => {
  try {
    const buffer = await superAdminService.exportUsageReport();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=usage-statistics.xlsx');
    res.send(Buffer.from(buffer));
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /super-admin/export/audit-logs - Export audit logs to XLSX
 */
router.get('/export/audit-logs', verifySuperAdmin, async (req: Request, res: Response) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const organizationId = req.query.organizationId as string;

    const buffer = await superAdminService.exportAuditLogs({
      startDate,
      endDate,
      organizationId,
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.xlsx');
    res.send(Buffer.from(buffer));
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== ADVANCED FEATURES ====================
// Mount advanced routes (all require super admin auth)
router.use('/', verifySuperAdmin, advancedRoutes);

// ==================== BILLING DASHBOARD ====================

/**
 * GET /super-admin/billing/dashboard
 * Comprehensive billing dashboard with MRR, ARR, subscription stats
 */
router.get('/billing/dashboard', verifySuperAdmin, async (req: Request, res: Response) => {
  try {
    const data = await superAdminService.getBillingDashboard();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /super-admin/billing/transactions
 * All wallet transactions across tenants
 */
router.get('/billing/transactions', verifySuperAdmin, validate([
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('type').optional().isIn(['CREDIT', 'DEBIT', 'REFUND']),
  query('organizationId').optional().isUUID(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
]), async (req: Request, res: Response) => {
  try {
    const data = await superAdminService.getAllWalletTransactions({
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 50,
      type: req.query.type as string,
      organizationId: req.query.organizationId as string,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
    });
    res.json({ success: true, ...data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /super-admin/billing/subscriptions
 * All subscriptions across tenants
 */
router.get('/billing/subscriptions', verifySuperAdmin, validate([
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['PENDING', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED', 'TRIAL']),
  query('planId').optional(),
  query('billingCycle').optional().isIn(['monthly', 'annual']),
]), async (req: Request, res: Response) => {
  try {
    const data = await superAdminService.getAllSubscriptions({
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 50,
      status: req.query.status as string,
      planId: req.query.planId as string,
      billingCycle: req.query.billingCycle as string,
    });
    res.json({ success: true, ...data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /super-admin/billing/promo-analytics
 * Promo code usage analytics
 */
router.get('/billing/promo-analytics', verifySuperAdmin, async (req: Request, res: Response) => {
  try {
    const data = await superAdminService.getPromoCodeAnalytics();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /super-admin/billing/churn
 * Subscription churn analytics
 */
router.get('/billing/churn', verifySuperAdmin, validate([
  query('months').optional().isInt({ min: 1, max: 24 }),
]), async (req: Request, res: Response) => {
  try {
    const months = parseInt(req.query.months as string) || 6;
    const data = await superAdminService.getChurnAnalytics(months);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /super-admin/billing/wallet-adjust
 * Manually credit or debit a tenant's wallet
 */
router.post('/billing/wallet-adjust', verifySuperAdmin, validate([
  body('organizationId').isUUID().withMessage('Valid organization ID is required'),
  body('amount').isFloat({ min: 1 }).withMessage('Amount must be at least 1'),
  body('type').isIn(['CREDIT', 'DEBIT']).withMessage('Type must be CREDIT or DEBIT'),
  body('reason').trim().notEmpty().withMessage('Reason is required'),
]), async (req: Request, res: Response) => {
  try {
    const { organizationId, amount, type, reason } = req.body;
    const adminId = (req as any).superAdmin?.id || 'super-admin';

    const result = await superAdminService.adjustWalletBalance({
      organizationId,
      amount: parseFloat(amount),
      type,
      reason,
      adminId,
    });

    res.json({ success: true, data: result, message: `Wallet ${type.toLowerCase()}ed successfully` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /super-admin/billing/invoices
 * Get all invoices across tenants
 */
router.get('/billing/invoices', verifySuperAdmin, validate([
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isString(),
  query('organizationId').optional().isUUID(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
]), async (req: Request, res: Response) => {
  try {
    const data = await superAdminService.getAllInvoices({
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      status: req.query.status as string,
      organizationId: req.query.organizationId as string,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
    });
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /super-admin/billing/failed-payments
 * Get failed/pending payments
 */
router.get('/billing/failed-payments', verifySuperAdmin, validate([
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
]), async (req: Request, res: Response) => {
  try {
    const data = await superAdminService.getFailedPayments({
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
    });
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /super-admin/billing/refund
 * Issue a refund to a tenant
 */
router.post('/billing/refund', verifySuperAdmin, validate([
  body('organizationId').isUUID().withMessage('Valid organization ID is required'),
  body('amount').isFloat({ min: 1 }).withMessage('Amount must be at least 1'),
  body('reason').trim().notEmpty().withMessage('Reason is required'),
  body('originalTransactionId').optional().isUUID(),
]), async (req: Request, res: Response) => {
  try {
    const { organizationId, amount, reason, originalTransactionId } = req.body;
    const adminId = (req as any).superAdmin?.id || 'super-admin';

    const result = await superAdminService.issueRefund({
      organizationId,
      amount: parseFloat(amount),
      reason,
      originalTransactionId,
      adminId,
    });

    res.json({ success: true, data: result, message: 'Refund issued successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /super-admin/billing/export
 * Export billing data to Excel
 */
router.get('/billing/export', verifySuperAdmin, validate([
  query('type').isIn(['transactions', 'subscriptions', 'invoices']).withMessage('Type must be transactions, subscriptions, or invoices'),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
]), async (req: Request, res: Response) => {
  try {
    const type = req.query.type as 'transactions' | 'subscriptions' | 'invoices';
    const workbook = await superAdminService.exportBillingData({
      type,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
    });

    const filename = `${type}-export-${new Date().toISOString().split('T')[0]}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /super-admin/billing/forecast
 * Revenue forecast
 */
router.get('/billing/forecast', verifySuperAdmin, validate([
  query('months').optional().isInt({ min: 1, max: 12 }),
]), async (req: Request, res: Response) => {
  try {
    const months = parseInt(req.query.months as string) || 3;
    const data = await superAdminService.getRevenueForecast(months);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// Phone Number Tracking Routes
// ============================================

/**
 * GET /super-admin/phone-numbers/analytics
 * Get phone number analytics across all tenants
 */
router.get('/phone-numbers/analytics', verifySuperAdmin, async (req: Request, res: Response) => {
  try {
    const data = await superAdminService.getPhoneNumberAnalytics();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /super-admin/phone-numbers
 * Get all phone numbers with filters
 */
router.get('/phone-numbers', verifySuperAdmin, validate([
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('provider').optional().isString(),
  query('status').optional().isString(),
  query('organizationId').optional().isUUID(),
]), async (req: Request, res: Response) => {
  try {
    const data = await superAdminService.getAllPhoneNumbers({
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      provider: req.query.provider as string,
      status: req.query.status as string,
      organizationId: req.query.organizationId as string,
    });
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /super-admin/phone-numbers/provider-usage
 * Get provider usage breakdown by tenant
 */
router.get('/phone-numbers/provider-usage', verifySuperAdmin, async (req: Request, res: Response) => {
  try {
    const data = await superAdminService.getProviderUsageByTenant();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// Industry Reports (Cross-tenant by industry)
// ============================================

/**
 * GET /super-admin/reports/platform
 * Platform-wide report including industry breakdown
 */
router.get('/reports/platform', verifySuperAdmin, async (req: Request, res: Response) => {
  try {
    // Create a mock request with super admin context
    const mockReq = {
      user: { isSuperAdmin: true },
    } as any;
    const data = await tenantReportsService.getPlatformReport(mockReq);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /super-admin/reports/by-industry
 * Detailed report broken down by industry
 */
router.get('/reports/by-industry', verifySuperAdmin, async (req: Request, res: Response) => {
  try {
    // Create a mock request with super admin context
    const mockReq = {
      user: { isSuperAdmin: true },
    } as any;
    const data = await tenantReportsService.getIndustryReport(mockReq);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /super-admin/industries/stats
 * Quick stats for each industry
 */
router.get('/industries/stats', verifySuperAdmin, async (req: Request, res: Response) => {
  try {
    // Get all dynamic industries with organization counts
    const industries = await prisma.dynamicIndustry.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { organizations: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Get lead counts per industry
    const industryStats = await Promise.all(
      industries.map(async (industry) => {
        const orgIds = await prisma.organization.findMany({
          where: { dynamicIndustryId: industry.id },
          select: { id: true },
        });
        const orgIdList = orgIds.map(o => o.id);

        const leadCount = orgIdList.length > 0
          ? await prisma.lead.count({ where: { organizationId: { in: orgIdList } } })
          : 0;

        return {
          slug: industry.slug,
          name: industry.name,
          icon: industry.icon,
          color: industry.color,
          organizationCount: industry._count.organizations,
          leadCount,
        };
      })
    );

    // Sort by organization count descending
    industryStats.sort((a, b) => b.organizationCount - a.organizationCount);

    res.json({
      success: true,
      data: {
        industries: industryStats,
        totalIndustries: industries.length,
        totalOrganizations: industryStats.reduce((sum, i) => sum + i.organizationCount, 0),
        totalLeads: industryStats.reduce((sum, i) => sum + i.leadCount, 0),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
