/**
 * Telephony Service
 * Provider-agnostic telephony abstraction layer
 *
 * Provider is determined by the phone number assigned to the agent.
 * Credentials are loaded from platform .env file.
 *
 * Flow:
 * 1. Phone number has provider (PLIVO/EXOTEL)
 * 2. Phone number is assigned to agent
 * 3. When making call → get phone's provider → use platform credentials
 */

import { prisma } from '../../config/database';
import { config } from '../../config';
import {
  ITelephonyProvider,
  TelephonyProviderType,
  MakeCallParams,
  AICallParams,
  CallResult,
  CallStatus,
  EndCallResult,
  SpeechInputResult,
  XMLGeneratorParams,
} from './telephony.types';
import { plivoProvider } from './providers/plivo.provider';
import { exotelProvider } from './providers/exotel.provider';

class TelephonyService {
  private providers: Map<TelephonyProviderType, ITelephonyProvider> = new Map();

  constructor() {
    // Register available providers (credentials from platform .env)
    this.providers.set('PLIVO', plivoProvider);
    this.providers.set('EXOTEL', exotelProvider);
  }

  /**
   * Get provider instance by name
   */
  getProvider(providerName: TelephonyProviderType): ITelephonyProvider {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Unknown telephony provider: ${providerName}`);
    }
    return provider;
  }

  /**
   * Get provider for an AI agent based on assigned phone number
   * This is the PRIMARY method for determining provider
   */
  async getProviderForAgent(agentId: string): Promise<{
    provider: ITelephonyProvider | null;
    phoneNumber: string | null;
    providerName: TelephonyProviderType | null;
  }> {
    try {
      // Find phone number assigned to this agent
      const phoneRecord = await prisma.phoneNumber.findFirst({
        where: {
          assignedToAgentId: agentId,
          status: 'AVAILABLE',
        },
      });

      if (!phoneRecord) {
        console.log(`[Telephony] No phone number assigned to agent ${agentId}`);
        return { provider: null, phoneNumber: null, providerName: null };
      }

      // Get provider based on phone number's provider field
      const providerName = (phoneRecord.provider || 'EXOTEL') as TelephonyProviderType;
      const provider = this.providers.get(providerName);

      if (!provider) {
        console.error(`[Telephony] Unknown provider ${providerName} for phone ${phoneRecord.number}`);
        return { provider: null, phoneNumber: phoneRecord.number, providerName: null };
      }

      // Check if provider is configured
      if (!(await provider.isConfigured())) {
        console.error(`[Telephony] Provider ${providerName} is not configured in .env`);
        return { provider: null, phoneNumber: phoneRecord.number, providerName };
      }

      console.log(`[Telephony] Agent ${agentId} using ${providerName} with number ${phoneRecord.number}`);
      return { provider, phoneNumber: phoneRecord.number, providerName };
    } catch (error) {
      console.error('[Telephony] Error getting provider for agent:', error);
      return { provider: null, phoneNumber: null, providerName: null };
    }
  }

  /**
   * Get provider for a specific phone number from database
   */
  async getProviderForNumber(phoneNumber: string): Promise<ITelephonyProvider | null> {
    try {
      // Clean the phone number for lookup
      const cleanNumber = phoneNumber.replace(/[\s\-\(\)\+]/g, '');

      // Find phone number in database
      const phoneRecord = await prisma.phoneNumber.findFirst({
        where: {
          OR: [
            { number: { contains: cleanNumber.slice(-10) } },
            { number: phoneNumber },
            { displayNumber: phoneNumber },
          ],
        },
      });

      if (phoneRecord?.provider) {
        const providerName = phoneRecord.provider as TelephonyProviderType;
        const provider = this.getProvider(providerName);

        if (await provider.isConfigured()) {
          console.log(`[Telephony] Found provider ${providerName} for number ${phoneNumber}`);
          return provider;
        }
      }

      // Fallback to default
      return await this.getDefaultProvider();
    } catch (error) {
      console.error('[Telephony] Error getting provider for number:', error);
      return await this.getDefaultProvider();
    }
  }

  /**
   * Get the default provider (first configured one)
   */
  async getDefaultProvider(): Promise<ITelephonyProvider | null> {
    // Try Exotel first (more common in India)
    if (await exotelProvider.isConfigured()) {
      console.log('[Telephony] Using default provider: EXOTEL');
      return exotelProvider;
    }

    // Then try Plivo
    if (await plivoProvider.isConfigured()) {
      console.log('[Telephony] Using default provider: PLIVO');
      return plivoProvider;
    }

    console.error('[Telephony] No telephony provider configured in .env');
    return null;
  }

  /**
   * Get fallback provider name from env (used for webhooks)
   */
  getDefaultProviderName(): TelephonyProviderType {
    const envProvider = (config.voiceProvider || process.env.VOICE_PROVIDER || 'exotel').toUpperCase();
    if (envProvider === 'PLIVO' || envProvider === 'EXOTEL') {
      return envProvider as TelephonyProviderType;
    }
    return 'EXOTEL';
  }

  /**
   * Get provider for a user based on their assigned phone number
   */
  async getProviderForUser(userId: string, organizationId: string): Promise<{
    provider: ITelephonyProvider | null;
    phoneNumber: string | null;
  }> {
    try {
      // Get user's assigned phone number
      const assignedNumber = await prisma.phoneNumber.findFirst({
        where: {
          organizationId,
          assignedToUserId: userId,
          status: 'AVAILABLE',
        },
      });

      if (assignedNumber) {
        const providerName = (assignedNumber.provider || 'PLIVO') as TelephonyProviderType;
        return {
          provider: this.getProvider(providerName),
          phoneNumber: assignedNumber.number,
        };
      }

      // Fall back to any available number in the organization
      const orgNumber = await prisma.phoneNumber.findFirst({
        where: {
          organizationId,
          status: 'AVAILABLE',
          assignedToUserId: null,
          assignedToAgentId: null,
        },
        orderBy: { createdAt: 'asc' },
      });

      if (orgNumber) {
        const providerName = (orgNumber.provider || 'PLIVO') as TelephonyProviderType;
        return {
          provider: this.getProvider(providerName),
          phoneNumber: orgNumber.number,
        };
      }

      // No phone number found
      return { provider: null, phoneNumber: null };
    } catch (error) {
      console.error('[Telephony] Error getting provider for user:', error);
      return { provider: null, phoneNumber: null };
    }
  }

  /**
   * Make an outbound call
   * Automatically selects the provider based on the 'from' phone number
   */
  async makeCall(params: {
    from: string;
    to: string;
    userId?: string;
    organizationId?: string;
    answerUrl?: string;
    statusCallback?: string;
    record?: boolean;
    customData?: Record<string, any>;
  }): Promise<CallResult> {
    // Get provider based on the 'from' number
    const provider = await this.getProviderForNumber(params.from);

    if (!provider) {
      return {
        success: false,
        error: 'No telephony provider configured for this number',
        provider: 'PLIVO', // default
      };
    }

    // Make the call
    return provider.makeCall({
      from: params.from,
      to: params.to,
      answerUrl: params.answerUrl,
      statusCallback: params.statusCallback,
      record: params.record ?? true,
      customData: params.customData,
    });
  }

  /**
   * Make a call using user's assigned number
   * This is the main method for softphone calls
   */
  async makeCallForUser(params: {
    userId: string;
    organizationId: string;
    to: string;
    answerUrl?: string;
    statusCallback?: string;
    record?: boolean;
    customData?: Record<string, any>;
  }): Promise<CallResult> {
    // Get provider and phone number for user
    const { provider, phoneNumber } = await this.getProviderForUser(
      params.userId,
      params.organizationId
    );

    if (!provider || !phoneNumber) {
      return {
        success: false,
        error: 'No phone number assigned. Please contact your admin to assign a phone number.',
        provider: 'PLIVO',
      };
    }

    console.log(`[Telephony] Making call for user ${params.userId} using ${provider.providerName} from ${phoneNumber}`);

    // Make the call
    return provider.makeCall({
      from: phoneNumber,
      to: params.to,
      answerUrl: params.answerUrl,
      statusCallback: params.statusCallback,
      record: params.record ?? true,
      customData: params.customData,
    });
  }

  /**
   * End a call
   */
  async endCall(callId: string, provider: TelephonyProviderType): Promise<EndCallResult> {
    const providerInstance = this.getProvider(provider);
    return providerInstance.endCall(callId);
  }

  /**
   * Get call status
   */
  async getCallStatus(callId: string, provider: TelephonyProviderType): Promise<CallStatus | null> {
    const providerInstance = this.getProvider(provider);
    return providerInstance.getCallStatus(callId);
  }

  /**
   * Parse webhook from provider
   */
  parseWebhook(provider: TelephonyProviderType, body: any): CallStatus {
    const providerInstance = this.getProvider(provider);
    return providerInstance.parseWebhook(body);
  }

  /**
   * Check which providers are available
   */
  async getAvailableProviders(): Promise<TelephonyProviderType[]> {
    const available: TelephonyProviderType[] = [];

    if (await plivoProvider.isConfigured()) {
      available.push('PLIVO');
    }

    if (await exotelProvider.isConfigured()) {
      available.push('EXOTEL');
    }

    return available;
  }

  /**
   * Get status of all providers
   */
  async getProvidersStatus(): Promise<Record<TelephonyProviderType, { configured: boolean; balance?: number }>> {
    const [plivoConfig, exotelConfig] = await Promise.all([
      plivoProvider.getConfig(),
      exotelProvider.getConfig(),
    ]);

    return {
      PLIVO: {
        configured: plivoConfig.isConfigured,
        balance: plivoConfig.balance,
      },
      EXOTEL: {
        configured: exotelConfig.isConfigured,
        balance: exotelConfig.balance,
      },
      TWILIO: {
        configured: false, // Not implemented yet
      },
    };
  }

  // ==================== AI VOICE AGENT METHODS ====================

  /**
   * Make an AI-powered call using the agent's assigned phone number
   * Provider is determined by the phone number's provider field
   */
  async makeAICall(params: AICallParams): Promise<CallResult> {
    // Get provider based on agent's assigned phone number
    const { provider, phoneNumber, providerName } = await this.getProviderForAgent(params.agentId);

    if (!provider || !phoneNumber) {
      return {
        success: false,
        error: 'No phone number assigned to this agent. Please assign a phone number first.',
        provider: this.getDefaultProviderName(),
      };
    }

    console.log(`[Telephony] Making AI call via ${providerName} for agent ${params.agentId} from ${phoneNumber}`);

    // Use the assigned phone number as caller ID
    return provider.makeAICall({
      ...params,
      from: phoneNumber,
    });
  }

  /**
   * Generate XML response for AI conversation
   */
  generateAIResponseXML(
    provider: TelephonyProviderType,
    params: {
      responseText: string;
      voiceId?: string;
      language?: string;
      callId: string;
      baseUrl: string;
      shouldEnd?: boolean;
      shouldTransfer?: boolean;
      transferTo?: string;
      playAudioUrl?: string;
    }
  ): string {
    const providerInstance = this.getProvider(provider);
    return providerInstance.generateAIResponseXML(params);
  }

  /**
   * Generate XML for gathering speech input
   */
  generateGatherSpeechXML(
    provider: TelephonyProviderType,
    params: {
      promptText?: string;
      promptAudioUrl?: string;
      callId: string;
      baseUrl: string;
      language?: string;
      voiceId?: string;
      timeout?: number;
    }
  ): string {
    const providerInstance = this.getProvider(provider);
    return providerInstance.generateGatherSpeechXML(params);
  }

  /**
   * Generate XML for audio streaming
   */
  generateStreamXML(
    provider: TelephonyProviderType,
    params: {
      streamUrl: string;
      callId: string;
      greeting?: string;
      voiceId?: string;
      language?: string;
    }
  ): string {
    const providerInstance = this.getProvider(provider);
    return providerInstance.generateStreamXML(params);
  }

  /**
   * Generate generic XML response
   */
  generateXML(provider: TelephonyProviderType, params: XMLGeneratorParams): string {
    const providerInstance = this.getProvider(provider);
    return providerInstance.generateXML(params);
  }

  /**
   * Parse speech webhook from any provider
   */
  parseSpeechWebhook(provider: TelephonyProviderType, body: any): SpeechInputResult {
    const providerInstance = this.getProvider(provider);
    return providerInstance.parseSpeechWebhook(body);
  }

  /**
   * Get webhook URLs for a provider
   */
  getWebhookUrls(provider: TelephonyProviderType, baseUrl: string, callId: string) {
    const providerInstance = this.getProvider(provider);
    return providerInstance.getWebhookUrls(baseUrl, callId);
  }

  /**
   * Detect provider from webhook request
   * Useful for unified webhook endpoints
   */
  detectProviderFromWebhook(body: any, headers: Record<string, string>): TelephonyProviderType {
    // Exotel typically sends CallSid, ExotelSid
    if (body.CallSid || body.ExotelSid || headers['x-exotel-signature']) {
      return 'EXOTEL';
    }

    // Plivo sends CallUUID, RequestUUID
    if (body.CallUUID || body.RequestUUID || headers['x-plivo-signature']) {
      return 'PLIVO';
    }

    // Default to configured provider from env
    return this.getDefaultProviderName();
  }
}

// Export singleton instance
export const telephonyService = new TelephonyService();
export default telephonyService;
