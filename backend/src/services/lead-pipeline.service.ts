/**
 * Lead Pipeline Service
 * Unified Pipeline Integration for Leads
 *
 * Pipeline = Generic engine (same for all industries)
 * Stages = Industry-specific (customizable per tenant)
 */

import { prisma } from '../config/database';
import { NotFoundError, BadRequestError } from '../utils/errors';

interface MoveStageInput {
  leadId: string;
  toStageId: string;
  userId: string;
  reason?: string;
}

interface StageHistoryEntry {
  stageId: string;
  stageName: string;
  enteredAt: Date;
  exitedAt?: Date;
  durationMinutes?: number;
  changedByUserId?: string;
}

export class LeadPipelineService {
  /**
   * Get default pipeline for an organization
   */
  async getDefaultPipeline(organizationId: string) {
    const pipeline = await prisma.pipeline.findFirst({
      where: {
        organizationId,
        entityType: 'LEAD',
        isDefault: true,
        isActive: true,
      },
      include: {
        stages: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    return pipeline;
  }

  /**
   * Get entry stage (first stage) of a pipeline
   */
  async getEntryStage(pipelineId: string) {
    const entryStage = await prisma.pipelineStage.findFirst({
      where: {
        pipelineId,
        isActive: true,
        OR: [
          { stageType: 'entry' },
          { order: 1 },
        ],
      },
      orderBy: { order: 'asc' },
    });

    return entryStage;
  }

  /**
   * Auto-assign a lead to the default pipeline
   * Called when a new lead is created
   */
  async assignLeadToPipeline(leadId: string, organizationId: string) {
    // Get default pipeline
    const pipeline = await this.getDefaultPipeline(organizationId);
    if (!pipeline) {
      console.warn(`[LeadPipeline] No default pipeline found for org ${organizationId}`);
      return null;
    }

    // Get entry stage
    const entryStage = await this.getEntryStage(pipeline.id);
    if (!entryStage) {
      console.warn(`[LeadPipeline] No entry stage found for pipeline ${pipeline.id}`);
      return null;
    }

    // Update lead with pipeline stage
    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        pipelineStageId: entryStage.id,
        pipelineEnteredAt: new Date(),
        pipelineDaysInStage: 0,
      },
    });

    // Create pipeline record for tracking
    await prisma.pipelineRecord.create({
      data: {
        pipelineId: pipeline.id,
        stageId: entryStage.id,
        entityType: 'LEAD',
        entityId: leadId,
        enteredStageAt: new Date(),
        daysInStage: 0,
        totalDaysInPipeline: 0,
      },
    });

    // Log pipeline assignment in lead activity timeline
    await prisma.leadActivity.create({
      data: {
        leadId,
        type: 'STAGE_CHANGED',
        title: 'Added to pipeline',
        description: `Added to pipeline "${pipeline.name}" at stage "${entryStage.name}"`,
        metadata: {
          pipelineId: pipeline.id,
          pipelineName: pipeline.name,
          stageId: entryStage.id,
          stageName: entryStage.name,
        },
      },
    });

    console.log(`[LeadPipeline] Lead ${leadId} assigned to stage "${entryStage.name}" in pipeline "${pipeline.name}"`);
    return updatedLead;
  }

  /**
   * Move a lead to a different stage
   */
  async moveLeadToStage(input: MoveStageInput) {
    const { leadId, toStageId, userId, reason } = input;

    // Get lead with current stage
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        pipelineStage: {
          include: { pipeline: true },
        },
      },
    });

    if (!lead) {
      throw new NotFoundError('Lead not found');
    }

    // Get target stage
    const toStage = await prisma.pipelineStage.findUnique({
      where: { id: toStageId },
      include: { pipeline: true },
    });

    if (!toStage) {
      throw new NotFoundError('Target stage not found');
    }

    const fromStageId = lead.pipelineStageId;
    const fromStage = lead.pipelineStage;

    // Check if transition is allowed (if transitions are defined)
    if (fromStageId) {
      const transition = await prisma.pipelineStageTransition.findUnique({
        where: {
          fromStageId_toStageId: {
            fromStageId,
            toStageId,
          },
        },
      });

      // If transition exists and is not allowed, block it
      if (transition && !transition.isAllowed) {
        throw new BadRequestError(`Cannot move from "${fromStage?.name}" to "${toStage.name}"`);
      }

      // Check if approval is required
      if (transition?.requiresApproval) {
        // For now, we'll allow it but log a warning
        // TODO: Implement approval workflow
        console.warn(`[LeadPipeline] Move requires approval: ${fromStage?.name} -> ${toStage.name}`);
      }
    }

    // Calculate days in previous stage
    let daysInPreviousStage = 0;
    if (lead.pipelineEnteredAt) {
      const msInStage = Date.now() - lead.pipelineEnteredAt.getTime();
      daysInPreviousStage = Math.floor(msInStage / (1000 * 60 * 60 * 24));
    }

    // Update lead
    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        pipelineStageId: toStageId,
        pipelineEnteredAt: new Date(),
        pipelineDaysInStage: 0,
        // If moving to won/lost stage, mark as converted
        isConverted: toStage.stageType === 'won',
        convertedAt: toStage.stageType === 'won' ? new Date() : lead.convertedAt,
      },
      include: {
        pipelineStage: true,
      },
    });

    // Update pipeline record
    const pipelineRecord = await prisma.pipelineRecord.findFirst({
      where: {
        entityType: 'LEAD',
        entityId: leadId,
      },
    });

    if (pipelineRecord) {
      // Record stage history
      await prisma.pipelineStageHistory.create({
        data: {
          pipelineRecordId: pipelineRecord.id,
          stageId: toStageId,
          action: 'entered',
          previousStageId: fromStageId,
          enteredAt: new Date(),
          changedByUserId: userId,
          changeReason: reason,
        },
      });

      // Update record's current stage
      await prisma.pipelineRecord.update({
        where: { id: pipelineRecord.id },
        data: {
          stageId: toStageId,
          enteredStageAt: new Date(),
          daysInStage: 0,
          totalDaysInPipeline: pipelineRecord.totalDaysInPipeline + daysInPreviousStage,
          outcome: toStage.stageType === 'won' ? 'won' : toStage.stageType === 'lost' ? 'lost' : null,
        },
      });
    }

    // Log stage change in lead activity timeline
    await prisma.leadActivity.create({
      data: {
        leadId,
        userId,
        type: 'STAGE_CHANGED',
        title: 'Stage changed',
        description: `Moved from "${fromStage?.name || 'None'}" to "${toStage.name}"${reason ? ` - ${reason}` : ''}`,
        metadata: {
          fromStageId: fromStageId || null,
          fromStageName: fromStage?.name || null,
          toStageId,
          toStageName: toStage.name,
          reason: reason || null,
          daysInPreviousStage,
        },
      },
    });

    console.log(`[LeadPipeline] Lead ${leadId} moved from "${fromStage?.name || 'None'}" to "${toStage.name}"`);
    return updatedLead;
  }

  /**
   * Get lead's stage history
   */
  async getLeadStageHistory(leadId: string): Promise<StageHistoryEntry[]> {
    const pipelineRecord = await prisma.pipelineRecord.findFirst({
      where: {
        entityType: 'LEAD',
        entityId: leadId,
      },
    });

    if (!pipelineRecord) {
      return [];
    }

    const history = await prisma.pipelineStageHistory.findMany({
      where: { pipelineRecordId: pipelineRecord.id },
      include: { stage: true },
      orderBy: { enteredAt: 'asc' },
    });

    return history.map((h) => ({
      stageId: h.stageId,
      stageName: h.stage.name,
      enteredAt: h.enteredAt,
      exitedAt: h.exitedAt || undefined,
      durationMinutes: h.durationMinutes || undefined,
      changedByUserId: h.changedByUserId || undefined,
    }));
  }

  /**
   * Get pipeline stages for an organization's leads
   * If leadId is provided, returns stages from that lead's specific pipeline
   * Otherwise, uses default pipeline or falls back to any active LEAD pipeline
   */
  async getPipelineStages(organizationId: string, leadId?: string) {
    let pipeline = null;

    // If leadId provided, get stages from that lead's pipeline
    if (leadId) {
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        select: { pipelineStageId: true },
      });

      if (lead?.pipelineStageId) {
        const stage = await prisma.pipelineStage.findUnique({
          where: { id: lead.pipelineStageId },
          include: {
            pipeline: {
              include: {
                stages: {
                  where: { isActive: true },
                  orderBy: { order: 'asc' },
                },
              },
            },
          },
        });

        if (stage?.pipeline) {
          pipeline = stage.pipeline;
          console.log(`[LeadPipeline] Using lead's pipeline "${pipeline.name}" for lead ${leadId}`);
        }
      }
    }

    // Fallback: try default pipeline
    if (!pipeline) {
      pipeline = await this.getDefaultPipeline(organizationId);
    }

    // If no default, get the first active LEAD pipeline
    if (!pipeline) {
      pipeline = await prisma.pipeline.findFirst({
        where: {
          organizationId,
          entityType: 'LEAD',
          isActive: true,
        },
        include: {
          stages: {
            where: { isActive: true },
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' }, // Most recently created
      });
    }

    if (!pipeline) {
      console.log(`[LeadPipeline] No pipeline found for org ${organizationId}`);
      return [];
    }

    console.log(`[LeadPipeline] Returning ${pipeline.stages.length} stages from pipeline "${pipeline.name}"`);
    return pipeline.stages;
  }

  /**
   * Get leads grouped by pipeline stage (for Kanban view)
   */
  async getLeadsByStage(organizationId: string, filters?: {
    assignedTo?: string;
    source?: string;
    search?: string;
  }) {
    const pipeline = await this.getDefaultPipeline(organizationId);
    if (!pipeline) {
      return { pipeline: null, stages: [] };
    }

    // Build where clause
    const whereClause: any = {
      organizationId,
      pipelineStageId: { not: null },
    };

    if (filters?.assignedTo) {
      whereClause.assignments = {
        some: { assignedToId: filters.assignedTo, isActive: true },
      };
    }

    if (filters?.source) {
      whereClause.source = filters.source;
    }

    if (filters?.search) {
      whereClause.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search } },
      ];
    }

    // Get leads with pipeline stage info
    const leads = await prisma.lead.findMany({
      where: whereClause,
      include: {
        pipelineStage: true,
        assignments: {
          where: { isActive: true },
          include: { assignedTo: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Group leads by stage
    const stagesWithLeads = pipeline.stages.map((stage) => ({
      ...stage,
      leads: leads.filter((l) => l.pipelineStageId === stage.id),
      count: leads.filter((l) => l.pipelineStageId === stage.id).length,
    }));

    return {
      pipeline,
      stages: stagesWithLeads,
      totalLeads: leads.length,
    };
  }

  /**
   * Get pipeline analytics
   */
  async getPipelineAnalytics(organizationId: string) {
    const pipeline = await this.getDefaultPipeline(organizationId);
    if (!pipeline) {
      return null;
    }

    // Get lead counts by stage
    const stageCounts = await prisma.lead.groupBy({
      by: ['pipelineStageId'],
      where: {
        organizationId,
        pipelineStageId: { not: null },
      },
      _count: { id: true },
    });

    // Get won/lost counts
    const wonCount = await prisma.lead.count({
      where: {
        organizationId,
        pipelineStage: { stageType: 'won' },
      },
    });

    const lostCount = await prisma.lead.count({
      where: {
        organizationId,
        pipelineStage: { stageType: 'lost' },
      },
    });

    const totalLeads = await prisma.lead.count({
      where: {
        organizationId,
        pipelineStageId: { not: null },
      },
    });

    // Calculate conversion rate
    const closedDeals = wonCount + lostCount;
    const conversionRate = closedDeals > 0 ? (wonCount / closedDeals) * 100 : 0;

    // Stage analytics
    const stageStats = pipeline.stages.map((stage) => {
      const count = stageCounts.find((sc) => sc.pipelineStageId === stage.id)?._count?.id || 0;
      return {
        stageId: stage.id,
        stageName: stage.name,
        stageType: stage.stageType,
        color: stage.color,
        count,
        probability: stage.probability,
      };
    });

    return {
      pipelineId: pipeline.id,
      pipelineName: pipeline.name,
      totalLeads,
      wonCount,
      lostCount,
      conversionRate: Math.round(conversionRate * 10) / 10,
      stageStats,
    };
  }

  /**
   * Check and update SLA status for leads
   */
  async checkSLABreaches(organizationId: string) {
    const pipeline = await this.getDefaultPipeline(organizationId);
    if (!pipeline) {
      return [];
    }

    const breaches: any[] = [];

    for (const stage of pipeline.stages) {
      if (!stage.slaHours) continue;

      const slaThreshold = new Date();
      slaThreshold.setHours(slaThreshold.getHours() - stage.slaHours);

      const breachedLeads = await prisma.lead.findMany({
        where: {
          organizationId,
          pipelineStageId: stage.id,
          pipelineEnteredAt: { lt: slaThreshold },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          pipelineEnteredAt: true,
        },
      });

      for (const lead of breachedLeads) {
        const hoursInStage = lead.pipelineEnteredAt
          ? Math.floor((Date.now() - lead.pipelineEnteredAt.getTime()) / (1000 * 60 * 60))
          : 0;

        breaches.push({
          leadId: lead.id,
          leadName: `${lead.firstName} ${lead.lastName || ''}`.trim(),
          stageId: stage.id,
          stageName: stage.name,
          slaHours: stage.slaHours,
          hoursInStage,
          hoursOverdue: hoursInStage - stage.slaHours,
        });
      }
    }

    return breaches;
  }
}

export const leadPipelineService = new LeadPipelineService();
