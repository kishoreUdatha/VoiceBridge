import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config';
import { prisma } from '../config/database';
import { MessageDirection, MessageStatus } from '@prisma/client';
import { emailTrackingService } from '../services/email-tracking.service';
import { emailSettingsService } from '../services/emailSettings.service';

interface SendEmailInput {
  to: string;
  subject: string;
  body: string;
  html?: string;
  leadId?: string;
  userId: string;
  organizationId?: string; // For org-specific email settings
  campaignId?: string;
  enableTracking?: boolean;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
}

interface SendBulkEmailInput {
  recipients: Array<{
    email: string;
    name?: string;
    leadId?: string;
  }>;
  subject: string;
  body: string;
  html?: string;
  userId: string;
}

export class EmailService {
  private transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });
  }

  async sendEmail(input: SendEmailInput) {
    // Create email log first to get the ID for tracking
    const emailLog = await prisma.emailLog.create({
      data: {
        leadId: input.leadId,
        userId: input.userId,
        campaignId: input.campaignId,
        toEmail: input.to,
        subject: input.subject,
        body: input.body,
        direction: MessageDirection.OUTBOUND,
        status: MessageStatus.PENDING,
      },
    });

    try {
      // Process HTML for tracking if enabled and HTML is provided
      let processedHtml = input.html;
      if (input.enableTracking !== false && input.html) {
        processedHtml = emailTrackingService.processHtmlForTracking(
          input.html,
          emailLog.id,
          input.leadId,
          input.campaignId
        );
      }

      // Try to use org-specific email settings first
      if (input.organizationId) {
        try {
          const result = await emailSettingsService.sendEmail(input.organizationId, {
            to: input.to,
            subject: input.subject,
            text: input.body,
            html: processedHtml,
            attachments: input.attachments,
          });

          // Update email log with sent status
          const updatedLog = await prisma.emailLog.update({
            where: { id: emailLog.id },
            data: {
              status: MessageStatus.SENT,
              providerMsgId: result.messageId,
              sentAt: new Date(),
            },
          });

          return { success: true, messageId: result.messageId, log: updatedLog };
        } catch (orgEmailError: any) {
          // If org settings not found or failed, fall back to default
          if (orgEmailError.name === 'NotFoundError' || orgEmailError.message?.includes('not configured')) {
            console.log(`[Email] Org ${input.organizationId} has no email settings, using default`);
          } else {
            throw orgEmailError; // Re-throw if it's a real error
          }
        }
      }

      // Fall back to default transporter
      const info = await this.transporter.sendMail({
        from: config.smtp.from,
        to: input.to,
        subject: input.subject,
        text: input.body,
        html: processedHtml,
        attachments: input.attachments,
      });

      // Update email log with sent status
      const updatedLog = await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: MessageStatus.SENT,
          providerMsgId: info.messageId,
          sentAt: new Date(),
        },
      });

      return { success: true, messageId: info.messageId, log: updatedLog };
    } catch (error) {
      // Update email log with failed status
      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: MessageStatus.FAILED,
          metadata: { error: (error as Error).message },
        },
      });

      throw error;
    }
  }

  async sendBulkEmail(input: SendBulkEmailInput) {
    const results = [];

    for (const recipient of input.recipients) {
      try {
        // Personalize message
        const personalizedBody = this.personalizeMessage(input.body, recipient);
        const personalizedHtml = input.html
          ? this.personalizeMessage(input.html, recipient)
          : undefined;

        const result = await this.sendEmail({
          to: recipient.email,
          subject: input.subject,
          body: personalizedBody,
          html: personalizedHtml,
          leadId: recipient.leadId,
          userId: input.userId,
        });

        results.push({
          email: recipient.email,
          success: true,
          messageId: result.messageId,
        });
      } catch (error) {
        results.push({
          email: recipient.email,
          success: false,
          error: (error as Error).message,
        });
      }
    }

    return results;
  }

  private personalizeMessage(message: string, recipient: { name?: string; email: string }) {
    return message
      .replace(/{name}/g, recipient.name || 'Student')
      .replace(/{email}/g, recipient.email);
  }

  async sendPasswordResetEmail(email: string, resetToken: string) {
    const resetUrl = `${config.frontendUrl}/reset-password?token=${resetToken}`;

    return this.sendEmail({
      to: email,
      subject: 'Password Reset Request',
      body: `You requested a password reset. Click here to reset your password: ${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, please ignore this email.`,
      html: `
        <h2>Password Reset Request</h2>
        <p>You requested a password reset. Click the button below to reset your password:</p>
        <p><a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
        <p>This link expires in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
      userId: 'system',
    });
  }

  async sendWelcomeEmail(user: { email: string; firstName: string }) {
    return this.sendEmail({
      to: user.email,
      subject: 'Welcome to CRM Lead Generation',
      body: `Hi ${user.firstName},\n\nWelcome to CRM Lead Generation! Your account has been created successfully.\n\nGet started by logging in at ${config.frontendUrl}/login\n\nBest regards,\nThe CRM Team`,
      html: `
        <h2>Welcome to CRM Lead Generation!</h2>
        <p>Hi ${user.firstName},</p>
        <p>Your account has been created successfully.</p>
        <p><a href="${config.frontendUrl}/login" style="display: inline-block; padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px;">Login Now</a></p>
        <p>Best regards,<br>The CRM Team</p>
      `,
      userId: 'system',
    });
  }

  async sendPaymentConfirmation(
    user: { email: string; firstName: string },
    payment: { amount: number; currency: string; orderId: string }
  ) {
    return this.sendEmail({
      to: user.email,
      subject: 'Payment Confirmation',
      body: `Hi ${user.firstName},\n\nThank you for your payment!\n\nAmount: ${payment.currency} ${payment.amount}\nOrder ID: ${payment.orderId}\n\nBest regards,\nThe CRM Team`,
      html: `
        <h2>Payment Confirmation</h2>
        <p>Hi ${user.firstName},</p>
        <p>Thank you for your payment!</p>
        <table style="border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Amount</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${payment.currency} ${payment.amount}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Order ID</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${payment.orderId}</td>
          </tr>
        </table>
        <p>Best regards,<br>The CRM Team</p>
      `,
      userId: 'system',
    });
  }

  async verifyConnection() {
    try {
      await this.transporter.verify();
      return { success: true, message: 'Email connection verified' };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Send email using organization's own email settings
   * Falls back to default if org settings not available
   */
  async sendEmailWithOrgSettings(
    organizationId: string,
    options: {
      to: string;
      subject: string;
      text: string;
      html?: string;
      attachments?: Array<{ filename: string; content: string | Buffer; contentType?: string }>;
    }
  ) {
    // Try org-specific settings first
    try {
      return await emailSettingsService.sendEmail(organizationId, options);
    } catch (error: any) {
      // If not configured, use default
      if (error.name === 'NotFoundError' || error.message?.includes('not configured')) {
        const info = await this.transporter.sendMail({
          from: config.smtp.from,
          to: options.to,
          subject: options.subject,
          text: options.text,
          html: options.html,
          attachments: options.attachments,
        });
        return { success: true, messageId: info.messageId };
      }
      throw error;
    }
  }

  /**
   * Generate ICS calendar file content
   */
  generateIcsContent(event: {
    uid: string;
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    location?: string;
    organizerEmail: string;
    organizerName?: string;
    attendeeEmail: string;
    attendeeName?: string;
  }): string {
    const formatIcsDate = (date: Date): string => {
      return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };

    const escapeIcsText = (text: string): string => {
      return text
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');
    };

    const now = new Date();
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//MyLeadX//Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:REQUEST',
      'BEGIN:VEVENT',
      `UID:${event.uid}`,
      `DTSTAMP:${formatIcsDate(now)}`,
      `DTSTART:${formatIcsDate(event.startTime)}`,
      `DTEND:${formatIcsDate(event.endTime)}`,
      `SUMMARY:${escapeIcsText(event.title)}`,
    ];

    if (event.description) {
      lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
    }

    if (event.location) {
      lines.push(`LOCATION:${escapeIcsText(event.location)}`);
    }

    lines.push(`ORGANIZER;CN=${event.organizerName || 'MyLeadX'}:mailto:${event.organizerEmail}`);
    lines.push(`ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN=${event.attendeeName || event.attendeeEmail}:mailto:${event.attendeeEmail}`);

    lines.push('STATUS:CONFIRMED');
    lines.push('SEQUENCE:0');
    lines.push('BEGIN:VALARM');
    lines.push('TRIGGER:-PT60M');
    lines.push('ACTION:EMAIL');
    lines.push(`DESCRIPTION:Reminder: ${escapeIcsText(event.title)}`);
    lines.push('END:VALARM');
    lines.push('BEGIN:VALARM');
    lines.push('TRIGGER:-PT15M');
    lines.push('ACTION:DISPLAY');
    lines.push(`DESCRIPTION:Reminder: ${escapeIcsText(event.title)}`);
    lines.push('END:VALARM');
    lines.push('END:VEVENT');
    lines.push('END:VCALENDAR');

    return lines.join('\r\n');
  }

  /**
   * Send calendar invitation email with ICS attachment
   */
  async sendCalendarInvitation(input: {
    to: string;
    toName?: string;
    eventTitle: string;
    eventDescription?: string;
    startTime: Date;
    endTime: Date;
    location?: string;
    eventId?: string;
  }) {
    const organizerEmail = config.smtp.from || 'noreply@myleadx.ai';
    const uid = input.eventId || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@myleadx`;

    // Generate ICS content
    const icsContent = this.generateIcsContent({
      uid,
      title: input.eventTitle,
      description: input.eventDescription,
      startTime: input.startTime,
      endTime: input.endTime,
      location: input.location,
      organizerEmail,
      organizerName: 'MyLeadX',
      attendeeEmail: input.to,
      attendeeName: input.toName,
    });

    // Format date for display
    const formatDisplayDate = (date: Date): string => {
      return date.toLocaleString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Kolkata',
      });
    };

    const startDisplay = formatDisplayDate(input.startTime);
    const endDisplay = formatDisplayDate(input.endTime);

    const subject = `Calendar Invitation: ${input.eventTitle}`;
    const body = `
You have been invited to the following event:

${input.eventTitle}

When: ${startDisplay} - ${endDisplay}
${input.location ? `Where: ${input.location}` : ''}
${input.eventDescription ? `\nDetails:\n${input.eventDescription}` : ''}

Please find the calendar invitation attached. You can add this event to your calendar by opening the attached .ics file.

Best regards,
MyLeadX
    `.trim();

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3b82f6;">Calendar Invitation</h2>
        <h3 style="color: #1f2937;">${input.eventTitle}</h3>

        <table style="margin: 20px 0; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 16px 8px 0; color: #6b7280; font-weight: bold;">When:</td>
            <td style="padding: 8px 0;">${startDisplay}</td>
          </tr>
          <tr>
            <td style="padding: 8px 16px 8px 0; color: #6b7280; font-weight: bold;">Duration:</td>
            <td style="padding: 8px 0;">${Math.round((input.endTime.getTime() - input.startTime.getTime()) / 60000)} minutes</td>
          </tr>
          ${input.location ? `
          <tr>
            <td style="padding: 8px 16px 8px 0; color: #6b7280; font-weight: bold;">Where:</td>
            <td style="padding: 8px 0;">${input.location}</td>
          </tr>
          ` : ''}
        </table>

        ${input.eventDescription ? `
        <div style="margin: 20px 0; padding: 16px; background-color: #f3f4f6; border-radius: 8px;">
          <p style="margin: 0; color: #374151;">${input.eventDescription.replace(/\n/g, '<br>')}</p>
        </div>
        ` : ''}

        <p style="margin-top: 24px; padding: 16px; background-color: #dbeafe; border-radius: 8px; color: #1e40af;">
          <strong>Note:</strong> Please open the attached <code>invite.ics</code> file to add this event to your calendar.
        </p>

        <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 14px;">
          This invitation was sent by MyLeadX Voice AI System.
        </p>
      </div>
    `;

    try {
      const info = await this.transporter.sendMail({
        from: config.smtp.from,
        to: input.to,
        subject,
        text: body,
        html,
        attachments: [
          {
            filename: 'invite.ics',
            content: icsContent,
            contentType: 'text/calendar; method=REQUEST',
          },
        ],
        // Set content type for calendar invite
        icalEvent: {
          method: 'REQUEST',
          content: icsContent,
        },
      });

      console.log(`[Email] Calendar invitation sent to ${input.to}, messageId: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('[Email] Failed to send calendar invitation:', (error as Error).message);
      throw error;
    }
  }
}

export const emailService = new EmailService();
