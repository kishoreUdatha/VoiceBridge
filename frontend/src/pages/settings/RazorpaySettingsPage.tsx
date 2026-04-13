import { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  CreditCardIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon,
  LinkIcon,
  CurrencyRupeeIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  webhookSecret?: string;
  testMode: boolean;
  isConfigured?: boolean;
}

const initialConfig: RazorpayConfig = {
  keyId: '',
  keySecret: '',
  webhookSecret: '',
  testMode: true,
};

export default function RazorpaySettingsPage() {
  const [activeTab, setActiveTab] = useState<'config' | 'test' | 'webhooks'>('config');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<RazorpayConfig>(initialConfig);
  const [showSecret, setShowSecret] = useState(false);
  const [testAmount, setTestAmount] = useState('100');
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await api.get('/organization/integrations');
      const integrations = response.data.data || {};
      if (integrations.razorpay) {
        setConfig({
          keyId: integrations.razorpay.keyId || integrations.razorpay.apiKey || '',
          keySecret: integrations.razorpay.keySecret || integrations.razorpay.apiSecret || '',
          webhookSecret: integrations.razorpay.webhookSecret || '',
          testMode: integrations.razorpay.testMode ?? true,
          isConfigured: !!(integrations.razorpay.keyId || integrations.razorpay.apiKey),
        });
      }
    } catch (error) {
      console.error('Failed to fetch Razorpay config:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!config.keyId || !config.keySecret) {
      toast.error('Key ID and Key Secret are required');
      return;
    }

    setSaving(true);
    try {
      await api.put('/organization/integrations/razorpay', {
        apiKey: config.keyId,
        apiSecret: config.keySecret,
        webhookSecret: config.webhookSecret,
        testMode: config.testMode,
      });
      toast.success('Razorpay settings saved successfully');
      fetchConfig();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    if (!config.keyId) {
      toast.error('Please enter your Razorpay Key ID first');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      // Create a test order to verify credentials
      const response = await api.post('/payments/create-order', {
        amount: parseFloat(testAmount),
        description: 'Test order - will not be charged',
        testMode: true,
      });

      setTestResult({
        success: true,
        orderId: response.data.data?.razorpayOrderId,
        message: 'Connection successful! Razorpay is configured correctly.',
      });
      toast.success('Razorpay connection verified!');
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.response?.data?.message || 'Connection failed. Please check your credentials.',
      });
      toast.error('Connection test failed');
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
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <CreditCardIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Razorpay Settings</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Configure Razorpay for payment collection
            </p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          config.isConfigured
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
        }`}>
          {config.isConfigured ? 'Configured' : 'Not Configured'}
        </span>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-1.5 py-2.5 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'config'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <CreditCardIcon className="w-4 h-4" />
            API Keys
          </button>
          <button
            onClick={() => setActiveTab('test')}
            className={`flex items-center gap-1.5 py-2.5 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'test'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <ArrowPathIcon className="w-4 h-4" />
            Test Connection
          </button>
          <button
            onClick={() => setActiveTab('webhooks')}
            className={`flex items-center gap-1.5 py-2.5 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'webhooks'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <LinkIcon className="w-4 h-4" />
            Webhooks
          </button>
        </nav>
      </div>

      {/* API Keys Tab */}
      {activeTab === 'config' && (
        <div className="space-y-4">
          {/* Info Banner */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <CreditCardIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-sm text-blue-800 dark:text-blue-200">Get your API Keys</h4>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                  1. Go to <a href="https://dashboard.razorpay.com/app/keys" target="_blank" rel="noopener noreferrer" className="underline">Razorpay Dashboard</a><br />
                  2. Navigate to Settings → API Keys<br />
                  3. Generate new keys or copy existing ones
                </p>
              </div>
            </div>
          </div>

          {/* Configuration Form */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
              API Configuration
            </h2>

            <div className="space-y-3">
              {/* Test Mode Toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div>
                  <label className="font-medium text-sm text-gray-900 dark:text-white">Test Mode</label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Use test credentials for development</p>
                </div>
                <button
                  onClick={() => setConfig({ ...config, testMode: !config.testMode })}
                  className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${
                    config.testMode ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    config.testMode ? 'translate-x-1' : 'translate-x-5'
                  }`} />
                </button>
              </div>
              <p className="text-xs text-gray-500 -mt-1">
                {config.testMode ? 'Using TEST mode - no real payments will be processed' : 'Using LIVE mode - real payments will be processed'}
              </p>

              {/* Key ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Key ID *</label>
                <input
                  type="text"
                  value={config.keyId}
                  onChange={(e) => setConfig({ ...config, keyId: e.target.value })}
                  placeholder={config.testMode ? 'rzp_test_xxxxxxxxxx' : 'rzp_live_xxxxxxxxxx'}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-0.5">Starts with rzp_test_ (test) or rzp_live_ (production)</p>
              </div>

              {/* Key Secret */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Key Secret *</label>
                <div className="relative">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={config.keySecret}
                    onChange={(e) => setConfig({ ...config, keySecret: e.target.value })}
                    placeholder="Enter your Key Secret"
                    className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showSecret ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Webhook Secret (optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Webhook Secret <span className="text-gray-400 font-normal text-xs">(optional)</span>
                </label>
                <input
                  type="password"
                  value={config.webhookSecret || ''}
                  onChange={(e) => setConfig({ ...config, webhookSecret: e.target.value })}
                  placeholder="Enter webhook secret for signature verification"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="mt-4">
              <button
                onClick={saveConfig}
                disabled={saving}
                className="px-5 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save Settings'
                )}
              </button>
            </div>
          </div>

          {/* Features */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Available Features</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {[
                { name: 'One-time Payments', description: 'Collect via checkout' },
                { name: 'Payment Links', description: 'Share via SMS/WhatsApp' },
                { name: 'Subscriptions', description: 'Recurring payments & EMIs' },
                { name: 'Payment Analytics', description: 'Track success rates' },
                { name: 'Auto-notifications', description: 'Send receipts auto' },
                { name: 'Refunds', description: 'Process from dashboard' },
              ].map((feature) => (
                <div key={feature.name} className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <CheckCircleIcon className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-xs text-gray-900 dark:text-white">{feature.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Test Connection Tab */}
      {activeTab === 'test' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <ArrowPathIcon className="w-5 h-5 text-blue-500" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Test Connection</h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Verify your Razorpay configuration by creating a test order
          </p>

          {!config.isConfigured && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2">
                <ExclamationTriangleIcon className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <p className="text-xs text-yellow-700 dark:text-yellow-300">
                  Please configure and save your Razorpay API keys first.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-3 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Test Amount (INR)</label>
              <div className="flex items-center gap-2">
                <CurrencyRupeeIcon className="w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  placeholder="100"
                  value={testAmount}
                  onChange={(e) => setTestAmount(e.target.value)}
                  min="1"
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Creates a test order (no actual payment)</p>
            </div>

            <button
              onClick={testConnection}
              disabled={testing || !config.isConfigured}
              className="w-full px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {testing ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Testing...
                </>
              ) : (
                <>
                  <ArrowPathIcon className="w-4 h-4" />
                  Test Connection
                </>
              )}
            </button>

            {testResult && (
              <div className={`p-3 rounded-lg ${
                testResult.success
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
              }`}>
                <div className="flex items-start gap-2">
                  {testResult.success ? (
                    <CheckCircleIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <XCircleIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
                  )}
                  <div>
                    <h4 className={`font-medium text-sm ${testResult.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                      {testResult.success ? 'Connection Successful!' : 'Connection Failed'}
                    </h4>
                    <p className={`text-xs mt-0.5 ${testResult.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                      {testResult.message}
                    </p>
                    {testResult.orderId && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">Test Order ID: {testResult.orderId}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Webhooks Tab */}
      {activeTab === 'webhooks' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <LinkIcon className="w-5 h-5 text-blue-500" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Webhook Configuration</h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Set up webhooks to receive real-time payment notifications
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Your Webhook URL</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/api/payments/webhook`}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/api/payments/webhook`);
                    toast.success('Webhook URL copied!');
                  }}
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <h4 className="font-medium text-sm text-blue-800 dark:text-blue-200 mb-1">Setup Instructions</h4>
              <ol className="list-decimal ml-4 text-xs text-blue-700 dark:text-blue-300 space-y-0.5">
                <li>Go to Razorpay Dashboard → Settings → Webhooks</li>
                <li>Click "Add New Webhook"</li>
                <li>Paste the webhook URL above</li>
                <li>Select events: payment.captured, payment.failed</li>
                <li>Copy the webhook secret and add it in API Keys tab</li>
              </ol>
            </div>

            <div>
              <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-2">Required Events</h4>
              <div className="flex flex-wrap gap-1.5">
                {['payment.captured', 'payment.failed', 'payment.authorized', 'refund.created'].map((event) => (
                  <span key={event} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-full">
                    {event}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
