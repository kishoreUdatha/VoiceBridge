import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowPathIcon,
  CheckIcon,
  XMarkIcon,
  PencilSquareIcon,
  ArrowUturnLeftIcon,
  InformationCircleIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import {
  tenantConfigService,
  TenantLabel,
  TenantConfiguration,
  DEFAULT_LABELS,
  AVAILABLE_MODULES,
} from '../../services/tenant-config.service';
import { INDUSTRY_INFO, IndustryType } from '../../services/industry-template.service';

export default function TenantLabelConfigPage() {
  const [config, setConfig] = useState<TenantConfiguration | null>(null);
  const [labels, setLabels] = useState<TenantLabel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ singular: string; plural: string }>({ singular: '', plural: '' });
  const [activeTab, setActiveTab] = useState<'labels' | 'modules' | 'branding'>('labels');
  const [selectedModules, setSelectedModules] = useState<string[]>([]);

  // Branding form state
  const [brandingForm, setBrandingForm] = useState({
    accentColor: '#4F46E5',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    dateFormat: 'DD/MM/YYYY',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [configData, labelsData] = await Promise.all([
        tenantConfigService.getTenantConfig(),
        tenantConfigService.getTenantLabels(),
      ]);
      setConfig(configData);
      setLabels(labelsData);
      setSelectedModules(configData.enabledModules || []);
      setBrandingForm({
        accentColor: configData.accentColor || '#4F46E5',
        currency: configData.currency || 'INR',
        timezone: configData.timezone || 'Asia/Kolkata',
        dateFormat: configData.dateFormat || 'DD/MM/YYYY',
      });
    } catch (error) {
      toast.error('Failed to load configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditLabel = (label: TenantLabel) => {
    setEditingLabel(label.entityKey);
    setEditForm({
      singular: label.singularLabel,
      plural: label.pluralLabel,
    });
  };

  const handleSaveLabel = async () => {
    if (!editingLabel) return;

    try {
      setIsSaving(true);
      await tenantConfigService.upsertLabel(editingLabel, {
        singularLabel: editForm.singular,
        pluralLabel: editForm.plural,
      });
      toast.success('Label updated successfully');

      // Reload labels
      const labelsData = await tenantConfigService.getTenantLabels();
      setLabels(labelsData);
      setEditingLabel(null);
    } catch (error) {
      toast.error('Failed to save label');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetLabel = async (entityKey: string) => {
    if (!window.confirm('Reset this label to default?')) return;

    try {
      await tenantConfigService.resetLabel(entityKey);
      toast.success('Label reset to default');

      // Reload labels
      const labelsData = await tenantConfigService.getTenantLabels();
      setLabels(labelsData);
    } catch (error) {
      toast.error('Failed to reset label');
    }
  };

  const handleResetAllLabels = async () => {
    if (!window.confirm('Reset ALL labels to defaults? This cannot be undone.')) return;

    try {
      await tenantConfigService.resetAllLabels();
      toast.success('All labels reset to defaults');

      // Reload labels
      const labelsData = await tenantConfigService.getTenantLabels();
      setLabels(labelsData);
    } catch (error) {
      toast.error('Failed to reset labels');
    }
  };

  const handleSaveModules = async () => {
    try {
      setIsSaving(true);
      await tenantConfigService.updateEnabledModules(selectedModules);
      toast.success('Modules updated successfully');
    } catch (error) {
      toast.error('Failed to save modules');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveBranding = async () => {
    try {
      setIsSaving(true);
      await tenantConfigService.updateTenantConfig(brandingForm);
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleModule = (moduleKey: string) => {
    setSelectedModules((prev) =>
      prev.includes(moduleKey)
        ? prev.filter((m) => m !== moduleKey)
        : [...prev, moduleKey]
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <ArrowPathIcon className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/settings" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeftIcon className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">CRM Customization</h1>
            <p className="text-slate-500 text-sm">
              Customize terminology, enable/disable modules, and configure branding
            </p>
          </div>
        </div>
        {config?.industry && config.industry !== 'CUSTOM' && (
          <div className="flex items-center gap-2 px-3 py-2 bg-primary-50 border border-primary-200 rounded-lg">
            <span className="text-sm text-primary-700">
              Industry: <strong>{INDUSTRY_INFO[config.industry as IndustryType]?.name || config.industry}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-6">
          {[
            { key: 'labels', label: 'Terminology' },
            { key: 'modules', label: 'Modules' },
            { key: 'branding', label: 'Branding & Regional' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`px-1 py-3 text-sm font-medium border-b-2 -mb-px ${
                activeTab === tab.key
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Labels Tab */}
      {activeTab === 'labels' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <InformationCircleIcon className="w-4 h-4" />
              <span>Customize how entities are named in your CRM</span>
            </div>
            <button
              onClick={handleResetAllLabels}
              className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
            >
              <ArrowUturnLeftIcon className="w-4 h-4" />
              Reset All
            </button>
          </div>

          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Entity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Singular</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Plural</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {labels.map((label) => {
                  const isEditing = editingLabel === label.entityKey;
                  const defaultLabel = DEFAULT_LABELS[label.entityKey];

                  return (
                    <tr key={label.entityKey} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-slate-900 capitalize">
                          {label.entityKey.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.singular}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, singular: e.target.value }))}
                            className="input py-1 px-2 text-sm w-32"
                            placeholder="Singular"
                          />
                        ) : (
                          <span className="text-sm text-slate-700">{label.singularLabel}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.plural}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, plural: e.target.value }))}
                            className="input py-1 px-2 text-sm w-32"
                            placeholder="Plural"
                          />
                        ) : (
                          <span className="text-sm text-slate-700">{label.pluralLabel}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {label.isDefault ? (
                          <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">Default</span>
                        ) : (
                          <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded text-xs">Custom</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={handleSaveLabel}
                              disabled={isSaving}
                              className="p-1 text-success-600 hover:text-success-700"
                            >
                              <CheckIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingLabel(null)}
                              className="p-1 text-slate-400 hover:text-slate-600"
                            >
                              <XMarkIcon className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEditLabel(label)}
                              className="p-1 text-slate-400 hover:text-primary-600"
                            >
                              <PencilSquareIcon className="w-4 h-4" />
                            </button>
                            {!label.isDefault && (
                              <button
                                onClick={() => handleResetLabel(label.entityKey)}
                                className="p-1 text-slate-400 hover:text-slate-600"
                                title="Reset to default"
                              >
                                <ArrowUturnLeftIcon className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modules Tab */}
      {activeTab === 'modules' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <InformationCircleIcon className="w-4 h-4" />
            <span>Enable or disable modules based on your business needs</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {AVAILABLE_MODULES.map((module) => {
              const isEnabled = selectedModules.includes(module.key);

              return (
                <div
                  key={module.key}
                  onClick={() => toggleModule(module.key)}
                  className={`p-3 border rounded-lg cursor-pointer transition-all ${
                    isEnabled
                      ? 'border-primary-300 bg-primary-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-slate-900">{module.name}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{module.description}</p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isEnabled ? 'bg-primary-500' : 'bg-slate-200'
                      }`}
                    >
                      {isEnabled && <CheckIcon className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={handleSaveModules}
              disabled={isSaving}
              className="btn btn-primary"
            >
              {isSaving ? 'Saving...' : 'Save Module Settings'}
            </button>
          </div>
        </div>
      )}

      {/* Branding Tab */}
      {activeTab === 'branding' && (
        <div className="space-y-6">
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Branding</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Accent Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={brandingForm.accentColor}
                    onChange={(e) => setBrandingForm((prev) => ({ ...prev, accentColor: e.target.value }))}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={brandingForm.accentColor}
                    onChange={(e) => setBrandingForm((prev) => ({ ...prev, accentColor: e.target.value }))}
                    className="input text-sm"
                    placeholder="#4F46E5"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Regional Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Currency
                </label>
                <select
                  value={brandingForm.currency}
                  onChange={(e) => setBrandingForm((prev) => ({ ...prev, currency: e.target.value }))}
                  className="input text-sm"
                >
                  <option value="INR">INR - Indian Rupee</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="AED">AED - UAE Dirham</option>
                  <option value="SGD">SGD - Singapore Dollar</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Timezone
                </label>
                <select
                  value={brandingForm.timezone}
                  onChange={(e) => setBrandingForm((prev) => ({ ...prev, timezone: e.target.value }))}
                  className="input text-sm"
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                  <option value="Europe/Paris">Europe/Paris (CET)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                  <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Date Format
                </label>
                <select
                  value={brandingForm.dateFormat}
                  onChange={(e) => setBrandingForm((prev) => ({ ...prev, dateFormat: e.target.value }))}
                  className="input text-sm"
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2024)</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2024)</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</option>
                  <option value="DD-MMM-YYYY">DD-MMM-YYYY (31-Dec-2024)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSaveBranding}
              disabled={isSaving}
              className="btn btn-primary"
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
