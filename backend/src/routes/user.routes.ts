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
  body('managerId').optional({ nullable: true }).isUUID().withMessage('Valid manager ID is required'),
];

const updateUserValidation = [
  param('id').isUUID().withMessage('Invalid user ID'),
  body('firstName').optional().trim().notEmpty(),
  body('lastName').optional().trim().notEmpty(),
  body('phone').optional().trim(),
  body('roleId').optional().isUUID(),
  body('isActive').optional().isBoolean(),
  body('managerId').optional({ nullable: true }).isUUID().withMessage('Valid manager ID is required'),
];

const listUsersValidation = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('role').optional().isString(),
  query('isActive').optional().isIn(['true', 'false']),
  query('search').optional().isString(),
];

// Routes
router.get('/counselors', userController.getCounselors.bind(userController));
router.get('/telecallers', userController.getTelecallers.bind(userController));
router.get('/managers', userController.getManagers.bind(userController));
router.get('/roles', userController.getRoles.bind(userController));

router.post(
  '/',
  authorize('admin'),
  validate(createUserValidation),
  userController.create.bind(userController)
);

router.get(
  '/',
  authorize('admin'),
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
  authorize('admin'),
  validate(updateUserValidation),
  userController.update.bind(userController)
);

router.delete(
  '/:id',
  authorize('admin'),
  validate([param('id').isUUID().withMessage('Invalid user ID')]),
  userController.delete.bind(userController)
);

export default router;
