import * as plivo from 'plivo';
import { config } from '../config';
import { prisma } from '../config/database';
import { MessageDirection, MessageStatus, CallDirection, CallStatus, CallType } from '@prisma/client';

interface SendSmsInput {
  to: string;
  message: string;
  leadId?: string;
  userId?: string;
}

interface MakeCallInput {
  to: string;
  leadId?: string;
  callerId: string;
  callType?: CallType;
}

export class PlivoService {
  private client: plivo.Client | null = null;
  private initialized = false;

  private getClient(): plivo.Client {
    if (!this.initialized) {
      this.initialized = true;
      const { authId, authToken } = config.plivo;

      if (authId && authToken) {
        this.client = new plivo.Client(authId, authToken);
      } else {
        // Only warn if Plivo is the selected provider
        if (config.voiceProvider === 'plivo' || config.smsProvider === 'plivo') {
          console.warn('Plivo credentials not configured. SMS and Voice features will be disabled.');
        }
      }
    }

    if (!this.client) {
      throw new Error('Plivo is not configured. Please set valid PLIVO_AUTH_ID and PLIVO_AUTH_TOKEN in your environment.');
    }

    return this.client;
  }

  isConfigured(): boolean {
    if (!this.initialized) {
      const { authId, authToken } = config.plivo;
      return !!(authId && authToken);
    }
    return this.client !== null;
  }

  // Format phone number for Plivo (requires country code without +)
  private formatPhoneNumber(phone: string): string {
    // Remove spaces, dashes, and parentheses
    let formatted = phone.replace(/[\s\-\(\)]/g, '');

    // Remove leading + if present
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

  // ==================== SMS ====================
  async sendSms(input: SendSmsInput) {
    try {
      const formattedTo = this.formatPhoneNumber(input.to);
      const src = config.plivo.phoneNumber?.replace('+', '') || '';

      const response = await this.getClient().messages.create(
        src,           // source number
        formattedTo,   // destination number
        input.message  // message text
      );

      // Get message UUID from response
      const messageId = Array.isArray(response.messageUuid)
        ? response.messageUuid[0]
        : response.messageUuid;

      // Log the SMS
      const smsLog = await prisma.smsLog.create({
        data: {
          leadId: input.leadId,
          userId: input.userId || 'system',
          phone: input.to,
          message: input.message,
          direction: MessageDirection.OUTBOUND,
          status: MessageStatus.SENT,
          providerMsgId: messageId,
          sentAt: new Date(),
          provider: 'PLIVO',
        },
      });

      return {
        success: true,
        messageId,
        log: smsLog
      };
    } catch (error) {
      // Log failed SMS
      await prisma.smsLog.create({
        data: {
          leadId: input.leadId,
          userId: input.userId || 'system',
          phone: input.to,
          message: input.message,
          direction: MessageDirection.OUTBOUND,
          status: MessageStatus.FAILED,
          provider: 'PLIVO',
        },
      });

      throw error;
    }
  }

  async sendBulkSms(recipients: Array<{ phone: string; message: string; leadId?: string }>, userId: string) {
    const results = [];

    // Plivo supports bulk SMS with same message to multiple numbers
    const sameMessageGroups = new Map<string, Array<{ phone: string; leadId?: string }>>();

    for (const recipient of recipients) {
      const existing = sameMessageGroups.get(recipient.message) || [];
      existing.push({ phone: recipient.phone, leadId: recipient.leadId });
      sameMessageGroups.set(recipient.message, existing);
    }

    for (const [message, phoneList] of sameMessageGroups) {
      // Plivo allows sending to multiple numbers with < delimiter
      const destinations = phoneList.map(p => this.formatPhoneNumber(p.phone)).join('<');
      const src = config.plivo.phoneNumber?.replace('+', '') || '';

      try {
        const response = await this.getClient().messages.create(
          src,
          destinations,
          message
        );

        // Get message UUIDs from response
        const messageUuids = Array.isArray(response.messageUuid)
          ? response.messageUuid
          : [response.messageUuid];

        // Log each SMS
        for (let i = 0; i < phoneList.length; i++) {
          const msgId = messageUuids[i] || messageUuids[0];

          await prisma.smsLog.create({
            data: {
              leadId: phoneList[i].leadId,
              userId,
              phone: phoneList[i].phone,
              message,
              direction: MessageDirection.OUTBOUND,
              status: MessageStatus.SENT,
              providerMsgId: msgId,
              sentAt: new Date(),
              provider: 'PLIVO',
            },
          });

          results.push({
            phone: phoneList[i].phone,
            success: true,
            messageId: msgId
          });
        }
      } catch (error) {
        for (const p of phoneList) {
          await prisma.smsLog.create({
            data: {
              leadId: p.leadId,
              userId,
              phone: p.phone,
              message,
              direction: MessageDirection.OUTBOUND,
              status: MessageStatus.FAILED,
              provider: 'PLIVO',
            },
          });

          results.push({
            phone: p.phone,
            success: false,
            error: (error as Error).message
          });
        }
      }
    }

    return results;
  }

  // ==================== VOICE CALLS ====================
  async makeCall(input: MakeCallInput, answerUrl: string) {
    try {
      const formattedTo = this.formatPhoneNumber(input.to);
      const src = config.plivo.phoneNumber?.replace('+', '') || '';

      const response = await this.getClient().calls.create(
        src,           // from
        formattedTo,   // to
        answerUrl,     // answer_url
        {
          answerMethod: 'POST',
          hangupUrl: `${config.baseUrl}/api/plivo/webhook/hangup`,
          hangupMethod: 'POST',
          ringTimeout: 30,
        }
      );

      // Get call UUID - handle both string and array responses
      const callId = Array.isArray(response.requestUuid)
        ? response.requestUuid[0]
        : (response.requestUuid || (response as any).request_uuid);

      // Log the call
      const callLog = await prisma.callLog.create({
        data: {
          leadId: input.leadId,
          callerId: input.callerId,
          phoneNumber: input.to,
          direction: CallDirection.OUTBOUND,
          callType: input.callType || CallType.MANUAL,
          status: CallStatus.INITIATED,
          providerCallId: callId,
          startedAt: new Date(),
          provider: 'PLIVO',
        },
      });

      return { success: true, callId, log: callLog };
    } catch (error) {
      await prisma.callLog.create({
        data: {
          leadId: input.leadId,
          callerId: input.callerId,
          phoneNumber: input.to,
          direction: CallDirection.OUTBOUND,
          callType: input.callType || CallType.MANUAL,
          status: CallStatus.FAILED,
          provider: 'PLIVO',
        },
      });

      throw error;
    }
  }

  async updateCallStatus(callUuid: string, status: CallStatus, duration?: number, recordingUrl?: string) {
    // Find the call log by providerCallId first
    const callLog = await prisma.callLog.findFirst({
      where: { providerCallId: callUuid },
    });

    if (!callLog) {
      console.warn(`Call log not found for UUID: ${callUuid}`);
      return null;
    }

    return prisma.callLog.update({
      where: { id: callLog.id },
      data: {
        status,
        duration,
        recordingUrl,
        endedAt: new Date(),
      },
    });
  }

  // ==================== WEBHOOKS ====================
  async handleIncomingSms(from: string, to: string, text: string, messageUuid: string) {
    // Find lead by phone number
    const lead = await prisma.lead.findFirst({
      where: {
        OR: [
          { phone: from },
          { phone: `+${from}` },
          { phone: from.replace(/^91/, '+91-') },
        ]
      },
      include: {
        assignments: {
          where: { isActive: true },
          include: { assignedTo: true },
        },
      },
    });

    // Log incoming SMS
    const smsLog = await prisma.smsLog.create({
      data: {
        leadId: lead?.id,
        userId: lead?.assignments?.[0]?.assignedToId || '',
        phone: from,
        message: text,
        direction: MessageDirection.INBOUND,
        status: MessageStatus.DELIVERED,
        providerMsgId: messageUuid,
        deliveredAt: new Date(),
        provider: 'PLIVO',
      },
    });

    return { lead, smsLog };
  }

  async handleCallStatus(callUuid: string, status: string, duration?: number, recordingUrl?: string) {
    const callStatusMap: Record<string, CallStatus> = {
      'ringing': CallStatus.RINGING,
      'in-progress': CallStatus.IN_PROGRESS,
      'completed': CallStatus.COMPLETED,
      'busy': CallStatus.BUSY,
      'failed': CallStatus.FAILED,
      'no-answer': CallStatus.NO_ANSWER,
      'canceled': CallStatus.FAILED,
    };

    const mappedStatus = callStatusMap[status.toLowerCase()] || CallStatus.FAILED;

    return this.updateCallStatus(callUuid, mappedStatus, duration, recordingUrl);
  }

  // ==================== XML GENERATORS ====================
  generateAnswerXml(message: string): string {
    // Build XML manually for compatibility
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Speak voice="WOMAN" language="en-IN">${this.escapeXml(message)}</Speak>
</Response>`;
  }

  generateIvrXml(options: {
    greeting: string;
    menuOptions: Array<{ digit: string; action: string; message: string }>;
  }): string {
    const menuSpeech = options.menuOptions
      .map(opt => `Press ${opt.digit} for ${opt.message}`)
      .join('. ');

    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <GetInput action="${config.baseUrl}/api/plivo/webhook/ivr-input" method="POST" inputType="dtmf" digitEndTimeout="5" redirect="true">
    <Speak voice="WOMAN" language="en-IN">${this.escapeXml(options.greeting)}. ${this.escapeXml(menuSpeech)}</Speak>
  </GetInput>
</Response>`;
  }

  generateConnectXml(phoneNumber: string): string {
    const formattedNumber = this.formatPhoneNumber(phoneNumber);
    const callerId = config.plivo.phoneNumber?.replace('+', '') || '';

    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${callerId}">
    <Number>${formattedNumber}</Number>
  </Dial>
</Response>`;
  }

  generateRecordXml(callbackUrl: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Speak voice="WOMAN" language="en-IN">Please leave your message after the beep. Press hash when done.</Speak>
  <Record action="${callbackUrl}" method="POST" maxLength="120" finishOnKey="#" playBeep="true"/>
</Response>`;
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  // ==================== ACCOUNT INFO ====================
  async getAccountBalance(): Promise<{ balance: string; currency: string }> {
    const account = await this.getClient().accounts.get();
    return {
      balance: (account as any).cashCredits || '0',
      currency: 'USD',
    };
  }

  async getMessageDetails(messageUuid: string) {
    return this.getClient().messages.get(messageUuid);
  }

  async getCallDetails(callUuid: string) {
    return this.getClient().calls.get(callUuid);
  }

  // ==================== PHONE NUMBERS ====================
  async listPhoneNumbers() {
    const response = await this.getClient().numbers.list({});
    return (response as any).objects || response || [];
  }

  async searchPhoneNumbers(countryIso: string) {
    // Note: Phone number search requires Plivo phone number API
    // This is a simplified implementation
    console.log(`Searching for phone numbers in ${countryIso}...`);
    return [];
  }

  async buyPhoneNumber(phoneNumber: string) {
    return this.getClient().numbers.buy(phoneNumber, '');
  }
}

export const plivoService = new PlivoService();
