import nodemailer, { Transporter } from 'nodemailer';
import * as SES from '@aws-sdk/client-ses';
import crypto from 'crypto';
import { prisma } from '../config/database';
import { config } from '../config';
import { BadRequestError, NotFoundError } from '../utils/errors';

// Encryption key for sensitive fields (should be in env)
const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY || config.jwt.secret.slice(0, 32).padEnd(32, '0');
const IV_LENGTH = 16;

interface EmailSettingsInput {
  provider: 'smtp' | 'sendgrid' | 'ses' | 'mailgun';

  // SMTP
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPassword?: string;

  // SendGrid
  sendgridApiKey?: string;

  // AWS SES
  sesAccessKeyId?: string;
  sesSecretAccessKey?: string;
  sesRegion?: string;

  // Mailgun
  mailgunApiKey?: string;
  mailgunDomain?: string;

  // Common
  fromEmail: string;
  fromName?: string;
  replyToEmail?: string;
  emailSignature?: string;
  emailFooter?: string;
  dailyLimit?: number;
  hourlyLimit?: number;
  isActive?: boolean;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
}

export class EmailSettingsService {
  // Cache transporters per organization to avoid recreating
  private transporterCache: Map<string, { transporter: Transporter; expiresAt: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // ==================== ENCRYPTION HELPERS ====================

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  private decrypt(text: string): string {
    try {
      const parts = text.split(':');
      const iv = Buffer.from(parts.shift()!, 'hex');
      const encryptedText = Buffer.from(parts.join(':'), 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      return decrypted.toString();
    } catch {
      return text; // Return as-is if not encrypted (migration case)
    }
  }

  // ==================== CRUD OPERATIONS ====================

  async getSettings(organizationId: string) {
    const settings = await prisma.emailSettings.findUnique({
      where: { organizationId },
    });

    if (!settings) {
      return null;
    }

    // Return settings with masked sensitive fields
    return {
      ...settings,
      smtpPassword: settings.smtpPassword ? '********' : null,
      sendgridApiKey: settings.sendgridApiKey ? '********' : null,
      sesAccessKeyId: settings.sesAccessKeyId ? '********' : null,
      sesSecretAccessKey: settings.sesSecretAccessKey ? '********' : null,
      mailgunApiKey: settings.mailgunApiKey ? '********' : null,
    };
  }

  async createOrUpdateSettings(organizationId: string, input: EmailSettingsInput) {
    // Validate provider-specific required fields
    this.validateProviderConfig(input);

    // Encrypt sensitive fields
    const encryptedData: any = {
      provider: input.provider,
      fromEmail: input.fromEmail,
      fromName: input.fromName,
      replyToEmail: input.replyToEmail,
      emailSignature: input.emailSignature,
      emailFooter: input.emailFooter,
      dailyLimit: input.dailyLimit,
      hourlyLimit: input.hourlyLimit,
      isActive: input.isActive ?? true,
    };

    // Only update credentials if provided (not masked)
    if (input.smtpHost) encryptedData.smtpHost = input.smtpHost;
    if (input.smtpPort) encryptedData.smtpPort = input.smtpPort;
    if (input.smtpSecure !== undefined) encryptedData.smtpSecure = input.smtpSecure;
    if (input.smtpUser) encryptedData.smtpUser = input.smtpUser;
    if (input.smtpPassword && input.smtpPassword !== '********') {
      encryptedData.smtpPassword = this.encrypt(input.smtpPassword);
    }

    if (input.sendgridApiKey && input.sendgridApiKey !== '********') {
      encryptedData.sendgridApiKey = this.encrypt(input.sendgridApiKey);
    }

    if (input.sesAccessKeyId && input.sesAccessKeyId !== '********') {
      encryptedData.sesAccessKeyId = this.encrypt(input.sesAccessKeyId);
    }
    if (input.sesSecretAccessKey && input.sesSecretAccessKey !== '********') {
      encryptedData.sesSecretAccessKey = this.encrypt(input.sesSecretAccessKey);
    }
    if (input.sesRegion) encryptedData.sesRegion = input.sesRegion;

    if (input.mailgunApiKey && input.mailgunApiKey !== '********') {
      encryptedData.mailgunApiKey = this.encrypt(input.mailgunApiKey);
    }
    if (input.mailgunDomain) encryptedData.mailgunDomain = input.mailgunDomain;

    // Clear cache for this org
    this.transporterCache.delete(organizationId);

    // Upsert settings
    const settings = await prisma.emailSettings.upsert({
      where: { organizationId },
      update: {
        ...encryptedData,
        isVerified: false, // Reset verification on update
        updatedAt: new Date(),
      },
      create: {
        organizationId,
        ...encryptedData,
      },
    });

    return this.getSettings(organizationId);
  }

  async deleteSettings(organizationId: string) {
    const settings = await prisma.emailSettings.findUnique({
      where: { organizationId },
    });

    if (!settings) {
      throw new NotFoundError('Email settings not found');
    }

    // Clear cache
    this.transporterCache.delete(organizationId);

    await prisma.emailSettings.delete({
      where: { organizationId },
    });

    return { deleted: true };
  }

  // ==================== VALIDATION ====================

  private validateProviderConfig(input: EmailSettingsInput) {
    switch (input.provider) {
      case 'smtp':
        if (!input.smtpHost && !input.smtpUser) {
          // Allow partial updates
          break;
        }
        if (!input.smtpHost || !input.smtpUser || !input.smtpPassword) {
          if (input.smtpPassword !== '********') { // Not a masked update
            throw new BadRequestError('SMTP requires host, user, and password');
          }
        }
        break;

      case 'sendgrid':
        if (!input.sendgridApiKey || input.sendgridApiKey === '********') {
          // Check if this is an update (existing settings will have the key)
          break;
        }
        break;

      case 'ses':
        if ((!input.sesAccessKeyId || !input.sesSecretAccessKey) &&
            input.sesAccessKeyId !== '********' && input.sesSecretAccessKey !== '********') {
          break; // Allow partial updates
        }
        break;

      case 'mailgun':
        if ((!input.mailgunApiKey || !input.mailgunDomain) && input.mailgunApiKey !== '********') {
          break; // Allow partial updates
        }
        break;

      default:
        throw new BadRequestError(`Unsupported email provider: ${input.provider}`);
    }

    if (!input.fromEmail) {
      throw new BadRequestError('From email is required');
    }
  }

  // ==================== TRANSPORTER CREATION ====================

  async getTransporter(organizationId: string): Promise<Transporter | null> {
    // Check cache first
    const cached = this.transporterCache.get(organizationId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.transporter;
    }

    // Get settings from database
    const settings = await prisma.emailSettings.findUnique({
      where: { organizationId },
    });

    if (!settings || !settings.isActive) {
      return null;
    }

    let transporter: Transporter;

    switch (settings.provider) {
      case 'smtp':
        transporter = nodemailer.createTransport({
          host: settings.smtpHost!,
          port: settings.smtpPort || 587,
          secure: settings.smtpSecure || false,
          auth: {
            user: settings.smtpUser!,
            pass: this.decrypt(settings.smtpPassword!),
          },
        });
        break;

      case 'sendgrid':
        transporter = nodemailer.createTransport({
          host: 'smtp.sendgrid.net',
          port: 587,
          secure: false,
          auth: {
            user: 'apikey',
            pass: this.decrypt(settings.sendgridApiKey!),
          },
        });
        break;

      case 'ses':
        const sesClient = new SES.SESClient({
          region: settings.sesRegion || 'us-east-1',
          credentials: {
            accessKeyId: this.decrypt(settings.sesAccessKeyId!),
            secretAccessKey: this.decrypt(settings.sesSecretAccessKey!),
          },
        });
        transporter = nodemailer.createTransport({
          SES: { ses: sesClient, aws: SES },
        });
        break;

      case 'mailgun':
        // Mailgun via SMTP
        const domain = settings.mailgunDomain!;
        transporter = nodemailer.createTransport({
          host: 'smtp.mailgun.org',
          port: 587,
          secure: false,
          auth: {
            user: `postmaster@${domain}`,
            pass: this.decrypt(settings.mailgunApiKey!),
          },
        });
        break;

      default:
        return null;
    }

    // Cache the transporter
    this.transporterCache.set(organizationId, {
      transporter,
      expiresAt: Date.now() + this.CACHE_TTL,
    });

    return transporter;
  }

  // ==================== EMAIL SENDING ====================

  async sendEmail(organizationId: string, options: SendEmailOptions) {
    const settings = await prisma.emailSettings.findUnique({
      where: { organizationId },
    });

    if (!settings) {
      throw new NotFoundError('Email settings not configured for this organization');
    }

    if (!settings.isActive) {
      throw new BadRequestError('Email settings are disabled');
    }

    // Check rate limits
    await this.checkRateLimits(settings);

    const transporter = await this.getTransporter(organizationId);
    if (!transporter) {
      throw new BadRequestError('Failed to create email transporter');
    }

    // Build from address
    const fromAddress = settings.fromName
      ? `"${settings.fromName}" <${settings.fromEmail}>`
      : settings.fromEmail;

    // Append signature and footer if configured
    let htmlContent = options.html || '';
    let textContent = options.text || '';

    if (settings.emailSignature) {
      htmlContent += `<br><br>${settings.emailSignature}`;
      textContent += `\n\n${settings.emailSignature.replace(/<[^>]*>/g, '')}`;
    }

    if (settings.emailFooter) {
      htmlContent += `<hr style="margin-top: 20px; border: none; border-top: 1px solid #e5e7eb;"><p style="font-size: 12px; color: #6b7280;">${settings.emailFooter}</p>`;
      textContent += `\n\n---\n${settings.emailFooter.replace(/<[^>]*>/g, '')}`;
    }

    try {
      const result = await transporter.sendMail({
        from: fromAddress,
        to: options.to,
        subject: options.subject,
        text: textContent,
        html: htmlContent || undefined,
        replyTo: options.replyTo || settings.replyToEmail || undefined,
        attachments: options.attachments,
      });

      // Update sent count
      await this.incrementSentCount(organizationId);

      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error) {
      // Log error to settings
      await prisma.emailSettings.update({
        where: { organizationId },
        data: {
          lastError: (error as Error).message,
        },
      });
      throw error;
    }
  }

  // ==================== RATE LIMITING ====================

  private async checkRateLimits(settings: any) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Reset counter if it's a new day
    if (!settings.lastResetAt || new Date(settings.lastResetAt) < today) {
      await prisma.emailSettings.update({
        where: { id: settings.id },
        data: {
          emailsSentToday: 0,
          lastResetAt: today,
        },
      });
      settings.emailsSentToday = 0;
    }

    // Check daily limit
    if (settings.dailyLimit && settings.emailsSentToday >= settings.dailyLimit) {
      throw new BadRequestError(`Daily email limit (${settings.dailyLimit}) reached`);
    }
  }

  private async incrementSentCount(organizationId: string) {
    await prisma.emailSettings.update({
      where: { organizationId },
      data: {
        emailsSentToday: { increment: 1 },
      },
    });
  }

  // ==================== CONNECTION TEST ====================

  async testConnection(organizationId: string) {
    const transporter = await this.getTransporter(organizationId);

    if (!transporter) {
      return {
        success: false,
        error: 'Email settings not configured or inactive',
      };
    }

    try {
      await transporter.verify();

      // Update verification status
      await prisma.emailSettings.update({
        where: { organizationId },
        data: {
          isVerified: true,
          lastTestedAt: new Date(),
          lastError: null,
        },
      });

      return {
        success: true,
        message: 'Email connection verified successfully',
      };
    } catch (error) {
      // Update error status
      await prisma.emailSettings.update({
        where: { organizationId },
        data: {
          isVerified: false,
          lastTestedAt: new Date(),
          lastError: (error as Error).message,
        },
      });

      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  async sendTestEmail(organizationId: string, toEmail: string) {
    const settings = await prisma.emailSettings.findUnique({
      where: { organizationId },
      include: {
        organization: {
          select: { name: true },
        },
      },
    });

    if (!settings) {
      throw new NotFoundError('Email settings not configured');
    }

    return this.sendEmail(organizationId, {
      to: toEmail,
      subject: `Test Email from ${settings.organization.name}`,
      text: `This is a test email to verify your email configuration is working correctly.\n\nProvider: ${settings.provider}\nFrom: ${settings.fromEmail}\n\nIf you received this email, your email settings are configured correctly!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #3b82f6;">Test Email</h2>
          <p>This is a test email to verify your email configuration is working correctly.</p>
          <table style="margin: 20px 0; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Provider</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">${settings.provider.toUpperCase()}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">From</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">${settings.fromEmail}</td>
            </tr>
          </table>
          <p style="color: #10b981; font-weight: bold;">If you received this email, your email settings are configured correctly!</p>
        </div>
      `,
    });
  }
}

export const emailSettingsService = new EmailSettingsService();
