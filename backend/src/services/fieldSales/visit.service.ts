import { prisma } from '../../config/database';
import { VisitPurpose, VisitOutcome, Prisma } from '@prisma/client';
import { BadRequestError, NotFoundError } from '../../utils/errors';

interface CreateVisitData {
  collegeId: string;
  organizationId: string;
  userId: string;
  visitDate: Date;
  purpose: VisitPurpose;
  summary: string;
  contactsMet?: string[];
  actionItems?: string;
  nextVisitDate?: Date;
  nextAction?: string;
}

interface CheckInData {
  collegeId: string;
  organizationId: string;
  userId: string;
  purpose: VisitPurpose;
  latitude?: number;
  longitude?: number;
  address?: string;
}

interface ContactPerson {
  name: string;
  designation?: string;
  department?: string;
  phone?: string;
  email?: string;
}

interface CheckOutData {
  visitId: string;
  outcome: VisitOutcome;
  summary: string;
  contactsMet?: string | string[];
  contactDetails?: string; // JSON string of ContactPerson[]
  actionItems?: string;
  nextVisitDate?: Date;
  nextAction?: string;
  photos?: string[];
  documents?: { name: string; url: string }[];
}

interface VisitFilter {
  organizationId: string;
  userId?: string;
  collegeId?: string;
  startDate?: Date;
  endDate?: Date;
  purpose?: VisitPurpose;
  outcome?: VisitOutcome;
}

export class VisitService {
  // ==================== CHECK-IN / CHECK-OUT ====================

  async checkIn(data: CheckInData) {
    // Verify college exists and user has access
    const college = await prisma.college.findFirst({
      where: {
        id: data.collegeId,
        organizationId: data.organizationId,
        OR: [
          { assignedToId: data.userId },
          { secondaryAssigneeId: data.userId },
        ],
      },
    });

    if (!college) {
      throw new BadRequestError('College not found or you do not have access');
    }

    // Check if user already has an open visit
    const openVisit = await prisma.collegeVisit.findFirst({
      where: {
        userId: data.userId,
        checkOutTime: null,
        checkInTime: { not: null },
      },
    });

    if (openVisit) {
      throw new BadRequestError('You have an open visit. Please check out first.');
    }

    // Calculate distance from college if coordinates provided
    let locationVerified = false;
    let distanceFromCollege: number | null = null;

    if (data.latitude && data.longitude && college.latitude && college.longitude) {
      distanceFromCollege = this.calculateDistance(
        data.latitude,
        data.longitude,
        college.latitude,
        college.longitude
      );
      // Verify if within 500 meters
      locationVerified = distanceFromCollege <= 500;
    }

    const visit = await prisma.collegeVisit.create({
      data: {
        collegeId: data.collegeId,
        organizationId: data.organizationId,
        userId: data.userId,
        visitDate: new Date(),
        checkInTime: new Date(),
        checkInLatitude: data.latitude,
        checkInLongitude: data.longitude,
        checkInAddress: data.address,
        locationVerified,
        distanceFromCollege,
        purpose: data.purpose,
        summary: '', // Will be filled on check-out
      },
      include: {
        college: {
          select: { id: true, name: true, city: true },
        },
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Update college last visit date
    await prisma.college.update({
      where: { id: data.collegeId },
      data: { lastVisitDate: new Date() },
    });

    return visit;
  }

  async checkOut(data: CheckOutData) {
    const visit = await prisma.collegeVisit.findUnique({
      where: { id: data.visitId },
      include: { college: true },
    });

    if (!visit) {
      throw new NotFoundError('Visit not found');
    }

    if (visit.checkOutTime) {
      throw new BadRequestError('Visit already checked out');
    }

    const checkOutTime = new Date();
    const duration = visit.checkInTime
      ? Math.round((checkOutTime.getTime() - visit.checkInTime.getTime()) / 60000) // minutes
      : null;

    const updated = await prisma.collegeVisit.update({
      where: { id: data.visitId },
      data: {
        checkOutTime,
        duration,
        outcome: data.outcome,
        summary: data.summary,
        contactsMet: (data.contactsMet || []) as Prisma.InputJsonValue,
        actionItems: data.actionItems,
        nextVisitDate: data.nextVisitDate,
        nextAction: data.nextAction,
        photos: (data.photos || []) as Prisma.InputJsonValue,
        documents: (data.documents || []) as Prisma.InputJsonValue,
      },
      include: {
        college: {
          select: { id: true, name: true, city: true },
        },
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Update college next follow-up if set
    if (data.nextVisitDate) {
      await prisma.college.update({
        where: { id: visit.collegeId },
        data: { nextFollowUpDate: data.nextVisitDate },
      });
    }

    // Add contacts to college's contact list from contactDetails JSON
    if (data.contactDetails) {
      try {
        const contacts: ContactPerson[] = JSON.parse(data.contactDetails);
        for (const contact of contacts) {
          if (contact.name && contact.name.trim()) {
            // Check if contact already exists (by name and college)
            const existingContact = await prisma.collegeContact.findFirst({
              where: {
                collegeId: visit.collegeId,
                name: contact.name,
              },
            });

            if (!existingContact) {
              // Create new contact for the college
              await prisma.collegeContact.create({
                data: {
                  collegeId: visit.collegeId,
                  name: contact.name,
                  designation: contact.designation || null,
                  department: contact.department || null,
                  phone: contact.phone || null,
                  email: contact.email || null,
                  isPrimary: false,
                  isDecisionMaker: false,
                },
              });
            } else {
              // Update existing contact with new info if provided
              await prisma.collegeContact.update({
                where: { id: existingContact.id },
                data: {
                  designation: contact.designation || existingContact.designation,
                  department: contact.department || existingContact.department,
                  phone: contact.phone || existingContact.phone,
                  email: contact.email || existingContact.email,
                },
              });
            }
          }
        }
      } catch (e) {
        console.error('Failed to parse contactDetails:', e);
      }
    }

    return updated;
  }

  // ==================== CRUD OPERATIONS ====================

  async createVisit(data: CreateVisitData) {
    // Verify college exists
    const college = await prisma.college.findFirst({
      where: { id: data.collegeId, organizationId: data.organizationId },
    });

    if (!college) {
      throw new NotFoundError('College not found');
    }

    const visit = await prisma.collegeVisit.create({
      data: {
        ...data,
        contactsMet: (data.contactsMet || []) as Prisma.InputJsonValue,
      },
      include: {
        college: {
          select: { id: true, name: true, city: true },
        },
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Update college last visit date
    await prisma.college.update({
      where: { id: data.collegeId },
      data: { lastVisitDate: data.visitDate },
    });

    return visit;
  }

  async getVisits(
    filter: VisitFilter,
    page: number = 1,
    limit: number = 20
  ) {
    const skip = (page - 1) * limit;

    const where: Prisma.CollegeVisitWhereInput = {
      organizationId: filter.organizationId,
    };

    if (filter.userId) where.userId = filter.userId;
    if (filter.collegeId) where.collegeId = filter.collegeId;
    if (filter.purpose) where.purpose = filter.purpose;
    if (filter.outcome) where.outcome = filter.outcome;

    if (filter.startDate || filter.endDate) {
      where.visitDate = {};
      if (filter.startDate) where.visitDate.gte = filter.startDate;
      if (filter.endDate) where.visitDate.lte = filter.endDate;
    }

    const [visits, total] = await Promise.all([
      prisma.collegeVisit.findMany({
        where,
        include: {
          college: {
            select: { id: true, name: true, city: true },
          },
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { visitDate: 'desc' },
        skip,
        take: limit,
      }),
      prisma.collegeVisit.count({ where }),
    ]);

    return { visits, total };
  }

  async getVisitById(id: string, organizationId: string) {
    const visit = await prisma.collegeVisit.findFirst({
      where: { id, organizationId },
      include: {
        college: {
          select: { id: true, name: true, city: true, address: true },
        },
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
        expenses: {
          orderBy: { expenseDate: 'desc' },
        },
      },
    });

    if (!visit) {
      throw new NotFoundError('Visit not found');
    }

    return visit;
  }

  async updateVisit(id: string, organizationId: string, data: Partial<CheckOutData>) {
    const visit = await prisma.collegeVisit.findFirst({
      where: { id, organizationId },
    });

    if (!visit) {
      throw new NotFoundError('Visit not found');
    }

    const updateData: any = { ...data };
    if (data.contactsMet) {
      updateData.contactsMet = data.contactsMet as Prisma.InputJsonValue;
    }
    if (data.photos) {
      updateData.photos = data.photos as Prisma.InputJsonValue;
    }
    if (data.documents) {
      updateData.documents = data.documents as Prisma.InputJsonValue;
    }

    const updated = await prisma.collegeVisit.update({
      where: { id },
      data: updateData,
      include: {
        college: {
          select: { id: true, name: true, city: true },
        },
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return updated;
  }

  async deleteVisit(id: string, organizationId: string) {
    const visit = await prisma.collegeVisit.findFirst({
      where: { id, organizationId },
    });

    if (!visit) {
      throw new NotFoundError('Visit not found');
    }

    await prisma.collegeVisit.delete({
      where: { id },
    });

    return { deleted: true };
  }

  // ==================== OPEN VISITS ====================

  async getOpenVisit(userId: string) {
    return prisma.collegeVisit.findFirst({
      where: {
        userId,
        checkInTime: { not: null },
        checkOutTime: null,
      },
      include: {
        college: {
          select: { id: true, name: true, city: true, address: true },
        },
      },
    });
  }

  // ==================== STATISTICS ====================

  async getVisitStats(organizationId: string, userId?: string, startDate?: Date, endDate?: Date) {
    const where: Prisma.CollegeVisitWhereInput = {
      organizationId,
    };

    if (userId) where.userId = userId;
    if (startDate || endDate) {
      where.visitDate = {};
      if (startDate) where.visitDate.gte = startDate;
      if (endDate) where.visitDate.lte = endDate;
    }

    const [
      totalVisits,
      outcomeBreakdown,
      purposeBreakdown,
      recentVisits,
    ] = await Promise.all([
      prisma.collegeVisit.count({ where }),
      prisma.collegeVisit.groupBy({
        by: ['outcome'],
        where: { ...where, outcome: { not: null } },
        _count: { outcome: true },
      }),
      prisma.collegeVisit.groupBy({
        by: ['purpose'],
        where,
        _count: { purpose: true },
      }),
      // Get recent visits and group by day in application code instead of raw SQL
      prisma.collegeVisit.findMany({
        where,
        select: { visitDate: true },
        orderBy: { visitDate: 'desc' },
        take: 500, // Get last 500 visits to compute daily counts
      }),
    ]);

    // Group visits by day in application code
    const visitCountsByDay = new Map<string, number>();
    for (const visit of recentVisits) {
      const dateKey = visit.visitDate.toISOString().split('T')[0];
      visitCountsByDay.set(dateKey, (visitCountsByDay.get(dateKey) || 0) + 1);
    }

    // Convert to array and take last 30 days
    const visitsByDay = Array.from(visitCountsByDay.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 30)
      .map(([date, count]) => ({ date: new Date(date), count }));

    return {
      totalVisits,
      outcomeBreakdown: outcomeBreakdown.reduce((acc, item) => {
        if (item.outcome) acc[item.outcome] = item._count.outcome;
        return acc;
      }, {} as Record<string, number>),
      purposeBreakdown: purposeBreakdown.reduce((acc, item) => {
        acc[item.purpose] = item._count.purpose;
        return acc;
      }, {} as Record<string, number>),
      visitsByDay,
    };
  }

  // ==================== TODAY'S SCHEDULE ====================

  async getTodaySchedule(userId: string, organizationId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get scheduled visits for today
    const scheduledVisits = await prisma.college.findMany({
      where: {
        organizationId,
        OR: [
          { assignedToId: userId },
          { secondaryAssigneeId: userId },
        ],
        nextFollowUpDate: {
          gte: today,
          lt: tomorrow,
        },
      },
      select: {
        id: true,
        name: true,
        city: true,
        address: true,
        nextFollowUpDate: true,
        contacts: {
          where: { isPrimary: true },
          take: 1,
        },
      },
    });

    // Get completed visits today
    const completedVisits = await prisma.collegeVisit.findMany({
      where: {
        userId,
        visitDate: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        college: {
          select: { id: true, name: true, city: true },
        },
      },
    });

    // Get open visit
    const openVisit = await this.getOpenVisit(userId);

    return {
      scheduledVisits,
      completedVisits,
      openVisit,
      totalScheduled: scheduledVisits.length,
      totalCompleted: completedVisits.length,
    };
  }

  // ==================== HELPER METHODS ====================

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    // Haversine formula to calculate distance in meters
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}

export const visitService = new VisitService();
