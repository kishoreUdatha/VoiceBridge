/**
 * Lead Lifecycle Routes
 *
 * API endpoints for lead lifecycle management including:
 * - Timeline/interaction history
 * - Follow-up scheduling
 * - AI call triggering
 * - Call history
 */

import { Router, Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import { ApiResponse } from '../utils/apiResponse';
import { validate } from '../middlewares/validate';
import { authenticate, authorize } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { prisma } from '../config/database';
import { leadLifecycleService } from '../services/lead-lifecycle.service';
import { FollowUpType, FollowUpStatus } from '@prisma/client';
import { canAccessLead, getLeadAccessContext, buildFollowUpAccessFilter } from '../utils/leadAccess';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(tenantMiddleware);

// ===========================================
// Lead Timeline & History
// ===========================================

/**
 * Get complete lead timeline (activities, calls, follow-ups)
 */
router.get(
  '/:leadId/timeline',
  param('leadId').isUUID(),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { leadId } = req.params;

      // Role-based access check: admin/manager see all, others only assigned leads
      const hasAccess = await canAccessLead(leadId, getLeadAccessContext(req));
      if (!hasAccess) {
        return ApiResponse.notFound(res, 'Lead not found');
      }

      // Get lead details
      const lead = await prisma.lead.findFirst({
        where: {
          id: leadId,
          organizationId: req.organizationId!,
        },
      });

      if (!lead) {
        return ApiResponse.notFound(res, 'Lead not found');
      }

      const timeline = await leadLifecycleService.getLeadTimeline(leadId);

      // Combine and sort by date
      const combined = [
        ...timeline.activities.map(a => ({
          type: 'activity' as const,
          id: a.id,
          timestamp: a.createdAt,
          data: a,
        })),
        ...timeline.calls.map(c => ({
          type: 'call' as const,
          id: c.id,
          timestamp: c.createdAt,
          data: c,
        })),
        ...timeline.followUps.map(f => ({
          type: 'followUp' as const,
          id: f.id,
          timestamp: f.scheduledAt,
          data: f,
        })),
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      ApiResponse.success(res, 'Timeline retrieved', {
        lead: {
          id: lead.id,
          name: `${lead.firstName} ${lead.lastName || ''}`.trim(),
          phone: lead.phone,
          totalCalls: lead.totalCalls,
          lastContactedAt: lead.lastContactedAt,
          nextFollowUpAt: lead.nextFollowUpAt,
        },
        timeline: combined,
        summary: {
          totalActivities: timeline.activities.length,
          totalCalls: timeline.calls.length,
          totalFollowUps: timeline.followUps.length,
          pendingFollowUps: timeline.followUps.filter(f => f.status === 'UPCOMING').length,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get all calls for a lead
 */
router.get(
  '/:leadId/calls',
  param('leadId').isUUID(),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { leadId } = req.params;

      // Role-based access check: admin/manager see all, others only assigned leads
      const hasAccess = await canAccessLead(leadId, getLeadAccessContext(req));
      if (!hasAccess) {
        return ApiResponse.notFound(res, 'Lead not found');
      }

      const calls = await leadLifecycleService.getLeadCalls(leadId);

      ApiResponse.success(res, 'Calls retrieved', calls);
    } catch (error) {
      next(error);
    }
  }
);

// ===========================================
// Follow-up Management
// ===========================================

/**
 * Get all follow-ups for a lead
 */
router.get(
  '/:leadId/follow-ups',
  param('leadId').isUUID(),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { leadId } = req.params;
      const { status } = req.query;

      // Role-based access check: admin/manager see all, others only assigned leads
      const hasAccess = await canAccessLead(leadId, getLeadAccessContext(req));
      if (!hasAccess) {
        return ApiResponse.notFound(res, 'Lead not found');
      }

      const where: any = {
        leadId,
        lead: { organizationId: req.organizationId! },
      };

      if (status && status !== 'all') {
        where.status = status;
      }

      const followUps = await prisma.followUp.findMany({
        where,
        orderBy: { scheduledAt: 'desc' },
        include: {
          assignee: { select: { id: true, firstName: true, lastName: true } },
          voiceAgent: { select: { id: true, name: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      ApiResponse.success(res, 'Follow-ups retrieved', followUps);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Schedule a new follow-up
 */
router.post(
  '/:leadId/follow-ups',
  param('leadId').isUUID(),
  validate([
    body('scheduledAt').isISO8601().withMessage('Valid date required'),
    body('followUpType').isIn(['AI_CALL', 'HUMAN_CALL', 'MANUAL']).withMessage('Valid follow-up type required'),
    body('assigneeId').optional().isUUID(),
    body('voiceAgentId').optional().isUUID(),
    body('message').optional().isString(),
  ]),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { leadId } = req.params;
      const { scheduledAt, followUpType, assigneeId, voiceAgentId, message } = req.body;

      // Role-based access check: admin/manager see all, others only assigned leads
      const hasAccess = await canAccessLead(leadId, getLeadAccessContext(req));
      if (!hasAccess) {
        return ApiResponse.notFound(res, 'Lead not found');
      }

      // For AI_CALL, voice agent is required
      if (followUpType === 'AI_CALL' && !voiceAgentId) {
        return ApiResponse.badRequest(res, 'Voice agent required for AI call follow-up');
      }

      // Get assignee
      let finalAssigneeId = assigneeId || req.user!.id;
      if (followUpType === 'AI_CALL') {
        // For AI calls, use system assignee
        const systemUser = await prisma.user.findFirst({
          where: { organizationId: req.organizationId!, role: { slug: 'admin' } },
        });
        finalAssigneeId = systemUser?.id || req.user!.id;
      }

      const followUp = await leadLifecycleService.scheduleFollowUp(leadId, {
        scheduledAt: new Date(scheduledAt),
        followUpType: followUpType as FollowUpType,
        voiceAgentId,
        message,
        assigneeId: finalAssigneeId,
        createdById: req.user!.id,
      });

      ApiResponse.created(res, 'Follow-up scheduled', followUp);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Update a follow-up
 */
router.put(
  '/:leadId/follow-ups/:followUpId',
  param('leadId').isUUID(),
  param('followUpId').isUUID(),
  validate([
    body('scheduledAt').optional().isISO8601(),
    body('status').optional().isIn(['UPCOMING', 'COMPLETED', 'MISSED', 'RESCHEDULED']),
    body('notes').optional().isString(),
  ]),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { leadId, followUpId } = req.params;
      const { scheduledAt, status, notes } = req.body;

      // Role-based access check: admin/manager see all, others only assigned leads
      const hasAccess = await canAccessLead(leadId, getLeadAccessContext(req));
      if (!hasAccess) {
        return ApiResponse.notFound(res, 'Lead not found');
      }

      // Verify follow-up exists and belongs to lead
      const followUp = await prisma.followUp.findFirst({
        where: {
          id: followUpId,
          leadId,
          lead: { organizationId: req.organizationId! },
        },
      });

      if (!followUp) {
        return ApiResponse.notFound(res, 'Follow-up not found');
      }

      const updateData: any = {};
      if (scheduledAt) updateData.scheduledAt = new Date(scheduledAt);
      if (status) {
        updateData.status = status;
        if (status === 'COMPLETED') updateData.completedAt = new Date();
      }
      if (notes !== undefined) updateData.notes = notes;

      const updated = await prisma.followUp.update({
        where: { id: followUpId },
        data: updateData,
      });

      // Update lead's next follow-up date if needed
      if (status === 'COMPLETED' || status === 'MISSED') {
        const nextFollowUp = await prisma.followUp.findFirst({
          where: {
            leadId,
            status: 'UPCOMING',
          },
          orderBy: { scheduledAt: 'asc' },
        });

        await prisma.lead.update({
          where: { id: leadId },
          data: { nextFollowUpAt: nextFollowUp?.scheduledAt || null },
        });
      }

      ApiResponse.success(res, 'Follow-up updated', updated);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Delete a follow-up
 */
router.delete(
  '/:leadId/follow-ups/:followUpId',
  param('leadId').isUUID(),
  param('followUpId').isUUID(),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { leadId, followUpId } = req.params;

      // Role-based access check: admin/manager see all, others only assigned leads
      const hasAccess = await canAccessLead(leadId, getLeadAccessContext(req));
      if (!hasAccess) {
        return ApiResponse.notFound(res, 'Lead not found');
      }

      // Verify follow-up exists and belongs to lead
      const followUp = await prisma.followUp.findFirst({
        where: {
          id: followUpId,
          leadId,
          lead: { organizationId: req.organizationId! },
        },
      });

      if (!followUp) {
        return ApiResponse.notFound(res, 'Follow-up not found');
      }

      await prisma.followUp.delete({
        where: { id: followUpId },
      });

      ApiResponse.success(res, 'Follow-up deleted');
    } catch (error) {
      next(error);
    }
  }
);

// ===========================================
// AI Call Triggering
// ===========================================

/**
 * Trigger an AI call for a lead
 */
router.post(
  '/:leadId/ai-call',
  authorize('admin', 'manager'),
  param('leadId').isUUID(),
  validate([
    body('voiceAgentId').isUUID().withMessage('Voice agent ID required'),
  ]),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { leadId } = req.params;
      const { voiceAgentId } = req.body;

      // Role-based access check (admin/manager already verified by authorize middleware)
      const hasAccess = await canAccessLead(leadId, getLeadAccessContext(req));
      if (!hasAccess) {
        return ApiResponse.notFound(res, 'Lead not found');
      }

      // Get lead details for the call
      const lead = await prisma.lead.findFirst({
        where: {
          id: leadId,
          organizationId: req.organizationId!,
        },
      });

      if (!lead) {
        return ApiResponse.notFound(res, 'Lead not found');
      }

      // Verify voice agent
      const agent = await prisma.voiceAgent.findFirst({
        where: {
          id: voiceAgentId,
          organizationId: req.organizationId!,
          isActive: true,
        },
      });

      if (!agent) {
        return ApiResponse.notFound(res, 'Voice agent not found or inactive');
      }

      // Trigger the call
      const call = await leadLifecycleService.triggerAICallForLead(lead, voiceAgentId);

      ApiResponse.success(res, 'AI call initiated', {
        callId: call.id,
        status: call.status,
        leadId: lead.id,
        phone: lead.phone,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ===========================================
// Lead Duplicate Check
// ===========================================

/**
 * Check if a lead exists by phone number
 */
router.get(
  '/check-duplicate',
  validate([
    query('phone').notEmpty().withMessage('Phone number required'),
  ]),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { phone } = req.query;

      const existingLead = await leadLifecycleService.findLeadByPhone(
        req.organizationId!,
        phone as string
      );

      if (existingLead) {
        ApiResponse.success(res, 'Duplicate found', {
          isDuplicate: true,
          lead: {
            id: existingLead.id,
            name: `${existingLead.firstName} ${existingLead.lastName || ''}`.trim(),
            phone: existingLead.phone,
            email: existingLead.email,
            totalCalls: existingLead.totalCalls,
            lastContactedAt: existingLead.lastContactedAt,
            createdAt: existingLead.createdAt,
          },
        });
      } else {
        ApiResponse.success(res, 'No duplicate found', {
          isDuplicate: false,
          lead: null,
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

// ===========================================
// Pending Follow-ups
// ===========================================

/**
 * Get all pending follow-ups for the organization
 */
router.get(
  '/pending-follow-ups',
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { type, assigneeId, limit = '20' } = req.query;

      // Build role-based access filter for follow-ups
      const accessFilter = buildFollowUpAccessFilter(getLeadAccessContext(req));

      const where: any = {
        ...accessFilter,
        status: 'UPCOMING',
        scheduledAt: { lte: new Date(Date.now() + 24 * 60 * 60 * 1000) }, // Due within 24 hours
      };

      if (type && type !== 'all') {
        where.followUpType = type;
      }

      if (assigneeId) {
        where.assigneeId = assigneeId;
      }

      const followUps = await prisma.followUp.findMany({
        where,
        orderBy: { scheduledAt: 'asc' },
        take: parseInt(limit as string),
        include: {
          lead: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              totalCalls: true,
            },
          },
          assignee: { select: { id: true, firstName: true, lastName: true } },
          voiceAgent: { select: { id: true, name: true } },
        },
      });

      ApiResponse.success(res, 'Pending follow-ups retrieved', followUps);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
