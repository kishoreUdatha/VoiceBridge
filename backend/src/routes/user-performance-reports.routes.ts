/**
 * User Performance Reports Routes
 * Tenant-scoped staff performance tracking endpoints
 */

import { Router, Response } from 'express';
import { query } from 'express-validator';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import { ApiResponse } from '../utils/apiResponse';
import { userPerformanceReportsService } from '../services/user-performance-reports.service';

const router = Router();

// Test endpoint - no auth required
router.get('/test', (req, res) => {
  console.log('[UserPerformanceReports] Test endpoint hit');
  res.json({ success: true, message: 'User performance reports route is working' });
});

// Mock comprehensive endpoint - no auth, returns sample data
router.get('/comprehensive-mock', (req, res) => {
  console.log('[UserPerformanceReports] Mock comprehensive endpoint hit');
  const mockReport = {
    summary: [
      { userId: '1', userName: 'John Smith', email: 'john@example.com', role: 'Sales Executive', branch: 'Main Branch', leadsHandled: 45, leadsAssigned: 50, callsMade: 120, callsConnected: 85, followUpsCompleted: 38, followUpsPending: 12, conversions: 8, conversionRate: '16.0', closureValue: 450000, avgResponseTime: 15, lastActivity: new Date().toISOString() },
      { userId: '2', userName: 'Sarah Johnson', email: 'sarah@example.com', role: 'Senior Sales', branch: 'Main Branch', leadsHandled: 62, leadsAssigned: 65, callsMade: 180, callsConnected: 145, followUpsCompleted: 55, followUpsPending: 8, conversions: 15, conversionRate: '23.1', closureValue: 820000, avgResponseTime: 10, lastActivity: new Date().toISOString() },
      { userId: '3', userName: 'Mike Wilson', email: 'mike@example.com', role: 'Sales Executive', branch: 'North Branch', leadsHandled: 38, leadsAssigned: 42, callsMade: 95, callsConnected: 68, followUpsCompleted: 30, followUpsPending: 15, conversions: 5, conversionRate: '11.9', closureValue: 275000, avgResponseTime: 22, lastActivity: new Date().toISOString() },
    ],
    leadsPerUser: [
      { userId: '1', userName: 'John Smith', totalAssigned: 50, newLeads: 12, contacted: 20, qualified: 10, converted: 8, lost: 0 },
      { userId: '2', userName: 'Sarah Johnson', totalAssigned: 65, newLeads: 8, contacted: 25, qualified: 17, converted: 15, lost: 0 },
      { userId: '3', userName: 'Mike Wilson', totalAssigned: 42, newLeads: 15, contacted: 12, qualified: 10, converted: 5, lost: 0 },
    ],
    callsPerUser: [
      { userId: '1', userName: 'John Smith', totalCalls: 120, connectedCalls: 85, missedCalls: 35, avgDuration: 180, totalDuration: 15300, callbacksScheduled: 12 },
      { userId: '2', userName: 'Sarah Johnson', totalCalls: 180, connectedCalls: 145, missedCalls: 35, avgDuration: 210, totalDuration: 30450, callbacksScheduled: 8 },
      { userId: '3', userName: 'Mike Wilson', totalCalls: 95, connectedCalls: 68, missedCalls: 27, avgDuration: 165, totalDuration: 11220, callbacksScheduled: 15 },
    ],
    followUpsPerUser: [
      { userId: '1', userName: 'John Smith', totalScheduled: 50, completed: 38, pending: 8, overdue: 4, completionRate: '76.0' },
      { userId: '2', userName: 'Sarah Johnson', totalScheduled: 63, completed: 55, pending: 6, overdue: 2, completionRate: '87.3' },
      { userId: '3', userName: 'Mike Wilson', totalScheduled: 45, completed: 30, pending: 10, overdue: 5, completionRate: '66.7' },
    ],
    conversionPerUser: [
      { userId: '1', userName: 'John Smith', leadsAssigned: 50, conversions: 8, conversionRate: '16.0', avgConversionTime: 14, closureValue: 450000 },
      { userId: '2', userName: 'Sarah Johnson', leadsAssigned: 65, conversions: 15, conversionRate: '23.1', avgConversionTime: 10, closureValue: 820000 },
      { userId: '3', userName: 'Mike Wilson', leadsAssigned: 42, conversions: 5, conversionRate: '11.9', avgConversionTime: 18, closureValue: 275000 },
    ],
  };
  res.json({ success: true, data: { report: mockReport } });
});

// Add logging to debug middleware issues
router.use((req, res, next) => {
  console.log('[UserPerformanceReports] Request received:', req.path);
  next();
});

router.use((req, res, next) => {
  console.log('[UserPerformanceReports] Before authenticate');
  authenticate(req as any, res, (err?: any) => {
    if (err) {
      console.log('[UserPerformanceReports] Authenticate error:', err);
      return next(err);
    }
    console.log('[UserPerformanceReports] After authenticate');
    next();
  });
});

router.use((req, res, next) => {
  console.log('[UserPerformanceReports] Before tenantMiddleware');
  tenantMiddleware(req as any, res, (err?: any) => {
    if (err) {
      console.log('[UserPerformanceReports] Tenant error:', err);
      return next(err);
    }
    console.log('[UserPerformanceReports] After tenantMiddleware, orgId:', (req as any).organizationId);
    next();
  });
});

const dateRangeValidation = [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
];

const filterValidation = [
  ...dateRangeValidation,
  query('userId').optional().isUUID(),
  query('branchId').optional().isUUID(),
  query('roleId').optional().isUUID(),
];

function parseFilters(req: TenantRequest) {
  const { startDate, endDate, userId, branchId, roleId } = req.query;

  // Parse dates and ensure end date includes the full day
  let dateRange;
  if (startDate && endDate) {
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    // Set end date to end of day (23:59:59.999)
    end.setHours(23, 59, 59, 999);
    dateRange = { start, end };
  }

  return {
    organizationId: req.organizationId!,
    dateRange,
    userId: userId as string | undefined,
    branchId: branchId as string | undefined,
    roleId: roleId as string | undefined,
    // Role-based filtering
    currentUserRole: req.user?.roleSlug || req.user?.role,
    currentUserId: req.user?.id,
  };
}

// GET /user-performance-reports/summary
router.get('/summary', validate(filterValidation), async (req: TenantRequest, res: Response) => {
  try {
    const summary = await userPerformanceReportsService.getUserPerformanceSummary(parseFilters(req));
    return ApiResponse.success(res, { summary });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
});

// GET /user-performance-reports/leads-per-user
router.get('/leads-per-user', validate(filterValidation), async (req: TenantRequest, res: Response) => {
  try {
    const data = await userPerformanceReportsService.getLeadsPerUser(parseFilters(req));
    return ApiResponse.success(res, { leadsPerUser: data });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
});

// GET /user-performance-reports/calls-per-user
router.get('/calls-per-user', validate(filterValidation), async (req: TenantRequest, res: Response) => {
  try {
    const data = await userPerformanceReportsService.getCallsPerUser(parseFilters(req));
    return ApiResponse.success(res, { callsPerUser: data });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
});

// GET /user-performance-reports/followups-per-user
router.get('/followups-per-user', validate(filterValidation), async (req: TenantRequest, res: Response) => {
  try {
    const data = await userPerformanceReportsService.getFollowUpsPerUser(parseFilters(req));
    return ApiResponse.success(res, { followUpsPerUser: data });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
});

// GET /user-performance-reports/conversion-per-user
router.get('/conversion-per-user', validate(filterValidation), async (req: TenantRequest, res: Response) => {
  try {
    const data = await userPerformanceReportsService.getConversionPerUser(parseFilters(req));
    return ApiResponse.success(res, { conversionPerUser: data });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
});

// GET /user-performance-reports/activity-log
router.get('/activity-log', validate(filterValidation), async (req: TenantRequest, res: Response) => {
  try {
    const data = await userPerformanceReportsService.getActivityLog(parseFilters(req));
    return ApiResponse.success(res, { activityLog: data });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
});

// GET /user-performance-reports/login-report
router.get('/login-report', validate(filterValidation), async (req: TenantRequest, res: Response) => {
  try {
    const data = await userPerformanceReportsService.getLoginReport(parseFilters(req));
    return ApiResponse.success(res, { loginReport: data });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
});

// GET /user-performance-reports/comprehensive
router.get('/comprehensive', (req, res, next) => {
  console.log('[UserPerformanceReports] /comprehensive - request received at', new Date().toISOString());
  console.log('[UserPerformanceReports] Query params:', req.query);
  next();
}, validate(filterValidation), async (req: TenantRequest, res: Response) => {
  try {
    console.log('[UserPerformanceReports] Starting comprehensive report for org:', req.organizationId);
    const filters = parseFilters(req);
    console.log('[UserPerformanceReports] Filters:', JSON.stringify(filters));
    const report = await userPerformanceReportsService.getComprehensiveReport(filters);
    console.log('[UserPerformanceReports] Report generated successfully, users:', report.summary?.length || 0);
    return ApiResponse.success(res, { report });
  } catch (error: any) {
    console.error('[UserPerformanceReports] Error:', error);
    return ApiResponse.error(res, error.message || 'Failed to generate report', 500);
  }
});

// GET /user-performance-reports/user-report - Full user report with all 30+ fields
router.get('/user-report', validate(filterValidation), async (req: TenantRequest, res: Response) => {
  try {
    console.log('[UserPerformanceReports] Starting user report for org:', req.organizationId);
    const filters = parseFilters(req);
    const data = await userPerformanceReportsService.getUserReportData(filters);
    console.log('[UserPerformanceReports] User report generated successfully, users:', data.length);
    return ApiResponse.success(res, { users: data });
  } catch (error: any) {
    console.error('[UserPerformanceReports] User report error:', error);
    return ApiResponse.error(res, error.message || 'Failed to generate user report', 500);
  }
});

export default router;
