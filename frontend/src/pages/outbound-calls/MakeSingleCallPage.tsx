import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PhoneIcon,
  CpuChipIcon,
  UserIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  DocumentTextIcon,
  SpeakerWaveIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';

interface VoiceAgent {
  id: string;
  name: string;
  industry: string;
  isActive: boolean;
  status: 'DRAFT' | 'PUBLISHED';
  language?: string;
}

const industryLabels: Record<string, string> = {
  EDUCATION: 'Education',
  IT_RECRUITMENT: 'IT Recruitment',
  REAL_ESTATE: 'Real Estate',
  CUSTOMER_CARE: 'Customer Care',
  TECHNICAL_INTERVIEW: 'Technical Interview',
  HEALTHCARE: 'Healthcare',
  FINANCE: 'Finance',
  ECOMMERCE: 'E-Commerce',
  CUSTOM: 'Custom',
};

export const MakeSingleCallPage: React.FC = () => {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<VoiceAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    agentId: '',
    phone: '',
    contactName: '',
  });

  useEffect(() => {
    fetchAgents();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.agent-dropdown')) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const response = await api.get('/voice-ai/agents');
      if (response.data.success) {
        // Only show PUBLISHED and active agents for outbound calls
        const publishedAgents = response.data.data.filter(
          (a: VoiceAgent) => a.isActive && a.status === 'PUBLISHED'
        );
        setAgents(publishedAgents);
        if (publishedAgents.length > 0) {
          setFormData(prev => ({ ...prev, agentId: publishedAgents[0].id }));
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch agents');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!formData.agentId) {
      setError('Please select an AI agent');
      return;
    }

    if (!formData.phone) {
      setError('Please enter a phone number');
      return;
    }

    const phoneRegex = /^\+?[1-9]\d{9,14}$/;
    const cleanPhone = formData.phone.replace(/[\s-()]/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      setError('Please enter a valid phone number with country code (e.g., +919876543210)');
      return;
    }

    try {
      setSubmitting(true);
      const response = await api.post('/outbound-calls/call', {
        agentId: formData.agentId,
        phone: cleanPhone,
        contactName: formData.contactName || undefined,
      });

      if (response.data.success) {
        setSuccess('Call initiated successfully');
        setTimeout(() => {
          navigate(`/outbound-calls/calls/${response.data.data.callId}`);
        }, 1500);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to initiate call');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedAgent = agents.find(a => a.id === formData.agentId);
  const filteredAgents = agents.filter(a =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    industryLabels[a.industry]?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <ArrowPathIcon className="h-5 w-5 text-gray-400 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/outbound-calls')}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-sm font-semibold text-gray-900">Make Single Call</h1>
            <p className="text-[10px] text-gray-500">Initiate an AI-powered outbound call</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Form Section */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="px-3 py-2 border-b border-gray-200">
              <h2 className="text-xs font-medium text-gray-900">Call Configuration</h2>
            </div>

            {/* Alerts */}
            {error && (
              <div className="mx-3 mt-3 flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
                <ExclamationCircleIcon className="h-4 w-4 text-red-500 flex-shrink-0" />
                <span className="text-red-700">{error}</span>
              </div>
            )}

            {success && (
              <div className="mx-3 mt-3 flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
                <CheckCircleIcon className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span className="text-green-700">{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-3 space-y-4">
              {/* Agent Selection */}
              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">
                  AI Agent <span className="text-red-500">*</span>
                </label>
                {agents.length === 0 ? (
                  <div className="border border-dashed border-gray-300 rounded p-4 text-center">
                    <CpuChipIcon className="h-6 w-6 text-gray-300 mx-auto mb-1" />
                    <p className="text-xs text-gray-500 mb-1">No published agents</p>
                    <p className="text-[10px] text-gray-400 mb-2">Only published agents can make outbound calls</p>
                    <button
                      type="button"
                      onClick={() => navigate('/voice-ai')}
                      className="text-xs font-medium text-primary-600 hover:text-primary-700"
                    >
                      Go to AI Voice Agents
                    </button>
                  </div>
                ) : (
                  <div className="relative agent-dropdown">
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="w-full flex items-center justify-between px-2.5 py-2 bg-white border border-gray-300 rounded text-left hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-xs"
                    >
                      {selectedAgent ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-primary-100 rounded flex items-center justify-center">
                            <CpuChipIcon className="h-3.5 w-3.5 text-primary-600" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-900">{selectedAgent.name}</p>
                            <p className="text-[10px] text-gray-500">{industryLabels[selectedAgent.industry]}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-500">Select an agent</span>
                      )}
                      <ChevronDownIcon className={`h-4 w-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded shadow-lg">
                        <div className="p-1.5 border-b border-gray-100">
                          <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                            <input
                              type="text"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              placeholder="Search agents..."
                              className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                        <div className="max-h-48 overflow-y-auto py-1">
                          {filteredAgents.length === 0 ? (
                            <p className="px-3 py-2 text-xs text-gray-500 text-center">No agents found</p>
                          ) : (
                            filteredAgents.map((agent) => (
                              <button
                                key={agent.id}
                                type="button"
                                onClick={() => {
                                  setFormData({ ...formData, agentId: agent.id });
                                  setIsDropdownOpen(false);
                                  setSearchQuery('');
                                }}
                                className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left hover:bg-gray-50 ${
                                  formData.agentId === agent.id ? 'bg-primary-50' : ''
                                }`}
                              >
                                <div className={`w-5 h-5 rounded flex items-center justify-center ${
                                  formData.agentId === agent.id ? 'bg-primary-100' : 'bg-gray-100'
                                }`}>
                                  <CpuChipIcon className={`h-3 w-3 ${formData.agentId === agent.id ? 'text-primary-600' : 'text-gray-500'}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-gray-900 truncate">{agent.name}</p>
                                  <p className="text-[10px] text-gray-500">{industryLabels[agent.industry]}</p>
                                </div>
                                {formData.agentId === agent.id && (
                                  <CheckCircleIcon className="h-3.5 w-3.5 text-primary-600 flex-shrink-0" />
                                )}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Phone Number */}
              <div>
                <label htmlFor="phone" className="block text-[10px] font-medium text-gray-500 uppercase mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <PhoneIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="tel"
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <p className="mt-1 text-[10px] text-gray-400">Include country code (e.g., +91 for India)</p>
              </div>

              {/* Contact Name */}
              <div>
                <label htmlFor="contactName" className="block text-[10px] font-medium text-gray-500 uppercase mb-1">
                  Contact Name <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="text"
                    id="contactName"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    placeholder="Enter contact name"
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => navigate('/outbound-calls')}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || agents.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-primary-600 rounded hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                      <span>Initiating...</span>
                    </>
                  ) : (
                    <>
                      <PhoneIcon className="h-3.5 w-3.5" />
                      <span>Start Call</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-3">
          {/* Selected Agent Info */}
          {selectedAgent && (
            <div className="card">
              <div className="px-3 py-2 border-b border-gray-200">
                <h3 className="text-xs font-medium text-gray-900">Selected Agent</h3>
              </div>
              <div className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 bg-primary-100 rounded flex items-center justify-center">
                    <CpuChipIcon className="h-4 w-4 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-900">{selectedAgent.name}</p>
                    <p className="text-[10px] text-gray-500">{industryLabels[selectedAgent.industry]}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-green-100 text-green-700 text-[10px] font-medium">
                    <span className="w-1 h-1 bg-green-500 rounded-full mr-1"></span>
                    Published
                  </span>
                  {selectedAgent.language && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px]">
                      {selectedAgent.language}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Call Features */}
          <div className="card">
            <div className="px-3 py-2 border-b border-gray-200">
              <h3 className="text-xs font-medium text-gray-900">Call Features</h3>
            </div>
            <div className="p-3 space-y-2.5">
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                  <SpeakerWaveIcon className="h-3.5 w-3.5 text-gray-500" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-900">Natural Conversation</p>
                  <p className="text-[10px] text-gray-500">AI understands context</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                  <DocumentTextIcon className="h-3.5 w-3.5 text-gray-500" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-900">Auto Transcription</p>
                  <p className="text-[10px] text-gray-500">Full transcript saved</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                  <ClockIcon className="h-3.5 w-3.5 text-gray-500" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-900">Real-time Response</p>
                  <p className="text-[10px] text-gray-500">&lt;1 second latency</p>
                </div>
              </div>
            </div>
          </div>

          {/* Help */}
          <div className="bg-primary-50 rounded border border-primary-100 p-3">
            <h4 className="text-xs font-medium text-primary-900 mb-0.5">Tips</h4>
            <p className="text-[10px] text-primary-700">
              Include country code in the phone number. Ensure the contact is available to receive calls.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MakeSingleCallPage;
