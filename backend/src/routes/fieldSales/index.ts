import { Router } from 'express';
import collegeRoutes from './college.routes';
import visitRoutes from './visit.routes';
import dealRoutes from './deal.routes';
import expenseRoutes from './expense.routes';

const router = Router();

// Field Sales sub-routes
router.use('/colleges', collegeRoutes);
router.use('/visits', visitRoutes);
router.use('/deals', dealRoutes);
router.use('/expenses', expenseRoutes);

export default router;
