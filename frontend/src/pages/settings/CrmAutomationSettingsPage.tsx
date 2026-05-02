/**
 * CRM Automation Settings Page
 * Configure automated CRM workflows: Birthday, Re-engagement, SLA, Payments, etc.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  ArrowLeftIcon,
  CogIcon,
  CakeIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  ClockIcon,
  SparklesIcon,
  StarIcon,
  ChartBarIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';
import {
  crmAutomationService,
  CrmAutomationSettings,
  CrmAutomationStats,
  CrmAutomationTemplates,
} from '../../services/crm-automation.service';

type TabType = 'overview' | 'birthday' | 'reengagement' | 'sla' | 'payment' | 'quote' | 'aging' | 'welcome' | 'review' | 'stats';

const AUTOMATION_TYPES = [
  { id: 'birthday', name: 'Birthday & Anniversary', icon: CakeIcon, color: 'pink' },
  { id: 'reengagement', name: 'Lead Re-engagement', icon: ArrowPathIcon, color: 'blue' },
  { id: 'sla', name: 'SLA Breach Alerts', icon: ExclamationTriangleIcon, color: 'red' },
  { id: 'payment', name: 'Payment Reminders', icon: CurrencyDollarIcon, color: 'green' },
  { id: 'quote', name: 'Quote Follow-up', icon: DocumentTextIcon, color: 'purple' },
  { id: 'aging', name: 'Lead Aging Alerts', icon: ClockIcon, color: 'amber' },
  { id: 'welcome', name: 'Welcome Series', icon: SparklesIcon, color: 'indigo' },
  { id: 'review', name: 'Review Requests', icon: StarIcon, color: 'yellow' },
];

export default function CrmAutomationSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<CrmAutomationSettings | null>(null);
  const [stats, setStats] = useState<CrmAutomationStats | null>(null);
  const [templates, setTemplates] = useState<CrmAutomationTemplates | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [triggering, setTriggering] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [settingsData, statsData, templatesData] = await Promise.all([
        crmAutomationService.getSettings(),
        crmAutomationService.getStats(),
        crmAutomationService.getTemplates(),
      ]);
      setSettings(settingsData);
      setStats(statsData);
      setTemplates(templatesData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load automation settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      await crmAutomationService.updateSettings(settings);
      toast.success('Automation settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTrigger = async (type?: string) => {
    try {
      setTriggering(type || 'all');
      if (type) {
        await crmAutomationService.triggerAutomationType(type as any);
        toast.success(`${type} automation triggered successfully`);
      } else {
        await crmAutomationService.triggerAutomations();
        toast.success('All automations triggered successfully');
      }
      // Reload stats
      const newStats = await crmAutomationService.getStats();
      setStats(newStats);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to trigger automation');
    } finally {
      setTriggering(null);
    }
  };

  const updateSettings = (updates: Partial<CrmAutomationSettings>) => {
    if (settings) {
      setSettings({ ...settings, ...updates });
    }
  };

  const ChannelSelector = ({
    value,
    onChange,
  }: {
    value: string[];
    onChange: (channels: string[]) => void;
  }) => {
    const channels = [
      { id: 'whatsapp', name: 'WhatsApp', color: 'green' },
      { id: 'sms', name: 'SMS', color: 'blue' },
      { id: 'email', name: 'Email', color: 'purple' },
      { id: 'push', name: 'Push', color: 'amber' },
    ];

    const toggleChannel = (channelId: string) => {
      if (value.includes(channelId)) {
        onChange(value.filter((c) => c !== channelId));
      } else {
        onChange([...value, channelId]);
      }
    };

    return (
      <div className="flex flex-wrap gap-2">
        {channels.map((channel) => (
          <button
            key={channel.id}
            onClick={() => toggleChannel(channel.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              value.includes(channel.id)
                ? `bg-${channel.color}-100 text-${channel.color}-700 ring-2 ring-${channel.color}-500`
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {channel.name}
          </button>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6 max-w-5xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/3"></div>
          <div className="h-4 bg-slate-200 rounded w-1/2"></div>
          <div className="h-64 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/settings"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to Settings
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <CogIcon className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Smart Automations</h1>
              <p className="text-sm text-slate-500">
                Automated workflows for birthdays, re-engagement, SLA alerts, and more
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-1 p-1 bg-slate-100 rounded-lg mb-6">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3 py-2 text-sm font-medium rounded-md transition ${
            activeTab === 'overview'
              ? 'bg-white text-slate-900 shadow'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Overview
        </button>
        {AUTOMATION_TYPES.map((type) => (
          <button
            key={type.id}
            onClick={() => setActiveTab(type.id as TabType)}
            className={`px-3 py-2 text-sm font-medium rounded-md transition flex items-center gap-1 ${
              activeTab === type.id
                ? 'bg-white text-slate-900 shadow'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <type.icon className="w-4 h-4" />
            <span className="hidden lg:inline">{type.name}</span>
          </button>
        ))}
        <button
          onClick={() => setActiveTab('stats')}
          className={`px-3 py-2 text-sm font-medium rounded-md transition flex items-center gap-1 ${
            activeTab === 'stats'
              ? 'bg-white text-slate-900 shadow'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ChartBarIcon className="w-4 h-4" />
          Stats
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && settings && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {AUTOMATION_TYPES.map((type) => {
              const isEnabled =
                type.id === 'birthday'
                  ? settings.birthdayEnabled
                  : type.id === 'reengagement'
                  ? settings.reengagementEnabled
                  : type.id === 'sla'
                  ? settings.slaEnabled
                  : type.id === 'payment'
                  ? settings.paymentReminderEnabled
                  : type.id === 'quote'
                  ? settings.quoteFollowupEnabled
                  : type.id === 'aging'
                  ? settings.leadAgingEnabled
                  : type.id === 'welcome'
                  ? settings.welcomeEnabled
                  : settings.reviewRequestEnabled;

              return (
                <button
                  key={type.id}
                  onClick={() => setActiveTab(type.id as TabType)}
                  className={`p-4 rounded-xl border transition hover:shadow-md text-left ${
                    isEnabled
                      ? 'bg-white border-slate-200'
                      : 'bg-slate-50 border-slate-100 opacity-60'
                  }`}
                >
                  <div className={`p-2 w-fit rounded-lg bg-${type.color}-100 mb-3`}>
                    <type.icon className={`w-5 h-5 text-${type.color}-600`} />
                  </div>
                  <h3 className="font-medium text-slate-900">{type.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {isEnabled ? 'Active' : 'Disabled'}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Quick Stats */}
          {stats && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Recent Activity</h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-900">{stats.totalLogs}</p>
                  <p className="text-sm text-slate-500">Total Automations</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{stats.byStatus?.sent || 0}</p>
                  <p className="text-sm text-slate-500">Sent</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{stats.byStatus?.failed || 0}</p>
                  <p className="text-sm text-slate-500">Failed</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary-600">{stats.successRate}%</p>
                  <p className="text-sm text-slate-500">Success Rate</p>
                </div>
              </div>
            </div>
          )}

          {/* Manual Trigger */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <PlayIcon className="w-5 h-5 text-slate-400" />
              Manual Trigger
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Manually run automations for testing or catching up on missed tasks.
            </p>
            <button
              onClick={() => handleTrigger()}
              disabled={triggering !== null}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2"
            >
              {triggering === 'all' ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Running...
                </>
              ) : (
                <>
                  <PlayIcon className="w-4 h-4" />
                  Run All Automations
                </>
              )}
            </button>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-5 h-5" />
                  Save Settings
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Birthday Tab */}
      {activeTab === 'birthday' && settings && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-pink-100 rounded-lg">
                  <CakeIcon className="w-5 h-5 text-pink-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Birthday & Anniversary Greetings</h3>
                  <p className="text-sm text-slate-500">
                    Automatically send greetings on special dates
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.birthdayEnabled}
                  onChange={(e) => updateSettings({ birthdayEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
              </label>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Channels</label>
                <ChannelSelector
                  value={settings.birthdayChannels || ['whatsapp', 'email']}
                  onChange={(channels) => updateSettings({ birthdayChannels: channels })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Days Before Birthday
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={7}
                    value={settings.birthdayDaysBefore || 0}
                    onChange={(e) =>
                      updateSettings({ birthdayDaysBefore: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">0 = on the day</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Send Time
                  </label>
                  <input
                    type="time"
                    value={settings.birthdayTime || '09:00'}
                    onChange={(e) => updateSettings({ birthdayTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              </div>

              <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <span className="font-medium text-slate-900">Anniversary Greetings</span>
                  <p className="text-sm text-slate-500">Send greetings on customer anniversaries</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.anniversaryEnabled}
                  onChange={(e) => updateSettings({ anniversaryEnabled: e.target.checked })}
                  className="w-5 h-5 text-pink-600 rounded focus:ring-pink-500"
                />
              </label>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Birthday Message Template
                </label>
                <textarea
                  value={settings.birthdayTemplate || templates?.birthday?.whatsapp || ''}
                  onChange={(e) => updateSettings({ birthdayTemplate: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                  placeholder="Happy Birthday {{firstName}}!"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => handleTrigger('birthday')}
              disabled={triggering !== null}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 disabled:opacity-50 flex items-center gap-2"
            >
              {triggering === 'birthday' ? (
                <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <PlayIcon className="w-4 h-4" />
              )}
              Test Now
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}

      {/* Re-engagement Tab */}
      {activeTab === 'reengagement' && settings && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ArrowPathIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Lead Re-engagement</h3>
                  <p className="text-sm text-slate-500">
                    Automatically reach out to inactive leads
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.reengagementEnabled}
                  onChange={(e) => updateSettings({ reengagementEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Days Inactive
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={settings.reengagementDaysInactive || 30}
                    onChange={(e) =>
                      updateSettings({ reengagementDaysInactive: parseInt(e.target.value) || 30 })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Max Attempts
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={settings.reengagementMaxAttempts || 3}
                    onChange={(e) =>
                      updateSettings({ reengagementMaxAttempts: parseInt(e.target.value) || 3 })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Interval (Days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={settings.reengagementInterval || 7}
                    onChange={(e) =>
                      updateSettings({ reengagementInterval: parseInt(e.target.value) || 7 })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <span className="font-medium text-slate-900">Exclude Converted Leads</span>
                  <p className="text-sm text-slate-500">Don't send to already converted leads</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.reengagementExcludeConverted}
                  onChange={(e) => updateSettings({ reengagementExcludeConverted: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
              </label>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Channels</label>
                <ChannelSelector
                  value={settings.reengagementChannels || ['whatsapp', 'email']}
                  onChange={(channels) => updateSettings({ reengagementChannels: channels })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Message Template
                </label>
                <textarea
                  value={settings.reengagementTemplate || templates?.reengagement?.whatsapp || ''}
                  onChange={(e) => updateSettings({ reengagementTemplate: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => handleTrigger('reengagement')}
              disabled={triggering !== null}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 disabled:opacity-50 flex items-center gap-2"
            >
              {triggering === 'reengagement' ? (
                <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <PlayIcon className="w-4 h-4" />
              )}
              Test Now
            </button>
            <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}

      {/* SLA Tab */}
      {activeTab === 'sla' && settings && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">SLA Breach Alerts</h3>
                  <p className="text-sm text-slate-500">
                    Alert team members when SLA is about to breach
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.slaEnabled}
                  onChange={(e) => updateSettings({ slaEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
              </label>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    First Response SLA (minutes)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={1440}
                    value={settings.slaFirstResponseMins || 60}
                    onChange={(e) =>
                      updateSettings({ slaFirstResponseMins: parseInt(e.target.value) || 60 })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Follow-up SLA (hours)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={168}
                    value={settings.slaFollowUpHours || 24}
                    onChange={(e) =>
                      updateSettings({ slaFollowUpHours: parseInt(e.target.value) || 24 })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <span className="font-medium text-slate-900">Alert Assignee</span>
                  <p className="text-sm text-slate-500">Notify the lead owner before SLA breach</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.slaAlertToAssignee}
                  onChange={(e) => updateSettings({ slaAlertToAssignee: e.target.checked })}
                  className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <span className="font-medium text-slate-900">Alert Manager</span>
                  <p className="text-sm text-slate-500">Notify the manager on SLA breach</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.slaAlertToManager}
                  onChange={(e) => updateSettings({ slaAlertToManager: e.target.checked })}
                  className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                />
              </label>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Escalate After Breaches
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={settings.slaEscalateAfterBreaches || 2}
                  onChange={(e) =>
                    updateSettings({ slaEscalateAfterBreaches: parseInt(e.target.value) || 2 })
                  }
                  className="w-32 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500"
                />
                <p className="text-xs text-slate-500 mt-1">Auto-escalate after X consecutive breaches</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Alert Channels
                </label>
                <ChannelSelector
                  value={settings.slaAlertChannels || ['push', 'email']}
                  onChange={(channels) => updateSettings({ slaAlertChannels: channels })}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => handleTrigger('sla')}
              disabled={triggering !== null}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 disabled:opacity-50 flex items-center gap-2"
            >
              {triggering === 'sla' ? (
                <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <PlayIcon className="w-4 h-4" />
              )}
              Test Now
            </button>
            <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}

      {/* Payment Tab */}
      {activeTab === 'payment' && settings && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CurrencyDollarIcon className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Payment Reminders</h3>
                  <p className="text-sm text-slate-500">
                    Automated payment and invoice reminders
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.paymentReminderEnabled}
                  onChange={(e) => updateSettings({ paymentReminderEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-medium text-slate-700">Reminder Schedule</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-slate-600 mb-2">First Reminder (days before)</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={settings.paymentReminder1DaysBefore || 3}
                    onChange={(e) =>
                      updateSettings({ paymentReminder1DaysBefore: parseInt(e.target.value) || 3 })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-2">Second Reminder (days before)</label>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={settings.paymentReminder2DaysBefore || 1}
                    onChange={(e) =>
                      updateSettings({ paymentReminder2DaysBefore: parseInt(e.target.value) || 1 })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-2">Overdue Reminder (days after)</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={settings.paymentReminder3DaysAfter || 1}
                    onChange={(e) =>
                      updateSettings({ paymentReminder3DaysAfter: parseInt(e.target.value) || 1 })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Channels</label>
                <ChannelSelector
                  value={settings.paymentReminderChannels || ['whatsapp', 'sms']}
                  onChange={(channels) => updateSettings({ paymentReminderChannels: channels })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Payment Reminder Template
                </label>
                <textarea
                  value={settings.paymentReminderTemplate || templates?.paymentReminder?.whatsapp || ''}
                  onChange={(e) => updateSettings({ paymentReminderTemplate: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Overdue Template
                </label>
                <textarea
                  value={settings.paymentOverdueTemplate || ''}
                  onChange={(e) => updateSettings({ paymentOverdueTemplate: e.target.value })}
                  rows={3}
                  placeholder="Template for overdue payment reminders..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => handleTrigger('payment')}
              disabled={triggering !== null}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 disabled:opacity-50 flex items-center gap-2"
            >
              {triggering === 'payment' ? (
                <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <PlayIcon className="w-4 h-4" />
              )}
              Test Now
            </button>
            <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}

      {/* Quote Follow-up Tab */}
      {activeTab === 'quote' && settings && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <DocumentTextIcon className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Quote Follow-up</h3>
                  <p className="text-sm text-slate-500">
                    Automatic follow-ups on pending quotes
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.quoteFollowupEnabled}
                  onChange={(e) => updateSettings({ quoteFollowupEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Follow-up Days (comma-separated)
                </label>
                <input
                  type="text"
                  value={(settings.quoteFollowupDays || [1, 3, 7]).join(', ')}
                  onChange={(e) => {
                    const days = e.target.value.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d));
                    updateSettings({ quoteFollowupDays: days });
                  }}
                  placeholder="1, 3, 7"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Days after sending quote to follow up (e.g., 1, 3, 7)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Expiry Reminder (days before)
                </label>
                <input
                  type="number"
                  min={1}
                  max={14}
                  value={settings.quoteExpiryReminderDays || 2}
                  onChange={(e) =>
                    updateSettings({ quoteExpiryReminderDays: parseInt(e.target.value) || 2 })
                  }
                  className="w-32 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Channels</label>
                <ChannelSelector
                  value={settings.quoteFollowupChannels || ['email', 'whatsapp']}
                  onChange={(channels) => updateSettings({ quoteFollowupChannels: channels })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Message Template
                </label>
                <textarea
                  value={settings.quoteFollowupTemplate || templates?.quoteFollowup?.whatsapp || ''}
                  onChange={(e) => updateSettings({ quoteFollowupTemplate: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => handleTrigger('quote')}
              disabled={triggering !== null}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 disabled:opacity-50 flex items-center gap-2"
            >
              {triggering === 'quote' ? (
                <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <PlayIcon className="w-4 h-4" />
              )}
              Test Now
            </button>
            <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}

      {/* Lead Aging Tab */}
      {activeTab === 'aging' && settings && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <ClockIcon className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Lead Aging Alerts</h3>
                  <p className="text-sm text-slate-500">
                    Alert when leads stay too long in a stage
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.leadAgingEnabled}
                  onChange={(e) => updateSettings({ leadAgingEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
              </label>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Aging Threshold (Days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={settings.leadAgingDays || 7}
                    onChange={(e) =>
                      updateSettings({ leadAgingDays: parseInt(e.target.value) || 7 })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Auto-Reassign After (Days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={settings.leadAgingReassignDays || 14}
                    onChange={(e) =>
                      updateSettings({ leadAgingReassignDays: parseInt(e.target.value) || 14 })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                    disabled={!settings.leadAgingAutoReassign}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Alert Recipients</label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
                    <input
                      type="checkbox"
                      checked={settings.leadAgingAlertTo?.includes('manager')}
                      onChange={(e) => {
                        const alertTo = settings.leadAgingAlertTo || [];
                        if (e.target.checked) {
                          updateSettings({ leadAgingAlertTo: [...alertTo, 'manager'] });
                        } else {
                          updateSettings({ leadAgingAlertTo: alertTo.filter(a => a !== 'manager') });
                        }
                      }}
                      className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                    />
                    <span className="text-sm text-slate-700">Manager</span>
                  </label>
                  <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
                    <input
                      type="checkbox"
                      checked={settings.leadAgingAlertTo?.includes('assignee')}
                      onChange={(e) => {
                        const alertTo = settings.leadAgingAlertTo || [];
                        if (e.target.checked) {
                          updateSettings({ leadAgingAlertTo: [...alertTo, 'assignee'] });
                        } else {
                          updateSettings({ leadAgingAlertTo: alertTo.filter(a => a !== 'assignee') });
                        }
                      }}
                      className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                    />
                    <span className="text-sm text-slate-700">Assignee</span>
                  </label>
                </div>
              </div>

              <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <span className="font-medium text-slate-900">Auto-Reassign</span>
                  <p className="text-sm text-slate-500">
                    Automatically reassign aging leads to another team member
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.leadAgingAutoReassign}
                  onChange={(e) => updateSettings({ leadAgingAutoReassign: e.target.checked })}
                  className="w-5 h-5 text-amber-600 rounded focus:ring-amber-500"
                />
              </label>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Alert Channels</label>
                <ChannelSelector
                  value={settings.leadAgingChannels || ['push', 'email']}
                  onChange={(channels) => updateSettings({ leadAgingChannels: channels })}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => handleTrigger('aging')}
              disabled={triggering !== null}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 disabled:opacity-50 flex items-center gap-2"
            >
              {triggering === 'aging' ? (
                <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <PlayIcon className="w-4 h-4" />
              )}
              Test Now
            </button>
            <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}

      {/* Welcome Series Tab */}
      {activeTab === 'welcome' && settings && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <SparklesIcon className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Welcome Series</h3>
                  <p className="text-sm text-slate-500">
                    Automated onboarding message for new leads
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.welcomeEnabled}
                  onChange={(e) => updateSettings({ welcomeEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Delay After Lead Creation (minutes)
                </label>
                <input
                  type="number"
                  min={0}
                  max={1440}
                  value={settings.welcomeDelayMinutes || 5}
                  onChange={(e) =>
                    updateSettings({ welcomeDelayMinutes: parseInt(e.target.value) || 5 })
                  }
                  className="w-32 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-slate-500 mt-1">0 = send immediately</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Channels</label>
                <ChannelSelector
                  value={settings.welcomeChannels || ['whatsapp', 'email']}
                  onChange={(channels) => updateSettings({ welcomeChannels: channels })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <input
                    type="checkbox"
                    checked={settings.welcomeIncludeIntro}
                    onChange={(e) => updateSettings({ welcomeIncludeIntro: e.target.checked })}
                    className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm text-slate-700">Include Company Intro</span>
                </label>
                <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <input
                    type="checkbox"
                    checked={settings.welcomeIncludeCatalog}
                    onChange={(e) => updateSettings({ welcomeIncludeCatalog: e.target.checked })}
                    className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm text-slate-700">Include Product Catalog</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Welcome Message Template
                </label>
                <textarea
                  value={settings.welcomeTemplate || templates?.welcome?.step1 || ''}
                  onChange={(e) => updateSettings({ welcomeTemplate: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <InformationCircleIcon className="w-5 h-5 text-indigo-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-indigo-900">How it works</h4>
                    <p className="text-sm text-indigo-700 mt-1">
                      When a new lead is created, they'll automatically receive a welcome
                      message after the configured delay.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}

      {/* Review Requests Tab */}
      {activeTab === 'review' && settings && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <StarIcon className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Review & Feedback Requests</h3>
                  <p className="text-sm text-slate-500">
                    Request reviews after successful conversions
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.reviewRequestEnabled}
                  onChange={(e) => updateSettings({ reviewRequestEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-600"></div>
              </label>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Days After Conversion
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={settings.reviewRequestDelay || 7}
                    onChange={(e) =>
                      updateSettings({ reviewRequestDelay: parseInt(e.target.value) || 7 })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Min Deal Value (optional)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={settings.reviewMinDealValue || ''}
                    onChange={(e) =>
                      updateSettings({ reviewMinDealValue: e.target.value ? parseFloat(e.target.value) : null })
                    }
                    placeholder="No minimum"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Review Platforms
                </label>
                <div className="flex flex-wrap gap-2">
                  {['google', 'facebook', 'trustpilot', 'yelp'].map((platform) => (
                    <button
                      key={platform}
                      onClick={() => {
                        const platforms = settings.reviewPlatforms || [];
                        if (platforms.includes(platform)) {
                          updateSettings({ reviewPlatforms: platforms.filter(p => p !== platform) });
                        } else {
                          updateSettings({ reviewPlatforms: [...platforms, platform] });
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition capitalize ${
                        (settings.reviewPlatforms || []).includes(platform)
                          ? 'bg-yellow-100 text-yellow-700 ring-2 ring-yellow-500'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {platform}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Channels</label>
                <ChannelSelector
                  value={settings.reviewRequestChannels || ['whatsapp', 'email']}
                  onChange={(channels) => updateSettings({ reviewRequestChannels: channels })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Message Template
                </label>
                <textarea
                  value={settings.reviewRequestTemplate || templates?.reviewRequest?.whatsapp || ''}
                  onChange={(e) => updateSettings({ reviewRequestTemplate: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => handleTrigger('review')}
              disabled={triggering !== null}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 disabled:opacity-50 flex items-center gap-2"
            >
              {triggering === 'review' ? (
                <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <PlayIcon className="w-4 h-4" />
              )}
              Test Now
            </button>
            <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}

      {/* Statistics Tab */}
      {activeTab === 'stats' && stats && (
        <div className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Total Automations</p>
              <p className="text-2xl font-bold text-slate-900">{stats.totalLogs}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Sent</p>
              <p className="text-2xl font-bold text-green-600">{stats.byStatus?.sent || 0}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Failed</p>
              <p className="text-2xl font-bold text-red-600">{stats.byStatus?.failed || 0}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Success Rate</p>
              <p className="text-2xl font-bold text-primary-600">{stats.successRate}%</p>
            </div>
          </div>

          {/* By Type */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">By Automation Type</h3>
            <div className="space-y-3">
              {Object.entries(stats.byType || {}).map(([type, count]) => (
                <div key={type} className="flex items-center gap-4">
                  <div className="w-32 text-sm font-medium text-slate-700 capitalize">{type}</div>
                  <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary-500"
                      style={{
                        width: `${Math.min(100, ((count as number) / (stats.totalLogs || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="w-16 text-right text-sm text-slate-600">{count as number}</div>
                </div>
              ))}
              {Object.keys(stats.byType || {}).length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">No automations run yet</p>
              )}
            </div>
          </div>

          {/* By Channel */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">By Channel</h3>
            <div className="grid grid-cols-4 gap-4">
              {Object.entries(stats.byChannel || {}).map(([channel, count]) => (
                <div key={channel} className="text-center p-4 bg-slate-50 rounded-lg">
                  <p className="text-2xl font-bold text-slate-900">{count as number}</p>
                  <p className="text-sm text-slate-500 capitalize">{channel}</p>
                </div>
              ))}
              {Object.keys(stats.byChannel || {}).length === 0 && (
                <p className="text-sm text-slate-500 col-span-4 text-center py-4">
                  No channel data available
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
