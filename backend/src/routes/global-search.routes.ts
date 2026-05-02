/**
 * Global Search Routes
 * Single endpoint for searching across all data types
 */

import { Router, Response } from 'express';
import { query } from 'express-validator';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import { ApiResponse } from '../utils/apiResponse';
import { globalSearchService } from '../services/global-search.service';

const router = Router();

// Apply authentication and tenant middleware
router.use(authenticate);
router.use(tenantMiddleware);

/**
 * GET /global-search
 * Search across all data types: leads, calls, raw imports, campaigns, users, bulk imports, agents
 */
router.get(
  '/',
  validate([
    query('q').notEmpty().withMessage('Search query is required').isLength({ min: 2 }).withMessage('Search query must be at least 2 characters'),
    query('limit').optional().isInt({ min: 1, max: 10 }).withMessage('Limit must be between 1 and 10'),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const searchQuery = req.query.q as string;
      const limit = parseInt(req.query.limit as string) || 5;

      const results = await globalSearchService.search(
        req.organizationId!,
        searchQuery,
        limit
      );

      ApiResponse.success(res, 'Search results', results);
    } catch (error) {
      console.error('[GlobalSearch] Error:', error);
      ApiResponse.error(res, (error as Error).message, 500);
    }
  }
);

export default router;
