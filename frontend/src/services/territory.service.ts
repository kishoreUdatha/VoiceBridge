/**
 * Territory Management Service
 */

import api from './api';

export interface Territory {
  id: string;
  name: string;
  type: 'GEOGRAPHIC' | 'ACCOUNT_BASED' | 'INDUSTRY' | 'HYBRID';
  description?: string;
  parentId?: string;
  countries?: string[];
  states?: string[];
  cities?: string[];
  postalCodes?: string[];
  isActive: boolean;
  createdAt: string;
  assignments?: TerritoryAssignment[];
  _count?: {
    leads: number;
    accounts: number;
    assignments: number;
  };
}

export interface TerritoryAssignment {
  id: string;
  territoryId: string;
  userId: string;
  role: string;
  isPrimary: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface TerritoryStats {
  totalLeads: number;
  totalAccounts: number;
  assignedUsers: number;
  revenue: number;
}

export const territoryService = {
  async getTerritories(filters?: { type?: string; parentId?: string; search?: string }): Promise<Territory[]> {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.parentId) params.append('parentId', filters.parentId);
    if (filters?.search) params.append('search', filters.search);

    const response = await api.get(`/territories?${params.toString()}`);
    return response.data;
  },

  async getTerritory(id: string): Promise<Territory> {
    const response = await api.get(`/territories/${id}`);
    return response.data;
  },

  async createTerritory(data: Partial<Territory>): Promise<Territory> {
    const response = await api.post('/territories', data);
    return response.data;
  },

  async updateTerritory(id: string, data: Partial<Territory>): Promise<Territory> {
    const response = await api.put(`/territories/${id}`, data);
    return response.data;
  },

  async deleteTerritory(id: string): Promise<void> {
    await api.delete(`/territories/${id}`);
  },

  async assignUser(territoryId: string, userId: string, role: string, isPrimary = false): Promise<TerritoryAssignment> {
    const response = await api.post(`/territories/${territoryId}/assign`, { userId, role, isPrimary });
    return response.data;
  },

  async removeUser(territoryId: string, userId: string): Promise<void> {
    await api.delete(`/territories/${territoryId}/assign/${userId}`);
  },

  async getTerritoryStats(id: string): Promise<TerritoryStats> {
    const response = await api.get(`/territories/${id}/stats`);
    return response.data;
  },

  async autoAssignLead(leadId: string): Promise<{ territory?: Territory; assigned: boolean }> {
    const response = await api.post(`/territories/auto-assign/${leadId}`, {});
    return response.data;
  },
};
