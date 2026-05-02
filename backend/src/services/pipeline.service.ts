import { prisma } from '../config/database';
import { userService } from './user.service';

/**
 * Get all pipelines for an organization
 */
export const getPipelines = async (organizationId: string, entityType?: string) => {
  return prisma.pipeline.findMany({
    where: {
      organizationId,
      ...(entityType && { entityType: entityType as any }),
      isActive: true,
    },
    include: {
      stages: {
        where: { isActive: true },
        orderBy: { order: 'asc' },
      },
      _count: {
        select: { records: true },
      },
    },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  });
};

/**
 * Get a single pipeline with full details
 */
export const getPipelineById = async (pipelineId: string) => {
  return prisma.pipeline.findUnique({
    where: { id: pipelineId },
    include: {
      stages: {
        where: { isActive: true },
        orderBy: { order: 'asc' },
        include: {
          transitionsFrom: {
            include: { toStage: true },
          },
        },
      },
    },
  });
};

/**
 * Generate a unique slug for a pipeline
 */
const generateUniqueSlug = async (organizationId: string, baseName: string): Promise<string> => {
  const baseSlug = baseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  // Check if base slug exists
  const existing = await prisma.pipeline.findFirst({
    where: { organizationId, slug: baseSlug },
  });

  if (!existing) {
    return baseSlug;
  }

  // Find a unique slug by appending a number
  let counter = 1;
  let uniqueSlug = `${baseSlug}-${counter}`;

  while (true) {
    const exists = await prisma.pipeline.findFirst({
      where: { organizationId, slug: uniqueSlug },
    });

    if (!exists) {
      return uniqueSlug;
    }

    counter++;
    uniqueSlug = `${baseSlug}-${counter}`;

    // Safety limit
    if (counter > 100) {
      uniqueSlug = `${baseSlug}-${Date.now()}`;
      break;
    }
  }

  return uniqueSlug;
};

/**
 * Create a new pipeline
 */
export const createPipeline = async (
  organizationId: string,
  data: {
    name: string;
    slug?: string;
    description?: string;
    entityType?: string;
    icon?: string;
    color?: string;
    isDefault?: boolean;
  }
) => {
  // Check if pipeline with same name already exists for this organization and entity type
  const existingPipeline = await prisma.pipeline.findFirst({
    where: {
      organizationId,
      name: data.name,
      entityType: (data.entityType || 'LEAD') as any,
    },
  });

  if (existingPipeline) {
    throw new Error(`Pipeline "${data.name}" already exists for this organization. Please use a different name or edit the existing pipeline.`);
  }

  // Generate unique slug
  const slug = data.slug
    ? await generateUniqueSlug(organizationId, data.slug)
    : await generateUniqueSlug(organizationId, data.name);

  // If this is set as default, unset other defaults for same entity type
  if (data.isDefault) {
    await prisma.pipeline.updateMany({
      where: {
        organizationId,
        entityType: (data.entityType || 'LEAD') as any,
        isDefault: true,
      },
      data: { isDefault: false },
    });
  }

  return prisma.pipeline.create({
    data: {
      organizationId,
      name: data.name,
      slug,
      description: data.description,
      entityType: (data.entityType || 'LEAD') as any,
      icon: data.icon,
      color: data.color,
      isDefault: data.isDefault ?? false,
    },
    include: {
      stages: true,
    },
  });
};

/**
 * Update a pipeline
 */
export const updatePipeline = async (
  pipelineId: string,
  data: {
    name?: string;
    description?: string;
    icon?: string;
    color?: string;
    isDefault?: boolean;
    isActive?: boolean;
    autoMoveOnStale?: number;
    staleAlertDays?: number;
  }
) => {
  // If setting as default, unset other defaults
  if (data.isDefault) {
    const pipeline = await prisma.pipeline.findUnique({ where: { id: pipelineId } });
    if (pipeline) {
      await prisma.pipeline.updateMany({
        where: {
          organizationId: pipeline.organizationId,
          entityType: pipeline.entityType,
          isDefault: true,
          id: { not: pipelineId },
        },
        data: { isDefault: false },
      });
    }
  }

  return prisma.pipeline.update({
    where: { id: pipelineId },
    data,
    include: {
      stages: {
        orderBy: { order: 'asc' },
      },
    },
  });
};

/**
 * Delete a pipeline (soft delete by setting isActive = false)
 */
export const deletePipeline = async (pipelineId: string) => {
  return prisma.pipeline.update({
    where: { id: pipelineId },
    data: { isActive: false },
  });
};

/**
 * Create a pipeline stage
 */
export const createPipelineStage = async (
  pipelineId: string,
  data: {
    name: string;
    slug?: string;
    description?: string;
    color?: string;
    icon?: string;
    order?: number;
    stageType?: string;
    probability?: number;
    expectedDays?: number;
    slaHours?: number;
    requiredFields?: any;
    autoActions?: any;
  }
) => {
  const slug = data.slug || data.name.toLowerCase().replace(/\s+/g, '-');

  // Get max order if not provided
  let order = data.order;
  if (order === undefined) {
    const maxOrder = await prisma.pipelineStage.aggregate({
      where: { pipelineId },
      _max: { order: true },
    });
    order = (maxOrder._max.order || 0) + 1;
  }

  return prisma.pipelineStage.create({
    data: {
      pipelineId,
      name: data.name,
      slug,
      description: data.description,
      color: data.color || '#3B82F6',
      icon: data.icon,
      order,
      stageType: data.stageType || 'active',
      probability: data.probability,
      expectedDays: data.expectedDays,
      slaHours: data.slaHours,
      requiredFields: data.requiredFields,
      autoActions: data.autoActions,
    },
  });
};

/**
 * Update a pipeline stage
 */
export const updatePipelineStage = async (
  stageId: string,
  data: {
    name?: string;
    description?: string;
    color?: string;
    icon?: string;
    order?: number;
    stageType?: string;
    probability?: number;
    expectedDays?: number;
    slaHours?: number;
    slaEscalateTo?: string;
    requiredFields?: any;
    autoActions?: any;
    exitActions?: any;
    isActive?: boolean;
  }
) => {
  return prisma.pipelineStage.update({
    where: { id: stageId },
    data,
  });
};

/**
 * Delete a pipeline stage
 */
export const deletePipelineStage = async (stageId: string) => {
  return prisma.pipelineStage.update({
    where: { id: stageId },
    data: { isActive: false },
  });
};

/**
 * Reorder pipeline stages
 */
export const reorderPipelineStages = async (
  pipelineId: string,
  stageOrders: Array<{ stageId: string; order: number }>
) => {
  const updates = stageOrders.map(({ stageId, order }) =>
    prisma.pipelineStage.update({
      where: { id: stageId },
      data: { order },
    })
  );

  return prisma.$transaction(updates);
};

/**
 * Create a stage transition rule
 */
export const createStageTransition = async (data: {
  fromStageId: string;
  toStageId: string;
  isAllowed?: boolean;
  requiresApproval?: boolean;
  approverRoleId?: string;
  approverUserId?: string;
  conditions?: any;
  autoTrigger?: boolean;
  triggerActions?: any;
  notifyOnTransition?: any;
}) => {
  return prisma.pipelineStageTransition.create({
    data: {
      fromStageId: data.fromStageId,
      toStageId: data.toStageId,
      isAllowed: data.isAllowed ?? true,
      requiresApproval: data.requiresApproval ?? false,
      approverRoleId: data.approverRoleId,
      approverUserId: data.approverUserId,
      conditions: data.conditions,
      autoTrigger: data.autoTrigger ?? false,
      triggerActions: data.triggerActions,
      notifyOnTransition: data.notifyOnTransition,
    },
    include: {
      fromStage: true,
      toStage: true,
    },
  });
};

/**
 * Update a stage transition rule
 */
export const updateStageTransition = async (
  transitionId: string,
  data: {
    isAllowed?: boolean;
    requiresApproval?: boolean;
    approverRoleId?: string;
    approverUserId?: string;
    conditions?: any;
    autoTrigger?: boolean;
    triggerActions?: any;
    notifyOnTransition?: any;
  }
) => {
  return prisma.pipelineStageTransition.update({
    where: { id: transitionId },
    data,
    include: {
      fromStage: true,
      toStage: true,
    },
  });
};

/**
 * Delete a stage transition rule
 */
export const deleteStageTransition = async (transitionId: string) => {
  return prisma.pipelineStageTransition.delete({
    where: { id: transitionId },
  });
};

/**
 * Get allowed transitions from a stage
 */
export const getAllowedTransitions = async (stageId: string) => {
  return prisma.pipelineStageTransition.findMany({
    where: {
      fromStageId: stageId,
      isAllowed: true,
    },
    include: {
      toStage: true,
    },
  });
};

/**
 * Add a record to a pipeline
 */
export const addRecordToPipeline = async (
  pipelineId: string,
  entityType: string,
  entityId: string,
  stageId?: string
) => {
  // Get default stage if not provided
  let targetStageId = stageId;
  if (!targetStageId) {
    const pipeline = await prisma.pipeline.findUnique({
      where: { id: pipelineId },
      include: {
        stages: {
          where: { stageType: 'entry', isActive: true },
          take: 1,
        },
      },
    });

    if (pipeline?.stages[0]) {
      targetStageId = pipeline.stages[0].id;
    } else {
      // Get first stage by order
      const firstStage = await prisma.pipelineStage.findFirst({
        where: { pipelineId, isActive: true },
        orderBy: { order: 'asc' },
      });
      targetStageId = firstStage?.id;
    }
  }

  if (!targetStageId) {
    throw new Error('No stages found in pipeline');
  }

  const pipelineRecord = await prisma.pipelineRecord.create({
    data: {
      pipelineId,
      stageId: targetStageId,
      entityType: entityType as any,
      entityId,
    },
  });

  // Create initial history entry
  await prisma.pipelineStageHistory.create({
    data: {
      pipelineRecordId: pipelineRecord.id,
      stageId: targetStageId,
      action: 'entered',
    },
  });

  return pipelineRecord;
};

/**
 * Move a record to a different stage
 */
export const moveRecordToStage = async (
  pipelineRecordId: string,
  toStageId: string,
  userId?: string,
  reason?: string
) => {
  const record = await prisma.pipelineRecord.findUnique({
    where: { id: pipelineRecordId },
    include: { stage: true },
  });

  if (!record) {
    throw new Error('Pipeline record not found');
  }

  // Check if transition is allowed
  const transition = await prisma.pipelineStageTransition.findUnique({
    where: {
      fromStageId_toStageId: {
        fromStageId: record.stageId,
        toStageId,
      },
    },
  });

  if (transition && !transition.isAllowed) {
    throw new Error('This stage transition is not allowed');
  }

  if (transition?.requiresApproval) {
    // TODO: Create approval request instead of direct move
    throw new Error('This transition requires approval');
  }

  // Calculate time spent in previous stage
  const now = new Date();
  const enteredAt = record.enteredStageAt;
  const durationMinutes = Math.floor((now.getTime() - enteredAt.getTime()) / 60000);

  // Update the previous history entry with exit info
  await prisma.pipelineStageHistory.updateMany({
    where: {
      pipelineRecordId,
      stageId: record.stageId,
      exitedAt: null,
    },
    data: {
      exitedAt: now,
      durationMinutes,
    },
  });

  // Create new history entry
  await prisma.pipelineStageHistory.create({
    data: {
      pipelineRecordId,
      stageId: toStageId,
      action: 'entered',
      previousStageId: record.stageId,
      changedByUserId: userId,
      changeReason: reason,
    },
  });

  // Update the record
  return prisma.pipelineRecord.update({
    where: { id: pipelineRecordId },
    data: {
      stageId: toStageId,
      enteredStageAt: now,
      daysInStage: 0,
      totalDaysInPipeline: record.totalDaysInPipeline + record.daysInStage,
    },
    include: {
      stage: true,
      pipeline: true,
    },
  });
};

/**
 * Get pipeline record history
 */
export const getPipelineRecordHistory = async (pipelineRecordId: string) => {
  return prisma.pipelineStageHistory.findMany({
    where: { pipelineRecordId },
    include: { stage: true },
    orderBy: { enteredAt: 'asc' },
  });
};

/**
 * Get pipeline analytics with role-based filtering
 */
export const getPipelineAnalytics = async (
  pipelineId: string,
  filters?: {
    organizationId?: string;
    userRole?: string;
    userId?: string;
  }
) => {
  const pipeline = await prisma.pipeline.findUnique({
    where: { id: pipelineId },
    include: {
      stages: {
        where: { isActive: true },
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!pipeline) {
    throw new Error('Pipeline not found');
  }

  // Get stage IDs for this pipeline
  const stageIds = pipeline.stages.map(s => s.id);

  // Build base lead filter
  const baseLeadFilter: any = {
    pipelineStageId: { in: stageIds },
  };

  // Apply role-based filtering
  if (filters?.organizationId && filters?.userRole && filters?.userId) {
    const viewableUserIds = await userService.getViewableTeamMemberIds(
      filters.organizationId,
      filters.userRole,
      filters.userId
    );

    console.log(`[Pipeline Analytics] Role: ${filters.userRole}, UserId: ${filters.userId}`);
    console.log(`[Pipeline Analytics] Viewable User IDs: ${viewableUserIds ? viewableUserIds.length + ' users' : 'ALL (null)'}`);

    // If viewableUserIds is not null, filter leads by their active assignments
    if (viewableUserIds !== null) {
      // Filter leads that have an active assignment to one of the viewable users
      baseLeadFilter.assignments = {
        some: {
          assignedToId: { in: viewableUserIds },
          isActive: true,
        },
      };
      console.log(`[Pipeline Analytics] Filtering leads by assignment to ${viewableUserIds.length} users`);
    }
  }

  // Count leads directly by pipelineStageId with role-based filtering
  const leadCountsByStage = await prisma.lead.groupBy({
    by: ['pipelineStageId'],
    where: baseLeadFilter,
    _count: { id: true },
  });

  // Get average time per stage from history
  const stageTimeAvg = await prisma.pipelineStageHistory.groupBy({
    by: ['stageId'],
    where: {
      pipelineRecord: { pipelineId },
      durationMinutes: { not: null },
    },
    _avg: { durationMinutes: true },
  });

  // Count total leads in this pipeline's stages (with role filter)
  const totalLeads = await prisma.lead.count({
    where: baseLeadFilter,
  });

  // Count won/lost based on stage type (with role filter)
  const wonStageIds = pipeline.stages.filter(s => s.stageType === 'won').map(s => s.id);
  const lostStageIds = pipeline.stages.filter(s => s.stageType === 'lost').map(s => s.id);

  const wonLeads = wonStageIds.length > 0 ? await prisma.lead.count({
    where: { ...baseLeadFilter, pipelineStageId: { in: wonStageIds } },
  }) : 0;

  const lostLeads = lostStageIds.length > 0 ? await prisma.lead.count({
    where: { ...baseLeadFilter, pipelineStageId: { in: lostStageIds } },
  }) : 0;

  // Build stage data with counts
  const stages = pipeline.stages.map(stage => {
    // Use filtered lead counts (role-based filtering applied)
    const leadCount = leadCountsByStage.find(s => s.pipelineStageId === stage.id)?._count.id || 0;

    return {
      ...stage,
      recordCount: leadCount,
      avgTimeMinutes: stageTimeAvg.find(s => s.stageId === stage.id)?._avg.durationMinutes || 0,
    };
  });

  // Build stageStats array for frontend compatibility
  const stageStats = stages.map(stage => ({
    stageId: stage.id,
    stageName: stage.name,
    count: stage.recordCount,
    avgTimeMinutes: stage.avgTimeMinutes || 0,
  }));

  return {
    pipeline,
    totalRecords: totalLeads,
    activeRecords: totalLeads - wonLeads - lostLeads,
    wonRecords: wonLeads,
    lostRecords: lostLeads,
    conversionRate: totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0,
    stages,
    stageStats,
  };
};

/**
 * Create default pipeline from template
 */
export const createPipelineFromTemplate = async (
  organizationId: string,
  templateStages: Array<{
    name: string;
    color: string;
    probability?: number;
    stageType?: string;
  }>,
  pipelineName: string = 'Sales Pipeline',
  entityType: string = 'LEAD'
) => {
  // Create the pipeline
  const pipeline = await createPipeline(organizationId, {
    name: pipelineName,
    entityType,
    isDefault: true,
  });

  // Create stages
  for (let i = 0; i < templateStages.length; i++) {
    const stage = templateStages[i];
    await createPipelineStage(pipeline.id, {
      name: stage.name,
      color: stage.color,
      order: i,
      probability: stage.probability,
      stageType: stage.stageType || (i === 0 ? 'entry' : i === templateStages.length - 1 ? 'won' : 'active'),
    });
  }

  // Create default transitions (allow all sequential transitions)
  const stages = await prisma.pipelineStage.findMany({
    where: { pipelineId: pipeline.id },
    orderBy: { order: 'asc' },
  });

  for (let i = 0; i < stages.length - 1; i++) {
    await createStageTransition({
      fromStageId: stages[i].id,
      toStageId: stages[i + 1].id,
      isAllowed: true,
    });
  }

  return getPipelineById(pipeline.id);
};

export default {
  getPipelines,
  getPipelineById,
  createPipeline,
  updatePipeline,
  deletePipeline,
  createPipelineStage,
  updatePipelineStage,
  deletePipelineStage,
  reorderPipelineStages,
  createStageTransition,
  updateStageTransition,
  deleteStageTransition,
  getAllowedTransitions,
  addRecordToPipeline,
  moveRecordToStage,
  getPipelineRecordHistory,
  getPipelineAnalytics,
  createPipelineFromTemplate,
};
