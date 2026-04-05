import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { universityController } from '../controllers/university.controller';
import { validate } from '../middlewares/validate';
import { authenticate, authorize } from '../middlewares/auth';
import { tenantMiddleware } from '../middlewares/tenant';

const router = Router();

router.use(authenticate);
router.use(tenantMiddleware);

// Validation schemas
const createUniversityValidation = [
  body('name').trim().notEmpty().withMessage('University name is required'),
  body('shortName').optional().trim(),
  body('type').optional().trim(),
  body('city').optional().trim(),
  body('state').optional().trim(),
  body('website').optional().trim().isURL().withMessage('Invalid website URL'),
  body('contactPerson').optional().trim(),
  body('contactPhone').optional().trim(),
  body('contactEmail').optional().isEmail().withMessage('Invalid email'),
  body('defaultCommissionPercent').optional().isFloat({ min: 0, max: 100 }),
  body('donationCommissionPercent').optional().isFloat({ min: 0, max: 100 }),
];

const updateUniversityValidation = [
  param('id').isUUID(),
  body('name').optional().trim().notEmpty().withMessage('University name cannot be empty'),
  body('shortName').optional().trim(),
  body('type').optional().trim(),
  body('city').optional().trim(),
  body('state').optional().trim(),
  body('website').optional().trim().isURL().withMessage('Invalid website URL'),
  body('contactPerson').optional().trim(),
  body('contactPhone').optional().trim(),
  body('contactEmail').optional().isEmail().withMessage('Invalid email'),
  body('defaultCommissionPercent').optional().isFloat({ min: 0, max: 100 }),
  body('donationCommissionPercent').optional().isFloat({ min: 0, max: 100 }),
  body('isActive').optional().isBoolean(),
];

// Routes

// Get filter options (types, states)
router.get(
  '/types',
  universityController.getTypes.bind(universityController)
);

router.get(
  '/states',
  universityController.getStates.bind(universityController)
);

// Create university (admin/manager only)
router.post(
  '/',
  authorize('admin', 'manager'),
  validate(createUniversityValidation),
  universityController.create.bind(universityController)
);

// List all universities
router.get(
  '/',
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().trim(),
  query('type').optional().trim(),
  query('state').optional().trim(),
  query('isActive').optional().isIn(['true', 'false']),
  universityController.findAll.bind(universityController)
);

// Get single university
router.get(
  '/:id',
  param('id').isUUID(),
  universityController.findById.bind(universityController)
);

// Get university statistics
router.get(
  '/:id/stats',
  param('id').isUUID(),
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
  universityController.getStats.bind(universityController)
);

// Update university (admin/manager only)
router.patch(
  '/:id',
  authorize('admin', 'manager'),
  validate(updateUniversityValidation),
  universityController.update.bind(universityController)
);

// Delete university (admin only)
router.delete(
  '/:id',
  authorize('admin'),
  param('id').isUUID(),
  universityController.delete.bind(universityController)
);

export default router;
