import { OtpPurpose, OtpChannel, OtpIdentifierType } from '@prisma/client';
import { prisma } from '../config/database';
import crypto from 'crypto';


// OTP Configuration
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 3;
const RESEND_COOLDOWN_SECONDS = 60;

interface SendOtpOptions {
  identifier: string;
  identifierType: OtpIdentifierType;
  purpose: OtpPurpose;
  channel?: OtpChannel;
  organizationId?: string;
  leadId?: string;
  applicationId?: string;
  userId?: string;
}

interface VerifyOtpOptions {
  identifier: string;
  purpose: OtpPurpose;
  otp: string;
}

interface OtpResult {
  success: boolean;
  message: string;
  otpId?: string;
  expiresAt?: Date;
  attemptsRemaining?: number;
  canResendAt?: Date;
  channelUsed?: OtpChannel; // Actual channel used (useful for fallback)
}

class OtpService {
  /**
   * Generate a random numeric OTP
   */
  private generateOtp(): string {
    const min = Math.pow(10, OTP_LENGTH - 1);
    const max = Math.pow(10, OTP_LENGTH) - 1;
    return crypto.randomInt(min, max).toString();
  }

  /**
   * Hash OTP for secure storage
   */
  private hashOtp(otp: string): string {
    return crypto.createHash('sha256').update(otp).digest('hex');
  }

  /**
   * Verify OTP hash
   */
  private verifyOtpHash(otp: string, hash: string): boolean {
    return this.hashOtp(otp) === hash;
  }

  /**
   * Send OTP to the specified identifier
   */
  async sendOtp(options: SendOtpOptions): Promise<OtpResult> {
    const {
      identifier,
      identifierType,
      purpose,
      channel = identifierType === 'EMAIL' ? OtpChannel.EMAIL : OtpChannel.SMS,
      organizationId,
      leadId,
      applicationId,
      userId,
    } = options;

    // Check for recent OTP requests (cooldown)
    const recentOtp = await prisma.otpVerification.findFirst({
      where: {
        identifier,
        purpose,
        createdAt: {
          gte: new Date(Date.now() - RESEND_COOLDOWN_SECONDS * 1000),
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentOtp) {
      const canResendAt = new Date(recentOtp.createdAt.getTime() + RESEND_COOLDOWN_SECONDS * 1000);
      return {
        success: false,
        message: `Please wait ${RESEND_COOLDOWN_SECONDS} seconds before requesting a new OTP`,
        canResendAt,
      };
    }

    // Invalidate any existing OTPs for this identifier and purpose
    await prisma.otpVerification.updateMany({
      where: {
        identifier,
        purpose,
        isVerified: false,
      },
      data: {
        expiresAt: new Date(), // Expire immediately
      },
    });

    // Generate new OTP - use DEFAULT_OTP env var if set, otherwise generate random in production
    const defaultOtp = process.env.DEFAULT_OTP;
    const otp = defaultOtp || (process.env.NODE_ENV === 'production' ? this.generateOtp() : '112820');
    const hashedOtp = this.hashOtp(otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Log OTP for development or when using default OTP
    if (process.env.NODE_ENV !== 'production' || defaultOtp) {
      console.log(`[OTP] OTP for ${identifier}: ${otp}`);
    }

    // Create OTP record
    const otpRecord = await prisma.otpVerification.create({
      data: {
        identifier,
        identifierType,
        otp: hashedOtp,
        purpose,
        channel,
        organizationId,
        leadId,
        applicationId,
        userId,
        maxAttempts: MAX_ATTEMPTS,
        expiresAt,
      },
    });

    // Skip OTP delivery if SKIP_OTP_DELIVERY is set (for testing without SMS/WhatsApp providers)
    if (process.env.SKIP_OTP_DELIVERY === 'true') {
      console.log(`[OTP] Skipping delivery (SKIP_OTP_DELIVERY=true). OTP for ${identifier}: ${otp}`);
      return {
        success: true,
        message: `OTP sent successfully (test mode) to ${this.maskIdentifier(identifier, identifierType)}`,
        otpId: otpRecord.id,
        expiresAt,
        channelUsed: channel,
      };
    }

    // Send OTP via the appropriate channel with auto-fallback
    try {
      const { success: delivered, channelUsed } = await this.deliverOtpWithFallback(
        identifier,
        otp,
        channel,
        purpose,
        identifierType
      );

      if (!delivered) {
        // Delete the OTP record if all channels failed
        await prisma.otpVerification.delete({ where: { id: otpRecord.id } });
        return {
          success: false,
          message: 'Failed to send OTP. Please try again.',
        };
      }

      // Update the OTP record with the actual channel used (if different from requested)
      if (channelUsed !== channel) {
        await prisma.otpVerification.update({
          where: { id: otpRecord.id },
          data: { channel: channelUsed },
        });
      }

      console.log(`[OTP] Sent to ${identifier} via ${channelUsed} for ${purpose}`);

      const channelName = channelUsed === OtpChannel.WHATSAPP ? 'WhatsApp' : 'SMS';
      return {
        success: true,
        message: `OTP sent successfully via ${channelName} to ${this.maskIdentifier(identifier, identifierType)}`,
        otpId: otpRecord.id,
        expiresAt,
        channelUsed,
      };
    } catch (error) {
      console.error('[OTP] Failed to send:', error);

      // Delete the OTP record if sending failed
      await prisma.otpVerification.delete({ where: { id: otpRecord.id } });

      return {
        success: false,
        message: 'Failed to send OTP. Please try again.',
      };
    }
  }

  /**
   * Deliver OTP with auto-fallback (WhatsApp → SMS)
   * Returns the channel that was successfully used
   */
  private async deliverOtpWithFallback(
    identifier: string,
    otp: string,
    channel: OtpChannel,
    purpose: OtpPurpose,
    identifierType: OtpIdentifierType
  ): Promise<{ success: boolean; channelUsed: OtpChannel }> {
    const purposeMessages: Record<OtpPurpose, string> = {
      PHONE_VERIFICATION: 'verify your phone number',
      EMAIL_VERIFICATION: 'verify your email address',
      APPLICATION_SUBMISSION: 'submit your application',
      DOCUMENT_UPLOAD: 'upload documents',
      PAYMENT_CONFIRMATION: 'confirm payment',
      ACCOUNT_LOGIN: 'login to your account',
      PASSWORD_RESET: 'reset your password',
      ADMISSION_CONFIRMATION: 'confirm your admission',
    };

    const message = `Your OTP to ${purposeMessages[purpose]} is: ${otp}. Valid for ${OTP_EXPIRY_MINUTES} minutes. Do not share this code with anyone.`;

    // For phone-based OTP with WhatsApp channel, try WhatsApp first then SMS
    if (identifierType === 'PHONE' && channel === OtpChannel.WHATSAPP) {
      // Try WhatsApp first
      try {
        console.log(`[OTP] Attempting WhatsApp delivery to ${identifier}`);
        await this.sendWhatsApp(identifier, message);
        return { success: true, channelUsed: OtpChannel.WHATSAPP };
      } catch (whatsappError) {
        console.warn(`[OTP] WhatsApp failed, falling back to SMS:`, whatsappError);

        // Fallback to SMS
        try {
          console.log(`[OTP] Attempting SMS fallback to ${identifier}`);
          await this.sendSms(identifier, message, otp);
          return { success: true, channelUsed: OtpChannel.SMS };
        } catch (smsError) {
          console.error(`[OTP] SMS fallback also failed:`, smsError);
          return { success: false, channelUsed: channel };
        }
      }
    }

    // For SMS channel with phone, try SMS first then WhatsApp
    if (identifierType === 'PHONE' && channel === OtpChannel.SMS) {
      try {
        console.log(`[OTP] Attempting SMS delivery to ${identifier}`);
        await this.sendSms(identifier, message, otp);
        return { success: true, channelUsed: OtpChannel.SMS };
      } catch (smsError) {
        console.warn(`[OTP] SMS failed, falling back to WhatsApp:`, smsError);

        // Fallback to WhatsApp
        try {
          console.log(`[OTP] Attempting WhatsApp fallback to ${identifier}`);
          await this.sendWhatsApp(identifier, message);
          return { success: true, channelUsed: OtpChannel.WHATSAPP };
        } catch (whatsappError) {
          console.error(`[OTP] WhatsApp fallback also failed:`, whatsappError);
          return { success: false, channelUsed: channel };
        }
      }
    }

    // For other channels (EMAIL, VOICE_CALL), no fallback - use original deliverOtp
    try {
      await this.deliverOtp(identifier, otp, channel, purpose);
      return { success: true, channelUsed: channel };
    } catch (error) {
      console.error(`[OTP] Delivery failed for channel ${channel}:`, error);
      return { success: false, channelUsed: channel };
    }
  }

  /**
   * Deliver OTP via the specified channel
   */
  private async deliverOtp(
    identifier: string,
    otp: string,
    channel: OtpChannel,
    purpose: OtpPurpose
  ): Promise<void> {
    const purposeMessages: Record<OtpPurpose, string> = {
      PHONE_VERIFICATION: 'verify your phone number',
      EMAIL_VERIFICATION: 'verify your email address',
      APPLICATION_SUBMISSION: 'submit your application',
      DOCUMENT_UPLOAD: 'upload documents',
      PAYMENT_CONFIRMATION: 'confirm payment',
      ACCOUNT_LOGIN: 'login to your account',
      PASSWORD_RESET: 'reset your password',
      ADMISSION_CONFIRMATION: 'confirm your admission',
    };

    const message = `Your OTP to ${purposeMessages[purpose]} is: ${otp}. Valid for ${OTP_EXPIRY_MINUTES} minutes. Do not share this code with anyone.`;

    switch (channel) {
      case OtpChannel.SMS:
        await this.sendSms(identifier, message, otp);
        break;

      case OtpChannel.EMAIL:
        await this.sendEmail(identifier, 'Your Verification Code', message, otp);
        break;

      case OtpChannel.WHATSAPP:
        await this.sendWhatsApp(identifier, message);
        break;

      case OtpChannel.VOICE_CALL:
        await this.sendVoiceCall(identifier, otp);
        break;

      default:
        throw new Error(`Unsupported OTP channel: ${channel}`);
    }
  }

  /**
   * Format phone number for SMS (with country code)
   */
  private formatPhoneForSms(phone: string): string {
    let cleaned = phone.replace(/[^\d]/g, '');

    // Remove leading 0 if present
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }

    // If 10 digits, assume India and add 91
    if (cleaned.length === 10) {
      cleaned = '91' + cleaned;
    }

    return cleaned;
  }

  /**
   * Send SMS with OTP
   * Uses MSG91 OTP API with DLT template (required for India) with Plivo/Exotel fallback
   */
  private async sendSms(phone: string, message: string, otp?: string): Promise<void> {
    const formattedPhone = this.formatPhoneForSms(phone);
    console.log(`[OTP] SMS phone formatted: ${phone} -> ${formattedPhone}`);

    // Try MSG91 dedicated OTP API first (supports ##OTP## template placeholder)
    try {
      const { msg91Service } = await import('./msg91.service');
      const { config } = await import('../config');

      if (msg91Service.isConfigured() && config.msg91?.otpTemplateId && otp) {
        console.log(`[OTP] Sending OTP via MSG91 OTP API with template to ${formattedPhone}`);

        // Use dedicated OTP API which supports ##OTP## placeholder in DLT template
        const result = await msg91Service.sendOtp({
          phone: formattedPhone,
          templateId: config.msg91.otpTemplateId,
          otp: otp, // Pass our custom OTP
          otpExpiry: OTP_EXPIRY_MINUTES,
          otpLength: OTP_LENGTH,
        });

        if (result.success) {
          console.log(`[OTP] SMS sent via MSG91 OTP API, requestId: ${result.requestId}`);
          return;
        }

        console.warn(`[OTP] MSG91 OTP API failed: ${result.error}`);
      } else if (msg91Service.isConfigured()) {
        // Fallback to regular SMS if no template configured
        console.log(`[OTP] Sending SMS via MSG91 (no template) to ${formattedPhone}`);

        const result = await msg91Service.sendSms({
          phone: formattedPhone,
          message,
          userId: 'system',
          organizationId: 'system',
        });

        if (result.success) {
          console.log(`[OTP] SMS sent via MSG91, messageId: ${result.messageId}`);
          return;
        }

        console.warn(`[OTP] MSG91 failed: ${result.error}`);
      }
    } catch (msg91Error) {
      console.error(`[OTP] MSG91 error:`, msg91Error);
    }

    // Fallback to Plivo
    try {
      const plivoService = (await import('../integrations/plivo.service')).default;

      if (plivoService.isConfigured()) {
        console.log(`[OTP] Trying Plivo for SMS to ${formattedPhone}`);

        const result = await plivoService.sendSms({
          to: formattedPhone,
          message,
        });

        console.log(`[OTP] Plivo SMS result:`, result);
        return;
      }
    } catch (plivoError) {
      console.error(`[OTP] Plivo error:`, plivoError);
    }

    // Final fallback to Exotel
    console.log(`[OTP] Trying Exotel fallback for SMS to ${formattedPhone}`);
    const { communicationService } = await import('./communication.service');
    await communicationService.sendSms({ to: formattedPhone, message });
  }

  /**
   * Send Email
   */
  private async sendEmail(
    email: string,
    subject: string,
    textMessage: string,
    otp: string
  ): Promise<void> {
    const { emailService } = await import('../integrations/email.service');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px; }
            .container { max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; }
            .otp-box { background: #f0f0f0; padding: 20px; text-align: center; font-size: 32px; letter-spacing: 8px; font-weight: bold; border-radius: 8px; margin: 20px 0; }
            .footer { color: #888; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Verification Code</h2>
            <p>Your one-time verification code is:</p>
            <div class="otp-box">${otp}</div>
            <p>This code is valid for ${OTP_EXPIRY_MINUTES} minutes.</p>
            <p class="footer">If you didn't request this code, please ignore this email.</p>
          </div>
        </body>
      </html>
    `;

    await emailService.sendEmail({
      to: email,
      subject,
      body: textMessage,
      html: htmlContent,
      userId: 'system', // System-initiated OTP email
    });
  }

  /**
   * Format phone number for WhatsApp (E.164 format without +)
   */
  private formatPhoneForWhatsApp(phone: string): string {
    let cleaned = phone.replace(/[^\d]/g, '');

    // Remove leading 0 if present
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }

    // If 10 digits, assume India and add 91
    if (cleaned.length === 10) {
      cleaned = '91' + cleaned;
    }

    // If starts with 91 but has extra digits, keep as is
    // If doesn't have country code and more than 10 digits, assume country code is included
    return cleaned;
  }

  /**
   * Send WhatsApp message for OTP
   * Uses WhatsApp Template (required by Meta API for business-initiated messages)
   */
  private async sendWhatsApp(phone: string, message: string): Promise<void> {
    const { getPlatformWhatsAppService } = await import('../integrations/whatsapp.service');
    const platformWhatsApp = getPlatformWhatsAppService();

    // Format phone number for WhatsApp (needs country code)
    const formattedPhone = this.formatPhoneForWhatsApp(phone);
    console.log(`[OTP] WhatsApp phone formatted: ${phone} -> ${formattedPhone}`);

    // Extract OTP from message for template
    const otpMatch = message.match(/(\d{6})/);
    const otp = otpMatch ? otpMatch[1] : '';

    if (!platformWhatsApp.isConfigured()) {
      // Fallback to Exotel if platform WhatsApp not configured
      console.log('[OTP] Platform WhatsApp not configured, falling back to Exotel');
      const { exotelService } = await import('../integrations/exotel.service');
      const result = await exotelService.sendWhatsApp({
        to: formattedPhone,
        message,
      });
      if (!result.success) {
        throw new Error(result.error || 'Failed to send WhatsApp OTP via Exotel');
      }
      return;
    }

    // Try sending as template first (required for business-initiated messages)
    // Template name can be configured via env var, defaults to common OTP template names
    const templateName = process.env.WHATSAPP_OTP_TEMPLATE || 'otp_verification';

    console.log(`[OTP] Sending WhatsApp template "${templateName}" with OTP: ${otp}`);

    try {
      const result = await platformWhatsApp.sendTemplate(formattedPhone, templateName, [otp]);
      if (result.success) {
        console.log(`[OTP] WhatsApp template sent successfully`);
        return;
      }
      console.warn(`[OTP] WhatsApp template failed: ${result.error}`);
    } catch (templateError: any) {
      console.warn(`[OTP] WhatsApp template error: ${templateError.message}`);
    }

    // Fallback to text message (only works if user messaged within 24h)
    console.log(`[OTP] Trying WhatsApp text message fallback...`);
    const result = await platformWhatsApp.sendMessage(formattedPhone, message);
    if (!result.success) {
      throw new Error(result.error || 'Failed to send WhatsApp OTP. Please ensure you have an approved OTP template or the user has messaged you recently.');
    }
  }

  /**
   * Send Voice Call with OTP
   */
  private async sendVoiceCall(phone: string, otp: string): Promise<void> {
    // For voice call, we need to speak out the OTP digit by digit
    const spokenOtp = otp.split('').join(' ');
    const message = `Your verification code is: ${spokenOtp}. I repeat: ${spokenOtp}`;

    // Use the voice AI service to make a call
    const { voiceAIService } = await import('../integrations/voice-ai.service');
    const audioBuffer = await voiceAIService.textToSpeech(message, 'alloy');

    // Make outbound call with this audio
    // This is a simplified version - in production, you'd use Exotel/Twilio IVR
    console.log(`[OTP] Voice call requested to ${phone} with OTP: ${otp}`);
  }

  /**
   * Verify OTP
   */
  async verifyOtp(options: VerifyOtpOptions): Promise<OtpResult> {
    const { identifier, purpose, otp } = options;

    // Find the most recent OTP for this identifier and purpose
    const otpRecord = await prisma.otpVerification.findFirst({
      where: {
        identifier,
        purpose,
        isVerified: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      return {
        success: false,
        message: 'OTP has expired or is invalid. Please request a new one.',
      };
    }

    // Check if max attempts exceeded
    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      return {
        success: false,
        message: 'Maximum verification attempts exceeded. Please request a new OTP.',
        attemptsRemaining: 0,
      };
    }

    // Verify the OTP
    const isValid = this.verifyOtpHash(otp, otpRecord.otp);

    if (isValid) {
      // Mark as verified
      await prisma.otpVerification.update({
        where: { id: otpRecord.id },
        data: {
          isVerified: true,
          verifiedAt: new Date(),
        },
      });

      // If linked to a lead, update phone verification status
      if (otpRecord.leadId && otpRecord.identifierType === 'PHONE') {
        await prisma.lead.update({
          where: { id: otpRecord.leadId },
          data: { phoneVerified: true },
        });
      }

      console.log(`[OTP] Verified successfully for ${identifier}`);

      return {
        success: true,
        message: 'OTP verified successfully',
        otpId: otpRecord.id,
      };
    } else {
      // Increment attempts
      const updatedRecord = await prisma.otpVerification.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });

      const attemptsRemaining = otpRecord.maxAttempts - updatedRecord.attempts;

      console.log(`[OTP] Invalid attempt for ${identifier}. Remaining: ${attemptsRemaining}`);

      return {
        success: false,
        message: attemptsRemaining > 0
          ? `Invalid OTP. ${attemptsRemaining} attempt(s) remaining.`
          : 'Maximum verification attempts exceeded. Please request a new OTP.',
        attemptsRemaining,
      };
    }
  }

  /**
   * Resend OTP
   */
  async resendOtp(identifier: string, purpose: OtpPurpose): Promise<OtpResult> {
    // Find the most recent OTP record
    const existingOtp = await prisma.otpVerification.findFirst({
      where: {
        identifier,
        purpose,
        isVerified: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!existingOtp) {
      return {
        success: false,
        message: 'No pending OTP found. Please request a new one.',
      };
    }

    // Check cooldown
    const timeSinceLastOtp = Date.now() - existingOtp.createdAt.getTime();
    if (timeSinceLastOtp < RESEND_COOLDOWN_SECONDS * 1000) {
      const waitTime = Math.ceil((RESEND_COOLDOWN_SECONDS * 1000 - timeSinceLastOtp) / 1000);
      return {
        success: false,
        message: `Please wait ${waitTime} seconds before requesting a new OTP`,
        canResendAt: new Date(existingOtp.createdAt.getTime() + RESEND_COOLDOWN_SECONDS * 1000),
      };
    }

    // Send new OTP
    return this.sendOtp({
      identifier,
      identifierType: existingOtp.identifierType,
      purpose,
      channel: existingOtp.channel,
      organizationId: existingOtp.organizationId || undefined,
      leadId: existingOtp.leadId || undefined,
      applicationId: existingOtp.applicationId || undefined,
      userId: existingOtp.userId || undefined,
    });
  }

  /**
   * Check if identifier is verified for a purpose
   */
  async isVerified(identifier: string, purpose: OtpPurpose): Promise<boolean> {
    const verifiedOtp = await prisma.otpVerification.findFirst({
      where: {
        identifier,
        purpose,
        isVerified: true,
      },
      orderBy: { verifiedAt: 'desc' },
    });

    return !!verifiedOtp;
  }

  /**
   * Get verification status
   */
  async getVerificationStatus(identifier: string, purpose: OtpPurpose) {
    const otpRecord = await prisma.otpVerification.findFirst({
      where: {
        identifier,
        purpose,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      return { status: 'NOT_REQUESTED', isVerified: false };
    }

    if (otpRecord.isVerified) {
      return { status: 'VERIFIED', isVerified: true, verifiedAt: otpRecord.verifiedAt };
    }

    if (otpRecord.expiresAt < new Date()) {
      return { status: 'EXPIRED', isVerified: false };
    }

    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      return { status: 'MAX_ATTEMPTS_EXCEEDED', isVerified: false };
    }

    return {
      status: 'PENDING',
      isVerified: false,
      attemptsRemaining: otpRecord.maxAttempts - otpRecord.attempts,
      expiresAt: otpRecord.expiresAt,
    };
  }

  /**
   * Mask identifier for display
   */
  private maskIdentifier(identifier: string, type: OtpIdentifierType): string {
    if (type === 'EMAIL') {
      const [username, domain] = identifier.split('@');
      const maskedUsername = username.substring(0, 2) + '***' + username.slice(-1);
      return `${maskedUsername}@${domain}`;
    } else {
      // Phone - show last 4 digits
      return '******' + identifier.slice(-4);
    }
  }

  /**
   * Cleanup expired OTPs (run periodically)
   */
  async cleanupExpiredOtps(): Promise<number> {
    const result = await prisma.otpVerification.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() }, isVerified: false },
          { createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } }, // Older than 24 hours
        ],
      },
    });

    console.log(`[OTP] Cleaned up ${result.count} expired OTP records`);
    return result.count;
  }
}

export const otpService = new OtpService();
export default otpService;
