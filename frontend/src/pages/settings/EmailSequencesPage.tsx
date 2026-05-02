/**
 * Email Sequences Page
 * Create automated email drip campaigns for lead nurturing
 */

import React from 'react';
import { useEmailSequences } from './hooks';
import {
  EmailLoadingState,
  ErrorAlert,
  SuccessAlert,
  EmailHeader,
  EmailEmptyState,
  SequenceCard,
  CreateSequenceModal,
  AddStepModal,
} from './components';

const EmailSequencesPage: React.FC = () => {
  const {
    sequences,
    loading,
    showModal,
    showStepModal,
    selectedSequence,
    error,
    success,
    formData,
    stepFormData,
    setShowModal,
    setFormData,
    setStepFormData,
    handleCreate,
    handleDelete,
    handleToggle,
    handleAddStep,
    handleDeleteStep,
    openStepModal,
    closeModal,
    closeStepModal,
    clearError,
    clearSuccess,
  } = useEmailSequences();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl">
        <EmailHeader onCreateClick={() => setShowModal(true)} />

        {error && <ErrorAlert message={error} onClose={clearError} />}
        {success && <SuccessAlert message={success} onClose={clearSuccess} />}

        {loading && sequences.length === 0 ? (
          <EmailLoadingState />
        ) : sequences.length === 0 ? (
          <EmailEmptyState onCreateClick={() => setShowModal(true)} />
        ) : (
          <div className="space-y-4">
            {sequences.map(sequence => (
              <SequenceCard
                key={sequence.id}
                sequence={sequence}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onAddStep={openStepModal}
                onDeleteStep={handleDeleteStep}
              />
            ))}
          </div>
        )}

        <CreateSequenceModal
          show={showModal}
          loading={loading}
          formData={formData}
          onClose={closeModal}
          onFormChange={setFormData}
          onCreate={handleCreate}
        />

        <AddStepModal
          show={showStepModal}
          loading={loading}
          sequenceName={selectedSequence?.name || ''}
          formData={stepFormData}
          onClose={closeStepModal}
          onFormChange={setStepFormData}
          onAdd={handleAddStep}
        />
      </div>
    </div>
  );
};

export default EmailSequencesPage;
