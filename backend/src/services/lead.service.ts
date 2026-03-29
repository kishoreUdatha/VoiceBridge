import { prisma } from '../config/database';
import { NotFoundError } from '../utils/errors';
import { LeadSource, LeadPriority, Prisma } from '@prisma/client';

interface CreateLeadInput {
  organizationId: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone: string;
  alternatePhone?: string;
  source?: LeadSource;
  sourceDetails?: string;
  stageId?: string;
  priority?: LeadPriority;
  notes?: string;
  customFields?: Record<string, unknown>;
}

interface UpdateLeadInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  stageId?: string;
  priority?: LeadPriority;
  notes?: string;
  customFields?: Prisma.InputJsonValue;
  isConverted?: boolean;
}

interface LeadFilter {
  organizationId: string;
  stageId?: string;
  source?: LeadSource;
  priority?: LeadPriority;
  assignedToId?: string;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  isConverted?: boolean;
}

export class LeadService {
  async findByPhone(phone: string, organizationId: string) {
    return prisma.lead.findFirst({
      where: {
        organizationId,
        phone,
      },
      include: {
        assignments: {
          where: { isActive: true },
          include: {
            assignedTo: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
      },
    });
  }

  async create(input: CreateLeadInput) {
    const lead = await prisma.lead.create({
      data: {
        organizationId: input.organizationId,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        alternatePhone: input.alternatePhone,
        source: input.source || LeadSource.MANUAL,
        sourceDetails: input.sourceDetails,
        stageId: input.stageId,
        priority: input.priority || LeadPriority.MEDIUM,
        customFields: input.customFields as Prisma.InputJsonValue || {},
      },
      include: {
        assignments: {
          where: { isActive: true },
          include: {
            assignedTo: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
      },
    });

    return lead;
  }

  async findById(id: string, organizationId: string) {
    const lead = await prisma.lead.findFirst({
      where: { id, organizationId },
      include: {
        assignments: {
          where: { isActive: true },
          include: {
            assignedTo: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
        callLogs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        smsLogs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        emailLogs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        whatsappLogs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!lead) {
      throw new NotFoundError('Lead not found');
    }

    return lead;
  }

  async findAll(filter: LeadFilter, page = 1, limit = 20) {
    const where: Prisma.LeadWhereInput = {
      organizationId: filter.organizationId,
    };

    if (filter.stageId) {
      where.stageId = filter.stageId;
    }

    if (filter.source) {
      where.source = filter.source;
    }

    if (filter.priority) {
      where.priority = filter.priority;
    }

    if (filter.assignedToId) {
      where.assignments = {
        some: {
          assignedToId: filter.assignedToId,
          isActive: true,
        },
      };
    }

    if (filter.search) {
      where.OR = [
        { firstName: { contains: filter.search, mode: 'insensitive' } },
        { lastName: { contains: filter.search, mode: 'insensitive' } },
        { email: { contains: filter.search, mode: 'insensitive' } },
        { phone: { contains: filter.search } },
      ];
    }

    if (filter.dateFrom || filter.dateTo) {
      where.createdAt = {};
      if (filter.dateFrom) {
        where.createdAt.gte = filter.dateFrom;
      }
      if (filter.dateTo) {
        where.createdAt.lte = filter.dateTo;
      }
    }

    if (filter.isConverted !== undefined) {
      where.isConverted = filter.isConverted;
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: {
          stage: {
            select: { id: true, name: true, color: true },
          },
          assignments: {
            where: { isActive: true },
            include: {
              assignedTo: {
                select: { id: true, firstName: true, lastName: true, email: true },
              },
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.lead.count({ where }),
    ]);

    return { leads, total };
  }

  async update(id: string, organizationId: string, input: UpdateLeadInput) {
    const lead = await prisma.lead.findFirst({
      where: { id, organizationId },
    });

    if (!lead) {
      throw new NotFoundError('Lead not found');
    }

    // Set convertedAt timestamp when marking as converted
    const updateData: Record<string, unknown> = { ...input };
    if (input.isConverted === true && !lead.isConverted) {
      updateData.convertedAt = new Date();
    }

    return prisma.lead.update({
      where: { id },
      data: updateData,
      include: {
        assignments: {
          where: { isActive: true },
          include: {
            assignedTo: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
      },
    });
  }

  async delete(id: string, organizationId: string) {
    const lead = await prisma.lead.findFirst({
      where: { id, organizationId },
    });

    if (!lead) {
      throw new NotFoundError('Lead not found');
    }

    await prisma.lead.delete({ where: { id } });
  }

  async assignLead(leadId: string, assignedToId: string, assignedById: string, organizationId: string) {
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId },
    });

    if (!lead) {
      throw new NotFoundError('Lead not found');
    }

    // Deactivate existing assignments
    await prisma.leadAssignment.updateMany({
      where: { leadId, isActive: true },
      data: { isActive: false, unassignedAt: new Date() },
    });

    // Create new assignment
    const assignment = await prisma.leadAssignment.create({
      data: {
        leadId,
        assignedToId,
        assignedById,
      },
      include: {
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    return assignment;
  }

  async assignBulk(
    organizationId: string,
    counselorIds: string[],
    assignedById: string,
    source?: LeadSource
  ): Promise<{ assignedCount: number; counselorAssignments: Record<string, number> }> {
    // Find unassigned leads (optionally filtered by source)
    const whereClause: Prisma.LeadWhereInput = {
      organizationId,
      assignments: {
        none: { isActive: true },
      },
    };

    if (source) {
      whereClause.source = source;
    }

    const unassignedLeads = await prisma.lead.findMany({
      where: whereClause,
      select: { id: true },
      orderBy: { createdAt: 'desc' },
    });

    if (unassignedLeads.length === 0) {
      return { assignedCount: 0, counselorAssignments: {} };
    }

    // Round-robin distribution
    const counselorAssignments: Record<string, number> = {};
    counselorIds.forEach((id) => {
      counselorAssignments[id] = 0;
    });

    const assignments = unassignedLeads.map((lead, index) => {
      const counselorId = counselorIds[index % counselorIds.length];
      counselorAssignments[counselorId]++;
      return {
        leadId: lead.id,
        assignedToId: counselorId,
        assignedById,
      };
    });

    // Bulk create assignments
    await prisma.leadAssignment.createMany({
      data: assignments,
    });

    return {
      assignedCount: assignments.length,
      counselorAssignments,
    };
  }

  async getStats(organizationId: string, assignedToId?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    // Base where clause - if assignedToId is provided, filter by assignment
    const baseWhere = assignedToId
      ? {
          organizationId,
          assignments: {
            some: {
              assignedToId,
              isActive: true,
            },
          },
        }
      : { organizationId };

    const [
      total,
      byStage,
      bySource,
      todayCount,
      thisWeekCount,
      thisMonthCount,
      stages,
    ] = await Promise.all([
      prisma.lead.count({ where: baseWhere }),
      prisma.lead.groupBy({
        by: ['stageId'],
        where: baseWhere,
        _count: true,
      }),
      prisma.lead.groupBy({
        by: ['source'],
        where: baseWhere,
        _count: true,
      }),
      prisma.lead.count({
        where: {
          ...baseWhere,
          createdAt: { gte: today },
        },
      }),
      prisma.lead.count({
        where: {
          ...baseWhere,
          createdAt: { gte: weekAgo },
        },
      }),
      prisma.lead.count({
        where: {
          ...baseWhere,
          createdAt: { gte: monthStart },
        },
      }),
      prisma.leadStage.findMany({
        where: { organizationId },
        select: { id: true, name: true },
      }),
    ]);

    // Map stage IDs to names
    const stageMap = stages.reduce((acc, stage) => {
      acc[stage.id] = stage.name;
      return acc;
    }, {} as Record<string, string>);

    return {
      total,
      byStatus: byStage.reduce((acc, item) => {
        const stageName = item.stageId ? stageMap[item.stageId] || 'Unknown' : 'Unassigned';
        acc[stageName] = item._count;
        return acc;
      }, {} as Record<string, number>),
      bySource: bySource.reduce((acc, item) => {
        acc[item.source] = item._count;
        return acc;
      }, {} as Record<string, number>),
      todayCount,
      thisWeekCount,
      thisMonthCount,
    };
  }
}

export const leadService = new LeadService();
