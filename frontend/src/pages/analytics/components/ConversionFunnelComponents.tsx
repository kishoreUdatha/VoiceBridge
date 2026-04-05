/**
 * Conversion Funnel Page Components
 */

import React from 'react';
import {
  FunnelIcon,
  ArrowTrendingDownIcon,
  ChartBarIcon,
  ArrowPathIcon,
  UserGroupIcon,
  CheckCircleIcon,
  CalendarDaysIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { FunnelData, FunnelStage, Insight, ViewMode } from '../conversion-funnel.types';
import {
  formatStageName,
  getStageConfig,
  FUNNEL_OPTIONS,
  DATE_RANGE_OPTIONS,
  VIEW_MODES,
} from '../conversion-funnel.constants';

// Loading Skeleton Component
export const LoadingSkeleton: React.FC = () => (
  <div className="min-h-screen bg-gray-50">
    <div className="max-w-6xl mx-auto px-3 py-3">
      <div className="animate-pulse space-y-2">
        <div className="flex justify-between items-center">
          <div className="h-6 bg-gray-200 rounded w-36"></div>
          <div className="h-6 bg-gray-200 rounded w-28"></div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-12 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
        <div className="h-40 bg-gray-200 rounded-lg"></div>
      </div>
    </div>
  </div>
);

// Header Component
interface HeaderProps {
  funnelName: string;
  dateRange: string;
  viewMode: ViewMode;
  loading: boolean;
  onFunnelChange: (value: string) => void;
  onDateRangeChange: (value: string) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onRefresh: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  funnelName,
  dateRange,
  viewMode,
  loading,
  onFunnelChange,
  onDateRangeChange,
  onViewModeChange,
  onRefresh,
}) => (
  <div className="mb-3">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-md bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
          <FunnelIcon className="h-3.5 w-3.5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-gray-900">Conversion Funnel</h1>
          <p className="text-gray-400 text-[10px]">Lead progression tracking</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <select
          value={funnelName}
          onChange={(e) => onFunnelChange(e.target.value)}
          className="px-2 py-1 bg-white rounded border border-gray-200 text-[11px] font-medium text-gray-700 focus:ring-1 focus:ring-violet-500"
        >
          {FUNNEL_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <select
          value={dateRange}
          onChange={(e) => onDateRangeChange(e.target.value)}
          className="px-2 py-1 bg-white rounded border border-gray-200 text-[11px] font-medium text-gray-700 focus:ring-1 focus:ring-violet-500"
        >
          {DATE_RANGE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <div className="flex bg-gray-100 rounded p-0.5">
          {VIEW_MODES.map((mode) => (
            <button
              key={mode}
              onClick={() => onViewModeChange(mode)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                viewMode === mode ? 'bg-white text-violet-600 shadow-sm' : 'text-gray-500'
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-1 text-gray-400 hover:text-violet-600 disabled:opacity-50"
        >
          <ArrowPathIcon className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  </div>
);

// Summary Cards Component
interface SummaryCardsProps {
  data: FunnelData | null;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ data }) => (
  <div className="grid grid-cols-4 gap-2 mb-3">
    <SummaryCard
      label="Total Leads"
      value={data?.totalLeads.toLocaleString() || '0'}
      icon={UserGroupIcon}
      color="text-blue-600"
      bgColor="bg-blue-50"
    />
    <SummaryCard
      label="Converted"
      value={data?.totalConverted.toLocaleString() || '0'}
      icon={CheckCircleIcon}
      color="text-emerald-600"
      bgColor="bg-emerald-50"
    />
    <SummaryCard
      label="Conv. Rate"
      value={`${data?.overallConversionRate || 0}%`}
      icon={ChartBarIcon}
      color="text-violet-600"
      bgColor="bg-violet-50"
    />
    <SummaryCard
      label="Avg. Time"
      value="4.2d"
      icon={CalendarDaysIcon}
      color="text-amber-600"
      bgColor="bg-amber-50"
    />
  </div>
);

interface SummaryCardProps {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  label,
  value,
  icon: Icon,
  color,
  bgColor,
}) => (
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

// Insights Component
interface InsightsProps {
  insights: Insight[];
}

export const Insights: React.FC<InsightsProps> = ({ insights }) => {
  if (insights.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mb-2">
      {insights.map((insight, index) => (
        <div
          key={index}
          className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] ${
            insight.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}
        >
          <LightBulbIcon className="w-3 h-3 flex-shrink-0" />
          <span className="font-medium">{insight.title}</span>
        </div>
      ))}
    </div>
  );
};

// Funnel Visual Component
interface FunnelVisualProps {
  stages: FunnelStage[];
}

export const FunnelVisual: React.FC<FunnelVisualProps> = ({ stages }) => {
  if (!stages || stages.length === 0) {
    return (
      <div className="text-center py-6">
        <FunnelIcon className="h-5 w-5 text-gray-400 mx-auto mb-1" />
        <p className="text-xs text-gray-500">No funnel data available</p>
      </div>
    );
  }

  const maxCount = stages[0].count || 1;

  return (
    <div className="space-y-1">
      {stages.map((stage, index) => {
        const widthPercent = (stage.count / maxCount) * 100;
        const stageConfig = getStageConfig(stage.name);
        const nextStage = stages[index + 1];

        return (
          <div key={stage.name} className="flex items-center gap-2 text-[11px]">
            {/* Stage Label */}
            <div className="w-20 flex-shrink-0 flex items-center gap-1.5">
              <span className={`w-4 h-4 rounded text-[10px] font-bold flex items-center justify-center text-white bg-gradient-to-br ${stageConfig.gradient}`}>
                {index + 1}
              </span>
              <span className="font-medium text-gray-700 truncate">{formatStageName(stage.name)}</span>
            </div>

            {/* Bar */}
            <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${stageConfig.gradient} flex items-center px-2 rounded`}
                style={{ width: `${Math.max(widthPercent, 8)}%` }}
              >
                <span className="text-white font-semibold text-[10px]">{stage.count.toLocaleString()}</span>
              </div>
            </div>

            {/* Rate */}
            <span className={`w-10 text-right font-semibold ${
              stage.conversionRate >= 60 ? 'text-emerald-600' : stage.conversionRate >= 30 ? 'text-amber-600' : 'text-red-600'
            }`}>{stage.conversionRate}%</span>

            {/* Dropoff */}
            {nextStage && stage.dropoffRate > 0 ? (
              <span className="w-14 text-right text-red-500 flex items-center justify-end gap-0.5">
                <ArrowTrendingDownIcon className="w-3 h-3" />
                {stage.dropoffRate}%
              </span>
            ) : (
              <span className="w-14"></span>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Funnel Table Component
interface FunnelTableProps {
  stages: FunnelStage[];
}

export const FunnelTable: React.FC<FunnelTableProps> = ({ stages }) => (
  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-2">
    <table className="min-w-full text-[11px]">
      <thead>
        <tr className="bg-gray-50 border-b border-gray-100">
          <th className="px-2 py-1.5 text-left font-semibold text-gray-500">Stage</th>
          <th className="px-2 py-1.5 text-right font-semibold text-gray-500">Leads</th>
          <th className="px-2 py-1.5 text-right font-semibold text-gray-500">% Total</th>
          <th className="px-2 py-1.5 text-right font-semibold text-gray-500">Conv.</th>
          <th className="px-2 py-1.5 text-right font-semibold text-gray-500">Drop</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {stages?.map((stage, index) => {
          const stageConfig = getStageConfig(stage.name);
          const percentOfTotal = stages[0].count > 0 ? ((stage.count / stages[0].count) * 100).toFixed(0) : '0';

          return (
            <tr key={stage.name} className="hover:bg-gray-50/50">
              <td className="px-2 py-1.5">
                <div className="flex items-center gap-1.5">
                  <span className={`w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center text-white bg-gradient-to-br ${stageConfig.gradient}`}>
                    {index + 1}
                  </span>
                  <span className="font-medium text-gray-900">{formatStageName(stage.name)}</span>
                </div>
              </td>
              <td className="px-2 py-1.5 text-right font-semibold text-gray-900">{stage.count.toLocaleString()}</td>
              <td className="px-2 py-1.5 text-right text-gray-600">{percentOfTotal}%</td>
              <td className="px-2 py-1.5 text-right">
                <span className={`font-semibold ${
                  stage.conversionRate >= 60 ? 'text-emerald-600' : stage.conversionRate >= 30 ? 'text-amber-600' : 'text-red-600'
                }`}>{stage.conversionRate}%</span>
              </td>
              <td className="px-2 py-1.5 text-right">
                {stage.dropoffRate > 0 ? (
                  <span className="text-red-500">{stage.dropoffRate}%</span>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

// Stage Comparison Chart Component
interface StageComparisonChartProps {
  stages: FunnelStage[];
}

export const StageComparisonChart: React.FC<StageComparisonChartProps> = ({ stages }) => (
  <div className="bg-white rounded-lg border border-gray-200 p-2">
    <div className="flex items-center justify-between mb-1">
      <span className="text-[11px] font-semibold text-gray-700">Stage Comparison</span>
    </div>
    <div className="h-28">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={stages || []} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#6B7280', fontSize: 9 }}
            tickFormatter={(value) => formatStageName(value).slice(0, 6)}
          />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 9 }} width={30} />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-white border border-gray-200 rounded px-1.5 py-1 text-[10px]">
                    <p className="font-semibold text-gray-900">{formatStageName(data.name)}: {data.count}</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="count" radius={[2, 2, 0, 0]} barSize={24}>
            {stages?.map((stage, index) => (
              <Cell key={index} fill={getStageConfig(stage.name).color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);
