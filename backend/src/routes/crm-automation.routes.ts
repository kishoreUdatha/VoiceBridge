/**
 * CRM Automation Routes
 * API endpoints for managing CRM automations (Birthday, Re-engagement, SLA, etc.)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { crmAutomationService } from '../services/crm-automation.service';
import { authenticate } from '../middlewares/auth';
import { prisma } from '../config/database';

// Extend Request type to include user
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    organizationId: string;
    role?: string;
  };
}

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/crm-automations/settings
 * Get automation settings for the current organization
 */
router.get('/settings', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organization not found' });
    }

    const settings = await crmAutomationService.getSettings(organizationId);
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/crm-automations/settings
 * Update automation settings for the current organization
 */
router.put('/settings', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organization not found' });
    }

    const settings = await crmAutomationService.updateSettings(organizationId, req.body);
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/crm-automations/logs
 * Get automation logs for the current organization
 */
router.get('/logs', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organization not found' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const automationType = req.query.type as string;
    const status = req.query.status as string;
    const targetId = req.query.targetId as string;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const where: any = { organizationId };

    if (automationType) {
      where.automationType = automationType;
    }
    if (status) {
      where.status = status;
    }
    if (targetId) {
      where.targetId = targetId;
    }
    if (startDate || endDate) {
      where.executedAt = {};
      if (startDate) where.executedAt.gte = startDate;
      if (endDate) where.executedAt.lte = endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.crmAutomationLog.findMany({
        where,
        orderBy: { executedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.crmAutomationLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/crm-automations/stats
 * Get automation statistics for the current organization
 */
router.get('/stats', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organization not found' });
    }

    // Get stats by automation type
    const typeStats = await prisma.crmAutomationLog.groupBy({
      by: ['automationType'],
      where: { organizationId },
      _count: { id: true },
    });

    // Get stats by status
    const statusStats = await prisma.crmAutomationLog.groupBy({
      by: ['status'],
      where: { organizationId },
      _count: { id: true },
    });

    // Get stats by channel
    const channelStats = await prisma.crmAutomationLog.groupBy({
      by: ['channel'],
      where: { organizationId },
      _count: { id: true },
    });

    // Get today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStats = await prisma.crmAutomationLog.groupBy({
      by: ['automationType', 'status'],
      where: {
        organizationId,
        executedAt: { gte: today },
      },
      _count: { id: true },
    });

    // Get last 7 days trend
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    const dailyTrend = await prisma.$queryRaw`
      SELECT
        DATE("executedAt") as date,
        COUNT(*) as count
      FROM "crm_automation_logs"
      WHERE "organizationId" = ${organizationId}
        AND "executedAt" >= ${last7Days}
      GROUP BY DATE("executedAt")
      ORDER BY date DESC
    `;

    // Calculate success rate
    const totalLogs = await prisma.crmAutomationLog.count({ where: { organizationId } });
    const successLogs = await prisma.crmAutomationLog.count({
      where: { organizationId, status: 'sent' },
    });
    const successRate = totalLogs > 0 ? ((successLogs / totalLogs) * 100).toFixed(1) : 0;

    res.json({
      success: true,
      data: {
        byType: typeStats.reduce((acc, stat) => {
          acc[stat.automationType] = stat._count.id;
          return acc;
        }, {} as Record<string, number>),
        byStatus: statusStats.reduce((acc, stat) => {
          acc[stat.status] = stat._count.id;
          return acc;
        }, {} as Record<string, number>),
        byChannel: channelStats.reduce((acc, stat) => {
          acc[stat.channel] = stat._count.id;
          return acc;
        }, {} as Record<string, number>),
        today: todayStats,
        dailyTrend,
        totalLogs,
        successRate,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/crm-automations/trigger
 * Manually trigger automations (admin only)
 */
router.post('/trigger', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user?.organizationId;
    const userRole = req.user?.role?.toLowerCase();

    if (!organizationId) {
      return res.status(401).json({ error: 'Organization not found' });
    }

    // Only admins can trigger manual check
    if (!['admin', 'owner', 'super_admin'].includes(userRole || '')) {
      return res.status(403).json({ error: 'Only admins can trigger automation checks' });
    }

    // Run automations for this organization
    await crmAutomationService.runAllAutomations();

    res.json({
      success: true,
      message: 'Automations triggered successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/crm-automations/trigger/:type
 * Trigger a specific automation type (admin only)
 */
router.post('/trigger/:type', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user?.organizationId;
    const userRole = req.user?.role?.toLowerCase();

    if (!organizationId) {
      return res.status(401).json({ error: 'Organization not found' });
    }

    // Only admins can trigger manual check
    if (!['admin', 'owner', 'super_admin'].includes(userRole || '')) {
      return res.status(403).json({ error: 'Only admins can trigger automation checks' });
    }

    const { type } = req.params;
    const validTypes = [
      'birthday',
      'reengagement',
      'sla',
      'payment',
      'quote',
      'aging',
      'welcome',
      'review',
    ];

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: `Invalid automation type. Must be one of: ${validTypes.join(', ')}`,
      });
    }

    const settings = await crmAutomationService.getSettings(organizationId);

    let result;
    switch (type) {
      case 'birthday':
        result = await (crmAutomationService as any).processBirthdayGreetings(organizationId, settings);
        break;
      case 'reengagement':
        result = await (crmAutomationService as any).processReengagement(organizationId, settings);
        break;
      case 'sla':
        result = await (crmAutomationService as any).processSlaAlerts(organizationId, settings);
        break;
      case 'payment':
        result = await (crmAutomationService as any).processPaymentReminders(organizationId, settings);
        break;
      case 'quote':
        result = await (crmAutomationService as any).processQuoteFollowups(organizationId, settings);
        break;
      case 'aging':
        result = await (crmAutomationService as any).processLeadAgingAlerts(organizationId, settings);
        break;
      case 'review':
        result = await (crmAutomationService as any).processReviewRequests(organizationId, settings);
        break;
      default:
        return res.status(400).json({ error: 'Unsupported automation type for manual trigger' });
    }

    res.json({
      success: true,
      message: `${type} automation triggered successfully`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/crm-automations/welcome/:leadId
 * Trigger welcome series for a specific lead
 */
router.post('/welcome/:leadId', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organization not found' });
    }

    const { leadId } = req.params;

    // Verify lead belongs to organization
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId },
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    await crmAutomationService.triggerWelcomeSeries(organizationId, leadId);

    res.json({
      success: true,
      message: 'Welcome series triggered for lead',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/crm-automations/templates
 * Get default templates for all automation types
 */
router.get('/templates', async (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      birthday: {
        whatsapp: `🎂 Happy Birthday {{firstName}}!\n\nWishing you a wonderful day filled with joy and happiness.\n\nBest wishes,\n{{orgName}}`,
        email: {
          subject: 'Happy Birthday {{firstName}}! 🎂',
          body: `Dear {{firstName}},\n\nWishing you a very Happy Birthday!\n\nMay your special day be filled with joy, laughter, and wonderful moments.\n\nBest wishes,\n{{orgName}}`,
        },
      },
      reengagement: {
        whatsapp: `Hi {{firstName}},\n\nWe haven't heard from you in a while. We'd love to reconnect!\n\nIs there anything we can help you with?\n\n{{orgName}}`,
        email: {
          subject: 'We Miss You {{firstName}}!',
          body: `Hi {{firstName}},\n\nIt's been a while since we last connected. We wanted to reach out and see if there's anything we can assist you with.\n\nFeel free to reply to this email or give us a call.\n\nBest regards,\n{{orgName}}`,
        },
      },
      paymentReminder: {
        whatsapp: `Hi {{firstName}},\n\nThis is a friendly reminder about your upcoming payment of {{amount}} due on {{dueDate}}.\n\nPlease let us know if you have any questions.\n\n{{orgName}}`,
        email: {
          subject: 'Payment Reminder - {{amount}} due {{dueDate}}',
          body: `Hi {{firstName}},\n\nThis is a reminder that your payment of {{amount}} is due on {{dueDate}}.\n\nIf you have already made the payment, please disregard this message.\n\nThank you,\n{{orgName}}`,
        },
      },
      quoteFollowup: {
        whatsapp: `Hi {{firstName}},\n\nFollowing up on the quote we sent you on {{quoteDate}}.\n\nDo you have any questions or need any clarifications?\n\n{{orgName}}`,
        email: {
          subject: 'Following Up on Your Quote',
          body: `Hi {{firstName}},\n\nWe wanted to follow up on the quote we sent you.\n\nPlease let us know if you have any questions or if you'd like to proceed.\n\nBest regards,\n{{orgName}}`,
        },
      },
      welcome: {
        step1: `Hi {{firstName}}! Welcome to {{orgName}} 👋\n\nWe're excited to have you! Here's what you can expect from us...`,
        step2: `Hi {{firstName}}! Quick tip: Have you explored all our features? Let us know if you need help getting started.`,
        step3: `Hi {{firstName}}! Just checking in. How has your experience been so far? We'd love to hear from you!`,
      },
      reviewRequest: {
        whatsapp: `Hi {{firstName}},\n\nThank you for choosing {{orgName}}! We'd love to hear about your experience.\n\nWould you mind leaving us a quick review? {{reviewLink}}\n\nThank you!`,
        email: {
          subject: 'How was your experience with {{orgName}}?',
          body: `Hi {{firstName}},\n\nWe hope you had a great experience with us!\n\nWould you mind taking a moment to share your feedback? Your review helps us improve and helps others make informed decisions.\n\n{{reviewLink}}\n\nThank you for your support!\n\n{{orgName}}`,
        },
      },
      variables: [
        { name: 'firstName', description: 'Lead first name' },
        { name: 'lastName', description: 'Lead last name' },
        { name: 'fullName', description: 'Lead full name' },
        { name: 'email', description: 'Lead email' },
        { name: 'phone', description: 'Lead phone' },
        { name: 'orgName', description: 'Organization name' },
        { name: 'amount', description: 'Payment amount (for payment reminders)' },
        { name: 'dueDate', description: 'Payment due date (for payment reminders)' },
        { name: 'quoteDate', description: 'Quote sent date (for quote follow-ups)' },
        { name: 'reviewLink', description: 'Review link (for review requests)' },
      ],
    },
  });
});

/**
 * GET /api/crm-automations/lead/:leadId/logs
 * Get automation logs for a specific lead
 */
router.get('/lead/:leadId/logs', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organization not found' });
    }

    const { leadId } = req.params;

    // Verify lead belongs to organization
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId },
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const logs = await prisma.crmAutomationLog.findMany({
      where: { targetId: leadId, organizationId },
      orderBy: { executedAt: 'desc' },
    });

    res.json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
});

export default router;
