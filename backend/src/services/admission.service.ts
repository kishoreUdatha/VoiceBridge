import { prisma } from '../config/database';
import { Prisma, AdmissionType } from '@prisma/client';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { admissionNotificationService } from './admission-notification.service';

interface CreateAdmissionInput {
  organizationId: string;
  leadId: string;
  universityId?: string;
  universityName?: string;
  courseName?: string;
  branch?: string;
  academicYear: string;
  admissionType: AdmissionType;
  totalFee: number;
  donationAmount?: number;
  commissionPercent: number;
  closedById: string;
}

interface RecordPaymentInput {
  amount: number;
  paymentType: string;
  paymentMode?: string;
  referenceNumber?: string;
  receivedById?: string;
  notes?: string;
  receiptUrl?: string;
}

interface AdmissionFilters {
  universityId?: string;
  admissionType?: AdmissionType;
  paymentStatus?: string;
  commissionStatus?: string;
  academicYear?: string;
  closedById?: string;
  branchId?: string;
  fromDate?: Date;
  toDate?: Date;
  search?: string;
  page?: number;
  limit?: number;
}

export class AdmissionService {
  /**
   * Generate unique admission number per organization
   * Each tenant has their own sequence: ADM-2026-00001, ADM-2026-00002, etc.
   */
  private async generateAdmissionNumber(organizationId: string, academicYear: string): Promise<string> {
    const yearPart = academicYear.replace('-', '').substring(0, 4);

    // Get the last admission number for this organization and academic year
    const lastAdmission = await prisma.admission.findFirst({
      where: {
        organizationId,
        admissionNumber: {
          startsWith: `ADM-${yearPart}-`,
        },
      },
      orderBy: { admissionNumber: 'desc' },
      select: { admissionNumber: true },
    });

    let nextSequence = 1;
    if (lastAdmission) {
      // Extract sequence number from last admission (e.g., "ADM-2026-00001" -> 1)
      const lastSequence = parseInt(lastAdmission.admissionNumber.split('-')[2], 10);
      nextSequence = lastSequence + 1;
    }

    const sequenceNumber = nextSequence.toString().padStart(5, '0');
    return `ADM-${yearPart}-${sequenceNumber}`;
  }

  /**
   * Create commission records for telecaller, team lead, and manager
   * based on fixed amounts configured per admission type.
   *
   * Commission is assigned based on the LEAD's assigned user hierarchy,
   * not who closes the admission. This ensures telecallers who sourced
   * the lead get their commission even if a manager closes the admission.
   */
  private async createCommissions(
    organizationId: string,
    admissionId: string,
    leadId: string,
    closedById: string,
    admissionType: AdmissionType,
    baseValue: number
  ): Promise<void> {
    // Get commission config for this admission type
    const config = await prisma.commissionConfig.findUnique({
      where: {
        organizationId_admissionType: {
          organizationId,
          admissionType,
        },
      },
    });

    if (!config) {
      console.log('[AdmissionService] No commission config found for admission type:', admissionType);
      console.log('[AdmissionService] To enable commissions, go to Settings → Commission and configure amounts');
      return;
    }

    // Check if any commission amounts are configured (all zeros means no commissions)
    const telecallerAmt = Number(config.telecallerAmount) || 0;
    const teamLeadAmt = Number(config.teamLeadAmount) || 0;
    const managerAmt = Number(config.managerAmount) || 0;
    if (telecallerAmt === 0 && teamLeadAmt === 0 && managerAmt === 0) {
      console.log('[AdmissionService] Commission config exists but all amounts are ₹0 for:', admissionType);
      console.log('[AdmissionService] To enable commissions, go to Settings → Commission and set amounts > 0');
      return;
    }

    // Get the lead to find the assigned telecaller/counselor
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        assignments: {
          where: { isActive: true },
          orderBy: { assignedAt: 'desc' },
          take: 1,
          select: {
            assignedToId: true,
            assignedTo: {
              select: {
                id: true,
                managerId: true,
                role: { select: { slug: true } },
              },
            },
          },
        },
      },
    });

    const commissionsToCreate: Array<{
      organizationId: string;
      userId: string;
      leadId: string;
      admissionId: string;
      amount: number;
      rate: number;
      baseValue: number;
      status: 'PENDING';
      notes: string;
    }> = [];

    // Track who already got commission to avoid duplicates
    const commissionedUserIds = new Set<string>();

    // Get the assigned telecaller/counselor from lead assignments
    const assignedUser = lead?.assignments?.[0]?.assignedTo;
    const assignedUserRole = assignedUser?.role?.slug?.toLowerCase() || '';

    // 1. Telecaller Commission - goes to lead's assigned telecaller/counselor
    if (assignedUser && ['telecaller', 'counselor'].includes(assignedUserRole)) {
      const telecallerAmount = Number(config.telecallerAmount) || 0;
      if (telecallerAmount > 0) {
        commissionsToCreate.push({
          organizationId,
          userId: assignedUser.id,
          leadId,
          admissionId,
          amount: telecallerAmount,
          rate: 0,
          baseValue,
          status: 'PENDING',
          notes: 'Telecaller commission (lead assigned)',
        });
        commissionedUserIds.add(assignedUser.id);
        console.log(`[AdmissionService] Telecaller commission for ${assignedUser.id}`);

        // 2. Team Lead Commission - goes to telecaller's manager
        if (assignedUser.managerId && !commissionedUserIds.has(assignedUser.managerId)) {
          const teamLeadAmount = Number(config.teamLeadAmount) || 0;
          if (teamLeadAmount > 0) {
            commissionsToCreate.push({
              organizationId,
              userId: assignedUser.managerId,
              leadId,
              admissionId,
              amount: teamLeadAmount,
              rate: 0,
              baseValue,
              status: 'PENDING',
              notes: 'Team Lead commission',
            });
            commissionedUserIds.add(assignedUser.managerId);

            // 3. Manager Commission - goes to team lead's manager
            const teamLead = await prisma.user.findUnique({
              where: { id: assignedUser.managerId },
              select: { managerId: true },
            });

            if (teamLead?.managerId && !commissionedUserIds.has(teamLead.managerId)) {
              const managerAmount = Number(config.managerAmount) || 0;
              if (managerAmount > 0) {
                commissionsToCreate.push({
                  organizationId,
                  userId: teamLead.managerId,
                  leadId,
                  admissionId,
                  amount: managerAmount,
                  rate: 0,
                  baseValue,
                  status: 'PENDING',
                  notes: 'Manager commission',
                });
                commissionedUserIds.add(teamLead.managerId);
              }
            }
          }
        }
      }
    }
    // If no telecaller assigned, fall back to whoever closed the admission
    else {
      console.log('[AdmissionService] No telecaller assigned to lead, using closer for commission');

      const closedByUser = await prisma.user.findUnique({
        where: { id: closedById },
        select: {
          id: true,
          managerId: true,
          role: { select: { slug: true } },
        },
      });

      if (!closedByUser) {
        console.log('[AdmissionService] Closed by user not found:', closedById);
        return;
      }

      const closerRole = closedByUser.role?.slug?.toLowerCase() || '';

      // If closer is telecaller/counselor
      if (['telecaller', 'counselor'].includes(closerRole)) {
        const telecallerAmount = Number(config.telecallerAmount) || 0;
        if (telecallerAmount > 0) {
          commissionsToCreate.push({
            organizationId,
            userId: closedById,
            leadId,
            admissionId,
            amount: telecallerAmount,
            rate: 0,
            baseValue,
            status: 'PENDING',
            notes: 'Telecaller commission (closer)',
          });
          commissionedUserIds.add(closedById);
        }

        if (closedByUser.managerId && !commissionedUserIds.has(closedByUser.managerId)) {
          const teamLeadAmount = Number(config.teamLeadAmount) || 0;
          if (teamLeadAmount > 0) {
            commissionsToCreate.push({
              organizationId,
              userId: closedByUser.managerId,
              leadId,
              admissionId,
              amount: teamLeadAmount,
              rate: 0,
              baseValue,
              status: 'PENDING',
              notes: 'Team Lead commission',
            });
            commissionedUserIds.add(closedByUser.managerId);

            const teamLead = await prisma.user.findUnique({
              where: { id: closedByUser.managerId },
              select: { managerId: true },
            });

            if (teamLead?.managerId && !commissionedUserIds.has(teamLead.managerId)) {
              const managerAmount = Number(config.managerAmount) || 0;
              if (managerAmount > 0) {
                commissionsToCreate.push({
                  organizationId,
                  userId: teamLead.managerId,
                  leadId,
                  admissionId,
                  amount: managerAmount,
                  rate: 0,
                  baseValue,
                  status: 'PENDING',
                  notes: 'Manager commission',
                });
              }
            }
          }
        }
      }
      // If closer is team lead
      else if (['team_lead', 'teamlead'].includes(closerRole)) {
        const teamLeadAmount = Number(config.teamLeadAmount) || 0;
        if (teamLeadAmount > 0) {
          commissionsToCreate.push({
            organizationId,
            userId: closedById,
            leadId,
            admissionId,
            amount: teamLeadAmount,
            rate: 0,
            baseValue,
            status: 'PENDING',
            notes: 'Team Lead commission (closer)',
          });
          commissionedUserIds.add(closedById);
        }

        if (closedByUser.managerId && !commissionedUserIds.has(closedByUser.managerId)) {
          const managerAmount = Number(config.managerAmount) || 0;
          if (managerAmount > 0) {
            commissionsToCreate.push({
              organizationId,
              userId: closedByUser.managerId,
              leadId,
              admissionId,
              amount: managerAmount,
              rate: 0,
              baseValue,
              status: 'PENDING',
              notes: 'Manager commission',
            });
          }
        }
      }
      // If closer is manager/admin
      else if (['manager', 'admin'].includes(closerRole)) {
        const managerAmount = Number(config.managerAmount) || 0;
        if (managerAmount > 0) {
          commissionsToCreate.push({
            organizationId,
            userId: closedById,
            leadId,
            admissionId,
            amount: managerAmount,
            rate: 0,
            baseValue,
            status: 'PENDING',
            notes: 'Manager commission (closer)',
          });
        }
      }
    }

    // Create all commission records
    if (commissionsToCreate.length > 0) {
      await prisma.commission.createMany({
        data: commissionsToCreate,
      });
      console.log(`[AdmissionService] Created ${commissionsToCreate.length} commission records for admission ${admissionId}`);
    } else {
      console.log(`[AdmissionService] No commissions created for admission ${admissionId}`);
    }
  }

  /**
   * Close/Create an admission
   */
  async create(input: CreateAdmissionInput) {
    // Verify lead exists
    const lead = await prisma.lead.findFirst({
      where: { id: input.leadId, organizationId: input.organizationId },
    });

    if (!lead) {
      throw new NotFoundError('Lead not found');
    }

    // Handle university - either by ID or by name (auto-create if needed)
    let university;

    if (input.universityId) {
      // Find by ID
      university = await prisma.university.findFirst({
        where: { id: input.universityId, organizationId: input.organizationId, isActive: true },
      });
      if (!university) {
        throw new NotFoundError('University not found or inactive');
      }
    } else if (input.universityName) {
      // Find by name or create new
      university = await prisma.university.findFirst({
        where: {
          name: { equals: input.universityName, mode: 'insensitive' },
          organizationId: input.organizationId,
        },
      });

      if (!university) {
        // Auto-create university with the given name
        university = await prisma.university.create({
          data: {
            organizationId: input.organizationId,
            name: input.universityName,
            isActive: true,
          },
        });
      }
    } else {
      throw new BadRequestError('Either universityId or universityName is required');
    }

    // Check if admission already exists for this lead
    const existingAdmission = await prisma.admission.findFirst({
      where: {
        leadId: input.leadId,
        academicYear: input.academicYear,
        status: 'ACTIVE',
      },
    });

    if (existingAdmission) {
      throw new BadRequestError('An active admission already exists for this lead in this academic year');
    }

    // Generate admission number
    const admissionNumber = await this.generateAdmissionNumber(input.organizationId, input.academicYear);

    // Validate numeric values to prevent database overflow (max ~9.99 billion for decimal(12,2))
    const MAX_AMOUNT = 9999999999.99;
    if (input.totalFee > MAX_AMOUNT) {
      throw new BadRequestError(`Total fee cannot exceed ₹${MAX_AMOUNT.toLocaleString('en-IN')}. Please check the entered amount.`);
    }
    if (input.donationAmount && input.donationAmount > MAX_AMOUNT) {
      throw new BadRequestError(`Donation amount cannot exceed ₹${MAX_AMOUNT.toLocaleString('en-IN')}. Please check the entered amount.`);
    }

    // Calculate commission
    const commissionAmount = Math.min((input.totalFee * input.commissionPercent) / 100, MAX_AMOUNT);
    const pendingAmount = Math.min(input.totalFee + (input.donationAmount || 0), MAX_AMOUNT);

    const admission = await prisma.admission.create({
      data: {
        organizationId: input.organizationId,
        admissionNumber,
        leadId: input.leadId,
        universityId: university.id,
        courseName: input.courseName,
        branch: input.branch,
        academicYear: input.academicYear,
        admissionType: input.admissionType,
        totalFee: input.totalFee,
        donationAmount: input.donationAmount || 0,
        pendingAmount,
        commissionPercent: input.commissionPercent,
        commissionAmount,
        closedById: input.closedById,
      },
      include: {
        lead: {
          select: { firstName: true, lastName: true, phone: true, email: true },
        },
        university: {
          select: { name: true, shortName: true },
        },
        closedBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    // Find "Admitted" stage for this organization
    const admittedStage = await prisma.leadStage.findFirst({
      where: {
        organizationId: input.organizationId,
        name: { in: ['Admitted', 'ADMITTED', 'admitted'] },
      },
    });

    // Update lead conversion status and stage
    await prisma.lead.update({
      where: { id: input.leadId },
      data: {
        isConverted: true,
        convertedAt: new Date(),
        actualValue: input.totalFee,
        ...(admittedStage && { stageId: admittedStage.id }),
      },
    });

    // Update university stats
    await prisma.university.update({
      where: { id: university.id },
      data: {
        totalAdmissions: { increment: 1 },
        totalRevenue: { increment: input.totalFee },
      },
    });

    // Create Commission records for telecaller, team lead, and manager
    try {
      await this.createCommissions(
        input.organizationId,
        admission.id,
        input.leadId,
        input.closedById,
        input.admissionType,
        input.totalFee
      );
    } catch (error) {
      console.error('[AdmissionService] Failed to create commission records:', error);
      // Don't throw - commission creation failure shouldn't fail the admission
    }

    // Send notifications for new admission
    try {
      await admissionNotificationService.notifyAdmissionCreated(
        admission as any,
        input.organizationId
      );
    } catch (error) {
      console.error('[AdmissionService] Failed to send admission created notification:', error);
      // Don't throw - notification failure shouldn't fail the admission
    }

    return admission;
  }

  /**
   * Find all admissions with filters
   */
  async findAll(organizationId: string, filters: AdmissionFilters = {}) {
    const {
      universityId,
      admissionType,
      paymentStatus,
      commissionStatus,
      academicYear,
      closedById,
      branchId,
      fromDate,
      toDate,
      search,
      page = 1,
      limit = 50,
    } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.AdmissionWhereInput = { organizationId };

    if (universityId) where.universityId = universityId;
    if (admissionType) where.admissionType = admissionType;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (commissionStatus) where.commissionStatus = commissionStatus;
    if (academicYear) where.academicYear = academicYear;
    if (closedById) where.closedById = closedById;
    if (branchId) where.closedBy = { branchId: branchId };

    if (fromDate || toDate) {
      where.closedAt = {};
      if (fromDate) where.closedAt.gte = fromDate;
      if (toDate) where.closedAt.lte = toDate;
    }

    if (search) {
      where.OR = [
        { admissionNumber: { contains: search, mode: 'insensitive' } },
        { lead: { firstName: { contains: search, mode: 'insensitive' } } },
        { lead: { lastName: { contains: search, mode: 'insensitive' } } },
        { lead: { phone: { contains: search } } },
      ];
    }

    const [admissions, total] = await Promise.all([
      prisma.admission.findMany({
        where,
        include: {
          lead: {
            select: { firstName: true, lastName: true, phone: true, email: true },
          },
          university: {
            select: { name: true, shortName: true },
          },
          closedBy: {
            select: { firstName: true, lastName: true },
          },
          _count: {
            select: { admissionPayments: true },
          },
        },
        orderBy: { closedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.admission.count({ where }),
    ]);

    return {
      admissions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find an admission by ID
   */
  async findById(id: string, organizationId: string) {
    const admission = await prisma.admission.findFirst({
      where: { id, organizationId },
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            fatherName: true,
            fatherPhone: true,
            address: true,
            city: true,
            state: true,
          },
        },
        university: {
          select: {
            id: true,
            name: true,
            shortName: true,
            city: true,
            contactPerson: true,
            contactPhone: true,
          },
        },
        closedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        admissionPayments: {
          orderBy: { createdAt: 'desc' },
          include: {
            receivedBy: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!admission) {
      throw new NotFoundError('Admission not found');
    }

    return admission;
  }

  /**
   * Update an admission
   */
  async update(id: string, organizationId: string, data: Partial<CreateAdmissionInput>) {
    const existing = await prisma.admission.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundError('Admission not found');
    }

    // Recalculate commission if fee or percent changes
    let updateData: any = { ...data };
    if (data.totalFee !== undefined || data.commissionPercent !== undefined) {
      const totalFee = data.totalFee ?? Number(existing.totalFee);
      const commissionPercent = data.commissionPercent ?? Number(existing.commissionPercent);
      updateData.commissionAmount = (totalFee * commissionPercent) / 100;
    }

    const admission = await prisma.admission.update({
      where: { id },
      data: updateData,
      include: {
        lead: {
          select: { firstName: true, lastName: true, phone: true },
        },
        university: {
          select: { name: true, shortName: true },
        },
      },
    });

    return admission;
  }

  /**
   * Record a payment for an admission
   */
  async recordPayment(admissionId: string, organizationId: string, input: RecordPaymentInput) {
    const admission = await prisma.admission.findFirst({
      where: { id: admissionId, organizationId },
    });

    if (!admission) {
      throw new NotFoundError('Admission not found');
    }

    // Get the next payment number
    const lastPayment = await prisma.admissionPayment.findFirst({
      where: { admissionId },
      orderBy: { paymentNumber: 'desc' },
    });
    const paymentNumber = (lastPayment?.paymentNumber || 0) + 1;

    const paidAt = new Date();

    // Create AdmissionPayment (education-specific detailed record)
    const admissionPayment = await prisma.admissionPayment.create({
      data: {
        admissionId,
        paymentNumber,
        amount: input.amount,
        paymentType: input.paymentType,
        paymentMode: input.paymentMode,
        referenceNumber: input.referenceNumber,
        paidAt,
        receivedById: input.receivedById,
        notes: input.notes,
        receiptUrl: input.receiptUrl,
      },
    });

    // Also create generic Payment record (for unified reporting across all industries)
    await prisma.payment.create({
      data: {
        organizationId,
        leadId: admission.leadId,
        admissionId,
        amount: input.amount,
        paymentMethod: input.paymentMode,
        paymentType: input.paymentType,
        description: input.notes || `Admission payment #${paymentNumber}`,
        referenceNumber: input.referenceNumber,
        status: 'COMPLETED',
        paidAt,
        createdById: input.receivedById || admission.closedById,
      },
    });

    const payment = admissionPayment;

    // Update admission payment totals
    const newPaidAmount = Number(admission.paidAmount) + Number(input.amount);
    const totalDue = Number(admission.totalFee) + Number(admission.donationAmount);
    const newPendingAmount = totalDue - newPaidAmount;
    const newPaymentStatus =
      newPendingAmount <= 0 ? 'PAID' : newPaidAmount > 0 ? 'PARTIAL' : 'PENDING';

    await prisma.admission.update({
      where: { id: admissionId },
      data: {
        paidAmount: newPaidAmount,
        pendingAmount: Math.max(0, newPendingAmount),
        paymentStatus: newPaymentStatus,
      },
    });

    // Note: Lead is already marked as isConverted when admission is created
    // No additional status update needed when payment is complete

    // Send payment notifications
    try {
      // Fetch full admission details for notifications
      const fullAdmission = await prisma.admission.findUnique({
        where: { id: admissionId },
        include: {
          lead: {
            select: { firstName: true, lastName: true, phone: true, email: true },
          },
          university: {
            select: { name: true, shortName: true },
          },
          closedBy: {
            select: { firstName: true, lastName: true },
          },
        },
      });

      if (fullAdmission) {
        if (newPaymentStatus === 'PAID') {
          await admissionNotificationService.notifyPaymentComplete(
            fullAdmission as any,
            organizationId
          );
        } else {
          await admissionNotificationService.notifyPaymentReceived(
            fullAdmission as any,
            payment as any,
            organizationId
          );
        }
      }
    } catch (error) {
      console.error('[AdmissionService] Failed to send payment notification:', error);
      // Don't throw - notification failure shouldn't fail the payment recording
    }

    return payment;
  }

  /**
   * Mark commission as received
   */
  async markCommissionReceived(id: string, organizationId: string) {
    const admission = await prisma.admission.findFirst({
      where: { id, organizationId },
      include: {
        lead: {
          select: { firstName: true, lastName: true, phone: true, email: true },
        },
        university: {
          select: { name: true, shortName: true },
        },
        closedBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    if (!admission) {
      throw new NotFoundError('Admission not found');
    }

    if (admission.commissionStatus === 'RECEIVED') {
      throw new BadRequestError('Commission already marked as received');
    }

    const updatedAdmission = await prisma.admission.update({
      where: { id },
      data: {
        commissionStatus: 'RECEIVED',
        commissionReceivedAt: new Date(),
      },
      include: {
        lead: {
          select: { firstName: true, lastName: true, phone: true, email: true },
        },
        university: {
          select: { name: true, shortName: true },
        },
        closedBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    // Send commission received notification
    try {
      await admissionNotificationService.notifyCommissionReceived(
        updatedAdmission as any,
        organizationId
      );
    } catch (error) {
      console.error('[AdmissionService] Failed to send commission notification:', error);
      // Don't throw - notification failure shouldn't fail the operation
    }

    return updatedAdmission;
  }

  /**
   * Cancel an admission
   */
  async cancel(id: string, organizationId: string, reason?: string) {
    const admission = await prisma.admission.findFirst({
      where: { id, organizationId },
      include: {
        lead: {
          select: { firstName: true, lastName: true, phone: true, email: true },
        },
        university: {
          select: { name: true, shortName: true },
        },
        closedBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    if (!admission) {
      throw new NotFoundError('Admission not found');
    }

    if (admission.status === 'CANCELLED') {
      throw new BadRequestError('Admission is already cancelled');
    }

    // Revert university stats
    await prisma.university.update({
      where: { id: admission.universityId },
      data: {
        totalAdmissions: { decrement: 1 },
        totalRevenue: { decrement: Number(admission.totalFee) },
      },
    });

    // Update lead - mark as not converted since admission is cancelled
    await prisma.lead.update({
      where: { id: admission.leadId },
      data: {
        isConverted: false,
      },
    });

    const cancelledAdmission = await prisma.admission.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: {
        lead: {
          select: { firstName: true, lastName: true, phone: true, email: true },
        },
        university: {
          select: { name: true, shortName: true },
        },
        closedBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    // Send cancellation notification
    try {
      await admissionNotificationService.notifyAdmissionCancelled(
        cancelledAdmission as any,
        reason,
        organizationId
      );
    } catch (error) {
      console.error('[AdmissionService] Failed to send cancellation notification:', error);
      // Don't throw - notification failure shouldn't fail the operation
    }

    return cancelledAdmission;
  }

  /**
   * Get admission statistics
   */
  async getStats(organizationId: string, dateRange?: { from: Date; to: Date }) {
    const dateFilter = dateRange
      ? { gte: dateRange.from, lte: dateRange.to }
      : undefined;

    const where: Prisma.AdmissionWhereInput = {
      organizationId,
      status: 'ACTIVE',
      ...(dateFilter && { closedAt: dateFilter }),
    };

    const [
      totalAdmissions,
      byType,
      byPaymentStatus,
      byCommissionStatus,
      financials,
    ] = await Promise.all([
      prisma.admission.count({ where }),
      prisma.admission.groupBy({
        by: ['admissionType'],
        where,
        _count: true,
        _sum: { totalFee: true, commissionAmount: true },
      }),
      prisma.admission.groupBy({
        by: ['paymentStatus'],
        where,
        _count: true,
      }),
      prisma.admission.groupBy({
        by: ['commissionStatus'],
        where,
        _count: true,
        _sum: { commissionAmount: true },
      }),
      prisma.admission.aggregate({
        where,
        _sum: {
          totalFee: true,
          donationAmount: true,
          paidAmount: true,
          pendingAmount: true,
          commissionAmount: true,
        },
      }),
    ]);

    return {
      totalAdmissions,
      byType: byType.map((t) => ({
        type: t.admissionType,
        count: t._count,
        totalFee: Number(t._sum.totalFee) || 0,
        totalCommission: Number(t._sum.commissionAmount) || 0,
      })),
      byPaymentStatus: byPaymentStatus.map((p) => ({
        status: p.paymentStatus,
        count: p._count,
      })),
      byCommissionStatus: byCommissionStatus.map((c) => ({
        status: c.commissionStatus,
        count: c._count,
        amount: Number(c._sum.commissionAmount) || 0,
      })),
      financials: {
        totalFee: Number(financials._sum.totalFee) || 0,
        totalDonation: Number(financials._sum.donationAmount) || 0,
        totalPaid: Number(financials._sum.paidAmount) || 0,
        totalPending: Number(financials._sum.pendingAmount) || 0,
        totalCommission: Number(financials._sum.commissionAmount) || 0,
      },
    };
  }

  /**
   * Get academic years with admissions
   */
  async getAcademicYears(organizationId: string) {
    const years = await prisma.admission.findMany({
      where: { organizationId },
      select: { academicYear: true },
      distinct: ['academicYear'],
      orderBy: { academicYear: 'desc' },
    });

    return years.map((y) => y.academicYear);
  }

  /**
   * Backfill commissions for existing admissions that don't have commission records
   * This is useful when commission configs are added after admissions were created
   */
  async backfillCommissions(organizationId: string): Promise<{ processed: number; created: number; skipped: number }> {
    // Find all admissions that don't have any commission records
    const admissionsWithoutCommissions = await prisma.admission.findMany({
      where: {
        organizationId,
        status: 'ACTIVE',
      },
      include: {
        lead: {
          select: {
            id: true,
            assignments: {
              where: { isActive: true },
              orderBy: { assignedAt: 'desc' },
              take: 1,
              select: {
                assignedToId: true,
                assignedTo: {
                  select: {
                    id: true,
                    managerId: true,
                    role: { select: { slug: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    let processed = 0;
    let created = 0;
    let skipped = 0;

    for (const admission of admissionsWithoutCommissions) {
      processed++;

      // Check if commission already exists for this admission
      const existingCommission = await prisma.commission.findFirst({
        where: { admissionId: admission.id },
      });

      if (existingCommission) {
        skipped++;
        continue;
      }

      // Create commissions for this admission
      try {
        await this.createCommissions(
          organizationId,
          admission.id,
          admission.leadId,
          admission.closedById,
          admission.admissionType,
          Number(admission.totalFee)
        );
        created++;
        console.log(`[AdmissionService] Backfilled commissions for admission ${admission.admissionNumber}`);
      } catch (error) {
        console.error(`[AdmissionService] Failed to backfill commission for admission ${admission.id}:`, error);
        skipped++;
      }
    }

    return { processed, created, skipped };
  }
}

export const admissionService = new AdmissionService();
