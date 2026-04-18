import axios, { AxiosInstance } from 'axios';
import { prisma } from '../config/database';
import crypto from 'crypto';

/**
 * Exotel API Integration for India Calling
 * Documentation: https://developer.exotel.com/api/
 *
 * Supports both:
 * - Platform-wide credentials (env vars) for MyLeadX-provided numbers
 * - Organization-specific credentials (BYOC - Bring Your Own Carrier)
 */

interface ExotelConfig {
  accountSid: string;
  apiKey: string;
  apiToken: string;
  callerId: string;
  subdomain?: string; // e.g., 'api.exotel.com' or 'twilix.exotel.com'
  whatsappNumber?: string; // WhatsApp Business number
}

interface SendWhatsAppParams {
  to: string;
  message: string;
  mediaUrl?: string;
  templateName?: string;
  templateParams?: string[];
  leadId?: string;
}

export interface WhatsAppResponse {
  success: boolean;
  messageId?: string;
  status?: string;
  error?: string;
  data?: any;
}

interface MakeCallParams {
  to: string;
  from?: string; // Agent's phone number (called first in click-to-call)
  customField?: string;
  callerId?: string;
  callType?: 'trans' | 'promo'; // transactional or promotional
  timeLimit?: number; // max call duration in seconds (max 14400)
  timeOut?: number; // ring timeout in seconds
  callbackUrl?: string;
  statusCallback?: string;
  // Recording options
  record?: boolean; // Enable call recording
  recordingChannels?: 'single' | 'dual'; // single (mixed) or dual (separate channels)
  recordingFormat?: 'mp3' | 'mp3-hq'; // Recording format
  // Additional options from Exotel API
  waitUrl?: string; // Audio URL to play while caller waits
  statusCallbackEvents?: ('terminal' | 'answered')[]; // Events to send callbacks for
  statusCallbackContentType?: 'multipart/form-data' | 'application/json';
  startPlaybackToNew?: 'Callee' | 'Both'; // Who hears the playback
  startPlaybackValueNew?: string; // Audio URL for pre-connection playback
}

export interface CallResponse {
  success: boolean;
  callSid?: string;
  status?: string;
  error?: string;
  data?: any;
}

interface ExotelCallDetails {
  Sid: string;
  AccountSid: string;
  From: string;
  To: string;
  PhoneNumberSid: string;
  Status: string;
  StartTime: string;
  EndTime: string;
  Duration: number;
  Price: string;
  Direction: string;
  AnsweredBy: string;
  RecordingUrl?: string;
}

// ==================== ENCRYPTION HELPERS ====================
// These match the organization-integrations.routes.ts encryption

const ENCRYPTION_KEY = (() => {
  const key = process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!key) {
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      console.error('FATAL: CREDENTIALS_ENCRYPTION_KEY environment variable is required in production');
      return '';
    }
    return process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
  }
  return key;
})();

const IV_LENGTH = 16;

function decrypt(text: string): string {
  if (!text || !text.includes(':')) return text;
  try {
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    return text; // Return as-is if decryption fails (might be unencrypted)
  }
}

// ==================== EXOTEL SERVICE CLASS ====================

class ExotelService {
  private client: AxiosInstance | null = null;
  private config: ExotelConfig | null = null;
  private baseUrl: string = '';
  private organizationId?: string;
  private configLoaded: boolean = false;

  constructor(organizationId?: string) {
    this.organizationId = organizationId;
  }

  /**
   * Load configuration from org settings or fallback to env vars
   */
  private async loadConfig(): Promise<ExotelConfig | null> {
    if (this.configLoaded && this.config) {
      return this.config;
    }

    // 1. Try org-specific credentials first
    if (this.organizationId) {
      const orgConfig = await this.loadOrgConfig();
      if (orgConfig) {
        this.config = orgConfig;
        this.configLoaded = true;
        this.initializeClient();
        return this.config;
      }
    }

    // 2. Fall back to platform (env) credentials
    const envConfig = this.loadEnvConfig();
    if (envConfig) {
      this.config = envConfig;
      this.configLoaded = true;
      this.initializeClient();
      return this.config;
    }

    return null;
  }

  /**
   * Load org-specific Exotel credentials from organization settings
   */
  private async loadOrgConfig(): Promise<ExotelConfig | null> {
    if (!this.organizationId) return null;

    try {
      const organization = await prisma.organization.findUnique({
        where: { id: this.organizationId },
        select: { settings: true },
      });

      if (!organization?.settings) return null;

      const settings = organization.settings as Record<string, any>;
      const integrations = settings.integrations
        ? (typeof settings.integrations === 'string'
            ? JSON.parse(settings.integrations)
            : settings.integrations)
        : {};

      const exotelConfig = integrations.exotel;
      if (!exotelConfig) return null;

      // Check if org has Exotel configured
      const accountSid = exotelConfig.accountSid ? decrypt(exotelConfig.accountSid) : '';
      const apiKey = exotelConfig.apiKey ? decrypt(exotelConfig.apiKey) : '';
      const apiToken = exotelConfig.apiToken ? decrypt(exotelConfig.apiToken) : '';
      const callerId = exotelConfig.callerId || '';

      // Need at least accountSid, apiKey, apiToken to be configured
      if (!accountSid || !apiKey || !apiToken) {
        return null;
      }

      console.log(`[Exotel] Loaded org-specific config for org ${this.organizationId}`);

      return {
        accountSid,
        apiKey,
        apiToken,
        callerId,
        subdomain: exotelConfig.subdomain || 'api.exotel.com',
        whatsappNumber: exotelConfig.whatsappNumber || '',
      };
    } catch (error) {
      console.error('[Exotel] Error loading org config:', error);
      return null;
    }
  }

  /**
   * Load platform-wide Exotel credentials from environment variables
   */
  private loadEnvConfig(): ExotelConfig | null {
    const accountSid = process.env.EXOTEL_ACCOUNT_SID || '';
    const apiKey = process.env.EXOTEL_API_KEY || '';
    const apiToken = process.env.EXOTEL_API_TOKEN || '';
    const callerId = process.env.EXOTEL_CALLER_ID || '';

    if (!accountSid || !apiKey || !apiToken) {
      return null;
    }

    console.log('[Exotel] Using platform-wide credentials from env vars');

    return {
      accountSid,
      apiKey,
      apiToken,
      callerId,
      subdomain: process.env.EXOTEL_SUBDOMAIN || 'api.exotel.com',
      whatsappNumber: process.env.EXOTEL_WHATSAPP_NUMBER || '',
    };
  }

  /**
   * Initialize the HTTP client with current config
   */
  private initializeClient(): void {
    if (!this.config) return;

    this.baseUrl = `https://${this.config.subdomain}/v1/Accounts/${this.config.accountSid}`;

    this.client = axios.create({
      baseURL: this.baseUrl,
      auth: {
        username: this.config.apiKey,
        password: this.config.apiToken,
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
  }

  /**
   * Ensure config is loaded before making API calls
   */
  private async ensureConfigLoaded(): Promise<boolean> {
    if (!this.configLoaded) {
      await this.loadConfig();
    }
    return this.config !== null && this.client !== null;
  }

  /**
   * Check if Exotel is configured
   */
  async isConfigured(): Promise<boolean> {
    await this.ensureConfigLoaded();
    return !!(
      this.config?.accountSid &&
      this.config?.apiKey &&
      this.config?.apiToken
    );
  }

  /**
   * Check if Exotel is configured (sync version for backward compatibility)
   * Note: This only works if config has already been loaded
   */
  isConfiguredSync(): boolean {
    return !!(
      this.config?.accountSid &&
      this.config?.apiKey &&
      this.config?.apiToken
    );
  }

  /**
   * Get the current config (for testing/debugging)
   */
  async getConfig(): Promise<ExotelConfig | null> {
    await this.ensureConfigLoaded();
    return this.config;
  }

  /**
   * Test the connection to Exotel API
   */
  async testConnection(): Promise<{ success: boolean; message: string; data?: any }> {
    const configured = await this.isConfigured();
    if (!configured) {
      return {
        success: false,
        message: 'Exotel is not configured. Please provide accountSid, apiKey, and apiToken.',
      };
    }

    try {
      // Try to get account details to verify credentials
      const result = await this.getAccountDetails();
      if (result.success) {
        return {
          success: true,
          message: 'Successfully connected to Exotel',
          data: result.data,
        };
      }
      return {
        success: false,
        message: result.error || 'Failed to connect to Exotel',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to connect to Exotel',
      };
    }
  }

  /**
   * Format phone number for India
   * Exotel expects numbers in format: 0XXXXXXXXXX or +91XXXXXXXXXX
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');

    // If starts with +91, keep as is
    if (cleaned.startsWith('+91')) {
      return cleaned;
    }

    // If starts with 91 (without +), add +
    if (cleaned.startsWith('91') && cleaned.length === 12) {
      return '+' + cleaned;
    }

    // If 10 digit number, add +91
    if (cleaned.length === 10) {
      return '+91' + cleaned;
    }

    // If starts with 0, replace with +91
    if (cleaned.startsWith('0') && cleaned.length === 11) {
      return '+91' + cleaned.substring(1);
    }

    return cleaned;
  }

  /**
   * Make an outbound call using Exotel
   * This initiates a call where Exotel first calls the 'from' number,
   * and when answered, connects to the 'to' number
   *
   * For AI calling, we'll use the App (Passthru) flow
   */
  async makeCall(params: MakeCallParams): Promise<CallResponse> {
    const configured = await this.isConfigured();
    if (!configured) {
      return {
        success: false,
        error: 'Exotel is not configured. Please set EXOTEL_ACCOUNT_SID, EXOTEL_API_KEY, EXOTEL_API_TOKEN, and EXOTEL_CALLER_ID.',
      };
    }

    try {
      const toNumber = this.formatPhoneNumber(params.to);
      const callerId = params.callerId || this.config!.callerId;

      // Build form data for outbound IVR call
      // From = customer being called
      // CallerId = what customer sees
      // Url = ExoML webhook (configured in dashboard Passthru App)
      const formData = new URLSearchParams();
      formData.append('From', toNumber);  // Customer to call
      formData.append('CallerId', callerId);  // What customer sees

      if (params.callType) {
        formData.append('CallType', params.callType);
      }

      if (params.timeLimit) {
        formData.append('TimeLimit', params.timeLimit.toString());
      }

      if (params.timeOut) {
        formData.append('TimeOut', params.timeOut.toString());
      }

      if (params.statusCallback) {
        formData.append('StatusCallback', params.statusCallback);
      }

      if (params.customField) {
        formData.append('CustomField', params.customField);
      }

      // Recording options
      if (params.record !== undefined) {
        formData.append('Record', params.record.toString());
      }

      if (params.recordingChannels) {
        formData.append('RecordingChannels', params.recordingChannels);
      }

      if (params.recordingFormat) {
        formData.append('RecordingFormat', params.recordingFormat);
      }

      // Wait URL - audio to play while caller waits
      if (params.waitUrl) {
        formData.append('WaitUrl', params.waitUrl);
      }

      // Status callback options
      if (params.statusCallbackEvents && params.statusCallbackEvents.length > 0) {
        formData.append('StatusCallbackEvents', JSON.stringify(params.statusCallbackEvents));
      }

      if (params.statusCallbackContentType) {
        formData.append('StatusCallbackContentType', params.statusCallbackContentType);
      }

      // Playback options
      if (params.startPlaybackToNew) {
        formData.append('StartPlaybackToNew', params.startPlaybackToNew);
      }

      if (params.startPlaybackValueNew) {
        formData.append('StartPlaybackValueNew', params.startPlaybackValueNew);
      }

      // Use Exotel Voice Bot App ID if configured (for WebSocket streaming)
      // Otherwise fall back to ExoML Passthru App ID
      const voiceBotAppId = process.env.EXOTEL_VOICEBOT_APP_ID;
      const passthruAppId = process.env.EXOTEL_APP_ID;

      if (voiceBotAppId) {
        // Voice Bot flow - uses WebSocket for real-time streaming
        const appUrl = `http://my.exotel.com/exoml/start/${voiceBotAppId}`;
        formData.append('Url', appUrl);
        console.log('Using Exotel Voice Bot App ID:', voiceBotAppId);
      } else if (passthruAppId) {
        // ExoML Passthru flow - uses HTTP webhooks
        const appUrl = `http://my.exotel.com/exoml/start/${passthruAppId}`;
        formData.append('Url', appUrl);
        console.log('Using Exotel Passthru App ID:', passthruAppId);
      } else if (params.callbackUrl) {
        // Direct URL - for testing
        formData.append('Url', params.callbackUrl);
        console.log('Using direct callback URL:', params.callbackUrl);
      } else {
        console.warn('WARNING: No Exotel App ID configured. Call may be silent!');
        console.warn('Set EXOTEL_VOICEBOT_APP_ID for Voice Bot or EXOTEL_APP_ID for ExoML Passthru');
      }

      console.log('Exotel makeCall request:', {
        to: toNumber,
        callerId,
        customField: params.customField,
        statusCallback: params.statusCallback,
        callbackUrl: params.callbackUrl,
      });

      // Make the API call
      const response = await this.client!.post('/Calls/connect.json', formData);

      console.log('Exotel makeCall response:', JSON.stringify(response.data, null, 2));

      if (response.data && response.data.Call) {
        return {
          success: true,
          callSid: response.data.Call.Sid,
          status: response.data.Call.Status,
          data: response.data.Call,
        };
      }

      return {
        success: false,
        error: 'Unexpected response from Exotel',
        data: response.data,
      };
    } catch (error: any) {
      console.error('Exotel makeCall error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.RestException?.Message || error.message,
        data: error.response?.data,
      };
    }
  }

  /**
   * Connect Agent to Customer (Click-to-Call)
   * Exotel first calls the agent (From), and when answered, connects to customer (To)
   * This is the standard connect API from Exotel documentation
   */
  async connectCall(params: {
    from: string; // Agent's phone number (called first)
    to: string; // Customer's phone number (called second)
    callerId?: string; // ExoPhone number shown to both parties
    callType?: 'trans' | 'promo';
    timeLimit?: number;
    timeOut?: number;
    record?: boolean;
    recordingChannels?: 'single' | 'dual';
    recordingFormat?: 'mp3' | 'mp3-hq';
    waitUrl?: string;
    statusCallback?: string;
    customField?: string;
  }): Promise<CallResponse> {
    const configured = await this.isConfigured();
    if (!configured) {
      return {
        success: false,
        error: 'Exotel is not configured.',
      };
    }

    try {
      const fromNumber = this.formatPhoneNumber(params.from);
      const toNumber = this.formatPhoneNumber(params.to);
      const callerId = params.callerId || this.config!.callerId;

      const formData = new URLSearchParams();
      formData.append('From', fromNumber); // Agent (called first)
      formData.append('To', toNumber); // Customer (called second)
      formData.append('CallerId', callerId);

      if (params.callType) {
        formData.append('CallType', params.callType);
      }

      if (params.timeLimit) {
        formData.append('TimeLimit', params.timeLimit.toString());
      }

      if (params.timeOut) {
        formData.append('TimeOut', params.timeOut.toString());
      }

      if (params.record !== undefined) {
        formData.append('Record', params.record.toString());
      }

      if (params.recordingChannels) {
        formData.append('RecordingChannels', params.recordingChannels);
      }

      if (params.recordingFormat) {
        formData.append('RecordingFormat', params.recordingFormat);
      }

      if (params.waitUrl) {
        formData.append('WaitUrl', params.waitUrl);
      }

      if (params.statusCallback) {
        formData.append('StatusCallback', params.statusCallback);
      }

      if (params.customField) {
        formData.append('CustomField', params.customField);
      }

      console.log('Exotel connectCall request:', {
        from: fromNumber,
        to: toNumber,
        callerId,
        statusCallback: params.statusCallback,
      });

      const response = await this.client!.post('/Calls/connect.json', formData);

      console.log('Exotel connectCall response:', JSON.stringify(response.data, null, 2));

      if (response.data && response.data.Call) {
        return {
          success: true,
          callSid: response.data.Call.Sid,
          status: response.data.Call.Status,
          data: response.data.Call,
        };
      }

      return {
        success: false,
        error: 'Unexpected response from Exotel',
        data: response.data,
      };
    } catch (error: any) {
      console.error('Exotel connectCall error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.RestException?.Message || error.message,
        data: error.response?.data,
      };
    }
  }

  /**
   * Make an AI/TTS outbound call
   * This uses the Exotel Calls API with a URL for ExoML response
   */
  async makeAICall(params: {
    to: string;
    callerId?: string;
    answerUrl: string;  // URL that returns ExoML for TTS
    statusCallback?: string;
    customField?: string;
    timeLimit?: number;
    timeOut?: number;
    record?: boolean;
    recordingChannels?: 'single' | 'dual';
    recordingFormat?: 'mp3' | 'mp3-hq';
  }): Promise<CallResponse> {
    const configured = await this.isConfigured();
    if (!configured) {
      return {
        success: false,
        error: 'Exotel is not configured.',
      };
    }

    try {
      const toNumber = this.formatPhoneNumber(params.to);
      const callerId = params.callerId || this.config!.callerId;

      const formData = new URLSearchParams();
      formData.append('From', toNumber);
      formData.append('CallerId', callerId);
      formData.append('Url', params.answerUrl);

      if (params.statusCallback) {
        formData.append('StatusCallback', params.statusCallback);
      }

      if (params.customField) {
        formData.append('CustomField', params.customField);
      }

      if (params.timeLimit) {
        formData.append('TimeLimit', params.timeLimit.toString());
      }

      if (params.timeOut) {
        formData.append('TimeOut', params.timeOut.toString());
      }

      // Recording options - default to dual channel for AI analysis
      if (params.record !== false) {
        formData.append('Record', 'true');
      }

      if (params.recordingChannels) {
        formData.append('RecordingChannels', params.recordingChannels);
      } else {
        formData.append('RecordingChannels', 'dual'); // Default to dual for AI analysis
      }

      if (params.recordingFormat) {
        formData.append('RecordingFormat', params.recordingFormat);
      }

      console.log('Exotel makeAICall request:', {
        to: toNumber,
        callerId,
        answerUrl: params.answerUrl,
        statusCallback: params.statusCallback,
        record: params.record !== false,
        recordingChannels: params.recordingChannels || 'dual',
      });

      const response = await this.client!.post('/Calls/connect.json', formData);

      console.log('Exotel makeAICall response:', JSON.stringify(response.data, null, 2));

      if (response.data && response.data.Call) {
        return {
          success: true,
          callSid: response.data.Call.Sid,
          status: response.data.Call.Status,
          data: response.data.Call,
        };
      }

      return {
        success: false,
        error: 'Unexpected response from Exotel',
        data: response.data,
      };
    } catch (error: any) {
      console.error('Exotel makeAICall error:', error.response?.data || error.message, error.response?.status);
      return {
        success: false,
        error: error.response?.data?.RestException?.Message || error.message,
      };
    }
  }

  /**
   * Make a call to an Exotel App (for IVR/AI flow)
   * This is used for connecting calls to an applet/flow
   */
  async makeAppCall(params: {
    to: string;
    appId?: string;
    url?: string;  // Direct URL for ExoML webhook
    callerId?: string;
    timeLimit?: number;
    timeOut?: number;
    statusCallback?: string;
    customField?: string;
  }): Promise<CallResponse> {
    const configured = await this.isConfigured();
    if (!configured) {
      return {
        success: false,
        error: 'Exotel is not configured.',
      };
    }

    try {
      const toNumber = this.formatPhoneNumber(params.to);
      const callerId = params.callerId || this.config!.callerId;

      const formData = new URLSearchParams();
      formData.append('From', toNumber);
      formData.append('CallerId', callerId);

      // Use direct URL if provided, otherwise use App ID
      const exomlUrl = params.url || `http://my.exotel.com/exoml/start/${params.appId}`;
      formData.append('Url', exomlUrl);
      console.log('Exotel call using URL:', exomlUrl);

      if (params.timeLimit) {
        formData.append('TimeLimit', params.timeLimit.toString());
      }

      if (params.timeOut) {
        formData.append('TimeOut', params.timeOut.toString());
      }

      if (params.statusCallback) {
        formData.append('StatusCallback', params.statusCallback);
      }

      if (params.customField) {
        formData.append('CustomField', params.customField);
      }

      const response = await this.client!.post('/Calls/connect.json', formData);

      if (response.data && response.data.Call) {
        return {
          success: true,
          callSid: response.data.Call.Sid,
          status: response.data.Call.Status,
          data: response.data.Call,
        };
      }

      return {
        success: false,
        error: 'Unexpected response from Exotel',
        data: response.data,
      };
    } catch (error: any) {
      console.error('Exotel makeAppCall error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.RestException?.Message || error.message,
      };
    }
  }

  /**
   * Get call details by Call SID
   */
  async getCallDetails(callSid: string): Promise<CallResponse> {
    const configured = await this.isConfigured();
    if (!configured) {
      return { success: false, error: 'Exotel is not configured.' };
    }

    try {
      const response = await this.client!.get(`/Calls/${callSid}.json`);

      if (response.data && response.data.Call) {
        return {
          success: true,
          callSid: response.data.Call.Sid,
          status: response.data.Call.Status,
          data: response.data.Call,
        };
      }

      return {
        success: false,
        error: 'Call not found',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.RestException?.Message || error.message,
      };
    }
  }

  /**
   * Get call recording
   */
  async getRecording(callSid: string): Promise<{ success: boolean; recordingUrl?: string; error?: string }> {
    try {
      const callDetails = await this.getCallDetails(callSid);

      if (callDetails.success && callDetails.data?.RecordingUrl) {
        return {
          success: true,
          recordingUrl: callDetails.data.RecordingUrl,
        };
      }

      return {
        success: false,
        error: 'Recording not available',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send SMS via Exotel with DLT Template support
   * For India, DLT registration is mandatory
   */
  async sendSMS(params: {
    to: string;
    body: string;
    senderId?: string;
    templateId?: string;  // DLT Template ID (required for India)
    entityId?: string;    // DLT Entity ID
    priority?: 'normal' | 'high';
    encodingType?: 'plain' | 'unicode';
    smsType?: 'transactional' | 'promotional';
  }): Promise<{ success: boolean; messageSid?: string; error?: string }> {
    const configured = await this.isConfigured();
    if (!configured) {
      return { success: false, error: 'Exotel is not configured.' };
    }

    try {
      const toNumber = this.formatPhoneNumber(params.to);
      const senderId = params.senderId || process.env.EXOTEL_SMS_SENDER_ID || this.config!.callerId;

      const formData = new URLSearchParams();
      formData.append('From', senderId);
      formData.append('To', toNumber);
      formData.append('Body', params.body);

      // DLT Template ID (required for transactional SMS in India)
      if (params.templateId || process.env.EXOTEL_DLT_TEMPLATE_ID) {
        formData.append('DltTemplateId', params.templateId || process.env.EXOTEL_DLT_TEMPLATE_ID || '');
      }

      // DLT Entity ID
      if (params.entityId || process.env.EXOTEL_DLT_ENTITY_ID) {
        formData.append('DltEntityId', params.entityId || process.env.EXOTEL_DLT_ENTITY_ID || '');
      }

      // SMS Type: transactional or promotional
      if (params.smsType) {
        formData.append('SmsType', params.smsType);
      }

      if (params.priority) {
        formData.append('Priority', params.priority);
      }

      if (params.encodingType) {
        formData.append('EncodingType', params.encodingType);
      }

      const response = await this.client!.post('/Sms/send.json', formData);

      if (response.data && response.data.SMSMessage) {
        return {
          success: true,
          messageSid: response.data.SMSMessage.Sid,
        };
      }

      return {
        success: false,
        error: 'Failed to send SMS',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.RestException?.Message || error.message,
      };
    }
  }

  /**
   * Send bulk SMS via Exotel
   */
  async sendBulkSMS(params: {
    recipients: Array<{ to: string; body: string }>;
    senderId?: string;
    templateId?: string;
    entityId?: string;
    smsType?: 'transactional' | 'promotional';
  }): Promise<Array<{ to: string; success: boolean; messageSid?: string; error?: string }>> {
    const results = [];

    for (const recipient of params.recipients) {
      const result = await this.sendSMS({
        to: recipient.to,
        body: recipient.body,
        senderId: params.senderId,
        templateId: params.templateId,
        entityId: params.entityId,
        smsType: params.smsType,
      });

      results.push({
        to: recipient.to,
        ...result,
      });

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }

  /**
   * Get account details and balance
   */
  async getAccountDetails(): Promise<{ success: boolean; balance?: number; data?: any; error?: string }> {
    const configured = await this.isConfigured();
    if (!configured) {
      return { success: false, error: 'Exotel is not configured.' };
    }

    try {
      const response = await this.client!.get('.json');

      if (response.data && response.data.Account) {
        return {
          success: true,
          balance: parseFloat(response.data.Account.Balance || '0'),
          data: response.data.Account,
        };
      }

      return {
        success: false,
        error: 'Failed to get account details',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.RestException?.Message || error.message,
      };
    }
  }

  /**
   * Handle Exotel webhook/callback for call status
   * Exotel sends POST with these fields:
   * - CallSid, From, To, Status, Direction, etc.
   */
  parseWebhookData(body: any): {
    callSid: string;
    from: string;
    to: string;
    status: string;
    direction: string;
    duration?: number;
    recordingUrl?: string;
    customField?: string;
  } {
    return {
      callSid: body.CallSid || body.Sid,
      from: body.From,
      to: body.To,
      status: this.mapExotelStatus(body.Status),
      direction: body.Direction?.toLowerCase() || 'outbound',
      duration: body.Duration ? parseInt(body.Duration) : undefined,
      recordingUrl: body.RecordingUrl,
      customField: body.CustomField,
    };
  }

  /**
   * Map Exotel call status to standard status
   */
  private mapExotelStatus(exotelStatus: string): string {
    const statusMap: Record<string, string> = {
      'queued': 'QUEUED',
      'ringing': 'RINGING',
      'in-progress': 'IN_PROGRESS',
      'completed': 'COMPLETED',
      'busy': 'BUSY',
      'failed': 'FAILED',
      'no-answer': 'NO_ANSWER',
      'canceled': 'CANCELLED',
    };

    return statusMap[exotelStatus?.toLowerCase()] || exotelStatus?.toUpperCase() || 'UNKNOWN';
  }

  /**
   * Check if WhatsApp is configured
   */
  async isWhatsAppConfigured(): Promise<boolean> {
    await this.ensureConfigLoaded();
    return !!(
      this.config?.accountSid &&
      this.config?.apiKey &&
      this.config?.apiToken &&
      this.config?.whatsappNumber
    );
  }

  /**
   * Send WhatsApp message via Exotel
   * Documentation: https://developer.exotel.com/api/#whatsapp-send-message
   */
  async sendWhatsApp(params: SendWhatsAppParams): Promise<WhatsAppResponse> {
    const whatsappConfigured = await this.isWhatsAppConfigured();
    if (!whatsappConfigured) {
      return {
        success: false,
        error: 'Exotel WhatsApp is not configured. Please set EXOTEL_WHATSAPP_NUMBER.',
      };
    }

    try {
      const toNumber = this.formatPhoneNumber(params.to);

      // Exotel WhatsApp API endpoint
      const whatsappUrl = `https://${this.config!.subdomain}/v2/accounts/${this.config!.accountSid}/messages`;

      const payload: any = {
        from: this.config!.whatsappNumber,
        to: toNumber,
        channel: 'whatsapp',
      };

      // If template is provided, use template message
      if (params.templateName) {
        payload.type = 'template';
        payload.template = {
          name: params.templateName,
          language: {
            code: 'en',
          },
        };
        if (params.templateParams && params.templateParams.length > 0) {
          payload.template.components = [
            {
              type: 'body',
              parameters: params.templateParams.map(p => ({ type: 'text', text: p })),
            },
          ];
        }
      } else {
        // Regular text message
        payload.type = 'text';
        payload.text = {
          body: params.message,
        };
      }

      // If media is provided, send as media message
      if (params.mediaUrl) {
        // Determine media type from URL
        const mediaType = this.getMediaType(params.mediaUrl);
        payload.type = mediaType;
        payload[mediaType] = {
          link: params.mediaUrl,
          caption: params.message || '',
        };
      }

      console.log('[Exotel WhatsApp] Sending message:', {
        to: toNumber,
        type: payload.type,
        hasMedia: !!params.mediaUrl,
      });

      const response = await axios.post(whatsappUrl, payload, {
        auth: {
          username: this.config!.apiKey,
          password: this.config!.apiToken,
        },
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('[Exotel WhatsApp] Response:', response.data);

      if (response.data && response.data.message_id) {
        return {
          success: true,
          messageId: response.data.message_id,
          status: response.data.status || 'sent',
          data: response.data,
        };
      }

      return {
        success: true,
        messageId: response.data?.id,
        status: 'sent',
        data: response.data,
      };
    } catch (error: any) {
      console.error('[Exotel WhatsApp] Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.response?.data?.error || error.message,
        data: error.response?.data,
      };
    }
  }

  /**
   * Send WhatsApp document/media
   */
  async sendWhatsAppDocument(params: {
    to: string;
    documentUrl: string;
    filename?: string;
    caption?: string;
  }): Promise<WhatsAppResponse> {
    const whatsappConfigured = await this.isWhatsAppConfigured();
    if (!whatsappConfigured) {
      return {
        success: false,
        error: 'Exotel WhatsApp is not configured.',
      };
    }

    try {
      const toNumber = this.formatPhoneNumber(params.to);
      const whatsappUrl = `https://${this.config!.subdomain}/v2/accounts/${this.config!.accountSid}/messages`;

      const payload = {
        from: this.config!.whatsappNumber,
        to: toNumber,
        channel: 'whatsapp',
        type: 'document',
        document: {
          link: params.documentUrl,
          filename: params.filename || 'document',
          caption: params.caption || '',
        },
      };

      console.log('[Exotel WhatsApp] Sending document:', {
        to: toNumber,
        documentUrl: params.documentUrl,
      });

      const response = await axios.post(whatsappUrl, payload, {
        auth: {
          username: this.config!.apiKey,
          password: this.config!.apiToken,
        },
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return {
        success: true,
        messageId: response.data?.message_id || response.data?.id,
        status: 'sent',
        data: response.data,
      };
    } catch (error: any) {
      console.error('[Exotel WhatsApp] Document error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Send bulk WhatsApp messages
   */
  async sendBulkWhatsApp(params: {
    recipients: Array<{ to: string; message: string; mediaUrl?: string }>;
  }): Promise<Array<{ to: string; success: boolean; messageId?: string; error?: string }>> {
    const results = [];

    for (const recipient of params.recipients) {
      const result = await this.sendWhatsApp({
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

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }

  /**
   * Get media type from URL
   */
  private getMediaType(url: string): 'image' | 'video' | 'audio' | 'document' {
    const extension = url.split('.').pop()?.toLowerCase();

    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const videoExtensions = ['mp4', 'avi', 'mov', 'webm', '3gp'];
    const audioExtensions = ['mp3', 'wav', 'ogg', 'aac'];

    if (imageExtensions.includes(extension || '')) return 'image';
    if (videoExtensions.includes(extension || '')) return 'video';
    if (audioExtensions.includes(extension || '')) return 'audio';
    return 'document';
  }

  /**
   * Handle incoming WhatsApp webhook from Exotel
   */
  parseWhatsAppWebhook(body: any): {
    messageId: string;
    from: string;
    to: string;
    message: string;
    mediaUrl?: string;
    timestamp: Date;
    status?: string;
  } {
    return {
      messageId: body.message_id || body.id,
      from: body.from,
      to: body.to,
      message: body.text?.body || body.caption || '',
      mediaUrl: body.image?.link || body.document?.link || body.video?.link,
      timestamp: new Date(body.timestamp || Date.now()),
      status: body.status,
    };
  }

  // ==================== PHONE NUMBER PROVISIONING ====================

  /**
   * List available phone numbers from Exotel
   * Documentation: https://developer.exotel.com/api/exophones#available-phone-numbers
   */
  async listAvailableNumbers(params: {
    country?: string;      // Country ISO code (default: IN)
    type?: 'Landline' | 'Mobile' | 'TollFree';
    region?: string;       // State/region filter
    pattern?: string;      // Number pattern to search (e.g., '80' for Bangalore)
    limit?: number;
  } = {}): Promise<{
    success: boolean;
    numbers?: Array<{
      phoneNumber: string;
      friendlyName: string;
      region: string;
      type: string;
      capabilities: { voice: boolean; sms: boolean };
      monthlyPrice: number;
      currency: string;
    }>;
    error?: string;
  }> {
    const configured = await this.isConfigured();
    if (!configured) {
      return { success: false, error: 'Exotel is not configured.' };
    }

    try {
      const country = params.country || 'IN';
      const queryParams = new URLSearchParams();

      if (params.type) {
        queryParams.append('Type', params.type);
      }
      if (params.region) {
        queryParams.append('Region', params.region);
      }
      if (params.pattern) {
        queryParams.append('Contains', params.pattern);
      }
      if (params.limit) {
        queryParams.append('PageSize', params.limit.toString());
      }

      const url = `/AvailablePhoneNumbers/${country}.json?${queryParams.toString()}`;
      console.log('[Exotel] Listing available numbers:', url);

      const response = await this.client!.get(url);

      if (response.data && response.data.AvailablePhoneNumbers) {
        const numbers = response.data.AvailablePhoneNumbers.map((num: any) => ({
          phoneNumber: num.PhoneNumber || num.phone_number,
          friendlyName: num.FriendlyName || num.friendly_name || num.PhoneNumber,
          region: num.Region || num.region || 'Unknown',
          type: num.Type || num.type || 'Landline',
          capabilities: {
            voice: num.Capabilities?.voice !== false,
            sms: num.Capabilities?.sms === true,
          },
          monthlyPrice: parseFloat(num.MonthlyPrice || num.monthly_rental_rate || '500'),
          currency: num.Currency || 'INR',
        }));

        return {
          success: true,
          numbers,
        };
      }

      return {
        success: true,
        numbers: [],
      };
    } catch (error: any) {
      console.error('[Exotel] List available numbers error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.RestException?.Message || error.message,
      };
    }
  }

  /**
   * Get list of purchased ExoPhones
   * Documentation: https://developer.exotel.com/api/exophones#incoming-phone-numbers
   */
  async listPurchasedNumbers(): Promise<{
    success: boolean;
    numbers?: Array<{
      sid: string;
      phoneNumber: string;
      friendlyName: string;
      region: string;
      capabilities: { voice: boolean; sms: boolean };
      voiceUrl?: string;
      smsUrl?: string;
    }>;
    error?: string;
  }> {
    const configured = await this.isConfigured();
    if (!configured) {
      return { success: false, error: 'Exotel is not configured.' };
    }

    try {
      console.log('[Exotel] Fetching purchased numbers from:', this.baseUrl + '/IncomingPhoneNumbers.json');
      const response = await this.client!.get('/IncomingPhoneNumbers.json');

      console.log('[Exotel] IncomingPhoneNumbers response:', JSON.stringify(response.data, null, 2));

      // Handle different response structures from Exotel API
      // Exotel returns IncomingPhoneNumbers (array) for multiple, IncomingPhoneNumber (object) for single
      let phoneNumbers: any[] = [];

      if (response.data?.IncomingPhoneNumbers) {
        // Multiple numbers - array format
        phoneNumbers = response.data.IncomingPhoneNumbers;
      } else if (response.data?.IncomingPhoneNumber) {
        // Single number - object format (Exotel returns singular when only 1 number)
        phoneNumbers = [response.data.IncomingPhoneNumber];
        console.log('[Exotel] Found single number, converting to array');
      } else if (response.data?.incoming_phone_numbers) {
        phoneNumbers = response.data.incoming_phone_numbers;
      } else if (response.data?.Exophones || response.data?.exophones) {
        phoneNumbers = response.data.Exophones || response.data.exophones;
      }

      // If still empty, try to find array in response
      if (phoneNumbers.length === 0 && response.data) {
        const keys = Object.keys(response.data);
        for (const key of keys) {
          if (Array.isArray(response.data[key])) {
            phoneNumbers = response.data[key];
            console.log('[Exotel] Found numbers array in key:', key);
            break;
          }
        }
      }

      if (phoneNumbers.length > 0) {
        const numbers = phoneNumbers.map((num: any) => ({
          sid: num.Sid || num.sid || num.PhoneNumberSid,
          phoneNumber: num.PhoneNumber || num.phone_number || num.IncomingPhoneNumber,
          friendlyName: num.FriendlyName || num.friendly_name || num.PhoneNumber,
          region: num.Region || num.region || 'India',
          capabilities: {
            voice: num.Capabilities?.voice !== false,
            sms: num.Capabilities?.sms === true,
          },
          voiceUrl: num.VoiceUrl || num.voice_url,
          smsUrl: num.SmsUrl || num.sms_url,
        }));

        console.log('[Exotel] Parsed', numbers.length, 'numbers');
        return {
          success: true,
          numbers,
        };
      }

      console.log('[Exotel] No numbers found in response');
      return {
        success: true,
        numbers: [],
      };
    } catch (error: any) {
      console.error('[Exotel] List purchased numbers error:', error.response?.data || error.message);
      console.error('[Exotel] Error status:', error.response?.status);
      return {
        success: false,
        error: error.response?.data?.RestException?.Message || error.message,
      };
    }
  }

  /**
   * Purchase a phone number from Exotel
   * Documentation: https://developer.exotel.com/api/exophones#buy-incoming-phone-number
   */
  async purchaseNumber(params: {
    phoneNumber: string;
    friendlyName?: string;
    voiceUrl?: string;
    smsUrl?: string;
  }): Promise<{
    success: boolean;
    exophone?: {
      sid: string;
      phoneNumber: string;
      friendlyName: string;
      status: string;
    };
    error?: string;
  }> {
    const configured = await this.isConfigured();
    if (!configured) {
      return { success: false, error: 'Exotel is not configured.' };
    }

    try {
      const formData = new URLSearchParams();
      formData.append('PhoneNumber', params.phoneNumber);

      if (params.friendlyName) {
        formData.append('FriendlyName', params.friendlyName);
      }
      if (params.voiceUrl) {
        formData.append('VoiceUrl', params.voiceUrl);
      }
      if (params.smsUrl) {
        formData.append('SmsUrl', params.smsUrl);
      }

      console.log('[Exotel] Purchasing number:', params.phoneNumber);

      const response = await this.client!.post('/IncomingPhoneNumbers.json', formData);

      if (response.data && response.data.IncomingPhoneNumber) {
        const num = response.data.IncomingPhoneNumber;
        return {
          success: true,
          exophone: {
            sid: num.Sid,
            phoneNumber: num.PhoneNumber,
            friendlyName: num.FriendlyName || params.friendlyName || num.PhoneNumber,
            status: num.Status || 'active',
          },
        };
      }

      return {
        success: false,
        error: 'Failed to purchase number - unexpected response',
      };
    } catch (error: any) {
      console.error('[Exotel] Purchase number error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.RestException?.Message || error.message,
      };
    }
  }

  /**
   * Update an ExoPhone configuration
   */
  async updateExophone(params: {
    sid: string;
    friendlyName?: string;
    voiceUrl?: string;
    smsUrl?: string;
  }): Promise<{
    success: boolean;
    exophone?: {
      sid: string;
      phoneNumber: string;
      friendlyName: string;
    };
    error?: string;
  }> {
    const configured = await this.isConfigured();
    if (!configured) {
      return { success: false, error: 'Exotel is not configured.' };
    }

    try {
      const formData = new URLSearchParams();

      if (params.friendlyName) {
        formData.append('FriendlyName', params.friendlyName);
      }
      if (params.voiceUrl) {
        formData.append('VoiceUrl', params.voiceUrl);
      }
      if (params.smsUrl) {
        formData.append('SmsUrl', params.smsUrl);
      }

      const response = await this.client!.put(`/IncomingPhoneNumbers/${params.sid}.json`, formData);

      if (response.data && response.data.IncomingPhoneNumber) {
        const num = response.data.IncomingPhoneNumber;
        return {
          success: true,
          exophone: {
            sid: num.Sid,
            phoneNumber: num.PhoneNumber,
            friendlyName: num.FriendlyName,
          },
        };
      }

      return {
        success: false,
        error: 'Failed to update number',
      };
    } catch (error: any) {
      console.error('[Exotel] Update exophone error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.RestException?.Message || error.message,
      };
    }
  }

  /**
   * Release (delete) an ExoPhone
   */
  async releaseNumber(sid: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    const configured = await this.isConfigured();
    if (!configured) {
      return { success: false, error: 'Exotel is not configured.' };
    }

    try {
      await this.client!.delete(`/IncomingPhoneNumbers/${sid}.json`);
      return { success: true };
    } catch (error: any) {
      console.error('[Exotel] Release number error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.RestException?.Message || error.message,
      };
    }
  }

  /**
   * Get details of a specific ExoPhone
   */
  async getExophoneDetails(sid: string): Promise<{
    success: boolean;
    exophone?: {
      sid: string;
      phoneNumber: string;
      friendlyName: string;
      region: string;
      capabilities: { voice: boolean; sms: boolean };
      voiceUrl?: string;
      smsUrl?: string;
      status: string;
    };
    error?: string;
  }> {
    const configured = await this.isConfigured();
    if (!configured) {
      return { success: false, error: 'Exotel is not configured.' };
    }

    try {
      const response = await this.client!.get(`/IncomingPhoneNumbers/${sid}.json`);

      if (response.data && response.data.IncomingPhoneNumber) {
        const num = response.data.IncomingPhoneNumber;
        return {
          success: true,
          exophone: {
            sid: num.Sid,
            phoneNumber: num.PhoneNumber,
            friendlyName: num.FriendlyName,
            region: num.Region || 'Unknown',
            capabilities: {
              voice: num.Capabilities?.voice !== false,
              sms: num.Capabilities?.sms === true,
            },
            voiceUrl: num.VoiceUrl,
            smsUrl: num.SmsUrl,
            status: num.Status || 'active',
          },
        };
      }

      return {
        success: false,
        error: 'ExoPhone not found',
      };
    } catch (error: any) {
      console.error('[Exotel] Get exophone details error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.RestException?.Message || error.message,
      };
    }
  }
}

// ==================== FACTORY FUNCTION ====================

/**
 * Create an ExotelService instance for a specific organization
 * If no organizationId is provided, uses platform-wide credentials
 */
export function createExotelService(organizationId?: string): ExotelService {
  return new ExotelService(organizationId);
}

// ==================== DEFAULT INSTANCE (Platform-wide) ====================

// Export singleton instance for backward compatibility (uses env vars)
export const exotelService = new ExotelService();
export default exotelService;
