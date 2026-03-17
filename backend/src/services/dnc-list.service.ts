/**
 * DNC (Do Not Call) List Service - Single Responsibility Principle
 * Handles Do Not Call list management
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type DNCReason = 'CUSTOMER_REQUEST' | 'LEGAL_REQUIREMENT' | 'WRONG_NUMBER' | 'DECEASED' | 'COMPETITOR' | 'SPAM_COMPLAINT' | 'OTHER';

export interface AddToDNCData {
  organizationId: string;
  phoneNumber: string;
  reason: DNCReason;
  notes?: string;
  addedBy?: string;
  expiresAt?: Date;
}

/**
 * Add phone number to DNC list
 */
export async function addToDNCList(data: AddToDNCData) {
  return prisma.doNotCallList.upsert({
    where: {
      organizationId_phoneNumber: {
        organizationId: data.organizationId,
        phoneNumber: data.phoneNumber,
      },
    },
    create: data,
    update: {
      reason: data.reason,
      notes: data.notes,
      expiresAt: data.expiresAt,
    },
  });
}

/**
 * Remove phone number from DNC list
 */
export async function removeFromDNCList(organizationId: string, phoneNumber: string) {
  return prisma.doNotCallList.delete({
    where: { organizationId_phoneNumber: { organizationId, phoneNumber } },
  });
}

/**
 * Check if phone number is on DNC list
 */
export async function isOnDNCList(organizationId: string, phoneNumber: string): Promise<boolean> {
  const entry = await prisma.doNotCallList.findUnique({
    where: { organizationId_phoneNumber: { organizationId, phoneNumber } },
  });
  return !!entry && (!entry.expiresAt || entry.expiresAt > new Date());
}

/**
 * Get full DNC list for organization
 */
export async function getDNCList(organizationId: string) {
  return prisma.doNotCallList.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Bulk import phone numbers to DNC list
 */
export async function importDNCList(organizationId: string, phoneNumbers: string[], reason: DNCReason, addedBy?: string) {
  const entries = phoneNumbers.map(phone => ({
    organizationId,
    phoneNumber: phone,
    reason,
    addedBy,
  }));

  return prisma.doNotCallList.createMany({
    data: entries,
    skipDuplicates: true,
  });
}

/**
 * Get DNC list entry for a specific phone number
 */
export async function getDNCEntry(organizationId: string, phoneNumber: string) {
  return prisma.doNotCallList.findUnique({
    where: { organizationId_phoneNumber: { organizationId, phoneNumber } },
  });
}

/**
 * Update DNC list entry
 */
export async function updateDNCEntry(organizationId: string, phoneNumber: string, data: {
  reason?: DNCReason;
  notes?: string;
  expiresAt?: Date | null;
}) {
  return prisma.doNotCallList.update({
    where: { organizationId_phoneNumber: { organizationId, phoneNumber } },
    data,
  });
}

/**
 * Get DNC statistics for organization
 */
export async function getDNCStats(organizationId: string) {
  const [total, byReason] = await Promise.all([
    prisma.doNotCallList.count({ where: { organizationId } }),
    prisma.doNotCallList.groupBy({
      by: ['reason'],
      where: { organizationId },
      _count: true,
    }),
  ]);

  return {
    total,
    byReason: byReason.reduce((acc, item) => {
      acc[item.reason] = item._count;
      return acc;
    }, {} as Record<string, number>),
  };
}

export const dncListService = {
  addToDNCList,
  removeFromDNCList,
  isOnDNCList,
  getDNCList,
  importDNCList,
  getDNCEntry,
  updateDNCEntry,
  getDNCStats,
};

export default dncListService;
