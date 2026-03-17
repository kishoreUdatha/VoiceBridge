/**
 * Lead Sources Components
 * UI components for lead sources analytics page
 */

import React from 'react';
import {
  UserGroupIcon,
  MegaphoneIcon,
  SparklesIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  ArrowUpIcon,
  ChartBarIcon,
  GlobeAltIcon,
  PhoneArrowDownLeftIcon,
  PhoneArrowUpRightIcon,
} from '@heroicons/react/24/outline';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  LeadSourceData,
  PieChartDataItem,
  CombinedTrendDataPoint,
  LeadSourceStats,
  CategoryFilter,
} from '../lead-sources.types';
import {
  CATEGORY_FILTER_OPTIONS,
  DATE_RANGE_OPTIONS,
  PLATFORM_COLORS,
  PLATFORM_ICONS,
  SOCIAL_MEDIA_SOURCES,
  AI_VOICE_SOURCES,
  formatSourceName,
} from '../lead-sources.constants';

// Loading Skeleton
export const LoadingSkeleton: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-slate-100">
    <div className="max-w-[1600px] mx-auto px-6 lg:px-8 py-8">
      <div className="animate-pulse space-y-8">
        <div className="flex justify-between items-center">
          <div className="h-10 bg-gray-200 rounded-xl w-64"></div>
          <div className="h-10 bg-gray-200 rounded-xl w-48"></div>
        </div>
        <div className="grid grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-gray-200 rounded-2xl"></div>
          ))}
        </div>
        <div className="h-96 bg-gray-200 rounded-2xl"></div>
      </div>
    </div>
  </div>
);

// Page Header
interface HeaderProps {
  selectedCategory: CategoryFilter;
  dateRange: string;
  loading: boolean;
  onCategoryChange: (category: CategoryFilter) => void;
  onDateRangeChange: (range: string) => void;
  onRefresh: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  selectedCategory,
  dateRange,
  loading,
  onCategoryChange,
  onDateRangeChange,
  onRefresh,
}) => (
  <div className="mb-8">
    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
      <div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-xl shadow-indigo-500/30">
              <UserGroupIcon className="h-7 w-7 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Lead Sources Analytics</h1>
            <p className="text-gray-500 text-sm mt-0.5">Compare Social Media vs AI Voice Agent lead generation</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {/* Category Filter */}
        <div className="flex items-center bg-white rounded-xl border border-gray-200 shadow-sm p-1">
          {CATEGORY_FILTER_OPTIONS.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id as CategoryFilter)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Date Range */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl border border-gray-200 shadow-sm">
          <CalendarDaysIcon className="w-5 h-5 text-gray-400" />
          <select
            value={dateRange}
            onChange={(e) => onDateRangeChange(e.target.value)}
            className="bg-transparent border-0 text-sm font-medium text-gray-700 focus:ring-0 cursor-pointer pr-8"
          >
            {DATE_RANGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Refresh */}
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 shadow-sm transition-all disabled:opacity-50"
        >
          <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  </div>
);

// Social Media Card
interface SocialMediaCardProps {
  data: LeadSourceData['socialMedia'];
  isSelected: boolean;
  onClick: () => void;
}

export const SocialMediaCard: React.FC<SocialMediaCardProps> = ({ data, isSelected, onClick }) => (
  <div
    className={`bg-white rounded-2xl shadow-sm border-2 transition-all cursor-pointer ${
      isSelected ? 'border-pink-500 ring-2 ring-pink-500/20' : 'border-gray-200 hover:border-pink-300'
    }`}
    onClick={onClick}
  >
    <div className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-500/25">
            <MegaphoneIcon className="w-7 h-7 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Social Media Leads</h3>
            <p className="text-sm text-gray-500">Facebook, Instagram, LinkedIn, Google</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-4xl font-bold text-gray-900">{data.total.toLocaleString()}</p>
            <p className="text-sm text-gray-500 mt-1">Total Leads</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-emerald-600">
              <ArrowUpIcon className="w-4 h-4" />
              <span className="font-semibold">12.5%</span>
            </div>
            <p className="text-xs text-gray-400">vs last period</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100">
          <div className="bg-emerald-50 rounded-xl p-3">
            <p className="text-lg font-bold text-emerald-600">{data.converted}</p>
            <p className="text-xs text-gray-500">Converted</p>
          </div>
          <div className="bg-pink-50 rounded-xl p-3">
            <p className="text-lg font-bold text-pink-600">
              {data.total ? ((data.converted / data.total) * 100).toFixed(1) : 0}%
            </p>
            <p className="text-xs text-gray-500">Conv. Rate</p>
          </div>
        </div>

        {/* Platform breakdown */}
        <div className="pt-4 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase mb-3">By Platform</p>
          <div className="space-y-2">
            {Object.entries(data.byPlatform).map(([platform, count]) => {
              const total = data.total || 1;
              const percentage = (count / total) * 100;
              return (
                <div key={platform} className="flex items-center gap-3">
                  <div className="w-24 text-xs font-medium text-gray-700">{formatSourceName(platform)}</div>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${percentage}%`, backgroundColor: PLATFORM_COLORS[platform] }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 w-12 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  </div>
);

// AI Voice Card
interface AIVoiceCardProps {
  data: LeadSourceData['aiVoiceAgent'];
  isSelected: boolean;
  onClick: () => void;
}

export const AIVoiceCard: React.FC<AIVoiceCardProps> = ({ data, isSelected, onClick }) => (
  <div
    className={`bg-white rounded-2xl shadow-sm border-2 transition-all cursor-pointer ${
      isSelected ? 'border-violet-500 ring-2 ring-violet-500/20' : 'border-gray-200 hover:border-violet-300'
    }`}
    onClick={onClick}
  >
    <div className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
            <SparklesIcon className="w-7 h-7 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">AI Voice Agent Leads</h3>
            <p className="text-sm text-gray-500">Inbound & Outbound AI Calls</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-4xl font-bold text-gray-900">{data.total.toLocaleString()}</p>
            <p className="text-sm text-gray-500 mt-1">Total Leads</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-emerald-600">
              <ArrowUpIcon className="w-4 h-4" />
              <span className="font-semibold">24.8%</span>
            </div>
            <p className="text-xs text-gray-400">vs last period</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100">
          <div className="bg-emerald-50 rounded-xl p-3">
            <p className="text-lg font-bold text-emerald-600">{data.converted}</p>
            <p className="text-xs text-gray-500">Converted</p>
          </div>
          <div className="bg-violet-50 rounded-xl p-3">
            <p className="text-lg font-bold text-violet-600">
              {data.total ? ((data.converted / data.total) * 100).toFixed(1) : 0}%
            </p>
            <p className="text-xs text-gray-500">Conv. Rate</p>
          </div>
        </div>

        {/* Call type breakdown */}
        <div className="pt-4 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase mb-3">By Call Type</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3 p-3 bg-cyan-50 rounded-xl">
              <PhoneArrowDownLeftIcon className="w-5 h-5 text-cyan-600" />
              <div>
                <p className="text-lg font-bold text-cyan-700">{data.inbound}</p>
                <p className="text-xs text-gray-500">Inbound</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl">
              <PhoneArrowUpRightIcon className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="text-lg font-bold text-emerald-700">{data.outbound}</p>
                <p className="text-xs text-gray-500">Outbound</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Distribution Card (Pie Chart)
interface DistributionCardProps {
  pieChartData: PieChartDataItem[];
}

export const DistributionCard: React.FC<DistributionCardProps> = ({ pieChartData }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
    <div className="flex items-center gap-3 mb-6">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
        <ChartBarIcon className="w-6 h-6 text-white" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Source Distribution</h3>
        <p className="text-sm text-gray-500">Lead source breakdown</p>
      </div>
    </div>

    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={pieChartData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={75}
            paddingAngle={4}
            dataKey="value"
            stroke="#fff"
            strokeWidth={3}
          >
            {pieChartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.color }}></div>
                      <span className="text-sm font-semibold text-gray-900">{data.name}</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900 mt-1">{data.value.toLocaleString()} leads</p>
                  </div>
                );
              }
              return null;
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>

    {/* Legend */}
    <div className="space-y-2 mt-4">
      {pieChartData.map((item, index) => (
        <div key={index} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
            <span className="text-sm text-gray-600">{item.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900">{item.value.toLocaleString()}</span>
            <span className="text-xs text-gray-400">
              ({((item.value / (pieChartData.reduce((a, b) => a + b.value, 0) || 1)) * 100).toFixed(0)}%)
            </span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Trend Chart
interface TrendChartProps {
  data: CombinedTrendDataPoint[];
}

export const TrendChart: React.FC<TrendChartProps> = ({ data }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
    <div className="flex items-center justify-between mb-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Lead Generation Trend</h3>
        <p className="text-sm text-gray-500 mt-0.5">Social Media vs AI Voice Agent over time</p>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-pink-500"></div>
          <span className="text-sm text-gray-600 font-medium">Social Media</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-violet-500"></div>
          <span className="text-sm text-gray-600 font-medium">AI Voice Agent</span>
        </div>
      </div>
    </div>
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorSocial" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EC4899" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#EC4899" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorAI" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#6B7280', fontSize: 11 }}
            tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="socialMedia" stroke="#EC4899" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSocial)" name="Social Media" />
          <Area type="monotone" dataKey="aiVoice" stroke="#8B5CF6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorAI)" name="AI Voice Agent" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </div>
);

// Custom Tooltip
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ color: string; name: string; value: number }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-4 min-w-[180px]">
        <p className="text-sm font-medium text-gray-900 mb-3">
          {new Date(label || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-4 mb-1">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }}></div>
              <span className="text-sm text-gray-600">{entry.name}</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">{entry.value} leads</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// Comparison Table
interface ComparisonTableProps {
  comparison: LeadSourceStats[];
}

export const ComparisonTable: React.FC<ComparisonTableProps> = ({ comparison }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
    <div className="px-6 py-5 border-b border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900">Source Performance Comparison</h3>
      <p className="text-sm text-gray-500 mt-1">Detailed metrics by lead source</p>
    </div>
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="bg-gray-50/80">
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Source</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Category</th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Total Leads</th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Converted</th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Conv. Rate</th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Avg Response</th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Revenue</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {comparison.map((source, index) => {
            const isSocialMedia = SOCIAL_MEDIA_SOURCES.includes(source.source);
            const isAIVoice = AI_VOICE_SOURCES.includes(source.source);
            const Icon = PLATFORM_ICONS[source.source] || GlobeAltIcon;

            return (
              <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${PLATFORM_COLORS[source.source] || '#6B7280'}15` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: PLATFORM_COLORS[source.source] || '#6B7280' }} />
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{formatSourceName(source.source)}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                    isSocialMedia ? 'bg-pink-100 text-pink-700' :
                    isAIVoice ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {isSocialMedia ? 'Social Media' : isAIVoice ? 'AI Voice' : 'Other'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <span className="text-sm font-bold text-gray-900">{source.count.toLocaleString()}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <span className="text-sm font-medium text-emerald-600">{source.converted.toLocaleString()}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                    source.conversionRate >= 20 ? 'bg-emerald-100 text-emerald-700' :
                    source.conversionRate >= 10 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {source.conversionRate.toFixed(1)}%
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <span className="text-sm text-gray-600">{source.avgResponseTime}m</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <span className="text-sm font-semibold text-gray-900">${source.revenue.toLocaleString()}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);
