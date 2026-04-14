import { PrismaClient, ScholarshipType, ScholarshipStatus } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateScholarshipDto {
  name: string;
  type: ScholarshipType;
  amount?: number;
  percentage?: number;
  eligibility: string;
  description?: string;
  maxRecipients?: number;
  academicYear?: string;
}

export interface CreateRecipientDto {
  scholarshipId: string;
  leadId?: string;
  studentName: string;
  studentId: string;
  course: string;
  amount: number;
  awardedDate?: Date;
  remarks?: string;
}

export const scholarshipService = {
  // Get all scholarships for an organization
  async getAll(organizationId: string) {
    const scholarships = await prisma.scholarship.findMany({
      where: { organizationId },
      include: {
        recipients: true,
        _count: {
          select: { recipients: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return scholarships.map(s => ({
      ...s,
      beneficiaries: s._count.recipients,
      totalDisbursed: s.recipients
        .filter(r => r.status === 'DISBURSED')
        .reduce((sum, r) => sum + Number(r.amount), 0)
    }));
  },

  // Get scholarship by ID
  async getById(id: string, organizationId: string) {
    return prisma.scholarship.findFirst({
      where: { id, organizationId },
      include: {
        recipients: {
          include: {
            lead: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true
              }
            }
          },
          orderBy: { awardedDate: 'desc' }
        }
      }
    });
  },

  // Create a new scholarship
  async create(organizationId: string, data: CreateScholarshipDto) {
    return prisma.scholarship.create({
      data: {
        organizationId,
        name: data.name,
        type: data.type,
        amount: data.amount,
        percentage: data.percentage,
        eligibility: data.eligibility,
        description: data.description,
        maxRecipients: data.maxRecipients,
        academicYear: data.academicYear
      }
    });
  },

  // Update a scholarship
  async update(id: string, organizationId: string, data: Partial<CreateScholarshipDto> & { isActive?: boolean }) {
    return prisma.scholarship.update({
      where: { id },
      data
    });
  },

  // Delete a scholarship
  async delete(id: string, organizationId: string) {
    return prisma.scholarship.delete({
      where: { id }
    });
  },

  // Get all recipients for an organization
  async getAllRecipients(organizationId: string) {
    return prisma.scholarshipRecipient.findMany({
      where: {
        scholarship: { organizationId }
      },
      include: {
        scholarship: {
          select: { name: true, type: true }
        },
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { awardedDate: 'desc' }
    });
  },

  // Add a recipient to a scholarship
  async addRecipient(organizationId: string, data: CreateRecipientDto) {
    // Verify scholarship belongs to organization
    const scholarship = await prisma.scholarship.findFirst({
      where: { id: data.scholarshipId, organizationId }
    });

    if (!scholarship) {
      throw new Error('Scholarship not found');
    }

    return prisma.scholarshipRecipient.create({
      data: {
        scholarshipId: data.scholarshipId,
        leadId: data.leadId,
        studentName: data.studentName,
        studentId: data.studentId,
        course: data.course,
        amount: data.amount,
        awardedDate: data.awardedDate || new Date(),
        remarks: data.remarks
      }
    });
  },

  // Update recipient status
  async updateRecipientStatus(id: string, organizationId: string, status: ScholarshipStatus, disbursedDate?: Date) {
    const recipient = await prisma.scholarshipRecipient.findFirst({
      where: { id },
      include: { scholarship: true }
    });

    if (!recipient || recipient.scholarship.organizationId !== organizationId) {
      throw new Error('Recipient not found');
    }

    return prisma.scholarshipRecipient.update({
      where: { id },
      data: {
        status,
        disbursedDate: status === 'DISBURSED' ? (disbursedDate || new Date()) : undefined
      }
    });
  },

  // Delete a recipient
  async deleteRecipient(id: string, organizationId: string) {
    const recipient = await prisma.scholarshipRecipient.findFirst({
      where: { id },
      include: { scholarship: true }
    });

    if (!recipient || recipient.scholarship.organizationId !== organizationId) {
      throw new Error('Recipient not found');
    }

    return prisma.scholarshipRecipient.delete({
      where: { id }
    });
  },

  // Get statistics
  async getStats(organizationId: string) {
    const scholarships = await prisma.scholarship.findMany({
      where: { organizationId },
      include: {
        recipients: true
      }
    });

    const totalScholarships = scholarships.length;
    const activeScholarships = scholarships.filter(s => s.isActive).length;

    let totalBeneficiaries = 0;
    let totalDisbursed = 0;
    let pendingApplications = 0;

    scholarships.forEach(s => {
      s.recipients.forEach(r => {
        totalBeneficiaries++;
        if (r.status === 'DISBURSED') {
          totalDisbursed += Number(r.amount);
        }
        if (r.status === 'PENDING') {
          pendingApplications++;
        }
      });
    });

    return {
      totalScholarships,
      activeScholarships,
      totalBeneficiaries,
      totalDisbursed,
      pendingApplications
    };
  }
};
