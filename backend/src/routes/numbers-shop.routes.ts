/**
 * Numbers Shop Routes
 * API endpoints for phone number marketplace
 *
 * Supports two options:
 * 1. Connect Your Exotel (BYOC) - Use your own Exotel account
 * 2. Buy from VoiceBridge (PLATFORM) - Purchase numbers from our pool
 */

import { Router, Response, NextFunction } from 'express';
import { body, query, param } from 'express-validator';
import { authenticate, authorize, AuthenticatedRequest } from '../middlewares/auth';
import { tenantMiddleware } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import { numbersShopService } from '../services/numbers-shop.service';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticate);
router.use(tenantMiddleware);

// Async handler wrapper
const asyncHandler = (fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<any>) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// ==================== EXOTEL CONNECTION ENDPOINTS ====================

/**
 * Connect your own Exotel account
 * POST /api/numbers-shop/connect-exotel
 */
router.post(
  '/connect-exotel',
  authorize('admin'),
  validate([
    body('accountSid')
      .notEmpty()
      .withMessage('Account SID is required')
      .isLength({ max: 100 })
      .withMessage('Account SID too long'),
    body('apiKey')
      .notEmpty()
      .withMessage('API Key is required')
      .isLength({ max: 100 })
      .withMessage('API Key too long'),
    body('apiToken')
      .notEmpty()
      .withMessage('API Token is required')
      .isLength({ max: 500 })
      .withMessage('API Token too long'),
    body('callerId')
      .optional()
      .isLength({ max: 50 })
      .withMessage('Caller ID too long'),
    body('subdomain')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Subdomain too long'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { accountSid, apiKey, apiToken, callerId, subdomain } = req.body;

    const result = await numbersShopService.connectExotel(
      req.user!.organizationId,
      { accountSid, apiKey, apiToken, callerId, subdomain }
    );

    res.json({
      success: true,
      data: result,
      message: 'Exotel account connected successfully',
    });
  })
);

/**
 * Test Exotel credentials without saving
 * POST /api/numbers-shop/test-connection
 */
router.post(
  '/test-connection',
  authorize('admin'),
  validate([
    body('accountSid')
      .notEmpty()
      .withMessage('Account SID is required'),
    body('apiKey')
      .notEmpty()
      .withMessage('API Key is required'),
    body('apiToken')
      .notEmpty()
      .withMessage('API Token is required'),
    body('subdomain')
      .optional(),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { accountSid, apiKey, apiToken, subdomain } = req.body;

    const result = await numbersShopService.testExotelCredentials({
      accountSid,
      apiKey,
      apiToken,
      subdomain,
    });

    res.json({
      success: result.success,
      data: result,
      message: result.message,
    });
  })
);

/**
 * Get Exotel connection status
 * GET /api/numbers-shop/connection-status
 */
router.get(
  '/connection-status',
  authorize('admin', 'manager'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const status = await numbersShopService.getExotelConnectionStatus(req.user!.organizationId);

    res.json({
      success: true,
      data: status,
    });
  })
);

/**
 * Disconnect your Exotel account
 * DELETE /api/numbers-shop/disconnect-exotel
 */
router.delete(
  '/disconnect-exotel',
  authorize('admin'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await numbersShopService.disconnectExotel(req.user!.organizationId);

    res.json({
      success: true,
      message: 'Exotel account disconnected',
    });
  })
);

// ==================== WALLET ENDPOINTS ====================

/**
 * Get wallet balance
 * GET /api/numbers-shop/wallet
 */
router.get(
  '/wallet',
  authorize('admin', 'manager'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const wallet = await numbersShopService.getWalletBalance(req.user!.organizationId);

    res.json({
      success: true,
      data: wallet,
    });
  })
);

/**
 * Add funds to wallet
 * POST /api/numbers-shop/wallet/add-funds
 */
router.post(
  '/wallet/add-funds',
  authorize('admin'),
  validate([
    body('amount')
      .isFloat({ min: 1 })
      .withMessage('Amount must be at least $1'),
    body('razorpayOrderId')
      .optional()
      .isString(),
    body('razorpayPaymentId')
      .optional()
      .isString(),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { amount, razorpayOrderId, razorpayPaymentId, description } = req.body;

    const result = await numbersShopService.addFunds(
      req.user!.organizationId,
      amount,
      { razorpayOrderId, razorpayPaymentId, description }
    );

    res.json({
      success: true,
      data: result,
      message: `$${amount.toFixed(2)} added to wallet`,
    });
  })
);

/**
 * Get wallet transaction history
 * GET /api/numbers-shop/wallet/transactions
 */
router.get(
  '/wallet/transactions',
  authorize('admin', 'manager'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await numbersShopService.getTransactionHistory(
      req.user!.organizationId,
      { limit, offset }
    );

    res.json({
      success: true,
      data: result.transactions,
      meta: {
        total: result.total,
        limit,
        offset,
      },
    });
  })
);

// ==================== KYC ENDPOINTS ====================

/**
 * Get KYC status
 * GET /api/numbers-shop/kyc
 */
router.get(
  '/kyc',
  authorize('admin', 'manager'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const kycStatus = await numbersShopService.getKycStatus(req.user!.organizationId);

    res.json({
      success: true,
      data: kycStatus,
    });
  })
);

/**
 * Submit KYC verification
 * POST /api/numbers-shop/kyc
 */
router.post(
  '/kyc',
  authorize('admin'),
  validate([
    body('panNumber')
      .optional()
      .isString()
      .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
      .withMessage('Invalid PAN number format'),
    body('gstNumber')
      .optional()
      .isString()
      .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
      .withMessage('Invalid GST number format'),
    body('addressProof')
      .optional()
      .isString(),
    body('authorizationLetter')
      .optional()
      .isString(),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { panNumber, gstNumber, addressProof, authorizationLetter } = req.body;

    // For now, auto-verify if documents are provided
    // In production, this would trigger a manual review process
    const hasDocuments = panNumber || gstNumber;

    const result = await numbersShopService.updateKycStatus(
      req.user!.organizationId,
      hasDocuments, // Auto-verify for demo
      { panNumber, gstNumber, addressProof, authorizationLetter }
    );

    res.json({
      success: true,
      data: result,
      message: hasDocuments
        ? 'KYC verification completed successfully'
        : 'KYC documents required',
    });
  })
);

// ==================== AVAILABLE NUMBERS ====================

/**
 * List available phone numbers (from platform pool)
 * GET /api/numbers-shop/available
 */
router.get(
  '/available',
  authorize('admin', 'manager'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { country, type, region, pattern, limit } = req.query;

    const numbers = await numbersShopService.listAvailableNumbers({
      country: country as string,
      type: type as 'Landline' | 'Mobile' | 'TollFree',
      region: region as string,
      pattern: pattern as string,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    // Get wallet info to include with response
    const wallet = await numbersShopService.getWalletBalance(req.user!.organizationId);

    res.json({
      success: true,
      data: {
        numbers,
        wallet,
      },
    });
  })
);

/**
 * List platform numbers (same as available - for explicit naming)
 * GET /api/numbers-shop/platform-numbers
 */
router.get(
  '/platform-numbers',
  authorize('admin', 'manager'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { country, type, region, pattern, limit } = req.query;

    const numbers = await numbersShopService.listPlatformNumbers({
      country: country as string,
      type: type as 'Landline' | 'Mobile' | 'TollFree',
      region: region as string,
      pattern: pattern as string,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    const wallet = await numbersShopService.getWalletBalance(req.user!.organizationId);

    res.json({
      success: true,
      data: {
        numbers,
        wallet,
      },
    });
  })
);

/**
 * Search available numbers by pattern
 * GET /api/numbers-shop/search
 */
router.get(
  '/search',
  authorize('admin', 'manager'),
  validate([
    query('pattern')
      .notEmpty()
      .withMessage('Search pattern is required')
      .isLength({ min: 2, max: 10 })
      .withMessage('Pattern must be 2-10 characters'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { pattern, country, type } = req.query;

    const numbers = await numbersShopService.searchNumbers({
      pattern: pattern as string,
      country: country as string,
      type: type as 'Landline' | 'Mobile' | 'TollFree',
    });

    res.json({
      success: true,
      data: numbers,
    });
  })
);

// ==================== PURCHASE ====================

/**
 * Purchase a phone number from platform
 * POST /api/numbers-shop/purchase
 */
router.post(
  '/purchase',
  authorize('admin'),
  validate([
    body('phoneNumber')
      .notEmpty()
      .withMessage('Phone number is required')
      .matches(/^\+[1-9]\d{6,14}$/)
      .withMessage('Invalid phone number format (E.164 required)'),
    body('friendlyName')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Friendly name must be less than 100 characters'),
    body('assignToAgentId')
      .optional()
      .isUUID()
      .withMessage('Invalid agent ID'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { phoneNumber, friendlyName, assignToAgentId } = req.body;

    const result = await numbersShopService.purchaseFromPlatform(
      req.user!.organizationId,
      phoneNumber,
      { friendlyName, assignToAgentId }
    );

    res.status(201).json({
      success: true,
      data: result,
      message: `Phone number ${phoneNumber} purchased successfully`,
    });
  })
);

// ==================== IMPORT ====================

/**
 * Import numbers from your own Exotel account (BYOC)
 * POST /api/numbers-shop/import
 */
router.post(
  '/import',
  authorize('admin'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await numbersShopService.importFromExotel(req.user!.organizationId);

    res.json({
      success: true,
      data: result,
      message: `Imported ${result.imported} numbers, skipped ${result.skipped} duplicates`,
    });
  })
);

/**
 * Import numbers from your own Exotel (explicit BYOC endpoint)
 * POST /api/numbers-shop/import-own
 */
router.post(
  '/import-own',
  authorize('admin'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await numbersShopService.importFromOwnExotel(req.user!.organizationId);

    res.json({
      success: true,
      data: result,
      message: `Imported ${result.imported} numbers, skipped ${result.skipped} duplicates`,
    });
  })
);

// ==================== MY NUMBERS ====================

/**
 * Get my purchased numbers
 * GET /api/numbers-shop/my-numbers
 */
router.get(
  '/my-numbers',
  authorize('admin', 'manager'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { status, provider, source } = req.query;

    const numbers = await numbersShopService.getMyNumbers(
      req.user!.organizationId,
      {
        status: status as string,
        provider: provider as string,
        source: source as 'PLATFORM' | 'BYOC',
      }
    );

    res.json({
      success: true,
      data: numbers,
    });
  })
);

/**
 * Release a phone number
 * DELETE /api/numbers-shop/my-numbers/:id
 */
router.delete(
  '/my-numbers/:id',
  authorize('admin'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await numbersShopService.releaseNumber(
      req.user!.organizationId,
      req.params.id
    );

    res.json({
      success: true,
      message: 'Phone number released successfully',
    });
  })
);

export default router;
