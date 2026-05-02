/**
 * Appointment Reminder Settings Page
 * Configure automated appointment reminders for all industries
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  ArrowLeftIcon,
  BellIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  PhoneIcon,
  SparklesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  DocumentTextIcon,
  ChartBarIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import {
  appointmentReminderService,
  ReminderSettings,
  ReminderStats,
  DefaultTemplates,
} from '../../services/appointment-reminder.service';

export default function AppointmentReminderSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [stats, setStats] = useState<ReminderStats | null>(null);
  const [defaultTemplates, setDefaultTemplates] = useState<DefaultTemplates | null>(null);
  const [activeTab, setActiveTab] = useState<'settings' | 'templates' | 'stats'>('settings');
  const [testPhone, setTestPhone] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [testingReminder, setTestingReminder] = useState(false);
  const [selectedTestType, setSelectedTestType] = useState<'24h' | '2h' | '30m'>('24h');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [settingsData, statsData, templatesData] = await Promise.all([
        appointmentReminderService.getSettings(),
        appointmentReminderService.getStats(),
        appointmentReminderService.getDefaultTemplates(),
      ]);
      setSettings(settingsData);
      setStats(statsData);
      setDefaultTemplates(templatesData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      await appointmentReminderService.updateSettings(settings);
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestReminder = async () => {
    if (!testPhone && !testEmail) {
      toast.error('Please enter a phone number or email address');
      return;
    }

    try {
      setTestingReminder(true);
      const result = await appointmentReminderService.sendTestReminder(
        selectedTestType,
        testPhone || undefined,
        testEmail || undefined
      );

      if (result.success) {
        const successChannels = result.channels.filter(c => c.success).map(c => c.channel);
        toast.success(`Test reminder sent via: ${successChannels.join(', ')}`);
      } else {
        const errors = result.channels.filter(c => !c.success).map(c => `${c.channel}: ${c.error}`);
        toast.error(`Failed: ${errors.join(', ')}`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to send test reminder');
    } finally {
      setTestingReminder(false);
    }
  };

  const resetToDefault = (field: 'template24h' | 'template2h' | 'template30m') => {
    if (!settings || !defaultTemplates) return;
    setSettings({ ...settings, [field]: defaultTemplates[field] });
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/3"></div>
          <div className="h-4 bg-slate-200 rounded w-1/2"></div>
          <div className="h-64 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/settings"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to Settings
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <BellIcon className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Appointment Reminders</h1>
            <p className="text-sm text-slate-500">
              Automated reminders before appointments via WhatsApp, SMS, and Email
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-lg mb-6 w-fit">
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition ${
            activeTab === 'settings'
              ? 'bg-white text-slate-900 shadow'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Settings
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition ${
            activeTab === 'templates'
              ? 'bg-white text-slate-900 shadow'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Templates
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition ${
            activeTab === 'stats'
              ? 'bg-white text-slate-900 shadow'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Statistics
        </button>
      </div>

      {/* Settings Tab */}
      {activeTab === 'settings' && settings && (
        <div className="space-y-6">
          {/* Master Toggle */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${settings.enabled ? 'bg-green-100' : 'bg-slate-100'}`}>
                  <BellIcon className={`w-5 h-5 ${settings.enabled ? 'text-green-600' : 'text-slate-400'}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Appointment Reminders</h3>
                  <p className="text-sm text-slate-500">
                    Automatically send reminders before scheduled appointments
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>

          {/* Reminder Intervals */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <ClockIcon className="w-5 h-5 text-slate-400" />
              Reminder Intervals
            </h3>
            <div className="space-y-4">
              <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <span className="font-medium text-slate-900">24 Hours Before</span>
                  <p className="text-sm text-slate-500">Send reminder one day before appointment</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.reminder24h}
                  onChange={(e) => setSettings({ ...settings, reminder24h: e.target.checked })}
                  className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                />
              </label>
              <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <span className="font-medium text-slate-900">2 Hours Before</span>
                  <p className="text-sm text-slate-500">Send reminder 2 hours before appointment</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.reminder2h}
                  onChange={(e) => setSettings({ ...settings, reminder2h: e.target.checked })}
                  className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                />
              </label>
              <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <span className="font-medium text-slate-900">30 Minutes Before</span>
                  <p className="text-sm text-slate-500">Final reminder 30 minutes before</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.reminder30m}
                  onChange={(e) => setSettings({ ...settings, reminder30m: e.target.checked })}
                  className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                />
              </label>
            </div>
          </div>

          {/* Channels */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <ChatBubbleLeftRightIcon className="w-5 h-5 text-slate-400" />
              Communication Channels
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.useWhatsApp}
                  onChange={(e) => setSettings({ ...settings, useWhatsApp: e.target.checked })}
                  className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                />
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <ChatBubbleLeftRightIcon className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="font-medium text-slate-900">WhatsApp</span>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.useSMS}
                  onChange={(e) => setSettings({ ...settings, useSMS: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <ChatBubbleLeftRightIcon className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="font-medium text-slate-900">SMS</span>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.useEmail}
                  onChange={(e) => setSettings({ ...settings, useEmail: e.target.checked })}
                  className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                />
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <EnvelopeIcon className="w-4 h-4 text-purple-600" />
                  </div>
                  <span className="font-medium text-slate-900">Email</span>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.useAICall}
                  onChange={(e) => setSettings({ ...settings, useAICall: e.target.checked })}
                  className="w-5 h-5 text-amber-600 rounded focus:ring-amber-500"
                />
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                    <PhoneIcon className="w-4 h-4 text-amber-600" />
                  </div>
                  <span className="font-medium text-slate-900">AI Call</span>
                </div>
              </label>
            </div>
          </div>

          {/* No-Response Actions */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-slate-400" />
              No-Response Actions
            </h3>
            <div className="space-y-4">
              <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <span className="font-medium text-slate-900">Create Follow-up Task</span>
                  <p className="text-sm text-slate-500">
                    Create task for telecaller when customer doesn't confirm
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.createTaskOnNoResponse}
                  onChange={(e) => setSettings({ ...settings, createTaskOnNoResponse: e.target.checked })}
                  className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                />
              </label>
              <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <span className="font-medium text-slate-900">Notify Manager on No-Show</span>
                  <p className="text-sm text-slate-500">
                    Send notification to manager if customer doesn't show up
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifyManagerOnNoShow}
                  onChange={(e) => setSettings({ ...settings, notifyManagerOnNoShow: e.target.checked })}
                  className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                />
              </label>
            </div>
          </div>

          {/* Test Reminder */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <PlayIcon className="w-5 h-5 text-slate-400" />
              Test Reminder
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {(['24h', '2h', '30m'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedTestType(type)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      selectedTestType === type
                        ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-500'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {type === '24h' ? '24 Hour' : type === '2h' ? '2 Hour' : '30 Minute'}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Test Phone</label>
                  <input
                    type="tel"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="+91 9999999999"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Test Email</label>
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="test@example.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
              <button
                onClick={handleTestReminder}
                disabled={testingReminder || (!testPhone && !testEmail)}
                className="w-full px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {testingReminder ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <PlayIcon className="w-4 h-4" />
                    Send Test Reminder
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Save Button */}
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

      {/* Templates Tab */}
      {activeTab === 'templates' && settings && defaultTemplates && (
        <div className="space-y-6">
          {/* Variable Reference */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <InformationCircleIcon className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">Available Variables</h4>
                <div className="mt-2 flex flex-wrap gap-2">
                  {defaultTemplates.variables.map((v) => (
                    <span
                      key={v.name}
                      className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-mono"
                      title={v.description}
                    >
                      {`{{${v.name}}}`}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 24 Hour Template */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <DocumentTextIcon className="w-5 h-5 text-slate-400" />
                24 Hour Reminder Template
              </h3>
              <button
                onClick={() => resetToDefault('template24h')}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                Reset to Default
              </button>
            </div>
            <textarea
              value={settings.template24h || defaultTemplates.template24h}
              onChange={(e) => setSettings({ ...settings, template24h: e.target.value })}
              rows={8}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
            />
          </div>

          {/* 2 Hour Template */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <DocumentTextIcon className="w-5 h-5 text-slate-400" />
                2 Hour Reminder Template
              </h3>
              <button
                onClick={() => resetToDefault('template2h')}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                Reset to Default
              </button>
            </div>
            <textarea
              value={settings.template2h || defaultTemplates.template2h}
              onChange={(e) => setSettings({ ...settings, template2h: e.target.value })}
              rows={6}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
            />
          </div>

          {/* 30 Minute Template */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <DocumentTextIcon className="w-5 h-5 text-slate-400" />
                30 Minute Reminder Template
              </h3>
              <button
                onClick={() => resetToDefault('template30m')}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                Reset to Default
              </button>
            </div>
            <textarea
              value={settings.template30m || defaultTemplates.template30m}
              onChange={(e) => setSettings({ ...settings, template30m: e.target.value })}
              rows={5}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
            />
          </div>

          {/* Save Button */}
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
                  Save Templates
                </>
              )}
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
              <p className="text-sm text-slate-500">Total Appointments</p>
              <p className="text-2xl font-bold text-slate-900">{stats.totalAppointments}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Confirmed</p>
              <p className="text-2xl font-bold text-green-600">{stats.confirmedAppointments}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Confirmation Rate</p>
              <p className="text-2xl font-bold text-primary-600">{stats.confirmationRate}%</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Delivery Rate</p>
              <p className="text-2xl font-bold text-amber-600">{stats.deliveryRate}%</p>
            </div>
          </div>

          {/* Reminder Stats */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <ChartBarIcon className="w-5 h-5 text-slate-400" />
              Reminder Statistics
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <p className="text-3xl font-bold text-slate-900">{stats.remindersSent}</p>
                <p className="text-sm text-slate-500">Reminders Sent</p>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <p className="text-3xl font-bold text-red-600">{stats.remindersFailed}</p>
                <p className="text-sm text-slate-500">Failed</p>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <p className="text-3xl font-bold text-blue-600">{stats.appointmentsWithReminders}</p>
                <p className="text-sm text-slate-500">Appointments with Reminders</p>
              </div>
            </div>
          </div>

          {/* Channel Breakdown */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Channel Breakdown</h3>
            <div className="space-y-3">
              {Object.entries(stats.channelBreakdown).map(([channel, count]) => (
                <div key={channel} className="flex items-center gap-4">
                  <div className="w-24 text-sm font-medium text-slate-700 capitalize">{channel}</div>
                  <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        channel === 'whatsapp'
                          ? 'bg-green-500'
                          : channel === 'sms'
                          ? 'bg-blue-500'
                          : channel === 'email'
                          ? 'bg-purple-500'
                          : 'bg-amber-500'
                      }`}
                      style={{
                        width: `${Math.min(100, (count / (stats.remindersSent || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="w-16 text-right text-sm text-slate-600">{count}</div>
                </div>
              ))}
              {Object.keys(stats.channelBreakdown).length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">No reminders sent yet</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
