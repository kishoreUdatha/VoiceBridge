/**
 * Notification Channels Constants
 */

import { NotificationEvent, ChannelConfig, ChannelType, ChannelFormData } from './notification-channels.types';

export const NOTIFICATION_EVENTS: NotificationEvent[] = [
  { id: 'lead.created', label: 'New Lead Created', description: 'When a new lead is added to the system', icon: '👤' },
  { id: 'lead.updated', label: 'Lead Updated', description: 'When lead information is modified', icon: '✏️' },
  { id: 'call.completed', label: 'Call Completed', description: 'When a voice call ends', icon: '📞' },
  { id: 'appointment.booked', label: 'Appointment Booked', description: 'When an appointment is scheduled', icon: '📅' },
  { id: 'voice.session.ended', label: 'AI Voice Session', description: 'When AI voice session completes', icon: '🤖' },
  { id: 'call.negative_sentiment', label: 'Negative Sentiment Alert', description: 'Alert for negative call sentiment', icon: '⚠️' },
];

export const CHANNEL_CONFIGS: Record<ChannelType, ChannelConfig> = {
  SLACK: {
    name: 'Slack',
    logo: 'https://cdn.worldvectorlogo.com/logos/slack-new-logo.svg',
    color: '#4A154B',
    bgGradient: 'from-[#4A154B] to-[#611f69]',
    lightBg: 'bg-purple-50',
    lightText: 'text-purple-700',
    placeholder: 'https://hooks.slack.com/services/YOUR_WORKSPACE/YOUR_CHANNEL/YOUR_TOKEN',
    instructions: [
      'Go to your Slack workspace settings',
      'Navigate to Apps → Incoming Webhooks',
      'Click "Add New Webhook to Workspace"',
      'Select the channel and copy the webhook URL'
    ]
  },
  TEAMS: {
    name: 'Microsoft Teams',
    logo: 'https://cdn.worldvectorlogo.com/logos/microsoft-teams-1.svg',
    color: '#5059C9',
    bgGradient: 'from-[#5059C9] to-[#7B83EB]',
    lightBg: 'bg-blue-50',
    lightText: 'text-blue-700',
    placeholder: 'https://outlook.office.com/webhook/...',
    instructions: [
      'Open your Teams channel',
      'Click ••• → Connectors',
      'Find "Incoming Webhook" and click Configure',
      'Name it and copy the webhook URL'
    ]
  },
  DISCORD: {
    name: 'Discord',
    logo: 'https://cdn.worldvectorlogo.com/logos/discord-6.svg',
    color: '#5865F2',
    bgGradient: 'from-[#5865F2] to-[#7289DA]',
    lightBg: 'bg-indigo-50',
    lightText: 'text-indigo-700',
    placeholder: 'https://discord.com/api/webhooks/...',
    instructions: [
      'Open Discord Server Settings',
      'Go to Integrations → Webhooks',
      'Click "New Webhook"',
      'Name it and copy the webhook URL'
    ]
  },
  CUSTOM_WEBHOOK: {
    name: 'Custom Webhook',
    logo: null,
    color: '#374151',
    bgGradient: 'from-gray-600 to-gray-700',
    lightBg: 'bg-gray-50',
    lightText: 'text-gray-700',
    placeholder: 'https://your-api.com/webhooks/notifications',
    instructions: [
      'Set up an endpoint to receive POST requests',
      'The payload will include event type and data',
      'Ensure your endpoint returns 200 OK',
      'Use HTTPS for secure communication'
    ]
  }
};

export const INITIAL_FORM_DATA: ChannelFormData = {
  name: '',
  type: 'SLACK',
  webhookUrl: '',
  events: ['lead.created', 'call.completed'],
};

export const QUICK_SETUP_PLATFORMS: ChannelType[] = ['SLACK', 'TEAMS', 'DISCORD'];
