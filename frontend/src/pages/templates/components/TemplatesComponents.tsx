/**
 * Templates Components
 * TemplateCard, CreateEditModal, PreviewModal, EmptyState
 */

import React from 'react';
import {
  DocumentTextIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import {
  Template,
  Variable,
  TemplateFormData,
  PreviewData,
  SmsInfo,
} from '../templates.types';
import {
  typeIcons,
  typeColors,
  getWhatsAppStatusBadge,
  extractVariablesFromContent,
} from '../templates.constants';

// Filters Bar
interface FiltersBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  typeFilter: string;
  setTypeFilter: (filter: string) => void;
  categoryFilter: string;
  setCategoryFilter: (filter: string) => void;
  categories: string[];
}

export const FiltersBar: React.FC<FiltersBarProps> = ({
  searchQuery,
  setSearchQuery,
  typeFilter,
  setTypeFilter,
  categoryFilter,
  setCategoryFilter,
  categories,
}) => (
  <div className="flex flex-col sm:flex-row gap-3">
    {/* Search */}
    <div className="flex-1">
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow"
        />
      </div>
    </div>

    {/* Type Filter */}
    <div className="flex gap-2">
      {['', 'SMS', 'EMAIL', 'WHATSAPP'].map((type) => (
        <button
          key={type}
          onClick={() => setTypeFilter(type)}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            typeFilter === type
              ? 'bg-primary-600 text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          {type === '' ? 'All' : type}
        </button>
      ))}
    </div>

    {/* Category Filter */}
    {categories.length > 0 && (
      <select
        value={categoryFilter}
        onChange={(e) => setCategoryFilter(e.target.value)}
        className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
      >
        <option value="">All Categories</option>
        {categories.map((cat) => (
          <option key={cat} value={cat}>
            {cat}
          </option>
        ))}
      </select>
    )}
  </div>
);

// Template Card
interface TemplateCardProps {
  template: Template;
  onPreview: (template: Template) => void;
  onEdit?: (template: Template) => void;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
  canManage?: boolean;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  onPreview,
  onEdit,
  onDuplicate,
  onDelete,
  canManage = true,
}) => {
  const TypeIcon = typeIcons[template.type];
  const statusBadge = getWhatsAppStatusBadge(template.whatsappStatus);

  const typeColorMap = {
    SMS: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
    EMAIL: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
    WHATSAPP: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
  };

  const colors = typeColorMap[template.type];

  return (
    <div className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-200 overflow-hidden group">
      {/* Type indicator bar */}
      <div className={`h-1 ${colors.bg.replace('50', '400')}`} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${colors.bg} ${colors.border} border`}>
              <TypeIcon className={`h-5 w-5 ${colors.text}`} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                {template.name}
              </h3>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                <span className="font-medium">{template.type}</span>
                {template.category && (
                  <>
                    <span className="w-1 h-1 bg-gray-300 rounded-full" />
                    <span className="capitalize">{template.category}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          {template.isDefault && (
            <span className="px-2.5 py-1 bg-primary-50 text-primary-700 text-xs font-medium rounded-full border border-primary-200">
              Default
            </span>
          )}
        </div>

        {/* Subject for Email */}
        {template.subject && (
          <p className="text-sm font-medium text-gray-700 mb-2 truncate">
            Subject: {template.subject}
          </p>
        )}

        {/* Content preview */}
        <p className="text-sm text-gray-600 line-clamp-2 mb-4 leading-relaxed">
          {template.content}
        </p>

        {/* WhatsApp status */}
        {template.type === 'WHATSAPP' && (
          <div className="mb-4">
            <span className={statusBadge.className}>{statusBadge.label}</span>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Used {template.usageCount} times
          </span>
          {template.lastUsedAt && (
            <span>Last used {new Date(template.lastUsedAt).toLocaleDateString()}</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 pt-3 border-t border-gray-100">
          <button
            onClick={() => onPreview(template)}
            className={`${canManage ? 'flex-1' : 'flex-1'} flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors`}
          >
            <EyeIcon className="h-4 w-4" />
            Preview
          </button>
          {canManage && onEdit && (
            <button
              onClick={() => onEdit(template)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Edit"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
          )}
          {canManage && onDuplicate && (
            <button
              onClick={() => onDuplicate(template.id)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Duplicate"
            >
              <DocumentDuplicateIcon className="h-4 w-4" />
            </button>
          )}
          {canManage && onDelete && (
            <button
              onClick={() => onDelete(template.id)}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Empty State
interface EmptyStateProps {
  onCreateClick: () => void;
  onLoadDefaults?: () => void;
  loading?: boolean;
  canManage?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onCreateClick, onLoadDefaults, loading, canManage = true }) => (
  <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200 p-16 text-center">
    {/* Illustration */}
    <div className="w-24 h-24 mx-auto mb-6 bg-primary-50 rounded-2xl flex items-center justify-center">
      <svg className="w-12 h-12 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    </div>

    <h3 className="text-xl font-semibold text-gray-900 mb-2">
      {canManage ? 'Get Started with Templates' : 'No Templates Available'}
    </h3>
    <p className="text-gray-500 mb-8 max-w-md mx-auto">
      {canManage
        ? 'Templates help you send consistent messages faster. Load our professional pre-built templates or create your own.'
        : 'Templates will appear here once your admin creates them. Contact your administrator to set up templates.'}
    </p>

    {canManage && (
      <div className="flex items-center justify-center gap-4 mb-6">
        {onLoadDefaults && (
          <button
            onClick={onLoadDefaults}
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50"
          >
            {loading ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Loading Templates...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Load 30+ Templates
              </>
            )}
          </button>
        )}
        <button
          onClick={onCreateClick}
          className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          Create Custom
        </button>
      </div>
    )}

    {/* Template Categories Preview - Only for managers/admins */}
    {canManage && (
      <>
        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">Pre-built templates include</p>
          <div className="flex flex-wrap justify-center gap-2 max-w-xl mx-auto">
            {[
              { label: 'Welcome Messages', color: 'bg-green-100 text-green-700' },
              { label: 'Appointment Reminders', color: 'bg-blue-100 text-blue-700' },
              { label: 'Payment Reminders', color: 'bg-orange-100 text-orange-700' },
              { label: 'Order Confirmations', color: 'bg-purple-100 text-purple-700' },
              { label: 'Follow-ups', color: 'bg-yellow-100 text-yellow-700' },
              { label: 'Promotional Offers', color: 'bg-pink-100 text-pink-700' },
              { label: 'Feedback Requests', color: 'bg-cyan-100 text-cyan-700' },
              { label: 'Event Invitations', color: 'bg-indigo-100 text-indigo-700' },
            ].map((item) => (
              <span key={item.label} className={`px-3 py-1 ${item.color} text-xs font-medium rounded-full`}>
                {item.label}
              </span>
            ))}
          </div>
        </div>

        {/* Channel Icons */}
        <div className="mt-8 flex justify-center gap-8">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-2 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-700">SMS</p>
            <p className="text-xs text-gray-400">10 templates</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-2 bg-green-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-700">Email</p>
            <p className="text-xs text-gray-400">10 templates</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-2 bg-emerald-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-700">WhatsApp</p>
            <p className="text-xs text-gray-400">10 templates</p>
          </div>
        </div>
      </>
    )}
  </div>
);

// Create/Edit Modal
interface CreateEditModalProps {
  isOpen: boolean;
  isEditing: boolean;
  formData: TemplateFormData;
  setFormData: React.Dispatch<React.SetStateAction<TemplateFormData>>;
  formError: string;
  saving: boolean;
  categories: string[];
  variables: Variable[];
  smsInfo: SmsInfo | null;
  onClose: () => void;
  onSubmit: () => void;
  onInsertVariable: (variable: string) => void;
  onUpdateSmsInfo: (content: string) => void;
}

export const CreateEditModal: React.FC<CreateEditModalProps> = ({
  isOpen,
  isEditing,
  formData,
  setFormData,
  formError,
  saving,
  categories,
  variables,
  smsInfo,
  onClose,
  onSubmit,
  onInsertVariable,
  onUpdateSmsInfo,
}) => {
  if (!isOpen) return null;

  const contentVariables = extractVariablesFromContent(formData.content);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Edit Template' : 'Create New Template'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {formError}
            </div>
          )}

          {/* Type Selection - Tabs */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Template Type</label>
            <div className="flex gap-2">
              {['SMS', 'EMAIL', 'WHATSAPP'].map((type) => (
                <button
                  key={type}
                  onClick={() => !isEditing && setFormData({ ...formData, type: type as any })}
                  disabled={isEditing}
                  className={`flex-1 py-2.5 px-4 text-sm font-medium rounded-lg border transition-colors ${
                    formData.type === type
                      ? type === 'SMS'
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : type === 'EMAIL'
                        ? 'bg-green-50 border-green-300 text-green-700'
                        : 'bg-emerald-50 border-emerald-300 text-emerald-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  } ${isEditing ? 'cursor-not-allowed opacity-60' : ''}`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Name & Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Template Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="e.g., Welcome Message"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="e.g., marketing"
                list="categories"
              />
              <datalist id="categories">
                {categories.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Subject - Email only */}
          {formData.type === 'EMAIL' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Subject *</label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter email subject line"
              />
            </div>
          )}

          {/* Content */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">Message Content *</label>
              {formData.type === 'SMS' && smsInfo && (
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{smsInfo.length} chars</span>
                  <span>{smsInfo.segments} segment{smsInfo.segments > 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
            <textarea
              value={formData.content}
              onChange={(e) => {
                setFormData({ ...formData, content: e.target.value });
                onUpdateSmsInfo(e.target.value);
              }}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[140px] font-mono text-sm"
              placeholder="Type your message here. Use {{variableName}} for personalization."
            />
          </div>

          {/* Variables */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Insert Variable</label>
            <div className="flex flex-wrap gap-1.5">
              {variables.slice(0, 10).map((v) => (
                <button
                  key={v.key}
                  onClick={() => onInsertVariable(v.variable)}
                  className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-primary-50 hover:text-primary-700 rounded-md transition-colors"
                  title={v.description}
                >
                  {v.variable}
                </button>
              ))}
            </div>
          </div>

          {/* Sample Values */}
          {contentVariables.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Sample Values (for preview)
              </label>
              <div className="grid grid-cols-2 gap-3">
                {contentVariables.map((v) => (
                  <div key={v} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-mono bg-white px-2 py-1 rounded border">{`{{${v}}}`}</span>
                    <input
                      type="text"
                      value={formData.sampleValues[v] || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sampleValues: { ...formData.sampleValues, [v]: e.target.value },
                        })
                      }
                      className="flex-1 px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-primary-500"
                      placeholder={`Sample ${v}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* HTML Content - Email only */}
          {formData.type === 'EMAIL' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                HTML Content <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={formData.htmlContent}
                onChange={(e) => setFormData({ ...formData, htmlContent: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[80px] font-mono text-sm"
                placeholder="<html>...</html>"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={saving}
            className="px-5 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : isEditing ? 'Update Template' : 'Create Template'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Preview Modal
interface PreviewModalProps {
  isOpen: boolean;
  template: Template | null;
  previewData: PreviewData | null;
  onClose: () => void;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({
  isOpen,
  template,
  previewData,
  onClose,
}) => {
  if (!isOpen || !previewData || !template) return null;

  const typeColorMap = {
    SMS: 'bg-blue-500',
    EMAIL: 'bg-green-500',
    WHATSAPP: 'bg-emerald-500',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className={`px-6 py-4 ${typeColorMap[template.type]} text-white`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-80">{template.type} Template</p>
              <h3 className="text-lg font-semibold">{template.name}</h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Rendered Preview - Primary */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Preview</h4>
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
              {previewData.rendered.subject && (
                <div className="mb-3 pb-3 border-b border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Subject</p>
                  <p className="text-sm font-medium text-gray-900">{previewData.rendered.subject}</p>
                </div>
              )}
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {previewData.rendered.content}
              </p>
            </div>
          </div>

          {/* Original Template */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Original Template</h4>
            <div className="bg-gray-100 rounded-lg p-4">
              {previewData.original.subject && (
                <p className="text-xs font-mono text-gray-600 mb-2">
                  Subject: {previewData.original.subject}
                </p>
              )}
              <p className="text-xs font-mono text-gray-600 whitespace-pre-wrap">
                {previewData.original.content}
              </p>
            </div>
          </div>

          {/* Variables Used */}
          {previewData.variables.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Variables</h4>
              <div className="flex flex-wrap gap-2">
                {previewData.variables.map((v: string) => (
                  <span
                    key={v}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 text-xs rounded-lg"
                  >
                    <span className="font-mono text-gray-500">{`{{${v}}}`}</span>
                    <span className="text-gray-400">=</span>
                    <span className="font-medium">{previewData.sampleValues[v] || '(empty)'}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end bg-gray-50">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};
