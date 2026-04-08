import { prisma } from '../config/database';
import { NotFoundError } from '../utils/errors';
import { LeadSource, LeadPriority, Prisma, AdmissionStatus, AdmissionType } from '@prisma/client';

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
  // Education Admission Management fields
  admissionStatus?: AdmissionStatus;
  admissionType?: AdmissionType;
  expectedFee?: number;
  actualFee?: number;
  commissionPercentage?: number;
  donationAmount?: number;
  enrollmentNumber?: string;
  academicYear?: string;
  preferredUniversities?: string[];
  fatherName?: string;
  fatherMobile?: string;
  address?: string;
  city?: string;
  state?: string;
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
  // Role-based filtering
  userRole?: string;
  userId?: string;
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
    // If no stageId provided, get the first stage for the organization
    let stageId = input.stageId;
    if (!stageId) {
      const firstStage = await prisma.leadStage.findFirst({
        where: {
          organizationId: input.organizationId,
          journeyOrder: { gt: 0 }, // Positive = progress stage (not lost)
          isActive: true,
        },
        orderBy: { journeyOrder: 'asc' },
      });
      stageId = firstStage?.id;
    }

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
        stageId,
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

    // Build role-based condition separately
    const normalizedRole = filter.userRole?.toLowerCase().replace('_', '');
    let roleCondition: Prisma.LeadWhereInput | null = null;

    if (filter.assignedToId) {
      // Explicit filter takes precedence
      roleCondition = {
        assignments: {
          some: {
            assignedToId: filter.assignedToId,
            isActive: true,
          },
        },
      };
    } else if (normalizedRole === 'teamlead' && filter.userId) {
      // Team Lead: see unassigned leads + leads assigned to themselves or team members
      const teamMembers = await prisma.user.findMany({
        where: {
          organizationId: filter.organizationId,
          managerId: filter.userId,
          isActive: true,
        },
        select: { id: true },
      });
      // Include team lead themselves + their team members
      const allMemberIds = [filter.userId, ...teamMembers.map(m => m.id)];

      roleCondition = {
        OR: [
          // Unassigned leads (no active assignment)
          { assignments: { none: { isActive: true } } },
          // Leads assigned to team lead or their team
          { assignments: { some: { assignedToId: { in: allMemberIds }, isActive: true } } },
        ],
      };
    } else if (normalizedRole === 'manager' && filter.userId) {
      // Manager: see unassigned leads + leads assigned to their hierarchy
      const teamLeads = await prisma.user.findMany({
        where: {
          organizationId: filter.organizationId,
          managerId: filter.userId,
          role: { slug: 'team_lead' },
          isActive: true,
        },
        select: { id: true },
      });
      const teamLeadIds = teamLeads.map(tl => tl.id);

      // Get all users under these team leads + direct reports
      const allTeamMembers = await prisma.user.findMany({
        where: {
          organizationId: filter.organizationId,
          OR: [
            { managerId: { in: teamLeadIds } },
            { managerId: filter.userId },
          ],
          isActive: true,
        },
        select: { id: true },
      });
      // Include manager + team leads + all team members
      const allMemberIds = [filter.userId, ...teamLeadIds, ...allTeamMembers.map(m => m.id)];

      roleCondition = {
        OR: [
          // Unassigned leads
          { assignments: { none: { isActive: true } } },
          // Leads assigned to anyone in the hierarchy
          { assignments: { some: { assignedToId: { in: allMemberIds }, isActive: true } } },
        ],
      };
    } else if (normalizedRole === 'telecaller' || normalizedRole === 'counselor') {
      // Telecaller/Counselor: only see their own assigned leads
      if (filter.userId) {
        roleCondition = {
          assignments: {
            some: {
              assignedToId: filter.userId,
              isActive: true,
            },
          },
        };
      }
    }
    // Admin sees all leads (no filter)

    // Build search condition separately
    let searchCondition: Prisma.LeadWhereInput | null = null;
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

    // Combine conditions using AND
    const andConditions: Prisma.LeadWhereInput[] = [];
    if (roleCondition) {
      andConditions.push(roleCondition);
    }
    if (searchCondition) {
      andConditions.push(searchCondition);
    }
    if (andConditions.length > 0) {
      where.AND = andConditions;
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

  async update(id: string, organizationId: string, input: UpdateLeadInput, userId?: string) {
    const lead = await prisma.lead.findFirst({
      where: { id, organizationId },
    });

    if (!lead) {
      throw new NotFoundError('Lead not found');
    }

    // Track what fields changed for activity log
    const changedFields: string[] = [];
    const oldValues: Record<string, unknown> = {};
    const newValues: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(input)) {
      const oldVal = (lead as Record<string, unknown>)[key];
      if (oldVal !== value && value !== undefined) {
        changedFields.push(key);
        oldValues[key] = oldVal;
        newValues[key] = value;
      }
    }

    // Set convertedAt timestamp when marking as converted
    const updateData: Record<string, unknown> = { ...input };
    if (input.isConverted === true && !lead.isConverted) {
      updateData.convertedAt = new Date();
    }

    const updatedLead = await prisma.lead.update({
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

    // Create activity log if there were changes
    if (changedFields.length > 0) {
      const fieldLabels: Record<string, string> = {
        firstName: 'First Name',
        lastName: 'Last Name',
        phone: 'Phone',
        email: 'Email',
        city: 'City',
        state: 'State',
        country: 'Country',
        address: 'Address',
        pincode: 'Pincode',
        company: 'Company',
        designation: 'Designation',
        source: 'Source',
        priority: 'Priority',
        status: 'Status',
        isConverted: 'Conversion Status',
      };

      const changedFieldNames = changedFields
        .map(f => fieldLabels[f] || f)
        .join(', ');

      await prisma.leadActivity.create({
        data: {
          leadId: id,
          userId: userId || null,
          type: 'LEAD_DATA_UPDATED',
          title: 'Lead details updated',
          description: `Updated: ${changedFieldNames}`,
          metadata: {
            changedFields,
            oldValues,
            newValues,
          },
        },
      });
    }

    return updatedLead;
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
