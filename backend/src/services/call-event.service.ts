/**
 * Call Event Service - Single Responsibility Principle
 * Handles real-time call event logging and retrieval
 */

import { prisma } from '../config/database';


/**
 * Log a call event
 */
export async function logEvent(callId: string, eventType: string, data?: any) {
  return prisma.callEvent.create({
    data: { callId, eventType, data },
  });
}

/**
 * Get all events for a call
 */
export async function getCallEvents(callId: string) {
  return prisma.callEvent.findMany({
    where: { callId },
    orderBy: { timestamp: 'asc' },
  });
}

/**
 * Get recent events for an organization
 */
export async function getRecentEvents(organizationId: string, limit: number = 50) {
  // Get recent call IDs for the organization
  const recentCalls = await prisma.outboundCall.findMany({
    where: { agent: { organizationId } },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { id: true },
  });

  const callIds = recentCalls.map(c => c.id);

  return prisma.callEvent.findMany({
    where: { callId: { in: callIds } },
    orderBy: { timestamp: 'desc' },
    take: limit,
  });
}

/**
 * Get events by type
 */
export async function getEventsByType(callId: string, eventType: string) {
  return prisma.callEvent.findMany({
    where: { callId, eventType },
    orderBy: { timestamp: 'asc' },
  });
}

/**
 * Get the latest event for a call
 */
export async function getLatestEvent(callId: string) {
  return prisma.callEvent.findFirst({
    where: { callId },
    orderBy: { timestamp: 'desc' },
  });
}

/**
 * Delete old events (for cleanup)
 */
export async function deleteOldEvents(daysOld: number = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  return prisma.callEvent.deleteMany({
    where: {
      timestamp: { lt: cutoffDate },
    },
  });
}

/**
 * Get event statistics for a call
 */
export async function getEventStats(callId: string) {
  const events = await prisma.callEvent.findMany({
    where: { callId },
    select: { eventType: true },
  });

  const stats: Record<string, number> = {};
  for (const event of events) {
    stats[event.eventType] = (stats[event.eventType] || 0) + 1;
  }

  return {
    totalEvents: events.length,
    byType: stats,
  };
}

export const callEventService = {
  logEvent,
  getCallEvents,
  getRecentEvents,
  getEventsByType,
  getLatestEvent,
  deleteOldEvents,
  getEventStats,
};

export default callEventService;
