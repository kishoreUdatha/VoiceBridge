/**
 * Create Campaign Page
 * Multi-step wizard for creating outbound call campaigns
 */

import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { useCampaignForm } from './hooks';
import { StepIndicators, Step1SelectAgent, Step2AddContacts, Step3Settings } from './components';

export const CreateCampaignPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialSource = searchParams.get('source') || undefined;

  const {
    agents,
    leads,
    rawImportRecords,
    contacts,
    formData,
    contactSource,
    selectedLeadIds,
    selectedRawImportIds,
    selectAll,
    selectAllRawImports,
    leadFilter,
    rawImportFilter,
    step,
    loading,
    loadingLeads,
    loadingRawImports,
    submitting,
    error,
    setFormData,
    setContactSource,
    setLeadFilter,
    setRawImportFilter,
    setStep,
    addContact,
    removeContact,
    updateContact,
    toggleLeadSelection,
    toggleRawImportSelection,
    handleSelectAll,
    handleSelectAllRawImports,
    handleFileUpload,
    validateStep1,
    validateStep2,
    handleSubmit,
  } = useCampaignForm(initialSource);

  const handleNext1 = () => {
    if (validateStep1()) setStep(2);
  };

  const handleNext2 = () => {
    if (validateStep2()) setStep(3);
  };

  const onSubmit = async () => {
    const success = await handleSubmit();
    if (success) {
      navigate('/outbound-calls');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/outbound-calls')}
            className="p-2 hover:bg-white rounded-lg"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Create Campaign</h1>
        </div>

        {/* Step Indicators */}
        <StepIndicators step={step} />

        {/* Global Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {/* Step 1: Select Agent */}
        {step === 1 && (
          <Step1SelectAgent
            formData={formData}
            agents={agents}
            loading={loading}
            error={error}
            onFormChange={setFormData}
            onNext={handleNext1}
          />
        )}

        {/* Step 2: Add Contacts */}
        {step === 2 && (
          <Step2AddContacts
            contactSource={contactSource}
            leads={leads}
            rawImportRecords={rawImportRecords}
            contacts={contacts}
            selectedLeadIds={selectedLeadIds}
            selectedRawImportIds={selectedRawImportIds}
            selectAll={selectAll}
            selectAllRawImports={selectAllRawImports}
            leadFilter={leadFilter}
            rawImportFilter={rawImportFilter}
            loadingLeads={loadingLeads}
            loadingRawImports={loadingRawImports}
            error={error}
            onContactSourceChange={setContactSource}
            onLeadFilterChange={setLeadFilter}
            onRawImportFilterChange={setRawImportFilter}
            onToggleLeadSelection={toggleLeadSelection}
            onToggleRawImportSelection={toggleRawImportSelection}
            onSelectAll={handleSelectAll}
            onSelectAllRawImports={handleSelectAllRawImports}
            onAddContact={addContact}
            onRemoveContact={removeContact}
            onUpdateContact={updateContact}
            onFileUpload={handleFileUpload}
            onBack={() => setStep(1)}
            onNext={handleNext2}
          />
        )}

        {/* Step 3: Settings */}
        {step === 3 && (
          <Step3Settings
            formData={formData}
            agents={agents}
            contactSource={contactSource}
            selectedLeadIds={selectedLeadIds}
            selectedRawImportIds={selectedRawImportIds}
            contacts={contacts}
            submitting={submitting}
            onFormChange={setFormData}
            onBack={() => setStep(2)}
            onSubmit={onSubmit}
          />
        )}
      </div>
    </div>
  );
};

export default CreateCampaignPage;
