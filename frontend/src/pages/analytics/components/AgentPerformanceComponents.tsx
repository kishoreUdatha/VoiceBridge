/**
 * Agent Performance Components - Redesigned
 * Clean, minimal design with focus on data clarity
 */

import React from 'react';
import {
  PhoneIcon,
  ArrowPathIcon,
  XMarkIcon,
  UsersIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ClockIcon,
  TrophyIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import {
  LeaderboardEntry,
  AgentPerformance,
  MetricType,
  DateRangeType,
} from '../agent-performance.types';
import {
  METRIC_OPTIONS,
  DATE_RANGE_OPTIONS,
  formatDuration,
  getMetricValue,
  getMetricLabel,
} from '../agent-performance.constants';

// ============================================
// Loading Skeleton
// ============================================
export const LoadingSkeleton: React.FC = () => (
  <div className="min-h-screen bg-gray-50">
    <div className="max-w-6xl mx-auto px-3 py-3">
      <div className="animate-pulse space-y-2">
        <div className="flex justify-between items-center">
          <div className="h-6 bg-gray-200 rounded w-36"></div>
          <div className="flex gap-2">
            <div className="h-7 bg-gray-200 rounded w-24"></div>
            <div className="h-7 bg-gray-200 rounded w-20"></div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-28 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// ============================================
// Header
// ============================================
interface HeaderProps {
  metric: MetricType;
  dateRange: DateRangeType;
  loading: boolean;
  onMetricChange: (metric: MetricType) => void;
  onDateRangeChange: (range: DateRangeType) => void;
  onRefresh: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  metric,
  dateRange,
  loading,
  onMetricChange,
  onDateRangeChange,
  onRefresh,
}) => (
  <div className="mb-2">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-md bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
          <UsersIcon className="h-3.5 w-3.5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-gray-900">Agent Performance</h1>
          <p className="text-[10px] text-gray-400">Monitor voice agents</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Metric Pills */}
        <div className="inline-flex rounded border border-gray-200 bg-white p-0.5">
          {METRIC_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => onMetricChange(option.id)}
              className={`px-2 py-0.5 text-[11px] font-medium rounded transition-all ${
                metric === option.id
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Date Range */}
        <select
          value={dateRange}
          onChange={(e) => onDateRangeChange(e.target.value as DateRangeType)}
          className="px-2 py-1 text-[11px] border border-gray-200 rounded bg-white text-gray-700 focus:ring-1 focus:ring-indigo-500"
        >
          {DATE_RANGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Refresh */}
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-1 text-gray-400 hover:text-indigo-600 disabled:opacity-50"
        >
          <ArrowPathIcon className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  </div>
);

// ============================================
// Stats Overview
// ============================================
interface StatsOverviewProps {
  totalAgents: number;
  totalCalls: number;
  avgConversion: number;
  avgAnswerRate: number;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  totalAgents,
  totalCalls,
  avgConversion,
  avgAnswerRate,
}) => (
  <div className="grid grid-cols-4 gap-2 mb-2">
    <StatCard label="Agents" value={totalAgents.toString()} icon={UsersIcon} color="text-blue-600" bgColor="bg-blue-50" />
    <StatCard label="Calls" value={totalCalls.toLocaleString()} icon={PhoneIcon} color="text-emerald-600" bgColor="bg-emerald-50" />
    <StatCard label="Conv." value={`${avgConversion.toFixed(1)}%`} icon={ChartBarIcon} color="text-violet-600" bgColor="bg-violet-50" />
    <StatCard label="Answer" value={`${avgAnswerRate.toFixed(0)}%`} icon={CheckCircleIcon} color="text-amber-600" bgColor="bg-amber-50" />
  </div>
);

const StatCard: React.FC<{
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
}> = ({ label, value, icon: Icon, color, bgColor }) => (
  <div className={`${bgColor} rounded-lg p-2`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[10px] text-gray-500 font-medium">{label}</p>
        <p className={`text-sm font-bold ${color}`}>{value}</p>
      </div>
      <Icon className={`w-4 h-4 ${color} opacity-60`} />
    </div>
  </div>
);

// ============================================
// Agent Grid
// ============================================
interface AgentGridProps {
  leaderboard: LeaderboardEntry[];
  selectedAgent: string | null;
  metric: MetricType;
  onSelectAgent: (agentId: string) => void;
}

export const AgentGrid: React.FC<AgentGridProps> = ({
  leaderboard,
  selectedAgent,
  metric,
  onSelectAgent,
}) => {
  if (leaderboard.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
        <UsersIcon className="w-6 h-6 text-gray-400 mx-auto mb-2" />
        <p className="text-xs text-gray-500">No agents found</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold text-gray-700">
          Leaderboard <span className="text-gray-400 font-normal">by {getMetricLabel(metric).toLowerCase()}</span>
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {leaderboard.map((entry, index) => (
          <AgentCard
            key={entry.agentId}
            entry={entry}
            rank={index + 1}
            metric={metric}
            isSelected={selectedAgent === entry.agentId}
            onClick={() => onSelectAgent(entry.agentId)}
          />
        ))}
      </div>
    </div>
  );
};

// Color themes for different agents
const AGENT_COLOR_THEMES = [
  { bg: 'bg-gradient-to-br from-blue-50 to-blue-100', border: 'border-blue-200', accent: 'text-blue-600', hover: 'hover:border-blue-300', ring: 'ring-blue-500', headerBg: 'bg-blue-600', chartColor: '#3B82F6', chartColorLight: '#93C5FD', metricBg: 'bg-blue-50' },
  { bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100', border: 'border-emerald-200', accent: 'text-emerald-600', hover: 'hover:border-emerald-300', ring: 'ring-emerald-500', headerBg: 'bg-emerald-600', chartColor: '#10B981', chartColorLight: '#6EE7B7', metricBg: 'bg-emerald-50' },
  { bg: 'bg-gradient-to-br from-violet-50 to-violet-100', border: 'border-violet-200', accent: 'text-violet-600', hover: 'hover:border-violet-300', ring: 'ring-violet-500', headerBg: 'bg-violet-600', chartColor: '#8B5CF6', chartColorLight: '#C4B5FD', metricBg: 'bg-violet-50' },
  { bg: 'bg-gradient-to-br from-amber-50 to-amber-100', border: 'border-amber-200', accent: 'text-amber-600', hover: 'hover:border-amber-300', ring: 'ring-amber-500', headerBg: 'bg-amber-600', chartColor: '#F59E0B', chartColorLight: '#FCD34D', metricBg: 'bg-amber-50' },
  { bg: 'bg-gradient-to-br from-rose-50 to-rose-100', border: 'border-rose-200', accent: 'text-rose-600', hover: 'hover:border-rose-300', ring: 'ring-rose-500', headerBg: 'bg-rose-600', chartColor: '#F43F5E', chartColorLight: '#FDA4AF', metricBg: 'bg-rose-50' },
  { bg: 'bg-gradient-to-br from-cyan-50 to-cyan-100', border: 'border-cyan-200', accent: 'text-cyan-600', hover: 'hover:border-cyan-300', ring: 'ring-cyan-500', headerBg: 'bg-cyan-600', chartColor: '#06B6D4', chartColorLight: '#67E8F9', metricBg: 'bg-cyan-50' },
  { bg: 'bg-gradient-to-br from-orange-50 to-orange-100', border: 'border-orange-200', accent: 'text-orange-600', hover: 'hover:border-orange-300', ring: 'ring-orange-500', headerBg: 'bg-orange-600', chartColor: '#F97316', chartColorLight: '#FDBA74', metricBg: 'bg-orange-50' },
  { bg: 'bg-gradient-to-br from-indigo-50 to-indigo-100', border: 'border-indigo-200', accent: 'text-indigo-600', hover: 'hover:border-indigo-300', ring: 'ring-indigo-500', headerBg: 'bg-indigo-600', chartColor: '#6366F1', chartColorLight: '#A5B4FC', metricBg: 'bg-indigo-50' },
  { bg: 'bg-gradient-to-br from-pink-50 to-pink-100', border: 'border-pink-200', accent: 'text-pink-600', hover: 'hover:border-pink-300', ring: 'ring-pink-500', headerBg: 'bg-pink-600', chartColor: '#EC4899', chartColorLight: '#F9A8D4', metricBg: 'bg-pink-50' },
  { bg: 'bg-gradient-to-br from-teal-50 to-teal-100', border: 'border-teal-200', accent: 'text-teal-600', hover: 'hover:border-teal-300', ring: 'ring-teal-500', headerBg: 'bg-teal-600', chartColor: '#14B8A6', chartColorLight: '#5EEAD4', metricBg: 'bg-teal-50' },
];

// Helper to get color theme by rank
const getAgentColorTheme = (rank: number) => AGENT_COLOR_THEMES[(rank - 1) % AGENT_COLOR_THEMES.length];

interface AgentCardProps {
  entry: LeaderboardEntry;
  rank: number;
  metric: MetricType;
  isSelected: boolean;
  onClick: () => void;
}

const AgentCard: React.FC<AgentCardProps> = ({ entry, rank, metric, isSelected, onClick }) => {
  const colorTheme = AGENT_COLOR_THEMES[(rank - 1) % AGENT_COLOR_THEMES.length];

  const getRankStyle = () => {
    if (rank === 1) return 'bg-yellow-400 text-yellow-900';
    if (rank === 2) return 'bg-gray-300 text-gray-700';
    if (rank === 3) return 'bg-amber-600 text-white';
    return 'bg-gray-100 text-gray-600';
  };

  return (
    <div
      onClick={onClick}
      className={`${colorTheme.bg} rounded-lg border p-2 cursor-pointer transition-all hover:shadow-md ${
        isSelected ? `${colorTheme.border} ring-2 ${colorTheme.ring}` : `${colorTheme.border} ${colorTheme.hover}`
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-5 h-5 rounded-full ${getRankStyle()} flex items-center justify-center`}>
          {rank === 1 ? (
            <TrophyIcon className="w-3 h-3" />
          ) : (
            <span className="text-[10px] font-bold">{rank}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[11px] font-semibold text-gray-900 truncate">
            {entry.agentName || `Agent ${entry.agentId.slice(0, 6)}`}
          </h3>
          <p className="text-[9px] text-gray-500">{entry.metrics.totalCalls} calls</p>
        </div>
        <div className="text-right">
          <p className={`text-sm font-bold ${colorTheme.accent}`}>{getMetricValue(entry, metric)}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-white/50 text-center">
        <div>
          <p className="text-[10px] font-semibold text-gray-700">{entry.metrics.avgAnswerRate.toFixed(0)}%</p>
          <p className="text-[8px] text-gray-500">Ans</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-gray-700">{entry.metrics.avgConversionRate.toFixed(1)}%</p>
          <p className="text-[8px] text-gray-500">Conv</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-gray-700">{formatDuration(entry.metrics.totalTalkTime)}</p>
          <p className="text-[8px] text-gray-500">Time</p>
        </div>
      </div>
    </div>
  );
};

// ============================================
// Agent Detail Modal
// ============================================
interface AgentDetailModalProps {
  agentPerformance: AgentPerformance | null;
  selectedEntry: LeaderboardEntry | undefined;
  radarData: { subject: string; value: number; fullMark: number }[];
  onClose: () => void;
}

export const AgentDetailModal: React.FC<AgentDetailModalProps> = ({
  agentPerformance,
  selectedEntry,
  onClose,
}) => {
  if (!agentPerformance || !selectedEntry) return null;

  const colorTheme = getAgentColorTheme(selectedEntry.rank);
  const gradientId = `callsGradient-${selectedEntry.rank}`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-start justify-center min-h-screen pt-4 px-4 pb-20">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-gray-900/50 transition-opacity" onClick={onClose} />

        {/* Modal */}
        <div className={`relative bg-white rounded-xl shadow-xl max-w-3xl w-full mt-6 mb-6 overflow-hidden border-t-4`} style={{ borderTopColor: colorTheme.chartColor }}>
          {/* Header */}
          <div className={`flex items-center justify-between px-4 py-3 ${colorTheme.bg}`}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg ${colorTheme.headerBg} flex items-center justify-center`}>
                <span className="text-xs font-bold text-white">#{selectedEntry.rank}</span>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">
                  {selectedEntry.agentName || `Agent ${selectedEntry.agentId.slice(0, 8)}`}
                </h2>
                <p className={`text-[10px] ${colorTheme.accent}`}>Performance details</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1 rounded hover:bg-white/50">
              <XMarkIcon className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            {/* Key Metrics */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              <MetricBoxColored label="Total Calls" value={agentPerformance.totals.totalCalls.toString()} icon={<PhoneIcon className="w-3 h-3" />} colorTheme={colorTheme} />
              <MetricBoxColored label="Answer Rate" value={`${agentPerformance.averages.answerRate}%`} icon={<CheckCircleIcon className="w-3 h-3" />} trend={agentPerformance.averages.answerRate >= 50 ? 'up' : 'down'} colorTheme={colorTheme} />
              <MetricBoxColored label="Conversion" value={`${agentPerformance.averages.conversionRate}%`} icon={<ChartBarIcon className="w-3 h-3" />} trend={agentPerformance.averages.conversionRate >= 15 ? 'up' : 'down'} colorTheme={colorTheme} />
              <MetricBoxColored label="Talk Time" value={formatDuration(agentPerformance.totals.totalTalkTime)} icon={<ClockIcon className="w-3 h-3" />} colorTheme={colorTheme} />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              {/* Daily Trend */}
              <div className={`${colorTheme.metricBg} rounded-lg p-2`}>
                <h3 className={`text-[10px] font-semibold ${colorTheme.accent} mb-2`}>Daily Performance</h3>
                <div className="h-28">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={agentPerformance.dailyTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={colorTheme.chartColor} stopOpacity={0.3} />
                          <stop offset="100%" stopColor={colorTheme.chartColor} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 9 }} tickFormatter={(v) => new Date(v).getDate().toString()} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 9 }} width={25} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="calls" stroke={colorTheme.chartColor} strokeWidth={1.5} fill={`url(#${gradientId})`} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Conversion Breakdown */}
              <div className={`${colorTheme.metricBg} rounded-lg p-2`}>
                <h3 className={`text-[10px] font-semibold ${colorTheme.accent} mb-2`}>Conversion Funnel</h3>
                <div className="h-28">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: 'Calls', value: agentPerformance.totals.totalCalls, fill: '#E5E7EB' },
                        { name: 'Answered', value: agentPerformance.totals.answeredCalls, fill: colorTheme.chartColorLight },
                        { name: 'Interested', value: agentPerformance.totals.interestedCount, fill: colorTheme.chartColor },
                        { name: 'Appts', value: agentPerformance.totals.appointmentsBooked, fill: colorTheme.chartColor },
                      ]}
                      layout="vertical"
                      margin={{ top: 5, right: 20, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 9 }} />
                      <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 9 }} width={55} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="value" radius={[0, 3, 3, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Recent Activity Table */}
            <div className={`${colorTheme.metricBg} rounded-lg overflow-hidden`}>
              <div className={`px-2 py-1.5 border-b ${colorTheme.border}`}>
                <h3 className={`text-[10px] font-semibold ${colorTheme.accent}`}>Recent Activity</h3>
              </div>
              <table className="w-full text-[11px]">
                <thead>
                  <tr className={`${colorTheme.bg}`}>
                    <th className="px-2 py-1.5 text-left font-semibold text-gray-600">Date</th>
                    <th className="px-2 py-1.5 text-right font-semibold text-gray-600">Calls</th>
                    <th className="px-2 py-1.5 text-right font-semibold text-gray-600">Ans</th>
                    <th className="px-2 py-1.5 text-right font-semibold text-gray-600">Int</th>
                    <th className="px-2 py-1.5 text-right font-semibold text-gray-600">Conv</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {agentPerformance.dailyTrend.slice(-5).reverse().map((day) => (
                    <tr key={day.date} className="hover:bg-gray-50">
                      <td className="px-2 py-1.5 text-gray-900">{new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                      <td className="px-2 py-1.5 text-right font-medium text-gray-900">{day.calls}</td>
                      <td className="px-2 py-1.5 text-right text-gray-600">{day.answered}</td>
                      <td className="px-2 py-1.5 text-right text-gray-600">{day.interested}</td>
                      <td className="px-2 py-1.5 text-right">
                        <span className={`font-semibold ${day.conversionRate >= 20 ? 'text-emerald-600' : day.conversionRate >= 10 ? 'text-amber-600' : 'text-red-600'}`}>{Number(day.conversionRate).toFixed(1)}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricBox: React.FC<{
  label: string;
  value: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down';
}> = ({ label, value, icon, trend }) => (
  <div className="bg-gray-50 rounded-lg p-2">
    <div className="flex items-center justify-between mb-1">
      <span className="text-gray-400">{icon}</span>
      {trend && (
        <span className={trend === 'up' ? 'text-emerald-500' : 'text-red-500'}>
          {trend === 'up' ? <ArrowTrendingUpIcon className="w-3 h-3" /> : <ArrowTrendingDownIcon className="w-3 h-3" />}
        </span>
      )}
    </div>
    <p className="text-sm font-bold text-gray-900">{value}</p>
    <p className="text-[9px] text-gray-500">{label}</p>
  </div>
);

const MetricBoxColored: React.FC<{
  label: string;
  value: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down';
  colorTheme: typeof AGENT_COLOR_THEMES[0];
}> = ({ label, value, icon, trend, colorTheme }) => (
  <div className={`${colorTheme.metricBg} rounded-lg p-2 border ${colorTheme.border}`}>
    <div className="flex items-center justify-between mb-1">
      <span className={colorTheme.accent}>{icon}</span>
      {trend && (
        <span className={trend === 'up' ? 'text-emerald-500' : 'text-red-500'}>
          {trend === 'up' ? <ArrowTrendingUpIcon className="w-3 h-3" /> : <ArrowTrendingDownIcon className="w-3 h-3" />}
        </span>
      )}
    </div>
    <p className={`text-sm font-bold ${colorTheme.accent}`}>{value}</p>
    <p className="text-[9px] text-gray-500">{label}</p>
  </div>
);

const ChartTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ name: string; value: number; fill?: string }>;
  label?: string;
}> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 text-white px-2 py-1 rounded text-[10px]">
        <p className="font-medium">{label}</p>
        {payload.map((item, i) => (
          <p key={i} className="text-gray-300">{item.name}: <span className="text-white font-medium">{item.value}</span></p>
        ))}
      </div>
    );
  }
  return null;
};
