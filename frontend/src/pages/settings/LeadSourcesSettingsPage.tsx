/**
 * Lead Sources Configuration Page
 * Allows tenant admins to manage custom lead sources
 */

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowsUpDownIcon,
  CheckIcon,
  XMarkIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import {
  leadSourceService,
  LeadSource,
  CreateLeadSourceInput,
  UpdateLeadSourceInput,
} from '../../services/lead-source.service';

const ICON_OPTIONS = [
  { value: 'PencilIcon', label: 'Pencil' },
  { value: 'ArrowUpTrayIcon', label: 'Upload' },
  { value: 'DocumentTextIcon', label: 'Document' },
  { value: 'GlobeAltIcon', label: 'Globe' },
  { value: 'ChatBubbleLeftRightIcon', label: 'Chat' },
  { value: 'ShareIcon', label: 'Share' },
  { value: 'CameraIcon', label: 'Camera' },
  { value: 'BriefcaseIcon', label: 'Briefcase' },
  { value: 'MagnifyingGlassIcon', label: 'Search' },
  { value: 'UserGroupIcon', label: 'Users' },
  { value: 'PhoneIcon', label: 'Phone' },
  { value: 'EnvelopeIcon', label: 'Email' },
  { value: 'BuildingOfficeIcon', label: 'Building' },
  { value: 'EllipsisHorizontalIcon', label: 'Other' },
];

const COLOR_OPTIONS = [
  '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#22C55E',
  '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6',
  '#6366F1', '#8B5CF6', '#A855F7', '#D946EF', '#EC4899',
  '#F43F5E', '#6B7280',
];

interface SourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateLeadSourceInput | UpdateLeadSourceInput) => void;
  editingSource?: LeadSource | null;
}

function SourceModal({ isOpen, onClose, onSave, editingSource }: SourceModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366F1');
  const [icon, setIcon] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (editingSource) {
      setName(editingSource.name);
      setColor(editingSource.color || '#6366F1');
      setIcon(editingSource.icon || '');
      setDescription(editingSource.description || '');
    } else {
      setName('');
      setColor('#6366F1');
      setIcon('');
      setDescription('');
    }
  }, [editingSource, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Source name is required');
      return;
    }
    onSave({ name: name.trim(), color, icon, description: description.trim() });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {editingSource ? 'Edit Lead Source' : 'Add Lead Source'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Source Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="e.g., Trade Show"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 ${
                    color === c ? 'border-slate-900' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Icon</label>
            <select
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">No icon</option>
              {ICON_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Optional description"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              {editingSource ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LeadSourcesPage() {
  const [sources, setSources] = useState<LeadSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSource, setEditingSource] = useState<LeadSource | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    loadSources();
  }, [showInactive]);

  const loadSources = async () => {
    try {
      setLoading(true);
      const data = await leadSourceService.getAll(showInactive);
      setSources(data);
    } catch (error) {
      toast.error('Failed to load lead sources');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: CreateLeadSourceInput) => {
    try {
      await leadSourceService.create(data);
      toast.success('Lead source created');
      setShowModal(false);
      loadSources();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to create source');
    }
  };

  const handleUpdate = async (data: UpdateLeadSourceInput) => {
    if (!editingSource) return;
    try {
      await leadSourceService.update(editingSource.id, data);
      toast.success('Lead source updated');
      setEditingSource(null);
      loadSources();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update source');
    }
  };

  const handleDelete = async (source: LeadSource) => {
    if (source.isSystem) {
      toast.error('Cannot delete system sources');
      return;
    }
    if (!window.confirm(`Deactivate "${source.name}"?`)) return;
    try {
      await leadSourceService.delete(source.id);
      toast.success('Lead source deactivated');
      loadSources();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete source');
    }
  };

  const handleToggleActive = async (source: LeadSource) => {
    try {
      await leadSourceService.update(source.id, { isActive: !source.isActive });
      toast.success(source.isActive ? 'Source deactivated' : 'Source activated');
      loadSources();
    } catch (error: any) {
      toast.error('Failed to update source');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/settings"
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Lead Sources</h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage where your leads come from
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-slate-300"
            />
            Show inactive
          </label>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <PlusIcon className="w-5 h-5" />
            Add Source
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Source</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Slug</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Description</th>
              <th className="text-center py-3 px-4 text-sm font-medium text-slate-500">Status</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sources.map((source) => (
              <tr key={source.id} className={!source.isActive ? 'bg-slate-50 opacity-60' : ''}>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: source.color }}
                    >
                      {source.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{source.name}</p>
                      {source.isSystem && (
                        <span className="text-xs text-slate-400">System</span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 text-sm text-slate-500 font-mono">{source.slug}</td>
                <td className="py-3 px-4 text-sm text-slate-500">{source.description || '-'}</td>
                <td className="py-3 px-4 text-center">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      source.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {source.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleToggleActive(source)}
                      className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                      title={source.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {source.isActive ? (
                        <XMarkIcon className="w-4 h-4" />
                      ) : (
                        <CheckIcon className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => setEditingSource(source)}
                      className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                      title="Edit"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    {!source.isSystem && (
                      <button
                        onClick={() => handleDelete(source)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        title="Delete"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {sources.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500">No lead sources found</p>
          </div>
        )}
      </div>

      <SourceModal
        isOpen={showModal || !!editingSource}
        onClose={() => {
          setShowModal(false);
          setEditingSource(null);
        }}
        onSave={editingSource ? handleUpdate : handleCreate}
        editingSource={editingSource}
      />
    </div>
  );
}
