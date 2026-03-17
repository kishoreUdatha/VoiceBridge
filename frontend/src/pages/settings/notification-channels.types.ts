/**
 * Notification Channels Types
 */

export interface NotificationChannel {
  id: string;
  name: string;
  type: ChannelType;
  webhookUrl: string;
  events: string[];
  isActive: boolean;
  includeDetails: boolean;
  successCount: number;
  failureCount: number;
  lastTriggeredAt: string | null;
  lastError: string | null;
}

export type ChannelType = 'SLACK' | 'TEAMS' | 'DISCORD' | 'CUSTOM_WEBHOOK';

export interface NotificationEvent {
  id: string;
  label: string;
  description: string;
  icon: string;
}

export interface ChannelConfig {
  name: string;
  logo: string | null;
  color: string;
  bgGradient: string;
  lightBg: string;
  lightText: string;
  placeholder: string;
  instructions: string[];
}

export interface ChannelFormData {
  name: string;
  type: ChannelType;
  webhookUrl: string;
  events: string[];
}

export type ModalStep = 'select' | 'configure';

export interface ToastState {
  type: 'success' | 'error';
  message: string;
}
