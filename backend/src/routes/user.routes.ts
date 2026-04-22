import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { userController } from '../controllers/user.controller';
import { validate } from '../middlewares/validate';
import { authenticate, authorize } from '../middlewares/auth';
import { tenantMiddleware } from '../middlewares/tenant';

const router = Router();

// Apply authentication and tenant middleware to all routes
router.use(authenticate);
router.use(tenantMiddleware);

// Validation rules
const createUserValidation = [
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required'),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required'),
  body('phone').optional().trim(),
  body('roleId').isUUID().withMessage('Valid role ID is required'),
  body('managerId')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === undefined || value === '') return true;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(value)) {
        throw new Error('Valid manager ID is required');
      }
      return true;
    }),
  body('branchId')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === undefined || value === '') return true;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(value)) {
        throw new Error('Valid branch ID is required');
      }
      return true;
    }),
];

const updateUserValidation = [
  param('id').isUUID().withMessage('Invalid user ID'),
  body('firstName').optional().trim().notEmpty(),
  body('lastName').optional().trim().notEmpty(),
  body('phone').optional().trim(),
  body('roleId').optional().isUUID(),
  body('isActive').optional().isBoolean(),
  body('managerId')
    .optional({ nullable: true })
    .custom((value) => {
      // Allow null, undefined, or empty string (will be treated as no manager)
      if (value === null || value === undefined || value === '') return true;
      // If a value is provided, it must be a valid UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(value)) {
        throw new Error('Valid manager ID is required');
      }
      return true;
    }),
  body('branchId')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === undefined || value === '') return true;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(value)) {
        throw new Error('Valid branch ID is required');
      }
      return true;
    }),
];

const listUsersValidation = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 1000 }),
  query('role').optional().isString(),
  query('isActive').optional().isIn(['true', 'false']),
  query('search').optional().isString(),
];

// Routes
router.get('/counselors', userController.getCounselors.bind(userController));
router.get('/telecallers', userController.getTelecallers.bind(userController));
router.get('/managers', userController.getManagers.bind(userController));
router.get('/roles', userController.getRoles.bind(userController));
// Get users that the current user can assign leads to based on hierarchy
router.get('/assignable', authorize('admin', 'manager', 'team_lead'), userController.getAssignableUsers.bind(userController));

router.post(
  '/',
  authorize('admin', 'org_admin', 'super_admin'),
  validate(createUserValidation),
  userController.create.bind(userController)
);

// All authenticated users can list users (needed for dropdowns/filters)
router.get(
  '/',
  validate(listUsersValidation),
  userController.findAll.bind(userController)
);

router.get(
  '/:id',
  validate([param('id').isUUID().withMessage('Invalid user ID')]),
  userController.findById.bind(userController)
);

router.put(
  '/:id',
  authorize('admin', 'org_admin', 'super_admin'),
  validate(updateUserValidation),
  userController.update.bind(userController)
);

router.delete(
  '/:id',
  authorize('admin', 'org_admin', 'super_admin'),
  validate([param('id').isUUID().withMessage('Invalid user ID')]),
  userController.delete.bind(userController)
);

// Reset password (admin only)
router.post(
  '/:id/reset-password',
  authorize('admin', 'org_admin', 'super_admin'),
  validate([
    param('id').isUUID().withMessage('Invalid user ID'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ]),
  userController.resetPassword.bind(userController)
);

// Get bulk user stats (for performance metrics)
router.get(
  '/stats/bulk',
  authorize('admin', 'manager'),
  userController.getBulkStats.bind(userController)
);

export default router;
