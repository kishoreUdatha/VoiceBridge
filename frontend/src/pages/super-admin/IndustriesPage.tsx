import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { superAdminService } from '../../services/super-admin.service';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  CheckCircleIcon,
  XCircleIcon,
  BuildingOffice2Icon,
  UsersIcon,
  DocumentTextIcon,
  Squares2X2Icon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface Industry {
  id: string;
  slug: string;
  name: string;
  description?: string;
  icon?: string;
  color: string;
  isSystem: boolean;
  isActive: boolean;
  _count?: {
    organizations: number;
    fieldTemplates: number;
    stageTemplates: number;
  };
}

// Available icons for industries
const ICON_OPTIONS = [
  { value: 'AcademicCapIcon', label: 'Academic Cap' },
  { value: 'BuildingOffice2Icon', label: 'Building Office' },
  { value: 'HeartIcon', label: 'Heart (Healthcare)' },
  { value: 'ShieldCheckIcon', label: 'Shield (Insurance)' },
  { value: 'BanknotesIcon', label: 'Banknotes (Finance)' },
  { value: 'TruckIcon', label: 'Truck (Automotive)' },
  { value: 'ServerIcon', label: 'Server (IT)' },
  { value: 'UserGroupIcon', label: 'User Group' },
  { value: 'ShoppingCartIcon', label: 'Shopping Cart' },
  { value: 'PhoneIcon', label: 'Phone' },
  { value: 'GlobeAltIcon', label: 'Globe (Travel)' },
  { value: 'SparklesIcon', label: 'Sparkles (Fitness)' },
  { value: 'BriefcaseIcon', label: 'Briefcase' },
  { value: 'CubeIcon', label: 'Cube (General)' },
];

// Color presets
const COLOR_OPTIONS = [
  { value: '#10B981', label: 'Green' },
  { value: '#F97316', label: 'Orange' },
  { value: '#3B82F6', label: 'Blue' },
  { value: '#8B5CF6', label: 'Purple' },
  { value: '#EC4899', label: 'Pink' },
  { value: '#EF4444', label: 'Red' },
  { value: '#F59E0B', label: 'Amber' },
  { value: '#06B6D4', label: 'Cyan' },
  { value: '#6366F1', label: 'Indigo' },
  { value: '#84CC16', label: 'Lime' },
];

export default function IndustriesPage() {
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    slug: '',
    name: '',
    description: '',
    icon: 'CubeIcon',
    color: '#6B7280',
  });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchIndustries();
  }, []);

  const fetchIndustries = async () => {
    setLoading(true);
    try {
      const result = await superAdminService.getIndustries();
      setIndustries(result.data || []);
    } catch (err: any) {
      console.error('Failed to fetch industries:', err);
      setError(err.response?.data?.message || 'Failed to load industries');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshCache = async () => {
    setRefreshing(true);
    try {
      await superAdminService.invalidateIndustryCache();
      setSuccess('Cache refreshed successfully');
      await fetchIndustries();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to refresh cache');
    } finally {
      setRefreshing(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    setSuccess('');

    try {
      await superAdminService.createIndustry(formData);
      setSuccess('Industry created successfully!');
      setFormData({ slug: '', name: '', description: '', icon: 'CubeIcon', color: '#6B7280' });
      setShowCreateModal(false);
      fetchIndustries();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create industry');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (slug: string) => {
    setDeleting(true);
    try {
      await superAdminService.deleteIndustry(slug);
      setSuccess('Industry deleted successfully');
      setDeleteConfirm(null);
      fetchIndustries();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete industry');
    } finally {
      setDeleting(false);
    }
  };

  const filteredIndustries = industries.filter(
    (ind) =>
      ind.name.toLowerCase().includes(search.toLowerCase()) ||
      ind.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Industries</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage industry templates for lead stages and custom fields
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleRefreshCache}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <ArrowPathIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Cache
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            <PlusIcon className="w-4 h-4" />
            Create Industry
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')}>
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess('')}>
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <div className="relative max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search industries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Industries Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredIndustries.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-500">
            No industries found
          </div>
        ) : (
          filteredIndustries.map((industry) => (
            <div
              key={industry.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Header with color bar */}
              <div
                className="h-2"
                style={{ backgroundColor: industry.color }}
              />

              <div className="p-5">
                {/* Title Row */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${industry.color}20` }}
                    >
                      <BuildingOffice2Icon
                        className="w-5 h-5"
                        style={{ color: industry.color }}
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">{industry.name}</h3>
                      <p className="text-xs text-slate-500">{industry.slug}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {industry.isSystem ? (
                      <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                        System
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 rounded">
                        Custom
                      </span>
                    )}
                    {industry.isActive ? (
                      <CheckCircleIcon className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircleIcon className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                </div>

                {/* Description */}
                {industry.description && (
                  <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                    {industry.description}
                  </p>
                )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="text-center p-2 bg-slate-50 rounded-lg">
                    <UsersIcon className="w-4 h-4 mx-auto text-slate-400 mb-1" />
                    <p className="text-sm font-semibold text-slate-800">
                      {industry._count?.organizations || 0}
                    </p>
                    <p className="text-xs text-slate-500">Orgs</p>
                  </div>
                  <div className="text-center p-2 bg-slate-50 rounded-lg">
                    <DocumentTextIcon className="w-4 h-4 mx-auto text-slate-400 mb-1" />
                    <p className="text-sm font-semibold text-slate-800">
                      {industry._count?.fieldTemplates || 0}
                    </p>
                    <p className="text-xs text-slate-500">Fields</p>
                  </div>
                  <div className="text-center p-2 bg-slate-50 rounded-lg">
                    <Squares2X2Icon className="w-4 h-4 mx-auto text-slate-400 mb-1" />
                    <p className="text-sm font-semibold text-slate-800">
                      {industry._count?.stageTemplates || 0}
                    </p>
                    <p className="text-xs text-slate-500">Stages</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Link
                    to={`/super-admin/industries/${industry.slug}`}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium"
                  >
                    <PencilSquareIcon className="w-4 h-4" />
                    Edit
                  </Link>
                  {!industry.isSystem && (
                    <button
                      onClick={() => setDeleteConfirm(industry.slug)}
                      className="inline-flex items-center justify-center p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Industry Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-800">Create Industry</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Industry Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      name: e.target.value,
                      slug: generateSlug(e.target.value),
                    });
                  }}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., Solar Energy"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Slug *
                </label>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., solar-energy"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Lowercase letters, numbers, and hyphens only
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                  placeholder="Brief description of this industry"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Icon
                  </label>
                  <select
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {ICON_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-12 h-10 rounded border border-slate-300 cursor-pointer"
                    />
                    <select
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Custom</option>
                      {COLOR_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Industry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Delete Industry?</h3>
            <p className="text-slate-600 mb-6">
              Are you sure you want to delete "{deleteConfirm}"? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
