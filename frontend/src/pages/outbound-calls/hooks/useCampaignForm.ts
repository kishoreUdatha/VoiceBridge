/**
 * Custom hook for campaign form management
 * Handles state, validation, and file parsing
 */

import { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import api from '../../../services/api';
import {
  VoiceAgent,
  Contact,
  Lead,
  CampaignFormData,
  ContactSource,
  LeadFilter,
} from '../create-campaign.types';
import { initialFormData, validatePhoneNumber, cleanPhoneNumber } from '../create-campaign.constants';

interface UseCampaignFormReturn {
  // State
  agents: VoiceAgent[];
  leads: Lead[];
  contacts: Contact[];
  formData: CampaignFormData;
  contactSource: ContactSource;
  selectedLeadIds: string[];
  selectAll: boolean;
  leadFilter: LeadFilter;
  step: number;
  loading: boolean;
  loadingLeads: boolean;
  submitting: boolean;
  error: string | null;

  // Actions
  setFormData: (data: Partial<CampaignFormData>) => void;
  setContactSource: (source: ContactSource) => void;
  setSelectedLeadIds: React.Dispatch<React.SetStateAction<string[]>>;
  setLeadFilter: (filter: Partial<LeadFilter>) => void;
  setStep: (step: number) => void;
  setError: (error: string | null) => void;
  addContact: () => void;
  removeContact: (index: number) => void;
  updateContact: (index: number, field: keyof Contact, value: string) => void;
  toggleLeadSelection: (leadId: string) => void;
  handleSelectAll: () => void;
  handleFileUpload: (file: File) => void;
  validateStep1: () => boolean;
  validateStep2: () => boolean;
  handleSubmit: () => Promise<boolean>;
  getContactsFromLeads: () => Contact[];
}

export function useCampaignForm(initialSource?: string): UseCampaignFormReturn {
  const [agents, setAgents] = useState<VoiceAgent[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([{ phone: '', name: '', email: '' }]);
  const [formData, setFormDataState] = useState<CampaignFormData>(initialFormData);
  const [contactSource, setContactSource] = useState<ContactSource>('leads');
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [leadFilter, setLeadFilterState] = useState<LeadFilter>({
    source: initialSource || '',
    search: '',
  });
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch agents
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        setLoading(true);
        const response = await api.get('/voice-ai/agents');
        if (response.data.success) {
          setAgents(response.data.data.filter((a: VoiceAgent) => a.isActive));
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch agents');
      } finally {
        setLoading(false);
      }
    };
    fetchAgents();
  }, []);

  // Fetch leads
  const fetchLeads = useCallback(async () => {
    try {
      setLoadingLeads(true);
      const params = new URLSearchParams();
      params.append('limit', '500');
      if (leadFilter.source) params.append('source', leadFilter.source);
      if (leadFilter.search) params.append('search', leadFilter.search);

      const response = await api.get(`/leads?${params.toString()}`);
      if (response.data.success) {
        const leadsWithPhone = response.data.data.filter((lead: Lead) => lead.phone);
        setLeads(leadsWithPhone);
      }
    } catch (err: any) {
      console.error('Failed to fetch leads:', err);
    } finally {
      setLoadingLeads(false);
    }
  }, [leadFilter.source, leadFilter.search]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Form data setter
  const setFormData = (data: Partial<CampaignFormData>) => {
    setFormDataState(prev => ({ ...prev, ...data }));
  };

  // Lead filter setter
  const setLeadFilter = (filter: Partial<LeadFilter>) => {
    setLeadFilterState(prev => ({ ...prev, ...filter }));
  };

  // Contact management
  const addContact = () => {
    setContacts([...contacts, { phone: '', name: '', email: '' }]);
  };

  const removeContact = (index: number) => {
    if (contacts.length > 1) {
      setContacts(contacts.filter((_, i) => i !== index));
    }
  };

  const updateContact = (index: number, field: keyof Contact, value: string) => {
    const updated = [...contacts];
    updated[index][field] = value;
    setContacts(updated);
  };

  // Lead selection
  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeadIds(prev =>
      prev.includes(leadId)
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(leads.map(l => l.id));
    }
    setSelectAll(!selectAll);
  };

  const getContactsFromLeads = (): Contact[] => {
    return leads
      .filter(lead => selectedLeadIds.includes(lead.id))
      .map(lead => ({
        phone: lead.phone,
        name: `${lead.firstName} ${lead.lastName || ''}`.trim(),
        email: lead.email || '',
      }));
  };

  // File upload handler
  const handleFileUpload = (file: File) => {
    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    const isCSV = fileName.endsWith('.csv');

    if (!isExcel && !isCSV) {
      setError('Please upload a CSV or Excel file (.csv, .xlsx, .xls)');
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        let newContacts: Contact[] = [];

        if (isExcel) {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });

          const headers = (jsonData[0] as any[] || []).map((h: any) => String(h || '').toLowerCase().trim());

          let phoneColIndex = headers.findIndex((h: string) =>
            h.includes('phone') || h.includes('mobile') || h.includes('contact') || h.includes('number')
          );
          let nameColIndex = headers.findIndex((h: string) =>
            h.includes('name') || h.includes('customer') || h.includes('lead')
          );

          if (phoneColIndex === -1) phoneColIndex = 0;
          if (nameColIndex === -1) nameColIndex = 1;

          const rows = jsonData.slice(1);

          newContacts = rows
            .filter((row: any[]) => row && row.length > 0)
            .map((row: any[]) => {
              let phone = row[phoneColIndex] ? String(row[phoneColIndex]).trim() : '';
              let name = row[nameColIndex] !== undefined && nameColIndex !== phoneColIndex
                ? String(row[nameColIndex] || '').trim()
                : '';

              if (!phone || phone.length < 10) {
                for (let i = 0; i < row.length; i++) {
                  const cell = String(row[i] || '').trim();
                  const cleanCell = cell.replace(/[\s\-()]/g, '');
                  if (cell.startsWith('+') || /^\d{10,}$/.test(cleanCell)) {
                    phone = cell;
                    break;
                  }
                }
              }

              if (!name) {
                for (let i = 0; i < row.length; i++) {
                  if (i === phoneColIndex) continue;
                  const cell = String(row[i] || '').trim();
                  if (cell && /[a-zA-Z]/.test(cell) && !cell.includes('@') && !/^\d+$/.test(cell.replace(/[\s\-()]/g, ''))) {
                    name = cell;
                    break;
                  }
                }
              }

              return { phone, name: name || '', email: '' };
            })
            .filter((c) => cleanPhoneNumber(c.phone).length >= 10);

        } else {
          const text = event.target?.result as string;
          const lines = text.split('\n');
          const firstLine = lines[0]?.toLowerCase() || '';
          const hasHeader = firstLine.includes('phone') || firstLine.includes('name') || firstLine.includes('mobile');
          const dataLines = hasHeader ? lines.slice(1) : lines;

          newContacts = dataLines
            .filter((line) => line.trim())
            .map((line) => {
              const parts = line.split(',').map((s) => s.trim());
              return { phone: parts[0] || '', name: parts[1] || '', email: '' };
            })
            .filter((c) => cleanPhoneNumber(c.phone).length >= 10);
        }

        if (newContacts.length > 0) {
          setContacts(newContacts);
          setError(null);
        } else {
          setError('No valid contacts found. Make sure file has phone numbers (10+ digits).');
        }
      } catch (err) {
        console.error('File parsing error:', err);
        setError('Failed to parse file. Please check the format and try again.');
      }
    };

    reader.onerror = () => {
      setError('Failed to read file. Please try again.');
    };

    if (isExcel) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };

  // Validation
  const validateStep1 = (): boolean => {
    if (!formData.name) {
      setError('Campaign name is required');
      return false;
    }
    if (!formData.agentId) {
      setError('Please select an AI agent');
      return false;
    }
    setError(null);
    return true;
  };

  const validateStep2 = (): boolean => {
    if (contactSource === 'leads') {
      if (selectedLeadIds.length === 0) {
        setError('Please select at least one lead');
        return false;
      }
      setError(null);
      return true;
    }

    const validContacts = contacts.filter((c) => c.phone.trim());
    if (validContacts.length === 0) {
      setError('Please add at least one contact with a phone number');
      return false;
    }

    for (const contact of validContacts) {
      if (!validatePhoneNumber(contact.phone)) {
        setError(`Invalid phone number: ${contact.phone}`);
        return false;
      }
    }

    setError(null);
    return true;
  };

  // Submit
  const handleSubmit = async (): Promise<boolean> => {
    if (!validateStep2()) return false;

    let validContacts: { phone: string; name?: string; email?: string; leadId?: string }[];

    if (contactSource === 'leads') {
      validContacts = leads
        .filter(lead => selectedLeadIds.includes(lead.id))
        .map(lead => ({
          phone: cleanPhoneNumber(lead.phone),
          name: `${lead.firstName} ${lead.lastName || ''}`.trim() || undefined,
          email: lead.email || undefined,
          leadId: lead.id,
        }));
    } else {
      validContacts = contacts
        .filter((c) => c.phone.trim())
        .map((c) => ({
          phone: cleanPhoneNumber(c.phone),
          name: c.name || undefined,
          email: c.email || undefined,
        }));
    }

    try {
      setSubmitting(true);
      const response = await api.post('/outbound-calls/campaigns', {
        agentId: formData.agentId,
        name: formData.name,
        description: formData.description || undefined,
        contacts: validContacts,
        callingMode: formData.callingMode,
        settings: {
          maxConcurrentCalls: formData.callingMode === 'MANUAL' ? 1 : formData.maxConcurrentCalls,
          callsBetweenHours: formData.callsBetweenHours,
          retryAttempts: formData.retryAttempts,
          retryDelayMinutes: formData.retryDelayMinutes,
        },
        scheduledAt: formData.scheduledAt || undefined,
      });

      return response.data.success;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create campaign');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  return {
    agents,
    leads,
    contacts,
    formData,
    contactSource,
    selectedLeadIds,
    selectAll,
    leadFilter,
    step,
    loading,
    loadingLeads,
    submitting,
    error,
    setFormData,
    setContactSource,
    setSelectedLeadIds,
    setLeadFilter,
    setStep,
    setError,
    addContact,
    removeContact,
    updateContact,
    toggleLeadSelection,
    handleSelectAll,
    handleFileUpload,
    validateStep1,
    validateStep2,
    handleSubmit,
    getContactsFromLeads,
  };
}

export default useCampaignForm;
