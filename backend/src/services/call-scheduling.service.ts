/**
 * Call Scheduling Service - Single Responsibility Principle
 * Handles scheduling and managing scheduled calls
 */

import { ScheduledCallStatus } from '@prisma/client';
import { prisma } from '../config/database';


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
 * Quick reminder options in minutes
 */
export type QuickReminderMinutes = 15 | 30 | 60 | 120 | 1440;

/**
 * Schedule a quick call reminder
 * 1-click reminder for: 15min, 30min, 1hr, 2hr, 1day (1440 min)
 */
export async function scheduleQuickReminder(data: {
  organizationId: string;
  userId: string;
  leadId: string;
  reminderMinutes: QuickReminderMinutes;
}) {
  // Validate reminder minutes
  const validMinutes: QuickReminderMinutes[] = [15, 30, 60, 120, 1440];
  if (!validMinutes.includes(data.reminderMinutes)) {
    throw new Error('Invalid reminder time. Must be 15, 30, 60, 120, or 1440 minutes');
  }

  // Get lead info
  const lead = await prisma.lead.findUnique({
    where: { id: data.leadId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      organizationId: true,
    },
  });

  if (!lead) {
    throw new Error('Lead not found');
  }

  if (lead.organizationId !== data.organizationId) {
    throw new Error('Lead does not belong to organization');
  }

  if (!lead.phone) {
    throw new Error('Lead does not have a phone number');
  }

  // Check DNC list
  const isDNC = await isOnDNCList(data.organizationId, lead.phone);
  if (isDNC) {
    throw new Error('Phone number is on Do Not Call list');
  }

  // Calculate reminder time
  const reminderAt = new Date();
  reminderAt.setMinutes(reminderAt.getMinutes() + data.reminderMinutes);

  // Get label for notes
  const reminderLabel =
    data.reminderMinutes === 15 ? '15 minutes' :
    data.reminderMinutes === 30 ? '30 minutes' :
    data.reminderMinutes === 60 ? '1 hour' :
    data.reminderMinutes === 120 ? '2 hours' :
    '1 day';

  // Get a default agent for the organization (we'll need to route to an agent)
  // For reminders, we typically don't auto-call, so agentId may be optional
  // But for the data model we need it - get the first available agent
  const agent = await prisma.aIVoiceAgent.findFirst({
    where: { organizationId: data.organizationId, isActive: true },
  });

  if (!agent) {
    throw new Error('No active voice agent configured for organization');
  }

  // Create the scheduled call reminder
  const reminder = await prisma.scheduledCall.create({
    data: {
      organizationId: data.organizationId,
      agentId: agent.id,
      phoneNumber: lead.phone,
      contactName: `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Unknown',
      scheduledAt: reminderAt,
      leadId: data.leadId,
      callType: 'REMINDER',
      priority: 2, // High priority for reminders
      notes: `Quick reminder set for ${reminderLabel}`,
    },
  });

  // Queue the reminder notification job
  try {
    const { jobQueueService } = await import('./job-queue.service');
    await jobQueueService.addJob({
      type: 'QUICK_CALL_REMINDER',
      data: {
        scheduledCallId: reminder.id,
        userId: data.userId,
        leadId: data.leadId,
        reminderAt: reminderAt.toISOString(),
      },
      runAt: reminderAt,
      organizationId: data.organizationId,
    });
  } catch (error) {
    console.warn('[CallScheduling] Could not queue reminder notification:', error);
    // Continue anyway - reminder is created
  }

  return {
    id: reminder.id,
    scheduledAt: reminder.scheduledAt,
    leadId: data.leadId,
    contactName: reminder.contactName,
    phoneNumber: reminder.phoneNumber,
    reminderLabel,
  };
}

/**
 * Get reminders for a user
 */
export async function getUserReminders(organizationId: string, userId: string, options?: {
  status?: ScheduledCallStatus;
  includeExpired?: boolean;
}) {
  const where: any = {
    organizationId,
    callType: 'REMINDER',
    status: options?.status || 'PENDING',
  };

  if (!options?.includeExpired) {
    where.scheduledAt = { gte: new Date() };
  }

  return prisma.scheduledCall.findMany({
    where,
    orderBy: { scheduledAt: 'asc' },
    include: {
      lead: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
        },
      },
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
  scheduleQuickReminder,
  getUserReminders,
};

export default callSchedulingService;
