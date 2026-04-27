/**
 * Voice Agents Hook
 * Manages voice agents state and operations
 */

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import { VoiceAgent } from '../voice-agents.types';

interface UseVoiceAgentsReturn {
  agents: VoiceAgent[];
  loading: boolean;
  searchQuery: string;
  openMenuId: string | null;
  copiedId: string | null;
  filterCreator: boolean;
  filterArchived: boolean;
  filterStatus: 'ALL' | 'DRAFT' | 'PUBLISHED';
  filteredAgents: VoiceAgent[];
  setSearchQuery: (query: string) => void;
  setOpenMenuId: (id: string | null) => void;
  setFilterCreator: (value: boolean) => void;
  setFilterArchived: (value: boolean) => void;
  setFilterStatus: (value: 'ALL' | 'DRAFT' | 'PUBLISHED') => void;
  fetchAgents: () => Promise<void>;
  toggleAgent: (agentId: string, isActive: boolean) => Promise<void>;
  deleteAgent: (agentId: string, name: string) => Promise<void>;
  copyEmbedCode: (agentId: string) => Promise<void>;
}

export function useVoiceAgents(): UseVoiceAgentsReturn {
  const [agents, setAgents] = useState<VoiceAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterCreator, setFilterCreator] = useState(false);
  const [filterArchived, setFilterArchived] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'DRAFT' | 'PUBLISHED'>('ALL');

  const fetchAgents = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/voice-ai/agents');
      if (response.data.success) {
        setAgents(response.data.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch agents:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClick = () => setOpenMenuId(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const toggleAgent = useCallback(async (agentId: string, isActive: boolean) => {
    try {
      await api.put(`/voice-ai/agents/${agentId}`, { isActive: !isActive });
      setAgents(agents => agents.map(a =>
        a.id === agentId ? { ...a, isActive: !isActive } : a
      ));
      toast.success(isActive ? 'Agent paused' : 'Agent activated');
    } catch (err) {
      console.error('Failed to toggle agent:', err);
      toast.error('Failed to update agent');
    }
  }, []);

  const deleteAgent = useCallback(async (agentId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      await api.delete(`/voice-ai/agents/${agentId}`);
      setAgents(agents => agents.filter(a => a.id !== agentId));
      toast.success('Agent deleted');
    } catch (err) {
      console.error('Failed to delete agent:', err);
      toast.error('Failed to delete agent');
    }
  }, []);

  const copyEmbedCode = useCallback(async (agentId: string) => {
    try {
      const response = await api.get(`/voice-ai/agents/${agentId}/embed`);
      if (response.data.success) {
        await navigator.clipboard.writeText(response.data.data.embedCode);
        setCopiedId(agentId);
        toast.success('Embed code copied');
        setTimeout(() => setCopiedId(null), 2000);
      }
    } catch (err) {
      console.error('Failed to copy embed code:', err);
      toast.error('Failed to copy embed code');
    }
  }, []);

  const filteredAgents = agents.filter(agent => {
    // Search filter
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase());

    // Status filter
    const matchesStatus = filterStatus === 'ALL' || agent.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  return {
    agents,
    loading,
    searchQuery,
    openMenuId,
    copiedId,
    filterCreator,
    filterArchived,
    filterStatus,
    filteredAgents,
    setSearchQuery,
    setOpenMenuId,
    setFilterCreator,
    setFilterArchived,
    setFilterStatus,
    fetchAgents,
    toggleAgent,
    deleteAgent,
    copyEmbedCode,
  };
}

export default useVoiceAgents;
