import { Router } from 'express';
import { expenseController } from '../../controllers/fieldSales';
import { authenticate, hasPermission } from '../../middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Static routes (before :id routes to avoid conflict)
router.get(
  '/stats',
  expenseController.getExpenseStats.bind(expenseController)
);

router.get(
  '/my-summary',
  expenseController.getUserExpenseSummary.bind(expenseController)
);

router.get(
  '/limits',
  expenseController.getCategoryLimits.bind(expenseController)
);

router.get(
  '/pending-approvals',
  hasPermission('expenses.approve'),
  expenseController.getPendingApprovals.bind(expenseController)
);

// Bulk operations
router.post(
  '/submit-multiple',
  expenseController.submitMultipleExpenses.bind(expenseController)
);

router.post(
  '/bulk-approve',
  hasPermission('expenses.approve'),
  expenseController.bulkApprove.bind(expenseController)
);

// Create expense
router.post(
  '/',
  expenseController.createExpense.bind(expenseController)
);

// Get all expenses
router.get(
  '/',
  expenseController.getExpenses.bind(expenseController)
);

// Get expense by ID
router.get(
  '/:id',
  expenseController.getExpenseById.bind(expenseController)
);

// Update expense
router.put(
  '/:id',
  expenseController.updateExpense.bind(expenseController)
);

// Delete expense
router.delete(
  '/:id',
  expenseController.deleteExpense.bind(expenseController)
);

// Submit expense for approval
router.post(
  '/:id/submit',
  expenseController.submitExpense.bind(expenseController)
);

// Approve or reject expense
router.post(
  '/:id/approve',
  hasPermission('expenses.approve'),
  expenseController.approveOrRejectExpense.bind(expenseController)
);

// Mark expense as paid
router.post(
  '/:id/paid',
  hasPermission('expenses.mark_paid'),
  expenseController.markAsPaid.bind(expenseController)
);

// Get expense transaction logs (audit trail)
router.get(
  '/:id/logs',
  expenseController.getExpenseLogs.bind(expenseController)
);

export default router;
