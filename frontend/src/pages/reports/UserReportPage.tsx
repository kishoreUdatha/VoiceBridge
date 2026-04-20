/**
 * User Report - Comprehensive Enterprise Report
 * Displays all user metrics: calls, leads, follow-ups, messaging, breaks
 */

import { useState, useEffect, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, Transition } from '@headlessui/react';
import {
  UserGroupIcon,
  PhoneIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
  UserIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { userPerformanceReportsService, UserReportData } from '../../services/user-performance-reports.service';

// Format seconds to HH:MM:SS or MM:SS
const formatDuration = (seconds: number): string => {
  if (!seconds || seconds === 0) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export default function UserReportPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserReportData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilterCategory, setSelectedFilterCategory] = useState('user-details');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const filters: any = {};
      if (dateRange.start) filters.startDate = dateRange.start;
      if (dateRange.end) filters.endDate = dateRange.end;

      console.log('[UserReport] Fetching data with filters:', filters);
      const data = await userPerformanceReportsService.getUserReport(filters);
      console.log('[UserReport] Received data:', data?.length, 'users');
      setUsers(data || []);
    } catch (err: any) {
      console.error('[UserReport] Failed to load:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to load report data';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter users by search
  const filteredUsers = users.filter(user => {
    const matchesSearch = searchQuery === '' ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.reportingManager.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Calculate totals
  const totals = {
    totalUsers: filteredUsers.length,
    totalCalls: filteredUsers.reduce((sum, u) => sum + u.totalCalls, 0),
    totalConnected: filteredUsers.reduce((sum, u) => sum + u.totalCallsConnected, 0),
    totalUnconnected: filteredUsers.reduce((sum, u) => sum + u.totalUnconnectedCalls, 0),
    totalOutgoing: filteredUsers.reduce((sum, u) => sum + u.totalOutgoingCalls, 0),
    outgoingConnected: filteredUsers.reduce((sum, u) => sum + u.outgoingConnectedCalls, 0),
    outgoingUnanswered: filteredUsers.reduce((sum, u) => sum + u.outgoingUnansweredCalls, 0),
    totalIncoming: filteredUsers.reduce((sum, u) => sum + u.totalIncomingCalls, 0),
    incomingConnected: filteredUsers.reduce((sum, u) => sum + u.incomingConnectedCalls, 0),
    incomingUnanswered: filteredUsers.reduce((sum, u) => sum + u.incomingUnansweredCalls, 0),
    totalDisposed: filteredUsers.reduce((sum, u) => sum + u.totalDisposedCount, 0),
    disposedConnected: filteredUsers.reduce((sum, u) => sum + u.disposedYesConnectedCount, 0),
    disposedNotConnected: filteredUsers.reduce((sum, u) => sum + u.disposedNotConnectedCount, 0),
    totalInprogress: filteredUsers.reduce((sum, u) => sum + u.totalInprogressLeads, 0),
    totalConverted: filteredUsers.reduce((sum, u) => sum + u.totalConvertedLeads, 0),
    totalLost: filteredUsers.reduce((sum, u) => sum + u.totalLostLeads, 0),
    followUpDueToday: filteredUsers.reduce((sum, u) => sum + u.followUpDueToday, 0),
    totalCallDuration: filteredUsers.reduce((sum, u) => sum + u.totalCallDuration, 0),
    totalBreaks: filteredUsers.reduce((sum, u) => sum + u.totalBreaks, 0),
    totalBreakDuration: filteredUsers.reduce((sum, u) => sum + u.totalBreakDuration, 0),
    totalWhatsapp: filteredUsers.reduce((sum, u) => sum + u.totalWhatsappSent, 0),
    totalEmails: filteredUsers.reduce((sum, u) => sum + u.totalEmailsSent, 0),
    totalSms: filteredUsers.reduce((sum, u) => sum + u.totalSmsSent, 0),
  };

  const handleExport = () => {
    if (filteredUsers.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = [
      'No', 'Username', 'Reporting Manager', 'Mobile Number', 'Date',
      'Total Calls', 'Total Calls Connected', 'Total Unconnected Calls',
      'Total Outgoing Calls', 'Outgoing Connected Calls', 'Outgoing Unanswered Calls', 'Avg Outgoing Call Duration',
      'Total Incoming Calls', 'Incoming Connected Calls', 'Incoming Unanswered Calls', 'Avg Incoming Call Duration',
      'Total Disposed Count', 'Disposed Yes Connected Count', 'Disposed Not Connected Count',
      'Total Inprogress Leads', 'Total Converted Leads', 'Total Lost Leads',
      'Follow Up Due Today', 'Avg Start Calling Time', 'Avg Call Duration(sec)', 'Avg Form Filling Time',
      'Total Call Duration', 'Total Breaks', 'Total Break Duration',
      'Total Whatsapp Sent', 'Total Emails Sent', 'Total SMS Sent'
    ];
    const csvRows = [headers.join(',')];

    filteredUsers.forEach((user, index) => {
      csvRows.push([
        index + 1,
        `"${user.username}"`,
        `"${user.reportingManager}"`,
        `"${user.mobileNumber}"`,
        user.date,
        user.totalCalls,
        user.totalCallsConnected,
        user.totalUnconnectedCalls,
        user.totalOutgoingCalls,
        user.outgoingConnectedCalls,
        user.outgoingUnansweredCalls,
        user.avgOutgoingCallDuration,
        user.totalIncomingCalls,
        user.incomingConnectedCalls,
        user.incomingUnansweredCalls,
        user.avgIncomingCallDuration,
        user.totalDisposedCount,
        user.disposedYesConnectedCount,
        user.disposedNotConnectedCount,
        user.totalInprogressLeads,
        user.totalConvertedLeads,
        user.totalLostLeads,
        user.followUpDueToday,
        `"${user.avgStartCallingTime}"`,
        user.avgCallDuration,
        user.avgFormFillingTime,
        formatDuration(user.totalCallDuration),
        user.totalBreaks,
        formatDuration(user.totalBreakDuration),
        user.totalWhatsappSent,
        user.totalEmailsSent,
        user.totalSmsSent,
      ].join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `user-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Report exported successfully!');
  };

  const clearFilters = () => {
    setSearchQuery('');
    setDateRange({ start: '', end: '' });
  };

  const applyFilters = () => {
    setShowFilterPanel(false);
    loadData();
  };

  const hasActiveFilters = searchQuery !== '' || dateRange.start !== '' || dateRange.end !== '';

  if (error) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={loadData} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeftIcon className="w-4 h-4 text-slate-600" />
          </button>
          <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center">
            <UserGroupIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">User Report</h1>
            <p className="text-xs text-slate-500">Comprehensive user performance metrics</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilterPanel(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
              hasActiveFilters ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
            }`}
          >
            <FunnelIcon className="w-3.5 h-3.5" />
            Filters
          </button>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-1.5 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
          >
            <ArrowPathIcon className={`w-4 h-4 text-slate-600 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <ArrowDownTrayIcon className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-3 mb-3">
        <div className="bg-white rounded-lg border border-slate-200 px-3 py-2 flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
            <UserGroupIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900">{isLoading ? '-' : totals.totalUsers}</p>
            <p className="text-xs text-slate-500">Total Users</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 px-3 py-2 flex items-center gap-3">
          <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
            <PhoneIcon className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900">{isLoading ? '-' : totals.totalCalls}</p>
            <p className="text-xs text-slate-500">Total Calls</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 px-3 py-2 flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center">
            <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900">{isLoading ? '-' : totals.totalConnected}</p>
            <p className="text-xs text-slate-500">Connected Calls</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 px-3 py-2 flex items-center gap-3">
          <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center">
            <UserIcon className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900">{isLoading ? '-' : totals.totalConverted}</p>
            <p className="text-xs text-slate-500">Conversions</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 px-3 py-2 flex items-center gap-3">
          <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center">
            <ChatBubbleLeftRightIcon className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900">{isLoading ? '-' : totals.totalWhatsapp + totals.totalEmails + totals.totalSms}</p>
            <p className="text-xs text-slate-500">Messages Sent</p>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">Showing {filteredUsers.length} users with 32 columns</span>
          <span className="text-xs text-slate-400">Scroll horizontally to see all columns →</span>
        </div>
        <div
          className="overflow-x-auto overflow-y-auto"
          style={{
            maxHeight: 'calc(100vh - 220px)',
            scrollbarWidth: 'thin',
            scrollbarColor: '#94a3b8 #f1f5f9'
          }}
        >
          <table className="w-max text-sm border-collapse">
            <thead className="sticky top-0 z-20">
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-2 py-2 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap sticky left-0 bg-slate-50 z-30 min-w-[40px]">No</th>
                <th className="px-2 py-2 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap sticky left-[40px] bg-slate-50 z-30 min-w-[120px]">Username</th>
                <th className="px-2 py-2 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Reporting Manager</th>
                <th className="px-2 py-2 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Mobile Number</th>
                <th className="px-2 py-2 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Date</th>
                <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Total Calls</th>
                <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Calls Connected</th>
                <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Unconnected</th>
                <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-blue-50">Outgoing</th>
                <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-blue-50">Out Connected</th>
                <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-blue-50">Out Unanswered</th>
                <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-blue-50">Avg Out Duration</th>
                <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-green-50">Incoming</th>
                <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-green-50">In Connected</th>
                <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-green-50">In Unanswered</th>
                <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-green-50">Avg In Duration</th>
                <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-amber-50">Disposed</th>
                <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-amber-50">Disp Connected</th>
                <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-amber-50">Disp Not Conn</th>
                <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-purple-50">Inprogress</th>
                <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-purple-50">Converted</th>
                <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-purple-50">Lost</th>
                <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Follow Up Today</th>
                <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Avg Start Time</th>
                <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Avg Duration</th>
                <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Avg Form Time</th>
                <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Total Duration</th>
                <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-rose-50">Breaks</th>
                <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-rose-50">Break Duration</th>
                <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-teal-50">WhatsApp</th>
                <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-teal-50">Emails</th>
                <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-teal-50">SMS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(32)].map((_, j) => (
                      <td key={j} className="px-2 py-1.5"><div className="h-3 bg-slate-200 rounded w-10"></div></td>
                    ))}
                  </tr>
                ))
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={32} className="px-4 py-8 text-center text-slate-500 text-sm">
                    No users found
                  </td>
                </tr>
              ) : (
                <>
                  {filteredUsers.map((user, index) => (
                    <tr key={user.userId} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                      <td className="px-2 py-1.5 text-xs text-blue-600 font-medium sticky left-0 bg-white z-10 min-w-[40px]">{index + 1}</td>
                      <td className="px-2 py-1.5 text-xs font-semibold text-slate-900 sticky left-[40px] bg-white z-10 whitespace-nowrap min-w-[120px]">{user.username}</td>
                      <td className="px-2 py-1.5 text-xs text-slate-600 whitespace-nowrap">{user.reportingManager}</td>
                      <td className="px-2 py-1.5 text-xs text-slate-600 whitespace-nowrap">{user.mobileNumber}</td>
                      <td className="px-2 py-1.5 text-xs text-slate-600 whitespace-nowrap">{user.date}</td>
                      <td className="px-2 py-1.5 text-xs text-center font-medium text-slate-700">{user.totalCalls}</td>
                      <td className="px-2 py-1.5 text-xs text-center font-medium text-green-600">{user.totalCallsConnected}</td>
                      <td className="px-2 py-1.5 text-xs text-center font-medium text-red-600">{user.totalUnconnectedCalls}</td>
                      <td className="px-2 py-1.5 text-xs text-center font-medium text-blue-600 bg-blue-50/50">{user.totalOutgoingCalls}</td>
                      <td className="px-2 py-1.5 text-xs text-center font-medium text-blue-600 bg-blue-50/50">{user.outgoingConnectedCalls}</td>
                      <td className="px-2 py-1.5 text-xs text-center font-medium text-blue-600 bg-blue-50/50">{user.outgoingUnansweredCalls}</td>
                      <td className="px-2 py-1.5 text-xs text-center font-medium text-blue-600 bg-blue-50/50">{user.avgOutgoingCallDuration}s</td>
                      <td className="px-2 py-1.5 text-xs text-center font-medium text-green-600 bg-green-50/50">{user.totalIncomingCalls}</td>
                      <td className="px-2 py-1.5 text-xs text-center font-medium text-green-600 bg-green-50/50">{user.incomingConnectedCalls}</td>
                      <td className="px-2 py-1.5 text-xs text-center font-medium text-green-600 bg-green-50/50">{user.incomingUnansweredCalls}</td>
                      <td className="px-2 py-1.5 text-xs text-center font-medium text-green-600 bg-green-50/50">{user.avgIncomingCallDuration}s</td>
                      <td className="px-2 py-1.5 text-xs text-center font-medium text-amber-600 bg-amber-50/50">{user.totalDisposedCount}</td>
                      <td className="px-2 py-1.5 text-xs text-center font-medium text-amber-600 bg-amber-50/50">{user.disposedYesConnectedCount}</td>
                      <td className="px-2 py-1.5 text-xs text-center font-medium text-amber-600 bg-amber-50/50">{user.disposedNotConnectedCount}</td>
                      <td className="px-2 py-1.5 text-xs text-center font-medium text-purple-600 bg-purple-50/50">{user.totalInprogressLeads}</td>
                      <td className="px-2 py-1.5 text-xs text-center font-medium text-purple-600 bg-purple-50/50">{user.totalConvertedLeads}</td>
                      <td className="px-2 py-1.5 text-xs text-center font-medium text-purple-600 bg-purple-50/50">{user.totalLostLeads}</td>
                      <td className="px-2 py-1.5 text-xs text-center font-medium text-orange-600">{user.followUpDueToday}</td>
                      <td className="px-2 py-1.5 text-xs text-center text-slate-600">{user.avgStartCallingTime}</td>
                      <td className="px-2 py-1.5 text-xs text-center text-slate-600">{user.avgCallDuration}</td>
                      <td className="px-2 py-1.5 text-xs text-center text-slate-600">{user.avgFormFillingTime}</td>
                      <td className="px-2 py-1.5 text-xs text-center text-slate-600">{formatDuration(user.totalCallDuration)}</td>
                      <td className="px-2 py-1.5 text-xs text-center font-medium text-rose-600 bg-rose-50/50">{user.totalBreaks}</td>
                      <td className="px-2 py-1.5 text-xs text-center font-medium text-rose-600 bg-rose-50/50">{formatDuration(user.totalBreakDuration)}</td>
                      <td className="px-2 py-1.5 text-xs text-center font-medium text-teal-600 bg-teal-50/50">{user.totalWhatsappSent}</td>
                      <td className="px-2 py-1.5 text-xs text-center font-medium text-teal-600 bg-teal-50/50">{user.totalEmailsSent}</td>
                      <td className="px-2 py-1.5 text-xs text-center font-medium text-teal-600 bg-teal-50/50">{user.totalSmsSent}</td>
                    </tr>
                  ))}
                  {/* TOTAL Row */}
                  <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-xs">
                    <td className="px-2 py-1.5 sticky left-0 bg-slate-100 z-10 min-w-[40px]"></td>
                    <td className="px-2 py-1.5 text-slate-900 sticky left-[40px] bg-slate-100 z-10 min-w-[120px]">TOTAL</td>
                    <td className="px-2 py-1.5"></td>
                    <td className="px-2 py-1.5"></td>
                    <td className="px-2 py-1.5"></td>
                    <td className="px-2 py-1.5 text-center text-slate-900">{totals.totalCalls}</td>
                    <td className="px-2 py-1.5 text-center text-green-700">{totals.totalConnected}</td>
                    <td className="px-2 py-1.5 text-center text-red-700">{totals.totalUnconnected}</td>
                    <td className="px-2 py-1.5 text-center text-blue-700 bg-blue-100/50">{totals.totalOutgoing}</td>
                    <td className="px-2 py-1.5 text-center text-blue-700 bg-blue-100/50">{totals.outgoingConnected}</td>
                    <td className="px-2 py-1.5 text-center text-blue-700 bg-blue-100/50">{totals.outgoingUnanswered}</td>
                    <td className="px-2 py-1.5 text-center bg-blue-100/50">-</td>
                    <td className="px-2 py-1.5 text-center text-green-700 bg-green-100/50">{totals.totalIncoming}</td>
                    <td className="px-2 py-1.5 text-center text-green-700 bg-green-100/50">{totals.incomingConnected}</td>
                    <td className="px-2 py-1.5 text-center text-green-700 bg-green-100/50">{totals.incomingUnanswered}</td>
                    <td className="px-2 py-1.5 text-center bg-green-100/50">-</td>
                    <td className="px-2 py-1.5 text-center text-amber-700 bg-amber-100/50">{totals.totalDisposed}</td>
                    <td className="px-2 py-1.5 text-center text-amber-700 bg-amber-100/50">{totals.disposedConnected}</td>
                    <td className="px-2 py-1.5 text-center text-amber-700 bg-amber-100/50">{totals.disposedNotConnected}</td>
                    <td className="px-2 py-1.5 text-center text-purple-700 bg-purple-100/50">{totals.totalInprogress}</td>
                    <td className="px-2 py-1.5 text-center text-purple-700 bg-purple-100/50">{totals.totalConverted}</td>
                    <td className="px-2 py-1.5 text-center text-purple-700 bg-purple-100/50">{totals.totalLost}</td>
                    <td className="px-2 py-1.5 text-center text-orange-700">{totals.followUpDueToday}</td>
                    <td className="px-2 py-1.5 text-center">-</td>
                    <td className="px-2 py-1.5 text-center">-</td>
                    <td className="px-2 py-1.5 text-center">-</td>
                    <td className="px-2 py-1.5 text-center text-slate-700">{formatDuration(totals.totalCallDuration)}</td>
                    <td className="px-2 py-1.5 text-center text-rose-700 bg-rose-100/50">{totals.totalBreaks}</td>
                    <td className="px-2 py-1.5 text-center text-rose-700 bg-rose-100/50">{formatDuration(totals.totalBreakDuration)}</td>
                    <td className="px-2 py-1.5 text-center text-teal-700 bg-teal-100/50">{totals.totalWhatsapp}</td>
                    <td className="px-2 py-1.5 text-center text-teal-700 bg-teal-100/50">{totals.totalEmails}</td>
                    <td className="px-2 py-1.5 text-center text-teal-700 bg-teal-100/50">{totals.totalSms}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Filter Panel */}
      <Transition.Root show={showFilterPanel} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={setShowFilterPanel}>
          <Transition.Child
            as={Fragment}
            enter="ease-in-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in-out duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/30 transition-opacity" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
              <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
                <Transition.Child
                  as={Fragment}
                  enter="transform transition ease-in-out duration-300"
                  enterFrom="translate-x-full"
                  enterTo="translate-x-0"
                  leave="transform transition ease-in-out duration-300"
                  leaveFrom="translate-x-0"
                  leaveTo="translate-x-full"
                >
                  <Dialog.Panel className="pointer-events-auto w-screen max-w-md">
                    <div className="flex h-full flex-col bg-white shadow-xl">
                      <div className="px-6 py-4 border-b border-slate-200">
                        <div className="flex items-center justify-between">
                          <Dialog.Title className="text-lg font-semibold text-slate-900">Filters</Dialog.Title>
                          <button onClick={() => setShowFilterPanel(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                            <XMarkIcon className="w-5 h-5 text-slate-500" />
                          </button>
                        </div>
                      </div>

                      <div className="flex-1 flex overflow-hidden">
                        <div className="w-36 bg-slate-50 border-r border-slate-200 p-3 space-y-1">
                          {[
                            { id: 'user-details', label: 'Search', icon: UserIcon },
                            { id: 'date', label: 'Date Range', icon: CalendarDaysIcon },
                          ].map((cat) => (
                            <button
                              key={cat.id}
                              onClick={() => setSelectedFilterCategory(cat.id)}
                              className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                                selectedFilterCategory === cat.id ? 'bg-white text-blue-600 shadow-sm font-medium' : 'text-slate-600 hover:bg-white'
                              }`}
                            >
                              <cat.icon className="w-4 h-4" />
                              {cat.label}
                            </button>
                          ))}
                        </div>

                        <div className="flex-1 p-6 overflow-y-auto">
                          {selectedFilterCategory === 'user-details' && (
                            <div className="space-y-4">
                              <h3 className="font-medium text-slate-900">Search User</h3>
                              <input
                                type="text"
                                placeholder="Enter user name or manager..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          )}

                          {selectedFilterCategory === 'date' && (
                            <div className="space-y-4">
                              <h3 className="font-medium text-slate-900">Date Range</h3>
                              <div className="space-y-3">
                                <div>
                                  <label className="block text-sm text-slate-600 mb-1">Start Date</label>
                                  <input
                                    type="date"
                                    value={dateRange.start}
                                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm text-slate-600 mb-1">End Date</label>
                                  <input
                                    type="date"
                                    value={dateRange.end}
                                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
                        <button onClick={clearFilters} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">
                          Reset
                        </button>
                        <div className="flex gap-3">
                          <button onClick={() => setShowFilterPanel(false)} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">
                            Cancel
                          </button>
                          <button onClick={applyFilters} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            Apply
                          </button>
                        </div>
                      </div>
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
    </div>
  );
}
