import { prisma } from '../config/database';

// Default retry settings
const DEFAULT_RETRY_SETTINGS = {
  // Call Retry Settings
  callRetryEnabled: true,
  callMaxAttempts: 3,
  callRetryInterval: 60,
  callRetryStartTime: '09:00',
  callRetryEndTime: '21:00',
  callRetryDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'],

  // WhatsApp Retry Settings
  whatsappRetryEnabled: true,
  whatsappMaxAttempts: 2,
  whatsappRetryInterval: 120,
  whatsappRetryStartTime: '09:00',
  whatsappRetryEndTime: '21:00',

  // SMS Retry Settings
  smsRetryEnabled: true,
  smsMaxAttempts: 2,
  smsRetryInterval: 180,
  smsRetryStartTime: '09:00',
  smsRetryEndTime: '21:00',

  // Email Retry Settings
  emailRetryEnabled: true,
  emailMaxAttempts: 3,
  emailRetryInterval: 240,

  // Global Settings
  skipWeekends: true,
  skipHolidays: true,
  respectDND: true,
  maxTotalAttempts: 10,
};

// ==================== RETRY SETTINGS ====================

// Get retry settings for organization
export const getRetrySettings = async (organizationId: string) => {
  let settings = await prisma.retrySettings.findUnique({
    where: { organizationId },
  });

  if (!settings) {
    return { ...DEFAULT_RETRY_SETTINGS, organizationId };
  }

  // Parse JSON fields
  return {
    ...settings,
    callRetryDays: settings.callRetryDays as string[],
  };
};

// Update retry settings
export const updateRetrySettings = async (
  organizationId: string,
  data: Partial<{
    callRetryEnabled: boolean;
    callMaxAttempts: number;
    callRetryInterval: number;
    callRetryStartTime: string;
    callRetryEndTime: string;
    callRetryDays: string[];
    whatsappRetryEnabled: boolean;
    whatsappMaxAttempts: number;
    whatsappRetryInterval: number;
    whatsappRetryStartTime: string;
    whatsappRetryEndTime: string;
    smsRetryEnabled: boolean;
    smsMaxAttempts: number;
    smsRetryInterval: number;
    smsRetryStartTime: string;
    smsRetryEndTime: string;
    emailRetryEnabled: boolean;
    emailMaxAttempts: number;
    emailRetryInterval: number;
    skipWeekends: boolean;
    skipHolidays: boolean;
    respectDND: boolean;
    maxTotalAttempts: number;
  }>
) => {
  // Filter out organizationId if it exists in data
  const { organizationId: _, ...cleanData } = data as any;

  // Check if settings exist
  const existing = await prisma.retrySettings.findUnique({
    where: { organizationId },
  });

  if (existing) {
    // Update existing record
    return prisma.retrySettings.update({
      where: { organizationId },
      data: {
        ...cleanData,
        ...(cleanData.callRetryDays && { callRetryDays: cleanData.callRetryDays }),
      },
    });
  } else {
    // Create new record - must use relation connect
    return (prisma.retrySettings.create as any)({
      data: {
        organization: { connect: { id: organizationId } },
        ...DEFAULT_RETRY_SETTINGS,
        ...cleanData,
        callRetryDays: cleanData.callRetryDays || DEFAULT_RETRY_SETTINGS.callRetryDays,
      },
    });
  }
};

// Update channel-specific retry settings
export const updateChannelRetrySettings = async (
  organizationId: string,
  channel: 'call' | 'whatsapp' | 'sms' | 'email',
  data: {
    enabled?: boolean;
    maxAttempts?: number;
    retryInterval?: number;
    startTime?: string;
    endTime?: string;
    retryDays?: string[];
  }
) => {
  const channelPrefix = channel;
  const updateData: Record<string, any> = {};

  if (data.enabled !== undefined) updateData[`${channelPrefix}RetryEnabled`] = data.enabled;
  if (data.maxAttempts !== undefined) updateData[`${channelPrefix}MaxAttempts`] = data.maxAttempts;
  if (data.retryInterval !== undefined) updateData[`${channelPrefix}RetryInterval`] = data.retryInterval;
  if (data.startTime !== undefined) updateData[`${channelPrefix}RetryStartTime`] = data.startTime;
  if (data.endTime !== undefined) updateData[`${channelPrefix}RetryEndTime`] = data.endTime;
  if (channel === 'call' && data.retryDays !== undefined) updateData.callRetryDays = data.retryDays;

  return updateRetrySettings(organizationId, updateData);
};

// Get channel-specific retry settings
export const getChannelRetrySettings = async (
  organizationId: string,
  channel: 'call' | 'whatsapp' | 'sms' | 'email'
) => {
  const settings = await getRetrySettings(organizationId);

  switch (channel) {
    case 'call':
      return {
        enabled: settings.callRetryEnabled,
        maxAttempts: settings.callMaxAttempts,
        retryInterval: settings.callRetryInterval,
        startTime: settings.callRetryStartTime,
        endTime: settings.callRetryEndTime,
        retryDays: settings.callRetryDays,
      };
    case 'whatsapp':
      return {
        enabled: settings.whatsappRetryEnabled,
        maxAttempts: settings.whatsappMaxAttempts,
        retryInterval: settings.whatsappRetryInterval,
        startTime: settings.whatsappRetryStartTime,
        endTime: settings.whatsappRetryEndTime,
      };
    case 'sms':
      return {
        enabled: settings.smsRetryEnabled,
        maxAttempts: settings.smsMaxAttempts,
        retryInterval: settings.smsRetryInterval,
        startTime: settings.smsRetryStartTime,
        endTime: settings.smsRetryEndTime,
      };
    case 'email':
      return {
        enabled: settings.emailRetryEnabled,
        maxAttempts: settings.emailMaxAttempts,
        retryInterval: settings.emailRetryInterval,
      };
    default:
      return null;
  }
};

// Reset retry settings to defaults
export const resetRetrySettings = async (organizationId: string) => {
  // Check if settings exist
  const existing = await prisma.retrySettings.findUnique({
    where: { organizationId },
  });

  if (existing) {
    return prisma.retrySettings.update({
      where: { organizationId },
      data: DEFAULT_RETRY_SETTINGS,
    });
  } else {
    return (prisma.retrySettings.create as any)({
      data: {
        organization: { connect: { id: organizationId } },
        ...DEFAULT_RETRY_SETTINGS,
      },
    });
  }
};

// Check if retry is allowed based on settings
export const isRetryAllowed = async (
  organizationId: string,
  channel: 'call' | 'whatsapp' | 'sms' | 'email',
  currentAttempts: number,
  totalAttempts: number
) => {
  const settings = await getRetrySettings(organizationId);
  const channelSettings = await getChannelRetrySettings(organizationId, channel);

  if (!channelSettings?.enabled) return false;
  if (currentAttempts >= channelSettings.maxAttempts) return false;
  if (totalAttempts >= settings.maxTotalAttempts) return false;

  // Check time window
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  if (channelSettings.startTime && channelSettings.endTime) {
    if (currentTime < channelSettings.startTime || currentTime > channelSettings.endTime) {
      return false;
    }
  }

  // Check day of week for calls
  if (channel === 'call' && channelSettings.retryDays) {
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const today = days[now.getDay()];
    if (!channelSettings.retryDays.includes(today)) {
      return false;
    }
  }

  // Check weekends
  if (settings.skipWeekends) {
    const dayOfWeek = now.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) return false;
  }

  return true;
};

export const retrySettingsService = {
  getRetrySettings,
  updateRetrySettings,
  updateChannelRetrySettings,
  getChannelRetrySettings,
  resetRetrySettings,
  isRetryAllowed,
  DEFAULT_RETRY_SETTINGS,
};
