import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { superAdminService } from '../../services/super-admin.service';
import {
  ArrowLeftIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  CheckIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  DocumentArrowDownIcon,
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
}

interface FieldTemplate {
  id: string;
  key: string;
  label: string;
  fieldType: string;
  isRequired: boolean;
  placeholder?: string;
  helpText?: string;
  options?: Array<{ value: string; label: string; color?: string }>;
  minValue?: number;
  maxValue?: number;
  unit?: string;
  groupName?: string;
  displayOrder: number;
  gridSpan: number;
}

interface StageTemplate {
  id: string;
  name: string;
  slug: string;
  color: string;
  icon?: string;
  journeyOrder: number;
  isDefault: boolean;
  isLostStage: boolean;
  autoSyncStatus?: string;
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Select (Dropdown)' },
  { value: 'multiselect', label: 'Multi-Select' },
  { value: 'date', label: 'Date' },
  { value: 'boolean', label: 'Yes/No' },
  { value: 'currency', label: 'Currency' },
  { value: 'textarea', label: 'Text Area' },
];

const COLOR_OPTIONS = [
  '#94A3B8', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899',
  '#EF4444', '#F97316', '#EAB308', '#10B981', '#06B6D4',
];

export default function IndustryDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [industry, setIndustry] = useState<Industry | null>(null);
  const [fields, setFields] = useState<FieldTemplate[]>([]);
  const [stages, setStages] = useState<StageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'fields' | 'stages'>('details');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Industry edit state
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    icon: '',
    color: '',
    isActive: true,
  });

  // Field modal state
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [editingField, setEditingField] = useState<FieldTemplate | null>(null);
  const [fieldForm, setFieldForm] = useState({
    key: '',
    label: '',
    fieldType: 'text',
    isRequired: false,
    placeholder: '',
    helpText: '',
    options: [] as Array<{ value: string; label: string }>,
    minValue: undefined as number | undefined,
    maxValue: undefined as number | undefined,
    unit: '',
    groupName: '',
    gridSpan: 1,
  });

  // Stage modal state
  const [showStageModal, setShowStageModal] = useState(false);
  const [editingStage, setEditingStage] = useState<StageTemplate | null>(null);
  const [stageForm, setStageForm] = useState({
    name: '',
    stageSlug: '',
    color: '#94A3B8',
    icon: '',
    journeyOrder: 1,
    isDefault: false,
    isLostStage: false,
    autoSyncStatus: '',
  });

  useEffect(() => {
    if (slug) {
      fetchIndustryData();
    }
  }, [slug]);

  const fetchIndustryData = async () => {
    setLoading(true);
    try {
      const [industryRes, fieldsRes, stagesRes] = await Promise.all([
        superAdminService.getIndustry(slug!),
        superAdminService.getIndustryFields(slug!),
        superAdminService.getIndustryStages(slug!),
      ]);

      setIndustry(industryRes.data);
      setFields(fieldsRes.data || []);
      setStages(stagesRes.data || []);

      setEditForm({
        name: industryRes.data.name,
        description: industryRes.data.description || '',
        icon: industryRes.data.icon || '',
        color: industryRes.data.color,
        isActive: industryRes.data.isActive,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load industry');
    } finally {
      setLoading(false);
    }
  };

  // Industry CRUD
  const handleSaveIndustry = async () => {
    setSaving(true);
    try {
      await superAdminService.updateIndustry(slug!, editForm);
      setSuccess('Industry updated successfully');
      setEditing(false);
      fetchIndustryData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update industry');
    } finally {
      setSaving(false);
    }
  };

  // Field CRUD
  const openFieldModal = (field?: FieldTemplate) => {
    if (field) {
      setEditingField(field);
      setFieldForm({
        key: field.key,
        label: field.label,
        fieldType: field.fieldType,
        isRequired: field.isRequired,
        placeholder: field.placeholder || '',
        helpText: field.helpText || '',
        options: field.options || [],
        minValue: field.minValue,
        maxValue: field.maxValue,
        unit: field.unit || '',
        groupName: field.groupName || '',
        gridSpan: field.gridSpan,
      });
    } else {
      setEditingField(null);
      setFieldForm({
        key: '',
        label: '',
        fieldType: 'text',
        isRequired: false,
        placeholder: '',
        helpText: '',
        options: [],
        minValue: undefined,
        maxValue: undefined,
        unit: '',
        groupName: '',
        gridSpan: 1,
      });
    }
    setShowFieldModal(true);
  };

  const handleSaveField = async () => {
    setSaving(true);
    try {
      if (editingField) {
        await superAdminService.updateIndustryField(slug!, editingField.key, fieldForm);
      } else {
        await superAdminService.addIndustryField(slug!, fieldForm);
      }
      setSuccess(editingField ? 'Field updated' : 'Field added');
      setShowFieldModal(false);
      fetchIndustryData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save field');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteField = async (key: string) => {
    if (!confirm('Delete this field?')) return;
    try {
      await superAdminService.deleteIndustryField(slug!, key);
      setSuccess('Field deleted');
      fetchIndustryData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete field');
    }
  };

  // Stage CRUD
  const openStageModal = (stage?: StageTemplate) => {
    if (stage) {
      setEditingStage(stage);
      setStageForm({
        name: stage.name,
        stageSlug: stage.slug,
        color: stage.color,
        icon: stage.icon || '',
        journeyOrder: stage.journeyOrder,
        isDefault: stage.isDefault,
        isLostStage: stage.isLostStage,
        autoSyncStatus: stage.autoSyncStatus || '',
      });
    } else {
      setEditingStage(null);
      const maxOrder = Math.max(...stages.map((s) => s.journeyOrder), 0);
      setStageForm({
        name: '',
        stageSlug: '',
        color: '#94A3B8',
        icon: '',
        journeyOrder: maxOrder + 1,
        isDefault: false,
        isLostStage: false,
        autoSyncStatus: '',
      });
    }
    setShowStageModal(true);
  };

  const handleSaveStage = async () => {
    setSaving(true);
    try {
      if (editingStage) {
        await superAdminService.updateIndustryStage(slug!, editingStage.slug, stageForm);
      } else {
        await superAdminService.addIndustryStage(slug!, stageForm);
      }
      setSuccess(editingStage ? 'Stage updated' : 'Stage added');
      setShowStageModal(false);
      fetchIndustryData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save stage');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStage = async (stageSlug: string) => {
    if (!confirm('Delete this stage?')) return;
    try {
      await superAdminService.deleteIndustryStage(slug!, stageSlug);
      setSuccess('Stage deleted');
      fetchIndustryData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete stage');
    }
  };

  const handleExport = async () => {
    try {
      const data = await superAdminService.exportIndustry(slug!);
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `industry-${slug}.json`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to export');
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!industry) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Industry not found</p>
        <Link to="/super-admin/industries" className="text-indigo-600 hover:underline mt-2 inline-block">
          Back to Industries
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/super-admin/industries"
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 text-slate-600" />
          </Link>
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${industry.color}20` }}
            >
              <span style={{ color: industry.color }} className="text-xl font-bold">
                {industry.name[0]}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">{industry.name}</h1>
              <p className="text-sm text-slate-500">{industry.slug}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
          >
            <DocumentArrowDownIcon className="w-4 h-4" />
            Export
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

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-6">
          {(['details', 'fields', 'stages'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium transition-colors relative ${
                activeTab === tab
                  ? 'text-indigo-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab === 'details' && 'Details'}
              {tab === 'fields' && `Fields (${fields.length})`}
              {tab === 'stages' && `Stages (${stages.length})`}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Details Tab */}
      {activeTab === 'details' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-800">Industry Details</h2>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors text-sm font-medium"
              >
                <PencilSquareIcon className="w-4 h-4" />
                Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveIndustry}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  <CheckIcon className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              {editing ? (
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              ) : (
                <p className="text-slate-800">{industry.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Color</label>
              {editing ? (
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={editForm.color}
                    onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                    className="w-12 h-10 rounded border border-slate-300 cursor-pointer"
                  />
                  <div className="flex gap-1">
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditForm({ ...editForm, color: c })}
                        className={`w-8 h-8 rounded-lg border-2 ${
                          editForm.color === c ? 'border-indigo-500' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded"
                    style={{ backgroundColor: industry.color }}
                  />
                  <span className="text-slate-800">{industry.color}</span>
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              {editing ? (
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                />
              ) : (
                <p className="text-slate-800">{industry.description || 'No description'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              {editing ? (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editForm.isActive}
                    onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Active</span>
                </label>
              ) : (
                <span
                  className={`px-2 py-1 text-xs font-medium rounded ${
                    industry.isActive
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {industry.isActive ? 'Active' : 'Inactive'}
                </span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <span
                className={`px-2 py-1 text-xs font-medium rounded ${
                  industry.isSystem
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {industry.isSystem ? 'System' : 'Custom'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Fields Tab */}
      {activeTab === 'fields' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800">Field Templates</h2>
            <button
              onClick={() => openFieldModal()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
            >
              <PlusIcon className="w-4 h-4" />
              Add Field
            </button>
          </div>

          {fields.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              No fields configured. Add your first field.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {fields
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .map((field) => (
                  <div key={field.id} className="flex items-center justify-between p-4 hover:bg-slate-50">
                    <div className="flex items-center gap-4">
                      <div className="text-slate-400">
                        <ChevronUpIcon className="w-4 h-4" />
                        <ChevronDownIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{field.label}</p>
                        <p className="text-sm text-slate-500">
                          {field.key} &bull; {field.fieldType}
                          {field.isRequired && ' &bull; Required'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openFieldModal(field)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteField(field.key)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Stages Tab */}
      {activeTab === 'stages' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800">Stage Templates</h2>
            <button
              onClick={() => openStageModal()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
            >
              <PlusIcon className="w-4 h-4" />
              Add Stage
            </button>
          </div>

          {stages.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              No stages configured. Add your first stage.
            </div>
          ) : (
            <div className="p-4">
              <div className="flex flex-wrap gap-2">
                {stages
                  .sort((a, b) => a.journeyOrder - b.journeyOrder)
                  .map((stage, index) => (
                    <div
                      key={stage.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 hover:shadow-sm transition-shadow"
                      style={{ borderLeftWidth: 4, borderLeftColor: stage.color }}
                    >
                      <span className="text-xs text-slate-400">{index + 1}</span>
                      <span className="font-medium text-slate-800">{stage.name}</span>
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
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={() => openStageModal(stage)}
                          className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                        >
                          <PencilSquareIcon className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteStage(stage.slug)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Field Modal */}
      {showFieldModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-800">
                {editingField ? 'Edit Field' : 'Add Field'}
              </h2>
              <button
                onClick={() => setShowFieldModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Key *</label>
                  <input
                    type="text"
                    value={fieldForm.key}
                    onChange={(e) => setFieldForm({ ...fieldForm, key: e.target.value })}
                    disabled={!!editingField}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                    placeholder="field_key"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Label *</label>
                  <input
                    type="text"
                    value={fieldForm.label}
                    onChange={(e) => {
                      setFieldForm({
                        ...fieldForm,
                        label: e.target.value,
                        key: editingField ? fieldForm.key : generateSlug(e.target.value).replace(/-/g, '_'),
                      });
                    }}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Field Label"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type *</label>
                  <select
                    value={fieldForm.fieldType}
                    onChange={(e) => setFieldForm({ ...fieldForm, fieldType: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {FIELD_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Grid Span</label>
                  <select
                    value={fieldForm.gridSpan}
                    onChange={(e) => setFieldForm({ ...fieldForm, gridSpan: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={1}>1 Column</option>
                    <option value={2}>2 Columns</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Placeholder</label>
                <input
                  type="text"
                  value={fieldForm.placeholder}
                  onChange={(e) => setFieldForm({ ...fieldForm, placeholder: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Help Text</label>
                <input
                  type="text"
                  value={fieldForm.helpText}
                  onChange={(e) => setFieldForm({ ...fieldForm, helpText: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={fieldForm.isRequired}
                  onChange={(e) => setFieldForm({ ...fieldForm, isRequired: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-700">Required field</span>
              </label>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowFieldModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveField}
                  disabled={saving || !fieldForm.key || !fieldForm.label}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Field'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stage Modal */}
      {showStageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-800">
                {editingStage ? 'Edit Stage' : 'Add Stage'}
              </h2>
              <button
                onClick={() => setShowStageModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Stage Name *</label>
                <input
                  type="text"
                  value={stageForm.name}
                  onChange={(e) => {
                    setStageForm({
                      ...stageForm,
                      name: e.target.value,
                      stageSlug: editingStage ? stageForm.stageSlug : generateSlug(e.target.value),
                    });
                  }}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., Qualified"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Slug *</label>
                <input
                  type="text"
                  value={stageForm.stageSlug}
                  onChange={(e) => setStageForm({ ...stageForm, stageSlug: e.target.value })}
                  disabled={!!editingStage}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                  placeholder="qualified"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Color</label>
                  <div className="flex gap-1 flex-wrap">
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setStageForm({ ...stageForm, color: c })}
                        className={`w-8 h-8 rounded-lg border-2 ${
                          stageForm.color === c ? 'border-indigo-500' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Order</label>
                  <input
                    type="number"
                    value={stageForm.journeyOrder}
                    onChange={(e) => setStageForm({ ...stageForm, journeyOrder: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    min={-1}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Auto-Sync Status</label>
                <select
                  value={stageForm.autoSyncStatus}
                  onChange={(e) => setStageForm({ ...stageForm, autoSyncStatus: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">None</option>
                  <option value="WON">WON (Converted)</option>
                  <option value="LOST">LOST</option>
                </select>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={stageForm.isDefault}
                    onChange={(e) => setStageForm({ ...stageForm, isDefault: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-slate-700">Default stage</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={stageForm.isLostStage}
                    onChange={(e) => setStageForm({ ...stageForm, isLostStage: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-slate-700">Lost stage</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowStageModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveStage}
                  disabled={saving || !stageForm.name || !stageForm.stageSlug}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Stage'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
