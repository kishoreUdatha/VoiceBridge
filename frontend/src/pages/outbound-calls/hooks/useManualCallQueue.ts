/**
 * Manual Call Queue Hook
 * Manages state and operations for the manual call queue
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import {
  Campaign,
  Contact,
  QueueStats,
  ScheduleData,
  ActiveCall,
  ContactStatus,
} from '../manual-call-queue.types';
import { INITIAL_SCHEDULE_DATA } from '../manual-call-queue.constants';

export function useManualCallQueue() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [callingContact, setCallingContact] = useState<string | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleData, setScheduleData] = useState<ScheduleData>(INITIAL_SCHEDULE_DATA);

  const [filter, setFilter] = useState<ContactStatus>('PENDING');

  const fetchQueue = useCallback(async () => {
    if (!campaignId) return;

    try {
      setLoading(true);
      const response = await api.get(`/outbound-calls/campaigns/${campaignId}/queue`, {
        params: { status: filter !== 'ALL' ? filter : undefined },
      });

      if (response.data.success) {
        setCampaign(response.data.data.campaign);
        setContacts(response.data.data.contacts);
        setStats(response.data.data.stats);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to fetch queue');
    } finally {
      setLoading(false);
    }
  }, [campaignId, filter]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Poll for call status updates
  useEffect(() => {
    if (!activeCall) return;

    const interval = setInterval(async () => {
      try {
        const response = await api.get(`/outbound-calls/calls/${activeCall.callId}`);
        if (response.data.success) {
          const call = response.data.data;
          if (['COMPLETED', 'FAILED', 'NO_ANSWER', 'BUSY'].includes(call.status)) {
            setActiveCall(null);
            setCallingContact(null);
            fetchQueue();
          }
        }
      } catch (err) {
        console.error('Error polling call status:', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [activeCall, fetchQueue]);

  const handleCall = async (contact: Contact) => {
    try {
      setCallingContact(contact.id);
      setError(null);

      const response = await api.post(
        `/outbound-calls/campaigns/${campaignId}/queue/${contact.id}/call`
      );

      if (response.data.success) {
        setActiveCall(response.data.data);
        fetchQueue();
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to initiate call');
      setCallingContact(null);
    }
  };

  const handleSkip = async (contactId: string, reason?: string) => {
    try {
      await api.post(`/outbound-calls/campaigns/${campaignId}/queue/${contactId}/skip`, {
        reason,
      });
      fetchQueue();
      if (selectedContact?.id === contactId) {
        setSelectedContact(null);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to skip contact');
    }
  };

  const handleSchedule = async () => {
    try {
      const scheduledAt = new Date(`${scheduleData.date}T${scheduleData.time}`);

      await api.post(
        `/outbound-calls/campaigns/${campaignId}/queue/${scheduleData.contactId}/schedule`,
        {
          scheduledAt: scheduledAt.toISOString(),
          notes: scheduleData.notes,
        }
      );

      setShowScheduleModal(false);
      setScheduleData(INITIAL_SCHEDULE_DATA);
      fetchQueue();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to schedule contact');
    }
  };

  const handleDNC = async (contactId: string, reason?: string) => {
    if (!confirm('Are you sure you want to mark this contact as Do Not Call?')) return;

    try {
      await api.post(`/outbound-calls/campaigns/${campaignId}/queue/${contactId}/dnc`, {
        reason,
      });
      fetchQueue();
      if (selectedContact?.id === contactId) {
        setSelectedContact(null);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to mark as DNC');
    }
  };

  const handleStartCampaign = async () => {
    await api.post(`/outbound-calls/campaigns/${campaignId}/start`);
    fetchQueue();
  };

  const openScheduleModal = (contactId: string) => {
    setScheduleData({ ...INITIAL_SCHEDULE_DATA, contactId });
    setShowScheduleModal(true);
  };

  const closeScheduleModal = () => {
    setShowScheduleModal(false);
    setScheduleData(INITIAL_SCHEDULE_DATA);
  };

  const navigateBack = () => navigate('/outbound-calls');
  const navigateToLead = (leadId: string) => navigate(`/leads/${leadId}`);
  const clearError = () => setError(null);

  return {
    // Data
    campaignId,
    campaign,
    contacts,
    stats,
    loading,
    error,
    // Selection
    selectedContact,
    setSelectedContact,
    callingContact,
    // Schedule Modal
    showScheduleModal,
    scheduleData,
    setScheduleData,
    openScheduleModal,
    closeScheduleModal,
    // Filter
    filter,
    setFilter,
    // Actions
    fetchQueue,
    handleCall,
    handleSkip,
    handleSchedule,
    handleDNC,
    handleStartCampaign,
    // Navigation
    navigateBack,
    navigateToLead,
    clearError,
  };
}
