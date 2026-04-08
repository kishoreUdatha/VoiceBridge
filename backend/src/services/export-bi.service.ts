/**
 * Export & Business Intelligence Service
 * Handles data exports, BI connectors, and advanced analytics
 */

import { PrismaClient, ExportFormat, ExportStatus, BIProvider, ConnectorStatus } from '@prisma/client';
import { Parser } from 'json2csv';
import ExcelJS from 'exceljs';

const prisma = new PrismaClient();

interface ExportConfig {
  name: string;
  entity: string;
  format: ExportFormat;
  filters?: Record<string, any>;
  fields?: string[];
  includeRelations?: string[];
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time?: string;
    dayOfWeek?: number;
    dayOfMonth?: number;
    recipients?: string[];
  };
}

interface BIConnectorConfig {
  provider: BIProvider;
  name: string;
  credentials: Record<string, string>;
  syncTables?: string[];
  syncSchedule?: string;
}

export const exportBIService = {
  // ==================== Data Exports ====================

  // Get export jobs
  async getExportJobs(organizationId: string, filters?: any) {
    const where: any = { organizationId };
    if (filters?.status) where.status = filters.status;
    if (filters?.entity) where.entity = filters.entity;

    return prisma.exportJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 50,
    });
  },

  // Create export job
  async createExportJob(organizationId: string, userId: string, config: ExportConfig) {
    return prisma.exportJob.create({
      data: {
        organizationId,
        name: config.name,
        entity: config.entity,
        format: config.format,
        filters: config.filters as any,
        fields: config.fields as any,
        includeRelations: config.includeRelations as any,
        schedule: config.schedule as any,
        createdById: userId,
      },
    });
  },

  // Execute export
  async executeExport(jobId: string) {
    const job = await prisma.exportJob.findUnique({ where: { id: jobId } });
    if (!job) throw new Error('Export job not found');

    // Update status to processing
    await prisma.exportJob.update({
      where: { id: jobId },
      data: { status: 'PROCESSING', startedAt: new Date() },
    });

    try {
      // Fetch data based on entity
      const data = await this.fetchEntityData(
        job.organizationId,
        job.entity,
        job.filters as any,
        job.fields as any,
        job.includeRelations as any
      );

      // Generate file based on format
      let fileUrl: string;
      let fileSize: number;
      let rowCount: number;

      switch (job.format) {
        case 'CSV':
          ({ fileUrl, fileSize, rowCount } = await this.generateCSV(data, job.fields as string[]));
          break;
        case 'EXCEL':
          ({ fileUrl, fileSize, rowCount } = await this.generateExcel(data, job.entity, job.fields as string[]));
          break;
        case 'JSON':
          ({ fileUrl, fileSize, rowCount } = await this.generateJSON(data));
          break;
        case 'PDF':
          ({ fileUrl, fileSize, rowCount } = await this.generatePDF(data, job.entity));
          break;
        default:
          throw new Error(`Unsupported format: ${job.format}`);
      }

      // Update job with success
      return prisma.exportJob.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          fileUrl,
          fileSize,
          rowCount,
        },
      });
    } catch (error: any) {
      // Update job with failure
      return prisma.exportJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: error.message,
        },
      });
    }
  },

  // Fetch entity data
  async fetchEntityData(
    organizationId: string,
    entity: string,
    filters?: Record<string, any>,
    fields?: string[],
    includeRelations?: string[]
  ) {
    const where: any = { organizationId, ...filters };
    const include: any = {};

    // Build includes
    if (includeRelations) {
      includeRelations.forEach((rel) => {
        include[rel] = true;
      });
    }

    switch (entity) {
      case 'leads':
        return prisma.lead.findMany({
          where,
          include: Object.keys(include).length > 0 ? include : undefined,
        });

      case 'accounts':
        return prisma.account.findMany({
          where,
          include: Object.keys(include).length > 0 ? include : undefined,
        });

      case 'opportunities':
        return prisma.opportunity.findMany({
          where,
          include: Object.keys(include).length > 0 ? include : undefined,
        });

      case 'contacts':
        return prisma.accountContact.findMany({
          where: { account: { organizationId }, ...filters },
          include: Object.keys(include).length > 0 ? include : undefined,
        });

      case 'calls':
        return prisma.callLog.findMany({
          where,
          include: Object.keys(include).length > 0 ? include : undefined,
        });

      case 'tickets':
        return prisma.serviceTicket.findMany({
          where,
          include: Object.keys(include).length > 0 ? include : undefined,
        });

      case 'contracts':
        return prisma.contract.findMany({
          where,
          include: Object.keys(include).length > 0 ? include : undefined,
        });

      default:
        throw new Error(`Unknown entity: ${entity}`);
    }
  },

  // Generate CSV
  async generateCSV(data: any[], fields?: string[]): Promise<{ fileUrl: string; fileSize: number; rowCount: number }> {
    const parser = new Parser({ fields });
    const csv = parser.parse(data);

    // In production, upload to cloud storage
    // For now, return mock URL
    const fileUrl = `/exports/export-${Date.now()}.csv`;
    const fileSize = Buffer.byteLength(csv, 'utf8');

    return { fileUrl, fileSize, rowCount: data.length };
  },

  // Generate Excel
  async generateExcel(data: any[], entity: string, fields?: string[]): Promise<{ fileUrl: string; fileSize: number; rowCount: number }> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(entity);

    // Add headers
    if (data.length > 0) {
      const headers = fields || Object.keys(data[0]);
      sheet.addRow(headers);

      // Style headers
      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };

      // Add data rows
      data.forEach((item) => {
        const row = headers.map((h) => {
          const value = item[h];
          if (value instanceof Date) return value.toISOString();
          if (typeof value === 'object') return JSON.stringify(value);
          return value;
        });
        sheet.addRow(row);
      });

      // Auto-fit columns
      sheet.columns.forEach((column) => {
        column.width = 15;
      });
    }

    // In production, save to cloud storage
    const fileUrl = `/exports/export-${Date.now()}.xlsx`;
    const buffer = await workbook.xlsx.writeBuffer();

    return { fileUrl, fileSize: buffer.byteLength, rowCount: data.length };
  },

  // Generate JSON
  async generateJSON(data: any[]): Promise<{ fileUrl: string; fileSize: number; rowCount: number }> {
    const json = JSON.stringify(data, null, 2);
    const fileUrl = `/exports/export-${Date.now()}.json`;
    const fileSize = Buffer.byteLength(json, 'utf8');

    return { fileUrl, fileSize, rowCount: data.length };
  },

  // Generate PDF (placeholder)
  async generatePDF(data: any[], entity: string): Promise<{ fileUrl: string; fileSize: number; rowCount: number }> {
    // In production, use puppeteer or similar for PDF generation
    const fileUrl = `/exports/export-${Date.now()}.pdf`;
    return { fileUrl, fileSize: 0, rowCount: data.length };
  },

  // Delete old exports
  async cleanupOldExports(organizationId: string, daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return prisma.exportJob.deleteMany({
      where: {
        organizationId,
        createdAt: { lt: cutoffDate },
        status: { in: ['COMPLETED', 'FAILED'] },
      },
    });
  },

  // ==================== BI Connectors ====================

  // Get BI connectors
  async getBIConnectors(organizationId: string) {
    return prisma.bIConnector.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  },

  // Create BI connector
  async createBIConnector(organizationId: string, config: BIConnectorConfig) {
    return prisma.bIConnector.create({
      data: {
        organizationId,
        provider: config.provider,
        name: config.name,
        credentials: config.credentials as any,
        syncTables: config.syncTables as any,
        syncSchedule: config.syncSchedule,
      },
    });
  },

  // Update BI connector
  async updateBIConnector(id: string, updates: Partial<BIConnectorConfig>) {
    return prisma.bIConnector.update({
      where: { id },
      data: {
        name: updates.name,
        credentials: updates.credentials as any,
        syncTables: updates.syncTables as any,
        syncSchedule: updates.syncSchedule,
      },
    });
  },

  // Test BI connector connection
  async testBIConnection(id: string) {
    const connector = await prisma.bIConnector.findUnique({ where: { id } });
    if (!connector) throw new Error('Connector not found');

    try {
      // Provider-specific connection test
      switch (connector.provider) {
        case 'POWER_BI':
          await this.testPowerBIConnection(connector.credentials as any);
          break;
        case 'TABLEAU':
          await this.testTableauConnection(connector.credentials as any);
          break;
        case 'LOOKER':
          await this.testLookerConnection(connector.credentials as any);
          break;
        case 'METABASE':
          await this.testMetabaseConnection(connector.credentials as any);
          break;
        case 'GOOGLE_DATA_STUDIO':
          await this.testDataStudioConnection(connector.credentials as any);
          break;
      }

      await prisma.bIConnector.update({
        where: { id },
        data: { status: 'CONNECTED', lastSyncAt: new Date() },
      });

      return { success: true };
    } catch (error: any) {
      await prisma.bIConnector.update({
        where: { id },
        data: { status: 'ERROR', errorMessage: error.message },
      });

      return { success: false, error: error.message };
    }
  },

  // Provider-specific test methods (stubs)
  async testPowerBIConnection(credentials: any) {
    // Implement Power BI API test
    return true;
  },

  async testTableauConnection(credentials: any) {
    // Implement Tableau API test
    return true;
  },

  async testLookerConnection(credentials: any) {
    // Implement Looker API test
    return true;
  },

  async testMetabaseConnection(credentials: any) {
    // Implement Metabase API test
    return true;
  },

  async testDataStudioConnection(credentials: any) {
    // Implement Google Data Studio test
    return true;
  },

  // Sync data to BI platform
  async syncToBIPlatform(connectorId: string) {
    const connector = await prisma.bIConnector.findUnique({ where: { id: connectorId } });
    if (!connector) throw new Error('Connector not found');

    const tables = (connector.syncTables as string[]) || ['leads', 'accounts', 'opportunities', 'calls'];

    try {
      for (const table of tables) {
        const data = await this.fetchEntityData(connector.organizationId, table);
        await this.pushDataToBIPlatform(connector, table, data);
      }

      await prisma.bIConnector.update({
        where: { id: connectorId },
        data: { status: 'CONNECTED', lastSyncAt: new Date() },
      });

      return { success: true, tablesSync: tables.length };
    } catch (error: any) {
      await prisma.bIConnector.update({
        where: { id: connectorId },
        data: { status: 'ERROR', errorMessage: error.message },
      });

      throw error;
    }
  },

  // Push data to BI platform (stub)
  async pushDataToBIPlatform(connector: any, table: string, data: any[]) {
    // Implement provider-specific data push
    console.log(`Pushing ${data.length} rows to ${connector.provider} for table ${table}`);
    return true;
  },

  // Delete BI connector
  async deleteBIConnector(id: string) {
    return prisma.bIConnector.delete({ where: { id } });
  },

  // ==================== Advanced Analytics ====================

  // Get executive dashboard data
  async getExecutiveDashboard(organizationId: string, dateRange?: { start: Date; end: Date }) {
    const where: any = { organizationId };
    if (dateRange) {
      where.createdAt = { gte: dateRange.start, lte: dateRange.end };
    }

    const [
      leadStats,
      opportunityStats,
      callStats,
      ticketStats,
      revenueStats,
    ] = await Promise.all([
      // Lead statistics
      prisma.lead.groupBy({
        by: ['stage'],
        where,
        _count: true,
      }),
      // Opportunity statistics
      prisma.opportunity.aggregate({
        where: { ...where, stage: 'WON' },
        _sum: { amount: true },
        _count: true,
      }),
      // Call statistics
      prisma.callLog.aggregate({
        where,
        _count: true,
        _sum: { durationSeconds: true },
      }),
      // Ticket statistics
      prisma.serviceTicket.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      // Contract revenue
      prisma.contract.aggregate({
        where: { ...where, status: 'ACTIVE' },
        _sum: { totalValue: true },
      }),
    ]);

    return {
      leads: leadStats,
      opportunities: {
        wonCount: opportunityStats._count,
        wonValue: opportunityStats._sum.amount || 0,
      },
      calls: {
        total: callStats._count,
        totalDuration: callStats._sum.durationSeconds || 0,
      },
      tickets: ticketStats,
      activeContractValue: revenueStats._sum.totalValue || 0,
    };
  },

  // Get conversion funnel
  async getConversionFunnel(organizationId: string, dateRange?: { start: Date; end: Date }) {
    const where: any = { organizationId };
    if (dateRange) {
      where.createdAt = { gte: dateRange.start, lte: dateRange.end };
    }

    const stages = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON'];
    const funnel = await Promise.all(
      stages.map(async (stage) => {
        const count = await prisma.lead.count({
          where: { ...where, stage },
        });
        return { stage, count };
      })
    );

    // Calculate conversion rates
    return funnel.map((item, index) => ({
      ...item,
      conversionRate:
        index === 0
          ? 100
          : funnel[index - 1].count > 0
          ? (item.count / funnel[index - 1].count) * 100
          : 0,
    }));
  },

  // Get sales velocity
  async getSalesVelocity(organizationId: string) {
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const wonOpportunities = await prisma.opportunity.findMany({
      where: {
        organizationId,
        stage: 'WON',
        closedAt: { gte: last30Days },
      },
      select: {
        amount: true,
        createdAt: true,
        closedAt: true,
      },
    });

    if (wonOpportunities.length === 0) {
      return { velocity: 0, avgDealSize: 0, avgCycleTime: 0, winRate: 0 };
    }

    const totalValue = wonOpportunities.reduce((sum, o) => sum + (o.amount || 0), 0);
    const avgDealSize = totalValue / wonOpportunities.length;

    const totalCycleTime = wonOpportunities.reduce((sum, o) => {
      if (o.closedAt && o.createdAt) {
        return sum + (o.closedAt.getTime() - o.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      }
      return sum;
    }, 0);
    const avgCycleTime = totalCycleTime / wonOpportunities.length;

    // Win rate
    const totalOpportunities = await prisma.opportunity.count({
      where: { organizationId, closedAt: { gte: last30Days } },
    });
    const winRate = totalOpportunities > 0 ? (wonOpportunities.length / totalOpportunities) * 100 : 0;

    // Velocity = (Opportunities * Win Rate * Avg Deal Size) / Cycle Time
    const velocity = avgCycleTime > 0
      ? (wonOpportunities.length * (winRate / 100) * avgDealSize) / avgCycleTime
      : 0;

    return {
      velocity,
      avgDealSize,
      avgCycleTime,
      winRate,
      dealsWon: wonOpportunities.length,
    };
  },

  // Get activity trends
  async getActivityTrends(organizationId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const calls = await prisma.callLog.groupBy({
      by: ['createdAt'],
      where: {
        organizationId,
        createdAt: { gte: startDate },
      },
      _count: true,
    });

    const leads = await prisma.lead.groupBy({
      by: ['createdAt'],
      where: {
        organizationId,
        createdAt: { gte: startDate },
      },
      _count: true,
    });

    // Group by day
    const dailyStats: Record<string, { calls: number; leads: number }> = {};

    calls.forEach((c) => {
      const day = c.createdAt.toISOString().split('T')[0];
      if (!dailyStats[day]) dailyStats[day] = { calls: 0, leads: 0 };
      dailyStats[day].calls += c._count;
    });

    leads.forEach((l) => {
      const day = l.createdAt.toISOString().split('T')[0];
      if (!dailyStats[day]) dailyStats[day] = { calls: 0, leads: 0 };
      dailyStats[day].leads += l._count;
    });

    return Object.entries(dailyStats)
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },
};
