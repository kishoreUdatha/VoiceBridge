/**
 * Custom Contact Property Page - Create custom fields for contacts and leads
 * Connected to real API for persistent storage
 */
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  DocumentTextIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  ArrowLeftIcon,
  Bars3Icon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { customFieldsService, CustomField as APICustomField, FieldType } from '../../services/custom-fields.service';

interface CustomField {
  id: string;
  name: string;
  fieldKey: string;
  type: 'text' | 'number' | 'dropdown' | 'date' | 'checkbox' | 'textarea' | 'email' | 'phone' | 'url';
  required: boolean;
  visible: boolean;
  options?: string[];
  placeholder?: string;
  defaultValue?: string;
  order: number;
  group: string;
  // System field support
  isSystemField?: boolean;
  columnName?: string;
}

const fieldTypes = [
  { value: 'text', label: 'Text', icon: '📝' },
  { value: 'number', label: 'Number', icon: '🔢' },
  { value: 'dropdown', label: 'Dropdown', icon: '📋' },
  { value: 'date', label: 'Date', icon: '📅' },
  { value: 'checkbox', label: 'Checkbox', icon: '☑️' },
  { value: 'textarea', label: 'Text Area', icon: '📄' },
  { value: 'email', label: 'Email', icon: '📧' },
  { value: 'phone', label: 'Phone', icon: '📱' },
  { value: 'url', label: 'URL', icon: '🔗' },
];

const fieldGroups = [
  { value: 'basic', label: 'Basic Information' },
  { value: 'family', label: 'Family Details' },
  { value: 'contact', label: 'Contact Preferences' },
  { value: 'work', label: 'Professional' },
  { value: 'education', label: 'Education' },
  { value: 'custom', label: 'Custom' },
];

// Map frontend field types to API field types
const typeToApiType: Record<string, FieldType> = {
  text: 'TEXT',
  number: 'NUMBER',
  dropdown: 'SELECT',
  date: 'DATE',
  checkbox: 'CHECKBOX',
  textarea: 'TEXTAREA',
  email: 'EMAIL',
  phone: 'PHONE',
  url: 'TEXT',
};

const apiTypeToType: Record<FieldType, string> = {
  TEXT: 'text',
  TEXTAREA: 'textarea',
  NUMBER: 'number',
  EMAIL: 'email',
  PHONE: 'phone',
  DATE: 'date',
  DATETIME: 'date',
  SELECT: 'dropdown',
  MULTISELECT: 'dropdown',
  CHECKBOX: 'checkbox',
  RADIO: 'dropdown',
  FILE: 'text',
};

export default function CustomContactPropertyPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');

  const [fields, setFields] = useState<CustomField[]>([]);

  // Load fields from API
  useEffect(() => {
    const loadFields = async () => {
      try {
        const apiFields = await customFieldsService.getAll(true);
        const transformedFields: CustomField[] = apiFields.map((f, index) => ({
          id: f.id,
          name: f.name,
          fieldKey: f.slug,
          type: (apiTypeToType[f.fieldType] || 'text') as CustomField['type'],
          required: f.isRequired,
          visible: f.isActive,
          options: f.options?.map(o => o.label),
          order: f.order || index + 1,
          group: f.category || 'custom',
          isSystemField: f.isSystemField || false,
          columnName: f.columnName,
        }));
        setFields(transformedFields);
      } catch (error) {
        console.error('Failed to load custom fields:', error);
        setFields([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadFields();
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    fieldKey: '',
    type: 'text' as CustomField['type'],
    required: false,
    visible: true,
    options: '',
    placeholder: '',
    defaultValue: '',
    group: 'custom',
  });

  const generateFieldKey = (name: string) => {
    return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  };

  const handleAddField = () => {
    setEditingField(null);
    setFormData({
      name: '',
      fieldKey: '',
      type: 'text',
      required: false,
      visible: true,
      options: '',
      placeholder: '',
      defaultValue: '',
      group: 'custom',
    });
    setShowModal(true);
  };

  const handleEditField = (field: CustomField) => {
    setEditingField(field);
    setFormData({
      name: field.name,
      fieldKey: field.fieldKey,
      type: field.type,
      required: field.required,
      visible: field.visible,
      options: field.options?.join(', ') || '',
      placeholder: field.placeholder || '',
      defaultValue: field.defaultValue || '',
      group: field.group,
    });
    setShowModal(true);
  };

  const handleSaveField = async () => {
    if (!formData.name) {
      toast.error('Please enter a field name');
      return;
    }

    try {
      const options = formData.type === 'dropdown'
        ? formData.options.split(',').map(o => o.trim()).filter(Boolean).map(o => ({ value: o.toLowerCase().replace(/\s+/g, '_'), label: o }))
        : undefined;

      const apiData = {
        name: formData.name,
        slug: formData.fieldKey || generateFieldKey(formData.name),
        fieldType: typeToApiType[formData.type] || 'TEXT',
        options,
        isRequired: formData.required,
        order: editingField?.order || fields.length + 1,
      };

      if (editingField) {
        const updated = await customFieldsService.update(editingField.id, {
          ...apiData,
          isActive: formData.visible,
        });
        setFields(prev => prev.map(f => f.id === editingField.id ? {
          ...f,
          name: formData.name,
          fieldKey: formData.fieldKey || generateFieldKey(formData.name),
          type: formData.type,
          required: formData.required,
          visible: formData.visible,
          options: formData.type === 'dropdown' ? formData.options.split(',').map(o => o.trim()).filter(Boolean) : undefined,
          group: formData.group,
        } : f));
        toast.success('Field updated successfully');
      } else {
        const created = await customFieldsService.create(apiData);
        const newField: CustomField = {
          id: created.id,
          name: created.name,
          fieldKey: created.slug,
          type: (apiTypeToType[created.fieldType] || 'text') as CustomField['type'],
          required: created.isRequired,
          visible: created.isActive,
          options: created.options?.map(o => o.label),
          order: created.order,
          group: formData.group,
        };
        setFields(prev => [...prev, newField]);
        toast.success('Field added successfully');
      }
      setShowModal(false);
    } catch (error) {
      toast.error('Failed to save field');
      console.error('Failed to save field:', error);
    }
  };

  const handleDeleteField = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this field?')) {
      try {
        await customFieldsService.delete(id);
        setFields(prev => prev.filter(f => f.id !== id));
        toast.success('Field deleted');
      } catch (error) {
        toast.error('Failed to delete field');
        console.error('Failed to delete field:', error);
      }
    }
  };

  const handleToggleVisibility = async (id: string) => {
    try {
      await customFieldsService.toggleActive(id);
      setFields(prev => prev.map(f => f.id === id ? { ...f, visible: !f.visible } : f));
    } catch (error) {
      toast.error('Failed to toggle visibility');
      console.error('Failed to toggle visibility:', error);
    }
  };

  const handleToggleRequired = async (id: string) => {
    const field = fields.find(f => f.id === id);
    if (!field) return;

    try {
      await customFieldsService.update(id, { isRequired: !field.required });
      setFields(prev => prev.map(f => f.id === id ? { ...f, required: !f.required } : f));
    } catch (error) {
      toast.error('Failed to update field');
      console.error('Failed to update field:', error);
    }
  };

  const handleSave = async () => {
    // Fields are saved individually, this just shows success
    toast.success('Custom fields saved successfully');
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const filteredFields = selectedGroup === 'all'
    ? fields
    : fields.filter(f => f.group === selectedGroup);

  const groupedFields = fieldGroups.map(group => ({
    ...group,
    fields: fields.filter(f => f.group === group.value),
  }));

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/settings"
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Custom Contact Properties</h1>
            <p className="text-sm text-slate-500">Create and manage custom fields for leads and contacts</p>
          </div>
        </div>
        <button
          onClick={handleAddField}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Add Field
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-2xl font-bold text-slate-900">{fields.length}</p>
          <p className="text-sm text-slate-500">Total Fields</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-2xl font-bold text-blue-600">{fields.filter(f => f.isSystemField).length}</p>
          <p className="text-sm text-slate-500">System Fields</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-2xl font-bold text-green-600">{fields.filter(f => f.visible).length}</p>
          <p className="text-sm text-slate-500">Enabled</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-2xl font-bold text-amber-600">{fields.filter(f => f.required).length}</p>
          <p className="text-sm text-slate-500">Required</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-2xl font-bold text-slate-400">{fields.filter(f => !f.visible).length}</p>
          <p className="text-sm text-slate-500">Disabled</p>
        </div>
      </div>

      {/* Group Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedGroup('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            selectedGroup === 'all'
              ? 'bg-primary-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All Fields ({fields.length})
        </button>
        {fieldGroups.map(group => (
          <button
            key={group.value}
            onClick={() => setSelectedGroup(group.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              selectedGroup === group.value
                ? 'bg-primary-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {group.label} ({fields.filter(f => f.group === group.value).length})
          </button>
        ))}
      </div>

      {/* Fields List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h2 className="font-semibold text-slate-900">Custom Fields</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {filteredFields.map((field) => (
            <div key={field.id} className="p-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-4">
                <Bars3Icon className="w-5 h-5 text-slate-400 cursor-move" />

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{fieldTypes.find(t => t.value === field.type)?.icon}</span>
                    <span className="font-medium text-slate-900">{field.name}</span>
                    <span className="text-xs text-slate-400 font-mono">{field.fieldKey}</span>
                    {field.isSystemField && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">System</span>
                    )}
                    {field.required && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">Required</span>
                    )}
                    {!field.visible && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-500 rounded">Hidden</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                    <span>{fieldTypes.find(t => t.value === field.type)?.label}</span>
                    <span>•</span>
                    <span>{fieldGroups.find(g => g.value === field.group)?.label}</span>
                    {field.options && (
                      <>
                        <span>•</span>
                        <span>{field.options.length} options</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleVisibility(field.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      field.visible ? 'text-green-600 hover:bg-green-50' : 'text-slate-400 hover:bg-slate-100'
                    }`}
                    title={field.visible ? 'Hide field' : 'Show field'}
                  >
                    {field.visible ? <EyeIcon className="w-4 h-4" /> : <EyeSlashIcon className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleToggleRequired(field.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      field.required ? 'text-red-600 hover:bg-red-50' : 'text-slate-400 hover:bg-slate-100'
                    }`}
                    title={field.required ? 'Make optional' : 'Make required'}
                  >
                    <span className="text-xs font-bold">{field.required ? '*' : 'Opt'}</span>
                  </button>
                  {!field.isSystemField && (
                    <>
                      <button
                        onClick={() => handleEditField(field)}
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteField(field.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
          {filteredFields.length === 0 && (
            <div className="p-8 text-center">
              <DocumentTextIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No fields in this group</p>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Link
          to="/settings"
          className="px-6 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Cancel
        </Link>
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="px-6 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Add/Edit Field Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 sticky top-0 bg-white">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingField ? 'Edit Field' : 'Add Custom Field'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Field Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData(prev => ({
                      ...prev,
                      name: e.target.value,
                      fieldKey: editingField ? prev.fieldKey : generateFieldKey(e.target.value),
                    }));
                  }}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., Father Name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Field Key</label>
                <input
                  type="text"
                  value={formData.fieldKey}
                  onChange={(e) => setFormData(prev => ({ ...prev, fieldKey: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
                  placeholder="father_name"
                />
                <p className="text-xs text-slate-500 mt-1">Used for API and integrations</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Field Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {fieldTypes.map(type => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, type: type.value as any }))}
                      className={`p-3 rounded-lg border-2 text-center transition-all ${
                        formData.type === type.value
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-lg block">{type.icon}</span>
                      <span className="text-xs text-slate-600">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Group</label>
                <select
                  value={formData.group}
                  onChange={(e) => setFormData(prev => ({ ...prev, group: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {fieldGroups.map(g => (
                    <option key={g.value} value={g.value}>{g.label}</option>
                  ))}
                </select>
              </div>

              {formData.type === 'dropdown' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Options</label>
                  <textarea
                    value={formData.options}
                    onChange={(e) => setFormData(prev => ({ ...prev, options: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Option 1, Option 2, Option 3"
                  />
                  <p className="text-xs text-slate-500 mt-1">Separate options with commas</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Placeholder</label>
                <input
                  type="text"
                  value={formData.placeholder}
                  onChange={(e) => setFormData(prev => ({ ...prev, placeholder: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter placeholder text"
                />
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.required}
                    onChange={(e) => setFormData(prev => ({ ...prev, required: e.target.checked }))}
                    className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm text-slate-700">Required field</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.visible}
                    onChange={(e) => setFormData(prev => ({ ...prev, visible: e.target.checked }))}
                    className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm text-slate-700">Visible</span>
                </label>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveField}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
              >
                {editingField ? 'Update Field' : 'Add Field'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
