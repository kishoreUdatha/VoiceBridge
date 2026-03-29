import { Router } from 'express';
import { auditLogService } from '../services/audit-log.service';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware } from '../middlewares/tenant';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticate);
router.use(tenantMiddleware);

/**
 * @api {get} /audit-logs List Audit Logs
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const {
      actorId,
      actorType,
      targetType,
      targetId,
      action,
      startDate,
      endDate,
      search,
      page = '1',
      limit = '50',
    } = req.query;

    const result = await auditLogService.getLogs({
      organizationId,
      actorId: actorId as string,
      actorType: actorType as any,
      targetType: targetType as any,
      targetId: targetId as string,
      action: action as any,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      search: search as string,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });

    res.json({ success: true, ...result });
  })
);

/**
 * @api {get} /audit-logs/summary Get Activity Summary
 */
router.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { days = '30' } = req.query;

    const summary = await auditLogService.getActivitySummary(
      organizationId,
      parseInt(days as string)
    );

    res.json({ success: true, data: summary });
  })
);

/**
 * @api {get} /audit-logs/user/:userId Get User Activity
 */
router.get(
  '/user/:userId',
  asyncHandler(async (req, res) => {
    const { page = '1', limit = '50' } = req.query;

    const result = await auditLogService.getUserActivity(req.params.userId, {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });

    res.json({ success: true, ...result });
  })
);

/**
 * @api {get} /audit-logs/target/:targetType/:targetId Get Target History
 */
router.get(
  '/target/:targetType/:targetId',
  asyncHandler(async (req, res) => {
    const { page = '1', limit = '50' } = req.query;

    const result = await auditLogService.getTargetHistory(
      req.params.targetType as any,
      req.params.targetId,
      {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      }
    );

    res.json({ success: true, ...result });
  })
);

/**
 * @api {get} /audit-logs/export Export Audit Logs
 */
router.get(
  '/export',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required',
      });
    }

    const logs = await auditLogService.exportLogs(
      organizationId,
      new Date(startDate as string),
      new Date(endDate as string)
    );

    res.json({
      success: true,
      data: logs,
      count: logs.length,
    });
  })
);

/**
 * @api {get} /audit-logs/:id Get Audit Log Detail
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const log = await auditLogService.getLogById(req.params.id, organizationId);

    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Audit log not found',
      });
    }

    res.json({ success: true, data: log });
  })
);

export default router;
