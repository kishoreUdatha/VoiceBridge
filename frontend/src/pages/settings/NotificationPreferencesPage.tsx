/**
 * Notification Preferences Page - Configure email, push, and in-app notifications
 * Connected to real API for persistent storage
 * Compact table/matrix design
 */
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  BellIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  ArrowLeftIcon,
  SpeakerWaveIcon,
  MoonIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { notificationPreferencesService } from '../../services/notification-preferences.service';

interface NotificationChannel {
  email: boolean;
  push: boolean;
  inApp: boolean;
  sms: boolean;
}

interface NotificationCategory {
  id: string;
  name: string;
  description: string;
  channels: NotificationChannel;
}

interface NotificationSettings {
  categories: NotificationCategory[];
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  showPreview: boolean;
  digestEnabled: boolean;
  digestFrequency: 'daily' | 'weekly';
  digestTime: string;
}

const defaultCategories: NotificationCategory[] = [
  { id: 'leads', name: 'New Leads', description: 'When a new lead is assigned to you', channels: { email: true, push: true, inApp: true, sms: false } },
  { id: 'calls', name: 'Missed Calls', description: 'When you miss an incoming call', channels: { email: true, push: true, inApp: true, sms: true } },
  { id: 'followups', name: 'Follow-up Reminders', description: 'Reminders for scheduled follow-ups', channels: { email: true, push: true, inApp: true, sms: false } },
  { id: 'tasks', name: 'Task Assignments', description: 'When a task is assigned to you', channels: { email: true, push: true, inApp: true, sms: false } },
  { id: 'task_due', name: 'Task Due Dates', description: 'Reminders for upcoming task deadlines', channels: { email: true, push: true, inApp: true, sms: false } },
  { id: 'messages', name: 'New Messages', description: 'WhatsApp, SMS, and chat messages', channels: { email: false, push: true, inApp: true, sms: false } },
  { id: 'approvals', name: 'Approval Requests', description: 'When someone requests your approval', channels: { email: true, push: true, inApp: true, sms: false } },
  { id: 'team', name: 'Team Updates', description: 'Team performance and activity updates', channels: { email: true, push: false, inApp: true, sms: false } },
  { id: 'reports', name: 'Report Generation', description: 'When scheduled reports are ready', channels: { email: true, push: false, inApp: true, sms: false } },
  { id: 'system', name: 'System Alerts', description: 'Important system notifications', channels: { email: true, push: true, inApp: true, sms: false } },
];

export default function NotificationPreferencesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    categories: defaultCategories,
    quietHours: { enabled: true, start: '22:00', end: '08:00' },
    soundEnabled: true,
    vibrationEnabled: true,
    showPreview: true,
    digestEnabled: false,
    digestFrequency: 'daily',
    digestTime: '09:00',
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await notificationPreferencesService.getNotificationPreferences();
        setSettings(prev => ({
          ...prev,
          categories: prev.categories.map(cat => ({
            ...cat,
            channels: data.categoryPreferences?.[cat.id] || cat.channels,
          })),
          quietHours: {
            enabled: data.quietHoursEnabled ?? prev.quietHours.enabled,
            start: data.quietHoursStart || prev.quietHours.start,
            end: data.quietHoursEnd || prev.quietHours.end,
          },
          soundEnabled: data.soundEnabled ?? prev.soundEnabled,
          vibrationEnabled: data.vibrationEnabled ?? prev.vibrationEnabled,
          showPreview: data.showPreview ?? prev.showPreview,
          digestEnabled: data.digestEnabled ?? prev.digestEnabled,
          digestFrequency: data.digestFrequency || prev.digestFrequency,
          digestTime: data.digestTime || prev.digestTime,
        }));
      } catch (error) {
        console.error('Failed to load notification preferences:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  const toggleChannel = (categoryId: string, channel: keyof NotificationChannel) => {
    setSettings(prev => ({
      ...prev,
      categories: prev.categories.map(cat =>
        cat.id === categoryId
          ? { ...cat, channels: { ...cat.channels, [channel]: !cat.channels[channel] } }
          : cat
      ),
    }));
  };

  const toggleAllForChannel = (channel: keyof NotificationChannel) => {
    const allEnabled = settings.categories.every(cat => cat.channels[channel]);
    setSettings(prev => ({
      ...prev,
      categories: prev.categories.map(cat => ({
        ...cat,
        channels: { ...cat.channels, [channel]: !allEnabled }
      })),
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const categoryPreferences: Record<string, NotificationChannel> = {};
      settings.categories.forEach(cat => {
        categoryPreferences[cat.id] = cat.channels;
      });

      await notificationPreferencesService.updateNotificationPreferences({
        categoryPreferences,
        quietHoursEnabled: settings.quietHours.enabled,
        quietHoursStart: settings.quietHours.start,
        quietHoursEnd: settings.quietHours.end,
        soundEnabled: settings.soundEnabled,
        vibrationEnabled: settings.vibrationEnabled,
        showPreview: settings.showPreview,
        digestEnabled: settings.digestEnabled,
        digestFrequency: settings.digestFrequency,
        digestTime: settings.digestTime,
      });
      toast.success('Notification preferences saved');
    } catch (error) {
      toast.error('Failed to save notification preferences');
      console.error('Failed to save notification preferences:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const channels: (keyof NotificationChannel)[] = ['email', 'push', 'inApp', 'sms'];
  const channelLabels = { email: 'Email', push: 'Push', inApp: 'In-App', sms: 'SMS' };
  const channelIcons = {
    email: EnvelopeIcon,
    push: BellIcon,
    inApp: ComputerDesktopIcon,
    sms: DevicePhoneMobileIcon,
  };

  return (
    <div className="p-6 space-y-4 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/settings" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeftIcon className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Notification Preferences</h1>
            <p className="text-sm text-slate-500">Manage how and when you receive notifications</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-5 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Notification Matrix Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-64">
                  Notification Type
                </th>
                {channels.map((channel) => {
                  const Icon = channelIcons[channel];
                  const allEnabled = settings.categories.every(cat => cat.channels[channel]);
                  const someEnabled = settings.categories.some(cat => cat.channels[channel]);
                  return (
                    <th key={channel} className="px-3 py-3 text-center w-20">
                      <button
                        onClick={() => toggleAllForChannel(channel)}
                        className="flex flex-col items-center gap-1 mx-auto group"
                        title={`Toggle all ${channelLabels[channel]}`}
                      >
                        <Icon className="w-4 h-4 text-slate-500 group-hover:text-primary-600" />
                        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          {channelLabels[channel]}
                        </span>
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                          allEnabled ? 'bg-primary-600 border-primary-600' : someEnabled ? 'border-primary-400 bg-primary-50' : 'border-slate-300'
                        }`}>
                          {allEnabled && <CheckIcon className="w-3 h-3 text-white" />}
                          {someEnabled && !allEnabled && <div className="w-1.5 h-1.5 bg-primary-500 rounded-sm" />}
                        </div>
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {settings.categories.map((category) => (
                <tr key={category.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-slate-900 text-sm">{category.name}</div>
                    <div className="text-xs text-slate-500">{category.description}</div>
                  </td>
                  {channels.map((channel) => (
                    <td key={channel} className="px-3 py-2.5 text-center">
                      <button
                        onClick={() => toggleChannel(category.id, channel)}
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center mx-auto transition-all ${
                          category.channels[channel]
                            ? 'bg-primary-600 border-primary-600 text-white'
                            : 'border-slate-300 hover:border-primary-400'
                        }`}
                      >
                        {category.channels[channel] && <CheckIcon className="w-4 h-4" />}
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Settings Row */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center gap-6">
          {/* Quiet Hours */}
          <div className="flex items-center gap-3">
            <MoonIcon className="w-5 h-5 text-indigo-600" />
            <span className="text-sm font-medium text-slate-700">Quiet Hours</span>
            <button
              onClick={() => setSettings(prev => ({
                ...prev,
                quietHours: { ...prev.quietHours, enabled: !prev.quietHours.enabled }
              }))}
              className={`w-10 h-5 rounded-full transition-colors ${
                settings.quietHours.enabled ? 'bg-primary-600' : 'bg-slate-300'
              }`}
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${
                settings.quietHours.enabled ? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </button>
            {settings.quietHours.enabled && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="time"
                  value={settings.quietHours.start}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    quietHours: { ...prev.quietHours, start: e.target.value }
                  }))}
                  className="px-2 py-1 border border-slate-300 rounded text-xs"
                />
                <span>to</span>
                <input
                  type="time"
                  value={settings.quietHours.end}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    quietHours: { ...prev.quietHours, end: e.target.value }
                  }))}
                  className="px-2 py-1 border border-slate-300 rounded text-xs"
                />
              </div>
            )}
          </div>

          <div className="h-6 w-px bg-slate-200" />

          {/* Sound */}
          <div className="flex items-center gap-2">
            <SpeakerWaveIcon className="w-4 h-4 text-slate-500" />
            <span className="text-sm text-slate-600">Sound</span>
            <button
              onClick={() => setSettings(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
              className={`w-10 h-5 rounded-full transition-colors ${
                settings.soundEnabled ? 'bg-primary-600' : 'bg-slate-300'
              }`}
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${
                settings.soundEnabled ? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          {/* Vibration */}
          <div className="flex items-center gap-2">
            <DevicePhoneMobileIcon className="w-4 h-4 text-slate-500" />
            <span className="text-sm text-slate-600">Vibrate</span>
            <button
              onClick={() => setSettings(prev => ({ ...prev, vibrationEnabled: !prev.vibrationEnabled }))}
              className={`w-10 h-5 rounded-full transition-colors ${
                settings.vibrationEnabled ? 'bg-primary-600' : 'bg-slate-300'
              }`}
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${
                settings.vibrationEnabled ? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          {/* Preview */}
          <div className="flex items-center gap-2">
            <ComputerDesktopIcon className="w-4 h-4 text-slate-500" />
            <span className="text-sm text-slate-600">Preview</span>
            <button
              onClick={() => setSettings(prev => ({ ...prev, showPreview: !prev.showPreview }))}
              className={`w-10 h-5 rounded-full transition-colors ${
                settings.showPreview ? 'bg-primary-600' : 'bg-slate-300'
              }`}
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${
                settings.showPreview ? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          <div className="h-6 w-px bg-slate-200" />

          {/* Email Digest Toggle */}
          <div className="flex items-center gap-2">
            <EnvelopeIcon className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-slate-600">Email Digest</span>
            <button
              onClick={() => setSettings(prev => ({ ...prev, digestEnabled: !prev.digestEnabled }))}
              className={`w-10 h-5 rounded-full transition-colors ${
                settings.digestEnabled ? 'bg-primary-600' : 'bg-slate-300'
              }`}
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${
                settings.digestEnabled ? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </button>
            {settings.digestEnabled && (
              <div className="flex items-center gap-2 text-sm">
                <select
                  value={settings.digestFrequency}
                  onChange={(e) => setSettings(prev => ({ ...prev, digestFrequency: e.target.value as any }))}
                  className="px-2 py-1 border border-slate-300 rounded text-xs"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
                <span className="text-slate-500">at</span>
                <input
                  type="time"
                  value={settings.digestTime}
                  onChange={(e) => setSettings(prev => ({ ...prev, digestTime: e.target.value }))}
                  className="px-2 py-1 border border-slate-300 rounded text-xs"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex justify-end gap-3">
        <Link
          to="/settings"
          className="px-5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Cancel
        </Link>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-5 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
