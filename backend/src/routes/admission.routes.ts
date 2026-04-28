import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { admissionController } from '../controllers/admission.controller';
import { validate } from '../middlewares/validate';
import { authenticate, authorize } from '../middlewares/auth';
import { tenantMiddleware } from '../middlewares/tenant';

const router = Router();

router.use(authenticate);
router.use(tenantMiddleware);

// Validation schemas
const createAdmissionValidation = [
  body('leadId').isUUID().withMessage('Valid lead ID is required'),
  body('universityId').isUUID().withMessage('Valid university ID is required'),
  body('academicYear').trim().notEmpty().withMessage('Academic year is required'),
  body('admissionType').isIn(['DONATION', 'NON_DONATION', 'NRI', 'SCHOLARSHIP'])
    .withMessage('Valid admission type is required'),
  body('totalFee').isFloat({ min: 0 }).withMessage('Total fee must be a positive number'),
  body('commissionPercent').isFloat({ min: 0, max: 100 })
    .withMessage('Commission percent must be between 0 and 100'),
  body('courseName').optional().trim(),
  body('branch').optional().trim(),
  body('donationAmount').optional().isFloat({ min: 0 }),
];

const updateAdmissionValidation = [
  param('id').isUUID(),
  body('courseName').optional().trim(),
  body('branch').optional().trim(),
  body('totalFee').optional().isFloat({ min: 0 }),
  body('commissionPercent').optional().isFloat({ min: 0, max: 100 }),
  body('donationAmount').optional().isFloat({ min: 0 }),
];

const recordPaymentValidation = [
  param('id').isUUID(),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('paymentType').isIn(['FEE', 'DONATION', 'MISCELLANEOUS'])
    .withMessage('Valid payment type is required'),
  body('paymentMode').optional().isIn(['CASH', 'CHEQUE', 'ONLINE', 'UPI']),
  body('referenceNumber').optional().trim(),
  body('notes').optional().trim(),
  body('receiptUrl').optional().trim(),
];

// Routes

// Get academic years
router.get(
  '/academic-years',
  admissionController.getAcademicYears.bind(admissionController)
);

// Get admission statistics
router.get(
  '/stats',
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
  admissionController.getStats.bind(admissionController)
);

// Create/Close admission
router.post(
  '/',
  authorize('admin', 'manager', 'team_lead'),
  validate(createAdmissionValidation),
  admissionController.create.bind(admissionController)
);

// List all admissions
router.get(
  '/',
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('universityId').optional().isUUID(),
  query('admissionType').optional().isIn(['DONATION', 'NON_DONATION', 'NRI', 'SCHOLARSHIP']),
  query('paymentStatus').optional().isIn(['PENDING', 'PARTIAL', 'PAID']),
  query('commissionStatus').optional().isIn(['PENDING', 'RECEIVED']),
  query('academicYear').optional().trim(),
  query('closedById').optional().isUUID(),
  query('branchId').optional().isUUID(),
  query('fromDate').optional().isISO8601(),
  query('toDate').optional().isISO8601(),
  query('search').optional().trim(),
  admissionController.findAll.bind(admissionController)
);

// Get single admission
router.get(
  '/:id',
  param('id').isUUID(),
  admissionController.findById.bind(admissionController)
);

// Update admission
router.patch(
  '/:id',
  authorize('admin', 'manager'),
  validate(updateAdmissionValidation),
  admissionController.update.bind(admissionController)
);

// Record payment
router.post(
  '/:id/payment',
  validate(recordPaymentValidation),
  admissionController.recordPayment.bind(admissionController)
);

// Mark commission as received
router.post(
  '/:id/commission-received',
  authorize('admin', 'manager'),
  param('id').isUUID(),
  admissionController.markCommissionReceived.bind(admissionController)
);

// Cancel admission
router.post(
  '/:id/cancel',
  authorize('admin', 'manager'),
  param('id').isUUID(),
  body('reason').optional().trim(),
  admissionController.cancel.bind(admissionController)
);

// Backfill commissions for existing admissions (admin only)
router.post(
  '/backfill-commissions',
  authorize('admin'),
  admissionController.backfillCommissions.bind(admissionController)
);

export default router;
