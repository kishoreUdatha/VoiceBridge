import { prisma } from '../config/database';
import { Prisma, StudentVisitStatus } from '@prisma/client';
import { NotFoundError, BadRequestError } from '../utils/errors';

interface ScheduleVisitInput {
  organizationId: string;
  leadId: string;
  universityId: string;
  visitDate: Date;
  visitTime?: string;
  arrangedById: string;
  accompaniedById?: string;
  travelArranged?: boolean;
  travelExpense?: number;
  notes?: string;
}

interface UpdateVisitInput {
  visitDate?: Date;
  visitTime?: string;
  status?: StudentVisitStatus;
  accompaniedById?: string | null;
  travelArranged?: boolean;
  travelExpense?: number;
  notes?: string;
}

interface CompleteVisitInput {
  feedback?: string;
  studentRating?: number;
  interestedInAdmission?: boolean;
  notes?: string;
}

interface VisitFilters {
  status?: StudentVisitStatus;
  universityId?: string;
  leadId?: string;
  arrangedById?: string;
  fromDate?: Date;
  toDate?: Date;
  page?: number;
  limit?: number;
}

export class StudentVisitService {
  /**
   * Schedule a new student visit
   */
  async schedule(input: ScheduleVisitInput) {
    // Verify lead exists
    const lead = await prisma.lead.findFirst({
      where: { id: input.leadId, organizationId: input.organizationId },
    });

    if (!lead) {
      throw new NotFoundError('Lead not found');
    }

    // Verify university exists
    const university = await prisma.university.findFirst({
      where: { id: input.universityId, organizationId: input.organizationId, isActive: true },
    });

    if (!university) {
      throw new NotFoundError('University not found or inactive');
    }

    // Check if visit already exists for this lead and university on the same date
    const existingVisit = await prisma.studentVisit.findFirst({
      where: {
        leadId: input.leadId,
        universityId: input.universityId,
        visitDate: input.visitDate,
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
    });

    if (existingVisit) {
      throw new BadRequestError('A visit is already scheduled for this lead and university on the same date');
    }

    const visit = await prisma.studentVisit.create({
      data: {
        organizationId: input.organizationId,
        leadId: input.leadId,
        universityId: input.universityId,
        visitDate: input.visitDate,
        visitTime: input.visitTime,
        arrangedById: input.arrangedById,
        accompaniedById: input.accompaniedById,
        travelArranged: input.travelArranged ?? false,
        travelExpense: input.travelExpense,
        notes: input.notes,
      },
      include: {
        lead: {
          select: { firstName: true, lastName: true, phone: true, email: true },
        },
        university: {
          select: { name: true, shortName: true, city: true },
        },
        arrangedBy: {
          select: { firstName: true, lastName: true },
        },
        accompaniedBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    // Update lead admission status
    await prisma.lead.update({
      where: { id: input.leadId },
      data: { admissionStatus: 'VISIT_SCHEDULED' },
    });

    return visit;
  }

  /**
   * Find all visits for an organization with filters
   */
  async findAll(organizationId: string, filters: VisitFilters = {}) {
    const { status, universityId, leadId, arrangedById, fromDate, toDate, page = 1, limit = 50 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.StudentVisitWhereInput = { organizationId };

    if (status) {
      where.status = status;
    }

    if (universityId) {
      where.universityId = universityId;
    }

    if (leadId) {
      where.leadId = leadId;
    }

    if (arrangedById) {
      where.arrangedById = arrangedById;
    }

    if (fromDate || toDate) {
      where.visitDate = {};
      if (fromDate) where.visitDate.gte = fromDate;
      if (toDate) where.visitDate.lte = toDate;
    }

    const [visits, total] = await Promise.all([
      prisma.studentVisit.findMany({
        where,
        include: {
          lead: {
            select: { firstName: true, lastName: true, phone: true, email: true },
          },
          university: {
            select: { name: true, shortName: true, city: true },
          },
          arrangedBy: {
            select: { firstName: true, lastName: true },
          },
          accompaniedBy: {
            select: { firstName: true, lastName: true },
          },
        },
        orderBy: { visitDate: 'desc' },
        skip,
        take: limit,
      }),
      prisma.studentVisit.count({ where }),
    ]);

    return {
      visits,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find a visit by ID
   */
  async findById(id: string, organizationId: string) {
    const visit = await prisma.studentVisit.findFirst({
      where: { id, organizationId },
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            admissionStatus: true,
          },
        },
        university: {
          select: {
            id: true,
            name: true,
            shortName: true,
            city: true,
            state: true,
            defaultCommissionPercent: true,
          },
        },
        arrangedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        accompaniedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!visit) {
      throw new NotFoundError('Visit not found');
    }

    return visit;
  }

  /**
   * Update a visit
   */
  async update(id: string, organizationId: string, data: UpdateVisitInput) {
    const existing = await prisma.studentVisit.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundError('Visit not found');
    }

    if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED') {
      throw new BadRequestError('Cannot update a completed or cancelled visit');
    }

    const visit = await prisma.studentVisit.update({
      where: { id },
      data,
      include: {
        lead: {
          select: { firstName: true, lastName: true, phone: true },
        },
        university: {
          select: { name: true, shortName: true, city: true },
        },
        arrangedBy: {
          select: { firstName: true, lastName: true },
        },
        accompaniedBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    return visit;
  }

  /**
   * Confirm a visit
   */
  async confirm(id: string, organizationId: string) {
    const visit = await prisma.studentVisit.findFirst({
      where: { id, organizationId },
    });

    if (!visit) {
      throw new NotFoundError('Visit not found');
    }

    if (visit.status !== 'SCHEDULED') {
      throw new BadRequestError('Only scheduled visits can be confirmed');
    }

    return prisma.studentVisit.update({
      where: { id },
      data: { status: 'CONFIRMED' },
    });
  }

  /**
   * Complete a visit with feedback
   */
  async complete(id: string, organizationId: string, input: CompleteVisitInput) {
    const visit = await prisma.studentVisit.findFirst({
      where: { id, organizationId },
      include: { lead: true },
    });

    if (!visit) {
      throw new NotFoundError('Visit not found');
    }

    if (visit.status === 'COMPLETED' || visit.status === 'CANCELLED') {
      throw new BadRequestError('Visit is already completed or cancelled');
    }

    const [updatedVisit] = await Promise.all([
      prisma.studentVisit.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          feedback: input.feedback,
          studentRating: input.studentRating,
          interestedInAdmission: input.interestedInAdmission,
          notes: input.notes,
        },
        include: {
          lead: {
            select: { firstName: true, lastName: true, phone: true },
          },
          university: {
            select: { name: true, shortName: true },
          },
        },
      }),
      // Update lead admission status
      prisma.lead.update({
        where: { id: visit.leadId },
        data: {
          admissionStatus: input.interestedInAdmission ? 'DOCUMENTS_PENDING' : 'VISIT_COMPLETED',
        },
      }),
    ]);

    return updatedVisit;
  }

  /**
   * Cancel a visit
   */
  async cancel(id: string, organizationId: string, reason?: string) {
    const visit = await prisma.studentVisit.findFirst({
      where: { id, organizationId },
    });

    if (!visit) {
      throw new NotFoundError('Visit not found');
    }

    if (visit.status === 'COMPLETED') {
      throw new BadRequestError('Cannot cancel a completed visit');
    }

    return prisma.studentVisit.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        notes: reason ? `Cancelled: ${reason}` : visit.notes,
      },
    });
  }

  /**
   * Mark visit as no-show
   */
  async markNoShow(id: string, organizationId: string, notes?: string) {
    const visit = await prisma.studentVisit.findFirst({
      where: { id, organizationId },
    });

    if (!visit) {
      throw new NotFoundError('Visit not found');
    }

    if (visit.status === 'COMPLETED' || visit.status === 'CANCELLED') {
      throw new BadRequestError('Cannot mark a completed or cancelled visit as no-show');
    }

    return prisma.studentVisit.update({
      where: { id },
      data: {
        status: 'NO_SHOW',
        notes: notes || visit.notes,
      },
    });
  }

  /**
   * Get upcoming visits for today
   */
  async getUpcomingToday(organizationId: string, userId?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const where: Prisma.StudentVisitWhereInput = {
      organizationId,
      visitDate: { gte: today, lt: tomorrow },
      status: { in: ['SCHEDULED', 'CONFIRMED'] },
    };

    if (userId) {
      where.OR = [
        { arrangedById: userId },
        { accompaniedById: userId },
      ];
    }

    return prisma.studentVisit.findMany({
      where,
      include: {
        lead: {
          select: { firstName: true, lastName: true, phone: true },
        },
        university: {
          select: { name: true, shortName: true, city: true },
        },
      },
      orderBy: { visitDate: 'asc' },
    });
  }

  /**
   * Get visit statistics
   */
  async getStats(organizationId: string, dateRange?: { from: Date; to: Date }) {
    const dateFilter = dateRange
      ? { gte: dateRange.from, lte: dateRange.to }
      : undefined;

    const where: Prisma.StudentVisitWhereInput = {
      organizationId,
      ...(dateFilter && { visitDate: dateFilter }),
    };

    const [total, byStatus, byUniversity] = await Promise.all([
      prisma.studentVisit.count({ where }),
      prisma.studentVisit.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      prisma.studentVisit.groupBy({
        by: ['universityId'],
        where,
        _count: true,
      }),
    ]);

    // Get university names
    const universityIds = byUniversity.map((u) => u.universityId);
    const universities = await prisma.university.findMany({
      where: { id: { in: universityIds } },
      select: { id: true, name: true, shortName: true },
    });

    const universityMap = new Map(universities.map((u) => [u.id, u]));

    return {
      total,
      byStatus: byStatus.map((s) => ({
        status: s.status,
        count: s._count,
      })),
      byUniversity: byUniversity.map((u) => ({
        university: universityMap.get(u.universityId),
        count: u._count,
      })),
    };
  }
}

export const studentVisitService = new StudentVisitService();
