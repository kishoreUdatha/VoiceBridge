import { Router, Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, authorize, AuthenticatedRequest } from '../middlewares/auth';
import { tenantMiddleware } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import { phoneNumberService } from '../services/phone-number.service';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticate);
router.use(tenantMiddleware);

// Async handler wrapper
const asyncHandler = (fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<any>) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// Get all phone numbers
router.get(
  '/',
  authorize('admin', 'manager'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { status, type, agentId, unassigned } = req.query;

    const phoneNumbers = await phoneNumberService.getPhoneNumbers(
      req.user!.organizationId,
      {
        status: status as any,
        type: type as any,
        assignedToAgentId: agentId as string,
        unassigned: unassigned === 'true',
      }
    );

    res.json({
      success: true,
      data: phoneNumbers,
    });
  })
);

// Get phone number stats
router.get(
  '/stats',
  authorize('admin', 'manager'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const stats = await phoneNumberService.getPhoneNumberStats(req.user!.organizationId);

    res.json({
      success: true,
      data: stats,
    });
  })
);

// Get a single phone number
router.get(
  '/:id',
  authorize('admin', 'manager'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const phoneNumber = await phoneNumberService.getPhoneNumber(
      req.params.id,
      req.user!.organizationId
    );

    res.json({
      success: true,
      data: phoneNumber,
    });
  })
);

// Create a new phone number
router.post(
  '/',
  authorize('admin'),
  validate([
    body('number')
      .notEmpty()
      .withMessage('Phone number is required')
      .matches(/^[\d\s+()-]+$/)
      .withMessage('Invalid phone number format'),
    body('friendlyName')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Friendly name must be less than 100 characters'),
    body('provider')
      .optional()
      .isIn(['EXOTEL', 'TWILIO', 'PLIVO', 'MSG91', 'MANUAL'])
      .withMessage('Invalid provider'),
    body('type')
      .optional()
      .isIn(['LOCAL', 'TOLL_FREE', 'MOBILE', 'VIRTUAL'])
      .withMessage('Invalid phone number type'),
    body('monthlyRent')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Monthly rent must be a positive number'),
    body('perMinuteRate')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Per minute rate must be a positive number'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const phoneNumber = await phoneNumberService.createPhoneNumber({
      organizationId: req.user!.organizationId,
      number: req.body.number,
      displayNumber: req.body.displayNumber,
      friendlyName: req.body.friendlyName,
      provider: req.body.provider,
      providerNumberId: req.body.providerNumberId,
      type: req.body.type,
      capabilities: req.body.capabilities,
      monthlyRent: req.body.monthlyRent,
      perMinuteRate: req.body.perMinuteRate,
      currency: req.body.currency,
      region: req.body.region,
      city: req.body.city,
      notes: req.body.notes,
    });

    res.status(201).json({
      success: true,
      data: phoneNumber,
      message: 'Phone number created successfully',
    });
  })
);

// Update a phone number
router.put(
  '/:id',
  authorize('admin'),
  validate([
    body('friendlyName')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Friendly name must be less than 100 characters'),
    body('type')
      .optional()
      .isIn(['LOCAL', 'TOLL_FREE', 'MOBILE', 'VIRTUAL'])
      .withMessage('Invalid phone number type'),
    body('status')
      .optional()
      .isIn(['AVAILABLE', 'ASSIGNED', 'DISABLED', 'PENDING'])
      .withMessage('Invalid status'),
    body('monthlyRent')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Monthly rent must be a positive number'),
    body('perMinuteRate')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Per minute rate must be a positive number'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const phoneNumber = await phoneNumberService.updatePhoneNumber(
      req.params.id,
      req.user!.organizationId,
      req.body
    );

    res.json({
      success: true,
      data: phoneNumber,
      message: 'Phone number updated successfully',
    });
  })
);

// Delete a phone number
router.delete(
  '/:id',
  authorize('admin'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await phoneNumberService.deletePhoneNumber(
      req.params.id,
      req.user!.organizationId
    );

    res.json({
      success: true,
      message: 'Phone number deleted successfully',
    });
  })
);

// Assign phone number to agent
router.post(
  '/:id/assign',
  authorize('admin', 'manager'),
  validate([
    body('agentId')
      .notEmpty()
      .withMessage('Agent ID is required')
      .isUUID()
      .withMessage('Invalid agent ID'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const phoneNumber = await phoneNumberService.assignToAgent(
      req.params.id,
      req.body.agentId,
      req.user!.organizationId
    );

    res.json({
      success: true,
      data: phoneNumber,
      message: 'Phone number assigned successfully',
    });
  })
);

// Unassign phone number from agent
router.post(
  '/:id/unassign',
  authorize('admin', 'manager'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const phoneNumber = await phoneNumberService.unassignFromAgent(
      req.params.id,
      req.user!.organizationId
    );

    res.json({
      success: true,
      data: phoneNumber,
      message: 'Phone number unassigned successfully',
    });
  })
);

// Get phone numbers for a specific agent
router.get(
  '/agent/:agentId',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const phoneNumbers = await phoneNumberService.getAgentPhoneNumbers(
      req.params.agentId,
      req.user!.organizationId
    );

    res.json({
      success: true,
      data: phoneNumbers,
    });
  })
);

// Bulk import phone numbers
router.post(
  '/bulk-import',
  authorize('admin'),
  validate([
    body('numbers')
      .isArray({ min: 1, max: 100 })
      .withMessage('Numbers must be an array with 1-100 items'),
    body('numbers.*.number')
      .notEmpty()
      .withMessage('Each number must have a phone number'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const results = await phoneNumberService.bulkImport(
      req.user!.organizationId,
      req.body.numbers
    );

    res.json({
      success: true,
      data: results,
      message: `Imported ${results.success} phone numbers successfully`,
    });
  })
);

export default router;
