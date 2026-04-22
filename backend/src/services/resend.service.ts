/**
 * Resend Email Service
 * Simple email sending via Resend API for OTPs and transactional emails
 */

import { Resend } from 'resend';
import { config } from '../config';

interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

interface SendOtpParams {
  to: string;
  otp: string;
  expiryMinutes?: number;
}

class ResendService {
  private client: Resend | null = null;
  private fromEmail: string;
  private fromName: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    this.fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@myleadx.ai';
    this.fromName = process.env.RESEND_FROM_NAME || 'MyLeadX';

    if (apiKey) {
      this.client = new Resend(apiKey);
      console.log('[Resend] Service initialized');
    } else {
      console.warn('[Resend] API key not configured');
    }
  }

  isConfigured(): boolean {
    return !!this.client;
  }

  /**
   * Send a simple email
   */
  async sendEmail(params: SendEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.client) {
      return { success: false, error: 'Resend not configured' };
    }

    try {
      const { data, error } = await this.client.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: params.to,
        subject: params.subject,
        text: params.body,
        html: params.html || this.textToHtml(params.body),
      });

      if (error) {
        console.error('[Resend] Error:', error);
        return { success: false, error: error.message };
      }

      console.log('[Resend] Email sent:', data?.id);
      return { success: true, messageId: data?.id };
    } catch (error: any) {
      console.error('[Resend] Send error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send OTP email with professional template
   */
  async sendOtp(params: SendOtpParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const expiryMinutes = params.expiryMinutes || 5;
    const otpDigits = params.otp.split('');

    const subject = `${params.otp} is your verification code`;
    const body = `Your verification code is: ${params.otp}\n\nThis code will expire in ${expiryMinutes} minutes.\n\nIf you didn't request this code, please ignore this email.`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f7fa; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08); overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: -0.5px;">${this.fromName}</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 48px 40px;">
              <!-- Icon -->
              <div style="text-align: center; margin-bottom: 32px;">
                <div style="width: 72px; height: 72px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; margin: 0 auto; display: flex; align-items: center; justify-content: center;">
                  <span style="font-size: 32px;">🔐</span>
                </div>
              </div>

              <h2 style="margin: 0 0 12px 0; color: #1a1a2e; font-size: 22px; font-weight: 600; text-align: center;">
                Verification Code
              </h2>

              <p style="margin: 0 0 32px 0; color: #64748b; font-size: 15px; line-height: 1.6; text-align: center;">
                Enter this code to verify your identity
              </p>

              <!-- OTP Boxes -->
              <div style="text-align: center; margin-bottom: 32px;">
                <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                  <tr>
                    ${otpDigits.map(digit => `
                    <td style="padding: 0 4px;">
                      <div style="width: 48px; height: 56px; background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; font-size: 28px; font-weight: 700; color: #1a1a2e; line-height: 52px; text-align: center;">
                        ${digit}
                      </div>
                    </td>
                    `).join('')}
                  </tr>
                </table>
              </div>

              <!-- Timer -->
              <div style="text-align: center; margin-bottom: 32px;">
                <div style="display: inline-block; background: #fef3c7; border-radius: 24px; padding: 10px 20px;">
                  <span style="color: #92400e; font-size: 14px; font-weight: 500;">
                    ⏱️ Expires in ${expiryMinutes} minutes
                  </span>
                </div>
              </div>

              <!-- Security Note -->
              <div style="background: #f8fafc; border-radius: 12px; padding: 20px; border-left: 4px solid #667eea;">
                <p style="margin: 0; color: #475569; font-size: 13px; line-height: 1.6;">
                  <strong style="color: #1a1a2e;">🛡️ Security Tip:</strong><br>
                  Never share this code with anyone. Our team will never ask for your verification code.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #f8fafc; padding: 24px 40px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 8px 0; color: #94a3b8; font-size: 12px; text-align: center;">
                Didn't request this code? You can safely ignore this email.
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 12px; text-align: center;">
                © ${new Date().getFullYear()} ${this.fromName}. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    return this.sendEmail({
      to: params.to,
      subject,
      body,
      html,
    });
  }

  /**
   * Generate a random OTP
   */
  generateOtp(length: number = 6): string {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * digits.length)];
    }
    return otp;
  }

  /**
   * Convert plain text to basic HTML
   */
  private textToHtml(text: string): string {
    return `<div style="font-family: Arial, sans-serif;">${text.replace(/\n/g, '<br>')}</div>`;
  }
}

export const resendService = new ResendService();
