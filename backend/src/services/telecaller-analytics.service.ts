/**
 * Telecaller Analytics Service
 * Handles performance tracking for human telecallers
 */

import { prisma } from '../config/database';

interface LeaderboardOptions {
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  branchId?: string;      // For manager: filter by branch
  managerId?: string;     // For team lead: filter by assigned telecallers
}

class TelecallerAnalyticsService {
  async aggregateDailyPerformance(organizationId: string, date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const telecallers = await prisma.user.findMany({
      where: { organizationId, role: 'TELECALLER', isActive: true },
      select: { id: true, firstName: true, lastName: true },
    });

    for (const telecaller of telecallers) {
      const telecallerName = telecaller.firstName + ' ' + telecaller.lastName;
      const calls = await prisma.telecallerCall.findMany({
        where: { telecallerId: telecaller.id, createdAt: { gte: startOfDay, lte: endOfDay } },
      });

      if (calls.length === 0) continue;

      const totalCalls = calls.length;
      const answeredCalls = calls.filter((c) => c.status === 'COMPLETED' && c.duration && c.duration > 0).length;
      const totalDuration = calls.reduce((sum, c) => sum + (c.duration || 0), 0);
      const interestedCount = calls.filter((c) => c.outcome === 'INTERESTED').length;
      const convertedCount = calls.filter((c) => c.outcome === 'CONVERTED').length;
      const callbacksRequested = calls.filter((c) => c.outcome === 'CALLBACK').length;
      const noAnswerCount = calls.filter((c) => c.outcome === 'NO_ANSWER').length;
      const wrongNumberCount = calls.filter((c) => c.outcome === 'WRONG_NUMBER').length;
      const busyCount = calls.filter((c) => c.outcome === 'BUSY').length;
      const notInterestedCount = calls.filter((c) => c.outcome === 'NOT_INTERESTED').length;
      const positiveCallsCount = calls.filter((c) => c.sentiment === 'positive').length;
      const negativeCallsCount = calls.filter((c) => c.sentiment === 'negative').length;

      const avgCallDuration = answeredCalls > 0 ? Math.round(totalDuration / answeredCalls) : 0;
      const conversionRate = answeredCalls > 0 ? (convertedCount / answeredCalls) * 100 : 0;
      const answerRate = totalCalls > 0 ? (answeredCalls / totalCalls) * 100 : 0;
      const avgSentimentScore = answeredCalls > 0 ? (positiveCallsCount - negativeCallsCount) / answeredCalls : 0;

      await prisma.telecallerPerformanceDaily.upsert({
        where: { organizationId_telecallerId_date: { organizationId, telecallerId: telecaller.id, date: startOfDay } },
        create: {
          organizationId, telecallerId: telecaller.id, telecallerName, date: startOfDay,
          totalCalls, answeredCalls, avgCallDuration, totalTalkTime: totalDuration,
          interestedCount, convertedCount, callbacksRequested, noAnswerCount, wrongNumberCount, busyCount, notInterestedCount,
          avgSentimentScore, positiveCallsCount, negativeCallsCount, conversionRate, answerRate,
        },
        update: {
          telecallerName, totalCalls, answeredCalls, avgCallDuration, totalTalkTime: totalDuration,
          interestedCount, convertedCount, callbacksRequested, noAnswerCount, wrongNumberCount, busyCount, notInterestedCount,
          avgSentimentScore, positiveCallsCount, negativeCallsCount, conversionRate, answerRate,
        },
      });
    }
    return { success: true, telecallersProcessed: telecallers.length };
  }

  async getTelecallerLeaderboard(organizationId: string, metric: string = 'calls', options: LeaderboardOptions = {}) {
    const { startDate, endDate, limit = 50, branchId, managerId } = options;
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);

    // Get telecaller IDs based on filters (branch or manager)
    let telecallerIds: string[] | undefined;

    if (branchId || managerId) {
      const telecallerFilter: any = {
        organizationId,
        role: { slug: 'telecaller' },
        isActive: true,
      };

      if (branchId) {
        telecallerFilter.branchId = branchId;
      }

      if (managerId) {
        telecallerFilter.managerId = managerId;
      }

      const telecallers = await prisma.user.findMany({
        where: telecallerFilter,
        select: { id: true },
      });

      telecallerIds = telecallers.map((t) => t.id);

      // If no telecallers match the filter, return empty
      if (telecallerIds.length === 0) {
        return [];
      }
    }

    const whereClause: any = {
      organizationId,
      date: { gte: startDate || defaultStartDate, lte: endDate || new Date() },
    };

    if (telecallerIds) {
      whereClause.telecallerId = { in: telecallerIds };
    }

    const performance = await prisma.telecallerPerformanceDaily.groupBy({
      by: ['telecallerId', 'telecallerName'],
      where: whereClause,
      _sum: { totalCalls: true, answeredCalls: true, interestedCount: true, convertedCount: true, callbacksRequested: true, noAnswerCount: true, notInterestedCount: true, totalTalkTime: true },
      _avg: { conversionRate: true, answerRate: true, avgSentimentScore: true },
    });

    // Get branch info for each telecaller
    const telecallerBranches = await prisma.user.findMany({
      where: { id: { in: performance.map((p: any) => p.telecallerId) } },
      select: {
        id: true,
        branch: { select: { id: true, name: true, code: true } },
        manager: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const branchMap = new Map(telecallerBranches.map((t) => [t.id, { branch: t.branch, manager: t.manager }]));

    const sorted = performance.sort((a: any, b: any) => {
      if (metric === 'conversions') return (b._sum.convertedCount || 0) - (a._sum.convertedCount || 0);
      if (metric === 'interested') return (b._sum.interestedCount || 0) - (a._sum.interestedCount || 0);
      if (metric === 'sentiment') return (b._avg.avgSentimentScore || 0) - (a._avg.avgSentimentScore || 0);
      return (b._sum.totalCalls || 0) - (a._sum.totalCalls || 0);
    });

    return sorted.slice(0, limit).map((t: any, i: number) => {
      const info = branchMap.get(t.telecallerId);
      return {
        rank: i + 1,
        telecallerId: t.telecallerId,
        telecallerName: t.telecallerName,
        branch: info?.branch || null,
        manager: info?.manager || null,
        metrics: {
          totalCalls: t._sum.totalCalls || 0,
          answeredCalls: t._sum.answeredCalls || 0,
          interestedCount: t._sum.interestedCount || 0,
          convertedCount: t._sum.convertedCount || 0,
          callbacksRequested: t._sum.callbacksRequested || 0,
          noAnswerCount: t._sum.noAnswerCount || 0,
          notInterestedCount: t._sum.notInterestedCount || 0,
          totalTalkTime: t._sum.totalTalkTime || 0,
          avgConversionRate: Math.round((t._avg.conversionRate || 0) * 100) / 100,
          avgAnswerRate: Math.round((t._avg.answerRate || 0) * 100) / 100,
          avgSentimentScore: Math.round((t._avg.avgSentimentScore || 0) * 100) / 100,
        },
      };
    });
  }

  // Get daily report for today with role-based filtering
  async getDailyReport(organizationId: string, date: Date, options: { branchId?: string; managerId?: string } = {}) {
    const { branchId, managerId } = options;
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get telecaller IDs based on filters
    const telecallerFilter: any = {
      organizationId,
      role: { slug: 'telecaller' },
      isActive: true,
    };

    if (branchId) {
      telecallerFilter.branchId = branchId;
    }

    if (managerId) {
      telecallerFilter.managerId = managerId;
    }

    const telecallers = await prisma.user.findMany({
      where: telecallerFilter,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        branch: { select: { id: true, name: true, code: true } },
        manager: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const telecallerIds = telecallers.map((t) => t.id);

    // Get today's calls for these telecallers
    const calls = await prisma.telecallerCall.findMany({
      where: {
        organizationId,
        telecallerId: { in: telecallerIds },
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
    });

    // Aggregate by telecaller - track all outcomes
    const telecallerStats = telecallers.map((telecaller) => {
      const telecallerCalls = calls.filter((c) => c.telecallerId === telecaller.id);
      const totalCalls = telecallerCalls.length;
      const answered = telecallerCalls.filter((c) => c.status === 'COMPLETED' && c.duration && c.duration > 0).length;

      // All call outcomes from telecaller app
      const interested = telecallerCalls.filter((c) => c.outcome === 'INTERESTED').length;
      const notInterested = telecallerCalls.filter((c) => c.outcome === 'NOT_INTERESTED').length;
      const callback = telecallerCalls.filter((c) => c.outcome === 'CALLBACK').length;
      const converted = telecallerCalls.filter((c) => c.outcome === 'CONVERTED').length;
      const noAnswer = telecallerCalls.filter((c) => c.outcome === 'NO_ANSWER').length;
      const busy = telecallerCalls.filter((c) => c.outcome === 'BUSY').length;
      const wrongNumber = telecallerCalls.filter((c) => c.outcome === 'WRONG_NUMBER').length;
      const voicemail = telecallerCalls.filter((c) => c.outcome === 'VOICEMAIL').length;

      const totalDuration = telecallerCalls.reduce((sum, c) => sum + (c.duration || 0), 0);

      return {
        telecallerId: telecaller.id,
        telecallerName: `${telecaller.firstName} ${telecaller.lastName}`,
        branch: telecaller.branch,
        manager: telecaller.manager,
        stats: {
          totalCalls,
          answered,
          // All outcomes
          interested,
          notInterested,
          callback,
          converted,
          noAnswer,
          busy,
          wrongNumber,
          voicemail,
          // Duration
          totalDuration,
          // Calculated rates
          answerRate: totalCalls > 0 ? Math.round((answered / totalCalls) * 100) : 0,
          conversionRate: answered > 0 ? Math.round((converted / answered) * 100) : 0,
        },
      };
    });

    // Calculate totals for all outcomes
    const totals = {
      totalTelecallers: telecallers.length,
      totalCalls: telecallerStats.reduce((sum, t) => sum + t.stats.totalCalls, 0),
      answered: telecallerStats.reduce((sum, t) => sum + t.stats.answered, 0),
      // All outcomes
      interested: telecallerStats.reduce((sum, t) => sum + t.stats.interested, 0),
      notInterested: telecallerStats.reduce((sum, t) => sum + t.stats.notInterested, 0),
      callback: telecallerStats.reduce((sum, t) => sum + t.stats.callback, 0),
      converted: telecallerStats.reduce((sum, t) => sum + t.stats.converted, 0),
      noAnswer: telecallerStats.reduce((sum, t) => sum + t.stats.noAnswer, 0),
      busy: telecallerStats.reduce((sum, t) => sum + t.stats.busy, 0),
      wrongNumber: telecallerStats.reduce((sum, t) => sum + t.stats.wrongNumber, 0),
      voicemail: telecallerStats.reduce((sum, t) => sum + t.stats.voicemail, 0),
      totalDuration: telecallerStats.reduce((sum, t) => sum + t.stats.totalDuration, 0),
    };

    return {
      date: startOfDay.toISOString().split('T')[0],
      totals,
      telecallers: telecallerStats.sort((a, b) => b.stats.totalCalls - a.stats.totalCalls),
    };
  }

  async getTelecallerPerformance(telecallerId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const dailyData = await prisma.telecallerPerformanceDaily.findMany({
      where: { telecallerId, date: { gte: startDate } },
      orderBy: { date: 'asc' },
    });

    const totals = dailyData.reduce((acc: any, day: any) => ({
      totalCalls: acc.totalCalls + day.totalCalls,
      answeredCalls: acc.answeredCalls + day.answeredCalls,
      interestedCount: acc.interestedCount + day.interestedCount,
      convertedCount: acc.convertedCount + day.convertedCount,
      callbacksRequested: acc.callbacksRequested + day.callbacksRequested,
      totalTalkTime: acc.totalTalkTime + day.totalTalkTime,
    }), { totalCalls: 0, answeredCalls: 0, interestedCount: 0, convertedCount: 0, callbacksRequested: 0, totalTalkTime: 0 });

    return {
      telecallerId,
      period: { days, startDate, endDate: new Date() },
      totals,
      averages: {
        callsPerDay: Math.round(totals.totalCalls / days),
        conversionRate: totals.answeredCalls > 0 ? Math.round((totals.convertedCount / totals.answeredCalls) * 10000) / 100 : 0,
        answerRate: totals.totalCalls > 0 ? Math.round((totals.answeredCalls / totals.totalCalls) * 10000) / 100 : 0,
      },
      dailyTrend: dailyData.map((d: any) => ({
        date: d.date.toISOString().split('T')[0],
        calls: d.totalCalls, answered: d.answeredCalls, interested: d.interestedCount, converted: d.convertedCount, conversionRate: d.conversionRate,
      })),
    };
  }
}

export const telecallerAnalyticsService = new TelecallerAnalyticsService();
