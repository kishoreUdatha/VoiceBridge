/**
 * Integration Settings Page
 * Connect CRM, configure webhooks, and map data fields
 */

import React from 'react';
import {
  ArrowLeft,
  Cloud,
  Webhook,
  Database,
  FileText,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useIntegrationSettings } from './hooks';
import {
  CRMSection,
  WebhookSection,
  FieldMappingSection,
  KnowledgeBaseSection,
} from './components';
import { ActiveSection } from './integration-settings.types';

const TABS: { id: ActiveSection; label: string; icon: typeof Cloud }[] = [
  { id: 'crm', label: 'CRM Connections', icon: Cloud },
  { id: 'webhook', label: 'Webhooks & APIs', icon: Webhook },
  { id: 'field-mapping', label: 'Field Mapping', icon: Database },
  { id: 'knowledge', label: 'Knowledge Base', icon: FileText },
];

const IntegrationSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    activeSection,
    setActiveSection,
    saving,
    testingConnection,
    crmIntegrations,
    showApiKey,
    setShowApiKey,
    customEndpoints,
    newEndpoint,
    setNewEndpoint,
    fieldMappings,
    setFieldMappings,
    inboundWebhookUrl,
    webhookSecret,
    connectCRM,
    disconnectCRM,
    testConnection,
    addCustomEndpoint,
    deleteEndpoint,
    testEndpoint,
    saveFieldMappings,
    addFieldMapping,
    removeFieldMapping,
  } = useIntegrationSettings();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Integration Settings</h1>
            <p className="text-sm text-gray-500">
              Connect your CRM, configure webhooks, and map data fields
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl p-6">
        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-6 bg-white p-1 rounded-lg border border-gray-200">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                activeSection === tab.id
                  ? 'bg-teal-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Section Content */}
        {activeSection === 'crm' && (
          <CRMSection
            crmIntegrations={crmIntegrations}
            testingConnection={testingConnection}
            onConnect={connectCRM}
            onDisconnect={disconnectCRM}
            onTest={testConnection}
          />
        )}

        {activeSection === 'webhook' && (
          <WebhookSection
            inboundWebhookUrl={inboundWebhookUrl}
            webhookSecret={webhookSecret}
            showApiKey={showApiKey}
            setShowApiKey={setShowApiKey}
            customEndpoints={customEndpoints}
            newEndpoint={newEndpoint}
            setNewEndpoint={setNewEndpoint}
            testingConnection={testingConnection}
            saving={saving}
            onAddEndpoint={addCustomEndpoint}
            onDeleteEndpoint={deleteEndpoint}
            onTestEndpoint={testEndpoint}
          />
        )}

        {activeSection === 'field-mapping' && (
          <FieldMappingSection
            fieldMappings={fieldMappings}
            setFieldMappings={setFieldMappings}
            saving={saving}
            onSave={saveFieldMappings}
            onAdd={addFieldMapping}
            onRemove={removeFieldMapping}
          />
        )}

        {activeSection === 'knowledge' && <KnowledgeBaseSection />}
      </div>
    </div>
  );
};

export default IntegrationSettingsPage;
