/**
 * Templates Hook
 * Handles state management and API calls for templates
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';
import {
  Template,
  Variable,
  TemplateFormData,
  PreviewData,
  SmsInfo,
  initialFormData,
} from '../templates.types';

interface UseTemplatesReturn {
  // Data
  templates: Template[];
  variables: Variable[];
  categories: string[];
  loading: boolean;
  seeding: boolean;

  // Filters
  typeFilter: string;
  setTypeFilter: (filter: string) => void;
  categoryFilter: string;
  setCategoryFilter: (filter: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Form state
  formData: TemplateFormData;
  setFormData: React.Dispatch<React.SetStateAction<TemplateFormData>>;
  formError: string;
  saving: boolean;
  isEditing: boolean;
  smsInfo: SmsInfo | null;

  // Modals
  showCreateModal: boolean;
  setShowCreateModal: (show: boolean) => void;
  showPreviewModal: boolean;
  setShowPreviewModal: (show: boolean) => void;
  selectedTemplate: Template | null;
  previewData: PreviewData | null;

  // Actions
  handleCreateOrUpdate: () => Promise<void>;
  handleDelete: (id: string) => Promise<void>;
  handleDuplicate: (id: string) => Promise<void>;
  handlePreview: (template: Template) => Promise<void>;
  handleEdit: (template: Template) => void;
  resetForm: () => void;
  insertVariable: (variable: string) => void;
  updateSmsInfo: (content: string) => Promise<void>;
  closePreviewModal: () => void;
  seedDefaultTemplates: () => Promise<void>;
}

export function useTemplates(): UseTemplatesReturn {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [variables, setVariables] = useState<Variable[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [formData, setFormData] = useState<TemplateFormData>(initialFormData);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [smsInfo, setSmsInfo] = useState<SmsInfo | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.append('type', typeFilter);
      if (categoryFilter) params.append('category', categoryFilter);
      if (searchQuery) params.append('search', searchQuery);

      const response = await api.get(`/templates?${params.toString()}`);
      setTemplates(response.data.data);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, categoryFilter, searchQuery]);

  const fetchVariables = useCallback(async () => {
    try {
      const response = await api.get('/templates/variables');
      setVariables(response.data.data);
    } catch (error) {
      console.error('Failed to fetch variables:', error);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await api.get('/templates/categories');
      setCategories(response.data.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
    fetchVariables();
    fetchCategories();
  }, [fetchTemplates, fetchVariables, fetchCategories]);

  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setSelectedTemplate(null);
    setIsEditing(false);
    setFormError('');
    setSmsInfo(null);
  }, []);

  const handleCreateOrUpdate = useCallback(async () => {
    if (!formData.name || !formData.content) {
      setFormError('Name and content are required');
      return;
    }

    if (formData.type === 'EMAIL' && !formData.subject) {
      setFormError('Subject is required for email templates');
      return;
    }

    setSaving(true);
    setFormError('');

    try {
      if (isEditing && selectedTemplate) {
        await api.put(`/templates/${selectedTemplate.id}`, formData);
      } else {
        await api.post('/templates', formData);
      }
      fetchTemplates();
      resetForm();
      setShowCreateModal(false);
    } catch (error: any) {
      setFormError(error.response?.data?.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  }, [formData, isEditing, selectedTemplate, fetchTemplates, resetForm]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm('Are you sure you want to delete this template?')) return;

      try {
        await api.delete(`/templates/${id}`);
        fetchTemplates();
      } catch (error) {
        console.error('Failed to delete template:', error);
      }
    },
    [fetchTemplates]
  );

  const handleDuplicate = useCallback(
    async (id: string) => {
      try {
        await api.post(`/templates/${id}/duplicate`);
        fetchTemplates();
      } catch (error) {
        console.error('Failed to duplicate template:', error);
      }
    },
    [fetchTemplates]
  );

  const handlePreview = useCallback(async (template: Template) => {
    try {
      const response = await api.get(`/templates/${template.id}/preview`);
      setPreviewData(response.data.data);
      setSelectedTemplate(template);
      setShowPreviewModal(true);
    } catch (error) {
      console.error('Failed to preview template:', error);
    }
  }, []);

  const handleEdit = useCallback((template: Template) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      type: template.type,
      category: template.category || '',
      subject: template.subject || '',
      content: template.content,
      htmlContent: template.htmlContent || '',
      sampleValues: template.sampleValues || {},
    });
    setIsEditing(true);
    setShowCreateModal(true);
  }, []);

  const insertVariable = useCallback((variable: string) => {
    setFormData((prev) => ({
      ...prev,
      content: prev.content + variable,
    }));
  }, []);

  const updateSmsInfo = useCallback(
    async (content: string) => {
      if (formData.type !== 'SMS') {
        setSmsInfo(null);
        return;
      }
      try {
        const response = await api.post('/templates/sms-info', { content });
        setSmsInfo(response.data.data);
      } catch (error) {
        console.error('Failed to get SMS info:', error);
      }
    },
    [formData.type]
  );

  const closePreviewModal = useCallback(() => {
    setShowPreviewModal(false);
    setPreviewData(null);
    setSelectedTemplate(null);
  }, []);

  const seedDefaultTemplates = useCallback(async () => {
    setSeeding(true);
    try {
      const response = await api.post('/templates/seed');
      if (response.data.created > 0) {
        fetchTemplates();
      }
    } catch (error) {
      console.error('Failed to seed templates:', error);
    } finally {
      setSeeding(false);
    }
  }, [fetchTemplates]);

  return {
    templates,
    variables,
    categories,
    loading,
    seeding,
    typeFilter,
    setTypeFilter,
    categoryFilter,
    setCategoryFilter,
    searchQuery,
    setSearchQuery,
    formData,
    setFormData,
    formError,
    saving,
    isEditing,
    smsInfo,
    showCreateModal,
    setShowCreateModal,
    showPreviewModal,
    setShowPreviewModal,
    selectedTemplate,
    previewData,
    handleCreateOrUpdate,
    handleDelete,
    handleDuplicate,
    handlePreview,
    handleEdit,
    resetForm,
    insertVariable,
    updateSmsInfo,
    closePreviewModal,
    seedDefaultTemplates,
  };
}

export default useTemplates;
