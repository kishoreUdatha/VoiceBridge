/**
 * Retry Settings Page - Configure call and message retry attempts
 * Connected to real API for persistent storage
 */
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  ArrowPathIcon,
  PhoneIcon,
  ChatBubbleLeftIcon,
  EnvelopeIcon,
  ClockIcon,
  ArrowLeftIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { retrySettingsService, RetrySettings as APIRetrySettings } from '../../services/retry-settings.service';

interface RetryConfig {
  enabled: boolean;
  maxAttempts: number;
  intervalMinutes: number;
  intervalUnit: 'minutes' | 'hours' | 'days';
  stopOnSuccess: boolean;
  stopOnReply: boolean;
  timeRestrictions: {
    enabled: boolean;
    startTime: string;
    endTime: string;
    daysOfWeek: string[];
  };
}

interface RetrySettings {
  calls: RetryConfig;
  whatsapp: RetryConfig;
  sms: RetryConfig;
  email: RetryConfig;
}

export default function RetrySettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<RetrySettings>({
    calls: {
      enabled: true,
      maxAttempts: 3,
      intervalMinutes: 30,
      intervalUnit: 'minutes',
      stopOnSuccess: true,
      stopOnReply: false,
      timeRestrictions: {
        enabled: true,
        startTime: '09:00',
        endTime: '20:00',
        daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
      },
    },
    whatsapp: {
      enabled: true,
      maxAttempts: 2,
      intervalMinutes: 60,
      intervalUnit: 'minutes',
      stopOnSuccess: true,
      stopOnReply: true,
      timeRestrictions: {
        enabled: true,
        startTime: '08:00',
        endTime: '21:00',
        daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      },
    },
    sms: {
      enabled: true,
      maxAttempts: 2,
      intervalMinutes: 120,
      intervalUnit: 'minutes',
      stopOnSuccess: true,
      stopOnReply: true,
      timeRestrictions: {
        enabled: false,
        startTime: '09:00',
        endTime: '18:00',
        daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      },
    },
    email: {
      enabled: true,
      maxAttempts: 3,
      intervalMinutes: 24,
      intervalUnit: 'hours',
      stopOnSuccess: true,
      stopOnReply: true,
      timeRestrictions: {
        enabled: false,
        startTime: '09:00',
        endTime: '18:00',
        daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      },
    },
  });

  // Load settings from API
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await retrySettingsService.getRetrySettings();
        // Transform API data to component format
        setSettings({
          calls: {
            enabled: data.callRetryEnabled ?? true,
            maxAttempts: data.callMaxAttempts ?? 3,
            intervalMinutes: data.callRetryInterval ?? 30,
            intervalUnit: 'minutes',
            stopOnSuccess: true,
            stopOnReply: false,
            timeRestrictions: {
              enabled: !!data.callRetryStartTime,
              startTime: data.callRetryStartTime || '09:00',
              endTime: data.callRetryEndTime || '20:00',
              daysOfWeek: data.callRetryDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
            },
          },
          whatsapp: {
            enabled: data.whatsappRetryEnabled ?? true,
            maxAttempts: data.whatsappMaxAttempts ?? 2,
            intervalMinutes: data.whatsappRetryInterval ?? 60,
            intervalUnit: 'minutes',
            stopOnSuccess: true,
            stopOnReply: true,
            timeRestrictions: {
              enabled: !!data.whatsappRetryStartTime,
              startTime: data.whatsappRetryStartTime || '08:00',
              endTime: data.whatsappRetryEndTime || '21:00',
              daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
            },
          },
          sms: {
            enabled: data.smsRetryEnabled ?? true,
            maxAttempts: data.smsMaxAttempts ?? 2,
            intervalMinutes: data.smsRetryInterval ?? 120,
            intervalUnit: 'minutes',
            stopOnSuccess: true,
            stopOnReply: true,
            timeRestrictions: {
              enabled: !!data.smsRetryStartTime,
              startTime: data.smsRetryStartTime || '09:00',
              endTime: data.smsRetryEndTime || '18:00',
              daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
            },
          },
          email: {
            enabled: data.emailRetryEnabled ?? true,
            maxAttempts: data.emailMaxAttempts ?? 3,
            intervalMinutes: data.emailRetryInterval ?? 24,
            intervalUnit: 'hours',
            stopOnSuccess: true,
            stopOnReply: true,
            timeRestrictions: {
              enabled: false,
              startTime: '09:00',
              endTime: '18:00',
              daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
            },
          },
        });
      } catch (error) {
        console.error('Failed to load retry settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const [activeTab, setActiveTab] = useState<'calls' | 'whatsapp' | 'sms' | 'email'>('calls');

  const tabs = [
    { id: 'calls', name: 'Calls', icon: PhoneIcon, color: 'text-blue-600 bg-blue-100' },
    { id: 'whatsapp', name: 'WhatsApp', icon: ChatBubbleLeftIcon, color: 'text-green-600 bg-green-100' },
    { id: 'sms', name: 'SMS', icon: ChatBubbleLeftIcon, color: 'text-purple-600 bg-purple-100' },
    { id: 'email', name: 'Email', icon: EnvelopeIcon, color: 'text-orange-600 bg-orange-100' },
  ];

  const daysOfWeek = [
    { id: 'monday', label: 'Mon' },
    { id: 'tuesday', label: 'Tue' },
    { id: 'wednesday', label: 'Wed' },
    { id: 'thursday', label: 'Thu' },
    { id: 'friday', label: 'Fri' },
    { id: 'saturday', label: 'Sat' },
    { id: 'sunday', label: 'Sun' },
  ];

  const updateConfig = (channel: keyof RetrySettings, updates: Partial<RetryConfig>) => {
    setSettings(prev => ({
      ...prev,
      [channel]: { ...prev[channel], ...updates },
    }));
  };

  const updateTimeRestrictions = (channel: keyof RetrySettings, updates: Partial<RetryConfig['timeRestrictions']>) => {
    setSettings(prev => ({
      ...prev,
      [channel]: {
        ...prev[channel],
        timeRestrictions: { ...prev[channel].timeRestrictions, ...updates },
      },
    }));
  };

  const toggleDay = (channel: keyof RetrySettings, day: string) => {
    const currentDays = settings[channel].timeRestrictions.daysOfWeek;
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day];
    updateTimeRestrictions(channel, { daysOfWeek: newDays });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Transform component format to API format
      const apiData = {
        callRetryEnabled: settings.calls.enabled,
        callMaxAttempts: settings.calls.maxAttempts,
        callRetryInterval: settings.calls.intervalMinutes,
        callRetryStartTime: settings.calls.timeRestrictions.enabled ? settings.calls.timeRestrictions.startTime : null,
        callRetryEndTime: settings.calls.timeRestrictions.enabled ? settings.calls.timeRestrictions.endTime : null,
        callRetryDays: settings.calls.timeRestrictions.daysOfWeek,
        whatsappRetryEnabled: settings.whatsapp.enabled,
        whatsappMaxAttempts: settings.whatsapp.maxAttempts,
        whatsappRetryInterval: settings.whatsapp.intervalMinutes,
        whatsappRetryStartTime: settings.whatsapp.timeRestrictions.enabled ? settings.whatsapp.timeRestrictions.startTime : null,
        whatsappRetryEndTime: settings.whatsapp.timeRestrictions.enabled ? settings.whatsapp.timeRestrictions.endTime : null,
        smsRetryEnabled: settings.sms.enabled,
        smsMaxAttempts: settings.sms.maxAttempts,
        smsRetryInterval: settings.sms.intervalMinutes,
        smsRetryStartTime: settings.sms.timeRestrictions.enabled ? settings.sms.timeRestrictions.startTime : null,
        smsRetryEndTime: settings.sms.timeRestrictions.enabled ? settings.sms.timeRestrictions.endTime : null,
        emailRetryEnabled: settings.email.enabled,
        emailMaxAttempts: settings.email.maxAttempts,
        emailRetryInterval: settings.email.intervalMinutes,
      };
      await retrySettingsService.updateRetrySettings(apiData);
      toast.success('Retry settings saved successfully');
    } catch (error) {
      toast.error('Failed to save retry settings');
      console.error('Failed to save retry settings:', error);
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

  const currentConfig = settings[activeTab];
  const currentTab = tabs.find(t => t.id === activeTab)!;

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/settings"
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Retry Settings</h1>
          <p className="text-sm text-slate-500">Configure automatic retry attempts for calls and messages</p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <InformationCircleIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-blue-800">
            Retry settings help ensure your messages and calls reach their intended recipients.
            Configure the number of attempts, intervals, and time restrictions for each channel.
          </p>
        </div>
      </div>

      {/* Channel Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600 bg-primary-50/50'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className={`p-1.5 rounded-lg ${tab.color}`}>
                <tab.icon className="w-4 h-4" />
              </div>
              {tab.name}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-6">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${currentTab.color}`}>
                <currentTab.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-slate-900">Enable {currentTab.name} Retry</p>
                <p className="text-xs text-slate-500">Automatically retry failed {currentTab.name.toLowerCase()}</p>
              </div>
            </div>
            <button
              onClick={() => updateConfig(activeTab, { enabled: !currentConfig.enabled })}
              className={`w-12 h-6 rounded-full transition-colors ${
                currentConfig.enabled ? 'bg-primary-600' : 'bg-slate-300'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                currentConfig.enabled ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          {currentConfig.enabled && (
            <>
              {/* Retry Count & Interval */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Maximum Retry Attempts
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={currentConfig.maxAttempts}
                      onChange={(e) => updateConfig(activeTab, { maxAttempts: parseInt(e.target.value) })}
                      className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                    />
                    <div className="w-12 px-3 py-2 bg-slate-100 rounded-lg text-center font-semibold text-slate-700">
                      {currentConfig.maxAttempts}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Number of times to retry after initial attempt</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Retry Interval
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="999"
                      value={currentConfig.intervalMinutes}
                      onChange={(e) => updateConfig(activeTab, { intervalMinutes: parseInt(e.target.value) || 1 })}
                      className="w-20 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-center"
                    />
                    <select
                      value={currentConfig.intervalUnit}
                      onChange={(e) => updateConfig(activeTab, { intervalUnit: e.target.value as any })}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                    </select>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Time to wait between retry attempts</p>
                </div>
              </div>

              {/* Stop Conditions */}
              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-3">Stop Conditions</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentConfig.stopOnSuccess}
                      onChange={(e) => updateConfig(activeTab, { stopOnSuccess: e.target.checked })}
                      className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-900">Stop on Success</p>
                      <p className="text-xs text-slate-500">Stop retrying when {activeTab === 'calls' ? 'call is connected' : 'message is delivered'}</p>
                    </div>
                  </label>
                  {activeTab !== 'calls' && (
                    <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentConfig.stopOnReply}
                        onChange={(e) => updateConfig(activeTab, { stopOnReply: e.target.checked })}
                        className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
                      />
                      <div>
                        <p className="text-sm font-medium text-slate-900">Stop on Reply</p>
                        <p className="text-xs text-slate-500">Stop retrying when recipient replies</p>
                      </div>
                    </label>
                  )}
                </div>
              </div>

              {/* Time Restrictions */}
              <div className="border-t border-slate-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-medium text-slate-700">Time Restrictions</h3>
                    <p className="text-xs text-slate-500">Only retry during specified hours</p>
                  </div>
                  <button
                    onClick={() => updateTimeRestrictions(activeTab, { enabled: !currentConfig.timeRestrictions.enabled })}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      currentConfig.timeRestrictions.enabled ? 'bg-primary-600' : 'bg-slate-300'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                      currentConfig.timeRestrictions.enabled ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>

                {currentConfig.timeRestrictions.enabled && (
                  <div className="space-y-4 pl-4 border-l-2 border-primary-200">
                    {/* Time Range */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          <ClockIcon className="w-4 h-4 inline mr-1" />
                          Start Time
                        </label>
                        <input
                          type="time"
                          value={currentConfig.timeRestrictions.startTime}
                          onChange={(e) => updateTimeRestrictions(activeTab, { startTime: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          <ClockIcon className="w-4 h-4 inline mr-1" />
                          End Time
                        </label>
                        <input
                          type="time"
                          value={currentConfig.timeRestrictions.endTime}
                          onChange={(e) => updateTimeRestrictions(activeTab, { endTime: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                    </div>

                    {/* Days of Week */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Active Days
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {daysOfWeek.map((day) => (
                          <button
                            key={day.id}
                            onClick={() => toggleDay(activeTab, day.id)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                              currentConfig.timeRestrictions.daysOfWeek.includes(day.id)
                                ? 'bg-primary-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {day.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h3 className="text-sm font-medium text-slate-700 mb-3">Configuration Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {tabs.map((tab) => {
            const config = settings[tab.id as keyof RetrySettings];
            return (
              <div
                key={tab.id}
                className={`p-3 rounded-lg ${config.enabled ? 'bg-green-50 border border-green-200' : 'bg-slate-50 border border-slate-200'}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1 rounded ${tab.color}`}>
                    <tab.icon className="w-3 h-3" />
                  </div>
                  <span className="text-sm font-medium text-slate-900">{tab.name}</span>
                </div>
                {config.enabled ? (
                  <p className="text-xs text-slate-600">
                    {config.maxAttempts} retries, every {config.intervalMinutes} {config.intervalUnit}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400">Disabled</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Link
          to="/settings"
          className="px-6 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Cancel
        </Link>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
