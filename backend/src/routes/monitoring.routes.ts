import { Router, Response } from 'express';
import { callMonitoringService } from '../services/call-monitoring.service';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { ApiResponse } from '../utils/apiResponse';
import { MonitoringMode } from '@prisma/client';

const router = Router();

router.use(authenticate);
router.use(tenantMiddleware);

// Get active calls available for monitoring
router.get('/active-calls', async (req: TenantRequest, res: Response) => {
  try {
    const calls = await callMonitoringService.getActiveCallsForMonitoring(
      req.organizationId!
    );
    return ApiResponse.success(res, calls);
  } catch (error: any) {
    return ApiResponse.error(res, error.message);
  }
});

// Get active monitoring sessions
router.get('/sessions', async (req: TenantRequest, res: Response) => {
  try {
    const sessions = await callMonitoringService.getActiveSessions(
      req.organizationId!
    );
    return ApiResponse.success(res, sessions);
  } catch (error: any) {
    return ApiResponse.error(res, error.message);
  }
});

// Get supervisor's active sessions
router.get('/sessions/supervisor/:supervisorId', async (req: TenantRequest, res: Response) => {
  try {
    const sessions = await callMonitoringService.getSupervisorSessions(
      req.params.supervisorId
    );
    return ApiResponse.success(res, sessions);
  } catch (error: any) {
    return ApiResponse.error(res, error.message);
  }
});

// Check if agent is being monitored
router.get('/agents/:agentUserId/monitoring', async (req: TenantRequest, res: Response) => {
  try {
    const session = await callMonitoringService.getAgentBeingMonitored(
      req.params.agentUserId
    );
    return ApiResponse.success(res, { isMonitored: !!session, session });
  } catch (error: any) {
    return ApiResponse.error(res, error.message);
  }
});

// Start monitoring a call
router.post('/start', async (req: TenantRequest, res: Response) => {
  try {
    const { agentUserId, inboundCallId, outboundCallId, mode } = req.body;

    if (!agentUserId) {
      return ApiResponse.error(res, 'agentUserId is required', 400);
    }

    if (!inboundCallId && !outboundCallId) {
      return ApiResponse.error(res, 'Either inboundCallId or outboundCallId is required', 400);
    }

    const session = await callMonitoringService.startMonitoring({
      organizationId: req.organizationId!,
      supervisorId: req.user!.id,
      agentUserId,
      inboundCallId,
      outboundCallId,
      mode: mode as MonitoringMode,
    });

    return ApiResponse.created(res, session);
  } catch (error: any) {
    return ApiResponse.error(res, error.message, error.statusCode);
  }
});

// Switch to whisper mode
router.post('/sessions/:sessionId/whisper', async (req: TenantRequest, res: Response) => {
  try {
    const session = await callMonitoringService.startWhisper(req.params.sessionId);
    return ApiResponse.success(res, session, 'Switched to whisper mode');
  } catch (error: any) {
    return ApiResponse.error(res, error.message, error.statusCode);
  }
});

// Barge into call
router.post('/sessions/:sessionId/barge', async (req: TenantRequest, res: Response) => {
  try {
    const session = await callMonitoringService.bargeIn(req.params.sessionId);
    return ApiResponse.success(res, session, 'Barged into call');
  } catch (error: any) {
    return ApiResponse.error(res, error.message, error.statusCode);
  }
});

// Switch back to listen mode
router.post('/sessions/:sessionId/listen', async (req: TenantRequest, res: Response) => {
  try {
    const session = await callMonitoringService.switchToListen(req.params.sessionId);
    return ApiResponse.success(res, session, 'Switched to listen mode');
  } catch (error: any) {
    return ApiResponse.error(res, error.message, error.statusCode);
  }
});

// Stop monitoring
router.post('/sessions/:sessionId/stop', async (req: TenantRequest, res: Response) => {
  try {
    const { notes } = req.body;

    const session = await callMonitoringService.stopMonitoring(
      req.params.sessionId,
      notes
    );

    return ApiResponse.success(res, session, 'Monitoring stopped');
  } catch (error: any) {
    return ApiResponse.error(res, error.message, error.statusCode);
  }
});

// Get session history
router.get('/history', async (req: TenantRequest, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      supervisorId,
      agentUserId,
    } = req.query;

    const result = await callMonitoringService.getSessionHistory(
      req.organizationId!,
      supervisorId as string,
      agentUserId as string,
      Number(page),
      Number(limit)
    );

    return ApiResponse.paginated(res, 'Session history retrieved', result.sessions, result.page, result.limit, result.total);
  } catch (error: any) {
    return ApiResponse.error(res, error.message);
  }
});

// Get monitoring stats
router.get('/stats', async (req: TenantRequest, res: Response) => {
  try {
    const { dateFrom, dateTo } = req.query;

    const stats = await callMonitoringService.getMonitoringStats(
      req.organizationId!,
      dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo ? new Date(dateTo as string) : undefined
    );

    return ApiResponse.success(res, stats);
  } catch (error: any) {
    return ApiResponse.error(res, error.message);
  }
});

export default router;
