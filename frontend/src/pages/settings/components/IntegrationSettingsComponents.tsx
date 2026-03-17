/**
 * Integration Settings Components
 * CRMSection, WebhookSection, FieldMappingSection, KnowledgeBaseSection
 */

import React from 'react';
import {
  Check,
  Loader2,
  Plus,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  TestTube,
  FileText,
  ChevronRight,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import {
  CRMIntegration,
  CustomEndpoint,
  FieldMapping,
  NewEndpointForm,
} from '../integration-settings.types';
import {
  CRM_PROVIDERS,
  VOICEBRIDGE_FIELDS,
  TRIGGER_OPTIONS,
  copyToClipboard,
} from '../integration-settings.constants';

// CRM Section
interface CRMSectionProps {
  crmIntegrations: CRMIntegration[];
  testingConnection: string | null;
  onConnect: (provider: string) => void;
  onDisconnect: (integrationId: string) => void;
  onTest: (integrationId: string) => void;
}

export const CRMSection: React.FC<CRMSectionProps> = ({
  crmIntegrations,
  testingConnection,
  onConnect,
  onDisconnect,
  onTest,
}) => (
  <div className="space-y-6">
    {/* Info Banner */}
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
      <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
      <div>
        <p className="text-sm font-medium text-blue-800">Connect Your CRM</p>
        <p className="text-xs text-blue-700 mt-1">
          Connect your existing CRM to automatically sync leads, appointments, and call data. Your AI
          agents will have access to customer information during calls.
        </p>
      </div>
    </div>

    {/* CRM Provider Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {CRM_PROVIDERS.map((provider) => {
        const integration = crmIntegrations.find(
          (i) => i.type.toLowerCase() === provider.id
        );
        const isConnected = integration?.connected;

        return (
          <div
            key={provider.id}
            className={`bg-white border rounded-xl p-5 transition ${
              isConnected ? 'border-green-200 bg-green-50/30' : 'border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${provider.color} text-white text-2xl`}
                >
                  {provider.logo}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{provider.name}</h3>
                  <p className="text-xs text-gray-500">
                    {provider.authType === 'oauth'
                      ? 'OAuth 2.0'
                      : provider.authType === 'api_key'
                      ? 'API Key'
                      : 'Webhook'}
                  </p>
                </div>
              </div>
              {isConnected && (
                <span className="flex items-center gap-1 text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                  <CheckCircle size={12} />
                  Connected
                </span>
              )}
            </div>

            {isConnected ? (
              <div className="space-y-3">
                {integration?.lastSyncAt && (
                  <p className="text-xs text-gray-500">
                    Last synced: {new Date(integration.lastSyncAt).toLocaleString()}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => onTest(integration!.id)}
                    disabled={testingConnection === integration?.id}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center justify-center gap-2"
                  >
                    {testingConnection === integration?.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <TestTube size={14} />
                    )}
                    Test
                  </button>
                  <button
                    onClick={() => onDisconnect(integration!.id)}
                    className="px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => onConnect(provider.id)}
                className="w-full px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                Connect {provider.name}
              </button>
            )}
          </div>
        );
      })}
    </div>
  </div>
);

// Webhook Section
interface WebhookSectionProps {
  inboundWebhookUrl: string;
  webhookSecret: string;
  showApiKey: Record<string, boolean>;
  setShowApiKey: (value: Record<string, boolean>) => void;
  customEndpoints: CustomEndpoint[];
  newEndpoint: NewEndpointForm;
  setNewEndpoint: (endpoint: NewEndpointForm) => void;
  testingConnection: string | null;
  saving: boolean;
  onAddEndpoint: () => void;
  onDeleteEndpoint: (id: string) => void;
  onTestEndpoint: (id: string) => void;
}

export const WebhookSection: React.FC<WebhookSectionProps> = ({
  inboundWebhookUrl,
  webhookSecret,
  showApiKey,
  setShowApiKey,
  customEndpoints,
  newEndpoint,
  setNewEndpoint,
  testingConnection,
  saving,
  onAddEndpoint,
  onDeleteEndpoint,
  onTestEndpoint,
}) => (
  <div className="space-y-6">
    {/* Inbound Webhook */}
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Receive Data from Your System</h3>
      <p className="text-sm text-gray-500 mb-4">
        Send lead data to this webhook URL from your CRM or application. We'll create leads and make
        them available to your AI agents.
      </p>

      <div className="space-y-4">
        <div>
          <label className="text-sm text-gray-600 mb-1 block">Webhook URL</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={inboundWebhookUrl}
              readOnly
              className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
            />
            <button
              onClick={() => copyToClipboard(inboundWebhookUrl)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              <Copy size={18} />
            </button>
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-600 mb-1 block">Webhook Secret</label>
          <div className="flex gap-2">
            <input
              type={showApiKey['secret'] ? 'text' : 'password'}
              value={webhookSecret}
              readOnly
              className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
            />
            <button
              onClick={() => setShowApiKey({ ...showApiKey, secret: !showApiKey['secret'] })}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              {showApiKey['secret'] ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            <button
              onClick={() => copyToClipboard(webhookSecret)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              <Copy size={18} />
            </button>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs font-medium text-gray-700 mb-2">Example Request:</p>
          <pre className="text-xs text-gray-600 overflow-x-auto">
            {`POST ${inboundWebhookUrl}
Content-Type: application/json
X-Webhook-Secret: ${webhookSecret}

{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+919876543210",
  "email": "john@example.com",
  "company": "Acme Inc",
  "source": "Website",
  "notes": "Interested in premium plan"
}`}
          </pre>
        </div>
      </div>
    </div>

    {/* Outbound Webhooks */}
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Send Data to Your System</h3>
          <p className="text-sm text-gray-500">
            Configure webhooks to send call data, leads, and events to your system
          </p>
        </div>
      </div>

      {/* Existing Endpoints */}
      {customEndpoints.length > 0 && (
        <div className="space-y-3 mb-6">
          {customEndpoints.map((endpoint) => (
            <div key={endpoint.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div
                  className={`w-2 h-2 rounded-full ${endpoint.isActive ? 'bg-green-500' : 'bg-gray-400'}`}
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">{endpoint.name}</p>
                  <p className="text-xs text-gray-500">
                    {endpoint.method} {endpoint.url}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                  {TRIGGER_OPTIONS.find((t) => t.id === endpoint.trigger)?.label}
                </span>
                <button
                  onClick={() => onTestEndpoint(endpoint.id)}
                  disabled={testingConnection === endpoint.id}
                  className="p-2 hover:bg-gray-200 rounded-lg transition"
                >
                  {testingConnection === endpoint.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <TestTube size={16} />
                  )}
                </button>
                <button
                  onClick={() => onDeleteEndpoint(endpoint.id)}
                  className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add New Endpoint Form */}
      <div className="border border-gray-200 rounded-lg p-4 space-y-4">
        <h4 className="text-sm font-medium text-gray-900">Add New Webhook</h4>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-600 mb-1 block">Name</label>
            <input
              type="text"
              value={newEndpoint.name}
              onChange={(e) => setNewEndpoint({ ...newEndpoint, name: e.target.value })}
              placeholder="My CRM Webhook"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600 mb-1 block">Trigger</label>
            <select
              value={newEndpoint.trigger}
              onChange={(e) => setNewEndpoint({ ...newEndpoint, trigger: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
            >
              {TRIGGER_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-gray-600 mb-1 block">Method</label>
            <select
              value={newEndpoint.method}
              onChange={(e) =>
                setNewEndpoint({ ...newEndpoint, method: e.target.value as 'GET' | 'POST' | 'PUT' })
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
            >
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="GET">GET</option>
            </select>
          </div>
          <div className="col-span-3">
            <label className="text-xs text-gray-600 mb-1 block">Endpoint URL</label>
            <input
              type="url"
              value={newEndpoint.url}
              onChange={(e) => setNewEndpoint({ ...newEndpoint, url: e.target.value })}
              placeholder="https://your-system.com/api/webhook"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-600 mb-1 block">API Key / Bearer Token (optional)</label>
          <input
            type="password"
            value={newEndpoint.apiKey}
            onChange={(e) => setNewEndpoint({ ...newEndpoint, apiKey: e.target.value })}
            placeholder="Your API key for authentication"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </div>

        <button
          onClick={onAddEndpoint}
          disabled={saving || !newEndpoint.name || !newEndpoint.url}
          className="px-4 py-2 bg-teal-500 text-white text-sm font-medium rounded-lg hover:bg-teal-600 transition disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Add Webhook
        </button>
      </div>
    </div>
  </div>
);

// Field Mapping Section
interface FieldMappingSectionProps {
  fieldMappings: FieldMapping[];
  setFieldMappings: (mappings: FieldMapping[]) => void;
  saving: boolean;
  onSave: () => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}

export const FieldMappingSection: React.FC<FieldMappingSectionProps> = ({
  fieldMappings,
  setFieldMappings,
  saving,
  onSave,
  onAdd,
  onRemove,
}) => (
  <div className="space-y-6">
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Field Mapping</h3>
          <p className="text-sm text-gray-500">Map VoiceBridge fields to your CRM fields</p>
        </div>
        <button
          onClick={onSave}
          disabled={saving}
          className="px-4 py-2 bg-teal-500 text-white text-sm font-medium rounded-lg hover:bg-teal-600 transition disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          Save Mappings
        </button>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-5 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wider pb-2 border-b">
          <div className="col-span-2">VoiceBridge Field</div>
          <div className="text-center">\u2192</div>
          <div className="col-span-2">Your CRM Field</div>
        </div>

        {fieldMappings.map((mapping, index) => (
          <div key={index} className="grid grid-cols-5 gap-4 items-center">
            <div className="col-span-2">
              <select
                value={mapping.sourceField}
                onChange={(e) => {
                  const newMappings = [...fieldMappings];
                  newMappings[index].sourceField = e.target.value;
                  setFieldMappings(newMappings);
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
              >
                {VOICEBRIDGE_FIELDS.map((field) => (
                  <option key={field.id} value={field.id}>
                    {field.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-center text-gray-400">
              <ChevronRight size={20} />
            </div>
            <div className="col-span-2 flex gap-2">
              <input
                type="text"
                value={mapping.targetField}
                onChange={(e) => {
                  const newMappings = [...fieldMappings];
                  newMappings[index].targetField = e.target.value;
                  setFieldMappings(newMappings);
                }}
                placeholder="your_crm_field_name"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <button
                onClick={() => onRemove(index)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}

        <button
          onClick={onAdd}
          className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700 transition"
        >
          <Plus size={16} />
          Add Field Mapping
        </button>
      </div>
    </div>
  </div>
);

// Knowledge Base Section
export const KnowledgeBaseSection: React.FC = () => (
  <div className="space-y-6">
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Knowledge Base</h3>
      <p className="text-sm text-gray-500 mb-6">
        Upload documents, FAQs, and product information that your AI agents can reference during
        calls.
      </p>

      {/* Upload Area */}
      <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-teal-400 transition cursor-pointer">
        <FileText size={40} className="mx-auto text-gray-400 mb-4" />
        <p className="text-sm font-medium text-gray-900 mb-1">Drop files here or click to upload</p>
        <p className="text-xs text-gray-500">PDF, Word, Excel, TXT (max 10MB each)</p>
        <input
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
          className="hidden"
          onChange={(e) => {
            console.log('Files:', e.target.files);
          }}
        />
      </div>

      {/* Quick Links */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-left">
          <p className="text-sm font-medium text-gray-900">Import FAQs</p>
          <p className="text-xs text-gray-500">Add common Q&A pairs</p>
        </button>
        <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-left">
          <p className="text-sm font-medium text-gray-900">Sync from URL</p>
          <p className="text-xs text-gray-500">Import from website</p>
        </button>
        <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-left">
          <p className="text-sm font-medium text-gray-900">Connect Drive</p>
          <p className="text-xs text-gray-500">Google Drive / SharePoint</p>
        </button>
      </div>
    </div>
  </div>
);
