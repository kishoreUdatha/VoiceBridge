import { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  BuildingLibraryIcon,
  MapPinIcon,
  GlobeAltIcon,
  DocumentTextIcon,
  AcademicCapIcon,
  PhoneIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
  EyeIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface InstitutionSettings {
  name: string;
  location: string;
  website: string;
  description: string;
  courses: string;
  phone: string;
  email: string;
}

interface Placeholder {
  key: string;
  description: string;
  example: string;
  field: string;
}

export default function InstitutionSettingsPage() {
  const [activeTab, setActiveTab] = useState<'settings' | 'placeholders' | 'preview'>('settings');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<InstitutionSettings>({
    name: '',
    location: '',
    website: '',
    description: '',
    courses: '',
    phone: '',
    email: '',
  });
  const [placeholders, setPlaceholders] = useState<Placeholder[]>([]);
  const [previewPrompt, setPreviewPrompt] = useState(
    `Hello! I am calling from {{INSTITUTION_NAME}}, located in {{INSTITUTION_LOCATION}}.

We offer various courses including:
{{INSTITUTION_COURSES}}

For more information, visit {{INSTITUTION_WEBSITE}} or call us at {{INSTITUTION_PHONE}}.`
  );
  const [previewResult, setPreviewResult] = useState('');

  useEffect(() => {
    fetchSettings();
    fetchPlaceholders();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await api.get('/organization/institution');
      if (response.data?.success && response.data?.data?.institution) {
        setSettings(response.data.data.institution);
      }
    } catch (error: any) {
      console.error('Failed to fetch institution settings:', error);
      if (error.response?.status !== 401) {
        toast.error('Failed to load institution settings');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchPlaceholders = async () => {
    try {
      const response = await api.get('/organization/placeholders');
      if (response.data?.success && response.data?.data?.placeholders) {
        setPlaceholders(response.data.data.placeholders);
      }
    } catch (error: any) {
      console.error('Failed to fetch placeholders:', error);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await api.put('/organization/institution', settings);
      if (response.data.success) {
        toast.success('Institution settings saved successfully!');
      }
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      toast.error(error.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const previewPromptWithPlaceholders = async () => {
    try {
      const response = await api.post('/organization/preview-prompt', {
        prompt: previewPrompt,
      });
      if (response.data?.success && response.data?.data?.preview) {
        setPreviewResult(response.data.data.preview);
        toast.success('Preview generated!');
      } else {
        toast.error('Failed to generate preview');
      }
    } catch (error: any) {
      console.error('Failed to preview:', error);
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
      } else {
        toast.error('Failed to generate preview');
      }
    }
  };

  const copyPlaceholder = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success(`Copied ${key} to clipboard`);
  };

  const handleInputChange = (field: keyof InstitutionSettings, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BuildingLibraryIcon className="h-8 w-8 text-indigo-600" />
            Institution Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Configure your institution details for AI agents. These settings are used as placeholders in agent prompts.
          </p>
        </div>
        <button
          onClick={saveSettings}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <ArrowPathIcon className="h-5 w-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircleIcon className="h-5 w-5" />
              Save Settings
            </>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'settings'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <BuildingLibraryIcon className="h-5 w-5" />
            Institution Details
          </button>
          <button
            onClick={() => setActiveTab('placeholders')}
            className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'placeholders'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <ClipboardDocumentIcon className="h-5 w-5" />
            Placeholders
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'preview'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <EyeIcon className="h-5 w-5" />
            Preview
          </button>
        </nav>
      </div>

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Institution Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <BuildingLibraryIcon className="h-4 w-4 inline mr-2" />
                Institution Name *
              </label>
              <input
                type="text"
                value={settings.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., Amrutha University"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <p className="mt-1 text-sm text-gray-500">This will be used as {"{{INSTITUTION_NAME}}"} in agent prompts</p>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <MapPinIcon className="h-4 w-4 inline mr-2" />
                Location
              </label>
              <input
                type="text"
                value={settings.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="e.g., Hyderabad, Telangana"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Website */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <GlobeAltIcon className="h-4 w-4 inline mr-2" />
                Website
              </label>
              <input
                type="text"
                value={settings.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                placeholder="e.g., www.amrutha.edu"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <PhoneIcon className="h-4 w-4 inline mr-2" />
                Contact Phone
              </label>
              <input
                type="text"
                value={settings.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="e.g., +91-9876543210"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <EnvelopeIcon className="h-4 w-4 inline mr-2" />
                Contact Email
              </label>
              <input
                type="email"
                value={settings.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="e.g., admissions@amrutha.edu"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <DocumentTextIcon className="h-4 w-4 inline mr-2" />
                About Institution
              </label>
              <textarea
                value={settings.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Brief description about your institution, its history, achievements, etc."
                rows={4}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Courses */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <AcademicCapIcon className="h-4 w-4 inline mr-2" />
                Courses Offered
              </label>
              <textarea
                value={settings.courses}
                onChange={(e) => handleInputChange('courses', e.target.value)}
                placeholder="List of courses offered, e.g.:
- B.Tech (CSE, ECE, Mechanical)
- MBA (Finance, Marketing, HR)
- BBA, BCA, MCA
- B.Sc, M.Sc"
                rows={6}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
              />
            </div>
          </div>

          {/* Save Button (Mobile) */}
          <div className="mt-6 md:hidden">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}

      {/* Placeholders Tab */}
      {activeTab === 'placeholders' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Available Placeholders</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Use these placeholders in your AI agent prompts. They will be automatically replaced with your institution settings.
            </p>
          </div>

          <div className="space-y-4">
            {placeholders.map((placeholder) => (
              <div
                key={placeholder.key}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <code className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded text-sm font-mono">
                      {placeholder.key}
                    </code>
                    <span className="text-gray-600 dark:text-gray-400 text-sm">
                      {placeholder.description}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Current value: <span className="font-medium text-gray-700 dark:text-gray-300">
                      {(settings as any)[placeholder.field] || '(not set)'}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => copyPlaceholder(placeholder.key)}
                  className="ml-4 p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                  title="Copy to clipboard"
                >
                  <ClipboardDocumentIcon className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-medium text-blue-800 dark:text-blue-300">How to use placeholders</h4>
            <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
              When creating or editing an AI agent, include these placeholders in the system prompt, greeting, or any text field.
              When a call is made, the placeholders will be replaced with your institution's actual values.
            </p>
            <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded border border-blue-200 dark:border-blue-700">
              <p className="text-sm font-mono text-gray-700 dark:text-gray-300">
                Example: "Hello! I am calling from {"{{INSTITUTION_NAME}}"} located in {"{{INSTITUTION_LOCATION}}"}."
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Preview Tab */}
      {activeTab === 'preview' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Preview Placeholders</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Test how your prompts will look after placeholder replacement.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Prompt with Placeholders
              </label>
              <textarea
                value={previewPrompt}
                onChange={(e) => setPreviewPrompt(e.target.value)}
                rows={12}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
              />
              <button
                onClick={previewPromptWithPlaceholders}
                className="mt-3 flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                <EyeIcon className="h-5 w-5" />
                Generate Preview
              </button>
            </div>

            {/* Output */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Preview Result
              </label>
              <div className="w-full h-72 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 overflow-auto">
                {previewResult ? (
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-mono">
                    {previewResult}
                  </pre>
                ) : (
                  <p className="text-gray-400 dark:text-gray-500 text-sm italic">
                    Click "Generate Preview" to see how your prompt will look with actual values.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
