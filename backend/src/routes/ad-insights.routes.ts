import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware } from '../middlewares/tenant';
import { asyncHandler } from '../utils/asyncHandler';
import { adInsightsSyncService } from '../services/ad-insights-sync.service';
import { jobQueueService } from '../services/job-queue.service';
import { prisma } from '../config/database';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticate);
router.use(tenantMiddleware);

/**
 * @api {post} /ad-insights/sync Trigger Manual Sync
 * Manually trigger ad insights sync for the organization
 */
router.post(
  '/sync',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { platform } = req.body;

    let result;
    if (platform === 'facebook') {
      result = await adInsightsSyncService.syncFacebookInsights(organizationId);
    } else if (platform === 'instagram') {
      result = await adInsightsSyncService.syncInstagramInsights(organizationId);
    } else {
      result = await adInsightsSyncService.syncAllPlatforms(organizationId);
    }

    res.json({
      success: true,
      message: 'Ad insights sync completed',
      data: result,
    });
  })
);

/**
 * @api {post} /ad-insights/sync/async Trigger Async Sync
 * Queue ad insights sync as a background job
 */
router.post(
  '/sync/async',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;

    const jobId = await jobQueueService.addJob('AD_INSIGHTS_SYNC', {}, {
      organizationId,
    });

    res.json({
      success: true,
      message: 'Ad insights sync job queued',
      data: { jobId },
    });
  })
);

/**
 * @api {get} /ad-insights/sync/status Get Last Sync Status
 * Get the last sync times and status for ad integrations
 */
router.get(
  '/sync/status',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;

    const status = await adInsightsSyncService.getLastSyncStatus(organizationId);

    res.json({
      success: true,
      data: status,
    });
  })
);

/**
 * @api {get} /ad-insights/campaigns/:id/metrics Get Campaign Historical Metrics
 * Get historical daily metrics for a specific campaign
 */
router.get(
  '/campaigns/:id/metrics',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    // Verify campaign belongs to organization
    const campaign = await prisma.adCampaign.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found',
      });
    }

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const metrics = await adInsightsSyncService.getCampaignMetrics(id, { start, end });

    res.json({
      success: true,
      data: {
        campaign: {
          id: campaign.id,
          name: campaign.name,
          platform: campaign.platform,
          status: campaign.status,
        },
        metrics,
        dateRange: { start, end },
      },
    });
  })
);

/**
 * @api {get} /ad-insights/campaigns Get All Campaigns with Metrics
 * Get all campaigns with their current metrics
 */
router.get(
  '/campaigns',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { platform, status } = req.query;

    const where: any = { organizationId };
    if (platform) where.platform = platform;
    if (status) where.status = status;

    const campaigns = await prisma.adCampaign.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        dailyMetrics: {
          orderBy: { date: 'desc' },
          take: 7, // Last 7 days
        },
        _count: {
          select: {
            adLeads: true,
            adInteractions: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: campaigns.map(campaign => ({
        id: campaign.id,
        name: campaign.name,
        platform: campaign.platform,
        status: campaign.status,
        externalId: campaign.externalId,
        budget: campaign.budget,
        spend: campaign.spend,
        impressions: campaign.impressions,
        clicks: campaign.clicks,
        conversions: campaign.conversions,
        syncedAt: campaign.syncedAt,
        createdAt: campaign.createdAt,
        leadsCount: campaign._count.adLeads,
        interactionsCount: campaign._count.adInteractions,
        recentMetrics: campaign.dailyMetrics,
      })),
    });
  })
);

/**
 * @api {get} /ad-insights/summary Get Summary Metrics
 * Get aggregated summary of all ad campaigns
 */
router.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    // Get all campaigns
    const campaigns = await prisma.adCampaign.findMany({
      where: { organizationId },
      select: {
        platform: true,
        impressions: true,
        clicks: true,
        conversions: true,
        spend: true,
      },
    });

    // Get daily metrics for the period
    const dailyMetrics = await prisma.adCampaignDailyMetrics.findMany({
      where: {
        adCampaign: { organizationId },
        date: { gte: start, lte: end },
      },
      orderBy: { date: 'asc' },
    });

    // Aggregate by platform
    const platformSummary: Record<string, { impressions: number; clicks: number; conversions: number; spend: number; campaigns: number }> = {};
    for (const campaign of campaigns) {
      const platform = campaign.platform;
      if (!platformSummary[platform]) {
        platformSummary[platform] = { impressions: 0, clicks: 0, conversions: 0, spend: 0, campaigns: 0 };
      }
      platformSummary[platform].impressions += campaign.impressions || 0;
      platformSummary[platform].clicks += campaign.clicks || 0;
      platformSummary[platform].conversions += campaign.conversions || 0;
      platformSummary[platform].spend += campaign.spend?.toNumber() || 0;
      platformSummary[platform].campaigns++;
    }

    // Aggregate totals
    const totals = {
      impressions: campaigns.reduce((sum, c) => sum + (c.impressions || 0), 0),
      clicks: campaigns.reduce((sum, c) => sum + (c.clicks || 0), 0),
      conversions: campaigns.reduce((sum, c) => sum + (c.conversions || 0), 0),
      spend: campaigns.reduce((sum, c) => sum + (c.spend?.toNumber() || 0), 0),
      campaigns: campaigns.length,
    };

    // Calculate rates
    const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
    const conversionRate = totals.clicks > 0 ? (totals.conversions / totals.clicks) * 100 : 0;
    const cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
    const cpm = totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0;

    // Aggregate daily data for trend
    const dailyTrend = dailyMetrics.reduce((acc, metric) => {
      const dateKey = metric.date.toISOString().split('T')[0];
      if (!acc[dateKey]) {
        acc[dateKey] = { impressions: 0, clicks: 0, conversions: 0, spend: 0 };
      }
      acc[dateKey].impressions += metric.impressions;
      acc[dateKey].clicks += metric.clicks;
      acc[dateKey].conversions += metric.conversions;
      acc[dateKey].spend += metric.spend?.toNumber() || 0;
      return acc;
    }, {} as Record<string, { impressions: number; clicks: number; conversions: number; spend: number }>);

    res.json({
      success: true,
      data: {
        totals: {
          ...totals,
          ctr: ctr.toFixed(2),
          conversionRate: conversionRate.toFixed(2),
          cpc: cpc.toFixed(2),
          cpm: cpm.toFixed(2),
        },
        byPlatform: Object.entries(platformSummary).map(([platform, stats]) => ({
          platform,
          ...stats,
          ctr: stats.impressions > 0 ? ((stats.clicks / stats.impressions) * 100).toFixed(2) : '0.00',
          conversionRate: stats.clicks > 0 ? ((stats.conversions / stats.clicks) * 100).toFixed(2) : '0.00',
        })),
        dailyTrend: Object.entries(dailyTrend)
          .map(([date, stats]) => ({ date, ...stats }))
          .sort((a, b) => a.date.localeCompare(b.date)),
        dateRange: { start, end },
      },
    });
  })
);

export default router;
