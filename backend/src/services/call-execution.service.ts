/**
 * Call Execution Service - Single Responsibility Principle
 * Handles making calls, TwiML generation, and consent handling
 */

import { prisma } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { exotelService } from '../integrations/exotel.service';
import { voiceMinutesService } from './voice-minutes.service';
import { complianceService } from './compliance.service';
import { parseVariables, extractInstitutionContext, VariableContext } from '../utils/variableParser';
import { getLanguageConfig, generateExoML, isHindiLanguage } from '../config/language.config';


const CALL_PROVIDER = process.env.CALL_PROVIDER || process.env.VOICE_PROVIDER || 'exotel';

export interface MakeCallData {
  agentId: string;
  phone: string;
  campaignId?: string;
  contactId?: string;
  leadId?: string;
  contactName?: string;
  customData?: any;
  skipComplianceCheck?: boolean;
}

export interface CallResult {
  callId: string;
  exotelSid?: string;
  conversationId: string;
  status: string;
  provider: string;
}

// Helper function to build variable context
const buildVariableContext = (orgSettings: any, contactData?: any): VariableContext => {
  return {
    lead: contactData ? {
      firstName: contactData.name?.split(' ')[0],
      lastName: contactData.name?.split(' ').slice(1).join(' '),
      phone: contactData.phone,
      email: contactData.email,
      company: contactData.company,
      customFields: contactData.customData,
    } : undefined,
    institution: extractInstitutionContext(orgSettings),
  };
};

class CallExecutionService {
  /**
   * Make an outbound call
   */
  async makeCall(data: MakeCallData): Promise<CallResult> {
    const agent = await prisma.voiceAgent.findUnique({
      where: { id: data.agentId },
      include: {
        organization: {
          select: { id: true, name: true, settings: true }
        }
      }
    });

    if (!agent) {
      throw new Error('Voice agent not found');
    }

    // P0 COMPLIANCE: Check DNC list and consent BEFORE making any call
    if (!data.skipComplianceCheck && agent.organization?.id) {
      const complianceCheck = await complianceService.preCallComplianceCheck(
        agent.organization.id,
        data.phone
      );

      if (complianceCheck.isOnDNC) {
        const error = new Error(`COMPLIANCE_BLOCKED: Phone number ${data.phone} is on the Do Not Call list. Reason: ${complianceCheck.dncDetails?.reason || 'Unknown'}`);
        (error as any).code = 'DNC_BLOCKED';
        (error as any).complianceDetails = complianceCheck;

        console.warn(`[Compliance] Blocked call to ${data.phone} - On DNC list (${complianceCheck.dncDetails?.reason})`);

        if (data.contactId) {
          await prisma.outboundCallContact.update({
            where: { id: data.contactId },
            data: {
              status: 'SKIPPED',
              notes: `Blocked by DNC list: ${complianceCheck.dncDetails?.reason}`,
            },
          });
        }

        throw error;
      }

      if (!complianceCheck.hasMarketingConsent) {
        console.info(`[Compliance] No prior marketing consent for ${data.phone} - will request during call`);
      }
    }

    // Check voice minutes availability
    if (agent.organization?.id) {
      const usageCheck = await voiceMinutesService.checkUsage(agent.organization.id);
      if (!usageCheck.allowed) {
        throw new Error(usageCheck.reason || 'Insufficient voice minutes to make this call');
      }
    }

    // Build variable context and parse prompts
    const orgSettings = (agent.organization?.settings as any) || {};
    const variableContext = buildVariableContext(orgSettings, {
      name: data.contactName,
      phone: data.phone,
      customData: data.customData,
    });

    agent.systemPrompt = parseVariables(agent.systemPrompt, variableContext);
    agent.greeting = agent.greeting ? parseVariables(agent.greeting, variableContext) : agent.greeting;
    agent.endMessage = agent.endMessage ? parseVariables(agent.endMessage, variableContext) : agent.endMessage;
    agent.fallbackMessage = agent.fallbackMessage ? parseVariables(agent.fallbackMessage, variableContext) : agent.fallbackMessage;

    if (agent.questions && Array.isArray(agent.questions)) {
      agent.questions = (agent.questions as any[]).map(q => ({
        ...q,
        question: parseVariables(q.question, variableContext)
      }));
    }

    const conversationId = uuidv4();

    // Create call record
    const call = await prisma.outboundCall.create({
      data: {
        agentId: data.agentId,
        phoneNumber: data.phone,
        campaignId: data.campaignId,
        contactId: data.contactId,
        leadId: data.leadId,
        conversationId,
        status: 'INITIATED',
        direction: 'OUTBOUND',
      },
    });

    // Update contact status if from campaign
    if (data.contactId) {
      await prisma.outboundCallContact.update({
        where: { id: data.contactId },
        data: {
          status: 'IN_PROGRESS',
          attempts: { increment: 1 },
          lastAttemptAt: new Date(),
        },
      });
    }

    try {
      const baseUrl = config.baseUrl;

      if (CALL_PROVIDER === 'exotel' && exotelService.isConfigured()) {
        const exotelResult = await exotelService.makeCall({
          to: data.phone,
          customField: JSON.stringify({ callId: call.id, conversationId, phone: data.phone }),
          callbackUrl: `${baseUrl}/api/exotel/passthru`,
          statusCallback: `${baseUrl}/api/exotel/webhook/status`,
          timeLimit: 600,
          timeOut: 30,
          record: true,
          recordingChannels: 'dual', // Separate agent & customer channels for AI analysis
          recordingFormat: 'mp3',
        });

        if (exotelResult.success) {
          await prisma.outboundCall.update({
            where: { id: call.id },
            data: {
              twilioCallSid: exotelResult.callSid,
              status: 'QUEUED',
            },
          });

          return {
            callId: call.id,
            exotelSid: exotelResult.callSid,
            conversationId,
            status: 'QUEUED',
            provider: 'exotel',
          };
        } else {
          throw new Error(exotelResult.error || 'Exotel call failed');
        }
      } else {
        throw new Error('Exotel is not configured. Please set EXOTEL_ACCOUNT_SID, EXOTEL_API_KEY, EXOTEL_API_TOKEN, and EXOTEL_CALLER_ID environment variables.');
      }
    } catch (error) {
      await prisma.outboundCall.update({
        where: { id: call.id },
        data: { status: 'FAILED' },
      });

      if (data.contactId) {
        await prisma.outboundCallContact.update({
          where: { id: data.contactId },
          data: { status: 'FAILED' },
        });
      }

      throw error;
    }
  }

  /**
   * Generate TwiML/ExoML for consent request
   */
  generateConsentTwiML(callId: string, language?: string): string {
    const langConfig = getLanguageConfig(language || 'en');
    const baseUrl = config.baseUrl;

    const consentMessage = isHindiLanguage(language)
      ? "Yeh call quality aur training ke liye record ki ja sakti hai. Continue karne ke liye 1 dabayein ya haan bolein. Opt out karne ke liye 2 dabayein ya nahi bolein."
      : "This call may be recorded for quality and training purposes. Press 1 or say yes to continue, or press 2 or say no to opt out.";

    return generateExoML(`
      <Gather input="speech dtmf" action="${baseUrl}/api/outbound-calls/webhook/consent/${callId}?retryCount=0" method="POST" numDigits="1" timeout="10">
        <Say voice="${langConfig.ttsVoice}">${consentMessage}</Say>
      </Gather>
      <Redirect>${baseUrl}/api/outbound-calls/webhook/consent/${callId}?retryCount=0</Redirect>
    `);
  }

  /**
   * Generate TwiML/ExoML for consent declined
   */
  generateConsentDeclinedTwiML(language?: string): string {
    const langConfig = getLanguageConfig(language || 'en');

    const declineMessage = isHindiLanguage(language)
      ? "Aapka faisla ka samman karte hain. Dhanyavaad. Alvida."
      : "We respect your decision. Thank you for your time. Goodbye.";

    return generateExoML(`<Say voice="${langConfig.ttsVoice}">${declineMessage}</Say><Hangup/>`);
  }

  /**
   * Handle consent response
   */
  async handleConsentResponse(callId: string, data: {
    Digits?: string;
    SpeechResult?: string;
    retryCount?: number;
  }): Promise<string> {
    const call = await prisma.outboundCall.findUnique({
      where: { id: callId },
      include: { agent: true },
    });

    if (!call) {
      return generateExoML(`<Say voice="Polly.Joanna">An error occurred. Goodbye.</Say><Hangup/>`);
    }

    const langConfig = getLanguageConfig(call.agent?.language || 'en');
    const retryCount = data.retryCount || 0;
    const maxRetries = 2;

    let consentGiven: boolean | null = null;

    if (data.Digits) {
      if (data.Digits === '1') {
        consentGiven = true;
      } else if (data.Digits === '2') {
        consentGiven = false;
      }
    } else if (data.SpeechResult) {
      const speech = data.SpeechResult.toLowerCase().trim();
      const yesIndicators = ['yes', 'yeah', 'yep', 'okay', 'ok', 'sure', 'continue', 'proceed', 'go ahead', 'fine', 'haan', 'theek hai', 'chalo'];
      const noIndicators = ['no', 'nope', 'don\'t', 'stop', 'opt out', 'hang up', 'end', 'nahi', 'mat karo', 'band karo'];

      if (yesIndicators.some(y => speech.includes(y))) {
        consentGiven = true;
      } else if (noIndicators.some(n => speech.includes(n))) {
        consentGiven = false;
      }
    }

    // If unclear and haven't exceeded retries, ask again
    if (consentGiven === null) {
      if (retryCount < maxRetries) {
        console.info(`[Compliance] Unclear consent response for call ${callId}, retry ${retryCount + 1}/${maxRetries}`);

        const retryMessage = isHindiLanguage(call.agent?.language)
          ? "Mujhe samajh nahi aaya. Call recording ke liye 1 dabayein ya haan bolein. Opt out karne ke liye 2 dabayein ya nahi bolein."
          : "I didn't understand your response. Please press 1 or say yes to consent to call recording, or press 2 or say no to opt out.";

        return generateExoML(`
          <Gather input="speech dtmf" action="${config.baseUrl}/api/outbound-calls/webhook/consent/${callId}?retryCount=${retryCount + 1}" method="POST" numDigits="1" timeout="8">
            <Say voice="${langConfig.ttsVoice}">${retryMessage}</Say>
          </Gather>
          <Redirect>${config.baseUrl}/api/outbound-calls/webhook/consent/${callId}?retryCount=${retryCount + 1}</Redirect>
        `);
      } else {
        console.warn(`[Compliance] No clear consent after ${maxRetries} attempts for call ${callId} - treating as declined`);
        consentGiven = false;
      }
    }

    // Update consent status
    await prisma.outboundCall.update({
      where: { id: callId },
      data: { consentGiven },
    });

    // Record consent in compliance system
    if (call.agent?.organizationId) {
      try {
        await complianceService.recordConsent({
          organizationId: call.agent.organizationId,
          phoneNumber: call.phoneNumber,
          consentType: 'CALL_RECORDING',
          consentGiven,
          consentMethod: data.Digits ? 'IVR_KEYPRESS' : 'VERBAL',
          callId: callId,
          consentPhrase: data.SpeechResult || (data.Digits ? `DTMF: ${data.Digits}` : 'No response after retries'),
        });
      } catch (error) {
        console.error('[Compliance] Failed to record consent:', error);
      }
    }

    // If consent denied, add to DNC list
    if (!consentGiven) {
      if (call.agent?.organizationId) {
        await prisma.doNotCallList.upsert({
          where: {
            organizationId_phoneNumber: {
              organizationId: call.agent.organizationId,
              phoneNumber: call.phoneNumber,
            },
          },
          create: {
            organizationId: call.agent.organizationId,
            phoneNumber: call.phoneNumber,
            reason: 'CUSTOMER_REQUEST',
            notes: data.SpeechResult
              ? `Opted out during call consent: "${data.SpeechResult}"`
              : (data.Digits === '2' ? 'Opted out via keypress' : 'No clear consent given after multiple attempts'),
          },
          update: {
            reason: 'CUSTOMER_REQUEST',
            notes: data.SpeechResult
              ? `Opted out during call consent: "${data.SpeechResult}"`
              : (data.Digits === '2' ? 'Opted out via keypress' : 'No clear consent given after multiple attempts'),
          },
        });

        await complianceService.logComplianceEvent({
          organizationId: call.agent.organizationId,
          eventType: 'DNC_ADDED',
          actorType: 'voice_agent',
          actorId: call.agentId,
          targetType: 'phone_number',
          targetId: call.phoneNumber,
          action: 'added',
          description: `Added to DNC during call consent flow`,
          metadata: {
            callId,
            response: data.SpeechResult || data.Digits || 'no_response',
          },
        });
      }
    }

    return generateExoML(`<Redirect>${config.baseUrl}/api/outbound-calls/twiml/${callId}</Redirect>`);
  }

  /**
   * Handle inbound call
   */
  async handleIncomingCall(data: {
    CallSid: string;
    From: string;
    To: string;
    CallerName?: string;
  }): Promise<{ callId: string; twiml: string }> {
    const agent = await prisma.voiceAgent.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!agent) {
      const exoml = generateExoML(
        `<Say voice="Polly.Joanna">We're sorry, our system is currently unavailable. Please try again later.</Say><Hangup/>`
      );
      return { callId: '', twiml: exoml };
    }

    const conversationId = uuidv4();

    const existingLead = await prisma.lead.findFirst({
      where: {
        organizationId: agent.organizationId,
        phone: data.From,
      },
    });

    const call = await prisma.outboundCall.create({
      data: {
        agentId: agent.id,
        phoneNumber: data.From,
        twilioCallSid: data.CallSid,
        conversationId,
        status: 'IN_PROGRESS',
        direction: 'INBOUND',
        startedAt: new Date(),
        answeredAt: new Date(),
        leadId: existingLead?.id,
      },
    });

    const twiml = await this.generateInboundTwiML(call.id, agent, data.CallerName);
    return { callId: call.id, twiml };
  }

  /**
   * Generate TwiML for inbound calls
   */
  private async generateInboundTwiML(callId: string, agent: any, callerName?: string): Promise<string> {
    const baseUrl = config.baseUrl;

    let greeting = agent.greeting || "Hello! Thank you for calling. How can I help you today?";
    if (callerName) {
      greeting = `Hello ${callerName}! Thank you for calling. How can I help you today?`;
    }

    await prisma.outboundCall.update({
      where: { id: callId },
      data: {
        transcript: [
          { role: 'assistant', content: greeting, timestamp: new Date().toISOString() },
        ],
      },
    });

    return generateExoML(`
      <Gather input="speech" action="${baseUrl}/api/outbound-calls/webhook/speech/${callId}" method="POST" timeout="5">
        <Say voice="Polly.Joanna">${greeting}</Say>
      </Gather>
      <Say voice="Polly.Joanna">I didn't catch that. Could you please repeat?</Say>
      <Redirect>${baseUrl}/api/outbound-calls/inbound/continue/${callId}</Redirect>
    `);
  }

  /**
   * Continue inbound call after timeout
   */
  async continueInboundCall(callId: string): Promise<string> {
    const call = await prisma.outboundCall.findUnique({
      where: { id: callId },
      include: { agent: true },
    });

    if (!call || !call.agent) {
      return generateExoML(`<Say voice="Polly.Joanna">We're sorry, an error occurred. Goodbye.</Say><Hangup/>`);
    }

    const baseUrl = config.baseUrl;

    return generateExoML(`
      <Gather input="speech" action="${baseUrl}/api/outbound-calls/webhook/speech/${callId}" method="POST" timeout="5">
        <Say voice="Polly.Joanna">Are you still there? How can I help you?</Say>
      </Gather>
      <Say voice="Polly.Joanna">I haven't heard from you. Thank you for calling. Goodbye!</Say>
      <Hangup/>
    `);
  }
}

export const callExecutionService = new CallExecutionService();
export default callExecutionService;
