import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  PaperAirplaneIcon,
  EnvelopeIcon,
  ChatBubbleLeftRightIcon,
  PhoneIcon,
  EyeIcon,
  ArrowPathIcon,
  TrashIcon,
  PlayIcon,
  MagnifyingGlassIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';

interface Campaign {
  id: string;
  name: string;
  type: 'SMS' | 'EMAIL' | 'WHATSAPP';
  status: 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  content: string;
  subject?: string;
  recipientCount: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  scheduledAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface Lead {
  id: string;
  firstName: string;
  lastName?: string;
  phone?: string | null;
  email?: string | null;
  stage?: { name: string } | null;
  source?: string | null;
}

interface Template {
  id: string;
  name: string;
  type: 'SMS' | 'EMAIL' | 'WHATSAPP';
  category?: string;
  subject?: string;
  content: string;
}

const typeIcons = {
  SMS: ChatBubbleLeftRightIcon,
  EMAIL: EnvelopeIcon,
  WHATSAPP: PhoneIcon,
};

const typeColors = {
  SMS: 'bg-blue-100 text-blue-600',
  EMAIL: 'bg-green-100 text-green-600',
  WHATSAPP: 'bg-emerald-100 text-emerald-600',
};

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SCHEDULED: 'bg-blue-100 text-blue-700',
  RUNNING: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
};

export default function CampaignsPage() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [campaignType, setCampaignType] = useState<'SMS' | 'EMAIL' | 'WHATSAPP'>('SMS');
  const [creating, setCreating] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    content: '',
    subject: '',
  });

  // Leads state
  const [leads, setLeads] = useState<Lead[]>([]);
  const [totalLeadsFetched, setTotalLeadsFetched] = useState(0);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [leadSearch, setLeadSearch] = useState('');

  // Templates state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchTemplates = async (type: 'SMS' | 'EMAIL' | 'WHATSAPP') => {
    setLoadingTemplates(true);
    try {
      const response = await api.get(`/templates?type=${type}&limit=50`);
      setTemplates(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
      setTemplates([]);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const response = await api.get('/campaigns');
      setCampaigns(response.data.data || []);
      setError('');
    } catch (err: any) {
      console.error('Failed to fetch campaigns:', err);
      setError('Failed to load campaigns');
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeads = async (type: 'SMS' | 'EMAIL' | 'WHATSAPP') => {
    setLoadingLeads(true);
    try {
      // Fetch leads in batches (API limit is 100 per page)
      let allLeads: Lead[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore && page <= 10) { // Max 1000 leads
        const response = await api.get('/leads', {
          params: { limit: 100, page }
        });
        const pageLeads: Lead[] = Array.isArray(response.data.data) ? response.data.data : [];
        allLeads = [...allLeads, ...pageLeads];

        // Check if there are more pages
        const meta = response.data.meta;
        hasMore = meta && page < meta.totalPages;
        page++;
      }

      setTotalLeadsFetched(allLeads.length);

      // Filter leads based on campaign type
      const filteredLeads = allLeads.filter((lead: Lead) => {
        if (type === 'EMAIL') {
          return Boolean(lead.email && String(lead.email).trim());
        }
        return Boolean(lead.phone && String(lead.phone).trim());
      });

      setLeads(filteredLeads);
    } catch (err) {
      console.error('Failed to fetch leads:', err);
      setLeads([]);
      setTotalLeadsFetched(0);
    } finally {
      setLoadingLeads(false);
    }
  };

  const openCreateModal = (type: 'SMS' | 'EMAIL' | 'WHATSAPP') => {
    setCampaignType(type);
    setFormData({ name: '', content: '', subject: '' });
    setSelectedLeads([]);
    setShowCreateModal(true);
    fetchLeads(type);
    fetchTemplates(type);
  };

  const applyTemplate = (template: Template) => {
    setFormData({
      ...formData,
      content: template.content,
      subject: template.subject || '',
    });
  };

  const handleCreateCampaign = async () => {
    if (selectedLeads.length === 0) {
      setError('Please select at least one recipient');
      return;
    }

    setCreating(true);
    try {
      // Step 1: Create campaign
      const campaignRes = await api.post('/campaigns', {
        name: formData.name,
        type: campaignType,
        content: formData.content,
        subject: campaignType === 'EMAIL' ? formData.subject : undefined,
      });

      const campaignId = campaignRes.data.data.id;

      // Step 2: Add recipients from selected leads
      await api.post(`/campaigns/${campaignId}/import-leads`, {
        leadIds: selectedLeads,
      });

      setShowCreateModal(false);
      setFormData({ name: '', content: '', subject: '' });
      setSelectedLeads([]);

      // Navigate to campaign detail page
      navigate(`/campaigns/${campaignId}`);
    } catch (err: any) {
      console.error('Failed to create campaign:', err);
      setError(err.response?.data?.message || 'Failed to create campaign');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;
    try {
      await api.delete(`/campaigns/${id}`);
      fetchCampaigns();
    } catch (err: any) {
      console.error('Failed to delete campaign:', err);
      setError(err.response?.data?.message || 'Failed to delete campaign');
    }
  };

  const handleExecuteCampaign = async (id: string) => {
    if (!confirm('Are you sure you want to execute this campaign?')) return;
    try {
      await api.post(`/campaigns/${id}/execute`);
      fetchCampaigns();
    } catch (err: any) {
      console.error('Failed to execute campaign:', err);
      setError(err.response?.data?.message || 'Failed to execute campaign');
    }
  };

  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeads(prev =>
      prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId]
    );
  };

  const selectAllLeads = () => {
    const filtered = filteredLeads;
    if (selectedLeads.length === filtered.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filtered.map(l => l.id));
    }
  };

  const filteredLeads = leads.filter(lead => {
    const name = `${lead.firstName} ${lead.lastName || ''}`.toLowerCase();
    const search = leadSearch.toLowerCase();
    return name.includes(search) ||
           lead.phone?.includes(search) ||
           lead.email?.toLowerCase().includes(search);
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-gray-600">Create and manage SMS, Email, and WhatsApp campaigns.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchCampaigns}
            className="btn btn-secondary"
            disabled={loading}
          >
            <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => openCreateModal('SMS')}
            className="btn btn-primary"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Campaign
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
          <button onClick={() => setError('')} className="ml-2 text-red-500 hover:text-red-700">×</button>
        </div>
      )}

      {/* Campaign Types */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <button
          onClick={() => openCreateModal('SMS')}
          className="card card-body text-left hover:shadow-md transition-shadow"
        >
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <ChatBubbleLeftRightIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <h3 className="font-medium text-gray-900">SMS Campaign</h3>
              <p className="text-sm text-gray-500">Send bulk text messages to leads</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => openCreateModal('EMAIL')}
          className="card card-body text-left hover:shadow-md transition-shadow"
        >
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <EnvelopeIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <h3 className="font-medium text-gray-900">Email Campaign</h3>
              <p className="text-sm text-gray-500">Send bulk emails to leads</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => openCreateModal('WHATSAPP')}
          className="card card-body text-left hover:shadow-md transition-shadow"
        >
          <div className="flex items-center">
            <div className="p-3 bg-emerald-100 rounded-lg">
              <PhoneIcon className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="ml-4">
              <h3 className="font-medium text-gray-900">WhatsApp Campaign</h3>
              <p className="text-sm text-gray-500">Send WhatsApp to leads</p>
            </div>
          </div>
        </button>
      </div>

      {/* Campaigns Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-medium">All Campaigns</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <ArrowPathIcon className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
            <p className="text-gray-500 mt-2">Loading campaigns...</p>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-8 text-center">
            <ChatBubbleLeftRightIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No campaigns yet</h3>
            <p className="text-gray-500 mb-4">Create your first campaign to send messages to your leads</p>
            <button
              onClick={() => openCreateModal('SMS')}
              className="btn btn-primary"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Campaign
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipients</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delivered</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {campaigns.map((campaign) => {
                  const TypeIcon = typeIcons[campaign.type];
                  const deliveryRate = campaign.sentCount > 0
                    ? Math.round((campaign.deliveredCount / campaign.sentCount) * 100)
                    : 0;

                  return (
                    <tr key={campaign.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{campaign.name}</div>
                        <div className="text-xs text-gray-500 truncate max-w-xs">
                          {campaign.content.substring(0, 50)}...
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${typeColors[campaign.type]}`}>
                          <TypeIcon className="h-3.5 w-3.5 mr-1" />
                          {campaign.type}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[campaign.status]}`}>
                          {campaign.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{campaign.recipientCount || 0}</td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">
                          {campaign.deliveredCount || 0} / {campaign.sentCount || 0}
                        </div>
                        {campaign.sentCount > 0 && (
                          <div className="text-xs text-gray-500">
                            {deliveryRate}% delivered
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">{new Date(campaign.createdAt).toLocaleDateString()}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Link
                            to={`/campaigns/${campaign.id}`}
                            className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded"
                            title="View"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </Link>
                          {campaign.status === 'DRAFT' && (
                            <button
                              onClick={() => handleExecuteCampaign(campaign.id)}
                              className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded"
                              title="Execute"
                            >
                              <PlayIcon className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteCampaign(campaign.id)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowCreateModal(false)}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">
                Create {campaignType} Campaign
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Campaign Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Campaign Name
                </label>
                <input
                  type="text"
                  placeholder="Enter campaign name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              {/* Recipients */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">
                    Recipients ({selectedLeads.length} selected)
                  </label>
                  <button
                    onClick={selectAllLeads}
                    className="text-xs text-primary-600 hover:text-primary-700"
                  >
                    {selectedLeads.length === leads.length && leads.length > 0 ? 'Deselect all' : 'Select all'}
                  </button>
                </div>
                <div className="border border-gray-300 rounded-lg max-h-32 overflow-y-auto">
                  {loadingLeads ? (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      <ArrowPathIcon className="w-5 h-5 animate-spin mx-auto mb-1" />
                      Loading leads...
                    </div>
                  ) : leads.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      No leads with {campaignType === 'EMAIL' ? 'email' : 'phone numbers'}
                    </div>
                  ) : (
                    <div className="p-2 flex flex-wrap gap-1.5">
                      {leads.map((lead) => (
                        <label
                          key={lead.id}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm cursor-pointer transition-colors ${
                            selectedLeads.includes(lead.id)
                              ? 'bg-primary-100 text-primary-700 border border-primary-300'
                              : 'bg-gray-100 text-gray-600 border border-transparent hover:bg-gray-200'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedLeads.includes(lead.id)}
                            onChange={() => toggleLeadSelection(lead.id)}
                            className="sr-only"
                          />
                          {lead.firstName} {lead.lastName || ''}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Template Selector */}
              {templates.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Use Template <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto p-2 bg-gray-50 rounded-lg border border-gray-200">
                    {loadingTemplates ? (
                      <span className="text-sm text-gray-500">Loading templates...</span>
                    ) : (
                      templates.map((template) => (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => applyTemplate(template)}
                          className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 transition-colors truncate max-w-[150px]"
                          title={template.content.substring(0, 100)}
                        >
                          {template.name}
                        </button>
                      ))
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Click a template to use its content</p>
                </div>
              )}

              {/* Subject - Email only */}
              {campaignType === 'EMAIL' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    placeholder="Email subject"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  />
                </div>
              )}

              {/* Message */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">Message</label>
                  {campaignType === 'SMS' && (
                    <span className={`text-xs ${formData.content.length > 160 ? 'text-orange-600' : 'text-gray-400'}`}>
                      {formData.content.length}/160
                    </span>
                  )}
                </div>
                <textarea
                  rows={5}
                  placeholder={`Type your ${campaignType.toLowerCase()} message here...`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  maxLength={campaignType === 'SMS' ? 320 : campaignType === 'WHATSAPP' ? 1024 : undefined}
                />
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, content: formData.content + '{name}' })}
                  className="mt-1 text-xs text-primary-600 hover:text-primary-700"
                >
                  + Insert recipient name
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCampaign}
                disabled={creating || selectedLeads.length === 0 || !formData.name || !formData.content || (campaignType === 'EMAIL' && !formData.subject)}
                className="px-5 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {creating ? (
                  <>
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <PaperAirplaneIcon className="w-4 h-4" />
                    Create & Send
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
