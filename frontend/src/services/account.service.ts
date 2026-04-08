/**
 * Account Management Service
 */

import api from './api';

export interface Account {
  id: string;
  name: string;
  parentId?: string;
  type?: 'PROSPECT' | 'CUSTOMER' | 'PARTNER' | 'COMPETITOR' | 'OTHER';
  industry?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  employeeCount?: number;
  annualRevenue?: number;
  tier?: 'ENTERPRISE' | 'MID_MARKET' | 'SMB' | 'STARTUP';
  healthScore?: number;
  ownerId?: string;
  isTargetAccount: boolean;
  createdAt: string;
  contacts?: AccountContact[];
  opportunities?: any[];
  _count?: {
    contacts: number;
    opportunities: number;
  };
}

export interface AccountContact {
  id: string;
  accountId: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  title?: string;
  department?: string;
  role?: string;
  isPrimary: boolean;
  isActive: boolean;
}

export interface AccountActivity {
  id: string;
  accountId: string;
  type: string;
  subject: string;
  description?: string;
  activityDate: string;
  userId?: string;
}

export interface AccountNote {
  id: string;
  accountId: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
  createdById?: string;
}

export const accountService = {
  async getAccounts(filters?: {
    industry?: string;
    type?: string;
    tier?: string;
    ownerId?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<Account[]> {
    const params = new URLSearchParams();
    if (filters?.industry) params.append('industry', filters.industry);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.tier) params.append('tier', filters.tier);
    if (filters?.ownerId) params.append('ownerId', filters.ownerId);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.offset) params.append('offset', String(filters.offset));

    const response = await api.get(`/accounts?${params.toString()}`);
    return response.data;
  },

  async getAccount(id: string): Promise<Account> {
    const response = await api.get(`/accounts/${id}`);
    return response.data;
  },

  async createAccount(data: Partial<Account>): Promise<Account> {
    const response = await api.post('/accounts', data);
    return response.data;
  },

  async updateAccount(id: string, data: Partial<Account>): Promise<Account> {
    const response = await api.put(`/accounts/${id}`, data);
    return response.data;
  },

  async getAccountHierarchy(id: string): Promise<{ account: Account; parent?: Account; children: Account[] }> {
    const response = await api.get(`/accounts/${id}/hierarchy`);
    return response.data;
  },

  async addContact(accountId: string, data: Partial<AccountContact>): Promise<AccountContact> {
    const response = await api.post(`/accounts/${accountId}/contacts`, data);
    return response.data;
  },

  async updateContact(accountId: string, contactId: string, data: Partial<AccountContact>): Promise<AccountContact> {
    const response = await api.put(`/accounts/${accountId}/contacts/${contactId}`, data);
    return response.data;
  },

  async deleteContact(accountId: string, contactId: string): Promise<void> {
    await api.delete(`/accounts/${accountId}/contacts/${contactId}`);
  },

  async logActivity(accountId: string, data: Partial<AccountActivity>): Promise<AccountActivity> {
    const response = await api.post(`/accounts/${accountId}/activities`, data);
    return response.data;
  },

  async addNote(accountId: string, content: string, isPinned = false): Promise<AccountNote> {
    const response = await api.post(`/accounts/${accountId}/notes`, { content, isPinned });
    return response.data;
  },

  async calculateHealthScore(accountId: string): Promise<{ healthScore: number }> {
    const response = await api.post(`/accounts/${accountId}/health-score`, {});
    return response.data;
  },

  async mergeAccounts(sourceId: string, targetId: string): Promise<Account> {
    const response = await api.post(`/accounts/${sourceId}/merge/${targetId}`, {});
    return response.data;
  },

  async getAccountStats(): Promise<any> {
    const response = await api.get('/accounts/stats/overview');
    return response.data;
  },
};
