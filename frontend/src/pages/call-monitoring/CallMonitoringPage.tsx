import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowPathIcon,
  MagnifyingGlassIcon,
  MicrophoneIcon,
  SpeakerWaveIcon,
  PhoneXMarkIcon,
  EyeIcon,
  ChatBubbleLeftIcon,
  PhoneArrowUpRightIcon,
  SparklesIcon,
  UserIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  ChartBarIcon,
  CalendarIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import {
  callMonitoringService,
  ActiveCall,
  AgentStatus,
  CallAnalytics,
} from '../../services/call-monitoring.service';
import api from '../../services/api';
import { branchService, Branch } from '../../services/branch.service';

interface Telecaller {
  id: string;
  firstName: string;
  lastName?: string;
  email: string;
}

interface TelecallerCall {
  id: string;
  phoneNumber: string;
  contactName?: string;
  status: string;
  outcome?: string;
  duration?: number;
  sentiment?: string;
  summary?: string;
  createdAt: string;
  telecaller?: {
    id: string;
    firstName: string;
    lastName?: string;
    email: string;
  };
  lead?: {
    id: string;
    firstName: string;
    lastName?: string;
    phone: string;
  };
}

const OUTCOMES = [
  { value: '', label: 'All Outcomes' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'INTERESTED', label: 'Interested' },
  { value: 'NOT_INTERESTED', label: 'Not Interested' },
  { value: 'CALLBACK', label: 'Callback' },
  { value: 'CONVERTED', label: 'Converted' },
  { value: 'NO_ANSWER', label: 'No Answer' },
  { value: 'WRONG_NUMBER', label: 'Wrong Number' },
  { value: 'BUSY', label: 'Busy' },
];

type DateRangeOption = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'custom';

interface DateRange {
  label: string;
  startDate: Date;
  endDate: Date;
}

const getDateRange = (option: DateRangeOption, customStart?: Date, customEnd?: Date): DateRange => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (option) {
    case 'today':
      return { label: 'Today', startDate: today, endDate: now };
    case 'yesterday':
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { label: 'Yesterday', startDate: yesterday, endDate: today };
    case 'last7days':
      const last7 = new Date(today);
      last7.setDate(last7.getDate() - 7);
      return { label: 'Last 7 Days', startDate: last7, endDate: now };
    case 'last30days':
      const last30 = new Date(today);
      last30.setDate(last30.getDate() - 30);
      return { label: 'Last 30 Days', startDate: last30, endDate: now };
    case 'custom':
      return {
        label: customStart && customEnd
          ? `${customStart.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} - ${customEnd.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`
          : 'Custom Range',
        startDate: customStart || today,
        endDate: customEnd || now
      };
    default:
      return { label: 'Today', startDate: today, endDate: now };
  }
};

// Return empty data - no mock data
const generateChartData = (_option: DateRangeOption) => {
  return []; // No mock data - show empty state
};

const getTotalCalls = (_option: DateRangeOption, _type: 'AI' | 'HUMAN') => {
  return 0; // No mock data
};

// Return empty status data - no mock data
const generateStatusData = (_option: DateRangeOption, _type: 'AI' | 'HUMAN') => {
  return []; // No mock data - show empty state
};

// Return empty queue data - no mock data
const generateQueueData = (_option: DateRangeOption, _type: 'AI' | 'HUMAN') => {
  return []; // No mock data - show empty state
};

// Interfaces imported from call-monitoring.service.ts

// Empty initial data - will be populated from API
const initialCalls: ActiveCall[] = [];
const initialAgents: AgentStatus[] = [];



export const CallMonitoringPage: React.FC = () => {
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>(initialCalls);
  const [agentStatuses, setAgentStatuses] = useState<AgentStatus[]>(initialAgents);
  const [analytics, setAnalytics] = useState<CallAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'AI' | 'HUMAN'>('AI');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [queueFilter, setQueueFilter] = useState<string>('all');
  const [monitoringCall, setMonitoringCall] = useState<ActiveCall | null>(null);
  const [monitorMode, setMonitorMode] = useState<'LISTEN' | 'WHISPER' | 'BARGE'>('LISTEN');
  const [isMuted, setIsMuted] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [selectedCall, setSelectedCall] = useState<ActiveCall | null>(null);
  const [dateRangeOption, setDateRangeOption] = useState<DateRangeOption>('today');
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  // Telecaller-specific filters
  const [telecallers, setTelecallers] = useState<Telecaller[]>([]);
  const [selectedTelecaller, setSelectedTelecaller] = useState<string>('');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('');
  const [telecallerCalls, setTelecallerCalls] = useState<TelecallerCall[]>([]);
  const [telecallerCallsTotal, setTelecallerCallsTotal] = useState(0);
  const [outcomeCounts, setOutcomeCounts] = useState<Record<string, number>>({});
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [telecallerLoading, setTelecallerLoading] = useState(false);

  const dateRange = useMemo(() =>
    getDateRange(dateRangeOption, customStartDate ? new Date(customStartDate) : undefined, customEndDate ? new Date(customEndDate) : undefined),
    [dateRangeOption, customStartDate, customEndDate]
  );

  // Stable ISO string representations for dependency tracking
  const dateFromISO = useMemo(() => dateRange.startDate.toISOString(), [dateRange.startDate.getTime()]);
  const dateToISO = useMemo(() => dateRange.endDate.toISOString(), [dateRange.endDate.getTime()]);

  // Check if analytics has meaningful data (non-zero values)
  const hasRealAnalytics = useMemo(() => {
    if (!analytics) return false;
    // Check if any volume data has non-zero counts
    const hasVolume = analytics.volumeData?.some(v => v.count > 0);
    // Check if total calls is non-zero
    const hasTotal = (analytics.totalCalls || 0) > 0;
    return hasVolume || hasTotal;
  }, [analytics]);

  // Use API data if available with real data, fallback to mock data
  const chartData = useMemo(() => {
    if (hasRealAnalytics && analytics?.volumeData && analytics.volumeData.length > 0) {
      return analytics.volumeData.map(v => ({
        label: v.label,
        ai: activeTab === 'AI' ? v.count : 0,
        human: activeTab === 'HUMAN' ? v.count : 0,
      }));
    }
    return generateChartData(dateRangeOption);
  }, [hasRealAnalytics, analytics, dateRangeOption, activeTab]);

  const totalCallsInRange = useMemo(() => {
    if (hasRealAnalytics && analytics?.totalCalls !== undefined && analytics.totalCalls > 0) {
      return analytics.totalCalls;
    }
    return getTotalCalls(dateRangeOption, activeTab);
  }, [hasRealAnalytics, analytics, dateRangeOption, activeTab]);

  const statusData = useMemo(() => {
    if (hasRealAnalytics && analytics?.statusDistribution && analytics.statusDistribution.length > 0) {
      const hasNonZero = analytics.statusDistribution.some(s => s.count > 0);
      if (hasNonZero) return analytics.statusDistribution;
    }
    return generateStatusData(dateRangeOption, activeTab);
  }, [hasRealAnalytics, analytics, dateRangeOption, activeTab]);

  const queueData = useMemo(() => {
    if (hasRealAnalytics && analytics?.queueDistribution && analytics.queueDistribution.length > 0) {
      const hasNonZero = analytics.queueDistribution.some(q => q.count > 0);
      if (hasNonZero) return analytics.queueDistribution;
    }
    return generateQueueData(dateRangeOption, activeTab);
  }, [hasRealAnalytics, analytics, dateRangeOption, activeTab]);

  const totalStatusCalls = useMemo(() => statusData.reduce((s, d) => s + d.count, 0), [statusData]);
  const totalQueueCalls = useMemo(() => queueData.reduce((s, d) => s + d.count, 0), [queueData]);

  // Telecaller-specific analytics
  const telecallerChartData = useMemo(() => {
    if (telecallerCalls.length === 0) return [];
    // Group calls by hour
    const hourCounts: Record<string, number> = {};
    telecallerCalls.forEach(call => {
      const hour = new Date(call.createdAt).getHours();
      const label = hour < 12 ? `${hour || 12}AM` : `${hour === 12 ? 12 : hour - 12}PM`;
      hourCounts[label] = (hourCounts[label] || 0) + 1;
    });
    return Object.entries(hourCounts).map(([label, count]) => ({ label, ai: 0, human: count }));
  }, [telecallerCalls]);

  const telecallerStatusData = useMemo(() => {
    if (telecallerCalls.length === 0) return [];
    const statusCounts: Record<string, number> = {};
    telecallerCalls.forEach(call => {
      statusCounts[call.status] = (statusCounts[call.status] || 0) + 1;
    });
    const colors: Record<string, string> = {
      COMPLETED: '#10B981',
      IN_PROGRESS: '#3B82F6',
      FAILED: '#EF4444',
      MISSED: '#F59E0B',
    };
    return Object.entries(statusCounts).map(([name, count]) => ({
      name: name.replace('_', ' '),
      count,
      color: colors[name] || '#6B7280'
    }));
  }, [telecallerCalls]);

  const telecallerOutcomeData = useMemo(() => {
    if (telecallerCalls.length === 0) return [];
    const outcomes: Record<string, number> = {};
    telecallerCalls.forEach(call => {
      const outcome = call.outcome || 'PENDING';
      outcomes[outcome] = (outcomes[outcome] || 0) + 1;
    });
    const colors: Record<string, string> = {
      INTERESTED: '#10B981',
      CONVERTED: '#8B5CF6',
      CALLBACK: '#F59E0B',
      NOT_INTERESTED: '#EF4444',
      NO_ANSWER: '#6B7280',
      PENDING: '#3B82F6',
      BUSY: '#F97316',
      WRONG_NUMBER: '#DC2626',
    };
    return Object.entries(outcomes).map(([name, count]) => ({
      name: name.replace('_', ' '),
      count,
      color: colors[name] || '#6B7280'
    }));
  }, [telecallerCalls]);

  const totalTelecallerStatus = useMemo(() => telecallerStatusData.reduce((s, d) => s + d.count, 0), [telecallerStatusData]);
  const totalTelecallerOutcomes = useMemo(() => telecallerOutcomeData.reduce((s, d) => s + d.count, 0), [telecallerOutcomeData]);

  // Use telecaller data when on HUMAN tab
  const displayChartData = activeTab === 'HUMAN' ? telecallerChartData : chartData;
  const displayStatusData = activeTab === 'HUMAN' ? telecallerStatusData : statusData;
  const displayQueueData = activeTab === 'HUMAN' ? telecallerOutcomeData : queueData;
  const displayTotalCalls = activeTab === 'HUMAN' ? telecallerCallsTotal : totalCallsInRange;
  const displayStatusTotal = activeTab === 'HUMAN' ? totalTelecallerStatus : totalStatusCalls;
  const displayQueueTotal = activeTab === 'HUMAN' ? totalTelecallerOutcomes : totalQueueCalls;
  const displayMaxChart = useMemo(() => Math.max(...displayChartData.map(d => Math.max(d.ai, d.human)), 1), [displayChartData]);

  // Check if viewing today (can have live calls)
  const isToday = dateRangeOption === 'today';

  // Fetch data from API - only for AI tab
  const fetchData = useCallback(async () => {
    // Skip fetching monitoring data for HUMAN tab - it uses telecallerCalls instead
    if (activeTab === 'HUMAN') return;

    setIsLoading(true);
    try {
      console.log('[CallMonitoring] Fetching AI data for:', dateRangeOption);

      // Fetch analytics, calls by date range, and agents for AI
      const startDate = new Date(dateFromISO);
      const endDate = new Date(dateToISO);

      const [analyticsData, calls, agents] = await Promise.all([
        callMonitoringService.getAnalytics('AI', startDate, endDate).catch(() => null),
        callMonitoringService.getCallsByDateRange('AI', startDate, endDate).catch(() => null),
        callMonitoringService.getAgents('AI').catch(() => null),
      ]);

      console.log('[CallMonitoring] Calls:', calls?.length);

      if (analyticsData) {
        setAnalytics(analyticsData);
      }

      // Update calls from API (show empty if no data)
      if (calls && Array.isArray(calls)) {
        setActiveCalls(calls);
      }

      // Update agents from API (show empty if no data)
      if (agents && Array.isArray(agents)) {
        setAgentStatuses(agents);
      }
    } catch (error) {
      console.error('[CallMonitoring] Failed to fetch monitoring data:', error);
      // Keep using mock data on error
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, dateFromISO, dateToISO, dateRangeOption]);

  // Fetch data on mount and when tab or date range changes
  useEffect(() => {
    if (activeTab === 'AI') {
      fetchData();
    }
  }, [fetchData, activeTab]);

  // Fetch telecallers and branches on mount
  useEffect(() => {
    const fetchTelecallers = async () => {
      try {
        const res = await api.get('/users/telecallers');
        setTelecallers(res.data.data || []);
      } catch (error) {
        console.error('[CallMonitoring] Error fetching telecallers:', error);
      }
    };
    const fetchBranches = async () => {
      try {
        const branchList = await branchService.getAll(true);
        setBranches(branchList || []);
      } catch (error) {
        console.error('[CallMonitoring] Error fetching branches:', error);
      }
    };
    fetchTelecallers();
    fetchBranches();
  }, []);

  // Fetch telecaller calls when HUMAN tab is active
  const fetchTelecallerCalls = useCallback(async () => {
    if (activeTab !== 'HUMAN') return;

    setTelecallerLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', '50');
      params.append('offset', '0');

      if (selectedTelecaller) params.append('telecallerId', selectedTelecaller);
      if (selectedBranch) params.append('branchId', selectedBranch);
      if (outcomeFilter) params.append('outcome', outcomeFilter);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      params.append('dateFrom', dateFromISO);
      params.append('dateTo', dateToISO);

      console.log('[CallMonitoring] Fetching telecaller calls with params:', params.toString());
      const res = await api.get(`/telecaller/all-calls?${params.toString()}`);
      const data = res.data.data;
      console.log('[CallMonitoring] Telecaller calls response:', data);

      // Use database data directly
      setTelecallerCalls(data.calls || []);
      setTelecallerCallsTotal(data.total || 0);
      setOutcomeCounts(data.outcomeCounts || {});
    } catch (error) {
      console.error('[CallMonitoring] Error fetching telecaller calls:', error);
      // Don't clear existing data on error - keep showing what we have
    } finally {
      setTelecallerLoading(false);
    }
  }, [activeTab, selectedTelecaller, selectedBranch, outcomeFilter, statusFilter, dateFromISO, dateToISO]);

  // Fetch telecaller calls when filters change
  useEffect(() => {
    if (activeTab === 'HUMAN') {
      fetchTelecallerCalls();
    }
  }, [fetchTelecallerCalls, activeTab]);

  // Update call durations every second (only for in-progress calls when viewing today)
  useEffect(() => {
    if (!isToday) return;

    const timer = setInterval(() => {
      setActiveCalls((calls) =>
        calls.map((call) => {
          // Only update duration for in-progress calls
          if (call.status === 'IN_PROGRESS' || call.status === 'RINGING' || call.status === 'ON_HOLD') {
            return {
              ...call,
              duration: Math.floor((Date.now() - new Date(call.startTime).getTime()) / 1000),
            };
          }
          return call;
        })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, [isToday]);

  // Refresh AI calls every 30 seconds when viewing today
  useEffect(() => {
    if (!isToday || activeTab !== 'AI') return;

    const interval = setInterval(() => {
      const startDate = new Date(dateFromISO);
      const endDate = new Date(dateToISO);
      callMonitoringService.getCallsByDateRange('AI', startDate, endDate)
        .then((calls) => {
          if (calls && Array.isArray(calls)) {
            setActiveCalls(calls);
          }
        }).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [activeTab, isToday, dateFromISO, dateToISO]);

  // Real-time refresh for telecaller calls every 15 seconds when viewing today
  useEffect(() => {
    if (!isToday || activeTab !== 'HUMAN') return;

    const interval = setInterval(() => {
      console.log('[CallMonitoring] Auto-refreshing telecaller calls...');
      fetchTelecallerCalls();
    }, 15000); // Refresh every 15 seconds for real-time visibility

    return () => clearInterval(interval);
  }, [activeTab, isToday, fetchTelecallerCalls]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.date-range-dropdown')) {
        setShowDateDropdown(false);
      }
    };
    if (showDateDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showDateDropdown]);

  // Prevent body scroll when slide-over panel is open
  useEffect(() => {
    if (selectedCall) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedCall]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredCalls = useMemo(() => {
    return activeCalls.filter((call) => {
      if (call.type !== activeTab) return false;
      if (searchQuery && !call.agentName.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !call.callerNumber.includes(searchQuery) &&
          !(call.callerName?.toLowerCase().includes(searchQuery.toLowerCase()))) return false;
      if (statusFilter !== 'all' && call.status !== statusFilter) return false;
      if (queueFilter !== 'all' && call.queueName !== queueFilter) return false;
      return true;
    });
  }, [activeCalls, activeTab, searchQuery, statusFilter, queueFilter]);

  const queues = [...new Set(activeCalls.filter(c => c.type === activeTab).map(c => c.queueName).filter(Boolean))];

  const startMonitoring = (call: ActiveCall, mode: 'LISTEN' | 'WHISPER' | 'BARGE') => {
    setMonitoringCall(call);
    setMonitorMode(mode);
  };

  // Compute tab counts from filtered data
  const aiCallsCount = activeCalls.filter(c => c.type === 'AI').length;
  const humanCallsCount = activeCalls.filter(c => c.type === 'HUMAN').length;

  return (
    <div className="space-y-3">
      {/* Combined Header with Filters */}
      <div className="bg-white border rounded-lg shadow-sm">
        {/* Top Row: Title, Tabs, Date, Actions */}
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-semibold text-gray-900">Call Monitoring</h1>
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button onClick={() => setActiveTab('AI')}
                className={`px-2.5 py-1 text-sm font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                  activeTab === 'AI' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}>
                <SparklesIcon className="w-3.5 h-3.5" /> AI
                <span className={`min-w-[18px] px-1 py-0.5 text-[10px] rounded-full text-center ${activeTab === 'AI' ? 'bg-primary-100 text-primary-700' : 'bg-gray-200 text-gray-600'}`}>
                  {aiCallsCount}
                </span>
              </button>
              <button onClick={() => setActiveTab('HUMAN')}
                className={`px-2.5 py-1 text-sm font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                  activeTab === 'HUMAN' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}>
                <UserIcon className="w-3.5 h-3.5" /> Telecallers
                <span className={`min-w-[18px] px-1 py-0.5 text-[10px] rounded-full text-center ${activeTab === 'HUMAN' ? 'bg-primary-100 text-primary-700' : 'bg-gray-200 text-gray-600'}`}>
                  {humanCallsCount}
                </span>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Date Range Filter */}
            <div className="relative date-range-dropdown">
              <button
                onClick={() => setShowDateDropdown(!showDateDropdown)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <CalendarIcon className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-gray-700 text-xs font-medium">{dateRange.label}</span>
                <ChevronDownIcon className="w-3 h-3 text-gray-400" />
              </button>

              {showDateDropdown && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-white border rounded-lg shadow-lg z-20 py-1">
                  {[
                    { value: 'today' as DateRangeOption, label: 'Today' },
                    { value: 'yesterday' as DateRangeOption, label: 'Yesterday' },
                    { value: 'last7days' as DateRangeOption, label: 'Last 7 Days' },
                    { value: 'last30days' as DateRangeOption, label: 'Last 30 Days' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setDateRangeOption(opt.value);
                        setShowDateDropdown(false);
                        setShowCustomDatePicker(false);
                      }}
                      className={`w-full px-3 py-1.5 text-left text-xs hover:bg-gray-50 flex items-center justify-between ${
                        dateRangeOption === opt.value ? 'text-primary-600 bg-primary-50' : 'text-gray-700'
                      }`}
                    >
                      {opt.label}
                      {dateRangeOption === opt.value && <CheckCircleIcon className="w-3.5 h-3.5 text-primary-600" />}
                    </button>
                  ))}
                  <div className="border-t my-1" />
                  <button
                    onClick={() => setShowCustomDatePicker(!showCustomDatePicker)}
                    className={`w-full px-3 py-1.5 text-left text-xs hover:bg-gray-50 ${dateRangeOption === 'custom' ? 'text-primary-600' : 'text-gray-700'}`}
                  >
                    Custom Range
                  </button>
                  {showCustomDatePicker && (
                    <div className="px-3 py-2 border-t space-y-2">
                      <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full px-2 py-1 text-xs border rounded" placeholder="From" />
                      <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full px-2 py-1 text-xs border rounded" placeholder="To" />
                      <button
                        onClick={() => { if (customStartDate && customEndDate) { setDateRangeOption('custom'); setShowDateDropdown(false); setShowCustomDatePicker(false); }}}
                        disabled={!customStartDate || !customEndDate}
                        className="w-full py-1 text-xs bg-primary-600 text-white rounded disabled:bg-gray-300"
                      >Apply</button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <button onClick={() => setShowAnalytics(!showAnalytics)}
              className={`p-1.5 rounded-lg transition-colors ${showAnalytics ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-100'}`}
              title="Toggle Analytics">
              <ChartBarIcon className="w-4 h-4" />
            </button>
            {/* Live indicator when viewing today */}
            {isToday && (
              <div className="flex items-center gap-1 px-2 py-1 bg-green-50 rounded-lg border border-green-200">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-[10px] font-medium text-green-700 uppercase">Live</span>
              </div>
            )}
            <button onClick={activeTab === 'HUMAN' ? fetchTelecallerCalls : fetchData} disabled={isLoading || telecallerLoading}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
              title="Refresh">
              <ArrowPathIcon className={`w-4 h-4 ${(isLoading || telecallerLoading) ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Compact Filter Row */}
        <div className="px-4 py-2.5 border-t border-gray-100">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-44 pl-8 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-white"
              />
            </div>

            <div className="w-px h-6 bg-gray-200" />

            {/* Telecaller filter - only show when HUMAN tab is active */}
            {activeTab === 'HUMAN' && (
              <select
                value={selectedTelecaller}
                onChange={(e) => setSelectedTelecaller(e.target.value)}
                className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 pr-7 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-white"
              >
                <option value="">All Telecallers</option>
                {telecallers.map((tc) => (
                  <option key={tc.id} value={tc.id}>
                    {tc.firstName} {tc.lastName || ''}
                  </option>
                ))}
              </select>
            )}

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 pr-7 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-white"
            >
              <option value="all">All Status</option>
              <option value="COMPLETED">Completed</option>
              <option value="IN_PROGRESS">Active</option>
              <option value="FAILED">Failed</option>
              <option value="MISSED">Missed</option>
            </select>

            {/* Outcome filter - only show when HUMAN tab is active */}
            {activeTab === 'HUMAN' && (
              <select
                value={outcomeFilter}
                onChange={(e) => setOutcomeFilter(e.target.value)}
                className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 pr-7 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-white"
              >
                {OUTCOMES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}

            {/* Branch filter - only show when HUMAN tab is active */}
            {activeTab === 'HUMAN' && branches.length > 0 && (
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 pr-7 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-white"
              >
                <option value="">All Branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            )}

            {/* Queue filter - only show when AI tab is active */}
            {activeTab === 'AI' && (
              <select
                value={queueFilter}
                onChange={(e) => setQueueFilter(e.target.value)}
                className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 pr-7 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-white"
              >
                <option value="all">All Queues</option>
                {queues.map(q => <option key={q} value={q!}>{q}</option>)}
              </select>
            )}

            {/* Clear Filters Button */}
            {(statusFilter !== 'all' || queueFilter !== 'all' || searchQuery || selectedTelecaller || outcomeFilter || selectedBranch) && (
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setQueueFilter('all');
                  setSearchQuery('');
                  setSelectedTelecaller('');
                  setOutcomeFilter('');
                  setSelectedBranch('');
                }}
                className="flex items-center gap-1 px-2 py-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-3.5 h-3.5" />
                Clear
              </button>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Quick Stats - Right Side */}
            <div className="flex items-center gap-3">
              {activeTab === 'HUMAN' ? (
                <>
                  <div className="flex items-center gap-1.5 text-sm">
                    <span className="text-gray-500">Total:</span>
                    <span className="font-semibold text-gray-900">{telecallerCallsTotal}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span className="text-xs text-gray-600">{outcomeCounts.INTERESTED || 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                    <span className="text-xs text-gray-600">{outcomeCounts.CONVERTED || 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                    <span className="text-xs text-gray-600">{outcomeCounts.CALLBACK || 0}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 text-sm">
                    <span className="text-gray-500">Total:</span>
                    <span className="font-semibold text-gray-900">{filteredCalls.length}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                    <span className="text-xs text-gray-600">{filteredCalls.filter(c => c.status === 'COMPLETED').length}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                    <span className="text-xs text-gray-600">{filteredCalls.filter(c => c.status === 'IN_PROGRESS' || c.status === 'RINGING').length}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Section */}
      {showAnalytics && (
        <div className="grid grid-cols-4 gap-3">
          {/* Call Volume Chart */}
          <div className="col-span-2 bg-white border rounded-lg p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-700 uppercase">Call Volume</span>
                {analytics ? (
                  <span className="px-1.5 py-0.5 text-[9px] bg-green-100 text-green-700 rounded">Live</span>
                ) : (
                  <span className="px-1.5 py-0.5 text-[9px] bg-amber-100 text-amber-700 rounded">Demo</span>
                )}
              </div>
              <span className="text-xs text-gray-500">{displayTotalCalls} calls</span>
            </div>
            <div className="h-28 flex items-end justify-center gap-3">
              {displayChartData.map((d, i) => {
                const value = activeTab === 'AI' ? d.ai : d.human;
                const height = displayMaxChart > 0 ? (value / displayMaxChart) * 100 : 0;
                // Distinct colors for each bar
                const barColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];
                return (
                  <div key={i} className="flex flex-col items-center gap-1 group relative">
                    <div className="flex flex-col justify-end h-20">
                      <div
                        className={`rounded-t transition-all cursor-pointer hover:opacity-80 ${dateRangeOption === 'today' && i === chartData.length - 1 ? 'animate-pulse' : ''}`}
                        style={{
                          height: `${Math.max(height, 4)}%`,
                          width: '14px',
                          backgroundColor: barColors[i % barColors.length]
                        }}
                        title={`${d.label}: ${value} calls`}
                      />
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                        {value} calls
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
                      </div>
                    </div>
                    <span className="text-[9px] text-gray-500">{d.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Status Distribution - Donut */}
          <div className="bg-white border rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-700 uppercase">Call Status</span>
              <span className="text-[10px] text-gray-400">{displayStatusTotal} calls</span>
            </div>
            <div className="flex items-center justify-center">
              <div className="relative w-20 h-20 group">
                <svg viewBox="0 0 36 36" className="w-20 h-20 transform -rotate-90">
                  {(() => {
                    let cumulative = 0;
                    return displayStatusData.map((d, i) => {
                      const pct = displayStatusTotal > 0 ? (d.count / displayStatusTotal) * 100 : 0;
                      const dashArray = `${pct} ${100 - pct}`;
                      const dashOffset = 100 - cumulative;
                      cumulative += pct;
                      return (
                        <circle
                          key={i}
                          cx="18"
                          cy="18"
                          r="15.915"
                          fill="none"
                          stroke={d.color}
                          strokeWidth="3"
                          strokeDasharray={dashArray}
                          strokeDashoffset={dashOffset}
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          <title>{d.name}: {d.count} calls ({pct.toFixed(1)}%)</title>
                        </circle>
                      );
                    });
                  })()}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-gray-900">{displayStatusTotal}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1 mt-2">
              {displayStatusData.map((d, i) => {
                const pct = displayStatusTotal > 0 ? ((d.count / displayStatusTotal) * 100).toFixed(1) : '0';
                return (
                  <div
                    key={i}
                    className="flex items-center gap-1 text-[10px] cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5 transition-colors group/item relative"
                    title={`${d.name}: ${d.count} calls (${pct}%)`}
                  >
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="text-gray-500 truncate">{d.name}</span>
                    <span className="text-gray-700 font-medium ml-auto">{d.count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Queue/Outcome Distribution */}
          <div className="bg-white border rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-700 uppercase">{activeTab === 'HUMAN' ? 'By Outcome' : 'By Queue'}</span>
              <span className="text-[10px] text-gray-400">{displayQueueTotal} calls</span>
            </div>
            <div className="space-y-2">
              {displayQueueData.map((q, i) => {
                const pct = displayQueueTotal > 0 ? ((q.count / displayQueueTotal) * 100).toFixed(1) : '0';
                return (
                  <div
                    key={i}
                    className="cursor-pointer group relative"
                    title={`${q.name}: ${q.count} calls (${pct}%)`}
                  >
                    <div className="flex items-center justify-between text-xs mb-0.5">
                      <span className="text-gray-700 group-hover:text-gray-900">{q.name}</span>
                      <span className="text-gray-500 group-hover:text-gray-700">{q.count}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all group-hover:opacity-80"
                        style={{
                          width: `${totalQueueCalls > 0 ? (q.count / totalQueueCalls) * 100 : 0}%`,
                          backgroundColor: q.color
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Monitoring Banner */}
      {monitoringCall && (
        <div className="flex items-center justify-between bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
              {monitorMode === 'LISTEN' ? <EyeIcon className="w-4 h-4" /> :
               monitorMode === 'WHISPER' ? <ChatBubbleLeftIcon className="w-4 h-4" /> :
               <PhoneArrowUpRightIcon className="w-4 h-4" />}
            </div>
            <span className="text-sm font-medium">{monitoringCall.agentName}</span>
            <span className="text-white/70 text-xs">• {formatDuration(monitoringCall.duration)}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-white/20 rounded text-xs">
              {(['LISTEN', 'WHISPER', 'BARGE'] as const).map((m) => (
                <button key={m} onClick={() => setMonitorMode(m)}
                  className={`px-2 py-1 rounded ${monitorMode === m ? 'bg-white text-purple-600' : ''}`}>
                  {m}
                </button>
              ))}
            </div>
            <button onClick={() => setIsMuted(!isMuted)} className={`p-1.5 rounded ${isMuted ? 'bg-red-500' : 'bg-white/20'}`}>
              {isMuted ? <SpeakerWaveIcon className="w-3.5 h-3.5" /> : <MicrophoneIcon className="w-3.5 h-3.5" />}
            </button>
            <button onClick={() => setMonitoringCall(null)} className="px-2 py-1 bg-red-500 rounded text-xs flex items-center gap-1">
              <PhoneXMarkIcon className="w-3.5 h-3.5" /> End
            </button>
          </div>
        </div>
      )}

      {/* Calls Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-3 py-2 text-left font-medium">{activeTab === 'AI' ? 'AI Agent' : 'Telecaller'}</th>
              <th className="px-3 py-2 text-left font-medium">Contact</th>
              <th className="px-3 py-2 text-left font-medium">Phone</th>
              <th className="px-3 py-2 text-left font-medium">{activeTab === 'HUMAN' ? 'Outcome' : 'Queue'}</th>
              <th className="px-3 py-2 text-left font-medium">Status</th>
              <th className="px-3 py-2 text-left font-medium">Duration</th>
              <th className="px-3 py-2 text-left font-medium">Date</th>
              <th className="px-3 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {/* Telecaller Calls - HUMAN tab */}
            {activeTab === 'HUMAN' && (
              telecallerLoading ? (
                <tr><td colSpan={8} className="px-3 py-6 text-center text-gray-500">
                  Loading calls...
                </td></tr>
              ) : telecallerCalls.length === 0 ? (
                <tr><td colSpan={8} className="px-3 py-6 text-center text-gray-500">
                  No calls found for the selected filters
                </td></tr>
              ) : (
                telecallerCalls.map((call) => {
                  const callTime = new Date(call.createdAt);
                  const getOutcomeStyle = (outcome?: string) => {
                    switch (outcome) {
                      case 'INTERESTED': return 'text-green-600 bg-green-50';
                      case 'CONVERTED': return 'text-purple-600 bg-purple-50';
                      case 'NOT_INTERESTED': return 'text-red-600 bg-red-50';
                      case 'CALLBACK': return 'text-yellow-600 bg-yellow-50';
                      case 'NO_ANSWER': case 'BUSY': return 'text-orange-600 bg-orange-50';
                      default: return 'text-blue-600 bg-blue-50';
                    }
                  };
                  const getStatusStyle = (status: string) => {
                    switch (status) {
                      case 'COMPLETED': return 'text-emerald-600 bg-emerald-50';
                      case 'IN_PROGRESS': return 'text-blue-600 bg-blue-50';
                      case 'FAILED': case 'MISSED': return 'text-red-600 bg-red-50';
                      default: return 'text-gray-600 bg-gray-50';
                    }
                  };
                  return (
                    <tr key={call.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs bg-blue-100 text-blue-600">
                            {call.telecaller?.firstName?.charAt(0) || 'T'}
                          </div>
                          <div>
                            <span className="font-medium text-gray-900">
                              {call.telecaller ? `${call.telecaller.firstName} ${call.telecaller.lastName || ''}` : 'Unknown'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-gray-900">
                          {call.contactName || (call.lead ? `${call.lead.firstName} ${call.lead.lastName || ''}` : 'Unknown')}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span className="font-mono text-xs text-gray-600">{call.phoneNumber}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-xs ${getOutcomeStyle(call.outcome)}`}>
                          {call.outcome?.replace('_', ' ') || 'PENDING'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-xs ${getStatusStyle(call.status)}`}>
                          {call.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="font-mono text-xs text-gray-600">
                          {call.duration ? `${Math.floor(call.duration / 60)}:${(call.duration % 60).toString().padStart(2, '0')}` : '--:--'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-xs text-gray-600">
                          {callTime.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {callTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => setSelectedCall(call as any)}
                          className="px-2.5 py-1 text-xs text-primary-600 bg-primary-50 hover:bg-primary-100 rounded transition-colors font-medium"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )
            )}
            {/* AI Calls - AI tab */}
            {activeTab === 'AI' && (
              filteredCalls.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-6 text-center text-gray-500">
                No calls found for {dateRange.label}
              </td></tr>
            ) : (
              filteredCalls.map((call) => {
                const isActiveCall = call.status === 'IN_PROGRESS' || call.status === 'RINGING' || call.status === 'ON_HOLD';
                const isCritical = isActiveCall && call.duration > 600;
                const callTime = new Date(call.startTime);
                const statusStyle = call.status === 'COMPLETED' ? 'text-emerald-600 bg-emerald-50' :
                                    call.status === 'IN_PROGRESS' ? 'text-blue-600 bg-blue-50' :
                                    call.status === 'RINGING' ? 'text-amber-600 bg-amber-50' :
                                    call.status === 'ON_HOLD' ? 'text-orange-600 bg-orange-50' :
                                    call.status === 'FAILED' || call.status === 'NO_ANSWER' ? 'text-red-600 bg-red-50' :
                                    'text-gray-600 bg-gray-50';
                return (
                  <tr key={call.id} className={`hover:bg-gray-50 ${isCritical ? 'bg-red-50/50' : ''} ${monitoringCall?.id === call.id ? 'bg-violet-50' : ''}`}>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs bg-violet-100 text-violet-700">
                          <SparklesIcon className="w-3 h-3" />
                        </div>
                        <span className="font-medium text-gray-900">{call.agentName}</span>
                        {isActiveCall && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-gray-900">{call.callerName || 'Unknown'}</div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-mono text-xs text-gray-600">{call.callerNumber}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{call.queueName}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-xs ${statusStyle}`}>
                        {call.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`font-mono text-xs ${isCritical ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                        {formatDuration(call.duration)}
                      </span>
                      {isCritical && <ExclamationTriangleIcon className="w-3 h-3 text-red-500 inline ml-1" />}
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-xs text-gray-600">
                        {callTime.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {callTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      {isActiveCall ? (
                        <div className="flex justify-end gap-0.5">
                          <button
                            onClick={() => startMonitoring(call, 'LISTEN')}
                            title="Listen to call"
                            disabled={!!monitoringCall}
                            className="p-1.5 rounded text-violet-600 bg-violet-50 hover:bg-violet-100 disabled:opacity-50 transition-colors">
                            <EyeIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => startMonitoring(call, 'WHISPER')}
                            title="Whisper to agent"
                            disabled={!!monitoringCall}
                            className="p-1.5 rounded text-amber-600 bg-amber-50 hover:bg-amber-100 disabled:opacity-50 transition-colors">
                            <ChatBubbleLeftIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => startMonitoring(call, 'BARGE')}
                            title="Barge into call"
                            disabled={!!monitoringCall}
                            className="p-1.5 rounded text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-50 transition-colors">
                            <PhoneArrowUpRightIcon className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setSelectedCall(call)}
                          title="View call details"
                          className="px-2.5 py-1 text-xs text-primary-600 bg-primary-50 hover:bg-primary-100 rounded transition-colors font-medium">
                          View
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )
            )}
          </tbody>
        </table>
      </div>

      {/* Agent/Telecaller Performance */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-900">
              {activeTab === 'AI' ? 'AI Agent Performance' : 'Telecaller Performance'}
            </span>
            <span className="text-xs text-gray-500">({dateRange.label})</span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-gray-600">{agentStatuses.filter(a => a.type === activeTab && a.status === 'AVAILABLE').length} Available</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-gray-600">{agentStatuses.filter(a => a.type === activeTab && a.status === 'ON_CALL').length} On Call</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-gray-400" />
              <span className="text-gray-600">{agentStatuses.filter(a => a.type === activeTab && a.status !== 'AVAILABLE' && a.status !== 'ON_CALL').length} Away</span>
            </span>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-2 text-left font-medium">{activeTab === 'AI' ? 'Agent' : 'Telecaller'}</th>
              <th className="px-4 py-2 text-center font-medium">Status</th>
              <th className="px-4 py-2 text-center font-medium">Calls Today</th>
              <th className="px-4 py-2 text-center font-medium">Avg Handle Time</th>
              <th className="px-4 py-2 text-center font-medium">Performance</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {agentStatuses.filter(a => a.type === activeTab).length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                  No {activeTab === 'AI' ? 'AI agents' : 'telecallers'} found
                </td>
              </tr>
            ) : (
              agentStatuses.filter(a => a.type === activeTab).map((agent) => {
                const performanceScore = agent.callsToday > 0
                  ? Math.min(100, Math.round((agent.callsToday * 5) + (300 - agent.avgHandleTime) / 10))
                  : 0;
                const performanceColor = performanceScore >= 80 ? 'text-emerald-600 bg-emerald-50' :
                                         performanceScore >= 50 ? 'text-amber-600 bg-amber-50' :
                                         'text-red-600 bg-red-50';
                return (
                  <tr key={agent.userId} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                          activeTab === 'AI' ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {activeTab === 'AI' ? <SparklesIcon className="w-4 h-4" /> : agent.name.charAt(0)}
                        </div>
                        <span className="font-medium text-gray-900">{agent.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                        agent.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-700' :
                        agent.status === 'ON_CALL' ? 'bg-blue-100 text-blue-700' :
                        agent.status === 'WRAP_UP' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          agent.status === 'AVAILABLE' ? 'bg-emerald-500' :
                          agent.status === 'ON_CALL' ? 'bg-blue-500 animate-pulse' :
                          agent.status === 'WRAP_UP' ? 'bg-amber-500' :
                          'bg-gray-400'
                        }`} />
                        {agent.status === 'ON_CALL' ? 'On Call' :
                         agent.status === 'WRAP_UP' ? 'Wrap Up' :
                         agent.status === 'AVAILABLE' ? 'Available' : 'Away'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-semibold text-gray-900">{agent.callsToday}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-gray-600 font-mono">{formatDuration(agent.avgHandleTime)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              performanceScore >= 80 ? 'bg-emerald-500' :
                              performanceScore >= 50 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${performanceScore}%` }}
                          />
                        </div>
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${performanceColor}`}>
                          {performanceScore}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Call Details Slide-over Panel */}
      {selectedCall && (() => {
        // Handle both AI calls (ActiveCall) and telecaller calls (TelecallerCall)
        const tcCall = selectedCall as any;
        const isAICall = selectedCall.type === 'AI';
        const isTelecallerCall = !isAICall && tcCall.telecaller;

        // Get agent/telecaller name
        const agentName = isAICall
          ? selectedCall.agentName
          : (tcCall.telecaller ? `${tcCall.telecaller.firstName} ${tcCall.telecaller.lastName || ''}`.trim() : 'Unknown');

        // Get caller/contact name
        const callerName = isAICall
          ? selectedCall.callerName
          : (tcCall.contactName || (tcCall.lead ? `${tcCall.lead.firstName} ${tcCall.lead.lastName || ''}`.trim() : 'Unknown'));

        // Get phone number
        const phoneNumber = isAICall ? selectedCall.callerNumber : tcCall.phoneNumber;

        // Get call time
        const callTime = isAICall ? selectedCall.startTime : tcCall.createdAt;

        // Get duration
        const duration = selectedCall.duration || tcCall.duration || 0;

        // Get outcome for telecaller calls
        const outcome = tcCall.outcome;

        return (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/20 z-40"
              onClick={() => setSelectedCall(null)}
            />
            {/* Panel */}
            <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl z-50 overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Call Details</h3>
                <button
                  onClick={() => setSelectedCall(null)}
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4">
                {/* Status Badge */}
                <div className="flex items-center justify-between">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    selectedCall.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                    selectedCall.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                    selectedCall.status === 'FAILED' || selectedCall.status === 'NO_ANSWER' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {selectedCall.status.replace('_', ' ')}
                  </span>
                  <span className="text-sm text-gray-500">{formatDuration(duration)}</span>
                </div>

                {/* Agent/Telecaller Info */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 uppercase mb-2">{isAICall ? 'Agent' : 'Telecaller'}</div>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isAICall ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-600'
                    }`}>
                      {isAICall ? <SparklesIcon className="w-5 h-5" /> : (agentName?.charAt(0) || 'T')}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{agentName}</div>
                      <div className="text-xs text-gray-500">{isAICall ? 'AI Agent' : 'Telecaller'}</div>
                    </div>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 uppercase mb-2">Contact</div>
                  <div className="space-y-1">
                    <div className="font-medium text-gray-900">{callerName}</div>
                    <div className="text-sm text-gray-600 font-mono">{phoneNumber}</div>
                  </div>
                </div>

                {/* Outcome for Telecaller calls */}
                {isTelecallerCall && outcome && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 uppercase mb-2">Outcome</div>
                    <span className={`px-2 py-1 rounded text-sm font-medium ${
                      outcome === 'INTERESTED' ? 'bg-green-100 text-green-700' :
                      outcome === 'CONVERTED' ? 'bg-purple-100 text-purple-700' :
                      outcome === 'NOT_INTERESTED' ? 'bg-red-100 text-red-700' :
                      outcome === 'CALLBACK' || outcome === 'CALLBACK_REQUESTED' ? 'bg-yellow-100 text-yellow-700' :
                      outcome === 'NO_ANSWER' ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {outcome.replace(/_/g, ' ')}
                    </span>
                  </div>
                )}

                {/* Call Info */}
                <div className="space-y-3">
                  {!isTelecallerCall && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-sm text-gray-500">Queue</span>
                      <span className="text-sm font-medium text-gray-900">{selectedCall.queueName || '-'}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-sm text-gray-500">Started At</span>
                    <span className="text-sm font-medium text-gray-900">
                      {callTime ? new Date(callTime).toLocaleString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      }) : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-sm text-gray-500">Duration</span>
                    <span className="text-sm font-medium text-gray-900">{formatDuration(duration)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-sm text-gray-500">Type</span>
                    <span className="text-sm font-medium text-gray-900">{isAICall ? 'AI Call' : 'Human Call'}</span>
                  </div>
                </div>

                {/* Summary for Telecaller calls */}
                {isTelecallerCall && tcCall.summary && (
                  <div className="border-t pt-4">
                    <div className="text-xs text-gray-500 uppercase mb-2">Summary</div>
                    <p className="text-sm text-gray-700">{tcCall.summary}</p>
                  </div>
                )}

                {/* Placeholder for future features */}
                <div className="border-t pt-4 mt-4">
                  <div className="text-xs text-gray-400 uppercase mb-3">Coming Soon</div>
                  <div className="space-y-2 text-sm text-gray-500">
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <span>🎙️</span> Call Recording
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <span>📝</span> Transcript
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <span>📊</span> Sentiment Analysis
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
};
