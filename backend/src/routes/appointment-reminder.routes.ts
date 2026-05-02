/**
 * Appointment Reminder Routes
 * API endpoints for managing appointment reminder settings and logs
 */

import { Router, Request, Response, NextFunction } from 'express';
import { appointmentReminderService } from '../services/appointment-reminder.service';
import { authenticate } from '../middlewares/auth';
import { prisma } from '../config/database';
import * as crypto from 'crypto';

// Extend Request type to include user
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    organizationId: string;
    role?: string;
  };
}

const router = Router();

// ==================== PUBLIC ENDPOINTS (No Auth Required) ====================

/**
 * GET /api/appointment-reminders/confirm/:token
 * Public endpoint for confirming appointments via email/SMS links
 * Token format: base64(appointmentId:timestamp:signature)
 */
router.get('/confirm/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    // Decode and validate token
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const [appointmentId, timestamp, signature] = decoded.split(':');

    if (!appointmentId || !timestamp || !signature) {
      return res.status(400).send(renderConfirmationPage(false, 'Invalid confirmation link'));
    }

    // Check if token is expired (24 hours)
    const tokenAge = Date.now() - parseInt(timestamp);
    if (tokenAge > 24 * 60 * 60 * 1000) {
      return res.status(400).send(renderConfirmationPage(false, 'Confirmation link has expired'));
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.JWT_SECRET || 'default-secret')
      .update(`${appointmentId}:${timestamp}`)
      .digest('hex')
      .substring(0, 16);

    if (signature !== expectedSignature) {
      return res.status(400).send(renderConfirmationPage(false, 'Invalid confirmation link'));
    }

    // Find and update appointment
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { organization: { select: { name: true, brandName: true } } },
    });

    if (!appointment) {
      return res.status(404).send(renderConfirmationPage(false, 'Appointment not found'));
    }

    if (appointment.status === 'CANCELLED') {
      return res.status(400).send(renderConfirmationPage(false, 'This appointment has been cancelled'));
    }

    if (appointment.customerConfirmed) {
      return res.send(renderConfirmationPage(true, 'Your appointment is already confirmed!', appointment));
    }

    // Confirm the appointment
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        customerConfirmed: true,
        status: 'CONFIRMED',
        confirmedAt: new Date(),
      },
    });

    // Log the confirmation
    await prisma.appointmentReminderLog.create({
      data: {
        appointmentId,
        reminderType: 'confirmation_link',
        channel: 'link',
        status: 'confirmed',
      },
    });

    return res.send(renderConfirmationPage(true, 'Your appointment has been confirmed!', appointment));
  } catch (error) {
    console.error('[AppointmentReminder] Error confirming appointment:', error);
    return res.status(500).send(renderConfirmationPage(false, 'An error occurred. Please try again.'));
  }
});

/**
 * Generate a confirmation token for an appointment
 */
export function generateConfirmationToken(appointmentId: string): string {
  const timestamp = Date.now().toString();
  const signature = crypto
    .createHmac('sha256', process.env.JWT_SECRET || 'default-secret')
    .update(`${appointmentId}:${timestamp}`)
    .digest('hex')
    .substring(0, 16);

  return Buffer.from(`${appointmentId}:${timestamp}:${signature}`).toString('base64');
}

/**
 * Render a simple HTML confirmation page
 */
function renderConfirmationPage(success: boolean, message: string, appointment?: any): string {
  const orgName = appointment?.organization?.brandName || appointment?.organization?.name || 'Our Team';
  const appointmentDetails = appointment
    ? `
      <div style="margin-top: 20px; padding: 15px; background: #f8fafc; border-radius: 8px; text-align: left;">
        <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date(appointment.scheduledAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        <p style="margin: 5px 0;"><strong>Time:</strong> ${new Date(appointment.scheduledAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
        <p style="margin: 5px 0;"><strong>Location:</strong> ${appointment.locationDetails || appointment.locationType}</p>
      </div>
    `
    : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Appointment Confirmation</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f1f5f9; }
        .container { max-width: 400px; margin: 50px auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; }
        .icon { font-size: 48px; margin-bottom: 15px; }
        .success { color: #10b981; }
        .error { color: #ef4444; }
        h1 { font-size: 20px; color: #1e293b; margin: 0 0 10px; }
        p { color: #64748b; margin: 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon ${success ? 'success' : 'error'}">${success ? '&#10004;' : '&#10006;'}</div>
        <h1>${message}</h1>
        ${success ? `<p>Thank you for confirming with ${orgName}.</p>` : '<p>Please contact us if you need assistance.</p>'}
        ${appointmentDetails}
      </div>
    </body>
    </html>
  `;
}

// ==================== PROTECTED ENDPOINTS ====================

// All routes below require authentication
router.use(authenticate);

/**
 * GET /api/appointment-reminders/settings
 * Get reminder settings for the current organization
 */
router.get('/settings', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organization not found' });
    }

    const settings = await appointmentReminderService.getSettings(organizationId);
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/appointment-reminders/settings
 * Update reminder settings for the current organization
 */
router.put('/settings', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organization not found' });
    }

    const {
      enabled,
      reminder24h,
      reminder2h,
      reminder30m,
      useWhatsApp,
      useSMS,
      useEmail,
      useAICall,
      template24h,
      template2h,
      template30m,
      createTaskOnNoResponse,
      notifyManagerOnNoShow,
    } = req.body;

    const settings = await appointmentReminderService.updateSettings(organizationId, {
      enabled,
      reminder24h,
      reminder2h,
      reminder30m,
      useWhatsApp,
      useSMS,
      useEmail,
      useAICall,
      template24h,
      template2h,
      template30m,
      createTaskOnNoResponse,
      notifyManagerOnNoShow,
    });

    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/appointment-reminders/logs
 * Get reminder logs for the current organization
 */
router.get('/logs', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organization not found' });
    }

    const limit = parseInt(req.query.limit as string) || 100;
    const logs = await appointmentReminderService.getOrganizationReminderLogs(organizationId, limit);

    res.json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/appointment-reminders/logs/:appointmentId
 * Get reminder logs for a specific appointment
 */
router.get('/logs/:appointmentId', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organization not found' });
    }

    const { appointmentId } = req.params;

    // Verify appointment belongs to organization
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, organizationId },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const logs = await appointmentReminderService.getReminderLogs(appointmentId);
    res.json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/appointment-reminders/test
 * Send a test reminder
 */
router.post('/test', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organization not found' });
    }

    const { reminderType, testPhone, testEmail } = req.body;

    if (!reminderType || !['24h', '2h', '30m'].includes(reminderType)) {
      return res.status(400).json({ error: 'Invalid reminderType. Must be 24h, 2h, or 30m' });
    }

    if (!testPhone && !testEmail) {
      return res.status(400).json({ error: 'At least one of testPhone or testEmail is required' });
    }

    const result = await appointmentReminderService.sendTestReminder(
      organizationId,
      reminderType,
      testPhone,
      testEmail
    );

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/appointments/:id/confirm
 * Mark an appointment as confirmed by customer
 */
router.post('/:id/confirm', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organization not found' });
    }

    const { id } = req.params;

    // Verify appointment belongs to organization
    const appointment = await prisma.appointment.findFirst({
      where: { id, organizationId },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    await appointmentReminderService.confirmAppointment(id);

    res.json({ success: true, message: 'Appointment confirmed' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/appointment-reminders/stats
 * Get reminder statistics for the organization
 */
router.get('/stats', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organization not found' });
    }

    // Get statistics
    const totalAppointments = await prisma.appointment.count({
      where: { organizationId },
    });

    const confirmedAppointments = await prisma.appointment.count({
      where: { organizationId, customerConfirmed: true },
    });

    const appointmentsWithReminders = await prisma.appointment.count({
      where: {
        organizationId,
        OR: [
          { reminder24hSent: true },
          { reminder2hSent: true },
          { reminder30mSent: true },
        ],
      },
    });

    // Get reminder log stats
    const appointments = await prisma.appointment.findMany({
      where: { organizationId },
      select: { id: true },
    });
    const appointmentIds = appointments.map(a => a.id);

    const remindersSent = await prisma.appointmentReminderLog.count({
      where: {
        appointmentId: { in: appointmentIds },
        status: 'sent',
      },
    });

    const remindersFailed = await prisma.appointmentReminderLog.count({
      where: {
        appointmentId: { in: appointmentIds },
        status: 'failed',
      },
    });

    // Channel breakdown
    const channelStats = await prisma.appointmentReminderLog.groupBy({
      by: ['channel'],
      where: { appointmentId: { in: appointmentIds } },
      _count: { id: true },
    });

    res.json({
      success: true,
      data: {
        totalAppointments,
        confirmedAppointments,
        confirmationRate: totalAppointments > 0 ? (confirmedAppointments / totalAppointments * 100).toFixed(1) : 0,
        appointmentsWithReminders,
        remindersSent,
        remindersFailed,
        deliveryRate: (remindersSent + remindersFailed) > 0
          ? (remindersSent / (remindersSent + remindersFailed) * 100).toFixed(1)
          : 0,
        channelBreakdown: channelStats.reduce((acc, stat) => {
          acc[stat.channel] = stat._count.id;
          return acc;
        }, {} as Record<string, number>),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/appointment-reminders/default-templates
 * Get default message templates
 */
router.get('/default-templates', async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      template24h: `Hi {{firstName}},

This is a reminder about your appointment tomorrow.

Date: {{appointmentDate}}
Time: {{appointmentTime}}
Location: {{location}}

Reply CONFIRM to confirm your attendance, or click here: {{confirmLink}}

See you soon!`,
      template2h: `Hi {{firstName}},

Your appointment is in 2 hours.

Time: {{appointmentTime}}
Location: {{location}}

Please confirm: {{confirmLink}}

Let us know if you need to reschedule.`,
      template30m: `Hi {{firstName}},

Your appointment is in 30 minutes!

Location: {{location}}

We're looking forward to meeting you!`,
      variables: [
        { name: 'firstName', description: 'Customer first name' },
        { name: 'fullName', description: 'Customer full name' },
        { name: 'appointmentTitle', description: 'Title of the appointment' },
        { name: 'appointmentDate', description: 'Date of appointment (e.g., Monday, January 1, 2024)' },
        { name: 'appointmentTime', description: 'Time of appointment (e.g., 2:30 PM)' },
        { name: 'duration', description: 'Duration of appointment (e.g., 30 minutes)' },
        { name: 'location', description: 'Location or meeting details' },
        { name: 'locationType', description: 'Type of location (Phone Call, Video Call, In-Person)' },
        { name: 'confirmLink', description: 'One-click confirmation link for customer' },
      ],
    },
  });
});

/**
 * POST /api/appointment-reminders/trigger
 * Manually trigger reminder check (admin only)
 */
router.post('/trigger', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user?.organizationId;
    const userRole = req.user?.role?.toLowerCase();

    if (!organizationId) {
      return res.status(401).json({ error: 'Organization not found' });
    }

    // Only admins can trigger manual check
    if (!['admin', 'owner', 'super_admin'].includes(userRole || '')) {
      return res.status(403).json({ error: 'Only admins can trigger reminder checks' });
    }

    const results = await appointmentReminderService.checkAndSendReminders();

    res.json({
      success: true,
      message: `Processed ${results.length} reminders`,
      data: results,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
