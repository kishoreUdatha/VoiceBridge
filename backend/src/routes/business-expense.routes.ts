import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { businessExpenseController } from '../controllers/business-expense.controller';
import { validate } from '../middlewares/validate';
import { authenticate, authorize } from '../middlewares/auth';
import { tenantMiddleware } from '../middlewares/tenant';

const router = Router();

router.use(authenticate);
router.use(tenantMiddleware);

// Validation schemas
const createExpenseValidation = [
  body('category').isIn([
    'MARKETING', 'SALARY', 'RENT', 'TRAVEL', 'UTILITIES', 'OFFICE_SUPPLIES', 'COMMISSION_PAYOUT', 'OTHER'
  ]).withMessage('Invalid expense category'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('expenseDate').isISO8601().withMessage('Valid expense date is required'),
  body('universityId').optional().isUUID(),
  body('leadId').optional().isUUID(),
  body('receiptUrl').optional().trim(),
  body('vendorName').optional().trim(),
];

const updateExpenseValidation = [
  param('id').isUUID(),
  body('category').optional().isIn([
    'MARKETING', 'SALARY', 'RENT', 'TRAVEL', 'UTILITIES', 'OFFICE_SUPPLIES', 'COMMISSION_PAYOUT', 'OTHER'
  ]),
  body('description').optional().trim().notEmpty(),
  body('amount').optional().isFloat({ min: 0.01 }),
  body('expenseDate').optional().isISO8601(),
  body('universityId').optional(),
  body('leadId').optional(),
  body('receiptUrl').optional(),
  body('vendorName').optional(),
  body('status').optional().isIn(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED']),
];

// Routes

// Get expense categories
router.get(
  '/categories',
  businessExpenseController.getCategories.bind(businessExpenseController)
);

// Get expense summary
router.get(
  '/summary',
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
  businessExpenseController.getSummary.bind(businessExpenseController)
);

// Get monthly trend
router.get(
  '/monthly-trend',
  query('months').optional().isInt({ min: 1, max: 24 }),
  businessExpenseController.getMonthlyTrend.bind(businessExpenseController)
);

// Create expense
router.post(
  '/',
  validate(createExpenseValidation),
  businessExpenseController.create.bind(businessExpenseController)
);

// List all expenses
router.get(
  '/',
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('category').optional().isIn([
    'MARKETING', 'SALARY', 'RENT', 'TRAVEL', 'UTILITIES', 'OFFICE_SUPPLIES', 'COMMISSION_PAYOUT', 'OTHER'
  ]),
  query('status').optional().isIn(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED']),
  query('universityId').optional().isUUID(),
  query('fromDate').optional().isISO8601(),
  query('toDate').optional().isISO8601(),
  query('search').optional().trim(),
  businessExpenseController.findAll.bind(businessExpenseController)
);

// Get single expense
router.get(
  '/:id',
  param('id').isUUID(),
  businessExpenseController.findById.bind(businessExpenseController)
);

// Update expense
router.patch(
  '/:id',
  validate(updateExpenseValidation),
  businessExpenseController.update.bind(businessExpenseController)
);

// Delete expense (admin/manager only)
router.delete(
  '/:id',
  authorize('admin', 'manager'),
  param('id').isUUID(),
  businessExpenseController.delete.bind(businessExpenseController)
);

export default router;
