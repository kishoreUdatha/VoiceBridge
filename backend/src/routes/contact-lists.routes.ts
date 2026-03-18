import { Router } from 'express';
import { contactListService } from '../services/contact-list.service';
import { authenticate } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errors';

const router = Router();

// All routes require authentication
router.use(authenticate);

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
  asyncHandler(async (req, res) => {
    const { organizationId, id: userId } = req.user!;
    const { name, description, type, filterCriteria, tags } = req.body;

    if (!name) {
      throw new AppError('Name is required', 400);
    }

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
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { status, search, page = '1', limit = '50' } = req.query;

    const result = await contactListService.getContacts(req.params.id, organizationId, {
      status: status as any,
      search: search as string,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });

    res.json({ success: true, ...result });
  })
);

/**
 * @api {post} /contact-lists/:id/contacts Add Contact to List
 */
router.post(
  '/:id/contacts',
  asyncHandler(async (req, res) => {
    const { leadId, email, phone, firstName, lastName, customFields } = req.body;

    if (!leadId && !email && !phone) {
      throw new AppError('leadId, email, or phone is required', 400);
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
  asyncHandler(async (req, res) => {
    const { contacts } = req.body;

    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      throw new AppError('Contacts array is required', 400);
    }

    if (contacts.length > 1000) {
      throw new AppError('Maximum 1000 contacts per request', 400);
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
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { contactIds } = req.body;

    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      throw new AppError('contactIds array is required', 400);
    }

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
  asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
      throw new AppError('Email is required', 400);
    }

    await contactListService.unsubscribeContact(req.params.id, email);

    res.json({ success: true, message: 'Contact unsubscribed' });
  })
);

/**
 * @api {get} /contact-lists/:id/export Export Contacts
 */
router.get(
  '/:id/export',
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
