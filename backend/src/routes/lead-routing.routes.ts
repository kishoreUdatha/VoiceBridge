/**
 * Lead Routing Routes
 * Handles routing rules, routing groups, and lead assignment
 */

import { Router, Response } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import { ApiResponse } from '../utils/apiResponse';
import { leadRoutingService } from '../services/lead-routing.service';

const router = Router();

router.use(authenticate);
router.use(tenantMiddleware);

// ==================== Lead Routing ====================

/**
 * POST /api/lead-routing/route/:leadId
 * Route a lead based on organization's routing rules
 */
router.post(
  '/route/:leadId',
  validate([param('leadId').isUUID()]),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;
      const { leadId } = req.params;

      const result = await leadRoutingService.routeLead(leadId, organizationId);

      if (result.success) {
        return ApiResponse.success(res, 'Lead routed successfully', result);
      } else {
        return ApiResponse.error(res, result.reason, 400);
      }
    } catch (error) {
      console.error('Error routing lead:', error);
      return ApiResponse.error(res, 'Failed to route lead', 500);
    }
  }
);

// ==================== Routing Rules CRUD ====================

/**
 * GET /api/lead-routing/rules
 * Get all routing rules
 */
router.get('/rules', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId!;

    const rules = await leadRoutingService.getRoutingRules(organizationId);

    return ApiResponse.success(res, 'Routing rules retrieved', {
      rules,
      total: rules.length,
    });
  } catch (error) {
    console.error('Error fetching routing rules:', error);
    return ApiResponse.error(res, 'Failed to fetch routing rules', 500);
  }
});

/**
 * GET /api/lead-routing/rules/:ruleId
 * Get a single routing rule
 */
router.get(
  '/rules/:ruleId',
  validate([param('ruleId').isUUID()]),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;
      const { ruleId } = req.params;

      const rule = await leadRoutingService.getRoutingRule(ruleId, organizationId);

      if (!rule) {
        return ApiResponse.error(res, 'Routing rule not found', 404);
      }

      return ApiResponse.success(res, 'Routing rule retrieved', rule);
    } catch (error) {
      console.error('Error fetching routing rule:', error);
      return ApiResponse.error(res, 'Failed to fetch routing rule', 500);
    }
  }
);

/**
 * POST /api/lead-routing/rules
 * Create a routing rule
 */
router.post(
  '/rules',
  validate([
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('actionType')
      .isIn(['ASSIGN_USER', 'ASSIGN_TEAM', 'ROUND_ROBIN', 'LOAD_BALANCE'])
      .withMessage('Invalid action type'),
    body('conditions').optional().isArray(),
    body('conditionLogic').optional().isIn(['AND', 'OR']),
    body('priority').optional().isInt({ min: 0 }),
    body('assignToUserId').optional().isUUID(),
    body('assignToTeamId').optional().isUUID(),
    body('routingGroupId').optional().isUUID(),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;

      const rule = await leadRoutingService.createRoutingRule(organizationId, req.body);

      return ApiResponse.success(res, 'Routing rule created', rule, 201);
    } catch (error) {
      console.error('Error creating routing rule:', error);
      return ApiResponse.error(res, 'Failed to create routing rule', 500);
    }
  }
);

/**
 * PUT /api/lead-routing/rules/:ruleId
 * Update a routing rule
 */
router.put(
  '/rules/:ruleId',
  validate([
    param('ruleId').isUUID(),
    body('name').optional().trim().notEmpty(),
    body('actionType').optional().isIn(['ASSIGN_USER', 'ASSIGN_TEAM', 'ROUND_ROBIN', 'LOAD_BALANCE']),
    body('conditions').optional().isArray(),
    body('conditionLogic').optional().isIn(['AND', 'OR']),
    body('priority').optional().isInt({ min: 0 }),
    body('isActive').optional().isBoolean(),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;
      const { ruleId } = req.params;

      const rule = await leadRoutingService.updateRoutingRule(ruleId, organizationId, req.body);

      return ApiResponse.success(res, 'Routing rule updated', rule);
    } catch (error) {
      console.error('Error updating routing rule:', error);
      return ApiResponse.error(res, 'Failed to update routing rule', 500);
    }
  }
);

/**
 * DELETE /api/lead-routing/rules/:ruleId
 * Delete a routing rule
 */
router.delete(
  '/rules/:ruleId',
  validate([param('ruleId').isUUID()]),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;
      const { ruleId } = req.params;

      await leadRoutingService.deleteRoutingRule(ruleId, organizationId);

      return ApiResponse.success(res, 'Routing rule deleted');
    } catch (error) {
      console.error('Error deleting routing rule:', error);
      return ApiResponse.error(res, 'Failed to delete routing rule', 500);
    }
  }
);

// ==================== Routing Groups CRUD ====================

/**
 * GET /api/lead-routing/groups
 * Get all routing groups
 */
router.get('/groups', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId!;

    const groups = await leadRoutingService.getRoutingGroups(organizationId);

    return ApiResponse.success(res, 'Routing groups retrieved', {
      groups,
      total: groups.length,
    });
  } catch (error) {
    console.error('Error fetching routing groups:', error);
    return ApiResponse.error(res, 'Failed to fetch routing groups', 500);
  }
});

/**
 * POST /api/lead-routing/groups
 * Create a routing group
 */
router.post(
  '/groups',
  validate([
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('description').optional().trim(),
    body('memberUserIds').optional().isArray(),
    body('memberUserIds.*').optional().isUUID(),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;

      const group = await leadRoutingService.createRoutingGroup(organizationId, req.body);

      return ApiResponse.success(res, 'Routing group created', group, 201);
    } catch (error) {
      console.error('Error creating routing group:', error);
      return ApiResponse.error(res, 'Failed to create routing group', 500);
    }
  }
);

/**
 * PUT /api/lead-routing/groups/:groupId
 * Update a routing group
 */
router.put(
  '/groups/:groupId',
  validate([
    param('groupId').isUUID(),
    body('name').optional().trim().notEmpty(),
    body('description').optional().trim(),
    body('isActive').optional().isBoolean(),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;
      const { groupId } = req.params;

      const group = await leadRoutingService.updateRoutingGroup(groupId, organizationId, req.body);

      return ApiResponse.success(res, 'Routing group updated', group);
    } catch (error) {
      console.error('Error updating routing group:', error);
      return ApiResponse.error(res, 'Failed to update routing group', 500);
    }
  }
);

/**
 * DELETE /api/lead-routing/groups/:groupId
 * Delete a routing group
 */
router.delete(
  '/groups/:groupId',
  validate([param('groupId').isUUID()]),
  async (req: TenantRequest, res: Response) => {
    try {
      const organizationId = req.organizationId!;
      const { groupId } = req.params;

      await leadRoutingService.deleteRoutingGroup(groupId, organizationId);

      return ApiResponse.success(res, 'Routing group deleted');
    } catch (error) {
      console.error('Error deleting routing group:', error);
      return ApiResponse.error(res, 'Failed to delete routing group', 500);
    }
  }
);

// ==================== Routing Group Members ====================

/**
 * POST /api/lead-routing/groups/:groupId/members
 * Add a member to a routing group
 */
router.post(
  '/groups/:groupId/members',
  validate([
    param('groupId').isUUID(),
    body('userId').isUUID().withMessage('User ID is required'),
    body('weight').optional().isInt({ min: 1 }),
    body('maxLeads').optional().isInt({ min: 1 }),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const { groupId } = req.params;
      const { userId, weight, maxLeads } = req.body;

      const member = await leadRoutingService.addGroupMember(groupId, userId, { weight, maxLeads });

      return ApiResponse.success(res, 'Member added to group', member, 201);
    } catch (error: any) {
      console.error('Error adding group member:', error);
      if (error.code === 'P2002') {
        return ApiResponse.error(res, 'User is already a member of this group', 400);
      }
      return ApiResponse.error(res, 'Failed to add group member', 500);
    }
  }
);

/**
 * PUT /api/lead-routing/groups/:groupId/members/:memberId
 * Update a routing group member
 */
router.put(
  '/groups/:groupId/members/:memberId',
  validate([
    param('groupId').isUUID(),
    param('memberId').isUUID(),
    body('isActive').optional().isBoolean(),
    body('weight').optional().isInt({ min: 1 }),
    body('maxLeads').optional().isInt({ min: 1 }),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const { memberId } = req.params;

      const member = await leadRoutingService.updateGroupMember(memberId, req.body);

      return ApiResponse.success(res, 'Group member updated', member);
    } catch (error) {
      console.error('Error updating group member:', error);
      return ApiResponse.error(res, 'Failed to update group member', 500);
    }
  }
);

/**
 * DELETE /api/lead-routing/groups/:groupId/members/:memberId
 * Remove a member from a routing group
 */
router.delete(
  '/groups/:groupId/members/:memberId',
  validate([param('groupId').isUUID(), param('memberId').isUUID()]),
  async (req: TenantRequest, res: Response) => {
    try {
      const { memberId } = req.params;

      await leadRoutingService.removeGroupMember(memberId);

      return ApiResponse.success(res, 'Member removed from group');
    } catch (error) {
      console.error('Error removing group member:', error);
      return ApiResponse.error(res, 'Failed to remove group member', 500);
    }
  }
);

/**
 * POST /api/lead-routing/reset-daily-counts
 * Reset daily lead counts (for cron job)
 */
router.post('/reset-daily-counts', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId!;

    const count = await leadRoutingService.resetDailyLeadCounts(organizationId);

    return ApiResponse.success(res, 'Daily lead counts reset', { membersReset: count });
  } catch (error) {
    console.error('Error resetting daily counts:', error);
    return ApiResponse.error(res, 'Failed to reset daily counts', 500);
  }
});

export default router;
