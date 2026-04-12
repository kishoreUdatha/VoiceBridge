import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  PhoneIcon,
  PlusIcon,
  PlayIcon,
  PauseIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowRightIcon,
  CpuChipIcon,
  UserGroupIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import { RootState } from '../../store';

interface Campaign {
  id: string;
  name: string;
  status: string;
  callingMode: string;
  totalContacts: number;
  completedCalls: number;
  successfulCalls: number;
  failedCalls: number;
  leadsGenerated: number;
  createdAt: string;
  agent: { id: string; name: string };
}

interface OutboundCall {
  id: string;
  phoneNumber: string;
  contactName?: string;
  status: string;
  duration: number | null;
  outcome: string | null;
  sentiment: string | null;
  createdAt: string;
  agent: { id: string; name: string } | null;
  campaign: { id: string; name: string } | null;
}

interface TelecallerCall {
  id: string;
  phoneNumber: string;
  contactName?: string;
  status: string;
  duration: number | null;
  outcome: string | null;
  notes?: string;
  transcript?: string;
  sentiment?: string;
  summary?: string;
  aiAnalyzed?: boolean;
  recordingUrl?: string;
  createdAt: string;
  telecaller: { id: string; firstName: string; lastName: string; email?: string } | null;
  lead: { id: string; firstName: string; lastName: string; phone: string } | null;
}

interface Telecaller {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Analytics {
  totalCalls: number;
  completedCalls: number;
  answeredCalls: number;
  answerRate: string | number;
  leadsGenerated: number;
  conversionRate: string | number;
  avgDuration: number;
}

const campaignStatusColors: Record<string, { bg: string; text: string; label: string }> = {
  DRAFT: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Draft' },
  SCHEDULED: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Scheduled' },
  RUNNING: { bg: 'bg-green-100', text: 'text-green-700', label: 'Running' },
  PAUSED: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Paused' },
  COMPLETED: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Completed' },
  CANCELLED: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelled' },
};

const outcomeLabels: Record<string, string> = {
  INTERESTED: 'Interested',
  NOT_INTERESTED: 'Not Interested',
  CALLBACK_REQUESTED: 'Callback',
  CONVERTED: 'Converted',
  NO_ANSWER: 'No Answer',
  BUSY: 'Busy',
};

const statusLabels: Record<string, string> = {
  COMPLETED: 'Completed',
  IN_PROGRESS: 'In Progress',
  RINGING: 'Ringing',
  NO_ANSWER: 'No Answer',
  BUSY: 'Busy',
  FAILED: 'Failed',
  INITIATED: 'Initiated',
  QUEUED: 'Queued',
};

export const OutboundCallsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);

  // Role-based access:
  // - super_admin, admin: see ALL calls
  // - manager, team_lead: see calls from their team members
  // - telecaller, counselor: see only their own calls
  const isTelecaller = user?.role === 'telecaller' || user?.role === 'counselor';
  const isFullAdmin = user?.role === 'super_admin' || user?.role === 'admin';
  const isTeamManager = user?.role === 'manager' || user?.role === 'team_lead';
  const canViewAllCalls = isFullAdmin || isTeamManager;

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [calls, setCalls] = useState<OutboundCall[]>([]);
  const [telecallerCalls, setTelecallerCalls] = useState<TelecallerCall[]>([]);
  const [telecallerCallsTotal, setTelecallerCallsTotal] = useState(0);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  // Telecallers go directly to their calls tab, managers/team leads see telecaller-calls tab
  const [activeTab, setActiveTab] = useState<'campaigns' | 'calls' | 'telecaller-calls'>(
    isTelecaller ? 'telecaller-calls' : (isTeamManager ? 'telecaller-calls' : 'campaigns')
  );

  // Telecaller calls filters
  const [telecallers, setTelecallers] = useState<Telecaller[]>([]);
  const [tcFilterTelecaller, setTcFilterTelecaller] = useState('');
  const [tcFilterOutcome, setTcFilterOutcome] = useState('');
  const [tcFilterSearch, setTcFilterSearch] = useState('');
  const [tcFilterDateFrom, setTcFilterDateFrom] = useState('');
  const [tcFilterDateTo, setTcFilterDateTo] = useState('');
  const [tcLoading, setTcLoading] = useState(false);


  useEffect(() => {
    fetchData();
    // Fetch telecallers list for anyone who can view all calls (admins, managers, team leads)
    if (canViewAllCalls) {
      fetchTelecallers();
    }
  }, [canViewAllCalls]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Add cache-busting to force fresh data
      const timestamp = Date.now();

      // Use different endpoint based on role:
      // - telecallers: /telecaller/calls (own calls only)
      // - managers/team_leads/admins: /telecaller/all-calls (backend filters based on role)
      const telecallerCallsEndpoint = isTelecaller
        ? `/telecaller/calls?limit=50&_t=${timestamp}`
        : `/telecaller/all-calls?limit=50&_t=${timestamp}`;

      const [campaignsRes, callsRes, analyticsRes, telecallerCallsRes] = await Promise.all([
        api.get('/outbound-calls/campaigns'),
        api.get('/outbound-calls/calls?limit=10'),
        api.get('/outbound-calls/analytics'),
        api.get(telecallerCallsEndpoint).catch((err) => {
          console.error('Telecaller calls fetch error:', err);
          return { data: { success: false, error: err.message } };
        }),
      ]);

      if (campaignsRes.data.success) setCampaigns(campaignsRes.data.data);
      if (callsRes.data.success) setCalls(callsRes.data.data.calls || []);
      if (analyticsRes.data.success) setAnalytics(analyticsRes.data.data);

      // Debug telecaller calls response
      console.log('Full telecaller response:', telecallerCallsRes);
      console.log('Telecaller data:', telecallerCallsRes.data);

      if (telecallerCallsRes.data.success) {
        const calls = telecallerCallsRes.data.data?.calls || [];
        const total = telecallerCallsRes.data.data?.total || 0;
        console.log(`Setting ${calls.length} telecaller calls, total: ${total}`);
        setTelecallerCalls(calls);
        setTelecallerCallsTotal(total);
      } else {
        console.error('Telecaller calls failed:', telecallerCallsRes.data);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const startCampaign = async (e: React.MouseEvent, campaignId: string) => {
    e.stopPropagation();
    try {
      await api.post(`/outbound-calls/campaigns/${campaignId}/start`);
      fetchData();
    } catch (err) {
      console.error('Failed to start campaign:', err);
    }
  };

  const pauseCampaign = async (e: React.MouseEvent, campaignId: string) => {
    e.stopPropagation();
    try {
      await api.post(`/outbound-calls/campaigns/${campaignId}/pause`);
      fetchData();
    } catch (err) {
      console.error('Failed to pause campaign:', err);
    }
  };

  const fetchTelecallers = async () => {
    try {
      const res = await api.get('/users?role=telecaller&limit=100');
      if (res.data.success) {
        setTelecallers(res.data.data?.users || res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch telecallers:', err);
    }
  };

  const fetchTelecallerCalls = async () => {
    try {
      setTcLoading(true);
      const params = new URLSearchParams();
      params.append('limit', '100');
      // Apply telecaller filter for admins/managers/team_leads who can view all calls
      if (canViewAllCalls && tcFilterTelecaller) params.append('telecallerId', tcFilterTelecaller);
      if (tcFilterOutcome) params.append('outcome', tcFilterOutcome);
      if (tcFilterDateFrom) params.append('dateFrom', tcFilterDateFrom);
      if (tcFilterDateTo) params.append('dateTo', tcFilterDateTo);
      params.append('_t', Date.now().toString());

      // Use different endpoint based on role:
      // - telecallers: /telecaller/calls (own calls only)
      // - managers/team_leads/admins: /telecaller/all-calls (backend filters based on role)
      const endpoint = isTelecaller ? '/telecaller/calls' : '/telecaller/all-calls';
      const res = await api.get(`${endpoint}?${params.toString()}`);
      if (res.data.success) {
        let calls = res.data.data?.calls || [];
        // Client-side search filter
        if (tcFilterSearch) {
          const search = tcFilterSearch.toLowerCase();
          calls = calls.filter((c: TelecallerCall) =>
            c.phoneNumber?.toLowerCase().includes(search) ||
            c.contactName?.toLowerCase().includes(search) ||
            c.telecaller?.firstName?.toLowerCase().includes(search) ||
            c.telecaller?.lastName?.toLowerCase().includes(search)
          );
        }
        setTelecallerCalls(calls);
        setTelecallerCallsTotal(res.data.data?.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch telecaller calls:', err);
    } finally {
      setTcLoading(false);
    }
  };

  // Refetch telecaller calls when filters change
  useEffect(() => {
    if (activeTab === 'telecaller-calls') {
      fetchTelecallerCalls();
    }
  }, [tcFilterTelecaller, tcFilterOutcome, tcFilterDateFrom, tcFilterDateTo, activeTab]);

  const clearTcFilters = () => {
    setTcFilterTelecaller('');
    setTcFilterOutcome('');
    setTcFilterSearch('');
    setTcFilterDateFrom('');
    setTcFilterDateTo('');
  };

  const viewTelecallerCallSummary = (callId: string) => {
    navigate(`/outbound-calls/telecaller-calls/${callId}/summary`);
  };

  const formatDuration = (seconds: number | null): string => {
    if (!seconds || seconds <= 0) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const style = campaignStatusColors[status] || campaignStatusColors.DRAFT;
    const Icon = status === 'RUNNING' ? PlayIcon : status === 'COMPLETED' ? CheckCircleIcon : ClockIcon;
    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${style.bg} ${style.text}`}>
        <Icon className="h-2.5 w-2.5 mr-0.5" />
        {style.label}
      </span>
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            {isTelecaller ? 'My Calls' : (isTeamManager ? 'Team Calls' : 'AI Calling Campaigns')}
          </h1>
          <p className="text-xs text-gray-500">
            {isTelecaller
              ? 'View your call history and AI analysis'
              : (isTeamManager
                ? 'View calls from your team members'
                : 'Manage AI-powered outbound calling campaigns')}
          </p>
        </div>
        {/* Only show campaign controls for full admins */}
        {isFullAdmin && (
          <div className="flex gap-1.5">
            <button
              onClick={() => navigate('/outbound-calls/single')}
              className="btn btn-outline btn-sm flex items-center gap-1 text-xs"
            >
              <PhoneIcon className="h-4 w-4" />
              Single Call
            </button>
            <button
              onClick={() => navigate('/outbound-calls/campaigns/create')}
              className="btn btn-primary btn-sm flex items-center gap-1 text-xs"
            >
              <PlusIcon className="h-4 w-4" />
              New Campaign
            </button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      {analytics && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
          <div className="card p-2">
            <p className="text-xs text-gray-500">Total Calls</p>
            <p className="text-lg font-semibold text-gray-900">{analytics.totalCalls}</p>
          </div>
          <div className="card p-2">
            <p className="text-xs text-gray-500">Answered</p>
            <p className="text-lg font-semibold text-green-600">{analytics.answeredCalls}</p>
          </div>
          <div className="card p-2">
            <p className="text-xs text-gray-500">Answer Rate</p>
            <p className="text-lg font-semibold text-blue-600">{analytics.answerRate}%</p>
          </div>
          <div className="card p-2">
            <p className="text-xs text-gray-500">Leads</p>
            <p className="text-lg font-semibold text-purple-600">{analytics.leadsGenerated}</p>
          </div>
          <div className="card p-2">
            <p className="text-xs text-gray-500">Conversion</p>
            <p className="text-lg font-semibold text-primary-600">{analytics.conversionRate}%</p>
          </div>
          <div className="card p-2">
            <p className="text-xs text-gray-500">Avg Duration</p>
            <p className="text-lg font-semibold text-gray-900">{formatDuration(analytics.avgDuration)}</p>
          </div>
        </div>
      )}

      {/* Tabs based on role */}
      {isTelecaller ? (
        // Telecallers only see their own calls tab
        <div className="border-b border-gray-200 mb-4">
          <nav className="-mb-px flex gap-4">
            <button
              className="py-2 px-1 border-b-2 text-xs font-medium border-primary-600 text-primary-600"
            >
              <PhoneIcon className="h-4 w-4 inline mr-1" />
              My Calls ({telecallerCallsTotal})
            </button>
          </nav>
        </div>
      ) : isTeamManager ? (
        // Managers/Team Leads see team calls tab
        <div className="border-b border-gray-200 mb-4">
          <nav className="-mb-px flex gap-4">
            <button
              className="py-2 px-1 border-b-2 text-xs font-medium border-primary-600 text-primary-600"
            >
              <UserGroupIcon className="h-4 w-4 inline mr-1" />
              Team Calls ({telecallerCallsTotal})
            </button>
          </nav>
        </div>
      ) : (
        // Full admins see all tabs
        <div className="border-b border-gray-200 mb-4">
          <nav className="-mb-px flex gap-4">
            <button
              onClick={() => setActiveTab('campaigns')}
              className={`py-2 px-1 border-b-2 text-xs font-medium ${
                activeTab === 'campaigns'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <CpuChipIcon className="h-4 w-4 inline mr-1" />
              AI Campaigns ({campaigns.length})
            </button>
            <button
              onClick={() => setActiveTab('calls')}
              className={`py-2 px-1 border-b-2 text-xs font-medium ${
                activeTab === 'calls'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <CpuChipIcon className="h-4 w-4 inline mr-1" />
              AI Calls ({calls.length})
            </button>
            <button
              onClick={() => setActiveTab('telecaller-calls')}
              className={`py-2 px-1 border-b-2 text-xs font-medium ${
                activeTab === 'telecaller-calls'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <UserGroupIcon className="h-4 w-4 inline mr-1" />
              Telecaller Calls ({telecallerCallsTotal})
            </button>
          </nav>
        </div>
      )}

      {/* Campaigns Table */}
      {activeTab === 'campaigns' && (
      <div className="card">
        <div className="card-header py-2">
          <h2 className="text-sm font-medium">Campaigns</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">
                  Campaign
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">
                  Agent
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">
                  Contacts
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">
                  Progress
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">
                  Leads
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-3 py-2 text-right text-[10px] font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    <CpuChipIcon className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                    <p className="text-sm font-medium">No campaigns yet</p>
                    <p className="text-xs mt-1">Create a campaign to start AI calling</p>
                    <button
                      onClick={() => navigate('/outbound-calls/campaigns/create')}
                      className="mt-2 btn btn-primary btn-sm text-xs"
                    >
                      Create Campaign
                    </button>
                  </td>
                </tr>
              ) : (
                campaigns.map((campaign) => {
                  const progressPercent = campaign.totalContacts > 0
                    ? Math.round((campaign.completedCalls / campaign.totalContacts) * 100)
                    : 0;

                  return (
                    <tr
                      key={campaign.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/outbound-calls/campaigns/${campaign.id}`)}
                    >
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center">
                          <CpuChipIcon className="h-4 w-4 text-purple-400 mr-1.5" />
                          <div>
                            <p className="text-xs font-medium text-gray-900">{campaign.name}</p>
                            <span className={`inline-flex items-center px-1 py-0.5 rounded text-[10px] font-medium ${
                              campaign.callingMode === 'MANUAL' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {campaign.callingMode === 'MANUAL' ? 'Manual' : 'Auto'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                        {campaign.agent?.name || '-'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-xs">
                          <UserGroupIcon className="h-3 w-3 text-gray-400" />
                          <span className="font-medium text-gray-900">{campaign.totalContacts}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="w-20">
                          <div className="flex justify-between text-[10px] mb-0.5">
                            <span className="text-gray-600">{campaign.completedCalls}/{campaign.totalContacts}</span>
                            <span className="text-gray-400">{progressPercent}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary-600 rounded-full"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="text-xs font-medium text-purple-600">{campaign.leadsGenerated}</span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {getStatusBadge(campaign.status)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          {(campaign.status === 'DRAFT' || campaign.status === 'PAUSED') && (
                            <button
                              onClick={(e) => startCampaign(e, campaign.id)}
                              className="p-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                              title="Start"
                            >
                              <PlayIcon className="h-3 w-3" />
                            </button>
                          )}
                          {campaign.status === 'RUNNING' && campaign.callingMode === 'AUTOMATIC' && (
                            <button
                              onClick={(e) => pauseCampaign(e, campaign.id)}
                              className="p-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                              title="Pause"
                            >
                              <PauseIcon className="h-3 w-3" />
                            </button>
                          )}
                          <button className="text-primary-600 hover:text-primary-800 flex items-center gap-0.5 text-xs">
                            View
                            <ArrowRightIcon className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Recent AI Calls Table */}
      {activeTab === 'calls' && (
      <div className="card">
        <div className="card-header py-2 flex justify-between items-center">
          <h2 className="text-sm font-medium">AI Calls</h2>
          <span className="text-[10px] text-gray-500">{calls.length} latest</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Contact</th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Campaign</th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Status</th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Duration</th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Outcome</th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Date</th>
                <th className="px-3 py-2 text-right text-[10px] font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {calls.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-gray-500">
                    <PhoneIcon className="h-6 w-6 mx-auto text-gray-300 mb-1" />
                    <p className="text-xs">No AI calls yet</p>
                  </td>
                </tr>
              ) : (
                calls.map((call) => (
                  <tr
                    key={call.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/outbound-calls/calls/${call.id}/summary`)}
                  >
                    <td className="px-3 py-2 whitespace-nowrap">
                      <p className="text-xs font-medium text-gray-900">{call.contactName || call.phoneNumber}</p>
                      {call.contactName && <p className="text-[10px] text-gray-500">{call.phoneNumber}</p>}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                      {call.campaign?.name || '-'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        call.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                        call.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                        call.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {statusLabels[call.status] || call.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">
                      {call.duration ? formatDuration(call.duration) : '-'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {call.outcome ? (
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          call.outcome === 'INTERESTED' || call.outcome === 'CONVERTED'
                            ? 'bg-green-100 text-green-700'
                            : call.outcome === 'NOT_INTERESTED'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {outcomeLabels[call.outcome] || call.outcome}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                      {formatDate(call.createdAt)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-right">
                      <button className="text-primary-600 hover:text-primary-800 flex items-center gap-0.5 text-xs ml-auto">
                        View
                        <ArrowRightIcon className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Telecaller Calls Table */}
      {activeTab === 'telecaller-calls' && (
      <div className="card">
        <div className="card-header py-2">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-medium">
              {isTelecaller ? 'My Calls' : (isTeamManager ? 'Team Calls' : 'Telecaller Calls')}
            </h2>
            <span className="text-[10px] text-gray-500">{telecallerCallsTotal} total</span>
          </div>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[150px] max-w-[200px]">
              <MagnifyingGlassIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={tcFilterSearch}
                onChange={(e) => setTcFilterSearch(e.target.value)}
                className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            {/* Show telecaller filter for admins, managers, and team leads */}
            {canViewAllCalls && (
              <select
                value={tcFilterTelecaller}
                onChange={(e) => setTcFilterTelecaller(e.target.value)}
                className="text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">{isTeamManager ? 'All Team Members' : 'All Telecallers'}</option>
                {telecallers.map((tc) => (
                  <option key={tc.id} value={tc.id}>{tc.firstName} {tc.lastName}</option>
                ))}
              </select>
            )}
            <select
              value={tcFilterOutcome}
              onChange={(e) => setTcFilterOutcome(e.target.value)}
              className="text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">All Outcomes</option>
              <option value="INTERESTED">Interested</option>
              <option value="NOT_INTERESTED">Not Interested</option>
              <option value="CALLBACK_REQUESTED">Callback</option>
              <option value="NO_ANSWER">No Answer</option>
              <option value="CONNECTED">Connected</option>
              <option value="PENDING">Pending</option>
            </select>
            <input
              type="date"
              value={tcFilterDateFrom}
              onChange={(e) => setTcFilterDateFrom(e.target.value)}
              className="text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="From"
            />
            <input
              type="date"
              value={tcFilterDateTo}
              onChange={(e) => setTcFilterDateTo(e.target.value)}
              className="text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="To"
            />
            {(tcFilterTelecaller || tcFilterOutcome || tcFilterSearch || tcFilterDateFrom || tcFilterDateTo) && (
              <button
                onClick={clearTcFilters}
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <XMarkIcon className="h-3.5 w-3.5" />
                Clear
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Contact</th>
                {/* Show telecaller column for admins, managers, team leads */}
                {canViewAllCalls && (
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Telecaller</th>
                )}
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Status</th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Duration</th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Outcome</th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">AI Analysis</th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Date</th>
                <th className="px-3 py-2 text-right text-[10px] font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tcLoading ? (
                <tr>
                  <td colSpan={canViewAllCalls ? 8 : 7} className="px-4 py-6 text-center text-gray-500">
                    <p className="text-xs">Loading...</p>
                  </td>
                </tr>
              ) : telecallerCalls.length === 0 ? (
                <tr>
                  <td colSpan={canViewAllCalls ? 8 : 7} className="px-4 py-6 text-center text-gray-500">
                    <UserGroupIcon className="h-6 w-6 mx-auto text-gray-300 mb-1" />
                    <p className="text-xs">{isTelecaller ? 'No calls found' : (isTeamManager ? 'No team calls found' : 'No telecaller calls found')}</p>
                  </td>
                </tr>
              ) : (
                telecallerCalls.map((call) => (
                  <tr key={call.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => viewTelecallerCallSummary(call.id)}>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <p className="text-xs font-medium text-gray-900">
                        {call.contactName || (call.lead?.firstName ? `${call.lead.firstName} ${call.lead.lastName || ''}`.trim() : call.phoneNumber)}
                      </p>
                      <p className="text-[10px] text-gray-500">{call.phoneNumber}</p>
                    </td>
                    {/* Show telecaller column for admins, managers, team leads */}
                    {canViewAllCalls && (
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">
                        {call.telecaller ? `${call.telecaller.firstName} ${call.telecaller.lastName}` : '-'}
                      </td>
                    )}
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        call.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                        call.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                        call.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {statusLabels[call.status] || call.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">
                      {call.duration ? formatDuration(call.duration) : '-'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {call.outcome ? (
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          call.outcome === 'INTERESTED' || call.outcome === 'CONVERTED' || call.outcome === 'CONNECTED'
                            ? 'bg-green-100 text-green-700'
                            : call.outcome === 'NOT_INTERESTED'
                            ? 'bg-red-100 text-red-700'
                            : call.outcome === 'NO_ANSWER'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {outcomeLabels[call.outcome] || call.outcome}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Pending</span>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {call.aiAnalyzed ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700">
                          <CpuChipIcon className="h-3 w-3" />
                          {call.sentiment || 'Analyzed'}
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                      {formatDate(call.createdAt)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); viewTelecallerCallSummary(call.id); }}
                        className="text-primary-600 hover:text-primary-800 flex items-center gap-0.5 text-xs ml-auto"
                      >
                        <ArrowRightIcon className="h-3.5 w-3.5" />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
};

export default OutboundCallsPage;
