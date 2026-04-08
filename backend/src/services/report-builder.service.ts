/**
 * Report Builder Service
 * Handles custom report creation, scheduling, and execution
 */

import { PrismaClient, ReportType, ScheduleFrequency, DeliveryMethod, ReportFormat, ExecutionStatus } from '@prisma/client';

const prisma = new PrismaClient();

interface ColumnDefinition {
  field: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  format?: string;
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
}

interface FilterCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in' | 'between';
  value: any;
}

interface ReportConfig {
  name: string;
  description?: string;
  type: ReportType;
  category?: string;
  dataSource: string;
  columns: ColumnDefinition[];
  filters?: FilterCondition[];
  groupBy?: string[];
  sortBy?: { field: string; direction: 'asc' | 'desc' }[];
  aggregations?: { field: string; type: string }[];
  chartConfig?: Record<string, any>;
}

export const reportBuilderService = {
  // Get all report definitions
  async getReportDefinitions(organizationId: string) {
    return prisma.reportDefinition.findMany({
      where: { organizationId, isActive: true },
      include: {
        schedules: {
          where: { isActive: true },
        },
        _count: {
          select: { executions: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  },

  // Get single report definition
  async getReportDefinition(id: string) {
    return prisma.reportDefinition.findUnique({
      where: { id },
      include: {
        schedules: true,
        executions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  },

  // Create report definition
  async createReportDefinition(organizationId: string, userId: string, config: ReportConfig) {
    return prisma.reportDefinition.create({
      data: {
        organizationId,
        name: config.name,
        description: config.description,
        type: config.type,
        category: config.category,
        dataSource: config.dataSource,
        columns: config.columns as any,
        filters: config.filters as any,
        groupBy: config.groupBy as any,
        sortBy: config.sortBy as any,
        aggregations: config.aggregations as any,
        chartConfig: config.chartConfig as any,
        createdById: userId,
      },
    });
  },

  // Update report definition
  async updateReportDefinition(id: string, config: Partial<ReportConfig>) {
    return prisma.reportDefinition.update({
      where: { id },
      data: {
        name: config.name,
        description: config.description,
        type: config.type,
        category: config.category,
        dataSource: config.dataSource,
        columns: config.columns as any,
        filters: config.filters as any,
        groupBy: config.groupBy as any,
        sortBy: config.sortBy as any,
        aggregations: config.aggregations as any,
        chartConfig: config.chartConfig as any,
      },
    });
  },

  // Delete report definition
  async deleteReportDefinition(id: string) {
    return prisma.reportDefinition.update({
      where: { id },
      data: { isActive: false },
    });
  },

  // Create schedule
  async createSchedule(
    reportDefinitionId: string,
    organizationId: string,
    config: {
      name: string;
      frequency: ScheduleFrequency;
      dayOfWeek?: number;
      dayOfMonth?: number;
      timeOfDay: string;
      timezone?: string;
      deliveryMethod: DeliveryMethod;
      recipients: string[];
      format: ReportFormat;
    }
  ) {
    const nextRunAt = this.calculateNextRun(config.frequency, config.timeOfDay, config.dayOfWeek, config.dayOfMonth);

    return prisma.reportSchedule.create({
      data: {
        reportDefinitionId,
        organizationId,
        name: config.name,
        frequency: config.frequency,
        dayOfWeek: config.dayOfWeek,
        dayOfMonth: config.dayOfMonth,
        timeOfDay: config.timeOfDay,
        timezone: config.timezone || 'Asia/Kolkata',
        deliveryMethod: config.deliveryMethod,
        recipients: config.recipients as any,
        format: config.format,
        nextRunAt,
      },
    });
  },

  // Update schedule
  async updateSchedule(id: string, config: Partial<{
    name: string;
    frequency: ScheduleFrequency;
    dayOfWeek: number;
    dayOfMonth: number;
    timeOfDay: string;
    deliveryMethod: DeliveryMethod;
    recipients: string[];
    format: ReportFormat;
    isActive: boolean;
  }>) {
    let nextRunAt;
    if (config.frequency || config.timeOfDay) {
      const schedule = await prisma.reportSchedule.findUnique({ where: { id } });
      if (schedule) {
        nextRunAt = this.calculateNextRun(
          config.frequency || schedule.frequency,
          config.timeOfDay || schedule.timeOfDay,
          config.dayOfWeek ?? schedule.dayOfWeek ?? undefined,
          config.dayOfMonth ?? schedule.dayOfMonth ?? undefined
        );
      }
    }

    return prisma.reportSchedule.update({
      where: { id },
      data: {
        ...config,
        recipients: config.recipients as any,
        nextRunAt,
      },
    });
  },

  // Delete schedule
  async deleteSchedule(id: string) {
    return prisma.reportSchedule.delete({ where: { id } });
  },

  // Execute report
  async executeReport(
    reportDefinitionId: string,
    organizationId: string,
    triggeredBy: string,
    scheduleId?: string
  ) {
    // Create execution record
    const execution = await prisma.reportExecution.create({
      data: {
        reportDefinitionId,
        scheduleId,
        organizationId,
        status: 'PENDING',
        triggeredBy,
      },
    });

    try {
      // Update to running
      await prisma.reportExecution.update({
        where: { id: execution.id },
        data: { status: 'RUNNING', startedAt: new Date() },
      });

      // Get report definition
      const report = await prisma.reportDefinition.findUnique({
        where: { id: reportDefinitionId },
      });

      if (!report) {
        throw new Error('Report not found');
      }

      // Execute the report based on data source
      const data = await this.fetchReportData(
        organizationId,
        report.dataSource,
        report.columns as ColumnDefinition[],
        report.filters as FilterCondition[] | null,
        report.groupBy as string[] | null,
        report.sortBy as any[] | null
      );

      // Complete execution
      const completedAt = new Date();
      const duration = completedAt.getTime() - (execution.startedAt?.getTime() || completedAt.getTime());

      await prisma.reportExecution.update({
        where: { id: execution.id },
        data: {
          status: 'COMPLETED',
          completedAt,
          duration,
          rowCount: data.length,
        },
      });

      return { execution, data };
    } catch (error: any) {
      // Mark as failed
      await prisma.reportExecution.update({
        where: { id: execution.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: error.message,
        },
      });
      throw error;
    }
  },

  // Fetch report data based on data source
  async fetchReportData(
    organizationId: string,
    dataSource: string,
    columns: ColumnDefinition[],
    filters: FilterCondition[] | null,
    groupBy: string[] | null,
    sortBy: any[] | null
  ) {
    const where: any = { organizationId };

    // Apply filters
    if (filters && filters.length > 0) {
      for (const filter of filters) {
        switch (filter.operator) {
          case 'eq':
            where[filter.field] = filter.value;
            break;
          case 'neq':
            where[filter.field] = { not: filter.value };
            break;
          case 'gt':
            where[filter.field] = { gt: filter.value };
            break;
          case 'gte':
            where[filter.field] = { gte: filter.value };
            break;
          case 'lt':
            where[filter.field] = { lt: filter.value };
            break;
          case 'lte':
            where[filter.field] = { lte: filter.value };
            break;
          case 'contains':
            where[filter.field] = { contains: filter.value, mode: 'insensitive' };
            break;
          case 'in':
            where[filter.field] = { in: filter.value };
            break;
        }
      }
    }

    // Build select
    const select: any = {};
    for (const col of columns) {
      select[col.field] = true;
    }

    // Build orderBy
    const orderBy: any = {};
    if (sortBy && sortBy.length > 0) {
      for (const sort of sortBy) {
        orderBy[sort.field] = sort.direction;
      }
    } else {
      orderBy.createdAt = 'desc';
    }

    // Execute query based on data source
    let data: any[] = [];
    switch (dataSource) {
      case 'leads':
        data = await prisma.lead.findMany({ where, orderBy, take: 10000 });
        break;
      case 'calls':
        data = await prisma.callLog.findMany({ where, orderBy, take: 10000 });
        break;
      case 'campaigns':
        data = await prisma.campaign.findMany({ where, orderBy, take: 10000 });
        break;
      case 'users':
        data = await prisma.user.findMany({ where, orderBy, take: 10000 });
        break;
      case 'quotations':
        data = await prisma.quotation.findMany({ where, orderBy, take: 10000 });
        break;
      default:
        throw new Error(`Unknown data source: ${dataSource}`);
    }

    return data;
  },

  // Get execution history
  async getExecutionHistory(reportDefinitionId: string, limit = 20) {
    return prisma.reportExecution.findMany({
      where: { reportDefinitionId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },

  // Get pending scheduled reports
  async getPendingSchedules() {
    return prisma.reportSchedule.findMany({
      where: {
        isActive: true,
        nextRunAt: { lte: new Date() },
      },
      include: {
        reportDefinition: true,
      },
    });
  },

  // Process scheduled reports (called by cron job)
  async processScheduledReports() {
    const schedules = await this.getPendingSchedules();
    const results = [];

    for (const schedule of schedules) {
      try {
        const result = await this.executeReport(
          schedule.reportDefinitionId,
          schedule.organizationId,
          'system',
          schedule.id
        );

        // Update schedule
        const nextRunAt = this.calculateNextRun(
          schedule.frequency,
          schedule.timeOfDay,
          schedule.dayOfWeek ?? undefined,
          schedule.dayOfMonth ?? undefined
        );

        await prisma.reportSchedule.update({
          where: { id: schedule.id },
          data: {
            lastRunAt: new Date(),
            nextRunAt,
          },
        });

        results.push({ scheduleId: schedule.id, success: true });
      } catch (error: any) {
        results.push({ scheduleId: schedule.id, success: false, error: error.message });
      }
    }

    return results;
  },

  // Calculate next run time
  calculateNextRun(
    frequency: ScheduleFrequency,
    timeOfDay: string,
    dayOfWeek?: number,
    dayOfMonth?: number
  ): Date {
    const [hours, minutes] = timeOfDay.split(':').map(Number);
    const now = new Date();
    let next = new Date();

    next.setHours(hours, minutes, 0, 0);

    switch (frequency) {
      case 'HOURLY':
        next.setMinutes(minutes, 0, 0);
        if (next <= now) {
          next.setHours(next.getHours() + 1);
        }
        break;

      case 'DAILY':
        if (next <= now) {
          next.setDate(next.getDate() + 1);
        }
        break;

      case 'WEEKLY':
        if (dayOfWeek !== undefined) {
          const currentDay = next.getDay();
          let daysUntilNext = dayOfWeek - currentDay;
          if (daysUntilNext < 0 || (daysUntilNext === 0 && next <= now)) {
            daysUntilNext += 7;
          }
          next.setDate(next.getDate() + daysUntilNext);
        }
        break;

      case 'MONTHLY':
        if (dayOfMonth !== undefined) {
          next.setDate(dayOfMonth);
          if (next <= now) {
            next.setMonth(next.getMonth() + 1);
          }
        }
        break;

      case 'QUARTERLY':
        const currentMonth = next.getMonth();
        const quarterMonth = Math.floor(currentMonth / 3) * 3;
        next.setMonth(quarterMonth + 3);
        if (dayOfMonth !== undefined) {
          next.setDate(dayOfMonth);
        }
        break;
    }

    return next;
  },

  // Get available data sources
  getAvailableDataSources() {
    return [
      { id: 'leads', name: 'Leads', fields: this.getLeadFields() },
      { id: 'calls', name: 'Call Logs', fields: this.getCallFields() },
      { id: 'campaigns', name: 'Campaigns', fields: this.getCampaignFields() },
      { id: 'users', name: 'Users', fields: this.getUserFields() },
      { id: 'quotations', name: 'Quotations', fields: this.getQuotationFields() },
    ];
  },

  getLeadFields() {
    return [
      { field: 'firstName', label: 'First Name', type: 'string' },
      { field: 'lastName', label: 'Last Name', type: 'string' },
      { field: 'email', label: 'Email', type: 'string' },
      { field: 'phone', label: 'Phone', type: 'string' },
      { field: 'source', label: 'Source', type: 'string' },
      { field: 'city', label: 'City', type: 'string' },
      { field: 'state', label: 'State', type: 'string' },
      { field: 'priority', label: 'Priority', type: 'string' },
      { field: 'isConverted', label: 'Converted', type: 'boolean' },
      { field: 'totalScore', label: 'Lead Score', type: 'number' },
      { field: 'createdAt', label: 'Created Date', type: 'date' },
      { field: 'updatedAt', label: 'Updated Date', type: 'date' },
    ];
  },

  getCallFields() {
    return [
      { field: 'direction', label: 'Direction', type: 'string' },
      { field: 'status', label: 'Status', type: 'string' },
      { field: 'duration', label: 'Duration', type: 'number' },
      { field: 'createdAt', label: 'Call Date', type: 'date' },
    ];
  },

  getCampaignFields() {
    return [
      { field: 'name', label: 'Name', type: 'string' },
      { field: 'status', label: 'Status', type: 'string' },
      { field: 'type', label: 'Type', type: 'string' },
      { field: 'createdAt', label: 'Created Date', type: 'date' },
    ];
  },

  getUserFields() {
    return [
      { field: 'firstName', label: 'First Name', type: 'string' },
      { field: 'lastName', label: 'Last Name', type: 'string' },
      { field: 'email', label: 'Email', type: 'string' },
      { field: 'isActive', label: 'Active', type: 'boolean' },
      { field: 'createdAt', label: 'Created Date', type: 'date' },
    ];
  },

  getQuotationFields() {
    return [
      { field: 'quotationNumber', label: 'Number', type: 'string' },
      { field: 'status', label: 'Status', type: 'string' },
      { field: 'totalAmount', label: 'Amount', type: 'number' },
      { field: 'createdAt', label: 'Created Date', type: 'date' },
    ];
  },
};
