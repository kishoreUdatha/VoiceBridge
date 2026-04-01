import { Router } from 'express';
import { dealController } from '../../controllers/fieldSales';
import { authenticate, authorize } from '../../middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Static routes (before :id routes to avoid conflict)
router.get(
  '/pipeline',
  dealController.getPipeline.bind(dealController)
);

router.get(
  '/stats',
  dealController.getDealStats.bind(dealController)
);

router.get(
  '/recent-wins',
  dealController.getRecentWins.bind(dealController)
);

router.get(
  '/college/:collegeId',
  dealController.getDealByCollegeId.bind(dealController)
);

// Create deal
router.post(
  '/',
  dealController.createDeal.bind(dealController)
);

// Get all deals
router.get(
  '/',
  dealController.getDeals.bind(dealController)
);

// Get deal by ID
router.get(
  '/:id',
  dealController.getDealById.bind(dealController)
);

// Update deal
router.put(
  '/:id',
  dealController.updateDeal.bind(dealController)
);

// Delete deal
router.delete(
  '/:id',
  authorize(['admin', 'manager', 'owner']),
  dealController.deleteDeal.bind(dealController)
);

// Update deal stage
router.post(
  '/:id/stage',
  dealController.updateStage.bind(dealController)
);

export default router;
