/**
 * Report Generator Service
 * Generates reports in CSV/Excel format for auto-reports feature
 */

import { prisma } from '../config/database';
import ExcelJS from 'exceljs';

interface ReportData {
  title: string;
  headers: string[];
  rows: any[][];
  generatedAt: Date;
}

class ReportGeneratorService {
  /**
   * Generate report based on type
   */
  async generateReport(
    organizationId: string,
    reportType: string,
    format: 'csv' | 'excel' | 'pdf' = 'csv'
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    // Get report data based on type
    const reportData = await this.getReportData(organizationId, reportType);

    // Generate file based on format
    switch (format) {
      case 'excel':
        return this.generateExcel(reportData, reportType);
      case 'csv':
      default:
        return this.generateCsv(reportData, reportType);
    }
  }

  /**
   * Get report data based on type
   */
  private async getReportData(organizationId: string, reportType: string): Promise<ReportData> {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    switch (reportType) {
      case 'call_report':
        return this.getCallReportData(organizationId, yesterday, now);
      case 'lead_report':
        return this.getLeadReportData(organizationId, yesterday, now);
      case 'user_report':
        return this.getUserReportData(organizationId, yesterday, now);
      case 'payment_report':
        return this.getPaymentReportData(organizationId, yesterday, now);
      case 'admission_report':
        return this.getAdmissionReportData(organizationId, yesterday, now);
      case 'performance_report':
        return this.getPerformanceReportData(organizationId, yesterday, now);
      case 'followup_report':
        return this.getFollowupReportData(organizationId, yesterday, now);
      default:
        return this.getGenericReportData(organizationId, reportType);
    }
  }

  /**
   * Call Report - Call activity summary
   */
  private async getCallReportData(organizationId: string, startDate: Date, endDate: Date): Promise<ReportData> {
    const calls = await prisma.callLog.findMany({
      where: {
        organizationId,
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        lead: { select: { firstName: true, lastName: true, phone: true } },
        caller: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const headers = [
      'Date & Time',
      'Lead Name',
      'Phone',
      'Caller',
      'Direction',
      'Duration (sec)',
      'Status',
      'Notes',
    ];

    const rows = calls.map(call => [
      call.startedAt?.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) || call.createdAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      `${call.lead?.firstName || ''} ${call.lead?.lastName || ''}`.trim() || '-',
      call.lead?.phone || call.phoneNumber || '-',
      `${call.caller?.firstName || ''} ${call.caller?.lastName || ''}`.trim() || '-',
      call.direction || '-',
      call.duration || 0,
      call.status || '-',
      (call.notes || '-').substring(0, 50),
    ]);

    // Add summary row
    const totalCalls = calls.length;
    const totalDuration = calls.reduce((sum, c) => sum + (c.duration || 0), 0);
    const avgDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;

    rows.push([]);
    rows.push(['SUMMARY', '', '', '', '', '', '', '']);
    rows.push(['Total Calls', totalCalls, '', '', '', '', '', '']);
    rows.push(['Total Duration (sec)', totalDuration, '', '', '', '', '', '']);
    rows.push(['Avg Duration (sec)', avgDuration, '', '', '', '', '', '']);

    return {
      title: 'Call Report',
      headers,
      rows,
      generatedAt: new Date(),
    };
  }

  /**
   * Lead Report - New leads and conversions
   */
  private async getLeadReportData(organizationId: string, startDate: Date, endDate: Date): Promise<ReportData> {
    const leads = await prisma.lead.findMany({
      where: {
        organizationId,
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        assignedTo: { select: { firstName: true, lastName: true } },
        stage: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const headers = [
      'Created At',
      'Name',
      'Email',
      'Phone',
      'Source',
      'Stage',
      'Assigned To',
      'Status',
    ];

    const rows = leads.map(lead => [
      lead.createdAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || '-',
      lead.email || '-',
      lead.phone || '-',
      lead.source || '-',
      lead.stage?.name || '-',
      `${lead.assignedTo?.firstName || ''} ${lead.assignedTo?.lastName || ''}`.trim() || 'Unassigned',
      lead.status || '-',
    ]);

    // Summary
    rows.push([]);
    rows.push(['SUMMARY', '', '', '', '', '', '', '']);
    rows.push(['Total New Leads', leads.length, '', '', '', '', '', '']);

    return {
      title: 'Lead Report',
      headers,
      rows,
      generatedAt: new Date(),
    };
  }

  /**
   * User Report - User activity summary
   */
  private async getUserReportData(organizationId: string, startDate: Date, endDate: Date): Promise<ReportData> {
    const users = await prisma.user.findMany({
      where: { organizationId, isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        lastLoginAt: true,
        _count: {
          select: {
            assignedLeads: true,
            callLogs: true,
          },
        },
      },
    });

    const headers = [
      'Name',
      'Email',
      'Role',
      'Assigned Leads',
      'Total Calls',
      'Last Login',
    ];

    const rows = users.map(user => [
      `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      user.email,
      user.role || '-',
      user._count.assignedLeads,
      user._count.callLogs,
      user.lastLoginAt?.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) || 'Never',
    ]);

    return {
      title: 'User Report',
      headers,
      rows,
      generatedAt: new Date(),
    };
  }

  /**
   * Payment Report
   */
  private async getPaymentReportData(organizationId: string, startDate: Date, endDate: Date): Promise<ReportData> {
    const payments = await prisma.payment.findMany({
      where: {
        organizationId,
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        lead: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const headers = [
      'Date',
      'Lead Name',
      'Amount',
      'Payment Mode',
      'Status',
      'Reference',
    ];

    const rows = payments.map(payment => [
      payment.createdAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      `${payment.lead?.firstName || ''} ${payment.lead?.lastName || ''}`.trim() || '-',
      payment.amount,
      payment.paymentMode || '-',
      payment.status || '-',
      payment.transactionId || '-',
    ]);

    const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

    rows.push([]);
    rows.push(['SUMMARY', '', '', '', '', '']);
    rows.push(['Total Payments', payments.length, '', '', '', '']);
    rows.push(['Total Amount', totalAmount, '', '', '', '']);

    return {
      title: 'Payment Report',
      headers,
      rows,
      generatedAt: new Date(),
    };
  }

  /**
   * Admission Report
   */
  private async getAdmissionReportData(organizationId: string, startDate: Date, endDate: Date): Promise<ReportData> {
    const admissions = await prisma.admission.findMany({
      where: {
        organizationId,
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        lead: { select: { firstName: true, lastName: true, email: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const headers = [
      'Date',
      'Student Name',
      'Email',
      'Phone',
      'Course',
      'Status',
      'Fee Amount',
    ];

    const rows = admissions.map(adm => [
      adm.createdAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      `${adm.lead?.firstName || ''} ${adm.lead?.lastName || ''}`.trim() || '-',
      adm.lead?.email || '-',
      adm.lead?.phone || '-',
      adm.courseName || '-',
      adm.status || '-',
      adm.totalFee || 0,
    ]);

    return {
      title: 'Admission Report',
      headers,
      rows,
      generatedAt: new Date(),
    };
  }

  /**
   * Performance Report
   */
  private async getPerformanceReportData(organizationId: string, startDate: Date, endDate: Date): Promise<ReportData> {
    const users = await prisma.user.findMany({
      where: { organizationId, isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    const headers = [
      'Name',
      'Role',
      'Calls Made',
      'Leads Assigned',
      'Leads Converted',
      'Conversion Rate',
    ];

    const rows: any[][] = [];

    for (const user of users) {
      const callCount = await prisma.callLog.count({
        where: { userId: user.id, startTime: { gte: startDate, lte: endDate } },
      });

      const assignedLeads = await prisma.lead.count({
        where: { assignedToId: user.id },
      });

      const convertedLeads = await prisma.lead.count({
        where: {
          assignedToId: user.id,
          status: 'converted',
          updatedAt: { gte: startDate, lte: endDate },
        },
      });

      const conversionRate = assignedLeads > 0 ? ((convertedLeads / assignedLeads) * 100).toFixed(1) : '0';

      rows.push([
        `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        user.role || '-',
        callCount,
        assignedLeads,
        convertedLeads,
        `${conversionRate}%`,
      ]);
    }

    return {
      title: 'Performance Report',
      headers,
      rows,
      generatedAt: new Date(),
    };
  }

  /**
   * Follow-up Report
   */
  private async getFollowupReportData(organizationId: string, startDate: Date, endDate: Date): Promise<ReportData> {
    const followups = await prisma.followUp.findMany({
      where: {
        organizationId,
        scheduledAt: { gte: startDate, lte: endDate },
      },
      include: {
        lead: { select: { firstName: true, lastName: true } },
        assignedTo: { select: { firstName: true, lastName: true } },
      },
      orderBy: { scheduledAt: 'desc' },
      take: 500,
    });

    const headers = [
      'Scheduled At',
      'Lead Name',
      'Assigned To',
      'Type',
      'Status',
      'Notes',
    ];

    const rows = followups.map(f => [
      f.scheduledAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      `${f.lead?.firstName || ''} ${f.lead?.lastName || ''}`.trim() || '-',
      `${f.assignedTo?.firstName || ''} ${f.assignedTo?.lastName || ''}`.trim() || '-',
      f.type || '-',
      f.status || '-',
      (f.notes || '-').substring(0, 50),
    ]);

    return {
      title: 'Follow-up Report',
      headers,
      rows,
      generatedAt: new Date(),
    };
  }

  /**
   * Generic report placeholder
   */
  private async getGenericReportData(organizationId: string, reportType: string): Promise<ReportData> {
    return {
      title: `${reportType} Report`,
      headers: ['Info'],
      rows: [['No data available for this report type']],
      generatedAt: new Date(),
    };
  }

  /**
   * Generate CSV file
   */
  private generateCsv(data: ReportData, reportType: string): { buffer: Buffer; filename: string; contentType: string } {
    const lines: string[] = [];

    // Title and date
    lines.push(`"${data.title}"`);
    lines.push(`"Generated: ${data.generatedAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}"`);
    lines.push('');

    // Headers
    lines.push(data.headers.map(h => `"${h}"`).join(','));

    // Rows
    for (const row of data.rows) {
      lines.push(row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','));
    }

    const csvContent = lines.join('\n');
    const buffer = Buffer.from(csvContent, 'utf-8');
    const date = new Date().toISOString().split('T')[0];
    const filename = `${reportType}_${date}.csv`;

    return {
      buffer,
      filename,
      contentType: 'text/csv',
    };
  }

  /**
   * Generate Excel file
   */
  private async generateExcel(data: ReportData, reportType: string): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(data.title);

    // Title row
    worksheet.addRow([data.title]);
    worksheet.addRow([`Generated: ${data.generatedAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`]);
    worksheet.addRow([]);

    // Headers
    const headerRow = worksheet.addRow(data.headers);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F81BD' },
    };
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Data rows
    for (const row of data.rows) {
      worksheet.addRow(row);
    }

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 15;
    });

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const date = new Date().toISOString().split('T')[0];
    const filename = `${reportType}_${date}.xlsx`;

    return {
      buffer,
      filename,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }
}

export const reportGeneratorService = new ReportGeneratorService();
