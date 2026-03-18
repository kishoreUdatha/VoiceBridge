import { prisma } from '../config/database';
import { LeadSource } from '@prisma/client';
import { outboundCallService } from '../integrations/outbound-call.service';

interface AutoAssignConfig {
  organizationId: string;
  sourceTypes: LeadSource[];      // Which lead sources to auto-assign
  aiAgentId?: string;             // Default AI agent for calling
  enableAICalling: boolean;       // Auto-trigger AI calls
  assignToCounselorId?: string;   // Fallback counselor
  callDelayMinutes: number;       // Delay before AI calls (0 = immediate)
  workingHoursOnly: boolean;      // Only call during working hours
  workingHoursStart: number;      // e.g., 9 (9 AM)
  workingHoursEnd: number;        // e.g., 18 (6 PM)
}

// Default configuration
const defaultConfig: Partial<AutoAssignConfig> = {
  enableAICalling: true,
  callDelayMinutes: 5,            // Call 5 minutes after lead creation
  workingHoursOnly: true,
  workingHoursStart: 9,
  workingHoursEnd: 18,
};

class LeadAutoAssignService {
  /**
   * Process a new lead and auto-assign to AI agent or counselor
   */
  async processNewLead(leadId: string) {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { organization: true },
    });

    if (!lead) return null;

    // Get organization's auto-assign settings
    const config = await this.getOrganizationConfig(lead.organizationId);

    // Check if this source type should be auto-assigned
    if (!config.sourceTypes.includes(lead.source)) {
      console.log(`Lead ${leadId} source ${lead.source} not in auto-assign list`);
      return null;
    }

    // Check if AI calling is enabled
    if (config.enableAICalling && config.aiAgentId) {
      return this.assignToAIAgent(lead, config);
    }

    // Fallback: Assign to counselor
    if (config.assignToCounselorId) {
      return this.assignToCounselor(lead.id, config.assignToCounselorId);
    }

    return null;
  }

  /**
   * Assign lead to AI agent for automated calling
   */
  private async assignToAIAgent(lead: any, config: AutoAssignConfig) {
    // Check working hours
    if (config.workingHoursOnly && !this.isWithinWorkingHours(config)) {
      // Schedule for next working hours
      const scheduledTime = this.getNextWorkingHoursTime(config);
      console.log(`Scheduling AI call for lead ${lead.id} at ${scheduledTime}`);

      return this.scheduleAICall(lead, config.aiAgentId!, scheduledTime);
    }

    // Calculate call time
    const callTime = new Date();
    callTime.setMinutes(callTime.getMinutes() + config.callDelayMinutes);

    if (config.callDelayMinutes > 0) {
      // Schedule delayed call
      return this.scheduleAICall(lead, config.aiAgentId!, callTime);
    }

    // Immediate call
    return this.makeAICall(lead, config.aiAgentId!);
  }

  /**
   * Make immediate AI call to lead
   */
  private async makeAICall(lead: any, agentId: string) {
    try {
      console.log(`Initiating AI call to lead ${lead.id} (${lead.phone})`);

      const call = await outboundCallService.makeSingleCall({
        agentId,
        phoneNumber: lead.phone,
        leadId: lead.id,
        contactName: `${lead.firstName} ${lead.lastName || ''}`.trim(),
        customData: {
          source: lead.source,
          email: lead.email,
        },
      });

      // Update lead with AI call info
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          customFields: {
            ...(lead.customFields as any || {}),
            aiCallInitiated: true,
            aiCallId: call.callId,
            aiCallInitiatedAt: new Date().toISOString(),
          },
        },
      });

      // Log activity
      await prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          type: 'CALL_MADE',
          title: 'AI Call Initiated',
          description: `Automated AI call initiated from ${lead.source} lead`,
          metadata: { callId: call.callId, agentId },
        },
      });

      return call;
    } catch (error) {
      console.error(`Failed to make AI call to lead ${lead.id}:`, error);
      throw error;
    }
  }

  /**
   * Schedule AI call for later
   */
  private async scheduleAICall(lead: any, agentId: string, scheduledTime: Date) {
    const scheduledCall = await prisma.scheduledCall.create({
      data: {
        organizationId: lead.organizationId,
        agentId,
        leadId: lead.id,
        phoneNumber: lead.phone,
        contactName: `${lead.firstName} ${lead.lastName || ''}`.trim(),
        scheduledAt: scheduledTime,
        callType: 'SCHEDULED',
        priority: lead.source.startsWith('AD_') ? 1 : 3, // Higher priority for ad leads
        notes: `Auto-scheduled from ${lead.source}`,
        status: 'PENDING',
      },
    });

    // Update lead
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        customFields: {
          ...(lead.customFields as any || {}),
          aiCallScheduled: true,
          aiCallScheduledAt: scheduledTime.toISOString(),
          scheduledCallId: scheduledCall.id,
        },
      },
    });

    // Log activity
    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        type: 'FOLLOWUP_SCHEDULED',
        title: 'AI Call Scheduled',
        description: `AI call scheduled for ${scheduledTime.toLocaleString()}`,
        metadata: { scheduledCallId: scheduledCall.id },
      },
    });

    return scheduledCall;
  }

  /**
   * Assign lead to counselor
   */
  private async assignToCounselor(leadId: string, counselorId: string) {
    // Create assignment
    await prisma.leadAssignment.create({
      data: {
        leadId,
        assignedToId: counselorId,
        isActive: true,
      },
    });

    // Log activity
    await prisma.leadActivity.create({
      data: {
        leadId,
        userId: counselorId,
        type: 'ASSIGNMENT_CHANGED',
        title: 'Lead Auto-Assigned',
        description: 'Lead automatically assigned to counselor',
      },
    });

    return { assigned: true, counselorId };
  }

  /**
   * Check if current time is within working hours
   */
  private isWithinWorkingHours(config: AutoAssignConfig): boolean {
    const now = new Date();
    const hour = now.getHours();
    return hour >= config.workingHoursStart && hour < config.workingHoursEnd;
  }

  /**
   * Get next working hours start time
   */
  private getNextWorkingHoursTime(config: AutoAssignConfig): Date {
    const now = new Date();
    const result = new Date(now);

    if (now.getHours() >= config.workingHoursEnd) {
      // After working hours - schedule for next day
      result.setDate(result.getDate() + 1);
    }

    result.setHours(config.workingHoursStart, 0, 0, 0);
    return result;
  }

  /**
   * Get organization's auto-assign configuration
   */
  async getOrganizationConfig(organizationId: string): Promise<AutoAssignConfig> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    const settings = (org?.settings as any) || {};
    const autoAssign = settings.autoAssign || {};

    // Get default AI agent
    let aiAgentId = autoAssign.aiAgentId;
    if (!aiAgentId) {
      const defaultAgent = await prisma.voiceAgent.findFirst({
        where: { organizationId, isActive: true },
        orderBy: { createdAt: 'asc' },
      });
      aiAgentId = defaultAgent?.id;
    }

    return {
      organizationId,
      sourceTypes: autoAssign.sourceTypes || [
        'AD_FACEBOOK',
        'AD_INSTAGRAM',
        'AD_LINKEDIN',
        'AD_GOOGLE',
        'FORM',
        'LANDING_PAGE',
        'CHATBOT',
      ],
      aiAgentId,
      enableAICalling: autoAssign.enableAICalling ?? defaultConfig.enableAICalling,
      assignToCounselorId: autoAssign.assignToCounselorId,
      callDelayMinutes: autoAssign.callDelayMinutes ?? defaultConfig.callDelayMinutes!,
      workingHoursOnly: autoAssign.workingHoursOnly ?? defaultConfig.workingHoursOnly!,
      workingHoursStart: autoAssign.workingHoursStart ?? defaultConfig.workingHoursStart!,
      workingHoursEnd: autoAssign.workingHoursEnd ?? defaultConfig.workingHoursEnd!,
    };
  }

  /**
   * Update organization's auto-assign settings
   */
  async updateOrganizationConfig(
    organizationId: string,
    config: Partial<AutoAssignConfig>
  ) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    const currentSettings = (org?.settings as any) || {};

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        settings: {
          ...currentSettings,
          autoAssign: {
            ...currentSettings.autoAssign,
            ...config,
          },
        },
      },
    });

    return this.getOrganizationConfig(organizationId);
  }
}

export const leadAutoAssignService = new LeadAutoAssignService();
