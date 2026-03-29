import { prisma } from '../config/database';


interface DateRange {
  start: Date;
  end: Date;
}

interface TimeSeriesOptions {
  dateRange: DateRange;
  interval: 'hour' | 'day' | 'week' | 'month';
}

class AnalyticsService {
  /**
   * Get API usage statistics
   */
  async getApiUsageStats(organizationId: string, dateRange: DateRange) {
    const [
      totalRequests,
      successfulRequests,
      failedRequests,
      avgResponseTime,
      requestsByEndpoint,
      requestsByMethod,
    ] = await Promise.all([
      // Total requests (from audit logs)
      prisma.auditLog.count({
        where: {
          organizationId,
          actorType: 'api_key',
          createdAt: { gte: dateRange.start, lte: dateRange.end },
        },
      }),
      // We'll estimate successful from total audit logs (audits only log successful)
      prisma.auditLog.count({
        where: {
          organizationId,
          actorType: 'api_key',
          createdAt: { gte: dateRange.start, lte: dateRange.end },
        },
      }),
      // Failed requests - approximate from rate limits hit
      0, // Would need separate tracking
      // Average response time - would need separate tracking
      null,
      // Requests by target type (endpoint approximation)
      prisma.auditLog.groupBy({
        by: ['targetType'],
        where: {
          organizationId,
          actorType: 'api_key',
          createdAt: { gte: dateRange.start, lte: dateRange.end },
          targetType: { not: null },
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      // Requests by action (method approximation)
      prisma.auditLog.groupBy({
        by: ['action'],
        where: {
          organizationId,
          actorType: 'api_key',
          createdAt: { gte: dateRange.start, lte: dateRange.end },
        },
        _count: { id: true },
      }),
    ]);

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      successRate: totalRequests > 0 ? ((successfulRequests / totalRequests) * 100).toFixed(2) : 100,
      avgResponseTime,
      byEndpoint: requestsByEndpoint.reduce((acc, item) => {
        if (item.targetType) acc[item.targetType] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
      byMethod: requestsByMethod.reduce((acc, item) => {
        acc[item.action] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  /**
   * Get API key usage breakdown
   */
  async getApiKeyUsage(organizationId: string, dateRange: DateRange) {
    const apiKeys = await prisma.apiKey.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        lastUsedAt: true,
        totalRequests: true,
        rateLimit: true,
        isActive: true,
      },
    });

    // Get usage per key from audit logs
    const usageByKey = await prisma.auditLog.groupBy({
      by: ['actorId'],
      where: {
        organizationId,
        actorType: 'api_key',
        createdAt: { gte: dateRange.start, lte: dateRange.end },
        actorId: { in: apiKeys.map(k => k.id) },
      },
      _count: { id: true },
    });

    const usageMap = usageByKey.reduce((acc, item) => {
      if (item.actorId) acc[item.actorId] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    return apiKeys.map(key => ({
      ...key,
      periodUsage: usageMap[key.id] || 0,
      utilizationRate: key.rateLimit
        ? (((usageMap[key.id] || 0) / key.rateLimit) * 100).toFixed(2)
        : null,
    }));
  }

  /**
   * Get webhook delivery stats
   */
  async getWebhookStats(organizationId: string, dateRange: DateRange) {
    const webhooks = await prisma.apiWebhook.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        url: true,
        isActive: true,
        successCount: true,
        failureCount: true,
        lastTriggeredAt: true,
      },
    });

    const webhookIds = webhooks.map(w => w.id);

    const [deliveryStats, deliveryByStatus] = await Promise.all([
      // Total deliveries in period
      prisma.webhookDeliveryLog.groupBy({
        by: ['webhookId'],
        where: {
          webhookId: { in: webhookIds },
          createdAt: { gte: dateRange.start, lte: dateRange.end },
        },
        _count: { id: true },
        _avg: { responseTime: true },
      }),
      // Deliveries by status
      prisma.webhookDeliveryLog.groupBy({
        by: ['status'],
        where: {
          webhookId: { in: webhookIds },
          createdAt: { gte: dateRange.start, lte: dateRange.end },
        },
        _count: { id: true },
      }),
    ]);

    const statsMap = deliveryStats.reduce((acc, item) => {
      acc[item.webhookId] = {
        count: item._count.id,
        avgResponseTime: item._avg.responseTime,
      };
      return acc;
    }, {} as Record<string, { count: number; avgResponseTime: number | null }>);

    return {
      webhooks: webhooks.map(w => ({
        ...w,
        periodDeliveries: statsMap[w.id]?.count || 0,
        avgResponseTime: statsMap[w.id]?.avgResponseTime,
        deliveryRate: w.successCount + w.failureCount > 0
          ? ((w.successCount / (w.successCount + w.failureCount)) * 100).toFixed(2)
          : 100,
      })),
      summary: {
        total: deliveryByStatus.reduce((sum, s) => sum + s._count.id, 0),
        byStatus: deliveryByStatus.reduce((acc, s) => {
          acc[s.status] = s._count.id;
          return acc;
        }, {} as Record<string, number>),
      },
    };
  }

  /**
   * Get messaging stats
   */
  async getMessagingStats(organizationId: string, dateRange: DateRange) {
    // Filter by user's organization since logs don't have direct org reference
    const userFilter = { user: { organizationId } };
    const dateFilter = { createdAt: { gte: dateRange.start, lte: dateRange.end } };

    const [
      smsSent,
      smsDelivered,
      smsFailed,
      emailSent,
      emailDelivered,
      emailFailed,
      whatsappSent,
      whatsappDelivered,
      whatsappFailed,
    ] = await Promise.all([
      prisma.smsLog.count({
        where: { ...userFilter, ...dateFilter },
      }),
      prisma.smsLog.count({
        where: { ...userFilter, status: 'DELIVERED', ...dateFilter },
      }),
      prisma.smsLog.count({
        where: { ...userFilter, status: 'FAILED', ...dateFilter },
      }),
      prisma.emailLog.count({
        where: { ...userFilter, ...dateFilter },
      }),
      prisma.emailLog.count({
        where: { ...userFilter, status: 'DELIVERED', ...dateFilter },
      }),
      prisma.emailLog.count({
        where: { ...userFilter, status: 'FAILED', ...dateFilter },
      }),
      prisma.whatsappLog.count({
        where: { ...userFilter, ...dateFilter },
      }),
      prisma.whatsappLog.count({
        where: { ...userFilter, status: 'DELIVERED', ...dateFilter },
      }),
      prisma.whatsappLog.count({
        where: { ...userFilter, status: 'FAILED', ...dateFilter },
      }),
    ]);

    return {
      sms: {
        sent: smsSent,
        delivered: smsDelivered,
        failed: smsFailed,
        deliveryRate: smsSent > 0 ? ((smsDelivered / smsSent) * 100).toFixed(2) : 0,
      },
      email: {
        sent: emailSent,
        delivered: emailDelivered,
        failed: emailFailed,
        deliveryRate: emailSent > 0 ? ((emailDelivered / emailSent) * 100).toFixed(2) : 0,
      },
      whatsapp: {
        sent: whatsappSent,
        delivered: whatsappDelivered,
        failed: whatsappFailed,
        deliveryRate: whatsappSent > 0 ? ((whatsappDelivered / whatsappSent) * 100).toFixed(2) : 0,
      },
      total: {
        sent: smsSent + emailSent + whatsappSent,
        delivered: smsDelivered + emailDelivered + whatsappDelivered,
        failed: smsFailed + emailFailed + whatsappFailed,
      },
    };
  }

  /**
   * Get lead conversion stats
   */
  async getLeadStats(organizationId: string, dateRange: DateRange) {
    const [
      totalLeads,
      newLeads,
      convertedLeads,
      leadsBySource,
      leadsByStage,
    ] = await Promise.all([
      prisma.lead.count({
        where: { organizationId },
      }),
      prisma.lead.count({
        where: { organizationId, createdAt: { gte: dateRange.start, lte: dateRange.end } },
      }),
      prisma.lead.count({
        where: {
          organizationId,
          convertedAt: { gte: dateRange.start, lte: dateRange.end },
        },
      }),
      prisma.lead.groupBy({
        by: ['source'],
        where: { organizationId, createdAt: { gte: dateRange.start, lte: dateRange.end } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      prisma.lead.groupBy({
        by: ['stageId'],
        where: { organizationId },
        _count: { id: true },
      }),
    ]);

    // Get stage names
    const stages = await prisma.leadStage.findMany({
      where: { organizationId },
      select: { id: true, name: true },
    });
    const stageMap = stages.reduce((acc, s) => {
      acc[s.id] = s.name;
      return acc;
    }, {} as Record<string, string>);

    return {
      totalLeads,
      newLeads,
      convertedLeads,
      conversionRate: newLeads > 0 ? ((convertedLeads / newLeads) * 100).toFixed(2) : 0,
      bySource: leadsBySource.reduce((acc, item) => {
        acc[item.source || 'Unknown'] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
      byStage: leadsByStage.reduce((acc, item) => {
        const stageName = item.stageId ? stageMap[item.stageId] || 'Unknown' : 'Unknown';
        acc[stageName] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  /**
   * Get contact list stats
   */
  async getContactListStats(organizationId: string) {
    const [
      totalLists,
      activeLists,
      totalContacts,
      activeContacts,
      unsubscribed,
      bounced,
    ] = await Promise.all([
      prisma.contactList.count({ where: { organizationId } }),
      prisma.contactList.count({ where: { organizationId, isActive: true } }),
      prisma.contactListMember.count({
        where: { list: { organizationId } },
      }),
      prisma.contactListMember.count({
        where: { list: { organizationId }, status: 'ACTIVE' },
      }),
      prisma.contactListMember.count({
        where: { list: { organizationId }, status: 'UNSUBSCRIBED' },
      }),
      prisma.contactListMember.count({
        where: { list: { organizationId }, status: 'BOUNCED' },
      }),
    ]);

    return {
      totalLists,
      activeLists,
      totalContacts,
      activeContacts,
      unsubscribed,
      bounced,
      healthScore: totalContacts > 0
        ? Math.round((activeContacts / totalContacts) * 100)
        : 100,
    };
  }

  /**
   * Get conversation stats
   */
  async getConversationStats(organizationId: string, dateRange: DateRange) {
    const [
      totalConversations,
      openConversations,
      closedConversations,
      avgMessagesPerConversation,
      conversationsByChannel,
    ] = await Promise.all([
      prisma.conversation.count({
        where: { organizationId, createdAt: { gte: dateRange.start, lte: dateRange.end } },
      }),
      prisma.conversation.count({
        where: { organizationId, status: 'OPEN' },
      }),
      prisma.conversation.count({
        where: {
          organizationId,
          status: 'CLOSED',
          updatedAt: { gte: dateRange.start, lte: dateRange.end },
        },
      }),
      prisma.conversation.aggregate({
        where: { organizationId },
        _avg: { messageCount: true },
      }),
      prisma.conversation.groupBy({
        by: ['channel'],
        where: { organizationId, createdAt: { gte: dateRange.start, lte: dateRange.end } },
        _count: { id: true },
      }),
    ]);

    return {
      totalConversations,
      openConversations,
      closedConversations,
      avgMessagesPerConversation: avgMessagesPerConversation._avg.messageCount?.toFixed(1) || 0,
      byChannel: conversationsByChannel.reduce((acc, item) => {
        acc[item.channel] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  /**
   * Get usage time series data
   */
  async getUsageTimeSeries(organizationId: string, options: TimeSeriesOptions) {
    const { dateRange, interval } = options;

    // Get daily counts for the period
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        organizationId,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      },
      select: { createdAt: true, actorType: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by interval
    const groupedData = new Map<string, { total: number; api: number; user: number }>();

    for (const log of auditLogs) {
      const key = this.getIntervalKey(log.createdAt, interval);
      const current = groupedData.get(key) || { total: 0, api: 0, user: 0 };
      current.total++;
      if (log.actorType === 'api_key') current.api++;
      if (log.actorType === 'user') current.user++;
      groupedData.set(key, current);
    }

    // Convert to array
    const data = Array.from(groupedData.entries()).map(([date, counts]) => ({
      date,
      ...counts,
    }));

    return data;
  }

  /**
   * Get interval key for time series grouping
   */
  private getIntervalKey(date: Date, interval: string): string {
    const d = new Date(date);
    switch (interval) {
      case 'hour':
        return d.toISOString().slice(0, 13) + ':00';
      case 'day':
        return d.toISOString().slice(0, 10);
      case 'week':
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        return weekStart.toISOString().slice(0, 10);
      case 'month':
        return d.toISOString().slice(0, 7);
      default:
        return d.toISOString().slice(0, 10);
    }
  }

  /**
   * Get dashboard summary
   */
  async getDashboardSummary(organizationId: string) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const dateRange = { start: thirtyDaysAgo, end: now };

    const [
      apiUsage,
      leadStats,
      messagingStats,
      contactListStats,
      conversationStats,
    ] = await Promise.all([
      this.getApiUsageStats(organizationId, dateRange),
      this.getLeadStats(organizationId, dateRange),
      this.getMessagingStats(organizationId, dateRange),
      this.getContactListStats(organizationId),
      this.getConversationStats(organizationId, dateRange),
    ]);

    return {
      period: '30 days',
      apiUsage,
      leads: leadStats,
      messaging: messagingStats,
      contactLists: contactListStats,
      conversations: conversationStats,
    };
  }
}

export const analyticsService = new AnalyticsService();
