import { useEffect, useState } from 'react';
import {
  UserGroupIcon,
  PhoneIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  CurrencyRupeeIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import {
  userPerformanceReportsService,
  ComprehensiveUserPerformanceReport,
  ReportFilters,
} from '../../services/user-performance-reports.service';

type TabType = 'summary' | 'leads' | 'calls' | 'followups' | 'conversions';

// Mock data for fallback when API fails or times out
const getMockReport = (): ComprehensiveUserPerformanceReport => ({
  summary: [
    { userId: '1', userName: 'John Smith', email: 'john@example.com', role: 'Sales Executive', branch: 'Main Branch', leadsHandled: 45, leadsAssigned: 50, callsMade: 120, callsConnected: 85, followUpsCompleted: 38, followUpsPending: 12, conversions: 8, conversionRate: '16.0', closureValue: 450000, avgResponseTime: 15, lastActivity: new Date().toISOString() },
    { userId: '2', userName: 'Sarah Johnson', email: 'sarah@example.com', role: 'Senior Sales', branch: 'Main Branch', leadsHandled: 62, leadsAssigned: 65, callsMade: 180, callsConnected: 145, followUpsCompleted: 55, followUpsPending: 8, conversions: 15, conversionRate: '23.1', closureValue: 820000, avgResponseTime: 10, lastActivity: new Date().toISOString() },
    { userId: '3', userName: 'Mike Wilson', email: 'mike@example.com', role: 'Sales Executive', branch: 'North Branch', leadsHandled: 38, leadsAssigned: 42, callsMade: 95, callsConnected: 68, followUpsCompleted: 30, followUpsPending: 15, conversions: 5, conversionRate: '11.9', closureValue: 275000, avgResponseTime: 22, lastActivity: new Date().toISOString() },
  ],
  leadsPerUser: [
    { userId: '1', userName: 'John Smith', totalAssigned: 50, newLeads: 12, contacted: 20, qualified: 10, converted: 8, lost: 0 },
    { userId: '2', userName: 'Sarah Johnson', totalAssigned: 65, newLeads: 8, contacted: 25, qualified: 17, converted: 15, lost: 0 },
    { userId: '3', userName: 'Mike Wilson', totalAssigned: 42, newLeads: 15, contacted: 12, qualified: 10, converted: 5, lost: 0 },
  ],
  callsPerUser: [
    { userId: '1', userName: 'John Smith', totalCalls: 120, connectedCalls: 85, missedCalls: 35, avgDuration: 180, totalDuration: 15300, callbacksScheduled: 12 },
    { userId: '2', userName: 'Sarah Johnson', totalCalls: 180, connectedCalls: 145, missedCalls: 35, avgDuration: 210, totalDuration: 30450, callbacksScheduled: 8 },
    { userId: '3', userName: 'Mike Wilson', totalCalls: 95, connectedCalls: 68, missedCalls: 27, avgDuration: 165, totalDuration: 11220, callbacksScheduled: 15 },
  ],
  followUpsPerUser: [
    { userId: '1', userName: 'John Smith', totalScheduled: 50, completed: 38, pending: 8, overdue: 4, completionRate: '76.0' },
    { userId: '2', userName: 'Sarah Johnson', totalScheduled: 63, completed: 55, pending: 6, overdue: 2, completionRate: '87.3' },
    { userId: '3', userName: 'Mike Wilson', totalScheduled: 45, completed: 30, pending: 10, overdue: 5, completionRate: '66.7' },
  ],
  conversionPerUser: [
    { userId: '1', userName: 'John Smith', leadsAssigned: 50, conversions: 8, conversionRate: '16.0', avgConversionTime: 14, closureValue: 450000 },
    { userId: '2', userName: 'Sarah Johnson', leadsAssigned: 65, conversions: 15, conversionRate: '23.1', avgConversionTime: 10, closureValue: 820000 },
    { userId: '3', userName: 'Mike Wilson', leadsAssigned: 42, conversions: 5, conversionRate: '11.9', avgConversionTime: 18, closureValue: 275000 },
  ],
});

// Get initials from name
const getInitials = (name: string) => {
  const parts = name.split(' ');
  return parts.length >= 2
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase();
};

// Get avatar color based on name
const getAvatarColor = (name: string) => {
  const colors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500',
    'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-teal-500'
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

// Progress bar component
const ProgressBar = ({ value, max, color = 'bg-blue-500' }: { value: number; max: number; color?: string }) => {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
      <div className={`h-full rounded-full ${color} transition-all duration-300`} style={{ width: `${percentage}%` }} />
    </div>
  );
};

// Rank badge component - compact colored backgrounds
const RankBadge = ({ rank }: { rank: number }) => {
  if (rank === 1) return <div className="flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 text-white text-[10px] font-bold"><TrophyIcon className="w-3 h-3" /></div>;
  if (rank === 2) return <div className="flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 text-white text-[10px] font-bold">{rank}</div>;
  if (rank === 3) return <div className="flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-amber-600 to-amber-700 text-white text-[10px] font-bold">{rank}</div>;
  if (rank === 4) return <div className="flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 text-white text-[10px] font-bold">{rank}</div>;
  if (rank === 5) return <div className="flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-purple-400 to-purple-500 text-white text-[10px] font-bold">{rank}</div>;
  if (rank === 6) return <div className="flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-teal-400 to-teal-500 text-white text-[10px] font-bold">{rank}</div>;
  if (rank === 7) return <div className="flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-rose-400 to-rose-500 text-white text-[10px] font-bold">{rank}</div>;
  if (rank === 8) return <div className="flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-500 text-white text-[10px] font-bold">{rank}</div>;
  if (rank === 9) return <div className="flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-500 text-white text-[10px] font-bold">{rank}</div>;
  if (rank === 10) return <div className="flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 text-white text-[10px] font-bold">{rank}</div>;
  const colors = ['from-blue-400 to-blue-500', 'from-purple-400 to-purple-500', 'from-teal-400 to-teal-500', 'from-rose-400 to-rose-500', 'from-indigo-400 to-indigo-500'];
  const colorClass = colors[(rank - 11) % colors.length];
  return <div className={`flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br ${colorClass} text-white text-[10px] font-bold`}>{rank}</div>;
};

export default function UserPerformanceReportsPage() {
  const [report, setReport] = useState<ComprehensiveUserPerformanceReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useMockData, setUseMockData] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [datePreset, setDatePreset] = useState('thisMonth');

  const getInitialFilters = (): ReportFilters => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0],
    };
  };

  const [filters, setFilters] = useState<ReportFilters>(getInitialFilters);

  const loadReport = async (currentFilters: ReportFilters) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await userPerformanceReportsService.getComprehensive(currentFilters);
      setReport(data);
      setUseMockData(false);
    } catch (err: any) {
      console.error('Failed to load report:', err);
      const errorMsg = err?.response?.status === 401
        ? 'Session expired. Please login again.'
        : 'Failed to load data. Showing sample data.';
      setError(errorMsg);
      setReport(getMockReport());
      setUseMockData(true);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport(filters);
  }, []);

  const handleDatePresetChange = (preset: string) => {
    setDatePreset(preset);
    const now = new Date();
    let start: Date;
    let end: Date = now;

    switch (preset) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'thisWeek':
        start = new Date(now);
        start.setDate(now.getDate() - now.getDay());
        break;
      case 'thisMonth':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'lastMonth':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      default:
        return;
    }

    const newFilters = {
      ...filters,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    };
    setFilters(newFilters);
    loadReport(newFilters);
  };

  const handleRefresh = () => loadReport(filters);

  const formatCurrency = (amount: number) => {
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
    return `₹${amount}`;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <ArrowPathIcon className="w-8 h-8 animate-spin text-primary-500 mb-3" />
        <p className="text-sm text-slate-500">Loading performance data...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <UserGroupIcon className="w-12 h-12 text-slate-300 mb-4" />
        <h3 className="text-lg font-medium text-slate-700 mb-2">No Performance Data</h3>
        <p className="text-sm text-slate-500 mb-4">Unable to load performance reports.</p>
        <button onClick={handleRefresh} className="btn btn-primary flex items-center gap-2">
          <ArrowPathIcon className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  const { summary, leadsPerUser, callsPerUser, followUpsPerUser, conversionPerUser } = report;

  const totals = {
    leads: summary.reduce((sum, u) => sum + u.leadsAssigned, 0),
    calls: summary.reduce((sum, u) => sum + u.callsMade, 0),
    followUps: summary.reduce((sum, u) => sum + u.followUpsCompleted, 0),
    conversions: summary.reduce((sum, u) => sum + u.conversions, 0),
    closureValue: summary.reduce((sum, u) => sum + u.closureValue, 0),
  };

  const maxCalls = Math.max(...summary.map(u => u.callsMade), 1);
  const maxConversions = Math.max(...summary.map(u => u.conversions), 1);

  const tabs = [
    { key: 'summary', label: 'Summary', icon: UserGroupIcon },
    { key: 'leads', label: 'Leads', icon: UserGroupIcon },
    { key: 'calls', label: 'Calls', icon: PhoneIcon },
    { key: 'followups', label: 'Follow-ups', icon: CheckCircleIcon },
    { key: 'conversions', label: 'Conversions', icon: ArrowTrendingUpIcon },
  ];

  return (
    <div className="space-y-3">
      {/* Mock Data Banner */}
      {useMockData && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 flex items-center gap-2">
          <ExclamationTriangleIcon className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <p className="text-xs text-amber-700 flex-1">Showing sample data - could not load from server</p>
          <button onClick={handleRefresh} className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded text-[10px] font-medium">
            Retry
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-slate-900">Team Performance</h1>
          <p className="text-slate-500 text-xs">Track staff productivity</p>
        </div>
        <div className="flex items-center gap-1.5">
          <select
            value={datePreset}
            onChange={(e) => handleDatePresetChange(e.target.value)}
            className="px-2 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-700 focus:ring-1 focus:ring-primary-500"
          >
            <option value="today">Today</option>
            <option value="thisWeek">This Week</option>
            <option value="thisMonth">This Month</option>
            <option value="lastMonth">Last Month</option>
          </select>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-1.5 bg-white border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50"
          >
            <ArrowPathIcon className={`w-4 h-4 text-slate-600 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary Cards - Compact Design */}
      <div className="grid grid-cols-5 gap-2">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-2.5 text-white shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <UserGroupIcon className="w-4 h-4 opacity-80" />
            <span className="text-[10px] font-medium opacity-80">Leads</span>
          </div>
          <p className="text-lg font-bold">{totals.leads}</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg p-2.5 text-white shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <PhoneIcon className="w-4 h-4 opacity-80" />
            <span className="text-[10px] font-medium opacity-80">Calls</span>
          </div>
          <p className="text-lg font-bold">{totals.calls}</p>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg p-2.5 text-white shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <CheckCircleIcon className="w-4 h-4 opacity-80" />
            <span className="text-[10px] font-medium opacity-80">Tasks</span>
          </div>
          <p className="text-lg font-bold">{totals.followUps}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-2.5 text-white shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <ArrowTrendingUpIcon className="w-4 h-4 opacity-80" />
            <span className="text-[10px] font-medium opacity-80">Won</span>
          </div>
          <p className="text-lg font-bold">{totals.conversions}</p>
        </div>

        <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg p-2.5 text-white shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <CurrencyRupeeIcon className="w-4 h-4 opacity-80" />
            <span className="text-[10px] font-medium opacity-80">Revenue</span>
          </div>
          <p className="text-lg font-bold">{formatCurrency(totals.closureValue)}</p>
        </div>
      </div>

      {/* Tabs - Compact Pills */}
      <div className="bg-slate-100 p-0.5 rounded-lg inline-flex gap-0.5">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as TabType)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              activeTab === tab.key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Summary Table - Compact Design */}
      {activeTab === 'summary' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-2 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Rank</th>
                  <th className="px-2 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Team Member</th>
                  <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Leads</th>
                  <th className="px-2 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Calls</th>
                  <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Tasks</th>
                  <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Conv.</th>
                  <th className="px-2 py-2 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.map((user, idx) => (
                  <tr key={user.userId} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-2 py-1.5">
                      <RankBadge rank={idx + 1} />
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full ${getAvatarColor(user.userName)} flex items-center justify-center text-white text-[10px] font-semibold`}>
                          {getInitials(user.userName)}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-900">{user.userName}</p>
                          <p className="text-[10px] text-slate-500">{user.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700">
                        {user.leadsAssigned}
                      </span>
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="space-y-0.5 min-w-[100px]">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-600">{user.callsMade}</span>
                          <span className="text-slate-400">{user.callsConnected} conn</span>
                        </div>
                        <ProgressBar value={user.callsMade} max={maxCalls} color="bg-emerald-500" />
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <span className="text-xs font-medium text-slate-900">{user.followUpsCompleted}</span>
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-xs font-bold text-purple-600">{user.conversions}</span>
                        <span className="text-[10px] text-purple-500">{user.conversionRate}%</span>
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <span className={`text-xs font-bold ${user.closureValue > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {formatCurrency(user.closureValue)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Leads Per User - Compact */}
      {activeTab === 'leads' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-2 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase">Member</th>
                  <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-500 uppercase">Total</th>
                  <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-500 uppercase">New</th>
                  <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-500 uppercase">Contacted</th>
                  <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-500 uppercase">Qualified</th>
                  <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-500 uppercase">Won</th>
                  <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-500 uppercase">Lost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leadsPerUser.map((user) => (
                  <tr key={user.userId} className="hover:bg-slate-50/50">
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full ${getAvatarColor(user.userName)} flex items-center justify-center text-white text-[10px] font-semibold`}>
                          {getInitials(user.userName)}
                        </div>
                        <span className="text-xs font-medium text-slate-900">{user.userName}</span>
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <span className="text-xs font-bold text-slate-700">{user.totalAssigned}</span>
                    </td>
                    <td className="px-2 py-1.5 text-center text-xs text-blue-600 font-medium">{user.newLeads}</td>
                    <td className="px-2 py-1.5 text-center text-xs text-amber-600 font-medium">{user.contacted}</td>
                    <td className="px-2 py-1.5 text-center text-xs text-purple-600 font-medium">{user.qualified}</td>
                    <td className="px-2 py-1.5 text-center text-xs text-emerald-600 font-bold">{user.converted}</td>
                    <td className="px-2 py-1.5 text-center text-xs text-red-500 font-medium">{user.lost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Calls Per User - Compact */}
      {activeTab === 'calls' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-2 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase">Member</th>
                  <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-500 uppercase">Total</th>
                  <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-500 uppercase">Connected</th>
                  <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-500 uppercase">Missed</th>
                  <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-500 uppercase">Avg</th>
                  <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-500 uppercase">Total Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {callsPerUser.map((user) => {
                  const connectRate = user.totalCalls > 0 ? Math.round((user.connectedCalls / user.totalCalls) * 100) : 0;
                  return (
                    <tr key={user.userId} className="hover:bg-slate-50/50">
                      <td className="px-2 py-1.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full ${getAvatarColor(user.userName)} flex items-center justify-center text-white text-[10px] font-semibold`}>
                            {getInitials(user.userName)}
                          </div>
                          <span className="text-xs font-medium text-slate-900">{user.userName}</span>
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-center text-xs font-bold text-blue-600">{user.totalCalls}</td>
                      <td className="px-2 py-1.5 text-center">
                        <span className="text-xs font-bold text-emerald-600">{user.connectedCalls}</span>
                        <span className="text-[10px] text-slate-400 ml-0.5">({connectRate}%)</span>
                      </td>
                      <td className="px-2 py-1.5 text-center text-xs text-red-500 font-medium">{user.missedCalls}</td>
                      <td className="px-2 py-1.5 text-center text-xs text-slate-600">{formatDuration(user.avgDuration)}</td>
                      <td className="px-2 py-1.5 text-center text-xs text-slate-500">{formatDuration(user.totalDuration)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Follow-ups Per User - Compact */}
      {activeTab === 'followups' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-2 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase">Member</th>
                  <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-500 uppercase">Scheduled</th>
                  <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-500 uppercase">Done</th>
                  <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-500 uppercase">Pending</th>
                  <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-500 uppercase">Overdue</th>
                  <th className="px-2 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {followUpsPerUser.map((user) => (
                  <tr key={user.userId} className="hover:bg-slate-50/50">
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full ${getAvatarColor(user.userName)} flex items-center justify-center text-white text-[10px] font-semibold`}>
                          {getInitials(user.userName)}
                        </div>
                        <span className="text-xs font-medium text-slate-900">{user.userName}</span>
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-center text-xs text-slate-600">{user.totalScheduled}</td>
                    <td className="px-2 py-1.5 text-center text-xs font-bold text-emerald-600">{user.completed}</td>
                    <td className="px-2 py-1.5 text-center text-xs text-amber-600 font-medium">{user.pending}</td>
                    <td className="px-2 py-1.5 text-center text-xs text-red-500 font-medium">{user.overdue}</td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 max-w-[60px]">
                          <ProgressBar
                            value={parseFloat(user.completionRate)}
                            max={100}
                            color={parseFloat(user.completionRate) >= 80 ? 'bg-emerald-500' : parseFloat(user.completionRate) >= 50 ? 'bg-amber-500' : 'bg-red-500'}
                          />
                        </div>
                        <span className={`text-xs font-bold ${
                          parseFloat(user.completionRate) >= 80 ? 'text-emerald-600' :
                          parseFloat(user.completionRate) >= 50 ? 'text-amber-600' : 'text-red-600'
                        }`}>
                          {user.completionRate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Conversions Per User - Compact */}
      {activeTab === 'conversions' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-2 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase">Member</th>
                  <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-500 uppercase">Leads</th>
                  <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-500 uppercase">Won</th>
                  <th className="px-2 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase">Rate</th>
                  <th className="px-2 py-2 text-right text-[10px] font-semibold text-slate-500 uppercase">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {conversionPerUser.map((user, idx) => (
                  <tr key={user.userId} className="hover:bg-slate-50/50">
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-2">
                        {idx === 0 && user.closureValue > 0 && (
                          <StarIcon className="w-4 h-4 text-amber-400" />
                        )}
                        <div className={`w-6 h-6 rounded-full ${getAvatarColor(user.userName)} flex items-center justify-center text-white text-[10px] font-semibold`}>
                          {getInitials(user.userName)}
                        </div>
                        <span className="text-xs font-medium text-slate-900">{user.userName}</span>
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-center text-xs text-slate-600">{user.leadsAssigned}</td>
                    <td className="px-2 py-1.5 text-center text-xs font-bold text-purple-600">{user.conversions}</td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 max-w-[60px]">
                          <ProgressBar value={parseFloat(user.conversionRate)} max={30} color="bg-purple-500" />
                        </div>
                        <span className="text-xs font-bold text-purple-600">{user.conversionRate}%</span>
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <span className={`text-xs font-bold ${user.closureValue > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {formatCurrency(user.closureValue)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
