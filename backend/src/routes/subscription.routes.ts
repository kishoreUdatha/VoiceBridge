import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, authorize, AuthenticatedRequest } from '../middlewares/auth';
import { tenantMiddleware } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import subscriptionService, { PLANS, ADD_ONS } from '../services/subscription.service';

// Async handler wrapper
const asyncHandler = (fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<any>) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

const router = Router();

// Get all plans (public)
router.get(
  '/plans',
  (req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        plans: Object.values(PLANS),
        addOns: ADD_ONS,
      },
    });
  }
);

// Get current subscription
router.get(
  '/current',
  authenticate,
  tenantMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const subscription = await subscriptionService.getSubscription(req.user!.organizationId);

    res.json({
      success: true,
      data: subscription,
    });
  })
);

// Get usage statistics
router.get(
  '/usage',
  authenticate,
  tenantMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const usage = await subscriptionService.getUsage(req.user!.organizationId);

    res.json({
      success: true,
      data: usage,
    });
  })
);

// Create subscription (checkout)
router.post(
  '/create',
  authenticate,
  tenantMiddleware,
  authorize('admin'),
  validate([
    body('planId').isIn(['free', 'starter', 'growth', 'business', 'enterprise']),
    body('billingCycle').isIn(['monthly', 'annual']),
    body('userCount').isInt({ min: 1 }),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { planId, billingCycle, userCount } = req.body;

    const result = await subscriptionService.createSubscription(
      req.user!.organizationId,
      planId,
      billingCycle,
      userCount
    );

    res.json({
      success: true,
      data: result,
    });
  })
);

// Verify payment
router.post(
  '/verify',
  authenticate,
  tenantMiddleware,
  validate([
    body('razorpayOrderId').notEmpty(),
    body('razorpayPaymentId').notEmpty(),
    body('razorpaySignature').notEmpty(),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    const subscription = await subscriptionService.verifyPayment(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    res.json({
      success: true,
      data: subscription,
      message: 'Payment verified and subscription activated',
    });
  })
);

// Upgrade plan
router.post(
  '/upgrade',
  authenticate,
  tenantMiddleware,
  authorize('admin'),
  validate([
    body('planId').isIn(['free', 'starter', 'growth', 'business', 'enterprise']),
    body('billingCycle').isIn(['monthly', 'annual']),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { planId, billingCycle } = req.body;

    const result = await subscriptionService.upgradePlan(
      req.user!.organizationId,
      planId,
      billingCycle
    );

    res.json({
      success: true,
      data: result,
    });
  })
);

// Downgrade plan
router.post(
  '/downgrade',
  authenticate,
  tenantMiddleware,
  authorize('admin'),
  validate([
    body('planId').isIn(['free', 'starter', 'growth', 'business']),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { planId } = req.body;

    const result = await subscriptionService.downgradePlan(
      req.user!.organizationId,
      planId
    );

    res.json({
      success: true,
      data: result,
    });
  })
);

// Cancel subscription
router.post(
  '/cancel',
  authenticate,
  tenantMiddleware,
  authorize('admin'),
  validate([
    body('reason').optional().isString(),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { reason } = req.body;

    const result = await subscriptionService.cancelSubscription(
      req.user!.organizationId,
      reason
    );

    res.json({
      success: true,
      data: result,
    });
  })
);

// Reactivate subscription
router.post(
  '/reactivate',
  authenticate,
  tenantMiddleware,
  authorize('admin'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await subscriptionService.reactivateSubscription(
      req.user!.organizationId
    );

    res.json({
      success: true,
      data: result,
    });
  })
);

// Get billing history
router.get(
  '/billing-history',
  authenticate,
  tenantMiddleware,
  authorize('admin'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const history = await subscriptionService.getBillingHistory(req.user!.organizationId);

    res.json({
      success: true,
      data: history,
    });
  })
);

// Generate invoice
router.get(
  '/invoice/:subscriptionId',
  authenticate,
  tenantMiddleware,
  authorize('admin'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const invoice = await subscriptionService.generateInvoice(req.params.subscriptionId);

    res.json({
      success: true,
      data: invoice,
    });
  })
);

// Add users
router.post(
  '/add-users',
  authenticate,
  tenantMiddleware,
  authorize('admin'),
  validate([
    body('additionalUsers').isInt({ min: 1 }),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { additionalUsers } = req.body;

    const result = await subscriptionService.addUsers(
      req.user!.organizationId,
      additionalUsers
    );

    res.json({
      success: true,
      data: result,
    });
  })
);

// Purchase add-on (voice minutes, SMS, WhatsApp, phone numbers, voice agents, etc.)
router.post(
  '/add-on',
  authenticate,
  tenantMiddleware,
  authorize('admin'),
  validate([
    body('addOnType').isIn(['voiceMinutes', 'aiCalls', 'sms', 'whatsapp', 'storage', 'leads', 'phoneNumbers', 'voiceAgents', 'users']),
    body('quantity').isInt({ min: 1 }),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { addOnType, quantity } = req.body;

    const result = await subscriptionService.purchaseAddOn(
      req.user!.organizationId,
      addOnType,
      quantity
    );

    res.json({
      success: true,
      data: result,
    });
  })
);

// Verify add-on payment
router.post(
  '/add-on/verify',
  authenticate,
  tenantMiddleware,
  validate([
    body('razorpayOrderId').notEmpty(),
    body('razorpayPaymentId').notEmpty(),
    body('razorpaySignature').notEmpty(),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    const result = await subscriptionService.verifyAddOnPayment(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    res.json({
      success: true,
      data: result,
    });
  })
);

// Razorpay webhook handler
router.post(
  '/webhook',
  async (req: Request, res: Response) => {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'] as string;

    // Verify webhook signature if secret is configured
    if (webhookSecret && signature) {
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (signature !== expectedSignature) {
        return res.status(400).json({ error: 'Invalid webhook signature' });
      }
    }

    const event = req.body;

    switch (event.event) {
      case 'payment.captured':
        console.log('Payment captured:', event.payload.payment.entity.id);
        break;

      case 'payment.failed':
        console.log('Payment failed:', event.payload.payment.entity.id);
        break;

      case 'subscription.charged':
        console.log('Subscription charged:', event.payload.subscription.entity.id);
        break;

      case 'subscription.cancelled':
        console.log('Subscription cancelled:', event.payload.subscription.entity.id);
        break;

      default:
        console.log('Unhandled webhook event:', event.event);
    }

    res.json({ received: true });
  }
);

export default router;
