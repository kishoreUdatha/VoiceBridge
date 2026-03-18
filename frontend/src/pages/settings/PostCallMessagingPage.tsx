import React, { useState, useEffect } from 'react';
import {
  Mail,
  MessageSquare,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Info,
  MessageCircle,
} from 'lucide-react';
import api from '../../services/api';

interface PostCallMessagingSettings {
  email: {
    enabled: boolean;
    subject: string;
    template: string;
  };
  sms: {
    enabled: boolean;
    template: string;
  };
  whatsapp: {
    enabled: boolean;
    template: string;
  };
}

const defaultSettings: PostCallMessagingSettings = {
  email: {
    enabled: false,
    subject: 'Thank you for your call!',
    template: `Hi {firstName},

Thank you for speaking with us today!

{summary}

If you have any questions, please reply to this email or call us anytime.

Best regards,
{institutionName}`,
  },
  sms: {
    enabled: false,
    template: 'Hi {firstName}! Thanks for speaking with {institutionName}. We\'ll follow up soon. Questions? Reply to this message.',
  },
  whatsapp: {
    enabled: false,
    template: 'Hi {firstName}! Thank you for speaking with {institutionName} today. If you have any questions, feel free to message us here!',
  },
};

const PostCallMessagingPage: React.FC = () => {
  const [settings, setSettings] = useState<PostCallMessagingSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/organization');
      if (response.data.success) {
        const orgSettings = response.data.data.settings || {};
        if (orgSettings.postCallMessaging) {
          setSettings({
            ...defaultSettings,
            ...orgSettings.postCallMessaging,
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);

    try {
      await api.put('/organization', {
        postCallMessaging: settings,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateEmailSettings = (field: keyof PostCallMessagingSettings['email'], value: any) => {
    setSettings(prev => ({
      ...prev,
      email: { ...prev.email, [field]: value },
    }));
  };

  const updateSmsSettings = (field: keyof PostCallMessagingSettings['sms'], value: any) => {
    setSettings(prev => ({
      ...prev,
      sms: { ...prev.sms, [field]: value },
    }));
  };

  const updateWhatsAppSettings = (field: keyof PostCallMessagingSettings['whatsapp'], value: any) => {
    setSettings(prev => ({
      ...prev,
      whatsapp: { ...prev.whatsapp, [field]: value },
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Post-Call Messaging</h1>
        <p className="text-gray-600 mt-1">
          Automatically send follow-up messages after AI voice calls complete
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-blue-800">
            <strong>Available Variables:</strong> Use these placeholders in your templates:
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {['{firstName}', '{lastName}', '{summary}', '{institutionName}'].map(variable => (
              <code key={variable} className="px-2 py-1 bg-blue-100 rounded text-xs text-blue-700">
                {variable}
              </code>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {saved && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          <p className="text-sm text-green-700">Settings saved successfully!</p>
        </div>
      )}

      {/* Email Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Email Follow-up</h3>
              <p className="text-sm text-gray-500">Send email after call completion</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.email.enabled}
              onChange={(e) => updateEmailSettings('enabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {settings.email.enabled && (
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Subject
              </label>
              <input
                type="text"
                value={settings.email.subject}
                onChange={(e) => updateEmailSettings('subject', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Thank you for your call!"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Template
              </label>
              <textarea
                value={settings.email.template}
                onChange={(e) => updateEmailSettings('template', e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                placeholder="Email body..."
              />
            </div>
          </div>
        )}
      </div>

      {/* SMS Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <MessageSquare className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">SMS Follow-up</h3>
              <p className="text-sm text-gray-500">Send SMS after call completion</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.sms.enabled}
              onChange={(e) => updateSmsSettings('enabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
          </label>
        </div>

        {settings.sms.enabled && (
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SMS Template <span className="text-gray-400 font-normal">(160 char recommended)</span>
              </label>
              <textarea
                value={settings.sms.template}
                onChange={(e) => updateSmsSettings('template', e.target.value)}
                rows={3}
                maxLength={320}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="SMS message..."
              />
              <p className="text-xs text-gray-500 mt-1">
                {settings.sms.template.length}/320 characters
              </p>
            </div>
          </div>
        )}
      </div>

      {/* WhatsApp Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <MessageCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">WhatsApp Follow-up</h3>
              <p className="text-sm text-gray-500">Send WhatsApp message after call completion</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.whatsapp.enabled}
              onChange={(e) => updateWhatsAppSettings('enabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>

        {settings.whatsapp.enabled && (
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                WhatsApp Template
              </label>
              <textarea
                value={settings.whatsapp.template}
                onChange={(e) => updateWhatsAppSettings('template', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="WhatsApp message..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Note: WhatsApp Business API must be configured in Settings &gt; WhatsApp
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

export default PostCallMessagingPage;
