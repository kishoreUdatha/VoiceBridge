import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Link2,
  Unlink,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Clock,
  CalendarCheck,
  CalendarPlus,
  Zap,
  Shield,
  Settings2,
  Key,
  Eye,
  EyeOff,
  ExternalLink,
  Save,
} from 'lucide-react';
import api from '../../services/api';

interface CalendarIntegration {
  id: string;
  provider: 'GOOGLE' | 'OUTLOOK' | 'CALENDLY';
  isActive: boolean;
  calendarId: string | null;
  syncEnabled: boolean;
  autoCreateEvents: boolean;
  checkAvailability: boolean;
  lastSyncAt: string | null;
  lastSyncError: string | null;
}

interface CalendarConfig {
  clientId: string;
  clientSecretSet: boolean;
  redirectUri: string;
  isConfigured: boolean;
}

interface CalendarProviderConfig {
  name: string;
  logo: string;
  color: string;
  bgGradient: string;
  description: string;
  features: string[];
  comingSoon?: boolean;
}

const CALENDAR_PROVIDERS: Record<'GOOGLE' | 'OUTLOOK' | 'CALENDLY', CalendarProviderConfig> = {
  GOOGLE: {
    name: 'Google Calendar',
    logo: 'https://www.gstatic.com/images/branding/product/2x/calendar_2020q4_48dp.png',
    color: '#4285F4',
    bgGradient: 'from-blue-500 to-blue-600',
    description: 'Sync appointments with your Google Calendar',
    features: ['Two-way sync', 'Auto-create events', 'Check availability'],
  },
  OUTLOOK: {
    name: 'Microsoft Outlook',
    logo: 'https://cdn.worldvectorlogo.com/logos/outlook-1.svg',
    color: '#0078D4',
    bgGradient: 'from-[#0078D4] to-[#106EBE]',
    description: 'Sync with Outlook/Office 365 calendar',
    features: ['Two-way sync', 'Auto-create events', 'Check availability'],
    comingSoon: true,
  },
  CALENDLY: {
    name: 'Calendly',
    logo: 'https://cdn.worldvectorlogo.com/logos/calendly-1.svg',
    color: '#006BFF',
    bgGradient: 'from-[#006BFF] to-[#0052CC]',
    description: 'Integrate with Calendly scheduling',
    features: ['Booking links', 'Availability sync', 'Auto-scheduling'],
    comingSoon: true,
  },
};

const CalendarSettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'configuration' | 'connection' | 'settings'>('configuration');
  const [integration, setIntegration] = useState<CalendarIntegration | null>(null);
  const [config, setConfig] = useState<CalendarConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form fields
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch both config and integration in parallel
      const [configRes, integrationRes] = await Promise.allSettled([
        api.get('/calendar/config'),
        api.get('/calendar/integration'),
      ]);

      if (configRes.status === 'fulfilled') {
        const configData = configRes.value.data?.data || configRes.value.data;
        setConfig(configData);
        setClientId(configData?.clientId || '');
      }

      if (integrationRes.status === 'fulfilled') {
        setIntegration(integrationRes.value.data?.data || integrationRes.value.data || null);
      } else {
        setIntegration(null);
      }
    } catch (err: any) {
      console.error('Failed to load calendar settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!clientId) {
      setToast({ type: 'error', message: 'Client ID is required' });
      return;
    }

    try {
      setSaving(true);
      const payload: any = { clientId };
      if (clientSecret) {
        payload.clientSecret = clientSecret;
      }

      const response = await api.post('/calendar/config', payload);
      setConfig(response.data.data);
      setClientSecret(''); // Clear secret after saving
      setToast({ type: 'success', message: 'Configuration saved successfully' });
    } catch (err: any) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to save configuration' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConfig = async () => {
    try {
      setTesting(true);
      await api.post('/calendar/config/test');
      setToast({ type: 'success', message: 'Configuration is valid!' });
    } catch (err: any) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Configuration test failed' });
    } finally {
      setTesting(false);
    }
  };

  const handleConnect = async (provider: string) => {
    try {
      setConnecting(true);
      const response = await api.get(`/calendar/auth-url?provider=${provider}`);
      window.location.href = response.data.authUrl;
    } catch (err: any) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to initiate connection' });
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect your calendar? This will stop syncing appointments.')) return;

    try {
      setLoading(true);
      await api.delete('/calendar/integration');
      setIntegration(null);
      setToast({ type: 'success', message: 'Calendar disconnected' });
    } catch (err: any) {
      setToast({ type: 'error', message: 'Failed to disconnect calendar' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async (settings: Partial<CalendarIntegration>) => {
    if (!integration) return;

    try {
      await api.put('/calendar/integration', settings);
      setIntegration({ ...integration, ...settings });
      setToast({ type: 'success', message: 'Settings updated' });
    } catch (err: any) {
      setToast({ type: 'error', message: 'Failed to update settings' });
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      await api.post('/calendar/sync');
      setToast({ type: 'success', message: 'Calendar synced successfully' });
      fetchData();
    } catch (err: any) {
      setToast({ type: 'error', message: 'Failed to sync calendar' });
    } finally {
      setSyncing(false);
    }
  };

  const providerConfig = integration
    ? CALENDAR_PROVIDERS[integration.provider as keyof typeof CALENDAR_PROVIDERS]
    : null;

  const tabs = [
    { id: 'configuration', label: 'Configuration', icon: Key },
    { id: 'connection', label: 'Connection', icon: Link2 },
    ...(integration ? [{ id: 'settings', label: 'Sync Settings', icon: Settings2 }] : []),
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-top-2">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg ${
            toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
          } text-white`}>
            {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span className="font-medium">{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 p-1 hover:bg-white/20 rounded">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900">Calendar Integration</h1>
          </div>
          <p className="text-gray-500 ml-[52px]">
            Sync appointments automatically when booked via voice AI conversations
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon size={18} />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
          ) : (
            <div className="p-6">
              {/* Configuration Tab */}
              {activeTab === 'configuration' && (
                <div className="space-y-6">
                  <div className="max-w-2xl">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Google OAuth Credentials</h3>
                    <p className="text-sm text-gray-500 mb-6">
                      Enter your Google OAuth credentials to enable calendar integration for your organization.
                    </p>

                    {/* Setup Instructions */}
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                      <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                        <Zap size={16} />
                        How to get Google Calendar credentials
                      </h4>
                      <ol className="text-sm text-blue-800 space-y-2 ml-6 list-decimal">
                        <li>Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="underline font-medium inline-flex items-center gap-1">Google Cloud Console <ExternalLink size={12} /></a></li>
                        <li>Create a new project or select existing one</li>
                        <li>Enable <strong>Google Calendar API</strong> in APIs & Services &gt; Library</li>
                        <li>Go to <strong>APIs & Services &gt; Credentials</strong></li>
                        <li>Click <strong>Create Credentials &gt; OAuth 2.0 Client ID</strong></li>
                        <li>Select "Web application" and add redirect URI:
                          <code className="bg-blue-100 px-2 py-0.5 rounded text-xs ml-1 break-all">
                            {window.location.origin}/api/calendar/oauth/callback
                          </code>
                        </li>
                        <li>Copy the <strong>Client ID</strong> and <strong>Client Secret</strong></li>
                      </ol>
                    </div>

                    {/* Form Fields */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Client ID <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={clientId}
                          onChange={(e) => setClientId(e.target.value)}
                          placeholder="xxxxxxxxxxxx.apps.googleusercontent.com"
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Client Secret {config?.clientSecretSet && <span className="text-emerald-600 text-xs ml-1">(Already set)</span>}
                        </label>
                        <div className="relative">
                          <input
                            type={showSecret ? 'text' : 'password'}
                            value={clientSecret}
                            onChange={(e) => setClientSecret(e.target.value)}
                            placeholder={config?.clientSecretSet ? '••••••••••••••••' : 'Enter client secret'}
                            className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSecret(!showSecret)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showSecret ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {config?.clientSecretSet ? 'Leave blank to keep existing secret' : 'Required for first-time setup'}
                        </p>
                      </div>
                    </div>

                    {/* Status */}
                    {config && (
                      <div className={`mt-6 p-4 rounded-lg ${
                        config.isConfigured ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'
                      }`}>
                        <div className="flex items-center gap-2">
                          {config.isConfigured ? (
                            <>
                              <CheckCircle2 className="text-emerald-600" size={18} />
                              <span className="text-sm font-medium text-emerald-800">Configuration complete</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="text-amber-600" size={18} />
                              <span className="text-sm font-medium text-amber-800">Configuration incomplete - enter credentials above</span>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 mt-6">
                      <button
                        onClick={handleSaveConfig}
                        disabled={saving || !clientId}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium"
                      >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Save Configuration
                      </button>

                      {config?.isConfigured && (
                        <button
                          onClick={handleTestConfig}
                          disabled={testing}
                          className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition text-sm font-medium"
                        >
                          {testing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                          Test Configuration
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Connection Tab */}
              {activeTab === 'connection' && (
                <div className="space-y-6">
                  {integration && providerConfig ? (
                    /* Connected State */
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                      {/* Header */}
                      <div className={`p-6 bg-gradient-to-r ${providerConfig.bgGradient}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-lg">
                              <img
                                src={providerConfig.logo}
                                alt={providerConfig.name}
                                className="w-8 h-8"
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h2 className="text-xl font-semibold text-white">{providerConfig.name}</h2>
                                <span className="px-2 py-0.5 bg-white/20 text-white text-xs font-medium rounded-full flex items-center gap-1">
                                  <CheckCircle2 size={12} />
                                  Connected
                                </span>
                              </div>
                              <p className="text-white/80 text-sm mt-0.5">
                                {integration.calendarId || 'Primary Calendar'}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={handleDisconnect}
                            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition text-sm font-medium"
                          >
                            <Unlink size={16} />
                            Disconnect
                          </button>
                        </div>
                      </div>

                      {/* Sync Status */}
                      <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm">
                          {integration.lastSyncAt ? (
                            <span className="flex items-center gap-1.5 text-gray-600">
                              <Clock size={14} />
                              Last synced: {new Date(integration.lastSyncAt).toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-gray-500">Not synced yet</span>
                          )}
                          {integration.lastSyncError && (
                            <span className="flex items-center gap-1.5 text-red-600">
                              <AlertCircle size={14} />
                              {integration.lastSyncError}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={handleSync}
                          disabled={syncing}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition"
                        >
                          <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                          {syncing ? 'Syncing...' : 'Sync Now'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Not Connected State */
                    <div className="space-y-4">
                      {!config?.isConfigured && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={18} />
                            <div>
                              <p className="font-medium text-amber-800 text-sm">Configuration Required</p>
                              <p className="text-sm text-amber-700 mt-1">
                                Please configure your Google OAuth credentials in the Configuration tab before connecting.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Calendar Providers - Only show available integrations */}
                      {(Object.entries(CALENDAR_PROVIDERS) as [string, CalendarProviderConfig][])
                        .filter(([, provider]) => !provider.comingSoon)
                        .map(([id, provider]) => (
                        <div
                          key={id}
                          className="bg-white rounded-2xl border border-gray-200 overflow-hidden transition-all hover:shadow-md"
                        >
                          <div className="p-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${provider.bgGradient} flex items-center justify-center shadow-lg`}>
                                  <img
                                    src={provider.logo}
                                    alt={provider.name}
                                    className="w-7 h-7"
                                    style={{ filter: 'brightness(0) invert(1)' }}
                                  />
                                </div>
                                <div>
                                  <h3 className="text-lg font-semibold text-gray-900">{provider.name}</h3>
                                  <p className="text-sm text-gray-500">{provider.description}</p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleConnect(id)}
                                disabled={connecting || !config?.isConfigured}
                                className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium"
                              >
                                {connecting ? (
                                  <Loader2 size={16} className="animate-spin" />
                                ) : (
                                  <Link2 size={16} />
                                )}
                                Connect
                              </button>
                            </div>

                            {/* Features */}
                            <div className="mt-4 flex flex-wrap gap-2">
                              {provider.features.map((feature, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg"
                                >
                                  <CheckCircle2 size={12} className="text-emerald-500" />
                                  {feature}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* How It Works */}
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <Zap className="text-blue-600" size={20} />
                          How Calendar Integration Works
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-sm font-bold">
                              1
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">Configure</p>
                              <p className="text-sm text-gray-600">Set up Google OAuth credentials</p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-sm font-bold">
                              2
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">Connect</p>
                              <p className="text-sm text-gray-600">Link your calendar account securely</p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-sm font-bold">
                              3
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">Automate</p>
                              <p className="text-sm text-gray-600">Appointments sync automatically</p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 p-4 bg-white/60 rounded-xl">
                          <div className="flex items-start gap-3">
                            <Shield className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
                            <div>
                              <p className="font-medium text-gray-900 text-sm">Secure OAuth Connection</p>
                              <p className="text-sm text-gray-600">
                                We use industry-standard OAuth 2.0. Your calendar credentials are encrypted and stored securely.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Settings Tab */}
              {activeTab === 'settings' && integration && (
                <div className="space-y-4">
                  {/* Auto Create Events */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 rounded-lg">
                        <CalendarPlus className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Auto-create Events</p>
                        <p className="text-sm text-gray-500">Create calendar events when appointments are booked via AI</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUpdateSettings({ autoCreateEvents: !integration.autoCreateEvents })}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        integration.autoCreateEvents ? 'bg-emerald-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                          integration.autoCreateEvents ? 'translate-x-6' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Check Availability */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <CalendarCheck className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Check Availability</p>
                        <p className="text-sm text-gray-500">Verify calendar availability before scheduling</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUpdateSettings({ checkAvailability: !integration.checkAvailability })}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        integration.checkAvailability ? 'bg-blue-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                          integration.checkAvailability ? 'translate-x-6' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Sync Enabled */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-violet-100 rounded-lg">
                        <RefreshCw className="w-5 h-5 text-violet-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Enable Sync</p>
                        <p className="text-sm text-gray-500">Keep calendar in sync with CRM appointments</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUpdateSettings({ syncEnabled: !integration.syncEnabled })}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        integration.syncEnabled ? 'bg-violet-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                          integration.syncEnabled ? 'translate-x-6' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slide-in-from-top-2 {
          from { transform: translateY(-8px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-in { animation: slide-in-from-top-2 0.2s ease-out; }
      `}</style>
    </div>
  );
};

export default CalendarSettingsPage;
