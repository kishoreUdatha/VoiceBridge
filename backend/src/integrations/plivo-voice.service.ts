import * as plivo from 'plivo';
import { prisma } from '../config/database';
import OpenAI from 'openai';
import { config } from '../config';


// Plivo client initialization
const getPlivoClient = () => {
  const authId = process.env.PLIVO_AUTH_ID;
  const authToken = process.env.PLIVO_AUTH_TOKEN;

  if (!authId || !authToken) {
    throw new Error('Plivo credentials not configured');
  }

  return new (plivo.Client as any)(authId, authToken);
};

// Plivo XML Response helper
const plivoXML = new (plivo.Response as any)();

// India-specific voice configuration for Plivo
const PLIVO_INDIA_VOICES: Record<string, { voice: string; language: string }> = {
  'en-IN': { voice: 'Polly.Aditi', language: 'en-IN' },
  'hi-IN': { voice: 'Polly.Aditi', language: 'hi-IN' },
  'ta-IN': { voice: 'Polly.Aditi', language: 'ta-IN' },
  'te-IN': { voice: 'Polly.Aditi', language: 'te-IN' },
  'kn-IN': { voice: 'Polly.Aditi', language: 'kn-IN' },
  'ml-IN': { voice: 'Polly.Aditi', language: 'ml-IN' },
  'mr-IN': { voice: 'Polly.Aditi', language: 'mr-IN' },
  'bn-IN': { voice: 'Polly.Aditi', language: 'bn-IN' },
  'gu-IN': { voice: 'Polly.Aditi', language: 'gu-IN' },
  'pa-IN': { voice: 'Polly.Aditi', language: 'pa-IN' },
};

// India pricing (per minute in INR - approximate)
const PLIVO_INDIA_PRICING = {
  outbound: {
    mobile: 0.50,    // INR per minute
    landline: 0.40,  // INR per minute
  },
  inbound: {
    mobile: 0.30,    // INR per minute
    landline: 0.25,  // INR per minute
  },
  sms: {
    outbound: 0.20,  // INR per SMS
    inbound: 0.00,   // Free
  },
};

interface PlivoCallOptions {
  to: string;
  from?: string;
  answerUrl: string;
  hangupUrl?: string;
  callbackUrl?: string;
  callbackMethod?: string;
  ringTimeout?: number;
  machineDetection?: boolean;
}

interface PlivoSMSOptions {
  to: string;
  from?: string;
  message: string;
  url?: string;
  method?: string;
}

class PlivoVoiceService {
  private client: any;

  constructor() {
    try {
      this.client = getPlivoClient();
    } catch (error: unknown) {
      // Only warn if Plivo is the selected voice provider
      if (config.voiceProvider === 'plivo') {
        console.warn('Plivo not configured:', (error as Error).message);
      }
    }
  }

  // ==================== OUTBOUND CALLS ====================

  async makeCall(options: PlivoCallOptions): Promise<{
    success: boolean;
    callUuid?: string;
    requestUuid?: string;
    error?: string;
  }> {
    try {
      if (!this.client) {
        throw new Error('Plivo client not initialized');
      }

      const fromNumber = options.from || process.env.PLIVO_PHONE_NUMBER;
      if (!fromNumber) {
        throw new Error('Plivo phone number not configured');
      }

      const response = await this.client.calls.create(
        fromNumber,           // from
        options.to,           // to
        options.answerUrl,    // answer_url
        {
          answerMethod: 'POST',
          hangupUrl: options.hangupUrl,
          hangupMethod: 'POST',
          callbackUrl: options.callbackUrl,
          callbackMethod: options.callbackMethod || 'POST',
          ringTimeout: options.ringTimeout || 30,
          machineDetection: options.machineDetection ? 'true' : 'false',
        }
      );

      return {
        success: true,
        callUuid: Array.isArray(response) ? response[0] : (response as any).requestUuid,
        requestUuid: Array.isArray(response) ? response[0] : (response as any).requestUuid,
      };
    } catch (error) {
      console.error('Plivo call error:', error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  // ==================== CALL XML GENERATION ====================

  generateSpeakXML(text: string, language: string = 'en-IN'): string {
    const response = new (plivo.Response as any)();
    const voiceConfig = PLIVO_INDIA_VOICES[language] || PLIVO_INDIA_VOICES['en-IN'];

    response.addSpeak(text, {
      voice: voiceConfig.voice,
      language: voiceConfig.language,
    });

    return response.toXML();
  }

  generateGatherXML(options: {
    text: string;
    language?: string;
    action: string;
    method?: string;
    timeout?: number;
    numDigits?: number;
    inputType?: 'dtmf' | 'speech' | 'dtmf speech';
    speechEndTimeout?: number;
  }): string {
    const response = new (plivo.Response as any)();
    const voiceConfig = PLIVO_INDIA_VOICES[options.language || 'en-IN'] || PLIVO_INDIA_VOICES['en-IN'];

    const getDigits = response.addGetDigits({
      action: options.action,
      method: options.method || 'POST',
      timeout: options.timeout || 10,
      numDigits: options.numDigits || 1,
      inputType: options.inputType || 'dtmf speech',
      speechEndTimeout: options.speechEndTimeout || 2000,
      language: voiceConfig.language,
    });

    getDigits.addSpeak(options.text, {
      voice: voiceConfig.voice,
      language: voiceConfig.language,
    });

    return response.toXML();
  }

  generateTransferXML(options: {
    transferTo: string;
    callerName?: string;
    callbackUrl?: string;
    timeLimit?: number;
    timeout?: number;
  }): string {
    const response = new (plivo.Response as any)();

    response.addDial({
      callerId: process.env.PLIVO_PHONE_NUMBER,
      callerName: options.callerName || 'AI Agent',
      callbackUrl: options.callbackUrl,
      callbackMethod: 'POST',
      timeLimit: options.timeLimit || 3600,
      timeout: options.timeout || 30,
    }).addNumber(options.transferTo);

    return response.toXML();
  }

  generateHangupXML(message?: string, language: string = 'en-IN'): string {
    const response = new (plivo.Response as any)();

    if (message) {
      const voiceConfig = PLIVO_INDIA_VOICES[language] || PLIVO_INDIA_VOICES['en-IN'];
      response.addSpeak(message, {
        voice: voiceConfig.voice,
        language: voiceConfig.language,
      });
    }

    response.addHangup();
    return response.toXML();
  }

  // ==================== SMS ====================

  async sendSMS(options: PlivoSMSOptions): Promise<{
    success: boolean;
    messageUuid?: string;
    error?: string;
  }> {
    try {
      if (!this.client) {
        throw new Error('Plivo client not initialized');
      }

      const fromNumber = options.from || process.env.PLIVO_PHONE_NUMBER;
      if (!fromNumber) {
        throw new Error('Plivo phone number not configured');
      }

      const response = await this.client.messages.create(
        fromNumber,
        options.to,
        options.message,
        {
          url: options.url,
          method: options.method || 'POST',
        }
      );

      return {
        success: true,
        messageUuid: response.messageUuid?.[0],
      };
    } catch (error) {
      console.error('Plivo SMS error:', error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  // ==================== CALL MANAGEMENT ====================

  async getCallDetails(callUuid: string): Promise<any> {
    try {
      if (!this.client) {
        throw new Error('Plivo client not initialized');
      }

      return await this.client.calls.get(callUuid);
    } catch (error) {
      console.error('Error getting call details:', error);
      throw error;
    }
  }

  async hangupCall(callUuid: string): Promise<boolean> {
    try {
      if (!this.client) {
        throw new Error('Plivo client not initialized');
      }

      await this.client.calls.hangup(callUuid);
      return true;
    } catch (error) {
      console.error('Error hanging up call:', error);
      return false;
    }
  }

  async transferCall(callUuid: string, transferTo: string): Promise<boolean> {
    try {
      if (!this.client) {
        throw new Error('Plivo client not initialized');
      }

      await this.client.calls.transfer(callUuid, {
        legs: 'aleg',
        alegUrl: `${process.env.BASE_URL}/api/plivo/transfer/${callUuid}?to=${encodeURIComponent(transferTo)}`,
        alegMethod: 'POST',
        blegUrl: `${process.env.BASE_URL}/api/plivo/bleg/${callUuid}`,
        blegMethod: 'POST',
      });
      return true;
    } catch (error) {
      console.error('Error transferring call:', error);
      return false;
    }
  }

  // ==================== RECORDING ====================

  async startRecording(callUuid: string): Promise<{
    success: boolean;
    recordingId?: string;
    error?: string;
  }> {
    try {
      if (!this.client) {
        throw new Error('Plivo client not initialized');
      }

      const response = await this.client.calls.record(callUuid, {
        timeLimit: 3600,
        fileFormat: 'mp3',
        callbackUrl: `${process.env.BASE_URL}/api/plivo/webhook/recording`,
        callbackMethod: 'POST',
      });

      return {
        success: true,
        recordingId: response.recordingId,
      };
    } catch (error) {
      console.error('Error starting recording:', error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  async stopRecording(callUuid: string): Promise<boolean> {
    try {
      if (!this.client) {
        throw new Error('Plivo client not initialized');
      }

      await this.client.calls.stopRecording(callUuid, {});
      return true;
    } catch (error) {
      console.error('Error stopping recording:', error);
      return false;
    }
  }

  // ==================== PRICING ====================

  getCallPricing(type: 'mobile' | 'landline', direction: 'outbound' | 'inbound'): number {
    return PLIVO_INDIA_PRICING[direction][type];
  }

  getSMSPricing(direction: 'outbound' | 'inbound'): number {
    return PLIVO_INDIA_PRICING.sms[direction];
  }

  estimateCallCost(durationSeconds: number, type: 'mobile' | 'landline' = 'mobile'): number {
    const durationMinutes = Math.ceil(durationSeconds / 60);
    const ratePerMinute = this.getCallPricing(type, 'outbound');
    return durationMinutes * ratePerMinute;
  }

  // ==================== UTILITY ====================

  isIndianNumber(phone: string): boolean {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');

    // Check for Indian number patterns
    // +91XXXXXXXXXX, 91XXXXXXXXXX, 0XXXXXXXXXX, XXXXXXXXXX
    if (digits.startsWith('91') && digits.length === 12) return true;
    if (digits.startsWith('0') && digits.length === 11) return true;
    if (digits.length === 10) return true;

    return false;
  }

  formatIndianNumber(phone: string): string {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');

    // Normalize to +91 format
    if (digits.length === 10) {
      return `+91${digits}`;
    }
    if (digits.startsWith('0') && digits.length === 11) {
      return `+91${digits.substring(1)}`;
    }
    if (digits.startsWith('91') && digits.length === 12) {
      return `+${digits}`;
    }

    return phone;
  }

  // Get state from Indian phone number (based on prefix)
  getStateFromPhone(phone: string): string | null {
    const digits = phone.replace(/\D/g, '');
    const normalized = digits.startsWith('91') ? digits.substring(2) : digits.startsWith('0') ? digits.substring(1) : digits;

    if (normalized.length !== 10) return null;

    // Mobile prefixes by state (approximate)
    const prefix = normalized.substring(0, 2);
    const stateMap: Record<string, string> = {
      '70': 'Multiple',
      '72': 'Gujarat',
      '73': 'Maharashtra',
      '74': 'Karnataka',
      '75': 'Andhra Pradesh',
      '76': 'Kerala',
      '77': 'Tamil Nadu',
      '78': 'Delhi',
      '79': 'Maharashtra',
      '80': 'Karnataka',
      '81': 'Delhi',
      '82': 'Maharashtra',
      '83': 'West Bengal',
      '84': 'Uttar Pradesh',
      '85': 'Uttar Pradesh',
      '86': 'Telangana',
      '87': 'Rajasthan',
      '88': 'Punjab',
      '89': 'Bihar',
      '90': 'Multiple',
      '91': 'Multiple',
      '92': 'Multiple',
      '93': 'Gujarat',
      '94': 'Tamil Nadu',
      '95': 'Kerala',
      '96': 'Multiple',
      '97': 'Karnataka',
      '98': 'Delhi',
      '99': 'Delhi',
    };

    return stateMap[prefix] || null;
  }
}

export const plivoVoiceService = new PlivoVoiceService();
export default plivoVoiceService;
