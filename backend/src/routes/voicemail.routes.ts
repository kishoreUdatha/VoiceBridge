import { Router, Request, Response } from 'express';
import { voicemailService } from '../services/voicemail.service';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { ApiResponse } from '../utils/apiResponse';
import { VoicemailStatus } from '@prisma/client';

const router = Router();

// ==================== WEBHOOKS (No Auth) ====================

// Recording completed webhook - called by telephony provider
router.post('/webhook/recording', async (req: Request, res: Response) => {
  try {
    const {
      RecordingUrl,
      RecordingDuration,
      CallSid,
      From,
      To,
    } = req.body;

    console.log(`Voicemail recording received: ${RecordingUrl} (${RecordingDuration}s)`);

    // For now, just acknowledge - real implementation would look up organization from To number
    // and create the voicemail record

    res.status(200).send('OK');
  } catch (error) {
    console.error('Voicemail webhook error:', error);
    res.status(500).send('Error');
  }
});

// Transcription completed webhook
router.post('/webhook/transcription', async (req: Request, res: Response) => {
  try {
    const { RecordingSid, TranscriptionText, TranscriptionStatus } = req.body;

    console.log(`Transcription received for ${RecordingSid}: ${TranscriptionStatus}`);

    // Update voicemail with transcription
    // Real implementation would look up voicemail by RecordingSid

    res.status(200).send('OK');
  } catch (error) {
    console.error('Transcription webhook error:', error);
    res.status(500).send('Error');
  }
});

// ==================== AUTHENTICATED ROUTES ====================

router.use(authenticate);
router.use(tenantMiddleware);

// Get all voicemails
router.get('/', async (req: TenantRequest, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      agentUserId,
      queueId,
      dateFrom,
      dateTo,
      search,
    } = req.query;

    const result = await voicemailService.getVoicemails(
      {
        organizationId: req.organizationId!,
        status: status as VoicemailStatus,
        agentUserId: agentUserId as string,
        queueId: queueId as string,
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
        search: search as string,
      },
      Number(page),
      Number(limit)
    );

    return ApiResponse.paginated(res, 'Voicemails retrieved', result.voicemails, result.page, result.limit, result.total);
  } catch (error: any) {
    return ApiResponse.error(res, error.message);
  }
});

// Get single voicemail
router.get('/:id', async (req: TenantRequest, res: Response) => {
  try {
    const voicemail = await voicemailService.getVoicemailById(
      req.params.id,
      req.organizationId!
    );
    return ApiResponse.success(res, voicemail);
  } catch (error: any) {
    return ApiResponse.error(res, error.message, error.statusCode);
  }
});

// Mark voicemail as listened
router.post('/:id/listened', async (req: TenantRequest, res: Response) => {
  try {
    const voicemail = await voicemailService.markAsListened(
      req.params.id,
      req.organizationId!,
      req.user!.id
    );
    return ApiResponse.success(res, voicemail);
  } catch (error: any) {
    return ApiResponse.error(res, error.message, error.statusCode);
  }
});

// Mark voicemail as responded
router.post('/:id/responded', async (req: TenantRequest, res: Response) => {
  try {
    const voicemail = await voicemailService.markAsResponded(
      req.params.id,
      req.organizationId!,
      req.user!.id
    );
    return ApiResponse.success(res, voicemail);
  } catch (error: any) {
    return ApiResponse.error(res, error.message, error.statusCode);
  }
});

// Archive voicemail
router.post('/:id/archive', async (req: TenantRequest, res: Response) => {
  try {
    const voicemail = await voicemailService.archive(req.params.id, req.organizationId!);
    return ApiResponse.success(res, voicemail, 'Voicemail archived');
  } catch (error: any) {
    return ApiResponse.error(res, error.message, error.statusCode);
  }
});

// Delete voicemail
router.delete('/:id', async (req: TenantRequest, res: Response) => {
  try {
    await voicemailService.delete(req.params.id, req.organizationId!);
    return ApiResponse.success(res, null, 'Voicemail deleted');
  } catch (error: any) {
    return ApiResponse.error(res, error.message, error.statusCode);
  }
});

// Update notes
router.put('/:id/notes', async (req: TenantRequest, res: Response) => {
  try {
    const { notes } = req.body;
    const voicemail = await voicemailService.updateNotes(
      req.params.id,
      req.organizationId!,
      notes
    );
    return ApiResponse.success(res, voicemail);
  } catch (error: any) {
    return ApiResponse.error(res, error.message, error.statusCode);
  }
});

// Create callback from voicemail
router.post('/:id/callback', async (req: TenantRequest, res: Response) => {
  try {
    const { scheduledAt } = req.body;

    const callback = await voicemailService.createCallbackFromVoicemail(
      req.params.id,
      req.organizationId!,
      scheduledAt ? new Date(scheduledAt) : undefined
    );

    return ApiResponse.created(res, callback);
  } catch (error: any) {
    return ApiResponse.error(res, error.message, error.statusCode);
  }
});

// Get voicemail stats
router.get('/stats/overview', async (req: TenantRequest, res: Response) => {
  try {
    const { dateFrom, dateTo } = req.query;

    const stats = await voicemailService.getStats(
      req.organizationId!,
      dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo ? new Date(dateTo as string) : undefined
    );

    return ApiResponse.success(res, stats);
  } catch (error: any) {
    return ApiResponse.error(res, error.message);
  }
});

// Get new voicemail count
router.get('/stats/new-count', async (req: TenantRequest, res: Response) => {
  try {
    const { agentUserId } = req.query;

    const count = await voicemailService.getNewCount(
      req.organizationId!,
      agentUserId as string
    );

    return ApiResponse.success(res, { count });
  } catch (error: any) {
    return ApiResponse.error(res, error.message);
  }
});

export default router;
