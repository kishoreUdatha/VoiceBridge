import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AcademicCapIcon,
  BuildingOfficeIcon,
  HeartIcon,
  ShieldCheckIcon,
  TruckIcon,
  ComputerDesktopIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  SparklesIcon,
  UserGroupIcon,
  CurrencyRupeeIcon,
  ChartBarIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import {
  industryTemplateService,
  IndustryTemplate,
  IndustryType,
  INDUSTRY_INFO,
} from '../../services/industry-template.service';
import { tenantConfigService, TenantConfiguration } from '../../services/tenant-config.service';

// Icon mapping
const iconMap: Record<string, any> = {
  AcademicCapIcon,
  BuildingOfficeIcon,
  HeartIcon,
  ShieldCheckIcon,
  TruckIcon,
  ComputerDesktopIcon,
  UserGroupIcon,
  CurrencyRupeeIcon,
  ChartBarIcon,
};

export default function IndustryTemplatesPage() {
  const [templates, setTemplates] = useState<IndustryTemplate[]>([]);
  const [currentConfig, setCurrentConfig] = useState<TenantConfiguration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<IndustryTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [templatesData, configData] = await Promise.all([
        industryTemplateService.getAllTemplates(),
        tenantConfigService.getTenantConfig(),
      ]);
      setTemplates(templatesData);
      setCurrentConfig(configData);
    } catch (error) {
      toast.error('Failed to load industry templates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyTemplate = async (template: IndustryTemplate) => {
    if (!window.confirm(`Apply "${template.name}" template? This will update your pipeline stages, custom fields, and labels.`)) {
      return;
    }

    try {
      setIsApplying(template.id);
      await industryTemplateService.applyTemplate(template.id);
      toast.success(`${template.name} template applied successfully!`);
      // Reload config to show updated state
      const configData = await tenantConfigService.getTenantConfig();
      setCurrentConfig(configData);
    } catch (error) {
      toast.error('Failed to apply template');
    } finally {
      setIsApplying(null);
    }
  };

  const handlePreview = (template: IndustryTemplate) => {
    setSelectedTemplate(template);
    setShowPreview(true);
  };

  const getIcon = (iconName?: string) => {
    if (!iconName) return SparklesIcon;
    return iconMap[iconName] || SparklesIcon;
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
        <div>
          <div className="flex items-center gap-3">
            <Link to="/settings" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <ArrowLeftIcon className="w-5 h-5 text-slate-600" />
            </Link>
            <h1 className="text-xl font-bold text-slate-900">Industry Templates</h1>
          </div>
          <p className="text-slate-500 text-sm ml-12">
            Choose an industry template to configure your CRM with pre-built pipelines, fields, and roles
          </p>
        </div>
        {currentConfig?.templateId && (
          <div className="flex items-center gap-2 px-3 py-2 bg-success-50 border border-success-200 rounded-lg">
            <CheckCircleIcon className="w-5 h-5 text-success-500" />
            <span className="text-sm text-success-700">
              Using: <strong>{templates.find(t => t.id === currentConfig.templateId)?.name || 'Custom'}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Current Configuration Summary */}
      {currentConfig && (
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Current Configuration</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-slate-500">Industry</p>
              <p className="text-sm font-medium">{INDUSTRY_INFO[currentConfig.industry]?.name || 'Custom'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Configured</p>
              <p className="text-sm font-medium">{currentConfig.isConfigured ? 'Yes' : 'No'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Currency</p>
              <p className="text-sm font-medium">{currentConfig.currency}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Timezone</p>
              <p className="text-sm font-medium">{currentConfig.timezone}</p>
            </div>
          </div>
        </div>
      )}

      {/* Popular Templates */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Popular Templates</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates
            .filter(t => t.isPopular)
            .map((template) => {
              const IconComponent = getIcon(template.icon);
              const industryInfo = INDUSTRY_INFO[template.industry];
              const isActive = currentConfig?.templateId === template.id;

              return (
                <div
                  key={template.id}
                  className={`card p-4 relative ${isActive ? 'ring-2 ring-primary-500' : ''}`}
                >
                  {isActive && (
                    <div className="absolute top-2 right-2">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-700 rounded-full text-xs">
                        <CheckIcon className="w-3 h-3" />
                        Active
                      </span>
                    </div>
                  )}

                  <div className="flex items-start gap-3 mb-3">
                    <div className={`p-2 rounded-lg ${industryInfo?.color || 'bg-slate-500'} bg-opacity-10`}>
                      <IconComponent className={`w-6 h-6 ${industryInfo?.color?.replace('bg-', 'text-') || 'text-slate-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-slate-900">{template.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{template.usageCount} organizations using</p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 mb-3 line-clamp-2">{template.description}</p>

                  {/* Quick Stats */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-600">
                      {(template.defaultPipeline as any[])?.length || 0} Stages
                    </span>
                    <span className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-600">
                      {(template.defaultFields as any[])?.length || 0} Fields
                    </span>
                    <span className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-600">
                      {(template.defaultRoles as any[])?.length || 0} Roles
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePreview(template)}
                      className="btn btn-secondary flex-1 py-1.5 text-xs"
                    >
                      Preview
                    </button>
                    <button
                      onClick={() => handleApplyTemplate(template)}
                      disabled={isApplying === template.id || isActive}
                      className="btn btn-primary flex-1 py-1.5 text-xs"
                    >
                      {isApplying === template.id ? (
                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                      ) : isActive ? (
                        'Applied'
                      ) : (
                        'Apply'
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* All Templates */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">All Templates</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {templates
            .filter(t => !t.isPopular)
            .map((template) => {
              const IconComponent = getIcon(template.icon);
              const industryInfo = INDUSTRY_INFO[template.industry];
              const isActive = currentConfig?.templateId === template.id;

              return (
                <div
                  key={template.id}
                  className={`card p-3 ${isActive ? 'ring-2 ring-primary-500' : ''}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1.5 rounded ${industryInfo?.color || 'bg-slate-500'} bg-opacity-10`}>
                      <IconComponent className={`w-4 h-4 ${industryInfo?.color?.replace('bg-', 'text-') || 'text-slate-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-slate-900 truncate">{template.name}</h3>
                    </div>
                    {isActive && (
                      <CheckIcon className="w-4 h-4 text-primary-500 flex-shrink-0" />
                    )}
                  </div>

                  <p className="text-xs text-slate-500 mb-2 line-clamp-2">{template.description}</p>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePreview(template)}
                      className="text-xs text-primary-600 hover:text-primary-700"
                    >
                      Preview
                    </button>
                    {!isActive && (
                      <button
                        onClick={() => handleApplyTemplate(template)}
                        disabled={isApplying === template.id}
                        className="text-xs text-primary-600 hover:text-primary-700 ml-auto"
                      >
                        {isApplying === template.id ? 'Applying...' : 'Apply'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && selectedTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{selectedTemplate.name}</h2>
              <button
                onClick={() => setShowPreview(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                &times;
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Description */}
              <div>
                <p className="text-sm text-slate-600">{selectedTemplate.description}</p>
              </div>

              {/* Labels */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Terminology</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(selectedTemplate.defaultLabels as Record<string, any>).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                      <span className="text-xs text-slate-500 capitalize">{key}</span>
                      <span className="text-xs font-medium">{value.singular} / {value.plural}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pipeline Stages */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Pipeline Stages</h3>
                <div className="flex flex-wrap gap-2">
                  {(selectedTemplate.defaultPipeline as any[])?.map((stage, idx) => (
                    <div
                      key={idx}
                      className="px-2 py-1 rounded text-xs font-medium text-white"
                      style={{ backgroundColor: stage.color }}
                    >
                      {idx + 1}. {stage.name}
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Fields */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Custom Fields</h3>
                <div className="space-y-1">
                  {(selectedTemplate.defaultFields as any[])?.map((field, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded text-xs">
                      <span className="font-medium">{field.label}</span>
                      <span className="text-slate-500">{field.type}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Roles */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Default Roles</h3>
                <div className="space-y-2">
                  {(selectedTemplate.defaultRoles as any[])?.map((role, idx) => (
                    <div key={idx} className="p-2 bg-slate-50 rounded">
                      <p className="text-sm font-medium">{role.name}</p>
                      {role.description && (
                        <p className="text-xs text-slate-500">{role.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Apply Button */}
              <div className="pt-4 border-t border-slate-200">
                <button
                  onClick={() => {
                    handleApplyTemplate(selectedTemplate);
                    setShowPreview(false);
                  }}
                  disabled={isApplying === selectedTemplate.id || currentConfig?.templateId === selectedTemplate.id}
                  className="btn btn-primary w-full"
                >
                  {currentConfig?.templateId === selectedTemplate.id
                    ? 'Already Applied'
                    : isApplying === selectedTemplate.id
                    ? 'Applying...'
                    : 'Apply This Template'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
