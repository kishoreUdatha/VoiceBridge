/**
 * Plivo Telephony Provider
 * Adapter for Plivo Voice API with AI conversation support
 */

import * as plivo from 'plivo';
import { config } from '../../../config';
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

export class PlivoProvider implements ITelephonyProvider {
  readonly providerName: TelephonyProviderType = 'PLIVO';
  private client: plivo.Client | null = null;

  private getClient(): plivo.Client {
    if (!this.client) {
      const { authId, authToken } = config.plivo;
      if (authId && authToken) {
        this.client = new plivo.Client(authId, authToken);
      } else {
        throw new Error('Plivo credentials not configured');
      }
    }
    return this.client;
  }

  async isConfigured(): Promise<boolean> {
    const { authId, authToken } = config.plivo;
    return !!(authId && authToken);
  }

  async getConfig(): Promise<ProviderConfig> {
    try {
      if (!(await this.isConfigured())) {
        return { isConfigured: false };
      }

      const account = await this.getClient().accounts.get(config.plivo.authId!);
      return {
        isConfigured: true,
        balance: parseFloat(account.cashCredits || '0'),
        accountName: account.name,
      };
    } catch (error) {
      console.error('[Plivo] Failed to get config:', error);
      return { isConfigured: false };
    }
  }

  formatPhoneNumber(phone: string): string {
    // Remove spaces, dashes, and parentheses
    let formatted = phone.replace(/[\s\-\(\)]/g, '');

    // Remove leading + if present (Plivo doesn't want +)
    if (formatted.startsWith('+')) {
      formatted = formatted.substring(1);
    }

    // If starts with 0, assume India and add 91
    if (formatted.startsWith('0')) {
      formatted = '91' + formatted.substring(1);
    }

    // If no country code (10 digits), assume India
    if (formatted.length === 10) {
      formatted = '91' + formatted;
    }

    return formatted;
  }

  async makeCall(params: MakeCallParams): Promise<CallResult> {
    try {
      const fromNumber = this.formatPhoneNumber(params.from);
      const toNumber = this.formatPhoneNumber(params.to);

      const baseUrl = config.baseUrl || process.env.API_BASE_URL || 'http://localhost:3001';
      const answerUrl = params.answerUrl || `${baseUrl}/api/telephony/plivo/answer`;
      const statusCallback = params.statusCallback || `${baseUrl}/api/telephony/plivo/status`;

      console.log(`[Plivo] Making call from ${fromNumber} to ${toNumber}`);

      const response = await this.getClient().calls.create(
        fromNumber,
        toNumber,
        answerUrl,
        {
          answerMethod: 'POST',
          hangupUrl: statusCallback,
          hangupMethod: 'POST',
          fallbackUrl: answerUrl,
          fallbackMethod: 'POST',
          ringTimeout: params.timeout || 30,
          timeLimit: params.timeLimit || 3600,
          record: params.record ?? true,
          recordingCallbackUrl: `${baseUrl}/api/telephony/plivo/recording`,
          recordingCallbackMethod: 'POST',
        }
      );

      // Handle response - Plivo returns requestUuid
      const callId = Array.isArray(response.requestUuid)
        ? response.requestUuid[0]
        : response.requestUuid;

      console.log(`[Plivo] Call initiated: ${callId}`);

      return {
        success: true,
        callId,
        status: 'queued',
        provider: 'PLIVO',
        data: response,
      };
    } catch (error: any) {
      console.error('[Plivo] makeCall error:', error.message);
      return {
        success: false,
        error: error.message || 'Failed to initiate call',
        provider: 'PLIVO',
      };
    }
  }

  async endCall(callId: string): Promise<EndCallResult> {
    try {
      await this.getClient().calls.hangup(callId);
      console.log(`[Plivo] Call ended: ${callId}`);
      return { success: true };
    } catch (error: any) {
      console.error('[Plivo] endCall error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async getCallStatus(callId: string): Promise<CallStatus | null> {
    try {
      const call = await this.getClient().calls.get(callId);
      return {
        callId: call.callUuid,
        status: this.mapStatus(call.callState || call.hangupCause),
        duration: parseInt(call.billDuration || '0'),
        recordingUrl: call.recordingUrl,
        from: call.fromNumber,
        to: call.toNumber,
        direction: call.callDirection?.toLowerCase() === 'inbound' ? 'inbound' : 'outbound',
      };
    } catch (error: any) {
      console.error('[Plivo] getCallStatus error:', error.message);
      return null;
    }
  }

  parseWebhook(body: any): CallStatus {
    return {
      callId: body.CallUUID || body.RequestUUID,
      status: this.mapStatus(body.CallStatus || body.Event),
      duration: body.Duration ? parseInt(body.Duration) : undefined,
      recordingUrl: body.RecordUrl || body.RecordingUrl,
      from: body.From,
      to: body.To,
      direction: body.Direction?.toLowerCase() === 'inbound' ? 'inbound' : 'outbound',
    };
  }

  private mapStatus(plivoStatus: string): CallStatus['status'] {
    const statusMap: Record<string, CallStatus['status']> = {
      'queued': 'queued',
      'ringing': 'ringing',
      'in-progress': 'in-progress',
      'completed': 'completed',
      'busy': 'busy',
      'failed': 'failed',
      'no-answer': 'no-answer',
      'cancel': 'canceled',
      'hangup': 'completed',
      'answered': 'in-progress',
    };
    return statusMap[plivoStatus?.toLowerCase()] || 'failed';
  }

  /**
   * Generate Plivo XML response for call handling (legacy)
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
    const baseUrl = config.baseUrl || process.env.API_BASE_URL || 'http://localhost:3001';

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
   * Parse speech/transcription webhook data from Plivo
   */
  parseSpeechWebhook(body: any): SpeechInputResult {
    return {
      text: body.Speech || body.TranscriptionText || '',
      confidence: parseFloat(body.Confidence || '0.9'),
      language: body.Language || 'en-IN',
      isFinal: body.IsFinal !== 'false',
    };
  }

  /**
   * Generate Plivo XML response
   */
  generateXML(params: XMLGeneratorParams): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n';

    // Play audio URL first if provided
    if (params.playUrl) {
      xml += `  <Play>${params.playUrl}</Play>\n`;
    }

    // Speak text
    if (params.sayText) {
      const voice = params.speechLanguage?.startsWith('hi') ? 'Polly.Aditi' : 'Polly.Aditi';
      xml += `  <Speak voice="${voice}" language="${params.speechLanguage || 'en-IN'}">${this.escapeXml(params.sayText)}</Speak>\n`;
    }

    // GetInput for speech recognition (Plivo's speech-to-text)
    if (params.speechInput && params.speechAction) {
      xml += `  <GetInput action="${params.speechAction}" method="POST" `;
      xml += `inputType="speech" executionTimeout="${params.gatherTimeout || 5}" `;
      xml += `language="${params.speechLanguage || 'en-IN'}" log="true">\n`;
      xml += `  </GetInput>\n`;
    }

    // GetDigits for DTMF input
    if (params.gatherInput && params.gatherAction && !params.speechInput) {
      xml += `  <GetDigits action="${params.gatherAction}" method="POST" timeout="${params.gatherTimeout || 10}" retries="1">\n`;
      xml += `  </GetDigits>\n`;
    }

    // Stream for bidirectional audio (Plivo Stream)
    if (params.streamUrl) {
      xml += `  <Stream bidirectional="true" keepCallAlive="true">${params.streamUrl}</Stream>\n`;
    }

    // Dial to transfer
    if (params.dialNumber) {
      const fromNumber = config.plivo.phoneNumber || '';
      xml += `  <Dial callerId="${fromNumber}">\n`;
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
      xml += `  <Speak voice="${voice}" language="${params.language || 'en-IN'}">${this.escapeXml(params.responseText)}</Speak>\n`;
    }

    // Handle transfer
    if (params.shouldTransfer && params.transferTo) {
      const voice = this.mapVoiceId(params.voiceId, params.language);
      xml += `  <Speak voice="${voice}">Please hold while I transfer you.</Speak>\n`;
      const fromNumber = config.plivo.phoneNumber || '';
      xml += `  <Dial callerId="${fromNumber}" timeout="30">\n`;
      xml += `    <Number>${params.transferTo}</Number>\n`;
      xml += `  </Dial>\n`;
    }

    // Handle end
    if (params.shouldEnd) {
      xml += `  <Hangup/>\n`;
    } else if (!params.shouldTransfer) {
      // Continue conversation - gather next speech input
      const speechAction = `${params.baseUrl}/api/telephony/voice/speech/${params.callId}`;
      xml += `  <GetInput action="${speechAction}" method="POST" `;
      xml += `inputType="speech dtmf" executionTimeout="5" `;
      xml += `language="${params.language || 'en-IN'}" log="true">\n`;
      xml += `  </GetInput>\n`;
      // Fallback if no input
      const voice = this.mapVoiceId(params.voiceId, params.language);
      xml += `  <Speak voice="${voice}">I didn't hear anything. Are you still there?</Speak>\n`;
      xml += `  <Redirect method="POST">${speechAction}</Redirect>\n`;
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

    xml += `  <GetInput action="${speechAction}" method="POST" `;
    xml += `inputType="speech dtmf" executionTimeout="${params.timeout || 5}" `;
    xml += `language="${params.language || 'en-IN'}" log="true">\n`;

    if (params.promptAudioUrl) {
      xml += `    <Play>${params.promptAudioUrl}</Play>\n`;
    } else if (params.promptText) {
      xml += `    <Speak voice="${voice}" language="${params.language || 'en-IN'}">${this.escapeXml(params.promptText)}</Speak>\n`;
    }

    xml += `  </GetInput>\n`;
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
      xml += `  <Speak voice="${voice}" language="${params.language || 'en-IN'}">${this.escapeXml(params.greeting)}</Speak>\n`;
    }

    // Start bidirectional stream (Plivo Stream API)
    xml += `  <Stream bidirectional="true" keepCallAlive="true" `;
    xml += `contentType="audio/x-l16;rate=8000" audioTrack="both">${params.streamUrl}</Stream>\n`;

    xml += '</Response>';
    return xml;
  }

  /**
   * Get webhook URLs for Plivo
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
   * Map voice ID to Plivo-compatible voice
   */
  private mapVoiceId(voiceId?: string, language?: string): string {
    // Plivo supports Polly voices
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

export const plivoProvider = new PlivoProvider();
