import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  EllipsisHorizontalIcon,
  PlayIcon,
  PencilIcon,
  DocumentDuplicateIcon,
  RocketLaunchIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../../services/api';
import TemplatePreviewModal from './TemplatePreviewModal';

interface VoiceTemplate {
  id: string;
  name: string;
  slug: string;
  description: string;
  industry: string;
  category: string;
  icon: string;
  color: string;
  language: string;
  voiceId?: string;
  greeting?: string;
  greetings?: Record<string, string>;
  systemPrompt?: string;
  isActive: boolean;
  isDefault: boolean;
  version: string;
  agentsCreated: number;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const INDUSTRY_LABELS: Record<string, string> = {
  EDUCATION: 'Education',
  IT_RECRUITMENT: 'IT Recruitment',
  REAL_ESTATE: 'Real Estate',
  CUSTOMER_CARE: 'Customer Care',
  TECHNICAL_INTERVIEW: 'Technical Interview',
  HEALTHCARE: 'Healthcare',
  FINANCE: 'Finance',
  ECOMMERCE: 'E-commerce',
  CUSTOM: 'Custom',
};

const VoiceTemplatesPage: React.FC = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<VoiceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState<VoiceTemplate | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, [searchQuery, industryFilter]);

  useEffect(() => {
    const handleClick = () => setOpenMenuId(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (industryFilter) params.append('industry', industryFilter);

      const response = await api.get(`/voice-templates?${params.toString()}`);
      setTemplates(response.data.data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleInitializeDefaults = async () => {
    try {
      const response = await api.post('/voice-templates/initialize');
      toast.success(`Created ${response.data.data.length} default templates`);
      fetchTemplates();
    } catch (error) {
      console.error('Error initializing templates:', error);
      toast.error('Failed to initialize templates');
    }
  };

  const handleClone = async (id: string) => {
    try {
      const response = await api.post(`/voice-templates/${id}/clone`);
      toast.success('Template cloned successfully');
      navigate(`/voice-templates/${response.data.data.id}/edit`);
    } catch (error) {
      console.error('Error cloning template:', error);
      toast.error('Failed to clone template');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      await api.delete(`/voice-templates/${id}`);
      toast.success('Template deleted');
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  const handleDeploy = async (id: string) => {
    const name = prompt('Enter name for the new agent:');
    if (!name) return;

    try {
      await api.post(`/voice-templates/${id}/deploy`, { name });
      toast.success('Agent created from template');
      navigate(`/voice-ai`);
    } catch (error) {
      console.error('Error deploying template:', error);
      toast.error('Failed to deploy template');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const filteredTemplates = showActiveOnly
    ? templates.filter(t => t.isActive)
    : templates;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200">
        <div className="px-6 py-5">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-900">Voice Templates</h1>
            <div className="flex items-center gap-3">
              {templates.length === 0 && !loading && (
                <button
                  onClick={handleInitializeDefaults}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700"
                >
                  Browse defaults
                </button>
              )}
              <button
                onClick={() => navigate('/voice-templates/create')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium"
              >
                <PlusIcon className="w-4 h-4" />
                New template
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIndustryFilter('')}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                !industryFilter
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              All
            </button>
            {Object.entries(INDUSTRY_LABELS).slice(0, 4).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setIndustryFilter(industryFilter === value ? '' : value)}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  industryFilter === value
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                + {label}
              </button>
            ))}
            <button
              onClick={() => setShowActiveOnly(!showActiveOnly)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                showActiveOnly
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              + Active
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="px-6">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 mb-4">No templates found</p>
            {templates.length === 0 && (
              <button
                onClick={handleInitializeDefaults}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                Load default templates
              </button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Name</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Industry</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Deployed</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Created at</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filteredTemplates.map((template) => (
                <tr
                  key={template.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setPreviewTemplate(template)}
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{template.icon || '🤖'}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{template.name}</p>
                        <p className="text-xs text-gray-500 truncate max-w-xs">
                          {template.description || 'No description'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm text-gray-600">
                      {INDUSTRY_LABELS[template.industry] || template.industry}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        template.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {template.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm text-gray-600">{template.agentsCreated}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm text-gray-600">{formatDate(template.createdAt)}</span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === template.id ? null : template.id);
                        }}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <EllipsisHorizontalIcon className="w-5 h-5 text-gray-500" />
                      </button>

                      {/* Dropdown Menu */}
                      {openMenuId === template.id && (
                        <div
                          className="absolute right-0 top-8 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => {
                              setPreviewTemplate(template);
                              setOpenMenuId(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <PlayIcon className="w-4 h-4" />
                            Preview
                          </button>
                          <button
                            onClick={() => {
                              handleDeploy(template.id);
                              setOpenMenuId(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <RocketLaunchIcon className="w-4 h-4" />
                            Deploy as Agent
                          </button>
                          <button
                            onClick={() => {
                              navigate(`/voice-templates/${template.id}/edit`);
                              setOpenMenuId(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <PencilIcon className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              handleClone(template.id);
                              setOpenMenuId(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <DocumentDuplicateIcon className="w-4 h-4" />
                            Clone
                          </button>
                          <div className="border-t border-gray-100 my-1"></div>
                          <button
                            onClick={() => {
                              handleDelete(template.id, template.name);
                              setOpenMenuId(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <TrashIcon className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Preview Modal */}
      {previewTemplate && (
        <TemplatePreviewModal
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
        />
      )}
    </div>
  );
};

export default VoiceTemplatesPage;
