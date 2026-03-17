/**
 * Phone Numbers Hook
 * Manages state and operations for phone numbers management
 */

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import phoneNumberService from '../../../services/phone-number.service';
import { PhoneNumber, PhoneNumberStats, Agent, PhoneNumberStatus } from '../phone-numbers.types';

export function usePhoneNumbers() {
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [stats, setStats] = useState<PhoneNumberStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PhoneNumberStatus>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedNumber, setSelectedNumber] = useState<PhoneNumber | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [numbers, statsData] = await Promise.all([
        phoneNumberService.getPhoneNumbers({ status: statusFilter || undefined }),
        phoneNumberService.getStats(),
      ]);
      setPhoneNumbers(numbers);
      setStats(statsData);
    } catch {
      toast.error('Failed to load phone numbers');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const loadAgents = async () => {
    try {
      const response = await fetch('/api/voice-ai/agents', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setAgents(data.data.map((a: { id: string; name: string }) => ({ id: a.id, name: a.name })));
      }
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  };

  useEffect(() => {
    loadData();
    loadAgents();
  }, [loadData]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this phone number?')) return;

    try {
      await phoneNumberService.deletePhoneNumber(id);
      toast.success('Phone number deleted');
      loadData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to delete phone number');
    }
  };

  const handleAssign = async (phoneNumberId: string, agentId: string) => {
    try {
      await phoneNumberService.assignToAgent(phoneNumberId, agentId);
      toast.success('Phone number assigned to agent');
      setShowAssignModal(false);
      setSelectedNumber(null);
      loadData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to assign phone number');
    }
  };

  const handleUnassign = async (phoneNumberId: string) => {
    try {
      await phoneNumberService.unassignFromAgent(phoneNumberId);
      toast.success('Phone number unassigned');
      loadData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to unassign phone number');
    }
  };

  const openAddModal = (phoneNumber?: PhoneNumber) => {
    setSelectedNumber(phoneNumber || null);
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setSelectedNumber(null);
  };

  const openAssignModal = (phoneNumber: PhoneNumber) => {
    setSelectedNumber(phoneNumber);
    setShowAssignModal(true);
  };

  const closeAssignModal = () => {
    setShowAssignModal(false);
    setSelectedNumber(null);
  };

  const onAddSuccess = () => {
    closeAddModal();
    loadData();
  };

  const filteredNumbers = phoneNumbers.filter(
    (pn) =>
      pn.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pn.friendlyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pn.assignedAgent?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return {
    // Data
    phoneNumbers: filteredNumbers,
    stats,
    loading,
    agents,
    // Filters
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    // Modals
    showAddModal,
    showAssignModal,
    selectedNumber,
    openAddModal,
    closeAddModal,
    openAssignModal,
    closeAssignModal,
    onAddSuccess,
    // Actions
    loadData,
    handleDelete,
    handleAssign,
    handleUnassign,
  };
}
