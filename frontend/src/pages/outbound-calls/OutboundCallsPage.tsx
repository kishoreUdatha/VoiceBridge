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
  callType?: 'OUTBOUND' | 'INBOUND';
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
  // New stats for telecallers
  totalConnected?: number;
  totalUnconnected?: number;
  totalLost?: number;
  todayPerformance?: {
    calls: number;
    connected: number;
    unconnected: number;
    lost: number;
    interested: number;
  };
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
  const [telecallerOutcomeCounts, setTelecallerOutcomeCounts] = useState<Record<string, number>>({});
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [aiCallsAnalytics, setAiCallsAnalytics] = useState<Analytics | null>(null);
  const [telecallerAnalytics, setTelecallerAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  // Telecallers go directly to their calls tab, managers/team leads see telecaller-calls tab
  const [activeTab, setActiveTab] = useState<'campaigns' | 'calls' | 'telecaller-calls'>(
    isTelecaller ? 'telecaller-calls' : (isTeamManager ? 'telecaller-calls' : 'campaigns')
  );

  // Telecaller calls filters
  const [telecallers, setTelecallers] = useState<Telecaller[]>([]);
  const [tcFilterTelecaller, setTcFilterTelecaller] = useState('');
  const [tcFilterOutcome, setTcFilterOutcome] = useState('');
  const [tcFilterCallType, setTcFilterCallType] = useState('');
  const [tcFilterDuration, setTcFilterDuration] = useState('');
  const [tcFilterSearch, setTcFilterSearch] = useState('');
  const [tcFilterDateFrom, setTcFilterDateFrom] = useState('');
  const [tcFilterDateTo, setTcFilterDateTo] = useState('');
  const [tcFilterDatePreset, setTcFilterDatePreset] = useState('');
  const [tcLoading, setTcLoading] = useState(false);

  // Format date in local timezone (YYYY-MM-DD)
  const formatLocalDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Date preset helper function
  const applyDatePreset = (preset: string) => {
    setTcFilterDatePreset(preset);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let fromDate: Date;
    let toDate: Date = new Date();
    toDate.setHours(23, 59, 59, 999);

    switch (preset) {
      case 'today':
        fromDate = today;
        toDate = new Date();
        toDate.setHours(23, 59, 59, 999);
        break;
      case 'yesterday':
        fromDate = new Date(today);
        fromDate.setDate(fromDate.getDate() - 1);
        toDate = new Date(fromDate);
        toDate.setHours(23, 59, 59, 999);
        break;
      case 'last7days':
        fromDate = new Date(today);
        fromDate.setDate(fromDate.getDate() - 6);
        break;
      case 'lastweek':
        // Last week (Monday to Sunday of previous week)
        const dayOfWeek = today.getDay();
        const daysToLastMonday = dayOfWeek === 0 ? 13 : dayOfWeek + 6;
        fromDate = new Date(today);
        fromDate.setDate(fromDate.getDate() - daysToLastMonday);
        toDate = new Date(fromDate);
        toDate.setDate(toDate.getDate() + 6);
        toDate.setHours(23, 59, 59, 999);
        break;
      case 'thismonth':
        fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'lastmonth':
        fromDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        toDate = new Date(today.getFullYear(), today.getMonth(), 0);
        toDate.setHours(23, 59, 59, 999);
        break;
      case 'custom':
        // Don't change dates, let user select manually
        return;
      default:
        // Clear dates
        setTcFilterDateFrom('');
        setTcFilterDateTo('');
        return;
    }

    // Use local timezone formatting instead of UTC (toISOString)
    setTcFilterDateFrom(formatLocalDate(fromDate));
    setTcFilterDateTo(formatLocalDate(toDate));
  };


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
      // - telecallers: /telecaller/calls (own calls only) + /telecaller/stats (own stats)
      // - managers/team_leads/admins: /telecaller/all-calls (backend filters based on role)
      const telecallerCallsEndpoint = isTelecaller
        ? `/telecaller/calls?limit=50&_t=${timestamp}`
        : `/telecaller/all-calls?limit=50&_t=${timestamp}`;

      // Use telecaller-specific stats for telecallers/counselors
      // For admins, use source=ai to get only AI call analytics (not combined with telecaller calls)
      const analyticsEndpoint = isTelecaller
        ? `/telecaller/stats?_t=${timestamp}`
        : `/outbound-calls/analytics?source=ai&_t=${timestamp}`;

      const [campaignsRes, callsRes, analyticsRes, telecallerCallsRes] = await Promise.all([
        api.get('/outbound-calls/campaigns'),
        api.get('/outbound-calls/calls?limit=10'),
        api.get(analyticsEndpoint),
        api.get(telecallerCallsEndpoint).catch((err) => {
          console.error('Telecaller calls fetch error:', err);
          return { data: { success: false, error: err.message } };
        }),
      ]);

      if (campaignsRes.data.success) setCampaigns(campaignsRes.data.data);
      if (callsRes.data.success) setCalls(callsRes.data.data.calls || []);

      // Handle analytics based on role
      if (analyticsRes.data.success) {
        if (isTelecaller) {
          // Transform telecaller stats to match Analytics interface
          const tcStats = analyticsRes.data.data;
          const callsByOutcome = tcStats.callsByOutcome || {};
          const answeredCalls = Object.entries(callsByOutcome)
            .filter(([outcome]) => !['NO_ANSWER', 'BUSY', 'VOICEMAIL', null].includes(outcome))
            .reduce((sum, [, count]) => sum + (count as number), 0);

          // Leads = INTERESTED calls (potential leads)
          // Conversion = only CONVERTED (won) calls
          const interestedCalls = callsByOutcome['INTERESTED'] || 0;
          const convertedCalls = callsByOutcome['CONVERTED'] || 0;

          const telecallerStats = {
            totalCalls: tcStats.totalCalls || 0,
            completedCalls: tcStats.totalCalls || 0,
            answeredCalls: answeredCalls,
            answerRate: tcStats.totalCalls > 0
              ? ((answeredCalls / tcStats.totalCalls) * 100).toFixed(1)
              : '0.0',
            leadsGenerated: interestedCalls + convertedCalls,
            conversionRate: tcStats.totalCalls > 0
              ? Math.round((convertedCalls / tcStats.totalCalls) * 100)
              : 0,
            avgDuration: tcStats.averageCallDuration || 0,
            totalConnected: tcStats.totalConnected || 0,
            totalUnconnected: tcStats.totalUnconnected || 0,
            totalLost: tcStats.totalLost || 0,
            todayPerformance: tcStats.todayPerformance,
          };
          setAnalytics(telecallerStats);
          setTelecallerAnalytics(telecallerStats);
        } else {
          // For admin - this is AI calls analytics
          setAiCallsAnalytics(analyticsRes.data.data);
          setAnalytics(analyticsRes.data.data);
        }
      }

      // Debug telecaller calls response
      console.log('Full telecaller response:', telecallerCallsRes);
      console.log('Telecaller data:', telecallerCallsRes.data);

      if (telecallerCallsRes.data.success) {
        const tcCalls = telecallerCallsRes.data.data?.calls || [];
        const total = telecallerCallsRes.data.data?.total || 0;
        const outcomeCounts = telecallerCallsRes.data.data?.outcomeCounts || {};
        console.log(`Setting ${tcCalls.length} telecaller calls, total: ${total}, outcomeCounts:`, outcomeCounts);
        setTelecallerCalls(tcCalls);
        setTelecallerCallsTotal(total);
        setTelecallerOutcomeCounts(outcomeCounts);

        // For admin - use backend-provided outcome counts (accurate for all calls)
        if (!isTelecaller) {
          // Use outcomeCounts from backend instead of calculating from partial data
          const interested = (outcomeCounts['INTERESTED'] || 0) + (outcomeCounts['CONNECTED'] || 0);
          const callback = outcomeCounts['CALLBACK_REQUESTED'] || outcomeCounts['CALLBACK'] || 0;
          const converted = outcomeCounts['CONVERTED'] || 0;
          const noAnswer = outcomeCounts['NO_ANSWER'] || 0;
          const busy = outcomeCounts['BUSY'] || 0;
          const voicemail = outcomeCounts['VOICEMAIL'] || 0;
          const notInterested = outcomeCounts['NOT_INTERESTED'] || 0;
          const pending = outcomeCounts['PENDING'] || 0;

          const connected = interested + callback + converted;
          const unconnected = noAnswer + busy + voicemail;
          const lost = notInterested;

          // Calculate avg duration from loaded calls (best effort)
          let totalDuration = 0, durationCount = 0;
          tcCalls.forEach((call: TelecallerCall) => {
            if (call.duration) {
              totalDuration += call.duration;
              durationCount++;
            }
          });

          setTelecallerAnalytics({
            totalCalls: total,
            completedCalls: total,
            answeredCalls: connected,
            answerRate: total > 0 ? ((connected / total) * 100).toFixed(1) : '0.0',
            leadsGenerated: interested + converted,
            conversionRate: total > 0 ? Math.round((converted / total) * 100) : 0,
            avgDuration: durationCount > 0 ? Math.round(totalDuration / durationCount) : 0,
            totalConnected: connected,
            totalUnconnected: unconnected,
            totalLost: lost,
          });
        }
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
      if (tcFilterCallType) params.append('callType', tcFilterCallType);
      if (tcFilterDuration) params.append('duration', tcFilterDuration);
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
        setTelecallerOutcomeCounts(res.data.data?.outcomeCounts || {});
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
  }, [tcFilterTelecaller, tcFilterOutcome, tcFilterCallType, tcFilterDuration, tcFilterDateFrom, tcFilterDateTo, activeTab]);

  // Recalculate telecaller analytics when outcomeCounts changes
  useEffect(() => {
    if (!isTelecaller && Object.keys(telecallerOutcomeCounts).length > 0) {
      // Use backend-provided outcomeCounts for accurate stats
      const interested = (telecallerOutcomeCounts['INTERESTED'] || 0) + (telecallerOutcomeCounts['CONNECTED'] || 0);
      const callback = telecallerOutcomeCounts['CALLBACK_REQUESTED'] || telecallerOutcomeCounts['CALLBACK'] || 0;
      const converted = telecallerOutcomeCounts['CONVERTED'] || 0;
      const noAnswer = telecallerOutcomeCounts['NO_ANSWER'] || 0;
      const busy = telecallerOutcomeCounts['BUSY'] || 0;
      const voicemail = telecallerOutcomeCounts['VOICEMAIL'] || 0;
      const notInterested = telecallerOutcomeCounts['NOT_INTERESTED'] || 0;

      const connected = interested + callback + converted;
      const unconnected = noAnswer + busy + voicemail;
      const lost = notInterested;

      // Calculate avg duration from loaded calls (best effort)
      let totalDuration = 0, durationCount = 0;
      telecallerCalls.forEach((call) => {
        if (call.duration) {
          totalDuration += call.duration;
          durationCount++;
        }
      });

      setTelecallerAnalytics({
        totalCalls: telecallerCallsTotal || telecallerCalls.length,
        completedCalls: telecallerCallsTotal || telecallerCalls.length,
        answeredCalls: connected,
        answerRate: telecallerCallsTotal > 0 ? ((connected / telecallerCallsTotal) * 100).toFixed(1) : '0.0',
        leadsGenerated: interested + converted,
        conversionRate: telecallerCallsTotal > 0 ? Math.round((converted / telecallerCallsTotal) * 100) : 0,
        avgDuration: durationCount > 0 ? Math.round(totalDuration / durationCount) : 0,
        totalConnected: connected,
        totalUnconnected: unconnected,
        totalLost: lost,
      });
    }
  }, [telecallerOutcomeCounts, telecallerCallsTotal, telecallerCalls, isTelecaller]);

  const clearTcFilters = () => {
    setTcFilterTelecaller('');
    setTcFilterOutcome('');
    setTcFilterCallType('');
    setTcFilterDuration('');
    setTcFilterSearch('');
    setTcFilterDateFrom('');
    setTcFilterDateTo('');
    setTcFilterDatePreset('');
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
            {isTelecaller ? 'My Calls' : (isTeamManager ? 'Team Calls' : (
              activeTab === 'campaigns' ? 'AI Calling Campaigns' :
              activeTab === 'calls' ? 'AI Calls' : 'Telecaller Calls'
            ))}
          </h1>
          <p className="text-xs text-gray-500">
            {isTelecaller
              ? 'View your call history and AI analysis'
              : (isTeamManager
                ? 'View calls from your team members'
                : (activeTab === 'campaigns' ? 'Manage AI-powered outbound calling campaigns' :
                   activeTab === 'calls' ? 'View AI agent call history' :
                   'View all telecaller call history'))}
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

      {/* Stats Cards - Tab-specific View */}
      {(() => {
        // For campaigns tab, show campaign summary stats
        if (activeTab === 'campaigns') {
          const totalContacts = campaigns.reduce((sum, c) => sum + c.totalContacts, 0);
          const completedCalls = campaigns.reduce((sum, c) => sum + c.completedCalls, 0);
          const successfulCalls = campaigns.reduce((sum, c) => sum + c.successfulCalls, 0);
          const leadsGenerated = campaigns.reduce((sum, c) => sum + c.leadsGenerated, 0);
          const runningCount = campaigns.filter(c => c.status === 'RUNNING').length;

          return (
            <div className="card p-3 mb-4">
              <div className="grid grid-cols-6 gap-3">
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Campaigns</p>
                  <p className="text-xl font-bold text-gray-900">{campaigns.length}</p>
                  <p className="text-[10px] text-green-600 mt-0.5">{runningCount} Running</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Total Contacts</p>
                  <p className="text-xl font-bold text-blue-600">{totalContacts}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Completed</p>
                  <p className="text-xl font-bold text-green-600">{completedCalls}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Successful</p>
                  <p className="text-xl font-bold text-emerald-600">{successfulCalls}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Leads</p>
                  <p className="text-xl font-bold text-purple-600">{leadsGenerated}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Success Rate</p>
                  <p className="text-xl font-bold text-primary-600">
                    {completedCalls > 0 ? Math.round((successfulCalls / completedCalls) * 100) : 0}%
                  </p>
                </div>
              </div>
            </div>
          );
        }

        // For AI Calls tab - show AI calls analytics
        if (activeTab === 'calls') {
          const aiStats = aiCallsAnalytics;
          return (
            <div className="card p-3 mb-4">
              <div className="grid grid-cols-6 gap-3">
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Total Calls</p>
                  <p className="text-xl font-bold text-gray-900">{aiStats?.totalCalls || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Answered</p>
                  <p className="text-xl font-bold text-green-600">{aiStats?.answeredCalls || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Answer Rate</p>
                  <p className="text-xl font-bold text-blue-600">{aiStats?.answerRate || 0}%</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Leads</p>
                  <p className="text-xl font-bold text-purple-600">{aiStats?.leadsGenerated || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Conversion</p>
                  <p className="text-xl font-bold text-primary-600">{aiStats?.conversionRate || 0}%</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Avg Duration</p>
                  <p className="text-xl font-bold text-gray-900">{formatDuration(aiStats?.avgDuration || 0)}</p>
                </div>
              </div>
            </div>
          );
        }

        // For Telecaller Calls tab - use backend-provided outcomeCounts for accurate stats
        if (activeTab === 'telecaller-calls') {
          // Use outcomeCounts from backend (accurate for ALL calls, not just loaded ones)
          const interested = (telecallerOutcomeCounts['INTERESTED'] || 0) + (telecallerOutcomeCounts['CONNECTED'] || 0);
          const notInterested = telecallerOutcomeCounts['NOT_INTERESTED'] || 0;
          const callback = telecallerOutcomeCounts['CALLBACK_REQUESTED'] || telecallerOutcomeCounts['CALLBACK'] || 0;
          const converted = telecallerOutcomeCounts['CONVERTED'] || 0;
          const noAnswer = telecallerOutcomeCounts['NO_ANSWER'] || 0;
          const busy = telecallerOutcomeCounts['BUSY'] || 0;
          const voicemail = telecallerOutcomeCounts['VOICEMAIL'] || 0;
          const pending = telecallerOutcomeCounts['PENDING'] || 0;

          // Calculate avg duration from loaded calls (best effort for display)
          let totalDuration = 0, durationCount = 0;
          telecallerCalls.forEach((call) => {
            if (call.duration) {
              totalDuration += call.duration;
              durationCount++;
            }
          });

          // Connected = calls where customer answered and had conversation (excluding lost/not interested)
          const connected = interested + callback + converted;
          const unconnected = noAnswer + busy + voicemail;

          // Lost = Not Interested (customer answered but rejected)
          const lost = notInterested;

          return (
            <div className="grid grid-cols-4 gap-2 mb-4">
              {/* Summary Card */}
              <div className="card p-2.5 bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
                <h4 className="text-[9px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Summary</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-lg font-bold text-slate-800">{telecallerCallsTotal}</p>
                    <p className="text-[9px] text-slate-500">Total</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-purple-600">
                      {telecallerCallsTotal > 0 ? Math.round((converted / telecallerCallsTotal) * 100) : 0}%
                    </p>
                    <p className="text-[9px] text-slate-500">Conversion</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-blue-600">
                      {formatDuration(durationCount > 0 ? Math.round(totalDuration / durationCount) : 0)}
                    </p>
                    <p className="text-[9px] text-slate-500">Avg Duration</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-400">{pending}</p>
                    <p className="text-[9px] text-slate-500">Pending</p>
                  </div>
                </div>
              </div>

              {/* Connected Outcomes Card */}
              <div className="card p-2.5 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[9px] font-semibold text-green-700 uppercase tracking-wide">Connected</h4>
                  <span className="text-sm font-bold text-green-600">{connected}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-600">Interested</span>
                    <span className="text-xs font-semibold text-green-600 bg-green-100 px-1.5 py-0.5 rounded">{interested}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-600">Callback</span>
                    <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">{callback}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-600">Converted</span>
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">{converted}</span>
                  </div>
                </div>
              </div>

              {/* Not Connected Card */}
              <div className="card p-2.5 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[9px] font-semibold text-amber-700 uppercase tracking-wide">Not Connected</h4>
                  <span className="text-sm font-bold text-amber-600">{unconnected}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-600">No Answer</span>
                    <span className="text-xs font-semibold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">{noAnswer}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-600">Busy</span>
                    <span className="text-xs font-semibold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">{busy}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-600">Voicemail</span>
                    <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">{voicemail}</span>
                  </div>
                </div>
              </div>

              {/* Lost Card */}
              <div className="card p-2.5 bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[9px] font-semibold text-red-700 uppercase tracking-wide">Lost</h4>
                  <span className="text-sm font-bold text-red-600">{lost}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-600">Not Interested</span>
                    <span className="text-xs font-semibold text-red-600 bg-red-100 px-1.5 py-0.5 rounded">{notInterested}</span>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-red-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-gray-500">Loss Rate</span>
                    <span className="text-xs font-bold text-red-600">
                      {telecallerCallsTotal > 0 ? Math.round((lost / telecallerCallsTotal) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        }
      })()}

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
            <select
              value={tcFilterCallType}
              onChange={(e) => setTcFilterCallType(e.target.value)}
              className="text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">All Types</option>
              <option value="OUTBOUND">Outbound</option>
              <option value="INBOUND">Inbound</option>
            </select>
            <select
              value={tcFilterDuration}
              onChange={(e) => setTcFilterDuration(e.target.value)}
              className="text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">All Durations</option>
              <option value="short">&lt; 30s</option>
              <option value="medium">30s - 2min</option>
              <option value="long">&gt; 2min</option>
            </select>
            <select
              value={tcFilterDatePreset}
              onChange={(e) => applyDatePreset(e.target.value)}
              className="text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last7days">Last 7 Days</option>
              <option value="lastweek">Last Week</option>
              <option value="thismonth">This Month</option>
              <option value="lastmonth">Last Month</option>
              <option value="custom">Custom Range</option>
            </select>
            {tcFilterDatePreset === 'custom' && (
              <>
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
              </>
            )}
            {(tcFilterTelecaller || tcFilterOutcome || tcFilterCallType || tcFilterDuration || tcFilterSearch || tcFilterDatePreset || tcFilterDateFrom || tcFilterDateTo) && (
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
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Type</th>
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
                  <td colSpan={canViewAllCalls ? 9 : 8} className="px-4 py-6 text-center text-gray-500">
                    <p className="text-xs">Loading...</p>
                  </td>
                </tr>
              ) : telecallerCalls.length === 0 ? (
                <tr>
                  <td colSpan={canViewAllCalls ? 9 : 8} className="px-4 py-6 text-center text-gray-500">
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
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        call.callType === 'INBOUND' ? 'bg-teal-100 text-teal-700' : 'bg-sky-100 text-sky-700'
                      }`}>
                        {call.callType === 'INBOUND' ? '↙ Inbound' : '↗ Outbound'}
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
