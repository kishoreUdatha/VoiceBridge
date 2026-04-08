/**
 * Approval Workflow Service
 * Handles multi-level approval workflows for leads, payments, admissions, etc.
 */

import { PrismaClient, ApprovalEntityType, ApprovalStatus, ApprovalDecision, ApproverType, Prisma } from '@prisma/client';
import { pushNotificationService } from './push-notification.service';

const prisma = new PrismaClient();

interface CreateWorkflowInput {
  name: string;
  description?: string;
  entityType: ApprovalEntityType;
  conditions?: Record<string, any>;
  isDefault?: boolean;
  steps: {
    name: string;
    description?: string;
    approverType: ApproverType;
    approverRoleId?: string;
    approverUserId?: string;
    approvalMode?: 'ANY' | 'ALL';
    autoApproveConditions?: Record<string, any>;
    slaHours?: number;
    escalateAfterHours?: number;
    escalateToUserId?: string;
    escalateToRoleId?: string;
  }[];
}

interface SubmitApprovalInput {
  entityType: ApprovalEntityType;
  entityId: string;
  title: string;
  description?: string;
  amount?: number;
  metadata?: Record<string, any>;
  workflowId?: string; // Optional - will use default if not provided
}

interface ApprovalActionInput {
  decision: ApprovalDecision;
  comments?: string;
}

class ApprovalWorkflowService {
  /**
   * Create a new approval workflow
   */
  async createWorkflow(organizationId: string, createdById: string, input: CreateWorkflowInput) {
    const { steps, ...workflowData } = input;

    // If this is set as default, unset other defaults for this entity type
    if (input.isDefault) {
      await prisma.approvalWorkflow.updateMany({
        where: {
          organizationId,
          entityType: input.entityType,
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    const workflow = await prisma.approvalWorkflow.create({
      data: {
        organizationId,
        createdById,
        ...workflowData,
        steps: {
          create: steps.map((step, index) => ({
            stepOrder: index + 1,
            name: step.name,
            description: step.description,
            approverType: step.approverType,
            approverRoleId: step.approverRoleId,
            approverUserId: step.approverUserId,
            approvalMode: step.approvalMode || 'ANY',
            autoApproveConditions: step.autoApproveConditions,
            slaHours: step.slaHours,
            escalateAfterHours: step.escalateAfterHours,
            escalateToUserId: step.escalateToUserId,
            escalateToRoleId: step.escalateToRoleId,
          })),
        },
      },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' },
          include: {
            approverRole: true,
            approverUser: true,
          },
        },
      },
    });

    return workflow;
  }

  /**
   * Update an existing workflow
   */
  async updateWorkflow(
    organizationId: string,
    workflowId: string,
    input: Partial<CreateWorkflowInput>
  ) {
    const { steps, ...workflowData } = input;

    // If this is set as default, unset other defaults
    if (input.isDefault && input.entityType) {
      await prisma.approvalWorkflow.updateMany({
        where: {
          organizationId,
          entityType: input.entityType,
          isDefault: true,
          id: { not: workflowId },
        },
        data: { isDefault: false },
      });
    }

    // Update workflow
    const workflow = await prisma.approvalWorkflow.update({
      where: { id: workflowId },
      data: workflowData,
    });

    // Update steps if provided
    if (steps) {
      // Delete existing steps
      await prisma.approvalStep.deleteMany({
        where: { workflowId },
      });

      // Create new steps
      await prisma.approvalStep.createMany({
        data: steps.map((step, index) => ({
          workflowId,
          stepOrder: index + 1,
          name: step.name,
          description: step.description,
          approverType: step.approverType,
          approverRoleId: step.approverRoleId,
          approverUserId: step.approverUserId,
          approvalMode: step.approvalMode || 'ANY',
          autoApproveConditions: step.autoApproveConditions,
          slaHours: step.slaHours,
          escalateAfterHours: step.escalateAfterHours,
          escalateToUserId: step.escalateToUserId,
          escalateToRoleId: step.escalateToRoleId,
        })),
      });
    }

    return this.getWorkflow(organizationId, workflowId);
  }

  /**
   * Get a workflow by ID
   */
  async getWorkflow(organizationId: string, workflowId: string) {
    return prisma.approvalWorkflow.findFirst({
      where: { id: workflowId, organizationId },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' },
          include: {
            approverRole: true,
            approverUser: true,
            escalateToUser: true,
            escalateToRole: true,
          },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  /**
   * Get all workflows for an organization
   */
  async getWorkflows(organizationId: string, entityType?: ApprovalEntityType) {
    return prisma.approvalWorkflow.findMany({
      where: {
        organizationId,
        ...(entityType && { entityType }),
      },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' },
        },
        _count: {
          select: { requests: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Delete a workflow
   */
  async deleteWorkflow(organizationId: string, workflowId: string) {
    // Check if there are pending requests
    const pendingRequests = await prisma.approvalRequest.count({
      where: {
        workflowId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
    });

    if (pendingRequests > 0) {
      throw new Error('Cannot delete workflow with pending approval requests');
    }

    await prisma.approvalWorkflow.delete({
      where: { id: workflowId },
    });
  }

  /**
   * Submit an item for approval
   */
  async submitForApproval(
    organizationId: string,
    submittedById: string,
    input: SubmitApprovalInput
  ) {
    // Find the appropriate workflow
    let workflow;
    if (input.workflowId) {
      workflow = await prisma.approvalWorkflow.findFirst({
        where: { id: input.workflowId, organizationId, isActive: true },
        include: { steps: { orderBy: { stepOrder: 'asc' } } },
      });
    } else {
      // Find default workflow for this entity type
      workflow = await prisma.approvalWorkflow.findFirst({
        where: {
          organizationId,
          entityType: input.entityType,
          isDefault: true,
          isActive: true,
        },
        include: { steps: { orderBy: { stepOrder: 'asc' } } },
      });
    }

    if (!workflow) {
      throw new Error(`No active approval workflow found for ${input.entityType}`);
    }

    if (workflow.steps.length === 0) {
      throw new Error('Workflow has no approval steps defined');
    }

    // Check if conditions match
    if (workflow.conditions) {
      const conditions = workflow.conditions as Record<string, any>;
      if (conditions.amountGreaterThan && input.amount && input.amount <= conditions.amountGreaterThan) {
        throw new Error('Amount does not meet workflow threshold - no approval needed');
      }
    }

    // Create the approval request
    const request = await prisma.approvalRequest.create({
      data: {
        organizationId,
        workflowId: workflow.id,
        entityType: input.entityType,
        entityId: input.entityId,
        title: input.title,
        description: input.description,
        amount: input.amount,
        metadata: input.metadata,
        submittedById,
        status: 'PENDING',
        currentStep: 1,
      },
      include: {
        workflow: {
          include: {
            steps: { orderBy: { stepOrder: 'asc' } },
          },
        },
        submittedBy: {
          select: { id: true, firstName: true, lastName: true, email: true, managerId: true, branchId: true },
        },
      },
    });

    // Check for auto-approve on first step
    const firstStep = workflow.steps[0];
    const autoApproved = await this.checkAutoApprove(request, firstStep, input.amount);

    if (autoApproved) {
      return this.processAutoApproval(request.id, firstStep.id, submittedById);
    }

    // Notify approvers
    await this.notifyApprovers(request, firstStep);

    return request;
  }

  /**
   * Check if auto-approve conditions are met
   */
  private async checkAutoApprove(
    request: any,
    step: any,
    amount?: number
  ): Promise<boolean> {
    if (!step.autoApproveConditions) return false;

    const conditions = step.autoApproveConditions as Record<string, any>;

    if (conditions.amountLessThan && amount !== undefined) {
      return amount < conditions.amountLessThan;
    }

    return false;
  }

  /**
   * Process auto-approval
   */
  private async processAutoApproval(requestId: string, stepId: string, actorId: string) {
    // Create auto-approval action
    await prisma.approvalAction.create({
      data: {
        requestId,
        stepId,
        actorId,
        decision: 'APPROVED',
        comments: 'Auto-approved based on workflow conditions',
        isAutoApproved: true,
      },
    });

    // Move to next step or complete
    return this.advanceToNextStep(requestId);
  }

  /**
   * Take action on an approval request
   */
  async takeAction(
    organizationId: string,
    requestId: string,
    actorId: string,
    input: ApprovalActionInput
  ) {
    const request = await prisma.approvalRequest.findFirst({
      where: { id: requestId, organizationId },
      include: {
        workflow: {
          include: {
            steps: { orderBy: { stepOrder: 'asc' } },
          },
        },
        submittedBy: true,
      },
    });

    if (!request) {
      throw new Error('Approval request not found');
    }

    if (request.status !== 'PENDING' && request.status !== 'IN_PROGRESS') {
      throw new Error('This request is no longer pending');
    }

    // Get current step
    const currentStep = request.workflow.steps.find(s => s.stepOrder === request.currentStep);
    if (!currentStep) {
      throw new Error('Current step not found');
    }

    // Verify actor can approve this step
    const canApprove = await this.canUserApprove(actorId, currentStep, request.submittedBy);
    if (!canApprove) {
      throw new Error('You are not authorized to approve this request');
    }

    // Create the action
    await prisma.approvalAction.create({
      data: {
        requestId,
        stepId: currentStep.id,
        actorId,
        decision: input.decision,
        comments: input.comments,
      },
    });

    // Handle based on decision
    if (input.decision === 'REJECTED') {
      return this.rejectRequest(requestId, actorId, input.comments);
    } else if (input.decision === 'REQUEST_CHANGES') {
      return this.requestChanges(requestId, actorId, input.comments);
    } else if (input.decision === 'APPROVED') {
      // Check if all required approvals are in (for ALL mode)
      if (currentStep.approvalMode === 'ALL') {
        const allApproved = await this.checkAllApprovals(requestId, currentStep);
        if (!allApproved) {
          return prisma.approvalRequest.findFirst({
            where: { id: requestId },
            include: { workflow: true, actions: true },
          });
        }
      }
      return this.advanceToNextStep(requestId);
    }

    return this.getRequest(organizationId, requestId);
  }

  /**
   * Check if user can approve at this step
   */
  private async canUserApprove(
    userId: string,
    step: any,
    submitter: any
  ): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) return false;

    switch (step.approverType) {
      case 'SPECIFIC_USER':
        return step.approverUserId === userId;

      case 'ROLE':
        return user.roleId === step.approverRoleId;

      case 'MANAGER':
        return submitter.managerId === userId;

      case 'BRANCH_MANAGER':
        const branch = await prisma.branch.findFirst({
          where: { id: submitter.branchId },
        });
        return branch?.managerId === userId;

      default:
        return false;
    }
  }

  /**
   * Check if all required approvals are complete
   */
  private async checkAllApprovals(requestId: string, step: any): Promise<boolean> {
    const actions = await prisma.approvalAction.findMany({
      where: {
        requestId,
        stepId: step.id,
        decision: 'APPROVED',
      },
    });

    // For now, if ANY approval exists, consider it done
    // In a more complex implementation, you'd track all required approvers
    return actions.length > 0;
  }

  /**
   * Advance to the next step or complete the request
   */
  private async advanceToNextStep(requestId: string) {
    const request = await prisma.approvalRequest.findFirst({
      where: { id: requestId },
      include: {
        workflow: {
          include: {
            steps: { orderBy: { stepOrder: 'asc' } },
          },
        },
        submittedBy: true,
      },
    });

    if (!request) throw new Error('Request not found');

    const nextStepOrder = request.currentStep + 1;
    const nextStep = request.workflow.steps.find(s => s.stepOrder === nextStepOrder);

    if (!nextStep) {
      // No more steps - approve the request
      const updated = await prisma.approvalRequest.update({
        where: { id: requestId },
        data: {
          status: 'APPROVED',
          finalDecision: 'APPROVED',
          completedAt: new Date(),
        },
        include: {
          workflow: true,
          actions: {
            include: {
              actor: { select: { id: true, firstName: true, lastName: true } },
              step: true,
            },
          },
          submittedBy: true,
        },
      });

      // Notify submitter
      await this.notifySubmitter(updated, 'APPROVED');

      // Trigger any post-approval actions
      await this.executePostApprovalActions(updated);

      return updated;
    }

    // Move to next step
    const updated = await prisma.approvalRequest.update({
      where: { id: requestId },
      data: {
        currentStep: nextStepOrder,
        status: 'IN_PROGRESS',
      },
      include: {
        workflow: {
          include: { steps: { orderBy: { stepOrder: 'asc' } } },
        },
        submittedBy: true,
      },
    });

    // Notify next step approvers
    await this.notifyApprovers(updated, nextStep);

    return updated;
  }

  /**
   * Reject the request
   */
  private async rejectRequest(requestId: string, decidedById: string, comments?: string) {
    const updated = await prisma.approvalRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        finalDecision: 'REJECTED',
        finalComments: comments,
        decidedById,
        decidedAt: new Date(),
        completedAt: new Date(),
      },
      include: {
        workflow: true,
        actions: true,
        submittedBy: true,
        decidedBy: true,
      },
    });

    // Notify submitter
    await this.notifySubmitter(updated, 'REJECTED');

    return updated;
  }

  /**
   * Request changes
   */
  private async requestChanges(requestId: string, decidedById: string, comments?: string) {
    return prisma.approvalRequest.update({
      where: { id: requestId },
      data: {
        status: 'PENDING',
        finalComments: comments,
      },
      include: {
        workflow: true,
        actions: true,
        submittedBy: true,
      },
    });
  }

  /**
   * Notify approvers of pending request
   */
  private async notifyApprovers(request: any, step: any) {
    const approverIds: string[] = [];

    if (step.approverType === 'SPECIFIC_USER' && step.approverUserId) {
      approverIds.push(step.approverUserId);
    } else if (step.approverType === 'ROLE' && step.approverRoleId) {
      const users = await prisma.user.findMany({
        where: {
          organizationId: request.organizationId,
          roleId: step.approverRoleId,
          isActive: true,
        },
        select: { id: true },
      });
      approverIds.push(...users.map(u => u.id));
    } else if (step.approverType === 'MANAGER' && request.submittedBy?.managerId) {
      approverIds.push(request.submittedBy.managerId);
    } else if (step.approverType === 'BRANCH_MANAGER' && request.submittedBy?.branchId) {
      const branch = await prisma.branch.findFirst({
        where: { id: request.submittedBy.branchId },
      });
      if (branch?.managerId) {
        approverIds.push(branch.managerId);
      }
    }

    if (approverIds.length > 0) {
      await pushNotificationService.sendToUsers(approverIds, {
        title: 'Approval Required',
        body: `${request.title} - Submitted by ${request.submittedBy?.firstName} ${request.submittedBy?.lastName}`,
        type: 'SYSTEM',
        data: {
          requestId: request.id,
          entityType: request.entityType,
          entityId: request.entityId,
          action: 'APPROVAL_PENDING',
        },
      });
    }
  }

  /**
   * Notify submitter of decision
   */
  private async notifySubmitter(request: any, decision: 'APPROVED' | 'REJECTED') {
    await pushNotificationService.sendToUser(request.submittedById, {
      title: decision === 'APPROVED' ? 'Request Approved' : 'Request Rejected',
      body: request.title,
      type: 'SYSTEM',
      data: {
        requestId: request.id,
        entityType: request.entityType,
        entityId: request.entityId,
        action: `APPROVAL_${decision}`,
      },
    });
  }

  /**
   * Execute post-approval actions based on entity type
   */
  private async executePostApprovalActions(request: any) {
    // This can be extended to trigger specific actions based on entity type
    // For example, updating lead status, processing payment, etc.
    console.log(`[ApprovalWorkflow] Post-approval action for ${request.entityType}:${request.entityId}`);
  }

  /**
   * Get a single approval request
   */
  async getRequest(organizationId: string, requestId: string) {
    return prisma.approvalRequest.findFirst({
      where: { id: requestId, organizationId },
      include: {
        workflow: {
          include: {
            steps: { orderBy: { stepOrder: 'asc' } },
          },
        },
        submittedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        decidedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        actions: {
          include: {
            actor: { select: { id: true, firstName: true, lastName: true } },
            step: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  /**
   * Get pending approvals for a user
   */
  async getPendingApprovals(organizationId: string, userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) return [];

    // Find all pending requests where this user can approve
    const requests = await prisma.approvalRequest.findMany({
      where: {
        organizationId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
      include: {
        workflow: {
          include: {
            steps: { orderBy: { stepOrder: 'asc' } },
          },
        },
        submittedBy: {
          select: { id: true, firstName: true, lastName: true, email: true, managerId: true, branchId: true },
        },
      },
      orderBy: { submittedAt: 'asc' },
    });

    // Filter to only requests where user can approve current step
    const pendingForUser = [];
    for (const request of requests) {
      const currentStep = request.workflow.steps.find(s => s.stepOrder === request.currentStep);
      if (currentStep) {
        const canApprove = await this.canUserApprove(userId, currentStep, request.submittedBy);
        if (canApprove) {
          pendingForUser.push(request);
        }
      }
    }

    return pendingForUser;
  }

  /**
   * Get all requests submitted by a user
   */
  async getMyRequests(organizationId: string, userId: string, status?: ApprovalStatus) {
    return prisma.approvalRequest.findMany({
      where: {
        organizationId,
        submittedById: userId,
        ...(status && { status }),
      },
      include: {
        workflow: true,
        actions: {
          include: {
            actor: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  /**
   * Get approval requests for an organization with filters
   */
  async getRequests(
    organizationId: string,
    filters: {
      status?: ApprovalStatus;
      entityType?: ApprovalEntityType;
      submittedById?: string;
      dateFrom?: Date;
      dateTo?: Date;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const { page = 1, limit = 20, ...where } = filters;

    const whereClause: Prisma.ApprovalRequestWhereInput = {
      organizationId,
      ...(where.status && { status: where.status }),
      ...(where.entityType && { entityType: where.entityType }),
      ...(where.submittedById && { submittedById: where.submittedById }),
      ...(where.dateFrom || where.dateTo
        ? {
            submittedAt: {
              ...(where.dateFrom && { gte: where.dateFrom }),
              ...(where.dateTo && { lte: where.dateTo }),
            },
          }
        : {}),
    };

    const [requests, total] = await Promise.all([
      prisma.approvalRequest.findMany({
        where: whereClause,
        include: {
          workflow: true,
          submittedBy: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          decidedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { submittedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.approvalRequest.count({ where: whereClause }),
    ]);

    return {
      requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Cancel an approval request
   */
  async cancelRequest(organizationId: string, requestId: string, userId: string) {
    const request = await prisma.approvalRequest.findFirst({
      where: { id: requestId, organizationId },
    });

    if (!request) {
      throw new Error('Request not found');
    }

    if (request.submittedById !== userId) {
      throw new Error('Only the submitter can cancel this request');
    }

    if (request.status !== 'PENDING' && request.status !== 'IN_PROGRESS') {
      throw new Error('Cannot cancel a request that is already completed');
    }

    return prisma.approvalRequest.update({
      where: { id: requestId },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
      },
    });
  }

  /**
   * Get approval statistics
   */
  async getStatistics(organizationId: string, dateFrom?: Date, dateTo?: Date) {
    const whereClause: Prisma.ApprovalRequestWhereInput = {
      organizationId,
      ...(dateFrom || dateTo
        ? {
            submittedAt: {
              ...(dateFrom && { gte: dateFrom }),
              ...(dateTo && { lte: dateTo }),
            },
          }
        : {}),
    };

    const [byStatus, byEntityType, totalAmount] = await Promise.all([
      prisma.approvalRequest.groupBy({
        by: ['status'],
        where: whereClause,
        _count: true,
      }),
      prisma.approvalRequest.groupBy({
        by: ['entityType'],
        where: whereClause,
        _count: true,
      }),
      prisma.approvalRequest.aggregate({
        where: { ...whereClause, status: 'APPROVED' },
        _sum: { amount: true },
      }),
    ]);

    return {
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {} as Record<string, number>),
      byEntityType: byEntityType.reduce((acc, item) => {
        acc[item.entityType] = item._count;
        return acc;
      }, {} as Record<string, number>),
      totalApprovedAmount: totalAmount._sum.amount || 0,
    };
  }
}

export const approvalWorkflowService = new ApprovalWorkflowService();
