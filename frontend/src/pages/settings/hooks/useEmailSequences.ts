/**
 * Email Sequences Hook
 * Manages email sequences state and operations
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';
import {
  EmailSequence,
  SequenceFormData,
  StepFormData,
} from '../email-sequences.types';
import { INITIAL_SEQUENCE_FORM, INITIAL_STEP_FORM } from '../email-sequences.constants';

export function useEmailSequences() {
  const [sequences, setSequences] = useState<EmailSequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showStepModal, setShowStepModal] = useState(false);
  const [selectedSequence, setSelectedSequence] = useState<EmailSequence | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState<SequenceFormData>(INITIAL_SEQUENCE_FORM);
  const [stepFormData, setStepFormData] = useState<StepFormData>(INITIAL_STEP_FORM);

  const fetchSequences = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/email-sequences');
      setSequences(response.data.data || []);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      console.error('Failed to fetch sequences:', err);
      setError(error.response?.data?.message || 'Failed to load email sequences');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSequences();
  }, [fetchSequences]);

  const handleCreate = useCallback(async () => {
    if (!formData.name) {
      setError('Please enter a sequence name');
      return;
    }

    try {
      setLoading(true);
      await api.post('/email-sequences', formData);
      setSuccess('Email sequence created successfully');
      setShowModal(false);
      setFormData(INITIAL_SEQUENCE_FORM);
      fetchSequences();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to create sequence');
    } finally {
      setLoading(false);
    }
  }, [formData, fetchSequences]);

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this email sequence?')) return;

    try {
      await api.delete(`/email-sequences/${id}`);
      setSuccess('Sequence deleted successfully');
      fetchSequences();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to delete sequence');
    }
  }, [fetchSequences]);

  const handleToggle = useCallback(async (id: string, isActive: boolean) => {
    try {
      await api.put(`/email-sequences/${id}`, { isActive: !isActive });
      setSuccess(isActive ? 'Sequence paused' : 'Sequence activated');
      fetchSequences();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to update sequence');
    }
  }, [fetchSequences]);

  const handleAddStep = useCallback(async () => {
    if (!selectedSequence || !stepFormData.subject || !stepFormData.body) {
      setError('Please fill in all step fields');
      return;
    }

    try {
      setLoading(true);
      await api.post(`/email-sequences/${selectedSequence.id}/steps`, {
        ...stepFormData,
        stepNumber: (selectedSequence.steps?.length || 0) + 1,
      });
      setSuccess('Step added successfully');
      setShowStepModal(false);
      setStepFormData(INITIAL_STEP_FORM);
      fetchSequences();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to add step');
    } finally {
      setLoading(false);
    }
  }, [selectedSequence, stepFormData, fetchSequences]);

  const handleDeleteStep = useCallback(async (sequenceId: string, stepId: string) => {
    if (!window.confirm('Are you sure you want to delete this step?')) return;

    try {
      await api.delete(`/email-sequences/${sequenceId}/steps/${stepId}`);
      setSuccess('Step deleted successfully');
      fetchSequences();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to delete step');
    }
  }, [fetchSequences]);

  const openStepModal = useCallback((sequence: EmailSequence) => {
    setSelectedSequence(sequence);
    setShowStepModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setFormData(INITIAL_SEQUENCE_FORM);
  }, []);

  const closeStepModal = useCallback(() => {
    setShowStepModal(false);
    setStepFormData(INITIAL_STEP_FORM);
  }, []);

  const clearError = useCallback(() => setError(null), []);
  const clearSuccess = useCallback(() => setSuccess(null), []);

  return {
    // State
    sequences,
    loading,
    showModal,
    showStepModal,
    selectedSequence,
    error,
    success,
    formData,
    stepFormData,
    // Actions
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
  };
}
