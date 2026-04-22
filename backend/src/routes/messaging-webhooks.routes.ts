/**
 * Messaging Webhooks Routes
 * Webhook handlers for MSG91 and AWS SES delivery status updates
 */

import { Router, Request, Response } from 'express';
import { msg91Service } from '../services/msg91.service';
import { sesService } from '../services/ses.service';
import { ApiResponse } from '../utils/apiResponse';

const router = Router();

// ==================== MSG91 WEBHOOKS ====================

/**
 * MSG91 Delivery Status Webhook
 * POST /api/webhooks/msg91/status
 *
 * MSG91 sends delivery reports to this endpoint.
 * Configure this URL in MSG91 dashboard under DLR settings.
 */
router.post('/msg91/status', async (req: Request, res: Response) => {
  try {
    console.log('[MSG91 Webhook] Received:', JSON.stringify(req.body).substring(0, 500));

    const { requestId, reports } = msg91Service.parseWebhook(req.body);

    if (requestId && reports.length > 0) {
      // Update delivery status for each report
      for (const report of reports) {
        await msg91Service.updateDeliveryStatus(requestId, report.status);
      }

      console.log(`[MSG91 Webhook] Processed ${reports.length} delivery reports for ${requestId}`);
    }

    // MSG91 expects a 200 response
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[MSG91 Webhook] Error:', error);
    // Still return 200 to prevent retries
    res.status(200).json({ success: false, error: (error as Error).message });
  }
});

/**
 * MSG91 OTP Verification Webhook
 * POST /api/webhooks/msg91/otp
 *
 * Optional webhook for OTP verification events
 */
router.post('/msg91/otp', async (req: Request, res: Response) => {
  try {
    console.log('[MSG91 OTP Webhook] Received:', JSON.stringify(req.body).substring(0, 500));

    // Process OTP verification event if needed
    // This is optional and depends on your OTP flow

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[MSG91 OTP Webhook] Error:', error);
    res.status(200).json({ success: false, error: (error as Error).message });
  }
});

// ==================== AWS SES WEBHOOKS ====================

/**
 * AWS SES Notification Webhook (via SNS)
 * POST /api/webhooks/ses/notification
 *
 * SES sends notifications via SNS. This endpoint handles:
 * - Bounces
 * - Complaints
 * - Deliveries
 * - Opens (if tracking enabled)
 * - Clicks (if tracking enabled)
 *
 * Configure SNS to send to this endpoint in AWS Console.
 */
router.post('/ses/notification', async (req: Request, res: Response) => {
  try {
    const body = req.body;

    // Handle SNS subscription confirmation
    if (body.Type === 'SubscriptionConfirmation') {
      console.log('[SES Webhook] SNS Subscription confirmation received');
      console.log('[SES Webhook] SubscribeURL:', body.SubscribeURL);

      // Auto-confirm subscription by visiting the URL
      if (body.SubscribeURL) {
        try {
          const fetch = (await import('node-fetch')).default;
          await fetch(body.SubscribeURL);
          console.log('[SES Webhook] SNS subscription confirmed');
        } catch (error) {
          console.error('[SES Webhook] Failed to confirm SNS subscription:', error);
        }
      }

      return res.status(200).json({ success: true, message: 'Subscription confirmation received' });
    }

    // Handle SNS notification
    if (body.Type === 'Notification') {
      let message: any;

      try {
        message = typeof body.Message === 'string' ? JSON.parse(body.Message) : body.Message;
      } catch (e) {
        console.error('[SES Webhook] Failed to parse SNS message:', e);
        return res.status(200).json({ success: false, error: 'Invalid message format' });
      }

      console.log('[SES Webhook] Event type:', message.eventType || message.notificationType);

      // Map SNS notification format to our event format
      const event = {
        eventType: message.eventType || message.notificationType,
        mail: message.mail,
        bounce: message.bounce,
        complaint: message.complaint,
        delivery: message.delivery,
      };

      await sesService.handleWebhook(event);

      return res.status(200).json({ success: true });
    }

    // Direct SES event (not via SNS)
    if (body.eventType || body.notificationType) {
      console.log('[SES Webhook] Direct event type:', body.eventType || body.notificationType);

      await sesService.handleWebhook({
        eventType: body.eventType || body.notificationType,
        mail: body.mail,
        bounce: body.bounce,
        complaint: body.complaint,
        delivery: body.delivery,
      });

      return res.status(200).json({ success: true });
    }

    console.log('[SES Webhook] Unknown payload type:', JSON.stringify(body).substring(0, 200));
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[SES Webhook] Error:', error);
    // Return 200 to prevent SNS retries
    res.status(200).json({ success: false, error: (error as Error).message });
  }
});

/**
 * AWS SES Bounce Webhook (direct endpoint)
 * POST /api/webhooks/ses/bounce
 *
 * Alternative direct endpoint for bounce notifications
 */
router.post('/ses/bounce', async (req: Request, res: Response) => {
  try {
    console.log('[SES Bounce Webhook] Received:', JSON.stringify(req.body).substring(0, 500));

    await sesService.handleWebhook({
      eventType: 'Bounce',
      mail: req.body.mail,
      bounce: req.body.bounce,
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[SES Bounce Webhook] Error:', error);
    res.status(200).json({ success: false, error: (error as Error).message });
  }
});

/**
 * AWS SES Complaint Webhook (direct endpoint)
 * POST /api/webhooks/ses/complaint
 *
 * Alternative direct endpoint for complaint notifications
 */
router.post('/ses/complaint', async (req: Request, res: Response) => {
  try {
    console.log('[SES Complaint Webhook] Received:', JSON.stringify(req.body).substring(0, 500));

    await sesService.handleWebhook({
      eventType: 'Complaint',
      mail: req.body.mail,
      complaint: req.body.complaint,
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[SES Complaint Webhook] Error:', error);
    res.status(200).json({ success: false, error: (error as Error).message });
  }
});

/**
 * AWS SES Delivery Webhook (direct endpoint)
 * POST /api/webhooks/ses/delivery
 *
 * Alternative direct endpoint for delivery notifications
 */
router.post('/ses/delivery', async (req: Request, res: Response) => {
  try {
    console.log('[SES Delivery Webhook] Received:', JSON.stringify(req.body).substring(0, 500));

    await sesService.handleWebhook({
      eventType: 'Delivery',
      mail: req.body.mail,
      delivery: req.body.delivery,
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[SES Delivery Webhook] Error:', error);
    res.status(200).json({ success: false, error: (error as Error).message });
  }
});

// ==================== HEALTH CHECK ====================

/**
 * Webhook health check
 * GET /api/webhooks/health
 */
router.get('/health', (req: Request, res: Response) => {
  ApiResponse.success(res, 'Messaging webhooks are operational', {
    msg91: {
      configured: msg91Service.isConfigured(),
      endpoints: ['/msg91/status', '/msg91/otp'],
    },
    ses: {
      configured: sesService.isConfigured(),
      endpoints: ['/ses/notification', '/ses/bounce', '/ses/complaint', '/ses/delivery'],
    },
  });
});

export default router;
