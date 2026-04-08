/**
 * Sentiment Analysis Service
 * Extract sentiment from call transcripts, conversation tone analysis
 */

import { PrismaClient, SentimentSource, SentimentScore, HealthTrend } from '@prisma/client';

const prisma = new PrismaClient();

// Sentiment keywords for basic analysis (in production, use NLP/ML API)
const POSITIVE_KEYWORDS = [
  'thank', 'thanks', 'great', 'excellent', 'amazing', 'wonderful', 'perfect', 'love',
  'happy', 'satisfied', 'helpful', 'appreciate', 'good', 'nice', 'pleased', 'fantastic',
  'awesome', 'brilliant', 'outstanding', 'impressed', 'delighted', 'grateful',
];

const NEGATIVE_KEYWORDS = [
  'bad', 'terrible', 'awful', 'horrible', 'worst', 'hate', 'angry', 'frustrated',
  'disappointed', 'unhappy', 'problem', 'issue', 'complaint', 'poor', 'unacceptable',
  'ridiculous', 'disgusting', 'useless', 'pathetic', 'annoyed', 'upset', 'furious',
];

const EMOTION_KEYWORDS: Record<string, string[]> = {
  joy: ['happy', 'excited', 'thrilled', 'delighted', 'pleased', 'grateful'],
  anger: ['angry', 'furious', 'mad', 'annoyed', 'frustrated', 'irritated'],
  sadness: ['sad', 'disappointed', 'unhappy', 'depressed', 'upset'],
  fear: ['worried', 'anxious', 'scared', 'concerned', 'nervous'],
  surprise: ['surprised', 'shocked', 'amazed', 'astonished'],
};

class SentimentAnalysisService {
  /**
   * Analyze sentiment of text
   */
  analyzeTextSentiment(text: string): {
    sentimentScore: number;
    overallSentiment: SentimentScore;
    magnitude: number;
    emotions: Record<string, number>;
    keyPhrases: string[];
  } {
    const lowerText = text.toLowerCase();
    const words = lowerText.split(/\s+/);

    // Count positive and negative words
    let positiveCount = 0;
    let negativeCount = 0;
    const foundKeyPhrases: string[] = [];

    for (const word of words) {
      if (POSITIVE_KEYWORDS.some(kw => word.includes(kw))) {
        positiveCount++;
        foundKeyPhrases.push(word);
      }
      if (NEGATIVE_KEYWORDS.some(kw => word.includes(kw))) {
        negativeCount++;
        foundKeyPhrases.push(word);
      }
    }

    // Calculate sentiment score (-1 to 1)
    const total = positiveCount + negativeCount;
    let sentimentScore = 0;
    if (total > 0) {
      sentimentScore = (positiveCount - negativeCount) / total;
    }

    // Determine overall sentiment
    let overallSentiment: SentimentScore = 'NEUTRAL';
    if (sentimentScore >= 0.5) overallSentiment = 'VERY_POSITIVE';
    else if (sentimentScore >= 0.2) overallSentiment = 'POSITIVE';
    else if (sentimentScore <= -0.5) overallSentiment = 'VERY_NEGATIVE';
    else if (sentimentScore <= -0.2) overallSentiment = 'NEGATIVE';

    // Calculate magnitude (strength of sentiment)
    const magnitude = total / words.length;

    // Detect emotions
    const emotions: Record<string, number> = {};
    for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
      const count = keywords.filter(kw => lowerText.includes(kw)).length;
      if (count > 0) {
        emotions[emotion] = count / keywords.length;
      }
    }

    return {
      sentimentScore,
      overallSentiment,
      magnitude,
      emotions,
      keyPhrases: [...new Set(foundKeyPhrases)].slice(0, 10),
    };
  }

  /**
   * Analyze sentiment for a call
   */
  async analyzeCallSentiment(callLogId: string, organizationId: string): Promise<{
    sentimentScore: number;
    overallSentiment: SentimentScore;
    emotions: Record<string, number>;
    summary: string;
  }> {
    const callLog = await prisma.callLog.findUnique({
      where: { id: callLogId },
      include: { lead: true },
    });

    if (!callLog) throw new Error('Call log not found');
    if (!callLog.transcript) throw new Error('No transcript available for analysis');

    const analysis = this.analyzeTextSentiment(callLog.transcript);

    // Determine customer mood
    let customerMood = 'Neutral';
    if (analysis.sentimentScore >= 0.3) customerMood = 'Happy';
    else if (analysis.sentimentScore >= 0.1) customerMood = 'Satisfied';
    else if (analysis.sentimentScore <= -0.3) customerMood = 'Frustrated';
    else if (analysis.sentimentScore <= -0.1) customerMood = 'Unhappy';

    // Calculate escalation risk
    const escalationRisk = analysis.sentimentScore < -0.3 ? 0.8 :
      analysis.sentimentScore < 0 ? 0.4 : 0.1;

    // Generate summary
    const summary = this.generateSummary(analysis, callLog.duration || 0);

    // Store sentiment analysis
    await prisma.sentimentAnalysis.upsert({
      where: { callLogId },
      update: {
        overallSentiment: analysis.overallSentiment,
        sentimentScore: analysis.sentimentScore,
        magnitude: analysis.magnitude,
        emotions: analysis.emotions,
        keyPhrases: analysis.keyPhrases,
        customerMood,
        escalationRisk,
        summary,
        analyzedAt: new Date(),
      },
      create: {
        organizationId,
        leadId: callLog.leadId,
        callLogId,
        source: 'CALL',
        overallSentiment: analysis.overallSentiment,
        sentimentScore: analysis.sentimentScore,
        magnitude: analysis.magnitude,
        emotions: analysis.emotions,
        keyPhrases: analysis.keyPhrases,
        customerMood,
        escalationRisk,
        summary,
      },
    });

    return {
      sentimentScore: analysis.sentimentScore,
      overallSentiment: analysis.overallSentiment,
      emotions: analysis.emotions,
      summary,
    };
  }

  /**
   * Generate summary from analysis
   */
  private generateSummary(analysis: any, duration: number): string {
    const durationMins = Math.floor(duration / 60);
    const sentimentText = analysis.sentimentScore >= 0.2 ? 'positive' :
      analysis.sentimentScore <= -0.2 ? 'negative' : 'neutral';

    const emotionText = Object.keys(analysis.emotions).length > 0
      ? `Detected emotions: ${Object.keys(analysis.emotions).join(', ')}.`
      : '';

    return `${durationMins} minute call with ${sentimentText} sentiment. ${emotionText}`;
  }

  /**
   * Analyze sentiment for a message (chat/email/whatsapp)
   */
  async analyzeMessageSentiment(data: {
    organizationId: string;
    leadId?: string;
    messageId: string;
    content: string;
    source: SentimentSource;
  }) {
    const analysis = this.analyzeTextSentiment(data.content);

    return prisma.sentimentAnalysis.create({
      data: {
        organizationId: data.organizationId,
        leadId: data.leadId,
        messageId: data.messageId,
        source: data.source,
        overallSentiment: analysis.overallSentiment,
        sentimentScore: analysis.sentimentScore,
        magnitude: analysis.magnitude,
        emotions: analysis.emotions,
        keyPhrases: analysis.keyPhrases,
      },
    });
  }

  /**
   * Get sentiment for a lead
   */
  async getLeadSentiment(leadId: string) {
    const [analyses, trend] = await Promise.all([
      prisma.sentimentAnalysis.findMany({
        where: { leadId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.sentimentTrend.findFirst({
        where: { leadId },
        orderBy: { periodStart: 'desc' },
      }),
    ]);

    // Calculate average sentiment
    const avgSentiment = analyses.length > 0
      ? analyses.reduce((sum, a) => sum + a.sentimentScore, 0) / analyses.length
      : 0;

    return {
      analyses,
      avgSentiment,
      trend,
      totalAnalyzed: analyses.length,
    };
  }

  /**
   * Calculate sentiment trends for period
   */
  async calculateSentimentTrends(organizationId: string, period: 'daily' | 'weekly' | 'monthly') {
    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date;

    switch (period) {
      case 'daily':
        periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        periodEnd = new Date(periodStart.getTime() + 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        const dayOfWeek = now.getDay();
        periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
        periodEnd = new Date(periodStart.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
    }

    const analyses = await prisma.sentimentAnalysis.findMany({
      where: {
        organizationId,
        createdAt: { gte: periodStart, lt: periodEnd },
      },
    });

    if (analyses.length === 0) return null;

    const avgSentiment = analyses.reduce((sum, a) => sum + a.sentimentScore, 0) / analyses.length;
    const positiveCount = analyses.filter(a => a.sentimentScore > 0.1).length;
    const negativeCount = analyses.filter(a => a.sentimentScore < -0.1).length;
    const neutralCount = analyses.length - positiveCount - negativeCount;

    // Aggregate topics
    const allTopics: Record<string, number> = {};
    for (const a of analyses) {
      const keyPhrases = a.keyPhrases as string[] || [];
      for (const phrase of keyPhrases) {
        allTopics[phrase] = (allTopics[phrase] || 0) + 1;
      }
    }

    const sortedTopics = Object.entries(allTopics)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const topPositiveTopics = sortedTopics.filter(([topic]) =>
      POSITIVE_KEYWORDS.some(kw => topic.includes(kw))
    );
    const topNegativeTopics = sortedTopics.filter(([topic]) =>
      NEGATIVE_KEYWORDS.some(kw => topic.includes(kw))
    );

    // Determine trend direction
    const previousTrend = await prisma.sentimentTrend.findFirst({
      where: { organizationId, period, periodStart: { lt: periodStart } },
      orderBy: { periodStart: 'desc' },
    });

    let trendDirection: HealthTrend = 'STABLE';
    if (previousTrend) {
      const diff = avgSentiment - previousTrend.avgSentiment;
      if (diff > 0.1) trendDirection = 'IMPROVING';
      else if (diff < -0.1) trendDirection = 'DECLINING';
    }

    // Store trend
    return prisma.sentimentTrend.upsert({
      where: {
        organizationId_leadId_userId_period_periodStart: {
          organizationId,
          leadId: null,
          userId: null,
          period,
          periodStart,
        },
      },
      update: {
        avgSentiment,
        positiveCount,
        negativeCount,
        neutralCount,
        totalAnalyzed: analyses.length,
        topPositiveTopics,
        topNegativeTopics,
        trendDirection,
      },
      create: {
        organizationId,
        period,
        periodStart,
        periodEnd,
        avgSentiment,
        positiveCount,
        negativeCount,
        neutralCount,
        totalAnalyzed: analyses.length,
        topPositiveTopics,
        topNegativeTopics,
        trendDirection,
      },
    });
  }

  /**
   * Get sentiment dashboard data
   */
  async getDashboardData(organizationId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      recentAnalyses,
      sentimentDistribution,
      sourceDistribution,
      trends,
      topNegative,
    ] = await Promise.all([
      // Recent analyses
      prisma.sentimentAnalysis.findMany({
        where: { organizationId, createdAt: { gte: thirtyDaysAgo } },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          lead: { select: { id: true, firstName: true, lastName: true } },
          callLog: { select: { id: true, duration: true } },
        },
      }),
      // Sentiment distribution
      prisma.sentimentAnalysis.groupBy({
        by: ['overallSentiment'],
        where: { organizationId, createdAt: { gte: thirtyDaysAgo } },
        _count: true,
      }),
      // Source distribution
      prisma.sentimentAnalysis.groupBy({
        by: ['source'],
        where: { organizationId, createdAt: { gte: thirtyDaysAgo } },
        _count: true,
        _avg: { sentimentScore: true },
      }),
      // Trends over time
      prisma.sentimentTrend.findMany({
        where: { organizationId, leadId: null, period: 'daily' },
        orderBy: { periodStart: 'desc' },
        take: 30,
      }),
      // Top negative sentiment conversations
      prisma.sentimentAnalysis.findMany({
        where: { organizationId, sentimentScore: { lt: -0.3 }, createdAt: { gte: thirtyDaysAgo } },
        orderBy: { sentimentScore: 'asc' },
        take: 10,
        include: {
          lead: { select: { id: true, firstName: true, lastName: true, phone: true } },
        },
      }),
    ]);

    // Calculate overall stats
    const stats = await prisma.sentimentAnalysis.aggregate({
      where: { organizationId, createdAt: { gte: thirtyDaysAgo } },
      _avg: { sentimentScore: true, escalationRisk: true },
      _count: true,
    });

    return {
      recentAnalyses,
      sentimentDistribution,
      sourceDistribution,
      trends,
      topNegative,
      stats: {
        avgSentiment: stats._avg.sentimentScore || 0,
        avgEscalationRisk: stats._avg.escalationRisk || 0,
        totalAnalyzed: stats._count || 0,
      },
    };
  }

  /**
   * Batch analyze calls with transcripts
   */
  async batchAnalyzeCalls(organizationId: string, limit: number = 50) {
    const callLogs = await prisma.callLog.findMany({
      where: {
        organizationId,
        transcript: { not: null },
        sentimentAnalysis: null,
      },
      take: limit,
    });

    const results = [];
    for (const call of callLogs) {
      try {
        const sentiment = await this.analyzeCallSentiment(call.id, organizationId);
        results.push({ callLogId: call.id, success: true, ...sentiment });
      } catch (error) {
        results.push({ callLogId: call.id, success: false, error: (error as Error).message });
      }
    }

    return { processed: results.length, results };
  }
}

export const sentimentAnalysisService = new SentimentAnalysisService();
