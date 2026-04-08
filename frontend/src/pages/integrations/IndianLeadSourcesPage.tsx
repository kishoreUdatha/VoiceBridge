/**
 * Indian Lead Sources Integration Page
 * Professional UI for configuring lead source integrations
 */

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Phone,
  MessageSquare,
  Globe,
  Settings,
  Check,
  X,
  RefreshCw,
  ExternalLink,
  Copy,
  AlertCircle,
  Zap,
  Home,
  ShieldCheck,
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface IntegrationConfig {
  id?: string;
  isActive: boolean;
  webhookUrl?: string;
  webhookToken?: string;
  totalLeadsReceived?: number;
  lastLeadAt?: string;
}

interface RealEstateConfig {
  id?: string;
  platform: string;
  platformName?: string;
  isActive: boolean;
  webhookUrl?: string;
  webhookToken?: string;
  hasApiKey?: boolean;
  hasSecretKey?: boolean;
  totalLeadsReceived?: number;
  lastLeadAt?: string;
}

interface IntegrationCard {
  key: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  apiPath: string;
  helpUrl?: string;
  fields: { key: string; label: string; type: string; required?: boolean; placeholder?: string; help?: string }[];
}

const INTEGRATIONS: IntegrationCard[] = [
  {
    key: 'justdial',
    name: 'JustDial',
    description: 'Business enquiries',
    icon: <Phone className="w-5 h-5" />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    apiPath: '/integrations/justdial',
    helpUrl: 'https://www.justdial.com/cms/business-solutions',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: 'jd_api_xxxxxxxxxx' },
      { key: 'secretKey', label: 'Secret Key', type: 'password', placeholder: 'Optional - for verification' },
    ],
  },
  {
    key: 'indiamart',
    name: 'IndiaMART',
    description: 'B2B lead manager',
    icon: <Building2 className="w-5 h-5" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    apiPath: '/integrations/indiamart',
    helpUrl: 'https://seller.indiamart.com/leadmanager/',
    fields: [
      { key: 'mobileNumber', label: 'Registered Mobile', type: 'tel', required: true, placeholder: '+91 98765 43210' },
      { key: 'crmKey', label: 'CRM API Key', type: 'password', required: true, placeholder: 'im_crm_xxxxxxxxxx' },
      { key: 'syncInterval', label: 'Sync Interval (minutes)', type: 'number', placeholder: '15' },
    ],
  },
  {
    key: 'sulekha',
    name: 'Sulekha',
    description: 'Local services',
    icon: <Globe className="w-5 h-5" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    apiPath: '/integrations/sulekha',
    helpUrl: 'https://www.sulekha.com/business-listing',
    fields: [
      { key: 'partnerId', label: 'Partner ID', type: 'text', required: true, placeholder: 'SUL-XXXXXX' },
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  {
    key: 'tawkto',
    name: 'Tawk.to',
    description: 'Live chat leads',
    icon: <MessageSquare className="w-5 h-5" />,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
    apiPath: '/integrations/tawkto',
    helpUrl: 'https://www.tawk.to/knowledgebase/',
    fields: [
      { key: 'propertyId', label: 'Property ID', type: 'text', required: true },
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'webhookSecret', label: 'Webhook Secret', type: 'password' },
    ],
  },
];

const REALESTATE_PLATFORMS = [
  { key: 'ACRES_99', name: '99Acres', color: 'text-red-600', bgColor: 'bg-red-100', icon: Home },
  { key: 'MAGICBRICKS', name: 'MagicBricks', color: 'text-purple-600', bgColor: 'bg-purple-100', icon: Building2 },
  { key: 'HOUSING', name: 'Housing.com', color: 'text-teal-600', bgColor: 'bg-teal-100', icon: Home },
];

export const IndianLeadSourcesPage: React.FC = () => {
  const [configs, setConfigs] = useState<Record<string, IntegrationConfig>>({});
  const [realEstateConfigs, setRealEstateConfigs] = useState<Record<string, RealEstateConfig>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  const [selectedRealEstate, setSelectedRealEstate] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [realEstateFormData, setRealEstateFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    loadConfigs();
    loadRealEstateConfigs();
  }, []);

  const loadConfigs = async () => {
    for (const integration of INTEGRATIONS) {
      try {
        const response = await api.get(`${integration.apiPath}/config`);
        if (response.data.success) {
          setConfigs(prev => ({ ...prev, [integration.key]: response.data.data }));
        }
      } catch (error) {}
    }
  };

  const loadRealEstateConfigs = async () => {
    try {
      const response = await api.get('/integrations/realestate/config');
      if (response.data.success && response.data.data) {
        const configMap: Record<string, RealEstateConfig> = {};
        for (const config of response.data.data) {
          configMap[config.platform] = config;
        }
        setRealEstateConfigs(configMap);
      }
    } catch (error) {}
  };

  const handleSaveConfig = async (integration: IntegrationCard) => {
    setLoading(prev => ({ ...prev, [integration.key]: true }));
    try {
      const response = await api.post(`${integration.apiPath}/config`, formData[integration.key]);
      if (response.data.success) {
        toast.success(`${integration.name} configured successfully`);
        setConfigs(prev => ({ ...prev, [integration.key]: response.data.data }));
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save');
    } finally {
      setLoading(prev => ({ ...prev, [integration.key]: false }));
    }
  };

  const handleToggleActive = async (integration: IntegrationCard, active: boolean) => {
    setLoading(prev => ({ ...prev, [integration.key]: true }));
    try {
      await api.post(`${integration.apiPath}/${active ? 'activate' : 'deactivate'}`);
      toast.success(`${integration.name} ${active ? 'activated' : 'deactivated'}`);
      setConfigs(prev => ({
        ...prev,
        [integration.key]: { ...prev[integration.key], isActive: active },
      }));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed');
    } finally {
      setLoading(prev => ({ ...prev, [integration.key]: false }));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const handleSaveRealEstateConfig = async (platformKey: string) => {
    setLoading(prev => ({ ...prev, [platformKey]: true }));
    try {
      const platform = platformKey.toLowerCase().replace('_', '');
      const response = await api.post(`/integrations/realestate/${platform}/config`, realEstateFormData[platformKey]);
      if (response.data.success) {
        toast.success('Configuration saved successfully');
        loadRealEstateConfigs();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save');
    } finally {
      setLoading(prev => ({ ...prev, [platformKey]: false }));
    }
  };

  const handleToggleRealEstateActive = async (platformKey: string, active: boolean) => {
    setLoading(prev => ({ ...prev, [platformKey]: true }));
    try {
      const platform = platformKey.toLowerCase().replace('_', '');
      await api.post(`/integrations/realestate/${platform}/${active ? 'activate' : 'deactivate'}`);
      toast.success(`${active ? 'Activated' : 'Deactivated'} successfully`);
      loadRealEstateConfigs();
    } catch (error: any) {
      toast.error('Failed to update');
    } finally {
      setLoading(prev => ({ ...prev, [platformKey]: false }));
    }
  };

  const handleRegenerateToken = async (platformKey: string) => {
    setLoading(prev => ({ ...prev, [`${platformKey}_token`]: true }));
    try {
      const platform = platformKey.toLowerCase().replace('_', '');
      await api.post(`/integrations/realestate/${platform}/regenerate-token`);
      toast.success('Webhook token regenerated');
      loadRealEstateConfigs();
    } catch (error: any) {
      toast.error('Failed to regenerate');
    } finally {
      setLoading(prev => ({ ...prev, [`${platformKey}_token`]: false }));
    }
  };

  // Stats
  const totalLeads = Object.values(configs).reduce((sum, c) => sum + (c.totalLeadsReceived || 0), 0) +
    Object.values(realEstateConfigs).reduce((sum, c) => sum + (c.totalLeadsReceived || 0), 0);
  const activeCount = Object.values(configs).filter(c => c.isActive).length +
    Object.values(realEstateConfigs).filter(c => c.isActive).length;

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Indian Lead Sources</h1>
              <p className="text-sm text-slate-500">Auto-capture leads from popular platforms</p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <span className="text-xl font-bold text-slate-900">{totalLeads}</span> leads captured
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-xl font-bold text-slate-900">{activeCount}</span> active
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Scrollable */}
        <div className="w-80 border-r border-slate-200 bg-white overflow-y-auto">
          {/* Lead Marketplaces */}
          <div className="p-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-1">Lead Marketplaces</h3>
            <div className="space-y-2">
              {INTEGRATIONS.map(integration => {
                const config = configs[integration.key];
                const isConfigured = !!config?.id;
                const isActive = config?.isActive;
                const isSelected = selectedIntegration === integration.key && !selectedRealEstate;

                return (
                  <div
                    key={integration.key}
                    onClick={() => {
                      setSelectedIntegration(integration.key);
                      setSelectedRealEstate(null);
                    }}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-primary-50 border-2 border-primary-300 shadow-sm'
                        : 'hover:bg-slate-50 border-2 border-transparent'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg ${integration.bgColor} flex items-center justify-center ${integration.color}`}>
                      {integration.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800">{integration.name}</span>
                        {isConfigured && (
                          <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-slate-300'}`} />
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {isConfigured ? `${config.totalLeadsReceived || 0} leads captured` : 'Not configured'}
                      </div>
                    </div>
                    {!isConfigured && (
                      <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100 mx-4" />

          {/* Real Estate */}
          <div className="p-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-1">Real Estate Portals</h3>
            <div className="space-y-2">
              {REALESTATE_PLATFORMS.map(platform => {
                const config = realEstateConfigs[platform.key];
                const isConfigured = !!config?.id;
                const isActive = config?.isActive;
                const isSelected = selectedRealEstate === platform.key;
                const Icon = platform.icon;

                return (
                  <div
                    key={platform.key}
                    onClick={() => {
                      setSelectedRealEstate(platform.key);
                      setSelectedIntegration(null);
                    }}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-primary-50 border-2 border-primary-300 shadow-sm'
                        : 'hover:bg-slate-50 border-2 border-transparent'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg ${platform.bgColor} flex items-center justify-center ${platform.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800">{platform.name}</span>
                        {isConfigured && (
                          <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-slate-300'}`} />
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {isConfigured ? `${config.totalLeadsReceived || 0} leads captured` : 'Not configured'}
                      </div>
                    </div>
                    {!isConfigured && (
                      <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Panel - Config Form */}
        <div className="flex-1 overflow-y-auto p-6">
          {selectedIntegration && !selectedRealEstate && (
            <ConfigPanel
              integration={INTEGRATIONS.find(i => i.key === selectedIntegration)!}
              config={configs[selectedIntegration]}
              formData={formData[selectedIntegration] || {}}
              loading={loading}
              onFormChange={(data) => setFormData(prev => ({ ...prev, [selectedIntegration]: data }))}
              onSave={() => handleSaveConfig(INTEGRATIONS.find(i => i.key === selectedIntegration)!)}
              onToggle={(active) => handleToggleActive(INTEGRATIONS.find(i => i.key === selectedIntegration)!, active)}
              onCopy={copyToClipboard}
            />
          )}

          {selectedRealEstate && (
            <RealEstatePanel
              platform={REALESTATE_PLATFORMS.find(p => p.key === selectedRealEstate)!}
              config={realEstateConfigs[selectedRealEstate]}
              formData={realEstateFormData[selectedRealEstate] || {}}
              loading={loading}
              onFormChange={(data) => setRealEstateFormData(prev => ({ ...prev, [selectedRealEstate]: data }))}
              onSave={() => handleSaveRealEstateConfig(selectedRealEstate)}
              onToggle={(active) => handleToggleRealEstateActive(selectedRealEstate, active)}
              onRegenerateToken={() => handleRegenerateToken(selectedRealEstate)}
              onCopy={copyToClipboard}
            />
          )}

          {!selectedIntegration && !selectedRealEstate && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <Settings className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-base font-semibold text-slate-700">Select an Integration</h3>
                <p className="text-sm text-slate-500 mt-1">Choose from the left panel to configure</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Config Panel Component
interface ConfigPanelProps {
  integration: IntegrationCard;
  config?: IntegrationConfig;
  formData: Record<string, any>;
  loading: Record<string, boolean>;
  onFormChange: (data: Record<string, any>) => void;
  onSave: () => void;
  onToggle: (active: boolean) => void;
  onCopy: (text: string) => void;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({
  integration,
  config,
  formData,
  loading,
  onFormChange,
  onSave,
  onToggle,
  onCopy,
}) => {
  const isConfigured = !!config?.id;

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl ${integration.bgColor} flex items-center justify-center ${integration.color}`}>
            {integration.icon}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{integration.name}</h3>
            <p className="text-sm text-slate-500">{integration.description}</p>
          </div>
        </div>
        {isConfigured && (
          <button
            onClick={() => onToggle(!config.isActive)}
            disabled={loading[integration.key]}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              config.isActive
                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                : 'bg-green-50 text-green-600 hover:bg-green-100'
            }`}
          >
            {config.isActive ? 'Deactivate' : 'Activate'}
          </button>
        )}
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        {integration.fields.map(field => (
          <div key={field.key}>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type={field.type}
              value={formData[field.key] || ''}
              onChange={(e) => onFormChange({ ...formData, [field.key]: e.target.value })}
              className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              placeholder={field.placeholder}
            />
            {field.help && (
              <p className="mt-1 text-xs text-slate-500">{field.help}</p>
            )}
          </div>
        ))}

        {/* Webhook URL */}
        {config?.webhookUrl && (
          <div className="pt-4 mt-4 border-t border-slate-200">
            <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-green-600" />
              Webhook URL
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 font-mono overflow-x-auto">
                {config.webhookUrl}
              </code>
              <button
                onClick={() => onCopy(config.webhookUrl!)}
                className="p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                title="Copy to clipboard"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Add this URL in your {integration.name} dashboard to receive leads automatically.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-200">
          <button
            onClick={onSave}
            disabled={loading[integration.key]}
            className="px-6 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            {loading[integration.key] ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Save Configuration
          </button>
          {integration.helpUrl && (
            <a
              href={integration.helpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary-600 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Setup Guide
            </a>
          )}
        </div>
      </div>

      {/* Stats */}
      {isConfigured && (
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <div className="text-2xl font-bold text-slate-900">{config.totalLeadsReceived || 0}</div>
            <div className="text-xs text-slate-500 mt-1">Total Leads</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <div className="text-sm font-semibold text-slate-700">
              {config.lastLeadAt ? new Date(config.lastLeadAt).toLocaleDateString() : 'Never'}
            </div>
            <div className="text-xs text-slate-500 mt-1">Last Lead</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <div className={`text-sm font-semibold ${config.isActive ? 'text-green-600' : 'text-slate-400'}`}>
              {config.isActive ? 'Active' : 'Inactive'}
            </div>
            <div className="text-xs text-slate-500 mt-1">Status</div>
          </div>
        </div>
      )}
    </div>
  );
};

// Real Estate Panel Component
interface RealEstatePanelProps {
  platform: typeof REALESTATE_PLATFORMS[0];
  config?: RealEstateConfig;
  formData: Record<string, any>;
  loading: Record<string, boolean>;
  onFormChange: (data: Record<string, any>) => void;
  onSave: () => void;
  onToggle: (active: boolean) => void;
  onRegenerateToken: () => void;
  onCopy: (text: string) => void;
}

const RealEstatePanel: React.FC<RealEstatePanelProps> = ({
  platform,
  config,
  formData,
  loading,
  onFormChange,
  onSave,
  onToggle,
  onRegenerateToken,
  onCopy,
}) => {
  const isConfigured = !!config?.id;
  const Icon = platform.icon;

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl ${platform.bgColor} flex items-center justify-center ${platform.color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{platform.name}</h3>
            <p className="text-sm text-slate-500">Property enquiry leads</p>
          </div>
        </div>
        {isConfigured && (
          <button
            onClick={() => onToggle(!config.isActive)}
            disabled={loading[platform.key]}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              config.isActive
                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                : 'bg-green-50 text-green-600 hover:bg-green-100'
            }`}
          >
            {config.isActive ? 'Deactivate' : 'Activate'}
          </button>
        )}
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">API Key</label>
          <input
            type="password"
            value={formData.apiKey || ''}
            onChange={(e) => onFormChange({ ...formData, apiKey: e.target.value })}
            className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            placeholder="Enter API key from portal dashboard"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Secret Key <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            type="password"
            value={formData.secretKey || ''}
            onChange={(e) => onFormChange({ ...formData, secretKey: e.target.value })}
            className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            placeholder="For webhook signature verification"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">City Filters</label>
            <input
              type="text"
              value={formData.cityFilters?.join(', ') || ''}
              onChange={(e) => onFormChange({ ...formData, cityFilters: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) })}
              className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              placeholder="Mumbai, Pune, Delhi"
            />
            <p className="mt-1 text-xs text-slate-500">Leave empty for all cities</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Project Filters</label>
            <input
              type="text"
              value={formData.projectFilters?.join(', ') || ''}
              onChange={(e) => onFormChange({ ...formData, projectFilters: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) })}
              className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              placeholder="Project A, Project B"
            />
            <p className="mt-1 text-xs text-slate-500">Leave empty for all projects</p>
          </div>
        </div>

        {/* Webhook URL */}
        {config?.webhookUrl && (
          <div className="pt-4 mt-4 border-t border-slate-200">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-green-600" />
                Webhook URL
              </label>
              <button
                onClick={onRegenerateToken}
                disabled={loading[`${platform.key}_token`]}
                className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 transition-colors"
              >
                {loading[`${platform.key}_token`] ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
                Regenerate Token
              </button>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 font-mono overflow-x-auto">
                {config.webhookUrl}
              </code>
              <button
                onClick={() => onCopy(config.webhookUrl!)}
                className="p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Configure this webhook URL in your {platform.name} dashboard.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="pt-4 mt-4 border-t border-slate-200">
          <button
            onClick={onSave}
            disabled={loading[platform.key]}
            className="px-6 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            {loading[platform.key] ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Save Configuration
          </button>
        </div>
      </div>

      {/* Stats */}
      {isConfigured && (
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <div className="text-2xl font-bold text-slate-900">{config.totalLeadsReceived || 0}</div>
            <div className="text-xs text-slate-500 mt-1">Total Leads</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <div className="text-sm font-semibold text-slate-700">
              {config.lastLeadAt ? new Date(config.lastLeadAt).toLocaleDateString() : 'Never'}
            </div>
            <div className="text-xs text-slate-500 mt-1">Last Lead</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <div className={`text-sm font-semibold ${config.isActive ? 'text-green-600' : 'text-slate-400'}`}>
              {config.isActive ? 'Active' : 'Inactive'}
            </div>
            <div className="text-xs text-slate-500 mt-1">Status</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IndianLeadSourcesPage;
