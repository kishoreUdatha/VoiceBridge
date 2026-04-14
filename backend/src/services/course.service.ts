import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateCourseDto {
  name: string;
  code: string;
  department: string;
  duration?: string;
  fee: number;
  seats?: number;
  description?: string;
  eligibility?: string;
}

export const courseService = {
  // Get all courses for an organization
  async getAll(organizationId: string) {
    return prisma.course.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' }
    });
  },

  // Get course by ID
  async getById(id: string, organizationId: string) {
    return prisma.course.findFirst({
      where: { id, organizationId }
    });
  },

  // Create a new course
  async create(organizationId: string, data: CreateCourseDto) {
    return prisma.course.create({
      data: {
        organizationId,
        name: data.name,
        code: data.code.toUpperCase(),
        department: data.department,
        duration: data.duration,
        fee: data.fee,
        seats: data.seats || 0,
        description: data.description,
        eligibility: data.eligibility
      }
    });
  },

  // Update a course
  async update(id: string, organizationId: string, data: Partial<CreateCourseDto> & { isActive?: boolean; enrolledCount?: number }) {
    // Verify course belongs to organization
    const course = await prisma.course.findFirst({
      where: { id, organizationId }
    });

    if (!course) {
      throw new Error('Course not found');
    }

    return prisma.course.update({
      where: { id },
      data: {
        ...data,
        code: data.code?.toUpperCase()
      }
    });
  },

  // Delete a course
  async delete(id: string, organizationId: string) {
    const course = await prisma.course.findFirst({
      where: { id, organizationId }
    });

    if (!course) {
      throw new Error('Course not found');
    }

    return prisma.course.delete({
      where: { id }
    });
  },

  // Get statistics
  async getStats(organizationId: string) {
    const courses = await prisma.course.findMany({
      where: { organizationId }
    });

    const totalCourses = courses.length;
    const activeCourses = courses.filter(c => c.isActive).length;
    const totalSeats = courses.reduce((sum, c) => sum + c.seats, 0);
    const totalEnrolled = courses.reduce((sum, c) => sum + c.enrolledCount, 0);
    const departments = [...new Set(courses.map(c => c.department))].length;

    return {
      totalCourses,
      activeCourses,
      totalSeats,
      totalEnrolled,
      departments,
      availableSeats: totalSeats - totalEnrolled
    };
  },

  // Update enrolled count
  async updateEnrollment(id: string, organizationId: string, increment: number) {
    const course = await prisma.course.findFirst({
      where: { id, organizationId }
    });

    if (!course) {
      throw new Error('Course not found');
    }

    const newCount = course.enrolledCount + increment;
    if (newCount < 0) {
      throw new Error('Enrolled count cannot be negative');
    }

    return prisma.course.update({
      where: { id },
      data: { enrolledCount: newCount }
    });
  }
};
