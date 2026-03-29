import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { contactListService } from '../services/contact-list.service';
import { authenticate, authorize } from '../middlewares/auth';
import { tenantMiddleware } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errors';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticate);
router.use(tenantMiddleware);

/**
 * @api {get} /contact-lists List Contact Lists
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { type, search, page = '1', limit = '20' } = req.query;

    const result = await contactListService.getLists(organizationId, {
      type: type as any,
      search: search as string,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });

    res.json({ success: true, ...result });
  })
);

/**
 * @api {post} /contact-lists Create Contact List
 */
router.post(
  '/',
  validate([
    body('name').trim().notEmpty().withMessage('Name is required')
      .isLength({ max: 200 }).withMessage('Name too long'),
    body('description').optional().trim().isLength({ max: 2000 }).withMessage('Description too long'),
    body('type').optional().isIn(['STATIC', 'DYNAMIC']),
    body('tags').optional().isArray({ max: 50 }).withMessage('Too many tags'),
  ]),
  asyncHandler(async (req, res) => {
    const { organizationId, id: userId } = req.user!;
    const { name, description, type, filterCriteria, tags } = req.body;

    const list = await contactListService.createList({
      organizationId,
      name,
      description,
      type,
      filterCriteria,
      tags,
      createdById: userId,
    });

    res.status(201).json({
      success: true,
      message: 'Contact list created',
      data: list,
    });
  })
);

/**
 * @api {get} /contact-lists/:id Get Contact List
 */
router.get(
  '/:id',
  validate([param('id').isUUID().withMessage('Invalid list ID')]),
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const list = await contactListService.getListById(req.params.id, organizationId);

    res.json({ success: true, data: list });
  })
);

/**
 * @api {put} /contact-lists/:id Update Contact List
 */
router.put(
  '/:id',
  validate([
    param('id').isUUID().withMessage('Invalid list ID'),
    body('name').optional().trim().notEmpty().isLength({ max: 200 }).withMessage('Name too long'),
    body('description').optional().trim().isLength({ max: 2000 }).withMessage('Description too long'),
    body('tags').optional().isArray({ max: 50 }).withMessage('Too many tags'),
    body('isActive').optional().isBoolean(),
  ]),
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { name, description, filterCriteria, tags, isActive } = req.body;

    const list = await contactListService.updateList(req.params.id, organizationId, {
      name,
      description,
      filterCriteria,
      tags,
      isActive,
    });

    res.json({
      success: true,
      message: 'Contact list updated',
      data: list,
    });
  })
);

/**
 * @api {delete} /contact-lists/:id Delete Contact List
 */
router.delete(
  '/:id',
  authorize('admin', 'manager'),
  validate([param('id').isUUID().withMessage('Invalid list ID')]),
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    await contactListService.deleteList(req.params.id, organizationId);

    res.json({ success: true, message: 'Contact list deleted' });
  })
);

/**
 * @api {get} /contact-lists/:id/stats Get List Stats
 */
router.get(
  '/:id/stats',
  validate([param('id').isUUID().withMessage('Invalid list ID')]),
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const stats = await contactListService.getListStats(req.params.id, organizationId);

    res.json({ success: true, data: stats });
  })
);

/**
 * @api {get} /contact-lists/:id/contacts Get Contacts in List
 */
router.get(
  '/:id/contacts',
  validate([
    param('id').isUUID().withMessage('Invalid list ID'),
    query('page').optional().isInt({ min: 1, max: 1000 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().trim().isLength({ max: 200 }),
  ]),
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { status, search, page = '1', limit = '50' } = req.query;

    const result = await contactListService.getContacts(req.params.id, organizationId, {
      status: status as any,
      search: search as string,
      page: parseInt(page as string),
      limit: Math.min(parseInt(limit as string), 100),
    });

    res.json({ success: true, ...result });
  })
);

/**
 * @api {post} /contact-lists/:id/contacts Add Contact to List
 */
router.post(
  '/:id/contacts',
  validate([
    param('id').isUUID().withMessage('Invalid list ID'),
    body('leadId').optional().isUUID().withMessage('Invalid lead ID'),
    body('email').optional().isEmail().withMessage('Invalid email'),
    body('phone').optional().matches(/^[\d+\-() ]{7,20}$/).withMessage('Invalid phone number'),
    body('firstName').optional().trim().isLength({ max: 100 }),
    body('lastName').optional().trim().isLength({ max: 100 }),
  ]),
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { leadId, email, phone, firstName, lastName, customFields } = req.body;

    if (!leadId && !email && !phone) {
      throw new AppError('leadId, email, or phone is required', 400);
    }

    // SECURITY: Verify list belongs to user's organization
    const list = await contactListService.getListById(req.params.id, organizationId);
    if (!list) {
      throw new AppError('List not found', 404);
    }

    const contact = await contactListService.addContact({
      listId: req.params.id,
      leadId,
      email,
      phone,
      firstName,
      lastName,
      customFields,
    });

    res.status(201).json({
      success: true,
      message: 'Contact added to list',
      data: contact,
    });
  })
);

/**
 * @api {post} /contact-lists/:id/contacts/bulk Bulk Add Contacts
 */
router.post(
  '/:id/contacts/bulk',
  validate([
    param('id').isUUID().withMessage('Invalid list ID'),
    body('contacts').isArray({ min: 1, max: 1000 }).withMessage('Contacts array (1-1000) is required'),
  ]),
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { contacts } = req.body;

    // SECURITY: Verify list belongs to user's organization
    const list = await contactListService.getListById(req.params.id, organizationId);
    if (!list) {
      throw new AppError('List not found', 404);
    }

    const result = await contactListService.addContacts({
      listId: req.params.id,
      contacts,
    });

    res.json({
      success: true,
      message: `Added ${result.added} contacts, skipped ${result.skipped}`,
      data: result,
    });
  })
);

/**
 * @api {put} /contact-lists/:id/contacts/:contactId Update Contact
 */
router.put(
  '/:id/contacts/:contactId',
  validate([
    param('id').isUUID().withMessage('Invalid list ID'),
    param('contactId').isUUID().withMessage('Invalid contact ID'),
    body('firstName').optional().trim().isLength({ max: 100 }),
    body('lastName').optional().trim().isLength({ max: 100 }),
    body('status').optional().isIn(['ACTIVE', 'UNSUBSCRIBED', 'BOUNCED', 'INVALID']),
  ]),
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { status, firstName, lastName, customFields } = req.body;

    const contact = await contactListService.updateContact(
      req.params.contactId,
      req.params.id,
      organizationId,
      { status, firstName, lastName, customFields }
    );

    res.json({
      success: true,
      message: 'Contact updated',
      data: contact,
    });
  })
);

/**
 * @api {delete} /contact-lists/:id/contacts/:contactId Remove Contact
 */
router.delete(
  '/:id/contacts/:contactId',
  validate([
    param('id').isUUID().withMessage('Invalid list ID'),
    param('contactId').isUUID().withMessage('Invalid contact ID'),
  ]),
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    await contactListService.removeContact(req.params.contactId, req.params.id, organizationId);

    res.json({ success: true, message: 'Contact removed from list' });
  })
);

/**
 * @api {post} /contact-lists/:id/contacts/bulk-remove Bulk Remove Contacts
 */
router.post(
  '/:id/contacts/bulk-remove',
  validate([
    param('id').isUUID().withMessage('Invalid list ID'),
    body('contactIds').isArray({ min: 1, max: 1000 }).withMessage('contactIds array (1-1000) is required'),
    body('contactIds.*').isUUID().withMessage('Invalid contact ID in array'),
  ]),
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { contactIds } = req.body;

    const result = await contactListService.removeContacts(req.params.id, organizationId, contactIds);

    res.json({
      success: true,
      message: `Removed ${result.removed} contacts`,
      data: result,
    });
  })
);

/**
 * @api {post} /contact-lists/:id/unsubscribe Unsubscribe Contact
 */
router.post(
  '/:id/unsubscribe',
  validate([
    param('id').isUUID().withMessage('Invalid list ID'),
    body('email').isEmail().withMessage('Valid email is required'),
  ]),
  asyncHandler(async (req, res) => {
    const { email } = req.body;

    await contactListService.unsubscribeContact(req.params.id, email);

    res.json({ success: true, message: 'Contact unsubscribed' });
  })
);

/**
 * @api {get} /contact-lists/:id/export Export Contacts
 */
router.get(
  '/:id/export',
  validate([param('id').isUUID().withMessage('Invalid list ID')]),
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const contacts = await contactListService.exportContacts(req.params.id, organizationId);

    res.json({
      success: true,
      data: contacts,
      count: contacts.length,
    });
  })
);

export default router;
