/**
 * Contract Management Service
 */

import api from './api';

export interface Contract {
  id: string;
  contractNumber: string;
  name: string;
  type: 'SERVICE_AGREEMENT' | 'SALES_CONTRACT' | 'NDA' | 'MSA' | 'SOW' | 'AMENDMENT' | 'RENEWAL' | 'OTHER';
  description?: string;
  accountId?: string;
  opportunityId?: string;
  quotationId?: string;
  totalValue: number;
  currency: string;
  billingFrequency?: 'ONE_TIME' | 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL';
  status: 'DRAFT' | 'PENDING_REVIEW' | 'UNDER_NEGOTIATION' | 'SENT_FOR_SIGNATURE' | 'PARTIALLY_SIGNED' | 'SIGNED' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'RENEWED';
  startDate: string;
  endDate?: string;
  signedDate?: string;
  autoRenewal: boolean;
  renewalTermMonths?: number;
  renewalNoticeDays?: number;
  renewalDate?: string;
  paymentTerms?: string;
  specialTerms?: string;
  documentUrl?: string;
  templateId?: string;
  ownerId: string;
  requiresSignature: boolean;
  signatureProvider?: string;
  createdAt: string;
  account?: { id: string; name: string };
  signatories?: ContractSignatory[];
  versions?: ContractVersion[];
  lineItems?: ContractLineItem[];
  _count?: { signatories: number; versions: number };
}

export interface ContractSignatory {
  id: string;
  contractId: string;
  name: string;
  email: string;
  role?: string;
  order: number;
  signatureRequired: boolean;
  signedAt?: string;
  signatureData?: any;
}

export interface ContractVersion {
  id: string;
  contractId: string;
  version: number;
  documentUrl: string;
  changes: string;
  createdAt: string;
  createdById?: string;
}

export interface ContractLineItem {
  id: string;
  contractId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  totalPrice: number;
}

export interface ContractTemplate {
  id: string;
  name: string;
  type: string;
  description?: string;
  content: string;
  mergeFields?: string[];
  isActive: boolean;
}

export const contractService = {
  async getContracts(filters?: {
    status?: string;
    type?: string;
    accountId?: string;
    ownerId?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<Contract[]> {
    const params = new URLSearchParams();
    Object.entries(filters || {}).forEach(([key, value]) => {
      if (value) params.append(key, String(value));
    });

    const response = await api.get(`/contracts?${params.toString()}`);
    return response.data;
  },

  async getContract(id: string): Promise<Contract> {
    const response = await api.get(`/contracts/${id}`);
    return response.data;
  },

  async createContract(data: Partial<Contract> & {
    signatories?: { name: string; email: string; role?: string; order?: number }[];
    lineItems?: { description: string; quantity: number; unitPrice: number; discount?: number }[];
  }): Promise<Contract> {
    const response = await api.post('/contracts', data);
    return response.data;
  },

  async updateContract(id: string, data: Partial<Contract>): Promise<Contract> {
    const response = await api.put(`/contracts/${id}`, data);
    return response.data;
  },

  async createVersion(contractId: string, documentUrl: string, changes: string): Promise<ContractVersion> {
    const response = await api.post(`/contracts/${contractId}/versions`, { documentUrl, changes });
    return response.data;
  },

  async sendForSignature(contractId: string, signatureProvider: string): Promise<Contract> {
    const response = await api.post(`/contracts/${contractId}/send-for-signature`, { signatureProvider });
    return response.data;
  },

  async activateContract(contractId: string): Promise<Contract> {
    const response = await api.post(`/contracts/${contractId}/activate`, {});
    return response.data;
  },

  async terminateContract(contractId: string, reason?: string): Promise<Contract> {
    const response = await api.post(`/contracts/${contractId}/terminate`, { reason });
    return response.data;
  },

  async getContractsForRenewal(daysAhead = 30): Promise<Contract[]> {
    const response = await api.get(`/contracts/renewals/upcoming?daysAhead=${daysAhead}`);
    return response.data;
  },

  async renewContract(contractId: string, newEndDate: string, newValue?: number): Promise<Contract> {
    const response = await api.post(`/contracts/${contractId}/renew`, { newEndDate, newValue });
    return response.data;
  },

  async getTemplates(type?: string): Promise<ContractTemplate[]> {
    const params = type ? `?type=${type}` : '';
    const response = await api.get(`/contracts/templates${params}`);
    return response.data;
  },

  async createTemplate(data: Partial<ContractTemplate>): Promise<ContractTemplate> {
    const response = await api.post('/contracts/templates', data);
    return response.data;
  },

  async generateFromTemplate(templateId: string, data: Record<string, any>): Promise<{ content: string }> {
    const response = await api.post(`/contracts/templates/${templateId}/generate`, data);
    return response.data;
  },

  async getContractStats(): Promise<any> {
    const response = await api.get('/contracts/stats/overview');
    return response.data;
  },
};
