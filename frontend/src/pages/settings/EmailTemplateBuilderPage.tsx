/**
 * Email Template Builder Page
 * WYSIWYG email template editor with preview and variable management
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Mail,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  X,
  Check,
  AlertCircle,
  Search,
  ChevronDown,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link,
  Image,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Code,
  Variable,
  Send,
  ToggleLeft,
  ToggleRight,
  ArrowLeft,
} from 'lucide-react';
import {
  templateService,
  MessageTemplate,
  CreateTemplateInput,
  TEMPLATE_VARIABLES,
} from '../../services/template.service';

interface ToastState {
  type: 'success' | 'error';
  message: string;
}

export default function EmailTemplateBuilderPage() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<ToastState | null>(null);

  // Editor state
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [formData, setFormData] = useState<CreateTemplateInput>({
    name: '',
    type: 'EMAIL',
    subject: '',
    content: '',
    htmlContent: '',
    category: '',
    sampleValues: {},
  });
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [showVariables, setShowVariables] = useState(false);
  const [saving, setSaving] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const isEditorInitialized = useRef(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Initialize editor content when opening editor or switching templates
  useEffect(() => {
    if (showEditor && editorRef.current && !isEditorInitialized.current) {
      editorRef.current.innerHTML = formData.htmlContent || formData.content || '';
      isEditorInitialized.current = true;
    }
  }, [showEditor, formData.htmlContent, formData.content]);

  // Reset initialization flag when editor closes
  useEffect(() => {
    if (!showEditor) {
      isEditorInitialized.current = false;
    }
  }, [showEditor]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const { templates: data } = await templateService.getTemplates({ type: 'EMAIL' });
      setTemplates(data);
    } catch {
      setToast({ type: 'error', message: 'Failed to load templates' });
    } finally {
      setLoading(false);
    }
  }, []);

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.subject?.toLowerCase().includes(search.toLowerCase())
  );

  const openCreateEditor = () => {
    setEditingTemplate(null);
    setFormData({
      name: '',
      type: 'EMAIL',
      subject: '',
      content: '',
      htmlContent: '',
      category: '',
      sampleValues: {},
    });
    setShowEditor(true);
    setShowPreview(false);
  };

  const openEditEditor = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      type: 'EMAIL',
      subject: template.subject || '',
      content: template.content,
      htmlContent: template.htmlContent || '',
      category: template.category || '',
      sampleValues: template.sampleValues || {},
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
    if (!formData.subject?.trim()) {
      setToast({ type: 'error', message: 'Email subject is required' });
      return;
    }
    if (!formData.content.trim() && !formData.htmlContent?.trim()) {
      setToast({ type: 'error', message: 'Email content is required' });
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

  const insertVariable = (variable: string) => {
    const placeholder = `{{${variable}}}`;
    setFormData(prev => ({
      ...prev,
      content: prev.content + placeholder,
      htmlContent: (prev.htmlContent || '') + placeholder,
    }));
    setShowVariables(false);
  };

  const updatePreview = useCallback(() => {
    let html = formData.htmlContent || formData.content;

    // Replace variables with sample values
    TEMPLATE_VARIABLES.forEach(v => {
      const regex = new RegExp(`{{${v.key}}}`, 'g');
      const value = formData.sampleValues?.[v.key] || v.example;
      html = html.replace(regex, `<span style="background: #fef3c7; padding: 2px 4px; border-radius: 2px;">${value}</span>`);
    });

    setPreviewHtml(html);
  }, [formData]);

  useEffect(() => {
    if (showPreview) {
      updatePreview();
    }
  }, [showPreview, updatePreview]);

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setFormData(prev => ({
        ...prev,
        htmlContent: editorRef.current?.innerHTML || '',
        content: editorRef.current?.innerText || '',
      }));
    }
  };

  const handleEditorInput = () => {
    if (editorRef.current) {
      setFormData(prev => ({
        ...prev,
        htmlContent: editorRef.current?.innerHTML || '',
        content: editorRef.current?.innerText || '',
      }));
    }
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
            <div>
              <div className="flex items-center gap-3">
                <RouterLink to="/settings" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <ArrowLeft className="w-5 h-5 text-slate-600" />
                </RouterLink>
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <Mail className="w-7 h-7 text-primary-600" />
                  Email Templates
                </h1>
              </div>
              <p className="text-slate-500 mt-1 ml-12">
                Create and manage email templates with dynamic variables
              </p>
            </div>
            <button
              onClick={openCreateEditor}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Template
            </button>
          </div>

          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search templates..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Templates List */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full mx-auto"></div>
                <p className="text-slate-500 mt-3">Loading templates...</p>
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="p-8 text-center">
                <Mail className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">
                  {search ? 'No templates match your search' : 'No email templates yet'}
                </p>
                {!search && (
                  <button
                    onClick={openCreateEditor}
                    className="mt-4 text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Create your first template
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    className={`flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors ${
                      !template.isActive ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Mail className="w-5 h-5 text-blue-600" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-slate-800">{template.name}</h3>
                        {template.isDefault && (
                          <span className="px-1.5 py-0.5 bg-primary-100 text-primary-600 text-xs rounded">Default</span>
                        )}
                        {!template.isActive && (
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-xs rounded">Inactive</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5 truncate">
                        Subject: {template.subject || '(No subject)'}
                      </p>
                      {template.category && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">
                          {template.category}
                        </span>
                      )}
                    </div>

                    <div className="text-right text-sm text-slate-400">
                      <p>Used {template.usageCount} times</p>
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
        <div className="bg-white rounded-xl shadow-sm border border-slate-100">
          {/* Editor Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <button onClick={closeEditor} className="p-1 hover:bg-slate-100 rounded">
                <X className="w-5 h-5 text-slate-400" />
              </button>
              <h2 className="text-lg font-semibold text-slate-800">
                {editingTemplate ? 'Edit Template' : 'Create Email Template'}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${
                  showPreview
                    ? 'bg-primary-50 border-primary-200 text-primary-600'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showPreview ? 'Edit' : 'Preview'}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Save
              </button>
            </div>
          </div>

          <div className="flex">
            {/* Editor Panel */}
            <div className={`flex-1 p-4 ${showPreview ? 'border-r border-slate-100' : ''}`}>
              {!showPreview ? (
                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Template Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="e.g., Welcome Email"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="e.g., Onboarding, Marketing"
                    />
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Subject Line *</label>
                    <input
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="e.g., Welcome to {{orgName}}, {{firstName}}!"
                    />
                  </div>

                  {/* Toolbar */}
                  <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50 rounded-lg border border-slate-200">
                    <button
                      onClick={() => execCommand('bold')}
                      className="p-2 hover:bg-white rounded"
                      title="Bold"
                    >
                      <Bold className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => execCommand('italic')}
                      className="p-2 hover:bg-white rounded"
                      title="Italic"
                    >
                      <Italic className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => execCommand('underline')}
                      className="p-2 hover:bg-white rounded"
                      title="Underline"
                    >
                      <Underline className="w-4 h-4" />
                    </button>
                    <div className="w-px h-6 bg-slate-300 mx-1" />
                    <button
                      onClick={() => execCommand('insertUnorderedList')}
                      className="p-2 hover:bg-white rounded"
                      title="Bullet List"
                    >
                      <List className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => execCommand('insertOrderedList')}
                      className="p-2 hover:bg-white rounded"
                      title="Numbered List"
                    >
                      <ListOrdered className="w-4 h-4" />
                    </button>
                    <div className="w-px h-6 bg-slate-300 mx-1" />
                    <button
                      onClick={() => execCommand('justifyLeft')}
                      className="p-2 hover:bg-white rounded"
                      title="Align Left"
                    >
                      <AlignLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => execCommand('justifyCenter')}
                      className="p-2 hover:bg-white rounded"
                      title="Align Center"
                    >
                      <AlignCenter className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => execCommand('justifyRight')}
                      className="p-2 hover:bg-white rounded"
                      title="Align Right"
                    >
                      <AlignRight className="w-4 h-4" />
                    </button>
                    <div className="w-px h-6 bg-slate-300 mx-1" />
                    <button
                      onClick={() => {
                        const url = prompt('Enter URL:');
                        if (url) execCommand('createLink', url);
                      }}
                      className="p-2 hover:bg-white rounded"
                      title="Insert Link"
                    >
                      <Link className="w-4 h-4" />
                    </button>
                    <div className="flex-1" />
                    <div className="relative">
                      <button
                        onClick={() => setShowVariables(!showVariables)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-amber-100 text-amber-700 rounded hover:bg-amber-200"
                      >
                        <Variable className="w-4 h-4" />
                        Insert Variable
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      {showVariables && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setShowVariables(false)} />
                          <div className="absolute right-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-slate-100 z-20 max-h-64 overflow-y-auto">
                            {TEMPLATE_VARIABLES.map(v => (
                              <button
                                key={v.key}
                                onClick={() => insertVariable(v.key)}
                                className="w-full px-3 py-2 text-left hover:bg-slate-50 text-sm"
                              >
                                <span className="font-medium text-slate-800">{`{{${v.key}}}`}</span>
                                <span className="text-slate-500 ml-2">{v.label}</span>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Content Editor */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email Content *</label>
                    <div
                      ref={editorRef}
                      contentEditable
                      suppressContentEditableWarning
                      dir="ltr"
                      onInput={handleEditorInput}
                      className="min-h-[300px] p-4 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 prose prose-sm max-w-none text-left"
                      style={{ minHeight: '300px', direction: 'ltr', textAlign: 'left' }}
                    />
                  </div>
                </div>
              ) : null}
            </div>

            {/* Preview Panel */}
            {showPreview && (
              <div className="flex-1 p-4">
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-slate-700 mb-2">Preview</h3>
                  <div className="bg-slate-100 rounded-lg p-3">
                    <p className="text-xs text-slate-500 mb-1">Subject:</p>
                    <p className="font-medium text-slate-800">{formData.subject}</p>
                  </div>
                </div>
                <div className="border border-slate-200 rounded-lg p-4 bg-white min-h-[400px]">
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
