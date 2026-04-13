/**
 * Lead Lifecycle Service
 *
 * Manages the complete lead lifecycle from first contact to closure:
 * - Phone number duplicate detection
 * - Lead creation/update from AI calls
 * - Data merging from multiple interactions
 * - Follow-up scheduling (AI or human)
 * - Interaction timeline tracking
 */

import { prisma } from '../config/database';
import {
  Lead,
  OutboundCall,
  FollowUp,
  LeadActivity,
  ActivityType,
  FollowUpType,
  FollowUpStatus,
  CallOutcome,
  LeadStage
} from '@prisma/client';

// Stage slugs used for automatic progression
const STAGE_SLUGS = {
  NEW: 'NEW',
  CONTACTED: 'CONTACTED',
  QUALIFIED: 'QUALIFIED',
  NEGOTIATION: 'NEGOTIATION',
  FOLLOW_UP: 'FOLLOW_UP',
  WON: 'WON',
  LOST: 'LOST',
} as const;

// Completed stages where follow-ups should not be allowed
const COMPLETED_STAGES = ['Won', 'WON', 'Lost', 'LOST', 'Closed', 'CLOSED', 'Admitted', 'ADMITTED', 'Enrolled', 'ENROLLED', 'Dropped', 'DROPPED'];

// Stage progression order (by slug)
const STAGE_ORDER = [
  STAGE_SLUGS.NEW,
  STAGE_SLUGS.CONTACTED,
  STAGE_SLUGS.QUALIFIED,
  STAGE_SLUGS.NEGOTIATION,
  STAGE_SLUGS.FOLLOW_UP,
  STAGE_SLUGS.WON,
];

const POSITIVE_OUTCOMES: CallOutcome[] = ['INTERESTED', 'CALLBACK_REQUESTED', 'CONVERTED'];

interface QualificationData {
  name?: string;
  customerName?: string;
  email?: string;
  phone?: string;
  company?: string;
  location?: string;
  city?: string;
  interest?: string;
  budget?: string;
  timeline?: string;
  [key: string]: any;
}

interface CallData {
  id: string;
  phoneNumber: string;
  outcome?: CallOutcome | null;
  qualification?: QualificationData | null;
  summary?: string | null;
  sentiment?: string | null;
  duration?: number | null;
  agentId: string;
  campaignId?: string | null;
}

interface FollowUpConfig {
  scheduledAt: Date;
  followUpType: FollowUpType;
  voiceAgentId?: string;
  message?: string;
  assigneeId: string;
  createdById: string;
}

class LeadLifecycleService {

  /**
   * Find existing lead by phone number
   */
  async findLeadByPhone(organizationId: string, phone: string): Promise<Lead | null> {
    // Normalize phone number (remove spaces, dashes, etc.)
    const normalizedPhone = this.normalizePhone(phone);

    // Search for exact match and variations
    const lead = await prisma.lead.findFirst({
      where: {
        organizationId,
        OR: [
          { phone: normalizedPhone },
          { phone: phone },
          { phone: { contains: normalizedPhone.slice(-10) } }, // Last 10 digits
          { alternatePhone: normalizedPhone },
          { alternatePhone: phone },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    return lead;
  }

  /**
   * Process completed call - either create new lead or update existing
   * Accepts either full call object (from callFinalizationService) or separate params
   */
  async processCompletedCall(
    callOrOrgId: any,
    callDataOrUserId?: CallData | string,
    userId?: string
  ): Promise<{
    lead: Lead;
    isNew: boolean;
    isUpdated: boolean;
    followUpScheduled: boolean;
  }> {
    // Handle both call patterns:
    // 1. processCompletedCall(call) - from callFinalizationService
    // 2. processCompletedCall(orgId, callData, userId) - direct call
    let organizationId: string;
    let callData: CallData;
    let effectiveUserId: string | undefined;

    if (typeof callOrOrgId === 'string') {
      // Pattern 2: separate parameters
      organizationId = callOrOrgId;
      callData = callDataOrUserId as CallData;
      effectiveUserId = userId;
    } else {
      // Pattern 1: full call object from callFinalizationService
      const call = callOrOrgId;
      if (!call.agent?.organizationId) {
        throw new Error('Call must have agent with organizationId');
      }
      organizationId = call.agent.organizationId;
      callData = {
        id: call.id,
        phoneNumber: call.phoneNumber,
        outcome: call.outcome,
        qualification: call.qualification as QualificationData,
        summary: call.summary,
        sentiment: call.sentiment,
        duration: call.duration,
        agentId: call.agentId,
        campaignId: call.campaignId,
      };
      effectiveUserId = undefined;
    }

    // 1. Check for existing lead
    const existingLead = await this.findLeadByPhone(organizationId, callData.phoneNumber);

    let lead: Lead;
    let isNew = false;
    let isUpdated = false;

    if (existingLead) {
      // 2a. Update existing lead with new data
      lead = await this.updateLeadFromCall(existingLead, callData, effectiveUserId);
      isUpdated = true;

      // Log activity
      await this.logActivity(lead.id, effectiveUserId, ActivityType.AI_CALL_COMPLETED,
        'Follow-up call completed', {
          callId: callData.id,
          outcome: callData.outcome,
          sentiment: callData.sentiment,
          isFollowUp: true,
          callNumber: (existingLead.totalCalls || 0) + 1,
        }
      );

    } else {
      // 2b. Create new lead
      lead = await this.createLeadFromCall(organizationId, callData, effectiveUserId);
      isNew = true;

      // Log activity
      await this.logActivity(lead.id, effectiveUserId, ActivityType.LEAD_CREATED,
        'Lead created from AI call', {
          callId: callData.id,
          outcome: callData.outcome,
          sentiment: callData.sentiment,
          source: 'AI_CALL',
        }
      );
    }

    // 3. Link call to lead
    await prisma.outboundCall.update({
      where: { id: callData.id },
      data: {
        existingLeadId: lead.id,
        leadGenerated: isNew,
        generatedLeadId: isNew ? lead.id : undefined,
        isFollowUpCall: !isNew,
        followUpNumber: (existingLead?.totalCalls || 0) + 1,
      },
    });

    // 4. Schedule follow-up if needed
    let followUpScheduled = false;
    if (this.shouldScheduleFollowUp(callData.outcome)) {
      await this.scheduleAutoFollowUp(lead, callData, effectiveUserId);
      followUpScheduled = true;
    }

    return { lead, isNew, isUpdated, followUpScheduled };
  }

  /**
   * Create a new lead from call data
   */
  private async createLeadFromCall(
    organizationId: string,
    callData: CallData,
    userId?: string
  ): Promise<Lead> {
    const qualification = callData.qualification || {};

    // Extract name from qualification
    const fullName = qualification.name || qualification.customerName || '';
    const nameParts = fullName.split(' ');
    const firstName = nameParts[0] || 'Unknown';
    const lastName = nameParts.slice(1).join(' ') || undefined;

    // Get default stage for new leads
    const defaultStage = await prisma.leadStage.findFirst({
      where: { organizationId, isDefault: true },
    });

    // Determine initial stage based on call outcome
    let initialStageSlug: string = STAGE_SLUGS.NEW;
    if (callData.outcome === 'CONVERTED') {
      initialStageSlug = STAGE_SLUGS.WON;
    } else if (callData.outcome === 'NOT_INTERESTED') {
      initialStageSlug = STAGE_SLUGS.LOST;
    } else if (POSITIVE_OUTCOMES.includes(callData.outcome as CallOutcome)) {
      initialStageSlug = STAGE_SLUGS.CONTACTED;
    }

    // Get the appropriate stage for this organization
    const initialStage = await this.getStageBySlug(organizationId, initialStageSlug);

    const lead = await prisma.lead.create({
      data: {
        organizationId,
        firstName,
        lastName,
        phone: this.normalizePhone(callData.phoneNumber),
        email: qualification.email,
        source: 'AI_CALL' as any,
        sourceDetails: `AI Voice Agent Call - ${callData.campaignId ? 'Campaign' : 'Direct'}`,
        stageId: initialStage?.id || defaultStage?.id,
        city: qualification.city || qualification.location,
        customFields: {
          aiCallData: {
            firstCallId: callData.id,
            firstCallOutcome: callData.outcome,
            firstCallSentiment: callData.sentiment,
            firstCallSummary: callData.summary,
          },
          qualification: qualification,
        },
        totalCalls: 1,
        lastContactedAt: new Date(),
      },
    });

    // Log initial stage if not NEW
    if (initialStageSlug !== STAGE_SLUGS.NEW) {
      await this.logActivity(lead.id, userId, ActivityType.STAGE_CHANGED,
        `Initial stage set to ${initialStageSlug}`, {
          previousStage: 'NEW',
          newStage: initialStageSlug,
          trigger: 'AUTO_PROGRESSION',
          callOutcome: callData.outcome,
          reason: this.getStageChangeReason(callData.outcome, initialStageSlug),
        }
      );
    }

    return lead;
  }

  /**
   * Update existing lead with new call data
   */
  private async updateLeadFromCall(
    existingLead: Lead,
    callData: CallData,
    userId?: string
  ): Promise<Lead> {
    const qualification = callData.qualification || {};
    const existingCustomFields = (existingLead.customFields as any) || {};

    // Merge qualification data
    const mergedQualification = this.mergeQualificationData(
      existingCustomFields.qualification || {},
      qualification
    );

    // Track call history
    const callHistory = existingCustomFields.callHistory || [];
    callHistory.push({
      callId: callData.id,
      timestamp: new Date().toISOString(),
      outcome: callData.outcome,
      sentiment: callData.sentiment,
      summary: callData.summary,
      newDataCaptured: Object.keys(qualification).length > 0,
    });

    // Update lead with merged data
    let lead = await prisma.lead.update({
      where: { id: existingLead.id },
      data: {
        // Update fields if new data is better
        email: qualification.email || existingLead.email,
        city: qualification.city || qualification.location || existingLead.city,

        // Update custom fields with merged data
        customFields: {
          ...existingCustomFields,
          qualification: mergedQualification,
          callHistory,
          lastCallData: {
            callId: callData.id,
            outcome: callData.outcome,
            sentiment: callData.sentiment,
            summary: callData.summary,
            timestamp: new Date().toISOString(),
          },
        },

        // Update tracking fields
        totalCalls: (existingLead.totalCalls || 0) + 1,
        lastContactedAt: new Date(),
      },
    });

    // Log data update activity if new data was captured
    if (Object.keys(qualification).length > 0) {
      await this.logActivity(lead.id, userId, ActivityType.DATA_CAPTURED,
        'New information captured from call', {
          callId: callData.id,
          fieldsUpdated: Object.keys(qualification),
        }
      );
    }

    // Get current stage slug for progression logic
    const currentStage = existingLead.stageId
      ? await prisma.leadStage.findUnique({ where: { id: existingLead.stageId } })
      : null;
    const currentStageSlug = currentStage?.slug || null;

    // Automatic stage progression based on call outcome
    const newStageSlug = await this.determineNewStage(
      lead.organizationId,
      currentStageSlug,
      callData.outcome,
      (existingLead.totalCalls || 0) + 1,
      callData.sentiment
    );

    if (newStageSlug && newStageSlug !== currentStageSlug) {
      await this.updateLeadStage(
        lead.id,
        lead.organizationId,
        newStageSlug,
        currentStageSlug,
        callData.outcome,
        userId
      );

      // Update the returned lead object with new stage
      lead = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } });
    }

    return lead;
  }

  /**
   * Merge qualification data from multiple calls
   */
  private mergeQualificationData(
    existing: QualificationData,
    newData: QualificationData
  ): QualificationData {
    const merged: QualificationData = { ...existing };

    for (const [key, value] of Object.entries(newData)) {
      if (value !== null && value !== undefined && value !== '') {
        // Only overwrite if new value exists and old value is empty
        if (!merged[key] || merged[key] === '' || merged[key] === null) {
          merged[key] = value;
        } else if (typeof value === 'string' && value.length > (merged[key] as string).length) {
          // Or if new value is more detailed (longer string)
          merged[key] = value;
        }
      }
    }

    // Track merge history
    merged._mergeHistory = merged._mergeHistory || [];
    merged._mergeHistory.push({
      timestamp: new Date().toISOString(),
      fieldsAdded: Object.keys(newData).filter(k => !existing[k]),
      fieldsUpdated: Object.keys(newData).filter(k => existing[k] && existing[k] !== newData[k]),
    });

    return merged;
  }

  /**
   * Determine if follow-up should be scheduled based on outcome
   */
  private shouldScheduleFollowUp(outcome?: CallOutcome | null): boolean {
    const followUpOutcomes: CallOutcome[] = [
      'INTERESTED',
      'CALLBACK_REQUESTED',
      'NEEDS_FOLLOWUP',
      'NO_ANSWER',
      'BUSY',
      'VOICEMAIL',
    ];

    return outcome ? followUpOutcomes.includes(outcome) : false;
  }

  /**
   * Schedule automatic follow-up based on call outcome
   */
  private async scheduleAutoFollowUp(
    lead: Lead,
    callData: CallData,
    userId?: string
  ): Promise<FollowUp | null> {
    // Get voice agent settings
    const agent = await prisma.voiceAgent.findUnique({
      where: { id: callData.agentId },
    });

    if (!agent) return null;

    // Determine follow-up timing based on outcome
    const followUpDelay = this.getFollowUpDelay(callData.outcome);
    const scheduledAt = new Date(Date.now() + followUpDelay);

    // Determine follow-up type
    let followUpType: FollowUpType = 'AI_CALL';

    // If interested or callback requested, may need human touch
    if (callData.outcome === 'INTERESTED' && (lead.totalCalls || 0) >= 2) {
      followUpType = 'HUMAN_CALL';
    }

    // Get or create system user for assignment
    const assignee = await this.getDefaultAssignee(lead.organizationId, agent.defaultAssigneeId);
    if (!assignee) return null;

    const followUp = await prisma.followUp.create({
      data: {
        leadId: lead.id,
        assigneeId: assignee.id,
        createdById: userId || assignee.id,
        scheduledAt,
        followUpType,
        voiceAgentId: followUpType === 'AI_CALL' ? callData.agentId : undefined,
        sourceCallId: callData.id,
        message: this.getFollowUpMessage(callData.outcome),
        status: 'UPCOMING',
      },
    });

    // Update lead with next follow-up date
    await prisma.lead.update({
      where: { id: lead.id },
      data: { nextFollowUpAt: scheduledAt },
    });

    // Log activity
    await this.logActivity(lead.id, userId, ActivityType.FOLLOWUP_SCHEDULED,
      `${followUpType === 'AI_CALL' ? 'AI' : 'Human'} follow-up scheduled`, {
        followUpId: followUp.id,
        scheduledAt: scheduledAt.toISOString(),
        followUpType,
        reason: callData.outcome,
      }
    );

    return followUp;
  }

  /**
   * Get follow-up delay based on outcome
   */
  private getFollowUpDelay(outcome?: CallOutcome | null): number {
    const delays: Record<string, number> = {
      CALLBACK_REQUESTED: 4 * 60 * 60 * 1000,  // 4 hours
      INTERESTED: 24 * 60 * 60 * 1000,         // 1 day
      NEEDS_FOLLOWUP: 24 * 60 * 60 * 1000,     // 1 day
      NO_ANSWER: 2 * 60 * 60 * 1000,           // 2 hours
      BUSY: 1 * 60 * 60 * 1000,                // 1 hour
      VOICEMAIL: 4 * 60 * 60 * 1000,           // 4 hours
    };

    return delays[outcome || ''] || 24 * 60 * 60 * 1000; // Default 1 day
  }

  /**
   * Get follow-up message based on outcome
   */
  private getFollowUpMessage(outcome?: CallOutcome | null): string {
    const messages: Record<string, string> = {
      CALLBACK_REQUESTED: 'Customer requested a callback',
      INTERESTED: 'Customer showed interest, follow up to close',
      NEEDS_FOLLOWUP: 'Needs additional follow-up',
      NO_ANSWER: 'No answer on previous call, retry',
      BUSY: 'Customer was busy, retry later',
      VOICEMAIL: 'Left voicemail, follow up',
    };

    return messages[outcome || ''] || 'Scheduled follow-up call';
  }

  /**
   * Schedule a manual follow-up
   * Validates that lead is not in a completed stage (Won, Lost, Closed, etc.)
   */
  async scheduleFollowUp(
    leadId: string,
    config: FollowUpConfig
  ): Promise<FollowUp> {
    // Check if lead exists and get its stage
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { stage: { select: { name: true } } },
    });

    if (!lead) {
      throw new Error('Lead not found');
    }

    // Check if lead is in a completed stage
    if (lead.stage && COMPLETED_STAGES.includes(lead.stage.name)) {
      throw new Error(`Cannot schedule follow-up for a lead in "${lead.stage.name}" stage. The lead has already been closed.`);
    }

    const followUp = await prisma.followUp.create({
      data: {
        leadId,
        assigneeId: config.assigneeId,
        createdById: config.createdById,
        scheduledAt: config.scheduledAt,
        followUpType: config.followUpType,
        voiceAgentId: config.voiceAgentId,
        message: config.message,
        status: 'UPCOMING',
      },
    });

    // Update lead
    await prisma.lead.update({
      where: { id: leadId },
      data: { nextFollowUpAt: config.scheduledAt },
    });

    // Log activity
    await this.logActivity(leadId, config.createdById, ActivityType.FOLLOWUP_SCHEDULED,
      `Follow-up scheduled`, {
        followUpId: followUp.id,
        scheduledAt: config.scheduledAt.toISOString(),
        followUpType: config.followUpType,
      }
    );

    return followUp;
  }

  /**
   * Execute pending AI follow-ups
   * Returns array of results for each follow-up processed
   */
  async executePendingAIFollowUps(): Promise<Array<{ followUpId: string; success: boolean; error?: string }>> {
    const now = new Date();

    // Find due AI follow-ups that haven't exceeded max attempts
    const dueFollowUps = await prisma.followUp.findMany({
      where: {
        followUpType: 'AI_CALL',
        status: 'UPCOMING',
        scheduledAt: { lte: now },
      },
      include: {
        lead: true,
        voiceAgent: true,
      },
      take: 10, // Process in batches
    });

    // Filter out follow-ups that have exceeded max attempts
    const eligibleFollowUps = dueFollowUps.filter(f => f.attemptCount < f.maxAttempts);

    const results: Array<{ followUpId: string; success: boolean; error?: string }> = [];

    for (const followUp of eligibleFollowUps) {
      try {
        if (!followUp.voiceAgent || !followUp.lead) {
          await this.markFollowUpFailed(followUp.id, 'Missing agent or lead');
          results.push({ followUpId: followUp.id, success: false, error: 'Missing agent or lead' });
          continue;
        }

        // Trigger AI call
        const call = await this.triggerAICallForLead(
          followUp.lead,
          followUp.voiceAgent.id,
          followUp.id
        );

        // Update follow-up
        await prisma.followUp.update({
          where: { id: followUp.id },
          data: {
            outboundCallId: call.id,
            attemptCount: followUp.attemptCount + 1,
            lastAttemptAt: now,
            status: 'COMPLETED',
            completedAt: now,
          },
        });

        results.push({ followUpId: followUp.id, success: true });
      } catch (error: any) {
        console.error(`[LeadLifecycle] Failed to execute follow-up ${followUp.id}:`, error);

        await prisma.followUp.update({
          where: { id: followUp.id },
          data: {
            attemptCount: followUp.attemptCount + 1,
            lastAttemptAt: now,
          },
        });

        results.push({ followUpId: followUp.id, success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * Trigger AI call for existing lead
   */
  async triggerAICallForLead(
    lead: Lead,
    voiceAgentId: string,
    followUpId?: string
  ): Promise<OutboundCall> {
    // Import job queue service to add call job
    const { jobQueueService } = await import('./job-queue.service');

    // Create outbound call record
    const call = await prisma.outboundCall.create({
      data: {
        agentId: voiceAgentId,
        phoneNumber: lead.phone,
        existingLeadId: lead.id,
        isFollowUpCall: true,
        followUpNumber: (lead.totalCalls || 0) + 1,
        status: 'INITIATED',
      },
    });

    // Queue the call
    await jobQueueService.addJob('SCHEDULED_CALL', {
      callId: call.id,
      phoneNumber: lead.phone,
      agentId: voiceAgentId,
      leadId: lead.id,
      isFollowUp: true,
      followUpId,
      context: {
        leadName: `${lead.firstName} ${lead.lastName || ''}`.trim(),
        previousCalls: lead.totalCalls || 0,
        customFields: lead.customFields,
      },
    }, {
      organizationId: lead.organizationId,
    });

    return call;
  }

  /**
   * Get lead timeline with all interactions
   */
  async getLeadTimeline(leadId: string): Promise<{
    activities: LeadActivity[];
    calls: OutboundCall[];
    followUps: FollowUp[];
  }> {
    const [activities, calls, followUps] = await Promise.all([
      prisma.leadActivity.findMany({
        where: { leadId },
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
        take: 50,
      }),
      prisma.outboundCall.findMany({
        where: { existingLeadId: leadId },
        orderBy: { createdAt: 'desc' },
        include: { agent: { select: { id: true, name: true } } },
      }),
      prisma.followUp.findMany({
        where: { leadId },
        orderBy: { scheduledAt: 'desc' },
        include: {
          assignee: { select: { id: true, firstName: true, lastName: true } },
          voiceAgent: { select: { id: true, name: true } },
        },
      }),
    ]);

    return { activities, calls, followUps };
  }

  /**
   * Get all calls for a lead
   */
  async getLeadCalls(leadId: string): Promise<OutboundCall[]> {
    return prisma.outboundCall.findMany({
      where: { existingLeadId: leadId },
      orderBy: { createdAt: 'desc' },
      include: {
        agent: { select: { id: true, name: true } },
        campaign: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * Log activity to lead timeline
   */
  private async logActivity(
    leadId: string,
    userId: string | undefined,
    type: ActivityType,
    title: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await prisma.leadActivity.create({
      data: {
        leadId,
        userId,
        type,
        title,
        description: metadata ? JSON.stringify(metadata) : undefined,
        metadata: metadata || {},
      },
    });
  }

  /**
   * Mark follow-up as failed
   */
  private async markFollowUpFailed(followUpId: string, reason: string): Promise<void> {
    await prisma.followUp.update({
      where: { id: followUpId },
      data: {
        status: 'MISSED',
        notes: reason,
      },
    });
  }

  /**
   * Get default assignee for follow-ups
   */
  private async getDefaultAssignee(
    organizationId: string,
    preferredId?: string | null
  ): Promise<{ id: string } | null> {
    if (preferredId) {
      const user = await prisma.user.findUnique({
        where: { id: preferredId },
        select: { id: true },
      });
      if (user) return user;
    }

    // Get first admin user
    return prisma.user.findFirst({
      where: {
        organizationId,
        role: { slug: 'admin' },
      },
      select: { id: true },
    });
  }

  /**
   * Normalize phone number
   */
  private normalizePhone(phone: string): string {
    // Remove all non-digit characters except +
    let normalized = phone.replace(/[^\d+]/g, '');

    // Ensure it starts with + if it has country code
    if (normalized.length > 10 && !normalized.startsWith('+')) {
      normalized = '+' + normalized;
    }

    return normalized;
  }

  /**
   * Get or create a lead stage by slug
   */
  private async getStageBySlug(
    organizationId: string,
    slug: string
  ): Promise<LeadStage | null> {
    // Try to find existing stage
    let stage = await prisma.leadStage.findFirst({
      where: { organizationId, slug, isActive: true },
    });

    if (!stage) {
      // Create the stage if it doesn't exist
      const stageConfig: Record<string, { name: string; color: string; order: number }> = {
        NEW: { name: 'New', color: '#3B82F6', order: 1 },
        CONTACTED: { name: 'Contacted', color: '#8B5CF6', order: 2 },
        QUALIFIED: { name: 'Qualified', color: '#10B981', order: 3 },
        NEGOTIATION: { name: 'Negotiation', color: '#F59E0B', order: 4 },
        FOLLOW_UP: { name: 'Follow Up', color: '#6366F1', order: 5 },
        WON: { name: 'Won', color: '#22C55E', order: 6 },
        LOST: { name: 'Lost', color: '#EF4444', order: 7 },
      };

      const config = stageConfig[slug];
      if (config) {
        stage = await prisma.leadStage.create({
          data: {
            organizationId,
            slug,
            name: config.name,
            color: config.color,
            order: config.order,
            isDefault: slug === 'NEW',
          },
        });
      }
    }

    return stage;
  }

  /**
   * Determine new lead stage based on call outcome and current state
   * Implements automatic stage progression rules
   */
  private async determineNewStage(
    organizationId: string,
    currentStageSlug: string | null,
    callOutcome: CallOutcome | null | undefined,
    totalCalls: number,
    sentiment?: string | null
  ): Promise<string | null> {
    if (!callOutcome) return null;

    // Direct conversion - always move to WON
    if (callOutcome === 'CONVERTED') {
      return STAGE_SLUGS.WON;
    }

    // Not interested - move to LOST
    if (callOutcome === 'NOT_INTERESTED') {
      return STAGE_SLUGS.LOST;
    }

    // For positive outcomes, determine progression
    if (POSITIVE_OUTCOMES.includes(callOutcome)) {
      const currentIndex = currentStageSlug
        ? STAGE_ORDER.indexOf(currentStageSlug as any)
        : -1;

      // If already WON or LOST, don't change
      if (currentStageSlug === STAGE_SLUGS.WON || currentStageSlug === STAGE_SLUGS.LOST) {
        return null;
      }

      // First positive call - move to CONTACTED
      if (currentIndex < 1) {
        return STAGE_SLUGS.CONTACTED;
      }

      // Multiple positive calls - progress further
      // 2+ positive calls with positive sentiment -> QUALIFIED
      if (totalCalls >= 2 && sentiment === 'positive' && currentIndex < 2) {
        return STAGE_SLUGS.QUALIFIED;
      }

      // 3+ positive calls -> NEGOTIATION
      if (totalCalls >= 3 && currentIndex < 3) {
        return STAGE_SLUGS.NEGOTIATION;
      }
    }

    // No stage change needed
    return null;
  }

  /**
   * Update lead stage and log the change
   */
  private async updateLeadStage(
    leadId: string,
    organizationId: string,
    newStageSlug: string,
    previousStageSlug: string | null,
    callOutcome: CallOutcome | null | undefined,
    userId?: string
  ): Promise<void> {
    // Get or create the new stage
    const newStage = await this.getStageBySlug(organizationId, newStageSlug);
    if (!newStage) {
      console.error(`[LeadLifecycle] Could not find/create stage: ${newStageSlug}`);
      return;
    }

    // Update lead stage
    await prisma.lead.update({
      where: { id: leadId },
      data: { stageId: newStage.id },
    });

    // Log status change activity
    await this.logActivity(leadId, userId, ActivityType.STAGE_CHANGED,
      `Stage changed: ${previousStageSlug || 'NEW'} → ${newStageSlug}`, {
        previousStage: previousStageSlug || 'NEW',
        newStage: newStageSlug,
        trigger: 'AUTO_PROGRESSION',
        callOutcome,
        reason: this.getStageChangeReason(callOutcome, newStageSlug),
      }
    );

    console.log(`[LeadLifecycle] Auto-progressed lead ${leadId}: ${previousStageSlug || 'NEW'} → ${newStageSlug} (outcome: ${callOutcome})`);
  }

  /**
   * Get human-readable reason for stage change
   */
  private getStageChangeReason(
    outcome: CallOutcome | null | undefined,
    newStageSlug: string
  ): string {
    if (newStageSlug === STAGE_SLUGS.WON) {
      return 'Lead converted during call';
    }
    if (newStageSlug === STAGE_SLUGS.LOST) {
      return 'Lead expressed no interest';
    }
    if (newStageSlug === STAGE_SLUGS.CONTACTED) {
      return 'First successful contact made';
    }
    if (newStageSlug === STAGE_SLUGS.QUALIFIED) {
      return 'Multiple positive interactions - lead qualified';
    }
    if (newStageSlug === STAGE_SLUGS.NEGOTIATION) {
      return 'Strong interest shown - entering negotiation';
    }
    return `Auto-progressed based on ${outcome} outcome`;
  }

  /**
   * Auto-complete pending follow-ups and remove "Follow Up" tag when a lead moves to a completed stage
   * Called when lead stage is updated to Won, Lost, Closed, Admitted, Enrolled, or Dropped
   */
  async completeFollowUpsOnStageChange(leadId: string, newStageName: string, userId?: string): Promise<number> {
    // Check if the new stage is a completed stage
    if (!COMPLETED_STAGES.includes(newStageName)) {
      return 0;
    }

    let actionsPerformed = 0;

    // 1. Find and complete all pending follow-ups for this lead
    const pendingFollowUps = await prisma.followUp.findMany({
      where: {
        leadId,
        status: 'UPCOMING',
      },
    });

    if (pendingFollowUps.length > 0) {
      const now = new Date();
      await prisma.followUp.updateMany({
        where: {
          leadId,
          status: 'UPCOMING',
        },
        data: {
          status: 'COMPLETED',
          completedAt: now,
          notes: `Auto-completed: Lead moved to "${newStageName}" stage`,
        },
      });

      // Clear nextFollowUpAt on the lead
      await prisma.lead.update({
        where: { id: leadId },
        data: { nextFollowUpAt: null },
      });

      actionsPerformed += pendingFollowUps.length;
    }

    // 2. Remove "Follow Up" tag from this lead
    const followUpTag = await prisma.leadTag.findFirst({
      where: {
        OR: [
          { name: 'Follow Up' },
          { name: 'follow up' },
          { name: 'Follow-Up' },
          { name: 'FollowUp' },
        ],
      },
    });

    if (followUpTag) {
      const tagRemoved = await prisma.leadTagAssignment.deleteMany({
        where: {
          leadId,
          tagId: followUpTag.id,
        },
      });

      if (tagRemoved.count > 0) {
        actionsPerformed += 1;
      }
    }

    // Log activity
    if (userId && actionsPerformed > 0) {
      const message = pendingFollowUps.length > 0
        ? `${pendingFollowUps.length} pending follow-up(s) auto-completed and "Follow Up" tag removed due to stage change to "${newStageName}"`
        : `"Follow Up" tag removed due to stage change to "${newStageName}"`;

      await this.logActivity(leadId, userId, ActivityType.NOTE_ADDED, message,
        { completedCount: pendingFollowUps.length, newStage: newStageName }
      );
    }

    return actionsPerformed;
  }

  /**
   * Check if a stage name is a completed stage
   */
  isCompletedStage(stageName: string): boolean {
    return COMPLETED_STAGES.includes(stageName);
  }
}

export const leadLifecycleService = new LeadLifecycleService();
export default leadLifecycleService;
