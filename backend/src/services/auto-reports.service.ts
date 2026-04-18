import { prisma } from '../config/database';

// Report types available for scheduling
const REPORT_TYPES = [
  { value: 'leads', label: 'Lead Reports', description: 'Daily/weekly lead statistics and conversions' },
  { value: 'calls', label: 'Call Reports', description: 'Call activity, duration, and outcomes' },
  { value: 'payments', label: 'Payment Reports', description: 'Revenue and payment collection data' },
  { value: 'performance', label: 'Performance Reports', description: 'Team and individual performance metrics' },
  { value: 'campaigns', label: 'Campaign Reports', description: 'Campaign performance and ROI' },
  { value: 'followups', label: 'Follow-up Reports', description: 'Follow-up completion and outcomes' },
  { value: 'admissions', label: 'Admission Reports', description: 'Admission statistics and trends' },
  { value: 'ai-usage', label: 'AI Usage Reports', description: 'AI voice agent usage and costs' },
  { value: 'audit', label: 'Audit Reports', description: 'System activity and audit logs' },
];

// ==================== AUTO REPORT SCHEDULES ====================

// Get all auto report schedules for organization
export const getAutoReportSchedules = async (organizationId: string) => {
  return prisma.autoReportSchedule.findMany({
    where: { organizationId },
    include: {
      createdBy: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

// Get single auto report schedule
export const getAutoReportSchedule = async (id: string, organizationId: string) => {
  return prisma.autoReportSchedule.findFirst({
    where: { id, organizationId },
    include: {
      createdBy: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  });
};

// Create auto report schedule
export const createAutoReportSchedule = async (
  organizationId: string,
  createdById: string,
  data: {
    name: string;
    reportType: string;
    frequency: string;
    dayOfWeek?: number;
    dayOfMonth?: number;
    time: string;
    timezone?: string;
    recipients: string[];
    format?: string;
    filters?: Record<string, any>;
  }
) => {
  // Calculate next send time
  const nextSendAt = calculateNextSendTime(
    data.frequency,
    data.time,
    data.timezone || 'Asia/Kolkata',
    data.dayOfWeek,
    data.dayOfMonth
  );

  return prisma.autoReportSchedule.create({
    data: {
      organizationId,
      createdById,
      name: data.name,
      reportType: data.reportType,
      frequency: data.frequency,
      dayOfWeek: data.dayOfWeek,
      dayOfMonth: data.dayOfMonth,
      time: data.time,
      timezone: data.timezone || 'Asia/Kolkata',
      recipients: data.recipients,
      format: data.format || 'pdf',
      filters: data.filters,
      nextSendAt,
      isActive: true,
    },
    include: {
      createdBy: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  });
};

// Update auto report schedule
export const updateAutoReportSchedule = async (
  id: string,
  organizationId: string,
  data: Partial<{
    name: string;
    reportType: string;
    frequency: string;
    dayOfWeek: number;
    dayOfMonth: number;
    time: string;
    timezone: string;
    recipients: string[];
    format: string;
    filters: Record<string, any>;
    isActive: boolean;
  }>
) => {
  const current = await getAutoReportSchedule(id, organizationId);
  if (!current) throw new Error('Schedule not found');

  // Recalculate next send time if schedule changed
  let nextSendAt = current.nextSendAt;
  if (data.frequency || data.time || data.dayOfWeek !== undefined || data.dayOfMonth !== undefined) {
    nextSendAt = calculateNextSendTime(
      data.frequency || current.frequency,
      data.time || current.time,
      data.timezone || current.timezone,
      data.dayOfWeek ?? current.dayOfWeek ?? undefined,
      data.dayOfMonth ?? current.dayOfMonth ?? undefined
    );
  }

  return prisma.autoReportSchedule.update({
    where: { id },
    data: {
      ...data,
      nextSendAt,
    },
    include: {
      createdBy: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  });
};

// Delete auto report schedule
export const deleteAutoReportSchedule = async (id: string, organizationId: string) => {
  const schedule = await getAutoReportSchedule(id, organizationId);
  if (!schedule) throw new Error('Schedule not found');

  return prisma.autoReportSchedule.delete({
    where: { id },
  });
};

// Toggle schedule active status
export const toggleAutoReportSchedule = async (id: string, organizationId: string) => {
  const schedule = await getAutoReportSchedule(id, organizationId);
  if (!schedule) throw new Error('Schedule not found');

  return prisma.autoReportSchedule.update({
    where: { id },
    data: {
      isActive: !schedule.isActive,
      // Recalculate next send time if activating
      ...(schedule.isActive === false && {
        nextSendAt: calculateNextSendTime(
          schedule.frequency,
          schedule.time,
          schedule.timezone,
          schedule.dayOfWeek ?? undefined,
          schedule.dayOfMonth ?? undefined
        ),
      }),
    },
    include: {
      createdBy: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  });
};

// ==================== SCHEDULE EXECUTION ====================

// Get schedules due for execution
export const getDueSchedules = async () => {
  const now = new Date();

  return prisma.autoReportSchedule.findMany({
    where: {
      isActive: true,
      nextSendAt: { lte: now },
    },
    include: {
      organization: {
        select: { id: true, name: true, email: true },
      },
      createdBy: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  });
};

// Mark schedule as sent and update next send time
export const markScheduleSent = async (id: string) => {
  const schedule = await prisma.autoReportSchedule.findUnique({
    where: { id },
  });

  if (!schedule) throw new Error('Schedule not found');

  const nextSendAt = calculateNextSendTime(
    schedule.frequency,
    schedule.time,
    schedule.timezone,
    schedule.dayOfWeek ?? undefined,
    schedule.dayOfMonth ?? undefined
  );

  return prisma.autoReportSchedule.update({
    where: { id },
    data: {
      lastSentAt: new Date(),
      nextSendAt,
      sendCount: { increment: 1 },
    },
  });
};

// ==================== HELPER FUNCTIONS ====================

// Calculate next send time based on schedule
function calculateNextSendTime(
  frequency: string,
  time: string,
  timezone: string,
  dayOfWeek?: number,
  dayOfMonth?: number
): Date {
  const now = new Date();
  const [hours, minutes] = time.split(':').map(Number);

  // Create date in target timezone (simplified - in production use proper timezone library)
  let nextDate = new Date(now);
  nextDate.setHours(hours, minutes, 0, 0);

  // If time has passed today, start from tomorrow
  if (nextDate <= now) {
    nextDate.setDate(nextDate.getDate() + 1);
  }

  switch (frequency) {
    case 'daily':
      // Already set to next occurrence
      break;

    case 'weekly':
      // Find next occurrence of specified day
      if (dayOfWeek !== undefined) {
        const currentDay = nextDate.getDay();
        const daysUntil = (dayOfWeek - currentDay + 7) % 7;
        if (daysUntil === 0 && nextDate <= now) {
          nextDate.setDate(nextDate.getDate() + 7);
        } else {
          nextDate.setDate(nextDate.getDate() + daysUntil);
        }
      }
      break;

    case 'monthly':
      // Find next occurrence of specified day of month
      if (dayOfMonth !== undefined) {
        nextDate.setDate(dayOfMonth);
        if (nextDate <= now) {
          nextDate.setMonth(nextDate.getMonth() + 1);
          nextDate.setDate(dayOfMonth);
        }
        // Handle months with fewer days
        const daysInMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
        if (dayOfMonth > daysInMonth) {
          nextDate.setDate(daysInMonth);
        }
      }
      break;
  }

  return nextDate;
}

// Get available report types
export const getAvailableReportTypes = () => {
  return REPORT_TYPES;
};

// Validate schedule data
export const validateScheduleData = (data: {
  frequency: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
}): { valid: boolean; error?: string } => {
  if (!['daily', 'weekly', 'monthly'].includes(data.frequency)) {
    return { valid: false, error: 'Invalid frequency. Must be daily, weekly, or monthly.' };
  }

  if (data.frequency === 'weekly' && (data.dayOfWeek === undefined || data.dayOfWeek < 0 || data.dayOfWeek > 6)) {
    return { valid: false, error: 'Weekly schedule requires dayOfWeek (0-6).' };
  }

  if (data.frequency === 'monthly' && (data.dayOfMonth === undefined || data.dayOfMonth < 1 || data.dayOfMonth > 31)) {
    return { valid: false, error: 'Monthly schedule requires dayOfMonth (1-31).' };
  }

  return { valid: true };
};

export const autoReportsService = {
  getAutoReportSchedules,
  getAutoReportSchedule,
  createAutoReportSchedule,
  updateAutoReportSchedule,
  deleteAutoReportSchedule,
  toggleAutoReportSchedule,
  getDueSchedules,
  markScheduleSent,
  getAvailableReportTypes,
  validateScheduleData,
  REPORT_TYPES,
};
