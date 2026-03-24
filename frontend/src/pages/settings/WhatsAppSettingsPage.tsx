import { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  EyeIcon,
  EyeSlashIcon,
  ShieldCheckIcon,
  BoltIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';

interface WhatsAppConfig {
  provider: 'exotel' | 'meta' | 'gupshup' | 'wati' | '360dialog';
  phoneNumber: string;
  isConfigured: boolean;
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  businessAccountId?: string;
  phoneNumberId?: string;
  configuredViaEnv?: boolean;
  hasEnvConfig?: boolean;
}

const PROVIDERS = [
  {
    id: 'meta',
    name: 'Meta Cloud API',
    desc: 'Official & Free',
    icon: '🔵',
    recommended: true,
  },
  {
    id: '360dialog',
    name: '360dialog',
    desc: 'Fast Setup',
    icon: '⚡',
  },
  {
    id: 'gupshup',
    name: 'Gupshup',
    desc: 'Popular in India',
    icon: '🇮🇳',
  },
  {
    id: 'wati',
    name: 'Wati',
    desc: 'Easy to Use',
    icon: '🎯',
  },
  {
    id: 'exotel',
    name: 'Exotel',
    desc: 'Voice + WhatsApp',
    icon: '📞',
  },
];

const SETUP_GUIDES: Record<string, {
  steps: { title: string; desc: string }[];
  links: { label: string; url: string; primary?: boolean }[];
  fields: { key: string; label: string; placeholder: string; type?: string; hint?: string }[];
}> = {
  meta: {
    steps: [
      { title: 'Create Meta Business Account', desc: 'Sign up at business.facebook.com' },
      { title: 'Create Developer App', desc: 'Go to developers.facebook.com' },
      { title: 'Add WhatsApp Product', desc: 'Enable WhatsApp in your app' },
      { title: 'Complete Verification', desc: 'Business verification takes 2-7 days' },
      { title: 'Get Credentials', desc: 'Copy Access Token & Phone Number ID' },
    ],
    links: [
      { label: 'Meta Business', url: 'https://business.facebook.com', primary: true },
      { label: 'Developer Portal', url: 'https://developers.facebook.com' },
    ],
    fields: [
      { key: 'accessToken', label: 'Access Token', placeholder: 'EAAGxxxxxxx...', type: 'password', hint: 'Found in App Dashboard > WhatsApp > API Setup' },
      { key: 'phoneNumberId', label: 'Phone Number ID', placeholder: '1234567890123456', hint: 'The ID of your WhatsApp business phone number' },
      { key: 'businessAccountId', label: 'Business Account ID', placeholder: '9876543210123456', hint: 'Optional - Your WhatsApp Business Account ID' },
    ],
  },
  '360dialog': {
    steps: [
      { title: 'Create Account', desc: 'Sign up at 360dialog.com' },
      { title: 'Submit for Approval', desc: 'Complete WhatsApp verification' },
      { title: 'Get API Key', desc: 'Copy from your dashboard' },
    ],
    links: [
      { label: 'Sign Up', url: 'https://www.360dialog.com/whatsapp-business-api', primary: true },
      { label: 'Dashboard', url: 'https://hub.360dialog.com' },
    ],
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'Your 360dialog API key', type: 'password', hint: 'Found in 360dialog Hub > Settings > API' },
    ],
  },
  gupshup: {
    steps: [
      { title: 'Create Account', desc: 'Sign up at gupshup.io' },
      { title: 'Create WhatsApp App', desc: 'Set up in WhatsApp section' },
      { title: 'Get API Key', desc: 'Copy from dashboard' },
    ],
    links: [
      { label: 'Sign Up', url: 'https://www.gupshup.io/developer/whatsapp-api', primary: true },
    ],
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'Your Gupshup API key', type: 'password', hint: 'Found in Gupshup Dashboard > Settings' },
    ],
  },
  wati: {
    steps: [
      { title: 'Create Account', desc: 'Sign up at wati.io' },
      { title: 'Connect WhatsApp', desc: 'Link your business number' },
      { title: 'Get API Credentials', desc: 'Go to Settings > API' },
    ],
    links: [
      { label: 'Sign Up', url: 'https://www.wati.io', primary: true },
      { label: 'API Docs', url: 'https://docs.wati.io' },
    ],
    fields: [
      { key: 'apiKey', label: 'API Endpoint', placeholder: 'https://live-server-12345.wati.io', hint: 'Your Wati server URL' },
      { key: 'apiSecret', label: 'Access Token', placeholder: 'Your Wati access token', type: 'password', hint: 'Found in Wati > Settings > API' },
    ],
  },
  exotel: {
    steps: [
      { title: 'Contact Exotel', desc: 'Request WhatsApp enablement' },
      { title: 'Use Existing Credentials', desc: 'Your Exotel account is used' },
      { title: 'Add Phone Number', desc: 'Enter your WhatsApp number below' },
    ],
    links: [
      { label: 'Exotel Dashboard', url: 'https://my.exotel.com', primary: true },
    ],
    fields: [],
  },
};

export default function WhatsAppSettingsPage() {
  const [config, setConfig] = useState<WhatsAppConfig>({
    provider: 'meta',
    phoneNumber: '',
    isConfigured: false,
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showSecrets, setShowSecrets] = useState(false);
  const [activeTab, setActiveTab] = useState<'setup' | 'compare'>('setup');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await api.get('/organization/settings/whatsapp');
      if (response.data.data) {
        setConfig(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch WhatsApp config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setTestResult(null);
    try {
      await api.post('/organization/settings/whatsapp', config);
      setTestResult({ success: true, message: 'Configuration saved successfully' });
    } catch (error: any) {
      setTestResult({ success: false, message: error.response?.data?.message || 'Failed to save configuration' });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const response = await api.post('/organization/settings/whatsapp/test');
      setTestResult({ success: true, message: response.data.message || 'Connection verified successfully' });
      setConfig(prev => ({ ...prev, isConfigured: true }));
    } catch (error: any) {
      setTestResult({ success: false, message: error.response?.data?.message || 'Connection test failed' });
    } finally {
      setTesting(false);
    }
  };

  const selectedProvider = PROVIDERS.find(p => p.id === config.provider);
  const currentGuide = SETUP_GUIDES[config.provider];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-80">
        <ArrowPathIcon className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-gray-900">WhatsApp Business API</h1>
          <p className="text-sm text-gray-500">Connect WhatsApp to send messages from your CRM</p>
        </div>
        {config.isConfigured && (
          <div className="flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-sm font-medium">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Connected
          </div>
        )}
      </div>

      {/* Status */}
      {!config.isConfigured && !config.hasEnvConfig && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <ExclamationTriangleIcon className="w-5 h-5 text-amber-600" />
          <p className="text-sm text-amber-800">Complete the setup below to enable WhatsApp messaging</p>
        </div>
      )}

      {/* Env Config Notice */}
      {config.configuredViaEnv && (
        <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <CheckCircleSolidIcon className="w-5 h-5 text-blue-600" />
          <p className="text-sm text-blue-800">WhatsApp is configured using server environment variables. Click "Test Connection" to verify.</p>
        </div>
      )}

      {/* Provider Selection */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Select Provider</h2>
        </div>
        <div className="p-4 grid grid-cols-5 gap-3">
          {PROVIDERS.map((provider) => (
            <button
              key={provider.id}
              onClick={() => setConfig({ ...config, provider: provider.id as any })}
              className={`relative p-3 rounded-xl border-2 text-center transition-all ${
                config.provider === provider.id
                  ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              {provider.recommended && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-medium">
                  Recommended
                </span>
              )}
              <div className="text-xl mb-1">{provider.icon}</div>
              <p className="text-xs font-semibold text-gray-900">{provider.name}</p>
              <p className="text-[10px] text-gray-500">{provider.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('setup')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === 'setup' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Setup Guide
        </button>
        <button
          onClick={() => setActiveTab('compare')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === 'compare' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Compare
        </button>
      </div>

      {activeTab === 'setup' && currentGuide && (
        <>
          {/* Quick Links */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Get Started with {selectedProvider?.name}</h3>
                <p className="text-sm text-indigo-100 mt-1">Click below to create your account and get API credentials</p>
              </div>
              <div className="flex gap-3">
                {currentGuide.links.map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                      link.primary
                        ? 'bg-white text-indigo-600 hover:bg-indigo-50'
                        : 'bg-white/20 text-white hover:bg-white/30'
                    }`}
                  >
                    {link.label}
                    <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Setup Steps */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Setup Steps</h2>
            </div>
            <div className="p-5 space-y-3">
              {currentGuide.steps.map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{step.title}</p>
                    <p className="text-xs text-gray-500">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Credentials */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Credentials</h2>
              {currentGuide.fields.some(f => f.type === 'password') && (
                <button
                  onClick={() => setShowSecrets(!showSecrets)}
                  className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  {showSecrets ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  {showSecrets ? 'Hide' : 'Show'}
                </button>
              )}
            </div>
            <div className="p-5 space-y-4">
              {/* Phone Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">WhatsApp Number</label>
                <input
                  type="text"
                  value={config.phoneNumber}
                  onChange={(e) => setConfig({ ...config, phoneNumber: e.target.value })}
                  placeholder="+919876543210"
                  className="w-full h-10 px-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="text-xs text-gray-500 mt-1">Include country code without spaces</p>
              </div>

              {currentGuide.fields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{field.label}</label>
                  <input
                    type={field.type === 'password' && !showSecrets ? 'password' : 'text'}
                    value={(config as any)[field.key] || ''}
                    onChange={(e) => setConfig({ ...config, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    className="w-full h-10 px-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                  />
                  {field.hint && <p className="text-xs text-gray-500 mt-1">{field.hint}</p>}
                </div>
              ))}

              {config.provider === 'exotel' && (
                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <p className="font-medium text-gray-700">Using Server Credentials</p>
                  <p className="text-xs text-gray-500 mt-1">Exotel uses your environment configuration. Just add your WhatsApp number.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === 'compare' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Provider</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Pricing</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Setup Time</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Best For</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr className="hover:bg-gray-50">
                <td className="py-3 px-4 font-medium">🔵 Meta Cloud API</td>
                <td className="py-3 px-4"><span className="text-green-600 font-medium">Free</span> + per msg</td>
                <td className="py-3 px-4 text-gray-600">2-7 days</td>
                <td className="py-3 px-4 text-gray-600">Cost savings</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-3 px-4 font-medium">⚡ 360dialog</td>
                <td className="py-3 px-4 text-gray-600">Per message</td>
                <td className="py-3 px-4 text-gray-600">1-3 days</td>
                <td className="py-3 px-4 text-gray-600">Quick setup</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-3 px-4 font-medium">🇮🇳 Gupshup</td>
                <td className="py-3 px-4 text-gray-600">Per message</td>
                <td className="py-3 px-4 text-gray-600">1-2 days</td>
                <td className="py-3 px-4 text-gray-600">India focused</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-3 px-4 font-medium">🎯 Wati</td>
                <td className="py-3 px-4 text-gray-600">Subscription</td>
                <td className="py-3 px-4 text-gray-600">Same day</td>
                <td className="py-3 px-4 text-gray-600">Easy setup</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-3 px-4 font-medium">📞 Exotel</td>
                <td className="py-3 px-4 text-gray-600">Per message</td>
                <td className="py-3 px-4 text-gray-600">2-5 days</td>
                <td className="py-3 px-4 text-gray-600">Voice + WhatsApp</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Message */}
      {testResult && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${
          testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          {testResult.success ? (
            <CheckCircleSolidIcon className="w-5 h-5 text-green-600" />
          ) : (
            <XCircleIcon className="w-5 h-5 text-red-600" />
          )}
          <p className={`text-sm font-medium ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
            {testResult.message}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 h-11 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-2"
        >
          {saving && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
          Save Configuration
        </button>
        <button
          onClick={handleTest}
          disabled={testing || (!config.phoneNumber && !config.phoneNumberId && !config.accessToken)}
          className="h-11 px-6 bg-white border border-gray-300 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors inline-flex items-center gap-2"
        >
          {testing && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
          Test Connection
        </button>
      </div>

      {/* Help */}
      <div className="grid grid-cols-3 gap-4 pt-4">
        <div className="flex gap-3 p-4 bg-gray-50 rounded-xl">
          <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
            <GlobeAltIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Business Verification</p>
            <p className="text-xs text-gray-500 mt-0.5">Meta verification takes 2-7 days</p>
          </div>
        </div>
        <div className="flex gap-3 p-4 bg-gray-50 rounded-xl">
          <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
            <ShieldCheckIcon className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Dedicated Number</p>
            <p className="text-xs text-gray-500 mt-0.5">Use a number not on WhatsApp app</p>
          </div>
        </div>
        <div className="flex gap-3 p-4 bg-gray-50 rounded-xl">
          <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
            <BoltIcon className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Start Messaging</p>
            <p className="text-xs text-gray-500 mt-0.5">Send from Lead pages once connected</p>
          </div>
        </div>
      </div>
    </div>
  );
}
