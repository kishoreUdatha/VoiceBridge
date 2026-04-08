/**
 * Social CRM Service
 * Handles social media monitoring, mentions, and engagement tracking
 */

import { PrismaClient, SocialPlatform, MentionSentiment, MentionStatus } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

interface SocialProfileConfig {
  platform: SocialPlatform;
  profileUrl: string;
  username?: string;
  followers?: number;
}

interface ListeningQueryConfig {
  name: string;
  platforms: SocialPlatform[];
  keywords: string[];
  excludeKeywords?: string[];
  languages?: string[];
  locations?: string[];
  sentiment?: MentionSentiment[];
}

export const socialCrmService = {
  // ==================== Social Profiles ====================

  // Get social profiles for entity
  async getSocialProfiles(entityType: 'lead' | 'account' | 'contact', entityId: string) {
    const where: any = {};
    if (entityType === 'lead') where.leadId = entityId;
    if (entityType === 'account') where.accountId = entityId;
    if (entityType === 'contact') where.contactId = entityId;

    return prisma.socialProfile.findMany({ where });
  },

  // Add social profile
  async addSocialProfile(
    entityType: 'lead' | 'account' | 'contact',
    entityId: string,
    config: SocialProfileConfig
  ) {
    const data: any = {
      platform: config.platform,
      profileUrl: config.profileUrl,
      username: config.username,
      followers: config.followers,
    };

    if (entityType === 'lead') data.leadId = entityId;
    if (entityType === 'account') data.accountId = entityId;
    if (entityType === 'contact') data.contactId = entityId;

    return prisma.socialProfile.create({ data });
  },

  // Update social profile
  async updateSocialProfile(id: string, updates: Partial<SocialProfileConfig>) {
    return prisma.socialProfile.update({
      where: { id },
      data: {
        profileUrl: updates.profileUrl,
        username: updates.username,
        followers: updates.followers,
      },
    });
  },

  // Delete social profile
  async deleteSocialProfile(id: string) {
    return prisma.socialProfile.delete({ where: { id } });
  },

  // Enrich profile from platform
  async enrichSocialProfile(id: string) {
    const profile = await prisma.socialProfile.findUnique({ where: { id } });
    if (!profile) throw new Error('Profile not found');

    // Platform-specific enrichment would go here
    // For now, return the existing profile
    return profile;
  },

  // ==================== Social Mentions ====================

  // Get mentions
  async getMentions(organizationId: string, filters?: any) {
    const where: any = { organizationId };

    if (filters?.platform) where.platform = filters.platform;
    if (filters?.sentiment) where.sentiment = filters.sentiment;
    if (filters?.status) where.status = filters.status;
    if (filters?.queryId) where.queryId = filters.queryId;
    if (filters?.dateRange) {
      where.postedAt = {
        gte: filters.dateRange.start,
        lte: filters.dateRange.end,
      };
    }

    return prisma.socialMention.findMany({
      where,
      include: {
        query: { select: { id: true, name: true } },
        lead: { select: { id: true, name: true } },
      },
      orderBy: { postedAt: 'desc' },
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
    });
  },

  // Get single mention
  async getMention(id: string) {
    return prisma.socialMention.findUnique({
      where: { id },
      include: {
        query: true,
        lead: true,
        account: true,
      },
    });
  },

  // Create mention (from webhook or scraping)
  async createMention(
    organizationId: string,
    queryId: string | null,
    data: {
      platform: SocialPlatform;
      postId: string;
      postUrl: string;
      content: string;
      authorName?: string;
      authorUsername?: string;
      authorProfileUrl?: string;
      authorFollowers?: number;
      sentiment?: MentionSentiment;
      postedAt: Date;
      likes?: number;
      shares?: number;
      comments?: number;
      mediaUrls?: string[];
    }
  ) {
    // Check for duplicate
    const existing = await prisma.socialMention.findFirst({
      where: { organizationId, platform: data.platform, postId: data.postId },
    });

    if (existing) return existing;

    return prisma.socialMention.create({
      data: {
        organizationId,
        queryId,
        platform: data.platform,
        postId: data.postId,
        postUrl: data.postUrl,
        content: data.content,
        authorName: data.authorName,
        authorUsername: data.authorUsername,
        authorProfileUrl: data.authorProfileUrl,
        authorFollowers: data.authorFollowers,
        sentiment: data.sentiment || 'NEUTRAL',
        postedAt: data.postedAt,
        likes: data.likes || 0,
        shares: data.shares || 0,
        comments: data.comments || 0,
        mediaUrls: data.mediaUrls as any,
      },
    });
  },

  // Update mention status
  async updateMentionStatus(id: string, status: MentionStatus, notes?: string) {
    return prisma.socialMention.update({
      where: { id },
      data: { status, responseNotes: notes },
    });
  },

  // Link mention to lead
  async linkMentionToLead(mentionId: string, leadId: string) {
    return prisma.socialMention.update({
      where: { id: mentionId },
      data: { leadId },
    });
  },

  // Link mention to account
  async linkMentionToAccount(mentionId: string, accountId: string) {
    return prisma.socialMention.update({
      where: { id: mentionId },
      data: { accountId },
    });
  },

  // Analyze sentiment (basic implementation)
  async analyzeSentiment(content: string): Promise<MentionSentiment> {
    const positiveWords = ['love', 'great', 'amazing', 'excellent', 'awesome', 'fantastic', 'wonderful', 'best', 'happy', 'thanks', 'thank'];
    const negativeWords = ['hate', 'terrible', 'awful', 'bad', 'worst', 'horrible', 'disappointed', 'angry', 'frustrat', 'problem', 'issue', 'fail'];

    const lowerContent = content.toLowerCase();
    let positiveScore = 0;
    let negativeScore = 0;

    positiveWords.forEach((word) => {
      if (lowerContent.includes(word)) positiveScore++;
    });

    negativeWords.forEach((word) => {
      if (lowerContent.includes(word)) negativeScore++;
    });

    if (positiveScore > negativeScore + 1) return 'POSITIVE';
    if (negativeScore > positiveScore + 1) return 'NEGATIVE';
    return 'NEUTRAL';
  },

  // ==================== Listening Queries ====================

  // Get listening queries
  async getListeningQueries(organizationId: string) {
    return prisma.socialListeningQuery.findMany({
      where: { organizationId, isActive: true },
      include: {
        _count: { select: { mentions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  // Create listening query
  async createListeningQuery(organizationId: string, config: ListeningQueryConfig) {
    return prisma.socialListeningQuery.create({
      data: {
        organizationId,
        name: config.name,
        platforms: config.platforms as any,
        keywords: config.keywords as any,
        excludeKeywords: config.excludeKeywords as any,
        languages: config.languages as any,
        locations: config.locations as any,
        sentiment: config.sentiment as any,
      },
    });
  },

  // Update listening query
  async updateListeningQuery(id: string, updates: Partial<ListeningQueryConfig>) {
    return prisma.socialListeningQuery.update({
      where: { id },
      data: {
        name: updates.name,
        platforms: updates.platforms as any,
        keywords: updates.keywords as any,
        excludeKeywords: updates.excludeKeywords as any,
        languages: updates.languages as any,
        locations: updates.locations as any,
        sentiment: updates.sentiment as any,
      },
    });
  },

  // Deactivate listening query
  async deactivateListeningQuery(id: string) {
    return prisma.socialListeningQuery.update({
      where: { id },
      data: { isActive: false },
    });
  },

  // Execute listening query (would integrate with social APIs)
  async executeListeningQuery(queryId: string) {
    const query = await prisma.socialListeningQuery.findUnique({ where: { id: queryId } });
    if (!query) throw new Error('Query not found');

    // In production, this would call platform APIs
    // For now, update last run time
    await prisma.socialListeningQuery.update({
      where: { id: queryId },
      data: { lastRunAt: new Date() },
    });

    return { queryId, status: 'executed' };
  },

  // ==================== Analytics ====================

  // Get social analytics
  async getSocialAnalytics(organizationId: string, dateRange?: { start: Date; end: Date }) {
    const where: any = { organizationId };
    if (dateRange) {
      where.postedAt = { gte: dateRange.start, lte: dateRange.end };
    }

    const [byPlatform, bySentiment, byStatus, total, engagementTotals] = await Promise.all([
      prisma.socialMention.groupBy({
        by: ['platform'],
        where,
        _count: true,
      }),
      prisma.socialMention.groupBy({
        by: ['sentiment'],
        where,
        _count: true,
      }),
      prisma.socialMention.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      prisma.socialMention.count({ where }),
      prisma.socialMention.aggregate({
        where,
        _sum: {
          likes: true,
          shares: true,
          comments: true,
        },
        _avg: {
          authorFollowers: true,
        },
      }),
    ]);

    // Calculate sentiment ratio
    const positive = bySentiment.find((s) => s.sentiment === 'POSITIVE')?._count || 0;
    const negative = bySentiment.find((s) => s.sentiment === 'NEGATIVE')?._count || 0;
    const sentimentScore = total > 0 ? ((positive - negative) / total) * 100 : 0;

    return {
      total,
      byPlatform,
      bySentiment,
      byStatus,
      sentimentScore,
      totalEngagement: {
        likes: engagementTotals._sum.likes || 0,
        shares: engagementTotals._sum.shares || 0,
        comments: engagementTotals._sum.comments || 0,
      },
      avgAuthorFollowers: engagementTotals._avg.authorFollowers || 0,
    };
  },

  // Get trending topics from mentions
  async getTrendingTopics(organizationId: string, limit = 10) {
    const mentions = await prisma.socialMention.findMany({
      where: {
        organizationId,
        postedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      select: { content: true },
    });

    // Simple word frequency analysis
    const wordCounts: Record<string, number> = {};
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'of', 'from', 'with', 'as', 'by']);

    mentions.forEach((m) => {
      const words = m.content
        .toLowerCase()
        .replace(/[^a-z0-9\s#@]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 3 && !stopWords.has(w));

      words.forEach((word) => {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      });
    });

    return Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([word, count]) => ({ word, count }));
  },

  // Get influencers (high follower authors)
  async getInfluencers(organizationId: string, limit = 10) {
    const mentions = await prisma.socialMention.findMany({
      where: {
        organizationId,
        authorFollowers: { gt: 1000 },
      },
      orderBy: { authorFollowers: 'desc' },
      take: limit,
      distinct: ['authorUsername'],
      select: {
        authorName: true,
        authorUsername: true,
        authorProfileUrl: true,
        authorFollowers: true,
        platform: true,
        sentiment: true,
      },
    });

    return mentions;
  },

  // Convert mention to lead
  async convertMentionToLead(mentionId: string, organizationId: string, assignedToId?: string) {
    const mention = await prisma.socialMention.findUnique({ where: { id: mentionId } });
    if (!mention) throw new Error('Mention not found');

    // Create lead from mention data
    const lead = await prisma.lead.create({
      data: {
        organizationId,
        name: mention.authorName || mention.authorUsername || 'Social Lead',
        source: `social_${mention.platform.toLowerCase()}`,
        socialProfiles: [
          {
            platform: mention.platform,
            url: mention.authorProfileUrl,
            username: mention.authorUsername,
          },
        ] as any,
        notes: `Created from social mention: ${mention.postUrl}\n\nOriginal content: ${mention.content}`,
        assignedToId,
      },
    });

    // Link mention to lead
    await prisma.socialMention.update({
      where: { id: mentionId },
      data: { leadId: lead.id, status: 'CONVERTED' },
    });

    return lead;
  },
};
