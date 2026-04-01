import { Router } from 'express';
import { visitController } from '../../controllers/fieldSales';
import { authenticate, authorize } from '../../middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Static routes (before :id routes to avoid conflict)
router.get(
  '/open',
  visitController.getOpenVisit.bind(visitController)
);

router.get(
  '/stats',
  visitController.getVisitStats.bind(visitController)
);

router.get(
  '/today',
  visitController.getTodaySchedule.bind(visitController)
);

// Check-in route
router.post(
  '/check-in',
  visitController.checkIn.bind(visitController)
);

// Create visit manually
router.post(
  '/',
  visitController.createVisit.bind(visitController)
);

// Get all visits
router.get(
  '/',
  visitController.getVisits.bind(visitController)
);

// Get visit by ID
router.get(
  '/:id',
  visitController.getVisitById.bind(visitController)
);

// Update visit
router.put(
  '/:id',
  visitController.updateVisit.bind(visitController)
);

// Delete visit
router.delete(
  '/:id',
  authorize(['admin', 'manager', 'owner']),
  visitController.deleteVisit.bind(visitController)
);

// Check-out route
router.post(
  '/:id/check-out',
  visitController.checkOut.bind(visitController)
);

export default router;
