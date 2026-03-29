import { Router } from 'express';
import { body, param, query } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { prisma } from '../config/database';
import { leadScoringService } from '../services/advanced-features.service';
import { authenticate, authorize } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import { asyncHandler } from '../utils/asyncHandler';
import OpenAI from 'openai';

const router = Router();
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// Rate limiter for scoring operations
const scoringLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: { success: false, message: 'Too many scoring requests' },
});

// All routes require authentication and tenant context
router.use(authenticate);
router.use(tenantMiddleware);
router.use(scoringLimiter);

// Default scoring rules
const DEFAULT_SCORING_RULES = [
  {
    id: 'rule_email',
    name: 'Has Email',
    category: 'demographic',
    condition: 'email_exists',
    points: 20,
    description: 'Lead has email address',
    isActive: true,
  },
  {
    id: 'rule_phone',
    name: 'Has Phone',
    category: 'demographic',
    condition: 'phone_exists',
    points: 20,
    description: 'Lead has phone number',
    isActive: true,
  },
  {
    id: 'rule_full_name',
    name: 'Full Name Provided',
    category: 'demographic',
    condition: 'full_name_exists',
    points: 15,
    description: 'Lead has first and last name',
    isActive: true,
  },
  {
    id: 'rule_location',
    name: 'Location Provided',
    category: 'demographic',
    condition: 'location_exists',
    points: 15,
    description: 'Lead has city or state',
    isActive: true,
  },
  {
    id: 'rule_course_interest',
    name: 'Course Interest',
    category: 'demographic',
    condition: 'course_selected',
    points: 15,
    description: 'Lead has shown interest in specific course',
    isActive: true,
  },
  {
    id: 'rule_call_answered',
    name: 'Answered Call',
    category: 'behavior',
    condition: 'call_answered',
    points: 25,
    description: 'Lead answered phone call',
    isActive: true,
  },
  {
    id: 'rule_call_duration',
    name: 'Long Call Duration',
    category: 'behavior',
    condition: 'call_duration_gt_60',
    points: 20,
    description: 'Call lasted more than 60 seconds',
    isActive: true,
  },
  {
    id: 'rule_positive_sentiment',
    name: 'Positive Sentiment',
    category: 'behavior',
    condition: 'sentiment_positive',
    points: 30,
    description: 'AI detected positive sentiment in call',
    isActive: true,
  },
  {
    id: 'rule_email_opened',
    name: 'Email Opened',
    category: 'behavior',
    condition: 'email_opened',
    points: 10,
    description: 'Lead opened marketing email',
    isActive: true,
  },
  {
    id: 'rule_whatsapp_reply',
    name: 'WhatsApp Reply',
    category: 'behavior',
    condition: 'whatsapp_replied',
    points: 20,
    description: 'Lead replied to WhatsApp message',
    isActive: true,
  },
  {
    id: 'rule_form_submission',
    name: 'Form Submission',
    category: 'engagement',
    condition: 'form_submitted',
    points: 25,
    description: 'Lead submitted inquiry form',
    isActive: true,
  },
  {
    id: 'rule_ad_source',
    name: 'Paid Ad Source',
    category: 'source',
    condition: 'source_paid_ad',
    points: 15,
    description: 'Lead came from paid advertising',
    isActive: true,
  },
];

/**
 * @api {get} /lead-scoring/rules Get Scoring Rules
 */
router.get(
  '/rules',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;

    // Try to get organization-specific rules from settings
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    let rules = DEFAULT_SCORING_RULES;

    // If organization has custom rules, merge them
    const settings = organization?.settings as Record<string, any> | null;
    if (settings?.leadScoringRules) {
      const customRules = typeof settings.leadScoringRules === 'string'
        ? JSON.parse(settings.leadScoringRules)
        : settings.leadScoringRules;
      if (Array.isArray(customRules) && customRules.length > 0) {
        rules = customRules;
      }
    }

    res.json({
      success: true,
      data: rules,
      meta: {
        totalRules: rules.length,
        activeRules: rules.filter((r: any) => r.isActive).length,
        categories: [...new Set(rules.map((r: any) => r.category))],
      },
    });
  })
);

/**
 * @api {put} /lead-scoring/rules Update Scoring Rules
 */
router.put(
  '/rules',
  authorize('admin', 'manager'),
  validate([
    body('rules').isArray({ min: 1, max: 50 }).withMessage('Rules must be an array with 1-50 items'),
    body('rules.*.id').trim().notEmpty().isLength({ max: 50 }).withMessage('Invalid rule ID'),
    body('rules.*.name').trim().notEmpty().isLength({ max: 100 }).withMessage('Rule name required (max 100 chars)'),
    body('rules.*.category').trim().isLength({ max: 50 }).withMessage('Invalid category'),
    body('rules.*.condition').trim().isLength({ max: 100 }).withMessage('Invalid condition'),
    body('rules.*.points').isInt({ min: -100, max: 100 }).withMessage('Points must be between -100 and 100'),
    body('rules.*.isActive').isBoolean().withMessage('isActive must be boolean'),
  ]),
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { rules } = req.body;

    // Get current settings and merge with new rules
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    const currentSettings = (organization?.settings as Record<string, any>) || {};
    const updatedSettings = { ...currentSettings, leadScoringRules: rules };

    await prisma.organization.update({
      where: { id: organizationId },
      data: { settings: updatedSettings },
    });

    res.json({
      success: true,
      message: 'Scoring rules updated',
      data: rules,
    });
  })
);

/**
 * @api {get} /lead-scoring/leads Get Scored Leads
 */
router.get(
  '/leads',
  validate([
    query('grade').optional().isIn(['A', 'B', 'C', 'D', 'F']).withMessage('Invalid grade'),
    query('minScore').optional().isInt({ min: 0, max: 100 }).withMessage('Min score must be 0-100'),
    query('maxScore').optional().isInt({ min: 0, max: 100 }).withMessage('Max score must be 0-100'),
    query('aiClassification').optional().isIn(['hot_lead', 'warm_lead', 'cold_lead', 'not_qualified'])
      .withMessage('Invalid AI classification'),
    query('sortBy').optional().isIn(['overallScore', 'demographicScore', 'behaviorScore', 'createdAt'])
      .withMessage('Invalid sort field'),
    query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  ]),
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const {
      grade,
      minScore,
      maxScore,
      aiClassification,
      sortBy = 'overallScore',
      sortOrder = 'desc',
      page = '1',
      limit = '50',
    } = req.query;

    const where: any = {
      lead: { organizationId },
    };

    if (grade) where.grade = grade;
    if (aiClassification) where.aiClassification = aiClassification;
    if (minScore || maxScore) {
      where.overallScore = {};
      if (minScore) where.overallScore.gte = parseInt(minScore as string);
      if (maxScore) where.overallScore.lte = parseInt(maxScore as string);
    }

    const orderBy: any = {};
    orderBy[sortBy as string] = sortOrder;

    const [scores, total] = await Promise.all([
      prisma.leadScore.findMany({
        where,
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string),
        orderBy,
        include: {
          lead: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              source: true,
              stage: { select: { id: true, name: true, color: true } },
            },
          },
        },
      }),
      prisma.leadScore.count({ where }),
    ]);

    res.json({
      success: true,
      data: scores,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  })
);

/**
 * @api {get} /lead-scoring/leads/:leadId Get Lead Score
 */
router.get(
  '/leads/:leadId',
  validate([
    param('leadId').isUUID().withMessage('Invalid lead ID'),
  ]),
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;

    // Verify lead belongs to organization
    const lead = await prisma.lead.findFirst({
      where: { id: req.params.leadId, organizationId },
      select: { id: true },
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found',
      });
    }

    const score = await leadScoringService.getLeadScore(req.params.leadId);

    if (!score) {
      return res.status(404).json({
        success: false,
        message: 'Lead score not found',
      });
    }

    res.json({ success: true, data: score });
  })
);

/**
 * @api {post} /lead-scoring/classify/:callId Classify Lead from Call
 */
router.post(
  '/classify/:callId',
  validate([
    param('callId').isUUID().withMessage('Invalid call ID'),
  ]),
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;

    // Verify call belongs to organization via agent
    const call = await prisma.outboundCall.findFirst({
      where: {
        id: req.params.callId,
        agent: { organizationId },
      },
      include: { agent: true },
    });

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found',
      });
    }

    if (!call.generatedLeadId) {
      return res.status(400).json({
        success: false,
        message: 'No lead associated with this call',
      });
    }

    // Get or create lead score
    let leadScore = await prisma.leadScore.findUnique({
      where: { leadId: call.generatedLeadId },
    });

    // AI Classification
    let aiClassification = 'cold_lead';
    let classificationConfidence = 0;

    if (openai && call.summary) {
      try {
        const completion = await openai.chat.completions.create({
          model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `Classify this sales call lead based on the summary. Return JSON with:
- classification: one of "hot_lead", "warm_lead", "cold_lead", "not_qualified"
- confidence: number 0-1 indicating confidence
- reasoning: brief explanation

Definitions:
- hot_lead: Ready to buy, high intent, asked about pricing/next steps
- warm_lead: Interested but needs nurturing, asked questions, positive sentiment
- cold_lead: Low interest, hesitant, many objections
- not_qualified: Wrong fit, not the right person, unreachable`,
            },
            {
              role: 'user',
              content: `Call Summary: ${call.summary}\nOutcome: ${call.outcome}\nSentiment: ${call.sentiment}\nDuration: ${call.duration} seconds`,
            },
          ],
          temperature: 0,
          response_format: { type: 'json_object' },
        });

        const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
        aiClassification = result.classification || 'cold_lead';
        classificationConfidence = result.confidence || 0;
      } catch (error) {
        console.error('AI classification failed:', error);
      }
    }

    // Calculate demographic and behavior scores
    const lead = await prisma.lead.findUnique({
      where: { id: call.generatedLeadId },
      include: {
        callLogs: { select: { id: true } },
        emailLogs: { select: { id: true } },
        activities: { select: { id: true } },
      },
    });

    // Demographic score (0-100) based on profile completeness
    let demographicScore = 0;
    if (lead) {
      if (lead.email) demographicScore += 20;
      if (lead.phone) demographicScore += 20;
      if (lead.firstName && lead.lastName) demographicScore += 15;
      if (lead.city || lead.state) demographicScore += 15;
      if (lead.courseId) demographicScore += 15;
      if (lead.customFields && Object.keys(lead.customFields as object).length > 0) demographicScore += 15;
    }

    // Behavior score (0-100) based on engagement
    let behaviorScore = 0;
    if (lead) {
      const callCount = lead.callLogs?.length || 0;
      const emailCount = lead.emailLogs?.length || 0;
      const activityCount = lead.activities?.length || 0;

      behaviorScore = Math.min(
        (callCount * 15) + (emailCount * 10) + (activityCount * 5),
        100
      );
    }

    // Update lead score with AI classification
    leadScore = await prisma.leadScore.upsert({
      where: { leadId: call.generatedLeadId },
      create: {
        leadId: call.generatedLeadId,
        aiClassification,
        classificationConfidence,
        demographicScore,
        behaviorScore,
        lastCalculatedAt: new Date(),
      },
      update: {
        aiClassification,
        classificationConfidence,
        demographicScore,
        behaviorScore,
        lastCalculatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: {
        leadScore,
        classification: {
          aiClassification,
          confidence: classificationConfidence,
          demographicScore,
          behaviorScore,
        },
      },
    });
  })
);

/**
 * @api {get} /lead-scoring/distribution Get Score Distribution
 */
router.get(
  '/distribution',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;

    const [byGrade, byClassification, scoreRanges] = await Promise.all([
      // Distribution by grade
      prisma.leadScore.groupBy({
        by: ['grade'],
        where: { lead: { organizationId } },
        _count: { id: true },
      }),

      // Distribution by AI classification
      prisma.leadScore.groupBy({
        by: ['aiClassification'],
        where: {
          lead: { organizationId },
          aiClassification: { not: null },
        },
        _count: { id: true },
      }),

      // Score ranges
      prisma.$queryRaw`
        SELECT
          CASE
            WHEN "overallScore" >= 80 THEN '80-100'
            WHEN "overallScore" >= 60 THEN '60-79'
            WHEN "overallScore" >= 40 THEN '40-59'
            WHEN "overallScore" >= 20 THEN '20-39'
            ELSE '0-19'
          END as range,
          COUNT(*) as count
        FROM "lead_scores" ls
        JOIN "leads" l ON ls."leadId" = l.id
        WHERE l."organizationId" = ${organizationId}
        GROUP BY range
        ORDER BY range DESC
      ` as Promise<{ range: string; count: bigint }[]>,
    ]);

    res.json({
      success: true,
      data: {
        byGrade: byGrade.reduce((acc, item) => {
          acc[item.grade] = item._count.id;
          return acc;
        }, {} as Record<string, number>),
        byClassification: byClassification.reduce((acc, item) => {
          if (item.aiClassification) {
            acc[item.aiClassification] = item._count.id;
          }
          return acc;
        }, {} as Record<string, number>),
        scoreRanges: scoreRanges.map(r => ({
          range: r.range,
          count: Number(r.count),
        })),
      },
    });
  })
);

/**
 * @api {get} /lead-scoring/top Get Top Leads
 */
router.get(
  '/top',
  validate([
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  ]),
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { limit = '20' } = req.query;

    const topLeads = await leadScoringService.getTopLeads(
      organizationId,
      Math.min(parseInt(limit as string), 100)
    );

    res.json({ success: true, data: topLeads });
  })
);

/**
 * @api {post} /lead-scoring/recalculate/:leadId Recalculate Lead Score
 */
router.post(
  '/recalculate/:leadId',
  validate([
    param('leadId').isUUID().withMessage('Invalid lead ID'),
  ]),
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;

    // Verify lead belongs to organization
    const lead = await prisma.lead.findFirst({
      where: { id: req.params.leadId, organizationId },
      include: {
        callLogs: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found',
      });
    }

    // Get the most recent call for this lead
    const recentCall = await prisma.outboundCall.findFirst({
      where: { generatedLeadId: lead.id },
      orderBy: { createdAt: 'desc' },
    });

    if (!recentCall) {
      return res.status(400).json({
        success: false,
        message: 'No calls found for this lead',
      });
    }

    // Calculate score using the existing service
    const score = await leadScoringService.calculateScore(lead.id, {
      transcript: (recentCall.transcript as any[]) || [],
      duration: recentCall.duration || 0,
      sentiment: recentCall.sentiment || 'neutral',
      qualification: recentCall.qualification || {},
      outcome: recentCall.outcome!,
    });

    res.json({ success: true, data: score });
  })
);

export default router;
