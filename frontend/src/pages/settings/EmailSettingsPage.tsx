import { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  EnvelopeIcon,
  PaperAirplaneIcon,
  CogIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

type EmailProvider = 'smtp' | 'sendgrid' | 'ses' | 'mailgun';

interface EmailSettings {
  id?: string;
  provider: EmailProvider;
  fromEmail: string;
  fromName: string;
  replyTo?: string;
  // SMTP
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  smtpSecure?: boolean;
  // SendGrid
  sendgridApiKey?: string;
  // AWS SES
  sesAccessKeyId?: string;
  sesSecretAccessKey?: string;
  sesRegion?: string;
  // Mailgun
  mailgunApiKey?: string;
  mailgunDomain?: string;
  // Status
  isConfigured?: boolean;
}

const initialSettings: EmailSettings = {
  provider: 'smtp',
  fromEmail: '',
  fromName: '',
  replyTo: '',
  smtpHost: '',
  smtpPort: 587,
  smtpUser: '',
  smtpPassword: '',
  smtpSecure: false,
  sendgridApiKey: '',
  sesAccessKeyId: '',
  sesSecretAccessKey: '',
  sesRegion: 'us-east-1',
  mailgunApiKey: '',
  mailgunDomain: '',
};

const providers = [
  { id: 'smtp', name: 'SMTP / Gmail', description: 'Use any SMTP server or Gmail with App Password' },
  { id: 'sendgrid', name: 'SendGrid', description: 'Transactional email service by Twilio' },
  { id: 'ses', name: 'AWS SES', description: 'Amazon Simple Email Service' },
  { id: 'mailgun', name: 'Mailgun', description: 'Email API service by Sinch' },
];

export default function EmailSettingsPage() {
  const [activeTab, setActiveTab] = useState<'config' | 'test'>('config');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<EmailSettings>(initialSettings);
  const [showPassword, setShowPassword] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testSubject, setTestSubject] = useState('Test Email from MyLeadX');
  const [testMessage, setTestMessage] = useState('This is a test email to verify your email configuration is working correctly.');
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/email-settings');
      if (response.data.data) {
        setSettings({ ...initialSettings, ...response.data.data });
      }
    } catch (error: any) {
      if (error.response?.status !== 404) {
        console.error('Failed to fetch email settings:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings.fromEmail) {
      toast.error('From Email is required');
      return;
    }

    setSaving(true);
    try {
      if (settings.id) {
        await api.put('/email-settings', settings);
      } else {
        await api.post('/email-settings', settings);
      }
      toast.success('Email settings saved successfully');
      fetchSettings();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    setSaving(true);
    try {
      const response = await api.post('/email-settings/test', settings);
      if (response.data.success) {
        toast.success('Connection successful!');
      } else {
        toast.error(response.data.message || 'Connection failed');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Connection test failed');
    } finally {
      setSaving(false);
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail) {
      toast.error('Please enter an email address');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const response = await api.post('/email-settings/test-email', {
        to: testEmail,
        subject: testSubject,
        text: testMessage,
      });

      setTestResult(response.data);
      if (response.data.success) {
        toast.success('Test email sent successfully!');
      } else {
        toast.error(response.data.message || 'Failed to send test email');
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message;
      setTestResult({ success: false, error: errorMsg });
      toast.error(errorMsg);
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Email Settings</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Configure your email provider for sending emails
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          settings.isConfigured
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
        }`}>
          {settings.isConfigured ? 'Configured' : 'Not Configured'}
        </span>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'config'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <CogIcon className="w-5 h-5" />
            Configuration
          </button>
          <button
            onClick={() => setActiveTab('test')}
            className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'test'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <PaperAirplaneIcon className="w-5 h-5" />
            Test Email
          </button>
        </nav>
      </div>

      {/* Configuration Tab */}
      {activeTab === 'config' && (
        <div className="space-y-6">
          {/* Provider Selection */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Select Email Provider
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {providers.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => setSettings({ ...settings, provider: provider.id as EmailProvider })}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    settings.provider === provider.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <h3 className="font-medium text-gray-900 dark:text-white">{provider.name}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{provider.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Common Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Sender Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  From Email *
                </label>
                <input
                  type="email"
                  value={settings.fromEmail}
                  onChange={(e) => setSettings({ ...settings, fromEmail: e.target.value })}
                  placeholder="noreply@yourcompany.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  From Name
                </label>
                <input
                  type="text"
                  value={settings.fromName}
                  onChange={(e) => setSettings({ ...settings, fromName: e.target.value })}
                  placeholder="Your Company Name"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reply-To Email
                </label>
                <input
                  type="email"
                  value={settings.replyTo || ''}
                  onChange={(e) => setSettings({ ...settings, replyTo: e.target.value })}
                  placeholder="support@yourcompany.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Provider-Specific Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {providers.find(p => p.id === settings.provider)?.name} Configuration
            </h2>

            {/* SMTP Settings */}
            {settings.provider === 'smtp' && (
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Gmail Users:</strong> Use smtp.gmail.com, port 587, and generate an App Password from your Google Account settings.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      SMTP Host
                    </label>
                    <input
                      type="text"
                      value={settings.smtpHost || ''}
                      onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
                      placeholder="smtp.gmail.com"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      SMTP Port
                    </label>
                    <input
                      type="number"
                      value={settings.smtpPort || 587}
                      onChange={(e) => setSettings({ ...settings, smtpPort: parseInt(e.target.value) })}
                      placeholder="587"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      SMTP Username
                    </label>
                    <input
                      type="text"
                      value={settings.smtpUser || ''}
                      onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })}
                      placeholder="your-email@gmail.com"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      SMTP Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={settings.smtpPassword || ''}
                        onChange={(e) => setSettings({ ...settings, smtpPassword: e.target.value })}
                        placeholder="App Password or SMTP password"
                        className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="smtpSecure"
                    checked={settings.smtpSecure || false}
                    onChange={(e) => setSettings({ ...settings, smtpSecure: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="smtpSecure" className="text-sm text-gray-700 dark:text-gray-300">
                    Use SSL/TLS (port 465)
                  </label>
                </div>
              </div>
            )}

            {/* SendGrid Settings */}
            {settings.provider === 'sendgrid' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    SendGrid API Key
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={settings.sendgridApiKey || ''}
                      onChange={(e) => setSettings({ ...settings, sendgridApiKey: e.target.value })}
                      placeholder="SG.xxxxxxxxxxxx"
                      className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* AWS SES Settings */}
            {settings.provider === 'ses' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      AWS Access Key ID
                    </label>
                    <input
                      type="text"
                      value={settings.sesAccessKeyId || ''}
                      onChange={(e) => setSettings({ ...settings, sesAccessKeyId: e.target.value })}
                      placeholder="AKIAXXXXXXXXXXXXXXXX"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      AWS Secret Access Key
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={settings.sesSecretAccessKey || ''}
                        onChange={(e) => setSettings({ ...settings, sesSecretAccessKey: e.target.value })}
                        placeholder="Your secret key"
                        className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      AWS Region
                    </label>
                    <select
                      value={settings.sesRegion || 'us-east-1'}
                      onChange={(e) => setSettings({ ...settings, sesRegion: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="us-east-1">US East (N. Virginia)</option>
                      <option value="us-west-2">US West (Oregon)</option>
                      <option value="eu-west-1">EU (Ireland)</option>
                      <option value="ap-south-1">Asia Pacific (Mumbai)</option>
                      <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Mailgun Settings */}
            {settings.provider === 'mailgun' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Mailgun API Key
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={settings.mailgunApiKey || ''}
                        onChange={(e) => setSettings({ ...settings, mailgunApiKey: e.target.value })}
                        placeholder="key-xxxxxxxxxxxxxxxx"
                        className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Mailgun Domain
                    </label>
                    <input
                      type="text"
                      value={settings.mailgunDomain || ''}
                      onChange={(e) => setSettings({ ...settings, mailgunDomain: e.target.value })}
                      placeholder="mg.yourdomain.com"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-4">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </>
              ) : (
                'Save Settings'
              )}
            </button>
            <button
              onClick={testConnection}
              disabled={saving}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              Test Connection
            </button>
          </div>
        </div>
      )}

      {/* Test Email Tab */}
      {activeTab === 'test' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <PaperAirplaneIcon className="w-6 h-6 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Send Test Email
            </h2>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Test your email configuration by sending a test email
          </p>

          {!settings.isConfigured && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Please configure and save your email settings first before sending test emails.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Recipient Email
              </label>
              <div className="flex items-center gap-2">
                <EnvelopeIcon className="w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  placeholder="test@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Subject
              </label>
              <input
                type="text"
                placeholder="Test Email Subject"
                value={testSubject}
                onChange={(e) => setTestSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Message
              </label>
              <textarea
                placeholder="Enter your test message..."
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={sendTestEmail}
              disabled={testing || !settings.isConfigured}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {testing ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Sending...
                </>
              ) : (
                <>
                  <PaperAirplaneIcon className="w-5 h-5" />
                  Send Test Email
                </>
              )}
            </button>

            {testResult && (
              <div className={`p-4 rounded-lg ${
                testResult.success
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
              }`}>
                <div className="flex items-start gap-2">
                  {testResult.success ? (
                    <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <XCircleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                  )}
                  <div>
                    <h4 className={`font-medium ${
                      testResult.success
                        ? 'text-green-800 dark:text-green-200'
                        : 'text-red-800 dark:text-red-200'
                    }`}>
                      {testResult.success ? 'Email Sent Successfully!' : 'Email Failed'}
                    </h4>
                    <p className={`text-sm mt-1 ${
                      testResult.success
                        ? 'text-green-700 dark:text-green-300'
                        : 'text-red-700 dark:text-red-300'
                    }`}>
                      {testResult.success
                        ? 'Check your inbox for the test email.'
                        : testResult.error || testResult.message}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
