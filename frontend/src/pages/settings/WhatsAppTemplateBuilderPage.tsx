/**
 * WhatsApp Template Builder Page
 * Create and manage WhatsApp Business templates with media, buttons, and approval tracking
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageCircle,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Eye,
  X,
  Check,
  AlertCircle,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  Image,
  Video,
  FileText,
  Phone,
  ExternalLink,
  MessageSquare,
  Globe,
  ArrowLeft,
} from 'lucide-react';
import {
  templateService,
  MessageTemplate,
  CreateTemplateInput,
  TemplateButton,
  TEMPLATE_VARIABLES,
} from '../../services/template.service';

interface ToastState {
  type: 'success' | 'error';
  message: string;
}

const WHATSAPP_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'en_US', label: 'English (US)' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'mr', label: 'Marathi' },
  { code: 'bn', label: 'Bengali' },
  { code: 'gu', label: 'Gujarati' },
  { code: 'kn', label: 'Kannada' },
  { code: 'ml', label: 'Malayalam' },
];

const HEADER_TYPES = [
  { value: 'TEXT', label: 'Text', icon: MessageSquare },
  { value: 'IMAGE', label: 'Image', icon: Image },
  { value: 'VIDEO', label: 'Video', icon: Video },
  { value: 'DOCUMENT', label: 'Document', icon: FileText },
];

const BUTTON_TYPES = [
  { value: 'URL', label: 'Visit Website', icon: ExternalLink },
  { value: 'CALL', label: 'Call Phone Number', icon: Phone },
  { value: 'QUICK_REPLY', label: 'Quick Reply', icon: MessageSquare },
];

export default function WhatsAppTemplateBuilderPage() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [toast, setToast] = useState<ToastState | null>(null);

  // Editor state
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [formData, setFormData] = useState<CreateTemplateInput>({
    name: '',
    type: 'WHATSAPP',
    content: '',
    category: 'MARKETING',
    headerType: undefined,
    headerContent: '',
    footerContent: '',
    buttons: [],
    whatsappLanguage: 'en',
  });
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const { templates: data } = await templateService.getTemplates({ type: 'WHATSAPP' });
      setTemplates(data);
    } catch {
      setToast({ type: 'error', message: 'Failed to load templates' });
    } finally {
      setLoading(false);
    }
  }, []);

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.whatsappStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openCreateEditor = () => {
    setEditingTemplate(null);
    setFormData({
      name: '',
      type: 'WHATSAPP',
      content: '',
      category: 'MARKETING',
      headerType: undefined,
      headerContent: '',
      footerContent: '',
      buttons: [],
      whatsappLanguage: 'en',
    });
    setShowEditor(true);
    setShowPreview(false);
  };

  const openEditEditor = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      type: 'WHATSAPP',
      content: template.content,
      category: template.category || 'MARKETING',
      headerType: template.headerType as any,
      headerContent: template.headerContent || '',
      footerContent: template.footerContent || '',
      buttons: template.buttons || [],
      whatsappLanguage: template.whatsappLanguage || 'en',
    });
    setShowEditor(true);
    setShowPreview(false);
  };

  const closeEditor = () => {
    setShowEditor(false);
    setEditingTemplate(null);
    setShowPreview(false);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setToast({ type: 'error', message: 'Template name is required' });
      return;
    }
    if (!formData.content.trim()) {
      setToast({ type: 'error', message: 'Message body is required' });
      return;
    }

    try {
      setSaving(true);
      if (editingTemplate) {
        await templateService.update(editingTemplate.id, formData);
        setToast({ type: 'success', message: 'Template updated successfully' });
      } else {
        await templateService.create(formData);
        setToast({ type: 'success', message: 'Template created successfully' });
      }
      closeEditor();
      fetchTemplates();
    } catch (err: any) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to save template' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this template? This action cannot be undone.')) return;

    try {
      await templateService.delete(id);
      setToast({ type: 'success', message: 'Template deleted' });
      fetchTemplates();
    } catch {
      setToast({ type: 'error', message: 'Failed to delete template' });
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await templateService.duplicate(id);
      setToast({ type: 'success', message: 'Template duplicated' });
      fetchTemplates();
    } catch {
      setToast({ type: 'error', message: 'Failed to duplicate template' });
    }
  };

  const addButton = () => {
    if ((formData.buttons?.length || 0) >= 3) {
      setToast({ type: 'error', message: 'Maximum 3 buttons allowed' });
      return;
    }
    setFormData(prev => ({
      ...prev,
      buttons: [...(prev.buttons || []), { type: 'QUICK_REPLY', text: '' }],
    }));
  };

  const updateButton = (index: number, updates: Partial<TemplateButton>) => {
    setFormData(prev => ({
      ...prev,
      buttons: (prev.buttons || []).map((btn, i) => i === index ? { ...btn, ...updates } : btn),
    }));
  };

  const removeButton = (index: number) => {
    setFormData(prev => ({
      ...prev,
      buttons: (prev.buttons || []).filter((_, i) => i !== index),
    }));
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full">
            <CheckCircle className="w-3 h-3" />
            Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
    }
  };

  const insertVariable = (variable: string) => {
    setFormData(prev => ({
      ...prev,
      content: prev.content + `{{${variable}}}`,
    }));
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
          toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}

      {!showEditor ? (
        <>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Link to="/settings" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <MessageCircle className="w-7 h-7 text-green-600" />
                  WhatsApp Templates
                </h1>
                <p className="text-slate-500 mt-1">
                  Create WhatsApp Business API templates with media and buttons
                </p>
              </div>
            </div>
            <button
              onClick={openCreateEditor}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Template
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search templates..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Status</option>
              <option value="APPROVED">Approved</option>
              <option value="PENDING">Pending</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          {/* Templates List */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full mx-auto"></div>
                <p className="text-slate-500 mt-3">Loading templates...</p>
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="p-8 text-center">
                <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No WhatsApp templates found</p>
                <button
                  onClick={openCreateEditor}
                  className="mt-4 text-green-600 hover:text-green-700 font-medium"
                >
                  Create your first template
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="p-2 bg-green-100 rounded-lg">
                      <MessageCircle className="w-5 h-5 text-green-600" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-slate-800">{template.name}</h3>
                        {getStatusBadge(template.whatsappStatus)}
                        {template.whatsappLanguage && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">
                            <Globe className="w-3 h-3" />
                            {WHATSAPP_LANGUAGES.find(l => l.code === template.whatsappLanguage)?.label || template.whatsappLanguage}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5 truncate">{template.content}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {template.headerType && (
                          <span className="text-xs text-slate-400">
                            {HEADER_TYPES.find(h => h.value === template.headerType)?.label} header
                          </span>
                        )}
                        {template.buttons && template.buttons.length > 0 && (
                          <span className="text-xs text-slate-400">
                            {template.buttons.length} button{template.buttons.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditEditor(template)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDuplicate(template.id)}
                        className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg"
                        title="Duplicate"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(template.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        /* Editor View */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Editor Form */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <button onClick={closeEditor} className="p-1 hover:bg-slate-100 rounded">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
                <h2 className="text-lg font-semibold text-slate-800">
                  {editingTemplate ? 'Edit Template' : 'Create WhatsApp Template'}
                </h2>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Save
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Template Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., order_confirmation"
                />
                <p className="text-xs text-slate-500 mt-1">Lowercase, underscores only. Used for WhatsApp API.</p>
              </div>

              {/* Language */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Language *</label>
                <select
                  value={formData.whatsappLanguage}
                  onChange={(e) => setFormData(prev => ({ ...prev, whatsappLanguage: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {WHATSAPP_LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>{lang.label}</option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="MARKETING">Marketing</option>
                  <option value="UTILITY">Utility</option>
                  <option value="AUTHENTICATION">Authentication</option>
                </select>
              </div>

              {/* Header */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Header (Optional)</label>
                <div className="flex gap-2 mb-2">
                  {HEADER_TYPES.map(header => {
                    const Icon = header.icon;
                    return (
                      <button
                        key={header.value}
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          headerType: prev.headerType === header.value ? undefined : header.value as any,
                        }))}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border transition-colors ${
                          formData.headerType === header.value
                            ? 'bg-green-50 border-green-200 text-green-700'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {header.label}
                      </button>
                    );
                  })}
                </div>
                {formData.headerType === 'TEXT' && (
                  <input
                    type="text"
                    value={formData.headerContent}
                    onChange={(e) => setFormData(prev => ({ ...prev, headerContent: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Header text..."
                    maxLength={60}
                  />
                )}
                {(formData.headerType === 'IMAGE' || formData.headerType === 'VIDEO' || formData.headerType === 'DOCUMENT') && (
                  <input
                    type="text"
                    value={formData.headerContent}
                    onChange={(e) => setFormData(prev => ({ ...prev, headerContent: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Media URL..."
                  />
                )}
              </div>

              {/* Body */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-slate-700">Message Body *</label>
                  <span className="text-xs text-slate-400">{formData.content.length}/1024</span>
                </div>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[120px]"
                  placeholder="Hello {{firstName}}, thank you for your order..."
                  maxLength={1024}
                />
                <div className="flex flex-wrap gap-1 mt-2">
                  <span className="text-xs text-slate-500">Variables:</span>
                  {TEMPLATE_VARIABLES.slice(0, 6).map(v => (
                    <button
                      key={v.key}
                      onClick={() => insertVariable(v.key)}
                      className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded hover:bg-amber-200"
                    >
                      {`{{${v.key}}}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Footer (Optional)</label>
                <input
                  type="text"
                  value={formData.footerContent}
                  onChange={(e) => setFormData(prev => ({ ...prev, footerContent: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., Reply STOP to unsubscribe"
                  maxLength={60}
                />
              </div>

              {/* Buttons */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-700">Buttons (Optional)</label>
                  <button
                    onClick={addButton}
                    className="text-sm text-green-600 hover:text-green-700"
                    disabled={(formData.buttons?.length || 0) >= 3}
                  >
                    + Add Button
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.buttons?.map((button, index) => (
                    <div key={index} className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg">
                      <select
                        value={button.type}
                        onChange={(e) => updateButton(index, { type: e.target.value as any })}
                        className="px-2 py-1.5 border border-slate-200 rounded text-sm"
                      >
                        {BUTTON_TYPES.map(bt => (
                          <option key={bt.value} value={bt.value}>{bt.label}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={button.text}
                        onChange={(e) => updateButton(index, { text: e.target.value })}
                        className="flex-1 px-2 py-1.5 border border-slate-200 rounded text-sm"
                        placeholder="Button text"
                        maxLength={25}
                      />
                      {button.type === 'URL' && (
                        <input
                          type="text"
                          value={button.url || ''}
                          onChange={(e) => updateButton(index, { url: e.target.value })}
                          className="flex-1 px-2 py-1.5 border border-slate-200 rounded text-sm"
                          placeholder="https://..."
                        />
                      )}
                      {button.type === 'CALL' && (
                        <input
                          type="text"
                          value={button.phoneNumber || ''}
                          onChange={(e) => updateButton(index, { phoneNumber: e.target.value })}
                          className="flex-1 px-2 py-1.5 border border-slate-200 rounded text-sm"
                          placeholder="+91..."
                        />
                      )}
                      <button
                        onClick={() => removeButton(index)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-slate-100 rounded-xl p-6">
            <h3 className="text-sm font-medium text-slate-700 mb-4 flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Preview
            </h3>
            <div className="max-w-sm mx-auto">
              {/* Phone frame */}
              <div className="bg-[#e5ddd5] rounded-2xl p-4 min-h-[400px]">
                {/* Message bubble */}
                <div className="bg-white rounded-lg p-3 shadow-sm max-w-[90%]">
                  {/* Header */}
                  {formData.headerType === 'TEXT' && formData.headerContent && (
                    <p className="font-semibold text-slate-800 mb-2">{formData.headerContent}</p>
                  )}
                  {formData.headerType === 'IMAGE' && (
                    <div className="bg-slate-200 h-32 rounded mb-2 flex items-center justify-center">
                      <Image className="w-8 h-8 text-slate-400" />
                    </div>
                  )}
                  {formData.headerType === 'VIDEO' && (
                    <div className="bg-slate-200 h-32 rounded mb-2 flex items-center justify-center">
                      <Video className="w-8 h-8 text-slate-400" />
                    </div>
                  )}
                  {formData.headerType === 'DOCUMENT' && (
                    <div className="bg-slate-200 h-16 rounded mb-2 flex items-center justify-center gap-2">
                      <FileText className="w-6 h-6 text-slate-400" />
                      <span className="text-sm text-slate-500">Document</span>
                    </div>
                  )}

                  {/* Body */}
                  <p className="text-slate-800 text-sm whitespace-pre-wrap">
                    {formData.content || 'Your message will appear here...'}
                  </p>

                  {/* Footer */}
                  {formData.footerContent && (
                    <p className="text-slate-400 text-xs mt-2">{formData.footerContent}</p>
                  )}

                  {/* Time */}
                  <p className="text-right text-xs text-slate-400 mt-1">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                {/* Buttons */}
                {formData.buttons && formData.buttons.length > 0 && (
                  <div className="mt-1 space-y-1">
                    {formData.buttons.map((btn, i) => (
                      <button
                        key={i}
                        className="w-full bg-white rounded-lg p-2 text-center text-sm text-blue-500 font-medium shadow-sm flex items-center justify-center gap-1"
                      >
                        {btn.type === 'URL' && <ExternalLink className="w-3 h-3" />}
                        {btn.type === 'CALL' && <Phone className="w-3 h-3" />}
                        {btn.text || 'Button'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
