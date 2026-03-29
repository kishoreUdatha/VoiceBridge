import { Router, Response } from 'express';
import { prisma } from '../config/database';
import { authenticate, authorize } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { ApiResponse } from '../utils/apiResponse';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { telecallerCallFinalizationService } from '../services/telecaller-call-finalization.service';
import { calendarService } from '../services/calendar.service';

const router = Router();

// Configure multer for audio file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'recordings');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `telecall-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.mp3', '.wav', '.m4a', '.ogg', '.webm', '.aac'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: mp3, wav, m4a, ogg, webm, aac'));
    }
  },
});

// Apply authentication
router.use(authenticate);
router.use(tenantMiddleware);

// ==================== QUALIFIED LEADS TRACKING ====================
// Shows telecaller the status of leads they qualified (for tracking conversions)

router.get('/my-qualified-leads', async (req: TenantRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { status, limit = '20', offset = '0' } = req.query;

    // Find leads that were qualified by this telecaller
    // Exclude "NEW" status - only show leads that have progressed
    const whereClause: any = {
      organizationId: req.organization!.id,
      customFields: {
        path: ['qualifiedBy'],
        equals: userId,
      },
      // Exclude NEW stage - these haven't been qualified yet
      stage: {
        name: { notIn: ['New', 'NEW', 'new'] },
      },
    };

    // Filter by specific stage name if status provided
    if (status && status !== 'all') {
      whereClause.stage = {
        name: { equals: status as string, mode: 'insensitive' },
      };
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where: whereClause,
        include: {
          stage: { select: { id: true, name: true } },
          assignments: {
            where: { isActive: true },
            include: {
              assignedTo: { select: { firstName: true, lastName: true } },
            },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      }),
      prisma.lead.count({ where: whereClause }),
    ]);

    // Return leads with full info for frontend
    ApiResponse.success(res, 'Qualified leads retrieved', { leads, total });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Get stats for leads qualified by this telecaller
router.get('/my-qualified-leads/stats', async (req: TenantRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Get all leads qualified by this user with their stages
    // Exclude "NEW" status - only count leads that have progressed
    const leads = await prisma.lead.findMany({
      where: {
        organizationId: req.organization!.id,
        customFields: {
          path: ['qualifiedBy'],
          equals: userId,
        },
        // Exclude NEW stage
        stage: {
          name: { notIn: ['New', 'NEW', 'new'] },
        },
      },
      select: {
        id: true,
        isConverted: true,
        stage: { select: { name: true } },
      },
    });

    const result = {
      total: leads.length,
      converted: 0,
      lost: 0,
      pending: 0,
      conversionRate: 0,
    };

    leads.forEach((lead) => {
      const stageName = lead.stage?.name?.toUpperCase() || '';

      if (lead.isConverted || stageName === 'WON' || stageName === 'ENROLLED') {
        result.converted++;
      } else if (stageName === 'LOST') {
        result.lost++;
      } else {
        result.pending++;
      }
    });

    // Calculate conversion rate
    if (result.total > 0) {
      result.conversionRate = Math.round((result.converted / result.total) * 100);
    }

    ApiResponse.success(res, 'Stats retrieved', result);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// ==================== ASSIGNED RAW DATA (Pre-Lead) ====================

// Get telecaller's assigned raw data (not yet leads)
router.get('/assigned-data', async (req: TenantRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { status, search, limit = '50', offset = '0' } = req.query;

    const whereClause: any = {
      organizationId: req.organization!.id,
      assignedToId: userId,
      convertedLeadId: null, // Not yet converted
    };

    // Filter by status
    if (status && status !== 'ALL') {
      whereClause.status = status;
    } else {
      // Default: show all actionable statuses (everything except CONVERTED and NOT_INTERESTED)
      whereClause.status = { in: ['ASSIGNED', 'CALLING', 'CALLBACK_REQUESTED', 'NO_ANSWER', 'INTERESTED'] };
    }

    // Search
    if (search) {
      whereClause.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [records, total] = await Promise.all([
      prisma.rawImportRecord.findMany({
        where: whereClause,
        include: {
          bulkImport: { select: { fileName: true } },
          assignedBy: { select: { firstName: true, lastName: true } },
        },
        orderBy: [
          { status: 'asc' }, // ASSIGNED first
          { assignedAt: 'desc' },
        ],
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      }),
      prisma.rawImportRecord.count({ where: whereClause }),
    ]);

    ApiResponse.success(res, 'Assigned data retrieved', { records, total });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Get assigned data stats
router.get('/assigned-data/stats', async (req: TenantRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const stats = await prisma.rawImportRecord.groupBy({
      by: ['status'],
      where: {
        organizationId: req.organization!.id,
        assignedToId: userId,
        convertedLeadId: null,
      },
      _count: { status: true },
    });

    const result = {
      total: 0,
      pending: 0,
      assigned: 0,
      calling: 0,
      interested: 0,
      notInterested: 0,
      noAnswer: 0,
      callback: 0,
      converted: 0,
    };

    stats.forEach((s) => {
      const count = s._count.status;
      result.total += count;
      switch (s.status) {
        case 'PENDING': result.pending = count; break;
        case 'ASSIGNED': result.assigned = count; break;
        case 'CALLING': result.calling = count; break;
        case 'INTERESTED': result.interested = count; break;
        case 'NOT_INTERESTED': result.notInterested = count; break;
        case 'NO_ANSWER': result.noAnswer = count; break;
        case 'CALLBACK_REQUESTED': result.callback = count; break;
        case 'CONVERTED': result.converted = count; break;
      }
    });

    ApiResponse.success(res, 'Stats retrieved', result);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Reset stale CALLING records back to ASSIGNED (cleanup endpoint)
router.post('/assigned-data/reset-stale', async (req: TenantRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const organizationId = req.organization!.id;

    // Records stuck in CALLING status for more than 30 minutes are considered stale
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    const result = await prisma.rawImportRecord.updateMany({
      where: {
        organizationId,
        assignedToId: userId,
        status: 'CALLING',
        lastCallAt: { lt: thirtyMinutesAgo },
      },
      data: {
        status: 'ASSIGNED',
      },
    });

    ApiResponse.success(res, `Reset ${result.count} stale records`, { resetCount: result.count });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Get single assigned data record
router.get('/assigned-data/:id', async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const record = await prisma.rawImportRecord.findFirst({
      where: {
        id,
        organizationId: req.organization!.id,
        assignedToId: userId,
      },
      include: {
        bulkImport: { select: { fileName: true, createdAt: true } },
        assignedBy: { select: { firstName: true, lastName: true } },
      },
    });

    if (!record) {
      return ApiResponse.notFound(res, 'Record not found');
    }

    ApiResponse.success(res, 'Record retrieved', record);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Update assigned data status (after call)
router.put('/assigned-data/:id/status', async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { status, notes, callSummary, interestLevel } = req.body;

    // Validate status
    const validStatuses = ['CALLING', 'INTERESTED', 'NOT_INTERESTED', 'NO_ANSWER', 'CALLBACK_REQUESTED'];
    if (!validStatuses.includes(status)) {
      return ApiResponse.error(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
    }

    // Verify ownership
    const existing = await prisma.rawImportRecord.findFirst({
      where: {
        id,
        organizationId: req.organization!.id,
        assignedToId: userId,
        convertedLeadId: null,
      },
    });

    if (!existing) {
      return ApiResponse.notFound(res, 'Record not found or already converted');
    }

    const record = await prisma.rawImportRecord.update({
      where: { id },
      data: {
        status,
        ...(notes && { notes }),
        ...(callSummary && { callSummary }),
        ...(interestLevel && { interestLevel }),
        lastCallAt: new Date(),
        callAttempts: { increment: 1 },
      },
    });

    ApiResponse.success(res, 'Status updated', record);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Start a call to assigned data contact (creates call record for AI analysis)
router.post('/assigned-data/:id/call', async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Verify ownership
    const record = await prisma.rawImportRecord.findFirst({
      where: {
        id,
        organizationId: req.organization!.id,
        assignedToId: userId,
        convertedLeadId: null,
      },
    });

    if (!record) {
      return ApiResponse.notFound(res, 'Record not found or already converted');
    }

    // If record is stuck in CALLING status for more than 30 minutes, allow re-initiating
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    if (record.status === 'CALLING' && record.lastCallAt && record.lastCallAt > thirtyMinutesAgo) {
      return ApiResponse.error(res, 'A call is already in progress for this record. Please wait or finish the current call.', 400);
    }

    // Update status to CALLING
    await prisma.rawImportRecord.update({
      where: { id },
      data: {
        status: 'CALLING',
        lastCallAt: new Date(),
        callAttempts: { increment: 1 },
      },
    });

    // Create telecaller call record for AI analysis later
    const call = await prisma.telecallerCall.create({
      data: {
        organizationId: req.organization!.id,
        telecallerId: userId,
        leadId: null, // Not a lead yet
        phoneNumber: record.phone,
        contactName: `${record.firstName} ${record.lastName || ''}`.trim(),
        status: 'INITIATED',
        startedAt: new Date(),
        // Store raw import record ID in metadata for linking
        notes: `Raw Import Record: ${id}`,
      },
    });

    ApiResponse.success(res, 'Call initiated', { call, rawRecordId: id }, 201);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Upload recording for assigned data call (triggers AI analysis)
router.post('/assigned-data/:id/recording', upload.single('recording'), async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { callId, duration } = req.body;
    const userId = req.user!.id;

    // Parse duration to number
    const callDuration = duration ? parseInt(duration, 10) : 0;

    if (!req.file) {
      return ApiResponse.error(res, 'Recording file is required', 400);
    }

    // Verify raw record ownership
    const record = await prisma.rawImportRecord.findFirst({
      where: {
        id,
        organizationId: req.organization!.id,
        assignedToId: userId,
      },
    });

    if (!record) {
      try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore cleanup errors */ }
      return ApiResponse.notFound(res, 'Record not found');
    }

    // Find or create call record
    let call;
    if (callId) {
      call = await prisma.telecallerCall.findFirst({
        where: { id: callId, telecallerId: userId },
      });
    }

    if (!call) {
      // Create call record if not exists
      call = await prisma.telecallerCall.create({
        data: {
          organizationId: req.organization!.id,
          telecallerId: userId,
          phoneNumber: record.phone,
          contactName: `${record.firstName} ${record.lastName || ''}`.trim(),
          status: 'COMPLETED',
          startedAt: new Date(),
          endedAt: new Date(),
          duration: callDuration,
          notes: `Raw Import Record: ${id}`,
        },
      });
    }

    // Update call with recording URL and duration
    const recordingUrl = `/uploads/recordings/${req.file.filename}`;
    await prisma.telecallerCall.update({
      where: { id: call.id },
      data: {
        recordingUrl,
        status: 'COMPLETED',
        duration: callDuration,
        endedAt: new Date(),
      },
    });

    // Process with AI analysis - this will update status based on outcome
    telecallerCallFinalizationService.processRecordingForRawImport(call.id, req.file.path, id).catch(async (error) => {
      console.error('[Telecaller] AI processing failed for call:', call.id, error);
      // Update call with error status so UI knows processing failed
      try {
        await prisma.telecallerCall.update({
          where: { id: call.id },
          data: {
            aiAnalyzed: false,
            notes: `AI analysis failed: ${(error as Error).message}. Please retry or manually update outcome.`,
          },
        });
        // Reset raw import record status so telecaller can retry
        await prisma.rawImportRecord.update({
          where: { id },
          data: {
            status: 'ASSIGNED', // Reset to allow retry
          },
        });
      } catch (updateError) {
        console.error('[Telecaller] Failed to update error status:', updateError);
      }
    });

    ApiResponse.success(res, 'Recording uploaded. AI analysis will determine call outcome.', {
      callId: call.id,
      rawRecordId: id,
    });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Convert assigned data to lead (when interested)
router.post('/assigned-data/:id/convert', async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const organizationId = req.organization!.id;
    const { notes, priority = 'MEDIUM' } = req.body;

    // Verify ownership and status
    const record = await prisma.rawImportRecord.findFirst({
      where: {
        id,
        organizationId,
        assignedToId: userId,
        convertedLeadId: null,
      },
      include: {
        bulkImport: { select: { fileName: true } },
      },
    });

    if (!record) {
      return ApiResponse.notFound(res, 'Record not found or already converted');
    }

    // Use transaction to ensure atomicity - all operations succeed or all fail
    const result = await prisma.$transaction(async (tx) => {
      // Create lead
      const lead = await tx.lead.create({
        data: {
          organizationId,
          firstName: record.firstName,
          lastName: record.lastName || undefined,
          email: record.email || undefined,
          phone: record.phone,
          alternatePhone: record.alternatePhone || undefined,
          source: 'BULK_UPLOAD',
          sourceDetails: `Bulk Import: ${record.bulkImport?.fileName || 'Unknown'}`,
          priority,
          status: 'NEW',
          customFields: record.customFields || undefined,
        },
      });

      // Create assignment for the telecaller
      await tx.leadAssignment.create({
        data: {
          leadId: lead.id,
          assignedToId: userId,
          assignedById: userId,
          isActive: true,
        },
      });

      // Add note if provided or has call summary
      const noteContent = notes || record.callSummary || record.notes;
      if (noteContent) {
        await tx.leadNote.create({
          data: {
            leadId: lead.id,
            userId,
            content: noteContent,
            type: 'GENERAL',
          },
        });
      }

      // Log activity
      await tx.leadActivity.create({
        data: {
          leadId: lead.id,
          type: 'LEAD_CREATED',
          title: 'Lead created from raw import',
          description: `Converted by telecaller after call. Interest level: ${record.interestLevel || 'Unknown'}`,
          userId,
        },
      });

      // Update raw record as converted
      await tx.rawImportRecord.update({
        where: { id },
        data: {
          status: 'CONVERTED',
          convertedLeadId: lead.id,
          convertedAt: new Date(),
          convertedById: userId,
        },
      });

      // Update bulk import converted count
      if (record.bulkImportId) {
        await tx.bulkImport.update({
          where: { id: record.bulkImportId },
          data: { convertedCount: { increment: 1 } },
        });
      }

      return lead;
    });

    ApiResponse.success(res, 'Converted to lead successfully', { lead: result, rawRecordId: id }, 201);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// ==================== TELECALLER DASHBOARD ====================

// Get telecaller's assigned leads (admin sees all leads)
router.get('/leads', async (req: TenantRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.roleSlug;
    const { status, search, limit = '50', offset = '0' } = req.query;

    const whereClause: any = {
      organizationId: req.organization!.id,
    };

    // Admin/Manager can see all leads, telecaller only sees assigned leads
    if (userRole !== 'admin' && userRole !== 'manager') {
      whereClause.assignments = {
        some: {
          assignedToId: userId,
          isActive: true,
        },
      };
    }

    if (status) {
      whereClause.status = status;
    }

    if (search) {
      whereClause.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where: whereClause,
        include: {
          assignments: {
            where: { isActive: true },
            include: { assignedTo: { select: { id: true, firstName: true, lastName: true } } },
            take: 1,
          },
          _count: { select: { activities: true, notes: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      }),
      prisma.lead.count({ where: whereClause }),
    ]);

    ApiResponse.success(res, 'Leads retrieved', { leads, total });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Get ALL telecaller calls in organization (All roles can view)
router.get('/all-calls', async (req: TenantRequest, res: Response) => {
  // Prevent caching of this endpoint
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');

  try {
    const organizationId = req.organization!.id;
    console.log(`[TelecallerAllCalls] Fetching calls for org: ${organizationId}`);
    const {
      telecallerId,
      leadId,
      dateFrom,
      dateTo,
      outcome,
      status,
      limit = '50',
      offset = '0'
    } = req.query;

    const whereClause: any = {
      organizationId,
    };

    if (telecallerId) {
      whereClause.telecallerId = telecallerId;
    }

    if (leadId) {
      whereClause.leadId = leadId;
    }

    if (outcome) {
      if (outcome === 'PENDING') {
        whereClause.outcome = null;
      } else {
        whereClause.outcome = outcome as string;
      }
    }

    if (status) {
      whereClause.status = status as string;
    }

    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) whereClause.createdAt.gte = new Date(dateFrom as string);
      if (dateTo) whereClause.createdAt.lte = new Date(dateTo as string);
    }

    const [calls, total] = await Promise.all([
      prisma.telecallerCall.findMany({
        where: whereClause,
        include: {
          lead: {
            select: { id: true, firstName: true, lastName: true, phone: true },
          },
          telecaller: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      }),
      prisma.telecallerCall.count({ where: whereClause }),
    ]);

    // Get outcome counts
    const outcomeCounts = await prisma.telecallerCall.groupBy({
      by: ['outcome'],
      where: { organizationId },
      _count: { _all: true },
    });

    // Get status counts
    const statusCounts = await prisma.telecallerCall.groupBy({
      by: ['status'],
      where: { organizationId },
      _count: { _all: true },
    });

    const totalCalls = await prisma.telecallerCall.count({ where: { organizationId } });
    const pendingCalls = await prisma.telecallerCall.count({
      where: { organizationId, outcome: null }
    });

    const counts: Record<string, number> = {
      ALL: totalCalls,
      PENDING: pendingCalls,
    };
    outcomeCounts.forEach((o) => {
      if (o.outcome) counts[o.outcome] = o._count._all;
    });

    const statuses: Record<string, number> = {};
    statusCounts.forEach((s) => {
      if (s.status) statuses[s.status] = s._count._all;
    });

    console.log(`[TelecallerAllCalls] Returning ${calls.length} calls, total: ${total}`);
    ApiResponse.success(res, 'All telecaller calls retrieved', {
      calls,
      total,
      outcomeCounts: counts,
      statusCounts: statuses
    });
  } catch (error) {
    console.error('[TelecallerAllCalls] Error:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Get telecaller's call history
router.get('/calls', async (req: TenantRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { leadId, dateFrom, dateTo, outcome, limit = '50', offset = '0' } = req.query;

    const whereClause: any = {
      telecallerId: userId,
    };

    if (leadId) {
      whereClause.leadId = leadId;
    }

    if (outcome) {
      if (outcome === 'PENDING') {
        whereClause.outcome = null; // Filter for calls without outcome
      } else {
        whereClause.outcome = outcome as string;
      }
    }

    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) whereClause.createdAt.gte = new Date(dateFrom as string);
      if (dateTo) whereClause.createdAt.lte = new Date(dateTo as string);
    }

    const [calls, total] = await Promise.all([
      prisma.telecallerCall.findMany({
        where: whereClause,
        include: {
          lead: {
            select: { id: true, firstName: true, lastName: true, phone: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      }),
      prisma.telecallerCall.count({ where: whereClause }),
    ]);

    // Get outcome counts for filter badges
    const outcomeCounts = await prisma.telecallerCall.groupBy({
      by: ['outcome'],
      where: { telecallerId: userId },
      _count: { _all: true },
    });

    const totalCalls = await prisma.telecallerCall.count({ where: { telecallerId: userId } });
    const pendingCalls = await prisma.telecallerCall.count({
      where: { telecallerId: userId, outcome: null }
    });

    const counts: Record<string, number> = {
      ALL: totalCalls,
      PENDING: pendingCalls,
    };
    outcomeCounts.forEach((o) => {
      if (o.outcome) counts[o.outcome] = o._count._all;
    });

    ApiResponse.success(res, 'Calls retrieved', { calls, total, outcomeCounts: counts });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Get single call details (for telecaller's own calls)
router.get('/calls/:id', async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const call = await prisma.telecallerCall.findFirst({
      where: { id, telecallerId: userId },
      include: {
        lead: true,
        telecaller: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!call) {
      return ApiResponse.error(res, 'Call not found', 404);
    }

    ApiResponse.success(res, 'Call retrieved', call);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Get call summary (role-based access: telecallers see own calls, admins/managers see all)
router.get('/calls/:id/summary', async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const organizationId = req.organization!.id;

    // Build where clause based on role
    const whereClause: any = { id, organizationId };

    // Telecallers can only see their own calls
    // Admins, managers, and counselors can see all calls in the organization
    if (userRole === 'TELECALLER') {
      whereClause.telecallerId = userId;
    }

    const call = await prisma.telecallerCall.findFirst({
      where: whereClause,
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
        telecaller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!call) {
      return ApiResponse.error(res, 'Call not found or access denied', 404);
    }

    // Fetch lead journey - all previous calls to this lead or phone number
    const previousCalls = await prisma.telecallerCall.findMany({
      where: {
        organizationId,
        id: { not: call.id }, // Exclude current call
        OR: [
          ...(call.leadId ? [{ leadId: call.leadId }] : []),
          { phoneNumber: call.phoneNumber },
        ],
      },
      orderBy: { startedAt: 'asc' },
      select: {
        id: true,
        startedAt: true,
        duration: true,
        outcome: true,
        sentiment: true,
        summary: true,
        extractedData: true,
        telecaller: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    // Format lead journey for frontend
    const leadJourney = previousCalls.map((prevCall, index) => ({
      id: prevCall.id,
      callNumber: index + 1,
      date: prevCall.startedAt?.toISOString() || '',
      duration: prevCall.duration || 0,
      outcome: prevCall.outcome || 'UNKNOWN',
      sentiment: prevCall.sentiment || 'neutral',
      summary: prevCall.summary || '',
      isFollowUp: index > 0,
      followUpNumber: index > 0 ? index : 0,
      agentName: prevCall.telecaller ? `${prevCall.telecaller.firstName} ${prevCall.telecaller.lastName || ''}`.trim() : 'Unknown',
      extractedData: prevCall.extractedData || null,
    }));

    const currentCallNumber = previousCalls.length + 1;
    const totalCallsToLead = previousCalls.length + 1;
    const isFollowUpCall = previousCalls.length > 0;

    // Return call data in format compatible with CallSummaryPage
    // Include all enhanced analysis fields for full AI analysis display
    ApiResponse.success(res, 'Call summary retrieved', {
      id: call.id,
      phoneNumber: call.phoneNumber,
      contactName: call.contactName,
      status: call.status,
      outcome: call.outcome,
      duration: call.duration,
      startedAt: call.startedAt,
      endedAt: call.endedAt,
      recordingUrl: call.recordingUrl,
      transcript: call.transcript,
      sentiment: call.sentiment,
      summary: call.summary,
      aiAnalyzed: call.aiAnalyzed,
      callQualityScore: call.callQualityScore,
      qualification: call.qualification,
      notes: call.notes,
      createdAt: call.createdAt,
      updatedAt: call.updatedAt,
      lead: call.lead,
      telecaller: call.telecaller,
      // Enhanced analysis fields (same as OutboundCall)
      keyQuestionsAsked: call.keyQuestionsAsked,
      keyIssuesDiscussed: call.keyIssuesDiscussed,
      sentimentIntensity: call.sentimentIntensity,
      agentSpeakingTime: call.agentSpeakingTime,
      customerSpeakingTime: call.customerSpeakingTime,
      nonSpeechTime: call.nonSpeechTime,
      enhancedTranscript: call.enhancedTranscript,
      // AI Coaching fields
      coachingPositiveHighlights: call.coachingPositiveHighlights,
      coachingAreasToImprove: call.coachingAreasToImprove,
      coachingNextCallTips: call.coachingNextCallTips,
      coachingSummary: call.coachingSummary,
      coachingTalkListenFeedback: call.coachingTalkListenFeedback,
      coachingEmpathyScore: call.coachingEmpathyScore,
      coachingObjectionScore: call.coachingObjectionScore,
      coachingClosingScore: call.coachingClosingScore,
      // Extracted data
      extractedData: call.extractedData,
      // Lead journey - previous calls to this contact
      leadJourney,
      currentCallNumber,
      totalCallsToLead,
      isFollowUpCall,
    });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Start a new call (log call initiation)
router.post('/calls', async (req: TenantRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { leadId, phoneNumber, contactName } = req.body;

    if (!phoneNumber) {
      return ApiResponse.error(res, 'Phone number is required', 400);
    }

    // Create call record
    const call = await prisma.telecallerCall.create({
      data: {
        organizationId: req.organization!.id,
        telecallerId: userId,
        leadId: leadId || null,
        phoneNumber,
        contactName: contactName || null,
        status: 'INITIATED',
        startedAt: new Date(),
      },
    });

    // Log activity on lead if exists
    if (leadId) {
      await prisma.leadActivity.create({
        data: {
          leadId,
          type: 'CALL_MADE',
          title: 'Call initiated',
          description: `Telecaller initiated call to ${phoneNumber}`,
          userId,
        },
      });
    }

    ApiResponse.success(res, 'Call initiated', call, 201);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Update call with outcome (after call ends)
router.put('/calls/:id', async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { status, outcome, notes, duration, endedAt } = req.body;

    const existing = await prisma.telecallerCall.findFirst({
      where: { id, telecallerId: userId },
    });

    if (!existing) {
      return ApiResponse.error(res, 'Call not found', 404);
    }

    const call = await prisma.telecallerCall.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(outcome && { outcome }),
        ...(notes && { notes }),
        ...(duration && { duration }),
        endedAt: endedAt ? new Date(endedAt) : new Date(),
      },
    });

    // Log activity if leadId exists
    if (existing.leadId && outcome) {
      // Log activity
      await prisma.leadActivity.create({
        data: {
          leadId: existing.leadId,
          type: 'CALL_MADE',
          title: 'Call completed',
          description: `Call completed - Outcome: ${outcome}${notes ? `. Notes: ${notes}` : ''}`,
          userId,
        },
      });
    }

    ApiResponse.success(res, 'Call updated', call);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Upload call recording
router.post('/calls/:id/recording', upload.single('recording'), async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { duration } = req.body;
    const userId = req.user!.id;

    if (!req.file) {
      return ApiResponse.error(res, 'Recording file is required', 400);
    }

    const existing = await prisma.telecallerCall.findFirst({
      where: { id, telecallerId: userId },
    });

    if (!existing) {
      // Delete uploaded file safely
      try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore cleanup errors */ }
      return ApiResponse.error(res, 'Call not found', 404);
    }

    // Update call with recording URL and duration
    const recordingUrl = `/uploads/recordings/${req.file.filename}`;
    const callDuration = duration ? parseInt(duration, 10) : null;

    console.log(`[Telecaller] Updating call ${id} with recording and duration: ${callDuration}s`);

    let call = await prisma.telecallerCall.update({
      where: { id },
      data: {
        recordingUrl,
        status: 'COMPLETED',
        endedAt: new Date(),
        ...(callDuration && callDuration > 0 ? { duration: callDuration } : {}),
      },
    });

    // Process with full AI analysis asynchronously (transcription, sentiment, outcome, scoring, etc.)
    telecallerCallFinalizationService.processRecording(id, req.file.path).catch(async (error) => {
      console.error('[Telecaller] AI processing failed for call:', id, error);
      // Update call with error status so UI knows processing failed
      try {
        await prisma.telecallerCall.update({
          where: { id },
          data: {
            aiAnalyzed: false,
            notes: `AI analysis failed: ${(error as Error).message}. Use reanalyze endpoint to retry.`,
          },
        });
      } catch (updateError) {
        console.error('[Telecaller] Failed to update error status:', updateError);
      }
    });

    ApiResponse.success(res, 'Recording uploaded. AI analysis in progress...', call);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Note: AI analysis is now handled by telecaller-call-finalization.service.ts
// which provides full AI-powered analysis including:
// - Transcription (Sarvam/Whisper)
// - Sentiment Analysis (OpenAI)
// - Outcome Detection (OpenAI)
// - Summary Generation (OpenAI)
// - Lead Scoring
// - Lead Lifecycle Integration
// - Auto Follow-up Scheduling

// Get telecaller stats/dashboard - used by mobile app
router.get('/stats', async (req: TenantRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      assignedLeads,
      todayCalls,
      totalCalls,
      outcomes,
      avgDuration,
    ] = await Promise.all([
      // Total assigned leads
      prisma.lead.count({
        where: {
          organizationId: req.organization!.id,
          assignments: { some: { assignedToId: userId, isActive: true } },
        },
      }),
      // Today's calls
      prisma.telecallerCall.count({
        where: { telecallerId: userId, createdAt: { gte: today } },
      }),
      // Total calls
      prisma.telecallerCall.count({
        where: { telecallerId: userId },
      }),
      // Outcome distribution
      prisma.telecallerCall.groupBy({
        by: ['outcome'],
        where: { telecallerId: userId, outcome: { not: null } },
        _count: { outcome: true },
      }),
      // Average call duration
      prisma.telecallerCall.aggregate({
        where: { telecallerId: userId, duration: { not: null } },
        _avg: { duration: true },
      }),
    ]);

    // Calculate conversion rate
    const interested = outcomes.find(o => o.outcome === 'INTERESTED')?._count?.outcome || 0;
    const converted = outcomes.find(o => o.outcome === 'CONVERTED')?._count?.outcome || 0;
    const conversionRate = totalCalls > 0 ? Math.round(((interested + converted) / totalCalls) * 100) : 0;

    // Build callsByOutcome map (matches mobile app TelecallerStats interface)
    const callsByOutcome = outcomes.reduce((acc, o) => {
      if (o.outcome) acc[o.outcome] = o._count.outcome;
      return acc;
    }, {} as Record<string, number>);

    ApiResponse.success(res, 'Stats retrieved', {
      assignedLeads,
      todayCalls,
      totalCalls,
      conversionRate,
      averageCallDuration: avgDuration._avg.duration || 0,
      callsByOutcome,
    });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// ==================== COMPREHENSIVE DASHBOARD STATS ====================
// Get detailed performance stats for telecaller dashboard
router.get('/dashboard-stats', async (req: TenantRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const organizationId = req.organization!.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    // Get start of current week (Monday)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
    startOfWeek.setHours(0, 0, 0, 0);

    // ========== DYNAMIC TARGETS FROM ASSIGNED DATA ==========
    // Daily Call Target = Assigned leads that need to be called
    const [
      assignedLeadsCount,
      assignedRawRecordsCount,
      totalRawRecordsAssigned,
      queueItemsCount,
      todayFollowUpsTarget,
    ] = await Promise.all([
      // Active lead assignments
      prisma.leadAssignment.count({
        where: { assignedToId: userId, isActive: true },
      }),
      // Assigned raw import records (pending/assigned status - to be called)
      prisma.rawImportRecord.count({
        where: {
          assignedToId: userId,
          status: { in: ['ASSIGNED', 'PENDING'] },
        },
      }),
      // Total raw import records assigned (all statuses - for showing total assigned)
      prisma.rawImportRecord.count({
        where: {
          assignedToId: userId,
        },
      }),
      // Telecaller queue items
      prisma.telecallerQueue.count({
        where: {
          assignedToId: userId,
          status: { in: ['PENDING', 'CLAIMED'] },
        },
      }),
      // Today's scheduled follow-ups
      prisma.followUp.count({
        where: {
          assigneeId: userId,
          status: 'UPCOMING',
          scheduledAt: { gte: today, lte: todayEnd },
        },
      }),
    ]);

    // Total assigned data = target for calls
    const dailyCallTarget = assignedLeadsCount + assignedRawRecordsCount + queueItemsCount;
    const dailyFollowUpTarget = todayFollowUpsTarget;

    // 1. Get weekly call data with dynamic daily targets
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyActivity = [];

    // Calculate per-day target (distribute total across weekdays)
    const perDayTarget = Math.ceil(dailyCallTarget / 5); // Assuming 5 working days

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dayName = days[date.getDay()];
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const callsOnDay = await prisma.telecallerCall.count({
        where: {
          telecallerId: userId,
          createdAt: { gte: dayStart, lte: dayEnd },
        },
      });

      // Weekend targets are lower
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const dayTarget = isWeekend ? Math.ceil(perDayTarget * 0.5) : perDayTarget;

      weeklyActivity.push({
        day: dayName,
        date: date.toISOString().split('T')[0],
        calls: callsOnDay,
        target: dayTarget || 1, // At least 1 to avoid division issues
      });
    }

    // 2. Get leads by stage
    const leadsWithStages = await prisma.lead.findMany({
      where: {
        organizationId,
        assignments: { some: { assignedToId: userId, isActive: true } },
      },
      select: { stage: { select: { name: true } } },
    });

    const leadsByStage: Record<string, number> = {};
    leadsWithStages.forEach(lead => {
      const stageName = lead.stage?.name || 'New';
      leadsByStage[stageName] = (leadsByStage[stageName] || 0) + 1;
    });

    // 3. Get today's stats
    const [
      todayCalls,
      todayFollowUpsCompleted,
      pendingFollowUps,
      totalLeads,
    ] = await Promise.all([
      prisma.telecallerCall.count({
        where: { telecallerId: userId, createdAt: { gte: today } },
      }),
      prisma.followUp.count({
        where: {
          assigneeId: userId,
          status: 'COMPLETED',
          completedAt: { gte: today },
        },
      }),
      prisma.followUp.count({
        where: {
          assigneeId: userId,
          status: 'UPCOMING',
        },
      }),
      prisma.lead.count({
        where: {
          organizationId,
          assignments: { some: { assignedToId: userId, isActive: true } },
        },
      }),
    ]);

    // 4. Get call outcomes distribution
    const callOutcomes = await prisma.telecallerCall.groupBy({
      by: ['outcome'],
      where: { telecallerId: userId, outcome: { not: null } },
      _count: { outcome: true },
    });

    const outcomes: Record<string, number> = {};
    callOutcomes.forEach(o => {
      if (o.outcome) outcomes[o.outcome] = o._count.outcome;
    });

    // 5. Get conversion stats (leads moved from New to other stages)
    const convertedLeads = await prisma.lead.count({
      where: {
        organizationId,
        assignments: { some: { assignedToId: userId, isActive: true } },
        stage: { name: { notIn: ['New', 'NEW', 'new'] } },
      },
    });

    const wonLeads = await prisma.lead.count({
      where: {
        organizationId,
        assignments: { some: { assignedToId: userId, isActive: true } },
        stage: { name: { in: ['Won', 'WON', 'Enrolled', 'ENROLLED'] } },
      },
    });

    // 6. Get this week's activity summary
    const thisWeekCalls = await prisma.telecallerCall.count({
      where: { telecallerId: userId, createdAt: { gte: startOfWeek } },
    });

    const thisWeekFollowUps = await prisma.followUp.count({
      where: {
        assigneeId: userId,
        status: 'COMPLETED',
        completedAt: { gte: startOfWeek },
      },
    });

    // 7. Recent activities
    const recentActivities = await prisma.leadActivity.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        lead: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Calculate conversion rate
    const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;
    const winRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

    ApiResponse.success(res, 'Dashboard stats retrieved', {
      // Today's metrics with DYNAMIC targets from assigned data
      today: {
        calls: todayCalls,
        followUpsCompleted: todayFollowUpsCompleted,
        pendingFollowUps,
        target: {
          calls: dailyCallTarget || 1, // From assigned leads + raw records + queue
          followUps: dailyFollowUpTarget || 0, // From today's scheduled follow-ups
        },
      },
      // Assigned data breakdown (for transparency)
      assignedData: {
        leads: assignedLeadsCount,
        rawRecords: assignedRawRecordsCount,         // Pending to call (ASSIGNED/PENDING status)
        totalRawRecords: totalRawRecordsAssigned,    // Total assigned (all statuses)
        queueItems: queueItemsCount,
        total: dailyCallTarget,                       // Total pending to call today
      },
      // Weekly performance
      weeklyActivity,
      thisWeek: {
        totalCalls: thisWeekCalls,
        followUpsCompleted: thisWeekFollowUps,
        target: dailyCallTarget * 5, // Weekly target
      },
      // Lead stats
      leads: {
        total: totalLeads,
        byStage: leadsByStage,
        converted: convertedLeads,
        won: wonLeads,
        conversionRate,
        winRate,
      },
      // Call outcomes
      outcomes,
      // Recent activities
      recentActivities: recentActivities.map(a => ({
        id: a.id,
        type: a.type,
        title: a.title,
        leadName: a.lead ? `${a.lead.firstName} ${a.lead.lastName || ''}`.trim() : null,
        leadId: a.lead?.id,
        createdAt: a.createdAt,
      })),
    });
  } catch (error) {
    console.error('[Telecaller Dashboard Stats] Error:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Get AI analysis status for a call
router.get('/calls/:id/analysis', async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const call = await prisma.telecallerCall.findFirst({
      where: { id, telecallerId: userId },
      select: {
        id: true,
        aiAnalyzed: true,
        transcript: true,
        sentiment: true,
        outcome: true,
        summary: true,
        qualification: true,
        recordingUrl: true,
        duration: true,
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            leadScore: true,
          },
        },
      },
    });

    if (!call) {
      return ApiResponse.error(res, 'Call not found', 404);
    }

    ApiResponse.success(res, 'Analysis retrieved', {
      ...call,
      analysisStatus: call.aiAnalyzed ? 'completed' : 'pending',
    });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Manually trigger AI re-analysis for a call
router.post('/calls/:id/reanalyze', async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const call = await prisma.telecallerCall.findFirst({
      where: { id, telecallerId: userId },
    });

    if (!call) {
      return ApiResponse.error(res, 'Call not found', 404);
    }

    if (!call.recordingUrl) {
      return ApiResponse.error(res, 'No recording available for this call', 400);
    }

    // Get file path from recording URL
    const filePath = path.join(process.cwd(), call.recordingUrl);

    if (!fs.existsSync(filePath)) {
      return ApiResponse.error(res, 'Recording file not found', 404);
    }

    // Reset analysis status
    await prisma.telecallerCall.update({
      where: { id },
      data: { aiAnalyzed: false },
    });

    // Trigger re-analysis
    telecallerCallFinalizationService.processRecording(id, filePath).catch(async (error) => {
      console.error('[Telecaller] Re-analysis failed for call:', id, error);
      try {
        await prisma.telecallerCall.update({
          where: { id },
          data: {
            aiAnalyzed: false,
            notes: `Re-analysis failed: ${(error as Error).message}`,
          },
        });
      } catch (updateError) {
        console.error('[Telecaller] Failed to update re-analysis error:', updateError);
      }
    });

    ApiResponse.success(res, 'Re-analysis started', { callId: id });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Send follow-up message (WhatsApp/SMS) after call
router.post('/calls/:id/send-message', async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const organizationId = req.organization!.id;
    const { message, channel = 'whatsapp' } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return ApiResponse.error(res, 'Message is required', 400);
    }

    // Find the call
    const call = await prisma.telecallerCall.findFirst({
      where: { id, telecallerId: userId },
      select: {
        id: true,
        phoneNumber: true,
        contactName: true,
        leadId: true,
        lead: {
          select: {
            phone: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!call) {
      return ApiResponse.error(res, 'Call not found', 404);
    }

    const phoneNumber = call.phoneNumber || call.lead?.phone;
    if (!phoneNumber) {
      return ApiResponse.error(res, 'No phone number available for this call', 400);
    }

    const contactName = call.contactName ||
                        (call.lead ? `${call.lead.firstName || ''} ${call.lead.lastName || ''}`.trim() : 'Customer');

    if (channel === 'whatsapp') {
      // Send WhatsApp message
      const { WhatsAppService } = await import('../integrations/whatsapp.service');
      const whatsappService = new WhatsAppService(organizationId);

      const result = await whatsappService.sendMessage({
        to: phoneNumber,
        message: message.trim(),
      });

      if (result.success) {
        // Log the follow-up message in notes field
        const existingCall = await prisma.telecallerCall.findUnique({ where: { id }, select: { notes: true } });
        const existingNotes = existingCall?.notes || '';
        const timestamp = new Date().toISOString();
        const newNote = `[${timestamp}] WhatsApp sent: ${message.trim().substring(0, 100)}`;

        await prisma.telecallerCall.update({
          where: { id },
          data: {
            notes: existingNotes ? `${existingNotes}\n${newNote}` : newNote,
          },
        });

        ApiResponse.success(res, 'WhatsApp message sent successfully', {
          messageId: result.messageId,
          to: phoneNumber,
          contactName,
        });
      } else {
        ApiResponse.error(res, result.error || 'Failed to send WhatsApp message', 500);
      }
    } else if (channel === 'sms') {
      // Send SMS via Plivo
      const { PlivoService } = await import('../integrations/plivo.service');
      const plivoService = new PlivoService(organizationId);

      const result = await plivoService.sendSms({
        to: phoneNumber,
        message: message.trim(),
        leadId: call.leadId || undefined,
        userId: userId,
      });

      if (result.success) {
        // Log the follow-up message in notes field
        const existingCall = await prisma.telecallerCall.findUnique({ where: { id }, select: { notes: true } });
        const existingNotes = existingCall?.notes || '';
        const timestamp = new Date().toISOString();
        const newNote = `[${timestamp}] SMS sent: ${message.trim().substring(0, 100)}`;

        await prisma.telecallerCall.update({
          where: { id },
          data: {
            notes: existingNotes ? `${existingNotes}\n${newNote}` : newNote,
          },
        });

        ApiResponse.success(res, 'SMS sent successfully', {
          messageId: result.messageUuid,
          to: phoneNumber,
          contactName,
        });
      } else {
        ApiResponse.error(res, result.error || 'Failed to send SMS', 500);
      }
    } else {
      return ApiResponse.error(res, 'Invalid channel. Use "whatsapp" or "sms"', 400);
    }
  } catch (error) {
    console.error('[Telecaller] Send message error:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Get calls with AI analysis summary
router.get('/calls-analyzed', async (req: TenantRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { limit = '20', offset = '0', analyzed } = req.query;

    const whereClause: any = {
      telecallerId: userId,
    };

    if (analyzed === 'true') {
      whereClause.aiAnalyzed = true;
    } else if (analyzed === 'false') {
      whereClause.aiAnalyzed = false;
    }

    const [calls, total] = await Promise.all([
      prisma.telecallerCall.findMany({
        where: whereClause,
        include: {
          lead: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              leadScore: {
                select: {
                  overallScore: true,
                  grade: true,
                  aiClassification: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      }),
      prisma.telecallerCall.count({ where: whereClause }),
    ]);

    ApiResponse.success(res, 'Analyzed calls retrieved', { calls, total });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// ==================== PERFORMANCE ANALYTICS ====================

// Get telecaller performance stats with date range filtering
router.get('/performance', async (req: TenantRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const organizationId = req.organization!.id;
    const { period, startDate, endDate } = req.query;

    // Calculate date range based on period or custom dates
    let dateFrom: Date;
    let dateTo: Date = new Date();
    dateTo.setHours(23, 59, 59, 999);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (period) {
      case 'today':
        dateFrom = new Date(today);
        break;
      case 'yesterday':
        dateFrom = new Date(today);
        dateFrom.setDate(dateFrom.getDate() - 1);
        dateTo = new Date(today);
        dateTo.setMilliseconds(-1); // End of yesterday
        break;
      case 'last7days':
        dateFrom = new Date(today);
        dateFrom.setDate(dateFrom.getDate() - 6);
        break;
      case 'last30days':
        dateFrom = new Date(today);
        dateFrom.setDate(dateFrom.getDate() - 29);
        break;
      case 'thisMonth':
        dateFrom = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'lastMonth':
        dateFrom = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        dateTo = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
        break;
      case 'custom':
        if (!startDate || !endDate) {
          return ApiResponse.error(res, 'Start date and end date are required for custom period', 400);
        }
        dateFrom = new Date(startDate as string);
        dateFrom.setHours(0, 0, 0, 0);
        dateTo = new Date(endDate as string);
        dateTo.setHours(23, 59, 59, 999);
        break;
      default:
        // Default to today
        dateFrom = new Date(today);
    }

    // 1. Call Statistics
    const [
      totalCalls,
      answeredCalls,
      noAnswerCalls,
      callOutcomes,
      avgCallDuration,
    ] = await Promise.all([
      // Total calls in period
      prisma.telecallerCall.count({
        where: {
          telecallerId: userId,
          createdAt: { gte: dateFrom, lte: dateTo },
        },
      }),
      // Answered calls (has duration > 0)
      prisma.telecallerCall.count({
        where: {
          telecallerId: userId,
          createdAt: { gte: dateFrom, lte: dateTo },
          duration: { gt: 0 },
        },
      }),
      // No answer calls
      prisma.telecallerCall.count({
        where: {
          telecallerId: userId,
          createdAt: { gte: dateFrom, lte: dateTo },
          OR: [
            { outcome: 'NO_ANSWER' },
            { duration: 0 },
            { duration: null },
          ],
        },
      }),
      // Call outcomes
      prisma.telecallerCall.groupBy({
        by: ['outcome'],
        where: {
          telecallerId: userId,
          createdAt: { gte: dateFrom, lte: dateTo },
          outcome: { not: null },
        },
        _count: { outcome: true },
      }),
      // Average call duration
      prisma.telecallerCall.aggregate({
        where: {
          telecallerId: userId,
          createdAt: { gte: dateFrom, lte: dateTo },
          duration: { gt: 0 },
        },
        _avg: { duration: true },
        _sum: { duration: true },
      }),
    ]);

    // 2. Assigned Data (Raw Import) Stats
    const [
      totalAssignedContacted,
      interestedCount,
      notInterestedCount,
      callbackCount,
      convertedCount,
    ] = await Promise.all([
      // Total raw records contacted in period
      prisma.rawImportRecord.count({
        where: {
          assignedToId: userId,
          organizationId,
          lastCallAt: { gte: dateFrom, lte: dateTo },
        },
      }),
      // Marked as interested
      prisma.rawImportRecord.count({
        where: {
          assignedToId: userId,
          organizationId,
          status: 'INTERESTED',
          updatedAt: { gte: dateFrom, lte: dateTo },
        },
      }),
      // Not interested
      prisma.rawImportRecord.count({
        where: {
          assignedToId: userId,
          organizationId,
          status: 'NOT_INTERESTED',
          updatedAt: { gte: dateFrom, lte: dateTo },
        },
      }),
      // Callback requested
      prisma.rawImportRecord.count({
        where: {
          assignedToId: userId,
          organizationId,
          status: 'CALLBACK_REQUESTED',
          updatedAt: { gte: dateFrom, lte: dateTo },
        },
      }),
      // Converted to leads
      prisma.rawImportRecord.count({
        where: {
          assignedToId: userId,
          organizationId,
          status: 'CONVERTED',
          convertedAt: { gte: dateFrom, lte: dateTo },
        },
      }),
    ]);

    // 3. Lead Performance
    const [
      leadsCreated,
      leadsWon,
      leadsLost,
      followUpsCompleted,
    ] = await Promise.all([
      // Leads created/qualified in period
      prisma.lead.count({
        where: {
          organizationId,
          customFields: { path: ['qualifiedBy'], equals: userId },
          createdAt: { gte: dateFrom, lte: dateTo },
        },
      }),
      // Leads won
      prisma.lead.count({
        where: {
          organizationId,
          assignments: { some: { assignedToId: userId } },
          stage: { name: { in: ['Won', 'WON', 'Enrolled', 'ENROLLED'] } },
          updatedAt: { gte: dateFrom, lte: dateTo },
        },
      }),
      // Leads lost
      prisma.lead.count({
        where: {
          organizationId,
          assignments: { some: { assignedToId: userId } },
          stage: { name: { in: ['Lost', 'LOST'] } },
          updatedAt: { gte: dateFrom, lte: dateTo },
        },
      }),
      // Follow-ups completed
      prisma.followUp.count({
        where: {
          assigneeId: userId,
          status: 'COMPLETED',
          completedAt: { gte: dateFrom, lte: dateTo },
        },
      }),
    ]);

    // 4. Calculate daily breakdown for charts
    const daysDiff = Math.ceil((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24));
    const dailyBreakdown = [];

    for (let i = 0; i < Math.min(daysDiff, 31); i++) {
      const dayStart = new Date(dateFrom);
      dayStart.setDate(dateFrom.getDate() + i);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const [dayCalls, dayConverted, dayInterested] = await Promise.all([
        prisma.telecallerCall.count({
          where: {
            telecallerId: userId,
            createdAt: { gte: dayStart, lte: dayEnd },
          },
        }),
        prisma.rawImportRecord.count({
          where: {
            assignedToId: userId,
            organizationId,
            status: 'CONVERTED',
            convertedAt: { gte: dayStart, lte: dayEnd },
          },
        }),
        prisma.rawImportRecord.count({
          where: {
            assignedToId: userId,
            organizationId,
            status: 'INTERESTED',
            updatedAt: { gte: dayStart, lte: dayEnd },
          },
        }),
      ]);

      dailyBreakdown.push({
        date: dayStart.toISOString().split('T')[0],
        dayName: dayStart.toLocaleDateString('en-US', { weekday: 'short' }),
        calls: dayCalls,
        converted: dayConverted,
        interested: dayInterested,
      });
    }

    // Build outcomes map
    const outcomes: Record<string, number> = {};
    callOutcomes.forEach(o => {
      if (o.outcome) outcomes[o.outcome] = o._count.outcome;
    });

    // Calculate rates
    const answerRate = totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : 0;
    const interestRate = totalAssignedContacted > 0 ? Math.round((interestedCount / totalAssignedContacted) * 100) : 0;
    const conversionRate = totalAssignedContacted > 0 ? Math.round((convertedCount / totalAssignedContacted) * 100) : 0;

    ApiResponse.success(res, 'Performance stats retrieved', {
      period: {
        from: dateFrom.toISOString(),
        to: dateTo.toISOString(),
        label: period || 'today',
      },
      calls: {
        total: totalCalls,
        answered: answeredCalls,
        noAnswer: noAnswerCalls,
        answerRate,
        avgDuration: Math.round(avgCallDuration._avg.duration || 0),
        totalDuration: avgCallDuration._sum.duration || 0,
        outcomes,
      },
      contacts: {
        contacted: totalAssignedContacted,
        interested: interestedCount,
        notInterested: notInterestedCount,
        callback: callbackCount,
        converted: convertedCount,
        interestRate,
        conversionRate,
      },
      leads: {
        created: leadsCreated,
        won: leadsWon,
        lost: leadsLost,
        followUpsCompleted,
      },
      dailyBreakdown,
    });
  } catch (error) {
    console.error('[Telecaller Performance] Error:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// ==================== APPOINTMENTS ====================

/**
 * Book a new appointment
 * POST /api/telecaller/appointments
 */
router.post('/appointments', async (req: TenantRequest, res: Response) => {
  try {
    const {
      leadId,
      title,
      description,
      scheduledAt,
      duration = 30,
      locationType = 'PHONE',
      locationDetails,
      contactName,
      contactPhone,
      contactEmail,
      sendCalendarInvite = true,
      sendReminders = true,
    } = req.body;

    const organizationId = req.organizationId!;
    const userId = req.user!.id;

    // Create appointment in database
    const appointment = await prisma.appointment.create({
      data: {
        organizationId,
        leadId,
        title,
        description,
        scheduledAt: new Date(scheduledAt),
        duration,
        locationType,
        locationDetails,
        contactName,
        contactPhone,
        contactEmail,
        status: 'SCHEDULED',
      },
    });

    // Send calendar invite if requested and email is available
    let calendarEventId: string | null = null;
    let calendarEventLink: string | null = null;

    if (sendCalendarInvite && contactEmail) {
      try {
        const endTime = new Date(new Date(scheduledAt).getTime() + duration * 60000);

        const calendarResult = await calendarService.createEvent(organizationId, {
          title,
          description: description || `Appointment with ${contactName}`,
          startTime: new Date(scheduledAt),
          endTime,
          attendees: [{ email: contactEmail, name: contactName }],
          location: locationDetails || (locationType === 'PHONE' ? `Phone: ${contactPhone}` : undefined),
          reminders: sendReminders ? [
            { minutes: 60, method: 'email' },
            { minutes: 15, method: 'popup' },
          ] : undefined,
        });

        if (calendarResult) {
          calendarEventId = calendarResult.eventId;
          calendarEventLink = calendarResult.eventLink;

          // Update appointment with calendar event info
          await prisma.appointment.update({
            where: { id: appointment.id },
            data: {
              notes: `Calendar Event ID: ${calendarEventId}`,
            },
          });
        }
      } catch (calError) {
        console.error('[Telecaller] Failed to create calendar event:', calError);
        // Don't fail the appointment creation if calendar fails
      }
    }

    // Create follow-up for the lead
    if (leadId) {
      await prisma.followUp.create({
        data: {
          leadId,
          createdById: userId,
          assigneeId: userId,
          scheduledAt: new Date(scheduledAt),
          followUpType: locationType === 'PHONE' ? 'HUMAN_CALL' : 'MANUAL',
          status: 'UPCOMING',
          message: title,
          notes: description,
        },
      });

      // Update lead's next follow-up date
      await prisma.lead.update({
        where: { id: leadId },
        data: { nextFollowUpAt: new Date(scheduledAt) },
      });

      // Log activity
      await prisma.leadActivity.create({
        data: {
          leadId,
          type: 'FOLLOWUP_SCHEDULED',
          title: 'Appointment Scheduled',
          description: `${title} - ${new Date(scheduledAt).toLocaleString()}`,
          userId,
          metadata: {
            appointmentId: appointment.id,
            calendarEventId,
            calendarInviteSent: !!calendarEventId,
          },
        },
      });
    }

    ApiResponse.success(res, 'Appointment booked successfully', {
      ...appointment,
      calendarEventId,
      calendarEventLink,
      calendarInviteSent: !!calendarEventId,
    });
  } catch (error) {
    console.error('[Telecaller] Error booking appointment:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

/**
 * Quick book appointment
 * POST /api/telecaller/appointments/quick-book
 */
router.post('/appointments/quick-book', async (req: TenantRequest, res: Response) => {
  try {
    const { leadId, contactName, contactPhone, contactEmail, scheduledAt, duration = 30 } = req.body;
    const organizationId = req.organizationId!;
    const userId = req.user!.id;

    // Create appointment
    const appointment = await prisma.appointment.create({
      data: {
        organizationId,
        leadId,
        title: 'Follow-up Call',
        scheduledAt: new Date(scheduledAt),
        duration,
        locationType: 'PHONE',
        locationDetails: contactPhone,
        contactName,
        contactPhone,
        contactEmail,
        status: 'SCHEDULED',
      },
    });

    // Send calendar invite
    let calendarResult = null;
    if (contactEmail) {
      try {
        const endTime = new Date(new Date(scheduledAt).getTime() + duration * 60000);
        calendarResult = await calendarService.createEvent(organizationId, {
          title: 'Follow-up Call',
          description: `Follow-up call with ${contactName}`,
          startTime: new Date(scheduledAt),
          endTime,
          attendees: [{ email: contactEmail, name: contactName }],
          location: `Phone: ${contactPhone}`,
          reminders: [
            { minutes: 60, method: 'email' },
            { minutes: 15, method: 'popup' },
          ],
        });
      } catch (e) {
        console.log('[Telecaller] Calendar invite failed:', e);
      }
    }

    // Create follow-up and log activity
    if (leadId) {
      await prisma.followUp.create({
        data: {
          leadId,
          createdById: userId,
          assigneeId: userId,
          scheduledAt: new Date(scheduledAt),
          followUpType: 'HUMAN_CALL',
          status: 'UPCOMING',
          message: 'Follow-up Call',
        },
      });

      await prisma.lead.update({
        where: { id: leadId },
        data: { nextFollowUpAt: new Date(scheduledAt) },
      });

      await prisma.leadActivity.create({
        data: {
          leadId,
          type: 'FOLLOWUP_SCHEDULED',
          title: 'Quick Appointment Booked',
          description: `Follow-up call scheduled for ${new Date(scheduledAt).toLocaleString()}`,
          userId,
          metadata: { appointmentId: appointment.id, quickBook: true },
        },
      });
    }

    ApiResponse.success(res, 'Appointment booked', {
      ...appointment,
      calendarEventId: calendarResult?.eventId,
      calendarEventLink: calendarResult?.eventLink,
      calendarInviteSent: !!calendarResult,
    });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

/**
 * Get available time slots
 * GET /api/telecaller/appointments/available-slots
 */
router.get('/appointments/available-slots', async (req: TenantRequest, res: Response) => {
  try {
    const { date } = req.query;
    const organizationId = req.organizationId!;

    if (!date) {
      return ApiResponse.error(res, 'Date is required', 400);
    }

    // Get existing appointments for the date
    const startOfDay = new Date(date as string);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date as string);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAppointments = await prisma.appointment.findMany({
      where: {
        organizationId,
        scheduledAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: { notIn: ['CANCELLED', 'COMPLETED'] },
      },
      select: {
        scheduledAt: true,
        duration: true,
      },
    });

    // Generate available slots (9 AM to 6 PM, 30-minute intervals)
    const slots = [];
    const slotDate = new Date(date as string);

    for (let hour = 9; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        slotDate.setHours(hour, minute, 0, 0);
        const slotStart = new Date(slotDate);
        const slotEnd = new Date(slotDate.getTime() + 30 * 60000);

        // Check if slot conflicts with existing appointments
        const isAvailable = !existingAppointments.some((appt) => {
          const apptStart = new Date(appt.scheduledAt);
          const apptEnd = new Date(apptStart.getTime() + appt.duration * 60000);
          return slotStart < apptEnd && slotEnd > apptStart;
        });

        slots.push({
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
          available: isAvailable,
        });
      }
    }

    ApiResponse.success(res, 'Available slots retrieved', slots);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

/**
 * Cancel appointment
 * POST /api/telecaller/appointments/:id/cancel
 */
router.post('/appointments/:id/cancel', async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const organizationId = req.organizationId!;

    const appointment = await prisma.appointment.update({
      where: { id, organizationId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        notes: reason ? `Cancelled: ${reason}` : 'Cancelled',
      },
    });

    // TODO: Cancel calendar event if exists

    ApiResponse.success(res, 'Appointment cancelled', appointment);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

/**
 * Reschedule appointment
 * POST /api/telecaller/appointments/:id/reschedule
 */
router.post('/appointments/:id/reschedule', async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { scheduledAt } = req.body;
    const organizationId = req.organizationId!;

    const appointment = await prisma.appointment.update({
      where: { id, organizationId },
      data: {
        scheduledAt: new Date(scheduledAt),
        status: 'RESCHEDULED',
      },
    });

    // Update lead follow-up
    if (appointment.leadId) {
      await prisma.lead.update({
        where: { id: appointment.leadId },
        data: { nextFollowUpAt: new Date(scheduledAt) },
      });
    }

    // TODO: Update calendar event if exists

    ApiResponse.success(res, 'Appointment rescheduled', appointment);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// ==================== FOLLOW-UPS ====================

/**
 * Get follow-up stats for telecaller
 * GET /api/telecaller/follow-ups/stats
 */
router.get('/follow-ups/stats', async (req: TenantRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const organizationId = req.organizationId!;
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const todayEnd = new Date(now.setHours(23, 59, 59, 999));

    const [total, overdue, today, upcoming, completed] = await Promise.all([
      // Total follow-ups assigned to this user
      prisma.followUp.count({
        where: {
          organizationId,
          assigneeId: userId,
          status: { in: ['UPCOMING', 'MISSED'] },
        },
      }),
      // Overdue (scheduled before now, not completed)
      prisma.followUp.count({
        where: {
          organizationId,
          assigneeId: userId,
          status: 'UPCOMING',
          scheduledAt: { lt: new Date() },
        },
      }),
      // Today's follow-ups
      prisma.followUp.count({
        where: {
          organizationId,
          assigneeId: userId,
          status: 'UPCOMING',
          scheduledAt: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
      }),
      // Upcoming (scheduled in the future)
      prisma.followUp.count({
        where: {
          organizationId,
          assigneeId: userId,
          status: 'UPCOMING',
          scheduledAt: { gt: new Date() },
        },
      }),
      // Completed in last 30 days
      prisma.followUp.count({
        where: {
          organizationId,
          assigneeId: userId,
          status: 'COMPLETED',
          completedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    ApiResponse.success(res, 'Follow-up stats retrieved', {
      total,
      overdue,
      today,
      upcoming,
      completed,
    });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

/**
 * Get overdue follow-ups
 * GET /api/telecaller/follow-ups/overdue
 */
router.get('/follow-ups/overdue', async (req: TenantRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const organizationId = req.organizationId!;

    const followUps = await prisma.followUp.findMany({
      where: {
        organizationId,
        assigneeId: userId,
        status: 'UPCOMING',
        scheduledAt: { lt: new Date() },
      },
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            company: true,
            stage: { select: { name: true } },
          },
        },
        assignee: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    ApiResponse.success(res, 'Overdue follow-ups retrieved', followUps);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

/**
 * Get today's follow-ups
 * GET /api/telecaller/follow-ups/today
 */
router.get('/follow-ups/today', async (req: TenantRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const organizationId = req.organizationId!;
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const todayEnd = new Date(now.setHours(23, 59, 59, 999));

    const followUps = await prisma.followUp.findMany({
      where: {
        organizationId,
        assigneeId: userId,
        status: 'UPCOMING',
        scheduledAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            company: true,
            stage: { select: { name: true } },
          },
        },
        assignee: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    ApiResponse.success(res, "Today's follow-ups retrieved", followUps);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

/**
 * Get all follow-ups for telecaller
 * GET /api/telecaller/follow-ups
 */
router.get('/follow-ups', async (req: TenantRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const organizationId = req.organizationId!;
    const { status, type, limit = '50', offset = '0' } = req.query;

    const where: any = {
      organizationId,
      assigneeId: userId,
    };

    if (status) {
      where.status = status as string;
    }

    if (type) {
      where.followUpType = type as string;
    }

    const [followUps, total] = await Promise.all([
      prisma.followUp.findMany({
        where,
        include: {
          lead: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
              company: true,
              stage: { select: { name: true } },
            },
          },
          assignee: {
            select: { firstName: true, lastName: true },
          },
        },
        orderBy: { scheduledAt: 'asc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      }),
      prisma.followUp.count({ where }),
    ]);

    ApiResponse.success(res, 'Follow-ups retrieved', { followUps, total });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

/**
 * Complete a follow-up
 * PUT /api/telecaller/follow-ups/:id/complete
 */
router.put('/follow-ups/:id/complete', async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const userId = req.user!.id;
    const organizationId = req.organizationId!;

    // Verify follow-up belongs to this user
    const existingFollowUp = await prisma.followUp.findFirst({
      where: { id, organizationId, assigneeId: userId },
    });

    if (!existingFollowUp) {
      return ApiResponse.notFound(res, 'Follow-up not found');
    }

    const followUp = await prisma.followUp.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        notes: notes || existingFollowUp.notes,
      },
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });

    ApiResponse.success(res, 'Follow-up completed', followUp);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

/**
 * Reschedule a follow-up
 * PUT /api/telecaller/follow-ups/:id/reschedule
 */
router.put('/follow-ups/:id/reschedule', async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { scheduledAt, notes } = req.body;
    const userId = req.user!.id;
    const organizationId = req.organizationId!;

    if (!scheduledAt) {
      return ApiResponse.badRequest(res, 'scheduledAt is required');
    }

    // Verify follow-up belongs to this user
    const existingFollowUp = await prisma.followUp.findFirst({
      where: { id, organizationId, assigneeId: userId },
    });

    if (!existingFollowUp) {
      return ApiResponse.notFound(res, 'Follow-up not found');
    }

    const followUp = await prisma.followUp.update({
      where: { id },
      data: {
        scheduledAt: new Date(scheduledAt),
        notes: notes || existingFollowUp.notes,
        status: 'UPCOMING', // Reset status if it was MISSED
      },
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });

    // Update lead's nextFollowUpAt
    if (existingFollowUp.leadId) {
      await prisma.lead.update({
        where: { id: existingFollowUp.leadId },
        data: { nextFollowUpAt: new Date(scheduledAt) },
      });
    }

    ApiResponse.success(res, 'Follow-up rescheduled', followUp);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

/**
 * Cancel/delete a follow-up
 * DELETE /api/telecaller/follow-ups/:id
 */
router.delete('/follow-ups/:id', async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const organizationId = req.organizationId!;

    // Verify follow-up belongs to this user
    const existingFollowUp = await prisma.followUp.findFirst({
      where: { id, organizationId, assigneeId: userId },
    });

    if (!existingFollowUp) {
      return ApiResponse.notFound(res, 'Follow-up not found');
    }

    await prisma.followUp.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    ApiResponse.success(res, 'Follow-up cancelled');
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

/**
 * Create a follow-up for a lead
 * POST /api/telecaller/leads/:leadId/follow-ups
 */
router.post('/leads/:leadId/follow-ups', async (req: TenantRequest, res: Response) => {
  try {
    const { leadId } = req.params;
    const { scheduledAt, followUpType = 'HUMAN_CALL', message } = req.body;
    const userId = req.user!.id;
    const organizationId = req.organizationId!;

    if (!scheduledAt) {
      return ApiResponse.badRequest(res, 'scheduledAt is required');
    }

    // Verify lead exists and belongs to organization
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId },
    });

    if (!lead) {
      return ApiResponse.notFound(res, 'Lead not found');
    }

    const followUp = await prisma.followUp.create({
      data: {
        leadId,
        organizationId,
        assigneeId: userId,
        scheduledAt: new Date(scheduledAt),
        followUpType,
        message,
        status: 'UPCOMING',
      },
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });

    // Update lead's nextFollowUpAt
    await prisma.lead.update({
      where: { id: leadId },
      data: { nextFollowUpAt: new Date(scheduledAt) },
    });

    ApiResponse.created(res, 'Follow-up created', followUp);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

export default router;
