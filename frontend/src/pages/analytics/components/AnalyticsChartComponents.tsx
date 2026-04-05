/**
 * Analytics Dashboard Chart Components
 * KPI cards, gauges, tooltips, and reusable chart elements
 */

import React from 'react';
import {
  ArrowUpIcon,
  ArrowDownIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

// KPI Card Component
interface KPICardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  trend: { value: number; isPositive: boolean };
  gradient: string;
  shadowColor: string;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  gradient,
  shadowColor,
}) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all duration-200 group">
    <div className="flex items-center justify-between">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
        <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
        <div className="flex items-center gap-2 mt-1.5">
          {trend.value > 0 && (
            <div
              className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium ${
                trend.isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
              }`}
            >
              {trend.isPositive ? <ArrowUpIcon className="w-2.5 h-2.5" /> : <ArrowDownIcon className="w-2.5 h-2.5" />}
              {trend.value}%
            </div>
          )}
          <span className="text-xs text-gray-400 truncate">{subtitle}</span>
        </div>
      </div>
      <div
        className={`w-10 h-10 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center shadow ${shadowColor} flex-shrink-0`}
      >
        <div className="text-white">{icon}</div>
      </div>
    </div>
  </div>
);

// Health Score Gauge
interface HealthScoreGaugeProps {
  score: number;
}

export const HealthScoreGauge: React.FC<HealthScoreGaugeProps> = ({ score }) => {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : '#EF4444';

  return (
    <div className="relative w-24 h-24">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#E5E7EB" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold" style={{ color }}>
          {score}
        </span>
        <span className="text-[10px] text-gray-500">Score</span>
      </div>
    </div>
  );
};

// Health Stat Card
interface HealthStatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  percentage?: number;
}

export const HealthStatCard: React.FC<HealthStatCardProps> = ({
  label,
  value,
  icon,
  color,
  percentage,
}) => {
  const colorStyles: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    slate: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', icon: 'text-slate-500' },
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: 'text-emerald-500' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: 'text-amber-500' },
    red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: 'text-red-500' },
  };
  const styles = colorStyles[color];

  return (
    <div className={`rounded-lg border ${styles.bg} ${styles.border} p-3 transition-all hover:shadow-sm`}>
      <div className={`${styles.icon} mb-1`}>{icon}</div>
      <p className={`text-lg font-bold ${styles.text}`}>{value.toLocaleString()}</p>
      <p className="text-xs text-gray-500">{label}</p>
      {percentage !== undefined && <p className="text-[10px] text-gray-400 mt-1">{percentage}% of total</p>}
    </div>
  );
};

// Custom Tooltip for Charts
export const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-4 min-w-[150px]">
        <p className="text-sm font-medium text-gray-900 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }}></div>
              <span className="text-sm text-gray-600">{entry.name}</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">{entry.value?.toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// Custom Pie Tooltip
export const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.color }}></div>
          <span className="text-sm font-semibold text-gray-900">{data.name}</span>
        </div>
        <p className="text-lg font-bold text-gray-900">{data.value.toLocaleString()}</p>
      </div>
    );
  }
  return null;
};

// Empty State Component
interface EmptyStateProps {
  message: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ message }) => (
  <div className="h-full flex items-center justify-center">
    <div className="text-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
        <ChartBarIcon className="w-8 h-8 text-gray-400" />
      </div>
      <p className="text-gray-500 font-medium">{message}</p>
    </div>
  </div>
);

// Skeleton Loader
export const DashboardSkeleton: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-slate-100">
    <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-6">
      <div className="animate-pulse space-y-5">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-gray-200 rounded-lg w-48"></div>
          <div className="h-8 bg-gray-200 rounded-lg w-36"></div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
          ))}
        </div>
        <div className="h-56 bg-gray-200 rounded-xl"></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-48 bg-gray-200 rounded-xl"></div>
          <div className="h-48 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    </div>
  </div>
);
