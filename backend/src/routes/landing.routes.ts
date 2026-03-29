import { Router } from 'express';
import { landingPageController } from '../controllers/landing.controller';
import { authenticate, authorize } from '../middlewares/auth';
import { tenantMiddleware } from '../middlewares/tenant';

const router = Router();

// Public route - view published landing page
router.get('/public/:orgSlug/:pageSlug', landingPageController.getPublic);

// Protected routes require authentication and tenant context
router.use(authenticate);
router.use(tenantMiddleware);

// Get all landing pages for organization
router.get('/', landingPageController.getAll);

// Get single landing page
router.get('/:id', landingPageController.getById);

// Create landing page (admin only)
router.post('/', authorize('landing_pages:create'), landingPageController.create);

// Update landing page
router.put('/:id', authorize('landing_pages:update'), landingPageController.update);

// Delete landing page
router.delete('/:id', authorize('landing_pages:delete'), landingPageController.delete);

// Publish/Unpublish
router.post('/:id/publish', authorize('landing_pages:update'), landingPageController.publish);
router.post('/:id/unpublish', authorize('landing_pages:update'), landingPageController.unpublish);

export default router;
