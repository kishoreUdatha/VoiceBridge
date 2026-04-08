/**
 * Account Management Service
 * Handles B2B account hierarchy, contacts, and account-level operations
 */

import { PrismaClient, AccountStatus, AccountTier, ContactRole, CompanyType } from '@prisma/client';

const prisma = new PrismaClient();

interface AccountConfig {
  name: string;
  code?: string;
  website?: string;
  industry?: string;
  subIndustry?: string;
  companyType?: CompanyType;
  employeeCount?: string;
  annualRevenue?: number;
  yearFounded?: number;
  description?: string;
  billingAddress?: Record<string, any>;
  shippingAddress?: Record<string, any>;
  headquarters?: string;
  tier?: AccountTier;
  status?: AccountStatus;
  source?: string;
  parentId?: string;
  territoryId?: string;
  ownerId?: string;
  isTargetAccount?: boolean;
  abmTier?: string;
}

interface ContactConfig {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  jobTitle?: string;
  department?: string;
  role: ContactRole;
  isPrimary?: boolean;
  leadId?: string;
}

export const accountService = {
  // Get all accounts
  async getAccounts(organizationId: string, filters?: any) {
    const where: any = { organizationId };

    if (filters?.status) where.status = filters.status;
    if (filters?.tier) where.tier = filters.tier;
    if (filters?.industry) where.industry = filters.industry;
    if (filters?.isTargetAccount !== undefined) where.isTargetAccount = filters.isTargetAccount;
    if (filters?.ownerId) where.ownerId = filters.ownerId;
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { website: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return prisma.account.findMany({
      where,
      include: {
        parent: { select: { id: true, name: true } },
        contacts: { where: { isActive: true }, take: 5 },
        _count: {
          select: { leads: true, opportunities: true, contracts: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
    });
  },

  // Get account hierarchy
  async getAccountHierarchy(accountId: string) {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: {
        parent: {
          include: { parent: true },
        },
        children: {
          include: {
            children: true,
            _count: { select: { leads: true, opportunities: true } },
          },
        },
      },
    });
    return account;
  },

  // Get single account with full details
  async getAccount(id: string) {
    return prisma.account.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        contacts: { where: { isActive: true }, orderBy: { isPrimary: 'desc' } },
        leads: { take: 10, orderBy: { createdAt: 'desc' } },
        opportunities: { orderBy: { createdAt: 'desc' } },
        contracts: { orderBy: { createdAt: 'desc' } },
        tickets: { take: 5, orderBy: { createdAt: 'desc' } },
        activities: { take: 20, orderBy: { occurredAt: 'desc' } },
        notes: { orderBy: { createdAt: 'desc' } },
        territory: true,
      },
    });
  },

  // Create account
  async createAccount(organizationId: string, config: AccountConfig) {
    const account = await prisma.account.create({
      data: {
        organizationId,
        name: config.name,
        code: config.code,
        website: config.website,
        industry: config.industry,
        subIndustry: config.subIndustry,
        companyType: config.companyType,
        employeeCount: config.employeeCount,
        annualRevenue: config.annualRevenue,
        yearFounded: config.yearFounded,
        description: config.description,
        billingAddress: config.billingAddress as any,
        shippingAddress: config.shippingAddress as any,
        headquarters: config.headquarters,
        tier: config.tier,
        status: config.status || 'PROSPECT',
        source: config.source,
        parentId: config.parentId,
        territoryId: config.territoryId,
        ownerId: config.ownerId,
        isTargetAccount: config.isTargetAccount || false,
        abmTier: config.abmTier,
      },
    });

    // Log activity
    await this.logActivity(account.id, null, 'DEAL_UPDATE', 'Account Created', `Account ${account.name} was created`);

    return account;
  },

  // Update account
  async updateAccount(id: string, config: Partial<AccountConfig>) {
    const account = await prisma.account.update({
      where: { id },
      data: {
        name: config.name,
        code: config.code,
        website: config.website,
        industry: config.industry,
        subIndustry: config.subIndustry,
        companyType: config.companyType,
        employeeCount: config.employeeCount,
        annualRevenue: config.annualRevenue,
        yearFounded: config.yearFounded,
        description: config.description,
        billingAddress: config.billingAddress as any,
        shippingAddress: config.shippingAddress as any,
        headquarters: config.headquarters,
        tier: config.tier,
        status: config.status,
        source: config.source,
        parentId: config.parentId,
        territoryId: config.territoryId,
        ownerId: config.ownerId,
        isTargetAccount: config.isTargetAccount,
        abmTier: config.abmTier,
        lastActivityAt: new Date(),
      },
    });

    return account;
  },

  // Delete account
  async deleteAccount(id: string) {
    return prisma.account.delete({ where: { id } });
  },

  // Add contact to account
  async addContact(accountId: string, config: ContactConfig) {
    // If setting as primary, unset other primary contacts
    if (config.isPrimary) {
      await prisma.accountContact.updateMany({
        where: { accountId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    return prisma.accountContact.create({
      data: {
        accountId,
        firstName: config.firstName,
        lastName: config.lastName,
        email: config.email,
        phone: config.phone,
        mobile: config.mobile,
        jobTitle: config.jobTitle,
        department: config.department,
        role: config.role,
        isPrimary: config.isPrimary || false,
        leadId: config.leadId,
      },
    });
  },

  // Update contact
  async updateContact(contactId: string, config: Partial<ContactConfig>) {
    return prisma.accountContact.update({
      where: { id: contactId },
      data: {
        firstName: config.firstName,
        lastName: config.lastName,
        email: config.email,
        phone: config.phone,
        mobile: config.mobile,
        jobTitle: config.jobTitle,
        department: config.department,
        role: config.role,
        isPrimary: config.isPrimary,
      },
    });
  },

  // Remove contact
  async removeContact(contactId: string) {
    return prisma.accountContact.update({
      where: { id: contactId },
      data: { isActive: false },
    });
  },

  // Log activity
  async logActivity(
    accountId: string,
    userId: string | null,
    type: string,
    subject: string,
    description?: string,
    relatedEntityType?: string,
    relatedEntityId?: string
  ) {
    return prisma.accountActivity.create({
      data: {
        accountId,
        userId,
        type: type as any,
        subject,
        description,
        relatedEntityType,
        relatedEntityId,
      },
    });
  },

  // Add note
  async addNote(accountId: string, userId: string, content: string, isPinned = false) {
    return prisma.accountNote.create({
      data: { accountId, userId, content, isPinned },
    });
  },

  // Calculate account health score
  async calculateHealthScore(accountId: string) {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: {
        leads: { where: { isConverted: true } },
        opportunities: { where: { status: 'OPEN' } },
        tickets: { where: { status: { in: ['NEW', 'OPEN', 'IN_PROGRESS'] } } },
        activities: { where: { occurredAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
      },
    });

    if (!account) return null;

    let score = 50; // Base score

    // Recent activity bonus
    if (account.activities.length > 10) score += 15;
    else if (account.activities.length > 5) score += 10;
    else if (account.activities.length > 0) score += 5;

    // Open opportunities bonus
    if (account.opportunities.length > 0) score += 15;

    // Converted leads bonus
    if (account.leads.length > 5) score += 15;
    else if (account.leads.length > 0) score += 10;

    // Open tickets penalty
    if (account.tickets.length > 5) score -= 20;
    else if (account.tickets.length > 2) score -= 10;
    else if (account.tickets.length > 0) score -= 5;

    score = Math.max(0, Math.min(100, score));

    // Update account
    await prisma.account.update({
      where: { id: accountId },
      data: { healthScore: score },
    });

    return score;
  },

  // Get account statistics
  async getAccountStats(organizationId: string) {
    const [byStatus, byTier, byIndustry, total] = await Promise.all([
      prisma.account.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: true,
      }),
      prisma.account.groupBy({
        by: ['tier'],
        where: { organizationId },
        _count: true,
      }),
      prisma.account.groupBy({
        by: ['industry'],
        where: { organizationId },
        _count: true,
        take: 10,
        orderBy: { _count: { industry: 'desc' } },
      }),
      prisma.account.count({ where: { organizationId } }),
    ]);

    return { byStatus, byTier, byIndustry, total };
  },

  // Merge duplicate accounts
  async mergeAccounts(primaryAccountId: string, secondaryAccountId: string) {
    // Move all related records to primary account
    await prisma.$transaction([
      prisma.accountContact.updateMany({
        where: { accountId: secondaryAccountId },
        data: { accountId: primaryAccountId },
      }),
      prisma.lead.updateMany({
        where: { accountId: secondaryAccountId },
        data: { accountId: primaryAccountId },
      }),
      prisma.opportunity.updateMany({
        where: { accountId: secondaryAccountId },
        data: { accountId: primaryAccountId },
      }),
      prisma.contract.updateMany({
        where: { accountId: secondaryAccountId },
        data: { accountId: primaryAccountId },
      }),
      prisma.serviceTicket.updateMany({
        where: { accountId: secondaryAccountId },
        data: { accountId: primaryAccountId },
      }),
      prisma.account.delete({ where: { id: secondaryAccountId } }),
    ]);

    return prisma.account.findUnique({ where: { id: primaryAccountId } });
  },
};
