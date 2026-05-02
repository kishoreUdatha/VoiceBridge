/**
 * CRM Integration Page
 * Connect external CRMs to automatically sync leads from voice conversations
 */

import React from 'react';
import { useCRMIntegration } from './hooks';
import {
  CRMLoadingState,
  CRMPageHeader,
  ActiveIntegrations,
  AddIntegrationSection,
  InfoSection,
  ConfigModal,
} from './components';

export const CRMIntegrationPage: React.FC = () => {
  const {
    configs,
    loading,
    showConfigModal,
    selectedConfig,
    selectedType,
    testing,
    saving,
    formData,
    handleAddCRM,
    handleEditConfig,
    handleSaveConfig,
    handleTestWebhook,
    handleToggleActive,
    handleDeleteConfig,
    handleFieldMappingChange,
    addFieldMapping,
    removeFieldMapping,
    copyToClipboard,
    closeModal,
    updateFormData,
  } = useCRMIntegration();

  if (loading) {
    return <CRMLoadingState />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        <CRMPageHeader />

        <ActiveIntegrations
          configs={configs}
          testing={testing}
          onTest={handleTestWebhook}
          onEdit={handleEditConfig}
          onDelete={handleDeleteConfig}
          onToggle={handleToggleActive}
          onCopy={copyToClipboard}
        />

        <AddIntegrationSection
          hasConfigs={configs.length > 0}
          onAdd={handleAddCRM}
        />

        <InfoSection />

        <ConfigModal
          show={showConfigModal}
          selectedType={selectedType}
          selectedConfig={selectedConfig}
          formData={formData}
          saving={saving}
          onClose={closeModal}
          onSave={handleSaveConfig}
          onFormChange={updateFormData}
          onFieldMappingChange={handleFieldMappingChange}
          onAddFieldMapping={addFieldMapping}
          onRemoveFieldMapping={removeFieldMapping}
        />
      </div>
    </div>
  );
};

export default CRMIntegrationPage;
