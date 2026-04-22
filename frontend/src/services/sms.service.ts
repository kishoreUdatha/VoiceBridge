/**
 * SMS Service
 * Frontend API service for SMS functionality via MSG91
 */

import api from './api';

export interface SmsTemplate {
  id: string;
  name: string;
  content: string;
  variables?: string[];
  sampleValues?: Record<string, string>;
  dltTemplateId?: string;
  msg91TemplateId?: string;
  category?: string;
}

export interface SendSmsInput {
  phone: string;
  message: string;
  templateId?: string;
  dltTemplateId?: string;
  variables?: Record<string, string>;
  leadId?: string;
}

export interface SendBulkSmsInput {
  phones: string[];
  templateId: string;
  variables?: Record<string, string>;
  leadIds?: string[];
}

export interface SmsLogEntry {
  id: string;
  phone: string;
  message: string;
  direction: 'INBOUND' | 'OUTBOUND';
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'BOUNCED';
  provider?: string;
  providerMsgId?: string;
  sentAt?: string;
  deliveredAt?: string;
  createdAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface SmsInfo {
  characterCount: number;
  smsCount: number;
  encoding: 'GSM' | 'UNICODE';
  remainingInCurrentSms: number;
}

export const smsService = {
  /**
   * Send single SMS
   */
  async sendSms(input: SendSmsInput): Promise<{ messageId?: string }> {
    const response = await api.post('/sms/send', input);
    return response.data.data;
  },

  /**
   * Send bulk SMS
   */
  async sendBulkSms(input: SendBulkSmsInput): Promise<{
    sent: number;
    failed: number;
    requestId?: string;
  }> {
    const response = await api.post('/sms/bulk', input);
    return response.data.data;
  },

  /**
   * Send OTP
   */
  async sendOtp(phone: string, templateId?: string): Promise<{ requestId?: string }> {
    const response = await api.post('/sms/otp/send', { phone, templateId });
    return response.data.data;
  },

  /**
   * Verify OTP
   */
  async verifyOtp(phone: string, otp: string): Promise<{ success: boolean }> {
    const response = await api.post('/sms/otp/verify', { phone, otp });
    return { success: response.data.success };
  },

  /**
   * Resend OTP
   */
  async resendOtp(phone: string, retryType: 'text' | 'voice' = 'text'): Promise<{ success: boolean }> {
    const response = await api.post('/sms/otp/resend', { phone, retryType });
    return { success: response.data.success };
  },

  /**
   * Get SMS history for a lead
   */
  async getSmsHistory(leadId: string, limit: number = 50): Promise<SmsLogEntry[]> {
    const response = await api.get(`/sms/lead/${leadId}`, {
      params: { limit },
    });
    return response.data.data || [];
  },

  /**
   * Get SMS templates
   */
  async getTemplates(): Promise<SmsTemplate[]> {
    const response = await api.get('/sms/templates');
    return response.data.data || [];
  },

  /**
   * Get SMS balance/credits
   */
  async getBalance(): Promise<{ balance: number }> {
    const response = await api.get('/sms/balance');
    return response.data.data;
  },

  /**
   * Get SMS service status
   */
  async getStatus(): Promise<{ configured: boolean; provider: string }> {
    const response = await api.get('/sms/status');
    return response.data.data;
  },

  /**
   * Calculate SMS info (character count, number of SMS, encoding)
   */
  getSmsInfo(message: string): SmsInfo {
    // GSM 7-bit character set (basic SMS characters)
    const gsmChars = new Set(
      '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà'
        .split('')
    );

    // GSM extended characters (count as 2 chars)
    const gsmExtended = new Set(['|', '^', '€', '{', '}', '[', ']', '~', '\\']);

    let isGsm = true;
    let charCount = 0;

    for (const char of message) {
      if (gsmExtended.has(char)) {
        charCount += 2;
      } else if (gsmChars.has(char)) {
        charCount += 1;
      } else {
        isGsm = false;
        break;
      }
    }

    // If not GSM, use Unicode counting (each char is 1 unit, but SMS size is smaller)
    if (!isGsm) {
      charCount = message.length;
    }

    const encoding = isGsm ? 'GSM' : 'UNICODE';
    const maxCharsPerSms = isGsm ? 160 : 70;
    const maxCharsPerConcatSms = isGsm ? 153 : 67; // Concatenated SMS has header overhead

    let smsCount: number;
    let remainingInCurrentSms: number;

    if (charCount <= maxCharsPerSms) {
      smsCount = 1;
      remainingInCurrentSms = maxCharsPerSms - charCount;
    } else {
      smsCount = Math.ceil(charCount / maxCharsPerConcatSms);
      const usedInLastSms = charCount % maxCharsPerConcatSms;
      remainingInCurrentSms = usedInLastSms === 0 ? 0 : maxCharsPerConcatSms - usedInLastSms;
    }

    return {
      characterCount: charCount,
      smsCount,
      encoding,
      remainingInCurrentSms,
    };
  },

  /**
   * Replace template variables with actual values
   */
  substituteVariables(template: string, variables: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      // Support both {{var}} and {var} formats
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
    return result;
  },

  /**
   * Extract variables from template content
   */
  extractVariables(template: string): string[] {
    const regex = /\{\{?(\w+)\}?\}/g;
    const variables: Set<string> = new Set();
    let match;
    while ((match = regex.exec(template)) !== null) {
      variables.add(match[1]);
    }
    return Array.from(variables);
  },
};

export default smsService;
