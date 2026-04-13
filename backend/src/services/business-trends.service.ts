/**
 * Business Trends Service
 * Provides comprehensive business metrics: calls, SMS, leads, conversions
 */

import { prisma } from '../config/database';

interface TrendsFilters {
  organizationId: string;
  startDate?: string;
  endDate?: string;
  userRole?: string;
  userId?: string;
}

interface DailyMetric {
  date: string;
  value: number;
}

interface SourceMetric {
  source: string;
  count: number;
}

class BusinessTrendsService {
  /**
   * Get summary cards data
   */
  async getSummary(filters: TrendsFilters) {
    const { organizationId, startDate, endDate } = filters;

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) {
      const endDateObj = new Date(endDate);
      endDateObj.setHours(23, 59, 59, 999); // Include full day
      dateFilter.lte = endDateObj;
    }
    const hasDateFilter = startDate || endDate;

    // Get total SMS sent
    const totalSms = await prisma.smsLog.count({
      where: {
        lead: { organizationId },
        direction: 'OUTBOUND',
        ...(hasDateFilter && { sentAt: dateFilter }),
      },
    });

    // Get total calls from callLog
    const callLogs = await prisma.callLog.findMany({
      where: {
        organizationId,
        ...(hasDateFilter && { startedAt: dateFilter }),
      },
      select: {
        status: true,
        duration: true,
      },
    });

    // Get telecaller calls
    const telecallerCalls = await prisma.telecallerCall.findMany({
      where: {
        organizationId,
        ...(hasDateFilter && { startedAt: dateFilter }),
      },
      select: {
        status: true,
        duration: true,
      },
    });

    // Combine call data
    const totalCalls = callLogs.length + telecallerCalls.length;
    const callsConnected =
      callLogs.filter(c => c.status === 'COMPLETED' || c.status === 'IN_PROGRESS').length +
      telecallerCalls.filter(c => c.status === 'COMPLETED' || c.status === 'CONNECTED').length;
    const totalCallTime =
      callLogs.reduce((sum, c) => sum + (c.duration || 0), 0) +
      telecallerCalls.reduce((sum, c) => sum + (c.duration || 0), 0);

    // Get converted leads (using isConverted flag OR WON stages)
    const wonStages = await prisma.leadStage.findMany({
      where: { organizationId, autoSyncStatus: 'WON' },
      select: { id: true },
    });
    const wonStageIds = wonStages.map(s => s.id);

    const convertedLeads = await prisma.lead.count({
      where: {
        organizationId,
        OR: [
          { isConverted: true },
          ...(wonStageIds.length > 0 ? [{ stageId: { in: wonStageIds } }] : []),
        ],
        ...(hasDateFilter && { convertedAt: dateFilter }),
      },
    });

    // Get lost leads
    const lostStages = await prisma.leadStage.findMany({
      where: { organizationId, autoSyncStatus: 'LOST' },
      select: { id: true },
    });
    const lostStageIds = lostStages.map(s => s.id);

    const lostLeads = await prisma.lead.count({
      where: {
        organizationId,
        stageId: { in: lostStageIds },
        ...(hasDateFilter && { updatedAt: dateFilter }),
      },
    });

    // Format call time as HH:MM:SS
    const hours = Math.floor(totalCallTime / 3600);
    const minutes = Math.floor((totalCallTime % 3600) / 60);
    const seconds = totalCallTime % 60;
    const formattedCallTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    return {
      totalSms,
      totalCalls,
      convertedLeads,
      totalCallTime: formattedCallTime,
      totalCallTimeSeconds: totalCallTime,
      callsConnected,
      lostLeads,
    };
  }

  /**
   * Helper to get week start date (Sunday)
   */
  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /**
   * Helper to format date as "Mon D"
   */
  private formatShortDate(date: Date): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  }

  /**
   * Helper to get week key for grouping
   */
  private getWeekKey(date: Date): string {
    const weekStart = this.getWeekStart(date);
    return weekStart.toISOString().split('T')[0];
  }

  /**
   * Get weekly calls vs connected calls for bar chart
   */
  async getCallsVsConnected(filters: TrendsFilters) {
    const { organizationId, startDate, endDate } = filters;

    // Default to last 30 days
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999); // Include full day
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get callLog data
    const callLogs = await prisma.callLog.findMany({
      where: {
        organizationId,
        startedAt: { gte: start, lte: end },
      },
      select: {
        startedAt: true,
        status: true,
      },
      orderBy: { startedAt: 'asc' },
    });

    // Get telecaller calls
    const telecallerCalls = await prisma.telecallerCall.findMany({
      where: {
        organizationId,
        startedAt: { gte: start, lte: end },
      },
      select: {
        startedAt: true,
        status: true,
      },
      orderBy: { startedAt: 'asc' },
    });

    // Group by week
    const weeklyData: Record<string, { total: number; connected: number; weekStart: Date }> = {};

    // Process callLog entries
    callLogs.forEach(call => {
      if (!call.startedAt) return;
      const weekKey = this.getWeekKey(call.startedAt);
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = { total: 0, connected: 0, weekStart: this.getWeekStart(call.startedAt) };
      }
      weeklyData[weekKey].total++;
      if (call.status === 'COMPLETED' || call.status === 'IN_PROGRESS') {
        weeklyData[weekKey].connected++;
      }
    });

    // Process telecaller calls
    telecallerCalls.forEach(call => {
      if (!call.startedAt) return;
      const weekKey = this.getWeekKey(call.startedAt);
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = { total: 0, connected: 0, weekStart: this.getWeekStart(call.startedAt) };
      }
      weeklyData[weekKey].total++;
      if (call.status === 'COMPLETED' || call.status === 'CONNECTED') {
        weeklyData[weekKey].connected++;
      }
    });

    // Generate all weeks in range
    const result: { weekRange: string; totalCalls: number; connectedCalls: number }[] = [];
    const currentWeekStart = this.getWeekStart(start);
    const endWeekStart = this.getWeekStart(end);

    while (currentWeekStart <= endWeekStart) {
      const weekKey = currentWeekStart.toISOString().split('T')[0];
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const weekRange = `${this.formatShortDate(currentWeekStart)} - ${this.formatShortDate(weekEnd)}`;

      result.push({
        weekRange,
        totalCalls: weeklyData[weekKey]?.total || 0,
        connectedCalls: weeklyData[weekKey]?.connected || 0,
      });

      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }

    return result;
  }

  /**
   * Get daily call duration for bar chart
   */
  async getCallDuration(filters: TrendsFilters) {
    const { organizationId, startDate, endDate } = filters;

    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999); // Include full day
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get callLog data
    const callLogs = await prisma.callLog.findMany({
      where: {
        organizationId,
        startedAt: { gte: start, lte: end },
        duration: { not: null },
      },
      select: {
        startedAt: true,
        duration: true,
      },
      orderBy: { startedAt: 'asc' },
    });

    // Get telecaller calls
    const telecallerCalls = await prisma.telecallerCall.findMany({
      where: {
        organizationId,
        startedAt: { gte: start, lte: end },
        duration: { not: null },
      },
      select: {
        startedAt: true,
        duration: true,
      },
      orderBy: { startedAt: 'asc' },
    });

    // Group by date
    const dailyData: Record<string, number> = {};

    // Process callLog entries
    callLogs.forEach(call => {
      if (!call.startedAt) return;
      const date = call.startedAt.toISOString().split('T')[0];
      dailyData[date] = (dailyData[date] || 0) + (call.duration || 0);
    });

    // Process telecaller calls
    telecallerCalls.forEach(call => {
      if (!call.startedAt) return;
      const date = call.startedAt.toISOString().split('T')[0];
      dailyData[date] = (dailyData[date] || 0) + (call.duration || 0);
    });

    // Fill in missing dates and convert to minutes
    const result: { date: string; duration: number }[] = [];
    const currentDate = new Date(start);
    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      result.push({
        date: dateStr,
        duration: Math.round((dailyData[dateStr] || 0) / 60), // Convert to minutes
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return result;
  }

  /**
   * Get conversion ratio over time
   */
  async getConversionRatio(filters: TrendsFilters) {
    const { organizationId, startDate, endDate } = filters;

    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999); // Include full day
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get WON and LOST stage IDs
    const wonStages = await prisma.leadStage.findMany({
      where: { organizationId, autoSyncStatus: 'WON' },
      select: { id: true },
    });
    const lostStages = await prisma.leadStage.findMany({
      where: { organizationId, autoSyncStatus: 'LOST' },
      select: { id: true },
    });
    const wonStageIds = wonStages.map(s => s.id);
    const lostStageIds = lostStages.map(s => s.id);

    // Get all leads with their stage, conversion status, and creation date
    const leads = await prisma.lead.findMany({
      where: {
        organizationId,
        createdAt: { gte: start, lte: end },
      },
      select: {
        createdAt: true,
        stageId: true,
        isConverted: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const dailyData: Record<string, { total: number; converted: number }> = {};

    leads.forEach(lead => {
      const date = lead.createdAt.toISOString().split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = { total: 0, converted: 0 };
      }
      dailyData[date].total++;
      // Count as converted if isConverted flag is true OR in WON stage
      if (lead.isConverted || (lead.stageId && wonStageIds.includes(lead.stageId))) {
        dailyData[date].converted++;
      }
    });

    // Fill in missing dates
    const result: { date: string; ratio: number; total: number; converted: number }[] = [];
    const currentDate = new Date(start);
    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const data = dailyData[dateStr] || { total: 0, converted: 0 };
      result.push({
        date: dateStr,
        total: data.total,
        converted: data.converted,
        ratio: data.total > 0 ? Math.round((data.converted / data.total) * 100) : 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return result;
  }

  /**
   * Get daily leads added
   */
  async getLeadsAdded(filters: TrendsFilters) {
    const { organizationId, startDate, endDate } = filters;

    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999); // Include full day
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    const leads = await prisma.lead.findMany({
      where: {
        organizationId,
        createdAt: { gte: start, lte: end },
      },
      select: {
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const dailyData: Record<string, number> = {};

    leads.forEach(lead => {
      const date = lead.createdAt.toISOString().split('T')[0];
      dailyData[date] = (dailyData[date] || 0) + 1;
    });

    // Fill in missing dates
    const result: { date: string; count: number }[] = [];
    const currentDate = new Date(start);
    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      result.push({
        date: dateStr,
        count: dailyData[dateStr] || 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return result;
  }

  /**
   * Get lead sources breakdown
   */
  async getLeadSources(filters: TrendsFilters) {
    const { organizationId, startDate, endDate } = filters;

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) {
      const endDateObj = new Date(endDate);
      endDateObj.setHours(23, 59, 59, 999); // Include full day
      dateFilter.lte = endDateObj;
    }
    const hasDateFilter = startDate || endDate;

    const leads = await prisma.lead.groupBy({
      by: ['source'],
      where: {
        organizationId,
        ...(hasDateFilter && { createdAt: dateFilter }),
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    return leads.map(l => ({
      source: l.source || 'Unknown',
      count: l._count.id,
    }));
  }

  /**
   * Get daily lost leads
   */
  async getLostLeads(filters: TrendsFilters) {
    const { organizationId, startDate, endDate } = filters;

    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999); // Include full day
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get LOST stage IDs
    const lostStages = await prisma.leadStage.findMany({
      where: { organizationId, autoSyncStatus: 'LOST' },
      select: { id: true },
    });
    const lostStageIds = lostStages.map(s => s.id);

    const leads = await prisma.lead.findMany({
      where: {
        organizationId,
        stageId: { in: lostStageIds },
        updatedAt: { gte: start, lte: end },
      },
      select: {
        updatedAt: true,
      },
      orderBy: { updatedAt: 'asc' },
    });

    // Group by date
    const dailyData: Record<string, number> = {};

    leads.forEach(lead => {
      const date = lead.updatedAt.toISOString().split('T')[0];
      dailyData[date] = (dailyData[date] || 0) + 1;
    });

    // Fill in missing dates
    const result: { date: string; count: number }[] = [];
    const currentDate = new Date(start);
    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      result.push({
        date: dateStr,
        count: dailyData[dateStr] || 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return result;
  }

  /**
   * Get comprehensive report with all metrics
   */
  async getComprehensiveReport(filters: TrendsFilters) {
    const [
      summary,
      callsVsConnected,
      callDuration,
      conversionRatio,
      leadsAdded,
      leadSources,
      lostLeads,
    ] = await Promise.all([
      this.getSummary(filters),
      this.getCallsVsConnected(filters),
      this.getCallDuration(filters),
      this.getConversionRatio(filters),
      this.getLeadsAdded(filters),
      this.getLeadSources(filters),
      this.getLostLeads(filters),
    ]);

    return {
      summary,
      callsVsConnected,
      callDuration,
      conversionRatio,
      leadsAdded,
      leadSources,
      lostLeads,
    };
  }
}

export const businessTrendsService = new BusinessTrendsService();
