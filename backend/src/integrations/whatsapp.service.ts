import axios from 'axios';
import { prisma } from '../config/database';


export interface WhatsAppConfig {
  provider: 'exotel' | 'meta' | 'gupshup' | 'wati' | '360dialog';
  phoneNumber: string;
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  businessAccountId?: string;
  phoneNumberId?: string;
  isConfigured: boolean;
}

export interface SendMessageParams {
  to: string;
  message: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'document';
  mediaFilename?: string;
  templateName?: string;
  templateParams?: string[];
}

export interface WhatsAppResponse {
  success: boolean;
  messageId?: string;
  status?: string;
  error?: string;
  data?: any;
}

/**
 * Multi-provider WhatsApp Service
 * Supports: Meta Cloud API, 360dialog, Gupshup, Wati, Exotel
 */
export class WhatsAppService {
  private organizationId: string;
  private config: WhatsAppConfig | null = null;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
  }

  /**
   * Load WhatsApp config from organization settings or environment variables
   */
  async loadConfig(): Promise<WhatsAppConfig | null> {
    try {
      const organization = await prisma.organization.findUnique({
        where: { id: this.organizationId },
        select: { settings: true },
      });

      if (!organization) {
        console.warn(`[WhatsApp] Organization not found: ${this.organizationId}`);
        return null;
      }

      const settings = (organization.settings as any) || {};
      this.config = settings.whatsapp || null;

      // Fallback to environment variables if no org-level config
      if (!this.config || !this.config.isConfigured) {
        const envAccessToken = process.env.WHATSAPP_ACCESS_TOKEN;
        const envPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        const envBusinessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;

        if (envAccessToken && envPhoneNumberId) {
          console.info(`[WhatsApp] Using environment variables for Meta Cloud API`);
          this.config = {
            provider: 'meta',
            phoneNumber: envPhoneNumberId,
            accessToken: envAccessToken,
            phoneNumberId: envPhoneNumberId,
            businessAccountId: envBusinessAccountId,
            isConfigured: true,
          };
          return this.config;
        }
      }

      if (!this.config) {
        console.info(`[WhatsApp] No WhatsApp config found for org: ${this.organizationId}`);
      }

      return this.config;
    } catch (error) {
      console.error('[WhatsApp] Failed to load config:', error);
      return null;
    }
  }

  /**
   * Check if WhatsApp is configured for this organization
   */
  async isConfigured(): Promise<boolean> {
    if (!this.config) {
      await this.loadConfig();
    }
    // For Meta API, phoneNumberId is sufficient (phoneNumber is optional)
    const hasCredentials = this.config?.phoneNumber || this.config?.phoneNumberId || this.config?.accessToken;
    return !!(this.config?.isConfigured && hasCredentials);
  }

  /**
   * Format phone number to E.164 format
   */
  private formatPhoneNumber(phone: string): string {
    let cleaned = phone.replace(/[^\d+]/g, '');

    // If starts with 0, assume Indian number
    if (cleaned.startsWith('0')) {
      cleaned = '91' + cleaned.substring(1);
    }

    // Add + if not present
    if (!cleaned.startsWith('+')) {
      // If 10 digits, assume Indian
      if (cleaned.length === 10) {
        cleaned = '+91' + cleaned;
      } else if (!cleaned.startsWith('91') && cleaned.length === 10) {
        cleaned = '+91' + cleaned;
      } else {
        cleaned = '+' + cleaned;
      }
    }

    return cleaned;
  }

  /**
   * Send WhatsApp message using the configured provider
   */
  async sendMessage(params: SendMessageParams): Promise<WhatsAppResponse> {
    if (!this.config) {
      await this.loadConfig();
    }

    if (!this.config || !this.config.isConfigured) {
      return {
        success: false,
        error: 'WhatsApp is not configured for this organization',
      };
    }

    const to = this.formatPhoneNumber(params.to);

    switch (this.config.provider) {
      case 'meta':
        return this.sendViaMeta(to, params);
      case '360dialog':
        return this.sendVia360Dialog(to, params);
      case 'gupshup':
        return this.sendViaGupshup(to, params);
      case 'wati':
        return this.sendViaWati(to, params);
      case 'exotel':
      default:
        return this.sendViaExotel(to, params);
    }
  }

  /**
   * Send via Meta Cloud API (Official WhatsApp API)
   */
  private async sendViaMeta(to: string, params: SendMessageParams): Promise<WhatsAppResponse> {
    try {
      const { accessToken, phoneNumberId } = this.config!;

      if (!accessToken || !phoneNumberId) {
        return {
          success: false,
          error: 'Meta API credentials not configured. Please add Access Token and Phone Number ID.',
        };
      }

      const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

      let payload: any = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to.replace('+', ''),
      };

      if (params.templateName) {
        // Template message
        payload.type = 'template';
        payload.template = {
          name: params.templateName,
          language: { code: 'en' },
        };
        if (params.templateParams?.length) {
          payload.template.components = [{
            type: 'body',
            parameters: params.templateParams.map(text => ({ type: 'text', text })),
          }];
        }
      } else if (params.mediaUrl) {
        // Media message
        const mediaType = this.getMediaType(params.mediaUrl);
        payload.type = mediaType;
        payload[mediaType] = {
          link: params.mediaUrl,
          caption: params.message,
        };
      } else {
        // Text message
        payload.type = 'text';
        payload.text = { body: params.message };
      }

      console.log('[WhatsApp Meta] Sending:', { to, type: payload.type });

      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      return {
        success: true,
        messageId: response.data.messages?.[0]?.id,
        status: 'sent',
        data: response.data,
      };
    } catch (error: any) {
      console.error('[WhatsApp Meta] Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
        data: error.response?.data,
      };
    }
  }

  /**
   * Send via 360dialog
   */
  private async sendVia360Dialog(to: string, params: SendMessageParams): Promise<WhatsAppResponse> {
    try {
      const { apiKey } = this.config!;

      if (!apiKey) {
        return {
          success: false,
          error: '360dialog API key not configured.',
        };
      }

      const url = 'https://waba.360dialog.io/v1/messages';

      let payload: any = {
        to: to.replace('+', ''),
      };

      if (params.templateName) {
        payload.type = 'template';
        payload.template = {
          namespace: 'default',
          name: params.templateName,
          language: { code: 'en', policy: 'deterministic' },
        };
        if (params.templateParams?.length) {
          payload.template.components = [{
            type: 'body',
            parameters: params.templateParams.map(text => ({ type: 'text', text })),
          }];
        }
      } else if (params.mediaUrl) {
        const mediaType = this.getMediaType(params.mediaUrl);
        payload.type = mediaType;
        payload[mediaType] = {
          link: params.mediaUrl,
          caption: params.message,
        };
      } else {
        payload.type = 'text';
        payload.text = { body: params.message };
      }

      console.log('[WhatsApp 360dialog] Sending:', { to, type: payload.type });

      const response = await axios.post(url, payload, {
        headers: {
          'D360-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
      });

      return {
        success: true,
        messageId: response.data.messages?.[0]?.id,
        status: 'sent',
        data: response.data,
      };
    } catch (error: any) {
      console.error('[WhatsApp 360dialog] Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.meta?.developer_message || error.message,
        data: error.response?.data,
      };
    }
  }

  /**
   * Send via Gupshup
   */
  private async sendViaGupshup(to: string, params: SendMessageParams): Promise<WhatsAppResponse> {
    try {
      const { apiKey, phoneNumber } = this.config!;

      if (!apiKey) {
        return {
          success: false,
          error: 'Gupshup API key not configured.',
        };
      }

      const url = 'https://api.gupshup.io/sm/api/v1/msg';

      const formData = new URLSearchParams();
      formData.append('channel', 'whatsapp');
      formData.append('source', phoneNumber!.replace('+', ''));
      formData.append('destination', to.replace('+', ''));
      formData.append('src.name', 'CRM');

      if (params.templateName) {
        formData.append('message', JSON.stringify({
          type: 'template',
          template: {
            name: params.templateName,
            languageCode: 'en',
            components: params.templateParams?.length ? [{
              type: 'body',
              parameters: params.templateParams.map(text => ({ type: 'text', text })),
            }] : [],
          },
        }));
      } else if (params.mediaUrl) {
        const mediaType = this.getMediaType(params.mediaUrl);
        formData.append('message', JSON.stringify({
          type: mediaType,
          [mediaType]: {
            link: params.mediaUrl,
            caption: params.message,
          },
        }));
      } else {
        formData.append('message', JSON.stringify({
          type: 'text',
          text: params.message,
        }));
      }

      console.log('[WhatsApp Gupshup] Sending:', { to });

      const response = await axios.post(url, formData, {
        headers: {
          'apikey': apiKey,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      return {
        success: response.data.status === 'submitted',
        messageId: response.data.messageId,
        status: response.data.status,
        data: response.data,
      };
    } catch (error: any) {
      console.error('[WhatsApp Gupshup] Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        data: error.response?.data,
      };
    }
  }

  /**
   * Send via Wati
   */
  private async sendViaWati(to: string, params: SendMessageParams): Promise<WhatsAppResponse> {
    try {
      const { apiKey, apiSecret } = this.config!;

      if (!apiKey || !apiSecret) {
        return {
          success: false,
          error: 'Wati credentials not configured. Please add API Endpoint and Access Token.',
        };
      }

      // Clean the token - remove "Bearer " if user included it
      let accessToken = apiSecret.trim();
      if (accessToken.toLowerCase().startsWith('bearer ')) {
        accessToken = accessToken.substring(7).trim();
      }

      // apiKey = API Endpoint (e.g., https://live-server-12345.wati.io)
      // apiSecret = Access Token
      const baseUrl = apiKey.startsWith('http') ? apiKey.replace(/\/$/, '') : `https://${apiKey.replace(/\/$/, '')}`;
      const phoneNumber = to.replace('+', '');

      console.log('[WhatsApp Wati] Config:', { baseUrl, phoneNumber, hasToken: !!accessToken });

      // Handle media messages
      if (params.mediaUrl) {
        const mediaType = this.getMediaType(params.mediaUrl, params.mediaType);

        // Check if it's a base64 data URL
        if (this.isBase64DataUrl(params.mediaUrl)) {
          // Wati requires uploading the file first, then sending
          // Use the appropriate endpoint based on media type
          let endpoint: string;
          switch (mediaType) {
            case 'image':
              endpoint = `${baseUrl}/api/v1/sendSessionFile/${phoneNumber}`;
              break;
            case 'video':
              endpoint = `${baseUrl}/api/v1/sendSessionFile/${phoneNumber}`;
              break;
            case 'audio':
              endpoint = `${baseUrl}/api/v1/sendSessionFile/${phoneNumber}`;
              break;
            default:
              endpoint = `${baseUrl}/api/v1/sendSessionFile/${phoneNumber}`;
          }

          // Convert base64 to FormData
          const { buffer, mimeType } = this.base64ToBuffer(params.mediaUrl);
          const FormData = require('form-data');
          const formData = new FormData();

          // Get file extension from mime type
          const ext = mimeType.split('/')[1] || 'bin';
          const filename = params.mediaFilename || `file.${ext}`;

          formData.append('file', buffer, {
            filename: filename,
            contentType: mimeType,
          });

          console.log('[WhatsApp Wati] Sending media:', { to, type: mediaType, filename });

          const response = await axios.post(endpoint, formData, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              ...formData.getHeaders(),
            },
          });

          // If there's a caption/message, send it separately
          if (params.message) {
            await axios.post(`${baseUrl}/api/v1/sendSessionMessage/${phoneNumber}`,
              { messageText: params.message },
              {
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
              }
            );
          }

          return {
            success: response.data.result !== false,
            messageId: response.data.info?.id || response.data.id,
            status: 'sent',
            data: response.data,
          };
        } else {
          // External URL - use Wati's media URL endpoint
          const endpoint = `${baseUrl}/api/v1/sendSessionMediaUrl/${phoneNumber}`;
          const payload = {
            url: params.mediaUrl,
            caption: params.message || '',
            type: mediaType,
          };

          console.log('[WhatsApp Wati] Sending media URL:', { to, type: mediaType });

          const response = await axios.post(endpoint, payload, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          });

          return {
            success: response.data.result !== false,
            messageId: response.data.info?.id,
            status: 'sent',
            data: response.data,
          };
        }
      }

      // Standard text message - try sendSessionMessage first
      const messageText = params.message?.trim() || '';
      const url = `${baseUrl}/api/v1/sendSessionMessage/${phoneNumber}`;

      console.log('[WhatsApp Wati] Sending text:', { to, url, messageText });

      try {
        // Try with form-urlencoded format
        const formData = new URLSearchParams();
        formData.append('messageText', messageText);

        const response = await axios.post(url, formData.toString(),
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          }
        );

        console.log('[WhatsApp Wati] Response:', JSON.stringify(response.data));

        // Check for specific error cases
        if (response.data.result === false) {
          const errorInfo = response.data.info?.toLowerCase() || '';

          // No active session/conversation
          if (errorInfo.includes('invalid conversation') || errorInfo.includes('no conversation')) {
            return {
              success: false,
              error: 'No active WhatsApp session. The recipient must message your business number first (within 24 hours) before you can send them messages.',
              data: response.data,
            } as WhatsAppResponse;
          }

          // Message empty error
          if (errorInfo.includes('empty')) {
            return {
              success: false,
              error: 'Message text cannot be empty.',
              data: response.data,
            } as WhatsAppResponse;
          }

          // Generic error
          return {
            success: false,
            error: response.data.info || 'Failed to send WhatsApp message',
            data: response.data,
          };
        }

        return {
          success: true,
          messageId: response.data.info?.id || response.data.id,
          status: 'sent',
          data: response.data,
        };
      } catch (innerError: any) {
        console.error('[WhatsApp Wati] Inner Error:', innerError.response?.status, JSON.stringify(innerError.response?.data || innerError.message));
        throw innerError;
      }
    } catch (error: any) {
      console.error('[WhatsApp Wati] Error:', error.response?.status, JSON.stringify(error.response?.data || error.message));
      return {
        success: false,
        error: error.response?.data?.message || error.response?.data?.info || error.response?.data?.result || error.message,
        data: error.response?.data,
      };
    }
  }

  /**
   * Send via Exotel
   */
  private async sendViaExotel(to: string, params: SendMessageParams): Promise<WhatsAppResponse> {
    try {
      // For Exotel, use environment variables as they share with calling
      const accountSid = process.env.EXOTEL_ACCOUNT_SID;
      const apiKey = process.env.EXOTEL_API_KEY;
      const apiToken = process.env.EXOTEL_API_TOKEN;
      const subdomain = process.env.EXOTEL_SUBDOMAIN || 'api.exotel.com';
      const whatsappNumber = this.config?.phoneNumber || process.env.EXOTEL_WHATSAPP_NUMBER;

      if (!accountSid || !apiKey || !apiToken || !whatsappNumber) {
        return {
          success: false,
          error: 'Exotel WhatsApp is not configured. Please configure Exotel credentials.',
        };
      }

      const url = `https://${subdomain}/v2/accounts/${accountSid}/messages`;

      let payload: any = {
        from: whatsappNumber,
        to: to,
        channel: 'whatsapp',
      };

      if (params.templateName) {
        payload.type = 'template';
        payload.template = {
          name: params.templateName,
          language: { code: 'en' },
        };
        if (params.templateParams?.length) {
          payload.template.components = [{
            type: 'body',
            parameters: params.templateParams.map(p => ({ type: 'text', text: p })),
          }];
        }
      } else if (params.mediaUrl) {
        const mediaType = this.getMediaType(params.mediaUrl);
        payload.type = mediaType;
        payload[mediaType] = {
          link: params.mediaUrl,
          caption: params.message || '',
        };
      } else {
        payload.type = 'text';
        payload.text = { body: params.message };
      }

      console.log('[WhatsApp Exotel] Sending:', { to, type: payload.type });

      const response = await axios.post(url, payload, {
        auth: { username: apiKey, password: apiToken },
        headers: { 'Content-Type': 'application/json' },
      });

      return {
        success: true,
        messageId: response.data.message_id || response.data.id,
        status: response.data.status || 'sent',
        data: response.data,
      };
    } catch (error: any) {
      console.error('[WhatsApp Exotel] Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        data: error.response?.data,
      };
    }
  }

  /**
   * Send bulk WhatsApp messages
   */
  async sendBulk(
    recipients: Array<{ to: string; message: string; mediaUrl?: string }>
  ): Promise<Array<{ to: string; success: boolean; messageId?: string; error?: string }>> {
    const results = [];

    for (const recipient of recipients) {
      const result = await this.sendMessage({
        to: recipient.to,
        message: recipient.message,
        mediaUrl: recipient.mediaUrl,
      });

      results.push({
        to: recipient.to,
        success: result.success,
        messageId: result.messageId,
        error: result.error,
      });

      // Delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }

  /**
   * Test connection to the configured provider
   */
  async testConnection(): Promise<{ success: boolean; message: string; provider?: string }> {
    if (!this.config) {
      await this.loadConfig();
    }

    if (!this.config) {
      return { success: false, message: 'WhatsApp not configured' };
    }

    // For Meta API, phoneNumberId is sufficient (phoneNumber is optional)
    const hasValidConfig = this.config.phoneNumber || this.config.phoneNumberId || this.config.accessToken;
    if (!hasValidConfig) {
      return { success: false, message: 'WhatsApp not configured - missing credentials' };
    }

    const provider = this.config.provider;

    try {
      switch (provider) {
        case 'meta':
          if (!this.config.accessToken || !this.config.phoneNumberId) {
            return { success: false, message: 'Meta credentials incomplete', provider };
          }
          // Verify by getting phone number details
          const metaUrl = `https://graph.facebook.com/v18.0/${this.config.phoneNumberId}`;
          await axios.get(metaUrl, {
            headers: { 'Authorization': `Bearer ${this.config.accessToken}` },
          });
          return { success: true, message: 'Meta Cloud API connected successfully', provider };

        case '360dialog':
          if (!this.config.apiKey) {
            return { success: false, message: '360dialog API key missing', provider };
          }
          // Verify API key
          const dialogUrl = 'https://waba.360dialog.io/v1/configs/webhook';
          await axios.get(dialogUrl, {
            headers: { 'D360-API-KEY': this.config.apiKey },
          });
          return { success: true, message: '360dialog connected successfully', provider };

        case 'gupshup':
          if (!this.config.apiKey) {
            return { success: false, message: 'Gupshup API key missing', provider };
          }
          return { success: true, message: 'Gupshup configuration saved', provider };

        case 'wati':
          if (!this.config.apiKey || !this.config.apiSecret) {
            return { success: false, message: 'Wati credentials incomplete', provider };
          }
          // Clean the token - remove "Bearer " if user included it
          let cleanToken = this.config.apiSecret.trim();
          if (cleanToken.toLowerCase().startsWith('bearer ')) {
            cleanToken = cleanToken.substring(7).trim();
          }

          // Actually test the Wati API connection
          const watiBaseUrl = this.config.apiKey.startsWith('http')
            ? this.config.apiKey.replace(/\/$/, '')
            : `https://${this.config.apiKey.replace(/\/$/, '')}`;
          const watiTestUrl = `${watiBaseUrl}/api/v1/getContacts`;
          console.log('[Wati Test] Testing connection to:', watiTestUrl);
          console.log('[Wati Test] Token: [REDACTED]');
          try {
            const watiResponse = await axios.get(watiTestUrl, {
              headers: { 'Authorization': `Bearer ${cleanToken}` },
              params: { pageSize: 1, pageNumber: 1 },
            });
            console.log('[Wati Test] Success:', watiResponse.status);
            return { success: true, message: 'Wati connected successfully', provider };
          } catch (watiError: any) {
            console.error('[Wati Test] Connection failed:', watiError.response?.status, watiError.response?.data || watiError.message);
            const errorMsg = watiError.response?.status === 401
              ? 'Invalid Access Token - please check your Wati credentials'
              : watiError.response?.data?.message || watiError.message;
            return { success: false, message: `Wati connection failed: ${errorMsg}`, provider };
          }

        case 'exotel':
        default:
          const exotelConfigured = !!(
            process.env.EXOTEL_ACCOUNT_SID &&
            process.env.EXOTEL_API_KEY &&
            process.env.EXOTEL_API_TOKEN &&
            this.config.phoneNumber
          );
          if (!exotelConfigured) {
            return { success: false, message: 'Exotel credentials not configured in environment', provider };
          }
          return { success: true, message: 'Exotel WhatsApp configured successfully', provider };
      }
    } catch (error: any) {
      console.error('[WhatsApp Test] Error:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.error?.message || error.response?.data?.meta?.developer_message || error.message,
        provider,
      };
    }
  }

  /**
   * Get media type from URL or MIME type
   */
  private getMediaType(urlOrMime: string, providedType?: 'image' | 'video' | 'audio' | 'document'): 'image' | 'video' | 'audio' | 'document' {
    // If type is explicitly provided, use it
    if (providedType) return providedType;

    // Check if it's a base64 data URL
    if (urlOrMime.startsWith('data:')) {
      const mimeType = urlOrMime.split(';')[0].split(':')[1];
      if (mimeType.startsWith('image/')) return 'image';
      if (mimeType.startsWith('video/')) return 'video';
      if (mimeType.startsWith('audio/')) return 'audio';
      return 'document';
    }

    // Check by file extension
    const extension = urlOrMime.split('.').pop()?.toLowerCase()?.split('?')[0];
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const videoExtensions = ['mp4', 'avi', 'mov', 'webm', '3gp'];
    const audioExtensions = ['mp3', 'wav', 'ogg', 'aac', 'm4a'];

    if (imageExtensions.includes(extension || '')) return 'image';
    if (videoExtensions.includes(extension || '')) return 'video';
    if (audioExtensions.includes(extension || '')) return 'audio';
    return 'document';
  }

  /**
   * Check if URL is a base64 data URL
   */
  private isBase64DataUrl(url: string): boolean {
    return url.startsWith('data:');
  }

  /**
   * Convert base64 data URL to buffer for uploading
   */
  private base64ToBuffer(dataUrl: string): { buffer: Buffer; mimeType: string } {
    const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      throw new Error('Invalid base64 data URL');
    }
    return {
      mimeType: matches[1],
      buffer: Buffer.from(matches[2], 'base64'),
    };
  }
}

/**
 * Factory function to create WhatsApp service for an organization
 */
export function createWhatsAppService(organizationId: string): WhatsAppService {
  return new WhatsAppService(organizationId);
}

export default WhatsAppService;
