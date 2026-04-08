import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import { razorpayService } from '../integrations/razorpay.service';
import { ApiResponse } from '../utils/apiResponse';
import { validate } from '../middlewares/validate';
import { authenticate, authorize } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { verifyRazorpayWebhook } from '../middlewares/webhookAuth';
import { webhookLimiter } from '../middlewares/rateLimit';

const router = Router();

// Webhook (public, verified by signature)
router.post('/webhook', webhookLimiter, verifyRazorpayWebhook, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const result = await razorpayService.handleWebhook(req.body, signature);
    ApiResponse.success(res, 'Webhook processed', result);
  } catch (error) {
    next(error);
  }
});

// Verify payment (public, for redirect after payment)
router.post(
  '/verify',
  validate([
    body('razorpayOrderId').notEmpty().withMessage('Order ID is required'),
    body('razorpayPaymentId').notEmpty().withMessage('Payment ID is required'),
    body('razorpaySignature').notEmpty().withMessage('Signature is required'),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payment = await razorpayService.verifyPayment({
        razorpayOrderId: req.body.razorpayOrderId,
        razorpayPaymentId: req.body.razorpayPaymentId,
        razorpaySignature: req.body.razorpaySignature,
      });
      ApiResponse.success(res, 'Payment verified successfully', payment);
    } catch (error) {
      next(error);
    }
  }
);

// Protected routes
router.use(authenticate);
router.use(tenantMiddleware);

// ==================== ANALYTICS (must be before /:orderId) ====================

/**
 * Get payment analytics for dashboard
 * GET /api/payments/analytics
 */
router.get(
  '/analytics',
  authorize('admin', 'manager'),
  validate([
    query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365'),
  ]),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const analytics = await razorpayService.getPaymentAnalytics(
        req.organizationId!,
        days
      );

      ApiResponse.success(res, 'Payment analytics retrieved', analytics);
    } catch (error) {
      next(error);
    }
  }
);

// Create payment order
router.post(
  '/create-order',
  authorize('admin', 'counselor'),
  validate([
    body('studentProfileId').isUUID(),
    body('amount').isNumeric().withMessage('Amount must be a number'),
    body('description').optional().trim(),
    body('splits').optional().isArray(),
  ]),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const order = await razorpayService.createOrder({
        organizationId: req.organizationId!,
        studentProfileId: req.body.studentProfileId,
        createdById: req.user!.id,
        amount: parseFloat(req.body.amount),
        description: req.body.description,
        splits: req.body.splits,
      });

      ApiResponse.created(res, 'Payment order created', order);
    } catch (error) {
      next(error);
    }
  }
);

// Create payment link
router.post(
  '/create-link',
  authorize('admin', 'counselor'),
  validate([
    body('studentProfileId').isUUID(),
    body('amount').isNumeric(),
  ]),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const result = await razorpayService.createPaymentLink({
        organizationId: req.organizationId!,
        studentProfileId: req.body.studentProfileId,
        createdById: req.user!.id,
        amount: parseFloat(req.body.amount),
        description: req.body.description,
      });

      ApiResponse.created(res, 'Payment link created', result);
    } catch (error) {
      next(error);
    }
  }
);

// Get payment details
router.get(
  '/:orderId',
  validate([param('orderId').notEmpty().withMessage('Order ID is required')]),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const payment = await razorpayService.getPaymentDetails(
        req.params.orderId,
        req.organizationId! // Pass organizationId for ownership verification
      );
      ApiResponse.success(res, 'Payment details retrieved', payment);
    } catch (error) {
      next(error);
    }
  }
);

// Get payment history for a student
router.get(
  '/student/:studentProfileId',
  validate([param('studentProfileId').isUUID().withMessage('Invalid student profile ID')]),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const payments = await razorpayService.getPaymentHistory(
        req.params.studentProfileId,
        req.organizationId! // Pass organizationId for ownership verification
      );
      ApiResponse.success(res, 'Payment history retrieved', payments);
    } catch (error) {
      next(error);
    }
  }
);

// Get all payments for organization
router.get(
  '/',
  authorize('admin'),
  validate([
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  ]),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const { payments, total } = await razorpayService.getPaymentsByOrganization(
        req.organizationId!,
        page,
        limit
      );

      ApiResponse.paginated(res, 'Payments retrieved', payments, page, limit, total);
    } catch (error) {
      next(error);
    }
  }
);

// ==================== ENHANCED PAYMENT LINKS ====================

/**
 * Create a shareable payment link with notifications
 * POST /api/payments/shareable-link
 */
router.post(
  '/shareable-link',
  authorize('admin', 'manager', 'counselor'),
  validate([
    body('amount').isNumeric().withMessage('Amount must be a number'),
    body('leadId').optional().isUUID().withMessage('Invalid lead ID'),
    body('description').optional().trim().isLength({ max: 500 }),
    body('customerName').optional().trim().isLength({ max: 200 }),
    body('customerEmail').optional().isEmail(),
    body('customerPhone').optional().trim(),
    body('expireBy').optional().isISO8601(),
    body('notifyVia').optional().isArray(),
  ]),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const result = await razorpayService.createShareablePaymentLink({
        organizationId: req.organizationId!,
        amount: parseFloat(req.body.amount),
        leadId: req.body.leadId,
        description: req.body.description,
        customerName: req.body.customerName,
        customerEmail: req.body.customerEmail,
        customerPhone: req.body.customerPhone,
        expireBy: req.body.expireBy ? new Date(req.body.expireBy) : undefined,
        notifyVia: req.body.notifyVia,
      });

      ApiResponse.created(res, 'Payment link created', result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Send payment link during an active call
 * POST /api/payments/send-during-call
 */
router.post(
  '/send-during-call',
  authorize('admin', 'manager'),
  validate([
    body('sessionId').notEmpty().withMessage('Session ID is required'),
    body('amount').isNumeric().withMessage('Amount must be a number'),
    body('description').optional().trim().isLength({ max: 500 }),
  ]),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const result = await razorpayService.sendPaymentLinkDuringCall({
        sessionId: req.body.sessionId,
        amount: parseFloat(req.body.amount),
        description: req.body.description,
        organizationId: req.organizationId!,
      });

      if (result.success) {
        ApiResponse.success(res, result.message, { shortUrl: result.shortUrl });
      } else {
        ApiResponse.error(res, result.message, 400);
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get payment link status
 * GET /api/payments/link/:paymentLinkId/status
 */
router.get(
  '/link/:paymentLinkId/status',
  validate([param('paymentLinkId').notEmpty()]),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const status = await razorpayService.getPaymentLinkStatus(req.params.paymentLinkId);
      ApiResponse.success(res, 'Payment link status retrieved', status);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Cancel a payment link
 * DELETE /api/payments/link/:paymentLinkId
 */
router.delete(
  '/link/:paymentLinkId',
  authorize('admin', 'manager'),
  validate([param('paymentLinkId').notEmpty()]),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const result = await razorpayService.cancelPaymentLink(
        req.params.paymentLinkId,
        req.organizationId!
      );
      ApiResponse.success(res, result.message);
    } catch (error) {
      next(error);
    }
  }
);

// ==================== SUBSCRIPTIONS ====================

/**
 * Create a subscription/recurring payment plan
 * POST /api/payments/subscription
 */
router.post(
  '/subscription',
  authorize('admin', 'manager', 'counselor'),
  validate([
    body('planName').trim().notEmpty().withMessage('Plan name is required'),
    body('totalAmount').isNumeric().withMessage('Total amount must be a number'),
    body('installments').isInt({ min: 2, max: 36 }).withMessage('Installments must be between 2 and 36'),
    body('leadId').optional().isUUID(),
    body('studentProfileId').optional().isUUID(),
    body('startDate').optional().isISO8601(),
    body('interval').optional().isIn(['daily', 'weekly', 'monthly']),
    body('customerName').optional().trim().isLength({ max: 200 }),
    body('customerEmail').optional().isEmail(),
    body('customerPhone').optional().trim(),
  ]),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const result = await razorpayService.createSubscription({
        organizationId: req.organizationId!,
        leadId: req.body.leadId,
        studentProfileId: req.body.studentProfileId,
        planName: req.body.planName,
        totalAmount: parseFloat(req.body.totalAmount),
        installments: parseInt(req.body.installments),
        startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
        interval: req.body.interval,
        customerName: req.body.customerName,
        customerEmail: req.body.customerEmail,
        customerPhone: req.body.customerPhone,
      });

      ApiResponse.created(res, 'Subscription created', result);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
