/**
 * AWS SES Email Service
 * Provides email functionality via AWS Simple Email Service
 */

import { SESClient, SendEmailCommand, SendBulkTemplatedEmailCommand, SendTemplatedEmailCommand } from '@aws-sdk/client-ses';
import { config } from '../config';
import { prisma } from '../config/database';

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  body: string;
  html?: string;
  replyTo?: string;
  leadId?: string;
  userId: string;
  organizationId: string;
  campaignId?: string;
}

export interface SendTemplatedEmailInput {
  to: string | string[];
  templateId: string;
  variables: Record<string, string>;
  replyTo?: string;
  leadId?: string;
  userId: string;
  organizationId: string;
  campaignId?: string;
}

export interface SendBulkEmailInput {
  recipients: Array<{
    email: string;
    variables?: Record<string, string>;
    leadId?: string;
  }>;
  templateId: string;
  defaultVariables?: Record<string, string>;
  userId: string;
  organizationId: string;
  campaignId?: string;
}

export interface SesWebhookEvent {
  eventType: 'Bounce' | 'Complaint' | 'Delivery' | 'Send' | 'Reject' | 'Open' | 'Click';
  mail: {
    messageId: string;
    destination: string[];
    source: string;
  };
  bounce?: {
    bounceType: string;
    bounceSubType: string;
    bouncedRecipients: Array<{ emailAddress: string }>;
  };
  complaint?: {
    complainedRecipients: Array<{ emailAddress: string }>;
  };
  delivery?: {
    recipients: string[];
  };
}

class SesService {
  private client: SESClient | null = null;
  private fromEmail: string;
  private fromName: string;

  constructor() {
    this.fromEmail = config.ses?.fromEmail || 'noreply@myleadx.ai';
    this.fromName = config.ses?.fromName || 'MyLeadX';

    this.initClient();
  }

  /**
   * Initialize SES client
   */
  private initClient(): void {
    const accessKeyId = config.ses?.accessKeyId;
    const secretAccessKey = config.ses?.secretAccessKey;
    const region = config.ses?.region || 'ap-south-1';

    if (accessKeyId && secretAccessKey) {
      this.client = new SESClient({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
    }
  }

  /**
   * Check if SES is properly configured
   */
  isConfigured(): boolean {
    return this.client !== null;
  }

  /**
   * Format sender address
   */
  private formatSender(): string {
    return `${this.fromName} <${this.fromEmail}>`;
  }

  /**
   * Replace template variables with actual values
   */
  private substituteVariables(content: string, variables?: Record<string, string>): string {
    if (!variables) return content;

    let result = content;
    for (const [key, value] of Object.entries(variables)) {
      // Support both {{var}} and {var} formats
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
    return result;
  }

  /**
   * Send single email
   */
  async sendEmail(input: SendEmailInput): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.client) {
      console.error('[SES] Service not configured');
      return { success: false, error: 'AWS SES not configured' };
    }

    try {
      const toAddresses = Array.isArray(input.to) ? input.to : [input.to];

      const command = new SendEmailCommand({
        Source: this.formatSender(),
        Destination: {
          ToAddresses: toAddresses,
        },
        Message: {
          Subject: {
            Data: input.subject,
            Charset: 'UTF-8',
          },
          Body: {
            Text: {
              Data: input.body,
              Charset: 'UTF-8',
            },
            ...(input.html && {
              Html: {
                Data: input.html,
                Charset: 'UTF-8',
              },
            }),
          },
        },
        ...(input.replyTo && {
          ReplyToAddresses: [input.replyTo],
        }),
      });

      const response = await this.client.send(command);

      // Log to database
      await this.logEmail({
        toEmail: toAddresses[0],
        subject: input.subject,
        body: input.body,
        status: 'SENT',
        providerMsgId: response.MessageId,
        leadId: input.leadId,
        userId: input.userId,
        campaignId: input.campaignId,
      });

      return {
        success: true,
        messageId: response.MessageId,
      };
    } catch (error: any) {
      console.error('[SES] Send email error:', error.message);

      // Log failed attempt
      await this.logEmail({
        toEmail: Array.isArray(input.to) ? input.to[0] : input.to,
        subject: input.subject,
        body: input.body,
        status: 'FAILED',
        errorMessage: error.message,
        leadId: input.leadId,
        userId: input.userId,
        campaignId: input.campaignId,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send templated email
   */
  async sendTemplatedEmail(input: SendTemplatedEmailInput): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.client) {
      console.error('[SES] Service not configured');
      return { success: false, error: 'AWS SES not configured' };
    }

    try {
      // Get template from database
      const template = await prisma.messageTemplate.findUnique({
        where: { id: input.templateId },
      });

      if (!template) {
        return { success: false, error: 'Template not found' };
      }

      const toAddresses = Array.isArray(input.to) ? input.to : [input.to];
      const subject = this.substituteVariables(template.subject || '', input.variables);
      const body = this.substituteVariables(template.content, input.variables);
      const html = template.htmlContent ? this.substituteVariables(template.htmlContent, input.variables) : undefined;

      const command = new SendEmailCommand({
        Source: this.formatSender(),
        Destination: {
          ToAddresses: toAddresses,
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: 'UTF-8',
          },
          Body: {
            Text: {
              Data: body,
              Charset: 'UTF-8',
            },
            ...(html && {
              Html: {
                Data: html,
                Charset: 'UTF-8',
              },
            }),
          },
        },
        ...(input.replyTo && {
          ReplyToAddresses: [input.replyTo],
        }),
      });

      const response = await this.client.send(command);

      // Log to database
      await this.logEmail({
        toEmail: toAddresses[0],
        subject,
        body,
        templateId: input.templateId,
        status: 'SENT',
        providerMsgId: response.MessageId,
        leadId: input.leadId,
        userId: input.userId,
        campaignId: input.campaignId,
      });

      return {
        success: true,
        messageId: response.MessageId,
      };
    } catch (error: any) {
      console.error('[SES] Send templated email error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send bulk email using template
   */
  async sendBulkEmail(input: SendBulkEmailInput): Promise<{
    success: boolean;
    sent: number;
    failed: number;
    results?: Array<{ email: string; messageId?: string; error?: string }>;
  }> {
    if (!this.client) {
      console.error('[SES] Service not configured');
      return { success: false, sent: 0, failed: input.recipients.length };
    }

    try {
      // Get template from database
      const template = await prisma.messageTemplate.findUnique({
        where: { id: input.templateId },
      });

      if (!template) {
        return { success: false, sent: 0, failed: input.recipients.length };
      }

      const results: Array<{ email: string; messageId?: string; error?: string }> = [];
      let sent = 0;
      let failed = 0;

      // Process in batches of 50 (SES limit)
      const batchSize = 50;
      for (let i = 0; i < input.recipients.length; i += batchSize) {
        const batch = input.recipients.slice(i, i + batchSize);

        // Send each email in the batch
        const batchPromises = batch.map(async (recipient) => {
          const variables = { ...input.defaultVariables, ...recipient.variables };
          const subject = this.substituteVariables(template.subject || '', variables);
          const body = this.substituteVariables(template.content, variables);
          const html = template.htmlContent ? this.substituteVariables(template.htmlContent, variables) : undefined;

          try {
            const command = new SendEmailCommand({
              Source: this.formatSender(),
              Destination: {
                ToAddresses: [recipient.email],
              },
              Message: {
                Subject: {
                  Data: subject,
                  Charset: 'UTF-8',
                },
                Body: {
                  Text: {
                    Data: body,
                    Charset: 'UTF-8',
                  },
                  ...(html && {
                    Html: {
                      Data: html,
                      Charset: 'UTF-8',
                    },
                  }),
                },
              },
            });

            const response = await this.client!.send(command);

            // Log to database
            await this.logEmail({
              toEmail: recipient.email,
              subject,
              body,
              templateId: input.templateId,
              status: 'SENT',
              providerMsgId: response.MessageId,
              leadId: recipient.leadId,
              userId: input.userId,
              campaignId: input.campaignId,
            });

            return { email: recipient.email, messageId: response.MessageId };
          } catch (error: any) {
            // Log failed attempt
            await this.logEmail({
              toEmail: recipient.email,
              subject,
              body,
              templateId: input.templateId,
              status: 'FAILED',
              errorMessage: error.message,
              leadId: recipient.leadId,
              userId: input.userId,
              campaignId: input.campaignId,
            });

            return { email: recipient.email, error: error.message };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Count successes and failures
        batchResults.forEach((r) => {
          if (r.messageId) sent++;
          else failed++;
        });

        // Small delay between batches to avoid throttling
        if (i + batchSize < input.recipients.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      return {
        success: sent > 0,
        sent,
        failed,
        results,
      };
    } catch (error: any) {
      console.error('[SES] Bulk email error:', error.message);
      return {
        success: false,
        sent: 0,
        failed: input.recipients.length,
      };
    }
  }

  /**
   * Handle SES webhook notification (SNS notification)
   */
  async handleWebhook(event: SesWebhookEvent): Promise<void> {
    const messageId = event.mail.messageId;

    try {
      switch (event.eventType) {
        case 'Bounce':
          await this.handleBounce(messageId, event.bounce);
          break;
        case 'Complaint':
          await this.handleComplaint(messageId, event.complaint);
          break;
        case 'Delivery':
          await this.handleDelivery(messageId, event.delivery);
          break;
        case 'Open':
          await this.handleOpen(messageId);
          break;
        case 'Click':
          await this.handleClick(messageId);
          break;
        default:
          console.log(`[SES] Unhandled event type: ${event.eventType}`);
      }
    } catch (error) {
      console.error('[SES] Webhook handling error:', error);
    }
  }

  /**
   * Handle bounce notification
   */
  private async handleBounce(messageId: string, bounce?: SesWebhookEvent['bounce']): Promise<void> {
    if (!bounce) return;

    await prisma.emailLog.updateMany({
      where: { providerMsgId: messageId },
      data: {
        status: 'BOUNCED',
        metadata: {
          bounceType: bounce.bounceType,
          bounceSubType: bounce.bounceSubType,
        },
      },
    });

    // Create tracking event
    const emailLog = await prisma.emailLog.findFirst({
      where: { providerMsgId: messageId },
    });

    if (emailLog) {
      await prisma.emailTrackingEvent.create({
        data: {
          emailLogId: emailLog.id,
          eventType: 'BOUNCE',
          metadata: {
            bounceType: bounce.bounceType,
            bounceSubType: bounce.bounceSubType,
          },
        },
      });
    }

    console.log(`[SES] Email bounced: ${messageId}`);
  }

  /**
   * Handle complaint notification
   */
  private async handleComplaint(messageId: string, complaint?: SesWebhookEvent['complaint']): Promise<void> {
    if (!complaint) return;

    await prisma.emailLog.updateMany({
      where: { providerMsgId: messageId },
      data: {
        status: 'FAILED',
        metadata: {
          complaint: true,
        },
      },
    });

    // Create tracking event
    const emailLog = await prisma.emailLog.findFirst({
      where: { providerMsgId: messageId },
    });

    if (emailLog) {
      await prisma.emailTrackingEvent.create({
        data: {
          emailLogId: emailLog.id,
          eventType: 'COMPLAINT',
        },
      });
    }

    console.log(`[SES] Email complaint: ${messageId}`);
  }

  /**
   * Handle delivery notification
   */
  private async handleDelivery(messageId: string, delivery?: SesWebhookEvent['delivery']): Promise<void> {
    await prisma.emailLog.updateMany({
      where: { providerMsgId: messageId },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date(),
      },
    });

    console.log(`[SES] Email delivered: ${messageId}`);
  }

  /**
   * Handle open notification
   */
  private async handleOpen(messageId: string): Promise<void> {
    await prisma.emailLog.updateMany({
      where: { providerMsgId: messageId },
      data: {
        openedAt: new Date(),
      },
    });

    // Create tracking event
    const emailLog = await prisma.emailLog.findFirst({
      where: { providerMsgId: messageId },
    });

    if (emailLog) {
      await prisma.emailTrackingEvent.create({
        data: {
          emailLogId: emailLog.id,
          eventType: 'OPEN',
        },
      });
    }

    console.log(`[SES] Email opened: ${messageId}`);
  }

  /**
   * Handle click notification
   */
  private async handleClick(messageId: string): Promise<void> {
    await prisma.emailLog.updateMany({
      where: { providerMsgId: messageId },
      data: {
        clickedAt: new Date(),
      },
    });

    // Create tracking event
    const emailLog = await prisma.emailLog.findFirst({
      where: { providerMsgId: messageId },
    });

    if (emailLog) {
      await prisma.emailTrackingEvent.create({
        data: {
          emailLogId: emailLog.id,
          eventType: 'CLICK',
        },
      });
    }

    console.log(`[SES] Email clicked: ${messageId}`);
  }

  /**
   * Log email to database
   */
  private async logEmail(data: {
    toEmail: string;
    subject: string;
    body: string;
    templateId?: string;
    status: 'SENT' | 'FAILED' | 'DELIVERED' | 'BOUNCED';
    providerMsgId?: string;
    errorMessage?: string;
    leadId?: string;
    userId: string;
    campaignId?: string;
  }): Promise<void> {
    try {
      await prisma.emailLog.create({
        data: {
          toEmail: data.toEmail,
          subject: data.subject,
          body: data.body,
          direction: 'OUTBOUND',
          status: data.status,
          providerMsgId: data.providerMsgId,
          leadId: data.leadId,
          userId: data.userId,
          campaignId: data.campaignId,
          sentAt: data.status === 'SENT' ? new Date() : undefined,
          metadata: {
            provider: 'SES',
            templateId: data.templateId,
            errorMessage: data.errorMessage,
          },
        },
      });

      // Log activity for lead if leadId provided
      if (data.leadId) {
        await prisma.leadActivity.create({
          data: {
            leadId: data.leadId,
            userId: data.userId,
            type: 'EMAIL_SENT',
            description: `Email ${data.status === 'FAILED' ? 'failed' : 'sent'}: ${data.subject}`,
            metadata: {
              templateId: data.templateId,
              status: data.status,
              provider: 'SES',
              errorMessage: data.errorMessage,
            },
          },
        });
      }
    } catch (error) {
      console.error('[SES] Log email error:', error);
    }
  }

  /**
   * Get email history for a lead
   */
  async getEmailHistory(leadId: string, limit: number = 50): Promise<any[]> {
    return prisma.emailLog.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        trackingEvents: true,
      },
    });
  }

  /**
   * Get sending quota from SES
   */
  async getSendingQuota(): Promise<{
    success: boolean;
    max24HourSend?: number;
    maxSendRate?: number;
    sentLast24Hours?: number;
    error?: string;
  }> {
    if (!this.client) {
      return { success: false, error: 'AWS SES not configured' };
    }

    try {
      const { GetSendQuotaCommand } = await import('@aws-sdk/client-ses');
      const command = new GetSendQuotaCommand({});
      const response = await this.client.send(command);

      return {
        success: true,
        max24HourSend: response.Max24HourSend,
        maxSendRate: response.MaxSendRate,
        sentLast24Hours: response.SentLast24Hours,
      };
    } catch (error: any) {
      console.error('[SES] Get quota error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export const sesService = new SesService();
