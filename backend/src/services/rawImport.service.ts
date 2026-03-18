import { prisma } from '../config/database';
import { RawImportRecordStatus, BulkImportStatus, LeadSource, LeadPriority, Prisma } from '@prisma/client';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';

interface RawImportFilter {
  organizationId: string;
  bulkImportId?: string;
  status?: RawImportRecordStatus;
  assignedToId?: string;
  assignedAgentId?: string;
  search?: string;
}

interface BulkImportStats {
  totalImports: number;
  totalRecords: number;
  pendingRecords: number;
  assignedRecords: number;
  interestedRecords: number;
  convertedRecords: number;
  notInterestedRecords: number;
}

export class RawImportService {
  // ==================== BULK IMPORT MANAGEMENT ====================

  async createBulkImport(data: {
    organizationId: string;
    uploadedById: string;
    fileName: string;
    fileSize: number;
    mimeType?: string;
    totalRows: number;
    validRows: number;
    invalidRows: number;
    duplicateRows: number;
  }) {
    return prisma.bulkImport.create({
      data: {
        ...data,
        status: 'COMPLETED',
      },
    });
  }

  async getBulkImports(
    organizationId: string,
    page: number = 1,
    limit: number = 20
  ) {
    const skip = (page - 1) * limit;

    const [imports, total] = await Promise.all([
      prisma.bulkImport.findMany({
        where: { organizationId },
        include: {
          uploadedBy: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          _count: {
            select: { records: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.bulkImport.count({ where: { organizationId } }),
    ]);

    return { imports, total };
  }

  async getBulkImportById(id: string, organizationId: string) {
    const bulkImport = await prisma.bulkImport.findFirst({
      where: { id, organizationId },
      include: {
        uploadedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!bulkImport) {
      throw new NotFoundError('Bulk import not found');
    }

    // Get status breakdown
    const statusBreakdown = await prisma.rawImportRecord.groupBy({
      by: ['status'],
      where: { bulkImportId: id },
      _count: { status: true },
    });

    const breakdown = statusBreakdown.reduce((acc, item) => {
      acc[item.status] = item._count.status;
      return acc;
    }, {} as Record<string, number>);

    return {
      ...bulkImport,
      statusBreakdown: breakdown,
    };
  }

  // ==================== RAW IMPORT RECORDS ====================

  async createRecords(
    bulkImportId: string,
    organizationId: string,
    records: Array<{
      firstName: string;
      lastName?: string;
      email?: string;
      phone: string;
      alternatePhone?: string;
      customFields?: Record<string, unknown>;
    }>
  ) {
    const BATCH_SIZE = 5000;
    let insertedCount = 0;

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);

      await prisma.rawImportRecord.createMany({
        data: batch.map((record) => ({
          id: uuidv4(),
          bulkImportId,
          organizationId,
          firstName: record.firstName,
          lastName: record.lastName,
          email: record.email,
          phone: record.phone,
          alternatePhone: record.alternatePhone,
          customFields: (record.customFields || {}) as Prisma.InputJsonValue,
          status: 'PENDING',
        })),
        skipDuplicates: true,
      });

      insertedCount += batch.length;
    }

    return insertedCount;
  }

  async getRecords(
    filter: RawImportFilter,
    page: number = 1,
    limit: number = 50
  ) {
    const skip = (page - 1) * limit;
    const where: any = {
      organizationId: filter.organizationId,
    };

    if (filter.bulkImportId) {
      where.bulkImportId = filter.bulkImportId;
    }
    if (filter.status) {
      where.status = filter.status;
    }
    if (filter.assignedToId) {
      where.assignedToId = filter.assignedToId;
    }
    if (filter.assignedAgentId) {
      where.assignedAgentId = filter.assignedAgentId;
    }
    if (filter.search) {
      where.OR = [
        { firstName: { contains: filter.search, mode: 'insensitive' } },
        { lastName: { contains: filter.search, mode: 'insensitive' } },
        { email: { contains: filter.search, mode: 'insensitive' } },
        { phone: { contains: filter.search } },
      ];
    }

    const [records, total] = await Promise.all([
      prisma.rawImportRecord.findMany({
        where,
        include: {
          assignedTo: {
            select: { id: true, firstName: true, lastName: true },
          },
          assignedAgent: {
            select: { id: true, name: true },
          },
          bulkImport: {
            select: { id: true, fileName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.rawImportRecord.count({ where }),
    ]);

    return { records, total };
  }

  async getRecordById(id: string, organizationId: string) {
    const record = await prisma.rawImportRecord.findFirst({
      where: { id, organizationId },
      include: {
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        assignedAgent: {
          select: { id: true, name: true },
        },
        assignedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        convertedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        convertedLead: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
        bulkImport: true,
      },
    });

    if (!record) {
      throw new NotFoundError('Raw import record not found');
    }

    return record;
  }

  // ==================== ASSIGNMENT ====================

  async assignToTelecallers(
    recordIds: string[],
    telecallerIds: string[],
    assignedById: string,
    organizationId: string
  ) {
    if (telecallerIds.length === 0) {
      throw new BadRequestError('At least one telecaller is required');
    }

    // Verify telecallers belong to organization
    const telecallers = await prisma.user.findMany({
      where: {
        id: { in: telecallerIds },
        organizationId,
        isActive: true,
      },
      select: { id: true },
    });

    if (telecallers.length !== telecallerIds.length) {
      throw new BadRequestError('Some telecallers are invalid or inactive');
    }

    // Get records to assign
    const records = await prisma.rawImportRecord.findMany({
      where: {
        id: { in: recordIds },
        organizationId,
        status: 'PENDING',
      },
    });

    if (records.length === 0) {
      throw new BadRequestError('No pending records found to assign');
    }

    // Round-robin assignment
    const updates = records.map((record, index) => {
      const telecallerId = telecallerIds[index % telecallerIds.length];
      return prisma.rawImportRecord.update({
        where: { id: record.id },
        data: {
          assignedToId: telecallerId,
          assignedById,
          assignedAt: new Date(),
          status: 'ASSIGNED',
        },
      });
    });

    await prisma.$transaction(updates);

    return {
      assignedCount: records.length,
      telecallerCount: telecallers.length,
    };
  }

  async assignToAIAgent(
    recordIds: string[],
    agentId: string,
    assignedById: string,
    organizationId: string
  ) {
    // Verify agent exists and belongs to organization
    const agent = await prisma.voiceAgent.findFirst({
      where: { id: agentId, organizationId, isActive: true },
    });

    if (!agent) {
      throw new BadRequestError('AI agent not found or inactive');
    }

    // Get records to assign
    const records = await prisma.rawImportRecord.findMany({
      where: {
        id: { in: recordIds },
        organizationId,
        status: 'PENDING',
      },
    });

    if (records.length === 0) {
      throw new BadRequestError('No pending records found to assign');
    }

    // Assign all records to AI agent
    await prisma.rawImportRecord.updateMany({
      where: {
        id: { in: records.map((r) => r.id) },
      },
      data: {
        assignedAgentId: agentId,
        assignedById,
        assignedAt: new Date(),
        status: 'ASSIGNED',
      },
    });

    return {
      assignedCount: records.length,
      agentName: agent.name,
    };
  }

  // ==================== STATUS UPDATES ====================

  async updateRecordStatus(
    recordId: string,
    organizationId: string,
    status: RawImportRecordStatus,
    data?: {
      notes?: string;
      callSummary?: string;
      callSentiment?: string;
      interestLevel?: string;
      outboundCallId?: string;
    }
  ) {
    const record = await prisma.rawImportRecord.findFirst({
      where: { id: recordId, organizationId },
    });

    if (!record) {
      throw new NotFoundError('Record not found');
    }

    const updateData: any = { status };

    if (status === 'CALLING') {
      updateData.lastCallAt = new Date();
      updateData.callAttempts = { increment: 1 };
    }

    if (data) {
      if (data.notes) updateData.notes = data.notes;
      if (data.callSummary) updateData.callSummary = data.callSummary;
      if (data.callSentiment) updateData.callSentiment = data.callSentiment;
      if (data.interestLevel) updateData.interestLevel = data.interestLevel;
      if (data.outboundCallId) updateData.outboundCallId = data.outboundCallId;
    }

    return prisma.rawImportRecord.update({
      where: { id: recordId },
      data: updateData,
    });
  }

  // ==================== CONVERSION ====================

  async convertToLead(
    recordId: string,
    organizationId: string,
    convertedById: string,
    additionalData?: {
      source?: LeadSource;
      priority?: LeadPriority;
      notes?: string;
    }
  ) {
    const record = await prisma.rawImportRecord.findFirst({
      where: { id: recordId, organizationId },
      include: { bulkImport: true },
    });

    if (!record) {
      throw new NotFoundError('Record not found');
    }

    if (record.convertedLeadId) {
      throw new BadRequestError('Record already converted to lead');
    }

    // Create lead from record
    const lead = await prisma.lead.create({
      data: {
        organizationId,
        firstName: record.firstName,
        lastName: record.lastName,
        email: record.email,
        phone: record.phone,
        alternatePhone: record.alternatePhone,
        source: additionalData?.source || 'BULK_UPLOAD',
        sourceDetails: `Bulk Import: ${record.bulkImport?.fileName || 'Unknown'}`,
        priority: additionalData?.priority || 'MEDIUM',
        customFields: record.customFields || {},
      },
    });

    // Add note if provided
    if (additionalData?.notes || record.callSummary) {
      await prisma.leadNote.create({
        data: {
          leadId: lead.id,
          userId: convertedById,
          content: additionalData?.notes || record.callSummary || 'Converted from raw import',
          isPinned: false,
        },
      });
    }

    // Update record as converted
    await prisma.rawImportRecord.update({
      where: { id: recordId },
      data: {
        status: 'CONVERTED',
        convertedLeadId: lead.id,
        convertedAt: new Date(),
        convertedById,
      },
    });

    // Update bulk import converted count
    await prisma.bulkImport.update({
      where: { id: record.bulkImportId },
      data: {
        convertedCount: { increment: 1 },
      },
    });

    return lead;
  }

  async bulkConvertToLeads(
    recordIds: string[],
    organizationId: string,
    convertedById: string
  ) {
    // Get records that are INTERESTED and not yet converted
    const records = await prisma.rawImportRecord.findMany({
      where: {
        id: { in: recordIds },
        organizationId,
        status: 'INTERESTED',
        convertedLeadId: null,
      },
      include: { bulkImport: true },
    });

    if (records.length === 0) {
      throw new BadRequestError('No eligible records found for conversion');
    }

    const convertedLeads = [];

    for (const record of records) {
      try {
        const lead = await this.convertToLead(
          record.id,
          organizationId,
          convertedById
        );
        convertedLeads.push(lead);
      } catch (error) {
        console.error(`Failed to convert record ${record.id}:`, error);
      }
    }

    return {
      totalRequested: recordIds.length,
      eligibleRecords: records.length,
      convertedCount: convertedLeads.length,
    };
  }

  async bulkUpdateStatus(
    recordIds: string[],
    organizationId: string,
    status: RawImportRecordStatus
  ) {
    const result = await prisma.rawImportRecord.updateMany({
      where: {
        id: { in: recordIds },
        organizationId,
      },
      data: {
        status,
        updatedAt: new Date(),
      },
    });

    return {
      updatedCount: result.count,
    };
  }

  // ==================== STATS ====================

  async getStats(organizationId: string): Promise<BulkImportStats> {
    const [
      totalImports,
      totalRecords,
      statusCounts,
    ] = await Promise.all([
      prisma.bulkImport.count({ where: { organizationId } }),
      prisma.rawImportRecord.count({ where: { organizationId } }),
      prisma.rawImportRecord.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: { status: true },
      }),
    ]);

    const countByStatus = statusCounts.reduce((acc, item) => {
      acc[item.status] = item._count.status;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalImports,
      totalRecords,
      pendingRecords: countByStatus['PENDING'] || 0,
      assignedRecords: countByStatus['ASSIGNED'] || 0,
      interestedRecords: countByStatus['INTERESTED'] || 0,
      convertedRecords: countByStatus['CONVERTED'] || 0,
      notInterestedRecords: countByStatus['NOT_INTERESTED'] || 0,
    };
  }

  // ==================== DUPLICATE DETECTION ====================

  async detectDuplicates(
    organizationId: string,
    records: Array<{ phone: string; email?: string }>
  ): Promise<{
    unique: typeof records;
    duplicates: Array<{ phone: string; email?: string; reason: string }>;
  }> {
    const phones = records.map((r) => r.phone);
    const emails = records.filter((r) => r.email).map((r) => r.email!.toLowerCase());

    const BATCH_SIZE = 10000;
    const existingPhones = new Set<string>();
    const existingEmails = new Set<string>();

    // Check against leads table
    for (let i = 0; i < phones.length; i += BATCH_SIZE) {
      const phoneBatch = phones.slice(i, i + BATCH_SIZE);
      const results = await prisma.lead.findMany({
        where: {
          organizationId,
          phone: { in: phoneBatch },
        },
        select: { phone: true },
      });
      results.forEach((l) => existingPhones.add(l.phone));
    }

    // Check against raw_import_records table
    for (let i = 0; i < phones.length; i += BATCH_SIZE) {
      const phoneBatch = phones.slice(i, i + BATCH_SIZE);
      const results = await prisma.rawImportRecord.findMany({
        where: {
          organizationId,
          phone: { in: phoneBatch },
        },
        select: { phone: true },
      });
      results.forEach((r) => existingPhones.add(r.phone));
    }

    // Check emails in leads
    for (let i = 0; i < emails.length; i += BATCH_SIZE) {
      const emailBatch = emails.slice(i, i + BATCH_SIZE);
      const results = await prisma.lead.findMany({
        where: {
          organizationId,
          email: { in: emailBatch, mode: 'insensitive' },
        },
        select: { email: true },
      });
      results.forEach((l) => {
        if (l.email) existingEmails.add(l.email.toLowerCase());
      });
    }

    // Check emails in raw imports
    for (let i = 0; i < emails.length; i += BATCH_SIZE) {
      const emailBatch = emails.slice(i, i + BATCH_SIZE);
      const results = await prisma.rawImportRecord.findMany({
        where: {
          organizationId,
          email: { in: emailBatch, mode: 'insensitive' },
        },
        select: { email: true },
      });
      results.forEach((r) => {
        if (r.email) existingEmails.add(r.email.toLowerCase());
      });
    }

    const unique: typeof records = [];
    const duplicates: Array<{ phone: string; email?: string; reason: string }> = [];
    const seenPhones = new Set<string>();
    const seenEmails = new Set<string>();

    for (const record of records) {
      let isDuplicate = false;
      let reason = '';

      if (existingPhones.has(record.phone)) {
        isDuplicate = true;
        reason = 'Phone number already exists';
      } else if (record.email && existingEmails.has(record.email.toLowerCase())) {
        isDuplicate = true;
        reason = 'Email already exists';
      } else if (seenPhones.has(record.phone)) {
        isDuplicate = true;
        reason = 'Duplicate phone in uploaded file';
      } else if (record.email && seenEmails.has(record.email.toLowerCase())) {
        isDuplicate = true;
        reason = 'Duplicate email in uploaded file';
      }

      if (isDuplicate) {
        duplicates.push({ phone: record.phone, email: record.email, reason });
      } else {
        unique.push(record);
        seenPhones.add(record.phone);
        if (record.email) {
          seenEmails.add(record.email.toLowerCase());
        }
      }
    }

    return { unique, duplicates };
  }
}

export const rawImportService = new RawImportService();
