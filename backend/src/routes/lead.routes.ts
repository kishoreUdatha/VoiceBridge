import { Router, Response } from 'express';
import { body, param, query } from 'express-validator';
import { prisma } from '../config/database';
import { leadController } from '../controllers/lead.controller';
import { validate } from '../middlewares/validate';
import { authenticate, authorize } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { uploadSpreadsheet } from '../middlewares/upload';
import { ApiResponse } from '../utils/apiResponse';
import { canAccessLead, hasElevatedAccess } from '../utils/leadAccess';

const router = Router();

// Apply authentication and tenant middleware to all routes
router.use(authenticate);
router.use(tenantMiddleware);

// Custom validators - validate format only when value is provided
const validateEmail = (value: string | undefined | null): boolean => {
  // Skip validation if empty/undefined/null
  if (value === undefined || value === null || value === '' || (typeof value === 'string' && value.trim() === '')) {
    return true;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value.trim())) {
    throw new Error('Invalid email format (e.g., user@example.com)');
  }
  return true;
};

const validatePhone = (value: string | undefined | null, { req, path }: { req: any; path: string }): boolean => {
  const isRequired = path === 'phone' && req.method === 'POST';

  // Skip validation if empty/undefined/null (unless required)
  if (value === undefined || value === null || value === '' || (typeof value === 'string' && value.trim() === '')) {
    if (isRequired) throw new Error('Phone number is required');
    return true;
  }

  const digitsOnly = value.replace(/[\s\-\(\)\+]/g, '');
  if (!/^\d+$/.test(digitsOnly)) {
    throw new Error('Phone must contain only digits');
  }
  if (digitsOnly.length < 10) {
    throw new Error('Phone must be at least 10 digits');
  }
  if (digitsOnly.length > 15) {
    throw new Error('Phone must not exceed 15 digits');
  }
  return true;
};

// Validation rules
const createLeadValidation = [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').optional().trim(),
  body('email').custom(validateEmail),
  body('phone').custom(validatePhone),
  body('alternatePhone').custom(validatePhone),
  body('source').optional().isIn([
    'MANUAL', 'BULK_UPLOAD', 'FORM', 'LANDING_PAGE', 'CHATBOT',
    'AD_FACEBOOK', 'AD_INSTAGRAM', 'AD_LINKEDIN', 'REFERRAL', 'WEBSITE', 'OTHER'
  ]),
  body('status').optional().isIn([
    'NEW', 'CONTACTED', 'QUALIFIED', 'NEGOTIATION', 'WON', 'LOST', 'FOLLOW_UP'
  ]),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  body('notes').optional().trim(),
];

const updateLeadValidation = [
  param('id').isUUID().withMessage('Invalid lead ID'),
  body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
  body('lastName').optional().trim(),
  body('email').custom(validateEmail),
  body('phone').custom(validatePhone),
  body('alternatePhone').custom(validatePhone),
  body('status').optional().isIn([
    'NEW', 'CONTACTED', 'QUALIFIED', 'NEGOTIATION', 'WON', 'LOST', 'FOLLOW_UP'
  ]),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
];

const assignLeadValidation = [
  param('id').isUUID().withMessage('Invalid lead ID'),
  body('assignedToId').isUUID().withMessage('Invalid counselor ID'),
];

const listLeadsValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  // Status accepts dynamic stage names from database (not hardcoded)
  query('status').optional().isString().trim().notEmpty().withMessage('Status must be a valid stage name'),
  query('source').optional().isIn([
    'MANUAL', 'BULK_UPLOAD', 'FORM', 'LANDING_PAGE', 'CHATBOT',
    'AD_FACEBOOK', 'AD_INSTAGRAM', 'AD_LINKEDIN', 'REFERRAL', 'WEBSITE', 'OTHER'
  ]),
  query('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  query('assignedToId').optional().isUUID(),
  query('tag').optional().isUUID().withMessage('Invalid tag ID'),
  query('dateFrom').optional().isISO8601(),
  query('dateTo').optional().isISO8601(),
  query('customFields').optional().isString().withMessage('Custom fields must be a JSON string'),
];

// Lead stages/statuses
const LEAD_STAGES = [
  { id: 'NEW', name: 'New', color: '#3B82F6', order: 1 },
  { id: 'CONTACTED', name: 'Contacted', color: '#8B5CF6', order: 2 },
  { id: 'QUALIFIED', name: 'Qualified', color: '#10B981', order: 3 },
  { id: 'NEGOTIATION', name: 'Negotiation', color: '#F59E0B', order: 4 },
  { id: 'FOLLOW_UP', name: 'Follow Up', color: '#6366F1', order: 5 },
  { id: 'WON', name: 'Won', color: '#22C55E', order: 6 },
  { id: 'LOST', name: 'Lost', color: '#EF4444', order: 7 },
];

/**
 * Role-based middleware for lead access
 * - Admin/Manager: Can access any lead in the organization
 * - Telecaller/Counselor: Can only access leads assigned to them
 */
const checkLeadAccess = async (req: TenantRequest, res: Response, next: Function) => {
  try {
    const leadId = req.params.id;
    const userId = req.user!.id;
    const organizationId = req.organizationId!;
    const role = req.user!.role;

    // Admin/Manager can access any lead in the organization
    if (hasElevatedAccess(role)) {
      return next();
    }

    // Telecaller/Counselor can only access leads assigned to them
    const hasAccess = await canAccessLead(leadId, { userId, organizationId, role });
    if (!hasAccess) {
      return ApiResponse.notFound(res, 'Lead not found');
    }

    next();
  } catch (error) {
    ApiResponse.error(res, 'Access check failed', 500);
  }
};

// Routes
router.get('/stats', leadController.getStats.bind(leadController));

// Get available lead stages/statuses
router.get('/stages', (req: TenantRequest, res: Response) => {
  ApiResponse.success(res, 'Lead stages retrieved', LEAD_STAGES);
});

router.post(
  '/bulk-upload',
  authorize('admin', 'counselor'),
  uploadSpreadsheet.single('file'),
  leadController.bulkUpload.bind(leadController)
);

// Bulk assign leads to counselors - must be before /:id routes
// Admin: can assign to anyone
// Manager: can assign to their team leads and telecallers
// Team Lead: can assign to their telecallers only
router.post(
  '/assign-bulk',
  authorize('admin', 'manager', 'team_lead'),
  validate([
    body('source').optional().isIn([
      'MANUAL', 'BULK_UPLOAD', 'FORM', 'LANDING_PAGE', 'CHATBOT',
      'AD_FACEBOOK', 'AD_INSTAGRAM', 'AD_LINKEDIN', 'REFERRAL', 'WEBSITE', 'OTHER'
    ]),
    body('counselorIds').isArray({ min: 1 }).withMessage('At least one counselor is required'),
    body('counselorIds.*').isUUID().withMessage('Invalid counselor ID'),
  ]),
  leadController.assignBulk.bind(leadController)
);

router.post(
  '/',
  validate(createLeadValidation),
  leadController.create.bind(leadController)
);

router.get(
  '/',
  validate(listLeadsValidation),
  leadController.findAll.bind(leadController)
);

router.get(
  '/:id',
  validate([param('id').isUUID().withMessage('Invalid lead ID')]),
  checkLeadAccess, // Reuse the same access check for reading
  leadController.findById.bind(leadController)
);

router.put(
  '/:id',
  validate(updateLeadValidation),
  checkLeadAccess,
  leadController.update.bind(leadController)
);

// PATCH for partial updates (same as PUT but for mobile app compatibility)
router.patch(
  '/:id',
  validate(updateLeadValidation),
  checkLeadAccess,
  leadController.update.bind(leadController)
);

router.delete(
  '/:id',
  authorize('admin'),
  validate([param('id').isUUID().withMessage('Invalid lead ID')]),
  leadController.delete.bind(leadController)
);

// Assign single lead
// Admin: can assign to anyone
// Manager: can assign to their team leads and telecallers
// Team Lead: can assign to their telecallers only
router.put(
  '/:id/assign',
  authorize('admin', 'manager', 'team_lead'),
  validate(assignLeadValidation),
  leadController.assign.bind(leadController)
);

// Add note to lead
router.post(
  '/:id/notes',
  validate([
    param('id').isUUID().withMessage('Invalid lead ID'),
    body('content').trim().notEmpty().withMessage('Note content is required')
      .isLength({ max: 5000 }).withMessage('Note must be at most 5000 characters'),
  ]),
  checkLeadAccess, // Role-based access check
  async (req: TenantRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { content } = req.body;
      const userId = req.user!.id;

      const note = await prisma.leadNote.create({
        data: {
          leadId: id,
          userId,
          content,
        },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });

      // Log activity
      await prisma.leadActivity.create({
        data: {
          leadId: id,
          type: 'NOTE_ADDED',
          title: 'Note Added',
          description: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
          userId,
        },
      });

      ApiResponse.success(res, 'Note added', note);
    } catch (error) {
      ApiResponse.error(res, (error as Error).message, 500);
    }
  }
);

// Get lead notes
router.get(
  '/:id/notes',
  validate([param('id').isUUID().withMessage('Invalid lead ID')]),
  checkLeadAccess, // Role-based access check
  async (req: TenantRequest, res: Response) => {
    try {
      const { id } = req.params;

      const notes = await prisma.leadNote.findMany({
        where: { leadId: id },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      ApiResponse.success(res, 'Notes retrieved', notes);
    } catch (error) {
      ApiResponse.error(res, (error as Error).message, 500);
    }
  }
);

export default router;
