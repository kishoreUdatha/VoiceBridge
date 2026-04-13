/**
 * Call Reports Routes
 * Tenant-scoped call reporting endpoints
 *
 * SECURITY: All reports filtered by organizationId from JWT token
 */

import { Router, Response } from 'express';
import { query } from 'express-validator';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import { ApiResponse } from '../utils/apiResponse';
import { callReportsService } from '../services/call-reports.service';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticate);
router.use(tenantMiddleware);

// Common validation
const dateRangeValidation = [
  query('startDate').optional().isISO8601().withMessage('Invalid start date'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date'),
];

const filterValidation = [
  ...dateRangeValidation,
  query('agentId').optional().isUUID().withMessage('Invalid agent ID'),
  query('campaignId').optional().isUUID().withMessage('Invalid campaign ID'),
];

/**
 * Helper: Parse filters from request
 */
function parseFilters(req: TenantRequest) {
  const { startDate, endDate, agentId, campaignId } = req.query;

  // Parse dates and ensure end date includes the full day
  let dateRange;
  if (startDate && endDate) {
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    // Set end date to end of day (23:59:59.999)
    end.setHours(23, 59, 59, 999);
    dateRange = { start, end };
  }

  return {
    organizationId: req.organizationId!,
    dateRange,
    agentId: agentId as string | undefined,
    campaignId: campaignId as string | undefined,
    userRole: req.user?.roleSlug,
    userId: req.user?.id,
  };
}

/**
 * GET /call-reports/summary
 * Get call summary statistics
 */
router.get(
  '/summary',
  validate(filterValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const summary = await callReportsService.getCallSummary(filters);
      return ApiResponse.success(res, { summary });
    } catch (error: any) {
      console.error('[CallReports] Summary error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /call-reports/outcomes
 * Get call outcome summary with conversion funnel
 */
router.get(
  '/outcomes',
  validate(filterValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const data = await callReportsService.getCallOutcomeSummary(filters);
      return ApiResponse.success(res, data);
    } catch (error: any) {
      console.error('[CallReports] Outcomes error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /call-reports/connected-vs-missed
 * Get connected vs missed calls breakdown
 */
router.get(
  '/connected-vs-missed',
  validate(filterValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const data = await callReportsService.getConnectedVsMissed(filters);
      return ApiResponse.success(res, data);
    } catch (error: any) {
      console.error('[CallReports] Connected vs missed error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /call-reports/inbound-vs-outbound
 * Get inbound vs outbound comparison
 */
router.get(
  '/inbound-vs-outbound',
  validate(filterValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const data = await callReportsService.getInboundVsOutbound(filters);
      return ApiResponse.success(res, data);
    } catch (error: any) {
      console.error('[CallReports] Inbound vs outbound error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /call-reports/duration
 * Get call duration analysis
 */
router.get(
  '/duration',
  validate(filterValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const data = await callReportsService.getCallDurationReport(filters);
      return ApiResponse.success(res, data);
    } catch (error: any) {
      console.error('[CallReports] Duration error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /call-reports/agent-performance
 * Get performance by agent (human + AI)
 */
router.get(
  '/agent-performance',
  validate(filterValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const agentPerformance = await callReportsService.getAgentPerformance(filters);
      return ApiResponse.success(res, { agentPerformance });
    } catch (error: any) {
      console.error('[CallReports] Agent performance error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /call-reports/ai-vs-human
 * Get AI vs human call comparison
 */
router.get(
  '/ai-vs-human',
  validate(filterValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const comparison = await callReportsService.getAIvsHumanComparison(filters);
      return ApiResponse.success(res, { comparison });
    } catch (error: any) {
      console.error('[CallReports] AI vs human error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /call-reports/trends
 * Get call trends over time
 */
router.get(
  '/trends',
  validate([
    ...filterValidation,
    query('interval').optional().isIn(['day', 'week', 'month']).withMessage('Invalid interval'),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const interval = (req.query.interval as 'day' | 'week' | 'month') || 'day';
      const trends = await callReportsService.getCallTrends(filters, interval);
      return ApiResponse.success(res, { trends });
    } catch (error: any) {
      console.error('[CallReports] Trends error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /call-reports/comprehensive
 * Get all call reports in one call
 */
router.get(
  '/comprehensive',
  validate(filterValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const report = await callReportsService.getComprehensiveReport(filters);
      return ApiResponse.success(res, { report });
    } catch (error: any) {
      console.error('[CallReports] Comprehensive error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /call-reports/lead-disposition
 * Get lead disposition report - per user call breakdown with dispositions
 */
router.get(
  '/lead-disposition',
  validate(filterValidation),
  async (req: TenantRequest, res: Response) => {
    console.log('[CallReports] Lead disposition request received, orgId:', req.organizationId);
    try {
      const filters = parseFilters(req);
      console.log('[CallReports] Filters:', JSON.stringify(filters, null, 2));
      const data = await callReportsService.getLeadDispositionReport(filters);
      console.log('[CallReports] Lead disposition data retrieved, dispositions count:', data.dispositions?.length || 0);
      return ApiResponse.success(res, data);
    } catch (error: any) {
      console.error('[CallReports] Lead disposition error:', error.message);
      console.error('[CallReports] Error stack:', error.stack);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /call-reports/user-call-report
 * Get comprehensive user call report with all 24 columns
 */
router.get(
  '/user-call-report',
  validate(filterValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const data = await callReportsService.getUserCallReport(filters);
      return ApiResponse.success(res, data);
    } catch (error: any) {
      console.error('[CallReports] User call report error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

export default router;
