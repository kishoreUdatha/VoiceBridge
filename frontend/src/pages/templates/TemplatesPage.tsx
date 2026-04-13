/**
 * Templates Page
 * Create and manage templates for SMS, Email, and WhatsApp messages
 */

import { PlusIcon } from '@heroicons/react/24/outline';
import { useTemplates } from './hooks';
import { usePermission } from '../../hooks/usePermission';
import {
  FiltersBar,
  TemplateCard,
  EmptyState,
  CreateEditModal,
  PreviewModal,
} from './components';

export default function TemplatesPage() {
  const { isManager } = usePermission();
  const canManage = isManager; // Admin, Manager, Super Admin can manage templates

  const {
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
  } = useTemplates();

  const handleOpenCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    resetForm();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Message Templates</h1>
          <p className="text-gray-500 mt-1">
            {canManage ? 'Create reusable templates for your campaigns' : 'View and use templates for your campaigns'}
          </p>
        </div>
        {canManage && (
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
          >
            <PlusIcon className="h-5 w-5" />
            Create Template
          </button>
        )}
      </div>

      {/* Filters */}
      <FiltersBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        categories={categories}
      />

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <EmptyState
          onCreateClick={handleOpenCreateModal}
          onLoadDefaults={canManage ? seedDefaultTemplates : undefined}
          loading={seeding}
          canManage={canManage}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onPreview={handlePreview}
              onEdit={canManage ? handleEdit : undefined}
              onDuplicate={canManage ? handleDuplicate : undefined}
              onDelete={canManage ? handleDelete : undefined}
              canManage={canManage}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <CreateEditModal
        isOpen={showCreateModal}
        isEditing={isEditing}
        formData={formData}
        setFormData={setFormData}
        formError={formError}
        saving={saving}
        categories={categories}
        variables={variables}
        smsInfo={smsInfo}
        onClose={handleCloseCreateModal}
        onSubmit={handleCreateOrUpdate}
        onInsertVariable={insertVariable}
        onUpdateSmsInfo={updateSmsInfo}
      />

      {/* Preview Modal */}
      <PreviewModal
        isOpen={showPreviewModal}
        template={selectedTemplate}
        previewData={previewData}
        onClose={closePreviewModal}
      />
    </div>
  );
}
