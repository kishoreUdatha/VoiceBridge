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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="animate-pulse space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-gray-200 rounded-lg w-48"></div>
          <div className="flex gap-3">
            <div className="h-10 bg-gray-200 rounded-lg w-32"></div>
            <div className="h-10 bg-gray-200 rounded-lg w-32"></div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 bg-gray-200 rounded-xl"></div>
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
  <div className="mb-8">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Agent Performance</h1>
        <p className="text-sm text-gray-500 mt-1">Monitor and compare your voice agents</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Metric Pills */}
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
          {METRIC_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => onMetricChange(option.id)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                metric === option.id
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:text-gray-900'
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
          className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
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
          className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-gray-900 hover:border-gray-300 transition-all disabled:opacity-50"
        >
          <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
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
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
    <StatCard
      icon={<UsersIcon className="w-5 h-5" />}
      label="Active Agents"
      value={totalAgents.toString()}
      color="blue"
    />
    <StatCard
      icon={<PhoneIcon className="w-5 h-5" />}
      label="Total Calls"
      value={totalCalls.toLocaleString()}
      color="green"
    />
    <StatCard
      icon={<ChartBarIcon className="w-5 h-5" />}
      label="Avg Conversion"
      value={`${avgConversion.toFixed(1)}%`}
      color="purple"
    />
    <StatCard
      icon={<CheckCircleIcon className="w-5 h-5" />}
      label="Avg Answer Rate"
      value={`${avgAnswerRate.toFixed(0)}%`}
      color="amber"
    />
  </div>
);

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'blue' | 'green' | 'purple' | 'amber';
}> = ({ icon, label, value, color }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
};

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
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <UsersIcon className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900">No agents found</h3>
        <p className="text-sm text-gray-500 mt-1">Voice agents will appear here once they make calls</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-gray-900">
          Leaderboard <span className="text-gray-400 font-normal">by {getMetricLabel(metric).toLowerCase()}</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

interface AgentCardProps {
  entry: LeaderboardEntry;
  rank: number;
  metric: MetricType;
  isSelected: boolean;
  onClick: () => void;
}

const AgentCard: React.FC<AgentCardProps> = ({ entry, rank, metric, isSelected, onClick }) => {
  const getRankBadge = () => {
    if (rank === 1) return { bg: 'bg-yellow-400', text: 'text-yellow-900', icon: true };
    if (rank === 2) return { bg: 'bg-gray-300', text: 'text-gray-700', icon: false };
    if (rank === 3) return { bg: 'bg-amber-600', text: 'text-white', icon: false };
    return { bg: 'bg-gray-100', text: 'text-gray-600', icon: false };
  };

  const badge = getRankBadge();

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border p-5 cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'border-gray-900 ring-1 ring-gray-900' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full ${badge.bg} flex items-center justify-center`}>
            {badge.icon ? (
              <TrophyIcon className="w-4 h-4 text-yellow-900" />
            ) : (
              <span className={`text-sm font-bold ${badge.text}`}>{rank}</span>
            )}
          </div>
          <div>
            <h3 className="font-medium text-gray-900 truncate max-w-[150px]">
              {entry.agentName || `Agent ${entry.agentId.slice(0, 6)}`}
            </h3>
            <p className="text-xs text-gray-500">{entry.metrics.totalCalls} calls</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-semibold text-gray-900">{getMetricValue(entry, metric)}</p>
          <p className="text-xs text-gray-500">{getMetricLabel(metric)}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-100">
        <div className="text-center">
          <p className="text-sm font-medium text-gray-900">{entry.metrics.avgAnswerRate.toFixed(0)}%</p>
          <p className="text-xs text-gray-500">Answer</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-900">{entry.metrics.avgConversionRate.toFixed(1)}%</p>
          <p className="text-xs text-gray-500">Convert</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-900">{formatDuration(entry.metrics.totalTalkTime)}</p>
          <p className="text-xs text-gray-500">Talk Time</p>
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-start justify-center min-h-screen pt-4 px-4 pb-20">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-gray-900/50 transition-opacity" onClick={onClose} />

        {/* Modal */}
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full mt-8 mb-8">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gray-900 flex items-center justify-center">
                <span className="text-lg font-bold text-white">#{selectedEntry.rank}</span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedEntry.agentName || `Agent ${selectedEntry.agentId.slice(0, 8)}`}
                </h2>
                <p className="text-sm text-gray-500">Detailed performance metrics</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <MetricBox
                label="Total Calls"
                value={agentPerformance.totals.totalCalls.toString()}
                icon={<PhoneIcon className="w-4 h-4" />}
              />
              <MetricBox
                label="Answer Rate"
                value={`${agentPerformance.averages.answerRate}%`}
                icon={<CheckCircleIcon className="w-4 h-4" />}
                trend={agentPerformance.averages.answerRate >= 50 ? 'up' : 'down'}
              />
              <MetricBox
                label="Conversion Rate"
                value={`${agentPerformance.averages.conversionRate}%`}
                icon={<ChartBarIcon className="w-4 h-4" />}
                trend={agentPerformance.averages.conversionRate >= 15 ? 'up' : 'down'}
              />
              <MetricBox
                label="Total Talk Time"
                value={formatDuration(agentPerformance.totals.totalTalkTime)}
                icon={<ClockIcon className="w-4 h-4" />}
              />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Daily Trend */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-4">Daily Performance</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={agentPerformance.dailyTrend} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <defs>
                        <linearGradient id="callsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                      <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#9CA3AF', fontSize: 11 }}
                        tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { day: 'numeric' })}
                      />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="calls"
                        stroke="#3B82F6"
                        strokeWidth={2}
                        fill="url(#callsGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Conversion Breakdown */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-4">Conversion Funnel</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: 'Calls', value: agentPerformance.totals.totalCalls, fill: '#E5E7EB' },
                        { name: 'Answered', value: agentPerformance.totals.answeredCalls, fill: '#93C5FD' },
                        { name: 'Interested', value: agentPerformance.totals.interestedCount, fill: '#60A5FA' },
                        { name: 'Appointments', value: agentPerformance.totals.appointmentsBooked, fill: '#3B82F6' },
                      ]}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#6B7280', fontSize: 12 }}
                        width={80}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Recent Activity Table */}
            <div className="bg-gray-50 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="text-sm font-medium text-gray-900">Recent Activity</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Calls</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Answered</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Interested</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Conv %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {agentPerformance.dailyTrend.slice(-5).reverse().map((day) => (
                      <tr key={day.date} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900 font-medium">{day.calls}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600">{day.answered}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600">{day.interested}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                            day.conversionRate >= 20
                              ? 'bg-green-100 text-green-700'
                              : day.conversionRate >= 10
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {day.conversionRate}%
                          </span>
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
    </div>
  );
};

const MetricBox: React.FC<{
  label: string;
  value: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down';
}> = ({ label, value, icon, trend }) => (
  <div className="bg-gray-50 rounded-xl p-4">
    <div className="flex items-center justify-between mb-2">
      <span className="text-gray-400">{icon}</span>
      {trend && (
        <span className={trend === 'up' ? 'text-green-500' : 'text-red-500'}>
          {trend === 'up' ? (
            <ArrowTrendingUpIcon className="w-4 h-4" />
          ) : (
            <ArrowTrendingDownIcon className="w-4 h-4" />
          )}
        </span>
      )}
    </div>
    <p className="text-2xl font-semibold text-gray-900">{value}</p>
    <p className="text-xs text-gray-500 mt-1">{label}</p>
  </div>
);

const ChartTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ name: string; value: number; fill?: string }>;
  label?: string;
}> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg text-sm">
        <p className="font-medium mb-1">{label}</p>
        {payload.map((item, i) => (
          <p key={i} className="text-gray-300">
            {item.name}: <span className="text-white font-medium">{item.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};
