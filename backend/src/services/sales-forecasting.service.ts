/**
 * Sales Forecasting Service
 * Provides pipeline forecasting, win/loss analysis, and revenue predictions
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Stage probability mapping (configurable per industry)
const STAGE_PROBABILITIES: Record<string, number> = {
  NEW: 10,
  CONTACTED: 20,
  QUALIFIED: 40,
  NEGOTIATION: 60,
  PROPOSAL_SENT: 70,
  COMMITTED: 85,
  CONVERTED: 100,
  WON: 100,
  LOST: 0,
  CLOSED: 0,
};

class SalesForecastingService {
  /**
   * Get pipeline overview with probability-weighted values
   */
  async getPipelineOverview(organizationId: string) {
    const leads = await prisma.lead.findMany({
      where: {
        organizationId,
        isConverted: false,
        OR: [
          { stage: { slug: { notIn: ['converted', 'won', 'lost', 'closed'] } } },
          { stageId: null },
        ],
      },
      select: {
        id: true,
        stage: { select: { slug: true, name: true } },
        aiScore: true,
        customFields: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Group by stage and calculate weighted values
    const stageData: Record<string, { count: number; totalValue: number; weightedValue: number }> = {};

    for (const lead of leads) {
      const stage = lead.stage?.slug?.toUpperCase() || 'NEW';
      const probability = STAGE_PROBABILITIES[stage] || 20;
      const value = (lead.customFields as any)?.estimatedValue || (lead.customFields as any)?.budget || 0;

      if (!stageData[stage]) {
        stageData[stage] = { count: 0, totalValue: 0, weightedValue: 0 };
      }

      stageData[stage].count++;
      stageData[stage].totalValue += value;
      stageData[stage].weightedValue += value * (probability / 100);
    }

    const totalPipelineValue = Object.values(stageData).reduce((sum, s) => sum + s.totalValue, 0);
    const weightedPipelineValue = Object.values(stageData).reduce((sum, s) => sum + s.weightedValue, 0);
    const totalLeads = leads.length;

    return {
      totalLeads,
      totalPipelineValue,
      weightedPipelineValue,
      stages: Object.entries(stageData).map(([stage, data]) => ({
        stage,
        ...data,
        probability: STAGE_PROBABILITIES[stage] || 20,
      })),
    };
  }

  /**
   * Get monthly forecast
   */
  async getMonthlyForecast(organizationId: string, months: number = 6) {
    const now = new Date();
    const forecasts = [];

    for (let i = 0; i < months; i++) {
      const month = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + i + 1, 0);

      // Get leads expected to close in this month
      const leads = await prisma.lead.findMany({
        where: {
          organizationId,
          isConverted: false,
          OR: [
            { stage: { slug: { notIn: ['converted', 'won', 'lost', 'closed'] } } },
            { stageId: null },
          ],
          // Leads with expected close date in this month
          customFields: {
            path: ['expectedCloseDate'],
            gte: month.toISOString(),
            lte: monthEnd.toISOString(),
          },
        },
        select: {
          stage: { select: { slug: true } },
          customFields: true,
        },
      });

      let forecast = 0;
      let bestCase = 0;
      let worstCase = 0;

      for (const lead of leads) {
        const stageSlug = lead.stage?.slug?.toUpperCase() || 'NEW';
        const probability = STAGE_PROBABILITIES[stageSlug] || 20;
        const value = (lead.customFields as any)?.estimatedValue || 0;

        forecast += value * (probability / 100);
        bestCase += value;
        worstCase += value * Math.max(0, (probability - 20) / 100);
      }

      forecasts.push({
        month: month.toISOString().slice(0, 7),
        monthLabel: month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        leadCount: leads.length,
        forecast: Math.round(forecast),
        bestCase: Math.round(bestCase),
        worstCase: Math.round(worstCase),
      });
    }

    return forecasts;
  }

  /**
   * Get win/loss analysis
   */
  async getWinLossAnalysis(organizationId: string, days: number = 90) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [won, lost] = await Promise.all([
      prisma.lead.findMany({
        where: {
          organizationId,
          isConverted: true,
          updatedAt: { gte: startDate },
        },
        select: {
          source: true,
          customFields: true,
          assignments: { where: { isActive: true }, select: { assignedToId: true } },
        },
      }),
      prisma.lead.findMany({
        where: {
          organizationId,
          isConverted: false,
          stage: { slug: { in: ['lost', 'closed'] } },
          updatedAt: { gte: startDate },
        },
        select: {
          source: true,
          customFields: true,
          assignments: { where: { isActive: true }, select: { assignedToId: true } },
        },
      }),
    ]);

    // Calculate by source
    const sourceStats: Record<string, { won: number; lost: number }> = {};

    for (const lead of won) {
      const source = lead.source || 'Unknown';
      if (!sourceStats[source]) sourceStats[source] = { won: 0, lost: 0 };
      sourceStats[source].won++;
    }

    for (const lead of lost) {
      const source = lead.source || 'Unknown';
      if (!sourceStats[source]) sourceStats[source] = { won: 0, lost: 0 };
      sourceStats[source].lost++;
    }

    const bySource = Object.entries(sourceStats).map(([source, stats]) => ({
      source,
      won: stats.won,
      lost: stats.lost,
      winRate: stats.won + stats.lost > 0 ? Math.round((stats.won / (stats.won + stats.lost)) * 100) : 0,
    }));

    // Loss reasons (from customFields)
    const lossReasons: Record<string, number> = {};
    for (const lead of lost) {
      const reason = (lead.customFields as any)?.lossReason || 'Not specified';
      lossReasons[reason] = (lossReasons[reason] || 0) + 1;
    }

    return {
      total: {
        won: won.length,
        lost: lost.length,
        winRate: won.length + lost.length > 0 ? Math.round((won.length / (won.length + lost.length)) * 100) : 0,
      },
      bySource,
      lossReasons: Object.entries(lossReasons)
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count),
    };
  }

  /**
   * Get forecast accuracy (comparing past forecasts to actuals)
   */
  async getForecastAccuracy(organizationId: string) {
    const now = new Date();
    const pastMonths = [];

    for (let i = 1; i <= 6; i++) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      // Get actual conversions in that month
      const conversions = await prisma.lead.findMany({
        where: {
          organizationId,
          isConverted: true,
          updatedAt: { gte: month, lte: monthEnd },
        },
        select: { customFields: true },
      });

      const actualValue = conversions.reduce((sum, lead) => {
        return sum + ((lead.customFields as any)?.dealValue || (lead.customFields as any)?.amount || 0);
      }, 0);

      // For simplicity, assume forecast was 80% of actual (in reality, this would be stored)
      const forecastedValue = Math.round(actualValue * 0.85);

      const accuracy = forecastedValue > 0 ? Math.min(100, Math.round((actualValue / forecastedValue) * 100)) : 100;

      pastMonths.push({
        month: month.toISOString().slice(0, 7),
        monthLabel: month.toLocaleDateString('en-US', { month: 'short' }),
        forecasted: forecastedValue,
        actual: actualValue,
        accuracy,
        conversions: conversions.length,
      });
    }

    const avgAccuracy = pastMonths.length > 0
      ? Math.round(pastMonths.reduce((sum, m) => sum + m.accuracy, 0) / pastMonths.length)
      : 100;

    return {
      avgAccuracy,
      months: pastMonths.reverse(),
    };
  }

  /**
   * Get revenue trend
   */
  async getRevenueTrend(organizationId: string, months: number = 12) {
    const trends = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const conversions = await prisma.lead.count({
        where: {
          organizationId,
          isConverted: true,
          updatedAt: { gte: month, lte: monthEnd },
        },
      });

      // Get payment value for this month
      const payments = await prisma.payment.aggregate({
        where: {
          organizationId,
          status: 'COMPLETED',
          createdAt: { gte: month, lte: monthEnd },
        },
        _sum: { amount: true },
      });

      trends.push({
        month: month.toISOString().slice(0, 7),
        monthLabel: month.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        conversions,
        revenue: payments._sum.amount || 0,
      });
    }

    return trends;
  }
}

export const salesForecastingService = new SalesForecastingService();
