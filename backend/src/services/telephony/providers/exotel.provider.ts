/**
 * Exotel Telephony Provider
 * Adapter for Exotel Voice API with AI conversation support
 */

import axios, { AxiosInstance } from 'axios';
import {
  ITelephonyProvider,
  TelephonyProviderType,
  MakeCallParams,
  AICallParams,
  CallResult,
  CallStatus,
  EndCallResult,
  ProviderConfig,
  SpeechInputResult,
  XMLGeneratorParams,
} from '../telephony.types';

interface ExotelConfig {
  accountSid: string;
  apiKey: string;
  apiToken: string;
  subdomain: string;
}

export class ExotelProvider implements ITelephonyProvider {
  readonly providerName: TelephonyProviderType = 'EXOTEL';
  private client: AxiosInstance | null = null;
  private config: ExotelConfig | null = null;

  constructor() {
    this.loadConfig();
  }

  private loadConfig(): void {
    const accountSid = process.env.EXOTEL_ACCOUNT_SID || '';
    const apiKey = process.env.EXOTEL_API_KEY || '';
    const apiToken = process.env.EXOTEL_API_TOKEN || '';
    const subdomain = process.env.EXOTEL_SUBDOMAIN || 'api.exotel.com';

    if (accountSid && apiKey && apiToken) {
      this.config = { accountSid, apiKey, apiToken, subdomain };
      this.initializeClient();
    }
  }

  private initializeClient(): void {
    if (!this.config) return;

    const baseUrl = `https://${this.config.subdomain}/v1/Accounts/${this.config.accountSid}`;

    this.client = axios.create({
      baseURL: baseUrl,
      auth: {
        username: this.config.apiKey,
        password: this.config.apiToken,
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
  }

  async isConfigured(): Promise<boolean> {
    return !!(
      this.config?.accountSid &&
      this.config?.apiKey &&
      this.config?.apiToken
    );
  }

  async getConfig(): Promise<ProviderConfig> {
    try {
      if (!(await this.isConfigured())) {
        return { isConfigured: false };
      }

      const response = await this.client!.get('.json');
      if (response.data?.Account) {
        return {
          isConfigured: true,
          balance: parseFloat(response.data.Account.Balance || '0'),
          accountName: response.data.Account.FriendlyName || response.data.Account.Sid,
        };
      }
      return { isConfigured: true };
    } catch (error) {
      console.error('[Exotel] Failed to get config:', error);
      return { isConfigured: false };
    }
  }

  formatPhoneNumber(phone: string): string {
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

  async makeCall(params: MakeCallParams): Promise<CallResult> {
    if (!(await this.isConfigured())) {
      return {
        success: false,
        error: 'Exotel is not configured',
        provider: 'EXOTEL',
      };
    }

    try {
      const fromNumber = this.formatPhoneNumber(params.from);
      const toNumber = this.formatPhoneNumber(params.to);

      const baseUrl = process.env.API_BASE_URL || process.env.BACKEND_URL || 'http://localhost:3001';
      const answerUrl = params.answerUrl || `${baseUrl}/api/telephony/exotel/answer`;
      const statusCallback = params.statusCallback || `${baseUrl}/api/telephony/exotel/status`;

      console.log(`[Exotel] Making call from ${fromNumber} to ${toNumber}`);

      const formData = new URLSearchParams();
      formData.append('From', toNumber);  // Customer to call
      formData.append('CallerId', fromNumber);  // What customer sees
      formData.append('Url', answerUrl);

      if (statusCallback) {
        formData.append('StatusCallback', statusCallback);
      }

      if (params.timeLimit) {
        formData.append('TimeLimit', params.timeLimit.toString());
      }

      if (params.timeout) {
        formData.append('TimeOut', params.timeout.toString());
      }

      // Recording options
      if (params.record !== false) {
        formData.append('Record', 'true');
        formData.append('RecordingChannels', params.recordingChannels || 'dual');
      }

      if (params.customData) {
        formData.append('CustomField', JSON.stringify(params.customData));
      }

      const response = await this.client!.post('/Calls/connect.json', formData);

      if (response.data?.Call) {
        console.log(`[Exotel] Call initiated: ${response.data.Call.Sid}`);
        return {
          success: true,
          callId: response.data.Call.Sid,
          status: response.data.Call.Status,
          provider: 'EXOTEL',
          data: response.data.Call,
        };
      }

      return {
        success: false,
        error: 'Unexpected response from Exotel',
        provider: 'EXOTEL',
        data: response.data,
      };
    } catch (error: any) {
      console.error('[Exotel] makeCall error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.RestException?.Message || error.message,
        provider: 'EXOTEL',
      };
    }
  }

  async endCall(callId: string): Promise<EndCallResult> {
    // Exotel doesn't have a direct hangup API for most call types
    // The call will end naturally or via webhook control
    console.log(`[Exotel] End call requested: ${callId}`);
    return { success: true };
  }

  async getCallStatus(callId: string): Promise<CallStatus | null> {
    if (!(await this.isConfigured())) {
      return null;
    }

    try {
      const response = await this.client!.get(`/Calls/${callId}.json`);

      if (response.data?.Call) {
        const call = response.data.Call;
        return {
          callId: call.Sid,
          status: this.mapStatus(call.Status),
          duration: call.Duration ? parseInt(call.Duration) : undefined,
          recordingUrl: call.RecordingUrl,
          from: call.From,
          to: call.To,
          direction: call.Direction?.toLowerCase() === 'inbound' ? 'inbound' : 'outbound',
        };
      }
      return null;
    } catch (error: any) {
      console.error('[Exotel] getCallStatus error:', error.message);
      return null;
    }
  }

  parseWebhook(body: any): CallStatus {
    return {
      callId: body.CallSid || body.Sid,
      status: this.mapStatus(body.Status || body.CallStatus),
      duration: body.Duration ? parseInt(body.Duration) : undefined,
      recordingUrl: body.RecordingUrl,
      from: body.From,
      to: body.To,
      direction: body.Direction?.toLowerCase() === 'inbound' ? 'inbound' : 'outbound',
    };
  }

  private mapStatus(exotelStatus: string): CallStatus['status'] {
    const statusMap: Record<string, CallStatus['status']> = {
      'queued': 'queued',
      'ringing': 'ringing',
      'in-progress': 'in-progress',
      'completed': 'completed',
      'busy': 'busy',
      'failed': 'failed',
      'no-answer': 'no-answer',
      'canceled': 'canceled',
    };
    return statusMap[exotelStatus?.toLowerCase()] || 'failed';
  }

  /**
   * Generate ExoML response for call handling (legacy)
   */
  generateAnswerXml(params: {
    sayText?: string;
    playUrl?: string;
    gatherInput?: boolean;
    gatherAction?: string;
  }): string {
    return this.generateXML(params);
  }

  // ==================== AI METHODS ====================

  /**
   * Make an AI-powered outbound call
   */
  async makeAICall(params: AICallParams): Promise<CallResult> {
    const baseUrl = process.env.API_BASE_URL || process.env.BACKEND_URL || 'http://localhost:3001';

    // Use AI-specific answer URL that triggers the voice bot flow
    const answerUrl = `${baseUrl}/api/telephony/voice/ai-answer/${params.agentId}`;
    const statusCallback = `${baseUrl}/api/telephony/voice/status`;

    return this.makeCall({
      ...params,
      answerUrl,
      statusCallback,
      customData: {
        ...params.customData,
        agentId: params.agentId,
        leadId: params.leadId,
        isAICall: true,
      },
    });
  }

  /**
   * Parse speech/transcription webhook data from Exotel
   */
  parseSpeechWebhook(body: any): SpeechInputResult {
    return {
      text: body.TranscriptionText || body.SpeechResult || '',
      confidence: parseFloat(body.Confidence || '0.9'),
      language: body.Language || 'en-IN',
      isFinal: body.IsFinal !== 'false',
    };
  }

  /**
   * Generate XML/ExoML response
   */
  generateXML(params: XMLGeneratorParams): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n';

    // Play audio URL first if provided
    if (params.playUrl) {
      xml += `  <Play>${params.playUrl}</Play>\n`;
    }

    // Say text
    if (params.sayText) {
      xml += `  <Say voice="Polly.Aditi">${this.escapeXml(params.sayText)}</Say>\n`;
    }

    // Gather speech input
    if (params.speechInput && params.speechAction) {
      xml += `  <Gather input="speech" action="${params.speechAction}" method="POST" `;
      xml += `timeout="${params.gatherTimeout || 5}" language="${params.speechLanguage || 'en-IN'}">\n`;
      xml += `  </Gather>\n`;
    }

    // Gather DTMF input
    if (params.gatherInput && params.gatherAction && !params.speechInput) {
      xml += `  <Gather action="${params.gatherAction}" method="POST" timeout="${params.gatherTimeout || 10}" numDigits="1">\n`;
      xml += `  </Gather>\n`;
    }

    // Stream for bidirectional audio
    if (params.streamUrl) {
      xml += `  <Stream url="${params.streamUrl}" />\n`;
    }

    // Dial to transfer
    if (params.dialNumber) {
      xml += `  <Dial callerId="${this.config?.accountSid || ''}">\n`;
      xml += `    <Number>${params.dialNumber}</Number>\n`;
      xml += `  </Dial>\n`;
    }

    // Hangup
    if (params.hangup) {
      xml += `  <Hangup/>\n`;
    }

    xml += '</Response>';
    return xml;
  }

  /**
   * Generate XML for AI conversation response
   */
  generateAIResponseXML(params: {
    responseText: string;
    voiceId?: string;
    language?: string;
    callId: string;
    baseUrl: string;
    shouldEnd?: boolean;
    shouldTransfer?: boolean;
    transferTo?: string;
    playAudioUrl?: string;
  }): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n';

    // Play pre-generated audio or use TTS
    if (params.playAudioUrl) {
      xml += `  <Play>${params.playAudioUrl}</Play>\n`;
    } else if (params.responseText) {
      const voice = this.mapVoiceId(params.voiceId, params.language);
      xml += `  <Say voice="${voice}">${this.escapeXml(params.responseText)}</Say>\n`;
    }

    // Handle transfer
    if (params.shouldTransfer && params.transferTo) {
      xml += `  <Say voice="Polly.Aditi">Please hold while I transfer you.</Say>\n`;
      xml += `  <Dial callerId="${this.config?.accountSid || ''}" timeout="30">\n`;
      xml += `    <Number>${params.transferTo}</Number>\n`;
      xml += `  </Dial>\n`;
    }

    // Handle end
    if (params.shouldEnd) {
      xml += `  <Hangup/>\n`;
    } else if (!params.shouldTransfer) {
      // Continue conversation - gather next speech input
      const speechAction = `${params.baseUrl}/api/telephony/voice/speech/${params.callId}`;
      xml += `  <Gather input="speech dtmf" action="${speechAction}" method="POST" `;
      xml += `timeout="5" language="${params.language || 'en-IN'}">\n`;
      xml += `  </Gather>\n`;
      // Fallback if no input
      xml += `  <Say voice="Polly.Aditi">I didn't hear anything. Are you still there?</Say>\n`;
      xml += `  <Redirect>${speechAction}</Redirect>\n`;
    }

    xml += '</Response>';
    return xml;
  }

  /**
   * Generate XML for gathering speech input
   */
  generateGatherSpeechXML(params: {
    promptText?: string;
    promptAudioUrl?: string;
    callId: string;
    baseUrl: string;
    language?: string;
    voiceId?: string;
    timeout?: number;
  }): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n';

    const speechAction = `${params.baseUrl}/api/telephony/voice/speech/${params.callId}`;
    const voice = this.mapVoiceId(params.voiceId, params.language);

    xml += `  <Gather input="speech dtmf" action="${speechAction}" method="POST" `;
    xml += `timeout="${params.timeout || 5}" language="${params.language || 'en-IN'}">\n`;

    if (params.promptAudioUrl) {
      xml += `    <Play>${params.promptAudioUrl}</Play>\n`;
    } else if (params.promptText) {
      xml += `    <Say voice="${voice}">${this.escapeXml(params.promptText)}</Say>\n`;
    }

    xml += `  </Gather>\n`;
    xml += '</Response>';
    return xml;
  }

  /**
   * Generate XML for bidirectional audio streaming (for realtime AI)
   */
  generateStreamXML(params: {
    streamUrl: string;
    callId: string;
    greeting?: string;
    voiceId?: string;
    language?: string;
  }): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n';

    // Say greeting if provided
    if (params.greeting) {
      const voice = this.mapVoiceId(params.voiceId, params.language);
      xml += `  <Say voice="${voice}">${this.escapeXml(params.greeting)}</Say>\n`;
    }

    // Start bidirectional stream
    xml += `  <Stream url="${params.streamUrl}" />\n`;

    xml += '</Response>';
    return xml;
  }

  /**
   * Get webhook URLs for Exotel
   */
  getWebhookUrls(baseUrl: string, callId: string): {
    answer: string;
    status: string;
    speech: string;
    stream: string;
    recording: string;
  } {
    return {
      answer: `${baseUrl}/api/telephony/voice/answer/${callId}`,
      status: `${baseUrl}/api/telephony/voice/status`,
      speech: `${baseUrl}/api/telephony/voice/speech/${callId}`,
      stream: `${baseUrl}/api/telephony/voice/stream/${callId}`,
      recording: `${baseUrl}/api/telephony/voice/recording`,
    };
  }

  /**
   * Map voice ID to Exotel-compatible voice
   */
  private mapVoiceId(voiceId?: string, language?: string): string {
    // Exotel supports Polly voices
    if (voiceId?.startsWith('Polly.')) {
      return voiceId;
    }

    // Map language to appropriate Polly voice
    const voiceMap: Record<string, string> = {
      'hi-IN': 'Polly.Aditi',
      'en-IN': 'Polly.Aditi',
      'en-US': 'Polly.Joanna',
      'te-IN': 'Polly.Aditi',
      'ta-IN': 'Polly.Aditi',
      'kn-IN': 'Polly.Aditi',
      'ml-IN': 'Polly.Aditi',
    };

    return voiceMap[language || 'en-IN'] || 'Polly.Aditi';
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

export const exotelProvider = new ExotelProvider();
