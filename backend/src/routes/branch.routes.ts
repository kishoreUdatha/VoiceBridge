import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { branchController } from '../controllers/branch.controller';
import { validate } from '../middlewares/validate';
import { authenticate, authorize } from '../middlewares/auth';
import { tenantMiddleware } from '../middlewares/tenant';

const router = Router();

router.use(authenticate);
router.use(tenantMiddleware);

// Validation schemas
const createBranchValidation = [
  body('name').trim().notEmpty().withMessage('Branch name is required'),
  body('code').trim().notEmpty().withMessage('Branch code is required')
    .matches(/^[A-Z0-9-]+$/).withMessage('Code must contain only uppercase letters, numbers, and hyphens'),
  body('address').trim().notEmpty().withMessage('Address is required'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('state').trim().notEmpty().withMessage('State is required'),
  body('country').optional().trim(),
  body('pincode').optional().trim(),
  body('latitude').optional().isFloat(),
  body('longitude').optional().isFloat(),
  body('phone').optional().trim(),
  body('email').optional().isEmail().withMessage('Invalid email'),
  body('isHeadquarters').optional().isBoolean(),
  body('branchManagerId').optional().isUUID(),
];

const updateBranchValidation = [
  param('id').isUUID(),
  body('name').optional().trim().notEmpty().withMessage('Branch name cannot be empty'),
  body('code').optional().trim()
    .matches(/^[A-Z0-9-]+$/).withMessage('Code must contain only uppercase letters, numbers, and hyphens'),
  body('address').optional().trim().notEmpty(),
  body('city').optional().trim().notEmpty(),
  body('state').optional().trim().notEmpty(),
  body('country').optional().trim(),
  body('pincode').optional().trim(),
  body('latitude').optional().isFloat(),
  body('longitude').optional().isFloat(),
  body('phone').optional().trim(),
  body('email').optional().isEmail().withMessage('Invalid email'),
  body('isHeadquarters').optional().isBoolean(),
  body('isActive').optional().isBoolean(),
  body('branchManagerId').optional(),
];

const assignUsersValidation = [
  param('id').isUUID(),
  body('userIds').isArray({ min: 1 }).withMessage('User IDs must be a non-empty array'),
  body('userIds.*').isUUID().withMessage('Each user ID must be a valid UUID'),
];

const assignManagerValidation = [
  param('id').isUUID(),
  body('userId').isUUID().withMessage('User ID must be a valid UUID'),
];

// Routes

// Create branch (admin only)
router.post(
  '/',
  authorize('admin', 'org_admin', 'super_admin'),
  validate(createBranchValidation),
  branchController.create.bind(branchController)
);

// List all branches
router.get(
  '/',
  query('isActive').optional().isIn(['true', 'false']),
  branchController.findAll.bind(branchController)
);

// Get single branch
router.get(
  '/:id',
  param('id').isUUID(),
  branchController.findById.bind(branchController)
);

// Update branch (admin only)
router.patch(
  '/:id',
  authorize('admin', 'org_admin', 'super_admin'),
  validate(updateBranchValidation),
  branchController.update.bind(branchController)
);

// Delete branch (admin only)
router.delete(
  '/:id',
  authorize('admin', 'org_admin', 'super_admin'),
  param('id').isUUID(),
  branchController.delete.bind(branchController)
);

// Assign manager to branch (admin only)
router.post(
  '/:id/manager',
  authorize('admin', 'org_admin', 'super_admin'),
  validate(assignManagerValidation),
  branchController.assignManager.bind(branchController)
);

// Assign users to branch (admin only)
router.post(
  '/:id/users',
  authorize('admin', 'org_admin', 'super_admin'),
  validate(assignUsersValidation),
  branchController.assignUsers.bind(branchController)
);

// Remove users from branch (admin only)
router.delete(
  '/:id/users',
  authorize('admin', 'org_admin', 'super_admin'),
  validate(assignUsersValidation),
  branchController.removeUsers.bind(branchController)
);

// Get branch users
router.get(
  '/:id/users',
  param('id').isUUID(),
  branchController.getUsers.bind(branchController)
);

// Get branch statistics
router.get(
  '/:id/stats',
  param('id').isUUID(),
  branchController.getStats.bind(branchController)
);

export default router;
