import { PhoneNumberStatus, PhoneNumberType, PhoneNumberProvider } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../utils/errors';


interface CreatePhoneNumberInput {
  organizationId: string;
  number: string;
  displayNumber?: string;
  friendlyName?: string;
  provider?: PhoneNumberProvider;
  providerNumberId?: string;
  type?: PhoneNumberType;
  capabilities?: {
    voice?: boolean;
    sms?: boolean;
    whatsapp?: boolean;
  };
  monthlyRent?: number;
  perMinuteRate?: number;
  currency?: string;
  region?: string;
  city?: string;
  notes?: string;
}

interface UpdatePhoneNumberInput {
  displayNumber?: string;
  friendlyName?: string;
  type?: PhoneNumberType;
  capabilities?: {
    voice?: boolean;
    sms?: boolean;
    whatsapp?: boolean;
  };
  monthlyRent?: number;
  perMinuteRate?: number;
  status?: PhoneNumberStatus;
  region?: string;
  city?: string;
  notes?: string;
}

class PhoneNumberService {
  /**
   * Create a new phone number
   */
  async createPhoneNumber(input: CreatePhoneNumberInput) {
    // Normalize phone number to E.164 format
    const normalizedNumber = this.normalizePhoneNumber(input.number);

    // Check if number already exists in this organization
    const existing = await prisma.phoneNumber.findFirst({
      where: {
        organizationId: input.organizationId,
        number: normalizedNumber,
      },
    });

    if (existing) {
      throw new AppError('Phone number already exists in this organization', 400);
    }

    const phoneNumber = await prisma.phoneNumber.create({
      data: {
        organizationId: input.organizationId,
        number: normalizedNumber,
        displayNumber: input.displayNumber || this.formatDisplayNumber(normalizedNumber),
        friendlyName: input.friendlyName,
        provider: input.provider || 'MANUAL',
        providerNumberId: input.providerNumberId,
        type: input.type || 'LOCAL',
        capabilities: input.capabilities || { voice: true, sms: false, whatsapp: false },
        status: 'AVAILABLE',
        monthlyRent: input.monthlyRent || 0,
        perMinuteRate: input.perMinuteRate || 0,
        currency: input.currency || 'INR',
        region: input.region,
        city: input.city,
        notes: input.notes,
      },
    });

    return phoneNumber;
  }

  /**
   * Get all phone numbers for an organization
   */
  async getPhoneNumbers(organizationId: string, filters?: {
    status?: PhoneNumberStatus;
    type?: PhoneNumberType;
    assignedToAgentId?: string;
    unassigned?: boolean;
  }) {
    const where: any = { organizationId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.assignedToAgentId) {
      where.assignedToAgentId = filters.assignedToAgentId;
    }

    if (filters?.unassigned) {
      where.assignedToAgentId = null;
      where.status = 'AVAILABLE';
    }

    const phoneNumbers = await prisma.phoneNumber.findMany({
      where,
      include: {
        assignedAgent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return phoneNumbers;
  }

  /**
   * Get a single phone number
   */
  async getPhoneNumber(id: string, organizationId: string) {
    const phoneNumber = await prisma.phoneNumber.findFirst({
      where: { id, organizationId },
      include: {
        assignedAgent: {
          select: {
            id: true,
            name: true,
            industry: true,
          },
        },
        _count: {
          select: {
            callLogs: true,
          },
        },
      },
    });

    if (!phoneNumber) {
      throw new AppError('Phone number not found', 404);
    }

    return phoneNumber;
  }

  /**
   * Update a phone number
   */
  async updatePhoneNumber(id: string, organizationId: string, input: UpdatePhoneNumberInput) {
    const phoneNumber = await prisma.phoneNumber.findFirst({
      where: { id, organizationId },
    });

    if (!phoneNumber) {
      throw new AppError('Phone number not found', 404);
    }

    const updated = await prisma.phoneNumber.update({
      where: { id },
      data: {
        displayNumber: input.displayNumber,
        friendlyName: input.friendlyName,
        type: input.type,
        capabilities: input.capabilities,
        monthlyRent: input.monthlyRent,
        perMinuteRate: input.perMinuteRate,
        status: input.status,
        region: input.region,
        city: input.city,
        notes: input.notes,
      },
    });

    return updated;
  }

  /**
   * Delete a phone number
   */
  async deletePhoneNumber(id: string, organizationId: string) {
    const phoneNumber = await prisma.phoneNumber.findFirst({
      where: { id, organizationId },
    });

    if (!phoneNumber) {
      throw new AppError('Phone number not found', 404);
    }

    if (phoneNumber.assignedToAgentId) {
      throw new AppError('Cannot delete phone number that is assigned to an agent. Unassign it first.', 400);
    }

    await prisma.phoneNumber.delete({
      where: { id },
    });

    return { success: true };
  }

  /**
   * Assign a phone number to a voice agent
   */
  async assignToAgent(phoneNumberId: string, agentId: string, organizationId: string) {
    // Verify phone number exists and belongs to organization
    const phoneNumber = await prisma.phoneNumber.findFirst({
      where: { id: phoneNumberId, organizationId },
    });

    if (!phoneNumber) {
      throw new AppError('Phone number not found', 404);
    }

    if (phoneNumber.status === 'DISABLED') {
      throw new AppError('Cannot assign a disabled phone number', 400);
    }

    if (phoneNumber.assignedToAgentId && phoneNumber.assignedToAgentId !== agentId) {
      throw new AppError('Phone number is already assigned to another agent', 400);
    }

    // Verify agent exists and belongs to organization
    const agent = await prisma.voiceAgent.findFirst({
      where: { id: agentId, organizationId },
    });

    if (!agent) {
      throw new AppError('Voice agent not found', 404);
    }

    // Assign the phone number
    const updated = await prisma.phoneNumber.update({
      where: { id: phoneNumberId },
      data: {
        assignedToAgentId: agentId,
        assignedAt: new Date(),
        status: 'ASSIGNED',
      },
      include: {
        assignedAgent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return updated;
  }

  /**
   * Unassign a phone number from an agent
   */
  async unassignFromAgent(phoneNumberId: string, organizationId: string) {
    const phoneNumber = await prisma.phoneNumber.findFirst({
      where: { id: phoneNumberId, organizationId },
    });

    if (!phoneNumber) {
      throw new AppError('Phone number not found', 404);
    }

    const updated = await prisma.phoneNumber.update({
      where: { id: phoneNumberId },
      data: {
        assignedToAgentId: null,
        assignedAt: null,
        status: 'AVAILABLE',
      },
    });

    return updated;
  }

  /**
   * Get phone numbers assigned to a specific agent
   */
  async getAgentPhoneNumbers(agentId: string, organizationId: string) {
    const phoneNumbers = await prisma.phoneNumber.findMany({
      where: {
        organizationId,
        assignedToAgentId: agentId,
      },
      orderBy: { assignedAt: 'desc' },
    });

    return phoneNumbers;
  }

  /**
   * Get phone number stats for an organization
   */
  async getPhoneNumberStats(organizationId: string) {
    const [total, available, assigned, disabled] = await Promise.all([
      prisma.phoneNumber.count({ where: { organizationId } }),
      prisma.phoneNumber.count({ where: { organizationId, status: 'AVAILABLE' } }),
      prisma.phoneNumber.count({ where: { organizationId, status: 'ASSIGNED' } }),
      prisma.phoneNumber.count({ where: { organizationId, status: 'DISABLED' } }),
    ]);

    // Get usage stats for this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const callStats = await prisma.aICallLog.aggregate({
      where: {
        organizationId,
        createdAt: { gte: startOfMonth },
        phoneNumberId: { not: null },
      },
      _sum: {
        durationSeconds: true,
        totalCost: true,
      },
      _count: true,
    });

    return {
      total,
      available,
      assigned,
      disabled,
      monthlyStats: {
        totalCalls: callStats._count,
        totalMinutes: Math.ceil((callStats._sum.durationSeconds || 0) / 60),
        totalCost: callStats._sum.totalCost || 0,
      },
    };
  }

  /**
   * Get the primary phone number for an agent (first assigned number)
   */
  async getAgentPrimaryNumber(agentId: string, organizationId: string): Promise<string | null> {
    const phoneNumber = await prisma.phoneNumber.findFirst({
      where: {
        organizationId,
        assignedToAgentId: agentId,
        status: 'ASSIGNED',
      },
      orderBy: { assignedAt: 'asc' },
    });

    return phoneNumber?.number || null;
  }

  /**
   * Bulk import phone numbers
   */
  async bulkImport(organizationId: string, numbers: CreatePhoneNumberInput[]) {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as { number: string; error: string }[],
    };

    for (const num of numbers) {
      try {
        await this.createPhoneNumber({
          ...num,
          organizationId,
        });
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          number: num.number,
          error: error.message || 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Normalize phone number to E.164 format
   */
  private normalizePhoneNumber(phone: string): string {
    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');

    // If starts with 0, assume Indian number
    if (cleaned.startsWith('0')) {
      cleaned = '+91' + cleaned.slice(1);
    }

    // If no + and 10 digits, assume Indian number
    if (!cleaned.startsWith('+') && cleaned.length === 10) {
      cleaned = '+91' + cleaned;
    }

    // If no +, add it
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }

    return cleaned;
  }

  /**
   * Format phone number for display
   */
  private formatDisplayNumber(phone: string): string {
    // E.164 to display format
    if (phone.startsWith('+91') && phone.length === 13) {
      const number = phone.slice(3);
      return `+91 ${number.slice(0, 5)} ${number.slice(5)}`;
    }
    return phone;
  }
}

export const phoneNumberService = new PhoneNumberService();
export default phoneNumberService;
