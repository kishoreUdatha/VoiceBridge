import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { ApiResponse } from '../utils/apiResponse';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { sarvamService } from '../integrations/sarvam.service';

const router = Router();
const prisma = new PrismaClient();

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

// ==================== TELECALLER DASHBOARD ====================

// Get telecaller's assigned leads
router.get('/leads', async (req: TenantRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { status, search, limit = '50', offset = '0' } = req.query;

    const whereClause: any = {
      organizationId: req.organization!.id,
      assignedToId: userId,
    };

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

// Get telecaller's call history
router.get('/calls', async (req: TenantRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { leadId, dateFrom, dateTo, limit = '50', offset = '0' } = req.query;

    const whereClause: any = {
      odTelecallerId: userId,
    };

    if (leadId) {
      whereClause.leadId = leadId;
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

    ApiResponse.success(res, 'Calls retrieved', { calls, total });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Get single call details
router.get('/calls/:id', async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const call = await prisma.telecallerCall.findFirst({
      where: { id, odTelecallerId: userId },
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
        odOrganizationId: req.organization!.id,
        odTelecallerId: userId,
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
      where: { id, odTelecallerId: userId },
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
    const userId = req.user!.id;

    if (!req.file) {
      return ApiResponse.error(res, 'Recording file is required', 400);
    }

    const existing = await prisma.telecallerCall.findFirst({
      where: { id, odTelecallerId: userId },
    });

    if (!existing) {
      // Delete uploaded file
      fs.unlinkSync(req.file.path);
      return ApiResponse.error(res, 'Call not found', 404);
    }

    // Update call with recording URL
    const recordingUrl = `/uploads/recordings/${req.file.filename}`;

    let call = await prisma.telecallerCall.update({
      where: { id },
      data: {
        recordingUrl,
        status: 'COMPLETED',
      },
    });

    // Transcribe the recording asynchronously
    transcribeRecording(id, req.file.path).catch(console.error);

    ApiResponse.success(res, 'Recording uploaded. Transcription in progress...', call);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Transcribe recording function
async function transcribeRecording(callId: string, filePath: string) {
  try {
    console.log(`[Telecaller] Starting transcription for call ${callId}`);

    // Read the audio file
    const audioBuffer = fs.readFileSync(filePath);

    // Transcribe using Sarvam
    const transcriptResult = await sarvamService.speechToText(audioBuffer);

    if (transcriptResult && transcriptResult.text) {
      // Analyze the transcript for sentiment and key points
      const analysis = await analyzeTranscript(transcriptResult.text);

      // Update call with transcript and analysis
      await prisma.telecallerCall.update({
        where: { id: callId },
        data: {
          transcript: transcriptResult.text,
          sentiment: analysis.sentiment,
          qualification: analysis,
          summary: analysis.summary,
        },
      });

      console.log(`[Telecaller] Transcription completed for call ${callId}`);
    }
  } catch (error) {
    console.error(`[Telecaller] Transcription error for call ${callId}:`, error);
  }
}

// Analyze transcript for sentiment and key points
async function analyzeTranscript(transcript: string): Promise<any> {
  // Simple sentiment analysis based on keywords
  const positiveWords = ['interested', 'yes', 'sure', 'good', 'great', 'okay', 'fine', 'agree', 'want', 'need'];
  const negativeWords = ['no', 'not interested', 'busy', 'later', 'dont', "don't", 'never', 'bad', 'wrong'];

  const lowerTranscript = transcript.toLowerCase();

  let positiveScore = 0;
  let negativeScore = 0;

  positiveWords.forEach(word => {
    if (lowerTranscript.includes(word)) positiveScore++;
  });

  negativeWords.forEach(word => {
    if (lowerTranscript.includes(word)) negativeScore++;
  });

  const sentiment = positiveScore > negativeScore ? 'positive' :
                   negativeScore > positiveScore ? 'negative' : 'neutral';

  // Extract potential follow-up indicators
  const needsFollowUp = lowerTranscript.includes('call back') ||
                       lowerTranscript.includes('later') ||
                       lowerTranscript.includes('tomorrow') ||
                       lowerTranscript.includes('next week');

  // Generate simple summary (first 200 chars)
  const summary = transcript.length > 200 ? transcript.substring(0, 200) + '...' : transcript;

  return {
    sentiment,
    needsFollowUp,
    summary,
    transcriptLength: transcript.length,
    analyzedAt: new Date().toISOString(),
  };
}

// Get telecaller stats/dashboard
router.get('/stats', async (req: TenantRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalLeads,
      todayCalls,
      totalCalls,
      outcomes,
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
        where: { odTelecallerId: userId, createdAt: { gte: today } },
      }),
      // Total calls
      prisma.telecallerCall.count({
        where: { odTelecallerId: userId },
      }),
      // Outcome distribution
      prisma.telecallerCall.groupBy({
        by: ['outcome'],
        where: { odTelecallerId: userId, outcome: { not: null } },
        _count: { outcome: true },
      }),
    ]);

    // Calculate conversion rate
    const interested = outcomes.find(o => o.outcome === 'INTERESTED')?._count?.outcome || 0;
    const converted = outcomes.find(o => o.outcome === 'CONVERTED')?._count?.outcome || 0;
    const conversionRate = totalCalls > 0 ? Math.round(((interested + converted) / totalCalls) * 100) : 0;

    ApiResponse.success(res, 'Stats retrieved', {
      totalLeads,
      todayCalls,
      totalCalls,
      conversionRate,
      outcomes: outcomes.reduce((acc, o) => {
        if (o.outcome) acc[o.outcome] = o._count.outcome;
        return acc;
      }, {} as Record<string, number>),
    });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

export default router;
