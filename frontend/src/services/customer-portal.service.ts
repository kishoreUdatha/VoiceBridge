/**
 * Customer Self-Service Portal Service
 */

import api from './api';

export interface PortalConfig {
  id: string;
  organizationId: string;
  isEnabled: boolean;
  portalUrl: string;
  customDomain?: string;
  branding: {
    logo?: string;
    primaryColor?: string;
    companyName?: string;
    welcomeMessage?: string;
  };
  features: {
    ticketSubmission: boolean;
    knowledgeBase: boolean;
    chatSupport: boolean;
    documentAccess: boolean;
    invoiceAccess: boolean;
    contractView: boolean;
    feedbackForm: boolean;
  };
  ssoConfig?: {
    enabled: boolean;
    provider?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PortalUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  accountId?: string;
  contactId?: string;
  role: 'ADMIN' | 'USER' | 'VIEWER';
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags?: string[];
  isPublished: boolean;
  viewCount: number;
  helpfulCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PortalTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_CUSTOMER' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  category?: string;
  submittedBy: string;
  assignedTo?: string;
  messages: PortalTicketMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface PortalTicketMessage {
  id: string;
  content: string;
  isStaffReply: boolean;
  attachments?: string[];
  createdAt: string;
  createdBy: string;
}

export interface PortalAnalytics {
  totalUsers: number;
  activeUsers: number;
  ticketsSubmitted: number;
  ticketsResolved: number;
  avgResolutionTime: number;
  articleViews: number;
  topArticles: { id: string; title: string; views: number }[];
  satisfactionScore: number;
}

export const customerPortalService = {
  // Portal Configuration
  async getPortalConfig(): Promise<PortalConfig> {
    const response = await api.get('/portal/config');
    return response.data;
  },

  async updatePortalConfig(data: Partial<PortalConfig>): Promise<PortalConfig> {
    const response = await api.put('/portal/config', data);
    return response.data;
  },

  async enablePortal(): Promise<PortalConfig> {
    const response = await api.post('/portal/enable', {});
    return response.data;
  },

  async disablePortal(): Promise<void> {
    await api.post('/portal/disable', {});
  },

  // Portal Users
  async getPortalUsers(filters?: { accountId?: string; role?: string }): Promise<PortalUser[]> {
    const params = new URLSearchParams();
    if (filters?.accountId) params.append('accountId', filters.accountId);
    if (filters?.role) params.append('role', filters.role);

    const response = await api.get(`/portal/users?${params.toString()}`);
    return response.data;
  },

  async invitePortalUser(data: {
    email: string;
    firstName: string;
    lastName: string;
    accountId?: string;
    role: string;
  }): Promise<PortalUser> {
    const response = await api.post('/portal/users/invite', data);
    return response.data;
  },

  async updatePortalUser(userId: string, data: Partial<PortalUser>): Promise<PortalUser> {
    const response = await api.put(`/portal/users/${userId}`, data);
    return response.data;
  },

  async deactivatePortalUser(userId: string): Promise<void> {
    await api.post(`/portal/users/${userId}/deactivate`, {});
  },

  // Knowledge Base
  async getArticles(filters?: { category?: string; search?: string }): Promise<KnowledgeArticle[]> {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.search) params.append('search', filters.search);

    const response = await api.get(`/portal/knowledge?${params.toString()}`);
    return response.data;
  },

  async getArticle(id: string): Promise<KnowledgeArticle> {
    const response = await api.get(`/portal/knowledge/${id}`);
    return response.data;
  },

  async createArticle(data: Partial<KnowledgeArticle>): Promise<KnowledgeArticle> {
    const response = await api.post('/portal/knowledge', data);
    return response.data;
  },

  async updateArticle(id: string, data: Partial<KnowledgeArticle>): Promise<KnowledgeArticle> {
    const response = await api.put(`/portal/knowledge/${id}`, data);
    return response.data;
  },

  async deleteArticle(id: string): Promise<void> {
    await api.delete(`/portal/knowledge/${id}`);
  },

  async getArticleCategories(): Promise<string[]> {
    const response = await api.get('/portal/knowledge/categories');
    return response.data;
  },

  // Portal Tickets
  async getPortalTickets(filters?: { status?: string; priority?: string }): Promise<PortalTicket[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.priority) params.append('priority', filters.priority);

    const response = await api.get(`/portal/tickets?${params.toString()}`);
    return response.data;
  },

  async replyToTicket(ticketId: string, content: string): Promise<PortalTicketMessage> {
    const response = await api.post(`/portal/tickets/${ticketId}/reply`, { content });
    return response.data;
  },

  // Analytics
  async getPortalAnalytics(): Promise<PortalAnalytics> {
    const response = await api.get('/portal/analytics');
    return response.data;
  },
};
