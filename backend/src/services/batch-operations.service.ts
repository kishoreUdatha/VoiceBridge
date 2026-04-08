/**
 * Batch Operations Service
 * Handles bulk operations on leads with audit trail and rollback
 */

import { PrismaClient, BatchOperationType, SelectionType, BatchOperationStatus, BatchItemStatus } from '@prisma/client';

const prisma = new PrismaClient();

interface BatchOperationConfig {
  name?: string;
  type: BatchOperationType;
  entityType?: string;
  selectionType: SelectionType;
  selectionFilters?: Record<string, any>;
  selectedIds?: string[];
  operationData: Record<string, any>;
}

export const batchOperationsService = {
  // Get all batch operations
  async getBatchOperations(organizationId: string, limit = 50) {
    return prisma.batchOperation.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },

  // Get single batch operation with items
  async getBatchOperation(id: string) {
    return prisma.batchOperation.findUnique({
      where: { id },
      include: {
        items: {
          take: 100,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  },

  // Create and start batch operation
  async createBatchOperation(
    organizationId: string,
    userId: string,
    config: BatchOperationConfig
  ) {
    // Get total count based on selection
    let totalCount = 0;
    let entityIds: string[] = [];

    if (config.selectionType === 'SELECTED' && config.selectedIds) {
      totalCount = config.selectedIds.length;
      entityIds = config.selectedIds;
    } else if (config.selectionType === 'FILTERED' || config.selectionType === 'ALL') {
      const where: any = { organizationId };
      if (config.selectionFilters) {
        Object.assign(where, this.buildWhereClause(config.selectionFilters));
      }

      const leads = await prisma.lead.findMany({
        where,
        select: { id: true },
        take: 10000, // Safety limit
      });

      totalCount = leads.length;
      entityIds = leads.map(l => l.id);
    }

    if (totalCount === 0) {
      throw new Error('No items match the selection criteria');
    }

    // Create batch operation
    const operation = await prisma.batchOperation.create({
      data: {
        organizationId,
        name: config.name || `Batch ${config.type}`,
        type: config.type,
        entityType: config.entityType || 'lead',
        selectionType: config.selectionType,
        selectionFilters: config.selectionFilters as any,
        selectedIds: config.selectedIds as any,
        totalCount,
        operationData: config.operationData as any,
        status: 'PENDING',
        createdById: userId,
        canRollback: this.canRollback(config.type),
      },
    });

    // Create batch items
    const items = entityIds.map(entityId => ({
      batchOperationId: operation.id,
      entityId,
      status: 'PENDING' as BatchItemStatus,
    }));

    await prisma.batchOperationItem.createMany({ data: items });

    // Start processing in background
    this.processBatchOperation(operation.id).catch(console.error);

    return operation;
  },

  // Process batch operation
  async processBatchOperation(operationId: string) {
    const operation = await prisma.batchOperation.findUnique({
      where: { id: operationId },
      include: {
        items: {
          where: { status: 'PENDING' },
          take: 100, // Process in chunks
        },
      },
    });

    if (!operation) {
      throw new Error('Operation not found');
    }

    // Update status to running
    await prisma.batchOperation.update({
      where: { id: operationId },
      data: { status: 'RUNNING', startedAt: new Date() },
    });

    let successCount = 0;
    let failedCount = 0;
    const rollbackData: any[] = [];

    // Process items in batches
    for (const item of operation.items) {
      try {
        // Get before data for rollback
        const beforeData = await this.getEntityData(operation.entityType, item.entityId);

        // Execute operation
        const afterData = await this.executeOperation(
          operation.type,
          operation.entityType,
          item.entityId,
          operation.operationData as Record<string, any>,
          operation.organizationId
        );

        // Update item
        await prisma.batchOperationItem.update({
          where: { id: item.id },
          data: {
            status: 'SUCCESS',
            processedAt: new Date(),
            beforeData: beforeData as any,
            afterData: afterData as any,
          },
        });

        if (operation.canRollback) {
          rollbackData.push({ entityId: item.entityId, beforeData });
        }

        successCount++;
      } catch (error: any) {
        await prisma.batchOperationItem.update({
          where: { id: item.id },
          data: {
            status: 'FAILED',
            processedAt: new Date(),
            errorMessage: error.message,
          },
        });
        failedCount++;
      }
    }

    // Update operation progress
    await prisma.batchOperation.update({
      where: { id: operationId },
      data: {
        processedCount: { increment: successCount + failedCount },
        successCount: { increment: successCount },
        failedCount: { increment: failedCount },
        rollbackData: rollbackData as any,
      },
    });

    // Check if more items to process
    const remainingItems = await prisma.batchOperationItem.count({
      where: { batchOperationId: operationId, status: 'PENDING' },
    });

    if (remainingItems > 0) {
      // Continue processing
      await this.processBatchOperation(operationId);
    } else {
      // Complete operation
      await prisma.batchOperation.update({
        where: { id: operationId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });
    }
  },

  // Execute single operation
  async executeOperation(
    type: BatchOperationType,
    entityType: string,
    entityId: string,
    data: Record<string, any>,
    organizationId: string
  ) {
    switch (type) {
      case 'UPDATE_FIELD':
        return prisma.lead.update({
          where: { id: entityId },
          data: { [data.field]: data.value },
        });

      case 'UPDATE_STAGE':
        const stage = await prisma.leadStage.findFirst({
          where: { organizationId, id: data.stageId },
        });
        if (stage) {
          return prisma.lead.update({
            where: { id: entityId },
            data: { stageId: data.stageId },
          });
        }
        throw new Error('Stage not found');

      case 'ASSIGN_USER':
        await prisma.leadAssignment.create({
          data: {
            leadId: entityId,
            userId: data.userId,
            type: data.assignmentType || 'PRIMARY',
          },
        });
        return { assigned: true };

      case 'ASSIGN_TEAM':
        // Assign to all team members
        const teamMembers = await prisma.user.findMany({
          where: { managerId: data.teamLeadId, isActive: true },
          select: { id: true },
        });
        await prisma.leadAssignment.createMany({
          data: teamMembers.map(m => ({
            leadId: entityId,
            userId: m.id,
            type: 'SECONDARY',
          })),
        });
        return { assigned: teamMembers.length };

      case 'ADD_TAGS':
        await prisma.leadTagAssignment.createMany({
          data: data.tagIds.map((tagId: string) => ({
            leadId: entityId,
            tagId,
          })),
          skipDuplicates: true,
        });
        return { tagsAdded: data.tagIds.length };

      case 'REMOVE_TAGS':
        await prisma.leadTagAssignment.deleteMany({
          where: {
            leadId: entityId,
            tagId: { in: data.tagIds },
          },
        });
        return { tagsRemoved: data.tagIds.length };

      case 'DELETE':
        return prisma.lead.delete({ where: { id: entityId } });

      case 'ADD_TO_CAMPAIGN':
        // In production, integrate with campaign service
        return { addedToCampaign: data.campaignId };

      case 'REMOVE_FROM_CAMPAIGN':
        // In production, integrate with campaign service
        return { removedFromCampaign: data.campaignId };

      default:
        throw new Error(`Unknown operation type: ${type}`);
    }
  },

  // Get entity data before operation
  async getEntityData(entityType: string, entityId: string) {
    switch (entityType) {
      case 'lead':
        return prisma.lead.findUnique({ where: { id: entityId } });
      default:
        return null;
    }
  },

  // Rollback batch operation
  async rollbackBatchOperation(operationId: string, userId: string) {
    const operation = await prisma.batchOperation.findUnique({
      where: { id: operationId },
    });

    if (!operation) {
      throw new Error('Operation not found');
    }

    if (!operation.canRollback) {
      throw new Error('This operation cannot be rolled back');
    }

    if (operation.rolledBackAt) {
      throw new Error('Operation has already been rolled back');
    }

    const rollbackData = operation.rollbackData as any[];
    if (!rollbackData || rollbackData.length === 0) {
      throw new Error('No rollback data available');
    }

    // Process rollback
    for (const item of rollbackData) {
      try {
        if (item.beforeData && operation.entityType === 'lead') {
          await prisma.lead.update({
            where: { id: item.entityId },
            data: item.beforeData,
          });
        }
      } catch (error) {
        console.error(`Failed to rollback item ${item.entityId}:`, error);
      }
    }

    // Mark as rolled back
    await prisma.batchOperation.update({
      where: { id: operationId },
      data: {
        status: 'ROLLED_BACK',
        rolledBackAt: new Date(),
        rolledBackById: userId,
      },
    });

    return { rolledBack: rollbackData.length };
  },

  // Pause batch operation
  async pauseBatchOperation(operationId: string) {
    return prisma.batchOperation.update({
      where: { id: operationId },
      data: { status: 'PAUSED' },
    });
  },

  // Resume batch operation
  async resumeBatchOperation(operationId: string) {
    const operation = await prisma.batchOperation.findUnique({
      where: { id: operationId },
    });

    if (operation?.status !== 'PAUSED') {
      throw new Error('Operation is not paused');
    }

    this.processBatchOperation(operationId).catch(console.error);

    return { resumed: true };
  },

  // Cancel batch operation
  async cancelBatchOperation(operationId: string) {
    // Mark remaining items as skipped
    await prisma.batchOperationItem.updateMany({
      where: {
        batchOperationId: operationId,
        status: 'PENDING',
      },
      data: { status: 'SKIPPED' },
    });

    return prisma.batchOperation.update({
      where: { id: operationId },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
      },
    });
  },

  // Build where clause from filters
  buildWhereClause(filters: Record<string, any>): Record<string, any> {
    const where: any = {};

    for (const [key, value] of Object.entries(filters)) {
      if (value === null || value === undefined) continue;

      if (typeof value === 'object' && value.operator) {
        switch (value.operator) {
          case 'contains':
            where[key] = { contains: value.value, mode: 'insensitive' };
            break;
          case 'equals':
            where[key] = value.value;
            break;
          case 'in':
            where[key] = { in: value.value };
            break;
          case 'gt':
            where[key] = { gt: value.value };
            break;
          case 'gte':
            where[key] = { gte: value.value };
            break;
          case 'lt':
            where[key] = { lt: value.value };
            break;
          case 'lte':
            where[key] = { lte: value.value };
            break;
        }
      } else {
        where[key] = value;
      }
    }

    return where;
  },

  // Check if operation type can be rolled back
  canRollback(type: BatchOperationType): boolean {
    const rollbackable = [
      'UPDATE_FIELD',
      'UPDATE_STAGE',
      'ASSIGN_USER',
      'ADD_TAGS',
      'REMOVE_TAGS',
    ];
    return rollbackable.includes(type);
  },

  // Get operation type options
  getOperationTypes() {
    return [
      { type: 'UPDATE_FIELD', name: 'Update Field', description: 'Update a specific field on all selected items', canRollback: true },
      { type: 'UPDATE_STAGE', name: 'Update Stage', description: 'Move all selected leads to a specific stage', canRollback: true },
      { type: 'ASSIGN_USER', name: 'Assign User', description: 'Assign a user to all selected leads', canRollback: true },
      { type: 'ASSIGN_TEAM', name: 'Assign Team', description: 'Assign an entire team to selected leads', canRollback: false },
      { type: 'ADD_TAGS', name: 'Add Tags', description: 'Add tags to all selected leads', canRollback: true },
      { type: 'REMOVE_TAGS', name: 'Remove Tags', description: 'Remove tags from all selected leads', canRollback: true },
      { type: 'DELETE', name: 'Delete', description: 'Permanently delete all selected leads', canRollback: false },
      { type: 'SEND_EMAIL', name: 'Send Email', description: 'Send an email to all selected leads', canRollback: false },
      { type: 'SEND_SMS', name: 'Send SMS', description: 'Send SMS to all selected leads', canRollback: false },
      { type: 'SEND_WHATSAPP', name: 'Send WhatsApp', description: 'Send WhatsApp message to all selected leads', canRollback: false },
      { type: 'ADD_TO_CAMPAIGN', name: 'Add to Campaign', description: 'Add leads to a campaign', canRollback: false },
      { type: 'REMOVE_FROM_CAMPAIGN', name: 'Remove from Campaign', description: 'Remove leads from a campaign', canRollback: false },
    ];
  },
};
