import { Router } from 'express';
import { query } from 'express-validator';
import { profitController } from '../controllers/profit.controller';
import { authenticate, authorize } from '../middlewares/auth';
import { tenantMiddleware } from '../middlewares/tenant';

const router = Router();

router.use(authenticate);
router.use(tenantMiddleware);

// All profit routes are for admin/manager only
router.use(authorize('admin', 'manager'));

// Get profit dashboard
router.get(
  '/dashboard',
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
  profitController.getDashboard.bind(profitController)
);

// Get profit by university
router.get(
  '/by-university',
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
  profitController.getByUniversity.bind(profitController)
);

// Get monthly profit trend
router.get(
  '/by-month',
  query('months').optional().isInt({ min: 1, max: 24 }),
  profitController.getMonthlyTrend.bind(profitController)
);

// Get profit by user
router.get(
  '/by-user',
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
  profitController.getByUser.bind(profitController)
);

// Get top universities
router.get(
  '/top-universities',
  query('limit').optional().isInt({ min: 1, max: 20 }),
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
  profitController.getTopUniversities.bind(profitController)
);

export default router;
