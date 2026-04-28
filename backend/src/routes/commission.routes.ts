/**
 * Commission Routes
 * API endpoints for commission tracking and payouts
 */

import { Router, Request, Response } from 'express';
import { commissionService } from '../services/commission.service';
import { authenticate } from '../middlewares/auth';

const router = Router();
router.use(authenticate as any);

// Rules
router.get('/rules', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const rules = await commissionService.getRules(organizationId);
    res.json({ success: true, data: rules });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/rules', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const rule = await commissionService.createRule({ organizationId, ...req.body });
    res.json({ success: true, data: rule });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/rules/:id', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const { id } = req.params;
    const rule = await commissionService.updateRule(id, organizationId, req.body);
    res.json({ success: true, data: rule });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Commissions
router.get('/', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const { userId, status, dateFrom, dateTo, limit, offset } = req.query;

    const data = await commissionService.getAllCommissions(organizationId, {
      userId: userId as string,
      status: status as any,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json({ success: true, data: data.commissions, total: data.total });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/my', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const organizationId = (req as any).user.organizationId;
    const { status, dateFrom, dateTo, limit, offset } = req.query;

    const data = await commissionService.getUserCommissions(userId, organizationId, {
      status: status as any,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json({ success: true, data: data.commissions, total: data.total });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const userId = req.query.userId as string;

    const stats = await commissionService.getCommissionStats(organizationId, userId);
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:id/approve', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const approverId = (req as any).user.id;
    const { id } = req.params;

    const commission = await commissionService.approveCommission(id, approverId, organizationId);
    res.json({ success: true, data: commission });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:id/reject', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const approverId = (req as any).user.id;
    const { id } = req.params;
    const { notes } = req.body;

    const commission = await commissionService.rejectCommission(id, approverId, notes, organizationId);
    res.json({ success: true, data: commission });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:id/pay', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const { id } = req.params;

    const commission = await commissionService.markAsPaid(id, organizationId);
    res.json({ success: true, data: commission });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Diagnostic endpoint to check commission configuration status
router.get('/diagnostic', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const { prisma } = require('../config/database');

    // Check commission configs
    const configs = await prisma.commissionConfig.findMany({
      where: { organizationId },
    });

    // Check total commissions
    const totalCommissions = await prisma.commission.count({
      where: { organizationId },
    });

    // Check total admissions
    const totalAdmissions = await prisma.admission.count({
      where: { organizationId, status: 'ACTIVE' },
    });

    // Check admissions without commissions
    const admissionsWithCommissions = await prisma.commission.findMany({
      where: { organizationId, admissionId: { not: null } },
      select: { admissionId: true },
      distinct: ['admissionId'],
    });
    const admissionIdsWithCommissions = admissionsWithCommissions.map((c: any) => c.admissionId);

    const admissionsWithoutCommissions = await prisma.admission.count({
      where: {
        organizationId,
        status: 'ACTIVE',
        id: { notIn: admissionIdsWithCommissions },
      },
    });

    // Format config info
    const configStatus = configs.length === 0
      ? 'NO CONFIGS - Go to Settings → Commission to set up'
      : configs.map((c: any) => ({
          type: c.admissionType,
          telecaller: Number(c.telecallerAmount) || 0,
          teamLead: Number(c.teamLeadAmount) || 0,
          manager: Number(c.managerAmount) || 0,
          hasNonZeroAmounts: (Number(c.telecallerAmount) || 0) > 0 ||
                             (Number(c.teamLeadAmount) || 0) > 0 ||
                             (Number(c.managerAmount) || 0) > 0,
        }));

    res.json({
      success: true,
      data: {
        commissionConfigs: configStatus,
        totalCommissions,
        totalAdmissions,
        admissionsWithoutCommissions,
        recommendation: admissionsWithoutCommissions > 0
          ? `Run POST /api/admissions/backfill-commissions to create commissions for ${admissionsWithoutCommissions} admissions`
          : 'All admissions have commission records',
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
