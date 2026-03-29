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

export default router;
