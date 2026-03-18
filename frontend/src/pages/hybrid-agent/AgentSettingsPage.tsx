import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Save,
  ArrowLeft,
  Globe,
  Shield,
  Volume2,
  MessageSquare,
  Zap,
  AlertCircle,
} from 'lucide-react';
import api from '../../services/api';

interface VoiceAgent {
  id: string;
  name: string;
  industry: string;
  isActive: boolean;
  voiceId: string;
  language: string;
  systemPrompt: string;
  greeting: string;
  fallbackMessage: string;
  temperature: number;
  maxTokens: number;
  questions: Array<{
    question: string;
    field: string;
    required: boolean;
  }>;
  // New settings
  consentRequired: boolean;
  consentMessage: string;
  bargeInEnabled: boolean;
  transferEnabled: boolean;
  defaultTransferNumber: string;
}

const LANGUAGES = [
  // English
  { code: 'en-US', name: 'English (US)', voice: 'Polly.Joanna', region: 'International' },
  { code: 'en-GB', name: 'English (UK)', voice: 'Polly.Amy', region: 'International' },
  { code: 'en-IN', name: 'English (India)', voice: 'Polly.Aditi', region: 'All India' },
  // Indian Languages
  { code: 'hi-IN', name: 'Hindi', voice: 'Polly.Aditi', region: 'North India' },
  { code: 'te-IN', name: 'Telugu', voice: 'Polly.Aditi', region: 'Andhra Pradesh, Telangana' },
  { code: 'ta-IN', name: 'Tamil', voice: 'Polly.Aditi', region: 'Tamil Nadu' },
  { code: 'kn-IN', name: 'Kannada', voice: 'Polly.Aditi', region: 'Karnataka' },
  { code: 'ml-IN', name: 'Malayalam', voice: 'Polly.Aditi', region: 'Kerala' },
  { code: 'mr-IN', name: 'Marathi', voice: 'Polly.Aditi', region: 'Maharashtra' },
  { code: 'bn-IN', name: 'Bengali', voice: 'Polly.Aditi', region: 'West Bengal' },
  { code: 'gu-IN', name: 'Gujarati', voice: 'Polly.Aditi', region: 'Gujarat' },
  { code: 'pa-IN', name: 'Punjabi', voice: 'Polly.Aditi', region: 'Punjab' },
  // International
  { code: 'es-ES', name: 'Spanish (Spain)', voice: 'Polly.Lucia', region: 'Spain' },
  { code: 'es-MX', name: 'Spanish (Mexico)', voice: 'Polly.Mia', region: 'Mexico' },
  { code: 'fr-FR', name: 'French', voice: 'Polly.Celine', region: 'France' },
  { code: 'de-DE', name: 'German', voice: 'Polly.Marlene', region: 'Germany' },
];

const VOICES = [
  { id: 'Polly.Joanna', name: 'Joanna (Female, US)', language: 'en-US' },
  { id: 'Polly.Matthew', name: 'Matthew (Male, US)', language: 'en-US' },
  { id: 'Polly.Amy', name: 'Amy (Female, UK)', language: 'en-GB' },
  { id: 'Polly.Brian', name: 'Brian (Male, UK)', language: 'en-GB' },
  { id: 'Polly.Aditi', name: 'Aditi (Female, India)', language: 'hi-IN' },
  { id: 'Polly.Raveena', name: 'Raveena (Female, India)', language: 'en-IN' },
  { id: 'Polly.Lucia', name: 'Lucia (Female, Spanish)', language: 'es-ES' },
  { id: 'Polly.Celine', name: 'Celine (Female, French)', language: 'fr-FR' },
];

export const AgentSettingsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [agent, setAgent] = useState<VoiceAgent | null>(null);
  const [formData, setFormData] = useState({
    language: 'en-US',
    voiceId: 'Polly.Joanna',
    consentRequired: false,
    consentMessage: 'This call may be recorded for quality purposes. Press 1 or say yes to continue, or press 2 to opt out.',
    bargeInEnabled: true,
    transferEnabled: true,
    defaultTransferNumber: '',
    greeting: '',
    fallbackMessage: '',
    temperature: 0.7,
  });

  useEffect(() => {
    if (id) {
      fetchAgent();
    }
  }, [id]);

  const fetchAgent = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/voice-ai/agents/${id}`);
      const agentData = response.data.data;
      setAgent(agentData);
      setFormData({
        language: agentData.language || 'en-US',
        voiceId: agentData.voiceId || 'Polly.Joanna',
        consentRequired: agentData.consentRequired || false,
        consentMessage: agentData.consentMessage || formData.consentMessage,
        bargeInEnabled: agentData.bargeInEnabled !== false,
        transferEnabled: agentData.transferEnabled !== false,
        defaultTransferNumber: agentData.defaultTransferNumber || '',
        greeting: agentData.greeting || '',
        fallbackMessage: agentData.fallbackMessage || '',
        temperature: agentData.temperature || 0.7,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch agent');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!id) return;

    try {
      setSaving(true);
      setError(null);
      await api.put(`/voice-ai/agents/${id}`, formData);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="p-6 text-center">
        <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Agent Not Found</h2>
        <button
          onClick={() => navigate('/voice-ai')}
          className="mt-4 text-blue-600 hover:underline"
        >
          Back to Agents
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/voice-ai')}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agent Settings</h1>
          <p className="text-gray-600">{agent.name}</p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
          <AlertCircle size={20} />
          {error}
        </div>
      )}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          Settings saved successfully!
        </div>
      )}

      <div className="space-y-6">
        {/* Language & Voice Settings */}
        <div className="bg-white rounded-lg shadow border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="text-blue-600" size={24} />
            <h2 className="text-lg font-semibold">Language & Voice</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Language
              </label>
              <select
                value={formData.language}
                onChange={e => setFormData({ ...formData, language: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <optgroup label="Indian Languages">
                  {LANGUAGES.filter(l => l.code.endsWith('-IN')).map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name} ({lang.region})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="International">
                  {LANGUAGES.filter(l => !l.code.endsWith('-IN')).map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </optgroup>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Speech recognition and TTS language for calls
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Voice
              </label>
              <select
                value={formData.voiceId}
                onChange={e => setFormData({ ...formData, voiceId: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {VOICES.map(voice => (
                  <option key={voice.id} value={voice.id}>{voice.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Consent Settings */}
        <div className="bg-white rounded-lg shadow border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="text-green-600" size={24} />
            <h2 className="text-lg font-semibold">Consent & Compliance</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Require Call Consent</p>
                <p className="text-sm text-gray-500">
                  Ask for consent before proceeding with the call
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.consentRequired}
                  onChange={e => setFormData({ ...formData, consentRequired: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {formData.consentRequired && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Consent Message
                </label>
                <textarea
                  value={formData.consentMessage}
                  onChange={e => setFormData({ ...formData, consentMessage: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
            )}
          </div>
        </div>

        {/* Barge-in Settings */}
        <div className="bg-white rounded-lg shadow border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="text-yellow-600" size={24} />
            <h2 className="text-lg font-semibold">Interrupt Handling (Barge-in)</h2>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Allow Interruptions</p>
              <p className="text-sm text-gray-500">
                Let callers interrupt the AI while it's speaking using voice or keypad
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.bargeInEnabled}
                onChange={e => setFormData({ ...formData, bargeInEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {formData.bargeInEnabled && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>DTMF Shortcuts:</strong><br />
                Press 0 = Transfer to human<br />
                Press 9 = Repeat last message<br />
                Press 1 = Yes/Confirm<br />
                Press 2 = No/Decline
              </p>
            </div>
          )}
        </div>

        {/* Transfer Settings */}
        <div className="bg-white rounded-lg shadow border p-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="text-purple-600" size={24} />
            <h2 className="text-lg font-semibold">Human Transfer</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Enable Transfers</p>
                <p className="text-sm text-gray-500">
                  Allow AI to transfer calls to human agents
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.transferEnabled}
                  onChange={e => setFormData({ ...formData, transferEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {formData.transferEnabled && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Transfer Number
                </label>
                <input
                  type="tel"
                  value={formData.defaultTransferNumber}
                  onChange={e => setFormData({ ...formData, defaultTransferNumber: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="+1234567890"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Fallback number if no transfer config matches
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Voice Settings */}
        <div className="bg-white rounded-lg shadow border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Volume2 className="text-orange-600" size={24} />
            <h2 className="text-lg font-semibold">Voice Messages</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Greeting Message
              </label>
              <textarea
                value={formData.greeting}
                onChange={e => setFormData({ ...formData, greeting: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Hello! Thank you for calling..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fallback Message
              </label>
              <textarea
                value={formData.fallbackMessage}
                onChange={e => setFormData({ ...formData, fallbackMessage: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="I'm sorry, I didn't understand that..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                AI Temperature: {formData.temperature}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={formData.temperature}
                onChange={e => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>More Focused</span>
                <span>More Creative</span>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <button
            onClick={() => navigate('/voice-ai')}
            className="px-6 py-2 text-gray-700 border rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Save size={18} />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentSettingsPage;
