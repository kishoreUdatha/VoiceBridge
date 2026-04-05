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
  ChevronRightIcon,
  ChevronLeftIcon,
  UsersIcon,
  CheckIcon,
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
  const [step, setStep] = useState(1);

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

  useEffect(() => {
    fetchCampaigns();
  }, []);

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
    setStep(1);
    setShowCreateModal(true);
    fetchLeads(type);
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

  const goToStep2 = () => {
    if (!formData.name || !formData.content) {
      setError('Please fill in campaign name and message');
      return;
    }
    if (campaignType === 'EMAIL' && !formData.subject) {
      setError('Please enter email subject');
      return;
    }
    setError('');
    setStep(2);
  };

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

      {/* Create Campaign Modal - Multi Step */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowCreateModal(false)} />
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col">

              {/* Header with Steps */}
              <div className="px-6 py-4 border-b">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold">Create {campaignType} Campaign</h2>
                  <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">×</button>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${step === 1 ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'}`}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${step === 1 ? 'bg-primary-600 text-white' : 'bg-gray-300'}`}>1</span>
                    Campaign Details
                  </div>
                  <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${step === 2 ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'}`}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${step === 2 ? 'bg-primary-600 text-white' : 'bg-gray-300'}`}>2</span>
                    Select Recipients
                  </div>
                </div>
              </div>

              {/* Step 1: Campaign Details */}
              {step === 1 && (
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name *</label>
                      <input
                        type="text"
                        placeholder="e.g., New Batch Announcement"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>

                    {campaignType === 'EMAIL' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Subject Line *</label>
                        <input
                          type="text"
                          placeholder="Email subject"
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                          value={formData.subject}
                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
                      <textarea
                        rows={5}
                        placeholder="Enter your message..."
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                        value={formData.content}
                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Use <code className="bg-gray-100 px-1 rounded">{'{name}'}</code> to personalize with recipient's name
                      </p>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800">
                        <strong>Next:</strong> Select leads from your CRM to receive this campaign
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Select Recipients */}
              {step === 2 && (
                <div className="flex-1 overflow-hidden flex flex-col">
                  <div className="p-4 border-b bg-gray-50">
                    <div className="flex items-center justify-between gap-4">
                      <div className="relative flex-1">
                        <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search leads by name, phone, email..."
                          className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg"
                          value={leadSearch}
                          onChange={(e) => setLeadSearch(e.target.value)}
                        />
                      </div>
                      <button
                        onClick={selectAllLeads}
                        className="px-3 py-2 text-sm border rounded-lg hover:bg-white flex items-center gap-2"
                      >
                        {selectedLeads.length === filteredLeads.length && filteredLeads.length > 0 ? (
                          <>Deselect All</>
                        ) : (
                          <>Select All ({filteredLeads.length})</>
                        )}
                      </button>
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-sm">
                      <span className="text-gray-600">
                        <UsersIcon className="h-4 w-4 inline mr-1" />
                        {leads.length} leads available
                        {totalLeadsFetched > leads.length && (
                          <span className="text-gray-400 ml-1">
                            (of {totalLeadsFetched} total)
                          </span>
                        )}
                      </span>
                      <span className="text-primary-600 font-medium">
                        <CheckIcon className="h-4 w-4 inline mr-1" />
                        {selectedLeads.length} selected
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4">
                    {loadingLeads ? (
                      <div className="flex items-center justify-center py-12">
                        <ArrowPathIcon className="h-6 w-6 animate-spin text-gray-400" />
                      </div>
                    ) : filteredLeads.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <UsersIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        {totalLeadsFetched === 0 ? (
                          <>
                            <p className="font-medium">No leads found</p>
                            <p className="text-sm mt-1 mb-4">
                              You need to import or create leads first
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="font-medium">
                              Found {totalLeadsFetched} leads but none with {campaignType === 'EMAIL' ? 'email addresses' : 'phone numbers'}
                            </p>
                            <p className="text-sm mt-1 mb-4">
                              Update your leads or import new ones with {campaignType === 'EMAIL' ? 'email' : 'phone'} data
                            </p>
                          </>
                        )}
                        <div className="flex justify-center gap-3">
                          <Link to="/leads" className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50">
                            View Leads
                          </Link>
                          <Link to="/leads/bulk-upload" className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                            Import Leads
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {filteredLeads.map((lead) => (
                          <label
                            key={lead.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                              selectedLeads.includes(lead.id)
                                ? 'bg-primary-50 border-primary-300'
                                : 'hover:bg-gray-50 border-gray-200'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedLeads.includes(lead.id)}
                              onChange={() => toggleLeadSelection(lead.id)}
                              className="rounded border-gray-300 text-primary-600"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {lead.firstName} {lead.lastName || ''}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                {campaignType === 'EMAIL' ? lead.email : lead.phone}
                              </div>
                            </div>
                            {lead.stage?.name && (
                              <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                                {lead.stage.name}
                              </span>
                            )}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
                {step === 1 ? (
                  <>
                    <button
                      onClick={() => setShowCreateModal(false)}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={goToStep2}
                      className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
                    >
                      Next: Select Recipients
                      <ChevronRightIcon className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setStep(1)}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 flex items-center gap-2"
                    >
                      <ChevronLeftIcon className="h-4 w-4" />
                      Back
                    </button>
                    <button
                      onClick={handleCreateCampaign}
                      disabled={creating || selectedLeads.length === 0}
                      className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {creating ? (
                        <>
                          <ArrowPathIcon className="h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <PaperAirplaneIcon className="h-4 w-4" />
                          Create Campaign ({selectedLeads.length} recipients)
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
