import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import jwt from 'jsonwebtoken';
import { superAdminService } from '../services/super-admin.service';
import { config } from '../config';
import { validate } from '../middlewares/validate';
import { prisma } from '../config/database';

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
 * Middleware to verify super admin token
 */
const verifySuperAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret) as any;

    if (!decoded.isSuperAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized as super admin' });
    }

    (req as any).superAdmin = decoded;
    next();
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

    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(401).json({ success: false, message: error.message });
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

export default router;
