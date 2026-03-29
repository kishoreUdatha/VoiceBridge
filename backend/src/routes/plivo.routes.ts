import { Router, Request, Response } from 'express';
import { plivoService } from '../integrations/plivo.service';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { verifyPlivoWebhook } from '../middlewares/webhookAuth';
import { webhookLimiter } from '../middlewares/rateLimit';
import { ApiResponse } from '../utils/apiResponse';

const router = Router();

// ==================== WEBHOOKS (No Auth, but verified) ====================

// Incoming SMS webhook
router.post('/webhook/sms', webhookLimiter, verifyPlivoWebhook, async (req: Request, res: Response) => {
  try {
    const { From, To, Text, MessageUUID } = req.body;

    const result = await plivoService.handleIncomingSms(From, To, Text, MessageUUID);

    // Return 200 to acknowledge receipt
    res.status(200).send('OK');
  } catch (error) {
    console.error('Plivo SMS webhook error:', error);
    res.status(500).send('Error');
  }
});

// Call status webhook
router.post('/webhook/call-status', async (req: Request, res: Response) => {
  try {
    const { CallUUID, CallStatus, Duration, RecordUrl } = req.body;

    await plivoService.handleCallStatus(
      CallUUID,
      CallStatus,
      Duration ? parseInt(Duration) : undefined,
      RecordUrl
    );

    res.status(200).send('OK');
  } catch (error) {
    console.error('Plivo call status webhook error:', error);
    res.status(500).send('Error');
  }
});

// Call answer webhook - returns XML for call flow
router.post('/webhook/answer', async (req: Request, res: Response) => {
  try {
    const xml = plivoService.generateAnswerXml(
      'Hello! Thank you for calling. Please hold while we connect you to a representative.'
    );

    res.set('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error('Plivo answer webhook error:', error);
    res.status(500).send('Error');
  }
});

// Call hangup webhook
router.post('/webhook/hangup', async (req: Request, res: Response) => {
  try {
    const { CallUUID, Duration } = req.body;

    await plivoService.handleCallStatus(
      CallUUID,
      'completed',
      Duration ? parseInt(Duration) : undefined
    );

    res.status(200).send('OK');
  } catch (error) {
    console.error('Plivo hangup webhook error:', error);
    res.status(500).send('Error');
  }
});

// Recording callback webhook
router.post('/webhook/recording', async (req: Request, res: Response) => {
  try {
    const { CallUUID, RecordUrl, RecordingDuration } = req.body;

    await plivoService.updateCallStatus(
      CallUUID,
      'COMPLETED' as any,
      RecordingDuration ? parseInt(RecordingDuration) : undefined,
      RecordUrl
    );

    res.status(200).send('OK');
  } catch (error) {
    console.error('Plivo recording webhook error:', error);
    res.status(500).send('Error');
  }
});

// IVR input handler
router.post('/webhook/ivr-input', async (req: Request, res: Response) => {
  try {
    const { Digits, CallUUID } = req.body;

    let xml: string;

    switch (Digits) {
      case '1':
        xml = plivoService.generateConnectXml(process.env.SALES_PHONE || '');
        break;
      case '2':
        xml = plivoService.generateConnectXml(process.env.SUPPORT_PHONE || '');
        break;
      case '3':
        xml = plivoService.generateRecordXml(`${process.env.FRONTEND_URL}/api/plivo/webhook/voicemail`);
        break;
      default:
        xml = plivoService.generateAnswerXml('Invalid option. Goodbye.');
    }

    res.set('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error('Plivo IVR input error:', error);
    res.status(500).send('Error');
  }
});

// ==================== AUTHENTICATED ENDPOINTS ====================

router.use(authenticate);
router.use(tenantMiddleware);

// Send SMS
router.post('/sms/send', async (req: TenantRequest, res: Response) => {
  try {
    const { to, message, leadId } = req.body;

    if (!to || !message) {
      return ApiResponse.error(res, 'Phone number and message are required', 400);
    }

    const result = await plivoService.sendSms({
      to,
      message,
      leadId,
      userId: req.user!.id,
    });

    ApiResponse.success(res, 'SMS sent successfully', result);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Send bulk SMS
router.post('/sms/bulk', async (req: TenantRequest, res: Response) => {
  try {
    const { recipients } = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return ApiResponse.error(res, 'Recipients array is required', 400);
    }

    const results = await plivoService.sendBulkSms(recipients, req.user!.id);

    ApiResponse.success(res, 'Bulk SMS sent', {
      total: recipients.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Make call
router.post('/call/make', async (req: TenantRequest, res: Response) => {
  try {
    const { to, leadId, callType } = req.body;

    if (!to) {
      return ApiResponse.error(res, 'Phone number is required', 400);
    }

    const answerUrl = `${process.env.FRONTEND_URL}/api/plivo/webhook/answer`;

    const result = await plivoService.makeCall({
      to,
      leadId,
      callerId: req.user!.id,
      organizationId: req.user!.organizationId,
      callType,
    }, answerUrl);

    ApiResponse.success(res, 'Call initiated successfully', result);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Get account balance
router.get('/account/balance', async (req: TenantRequest, res: Response) => {
  try {
    const balance = await plivoService.getAccountBalance();
    ApiResponse.success(res, 'Account balance retrieved', balance);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Get message details
router.get('/sms/:messageId', async (req: TenantRequest, res: Response) => {
  try {
    const details = await plivoService.getMessageDetails(req.params.messageId);
    ApiResponse.success(res, 'Message details retrieved', details);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Get call details
router.get('/call/:callId', async (req: TenantRequest, res: Response) => {
  try {
    const details = await plivoService.getCallDetails(req.params.callId);
    ApiResponse.success(res, 'Call details retrieved', details);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// List phone numbers
router.get('/numbers', async (req: TenantRequest, res: Response) => {
  try {
    const numbers = await plivoService.listPhoneNumbers();
    ApiResponse.success(res, 'Phone numbers retrieved', numbers);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Check if Plivo is configured
router.get('/status', async (req: TenantRequest, res: Response) => {
  try {
    const isConfigured = plivoService.isConfigured();

    if (isConfigured) {
      const balance = await plivoService.getAccountBalance();
      ApiResponse.success(res, 'Plivo is configured', {
        configured: true,
        balance: balance.balance,
        currency: balance.currency,
      });
    } else {
      ApiResponse.success(res, 'Plivo is not configured', {
        configured: false,
      });
    }
  } catch (error) {
    ApiResponse.success(res, 'Plivo configuration error', {
      configured: false,
      error: (error as Error).message,
    });
  }
});

export default router;
