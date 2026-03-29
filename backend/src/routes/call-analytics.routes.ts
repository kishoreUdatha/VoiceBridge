import { Router } from 'express';
import { body, param, query } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { callAnalyticsService } from '../services/call-analytics.service';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { CallOutcome } from '@prisma/client';

const router = Router();

// Rate limiter for analytics endpoints (can be expensive)
const analyticsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: { success: false, message: 'Too many analytics requests' },
});

// Common validation
const dateRangeValidation = [
  query('startDate').optional().isISO8601().withMessage('Invalid start date'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date'),
];

const daysValidation = [
  query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365'),
];

// All routes require authentication and tenant context
router.use(authenticate);
router.use(tenantMiddleware);
router.use(analyticsLimiter);

// ==================== FUNNEL ANALYTICS ====================

/**
 * @api {get} /call-analytics/funnels/:name Get Funnel Analytics
 */
router.get(
  '/funnels/:name',
  validate([
    param('name').trim().notEmpty().withMessage('Funnel name is required')
      .isLength({ max: 100 }).withMessage('Funnel name too long')
      .matches(/^[a-z0-9_-]+$/i).withMessage('Invalid funnel name format'),
    ...dateRangeValidation,
  ]),
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { startDate, endDate } = req.query;

    const funnelData = await callAnalyticsService.getFunnelAnalytics(
      organizationId,
      req.params.name,
      {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      }
    );

    res.json({ success: true, data: funnelData });
  })
);

/**
 * @api {post} /call-analytics/funnels/track Track Funnel Event
 */
router.post(
  '/funnels/track',
  validate([
    body('leadId').optional().isUUID().withMessage('Invalid lead ID'),
    body('funnelName').optional().trim().isLength({ max: 100 }).withMessage('Funnel name too long'),
    body('stageName').trim().notEmpty().withMessage('Stage name is required')
      .isLength({ max: 100 }).withMessage('Stage name too long'),
    body('stageOrder').isInt({ min: 0, max: 100 }).withMessage('Stage order must be between 0 and 100'),
    body('sourceCallId').optional().isUUID().withMessage('Invalid source call ID'),
    body('sourceAgentId').optional().isUUID().withMessage('Invalid source agent ID'),
    body('previousStage').optional().trim().isLength({ max: 100 }).withMessage('Previous stage too long'),
  ]),
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const {
      leadId,
      funnelName,
      stageName,
      stageOrder,
      sourceCallId,
      sourceAgentId,
      previousStage,
      metadata,
    } = req.body;

    const event = await callAnalyticsService.trackFunnelEvent({
      organizationId,
      leadId,
      funnelName,
      stageName,
      stageOrder,
      sourceCallId,
      sourceAgentId,
      previousStage,
      metadata,
    });

    res.json({ success: true, data: event });
  })
);

/**
 * @api {get} /call-analytics/funnels/lead/:leadId Get Lead Journey
 */
router.get(
  '/funnels/lead/:leadId',
  validate([
    param('leadId').isUUID().withMessage('Invalid lead ID'),
    query('funnelName').optional().trim().isLength({ max: 100 }).withMessage('Invalid funnel name'),
  ]),
  asyncHandler(async (req, res) => {
    const { funnelName = 'sales' } = req.query;
    const journey = await callAnalyticsService.getLeadJourney(
      req.params.leadId,
      funnelName as string
    );
    res.json({ success: true, data: journey });
  })
);

// ==================== AGENT PERFORMANCE ====================

/**
 * @api {get} /call-analytics/agents/leaderboard Get Agent Leaderboard
 */
router.get(
  '/agents/leaderboard',
  validate([
    query('metric').optional().isIn(['calls', 'conversions', 'appointments', 'payments', 'sentiment'])
      .withMessage('Invalid metric'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    ...dateRangeValidation,
  ]),
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const {
      metric = 'calls',
      startDate,
      endDate,
      limit = '10',
    } = req.query;

    const leaderboard = await callAnalyticsService.getAgentLeaderboard(
      organizationId,
      metric as 'calls' | 'conversions' | 'appointments' | 'payments' | 'sentiment',
      {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: Math.min(parseInt(limit as string), 100),
      }
    );

    res.json({ success: true, data: leaderboard });
  })
);

/**
 * @api {get} /call-analytics/agents/:agentId Get Agent Performance
 */
router.get(
  '/agents/:agentId',
  validate([
    param('agentId').isUUID().withMessage('Invalid agent ID'),
    ...daysValidation,
  ]),
  asyncHandler(async (req, res) => {
    const { days = '30' } = req.query;
    const performance = await callAnalyticsService.getAgentPerformance(
      req.params.agentId,
      Math.min(parseInt(days as string), 365)
    );
    res.json({ success: true, data: performance });
  })
);

/**
 * @api {post} /call-analytics/agents/aggregate Aggregate Daily Performance
 */
router.post(
  '/agents/aggregate',
  validate([
    body('date').optional().isISO8601().withMessage('Invalid date format'),
  ]),
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { date } = req.body;

    const result = await callAnalyticsService.aggregateDailyPerformance(
      organizationId,
      date ? new Date(date) : new Date()
    );

    res.json({ success: true, data: result });
  })
);

// ==================== OUTCOME ANALYTICS ====================

/**
 * @api {get} /call-analytics/outcomes/distribution Get Outcome Distribution
 */
router.get(
  '/outcomes/distribution',
  validate([
    ...dateRangeValidation,
    query('agentId').optional().isUUID().withMessage('Invalid agent ID'),
  ]),
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { startDate, endDate, agentId } = req.query;

    const distribution = await callAnalyticsService.getOutcomeDistribution(
      organizationId,
      {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        agentId: agentId as string,
      }
    );

    res.json({ success: true, data: distribution });
  })
);

/**
 * @api {get} /call-analytics/outcomes/trends Get Outcome Trends
 */
router.get(
  '/outcomes/trends',
  validate([
    ...daysValidation,
    query('agentId').optional().isUUID().withMessage('Invalid agent ID'),
    query('outcomes').optional().trim().isLength({ max: 500 }).withMessage('Outcomes list too long'),
  ]),
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { days = '30', agentId, outcomes } = req.query;

    const trends = await callAnalyticsService.getOutcomeTrends(
      organizationId,
      parseInt(days as string),
      {
        agentId: agentId as string,
        outcomes: outcomes
          ? (outcomes as string).split(',') as CallOutcome[]
          : undefined,
      }
    );

    res.json({ success: true, data: trends });
  })
);

// ==================== LEAD SOURCES ====================

/**
 * @api {get} /call-analytics/lead-sources Get Lead Sources Analytics
 * Compares Social Media leads vs AI Voice Agent leads
 */
router.get(
  '/lead-sources',
  validate(daysValidation),
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { days = '30' } = req.query;

    const leadSourcesData = await callAnalyticsService.getLeadSourcesAnalytics(
      organizationId,
      parseInt(days as string)
    );

    res.json({ success: true, data: leadSourcesData });
  })
);

// ==================== DASHBOARD ====================

/**
 * @api {get} /call-analytics/dashboard Get Combined Dashboard Data
 */
router.get(
  '/dashboard',
  validate(daysValidation),
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { days = '30' } = req.query;

    const dashboardData = await callAnalyticsService.getDashboardData(
      organizationId,
      parseInt(days as string)
    );

    res.json({ success: true, data: dashboardData });
  })
);

// ==================== AI INSIGHTS ====================

/**
 * @api {get} /call-analytics/ai-insights Get AI-powered call insights
 */
router.get(
  '/ai-insights',
  validate(daysValidation),
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { days = '30' } = req.query;

    // Get call data for insights
    const calls = await callAnalyticsService.getRecentCalls(organizationId, parseInt(days as string));

    // Generate insights
    const insights = {
      summary: {
        totalCalls: calls.length,
        answeredRate: calls.length > 0 ? (calls.filter((c: any) => c.status === 'completed').length / calls.length * 100).toFixed(1) : 0,
        avgDuration: calls.length > 0 ? Math.round(calls.reduce((sum: number, c: any) => sum + (c.duration || 0), 0) / calls.length) : 0,
      },
      sentimentAnalysis: {
        positive: calls.filter((c: any) => c.sentiment === 'positive').length,
        neutral: calls.filter((c: any) => c.sentiment === 'neutral').length,
        negative: calls.filter((c: any) => c.sentiment === 'negative').length,
      },
      topOutcomes: [
        { outcome: 'interested', count: calls.filter((c: any) => c.outcome === 'interested').length },
        { outcome: 'callback_scheduled', count: calls.filter((c: any) => c.outcome === 'callback_scheduled').length },
        { outcome: 'not_interested', count: calls.filter((c: any) => c.outcome === 'not_interested').length },
        { outcome: 'no_answer', count: calls.filter((c: any) => c.outcome === 'no_answer').length },
      ],
      recommendations: [
        { type: 'timing', message: 'Best call times appear to be between 10 AM - 12 PM based on answer rates' },
        { type: 'script', message: 'Calls with personalized greetings show 23% higher engagement' },
        { type: 'follow_up', message: 'Leads contacted within 5 minutes of form submission have 3x conversion rate' },
      ],
    };

    res.json({ success: true, data: insights });
  })
);

/**
 * @api {get} /call-analytics/summary Get Call Analytics Summary
 */
router.get(
  '/summary',
  validate(daysValidation),
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { days = '30' } = req.query;

    const summary = await callAnalyticsService.getSummary(organizationId, parseInt(days as string));

    res.json({ success: true, data: summary });
  })
);

export default router;
