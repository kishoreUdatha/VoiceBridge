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

    // Generate new OTP
    const otp = this.generateOtp();
    const hashedOtp = this.hashOtp(otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

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

    // Send OTP via the appropriate channel
    try {
      await this.deliverOtp(identifier, otp, channel, purpose);

      console.log(`[OTP] Sent to ${identifier} via ${channel} for ${purpose}`);

      return {
        success: true,
        message: `OTP sent successfully to ${this.maskIdentifier(identifier, identifierType)}`,
        otpId: otpRecord.id,
        expiresAt,
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
        await this.sendSms(identifier, message);
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
   * Send SMS
   */
  private async sendSms(phone: string, message: string): Promise<void> {
    // Import SMS service dynamically
    const { communicationService } = await import('./communication.service');
    await communicationService.sendSms({ to: phone, message });
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
   * Send WhatsApp message
   */
  private async sendWhatsApp(phone: string, message: string): Promise<void> {
    // Use exotel service for WhatsApp since it's the default configured provider
    const { exotelService } = await import('../integrations/exotel.service');
    await exotelService.sendWhatsApp({
      to: phone,
      message,
    });
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
