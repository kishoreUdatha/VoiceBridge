import { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  KeyIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  SparklesIcon,
  SpeakerWaveIcon,
  MegaphoneIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface IntegrationConfig {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  fields: {
    key: string;
    label: string;
    placeholder: string;
    type: 'text' | 'password' | 'select';
    required: boolean;
    hint?: string;
    options?: { value: string; label: string }[];
  }[];
  testEndpoint?: string;
  docsUrl?: string;
}

const INTEGRATIONS: IntegrationConfig[] = [
  {
    id: 'whatsapp',
    name: 'WhatsApp Business API',
    description: 'Send WhatsApp messages to leads',
    icon: ChatBubbleLeftRightIcon,
    color: 'bg-green-500',
    docsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api',
    testEndpoint: '/organization/settings/whatsapp/test',
    fields: [
      { key: 'provider', label: 'Provider', placeholder: '', type: 'select', required: true, options: [
        { value: 'meta', label: 'Meta Cloud API (Recommended)' },
        { value: '360dialog', label: '360dialog' },
        { value: 'gupshup', label: 'Gupshup' },
        { value: 'wati', label: 'Wati' },
      ]},
      { key: 'accessToken', label: 'Access Token', placeholder: 'EAAGxxxxxxx...', type: 'password', required: true, hint: 'From Meta Developer Portal' },
      { key: 'phoneNumberId', label: 'Phone Number ID', placeholder: '1234567890123456', type: 'text', required: true },
      { key: 'businessAccountId', label: 'Business Account ID', placeholder: '9876543210123456', type: 'text', required: false },
      { key: 'phoneNumber', label: 'WhatsApp Number', placeholder: '+919876543210', type: 'text', required: true },
    ],
  },
  {
    id: 'voice',
    name: 'Voice Calling (Exotel)',
    description: 'Make and receive phone calls',
    icon: PhoneIcon,
    color: 'bg-blue-500',
    docsUrl: 'https://developer.exotel.com/api/',
    testEndpoint: '/exotel/test-connection',
    fields: [
      { key: 'apiKey', label: 'API Key (SID)', placeholder: 'your_exotel_sid', type: 'text', required: true },
      { key: 'apiToken', label: 'API Token', placeholder: 'your_exotel_token', type: 'password', required: true },
      { key: 'subdomain', label: 'Subdomain', placeholder: 'api.exotel.com', type: 'text', required: true },
      { key: 'callerId', label: 'Caller ID', placeholder: '+914012345678', type: 'text', required: true, hint: 'Your Exotel virtual number' },
      { key: 'appId', label: 'App ID (ExoPhone)', placeholder: 'your_app_id', type: 'text', required: false },
    ],
  },
  {
    id: 'sms',
    name: 'SMS (DLT Compliance)',
    description: 'Send SMS with DLT compliance for India',
    icon: ChatBubbleLeftRightIcon,
    color: 'bg-purple-500',
    fields: [
      { key: 'senderId', label: 'Sender ID', placeholder: 'MYCOMP', type: 'text', required: true, hint: '6 character sender ID registered with DLT' },
      { key: 'entityId', label: 'DLT Entity ID', placeholder: '1234567890123456789', type: 'text', required: true, hint: 'From your DLT portal (Jio, Airtel, etc.)' },
      { key: 'templateId', label: 'Default Template ID', placeholder: '1234567890123456789', type: 'text', required: false },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'AI-powered features and conversations',
    icon: SparklesIcon,
    color: 'bg-emerald-500',
    docsUrl: 'https://platform.openai.com/api-keys',
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'sk-...', type: 'password', required: true, hint: 'From OpenAI Dashboard' },
      { key: 'model', label: 'Default Model', placeholder: '', type: 'select', required: false, options: [
        { value: 'gpt-4o', label: 'GPT-4o (Recommended)' },
        { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Faster)' },
        { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
      ]},
    ],
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    description: 'AI voice synthesis for calls',
    icon: SpeakerWaveIcon,
    color: 'bg-orange-500',
    docsUrl: 'https://elevenlabs.io/docs/api-reference',
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'your_elevenlabs_key', type: 'password', required: true },
      { key: 'defaultVoiceId', label: 'Default Voice ID', placeholder: 'EXAVITQu4vr4xnSDxMaL', type: 'text', required: false, hint: 'Voice ID for AI agents' },
    ],
  },
  {
    id: 'facebook',
    name: 'Facebook Ads',
    description: 'Capture leads from Facebook ads',
    icon: MegaphoneIcon,
    color: 'bg-blue-600',
    docsUrl: 'https://developers.facebook.com/docs/marketing-api',
    fields: [
      { key: 'pageAccessToken', label: 'Page Access Token', placeholder: 'EAAGxxxxxxx...', type: 'password', required: true },
      { key: 'pageId', label: 'Page ID', placeholder: '1234567890', type: 'text', required: true },
      { key: 'adAccountId', label: 'Ad Account ID', placeholder: 'act_1234567890', type: 'text', required: false },
      { key: 'verifyToken', label: 'Webhook Verify Token', placeholder: 'my_custom_verify_token', type: 'text', required: true, hint: 'You define this, use same in Facebook webhook setup' },
    ],
  },
];

interface IntegrationData {
  [fieldKey: string]: string | boolean | undefined;
  isConfigured?: boolean;
  lastTested?: string;
}

interface SavedCredentials {
  [integrationId: string]: IntegrationData;
}

export default function IntegrationCredentialsPage() {
  const [credentials, setCredentials] = useState<SavedCredentials>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState<{ [key: string]: boolean }>({});
  const [expandedSection, setExpandedSection] = useState<string | null>('whatsapp');

  useEffect(() => {
    fetchCredentials();
  }, []);

  const fetchCredentials = async () => {
    try {
      setLoading(true);
      const response = await api.get('/organization/integrations');
      if (response.data.success && response.data.data) {
        setCredentials(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch credentials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (integrationId: string) => {
    setSaving(integrationId);
    try {
      await api.put(`/organization/integrations/${integrationId}`, credentials[integrationId] || {});
      toast.success(`${INTEGRATIONS.find(i => i.id === integrationId)?.name} settings saved`);
      fetchCredentials(); // Refresh to get updated status
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(null);
    }
  };

  const handleTest = async (integration: IntegrationConfig) => {
    if (!integration.testEndpoint) return;

    setTesting(integration.id);
    try {
      const response = await api.post(integration.testEndpoint);
      if (response.data.success) {
        toast.success(`${integration.name} connection verified!`);
        fetchCredentials();
      } else {
        toast.error(response.data.message || 'Connection test failed');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Connection test failed');
    } finally {
      setTesting(null);
    }
  };

  const updateField = (integrationId: string, fieldKey: string, value: string) => {
    setCredentials(prev => ({
      ...prev,
      [integrationId]: {
        ...(prev[integrationId] || {}),
        [fieldKey]: value,
      },
    }));
  };

  const toggleSecret = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <ArrowPathIcon className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Integration Credentials</h1>
          <p className="text-gray-600 mt-1">
            Configure your API keys and credentials for all integrations
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <ShieldCheckIcon className="w-5 h-5" />
          <span>All credentials are encrypted</span>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <ExclamationTriangleIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-blue-800 font-medium">Your Own Credentials</p>
          <p className="text-sm text-blue-700 mt-1">
            Each integration requires your own API keys. These are stored securely and used only for your organization.
            You are responsible for the costs associated with each service.
          </p>
        </div>
      </div>

      {/* Integration Cards */}
      <div className="space-y-4">
        {INTEGRATIONS.map((integration) => {
          const integrationCreds = credentials[integration.id] || {};
          const isConfigured = integrationCreds.isConfigured;
          const isExpanded = expandedSection === integration.id;
          const Icon = integration.icon;

          return (
            <div
              key={integration.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
            >
              {/* Header */}
              <button
                onClick={() => setExpandedSection(isExpanded ? null : integration.id)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 ${integration.color} rounded-lg flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">{integration.name}</h3>
                    <p className="text-sm text-gray-500">{integration.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {isConfigured ? (
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                      <CheckCircleIcon className="w-4 h-4" />
                      Connected
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">
                      <XCircleIcon className="w-4 h-4" />
                      Not Configured
                    </span>
                  )}
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-5 pb-5 border-t border-gray-100">
                  <div className="pt-4 space-y-4">
                    {/* Documentation Link */}
                    {integration.docsUrl && (
                      <a
                        href={integration.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700"
                      >
                        <KeyIcon className="w-4 h-4" />
                        Get your API credentials →
                      </a>
                    )}

                    {/* Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {integration.fields.map((field) => (
                        <div key={field.key} className={field.type === 'select' ? '' : ''}>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          {field.type === 'select' ? (
                            <select
                              value={String(integrationCreds[field.key] || '')}
                              onChange={(e) => updateField(integration.id, field.key, e.target.value)}
                              className="w-full h-10 px-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                              <option value="">Select...</option>
                              {field.options?.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          ) : (
                            <div className="relative">
                              <input
                                type={field.type === 'password' && !showSecrets[`${integration.id}-${field.key}`] ? 'password' : 'text'}
                                value={String(integrationCreds[field.key] || '')}
                                onChange={(e) => updateField(integration.id, field.key, e.target.value)}
                                placeholder={field.placeholder}
                                className="w-full h-10 px-3 pr-10 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                              />
                              {field.type === 'password' && (
                                <button
                                  type="button"
                                  onClick={() => toggleSecret(`${integration.id}-${field.key}`)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                  {showSecrets[`${integration.id}-${field.key}`] ? (
                                    <EyeSlashIcon className="w-4 h-4" />
                                  ) : (
                                    <EyeIcon className="w-4 h-4" />
                                  )}
                                </button>
                              )}
                            </div>
                          )}
                          {field.hint && (
                            <p className="text-xs text-gray-500 mt-1">{field.hint}</p>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        onClick={() => handleSave(integration.id)}
                        disabled={saving === integration.id}
                        className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        {saving === integration.id && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
                        Save
                      </button>
                      {integration.testEndpoint && (
                        <button
                          onClick={() => handleTest(integration)}
                          disabled={testing === integration.id}
                          className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
                        >
                          {testing === integration.id && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
                          Test Connection
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Help Section */}
      <div className="bg-gray-50 rounded-xl p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Need Help?</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="font-medium text-gray-700">WhatsApp Setup</p>
            <p className="text-gray-500">Create a Meta Business account and WhatsApp Cloud API app</p>
          </div>
          <div>
            <p className="font-medium text-gray-700">Voice/SMS Setup</p>
            <p className="text-gray-500">Sign up for Exotel and complete KYC verification</p>
          </div>
          <div>
            <p className="font-medium text-gray-700">AI Features</p>
            <p className="text-gray-500">Get OpenAI and ElevenLabs API keys from their dashboards</p>
          </div>
        </div>
      </div>
    </div>
  );
}
