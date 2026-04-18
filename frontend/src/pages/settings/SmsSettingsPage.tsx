import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  CogIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  PhoneIcon,
  DocumentTextIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface DltConfig {
  senderId: string | null;
  entityId: string | null;
  templateId: string | null;
  isConfigured: boolean;
}

export default function SmsSettingsPage() {
  const [activeTab, setActiveTab] = useState<'config' | 'test' | 'templates'>('config');
  const [loading, setLoading] = useState(false);
  const [dltConfig, setDltConfig] = useState<DltConfig | null>(null);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Hello! This is a test SMS from your CRM system.');
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    fetchDltConfig();
  }, []);

  const fetchDltConfig = async () => {
    try {
      const response = await api.get('/exotel/sms/config');
      setDltConfig(response.data.data);
    } catch (error) {
      console.error('Failed to fetch DLT config:', error);
    }
  };

  const sendTestSms = async () => {
    if (!testPhone) {
      toast.error('Please enter a phone number');
      return;
    }

    setLoading(true);
    setTestResult(null);

    try {
      const response = await api.post('/exotel/sms', {
        to: testPhone,
        body: testMessage,
        smsType: 'transactional',
      });

      setTestResult(response.data);

      if (response.data.success) {
        toast.success('Test SMS sent successfully!');
      } else {
        toast.error(response.data.message || 'SMS failed');
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message;
      setTestResult({ success: false, error: errorMsg });
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <Link to="/settings" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <ArrowLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SMS Settings</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400 ml-12">
            Configure Exotel SMS with DLT compliance for India
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          dltConfig?.isConfigured
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
        }`}>
          {dltConfig?.isConfigured ? 'DLT Configured' : 'DLT Not Configured'}
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
            Test SMS
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'templates'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <DocumentTextIcon className="w-5 h-5" />
            Templates
          </button>
        </nav>
      </div>

      {/* Configuration Tab */}
      {activeTab === 'config' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <ChatBubbleLeftRightIcon className="w-6 h-6 text-blue-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                DLT Configuration Status
              </h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              DLT (Distributed Ledger Technology) registration is mandatory for sending SMS in India
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {dltConfig?.senderId ? (
                    <CheckCircleIcon className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircleIcon className="w-5 h-5 text-red-500" />
                  )}
                  <span className="font-medium text-gray-900 dark:text-white">Sender ID</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {dltConfig?.senderId || 'Not configured'}
                </p>
              </div>

              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {dltConfig?.entityId ? (
                    <CheckCircleIcon className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircleIcon className="w-5 h-5 text-red-500" />
                  )}
                  <span className="font-medium text-gray-900 dark:text-white">Entity ID</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {dltConfig?.entityId || 'Not configured'}
                </p>
              </div>

              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {dltConfig?.templateId ? (
                    <CheckCircleIcon className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircleIcon className="w-5 h-5 text-red-500" />
                  )}
                  <span className="font-medium text-gray-900 dark:text-white">Template ID</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {dltConfig?.templateId || 'Not configured'}
                </p>
              </div>
            </div>

            {!dltConfig?.isConfigured && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
                      DLT Registration Required
                    </h4>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      To send SMS in India, you must:
                    </p>
                    <ol className="list-decimal ml-4 mt-2 text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                      <li>Register on a DLT portal (Jio, Airtel, Vodafone, etc.)</li>
                      <li>Get your Entity ID approved</li>
                      <li>Register SMS templates and get Template IDs</li>
                      <li>Link templates in Exotel dashboard</li>
                      <li>Add credentials to your .env file</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Environment Variables</h4>
              <pre className="text-sm bg-gray-100 dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto text-gray-800 dark:text-gray-200">
{`# Add these to your .env file
EXOTEL_SMS_SENDER_ID=YOURID
EXOTEL_DLT_ENTITY_ID=1234567890123456789
EXOTEL_DLT_TEMPLATE_ID=1234567890123456789`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Test SMS Tab */}
      {activeTab === 'test' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <PaperAirplaneIcon className="w-6 h-6 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Send Test SMS
            </h2>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Test your Exotel SMS integration
          </p>

          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone Number
              </label>
              <div className="flex items-center gap-2">
                <PhoneIcon className="w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  placeholder="+919908787055"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Include country code (e.g., +91 for India)
              </p>
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {testMessage.length} characters
              </p>
            </div>

            <button
              onClick={sendTestSms}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
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
                  Send Test SMS
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
                      {testResult.success ? 'SMS Sent Successfully!' : 'SMS Failed'}
                    </h4>
                    <p className={`text-sm mt-1 ${
                      testResult.success
                        ? 'text-green-700 dark:text-green-300'
                        : 'text-red-700 dark:text-red-300'
                    }`}>
                      {testResult.success
                        ? `Message ID: ${testResult.data?.messageSid}`
                        : testResult.error || testResult.message}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <DocumentTextIcon className="w-6 h-6 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              SMS Templates
            </h2>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Manage your DLT-registered SMS templates
          </p>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                SMS templates must be registered on your DLT portal first, then linked in Exotel dashboard.
                Templates registered there will automatically be available for use.
              </p>
            </div>
          </div>

          <h4 className="font-medium text-gray-900 dark:text-white mb-4">Common Template Examples:</h4>

          <div className="space-y-4">
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900 dark:text-white">OTP Template</span>
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded">
                  Transactional
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your OTP is {'{#var#}'}. Valid for 10 minutes. Do not share with anyone. - COMPANY
              </p>
            </div>

            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900 dark:text-white">Appointment Reminder</span>
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded">
                  Transactional
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Dear {'{#var#}'}, your appointment is scheduled for {'{#var#}'}. Please arrive 15 mins early. - COMPANY
              </p>
            </div>

            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900 dark:text-white">Lead Follow-up</span>
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs rounded">
                  Promotional
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Hi {'{#var#}'}, thank you for your interest in {'{#var#}'}. Call us at {'{#var#}'} for more info. - COMPANY
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
