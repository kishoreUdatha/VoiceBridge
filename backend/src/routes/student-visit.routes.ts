import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { studentVisitController } from '../controllers/student-visit.controller';
import { validate } from '../middlewares/validate';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware } from '../middlewares/tenant';

const router = Router();

router.use(authenticate);
router.use(tenantMiddleware);

// Validation schemas
const scheduleVisitValidation = [
  body('leadId').isUUID().withMessage('Valid lead ID is required'),
  body('universityId').isUUID().withMessage('Valid university ID is required'),
  body('visitDate').isISO8601().withMessage('Valid visit date is required'),
  body('visitTime').optional().trim(),
  body('accompaniedById').optional().isUUID(),
  body('travelArranged').optional().isBoolean(),
  body('travelExpense').optional().isFloat({ min: 0 }),
  body('notes').optional().trim(),
];

const updateVisitValidation = [
  param('id').isUUID(),
  body('visitDate').optional().isISO8601(),
  body('visitTime').optional().trim(),
  body('accompaniedById').optional(),
  body('travelArranged').optional().isBoolean(),
  body('travelExpense').optional().isFloat({ min: 0 }),
  body('notes').optional().trim(),
];

const completeVisitValidation = [
  param('id').isUUID(),
  body('feedback').optional().trim(),
  body('studentRating').optional().isInt({ min: 1, max: 5 }),
  body('interestedInAdmission').optional().isBoolean(),
  body('notes').optional().trim(),
];

// Routes

// Get upcoming visits for today
router.get(
  '/upcoming-today',
  query('userId').optional().isUUID(),
  studentVisitController.getUpcomingToday.bind(studentVisitController)
);

// Get visit statistics
router.get(
  '/stats',
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
  studentVisitController.getStats.bind(studentVisitController)
);

// Schedule a new visit
router.post(
  '/',
  validate(scheduleVisitValidation),
  studentVisitController.schedule.bind(studentVisitController)
);

// List all visits
router.get(
  '/',
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']),
  query('universityId').optional().isUUID(),
  query('leadId').optional().isUUID(),
  query('arrangedById').optional().isUUID(),
  query('fromDate').optional().isISO8601(),
  query('toDate').optional().isISO8601(),
  studentVisitController.findAll.bind(studentVisitController)
);

// Get single visit
router.get(
  '/:id',
  param('id').isUUID(),
  studentVisitController.findById.bind(studentVisitController)
);

// Update visit
router.patch(
  '/:id',
  validate(updateVisitValidation),
  studentVisitController.update.bind(studentVisitController)
);

// Confirm visit
router.post(
  '/:id/confirm',
  param('id').isUUID(),
  studentVisitController.confirm.bind(studentVisitController)
);

// Complete visit
router.post(
  '/:id/complete',
  validate(completeVisitValidation),
  studentVisitController.complete.bind(studentVisitController)
);

// Cancel visit
router.post(
  '/:id/cancel',
  param('id').isUUID(),
  body('reason').optional().trim(),
  studentVisitController.cancel.bind(studentVisitController)
);

// Mark as no-show
router.post(
  '/:id/no-show',
  param('id').isUUID(),
  body('notes').optional().trim(),
  studentVisitController.markNoShow.bind(studentVisitController)
);

export default router;
