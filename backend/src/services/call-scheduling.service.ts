/**
 * Call Scheduling Service - Single Responsibility Principle
 * Handles scheduling and managing scheduled calls
 */

import { PrismaClient, ScheduledCallStatus } from '@prisma/client';

const prisma = new PrismaClient();

export interface ScheduleCallData {
  organizationId: string;
  agentId: string;
  phoneNumber: string;
  contactName?: string;
  scheduledAt: Date;
  leadId?: string;
  callType?: 'SCHEDULED' | 'CALLBACK' | 'FOLLOWUP' | 'REMINDER';
  priority?: number;
  notes?: string;
}

/**
 * Schedule a new call
 */
export async function scheduleCall(data: ScheduleCallData) {
  // Check DNC list
  const isDNC = await isOnDNCList(data.organizationId, data.phoneNumber);
  if (isDNC) {
    throw new Error('Phone number is on Do Not Call list');
  }

  return prisma.scheduledCall.create({
    data: {
      organizationId: data.organizationId,
      agentId: data.agentId,
      phoneNumber: data.phoneNumber,
      contactName: data.contactName,
      scheduledAt: data.scheduledAt,
      leadId: data.leadId,
      callType: data.callType || 'SCHEDULED',
      priority: data.priority || 5,
      notes: data.notes,
    },
  });
}

/**
 * Schedule a callback from an existing call
 */
export async function scheduleCallback(callId: string, callbackTime: Date) {
  const call = await prisma.outboundCall.findUnique({
    where: { id: callId },
    include: { agent: true },
  });

  if (!call) throw new Error('Call not found');

  return scheduleCall({
    organizationId: call.agent.organizationId,
    agentId: call.agentId,
    phoneNumber: call.phoneNumber,
    scheduledAt: callbackTime,
    leadId: call.leadId || undefined,
    callType: 'CALLBACK',
    priority: 1, // High priority for callbacks
    notes: `Callback requested during call ${callId}`,
  });
}

/**
 * Get scheduled calls with filters
 */
export async function getScheduledCalls(organizationId: string, options: {
  status?: ScheduledCallStatus;
  fromDate?: Date;
  toDate?: Date;
  agentId?: string;
}) {
  const where: any = { organizationId };

  if (options.status) where.status = options.status;
  if (options.agentId) where.agentId = options.agentId;
  if (options.fromDate || options.toDate) {
    where.scheduledAt = {};
    if (options.fromDate) where.scheduledAt.gte = options.fromDate;
    if (options.toDate) where.scheduledAt.lte = options.toDate;
  }

  return prisma.scheduledCall.findMany({
    where,
    orderBy: [{ priority: 'asc' }, { scheduledAt: 'asc' }],
    include: { agent: { select: { id: true, name: true } } },
  });
}

/**
 * Get calls that are due for execution
 */
export async function getDueScheduledCalls() {
  const now = new Date();
  return prisma.scheduledCall.findMany({
    where: {
      status: 'PENDING',
      scheduledAt: { lte: now },
    },
    orderBy: [{ priority: 'asc' }, { scheduledAt: 'asc' }],
    include: { agent: true },
  });
}

/**
 * Update scheduled call status
 */
export async function updateScheduledCallStatus(id: string, status: ScheduledCallStatus, resultCallId?: string) {
  return prisma.scheduledCall.update({
    where: { id },
    data: {
      status,
      resultCallId,
      completedAt: ['COMPLETED', 'FAILED', 'CANCELLED'].includes(status) ? new Date() : undefined,
    },
  });
}

/**
 * Reschedule a call to a new time
 */
export async function rescheduleCall(id: string, newTime: Date) {
  return prisma.scheduledCall.update({
    where: { id },
    data: {
      scheduledAt: newTime,
      status: 'PENDING',
      attemptCount: 0,
    },
  });
}

/**
 * Check if phone number is on DNC list
 */
async function isOnDNCList(organizationId: string, phoneNumber: string): Promise<boolean> {
  const dnc = await prisma.doNotCallList.findUnique({
    where: { organizationId_phoneNumber: { organizationId, phoneNumber } },
  });
  return !!dnc && (!dnc.expiresAt || dnc.expiresAt > new Date());
}

/**
 * Cancel a scheduled call
 */
export async function cancelScheduledCall(id: string, reason?: string) {
  return prisma.scheduledCall.update({
    where: { id },
    data: {
      status: 'CANCELLED',
      completedAt: new Date(),
      notes: reason ? `Cancelled: ${reason}` : undefined,
    },
  });
}

/**
 * Get scheduled call by ID
 */
export async function getScheduledCallById(id: string) {
  return prisma.scheduledCall.findUnique({
    where: { id },
    include: { agent: true },
  });
}

export const callSchedulingService = {
  scheduleCall,
  scheduleCallback,
  getScheduledCalls,
  getDueScheduledCalls,
  updateScheduledCallStatus,
  rescheduleCall,
  cancelScheduledCall,
  getScheduledCallById,
};

export default callSchedulingService;
