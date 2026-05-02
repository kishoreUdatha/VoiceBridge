/**
 * Unified Leads Service
 *
 * Provides consistent lead operations across mobile and web platforms.
 * Uses UnifiedAccessService for role-based filtering.
 *
 * This consolidates logic from:
 * - lead.service.ts
 * - telecaller.routes.ts (lead listing endpoints)
 */

import { prisma } from '../config/database';
import { unifiedAccessService, AccessContext } from './unified-access.service';
import { LeadSource, LeadPriority, Prisma, ActivityType } from '@prisma/client';
import { NotFoundError, ValidationError } from '../utils/errors';

/**
 * Lead list options
 */
export interface LeadListOptions {
  page?: number;
  limit?: number;
  search?: string;
  stageId?: string;
  pipelineStageId?: string;
  source?: LeadSource;
  priority?: LeadPriority;
  assignedToId?: string;
  tagId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  isConverted?: boolean;
  pendingFollowUp?: boolean;
  unassignedOnly?: boolean;
  sortBy?: 'createdAt' | 'updatedAt' | 'firstName' | 'priority';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated leads result
 */
export interface PaginatedLeads {
  leads: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Create lead input
 */
export interface CreateLeadInput {
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
  whatsapp?: string;
  fatherName?: string;
  fatherPhone?: string;
  motherName?: string;
  motherPhone?: string;
  occupation?: string;
  budget?: number;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
}

/**
 * Update lead input
 */
export interface UpdateLeadInput {
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
  // Extended fields
  fatherName?: string;
  fatherPhone?: string;
  motherName?: string;
  motherPhone?: string;
  whatsapp?: string;
  occupation?: string;
  budget?: number;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
}

/**
 * Unified Leads Service
 */
export class UnifiedLeadsService {
  /**
   * List leads with role-based filtering
   * Works consistently for both mobile and web
   */
  async list(context: AccessContext, options: LeadListOptions = {}): Promise<PaginatedLeads> {
    const {
      page = 1,
      limit = 20,
      search,
      stageId,
      pipelineStageId,
      source,
      priority,
      assignedToId,
      tagId,
      dateFrom,
      dateTo,
      isConverted,
      pendingFollowUp,
      unassignedOnly,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    // Get role-based base filter
    let whereFilter = await unifiedAccessService.getLeadFilter(context);

    // Build additional conditions
    const andConditions: Prisma.LeadWhereInput[] = [];

    // Stage filters
    if (pipelineStageId) {
      andConditions.push({ pipelineStageId });
    } else if (stageId) {
      andConditions.push({ stageId });
    }

    // Source filter
    if (source) {
      andConditions.push({ source });
    }

    // Priority filter
    if (priority) {
      andConditions.push({ priority });
    }

    // Override with specific assignee if requested (for admins/managers viewing team member's leads)
    if (assignedToId) {
      andConditions.push({
        assignments: {
          some: {
            assignedToId,
            isActive: true,
          },
        },
      });
    }

    // Unassigned only filter
    if (unassignedOnly) {
      andConditions.push({
        assignments: {
          none: { isActive: true },
        },
      });
    }

    // Tag filter
    if (tagId) {
      andConditions.push({
        tagAssignments: {
          some: { tagId },
        },
      });
    }

    // Date range filter
    if (dateFrom || dateTo) {
      const dateFilter: Prisma.DateTimeFilter = {};
      if (dateFrom) {
        const start = new Date(dateFrom);
        start.setHours(0, 0, 0, 0);
        dateFilter.gte = start;
      }
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        dateFilter.lte = end;
      }
      andConditions.push({ createdAt: dateFilter });
    }

    // Conversion status filter
    if (isConverted !== undefined) {
      andConditions.push({ isConverted });
    }

    // Pending follow-up filter
    if (pendingFollowUp) {
      const today = new Date();
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);

      andConditions.push({
        OR: [
          { followUps: { some: { status: 'UPCOMING' } } },
          { nextFollowUpAt: { lte: todayEnd } },
        ],
      });
    }

    // Search filter
    if (search) {
      andConditions.push({
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
        ],
      });
    }

    // Combine conditions
    if (andConditions.length > 0) {
      whereFilter = {
        ...whereFilter,
        AND: andConditions,
      };
    }

    // Execute query
    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where: whereFilter,
        include: {
          stage: {
            select: { id: true, name: true, color: true },
          },
          pipelineStage: {
            select: { id: true, name: true, color: true, stageType: true },
          },
          assignments: {
            where: { isActive: true },
            include: {
              assignedTo: {
                select: { id: true, firstName: true, lastName: true, email: true },
              },
            },
          },
          tagAssignments: {
            include: {
              tag: {
                select: { id: true, name: true, color: true, slug: true },
              },
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.lead.count({ where: whereFilter }),
    ]);

    return {
      leads,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single lead by ID with access check
   */
  async getById(context: AccessContext, leadId: string): Promise<any> {
    // Check access
    const canAccess = await unifiedAccessService.canAccessLead(context, leadId);
    if (!canAccess) {
      throw new NotFoundError('Lead not found');
    }

    const lead = await prisma.lead.findFirst({
      where: {
        id: leadId,
        organizationId: context.organizationId,
      },
      include: {
        stage: {
          select: { id: true, name: true, slug: true, color: true, order: true, journeyOrder: true },
        },
        pipelineStage: {
          select: { id: true, name: true, color: true, stageType: true },
        },
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
        admissions: {
          where: { status: 'ACTIVE' },
          orderBy: { closedAt: 'desc' },
          take: 1,
          select: {
            id: true,
            admissionNumber: true,
            closedAt: true,
            status: true,
            university: {
              select: { name: true },
            },
          },
        },
        tagAssignments: {
          include: {
            tag: {
              select: { id: true, name: true, color: true, slug: true },
            },
          },
        },
        followUps: {
          where: { status: 'UPCOMING' },
          orderBy: { scheduledAt: 'asc' },
          take: 5,
        },
      },
    });

    if (!lead) {
      throw new NotFoundError('Lead not found');
    }

    // Add admissionClosedAt from the most recent active admission
    const latestAdmission = lead.admissions?.[0];
    return {
      ...lead,
      admissionClosedAt: latestAdmission?.closedAt || null,
    };
  }

  /**
   * Create a new lead
   */
  async create(context: AccessContext, input: CreateLeadInput): Promise<any> {
    // Clean duplicate names
    const cleanedNames = this.cleanDuplicateNames(input.firstName, input.lastName);

    // Get first stage if not provided
    let stageId = input.stageId;
    if (!stageId) {
      const firstStage = await prisma.leadStage.findFirst({
        where: {
          organizationId: context.organizationId,
          journeyOrder: { gt: 0 },
          isActive: true,
        },
        orderBy: { journeyOrder: 'asc' },
      });
      stageId = firstStage?.id;
    }

    const lead = await prisma.lead.create({
      data: {
        organizationId: context.organizationId,
        firstName: cleanedNames.firstName || input.firstName,
        lastName: cleanedNames.lastName,
        email: input.email,
        phone: input.phone,
        alternatePhone: input.alternatePhone,
        source: input.source || LeadSource.MANUAL,
        sourceDetails: input.sourceDetails,
        stageId,
        priority: input.priority || LeadPriority.MEDIUM,
        customFields: (input.customFields as Prisma.InputJsonValue) || {},
        whatsapp: input.whatsapp,
        fatherName: input.fatherName,
        fatherPhone: input.fatherPhone,
        motherName: input.motherName,
        motherPhone: input.motherPhone,
        occupation: input.occupation,
        budget: input.budget,
        address: input.address,
        city: input.city,
        state: input.state,
        country: input.country,
        pincode: input.pincode,
      },
      include: {
        stage: { select: { id: true, name: true, color: true } },
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

    // Create initial note if provided
    if (input.notes) {
      await prisma.leadNote.create({
        data: {
          leadId: lead.id,
          userId: context.userId,
          content: input.notes,
        },
      });
    }

    return lead;
  }

  /**
   * Update a lead
   */
  async update(
    context: AccessContext,
    leadId: string,
    input: UpdateLeadInput
  ): Promise<any> {
    // Check access
    const canAccess = await unifiedAccessService.canAccessLead(context, leadId);
    if (!canAccess) {
      throw new NotFoundError('Lead not found');
    }

    const existingLead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId: context.organizationId },
    });

    if (!existingLead) {
      throw new NotFoundError('Lead not found');
    }

    // Build update data
    const updateData: Record<string, unknown> = { ...input };

    // Set convertedAt timestamp when marking as converted
    if (input.isConverted === true && !existingLead.isConverted) {
      updateData.convertedAt = new Date();
    }

    // Clean duplicate names
    const newFirstName = (input.firstName as string) || existingLead.firstName;
    const newLastName = (input.lastName as string) || existingLead.lastName;
    const cleanedNames = this.cleanDuplicateNames(newFirstName, newLastName);
    if (cleanedNames.firstName) updateData.firstName = cleanedNames.firstName;
    if (cleanedNames.lastName !== undefined) updateData.lastName = cleanedNames.lastName;

    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: updateData,
      include: {
        stage: { select: { id: true, name: true, color: true } },
        pipelineStage: { select: { id: true, name: true, color: true, stageType: true } },
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

    // Create activity log
    await this.logActivity(leadId, context.userId, ActivityType.LEAD_DATA_UPDATED, 'Lead updated', input);

    return updatedLead;
  }

  /**
   * Get lead call history
   */
  async getCallHistory(context: AccessContext, leadId: string, options: { page?: number; limit?: number } = {}): Promise<any> {
    const { page = 1, limit = 20 } = options;

    // Check access
    const canAccess = await unifiedAccessService.canAccessLead(context, leadId);
    if (!canAccess) {
      throw new NotFoundError('Lead not found');
    }

    const [calls, total] = await Promise.all([
      prisma.telecallerCall.findMany({
        where: { leadId },
        include: {
          telecaller: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.telecallerCall.count({ where: { leadId } }),
    ]);

    return {
      calls,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get lead follow-ups
   */
  async getFollowUps(context: AccessContext, leadId: string, options: { status?: string; page?: number; limit?: number } = {}): Promise<any> {
    const { status, page = 1, limit = 20 } = options;

    // Check access
    const canAccess = await unifiedAccessService.canAccessLead(context, leadId);
    if (!canAccess) {
      throw new NotFoundError('Lead not found');
    }

    const where: Prisma.FollowUpWhereInput = { leadId };
    if (status) {
      where.status = status as any;
    }

    const [followUps, total] = await Promise.all([
      prisma.followUp.findMany({
        where,
        include: {
          createdBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { scheduledAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.followUp.count({ where }),
    ]);

    return {
      followUps,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Helper: Clean duplicate names
   */
  private cleanDuplicateNames(
    firstName?: string,
    lastName?: string | null
  ): { firstName?: string; lastName?: string | null } {
    if (!firstName || !lastName) {
      return { firstName, lastName };
    }

    const firstNameUpper = firstName.toUpperCase().trim();
    const lastNameUpper = lastName.toUpperCase().trim();

    // If firstName contains lastName, remove lastName
    if (firstNameUpper.includes(lastNameUpper) || firstNameUpper.endsWith(lastNameUpper)) {
      return { firstName, lastName: null };
    }

    // If lastName contains firstName and is longer, use lastName as firstName
    if (lastNameUpper.includes(firstNameUpper) && lastNameUpper.length > firstNameUpper.length) {
      return { firstName: lastName, lastName: null };
    }

    return { firstName, lastName };
  }

  /**
   * Helper: Log activity
   */
  private async logActivity(
    leadId: string,
    userId: string,
    type: ActivityType,
    title: string,
    metadata?: any
  ): Promise<void> {
    try {
      await prisma.leadActivity.create({
        data: {
          leadId,
          userId,
          type,
          title,
          description: title,
          metadata: metadata || {},
        },
      });
    } catch (error) {
      console.error('[UnifiedLeadsService] Failed to log activity:', error);
    }
  }
}

// Export singleton instance
export const unifiedLeadsService = new UnifiedLeadsService();
