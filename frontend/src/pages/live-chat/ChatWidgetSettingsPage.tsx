/**
 * Chat Widget Settings Page
 * Configure embeddable chat widget for websites
 */

import { useState, useEffect } from 'react';
import {
  MessageCircle,
  Settings,
  Palette,
  Clock,
  Bot,
  Code,
  Copy,
  Check,
  Eye,
  Save,
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface WidgetConfig {
  id: string;
  name: string;
  primaryColor: string;
  greeting: string;
  offlineMessage: string;
  collectEmail: boolean;
  collectPhone: boolean;
  collectName: boolean;
  autoReply: boolean;
  autoReplyMessage: string;
  botEnabled: boolean;
  botGreeting: string;
  botFallbackMessage: string;
  businessHours: {
    enabled: boolean;
    timezone: string;
    schedule: { day: number; start: string; end: string }[];
  };
  position: 'bottom-right' | 'bottom-left';
  isActive: boolean;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function ChatWidgetSettingsPage() {
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [embedCode, setEmbedCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'appearance' | 'behavior' | 'bot' | 'hours' | 'embed'>('appearance');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const [configRes, embedRes] = await Promise.all([
        api.get('/live-chat/widget/config'),
        api.get('/live-chat/widget/embed-code'),
      ]);
      setConfig(configRes.data.data);
      setEmbedCode(embedRes.data.data.embedCode);
    } catch (error) {
      console.error('Error loading widget config:', error);
      // Set defaults
      setConfig({
        id: '',
        name: 'Support Chat',
        primaryColor: '#4F46E5',
        greeting: 'Hi! How can we help you today?',
        offlineMessage: 'We\'re offline. Leave a message!',
        collectEmail: true,
        collectPhone: true,
        collectName: true,
        autoReply: true,
        autoReplyMessage: 'Thanks! We\'ll respond shortly.',
        botEnabled: true,
        botGreeting: 'Hello! How can I help?',
        botFallbackMessage: 'Let me connect you with an agent.',
        businessHours: {
          enabled: true,
          timezone: 'Asia/Kolkata',
          schedule: [
            { day: 1, start: '09:00', end: '18:00' },
            { day: 2, start: '09:00', end: '18:00' },
            { day: 3, start: '09:00', end: '18:00' },
            { day: 4, start: '09:00', end: '18:00' },
            { day: 5, start: '09:00', end: '18:00' },
          ],
        },
        position: 'bottom-right',
        isActive: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!config) return;

    setSaving(true);
    try {
      await api.put('/live-chat/widget/config', config);
      toast.success('Widget settings saved');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    toast.success('Embed code copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const updateConfig = (updates: Partial<WidgetConfig>) => {
    if (config) {
      setConfig({ ...config, ...updates });
    }
  };

  const toggleBusinessDay = (day: number) => {
    if (!config) return;

    const schedule = [...(config.businessHours.schedule || [])];
    const index = schedule.findIndex((s) => s.day === day);

    if (index >= 0) {
      schedule.splice(index, 1);
    } else {
      schedule.push({ day, start: '09:00', end: '18:00' });
    }

    updateConfig({
      businessHours: { ...config.businessHours, schedule },
    });
  };

  const updateDayHours = (day: number, field: 'start' | 'end', value: string) => {
    if (!config) return;

    const schedule = config.businessHours.schedule.map((s) =>
      s.day === day ? { ...s, [field]: value } : s
    );

    updateConfig({
      businessHours: { ...config.businessHours, schedule },
    });
  };

  if (loading || !config) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Live Chat Widget</h1>
            <p className="text-sm text-gray-500">Configure your embeddable chat widget</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.isActive}
              onChange={(e) => updateConfig({ isActive: e.target.checked })}
              className="h-4 w-4 text-primary-600 rounded"
            />
            <span className="text-sm text-gray-700">Widget Active</span>
          </label>
          <button
            onClick={saveConfig}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Tabs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tab Navigation */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex border-b border-gray-200">
              {[
                { key: 'appearance', icon: Palette, label: 'Appearance' },
                { key: 'behavior', icon: Settings, label: 'Behavior' },
                { key: 'bot', icon: Bot, label: 'Bot Settings' },
                { key: 'hours', icon: Clock, label: 'Business Hours' },
                { key: 'embed', icon: Code, label: 'Embed Code' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-6">
              {/* Appearance Tab */}
              {activeTab === 'appearance' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Widget Name</label>
                    <input
                      type="text"
                      value={config.name}
                      onChange={(e) => updateConfig({ name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={config.primaryColor}
                        onChange={(e) => updateConfig({ primaryColor: e.target.value })}
                        className="w-12 h-12 rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={config.primaryColor}
                        onChange={(e) => updateConfig({ primaryColor: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg w-32"
                      />
                      <div className="flex gap-2">
                        {['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'].map((color) => (
                          <button
                            key={color}
                            onClick={() => updateConfig({ primaryColor: color })}
                            className="w-8 h-8 rounded-full border-2 border-white shadow-md"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
                    <div className="flex gap-4">
                      {['bottom-right', 'bottom-left'].map((pos) => (
                        <label key={pos} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="position"
                            checked={config.position === pos}
                            onChange={() => updateConfig({ position: pos as any })}
                            className="h-4 w-4 text-primary-600"
                          />
                          <span className="text-sm text-gray-700 capitalize">{pos.replace('-', ' ')}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Greeting Message</label>
                    <textarea
                      value={config.greeting}
                      onChange={(e) => updateConfig({ greeting: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Offline Message</label>
                    <textarea
                      value={config.offlineMessage}
                      onChange={(e) => updateConfig({ offlineMessage: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              )}

              {/* Behavior Tab */}
              {activeTab === 'behavior' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-4">Data Collection</h3>
                    <div className="space-y-3">
                      {[
                        { key: 'collectName', label: 'Collect visitor name' },
                        { key: 'collectEmail', label: 'Collect email address' },
                        { key: 'collectPhone', label: 'Collect phone number' },
                      ].map((item) => (
                        <label key={item.key} className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={config[item.key as keyof WidgetConfig] as boolean}
                            onChange={(e) => updateConfig({ [item.key]: e.target.checked })}
                            className="h-4 w-4 text-primary-600 rounded"
                          />
                          <span className="text-sm text-gray-700">{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <label className="flex items-center gap-3 mb-4">
                      <input
                        type="checkbox"
                        checked={config.autoReply}
                        onChange={(e) => updateConfig({ autoReply: e.target.checked })}
                        className="h-4 w-4 text-primary-600 rounded"
                      />
                      <span className="text-sm font-medium text-gray-900">Auto-reply to new messages</span>
                    </label>
                    {config.autoReply && (
                      <textarea
                        value={config.autoReplyMessage}
                        onChange={(e) => updateConfig({ autoReplyMessage: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="Auto-reply message..."
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Bot Settings Tab */}
              {activeTab === 'bot' && (
                <div className="space-y-6">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={config.botEnabled}
                      onChange={(e) => updateConfig({ botEnabled: e.target.checked })}
                      className="h-4 w-4 text-primary-600 rounded"
                    />
                    <span className="text-sm font-medium text-gray-900">Enable chat bot</span>
                  </label>

                  {config.botEnabled && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Bot Greeting</label>
                        <textarea
                          value={config.botGreeting}
                          onChange={(e) => updateConfig({ botGreeting: e.target.value })}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Fallback Message (when bot can't help)
                        </label>
                        <textarea
                          value={config.botFallbackMessage}
                          onChange={(e) => updateConfig({ botFallbackMessage: e.target.value })}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>

                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h4 className="text-sm font-medium text-blue-900 mb-2">Bot Capabilities</h4>
                        <ul className="text-sm text-blue-700 space-y-1">
                          <li>• Responds to greetings</li>
                          <li>• Handles pricing inquiries</li>
                          <li>• Schedules demos</li>
                          <li>• Provides business hours info</li>
                          <li>• Shares contact details</li>
                          <li>• Auto-handoff to human agent</li>
                        </ul>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Business Hours Tab */}
              {activeTab === 'hours' && (
                <div className="space-y-6">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={config.businessHours.enabled}
                      onChange={(e) =>
                        updateConfig({
                          businessHours: { ...config.businessHours, enabled: e.target.checked },
                        })
                      }
                      className="h-4 w-4 text-primary-600 rounded"
                    />
                    <span className="text-sm font-medium text-gray-900">Enable business hours</span>
                  </label>

                  {config.businessHours.enabled && (
                    <div className="space-y-3">
                      {DAYS.map((day, index) => {
                        const schedule = config.businessHours.schedule.find((s) => s.day === index);
                        return (
                          <div key={day} className="flex items-center gap-4">
                            <label className="flex items-center gap-2 w-32">
                              <input
                                type="checkbox"
                                checked={!!schedule}
                                onChange={() => toggleBusinessDay(index)}
                                className="h-4 w-4 text-primary-600 rounded"
                              />
                              <span className="text-sm text-gray-700">{day}</span>
                            </label>
                            {schedule && (
                              <div className="flex items-center gap-2">
                                <input
                                  type="time"
                                  value={schedule.start}
                                  onChange={(e) => updateDayHours(index, 'start', e.target.value)}
                                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                                <span className="text-gray-500">to</span>
                                <input
                                  type="time"
                                  value={schedule.end}
                                  onChange={(e) => updateDayHours(index, 'end', e.target.value)}
                                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Embed Code Tab */}
              {activeTab === 'embed' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Copy this code and paste it before the closing <code className="bg-gray-100 px-1 rounded">&lt;/body&gt;</code> tag on your website.
                  </p>
                  <div className="relative">
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                      {embedCode}
                    </pre>
                    <button
                      onClick={copyEmbedCode}
                      className="absolute top-3 right-3 p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-300" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 p-4 sticky top-4">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-4 h-4 text-gray-500" />
              <h3 className="font-medium text-gray-900">Preview</h3>
            </div>

            {/* Widget Preview */}
            <div className="relative h-96 bg-gray-100 rounded-lg overflow-hidden">
              {/* Sample webpage */}
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                <div className="h-4 bg-gray-300 rounded w-5/6"></div>
              </div>

              {/* Chat Widget */}
              <div
                className={`absolute ${
                  config.position === 'bottom-right' ? 'right-4' : 'left-4'
                } bottom-4`}
              >
                {/* Closed State */}
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:scale-105 transition-transform"
                  style={{ backgroundColor: config.primaryColor }}
                >
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>

                {/* Open State Preview */}
                <div className="absolute bottom-16 right-0 w-72 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
                  {/* Header */}
                  <div
                    className="p-3 text-white"
                    style={{ backgroundColor: config.primaryColor }}
                  >
                    <p className="font-medium text-sm">{config.name}</p>
                    <p className="text-xs opacity-80">We typically reply in a few minutes</p>
                  </div>

                  {/* Messages */}
                  <div className="p-3 h-32 bg-gray-50">
                    <div
                      className="inline-block px-3 py-2 rounded-lg text-white text-xs max-w-[80%]"
                      style={{ backgroundColor: config.primaryColor }}
                    >
                      {config.botEnabled ? config.botGreeting : config.greeting}
                    </div>
                  </div>

                  {/* Input */}
                  <div className="p-2 border-t border-gray-200">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Type a message..."
                        className="flex-1 px-3 py-1.5 text-xs border border-gray-300 rounded-lg"
                        disabled
                      />
                      <button
                        className="p-1.5 rounded-lg text-white"
                        style={{ backgroundColor: config.primaryColor }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
