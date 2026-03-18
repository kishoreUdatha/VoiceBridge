import axios, { AxiosInstance } from 'axios';

/**
 * Exotel API Integration for India Calling
 * Documentation: https://developer.exotel.com/api/
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

class ExotelService {
  private client: AxiosInstance;
  private config: ExotelConfig;
  private baseUrl: string;

  constructor() {
    this.config = {
      accountSid: process.env.EXOTEL_ACCOUNT_SID || '',
      apiKey: process.env.EXOTEL_API_KEY || '',
      apiToken: process.env.EXOTEL_API_TOKEN || '',
      callerId: process.env.EXOTEL_CALLER_ID || '',
      subdomain: process.env.EXOTEL_SUBDOMAIN || 'api.exotel.com',
      whatsappNumber: process.env.EXOTEL_WHATSAPP_NUMBER || '',
    };

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
   * Check if Exotel is configured
   */
  isConfigured(): boolean {
    return !!(
      this.config.accountSid &&
      this.config.apiKey &&
      this.config.apiToken &&
      this.config.callerId
    );
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
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Exotel is not configured. Please set EXOTEL_ACCOUNT_SID, EXOTEL_API_KEY, EXOTEL_API_TOKEN, and EXOTEL_CALLER_ID.',
      };
    }

    try {
      const toNumber = this.formatPhoneNumber(params.to);
      const callerId = params.callerId || this.config.callerId;

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
      const response = await this.client.post('/Calls/connect.json', formData);

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
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Exotel is not configured.',
      };
    }

    try {
      const fromNumber = this.formatPhoneNumber(params.from);
      const toNumber = this.formatPhoneNumber(params.to);
      const callerId = params.callerId || this.config.callerId;

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

      const response = await this.client.post('/Calls/connect.json', formData);

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
  }): Promise<CallResponse> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Exotel is not configured.',
      };
    }

    try {
      const toNumber = this.formatPhoneNumber(params.to);
      const callerId = params.callerId || this.config.callerId;

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

      console.log('Exotel makeAICall request:', {
        to: toNumber,
        callerId,
        answerUrl: params.answerUrl,
        statusCallback: params.statusCallback,
      });

      const response = await this.client.post('/Calls/connect.json', formData);

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
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Exotel is not configured.',
      };
    }

    try {
      const toNumber = this.formatPhoneNumber(params.to);
      const callerId = params.callerId || this.config.callerId;

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

      const response = await this.client.post('/Calls/connect.json', formData);

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
    if (!this.isConfigured()) {
      return { success: false, error: 'Exotel is not configured.' };
    }

    try {
      const response = await this.client.get(`/Calls/${callSid}.json`);

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
    if (!this.isConfigured()) {
      return { success: false, error: 'Exotel is not configured.' };
    }

    try {
      const toNumber = this.formatPhoneNumber(params.to);
      const senderId = params.senderId || process.env.EXOTEL_SMS_SENDER_ID || this.config.callerId;

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

      const response = await this.client.post('/Sms/send.json', formData);

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
    if (!this.isConfigured()) {
      return { success: false, error: 'Exotel is not configured.' };
    }

    try {
      const response = await this.client.get('.json');

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
  isWhatsAppConfigured(): boolean {
    return !!(
      this.config.accountSid &&
      this.config.apiKey &&
      this.config.apiToken &&
      this.config.whatsappNumber
    );
  }

  /**
   * Send WhatsApp message via Exotel
   * Documentation: https://developer.exotel.com/api/#whatsapp-send-message
   */
  async sendWhatsApp(params: SendWhatsAppParams): Promise<WhatsAppResponse> {
    if (!this.isWhatsAppConfigured()) {
      return {
        success: false,
        error: 'Exotel WhatsApp is not configured. Please set EXOTEL_WHATSAPP_NUMBER.',
      };
    }

    try {
      const toNumber = this.formatPhoneNumber(params.to);

      // Exotel WhatsApp API endpoint
      const whatsappUrl = `https://${this.config.subdomain}/v2/accounts/${this.config.accountSid}/messages`;

      const payload: any = {
        from: this.config.whatsappNumber,
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
          username: this.config.apiKey,
          password: this.config.apiToken,
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
    if (!this.isWhatsAppConfigured()) {
      return {
        success: false,
        error: 'Exotel WhatsApp is not configured.',
      };
    }

    try {
      const toNumber = this.formatPhoneNumber(params.to);
      const whatsappUrl = `https://${this.config.subdomain}/v2/accounts/${this.config.accountSid}/messages`;

      const payload = {
        from: this.config.whatsappNumber,
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
          username: this.config.apiKey,
          password: this.config.apiToken,
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
}

// Export singleton instance
export const exotelService = new ExotelService();
export default exotelService;
