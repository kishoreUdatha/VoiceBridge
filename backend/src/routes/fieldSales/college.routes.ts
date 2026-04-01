import { Router } from 'express';
import { collegeController } from '../../controllers/fieldSales';
import { authenticate, authorize } from '../../middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Static routes (before :id routes to avoid conflict)
router.get(
  '/stats',
  collegeController.getCollegeStats.bind(collegeController)
);

router.get(
  '/cities',
  collegeController.getCities.bind(collegeController)
);

router.get(
  '/states',
  collegeController.getStates.bind(collegeController)
);

// Create college
router.post(
  '/',
  collegeController.createCollege.bind(collegeController)
);

// Get all colleges
router.get(
  '/',
  collegeController.getColleges.bind(collegeController)
);

// Get college by ID
router.get(
  '/:id',
  collegeController.getCollegeById.bind(collegeController)
);

// Update college
router.put(
  '/:id',
  collegeController.updateCollege.bind(collegeController)
);

// Delete college
router.delete(
  '/:id',
  authorize(['admin', 'manager', 'owner']),
  collegeController.deleteCollege.bind(collegeController)
);

// Reassign college
router.post(
  '/:id/reassign',
  authorize(['admin', 'manager', 'owner']),
  collegeController.reassignCollege.bind(collegeController)
);

// Contact routes
router.post(
  '/:id/contacts',
  collegeController.addContact.bind(collegeController)
);

router.get(
  '/:id/contacts',
  collegeController.getContacts.bind(collegeController)
);

router.put(
  '/:collegeId/contacts/:contactId',
  collegeController.updateContact.bind(collegeController)
);

router.delete(
  '/:collegeId/contacts/:contactId',
  collegeController.deleteContact.bind(collegeController)
);

export default router;
