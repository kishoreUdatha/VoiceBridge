import { prisma } from '../../config/database';
import {
  CollegeType,
  InstitutionStatus,
  CollegeCategory,
  CollegeStatus,
  Prisma,
} from '@prisma/client';
import { BadRequestError, NotFoundError } from '../../utils/errors';
import { getAllStates, getDistrictsByState } from '../../data/indianLocations';

interface CollegeFilter {
  organizationId: string;
  assignedToId?: string;
  city?: string;
  district?: string;
  state?: string;
  collegeType?: CollegeType;
  institutionStatus?: InstitutionStatus;
  category?: CollegeCategory;
  status?: CollegeStatus;
  search?: string;
}

interface CreateCollegeData {
  organizationId: string;
  name: string;
  shortName?: string;
  collegeType: CollegeType;
  institutionStatus: InstitutionStatus;
  category?: CollegeCategory;
  address: string;
  city: string;
  district?: string;
  state: string;
  pincode?: string;
  googleMapsUrl?: string;
  latitude?: number;
  longitude?: number;
  studentStrength?: number;
  annualIntake?: number;
  coursesOffered?: string[];
  establishedYear?: number;
  phone?: string;
  email?: string;
  website?: string;
  assignedToId: string;
  secondaryAssigneeId?: string;
  leadSource?: string;
  notes?: string;
}

interface UpdateCollegeData extends Partial<CreateCollegeData> {
  status?: CollegeStatus;
  nextFollowUpDate?: Date;
}

export class CollegeService {
  // ==================== CRUD OPERATIONS ====================

  async createCollege(data: CreateCollegeData) {
    // Verify assigned user belongs to organization
    const assignedUser = await prisma.user.findFirst({
      where: { id: data.assignedToId, organizationId: data.organizationId, isActive: true },
    });

    if (!assignedUser) {
      throw new BadRequestError('Assigned user not found or inactive');
    }

    // Verify secondary assignee if provided
    if (data.secondaryAssigneeId) {
      const secondaryUser = await prisma.user.findFirst({
        where: { id: data.secondaryAssigneeId, organizationId: data.organizationId, isActive: true },
      });

      if (!secondaryUser) {
        throw new BadRequestError('Secondary assignee not found or inactive');
      }
    }

    const college = await prisma.college.create({
      data: {
        ...data,
        coursesOffered: (data.coursesOffered || []) as Prisma.InputJsonValue,
        category: data.category || 'WARM',
      },
      include: {
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        secondaryAssignee: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        _count: {
          select: { contacts: true, visits: true },
        },
      },
    });

    return college;
  }

  async getColleges(
    filter: CollegeFilter,
    page: number = 1,
    limit: number = 20,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ) {
    const skip = (page - 1) * limit;

    const where: Prisma.CollegeWhereInput = {
      organizationId: filter.organizationId,
      status: filter.status || 'ACTIVE',
    };

    if (filter.assignedToId) {
      where.OR = [
        { assignedToId: filter.assignedToId },
        { secondaryAssigneeId: filter.assignedToId },
      ];
    }
    if (filter.city) where.city = { contains: filter.city, mode: 'insensitive' };
    if (filter.district) where.district = filter.district;
    if (filter.state) where.state = filter.state;
    if (filter.collegeType) where.collegeType = filter.collegeType;
    if (filter.institutionStatus) where.institutionStatus = filter.institutionStatus;
    if (filter.category) where.category = filter.category;

    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { shortName: { contains: filter.search, mode: 'insensitive' } },
        { city: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.CollegeOrderByWithRelationInput = {};
    orderBy[sortBy as keyof Prisma.CollegeOrderByWithRelationInput] = sortOrder;

    const [colleges, total] = await Promise.all([
      prisma.college.findMany({
        where,
        include: {
          assignedTo: {
            select: { id: true, firstName: true, lastName: true },
          },
          deals: {
            select: { id: true, stage: true, dealValue: true },
            take: 1,
          },
          _count: {
            select: { contacts: true, visits: true },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.college.count({ where }),
    ]);

    return { colleges, total };
  }

  async getCollegeById(id: string, organizationId: string) {
    const college = await prisma.college.findFirst({
      where: { id, organizationId },
      include: {
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
        secondaryAssignee: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        contacts: {
          orderBy: { isPrimary: 'desc' },
        },
        deals: true,
        visits: {
          orderBy: { visitDate: 'desc' },
          take: 10,
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        expenses: {
          orderBy: { expenseDate: 'desc' },
          take: 10,
        },
        competitors: true,
        _count: {
          select: { contacts: true, visits: true, expenses: true },
        },
      },
    });

    if (!college) {
      throw new NotFoundError('College not found');
    }

    return college;
  }

  async updateCollege(id: string, organizationId: string, data: UpdateCollegeData) {
    const college = await prisma.college.findFirst({
      where: { id, organizationId },
    });

    if (!college) {
      throw new NotFoundError('College not found');
    }

    // Verify assigned user if changing
    if (data.assignedToId) {
      const assignedUser = await prisma.user.findFirst({
        where: { id: data.assignedToId, organizationId, isActive: true },
      });
      if (!assignedUser) {
        throw new BadRequestError('Assigned user not found or inactive');
      }
    }

    const updateData: Prisma.CollegeUpdateInput = { ...data };
    if (data.coursesOffered) {
      updateData.coursesOffered = data.coursesOffered as Prisma.InputJsonValue;
    }

    const updated = await prisma.college.update({
      where: { id },
      data: updateData,
      include: {
        assignedTo: {
          select: { id: true, firstName: true, lastName: true },
        },
        secondaryAssignee: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return updated;
  }

  async deleteCollege(id: string, organizationId: string) {
    const college = await prisma.college.findFirst({
      where: { id, organizationId },
    });

    if (!college) {
      throw new NotFoundError('College not found');
    }

    // Soft delete by setting status to INACTIVE
    await prisma.college.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });

    return { deleted: true };
  }

  async reassignCollege(
    id: string,
    organizationId: string,
    newAssigneeId: string,
    reassignedById: string
  ) {
    const college = await prisma.college.findFirst({
      where: { id, organizationId },
    });

    if (!college) {
      throw new NotFoundError('College not found');
    }

    const newAssignee = await prisma.user.findFirst({
      where: { id: newAssigneeId, organizationId, isActive: true },
    });

    if (!newAssignee) {
      throw new BadRequestError('New assignee not found or inactive');
    }

    const updated = await prisma.college.update({
      where: { id },
      data: { assignedToId: newAssigneeId },
      include: {
        assignedTo: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return updated;
  }

  // ==================== CONTACT OPERATIONS ====================

  async addContact(collegeId: string, organizationId: string, data: {
    name: string;
    designation: string;
    department?: string;
    phone: string;
    altPhone?: string;
    email?: string;
    whatsapp?: string;
    isPrimary?: boolean;
    isDecisionMaker?: boolean;
    notes?: string;
  }) {
    // Verify college exists
    const college = await prisma.college.findFirst({
      where: { id: collegeId, organizationId },
    });

    if (!college) {
      throw new NotFoundError('College not found');
    }

    // If setting as primary, unset other primaries
    if (data.isPrimary) {
      await prisma.collegeContact.updateMany({
        where: { collegeId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const contact = await prisma.collegeContact.create({
      data: {
        collegeId,
        ...data,
      },
    });

    return contact;
  }

  async updateContact(contactId: string, collegeId: string, data: any) {
    const contact = await prisma.collegeContact.findFirst({
      where: { id: contactId, collegeId },
    });

    if (!contact) {
      throw new NotFoundError('Contact not found');
    }

    // If setting as primary, unset other primaries
    if (data.isPrimary) {
      await prisma.collegeContact.updateMany({
        where: { collegeId, isPrimary: true, id: { not: contactId } },
        data: { isPrimary: false },
      });
    }

    const updated = await prisma.collegeContact.update({
      where: { id: contactId },
      data,
    });

    return updated;
  }

  async deleteContact(contactId: string, collegeId: string) {
    const contact = await prisma.collegeContact.findFirst({
      where: { id: contactId, collegeId },
    });

    if (!contact) {
      throw new NotFoundError('Contact not found');
    }

    await prisma.collegeContact.delete({
      where: { id: contactId },
    });

    return { deleted: true };
  }

  async getContacts(collegeId: string) {
    return prisma.collegeContact.findMany({
      where: { collegeId },
      orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
    });
  }

  // ==================== STATISTICS ====================

  async getCollegeStats(organizationId: string, userId?: string) {
    const where: Prisma.CollegeWhereInput = {
      organizationId,
      status: 'ACTIVE',
    };

    if (userId) {
      where.OR = [
        { assignedToId: userId },
        { secondaryAssigneeId: userId },
      ];
    }

    const [
      totalColleges,
      categoryBreakdown,
      cityBreakdown,
      recentVisits,
      upcomingFollowUps,
    ] = await Promise.all([
      prisma.college.count({ where }),
      prisma.college.groupBy({
        by: ['category'],
        where,
        _count: { category: true },
      }),
      prisma.college.groupBy({
        by: ['city'],
        where,
        _count: { city: true },
        orderBy: { _count: { city: 'desc' } },
        take: 10,
      }),
      prisma.collegeVisit.count({
        where: {
          organizationId,
          visitDate: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
          ...(userId ? { userId } : {}),
        },
      }),
      prisma.college.count({
        where: {
          ...where,
          nextFollowUpDate: {
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            gte: new Date(),
          },
        },
      }),
    ]);

    return {
      totalColleges,
      categoryBreakdown: categoryBreakdown.reduce((acc, item) => {
        acc[item.category] = item._count.category;
        return acc;
      }, {} as Record<string, number>),
      cityBreakdown: cityBreakdown.map((item) => ({
        city: item.city,
        count: item._count.city,
      })),
      recentVisits,
      upcomingFollowUps,
    };
  }

  // ==================== CITIES & FILTERS ====================

  async getCities(organizationId: string, state?: string, district?: string) {
    const where: Prisma.CollegeWhereInput = {
      organizationId,
      status: 'ACTIVE',
    };

    if (state) where.state = state;
    if (district) where.district = district;

    const cities = await prisma.college.groupBy({
      by: ['city', 'state'],
      where,
      _count: { city: true },
      orderBy: { city: 'asc' },
    });

    return cities.map((c) => ({
      city: c.city,
      state: c.state,
      count: c._count.city,
    }));
  }

  async getStates(organizationId: string) {
    const states = await prisma.college.groupBy({
      by: ['state'],
      where: { organizationId, status: 'ACTIVE' },
      _count: { state: true },
      orderBy: { state: 'asc' },
    });

    return states.map((s) => ({
      state: s.state,
      count: s._count.state,
    }));
  }

  async getDistricts(organizationId: string, state?: string) {
    const where: Prisma.CollegeWhereInput = {
      organizationId,
      status: 'ACTIVE',
      district: { not: null },
    };

    if (state) where.state = state;

    const districts = await prisma.college.groupBy({
      by: ['district', 'state'],
      where,
      _count: { district: true },
      orderBy: { district: 'asc' },
    });

    return districts
      .filter((d) => d.district)
      .map((d) => ({
        district: d.district!,
        state: d.state,
        count: d._count.district,
      }));
  }

  async getFieldOfficers(organizationId: string) {
    // Get all users assigned to colleges in this org with their stats
    const usersWithColleges = await prisma.user.findMany({
      where: {
        organizationId,
        isActive: true,
        OR: [
          { assignedColleges: { some: {} } },
          { secondaryColleges: { some: {} } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        _count: {
          select: {
            assignedColleges: true,
            collegeVisits: true,
          },
        },
      },
    });

    // Get expense totals for each user
    const expenseTotals = await prisma.collegeExpense.groupBy({
      by: ['userId'],
      where: {
        organizationId,
        status: { in: ['SUBMITTED', 'APPROVED'] },
      },
      _sum: { amount: true },
    });

    const expenseMap = new Map(
      expenseTotals.map((e) => [e.userId, e._sum.amount || 0])
    );

    return usersWithColleges.map((user) => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      collegeCount: user._count.assignedColleges,
      visitCount: user._count.collegeVisits,
      totalExpenses: expenseMap.get(user.id) || 0,
    }));
  }

  // ==================== ALL INDIAN LOCATIONS (STATIC DATA) ====================

  getAllIndianStates() {
    const states = getAllStates();
    return states.map((state) => ({
      state,
    }));
  }

  getAllIndianDistricts(state: string) {
    const districts = getDistrictsByState(state);
    return districts.map((district) => ({
      district,
      state,
    }));
  }
}

export const collegeService = new CollegeService();
