/**
 * Notification Channels Hook
 * Manages state and operations for notification channel management
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';
import {
  NotificationChannel,
  ChannelFormData,
  ModalStep,
  ToastState,
  ChannelType,
} from '../notification-channels.types';
import { INITIAL_FORM_DATA } from '../notification-channels.constants';

export function useNotificationChannels() {
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState<ModalStep>('select');
  const [testingChannel, setTestingChannel] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [formData, setFormData] = useState<ChannelFormData>(INITIAL_FORM_DATA);

  useEffect(() => {
    fetchChannels();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchChannels = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/notification-channels');
      const data = response.data?.data || response.data || [];
      setChannels(Array.isArray(data) ? data : []);
    } catch {
      setChannels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCreate = async () => {
    if (!formData.name || !formData.webhookUrl) {
      setToast({ type: 'error', message: 'Please fill in all required fields' });
      return;
    }

    try {
      setLoading(true);
      await api.post('/notification-channels', formData);
      setToast({ type: 'success', message: 'Channel created successfully' });
      closeModal();
      fetchChannels();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setToast({ type: 'error', message: error.response?.data?.message || 'Failed to create channel' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this notification channel?')) return;
    try {
      await api.delete(`/notification-channels/${id}`);
      setToast({ type: 'success', message: 'Channel deleted' });
      fetchChannels();
    } catch {
      setToast({ type: 'error', message: 'Failed to delete channel' });
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await api.put(`/notification-channels/${id}`, { isActive: !isActive });
      fetchChannels();
      setToast({ type: 'success', message: isActive ? 'Channel paused' : 'Channel activated' });
    } catch {
      setToast({ type: 'error', message: 'Failed to update channel' });
    }
  };

  const handleTest = async (id: string) => {
    try {
      setTestingChannel(id);
      await api.post(`/notification-channels/${id}/test`);
      setToast({ type: 'success', message: 'Test notification sent!' });
    } catch {
      setToast({ type: 'error', message: 'Test failed - check webhook URL' });
    } finally {
      setTestingChannel(null);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setModalStep('select');
    setFormData(INITIAL_FORM_DATA);
  };

  const openModal = () => {
    setShowModal(true);
  };

  const selectPlatform = (type: ChannelType) => {
    setFormData({ ...formData, type });
    setModalStep('configure');
  };

  const openModalWithPlatform = (type: ChannelType) => {
    setFormData({ ...INITIAL_FORM_DATA, type });
    setShowModal(true);
    setModalStep('configure');
  };

  const toggleEvent = (eventId: string) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(eventId)
        ? prev.events.filter(e => e !== eventId)
        : [...prev.events, eventId],
    }));
  };

  const updateFormField = <K extends keyof ChannelFormData>(key: K, value: ChannelFormData[K]) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const clearToast = () => setToast(null);

  const goBackToSelectStep = () => setModalStep('select');

  return {
    // Data
    channels,
    loading,
    toast,
    testingChannel,
    // Modal
    showModal,
    modalStep,
    formData,
    // Actions
    fetchChannels,
    handleCreate,
    handleDelete,
    handleToggle,
    handleTest,
    openModal,
    closeModal,
    selectPlatform,
    openModalWithPlatform,
    toggleEvent,
    updateFormField,
    clearToast,
    goBackToSelectStep,
  };
}
