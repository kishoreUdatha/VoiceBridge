/**
 * Customer Journey Mapping Service
 * Handles journey templates, touchpoints, and lifecycle tracking
 */

import { PrismaClient, JourneyStatus } from '@prisma/client';

const prisma = new PrismaClient();

interface JourneyStage {
  name: string;
  description?: string;
  order: number;
  expectedDays?: number;
  touchpoints?: {
    type: string;
    channel?: string;
    content?: string;
    delayDays?: number;
  }[];
}

interface JourneyTemplateConfig {
  name: string;
  description?: string;
  type?: string;
  stages: JourneyStage[];
  entryCriteria?: Record<string, any>;
}

export const customerJourneyService = {
  // Get all journey templates
  async getTemplates(organizationId: string) {
    return prisma.journeyTemplate.findMany({
      where: { organizationId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  },

  // Get single template
  async getTemplate(id: string) {
    return prisma.journeyTemplate.findUnique({
      where: { id },
    });
  },

  // Create journey template
  async createTemplate(organizationId: string, config: JourneyTemplateConfig) {
    return prisma.journeyTemplate.create({
      data: {
        organizationId,
        name: config.name,
        description: config.description,
        type: (config.type as any) || 'CUSTOM',
        stages: config.stages as any,
        entryCriteria: config.entryCriteria as any,
      },
    });
  },

  // Update template
  async updateTemplate(id: string, updates: Partial<JourneyTemplateConfig>) {
    const data: any = {};
    if (updates.name !== undefined) data.name = updates.name;
    if (updates.description !== undefined) data.description = updates.description;
    if (updates.stages !== undefined) data.stages = updates.stages;
    if (updates.entryCriteria !== undefined) data.entryCriteria = updates.entryCriteria;

    return prisma.journeyTemplate.update({
      where: { id },
      data,
    });
  },

  // Get all customer journeys
  async getJourneys(organizationId: string, filters?: any) {
    const where: any = { organizationId };

    if (filters?.status) where.status = filters.status;
    if (filters?.templateId) where.templateId = filters.templateId;
    if (filters?.leadId) where.leadId = filters.leadId;
    if (filters?.accountId) where.accountId = filters.accountId;

    return prisma.customerJourney.findMany({
      where,
      include: {
        template: { select: { id: true, name: true } },
        _count: { select: { touchpoints: true } },
      },
      orderBy: { startedAt: 'desc' },
      take: filters?.limit || 50,
    });
  },

  // Get single journey with touchpoints
  async getJourney(id: string) {
    return prisma.customerJourney.findUnique({
      where: { id },
      include: {
        template: true,
        touchpoints: { orderBy: { occurredAt: 'asc' } },
      },
    });
  },

  // Start a customer journey
  async startJourney(
    organizationId: string,
    templateId: string,
    data: { leadId?: string; accountId?: string; contactId?: string }
  ) {
    const template = await prisma.journeyTemplate.findUnique({ where: { id: templateId } });
    if (!template) throw new Error('Template not found');

    const stages = template.stages as unknown as JourneyStage[];
    const firstStage = stages.find((s) => s.order === 0) || stages[0];

    const journey = await prisma.customerJourney.create({
      data: {
        organizationId,
        templateId,
        leadId: data.leadId,
        accountId: data.accountId,
        currentStage: firstStage?.name || 'Start',
        currentStageIndex: 0,
        startedAt: new Date(),
      },
    });

    // Create initial touchpoints from template
    if (firstStage?.touchpoints) {
      await this.createTouchpointsFromStage(journey.id, firstStage);
    }

    return this.getJourney(journey.id);
  },

  // Create touchpoints from stage definition
  async createTouchpointsFromStage(journeyId: string, stage: JourneyStage) {
    if (!stage.touchpoints || stage.touchpoints.length === 0) return;

    const touchpoints = stage.touchpoints.map((tp) => ({
      journeyId,
      stage: stage.name,
      channel: tp.channel || 'default',
      action: String(tp.type) || 'touchpoint',
      data: tp.content ? { content: tp.content, delayDays: tp.delayDays } : null,
      occurredAt: new Date(),
    }));

    await prisma.journeyTouchpoint.createMany({ data: touchpoints });
  },

  // Move to next stage
  async advanceStage(journeyId: string) {
    const journey = await this.getJourney(journeyId);
    if (!journey || !journey.template) throw new Error('Journey not found');

    const stages = journey.template.stages as JourneyStage[];
    const currentIndex = stages.findIndex((s) => s.name === journey.currentStage);
    const nextStage = stages[currentIndex + 1];

    if (!nextStage) {
      // Journey complete
      return prisma.customerJourney.update({
        where: { id: journeyId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });
    }

    // Update journey stage
    const updated = await prisma.customerJourney.update({
      where: { id: journeyId },
      data: {
        currentStage: nextStage.name,
        currentStageIndex: currentIndex + 1,
      },
    });

    // Create touchpoints for new stage
    await this.createTouchpointsFromStage(journeyId, nextStage);

    return updated;
  },

  // Record touchpoint completion
  async completeTouchpoint(
    touchpointId: string,
    outcome: string,
    response?: any,
    sentiment?: string
  ) {
    return prisma.journeyTouchpoint.update({
      where: { id: touchpointId },
      data: {
        outcome,
        data: response ? { response, sentiment } : undefined,
      },
    });
  },

  // Skip touchpoint
  async skipTouchpoint(touchpointId: string, reason: string) {
    return prisma.journeyTouchpoint.update({
      where: { id: touchpointId },
      data: {
        outcome: `skipped: ${reason}`,
      },
    });
  },

  // Pause journey
  async pauseJourney(journeyId: string) {
    return prisma.customerJourney.update({
      where: { id: journeyId },
      data: { status: 'PAUSED' },
    });
  },

  // Resume journey
  async resumeJourney(journeyId: string) {
    return prisma.customerJourney.update({
      where: { id: journeyId },
      data: { status: 'ACTIVE' },
    });
  },

  // Exit journey
  async exitJourney(journeyId: string, reason: string) {
    return prisma.customerJourney.update({
      where: { id: journeyId },
      data: {
        status: 'EXITED',
        completedAt: new Date(),
        exitReason: reason,
      },
    });
  },

  // Get journey analytics
  async getJourneyAnalytics(organizationId: string, templateId?: string) {
    const where: any = { organizationId };
    if (templateId) where.templateId = templateId;

    const [byStatus, total, avgCompletion, touchpointStats] = await Promise.all([
      prisma.customerJourney.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      prisma.customerJourney.count({ where }),
      prisma.customerJourney.findMany({
        where: { ...where, status: 'COMPLETED' },
        select: { startedAt: true, completedAt: true },
      }),
      // Group touchpoints by channel (not type/status which don't exist)
      prisma.journeyTouchpoint.groupBy({
        by: ['channel'],
        where: { journey: where },
        _count: true,
      }),
    ]);

    // Calculate average completion time
    let avgCompletionDays = 0;
    if (avgCompletion.length > 0) {
      const totalDays = avgCompletion.reduce((sum, j) => {
        if (j.completedAt && j.startedAt) {
          return sum + (j.completedAt.getTime() - j.startedAt.getTime()) / (1000 * 60 * 60 * 24);
        }
        return sum;
      }, 0);
      avgCompletionDays = totalDays / avgCompletion.length;
    }

    // Calculate completion rate
    const completed = byStatus.find((s) => s.status === 'COMPLETED')?._count || 0;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    return {
      total,
      byStatus,
      completionRate,
      avgCompletionDays,
      touchpointStats,
    };
  },

  // Get pending touchpoints for execution (recent touchpoints from active journeys)
  async getPendingTouchpoints(organizationId: string) {
    // Schema doesn't have status/scheduledAt on touchpoints, so get recent touchpoints from active journeys
    return prisma.journeyTouchpoint.findMany({
      where: {
        journey: { organizationId, status: 'ACTIVE' },
      },
      include: {
        journey: {
          select: {
            id: true,
            currentStage: true,
            status: true,
            leadId: true,
            accountId: true,
            template: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { occurredAt: 'desc' },
      take: 100,
    });
  },

  // Auto-trigger journeys based on events
  async triggerJourneyForEvent(
    organizationId: string,
    eventType: string,
    entityId: string,
    entityType: 'lead' | 'account' | 'contact'
  ) {
    // Find templates with matching entry criteria
    const templates = await prisma.journeyTemplate.findMany({
      where: {
        organizationId,
        isActive: true,
      },
    });

    const matchingTemplates = templates.filter((t) => {
      const criteria = t.entryCriteria as Record<string, any>;
      return criteria?.eventType === eventType;
    });

    // Start journeys for matching templates
    const journeys = [];
    for (const template of matchingTemplates) {
      // Check if entity already has an active journey with this template
      const whereClause: any = {
        templateId: template.id,
        status: 'ACTIVE',
      };
      if (entityType === 'lead') whereClause.leadId = entityId;
      if (entityType === 'account') whereClause.accountId = entityId;

      const existing = await prisma.customerJourney.findFirst({
        where: whereClause,
      });

      if (!existing) {
        const journey = await this.startJourney(organizationId, template.id, {
          ...(entityType === 'lead' && { leadId: entityId }),
          ...(entityType === 'account' && { accountId: entityId }),
        });
        journeys.push(journey);
      }
    }

    return journeys;
  },
};
