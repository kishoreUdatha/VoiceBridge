import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  CalendarIcon,
  ChevronDownIcon,
  XMarkIcon,
  PhoneIcon,
  ClockIcon,
  UserIcon,
  PlayIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface Telecaller {
  id: string;
  firstName: string;
  lastName?: string;
  email: string;
}

interface Call {
  id: string;
  phoneNumber: string;
  contactName?: string;
  status: string;
  outcome?: string;
  duration?: number;
  sentiment?: string;
  summary?: string;
  transcript?: string;
  recordingUrl?: string;
  aiAnalyzed: boolean;
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

type DateRangeOption = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom';

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

const STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'INITIATED', label: 'Initiated' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'MISSED', label: 'Missed' },
  { value: 'FAILED', label: 'Failed' },
];

const getDateRange = (option: DateRangeOption, customStart?: string, customEnd?: string) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (option) {
    case 'today':
      return {
        label: 'Today',
        dateFrom: today.toISOString(),
        dateTo: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString(),
      };
    case 'yesterday':
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        label: 'Yesterday',
        dateFrom: yesterday.toISOString(),
        dateTo: new Date(today.getTime() - 1).toISOString(),
      };
    case 'this_week':
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      return {
        label: 'This Week',
        dateFrom: weekStart.toISOString(),
        dateTo: now.toISOString(),
      };
    case 'this_month':
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        label: 'This Month',
        dateFrom: monthStart.toISOString(),
        dateTo: now.toISOString(),
      };
    case 'custom':
      return {
        label: customStart && customEnd ? `${customStart} - ${customEnd}` : 'Custom',
        dateFrom: customStart ? new Date(customStart).toISOString() : undefined,
        dateTo: customEnd ? new Date(customEnd + 'T23:59:59').toISOString() : undefined,
      };
    default:
      return { label: 'Today', dateFrom: today.toISOString(), dateTo: now.toISOString() };
  }
};

const AdminTelecallerCallHistory: React.FC = () => {
  const [calls, setCalls] = useState<Call[]>([]);
  const [telecallers, setTelecallers] = useState<Telecaller[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [outcomeCounts, setOutcomeCounts] = useState<Record<string, number>>({});

  // Filters
  const [selectedTelecaller, setSelectedTelecaller] = useState('');
  const [selectedOutcome, setSelectedOutcome] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [dateRangeOption, setDateRangeOption] = useState<DateRangeOption>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // UI State
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [page, setPage] = useState(1);
  const limit = 20;

  const dateRange = useMemo(
    () => getDateRange(dateRangeOption, customStartDate, customEndDate),
    [dateRangeOption, customStartDate, customEndDate]
  );

  // Fetch telecallers for dropdown
  useEffect(() => {
    const fetchTelecallers = async () => {
      try {
        const res = await api.get('/users/telecallers');
        setTelecallers(res.data.data || []);
      } catch (error) {
        console.error('Error fetching telecallers:', error);
      }
    };
    fetchTelecallers();
  }, []);

  // Fetch calls
  const fetchCalls = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      params.append('offset', ((page - 1) * limit).toString());

      if (selectedTelecaller) params.append('telecallerId', selectedTelecaller);
      if (selectedOutcome) params.append('outcome', selectedOutcome);
      if (selectedStatus) params.append('status', selectedStatus);
      if (dateRange.dateFrom) params.append('dateFrom', dateRange.dateFrom);
      if (dateRange.dateTo) params.append('dateTo', dateRange.dateTo);

      const res = await api.get(`/telecaller/all-calls?${params.toString()}`);
      const data = res.data.data;

      setCalls(data.calls || []);
      setTotal(data.total || 0);
      setOutcomeCounts(data.outcomeCounts || {});
    } catch (error: any) {
      console.error('Error fetching calls:', error);
      toast.error('Failed to load call history');
    } finally {
      setLoading(false);
    }
  }, [selectedTelecaller, selectedOutcome, selectedStatus, dateRange, page]);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedTelecaller, selectedOutcome, selectedStatus, dateRangeOption, customStartDate, customEndDate]);

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

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getOutcomeColor = (outcome?: string) => {
    switch (outcome) {
      case 'INTERESTED':
      case 'CONVERTED':
        return 'bg-green-100 text-green-700';
      case 'NOT_INTERESTED':
        return 'bg-red-100 text-red-700';
      case 'CALLBACK':
        return 'bg-yellow-100 text-yellow-700';
      case 'NO_ANSWER':
      case 'BUSY':
        return 'bg-orange-100 text-orange-700';
      case 'WRONG_NUMBER':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-blue-100 text-blue-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-emerald-100 text-emerald-700';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-700';
      case 'FAILED':
      case 'MISSED':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getSentimentEmoji = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return { emoji: '😊', color: 'text-green-600', label: 'Positive' };
      case 'negative':
        return { emoji: '😞', color: 'text-red-600', label: 'Negative' };
      default:
        return { emoji: '😐', color: 'text-gray-500', label: 'Neutral' };
    }
  };

  // Filter calls by search query
  const filteredCalls = useMemo(() => {
    if (!searchQuery) return calls;
    const query = searchQuery.toLowerCase();
    return calls.filter(
      (call) =>
        call.phoneNumber.includes(query) ||
        call.contactName?.toLowerCase().includes(query) ||
        call.telecaller?.firstName?.toLowerCase().includes(query) ||
        call.telecaller?.lastName?.toLowerCase().includes(query) ||
        call.lead?.firstName?.toLowerCase().includes(query) ||
        call.lead?.lastName?.toLowerCase().includes(query)
    );
  }, [calls, searchQuery]);

  const clearFilters = () => {
    setSelectedTelecaller('');
    setSelectedOutcome('');
    setSelectedStatus('');
    setDateRangeOption('today');
    setCustomStartDate('');
    setCustomEndDate('');
    setSearchQuery('');
  };

  const hasActiveFilters =
    selectedTelecaller || selectedOutcome || selectedStatus || dateRangeOption !== 'today' || searchQuery;

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Telecaller Call History</h1>
          <p className="text-sm text-gray-500 mt-1">
            View and analyze calls made by all telecallers
          </p>
        </div>
        <button
          onClick={fetchCalls}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-lg border p-3">
          <div className="text-2xl font-bold text-gray-900">{outcomeCounts.ALL || total}</div>
          <div className="text-xs text-gray-500">Total Calls</div>
        </div>
        <div className="bg-white rounded-lg border p-3">
          <div className="text-2xl font-bold text-green-600">{outcomeCounts.INTERESTED || 0}</div>
          <div className="text-xs text-gray-500">Interested</div>
        </div>
        <div className="bg-white rounded-lg border p-3">
          <div className="text-2xl font-bold text-yellow-600">{outcomeCounts.CALLBACK || 0}</div>
          <div className="text-xs text-gray-500">Callback</div>
        </div>
        <div className="bg-white rounded-lg border p-3">
          <div className="text-2xl font-bold text-purple-600">{outcomeCounts.CONVERTED || 0}</div>
          <div className="text-xs text-gray-500">Converted</div>
        </div>
        <div className="bg-white rounded-lg border p-3">
          <div className="text-2xl font-bold text-red-600">{outcomeCounts.NOT_INTERESTED || 0}</div>
          <div className="text-xs text-gray-500">Not Interested</div>
        </div>
        <div className="bg-white rounded-lg border p-3">
          <div className="text-2xl font-bold text-blue-600">{outcomeCounts.PENDING || 0}</div>
          <div className="text-xs text-gray-500">Pending</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Telecaller Filter */}
          <select
            value={selectedTelecaller}
            onChange={(e) => setSelectedTelecaller(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All Telecallers</option>
            {telecallers.map((tc) => (
              <option key={tc.id} value={tc.id}>
                {tc.firstName} {tc.lastName || ''}
              </option>
            ))}
          </select>

          {/* Date Range Filter */}
          <div className="relative date-range-dropdown">
            <button
              onClick={() => setShowDateDropdown(!showDateDropdown)}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <CalendarIcon className="w-4 h-4 text-gray-500" />
              <span>{dateRange.label}</span>
              <ChevronDownIcon className="w-4 h-4 text-gray-400" />
            </button>

            {showDateDropdown && (
              <div className="absolute left-0 top-full mt-1 w-56 bg-white border rounded-lg shadow-lg z-20 py-1">
                {[
                  { value: 'today' as DateRangeOption, label: 'Today' },
                  { value: 'yesterday' as DateRangeOption, label: 'Yesterday' },
                  { value: 'this_week' as DateRangeOption, label: 'This Week' },
                  { value: 'this_month' as DateRangeOption, label: 'This Month' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setDateRangeOption(opt.value);
                      setShowDateDropdown(false);
                      setShowCustomDatePicker(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                      dateRangeOption === opt.value ? 'text-primary-600 bg-primary-50' : 'text-gray-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
                <div className="border-t my-1" />
                <button
                  onClick={() => setShowCustomDatePicker(!showCustomDatePicker)}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                    dateRangeOption === 'custom' ? 'text-primary-600' : 'text-gray-700'
                  }`}
                >
                  Custom Range
                </button>
                {showCustomDatePicker && (
                  <div className="px-3 py-2 border-t space-y-2">
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border rounded"
                    />
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border rounded"
                    />
                    <button
                      onClick={() => {
                        if (customStartDate && customEndDate) {
                          setDateRangeOption('custom');
                          setShowDateDropdown(false);
                          setShowCustomDatePicker(false);
                        }
                      }}
                      disabled={!customStartDate || !customEndDate}
                      className="w-full py-1.5 text-sm bg-primary-600 text-white rounded disabled:bg-gray-300"
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Outcome Filter */}
          <select
            value={selectedOutcome}
            onChange={(e) => setSelectedOutcome(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            {OUTCOMES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            {STATUSES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
            >
              <XMarkIcon className="w-4 h-4" />
              Clear
            </button>
          )}

          {/* Results Count */}
          <div className="ml-auto text-sm text-gray-500">
            Showing {filteredCalls.length} of {total} calls
          </div>
        </div>
      </div>

      {/* Calls Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Telecaller</th>
                <th className="px-4 py-3 text-left font-medium">Contact</th>
                <th className="px-4 py-3 text-left font-medium">Phone</th>
                <th className="px-4 py-3 text-left font-medium">Outcome</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Duration</th>
                <th className="px-4 py-3 text-left font-medium">Sentiment</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-gray-500">Loading calls...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredCalls.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    No calls found for the selected filters
                  </td>
                </tr>
              ) : (
                filteredCalls.map((call) => (
                  <tr key={call.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <UserIcon className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {call.telecaller
                              ? `${call.telecaller.firstName} ${call.telecaller.lastName || ''}`
                              : 'Unknown'}
                          </div>
                          <div className="text-xs text-gray-500">{call.telecaller?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {call.contactName ||
                          (call.lead ? `${call.lead.firstName} ${call.lead.lastName || ''}` : 'Unknown')}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-gray-600">{call.phoneNumber}</span>
                    </td>
                    <td className="px-4 py-3">
                      {call.outcome ? (
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getOutcomeColor(call.outcome)}`}>
                          {call.outcome.replace('_', ' ')}
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                          PENDING
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(call.status)}`}>
                        {call.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-gray-600">
                        <ClockIcon className="w-4 h-4" />
                        <span className="font-mono">{formatDuration(call.duration)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {call.sentiment ? (
                        <div className="flex items-center gap-1">
                          <span className={getSentimentEmoji(call.sentiment).color}>
                            {getSentimentEmoji(call.sentiment).emoji}
                          </span>
                          <span className="text-xs text-gray-500">{getSentimentEmoji(call.sentiment).label}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-600">{formatDate(call.createdAt)}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedCall(call)}
                        className="px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
            <div className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Call Detail Modal */}
      {selectedCall && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSelectedCall(null)} />
          <div className="fixed right-0 top-0 h-full w-[480px] bg-white shadow-xl z-50 overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Call Details</h3>
              <button
                onClick={() => setSelectedCall(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Telecaller Info */}
              <div className="bg-blue-50 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <UserIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">
                      {selectedCall.telecaller
                        ? `${selectedCall.telecaller.firstName} ${selectedCall.telecaller.lastName || ''}`
                        : 'Unknown Telecaller'}
                    </div>
                    <div className="text-sm text-gray-500">{selectedCall.telecaller?.email}</div>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-xs text-gray-500 uppercase mb-2">Contact</div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <PhoneIcon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {selectedCall.contactName ||
                        (selectedCall.lead
                          ? `${selectedCall.lead.firstName} ${selectedCall.lead.lastName || ''}`
                          : 'Unknown')}
                    </div>
                    <div className="text-sm text-gray-500 font-mono">{selectedCall.phoneNumber}</div>
                  </div>
                </div>
              </div>

              {/* Call Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-xs text-gray-500 uppercase mb-1">Duration</div>
                  <div className="text-lg font-semibold text-gray-900">{formatDuration(selectedCall.duration)}</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-xs text-gray-500 uppercase mb-1">Status</div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedCall.status)}`}>
                    {selectedCall.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-xs text-gray-500 uppercase mb-1">Outcome</div>
                  {selectedCall.outcome ? (
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getOutcomeColor(selectedCall.outcome)}`}
                    >
                      {selectedCall.outcome.replace('_', ' ')}
                    </span>
                  ) : (
                    <span className="text-gray-400">Pending</span>
                  )}
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-xs text-gray-500 uppercase mb-1">Sentiment</div>
                  {selectedCall.sentiment ? (
                    <div className="flex items-center gap-1">
                      <span className={`text-lg ${getSentimentEmoji(selectedCall.sentiment).color}`}>
                        {getSentimentEmoji(selectedCall.sentiment).emoji}
                      </span>
                      <span className="text-sm text-gray-600">{getSentimentEmoji(selectedCall.sentiment).label}</span>
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </div>
              </div>

              {/* Recording */}
              {selectedCall.recordingUrl && (
                <div>
                  <div className="text-xs text-gray-500 uppercase mb-2">Recording</div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <audio controls className="w-full" src={selectedCall.recordingUrl}>
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                </div>
              )}

              {/* AI Analysis Badge */}
              {selectedCall.aiAnalyzed && (
                <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 rounded-lg">
                  <span className="text-purple-600">✨</span>
                  <span className="text-sm text-purple-700 font-medium">AI Analyzed</span>
                </div>
              )}

              {/* Summary */}
              {selectedCall.summary && (
                <div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 uppercase mb-2">
                    <DocumentTextIcon className="w-4 h-4" />
                    Call Summary
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700">{selectedCall.summary}</div>
                </div>
              )}

              {/* Transcript */}
              {selectedCall.transcript && (
                <div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 uppercase mb-2">
                    <DocumentTextIcon className="w-4 h-4" />
                    Transcript
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 max-h-48 overflow-y-auto whitespace-pre-wrap">
                    {selectedCall.transcript}
                  </div>
                </div>
              )}

              {/* Timestamp */}
              <div className="text-center text-sm text-gray-400 pt-2 border-t">
                Call made on {formatDate(selectedCall.createdAt)}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminTelecallerCallHistory;
