/**
 * CRM Integration Components
 */

import React from 'react';
import { Link } from 'react-router-dom';
import {
  CircleStackIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  PlusIcon,
  TrashIcon,
  ClipboardDocumentIcon,
  ExclamationTriangleIcon,
  Cog6ToothIcon,
  LinkIcon,
  KeyIcon,
  ShieldCheckIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import { CRMConfig, CRMType, CRMFormData } from '../crm-integration.types';
import { CRM_LOGOS, CRM_DESCRIPTIONS, WEBHOOK_PLACEHOLDERS, formatCRMName } from '../crm-integration.constants';

// Loading State
export const CRMLoadingState: React.FC = () => (
  <div className="flex items-center justify-center h-64">
    <ArrowPathIcon className="w-8 h-8 text-indigo-600 animate-spin" />
  </div>
);

// Page Header
export const CRMPageHeader: React.FC = () => (
  <div className="mb-8">
    <div className="flex items-center gap-4 mb-2">
      <Link to="/settings" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
        <ArrowLeftIcon className="w-5 h-5 text-slate-600" />
      </Link>
      <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
        <CircleStackIcon className="w-6 h-6 text-white" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900">CRM Integrations</h1>
    </div>
    <p className="text-gray-600 ml-[88px]">
      Connect external CRMs to automatically sync leads from voice conversations
    </p>
  </div>
);

// Integration Card
interface IntegrationCardProps {
  config: CRMConfig;
  testing: string | null;
  onTest: (config: CRMConfig) => void;
  onEdit: (config: CRMConfig) => void;
  onDelete: (config: CRMConfig) => void;
  onToggle: (config: CRMConfig) => void;
  onCopy: (text: string) => void;
}

export const IntegrationCard: React.FC<IntegrationCardProps> = ({
  config,
  testing,
  onTest,
  onEdit,
  onDelete,
  onToggle,
  onCopy,
}) => (
  <div
    className={`bg-white rounded-2xl border-2 transition-all duration-200 ${
      config.isActive
        ? 'border-green-200 shadow-lg shadow-green-500/10'
        : 'border-gray-200 opacity-75'
    }`}
  >
    <div className="p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {config.type !== 'CUSTOM' && CRM_LOGOS[config.type] ? (
            <img
              src={CRM_LOGOS[config.type]}
              alt={config.type}
              className="w-10 h-10 object-contain"
            />
          ) : (
            <div className="w-10 h-10 bg-gradient-to-br from-gray-600 to-gray-800 rounded-lg flex items-center justify-center">
              <LinkIcon className="w-5 h-5 text-white" />
            </div>
          )}
          <div>
            <h3 className="font-semibold text-gray-900">{config.name}</h3>
            <span className="text-xs text-gray-500 uppercase">{config.type}</span>
          </div>
        </div>
        <button
          onClick={() => onToggle(config)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            config.isActive ? 'bg-green-500' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              config.isActive ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        {config.isActive ? (
          <>
            <CheckCircleIcon className="w-4 h-4 text-green-500" />
            <span className="text-sm text-green-600">Connected</span>
          </>
        ) : (
          <>
            <XCircleIcon className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-500">Disabled</span>
          </>
        )}
        {config.lastSyncAt && (
          <span className="text-xs text-gray-400 ml-auto">
            Last sync: {new Date(config.lastSyncAt).toLocaleDateString()}
          </span>
        )}
      </div>

      {config.lastSyncError && (
        <div className="mb-4 p-2 bg-red-50 rounded-lg flex items-start gap-2">
          <ExclamationTriangleIcon className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <span className="text-xs text-red-600">{config.lastSyncError}</span>
        </div>
      )}

      <div className="mb-4 p-2 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 truncate max-w-[200px]">
            {config.webhookUrl}
          </span>
          <button
            onClick={() => onCopy(config.webhookUrl)}
            className="p-1 hover:bg-gray-200 rounded"
          >
            <ClipboardDocumentIcon className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onTest(config)}
          disabled={testing === config.id || !config.isActive}
          className="flex-1 px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {testing === config.id ? (
            <ArrowPathIcon className="w-4 h-4 animate-spin mx-auto" />
          ) : (
            'Test'
          )}
        </button>
        <button
          onClick={() => onEdit(config)}
          className="flex-1 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Configure
        </button>
        <button
          onClick={() => onDelete(config)}
          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <TrashIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  </div>
);

// Active Integrations Section
interface ActiveIntegrationsProps {
  configs: CRMConfig[];
  testing: string | null;
  onTest: (config: CRMConfig) => void;
  onEdit: (config: CRMConfig) => void;
  onDelete: (config: CRMConfig) => void;
  onToggle: (config: CRMConfig) => void;
  onCopy: (text: string) => void;
}

export const ActiveIntegrations: React.FC<ActiveIntegrationsProps> = ({
  configs,
  testing,
  onTest,
  onEdit,
  onDelete,
  onToggle,
  onCopy,
}) => {
  if (configs.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Integrations</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {configs.map((config) => (
          <IntegrationCard
            key={config.id}
            config={config}
            testing={testing}
            onTest={onTest}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggle={onToggle}
            onCopy={onCopy}
          />
        ))}
      </div>
    </div>
  );
};

// CRM Option Button
interface CRMOptionProps {
  type: CRMType;
  onAdd: (type: CRMType) => void;
}

const CRM_HOVER_COLORS: Record<string, string> = {
  SALESFORCE: 'hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/10',
  HUBSPOT: 'hover:border-orange-400 hover:shadow-xl hover:shadow-orange-500/10',
  ZOHO: 'hover:border-red-400 hover:shadow-xl hover:shadow-red-500/10',
  CUSTOM: 'hover:border-purple-400 hover:shadow-xl hover:shadow-purple-500/10',
};

const CRM_TEXT_COLORS: Record<string, string> = {
  SALESFORCE: 'group-hover:text-blue-600',
  HUBSPOT: 'group-hover:text-orange-600',
  ZOHO: 'group-hover:text-red-600',
  CUSTOM: 'group-hover:text-purple-600',
};

export const CRMOption: React.FC<CRMOptionProps> = ({ type, onAdd }) => (
  <button
    onClick={() => onAdd(type)}
    className={`group p-6 bg-white rounded-2xl border-2 ${
      type === 'CUSTOM' ? 'border-dashed border-gray-300' : 'border-gray-200'
    } ${CRM_HOVER_COLORS[type]} transition-all duration-300 text-left`}
  >
    {type !== 'CUSTOM' && CRM_LOGOS[type] ? (
      <img
        src={CRM_LOGOS[type]}
        alt={type}
        className={`h-8 ${type === 'HUBSPOT' ? 'w-8' : ''} mb-4 object-contain`}
      />
    ) : (
      <div className="w-8 h-8 mb-4 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
        <PlusIcon className="w-5 h-5 text-white" />
      </div>
    )}
    <h3 className={`font-semibold text-gray-900 mb-1 ${CRM_TEXT_COLORS[type]} transition-colors`}>
      {formatCRMName(type)}
    </h3>
    <p className="text-sm text-gray-500">{CRM_DESCRIPTIONS[type]}</p>
  </button>
);

// Add Integration Section
interface AddIntegrationSectionProps {
  hasConfigs: boolean;
  onAdd: (type: CRMType) => void;
}

export const AddIntegrationSection: React.FC<AddIntegrationSectionProps> = ({
  hasConfigs,
  onAdd,
}) => (
  <div>
    <h2 className="text-lg font-semibold text-gray-900 mb-4">
      {hasConfigs ? 'Add Another Integration' : 'Connect Your CRM'}
    </h2>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <CRMOption type="SALESFORCE" onAdd={onAdd} />
      <CRMOption type="HUBSPOT" onAdd={onAdd} />
      <CRMOption type="ZOHO" onAdd={onAdd} />
      <CRMOption type="CUSTOM" onAdd={onAdd} />
    </div>
  </div>
);

// Info Section
export const InfoSection: React.FC = () => (
  <div className="mt-8 p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100">
    <div className="flex items-start gap-4">
      <div className="p-2 bg-indigo-100 rounded-lg">
        <ShieldCheckIcon className="w-6 h-6 text-indigo-600" />
      </div>
      <div>
        <h3 className="font-semibold text-gray-900 mb-2">How CRM Integration Works</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold">1</span>
            <span>Configure your external CRM webhook URL and API credentials</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold">2</span>
            <span>Map fields from voice conversations to your CRM fields</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold">3</span>
            <span>When a lead is created from a voice call, it's automatically synced to your CRM</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold">4</span>
            <span>Select this integration in your Voice Agent settings to enable auto-sync</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
);

// Configuration Modal
interface ConfigModalProps {
  show: boolean;
  selectedType: CRMType | null;
  selectedConfig: CRMConfig | null;
  formData: CRMFormData;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
  onFormChange: (updates: Partial<CRMFormData>) => void;
  onFieldMappingChange: (index: number, field: 'sourceField' | 'targetField', value: string) => void;
  onAddFieldMapping: () => void;
  onRemoveFieldMapping: (index: number) => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({
  show,
  selectedType,
  selectedConfig,
  formData,
  saving,
  onClose,
  onSave,
  onFormChange,
  onFieldMappingChange,
  onAddFieldMapping,
  onRemoveFieldMapping,
}) => {
  if (!show || !selectedType) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-4">
            {selectedType !== 'CUSTOM' && CRM_LOGOS[selectedType] ? (
              <img
                src={CRM_LOGOS[selectedType]}
                alt={selectedType}
                className="h-10 object-contain"
              />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <LinkIcon className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {selectedConfig ? 'Edit' : 'Configure'} {formatCRMName(selectedType)}
              </h2>
              <p className="text-sm text-gray-500">{CRM_DESCRIPTIONS[selectedType]}</p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="space-y-6">
            {/* Integration Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Integration Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => onFormChange({ name: e.target.value })}
                placeholder="e.g., Production Salesforce"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
              />
            </div>

            {/* Webhook URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <LinkIcon className="w-4 h-4 inline mr-1" />
                Webhook URL *
              </label>
              <input
                type="url"
                value={formData.webhookUrl}
                onChange={(e) => onFormChange({ webhookUrl: e.target.value })}
                placeholder={WEBHOOK_PLACEHOLDERS[selectedType] || WEBHOOK_PLACEHOLDERS.CUSTOM}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
              />
              <p className="mt-1 text-xs text-gray-500">
                The endpoint where lead data will be sent via POST request
              </p>
            </div>

            {/* API Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <KeyIcon className="w-4 h-4 inline mr-1" />
                API Key / Bearer Token (Optional)
              </label>
              <input
                type="password"
                value={formData.apiKey}
                onChange={(e) => onFormChange({ apiKey: e.target.value })}
                placeholder="Enter API key or access token"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
              />
              <p className="mt-1 text-xs text-gray-500">
                Will be sent as Authorization: Bearer header
              </p>
            </div>

            {/* Field Mappings */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  <Cog6ToothIcon className="w-4 h-4 inline mr-1" />
                  Field Mappings
                </label>
                <button
                  type="button"
                  onClick={onAddFieldMapping}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  + Add Field
                </button>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-xs font-medium text-gray-500 px-1">
                  <span>Source Field (Our System)</span>
                  <span>Target Field ({formatCRMName(selectedType)})</span>
                </div>
                {formData.fieldMappings.map((mapping, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={mapping.sourceField}
                      onChange={(e) => onFieldMappingChange(index, 'sourceField', e.target.value)}
                      placeholder="name"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <span className="text-gray-400">→</span>
                    <input
                      type="text"
                      value={mapping.targetField}
                      onChange={(e) => onFieldMappingChange(index, 'targetField', e.target.value)}
                      placeholder="Name"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => onRemoveFieldMapping(index)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Available source fields: name, email, phone, company, source, notes, qualification, sentiment
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving || !formData.name || !formData.webhookUrl}
            className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/25"
          >
            {saving ? (
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
            ) : selectedConfig ? (
              'Save Changes'
            ) : (
              'Create Integration'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
