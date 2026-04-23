import api, { getErrorMessage } from './index';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Lead, LeadStatus, LeadFormData, ApiResponse, PaginatedResponse, STORAGE_KEYS } from '../types';

export interface LeadDispositionPayload {
  lead_id: string;
  call_id?: string;
  call_connected: boolean;
  reason: string;
  other_reason?: string;
  next_follow_up?: string;
  reassigned?: boolean;
  reassign_to?: string;
  notes?: string;
  // Extended analysis fields
  interest_level?: 'hot' | 'warm' | 'cold';
  customer_sentiment?: 'positive' | 'neutral' | 'negative';
  is_decision_maker?: boolean;
  budget_status?: 'ready' | 'considering' | 'no_budget' | 'unknown';
  topics_discussed?: string[];
  pain_points?: string[];
  competitor_mentioned?: string;
  call_quality?: number; // 1-5
}

export const submitLeadDisposition = async (
  payload: LeadDispositionPayload
): Promise<ApiResponse<any>> => {
  console.log('[LeadsAPI] Submitting disposition:', payload);
  const response = await api.post(
    `/telecaller/leads/${payload.lead_id}/disposition`,
    payload
  );
  return response.data;
};

export const fetchAssignableTelecallers = async (): Promise<{ id: string; name: string }[]> => {
  try {
    const response = await api.get('/telecaller/team');
    const list = response.data?.data || response.data || [];
    return list.map((u: any) => ({
      id: u.id,
      name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || u.id,
    }));
  } catch {
    return [];
  }
};

export const leadsApi = {
  /**
   * Get assigned leads with pagination and filters
   */
  getAssignedLeads: async (
    page: number = 1,
    limit: number = 20,
    filters?: {
      status?: LeadStatus;
      search?: string;
      showTeam?: boolean;
    }
  ): Promise<PaginatedResponse<Lead>> => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (filters?.status) params.append('status', filters.status);
      if (filters?.search) params.append('search', filters.search);
      if (filters?.showTeam) params.append('showTeam', 'true');

      console.log('[LeadsAPI] Fetching leads from /telecaller/leads');
      const response = await api.get(`/telecaller/leads?${params.toString()}`);

      // Parse response - backend returns { success, message, data: { leads, total } }
      const responseData = response.data;
      const leads: Lead[] = responseData.data?.leads || [];
      const total = responseData.data?.total || 0;

      // Map a backend lead stage / outcome to the app's coarse LeadStatus enum.
      // Order of precedence: explicit stage.slug → latest call outcome → call history.
      const deriveStatus = (lead: any): LeadStatus => {
        const slug = (lead.stage?.slug || lead.stage?.name || '').toString().toLowerCase();
        if (slug.includes('convert') || slug.includes('won') || lead.isConverted) return 'CONVERTED';
        if (slug.includes('lost') || slug.includes('not_interested')) return 'LOST';
        if (slug.includes('negotiat') || slug.includes('proposal')) return 'NEGOTIATION';
        if (slug.includes('qualif')) return 'QUALIFIED';

        // Fall back to the last telecaller call outcome (set by the AI pipeline).
        const lastOutcome = (lead.lastCallOutcome || lead.outcome || '').toString().toUpperCase();
        if (lastOutcome === 'CONVERTED') return 'CONVERTED';
        if (lastOutcome === 'NOT_INTERESTED') return 'LOST';
        if (lastOutcome === 'INTERESTED') return 'QUALIFIED';
        if (['CALLBACK_REQUESTED', 'NEEDS_FOLLOWUP', 'NO_ANSWER', 'VOICEMAIL'].includes(lastOutcome)) return 'CONTACTED';

        // No outcome yet — was it ever called?
        if (lead.lastContactedAt || (lead.totalCalls && lead.totalCalls > 0)) return 'CONTACTED';
        return 'NEW';
      };

      // Transform leads to match app's Lead type
      const transformedLeads: Lead[] = leads.map((lead: any) => ({
        id: lead.id,
        name: `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Unknown',
        phone: lead.phone || '',
        email: lead.email || undefined,
        company: lead.centerName || undefined,
        status: deriveStatus(lead),
        source: lead.source || undefined,
        lastContactedAt: lead.lastContactedAt || undefined,
        // Carry the raw counters so LeadsScreen can compute "uncalled" reliably.
        totalCalls: lead.totalCalls || 0,
        createdAt: lead.createdAt || new Date().toISOString(),
        updatedAt: lead.updatedAt || new Date().toISOString(),
      } as any));

      // Cache leads for offline access
      try {
        const cachedLeads = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_LEADS);
        const existingLeads: Lead[] = cachedLeads ? JSON.parse(cachedLeads) : [];
        const mergedLeads = [...existingLeads];

        transformedLeads.forEach((newLead: Lead) => {
          const existingIndex = mergedLeads.findIndex((l) => l.id === newLead.id);
          if (existingIndex >= 0) {
            mergedLeads[existingIndex] = newLead;
          } else {
            mergedLeads.push(newLead);
          }
        });

        const leadsToCache = mergedLeads.slice(-100);
        await AsyncStorage.setItem(STORAGE_KEYS.CACHED_LEADS, JSON.stringify(leadsToCache));
      } catch (e) {
        console.log('Cache error:', e);
      }

      console.log('[LeadsAPI] Transformed leads count:', transformedLeads.length);
      if (transformedLeads.length > 0) {
        console.log('[LeadsAPI] First lead:', JSON.stringify(transformedLeads[0]));
      }

      return {
        success: true,
        data: transformedLeads,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.log('[LeadsAPI] Error fetching leads:', error);
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Get single lead details
   */
  getLead: async (leadId: string): Promise<Lead> => {
    try {
      console.log('[LeadsAPI] Fetching single lead:', leadId);
      const response = await api.get(`/leads/${leadId}`);
      console.log('[LeadsAPI] Single lead response:', JSON.stringify(response.data));

      const leadData = response.data.data || response.data;

      // Transform to match app's Lead type - include both pipelineStageId (unified) and stageId (legacy)
      const lead: Lead = {
        id: leadData.id,
        name: `${leadData.firstName || ''} ${leadData.lastName || ''}`.trim() || 'Unknown',
        phone: leadData.phone || '',
        email: leadData.email || undefined,
        company: leadData.centerName || leadData.company || undefined,
        status: (leadData.status || 'NEW') as LeadStatus,
        // Unified pipeline system (used by web) - prefer this
        pipelineStageId: leadData.pipelineStageId || undefined,
        pipelineStage: leadData.pipelineStage ? {
          id: leadData.pipelineStage.id,
          name: leadData.pipelineStage.name,
          slug: leadData.pipelineStage.slug,
          color: leadData.pipelineStage.color,
          order: leadData.pipelineStage.order,
          stageType: leadData.pipelineStage.stageType,
        } : undefined,
        // Legacy stage system - fallback
        stageId: leadData.stageId || undefined,
        stage: leadData.stage ? {
          id: leadData.stage.id,
          name: leadData.stage.name,
          slug: leadData.stage.slug,
          color: leadData.stage.color,
          order: leadData.stage.order,
          journeyOrder: leadData.stage.journeyOrder,
        } : undefined,
        source: leadData.source || undefined,
        notes: leadData.notes || undefined,
        lastContactedAt: leadData.lastContactedAt || undefined,
        createdAt: leadData.createdAt || new Date().toISOString(),
        updatedAt: leadData.updatedAt || new Date().toISOString(),
      } as any;

      console.log('[LeadsAPI] Transformed lead with stage:', JSON.stringify(lead));
      return lead;
    } catch (error) {
      console.error('[LeadsAPI] Error fetching lead:', error);
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Update lead status
   */
  updateLeadStatus: async (leadId: string, status: LeadStatus): Promise<Lead> => {
    try {
      const response = await api.patch<ApiResponse<Lead>>(`/leads/${leadId}`, {
        status,
      });
      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Update lead with full data
   */
  updateLead: async (leadId: string, data: LeadFormData): Promise<Lead> => {
    try {
      const response = await api.put<ApiResponse<Lead>>(`/leads/${leadId}`, data);
      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Create a new lead
   */
  createLead: async (data: LeadFormData): Promise<Lead> => {
    try {
      const response = await api.post<ApiResponse<Lead>>('/leads', data);
      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Add note to lead
   */
  addNote: async (leadId: string, note: string): Promise<Lead> => {
    try {
      const response = await api.post<ApiResponse<Lead>>(`/leads/${leadId}/notes`, {
        content: note,
      });
      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Get cached leads (for offline mode)
   */
  getCachedLeads: async (): Promise<Lead[]> => {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_LEADS);
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      console.error('Error getting cached leads:', error);
      return [];
    }
  },

  /**
   * Search leads locally (offline)
   */
  searchCachedLeads: async (query: string): Promise<Lead[]> => {
    try {
      const leads = await leadsApi.getCachedLeads();
      const lowerQuery = query.toLowerCase();

      return leads.filter(
        (lead) =>
          lead.name.toLowerCase().includes(lowerQuery) ||
          lead.phone.includes(query) ||
          lead.email?.toLowerCase().includes(lowerQuery) ||
          lead.company?.toLowerCase().includes(lowerQuery)
      );
    } catch (error) {
      return [];
    }
  },

  /**
   * Get lead call history
   */
  getLeadCallHistory: async (leadId: string): Promise<any[]> => {
    try {
      const response = await api.get<ApiResponse<any[]>>(`/leads/${leadId}/calls`);
      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Clear cached leads
   */
  clearCache: async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.CACHED_LEADS);
    } catch (error) {
      console.error('Error clearing lead cache:', error);
    }
  },
};

export default leadsApi;
