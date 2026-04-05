/**
 * Lead SLA Service
 * Handles SLA tracking, breach detection, and escalation
 */

import { prisma } from '../config/database';
import { LeadSlaConfig, Lead, Prisma } from '@prisma/client';

interface SlaCondition {
  field: string;
  operator: string;
  value: any;
}

interface SlaStatus {
  leadId: string;
  slaConfigId: string;
  slaConfigName: string;
  firstResponseDue: Date | null;
  firstResponseAt: Date | null;
  firstResponseBreached: boolean;
  followUpDue: Date | null;
  lastFollowUpAt: Date | null;
  followUpBreached: boolean;
  resolutionDue: Date | null;
  resolvedAt: Date | null;
  resolutionBreached: boolean;
  overallStatus: 'ON_TRACK' | 'AT_RISK' | 'BREACHED';
}

export class LeadSlaService {
  // ==================== SLA Config CRUD ====================

  /**
   * Create an SLA configuration
   */
  async createSlaConfig(
    organizationId: string,
    data: {
      name: string;
      description?: string;
      firstResponseMinutes?: number;
      followUpMinutes?: number;
      resolutionMinutes?: number;
      workingHoursOnly?: boolean;
      workingHoursStart?: string;
      workingHoursEnd?: string;
      workingDays?: number[];
      escalationEnabled?: boolean;
      escalationMinutes?: number;
      escalationUserId?: string;
      conditions?: SlaCondition[];
      isDefault?: boolean;
    }
  ): Promise<LeadSlaConfig> {
    // If setting as default, unset other defaults
    if (data.isDefault) {
      await prisma.leadSlaConfig.updateMany({
        where: { organizationId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return prisma.leadSlaConfig.create({
      data: {
        organizationId,
        name: data.name,
        description: data.description,
        firstResponseMinutes: data.firstResponseMinutes || 60,
        followUpMinutes: data.followUpMinutes || 1440,
        resolutionMinutes: data.resolutionMinutes,
        workingHoursOnly: data.workingHoursOnly ?? true,
        workingHoursStart: data.workingHoursStart || '09:00',
        workingHoursEnd: data.workingHoursEnd || '18:00',
        workingDays: data.workingDays as any || [1, 2, 3, 4, 5],
        escalationEnabled: data.escalationEnabled || false,
        escalationMinutes: data.escalationMinutes,
        escalationUserId: data.escalationUserId,
        conditions: data.conditions as any || [],
        isDefault: data.isDefault || false,
      },
    });
  }

  /**
   * Update an SLA configuration
   */
  async updateSlaConfig(
    configId: string,
    organizationId: string,
    data: Partial<{
      name: string;
      description: string;
      firstResponseMinutes: number;
      followUpMinutes: number;
      resolutionMinutes: number;
      workingHoursOnly: boolean;
      workingHoursStart: string;
      workingHoursEnd: string;
      workingDays: number[];
      escalationEnabled: boolean;
      escalationMinutes: number;
      escalationUserId: string;
      conditions: SlaCondition[];
      isActive: boolean;
      isDefault: boolean;
    }>
  ): Promise<LeadSlaConfig> {
    // If setting as default, unset other defaults
    if (data.isDefault) {
      await prisma.leadSlaConfig.updateMany({
        where: { organizationId, isDefault: true, id: { not: configId } },
        data: { isDefault: false },
      });
    }

    return prisma.leadSlaConfig.update({
      where: { id: configId, organizationId },
      data: {
        ...data,
        workingDays: data.workingDays as any,
        conditions: data.conditions as any,
      },
    });
  }

  /**
   * Delete an SLA configuration
   */
  async deleteSlaConfig(configId: string, organizationId: string): Promise<void> {
    await prisma.leadSlaConfig.delete({
      where: { id: configId, organizationId },
    });
  }

  /**
   * Get all SLA configurations
   */
  async getSlaConfigs(organizationId: string): Promise<LeadSlaConfig[]> {
    return prisma.leadSlaConfig.findMany({
      where: { organizationId },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  /**
   * Get a single SLA configuration
   */
  async getSlaConfig(configId: string, organizationId: string): Promise<LeadSlaConfig | null> {
    return prisma.leadSlaConfig.findFirst({
      where: { id: configId, organizationId },
    });
  }

  // ==================== SLA Tracking ====================

  /**
   * Get applicable SLA config for a lead
   */
  async getApplicableSlaConfig(leadId: string, organizationId: string): Promise<LeadSlaConfig | null> {
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId },
    });

    if (!lead) {
      return null;
    }

    // Get all active SLA configs
    const configs = await prisma.leadSlaConfig.findMany({
      where: { organizationId, isActive: true },
      orderBy: { isDefault: 'asc' }, // Non-default first (more specific)
    });

    // Find first matching config
    for (const config of configs) {
      if (this.checkSlaConditions(lead, config)) {
        return config;
      }
    }

    // Return default if no specific match
    return configs.find((c) => c.isDefault) || null;
  }

  /**
   * Check if lead matches SLA conditions
   */
  private checkSlaConditions(lead: Lead, config: LeadSlaConfig): boolean {
    const conditions = config.conditions as SlaCondition[];

    if (!conditions || conditions.length === 0) {
      return config.isDefault; // Only match default if no conditions
    }

    return conditions.every((condition) => {
      const leadValue = (lead as any)[condition.field];

      switch (condition.operator) {
        case 'equals':
          return leadValue === condition.value;
        case 'in':
          return Array.isArray(condition.value) && condition.value.includes(leadValue);
        default:
          return false;
      }
    });
  }

  /**
   * Calculate SLA due date considering working hours
   */
  calculateDueDate(
    startDate: Date,
    minutes: number,
    config: LeadSlaConfig
  ): Date {
    if (!config.workingHoursOnly) {
      return new Date(startDate.getTime() + minutes * 60 * 1000);
    }

    const workingDays = config.workingDays as number[];
    const [startHour, startMinute] = config.workingHoursStart.split(':').map(Number);
    const [endHour, endMinute] = config.workingHoursEnd.split(':').map(Number);

    const workingMinutesPerDay = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
    let remainingMinutes = minutes;
    let currentDate = new Date(startDate);

    while (remainingMinutes > 0) {
      const dayOfWeek = currentDate.getDay();

      if (workingDays.includes(dayOfWeek)) {
        const currentHour = currentDate.getHours();
        const currentMinute = currentDate.getMinutes();
        const currentTimeMinutes = currentHour * 60 + currentMinute;
        const startTimeMinutes = startHour * 60 + startMinute;
        const endTimeMinutes = endHour * 60 + endMinute;

        if (currentTimeMinutes < startTimeMinutes) {
          // Before working hours, move to start
          currentDate.setHours(startHour, startMinute, 0, 0);
        } else if (currentTimeMinutes >= endTimeMinutes) {
          // After working hours, move to next day
          currentDate.setDate(currentDate.getDate() + 1);
          currentDate.setHours(startHour, startMinute, 0, 0);
          continue;
        }

        // Calculate available minutes today
        const availableMinutes = endTimeMinutes - (currentDate.getHours() * 60 + currentDate.getMinutes());

        if (remainingMinutes <= availableMinutes) {
          currentDate = new Date(currentDate.getTime() + remainingMinutes * 60 * 1000);
          remainingMinutes = 0;
        } else {
          remainingMinutes -= availableMinutes;
          currentDate.setDate(currentDate.getDate() + 1);
          currentDate.setHours(startHour, startMinute, 0, 0);
        }
      } else {
        // Not a working day, move to next day
        currentDate.setDate(currentDate.getDate() + 1);
        currentDate.setHours(startHour, startMinute, 0, 0);
      }
    }

    return currentDate;
  }

  /**
   * Get SLA status for a lead
   */
  async getSlaStatus(leadId: string, organizationId: string): Promise<SlaStatus | null> {
    try {
      const lead = await prisma.lead.findFirst({
        where: { id: leadId, organizationId },
        include: {
          followUps: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!lead) {
        return null;
      }

      const slaConfig = await this.getApplicableSlaConfig(leadId, organizationId);

      if (!slaConfig) {
        return null;
      }

      // Get first activity (call, note, etc.) as proxy for first contact
      const firstActivity = await prisma.leadActivity.findFirst({
        where: {
          leadId,
          type: { in: ['CALL', 'EMAIL', 'MEETING', 'NOTE'] }
        },
        orderBy: { createdAt: 'asc' },
      });

      const now = new Date();
      const firstContact = firstActivity?.createdAt || null;
      const lastFollowUp = lead.followUps?.[0]?.createdAt || null;

      // Calculate due dates
      const firstResponseDue = this.calculateDueDate(
        lead.createdAt,
        slaConfig.firstResponseMinutes,
        slaConfig
      );

      const followUpDue = firstContact
        ? this.calculateDueDate(firstContact, slaConfig.followUpMinutes, slaConfig)
        : null;

      const resolutionDue = slaConfig.resolutionMinutes
        ? this.calculateDueDate(lead.createdAt, slaConfig.resolutionMinutes, slaConfig)
        : null;

      // Check breaches
      const firstResponseBreached = !firstContact && now > firstResponseDue;
      const followUpBreached = followUpDue && !lead.isConverted && !lastFollowUp && now > followUpDue;
      const resolutionBreached = resolutionDue && !lead.isConverted && now > resolutionDue;

      // Determine overall status
      let overallStatus: 'ON_TRACK' | 'AT_RISK' | 'BREACHED' = 'ON_TRACK';

      if (firstResponseBreached || followUpBreached || resolutionBreached) {
        overallStatus = 'BREACHED';
      } else {
        // At risk if within 20% of deadline
        const atRiskThreshold = 0.8;

        if (
          !firstContact &&
          now.getTime() > lead.createdAt.getTime() + (firstResponseDue.getTime() - lead.createdAt.getTime()) * atRiskThreshold
        ) {
          overallStatus = 'AT_RISK';
        }
      }

      return {
        leadId,
        slaConfigId: slaConfig.id,
        slaConfigName: slaConfig.name,
        firstResponseDue,
        firstResponseAt: firstContact,
        firstResponseBreached,
        followUpDue,
        lastFollowUpAt: lastFollowUp,
        followUpBreached: followUpBreached || false,
        resolutionDue,
        resolvedAt: lead.convertedAt,
        resolutionBreached: resolutionBreached || false,
        overallStatus,
      };
    } catch (error) {
      console.error('Error getting SLA status:', error);
      return null;
    }
  }

  /**
   * Get leads with SLA breaches
   */
  async getBreachedLeads(
    organizationId: string,
    options?: {
      breachType?: 'first_response' | 'follow_up' | 'resolution';
      limit?: number;
    }
  ): Promise<any[]> {
    // Get all leads that might have breaches
    const leads = await prisma.lead.findMany({
      where: {
        organizationId,
        isConverted: false,
        status: { notIn: ['WON', 'LOST'] },
      },
      include: {
        assignments: {
          where: { isActive: true },
          include: {
            assignedTo: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        stage: true,
      },
      take: options?.limit || 100,
    });

    const breachedLeads: any[] = [];

    for (const lead of leads) {
      const status = await this.getSlaStatus(lead.id, organizationId);

      if (!status) continue;

      const hasBreachOfType =
        !options?.breachType ||
        (options.breachType === 'first_response' && status.firstResponseBreached) ||
        (options.breachType === 'follow_up' && status.followUpBreached) ||
        (options.breachType === 'resolution' && status.resolutionBreached);

      if (status.overallStatus === 'BREACHED' && hasBreachOfType) {
        breachedLeads.push({
          ...lead,
          slaStatus: status,
        });
      }
    }

    return breachedLeads;
  }

  /**
   * Get SLA dashboard metrics
   */
  async getSlaMetrics(organizationId: string): Promise<{
    totalLeads: number;
    onTrack: number;
    atRisk: number;
    breached: number;
    avgFirstResponseTime: number | null;
    avgResolutionTime: number | null;
    breachRate: number;
  }> {
    try {
      // Get leads from last 30 days (limit to 100 for performance)
      const leads = await prisma.lead.findMany({
        where: {
          organizationId,
          status: { notIn: ['WON', 'LOST'] },
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
        select: { id: true },
        take: 100,
      });

      let onTrack = 0;
      let atRisk = 0;
      let breached = 0;

      // Sample for SLA status (performance optimization)
      const sampleLeads = leads.slice(0, 50);
      for (const lead of sampleLeads) {
        const status = await this.getSlaStatus(lead.id, organizationId);

        if (!status) continue;

        switch (status.overallStatus) {
          case 'ON_TRACK':
            onTrack++;
            break;
          case 'AT_RISK':
            atRisk++;
            break;
          case 'BREACHED':
            breached++;
            break;
        }
      }

      // Scale up to total if we sampled
      if (sampleLeads.length < leads.length && sampleLeads.length > 0) {
        const scale = leads.length / sampleLeads.length;
        onTrack = Math.round(onTrack * scale);
        atRisk = Math.round(atRisk * scale);
        breached = Math.round(breached * scale);
      }

      // Calculate average resolution time from converted leads
      const resolutions = await prisma.lead.findMany({
        where: {
          organizationId,
          isConverted: true,
          convertedAt: { not: null },
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
        select: { createdAt: true, convertedAt: true },
        take: 100,
      });

      let avgResolutionTime: number | null = null;
      if (resolutions.length > 0) {
        const totalResolutionTime = resolutions.reduce((sum, lead) => {
          return sum + (lead.convertedAt!.getTime() - lead.createdAt.getTime());
        }, 0);
        avgResolutionTime = Math.round(totalResolutionTime / resolutions.length / (1000 * 60 * 60)); // Hours
      }

      // Calculate average first response time from activities
      const activities = await prisma.leadActivity.findMany({
        where: {
          lead: { organizationId },
          type: { in: ['CALL', 'EMAIL', 'NOTE'] },
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
        select: {
          createdAt: true,
          lead: { select: { createdAt: true } },
        },
        take: 100,
        orderBy: { createdAt: 'asc' },
      });

      let avgFirstResponseTime: number | null = null;
      if (activities.length > 0) {
        const totalResponseTime = activities.reduce((sum, activity) => {
          return sum + (activity.createdAt.getTime() - activity.lead.createdAt.getTime());
        }, 0);
        avgFirstResponseTime = Math.round(totalResponseTime / activities.length / (1000 * 60)); // Minutes
      }

      const totalLeads = leads.length;
      const breachRate = totalLeads > 0 ? Math.round((breached / totalLeads) * 100) : 0;

      return {
        totalLeads,
        onTrack,
        atRisk,
        breached,
        avgFirstResponseTime,
        avgResolutionTime,
        breachRate,
      };
    } catch (error) {
      console.error('Error getting SLA metrics:', error);
      // Return default values on error
      return {
        totalLeads: 0,
        onTrack: 0,
        atRisk: 0,
        breached: 0,
        avgFirstResponseTime: null,
        avgResolutionTime: null,
        breachRate: 0,
      };
    }
  }
}

export const leadSlaService = new LeadSlaService();
