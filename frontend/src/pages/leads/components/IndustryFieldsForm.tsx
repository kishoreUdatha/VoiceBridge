/**
 * Industry Fields Form Component
 * Dynamic form renderer for industry-specific custom fields
 */

import { useState, useEffect, useCallback } from 'react';
import {
  BuildingOffice2Icon,
  HeartIcon,
  ShieldCheckIcon,
  BanknotesIcon,
  ComputerDesktopIcon,
  ShoppingCartIcon,
  CheckIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import industryFieldsService, { IndustryField, IndustryFieldConfig } from '../../../services/industry-fields.service';

// Icon mapping
const industryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  BuildingOffice2Icon,
  HeartIcon,
  ShieldCheckIcon,
  BanknotesIcon,
  ComputerDesktopIcon,
  ShoppingCartIcon,
};

interface IndustryFieldsFormProps {
  leadId: string;
  industry: string;
  initialValues?: Record<string, any>;
  onSave?: (values: Record<string, any>) => void;
  readOnly?: boolean;
  compact?: boolean;
}

export function IndustryFieldsForm({
  leadId,
  industry,
  initialValues = {},
  onSave,
  readOnly = false,
  compact = false,
}: IndustryFieldsFormProps) {
  const [fieldConfig, setFieldConfig] = useState<IndustryFieldConfig | null>(null);
  const [values, setValues] = useState<Record<string, any>>(initialValues);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Fetch field schema and current values
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [schemaRes, fieldsRes] = await Promise.all([
          industryFieldsService.getFieldSchema(),
          industryFieldsService.getLeadCustomFields(leadId),
        ]);

        setFieldConfig(schemaRes.data);
        setValues(fieldsRes.data.customFields || {});
      } catch (error) {
        console.error('Failed to fetch industry fields:', error);
        toast.error('Failed to load industry fields');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [leadId]);

  // Handle field value change
  const handleFieldChange = useCallback((fieldKey: string, value: any) => {
    setValues((prev) => ({
      ...prev,
      [fieldKey]: value,
    }));
    setHasChanges(true);
    setErrors([]);
  }, []);

  // Handle save
  const handleSave = async () => {
    try {
      setSaving(true);
      const result = await industryFieldsService.updateLeadCustomFields(leadId, values);

      if (result.data.validationWarnings?.length > 0) {
        setErrors(result.data.validationWarnings);
      } else {
        toast.success('Custom fields saved successfully');
      }

      setHasChanges(false);
      onSave?.(values);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save custom fields');
    } finally {
      setSaving(false);
    }
  };

  // Render individual field
  const renderField = (field: IndustryField) => {
    const value = values[field.key];
    const fieldId = `field-${field.key}`;

    const baseInputClass =
      'w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed';
    const labelClass = 'block text-xs font-medium text-slate-600 mb-1';

    switch (field.type) {
      case 'text':
        return (
          <div key={field.key} className={field.gridSpan === 2 ? 'col-span-2' : ''}>
            <label htmlFor={fieldId} className={labelClass}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              id={fieldId}
              type="text"
              value={value || ''}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              disabled={readOnly}
              className={baseInputClass}
            />
            {field.helpText && <p className="text-xs text-slate-400 mt-1">{field.helpText}</p>}
          </div>
        );

      case 'number':
        return (
          <div key={field.key} className={field.gridSpan === 2 ? 'col-span-2' : ''}>
            <label htmlFor={fieldId} className={labelClass}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              id={fieldId}
              type="number"
              value={value ?? ''}
              onChange={(e) => handleFieldChange(field.key, e.target.value ? Number(e.target.value) : null)}
              placeholder={field.placeholder}
              min={field.min}
              max={field.max}
              disabled={readOnly}
              className={baseInputClass}
            />
            {field.helpText && <p className="text-xs text-slate-400 mt-1">{field.helpText}</p>}
          </div>
        );

      case 'currency':
        return (
          <div key={field.key} className={field.gridSpan === 2 ? 'col-span-2' : ''}>
            <label htmlFor={fieldId} className={labelClass}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-400 text-sm">
                {field.unit === 'INR' ? '\u20B9' : '$'}
              </span>
              <input
                id={fieldId}
                type="number"
                value={value ?? ''}
                onChange={(e) => handleFieldChange(field.key, e.target.value ? Number(e.target.value) : null)}
                placeholder={field.placeholder}
                disabled={readOnly}
                className={`${baseInputClass} pl-7`}
              />
            </div>
            {field.helpText && <p className="text-xs text-slate-400 mt-1">{field.helpText}</p>}
          </div>
        );

      case 'select':
        return (
          <div key={field.key} className={field.gridSpan === 2 ? 'col-span-2' : ''}>
            <label htmlFor={fieldId} className={labelClass}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <select
              id={fieldId}
              value={value || ''}
              onChange={(e) => handleFieldChange(field.key, e.target.value || null)}
              disabled={readOnly}
              className={baseInputClass}
            >
              <option value="">{field.placeholder || 'Select...'}</option>
              {field.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {field.helpText && <p className="text-xs text-slate-400 mt-1">{field.helpText}</p>}
          </div>
        );

      case 'multiselect':
        const selectedValues = Array.isArray(value) ? value : [];
        return (
          <div key={field.key} className={field.gridSpan === 2 ? 'col-span-2' : ''}>
            <label className={labelClass}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.options ? (
              <div className="flex flex-wrap gap-2 p-2 border border-slate-300 rounded-lg bg-white min-h-[40px]">
                {field.options.map((opt) => {
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
                        handleFieldChange(field.key, newValue);
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
            ) : (
              <input
                type="text"
                value={selectedValues.join(', ')}
                onChange={(e) =>
                  handleFieldChange(
                    field.key,
                    e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                  )
                }
                placeholder={field.placeholder || 'Enter comma-separated values'}
                disabled={readOnly}
                className={baseInputClass}
              />
            )}
            {field.helpText && <p className="text-xs text-slate-400 mt-1">{field.helpText}</p>}
          </div>
        );

      case 'date':
        return (
          <div key={field.key} className={field.gridSpan === 2 ? 'col-span-2' : ''}>
            <label htmlFor={fieldId} className={labelClass}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              id={fieldId}
              type="date"
              value={value || ''}
              onChange={(e) => handleFieldChange(field.key, e.target.value || null)}
              disabled={readOnly}
              className={baseInputClass}
            />
            {field.helpText && <p className="text-xs text-slate-400 mt-1">{field.helpText}</p>}
          </div>
        );

      case 'boolean':
        return (
          <div key={field.key} className={`flex items-center gap-3 ${field.gridSpan === 2 ? 'col-span-2' : ''}`}>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={value || false}
                onChange={(e) => handleFieldChange(field.key, e.target.checked)}
                disabled={readOnly}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
            <span className="text-sm text-slate-700">{field.label}</span>
            {field.helpText && <p className="text-xs text-slate-400">{field.helpText}</p>}
          </div>
        );

      case 'textarea':
        return (
          <div key={field.key} className={field.gridSpan === 2 ? 'col-span-2' : ''}>
            <label htmlFor={fieldId} className={labelClass}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <textarea
              id={fieldId}
              value={value || ''}
              onChange={(e) => handleFieldChange(field.key, e.target.value || null)}
              placeholder={field.placeholder}
              disabled={readOnly}
              rows={3}
              className={baseInputClass}
            />
            {field.helpText && <p className="text-xs text-slate-400 mt-1">{field.helpText}</p>}
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i}>
                <div className="h-4 bg-slate-200 rounded w-1/4 mb-2"></div>
                <div className="h-10 bg-slate-100 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!fieldConfig || fieldConfig.fields.length === 0) {
    return null; // No fields for this industry
  }

  const IndustryIcon = industryIcons[fieldConfig.icon] || BuildingOffice2Icon;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      {/* Header */}
      <div
        className="px-6 py-4 border-b border-slate-100 flex items-center justify-between"
        style={{ borderLeftColor: fieldConfig.color, borderLeftWidth: 4 }}
      >
        <div className="flex items-center gap-2">
          <IndustryIcon className="h-5 w-5" style={{ color: fieldConfig.color }} />
          <h3 className="text-sm font-semibold text-slate-900">
            {fieldConfig.label} Details
          </h3>
        </div>
        {!readOnly && hasChanges && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full"></div>
                Saving...
              </>
            ) : (
              <>
                <CheckIcon className="h-3.5 w-3.5" />
                Save Changes
              </>
            )}
          </button>
        )}
      </div>

      {/* Validation Errors */}
      {errors.length > 0 && (
        <div className="px-6 py-3 bg-amber-50 border-b border-amber-100">
          <div className="flex items-start gap-2">
            <ExclamationCircleIcon className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-amber-700">Validation Warnings:</p>
              <ul className="text-xs text-amber-600 mt-1 list-disc list-inside">
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Fields Grid */}
      <div className="p-6">
        <div className={`grid gap-4 ${compact ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
          {fieldConfig.fields.map(renderField)}
        </div>
      </div>
    </div>
  );
}

export default IndustryFieldsForm;
