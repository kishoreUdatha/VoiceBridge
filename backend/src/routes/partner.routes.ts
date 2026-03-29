import { Router } from 'express';
import { body, param, query } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { partnerService } from '../services/partner.service';
import { authenticate, authorize } from '../middlewares/auth';
import { tenantMiddleware } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errors';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticate);
router.use(tenantMiddleware);

// Rate limiter for payout requests
const payoutLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 payout requests per hour
  message: { success: false, message: 'Too many payout requests' },
});

// Validation rules
const applyPartnershipValidation = [
  body('companyName').optional().trim().isLength({ max: 200 }).withMessage('Company name too long'),
  body('contactEmail').optional().trim().isEmail().withMessage('Invalid email'),
  body('contactPhone').optional().trim().matches(/^[\d+\-() ]{7,20}$/).withMessage('Invalid phone'),
  body('website').optional().trim().isURL().withMessage('Invalid website URL'),
  body('description').optional().trim().isLength({ max: 2000 }).withMessage('Description too long'),
];

const updateProfileValidation = [
  body('companyName').optional().trim().isLength({ max: 200 }).withMessage('Company name too long'),
  body('contactEmail').optional().trim().isEmail().withMessage('Invalid email'),
  body('contactPhone').optional().trim().matches(/^[\d+\-() ]{7,20}$/).withMessage('Invalid phone'),
  body('website').optional().trim().isURL().withMessage('Invalid website URL'),
  body('description').optional().trim().isLength({ max: 2000 }).withMessage('Description too long'),
];

const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
];

const bankDetailsValidation = [
  body('bankName').trim().notEmpty().withMessage('Bank name is required')
    .isLength({ max: 100 }).withMessage('Bank name too long'),
  body('accountNumber').trim().notEmpty().withMessage('Account number is required')
    .isLength({ max: 50 }).withMessage('Account number too long'),
  body('ifscCode').optional().trim().isLength({ max: 20 }).withMessage('Invalid IFSC code'),
  body('accountHolderName').trim().notEmpty().withMessage('Account holder name is required')
    .isLength({ max: 100 }).withMessage('Account holder name too long'),
];

// Apply for partnership
router.post(
  '/apply',
  validate(applyPartnershipValidation),
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { companyName, contactEmail, contactPhone, website, description } = req.body;

    const partner = await partnerService.applyForPartnership({
      organizationId,
      companyName,
      contactEmail,
      contactPhone,
      website,
      description,
    });

    res.status(201).json({
      success: true,
      message: 'Partnership application submitted successfully',
      data: partner,
    });
  })
);

// Get current partner profile
router.get(
  '/profile',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;

    const partner = await partnerService.getPartnerByOrgId(organizationId);

    if (!partner) {
      throw new AppError('Partner profile not found', 404);
    }

    res.json({
      success: true,
      data: partner,
    });
  })
);

// Update partner profile
router.put(
  '/profile',
  validate(updateProfileValidation),
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { companyName, contactEmail, contactPhone, website, description } = req.body;

    const partner = await partnerService.getPartnerByOrgId(organizationId);

    if (!partner) {
      throw new AppError('Partner profile not found', 404);
    }

    const updated = await partnerService.updatePartner(partner.id, {
      companyName,
      contactEmail,
      contactPhone,
      website,
      description,
    });

    res.json({
      success: true,
      message: 'Partner profile updated',
      data: updated,
    });
  })
);

// Get partner dashboard
router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;

    const partner = await partnerService.getPartnerByOrgId(organizationId);

    if (!partner) {
      // Return default dashboard for non-partners
      return res.json({
        success: true,
        data: {
          isPartner: false,
          status: 'not_enrolled',
          message: 'You are not enrolled in the partner program. Apply to become a partner.',
          stats: {
            totalCustomers: 0,
            activeCustomers: 0,
            totalRevenue: 0,
            pendingCommissions: 0,
            paidCommissions: 0,
          },
          benefits: [
            { name: 'Revenue Share', description: 'Earn up to 30% commission on referrals' },
            { name: 'Priority Support', description: 'Get dedicated partner support' },
            { name: 'Co-Marketing', description: 'Access to marketing materials and co-branding' },
            { name: 'Early Access', description: 'Be first to try new features' },
          ],
        },
      });
    }

    const dashboard = await partnerService.getPartnerDashboard(partner.id);

    res.json({
      success: true,
      data: { ...dashboard, isPartner: true },
    });
  })
);

// Get partner customers
router.get(
  '/customers',
  validate([
    ...paginationValidation,
    query('status').optional().isIn(['active', 'inactive', 'pending']).withMessage('Invalid status'),
  ]),
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { status, page, limit } = req.query;

    const partner = await partnerService.getPartnerByOrgId(organizationId);

    if (!partner) {
      throw new AppError('Partner profile not found', 404);
    }

    const result = await partnerService.getPartnerCustomers(partner.id, {
      status: status as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({
      success: true,
      data: result.customers,
      pagination: result.pagination,
    });
  })
);

// Add customer
router.post(
  '/customers',
  validate([
    body('customerOrgId').isUUID().withMessage('Invalid customer organization ID'),
    body('planId').optional().isUUID().withMessage('Invalid plan ID'),
  ]),
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { customerOrgId, planId } = req.body;

    const partner = await partnerService.getPartnerByOrgId(organizationId);

    if (!partner) {
      throw new AppError('Partner profile not found', 404);
    }

    const customer = await partnerService.addCustomer(partner.id, customerOrgId, planId);

    res.status(201).json({
      success: true,
      message: 'Customer added successfully',
      data: customer,
    });
  })
);

// Remove customer
router.delete(
  '/customers/:customerOrgId',
  validate([
    param('customerOrgId').isUUID().withMessage('Invalid customer organization ID'),
  ]),
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { customerOrgId } = req.params;

    const partner = await partnerService.getPartnerByOrgId(organizationId);

    if (!partner) {
      throw new AppError('Partner profile not found', 404);
    }

    await partnerService.removeCustomer(partner.id, customerOrgId);

    res.json({
      success: true,
      message: 'Customer removed',
    });
  })
);

// Get commissions
router.get(
  '/commissions',
  validate([
    ...paginationValidation,
    query('status').optional().isIn(['pending', 'approved', 'paid', 'rejected']).withMessage('Invalid status'),
    query('startDate').optional().isISO8601().withMessage('Invalid start date'),
    query('endDate').optional().isISO8601().withMessage('Invalid end date'),
  ]),
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { status, startDate, endDate, page, limit } = req.query;

    const partner = await partnerService.getPartnerByOrgId(organizationId);

    if (!partner) {
      throw new AppError('Partner profile not found', 404);
    }

    const result = await partnerService.getPartnerCommissions(partner.id, {
      status: status as any,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({
      success: true,
      data: result.commissions,
      stats: result.stats,
      pagination: result.pagination,
    });
  })
);

// Get payouts
router.get(
  '/payouts',
  validate([
    ...paginationValidation,
    query('status').optional().isIn(['pending', 'processing', 'completed', 'failed']).withMessage('Invalid status'),
  ]),
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { status, page, limit } = req.query;

    const partner = await partnerService.getPartnerByOrgId(organizationId);

    if (!partner) {
      throw new AppError('Partner profile not found', 404);
    }

    const result = await partnerService.getPartnerPayouts(partner.id, {
      status: status as any,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({
      success: true,
      data: result.payouts,
      pagination: result.pagination,
    });
  })
);

// Request payout
router.post(
  '/payouts/request',
  payoutLimiter,
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;

    const partner = await partnerService.getPartnerByOrgId(organizationId);

    if (!partner) {
      throw new AppError('Partner profile not found', 404);
    }

    const payout = await partnerService.createPayout(partner.id);

    res.status(201).json({
      success: true,
      message: 'Payout request created',
      data: payout,
    });
  })
);

// Get bank details (admin only - sensitive financial data)
router.get(
  '/bank-details',
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;

    const partner = await partnerService.getPartnerByOrgId(organizationId);

    if (!partner) {
      throw new AppError('Partner profile not found', 404);
    }

    const bankDetails = await partnerService.getBankDetails(partner.id);

    res.json({
      success: true,
      data: bankDetails,
    });
  })
);

// Update bank details (admin only - sensitive financial data)
router.put(
  '/bank-details',
  authorize('admin'),
  validate(bankDetailsValidation),
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { bankName, accountNumber, ifscCode, accountHolderName } = req.body;

    const partner = await partnerService.getPartnerByOrgId(organizationId);

    if (!partner) {
      throw new AppError('Partner profile not found', 404);
    }

    const bankDetails = await partnerService.updateBankDetails(partner.id, {
      bankName,
      accountNumber,
      ifscCode,
      accountHolderName,
    });

    res.json({
      success: true,
      message: 'Bank details updated',
      data: bankDetails,
    });
  })
);

// ==================== ADMIN ROUTES ====================

// List all partners (admin)
router.get(
  '/admin/list',
  authorize('admin', 'super_admin'),
  validate([
    ...paginationValidation,
    query('status').optional().isIn(['pending', 'approved', 'rejected', 'suspended']).withMessage('Invalid status'),
    query('tier').optional().isIn(['bronze', 'silver', 'gold', 'platinum']).withMessage('Invalid tier'),
    query('type').optional().isIn(['reseller', 'referral', 'affiliate']).withMessage('Invalid type'),
    query('search').optional().trim().isLength({ max: 100 }).withMessage('Search query too long'),
  ]),
  asyncHandler(async (req, res) => {
    const { status, tier, type, page, limit, search } = req.query;

    const result = await partnerService.listPartners({
      status: status as any,
      tier: tier as any,
      type: type as any,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      search: search as string,
    });

    res.json({
      success: true,
      data: result.partners,
      pagination: result.pagination,
    });
  })
);

// Get partner details (admin)
router.get(
  '/admin/:partnerId',
  authorize('admin', 'super_admin'),
  validate([
    param('partnerId').isUUID().withMessage('Invalid partner ID'),
  ]),
  asyncHandler(async (req, res) => {
    const partner = await partnerService.getPartnerById(req.params.partnerId);

    if (!partner) {
      throw new AppError('Partner not found', 404);
    }

    res.json({
      success: true,
      data: partner,
    });
  })
);

// Approve partner (admin)
router.post(
  '/admin/:partnerId/approve',
  authorize('admin', 'super_admin'),
  validate([
    param('partnerId').isUUID().withMessage('Invalid partner ID'),
  ]),
  asyncHandler(async (req, res) => {
    const partner = await partnerService.approvePartner(
      req.params.partnerId,
      req.user!.id
    );

    res.json({
      success: true,
      message: 'Partner approved',
      data: partner,
    });
  })
);

// Reject partner (admin)
router.post(
  '/admin/:partnerId/reject',
  authorize('admin', 'super_admin'),
  validate([
    param('partnerId').isUUID().withMessage('Invalid partner ID'),
    body('reason').optional().trim().isLength({ max: 1000 }).withMessage('Reason too long'),
  ]),
  asyncHandler(async (req, res) => {
    const { reason } = req.body;

    const partner = await partnerService.rejectPartner(req.params.partnerId, reason);

    res.json({
      success: true,
      message: 'Partner rejected',
      data: partner,
    });
  })
);

// Update partner tier (admin)
router.put(
  '/admin/:partnerId/tier',
  authorize('admin', 'super_admin'),
  validate([
    param('partnerId').isUUID().withMessage('Invalid partner ID'),
    body('tier').isIn(['bronze', 'silver', 'gold', 'platinum']).withMessage('Invalid tier'),
  ]),
  asyncHandler(async (req, res) => {
    const { tier } = req.body;

    const partner = await partnerService.updatePartnerTier(req.params.partnerId, tier);

    res.json({
      success: true,
      message: 'Partner tier updated',
      data: partner,
    });
  })
);

// Process payout (admin)
router.post(
  '/admin/payouts/:payoutId/process',
  authorize('admin', 'super_admin'),
  validate([
    param('payoutId').isUUID().withMessage('Invalid payout ID'),
    body('transactionId').trim().notEmpty().withMessage('Transaction ID is required')
      .isLength({ max: 100 }).withMessage('Transaction ID too long'),
    body('paymentMethod').isIn(['bank_transfer', 'paypal', 'upi', 'check']).withMessage('Invalid payment method'),
  ]),
  asyncHandler(async (req, res) => {
    const { transactionId, paymentMethod } = req.body;

    const payout = await partnerService.processPayout(req.params.payoutId, {
      transactionId,
      paymentMethod,
      processedBy: req.user!.id,
    });

    res.json({
      success: true,
      message: 'Payout processed',
      data: payout,
    });
  })
);

export default router;
