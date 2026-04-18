import { useState, useEffect } from 'react';
import {
  BoltIcon,
  ClipboardDocumentIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  TrashIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface ZapierSubscription {
  id: string;
  event: string;
  targetUrl: string;
  isActive: boolean;
  failureCount: number;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  createdAt: string;
}

interface Trigger {
  key: string;
  label: string;
  description: string;
}

interface Action {
  key: string;
  label: string;
  description: string;
  fields: { key: string; label: string; required: boolean }[];
}

export default function ZapierIntegrationPage() {
  const [subscriptions, setSubscriptions] = useState<ZapierSubscription[]>([]);
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [subsRes, triggersRes, actionsRes] = await Promise.all([
        api.get('/integrations/zapier/subscriptions'),
        api.get('/integrations/zapier/triggers'),
        api.get('/integrations/zapier/actions'),
      ]);
      setSubscriptions(subsRes.data);
      setTriggers(triggersRes.data);
      setActions(actionsRes.data);
    } catch (error) {
      console.error('Error fetching Zapier data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateApiKey = async () => {
    try {
      const response = await api.post('/integrations/zapier/webhook-token/generate');
      setApiKey(response.data.webhookToken);
      toast.success('API key generated successfully');
    } catch (error) {
      toast.error('Failed to generate API key');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const deleteSubscription = async (id: string) => {
    try {
      await api.delete(`/integrations/zapier/triggers/${id}`);
      setSubscriptions(subscriptions.filter((s) => s.id !== id));
      toast.success('Subscription deleted');
    } catch (error) {
      toast.error('Failed to delete subscription');
    }
  };

  const getEventLabel = (eventKey: string) => {
    const trigger = triggers.find((t) => t.key === eventKey);
    return trigger?.label || eventKey;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
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
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
            <BoltIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Zapier Integration</h1>
            <p className="text-sm text-gray-500">Connect MyLeadX with 5,000+ apps via Zapier</p>
          </div>
        </div>
        <a
          href="https://zapier.com"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
        >
          Open Zapier
        </a>
      </div>

      {/* Setup Instructions */}
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-6 border border-orange-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">How to Connect</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
              1
            </div>
            <div>
              <p className="font-medium text-gray-900">Generate API Key</p>
              <p className="text-sm text-gray-600">Create an API key below for Zapier authentication</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
              2
            </div>
            <div>
              <p className="font-medium text-gray-900">Create a Zap</p>
              <p className="text-sm text-gray-600">Search for MyLeadX in Zapier and create a new Zap</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
              3
            </div>
            <div>
              <p className="font-medium text-gray-900">Authenticate</p>
              <p className="text-sm text-gray-600">Enter your API key when prompted to connect</p>
            </div>
          </div>
        </div>
      </div>

      {/* API Key Section */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-medium">API Key</h2>
        </div>
        <div className="card-body">
          <p className="text-sm text-gray-600 mb-4">
            Generate an API key to authenticate your Zapier connection. Keep this key secure.
          </p>
          {apiKey ? (
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={apiKey}
                readOnly
                className="input flex-1 font-mono text-sm"
              />
              <button
                onClick={() => copyToClipboard(apiKey, 'API key')}
                className="btn btn-secondary"
              >
                <ClipboardDocumentIcon className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button onClick={generateApiKey} className="btn btn-primary">
              <BoltIcon className="w-5 h-5 mr-2" />
              Generate API Key
            </button>
          )}
          {apiKey && (
            <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
              <ExclamationTriangleIcon className="w-4 h-4" />
              Save this key now. It won't be shown again.
            </p>
          )}
        </div>
      </div>

      {/* Available Triggers */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-medium">Available Triggers</h2>
          <p className="text-sm text-gray-500">Events that can start a Zap</p>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {triggers.map((trigger) => (
              <div key={trigger.key} className="p-4 border rounded-lg hover:border-orange-300 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                    <BoltIcon className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{trigger.label}</p>
                    <p className="text-sm text-gray-500">{trigger.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Available Actions */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-medium">Available Actions</h2>
          <p className="text-sm text-gray-500">Actions Zapier can perform in MyLeadX</p>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {actions.map((action) => (
              <div key={action.key} className="p-4 border rounded-lg hover:border-orange-300 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                    <ArrowPathIcon className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{action.label}</p>
                    <p className="text-sm text-gray-500 mb-2">{action.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {action.fields.map((field) => (
                        <span
                          key={field.key}
                          className={`text-xs px-2 py-0.5 rounded ${
                            field.required
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {field.label}
                          {field.required && '*'}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active Subscriptions */}
      <div className="card">
        <div className="card-header flex justify-between items-center">
          <div>
            <h2 className="text-lg font-medium">Active Subscriptions</h2>
            <p className="text-sm text-gray-500">Webhooks registered by your Zaps</p>
          </div>
          <button onClick={fetchData} className="btn btn-secondary btn-sm">
            <ArrowPathIcon className="w-4 h-4 mr-1" />
            Refresh
          </button>
        </div>
        <div className="card-body">
          {subscriptions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <BoltIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No active Zapier subscriptions</p>
              <p className="text-sm">Create a Zap in Zapier to see subscriptions here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Event</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Last Success</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Failures</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Created</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((sub) => (
                    <tr key={sub.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <span className="font-medium text-gray-900">{getEventLabel(sub.event)}</span>
                        <p className="text-xs text-gray-500 truncate max-w-xs">{sub.targetUrl}</p>
                      </td>
                      <td className="py-3 px-4">
                        {sub.isActive ? (
                          <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                            <CheckCircleIcon className="w-4 h-4" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-600 text-sm">
                            <XCircleIcon className="w-4 h-4" />
                            Disabled
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {formatDate(sub.lastSuccessAt)}
                      </td>
                      <td className="py-3 px-4">
                        {sub.failureCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-amber-600 text-sm">
                            <ExclamationTriangleIcon className="w-4 h-4" />
                            {sub.failureCount}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">0</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(sub.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => deleteSubscription(sub.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                          title="Delete subscription"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Use Cases */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-medium">Popular Use Cases</h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                title: 'Lead to Google Sheets',
                description: 'Automatically add new leads to a Google Sheet for reporting',
                apps: ['MyLeadX', 'Google Sheets'],
              },
              {
                title: 'Lead to Slack',
                description: 'Get instant Slack notifications when new leads come in',
                apps: ['MyLeadX', 'Slack'],
              },
              {
                title: 'Form to Lead',
                description: 'Create leads from Google Forms, Typeform, or JotForm submissions',
                apps: ['Google Forms', 'MyLeadX'],
              },
              {
                title: 'Calendar Integration',
                description: 'Sync appointments with Google Calendar or Calendly',
                apps: ['MyLeadX', 'Google Calendar'],
              },
              {
                title: 'Email Follow-up',
                description: 'Send automated emails via Mailchimp when leads reach stages',
                apps: ['MyLeadX', 'Mailchimp'],
              },
              {
                title: 'CRM Sync',
                description: 'Two-way sync leads with Salesforce or HubSpot',
                apps: ['MyLeadX', 'Salesforce'],
              },
            ].map((useCase, index) => (
              <div key={index} className="p-4 border rounded-lg bg-gray-50">
                <p className="font-medium text-gray-900 mb-1">{useCase.title}</p>
                <p className="text-sm text-gray-500 mb-3">{useCase.description}</p>
                <div className="flex items-center gap-2">
                  {useCase.apps.map((app, i) => (
                    <span key={i}>
                      <span className="text-xs bg-white border px-2 py-1 rounded">{app}</span>
                      {i < useCase.apps.length - 1 && (
                        <span className="text-gray-400 mx-1">→</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
