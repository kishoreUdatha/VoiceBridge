/**
 * Custom Fields Renderer Component
 * Dynamically renders custom fields defined in Settings > Custom Contact Property
 */

import { useState, useEffect } from 'react';
import { customFieldsService, CustomField, FieldType } from '../services/custom-fields.service';
import { CheckIcon, DocumentTextIcon, PlusIcon } from '@heroicons/react/24/outline';

interface CustomFieldsRendererProps {
  values: Record<string, any>;
  onChange: (fieldSlug: string, value: any) => void;
  readOnly?: boolean;
  compact?: boolean;
}

export function CustomFieldsRenderer({
  values,
  onChange,
  readOnly = false,
  compact = false,
}: CustomFieldsRendererProps) {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFields = async () => {
      try {
        const apiFields = await customFieldsService.getAll(false); // Only active fields
        setFields(apiFields);
      } catch (error) {
        console.error('Failed to load custom fields:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFields();
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="grid grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i}>
              <div className="h-4 bg-slate-200 rounded w-1/4 mb-2"></div>
              <div className="h-10 bg-slate-100 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (fields.length === 0) {
    return (
      <div className="text-center py-8 px-4 bg-slate-50 rounded-lg border border-dashed border-slate-200">
        <DocumentTextIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-600 mb-2">No custom fields configured</p>
        <p className="text-xs text-slate-500 mb-4">
          Add custom fields to collect additional information about your leads
        </p>
        <a
          href="/settings/custom-fields"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Add Custom Field
        </a>
      </div>
    );
  }

  const baseInputClass =
    'w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed';
  const labelClass = 'block text-xs font-medium text-slate-600 mb-1';

  const renderField = (field: CustomField) => {
    const value = values[field.slug];
    const fieldId = `custom-field-${field.slug}`;

    switch (field.fieldType) {
      case 'TEXT':
      case 'EMAIL':
      case 'PHONE':
        return (
          <div key={field.id}>
            <label htmlFor={fieldId} className={labelClass}>
              {field.name}
              {field.isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              id={fieldId}
              type={field.fieldType === 'EMAIL' ? 'email' : field.fieldType === 'PHONE' ? 'tel' : 'text'}
              value={value || ''}
              onChange={(e) => onChange(field.slug, e.target.value)}
              disabled={readOnly}
              className={baseInputClass}
              placeholder={`Enter ${field.name.toLowerCase()}`}
            />
          </div>
        );

      case 'TEXTAREA':
        return (
          <div key={field.id} className="col-span-2">
            <label htmlFor={fieldId} className={labelClass}>
              {field.name}
              {field.isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
            <textarea
              id={fieldId}
              value={value || ''}
              onChange={(e) => onChange(field.slug, e.target.value)}
              disabled={readOnly}
              rows={3}
              className={baseInputClass}
              placeholder={`Enter ${field.name.toLowerCase()}`}
            />
          </div>
        );

      case 'NUMBER':
        return (
          <div key={field.id}>
            <label htmlFor={fieldId} className={labelClass}>
              {field.name}
              {field.isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              id={fieldId}
              type="number"
              value={value ?? ''}
              onChange={(e) => onChange(field.slug, e.target.value ? Number(e.target.value) : null)}
              disabled={readOnly}
              className={baseInputClass}
              placeholder={`Enter ${field.name.toLowerCase()}`}
            />
          </div>
        );

      case 'DATE':
      case 'DATETIME':
        return (
          <div key={field.id}>
            <label htmlFor={fieldId} className={labelClass}>
              {field.name}
              {field.isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              id={fieldId}
              type={field.fieldType === 'DATETIME' ? 'datetime-local' : 'date'}
              value={value || ''}
              onChange={(e) => onChange(field.slug, e.target.value || null)}
              disabled={readOnly}
              className={baseInputClass}
            />
          </div>
        );

      case 'SELECT':
      case 'RADIO':
        return (
          <div key={field.id}>
            <label htmlFor={fieldId} className={labelClass}>
              {field.name}
              {field.isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
            <select
              id={fieldId}
              value={value || ''}
              onChange={(e) => onChange(field.slug, e.target.value || null)}
              disabled={readOnly}
              className={baseInputClass}
            >
              <option value="">Select {field.name}</option>
              {field.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        );

      case 'MULTISELECT':
        const selectedValues = Array.isArray(value) ? value : [];
        return (
          <div key={field.id} className="col-span-2">
            <label className={labelClass}>
              {field.name}
              {field.isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="flex flex-wrap gap-2 p-2 border border-slate-300 rounded-lg bg-white min-h-[40px]">
              {field.options?.map((opt) => {
                const isSelected = selectedValues.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      if (readOnly) return;
                      const newValue = isSelected
                        ? selectedValues.filter((v) => v !== opt.value)
                        : [...selectedValues, opt.value];
                      onChange(field.slug, newValue);
                    }}
                    disabled={readOnly}
                    className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                      isSelected
                        ? 'bg-primary-100 border-primary-300 text-primary-700'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    } ${readOnly ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {opt.label}
                    {isSelected && <CheckIcon className="h-3 w-3 ml-1 inline" />}
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 'CHECKBOX':
        return (
          <div key={field.id} className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={value || false}
                onChange={(e) => onChange(field.slug, e.target.checked)}
                disabled={readOnly}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
            <span className="text-sm text-slate-700">
              {field.name}
              {field.isRequired && <span className="text-red-500 ml-1">*</span>}
            </span>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`grid gap-4 ${compact ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
      {fields.map(renderField)}
    </div>
  );
}

// System fields that are now direct database columns (shown in separate sections)
const SYSTEM_FIELD_SLUGS = [
  'fatherName', 'father_name',
  'motherName', 'mother_name',
  'fatherPhone', 'father_phone',
  'motherPhone', 'mother_phone',
  'occupation',
  'budget',
  'whatsapp',
  'preferredContactMethod', 'preferred_contact_method',
  'preferredContactTime', 'preferred_contact_time',
  'gender',
  'dateOfBirth', 'date_of_birth', 'dob',
];

// Read-only display version for showing custom field values
interface CustomFieldsDisplayProps {
  values: Record<string, any>;
  showSystemFields?: boolean; // If true, show all fields including system fields
}

export function CustomFieldsDisplay({ values, showSystemFields = false }: CustomFieldsDisplayProps) {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFields = async () => {
      try {
        const apiFields = await customFieldsService.getAll(false);
        setFields(apiFields);
      } catch (error) {
        console.error('Failed to load custom fields:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFields();
  }, []);

  if (loading || fields.length === 0) {
    return null;
  }

  // Filter to only show fields that have values and exclude system fields (unless showSystemFields is true)
  const fieldsWithValues = fields.filter((field) => {
    const value = values[field.slug];
    const hasValue = value !== null && value !== undefined && value !== '';

    // Exclude system fields unless explicitly requested
    if (!showSystemFields && SYSTEM_FIELD_SLUGS.includes(field.slug)) {
      return false;
    }

    return hasValue;
  });

  if (fieldsWithValues.length === 0) {
    return null;
  }

  const formatValue = (field: CustomField, value: any): string => {
    if (value === null || value === undefined || value === '') return '--';

    switch (field.fieldType) {
      case 'CHECKBOX':
        return value ? 'Yes' : 'No';
      case 'DATE':
        return value ? new Date(value).toLocaleDateString() : '--';
      case 'DATETIME':
        return value ? new Date(value).toLocaleString() : '--';
      case 'SELECT':
      case 'RADIO':
        const option = field.options?.find((opt) => opt.value === value);
        return option?.label || String(value);
      case 'MULTISELECT':
        if (Array.isArray(value)) {
          return value
            .map((v) => field.options?.find((opt) => opt.value === v)?.label || v)
            .join(', ') || '--';
        }
        return String(value);
      default:
        return String(value);
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {fieldsWithValues.map((field) => (
        <div key={field.id}>
          <label className="block text-sm text-slate-500 mb-1">{field.name}</label>
          <p className="text-sm text-slate-900">{formatValue(field, values[field.slug])}</p>
        </div>
      ))}
    </div>
  );
}

export default CustomFieldsRenderer;
