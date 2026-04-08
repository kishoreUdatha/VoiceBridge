/**
 * Account-Based Marketing (ABM) Service
 * Handles target account management, campaigns, and engagement tracking
 */

import { PrismaClient, ABMTier, ABMCampaignStatus, ABMEngagementStage, ABMTriggerType } from '@prisma/client';

const prisma = new PrismaClient();

interface ABMCampaignConfig {
  name: string;
  description?: string;
  tier: ABMTier;
  targetAccounts: string[];
  goals?: Record<string, number>;
  budget?: number;
  startDate: Date;
  endDate?: Date;
}

interface ABMPlayConfig {
  name: string;
  description?: string;
  triggerType: ABMTriggerType;
  triggerConfig?: Record<string, any>;
  actions: any[];
  personalizationRules?: Record<string, any>;
  sequence?: number;
  delayDays?: number;
}

export const abmService = {
  // Get all ABM campaigns
  async getCampaigns(organizationId: string, filters?: any) {
    const where: any = { organizationId };
    if (filters?.status) where.status = filters.status;
    if (filters?.tier) where.tier = filters.tier;

    return prisma.aBMCampaign.findMany({
      where,
      include: {
        plays: { orderBy: { sequence: 'asc' } },
        _count: { select: { accountEngagement: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  // Get single campaign with details
  async getCampaign(id: string) {
    return prisma.aBMCampaign.findUnique({
      where: { id },
      include: {
        plays: { orderBy: { sequence: 'asc' } },
        accountEngagement: {
          orderBy: { engagementScore: 'desc' },
          take: 50,
        },
      },
    });
  },

  // Create ABM campaign
  async createCampaign(organizationId: string, userId: string, config: ABMCampaignConfig) {
    const campaign = await prisma.aBMCampaign.create({
      data: {
        organizationId,
        name: config.name,
        description: config.description,
        tier: config.tier,
        targetAccounts: config.targetAccounts as any,
        goals: config.goals as any,
        budget: config.budget,
        startDate: config.startDate,
        endDate: config.endDate,
        createdById: userId,
      },
    });

    // Initialize engagement tracking for target accounts
    await prisma.aBMAccountEngagement.createMany({
      data: config.targetAccounts.map((accountId) => ({
        campaignId: campaign.id,
        accountId,
      })),
    });

    return campaign;
  },

  // Update campaign
  async updateCampaign(id: string, updates: Partial<ABMCampaignConfig & { status?: ABMCampaignStatus }>) {
    return prisma.aBMCampaign.update({
      where: { id },
      data: {
        name: updates.name,
        description: updates.description,
        tier: updates.tier,
        targetAccounts: updates.targetAccounts as any,
        goals: updates.goals as any,
        budget: updates.budget,
        startDate: updates.startDate,
        endDate: updates.endDate,
        status: updates.status,
      },
    });
  },

  // Add play to campaign
  async addPlay(campaignId: string, config: ABMPlayConfig) {
    return prisma.aBMPlay.create({
      data: {
        campaignId,
        name: config.name,
        description: config.description,
        triggerType: config.triggerType,
        triggerConfig: config.triggerConfig as any,
        actions: config.actions as any,
        personalizationRules: config.personalizationRules as any,
        sequence: config.sequence || 0,
        delayDays: config.delayDays || 0,
      },
    });
  },

  // Update play
  async updatePlay(playId: string, updates: Partial<ABMPlayConfig>) {
    return prisma.aBMPlay.update({
      where: { id: playId },
      data: {
        name: updates.name,
        description: updates.description,
        triggerType: updates.triggerType,
        triggerConfig: updates.triggerConfig as any,
        actions: updates.actions as any,
        personalizationRules: updates.personalizationRules as any,
        sequence: updates.sequence,
        delayDays: updates.delayDays,
        isActive: updates.triggerType !== undefined ? true : undefined,
      },
    });
  },

  // Delete play
  async deletePlay(playId: string) {
    return prisma.aBMPlay.delete({ where: { id: playId } });
  },

  // Add accounts to campaign
  async addAccountsToCampaign(campaignId: string, accountIds: string[]) {
    const existing = await prisma.aBMAccountEngagement.findMany({
      where: { campaignId, accountId: { in: accountIds } },
      select: { accountId: true },
    });
    const existingIds = existing.map((e) => e.accountId);
    const newIds = accountIds.filter((id) => !existingIds.includes(id));

    if (newIds.length > 0) {
      await prisma.aBMAccountEngagement.createMany({
        data: newIds.map((accountId) => ({
          campaignId,
          accountId,
        })),
      });

      // Update campaign target accounts
      await prisma.aBMCampaign.update({
        where: { id: campaignId },
        data: {
          targetAccounts: { push: newIds },
        },
      });
    }

    return { added: newIds.length };
  },

  // Remove account from campaign
  async removeAccountFromCampaign(campaignId: string, accountId: string) {
    await prisma.aBMAccountEngagement.delete({
      where: { campaignId_accountId: { campaignId, accountId } },
    });

    const campaign = await prisma.aBMCampaign.findUnique({ where: { id: campaignId } });
    if (campaign) {
      const updatedTargets = (campaign.targetAccounts as string[]).filter((id) => id !== accountId);
      await prisma.aBMCampaign.update({
        where: { id: campaignId },
        data: { targetAccounts: updatedTargets as any },
      });
    }
  },

  // Track engagement event
  async trackEngagement(
    campaignId: string,
    accountId: string,
    eventType: string,
    metadata?: Record<string, any>
  ) {
    const engagement = await prisma.aBMAccountEngagement.findUnique({
      where: { campaignId_accountId: { campaignId, accountId } },
    });

    if (!engagement) return null;

    const updates: any = {
      lastActivityAt: new Date(),
      totalTouchpoints: { increment: 1 },
    };

    // Update specific metric
    switch (eventType) {
      case 'website_visit':
        updates.websiteVisits = { increment: 1 };
        updates.engagementScore = { increment: 1 };
        break;
      case 'email_open':
        updates.emailOpens = { increment: 1 };
        updates.engagementScore = { increment: 2 };
        break;
      case 'email_click':
        updates.emailClicks = { increment: 1 };
        updates.engagementScore = { increment: 5 };
        break;
      case 'ad_impression':
        updates.adImpressions = { increment: 1 };
        updates.engagementScore = { increment: 0.5 };
        break;
      case 'ad_click':
        updates.adClicks = { increment: 1 };
        updates.engagementScore = { increment: 3 };
        break;
      case 'content_download':
        updates.contentDownloads = { increment: 1 };
        updates.engagementScore = { increment: 10 };
        break;
      case 'meeting_held':
        updates.meetingsHeld = { increment: 1 };
        updates.engagementScore = { increment: 20 };
        break;
    }

    return prisma.aBMAccountEngagement.update({
      where: { campaignId_accountId: { campaignId, accountId } },
      data: updates,
    });
  },

  // Update engagement stage
  async updateEngagementStage(campaignId: string, accountId: string, stage: ABMEngagementStage) {
    return prisma.aBMAccountEngagement.update({
      where: { campaignId_accountId: { campaignId, accountId } },
      data: { stage, stageChangedAt: new Date() },
    });
  },

  // Get account engagement details
  async getAccountEngagement(campaignId: string, accountId: string) {
    return prisma.aBMAccountEngagement.findUnique({
      where: { campaignId_accountId: { campaignId, accountId } },
    });
  },

  // Get campaign analytics
  async getCampaignAnalytics(campaignId: string) {
    const campaign = await prisma.aBMCampaign.findUnique({
      where: { id: campaignId },
      include: { accountEngagement: true },
    });

    if (!campaign) return null;

    const engagements = campaign.accountEngagement;
    const totalAccounts = engagements.length;

    // Stage distribution
    const byStage: Record<string, number> = {};
    let totalEngagementScore = 0;
    let engagedAccounts = 0;

    for (const eng of engagements) {
      byStage[eng.stage] = (byStage[eng.stage] || 0) + 1;
      totalEngagementScore += eng.engagementScore;
      if (eng.engagementScore > 0) engagedAccounts++;
    }

    // Totals
    const totals = engagements.reduce(
      (acc, eng) => ({
        websiteVisits: acc.websiteVisits + eng.websiteVisits,
        emailOpens: acc.emailOpens + eng.emailOpens,
        emailClicks: acc.emailClicks + eng.emailClicks,
        adImpressions: acc.adImpressions + eng.adImpressions,
        adClicks: acc.adClicks + eng.adClicks,
        contentDownloads: acc.contentDownloads + eng.contentDownloads,
        meetingsHeld: acc.meetingsHeld + eng.meetingsHeld,
      }),
      {
        websiteVisits: 0,
        emailOpens: 0,
        emailClicks: 0,
        adImpressions: 0,
        adClicks: 0,
        contentDownloads: 0,
        meetingsHeld: 0,
      }
    );

    return {
      campaignId,
      totalAccounts,
      engagedAccounts,
      engagementRate: totalAccounts > 0 ? (engagedAccounts / totalAccounts) * 100 : 0,
      avgEngagementScore: totalAccounts > 0 ? totalEngagementScore / totalAccounts : 0,
      byStage,
      totals,
      goals: campaign.goals,
      budget: campaign.budget,
      metrics: {
        accountsEngaged: campaign.accountsEngaged,
        contactsReached: campaign.contactsReached,
        meetingsBooked: campaign.meetingsBooked,
        opportunitiesCreated: campaign.opportunitiesCreated,
        pipelineGenerated: campaign.pipelineGenerated,
        revenueWon: campaign.revenueWon,
      },
    };
  },

  // Update campaign metrics
  async updateCampaignMetrics(campaignId: string) {
    const engagements = await prisma.aBMAccountEngagement.findMany({
      where: { campaignId },
    });

    const metrics = {
      accountsEngaged: engagements.filter((e) => e.engagementScore > 0).length,
      meetingsBooked: engagements.reduce((sum, e) => sum + e.meetingsHeld, 0),
    };

    return prisma.aBMCampaign.update({
      where: { id: campaignId },
      data: metrics,
    });
  },

  // Get target account recommendations
  async getTargetAccountRecommendations(organizationId: string, limit = 20) {
    // Find accounts with high potential that aren't in any ABM campaign
    const accountsInCampaigns = await prisma.aBMAccountEngagement.findMany({
      select: { accountId: true },
    });
    const accountIdsInCampaigns = accountsInCampaigns.map((a) => a.accountId);

    return prisma.account.findMany({
      where: {
        organizationId,
        id: { notIn: accountIdsInCampaigns },
        OR: [
          { tier: 'ENTERPRISE' },
          { annualRevenue: { gte: 1000000 } },
          { healthScore: { gte: 70 } },
        ],
      },
      orderBy: [
        { healthScore: 'desc' },
        { annualRevenue: 'desc' },
      ],
      take: limit,
    });
  },
};
