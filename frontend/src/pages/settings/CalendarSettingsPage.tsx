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
  const [integration, setIntegration] = useState<CalendarIntegration | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchIntegration();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchIntegration = async () => {
    try {
      setLoading(true);
      const response = await api.get('/calendar/integration');
      setIntegration(response.data?.data || response.data || null);
    } catch (err: any) {
      if (err.response?.status !== 404) {
        console.error('Failed to load calendar integration');
      }
      setIntegration(null);
    } finally {
      setLoading(false);
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
      fetchIntegration();
    } catch (err: any) {
      setToast({ type: 'error', message: 'Failed to sync calendar' });
    } finally {
      setSyncing(false);
    }
  };

  const providerConfig = integration
    ? CALENDAR_PROVIDERS[integration.provider as keyof typeof CALENDAR_PROVIDERS]
    : null;

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

      <div className="max-w-4xl mx-auto px-6 py-8">
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

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : integration && providerConfig ? (
          /* Connected State */
          <div className="space-y-6">
            {/* Connection Card */}
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

              {/* Settings */}
              <div className="p-6">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <Settings2 size={16} />
                  Sync Settings
                </h3>

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
              </div>
            </div>
          </div>
        ) : (
          /* Not Connected State */
          <div className="space-y-4">
            {/* Calendar Providers */}
            {(Object.entries(CALENDAR_PROVIDERS) as [string, CalendarProviderConfig][]).map(([id, provider]) => (
              <div
                key={id}
                className={`bg-white rounded-2xl border border-gray-200 overflow-hidden transition-all hover:shadow-md ${
                  provider.comingSoon ? 'opacity-75' : ''
                }`}
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
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-gray-900">{provider.name}</h3>
                          {provider.comingSoon && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-medium rounded-full">
                              Coming Soon
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{provider.description}</p>
                      </div>
                    </div>
                    {provider.comingSoon ? (
                      <button
                        disabled
                        className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed text-sm font-medium"
                      >
                        Coming Soon
                      </button>
                    ) : (
                      <button
                        onClick={() => handleConnect(id)}
                        disabled={connecting}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition text-sm font-medium"
                      >
                        {connecting ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Link2 size={16} />
                        )}
                        Connect
                      </button>
                    )}
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
                    <p className="font-medium text-gray-900">Connect</p>
                    <p className="text-sm text-gray-600">Link your calendar account securely with OAuth</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-sm font-bold">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Configure</p>
                    <p className="text-sm text-gray-600">Set up auto-create events and availability checks</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-sm font-bold">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Automate</p>
                    <p className="text-sm text-gray-600">Appointments from voice AI sync automatically</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-white/60 rounded-xl">
                <div className="flex items-start gap-3">
                  <Shield className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">Secure OAuth Connection</p>
                    <p className="text-sm text-gray-600">
                      We use industry-standard OAuth 2.0. Your calendar credentials are never stored on our servers.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
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
