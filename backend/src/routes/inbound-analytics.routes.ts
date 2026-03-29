import { Router, Response } from 'express';
import { query } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { inboundAnalyticsService } from '../services/inbound-analytics.service';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { ApiResponse } from '../utils/apiResponse';

const router = Router();

// Rate limiter for analytics endpoints
const analyticsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: { success: false, message: 'Too many analytics requests' },
});

// Common validation
const dateRangeValidation = [
  query('dateFrom').optional().isISO8601().withMessage('Invalid start date'),
  query('dateTo').optional().isISO8601().withMessage('Invalid end date'),
];

const daysValidation = [
  query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365'),
];

router.use(authenticate);
router.use(tenantMiddleware);
router.use(analyticsLimiter);

// Summary endpoint
router.get('/summary', validate(daysValidation), async (req: TenantRequest, res: Response) => {
  try {
    const { days = '30' } = req.query;
    const daysNum = Math.min(parseInt(days as string), 365);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);

    // Get inbound call stats (mock/default data if none exists)
    const summary = {
      period: { days: daysNum, startDate, endDate: new Date() },
      overview: {
        totalInboundCalls: 0,
        answeredCalls: 0,
        missedCalls: 0,
        voicemailsLeft: 0,
        avgWaitTime: 0,
        avgTalkTime: 0,
      },
      ivrMetrics: {
        totalIvrSessions: 0,
        completionRate: 0,
        avgSessionDuration: 0,
      },
      queueMetrics: {
        totalQueued: 0,
        avgQueueTime: 0,
        abandonRate: 0,
      },
      serviceLevel: {
        target: 80,
        current: 0,
        callsWithinTarget: 0,
      },
    };

    return ApiResponse.success(res, 'Inbound analytics summary', summary);
  } catch (error: any) {
    return ApiResponse.error(res, error.message);
  }
});

// Live dashboard
router.get('/live', async (req: TenantRequest, res: Response) => {
  try {
    const dashboard = await inboundAnalyticsService.getLiveDashboard(
      req.organizationId!
    );
    return ApiResponse.success(res, dashboard);
  } catch (error: any) {
    return ApiResponse.error(res, error.message);
  }
});

// Call volume over time
router.get('/call-volume', validate([
  ...dateRangeValidation,
  query('queueId').optional().isUUID().withMessage('Invalid queue ID'),
  query('ivrFlowId').optional().isUUID().withMessage('Invalid IVR flow ID'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const { dateFrom, dateTo, queueId, ivrFlowId } = req.query;

    const data = await inboundAnalyticsService.getCallVolume({
      organizationId: req.organizationId!,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      queueId: queueId as string,
      ivrFlowId: ivrFlowId as string,
    });

    return ApiResponse.success(res, data);
  } catch (error: any) {
    return ApiResponse.error(res, error.message);
  }
});

// Hourly distribution
router.get('/hourly-distribution', validate(dateRangeValidation), async (req: TenantRequest, res: Response) => {
  try {
    const { dateFrom, dateTo } = req.query;

    const data = await inboundAnalyticsService.getHourlyDistribution({
      organizationId: req.organizationId!,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
    });

    return ApiResponse.success(res, data);
  } catch (error: any) {
    return ApiResponse.error(res, error.message);
  }
});

// Queue metrics
router.get('/queue-metrics', validate([
  ...dateRangeValidation,
  query('queueId').optional().isUUID().withMessage('Invalid queue ID'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const { dateFrom, dateTo, queueId } = req.query;

    const metrics = await inboundAnalyticsService.getQueueMetrics({
      organizationId: req.organizationId!,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      queueId: queueId as string,
    });

    return ApiResponse.success(res, metrics);
  } catch (error: any) {
    return ApiResponse.error(res, error.message);
  }
});

// Queue service levels
router.get('/service-levels', async (req: TenantRequest, res: Response) => {
  try {
    const data = await inboundAnalyticsService.getQueueServiceLevels(
      req.organizationId!
    );
    return ApiResponse.success(res, data);
  } catch (error: any) {
    return ApiResponse.error(res, error.message);
  }
});

// Agent performance
router.get('/agent-performance', validate(dateRangeValidation), async (req: TenantRequest, res: Response) => {
  try {
    const { dateFrom, dateTo } = req.query;

    const data = await inboundAnalyticsService.getAgentPerformance({
      organizationId: req.organizationId!,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
    });

    return ApiResponse.success(res, data);
  } catch (error: any) {
    return ApiResponse.error(res, error.message);
  }
});

// IVR metrics
router.get('/ivr-metrics', validate([
  ...dateRangeValidation,
  query('ivrFlowId').optional().isUUID().withMessage('Invalid IVR flow ID'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const { dateFrom, dateTo, ivrFlowId } = req.query;

    const metrics = await inboundAnalyticsService.getIvrMetrics({
      organizationId: req.organizationId!,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      ivrFlowId: ivrFlowId as string,
    });

    return ApiResponse.success(res, metrics);
  } catch (error: any) {
    return ApiResponse.error(res, error.message);
  }
});

// Call outcomes
router.get('/call-outcomes', validate(dateRangeValidation), async (req: TenantRequest, res: Response) => {
  try {
    const { dateFrom, dateTo } = req.query;

    const data = await inboundAnalyticsService.getCallOutcomes({
      organizationId: req.organizationId!,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
    });

    return ApiResponse.success(res, data);
  } catch (error: any) {
    return ApiResponse.error(res, error.message);
  }
});

// Export call logs
router.get('/export', validate(dateRangeValidation), async (req: TenantRequest, res: Response) => {
  try {
    const { dateFrom, dateTo } = req.query;

    const data = await inboundAnalyticsService.exportCallLogs({
      organizationId: req.organizationId!,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
    });

    return ApiResponse.success(res, data);
  } catch (error: any) {
    return ApiResponse.error(res, error.message);
  }
});

export default router;
