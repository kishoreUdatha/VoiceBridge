/**
 * Lead Deduplication Service
 * Handles finding, grouping, and merging duplicate leads
 */

import { prisma } from '../config/database';
import { Lead, Prisma } from '@prisma/client';

interface DuplicateMatch {
  leadId: string;
  matchedFields: string[];
  confidence: number;
}

interface DuplicateGroup {
  id: string;
  leads: Lead[];
  matchedFields: string[];
  confidence: number;
  status: string;
}

interface MergeResult {
  primaryLead: Lead;
  mergedCount: number;
  mergedLeadIds: string[];
}

export class LeadDeduplicationService {
  /**
   * Find potential duplicates for a specific lead
   */
  async findDuplicatesForLead(
    leadId: string,
    organizationId: string
  ): Promise<DuplicateMatch[]> {
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId },
    });

    if (!lead) {
      throw new Error('Lead not found');
    }

    const duplicates: DuplicateMatch[] = [];

    // Find by exact phone match
    if (lead.phone) {
      const phoneMatches = await prisma.lead.findMany({
        where: {
          organizationId,
          phone: lead.phone,
          id: { not: leadId },
          isDuplicate: false,
          mergedIntoId: null,
        },
      });

      phoneMatches.forEach((match) => {
        const existing = duplicates.find((d) => d.leadId === match.id);
        if (existing) {
          existing.matchedFields.push('phone');
          existing.confidence = Math.min(existing.confidence + 40, 100);
        } else {
          duplicates.push({
            leadId: match.id,
            matchedFields: ['phone'],
            confidence: 90, // High confidence for phone match
          });
        }
      });
    }

    // Find by exact email match
    if (lead.email) {
      const emailMatches = await prisma.lead.findMany({
        where: {
          organizationId,
          email: lead.email.toLowerCase(),
          id: { not: leadId },
          isDuplicate: false,
          mergedIntoId: null,
        },
      });

      emailMatches.forEach((match) => {
        const existing = duplicates.find((d) => d.leadId === match.id);
        if (existing) {
          existing.matchedFields.push('email');
          existing.confidence = Math.min(existing.confidence + 40, 100);
        } else {
          duplicates.push({
            leadId: match.id,
            matchedFields: ['email'],
            confidence: 85, // High confidence for email match
          });
        }
      });
    }

    // Find by alternate phone match
    if (lead.alternatePhone) {
      const altPhoneMatches = await prisma.lead.findMany({
        where: {
          organizationId,
          OR: [
            { phone: lead.alternatePhone },
            { alternatePhone: lead.alternatePhone },
          ],
          id: { not: leadId },
          isDuplicate: false,
          mergedIntoId: null,
        },
      });

      altPhoneMatches.forEach((match) => {
        const existing = duplicates.find((d) => d.leadId === match.id);
        if (existing) {
          existing.matchedFields.push('alternatePhone');
          existing.confidence = Math.min(existing.confidence + 30, 100);
        } else {
          duplicates.push({
            leadId: match.id,
            matchedFields: ['alternatePhone'],
            confidence: 70,
          });
        }
      });
    }

    // Find by name + partial phone match (fuzzy)
    if (lead.firstName && lead.phone) {
      const phonePrefix = lead.phone.slice(-6); // Last 6 digits
      const fuzzyMatches = await prisma.lead.findMany({
        where: {
          organizationId,
          firstName: { equals: lead.firstName, mode: 'insensitive' },
          phone: { endsWith: phonePrefix },
          id: { not: leadId },
          isDuplicate: false,
          mergedIntoId: null,
        },
      });

      fuzzyMatches.forEach((match) => {
        const existing = duplicates.find((d) => d.leadId === match.id);
        if (!existing) {
          duplicates.push({
            leadId: match.id,
            matchedFields: ['firstName', 'phonePartial'],
            confidence: 60,
          });
        }
      });
    }

    return duplicates.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Run auto-detection for all leads in an organization
   */
  async autoDetectDuplicates(organizationId: string): Promise<{
    groupsCreated: number;
    leadsProcessed: number;
  }> {
    // Get all active leads that are not already marked as duplicates
    const leads = await prisma.lead.findMany({
      where: {
        organizationId,
        isDuplicate: false,
        mergedIntoId: null,
      },
      orderBy: { createdAt: 'asc' },
    });

    const processedPairs = new Set<string>();
    let groupsCreated = 0;

    for (const lead of leads) {
      const duplicates = await this.findDuplicatesForLead(lead.id, organizationId);

      for (const dup of duplicates) {
        // Create a unique key for this pair to avoid processing twice
        const pairKey = [lead.id, dup.leadId].sort().join('-');
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);

        // Only create group for high-confidence matches
        if (dup.confidence >= 70) {
          // Check if either lead is already in a group
          const existingMembership = await prisma.leadDuplicateGroupMember.findFirst({
            where: {
              OR: [{ leadId: lead.id }, { leadId: dup.leadId }],
              group: { status: 'PENDING' },
            },
            include: { group: true },
          });

          if (existingMembership) {
            // Add to existing group
            await prisma.leadDuplicateGroupMember.upsert({
              where: {
                groupId_leadId: {
                  groupId: existingMembership.groupId,
                  leadId: dup.leadId,
                },
              },
              create: {
                groupId: existingMembership.groupId,
                leadId: dup.leadId,
              },
              update: {},
            });
          } else {
            // Create new group
            await prisma.leadDuplicateGroup.create({
              data: {
                organizationId,
                confidence: dup.confidence,
                matchedFields: dup.matchedFields,
                members: {
                  create: [
                    { leadId: lead.id, isPrimary: true },
                    { leadId: dup.leadId },
                  ],
                },
              },
            });
            groupsCreated++;
          }
        }
      }
    }

    return { groupsCreated, leadsProcessed: leads.length };
  }

  /**
   * Get all duplicate groups for an organization
   */
  async getDuplicateGroups(
    organizationId: string,
    status?: string
  ): Promise<DuplicateGroup[]> {
    const groups = await prisma.leadDuplicateGroup.findMany({
      where: {
        organizationId,
        ...(status && { status }),
      },
      include: {
        members: {
          include: {
            // We need to manually fetch leads since there's no direct relation
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch leads for each group
    const result: DuplicateGroup[] = [];
    for (const group of groups) {
      const leadIds = group.members.map((m) => m.leadId);
      const leads = await prisma.lead.findMany({
        where: { id: { in: leadIds } },
        include: {
          assignments: {
            where: { isActive: true },
            include: {
              assignedTo: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          },
        },
      });

      result.push({
        id: group.id,
        leads,
        matchedFields: group.matchedFields as string[],
        confidence: group.confidence,
        status: group.status,
      });
    }

    return result;
  }

  /**
   * Merge duplicate leads into a primary lead
   */
  async mergeDuplicates(
    primaryLeadId: string,
    duplicateLeadIds: string[],
    organizationId: string
  ): Promise<MergeResult> {
    // Verify all leads belong to the organization
    const allLeadIds = [primaryLeadId, ...duplicateLeadIds];
    const leads = await prisma.lead.findMany({
      where: {
        id: { in: allLeadIds },
        organizationId,
      },
    });

    if (leads.length !== allLeadIds.length) {
      throw new Error('One or more leads not found or do not belong to this organization');
    }

    const primaryLead = leads.find((l) => l.id === primaryLeadId);
    if (!primaryLead) {
      throw new Error('Primary lead not found');
    }

    // Perform merge in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Transfer all related data to primary lead
      for (const dupId of duplicateLeadIds) {
        // Transfer notes
        await tx.leadNote.updateMany({
          where: { leadId: dupId },
          data: { leadId: primaryLeadId },
        });

        // Transfer tasks
        await tx.leadTask.updateMany({
          where: { leadId: dupId },
          data: { leadId: primaryLeadId },
        });

        // Transfer follow-ups
        await tx.followUp.updateMany({
          where: { leadId: dupId },
          data: { leadId: primaryLeadId },
        });

        // Transfer activities
        await tx.leadActivity.updateMany({
          where: { leadId: dupId },
          data: { leadId: primaryLeadId },
        });

        // Transfer attachments
        await tx.leadAttachment.updateMany({
          where: { leadId: dupId },
          data: { leadId: primaryLeadId },
        });

        // Transfer call logs
        await tx.callLog.updateMany({
          where: { leadId: dupId },
          data: { leadId: primaryLeadId },
        });

        // Transfer telecaller calls
        await tx.telecallerCall.updateMany({
          where: { leadId: dupId },
          data: { leadId: primaryLeadId },
        });

        // Mark duplicate lead
        await tx.lead.update({
          where: { id: dupId },
          data: {
            isDuplicate: true,
            mergedIntoId: primaryLeadId,
            mergedAt: new Date(),
          },
        });
      }

      // Aggregate data to primary lead
      const duplicateLeads = leads.filter((l) => duplicateLeadIds.includes(l.id));
      const totalCalls = duplicateLeads.reduce((sum, l) => sum + l.totalCalls, primaryLead.totalCalls);
      const totalPageViews = duplicateLeads.reduce((sum, l) => sum + l.totalPageViews, primaryLead.totalPageViews);

      // Update primary lead with merged data
      const updatedPrimary = await tx.lead.update({
        where: { id: primaryLeadId },
        data: {
          totalCalls,
          totalPageViews,
          // Keep the earliest created date
          createdAt: new Date(
            Math.min(
              primaryLead.createdAt.getTime(),
              ...duplicateLeads.map((l) => l.createdAt.getTime())
            )
          ),
        },
      });

      // Create activity log
      await tx.leadActivity.create({
        data: {
          leadId: primaryLeadId,
          type: 'LEAD_MERGED',
          title: 'Leads merged',
          description: `${duplicateLeadIds.length} duplicate lead(s) merged into this lead`,
          metadata: { mergedLeadIds: duplicateLeadIds },
        },
      });

      return updatedPrimary;
    });

    // Update duplicate group status if exists
    await prisma.leadDuplicateGroup.updateMany({
      where: {
        organizationId,
        members: {
          some: { leadId: primaryLeadId },
        },
        status: 'PENDING',
      },
      data: {
        status: 'MERGED',
        primaryLeadId,
        mergedAt: new Date(),
      },
    });

    return {
      primaryLead: result,
      mergedCount: duplicateLeadIds.length,
      mergedLeadIds: duplicateLeadIds,
    };
  }

  /**
   * Ignore a duplicate group (mark as not duplicates)
   */
  async ignoreDuplicateGroup(groupId: string, organizationId: string): Promise<void> {
    await prisma.leadDuplicateGroup.update({
      where: { id: groupId, organizationId },
      data: { status: 'IGNORED' },
    });
  }

  /**
   * Check for duplicates before creating a new lead
   */
  async checkBeforeCreate(
    organizationId: string,
    phone: string,
    email?: string
  ): Promise<{ hasDuplicates: boolean; duplicates: Lead[] }> {
    const conditions: Prisma.LeadWhereInput[] = [];

    if (phone) {
      conditions.push({ phone });
    }

    if (email) {
      conditions.push({ email: email.toLowerCase() });
    }

    if (conditions.length === 0) {
      return { hasDuplicates: false, duplicates: [] };
    }

    const duplicates = await prisma.lead.findMany({
      where: {
        organizationId,
        OR: conditions,
        isDuplicate: false,
        mergedIntoId: null,
      },
      take: 10,
    });

    return {
      hasDuplicates: duplicates.length > 0,
      duplicates,
    };
  }

  /**
   * Get merge history for a lead
   */
  async getMergeHistory(leadId: string): Promise<Lead[]> {
    return prisma.lead.findMany({
      where: { mergedIntoId: leadId },
      orderBy: { mergedAt: 'desc' },
    });
  }
}

export const leadDeduplicationService = new LeadDeduplicationService();
