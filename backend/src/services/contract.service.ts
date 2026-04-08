/**
 * Contract Management Service
 * Handles contracts, e-signatures, versioning, and renewals
 */

import { PrismaClient, ContractType, ContractStatus, BillingFrequency } from '@prisma/client';

const prisma = new PrismaClient();

interface ContractConfig {
  name: string;
  type: ContractType;
  description?: string;
  accountId?: string;
  opportunityId?: string;
  quotationId?: string;
  totalValue: number;
  currency?: string;
  billingFrequency?: BillingFrequency;
  startDate: Date;
  endDate?: Date;
  autoRenewal?: boolean;
  renewalTermMonths?: number;
  renewalNoticeDays?: number;
  paymentTerms?: string;
  specialTerms?: string;
  templateId?: string;
  ownerId: string;
  signatories?: { name: string; email: string; role?: string; order?: number }[];
  lineItems?: { description: string; quantity: number; unitPrice: number; discount?: number }[];
}

export const contractService = {
  // Generate contract number
  async generateContractNumber(organizationId: string): Promise<string> {
    const count = await prisma.contract.count({ where: { organizationId } });
    const year = new Date().getFullYear();
    const paddedNumber = String(count + 1).padStart(5, '0');
    return `CNT-${year}-${paddedNumber}`;
  },

  // Get all contracts
  async getContracts(organizationId: string, filters?: any) {
    const where: any = { organizationId };

    if (filters?.status) where.status = filters.status;
    if (filters?.type) where.type = filters.type;
    if (filters?.accountId) where.accountId = filters.accountId;
    if (filters?.ownerId) where.ownerId = filters.ownerId;
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { contractNumber: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return prisma.contract.findMany({
      where,
      include: {
        account: { select: { id: true, name: true } },
        _count: { select: { signatories: true, versions: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
    });
  },

  // Get single contract
  async getContract(id: string) {
    return prisma.contract.findUnique({
      where: { id },
      include: {
        account: true,
        versions: { orderBy: { version: 'desc' } },
        signatories: { orderBy: { order: 'asc' } },
        lineItems: true,
      },
    });
  },

  // Create contract
  async createContract(organizationId: string, config: ContractConfig) {
    const contractNumber = await this.generateContractNumber(organizationId);

    // Calculate total from line items if provided
    let totalValue = config.totalValue;
    if (config.lineItems && config.lineItems.length > 0) {
      totalValue = config.lineItems.reduce((sum, item) => {
        const itemTotal = item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100);
        return sum + itemTotal;
      }, 0);
    }

    const contract = await prisma.contract.create({
      data: {
        organizationId,
        contractNumber,
        name: config.name,
        type: config.type,
        description: config.description,
        accountId: config.accountId,
        opportunityId: config.opportunityId,
        quotationId: config.quotationId,
        totalValue,
        currency: config.currency || 'INR',
        billingFrequency: config.billingFrequency,
        startDate: config.startDate,
        endDate: config.endDate,
        autoRenewal: config.autoRenewal || false,
        renewalTermMonths: config.renewalTermMonths,
        renewalNoticeDays: config.renewalNoticeDays,
        paymentTerms: config.paymentTerms,
        specialTerms: config.specialTerms,
        templateId: config.templateId,
        ownerId: config.ownerId,
        requiresSignature: (config.signatories?.length || 0) > 0,
      },
    });

    // Add signatories
    if (config.signatories && config.signatories.length > 0) {
      await prisma.contractSignatory.createMany({
        data: config.signatories.map((s, index) => ({
          contractId: contract.id,
          name: s.name,
          email: s.email,
          role: s.role,
          order: s.order ?? index,
        })),
      });
    }

    // Add line items
    if (config.lineItems && config.lineItems.length > 0) {
      await prisma.contractLineItem.createMany({
        data: config.lineItems.map((item) => ({
          contractId: contract.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          totalPrice: item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100),
        })),
      });
    }

    return this.getContract(contract.id);
  },

  // Update contract
  async updateContract(id: string, updates: Partial<ContractConfig & { status?: ContractStatus }>) {
    const data: any = {};

    if (updates.name) data.name = updates.name;
    if (updates.type) data.type = updates.type;
    if (updates.description !== undefined) data.description = updates.description;
    if (updates.totalValue) data.totalValue = updates.totalValue;
    if (updates.startDate) data.startDate = updates.startDate;
    if (updates.endDate !== undefined) data.endDate = updates.endDate;
    if (updates.autoRenewal !== undefined) data.autoRenewal = updates.autoRenewal;
    if (updates.renewalTermMonths !== undefined) data.renewalTermMonths = updates.renewalTermMonths;
    if (updates.paymentTerms !== undefined) data.paymentTerms = updates.paymentTerms;
    if (updates.specialTerms !== undefined) data.specialTerms = updates.specialTerms;
    if (updates.status) data.status = updates.status;

    // Set signed date when status changes to SIGNED
    if (updates.status === 'SIGNED') {
      data.signedDate = new Date();
    }

    return prisma.contract.update({
      where: { id },
      data,
    });
  },

  // Create new version
  async createVersion(contractId: string, documentUrl: string, changes: string, createdById: string) {
    const latestVersion = await prisma.contractVersion.findFirst({
      where: { contractId },
      orderBy: { version: 'desc' },
    });

    const newVersion = (latestVersion?.version || 0) + 1;

    const version = await prisma.contractVersion.create({
      data: {
        contractId,
        version: newVersion,
        documentUrl,
        changes,
        createdById,
      },
    });

    // Update contract document URL
    await prisma.contract.update({
      where: { id: contractId },
      data: { documentUrl },
    });

    return version;
  },

  // Send for signature
  async sendForSignature(contractId: string, signatureProvider: string) {
    const contract = await this.getContract(contractId);
    if (!contract) throw new Error('Contract not found');

    // In production, integrate with DocuSign/HelloSign API
    // For now, update status
    return prisma.contract.update({
      where: { id: contractId },
      data: {
        status: 'SENT_FOR_SIGNATURE',
        signatureProvider,
      },
    });
  },

  // Record signature
  async recordSignature(contractId: string, signatoryEmail: string, signatureData: any) {
    const signatory = await prisma.contractSignatory.findFirst({
      where: { contractId, email: signatoryEmail },
    });

    if (!signatory) throw new Error('Signatory not found');

    await prisma.contractSignatory.update({
      where: { id: signatory.id },
      data: {
        signedAt: new Date(),
        signatureData: signatureData as any,
      },
    });

    // Check if all required signatures are complete
    const allSignatories = await prisma.contractSignatory.findMany({
      where: { contractId, signatureRequired: true },
    });

    const allSigned = allSignatories.every((s) => s.signedAt !== null);

    if (allSigned) {
      await prisma.contract.update({
        where: { id: contractId },
        data: { status: 'SIGNED', signedDate: new Date() },
      });
    } else {
      await prisma.contract.update({
        where: { id: contractId },
        data: { status: 'PARTIALLY_SIGNED' },
      });
    }

    return this.getContract(contractId);
  },

  // Activate contract
  async activateContract(contractId: string) {
    const contract = await prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract) throw new Error('Contract not found');

    if (contract.requiresSignature && contract.status !== 'SIGNED') {
      throw new Error('Contract must be signed before activation');
    }

    // Calculate renewal date
    let renewalDate = null;
    if (contract.autoRenewal && contract.endDate) {
      renewalDate = new Date(contract.endDate);
      if (contract.renewalNoticeDays) {
        renewalDate.setDate(renewalDate.getDate() - contract.renewalNoticeDays);
      }
    }

    return prisma.contract.update({
      where: { id: contractId },
      data: { status: 'ACTIVE', renewalDate },
    });
  },

  // Terminate contract
  async terminateContract(contractId: string, reason?: string) {
    return prisma.contract.update({
      where: { id: contractId },
      data: {
        status: 'TERMINATED',
        specialTerms: reason ? `Terminated: ${reason}` : undefined,
      },
    });
  },

  // Get contracts up for renewal
  async getContractsForRenewal(organizationId: string, daysAhead = 30) {
    const renewalDate = new Date();
    renewalDate.setDate(renewalDate.getDate() + daysAhead);

    return prisma.contract.findMany({
      where: {
        organizationId,
        status: 'ACTIVE',
        autoRenewal: true,
        renewalDate: { lte: renewalDate },
      },
      include: {
        account: { select: { id: true, name: true } },
      },
      orderBy: { renewalDate: 'asc' },
    });
  },

  // Renew contract
  async renewContract(contractId: string, newEndDate: Date, newValue?: number) {
    const contract = await prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract) throw new Error('Contract not found');

    // Calculate new renewal date
    let renewalDate = null;
    if (contract.autoRenewal && contract.renewalNoticeDays) {
      renewalDate = new Date(newEndDate);
      renewalDate.setDate(renewalDate.getDate() - contract.renewalNoticeDays);
    }

    return prisma.contract.update({
      where: { id: contractId },
      data: {
        status: 'RENEWED',
        endDate: newEndDate,
        totalValue: newValue || contract.totalValue,
        renewalDate,
      },
    });
  },

  // Get contract templates
  async getTemplates(organizationId: string, type?: ContractType) {
    const where: any = { organizationId, isActive: true };
    if (type) where.type = type;

    return prisma.contractTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  },

  // Create template
  async createTemplate(
    organizationId: string,
    name: string,
    type: ContractType,
    content: string,
    description?: string,
    mergeFields?: string[]
  ) {
    return prisma.contractTemplate.create({
      data: {
        organizationId,
        name,
        type,
        content,
        description,
        mergeFields: mergeFields as any,
      },
    });
  },

  // Generate document from template
  async generateFromTemplate(templateId: string, data: Record<string, any>): Promise<string> {
    const template = await prisma.contractTemplate.findUnique({ where: { id: templateId } });
    if (!template) throw new Error('Template not found');

    let content = template.content;

    // Replace merge fields
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      content = content.replace(regex, String(value));
    }

    return content;
  },

  // Get contract statistics
  async getContractStats(organizationId: string) {
    const [byStatus, byType, totalValue, renewalsDue] = await Promise.all([
      prisma.contract.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: true,
      }),
      prisma.contract.groupBy({
        by: ['type'],
        where: { organizationId },
        _count: true,
        _sum: { totalValue: true },
      }),
      prisma.contract.aggregate({
        where: { organizationId, status: 'ACTIVE' },
        _sum: { totalValue: true },
      }),
      prisma.contract.count({
        where: {
          organizationId,
          status: 'ACTIVE',
          autoRenewal: true,
          renewalDate: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    return {
      byStatus,
      byType,
      activeContractValue: totalValue._sum.totalValue || 0,
      renewalsDueIn30Days: renewalsDue,
    };
  },
};
