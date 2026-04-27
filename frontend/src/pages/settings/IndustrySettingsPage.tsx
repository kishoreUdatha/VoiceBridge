/**
 * Industry Settings Page
 * Configure organization's industry for lead stage and field customization
 * Uses the dynamic industry system
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon,
  DocumentTextIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface Industry {
  slug: string;
  name: string;
  description?: string;
  icon?: string;
  color: string;
  isSystem: boolean;
  fieldCount: number;
  stageCount: number;
}

interface IndustryConfig {
  id: string;
  slug: string;
  name: string;
  description?: string;
  icon?: string;
  color: string;
  fields: Array<{
    key: string;
    label: string;
    fieldType: string;
    isRequired: boolean;
    groupName?: string;
  }>;
  stages: Array<{
    name: string;
    slug: string;
    color: string;
    journeyOrder: number;
    isDefault: boolean;
    isLostStage: boolean;
    autoSyncStatus?: string;
  }>;
}

interface CurrentIndustry {
  industry: {
    slug: string;
    name: string;
    description?: string;
    icon?: string;
    color: string;
    isSystem?: boolean;
    isActive?: boolean;
  };
  legacyIndustry?: string;
  config?: IndustryConfig;
}

export default function IndustrySettingsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [currentIndustry, setCurrentIndustry] = useState<CurrentIndustry | null>(null);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [previewConfig, setPreviewConfig] = useState<IndustryConfig | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'fields' | 'stages'>('stages');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [industriesRes, currentRes] = await Promise.all([
        api.get('/organization/industries'),
        api.get('/organization/industry'),
      ]);

      setIndustries(industriesRes.data.data || []);
      setCurrentIndustry(currentRes.data.data);
      setSelectedSlug(currentRes.data.data?.industry?.slug || null);

      if (currentRes.data.data?.config) {
        setPreviewConfig(currentRes.data.data.config);
      }
    } catch (error) {
      console.error('Failed to fetch industry data:', error);
      toast.error('Failed to load industry settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectIndustry = async (slug: string) => {
    if (slug === selectedSlug) return;

    setSelectedSlug(slug);
    setLoadingPreview(true);

    try {
      const response = await api.get(`/organization/industries/${slug}`);
      setPreviewConfig(response.data.data);
    } catch (error) {
      console.error('Failed to fetch industry preview:', error);
      toast.error('Failed to load industry preview');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleSave = async () => {
    if (!selectedSlug || selectedSlug === currentIndustry?.industry?.slug) {
      return;
    }

    setSaving(true);
    try {
      const response = await api.put('/organization/industry', {
        industrySlug: selectedSlug,
      });

      setCurrentIndustry(response.data.data);
      toast.success(`Industry changed to ${previewConfig?.name || selectedSlug}`);
    } catch (error: any) {
      console.error('Failed to change industry:', error);
      toast.error(error.response?.data?.message || 'Failed to change industry');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = selectedSlug && selectedSlug !== currentIndustry?.industry?.slug;

  const filteredIndustries = industries.filter(
    (ind) =>
      ind.name.toLowerCase().includes(search.toLowerCase()) ||
      ind.slug.toLowerCase().includes(search.toLowerCase()) ||
      ind.description?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-slate-200 rounded" />
          <div className="h-64 bg-slate-200 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Industry Settings</h1>
            <p className="text-sm text-slate-500">
              Configure your industry for customized lead fields and stages
            </p>
          </div>
        </div>

        {hasChanges && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setSelectedSlug(currentIndustry?.industry?.slug || null);
                setPreviewConfig(currentIndustry?.config || null);
              }}
              disabled={saving}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <>
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Industry Selection */}
        <div className="lg:col-span-5 space-y-4">
          {/* Current Industry Card */}
          {currentIndustry?.industry && (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-medium text-slate-500 uppercase mb-2">Current Industry</p>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${currentIndustry.industry.color}20` }}
                >
                  <span
                    className="text-lg font-bold"
                    style={{ color: currentIndustry.industry.color }}
                  >
                    {currentIndustry.industry.name[0]}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-slate-800">{currentIndustry.industry.name}</p>
                  <p className="text-xs text-slate-500">{currentIndustry.industry.slug}</p>
                </div>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search industries..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Industry List */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-medium text-slate-800">Available Industries</h3>
              <p className="text-xs text-slate-500 mt-1">
                Select an industry to see its configuration
              </p>
            </div>
            <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
              {filteredIndustries.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-sm">
                  No industries found
                </div>
              ) : (
                filteredIndustries.map((industry) => (
                  <button
                    key={industry.slug}
                    onClick={() => handleSelectIndustry(industry.slug)}
                    className={`w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 transition-colors ${
                      selectedSlug === industry.slug ? 'bg-primary-50' : ''
                    }`}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${industry.color}20` }}
                    >
                      <span
                        className="text-sm font-bold"
                        style={{ color: industry.color }}
                      >
                        {industry.name[0]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 truncate">{industry.name}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span>{industry.fieldCount} fields</span>
                        <span>{industry.stageCount} stages</span>
                        {industry.isSystem && (
                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                            System
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRightIcon
                      className={`w-4 h-4 transition-colors ${
                        selectedSlug === industry.slug ? 'text-primary-600' : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Preview */}
        <div className="lg:col-span-7 space-y-4">
          {/* Change Warning */}
          {hasChanges && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">Industry Change</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Changing from <strong>{currentIndustry?.industry?.name}</strong> to{' '}
                  <strong>{previewConfig?.name}</strong> will update your lead field templates and
                  stage configurations. Existing data will not be affected.
                </p>
              </div>
            </div>
          )}

          {/* Preview Card */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {previewConfig && (
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${previewConfig.color}20` }}
                    >
                      <span
                        className="text-lg font-bold"
                        style={{ color: previewConfig.color }}
                      >
                        {previewConfig.name[0]}
                      </span>
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-slate-800">
                      {previewConfig?.name || 'Select an industry'}
                    </h3>
                    {previewConfig?.description && (
                      <p className="text-xs text-slate-500">{previewConfig.description}</p>
                    )}
                  </div>
                </div>
                {loadingPreview && (
                  <ArrowPathIcon className="w-5 h-5 text-slate-400 animate-spin" />
                )}
              </div>
            </div>

            {previewConfig ? (
              <>
                {/* Tabs */}
                <div className="flex border-b border-slate-100">
                  <button
                    onClick={() => setActiveTab('stages')}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative ${
                      activeTab === 'stages'
                        ? 'text-primary-600'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Squares2X2Icon className="w-4 h-4" />
                    Stages ({previewConfig.stages.length})
                    {activeTab === 'stages' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600" />
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('fields')}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative ${
                      activeTab === 'fields'
                        ? 'text-primary-600'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <DocumentTextIcon className="w-4 h-4" />
                    Fields ({previewConfig.fields.length})
                    {activeTab === 'fields' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600" />
                    )}
                  </button>
                </div>

                {/* Content */}
                <div className="p-4 max-h-96 overflow-y-auto">
                  {activeTab === 'stages' && (
                    <div className="space-y-2">
                      {previewConfig.stages
                        .sort((a, b) => a.journeyOrder - b.journeyOrder)
                        .map((stage, index) => (
                          <div
                            key={stage.slug}
                            className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                            style={{ borderLeft: `4px solid ${stage.color}` }}
                          >
                            <span className="text-xs font-medium text-slate-400 w-6">
                              {index + 1}
                            </span>
                            <span className="font-medium text-slate-800">{stage.name}</span>
                            <div className="flex items-center gap-1 ml-auto">
                              {stage.isDefault && (
                                <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                                  Default
                                </span>
                              )}
                              {stage.isLostStage && (
                                <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-700 rounded">
                                  Lost
                                </span>
                              )}
                              {stage.autoSyncStatus === 'WON' && (
                                <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                                  Won
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  {activeTab === 'fields' && (
                    <div className="space-y-2">
                      {previewConfig.fields.map((field) => (
                        <div
                          key={field.key}
                          className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-slate-800">{field.label}</p>
                            <p className="text-xs text-slate-500">
                              {field.key} &bull; {field.fieldType}
                              {field.groupName && ` &bull; ${field.groupName}`}
                            </p>
                          </div>
                          {field.isRequired && (
                            <span className="px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded">
                              Required
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="p-12 text-center text-slate-500">
                <Squares2X2Icon className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="font-medium">No industry selected</p>
                <p className="text-sm mt-1">Select an industry from the list to preview</p>
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600">
            <span className="text-slate-400">💡</span>
            <span>
              Each industry has customized lead stages and fields. Choose the one that best matches
              your business to get the most relevant configuration.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
