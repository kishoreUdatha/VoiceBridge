/**
 * Global Search Service
 * Single service to search across all data types
 */

import { prisma } from '../config/database';

interface SearchResultItem {
  id: string;
  type: 'lead' | 'call' | 'raw-import' | 'campaign' | 'user' | 'bulk-import' | 'agent';
  title: string;
  subtitle: string;
  icon: string;
}

interface GlobalSearchResults {
  leads: SearchResultItem[];
  calls: SearchResultItem[];
  rawImports: SearchResultItem[];
  campaigns: SearchResultItem[];
  users: SearchResultItem[];
  bulkImports: SearchResultItem[];
  agents: SearchResultItem[];
  totalCount: number;
}

export class GlobalSearchService {
  /**
   * Search across all data types in parallel
   */
  async search(
    organizationId: string,
    query: string,
    limit: number = 5
  ): Promise<GlobalSearchResults> {
    if (!query || query.length < 2) {
      return {
        leads: [],
        calls: [],
        rawImports: [],
        campaigns: [],
        users: [],
        bulkImports: [],
        agents: [],
        totalCount: 0,
      };
    }

    // Run all searches in parallel
    const [leads, calls, rawImports, campaigns, users, bulkImports, agents] = await Promise.all([
      this.searchLeads(organizationId, query, limit),
      this.searchCalls(organizationId, query, limit),
      this.searchRawImports(organizationId, query, limit),
      this.searchCampaigns(organizationId, query, limit),
      this.searchUsers(organizationId, query, limit),
      this.searchBulkImports(organizationId, query, limit),
      this.searchAgents(organizationId, query, limit),
    ]);

    const totalCount =
      leads.length +
      calls.length +
      rawImports.length +
      campaigns.length +
      users.length +
      bulkImports.length +
      agents.length;

    return {
      leads,
      calls,
      rawImports,
      campaigns,
      users,
      bulkImports,
      agents,
      totalCount,
    };
  }

  private async searchLeads(
    organizationId: string,
    query: string,
    limit: number
  ): Promise<SearchResultItem[]> {
    try {
      const leads = await prisma.lead.findMany({
        where: {
          organizationId,
          OR: [
            { firstName: { contains: query, mode: 'insensitive' } },
            { lastName: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { phone: { contains: query } },
            { companyName: { contains: query, mode: 'insensitive' } },
            { notes: { contains: query, mode: 'insensitive' } },
            { city: { contains: query, mode: 'insensitive' } },
            { state: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          companyName: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return leads.map((lead) => ({
        id: lead.id,
        type: 'lead' as const,
        title: `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Unknown',
        subtitle: [lead.phone, lead.email, lead.companyName].filter(Boolean).join(' • ') || 'No contact',
        icon: 'user',
      }));
    } catch (error) {
      console.error('[GlobalSearch] Lead search error:', error);
      return [];
    }
  }

  private async searchCalls(
    organizationId: string,
    query: string,
    limit: number
  ): Promise<SearchResultItem[]> {
    try {
      const calls = await prisma.telecallerCall.findMany({
        where: {
          organizationId,
          OR: [
            { phoneNumber: { contains: query } },
            { contactName: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          phoneNumber: true,
          contactName: true,
          outcome: true,
          duration: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return calls.map((call) => ({
        id: call.id,
        type: 'call' as const,
        title: call.contactName || call.phoneNumber || 'Unknown',
        subtitle: `${call.outcome || 'No outcome'} • ${call.duration ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s` : '0s'}`,
        icon: 'phone',
      }));
    } catch (error) {
      console.error('[GlobalSearch] Call search error:', error);
      return [];
    }
  }

  private async searchRawImports(
    organizationId: string,
    query: string,
    limit: number
  ): Promise<SearchResultItem[]> {
    try {
      const records = await prisma.rawImportRecord.findMany({
        where: {
          organizationId,
          OR: [
            { firstName: { contains: query, mode: 'insensitive' } },
            { lastName: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { phone: { contains: query } },
            { alternatePhone: { contains: query } },
            { city: { contains: query, mode: 'insensitive' } },
            { state: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          status: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return records.map((record) => ({
        id: record.id,
        type: 'raw-import' as const,
        title: `${record.firstName || ''} ${record.lastName || ''}`.trim() || 'Unknown',
        subtitle: [record.phone, record.email, record.status].filter(Boolean).join(' • ') || 'No contact',
        icon: 'document',
      }));
    } catch (error) {
      console.error('[GlobalSearch] Raw import search error:', error);
      return [];
    }
  }

  private async searchCampaigns(
    organizationId: string,
    query: string,
    limit: number
  ): Promise<SearchResultItem[]> {
    try {
      const campaigns = await prisma.outboundCallCampaign.findMany({
        where: {
          organizationId,
          name: { contains: query, mode: 'insensitive' },
        },
        select: {
          id: true,
          name: true,
          status: true,
          totalContacts: true,
          completedCalls: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return campaigns.map((campaign) => ({
        id: campaign.id,
        type: 'campaign' as const,
        title: campaign.name || 'Unnamed Campaign',
        subtitle: `${campaign.status || 'Unknown'} • ${campaign.completedCalls || 0}/${campaign.totalContacts || 0} calls`,
        icon: 'campaign',
      }));
    } catch (error) {
      console.error('[GlobalSearch] Campaign search error:', error);
      return [];
    }
  }

  private async searchUsers(
    organizationId: string,
    query: string,
    limit: number
  ): Promise<SearchResultItem[]> {
    try {
      const users = await prisma.user.findMany({
        where: {
          organizationId,
          isActive: true,
          OR: [
            { firstName: { contains: query, mode: 'insensitive' } },
            { lastName: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: {
            select: { name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return users.map((user) => ({
        id: user.id,
        type: 'user' as const,
        title: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unknown',
        subtitle: [user.role?.name, user.email].filter(Boolean).join(' • ') || 'No role',
        icon: 'users',
      }));
    } catch (error) {
      console.error('[GlobalSearch] User search error:', error);
      return [];
    }
  }

  private async searchBulkImports(
    organizationId: string,
    query: string,
    limit: number
  ): Promise<SearchResultItem[]> {
    try {
      const imports = await prisma.bulkImport.findMany({
        where: {
          organizationId,
          fileName: { contains: query, mode: 'insensitive' },
        },
        select: {
          id: true,
          fileName: true,
          status: true,
          totalRows: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return imports.map((imp) => ({
        id: imp.id,
        type: 'bulk-import' as const,
        title: imp.fileName || 'Unnamed Import',
        subtitle: `${imp.totalRows || 0} records • ${imp.status || 'Unknown'}`,
        icon: 'folder',
      }));
    } catch (error) {
      console.error('[GlobalSearch] Bulk import search error:', error);
      return [];
    }
  }

  private async searchAgents(
    organizationId: string,
    query: string,
    limit: number
  ): Promise<SearchResultItem[]> {
    try {
      const agents = await prisma.voiceAgent.findMany({
        where: {
          organizationId,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { industry: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          industry: true,
          isActive: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return agents.map((agent) => ({
        id: agent.id,
        type: 'agent' as const,
        title: agent.name || 'Unnamed Agent',
        subtitle: `${agent.industry || 'General'} • ${agent.isActive ? 'Active' : 'Inactive'}`,
        icon: 'agent',
      }));
    } catch (error) {
      console.error('[GlobalSearch] Agent search error:', error);
      return [];
    }
  }
}

export const globalSearchService = new GlobalSearchService();
