import { prisma } from '../config/database';
import { RawImportRecordStatus, BulkImportStatus, LeadSource, LeadPriority, Prisma } from '@prisma/client';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';

interface RawImportFilter {
  organizationId: string;
  bulkImportId?: string;
  status?: RawImportRecordStatus;
  assignedToId?: string;
  assignedAgentId?: string;
  search?: string;
  // Role-based filtering
  userRole?: string;
  userId?: string;
  // Date filtering
  assignedDateFrom?: string;
  assignedDateTo?: string;
}

interface BulkImportStats {
  totalImports: number;
  totalRecords: number;
  pendingRecords: number;
  assignedRecords: number;
  interestedRecords: number;
  convertedRecords: number;
  notInterestedRecords: number;
  byStatus?: Record<string, number>;
  todayAssigned?: number;
}

export class RawImportService {
  // ==================== BULK IMPORT MANAGEMENT ====================

  async createBulkImport(data: {
    organizationId: string;
    uploadedById: string;
    fileName: string;
    fileSize: number;
    mimeType?: string;
    totalRows: number;
    validRows: number;
    invalidRows: number;
    duplicateRows: number;
  }) {
    return prisma.bulkImport.create({
      data: {
        ...data,
        status: 'COMPLETED',
      },
    });
  }

  async getBulkImports(
    organizationId: string,
    page: number = 1,
    limit: number = 20,
    userRole?: string,
    userId?: string,
    search?: string
  ) {
    const skip = (page - 1) * limit;

    // Build where clause based on role
    const where: any = { organizationId };
    const normalizedRole = userRole?.toLowerCase().replace('_', '');

    // Add search filter
    if (search) {
      where.fileName = { contains: search, mode: 'insensitive' };
    }

    // Manager: only see bulk imports assigned to them
    if (normalizedRole === 'manager' && userId) {
      where.assignedManagerId = userId;
    }
    // Team Lead: see bulk imports where they have assigned records OR assigned to their manager
    else if (normalizedRole === 'teamlead' && userId) {
      // Get the team lead's manager
      const teamLead = await prisma.user.findUnique({
        where: { id: userId },
        select: { managerId: true },
      });

      // Team leads see imports assigned to their manager OR where they have records
      where.OR = [
        { assignedManagerId: teamLead?.managerId },
        { records: { some: { assignedToId: userId } } },
        { records: { some: { assignedTo: { managerId: userId } } } },
      ];
    }
    // Admin sees all

    const [imports, total] = await Promise.all([
      prisma.bulkImport.findMany({
        where,
        include: {
          uploadedBy: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          assignedManager: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          _count: {
            select: { records: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.bulkImport.count({ where }),
    ]);

    // Get per-import assignment counts (Assigned + Pending = Total)
    const importIds = imports.map((i) => i.id);
    if (importIds.length > 0) {
      const [assignedCounts, pendingCounts] = await Promise.all([
        // Assigned = records with assignedToId OR assignedAgentId
        prisma.rawImportRecord.groupBy({
          by: ['bulkImportId'],
          where: {
            bulkImportId: { in: importIds },
            OR: [
              { assignedToId: { not: null } },
              { assignedAgentId: { not: null } },
            ],
          },
          _count: { id: true },
        }),
        // Pending = records with neither
        prisma.rawImportRecord.groupBy({
          by: ['bulkImportId'],
          where: {
            bulkImportId: { in: importIds },
            assignedToId: null,
            assignedAgentId: null,
          },
          _count: { id: true },
        }),
      ]);

      // Map counts to imports
      const assignedMap = new Map(assignedCounts.map((c) => [c.bulkImportId, c._count.id]));
      const pendingMap = new Map(pendingCounts.map((c) => [c.bulkImportId, c._count.id]));

      const importsWithCounts = imports.map((imp) => ({
        ...imp,
        assignedCount: assignedMap.get(imp.id) || 0,
        pendingCount: pendingMap.get(imp.id) || 0,
      }));

      return { imports: importsWithCounts, total };
    }

    return { imports, total };
  }

  // Assign bulk import to a manager (admin only)
  async assignToManager(
    bulkImportId: string,
    managerId: string,
    organizationId: string
  ) {
    // Verify bulk import exists
    const bulkImport = await prisma.bulkImport.findFirst({
      where: { id: bulkImportId, organizationId },
    });

    if (!bulkImport) {
      throw new NotFoundError('Bulk import not found');
    }

    // Verify manager exists and has manager role
    const manager = await prisma.user.findFirst({
      where: {
        id: managerId,
        organizationId,
        isActive: true,
        role: { slug: { in: ['manager', 'admin'] } },
      },
    });

    if (!manager) {
      throw new BadRequestError('Invalid manager or user is not a manager');
    }

    // Update bulk import
    const updated = await prisma.bulkImport.update({
      where: { id: bulkImportId },
      data: {
        assignedManagerId: managerId,
        assignedManagerAt: new Date(),
      },
      include: {
        assignedManager: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    return updated;
  }

  async getBulkImportById(
    id: string,
    organizationId: string,
    userRole?: string,
    userId?: string
  ) {
    const bulkImport = await prisma.bulkImport.findFirst({
      where: { id, organizationId },
      include: {
        uploadedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!bulkImport) {
      throw new NotFoundError('Bulk import not found');
    }

    // Build where clause for status breakdown with role-based filtering
    const recordWhere: any = { bulkImportId: id };
    const normalizedRole = userRole?.toLowerCase().replace('_', '');

    // Apply role-based filtering for stats consistency
    // - Admin: sees all records
    // - Manager: sees all records (full visibility)
    // - Team Lead: sees unassigned + their team's records
    if (normalizedRole === 'teamlead' && userId) {
      const teamMembers = await prisma.user.findMany({
        where: {
          organizationId,
          managerId: userId,
          isActive: true,
        },
        select: { id: true },
      });
      const teamMemberIds = teamMembers.map(m => m.id);

      if (teamMemberIds.length > 0) {
        recordWhere.OR = [
          { assignedToId: null },
          { assignedToId: { in: teamMemberIds } },
        ];
      } else {
        recordWhere.assignedToId = null;
      }
    }
    // Manager and Admin see all records (no additional filter)

    // Get status breakdown with role-based filtering
    const statusBreakdown = await prisma.rawImportRecord.groupBy({
      by: ['status'],
      where: recordWhere,
      _count: { status: true },
    });

    const breakdown = statusBreakdown.reduce((acc, item) => {
      acc[item.status] = item._count.status;
      return acc;
    }, {} as Record<string, number>);

    // Get assignment-based counts (Assigned + Pending = Total)
    // Assigned = records with assignedToId OR assignedAgentId set
    // Pending (unassigned) = records with neither assignedToId nor assignedAgentId
    const [assignedCount, pendingCount] = await Promise.all([
      prisma.rawImportRecord.count({
        where: {
          ...recordWhere,
          OR: [
            { assignedToId: { not: null } },
            { assignedAgentId: { not: null } },
          ],
        },
      }),
      prisma.rawImportRecord.count({
        where: {
          ...recordWhere,
          assignedToId: null,
          assignedAgentId: null,
        },
      }),
    ]);

    return {
      ...bulkImport,
      statusBreakdown: breakdown,
      assignedCount,
      pendingCount,
    };
  }

  // ==================== RAW IMPORT RECORDS ====================

  async createRecords(
    bulkImportId: string,
    organizationId: string,
    records: Array<{
      firstName: string;
      lastName?: string;
      email?: string;
      phone: string;
      alternatePhone?: string;
      customFields?: Record<string, unknown>;
    }>
  ) {
    const BATCH_SIZE = 5000;
    let insertedCount = 0;

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);

      await prisma.rawImportRecord.createMany({
        data: batch.map((record) => ({
          id: uuidv4(),
          bulkImportId,
          organizationId,
          firstName: record.firstName,
          lastName: record.lastName,
          email: record.email,
          phone: record.phone,
          alternatePhone: record.alternatePhone,
          customFields: (record.customFields || {}) as Prisma.InputJsonValue,
          status: 'PENDING',
        })),
        skipDuplicates: true,
      });

      insertedCount += batch.length;
    }

    return insertedCount;
  }

  async getRecords(
    filter: RawImportFilter,
    page: number = 1,
    limit: number = 50
  ) {
    const skip = (page - 1) * limit;
    const where: any = {
      organizationId: filter.organizationId,
    };

    if (filter.bulkImportId) {
      where.bulkImportId = filter.bulkImportId;
    }
    if (filter.status) {
      where.status = filter.status;
    }
    if (filter.assignedToId) {
      where.assignedToId = filter.assignedToId;
    }
    if (filter.assignedAgentId) {
      where.assignedAgentId = filter.assignedAgentId;
    }

    // Date filtering for assignedAt
    if (filter.assignedDateFrom || filter.assignedDateTo) {
      where.assignedAt = {};
      if (filter.assignedDateFrom) {
        where.assignedAt.gte = new Date(filter.assignedDateFrom);
      }
      if (filter.assignedDateTo) {
        // Set to end of day
        const endDate = new Date(filter.assignedDateTo);
        endDate.setHours(23, 59, 59, 999);
        where.assignedAt.lte = endDate;
      }
    }

    // Build search condition separately
    let searchCondition: any = null;
    if (filter.search) {
      searchCondition = {
        OR: [
          { firstName: { contains: filter.search, mode: 'insensitive' } },
          { lastName: { contains: filter.search, mode: 'insensitive' } },
          { email: { contains: filter.search, mode: 'insensitive' } },
          { phone: { contains: filter.search } },
        ],
      };
    }

    // Role-based filtering for team hierarchy
    // - Admin: sees all records
    // - Manager: sees only records from bulk imports assigned to them
    // - Team Lead: sees unassigned records + records assigned to their team members
    const normalizedRole = filter.userRole?.toLowerCase().replace('_', '');
    let roleCondition: any = null;

    if (normalizedRole === 'manager' && filter.userId) {
      // Manager: only see records from bulk imports assigned to them
      roleCondition = {
        bulkImport: {
          assignedManagerId: filter.userId,
        },
      };
    } else if ((normalizedRole === 'teamlead') && filter.userId) {
      // Get telecallers who report to this team lead
      const teamMembers = await prisma.user.findMany({
        where: {
          organizationId: filter.organizationId,
          managerId: filter.userId,
          isActive: true,
        },
        select: { id: true },
      });
      const teamMemberIds = teamMembers.map(m => m.id);

      // Get the team lead's manager
      const teamLead = await prisma.user.findUnique({
        where: { id: filter.userId },
        select: { managerId: true },
      });

      // Show records from bulk imports assigned to their manager OR assigned to their team
      if (teamMemberIds.length > 0) {
        roleCondition = {
          OR: [
            // Records from bulk imports assigned to their manager
            { bulkImport: { assignedManagerId: teamLead?.managerId } },
            // Records assigned to team members
            { assignedToId: { in: teamMemberIds } },
          ],
        };
      } else if (teamLead?.managerId) {
        roleCondition = {
          bulkImport: { assignedManagerId: teamLead.managerId },
        };
      }
    }
    // Admin sees all records (no additional filter)

    // Combine search and role conditions using AND
    const andConditions: any[] = [];
    if (searchCondition) {
      andConditions.push(searchCondition);
    }
    if (roleCondition) {
      andConditions.push(roleCondition);
    }
    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    const [records, total] = await Promise.all([
      prisma.rawImportRecord.findMany({
        where,
        include: {
          assignedTo: {
            select: { id: true, firstName: true, lastName: true },
          },
          assignedAgent: {
            select: { id: true, name: true },
          },
          bulkImport: {
            select: { id: true, fileName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.rawImportRecord.count({ where }),
    ]);

    return { records, total };
  }

  async getRecordById(id: string, organizationId: string) {
    const record = await prisma.rawImportRecord.findFirst({
      where: { id, organizationId },
      include: {
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        assignedAgent: {
          select: { id: true, name: true },
        },
        assignedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        convertedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        convertedLead: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
        bulkImport: true,
      },
    });

    if (!record) {
      throw new NotFoundError('Raw import record not found');
    }

    return record;
  }

  // Search records for global search
  async searchRecords(organizationId: string, search: string, limit: number = 5) {
    const records = await prisma.rawImportRecord.findMany({
      where: {
        organizationId,
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
          { alternatePhone: { contains: search } },
          { city: { contains: search, mode: 'insensitive' } },
          { state: { contains: search, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        status: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return records;
  }

  // ==================== ASSIGNMENT ====================

  async assignToTelecallers(
    recordIds: string[],
    telecallerIds: string[],
    assignedById: string,
    organizationId: string,
    assignerRole?: string
  ) {
    if (telecallerIds.length === 0) {
      throw new BadRequestError('At least one telecaller is required');
    }

    // Build telecaller query - team leads can only assign to their team members
    const telecallerWhere: Prisma.UserWhereInput = {
      id: { in: telecallerIds },
      organizationId,
      isActive: true,
    };

    // If assigner is a team_lead, only allow assigning to their direct reports
    const normalizedRole = assignerRole?.toLowerCase();
    if (normalizedRole === 'team_lead' || normalizedRole === 'teamlead') {
      telecallerWhere.managerId = assignedById;
    }

    // Verify telecallers belong to organization (and to team lead's team if applicable)
    const telecallers = await prisma.user.findMany({
      where: telecallerWhere,
      select: { id: true, firstName: true, lastName: true },
    });

    if (telecallers.length === 0) {
      if (normalizedRole === 'team_lead' || normalizedRole === 'teamlead') {
        throw new BadRequestError('No valid team members found. Team leads can only assign to their direct reports.');
      }
      throw new BadRequestError('Some telecallers are invalid or inactive');
    }

    if (telecallers.length !== telecallerIds.length) {
      if (normalizedRole === 'team_lead' || normalizedRole === 'teamlead') {
        throw new BadRequestError('Some telecallers are not in your team. Team leads can only assign to their direct reports.');
      }
      throw new BadRequestError('Some telecallers are invalid or inactive');
    }

    // Get records to assign
    const records = await prisma.rawImportRecord.findMany({
      where: {
        id: { in: recordIds },
        organizationId,
        status: 'PENDING',
      },
    });

    if (records.length === 0) {
      throw new BadRequestError('No pending records found to assign');
    }

    // Round-robin assignment
    const updates = records.map((record, index) => {
      const telecallerId = telecallerIds[index % telecallerIds.length];
      return prisma.rawImportRecord.update({
        where: { id: record.id },
        data: {
          assignedToId: telecallerId,
          assignedById,
          assignedAt: new Date(),
          status: 'ASSIGNED',
        },
      });
    });

    await prisma.$transaction(updates);

    return {
      assignedCount: records.length,
      telecallerCount: telecallers.length,
    };
  }

  async assignToAIAgent(
    recordIds: string[],
    agentId: string,
    assignedById: string,
    organizationId: string
  ) {
    // Verify agent exists and belongs to organization
    const agent = await prisma.voiceAgent.findFirst({
      where: { id: agentId, organizationId, isActive: true },
    });

    if (!agent) {
      throw new BadRequestError('AI agent not found or inactive');
    }

    // Get records to assign
    const records = await prisma.rawImportRecord.findMany({
      where: {
        id: { in: recordIds },
        organizationId,
        status: 'PENDING',
      },
    });

    if (records.length === 0) {
      throw new BadRequestError('No pending records found to assign');
    }

    // Assign all records to AI agent
    await prisma.rawImportRecord.updateMany({
      where: {
        id: { in: records.map((r) => r.id) },
      },
      data: {
        assignedAgentId: agentId,
        assignedById,
        assignedAt: new Date(),
        status: 'ASSIGNED',
      },
    });

    return {
      assignedCount: records.length,
      agentName: agent.name,
    };
  }

  // ==================== STATUS UPDATES ====================

  async updateRecordStatus(
    recordId: string,
    organizationId: string,
    status: RawImportRecordStatus,
    data?: {
      notes?: string;
      callSummary?: string;
      callSentiment?: string;
      interestLevel?: string;
      outboundCallId?: string;
    }
  ) {
    const record = await prisma.rawImportRecord.findFirst({
      where: { id: recordId, organizationId },
    });

    if (!record) {
      throw new NotFoundError('Record not found');
    }

    const updateData: any = { status };

    if (status === 'CALLING') {
      updateData.lastCallAt = new Date();
      updateData.callAttempts = { increment: 1 };
    }

    if (data) {
      if (data.notes) updateData.notes = data.notes;
      if (data.callSummary) updateData.callSummary = data.callSummary;
      if (data.callSentiment) updateData.callSentiment = data.callSentiment;
      if (data.interestLevel) updateData.interestLevel = data.interestLevel;
      if (data.outboundCallId) updateData.outboundCallId = data.outboundCallId;
    }

    return prisma.rawImportRecord.update({
      where: { id: recordId },
      data: updateData,
    });
  }

  // ==================== CONVERSION ====================

  async convertToLead(
    recordId: string,
    organizationId: string,
    convertedById: string,
    additionalData?: {
      source?: LeadSource;
      priority?: LeadPriority;
      notes?: string;
    }
  ) {
    const record = await prisma.rawImportRecord.findFirst({
      where: { id: recordId, organizationId },
      include: { bulkImport: true },
    });

    if (!record) {
      throw new NotFoundError('Record not found');
    }

    if (record.convertedLeadId) {
      throw new BadRequestError('Record already converted to lead');
    }

    // IMPORTANT: Only allow conversion if record is assigned to a user
    if (!record.assignedToId) {
      throw new BadRequestError('Cannot convert to lead: Record must be assigned to a user first');
    }

    // Get the first stage for the organization (lowest positive journeyOrder)
    const firstStage = await prisma.leadStage.findFirst({
      where: {
        organizationId,
        journeyOrder: { gt: 0 }, // Positive = progress stage (not lost)
        isActive: true,
      },
      orderBy: { journeyOrder: 'asc' },
    });

    // Create lead from record with first stage assigned
    const lead = await prisma.lead.create({
      data: {
        organizationId,
        firstName: record.firstName,
        lastName: record.lastName,
        email: record.email,
        phone: record.phone,
        alternatePhone: record.alternatePhone,
        source: additionalData?.source || 'BULK_UPLOAD',
        sourceDetails: `Bulk Import: ${record.bulkImport?.fileName || 'Unknown'}`,
        priority: additionalData?.priority || 'MEDIUM',
        stageId: firstStage?.id, // Assign first stage
        customFields: record.customFields || {},
      },
    });

    // IMPORTANT: Carry over the assignment from raw record to lead
    // This ensures lead is assigned to the same user who was handling the raw record
    await prisma.leadAssignment.create({
      data: {
        leadId: lead.id,
        assignedToId: record.assignedToId,
        assignedById: record.assignedById || convertedById,
        isActive: true,
      },
    });

    // Add note if provided
    if (additionalData?.notes || record.callSummary) {
      await prisma.leadNote.create({
        data: {
          leadId: lead.id,
          userId: convertedById,
          content: additionalData?.notes || record.callSummary || 'Converted from raw import',
          isPinned: false,
        },
      });
    }

    // Update record as converted
    await prisma.rawImportRecord.update({
      where: { id: recordId },
      data: {
        status: 'CONVERTED',
        convertedLeadId: lead.id,
        convertedAt: new Date(),
        convertedById,
      },
    });

    // Update bulk import converted count
    await prisma.bulkImport.update({
      where: { id: record.bulkImportId },
      data: {
        convertedCount: { increment: 1 },
      },
    });

    return lead;
  }

  async bulkConvertToLeads(
    recordIds: string[],
    organizationId: string,
    convertedById: string
  ) {
    // Get records that are INTERESTED, assigned to a user, and not yet converted
    const records = await prisma.rawImportRecord.findMany({
      where: {
        id: { in: recordIds },
        organizationId,
        status: 'INTERESTED',
        convertedLeadId: null,
        assignedToId: { not: null }, // IMPORTANT: Only convert assigned records
      },
      include: { bulkImport: true },
    });

    if (records.length === 0) {
      throw new BadRequestError('No eligible records found for conversion. Records must be assigned to a user first.');
    }

    const convertedLeads = [];

    for (const record of records) {
      try {
        const lead = await this.convertToLead(
          record.id,
          organizationId,
          convertedById
        );
        convertedLeads.push(lead);
      } catch (error) {
        console.error(`Failed to convert record ${record.id}:`, error);
      }
    }

    return {
      totalRequested: recordIds.length,
      eligibleRecords: records.length,
      convertedCount: convertedLeads.length,
    };
  }

  async bulkUpdateStatus(
    recordIds: string[],
    organizationId: string,
    status: RawImportRecordStatus
  ) {
    const result = await prisma.rawImportRecord.updateMany({
      where: {
        id: { in: recordIds },
        organizationId,
      },
      data: {
        status,
        updatedAt: new Date(),
      },
    });

    return {
      updatedCount: result.count,
    };
  }

  // ==================== STATS ====================

  async getStats(organizationId: string): Promise<BulkImportStats> {
    // Get today's start for counting today's assignments
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalImports,
      totalRecords,
      statusCounts,
      todayAssignedCount,
      // Assignment-based counts (Assigned + Pending = Total)
      assignedCount,
      pendingCount,
    ] = await Promise.all([
      prisma.bulkImport.count({ where: { organizationId } }),
      prisma.rawImportRecord.count({ where: { organizationId } }),
      prisma.rawImportRecord.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: { status: true },
      }),
      // Count records assigned today
      prisma.rawImportRecord.count({
        where: {
          organizationId,
          assignedToId: { not: null },
          assignedAt: { gte: todayStart },
        },
      }),
      // Assigned = records with assignedToId OR assignedAgentId
      prisma.rawImportRecord.count({
        where: {
          organizationId,
          OR: [
            { assignedToId: { not: null } },
            { assignedAgentId: { not: null } },
          ],
        },
      }),
      // Pending = records with neither assignedToId nor assignedAgentId
      prisma.rawImportRecord.count({
        where: {
          organizationId,
          assignedToId: null,
          assignedAgentId: null,
        },
      }),
    ]);

    const countByStatus = statusCounts.reduce((acc, item) => {
      acc[item.status] = item._count.status;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalImports,
      totalRecords,
      // Use assignment-based counts for Pending and Assigned
      pendingRecords: pendingCount,
      assignedRecords: assignedCount,
      interestedRecords: countByStatus['INTERESTED'] || 0,
      convertedRecords: countByStatus['CONVERTED'] || 0,
      notInterestedRecords: countByStatus['NOT_INTERESTED'] || 0,
      // Add byStatus for pipeline chart compatibility
      byStatus: countByStatus,
      // Add today's assigned count
      todayAssigned: todayAssignedCount,
    };
  }

  // Get assignment stats by telecaller (for admin/manager/team_lead view)
  async getTelecallerAssignmentStats(
    organizationId: string,
    userRole?: string,
    userId?: string,
    assignedDateFrom?: string,
    assignedDateTo?: string
  ) {
    // Build where clause based on role
    const whereClause: any = {
      organizationId,
      assignedToId: { not: null },
    };

    // Date filtering for assignedAt
    if (assignedDateFrom || assignedDateTo) {
      whereClause.assignedAt = {};
      if (assignedDateFrom) {
        whereClause.assignedAt.gte = new Date(assignedDateFrom);
      }
      if (assignedDateTo) {
        // Set to end of day
        const endDate = new Date(assignedDateTo);
        endDate.setHours(23, 59, 59, 999);
        whereClause.assignedAt.lte = endDate;
      }
    }

    // Role-based filtering:
    // - Admin: sees all telecaller stats
    // - Manager: sees all telecaller stats (full visibility)
    // - Team Lead: sees only their team members' stats
    const normalizedRole = userRole?.toLowerCase().replace('_', '');
    let allowedTelecallerIds: string[] | null = null;

    if (normalizedRole === 'teamlead' && userId) {
      const teamMembers = await prisma.user.findMany({
        where: {
          organizationId,
          managerId: userId,
          isActive: true,
        },
        select: { id: true },
      });
      allowedTelecallerIds = teamMembers.map(m => m.id);
      if (allowedTelecallerIds.length > 0) {
        whereClause.assignedToId = { in: allowedTelecallerIds };
      } else {
        // No team members, return empty
        return { telecallers: [], unassignedCount: 0, totalTelecallers: 0 };
      }
    }
    // Manager and Admin see all telecaller stats (no additional filter)

    // Get assignment counts grouped by telecaller
    const assignmentStats = await prisma.rawImportRecord.groupBy({
      by: ['assignedToId'],
      where: whereClause,
      _count: { id: true },
    });

    // Get status breakdown for each telecaller
    const statusByTelecaller = await prisma.rawImportRecord.groupBy({
      by: ['assignedToId', 'status'],
      where: whereClause,
      _count: { id: true },
    });

    // Get telecaller details
    const telecallerIds = assignmentStats
      .map(s => s.assignedToId)
      .filter((id): id is string => id !== null);

    const telecallers = await prisma.user.findMany({
      where: { id: { in: telecallerIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        isActive: true,
        role: { select: { name: true, slug: true } },
      },
    });

    const telecallerMap = new Map(telecallers.map(t => [t.id, t]));

    // Build status breakdown map
    const statusBreakdownMap = new Map<string, Record<string, number>>();
    for (const stat of statusByTelecaller) {
      if (!stat.assignedToId) continue;
      if (!statusBreakdownMap.has(stat.assignedToId)) {
        statusBreakdownMap.set(stat.assignedToId, {});
      }
      statusBreakdownMap.get(stat.assignedToId)![stat.status] = stat._count.id;
    }

    // Combine data
    const result = assignmentStats
      .filter(s => s.assignedToId && telecallerMap.has(s.assignedToId))
      .map(stat => {
        const telecaller = telecallerMap.get(stat.assignedToId!)!;
        const statusBreakdown = statusBreakdownMap.get(stat.assignedToId!) || {};
        return {
          telecallerId: stat.assignedToId,
          telecallerName: `${telecaller.firstName} ${telecaller.lastName || ''}`.trim(),
          email: telecaller.email,
          isActive: telecaller.isActive,
          role: telecaller.role?.name || 'Telecaller',
          totalAssigned: stat._count.id,
          statusBreakdown: {
            assigned: statusBreakdown['ASSIGNED'] || 0,
            calling: statusBreakdown['CALLING'] || 0,
            interested: statusBreakdown['INTERESTED'] || 0,
            notInterested: statusBreakdown['NOT_INTERESTED'] || 0,
            callbackRequested: statusBreakdown['CALLBACK_REQUESTED'] || 0,
            noAnswer: statusBreakdown['NO_ANSWER'] || 0,
            converted: statusBreakdown['CONVERTED'] || 0,
          },
        };
      })
      .sort((a, b) => b.totalAssigned - a.totalAssigned);

    // Get unassigned count
    const unassignedCount = await prisma.rawImportRecord.count({
      where: {
        organizationId,
        status: 'PENDING',
        assignedToId: null,
      },
    });

    return {
      telecallers: result,
      unassignedCount,
      totalTelecallers: result.length,
    };
  }

  // ==================== DUPLICATE DETECTION ====================

  async detectDuplicates(
    organizationId: string,
    records: Array<{ phone: string; email?: string }>,
    options: { skipRawImportCheck?: boolean } = {}
  ): Promise<{
    unique: typeof records;
    duplicates: Array<{ phone: string; email?: string; reason: string }>;
  }> {
    const phones = records.map((r) => r.phone);
    const emails = records.filter((r) => r.email).map((r) => r.email!.toLowerCase());

    const BATCH_SIZE = 10000;
    const existingPhones = new Set<string>();
    const existingEmails = new Set<string>();

    // Check against leads table (always check - these are converted leads)
    for (let i = 0; i < phones.length; i += BATCH_SIZE) {
      const phoneBatch = phones.slice(i, i + BATCH_SIZE);
      const results = await prisma.lead.findMany({
        where: {
          organizationId,
          phone: { in: phoneBatch },
        },
        select: { phone: true },
      });
      results.forEach((l) => existingPhones.add(l.phone));
    }

    // Check against raw_import_records table (skip if option set)
    if (!options.skipRawImportCheck) {
      for (let i = 0; i < phones.length; i += BATCH_SIZE) {
        const phoneBatch = phones.slice(i, i + BATCH_SIZE);
        const results = await prisma.rawImportRecord.findMany({
          where: {
            organizationId,
            phone: { in: phoneBatch },
          },
          select: { phone: true },
        });
        results.forEach((r) => existingPhones.add(r.phone));
      }
    }

    console.log(`[RawImport] Duplicate check: ${existingPhones.size} existing phones found (skipRawImportCheck: ${options.skipRawImportCheck || false})`)

    // Check emails in leads
    for (let i = 0; i < emails.length; i += BATCH_SIZE) {
      const emailBatch = emails.slice(i, i + BATCH_SIZE);
      const results = await prisma.lead.findMany({
        where: {
          organizationId,
          email: { in: emailBatch, mode: 'insensitive' },
        },
        select: { email: true },
      });
      results.forEach((l) => {
        if (l.email) existingEmails.add(l.email.toLowerCase());
      });
    }

    // Check emails in raw imports
    for (let i = 0; i < emails.length; i += BATCH_SIZE) {
      const emailBatch = emails.slice(i, i + BATCH_SIZE);
      const results = await prisma.rawImportRecord.findMany({
        where: {
          organizationId,
          email: { in: emailBatch, mode: 'insensitive' },
        },
        select: { email: true },
      });
      results.forEach((r) => {
        if (r.email) existingEmails.add(r.email.toLowerCase());
      });
    }

    const unique: typeof records = [];
    const duplicates: Array<{ phone: string; email?: string; reason: string }> = [];
    const seenPhones = new Set<string>();
    const seenEmails = new Set<string>();

    for (const record of records) {
      let isDuplicate = false;
      let reason = '';

      if (existingPhones.has(record.phone)) {
        isDuplicate = true;
        reason = 'Phone number already exists';
      } else if (record.email && existingEmails.has(record.email.toLowerCase())) {
        isDuplicate = true;
        reason = 'Email already exists';
      } else if (seenPhones.has(record.phone)) {
        isDuplicate = true;
        reason = 'Duplicate phone in uploaded file';
      } else if (record.email && seenEmails.has(record.email.toLowerCase())) {
        isDuplicate = true;
        reason = 'Duplicate email in uploaded file';
      }

      if (isDuplicate) {
        duplicates.push({ phone: record.phone, email: record.email, reason });
      } else {
        unique.push(record);
        seenPhones.add(record.phone);
        if (record.email) {
          seenEmails.add(record.email.toLowerCase());
        }
      }
    }

    return { unique, duplicates };
  }

  // ==================== DELETE ====================

  async deleteRecord(recordId: string, organizationId: string) {
    const record = await prisma.rawImportRecord.findFirst({
      where: { id: recordId, organizationId },
    });

    if (!record) {
      throw new NotFoundError('Record not found');
    }

    await prisma.rawImportRecord.delete({
      where: { id: recordId },
    });

    return { deleted: true };
  }

  async bulkDeleteRecords(recordIds: string[], organizationId: string) {
    const result = await prisma.rawImportRecord.deleteMany({
      where: {
        id: { in: recordIds },
        organizationId,
      },
    });

    return {
      deletedCount: result.count,
    };
  }

  async deleteBulkImport(bulkImportId: string, organizationId: string) {
    const bulkImport = await prisma.bulkImport.findFirst({
      where: { id: bulkImportId, organizationId },
    });

    if (!bulkImport) {
      throw new NotFoundError('Bulk import not found');
    }

    // Delete all records first
    const deletedRecords = await prisma.rawImportRecord.deleteMany({
      where: { bulkImportId, organizationId },
    });

    // Then delete the bulk import
    await prisma.bulkImport.delete({
      where: { id: bulkImportId },
    });

    return {
      deleted: true,
      deletedRecordsCount: deletedRecords.count,
    };
  }

  // ==================== MANUAL RECORD ADDITION ====================

  async addManualRecord(
    bulkImportId: string,
    organizationId: string,
    data: {
      firstName: string;
      lastName?: string;
      email?: string;
      phone: string;
      alternatePhone?: string;
      customFields?: Record<string, any>;
    }
  ) {
    // Verify bulk import exists and belongs to organization
    const bulkImport = await prisma.bulkImport.findFirst({
      where: { id: bulkImportId, organizationId },
    });

    if (!bulkImport) {
      throw new NotFoundError('Bulk import not found');
    }

    // Check for duplicate phone in this organization
    const existingRecord = await prisma.rawImportRecord.findFirst({
      where: {
        organizationId,
        phone: data.phone,
      },
    });

    if (existingRecord) {
      throw new BadRequestError(`Phone number ${data.phone} already exists in raw imports`);
    }

    // Check for duplicate in leads
    const existingLead = await prisma.lead.findFirst({
      where: {
        organizationId,
        phone: data.phone,
      },
    });

    if (existingLead) {
      throw new BadRequestError(`Phone number ${data.phone} already exists as a lead`);
    }

    // Create the record
    const record = await prisma.rawImportRecord.create({
      data: {
        bulkImportId,
        organizationId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        alternatePhone: data.alternatePhone,
        customFields: data.customFields || {},
        status: 'PENDING',
      },
    });

    // Update bulk import validRows count
    await prisma.bulkImport.update({
      where: { id: bulkImportId },
      data: {
        validRows: { increment: 1 },
        totalRows: { increment: 1 },
      },
    });

    return record;
  }

  async addBulkManualRecords(
    bulkImportId: string,
    organizationId: string,
    records: Array<{
      firstName: string;
      lastName?: string;
      email?: string;
      phone: string;
      alternatePhone?: string;
      customFields?: Record<string, any>;
    }>
  ) {
    // Verify bulk import exists and belongs to organization
    const bulkImport = await prisma.bulkImport.findFirst({
      where: { id: bulkImportId, organizationId },
    });

    if (!bulkImport) {
      throw new NotFoundError('Bulk import not found');
    }

    // Get all existing phones in organization
    const phones = records.map(r => r.phone);

    const existingRawRecords = await prisma.rawImportRecord.findMany({
      where: {
        organizationId,
        phone: { in: phones },
      },
      select: { phone: true },
    });

    const existingLeads = await prisma.lead.findMany({
      where: {
        organizationId,
        phone: { in: phones },
      },
      select: { phone: true },
    });

    const existingPhones = new Set([
      ...existingRawRecords.map(r => r.phone),
      ...existingLeads.map(l => l.phone),
    ]);

    // Filter out duplicates
    const uniqueRecords = records.filter(r => !existingPhones.has(r.phone));
    const duplicateCount = records.length - uniqueRecords.length;

    if (uniqueRecords.length === 0) {
      throw new BadRequestError('All phone numbers already exist');
    }

    // Create records
    const createdRecords = await prisma.rawImportRecord.createMany({
      data: uniqueRecords.map(record => ({
        bulkImportId,
        organizationId,
        firstName: record.firstName,
        lastName: record.lastName,
        email: record.email,
        phone: record.phone,
        alternatePhone: record.alternatePhone,
        customFields: record.customFields || {},
        status: 'PENDING' as RawImportRecordStatus,
      })),
    });

    // Update bulk import counts
    await prisma.bulkImport.update({
      where: { id: bulkImportId },
      data: {
        validRows: { increment: createdRecords.count },
        totalRows: { increment: records.length },
        duplicateRows: { increment: duplicateCount },
      },
    });

    return {
      count: createdRecords.count,
      duplicateCount,
      totalSubmitted: records.length,
    };
  }
}

export const rawImportService = new RawImportService();
