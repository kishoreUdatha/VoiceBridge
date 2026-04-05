import { prisma } from '../config/database';
import { Prisma } from '@prisma/client';
import { NotFoundError, BadRequestError } from '../utils/errors';

interface CreateUniversityInput {
  organizationId: string;
  name: string;
  shortName?: string;
  type?: string;
  city?: string;
  state?: string;
  website?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  defaultCommissionPercent?: number;
  donationCommissionPercent?: number;
}

interface UpdateUniversityInput {
  name?: string;
  shortName?: string;
  type?: string;
  city?: string;
  state?: string;
  website?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  defaultCommissionPercent?: number;
  donationCommissionPercent?: number;
  isActive?: boolean;
}

interface UniversityFilters {
  search?: string;
  type?: string;
  state?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export class UniversityService {
  /**
   * Create a new university
   */
  async create(input: CreateUniversityInput) {
    const university = await prisma.university.create({
      data: {
        organizationId: input.organizationId,
        name: input.name,
        shortName: input.shortName,
        type: input.type,
        city: input.city,
        state: input.state,
        website: input.website,
        contactPerson: input.contactPerson,
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail,
        defaultCommissionPercent: input.defaultCommissionPercent,
        donationCommissionPercent: input.donationCommissionPercent,
      },
    });

    return university;
  }

  /**
   * Find all universities for an organization with filters
   */
  async findAll(organizationId: string, filters: UniversityFilters = {}) {
    const { search, type, state, isActive, page = 1, limit = 50 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.UniversityWhereInput = { organizationId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { shortName: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (type) {
      where.type = type;
    }

    if (state) {
      where.state = state;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [universities, total] = await Promise.all([
      prisma.university.findMany({
        where,
        include: {
          _count: {
            select: {
              studentVisits: true,
              admissions: true,
            },
          },
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      prisma.university.count({ where }),
    ]);

    return {
      universities,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find a university by ID
   */
  async findById(id: string, organizationId: string) {
    const university = await prisma.university.findFirst({
      where: { id, organizationId },
      include: {
        _count: {
          select: {
            studentVisits: true,
            admissions: true,
          },
        },
      },
    });

    if (!university) {
      throw new NotFoundError('University not found');
    }

    return university;
  }

  /**
   * Update a university
   */
  async update(id: string, organizationId: string, data: UpdateUniversityInput) {
    const existing = await prisma.university.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundError('University not found');
    }

    const university = await prisma.university.update({
      where: { id },
      data,
    });

    return university;
  }

  /**
   * Delete a university (soft delete)
   */
  async delete(id: string, organizationId: string) {
    const university = await prisma.university.findFirst({
      where: { id, organizationId },
      include: {
        _count: {
          select: { admissions: true },
        },
      },
    });

    if (!university) {
      throw new NotFoundError('University not found');
    }

    if (university._count.admissions > 0) {
      throw new BadRequestError(
        `Cannot delete university with ${university._count.admissions} admissions. Deactivate instead.`
      );
    }

    await prisma.university.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Get university performance statistics
   */
  async getStats(id: string, organizationId: string, dateRange?: { from: Date; to: Date }) {
    const university = await prisma.university.findFirst({
      where: { id, organizationId },
    });

    if (!university) {
      throw new NotFoundError('University not found');
    }

    const dateFilter = dateRange
      ? { gte: dateRange.from, lte: dateRange.to }
      : undefined;

    const [totalAdmissions, totalVisits, admissionsByType, recentAdmissions] = await Promise.all([
      prisma.admission.count({
        where: {
          universityId: id,
          organizationId,
          ...(dateFilter && { closedAt: dateFilter }),
        },
      }),
      prisma.studentVisit.count({
        where: {
          universityId: id,
          organizationId,
          ...(dateFilter && { visitDate: dateFilter }),
        },
      }),
      prisma.admission.groupBy({
        by: ['admissionType'],
        where: {
          universityId: id,
          organizationId,
          ...(dateFilter && { closedAt: dateFilter }),
        },
        _count: true,
        _sum: {
          totalFee: true,
          commissionAmount: true,
        },
      }),
      prisma.admission.findMany({
        where: {
          universityId: id,
          organizationId,
        },
        include: {
          lead: {
            select: { firstName: true, lastName: true, phone: true },
          },
        },
        orderBy: { closedAt: 'desc' },
        take: 10,
      }),
    ]);

    // Calculate revenue
    const totalRevenue = admissionsByType.reduce(
      (sum, item) => sum + (Number(item._sum.totalFee) || 0),
      0
    );
    const totalCommission = admissionsByType.reduce(
      (sum, item) => sum + (Number(item._sum.commissionAmount) || 0),
      0
    );

    return {
      totalAdmissions,
      totalVisits,
      totalRevenue,
      totalCommission,
      conversionRate: totalVisits > 0 ? (totalAdmissions / totalVisits) * 100 : 0,
      admissionsByType,
      recentAdmissions,
    };
  }

  /**
   * Get all university types
   */
  async getTypes(organizationId: string) {
    const types = await prisma.university.findMany({
      where: { organizationId, type: { not: null } },
      select: { type: true },
      distinct: ['type'],
    });

    return types.map((t) => t.type).filter(Boolean);
  }

  /**
   * Get all states with universities
   */
  async getStates(organizationId: string) {
    const states = await prisma.university.findMany({
      where: { organizationId, state: { not: null } },
      select: { state: true },
      distinct: ['state'],
    });

    return states.map((s) => s.state).filter(Boolean);
  }
}

export const universityService = new UniversityService();
