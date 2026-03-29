import { config } from '../config';
import { plivoService } from '../integrations/plivo.service';
import { exotelService } from '../integrations/exotel.service';
import { CallType } from '@prisma/client';

interface SendSmsInput {
  to: string;
  message: string;
  leadId?: string;
  userId?: string;
}

interface SendWhatsAppInput {
  to: string;
  message: string;
  mediaUrl?: string;
  leadId?: string;
  userId: string;
}

interface MakeCallInput {
  to: string;
  leadId?: string;
  callerId: string;
  organizationId: string;
  callType?: CallType;
}

type Provider = 'plivo' | 'exotel';

/**
 * Unified Communication Service
 *
 * Provides a single interface for SMS, WhatsApp, and Voice calls
 * that automatically uses the configured provider (Plivo or Exotel)
 */
export class CommunicationService {
  private getSmsProvider(): Provider {
    return (config.smsProvider as Provider) || 'exotel';
  }

  private getVoiceProvider(): Provider {
    return (config.voiceProvider as Provider) || 'exotel';
  }

  /**
   * Check if SMS provider is configured
   */
  isSmsConfigured(): boolean {
    const provider = this.getSmsProvider();
    if (provider === 'plivo') {
      return plivoService.isConfigured();
    }
    return exotelService.isConfigured();
  }

  /**
   * Check if Voice provider is configured
   */
  isVoiceConfigured(): boolean {
    const provider = this.getVoiceProvider();
    if (provider === 'plivo') {
      return plivoService.isConfigured();
    }
    return exotelService.isConfigured();
  }

  /**
   * Get current provider info
   */
  getProviderInfo(): { sms: Provider; voice: Provider; whatsapp: Provider } {
    return {
      sms: this.getSmsProvider(),
      voice: this.getVoiceProvider(),
      whatsapp: 'exotel', // WhatsApp via Exotel
    };
  }

  // ==================== SMS ====================

  /**
   * Send SMS using configured provider
   */
  async sendSms(input: SendSmsInput) {
    const provider = this.getSmsProvider();

    if (provider === 'plivo') {
      if (!plivoService.isConfigured()) {
        throw new Error('Plivo is not configured');
      }
      return plivoService.sendSms(input);
    }

    // Default to Exotel
    if (!exotelService.isConfigured()) {
      throw new Error('Exotel is not configured');
    }
    return exotelService.sendSMS({ to: input.to, body: input.message });
  }

  /**
   * Send bulk SMS using configured provider
   */
  async sendBulkSms(recipients: Array<{ phone: string; message: string; leadId?: string }>, userId: string) {
    const provider = this.getSmsProvider();

    if (provider === 'plivo') {
      if (!plivoService.isConfigured()) {
        throw new Error('Plivo is not configured');
      }
      return plivoService.sendBulkSms(recipients, userId);
    }

    // Default to Exotel - send one by one
    if (!exotelService.isConfigured()) {
      throw new Error('Exotel is not configured');
    }

    const results = [];
    for (const recipient of recipients) {
      try {
        const result = await exotelService.sendSMS({ to: recipient.phone, body: recipient.message });
        results.push({ phone: recipient.phone, success: true, result });
      } catch (error) {
        results.push({ phone: recipient.phone, success: false, error });
      }
    }
    return results;
  }

  /**
   * Send SMS with fallback - tries primary provider, falls back to secondary
   */
  async sendSmsWithFallback(input: SendSmsInput) {
    const primary = this.getSmsProvider();
    const secondary: Provider = primary === 'exotel' ? 'plivo' : 'exotel';

    try {
      if (primary === 'plivo' && plivoService.isConfigured()) {
        return await plivoService.sendSms(input);
      } else if (primary === 'exotel' && exotelService.isConfigured()) {
        return await exotelService.sendSMS({ to: input.to, body: input.message });
      }
    } catch (primaryError) {
      console.error(`Primary provider (${primary}) failed:`, primaryError);

      // Try fallback
      try {
        if (secondary === 'plivo' && plivoService.isConfigured()) {
          console.log('Falling back to Plivo');
          return await plivoService.sendSms(input);
        } else if (secondary === 'exotel' && exotelService.isConfigured()) {
          console.log('Falling back to Exotel');
          return await exotelService.sendSMS({ to: input.to, body: input.message });
        }
      } catch (fallbackError) {
        console.error(`Fallback provider (${secondary}) also failed:`, fallbackError);
        throw fallbackError;
      }
    }

    throw new Error('No SMS provider is configured');
  }

  // ==================== WHATSAPP ====================

  /**
   * Send WhatsApp message (via Exotel)
   */
  async sendWhatsApp(input: SendWhatsAppInput) {
    if (!exotelService.isConfigured()) {
      throw new Error('Exotel is not configured for WhatsApp');
    }
    return exotelService.sendWhatsApp({ to: input.to, message: input.message });
  }

  // ==================== VOICE CALLS ====================

  /**
   * Make voice call using configured provider
   */
  async makeCall(input: MakeCallInput, callbackUrl: string) {
    const provider = this.getVoiceProvider();

    if (provider === 'plivo') {
      if (!plivoService.isConfigured()) {
        throw new Error('Plivo is not configured');
      }
      return plivoService.makeCall(input, callbackUrl);
    }

    // Default to Exotel
    if (!exotelService.isConfigured()) {
      throw new Error('Exotel is not configured');
    }
    return exotelService.makeCall({ to: input.to, callerId: input.callerId });
  }

  // ==================== PROVIDER COMPARISON ====================

  /**
   * Get pricing comparison (approximate) - Plivo vs Exotel
   */
  getPricingComparison(country: string = 'IN'): {
    plivo: { sms: string; voice: string };
    exotel: { sms: string; voice: string };
    recommendation: string;
  } {
    const pricing: Record<string, { plivo: { sms: number; voice: number }; exotel: { sms: number; voice: number } }> = {
      IN: {
        plivo: { sms: 0.0085, voice: 0.0120 },
        exotel: { sms: 0.0070, voice: 0.0100 },
      },
    };

    const countryPricing = pricing[country] || pricing['IN'];

    return {
      plivo: {
        sms: `$${countryPricing.plivo.sms}/msg`,
        voice: `$${countryPricing.plivo.voice}/min`,
      },
      exotel: {
        sms: `INR 0.15/msg (approx)`,
        voice: `INR 0.50/min (approx)`,
      },
      recommendation: 'Exotel recommended for India (local support, DLT compliance)',
    };
  }
}

export const communicationService = new CommunicationService();
