/**
 * Call Finalization Service - Single Responsibility Principle
 * Handles call completion, summary generation, lead creation
 *
 * Now integrated with Lead Lifecycle Service for:
 * - Duplicate detection by phone number
 * - Lead creation vs update logic
 * - Automatic follow-up scheduling (AI or Human)
 * - Qualification data merging across multiple calls
 *
 * Enhanced with automatic AI analysis on call completion:
 * - Call quality scoring
 * - Key questions/issues extraction
 * - Per-message sentiment analysis
 * - Speaking time breakdown
 */

import OpenAI from 'openai';
import { CallOutcome } from '@prisma/client';
import { prisma } from '../config/database';
import { leadLifecycleService } from './lead-lifecycle.service';
import { analyzeCallEnhanced, generateCoachingSuggestions, extractCallData, EnhancedCallAnalysisResult, CoachingSuggestions, ExtractedCallData } from './voicebot-ai.service';
import { callAnalyticsService } from './call-analytics.service';


const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

class CallFinalizationService {
  /**
   * Finalize a completed call - generate summary, create/update lead
   * Now uses Lead Lifecycle Service for intelligent lead management
   *
   * Enhanced: Uses AI to analyze call with detailed metrics including:
   * - Call quality score (0-100)
   * - Key questions asked by agent
   * - Key issues discussed
   * - Per-message sentiment analysis
   * - Speaking time breakdown (agent/customer/silence)
   */
  async finalizeCall(callId: string) {
    const call = await prisma.outboundCall.findUnique({
      where: { id: callId },
      include: { agent: true },
    });

    if (!call || !call.agent) return;

    const transcript = call.transcript as any[];
    if (!transcript || transcript.length === 0) return;

    console.log(`[CallFinalization] Starting enhanced AI analysis for call ${callId}`);

    // Use enhanced AI analysis to get all metrics in one call
    const enhancedAnalysis: EnhancedCallAnalysisResult = await analyzeCallEnhanced(
      transcript,
      [], // mood history (can be extracted from session if available)
      'neutral', // default mood
      call.duration || 0
    );

    console.log(`[CallFinalization] Enhanced analysis complete:`, {
      callQualityScore: enhancedAnalysis.callQualityScore,
      sentiment: enhancedAnalysis.sentiment,
      outcome: enhancedAnalysis.outcome,
      keyQuestionsCount: enhancedAnalysis.keyQuestionsAsked.length,
      keyIssuesCount: enhancedAnalysis.keyIssuesDiscussed.length,
    });

    // Generate AI coaching suggestions for agent improvement
    console.log(`[CallFinalization] Generating coaching suggestions for call ${callId}`);
    const coachingSuggestions: CoachingSuggestions = await generateCoachingSuggestions(
      transcript,
      enhancedAnalysis.outcome,
      enhancedAnalysis.sentiment,
      enhancedAnalysis.agentSpeakingTime,
      enhancedAnalysis.customerSpeakingTime
    );

    console.log(`[CallFinalization] Coaching suggestions generated:`, {
      positiveHighlights: coachingSuggestions.positiveHighlights.length,
      areasToImprove: coachingSuggestions.areasToImprove.length,
      empathyScore: coachingSuggestions.empathyScore,
    });

    // Extract structured data from conversation (name, interests, callback, etc.)
    console.log(`[CallFinalization] Extracting structured call data for call ${callId}`);
    const extractedData: ExtractedCallData = await extractCallData(
      transcript,
      call.agent?.industry || undefined
    );

    console.log(`[CallFinalization] Extracted data:`, {
      itemsCount: extractedData.items.length,
      callbackRequested: extractedData.callbackRequested,
    });

    // Update call with all analysis results (basic + enhanced + coaching + extracted data)
    const updatedCall = await prisma.outboundCall.update({
      where: { id: callId },
      data: {
        // Basic analysis fields
        summary: enhancedAnalysis.summary,
        sentiment: enhancedAnalysis.sentiment,
        outcome: enhancedAnalysis.outcome as CallOutcome,

        // Enhanced analysis fields
        callQualityScore: enhancedAnalysis.callQualityScore,
        keyQuestionsAsked: enhancedAnalysis.keyQuestionsAsked,
        keyIssuesDiscussed: enhancedAnalysis.keyIssuesDiscussed,
        sentimentIntensity: enhancedAnalysis.sentimentIntensity,
        agentSpeakingTime: enhancedAnalysis.agentSpeakingTime,
        customerSpeakingTime: enhancedAnalysis.customerSpeakingTime,
        nonSpeechTime: enhancedAnalysis.nonSpeechTime,
        enhancedTranscript: enhancedAnalysis.enhancedTranscript as any,

        // AI Coaching fields
        coachingPositiveHighlights: coachingSuggestions.positiveHighlights as any,
        coachingAreasToImprove: coachingSuggestions.areasToImprove as any,
        coachingNextCallTips: coachingSuggestions.nextCallTips,
        coachingSummary: coachingSuggestions.coachingSummary,
        coachingTalkListenFeedback: coachingSuggestions.talkListenFeedback,
        coachingEmpathyScore: coachingSuggestions.empathyScore,
        coachingObjectionScore: coachingSuggestions.objectionHandlingScore,
        coachingClosingScore: coachingSuggestions.closingScore,

        // Extracted structured data from conversation
        extractedData: extractedData as any,
      },
      include: { agent: true },
    });

    console.log(`[CallFinalization] Call ${callId} updated with enhanced analysis and coaching data`);

    // Check if this call was for a RawImportRecord
    await this.updateRawImportRecordFromCall(updatedCall);

    // Use Lead Lifecycle Service for intelligent lead management
    // This handles:
    // - Finding existing leads by phone number
    // - Creating new leads or updating existing ones
    // - Merging qualification data from multiple calls
    // - Scheduling appropriate follow-ups (AI or Human)
    try {
      await leadLifecycleService.processCompletedCall(updatedCall);
      console.log(`[CallFinalization] Lead lifecycle processing completed for call ${callId}`);
    } catch (error) {
      console.error(`[CallFinalization] Error in lead lifecycle processing:`, error);
      // Fallback to legacy behavior if lifecycle service fails
      if (call.leadId) {
        await this.updateExistingLeadWithCallData(call.leadId, updatedCall);
      } else {
        const qualification = call.qualification as any;
        if (qualification && Object.keys(qualification).length > 0) {
          await this.createLeadFromCall(updatedCall, qualification);
        }
      }
    }

    // Update agent performance metrics after call finalization
    try {
      await callAnalyticsService.aggregateDailyPerformance(
        call.agent.organizationId,
        new Date()
      );
      console.log(`[CallFinalization] Agent performance updated for ${call.agent.name}`);
    } catch (error) {
      console.error('[CallFinalization] Failed to update agent performance:', error);
    }
  }

  /**
   * Generate summary from transcript
   */
  async generateSummary(transcript: any[]): Promise<string> {
    if (!openai) return '';

    try {
      const text = transcript
        .map((t: any) => `${t.role}: ${t.content}`)
        .join('\n');

      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Summarize this phone call in 2-3 sentences. Focus on key points and outcomes.',
          },
          {
            role: 'user',
            content: text,
          },
        ],
        temperature: 0.3,
        max_tokens: 150,
      });

      return completion.choices[0]?.message?.content || '';
    } catch (error) {
      return '';
    }
  }

  /**
   * Analyze sentiment of transcript
   */
  async analyzeSentiment(transcript: any[]): Promise<string> {
    if (!openai) return 'neutral';

    try {
      const userMessages = transcript
        .filter((t: any) => t.role === 'user')
        .map((t: any) => t.content)
        .join(' ');

      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Analyze the sentiment. Reply with only: positive, neutral, or negative.',
          },
          {
            role: 'user',
            content: userMessages,
          },
        ],
        temperature: 0,
        max_tokens: 10,
      });

      return completion.choices[0]?.message?.content?.toLowerCase() || 'neutral';
    } catch (error) {
      return 'neutral';
    }
  }

  /**
   * Determine call outcome from transcript
   */
  async determineOutcome(transcript: any[]): Promise<CallOutcome> {
    if (!openai) return 'NEEDS_FOLLOWUP';

    try {
      const text = transcript
        .map((t: any) => `${t.role}: ${t.content}`)
        .join('\n');

      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Based on this phone call, determine the outcome. Reply with only one of:
INTERESTED, NOT_INTERESTED, CALLBACK_REQUESTED, NEEDS_FOLLOWUP, CONVERTED`,
          },
          {
            role: 'user',
            content: text,
          },
        ],
        temperature: 0,
        max_tokens: 20,
      });

      const result = completion.choices[0]?.message?.content?.toUpperCase().trim();
      const validOutcomes: CallOutcome[] = ['INTERESTED', 'NOT_INTERESTED', 'CALLBACK_REQUESTED', 'NEEDS_FOLLOWUP', 'CONVERTED'];

      if (validOutcomes.includes(result as CallOutcome)) {
        return result as CallOutcome;
      }
      return 'NEEDS_FOLLOWUP';
    } catch (error) {
      return 'NEEDS_FOLLOWUP';
    }
  }

  /**
   * Update RawImportRecord based on call outcome
   */
  async updateRawImportRecordFromCall(call: any) {
    try {
      const rawRecord = await prisma.rawImportRecord.findFirst({
        where: {
          phone: call.phoneNumber,
          organizationId: call.agent?.organizationId,
          status: { in: ['ASSIGNED', 'CALLING'] },
          assignedAgentId: call.agentId,
        },
      });

      if (!rawRecord) return;

      let newStatus: 'INTERESTED' | 'NOT_INTERESTED' | 'NO_ANSWER' | 'CALLBACK_REQUESTED' | 'CALLING' = 'CALLING';

      switch (call.outcome) {
        case 'INTERESTED':
          newStatus = 'INTERESTED';
          break;
        case 'NOT_INTERESTED':
          newStatus = 'NOT_INTERESTED';
          break;
        case 'NO_ANSWER':
          newStatus = 'NO_ANSWER';
          break;
        case 'CALLBACK_REQUESTED':
        case 'NEEDS_FOLLOWUP':
          newStatus = 'CALLBACK_REQUESTED';
          break;
        default:
          if (call.sentiment === 'positive') {
            newStatus = 'INTERESTED';
          } else if (call.sentiment === 'negative') {
            newStatus = 'NOT_INTERESTED';
          }
      }

      const updatedRecord = await prisma.rawImportRecord.update({
        where: { id: rawRecord.id },
        data: {
          status: newStatus,
          lastCallAt: new Date(),
          callAttempts: { increment: 1 },
          outboundCallId: call.id,
          callSummary: call.summary,
          callSentiment: call.sentiment,
          interestLevel: call.sentiment === 'positive' ? 'high' :
                         call.sentiment === 'negative' ? 'low' : 'medium',
        },
      });

      console.log(`[OutboundCall] Updated raw import record ${rawRecord.id} status to ${newStatus}`);

      // Auto-convert to lead if interested
      if (newStatus === 'INTERESTED' && call.agent?.organizationId) {
        await this.convertRawImportToLead(rawRecord, call, updatedRecord);
      }
    } catch (error) {
      console.error('Error updating raw import record from call:', error);
    }
  }

  /**
   * Convert raw import record to lead
   */
  private async convertRawImportToLead(rawRecord: any, call: any, updatedRecord: any) {
    try {
      const lead = await prisma.lead.create({
        data: {
          organizationId: call.agent.organizationId,
          firstName: rawRecord.firstName,
          lastName: rawRecord.lastName,
          email: rawRecord.email,
          phone: rawRecord.phone,
          alternatePhone: rawRecord.alternatePhone,
          source: 'BULK_UPLOAD',
          sourceDetails: 'Converted from AI call - Interested',
          priority: 'HIGH',
          customFields: rawRecord.customFields || {},
        },
      });

      await prisma.rawImportRecord.update({
        where: { id: rawRecord.id },
        data: {
          status: 'CONVERTED',
          convertedLeadId: lead.id,
          convertedAt: new Date(),
        },
      });

      await prisma.bulkImport.update({
        where: { id: rawRecord.bulkImportId },
        data: {
          convertedCount: { increment: 1 },
        },
      });

      await prisma.leadNote.create({
        data: {
          leadId: lead.id,
          userId: call.agent.organizationId,
          content: `**Auto-converted from AI Call**\n\n${call.summary || 'Contact expressed interest during AI call.'}`,
          isPinned: true,
        },
      });

      console.log(`[OutboundCall] Auto-converted raw import record ${rawRecord.id} to lead ${lead.id}`);
    } catch (error) {
      console.error('Error auto-converting raw import to lead:', error);
    }
  }

  /**
   * Update existing lead with AI call data
   */
  async updateExistingLeadWithCallData(leadId: string, call: any) {
    try {
      // Create call log entry
      await prisma.callLog.create({
        data: {
          organizationId: call.agent?.organizationId,
          leadId,
          callerId: call.agent?.organizationId || call.agentId,
          phoneNumber: call.phoneNumber,
          direction: 'OUTBOUND',
          callType: 'AI',
          status: 'COMPLETED',
          duration: call.duration || 0,
          recordingUrl: call.recordingUrl,
          transcript: call.transcript ? JSON.stringify(call.transcript) : null,
          notes: call.summary,
          startedAt: call.startedAt || call.createdAt,
          endedAt: call.endedAt || new Date(),
        },
      });

      // Get a system user for notes
      const systemUser = await prisma.user.findFirst({
        where: { organizationId: call.agent?.organizationId },
      });

      // Create note with AI call summary
      if (call.summary && systemUser) {
        await prisma.leadNote.create({
          data: {
            leadId,
            userId: systemUser.id,
            content: `**AI Call Summary**\n\n${call.summary}\n\n**Sentiment:** ${call.sentiment || 'neutral'}\n**Outcome:** ${call.outcome || 'NEEDS_FOLLOWUP'}`,
            isPinned: true,
          },
        });
      }

      // Create activity
      await prisma.leadActivity.create({
        data: {
          leadId,
          type: 'CALL_MADE',
          title: 'AI Outbound Call Completed',
          description: call.summary || `Call duration: ${call.duration || 0} seconds`,
          metadata: {
            callId: call.id,
            agentName: call.agent?.name,
            outcome: call.outcome,
            sentiment: call.sentiment,
            recordingUrl: call.recordingUrl,
          },
        },
      });

      // Create follow-up if needed
      if (systemUser && (call.outcome === 'CALLBACK_REQUESTED' || call.outcome === 'NEEDS_FOLLOWUP' || call.outcome === 'INTERESTED')) {
        const scheduledAt = new Date();
        scheduledAt.setDate(scheduledAt.getDate() + (call.outcome === 'CALLBACK_REQUESTED' ? 1 : 3));

        await prisma.followUp.create({
          data: {
            leadId,
            createdById: systemUser.id,
            assigneeId: systemUser.id,
            scheduledAt,
            message: call.outcome === 'CALLBACK_REQUESTED'
              ? 'Lead requested a callback during AI call'
              : `Follow up on AI call - ${call.outcome}`,
            notes: call.summary,
          },
        });
      }

      // Update lead's custom fields
      if (call.qualification && Object.keys(call.qualification).length > 0) {
        const lead = await prisma.lead.findUnique({ where: { id: leadId } });
        const existingFields = (lead?.customFields as object) || {};

        await prisma.lead.update({
          where: { id: leadId },
          data: {
            customFields: { ...existingFields, ...call.qualification },
          },
        });
      }

      console.log(`Updated existing lead ${leadId} with AI call data`);
    } catch (error) {
      console.error('Error updating lead with call data:', error);
    }
  }

  /**
   * Create new lead from call
   */
  async createLeadFromCall(call: any, qualification: any) {
    try {
      const leadData: any = {
        organizationId: call.agent.organizationId,
        firstName: qualification.firstName || qualification.name || 'Call Lead',
        phone: call.phoneNumber,
        email: qualification.email,
        source: 'CHATBOT',
        sourceDetails: `Outbound Call - ${call.agent.name}`,
        customFields: qualification,
      };

      const lead = await prisma.lead.create({
        data: leadData,
      });

      // Update call with lead reference
      await prisma.outboundCall.update({
        where: { id: call.id },
        data: {
          leadGenerated: true,
          generatedLeadId: lead.id,
        },
      });

      // Create call log
      await prisma.callLog.create({
        data: {
          organizationId: call.agent.organizationId,
          leadId: lead.id,
          callerId: call.agent.organizationId,
          phoneNumber: call.phoneNumber,
          direction: 'OUTBOUND',
          callType: 'AI',
          status: 'COMPLETED',
          duration: call.duration || 0,
          recordingUrl: call.recordingUrl,
          transcript: call.transcript ? JSON.stringify(call.transcript) : null,
          notes: call.summary,
          startedAt: call.startedAt || call.createdAt,
          endedAt: call.endedAt || new Date(),
        },
      });

      // Get system user for notes
      const systemUser = await prisma.user.findFirst({
        where: { organizationId: call.agent.organizationId },
      });

      // Create note
      if (call.summary && systemUser) {
        await prisma.leadNote.create({
          data: {
            leadId: lead.id,
            userId: systemUser.id,
            content: `**AI Call Summary**\n\n${call.summary}\n\n**Sentiment:** ${call.sentiment || 'neutral'}\n**Outcome:** ${call.outcome || 'NEEDS_FOLLOWUP'}`,
            isPinned: true,
          },
        });
      }

      // Create activity
      await prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          type: 'CALL_MADE',
          title: 'AI Outbound Call Completed',
          description: call.summary || `Call duration: ${call.duration || 0} seconds`,
          metadata: {
            callId: call.id,
            agentName: call.agent.name,
            outcome: call.outcome,
            sentiment: call.sentiment,
            recordingUrl: call.recordingUrl,
          },
        },
      });

      // Create follow-up if needed
      if (systemUser && (call.outcome === 'CALLBACK_REQUESTED' || call.outcome === 'NEEDS_FOLLOWUP' || call.outcome === 'INTERESTED')) {
        const scheduledAt = new Date();
        scheduledAt.setDate(scheduledAt.getDate() + (call.outcome === 'CALLBACK_REQUESTED' ? 1 : 3));

        await prisma.followUp.create({
          data: {
            leadId: lead.id,
            createdById: systemUser.id,
            assigneeId: systemUser.id,
            scheduledAt,
            message: call.outcome === 'CALLBACK_REQUESTED'
              ? 'Lead requested a callback during AI call'
              : `Follow up on AI call - ${call.outcome}`,
            notes: call.summary,
          },
        });
      }

      // Update campaign stats
      if (call.campaignId) {
        await prisma.outboundCallCampaign.update({
          where: { id: call.campaignId },
          data: {
            leadsGenerated: { increment: 1 },
          },
        });
      }

      console.log(`Lead created from AI call: ${lead.id} with notes, activity, and call log`);
      return lead;
    } catch (error) {
      console.error('Error creating lead from call:', error);
    }
  }
}

export const callFinalizationService = new CallFinalizationService();
export default callFinalizationService;
