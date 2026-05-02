/**
 * Campaign Management Service - Single Responsibility Principle
 * Handles campaign CRUD operations and processing
 */

import { OutboundContactStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { complianceService } from './compliance.service';


export interface CreateCampaignData {
  organizationId: string;
  agentId: string;
  name: string;
  description?: string;
  contacts: Array<{
    phone: string;
    name?: string;
    email?: string;
    leadId?: string;
    customData?: any;
  }>;
  settings?: {
    maxConcurrentCalls?: number;
    callsBetweenHours?: { start: number; end: number };
    retryAttempts?: number;
    retryDelayMinutes?: number;
  };
  scheduledAt?: Date;
  callingMode?: 'AUTOMATIC' | 'MANUAL';
  skipDNCCheck?: boolean;
}

export interface CampaignComplianceInfo {
  totalSubmitted: number;
  allowed: number;
  blocked: number;
  blockedContacts: Array<{ phone: string; reason: string }>;
}

class CampaignManagementService {
  /**
   * Create a new outbound call campaign
   */
  async createCampaign(data: CreateCampaignData) {
    // Verify agent exists
    const agent = await prisma.voiceAgent.findUnique({
      where: { id: data.agentId },
    });

    if (!agent) {
      throw new Error('Voice agent not found');
    }

    // P0 COMPLIANCE: Filter out DNC numbers from contacts
    let allowedContacts = data.contacts;
    let blockedContacts: Array<{ phone: string; reason: string }> = [];

    if (!data.skipDNCCheck && data.contacts.length > 0) {
      const complianceResult = await complianceService.filterDNCFromContacts(
        data.organizationId,
        data.contacts
      );

      allowedContacts = complianceResult.allowed;
      blockedContacts = complianceResult.blocked;

      if (blockedContacts.length > 0) {
        console.info(`[Compliance] Campaign "${data.name}": ${blockedContacts.length} contacts blocked by DNC list`);
      }
    }

    // Create campaign
    const campaign = await prisma.outboundCallCampaign.create({
      data: {
        organizationId: data.organizationId,
        agentId: data.agentId,
        name: data.name,
        description: data.description,
        totalContacts: allowedContacts.length,
        callingMode: data.callingMode || 'AUTOMATIC',
        maxConcurrentCalls: data.settings?.maxConcurrentCalls || 1,
        callsBetweenHours: data.settings?.callsBetweenHours || { start: 9, end: 18 },
        retryAttempts: data.settings?.retryAttempts || 2,
        retryDelayMinutes: data.settings?.retryDelayMinutes || 30,
        scheduledAt: data.scheduledAt,
        status: data.scheduledAt ? 'SCHEDULED' : 'DRAFT',
      },
    });

    // Add allowed contacts
    if (allowedContacts.length > 0) {
      await prisma.outboundCallContact.createMany({
        data: allowedContacts.map(contact => ({
          campaignId: campaign.id,
          phone: contact.phone,
          name: contact.name,
          email: contact.email,
          leadId: contact.leadId,
          customData: contact.customData || {},
        })),
      });
    }

    // Add blocked contacts with SKIPPED status for audit trail
    if (blockedContacts.length > 0) {
      await prisma.outboundCallContact.createMany({
        data: blockedContacts.map(contact => ({
          campaignId: campaign.id,
          phone: contact.phone,
          name: (contact as any).name,
          email: (contact as any).email,
          leadId: (contact as any).leadId,
          customData: (contact as any).customData || {},
          status: 'SKIPPED',
          notes: `DNC blocked: ${contact.reason}`,
        })),
      });
    }

    const complianceInfo: CampaignComplianceInfo = {
      totalSubmitted: data.contacts.length,
      allowed: allowedContacts.length,
      blocked: blockedContacts.length,
      blockedContacts: blockedContacts.map(c => ({ phone: c.phone, reason: c.reason })),
    };

    return { ...campaign, complianceInfo };
  }

  /**
   * Get campaign by ID with related data
   */
  async getCampaign(campaignId: string) {
    return prisma.outboundCallCampaign.findUnique({
      where: { id: campaignId },
      include: {
        agent: true,
        _count: {
          select: {
            contacts: true,
            calls: true,
          },
        },
      },
    });
  }

  /**
   * List campaigns for an organization
   */
  async listCampaigns(organizationId: string, search?: string, limit?: number) {
    const where: any = { organizationId };

    // Add search filter
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    return prisma.outboundCallCampaign.findMany({
      where,
      include: {
        agent: {
          select: { id: true, name: true, industry: true },
        },
        _count: {
          select: { contacts: true, calls: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      ...(limit && { take: limit }),
    });
  }

  /**
   * Start a campaign
   */
  async startCampaign(campaignId: string) {
    return prisma.outboundCallCampaign.update({
      where: { id: campaignId },
      data: {
        status: 'RUNNING',
        startedAt: new Date(),
      },
      include: { agent: true },
    });
  }

  /**
   * Pause a running campaign
   */
  async pauseCampaign(campaignId: string) {
    return prisma.outboundCallCampaign.update({
      where: { id: campaignId },
      data: { status: 'PAUSED' },
    });
  }

  /**
   * Resume a paused campaign
   */
  async resumeCampaign(campaignId: string) {
    return prisma.outboundCallCampaign.update({
      where: { id: campaignId },
      data: { status: 'RUNNING' },
    });
  }

  /**
   * Get pending contacts for a campaign
   */
  async getPendingContacts(campaignId: string, limit: number) {
    return prisma.outboundCallContact.findMany({
      where: {
        campaignId,
        status: { in: ['PENDING', 'SCHEDULED'] },
        OR: [
          { nextAttemptAt: null },
          { nextAttemptAt: { lte: new Date() } },
        ],
      },
      take: limit,
    });
  }

  /**
   * Check if campaign should be marked as completed
   */
  async checkCampaignCompletion(campaignId: string): Promise<boolean> {
    const remainingContacts = await prisma.outboundCallContact.count({
      where: {
        campaignId,
        status: { in: ['PENDING', 'SCHEDULED', 'IN_PROGRESS'] },
      },
    });

    if (remainingContacts === 0) {
      await prisma.outboundCallCampaign.update({
        where: { id: campaignId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });
      return true;
    }
    return false;
  }

  /**
   * Update contact status after a call attempt
   */
  async updateContactStatus(
    contactId: string,
    status: OutboundContactStatus,
    notes?: string
  ) {
    return prisma.outboundCallContact.update({
      where: { id: contactId },
      data: {
        status,
        notes,
        lastAttemptAt: new Date(),
      },
    });
  }

  /**
   * Increment contact attempts
   */
  async incrementContactAttempts(contactId: string) {
    return prisma.outboundCallContact.update({
      where: { id: contactId },
      data: {
        attempts: { increment: 1 },
        lastAttemptAt: new Date(),
      },
    });
  }

  /**
   * Update campaign call statistics
   */
  async updateCampaignStats(
    campaignId: string,
    isSuccess: boolean,
    leadGenerated: boolean = false
  ) {
    const updateData: any = {
      completedCalls: { increment: 1 },
    };

    if (isSuccess) {
      updateData.successfulCalls = { increment: 1 };
    } else {
      updateData.failedCalls = { increment: 1 };
    }

    if (leadGenerated) {
      updateData.leadsGenerated = { increment: 1 };
    }

    return prisma.outboundCallCampaign.update({
      where: { id: campaignId },
      data: updateData,
    });
  }

  /**
   * Check if current time is within campaign calling hours
   */
  isWithinCallingHours(callsBetweenHours: { start: number; end: number }): boolean {
    const currentHour = new Date().getHours();
    return currentHour >= callsBetweenHours.start && currentHour < callsBetweenHours.end;
  }
}

export const campaignManagementService = new CampaignManagementService();
export default campaignManagementService;
