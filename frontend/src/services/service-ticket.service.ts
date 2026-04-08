/**
 * Service Ticket Service
 */

import api from './api';

export interface ServiceTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  type: 'INCIDENT' | 'SERVICE_REQUEST' | 'PROBLEM' | 'CHANGE_REQUEST' | 'INQUIRY' | 'COMPLAINT' | 'FEEDBACK';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'CRITICAL';
  severity?: 'SEV1' | 'SEV2' | 'SEV3' | 'SEV4';
  status: 'NEW' | 'OPEN' | 'IN_PROGRESS' | 'PENDING' | 'ON_HOLD' | 'ESCALATED' | 'RESOLVED' | 'CLOSED' | 'CANCELLED';
  category?: string;
  subcategory?: string;
  accountId?: string;
  leadId?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactName?: string;
  assignedToId?: string;
  teamId?: string;
  channel: 'EMAIL' | 'PHONE' | 'CHAT' | 'WEB_FORM' | 'SOCIAL' | 'WALK_IN' | 'API';
  slaBreached: boolean;
  firstResponseDue?: string;
  resolutionDue?: string;
  firstResponseAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  escalationLevel: number;
  resolution?: string;
  createdAt: string;
  account?: { id: string; name: string };
  _count?: { comments: number; attachments: number };
}

export interface TicketComment {
  id: string;
  ticketId: string;
  userId?: string;
  content: string;
  isInternal: boolean;
  isFromCustomer: boolean;
  createdAt: string;
}

export interface TicketSLA {
  id: string;
  name: string;
  description?: string;
  firstResponseTime: Record<string, number>;
  resolutionTime: Record<string, number>;
  businessHours?: Record<string, any>;
  timezone: string;
  isDefault: boolean;
  isActive: boolean;
}

export const serviceTicketService = {
  async getTickets(filters?: {
    status?: string;
    priority?: string;
    assignedToId?: string;
    accountId?: string;
    type?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<ServiceTicket[]> {
    const params = new URLSearchParams();
    Object.entries(filters || {}).forEach(([key, value]) => {
      if (value) params.append(key, String(value));
    });

    const response = await api.get(`/tickets?${params.toString()}`);
    return response.data;
  },

  async getTicket(id: string): Promise<ServiceTicket & { comments: TicketComment[]; history: any[] }> {
    const response = await api.get(`/tickets/${id}`);
    return response.data;
  },

  async createTicket(data: Partial<ServiceTicket>): Promise<ServiceTicket> {
    const response = await api.post('/tickets', data);
    return response.data;
  },

  async updateTicket(id: string, data: Partial<ServiceTicket>): Promise<ServiceTicket> {
    const response = await api.put(`/tickets/${id}`, data);
    return response.data;
  },

  async addComment(ticketId: string, content: string, isInternal = false): Promise<TicketComment> {
    const response = await api.post(`/tickets/${ticketId}/comments`, { content, isInternal, isFromCustomer: false });
    return response.data;
  },

  async addAttachment(
    ticketId: string,
    fileName: string,
    fileUrl: string,
    fileSize: number,
    mimeType: string
  ): Promise<any> {
    const response = await api.post(`/tickets/${ticketId}/attachments`, { fileName, fileUrl, fileSize, mimeType });
    return response.data;
  },

  async escalateTicket(ticketId: string, reason?: string): Promise<ServiceTicket> {
    const response = await api.post(`/tickets/${ticketId}/escalate`, { reason });
    return response.data;
  },

  async getTicketStats(dateRange?: { startDate: string; endDate: string }): Promise<any> {
    const params = new URLSearchParams();
    if (dateRange) {
      params.append('startDate', dateRange.startDate);
      params.append('endDate', dateRange.endDate);
    }

    const response = await api.get(`/tickets/stats/overview?${params.toString()}`);
    return response.data;
  },

  async getSLAs(): Promise<TicketSLA[]> {
    const response = await api.get('/tickets/slas');
    return response.data;
  },

  async createSLA(data: Partial<TicketSLA>): Promise<TicketSLA> {
    const response = await api.post('/tickets/slas', data);
    return response.data;
  },
};
