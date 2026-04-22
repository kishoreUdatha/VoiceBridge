/**
 * MSG91 SMS Service
 * Provides SMS functionality via MSG91 API with DLT support for India
 */

import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import { prisma } from '../config/database';

export interface SendSmsInput {
  phone: string;
  message: string;
  templateId?: string;
  dltTemplateId?: string;
  variables?: Record<string, string>;
  leadId?: string;
  userId: string;
  organizationId: string;
}

export interface SendBulkSmsInput {
  phones: string[];
  templateId: string;
  variables?: Record<string, string>;
  leadIds?: string[];
  userId: string;
  organizationId: string;
}

export interface SendOtpInput {
  phone: string;
  templateId?: string;
  otpLength?: number;
  otpExpiry?: number; // in minutes
  userId?: string;
  organizationId?: string;
}

export interface VerifyOtpInput {
  phone: string;
  otp: string;
}

export interface Msg91Response {
  type: string;
  message: string;
  request_id?: string;
}

export interface Msg91OtpResponse {
  type: string;
  message: string;
  request_id?: string;
}

export interface DeliveryStatusWebhook {
  requestId: string;
  userId: string;
  report: Array<{
    date: string;
    number: string;
    status: string;
    desc: string;
  }>;
}

class Msg91Service {
  private client: AxiosInstance;
  private authKey: string;
  private senderId: string;
  private dltEntityId: string | undefined;
  private route: string;

  constructor() {
    this.authKey = config.msg91?.authKey || '';
    this.senderId = config.msg91?.senderId || 'MYLEADX';
    this.dltEntityId = config.msg91?.dltEntityId;
    this.route = config.msg91?.route || '4';

    // Debug: Log MSG91 config status
    console.log('[MSG91] Config loaded:', {
      hasAuthKey: Boolean(this.authKey),
      authKeyLength: this.authKey.length,
      senderId: this.senderId,
      route: this.route,
    });

    this.client = axios.create({
      baseURL: config.msg91?.baseUrl || 'https://control.msg91.com',
      headers: {
        'Content-Type': 'application/json',
        'authkey': this.authKey,
      },
    });
  }

  /**
   * Check if MSG91 is properly configured
   */
  isConfigured(): boolean {
    return Boolean(this.authKey);
  }

  /**
   * Format phone number for MSG91 (requires country code without +)
   */
  private formatPhone(phone: string): string {
    let cleaned = phone.replace(/[^\d+]/g, '');

    // Remove + if present
    cleaned = cleaned.replace(/^\+/, '');

    // If 10 digits (Indian number without country code), add 91
    if (cleaned.length === 10 && !cleaned.startsWith('91')) {
      cleaned = '91' + cleaned;
    }

    // If starts with 0, assume Indian and replace with 91
    if (cleaned.startsWith('0')) {
      cleaned = '91' + cleaned.substring(1);
    }

    return cleaned;
  }

  /**
   * Replace template variables with actual values
   */
  private substituteVariables(message: string, variables?: Record<string, string>): string {
    if (!variables) return message;

    let result = message;
    for (const [key, value] of Object.entries(variables)) {
      // Support both {{var}} and {var} formats
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
    return result;
  }

  /**
   * Send single SMS via MSG91 Flow API
   */
  async sendSms(input: SendSmsInput): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isConfigured()) {
      console.error('[MSG91] Service not configured');
      return { success: false, error: 'MSG91 not configured' };
    }

    try {
      const phone = this.formatPhone(input.phone);
      const message = this.substituteVariables(input.message, input.variables);

      // If using template ID (MSG91 Flow), use the flow API
      if (input.templateId) {
        const response = await this.client.post('/api/v5/flow/', {
          template_id: input.templateId,
          short_url: '0',
          recipients: [
            {
              mobiles: phone,
              ...input.variables,
            },
          ],
        });

        // Log to database
        await this.logSms({
          phone: input.phone,
          message,
          templateId: input.templateId,
          dltTemplateId: input.dltTemplateId,
          status: 'SENT',
          providerMsgId: response.data?.request_id,
          leadId: input.leadId,
          userId: input.userId,
          organizationId: input.organizationId,
        });

        return {
          success: true,
          messageId: response.data?.request_id,
        };
      }

      // Direct send via sendSMS API
      const payload: Record<string, unknown> = {
        sender: this.senderId,
        route: this.route,
        country: '91',
        sms: [
          {
            message,
            to: [phone],
          },
        ],
      };

      // Add DLT fields if provided
      if (input.dltTemplateId) {
        (payload.sms as Array<Record<string, unknown>>)[0].DLT_TE_ID = input.dltTemplateId;
      }
      if (this.dltEntityId) {
        payload.DLT_PE_ID = this.dltEntityId;
      }

      console.log('[MSG91] Sending SMS with payload:', JSON.stringify(payload, null, 2));

      const response = await this.client.post('/api/v2/sendsms', payload);

      console.log('[MSG91] API Response:', JSON.stringify(response.data, null, 2));

      // Log to database
      await this.logSms({
        phone: input.phone,
        message,
        templateId: input.templateId,
        dltTemplateId: input.dltTemplateId,
        status: 'SENT',
        providerMsgId: response.data?.request_id,
        leadId: input.leadId,
        userId: input.userId,
        organizationId: input.organizationId,
      });

      return {
        success: true,
        messageId: response.data?.request_id,
      };
    } catch (error: any) {
      console.error('[MSG91] Send SMS error:', error.response?.data || error.message);

      // Log failed attempt
      await this.logSms({
        phone: input.phone,
        message: input.message,
        templateId: input.templateId,
        dltTemplateId: input.dltTemplateId,
        status: 'FAILED',
        errorMessage: error.response?.data?.message || error.message,
        leadId: input.leadId,
        userId: input.userId,
        organizationId: input.organizationId,
      });

      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Send bulk SMS via MSG91 Flow API
   */
  async sendBulkSms(input: SendBulkSmsInput): Promise<{
    success: boolean;
    sent: number;
    failed: number;
    requestId?: string;
    errors?: string[];
  }> {
    if (!this.isConfigured()) {
      console.error('[MSG91] Service not configured');
      return { success: false, sent: 0, failed: input.phones.length, errors: ['MSG91 not configured'] };
    }

    try {
      // Format all phone numbers
      const recipients = input.phones.map((phone, index) => ({
        mobiles: this.formatPhone(phone),
        ...input.variables,
        leadId: input.leadIds?.[index],
      }));

      // Get template details for logging
      const template = await prisma.messageTemplate.findUnique({
        where: { id: input.templateId },
      });

      const response = await this.client.post('/api/v5/flow/', {
        template_id: input.templateId,
        short_url: '0',
        recipients,
      });

      // Log each SMS
      const logPromises = input.phones.map((phone, index) =>
        this.logSms({
          phone,
          message: template?.content || '',
          templateId: input.templateId,
          dltTemplateId: template?.dltTemplateId || undefined,
          status: 'SENT',
          providerMsgId: response.data?.request_id,
          leadId: input.leadIds?.[index],
          userId: input.userId,
          organizationId: input.organizationId,
        })
      );

      await Promise.allSettled(logPromises);

      return {
        success: true,
        sent: input.phones.length,
        failed: 0,
        requestId: response.data?.request_id,
      };
    } catch (error: any) {
      console.error('[MSG91] Bulk SMS error:', error.response?.data || error.message);
      return {
        success: false,
        sent: 0,
        failed: input.phones.length,
        errors: [error.response?.data?.message || error.message],
      };
    }
  }

  /**
   * Send OTP via MSG91
   */
  async sendOtp(input: SendOtpInput): Promise<{ success: boolean; requestId?: string; error?: string }> {
    if (!this.isConfigured()) {
      console.error('[MSG91] Service not configured');
      return { success: false, error: 'MSG91 not configured' };
    }

    try {
      const phone = this.formatPhone(input.phone);

      const payload: Record<string, unknown> = {
        mobile: phone,
        sender: this.senderId,
        otp_length: input.otpLength || 6,
        otp_expiry: input.otpExpiry || 5,
      };

      if (input.templateId) {
        payload.template_id = input.templateId;
      }

      const response = await this.client.post('/api/v5/otp', payload);

      console.log('[MSG91] OTP sent:', response.data);

      return {
        success: response.data?.type === 'success',
        requestId: response.data?.request_id,
      };
    } catch (error: any) {
      console.error('[MSG91] Send OTP error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Verify OTP via MSG91
   */
  async verifyOtp(input: VerifyOtpInput): Promise<{ success: boolean; message?: string; error?: string }> {
    if (!this.isConfigured()) {
      console.error('[MSG91] Service not configured');
      return { success: false, error: 'MSG91 not configured' };
    }

    try {
      const phone = this.formatPhone(input.phone);

      const response = await this.client.get('/api/v5/otp/verify', {
        params: {
          mobile: phone,
          otp: input.otp,
        },
      });

      return {
        success: response.data?.type === 'success',
        message: response.data?.message,
      };
    } catch (error: any) {
      console.error('[MSG91] Verify OTP error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Resend OTP via MSG91
   */
  async resendOtp(phone: string, retryType: 'text' | 'voice' = 'text'): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'MSG91 not configured' };
    }

    try {
      const formattedPhone = this.formatPhone(phone);

      const response = await this.client.get('/api/v5/otp/retry', {
        params: {
          mobile: formattedPhone,
          retrytype: retryType,
        },
      });

      return {
        success: response.data?.type === 'success',
      };
    } catch (error: any) {
      console.error('[MSG91] Resend OTP error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Parse delivery status webhook from MSG91
   */
  parseWebhook(body: any): {
    requestId: string;
    reports: Array<{
      phone: string;
      status: 'DELIVERED' | 'FAILED' | 'PENDING';
      description: string;
      timestamp: Date;
    }>;
  } {
    const reports = (body.report || []).map((r: any) => ({
      phone: r.number,
      status: this.mapStatus(r.status),
      description: r.desc || '',
      timestamp: r.date ? new Date(r.date) : new Date(),
    }));

    return {
      requestId: body.requestId || body.request_id || '',
      reports,
    };
  }

  /**
   * Map MSG91 status codes to our status enum
   */
  private mapStatus(status: string): 'DELIVERED' | 'FAILED' | 'PENDING' {
    const statusMap: Record<string, 'DELIVERED' | 'FAILED' | 'PENDING'> = {
      '1': 'DELIVERED', // Delivered
      '2': 'FAILED', // Failed
      '3': 'PENDING', // Pending/Submitted
      '9': 'FAILED', // NDNC
      '17': 'FAILED', // Blocked
      '26': 'FAILED', // DND
      DELIVRD: 'DELIVERED',
      DELIVERED: 'DELIVERED',
      FAILED: 'FAILED',
      UNDELIV: 'FAILED',
      EXPIRED: 'FAILED',
      REJECTED: 'FAILED',
    };

    return statusMap[status?.toUpperCase()] || 'PENDING';
  }

  /**
   * Update SMS status from webhook
   */
  async updateDeliveryStatus(requestId: string, status: 'DELIVERED' | 'FAILED' | 'PENDING'): Promise<void> {
    try {
      const statusMap = {
        'DELIVERED': 'DELIVERED',
        'FAILED': 'FAILED',
        'PENDING': 'PENDING',
      } as const;

      await prisma.smsLog.updateMany({
        where: { providerMsgId: requestId },
        data: {
          status: statusMap[status],
          deliveredAt: status === 'DELIVERED' ? new Date() : undefined,
        },
      });
    } catch (error) {
      console.error('[MSG91] Update delivery status error:', error);
    }
  }

  /**
   * Log SMS to database
   */
  private async logSms(data: {
    phone: string;
    message: string;
    templateId?: string;
    dltTemplateId?: string;
    status: 'SENT' | 'FAILED' | 'PENDING';
    providerMsgId?: string;
    errorMessage?: string;
    leadId?: string;
    userId: string;
    organizationId: string;
  }): Promise<void> {
    try {
      // Note: templateId, dltTemplateId, credits fields require Prisma migration
      // Run: npx prisma migrate dev --name add_sms_dlt_fields
      await prisma.smsLog.create({
        data: {
          phone: data.phone,
          message: data.message,
          direction: 'OUTBOUND',
          status: data.status === 'SENT' ? 'SENT' : data.status === 'FAILED' ? 'FAILED' : 'PENDING',
          provider: 'MSG91',
          providerMsgId: data.providerMsgId,
          leadId: data.leadId,
          userId: data.userId,
          sentAt: data.status === 'SENT' ? new Date() : undefined,
          // Uncomment after migration:
          // templateId: data.templateId,
          // dltTemplateId: data.dltTemplateId,
        },
      });

      // Log activity for lead if leadId provided
      if (data.leadId) {
        await prisma.leadActivity.create({
          data: {
            leadId: data.leadId,
            userId: data.userId,
            type: 'SMS_SENT',
            description: `SMS ${data.status === 'FAILED' ? 'failed' : 'sent'}: ${data.message.substring(0, 50)}${data.message.length > 50 ? '...' : ''}`,
            metadata: {
              templateId: data.templateId,
              dltTemplateId: data.dltTemplateId,
              status: data.status,
              provider: 'MSG91',
              errorMessage: data.errorMessage,
            },
          },
        });
      }
    } catch (error) {
      console.error('[MSG91] Log SMS error:', error);
    }
  }

  /**
   * Get SMS history for a lead
   */
  async getSmsHistory(leadId: string, limit: number = 50): Promise<any[]> {
    return prisma.smsLog.findMany({
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
      },
    });
  }

  /**
   * Get SMS balance/credits from MSG91
   */
  async getBalance(): Promise<{ success: boolean; balance?: number; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'MSG91 not configured' };
    }

    try {
      const response = await this.client.get('/api/balance.php', {
        params: {
          authkey: this.authKey,
          type: this.route,
        },
      });

      return {
        success: true,
        balance: parseInt(response.data) || 0,
      };
    } catch (error: any) {
      console.error('[MSG91] Get balance error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }
}

export const msg91Service = new Msg91Service();
