import { Router } from 'express';
import { analyticsService } from '../services/analytics.service';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware } from '../middlewares/tenant';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticate);
router.use(tenantMiddleware);

/**
 * Helper to parse date range from query
 */
function parseDateRange(startDate?: string, endDate?: string, defaultDays: number = 30) {
  const end = endDate ? new Date(endDate) : new Date();
  const start = startDate
    ? new Date(startDate)
    : new Date(end.getTime() - defaultDays * 24 * 60 * 60 * 1000);
  return { start, end };
}

/**
 * @api {get} /analytics/dashboard Dashboard Summary
 */
router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;

    const summary = await analyticsService.getDashboardSummary(organizationId);

    res.json({ success: true, data: summary });
  })
);

/**
 * @api {get} /analytics/api-usage API Usage Statistics
 */
router.get(
  '/api-usage',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { startDate, endDate } = req.query;

    const dateRange = parseDateRange(startDate as string, endDate as string);
    const stats = await analyticsService.getApiUsageStats(organizationId, dateRange);

    res.json({ success: true, data: stats });
  })
);

/**
 * @api {get} /analytics/api-keys API Key Usage Breakdown
 */
router.get(
  '/api-keys',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { startDate, endDate } = req.query;

    const dateRange = parseDateRange(startDate as string, endDate as string);
    const usage = await analyticsService.getApiKeyUsage(organizationId, dateRange);

    res.json({ success: true, data: usage });
  })
);

/**
 * @api {get} /analytics/webhooks Webhook Delivery Statistics
 */
router.get(
  '/webhooks',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { startDate, endDate } = req.query;

    const dateRange = parseDateRange(startDate as string, endDate as string);
    const stats = await analyticsService.getWebhookStats(organizationId, dateRange);

    res.json({ success: true, data: stats });
  })
);

/**
 * @api {get} /analytics/messaging Messaging Statistics
 */
router.get(
  '/messaging',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { startDate, endDate } = req.query;

    const dateRange = parseDateRange(startDate as string, endDate as string);
    const stats = await analyticsService.getMessagingStats(organizationId, dateRange);

    res.json({ success: true, data: stats });
  })
);

/**
 * @api {get} /analytics/leads Lead Statistics
 */
router.get(
  '/leads',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { startDate, endDate } = req.query;

    const dateRange = parseDateRange(startDate as string, endDate as string);
    const stats = await analyticsService.getLeadStats(organizationId, dateRange);

    res.json({ success: true, data: stats });
  })
);

/**
 * @api {get} /analytics/contact-lists Contact List Statistics
 */
router.get(
  '/contact-lists',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;

    const stats = await analyticsService.getContactListStats(organizationId);

    res.json({ success: true, data: stats });
  })
);

/**
 * @api {get} /analytics/conversations Conversation Statistics
 */
router.get(
  '/conversations',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { startDate, endDate } = req.query;

    const dateRange = parseDateRange(startDate as string, endDate as string);
    const stats = await analyticsService.getConversationStats(organizationId, dateRange);

    res.json({ success: true, data: stats });
  })
);

/**
 * @api {get} /analytics/usage-trend Usage Time Series
 */
router.get(
  '/usage-trend',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { startDate, endDate, interval = 'day' } = req.query;

    const dateRange = parseDateRange(startDate as string, endDate as string);
    const data = await analyticsService.getUsageTimeSeries(organizationId, {
      dateRange,
      interval: interval as any,
    });

    res.json({ success: true, data });
  })
);

export default router;
