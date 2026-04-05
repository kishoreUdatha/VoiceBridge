import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowPathIcon,
  PaperAirplaneIcon,
  UserPlusIcon,
  TrashIcon,
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  PhoneIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  UsersIcon,
  MagnifyingGlassIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';

interface CampaignRecipient {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED';
  sentAt?: string;
  deliveredAt?: string;
  failedReason?: string;
}

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
  recipients?: CampaignRecipient[];
}

interface AvailableLead {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  stage: string;
}

const typeConfig = {
  SMS: { icon: ChatBubbleLeftRightIcon, color: 'text-blue-600', bg: 'bg-blue-50' },
  EMAIL: { icon: EnvelopeIcon, color: 'text-purple-600', bg: 'bg-purple-50' },
  WHATSAPP: { icon: PhoneIcon, color: 'text-green-600', bg: 'bg-green-50' },
};

const statusConfig: Record<string, string> = {
  DRAFT: 'text-slate-600 bg-slate-100',
  SCHEDULED: 'text-blue-600 bg-blue-50',
  RUNNING: 'text-amber-600 bg-amber-50',
  COMPLETED: 'text-emerald-600 bg-emerald-50',
  FAILED: 'text-red-600 bg-red-50',
};

const recipientStatusConfig: Record<string, { icon: React.ElementType; style: string }> = {
  PENDING: { icon: ClockIcon, style: 'text-slate-500' },
  SENT: { icon: PaperAirplaneIcon, style: 'text-blue-500' },
  DELIVERED: { icon: CheckCircleIcon, style: 'text-emerald-500' },
  FAILED: { icon: XCircleIcon, style: 'text-red-500' },
};

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [executing, setExecuting] = useState(false);
  const [showAddRecipients, setShowAddRecipients] = useState(false);
  const [recipientsInput, setRecipientsInput] = useState('');
  const [addingRecipients, setAddingRecipients] = useState(false);
  const [addMode, setAddMode] = useState<'manual' | 'leads'>('leads');
  const [availableLeads, setAvailableLeads] = useState<AvailableLead[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [leadSearch, setLeadSearch] = useState('');

  useEffect(() => {
    fetchCampaign();
  }, [id]);

  const fetchCampaign = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/campaigns/${id}`);
      setCampaign(response.data.data);
      setError('');
    } catch (err: any) {
      setError('Failed to load campaign details');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableLeads = async () => {
    setLoadingLeads(true);
    try {
      const response = await api.get(`/campaigns/${id}/available-leads`);
      setAvailableLeads(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      setLoadingLeads(false);
    }
  };

  const handleOpenAddModal = () => {
    setShowAddRecipients(true);
    setAddMode('leads');
    setSelectedLeads([]);
    fetchAvailableLeads();
  };

  const handleExecuteCampaign = async () => {
    if (!campaign || campaign.recipientCount === 0) {
      setError('Please add recipients before executing');
      return;
    }
    setExecuting(true);
    try {
      await api.post(`/campaigns/${id}/execute`);
      fetchCampaign();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to execute campaign');
    } finally {
      setExecuting(false);
    }
  };

  const handleAddManualRecipients = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingRecipients(true);
    try {
      const lines = recipientsInput.trim().split('\n').filter(l => l.trim());
      const recipients = lines.map(line => {
        const [name, contact] = line.split(',').map(s => s.trim());
        return campaign?.type === 'EMAIL' ? { name, email: contact } : { name, phone: contact };
      });
      await api.post(`/campaigns/${id}/recipients`, { recipients });
      setShowAddRecipients(false);
      setRecipientsInput('');
      fetchCampaign();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add recipients');
    } finally {
      setAddingRecipients(false);
    }
  };

  const handleImportLeads = async () => {
    if (selectedLeads.length === 0) return;
    setAddingRecipients(true);
    try {
      await api.post(`/campaigns/${id}/import-leads`, { leadIds: selectedLeads });
      setShowAddRecipients(false);
      setSelectedLeads([]);
      fetchCampaign();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to import leads');
    } finally {
      setAddingRecipients(false);
    }
  };

  const handleDeleteCampaign = async () => {
    if (!confirm('Delete this campaign?')) return;
    try {
      await api.delete(`/campaigns/${id}`);
      navigate('/campaigns');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete');
    }
  };

  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeads(prev =>
      prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId]
    );
  };

  const filteredLeads = availableLeads.filter(lead =>
    lead.name.toLowerCase().includes(leadSearch.toLowerCase()) ||
    lead.phone?.includes(leadSearch) ||
    lead.email?.toLowerCase().includes(leadSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <ArrowPathIcon className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="h-10 w-10 text-gray-300 mx-auto mb-2" />
        <p className="text-gray-500 mb-2">Campaign not found</p>
        <Link to="/campaigns" className="text-primary-600 hover:underline text-sm">Back to Campaigns</Link>
      </div>
    );
  }

  const typeConf = typeConfig[campaign.type];
  const TypeIcon = typeConf.icon;
  const deliveryRate = campaign.sentCount > 0 ? Math.round((campaign.deliveredCount / campaign.sentCount) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/campaigns" className="text-gray-400 hover:text-gray-600">
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div className={`w-8 h-8 rounded-lg ${typeConf.bg} flex items-center justify-center`}>
            <TypeIcon className={`h-4 w-4 ${typeConf.color}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-gray-900">{campaign.name}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusConfig[campaign.status]}`}>
                {campaign.status}
              </span>
            </div>
            <p className="text-xs text-gray-500">{campaign.type} • {new Date(campaign.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchCampaign} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
            <ArrowPathIcon className="h-4 w-4" />
          </button>
          <button onClick={handleDeleteCampaign} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
            <TrashIcon className="h-4 w-4" />
          </button>
          {campaign.status === 'DRAFT' && (
            <>
              <button onClick={handleOpenAddModal} className="px-3 py-1.5 text-xs font-medium text-gray-700 border rounded-md hover:bg-gray-50">
                <UserPlusIcon className="h-3.5 w-3.5 inline mr-1" />
                Add Recipients
              </button>
              <button
                onClick={handleExecuteCampaign}
                disabled={executing || campaign.recipientCount === 0}
                className="px-3 py-1.5 text-xs font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                {executing ? <ArrowPathIcon className="h-3.5 w-3.5 inline animate-spin" /> : <PlayIcon className="h-3.5 w-3.5 inline mr-1" />}
                Execute
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="px-3 py-2 bg-red-50 border border-red-100 rounded text-red-600 text-xs flex items-center gap-2">
          <ExclamationTriangleIcon className="h-4 w-4" />
          {error}
          <button onClick={() => setError('')} className="ml-auto"><XCircleIcon className="h-4 w-4" /></button>
        </div>
      )}

      {/* Compact Stats Bar */}
      <div className="bg-white border rounded-lg p-3">
        <div className="flex items-center divide-x divide-gray-200">
          <div className="flex-1 text-center px-4">
            <div className="text-xl font-bold text-gray-900">{campaign.recipientCount || 0}</div>
            <div className="text-[10px] uppercase tracking-wide text-gray-500">Recipients</div>
          </div>
          <div className="flex-1 text-center px-4">
            <div className="text-xl font-bold text-blue-600">{campaign.sentCount || 0}</div>
            <div className="text-[10px] uppercase tracking-wide text-gray-500">Sent</div>
          </div>
          <div className="flex-1 text-center px-4">
            <div className="text-xl font-bold text-emerald-600">{campaign.deliveredCount || 0}</div>
            <div className="text-[10px] uppercase tracking-wide text-gray-500">Delivered</div>
          </div>
          <div className="flex-1 text-center px-4">
            <div className="text-xl font-bold text-red-600">{campaign.failedCount || 0}</div>
            <div className="text-[10px] uppercase tracking-wide text-gray-500">Failed</div>
          </div>
          <div className="flex-1 text-center px-4">
            <div className="text-xl font-bold text-gray-900">{deliveryRate}%</div>
            <div className="text-[10px] uppercase tracking-wide text-gray-500">Success</div>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-12 gap-4">
        {/* Message - Narrow */}
        <div className="col-span-4 bg-white border rounded-lg">
          <div className="px-3 py-2 border-b">
            <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wide">Message</h3>
          </div>
          <div className="p-3">
            {campaign.type === 'EMAIL' && campaign.subject && (
              <div className="mb-2 pb-2 border-b">
                <span className="text-[10px] text-gray-400 uppercase">Subject</span>
                <p className="text-sm text-gray-900">{campaign.subject}</p>
              </div>
            )}
            <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded p-2 border">
              {campaign.content || 'No content'}
            </div>
            <div className="mt-2 text-[10px] text-gray-400">{campaign.content?.length || 0} characters</div>
          </div>
        </div>

        {/* Recipients - Wide */}
        <div className="col-span-8 bg-white border rounded-lg">
          <div className="px-3 py-2 border-b flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wide">
              Recipients ({campaign.recipientCount || 0})
            </h3>
            {campaign.status === 'DRAFT' && campaign.recipientCount > 0 && (
              <button onClick={handleOpenAddModal} className="text-xs text-primary-600 hover:underline">+ Add</button>
            )}
          </div>

          {campaign.recipients && campaign.recipients.length > 0 ? (
            <div className="max-h-[320px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Name</th>
                    <th className="px-3 py-2 text-left font-medium">{campaign.type === 'EMAIL' ? 'Email' : 'Phone'}</th>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                    <th className="px-3 py-2 text-left font-medium">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {campaign.recipients.map((r) => {
                    const conf = recipientStatusConfig[r.status];
                    const Icon = conf.icon;
                    const contact = campaign.type === 'EMAIL' ? (r.email || r.phone) : (r.phone || r.email);
                    return (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium text-gray-900">{r.name}</td>
                        <td className="px-3 py-2 text-gray-600 font-mono text-xs">{contact || '-'}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center gap-1 text-xs ${conf.style}`}>
                            <Icon className="h-3.5 w-3.5" />{r.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500">
                          {r.deliveredAt ? new Date(r.deliveredAt).toLocaleTimeString() : r.sentAt ? new Date(r.sentAt).toLocaleTimeString() : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center">
              <UsersIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500 mb-3">No recipients added</p>
              {campaign.status === 'DRAFT' && (
                <button onClick={handleOpenAddModal} className="px-3 py-1.5 text-xs font-medium text-white bg-primary-600 rounded hover:bg-primary-700">
                  Add Recipients
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Recipients Modal */}
      {showAddRecipients && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowAddRecipients(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[70vh] flex flex-col">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h2 className="font-medium text-gray-900">Add Recipients</h2>
              <div className="flex text-xs">
                <button
                  onClick={() => setAddMode('leads')}
                  className={`px-3 py-1 rounded-l border ${addMode === 'leads' ? 'bg-primary-50 text-primary-700 border-primary-200' : 'bg-white text-gray-600 border-gray-200'}`}
                >
                  From Leads
                </button>
                <button
                  onClick={() => setAddMode('manual')}
                  className={`px-3 py-1 rounded-r border-t border-r border-b ${addMode === 'manual' ? 'bg-primary-50 text-primary-700 border-primary-200' : 'bg-white text-gray-600 border-gray-200'}`}
                >
                  Manual
                </button>
              </div>
            </div>

            {addMode === 'leads' ? (
              <>
                <div className="p-3 border-b">
                  <div className="relative">
                    <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search leads..."
                      className="w-full pl-9 pr-3 py-2 text-sm border rounded focus:ring-1 focus:ring-primary-500"
                      value={leadSearch}
                      onChange={(e) => setLeadSearch(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <span className="text-gray-500">{selectedLeads.length} selected</span>
                    <button onClick={() => setSelectedLeads(filteredLeads.map(l => l.id))} className="text-primary-600 hover:underline">
                      Select all
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  {loadingLeads ? (
                    <div className="flex justify-center py-8">
                      <ArrowPathIcon className="h-5 w-5 animate-spin text-gray-400" />
                    </div>
                  ) : filteredLeads.length === 0 ? (
                    <div className="text-center py-8 text-sm text-gray-500">No leads available</div>
                  ) : (
                    <div className="space-y-1">
                      {filteredLeads.map((lead) => (
                        <label
                          key={lead.id}
                          className={`flex items-center gap-3 p-2 rounded cursor-pointer ${selectedLeads.includes(lead.id) ? 'bg-primary-50' : 'hover:bg-gray-50'}`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedLeads.includes(lead.id)}
                            onChange={() => toggleLeadSelection(lead.id)}
                            className="rounded border-gray-300 text-primary-600"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900">{lead.name}</div>
                            <div className="text-xs text-gray-500">
                              {campaign?.type === 'EMAIL' ? lead.email : lead.phone} • {lead.stage}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <div className="px-4 py-3 border-t flex justify-end gap-2">
                  <button onClick={() => setShowAddRecipients(false)} className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50">
                    Cancel
                  </button>
                  <button
                    onClick={handleImportLeads}
                    disabled={addingRecipients || selectedLeads.length === 0}
                    className="px-4 py-1.5 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
                  >
                    {addingRecipients ? 'Importing...' : `Import ${selectedLeads.length}`}
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={handleAddManualRecipients} className="flex flex-col flex-1">
                <div className="p-4 flex-1">
                  <p className="text-xs text-gray-500 mb-2">
                    Format: <code className="bg-gray-100 px-1 rounded">name, {campaign?.type === 'EMAIL' ? 'email' : 'phone'}</code>
                  </p>
                  <textarea
                    rows={6}
                    className="w-full px-3 py-2 border rounded text-sm font-mono focus:ring-1 focus:ring-primary-500"
                    placeholder={campaign?.type === 'EMAIL' ? "John, john@email.com" : "John, 9876543210"}
                    value={recipientsInput}
                    onChange={(e) => setRecipientsInput(e.target.value)}
                    required
                  />
                </div>
                <div className="px-4 py-3 border-t flex justify-end gap-2">
                  <button type="button" onClick={() => setShowAddRecipients(false)} className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={addingRecipients} className="px-4 py-1.5 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50">
                    {addingRecipients ? 'Adding...' : 'Add'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
