/**
 * Outbound Call Service - Refactored following SOLID principles
 *
 * This service orchestrates outbound call operations using:
 * - CampaignManagementService: Campaign CRUD and processing
 * - CallExecutionService: Making calls, consent handling
 * - CallSpeechService: Speech input, AI responses, transfer logic
 * - CallFinalizationService: Summary generation, lead creation
 * - LanguageConfig: Language configuration and helpers
 */

import { PrismaClient, OutboundCallStatus, OutboundContactStatus, CallOutcome } from '@prisma/client';
import { prisma } from '../config/database';
import { config } from '../config';
import { voiceMinutesService } from '../services/voice-minutes.service';
import { callFlowService, callFlowExecutor, CallFlowExecutionContext } from '../services/call-flow.service';

// Import extracted services
import { campaignManagementService, type CreateCampaignData } from '../services/campaign-management.service';
import { callExecutionService, type MakeCallData } from '../services/call-execution.service';
import { callSpeechService } from '../services/call-speech.service';
import { callFinalizationService } from '../services/call-finalization.service';
import { getLanguageConfig, generateExoML, isHindiLanguage } from '../config/language.config';


// In-memory storage for active call flow executions
const activeCallFlowContexts = new Map<string, CallFlowExecutionContext>();

class OutboundCallService {
  // ==================== CAMPAIGN MANAGEMENT ====================
  // Delegates to CampaignManagementService

  async createCampaign(data: CreateCampaignData) {
    return campaignManagementService.createCampaign(data);
  }

  async getCampaign(campaignId: string) {
    return campaignManagementService.getCampaign(campaignId);
  }

  async listCampaigns(organizationId: string) {
    return campaignManagementService.listCampaigns(organizationId);
  }

  async startCampaign(campaignId: string) {
    const campaign = await campaignManagementService.startCampaign(campaignId);

    // Only auto-process calls for AUTOMATIC mode
    if (campaign.callingMode === 'AUTOMATIC') {
      this.processCampaignCalls(campaignId).catch(console.error);
    }

    return campaign;
  }

  async pauseCampaign(campaignId: string) {
    return campaignManagementService.pauseCampaign(campaignId);
  }

  async resumeCampaign(campaignId: string) {
    const campaign = await campaignManagementService.resumeCampaign(campaignId);
    this.processCampaignCalls(campaignId).catch(console.error);
    return campaign;
  }

  // Process campaign calls
  private async processCampaignCalls(campaignId: string) {
    const campaign = await prisma.outboundCallCampaign.findUnique({
      where: { id: campaignId },
      include: { agent: true },
    });

    if (!campaign || campaign.status !== 'RUNNING') {
      return;
    }

    const pendingContacts = await campaignManagementService.getPendingContacts(
      campaignId,
      campaign.maxConcurrentCalls
    );

    if (pendingContacts.length === 0) {
      await campaignManagementService.checkCampaignCompletion(campaignId);
      return;
    }

    // Check calling hours
    const hours = campaign.callsBetweenHours as { start: number; end: number };
    if (!campaignManagementService.isWithinCallingHours(hours)) {
      setTimeout(() => this.processCampaignCalls(campaignId), 60000);
      return;
    }

    // Make calls
    for (const contact of pendingContacts) {
      try {
        await this.makeCall({
          agentId: campaign.agentId,
          phone: contact.phone,
          contactId: contact.id,
          campaignId: campaign.id,
          leadId: contact.leadId || undefined,
          contactName: contact.name || undefined,
          customData: contact.customData as any,
        });
      } catch (error: any) {
        console.error(`Failed to call ${contact.phone}:`, error);

        if (error.code === 'DNC_BLOCKED') {
          await campaignManagementService.updateContactStatus(contact.id, 'SKIPPED', `Compliance blocked: ${error.message}`);
          continue;
        }

        await prisma.outboundCallContact.update({
          where: { id: contact.id },
          data: {
            status: 'FAILED',
            attempts: { increment: 1 },
            lastAttemptAt: new Date(),
          },
        });
      }
    }

    // Schedule next batch
    setTimeout(() => this.processCampaignCalls(campaignId), 5000);
  }

  // ==================== CALL MANAGEMENT ====================
  // Delegates to CallExecutionService

  async makeCall(data: MakeCallData) {
    return callExecutionService.makeCall(data);
  }

  async handleIncomingCall(data: {
    CallSid: string;
    From: string;
    To: string;
    CallerName?: string;
  }) {
    return callExecutionService.handleIncomingCall(data);
  }

  async continueInboundCall(callId: string) {
    return callExecutionService.continueInboundCall(callId);
  }

  // ==================== TwiML GENERATION ====================

  async generateTwiML(callId: string): Promise<string> {
    const call = await prisma.outboundCall.findUnique({
      where: { id: callId },
      include: { agent: true },
    });

    if (!call || !call.agent) {
      throw new Error('Call not found');
    }

    const baseUrl = config.baseUrl;
    const langConfig = getLanguageConfig(call.agent.language || 'en');

    // Check consent for outbound calls
    if (call.consentGiven === null && call.direction === 'OUTBOUND') {
      await prisma.outboundCall.update({
        where: { id: callId },
        data: { consentAskedAt: new Date() },
      });
      return callExecutionService.generateConsentTwiML(callId, call.agent.language);
    }

    // If consent denied, end call
    if (call.consentGiven === false) {
      return callExecutionService.generateConsentDeclinedTwiML(call.agent.language);
    }

    // Check for call flow
    if (call.agent.callFlowId) {
      try {
        return await this.executeCallFlow(call, langConfig, baseUrl);
      } catch (err: any) {
        console.error(`[CallFlow] Error executing call flow for call ${callId}:`, err);
      }
    }

    // Default behavior
    return this.generateDefaultTwiML(call, langConfig, baseUrl);
  }

  private async executeCallFlow(call: any, langConfig: any, baseUrl: string): Promise<string> {
    const initialVariables = {
      phone: call.phoneNumber,
      name: call.contactName || '',
      agentName: call.agent.name,
      ...((call.metadata as object) || {}),
    };

    const context = await callFlowExecutor.initializeExecution(
      call.agent.callFlowId,
      call.id,
      initialVariables
    );

    activeCallFlowContexts.set(call.id, context);

    // Process nodes
    let response = '';
    let shouldWaitForInput = false;
    let iterations = 0;

    while (!shouldWaitForInput && !context.shouldEnd && !context.shouldTransfer && iterations < 10) {
      iterations++;
      const result = await callFlowExecutor.processCurrentNode(context);
      if (result.response) {
        response += (response ? ' ' : '') + result.response;
      }
      shouldWaitForInput = result.shouldWaitForInput;
      if (result.shouldEnd || result.shouldTransfer || !result.nextNodeId) break;
    }

    // Update transcript
    await prisma.outboundCall.update({
      where: { id: call.id },
      data: {
        transcript: context.transcript,
        language: langConfig.speechLanguage,
      },
    });

    // Handle transfer
    if (context.shouldTransfer && context.transferConfig) {
      return callSpeechService.generateTransferTwiML(call.id, context.transferConfig);
    }

    // Handle end
    if (context.shouldEnd) {
      return generateExoML(`
        <Say voice="${langConfig.ttsVoice}">${response || context.endMessage}</Say>
        <Hangup/>
      `);
    }

    // Continue call flow
    const retryMessage = isHindiLanguage(call.agent.language)
      ? "Mujhe samajh nahi aaya. Kripya dobara bataiye."
      : "I didn't catch that. Let me try again.";

    return generateExoML(`
      <Gather input="speech dtmf" action="${baseUrl}/api/outbound-calls/webhook/callflow/${call.id}" method="POST" timeout="5">
        <Say voice="${langConfig.ttsVoice}">${response}</Say>
      </Gather>
      <Say voice="${langConfig.ttsVoice}">${retryMessage}</Say>
      <Redirect>${baseUrl}/api/outbound-calls/twiml/${call.id}</Redirect>
    `);
  }

  private async generateDefaultTwiML(call: any, langConfig: any, baseUrl: string): Promise<string> {
    const defaultGreeting = isHindiLanguage(call.agent.language)
      ? "Namaste! Main aapki organization ki taraf se call kar raha hoon. Kya aapke paas kuch samay hai?"
      : "Hello! I'm calling on behalf of our organization. Do you have a moment to speak?";
    const greeting = call.agent.greeting || defaultGreeting;

    const questions = call.agent.questions as any[] || [];
    const defaultFirstQuestion = isHindiLanguage(call.agent.language)
      ? "Main aapki kaise madad kar sakta hoon?"
      : 'How can I help you today?';
    const firstQuestion = questions.length > 0 ? questions[0].question : defaultFirstQuestion;

    // Initialize transcript
    const currentTranscript = (call.transcript as any[]) || [];
    if (currentTranscript.length === 0) {
      await prisma.outboundCall.update({
        where: { id: call.id },
        data: {
          transcript: [
            { role: 'assistant', content: greeting, timestamp: new Date().toISOString() },
            { role: 'assistant', content: firstQuestion, timestamp: new Date().toISOString() },
          ],
          language: langConfig.speechLanguage,
        },
      });
    }

    const retryMessage = isHindiLanguage(call.agent.language)
      ? "Mujhe samajh nahi aaya. Kripya dobara bataiye."
      : "I didn't catch that. Let me try again.";

    return generateExoML(`
      <Say voice="${langConfig.ttsVoice}">${greeting}</Say>
      <Gather input="speech dtmf" action="${baseUrl}/api/outbound-calls/webhook/speech/${call.id}" method="POST" timeout="5">
        <Say voice="${langConfig.ttsVoice}">${firstQuestion}</Say>
      </Gather>
      <Say voice="${langConfig.ttsVoice}">${retryMessage}</Say>
      <Redirect>${baseUrl}/api/outbound-calls/twiml/${call.id}</Redirect>
    `);
  }

  // ==================== SPEECH HANDLING ====================
  // Delegates to CallSpeechService

  async handleSpeechInput(callId: string, speechResult: string, dtmfDigits?: string): Promise<string> {
    return callSpeechService.handleSpeechInput(callId, speechResult, dtmfDigits);
  }

  async handleCallFlowSpeechInput(callId: string, speechResult: string, dtmfDigits?: string): Promise<string> {
    const call = await prisma.outboundCall.findUnique({
      where: { id: callId },
      include: { agent: true },
    });

    if (!call || !call.agent) {
      throw new Error('Call not found');
    }

    const langConfig = getLanguageConfig(call.agent.language || 'en');
    const baseUrl = config.baseUrl;

    // Get or create call flow context
    let context: CallFlowExecutionContext | undefined = activeCallFlowContexts.get(callId);
    if (!context && call.agent.callFlowId) {
      context = await callFlowExecutor.initializeExecution(
        call.agent.callFlowId,
        callId,
        { phone: call.phoneNumber, name: (call as any).contactName || '' }
      );
      activeCallFlowContexts.set(callId, context);
    }

    if (!context) {
      return this.handleSpeechInput(callId, speechResult, dtmfDigits);
    }

    // Handle DTMF input
    let userInput = speechResult;
    if (dtmfDigits && !speechResult) {
      switch (dtmfDigits) {
        case '0': userInput = 'I want to speak to a human agent'; break;
        case '9': userInput = 'Please repeat that'; break;
        default: userInput = dtmfDigits;
      }
    }

    // Process through call flow
    const result = await callFlowExecutor.processCurrentNode(context, userInput);

    let response = result.response || '';
    let shouldWaitForInput = result.shouldWaitForInput;
    let iterations = 0;

    while (!shouldWaitForInput && !context.shouldEnd && !context.shouldTransfer && result.nextNodeId && iterations < 10) {
      iterations++;
      const nextResult = await callFlowExecutor.processCurrentNode(context);
      if (nextResult.response) {
        response += (response ? ' ' : '') + nextResult.response;
      }
      shouldWaitForInput = nextResult.shouldWaitForInput;
      if (nextResult.shouldEnd || nextResult.shouldTransfer || !nextResult.nextNodeId) break;
    }

    // Update call
    await prisma.outboundCall.update({
      where: { id: callId },
      data: {
        transcript: context.transcript,
        qualification: context.variables,
      },
    });

    // Log to call flow logs
    if (call.agent.callFlowId) {
      await prisma.callFlowLog.upsert({
        where: { id: callId },
        update: {
          nodesVisited: context.visitedNodes,
          variablesCollected: context.variables,
          currentNodeId: context.currentNodeId,
          transcript: context.transcript,
          outcome: context.outcome,
        },
        create: {
          id: callId,
          callFlowId: call.agent.callFlowId,
          sessionId: callId,
          phoneNumber: call.phoneNumber,
          direction: 'outbound',
          nodesVisited: context.visitedNodes,
          variablesCollected: context.variables,
          currentNodeId: context.currentNodeId,
          transcript: context.transcript,
        },
      });
    }

    // Handle transfer
    if (context.shouldTransfer && context.transferConfig) {
      activeCallFlowContexts.delete(callId);
      return callSpeechService.generateTransferTwiML(callId, context.transferConfig);
    }

    // Handle end
    if (context.shouldEnd) {
      activeCallFlowContexts.delete(callId);
      const endMessage = context.endMessage || response || (isHindiLanguage(call.agent.language)
        ? 'Aapke samay ke liye dhanyavaad. Alvida!'
        : 'Thank you for your time. Goodbye!');

      return generateExoML(`
        <Say voice="${langConfig.ttsVoice}">${endMessage}</Say>
        <Hangup/>
      `);
    }

    // Continue call flow
    const retryMessage = isHindiLanguage(call.agent.language)
      ? 'Mujhe kuch sunai nahi diya. Kya aap abhi bhi hain?'
      : "I didn't hear anything. Are you still there?";

    return generateExoML(`
      <Gather input="speech dtmf" action="${baseUrl}/api/outbound-calls/webhook/callflow/${callId}" method="POST" timeout="5">
        <Say voice="${langConfig.ttsVoice}">${response}</Say>
      </Gather>
      <Say voice="${langConfig.ttsVoice}">${retryMessage}</Say>
      <Redirect>${baseUrl}/api/outbound-calls/twiml/${callId}</Redirect>
    `);
  }

  // ==================== CONSENT HANDLING ====================

  async handleConsentResponse(callId: string, data: {
    Digits?: string;
    SpeechResult?: string;
    defaultConsent?: boolean;
    retryCount?: number;
  }): Promise<string> {
    return callExecutionService.handleConsentResponse(callId, data);
  }

  // ==================== WEBHOOK HANDLERS ====================

  async handleStatusCallback(data: {
    CallSid: string;
    CallStatus: string;
    CallDuration?: string;
    AnsweredBy?: string;
  }) {
    const statusMap: Record<string, OutboundCallStatus> = {
      'initiated': 'INITIATED',
      'queued': 'QUEUED',
      'ringing': 'RINGING',
      'in-progress': 'IN_PROGRESS',
      'completed': 'COMPLETED',
      'busy': 'BUSY',
      'no-answer': 'NO_ANSWER',
      'failed': 'FAILED',
      'canceled': 'CANCELLED',
    };

    const call = await prisma.outboundCall.findFirst({
      where: { twilioCallSid: data.CallSid },
      include: { agent: { select: { organizationId: true } } },
    });

    if (!call) {
      console.error('Call not found for SID:', data.CallSid);
      return;
    }

    const status = statusMap[data.CallStatus] || 'FAILED';
    const updateData: any = { status };

    if (data.CallStatus === 'ringing') {
      updateData.startedAt = new Date();
    } else if (data.CallStatus === 'in-progress') {
      updateData.answeredAt = new Date();
    } else if (['completed', 'busy', 'no-answer', 'failed', 'canceled'].includes(data.CallStatus)) {
      updateData.endedAt = new Date();
      if (data.CallDuration) {
        updateData.duration = parseInt(data.CallDuration);
      }

      if (data.CallStatus === 'completed') {
        updateData.outcome = 'NEEDS_FOLLOWUP';
      } else if (data.CallStatus === 'busy') {
        updateData.outcome = 'BUSY';
      } else if (data.CallStatus === 'no-answer') {
        updateData.outcome = 'NO_ANSWER';
      }

      if (data.AnsweredBy === 'machine_end_beep' || data.AnsweredBy === 'machine_start') {
        updateData.outcome = 'VOICEMAIL';
      }
    }

    const updatedCall = await prisma.outboundCall.update({
      where: { id: call.id },
      data: updateData,
    });

    // Update contact status
    if (call.contactId) {
      const contactStatus = ['COMPLETED', 'BUSY', 'NO_ANSWER', 'FAILED'].includes(status as string)
        ? 'COMPLETED'
        : 'IN_PROGRESS';

      await prisma.outboundCallContact.update({
        where: { id: call.contactId },
        data: { status: contactStatus as OutboundContactStatus },
      });
    }

    // Update campaign stats
    if (call.campaignId && ['COMPLETED', 'BUSY', 'NO_ANSWER', 'FAILED'].includes(status as string)) {
      await campaignManagementService.updateCampaignStats(
        call.campaignId,
        status === 'COMPLETED',
        false
      );
    }

    // Record voice minutes usage
    if (['completed', 'busy', 'no-answer', 'failed', 'canceled'].includes(data.CallStatus) && data.CallDuration) {
      const durationMinutes = parseInt(data.CallDuration) / 60;
      if (durationMinutes > 0 && call.agent?.organizationId) {
        try {
          await voiceMinutesService.recordUsage(call.agent.organizationId, null, durationMinutes);
        } catch (error) {
          console.error('[VoiceMinutes] Failed to record usage:', error);
        }
      }
    }

    // Finalize call
    if (status === 'COMPLETED' && updatedCall.transcript) {
      await callFinalizationService.finalizeCall(call.id);
    }

    return updatedCall;
  }

  async handleRecordingCallback(data: {
    CallSid: string;
    RecordingSid: string;
    RecordingUrl: string;
    RecordingDuration: string;
  }) {
    const call = await prisma.outboundCall.findFirst({
      where: { twilioCallSid: data.CallSid },
    });

    if (!call) {
      console.error('Call not found for recording SID:', data.CallSid);
      return;
    }

    return prisma.outboundCall.update({
      where: { id: call.id },
      data: {
        recordingSid: data.RecordingSid,
        recordingUrl: data.RecordingUrl + '.mp3',
        recordingDuration: parseInt(data.RecordingDuration),
      },
    });
  }

  async handleTransferStatus(callId: string, data: { DialCallStatus: string; DialCallDuration?: string }) {
    const call = await prisma.outboundCall.findUnique({ where: { id: callId } });
    if (!call) return;

    const notes = call.outcomeNotes || '';
    let newNotes = notes;

    switch (data.DialCallStatus) {
      case 'completed':
        newNotes = `${notes} - Transfer successful, duration: ${data.DialCallDuration}s`;
        break;
      case 'busy':
      case 'no-answer':
      case 'failed':
        newNotes = `${notes} - Transfer failed: ${data.DialCallStatus}`;
        break;
    }

    await prisma.outboundCall.update({
      where: { id: callId },
      data: { outcomeNotes: newNotes },
    });
  }

  // ==================== CALL QUERIES ====================

  async getCall(callId: string) {
    return prisma.outboundCall.findUnique({
      where: { id: callId },
      include: {
        agent: true,
        campaign: true,
        contact: true,
      },
    });
  }

  async listCalls(filters: {
    organizationId?: string;
    agentId?: string;
    campaignId?: string;
    status?: OutboundCallStatus;
    outcome?: CallOutcome;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
    assignedToUserId?: string; // For role-based filtering
  }) {
    const where: any = {};

    if (filters.agentId) where.agentId = filters.agentId;
    if (filters.campaignId) where.campaignId = filters.campaignId;
    if (filters.status) where.status = filters.status;
    if (filters.outcome) where.outcome = filters.outcome;
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }
    if (filters.organizationId) {
      where.agent = { organizationId: filters.organizationId };
    }

    // Role-based filtering: only show calls for leads assigned to this user
    if (filters.assignedToUserId) {
      where.existingLead = {
        assignments: {
          some: {
            assignedToId: filters.assignedToUserId,
            isActive: true,
          },
        },
      };
    }

    const [calls, total] = await Promise.all([
      prisma.outboundCall.findMany({
        where,
        include: {
          agent: { select: { id: true, name: true, industry: true } },
          campaign: { select: { id: true, name: true } },
          existingLead: { select: { id: true, firstName: true, lastName: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0,
      }),
      prisma.outboundCall.count({ where }),
    ]);

    return { calls, total };
  }

  async getCallAnalytics(organizationId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const calls = await prisma.outboundCall.findMany({
      where: {
        agent: { organizationId },
        createdAt: { gte: startDate },
      },
      select: {
        status: true,
        outcome: true,
        duration: true,
        sentiment: true,
        leadGenerated: true,
      },
    });

    const totalCalls = calls.length;
    const completedCalls = calls.filter((c: typeof calls[0]) => c.status === 'COMPLETED').length;
    const answeredCalls = calls.filter((c: typeof calls[0]) => c.duration && c.duration > 0).length;
    const leadsGenerated = calls.filter((c: typeof calls[0]) => c.leadGenerated).length;
    const avgDuration = calls.reduce((acc: number, c: typeof calls[0]) => acc + (c.duration || 0), 0) / answeredCalls || 0;

    const outcomeBreakdown: Record<string, number> = {};
    for (const call of calls) {
      if (call.outcome) {
        outcomeBreakdown[call.outcome] = (outcomeBreakdown[call.outcome] || 0) + 1;
      }
    }

    const sentimentBreakdown = {
      positive: calls.filter((c: typeof calls[0]) => c.sentiment === 'positive').length,
      neutral: calls.filter((c: typeof calls[0]) => c.sentiment === 'neutral').length,
      negative: calls.filter((c: typeof calls[0]) => c.sentiment === 'negative').length,
    };

    return {
      totalCalls,
      completedCalls,
      answeredCalls,
      answerRate: totalCalls ? ((answeredCalls / totalCalls) * 100).toFixed(1) : 0,
      leadsGenerated,
      conversionRate: answeredCalls ? ((leadsGenerated / answeredCalls) * 100).toFixed(1) : 0,
      avgDuration: Math.round(avgDuration),
      outcomeBreakdown,
      sentimentBreakdown,
    };
  }

  // Alias for makeCall - used by leadAutoAssignService
  async makeSingleCall(data: {
    agentId: string;
    phoneNumber: string;
    leadId?: string;
    contactName?: string;
    customData?: any;
  }) {
    return this.makeCall({
      agentId: data.agentId,
      phone: data.phoneNumber,
      leadId: data.leadId,
      contactName: data.contactName,
      customData: data.customData,
    });
  }
}

export const outboundCallService = new OutboundCallService();
