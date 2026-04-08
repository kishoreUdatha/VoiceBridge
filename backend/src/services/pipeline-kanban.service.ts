/**
 * Pipeline Kanban Service
 * Handles visual pipeline management with drag-drop functionality
 */

import { PrismaClient, PipelineViewType } from '@prisma/client';

const prisma = new PrismaClient();

interface CardFieldConfig {
  field: string;
  label: string;
  type: 'text' | 'badge' | 'currency' | 'date' | 'avatar';
}

interface PipelineViewConfig {
  name: string;
  description?: string;
  type?: PipelineViewType;
  entityType?: string;
  stageField?: string;
  cardFields: CardFieldConfig[];
  cardColorField?: string;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

interface ColumnConfig {
  name: string;
  stageValue: string;
  position: number;
  color?: string;
  icon?: string;
  autoActions?: Record<string, any>;
  wipLimit?: number;
}

export const pipelineKanbanService = {
  // Get all pipeline views
  async getPipelineViews(organizationId: string) {
    return prisma.pipelineView.findMany({
      where: { organizationId },
      include: {
        columns: {
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  // Get single pipeline view with data
  async getPipelineView(id: string, organizationId: string) {
    const view = await prisma.pipelineView.findUnique({
      where: { id },
      include: {
        columns: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!view) return null;

    // Get leads for each column
    const columns = await Promise.all(
      view.columns.map(async (column) => {
        const leads = await this.getColumnLeads(organizationId, view, column.stageValue);
        return {
          ...column,
          leads,
          count: leads.length,
        };
      })
    );

    return { ...view, columns };
  },

  // Get leads for a column
  async getColumnLeads(organizationId: string, view: any, stageValue: string) {
    const where: any = { organizationId };

    // Apply stage filter
    if (view.stageField === 'stage') {
      const stage = await prisma.leadStage.findFirst({
        where: { organizationId, name: stageValue },
      });
      if (stage) {
        where.stageId = stage.id;
      }
    } else {
      where[view.stageField] = stageValue;
    }

    // Apply view filters
    if (view.filters) {
      Object.assign(where, view.filters);
    }

    // Build orderBy
    const orderBy: any = {};
    if (view.sortField) {
      orderBy[view.sortField] = view.sortDirection || 'desc';
    } else {
      orderBy.updatedAt = 'desc';
    }

    const leads = await prisma.lead.findMany({
      where,
      orderBy,
      take: 100,
      include: {
        assignments: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, avatar: true },
            },
          },
          where: { isActive: true },
          take: 1,
        },
        stage: true,
        dealVelocity: true,
      },
    });

    // Map to card format based on cardFields config
    return leads.map(lead => this.mapLeadToCard(lead, view.cardFields as CardFieldConfig[]));
  },

  // Map lead to card format
  mapLeadToCard(lead: any, cardFields: CardFieldConfig[]) {
    const card: any = {
      id: lead.id,
      title: `${lead.firstName} ${lead.lastName || ''}`.trim(),
      subtitle: lead.companyName || lead.email || lead.phone,
    };

    // Map configured fields
    for (const config of cardFields) {
      const value = this.getNestedValue(lead, config.field);
      card[config.field] = {
        value,
        type: config.type,
        label: config.label,
      };
    }

    // Add assignment info
    if (lead.assignments && lead.assignments.length > 0) {
      card.assignee = lead.assignments[0].user;
    }

    // Add velocity info
    if (lead.dealVelocity) {
      card.velocity = {
        daysInStage: lead.dealVelocity.stalledDays || 0,
        isStalled: lead.dealVelocity.isStalled,
        velocityScore: lead.dealVelocity.velocityScore,
      };
    }

    return card;
  },

  getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((acc, part) => acc?.[part], obj);
  },

  // Create pipeline view
  async createPipelineView(organizationId: string, userId: string, config: PipelineViewConfig) {
    return prisma.pipelineView.create({
      data: {
        organizationId,
        name: config.name,
        description: config.description,
        type: config.type || 'KANBAN',
        entityType: config.entityType || 'lead',
        stageField: config.stageField || 'stage',
        cardFields: config.cardFields as any,
        cardColorField: config.cardColorField,
        sortField: config.sortField,
        sortDirection: config.sortDirection,
        filters: config.filters as any,
        createdById: userId,
      },
    });
  },

  // Update pipeline view
  async updatePipelineView(id: string, config: Partial<PipelineViewConfig>) {
    return prisma.pipelineView.update({
      where: { id },
      data: {
        name: config.name,
        description: config.description,
        type: config.type,
        cardFields: config.cardFields as any,
        cardColorField: config.cardColorField,
        sortField: config.sortField,
        sortDirection: config.sortDirection,
        filters: config.filters as any,
      },
    });
  },

  // Delete pipeline view
  async deletePipelineView(id: string) {
    return prisma.pipelineView.delete({ where: { id } });
  },

  // Create column
  async createColumn(pipelineViewId: string, config: ColumnConfig) {
    return prisma.pipelineColumn.create({
      data: {
        pipelineViewId,
        name: config.name,
        stageValue: config.stageValue,
        position: config.position,
        color: config.color,
        icon: config.icon,
        autoActions: config.autoActions as any,
        wipLimit: config.wipLimit,
      },
    });
  },

  // Update column
  async updateColumn(id: string, config: Partial<ColumnConfig>) {
    return prisma.pipelineColumn.update({
      where: { id },
      data: {
        name: config.name,
        stageValue: config.stageValue,
        position: config.position,
        color: config.color,
        icon: config.icon,
        autoActions: config.autoActions as any,
        wipLimit: config.wipLimit,
      },
    });
  },

  // Reorder columns
  async reorderColumns(pipelineViewId: string, columnIds: string[]) {
    const updates = columnIds.map((id, index) =>
      prisma.pipelineColumn.update({
        where: { id },
        data: { position: index },
      })
    );
    await prisma.$transaction(updates);
  },

  // Delete column
  async deleteColumn(id: string) {
    return prisma.pipelineColumn.delete({ where: { id } });
  },

  // Move card (lead) to different column
  async moveCard(
    leadId: string,
    organizationId: string,
    sourceColumn: string,
    targetColumn: string,
    pipelineViewId: string
  ) {
    // Get the pipeline view to determine what field to update
    const view = await prisma.pipelineView.findUnique({
      where: { id: pipelineViewId },
    });

    if (!view) {
      throw new Error('Pipeline view not found');
    }

    // Get the target column config
    const column = await prisma.pipelineColumn.findFirst({
      where: {
        pipelineViewId,
        stageValue: targetColumn,
      },
    });

    let updatedLead;

    if (view.stageField === 'stage') {
      // Update using stage relation
      const stage = await prisma.leadStage.findFirst({
        where: { organizationId, name: targetColumn },
      });

      if (stage) {
        updatedLead = await prisma.lead.update({
          where: { id: leadId },
          data: { stageId: stage.id },
        });
      }
    } else {
      // Update using direct field
      updatedLead = await prisma.lead.update({
        where: { id: leadId },
        data: { [view.stageField]: targetColumn },
      });
    }

    // Track velocity
    await this.updateDealVelocity(leadId, organizationId, sourceColumn, targetColumn);

    // Execute auto actions if configured
    if (column?.autoActions) {
      await this.executeAutoActions(leadId, column.autoActions as Record<string, any>);
    }

    return updatedLead;
  },

  // Update deal velocity tracking
  async updateDealVelocity(
    leadId: string,
    organizationId: string,
    fromStage: string,
    toStage: string
  ) {
    const now = new Date();

    // Get existing velocity record
    const existing = await prisma.dealVelocity.findUnique({
      where: { leadId },
    });

    if (existing) {
      // Update stage history
      const stageHistory = (existing.stageHistory as any[]) || [];
      const lastEntry = stageHistory[stageHistory.length - 1];

      if (lastEntry) {
        lastEntry.exitedAt = now;
        lastEntry.duration = Math.floor((now.getTime() - new Date(lastEntry.enteredAt).getTime()) / (1000 * 60 * 60 * 24));
      }

      stageHistory.push({
        stage: toStage,
        enteredAt: now,
        exitedAt: null,
        duration: null,
      });

      // Calculate average days per stage
      const completedStages = stageHistory.filter(s => s.duration !== null);
      const avgDaysPerStage = completedStages.length > 0
        ? completedStages.reduce((sum, s) => sum + s.duration, 0) / completedStages.length
        : null;

      await prisma.dealVelocity.update({
        where: { leadId },
        data: {
          stageHistory: stageHistory as any,
          currentStage: toStage,
          stageEnteredAt: now,
          avgDaysPerStage,
          isStalled: false,
          stalledAt: null,
          stalledDays: null,
        },
      });
    } else {
      // Create new velocity record
      await prisma.dealVelocity.create({
        data: {
          organizationId,
          leadId,
          stageHistory: [{
            stage: toStage,
            enteredAt: now,
            exitedAt: null,
            duration: null,
          }] as any,
          currentStage: toStage,
          stageEnteredAt: now,
        },
      });
    }
  },

  // Execute auto actions when card enters column
  async executeAutoActions(leadId: string, actions: Record<string, any>) {
    // In production, integrate with workflow service
    console.log('Executing auto actions for lead:', leadId, actions);
  },

  // Get pipeline statistics
  async getPipelineStats(organizationId: string, pipelineViewId: string) {
    const view = await prisma.pipelineView.findUnique({
      where: { id: pipelineViewId },
      include: {
        columns: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!view) return null;

    // Get counts per column
    const stats = await Promise.all(
      view.columns.map(async (column) => {
        let where: any = { organizationId };

        if (view.stageField === 'stage') {
          const stage = await prisma.leadStage.findFirst({
            where: { organizationId, name: column.stageValue },
          });
          if (stage) where.stageId = stage.id;
        } else {
          where[view.stageField] = column.stageValue;
        }

        const count = await prisma.lead.count({ where });

        // Get total value if applicable
        const aggregate = await prisma.lead.aggregate({
          where,
          _sum: { totalFees: true },
        });

        return {
          columnId: column.id,
          columnName: column.name,
          stageValue: column.stageValue,
          count,
          totalValue: aggregate._sum.totalFees || 0,
          wipLimit: column.wipLimit,
          overLimit: column.wipLimit ? count > column.wipLimit : false,
        };
      })
    );

    // Get velocity metrics
    const velocityStats = await prisma.dealVelocity.aggregate({
      where: { organizationId },
      _avg: { avgDaysPerStage: true, velocityScore: true },
      _count: { isStalled: true },
    });

    const stalledCount = await prisma.dealVelocity.count({
      where: { organizationId, isStalled: true },
    });

    return {
      columns: stats,
      totalLeads: stats.reduce((sum, s) => sum + s.count, 0),
      totalValue: stats.reduce((sum, s) => sum + Number(s.totalValue), 0),
      avgDaysPerStage: velocityStats._avg.avgDaysPerStage,
      avgVelocityScore: velocityStats._avg.velocityScore,
      stalledDeals: stalledCount,
    };
  },

  // Detect stalled deals
  async detectStalledDeals(organizationId: string, stalledDaysThreshold = 7) {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - stalledDaysThreshold);

    // Find deals that have been in the same stage too long
    const stalledDeals = await prisma.dealVelocity.findMany({
      where: {
        organizationId,
        isStalled: false,
        stageEnteredAt: { lt: thresholdDate },
      },
      include: {
        lead: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Update stalled status
    const updates = stalledDeals.map(deal =>
      prisma.dealVelocity.update({
        where: { id: deal.id },
        data: {
          isStalled: true,
          stalledAt: new Date(),
          stalledDays: Math.floor((Date.now() - deal.stageEnteredAt.getTime()) / (1000 * 60 * 60 * 24)),
        },
      })
    );

    await prisma.$transaction(updates);

    return stalledDeals;
  },

  // Get default card fields
  getDefaultCardFields(): CardFieldConfig[] {
    return [
      { field: 'phone', label: 'Phone', type: 'text' },
      { field: 'email', label: 'Email', type: 'text' },
      { field: 'totalFees', label: 'Value', type: 'currency' },
      { field: 'source', label: 'Source', type: 'badge' },
      { field: 'priority', label: 'Priority', type: 'badge' },
      { field: 'createdAt', label: 'Created', type: 'date' },
    ];
  },
};
