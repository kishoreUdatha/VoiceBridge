import { prisma } from '../config/database';
import { NotFoundError, ValidationError } from '../utils/errors';
import { LeadSource, LeadPriority, Prisma, AdmissionStatus, AdmissionType } from '@prisma/client';
import { leadPipelineService } from './lead-pipeline.service';
import { leadLifecycleService } from './lead-lifecycle.service';

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
  // Common fields (proper columns)
  whatsapp?: string;
  fatherName?: string;
  fatherPhone?: string;
  motherName?: string;
  motherPhone?: string;
  occupation?: string;
  budget?: number;
  preferredContactMethod?: string;
  preferredContactTime?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
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
  // Common fields (now proper columns)
  fatherName?: string;
  fatherPhone?: string;
  motherName?: string;
  motherPhone?: string;
  whatsapp?: string;
  occupation?: string;
  budget?: number;
  preferredContactMethod?: string;
  preferredContactTime?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
}

interface LeadFilter {
  organizationId: string;
  stageId?: string;
  pipelineStageId?: string; // Unified Pipeline Stage filter
  filterUnassignedCounselor?: boolean; // Filter leads with no counselor assigned
  source?: LeadSource;
  priority?: LeadPriority;
  assignedToId?: string;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  isConverted?: boolean;
  tagId?: string; // Filter by tag ID
  customFieldFilters?: Record<string, any>; // Custom field filters
  // Role-based filtering
  userRole?: string;
  userId?: string;
  // Filter for leads with pending follow-ups
  pendingFollowUp?: boolean;
  // Direct column filters (new approach)
  city?: string;
  state?: string;
  fatherName?: string;
  motherName?: string;
  occupation?: string;
  companyName?: string;
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

    // Auto-assign lead to default pipeline (Unified Pipeline System)
    try {
      await leadPipelineService.assignLeadToPipeline(lead.id, input.organizationId);
    } catch (err) {
      console.warn('[Lead] Failed to assign to pipeline:', err);
      // Don't fail lead creation if pipeline assignment fails
    }

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
              select: { name: true }
            }
          }
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

  async findAll(filter: LeadFilter, page = 1, limit = 20) {
    const where: Prisma.LeadWhereInput = {
      organizationId: filter.organizationId,
    };

    // Filter by unified pipeline stage (new system)
    if (filter.pipelineStageId) {
      where.pipelineStageId = filter.pipelineStageId;
    } else if (filter.stageId) {
      // Fallback to old lead stage system
      where.stageId = filter.stageId;
    }

    // Filter leads with no counselor assigned (no active assignment)
    if (filter.filterUnassignedCounselor) {
      where.assignments = {
        none: { isActive: true },
      };
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
    } else if (
      normalizedRole === 'telecaller' ||
      normalizedRole === 'counselor' ||
      normalizedRole === 'counsellor' ||
      normalizedRole === 'agent' ||
      normalizedRole === 'salesagent' ||
      normalizedRole === 'salesrep' ||
      normalizedRole === 'sales' ||
      normalizedRole === 'user'
    ) {
      // Telecaller/Counselor/Agent: only see their own assigned leads
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
    } else if (normalizedRole && normalizedRole !== 'admin' && normalizedRole !== 'superadmin') {
      // Any other non-admin role: only see their own assigned leads
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
    // Admin/SuperAdmin sees all leads (no filter)

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
        // Start of day
        const startDate = new Date(filter.dateFrom);
        startDate.setHours(0, 0, 0, 0);
        where.createdAt.gte = startDate;
      }
      if (filter.dateTo) {
        // End of day (23:59:59.999)
        const endDate = new Date(filter.dateTo);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDate;
      }
    }

    if (filter.isConverted !== undefined) {
      where.isConverted = filter.isConverted;
    }

    // Filter for leads with pending follow-ups
    if (filter.pendingFollowUp) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);

      // Include leads that have:
      // 1. A pending FollowUp record (status = UPCOMING)
      // 2. OR nextFollowUpAt set for today or past
      // 3. OR are in active stages (not completed)
      const completedStages = ['Admitted', 'ADMITTED', 'Enrolled', 'ENROLLED', 'Won', 'WON', 'Dropped', 'DROPPED', 'Lost', 'LOST', 'Closed', 'CLOSED'];

      andConditions.push({
        OR: [
          // Has a pending follow-up scheduled
          { followUps: { some: { status: 'UPCOMING' } } },
          // Has nextFollowUpAt set for today or past
          { nextFollowUpAt: { lte: todayEnd } },
          // Is in an active stage (needs attention)
          { stage: { name: { notIn: completedStages } } },
        ],
      });
    }

    // Filter by tag - leads that have this tag assigned
    if (filter.tagId) {
      where.tagAssignments = {
        some: {
          tagId: filter.tagId,
        },
      };
    }

    // Filter by custom fields
    // First, handle fields that are now proper columns (use Prisma native filtering)
    // Then, handle remaining custom fields (use raw SQL for JSON)
    if (filter.customFieldFilters && Object.keys(filter.customFieldFilters).length > 0) {
      console.log('[LeadService] Custom field filters received:', JSON.stringify(filter.customFieldFilters));

      // Fields that are now proper columns in the Lead table
      const columnFields: Record<string, string> = {
        'father_name': 'fatherName',
        'fatherName': 'fatherName',
        'father_phone': 'fatherPhone',
        'fatherPhone': 'fatherPhone',
        'mother_name': 'motherName',
        'motherName': 'motherName',
        'mother_phone': 'motherPhone',
        'motherPhone': 'motherPhone',
        'occupation': 'occupation',
        'budget': 'budget',
        'whatsapp': 'whatsapp',
        'preferred_contact_method': 'preferredContactMethod',
        'preferredContactMethod': 'preferredContactMethod',
        'preferred_contact_time': 'preferredContactTime',
        'preferredContactTime': 'preferredContactTime',
        'city': 'city',
        'state': 'state',
        'country': 'country',
        'company_name': 'companyName',
        'companyName': 'companyName',
        'job_title': 'jobTitle',
        'jobTitle': 'jobTitle',
      };

      // Separate column filters from true custom field filters
      const nativeFilters: Record<string, any> = {};
      const jsonFilters: Record<string, any> = {};

      for (const [key, value] of Object.entries(filter.customFieldFilters)) {
        if (value === undefined || value === null || value === '') continue;

        // Check if this field maps to a column
        const columnName = columnFields[key];
        if (columnName) {
          nativeFilters[columnName] = value;
        } else {
          jsonFilters[key] = value;
        }
      }

      console.log('[LeadService] Native column filters:', nativeFilters);
      console.log('[LeadService] JSON custom field filters:', jsonFilters);

      // Apply native Prisma filters for column fields
      for (const [columnName, value] of Object.entries(nativeFilters)) {
        if (columnName === 'budget') {
          // Handle budget as numeric comparison
          if (typeof value === 'object') {
            where[columnName] = value; // Already a Prisma filter object
          } else {
            where[columnName] = { gte: parseFloat(String(value)) };
          }
        } else if (typeof value === 'string') {
          // Case-insensitive partial match for text fields
          (where as any)[columnName] = { contains: value, mode: 'insensitive' };
        } else {
          (where as any)[columnName] = value;
        }
      }

      // Handle remaining JSON custom fields with raw SQL
      if (Object.keys(jsonFilters).length > 0) {
        const customFieldConditions: string[] = [];
        const customFieldValues: any[] = [];

        for (const [key, value] of Object.entries(jsonFilters)) {
          // Parameter numbering starts at $2 since $1 is used for organizationId
          const paramIndex = customFieldValues.length + 2;

          // Handle range filters for numbers (key_min, key_max)
          if (key.endsWith('_min')) {
            const fieldSlug = key.replace('_min', '');
            customFieldConditions.push(`("customFields"->>'${fieldSlug}')::numeric >= $${paramIndex}`);
            customFieldValues.push(value);
          } else if (key.endsWith('_max')) {
            const fieldSlug = key.replace('_max', '');
            customFieldConditions.push(`("customFields"->>'${fieldSlug}')::numeric <= $${paramIndex}`);
            customFieldValues.push(value);
          } else if (key.endsWith('_from')) {
            const fieldSlug = key.replace('_from', '');
            customFieldConditions.push(`"customFields"->>'${fieldSlug}' >= $${paramIndex}`);
            customFieldValues.push(value);
          } else if (key.endsWith('_to')) {
            const fieldSlug = key.replace('_to', '');
            customFieldConditions.push(`"customFields"->>'${fieldSlug}' <= $${paramIndex}`);
            customFieldValues.push(value);
          } else if (typeof value === 'boolean') {
            customFieldConditions.push(`("customFields"->>'${key}')::boolean = $${paramIndex}`);
            customFieldValues.push(value);
          } else if (typeof value === 'string') {
            // Case-insensitive partial match for text fields
            customFieldConditions.push(`LOWER("customFields"->>'${key}') LIKE LOWER($${paramIndex})`);
            customFieldValues.push(`%${value}%`);
          } else {
            customFieldConditions.push(`"customFields"->>'${key}' = $${paramIndex}`);
            customFieldValues.push(String(value));
          }
        }

        console.log('[LeadService] Custom field SQL conditions:', customFieldConditions);
        console.log('[LeadService] Custom field values:', customFieldValues);

        // If we have custom field conditions, we need to get matching lead IDs first
        if (customFieldConditions.length > 0) {
          const sqlCondition = customFieldConditions.join(' AND ');
          const matchingLeadIds = await prisma.$queryRawUnsafe<{ id: string }[]>(
            `SELECT id FROM "leads" WHERE "organizationId" = $1 AND "customFields" IS NOT NULL AND ${sqlCondition}`,
            filter.organizationId,
            ...customFieldValues
          );

          console.log('[LeadService] Matching lead IDs:', matchingLeadIds.map(l => l.id));

          if (matchingLeadIds.length === 0) {
            // No matches, return empty result
            return { leads: [], total: 0 };
          }

          // Add ID filter to where clause
          where.id = { in: matchingLeadIds.map(l => l.id) };
        }
      }
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
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

    // Define fields that exist in the Lead Prisma model
    const leadModelFields = [
      'firstName', 'lastName', 'email', 'phone', 'alternatePhone', 'alternateEmail',
      'source', 'sourceDetails', 'channelId', 'stageId', 'subStageId', 'priority',
      'pipelineStageId', 'pipelineEnteredAt', 'pipelineDaysInStage',
      'gender', 'dateOfBirth', 'address', 'city', 'state', 'country', 'pincode',
      'expectedValue', 'actualValue', 'customFields', 'interests',
      'phoneVerified', 'isReEnquiry', 'aiScore', 'aiGrade', 'aiConfidence',
      'isConverted', 'convertedAt', 'notes', 'orgBranchId',
      // Education fields (if model supports them)
      'admissionStatus', 'admissionType', 'expectedFee', 'actualFee',
      'commissionPercentage', 'commissionAmount', 'donationAmount',
      'enrollmentNumber', 'academicYear', 'preferredUniversities',
      // Family & Contact Details (direct columns)
      'fatherName', 'fatherPhone', 'motherName', 'motherPhone',
      'whatsapp', 'occupation', 'budget', 'preferredContactMethod', 'preferredContactTime',
    ];

    // Valid LeadSource values
    const validLeadSources = [
      'MANUAL', 'BULK_UPLOAD', 'FORM', 'LANDING_PAGE', 'CHATBOT',
      'AD_FACEBOOK', 'AD_INSTAGRAM', 'AD_LINKEDIN', 'AD_GOOGLE', 'AD_YOUTUBE', 'AD_TWITTER', 'AD_TIKTOK',
      'AI_VOICE_AGENT', 'AI_VOICE_INBOUND', 'AI_VOICE_OUTBOUND',
      'REFERRAL', 'WEBSITE', 'SHIKSHA', 'COLLEGEDUNIA', 'API'
    ];

    // Separate model fields from custom fields
    const modelData: Record<string, unknown> = {};
    const extraFields: Record<string, unknown> = {};

    // Decimal fields that need empty string -> null conversion
    const decimalFields = ['budget', 'expectedValue', 'actualValue', 'expectedFee', 'actualFee',
      'commissionPercentage', 'commissionAmount', 'donationAmount', 'aiScore', 'aiConfidence'];

    for (const [key, value] of Object.entries(updateData)) {
      if (leadModelFields.includes(key)) {
        // Skip empty or invalid source values
        if (key === 'source' && (!value || !validLeadSources.includes(value as string))) {
          continue;
        }
        // Handle dateOfBirth conversion
        if (key === 'dateOfBirth' && value && typeof value === 'string') {
          modelData[key] = new Date(value);
        } else if (decimalFields.includes(key)) {
          // Convert empty strings to null for decimal fields
          if (value === '' || value === null || value === undefined) {
            modelData[key] = null;
          } else {
            modelData[key] = value;
          }
        } else {
          modelData[key] = value;
        }
      } else if (key !== 'organizationId') {
        // Store non-model fields in customFields
        extraFields[key] = value;
      }
    }

    // Merge extra fields into customFields
    if (Object.keys(extraFields).length > 0) {
      const existingCustomFields = (lead.customFields as Record<string, unknown>) || {};
      modelData.customFields = { ...existingCustomFields, ...extraFields };
    }

    const updatedLead = await prisma.lead.update({
      where: { id },
      data: modelData,
      include: {
        assignments: {
          where: { isActive: true },
          include: {
            assignedTo: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
        stage: { select: { name: true } },
      },
    });

    // Auto-complete pending follow-ups if stage changed to a completed stage (Won, Lost, Closed, etc.)
    if (input.stageId && input.stageId !== lead.stageId && updatedLead.stage) {
      try {
        const completedCount = await leadLifecycleService.completeFollowUpsOnStageChange(
          id,
          updatedLead.stage.name,
          userId
        );
        if (completedCount > 0) {
          console.log(`[LeadService] Auto-completed ${completedCount} follow-ups for lead ${id} (stage: ${updatedLead.stage.name})`);
        }
      } catch (error) {
        console.error(`[LeadService] Failed to auto-complete follow-ups for lead ${id}:`, error);
      }
    }

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

  /**
   * Validate that the assigner can assign to the assignee based on hierarchy
   * Admin: can assign to anyone in the organization
   * Manager: can assign to their team leads and telecallers under them
   * Team Lead: can assign to their telecallers only
   */
  async validateAssignmentHierarchy(
    assignerId: string,
    assigneeId: string,
    organizationId: string
  ): Promise<{ valid: boolean; error?: string }> {
    // Get assigner details with role
    const assigner = await prisma.user.findFirst({
      where: { id: assignerId, organizationId },
      include: {
        role: { select: { slug: true } },
      },
    });

    if (!assigner) {
      return { valid: false, error: 'Assigner not found' };
    }

    const assignerRole = assigner.role?.slug || '';

    // Admin can assign to anyone
    if (assignerRole === 'admin' || assignerRole === 'super_admin') {
      return { valid: true };
    }

    // Get assignee details
    const assignee = await prisma.user.findFirst({
      where: { id: assigneeId, organizationId },
      include: {
        role: { select: { slug: true } },
      },
    });

    if (!assignee) {
      return { valid: false, error: 'Assignee not found' };
    }

    // Manager can assign to:
    // - Direct reports (managerId = assignerId)
    // - Telecallers under their team leads
    if (assignerRole === 'manager') {
      // Check if assignee is a direct report
      if (assignee.managerId === assignerId) {
        return { valid: true };
      }

      // Check if assignee is under a team lead who reports to this manager
      const teamLeads = await prisma.user.findMany({
        where: { managerId: assignerId, organizationId },
        select: { id: true },
      });
      const teamLeadIds = teamLeads.map(tl => tl.id);

      if (teamLeadIds.includes(assignee.managerId || '')) {
        return { valid: true };
      }

      return { valid: false, error: 'You can only assign to your team members' };
    }

    // Team Lead can assign to their direct reports only
    if (assignerRole === 'team_lead') {
      if (assignee.managerId === assignerId) {
        return { valid: true };
      }
      return { valid: false, error: 'You can only assign to your telecallers' };
    }

    // Other roles cannot assign
    return { valid: false, error: 'You do not have permission to assign leads' };
  }

  async assignLead(
    leadId: string,
    assignedToId: string,
    assignedById: string,
    organizationId: string,
    skipHierarchyCheck: boolean = false
  ) {
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId },
    });

    if (!lead) {
      throw new NotFoundError('Lead not found');
    }

    // Validate hierarchy unless explicitly skipped (for system assignments)
    if (!skipHierarchyCheck) {
      const hierarchyCheck = await this.validateAssignmentHierarchy(assignedById, assignedToId, organizationId);
      if (!hierarchyCheck.valid) {
        throw new ValidationError(hierarchyCheck.error || 'Invalid assignment');
      }
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
    source?: LeadSource,
    skipHierarchyCheck: boolean = false
  ): Promise<{ assignedCount: number; counselorAssignments: Record<string, number> }> {
    // Validate hierarchy for all counselors before assigning
    if (!skipHierarchyCheck) {
      const invalidCounselors: string[] = [];
      for (const counselorId of counselorIds) {
        const hierarchyCheck = await this.validateAssignmentHierarchy(assignedById, counselorId, organizationId);
        if (!hierarchyCheck.valid) {
          invalidCounselors.push(counselorId);
        }
      }
      if (invalidCounselors.length > 0) {
        throw new ValidationError(`You cannot assign to ${invalidCounselors.length} selected user(s). You can only assign to your team members.`);
      }
    }

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
      byPipelineStage,
      byLegacyStage,
      bySource,
      todayCount,
      thisWeekCount,
      thisMonthCount,
      pipelineStages,
      legacyStages,
    ] = await Promise.all([
      prisma.lead.count({ where: baseWhere }),
      // New pipeline system - pipelineStageId
      prisma.lead.groupBy({
        by: ['pipelineStageId'],
        where: { ...baseWhere, pipelineStageId: { not: null } },
        _count: true,
      }),
      // Legacy system - stageId (for backwards compatibility)
      prisma.lead.groupBy({
        by: ['stageId'],
        where: { ...baseWhere, pipelineStageId: null, stageId: { not: null } },
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
      // Get pipeline stages for the organization
      prisma.pipelineStage.findMany({
        where: {
          pipeline: { organizationId },
        },
        select: { id: true, name: true },
      }),
      // Get legacy stages
      prisma.leadStage.findMany({
        where: { organizationId },
        select: { id: true, name: true },
      }),
    ]);

    // Map pipeline stage IDs to names
    const pipelineStageMap = pipelineStages.reduce((acc, stage) => {
      acc[stage.id] = stage.name;
      return acc;
    }, {} as Record<string, string>);

    // Map legacy stage IDs to names
    const legacyStageMap = legacyStages.reduce((acc, stage) => {
      acc[stage.id] = stage.name;
      return acc;
    }, {} as Record<string, string>);

    // Combine both pipeline and legacy stage counts
    const byStatus: Record<string, number> = {};

    // Add pipeline stage counts
    byPipelineStage.forEach((item) => {
      if (item.pipelineStageId) {
        const stageName = pipelineStageMap[item.pipelineStageId] || 'Unknown';
        byStatus[stageName] = (byStatus[stageName] || 0) + item._count;
      }
    });

    // Add legacy stage counts
    byLegacyStage.forEach((item) => {
      if (item.stageId) {
        const stageName = legacyStageMap[item.stageId] || 'Unknown';
        byStatus[stageName] = (byStatus[stageName] || 0) + item._count;
      }
    });

    // Count leads without any stage
    const leadsWithStage = Object.values(byStatus).reduce((sum, count) => sum + count, 0);
    const unassignedCount = total - leadsWithStage;
    if (unassignedCount > 0) {
      byStatus['Unassigned'] = unassignedCount;
    }

    return {
      total,
      byStatus,
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
